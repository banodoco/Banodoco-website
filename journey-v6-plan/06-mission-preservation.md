# 06 — Mission: Preservation Guardrails (continuous through P4–P6)

**Objective:** the hero is not a chapter to build — it is a baseline to protect. This doc is the contract every other workstream obeys.

**Owner:** Tech Lead (enforcement), Peter (any visual exception). **Reference:** `reference-images/approved/mission-hero.png` + BASELINE.md.

## Do-not-touch list (changes require a logged exception approved by Peter)

- Hero geometry, materials, lighting, camera framing at the resting pose
- DOM copy: headline *"We're working to help the open-source AI art ecosystem thrive."* + supporting line
- Navigation chrome and the paired 2RP / Discord control (one grouped element, independent hovers)
- CTA treatment (*Explore the ecosystem*)
- Documentary-optics finish as currently shipped
- Growth-intro choreography, loading sequence, and first meaningful render
- Responsive modes (desktop / compact / deskNarrow / tablet / mobile anchors)
- Reduced-motion and WebGL-failure fallback paths
- Existing micro-life: irregular mycelial pulses, under-cap spore drift, moisture glints, cursor slipstream wind, tap pulse, hyphal tip flickers

## Narrow, explicitly-permitted changes

| Change | Why | Guard |
|---|---|---|
| MP-1 Journey handoff hook: CTA and first scroll advance into Inspire (one restrained flow toward the cap, then orbit) | v6 requirement | CTA look/copy unchanged; behaviour change only |
| MP-2 Hidden rear-cap / under-cap extension geometry + attachment points | Inspire needs the back of the same organism | Invisible from all baseline framings; regression diff proves it |
| MP-3 Persistent chapter nav appears for the journey: **Mission · Inspire · Connect · Owned** | v6 nav spec | Additive chrome; must not disturb hero layout at rest; Final is *not* a nav item |
| MP-4 The "02 EQUIP — coming soon" on-mushroom callout: apply decision D6 (remove / re-point / keep) | v6 defers Equip from active surfaces | Peter's call at G1; smallest possible diff |
| MP-5 Lazy-load journey chapters after hero stability | v6 loading rule | Initial bundle / TTI within the BF-6 budgets |

## Standing tasks

- [ ] MP-6 Regression check (BF-6.2) runs before every merge and at every gate: screenshot diff at the Mission pose (all viewport modes), bundle delta, TTI delta, frame-time delta, intro-choreography spot-check via `?introat`.
- [ ] MP-7 The extended build's first approval (end of P3) records hero baseline *and* extended-Inspire numbers side by side: initial bundle, TTI, GPU frame time at the Mission pose and during the orbit, plume particle cost, transparent-layer count, on both reference devices. This is the handoff's named "regression and performance gate".
- [ ] MP-8 Preserve the existing loading experience byte-for-byte in behaviour: headline, nav, CTA are real DOM available immediately; extension assets never delay them; existing WebGL-failure path unchanged, extended only with new chapter stills.

## Acceptance
- Every gate: regression check green, or a logged, Peter-approved exception describing exactly what changed and why continuity required it.

## Logged exceptions

### 2026-08-09 — D27: the hero's under-cap spore drift is reshaped (Hannah's call, overriding this doc)

**What changed:** the ambient shed's wind — the release arc widened from
`[π, 1.98π]` to a smooth single-peaked sweep `[3.20, 7.45]`, and three
permanent lee filaments (weak line-attractors along the breeze at the
Inspire exits' rim lips) added to the drift integrator. The landing
composition therefore changed: the one visible stream off the back rim is
now a slightly wider shed whose dust wraps both flanks and carries three
soft streaks. `mission@*` goldens re-shot (0.51 / 0.93 MAE); with the
spore cloud hidden the hero frame is pixel-identical to its pre-change
self, so the exception is confined to the "under-cap spore drift"
micro-life item on the do-not-touch list. Hero geometry, materials,
camera, copy, nav, CTA, intro and responsive/fallback paths untouched.

**Why:** Hannah's eighth spore report ("they shouldn't EVER switch
positions based on a move — emphasis should just be changed") is only
structurally satisfiable if the particles' positions never depend on the
scroll section. D26 proved the lighting-only model works but that the old
wind never carried dust to two of the three Inspire stream sectors — one
density field cannot serve both the old landing and the three-stream
rest. Hannah chose to reshape the wind and accept the landing change
(D26 "the trade, stated for the decision", option 1; her decision
recorded in the D27 brief). This doc names Peter for visual exceptions on
the hero; that sign-off is Hannah's to obtain and was directed by her —
recorded here so the next reader is not misled by the do-not-touch list.

**Full record:** `07-chapter-inspire.md` D27 (measurements, gates,
residuals).
