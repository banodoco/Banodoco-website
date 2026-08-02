# 09 — Chapter: Owned (P4, hardest look-dev problem)

**Objective:** the conceptual reveal: visibly underground, people-powered, materially different from Connect. Carries the project's largest compositing/art-direction budget. Production starts **only after gate G2b** (portrait spike approved).

**Owner:** 3D Dev + Content/Ops (profiles/consent) + Frontend (cards, mobile index). **Reference:** `reference-images/approved/owned.png`. Depends on: `04` Spike B, `13` consent pipeline.

## Copy and claims (locked, literal, final)

- Heading: **"Owned by the ecosystem"** with the ownership claims:
  - **100% shared** — dominant principle
  - **Granted 1% per month** — secondary (gradual distribution over time)
  - **Split between different groups** — secondary, naming *artists, core engineers, and knowledge creators*
- Copy position: **top-centre**. A faint mushroom silhouette may sit behind the heading; no separate above-ground scene.

## Tasks

### OW-1 Descent + threshold (M)
- [ ] OW-1.1 Camera leaves the chamber near the stipe, descends the exterior/stipe-side surface, crosses the soil-line (streaming seam), levels into the glide path per the map.
- [ ] OW-1.2 The soil crossing is the second major threshold — verify continuity forward and reverse.

### OW-2 The mycelial field (L)
- [ ] OW-2.1 Volumetric, irregular, substrate-bound: dark pockets, soil aggregates, a few thick rhizomorph cords, fine strands at many depths. Explicitly *not* tree roots; explicitly not a uniformly illuminated circuit board.
- [ ] OW-2.2 Ambient: slow waves along thick cords, asynchronous twinkle in fine hyphae; no perceptible global loop.

### OW-3 Ownership pods (M)
- [ ] OW-3.1 Visual hierarchy per the approved still: **100% shared** clearly primary but not overwhelming the network; two secondary pods smaller/lower, legible.
- [ ] OW-3.2 Hover primary → one broad, slow pulse through the full colony. Hover secondaries → smaller localized responses.
- [ ] OW-3.3 Pods get explanatory states, not product-style drawers.

> **Hard placement rules from Spike B rev 2 (carry verbatim):** (1) every portrait node keeps ≥3.0 world units of clearance from any point of the camera path — a nearer node's defocused plane can swallow the whole frame; (2) place nodes by frame-cell stratification (assign each a home moment on the path + a cell of a 3×3 frustum grid at a near/mid/far depth pattern) so edge/corner/depth coverage is authored, not hoped for. Also: add a size/spacing jitter rule to prevent "row of coins" chains at density, and expect per-photo QA — the background edge-burn window is narrow.

### OW-4 Contributor portrait field (L) — applies Spike B parameters
- [ ] OW-4.1 Portraits as warm ember-nodes grown into the network: masks, grading, fibre rims, strand endpoints terminating at each node, multi-plane depth scatter with focus behaviour during the glide.
- [ ] OW-4.2 Hover/focus a person → ember rim brightens, portrait comes slightly forward, **only** their actual connecting strands illuminate.
- [ ] OW-4.3 Click → small profile card: name, role, one-two sentences on contribution and ownership relation; the field stays visible and alive behind it.
- [ ] OW-4.4 Consent enforcement in code: a portrait renders real image/name **only** when `consent: true` with approved copy (per `13`); otherwise the anonymous ember-node fallback from LB-4.
- [ ] OW-4.5 Mobile: curated spatial subset with ≥44px targets + a bottom-sheet index listing the complete accessible contributor set (per `12`).

### OW-5 Transition (S)
- [ ] OW-5.1 Exit: a pulse leaves along the active growth front; camera follows, rises through substrate, tilts into the cutaway — Final begins; **Owned stays the active nav chapter** through the epilogue.

## Acceptance
- Passes the embedded-not-pasted test at realistic density, in motion (the G2b bar, re-verified at production density).
- Claims hierarchy reads correctly at a glance; secondary claims never compete with 100% shared.
- Person hover illuminates only their local strands.
- Usable on touch without dozens of overlapping hit targets.
- Real people appear only with explicit consent + approved copy; fallback nodes look intentional.
