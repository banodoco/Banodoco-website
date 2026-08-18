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
| **Verify only** | `python3 tools/rebuild.py --check` (add `--with-captures` to check the stills too) | every gate, writes nothing | varies |

## The deploy pre-flight — one command, end to end

`tools/preflight.sh` is the single entry point from "working changes" to
"pushed and deploying on Railway". It runs, in order: preconditions (server
on :8137, git identity), the full build (`rebuild.py --with-captures`), the
gates (`rebuild.py --check --with-captures`), the commit (the pre-commit
hook runs behind it), the history merge (upstream main preserved as a second
parent — see below), the push, and the deploy verification against
www.banodoco.ai. Exit 0 only when the new tree is serving.

```
python3 tools/preflight.sh          # interactive (confirms commit + push)
python3 tools/preflight.sh --yes    # auto-confirm
python3 tools/preflight.sh --no-verify   # skip the URL check (dry run)
```

**History policy.** The site ships on `banodoco/Banodoco-website@main`, which
carried the previous (React) site. Deploys do NOT force-push or discard that
history: preflight merges upstream main with `-s ours` (glowshroom tree
wins, old commits stay reachable as the second parent). Both histories are
preserved on main.

**Known flake.** `final@430x932` re-shoots with ~24 MAE drift (chrome bakes
into the mobile final golden). Preflight and the pre-commit hook treat a
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

## Known issue — one golden is nondeterministic

`mission@430x932.png` re-shoots with a reproducible ~2.4 MAE drift (whole
frame, ~6 % of pixels), while the other nine stills are pixel-identical
(MAE 0.00) under the `?capture=` freeze. Suspected: the perf-governor
pixelRatio ratchet landing differently on a slow mobile frame. It predates
any card work and is unrelated to DOM/assets. Do not chase it as part of a
normal build; if it blocks a commit, re-shoot that pose
(`python3 tools/capture.py --pose mission --size mobile`) and check whether
it lands within band before touching scene code.

## Related

- `DEPLOY.md` — shipping: the tree deploys as-is to a static host; the
  history push to GitHub (blocked on a PAT — REQUESTS.md "The push").
- `tools/README.md` — the QA loop (captures, gates, budget).
- `tools/BAKING.md` — the geometry bake contract, in full.
