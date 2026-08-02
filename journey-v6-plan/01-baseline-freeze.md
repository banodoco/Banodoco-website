# 01 — Baseline Freeze & Audit (P0)

**Objective:** freeze the approved hero (`golden-mushroom-page.html` + `mushroom-scene.js`, as served at `http://localhost:8137/golden-mushroom-page.html`) as the regression baseline before any extension work. The handoff is explicit: *"Before extension work begins, capture baseline screenshots, bundle weight, frame time, and interaction behaviour for the implemented hero."*

**Owner:** Tech Lead. **Exit gate G0:** BASELINE.md exists, budgets agreed by Tech Lead + Peter.

## Tasks

### BF-1 Snapshot the artifact (S)
- [ ] BF-1.1 Tag/copy the exact hero files into `glowshroom/archive/` with today's date (pattern already exists: `archive/golden-mushroom-page-2026-07-31.html`). Include `mushroom-scene.js` this time — the archive currently only holds the HTML.
- [ ] BF-1.2 Record the serving setup (static server, port 8137, no build step) in BASELINE.md.

### BF-2 Visual baseline (M)
- [ ] BF-2.1 Screenshot matrix at the Mission resting pose: desktop 1440×900, deskNarrow, tablet portrait, mobile portrait (the page's own `ANCHORS` modes: desktop / compact / deskNarrow / tablet / mobile), light-load and idle states.
- [ ] BF-2.2 Capture the intro choreography at fixed progress points using the built-in QA hooks: `?introat=0.25 / 0.55 / 0.85` and `?nointro=1` resting state.
- [ ] BF-2.3 Capture each callout state: idle, hover/lit, touch-forced (`.force`) for 01 INSPIRE, 02 EQUIP, 03 CONNECT.

### BF-3 Performance baseline (M)
- [ ] BF-3.1 Bundle weight: bytes for HTML + JS + vendor three.js, and count of requests to first meaningful render.
- [ ] BF-3.2 Time-to-interactive and first-meaningful-render on a cold load (throttled and unthrottled).
- [ ] BF-3.3 GPU frame time at the resting pose and during the intro on the two reference devices (BF-5).
- [ ] BF-3.4 Transparent-layer / draw-call / particle counts at rest (read out of the scene, recorded as numbers).

### BF-4 Interaction inventory (S)
- [ ] BF-4.1 Document every existing behaviour that must survive: tap pulse, cursor slipstream wind, callout hover/tap model, stem sway (Equip callout rides it), 2RP/Discord control grouping, reduced-motion path, WebGL-failure fallback, resize/mode switching.
- [ ] BF-4.2 Note current accessibility behaviour (focus order, aria state) as-is, even where imperfect — it is the reference point for "no regression".

### BF-5 Reference devices (S) — resolved by decision D8
- [x] BF-5.1 **This machine is the reference device** (the Mac serving localhost:8137): Tier 1 = native, 60fps. Tier 2 = device emulation (mobile viewport + CPU throttling) on this same machine. Record its exact specs in BASELINE.md. Real-Android verification is a recorded deviation, deferred until hardware exists.

### BF-6 Regression budgets (S)
- [ ] BF-6.1 With Peter + Tech Lead, set the numeric "may not regress materially" thresholds: max bundle delta for the initial load, max TTI delta, max frame-time delta at the Mission pose, screenshot-diff tolerance.
- [ ] BF-6.2 Wire a repeatable check (script or checklist) that runs the diff on demand; it becomes mandatory at every gate and before every merge to the extended build.

### BF-7 Consent pipeline kickoff (S) — *not baseline work, but P0 by schedule*
- [ ] BF-7.1 Hand `13-content-ops.md` CO-1 to Content/Ops now: contributor consent is the longest-lead item in the project and must not gate launch.

## Acceptance
- BASELINE.md in the repo with all numbers, screenshots referenced by path, and budgets signed.
- The regression check runs end-to-end once against the untouched hero (should pass trivially).
