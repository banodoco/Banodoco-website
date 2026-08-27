# Deploying glowshroom

There is no compilation step. Deployment packages the explicit public
allowlist in **[deploy/public-files.json](deploy/public-files.json)**; the
authoritative boundary and local inspection workflow are documented in
**[PUBLIC-DEPLOY.md](PUBLIC-DEPLOY.md)**. For regenerating derived artifacts (geometry
bake, favicons, captures) BEFORE shipping, see **[BUILDING.md](BUILDING.md)** —
`tools/build.sh` (fast, no captures) or `tools/build.sh --with-captures` (full).

## Release command

Run `tools/check.sh` for the read-only release gates, including public artifact
allowlist and byte-roundtrip verification. Deployment is never a
side effect of checking. The authorized end-to-end release flow is the
separate `tools/release.sh` command, run from local `main`:

```
tools/release.sh --stage PATH [--stage PATH ...]
```

Every changed or untracked path intended for the release must be named with
`--stage`; the command aborts if anything remains outside that reviewed set.
It fetches and requires `origin/main` to be an ancestor (the one-time legacy
history merge is already in main), then commits, pushes `main`, and polls
production. Divergence aborts rather than discarding the remote tree. Each
destructive boundary is confirmed.
Before committing, it runs `npm run check` (lint, cycles, unit, contract, and
static-content tests — no browser) and `tools/check.sh` (scene drift plus
deploy artifact) against the reviewed tree, and aborts if either the staged
diff or `HEAD` changes meanwhile. Neither step launches a browser scenario
run: those live behind `npm run test:browser` / `check:browser` and are never
invoked by the release flow. `--yes` authorizes them non-interactively;
`--no-verify` skips only the final URL poll and does not make the command a
dry run. Use `tools/release.sh --help` for the complete interface.

## Public boundary

Do not maintain a second file list here. `deploy/public-files.json` is the
executable source of truth for included trees/files, required runtime URLs,
and forbidden repository-only paths. `tools/package-public.py` fails closed
when that boundary is incomplete or leaks an excluded path.

## Host configuration

- **MIME**: `.js` must serve as `text/javascript` (object-store hosts often
  need this set explicitly). No other special types (all GLSL is inline).
- **Caching**: there is no content hashing — do NOT use long immutable TTLs
  or a CDN will serve mixed-version module graphs after an update (hard
  `does not provide an export` failures). Use `Cache-Control: max-age=300,
  must-revalidate` (or `no-store` if traffic is small). Do not add more
  hand-maintained `?v=` tokens.
- **Compression**: enable gzip/brotli — the 3.3 MB raw payload compresses to
  ~1 MB, and `vendor/three/three.module.js` (1.3 MB) is the bulk of it.
- **CSP**: if any CSP is applied, the inline `<script type="importmap">` in
  index.html needs a nonce or sha-256 hash or the whole site dies.

## Artifact-only origin substitution

`sitemap.xml` and the three page heads (`index.html`, `static/index.html`,
`ownership/index.html` — their `og:url`/`og:image`/canonical, which must be
absolute, plus the homepage's JSON-LD block) and `404.html` (its home link
and icon — self-contained otherwise, since hosts serve it at arbitrary
depths) use the placeholder `ORIGIN`; robots.txt's `Sitemap:` line
uses a relative path. `tools/package-public.py --origin ...` replaces every
`ORIGIN` occurrence only in the temporary public artifact, covering these
files and `404.html`, and fails if any placeholder remains. The source checkout
is never rewritten. Railway supplies `https://www.banodoco.ai`; local artifact
inspection must pass an explicit origin. `robots.txt`'s `Sitemap:` line is
deliberately relative (`./sitemap.xml`) precisely so it needs no edit if the
deployment origin ever changes — nothing in `robots.txt` requires updating.

## Railway operations (practical)

Railway auto-deploys `main` on push (GitHub integration → Railpack → the
packaging startCommand below). `tools/release.sh` (above) is the authorized
way to reach that push — it stages only reviewed paths, runs `npm run check`
and `tools/check.sh` against the exact staged tree, commits, pushes, and
polls `release-revision.txt` for you. The commands below are for **watching**
that deploy (or a push made by other means) land, not an alternate release
procedure:

```bash
railway status --json        # wait for status: SUCCESS
curl -s https://www.banodoco.ai/release-revision.txt   # == pushed commit SHA
```

**Manual bypass (not the authorized flow).** `git add -A` / commit / push
directly to `main` also triggers the same Railway auto-deploy, but it skips
everything `tools/release.sh` exists to enforce: no reviewed `--stage` set (so
an accidental untracked file ships), no `npm run check`, no `tools/check.sh`,
and no `origin/main`-is-an-ancestor divergence guard. `PREFLIGHT_DONE=1` on a
manual commit only skips the pre-commit hook's own scene regression gate
(the `organism/`/`journey/` capture + bake check in `tools/pre-commit`) — it
does not run any of `tools/release.sh`'s checks in its place, unlike when
`tools/release.sh` sets it (there, the checks already ran against this exact
tree seconds earlier). Reserve this path for doc-only or otherwise
non-scene-touching commits where re-running the full gate is genuinely not
warranted; use `tools/release.sh` for anything else, and especially for
anything touching `organism/`, `journey/`, or the deploy allowlist:

```bash
PREFLIGHT_DONE=1 git add -A
PREFLIGHT_DONE=1 git commit -m "deploy"
git push origin main
```

When scene/content changed, rebuild derived artifacts first (see
BUILDING.md): `python3 tools/rebuild.py --with-captures`, then
`python3 tools/build-meta.py` (captures feed the og cards — build-meta
must run AFTER captures, or the pre-commit hook flags `og-home.jpg
DRIFTED`; re-add and re-commit). `tools/release.sh` does this build step for
you (`tools/build.sh` / `tools/build.sh --with-captures`); the manual path
does not, so run it yourself first.

### railway.toml contract (do not regress)

- **No custom `[build] buildCommand`.** A custom buildCommand makes
  Railpack skip provider detection (`providers: None` in the deploy
  metadata) — the build image then has no python3 and the deploy fails at
  build with zero instances. The current file uses the proven shape: no
  buildCommand, and `[deploy] startCommand` does the packaging where
  python IS provisioned:
  `python3 tools/package-public.py /tmp/public --origin https://www.banodoco.ai
  --revision ${RAILWAY_GIT_COMMIT_SHA:-unknown} && cd /tmp/public && exec
  python3 serve.py`
- The runtime image carries the full repo checkout, so packaging at start
  is cheap (~1 s) and produces the same allowlisted artifact the local
  flow verifies.
- `requirements.txt` must stay at the repo root (it is what makes Railpack
  detect the python provider).

### Push gotchas

- **"Everything up-to-date" but the remote is old** → you are on a feature
  branch, not main. `git checkout main && git merge --ff-only <branch> &&
  git push origin main`.
- **The 1.1 GB history push is slow** (legacy React history is in main).
  Let it finish; do not Ctrl-C. A later push of one commit is fast.
- If `git push` dies silently mid-upload, `git push origin main` again —
  objects are incremental and the retry is quick.

### Browser cache

The site serves `Cache-Control: no-store, must-revalidate` via serve.py.
Do NOT switch back to Caddy's default static serving for this repo: with
no cache-control header, mobile Safari heuristically caches the module
graph and shows a stale version after deploys. If a phone ever shows an
old build, hard-refresh once.

## Field monitoring

Load the site with `?debug=1` to render collected page errors on screen
(`window.__pageErrors` counts them; the overlay lists deduped messages).

## Known shipping placeholders (accepted for launch, tracked)

- ~~All outbound links are `href="#"` and 56 `[PLACEHOLDER]` tokens render~~ —
  **resolved 2026-08-16.** Every destination is now one banodoco.ai itself
  uses, and no placeholder token ships. One node deliberately has no link and
  says "Coming soon": `tworp`.
- ~~The Owned portrait field ships procedural~~ — **resolved 2026-08-16.** It
  ships real contributor photographs from Banodoco's own published sprite,
  sixteen dealt at random out of 120 per load. `?photos=0` forces the old
  procedural look if a venue machine struggles with the atlas bake.
- `hivemind` is wired to github.com/banodoco/hivemind. It is absent from
  banodoco.ai entirely, which is why it briefly shipped as "Coming soon" —
  the project lives in its own repository. Only `tworp` is still unbuilt.
