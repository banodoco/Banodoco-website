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

## 2. The root canopy

### The reading it has to produce

Not sixty small root systems standing near each other. That answer was
available and cheap — `ring.js` already gives every body a couple of §8 ground
stubs — and it is wrong twice: per-body roots say *sixty organisms*, and
scattering more short strokes across the floor is exactly the countable-stroke
carpet the declutter round spent a whole pass deleting.

So: **one network, and its structure carries the reading.** Every fruiting body
in the chapter is a NODE of a single connected graph and the strands are its
EDGES. A body does not have roots; the canopy has bodies.

### Construction (`journey/chapters/final/canopy.js`, new)

**Nodes — 169.** Node 0 is the HERO's own stipe base at the world origin. Then
every body `ring.js` places, published through a new `ring.seats` (73 in all:
the hero, 9 ring members, 43 field bodies, 20 far hints), seated at its own
soil point with its own scale. Then **96 waypoints** — the network's own
vertices, authored about the rest gaze out to the hint band, on kept soil,
minimum-spaced 1.45 so they never clot. A graph over bodies alone is a
constellation; the waypoints are what make it a fabric (OWNED's `substrate.js`
§WEB makes exactly this argument for exactly this reason).

**Edges — 413**, in three passes:

1. **A Euclidean minimum spanning tree, Prim's, started at node 0.** This is
   the only structural guarantee the file makes, and it is the one that
   matters: exactly ONE component, so there is no island anywhere in the field
   and no body standing on ground that leads nowhere — and it is rooted at the
   hero, so every strand traces back to the organism the visitor has been
   looking at all ride. "An extension of the one that surrounds the main
   mushroom" as a data structure, not as a resemblance. O(N²) on 169 nodes:
   ~29k comparisons, once, at build.
2. **Short nearest-neighbour cross-links** (capped at 4.6 units). A tree has no
   cycles and a network with no cycles reads as drainage; these are what make
   it mesh.
3. **Body-to-body links.** Every body also reaches its nearest neighbouring
   BODY directly whenever one is within 7.2 units, so the frame carries
   unbroken foot-to-foot runs — the connection Hannah's sentence is about.

**Strands.** Each edge is CONNECT's ground tendril: a meandering surface run,
4–14 segments, two harmonics of lateral wander windowed to zero at both ends so
the strand meets its nodes *exactly*. The first cut used a third of the
amplitude and one harmonic and read as a **triangulation** — long straight
chords meeting at vertices, a diagram of a network rather than a network; the
fix is CONNECT's own rule ("no straight runs, no right angles"). Each spine
strand also throws 1–2 **hairlines**, three segments, dying out at an oblique
angle — the hero's §8 mycelium threads, and what stops the canopy reading as a
wireframe of itself. Every strand leaves each node at that node's own seat
radius, so it starts at the edge of the stipe's footprint and not inside the
flesh.

**Junctions.** A glint at every wired node, sized by degree. **8 convergence
hubs** — the house's hub grammar (CONNECT's radial spokes into a bright core,
OWNED's starbursts) — placed only where the graph itself already converges
(degree ≥ 5, inside 26 units), so they are punctuation, not furniture. And **54
soft pools**: broad dim warm light on the network's own junctions, because the
declutter round's finding was that a floor made of strokes is a carpet you can
count and a floor made of broad soft light is ground. Most of the canopy's mass
is there rather than in the line batch.

**Terrain law.** Every vertex at `groundY(x, z) + 0.020–0.050`, the law CONNECT
and the hero's own §8 web obey. A body is placed at `gy = groundY(x, z)`, so
bodies meet the canopy at their feet **for free, at every body, with no
per-body adjustment** — nothing floats and nothing sinks. Every sample is
tested against `cutVal()`; a strand that would cross the lip straightens first
and is dropped only if the straight run still leaves the soil (**0 dropped** as
built). The cutaway wedge stays void.

**Levels and depth.** Strand material opacity 0.62 against the terrain lip's
0.72 and the ring's 1.15; brightest strand tone 0.30 against the lip's 0.55.
Every tone carries a distance luminance `1 − 0.66·smoothstep(5, 34, d)` — the
field's own `cloneLum` device, re-banded for a floor that runs from the hero's
foot to the hint band at 46 units — and the shared strand shader carries the
chapter's fog uniforms, so the canopy recedes with everything else instead of
laying a bright mat under the frame. The field's bodies stay the subject.

### Reveal wiring

Camera-pure, on the chapter's existing law, with **no per-frame cost at all** —
`canopy.js` has no `update()`. Every vertex carries `aReveal` on the same
`uPull` the bodies kindle on:

- A body seat's threshold is its own body's, **less `CANOPY_LEAD = 0.04`**, so
  the ground under a mushroom is already alight when the mushroom comes up. The
  canopy puts the body there, not the other way round.
- A waypoint takes an inverse-distance blend of its three nearest seats, so the
  ground between two members lights as those members light, not on a clock.
- An edge's segments LERP between their two endpoints' thresholds, evaluated at
  each segment's own midpoint. At ~0.5 world units a segment, the step is
  15–30× narrower than the shader's own 0.16 reveal width, so what a viewer
  sees is a **soft front running down the strand** from the body that kindled
  first toward the one that has not — the front the bodies already use, seen in
  the ground.

Measured, 49 stops each way over p 0.845 → 0.965 → 0.845:

- **Hysteresis 0.00000000** across every opposite-direction adjacent pair —
  canopy luminance is single-valued in `uPull`, so a reverse scrub retracts it
  exactly as it grew.
- **0 non-monotone steps** sorted by `uPull` — nothing self-ignites.
- **Dark at arm**: `uAmount` 0.000000 on every frame the chapter is not
  visible; saturated at the rest and at the end hold.

### Budget

Measured at the Final rest, 1440×900 @dpr1, same probe both runs, canopy
stashed out for the "before":

| | draw calls | line primitives | points | triangles |
|---|---|---|---|---|
| before | 426 | 445,004 | 85,054 | 282,053 |
| after  | **428** | **448,074** | **85,285** | 282,053 |
| delta  | **+2** | +3,070 | +231 | 0 |

The line delta is exactly `canopySegs` and the point delta exactly
`canopyPts` — the whole canopy is **two draw calls**, one merged `LineSegments`
and one merged `Points` on the chapter's own two shared materials, however many
thousand segments it holds. No new program: both materials are `makeStrandMat`
/ `makePointsMat` from `world.js`.

Frame time, in-process A/B (visibility toggled every 1.4 s for 12 s so drift
and thermals hit both arms equally): p50 **26.0 → 27.1 ms**, p90 42.5 → 44.9,
mean 32.66 → 31.63. Same class; the mean is inside the noise in the *other*
direction. Cross-run whole-process p50s: before 41.9 / 36.1, after 42.8 / 41.4.

### Gates

- **Reveal (D16):** above — 0 hysteresis, 0 self-ignition, dark at arm.
- **Console:** full 0 → 1 → 0 ride, 450 frames including four pokes on four
  different non-primary bodies (members 4, 5, 0, 8): **0 errors, 0 warnings, 0
  non-finite values** in any chapter uniform, camera component or shed
  position. `shedLive` 0 at retire.
- **Compositions** reviewed at 1440×900, 1280×800 and 375×812, at the FINAL
  rest and at the end hold. The copy block sits over the cutaway void and stays
  legible at all three.
- **`capture.py --check` PASS, worst MAE 0.04/255.** `mission@*`, `inspire@*`,
  `connect@*`, `owned@*` **byte-identical on disk** (0.00, 0.00, 0.00,
  0.00/0.04 — the 0.04 is this machine's frozen-frame noise and the files are
  not in the diff at all). `final@*` legitimately moved (1.57 / 1.86 before the
  re-shoot) and is re-shot in the same commit with manifest provenance.
- **No regression** to the per-body deformation (66d1bed), the entry draw-on
  and shell fade (070892c), the no-hover rule (0d9bcbd), the particle match
  (836d373) or the conservation floor (b2c9584): none of those files is
  touched, and `ring.js`'s only change is publishing seats it already computed.
  Camera keys unchanged.

### Residuals

- **The hero's own §8 ground web is still dimmed to a whisper by
  `index.js`'s `heroDim`** (KEEP 0.10 on the web and mycelium classes), which
  is right for what that pass was fixing but means the join at the hero's foot
  is carried by the canopy alone rather than by two networks meeting. It reads
  well — the canopy IS the ground language at this camera now — but if Hannah
  ever wants the hero's own crown to answer the field's, those KEEP values are
  the knob, and they should move *with* the canopy's levels, not separately.
- **The far half of the canopy is sparser than the near half** by construction
  (waypoint distance is drawn `pow(rand, 1.15)` toward the camera, and the
  distance luminance floors at 0.34). Deliberate — density out there would
  fight the field's own tier ladder — but it does mean the canopy thins before
  the bodies do.
- **The graph is rebuilt from scratch every boot.** It is deterministic
  (`makeRng(0xCA0BE)`, and `ring.seats` is a build product of an already
  deterministic placement pass), and Prim's on 169 nodes is ~29k comparisons,
  so this has never shown up in a load profile. Worth knowing if the field's
  body count ever grows by an order of magnitude, since the MST is O(N²).
- **Hub placement is a degree test, not a composition.** Eight is what the
  graph happened to offer inside 26 units; if the waypoint seed ever changes,
  the count and the places move. That is the honest trade for not authoring
  them in the rest frame, and it is the right one while they are punctuation.

---

## 2026-08-07 — Owned → Final: one withdrawal, not a fly-past and a whip

**Status: SHIPPED (goldens byte-identical — nothing built moved).** Hannah,
on the leg from the Owned rest into the Final rest: *"the scroll from that to
the previous section feels a little bit weird — it feels like it should be
zooming out or reversing, but it doesn't… like a weird jumpy thing. What if
it zoomed out and went up instead?"*

### The measured fault

Drift-aware scrub, 261 samples over p 0.70–0.96, both aspects, `?steady=1`,
sampling actual `journey.progress` rather than a requested grid (the requested
grid drifts up to 0.0019 — enough to alias a rate peak).

The two rests **mandate a gaze reversal**. The Owned rest looks −X (yaw
−72.9°, straight up the root crown); the Final rest looks +X (yaw +68.3°, back
across the ring chord). That is 141.2° of turn that has to be spent somewhere,
and where it was spent was the whole problem:

| | shipped |
|---|---|
| yaw complete by p 0.878 (surface is p ~0.858) | **70%** |
| yaw peak rate, landscape / portrait | **1334** @ p 0.911 / **1378** deg per unit p |
| optical flow peak, 1440×900 | **21,848 px/p** @ p 0.912, against ~12–13k mid-leg |
| optical flow into the rest (p 0.886 → 0.906) | 12,986 → 15,437 — **rising** |
| pitch excursion | +10.8° @ 0.866 → −8.6°, peak **602 deg/p** |
| fov across the first key | 58 → 54, i.e. **magnifying 8.7%** while the camera closed |

So the camera flew forward through the colony looking where it was going, and
then **whipped sideways by 42° exactly while the field was revealing**, over
budget (~1.2k) and accelerating into the rest. The reveal was being delivered
by a pan. That is the "jumpy thing": a pan reads as being dragged across a
scene, never as withdrawing from one.

Two supporting faults fell out of the same measurement. The ring centre's
on-screen speed dropped to **45 px/p** with 4 near-frozen samples — the
composed-frame fault from the Inspire→Connect leg (e95820a), where orbit and
gaze fall at the same rate and the subject stalls on screen. And p 0.83–0.87
was a near-black frame with nothing in it.

### The re-key (constraint tier (a) — gaze and fov only)

`owned/leg.js` samples the director's **position** spline over p 0.660–0.872
for every clearance rule, and `final/index.js`'s reveal front is
`pullOf(camera.position.x)`. The spline is global Hermite with non-uniform
Catmull-Rom tangents, so a key's influence reaches past its own interval: the
tangent at p 0.878 is `(pos[0.905] − pos[0.845])/h` and shapes the segment
0.845–0.878, which is **inside** the sampled window. Checked key by key,
**no position key between the two rests is free** — tier (b) does not exist
here. So positions were left bit-exact and only `tgt` and `fov` moved, on
five keys: owned t 0.728 / 0.848 / 0.98 and final t 0.1867 / 0.3667. Both
rests untouched.

The same 141.2° is now spent **early and underground**, where the frame is a
homogeneous network and a turn reads as turning to look back the way you came.

| metric (p 0.725→0.925) | before | after |
|---|---|---|
| yaw complete by p 0.878 | 70% | **91%** |
| yaw peak rate, landscape | 1334 @ 0.911 | **1070** @ 0.795 |
| yaw peak rate, portrait | 1378 @ 0.911 | **1051** @ 0.795 |
| yaw rate sign flips | 1 | **0** |
| pitch peak rate, landscape / portrait | 602 / 356 | **288 / 164** |
| pitch excursion | 19.4° | **7.6°** |
| fov peak rate, landscape | 167 | **114** |
| fov rate sign flips, portrait | 2 | **0** |
| optical flow peak, 1440×900 | 21,848 @ 0.912 | **12,876** @ 0.762 |
| optical flow peak, 375×812 | 11,988 @ 0.911 | **7,152** @ 0.761 |
| flow into the rest (0.886 → 0.906) | 12,986 → 15,437 (rising) | **6,913 → 5,796 (falling)** |
| hero cap behind the camera | p 0.748–0.841 (94/200) | **0.747–0.807 (61/200)** |
| crown behind the camera | 0.752–0.845 (94/200) | **0.753–0.804 (52/200)** |
| ring-centre screen speed, min | 45 px/p (4 frozen samples) | **281 px/p (1)** |
| roll, everywhere, both aspects | 0 | **0** |

The leg now decelerates into the rest instead of accelerating into it, which
is what "settling" means measurably. And the reveal reads the way Hannah
described it: you surface at p 0.866 **at the foot of the very mushroom whose
roots you were under**, it stands full-height in frame at 0.890, and then it
recedes into the field by the rest — the pull-back is what reveals the others.
The old p 0.83–0.87 dead frame now carries the receding colony and the
soil-line diagonal.

### Reveal-law re-verification

Positions are bit-exact (position digest identical to 6 dp at all 11 probe
points), so the reveal front `pullOf(camera.position.x)`, the rise mask, the
T3/T4 soil crossings (`seams.js` reads `camera.position` only), the murk
windows and the fog ramps (pure in p) are **unchanged by construction, not by
inspection**. What changed is only which part of the front the lens sees.
Checked anyway: dark at arm (p 0.812, chapter armed at 0.80 — nothing above
ground has ignited), no self-ignition, canopy and bodies still kindle from the
near ground outward, and reverse scrubbing reproduces `poseAt(actual p)` to
3.6e-4 in **both** directions (3.66e-4 forward, 3.62e-4 reverse — symmetric,
so no hysteresis), with the reveal front matching to 1.2e-4.

`capture.py --check`: all 10 goldens PASS, worst MAE 0.04/255 against
warn 0.50 / fail 1.00, and **no capture file is in the diff** — `owned@*`,
`final@*` and `mission` are byte-identical on disk, which is the proof that
nothing built moved. Console clean over a full 0→1→0 ride plus six fast
scrubs through the leg.

### Residuals

- **The path still passes within 0.82 units of the root crown at p 0.751.**
  Distance to the crown falls 1.85 → 0.82 before growing to 15.37, and the
  crown's apparent scale *rises* at up to +103 per unit p around p 0.746 —
  a genuine push-in inside the pull-back, and the reason the crown leaves the
  **top** of the frame 26 thousandths of p after the rest instead of receding
  from it. This is pure position and cannot be re-aimed away: a gaze that
  tracks a point you fly past has unbounded angular rate at closest approach.
- **The camera sinks before it rises**: y goes −1.180 at the rest → −1.403 at
  p 0.778 → +2.73. Hannah asked for "up"; the first 27% of the leg is down.

Both live inside p 0.660–0.872, which `owned/leg.js` samples for every
clearance rule, so fixing them means re-pathing the corridor the colony was
grown around — an Owned restage with a re-shot `owned@*`, not a camera re-key.
Worth doing deliberately if the push-in still reads once the whip is gone; it
was not worth spending the just-landed root-crown staging (81a9861, eea3ffe,
696e95d) on speculatively inside this pass.

---

## 2026-08-07 (pass 2) — Owned → Final: the push-in was in the path, not the aim

**Status: SHIPPED (`owned@*` and `final@*` re-shot — the colony legitimately
moved).** Hannah, on the same leg, asking for the larger job: *"what if the
actual effect was more of a reverse and out to show the mushrooms?… what if it
zoomed out and went up instead?"*

Pass 1 (`1d0f5e0`) fixed the WHIP by re-aiming gaze and fov with every position
key held bit-exact, and closed by documenting two faults it had proved it could
not reach. This pass is those two faults.

### The two faults, re-measured

Drift-aware scrub sampling actual `journey.progress`, plus an analytic route
through the same key list that reproduces `director.poseAt` to **1.8e-15 in
both aspects** — so the before/after tables below are exact, not sampled
approximations, and the "before" path could be measured without reverting
anything.

| | before (L) | before (P) |
|---|---|---|
| distance to the root crown | 1.852 → **0.820 @ p 0.751** → 15.373 | 2.042 → **0.695 @ p 0.753** → 16.705 |
| samples where distance DECREASES | 53 | 56 |
| worst closing rate | **−62 /p** | **−74 /p** |
| crown apparent scale: rising samples | 52 | 56 |
| max scale rise | **+44,677 /p** | **+54,488 /p** |
| the crown leaves frame | **out of the TOP, p 0.7325** | **out of the TOP, p 0.740** |
| its size when it leaves | **8% BIGGER than at the rest** | **37% BIGGER** |
| camera height | −1.180 → **−1.403 @ p 0.7785** → 2.73 | −0.964 → **−1.034 @ 0.7625** → 4.232 |
| samples where y SINKS | 107 | 75 |

So the leg asked to "zoom out and go up" spent its first stretch getting
**closer and lower**, and the subject left the frame by going over the lens.

### Why re-aiming could never have fixed it

The Owned rest sits at x +1.73, the crown at x +0.06, the Final rest at
x −14.72. **The crown is between the two frozen rests**, so the x-gap must pass
through zero. The shipped path ran almost straight down the x axis, so when the
x-gap collapsed the entire distance collapsed with it — a fly-past. A gaze that
tracks a point you fly past has unbounded angular rate at closest approach,
which is exactly why pass 1's constraint tier (a) could not touch it.

### The re-path

**Distance lost in x has to be banked in z before the crossing, and banked
permanently.** Two candidate families were built and measured against the real
spline:

- **A straight dolly back along −gaze (+X)** — the most literal reading of
  "reverse". Measured and **rejected**: it buys distance and then gives all of
  it back on the way past. The crown re-magnified at +50/p over p 0.752–0.767
  and a second closest approach appeared where the first one had been (36
  decreasing samples, worst rate −29). Backing up is transient; only an offset
  the path never gives back is permanent.
- **A lateral swing in z** — kept. z ends at +2.70 at the Final rest anyway, so
  the leg spends z the world already had, only earlier: out to **3.11** while
  the x-gap closes, then home to the frozen 2.700, on **one hump** (a single
  sign change in z across the whole leg).

One key was **added** at owned t 0.60 (p 0.750, `withdraw`). The rest's `hold`
forces a zero tangent, so with nothing inside the first 0.025 of p the leg left
the rest already committed to the old run; this key is what lets the swing start
while the camera is still close enough for it to matter.

| key (global p) | shipped pos | re-pathed pos |
|---|---|---|
| 0.725 `owned-rest` | (1.730, −1.180, 0.560) | **frozen** |
| 0.750 `withdraw` | — | **(1.200, −1.16, 2.250)** ← new |
| 0.782 `owned-rest-drift` | (−3.300, −1.40, 0.350) | (−1.200, −1.12, 3.000) |
| 0.812 | (−5.300, −1.02, 0.780) | (−4.600, −1.00, 3.100) |
| 0.845 | (−7.700, −0.20, 1.250) | (−7.700, −0.40, 2.950) |
| 0.878 | (−10.200, 1.05, 1.800) | (−10.200, 1.05, 2.850) |
| 0.905 | (−12.300, 1.75, 2.250) | (−12.300, 1.85, 2.780) |
| 0.925 `final-rest` | (−14.72, 2.73, 2.700) | **frozen** |
| 1.000 `final-recede` | (−17.73, 3.95, 3.260) | **frozen** |

**x at the three reveal-bearing keys is bit-exact** (−7.700 / −10.200 /
−12.300). final's reveal front is `pullOf(camera.position.x)` and its rise mask
is `riseOf(` the same `)`, so holding x holds the reveal schedule.

**Pass 1's gaze is carried, not re-authored.** Every moved key keeps pass 1's
yaw and pitch to 0.1° and its gaze length; only the eye's place moved. The
tangent coupling pass 1 identified was honoured by evaluating every candidate
through the real global Hermite rather than segment by segment.

**The y schedule is the shipped one with the dip taken out, not a steeper
climb.** Lifting y harder underground was measured and rejected: portrait's own
`rise` offset stacks on top, and it pierced the soil at p 0.817 with final's
rise mask only **11%** open, against 58% shipped. Held down, portrait pierces at
p 0.829 with the mask **69%** open — better than shipped.

### After

Both faults are gone, and gone **exactly**: at 20,001 samples per aspect
(step 1e-5 in p) over p 0.725–0.925 there are **zero** negative distance steps,
**zero** negative height steps and **zero** positive x steps. Not "small" —
none.

| | before L | after L | before P | after P |
|---|---|---|---|---|
| distance minimum | 0.820 @ 0.751 | **1.852 @ 0.725 (the rest)** | 0.695 @ 0.753 | **2.042 @ 0.725** |
| distance-decreasing samples | 53 | **0** | 56 | **0** |
| height minimum | −1.403 @ 0.7785 | **−1.180 @ 0.725 (the rest)** | −1.034 @ 0.7625 | **−0.964 @ 0.725** |
| sinking samples | 107 | **0** | 75 | **0** |
| crown scale rising samples | 52 | **0** | 56 | **0** |
| max scale rise | +44,677 | **−24 (always falling)** | +54,488 | **−17** |
| crown leaves frame | TOP @ 0.7325 | **RIGHT @ 0.7635** | TOP @ 0.740 | **RIGHT @ 0.7375** |
| its size when it leaves | 8% bigger | **31% smaller** | 37% bigger | **9% smaller** |
| crown NDC y, rest → exit | 0.92 → 1.0 (over the top) | **0.92 → 0.72 (down into frame)** | 0.79 → 0.99 | **0.79 → 0.75** |
| yaw total / peak | −141.2 / 1070 | −141.2 / **1064** | −139.7 / 1051 | −139.7 / **1042** |
| yaw sign flips | 1 | 1 | 1 | 1 |
| pitch excursion / peak | 7.8 / 288 | 8.1 / 288 | 5.1 / 164 | **4.3** / 164 |
| fov peak | 114 | 114 | 110 | 110 |
| optical flow peak (median px/p) | 43,305 @ 0.8025 | **26,016 @ 0.7925** | 30,445 | **19,597** |
| flow into the rest | 9411 → 8587 (falling) | 7390 → 6687 (falling) | falling | falling |
| ring-centre min screen speed | 89 (1 frozen) | **146 (0 frozen)** | 70 (1) | **93 (1)** |
| path speed peak | 178 @ 0.913 | **173** | 194 | **189** |
| roll, everywhere | 0 | **0** | 0 | **0** |

The crown now **recedes into the frame** — NDC y 0.92 → 0.72, shrinking 31% —
before the turn carries it out the right edge, where it used to be gone over the
top by p 0.7325 having grown 8%. That is the whole of what Hannah asked for,
stated as a measurement.

### The rebuilt colony

`owned/leg.js` samples the position spline over p 0.660–0.872, so the colony
regrew around the new corridor. Same scan, same sampling, shipped vs re-pathed:

| | shipped | re-pathed |
|---|---|---|
| min clearance, geometry → lens path | 0.095 @ p 0.742 | **0.129 @ p 0.694** |
| sampled vertices within 1.0 unit of the path | **1060** | **117** (−89%) |
| within 0.5 unit | **201** | **15** (−93%) |
| objects / total verts | 31 / 88,360 | 31 / 88,022 |
| samples above ground | 14 (0.14%) | 14 (0.14%) |
| bbox | x[−39,39] y[−16.31,5.62] z[−39,39] | identical |
| voids / hubs / primaries / secondaries / skirt / net nodes | 5 / 5 / 66 / 292 / 340 / 430 | identical |
| portraits: planes / routable / strand curves | 16 / 16 / 106 | identical |
| fan / lid / crown verts | 18,684 / 7,440 / 708 | identical |
| fill / hair / web verts, glints, netLinks | 16,392 / 23,400 / 14,360, 563, 1436 | 16,296 / 23,160 / 14,370, 551, 1437 |

The structure is the same structure — every count that is authored rather than
clearance-driven is **identical**, and only the clearance-driven layers moved,
which is the exact signature of "same rules, new corridor". Nothing collapsed,
nothing floats (the above-ground fraction is unchanged), and the extent is
identical to the decimetre.

The corridor is also **measurably cleaner than the one it replaced**: 89% fewer
vertices within a unit of the lens, 93% fewer within half a unit. The closest
approach is now at p 0.694 — inside the dive, a stretch this pass did not
touch. The old path was the one crowding geometry, because it flew through the
densest part of the root mass; the new one swings out of it.

### Reveal-law re-verification

The reveal is camera-pure, so re-pathing changes what reveals when. Checked on
the live build, with real frames between jumps (the uniforms are ticked by the
animator, not by `scrollTo`):

- **Dark at arm.** final arms at p 0.80. Measured there: `uPull` 0,
  `uPullRaw` −0.796, rise mask 0, `group.visible` false until 0.797 and
  `uAmount` easing from 0 — the chapter switches on with **every reveal driver
  at exactly zero**. It is still 0 at p 0.81, where the shipped path had already
  opened the mask to 0.105.
- **No self-ignition.** `uPull` stays exactly 0 until the camera reaches
  x −8 (p ≈ 0.850), then sweeps 0.047 → 0.123 → 0.172 → 0.294 → 0.393 → 0.539
  → 0.760 → 1.0: monotone, single-direction.
- **Every fade completes underground.** The rise mask reaches 1.0 at p 0.845
  with the camera still 0.40 under the soil; the pierce is at p 0.8555. Margin
  0.011 against the shipped 0.0095.
- **Kindling order.** Lit materials climb 271 → 287 → 293 → 303 → 312 → 321 →
  381 → 391 across the leg — progressive, near ground outward, no step.
- **Soil / murk windows.** The path at **p ≤ 0.725 is bit-identical** to the
  shipped path (max difference exactly 0 over 4,001 samples; the two paths first
  differ at p 0.72525). The rest key's `hold` zeroes its tangent, so the dive,
  the T3 crossing at p ~0.693, the 0.692–0.712 murk window and `CONNECT_HOLD_HI`
  0.705 are unchanged **by construction**, verified numerically.
- **Reverse scrubbing.** Over a forward and a reverse ride of the leg, camera
  position and target reproduce `poseAt(actual p)` with **max error exactly 0**
  in both directions; fov matches to 9.7e-4, which is the director's own
  `> 0.001` fov write deadband and is symmetric between the rides. The residual
  forward-vs-reverse difference (0.09 in position) is entirely accounted for by
  scroll quantisation moving the actual p by up to 1.1e-3 between rides — the
  pose is a pure function of p and has no hysteresis.
- **Fog** is pure in p and unchanged: near 7 → 13.75, far 20 → 60.3, monotone.

`capture.py --check` and the re-shot references are recorded in the commit.
Console clean over a full 0 → 1 → 0 ride plus six fast scrubs through the leg in
both directions; the only console entry is the browser's own `/favicon.ico` 404,
which predates this work and is not requested by page code.

### Residuals

- **The crown still leaves by the side rather than shrinking to a point.** It
  has to: the two rests mandate 141.2° of turn, and pass 1 established that the
  turn must be spent early and underground or it reads as a whip over the
  reveal. The turn carries the crown out of frame at p 0.7635 whatever the path
  does. What changed is that it now leaves *smaller and lower* than it was at
  the rest instead of *bigger and over the top*.
- **The terminal speed bump at p 0.913 survives** (173 units/p, against 178
  shipped). It is a property of the frozen `final-rest` hold: 2.4 units of x in
  the last 0.020 of p with a zero end-tangent. Reducing it means moving the
  p 0.905 key's x, which would advance the reveal front near the rest. Left
  alone; it is marginally better than shipped and the optical flow — the thing
  actually seen — decays into the rest in both aspects.
- **Portrait keeps one near-frozen ring-centre sample** (93 px/p, against 70
  shipped). Same sample as before this pass, improved but not removed.

---

## 2026-08-09 — The transit pass: the passage is the composition too

**Status: SHIPPED (`final@*` re-shot — the cutaway wedge and colony detail
legitimately moved; all other goldens byte-identical on disk).** Hannah, on
the Owned→Final leg: *"halfway through the transition you see a lot of janky,
half-complete kind of things… a lot of broken lines that are visible halfway…
it shouldn't feel like you're seeing the back of a world, the unfinished part
of a closet."* And on the epilogue itself: *"some loose edges in the Final
section — stuff hanging off the edge of the fairy ring."*

She was right, and the root cause is one sentence: **everything she was
looking at was authored to be read from the rest frames, and 8b71687's
re-path put the camera INSIDE it.** The colony under the fairy ring was tuned
to be glimpsed through the cutaway from 12+ units away; the leg now crosses
it at 1–3 units (p ~0.80–0.855), where texture resolves into its parts.

### The inventory — measured by toggling one system at a time at p 0.825

Dense frozen rides (24 frames, p 0.72→0.955, 1440×900 + 375×812) localised
the jank to p 0.80–0.855 plus the rest's lower-left wedge; per-system
visibility toggles through a CDP probe then attributed every artifact. The
OWNED side of the passage (its web, fan, portraits) needed nothing — with
FINAL hidden, every frame through the dive reads as coherent web.

1. **Hyphae read as broken dashes** (p 0.80–0.85, whole frame;
   `terrain.js` §3). 380 scribbles of 2 pure-gauss segments each — at 12
   units, texture; at 2, disconnected floating scratches. This was the bulk
   of the "broken lines".
2. **Rhizomorph cords read as tram rails** (p 0.80–0.85, mid-frame;
   §4). The double stroke was a CONSTANT vertical 0.055 offset — thickness at
   a distance, two machined parallel rails up close — over 13 visibly kinked
   segments.
3. **The growth front read as a row of dropped stitches** (p 0.81–0.84,
   crossing mid-frame; §5). 72 isolated vertical ticks along the arc with
   nothing joining them.
4. **The soil slab read as torn cardboard overhead** (p 0.80–0.85, top
   third; §0). The occluder is fog-colored so the KEPT side reads as haze
   from above — but from BELOW, where the whole underground crossing looks
   at it, that constant color silhouetted its irregular boundary against the
   black sky as floating angular plates. On mobile its near edge cut the
   frame as a hard bright-edged beam.
5. **The cut face read as hanging wires** (the rest frame's lower-left,
   and close-up at p 0.865–0.895 frame-left; §2). The 60 "face drops" were
   single dead-straight segments at near-constant tone — a fringe of
   parallel cables dangling off the lip into the void. This is the "stuff
   hanging off the edge of the fairy ring", verbatim.
6. **Stranded floaters in the open void** (rest frame lower-left; §3's
   cull). Hyphae survived the void cull at 15% ANY distance past 3.4 units
   from the face, so bright dashes floated disconnected in open black.

### What changed (`final/terrain.js`, + one uniform through `final/index.js`)

- **Hyphae are filaments now, not scribbles**: 300 strands of 5 half-length
  steps with a persistent heading (momentum 0.68) and a tail that dims to
  20% — threads that travel and dissolve, never dashes that stop — plus 150
  short twigs seeded ON real cord samples (`cordPts`), so the fine field
  visibly leaves the arteries. The cords are therefore built before the
  hyphae; batch order among additive draws is visually free.
- **Cords braid**: 26 half-steps (halved per-step jitter — same path family,
  half the elbow angle), and the twin stroke's gap breathes along the length
  (0.024–0.056, two incommensurate harmonics) at 0.78 of the main tone: one
  organic cord with a lit core, not two rails.
- **The front is chained**: every rise's foot links to the next around the
  arc (closing the loop) at half tone, so the "live edge of the colony" is
  one continuous undulating carrier and the travelling pulse finally runs on
  an unbroken line.
- **The slab darkens its underside**: a `uUnder` uniform (1 below the soil
  line, 0 once the lens stands 0.9 above it; smoothstep of camera height
  minus `groundY`, i.e. pure in the pose) sinks the slab color to 10% while
  the camera is underground. Overhead earth now reads as OWNED's dark lid —
  a ceiling, not a stage flat — and the fog tone is restored before the far
  side can ever be seen. At both rests `uUnder` is 0 by construction.
- **The face curtain is rootlets**: each drop is now 3 segments easing into
  the fall, swaying along the lip tangent, curving BACK toward the section
  wall (along −CUT_N), dimming 85% by the tip and ending in a dim oblique
  root-tip flick — it ends by turning and dissolving, never by stopping.
  Depth biased short. Strata 40 → 54, biased shallower, so the rootlets
  visibly thread bedded soil.
- **The void edge dissolves**: hyphae survival now decays continuously with
  distance past the cut face (none beyond ~2.6 units) and survivors dim with
  void depth — the removed side fades to true absence.

Untouched, deliberately: the OWNED chapter (all four of its goldens are
byte-identical), every camera key, the reveal thresholds, the T3/T4 seams,
sky.js (the conifer whispers are the approved horizon), ring.js, canopy.js,
clones.js, species.js.

### Budget (1440×900 @dpr1, renderer.info accumulated across all composer
passes, 180-frame medians, same probe both arms; before = stashed HEAD)

| | draw calls | line segs | points | tris | p50 ms | p90 ms |
|---|---|---|---|---|---|---|
| OWNED rest 0.725, before | 56 | 70,963 | 22,296 | 4,753 | 26.9 | 33.7 |
| OWNED rest 0.725, after  | **56** | **70,963** | **22,296** | **4,753** | 27.4 | 32.7 |
| transit 0.815, before | 201 | 249,654 | 54,116 | 12,285 | 27.3 | 31.5 |
| transit 0.815, after  | **201** | 251,070 | 54,108 | 12,285 | 26.7 | 31.5 |
| transit 0.845, before | 238 | 303,983 | 63,416 | 18,045 | 26.3 | 30.3 |
| transit 0.845, after  | **238** | 305,399 | 63,408 | 18,045 | 26.7 | 29.6 |
| FINAL rest 0.925, before | 428 | 447,911 | 85,273 | 282,053 | 30.8 | 35.9 |
| FINAL rest 0.925, after  | **428** | 449,327 | 85,265 | 282,053 | 31.0 | 35.7 |

+1,416 line segments inside existing batched draws, **zero** new draw calls,
frame time flat, and the OWNED rest is bit-identical in every counter.

### Gates

- **Mirror**: 66-stop live scrub 0.70→0.96 and back (settled samples, real
  scroll): pose and every reveal uniform (`uPull`, `uAmount`, `uSoilOn`,
  `uUnder`) reproduce as pure functions of p in both directions.
- **No self-ignition**: `uPull` exactly 0 on every underground sample,
  monotone along the forward ride; `uUnder` monotone non-increasing.
- **Console**: clean over a full 0→1→0 ride at 0.02 steps.
- **`capture.py --check` PASS**, worst MAE 0.00/255, all ten. `final@*`
  re-shot in this commit with manifest provenance; `mission@*`, `inspire@*`,
  `connect@*`, `owned@*` byte-identical on disk. (A full-golden trial run
  showed `inspire@*` drifting by MAE 0.0007–0.0015 — this machine's known
  frozen-frame noise, nothing in the diff touches it — so the committed
  inspire files are HEAD's own bytes, untouched.)

### Residuals

- **The section wall's upper edge is still a straightish seam** where the
  darkened slab meets lit colony behind it (~p 0.805–0.845, mid-frame). It
  now reads as architecture (a cut face) rather than jank; a wobbled face
  sheet would finish it.
- **The far cords still show as doubled lines at distance** (frame-left,
  p 0.805–0.825) — the braid reads at mid-range and close; at 15+ units two
  strokes 0.04 apart still fuse into one bright line only intermittently.
- **The conifer whispers** behind the field still read as bare chevron
  skeletons when crossed at p 0.855–0.895. They are the approved horizon
  language at both rests and were left alone; if Hannah ever wants the
  transit view of them enriched, that is sky.js's tree builder, not this
  pass.
---

## 2026-08-09 — THE END OF THE RIDE: a footer key with no footer under it

**Hannah:** *"I seem to be able to still scroll out to a more zoomed-out version of it at the very bottom as well. I think this is a hangover of the old view that we had."*

**She was describing a footer key with no footer under it.** The Final leg
carried a SECOND hold key past the rest — `final-recede` at leg-local t = 1.0
(p 1.000), `pos (-17.73, 3.95, 3.260)`, `tgt (-5.44, 2.08, -0.97)`, fov 44.
Measured across the tail before the fix:

| p | camera x | y | radius | fov | pull |
|---|---|---|---|---|---|
| 0.925 (rest) | −14.720 | 2.730 | 14.966 | 45.50 | 1.120 |
| 0.950 | −15.501 | 3.058 | 15.759 | 45.11 | 1.250 |
| 0.975 | −16.950 | 3.645 | 17.233 | 44.39 | 1.492 |
| 1.000 (end-hold) | −17.730 | 3.950 | 18.027 | 44.00 | 1.622 |

— a further 20% of recession and +1.22 of lift spread over ~1,575 px of
scroll (half of Final's 3.5 vh at a 21,600 px route), reachable simply by
keeping going at the bottom. Nothing else moved out there: the copy band
holds (`hi: 2`), no hotspots, the same seams armed, and the lens saturates by
p 0.95.

**Provenance is explicit in this file.** The 2026-08-03 residual list above
reads: *"The end-hold recede runs the field at full kindle and the near-right
field bodies sit a touch hot **behind the footer**."* The recede existed to
back the composition off so the "Site Information" band could rise over it
through p 0.955..1. The footer was deleted in the navigation redux (26ca8d3,
25-navigation-redux.md §2), which also removed `epilogueRetire`/`epilogueVeil`
and the flight system whose last caller was the footer cue — and which states
outright that "the epilogue now simply holds its composition there". The
camera leg was the one place that was not made true.

**Fix:** delete the key. `journey/chapters/final/camera.js` now ends on
`final-rest`, and `director.js`'s `keyedPose()` clamps past the last key, so
every p ≥ 0.925 renders the Final rest EXACTLY.

**What is reachable past the rest now, and why it is intentional:** the fog
finishes its settle (near 13.75 → 15, far 60.3 → 62, complete by p ≈ 0.96)
over a camera that no longer moves, and then the route holds to `TERMINAL_P`.
Both p = 0.925 and p = 1 are snap-commit resolution anchors and now render the
same frame, so a scroll into the tail resolves onto the resting composition
whichever way it goes. The end-hold is a hold.

### Gates (1)

- **Camera parity**: `poseAt()` sampled at 401 points across the whole route,
  12 significant digits, before vs after — **max abs diff 0.0 for every
  p ≤ 0.925**. First divergence at p 0.9275; max 3.01 units, at p = 1, which
  is the removed recede. Nothing before the rest moved, as expected: the
  p 0.905 key's Catmull-Rom tangent reads the p 0.878 and p 0.925 keys and
  the rest key's own tangent was already zeroed by `hold: true`.
- **Field completeness at the hold**: all 9 members are fully inked at the
  rest (min per-body draw `d` = 1.000 at `uPullRaw` 1.120; max `reveal`
  0.790, `DRAW_W` 0.28), so freezing the reveal schedule with the pose leaves
  nothing mid-kindle.
- **`capture.py --check` PASS, worst MAE 0.00/255, all ten** — `final@*` is
  shot at `restProgress('final')` = 0.925, which did not move, so no golden
  needed re-shooting and none was touched.

### Residuals

- **The end-hold is now ~1,575 px of scroll in which only the fog moves**
  (and only for its first third). That is the route's own full stop and both
  ends of it resolve to the same frame, so it cannot strand the visitor — but
  if it ever reads as "stuck", the lever is Final's `scrollVh` in route.js,
  not another camera key.
---

## 2026-08-09 — THE FIELD BODY'S POKE: the ring the hero never had

**Hannah:** *"In the final section, when I tap the other mushrooms, some other thing comes out from underneath them — looks like a different kind of spore thing that pops out when I tap them. We shouldn't have this."*

The poke's motion had been brought to the hero's twice (070892c: the 50x
outward speed and the 3.3x sprites; e1b1e2b: the behind-the-cap fall term
running in open air). What was left was the SEAT, and it was measured rather
than eyeballed — 326 hero releases against 224 field releases at s = 1, both
read straight out of the live buffers:

| axis | main model §10c | field body, BEFORE | field body, AFTER |
|---|---|---|---|
| azimuth from downwind, median | −59.5° | +46.9° | −62.1° |
| azimuth, p10 / p90 | −128.5° / −19.4° | −132.1° / — (full circle) | −132.1° / −22.8° |
| fraction on one side of the skirt | 1.000 | 0.536 (i.e. uniform) | 1.000 |
| position within its own radial band | 0.27 / 0.63 / 0.93 | uniform | 0.28 / 0.68 / 0.97 |
| height below `CAP_Y`, p10 / med / p90 | 0.16 / 0.51 / 0.87 | 0.06 / 0.28 / 0.66 | 0.24 / 0.62 / 1.07 |
| sprite size, p10 / med / p90 | 0.021 / 0.042 / 0.080 | (already matched) | 0.021 / 0.035 / 0.075 |
| tone (mean RGB) | 0.964 / 0.617 / 0.319 | (already matched) | 0.963 / 0.612 / 0.314 |

Azimuth histogram, 30° bins, downwind at 0 — after the fix the two agree
bin-for-bin and both are empty over the whole far half:

```
hero  [0.046 0.092 0.132 0.221 0.273 0.236 | 0 0 0 0 0 0]
field [0.036 0.112 0.138 0.241 0.290 0.183 | 0 0 0 0 0 0]
```

**What it was:** a uniform 360° draw against a FLAT disc at `s * CAP_R`, at a
FLAT height `s * CAP_Y`. So a poked field body emitted a closed RING at the
rim — a halo all the way round, which the hero has never had; the hero lets
go of a downwind CRESCENT. Worse, because the real margin droops (`anatomy.js`
`marginDroop` plus the −0.11 edge term put it ~0.2 below `CAP_Y` at the rim),
the shallowest of those releases were seated inside the cap flesh rather than
under it.

**Fix:** the seat is now the hero's own, evaluated through the SHARED cap law
— `anatomy.js capUnderPt()`, the same function `organism/organism.js` seats
its 4,200 on and the same one `species.js` builds these bodies' caps from:

```js
const a = Math.PI * (1.0 + 0.98 * Math.pow(rand(), 0.45));  // the hero's, verbatim
const u = 0.92 + Math.pow(rand(), 0.6) * 0.20;              // his weighting, our band
const e = capUnderPt(u, a);
e.y -= 0.06 + Math.pow(rand(), 1.5) * 0.62;                 // his drop, verbatim
```

**What is scaled, and why.** Two things and only two. (a) The whole seat
multiplies by `s`, the body's uniform scale — it is a position ON a body, so
a half-size body releases from a half-size hymenium. That is the same reason
the SIZES do not scale: a spore is a spore. (b) The band `u` stays 0.92..1.12
instead of the hero's 0.55..1.00, for the reason it was chosen originally —
the Final rest camera stands ~11° above every field body's rim plane, so an
opaque §5 cap shell covers the whole underside and the hero's u 0.6 would emit
into a box the visitor cannot see into. The hero's outward WEIGHTING
(`rand^0.6`) comes across onto that band, so the release is a skirt thinning
outward as his is, not a wire. Azimuth is taken in world axes because the
hero's draw is justified by the WIND, which is one vector for the whole field
— and it lands the same way for the lens, since this half faces away from the
Final rest camera exactly as the hero's faces away from Mission's.

### Gates (2)

- The table and histogram above.
- **End to end**: a synthetic tap on a clone at the Final rest takes
  `pickStats().shedLive` 0 → 13 (= `round(28 × s)` for that body), with the
  narrow phase hitting and the clone ringing.
- **Console** clean over a full 0→1→0 ride that pokes six field bodies.
- **`capture.py --check` PASS, worst MAE 0.00/255** — the shed is
  `visible = false` on every frozen frame by construction.

### Residuals

- **The shed keeps the chapter's DOF band, not the hero's** (`FOCAL_D 10.5 /
  FOCAL_R 14.0` against `makePoints`'s `9.5 / 8.0`). Deliberate and
  unchanged: it is `sky.js`'s band, and matching the hero exactly would put
  the poke's spores on a different depth law from the spore sky they land
  among. Measured cost at 12 units: ~20% smaller and ~14% brighter than the
  hero's law would draw them.
- **The field seat does not carry the body's cap tilt/lean**, where the hero
  applies `capXf`/`capOff` to its own. The pool is scene-space and the bodies'
  lean is a per-body rigid transform the shed has no handle on. Sub-degree
  effect at these scales; noted rather than fixed.
- **A field poke still ADDS particles where the hero's RECYCLES them.** The
  hero's 28 are already on screen and teleport back to their gill origins, so
  a hero poke is brightness-neutral; a field body has no ambient cloud, so its
  pool must be born (and must die — `LIFE` 7 s with the entry/exit envelope).
  Structural, not tunable.
- **The still-air handover stays substituted at w = 1** (e1b1e2b): measured
  over 1.2 s, the hero's fresh releases fall (mean dy −0.084, 25 of 25) and
  the field's do not (mean dy +0.033, 0 of 28). That is the whole point of
  the seat being past the margin, and Hannah's earlier report; it is a
  deliberate departure, not a residual difference in the emission.

---

## 2026-08-10 — §15: the Epilogue breathes (Hannah's written brief, item 3)

Her item 3, in four parts: the main mushroom's emission reads as three
distinct clouds; the other mushrooms' spores feel like a different
particle system; a tap on a field body emits mismatched "sprinkles" the
hero doesn't have; and the arrival illumination is too fast and abrupt —
the FOURTH pacing request on this arrival.

### The three clouds (fixed in the species commit, ce91bc2)

The lumps were D27's lee filaments condensing the hero's 4,200-dot shed
hard enough that the pullback read the density catch as two-three white
cotton balls over the cap. FIL_LAM 0.100 → 0.060 dissolves them into one
broader irregular spray, and the tone white-tail thinning (1.4 → 1.9,
applied identically here in sky.js and shed.js — the one-substance rule)
warms what remains. Judged on before/after stills at the Final rest and
p 0.905: one wind, irregular density, no plumbing. The same commit is
what dims the three channels outside Inspire — see 07-chapter-inspire.md
D28 for the full account and the boundary re-proof.

### The tap "sprinkles" — an inventory, and a finding

Everything a field-body tap fires (interact.js onUp → ring.js respond,
ring.js:934-963): (1) the cantilever wobble impulse (clones kickTap /
takeSlot), (2) the shared light ripple (uPulse*), (3) the spore shed —
`shed.burst()` at ring.js:960, gated to caps above localY 2.8 — and
(4) a 6 ms haptic tick. The wobble, ripple and haptic are 1:1 ports of
the hero's own §10c handler.

**The falling-sprinkle effect no longer exists as a separate system.** It
was this same shed.js, before the parity work: the pre-070892c launch
impulse ("jumps out of the mushroom"), the pre-e1b1e2b still-air fall
(measured −0.076 u, +13.5 px straight down — "sparkles drop"), and the
pre-2db4a2b 360° ring seat ("comes out from underneath them"). Those
three commits fixed it IN PLACE rather than adding a second effect
beside it, so there is nothing left to delete that is not the matched
shed itself. Re-verified on this tree, live tap test (headless CDP,
frames at +0.25/0.7/1.4/2.4 s): a tapped field body wobbles, ripples,
and lets go of a wind-borne crescent — nothing falls; and by
construction the integrator has no downward term (`vel.y = BREEZE.y·sp +
rand()·0.012`, strictly ≥ 0; update() runs at w = 1, the fall term is
`1 − w = 0`). The brief item is satisfied by keeping the parity shed and
confirming the mismatched effect is gone — removing `shed.burst` would
delete the very parity Hannah asked to preserve.

### The pacing — where the fourth pass found road

The end-hold was spent in 336f31d and stays spent: p 0.97 → 1.0 is 0.03
wide and fully claimed by FOG_RAMP's own tail. What remained:

- **`route.js` Final `scrollVh` 3.5 → 6.0** — the same p-progression over
  1.71× the physical scroll. No p-value, camera key, ladder rung or
  golden moves; the page grows 24.0 → 26.5 vh (+10%).
- **`clones.js` DRAW_W 0.26/0.15 → 0.32/0.16** — each body's own
  kindling widens (+23% openers, tapering to +8% at the last rungs,
  where the REST binds it: the ring ladder's last rung at reveal 0.9511
  must sit past s = 1 at pullRaw 1.12, so drawW there must stay under
  0.169. A first cut at LO 0.19 put that body mid-bloom in the rest
  frame — caught by the golden gate at MAE 0.28 and pulled back.)
- **`sky.js` drift-band gate 0.30-0.72 → 0.34-0.96 uPull** — untouched
  through all three prior passes, the band was fully formed before the
  town had half-kindled, front-loading the sky. It now forms across the
  whole ladder and finishes with the last bodies (REV_HI 0.94), still
  saturated well before the rest's 1.12.

Wall-clock, at one viewport-height per second of physical scroll: the
whole arrival (first rung p 0.856 → rest 0.97) 2.66 s → 4.56 s; a single
opener's kindle ~0.20 s → ~0.42 s; a late rung ~0.23 s → ~0.42 s. At the
0.45 p/s flick ceiling the p-side arithmetic is unchanged by scrollVh
(0.25 s) — the flick is bounded by MAX_SCRUB_RATE, not by page height —
but the wider DRAW_W still softens each body's own curve inside it.
If a fifth pass ever wants more: the honest next lever is moving chapter
boundaries, which renormalizes every chapter's mapping. Everything here
stays a pure function of the pose; the rest frame is byte-identical
(final@* --check 0.00 after the LO fix; owned untouched at 0.00).

Console over a full 0 → 1 → 0 ride: clean (0 entries).
