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
Before committing, it runs `npm run check` (lint, cycles, unit and browser
contracts) and `tools/check.sh` (scene drift plus deploy artifact) against the
reviewed tree, and aborts if either the staged diff or `HEAD` changes meanwhile.
`--yes` authorizes them non-interactively; `--no-verify` skips only the final
URL poll and does not make the command a dry run. Use `tools/release.sh --help`
for the complete interface.

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
inspection must pass an explicit origin. Set the final absolute `Sitemap:` URL
in `robots.txt` if the deployment origin changes.

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
