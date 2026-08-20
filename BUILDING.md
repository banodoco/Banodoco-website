# Building the journey

**There is no compiler.** The journey is a vanilla ES-modules tree (no
`package.json`, no bundler, no build step in the traditional sense — DEPLOY.md:
"the tree deploys as-is"). "Building" it means **regenerating the committed
derived artifacts** from the live scene and sources. This page is the one
place that explains it, so nobody has to re-derive it from five docs.

## The two build modes

| Mode | Command | What runs | Time |
|---|---|---|---|
| **Fast (default)** | `python3 tools/rebuild.py` | geometry bake + favicons/og + logo masks | ~30 s |
| **Full** | `python3 tools/rebuild.py --with-captures` | fast + re-shoot the Tier-3 stills | ~2 min |
| **Verify only** | `tools/check.sh` (`--skip-captures` for bake/meta only) | public artifact + scene drift gates, writes no repository files | varies |

## Checks, builds, and releases are separate

Verification is deliberately the default and is safe to run repeatedly:

```
tools/check.sh                  # full read-only drift verification
tools/preflight.sh              # compatibility alias for tools/check.sh
tools/check.sh --skip-captures  # read-only bake/meta verification
```

Neither check command stages, commits, merges, pushes, deploys, or regenerates
committed artifacts. The check first packages the deploy allowlist into a
private temporary directory outside the repository and verifies its exact file
set and bytes; the directory is removed automatically. See
**[PUBLIC-DEPLOY.md](PUBLIC-DEPLOY.md)**. To regenerate artifacts explicitly, use
`tools/build.sh` or `tools/build.sh --with-captures`.

Releasing is a separate, intentionally side-effecting command. It requires an
explicit reviewed staging set; repeat `--stage` for every changed or untracked
path intended for the commit. Any remaining unstaged or untracked file aborts
the release before commit:

```
tools/release.sh --stage journey/foo.js --stage static/geom/manifest.json
```

The release command fetches first and aborts rather than discard a divergent
remote tree. It confirms the overall release, staging, commit, any pre-existing
local commits, and push. `--yes` is the explicit non-interactive
authorization. `--no-verify` skips only the post-push URL poll; it is not a
dry run. `--skip-captures` preserves the former loaded-machine escape hatch.
After staging, it runs `npm run check` once for lint, cycle, unit, and browser
contracts, then `tools/check.sh` once for scene drift and the same
manifest-defined artifact Railway builds after the push. Production
verification polls `release-revision.txt` for the exact
pushed commit, so an unchanged homepage cannot make an old deployment pass.

**History policy.** The site ships on `banodoco/Banodoco-website@main`, which
carried the previous (React) site. Deploys do NOT force-push or discard that
history: the one-time `-s ours` legacy merge is already part of main
(`673ef65`), so the release command requires that fetched `origin/main` is an
ancestor of local main. Both histories remain preserved; future divergence
fails closed instead of silently discarding remote changes.

**Known flake.** `final@430x932` re-shoots with ~24 MAE drift (chrome bakes
into the mobile final golden). The check command and pre-commit hook treat a
SOLE final@430x932 FAIL-band with everything else at 0.00 MAE as the known
flake — reported loudly, not a blocker. Any other drift fails the run.

Precondition for the fast mode's bake step and for captures: the static
server must be up — `python3 serve.py` on :8137 (START-WEBSITE.command does
this). The runner refuses with the exact command if it is not.

What each step derives:

| Tool | Produces | From |
|---|---|---|
| `tools/bake-geom.py` | `static/geom/*.bin` + `manifest.json` | the live scene's deterministic geometry builders, harvested via `?bakedump=1` (BAKING.md) |
| `tools/build-meta.py` | `favicon.ico`, `assets/brand/og-*.jpg`, icons | the mark master + the Tier-3 mission capture |
| `tools/build-mark.py` | `assets/brand/mark-b-mask-*.png` | `assets/brand/mark-b-source.png` |
| `tools/capture.py` | `static/captures/*.png` (10 stills) | the frozen live scene (`?capture=<pose>`) |

`tools/pre-commit` enforces the gates at commit time: any commit touching
`journey/` or `organism/` runs the bake byte-check and the capture MAE check.

## Run the site from LIVE code (skip the baked bundle)

`static/geom/*.bin` is the one thing the site loads as pre-baked bytes.
Add the flag and the site runs the real builders instead:

```
http://localhost:8137/?livebuild=1
```

`?livebuild=1` makes `journey/lib/baked.js` skip the `.bin` fetch entirely —
use it for edit-reload sessions; bake only when landing (BAKING.md §2).
Everything else on the site is always live — there is no other bundling.

## Known issue — mission mobile can also drift

Separately from the release gate's `final@430x932` known-flake exception,
`mission@430x932.png` has re-shot with a reproducible ~2.4 MAE drift (whole
frame, ~6 % of pixels), while the other nine stills are pixel-identical
(MAE 0.00) under the `?capture=` freeze. Suspected: the perf-governor
pixelRatio ratchet landing differently on a slow mobile frame. It predates
any card work and is unrelated to DOM/assets. Do not chase it as part of a
normal build; if it blocks a commit, re-shoot that pose
(`python3 tools/capture.py --pose mission --size mobile`) and check whether
it lands within band before touching scene code. It is not covered by the
release gate's sole-final exception.

## Related

- `DEPLOY.md` — shipping: the tree deploys as-is to a static host; the
  history push to GitHub (blocked on a PAT — REQUESTS.md "The push").
- `tools/README.md` — the QA loop (captures, gates, budget).
- `tools/BAKING.md` — the geometry bake contract, in full.
