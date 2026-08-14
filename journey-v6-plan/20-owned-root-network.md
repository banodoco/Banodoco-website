# 20 — Owned: the root network

**Date:** 2026-08-06 · **Section:** OWNED (route span 0.60–0.85, rest 0.725)
**Files:** `journey/chapters/owned/{camera,leg,substrate,portraits,index}.js`,
`journey/portrait.js` (owned key), `journey/ui.js` + `journey/site.css`
(chip edge-flip), `static/captures/owned@*.png` + `manifest.json`.

---

## 1. The reference

Hannah supplied a single wide frame. Described precisely, because the whole
restage is an attempt to hit it:

- Warm amber light on near-black, deep corner vignette.
- At the **top centre**, the **base/root of the main mushroom** enters the
  frame — a bright convergence point right at the top edge, with the stalk's
  fibres gathering into it.
- From that point a **wide fan of fine glowing root filaments descends and
  spreads outward**, like a fountain or a willow: dense and bright where they
  leave the base, thinning and spreading as they fall.
- The filaments open into a **large luminous network filling the whole lower
  two-thirds**: fine amber threads, many small bright nodes where threads
  cross, and a scattering of brighter **starburst convergence points** (the
  same visual family as CONNECT's hubs).
- Embedded in that network, roughly **14–16 portrait faces**. Each sits inside
  a node of the web, softly ringed/haloed with light — the brightest
  intersections of the network are people. They vary in scale (larger and
  lower reads as nearer, smaller and higher as further), sit in a broad
  arc/oval, are denser toward the lower half, and have clear dark breathing
  room between them. The threads pass in front of and behind them.
- **"Owned by the ecosystem"** centred near the top, below the nav, overlapping
  the upper part of the root fan; the prose sub line centred beneath it.
- The feeling: you are looking at the root world **below** the mushroom, and
  the community **is** that root network.

## 2. What was there before

An underground glide. The camera descended stipe-side, crossed the soil line
and travelled through a subsurface colony (five rhizomorph cords, three depth
batches of hyphae, authored voids, haze) with 48 portrait pods, on a level
gaze looking -X *away* from the stipe.

Two facts made that composition unreachable from the reference, and both are
visible in the pre-restage golden (`git show HEAD~1:.../owned@1440x900.png`):

1. **The root crown was behind the lens.** The rest sat at (-0.4, -1.40, 0.3)
   looking -X; the stipe base was at +0.55 x, i.e. over the camera's shoulder.
2. **The chapter drew nothing in the frozen capture at all.** `amount` only
   ever approaches `amountTarget` by an eased step scaled by `dt`, and
   `freezeTime(0)` sets `dt = 0` — so under `?capture=` the whole section
   stayed at fade 0. Every lit thing in the old owned golden is CONNECT's
   *surface* mycelium, seen from underneath through solid earth. See §7.

## 3. The composition as built

Measured at 1440x900 unless noted.

| Element | Where it lands |
|---|---|
| Root crown (convergence) | NDC (0.000, 0.920) — top centre, half-cropped by the top edge |
| Soil-plane vanishing line | NDC y +0.254 — the lid owns the top ~37%, the open volume the lower ~63% |
| Headline | centred, y 160–260 px, overlapping the upper fan |
| Sub line | centred, y 280–350 px |
| Portrait arc | 16 faces, NDC x −0.91…+0.89, y +0.29…−0.75, depth 12.4 → 5.6 |
| Starburst hubs | 5, spread through the lower field |

Three camera moves make it, and none of them works alone:

1. **The rest slides to the +X/+Z side of the stipe** — (1.730, −1.180, 0.560)
   — so the crown is *ahead* of the lens. Its bearing from there is −107.1°,
   which **is** the rest yaw, so the crown lands at frame centre in x.
2. **The gaze pitches down 8°** instead of levelling out. A level gaze splits
   the frame 50/50 between ceiling and volume; a gaze pitched *up* gives the
   whole frame to the ceiling. −8° is what puts the vanishing line at NDC
   +0.254 and hands the lower two-thirds to the network.
3. **fov opens 54 → 58**, which lifts the crown from NDC y 1.001 (just off the
   top edge) to 0.920 (entering it), and widens the fan.

### Camera keys (`chapters/owned/camera.js`, leg-local t)

    t 0.000  pos (2.523,  1.654, 1.792)  tgt (-1.176,  0.194, -0.519)  fov 52    p 0.600  pitch -18.5  yaw -122.0   [UNCHANGED]
    t 0.088  pos (2.230,  1.520, 1.430)  tgt (-0.361,  0.311, -0.006)  fov 52    p 0.622  pitch -22.2  yaw -119.0
    t 0.180  pos (2.010,  1.420, 1.150)  tgt (-0.586,  0.042, -0.116)  fov 52.5  p 0.645  pitch -25.5  yaw -116.0
    t 0.272  pos (1.895,  0.850, 0.965)  tgt (-0.731, -0.578, -0.177)  fov 53    p 0.668  pitch -26.5  yaw -113.5  (the valley)
    t 0.360  pos (1.820,  0.150, 0.830)  tgt (-0.921, -1.100, -0.250)  fov 54    p 0.690  pitch -23.0  yaw -111.5
    t 0.400  pos (1.790, -0.420, 0.760)  tgt (-1.062, -1.435, -0.278)  fov 55    p 0.700  pitch -18.5  yaw -110.0
    t 0.440  pos (1.762, -0.920, 0.680)  tgt (-1.185, -1.667, -0.318)  fov 56.5  p 0.710  pitch -13.5  yaw -108.7
    t 0.472  pos (1.742, -1.100, 0.610)  tgt (-1.254, -1.683, -0.352)  fov 57.5  p 0.718  pitch -10.5  yaw -107.8
    t 0.500  pos (1.730, -1.180, 0.560)  tgt (-1.298, -1.625, -0.373)  fov 58    p 0.725  pitch  -8.0  yaw -107.1  HOLD (owned-rest)
    t 0.728  pos (-3.300, -1.400, 0.350) ...                                                                        [UNCHANGED]
    t 0.848  pos (-5.300, -1.020, 0.780) ...                                                                        [UNCHANGED]
    t 0.980  pos (-7.700, -0.200, 1.250) ...                                                                        [UNCHANGED]

What is deliberately preserved:

- **The t 0.0 key is untouched**, so CONNECT's exit stays collinear with the
  dive (16-connect-ground-restage.md's dive line).
- **The Y schedule at t 0.360 / 0.400 / 0.440 is untouched** (0.15 / −0.42 /
  −0.92). That is what pins the T3 soil crossing where it has always been:
  measured p **0.6926** landscape / 0.6929 portrait, inside the 0.692–0.712
  murk window. CONNECT_HOLD_HI 0.705 stays lawful.
- **t 0.728 / 0.848 / 0.980 are untouched, bit-exact.** Moving the rest changes
  the tangent at t 0.728 and therefore the curve up to p 0.812; from p 0.812 on
  the pose is unchanged by construction, so the whole FINAL splice is
  arithmetically identical. Verified: the rise crossing is still p 0.8495.
- **The dive has no x reversal.** x now walks 2.523 → 1.730 monotonically and
  keeps walking −X after the rest; the camera sinks on the stipe's +X/+Z side
  at radius ~1.8–2.5 (stem radius ≤ 0.69, so still safely outside).
- **The gaze is now monotone through the whole CONNECT join**: yaw −135 → −127
  → −122 → −119 → −116 → −113.5 → −111.5 → −110 → −108.7 → −107.8 → −107.1
  (rest) → −114 (drift) → … The shipped leg swung *up* to −94 at the rest and
  back down; that 13° overswing is gone. Pitch keeps its single valley
  (−18.5 → −26.5 → −8 at the rest → −1.2 → +10.7): one dip, no nod.

### Portrait aspect (`journey/portrait.js`, key p 0.725)

`back 1.16 → 1.08, rise 0.28 → 0.18, tgtUp −0.16 → −0.28, tgtRight 0.25 → 0,
fov +10 → +6`. The shipped field was authored for the old level-gaze colony:
its dolly-back and +10 fov dropped the crown to NDC y 0.57 (mid-frame, behind
the sub line) and its `tgtRight` — which existed to keep the long-retired
ownership **pods** off the right edge — slid it to NDC x −0.23. Measured after:
crown NDC **(0.000, 0.792)** at 375x812.

## 4. How the root world is constructed

`chapters/owned/substrate.js` is rewritten. Everything hangs from
`leg.CROWN` — the hero's own stipe base, read from the shared form-language
mirror (`anatomy.stemAxis(0)` + `groundY()`), dropped `CROWN_DROP = 0.61` so
the soil lid crops the fibres gathering up into the stem. `organism/*` is not
touched: the chapter only asks the mirror where the mushroom's foot is.

**`growRoot(start, dir, len, seg, seed, meander, sweep)`** — one filament,
integrated rather than parameterised. It leaves on an azimuth at `dip0` below
horizontal and is bent further down each step by a gravity term
(`GRAV 0.46 × step × (0.30 + 1.55 t)`), while fbm walks it sideways with an
amplitude that grows along its length and an optional **coherent** lateral
sweep. The gravity is what draws the fountain; the sweep is what stops it
reading as a straight ray (symmetric fbm noise averages back to a line at this
scale). All of it clamps under `groundY()`.

| Population | Count | Length | Role |
|---|---|---|---|
| Primaries | 66 | 5.4–11 (×1.85 down-glide) | the long fall |
| Collar | 150 | 0.30–1.35 | the knot's dense halo |
| Mid rank | 190 | 1.5–4.2 | bridges knot → primaries |
| Secondaries | 292 | 1.4–5.0 | branches off the primaries |
| Hairs | 2 400 | 0.5–2.0 | the fine-thread density |

Two authored asymmetries carry most of the look:

- **Ducking.** Roots aimed up the depth axis — straight at the lens, or
  straight down the glide — get up to +0.62/+0.50 rad of extra initial dip, so
  they dive below the camera corridor. Roots aimed across it (±z, which is
  frame left/right at the rest) stay shallow and fan wide. That single rule is
  what fills the frame horizontally while leaving the flight path clear.
- **Near-horizontal departure.** `dip0` starts at 0.02–0.22 rad. A root that
  leaves steep is a straight line to the bottom of the frame; one that leaves
  flat and is pulled over within two or three units draws the willow curve.

The collar has to stay **short**. At the rest the crown is 1.85 units from the
lens, so a 3-unit collar filament subtends most of the frame; the first build
of this restage read as a firework for exactly that reason.

**The web.** A fan is not a network, and root-to-root links alone are not one
either — the roots diverge radially, so past four or five units from the crown
there is nothing near enough to link to and the lower field stays empty. So
the network has **its own 430 nodes**, seeded through the lower volume
(74% authored in the rest frustum with `cy` biased toward the bottom and depth
biased near; 26% spread along the glide so the mesh does not stop at the frame
edge), spaced ≥ 0.72 apart, textured by the two-scale `substrate()` density so
it clumps and thins instead of tiling, kept below y −1.95 (under the corridor)
and ≥ 2.6 from the camera path. Each is wired to 2–4 nearest neighbours within
4.5 units — **1 436 links** — and every second root sample gets a chance to
reach its nearest node, so the fan and the mesh are one structure. **563
junction glints** (a Points layer, per-point twinkle on incommensurate
frequencies) are the reference's "small bright nodes where threads cross".

**The crown** is a knot, not a body: 34 fibres gathering *up* into the stem's
foot (cropped by the lid and by the frame) over a 30-spoke radial burst, plus
a hot core and halo — CONNECT's hub grammar one scale larger.

**Five starburst hubs**, authored in the rest frame and then grounded and
clearance-pushed: 15 radial convergence spokes + a tight core knot + a glow
core, which is `chapters/connect/tendrils.js`'s hub construction ported to 3D.
The reference asks for that family by name, and the site should not grow a
second language for it.

**The soil ceiling** is the one genuinely new layer, and the one that made the
composition work. Everything lit in this scene is additive, so before it there
was nothing between the underground camera and the hero's own surface
mycelium: the ground network blazed straight through the earth across the top
of the frame, brighter than the root world beneath it. It is an opaque plane at
the soil line, `PlaneGeometry` rotated so its normal points **down** and drawn
`FrontSide` — from above it is back-facing and culled, which is what keeps it
out of the Final cutaway. It writes depth at `renderOrder -30`, before every
additive layer in the scene, so it occludes the hero's ground group without
touching `organism/*`: nothing reads, writes or configures the hero's objects,
the chapter simply stands a metre of soil between them and the lens. Its
colour grades from warm near-black to a haze tone over 5→34 units, because a
flat plane meets the lit volume below the vanishing line at full contrast and
draws a hard horizontal rule across the frame.

Kept from the previous build: authored dark voids (smaller and pushed out to
miss the portrait arc), soil aggregates, the amber haze backdrop, a dim far
filler layer, the soil-underside root mat, `uFade` on every layer for the T3
seam, and the interaction-only surge — now re-authored as a wave that leaves
the **crown** (aAlong 0 is the crown end) and runs out through fan → hubs →
web → hairs on staggered delays.

## 5. Portrait placement

`nodeCount` 48 → **16**: every node is a routable contributor, and the ambient
filler nodes are gone. The reference asks for "roughly 14–16 faces … with clear
dark breathing room between them"; 48 was a crowd, and the old 3×3 frame-cell
stratification cannot author an arc — it authors a grid, which is what it
looked like.

Positions are authored one by one in the **rest frame** (`REST_SITES`:
ndcX, ndcY, depth, size) — the house rule from the CONNECT restage, *the frame
is the spec*. Two far arms sweep up and outward at ndcY ≈ +0.29 flanking the
copy; the sides fill at ndcY ≈ −0.05; the lower half carries nine of the
sixteen in two loose ranks; the three nearest sit lowest and read largest.
Depth falls as the row falls (12.4 → 5.6), which is what makes "larger and
lower reads as nearer" true in perspective rather than by drawing bigger
sprites. Nothing is authored inside the copy block.

The Spike B rev-2 rules survive: **≥ 3.0 world units of clearance from every
point of the camera leg** (measured minimum after build: **3.03**) and the
size/spacing jitter. The clearance rule is now nearly free — the camera glides
just under the soil and the whole network hangs below it, so the old build's
fight with that rule is over.

Levels: `EXPOSURE_PLANES` 0.42 → **0.50**, the resting rim 0.07 → 0.20, the
image term 0.88 → 1.12, halos 0.035 → 0.058. Against the old lit ceiling band
0.42 was as much as a face could take; against near-black soil it left them as
dark discs with a rim — "bubbles", not the reference's warm-lit faces. 0.76 was
measurably too far the other way (the three nearest bloomed into featureless
orbs); 0.50 keeps the features at all three review sizes.

## 6. Interaction contract

Unchanged and re-verified. `nodeIds` is still the sixteen `contributor-N` ids,
`nodeWorld(id)` returns the new arc positions, `labelPolicy` still asks for
`labelOnHover`, and `setHot` / `setSelected` / `trigger` are untouched. The
claim pulses are re-aimed: `claimPrimary` now fires from the **crown**, so
"100% shared" reads as light leaving the root and reaching everyone.

One shared-UI addition was needed. The chip pill always ran to the **right** of
its dot, so the arc's right-hand nodes (deliberately out at NDC x 0.88) would
reveal a clipped label on hover. `ui.js` now measures the pill each frame in a
single read pass and mirrors it about the dot (`.j-hot.flip`, `flex-direction:
row-reverse`) with a compensating translate, so the **dot** stays exactly on
its node either way, with 14 px of hysteresis. On viewports too narrow for the
pill on either side it nudges in by at most 26 px — past that a truthful dot
with a clipped tail beats a chip pointing at nothing. The rule is general and
inert for every chip that already fits.

## 7. `snap()` — the frozen-capture gap

`chapters/owned/index.js` gained the one-liner every other chapter already had:

    snap() { amount = amountTarget; portraits.snap(); },

`journey.js`'s `placeAt` calls it on every chapter that has one — deep links,
hidden-tab and frozen capture, all of which run the `dt = 0` path. Without it
`amount` stayed at 0 forever under `freezeTime(0)` and **the entire chapter
drew nothing in every frozen capture**, including inside the Final cutaway,
which 17-final-field.md says deliberately exposes the colony in section. Deep
links were merely lucky: live `dt` closes the ease in ~0.4 s, so the section
faded up a beat after the landing instead of being there.

`uPhoto` is **deliberately not snapped**. Under `freezeTime(0)` the photo
crossfade never advances, so frozen captures render the procedural painted
busts — and that is the behaviour to keep, not a bug to fix:
`assets/test-portraits` is a placeholder set that must never ship and
`static/captures/*.png` is committed to the repo, so snapping it would bake
real likenesses into a checked-in image. The live page still crossfades to
photos the moment they load.

> **Pre-deploy checklist item, still standing:** delete `assets/test-portraits`
> (and the manifest that names it) before any public deploy. No new likenesses
> were added by this restage.

## 8. Measurements

**Rotation / speed** — 201-sample scrub of the pure `poseAt`, differentiated
exactly in p, both aspects. `[bracket]` = the same measurement on the
pre-restage tree.

    p 0.55–0.90   landscape   yaw   1083 °/p @0.799   [1049 @0.799]
                              pitch  519    @0.705   [ 909 @0.714]
                              speed  118 u/p @0.761   [  94 @0.721]
                              sign flips  yaw 1 / pitch 2   [1 / 4]
                  portrait    yaw   1054    @0.799   [1021 @0.799]
                              pitch  513    @0.698   [ 578 @0.720]
                              speed  169 u/p @0.553   [ 169 @0.553]

    CONNECT join  p 0.55–0.62 landscape yaw 230, pitch 193, speed 90, flips 0/0
    FINAL join    p 0.83–0.90 landscape yaw 1021, pitch 404 (bit-exact region)

Everything is under the ~1.2k °/unit-p house threshold. Pitch improves by 43%
(the old crest at the levelling-out is gone); yaw is +3%; position speed rises
94 → 118 u/p, which is the longer drift the restaged rest buys and is the one
number that got worse. Roll is 0 everywhere by construction — `director.apply`
writes `camera.up = (0,1,0)` before every `lookAt`.

**Thresholds.** Soil crossing **down p 0.6926** (landscape) / 0.6929
(portrait) — inside the 0.692–0.712 murk window, unchanged from the shipped
0.6926. Rise crossing **up p 0.8495** / 0.8245, unchanged (bit-exact region).
The `ARRIVAL_LO 0.692 / ARRIVAL_W 0.020` mask therefore still completes inside
the murk: at p 0.6955 the camera is 0.17 below the soil and the field is
arriving behind genuine occlusion; at p 0.6885 the chapter draws nothing at
all. The mask is pure in p, so a reverse scrub retires it through the same
material. A 71-sample scrub 0.55→0.90 and back found no frame in which the
chapter is visible while the camera is above the soil line, other than the
epilogue (p ≥ 0.85), where it is armed by design and the ceiling is
back-face-culled.

**Budget**, OWNED rest, same harness and viewport (534x317), median of 14
paired frames:

    before   61 draw calls   61 067 line segs   21 797 points   5 553 tris   16.75 ms
    after    56 draw calls   71 126 line segs   22 308 points   4 753 tris   16.70 ms

Draw calls down 5 (six cord tubes + six filament overlays retired in favour of
batched line sets), line segments up 16%, triangles down 14%, frame time flat.
Substrate build cost ~275–400 ms once at boot. Same class.

**Chips**, live page, three sizes:

    1440x900   16/16 visible, 16 tabbable, 0 over the copy, 0 off-frame,
               min dot separation 102 px, 3 chips flipped
    1280x800   16/16 visible, 16 tabbable, 0 over the copy, 0 off-frame,
               min dot separation  90 px, 3 chips flipped
     375x812    4/16 visible,  4 tabbable, 0 over the copy, 0 off-frame,
               min dot separation 133 px, 2 chips flipped

Hover lights the node (`hoverIdx` set, label opacity 1); click opens the card,
sets `selIdx` and writes `#/owned/contributor-N`; Escape closes and restores
`#/owned`. Deep links `#/owned` (p 0.725, 16 hotspots) and
`#/owned/contributor-13` (card open, `selIdx` 13) both land. A full 0→1→0 ride
at 0.01 steps logged zero console errors and zero warnings.

**Goldens.** `owned@1440x900.png` / `owned@430x932.png` re-shot in this commit
with manifest provenance. A full `--check` afterwards:

    mission  0.00 / 0.00      inspire  0.00 / 0.00      connect  0.00 / 0.00
    owned    0.00 / 0.00      final    0.18 / 0.13   (warn 0.50, fail 1.00)

`final` is the only pose that moved and it was **not** re-shot. Cause,
investigated: §7's `snap()`. The entire diff is in the cutaway's lower half
(y 510–899 at 1440x900, 0.2% of pixels, max channel delta 73) — the frozen
frame catching up with the live one, in the direction 17-final-field.md
already specified. Well inside the gate.

## 9. Where it still differs from the reference

Honestly, and in order of how much it bothers me:

1. **The fan is straighter than the willow.** The arc happens in the first two
   or three units and the rest of each filament falls close to straight, so at
   the frame edges the long primaries read as fine scratches rather than
   drooping strands. The reference's filaments curve along their whole length.
   More segments and a stronger late sweep would help; so would shortening the
   longest primaries and letting the mesh carry the far field instead.
2. **Face legibility falls off with distance.** The near six read clearly as
   people; the far ten read as warm haloed discs. The reference's smallest
   faces are still recognisably faces. This is partly the additive blend
   (a photo drawn additively on black wants to become a lamp) and partly the
   Spike B edge-burn. A normal-blended plane with an additive rim would
   probably nail it, and would also make the "threads pass behind them" read
   literal instead of implied — but it is a real change to an approved
   treatment and wanted more time than this pass had.
3. **The mid-field is emptier than the reference.** 430 network nodes fill the
   lower two-thirds convincingly, but the reference's web is denser still and
   its small bright nodes are more numerous.
4. **Mobile shows 4 of the 16 chips.** The arc reaches |NDC x| 0.89 in a 1.6
   frame; the portrait frustum is 3.5× narrower, so only the four central
   nodes are placeable. That is the documented platform behaviour (OW-4.5's
   "curated spatial subset"), but the bottom-sheet **index** that clause pairs
   it with does not exist yet, so on a phone the other twelve are currently
   unreachable — the sharpest outstanding item in this section.
5. **The crown's burst is slightly lens-flare-ish** at 1440x900 — a touch more
   radial symmetry than the reference's, which reads more like fibres and less
   like a star.

---

# 2026-08-06 (later) — the pointer pass

Three reports from Hannah, one job. They share a root: **the hit model and the
picture were two different pictures**, and the hover response was staged at the
wrong scale.

> (A) "When I hover over the items, they don't reliably open… especially the
> edge ones. It feels like [the hit area] is in a different point to where they
> actually show. Maybe that's related to the jump out issue as well."
>
> (B) "they shouldn't jump out the way they do — they should stay in place."
>
> (C) "the roots ALL light up when I'm hovering over below randomly, but this
> should only happen when I hover over the TOP root thing."

Her hunch in (A) was right, and it was only half the story.

## A.1 — the measured hit-area error, and its two causes

Files: `journey/ui.js`, `journey/site.css`, `chapters/owned/index.js`.

Measured at the rest (p 0.725), sixteen nodes, thirteen sample points taken
across each **drawn** face (its centre, eight at 0.6 of the ember-ring radius,
four at 0.9), asking `document.elementFromPoint` which chip — if any — answers
there. "Hit-centre error" is the distance from the drawn node to the centre of
the region that actually answers the pointer.

| | 1440x900 | 1280x800 | 375x812 |
|---|---|---|---|
| chips placed | 16 | 16 | 4 |
| hit-centre error, mean / max | **115.7 / 141.8 px** | 115.6 / 141.7 | 121.4 / 143.2 |
| sample points that reach the right chip | **74 / 208 (36%)** | 86 / 208 (41%) | 32 / 52 (62%) |
| faces answering across their whole disc | 0 / 16 | 0 / 16 | 0 / 4 |
| worst nodes | c13 c14 c15 — **2 / 13** | c13 c14 c15 — 2 / 13 | c8 — 2 / 13 |

**Cause 1: the chip's hit surface was the pill.** `.j-hot` is a flex pill —
dot, then label — 23 px tall and 202–306 px wide, anchored so the *dot* sits on
the node and the label runs off to one side. The face it stands for is a disc
18–50 px in radius. So the region that answered was a thin bar mostly lying on
bare canvas next to the face, and the face itself was live only in the 11 px
band the pill happened to cross. And because Owned's chips are `labelOnHover`,
that bar **draws nothing at rest**: it is an invisible 300 px target beside the
thing you are aiming at. Hannah's "a different point to where they actually
show" is exactly the 116 px in the table.

The worst cases are the near/low faces, which is also why they read as "the
edge ones": their discs are the biggest (50 px radius against 11 px of pill
half-height), and at 375 the arc's outermost chips are the ones whose flipped
pills lie across their neighbours.

**Cause 2, on touch: PL-1.4's own target.** Under `(pointer: coarse), (max-width:
720px)`, `.j-hot::before` grows every control to `max(100%, 44px)` and states
`pointer-events: auto` outright — which overrode the pill's own `none` and put
a **306 x 44 invisible bar** back over the neighbouring node's face. At 375x812
contributor-9's bar covered contributor-8's face: 2 of 13.

**Cause 3 was (B)**, below: once hovered, the drawn face left the hit target.

### What replaced it

A **hit pad**: a round target the size of the thing the node draws, pinned to
the node inside the chip's own box.

- Chapters may now implement `nodeRadius(id)` — the world radius of the drawn
  mark. Owned returns `size * 0.80`, the ember ring plus its fray. `ui.js`
  projects it against the **view-space depth** (not the radial distance: at
  |ndc x| 0.9 that is a 20% difference, at exactly the edge of the frame where
  it matters most) and writes it to a circular child element, `.j-hot-hit`.
  A chapter that does not implement `nodeRadius` gets a zero-sized pad and the
  pill-only hit model, unchanged — verified on Connect and Inspire.
- The pad is positioned **against the node**, not against the pill, so the
  edge-flip and the ≤26 px narrow-viewport nudge move the *label* and leave the
  target on the face. This is visible in the after table: at 375 contributor-12's
  dot is still nudged 21 px off its node, and its hit target is 0.27 px off it.
- A hover-only chip's pill is `pointer-events: none` until it is hot, and the
  PL-1.4 pseudo-target is switched off for the same span — so nothing invisible
  is ever a hit surface. The instant the chip is hot, both come back, so the
  walk from face → label → popover is what it always was. The pad carries the
  44 px touch minimum in the meantime (`ui.js` floors it at r 22 under the same
  media query PL-1.4 uses).
- Pads are capped at 48% of the distance to the nearest live pad and at r 56,
  so two neighbours can never argue, and a foreground face that fills a sixth
  of the frame does not own a sixth of the pointer.
- The placement bound relaxes 0.92/0.90 → **0.97/0.94 for pad chips only**. The
  arc reaches |ndc x| 0.912 by construction: contributor-13 was 0.008 from
  having no hotspot at all. Measured, no chip count changes at any of the three
  sizes; the cliff edge does.

| after | 1440x900 | 1280x800 | 375x812 |
|---|---|---|---|
| chips placed | 16 | 16 | 4 |
| hit-centre error, mean / max | **0.40 / 0.40 px** | 0.22 / 0.22 | 0.25 / 0.27 |
| sample points that reach the right chip | **208 / 208** | 208 / 208 | 52 / 52 |
| faces answering across their whole disc | 16 / 16 | 16 / 16 | 4 / 4 |
| pad radius range | 20.0–55.1 px | 17.8–49.0 | 22.0–40.1 |

The residual 0.2–0.5 px is the `toFixed(1)` rounding on the CSS custom property.

## B — what replaced the jump

`chapters/owned/portraits.js`. Three vertex shaders — the portrait planes, the
3D rim fibres and the ember core/halo points — each carried

    mv.z += vH * 0.62;   // hover: step forward in depth

A step toward the camera in view space is not a null move on screen: it is a
**radial magnification about the frame centre**, so the node slid *outward* from
where it was drawn, by an amount that grows with eccentricity. Measured, the
drawn face moved:

    mean 37.7 px, max 86.6 px   (1440x900)
    mean 33.5 px, max 77.0 px   (1280x800)
    mean 25.7 px, max 54.9 px   (375x812)

and the maxima are contributor-14 (ndc x +0.89, 86.6 px) and contributor-13
(ndc x −0.91, 80.4 px) — the two furthest out. The hit target did not move with
it. So this is not merely (B): **it is the eccentricity term in (A)**, and it is
why the edge faces were the worst ones to hover. Hannah connected the two
reports herself and she was right.

All three lines are gone. The emphasis is now entirely in place:

- a **centred scale**, 0.13 → 0.20 on the plane and 0.11 → 0.18 on the rim
  fibres. The retired depth step bought 8–12% of apparent growth on its own (a
  node 0.62 nearer at depth 5.6–12.4); folding that into a scale about the
  node's own centre keeps the response as strong as it was and moves nothing.
- the core/halo points grow 0.35 → 0.42, about the node.
- the ember ring, the image term and the core term in the fragment shader are
  untouched, as is the node's own strand response.

This is light, an in-place ring and an in-place scale — nothing else. It is not
the hover glow 0d9bcbd deliberately removed from the Final field bodies: that
was a glow added to bodies that had none, this is the *removal* of a translation
from an emphasis Owned has always had.

**Measured after:** the drawn quad's projected centre, computed from the live
uniforms through the shader's own arithmetic at hover 0 and hover 1, moves
**0.00 px on every one of the sixteen nodes at all three viewports.** The four
corners are symmetric about the node, so the scale cannot move the centre, and
`mv.z` no longer depends on `vH`. (`grep "mv\.z *+="` over the chapter returns
one line: this note.)

## C — how strand ownership is derived

The root response had exactly one setting: **all**. Two halves were wrong.

**The trigger was in the wrong place.** `ui.js`'s `CHAPTER_SUB_PULSE.owned`
fired `trigger('claimPrimary')` — `substrate.surge()` plus a 30-unit colony
wave — from `pointerenter` on the chapter's prose sub line. Measured, that line
is a **416 x 77 px box at (512, 277)**: dead centre of the frame, between the
crown above and the portrait arc below, squarely on the route a pointer takes
to reach a face. Every crossing lit the whole root system. "Randomly", exactly.

It now belongs to the crown, as a **hover zone** — a hover target that is part
of the scene: no chip, no label, no card, no tab stop, nothing drawn.
`chapters/owned/index.js` declares one (`hoverZones()`, id `root-crown`, world
radius 0.25 — the crown is only 1.85 units from the lens, so that is ~123 px at
1440x900: the convergence knot and its collar, and not the headline 30 px
below it). Zones live in their own fixed host at **z-index 0, below the hero's
`.ui` layer**, because the crown zone is 246 px across and the chapter nav sits
inside it — in the hotspot host it swallowed every nav link. Verified: all four
nav links hit-test to themselves at all three sizes.

Being pointer-only costs nothing that was not already lost: the prose-line
pulse it replaces was pointer-only too, and neither carries information.

**A face had no root response at all.** Hovering one lit the *portrait* layer's
own strands and left the mesh untouched. So the substrate needed to know which
of its filaments belong to whom — and it can be **answered**, because the build
already records what joins what:

1. `portraits.js` grows each face's local strands from real points on the fan:
   45% of them start at `substrate.nearestCordPoint()`, which returns a sample
   from `rootPool` — the strand starts *on* a root, not near one. Those points
   are now recorded as the face's **anchors**.
2. The web's root→mesh links are built from those same `rootPool` samples
   (`link(rootSample, netNodes[j])`), so an anchor **identifies** a mesh vertex
   the face is genuinely wired to.
3. The node→node links give `webAdj`, a graph over the 430 mesh vertices.

`substrate.assignOwners(faces)` therefore seeds a walk at the mesh vertices each
face's own strands reach, spreads it 3 hops along that graph, and lets the
sixteen compete — first to reach a vertex, at the lowest hop count, owns it. A
**Voronoi in graph distance over a graph the chapter built**, not a radius
search. The only distances involved are the anchor↔link-end match (an identity
test with 0.9 of slack for the jitter `nearestCordPoint` adds) and two caps.
A mesh link belongs to a face when both its ends do; a root→mesh link belongs to
whoever owns the mesh end, because that link *is* the fan reaching that vertex.
A face with no anchor at all (its strands all rolled a free-space start) seeds
on its single nearest vertex and the same walk does the rest.

Two caps keep it local, and both were earned by measurement. The uncapped walk
gave a **4-to-160** spread: a face standing in a dense patch lit 11% of the whole
network, which stops reading as "these are mine". With `OWN_MAX_R 4.5` world
units and `OWN_MAX_LINKS 55` (a face past the cap keeps its **nearest** links,
so what is dropped is always outermost):

    links owned per face   6 … 55   (mean 27)   of 1 436 in the mesh
                           i.e. 0.4% … 3.8% each; 432 owned in total
    world extent per face  1.94 … 4.34 units  (mean 3.58)

The two responses, read off the live uniforms:

| | hover a FACE (c9) | hover the CROWN |
|---|---|---|
| web `uOwner` / `uOwnerAmt` | **9 / 0.97** | −999 / 0 |
| crown pulse | 0 | 0.512 |
| fan pulse | 0.16 (its ambient) | 0.263 → 0.362 |
| hub pulse | 0 | 0.156 → 0.306 |
| web pulse | 0 | 0.063 → 0.259 |
| hair pulse | 0 | 0 → 0.200 |

That is the model Hannah asked for: hovering a face lights **28 filaments inside
4.3 units of it and nothing else**; hovering the crown runs the wave out through
crown → fan → hubs → web → hairs, all 1 436 links and the whole fan with them,
and settles back to nothing. Hovering the prose line now fires nothing at all.

## Gates

    hit-centre error   116 px mean -> 0.4 px       (3 viewports, table above)
    hover reliability  74/208 -> 208/208 pts       1440x900
                       86/208 -> 208/208            1280x800
                       32/52  -> 52/52              375x812
    every node, every viewport: 13/13 of its own face answers, edges included
    drawn displacement on hover   max 86.6 px -> 0.00 px, all 16, all sizes
    local vs global    6-55 links (max extent 4.34u) vs 1 436 links + fan
    console            full ride 0 -> 1 -> 0 at 0.01 steps: 0 errors, 0 warnings
    contract           click -> #/owned/contributor-13 + card + selIdx 13;
                       Escape -> #/owned + selIdx -1; nodeIds unchanged
    other chapters     Connect/Inspire chips: pad 0 px, pill hit unchanged
    chapter nav        all 4 links hit-test to themselves at all 3 sizes
    goldens            capture.py --check PASS, worst MAE 0.18 (final,
                       pre-existing and unchanged). mission 0.00/0.00.
                       NOTHING re-shot — all ten PNGs byte-identical, twice.

Reveal laws, the 0.692–0.712 murk crossing, the FINAL splice, `nodeIds` and the
card/popover contract are all untouched; no camera key moved.

## Residuals

1. **The crown zone is pointer-only.** So was the prose-line pulse it replaces,
   and it carries no information — but the crown is now the one part of the
   composition that answers a mouse and not a keyboard.
2. **Ownership is uneven by design.** Six links at the sparse end, 55 at the
   cap. A face in a thin patch of mesh has a quieter answer than one in a dense
   patch, which is honest but not uniform; its own portrait strands carry the
   response there.
3. **375 still places 4 of 16 chips** — unchanged, and still waiting on the
   bottom-sheet index (§9.4). The pad makes the four that are placed reliable;
   it does not reach the twelve that are not.
4. `mv.z` no longer moves on hover, but the **near-field defocus** still
   softens by `1 - vH * 0.45`. That is a blur change, not a position change,
   and it is left as it was.

---

# 2026-08-07 — the action pair, and Remix

> "we should have a kind of button below the text that's like a remix button.
> Well, first of all there should be a button that says 'Learn more', and then
> next to it there should be like a remix button. And we should figure out how
> to make them work nicely together visually. And basically the remix one just
> switches out the photos for a bunch of other photos."
> — Hannah

The first genuinely new feature this chapter has grown since the restage.
Everything else on this page is a defect record.

## D — the pair

### D.1 One silhouette, two weights

Both controls are the hero nav's `.pill`, unchanged: 999px radius,
`0.5rem 1.35rem`, 0.78rem/500/0.04em, and the `0.7rem` gap `.nav-cta` already
uses between 2RP and Discord. Nothing about the shape, the size or the type is
new. That is the whole of "work nicely together visually" — the site already
has a button, and this is it, twice, in a row.

They are told apart by LIGHT, and the split is deliberate about which kind each
one gets:

| | **Learn more** | **Remix** |
|---|---|---|
| role | the conventional destination | the exploratory instrument |
| border | `rgba(242,237,225,0.58)` parchment | `rgba(217,164,65,0.34)` gold |
| ink | `--parchment` | `rgba(217,164,65,0.82)` |
| interior | 4.5% parchment wash | none |
| carries | **contrast** | **behaviour** |
| position | first — reading order and tab order | second |

So the primary is the louder object at rest and wins the glance, which is what
a primary action is for; the secondary is measurably quieter and is the only
one of the two that is *alive* — a three-node glyph whose filament draws itself
and whose points light 1→2→3 on hover, and which carries a travelling spark for
exactly as long as the field is turning over. It earns attention by moving
rather than by shouting, which is the right currency for a control whose
promise is "try this and see."

**Neither is a solid fill**, and that is a composition decision rather than a
taste one. This chapter is staged so the crown is the brightest point in the
frame (see `EXPOSURE_PLANES` in `chapters/owned/index.js`). A filled parchment
button parked at top-centre would quietly take that job away from the scene.

### D.2 Where it lives, and what it is made of

Declared as **content**, not markup:

```js
CONTENT.chapters.owned.actions = [
  { id, kind: 'link',   weight: 'primary', label: 'Learn more', href },
  { id, kind: 'button', weight: 'explore', label: 'Remix', glyph, action, announce },
]
```

`journey/ui.js` renders any chapter that declares an `actions` array and knows
nothing about which chapter that is — the same rule the label policy and the
popover eligibility already keep. `kind: 'link'` is a real `<a href>` and
`kind: 'button'` a real `<button type="button">`; never a div, so "open in new
tab" and Space-as-well-as-Enter come for free.

**Learn more's destination is not confirmed.** It is wired `href: '#'` with a
`TODO(Banodoco): PLACEHOLDER` naming what has to be confirmed before launch —
the house convention every spotlight link in `content/content.js` already uses.
No URL was invented; the donor build's `https://banodoco.ai` guess is explicitly
recorded as *not* a confirmation.

### D.3 The entry

The pair is the last part of the arriving copy, inside the same envelope
`armCopyEntry` drives (`--j-in-wait` + fractions of `--j-in`), so a longer
flight stretches it with everything else:

    bed      0.00 -> 0.40 of --j-in
    heading  0.12 -> 0.78
    sub      0.26 -> 0.92
    Learn more 0.40 -> 0.92        <- new
    Remix      0.47 -> 0.92        <- new

The two pills **start** in hierarchy order and are timed to **settle on the same
frame**, at 92% of the envelope — exactly where the sub already lands, so the
d1ecc23 contract ("the last part lands at 92%, leaving the final beat as a pure
settle") is kept rather than extended. They arrive as one object that assembled
in order, which is what they are. Measured live on a nav jump: `--j-in-wait`
0.594s, `--j-in` 0.636s, Learn more `delay 0.8484s / dur 0.3307s` = W + 0.92D.

Every keyframe ends at the resting style, so the reduced-motion rule is
`animation: none` and nothing else — same contract as hero.css's `.co` boot.

### D.4 a11y and the hit model

- Tab order, measured: `… 2RP, Discord, **Learn more, Remix**, 16 contributor
  chips`. The pair sits after the nav and before the field, which is where the
  prose it belongs to sits.
- `:focus-visible` gets the shared journey ring, with one override: that rule
  sets `border-radius: 2px` for the square controls it was written for, so the
  pair restates `999px` and the ring stays a pill.
- The row is **`inert`** unless its block is more than half faded in.
  `visibility:hidden` only covers the last 0.2% of the copy fade; without the
  gate a block at opacity 0.08 mid-scrub is a live click target and a tab stop.
  Verified: `rowInert` true through a nav-jump arrival, false once settled,
  true again the moment you leave.
- Busy uses **`aria-disabled`, not `disabled`**. A real `disabled` blurs the
  element the instant it is set, so a keyboard visitor who pressed Enter would
  be thrown back to `<body>`. Measured: focus stays on the button across the
  whole swap.
- The swap is announced to the polite live region that already exists in
  `ui.js` — "Contributor portraits remixed — arrangement 2." Nothing moves
  focus, so without this the change is silent.
- `pointer-events` is on the **pills only**, never the row, so the gap between
  them and the space either side stay transparent to the portrait field.

## E — the swap

### E.1 Arrangements

There is exactly ONE image set in this repo: `assets/test-portraits`, 20 small +
6 large, LOOK-DEV ONLY, under a standing rule that it is deleted before any
public deploy. **No new likenesses of real people were added**, and none may be
to satisfy a button.

So Remix advances an **arrangement index** that re-derives every node's source
image and its whole treatment — mirror, exposure, warmth, grain seed, and for
the procedural busts the bust seed. Sixteen nodes drawn from 26 images, with
strides chosen coprime to the 20-image small pool so each arrangement is a
different permutation rather than a rotation of the last, and the six large
sources rotating across the six nearest planes. Measured: five consecutive
arrangements produced five distinct atlas hashes, and a single press changes
**16 of 16** atlas cells.

Arrangement 0 is byte-identical to what shipped before this feature — at `v=0`
every term reduces to the old expression — so the resting composition, the
goldens and the look-dev calibration are untouched.

**What is still needed:** a second REAL set. The mechanism is general and set-
shaped: point the arrangement bakers at a second manifest and the button gains
genuinely new faces with no other change. Until a consented set exists this is a
re-deal of one set, which is honest but is not what "a bunch of other photos"
will finally mean. **The consent gate (`setConsentEnforced`, OW-4.4) and the
pre-deploy deletion rule both stand unchanged and apply to any set that
replaces this one.**

### E.2 The transition

One clock, `uSwap` 0→1 over 1250 ms, opened at a different moment per node by a
per-vertex `aSwapD`; each node's own crossfade is a 0.34 window inside it. Two
extra atlas slots (`uMapA2` / `uMapP2`) hold the incoming arrangement, and on
landing the incoming becomes current, `uSwap` drops to 0 and the retired
canvases are released. The next arrangement is baked on an idle callback after
each swap, so a press is a swap and never a bake.

Three things make it a transition rather than a cut:

1. **It dissolves through soft focus.** Both images take `lod + vFlare*1.7`, so
   they lose definition together at the middle of the crossing and the new face
   comes back sharp. A straight A/B mix of two sharp faces is a jump cut.
2. **Each node flares as it crosses** — a Gaussian on the distance from its own
   moment, weighted onto the ember RING first (0.62), the core second (0.15) and
   the image barely at all (0.10). The face has to stay a face while it is being
   exchanged.
3. **The colony answers with it.** `wavePulse` from the same epicentre at the
   speed the swap travels, plus `substrate.surge()` — so each face's strands,
   rim and halo light as that face turns over. It is the crown-hover gesture,
   at the remix's own dose.

**The order is measured in the REST FRAME, not in world space**, and that is the
decision worth recording. In world space the nodes nearest the crown are the
NEAR-CAMERA ones (the crown sits 1.85 units off the lens), so a world-space
order starts the wave on the three big foreground faces at the BOTTOM of the
picture. Shot and compared: the visitor presses a button at top-centre and the
answer begins at the far bottom edge, running back up the frame while the
substrate's own surge runs the other way down the roots — two waves crossing,
which reads as noise. Ordered by distance from the crown *as drawn*, the wave
starts under the button, sweeps out along both arms and settles at the low
corners. One direction, the one the roots and the copy already establish. The
frame is the spec, again.

Sampled at `uSwap = 0.5`: six nodes have not started, two are mid-crossing at
0.23/0.28, and six are complete. It is a wave, not a fade.

**Reduced motion** opens the span to 1 — every node's window is the whole clock
— drops the flare to 0 and runs 320 ms. Same start state, same end state, no
travelling motion.

**The flare's gate starts at 0, and that was a real defect caught before the
gate ran.** A Gaussian is never exactly zero: at `uSwap = 0` the node whose
delay is 0 sits one sigma out and evaluates to `exp(-2.4) = 0.091`. Left
ungated that is a permanent 9% ember lift on one contributor at rest — enough to
move a frozen golden, and worse, to make one face quietly hotter than its
neighbours forever. `uSwapFlare` is 0 whenever no swap is running.

**The clock ticks outside the chapter's visibility gate.** Press Remix and
scrub away immediately and the swap still lands; verified by leaving mid-swap on
a nav jump and coming back to a completed arrangement, not a half-mixed field.

## Gates

    swap is real        16/16 atlas cells changed per press; 5 consecutive
                        arrangements -> 5 distinct atlas hashes
    stagger runs        uSwap 0->1 over 1250 ms sampled every 100 ms; at 0.5,
                        6 nodes unstarted / 2 mid / 6 complete
    reduced motion      span 1, flare 0, 320 ms, 16/16 changed, uSwap back to
                        0, busy + aria-disabled cleared, resting styles
                        (opacity 1 / transform none / animation none)
    keyboard            Tab order …2RP, Discord, Learn more, Remix, 16 chips;
                        Enter fires the swap and FOCUS SURVIVES it; two presses
                        mid-swap refused (arrangement holds)
    touch               pointerdown/up/click at 375x812 fires it; pills are
                        44px tall under the PL-1.4 query
    hit pads            nearest live pad to either pill: 111.7px (1440x900),
                        118.1px (1280x800), 56.8px (375x812). No overlap.
                        Every sample point on both pills hit-tests to the pill.
    no suppression      chips live/tabbable WITH the pair vs with it removed
                        from layout: 16/16 vs 16/16 (1440 and 1280), 2/2 vs 2/2
                        (375, the pre-existing mobile framing issue). Δ 0.
    copy entry          --j-in-wait 0.594s, --j-in 0.636s, pills 0.40/0.47 ->
                        0.92 of the envelope, settling with the sub
    inert gate          rowInert true through arrival, false at rest, true on
                        leaving
    console             full wheel ride mission -> owned (remix) -> final ->
                        mission -> owned (remix) -> final: 0 errors, 0 warnings
    goldens             capture.py --check PASS. Nine of ten MAE 0.00;
                        owned@430x932 0.04, PROVEN PRE-EXISTING by re-running
                        the check against HEAD's scene files (same 0.04).
                        NOTHING re-shot.

No camera key moved, no scene geometry moved, no placement changed. 696e95d's
hit pad, no-translation-on-hover and localised-root hover are untouched.

## Residuals

1. **One image set.** The remix is a re-deal, not a second cast. The mechanism
   is set-shaped and ready; a consented second set is the missing input, and the
   pre-deploy deletion rule for `assets/test-portraits` stands.
2. **`Learn more` goes nowhere** — `href: '#'` plus a TODO. It is in the tab
   order and it is a real link, so it will behave the moment a URL exists.
3. **Arrangements cycle.** Stride/offset pairs have period 7 and the large
   rotation period 6, so the small-pool permutation repeats every 7 presses
   (with different mirror/exposure/warmth each time). With one set of 26 images
   that is a ceiling, not a bug; a second set raises it.
4. **375 still shows 4 of 16 faces** (§9.4, unchanged). Remix reads clearly
   there — all four visible faces cross and the network lights — but it is
   remixing a field the visitor can mostly not see.
5. **The pair is the only interactive copy on the site.** `paintCopy`'s inert
   gate is written generally, but it has exactly one client today.

---

# F — the photo grade (2026-08-11)

> "In the Owned by the ecosystem section, the profile pictures — the colour is
> sapped too much from them. Could you put the colour in a little bit more?"
> — Hannah

## F.1 Saturation was not the problem

The instinct is to reach for the desaturation term, and that instinct is what
made the previous pass ineffective. Measured at the Owned rest before this one
(1440x900, frozen `?capture=owned` with `uPhoto` forced to 1, sampled over the
inner 0.62 of each of the sixteen drawn discs):

| | before |
|---|---|
| luminance-weighted HSV saturation | **0.569** |
| luminance-weighted Lab chroma | **41.4** |
| within-face Lab hue circular variance | **0.0050** |
| spread of the sixteen mean hues | **3.4 degrees** |

Saturation was already high. The amber cast *is* a saturated colour, so pouring
more amber on raises every saturation number you might tune against while
making the problem worse. What the faces had lost was not colour but *different*
colours: at a hue variance of 0.005, skin, hair, cloth and backdrop had all
landed on one 66-79 degree amber. That is a sepia print. It is also why
ride-through #2 (`0.62/0.90 -> 0.40/0.72`) did not land — it lightened the cast
without giving anything back its own hue.

So the figure this grade is now tuned against is a **ratio**, per face, both
terms luminance-weighted:

* **cast** — mean Lab chroma;
* **variation** — RMS distance of each pixel's `(a*,b*)` from that face's own mean.

The source photographs run about **1.9:1**. The shipped grade produced **7.9:1**.

## F.2 One stage was doing nearly all of the damage

The chain was instrumented stage by stage on four source images, measuring hue
variance after each operation. It is not a diffuse problem:

| stage | m11 | w17 | w44 | hi26 |
|---|---|---|---|---|
| 0 source | 0.106 | 0.056 | 0.494 | 0.364 |
| 1 desaturate | 0.107 | 0.058 | 0.497 | 0.367 |
| **2 amber multiply** | **0.005** | **0.036** | **0.007** | **0.008** |
| 4 warm-black lift | 0.004 | 0.016 | 0.006 | 0.007 |
| 5 edge burn | 0.002 | 0.011 | 0.004 | 0.004 |
| 7 unify wash | 0.001 | 0.002 | 0.002 | 0.001 |

Step 2 collapses hue variance 20-70x on its own. The mechanism is worth stating
because it is counter-intuitive: the multiply does not *remove* the photo's
chroma, it **swamps** it. It induces roughly 25-35 chroma of its own in one
fixed direction, on top of source images that only carry 11-22. Everything the
photograph had to say about colour is still in there, drowned.

## F.3 Why the multiply is nonetheless the term that barely moves

The obvious fix — weaken step 2 — was tried, rendered and **rejected by eye**.
At `amber 0.36` the discs lose their ember glow and read as cool photographic
cut-outs pasted onto the field: precisely the failure this treatment exists to
prevent, and a reversal rather than the correction that was asked for. The
multiply *is* the palette tie.

What moved instead are the terms that were discarding the photograph's own
colour before and after the multiply, where the cost is variation and the
benefit was never the glow. All four now live in one frozen `PHOTO_GRADE`
object at the top of `portraits.js`, so the next person tunes an object rather
than hunting four call sites.

| | was | now | what it is |
|---|---|---|---|
| `desat` | 0.40 | **0.06** | step-1 saturation fill. Pure loss — it strips source chroma, and step 2 then supplies far more amber than it took out. |
| `amber` | 0.72 | **0.64** | step-2 multiply alpha. The palette tie. Left nearly alone on purpose. |
| `burnMute` | 0 | **0.70** | how far each step-5 edge-burn stop is pulled toward its own Rec.709 luma. |
| `unify` | 0.33 | **0.16** | `grainAndGrade`'s source-atop wash. **Photos only.** |

`burnMute` deserves its own line. The edge burn was doing two jobs and only one
was wanted. Darkening is the job — that is the vignette that melts the disc into
the substrate, and its luminance profile is untouched. But it darkened *through*
a strongly amber gradient, and a multiply by an amber factor is exactly the
sepia-toning operation: it scales blue about three times harder than red, so a
neutral becomes orange. Muting each stop toward its own luma holds the
gradient's darkness to within a value or two while taking the hue rotation out.

## F.4 The busts are deliberately unchanged

`grainAndGrade` gained a defaulted `unify` argument. The procedural busts and
the anonymous spore-print glyphs keep **0.33**; only `drawPhotoCell` passes the
lower figure. This is not incidental — the busts are *painted in the palette
already*, they were never what Hannah was looking at, and the frozen goldens
render exactly those two paths (see §7). `owned@1440x900` and `owned@430x932`
are byte-identical after this change, which is the correct outcome and the
proof that the bust path was not touched.

## F.5 Result

Measured across all sixteen baked atlas cells — the treatment itself, before
the shader, bloom and strand light add their own common amber on top:

| | before | after | |
|---|---|---|---|
| cast (Lab chroma) | 41.90 | 40.75 | **-2.7%** — the warmth stays |
| variation | 5.27 | 7.59 | **+44%** |
| cast : variation | 7.9 : 1 | 5.4 : 1 | (source photos: 1.9 : 1) |
| within-face hue variance | 0.0015 | 0.0050 | **+233%** |
| HSV saturation | 0.630 | 0.591 | **-6%**, and that is the point |

On the rendered frame at the Owned rest, where bloom and the strand field add
common amber over the top, the same move reads as cast:variation 8.3:1 -> 6.9:1
and hue variance 0.0050 -> 0.0062 at 1440x900.

**By eye**, which is what actually decided it: hair now reads dark brown and
near-black instead of amber; the pale shirt on the nearest contributor reads as
cloth rather than as more face; eyes and beards separate from skin; and the
three largest faces no longer share one skin tone. The ember rim arcs, the halo,
the warm chamber behind each person, the vignette and the overall amber key are
all visually unchanged, so the discs still read as lit nodes in the network
rather than as photographs laid over it. It is a correction, not a reversal.

## Gates

    goldens             capture.py --check PASS, worst MAE 0.01/255 across all
                        ten. owned@1440x900 and owned@430x932 both 0.00 —
                        byte-identical, as intended (F.4). Nothing re-shot.
    remix               grade holds across three arrangements: cast:variation
                        5.4 / 5.5 / 5.5 : 1, cast 40.75 / 40.06 / 40.84. The
                        per-arrangement re-derivation of source image, mirror,
                        exposure, warmth and grain seed is untouched.
    console             cold load -> full forward ride (mission -> inspire ->
                        connect -> owned -> final) -> full reverse ride ->
                        flyTo owned -> two Remix presses -> contributor hover:
                        0 errors, 0 warnings.
    screenshots         Owned rest before/after at 1440x900 and 375x812, plus
                        a 3-face close crop at desktop.
    untouched           No camera key, no scene geometry, no placement, no
                        shader term, no timing. 696e95d's hit pads and
                        localised root hover, eea3ffe's pair, and 851c77a's
                        still chips and markers are all unmodified — the change
                        is four numbers and a muted gradient inside one
                        canvas-atlas painting function.

## Residuals

1. **The test set is thin, and one image is greyscale.** `hi12.jpg` measures
   satL 0.0000 — it is a black-and-white photograph, so no grade can give it a
   skin tone, and it occupies one of the six large slots that land on the
   nearest, largest discs. The rest carry only 11-22 chroma. The ceiling here is
   set by the placeholder imagery, not by the treatment; the pre-deploy deletion
   rule for `assets/test-portraits` stands and a consented set would lift it.
2. **The frozen goldens still cannot see this.** By design (§7, F.4) — captures
   render the busts. Any future review of the photo look has to happen on the
   live page or through a rig that forces `uPhoto`, as this pass did.
3. **`cast : variation` is a new figure with two data points.** 7.9:1 read as
   sepia and 5.4:1 reads as people, on this image set at this exposure. It is a
   useful instrument, not a calibrated one.

---

## 2026-08-11 — ONE MOVEMENT, SECOND LEG: the Connect → Owned travel becomes a single arc below the ground (Hannah's report)

**The ask, verbatim.** *"The transition from Connect to Owned feels a little
choppy — how could we make it smoother? Right now it feels like 3 movements
but it should be 1.5. It slowly arcs below the ground."*

Third complaint on this leg. `2a27db7` cured the gaze whip at the soil
(38-deg yaw overswing, the 1804 deg/p pitch snap) by re-aiming targets over
bit-exact positions; that fix held — the whip was still gone on the tree she
rode. What she is describing now is GESTURE, the same disease the
Inspire → Connect leg had (07-chapter-inspire.md 2026-08-10, `0701653`), and
the diagnosis instrument is the same: per-channel envelopes across the whole
travel, looking for humps that peak at different times.

### The diagnosis: three envelopes, three peaks

Measured (521-sample drift-aware trace of the shipped tree, ACTUAL
journey.progress recorded per sample, drift 0.0, `?steady=1`, landscape,
window p 0.50 → 0.76):

    1. THE DIVE     pos speed 0 at the rest -> PEAK 124.7 u/p at p 0.567,
                    fov rate -285 deg/p riding it (a zoom-IN: 62 -> 51.8),
                    collapsed 8.3x to ~15 u/p by p 0.612.
    2. THE CRAWL    p 0.61-0.69: speed 15 -> 38 u/p, the crown's on-screen
                    velocity nearly ZERO (0.22 NDC/p at 0.632), fov REVERSED
                    (+20 deg/p) — the frame all but stops, then creeps down
                    the stipe.
    3. THE PLUNGE   a second speed hump, 63 u/p at 0.696, with pitch rate
                    +520 deg/p and fov rate +157 peaking together just after
                    the soil crossing, dying at the rest.

    portrait: same structure, amplified by the portrait field's collapse —
    speed 235.6 u/p at 0.565, fov 70 -> 66 -> 64 non-monotone, pitch 517.

Three envelope groups peaking at 0.567 / ~0.67 / 0.70 — three movements,
exactly as counted. And one channel broken alone: fov ran 62 → 51.8 → 58, a
zoom-in then a zoom-out — movement segmentation in a single channel.

The surgical option — re-shaping only p < 0.622 and keeping the
placement-bearing keys — was measured and rejected: the head must average
~65 u/p to cover its 6.4 units while the frozen mid-section crawls at
15-18 u/p, an irreducible 3-4x trough. Still two movements. This leg needed
the full one-gesture treatment, colony consequences and all.

### The re-shape: dive(u), the destination owning its arrival

`owned/camera.js dive(u)` (the `approach()` precedent's own law), composed by
the director over p [restProgress('connect') .. restProgress('owned')] =
[0.5230 .. 0.725] as the route's third analytic gesture:

    az, r   61.81 -> 72.05 deg, 9.011 -> 1.818, on ONE asymmetric trapezoid
            (smoothstep ramp-in over 0.40 of the leg — the slow start out of
            the rest — plateau to 0.70, ramp-out landing flat at 0.94);
    y       2.647 -> -1.180 on a LATE-SURGING monotone ease (velocity grows
            as smoothstep² to u 0.91, brief hold, zero-slope landing): the
            arc steepens CONTINUOUSLY into the soil. The 0.91/0.925 pair is
            what pins the T3 crossing (below);
    fov     62 -> 58 on the same sinking ease — MONOTONE, max 51 deg/p; the
            widening arrives with the ground, not after the dolly;
    gaze    quadratic bezier CONNECT rest target -> OWNED rest target bowed
            through PIN3 (-0.2, 0.35, -1.2), the stipe base, eased by the
            MEAN of the two eases — the aim leads the dolly early and the
            sink late.

Both endpoints derive from the frozen rest constants (CONNECT's keys[0] is
imported; u = 1 is this file's own REST key), so seam disagreement is
impossible; every ease is zero-slope at both ends and both rests are holds,
so the gesture hands over with matching zero velocity. Retired: connect's
two travel keys (t 0.77/0.91) and owned's eight descent keys (t 0.0-0.472).
Every key at t >= 0.5 is bit-exact — the rest's hold tangent is zero and the
withdraw key's tangent derives from the rest + drift keys only, so the whole
approved withdraw/rise path (17-final-field.md) and every pose at p >= 0.725
are unchanged by construction.

### After, measured (521-sample traces, both aspects, drift 0.0)

    landscape (p 0.523 -> 0.725)
      speed        ONE envelope: 0 -> ramp -> 58-68 u/p plateau (peak 68.2
                   at p 0.668) -> monotone decay through the crossing -> 0.
                   No trough anywhere.
      yaw          strictly monotone, peak 442 deg/p at 0.684   } same
      pitch        ONE valley, -20.1 deg (was -26.5), recovery  } single
                   peak 462 deg/p (was 520)                     } gesture
      fov          MONOTONE 62 -> 58, max 51 deg/p (was -285/+157)
      dist         10.45 -> 3.20, monotone (worst re-approach 0.0005 u/step)
      crown NDC    velocity grows continuously 0 -> 42/p — no dead zone
                   (the shipped tree died to 0.22/p mid-leg)
      roll         0 everywhere (5.6e-17; director law)
    portrait
      speed        one dominant hump, 142.5 u/p at 0.578 (was 235.6), a 15%
                   secondary breath at 0.664 where the authored portrait
                   field's collapse ends; pitch peak 390 (was 517); the
                   field's own +6 fov at the rest now rises 2.1 deg at
                   ~85 deg/p (was 6 deg at ~240).
    rates          everywhere under the ~1.2k deg/p threshold; the -985
                   yaw at p 0.760 is the withdraw leg, bit-identical to the
                   shipped tree (outside this change).

Movement count: the arc (1) plus the murk-mandated quick-sink easing into
the rest (0.5) — the sink is the same arc still steepening, not a new
envelope. 1.5, as ordered.

### The soil crossing and the colony

- **Crossing**: p 0.6924 landscape / 0.6927 portrait (shipped: 0.6926 /
  0.6928) — inside the 0.692-0.712 murk window, ARRIVAL_LO's mask still
  ~0.003 at the crossing, y(0.712) = -0.91 (shipped -0.98), well under the
  lid's own 0 -> -0.5 thickness. CONNECT_HOLD_HI 0.705 and the T3 fog dip
  (centre 0.693) stay lawful; no seam constant moved.
- **Colony**: owned/leg.js's sampled window (p 0.660-0.872) regrew its
  0.660-0.723 half around the new corridor — and the outcome is
  sub-threshold: the corridors only differ meaningfully ABOVE the soil,
  where no colony content lives (everything is clamped under), and
  underground they converge at the pinned crossing and the same rest.
  capture.py --check: ALL TEN goldens within the frozen-frame determinism
  threshold, worst MAE 0.02/255 (owned@) — NO reference re-shoot needed.
  Frozen frame series through the leg both aspects: colony intact, crown
  top-centre at the rest, no clipping, no floaters, no holes.

### Gates

- **Rides**: full 0 -> 1 -> 0 scrubs and real-wheel rides (slow: 140 ticks
  at 240 px; brisk: 30 at 1600 px), both directions, console
  error/warn/exception hooks: 0 entries, both aspects. p advances smoothly
  (max per-frame step 0.015 at brisk speed; one direction flip total — the
  snap-commit settle, designed).
- **Mirror**: 201/401-sample forward vs reverse scrubs — position and
  target bit-exact (delta 0.0), fov within the 0.001-deg write-threshold
  hysteresis class. The T3 arm gate's dwell (THRESHOLD_MIN_DWELL_MS) shows
  as a transient arm difference only under instantaneous no-frame scrubs —
  the designed debounce, identical on the shipped tree.
- **Direct jump**: flyTo('owned') lands the exact rest pose (1.73, -1.18,
  0.56 / fov 58), owned armed, hotspots up, 0 errors.
- **Goldens**: capture.py --check PASS, worst 0.02/255 (thresholds
  warn > 0.50, fail > 1.00). All references byte-stable; none re-shot.
- **rStipe** >= 1.751 both aspects (the interior law; shipped min 1.751).

### Residuals

1. **Subject distance eases back 0.06 u (1.9%) over the final 0.02 of p**
   as the pitch settles onto the rest — the bezier's tail crossing the
   sink. An order of magnitude under anything visible; not worth a PIN
   chase.
2. **The portrait secondary breath (15% at 0.664)** is the authored
   portrait field's collapse ending, not the base gesture — re-keying the
   field's 0.622/0.700 literals for the wider corridor could smooth it
   further; left as authored.
3. **The connect ground network now stays in frame longer** during the
   descent (wider fov, farther corridor) before retiring behind the murk at
   0.705 — reviewed in the frame series and kept: it is what makes the
   travel read as one place sinking away rather than three shots.

---

# 2026-08-11 (later) — the soil does the hiding

Hannah: *"When I jump multiple sections into the Owned section, the roots
appear right away, as soon as I press that button. Could you make it so that
they're always there, but are only visible when I go below the surface? …
sometimes when I press the button between those two sections, they become
visible."*

## The fault

The chapter's reveal was `amount * arrival` with `arrival` a **p-window**
(0.692–0.712, the M5 ignition audit). On the leg that window IS the soil
murk — p and the camera are a bijection there — so scrubbing was already
honest. A nav jump is not on the leg: `placeAt` snaps p to the destination
while the camera is still most of a second away, so `arrival` read 1 (every
rest is past the window) and the time-eased `amount` faded the whole colony
up **over the open above-ground view**. Measured on the shipped tree,
per-frame fade vs camera depth during three jumps (headless CDP, ~11 fps
cadence — counts are frames at that cadence, the wall-clock span is ~2 s
each):

| jump | frames with fade > 0.01 while the camera was above the soil and outside the cutaway's territory |
|---|---|
| Connect → Owned | 24 |
| Mission → Owned | 22 |
| Connect → Final | 23 |

The third row is Hannah's "between those two sections": a jump toward Final
lit the colony through solid terrain with Final's slab not yet drawn (Final
suppresses itself during a blend since a8d4518; the colony did not).

## The fix — compose on the camera alone

Same law Connect adopted in f9e8317 (*the paths were always there; arriving
lights them*) and Final in its rise mask: the reveal is now a **pure function
of the camera pose**, so it needs no `setBlending` hook — it self-corrects on
the first blend frame, on every path the camera can take.

```
sink = smooth01((groundY(cam.x, cam.z) − cam.y) / 0.94)   // the murk
keep = smooth01((−cam.x − 4.6) / 0.8)                     // the cutaway hold
arrival = max(sink, keep)
```

- **`sink`** — how deep the lens is below the soil line. 0.94 is measured
  equivalence, not a new choice: the shipped p-window spans camera depth
  0 → 0.942 on the leg (p → depth linear there to ~3 %), so every scrub
  reproduces the approved murk reveal. Worst |new − old| along the whole leg:
  **0.038, at p 0.700** — inside the near-black murk; **0.000 everywhere
  outside the window**.
- **`keep`** — above ground the colony may only be seen through the Final
  cutaway, so this term rides the same camera-x family as Final's `riseOf`
  (onset x −4.6; 0 at every other chapter's rest and along every jump arc
  between them). It saturates by x −5.4 because the rise's `sink` starts
  easing at depth 0.94 (p 0.821, x −5.47): measured min of the max() across
  p 0.78–0.87 at 1e-3 steps is **0.9993** — no dip through the surfacing.
- The arm ease tightened 2.6 → 6.0. With the reveal camera-pure, the ease is
  invisible on every scrub (earliest sink > 0 is p 0.6924, 0.06 of p after
  the arm at 0.63); the only place it showed was inside a jump blend, where
  2.6 left the landing snap a ~6 % one-frame step. At 6.0 the step is < 1 %.

## Existence vs. cost

"Always there" is the *visibility law*, not a draw obligation: above ground,
away from the cutaway, the colony is genuinely occluded, so `group.visible`
still drops and the chapter costs nothing — the reveal gates COST without
gating the occlusion story. Measured at every rest, before → after
**bit-identical**: mission 42 calls / 12,829 tris / 44,377 lines / 24,090
points both builds (inspire, connect likewise; frame times within noise).

## Gates

- **Jumps** (Connect→Owned, Mission→Owned, Connect→Final, Final→Owned,
  Owned→Final): **0 frames** of fade > 0.01 while above soil outside the
  cutaway territory, all five rides. First non-zero fade on a jump into
  Owned is at depth **+0.09–0.15 under the soil**, completing through the
  murk (fade 0.99 by depth 0.92), landing step ≤ 0.6 %.
- **Mirror**: forward vs reverse placement sweep p 0.60 → 1.00 at 0.002
  steps: worst |fwd − rev| fade = **0** (pure function of pose).
- **Console**: 0 errors / warnings over the jump rides and a full
  0 → 1 → 0 ride.
- **Goldens**: `capture.py --check` PASS, all ten within threshold, worst
  MAE 0.02/255. **No reference moved.**

## Residual

During a jump toward Final the colony now arrives with the cutaway's own
x-territory (keep ramps 0 → 1 across x −4.6 → −5.4) while Final's slab is
itself fading in on the same family — for a few frames mid-swing the two are
each ~half-lit. Strictly better than the shipped full-lit colony over bare
terrain, and the honest reading of "the cutaway world is arriving"; noted in
case a future pass wants the slab to lead the colony by a fixed margin.

## 2026-08-11 — The ember dots stop flickering (held-still markers pass)

Part of the same pass as 07-chapter-inspire.md / 16-connect-ground-restage.md
(2026-08-11): Hannah wants the node markers stable. Owned's sixteen faces
each carry an ember CORE at their centre and a broad HALO behind them
(portraits.js `makeGlowPoints`), and both ran a live flicker —
`0.80 + 0.20 sin(uTime ...)`, i.e. **±20%** of brightness on the dot's own
clock (a 44 px pixel window per face measured 12-28% of combined swing at
the rest).

The clock is removed from the DOTS only: the flick expression is frozen at
its own t = 0 phase (`0.80 + 0.20 sin(vSeed * 13.7)`), which keeps every
node's individual resting level — no army of identical dots — and matches
what the frozen goldens always rendered (uTime was 0 there), so owned@*
stay untouched (--check MAE 0.02, GPU constant-folding noise). cores.mat
and halos.mat left `timeMats`; they still answer the remix WAVE and hover,
which are events, not cycles.

Deliberately KEPT alive: the faces' own independent flicker (±14%, two
incommensurate rates), the rim light, the node strands and the substrate
waves — that is the "grown, not pinned" life of the field, and it is the
surround, not the marker. If Hannah reads the FACES as pulsing too, that
term (`flick` in the portrait fragment shader) is the next candidate — but
a face is a portrait, not a dot, so it was left with its light.

## 2026-08-11 — The Contributors button is removed (Hannah's request), and what that costs on a phone

Hannah: "Remove the 'Contributors' button in the Owned by the Ecosystem
section." Done — and since `CHAPTER_INDEX` had exactly one entry, the
button was the only door into the whole node-index feature
(journey/ui-index.js, 24-mobile-pass.md), so the clean removal takes the
feature with it: ui-index.js deleted; ui.js loses the import, the
`CHAPTER_INDEX` table, the wiring block (createNodeIndex, indexControls,
indexNeed, openIndex, indexEntries, the resize/orientation latch resets),
the cue's inert coupling and the frame-loop reachability rule
(`h.placeable` itself stays — the pill placement and hit pads read it);
site.css loses every `.j-index*` rule including the shared focus-ring and
PL-1.4 / reduced-motion entries; tools/inputgates.js drops the two index
selectors from its overlay gate (G2/G3 tolerate absence by construction).
The static tier never carried the control — grep proves both tiers clean.
The Owned copy block now ends on the Learn more / Remix pair (`eea3ffe`),
which reads balanced at 1440x900 and 375x812 (shot before/after).

Worth recording: the cue was SHOWING at 1440x900 too — the reachability
latch is one-way and fires on any frame that fails to place a node (a
detail-open or travel frame qualifies eventually), which is why Hannah met
a control the design intended for phones. The latch's own logic made the
desktop sighting inevitable; had the bug been fixed instead, she might
never have asked.

THE COST, stated plainly (this is OW-4.5's debt reopening): the portrait
arc is authored in the landscape rest frame, and at 375x812 only ~2-4 of
the sixteen contributors project on-frame — the index WAS the only mobile
route to the other twelve-to-fourteen, and the only listable form for a
screen reader. Deep links (`#/owned/contributor-N`) still resolve, but
nothing on a phone offers them.

PROPOSAL (not built — Hannah's call): fold the roster into the Owned
"Learn more" card, which is already a modal dialog reachable at every
size — sixteen rows grouped by role, each opening the contributor card
through the same `onOpen` funnel the chips use. One existing control, no
new chrome, and the mobile claim "100% shared with the people who build
it" gets its sixteen faces back.

## 2026-08-11 — THE SOIL HORIZON: the crossing had a hole in it, and the soil had no interior

Hannah, on the Connect → Owned transition: *"about halfway through the
transition — when it's going between the levels of the ground — there's a
weird patch… I think we need the transition point, the ground, to be RICHER
as we're going into it."* Her attached still: sparse amber lines over
near-black with a few glowing portraits — thin and unfinished.

### The diagnosis: an occlusion STEP against a reveal RAMP

Measured on the shipped tree with a dense frozen strip (`?capture=<p>`, step
**0.001**, 1440x900). The crossing is not a gradual thinning, it is a cliff in
**one 0.001 step**, between p 0.694 and p 0.695 (the soil crossing is p 0.6927):

| | p 0.694 | p 0.695 |
|---|---|---|
| lit pixels (lum > 24) | 49.2 % | **19.9 %** |
| p95 luminance | 90.7 | **26.6** |
| mean luminance | 32.6 | **19.4** |
| top-30 %-of-frame mean | 59.9 | **18.0** |

The mechanism is a mismatch of *shapes*, and it is structural rather than a
tuning error:

1. the **above-ground world collapses to a grazing sliver** the instant the
   lens passes the soil plane — a STEP;
2. the **colony below is revealed by camera depth over 0.94 units**
   (`SINK_D`, `fc1e151`) — a RAMP, so it is **8 %** up at that moment;
3. between the step and the ramp the frame holds nothing, and the one thing
   reliably in it — the soil ceiling — was **a flat near-black card at 8 %
   opacity**, because its own opacity rode `eff` and therefore rode `SINK_D`.

Point 3 is worth stating plainly: **the shipped soil did not occlude.** At
depth 0.2 the lid was 90 % transparent, which is the opposite of what
`fc1e151` declared ("the lid material occludes until you are through it").

### What shipped — three changes that only work together

Either of the first two alone is *worse* than shipped: opacity alone makes the
hole blacker, texture alone is texture at 8 %.

- **The lid goes solid on crossing, not on sink.** `ceiling.uOpacity` now rides
  the chapter arm times `LID_D = 0.14` units of depth, split out of `setFade`
  into its own `setLid`. Still camera-pure, still 0 above ground, still
  back-face-culled from above (so the Final cutaway is untouched by
  construction), still exactly mirrored on a reverse ride.
- **The earth gets a face.** The ceiling shader gains a two-octave world-space
  mottle (clods) plus a finer grain, **added as warm value** rather than
  multiplied into a near-black.
- **THE SOIL HORIZON** — the metre of earth the lens passes *through*: `FELT`
  (5,200 drooping rootlets in depth 0.10–1.90, one strand in seven a long
  `FEEDER` bearing on the crown) and `GRAIN` (4,200 mineral flecks). Two draw
  calls, driven by `passage`, a depth band.

### Three numbers that were arrived at the hard way

- **Density belongs on the corridor, not across the box.** The first build
  scattered both layers over `BX`/`BZ` like every other ambient layer here and
  bought almost nothing (crossing mean 19.4 → 20.8): a contact-range medium at
  ~2.5 strands per unit² puts seventy strands in everything the lens can see.
  Rejection-sampling against `leg.camDist` (the same polyline every clearance
  rule in this chapter measures against) is what made it a picture.
- **Grain needs its own shader, not `PointsMaterial`.** A size-attenuated soft
  disc passed at contact range *balloons* — a grain 0.25 units off the lens
  drew a 60 px disc and the crossing read as **bokeh**, champagne bubbles in
  front of the network. The fix needs a hard clamp on projected size, a
  near-fade, and a distance fog; none is available on `PointsMaterial`.
- **`PASS_HI` is set by the SHALLOWEST rest, not the landscape one.** The Owned
  rest is a different pose per aspect. Measured at the three shipped viewports:
  depth **1.207** at 1440x900 but only **0.987** at 430x932 and 375x812 (fov 64,
  pitch −15.4). The first build used 1.15 — safe on landscape, and it left the
  horizon **47 % lit at the portrait rest**, moving `owned@430x932` by MAE 0.73
  (1.9 % px>8, all of it in the top four tenths). `PASS_HI = 0.90` clears the
  shallower rest by 0.087, so *no* rest on *any* aspect can contain one felt
  strand or one grain.

The ceiling texture is protected by a **geometric argument, not a taste
setting**: it dies at 3.00 units, and the nearest ceiling fragment that can be
in frame at all is **3.563** units (1440x900) / **3.695** (portrait). Measured,
not assumed.

The choreography also lands where it belongs. Depth 0.60 → 0.90 is p 0.7035 →
0.7107, and `SINK_D` puts the colony at 70 % → 97 % across exactly that
stretch: **the horizon hands over to the root world as the root world
arrives**, so the soil owns the murk window (0.692–0.712) and nothing else does.

### Results

| p | metric | before | after |
|---|---|---|---|
| 0.695/0.696 (1440x900) | lit pixels | 19.9 % | **36.8 %** |
| | p95 luminance | 26.6 | **35.7** |
| | mean | 19.4 | **22.9** |
| | pure-black pixels | 1.3 % | **0.0 %** |
| 0.696 (375x812) | lit pixels | 26.4 % | **41.9 %** |
| | p95 luminance | 29.0 | **39.7** |
| | pure-black pixels | 3.0 % | **0.1 %** |

### Verification

- **Goldens**: all ten within; `owned@1440x900` and `owned@430x932` both **MAE
  0.03 / 0.0 % px>8** (unstructured, max 10/255 on a single pixel — float
  accumulation order, not a visible change). Every other golden 0.00.
- **Mirroring and self-ignition**: the live uniforms swept forward then reverse
  over p 0.600–0.900 at step 0.001 (301 samples) are **bit-identical**
  (worst delta 0.000e+00, both terms). **Zero** frames with the camera at or
  above the soil and any horizon term > 0.
- **Terms live over p 0.6930 – 0.8540** — precisely the underground stretch,
  from the dive's crossing to the rise's pierce.
- **Camera untouched**: no key moved, so the soil crossing stays at p 0.6927,
  the murk window 0.692–0.712 and `CONNECT_HOLD_HI` 0.705 are as shipped,
  `owned/leg.js`'s sampled window (p 0.660–0.872) sees a bit-identical spline
  and the colony is not regrown. Rates and roll are the shipped ones by
  construction (roll 0.000 at every sample, both aspects).
- **Console clean** over a full forward + reverse ride (241 steps each way,
  live, page-side hook on error/warn/onerror/unhandledrejection): **0 events**.
- **Budget** (1440x900, draw calls / median composer submit):

  | point | before | after |
  |---|---|---|
  | Connect rest | 47 / 0.4 ms | 47 / 0.3 ms |
  | **crossing 1 (p 0.696)** | 62 / 0.4 ms | **64 / 0.4 ms** |
  | **Owned rest** | 55 / 0.2 ms | **55 / 0.2 ms** |
  | crossing 2 (p 0.830) | 217 / 0.8 ms | 219 / 0.6 ms |
  | Final rest | 428 / 1.1 ms | **427 / 1.2 ms** |

  `setPassage` hides both objects outside the band, so the horizon is **free
  everywhere it is not the picture** — both rests return to the shipped count
  exactly, and the Final rest drops one call and 3,872 triangles because the
  ceiling is no longer submitted above ground.

### Residual

Just before the crossing (p 0.685–0.692, ~0.008 of p, above ground) the lens
passes within ~0.2 units of the soil plane and a **hard-edged flat orange
wedge** fills a third of the frame. Isolation places it in the hero's own
ground group (`scene.children[0]`, `organism/*`) — hiding that group removes
it, hiding any single child does not — and `organism/*` is read-only for
journey work. It is above ground, so the soil horizon cannot reach it. Named
here for whoever owns the hero: it is the most literal instance of Hannah's
"the edges are kind of visible" still on this leg.

---

# 2026-08-13 — the crown takes the re-deal, and Remix stops being a button

> "In Owned by the Ecosystem, remove the visible Remix button. There is
> already an interaction where hovering over the top causes a light/flash
> effect. That existing interaction should take over the Remix behaviour. In
> other words, when that light-flash interaction is triggered, it should also
> switch/remix to a different contributor/person, exactly as the Remix button
> currently does. This should make the interaction feel integrated into the
> scene rather than exposed as a separate UI control."
> — Hannah

Two things this chapter already had, joined: the **crown hover zone**
(`696e95d`, report C above — the one hover entitled to light the whole root
network) and the **re-deal** (`eea3ffe` — an arrangement index that
re-derives all sixteen nodes' source image, mirror, exposure, warmth and
grain seed, played as a 1250 ms wave out from the crown). The pill that
pulled the second one is gone. The thing the wave already came out of pulls
it now.

## G — the commit model, and why it is not `pointerenter`

The literal reading is one line: fire the re-deal from the zone's
`pointerenter`, next to the light. It was measured and rejected.

The crown zone is a **246 px circle pinned to the top-centre of the frame** —
`x 597..843, y -87..159` at 1440x900, `y -4..173` at 375x812. That is the
band a pointer crosses on the way to the wordmark, to the browser chrome, or
across the top of the picture on its way anywhere. A 1250 ms sixteen-face
swap fired by every idle pass over the top of the page is a page that will
not sit still, and the *reason* report C moved this response off the prose
line was precisely that it kept answering pointers that were only passing
through. Re-deals fired the same way would repeat that mistake with a much
louder response.

So the light and the commit are **separated in time, not in place**:

| | what fires | when |
|---|---|---|
| pointer enters | the colony surge (`setHot`, amp 1.0) | immediately, unchanged |
| pointer **comes to rest** on the crown | the re-deal | ≥ `ZONE_DWELL_MS` 380 since entry **and** ≥ `ZONE_STILL_MS` 260 with no movement past 3 px |
| pointer **presses** | the re-deal | at once; the dwell is cancelled |
| finger **taps** | the surge **and** the re-deal | at once — a finger has no hover, so the tap is entry and commit in one |
| **Enter / Space** | the re-deal | at once; focus lights the colony exactly as hover does |

"Still", not "dwelled". A bare dwell timer is beaten by a slow traveller; a
pointer that has *stopped* has chosen the thing under it. Measured, a
250 px sweep across the zone at ~1600 px/s produces **zero** re-deals, and a
pointer parked at the centre commits at **0.48 s**.

**One commit per visit.** After a re-deal the zone will not fire again until
the pointer leaves and returns (or the visitor presses). Measured: a pointer
parked on the crown for 2.5 s after its re-deal lands gets exactly one.
A finger has no visit to spend, so consecutive taps each fire — and a tap
landing *inside* the running swap is refused by the chapter (`remix()`
returns null while `swap` is live) and by `busyMs` above it: measured
`2 → 3 → 3`.

## H — the crown became a control, so it took a control's obligations

The retired pill was the only keyboard and touch route to the re-deal. The
crown had neither — residual 1 of the 2026-08-06 pass reads "the crown is now
the one part of the composition that answers a mouse and not a keyboard."
That was defensible while it carried **no information**; it is not defensible
now that it carries a behaviour. **The residual is retired.**

`addHoverZone` therefore has two shapes. A zone with no `action` is what it
always was: an `<i aria-hidden>` that paints nothing and is invisible to
everything except a pointer. A zone that declares an `action` is a real
`<button type="button">` with an accessible name — *"Re-deal the contributor
portraits"* — and it inherits the trigger contract wholesale from the pill:
`{ announce, busyMs }`, `aria-disabled` rather than `disabled` (a real
`disabled` blurs the element mid-press and throws a keyboard visitor back to
`<body>`), and the polite live region, because a field of sixteen faces
turning over with no focus move is otherwise silent.

Hannah asked for the **visible** button to go. This one is not visible: the
crown paints nothing and neither does its button. What it has instead is the
scene's own answer — focusing it lights the whole colony, exactly as hovering
does — plus a real ring on the circle the crown occupies, because a scene
response is not a focus indicator a conformance test can see. Measured,
`:focus-visible` → `2px solid rgb(240,200,119)`, offset −2, plus a 22 px
glow.

**Tab order.** The zone host moves ahead of the hotspot host in the DOM so the
crown lands **exactly where the Remix pill landed**: after the copy it
belongs to, ahead of the sixteen people. Stacking is by explicit z-index (0
for zones, 1 for chips), not DOM order, so nothing about what paints over
what — or what out-hit-tests what — changes. Measured tab walk:

    … Owned, Epilogue, Menu, Learn more, [CROWN], contributor-0 … contributor-13

`visibility: hidden` is doing double duty and it is worth naming: it is what
already made an off-chapter zone untouchable by a pointer, and it is *also*
what keeps the button out of the tab order, by spec, with no roving
`tabIndex`. The one gate ui.js already flipped for the pointer is the gate
for the keyboard.

## I — what was removed, and what was deliberately not re-homed

`content/content.js` loses the `owned-remix` action. With it goes the whole
`kind: 'button'` limb of the action row:

- `ui.js`: `nodesGlyph()`, the button branch of `buildActions`, and the
  busy/announce plumbing — which is not deleted so much as **moved**, to
  `addHoverZone`, where it now has its only client. `NS_SVG` went with the
  glyph (grep: no other user).
- `site.css`: `.j-act-explore` and its hover/busy states, `.j-act-glyph`,
  `.j-act-link`, `.j-act-node`, `@keyframes j-act-lit`, `@keyframes
  j-act-spark`, `.j-act[aria-disabled]`, the `:nth-child(2)` entry offsets,
  and the three reduced-motion entries that named them.

Nothing of it is re-homed onto the crown, and that is the point: the pill
needed **artwork** to say it was alive, because a pill is a rectangle with a
word in it. The crown is a lit knot of roots that already answers you. What
it inherited is behaviour, not decoration — the whole of its CSS is a cursor,
a busy cursor and a focus ring.

`kind: 'button'` support went with its only client rather than staying as an
unreachable branch. Content declaring one now renders nothing, by the
explicit `continue` in `buildActions`, and the next chapter that wants an
in-copy button re-adds six lines. That is cheaper than a second, clientless
copy of a contract that already lives in `addHoverZone`.

**Learn more, alone.** `eea3ffe` designed the two as a pair, so the survivor
was measured rather than assumed. Its box is **unchanged to the pixel** —
`117.7 x 36.7` at 1440x900 and 1280x800, `104.7 x 44` at 375x812 (PL-1.4's
min-height) — and `pos-topcentre`'s `justify-content: center` was already
centring the *row*, so a row of one is centred on the block to **0.0 px** at
all three sizes, where a row of two was centred as a pair. The 24 px gap
under the sub is the row's own margin and did not move. It needed no
adjustment, and the reason is that the silhouette it borrows (the hero
`.pill`) was always a lone-destination shape; the pair was the special case.
The entry timing is likewise untouched, because it was always the FIRST pill
that carried the 0.40 → 0.92 numbers d1ecc23's contract is written against.

## Gates

    button gone         grep 'owned-remix|j-act-explore|j-act-glyph|
                        j-act-node|j-act-link|nodesGlyph|kind: .button' -> 0
                        hits anywhere in the build. `remix` survives ONLY as
                        the mechanism it always named — trigger
                        'remixPortraits', portraits.remix(), the zone's
                        `action` — plus dated history in comments; grep
                        -i remix over journey/ + content/ returns 43 lines,
                        every one of them a comment or one of those three.
                        TIER 3: `grep -iE 'remix|j-act' static/` -> 0 (it
                        never carried the control). Live DOM at the Owned
                        rest: ONE control in the row, `<a>` "Learn more".
    swap is real        ATLAS CELLS CHANGED 16/16 on every route — dwell,
                        press, tap, Enter, Space — sampled per node from the
                        live uMapA canvas (32x32 FNV at each of the 16 cells)
                        before and after
    pass-through        250 px sweep across the zone at ~1600 px/s:
                        arrangement 0 -> 0, cells 0/16
    dwell               parked pointer commits at 0.48 s; parked a further
                        2.5 s commits nothing more (one per visit)
    press               arrangement +1 inside 250 ms, cells 16/16
    touch               375x812, mobile emulation, pointer:coarse — tap fires
                        surge + re-deal, 16/16, announced; second tap 16/16;
                        tap mid-swap refused (2 -> 3 -> 3); zone 177x178 px,
                        clears the 44 px minimum by 4x (floor added at
                        r 22 under the sheet query — measured never binding:
                        r 123 / 109 / 89 / 140 at the four sizes)
    keyboard            Tab #11 reaches the crown, straight after Learn more
                        and before contributor-0; :focus-visible true, 2px
                        gold ring + 22px glow; Enter and Space both fire,
                        16/16, and FOCUS SURVIVES the swap (aria-disabled,
                        not disabled)
    reduced motion      swap 357 ms wall clock (not 1250), 16/16 cells, live
                        region announced, pill at its resting style
                        (opacity 1 / transform none / animation none /
                        transition 0s)
    hit model           all 16 hit pads still answer at their own centres
                        (16/16); wordmark and Discord pill hit-test to
                        themselves; the canvas still takes the poke; the only
                        full-viewport hit-testable elements are #stage and
                        the canvas, exactly as before (6903c4a)
    console             full wheel ride mission -> owned -> final -> owned
                        (crown re-deal, then LEAVE mid-swap) -> card open ->
                        Escape -> mission: 0 errors, 0 warnings. The swap
                        left mid-flight still landed (arrangement 2, not
                        swapping) — eea3ffe's out-of-gate clock intact.
    goldens             capture.py --check PASS, all ten MAE 0.00/255,
                        0.0% px>8. NOTHING re-shot.

The `<i>` → `<button>` swap is the one change that could have touched a
frozen frame — the zone is `.vis` in the Owned goldens — so every UA button
default is explicitly reset (`appearance`, `background`, `border`, `padding`,
`color`, `font`). Measured: owned@1440x900 and owned@430x932 both 0.00.

No camera key moved, no scene geometry moved, no placement changed. `f53fab3`,
`d46e6bb`, `a3ba9fd`, `f2bd1cd`, `696e95d`, `45f600b` and the reveal laws are
untouched; `eea3ffe`'s swap, wave, epicentre, reduced-motion path and
out-of-visibility clock are untouched — only the control that pulls them.

## Residuals

1. **The re-deal is now discoverable only by doing it.** The pill said
   "Remix"; the crown says nothing, and its resting affordance is a cursor.
   That is the trade Hannah asked for — an interaction that belongs to the
   scene instead of sitting beside it — but it is a trade, and it is the one
   thing here a visitor could miss entirely. The light on hover is the whole
   invitation.
2. **Still one image set.** Unchanged from `eea3ffe` residual 1: the re-deal
   is a re-deal, not a second cast, `assets/test-portraits` is look-dev only
   and the pre-deploy deletion rule stands. Moving the control changed
   nothing about what it deals.
3. **Arrangements still cycle** with period 7 on the small pool (`eea3ffe`
   residual 3), and a crown that is easier to reach than a pill will reach
   the repeat sooner.
4. **`kind: 'button'` is gone from the action row**, so a future chapter that
   wants an in-copy button re-adds the branch. Deliberate — see §I.
5. **A pointer entering the window from above** lands in the zone with no
   `pointerenter` from below it. It gets the light, as it always did; whether
   it also commits depends on whether it stops there, which is the same rule
   as everywhere else. Left as the honest reading.

---

# 2026-08-13 (later) — the card stops being furniture on the far flank

> "When clicking a contributor in Owned by the Ecosystem, the associated
> information box currently appears far off to the right. Instead, the box
> should feel spatially connected to the person the user clicked. Position it
> directly above or very close to that specific contributor, with sensible
> collision handling where necessary so it stays readable and onscreen. The
> user should immediately understand which contributor the information belongs
> to without having to visually connect two distant parts of the screen."
> — Hannah

`.j-card` was pinned at `right: 3.4vw; top: 50%` — a 400 px slab on the far
flank with no relationship to the face that opened it. On this chapter that is
not a nicety. **Every one of the sixteen cards is headed "Contributor"** —
nobody has completed the consent pipeline (CO-1.4 / OW-4.4), so the heading,
the role and the blurb are the same placeholder for four people at a time.
Position was the only thing on screen that could say *which* of the sixteen
you were reading, and it was saying nothing.

## J — this is placePop's job, not a new one

`e20f7ff` already solved *anchor a panel beside a world-tracked thing, flip
rather than clip, never cover the thing it belongs to*. `placeCard()` is that
function's shape. Three differences, each forced by what a card is:

1. **It anchors to the NODE, not to the chip's box.** A popover hangs off a
   live chip rect. While a card is open every chip is faded and non-placeable
   by design (`want = gate > 0.72 && !detail` — "the frame belongs to the
   detail"), so there is no rect to read; and the pill was never the right
   anchor anyway — `696e95d` measured it as a 300 px bar lying beside an
   18-50 px disc, 116 px from the thing it stood for. So the card is placed
   against the node's own projection and its **drawn radius**, taken through
   `steadyProject`. Measured over 40 consecutive frames at the Owned rest:

       raw   v.project(camera)   x spread 0.650 px   y spread 0.622 px
       steadyProject             x spread 0.000 px   y spread 0.000 px
       transforms the card wrote across those 40 frames:  ONE

   That 0.650 x 0.622 is exactly the period-8 TAA tremor `d46e6bb` named as
   Hannah's "shivering". A card pinned through the raw matrix would have
   inherited it whole.
2. **Above is preferred, not beside.** Hannah asked for above; it is also
   right for a 400 px panel over an arc that spreads horizontally — a card
   beside an edge face has nowhere to go, a card above one usually does.
3. **The ladder is four deep**: `above → below → right → left`, each admitted
   only if the whole box fits, then one last resort that takes the roomier of
   above/below and clamps. The first four are **disjoint from the node's disc
   by construction**, so the clamp on the other axis can never slide the card
   over its own subject — the same argument that makes the popover's two side
   placements safe.

Measured, all four rungs and the last resort are reachable and correct:

| viewport | what it forces | sides chosen |
|---|---|---|
| 1440x900, 1280x800 | the shipping case | **above** ×10 / ×10 |
| 1440x470 | no room above the upper arc | above ×4, **below** ×2 |
| 900x420 | no room above *or* below for some | above ×3, below ×2, **left** ×1 |
| 1180x300 | wide and very short | **right** ×5, above ×1 |

Across every one of those: `coversNode` **false** and `onScreen` **true**,
on all 34 placements. Node-to-card gap at the shipping sizes runs **35–71 px**
(`CARD_GAP` 16 past a hit-pad-scale radius), against the ~600–1100 px the old
flank position put between a left-hand face and its card.

## K — the filament, and what it is for

`--j-card-fx` / `--j-card-fy` publish where the node sits **inside the card's
own box**, so the contact filament is a 68 px segment pointing at the person
rather than a rule along the whole edge. This is not decoration; it is the
answer to the one case the edge would get wrong. When a face near a frame edge
pushes its card sideways, the card's centre is no longer over its subject:

    contributor-13  node x 63.3   card clamped to x 12   filament at fx 51.3
    contributor-2   node x 84.4   card clamped to x 12   filament at fx 72.4
    contributor-3   node x 1271.6 card clamped right     filament at fx 243.6

The filament stays on the node's column in every one.

The entry is the popover's motion family (`e20f7ff` / `d1ecc23`), verbatim in
structure: `j-card-lamp` brings the panel up out of the dark while
`j-card-unfurl` walks its edge out from the side the node is on, plus the
filament's own strike. **`clip-path`, never transform** — for exactly the
reason the popover states it: transform is the placement channel here too.
Sampled mid-flight, the card's rect is `[683, 292, 400]` at 0.04 s, 0.12 s,
0.30 s and 0.75 s — **it cannot walk while it opens**, so the hit target it
presents at 40 ms is the one it presents at rest.

A **retarget** (one contributor straight to the next) re-arms the entry,
because that is a fresh subject and the card has just travelled across the
frame to a different person.

## L — what is deliberately unchanged

**The whole modal contract**, verified end to end after the move:
`role="dialog"` + `aria-modal="true"`, focus moved to the close control on
open, the focus trap holding (Tab ×4 stays on `.j-card-x`, the card's only
focusable), Escape closing, `aria-expanded` **true on the open chip and false
on the one it retargeted away from**, the polite live region announcing a
retarget, and `claimInput(card, { modal: true })` so the card scrolls natively
instead of being scrubbed. Placement is a transform; none of that knows or
cares where the box is.

**The hit pads.** Measured before an open and after a close: every live pad
answers at its own centre (15/15, then 9/9 as the stagger refills). While the
card is open there is nothing to steal — the chips are faded out by the
pre-existing detail rule — and `.j-card:not(.open) { pointer-events: none }`
is new belt-and-braces so the 0.34 s closing fade is never a hit surface over
a face that has already come back.

**The bottom sheet (PL-1.3).** On a coarse pointer or a viewport ≤ 720 px the
card is still a sheet from the bottom edge, with its 44 px grab handle, its
drag-to-dismiss and its internal scroll; `placeCard()` declines outright while
`.sheet` is set, and the entry is not armed for it. That is a decision, not an
omission. A sheet on a phone is already unambiguous — it fills the bottom
third the instant you tap, and there is no "far off to the right" there to
fix. Hannah's report is about the desktop side card, and so is the fix.
Re-forming across the 720 px line with a card open now hands the transform
back, or the sheet would arrive wearing the side card's translate (inline
style out-ranks `.j-card.sheet { transform: none }`).

At 375x812 the anchored geometry was measured anyway, with the sheet class
lifted by the probe, to show it would be correct if PL-1.3 ever wanted it:
315 px wide, `above`, gap 36-42 px, never covering, always on-screen —
including `contributor-10` at node x **−100.9**, off the left edge, whose card
clamps to x 12 with the filament at fx 28.5 pointing left.

**Off-frame and behind-the-lens.** A node that projects outside the frame is
not abandoned: the anchor point is **clamped to the frame edge**, so the card
meets the visitor at the edge the person is beyond. Only a node *behind the
lens* has no honest direction, and that falls back to the pre-2026-08-13 flank
position with no filament — measured at x 991 on a 1440 frame, which is
`right: 3.4vw` to the pixel. Measured across all four rest poses × 16 nodes,
**no contributor is ever behind the lens**, so that branch is defensive; it
was exercised by stubbing `nodeWorld` from the probe (z 1.035 → `side=flank`,
on-screen, `content: none` on the filament).

And the card is **never hidden when its subject leaves the frame**, unlike the
popover. A popover is an annotation with nothing to annotate; a card is a
modal disclosure with a focus trap and a route state behind it, and taking it
out from under a visitor's keyboard because the camera drifted would be a far
worse fault than a card that has run out of things to point at.

## Gates

    anchored            34 placements over 4 viewports x 10 contributors:
                        coversNode FALSE and onScreen TRUE on every one
    ladder              above / below / right / left and the last resort all
                        reached and correct (table above)
    proximity           node-to-card gap 35-71 px at 1440x900 and 1280x800,
                        29-40 px on the squeezed viewports (was 600-1100 px
                        for a left-hand face against the old flank pin)
    edges               contributor-2 / -13 (left), -1 / -3 (right),
                        -13 / -15 (bottom), -0 / -1 (top) all shot at
                        1440x900 and 1280x800; every clamped card keeps its
                        filament on the node's column
    jitter-free         steadyProject spread 0.000 x 0.000 px over 40 frames
                        against raw project's 0.650 x 0.622; the card wrote
                        ONE transform across those 40 frames
    entry               unfurl + lamp + filament, clip-path only; the card's
                        rect is identical at 0.04 / 0.12 / 0.30 / 0.75 s
    reduced motion      animation none, clip-path none, filament opacity 0,
                        transition 0s — and the PLACEMENT still applied
                        (contributor-13: side above, gap 60.5, covers false)
    a11y contract       dialog/aria-modal true; focus to .j-card-x on open;
                        trap holds (Tab x4 -> .j-card-x); Escape closes;
                        aria-expanded true on the open chip, false on the
                        retargeted-away one, all false after close; live
                        region speaks on retarget; claimInput modal held
    hit pads            every live pad answers at its own centre before the
                        open (15/15) and after the close (9/9); a closing
                        card is pointer-events:none for its whole fade
    375x812             PL-1.3 sheet intact and unchanged (44 px grip, no
                        transform written); anchored geometry measured
                        separately at that width and correct
    other chapters      Inspire and Connect still disclose through the
                        POPOVER, not the card — #/inspire/arca and
                        #/connect/discord pin their popovers beside their
                        chips with cardOpen false
    console             full wheel ride mission -> inspire -> connect ->
                        owned -> final and all the way back, plus a crown
                        re-deal, a card open and an Escape mid-ride:
                        0 errors, 0 warnings
    goldens             capture.py --check PASS, all ten MAE 0.00/255. The
                        card is `hidden` at rest AND in HIDE_SELECTORS, so
                        it cannot reach a frozen frame either way.

## Residuals

1. **Escape does not restore focus to the chip — and did not before this
   pass.** `closeCard()` calls `returnFocus.focus()` on the tick, while the
   chip is still `visibility: hidden` from the detail-open fade, so focus
   lands on `<body>`. **Verified identical at `961b2d1` and on this tree** by
   stashing and re-running the same probe: same result, both times, for
   Escape and for the ✕. Long-standing, orthogonal to placement, and left
   alone rather than folded into a placement commit — but it is a real
   keyboard hole and should be fixed next.
2. **The contact filament sits at inset 0, not −1 px like the popover's.**
   `.j-card` is an `overflow-y: auto` box and anything outside the padding box
   is clipped. A card long enough to scroll would scroll its filament away.
   No contributor card is anywhere near that (200-223 px against a 74vh cap),
   so it is a latent case, not a live one.
3. **`max-height` is still a flat 74vh, not the room actually available above
   the node.** The ladder's last resort handles the overflow correctly by
   clamping, but a genuinely tall card in a short frame would sit over its own
   subject rather than shrink. Contributor cards are 200-223 px; if real
   consented copy makes them much taller, this is the line to revisit.
4. **375x812 still shows 2-4 of 16 faces** (§9.4, unchanged). Anchoring makes
   the placed ones unambiguous; it does not reach the twelve that are not
   placed, and the sheet is still the vessel there.
5. **The flank fallback is unexercised in the shipping build.** No pose puts a
   contributor behind the lens. It exists so that a future camera cannot make
   the card jump to a meaningless corner.

---

# 2026-08-14 — the last term that was still keyed to p

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/chapters/owned/index.js`. One mask. No geometry, no route
file, no camera key, no golden move.

> "When I'm starting the loop from the last to the first — the end-to-beginning
> loop — the ownership orbs are visible in that. They shouldn't become visible
> when I'm above ground; they should only be visible when I'm below ground, and
> become invisible when I go above ground."

## 21. Which of the two possibilities it was

The brief allowed two: either the orbs were never brought onto `fc1e151`'s
camera-depth rule, or the wrap's camera path defeats it. **Neither, exactly** —
and the third answer is more useful than either.

The orbs are the contributor nodes' cores and halos in `portraits.js`, and they
ride `portraits.setFade()`, which index.js writes as `eff * faceVis`. `eff` is
`amt * max(sink, keep)` — fully on the camera-depth rule, exactly as `fc1e151`
left it. The defect is the **second factor**. `faceVis` is the Final-surface
mask added by `17-final-field.md`, and it was written

```js
const faceVis = 1 - smooth01((pNow - 0.815) / 0.030);
```

— a pure function of **p**, justified in its own comment with the sentence "p
and the camera are a bijection on the leg". That is the same premise `keep`
was written on, and `873246f` retired it four hours earlier for the same
reason: it is true on the leg and false the instant a jump snaps `p` while the
camera has not moved. `fc1e151` cleared this premise out of the whole chapter;
this one term was added afterwards and inherited it.

### Measured, before

Real in-page rAF-timed `WheelEvent`s at ~15–20 ms spacing, 1440x900, tracing
every **presented** frame (a tracer animator registered last, so it runs
immediately before `composer.render()`). `journey.wrap()` was not used
anywhere.

| | down-wrap (last → first) | up-wrap (first → last) |
|---|---|---|
| orb frames lit **above ground** | **36** | 0 |
| peak orb fade above ground | **1.0000** | 0 |
| span | **778 ms** | — |

The step itself, frame by frame: at the Final rest `faceVis` is 0 and the orbs
are dark — which is why `final@*` and the epilogue were always clean and why
this was only ever visible on the loop. **One frame later** `p` has snapped
0.97 → 0, the camera has not moved (x −14.72 → −14.72, depth −2.68 both
frames), and the mask steps **0 → 1**. The whole contributor field — orbs and
busts — ignites at full strength over an open above-ground view and holds there
until `keep`'s own z term happens to close at z ≈ −0.8, 778 ms later.

The up-wrap showed nothing, because its destination `p` is 0.97, where the mask
is 0. **The two directions were not mirrors, and the one that broke is the one
Hannah named.**

## 22. The restatement

```js
const faceVis = smooth01((depth - FACE_D0) / (FACE_D1 - FACE_D0));
```

`depth` is the same `leg.groundY(cp.x, cp.z) - cp.y` the chapter's `sink`
already uses, so this joins the language the rest of the file speaks and the
soil governs the orbs whatever path the lens took.

* **`FACE_D1 = SINK_D` (0.94)** — deliberately not a second number. The faces
  are full exactly when the chapter already declares the colony arrived, and
  both rests clear it by measurement (landscape depth **1.207**, portrait
  **0.987**), which is what keeps `owned@1440x900` and `owned@430x932`
  bit-identical.
* **`FACE_D0 = 0.38`** — the shipped window's *own* completion depth, measured
  on the leg at the reference aspect: `p 0.845 → depth 0.3849`. So the fade
  still finishes while the lens is climbing through the colony's dark upper
  reaches, and still **completes before the pierce** (`p 0.8555`), which was
  `17-final-field.md`'s whole point.

### It is also a fix on mobile

The p-window was calibrated at desktop and was never right at the other aspect.
Measured on the leg:

| aspect | depth at p 0.815 | depth at p 0.845 | soil pierce |
|---|---|---|---|
| 1.60 (1440x900) | 1.023 | 0.385 | **p 0.8555** |
| 0.461 (430x932) | 0.464 | **−0.379** | **p 0.834** |

At 430x932 the shipped window was still fading the faces out at `p 0.845` with
the camera already **0.379 units above ground**. A depth mask cannot make that
mistake at any aspect, which is the same argument `fc1e151` made for `sink`.

## 23. Gates

* **Frames through the wrap, before and after** — real wheel-driven down-wrap,
  blend clock stretched (§8.2 of `26-scroll-loop.md`: no wall-clock term
  survives inside a blend, so the appearance is a pure function of the ease).
  Before, shot 1: `p 0`, camera (−14.91, 2.79, 1.86), **depth −2.727**, orb
  fade **1.0000** — the ground plane is covered in lit orbs and a contributor
  bust reads bottom-left. After, the same shot: orb fade **0.0000**, and orb
  fade is **0.0000 at all nine shots of the lap**, every one of them above
  ground (depth −2.68 … −4.32). The substrate network is unchanged in both,
  which is `keep`'s designed epilogue exposure and not what was reported.
* **Above-ground orb frames**: 36 → **0** on the down-wrap, 0 → 0 on the
  up-wrap. Peak above-ground orb fade 1.0000 → **0.0000**.
* **Reverse scrubs mirror exactly.** Forward and reverse sweeps of `p`
  0.70–0.90 under `?nosnap=1`, both shipped aspects: max forward-vs-reverse
  delta **0** — bit-identical — under `?steady=1`. With the documentary
  handheld live it is 0.019/0.024, which is the handheld's own wobble entering
  a camera-pure mask; `sink` and `keep` have had exactly that property since
  `fc1e151` and it is not new here.
* **Nothing lit above open view**: across both sweeps and both aspects, orb
  frames with `depth ≤ 0` and fade > 0.003: **0**.
* **`capture.py --check` PASS, worst MAE 0.00/255** across all ten frozen
  references — `owned@*` included, which is the point of pinning `FACE_D1` to
  `SINK_D`.
* **Full ride**: four laps, twenty-three legs, four wraps (two interrupted
  mid-lap and scrolled on from) — every leg on an anchor, camera-vs-`p` error
  0.0000, **console 0 entries**, URL clean.

## 24. Residual

* The mask now inherits the documentary handheld, so the faces' fade wobbles
  by ~0.02 where the handheld is live. Below the eye and below the 0.003
  visibility threshold's own resolution; the alternative is a p-keyed term,
  which is the defect.

---

# 2026-08-14 (later) — the click state becomes the hover state

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/ui.js` (the card's two tiers, the arrival stagger),
`journey/site.css` (the transient tier). No content, no scene, no camera key,
no placement, no golden move.

> "For the Ownership section: remove the current separate hover state. The
> existing click state should become the hover state instead. This hover
> interaction should be available immediately when entering the section — no
> ~5-second delay before it becomes active. On hover, show the full current
> click-state treatment. On de-hover, return immediately to the default state.
> Clicking should no longer be required to reveal this state."

## 25. What the click actually revealed, measured before anything moved

"The click state" is not one thing, so the first job was to enumerate it.
Measured at the Owned rest, 1440x900, clicking `contributor-12`:

| what the click did | evidence |
|---|---|
| opened the anchored card | `.j-card` `open`, `data-side="above"`, rect `484,425 400x199.7`, filament `--j-card-fx 200.0px` |
| declared it a modal dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="j-card-h"` |
| moved focus into it, and trapped it | `document.activeElement` → `.j-card-x`; Tab ×4 → still `.j-card-x` |
| claimed input | `claimInput(card, { modal: true })` |
| marked the chip expanded | `aria-expanded="true"` on `contributor-12`, false on the other fifteen |
| lit the chapter's SELECTED treatment | `uSelIdx 12 / uSelAmt → 1` (portraits.js's ember-rim + strand response) |
| **faded every chip out** | visible chips **16 → 0**, tabbable **16 → 0** (`modalDetail`, "the frame belongs to the detail") |
| set journey.detail | `journey.detail = 'contributor-12'` |

(It writes nothing to the URL — the ride stopped doing that on 2026-08-11.
The hash was `''` before and after, verified rather than assumed.)

The hover state it sat next to was `696e95d`'s: the face lights, its own
6–55 local filaments light with it (`uOwner 12 / uOwnerAmt 0.99`), the pill
label appears, and nothing else happens.

### Which of those eight belong on hover, and which cannot

Three of them **cannot** move, and the third is not a preference:

- **The chip fade is self-cancelling.** A hover that hides all sixteen chips
  hides the chip holding it open. `pointerleave` fires, the reveal closes, the
  chips come back, the pointer is on the face again, and the pair oscillates at
  frame rate. The reveal would destroy its own cause, forever.
- **The focus trap and the focus move.** A panel that takes the keyboard every
  time a mouse crosses a face is not a disclosure, it is an ambush; and a trap
  with no deliberate act behind it is one the visitor cannot predict their way
  out of.
- **The modal input claim.** A hover that claimed input would stop the page
  scrolling under a resting mouse.

`aria-expanded` stays with the commit for the same reason the popover keeps it
there: a pointer passing over a face has not opened anything.

Everything else moves: **the card, anchored exactly as `8987500` anchors it,
and the chapter's selected light.** Hannah asked for "the full current
click-state treatment", and that light is part of the treatment rather than
part of the plumbing.

## 26. So the card grows the popover's two tiers

Nothing here is a new idea. `e20f7ff` already had to answer "the same panel,
revealed transiently by a pointer and committed by a click" for `.j-pop`, and
the card is that contract one vessel up.

| | TRANSIENT (hover / focus) | PINNED (click / Enter / Space / route) |
|---|---|---|
| what opens it | the chip's own `hot` state, via `syncCard()` | `openCard()`, unchanged |
| role | none — it is an annotation | `dialog` + `aria-modal="true"` |
| how AT reaches it | `aria-describedby` on the chip → the panel's prose ids | the dialog itself, focus moved in |
| focus | never moves | to `.j-card-x`, trapped |
| input | not claimed | `claimInput(card, { modal: true })` |
| `aria-expanded` | false | true |
| `journey.detail` | **not set** — the sixteen chips stay live | set |
| controls | none: the ✕ and the grab handle are `display: none` | ✕, grab handle, link |
| pointer-events | **none** | auto |
| Escape | drops the reveal, remembers not to re-show it | closes, returns focus |

**`pointer-events: none` on the transient panel is load-bearing, not tidiness.**
It is what stops the card becoming the thing the pointer is on — the second
form of the oscillation above — and it is what lets a pointer travel straight
from one contributor to the next through the space a card happens to occupy.
The popover needs the opposite (`POP_HIDE_MS` exists so a pointer can walk onto
it and reach its link) because a popover *has* a link. This panel has no
controls at all while it is transient, which is why it can afford to have no
grace period either: **`syncCard()` is immediate in both directions**, which is
what "return immediately to the default state" asks for.

**Which nodes get a card is still decided by CONTENT.** `hottestCard()` is
`hottest()` read the other way round — a chip with no `short` line has no
popover to show, so what it discloses is its card. That selects Owned's sixteen
contributors and nothing else in this build, and no chapter or node id appears
in `ui.js` for it, which is the rule `previewFor()` already keeps.

### The re-arm rule, which is NOT simply the popover's

`popDismissed` is cleared when the chip goes cold. That is wrong here, and the
difference is worth recording because it cost a real defect.

Closing a **pinned** card hands the sixteen chips back on the same tick — they
were `visibility: hidden` while the dialog owned the frame. Chrome recomputes
pointer boundary events after that, so a pointer resting on the face it just
closed receives a synthetic `pointerleave` + `pointerenter` pair **with no
movement behind it**. Under the popover's rule the leave reads as "the visitor
left the chip", clears the dismissal, and the enter one frame later puts the
panel straight back. Measured on the first build of this pass: Escape on a
pinned card left `ui.cardOpen === true`. That is exactly the "Escape that
visibly does nothing" `popDismissed` exists to prevent, and the popover never
meets it because its own chips are never hidden.

So `dismissCard()` asks what is actually holding the panel open, and there are
three answers:

- **a pointer on the face** — park the dismissal on that chip; only a real
  `pointermove` off it re-arms (tested with `elementFromPoint`, so the chip's
  own hit pad decides). A visibility change produces no `pointermove`.
- **keyboard focus on the chip** — re-armed by the chip going cold, the
  popover's rule.
- **neither** — Escape on a card opened by Enter, whose focus is inside the
  dialog. Then there is *nothing to suppress*: the reveal's cause is already
  gone, and recording a dismissal would strand the node, because the cold
  transition that clears it has already been and gone. (This was the second
  defect of the pass: `contributor-12` became permanently un-hoverable after
  one Enter-then-Escape.)

The pointer test is **geometry**, not `h.hover` and not `elementFromPoint`:
while a pinned card is open its chip is `visibility: hidden`, so the hover flag
has already been dropped by that same synthetic leave and the element is not
hit-testable — yet the pointer is physically still on the face. `sx`/`sy` hold
the last placed position and the new `padLast` holds the last live pad radius,
so the pad the visitor is aiming at can still answer while nothing is drawn
there.

## 27. The "~5-second delay" — what it was, and why the constant is innocent

It is `HOTSPOT_STAGGER_MS`, and the fault is not its value.

The stagger is a **reveal choreography**: a chapter's labels arrive one per
150 ms in narrative order so a frame does not gain five pills at once. For the
chips it was written for — Inspire's three, Connect's three, all of which draw
a resting pill — it is right, and it is untouched.

**Owned's chips draw nothing at rest.** The injected label-policy rule is
`.j-hot.label-hover > * { opacity: 0 }` — dot, label and pad alike — so the
staggered `h.a` ramp is an opacity envelope on an object with nothing visible
inside it. What it does have is consequences: `h.a` gates `.vis`
(visibility *and* pointer-events), the hit pad's SIZE (the sizing pass skips any
chip at `a <= 0.015`), and `tabIndex`. On this chapter the stagger was
choreographing nothing and delaying everything.

It was harmless while hover only lit a node. It is the difference between a
live section and a dead one now that hover is the disclosure — which is why
Hannah met it as a symptom of this request and not before.

So the fix is to **who is in the queue**, not to how long the queue is: a chip
with no resting mark has no arrival to stage, and arms on the frame it becomes
placeable. That also matches what the picture already does — the sixteen
*faces* are drawn by the chapter's own fade, all at once, and never were
staggered.

### Measured, both entry paths, 1440x900

| | before (`046e024`) | after |
|---|---|---|
| **nav jump**, first chip hoverable | 987 ms | 1052 ms |
| **nav jump**, LAST chip hoverable | **3251 ms** | **1052 ms** |
| nav jump, stagger tail | **2263 ms** | **0** |
| nav jump, all sixteen tabbable | 3251 ms | 1052 ms |
| **wheel ride in**, first hoverable (from chapter arrival) | 0 ms | 205 ms |
| **wheel ride in**, LAST hoverable | **1999 ms** | **205 ms** |
| wheel ride, stagger tail | **1999 ms** | **0** |

The residual ~1.05 s on a nav jump is the copy-arrival gate (`gate > 0.72`),
which is the chapter's own arrival and is correct: the camera is still most of
a second from its destination at that point, and a chip live over a frame that
is not yet the composition would be `2026-08-11`'s fault in a different
costume. **All sixteen now arm on the same frame**, which is the number that
matters — there is no longer a chip that is live later than its neighbours.

## 28. Touch — what a tap does now

**Touch has no hover, so it gets no transient tier**: `syncCard()` returns null
outright under `sheetQuery` (coarse pointer or ≤ 720 px), which also means a
mouse-emulated hover on a hybrid machine can never raise a transient sheet.

A tap on a contributor now **goes straight to the committed card** — one tap,
the PL-1.3 bottom sheet, `role="dialog"`, focus on the ✕. It used to take two:
the first armed the chip, the second opened the sheet.

That two-tap dance is kept **for popover chips and removed only for card
chips**, and the reason is what the first tap is *for*. It exists to give a
finger the transient reveal a mouse gets from hovering, which is worth a tap
when the first one shows you something you could otherwise never see. A card
chip's transient tier is now the hover tier and is switched off on touch, so
the first tap would arm a state with nothing in it — and the committed card is
a bottom sheet that fills the lower third, which on a 375-wide frame where only
two to four faces are placed can land over the very chip you would have to tap
again.

Measured at 375x812 under mobile emulation (`pointer: coarse`, touch events):
one tap on `contributor-15` → `cardOpen true`, `cardPinned true`,
`cardIsSheet true`, `detail contributor-15`, focus on `.j-card-x`,
`ui.armedNode null` (no arm was spent). Escape closes it; a second tap opens it
again. The two placed chips carry pads of **52.0 px and 80.4 px** diameter,
both past the 44 px minimum.

**The section is no worse on a phone than it was, and one tap better.** It is
not *fixed* there: §9.4's debt is untouched — 375x812 still places 2 of 16
faces, and the other fourteen are still reachable only by deep link. This pass
did not reopen that, and the 2026-08-11 proposal (fold the roster into the
"Learn more" card) still stands as the fix.

## 29. Gates

    click state         documented before (§25, eight behaviours measured) and
                        after (the two-tier table, §26)
    hover = the card    1440x900 and 1280x800: hovering a contributor opens the
                        anchored card, side `above`, cardPinned FALSE,
                        journey.detail NULL, 16/16 chips still visible and
                        tabbable, 16/16 pads still live, modalInput FALSE
    full treatment      uSelIdx/uSelAmt reach the hovered node on hover
                        (12 / 0.953) — the selected light the click used to
                        carry — alongside uOwner 12 / uOwnerAmt 0.993
    immediate           stagger tail 2263 ms -> 0 (nav jump), 1999 ms -> 0
                        (wheel entry); all sixteen arm on ONE frame (§27)
    de-hover            immediate: ui.cardOpen false on the same tick the
                        pointer leaves (round trip 9.4 ms at 1440, 17.3 at
                        1280); opacity back to 0 after the 0.3 s house fade
    edges               contributor-13 (node x 63.3) card clamps to x 12 with
                        the filament at fx 51.3; contributor-14 (x 1361) clamps
                        to right 1428. onScreen TRUE and coversNode FALSE on
                        every shot, all sizes. 8987500's ladder untouched.
    retarget            sweeping face -> face retargets the panel with NO click
                        (contributor-13 -> contributor-9), cardPinned false
                        throughout
    click still pins    role dialog + aria-modal true, focus .j-card-x, trap
                        holds (Tab x4 -> .j-card-x), modalInput true,
                        aria-expanded true on its chip, chips 16 -> 0
    keyboard            focusing a chip reveals the panel (cardPinned false,
                        aria-expanded stays FALSE, chip gains
                        aria-describedby); Enter pins it (dialog, focus moves,
                        expanded true); Escape closes and leaves detail null
    Escape, transient   drops the reveal; stays dropped while the pointer sits
                        on the same face; re-arms on leaving and returning
    Escape, pinned      closes; chips return 0 -> 16; does NOT spring back as
                        a hover reveal (§26's re-arm rule)
    scroll not stolen   with a transient card open, a 40-tick wheel ride
                        advances p 0.725 -> 0.970, dp 0.245 — IDENTICAL to the
                        no-card control (0.245). modalInput false throughout.
    touch               375x812: one tap -> committed sheet, armedNode null,
                        Escape closes, tap again reopens; pads 52.0 / 80.4 px
    hit pads intact     16/16 chips, 208/208 sample points answer their own
                        face, 16/16 faces answer across their whole disc,
                        worst hit-centre error 0.05 px (696e95d)
    localised root      hovering a face: uOwner 12 / uOwnerAmt 0.99, released
                        to -1 / 0.03 on leaving. The crown still owns the
                        whole-network wave. 696e95d intact.
    reduced motion      animation none, transition 0s, clip-path none,
                        opacity 1 — and the PLACEMENT still applied (side
                        `above`, 400 px wide); de-hover still closes
    console             0 errors / 0 warnings over a full ride: six nav jumps
                        (inspire, connect, owned, final, mission, owned), a
                        60-tick wheel ride down and 60 back, hovers, a pinned
                        open, Escape. Also 0 across every probe above.
    goldens             capture.py --check PASS, all ten MAE 0.00/255,
                        0.0% px>8. NOTHING re-shot. The card is `hidden` at
                        rest and in HIDE_SELECTORS, so neither tier can reach
                        a frozen frame.

No camera key moved, no scene geometry moved, no placement changed. `696e95d`
(hit pads, localised root hover, no toward-camera motion), `961b2d1`,
`8987500`'s anchoring / collision ladder / filament, `783729b`, `45f600b`,
`046e024`, `027f969`, `d46e6bb`'s `steadyProject`, `6d37205` and `d1ecc23` are
all untouched — the card is placed by the same `placeCard()` through the same
`frameGeom`, in both tiers.

## 30. A pre-existing fault found on the way, and NOT fixed here

`journey/scroll.js`'s `ownerOf(node)` calls `el.contains(node)` without
checking that `node` is a Node, and `onWheel` passes `e.target`, which is
`window` for a wheel dispatched via `window.dispatchEvent`. With any input
owner registered — i.e. whenever the card is pinned — that throws
`TypeError: parameter 1 is not of type 'Node'`, once per wheel event.

**Verified pre-existing** by stashing this change and re-running the same
probe against `046e024`: identical stack, identical count (10 events for 10
wheels), both trees. It is unreachable from a real mouse (a genuine wheel
targets an Element) but it fires on every synthetic wheel, which is how this
project's own console gates ride the page — so it can mask real errors in QA.
Every ride above therefore dispatches on the canvas rather than on `window`.

Left for its own commit rather than folded into an interaction change.

## 31. Residuals

1. **The reveal is now much cheaper to trigger, and that is the trade.** A
   pointer crossing the arc on its way somewhere else will raise and drop
   several cards. The crown's own commit (`2026-08-13`, §G) refused exactly
   this for the re-deal and bought a dwell instead — but a re-deal is a
   1250 ms sixteen-face swap and a card is a 400 px panel that costs nothing
   to be wrong about, and Hannah asked for "immediately" in as many words.
   If it reads as busy, `ZONE_DWELL_MS`'s "still, not dwelled" model is the
   instrument already in this file.
2. **The entry replays on every fresh reveal**, ~0.62 s of unfurl + lamp +
   filament, which a sweep across the arc will restart per face. It is
   `showPop()`'s own `fresh` test, so this is the house behaviour rather than
   a new one, and a tier change on the same subject (hover, then click) does
   NOT replay it. A sweep is still the loudest thing this chapter does.
3. **Escape still does not restore focus to the chip.** Residual 1 of
   `2026-08-13` is unchanged and was not folded in: `closeCard()` calls
   `returnFocus.focus()` while the chip is still `visibility: hidden` from the
   detail fade, so focus lands on `<body>`. Re-verified on this tree. Note it
   is now *load-bearing* for §26's third dismissal case, which is why that case
   exists — fixing the focus return will want that branch re-tested.
4. **375x812 still places 2 of 16 faces** (§9.4). One tap is better than two;
   it is not a roster.
5. **A transient card whose subject leaves the frame is hidden**, unlike the
   pinned one, which is `2026-08-13`'s stated rule inverted — and deliberately:
   the reason a pinned card is never taken away is that it holds focus, owns
   input and is route state, and a transient reveal is none of those. It IS an
   annotation, so it goes when its subject does.
