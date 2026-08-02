# 14 — QA & Acceptance (continuous; hard sweep at P6)

**Objective:** the handoff's prototype acceptance criteria are the project's definition of done. Each criterion below is mapped to the phase where it's first testable and the test procedure. The full list re-runs as the P6 hardening sweep on the device matrix.

**Owner:** whole team; Tech Lead runs the sweep; Peter signs the perceptual items.

## The checklist (from the handoff, mapped)

| # | Criterion | First tested | How |
|---|---|---|---|
| 1 | Fast end-to-end scrolling never exposes a cut or unrelated frame | P3 | Scripted fast scroll down+up, recorded, frame-stepped |
| 2 | Scrolling upward retraces the spatial journey cleanly | P3 | Manual reverse runs at three speeds |
| 3 | A direct URL opens the correct chapter and detail state | P3 | URL matrix test (every chapter + detail) |
| 4 | Back closes the detail state before leaving the chapter | P3 | Browser-back sequence tests |
| 5 | Manual scroll cancels a nav-triggered flight without camera disagreement | P3 | Interrupt tests mid-flight |
| 6 | Mission hero renders/behaves as before; no material regression (visual, loading, a11y, perf) | P3, every gate | BF-6 regression check + MP-7 numbers |
| 7 | Rear-cap orbit, under-cap entry, soil-line crossing feel continuous | P3 | Peter review, both directions |
| 8 | Tier 2 retains identity with reduced richness | P5 | Side-by-side tier review |
| 9 | Tier 3 communicates everything without WebGL | P5 | WebGL-disabled walkthrough |
| 10 | Accepted real-time look = fidelity baseline (not the stills) | P2 | G2a record |
| 11 | Owned portraits pass embedded-not-pasted at density, in motion | P2/P4 | G2b + production re-check |
| 12 | Explicit decisions on scrub distance, soft rests, text pinning, transition allocation | P3 | G3 decision log |
| 13 | Inspire→Connect→Owned legible and paced in both directions | P3 | Peter review |
| 14 | Inspire unmistakably second; no Equip stop/route/preload/scroll anywhere | P3 | Code + route + bundle audit (grep Equip in active graph) |
| 15 | Owned usable on touch without overlapping portrait targets | P5 | Device test + 44px audit |
| 16 | Resting compositions/movements match the camera matrix | P3 | Map-vs-build review |
| 17 | Lens reduces particle-demo cleanliness without obscuring strands or becoming an obvious effect | P2 | G2a, raw-vs-finished A/B |
| 18 | Raw-vs-finished toggle available from first look-dev build | P2 | Keypress check in every build |
| 19 | DOM text + projected annotations crisp; unaffected by aberration/grain/composite/halation | P4 | Zoomed screenshot audit at all poses |
| 20 | Tier 2/3 preserve grade identity | P5 | Grade comparison stills |
| 21 | Hero and Final never read as tree roots; fruiting bodies emerge from a pre-existing colony | P2/P4 | Peter review |
| 22 | Three Inspire exits sequential, distinct, origin beneath the cap (never cap-top) | P4 | Visual review + particle-source audit |
| 23 | No plume behaves like a cap-top fountain | P4 | Same |
| 24 | Ambient motion randomized phase, local causality; no synchronized breathing | P4 | Per-chapter motion cull pass (PS-4.4) |
| 25 | Final cutaway: ring + growth front + spore cloud, no dead space | P4 | Peter review |

## Additional standing tests

- **Perf:** frame-time capture at each resting pose + each transition on both reference devices, each gate; budgets from LA-7; 30fps mobile needs explicit approval.
- **State torture:** scroll-during-flight, deep-link-then-immediately-scroll, back-spam during details, resize mid-transition, tab-away/return.
- **A11y:** keyboard-only full journey; screen-reader document walkthrough; contrast audit (AA).
- **Content:** every string vs the locked table; consent flags vs tracker; live-module freshness auto-hide.
- **Zero console errors** at every pose and transition (donor contract rule, kept).

## Sign-off sheet

Each gate gets a dated entry: criteria checked, numbers recorded, exceptions logged, approver named. Launch readiness = all 25 green on the device matrix + content freeze + consent records complete.
