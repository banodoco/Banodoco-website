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

## Audit + taste pass (2026-08-04, independent adversarial audit)

**Taste directive A — hub resting presence.** At the rest the three hub
cores read barely brighter than junction glints (mockup wants unmistakable
radial starburst convergences). Dialed, no new systems: resting core
opacity 0.42 → 0.58 (cap 0.95 → 1.0 so hover +0.4 and arrival-flare +0.45
still register above rest — measured: discord rest 0.58 → hover 0.98),
core sprite scales ×~1.35 (0.34/0.30/0.27 → 0.46/0.40/0.36), spoke
brightness 1.1 → 1.5, knot 1.35 → 1.6. Ignition/pulse/hover headroom
preserved; halos stay controlled (destination-beacon, not lens-flare).

**Taste directive B — ADOS/Hivemind separation.** At 1280×800 the ADOS
chip sat 12 px above the copy top, directly over the headline centre.
ADOS hub −x (2.85 → 2.50): clearance 12 → 23 px (1280×800), 45 px at
1440×900, chip off the headline centre; pair distance 181 → 186 px with
80 px vertical. Portrait 375×812 (pre-existing, worse than the shipped
log recorded): Hivemind/Discord chips 3 px apart with Discord's pill
10 px past the right viewport edge. Fixed: Discord portAnchor route-t
0.60 → 0.50 (t 0.40 overlapped ADOS) + Hivemind −x (1.65 → 1.38; a −z
nudge was tried and reverted — it pushed the portrait chip into the right
edge). Final portrait: all pills fully in-frame (Discord right edge 355,
20 px margin), Hivemind↔Discord gap 8 px, ADOS↔Discord 18 px horizontal,
ADOS copy clearance 14 px. Sway displaces chips ≤ 2 px at this pose
(sampled 112 frames over 40 s), so the clearances hold through phases.

**Bug found + fixed — ghost pulse on continuations.** The travelling-pulse
term is deliberately not tierBase-scaled, and continuation/frame-exit
strands (tier 3) carry their route id with rAlong restarting 0 → 1 past
the hub — so a base-departing pulse simultaneously lit the far side of
the stage at full pulse brightness (wrong place AND wrong time). Fixed
with a tier gate in the vertex shader (`if (tier > 2.5) pulse = 0.0`);
spokes/knots (tier 0, rAlong 1.0) keep the arrival flare, secondaries
(tier 1) keep the fork-spill.

**Audit results (measured, 1280×800 + 375×812 unless noted).**

1. D16 sweep 0.34→0.74→0.34 at 0.04 p/s, instrumented on group-visibility
   flips: forward reveal at p 0.4018/0.4017 (land/port) with uGrow 0.0000;
   forward retire 0.7065/0.7063 and reverse re-arm 0.7026/0.7037 — all
   inside the Owned soil-murk (0.692–0.712); reverse vanish 0.398/0.3988
   with uGrow 0. No fade over open ground either aspect; mid-growth spot
   frames show front-motion only (ADOS starburst ignites first).
2. Camera, 201-sample scrub (drift-aware: rates differentiated against
   actual journey.progress — naive fixed-grid differentiation inflates
   peaks ~7% and briefly read 1243 before correction): restaged span
   peaks yaw 1164 °/p (p 0.631) / pitch 1157 (p 0.652) landscape, 1166 /
   1144 portrait — under the ~1.2k threshold, matching the builder's
   1167/994 claim in kind. Roll 0.0000° everywhere. Splice continuity:
   position rates ramp smoothly through both boundaries (23→38 u/p across
   p 0.38; 114→58 across 0.60), no jumps. Global pitch peak 1766/1778 °/p
   at p 0.697 = the shipped soil-crossing, untouched.
3. Hover/focus: uRouteAmp [1.55, 0.55, 0.55] with ados hot, hairline 0.7,
   focused pulse head observed travelling (0.893, amp 2.0); eased return
   to [1,1,1]; keyboard focus parity (hivemind focus → [0.55,1.55,0.55]);
   tab order = DOM order = ados/hivemind/discord; click opens the card
   (#/connect/hivemind, aria-expanded true), Escape closes (detail null).
4. Deep links: #/connect/discord (card + 'Join the Discord' CTA),
   legacy #/connect/community → discord, #/connect/ados
   (nodeWorld('ados') = (2.50, 0.048, 0.25) — focal handoff intact),
   cold #/connect renders grown (uGrow 1 via snap). ?capture=connect
   stability: two frozen shots differ by ONE pixel/count (MAE 7.7e-7,
   the known ANGLE-Metal noise class); mobile byte-identical.
5. Shader statics re-reviewed: no pow(neg) (gaussians are exp(-d·d), JS
   `**` on non-negative sines only), varyings clamped, output capped 48,
   point alpha clamped. Soaks 20 s at rest + 20 s held at p 0.44: no
   black frame, no TAA wash, zero console errors.
6. Full 0→1→0 rides both aspects with console.error/warn/onerror hooks:
   0 entries. (The two 'patch' reserved-word shader errors visible in the
   tab's console history are stale pre-fix entries from the build
   session, as the shipped log already noted.)
7. Goldens: --check before reshoot isolated the change to the connect
   pair (MAE 1.23/0.93, all others 0.00); full set re-shot frozen at the
   final tree — mission/inspire/owned/final reproduced BYTE-IDENTICAL
   (git-clean), connect pair intentionally new, manifest provenance
   noted. --check at the final tree: worst MAE 0.00/255, PASS.
8. Hero-web dim restore: base [0.36, 0.35, 0.95, 0.5, 0.42, 0.45, 0.95]
   → armed-at-rest exactly base × KEEP [0.1512, 0.147, 0.57, 0.4,
   0.2016, 0.234, 0.551] → after retire restored `===`-exact.

**Audit residuals (not fixed, with reasons).**

- Owned-descent pitch rate: the untouched t 0.18 → 0.272 stretch measures
  up to ~1530 °/p locally (p 0.657) — nominal key-to-key is ~1130 and the
  spline overshoots. An attempt to soften it by easing the two re-authored
  keys' aims moved the spike to p 0.608 (1371–1398 °/p) instead of
  removing it — Catmull-Rom tangents leak local fixes sideways — so the
  keys were reverted byte-exact to the shipped restage. It sits outside
  the restaged span, alongside the pre-existing 1766 soil-crossing peak.
- Portrait Hivemind↔Discord chip gap is 8 px — the narrow frustum
  genuinely cannot give three pills generous spacing without new UI
  machinery (a label-side flip), which the doc forbids ("zero new UI
  code"). All pills are now fully in-frame and non-overlapping, which the
  shipped build's 3 px + 10 px edge-clip was not.
- The p 0.63–0.69 bareness residual and the modest arrival flare stand
  as the builder left them.

## Three approved changes (2026-08-04, Hannah's review of the shipped restage)

**1 — ADOS hub LEFT of the mushroom (the mockup composition).** Hub world
(2.50, gy, 0.25) → (2.45, gy, 2.85) — world (+x, +z) is the camera-left
foreground at the rest pose — departure azimuth 0.20 → 0.86 so the primary
route now leaves the stipe base and runs out past the LEFT of the stem into
the lower-left ground field. Braid/meander language, spokes, knot, route id
all unchanged (hover lift, pulses and the lens focal handoff follow the
geometry; nodeWorld('ados') = (2.45, 0.017, 2.85)). Chip clearances at rest:
1280×800 chip x 252–326 / y 594–617 vs copy block left edge 396 (70 px
clear, chip ~145 px left of the stem-base projection at x 469); 1440×900
chip 285–359 / 670–693 vs copy edge 450 (91 px clear); 375×812 the hub
itself projects inside the portrait copy block, so ADOS now anchors
per-orientation like Discord (tendrils.js PORT_T: route-t 0.25) — chip
56–130 / 455–478, fully in-frame, 31 px above the copy top, no overlap with
Hivemind (248@428) or Discord (256@459). Note: the ADOS route is now ~0.4
world units longer than Hivemind's, so Hivemind's starburst ignites
marginally before ADOS during growth — the stagger is still by construction.

**2 — Mission→Inspire: ONE continuous arc.** arrival() re-shaped: the old
staged gesture (target pin over s 0–0.22, constant radius, push-in + fov
only past s 0.80, lift on its own curve) is replaced by one shared
progression — azimuth keeps azEase (trapezoid + windowed orbit-breath,
strictly monotonic), and radius, height, fov and gaze all ride the SAME
trapezoid (trapEase, no breath on the dolly); the gaze is a quadratic
bezier hero.target → INSPIRE.target bowed through the old PIN so the cap
and plume stay framed mid-swing. No phase change anywhere. HARD constraints
held: u ≤ ARRIVAL_DEAD is the hero pose EXACTLY (poses at p 0 and p 0.039
identical; mission goldens byte-identical), u = 1 lands the Inspire rest
exactly (INSPIRE constants untouched; inspire goldens byte-identical),
azimuth strictly monotonic, no roll. Measured (401-sample scrub of the
gesture span): desktop hero peak gaze-yaw 557 → 469 °/p (≈ old ~39 deg/s →
~33 deg/s at the same ordinary scroll), peak pitch 117 → 18 °/p (the pin's
early nod is gone); portrait hero yaw 482 → 440, pitch 223 → 64 °/p.

**3 — Inspire→Connect: monotonic zoom-out.** The old exit pushed IN toward
the stream (r 9.1 → 5.6, then Connect pulled back out to 8.6). Re-keyed:
inspire drift/exit now recede (subject distance 8.11 → 8.32 → 8.48, fov
38 → 39.5 → 44) and Connect's entry keys continue the same widening
(d 8.83 → 9.32 → 9.64 → 9.82, fov 48 → 52 → 54.5 → 56) while the gaze
slides off the cap (tgt y 3.95) down the stem to the ground network
(tgt y 0.42). Both rest poses fixed (goldens byte-identical / connect pose
confirmed). The portrait field key at p 0.410 was retuned to match (back
1.14 → 1.55, fov 6 → 12 — the old value was authored for the inward path
and made the portrait travel re-approach mid-leg). Measured (201-sample
scrub, p 0.26–0.50): landscape subject-distance and fov STRICTLY monotone;
portrait fov strictly monotone, distance monotone within a 0.026-world-unit
flat spot (~0.2% of the 14-unit distance). Rates: landscape yaw 163 °/p
(peak p 0.343) / pitch 107 (0.392); portrait 129 (0.413) / 115 (0.427) —
all far under the ~1.2k threshold. Splice at p 0.38 is the same global
spline as ever — position rate smooth through the boundary, no pose jump.

**Gates.** Full 0→1→0 ride at ~0.043 p/s with console.error/warn hooks:
0 entries, landscape and portrait (the two 'patch' errors in tab history
remain the documented stale pre-fix entries). Instrumented reveal audit:
forward reveal p 0.4016/0.4015 (land/port) with uGrow 0.0000, retire
0.7066/0.7062 and re-arm 0.7024/0.7034 inside the Owned soil murk, reverse
vanish 0.3968/0.3991 with uGrow 0 — no self-ignition, growth-from-base
only. Hover with ados hot: uRouteAmp [1.55, 0.55, 0.55], focused pulse
head travelling, eased return to [1,1,1]; #/connect/ados lands with the
card open. debugState() at p 0.49: pose (7.6, 2.35, 4.1) fov 56, armed
[connect], hotspots [ados, hivemind, discord]. 21 s held mid-growth +
long rest parks: no TAA wash, no black frame. Goldens: pre-reshoot --check
isolated the drift to the connect pair (MAE 2.56/2.25, all others 0.00);
full set re-shot frozen at the final tree — mission/inspire/owned/final
reproduced BYTE-IDENTICAL (git-clean), connect pair intentionally new
(the ADOS move is the only visible rest-frame change), manifest provenance
noted; --check at the final tree: worst MAE 0.00/255, PASS.

## Connect→Owned: one continuous dive (2026-08-04, Hannah's jerkiness complaint)

**The complaint.** The travel from the Connect rest (p 0.49) to the Owned
rest (p 0.725) felt jerky — "it goes in and then…". Measured, the complaint
was three superimposed defects: (a) gaze yaw overswung from −132° through
−71° — 38° PAST its −94° destination — then swung back through −102° to
−94° (a crest-dip-crest whip across the trunk); (b) gaze pitch crested UP
to −8.5°, dove to −46°, then whipped back to −1° — 1454 °/unit-p into the
valley (the audit's ~1530 residual at p 0.657) and 1804 °/unit-p out of it
(the ~1766–1802 soil-crossing residual at p 0.696); (c) camera speed spiked
to 118 u/p right after the rest-drift (3.6 → 118 in 0.05 p).

**The fix — gaze re-keyed, dive positions untouched.** The wider license
(whole pre-rest Owned key list + Connect exit keys) turned out to be
narrower than it looks: owned/leg.js samples the director's POSITION spline
over p 0.660–0.872 (camPts) for every placement rule, and hypha culls
PRNG-branch on camDist — so any position change at p ≥ 0.622 (tangent
reach) reshuffles built geometry and the goldens. And frameAt(p ≥ 0.700)
(ambient portrait homes) reads the TARGET spline, so late-key re-aims were
kept modest. What shipped:

- Positions: only the three placement-free keys moved — the Connect
  rest-drift now creeps ALONG the dive line toward the trunk (the old one
  backed away +z, forcing the exit to reverse it), and the Connect exit +
  Owned t 0.0 keys ride the same straight approach line to the locked
  p 0.622 key. Speed profile 0 → 87 → (locked dive) instead of 0 → 118;
  every position key from p 0.622 on is bit-exact shipped (soil crossing
  p 0.6922, min above-ground radius 1.193, murk window all unchanged by
  construction).
- Targets (every pre-rest key): yaw now walks −132° → −94° monotonically
  (zero derivative sign flips, peak 356 °/p at p 0.612); pitch bows through
  ONE valley (−11.3° → −26.6° at p 0.663 → −1°), peak rate 908 °/p at
  p 0.713 (was 1804). The yaw tail deliberately keeps ~+3.4° of rise after
  p 0.700 (inside the murk) so the portrait field's tgtRight ramp cannot
  reverse portrait yaw mid-crossing.
- FOVs: all shipped values kept, every key.

**Measured (240-step drift-aware scrub, actual-p differentiation).**
Landscape: pitch peak 1804 → 908 °/p, yaw peak 1168 → 356 °/p, speed peak
118 → 93 u/p (the 93 is the shipped underground brake, positions
bit-identical there); pitch one sign flip (the valley), yaw zero. Portrait
(?aspect=portrait): pitch 572, yaw 339, one residual ±42 °/p yaw wiggle at
p 0.704–0.721 — the portrait field's authored tgtRight ramp against the
flat landscape tail, entirely inside the soil murk, sub-perceptual (the
first cut measured −214 °/p before the tail re-tilt). The pre-existing
portrait fov ramp (+3 → +10 over 0.700–0.725, ~540 °/p) is the shipped
field, untouched, murk-covered.

**Gates.** Ignition sweep (320-step, both directions): owned reveal ON
p 0.6932 / OFF 0.6926, connect retire 0.7055 / re-arm 0.7046 — all inside
the 0.692–0.712 murk, matching the shipped audit's placement; ARRIVAL_LO/
CONNECT_HOLD_HI untouched. Live wheel ride 0.49 → 0.758 → 0.476:
0 console errors/warnings, no visible pops (the owned mask is pure in p,
so reverse retires behind the same murk). Spot frames at p 0.55 / 0.62 /
0.67 / 0.697 / 0.706: the exit now reads as one gesture — approach along
the tendrils, dive at the trunk, murk wipe, level-out. Goldens:
`capture.py --check` worst MAE 0.00/255, all ten files, PASS (the ambient-
home target drift measured below the 2-decimal floor).

## Top-left / top-right restage (2026-08-04, Hannah's re-composition brief)

**The brief.** "For Connect the ecosystem, figure out how to reorientate the
scene such that the TEXT goes in the TOP RIGHT and the MUSHROOM in the TOP
LEFT, with the three anchor points positioned throughout the sensible gap
between. We may need to move both the camera and some of the points."

**What moved.** Four things, authored together against the live frame: the
copy block's position class, the rest camera, the three hub world positions,
and the in-world brightness well. The chapter's meaning, route span, rest p,
growth choreography, seam p-windows, hover/pulse behaviour, node ids and the
`nodeWorld('ados')` lens handoff are all untouched.

**1 — Copy to the top right.** New `pos-topright` in site.css, in the house
style and mirroring `pos-upperleft`: `right: 5.2vw; top: 15vh;` plus
`text-align: right` and `.j-sub { margin-left: auto }` so the type sets
right-ragged with the ragged edge facing the open ground rather than the
frame edge, and a mirrored local scrim (`ellipse ... at 60% 50%`, was 40%).
Responsive variant alongside the other pos-* rules in the `max-width: 900px`
block: `right: 6vw; top: 11vh` (the 11vh, against the others' unchanged
values, is what buys the portrait mushroom its clearance below the block).
`CHAPTER_POSITION.connect` points at it. Heading and sub strings untouched.

**2 — Camera re-keyed (leg-local t -> global p).** The rest slides 0.38 world
units further back ALONG THE EXISTING DIVE LINE (rest, drift, exit and
owned/camera.js's t 0.0 key stay collinear on unit (0.9033, 0.1238, 0.4107)
out of owned's (2.523, 1.654, 1.792) — the property the Connect->Owned
"one continuous dive" pass established is preserved by construction), drops
its gaze ~4.5 deg and swings the aim ~12 deg to camera-right while the fov
opens 56 -> 62.

    t 0.13636 -> p 0.410  pos (8.440, 2.84,  3.280)  tgt ( 1.160,  1.950, -1.550)  fov 48
    t 0.30000 -> p 0.446  pos (8.280, 2.70,  3.720)  tgt ( 1.550,  0.850, -2.550)  fov 53
    t 0.40909 -> p 0.470  pos (8.100, 2.55,  4.050)  tgt ( 1.830,  0.100, -3.280)  fov 58
    t 0.50000 -> p 0.490  pos (7.943, 2.397, 4.256)  tgt ( 2.030, -0.450, -3.791)  fov 62   REST (hold)
    t 0.69091 -> p 0.532  pos (7.085, 2.279, 3.866)  tgt ( 0.701, -0.483, -2.606)  fov 61.5 drift
    t 0.88636 -> p 0.575  pos (3.987, 1.854, 2.458)  tgt (-1.029, -0.175, -1.322)  fov 54   exit

At the rest the whole mushroom (cap + stem + base) projects to x 30..573,
y 25..468 at 1440x900 — the frame's upper-left 40% x 52% — the horizon rises
to y ~237 so the ground owns the lower two-thirds, and the diagonal band
between mushroom and copy is all open ground. Monotone Inspire->Connect
zoom-out is kept: camera-to-mushroom-axis distance 9.14 -> 9.20 -> 9.22 ->
9.30 -> 9.52 and fov 44 -> 48 -> 53 -> 58 -> 62, both strictly increasing.
Arc positions along the dive line: rest 6.00 (was 5.62), drift 5.05 (was
4.92), exit 1.62 (bit-exact shipped) — the extra 0.38 units are spent in the
slow creep, so the speed profile goes 22 -> 80 -> 65 u/p (was 17 -> 76 -> 65).
Gaze walks yaw -126.3 -> -134.6 -> -143.0 -> -148.0 (owned t 0.0) with no
derivative sign flips, and pitch descends -15.9 -> -16.9 -> -17.9 -> -18.5
straight into Owned's single ~-26.5 valley.

**3 — Hubs re-fanned through the gap.** All three moved; departure azimuths
re-aimed to match, braid/meander language, spokes, knots, continuations,
frame-exits, route ids and core scales unchanged.

    ados      (2.45, gy,  2.85) az 0.86  ->  (3.40, gy,  2.60) az  0.65
    hivemind  (1.38, gy, -3.05) az -1.07 ->  (5.00, gy, -2.60) az -0.48
    discord   (5.35, gy, -3.45) az -0.57 ->  (7.80, gy, -1.80) az -0.15

World radius 4.3 / 5.6 / 8.0 and camera radius 5.4 / 7.8 / 6.5 at the rest —
near / mid / far, the narrative order. The three azimuths fan 37 / -27 / -8
deg out of the stipe base so no two primaries run as a bundle, and every
route still leaves the same base, so the network reads as ONE ecosystem;
continuations and the four frame-exit strands still run past the hubs and
off-frame. Screen at 1440x900: ADOS (276, 646) lower-left under the mushroom,
Hivemind (886, 468) mid-frame under the copy, Discord (1198, 581) low right.
Counts fell out at 2,061 line segments (448 primary + 238 secondary + 830
hairline + 357 hub + 188 continuation, was 2,306) and 146 points (38 glints +
108 particles, was 158) — the hairline/patch acceptance is a function of hub
placement. Both well under the doc's 5k / 500 budgets.

Portrait label anchors: ADOS's per-orientation anchor is RETIRED (its hub is
now in-frame with room for its pill in both orientations, so
`nodeWorld('ados')` is the hub everywhere again — which is what the lens
focal handoff wants); Hivemind never had one; Discord keeps one, moved from
route-t 0.50 to 0.25, because at 375 px its hub core sits only 10 px from the
right edge and its 99 px pill cannot fit beside it.

**4 — The brightness well, recomputed.** Unprojecting the NEW copy rect at
the rest pose: the block proper straddles the horizon and its lowest rows
land on ground 14.1–20 world units out — past the whole network, so a well
centred on the headline itself would have nothing to quiet. Its local scrim
(`::before`, inset -2.5rem/-3.5rem) reaches nearer: the scrim's bottom edge
sweeps the ground from (0.5, -7.4) at the left corner through (5.4, -11.0) at
centre to (10.3, -14.6) at the right. The well is centred on THAT band:
`uWell (4.4, 1.4, 0.66, 1.9)` -> `(3.60, -12.20, 0.66, 5.40)`. Measured: up
to 66% quieter under the headline's lower edge, 2.6% at the Hivemind hub and
nil at Discord, so no beacon is touched. Moving it was not optional — the old
centre (4.4, 1.4) projects to (541, 616) in the new frame, i.e. it was
carving a dark hole in the middle of the open ground the restage exists to
show.

**5 — Portrait re-authored.** A 375-wide frame has no "beside", so portrait
stacks the same three elements instead: copy across the top, mushroom in the
middle-left band under it, hubs fanned through the lower half. Field keys:

    p 0.410  back 1.55  rise 0.28  tgtUp 0.55  tgtRight -0.12  fov 11
    p 0.490  back 1.62  rise 1.50  tgtUp 2.75  tgtRight -0.30  fov  8

(the 0.410 key now leans a third of the way toward the rest so the last 0.08
of the leg is a settle, not a lurch; back eases 1.60 -> 1.55 -> 1.62 so
portrait subject-distance and fov still grow monotonically with the
landscape's). The strong tgtUp is what pushes the organism clear of the copy
block — tgtUp costs no camera motion at all, since applyPortrait sets the
position before it re-aims — and the dolly-back compresses the 56-deg
landscape hub fan into the ~35-deg portrait frustum so all three hub cores
stay inside the frame.

**Composition, measured (chip and copy bounding boxes in px).**

    1440x900   mushroom  30, 25 .. 573, 468      copy  825, 135 .. 1365, 329
               ados     265,635 .. 340, 658  hivemind 875,457 ..  981, 481
               discord 1187,570 ..1286, 593
               clearances  ados|copy 573  hivemind|copy 128  discord|copy 241
                           ados|hive 557  hive|discord 224   ados|discord 848

    1280x800   mushroom  27, 22 .. 510, 416      copy  726, 120 .. 1213, 308
               clearances  ados|copy 489  hivemind|copy  97  discord|copy 197
                           ados|hive 487  hive|discord 188   ados|discord 746

    375x812    mushroom -57,339 .. 138, 511      copy   23,  89 ..  353, 327
               ados      48,573 .. 122, 596  hivemind 255,504 ..  361, 527
               discord   90,525 .. 189, 548
               clearances  ados|copy 246  hivemind|copy 177  discord|copy 198
                           ados|hive 141  hive|discord  66   ados|discord  25

Nothing overlaps anywhere; nothing is off-viewport. Sway/handheld drift over
60 live frames (~20 s) moves every chip by at most 1 px in each axis at all
three sizes, so the worst-phase clearances are the table above to within
1–2 px (worst sampled: 375x812 ados|discord 24 px). Spot-checked further:
1920x1080 min clearance 140, 1366x768 min 82, 1024x768 min 94, 768x1024
min 37 — all three chips present and clear at every one.

**Rates and splices** (201-sample drift-aware scrub over p 0.300–0.760, rates
differentiated against the ACTUAL journey.progress, both aspects; the numbers
in brackets are the same measurement on the pre-restage tree):

    landscape  restaged span 0.355–0.625:  yaw 358.3 deg/p @0.612 [355.5]
                                           pitch 196.5 @0.614     [182.7]
                                           speed  89.4 u/p @0.559 [ 86.8]
               whole window:               yaw 429.9 @0.759 [429.9]
                                           pitch 924.9 @0.713 [926.6]
                                           speed  90.8 @0.720 [ 90.8]
    portrait   restaged span:              yaw 346.1 @0.614 [338.0]
                                           pitch 243.9 @0.612 [168.3]
                                           speed 167.7 @0.554 [137.4]
               whole window:               yaw 379.2 @0.759 [379.1]
                                           pitch 572.8 @0.720 [575.1]

Everything is an order of magnitude under the ~1.2k deg/unit-p house
threshold. Roll is 0.000000 deg at every sample in both aspects. Sign flips:
landscape yaw 2 / pitch 1 (baseline 1 / 1) — the extra one is a 0.079 deg
wiggle at p 0.492, i.e. inside the rest hold where yaw is nominally constant;
the other two sit at p 0.727, past the Owned rest and outside the restaged
span. Splice continuity, position speed at the five samples straddling each
boundary: p 0.38 reads 9.5 / 9.1 / 8.9 / 8.5 / 8.4 u/p (baseline 13.0 -> 12.3)
and p 0.60 reads 60.8 / 59.5 / 58.4 / 57.3 / 55.6 (baseline 61.4 -> 55.6) —
smooth ramps through both, no pose jump. Every position key from p 0.622 on
is bit-exact shipped, so owned/leg.js's camPts sampling (p 0.660–0.872) and
the hypha PRNG branches are untouched by construction.

**Gates (measured).**

1. Ignition / D16, instrumented on group-visibility flips at 0.0005 p steps
   with a settle, both directions, both aspects: forward reveal p 0.4005
   (landscape) / 0.4003 (portrait) with uGrow 0.0000, reverse vanish 0.3998
   both with uGrow 0.0000 — zero extent at the arm edge, nothing fades in
   over open ground. Forward retire 0.7053 / 0.7052 and reverse re-arm
   0.7048 / 0.7048, both inside the Owned soil-crossing murk (0.692–0.712);
   CONNECT_HOLD_HI 0.705 unchanged and still lawful. Frozen spot frames at
   p 0.412 / 0.44 / 0.46 / 0.55 / 0.62 read as growth-from-base then
   convergence-toward-the-trunk, front motion only.
2. Hover, per hub: uRouteAmp [1.547, 0.553, 0.553] / [0.560, 1.545, 0.554] /
   [0.554, 0.560, 1.545], hairline 0.702, eased return to [1, 1, 1] on
   release. Click on the Hivemind chip opens the card (detail 'hivemind',
   #/connect/hivemind). Deep links #/connect/ados|hivemind|discord all land;
   legacy #/connect/community still normalises to discord.
   nodeWorld('ados') = (3.400, 0.017, 2.600) — the hub, focal handoff intact.
3. Console: full 0 -> 1 -> 0 rides at both aspects with console.error/warn/
   onerror/unhandledrejection hooks — 0 entries. The rate scrubs and ignition
   sweeps likewise logged 0.
4. journey.debugState() at p 0.49: pose (7.943, 2.397, 4.256), fov 62,
   radius 9.011, chapter connect, armed [connect], copy [connect],
   detail null, hotspots [ados, hivemind, discord] once the stagger settles.
5. Goldens: `--check` before the reshoot isolated the drift to the connect
   pair (MAE 17.78 / 17.19; mission, inspire, owned, final all 0.00). Full
   set re-shot frozen at the final tree in this commit, manifest provenance
   noted — mission/inspire/final reproduced BYTE-IDENTICAL; owned@1440x900
   came back with exactly ONE pixel differing by 1 (MAE 2.57e-7), the
   documented ANGLE-Metal frozen-pipeline noise class, so the original bytes
   were kept. `--check` at the final tree: worst MAE 0.00/255, PASS.

**Residuals.**

- Portrait dive speed at p 0.554 rises 137 -> 168 u/p (+22%). It is the price
  of the deeper portrait dolly the new composition needs (back 1.42 -> 1.62,
  rise 0.55 -> 1.50 at the rest, unwinding into the locked p 0.622 key). The
  audited rates — pitch and yaw — are unchanged or better. A low-rise variant
  (back 1.65, rise 0.05, tgtUp 3.25) was measured: it recovers ~7 u/p but
  costs 5 px of chip clearance and crops more of the cap, so it was not taken.
- Below ~1.4 viewport aspect (e.g. 1024x768) the cap begins to clip at the
  left frame edge (mushroom box x0 -77 there). The composition is authored
  for 16:10 / 16:9; all three chips stay present and clear at 4:3.
- In portrait the cap is cropped ~30% at the left edge. That is the house
  precedent (the shipped portrait golden clipped it too), and it is what buys
  the mushroom its size in a 375-wide frame.
- Discord's portrait chip rides its route rather than its hub (see §3). The
  alternative — pulling the frame far enough left for its pill to fit beside
  the hub — costs more than half the mushroom.
- The p 0.63–0.69 bareness and the modest ambient arrival flare stand as
  earlier passes left them.
