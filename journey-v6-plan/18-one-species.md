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
