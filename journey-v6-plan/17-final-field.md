# 17 — Final field: the epilogue restage

**Status: SHIPPED (same-commit goldens).** Hannah's brief, verbatim intent:
the fairy-ring mushrooms must read as the hero's species; a whole field of
smaller mushrooms should stretch into the distant background; the headline
must stop fighting the mushrooms; the Owned portrait faces must not appear
in the epilogue frame; the copy moves to the bottom-left corner and the
upper-right of the frame goes to the field.

## What changed

| File | Change |
|---|---|
| `journey/chapters/final/ring.js` | Two FIELD tiers + a hint rung on the D15 ladder; anti-lamp damping (innerK / crowdK / lum·lumMul); zero-count guards so the one builder serves every rung |
| `journey/chapters/final/world.js` | Member az 291 → 297: it sat on the same rest-camera ray as the az 279 body (−44.3 vs −44.7 deg) and the two caps summed into one over-wide white "pancake" — the worst species-breaking read in frame |
| `journey/chapters/final/index.js` | `snap()` added (placeAt contract). Until now the frozen capture pipeline shot the epilogue with `amount` stuck at 0 — the shipped final golden showed the hero over an unlit floor, none of the chapter's content. The golden now contains the composition it gates |
| `journey/chapters/owned/index.js` | Portrait-field surface mask: `portraits.setFade(eff * faceVis)`, `faceVis = 1 − smooth01((p − 0.815)/0.030)` |
| `journey/ui.js`, `journey/site.css` | `final: 'pos-bottomleft'` + the new position class (desktop `left 5.2vw / bottom 9vh`, ≤900px `left 6vw / bottom 11vh`, clear of the footer cue's band) |

Copy strings untouched (locked verbatim, content.js). Camera keys untouched —
the splice at p 0.85, the rest pose and the end-hold are the shipped ones.

## The field

Same species, same builder, same TWO draw calls. `buildMushroom()` now takes
a tier override and the D15 ladder keeps walking down:

| Tier | Band (from rest cam) | Count | What survives |
|---|---|---|---|
| T3 | 15–24 units (19+ on frame-left) | 15 | sparse cap lattice (5×20), 2-ring rim + 14 ticks, 12-gill whisper, 6×7 stem lattice + 7 fibres |
| T4 | 24–36 units | 28 | 3×14 cap, 24-seg rim, 3×5 stem + 4 fibres, cavity + pool glows |
| hints | 34–46 units | 20 | a front-facing rim arc (8 segs, bright toward the lens), cap ember + soil pool |

Placement is authored in the REST frame about the rest-gaze heading (read
from the chapter's own `final-rest` key): ~2/3 of bodies on the frame-right
side, a 9.6-unit moat around the ring band, hero clearance + the trees' airy
sky sector kept, and `cutVal ≥ 0.4` everywhere — the cutaway wedge stays
void, which is exactly where the copy now floats. Sizes mostly smaller than
ring members with a seeded 12% of "elders" (+0.8 h).

**Reveal:** field members carry `aReveal = 0.45 + 0.37·distFrac` — the
kindling travels OUTWARD from the ring into the fog as the pullback
completes, pure in uPull (camera-x), so reverse scrubs retract the field
back toward the ring and a fling still surfaces onto a finished world
(rise-mask OR unchanged). Dark at arm as before. Hints complete only as the
camera settles (0.80–0.84).

## The lamp fix (species match)

Hannah, third round: distant members read as glass lamps — a different
creature. Measured cause (A/B with interior points zeroed): NOT the glow
points — additive **stroke pileup** under bloom. A far body's stem lattice +
fibres + gill fan live in a screen column a few px wide; their sum saturates
white while the hero's identical strokes stay textured because they cover
pixels. Fixes, all build-time:

- `crowdK = [1, 0.52, 0.42, 0.78, 0.75][tier]` on stem-lattice, fibre and
  gill stroke tones (cap lattice + rim spared — they are the identity);
- `innerK = [1, 0.55, 0.45, 0.5, 0.4][tier]` on the interior point stack
  (gill core, stem motes, heart/cavity, both ground pools — the second pool
  had escaped every earlier dim and was the "foot ball");
- cavity sprite trimmed (1.15→0.95 capR), heart 0.36→0.29 and smaller;
  T0 near bodies untouched;
- per-field-member `lum` (heat-ramp tone slide — dimmer AND warmer, the
  fog's own direction) and `lumMul` (carried opacity), T3 0.70 / T4 0.52;
- base-flare warmth (yT<0.12 boost) now T0-only;
- fibre counts T1 17→13, T2 13→9;
- the az-291 ray-overlap move (world.js above).

## The faces

The colony stays armed through the epilogue (OWNED_HOLD_HI past-the-end) and
the cutaway deliberately shows it in section — but the contributor FACES
were surfacing as readable portrait blobs in the corner of the surfacing and
rest frames. Mechanism: the Owned chapter multiplies only its **portrait
field** fade by a p-keyed mask that completes at 0.845, *before* the surface
pierce (~0.850) — measured: the first window (0.836–0.872) still showed
faces bottom-right at p 0.855; the shipped window is 0.815–0.845 and the
0.845/0.855/0.875 stills are clean. p and the camera are a bijection on the
leg, so this is a camera-keyed fade (D16-lawful): reverse rides restore the
faces as the lens re-enters the colony's dark upper reaches, no pop. The
substrate keeps its glow — the wedge's underground light is the designed
read. Owned rest (p 0.725) and its golden: untouched, mask ≡ 1.

## Measured

- **Geometry:** ring+field segs 25,876 → 36,241 (+10,365); glow pts +765;
  **draw calls 102 → 102**; triangles unchanged (18,851).
- **Frame (hidden-pane, 1280×800 @dpr1, same probe both runs):** cadence p50
  16.8 ms (~60 fps) after vs 32.5 ms before (pane-burst noise; after-run is
  the healthier trace); sceneCpu p50 11.8 ms vs 10.3 ms baseline (+1.5 ms);
  pixelRatio 1 in BOTH runs (pane environment, not a change effect).
- **Camera (untouched, measured for the record):** over p 0.80–1.0 peak yaw
  1308 deg/unit-p, peak pitch 592, both at p≈0.9125 (the approach into the
  rest) — the shipped leg's own values, identical by construction.
- **Gates:** capture.py --check PASS (worst MAE 0.00/255, all ten);
  mission/inspire/connect/owned goldens byte-identical in git; final golden
  re-shot same-commit with manifest provenance. Scrub stills (live,
  `?nosnap=1&p=`) at 0.78–1.0 both directions: no self-ignition, faces
  retire before the pierce, field arrives as whispers + outward kindling,
  end-hold + footer cue flow verified (cue click → p=1, footer live).
  Console: info-only over a full 0→1→0 ride. 375×812 / 430×932 / 1280×800 /
  1440×900 compositions checked.

## Residuals

- The shipped leg's yaw peak (1308 deg/p at the rest approach) sits above
  the ~1.2k house aim; pre-existing, untouched here — a future re-key can
  spread the approach if it ever reads as a whip.
- Frozen captures still exclude the Owned colony's faint wedge glow (owned
  has no `snap()` by design — its golden must stay frozen). Live shows it;
  the delta is now small since the faces are masked anyway.
- The end-hold recede runs the field at full kindle and the near-right field
  bodies sit a touch hot behind the footer; acceptable in review, monitor.
- Footer focus handoff after a *synthetic* cue click landed on the skip
  link, not the first footer link; shipped behaviour, not touched here —
  retest with a real gesture before filing.

---

## 2026-08-04 — ONE SPECIES: the geometry left ring.js (18-one-species.md)

**Status: SHIPPED (same-commit goldens).** Hannah, at the Final rest: the ring
and field members read as a *different kind of mushroom* from the hero —
flatter, parasol-like caps on skinnier stems. The lamp fix above had solved
the LIGHT; this solves the FORM.

### What was actually wrong

`ring.js` did not copy the hero's form language — it carried a
**parameterization** of it, and "individuation" was quietly authoring new
species. Measured over the full seeded parameter space:

| ratio | before (range) | hero / after (fixed) |
|---|---|---|
| rim radius / apex height | 0.3067 – 0.5914 | **0.5378** |
| dome height / rim radius | 0.4211 – 1.4790 | **0.5191** |
| stem radius (y=1) / rim radius | 0.0763 – 0.2430 | **0.1111** |

A 3.5x spread on cap-flatness and a 3.2x spread on stem-thinness. Both of
Hannah's words are in that table: a body could draw a dome 19% *shallower*
than the hero's on a rim two-thirds its width (the parasol), while its stem
came out 31% thinner than the hero's for its cap (the skinny stem). Four
knobs did it — `rimScale`, `domeH`, `stemW`/`flareK` — plus a fifth, quieter
one: the stem taper was renormalised against a **shortened stem top**
(`capY + 0.18` = 3.33 against the hero's `STEM_TOP` = 3.9), which steepens
the taper law itself. A sixth lived in `world.js`: `capR = h * (0.40 + 0.10 *
maturity)`, an independent cap-width law up to 26% narrow, which also made
maturity a SHAPE axis.

### The restructure

**New: `journey/chapters/final/species.js`** — `buildMushroom({ tier, seed,
scale, azFacing, mat, shed, emit, mul, shade })`. All geometry sampled from
the `anatomy.js` form functions, scaled uniformly. It never touches a THREE
object and knows nothing about placement, batching or the reveal.

**`anatomy.js`** gains the §7 stem law it was missing — `stemRadius(y)`,
`stemAxis(y)`, `CAP_THROAT` — mirrored from organism.js byte-for-byte, with
the mirror's provenance noted the way the §4 cap functions already are. (The
throat is the *un-staged* vector: organism.js applies `tiltX`/`leanZ` to it,
but those are how the one hero is framed for the camera, not anatomy.)

**`ring.js` is now placement, and only placement.** What died: `topPt`,
`underPt`, `stemR`, `stemAxis`, `rimRad`, `rimYoff`, `droop`, `lump`, the
whole `TIERS` count table, and the `memberParams` knobs above — 726 lines
changed, **net −355**. What it kept, unchanged in semantics: where bodies
stand, the distance→tier ladder, the rest-camera shading (`heatK` / `occlS` /
`occlM` / `underVis` / `crowdK` / `innerK`), the ground-merge root stubs
(they walk on real `groundY`/`cutVal`, so they are terrain's business — they
now seat against the species' own `STEM_BASE_R`), the two draw calls, and the
`aReveal`/`uPull` choreography.

The **cap-rim hints** went through the same builder too, on a `T_HINT` rung.
They had been hand-rolled circles of radius `h * 0.45` — the last independent
cap math in the chapter, and wrong twice over (a circle has none of the rim's
waviness, and 0.45 is 16% narrow). Even the faintest thing in frame now
traces the hero's rim.

### The DETAIL table

Six rows in `species.js`, one per rung — `ring-near`, `ring-mid`, `ring-far`,
`field-near`, `field-far`, `hint`. Counts, probabilities, and extras flags
(`rimStack`, `frontArc`, `cavityCore`, `pool2`, `shed`, `arcOnly`) all moved
into it, including the four that used to be inline `T >= 2` / `T < 4`
conditionals. **Tuning detail is now editing that table**, and it sits beside
the one silhouette it traces.

### What still varies per individual

Only things that cannot change a proportion: **`azFacing`** (a rigid Y
rotation — the hero's cap droop, its one crisp fold accent at az 5.3 and its
rim harmonics travel with it, so every body presents a different profile of
the same silhouette; this is what makes ~90 bodies of one shape read as ~90
individuals), a **uniform scale** with ±9% natural variation folded into that
same factor, a few degrees of whole-body lean, the heat sector, the twinkle
phase, gill DENSITY, and the seeded stroke jitter.

The lean band was trimmed `(0.04 + 0.11·r)` → `(0.03 + 0.06·r)`: at 11 deg a
body tilted away from a lens that already looks DOWN on it opened its rim
ellipse into a saucer, which reads as a different shape even though it is the
same one. The hero's own staging tilt is ~0.058 rad total; the band now
brackets it.

### Numeric silhouette check (doc 18 §4.1)

The builder's cap profile sampled at 12 u-stations, un-scaled, against
`capUnderPt` references, for a T1 (`ring-near`, h 2.0, scale 0.4295) and a T4
(`hint`, h 0.9, scale 0.2160) member. Azimuth 2.3197 rad:

| u | r built | r ref | y built | y ref | dev |
|---|---|---|---|---|---|
| 0.000 | 0.257002 | 0.257002 | 3.680000 | 3.680000 | 0 |
| 0.091 | 0.262793 | 0.262793 | 3.600820 | 3.600820 | 0 |
| 0.182 | 0.465302 | 0.465302 | 3.527339 | 3.527339 | 0 |
| 0.273 | 0.668530 | 0.668530 | 3.459792 | 3.459792 | 0 |
| 0.364 | 0.871387 | 0.871387 | 3.398367 | 3.398367 | 0 |
| 0.455 | 1.073612 | 1.073612 | 3.343262 | 3.343262 | 0 |
| 0.545 | 1.275112 | 1.275112 | 3.294698 | 3.294698 | 0 |
| 0.636 | 1.475847 | 1.475847 | 3.252939 | 3.252939 | 0 |
| 0.727 | 1.675798 | 1.675798 | 3.218318 | 3.218318 | 0 |
| 0.818 | 1.874955 | 1.874955 | 3.186628 | 3.186628 | 0 |
| 0.909 | 2.073314 | 2.073314 | 3.096984 | 3.096984 | 0 |
| 1.000 | 2.270873 | 2.270873 | 2.929187 | 2.929187 | 0 |

**Both tiers produce this identical table** — worst deviation across all 24
stations **1.27e-14 %** (double-precision noise), against the <1% bar. That
is the point of the check being tautological: it is only tautological because
there is no second copy of the math left to disagree.

Corroborated end-to-end on EMITTED geometry: every cap-lattice stroke
endpoint from a real `buildMushroom` run, un-scaled and un-rotated, sits on
`capTopPt` with median |Δy| 0.025 / p95 0.089 hero units — the build's own
authored jitter (grid y ±0.04, u ±0.02, a ±0.028), not form error.

### Measured

- **Geometry:** ring+field segs 36,241 → **36,092** (−149); glow pts 3,103 →
  **3,082** (−21); **draw calls 102 → 102**; triangles unchanged (18,851).
  Two DETAIL trims paid for the wider caps' longer rim rings: `field-far`
  `fibSeg` 4→3 and `rimPts` 2→1, both sub-pixel at 24–36 units.
- **Frame (Browser pane, 1280x800 @dpr1, best-of-3 p50, A/B in the same
  session):** after 25.8 ms (38.8 fps) vs before 27.3 ms (36.6 fps). Run
  spreads overlap (after 25.8/27.3/28.5, before 29.2/27.4/27.3) — the honest
  reading is *no worse*, in the same noisy pane doc 17 measured in.
- **Reveal purity (D16):** at every settled p in 0.80…1.0, sampled forward
  then backward, `uPull` hysteresis is **exactly 0.000000** and `uPull ≡
  pullOf(camera.x)` to 1e-6. At the arm (p 0.80–0.83) `uAmount` reaches 1
  while `uPull` is still **0** — every body sits at its 7% ember whisper.
  Dark at arm, no self-ignition, camera untouched (`camera.js`, `route.js`
  and the copy strings have no diff).
- **Console:** info-only over a full 0→1→0 ride.
- **Gates:** `capture.py --check` before the re-shoot: the four non-final
  poses at **MAE 0.00/255, 0.0% px>8, both sizes**; only `final` in the
  FAIL-band (5.89 desktop / 2.05 mobile), which is the intended change.
  `final@*` re-shot same-commit with manifest provenance. One stray pixel
  (±1/255, R only) appeared in `owned@1440x900.png` on the re-shoot — GPU
  last-bit noise in a chapter this change cannot reach (owned rests at p
  0.725, final arms at 0.80); that golden was restored from HEAD so the
  commit moves `final@*` and nothing else. Compositions checked at 1440x900
  and 375x812.

### Residuals

- Members are seen from ABOVE at the rest while the hero is seen near rim
  level, so a member shows its cap top where the hero shows its gill fan.
  That is one organism at two angles (and `underVis`, the doc-17 elevation
  occlusion that stopped near bodies reading as open glowing bowls, is what
  holds it) — but it is the one remaining thing that could still be misread
  as a difference in kind. Worth a look if Hannah raises it again; the fix
  would be camera or member height, not form.
- The frame-left near pair still sums to a hot streak under bloom. Slightly
  calmer than before (wider caps spread the same strokes over more pixels),
  still the brightest thing that is not the hero. Pre-existing; monitor.
