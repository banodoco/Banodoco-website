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
