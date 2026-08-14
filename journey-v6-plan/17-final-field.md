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

---

## 2026-08-10 (2) — the tap "sparkles" named: the ripple was world-sized on a body that is not

Hannah, refuting the same-day inventory's "already gone": "when I tap a
mushroom, these little sparkles come off the bottom... little sparkles
that float off the bottom side of the mushroom that aren't — they don't
look like the same spores. It looks like something else."

### Reproduced, and named

Headless tap on the nearest ring clone (i 4, scale 0.389, dist 6.15),
frames at +0.25/0.7/1.4/2.4 s: at +0.25 s the WHOLE body lights —
cap glints, stem column, base flare, and the floor around the base — and
over the next second the glinting crawls down and off the underside.
The inventory was right about the list (wobble, ripple, shed, haptic) and
wrong about the geometry of one item on it. The ripple's constants are
WORLD-sized: `pulseAt`'s range falloff `exp(-1.5·d)` and 1.4 u/s wave
speed are tuned on the 4.4-unit hero, where a cap tap dies within about a
unit of the fingertip and never reaches the stem base. A 0.39-scale body
fits ENTIRELY inside that footprint — so one cap tap glinted every point
layer on the clone's underside (stem motes, bead cloud, gill points — the
five layers a clone carries because it is the hero's own geometry), plus
the batch's soil pools and shed trail under the body and the canopy's
junction glints around it (all batch materials answer `pulseAt`). White
doubled-brightness points, swelling (the organism point shaders ride
`vTw` into `gl_PointSize`), moving with the wobble and lighting in an
expanding wave across the floor: "little sparkles that float off the
bottom side", exactly, and not spores — glints. The hero provably never
shows it: its own tap at the same pose lights its upper cap only
(A/B diffs in the session record).

Ablations that pinned it: the same tap with the shed pool hidden still
showed the bottom sparkles (not the shed); the same tap with the pulse
parked showed none of them (the ripple, and only the ripple).

### The fix (`ring.js` respond, one write)

`uPulseP.set(1.4·s, 1.5/s, 1.2)` — wave speed scales by the tapped body's
uniform scale, range falloff by its inverse, amplitude untouched. The
ripple is now the hero's own response measured in the body's units:
geometrically similar, dying at the same fraction of the body, at full
strength (a tap is the visitor's own force, like the wobble). At s = 1
the numbers are byte-identical to the hero's constants, and the hero's
own handler (organism §10c) is untouched. The floor under a small body
stays as dark as the floor under the hero's cap; neighbours no longer
answer another body's tap.

**The matched spore shed stays**, whole — the 070892c/e1b1e2b/2db4a2b
parity work is untouched; a tapped cap still lets go of its wind-borne
crescent.

### Verified

- Uniform trace: clone tap writes (0.544, 3.86, 1.2); hero tap writes
  (1.4, 1.5, 1.2) — the same law at the two scales.
- Frame series after: cap-local ripple + wobble + shed, stem/base/floor
  dark. Side-by-side +0.25 s diffs (hero vs clone, each normalised to its
  own body): the same footprint — upper cap lit, everything below
  untouched — on both.
- Console clean across taps on a near clone, a far species body, the
  hero, and the floor.
- No golden moves: taps do not exist in frozen frames; `--check` 0.00.

## 2026-08-11 — Owned → Final: the leg is BURIED, and the section wall was standing in front of it

Hannah, on the Owned → Final transition: *"towards the back end when it's in
an in-between state. The side gets cropped off, I think, from the side of the
fairy ring… there's kind of black, weird blackness above the top… we probably
need a better trajectory."*

### The measurement that reframed the whole thing

Scanning `cutVal` along the leg (41 samples, p 0.725–0.970) says something this
file's own header denies:

| p | x | depth | cutVal | side |
|---|---|---|---|---|
| 0.725 | +1.73 | 1.207 | **+10.06** | kept (buried) |
| 0.800 | −3.23 | 1.133 | **+6.05** | kept (buried) |
| 0.854 | −8.40 | 0.053 | **+0.56** | kept (buried) |
| 0.862 | −8.95 | −0.10 | ~0 | crosses, **already above ground** |
| 0.970 | −14.72 | −2.680 | −5.98 | removed (open) |

**Every underground frame of this leg is on the KEPT side.** terrain.js's
header — "the Final camera leg lives entirely on the removed side" — is true of
the rest and the approach and false of the whole traverse: the lens pierces the
surface at p 0.8555 *inside the kept soil*, and only crosses the cut line
laterally at p ≈ 0.862, above ground.

So for p 0.725–0.855 the soil slab is not a ceiling overhead. It is **the
section wall standing between a buried lens and everything the chapter draws**,
plus a horizontal plate whose own extent is the horizon. That is the hard-edged
dark wall down the middle of Hannah's "awkward state", and it is the reason the
frame's left third — the direction of travel — measured 35–49 % pure black.

### What was tried and rejected

- **Widening the plate.** Rendering the slab alone through the traverse shows
  its arc END as a hard stepped silhouette at p 0.81/0.83/0.85, so the span
  (authored ±8 around `CUT_S_MIN/MAX`, sized for the above-ground lip) looked
  like the culprit. Taking it to ±46 on the tangent and 27 → 66 units of depth,
  plus a distance grade on the underside, moved pure-black pixels by **0.1 %**.
  Reverted: the edge was never the point, the wall was.
- **Re-pathing the rise.** The obvious trajectory answer — get shallow early so
  the lens leaves the dead skim layer — is **impossible under the invariants**,
  and the measurement says so cleanly. `8b71687` requires y strictly monotone
  (zero negative height steps). Any depth bought early is therefore kept, so
  shallow-early forces pierce-early: reaching depth 0.75 at p 0.785 pins
  y ≥ −0.654, against the shipped −0.954 at p 0.815. Portrait makes it worse,
  not better — portrait.js already lifts the lens by +0.216 at the rest growing
  to +0.835 by p 0.855, so portrait pierces at **p 0.833** against landscape's
  0.855. **With the pierce fixed and y monotone, the current y schedule is
  close to the only one available.** The path was never the fault.

### What shipped

1. **The slab dissolves while the lens is buried** (`uBuried`, a pure function
   of camera depth, on the same hashed stipple `uSoilOn` already uses). This is
   the exact mirror of OWNED's ceiling being FrontSide-from-below: each soil
   surface draws only from the side it is FOR. Nothing is lost — everything the
   occluder exists to stop ("underground strokes read THROUGH the surface as a
   stray line lying ON the floor") is a from-ABOVE fault.
2. **`uUnder` is retired.** The 2026-08-09 tint existed only to make the
   slab's underside bearable; with the underside gone it had nothing left to
   fix and one thing left to break — at the pierce the lens stands ON the soil
   line with `under` still 0.96, so the surface it has just broken through
   filled the lower half of frame as a **black plate** (10.7 % of the frame
   pure black). Retiring it cannot touch either Final golden: `under` was
   already 0 at the rest.
3. **`reach`** (owned/index.js, keyed on the lens's distance from the CROWN)
   opens both the ceiling's near-earth structure window (3.00 → 8.60 units) and
   the soil horizon's passage band (closing at depth 0.90 → 1.75). Near the
   crown the lid overhead is DRESSED — the crown's own fan blazes across it —
   so the narrow window is right and the frozen composition is protected; out
   along the traverse nothing lights the lid and the lens runs at depth
   1.15–1.23 for 0.08 of p. Measured crown distance is **1.85** (landscape rest)
   and **2.06** (portrait rest), both under `REACH_R0` 2.40, so **reach is 0 at
   every rest by measurement** and both goldens are untouched.

### Results (1440x900 / 375x812, against the shipped tree)

| p | metric | before | after |
|---|---|---|---|
| 0.800 | pure-black px | 19.4 % | **1.6 %** |
| | lit px | 20.3 % | **37.9 %** |
| | top-30 % mean | 10.21 | **16.88** |
| 0.815 | pure-black px | 19.9 % | **1.8 %** |
| 0.830 | pure-black px | 18.4 % | **1.7 %** |
| | lit px | 21.7 % | **31.8 %** |
| 0.8555 (pierce) | pure-black px | 10.7 % | **0.0 %** |
| | mean | 27.85 | **32.00** |
| 0.800 (375x812) | pure-black px | 11.9 % | **0.2 %** |
| | lit px | 27.0 % | **53.1 %** |
| 0.815 (375x812) | pure-black px | 15.6 % | **0.1 %** |

Pure black across the whole traverse falls from **9–23 %** to **≤ 6 %**
(landscape) and **≤ 1.3 %** (portrait).

### On "the side gets cropped off, from the side of the fairy ring"

Taken at source, as the brief asked. The ring's cut edge does **not** end
abruptly and does not want dissolving into distance: it is the approved
diagonal soil-line, and in the rest frame it reads correctly, with its lip
strokes and hanging fibres. What ended abruptly, and what cropped the frame,
was the **slab and its section wall** — the fairy ring's cut side, hard-edged,
sitting across the middle of the picture through exactly the "in-between
state" she described. That is fixed at source above, by not drawing it where it
can only be an occluder.

### Verification

- **A latched uniform, found and fixed by the audit.** `uBuried` written inside
  the chapter's visibility gate LATCHES whenever the epilogue stops ticking: a
  reverse ride retires it at p ≈ 0.80 with the lens still 1.1 under the soil,
  leaving buried = 1 for every p below, against 0 on the way out. No frame ever
  rendered the stale value (the animator runs spine-first and rewrites it before
  any frame the group is drawn for), but the state was dishonest and the sweep
  could not tell it from real hysteresis. It is now one float written every
  frame outside `setAmount`, so the retired epilogue still costs nothing.
- **Mirroring**: forward then reverse over p 0.720–0.970 at step 0.001 (251
  samples), all four soil terms **bit-identical** — `lid`, `reach`, `grain`,
  `buried` all 0.000e+00.
- **Self-ignition**: 0 frames with the camera at or above the soil and any
  horizon or buried term > 0. `uBuried` live over p 0.7200–0.8540 exactly.
- **Rate and roll**, 601 samples per leg per aspect: peak yaw **1063.7** deg/p
  (1440x900) / **1047.5** (375x812) on Owned → Final, against the shipped 1064
  and the ~1.2k ceiling; peak pitch 468.9 / 391.4 on Connect → Owned; **|roll|
  max exactly 0.000000** on both legs at both aspects. `8b71687`'s invariants
  re-measured and intact: **0 negative height steps and 0 positive x steps** on
  Owned → Final at both aspects.
- **The colony is not regrown, by construction**: the changed-file set is
  `owned/{index,substrate}.js` and `final/{index,terrain}.js` — no camera, leg,
  route or director file is touched, so `owned/leg.js` samples a bit-identical
  position spline over p 0.660–0.872 and no `owned@*` reference moves. The soil
  crossing stays at p 0.6927, the rise's pierce at p 0.8555, and the murk window
  0.692–0.712 with `CONNECT_HOLD_HI` 0.705 is as shipped.
- **Goldens**: all ten within; both Final 0.00, both Owned 0.03 (unstructured).
- **Console**: 0 error/warn/exception events over a full forward + reverse ride.
- **Budget** (1440x900): this crossing adds **zero draw calls**. Connect rest
  47, Owned rest 55, crossing 2 219 (the +2 is the soil horizon from the
  previous commit), Final rest **427 against the shipped 428** and 278,181
  triangles against 282,053 — the ceiling is no longer submitted above ground.
  Median composer submit unchanged at every point (0.2–1.3 ms).

### Residuals

- **The late sag, p 0.885–0.910** (mean 27.1, lit 34.4 %) — Hannah's "maybe
  three quarters of the way there". It is not an artifact: the frame is a
  legible landscape, and the dip is the FIELD still kindling, because the reveal
  is `pullOf(camera.x)` and is deliberately paced (`6282080`, `a8d4518`).
  Touching it means touching the arrival ladder, which is out of scope here.
- The **hero ground group's orange wedge** at p 0.685–0.692 (see
  20-owned-root-network.md) is unrelated to this leg but is the other place
  Hannah's "the edges are kind of visible" still applies.

---

## 2026-08-12 — Owned → Final: it was never the camera. The leg straddles a 7x step in scroll density

Hannah, on the Owned rest → Final rest leg: *"Smooth the 'Owned by the
ecosystem' → final section transition. The move currently reads as two motions,
or one motion with two speeds. It feels jilted rather than continuous…
Investigate first rather than assuming a cause… The goal is that it reads as
one continuous motion."*

She asked for the diagnosis before the fix, and the diagnosis inverted the
obvious suspect: **the camera path is already one gesture. The scroll→progress
mapping is what breaks it into two.**

### The camera, cleared first

Measured live off `director.poseAt` (drift-aware, both aspects, 20,001 samples
across p 0.725–0.970). Two metrics were tried and one of them lied, which is
worth recording because it nearly sent this pass at the wrong target:

- A **fixed-depth** optical-flow probe (rays at 3 / 8 / 20 units) reports a
  violent second surge — at 8 units the flow runs 14.10 at p 0.763, collapses
  2.1x to 6.63 at p 0.803, then *re-accelerates 2.8x* to 18.41 at p 0.859.
  That reads exactly like the `0701653` two-envelope fault.
- It is an **artifact**. The scene's depth scale is not fixed across this leg:
  subject distance runs 3.20 → 12.69, a 4x change, as the camera leaves a root
  network at arm's length and surfaces onto a field at 12+ units. Holding the
  probe depth still while the content's depth quadruples manufactures a surge
  that nothing on screen has.

Measured against **its own subject distance**, the camera is one envelope:

| channel | crest | after the crest |
|---|---|---|
| gaze rotation | 34.18 at **p 0.7888** | monotone decay to 0 |
| parallax (v⊥/dist) | 54.24 at **p 0.7953** | monotone decay to 0 |
| combined density | 88.3 at **p 0.792** | monotone decay to 0 |

The two channels crest 0.0065 of p apart — they are the *same* gesture, not a
swing followed by a zoom. The only blemish is a **−16 % density dip at
p 0.752** (75.3 → 63.4 → 88.3), which is the `withdraw` key's own position-speed
trough: its Catmull-Rom tangent is 66.8 u/p against neighbouring segment means
of 70.8 and 78.6, so speed reads 95 → 66.8 → 94.5. Real, small, and left alone —
see Residuals.

Per-channel audit over the leg, 20,001 samples, both aspects — all unchanged by
this pass, since nothing here touches a camera file:

| | landscape | portrait |
|---|---|---|
| max yaw rate | 1064 °/unit-p | 1048 |
| yaw sign flips | **0** | **0** |
| yaw total | −141.2° | −139.7° |
| max pitch rate | 159 | 110 |
| max fov rate | 122.5 | 111.6 |
| roll | **0** | **0** |
| negative crown-distance steps | **0** | **0** |
| negative height steps | **0** | **0** |
| positive x steps | **0** | **0** |

### The scroll, which is the actual fault

`journey/scroll.js` builds a monotone PCHIP through `route.js` `SEGMENTS`. The
replica used for this pass was validated against the live `pAt` first: **worst
absolute error 0 across all 13,392 px** — bit-exact, not approximate.

| segment | p range | vh | mean gain (milli-p per vh) |
|---|---|---|---|
| owned | 0.60 → 0.85 | 5.0 | **50.00** |
| final seg 0 (the arrival) | 0.85 → 0.97 | 17.0 | **7.06** |

A **7.08x step in allocation density**, and it sits in the *middle* of one
continuous camera move. Worse, `final`'s `shape` (`k0 = 2.219`) pins the knot
they share at p 0.85 to 2.219 × the *arrival's* mean = **15.66** mp/vh — which
is only **0.31x of Owned's own mean**. scroll.js writes `km` at both knots of a
shaped segment in segment order, so the arrival's opening tangent *dictates
Owned's closing tangent*. Owned had no choice but to spend its progress early
and collapse into the join: gain **62.2 mp/vh at the rest → 15.7 at p 0.85**.

The consequence, stated without any flow model at all — the p reached at each of
15 **equal 421 px scroll steps** across the leg:

```
before  0.725  0.8009  0.8483  0.8679  0.8849  0.8996  0.9122  0.9230 …
```

The first step alone covers **31 % of the leg's p**; two steps of fifteen reach
p 0.848, and the remaining thirteen share what is left. On-screen motion per
pixel of scroll spiked to **13.95 and fell to 2.45 inside the first 15 % of the
road** — peak-over-plateau **12.6**. Half the leg's visible motion was delivered
in the first **7.1 %** of its scroll, 90 % in the first 26.5 %.

**Which cause dominates, in one line:** the gain varies **19.9x** across the leg
(62.2 → 3.13 mp/vh) while the camera's own motion density varies about **1.5x**
and is single-humped. The scroll is not a contributing factor, it is the fault.

The frame strip confirmed it: shot at equal scroll steps, frame 0 → 1 threw away
the entire Owned composition (root crown at top centre → deep in the network),
and frames 2 → 3 went from buried at the soil line to fully surfaced with the
hero organism revealed — **the whole surfacing inside one scroll step of
fifteen**, with the remaining 73 % of the road spent on the field kindling.

### What shipped — one entry in `route.js`, no geometry

```js
{ id: 'owned', span: 25, nav: 'Owned', scrollVh: 9.27,
  segVh: [2.27, 7.00], shape: { seg: 1, k: [1.6, 0.877] } },
```

- **seg 0 (p 0.60–0.725)** declared at the **2.27 vh the shipped spline was
  already inferring**, so `86883b9`'s Connect → Owned dive still measures
  **5.12 vh** end to end, keeps its 23.3 mp/vh gain at the Connect rest, and
  gains no trough (jilt 1.000 before and after).
- **seg 1 (p 0.725–0.85)** 2.73 → **7.00 vh**. Its mean becomes 17.86 mp/vh
  against the 15.66 it must hand over — a **level handoff instead of a 3.2x
  cliff**.
- **`k0 = 1.6`** holds the departure tangent at 28.6 mp/vh: low enough that the
  leg stops front-loading, high enough that the withdraw-key dip stays masked.
  This is a real trade-off and it was swept — `k0 ≤ 1.2` flattens the
  distribution further but *un-masks* the p 0.752 camera dip, pushing the
  stall-then-surge back up to 1.24–1.70.
- **`k1 = 0.877`** is 15.66 / 17.86 — it asks for precisely the value the
  arrival's own `k0` already pins at that shared knot. The declarations agree by
  design; the arrival's wins by loop order. (Verified inert: changing it moves
  nothing.)

### Results

| | before | after |
|---|---|---|
| peak-over-plateau (motion per px) | **12.6** | **1.89** |
| worst stall-then-surge on the leg | **1.230** (at p 0.7509) | **1.038** |
| scroll fraction carrying 50 % of the motion | 7.1 % | **16.2 %** |
| scroll fraction carrying 90 % | 26.5 % | **39.6 %** |
| gain at the Owned rest | 62.2 mp/vh | 28.6 |
| leg length | 19.73 vh | 24.00 vh |
| page | 41.85 vh | **46.12 vh** (+4.27) |

Equal-scroll steps, after — the surfacing now takes four steps where it took two:

```
after   0.725  0.7644  0.7940  0.8181  0.8409  0.8649  0.8857  0.9031 …
```

**Ridden, at the visitor's own frame rate** (constant wheel rate, on-screen
motion per *frame*, 12 buckets across the leg, milli-NDC):

```
deliberate (30 px/frame)
  before  325 181  67  36  15  8.9 6.5 4.2 2.6 1.5 0.8 0.35   peak/mid 49.9
  after   117 130 103  78  58  27  9.6 6.1 3.8 2.0 1.0 0.40   peak/mid 13.5

brisk (110 px/frame)
  before  439 612 564 376 214  70  32  19  11  8.1 6.3 2.0    peak/mid 19.0
  after   228 351 437 340 251 209  83  31  16 10  5.0 3.1     peak/mid  5.3
```

Before, at a deliberate speed the move **starts at maximum and collapses 22x
inside the first quarter of the leg** — a lurch, then five seconds of near
stillness. After, it eases *up* to its peak in the second bucket and decays
smoothly from there. Both speeds are strictly single-peaked with a monotone
decay and zero re-acceleration. It reads as one move that starts, carries, and
settles — which is what was asked for.

### The arrival is untouched — checked, not asserted

The Final arrival's gain curve **as a function of distance into the segment is
bit-identical**: worst |Δp| **3.3e-16** across its whole 17.0 vh. Its length,
mean slope and both `k` values are unchanged, so `6282080`'s 1.99x survives by
construction. Re-measured anyway, on the live pull curve:

- whole kindle progression (pull 0 → `PULL_MAX`): **17.081 → 17.083 vh, ratio
  1.0001**;
- per-body charge-and-take windows: **ratio exactly 1.0000** at every threshold
  ≥ 0.08. Only the single earliest opener (threshold 0, whose window starts at
  p 0.8486, just inside the re-allocated segment) reads 1.0088 — **+0.9 %, in
  the slower direction**. Spread 0.88 %.

### Gates

- `python3 tools/capture.py --check` — **PASS, exit 0**, worst MAE 0.03/255
  (warn 0.50, fail 1.00). The 0.03 on `owned` is **deterministic and
  pre-existing**: HEAD reads the same 0.03 against the stored goldens. This pass
  contributes zero — no golden moves, because no p-value, camera key or piece of
  geometry moves.
- **Camera mirroring bit-exact**: `poseAt` evaluated ascending vs descending
  across the leg, 28,007 samples per aspect, **0 non-bit-identical values,
  worst delta exactly 0**, both aspects.
- **State mirroring**: placed at identical p from below and from above, 6 of 8
  checkpoints (0.80–0.95, covering the whole surfacing and arrival) are
  **exactly 0** on pose, fov, fog, radius, copy and armed. The two near the rest
  differ only by a ~3e-4 sub-rounding placement drift, not hysteresis.
- **Scroll gates, resolution live**: E2 1.0143 / E3 1.0250; R1 out-and-back
  0.260000 from 0.259993; R2 control back in one frame; R4 hard flick
  **overshoot 0.00e+0**; R5 fling to end 1.000000; **R6 full 0→1→0 visits every
  anchor (0.26, 0.523, 0.725, 0.97, 1) with off-anchor stops: none.**
- **Scroll gates, `?nosnap=1`**: E1 out-and-back surface delta **0.00e+0**, E2
  and E3 ratios **1.0000** exactly, N1 parks at 0.3600 with `commitP` null.
- **Deep-scrub parking improved.** The Owned rest's magnet band shrinks from
  ~0.093 to ~0.060 of p, because the band is `SNAP_BAND × segment px` and the
  segment now buys more px per unit p. On HEAD, p 0.74/0.76/0.78/**0.80** are
  all swallowed to 0.725; after, only 0.74/0.76 are, and 0.78/0.80/0.84/0.88
  park **exactly**.
- **Console clean** over a full 0 → 1 → 0 ride driven by real wheel events —
  zero errors, zero warnings, zero unhandled rejections.
- No roll anywhere (exactly 0, both aspects); all rates far under the ~1.2k
  °/unit-p ceiling.

### Residuals

- **The withdraw-key speed dip, p 0.752** (−16 % in motion density; position
  speed 95 → 66.8 → 94.5 u/p). It is a genuine camera fault and it is *why*
  `k0` could not go lower than ~1.5. It was **not** chased: the dip is set by
  the `withdraw` key's Catmull-Rom tangent, its position keys sit inside
  `owned/leg.js`'s sampled window (`LEG_P0` 0.660 – `LEG_P1` 0.872), and any
  move there regrows the colony and forces a re-shoot of `owned@*` — a content
  change out of all proportion to a 3.8 % residual wobble that the shipped `k0`
  already masks. If it is ever taken on, note that **gaze and fov keys after the
  rest are free**: every consumer of `buildLeg`'s `frameAt` reads only
  `restFrame` at the frozen p 0.725, so only `pos` is placement-bearing.
- **The leg's second half is still the quieter one**, and deliberately so: the
  Final arrival is a near-still camera over a slow kindling field, paced at
  Hannah's repeated request. This pass balanced the *camera's* motion across the
  road; it did not, and should not, flatten the arrival.
- Owned seg 0's internal distribution shifts slightly (its `f50` 0.864 → 0.826)
  because `km` at p 0.725 drops from 62.2 to 28.6 mp/vh. The dive's total,
  its gain at the Connect rest, and its jilt (1.000) are all unchanged.

## 2026-08-12 — §18: the ring stops short of the left edge, and it is an angle, not a width

Hannah: *"On the final section at large viewport widths, the ring terminates
short of the left edge and leaves dead space that reads as an accidental crop.
Extend the ring so it continues to and bleeds past the left edge. Target and
test at MacBook Pro logical widths, 1512px and 1728px, and apply from roughly
1440px upwards. Left side only, unless the result looks lopsided, in which case
match on the right."*

### The measured cause is not width — it is aspect, and that is why she sees it

Everything in this chapter is composed in the REST FRAME as an offset `rel`
from `REST_CAM.head`. The frame's own left edge sits at a `rel` that depends
only on the ASPECT (the vertical fov is fixed at 45.5), so the honest question
is not "how wide is the window" but "how far around does the frame reach":

| viewport | aspect | left edge at rel | field's left limit | gap |
|---|---|---|---|---|
| 1024x768 | 1.333 | -0.500 | -0.58 | **bleeds** |
| 1440x900 | 1.600 | -0.591 | -0.58 | 8 px |
| 1512x982 | 1.539 | -0.573 | -0.58 | bleeds |
| 1728x1117 | 1.547 | -0.576 | -0.58 | bleeds |
| **1512x860** | **1.758** | **-0.645** | -0.58 | **~100 px** |
| **1728x980** | **1.763** | **-0.647** | -0.58 | **~110 px** |

The field's left arm has always been `rel = -0.03 - fr()^0.9 * 0.55`, i.e. it
stops dead at **-0.58**, and the hint rung at -0.50. At the review size the
edge sits at -0.591 and that limit lands 8 px outside the frame, so the band
reads as running off it. Give the window a real browser's aspect — a 14" or
16" MacBook Pro at 1512 or 1728 logical px is ~1.76 once the browser chrome
comes out of the height — and the same -0.58 lands a hundred pixels INSIDE the
frame, with the last body standing whole and a hard-edged empty column beside
it. That is the accidental crop, and it is why it is visible on her machine
and not in the golden.

Note the two tall MacBook aspects (1512x982, 1728x1117 — the full logical
panel, no browser chrome) do NOT show it. The problem needs both a MacBook
width and a browser's height, which is exactly the case she is looking at.

Measured on the frame itself — lit-pixel density in the body band (y 30-58% of
frame, threshold 55/255) over the outer 120 px of each side, and the first
column from each edge carrying sustained content:

| | left 120 px | right 120 px | left/right | first lit column from left |
|---|---|---|---|---|
| 1024x768 | 0.639 | 0.556 | 115% | 0 |
| 1440x900 | 0.293 | 0.493 | 59% | 0 |
| 1512x860 | 0.245 | 0.496 | 49% | **17 px** |
| 1728x980 | 0.178 | 0.425 | **42%** | **25 px** |

The right edge has never had the problem, and for a structural reason: three
ring members sit at rel +0.67 / +0.80 / +0.86 (screen x 1787 / 2050 / 2173 at
1728x980), so the right bleeds past the edge at every aspect there is.

### Why the RING itself cannot be extended

The frame-left arc is the az 279 -> 327 sector. Further left along the arc is
az < 279 — which is exactly the az ~140-275 sector `world.js` deliberately
leaves empty because **the cutaway slices through the ring there**. Those
bodies are not missing; they are below the soil-line by authorship, and the
whole lower-left wedge is built from the cut face that exposes them. Putting
fruiting bodies back on that arc would contradict the chapter's own section
drawing. `cutVal` at az 265, r 8.3 is -5.06: there is no soil there at all.

So the continuation has to come from the FIELD, which is already what occupies
the band between the last ring body (screen x 365 at 1728x980) and the edge.

### And the cutaway sizes the band — this reach is not a taste value

`cutVal` over the left wedge at the rest, by (rel, distance). Placeable soil
is >= 0.4:

| rel | soil begins at dist |
|---|---|
| -0.55 | 18 |
| -0.60 | 22 |
| -0.65 | 26 |
| -0.70 | 26 (and 42+) |
| -0.75 | 46 only |
| -0.80 | **none at any distance** |

There is no ground to stand on past about **rel -0.72**. So the band is
rel [-0.72, -0.55] and that is every metre of kept soil on that side. It
happens to be enough: the frame edge is at -0.647 at both target widths, so
bodies from -0.65 outward land at screen x 0 and beyond — the shipped band now
runs out to **screen x -119** — and it overlaps the existing field's own -0.58
limit so the two read as one population with no seam.

The near-left (dist < 22) is doubly unavailable: it is where the cut face is,
and it is where the COPY BLOCK sits. Which is why the field was authored to
start deeper on that side in the first place ("field bodies on that side start
deeper so they sit clearly behind it").

### What shipped

A LEFT EXTENSION block in `ring.js`, after the hint rung, inside the field's
own scope:

- **16 bodies**, rel `-0.55 - xr()^0.85 * 0.17` (-0.72..-0.55), dist
  `CLONE_DIST + xr()^1.70 * 15` (24..39, near-weighted), pruned by the same
  `cutVal >= 0.4`, the same 9.6-unit ring moat and the same 1.15-unit spacing
  against `placed` that the field already uses.
- **6 far hints** on the same band, because the hint rung stopped at -0.50 and
  the far haze had the same edge the bodies did.

**Tier.** Every one lands at dist >= `CLONE_DIST` by construction — the cut
leaves no soil nearer than 22 on this side and the band starts at 24 — so they
are all T4 under the field's own `dist < CLONE_DIST ? 3 : 4` rule, which IS
the right rung for their distance. Nothing was added to the T3 clone rung or
to its fifteen-slot `FIELD_LADDER`; both are untouched, and the clone count is
unchanged at 24.

**Arrival.** They join the T4 weather-tail: thresholds spread by depth rank
across the same `[REV_KNEE 0.72, REV_HI 0.94]` the existing far band uses, so
they interleave with it rather than arriving as a block. Measured on the
built scene (25 bodies at rel <= -0.549, which is the extension plus the three
pre-existing bodies in the overlap):

| p | 0.80 (arm) | 0.85 | 0.89 | 0.91 | 0.925 | 0.94 | 0.95 | **0.960** | 0.97 (rest) |
|---|---|---|---|---|---|---|---|---|---|
| uPull | 0 | 0.019 | 0.536 | 0.759 | 0.886 | 1.003 | 1.064 | 1.105 | 1.120 |
| bodies fully dark | **25** | **25** | **25** | 21 | 5 | 0 | 0 | 0 | 0 |
| bodies fully lit | 0 | 0 | 0 | 0 | 1 | 17 | 21 | **25** | **25** |

Dark at the arm and for the whole first half of the leg, arriving one band at
a time from p 0.91, and **every body fully arrived by p 0.960 — a tenth of the
leg before the rest.** Reveal range 0.7226..0.9362, inside REV_HI, so the last
one finishes its light at ~1.10 against `PULL_MAX` 1.12. Retraction on a
reverse scrub is free: `aReveal` is read against the camera-pure `uPull`.

**Canopy.** They go through `placeMushroom`, so they land in `seats` and
`canopy.js` makes them nodes of the one graph like every other body — no body
in this chapter has roots of its own and these do not either. Node count
169 -> 191, edges 413 -> 456.

**The stream is its own.** A fresh `makeRng(0x1EF7ED6E)`, and the block runs
after every existing draw, so not one shipped body moves, changes size,
changes shape or changes threshold. `placed` is deliberately shared so the
extension keeps its spacing from the bodies already there.

### Width-conditional? No — always present, never gated

The scene is one 3D world and these bodies are built at boot like every other
body; at narrow aspects they are simply outside the frustum. Gating them on
viewport width was considered and rejected, for reasons that are structural
rather than stylistic:

- `canopy.js` lays a minimum spanning tree over EVERY body in the chapter, so
  a body that existed only above 1440px would rewire strands that are visible
  below it. The graph cannot be a function of the window.
- The arrival ladder's slots are authored constants against a fixed
  population; a width-dependent body count makes them width-dependent.
- The reveal is camera-pure by law. It must not become window-pure.
- The Final goldens would become width-dependent, and `capture.py` shoots two
  sizes.
- A resize would have to rebuild the whole chapter.

The measurements below show this is also the honest answer empirically: the
change does exactly nothing at the aspects that never had the problem.

### Result

| viewport | aspect | left-120 density | first lit column from left |
|---|---|---|---|
| 1024x768 | 1.333 | 0.639 -> 0.627 | 0 -> 0 |
| 1440x900 | 1.600 | 0.293 -> **0.309** | 0 -> 0 |
| 1512x982 | 1.539 | 0.276 -> 0.271 | 0 -> 0 |
| 1728x1117 | 1.547 | 0.262 -> 0.258 | 0 -> 0 |
| **1512x860** | 1.758 | 0.245 -> **0.335** (+37%) | **17 -> 0** |
| **1728x980** | 1.763 | 0.178 -> **0.263** (+48%) | **25 -> 0** |

The dead column is gone at both target widths, the band now runs off the left
edge (leftmost body at screen x -119), and the aspects that never had the
problem move by under 2% — which is canopy re-routing, not bodies.

**Left only.** The right already bleeds past the edge at every aspect, so
there is nothing there to fix; matching it would cost budget for a problem
that does not exist. The frame is not lopsided after the change — the left is
still lighter than the right, but that is the authored composition (copy
bottom-left, field weighted upper-right, and the near-left ground cut away),
not a crop.

**Rejected:** a first pass at 9 bodies with an even distance spread closed the
dead column but only lifted the left-120 density to 0.247 at 1728x980; the
shipped 16 with a near-weighted distance and a slightly higher elder chance
(0.12 -> 0.20) gets to 0.263 for the same zero draw calls. Also rejected:
reaching in to dist 20-24 for bigger bodies — that band is the copy block's
and the cut face's, and a body there would be a T3 clone at 15 draws each.

### Budget, at the Final rest, 1728x980

| | before | after | |
|---|---|---|---|
| **draw calls** | **430** | **430** | unchanged — the new bodies merge into the two existing batched draws |
| geometries | 73 | 73 | |
| visible drawables | 417 | 417 | |
| line primitives drawn | 449,177 | 451,908 | **+2,731, +0.61%** |
| points drawn | 85,425 | 85,535 | +110, +0.13% |
| triangles | 278,183 | 278,183 | unchanged |
| batched body segs | 4,322 | 6,840 | the field's own build |
| glow points | 247 | 335 | |
| canopy nodes / edges / segs | 169 / 413 / 3,070 | 191 / 456 / 3,283 | |
| bodies in the chapter | 73 | 95 | |
| clone bodies | 24 | 24 | **no new clones** |
| field t3 / t4 / hints | 15 / 28 / 20 | 15 / 44 / 26 | |
| frame ms p50 | 2.0 | 1.5 - 1.8 | 3 runs |
| frame ms p90 | 6.3 | 3.5 - 4.9 | 3 runs |

Zero new draw calls is the number that matters: every added body is a species
build on the T4 / hint rungs, which merge into the same `LineSegments` +
`Points` pair the whole field already shares.

### Copy clearance

The extension's feet sit at screen y 350-491 against a copy block whose top
edge is at y 601 (1440x900), 559 (1512x860) and 612 (1728x980). **Zero
overlaps** at all three, tested against every body's full silhouette (cap top
to stem foot) with a 40 px margin.

### final@* moved, and so did the canopy behind it

`final@1440x900` MAE 1.41/255 and `final@430x932` 1.78/255 against the old
goldens; both re-shot in this commit. The mobile portrait moving at all is
worth naming, because no extension body is anywhere near that frustum: it is
the CANOPY. `canopy.js` samples its 96 waypoints with a minimum-separation
test against every node placed so far, bodies included, so 22 new bodies
change which candidates are rejected and the graph re-lays. An 8x-amplified
diff is entirely strands and junction glints — no body moved, nothing is
missing, the graph is still one component rooted at the hero.

That is the canopy doing exactly what it is for. Freezing the old edges would
mean giving the new bodies a different kind of attachment from everyone
else's, which is the "sixty small root systems" reading this file's header
rejects in its first paragraph. One graph over every body, or it is not a
canopy.

Nothing outside the chapter moved: mission, inspire, connect and owned all
read MAE 0.00/255.

### Gates

- **`capture.py --check`: PASS**, worst MAE 0.00/255 over all ten goldens
  after the re-shoot. Before it, exactly the two intended files were in the
  FAIL band and the other eight read 0.00.
- **Mirror scrub** Owned rest -> Final rest -> back, 17 matched pairs at
  1728x980: **0.0000/255 with max channel difference 0 across the whole Final
  half (p 0.817 -> 0.97)**, which is every frame the extension is in. The
  1.61 residual at the p 0.725-0.786 head of the leg is the Owned chapter's
  underground state and measures **1.6144 on the pre-change tree too** —
  identical to four decimal places, so it is pre-existing and untouched.
  No self-ignition anywhere.
- **Arrival**: dark at the arm and through p 0.89, all 25 fully arrived by
  p 0.960 (table above).
- **`tools/scrollgates.js`**: E2/E3 1.0000, R1 settles 0.260000, R4 overshoot
  4.01e-6, R5 end-hold 1.000000, R6 visits every anchor both ways with no
  off-anchor stops.
- **Console over a full ride**: 1420 frames of real wheel 0 -> 1 -> 0 plus all
  five nav jumps: **0 errors, 0 warnings**.
- **Narrow widths unbroken**: 1024x768 and the 375x812 portrait re-shot and
  compared — the composition is what it was, and the left edge there still
  bleeds as it always did.

---

# 2026-08-13 — the left of the frame is the CUT, not an empty field

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/chapters/final/terrain.js` (§3b, the section trailing into
the cut; a second bank of colony glow pools), `journey/chapters/final/ring.js`
(the left band's population). No camera key, no rest pose, no new draw call.

> "In the final section, the area to the left of the text currently contains a
> large amount of empty black space and feels under-composed. Add more
> environmental detail there… extending the fairy ring further into this area;
> additional ground-level elements; visible mycelial/network structures; subtle
> organic details that connect back to the rest of the mushroom system. It
> doesn't need to become busy, but there should be enough visual material to
> prevent that side of the composition feeling unfinished."

## 1. Where the emptiness actually is — and why the last pass could not reach it

`d39b35b` extended the ring's left arm and measured the result as left 0.263
against right 0.422, calling that "the authored composition". Hannah is now
reporting that imbalance itself, so the verdict is superseded — but the
interesting part is *why* that pass could not have fixed it.

Unprojecting the rest frame at 1728x980 and reading `cutVal` at the ground
plane under each pixel:

| screen | ground (x, z) | dist | cutVal | |
|---|---|---|---|---|
| (80, 700) | (−9.34, −5.46) | 10.2 | **−2.62** | removed |
| (250, 760) | (−9.72, −3.37) | 8.3 | **−2.05** | removed |
| (420, 830) | (−10.12, −1.68) | 6.9 | **−1.88** | removed |
| (150, 900) | (−11.18, −2.32) | 6.7 | **−3.08** | removed |
| (700, 760) | (−8.69, −0.79) | 7.5 | −0.27 | removed |
| (300, 500) | (−1.96, −11.34) | 19.2 | +1.53 | KEPT |
| (80, 460) | (0.09, −19.05) | 26.5 | +2.91 | KEPT |

**The whole lower half of the frame is the removed side.** It is not an
under-populated field — it is the excavation, and there is no ground there to
stand anything on. Kept soil only begins around screen y 460–500, out at
dist 19–26: the horizon band, which is exactly and only where `d39b35b` could
put bodies. The dead area was never reachable from the ring.

So the thing that belongs in the pit is **the section itself**, which is
also the first two items on Hannah's own list.

## 2. The section trails off into the cut (terrain.js §3b)

§3 already exposes the colony in the void near the face and then deliberately
stops: *"survival beyond the cut face now decays with distance (none past
~2.6 units)… so the removed side fades to true absence instead of stranding
bright floaters in open black (the rest frame's lower-left)."* That is the
authored emptiness, and the note names the real hazard exactly: **floaters**.

The answer is not to relax the decay and scatter loose strokes into the black —
that is the countable-dash carpet the declutter round removed, and the first
cut of this block proved it: 210 filaments all leaning off the same wall
rendered as a **combed hatch**, visibly worse than the emptiness. What ships
gives the void strands an **anchor** and a **curve**:

* every filament **starts on the cut face** — on the lip or down the section
  wall — and travels out into the removed side, so what fills the pit is
  visibly the severed network trailing out of the wall, not debris in front
  of it. Same vocabulary the file already speaks: §2's rootlets leave the lip,
  §3's filaments travel with momentum, §4's cords are cut at the face. This is
  those cut ends *continuing*.
* turning is a **persistent curl** — a signed turn rate carried for the
  strand's whole length — rather than per-step noise, over twice as many
  half-length steps. A hypha bends; it does not zigzag and it does not rule a
  line. The heading starts on the face **tangent** with a random sign and only
  drifts outward, so strands run along the wall and across each other instead
  of all raking away from it.
* tone dies continuously with how far the strand has left the wall, so it
  dissolves into the dark rather than ending at a countable point.
* **weighted to frame-left, which is the low-s end.** With the rest lens at
  (−14.72, 2.70) and the cut running s −14..+10, `cutEdgePoint(−14)` is
  (−2.75, −15.81) — 22.0 units out and 12.8 to the *left* of the view axis —
  while `cutEdgePoint(+10)` is (−10.69, 6.85), 5.8 out and 5.4 to the *right*.
  The right end is the near corner the lip's own `nearK` taper already holds
  down; the left end is the far wall across the empty pit.

A second bank of **22 colony glow pools** is set deeper into the cut and
further out from the wall on the same weighting. The twelve that existed sit
within ~2 units of the lip; the pit itself had no atmosphere at all, so the
strands would have been the only thing in it and would have read as strokes on
black. The pools give the pit a floor of light to sit against.

Both use a fresh rng and run after every existing draw into their batch, so
not one shipped stroke moves.

## 3. The left band's population (ring.js)

`WANT` 16 → **30** bodies, far hints 6 → **12**. The **band is unchanged and
cannot change** — rel [−0.72, −0.55] is still every metre of kept soil on that
side, as `d39b35b`'s `cutVal` table says. What was a taste choice is how much
of it was used: 16 bodies across that whole band left the left arm reading as a
thin picket against the right's mass. The count is still bounded by the same
1.15-unit spacing test against `placed`, so it fills the band it was already
given rather than crowding it, and the same rng in the same draw order means
the first 16 are bit-identical to `d39b35b`'s.

Every added body still lands at `dist >= CLONE_DIST`, so they are all T4: the
T3 clone rung and its fifteen-slot `FIELD_LADDER` are untouched, `clones.bodies`
stays 24 and `clones.dropped` 0.

## 4. Measurements

**Lit density** — fraction of pixels above luma 32 (the fogged black floor),
sampled every 2nd pixel. "outer" is the outer 120 px column (60 on the phone)
over the body band, y 0.42–0.82 h; "L3/R3" are the outer thirds; "copyQ" is the
bottom-left quadrant the copy sits in.

| viewport | outer L | outer R | L3 | R3 | copyQ |
|---|---|---|---|---|---|
| 1440x900 | 0.339 → **0.421** | 0.759 → 0.762 | 0.350 → 0.373 | 0.528 → 0.529 | 0.232 → 0.255 |
| 1512x860 | 0.255 → **0.404** | 0.700 → 0.703 | 0.345 → 0.377 | 0.526 → 0.530 | 0.237 → 0.270 |
| 1728x980 | 0.209 → **0.347** | 0.623 → 0.618 | 0.311 → 0.340 | 0.474 → 0.478 | 0.198 → 0.229 |
| 375x812 | 0.319 → 0.322 | 0.293 → 0.265 | 0.295 → 0.305 | 0.371 → 0.369 | 0.140 → 0.155 |

The left band is up **58–66%** at the two aspects Hannah reviews at, and the
**right side does not move** at any width — this is a left-side fill, not a
general brightening. At 1728 the left is now 56% of the right's density where
it was 34%. It does not reach parity and should not: the right legitimately
carries the two big near bodies. The phone is unchanged, as it must be — no
added body is in that frustum.

**Budget at the Final rest, 1728x980, frozen, per frame:**

| | before | after |
|---|---|---|
| draw calls | 430 | **430** |
| triangles | 278,183 | 278,183 |
| line primitives | 451,908 | 455,967 (+0.90%) |
| points | 85,535 | 85,663 (+0.15%) |
| geometries | 73 | 73 |
| frame ms p50 / p90 | 26.5 / 29.9 | 25.5 / 28.5 |
| hyphSegs | 1,800 | 3,523 |
| aggrPts | 256 | 278 |
| ringSegs | 6,840 | 9,060 |
| field | left 16, leftHints 6, t4 44 | left 30, leftHints 12, t4 58 |

**Draw calls do not move** — every addition merges into a batch that was
already being drawn. Frame time is unchanged within the headless cadence's own
spread (it measures marginally *faster* after, which is noise, not a win).

**Canopy attachment:** nodes 191 → **211**, bodies 95 → **115**, edges 456 →
**505**, hubs 8, **`canopyDropped: 0`** — every added body is seated as a node
of the one spanning tree rooted at the hero, exactly like every other body. The
§3b strands are not bodies and correctly enter neither the canopy nor the
bodies' `uPull` ladder; they are face detail and light with the face.

**The arrival ladder**, frozen clock (booted through `?capture=`, so the
organism clock is pinned and any difference is real):

* **reverse-retracting:** forward vs reverse at p = 0.80 / 0.83 / 0.86 / 0.89 /
  0.91 / 0.93 / 0.95 / 0.97 — **MAE 0.0000/255 at every one**. Perfect mirror.
* **fully arrived by the rest:** rest (0.97) vs end-hold (1.0) MAE
  **0.1532/255**, which is the authored fog move 14.3/60.9 → 15/62 and nothing
  else. Everything is lit by the rest.
* **dark at arm:** the chapter arms at p 0.80. Mean frame luma steps +3.22
  there — but it stepped **+3.00 on the pre-change tree**, so the step is
  pre-existing and this pass contributes 0.22 of it. (The sweep places with
  `scrollTo`, which snaps the eased state; a real scrub eases through the arm
  and spreads it.)

## 5. Gates

* `capture.py --check` **PASS**, worst MAE **0.00/255** across all ten.
* References: `final@*` re-shot in this commit. Against the previous goldens
  the desktop frame moved **1.435/255** (5.86% of px > 8) and the phone
  **1.740/255** (6.53%). The phone moves although no added body is in its
  frustum — the canopy samples its waypoints with a min-separation test against
  every node placed so far, so 20 new nodes re-lay the graph. Same cause and
  same magnitude as `d39b35b`'s 1.78, and the same reasoning applies: freezing
  those edges would give these bodies a different kind of attachment from every
  other body's.
* Scroll battery unchanged: `E1 −3.66e−4`, `E2/E3 1.0000`, `R4 0.00e+0`,
  `R5 0.000000 / 0.970000 / notches 1.0000`, `R6 off-anchor stops: none`.
* Ride: three laps forward and two back by gesture — five wraps, 30 legs —
  every leg on an anchor, URL clean, **console 0 entries**.
* Deep links unchanged: `?pose=final` lands (−14.72, 2.73, 2.70) fov 45.5.
* Copy legibility checked at 1440x900 and 1728x980 with the block visible: the
  added material is dim orange filament against which the cream heading holds
  full contrast, and nothing new crosses the sub-copy's line.

## 6. Residuals

* The left cannot reach the right's density and should not — the right carries
  the two large near bodies, and matching it would mean inventing ground the
  cutaway removed.
* §3b is face detail, so it lights on the chapter's camera-pure rise (`aReveal`
  −1, the batch default every other stroke on that face carries) rather than on
  the bodies' `uPull` ladder. That is the same law, not a second one, but it
  does mean the pit fills with the rise rather than kindling body by body.
* The pre-existing +3.0 luma step at the p 0.80 arm is untouched and worth its
  own pass.

---

# The flash under the hero on the way back to the end
## 2026-08-14

> "There also seems to be a visual glitch sometimes when I scroll up to the end
> — a little bit below the main mushroom, something kind of flashes up."
> — Hannah

## 1. Reproduction

Scrolling **up** from the top wraps to the end, so "scroll up to the end" is the
**wrap UP**, and the flash is on its arrival. Reproduced through a real
trusted-wheel wrap (18 × −110 px at 60 Hz via CDP `Input.dispatchMouseEvent`;
`journey.wrap()` is not the input path and was not used), 1440x900, frames read
off the canvas immediately after `composer.render()`:

| camera x | what is on screen |
|---|---|
| −3.26 | clean |
| **−5.29** | **the hero's root crown drawn as a bright fan under the stem, in mid-air over the open crater** |
| −8.32 | clean again |

Two frames, ~85 ms. Intermittent for the visitor because it needs a **blend** —
it is unreachable by scrubbing.

## 2. The system: Owned's `keep`, and a window it shares with Final

`chapters/owned/index.js` composes the colony on `arrival = max(sink, keep)`,
both camera-pure (`fc1e151`). `keep` is the Final-cutaway hold, a half-space in
camera x whose stated justification is that it is "0 at every other chapter's
rest **and along every jump arc between them**, measured x ≥ −2.25".

**That premise was true when it was measured and `e4df4b0` made it false.** The
loop's wrap stopped being a one-frame teleport and became a real 3.8 s lap (bow
3.2, rise 1.9), which runs the camera out to x +15 and brings it back to the
Final rest **above ground**, at y ≈ 4.0–4.4 and z ≈ −15. It therefore crosses
the whole of `keep` at poses the ride never occupies.

What is exposed is sharper than "the lap crosses `keep`", and naming it is the
point:

* `keep` opens over **0.8 units** of camera x (x −4.6 → −5.4);
* Final's own `rise` — the mask that brings in the soil slab and terrain
  standing in front of these roots — takes **2.8 units** (x −4.6 → −7.4).

So across ~2 units of x the colony is up and the thing that occludes it is not
yet there. Measured at the flash frame: `keep` **0.945** against `rise`
**0.156**. On the **ride** that window is passed underground (measured camera
depth 0 … 1.05 through it), so the soil lid hides it and nothing is wrong. On
the **lap** it is passed four units in the air with the crater open below.

Confirmed by suppressing this chapter's group for the same wrap: the fan is gone
and nothing else on the lap changes.

## 3. The axis that separates the ride from the lap

Not height, which is the obvious guess: the portrait Final rest stands at
**y 4.242** and the lap's flyover peaks at **y 4.396** — they overlap to within
0.15, so any y threshold that killed the flash would also have emptied the
epilogue on mobile. Depth below soil fails for the same reason: both are above
ground.

**z is the one axis on which the two do not overlap.** Swept over p 0.60–1.0 at
0.002 steps [placement sweep] on all three shipped viewports, the camera's z
wherever `keep` is live (x ≤ −4.6):

| viewport | z range |
|---|---|
| 1440x900 | 2.695 … 3.099 |
| 430x932 | 3.066 … 3.475 |
| 375x812 | 3.066 … 3.475 |

against the lap, which is at z ≈ −15 as it crosses the exposure window and
returns to z > 0 only over the last half second as it draws into the rest.

So `keep *= smooth01((z + 2.0) / 2.0)` is:

* exactly **1** at every sampled ride pose at every aspect (2.695 of margin at
  the tightest);
* exactly **0** across the whole flash (13 of margin);
* and it opens over the lap's **final approach** — measured after the change,
  the colony comes up as z runs −2.1 → 0.3 in the last ~600 ms of the lap, so it
  **arrives on the move** as the lap lands (`6f23d90`'s rule) rather than being
  cut in.

It cannot touch a reference, and the reason is that sweep rather than an
argument about `sink`: the factor evaluates to **1.000000** at every ride pose
where `keep` is live, at all three aspects, so `keep` — and therefore
`max(sink, keep)` — is bit-identical on every path a reference is shot through.
`capture.py --check` agrees: worst MAE **0.00/255** across all ten.

## 4. Before / after

Same wrap, same input path, matched by camera x:

* before, x −5.29: bright root fan under the stem;
* after, x −6.37 (deeper into the same window): clean.

Owned's `group.visible` through the lap, after: **0** across x −5.49 → −15.2
while z runs −15 → −2.1, then 1 from z ≈ −0.8 as the lap draws in. Before it was
**1** from x −7.02 (z −14.56) onward.

## 5. Is it the same root cause as the reveal's pacing?

**Related family, different cause, and they are fixed separately.** Both are
camera-pure terms authored against the poses the *ride* visits, meeting a camera
path the ride never takes. But the reveal's fault is a **rate** — the right
values arriving far too fast — while this one is a **gate reading true** at
poses where its premise does not hold, and it would still be wrong at any speed.
Neither fix touches the other's code, so they are two commits.

## 6. Residuals

* The `keep` / `rise` width mismatch (0.8 against 2.8) is still there; the z
  factor closes the only path that reaches it above ground. A blend arc between
  two mid-route rests that happened to pass through x −4.6…−7.4 above ground and
  at z > 0 would reopen it. No shipped jump does — the ordinary Owned → Final
  arc sits at z ≈ 1.3–2.7 but underground through that stretch — but the width
  mismatch, not the z factor, is the durable statement of the hazard.
* The lap's own camera path remains untested against the other chapters'
  camera-pure gates. `keep` was found by a reported symptom; Connect's and
  Inspire's masks have not been swept over the lap's poses the way §3 sweeps
  this one over the ride's.
