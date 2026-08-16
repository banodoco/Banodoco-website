# QA loop index

All console tooling against the dev server (`python3 serve.py` on :8137).
None of it ships — "NOT shipped: nothing imports it" is the first line of
every header. Load by hand, read the numbers, close the tab.

| Tool | What it asserts | How to run |
|---|---|---|
| `tools/fieldpace.js` | The Final field's arrival in the two units Hannah uses: `kindle` (seconds one body takes to light), `gap` (between one body starting and the next), `sweep`, `order` (fieldpace.js:24-28). Measured on the REAL wheel path — rAF WheelEvents + a real release so the commit glide runs; the ladder is read from the build, never restated | Load by hand, `await __fieldPace({ dir, speed, from, to })`; results land in `window.__fp` (fieldpace.js:6-7, 36) |
| `tools/revealgates.js` | G1–G6 invariants of the Final reveal driver: camera-pure off a blend (bit-for-bit), placement-pure, blend paced, nothing fades in over open view, no landing pop, convergence (revealgates.js:13-18). G3/G4 refuse synthetic input — they demand trusted wheel deltas (`e.isTrusted`) | Load by hand (or from the capture CDP client), `await __revealGates()`; results land in `__rg` (revealgates.js:3-4) |
| `tools/scrollgates.js` | Scroll-controller invariants a speed trace cannot see: scrub adds no distance of its own (E2/E3 must read 1.0000), out-and-back returns (E1/R1), notches are not fought (R3), the landing never overshoots (R4), the p=1 end-hold holds (R5), a full 0→1→0 ride visits every anchor and stops nowhere else (R6) (scrollgates.js:5) | Load by hand next to scrollprobe.js, `await __gates()`; results land in `__g` (scrollgates.js:2-3) |
| `tools/inputgates.js` | The input surface, asked at a real pixel "what is actually on top?": the canvas owns the frame at rest (G1), even with every overlay's `hidden` stripped (G2 — the exact pre-fix state), the poke fires for body and ground on mouse AND touch (G3), overlays are inert while closed and live while open (G4), an open overlay takes the frame and hands it back (G5) (inputgates.js:29-33) | Load by hand (or from the capture CDP client), `await __inputGates()`; results land in `__ig` (inputgates.js:2-3) |
| `tools/scrollprobe.js` | Scroll FEEL, not p-rate: per-frame SCREEN speed — a grid of points unprojected at the camera's own look distance, re-projected next frame, median pixel displacement — under a real momentum-tail gesture (scrollprobe.js:1-20) | Script-tag load, then `await __probe.run({ at, peak, driveMs, tailMs })` (scrollprobe.js:4-6) |

## Serving

ALWAYS `python3 serve.py` (port 8137, no-store). Never plain `http.server`:
Chrome caches ES modules aggressively, so an edit behind a cached module
graph is an invisible stale build — every "I changed it but nothing moved"
hunt traces back to that (serve.py:1-6).

## The capture loop

`tools/capture.py` shoots the five resting poses × two viewports as frozen
stills (the `?capture=` freeze — deterministic to MAE 0.00/255, so goldens
are pixel targets, not one honest frame) into `static/captures/`.

- **Re-shoot a golden** — `python3 tools/capture.py --pose <id> --size desktop --note "why"`.
  The note lands in `manifest.json` (capture.py:562); re-shooting in the same
  commit is the only sanctioned way a golden changes.
- **The gate** — `--check` re-captures beside the goldens and exits 1 on any
  MAE over 1.0/255. In frozen mode this is a REAL gate, not advisory
  (capture.py:7-8, 212-213; `--live` stays advisory by construction).
- **Runtime** — a full run is ~5 min: 10 cold page loads of a ~3.3 MB module
  graph, a readiness gate per shot (25 s ceiling, capture.py:167), settle,
  screenshot.
- **The flake** — headless Chrome occasionally fails to open the debugging
  port (capture.py:391-400). Kill orphaned Chrome processes and rerun — it is
  not a code failure (README.md:17-18).

## The commit gate

`tools/pre-commit` (symlinked into `.git/hooks/`) fires on any staged path
under `glowshroom/organism/` or `glowshroom/journey/` (pre-commit:38) and runs
`capture.py --check` — the server must be up on :8137.
`SKIP_SCENE_CHECK=1 git commit ...` bypasses it: doc-only emergencies, never
for code (pre-commit:40-43, README.md:20). An intended visual change ships
with its re-shot goldens in the same commit.

## Shipping

`DEPLOY.md` — the tree deploys as-is. It lists what MUST ship, what MUST NOT,
and the one deploy-time substitution (`sitemap.xml` ORIGIN).
