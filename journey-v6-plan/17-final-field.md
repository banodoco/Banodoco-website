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

---

## 2026-08-06 — ONE SUBSTANCE: the spores at both ends of the ride

**Status: SHIPPED (same-commit `final@*` goldens).** Hannah, verbatim: *"the
spores that are coming from the mushroom at the end feel perhaps different in
character to the ones that are coming from the main one at the beginning, can
you make them match and also make it so the colours of them work nicely, they
should also react to the wind."*

She is right, and for a reason worth naming plainly: **at the end you are not
looking at the spores.** You are looking at a different particle system that
had been built to sit in the same frame.

### The diagnosis, measured

All numbers at the Final rest (p 0.925, camera (−14.72, 2.73, 2.70), scene fog
13.75 → 60.30), against the opening (p 0, camera (−2.25, 2.25, 10.40), fog
7 → 20). Per-particle "output" below is the shader's own product —
tone × opacity × fog × vShrink × DOF-dim — evaluated over every particle from
the live buffers.

**1. The FINAL frame's particulate is a second population, and it is the
loud one.** `chapters/final/sky.js` draws its own 5,200-point GPU cloud.

| at the Final rest | count | depth p50 | screen px p50 / p95 | mean output |
|---|---|---|---|---|
| `sky.js` cloud | 5,193 in frustum | 13.9 | 1.84 / 6.61 | **0.500** |
| `organism/spores.js` shed | 4,200 | 17.2 | 1.70 / 3.06 | **0.109** |

So ~82% of the particulate light in that frame was the chapter's layer.
"The spores at the end" *are* these, and every way they differed from the
hero's shed was a way the substance differed.

**2. Size was the tell, and the mechanism is `vShrink`.** The hero's shed is
mostly SUB-PIXEL — `psize` 0.019–0.091 world units, 0.5–2.4 px at its own
camera — and the point shader holds anything under `MIN_PT` at 1.7 px while
`vShrink` dims it by the area it lost. That is what makes the opening plume a
sea of faint dust with a scattering of bright sparks. The sky layer ran
`szBase * 1.9` **and never applied vShrink in its fragment at all**, so every
dot, however small, rendered at full brightness and at the floor size. Evenly
sized, evenly bright, scattered across the whole sky: a starfield. That is
what the frame looked like, and it is the single biggest reason the two ends
read as different stuff.

**3. Colour was a two-point lerp across a piecewise ramp.** The layer mixed
`heat(0.52)` and `heat(0.9)` by a tone drawn on [0.50, 1.00] — a straight
line between two *samples* of `heat()`, which cuts the corners off the ramp's
own knees at 0.65 and 0.88. Effective spread: about heat 0.71–0.90, a
0.19-wide band that never reaches `C_WHITE`. The hero draws
`0.64 + rand^1.4 · 0.36` **through** `heat()`: a 0.36-wide band with ~6% of
the population above 0.88, where the ramp turns to white.

**4. There was no wind.** The drift ran at a fixed rate along a FLAT
`(0.975, 0, 0.16)`; the only time-varying motion was a 63–94 s eddy of ±1.5
units — a slow lava-lamp swirl. The hero's shed is carried by `BREEZE_DIR`
`(0.845, 0.524, 0.144)`, which *lifts*, at a speed the gust surges
(`carry *= 0.72 + 0.28·breeze(t)`, organism/spores.js §10).

**5. The hero's own shed was fogged out of the frame — clones.js's fog
reversal, one file late.** `organism.js`'s `makePoints` latches
`fogNear`/`fogFar` per material at construction, to the hero page's fixed
7 → 20. The director opens the world to 13.75 → 60.30 across this leg and
everything else in frame rides it — terrain, sky, the species batch, and the
clone bodies, which `clones.js` had to take OFF the hero's pair for exactly
this reason ("THE ONE UNIFORM A CLONE MUST NOT INHERIT: fog"). The shed never
got the same treatment:

| hero shed | fog pair | mean fog factor | mean output | above vis. floor |
|---|---|---|---|---|
| at p 0 | 7 → 20 | 0.672 | 0.518 | 4,200 / 4,200 |
| at p 0.925, before | 7 → 20 | **0.159** | **0.109** | 2,206 / 4,200 |
| at p 0.925, on the world's fog | 13.75 → 60.30 | 0.925 | 0.446 | 4,200 / 4,200 |

The same cloud, 4.7x dimmer at the end for no reason a viewer can see — and
a hard black wall at 20 units straight through a cloud that spans 13.1–20.7,
so the far half of the hero's plume simply stopped in mid-air.

**6. Camera distance is NOT the story.** The hero's shed sits at the `MIN_PT`
floor for ~95% of its particles at *both* ends: screen px p50 = 1.70 at p 0
and 1.70 at p 0.925. "The camera is just further away" would have predicted a
size change; there isn't one. The size difference in frame was the sky
layer's own 1.9x.

**7. A latent pop, found on the way.** Mode 1's alpha was
`0.55 + 0.45·sin(uTime·0.045 + seed·2.7)` — never zero, and unrelated to its
drift phase `fract(uTime/period + phase)`. So a band particle teleported back
to its birth point mid-cycle *while visible*. Survivable while it drifted
flat; a visible fall once the wind lifts it.

### What changed

Everything is in `chapters/final/sky.js` except the fog handover, which is in
`chapters/final/index.js`. `organism/*` is untouched — the shed is steered
only through scene state the chapter already owns and restores, which is this
file's own ground-network precedent twenty lines up.

**CHARACTER — the hero's laws, not approximations of them.**

| | before | after |
|---|---|---|
| sprite size | `szBase × 1.9` (band) / `× 1.15` | `pow(rand,1.8)·0.072 + 0.019` — the hero's own |
| `vShrink` | computed, **never used** | applied in the fragment |
| twinkle | none | `0.85 + 0.15·sin(t·1.4 + seed·7)`, on size **and** light |
| depth | flat `1/d` | the hero's DOF, re-banded: `vBlur = clamp(|d − 10.5| / 14)`, size `× (1 + 1.35·vBlur)`, light `× (1 − 0.55·vBlur)` |
| plume share | 40% | 54% |
| source pick | uniform over the shed-weighted list | squared draw over the same list sorted NEAR-first |
| plume carry | 4–8.5 flat + 6–13 rise | 4.4–7.4 along the one wind |
| plume spread | full eddy + scatter | `× 0.25` |
| life window | band on an unrelated sinusoid | both cohorts on their own phase |

The DOF is the load-bearing one. A hero-sized spore 24 units out is 0.23 px,
which `vShrink` crushes to 1.8% — with the hero's sizes and no DOF the far
half of the cloud is not there, and the first cut went top-heavy and thin.
`FOCAL_D = 10.5, FOCAL_R = 14.0` (the hero's own band is 9.5 / 8, sized for a
lens two metres off one organism) puts `vBlur` at 1 by ~24.5 units, where the
2.35x growth almost exactly cancels the `1/d` shrink: a 24-unit spore lands
the same size on screen as an 11-unit one and 45% as bright. Same law, this
chapter's composition. Depth then reads as brightness and fog, which is where
this chapter already keeps it (`cloneLum`, the tier `lum` ladder).

The near-first source draw is a density argument. There are only **seven**
shedding bodies in frame, at 7.3–16.2 units. A plume is a density before it
is anything else — the hero's is 4,200 particles in a cone four units across
— and spreading the plume cohort evenly over seven bodies gives every one of
them a plume too thin to read as more than haze. Half the cohort now lands on
the nearest two, where a plume can be seen.

**COLOUR — and why it works in *this* frame.**

Baked per particle through `heat()` on the hero's own draw
(`0.64 + rand^1.4·0.36`); `uHeatA`/`uHeatB` and the `vTone` varying are gone,
replaced by a vertex colour attribute. `SPORE_GAIN` 2.2 → **2.4**, the hero
point material's own `uOpacity` on the shed.

The old palette's failure is specific to what this frame has become. A narrow
pale-cream band reads as *sparkle* against near-empty darkness, which is the
Mission frame — and that is presumably where it was judged. But doc 17 and
doc 18 put a field of seventy-two warm amber bodies behind it, and against
warm amber a cold cream population sitting in front of it reads as a
*separate layer*: stars over a landscape, not spores in its air. The hero's
own draw fixes it from both directions at once — the majority now sits in the
amber the field itself is made of, so the dust belongs to the same light;
and the top ~6% reaches white, which is the only part that needs to separate
from the bodies, and does. Measured on the composite: sky-band mean RGB
(52.1, 31.8, 13.0) → (49.3, 29.6, 11.6), R/B 4.01 → 4.25 — warmer, and
6.6% less light in the band while the whole frame moves only −2.3% (35.99 →
35.18). The light was redistributed, not removed.

**WIND — one air current, the hero's law, in closed form.**

The flat drift and the separate rise are gone into one `uWind`, the hero's own
`(1, 0.62, 0.17)` normalized (the same three numbers `shed.js` already
mirrors). The gust is the hero's speed law, integrated:

```glsl
float spd   = aCycle.w / aCycle.x;                        // units / second
float carry = (aCycle.w * t + 0.28 * spd * breezeInt(uTime)) / 0.72;
```

`breeze()` is mirrored into GLSL beside `clones.js`'s JS copy, with the same
provenance note. `breezeInt` is its quasi-static antiderivative: the ~48 s
gust swell is 40x slower than the three sway modes, so carrying it as a factor
and integrating the modes (amplitude / ω each) is accurate to a few percent —
and it is what turns a SPEED law into a POSITION for a shader that has no
frames to integrate over. The `1/0.72` renormalises the mean back to the
shipped drift rate, so this adds a surge and does not quietly slow the cloud.
`d/dt` of the term is exactly `0.28·spd·breeze(t)/0.72` — the hero's ±38%
speed modulation, to the coefficient. Eddies halved (1.5/0.75/1.35 →
0.75/0.38/0.68) now that the wind, not the swirl, carries the cloud.

**One global wind, not seventy-two local ones.** The field's bodies each carry
a seeded sway (`clones.js`), so a spore *could* answer the body it came from.
It should not: a wind is one air current and the bodies' sways are RESPONSES
to it, which is exactly why organism.js §10b shares one signal between the
hero's stalk and the hero's spores ("what makes the motion read as air rather
than as two unrelated animations"). Measured against the alternative: at the
rest camera a field body's cap rim travels ~1 px through its entire sway, so a
release point pinned to it buys nothing visible — while a mis-phased one (this
shader has no per-body state; it would have to re-seed the phase) is a real
error at the same scale. One wind, and the bodies lean in it.

**THE HERO'S SHED, on the world's fog** (`index.js`). Collected once, ramped
toward `scene.fog` by the same eased `reach` the ground-network dim already
uses — pure in the camera pose, so a reverse scrub retracts it — and handed
back verbatim on retire. At p = 0 the chapter is not visible, so the Mission
frame cannot see this at all.

### The wind measurement (measured, not asserted)

A still cannot show motion, so this is two probes with a control between them.

**The control matters more than the result.** The first method — track the
isolated layer's lit-pixel centroid, or phase-correlate consecutive frames —
was run against the HERO's shed, which is the reference implementation of this
wind. It scored **r = 0.05**. A recycling spore population's birth/death churn
is a far larger frame-to-frame signal than the gust, and the hero's cloud is
in steady state so it barely translates at all. A method that cannot see the
wind in the system that defines it cannot certify the system that copies it,
so it was thrown away.

**Hero shed** (live clock, real position buffer written by
`organism/spores.js`'s own animator; per-particle along-`BREEZE_DIR` delta,
trimmed 8% per tail to drop the recycle teleports, which are ~5-unit negative
jumps against a ~0.0005-unit drift step):

| | |
|---|---|
| frame pairs / clock span | 71 / 36.1 s |
| mean along-wind speed | 0.03769 units/s |
| speed peak-to-peak | 55.8% of mean |
| **r(speed, breeze(t))** | **+0.9081** |

**Sky layer** (frozen clock; the probe recompiles the material once with the
gust's gain and phase on probe-owned uniforms, so the two frames differ by
exactly one thing):

| | |
|---|---|
| determinism control — same frozen state, re-rendered | MAE **0.0000**/255, max Δ **0** |
| gust OFF → ON at the shipped 0.28, same state, same phase | MAE **0.5083**/255, max pixel Δ **152**/255 |
| gain sweep K = 0.28 / 5.0 / 40 | MAE 0.508 / 0.815 / 0.728 (saturating) |
| phase, sweeping the wind over 10.4 s | r(screen Δx, breezeInt) **+0.76**, r(screen Δy, breezeInt) **−0.77** — up-and-downwind along the breeze's screen projection |
| amplitude, from the shipped buffers + the shipped `carry` read out of the live compiled shader | per-particle speed 0.148–0.655 (mean 0.341) units/s; offset **0.091 units peak / 0.182 ptp = 14.0 px at 1440×900**; `d/dt` = ±38% speed surge |

Against a literal zero noise floor, a 0.5083 MAE with a 152/255 peak is not
ambiguous. Note why phase correlation could give the *phase* but not the
*magnitude*: the cloud spans 5–24 units, so one world-space offset projects to
5–26 px — a depth-dependent shear, not a rigid translation, and the
correlation peak smears rather than moves.

### Measured

- **Draw calls 860 → 860.** Triangles 565,702 → 565,702; points 169,086 →
  169,086; programs 39 → 39. Nothing was added to the graph; one attribute was
  repurposed (`aCycle.w`, tone → carry), one added (baked colour, 3 floats),
  two uniforms deleted (`uHeatA`/`uHeatB`), one added (`uWind`). Net +2 floats
  per particle = **+41.6 KB**.
- **Frame (headless, 1280×800 @dpr1, 160 frames at the Final rest, same probe
  both runs):** p50 **19.2 → 18.2 ms** (52.1 → 54.9 fps); p90 22.1 → 21.0;
  p99 23.9 → 24.2. The honest reading is *no worse*.
- **Hero shed at the Final rest:** mean fog factor 0.159 → **0.925**, mean
  output 0.109 → **0.447**, particles above the visibility floor
  2,206 → **4,200 of 4,200**. Against 0.518 at the opening, the end now sits
  at **86%** of the opening's per-particle presence — the remainder being
  genuine extra distance. At p 0 it is untouched: fog [7, 20], output 0.5175.
- **Reveal purity (D16):** scrub 0.78 → 1.0 → 0.78, 13 stops each way.
  `uAmount` hysteresis **0.000000 at every stop**; `uPull` hysteresis
  0.000000 except 0.0023 / 0.0018 at p 0.85 / 0.87, where the camera itself
  had not finished settling (`uPull` is a pure function of camera x);
  shed-fog hysteresis **0.000** at the rest and at both ends, 0.018 of a
  42-unit ramp at p 0.87. **Dark at arm holds**: at p 0.82 and 0.84 the
  chapter is armed at `uAmount` 1.0 with `uPull` **0** and the hero's shed
  still on [7, 20] — the fog handover cannot begin before the surface pierce.
- **Poke:** cap taps on a field body fire the shed (`shedLive` 0 → 11 → 22 →
  33 → 44 across four taps) and ring the clone down (`clonesRinging`
  0.38–0.90 deg). No errors.
- **Console:** info-only over a full 0 → 1 → 0 ride (2 info lines, 0 warnings,
  0 errors). Scrub run likewise clean.
- **Gates:** `capture.py --check` **PASS, worst MAE 0.00/255, all ten**.
  `mission@*`, `inspire@*`, `connect@*`, `owned@*` byte-identical in git (not
  in the commit's file list at all); `final@*` re-shot same-commit with
  manifest provenance. Compositions reviewed at 1440×900 and 375×812.

### Residuals

- The sky's upper-left is darker than the shipped starfield. Deliberate — the
  starfield was the complaint — but the band share (`highBand < 0.46`, was
  0.60) is the one knob if Hannah wants more air back, and it costs nothing.
- **The hero's own BODY is still on the hero page's 7 → 20 fog.** At 14.5
  units that puts it at fog factor 0.42 while its shed now sits at 0.93. It
  does not read as wrong (the body is far brighter per pixel and it is
  supposed to hold the frame), but it is the same inversion `clones.js` names,
  one level up. If the hero body is ever put on the world's ramp, these two
  numbers want re-tuning together, not separately.
- One global wind means a spore does not answer the body it came from.
  Measured at ~1 px from the rest camera, so it is invisible today; if a
  future camera ever comes close to a field body, revisit.
- `sky.js` imports `makePointsMat` and does not use it. Pre-existing at HEAD,
  left alone rather than churn a look-dev commit.
- The failed centroid/phase-correlation wind probe is kept in the scratchpad
  as a record of the control that killed it. It is not a usable gate; the
  A/B is.

---

# 2026-08-07 — The sparkles, and the root canopy

Two reports on the epilogue, one commit apart in Hannah's reading of it:

> "weird little sparkles drop from the non-primary mushrooms in the final view,
> please fix that."

> "in the final section, can you make it so all mushrooms have roots like the
> main ones have — it should feel like they all exist on this giant
> interconnected canopy similar to the one that surrounds the main one. It
> should be an extension of the one that surrounds the main mushroom, like
> literally a canopy."

---

## 1. The sparkles

### What they were

`journey/chapters/final/shed.js` — the POKE's spore shed, and specifically the
one term of organism's integrator that this pool had no business running.

The diagnosis is not a judgement call. Firing a synthetic poke at ring member
4 and tracking every released particle for 1.2 s:

| | particles | falling in world | moving down on screen | mean world Δy | mean screen Δy |
|---|---|---|---|---|---|
| **before** | 50 (4 pokes, members 4/5/0/8) | **50** | **50** | −0.083 | **+7.94 px** |
| **after**  | 39 (same 4 pokes, same members) | **0** | **0** | +0.017 | **−1.64 px** |

The drift the wind supplies over the same 1.2 s is 0.02–0.06 units, sideways.
So the fall was not a component of the puff's motion — it *was* the puff's
motion, at four times the wind's contribution and in the one direction the eye
reads as wrong.

The term is `- 0.0026 * (1 - w) * k`, `w = age / 1.6`, and it is
`organism/spores.js`'s own, correct there: **the air under a cap is still**, so
a fresh spore drops clear of the gills before the wind has any of it. `w` is
that handover, and every term it gates — the fall, and the `0.45 + 0.55 w` ramp
on the carry — is a statement about being inside the hymenium.

`070892c` brought the integrator across whole (rightly: the previous complaint
was that a poked field body *threw* its spores) but the same commit moved the
release **seat** out to `u = 0.92 + rand()*0.20` of the rim — a band straddling
and outside the margin — because the Final rest camera stands ~11° above every
field body's rim plane and a puff seated where the hero seats one is emitted
into a box the visitor cannot see into. That judgement is still right.

But it means these particles are born **where a hero spore arrives** — clear of
the gills, in open air past the margin — and then run the handover again, in
full view. The hero's own fall is hidden behind its cap for its whole 1.6 s;
this one was the first thing you saw. Same law, wrong moment of a spore's life
for the place it is seated.

### The fix

A shed particle is born at the END of the handover: `w = 1` identically. The
fall term is `1 - w = 0` and vanishes; the carry ramp saturates; the two
turbulence modes run at full. Nothing is scaled and nothing is retuned — the
seat, the release velocity, the gust, the size draw, the tone, the twinkle, the
DOF band and the life window are untouched, and it is exactly what
`organism/spores.js` does with a spore that has already dropped clear, i.e.
every spore in the hero's plume outside its own margin.

**The main model is unaffected, and measured so.** `organism/*` is not in the
diff. The hero's own poke shed still falls at its own rate through its own cap
— 28/28 particles, mean world Δy −0.092, +10.4 px on screen, before *and*
after. Its ambient 4,200-dot drift is the same code path. `mission@*` is
byte-identical on disk and MAE **0.00/255** in the frozen check.

---
