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

---

# Step back: clones — 2026-08-04

**Status:** shipped. Supersedes §3's "one new module: species.js" as the
answer for the NEAR field. species.js keeps the far tiers and the hints;
everything the eye can resolve is now the hero's own geometry.

## 1. Why approximation failed twice

Two rounds tried to *rebuild* the hero cheaply, and both were rejected by
Hannah at the Final rest with the same sentence — the members read as a
different kind of mushroom.

| round | what it matched | what it missed | measured |
|---|---|---|---|
| D15 (`ring.js` texture-system port) | the hero's SYSTEMS — lattice, gill fan, rim stack, stem mesh | their DENSITY | ~1/50th of the hero's line count per body |
| doc 18 (`species.js`) | the hero's SILHOUETTE, from the anatomy mirror | still the density | cap profile matched to ~1e-14 %, tissue still ~10x sparser |

The second round is the instructive one: the silhouette was *numerically
perfect* and the complaint did not move. That is the finding. **The hero's
identity is not its outline, it is its tissue** — the crumpled cap lattice,
the bead clouds, the doubled rim, the stem's staggered mesh under wiggling
fibres. A body with the right outline and a tenth of the strokes is a
diagram of the organism, not the organism, and the eye reads the difference
instantly when the two stand side by side.

So: stop approximating. A near member is now a **literal clone** — the
hero's own `BufferGeometry` objects, drawn again under another matrix.

## 2. The sharing rules as shipped (`journey/chapters/final/clones.js`)

| what | rule | why |
|---|---|---|
| geometry | **always shared** | a clone adds zero vertex memory; 24 bodies cost one body's buffers |
| occlusion shells + stem core (`MeshBasicMaterial`) | **shared outright**, but per-clone `visible` | they carry no per-clone state; the visibility gate stops an unlit body reading as an opaque hole punched through the mist, and hands back 4 draws per dark body |
| dense lines + glow points (`ShaderMaterial`) | **shallow-cloned**, then animated/global uniforms re-pointed at the hero's instances (`time`, `uProg`/`uWin`/`uClampY`, the `uPulse*` trio, `uRes`, `uFadeOn`, `map`) | one uniform tick drives N bodies: clones shimmer, resolve and answer floor taps in sync with the hero for free |
| `uOpacity` | **owned per clone** | it is the write-port for the reveal choreography and for the pointer glow |
| cap overlay net (`LineBasicMaterial` + injected draw) | **rebuilt plain** | the draw injection only matters mid-intro; parked it is identity, and a fresh material gives an owned `.opacity` |
| point sizes | cloned point materials get an **owned `uScl`** patched into `gl_PointSize` | the hero's point shaders size sprites in world units with no node-scale term, so a scaled clone would otherwise wear full-size sprites. The patched source is identical across clones, so three's cache still compiles ONE extra program |
| **fog** | **NOT shared** — one pair owned by the clone set, fed from the chapter's `uFogNear`/`uFogFar` | see below |
| parenting | the CHAPTER group, never `swayGroup` (adr-d3) | the field does not ride the hero's wind; each clone runs its own seeded two-pivot breeze at reduced amplitude |

### The fog reversal (the one rule that had to change)

The module was first written sharing `fogNear`/`fogFar` with the hero, on
the reasoning that a clone should dim exactly as the hero does. Measured at
the rest, that is wrong and visibly so. The hero's pair is **fixed at 7 → 20**
— a hero-page parameterisation — while the director re-parameterises the
world to **15 → 62** across the Final leg. A clone on 7/20 therefore dims
~5x faster than the soil it stands on and reaches **black at 20 units**,
which put a hard wall through the field and left the far ring bodies
**dimmer than the species bodies standing behind them**. A brightness
inversion is a seam you cannot not see. Clones now ride the chapter's ramp,
and the depth cue is explicit instead: `ring.js`'s `cloneLum(dist)` =
`1 − 0.45·smoothstep(8, 23, dist)`, landing a clone at the far end of the
T3 band on the same luminance the species T3 tier carries.

### One bug the walk had to grow

`chapters/inspire/index.js` parents its own decoration group onto
`sceneApi.groups.mushroom`. The first walk cloned it — 24 copies of Inspire's
content, plus 3 sprites and 3 mis-sized point layers per body. The walk now
takes only the drawable LEAVES that `organism.js` itself adds, each of which
must carry the organism's build signature (`uProg`/`userData.uWin`, or a
`MeshBasicMaterial` for the §5 shells). Foreign subtrees are **counted**
(`counts.clones.foreign`), never guessed at.

## 3. N, the cutover, and the species seam

**N = 24**: the 9 ring members plus the 15 T3 field bodies. `CLONE_DIST = 24`
units from the rest camera. The hero is never cloned and never displaced —
it keeps its place on the arc as the twelfth body, largest and brightest.

The cutover was a screenshot judgement, made twice:

- **18 units (ring only, N=9) left a seam.** Ring members reach 16.9 and the
  nearest field body stands at 17.0 — the two constructions ended up
  shoulder to shoulder in one depth band, where a species body is still
  ~90 px tall and reads as an open wire umbrella beside a solid one.
  Unmistakable at 2x on the rest frame.
- **24 units (N=24) moves the seam to the T3/T4 boundary** — a luminance step
  the composition already has (doc 17 drops stroke opacity 0.70 → 0.52
  across it) and a size step of about half. The change of construction now
  lands where the frame is already changing. Past 24 units a body is under
  ~40 px of cap and the fog has most of it.

As shipped the clones span 6.15 – 23.43 units and the nearest species body
stands at 24.81 — a 1.4-unit gap at the cutover, on top of the field's own
9.6-unit ring moat.

**Verdict:** no visible species seam at the rest at 1440x900, 1280x800 or
375x812. What remains beyond it is the T4 band and the hint rung, which are
horizon texture and are exactly where the detail ladder is meant to be
working.

## 4. Layers kept and dropped

**Every layer is kept.** All 15 drawables per body: 4 occlusion meshes
(2 cap shells + margin wall + stem core), 5 dense-line layers (cap lattice,
gills, rim, stem lattice, stem fibres), the cap overlay net, and 5 point
layers (cap nodes, gill core, rim points, the bead cloud, stem motes). The
beads and speckles ARE the tissue this step-back is about, and the measured
budget says they fit. Nothing was dropped: `counts.clones.dropped == 0`.

The one drop path that exists is a *faithfulness* guard, not a budget one:
if `organism.js`'s point-size expression ever drifts out from under the
`uScl` patch, that layer is dropped rather than drawn at full sprite size.

Why no LOD damping was needed: a shrunken clone **self-damps**. The hero's
dense-line material carries the coverage fade (`vFade = 1 − exp(−gap)`) and
its point shader carries the `MIN_PT` area compensation — the very
mechanisms `species.js` had to imitate build-time with `crowdK`/`innerK`
because the batch shaders have neither. The real thing does not pile up into
a white lamp at distance; that was always an artifact of the approximation.

## 5. Budget

Measured GPU-side (`composer.render()` timed with `gl.finish()`, median of 7
passes x 8 renders), headless Chrome / ANGLE Metal / Apple M3, 1280x800 at
dpr 1. Bodies were detached from the live clone group inside ONE browser
session, so the curve is an A/B against itself.

| clone bodies | draw calls | line segs | points | triangles | render ms |
|---|---|---|---|---|---|
| 0 (species only) | 68 | 50,449 | 28,967 | 14,127 | 1.3 – 2.0 |
| 3 | 97 | 82,433 | — | 38,127 | 2.9 |
| 6 | 127 | 114,417 | — | 62,127 | 3.3 |
| 9 (ring only) | 172 | 162,393 | 46,548 | 98,127 | 2.6 – 3.1 |
| 16 | 277 | 274,337 | 64,209 | 182,127 | 3.8 – 4.0 |
| 20 | 337 | 338,305 | — | 230,127 | 4.9 |
| **24 (shipped)** | **396** | **402,273** | **84,313** | **278,127** | **3.8 – 5.6** |

Counts are exact and reproducible; the millisecond column is not — headless
run-to-run spread on the clone-heavy variants was wide (occasional medians
to 14 ms against a 2.7 ms minimum in the same session), while the
clone-free variant sat rock-steady at 0.8 ms. The honest reading is a
range, plus this anchor against the site's own shipped envelope, measured
in one session at 1280x800:

| pose | draw calls | line segs | render ms (min / median) |
|---|---|---|---|
| owned | 26 | 28,385 | 0.38 / 0.44 |
| connect | 47 | 46,598 | 0.80 / 1.29 |
| inspire | 55 | 46,429 | 1.02 / 1.35 |
| mission | 42 | 44,377 | 0.86 / 1.70 |
| **final (clones)** | **396** | **402,273** | **1.17 – 3.80 / 1.65 – 4.64** |

Other sizes, N=24: 1440x900 → 4.7 ms; 2560x1600 (the dpr-2 case) → 6.8 ms;
375x812 → 6.3 ms at 222 calls (frustum culling drops the off-screen bodies
on portrait). The cost is **vertex-bound, not fill-bound** — 4x the pixels
costs ~1.4x the time — which is why the dpr-2 case does not blow up.

**Conclusion: no reduction was needed.** The Final frame is now the site's
heaviest pose by a wide margin, at roughly 2 – 5 ms of GPU render inside a
16.7 ms frame. fps at 1280x800 never approached the ~50 floor, and the
scene's own `perf-governor` (which steps the pixel ratio down above 24 ms
average) never engaged. N and the layer set stand as shipped.

Memory is the quiet win: geometry sharing means 24 bodies add **zero**
vertex buffers. Cost is 264 shallow-cloned materials + 96 shared mesh
instances.

## 6. Interaction

Hannah also asked for the field mushrooms to answer a hover and a click the
way the hero does. The hero's answer is §11's region glow
(`organism/furniture.js` `createHighlights`), and both kinds of body here
run that EXACT math out of `clones.js`:

```
h += (tgt − h) · min(1, dt·5)
hover term  =  h · (gain + gain·0.38·sin(t·3.1))          gain 0.85
click term  =  1.1 · sin(min(clickT/1.4, 1)·π)            one shot, then inert
```

- **Pointing** — `journey/chapters/final/interact.js`. One invisible 8-sided
  cone per member, in a group that is **never added to the scene**: a
  detached tree costs nothing to render, cannot be caught by a stray
  `traverse()`, and needs no `visible = false` (which would have made it
  un-raycastable). Members never move, so proxy matrices are computed once.
  52 proxies; the hint rung gets none.
- **Applying** — a clone owns its materials and applies the summed term to
  its own `uOpacity`s. A batched species body has no material of its own, so
  `world.js` gained an `aHot` vertex channel and two uniform pairs
  (`uHotId`/`uHotAmt`, `uTapId`/`uTapAmt`): one hovered body and one tapped
  body at a time, which is the whole interaction. **Zero extra draw calls**;
  the alternative was splitting the batch. Two channels rather than one so a
  tap's decay survives the pointer moving on.
- **Input ownership** — `scroll.js` owns wheel and touch at window capture.
  This module listens on the CANVAS only, registers every listener
  `passive: true`, and calls `preventDefault()` **nowhere**. A click uses the
  organism's own tap discipline (moved < 7 px, released under 400 ms), so a
  drag that ends on a cap is not a click. The hotspot DOM and the CTA
  delegation in `index.js` are untouched. Verified: a wheel event dispatched
  with the pointer sitting on a mushroom still scrubs the journey.
- **Gating** — armed only while the chapter is on screen and `uPull > 0.55`,
  and per body `accept()` re-tests that body's OWN reveal. An unlit member
  cannot be lit early by a mouse: the D16 no-self-ignition law covers the
  pointer too. On retire every pointer state is dropped outright rather than
  eased out over frames the retiring chapter will not run.
- Raycast is throttled to ~14 Hz; a tap jumps the throttle so a click is
  never dropped.

Verified by screenshot and by uniform readout at 1440x900:

| target | off | hover | click |
|---|---|---|---|
| clone (dist 6.2), box mean | 46.8 | 67.2 (+44%) | 82.1 (+75%) |
| species (dist 24.8), `uHotAmt`/`uTapAmt` | 0 / 0 | 0.825 / 0 | 0.640 / 1.022 |

## 7. Gates

- Rest + end-hold shot at 1440x900, 1280x800, 375x812 — the field is
  unmistakably the same mushroom as the hero at all three.
- Slow scrub p 0.78 → 1.00 → 0.78, both directions: dark at arm (p 0.80 and
  0.83 are underground and black), 7% ember whisper at p 0.86, reverse rides
  retract the clones back along the arc. No self-ignition.
- Console clean over a full ride (forward + reverse scrub, four nav flights,
  pointer traffic across the field, a click, and a scrub-away with a hover
  live): 0 warnings, 0 errors, 0 rejections.
- Camera untouched. `mission` / `inspire` / `connect` / `owned` goldens
  re-shot **byte-identical** (MAE 0.00/255, 0.0% px > 8, both sizes).
  `final@*` re-shot in this commit with manifest provenance.
