# 16 — Connect restage: the ground network

**Status:** approved for execution (Hannah's dev brief, 2026-08-04).
**Supersedes** the gill-chamber staging of the Connect chapter (08-chapter-connect.md's
CN-2 colonnade realization). The chapter's *meaning* is unchanged — Banodoco
connects communities, projects and people — but the *stage* moves from under
the cap to the open ground.

## 0. The one-sentence restage

The camera no longer dives under the rim into the gill commons; it settles low
and wide on the open ground, mushroom on the left of frame, and watches a
luminous network of surface tendrils grow out of the mushroom's base and run
across the terrain to three glowing hubs — **ADOS**, **Hivemind**, **Discord**.

Why this is *more* cohesive, not less: the organism already speaks this
language. The hero scene has always drawn a faint mycelial ground web
(`organism.js` §ground: `groundY`, web/moss lines, dust) — the visitor has been
looking at a quiet version of this network since the first frame. Connect now
takes that existing vocabulary and makes it legible: the quiet web resolves
into three named routes. And the exit becomes the cleanest narrative joint in
the whole ride: after watching the surface network, the camera follows the
tendrils home to the trunk and dives underground — where Owned reveals what the
network grows from.

## 1. What is deleted, what is kept

**Deleted outright** (no archive stubs in the running tree — git history is the
archive):
- `journey/chapters/connect/blades.js` — the colonnade, edge polylines, veins,
  beads, chamber spores, haze.
- `journey/chapters/connect/structures.js` — ADOS strands/knot, Hivemind
  braid/memory, the knot core sprite.
- The chamber-specific machinery in `connect/index.js`: hero-point retirement at
  chamber range (the ≤12% visibility cut), the `uComm`/`uAdos`/`uExit` chamber
  uniform block, the regional ambient exchanges.

**Kept — these are contracts, not implementation:**
- The chapter public API, verbatim: `{ group, counts, nodeIds, setArmed(on),
  armed, setHot(id, on), nodeWorld(id) }`, plus a new `drive(p)` (the spine
  already calls `drive` on any chapter that exposes it — journey.js M4).
- The `pulseDriver` idiom for one-shot travelling pulses.
- The eased-amount arming pattern (`amountTarget`/`amount`, eased at `dt*3`,
  visible above 0.003).
- The route manifest untouched: spans, rests, scrollVh all stay. Connect is
  still p 0.38–0.60, rest at 0.49. **Do not edit route.js.**
- Hannah's locked copy: heading "Connect the ecosystem." and the sub line
  (content.js `chapters.connect`) are locked verbatim — the brief restates them;
  they do not change.

## 2. The three hubs (content change: Community → Discord)

The brief names the hubs **ADOS, Hivemind, Discord**. `community` retires as a
node id:

- `content/content.js`: replace the `community` node with `discord` (label
  `Discord`, placeholder card in exactly the house placeholder style, CTA link
  reusing the same Discord destination the hero nav button uses).
- `journey.js normaliseNode`: add legacy alias `community → discord` (precedent:
  `2rp → tworp`), so old deep links `#/connect/community` still land.
- New `nodeIds`: `['ados', 'hivemind', 'discord']` — narrative order = reveal
  order = tab order (ADOS is the flagship, nearest hub; Discord the far
  everyday door).
- The lens focal handoff keeps `nodeWorld('ados')` (journey.js) — ADOS remains
  the chapter's focal anchor. Verify it returns the hub position.

Label chips need **zero new UI code**: `registerHotspots` + `ui.addHotspot`
already project `nodeWorld(id)` into tracked chips with the pill/dot/connector
treatment the brief asks to match (it IS the Inspire treatment). Per-node
`labelPolicy` stays default (chips visible at rest, like Inspire's).

## 3. The stage — geometry and composition

New file `journey/chapters/connect/tendrils.js` owns all geometry + shaders.
`index.js` stays the orchestrator (arming, drivers, hover, drive(p), node
anchors). One new group added to a NON-sway parent (`sceneApi.scene` or the
ground group — the network is rooted terrain, it must not sway with the cap;
the stem-base attachment point barely moves since sway pivots at the base).

**Terrain law:** every tendril vertex sits at `groundY(x, z) + lift`, lift
0.015–0.06 (organism.js exposes `groundY` through the api — same law the hero's
own web obeys). Nothing floats, nothing sinks.

**Network anatomy** (echoing the mockup and the brief's "runners + neural +
fibre-optic, never tree roots / lightning / circuit-board"):
- **3 primary routes**, one per hub, leaving the stipe base at distinct
  azimuths, meandering organically (low-frequency wander + slight secondary
  curvature, no straight runs, no right angles). Each is a loose braid of 2–3
  strands (Hivemind-braid precedent) so primaries read *thicker by structure*,
  not by linewidth.
- **Secondary branches** forking off primaries at oblique angles, thinning as
  they go, some reconnecting (anastomosis — fungal, not dendritic).
- **Hairline fill**: a sparse web of fine strands knitting the sector together,
  patchy (whole pockets stay dark — the patchOf precedent; organic asymmetry is
  the house look).
- **Junctions**: where strands meet, a small warm intersection glint (bead
  points, existing glow texture).
- **Hubs**: each a radial convergence — 8–14 short strands converging to a
  bright core (glow sprite + tight knot of segments, ADOS-knot precedent),
  with 2–4 strands continuing PAST the hub toward and beyond the frame edge
  (the brief's "larger, living ecosystem").
- **Continuation beyond frame**: a few long strands exit frame left/right at
  low brightness.

**Composition at the rest (landscape):** mushroom cap+stem+base wholly visible,
left third; network spreads across the lower/middle right two-thirds;
panoramic, not vertically layered. Hubs: ADOS nearest (lower-center-left,
closest to the base), Hivemind mid-frame upper-network, Discord far right.
Camera low (y ≈ 1.5–2.4), gentle downward gaze so ground owns the lower ⅔ of
frame. All three chips must clear the copy block at every sway/handheld phase.
Author hub world positions + camera keys TOGETHER against the live frame
(screenshot iteration) — numbers in this doc are starting hints, the frame is
the spec. Portrait: per-orientation hub label anchors are allowed (the
hiveAnchorLand/Port precedent); the network itself is one world-space build.

**Copy block:** move Connect from `pos-left` to a centred position (the brief
and mockup put the headline centre-low; `pos-bottom` exists and is the Inspire
position — sharing it is cohesive). The calm dark zone under the headline is
made in-world, the way the chamber did it: a `copyShadow`-style brightness well
in the strand shader over the world region that projects behind the copy at the
rest pose (and the hero's own ground web already has its UI dim-zone precedent).
No scrims, no overlays — darkness comes from the network being quiet there.

**The hero's ambient ground web stays.** It is the undercoat that makes the
new network feel native. If double-exposure mush appears where both occupy the
same screen area, the chapter may dim the hero web's line materials while armed
using the exact collect-base/scale/restore-exactly pattern the chamber used for
hero points — never edit organism.js.

## 4. Choreography

**Growth is the arrival — and the no-self-ignition answer.** There is no
natural occlusion on the new leg, so nothing may fade in on screen. Instead the
network GROWS from the stipe base, keyed to leg-local progress (Final's
growth-front precedent): a soft front sweeps outward along `aAlong` (0 at base,
1 at strand tip), tips leading with a slightly brighter growing edge. Forward:
descending from Inspire's rim, the visitor watches the network race across the
ground and resolve into hubs. Reverse: it retracts into the base. At the arm
boundaries the network has zero extent — armed but invisible, exactly the
"dark at arm" law Final already follows. Suggested keys (leg-local t): extent
0 → 1 over t 0.10 → 0.46; hubs ignite as the front reaches them (staggered:
ADOS, Hivemind, Discord); full network holds through the rest.

**Ambient life** (gated on extent > 0.9, so growth and pulses never compete):
- Every 9–14 s (staggered per route, own clocks, never synced — the ambRegions
  law), a slow light pulse leaves the base, travels a route, and its hub
  brightens briefly on arrival, then relaxes.
- Sparse particles (≤ ~120 points total) drift along strands, slow, occasional
  — the min-px-clamp-pay-in-alpha trick for distance.
- Sub-perceptual energy shimmer along strands (the tw twinkle idiom, slow
  rates 0.1–0.4 Hz).
- Calm is the law: no flicker, no fast motion, no electrical storm. The brief:
  "a living communication network."

**Hover/focus** (per hub, driven via existing setHot):
- The hub brightens, its primary route lifts (+glow), a focused pulse fires
  base→hub (pulseDriver), and *unrelated* routes dim to ~0.55 of base — eased
  both ways at the existing `dt*5` rate. Description/CTA reveal stays the
  existing click→card behaviour; hover is purely luminous.

**Exit (t ≳ 0.72):** the camera approaches the trunk; light converges — the
near-base stretch of all routes brightens while the far field calms, reading as
the network's energy draining home into the root, foreshadowing Owned. Driven
purely off the live camera (the driveInspire/exit-phase precedent) so reverse
scrubs mirror it with no state to pop.

## 5. Camera

`connect/camera.js` re-keyed entirely (leg-local t, as ever). The leg must:
1. **Enter** continuous with inspire/camera.js's last key (t 0.925 → p 0.362:
   pos (5.6, 3.05, 0.55), tgt (1.7, 3.3, -0.75), fov 42): instead of slipping
   under the rim, the descent now stays OUTSIDE — the camera sinks and widens
   past the rim to ground level, the gaze sliding off the cap down the stem to
   the base and out across the ground as the network starts to grow.
2. **Rest** (t 0.5, hold, note 'connect-rest'): the panoramic frame of §3.
   fov 50–58. Plus the customary small drift key after the rest.
3. **Exit** toward the trunk: end the leg near owned/camera.js's entry. Owned's
   first two keys (t 0.0, 0.088 — the old "finishing the chamber pitch turn")
   may be re-authored to make the join natural (approach low toward the base,
   then the existing stipe-side descent from its t 0.18 key onward is
   UNTOUCHED — the T3 soil crossing and everything after is proven).
4. **Rates**: pitch/yaw stay under ~1.2k°/unit-p peak (the house threshold;
   measure with the 201-sample scrub audit, both aspects). No roll — global law.

## 6. Seams

T2 ("cap-occludes") predicate is dead — the camera never goes under the cap.
Replace with the p-window that already co-drives it: Connect arms on
`p ∈ (startOf('connect') + 0.02, CONNECT_HOLD_HI = startOf('owned') + 0.105)`.
Lawfulness: arming is invisible (zero-extent network, §4), retire/re-arm at the
high edge stays behind the Owned soil-crossing murk exactly as shipped (M5
ignition audit values are kept). Document in seams.js that T2 is now a pure
p-window whose visible reveal is growth choreography — the Final chapter's
"dark at arm" precedent. Hysteresis/dwell machinery stays for the other seams.
`T1_RELAX_IN/OUT` ("path has dropped under the rim") keep their p-values —
comment updated (the path now drops past the rim outside, same p).

## 7. Shader laws (hard-won; violations have blacked whole frames)

- Vertex-heavy, fragment-cheap. Everything smooth along a strand computed per
  vertex, shipped as premultiplied varyings; fragments stay a few exp()s.
- Clamp every varying to its domain in the fragment; `pow()` bases strictly
  positive; cap output (`min(col, vec3(48))`). Additive blending,
  `depthWrite:false`, `frustumCulled=false` on network meshes.
- Run the 20 s NaN/TAA soak at the rest and during growth before calling it
  done (BUDGETS.md W4-B procedure).
- Budget: total line segments across the network ≤ the chamber's old ~5k;
  points ≤ 500. One material per tier (primary/secondary/hairline can share
  one ShaderMaterial with per-vertex tier attributes; hubs may have their own).

## 8. Verification gates (each must pass before commit)

1. `?capture=connect` frozen frame renders; console clean over a full
   forward+reverse ride, both aspects.
2. No self-ignition anywhere on the leg or its boundaries (the D16 sweep:
   slow scrub 0.36 → 0.72 and back, watching for anything fading in over
   open ground; growth-front motion is lawful, fades are not).
3. All three chips in-frame and clear of copy at rest, landscape + portrait;
   hover states verified per hub; click opens cards; `#/connect/discord` and
   legacy `#/connect/community` deep links land.
4. Scrub audit: camera continuity across both chapter boundaries (no pose jump
   > the house epsilon at the splice keys), pitch/yaw rates in bounds.
5. Goldens: re-shoot the full frozen set at the final tree, same-commit
   (M5c/dcdb445 workflow), manifest provenance updated. Non-Connect goldens
   must be byte-identical to current — if any other chapter's frame moved,
   that is a regression to fix, not to re-golden.
6. journey.debugState() at p 0.49 reports the new pose, armed=[connect], three
   hotspots.

## 9. What must NOT change (the §5 extension-contract exam, applied)

- route.js, scroll.js, state.js, director.js composition order, lens.js,
  organism/* (read-only; uniform dim via collect/restore only), the other
  chapters' geometry, Inspire's camera keys, Owned's keys from t 0.18 on,
  ui.js hotspot machinery (only the CHAPTER_POSITION row for connect), locked
  copy strings, flags.js keys.
- The pre-commit capture gate stays armed — scene commits ship with their
  goldens, `SKIP_SCENE_CHECK` stays for doc-only emergencies.

## Execution log (2026-08-04)

**Built.** The gill chamber is gone; Connect is the ground network.

- **Deleted:** `connect/blades.js` (colonnade/edges/veins/beads/spores/haze),
  `connect/structures.js` (ADOS strands/knot, Hivemind braid, core sprite),
  and all chamber machinery in `connect/index.js` (hero-point retirement,
  uComm/uAdos/uExit chamber block, regional ambient exchanges). Git history
  is the archive.
- **New:** `connect/tendrils.js` — all geometry + shaders. `connect/index.js`
  rebuilt as pure orchestrator with the same public API plus `drive(p)` and
  `snap()` (snap is what makes the frozen `?capture=` frame render the grown
  network — eased amounts cannot rise under `freezeTime`'s dt = 0).

**Key numbers.**

- Hubs (world): ADOS (2.85, gy, 0.25) · Hivemind (1.65, gy, −3.05) ·
  Discord (5.35, gy, −3.45). Node order/tab order: ados, hivemind, discord.
  Discord's chip anchors per orientation (hiveAnchorPort precedent): hub in
  landscape, route-t 0.60 point in portrait (hub is ~25° outside the narrow
  frustum at 375×812).
- Camera keys (leg-local t → global p): descent outside the rim
  t 0.136/0.30/0.409 → rest t 0.5 = pos (7.6, 2.35, 4.1), tgt (0.45, 0.42,
  −2.35), fov 56, hold 'connect-rest' (p 0.490) → drift t 0.691 → exit
  t 0.886 = (4.9, 1.95, 3.1) → Owned's re-authored first two keys
  t 0.0 = (2.55, 1.64, 1.95) and t 0.088 = (1.55, 1.52, 1.35), joining the
  untouched t 0.18 stipe-side descent. Portrait field keys re-authored at
  p 0.410 / 0.490 (back 1.42, rise 0.55, tgtUp 0.30, tgtRight −0.45,
  fov +10) / 0.622.
- Growth window: leg-t 0.10 → 0.46 (p 0.402 → 0.481), front lead 1.06,
  feather 0.05, tip glow fades at extent 1. Hubs ignite as the front reaches
  their route-length along (ADOS → Hivemind → Discord by construction).
- Counts: 2,306 line segments total (448 primary braid + 238 secondary +
  1,050 hairline + 357 hub + 213 continuations/frame-exits) vs the chamber's
  ~5k budget; 158 points (50 junction glints + 108 drift particles, ≤ 500
  budget); 3 hub core sprites. One ShaderMaterial for all strands, one for
  all points.
- Ambient: per-route pulse clocks 9–14 s (staggered, never synced), pulse
  traversal 2.6 s + 0.28 s/world-unit; hover = hot route ×1.55, unrelated
  routes ×0.55 (the doc's number), hairline ×0.7, focused pulse on hot rise,
  refire 4.5 s. Exit convergence pure in camera radius: sm(5.0 → 2.4).
- Copy well (in-world calm zone, no overlays): world-xz centre (4.4, 1.4),
  radius 1.9, strength 0.66 — measured by unprojecting the centred copy
  block's rect onto the ground plane at the rest pose.
- Hero-web undercoat dim while armed (collect/scale/restore-exact, Final
  precedent): keeps [web 0.42, myc 0.42, mossPts 0.60, pools 0.80,
  roots 0.48, ribbon 0.52, beads 0.58], reach = amount × sm(0.2, 0.8, grow),
  byte-exact restore on retire.
- Seams: T2 is a pure p-window — arm at startOf(connect)+0.02 = 0.40, hold
  to startOf(owned)+0.105 = 0.705 (M5 ignition-audit value kept; retire and
  re-arm stay inside the Owned soil-crossing murk). cap-occludes predicate,
  its state row and its anatomy imports deleted; T1 p-relax values kept,
  comments updated.
- Content: `community` node replaced by `discord` (placeholder card in house
  style + 'Join the Discord' CTA sharing the hero pill's '#' destination);
  legacy alias community → discord in normaliseNode; static Tier-3 page
  mirrored (node order ados/hivemind/discord).

**Gates (measured).**

1. `?capture=connect` renders (frozen pipeline, means 30.7/31.4, poses
   confirmed); full forward+reverse ride 0→1→0 console-clean at 1280×800 and
   375×812 (only stale pre-fix tab-history entries in the log; live build
   compiles clean).
2. D16 sweep 0.36→0.72→0.36 at 0.04 p/s: network has zero extent at the arm
   boundary (verified parked at p 0.412: nothing on the ground), grows from
   the base outward, retracts in reverse; retire/re-arm at 0.705 behind the
   murk. No fade-in over open ground observed.
3. Chips: all three visible and clear of copy at 1280×800 (ados/hivemind/
   discord at (602,524)/(745,437)/(1078,491), copy top 548, none suppressed)
   and at 375×812 (portrait anchors; ados clears the copy top by ~14 px).
   Hover verified per hub (uRouteAmp [1.55, 0.55, 0.55] with ados hot;
   focused pulse head observed travelling 0→1); click opens cards
   (#/connect/hivemind); `#/connect/discord` and legacy `#/connect/community`
   both land (community normalises to discord).
4. Scrub audit (201 samples, both aspects): my re-authored span p 0.355–0.650
   peaks yaw 1167°/p (p 0.632), pitch 994°/p — under the ~1.2k threshold and
   better than the pre-restage baseline (1419°/p yaw at the old slip-under,
   1215°/p pitch). The 1802°/p pitch at p 0.696 is the shipped soil-crossing
   levelling in Owned's untouched keys (bit-identical to baseline).
5. Goldens: full set re-shot frozen at the final tree, same commit; connect
   pair intentionally new; mission/inspire/owned/final restored byte-identical
   (the fresh inspire@1440x900 differed by ONE sub-threshold pixel,
   MAE 2.6e-7 — frozen-pipeline GPU noise, original bytes kept).
   `capture.py --check`: worst MAE 0.00/255, PASS.
6. `journey.debugState()` at p 0.49: pose (7.6, 2.35, 4.1) fov 56,
   armed = [connect], hotspots = [ados, hivemind, discord].
7. NaN/TAA soak: 20 s+ parked at the rest and 20 s parked mid-growth
   (p 0.45) — stable, no black frames, no wash. (During the build the doc's
   §7 law was re-proven twice: a `pow(negative, 2.0)` in the pulse gaussian
   and an 11-arg pushSeg called with 10 args — undefined → NaN in a
   Float32 attribute — each produced the characteristic TAA-held gray wash;
   both are documented in tendrils.js.)

**Residuals.**

- The p 0.63–0.69 stretch (Owned's untouched descent) reads barer than
  before — the chamber used to fill the upper frame there; now it is ground
  glide until the soil crossing. Lawful, but a future taste pass could let
  the network's near-base stretch stay brighter longer.
- The pre-existing 1802°/p pitch peak at the soil crossing predates this
  restage (untouched keys, bit-identical to baseline) and remains.
- Ambient pulse arrival flare on the hub cores is modest (+0.45 opacity);
  if Hannah wants the "hub brightens on arrival" beat louder, the knob is
  `P.flare` weighting in index.js.
