# ADR AR-4 / D5 — Tier-3 captures are generated from the live scene by a script, not hand-authored

- **Status:** approved (Tech Lead, 2026-08-02).
- **Conflict resolved:** v6 lists "Tier 3 drift: static fallback captures must be part of CI from the prototype stage rather than created manually at launch" as a named risk. The donor build's accepted deviation #1 hand-authored the stills in CSS to avoid introducing a build step. This ADR keeps the no-build runtime **and** kills the drift.
- **Decision:** captures are produced by a headless-Chrome screenshot script run against the live page. A capture *script* is not a *build step* — the bytes served to visitors are still the authored bytes (see `adr-d4-stack.md` §Boundaries).

## Pipeline

**Tool.** `journey-v6-plan/tools/capture.py` (python3 stdlib + Pillow 11.3, both already on this machine; there is no Node toolchain here and none is being added). It shells out to the installed Chrome:

```
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome \
  --headless=new --disable-gpu-sandbox --use-angle=metal \
  --window-size=<W>,<H> --force-device-scale-factor=2 \
  --virtual-time-budget=<ms> \
  --screenshot=<out.png> \
  "http://localhost:8137/journey-v6/index.html?nointro=1&capture=<pose>"
```

**Determinism.** Three levers, all already present or trivially added:
- `?nointro=1` skips the entry choreography (existing hero QA param); `?introat=P` freezes it mid-way when a pose needs it.
- `?capture=<pose>` (new, added with the camera director in P3) pins journey progress to that pose's exact `p`, disables the handheld drift and the breeze/tap ambient offsets, and seeds every RNG from the existing fixed seed (`mushroom-scene.js` seeds at 1337; `helpers.rng(seed)` is mulberry32).
- `--virtual-time-budget` advances timers deterministically instead of sleeping, so the same frame comes out every run.

**Pose set (the golden list).** Five chapter resting poses × {desktop 1440×900, mobile 390×844}, plus the detail states that Tier 3 must be able to show: three Inspire spotlights, three Connect cards, three Owned ownership pods. Contributor portraits are *not* captured individually — Tier 3 shows the field capture plus the DOM contributor index.

**Where they land.** `glowshroom/journey-v6/captures/<pose>@<w>x<h>.png` plus a generated `captures/manifest.json` (`pose → { src, w, h, srcset, chapter, copyAnchor }`).

**How Tier 3 consumes them.** The static journey is real DOM: one `<section>` per chapter, each with the chapter heading/sub/nodes from the content model and a `<picture>` whose sources come from the manifest. No CSS-composed illustrations, no ambient animation, no parallax — matching v6's `prefers-reduced-motion` requirement. Because the images are captures of the shipping scene, the Tier-3 identity review at G5 compares like with like. The donor's hand-authored CSS stills are retired.

**"CI" on this machine (D8).** There is no CI server and `git` is currently unavailable (Xcode CLI tools missing), so the gate is a script, not a hook:
- `tools/capture.py --check` re-captures the golden list and diffs each PNG against the checked-in golden with Pillow (mean absolute error per channel; fail > 2%, warn > 0.5%). Failures write a side-by-side diff into `journey-v6-plan/baseline-captures/diffs/`.
- It runs at every gate (G2a, G3, G4, G5) and before every merge that touches scene code, alongside the hero regression screenshot from `01-baseline-freeze.md` — the same script covers both, since the Mission pose *is* one of the golden poses.
- When `git` returns, this becomes a pre-push hook with no change to the script.

## Measured, not assumed (2026-08-02, this machine)

The approach was exercised during the W1-B scaffold: headless Chrome captured `golden-mushroom-page.html?nointro=1` and `journey-v6/index.html?nointro=1` at 1440×900 with `--virtual-time-budget=6000`, and Pillow diffed them.

| Pair | MAE /255 | pixels differing > 8 |
|---|---|---|
| hero vs hero (same URL, two runs) | 2.79 | 8.2 % |
| hero vs journey-v6 scaffold | 3.34 / 1.69 | 10.4 % / 6.0 % |

Two conclusions. (a) The scaffold is within run-to-run noise of the hero — one hero-vs-v6 pair actually differs *less* than hero-vs-hero, so the copy is a true parity copy. (b) **Without a freeze, run-to-run variance is ≈1–3 MAE on its own**, because the breeze/tap sway and the temporal-accumulation (TAA) pass keep running regardless of `?nointro=1` or `?introat=`. A pixel-diff gate is therefore meaningless until `?capture=<pose>` also pins the scene clock, the sway/tap state, and disables TAA jitter. That makes the param a **hard prerequisite** of the diff gate, not a nicety — and it is why the golden threshold above is stated against frozen captures only.

## Consequences

- One new dev-time dependency on locally-installed Chrome. Acceptable: it is the reference browser on the Tier-1 reference device (D8).
- Captures are binary artefacts in the repo. Budget ≈ 16 poses × 2 sizes ≈ 1–3 MB total at 2× — tracked, and pruned to 1× if it grows.
- The `?capture=` param must be implemented alongside the camera director in P3, not retrofitted at launch. Listed as an exit condition of the grey-box prototype.
