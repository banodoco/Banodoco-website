# 05 — Grey-Box Prototype (P3)

**Objective:** prove the continuous journey end-to-end at grey-box fidelity and **resolve every scroll/motion decision intentionally in prototype rather than discovering it during production**. Build order follows the handoff's delivery plan: the Mission→Inspire extension first, then grey-box through Owned.

**Owner:** Motion Designer + 3D Dev + Frontend. **Exit gate G3:** Peter accepts continuity and the scroll decisions, in both scroll directions.

## Stage 1 — Mission → Inspire (the first proof)

- [ ] GB-1.1 The existing hero resting state hands off to journey control via scroll or the existing *Explore the ecosystem* CTA (one restrained flow toward the cap, then the orbit begins). No visual reset, no reload of the hero scene.
- [ ] GB-1.2 Orbit spline per the map: rear three-quarter, slight push-in and upward bias, no roll, no sudden acceleration, not a full revolution.
- [ ] GB-1.3 Three exit regions reveal **sequentially** during the orbit, spatially distinct, then remain visible together at rest.
- [ ] GB-1.4 Reverse scroll retraces the orbit cleanly back to the exact hero pose.

## Stage 2 — Inspire → Connect → Owned corridor

- [ ] GB-2.1 Follow one plume backward/downward around the rim; cap occludes the sky; slip beneath into the gill chamber (streaming/LOD seam fires here).
- [ ] GB-2.2 Lateral move through the chamber to the stipe-cap junction; descend along the **exterior** stipe surface (never the deferred Equip interior); cross the soil-line; level into the underground glide.
- [ ] GB-2.3 Grey-box Owned volume and a placeholder Final rise/cutaway so the full path exists end to end.
- [ ] GB-2.4 Explicit reverse-scroll test of the whole Inspire → Connect → Owned sequence (a named prototype acceptance criterion).

## Scroll model decisions (each gets a logged decision at G3)

The model is fixed by the handoff — *scrubbed travel with soft chapter rests, reversible, tied to journey progress* — but these parameters are ours to set:

- [ ] GB-3.1 Scroll distance allocated per chapter and per transition.
- [ ] GB-3.2 Soft-rest behaviour and snap magnetism strength.
- [ ] GB-3.3 Text pinning: DOM copy stable at resting poses, fades and releases during major travel, reappears only when the next composition has created negative space; large editorial copy never visibly slides during a major move.
- [ ] GB-3.4 Fast-scroll: the same accelerated continuous path — never a cut or unrelated frame.
- [ ] GB-3.5 Nav-flight vs manual scroll: nav clicks fly the camera along the spatial route; **manual scroll cancels the flight immediately** with no camera disagreement.
- [ ] GB-3.6 Detail states close before broader travel resumes; browser Back closes a detail state before changing chapters.

## Interaction skeleton (grey-box level)

- [ ] GB-4.1 Hotspot proxies + hover/focus parity for all named nodes (visual polish comes later; hit-model correctness now).
- [ ] GB-4.2 Deep links land at the right resting pose with the right detail state open, no journey replay.
- [ ] GB-4.3 Keyboard order follows the narrative; Enter opens, Escape closes, focus returns to trigger.

## Motion tuning protocol

- [ ] GB-5.1 Two or three timeboxed tuning sessions with Peter using the motion reference clips chosen in P2. Each session ends with logged decisions (easing families, durations, rest-band widths). No open-ended tuning outside sessions.

## Acceptance (subset of the master checklist exercised at G3)

- Fast end-to-end scrolling exposes no cut or unrelated frame; upward scroll retraces cleanly.
- Rear-cap orbit, under-cap entry, and soil-line crossing feel continuous, not like cuts.
- Inspire is unmistakably the second chapter; no Equip stop, route, preload, or scroll allocation anywhere.
- Resting compositions match the handoff's camera matrix in intent (exact values are the prototype's output).
- The Mission hero still passes the regression check with journey code loaded.
