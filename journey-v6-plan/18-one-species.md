# 18 — One species: every mushroom is the hero's mushroom

**Status:** approved (Hannah, 2026-08-04). Follow-up to 17-final-field.md.
**The complaint:** in the Final frame, the hero reads as a *different kind of
mushroom* from the ring and field members. Their caps came out flatter and
parasol-like, stems skinnier — a different species standing in the same field.

## 1. The invariant (the whole point)

**One silhouette.** Every mushroom in the world — hero, ring member, field
body, distant hint — has the SAME proportions: the hero's cap profile, rim
line, margin droop, and stem taper. Two things and only two things vary:

| axis | what it changes | what it must NOT change |
|---|---|---|
| **size** | one uniform scale factor per individual (plus the existing per-member natural variation ≤ ~±12% on cap width) | proportions — a small mushroom is a small hero, not a different shape |
| **detail tier** | stroke/line counts, gill counts, point counts, extras (dust, pools) | the silhouette those strokes trace |

## 2. Source of truth

The hero's form language already exists as importable math:
`journey/anatomy.js` mirrors organism.js §4 byte-faithfully — `capUnderPt`,
`rimRad`, `rimYoff`, `marginDroop`, plus the stem taper law (port it into the
shared builder if not yet mirrored; mirror organism.js §4 exactly, and note the
mirror the way anatomy.js does). **No file may define its own cap dome or stem
curve.** If final/ring.js currently carries independent cap math, it dies.

## 3. Structure (the "nice way")

One new module: `journey/chapters/final/species.js`

```
buildMushroom({ scale, tier, seed, azFacing }) -> { positions, colors, ... }
```

- `tier` ∈ {T1 ring, T2 mid, T3 far, T4 hint} — a **DETAIL table at the top of
  the file** (one object per tier: lattice rings/meridians, gill count, rim
  segments, point budget, extras flags). Tuning detail = editing that table.
- All geometry sampled from the anatomy functions, scaled by `scale`.
- `ring.js` keeps placement, reveal choreography (`aReveal`/`uPull`), and
  batching — it calls `buildMushroom` and never draws anatomy of its own.
- The hero organism itself is untouched (it IS the reference, not a rebuild).

## 4. Acceptance

1. **Numeric silhouette check** (not just eyeballs): sample the builder's cap
   profile at ~12 u-stations for a T1 and a T4 member, divide by scale, and
   assert the points match `capUnderPt`-derived reference values to <1%.
2. **Visual**: side-by-side screenshot at the Final rest — a near member vs
   the hero must read as the same organism at different ages. Hannah-sentence
   test: "same mushroom, smaller."
3. Budget: segment/point counts and draw calls at or below the current build
   (17-final-field.md numbers: 36,241 segs / 102 calls); fps at rest no worse.
4. All D16/self-ignition, scrub, console, and rate gates from 17 stay green.
5. Goldens: `final` re-shot same-commit with provenance; all others
   byte-identical.

## 5. Do not touch

organism/* (read-only reference), the Final camera keys, the reveal
choreography semantics, other chapters, locked copy, route.js.
