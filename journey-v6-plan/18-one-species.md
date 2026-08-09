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

---

# 8 — Poke parity, and the entry animation as the field's reveal

**Date:** 2026-08-04. **Asked by Hannah, two things, one sitting:**

> "why is the touch-interaction on the new mushrooms different to the OG one?
> make it the same; we could only switch it on once hovered if it's an
> efficiency issue"

> "what about the entry animation, too heavy to run on them?"

Both turned out to be the same shape of problem: the field bodies were sharing
the hero's *systems* but not the hero's *state*, and a system you cannot give
state to can only do the one thing it is already doing.

## 8.1 What the hero's poke actually is

§6 above shipped the pointer response as §11's region glow. That is the
**hover**. A **tap** on the hero is something else entirely —
`organism/organism.js` §10c, "a fingertip poke, resolved as actual mechanics" —
and it is FOUR things, of which the field bodies had none:

| # | the hero (§10c) | the field bodies, before |
|---|---|---|
| 1 | **Mechanical wobble.** Stalk as a cantilever on an elastic root. The tap is an impulse at the hit point; torque r × F about the base kicks angular velocity (`tap.vx/vz`), ringing down as a damped oscillator (`TAP_W` 2.3 rad/s, `TAP_ZETA` 0.14 — a few visible wobbles, ~3 s), integrated ON TOP of the breeze so a poked mushroom keeps swaying while it recovers. The lever arm falls out of the cross product: a cap tap tips ~4× a low stem tap, and pressing one cap edge tips it that way. Saturating clamp 0.09 — flesh, not a bell. | nothing |
| 2 | **Light ripple.** `pulseC` planted at the hit point, `pulseT` rewound to 0, `pulseP` = (1.4, 1.5, 1.2) — slow, short-range, gentle: a world-space radial wave through every glowing material, with range falloff. | nothing (the clones *shared* the uniforms but nobody ever wrote them for a field body) |
| 3 | **Spores.** A cap tap (`hit.point.y > 2.8`) sheds 28 spores off the gills. | nothing |
| 4 | **Haptic.** A 6 ms `navigator.vibrate` on touch pointers. | nothing |

…plus a tap-vs-drag gesture gate (< 400 ms, < 7 px) and hit-testing against
the REAL opaque body shells. What the field bodies answered with was a
brightness boost (`uHotAmt` / `uTapAmt` / `uOpacity`) and nothing else. That
IS the complaint, and it was exactly right.

## 8.2 The bug underneath it (measured, then fixed)

`organism/organism.js`'s `pointerup` listener is on `renderer.domElement` and
fires **globally** — including all through the Final chapter, where the hero is
one body in a field of seventy-two. Its hit test runs against the hero's own
four shells, so a tap on a CLONE misses every one of them and falls through to
the "missed the body → floor ping" branch, planting the fast, far-carrying
mycelium swell (2.6, 0.33, 1.4) under the pointer. Measured live at the Final
rest before any of this work, tapping the near clone at screen (1233, 575):

```
uPulseC = (-3.60, 0.07, 3.58)      a point on the FLOOR, 3 units short of the body
uPulseP = (2.6, 0.33, 1.4)         the floor swell, not the body poke
```

So the field bodies were not merely silent — they were answering with the
*wrong* wave, layered under the glow.

`organism/*` is read-only, so the fix is entirely on the chapter side, and it
is an ORDERING fix rather than a suppression. organism registers its listener
when the scene is built; `interact.js` registers ours on the same element when
the chapter is built, which is strictly later, so **ours runs second on every
tap**. The chapter therefore resolves the tap SYNCHRONOUSLY inside the event
(no throttle, no deferral to the animator) and re-plants the correct body poke
over organism's floor swell before the frame renders. The wrong wave never
reaches a pixel, and nothing is stopPropagation()'d, preventDefault()'d, or
otherwise taken away from anyone.

A tap that misses every body is left EXACTLY as organism wrote it, because
there it is right: that *is* the floor ping.

And a tap that lands on the HERO is left alone too. A ray to the hero can pass
through a field body's proxy cone standing behind it, so before claiming a tap
we cast the hero's four shells and yield if the hero is nearer. Verified: a
hero tap at the Final rest plants (1.4, 1.5, 1.2) at (−2.12, 3.30, 0.40) — on
the hero's own cap, organism's own doing — with our picker recording zero
casts.

## 8.3 Broad phase / narrow phase (Hannah's efficiency suggestion, measured)

A cone tells you WHICH body. It does not tell you WHERE — and §10c's whole
character is *where*: the lever arm is a cross product about the base, and the
ripple is planted at the fingertip and dies within about a unit of it. A
collider axis would give every poke the same nod.

| phase | what it casts | when | measured cost |
|---|---|---|---|
| broad | all 52 proxy cones, detached tree | every hover poll (~14 Hz) + every tap | (unchanged from §6) |
| narrow | ONE body's own four opaque shells, ~12,000 tris | only on a tap, only for the body the broad phase named | **2.83 ms mean over 31 casts**; first (cold, bounding volumes lazily built) 5.3–18 ms |

Hannah's instinct was right and the number says why: at hover rates the narrow
phase would cost ~14 × 2.83 ms = 40 ms/s of a core for nothing. Once per tap it
is a twelfth of one frame at the rest, and no visitor can perceive it. So the
split is broad-every-poll, narrow-on-tap-only — which is *stricter* than "only
once hovered", and gets the true hit point where the physics needs it.

Batched species bodies have no shells to cast against and keep the cone's own
hit point, which is still a real point on a real surface at the right height.

## 8.4 The species-batch boundary: there isn't one

The honest options were (a) give batched bodies ripple + glow only and document
the seam, or (b) promote pickable ones to clones — which at ~15 draws per body
× 28 bodies is 400 extra draw calls and obviously not happening.

Neither was needed. A batched body's rotation is expressible **in the vertex
shader**: §10c's ring-down is a small-angle rotation vector ω = (rx, 0, rz)
about the body's base, so the displacement is the cross product ω × r, unrolled
over TWO slots against the `aHot` ID the vertices already carry (`world.js`
`WOBBLE_GLSL`). At the amplitudes this ring-down reaches (the saturating
clamp's own ceiling, ~0.039 rad) the small-angle form is accurate to under a
ten-thousandth of a pixel at these distances.

Two slots, not one: a stolen glow just stops glowing, but a stolen WOBBLE snaps
a body back to rest mid-ring-down, which reads as a glitch. Two covers poking a
second body while the first still rings; a third poke inside three seconds
steals the QUIETER slot.

Idle slots park at **−999**, not −1 — `aHot` defaults to −1 for every vertex
that is not a fruiting body (terrain, trees, root stubs), so an idle slot at −1
would match all of them. The glow channels get away with −1 only because their
amplitude is zero when idle; a wobble slot carries a rotation, and one stale
radian on the terrain is a whole floor sliding sideways.

So a visitor who cannot know which construction they poked gets the same four
answers either way. Measured on a T4 species body at 25 units (`uWobR`
magnitude, degrees, sampled per frame):

```
0.00 →  0.14 → 0.28 → 0.37 → 0.44 → 0.485 → 0.50 (peak, t≈0.80 s)
     →  0.008 (zero crossing, t≈1.6 s) → 0.32 (t≈2.4 s) → 0.01 (t≈3.4 s)
```

— a textbook damped oscillator settling in about three seconds, which is what
§10c's constants say it should be.

## 8.5 What scales, and what does not

**The wobble ANGLE does not scale, and that is the point.** For a clone the
impulse is resolved in the body's OWN frame (root-local, which is hero units
because `root.scale` is the clone's only scale); for a batched body it is
resolved in world axes with the lever arm divided by the body's scale. Either
way a poked field mushroom leans by the same number of DEGREES as the poked
hero — which is what "make it the same" has to mean when the bodies are
different sizes. Peak measured ~0.5–0.7° on both constructions, which is also
what the hero's own cap tap produces; it simply subtends fewer pixels out in
the field, exactly as a real mushroom would.

**The spore COUNT scales, the spore SIZE does not.** `round(28 × scale)`,
floored at 10 — under about ten particles a shed stops reading as a puff and
starts reading as three stray dots. Size is absolute: a spore is a spore, the
same physical object on every fruiting body of one species. The first cut
scaled size by the body too and it was invisible — 0.007–0.03 world units gave
`gl_PointSize` 0.5–1.6 px at this camera's six-to-thirty-unit distances, under
the point shader's own `MIN_PT` floor where `vShrink` dims them to a tenth. The
shed fired, integrated and drifted correctly, and you could not see one pixel
of it. Sizes now sit in the same band the chapter's spore SKY already uses at
these distances.

**And the release had to change.** A rap knocks the spores clear of the cap
MARGIN before they fall. Not decoration: the Final rest camera sits ABOVE every
field body's rim plane, so a body's own opaque §5 cap shell hides the entire
gill space underneath it — a shed released straight down under the gills (what
a spore really does, and what the first cut did) is emitted into a box the
visitor cannot see into.

## 8.6 The shed itself

`journey/chapters/final/shed.js`, new. The hero's `shedSpores(n)` recycles
particles of its own 4,200-spore cloud back to THEIR OWN gill origins — origins
baked at the world origin — so calling it for a field body would puff the hero.
And the chapter's spore sky is a closed-form GPU phase function of `uTime`:
right for a standing drift, structurally incapable of an event at an arbitrary
place and moment.

So: one additive Points draw, a 256-particle ring buffer, integrated on the CPU
only while something is alive and `visible = false` (no draw, no loop, no
upload) the rest of the time — which is **every frame of every capture**, so
the goldens cannot see it. Motion is `organism/spores.js`'s own language: drop
clear of the gills first, then the one wind (BREEZE (1, 0.62, 0.17) normalised)
takes over, handover measured in TIME not distance.

## 8.7 Part B — the entry animation IS the field's reveal

It was never too heavy. The clones **shared the hero's single `uProg`
draw-progress uniform**, so all twenty-four bodies were pinned to whatever the
hero's entry was doing — and the hero's entry finished back on the hero page,
parked at `uProg = 2`. One uniform, one state, nothing left to draw. Cost was
never the obstacle; state was.

Each clone now owns its `uProg` — **one float per body per frame** — while
still sharing every per-layer `uWin`, so the hero's authored choreography
(stalk verticals, then the lattice, then gills, rim, cap surfaces, the overlay
net last) replays per body, in the hero's own order, at the moment the
chapter's reveal front reaches that body. Measured cost: **nil**. `uProg` was
already uploaded per material every draw; only the object it points at changed,
so there is not one extra uniform upload, not one extra draw call, and not one
extra shader program. The fps at the Final rest, 8-second samples, 1440×900:

| | mean ms | p50 | fps |
|---|---|---|---|
| before (HEAD 9e76bf4) | 37.44 / 37.25 | 36.7 / 36.2 | 26.7 / 26.8 |
| after (both parts) | 37.62 / 36.40 | 36.9 / 35.1 | 26.6 / 27.5 |

— inside run-to-run noise, in both directions.

**The law it obeys.** D16 forbids anything fading in over open view; a draw-on
tied to the camera-pure front is lawful, a time-based one is not. So the draw
parameter is a pure function of `uPull` exactly like the kindle — the SAME
front, one step earlier:

```
d = smoothstep((pullRaw − (reveal − 0.20)) / 0.16)
uProg = d ≥ 1 ? 2 : 0.296 + d · (0.893 − 0.296)
```

`DRAW_LEAD` 0.20 > `REVEAL_W` 0.16, so the last stroke lands before the first
ember: the shipped "unlit body in the dark" state is preserved exactly. The
body that was always there is now a body that INKED ITSELF IN and *then* was
always there. The 0.296…0.893 span is the union of the hero's own stem+cap
windows (`intro.js` WINDOWS) — a clone carries no ground layers, so driving the
full 0…1 would spend a third of the move on layers it does not have.

`pullRaw` is `pullOf` UNCLAMPED below zero. On the clamped value the near
bodies would arrive at the surface pierce already 84% inked and pop; on the raw
value they do their whole drawing underground, behind the soil slab the chapter
is itself dissolving.

At `d = 1` the uniform parks at the hero's own 2, which is **byte-identical**
to holding it at 0.893 (`dp` saturates at 1 either way, the tip ember is
switched off by the same `step()`, and the lid is inert). That is why the rest
frame did not move.

Two more pieces the draw needed:

- **`uClampY` is owned by the clone SET** (one object, value 1e3). The hero
  parks its stem materials at 3.65 to stop the stipe inking against open sky
  before the cap exists, and the lid tests WORLD y — a metric that means
  nothing to a body standing at another place and scale. Every clone's stem
  happens to sit below 3.45 world y, so the lid was already inert for all of
  them; pinning it makes that structural instead of a coincidence waiting for a
  taller member.
- **The overlay net gets the hero's own graft.** A clone rebuilds that material
  (it needs an owned `.opacity` for the reveal write-port), so
  `injectCloneDraw` redoes organism's `injectDraw` pointed at this clone's
  `uProg`. Without it the overlay net is the one layer that stands fully drawn
  while the cap lattice under it is still being stroked — and the one layer
  that does not answer a poke's ripple.

### The bug part B walked into, caught on a scrub screenshot

`SHELL_ON` was sufficient while a body was always fully inked: dim the strokes
and you still had a dark body. With part B a body spends about a fifth of
`uPull` only PARTLY drawn — and its shells, which are opaque and carry no draw
state of their own, were standing there the whole time. **A mid-draw member
read as a solid black mushroom cut out of the haze**: the exact silhouette
`SHELL_ON` exists to prevent, arriving through the other door.

`intro.js` solves the same problem for the hero by FADING each shell group in
while its own region is being stroked (stem shells over `uProg` 0.30…0.54, cap
shells over 0.574…0.714). A clone SHARES the hero's shell materials — sharing
them outright is what buys a solid body for free — so it cannot fade them, only
switch its own copies on and off. So it switches at the MIDPOINT of the hero's
own fade, where the region already carries ink: `STEM_SHELL_AT` 0.42,
`CAP_SHELL_AT` 0.644. No shell ever appears over a blank region, and no region
is ever inked without its shell.

Asserted, not eyeballed: across 50 scrub positions × 24 bodies (147 mid-draw
body-samples observed), **0 violations** of `shell visible ⟹ uProg ≥ its own
threshold`.

### How reverse reads

Correct, and it was the thing most at risk. Because the draw is pure in
`pullRaw`, a reverse scrub un-draws each body stroke by stroke, in reverse
buffer order, back into the dark — the tip ember runs backwards along the
strokes it laid. Shot as a sequence (p 0.922 → 0.895 → 0.870 → 0.843): the
field thins from the far arc inward, the shells leave with their own ink, and
the near bodies are the last to go. No fade-in over open view in either
direction.

Direction-independence proved numerically: 12 scrub points from p 0.780 to
1.000, visited ascending then descending, comparing every body's `uProg`:
**0 mismatches**, and **0 drift** while held at any point (30 frames of hold,
per point, per direction). Self-ignition-free by construction and by
measurement.

## 8.8 Gates

- **Wobble is real** — screenshot sequence after a clone poke (t+0.089 /
  +0.248 / +0.429 / +0.897 / +3.66) plus the per-frame angle trace; and the
  species-body `uWobR` trace in §8.4. Both settle in ~3 s.
- **Ripple** — mid-wave frame at t+0.089, with `uPulseC` on the narrow-phase
  hit point (−9.28, 1.39, 3.13) and `uPulseP` (1.4, 1.5, 1.2).
- **All four targets correct**, each verified by uniform readout:
  | tapped | `uPulseP` | where | who answered |
  |---|---|---|---|
  | clone | (1.4, 1.5, 1.2) | narrow-phase point on its own shell | chapter (wobble + ripple + 11 spores) |
  | species body | (1.4, 1.5, 1.2) | proxy point on the body | chapter (shader wobble slot id 2 + ripple + 10 spores) |
  | hero | (1.4, 1.5, 1.2) | (−2.12, 3.30, 0.40), its own cap | organism; chapter recorded 0 casts |
  | floor | (2.6, 0.33, 1.4) | (−9.71, −0.03, 0.59), ground | organism; chapter did not claim it |
  **No wrong floor-swell on a body tap.**
- **Touch path** (`pointerType: 'touch'`) — identical response, plus the hover
  glow correctly dropped afterwards (a finger leaves no pointer behind it).
- **Entry draw-on** — verified forward and reverse by screenshot sequence, and
  by the 0-mismatch / 0-drift sweep above.
- **Console clean over a full ride** (intro, p 0 → 1 → 0, 403 frames): the only
  entry is the site's pre-existing `favicon.ico` 404.
- **fps at the Final rest before/after** — table in §8.7. No measurable cost.
- **Goldens** — `mission` / `inspire` / `connect` / `owned` **byte-identical**
  (MAE 0.00/255, both sizes). `final@1440x900` 0.02/255 and `final@430x932`
  0.01/255 — inside frozen-frame determinism noise (warn 0.50, fail 1.00), so
  the rest frame did not move and no re-shoot was needed. Expected: every batch
  this chapter draws hangs at IDENTITY, so the shaders' `viewMatrix ×
  (modelMatrix × p)` is bit-for-bit the `modelViewMatrix × p` it replaced, and
  a parked `uPulseT` of 1e3 makes `pulseAt()` return exactly 1.0.
- Camera keys unchanged. Other chapters untouched. `scroll.js` still owns wheel
  and touch; nothing here calls `preventDefault()` or `stopPropagation()`.

## 8.9 Residuals

- The wobble is angle-faithful, which means it subtends **2–5 px** on near
  field bodies and under a pixel on the far T4 band. That is the honest reading
  of "the same as the hero" and it is what a real mushroom would do — but if
  Hannah wants the field to answer more visibly than the hero does, the single
  knob is `TAP_IMP` in `clones.js` (currently §10c's own 0.008), and it would
  be a deliberate departure from parity, not a fix.
- The batched bodies get the stalk's ring-down but not the hero's `capBend`
  TRAILING term (the cap whipping a beat late) — there is no second pivot in a
  merged batch. At 25–35 units it is well under a pixel. Clones get it in full.
- Only two batched bodies can wobble at once. A third poke inside three seconds
  cuts the quieter one off.

# 9 — Hover parity correction: the field stops lighting up — 2026-08-05

Hannah, at the Final rest: **"when I hover over the mushrooms at the bottom
they still light up."**

She is right, and §6 and §8.4 above were wrong. Both were written to the brief
"the field mushrooms should answer a hover and a click the way the hero does" —
but nobody checked the premise, and the premise is false. **The hero's body has
no hover response at all.** Its §11 region glow (`organism/furniture.js`
`createHighlights` / `setHighlight`) is driven *exclusively* by hovering the
three HUD callout labels in `main.js` (`co-inspire` → spores, `co-equip` →
stem, `co-connect` → ground). Raycasting the hero's own body with a pointer
does nothing whatsoever. The one gesture the hero's body answers is a **poke** —
§10c's wobble, light ripple, cap-tap spore shed and haptic tick — and there is
no brightness term anywhere in it.

So "the way the hero does" means: **hovering a field mushroom does nothing;
only a poke answers.** That is now what happens.

## 9.1 What was removed

| Where | Gone |
|---|---|
| `clones.js` | `HOVER_GAIN`, `CLICK_SECS`, `CLICK_GAIN`, `hoverTerm()`, `clickTerm()`, `easeHover()`, `isWarm()`; the per-body `{h, tgt, clickT}` state; the `(1 + glow)` factor on every clone's opacity write |
| `world.js` | the whole `HOT_GLSL` block (`hotAt()` and the `uHotId` / `uHotAmt` / `uTapId` / `uTapAmt` uniform quartet); the `b *= 1.0 + hotAt();` line in **both** `STRAND_VERT` and `POINT_VERT` |
| `ring.js` | the `hovered` / `tapped` slots, the hover-diff block, the per-frame glow-easing loop over every warm body, and the two uniform publishes |
| `interact.js` | the `pointermove` and `pointerleave` listeners, the `RAY_S` throttle, the `px/py/dirty/acc` cursor state, the `hover` slot, `tapPending`/`tapTouch`, and **`poll()` entirely** — the picker now has no per-frame entry point and holds no state at all |

The **click brightness swell went too**, not just the hover. §10c has no
brightness term, so a tap-triggered glow had no hero counterpart either. The
poke's four answers are the whole response, and `ring.js`'s §POKE comment now
says "FOUR, and no fifth".

**The DOM hotspot chips and their hover popovers (`e20f7ff`) are untouched** —
those are UI labels, the same thing the hero's own callouts are, and Hannah is
not objecting to them. Connect's three hub anchors keep their hover response
for the same reason: they are labelled interactive nodes with chips, driven
through `setHot` from `ui.js`, exactly the hero-callout precedent.

## 9.2 The `aHot` channel survived, renamed, with its hazard intact

The vertex channel did **not** die with the glow: the poke's shader wobble
slots still need to name a body. It is renamed **`aBody`** (it names a body; it
no longer has anything to do with heat), declared inside `WOBBLE_GLSL` — now
its only reader — and `ring.js`'s `hotId` / `nextHotId` / `hotMembers` are
`bodyId` / `nextBodyId` / `pokeMembers`.

**The −999 discipline is unchanged and now load-bearing on its own.** `aBody`
is −1 for every vertex that is not a fruiting body (terrain, trees, root stubs,
ground glows), so an idle wobble slot parked at −1 would match all of them —
and a wobble slot carries a *rotation*, so one stale radian on the terrain is a
whole floor sliding sideways. That bug was found once already. `WOB_IDLE`
stays −999; no member ID is ever −999. The old comment justified −999 partly by
contrast with the glow channels ("they get away with −1 because their amplitude
is zero when idle") — that clause is gone with them, and the constant now
stands on the wobble's own reasoning.

## 9.3 The tap resolves itself now (and it is cheaper)

The narrow phase was gated on "the body currently hovered". With no hover to
read, `onUp` resolves the body directly inside the `pointerup` event: broad
phase (proxy cones) → hero-shell yield → narrow phase on the one hit candidate
→ `gate.onTap`. Same work, same ordering guarantees (`interact.js` §ORDERING is
untouched), one event.

Measured at the Final rest, 52 proxy cones, this machine:

| | before | after |
|---|---|---|
| broad phase, per pointer-move poll | **0.094 ms × ~11–14 Hz**, continuously, whether or not anything was ever tapped | **none — the listener is gone** |
| broad phase, per tap | (also ran) | 0.164 ms (warm mean, 25 casts) |
| narrow phase, per tap | 1.089 ms | 1.746 ms (warm mean, 13 casts) |
| whole `pointerup` handler, clone tap | median 1.3 ms / mean 1.73 ms | median 1.9 ms / mean 1.69 ms |

The tap path is unchanged in cost — it always did both phases inside the event.
What went away is ~1.0–1.3 ms/s of main-thread time spent polling for a hover
nobody asked for, for as long as the cursor moved over the epilogue.

## 9.4 Gates

- **Resting-uniform proof.** Pointer walked slowly across **ten known body
  centres** (5 clones + 5 batched species bodies, screen positions projected
  from each member's own `aim` anchor), dwelling 900 ms on each, 373 frames
  sampled: `uWobId` held **exactly `[-999, -999]` on every frame**; the glow
  uniforms are **absent from the shipped uniform set entirely** (`uHotAmt` /
  `uTapAmt` / `uHotId` / `uTapId` no longer exist); and `pickStats()` was
  **identical before and after the sweep — 2 broad casts, 1 narrow cast, i.e.
  the picker did literally zero work while the pointer crossed ten mushrooms.**
  For contrast, the same sweep before the change drove `uHotAmt` to **0.658**
  across member ids 26/20/2, and multiplied one clone's ten material opacities
  by **2.465×** (0.90 → 2.219).
- **Clone-opacity control.** Sweep-window vs idle-window per-material maxima are
  statistically indistinguishable from two idle windows (idle-vs-idle control:
  top 1.634, median 0.9998; sweep-vs-idle: top 1.758, median 1.0001) — the
  residual is the twinkle and camera drift, not a pointer.
- **The poke, all four parts, both constructions.** Clone (member 4):
  `uPulseP` **(1.4, 1.5, 1.2)** — the body-poke shape, never the floor ping's
  (2.6, 0.33, 1.4) — `uPulseT` rewound 8.04 → 0.20; ring-down 0.251° → 0.409°
  → 0.470° → **0.479° peak** → 0.418° → 0.276° → 0.126° → 0.061° → back up
  through 0.185° → 0.272°, a clean damped oscillation through zero; 11 spores
  shed. Batched species bodies: tapping `bodyId` 16 then 10 put them in wobble
  slots — `uWobId` **[16, −999]** then **[16, 10]**, idle slot correctly parked
  at −999 throughout — both ringing independently, 33 spores live.
- **Touch path.** `pointerType: 'touch'` tap → `navigator.vibrate(6)` fired
  (spied), ripple + wobble + spores identical, and nothing "hovered" first
  because there is no hover to have.
- **Wobble magnitude.** Poked cap apex swings **1.42 px** peak at the nearest
  body — angle-faithful, as §8.9 already recorded. A number is the right
  witness here; a screenshot pair at this amplitude is not legible, and that is
  by design, not a regression.
- **Hero regression (hero page).** Across all 276 hero material opacities:
  pointer swept over the hero's **body** → max ratio **1.0000** (nothing
  happens, as specified); hovering the **`co-equip` callout** → **1.5774** (the
  stem region lights); releasing it → back to **1.0000**.
- **Scrub p 0.78 → 1.0 → 0.78, both directions** (under `?steady=1`, which
  exists for pose sampling): `uPull` hysteresis **0.0039**, clone `uProg`
  (the entry draw-on) **0.0134**, `uAmount` **0.0171** — reversible to noise.
  Draw-on reveal intact: `uProg` sweeps 0.296 (`DRAW_LO`) at p 0.78 → 2 (fully
  drawn) at p 1.00 on all 240 clone materials. No self-ignition. The larger
  clone-*opacity* spread (0.713) is **not** direction-dependence: standing still
  at a single p with the camera never moving drifts **0.518** over the same gap,
  so it is the twinkle plus the travelling growth-front pulse, both pre-existing
  and both time-based by design.
- **Console clean** over a full ride (p 0 → 1 → 0, pointer wandering over the
  canvas the whole way): zero errors, zero warnings, zero rejections.
- **Frame time at the Final rest**, fresh loads, like-for-like (the change was
  stashed to measure the other arm): idle **39.61 → 38.70 ms** mean
  (p50 39.3 → 37.7), pointer-sweep **41.33 → 41.40 ms**. Within this machine's
  noise; removal costs nothing.
- **Goldens.** `mission` / `inspire` / `connect` / `owned` **byte-identical**
  (MAE 0.00/255, both sizes). `final@1440x900` 0.02/255, `final@430x932`
  0.01/255 — inside frozen-frame determinism noise (warn 0.50, fail 1.00). The
  resting look is unchanged by removing a hover state, so **no re-shoot and no
  provenance entry**. `capture.py --check`: PASS, worst MAE 0.02/255.

## 9.5 Residual

`ring.js`'s `pokeMembers` sweep on retire (`for (const b of pokeMembers)
clearTap(b)`) is belt-and-braces: only a body holding one of the two wobble
slots can have non-zero tap state, and a slot is always released through
`clearTap`. It is 28 visits once per retire, so it stays — but it is not
load-bearing, and anyone tightening this loop should know that.

---

# 10 — Individuals, not copies: variation as a deformation

**Date:** 2026-08-05. **Asked by Hannah, on the shipped field:**

> "the mushrooms at the end seem too similar to one another, can you work on
> mixing up a few elements of them like their cap size and shape, angles, etc.
> the squiggles on the top of the cap, the stalk height, and base, etc. etc.
> Make them each their own unique thing and make the whole piece work
> cohesively"

## 10.1 Why they were identical, and why that could not be undone

She is describing the exact price of §7's step-back, and the price was worth
paying twice over. A near member is a LITERAL CLONE: the hero's own
`BufferGeometry` objects re-drawn under another matrix, sharing most of their
uniforms with the hero's own instances. That is why round 3 finally read as the
right creature after two rebuilds were rejected — and it is why every body in
the near band is one shape. They *are* the same vertices. A uniform scale, a
yaw and a few degrees of lean were the only things that had ever differed.

So variation could not come from the build. Reintroducing a parametric builder
for the near band is exactly what §7 threw out, and doc 18 §1's own table
("size and detail vary; proportions do not") is what made the field uniform in
the first place. The only remaining place to put an individual's identity is
**between the shared vertex and the screen** — a per-body DEFORMATION, seeded
from the body's index, applied in the vertex shader. New module:
`journey/chapters/final/variation.js`.

This supersedes §1's second row *only* for proportions, and it is worth being
precise about what survives: the profile LAW is untouched. There is still one
cap dome curve, one rim line, one margin droop and one stem taper, and they
still live only in `anatomy.js` / the hero's own buffers. What varies now is
the proportions that law is evaluated at.

## 10.2 The axes and their ranges

One seeded stream per body (`makeRng(seed ^ 0x2b1e)` — its own stream, like
`scaleFor`'s `^0x9e37` and the sway's `^0x51a7`, so adding it could not shift a
single value placement already draws). Measured spread over all 72 bodies:

| axis | slot | measured range | reads as |
|---|---|---|---|
| `capW` | A.x | 0.841 – 1.159 | broad parasol / tight bell |
| `capH` | A.y | 0.735 – 1.228 | flat plate / high dome |
| `stemH` | A.z | 0.841 – 1.159 | squat / long-stalked |
| `stemW` | A.w | 0.825 – 1.193 | thick / slender stipe |
| `flare` | B.x | 0.051 – 0.287 | bulbous foot / clean foot |
| `twist` | B.y | −0.317 – 0.319 rad | helical shear up the stalk |
| `rimAmp` | B.z | 0.035 – 0.102 | the wavy margin, in plan |
| `rimDrop` | B.w | 0.031 – 0.109 | ...and in height |
| `crumpAmp` | D.x | 0.056 – 0.189 | the squiggles on the cap |
| `rimLobes` / `crumpLobes` | C.x / C.z | 3–7 / 3–9 | how many waves |
| `leanK` | (not in the map) | 0.814 – 1.596 | widens the existing lean |

**Correlation is what keeps it a species.** `capW`/`capH` come from ONE `broad`
draw, anti-correlated, and `stemH`/`stemW` from one `lanky` draw. In a colony a
cap that spreads wide is also flatter, and a stalk that runs tall runs thinner.
Rolling the four independently gave tall fat caps on tall fat stalks standing
next to small thin ones — a menagerie, which is the failure mode Hannah's
"work cohesively" names. A jitter term on the second of each pair stops the
correlation reading as a rule.

Two axes are deliberately low-frequency: `rimLobes` 3–7 and `crumpLobes` 3–9.
A high harmonic on a cap this size reads as noise on the mesh rather than as
the shape of the mushroom.

`leanK` is not part of the map — it multiplies the whole-body lean that doc 18
deliberately trimmed, widening it to ~9.5 deg worst case against the 11 deg
that round's screenshots rejected for opening the rim ellipse into a saucer.

## 10.3 The map, and the two masks that took the thinking

`varyPt(p)`, in the BODY frame (soil at the origin, +y up, hero units):

1. **vertical** — `mix(y·stemH, CAP_Y·stemH + (y−CAP_Y)·capH, mv)`
2. **radial** — `mix(stemW + flare·e^(−1.9y), capW, mr)`
3. **rim wave** — one harmonic, radial *and* vertical at the same lobe count
   and phase, windowed on to the outer cap by `edge = smoothstep(0.35, 1.0, r/CAP_R)`
4. **crumple** — an angular ripple in y over the dome, `× sin(π·u)` so it
   vanishes at both the apex and the rim, where the rim wave takes over
5. **twist** — `smoothstep(0, CAP_Y, y) · twist` about the axis

The obvious formulation of (1) and (2) — "stretch below `CAP_Y`, scale the dome
above it" — **shears the cap**, and the reason is worth recording. Stem and cap
overlap heavily in HEIGHT: the stipe runs to `STEM_TOP` 3.9, buried in the cap
so the joint is not butted, while the margin droops down past 2.9. Any mask
that is a function of height alone hands the drooping margin a different map
from the rim 0.25 units above it and pinches the cap edge. So:

- `mr = smoothstep(0.55, 1.20, r)` — **radial**, for the radial factor. The
  stem never exceeds r ≈ 0.56, a radial factor is a no-op near the axis anyway,
  and the margin at (r 2.3, y 2.9) and the rim at (r 2.35, y 3.15) therefore
  get the SAME factor. That is what stops the pinch.
- `mv = max(mr, smoothstep(3.55, 3.95, y))` — the height term exists only for
  the dome's centre, which sits at r = 0 and would otherwise be handed the
  stalk's map and lose the cap-height axis entirely. Above 3.95 both terms
  saturate, so the buried stem top and the apex share one map and the stalk can
  never grow out through the cap.

**Two fixed points, asserted rather than assumed** (`invariants()`, run over all
72 bodies): the soil seat `varyPt(0,0,0) = (0,0,0)` **exactly** (max offset
0.0), and the rim plane lands at `CAP_Y·stemH` at every azimuth whatever the
masks do — because the two vertical maps are equal at `y = CAP_Y` by
construction, so the blend cannot move it (max error **3.5e-10**).

## 10.4 Injection, and the consistency that is the whole risk

A body is fifteen drawables with thirteen materials. Deform the cap lattice and
not the cap SHELL and the body's lit outline stops agreeing with its own opaque
interior — a rim floating off a black cap, the most broken a thing in this
scene can look. Four mechanisms hold the line:

1. **One uniform set per body.** `varyUniforms(V)` is built once in
   `clones.add()` and the SAME four objects (`uVarA`–`uVarD`) are handed to
   every one of that body's materials. Not copied — the same object. A layer
   cannot disagree with its neighbour even for a frame.
2. **One frame, carried explicitly.** The first cut assumed the spine was flat
   and the guard said otherwise, which is the argument for having written it:
   **it is not**. `mushroom` carries the authored cap tilt (~8 deg about x) and
   a residual offset, so cap leaves live in a tilted, translated frame while
   stem leaves live in the body frame. Each layer therefore carries `uVarM` /
   `uVarMI`, the exact matrix from ITS geometry frame to the body frame;
   `varyPt` hops in, deforms, and hops back. `frameOf()` returns the parent's
   frame object unchanged when a node adds no transform, so there are exactly
   TWO frames per body, not fifteen.
3. **Three injection sites, one function.** organism's own `ShaderMaterial`
   sources are rewritten textually (`varyVertex`): every path to `position` —
   including `position + tang` / `+ tang2`, the dense-line coverage fade's
   neighbour probes — goes through `varyPt`, and a **residue check** refuses
   the patch outright if any path to the raw attribute survives. The stock
   `MeshBasicMaterial` shells and the rebuilt overlay net take the same GLSL
   through `onBeforeCompile` at `#include <begin_vertex>`.
4. **One guard, taken before the first body is built.** `probeVary()`
   test-patches every distinct shader source the walk will meet and checks every
   frame matrix is invertible. If ANY of them refuses, `varyOk` is false and
   **nothing** is deformed — clones and species band together, since `ring.js`
   reads `clones.varyOk` for both. Half a deformed body is not a degraded
   outcome, it is a bug; the only safe fallback is none at all.

**The shells had to stop being shared.** §2's table said "shared outright"; they
are now cloned per body (2 materials × 24 = 48). Zero extra draw calls — same
meshes, same count — and one extra program, since the cache key is constant
across the set. It also fixes a latent bug the sharing carried: a shared shell
material wears the hero's intro clipping plane and fade opacity, so a clone set
built during the hero's grow-in would have baked those in. `cloneShellMat` pins
the restored state explicitly.

**The species band** takes the same map on the CPU, at the ONE funnel every
distant stroke and point already passes through — `ring.js`'s `w()`. Same
argument, same guarantee: no layer of a batched body can miss it, because there
is no other way for a vertex to reach the batch. `species.js` emits body-frame
coordinates already multiplied by `scale`, so `w()` divides out, maps, and
multiplies back; the map's thresholds are hero units on both sides.

Three placement values follow the map so the world still agrees with it: the
pick proxy's radius and height (`capRadiusK` / `heightK` — the map's WORST case,
so a cone always brackets its body), the ground-merge stubs' seat radius
(`baseRadiusK`, or a bulbous-footed body's roots start inside its own flesh),
and the rim-plane height used by the elevation-occlusion shading.

## 10.5 How it composes with the poke and the draw-on

Both compose by construction, and neither needed a line changed:

- **The wobble.** For a CLONE the ring-down is a rotation of the `sway` GROUP,
  which sits ABOVE every deformed leaf — the deformation is in the leaf's own
  vertex shader, so the wobble rotates an already-deformed body. For a SPECIES
  body `world.js`'s `WOBBLE_GLSL` rotates the final world position about the
  body's stored base, and the CPU deformation happened at build time, upstream
  of it. Neither path can fight the other; they are in series.
- **The narrow phase** raycasts a body's real shells, which are deformed only in
  the shader, so the CPU hit point is the UNDEFORMED surface — up to ~15% of cap
  radius off on a strongly-deformed body. That is a lever arm and a ripple
  centre, and neither is perceptible at that error. `interact.js` already falls
  back to the broad phase's cone point when the shell cast misses, and the cone
  is sized off the map's worst case, so a tap on the visible edge of a widened
  cap still lands on that body.
- **The draw-on entry** (§8) is a per-vertex `aDraw` ordering against the body's
  own `uProg`; the deformation moves where a vertex IS, never when it inks. A
  body draws itself on in the hero's authored order, in its own shape.
- **The reveal choreography** is untouched: `uOpacity` per body, camera-pure in
  `uPull`, D16 intact. The deformation is static per body — it has no time term
  at all, so it cannot self-ignite anything.

## 10.6 Budget

Measured at the Final rest, 1280x800 dpr 1, `composer.render()` timed with
`gl.finish()`, arms **interleaved in one headless session** through a temporary
`&novary=1` switch (removed before commit):

| | draw calls | line segs | points | triangles | programs |
|---|---|---|---|---|---|
| before | 396 | 402,273 | 84,313 | 278,127 | 28 |
| after | **396** | **402,273** | **84,313** | **278,127** | **31** |

Nothing the frame submits changed — the deformation moves vertices that were
already being submitted. The three extra programs are the dense-line, point and
shell variants of the graft; the patched source is identical across all 24
bodies, so it is three for the whole set, not three per body.

Render time is the honest part. This machine was heavily loaded throughout
(load average 18–25, the live page open in a second browser), so the medians
are noise; the minimum is the only robust statistic, since contention can only
add time. Interleaved best-of-N minima across two runs (4 and 7 rounds):
**plain 2.66 / 2.78 ms, varied 3.50 / 3.95 ms** — call it **+0.8 to +1.2 ms**
at the rest, on a pose whose shipped envelope was 1.17–3.80 ms min inside a
16.7 ms frame. For scale, a variant with the two dense-line
tangent probes left UNDEFORMED (one `varyPt` per vertex instead of three)
measured *worse* than the exact version in the same harness, which is the
measurement telling you the deform is not where the time goes. The exact
version therefore stands: no fidelity was traded for a number the machine
cannot resolve.

## 10.7 Gates

- **Hannah's sentence, at the rest.** 1440x900, 1280x800, 375x812 and the
  end-hold at each: every body reads as its own — the near-left one broad and
  shallow with a visibly wavy margin, the one behind it high-domed, the
  near-right wide and low on a lumpy cap, the far band varied in the same
  language — and the field still hangs together as one colony. The hero keeps
  the frame as the largest and the cleanest specimen.
- **Outline vs solid, the risk this design is built around.** Verified two
  ways. By eye at 2x on several bodies: the cap's dark interior tracks the
  scalloped rim all the way round, with no far-side wires bleeding past it —
  which is exactly what an undeformed shell under a deformed rim would look
  like. And under STRESS: with every body forced to `capW` 1.55 / `capH` 0.50 /
  `rimAmp` 0.30 / `crumpAmp` 0.45 (a temporary patch, reverted), the bodies are
  grotesque and still **coherent** — lattice, gill fan, rim stack, stem mesh,
  point clouds and all four opaque shells move as one surface. If any layer
  were being left behind, that frame is where it would be unmissable.
- **Invariants**, over all 72 bodies: soil seat offset **0.0** exactly, rim-pin
  error **3.5e-10**.
- **The hero is untouched**, checked structurally rather than by eye: walking
  `groups.stem` and `groups.mushroom` finds **0** hero materials carrying a
  `uVar*` uniform, **0** carrying a patched shader source, and both hero shell
  materials still at `opacity 1 / transparent false / no clipping planes` with
  no injected cache key. Nothing is written back into organism's graph;
  everything is a clone.
- **Slow scrub p 0.78 -> 1.00 -> 0.78**, 45 settled steps in one live session
  (samples wait for `camera.position.x` to stop gliding — the first cut of this
  gate sampled a moving camera and was measuring the glide): forward vs reverse
  at the same p, worst `uProg` delta **0.000000**, worst camX **1e-4**. The
  `uOpacity` spread of 0.51 is the pre-existing twinkle and growth-front pulse,
  both time-based by design — §9's gate records the same thing.
- **The draw-on entry, frozen ladder** (`?capture=<p>`, forward then reverse,
  the deterministic path): dark at arm — p 0.80/0.82/0.84 are **24 undrawn, 0
  shells, maxOp 0.0224** (the 7% ember whisper under the arm fade) — then
  0.855 (3 drawing, 5 shells), 0.865 (3 drawing / 2 drawn, 17), 0.875 (5/5,
  20), 0.890 (4/17, 80), 0.905 (1/23, 96). Forward and reverse land on the
  **identical** state at every p, worst `maxOp` delta **0.000000**. No
  self-ignition; a reverse scrub un-inks the field stroke by stroke.
- **Poke.** Aimed at the most strongly deformed clone (body i=0, `capW` 1.140,
  `capH` 0.766, `rimAmp` 0.097 on 5 lobes, `twist` 0.161): the narrow phase
  cast that body's own shells (**1 cast, 8.5 ms**) and it rings down —
  0.066 -> 0.461 -> 0.369 -> 0.037 -> 0.258 -> 0.281 -> 0.087 deg over 2.8 s,
  the §10c oscillator sampled off-period. The wobble rotates the `sway` group
  above the deformed leaves, so it reads exactly as it did before.
- **Console clean** over a full ride (intro, forward and reverse scrub at
  1440x900, trap installed before the app loads): **0 entries**.
- **Goldens.** `mission` / `inspire` / `connect` / `owned` **byte-identical**
  (MAE 0.00/255, 0.0% px > 8, both sizes) — which is the leak test that
  matters, since `chapters/inspire` parents its own group onto the hero's
  mushroom and would show any shared-material mutation immediately. `final@*`
  measured 5.37 (desktop) / 1.75 (mobile) against the pre-variation goldens —
  the intended change — and was re-shot in this commit with manifest
  provenance.

## 10.8 Residuals

- The narrow phase's hit point is the UNDEFORMED shell (§10.5). Correct enough
  for a lever arm and a ripple centre; if a future round wants it exact, the
  map is analytically invertible only by iteration, so the cheap answer would
  be a coarse deformed proxy mesh rather than an inverse.
- `varyPt` is evaluated three times per dense-line vertex (the vertex and its
  two coverage-fade neighbours). Measured, that is not where the time goes —
  the one-call variant was no faster on this machine — but on a slower GPU it
  is the first thing to try, and dropping the neighbour deform costs only
  accuracy in the coverage fade, never in the silhouette.
- `bodyVariation` draws from its own stream, so the numbers here are stable
  under any future addition to the placement streams. They are NOT stable under
  a change to `makeRng` or to `MEMBERS`' indices; if either moves, every body's
  shape moves with it, and the `final@*` goldens go with them.

---

# 11 — The poke stops throwing, and the entry stops going black

**Date:** 2026-08-06. **Asked by Hannah, two reports, one sitting, both about
the FINAL field:**

> "in the final section, when I press on the other mushrooms, they have this
> kind of different effect on them. When I press them, there's this kind of
> stuff that jumps out of the mushroom — can you stop that? They should all
> have spores coming from them like the other one, but they shouldn't have a
> different poke effect. They should have the same poke effect as the current
> one."

> "there's also a weird thing where they have a different entry animation when
> they come in — they kind of turn black. It's just a weird thing. Why can't we
> just make them one by one have the same entry animation as the main one does,
> the hero of the page, so they kind of pop up like that, the same way, rather
> than having a different animation effect."

Both reproduce. Both are cases of this chapter answering a question the hero
had already answered, in its own words instead of the hero's.

## 11.1 Reproduction — (A), the thing that jumps out

Poked the nearest clone (ring member 4, 6.15 units, scale 0.389) at the Final
rest by dispatching the organism's own tap gesture at its projected `aim`, then
tracked the eleven shed particles frame by frame out of the live buffers, and
ran the identical measurement on the HERO's own §10c shed (`shedSpores(28)` at
p 0) as the reference. Same metric both sides: mean per-particle speed, its
component along the outward radius from the body's axis, and its vertical.

| | field poke, at HEAD | hero §10c shed |
|---|---|---|
| release speed (age ~0.07 s) | **0.452** units/s | 0.141 |
| ...its OUTWARD RADIAL part | **+0.268** units/s | +0.005 |
| ...its vertical | **−0.361** units/s | −0.140 |
| settled drift speed | 0.24 | 0.10 |
| net travel by ~5 s | **1.145** units | 0.311 |
| net RADIAL travel by ~5 s | **+0.560** units | +0.097 |
| sprite size band (world units) | **0.063 – 0.153** | 0.019 – 0.090 |
| rendered sprite, screen px p50 | **5.24** | 1.70 |

**Fifty times the hero's outward velocity and three times its sprite.** A poked
hero lets go of its spores; a poked field body threw them. "Stuff that jumps
out of the mushroom" is a precise description of an impulse the hero does not
have, and no amount of tuning it down makes it the same gesture.

## 11.2 Reproduction — (B), the bodies that turn black

Scrubbed p 0.80 → 0.94 on the live path (`?nosnap=1`, `scroll.setProgress`,
holding each point until `camera.position.x` stops gliding — doc 10.7's own
trap) and read, per body per stop: its draw progress, its brightest lit
material, and whether its four opaque §5 shells were standing.

They were, long before the body had any light of its own:

| p | bodies with all shells opaque AND own light ≤ 0.12 |
|---|---|
| 0.850 | 1 |
| 0.860 | 3 |
| 0.865 | 4 |
| 0.880 | 10 |
| **0.885** | **15 of 24** |
| 0.890 | 15 |
| 0.905 | 3 |

Confirmed in pixels, by hiding only those bodies' shells and re-shooting the
same frame: at p 0.885 body 21's own screen footprint carries **24.5** mean
luminance with its shells and **72.4** without — the shells are removing
**66%** of the light in the body's own footprint while the body's brightest
layer sits at **0.034**. Body 9 loses 55%, body 6 at p 0.905 loses 30%.

And plainly, in the frame: the p 0.885 and p 0.905 stills show matte,
lightless, opaque mushroom cutouts standing among the lit ones. That is
Hannah's sentence, exactly.

## 11.3 Root cause (A): the reference this file cited was deleted

`chapters/final/shed.js` released a spore with an impulse — `out = 0.16 +
rand()*0.16` along the radius and `−(0.26 + rand()*0.16)` downward — and then
relaxed it over 1.4 s toward a fixed wind speed of **0.24 units/s**, which is
an order of magnitude above the drift the hero's own dust travels at. Its
sprite band was its own too, `0.045 + rand^1.6 * 0.115`.

Both departures were argued for in the file's own header, and the argument
pointed at **`sky.js szBase * 1.9`** — "the sizes sit in the same band the
chapter's spore SKY already uses at these distances". **836d373 deleted that
expression.** It put the chapter's entire spore sky on the hero's own size draw
(`pow(rand,1.8)*0.072 + 0.019`), its `vShrink`, its twinkle and a re-banded
depth-of-field, *precisely because* the old band rendered every dot at the
`MIN_PT` floor at full brightness and read as a **starfield rather than as
spores** — the finding that commit exists to record. `shed.js` was the one
particle layer in the chapter not brought across, so its stated justification
no longer existed and its numbers were left standing on nothing.

The ejection is older than that (it shipped with e493737, to billow the shed
clear of the cap so this chapter's high camera could see it). But size and
motion together are what "different substance" means, and after 836d373 this
file was the only thing in the frame still made of the old stuff.

## 11.4 Root cause (B): the draw finished before the light started

Two constants, working exactly as written, producing a state the hero never
enters.

1. **`DRAW_LEAD` 0.20 > `REVEAL_W` 0.16.** §8.7 set the entry draw to run a
   whole reveal-width AHEAD of the kindle, so that "the last stroke lands
   before the first ember" and the shipped unlit-body-in-the-dark composition
   survived. Sound about the STATE; wrong about the ANIMATION. What it produced
   was a body that inked itself in at the **7% ember whisper** — ink too faint
   to see — and then stood there fully drawn and unlit.

2. **The shells hard-switch, on a test the whisper already passes.**
   `lit = v > SHELL_ON (0.02)`, and the 7% whisper alone puts `v` at 0.03–0.08
   for every armed body. So `lit` is true from the moment the chapter arms, and
   the only remaining gate is `prog ≥ 0.42 / 0.644` — crossed a whole
   reveal-width before the body has any light. Four opaque `#040100` meshes,
   full opacity, over a body at 3%.

The hero has no such phase and cannot: on the landing page its strokes ink in
at FULL opacity with the tip ember riding the drawing front, and `intro.js`
FADES each shell group in *while its own region is being stroked*
(`_shellFade`, stem over uProg 0.30…0.54, cap over 0.574…0.714). **The hero's
ink is its light, and its solid follows its ink.**

§8.7 could not copy the fade because a clone SHARED the hero's shell materials
and could only switch its own copies on and off — hence the midpoint switch.
**That constraint died at 66d1bed**, which gave every body its own two shell
materials (`cloneShellMat`, 48 for the set) so a deformed body's solid could
follow its own outline. The reason for the switch was gone; the switch stayed.

## 11.5 What changed

`shed.js`, `clones.js` (+ one line in `ring.js`, one comment in `world.js`).
**`organism/*` is untouched** — both fixes are chapter-side, which is where
they belong: neither is a defect in the organism's own accounting.

**(A) The poke's shed is the hero's shed.**

| | before | after |
|---|---|---|
| release velocity | radial `0.16–0.32` + down `0.26–0.42` | **none** — the hero's own `BREEZE_DIR * sp`, `sp` on [0.028, 0.083] |
| integrator | relax toward a fixed 0.24 units/s over 1.4 s | organism/spores.js's own drift, term for term: `k = dt*60`, `gust = 0.72 + 0.28·breeze(t)`, `carry = gust·(0.45 + 0.55w)·k`, the `−0.0026·(1−w)·k` fall, both turbulence terms, `SETTLE` 1.6 s |
| sprite size | `0.045 + rand^1.6 · 0.115` | **`0.019 + rand^1.8 · 0.072`** — the hero's own draw |
| twinkle | none | the hero's `0.85 + 0.15·sin(t·1.4 + seed·7)`, on size AND light |
| depth | none | the hero's DOF on sky.js's own band (`FOCAL_D` 10.5, `FOCAL_R` 14) |
| gain | 2.2 | **2.4**, sky.js's `SPORE_GAIN` |
| seat | `u` 0.72–1.00 of cap radius, under the gills | `u` **0.92–1.12** — a band straddling the MARGIN |

`breeze()` is now exported from `clones.js` rather than mirrored a third time.

**The seat is the one number here that is not the hero's, and it is deliberate.**
The hero draws its release on `u = 0.55 + rand^0.6·0.45` of the cap — the whole
hymenium — which is right for a lens at the hero's own rim level, looking
straight into the gill space. The Final rest camera is not: it stands ~11° ABOVE
the nearest member's rim plane, so a body's own opaque cap shell covers its
entire underside and a release seated at u 0.6 is emitted into a box the
visitor cannot see into. That was the true half of e493737's reasoning, and it
is answered by moving the SEAT, not by inventing a launch. The poke's answer is
the motion; placement was always this file's business.

**(B) The entry is the hero's entry.**

- **`DRAW_LEAD` is gone.** `d = smooth01((pullRaw − reveal) / 0.16)` — the draw
  now runs on the kindle's own front at the kindle's own width, so a body inks
  itself in AS it lights up. There is no drawn-and-dark window left to be black
  in. Still pure in the camera-pure `pullRaw`, so reverse un-inks it exactly.
- **The shells FADE, on intro.js's own windows**, read digit for digit off
  `_shellFade` and applied to this body's own `prog`: stem over 0.30…0.54, cap
  over 0.574…0.714, `transparent = k < 1; opacity = k; visible = k > 0`. At
  k = 1 that is byte-identical to the shipped parked state, which is why the
  rest frame does not move.
- `SHELL_ON` stays as the outer gate, so a retracting body drops its shells
  outright rather than easing over frames the retiring chapter will not run.
- **The fade is guarded, not assumed.** `add()` collects each group's material
  set and asserts (a) the materials are OURS — without the variation graft the
  shells are the hero's own, shared outright, and writing `.opacity` on one
  would reach into organism's graph — and (b) the two groups do not share a
  material, or one region's fade would drive the other's. As built they cannot:
  organism §5's three cap shells share one `MeshBasicMaterial` on `mushroom`
  and the stem core has its own on `stemGroup`. If either test fails the body
  falls back to the shipped midpoint switch. Never a half-applied fade.

## 11.6 Measured

**The poke, against the hero, same metric both sides:**

| | before | **after** | hero |
|---|---|---|---|
| release speed | 0.452 | **0.145** | 0.141 |
| outward radial | 0.268 | **0.0025** | 0.0052 |
| vertical | −0.361 | **−0.144** | −0.140 |
| net travel ~5 s | 1.145 | **0.259** | 0.311 |
| net radial ~5 s | 0.560 | **0.062** | 0.068 |
| sprite band | 0.063–0.153 | **0.019–0.075** | 0.019–0.090 |

**And on screen**, in 836d373's own currency — the shipped shader's product
evaluated over the live buffers at the Final rest:

| | before | **after** | hero shed at p 0 |
|---|---|---|---|
| sprite, screen px p50 | 5.24 | **1.76** | **1.70** |
| p95 | 8.74 | 5.20–6.45 | 2.27 |
| per-particle output, mean | 0.95–1.42 | 0.56–0.78 | — |
| screen energy (output × area) | 333–475 | 60–123 | — |

The median sprite now sits on the point shader's own `MIN_PT` floor — which is
where 95% of the hero's plume sits, at both ends of the ride — with a scatter
of larger sparks from the DOF growth at the near band. The puff carries about a
quarter of the light it did, which is the correction: it was over-sized and
over-bright against a frame whose every other particle had been put on the
hero's laws.

**The entry, on the deterministic frozen ladder** (`?capture=<p>`, one page
load per rung, 19 rungs 0.845–0.935, the same list visited ascending and then
descending):

| p | BEFORE undrawn/drawing/drawn · shells · **BLACK** | AFTER |
|---|---|---|
| 0.850 | 22/2/0 · 1 · **1** | 24/0/0 · 0 · **0** |
| 0.860 | 20/3/1 · 3 · **3** | 24/0/0 · 0 · **0** |
| 0.865 | 19/3/2 · 5 · **4** | 23/1/0 · 1 · **0** |
| 0.880 | 4/15/5 · 15 · **10** | 19/3/2 · 5 · **0** |
| 0.885 | 4/14/6 · 20 · **15** | 19/1/4 · 5 · **0** |
| 0.890 | 3/4/17 · 20 · **15** | 18/1/5 · 6 · **0** |
| 0.895 | 1/3/20 · 22 · **10** | 4/15/5 · 19 · **0** |
| 0.905 | 0/1/23 · 24 · **3** | 3/4/17 · 21 · **0** |
| 0.915+ | 0/0/24 · 24 · 0 | **identical** |

- **Black body-samples across the ladder: 72 → 0.**
- **Minimum own-light under a ≥50% opaque shell: 0.033 → 0.167.** Under a FULLY
  opaque shell, over an 840-frame continuous ride: **0.029 → 0.216.**
- **Dark at arm is stricter than before**: 24 undrawn through p 0.860 (was
  p 0.845), because a body can no longer ink in ahead of its own light.
- **Rows from p 0.915 are identical between the arms** — the rest frame is the
  shipped rest frame.

**One by one.** Continuous ride, every frame sampled from an animator
registered after the chapter's, keyed on camera x — each body's draw front,
from first stroke to last:

```
body  0  starts −9.05  half −9.48  done −9.91
body  1        −9.36       −9.79       −10.22
body  2        −9.66       −10.09      −10.55
body  3        −9.91       −10.34      −10.78
body  4        −10.22      −10.60      −11.07
bodies 9…23    −11.12 … −11.59, in four distance sub-bands
body  5        −12.28      −12.64      −13.25
body  6        −12.66      −12.99      −13.51
body  7        −12.64      −13.12      −13.51
body  8        −12.99      −13.39      −13.89
```

Twenty-four bodies arriving in sequence over 4.8 units of camera travel, each
taking ~0.9 units to ink itself in. Bodies at the same distance arrive
together, which is what a radial front does.

**Reverse mirrors exactly.** On the deterministic path, the same 19 rungs
visited ascending then descending: worst draw delta **0.0**, worst opacity
delta **0.0**, worst shell-opacity delta **0.0**, worst camera-x delta **0.0**
— bit-identical on all 24 bodies at every rung, in both directions.

*A note for whoever measures this next.* The live-scrub arm of this gate
reported a ~0.1 "hysteresis" that is not one. On a moving scrub the chapter
reads `camera.position.x` and writes `uProg` inside its own animator; anything
sampling the two from outside that order reads them across a frame boundary,
and the sign of that skew flips with direction — so it shows up doubled and
looks exactly like hysteresis. Doc 10.7 hit the same trap from the other side
("the first cut of this gate sampled a moving camera and was measuring the
glide"). Sample settled, or on the frozen path, or not at all. Comparing raw
`uProg` also reports a spurious 1.107 at the park discontinuity, since 2 and
DRAW_HI 0.893 are byte-identical in the shader; compare the draw parameter.

## 11.7 Gates

- **Both symptoms reproduced first**, numerically and in pixels — §11.1, §11.2.
- **Poke parity measured, not asserted**: the table in §11.6, field against
  hero, in the same units, plus the on-screen sprite comparison. A still cannot
  show motion, so neither claim rests on one.
- **Entry ridden forward AND backward with per-frame sampling**: 840 frames,
  732 with the chapter live, **0 frames with any body black**; plus the frozen
  19-rung ladder in both orders at **0.0** delta.
- **Console clean over a full ride** — p 0 → 1 → 0 with four pokes at the rest
  (one a `pointerType: 'touch'`), trap installed before the app loads, 801
  frames: **0 errors, 0 warnings, 0 rejections**, the two pre-existing info
  lines only. **0 non-finite values** in any clone's `uProg` or any shed
  particle across all 801 frames. `shed.cool()` verified: 21 live particles at
  the rest, 0 after the reverse ride.
- **`capture.py --check`: PASS, worst MAE 0.18/255** (warn 0.50, fail 1.00).
  `mission` / `inspire` / `connect` / `owned` **0.00/255, byte-identical on
  disk**. `final@1440x900` 0.18 and `final@430x932` 0.13 — and **the control
  says those are not ours**: the identical check run on the unmodified tree
  gives **exactly 0.18 / 0.13**. This machine's frozen-frame noise on the final
  pose, not a moved frame. No golden moved, so no re-shoot and no provenance
  entry.
- **Nothing regressed**: b2c9584's conservation floor and 0d9bcbd's no-hover
  rule are untouched (no brightness term was added anywhere); 66d1bed's
  per-body deformation is untouched and is what MAKES the shell fade legal;
  836d373's particle match is what part A finally extends to the last layer.
  The reveal laws hold — camera-pure, dark at arm (stricter), reverse-retract
  (bit-exact). No camera change.

## 11.8 Residuals

- **The puff is now as quiet as the hero's, because it is the hero's.** Eleven
  hero-sized spores off a 0.389-scale body: median sprite at the `MIN_PT` floor
  with about three of the eleven at 5–6 px. That is what a rap on a small
  fruiting body of this species does, and it is what "like the other one"
  asks for. If Hannah wants the field to answer more visibly than the hero
  does, the knob is the count floor in `burst()` (currently 10) — and it would
  be a deliberate departure from parity, not a fix. Do not reach for the size.
- **The species BATCH bodies still have no draw-on** — they brighten but do not
  ink in, because a merged batch has no per-body draw state. They sit at 25–35
  units where a stroke is under a pixel, and §8.7 accepted the asymmetry
  already; it is more visible now only in the sense that the clones' entry is
  more visible. If it ever reads, the fix is an `aReveal`-keyed draw term in
  `world.js`'s `STRAND_VERT`, not a promotion to clones.
- **The stem shell fades in before the cap exists** (prog 0.30…0.54, with the
  cap starting at 0.574), so its buried top is briefly a small dark cap against
  the haze. The hero solves this with a rising clip plane (`intro.js`
  `_stemClip`); a clone would need one world plane per body, since clipping
  planes are world-space and every body stands at its own place, scale and
  lean. Strictly better than what it replaces (which stood there at full
  opacity), a few pixels at these distances, and left as the one piece of
  intro.js's shell choreography not carried across.

---

## 12. One at a time (2026-08-07, Hannah's "slower, one at a time")

**The ask, verbatim.** *"See in the final position, can you make it so the
mushrooms animate in slower one at a time in a nice elegant manner."*

§11.5 gave every clone the hero's own entry — it inks itself in as it lights
up, on the camera-pure front, and §11.6's ride table read *"twenty-four bodies
arriving in sequence over 4.8 units of camera travel, each taking ~0.9 units to
ink itself in."* That table is true and it is also where this complaint was
hiding: it reports the ENDPOINTS and never the spacing.

### 12.1 It was not a sequence. Fifteen of the twenty-four were one event

Every drawn body's threshold, recovered exactly rather than read off the
source. `prog = DRAW_LO + d·(DRAW_HI − DRAW_LO)` and
`d = smooth01((pullRaw − reveal)/DRAW_W)`, and `smooth01` inverts in closed
form, so a single mid-draw sample gives a body's `reveal` to full precision; a
ladder of frozen `?capture=` rungs covers all twenty-four. Shipped tree:

```
ring    0.148 0.201 0.250 0.294 0.337
field   0.489 0.514 0.515 0.519 0.521 0.523 0.532 0.537 0.539
        0.543 0.551 0.551 0.560 0.560 0.568
ring    0.683 0.723 0.737 0.790
```

**Fifteen bodies inside 0.0795 of uPull, against a draw width of 0.16.** They
overlap each other by 80%. Median gap between consecutive field arrivals:
**0.005**. On the frozen ladder that reads as a wave with a hard edge on both
sides of it:

| p | undrawn / drawing / drawn |
|---|---|
| 0.890 | 18 / **1** / 5 |
| 0.895 | 4 / **15** / 5 |
| 0.900 | 4 / **15** / 5 |
| 0.905 | 3 / **3** / 18 |

Fourteen bodies start inside one 0.005 rung and twelve finish inside another.
That is not twenty-four arrivals, it is three: a near group, a wave, a far
group. "Rather than as a wave that reads as simultaneous" is exactly right.

**The cause is arithmetic, not taste.** `reveal` was a straight line on DEPTH
across the field's whole 15..45 range — but only bodies inside `CLONE_DIST`
(24) are clones, and clones are the only bodies that draw themselves on. So all
fifteen drawn field bodies lived in the first third of that line. And the depth
distribution makes it worse: `dist = base + rand^1.30 · range` deliberately
piles the population up at the near end (a field wants more bodies close than
far), so ten of the fifteen land within four units of each other. **Re-running
the map with a knee at the clone seam was tried first and is not enough** — it
still left five bodies inside 0.013, because a monotone function of a clumped
input is a clumped output whatever its slope.

### 12.2 Order from depth, spacing from rank

So the two are separated. Each band is sorted by depth and its members laid out
**evenly across the band by rank**:

```js
band(cand.filter(c => c.tier === 3), REV_LO, REV_KNEE - REV_JIT);   // the drawn band
band(cand.filter(c => c.tier === 4), REV_KNEE, REV_HI - REV_JIT);   // the batched tail
```

The arrival order is exactly the order depth gives, so nothing about the
reading changes — but consecutive bodies are now evenly separated:

```
0.148 0.201 0.250 0.294 0.300 0.331 0.337 0.362 0.390 0.420 0.450 0.482
0.512 0.539 0.572 0.601 0.626 0.660 0.683 0.689 0.715 0.723 0.737 0.790
```

| | before | after | |
|---|---|---|---|
| median gap, all 24 | 0.008 | **0.027** | 3.4x |
| median gap, the drawn field band | 0.005 | **0.029** | **5.7x** |
| smallest gap anywhere | 0.0008 | **0.006** | |
| most bodies starting in one 0.005 rung | **14** | **4** | |
| most bodies finishing in one rung | **13** | **5** | |

**ORDER — near to far, kept, and it is the right one.** It was already the
field's order; the front travels outward from the hero, so the bodies nearest
the ring (whose construction actually reads at this camera) arrive first and
the haze band fills in behind them. Judged on screen at p 0.870 / 0.880 /
0.890 / 0.900 / 0.910 / 0.920: the outward reading is legible frame to frame,
and at 0.890 two individual bodies are visibly at different stages in an
otherwise empty field — which is the whole ask, in one still. Far-to-near was
not seriously considered, for the reason Connect rejected it: a front that
starts at the horizon and works inward is drainage, and this chapter's gesture
is a colony opening out.

Three constants and a `REV_JIT` that is now 17% of the spacing rather than four
times it. The jitter's own `fr()` draw stays at exactly the point in the stream
it was consumed before, and the bands are laid out in PLACEMENT order
afterwards, so `rand` is consumed in precisely the sequence it was: **no body
moves, changes size, or changes shape. Only its threshold does** — which the
byte-identical `final` goldens then prove rather than assert.

### 12.3 `DRAW_W` 0.16 → 0.28, and why that is not a regression of `070892c`

Each body's own ink is now wider than its light. §11.5 set `DRAW_W = REVEAL_W`
so "the ink and the light arrive together", and this looks like a walk-back of
it. It is the opposite, on the test that section itself used: **the hero**. On
the landing page the hero's strokes ink in at FULL opacity with the tip ember
riding the drawing front — the hero is never a dim body being drawn, it is a
lit body still drawing. A clone that comes up to its light over the first 0.16
and keeps inking for another 0.12 is doing what the hero does.

Every guarantee `070892c` bought is strictly **stronger**. The failure it fixed
was a body DRAWN AND DARK — the draw running *ahead* of the light — and
widening the draw moves the other way:

| | before | after |
|---|---|---|
| own light when the cap shell begins to fade in (`prog` 0.574) | 0.466 of its reveal | **0.925** |
| min own-light under a fully opaque shell, frozen ladder | 0.262 | **0.460** |
| black body-samples across the ladder | 0 | **0** |
| bodies undrawn at p 0.860 | 24 | **24** |

**The ceiling is measured, not chosen.** The last body's threshold is 0.7898
and the camera-pure `pullRaw` reaches **1.1200** at the Final rest, so the draw
has 0.330 to finish in; 0.28 lands it at 1.070, p 0.9194 against a rest at
p 0.9250. The rest frame must see `d = 1` exactly — below it the last overlay
strokes are missing and the tip ember is still on — and the byte-identical
`final@1440x900` golden is the proof that it does.

Note this headroom exists because of the leg re-path (`8b71687`) and did not
before: §11.6's own table has the last body finishing at camera x −13.89 with
the rest at −13.9. Re-measured, the rest camera now sits at x −14.72 with the
approach accelerating into it, which is where the 0.33 came from. The far end
was NOT free before this batch and should be re-measured again if that leg
moves.

`REVEAL_W` is untouched, so **`2f4c2f1`'s canopy stays exactly coupled**: seats
still kindle `CANOPY_LEAD` 0.04 ahead of their own body's threshold, which is
still a quarter of the light's own width, and the seats moved with their bodies
because they read `s.reveal`.

### 12.4 Measured

    WALL CLOCK          rate      whole field   per-body draw (median)   gap between starts (median)
      before        600 px/s        1.86 s       0.42 s  (0.21-0.54)          0.036 s
      after         600 px/s        2.00 s       0.58 s  (0.36-0.87)          0.067 s
      before       3600 px/s        0.36 s       0.07 s  (0.04-0.11)          0.000 s
      after        3600 px/s        0.38 s       0.11 s  (0.05-0.15)          0.000 s

    24/24 bodies fully drawn by the end of the ride at every rate.

Per-body draw is 1.38x slower in seconds rather than the 1.75x `DRAW_W` grew,
because the widened window reaches into the part of the leg where the camera
accelerates hardest (12 → 25 units of `pullRaw` per unit p between p 0.90 and
p 0.918). That acceleration is the camera's, it is pure in the pose, and it is
not this file's to flatten.

Concurrency on the frozen ladder — the number this change is really about:

| p | before | after |
|---|---|---|
| 0.870 | 21 / 3 / 0 | 21 / 3 / 0 |
| 0.880 | 19 / 3 / 2 | 16 / 8 / 0 |
| 0.890 | 18 / 1 / 5 | 12 / 10 / 2 |
| 0.895 | 4 / **15** / 5 | 10 / 10 / 4 |
| 0.900 | 4 / **15** / 5 | 7 / 9 / 8 |
| 0.905 | 3 / 3 / 18 | 4 / 10 / 10 |
| 0.910 | 0 / 4 / 20 | 0 / 10 / 14 |
| 0.920 | 0 / 0 / 24 | 0 / 0 / 24 |

Before, the `drawing` column spikes and collapses. After it sits near ten for a
quarter of the leg while the `undrawn` column drains two or three at a time —
a queue, not a wave.

### 12.5 Gates

- **Reference stills byte-identical.** `capture.py --check`, five poses × two
  sizes: **worst MAE 0.00/255. PASS.** `final@1440x900` and `final@430x932`
  both exactly 0.00 — which simultaneously proves the field geometry did not
  move (the `rand` stream was preserved) and that every body is fully arrived
  at the rest. No golden re-shot.
- **Reverse un-inks, and dark at arm holds both ways.** Continuous
  forward-then-backward scrub at 250 px/s through real wheel events, every
  frame, every body:

  | size | max per-body draw Δ at matched p | max draw below p 0.850 fwd / rev | fully drawn at the rest |
  |---|---|---|---|
  | 1440x900 | 6.75e-3 | 0.0 / 0.0 | 24/24 |
  | 1280x800 | 9.52e-3 | 0.0 / 0.0 | 24/24 |
  | 375x812 | 9.64e-3 | 0.0 / 0.0 | 24/24 |

  The residual is interpolation between frames; the draw is pure in `pullRaw`.
  **Zero** non-finite `uProg` values in any pass.
- **No black body.** 19-rung frozen ladder p 0.845–0.935: **0 black
  body-samples**, min own-light under a fully opaque shell **0.460** (0.262 on
  the shipped tree).
- **Console clean.** Trap installed before the app loads, full 0 → 1 → 0 ride:
  **929 frames, 0 errors, 0 warnings, 0 rejections.**
- **Screenshot sequence** at 1440x900, p 0.870 → 0.920, in §12.2.
- **Nothing regressed.** `2f4c2f1`'s canopy is untouched and still coupled
  (`REVEAL_W` and `CANOPY_LEAD` unchanged); `070892c`'s shell fade and its
  no-black-body invariant are strictly stronger; `66d1bed`'s per-body shell
  materials are what make the fade legal and are untouched; the particle work
  (`e2bd6e8` / `2fdb4e6` / `9e2a277` / `b2c9584`) is not in this path;
  `8b71687`'s leg is untouched and was re-measured rather than assumed. No
  camera change.

### 12.6 Residuals

- **§11.8's stem-shell note is now more visible, for the same reason
  everything else is.** The stem shell fades in over `prog` 0.30…0.54 while the
  cap does not start until 0.574, so a mid-draw body is briefly a stalk with a
  small dark cap-less top against the haze. A 1.75x wider draw holds that state
  1.75x longer, and it is legible at p 0.890 on a near body. The fix is still
  `intro.js`'s rising clip plane, still one world plane per body, and still not
  worth it at these distances — but it is closer to worth it than it was.
- **The batched T4 band still has no draw-on** and now shares a narrower tail
  (REV_KNEE..REV_HI, 0.12 against the shipped 0.15) so its kindle is slightly
  more grouped than it was. It is 25–45 units out in fog and it only brightens,
  so this reads as haze filling rather than as bodies arriving. If it ever
  reads, the fix is §11.8's `aReveal`-keyed draw term in `world.js`, not a
  wider tail — the tail cannot grow without pushing past the 0.84 ceiling the
  clamped `uPull` imposes.
- **The draw is now 84% of the distance from the last threshold to the rest.**
  0.28 of an available 0.330. Anyone widening it further, or moving the Final
  rest, or re-pathing this leg again, must re-measure `pullRaw` at p 0.925
  first; below `d = 1` the rest frame changes and the golden will say so.

## 13. A town of Christmas trees (2026-08-09, Hannah's "one at a time")

**The ask, verbatim.** *"In the Final section, the mushrooms should light up
a lot more gradually. It should be, like, one at a time — like a Christmas
tree, like a town of Christmas trees lighting up."*

§12 separated order from spacing and was right about the arithmetic; Hannah
has seen the result and wants it considerably further. Re-measured, §12's
remaining disease is the CLOCK, in two halves.

### 13.1 The road is 500 pixels, and §12's ladder spent it unevenly

The whole arrival lives between the soil-line clearing (~p 0.856) and the
rest (p 0.925) — about 0.06 of progress, ~500 px of wheel travel at this
leg's ~9,000 px per unit p. That is the road, all of it; no threshold
choreography can add pavement (see 13.6). What the choreography CAN decide
is how the road is spent, and §12 spent it badly twice over:

- **Even in uPull is uneven in p.** The camera accelerates from ~12 to ~25
  units of `pullRaw` per unit p into the rest, so §12's evenly-spaced
  thresholds compressed on screen: start gaps of 0.0044 p at the head,
  0.0004 at the tail. On the shipped tree the last TEN drawn bodies started
  inside an eighth of a second at a deliberate 600 px/s ride, and two of
  them started at literally the same frame at a brisk one.
- **A single `DRAW_W` = 0.28 against gaps of ~0.03 means ~10 bodies
  mid-draw at any moment of the middle.** Measured peak: **12 of 24**
  simultaneously mid-draw at p 0.905. Individually slow, collectively an
  ooze — no arrival is an event because every arrival is background to
  nine others.

### 13.2 The ladder: authored in p, sparse head, tightening tail

All twenty-four drawn bodies (nine ring members + fifteen field clones) now
sit on ONE authored 24-slot ladder. Slots are authored in **p** — gaps of
7.5 → 1.2 millip, scaled to the window p 0.8560 → 0.9105 — and converted to
uPull thresholds through the measured camera curve (`journey-v6-plan`
scratch measurements, 2026-08-09; re-derive by sampling
`journey.scrollTo(p)` → `camera.position.x` if the leg ever moves). The
shape is an accelerando: the first four arrivals are singles 150-180 ms
apart at a deliberate ride — each one its own event, the "one at a time"
the ask names — and the gaps tighten as the town fills, closing at a steady
~35 ms with no §12 machine-gun collapse (min gap 0.0009 p vs 0.0004).

- **Ring** (world.js `RING_LADDER` + `sweepReveal()`): order untouched —
  the single-direction CCW sweep from the hero — but the five near-lip
  members now OPEN the show as spaced singles (slots 0-3, 6) and the four
  far-lip members CLOSE it (slots 18, 21-23), last threshold 0.8379 just
  under the 0.84 light ceiling. `sweepReveal()` interpolates the re-timed
  sweep for the two continuation glow pools, monotone in arc, so cords and
  pools stay member-coherent. Guard: if a member is ever dropped at build,
  the whole sweep falls back to the old affine law rather than half-apply.
- **Field** (ring.js `FIELD_LADDER` + `PERM`): the fifteen T3 clones take
  the other slots in a **scattered order** — the authored permutation
  [0, 14, 7, 3, 11, 5, 13, 1, 9, 4, 12, 2, 10, 6, 8] over depth ranks,
  jumps of 4-14 ranks between consecutive arrivals.
- **T4 batch and the cap-rim hints: untouched** (rank tail 0.72..0.835,
  hints 0.80-0.84). Haze may arrive as weather.

**ORDER — scatter, reversing §12's near-to-far.** §12 kept depth order
arguing the front travels outward; on screen that IS a sweep, and a sweep
is what a town is not. A town lights in no order at all. Judged on the
ladder: consecutive arrivals now land far / middle / near / far, and no
two consecutive arrivals are neighbours. Two authored exceptions: slot 0
is the NEAREST body — the biggest thing in the composition, whose §11.8
stalk-under-dark-cap mid-draw state must play out while it is still half
out of frame (measured at p 0.894: on a mid-window slot it stood as a
quarter-frame near-black dome in the open view; the shipped tree had the
same state on the same body, but earlier and half-framed) — and slot 1 is
the FARTHEST, the town's first light across the valley.

### 13.3 The kindling: a taper, not a constant (`DRAW_W_HI/LO`)

One width cannot serve both ends of an accelerando. The opening singles
have the road to themselves and deserve the long kindling; the closing
fills land 35 ms apart, where a 0.28-wide draw is ten overlapping oozes and
a 0.12-wide draw is a pop — and a pop reads as an EVENT even when it
overlaps its neighbours. So each body's width is now a pure function of its
own threshold: `drawWOf(reveal)`, linear 0.26 → 0.12 across reveal
0.10 → 0.84. This is also what frees the tail at all: 0.8379 + 0.12
finishes at pullRaw 0.958, far inside the 1.1200 at the rest, where + 0.26
would leave 0.02.

`070892c` gets strictly STRONGER: the draw still starts AT the light's own
threshold (never ahead — ink can never precede ember), and the narrower
late widths pull the ink closer to the light: minimum own-light under a
fully opaque cap shell rises from §12's 0.460 to ~0.84 (worst late body).
`2f4c2f1` canopy: untouched and still coupled — seats read `s.reveal`, so
they moved with their bodies; `CANOPY_LEAD` 0.04 and `REVEAL_W` 0.16
unchanged; earliest seat 0.0966 − 0.04 stays above the canopy's 0.03 floor.

### 13.4 The arrival bloom (`BLOOM_A`)

A Christmas tree coming on is a discrete event with a beginning and an end;
a monotone ramp has neither. Each body now flares to **1.35x** its resting
brightness as its draw completes and settles by `d = 1` exactly — the
house's own onset, hero.css `core-pop` (overshoot, settle; the instrument
powering on), translated to luminance. Shape:
`1 + BLOOM_A * smooth01((d−0.30)/0.45) * (1 − smooth01((d−0.75)/0.25))` —
zero at d = 0 and d ≥ 1, so every frozen rest frame is untouched (goldens
prove it, §13.5). Pure in the pose: a reverse scrub re-runs the flare
mirror-exact on the way out; D16 asks for exact retraction, not asymmetry.
Verified live by an A/B at p 0.900 with `BLOOM_A` 0 vs 0.35: the diff is
exactly the three bodies then mid-take (max Δ 51/255 on the flaring one),
zero on everything settled.

### 13.5 Measured

Both ladders evaluated on the SAME recorded rides (the wheel-driver's
wall-clock varies run to run; p-space numbers are frozen-exact):

    STRUCTURE (frozen map)             §12 (6d37205)        §13
      starts span (p)                  0.8601..0.9086   0.8560..0.9105
      all fully drawn by (p)           0.9199           0.9150
      min start gap (p)                0.0004           0.0009
      PEAK bodies mid-draw             12               9
      per-body draw width              0.28 flat        0.26 -> 0.12 taper

    600 px/s (deliberate)              §12              §13
      whole field                      2.37 s           2.33 s
      first three start gaps           0.12 0.12 0.11   0.18 0.15 0.14
      last three start gaps            .016 .026 .081   .031 .039 .038
      per-body draw median (range)     0.67 (0.39-1.17) 0.38 (0.16-1.02)

    3600 px/s (brisk)                  §12              §13
      whole field                      0.55 s           0.54 s
      min start gap                    0.000 s          0.001 s
      last three gaps                  .000 .000 .005   .003 .006 .005

    24/24 drawn at every rate, both ladders.

The point is the distribution, not the totals: same road, but §13 spends it
as an accelerando — wide singles first, a steady quickening, no collision —
and the peak-simultaneity drop plus the taper means what overlaps late is
quick pops, not slow oozes. On the ladder stills (p 0.876 → 0.912) each
rung shows 1-3 bodies visibly at DIFFERENT stages against an accumulating
town, where §12's rungs 0.895-0.905 showed ten half-drawn at once.

### 13.6 The road itself — reported, out of scope

The image Hannah names wants more than 500 px of wheel. The window is
bounded by the soil-line clearing (nothing visible before ~p 0.856) and the
frozen rest (everything arrived by 0.925); both walls are camera facts, not
threshold facts. Options, all route/camera work, none taken here: a longer
or slower Owned→Final approach (more p between pierce and rest), or moving
the Final rest later. Either moves `restProgress`, every `?capture=` rung
and the goldens. The end-hold (p 0.925-1.0, ~675 px of held rest) is the
obvious donor if this is ever wanted: even a third of it would double the
arrival road.

### 13.7 Gates

- **Ten frozen references byte-identical** — `capture.py --check`, five
  poses x two sizes, worst MAE **0.00/255. PASS.** Proves the rand stream
  (geometry) is untouched, every body is fully arrived at the rest, and
  the bloom is exactly zero there.
- **Mirror** — frozen-clock scrub p 0.78 → 1.0 → 0.78 through
  `journey.scrollTo` at 0.002 steps, screenshots at ten matched rungs both
  directions: worst MAE **0.008/255** (sub-noise). No hysteresis, no
  self-ignition; p 0.820/0.855 frames are root-network dark.
- **Jump** — `flyTo('final')` from the landing page lands p 0.9250,
  chapter `final`, full composition (a8d4518's blend suppression intact).
- **Console** — full ride 0 → end → 0 under real wheel events: **0
  errors, 0 warnings, 0 rejections.**
- **QA hook** — `chapters.final.seats` now exposes every body's
  `{x, z, gy, s, reveal, tier}` so the next pass reads the ladder instead
  of inverting frozen uProg samples.

### 13.8 Residuals

- **§11.8's stalk-under-dark-cap state remains**, and the two authored
  PERM exceptions are containment for its worst case (the nearest body),
  not a cure. The cure is still intro.js's rising clip plane, still not
  taken. The near-lip ring member (az 123) shows the related dark-dome
  read at p 0.894-0.906 exactly as the shipped tree did.
- **The wall-clock ride harness varies run to run** (headless frame
  scheduling); treat ride seconds as one-ride comparisons and the frozen
  p-tables as ground truth.
- **The ladder constants bake the measured camera curve.** Anyone
  re-pathing the Owned→Final leg, moving the rest, or touching
  `pullRawOf` must re-derive `RING_LADDER` / `FIELD_LADDER` (sample
  `scrollTo(p)` → camera x, map slots through it) — the goldens and the
  0.84 light ceiling will catch a stale ladder, but only at its ends.

## 14. Charging up (2026-08-09, Hannah's "charging up, not flashes in")

**The ask, verbatim.** *"When you scroll into the Final section, could you
make the way the mushrooms light up be a lot slower — like they should each
come in one at a time? It should feel kind of like something CHARGING UP,
as opposed to the way it flashes in right now."*

Third pass on this moment. §12 fixed the spacing arithmetic, §13 fixed the
clock — and §13.3 wrote down, in its own words, what was still wrong:
to fit the tail inside the road it tapered the per-body width down to
0.12, "a pop, not an ooze," on the theory that quick pops read as events.
Hannah's word for those pops is "flashes." Measured on the shipped tree,
the closing bodies' entire luminance rise — first glow to full — happened
in **37-48 px of wheel** (13 px of it below half-light: two to three
frames at a deliberate scroll), against 73-190 px for the openers. And
the closers never even flared: the §13 bloom was keyed to the DRAW, which
at the narrow widths outran the fixed-width light, so the overshoot had
decayed before the light arrived — peak luminance 1.00 exactly. No build,
no overshoot: a flash, by construction. The disease was never the ladder;
it was that **half the field had no road to build on.**

### 14.1 The road, won from the end-hold

§13.6 named the donor and could not spend it: the end-hold, p 0.925 → 1.0,
~675 px of wheel holding a frame that (since `585dad8`) does not move at
all — measured this pass at camera-x flat to 1e-4 across the whole
stretch. Spent now, at the route level, where it belonged:

- **route.js**: Final `stops: [0.8]` (was the 0.5 default) — the rest
  moves p 0.925 → **0.97**. The shipped-value assert's `rests` entry
  updated deliberately, with this diff in front of it. Every derived
  consumer (nav landings, `?capture=final`, FOG_RAMP, lens grade key,
  copy band, snap anchors, handheld zeros) moved by derivation, none by
  hand.
- **final/camera.js**: ONLY the rest hold key's t moves (0.5 → 0.8). The
  two travel keys hold their p and poses, so the p 0.878 key's tangent —
  which reads the p 0.905 key, not the rest — is unchanged, and the seam
  segment from Owned is bit-identical: measured max |camera.x| drift for
  every p ≤ 0.878 after the edit, **0.0 exactly**. owned/leg.js samples
  only p ≤ 0.872 for colony clearance, so the Owned colony cannot have
  moved — and the `owned@*` goldens (below) prove it didn't.
- The x −12.3 → −14.72 approach now takes **0.065 of p where it took
  0.020**; the reveal driver crosses the closing thresholds at a third of
  its old rate. Arrival road ~500 → **~850 px**; end-hold keeps ~270 px
  and still resolves at p = 1 (both anchors render the rest composition;
  fog completes its settle by rest + 0.03 exactly as it always did).
- **portrait.js**: the Final key was a hard-coded `p: 0.925` — one of the
  two documented absolute-p violations — and would have completed the
  Final portrait composition mid-approach. It now rides
  `restProgress('final')`. Values untouched; `final@430x932` shows the
  same composition at the new rest. owned/leg.js needed no change
  (checked, and now says so in place).
- **world.js `PULL_MAX`**: the reveal clamp's ceiling 1.0 → 1.12 (the
  value the driver actually reaches at the rest). The old normalisation
  silently imposed the 0.84 light ceiling §13 kept bumping into; every
  consumer of `uPull` is a saturating smoothstep or a low gate, so for
  every shipped threshold the two ceilings are indistinguishable — and
  the ladder's late rungs (to 0.9511) become legal, as does a longer T4
  weather-tail (REV_HI 0.84 → 0.94: the haze now fills in behind the town
  across the whole lengthened arrival).

### 14.2 The character: charge, take, settle

What "charging up" means here, authored per body on its own clock
s = (pullRaw − reveal) / drawW — all of it pure in the pose, D16 exact in
reverse:

- **CHARGE (s 0.00–0.62)** — the ember gathers: brightness climbs the 7%
  whisper toward 0.30 of full on an accelerating g² curve while the
  strokes ink themselves in, and the house twinkle breathes DEEPER
  (depth 0.12 → 0.22 at the crest, easing home through the take — depth
  pure in the pose, carrier the same shared clock, so the frozen mirror
  and the rest frame are untouched). A charging thing visibly draws
  power before it lights.
- **TAKE (s 0.58–0.88)** — the knee: one committed smoothstep through the
  charge level to full, the §13 bloom re-timed to ride it (hero.css
  `core-pop`: rise, overshoot 1.35x, land). This is the arrival event.
- **SETTLE (s 0.88–1.00)** — the overshoot decays; at s = 1 the body is
  byte-identical to a rest-frame body.

The ink spans the window and completes at s 0.85 (INK_SPAN) — the last
strokes land inside the take, tip ember riding into the flare: a lit body
still drawing, never a drawn body waiting dark. `070892c` holds: the ink
still starts AT the light's threshold, never ahead.

**The shells moved onto the same clock.** The intro-window shell fade
(solidity follows the ink) placed a fully opaque cap over a body still at
ember — and on a far fog-dimmed member the strokes vanish before the
silhouette does: at p 0.944 on the first cut of this ladder, two mature
far-lip members stood as BLACK CAPS in a lit town, §11.5's "turn black"
resurfaced by the wider windows. Solidity now follows the TAKE (stem
s 0.40–0.58, cap s 0.60–0.80): a charging body is the hero's own
wireframe breathing at ember level, and becomes flesh as it lights. The
black-cap state is impossible by construction, and §11.8's
stalk-under-dark-cap residual dissolves with it — the cap above a solid
stalk is now wire, not void. Re-shot the ladder: zero black caps at any
rung.

### 14.3 The ladder, re-laid on the won road

Same 24 slots, same ring/field interleave (four ring openers + one mid,
four ring closers), same scattered PERM, same two authored exceptions —
re-timed in p across starts 0.856 → 0.933 (gaps 7.0 → 2.0 millip, the
same accelerando shape with a fatter tail) and converted through the NEW
measured camera curve (`scrollTo(p)` → camera.x, this section's tables).
Width taper re-cut 0.26 → 0.15 (was → 0.12): narrower in uPull at the
tail, but at a third the crossing rate that is 141–235 px of wheel per
body against the shipped 40–190.

    SINGLE BODY (an early and a late rung, luminance vs wheel)
                          first glow -> half   half -> full   total   peak
      §13 early (0.1734)        31 px             42 px       73 px   1.35
      §13 late  (0.8124)        13 px             24 px       37 px   1.00  <- the flash
      §14 early (0.1833)        63 px             29 px       92 px   1.33
      §14 late  (0.9353)        70 px             35 px      105 px   1.34

    One shape for the whole ladder now: every body builds ~2x longer than
    it takes, then overshoots and settles. The §13 tree had two species of
    arrival; the §14 tree has one, which is what "each come in one at a
    time" needed the ladder to be saying.

    STRUCTURE                          §13 (shipped)      §14
      starts span (p)                  0.8560..0.9105   0.8560..0.9330
      all fully drawn by (p)           0.9150           0.9591  (rest 0.970)
      min / med start gap (p)          0.0009 / 0.0019  0.0016 / 0.0030
      per-body draw road (px)          40..190          141..235
      PEAK bodies mid-draw             9                10
      PEAK bodies mid-TAKE             (n/a — no take)  3-4
      per-body peak luminance          1.00..1.35       1.33..1.35 all

    Mid-draw concurrency rose by one — but §14's "mid-draw" is mostly
    bodies at ember charge, which overlap the way a town's windows warm
    together; the EVENTS (takes) run 3-4 deep at the very tail and
    singly at the head. On the rung stills (a/b series, 0.858 → 0.970)
    every frame shows bodies at visibly different stages: wire-dim,
    charging, taking, settled.

### 14.4 Gates

- **Goldens**: `capture.py --check`, five poses x two sizes — mission /
  inspire / connect / owned all **0.00/255 against their pre-change
  files** (the route edit provably moved nothing outside Final);
  `final@*` re-shot deliberately in the same commit (manifest note has
  the provenance: rest pose bit-identical at −14.72/2.73/2.700 fov 45.5,
  frame differs by the later fog-settle sample and the §14 arrival
  state), then **0.00/255 reproducible**.
- **Mirror**: frozen-clock scrub 0.78 → 1.0 → 0.78 at 0.002 steps,
  eleven matched rungs both directions: worst MAE **0.014/255**
  (sub-noise). Dark below the arm both ways; no self-ignition.
- **Jump**: cold landing → `flyTo('final')` lands p 0.970, chapter
  `final`, full composition, console clean; the mid-blend frame composes
  on the camera alone (a8d4518 intact — bodies revealing under the lens,
  no full-composition flash).
- **Console**: real-wheel ride 0 → 1 → 0 on a live clock: **0 errors,
  0 warnings, 0 rejections**.
- **End-hold**: camera-x flat to 1e-4 across 0.97 → 1.0; p = 1 renders
  the rest composition with the fog settled, and a scroll into the tail
  resolves to it.
- **Nothing regressed**: 6e28eff spores ride saturating gates
  (indifferent to PULL_MAX); 585dad8's hold semantics kept at the new
  rest; 45a6628 / 8b71687 legs untouched (seam parity measured 0.0);
  66d1bed's per-body shells are what made the shell re-timing possible;
  2f4c2f1 canopy still coupled — seats read `s.reveal`, moved with their
  bodies, `CANOPY_LEAD` 0.04 and the shader's 0.16 width unchanged,
  earliest seat 0.0566 above the 0.03 floor, latest completes at u 1.07
  inside the rest's 1.12.

### 14.5 Residuals

- **The wall-clock px/p figure (~9,000)** is §13's measurement, reused
  for the px columns; the scroll spline was not re-measured. The p-space
  numbers are frozen-exact.
- **The T4 weather-tail and the hints still have no draw-on**, unchanged
  — at 25–45 units in fog they arrive as weather, and now they do it
  across the whole window instead of finishing early.
- **The charge's x-ray state** (wire cap over a solid stalk, s
  0.58–0.60) is the deliberate replacement for the black-cap state; on a
  very near body it is briefly legible as construction. It is the
  hero's own pre-shell intro language and reads as the charge — but it
  is a taste call Hannah has not yet seen named.
- **Anyone moving the rest again** re-derives the ladders through a fresh
  curve measurement exactly as before — and now also re-checks
  `PULL_MAX` (it bakes the rest's camera-x) and the T4 REV_HI margin.
