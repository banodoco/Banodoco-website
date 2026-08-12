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

## Pre-existing paths + the raised eye (2026-08-05, Hannah's two changes)

**The two asks.** (1) *"In the connect the ecosystem one, can you make it so
the stuff that appears on the ground when you enter the section actually moves
along the lines that are already there rather than creating new lines? Or at
least make them match the lines that are there and be there before in a
non-highlighted manner — currently it feels weird that they just appear."*
(2) *"In connect the ecosystem, can you push the camera up a bit, so that the
mushroom is more towards the middle of the page vertically."*

### 1 — The model: the network is not grown, it is LIT

The growth model of §4 is retired. It was the honest answer to D16 at the time
— nothing may fade in over open view, so make the reveal *motion* — but making
the reveal out of GEOMETRY APPEARING is precisely what made it read as
conjured. The paths are now part of the world; arriving runs light along them.

Two orthogonal gates replace the single `uGrow`:

    uResolve   CAMERA-PURE (connect/index.js resolveNow()). Brings the QUIET,
               un-highlighted paths out of the ground and takes them back.
    uLit       PURE IN p (drive(p)). The travelling light: a soft front runs
               base -> hubs along aAlong, lifting each strand from its quiet
               level to its full one and kindling each hub core as it lands.

A strand's brightness is `mix(uQuiet, 1.0, litMask) * uResolve`, with the
tier contrast COMPRESSED while unlit (`uQuietTier` 0.55, tiers converging
toward 0.42) so a resting path reads as web, not as a highway waiting to be
switched on. `uQuiet` is 0.22. The hub convergence — the radial spokes and the
core knot — carries a new tier **-1**, which is numerically tier 0 everywhere
else in the shader (same `tierBase` ladder, same pulse rights, so nothing
about the lit look changes) but goes to 0.22× the quiet level before its light
arrives: a resting starburst at the ambient level read as a hub already lit,
and the whole beat is that the hubs KINDLE as the light reaches them. The core
glow sprites stay gated on `hubIgnite`, so they are the arrival itself.

Ambient life, hover, pulses, the exit convergence and the hero-web dim are
unchanged in kind; they now ride `amount x resolve` instead of `amount`.

**Does it read as the same family as the hero's own web?** Measured, not
eyeballed. Mean luminance of the lower-frame ground band (bottom 5–40% of the
buffer, 1440x900), rendering the same frame four ways:

    p 0.433 (paths fully resolved, light not yet departed)
      background alone                     15.011
      + hero ground web alone              +7.530
      + the quiet paths                    +0.874   = 11.6% of the hero web
      ground energy vs hero web alone       0.908x

    p 0.490 (the rest, fully lit)
      background alone                     19.619
      + hero web (dimmed, as shipped)      +4.299
      + the lit network                    +4.138
      ground energy vs hero web alone       1.96x

So in the quiet state the paths add an eighth of what the hero's web is
already putting on the ground — and because the hero-web dim comes in with
the same camera-pure resolve, the ground is 9% CALMER with the paths present
than the undimmed hero web alone. That is the opposite of double exposure; it
is why the quiet state reads as the hero's own web, organised.

### 2 — The camera-pure resolve, and where its threshold sits

`resolveNow()` reads ONE quantity off the live camera: `forward.y`, the
downward component of its own look axis. No p, no clock, no state — so the
paths resolve as the eye comes down onto the ground the way real ground detail
does, dissolve back on the way out, and a reverse scrub retraces it exactly
(the camera pose is itself a pure function of p). Band: `sin(-1.2 deg)` to
`sin(-7.2 deg)`.

    forward.y                     landscape          portrait
      hero pose p 0              +0.0337 (1.9 up)   +0.1452 (8.4 up)   -> 0
      minimum over p 0..0.35     +0.0337 (at p 0)   +0.0323 (at 0.20)  -> 0
      Inspire rest p 0.26        +0.0863            +0.0477            -> 0
      threshold                  -0.0209            -0.0209
      first non-zero             p 0.3715           p 0.3685
      fully resolved             p 0.4405           p 0.4405
      Connect rest p 0.49        -0.1548            -0.1548

**The hero-pose verdict: NOT VISIBLE, by three independent margins.** The
closest either orientation comes to the threshold anywhere before Connect is
0.053 in `forward.y` (~3.0 deg) — an order of magnitude more than the handheld
layer's entire 0.34 deg peak wander, and handheld is EXACTLY zero within
0.018 p of a rest anchor, so both protected frames are hard zeros with no
jitter at all. Second, `group.visible` is gated on the resolve, so at the hero
pose the network is not merely dark, it is not submitted. Third, seams.js does
not arm the chapter below p 0.32, so p 0 and p 0.26 are outside the window
entirely. Measured at the live hero pose: `armed []`, `connectVisible false`,
`resolve 0`, hero ground-web opacities at their untouched base
[0.36, 0.35, 0.95, 0.5, 0.42, 0.45, 0.95]. The mission goldens re-shot at the
final tree came back with **zero differing pixels** at both sizes.

A camera-to-network PROXIMITY factor was built first — it is the more literal
reading of "resolves as you approach" — and had to be dropped. The portrait
field dollies back 1.62x at this rest, so the portrait camera sits 13.59 world
units from the network while the LANDSCAPE hero pose sits at 12.76: the
portrait chapter is farther from the network than the frame it must stay dark
on, and no single threshold separates them (normalising by fov does not fix
it either — 37.1 vs 21.1 at the two hero poses, 19.4 at the portrait rest).
The gaze drop is orientation-invariant by construction, because portrait.js
re-aims the gaze rather than pointing it somewhere else.

**Arming moved to p 0.32** (`startOf('connect') - 0.06`, was +0.02 = 0.40):
the paths must pre-exist the reveal, so the group has to be armed before
anything can resolve. Between 0.32 and 0.3715 the chapter is armed,
`group.visible` is false and it costs no draws. `setArmed` now SNAPS `amount`
to 1 on the arming edge (invisible by construction, since resolve is 0 there)
and keeps the ease only on retire — which removes the one way a time-based
fade could ever have been seen: a hard fling across the arm edge used to leave
the eased amount still climbing while the paths came into view.

**Light-travel window** leg-t 0.24 -> 0.487 (p 0.4328 -> 0.4871, was
0.10 -> 0.46): the quiet paths are ~1.0 resolved by p 0.4405, the light leaves
the base at 0.433 and lands on Discord just under the rest at 0.490.

**The copy brightness well is retired to strength 0.** Raising the gaze walked
the horizon down the frame (1440x900: y 241 -> 338) and the copy block with
its scrim now sits entirely above it — re-unprojected, its bottom rows meet
the ground 55–74 world units out and the scrim's bottom edge at 42, an order
of magnitude past the farthest strand. There is nothing under the copy to
quiet. Leaving the old well would have been actively wrong: (3.60, -12.20)
now projects to (1012, 457) with its 5.4-unit radius spanning x 794..1336,
y 430..502 — a dark hole through the middle of the open ground, the exact
failure the 2026-08-04 recompute fixed. Centre/radius are kept at the copy's
measured ground footprint (0.74, -37.68) so the machinery stays wired.

### 3 — The camera: the eye rises 0.25 and the gaze lifts 7 deg

Raising the camera with the target pinned does almost nothing (the two effects
nearly cancel — measured ~12 px of subject travel per world unit of lift), and
a rigid translation up pushes the near hubs off the bottom (ADOS would move
284 px for the mushroom's 170). What works is the rig rising ALONG THE DIVE
LINE while the gaze lifts with it.

    t 0.13636 -> p 0.410  pos (8.4400, 2.9000, 3.2800)  tgt ( 1.140, 2.210, -1.563)  fov 48    pitch  -4.5
    t 0.30000 -> p 0.446  pos (8.2800, 2.8200, 3.7200)  tgt ( 1.458, 1.576, -2.636)  fov 53    pitch  -7.6
    t 0.40909 -> p 0.470  pos (8.1000, 2.7300, 4.0500)  tgt ( 1.674, 1.235, -3.462)  fov 58    pitch  -8.6
    t 0.50000 -> p 0.490  pos (7.9430, 2.6470, 4.2560)  tgt ( 1.827, 1.028, -4.067)  fov 62    pitch  -8.91  REST
    t 0.69091 -> p 0.532  pos (7.0846, 2.4897, 3.8657)  tgt ( 0.530, 0.403, -2.779)  fov 61.5  pitch -12.6   drift
    t 0.88636 -> p 0.575  pos (3.9863, 1.9221, 2.4573)  tgt (-1.101, 0.119, -1.377)  fov 54    pitch -15.8   exit

Positions changed in **y only**: rest +0.250, drift +0.211, exit +0.068, the
approach keys +0.06/+0.12/+0.18 so the descent from the Inspire splice stays
monotone (2.95 -> 2.90 -> 2.82 -> 2.73 -> 2.647). x and z are the shipped
values to within 0.001, and the four keys — rest, drift, exit and
owned/camera.js's t 0.0 — are still COLLINEAR on one straight dive to the
trunk: new unit (0.89794, 0.16451, 0.40822) out of owned's
(2.523, 1.654, 1.792), each key's own unit agreeing to 1e-4 (the shipped set
agreed to 4e-4, so the "one continuous dive" property is preserved and
slightly tighter). Arc fractions along the line are unchanged, so the speed
profile is the shipped one. **owned/camera.js is untouched**, and every
position key from p 0.622 on is bit-exact: the soil crossing measures
p 0.6922 and the minimum above-ground radius 1.192, both the shipped values.

Targets were re-pitched IN THE VERTICAL PLANE ONLY, so every key's YAW is
bit-exact — the gaze still walks -123.6 -> -133.0 -> -139.5 -> -143.7 (rest)
-> -135.4 -> -127.0 -> -122.0 (owned t 0.0) with no derivative sign flips
after the rest. Pitch is now one monotone descent across the whole leg:
-0.3 (inspire's last key) -> -4.5 -> -7.6 -> -8.6 -> -8.91 (rest) -> -12.6
-> -15.8 -> -18.5 (owned t 0.0) -> owned's single ~-26.5 valley.

Portrait re-tuned to match: the landscape leg now aims 5–7 deg higher on its
own, so the field must add proportionally less. `tgtUp` 2.75 -> 1.50 at the
rest and 0.55 -> 0.30 at p 0.410. Without this the portrait mushroom sank to
0.59 of the tall frame AND the portrait gaze came out at only -4.7 deg, which
left the camera-pure resolve at 0.66 instead of 1 at the portrait rest. At
1.50 the portrait gaze is -8.91 deg — identical to the landscape rest, so the
network resolves fully in both orientations — and the portrait stack is the
shipped one.

**Composition, measured (px, at the rest).** The mushroom's box centre lands
at 0.419 of the frame height at EVERY landscape size (it is a pure
pitch/fov property), up from 0.276 — and its left edge and width are
untouched, so the upper-LEFT placement is exactly preserved. `pos-topright`
re-verified: the copy is unchanged and now sits over sky rather than
straddling the horizon.

    1440x900   mushroom  79,160 ..  573,593   (cy 377 = 0.419)   copy 825,135 ..1365,329
               ados     251,776 ..  326,800   hivemind 876,574 ..  982,597
               discord 1198,700 .. 1297,723
               clearances  ados|copy 670  hivemind|copy 245  discord|copy 371
                           ados|hive 578  hive|discord 239   ados|discord 874

    1280x800   mushroom  70,143 ..  511,528   (cy 336 = 0.419)   copy 726,120 ..1213,308
               ados     222,689 ..  296,712   hivemind 777,509 ..  883,532
               discord 1063,621 .. 1162,644
               clearances  ados|copy 575  hivemind|copy 201  discord|copy 313
                           ados|hive 506  hive|discord 201   ados|discord 768

    375x812    mushroom -48,346 ..  137,524   (cy 435 = 0.536)   copy  23, 89 .. 353,327
               ados      47,575 ..  121,598   hivemind 255,511 ..  361,534
               discord   90,531 ..  189,554
               clearances  ados|copy 248  hivemind|copy 184  discord|copy 204
                           ados|hive 140  hive|discord  66   ados|discord  21

Nothing overlaps, nothing is off-viewport. Spot-checked further: 1920x1080
min clearance 279, 1366x768 min 181, 1024x768 min 189 (and the 4:3 cap clip
improves, mushroom x0 -77 -> -35). Sway/handheld over 60 live frames (~9 s)
at the rest moves every chip by at most 1 px in each axis, so the table holds
to within a pixel through all phases.

**Rates and splices** (drift-aware scrub, p pinned exactly per sample so
differentiation is against the true progress; `?steady=1`; brackets are the
shipped tree's numbers from the previous section's table).

    landscape  restaged span 0.355–0.625:  yaw   358.2 deg/p @0.614 [358.3]
                                           pitch 175.9        @0.611 [196.5]
                                           speed  90.0 u/p    @0.560 [ 89.4]
               whole window 0.30–0.76:     yaw   430.3        @0.760 [429.9]
                                           pitch 902.3        @0.714 [924.9]
                                           speed  90.4        @0.721 [ 90.8]
    portrait   restaged span:              yaw   346.0        @0.614 [346.1]
                                           pitch 175.9        @0.611 [243.9]
                                           speed 169.2        @0.555 [167.7]
               whole window:               yaw   379.5        @0.760 [379.2]
                                           pitch 557.6        @0.721 [572.8]

Everything is an order of magnitude under the ~1.2k deg/unit-p threshold, and
the pitch peaks are BETTER than the shipped tree in both aspects. Roll is
0.000000 deg at every sample in both orientations. Sign flips over the
restaged span: yaw 1, pitch 0. Splice continuity, position speed at samples
straddling each boundary: p 0.38 reads 9.2 / 8.9 / 8.6 / 8.4 / 8.2 / 8.1 u/p
and p 0.60 reads 60.1 / 59.0 / 58.0 / 56.8 / 55.3 / 53.7 — smooth ramps
through both, no pose jump.

**Budget.** The question is what carrying the paths outside the old armed
window costs, and the answer is structural: `group.visible` is gated on the
camera-pure resolve, so between the new arm edge (0.32) and the resolve edge
(0.3715) — and at the hero pose, and at the Inspire rest — the network
submits 0 line segments, 0 points and 0 sprites. Verified live at p 0, 0.26,
0.30 and 0.34: `connectVisible false`, counts zero. The per-frame cost there
is one `getWorldDirection()` plus one smoothstep, then an early return before
the 108-particle update. The span over which the network actually draws grows
by exactly 0.0285 p (0.40 -> 0.3715), i.e. 2.9% of the ride, and the drawn set
at the rest is unchanged from the shipped build: 2,061 line segments, 146
points, 3 sprites, one ShaderMaterial for strands and one for points.
Frame-time: this rig's paired measurement (composer.render + glReadPixels
sync, network visible vs hidden on alternating renders at a fixed pose) has a
±2 ms noise floor, which is larger than the effect. At the Connect rest the
paired median delta is +0.2 to +1.3 ms with the network drawn (before-tree
-0.5 to -0.3 ms — same geometry, same materials, same draw count, so the two
are the same number inside the noise). At the hero pose, the Inspire rest and
p 0.34 the paired delta is the noise floor itself (-0.8 to +0.5 ms), because
nothing is drawn either way.

**Gates (measured).**

1. Ignition / D16, instrumented on group-visibility flips at 0.0005 p steps,
   both directions, both aspects: forward reveal p 0.3730 (landscape) /
   0.3730 (portrait) with `uLit` 0 and `uAmount` 0.00069; reverse vanish
   0.3725 / 0.3725 with the same values — the flip happens at 0.07% of full
   brightness and the two directions mirror within one step. Forward retire
   0.7050 and reverse re-arm 0.7045, both inside the Owned soil-crossing murk
   (0.692–0.712); `CONNECT_HOLD_HI` 0.705 unchanged and still lawful.
   Reverse identity spot-check: arriving at p 0.452 from below and from above
   gives bit-identical uniforms (`lit` 0.2863, cores [0,0,0]) and bit-identical
   hero-web dim values.
2. Arrival sequence, frozen spot frames at 1440x900: p 0.433 — the whole
   route web is present and quiet, no hub is a beacon; p 0.452 — light out of
   the base along paths that were already there, everything ahead still quiet;
   p 0.470 — routes lit, ADOS and Hivemind kindled, Discord landing; p 0.490 —
   the rest. Nothing appears at any step; the same frames reproduce in reverse.
3. Chips: the table above, three viewport sizes plus four spot-checks. Hover
   per hub: `uRouteAmp` [1.55, 0.55, 0.55] / [0.55, 1.55, 0.55] /
   [0.55, 0.55, 1.55], hairline 0.70, eased return to [1, 1, 1] on release.
   Click on the Hivemind chip opens the card (detail 'hivemind',
   #/connect/hivemind, aria-expanded true), Escape closes (detail null).
   Tab order ados, hivemind, discord. Deep links #/connect/ados|hivemind|
   discord all land; legacy #/connect/community still normalises to discord
   and a cold load renders fully lit (`uAmount` 1 via snap + resolve 1).
   `nodeWorld('ados')` = (3.400, 0.017, 2.600) — the hub, focal handoff intact.
4. Console: full 0 -> 1 -> 0 ride with console.error/warn/onerror/
   unhandledrejection hooks — 0 entries. The sweeps, scrubs and soaks likewise
   logged 0.
5. Soaks: 22 s parked mid-light (p 0.455) and 22 s parked at the rest — no TAA
   wash, no black frame, no errors; the ambient pulse clocks are alive at the
   rest (an ADOS arrival flare was caught at core opacity 0.996).
6. Goldens: `--check` before the reshoot isolated the drift to the connect
   pair (MAE 19.93 / 5.14; mission, inspire, owned all 0.00, final 0.02/0.01 —
   and that final wobble reproduces IDENTICALLY on the untouched tree, so it
   is the pre-existing frozen-pipeline determinism class, not this change).
   Full set re-shot frozen at the final tree in this commit, manifest
   provenance noted. **mission reproduced with ZERO differing pixels at both
   sizes**; inspire@1440x900 and owned@1440x900 came back with exactly ONE
   pixel differing by 1, and final (both sizes) with the pre-existing wobble
   (MAE 0.016/0.011, max 24/40, 0.008%/0.003% of pixels >8) — all four kept
   their original bytes. The connect pair is intentionally new.
   `capture.py --check` at the final tree: worst MAE 0.02/255, PASS.
7. `journey.debugState()` at p 0.49: pose (7.943, 2.647, 4.256), fov 62,
   radius 9.011, chapter connect, armed [connect], copy [connect],
   detail null, hotspots [ados, hivemind, discord].

**Residuals.**

- The horizon rides down 241 -> 338 at 1440x900, so the ground owns the lower
  ~62% of the rest frame instead of ~73%. That is the unavoidable price of
  moving the mushroom to mid-frame: subject height and horizon height are
  locked together by gaze pitch (measured ~14.5 px of subject travel per
  degree at fov 62), and every alternative that decouples them — receding
  along the dive line, lowering the eye and over-lifting the gaze — costs
  either the mushroom's size and its left-third placement or the ADOS hub's
  starburst off the bottom edge. The ground is still the frame's subject.
- ADOS sits lowest in frame (chip y 776 of 900) and the outer ends of its
  starburst spokes now run off the bottom edge at 1440x900. Read as the
  network continuing past the frame, which is the chapter's own language, so
  the hub was not moved.
- The in-world brightness well is inert (strength 0) rather than deleted. If a
  future recomposition ever puts the copy back over the network, its centre
  and radius are already the measured footprint; only the strength needs
  restoring.
- The p 0.63–0.69 bareness and the pre-existing final-golden determinism
  wobble stand as earlier passes left them.

## One route at a time (2026-08-06, Hannah's "it feels like a rush")

**The ask.** *"When I scroll into the connect ecosystem section, the way the
three points light up — could you make them happen ONE AT A TIME and A LOT
SLOWER? It should feel like there are trails that kind of light up, in an
elegant way. Because right now it feels like a rush. It should feel like an
ecosystem growing."*

**Why it rushed.** The previous pass got the *model* right — the paths
pre-exist and arriving LIGHTS them — but kept one front running against the
GLOBAL `along` axis. One front on a radial axis means all three routes depart
the stipe base on the same frame and the whole ecosystem resolves as a single
expanding ring. Measured on the shipped tree (bisection to 1e-5 p, core
opacity at half its resting cap as the kindle test):

    SHIPPED           depart    route lit    hub kindles
      ADOS            0.4335      0.4677        0.4538
      Hivemind        0.4335      0.4701        0.4592
      Discord         0.4335      0.4789        0.4661
      whole arrival   0.4335 -> 0.4864          span 0.0529
      kindle spread                             span 0.0123

Three hubs inside 0.0123 p. At a deliberate scroll that is about a third of a
second between the first hub and the last — which is not a sequence, it is one
event with a slight blur on it. That is the rush.

### The change: one front per route

`uLit` / `uHead` / `uLitMax` are now **vec3, one component per route**, and
every vertex carries the id of the front that owns it. That id is NOT `aA.z`
(the existing route attribute, which keeps owning hover amp and pulse rights
and is 3 for the hairline fill) but a new **`aB.w`, the LIT ROUTE** — so the
hairline scattered around a primary lights with THAT primary, and the fill
near a hub kindles with its hub instead of as one flat sheet. Points carry the
same thing as `aR`; particles inherit the route they drift on. Selection is by
`if`/`else` chain, never dynamic vector index — the house idiom the pulse block
already uses, and the only form that is safe on GLSL ES 1.0.

`uLitMax` is each front's measured reach: `buildTendrils` tracks the farthest
`along` pushed for each lit route and publishes it plus the ramp width as
lead. That does two things. Each route's `uLit` is a clean 0..1 whatever its
length, and `uLit * uLitMax` IS the head's position on the global along axis —
so `index.js` keys `hubIgnite` off exactly the expression the shader uses, and
the kindle lands as its own trail's light arrives, by construction rather than
by a tuned coincidence. The old `1.06` magic lead is gone.

### The schedule

    NEW               depart    route lit    duration   hub kindles
      ADOS            0.4004      0.4315      0.0311      0.4134
      Hivemind        0.4228      0.4561      0.0333      0.4398
      Discord         0.4468      0.4866      0.0398      0.4698
      whole arrival   0.4004 -> 0.4866        span 0.0862
      kindle spread                           span 0.0564

    total arrival   0.0529 -> 0.0862   1.63x
    kindle spread   0.0123 -> 0.0564   4.58x
    per-route reach (uLitMax)  0.8696 / 0.9318 / 1.1150

**ORDER — ADOS, Hivemind, Discord (nearest to farthest).** Three reasons, and
the third is the one that settles it.

1. It is growth outward from the base, which is the metaphor asked for.
2. It is already the chapter's order everywhere else: `NODE_IDS`, the tab
   order, the chip order, the narrative order. The sequence the eye learns
   watching the arrival is the sequence every other affordance uses.
3. **Far-to-near is not available, because this chapter already owns that
   gesture and means something else by it.** `uExit` converges the network's
   energy back INTO the root as the camera walks to the trunk — light draining
   home. An arrival that started at the frame edge and worked inward toward the
   mushroom would be the exit gesture played forwards, and the two would blur
   into each other across the Connect->Owned dive.

On screen (1440x900) near-to-far also sweeps lower-left -> mid-right ->
far-right, so the staging reads as one continuous outward motion across the
open diagonal band rather than three unrelated flashes.

**DURATION — proportional to each front's own reach**, so the light travels at
ONE SPEED across the whole network (28.0 along-units per unit p on all three,
measured; the shipped single front averaged 20.0). Equal slices were tried
first and are wrong: Discord's run is 1.28x ADOS's, so an equal window makes
the far light visibly whip while the near one ambles, and the network stops
feeling like one substance.

**OVERLAP — 0.30 of each window.** The next route departs the base while the
previous is still running out past its hub, so the ground is never dead
between beats, but each route still lands its own hub in clear air. Measured
overlap regions: 0.4228–0.4315 and 0.4468–0.4561, i.e. 0.0087 and 0.0093 of p.
At 0 it stutters into three separate events with a visible hole at each
handover (both windows are smoothstepped, so their slow tail and slow head
meet); past ~0.45 the three merge back toward the rush this change removes.

**START — p 0.4004, not 0.4335.** The far end is pinned: p 0.490 is the
section's reference still and must be FULLY lit, so everything is home by
0.487. Slower therefore has to be bought at the front. p 0.400 sits 0.035
after the quiet paths are unambiguously drawn (`group.visible` flips at
p 0.365) so the eye has read the network as pre-existing before a strand of it
is lit. The camera-pure resolve is 0.455 there and still climbing, which is
the one thing worth care: a strand the light reaches at p 0.400 comes up to
0.455 of full and keeps brightening as the resolve completes. Checked on
screen at 1440x900 across p 0.390 / 0.400 / 0.409 / 0.418 — p 0.390 and 0.400
are the same quiet web, and 0.409 reads as light landing on a dim ground, not
as geometry arriving, because the geometry is demonstrably already in the
frame before it.

### The shape of the front — what actually makes it a trail

Sequencing alone would have made each front FASTER, not slower: three fronts
laid end to end in a budget only 1.63x larger each cover their route in less p
than one simultaneous front did. The slowness Hannah asked for lives in the
front's own profile, not in the schedule.

    FRONT_SOFT   0.05 -> 0.11    the quiet->lit ramp trailing the head
    FRONT_TIP    0.028 -> 0.032  half-width of the bright head
    head peak    1.00 -> 0.55    uHead amplitude

`FRONT_SOFT` is the one that matters. A given strand's own quiet->lit lift now
takes **0.00393 p against 0.00250 — 1.57x slower** — even though the head
travels 1.40x faster. That is the "trails that kind of light up": you watch a
strand come up, rather than watch an edge cross it.

The head was cut because it is multiplied into `uColHot` (near-white) at 1.4x.
On the shipped fast front that was a flicker the eye read as speed; at this
pace it became a cold white streak swiping across the ground — the loudest
thing in the frame and the exact opposite of "elegant". Widening `FRONT_TIP`
was tried first (0.042) and made it worse: more geometry inside the head at
once, more additive overlap across a braid, a heavier streak. `FRONT_TIP` is
therefore left essentially at its shipped value and the amplitude carries the
change. Note the white head is NOT new — the shipped build blows white the
same way where its head crosses a braid (verified by re-shooting HEAD at
p 0.450); it was simply on screen for half as long.

### Gates (measured)

1. **Reverse mirroring, EXACT.** p 0.30 -> 0.55 forward then backward, 0.005
   steps, p pinned per frame (true-p delta between the two passes 7.0e-5).
   Over every DRAWN sample: **max delta in the three `uLit` components 0, max
   delta in the three `hubIgnite` values 0.** Visibility flips agree exactly
   in both directions (first drawn p 0.365 forward and reverse). The only
   residual anywhere in the core sprites is the pre-existing time-based
   ambient pulse flare, which is documented ambient life and not the arrival.
   Samples where the group is NOT drawn are excluded on purpose: the animator
   early-returns before writing uniforms there, so an undrawn frame carries a
   stale value that no pixel ever sees.
2. **No self-ignition.** At the first drawn frame (p 0.365) `uLit` is
   [0, 0, 0] — the network arrives as a quiet web and nothing is lit until
   0.4004, 0.035 of p later. Arm edges and the D16 argument are untouched;
   this change moves no camera and no seam.
3. **Rest fully lit at every size.** p 0.490 reads `uLit` [1, 1, 1], all three
   cores at their 0.58 resting cap, at 1440x900, 1280x800 and 375x812.
4. **Joins untouched.** p 0.375 / 0.380 / 0.385 all read `uLit` [0, 0, 0] —
   the light has not departed anywhere near the section's low join. p 0.595 /
   0.600 / 0.605 all read [1, 1, 1].
5. **Ride, four speeds** (headless, drawn frames only, 1440x900):

        p/frame    ADOS      Hivemind   Discord    kindles at
        0.0006     51 fr     54 fr      64 fr      0.4138 / 0.4402 / 0.4701
        0.0020     15 fr     16 fr      20 fr      0.4142 / 0.4402 / 0.4702
        0.0080      3 fr      4 fr       5 fr      0.4162 / 0.4402 / 0.4722
        0.0250      1 fr      1 fr       1 fr      0.4202 / 0.4452 / 0.4702

   **Zero non-monotonic steps and zero non-finite values at every speed.** At
   0.0006 p/frame (a slow deliberate scroll) the arrival runs ~142 frames,
   about 2.4 s, with the three hubs kindling 0.44 s and 0.50 s apart — against
   1.5 s and 0.34 s end-to-end on the shipped build. Even at a hard fling the
   three still land on three consecutive frames IN ORDER: the sequence
   degrades to a fast ripple, never to a simultaneous flash, because nothing
   here reads a clock.
6. **Hover / chips / deep links unchanged.** `uRouteAmp` [1.55, 0.55, 0.55] /
   [0.55, 1.55, 0.55] / [0.55, 0.55, 1.55], hairline 0.70, eased return to
   [1, 1, 1]. `nodeWorld('ados')` = (3.400, 0.017, 2.600). Deep links
   #/connect, /ados, /hivemind, /discord all land at p 0.490 fully lit; legacy
   /community still normalises to discord; Escape clears the detail; tab order
   ados, hivemind, discord.
7. **Console clean.** console.error/warn/onerror/unhandledrejection hooked
   across a slow ride, a fast fling and a full 0 -> 1 -> 0 ride: **0 entries.**
8. **Reference stills byte-identical.** `capture.py --check`, all five poses x
   both sizes: **connect@1440x900 and connect@430x932 both MAE 0.00/255,
   0.0% px >8** — the destination is genuinely untouched, which is the point
   (this is a re-time of the approach, not of the frame it arrives at).
   mission / inspire / owned also 0.00; final 0.18 / 0.13, the pre-existing
   frozen-pipeline determinism wobble that reproduces on the untouched tree.
   Worst 0.18 against warn 0.50 / fail 1.00, PASS. No golden was re-shot.

### Residuals

- The head still blows white where it crosses a braid at its brightest, and
  most visibly as it lands on a hub (Discord at p ~0.472). It is much reduced
  and it settles to gold by the rest, and it is the shipped build's own
  behaviour rather than something this pass introduced — but if it is ever
  wanted gone, the lever is `uColHot`'s weight in the strand shader's `tip`
  term, not the amplitude, which is now doing about as much as it can.
- The hero-web dim rides `litAvg`, so it now begins its deepening at p 0.400
  instead of 0.4335. It is spread over a longer window and is therefore
  gentler per unit p than before, but it does mean the far-field hairline
  reads slightly quieter through 0.409–0.418 than the shipped build did at the
  equivalent moment. Deliberate: attention concentrating on the lit route is
  the effect wanted.
- Each individual front's head is 1.40x faster than the shipped one, which is
  arithmetic — three sequential fronts in a 1.63x budget cannot each be slower
  than one simultaneous front. The perceived slowness is bought with
  `FRONT_SOFT` and with the 4.58x wider kindle spread. If a genuinely slower
  head is ever wanted, the only remaining budget is starting before p 0.400,
  which means lighting a web that is under half resolved.
- The p 0.63–0.69 bareness and the final-golden determinism wobble stand as
  earlier passes left them.

---

## 2026-08-06 (later) — the Inspire → Connect boundary is implicated in the spore extinction

Hannah's third spore report names this boundary as **the worse of the two**
("especially jarring moving from Inspire to Connect"). Reproduced and measured;
full diagnosis and the required fix are in
`07-chapter-inspire.md`, section "2026-08-06 (later)". The short version, for
anyone working on this leg:

**Nothing on the Connect side causes it.** Connect never claims the spore
driver seat (`setDriver` is called only from `chapters/inspire/index.js:899`),
its own particles are 108 ground glints on the tendril routes plus a 4,122-vertex
strand mesh — all at ground level, none in the shed volume. The shed keeps one
`Points` object of 4,200 dots at every p across the boundary, index-continuous,
with no count step and no re-seed.

**What does cause it is Inspire's retire envelope.** In `inspire/index.js`
`drive(p)`:

```js
const out = 1 - smz((p - (endOf('inspire') - 0.025)) / 0.06);   // 0.355 → 0.415
api.setReveal(a * out, b * out, c * out, band * out);
```

`out` pulls **all three exits down simultaneously**, so both migrant cohorts
(exits 1 and 2 — 50% of the shed) sweep through the organism-side dead zone
between "ambient surrendered" (rev ~0.30) and "plume light granted"
(rev 0.55) **at the same time**. On the way *in* the two migrants cross that
zone separately, giving two dips of −13.3% and −10.0%; here they cross together
and the dips add:

```
p     0.365  0.370  0.375  0.380  0.385  0.390  0.395  0.400  0.410
eff   0.926  0.844  0.741  0.624  0.500  0.376  0.259  0.156  0.020
lum   3029   2973   2637   2308   2264   2274   2492   2731   2831
```

**−25.3%** total shed light, **−31.9%** in dots above 0.60 luminance, with
**1,193 dots converted-and-black** at the trough (1,027 of them above y = 3.0
in the braided rise) against a resting baseline of 240. Live unfrozen ride
agrees: −25.8%.

**Do not "fix" this by re-timing `out`.** Staggering the three exits' retirement
so the migrants cross separately would halve the trough, but it only splits one
violation into two smaller ones, and it would move the Connect arrival timing
this document's own restage established (4146288). The fault is the organism's
migrant rise draw-on gate, and the fix belongs there — a conservation floor so
the gate never removes more light than the dot has already ceded. Until that
lands, this boundary stays as it is.

### 2026-08-06 (later still) — fixed organism-side; this leg's timing untouched

The conservation floor landed in `organism/spores.js` (see
`07-chapter-inspire.md`, "the conservation floor, applied"). At this boundary:

| | before | after |
|---|---|---|
| total shed light trough | −25.3% | **−11.7%** |
| dots above 0.60 luminance | −31.9% | **−17.7%** |
| converted-and-black dots at p 0.385 | 1193 | **195** (resting baseline 240) |

The extinction cohort is gone — no dot goes dark at this boundary any more.
The residual −11.7% is a smooth sag while half the population is mid-exchange
between its ambient and plume looks, not a blackout; dots in the 25–60%
luminance band stay flat across the crossing.

**This leg's timing is untouched, as intended.** Nothing in
`journey/chapters/connect/` was edited, and the retire envelope `out`, the
`endOf('inspire')` offset and every arrival window are exactly as the restage
left them — `connect` golden re-checks at MAE 0.00/0.00 both sizes. The
staggered-retire alternative this document warned against was not taken; the
fault was organism-side and was fixed there.

---

## 2026-08-07 — Hannah re-reports the rush; measured, it is already fixed

**The ask, verbatim.** *"When I scroll in to the connect ecosystem, the three
things appear along the ground, but they appear really fast all at once, whereas
they should be more gradual in growth... one, two, three, and they should feel
like they're growing, still reasonably fast but a lot slower than they are right
now. You might already have this in an earlier task."*

**Verdict: she was reading an older build. Nothing changed here.** Her own last
sentence is the correct one. This is the same complaint the `4146288` restage
above answered, and that restage is live, intact, and does what she is asking
for. The two hypotheses were separated by measurement rather than by reading the
diff, because a shipped constant proves only that a file says something.

### 1. The restage is live

`LIGHT_LO 0.0909` / `LIGHT_HI 0.487` / `LIGHT_OVERLAP 0.30` / `FRONT_SOFT 0.11`
are on disk, and `4146288` is the **last commit to touch either
`connect/index.js` or `connect/tendrils.js`** — nothing since has regressed it.
More usefully, the behaviour was read off the running page rather than the
source: stepping p in 0.000625 increments and watching `uLit`, the three fronts
depart at **p 0.4006 / 0.4231 / 0.4469**, against the restage's designed
0.4004 / 0.4228 / 0.4468. It is running.

### 2. What it feels like, in seconds

The honest test is not p, it is wall-clock at a speed a person actually scrolls.
Three rides driven by real `wheel` events through the shipped capture listeners,
timing every frame, `uLit` sampled per frame:

| ride | px/s | arrival wall-clock | hub 1→2 | hub 2→3 | one route's own quiet→lit lift |
|---|---|---|---|---|---|
| deliberate | 618 | **2.33 s** | **0.68 s** | **0.72 s** | 0.82 / 0.83 / 0.97 s |
| moderate | 1,659 | 0.89 s | 0.27 s | 0.29 s | 0.30 / 0.33 / 0.38 s |
| brisk | 3,851 | 0.40 s | 0.11 s | 0.13 s | 0.15 / 0.15 / 0.17 s |

At a deliberate scroll the three hubs land **two-thirds of a second apart**
across a **2.3 second** arrival, and each individual route takes **~0.85 s** to
come up from quiet to lit. That is one, two, three, and it is growth.

Set against what she describes — "really fast all at once" — the pre-restage
build is the exact match: all three routes departed the base on the same frame
at p 0.4335 and all three hubs kindled inside 0.0123 p, which at the same 618
px/s is **all three inside 0.34 s**, with no sequence in them at all.

Frames shot at p 0.400 / 0.414 / 0.427 / 0.440 / 0.455 / 0.470 / 0.487 confirm
it spatially: quiet web, one trail out to the near-left hub, that hub burning
while the second front runs right, two hubs lit while the third front runs to
the far edge, all three home. Each beat has its own frame.

### 3. So nothing was changed

Going slower still would have to be bought at the front — p 0.490 is a frozen
reference still and must be fully lit — and the only budget there is the lead
that makes the network read as **pre-existing** before a strand of it is lit.
That budget just got smaller for an unrelated reason (see below), and spending
it to fix a complaint the build already answers would trade a real property for
no gain.

**`connect@1440x900` and `connect@430x932` are 0.00/0.00 MAE. No connect file
was edited and no connect golden was re-shot.**

### One thing that DID move, from the other side

The same batch's Inspire re-framing (`07-chapter-inspire.md`, 2026-08-07 D21)
aims the Inspire rest 7.5 deg higher. This chapter's resolve is **camera-pure**
— `sm(GAZE_HI, GAZE_LO, forward.y)` — so a higher aim delays it:

| | shipped | after D21 |
|---|---|---|
| `group.visible` flips (landscape) | p 0.3256 | **p 0.3500** |
| fronts depart | 0.4006 / 0.4231 / 0.4469 | **identical** |
| lead: web drawn → first light | 0.075 p | **0.051 p** |
| resolve at the **portrait** Inspire rest | **0.2982** | **0.0000** |

The arrival schedule is p-pure and does not move at all. The lead narrows to
0.051, still well above the 0.035 this restage set as its own requirement, but
**this is now the binding constraint on ever starting the arrival earlier** and
anyone reaching for that budget should read this row first.

The last line is a fix, not a cost. This file's own header says the resolve is
"EXACTLY 0 at the hero pose and at the Inspire rest"; on the shipped build it
was **0.2982 at the portrait Inspire rest**, and only the arm gate
(`amount > 0.003`, p 0.32) kept the ground network off screen there. D21's pose
puts `forward.y` back to +0.0217 and the resolve back to exactly 0, restoring
the stated invariant in both orientations.

---

## 2026-08-07 (later) — a lot more gradual: the gradient, not the schedule

**The ask, verbatim.** *"Can you make the Connect the ecosystem entry animation
thing run a lot slower — meaning the way the ground lights up, that should
happen a lot more gradually."*

This is the **third** report on this timing. The section above
(`2026-08-07 — Hannah re-reports the rush`) measured the shipped build, found
`4146288` live and doing what it says, and concluded she had been riding an
older tree. She is now asking again *on the current tree*, so that conclusion
is spent: the shipped pace is simply still too fast for her, and the honest
reading of her sentence is that the complaint was never really about the
schedule. **"The way the ground lights up"** is a rate, not a duration.

### 1. The schedule is nearly out of road, and it is worth saying by how much

Both ends are pinned and the measurement says so exactly.

| bound | value | what sets it |
|---|---|---|
| far end | leg-t 0.487 (p 0.4871) | p 0.490 is the section's frozen reference still and must be fully lit |
| first draw | **p 0.3500** | the camera-pure resolve: `group.visible` needs `resolve > 0.0004`, and `forward.y` does not cross `GAZE_HI` before then |
| required lead | 0.035 of p | the restage's own requirement: the eye must read the web as PRE-EXISTING |
| ⇒ earliest start | **p 0.3850** | 0.3500 + 0.035 |

So the whole schedule can grow from 0.0868 to 0.1021 of p — **1.18x, and that
is all of it.** Confirmed against the clock rather than assumed: at a
deliberate 600 px/s the arrival runs at 0.0315 of p per second through this
stretch, so 0.1021 of p is 3.24 s and the shipped build already spent 2.69 s of
it. There was about half a second in the schedule, total.

Two ways of finding more were tried and rejected:

- **Raise `LIGHT_OVERLAP`.** It works arithmetically — a larger overlap packs
  the three windows into less p, so each may be longer — but it buys slower
  fronts by making the three routes more *simultaneous*, which is the rush the
  whole line of work exists to remove.
- **Move `GAZE_HI` so the network resolves earlier.** This is the only way to
  open the front of the budget, and it is not for sale: the margin it would
  spend is what keeps the resolve **exactly 0 at the portrait Inspire rest** —
  0.0426 of `forward.y` against a 0.0059 handheld wander, a protected frame,
  and a property `93723f0` had to restore. That commit is also why the lead is
  only 0.051 to begin with (it moved the first draw p 0.3256 → 0.3500).

Starting at p 0.3850 is safe, and for a reason more specific than the 0.035
rule. Shot at 1440x900 at p 0.370 / 0.380 / 0.385: the ground is
unambiguously a drawn web at all three, because the **hero's own root web is at
full brightness there and has been since p 0** — Connect's quiet routes are an
organisation of it, not a replacement for it, and they are themselves at 0.26
of resolve by 0.385. The first metres of ADOS's run are over exactly that
ground: the densest, longest-drawn part of the frame.

### 2. The gradient is where the change lives

    FRONT_SOFT   0.11 -> 0.32     the quiet->lit ramp trailing the head
    LIGHT_LO     0.0909 -> 0.022727 (leg-t)   p 0.4002 -> p 0.3850
    EASE_MIX     (new) 0.55       linear/smoothstep blend for the front's pace

`FRONT_SOFT` is the whole answer. It sets how long a **given patch of ground**
takes to come up from quiet to lit — which is precisely the thing her sentence
names — and unlike the schedule it has room. It is bounded above, but by
geometry rather than taste: `hubIgnite` opens each core over this same width,
and ADOS's hub sits only **0.42 along-units** from the base, so a wider ramp
would have the nearest core kindling on the frame its front departs. The kindle
therefore carries a floor (`max(along * 0.5, along - FRONT_SOFT)`), inert at
any ramp narrow enough not to need it and binding only on ADOS at 0.32.

`EASE_MIX` is free. Each front ran on a plain smoothstep, which peaks at 1.5x
its own mean speed halfway through and falls to zero at both ends — so the
arrival had a crawl-rush-crawl pulse whose *fastest* moment was the middle of a
run, which is exactly where the hub kindles and where the eye is. Blending 55%
smoothstep with 45% linear drops the peak to 1.275x and leaves the ends at
0.45x. Zero terminal velocity was not worth protecting: at t = 0 the head sits
at along 0 with nothing lifted behind it, and at t = 1 it is already past the
farthest tip. Both ends do their work through `FRONT_SOFT`. Fully linear was
tried and is worse — the departure grows a visible edge.

### 3. Measured

    p-WINDOWS            before                after
      ADOS depart        0.4002                0.3850
      ADOS saturate      0.4312                0.4233
      Hivemind depart    0.4225                0.4118
      Hivemind saturate  0.4560                0.4517
      Discord depart     0.4461                0.4394
      Discord saturate   0.4870                0.4871
      whole arrival      0.0868 of p           0.1021 of p     1.18x
      hub kindles        0.4141/0.4393/0.4695  0.4062/0.4271/0.4608
      core swell window  0.0025/0.0019/0.0017  0.0125/0.0040/0.0050  2.1-5.0x
      per-route reach    0.870/0.932/1.115     1.080/1.142/1.325

**The headline number is not in that table.** A strand's own quiet→lit lift:

| | before | after | |
|---|---|---|---|
| at the front's mean speed | 0.00392 of p | **0.01126** | **2.87x** |
| at its fastest moment | 0.00261 | **0.00890** | **3.41x** |
| in seconds, deliberate scroll | 0.12 s | **0.36 s** | |
| ...at the fastest moment | 0.082 s | **0.28 s** | |

A tenth of a second is a wipe. A third of a second is a thing you watch happen.

    WALL CLOCK        rate      arrival   hub 1->2  hub 2->3   per-route windows
      before      600 px/s      2.69 s     0.84 s    0.92 s    1.04 / 1.08 / 1.19 s
      after       600 px/s      3.26 s     0.87 s    1.04 s    1.30 / 1.28 / 1.42 s
      before     3600 px/s      0.46 s     0.13 s    0.17 s    0.18 / 0.18 / 0.19 s
      after      3600 px/s      0.55 s     0.17 s    0.13 s    0.21 / 0.22 / 0.23 s

Rides are real `wheel` events dispatched through the shipped capture listeners,
every frame timed, `uLit` and the three core opacities sampled per frame.

The kindle spread is essentially unchanged (0.0554 → 0.0546) and that is
correct, not a miss: the sequence was already right at 4.58x after `4146288`.
What changed is that each core now **swells** over 2–5x more p instead of
snapping on, which is the same complaint answered at the hub that
`FRONT_SOFT` answers on the ground.

### 4. Gates

1. **Reference stills byte-identical.** `capture.py --check`, all five poses ×
   both sizes: **worst MAE 0.00/255, 0.0% px >8. PASS.** Every golden,
   including `final`, at exactly 0.00 — this is a re-time of the approach, not
   of the frame it arrives at, and no golden was re-shot.
2. **Reverse mirrors exactly.** Continuous forward-then-backward scrub at
   400 px/s through real wheel events, every frame sampled, compared at matched
   p by interpolation:

   | size | max Δ`uLit` | max Δ core (arm fully open) | first drawn p fwd / rev |
   |---|---|---|---|
   | 1440x900 | 1.20e-3 | 5.50e-4 | 0.3465 / 0.3495 |
   | 1280x800 | 1.21e-3 | 3.62e-4 | 0.3472 / 0.3517 |
   | 375x812 | 2.61e-4 | 2.16e-4 | 0.3385 / 0.3388 |

   The residuals are linear-interpolation error between frames 3.4e-4 of p
   apart; `uLit` is pure in p and cannot hysterese. The first-drawn-p spread is
   the eased `amount` at the arm edge, which is shipped, documented behaviour
   (arming snaps, retiring eases).

   *For whoever measures this next:* two sampling traps here, both of which
   read as hysteresis and neither of which is. (a) Under `?nosnap=1` the legacy
   band-limited magnetism drags an unattended progress toward the nearest rest,
   so a value read in a second CDP round-trip is a **future** frame — pin p
   every frame and sample inside the pinned one. (b) The chapter's animator is
   registered **before** `journey`'s, so `uLit` is written from the `litR` that
   `drive()` computed on the *previous* frame; pairing it with this frame's p
   is a one-frame lag whose sign flips with direction and therefore shows up
   doubled. It cost 4.2e-2 of apparent hysteresis until the pairing was fixed.
   `18-one-species.md` §11.6 records the same trap from the other side.
3. **No self-ignition.** Across both scrub directions at all three sizes, no
   drawn frame below p 0.3840 carries any `uLit` above 1e-4. The web arrives as
   a quiet web at p 0.350 and nothing is lit for 0.035 of p after it.
4. **Rest fully lit at every size.** p 0.490 reads `uLit` [1, 1, 1] and all
   three cores at their 0.58 resting cap at 1440x900, 1280x800 and 375x812.
5. **Monotone, finite.** Zero non-monotonic steps in any `uLit` component
   across the arrival and zero non-finite values in `uLit` / `uHead` / core
   opacity, over every sweep and both scrub directions.
6. **Console clean.** `console.error` / `warn` / `onerror` /
   `unhandledrejection` trapped **before the app loads**, then a full
   0 → 1 → 0 ride: **929 frames, 0 entries.**
7. **Staging shot.** 1440x900 at p 0.3850 / 0.4000 / 0.4150 / 0.4300 / 0.4450 /
   0.4600 / 0.4750 / 0.4871. Quiet web; a soft glow growing out of the stipe
   base with no visible edge to it; ADOS's run lit and its hub burning while
   the second front leaves; two hubs lit and the third front out to the far
   right; all three home. Each beat still owns its own frame, and the 0.4150
   frame is the one that shows the change — a long soft gradient through the
   ground web rather than a bright line crossing it.

### Residuals

- **The schedule is now spent.** 0.1021 of p is the whole distance between the
  first draw plus its required lead and the frozen rest. Anyone asked to slow
  this again has `FRONT_SOFT` (bounded at ~0.42 by ADOS's own run, and already
  at 0.32) and nothing else, unless `GAZE_HI` or the p 0.490 rest moves — and
  the first of those costs a protected frame.
- The white head is quieter than it was (it is on screen longer but the same
  0.55 amplitude over a wider, dimmer ramp) and still blows out where it
  crosses a braid at a hub landing. Unchanged from `4146288`; the lever is
  still `uColHot`'s weight in the `tip` term.
- The hero-web dim rides `litAvg`, so it now begins at p 0.385 rather than
  0.400 and is gentler per unit p again. Same deliberate trade as before.

---

## 2026-08-10 — a third of the speed: the road the fourth pass said did not exist (Hannah's brief, item 2)

**The ask, verbatim.** *"When I go into the Connect ecosystem, the way the
light from the ground lights up — could you make that work a lot slower as
well, so it feels more dramatic? Right now it flashes up really quickly. It
should be at maybe a third of the current speed."*

FIFTH request on this pacing. The 2026-08-07 pass above ended with "the
schedule is now spent", and inside the old route it was: 0.1021 of p was the
entire distance between the camera-pure resolve's first draw (p 0.3500)
plus the 0.035 pre-existence lead and the frozen rest at p 0.490. This pass
was authorised to move the route, and the road comes from three places,
planned as ONE allocation with brief items 1 and 3 (EXECUTION.md
2026-08-10):

1. **The rest stop moves inside its own chapter** — route.js `stops [0.65]`,
   rest p 0.490 → 0.5230, the SAME approved pose (camera.js re-keys the
   hold to t 0.65; the dive keys keep their shipped poses on the same dive
   line, re-spaced t 0.77 / 0.91; owned/camera.js and every pose p ≥ 0.6225
   bit-identical, owned/leg.js's sampled range untouched). The arrival
   gains the 0.033 of p the dive never needed — in wall-clock the dive is
   still SLOWER than shipped (2.22x scroll gain against 1.43x p
   compression).
2. **scrollVh 4.5 → 10.0** — 2.22x wall-clock per unit p at any fixed
   scroll speed. Page 26.5 → 32.0 vh at this commit (item 3 adds Final's
   share separately).
3. **The one-movement approach gesture** (brief item 1, camera.js) hands
   the resolve its first draw at p 0.3510 landscape / 0.3360 portrait —
   measured on the built gesture, the gaze bow (PIN2 y 1.8, the mid stem)
   aiming the eye at the ground earlier than the old keyed exit did.

The window bounds re-derive by the SAME laws as every prior pass:
LIGHT_LO = first draw 0.3510 + 0.035 lead = p 0.3860 (leg-t 0.0273);
LIGHT_HI keeps the rest's 0.0029-p fully-lit margin = leg-t 0.637
(p 0.5201). FRONT_SOFT 0.32, EASE_MIX 0.55, LIGHT_OVERLAP 0.30, the
one-route-at-a-time staging, the kindle floor — all untouched. This is a
re-time, not a re-choreography.

### Measured (0.0015-p instrumented sweep, live page, frame-accurate)

    SCHEDULE               before (c77fb00)   after
      first drawn          p 0.3500           p 0.3530
      ADOS depart          0.3850             0.3875
      ADOS saturate        0.4233             0.4370
      Hivemind depart      0.4118             0.4220
      Hivemind saturate    0.4517             0.4730
      Discord depart       0.4394             0.4595
      Discord saturate     0.4871             0.5210
      whole arrival        0.1021 of p        0.1335 of p     1.31x
      hub kindles          0.4062/0.4271/     0.4055/0.4430/
                           0.4608             0.4850  (spread 0.0546 -> 0.0795)
      rest                 fully lit, cores 0.58, uLit [1,1,1] at p 0.5230
      light before lead    none (max uLit < 1e-4 below p 0.3855, both
                           directions, both aspects — sub-agent mirror gate)

    WALL-CLOCK at a deliberate 600 px/s (PCHIP surface arithmetic, which
    reproduces the fourth pass's own measured 3.26 s exactly)
      whole arrival        3.26 s             10.37 s         3.18x
      a patch's own lift   0.38 s             1.00 s          2.6x
      hub-to-hub           0.87 / 1.04 s      ~2.3 / ~2.5 s

    A live-wheel ride on this rig measured 6.3 s for the arrival — the
    commit-resolution assist (scroll.js carry) inflated by headless frame
    jitter spending gesture-peak floors; at 60 fps the assist's
    contribution at a steady deliberate rate is ~zero (the fourth pass's
    ride equalled its surface arithmetic on the same instrument class).

  So: the schedule is 3.2x slower end to end, each patch of ground takes
  ~2.6x longer to come up (the front is still bounded by the resolve +
  lead — a patch cannot slow past what the pre-existence law allows), the
  three hubs land one-two-three about 2.4 s apart at a deliberate scroll.

### Gates

- Mirror scrub p 0.30 → 0.545 → 0.30, 0.0025 steps, both aspects: max
  |Δ uLit| 4.0e-3, max |Δ core| 1.3e-2 (grid-pairing residual at the
  kindle knee, sub-visual), first-drawn p agrees fwd/rev, zero light below
  p 0.386 either direction. No self-ignition anywhere.
- Console: 0 errors / warnings / exceptions over full real-wheel rides
  both aspects.
- Rest compositions at 1440x900 / 1280x800 / 375x812: all three chips
  in-frame, clear of the copy block (min clearance 184 px), debugState at
  the rest: pose (7.943, 2.647, 4.256), fov 62, armed [connect], hotspots
  ados/hivemind/discord. Deep links #/connect, /discord, legacy /community
  and flyTo('connect') all land p 0.5230 with correct detail.
- References: `capture.py --check` at this tree — all ten goldens within
  the frozen gate (worst MAE 0.01, the known wobble class): the rest's
  frame at its NEW p reproduces the approved composition pixel-for-pixel.
  The connect pair re-shot deliberately in this commit with manifest
  provenance for the rest-p move (bytes equivalent; the pose did not
  change, its address did).

### Residuals

- The whole-arrival slowdown is 3.2x against the asked "about a third";
  the per-patch lift is 2.6x — its front is pinned by the pre-existence
  lead, which is not for sale (the fourth pass's reasoning stands).
- The commit-assist can compress the felt arrival for a visitor who keeps
  a momentum stream running across the whole window; the floor is the
  gesture's own peak, so a genuinely deliberate reader is unaffected.
- The hero-web dim still rides litAvg and now begins at p 0.386.

---

## 2026-08-11 — ADOS last: the finale is the node the chapter is about

**The ask, verbatim.** *"In Connect the community, the ADOS item and line
seems to come in right away, but it should be sequenced after the other two.
Talking about the light line and dot."*

Sixth request on this arrival, and the first one about ORDER rather than
pace. `4146288` chose nearest → farthest (ADOS, Hivemind, Discord) and
defended it three ways; two of those defences survive this pass and one does
not.

### The order shipped: HIVEMIND → DISCORD → ADOS

Not Discord → Hivemind → ADOS, which is the other order ending on ADOS.
That one is monotone far-to-near, and `4146288`'s third argument still
stands: this chapter already owns that gesture and means drainage by it
(`uExit` converges the network's light back INTO the root as the camera walks
to the trunk on the Connect→Owned dive), so a monotone inward arrival is the
exit played forwards and the two would blur across the dive. Hivemind →
Discord → ADOS is monotone in neither direction, so it cannot be confused
with the exit at all. Every front still departs the stipe base and runs
OUTWARD along its own route; only which hub is next changed.

What it reads as: the chapter is *Connect the community*. The wider community
lights first — Hivemind mid-frame, then Discord at the far door — and the
last thing the light reaches is ADOS, the event itself, nearest the eye and
the largest of the three on screen. Rest pose at 1440x900 the three hubs sit
at Hivemind (887, 585) → Discord (1209, 711) → ADOS (262, 788): out to the
middle, out to the far right, then home to the near one. The finale lands
where the eye ends up.

`4146288`'s argument 1 (growth outward from the base) is spent by the ask
itself. Argument 2 (the order matches `NODE_IDS`/tab/chip order) is answered
below rather than obeyed.

### The schedule is NOT rebalanced, and that is measured

The order is the only edit. `LIGHT_LO` / `LIGHT_HI` / `LIGHT_OVERLAP`,
duration ∝ reach (one head speed), `FRONT_SOFT`, `EASE_MIX` and the kindle
floor are all untouched. `LIT_WIN` is now built in `LIGHT_ORDER` and indexed
back out by route, so `drive(p)` and everything downstream are unchanged and
still pure in p.

Because the LAST window's reach enters the normaliser undiscounted and ADOS's
is the smallest of the three, putting it last makes `k` slightly larger — so
all three windows come out a shade LONGER than shipped. Nothing in this
chapter got faster, which after five rounds of "slower" is the property worth
protecting above everything else here.

**A finale duration weight was built and measured, then rejected.** In p,
ADOS's approach (depart → dot full) is the shortest of the three, because its
hub sits at 0.42 of a 0.75-unit reach (56% of its own run) against Discord's
0.70 of 1.00 (71%). A per-route weight fixes the hub rhythm — gaps 0.0456 /
0.0321 of p at weight 1.00, 0.0409 / 0.0331 at 1.30, 0.0377 / 0.0338 at 1.55
— but it can only lengthen the finale by taking p from the other two, and at
1.55 Hivemind's window falls 17% and Discord's 15% BELOW their shipped
lengths. Two of three routes made materially faster to buy a rhythm nicety on
the third, here of all places. Rejected.

It was not needed, for two measured reasons:

1. **p is not what a visitor feels; scroll px are.** The Connect leg's PCHIP
   allocation is not uniform and the finale slot sits in a costlier stretch.
   On the surface spline at a deliberate 600 px/s, ADOS's 0.0207 p approach
   is **1.80 s** — against Hivemind's 1.65 s and Discord's 2.92 s, i.e. the
   middle of the three, and **1.45x longer than ADOS's own approach was as
   the shipped opener** (1.24 s). Moving ADOS last BOUGHT it its reading
   time; it did not cost any.
2. **The rhythm is the shipped rhythm, mirrored.** Hub-to-hub in wall-clock:
   3.55 s / 2.82 s against the shipped 3.11 s / 3.93 s — the same 1.26
   ratio, closing in rather than opening out. The shipped arrival widened
   toward the far door; this one tightens toward home.

The finale's other gain is free: its run-out plays NEAR THE CAMERA. Every
window ends with the front running past its hub into the continuations, and
the last route's tail is the only one no following route covers — 2.41 s here
against Discord's 2.16 s as the shipped finale, so barely longer. But
Discord's tail ran out at the far right, small and distant, while ADOS's runs
out bottom-left across the nearest, largest ground in the frame. The arrival
now ENDS on its most legible motion.

### The kindle floor: re-checked, kept

`c77fb00` added the floor `max(along*0.5, along - FRONT_SOFT)` because at
`FRONT_SOFT` 0.32 ADOS's hub (along 0.42) would otherwise kindle on the frame
its front departed. It exists for ADOS specifically, so it was re-checked in
the finale slot. It still binds only on ADOS (0.21 against `along - 0.32` =
0.10), and it still does its job: ADOS's core reads **exactly zero for the
first 24% of its window** — 0.0126 of p, ~1.10 s at a deliberate scroll —
then swells to full over the following 0.0082 p as the front lands. On screen
at 1440x900: p 0.4740 front visibly running down-left with no dot; p 0.4805
core 0.057; p 0.4850 core 0.452; p 0.4890 core 0.58.

### The chips do NOT follow — deliberate

`NODE_IDS` stays `[ados, hivemind, discord]`: the chip stagger order, the
roving tab order, the deep-link order. They are a different medium answering
a different question. The chips are the RESTING composition's labels, gated
on the copy (measured: they arrive p 0.516 → 0.523, after the light is home)
and staggered `HOTSPOT_STAGGER_MS` = 150 ms apart, so all three are up inside
300 ms — a garnish, not a competing sequence. Their order is IMPORTANCE
(ADOS is the event this page exists for, and it must lead the tab order for
a11y); the light's order is geography and cadence. Read together they hand
off rather than contradict: the last hub the light reaches is the first one
the page names.

### The timing table (measured, 0.0015-p instrumented sweep, live page)

Scroll progress; kindle is the hub core's own swell (0 → full). Wall-clock
from the PCHIP surface spline at a deliberate 600 px/s — the same arithmetic
that reproduces the 2026-08-10 pass's 10.37 s (this instrument reads 10.42 s
for the same shipped span).

    BEFORE (0b7ce1c)      depart   dot 0%   dot 100%   saturate   window
      1  ADOS             0.3855   0.3979   0.4056     0.4365     0.0509
      2  Hivemind         0.4200   0.4368   0.4465     0.4755     0.0555
      3  Discord          0.4577   0.4806   0.4917     0.5203     0.0627
      hub-to-hub (p)              0.0400 / 0.0444   (opens out 1.11x)
      hub-to-hub (s)              3.11 / 3.93       (opens out 1.26x)
      ADOS depart -> dot          0.0201 p  =  1.24 s

    AFTER                 depart   dot 0%   dot 100%   saturate   window
      1  Hivemind         0.3860   0.4019   0.4120     0.4410     0.0550
      2  Discord          0.4231   0.4471   0.4584     0.4886     0.0655
      3  ADOS             0.4680   0.4805   0.4887     0.5203     0.0523
      hub-to-hub (p)              0.0456 / 0.0321   (closes in 1.42x)
      hub-to-hub (s)              3.55 / 2.82       (closes in 1.26x)
      ADOS depart -> dot          0.0207 p  =  1.80 s   (1.45x)

    whole arrival   p 0.3860 -> 0.5203 in both, 10.4 s at 600 px/s —
                    LIGHT_LO/LIGHT_HI did not move; only the interior
                    re-sequenced. Per-route reach (uLitMax) unchanged at
                    1.0796 / 1.1418 / 1.3250.

Departures/dots in wall-clock, the six beats of the arrival, after:
Hivemind departs 0 s, dot at 1.65 s; Discord departs 2.45 s, dot at 5.36 s;
ADOS departs 6.21 s, dot at 8.01 s; last tip home at 10.42 s.

### Gates

1. **Mirror scrub, both directions.** p 0.300 → 0.545 → 0.300, 0.0025 steps,
   p pinned per frame, 1440x900: over every drawn sample **max |Δ uLit|
   1.2e-3, max |Δ hubIgnite| 3.7e-3** (the grid-pairing residual at the
   kindle knee, sub-visual, and tighter than `c77fb00`'s own 4.0e-3 /
   1.3e-2). No self-ignition: **max uLit below p 0.3855 is exactly 0** in
   both directions. Two samples disagree on `group.visible` at the far edge
   of the retire tail (p 0.3500); that is the eased arming `amount`
   (0.00103 against the 0.003 draw gate), it **reproduces identically on the
   untouched tree** (verified by stashing this change and re-running the
   same probe), and it is not the light.
2. **Rest fully lit at every size.** p 0.5230 reads `uLit` [1, 1, 1] and all
   three cores at their 0.58 resting cap at **1440x900, 1280x800 and
   375x812**.
3. **Console clean.** console.error / warn / onerror / unhandledrejection
   hooked across a full 0 → 1 → 0 ride at all three sizes: **0 entries**.
4. **Screenshot sequence, 1440x900** (p / uLit / cores):
   0.4200 [0, .69, 0] / [0, .47, 0] — Hivemind only;
   0.4620 [0, 1, .70] / [0, .58, .58] — Hivemind and Discord home, ADOS dark;
   0.4740 [.08, 1, .85] / [0, .58, .58] — ADOS's light visibly travelling,
   no dot; 0.4850 [.31, 1, .99] / [.45, .58, .58] — the dot kindling;
   0.4890 [.39, 1, 1] / [.58, .58, .58] — full; 0.5230 [1, 1, 1].
5. **References.** `capture.py --check`, all five poses x both sizes:
   **connect@1440x900 and connect@430x932 both MAE 0.00/255, 0.0% px >8** —
   byte-equivalent, which is the point (the rest is fully lit either way).
   Worst across the whole list 0.02 (owned, the known determinism wobble)
   against warn 0.50 / fail 1.00. **PASS.** No golden re-shot.

### Residuals

- The hub rhythm now closes in (1.42x in p) where it used to open out
  (1.11x). In wall-clock the two are the same 1.26 ratio in opposite
  directions, so this is a cadence rather than a defect — but it is the one
  thing a future pass might want to even, and the lever (a per-route
  duration weight) is measured above along with its price.
- ADOS's tail is 2.41 s of light running out past the last dot with no other
  event in the frame. That is 0.25 s longer than the shipped finale's and it
  plays much nearer the camera, but it is still the quietest stretch of the
  arrival.
- Everything `c77fb00` and the 2026-08-10 pass left standing stands: the
  per-patch lift is still bounded by the pre-existence lead, the hero-web dim
  still rides `litAvg` from p 0.386, and the commit-resolution assist can
  still compress the felt arrival for a visitor holding a momentum stream.

## 2026-08-11 — The hub cores stop answering the clock (held-still markers pass)

Hannah: the node dots "pulse ... but they should stay STABLE in the one
place". Measured at the Connect rest (16 s sprite-level trace, 961
samples): all three hub cores held POSITION at the 0.65 x 0.62 px
camera-only floor — their anchors were always static — but the ambient
route pulse landed ON the dot as a flare: opacity 0.58 -> 1.00 (**69%
swing**) and scale x1.22, decaying over ~2 s, every 9-14 s per route.

The flare is removed at the core (`P.flare` bookkeeping deleted; the core
line is now `0.58 + 0.4 * hover`, scale `1 + 0.18 * hover`). What stays:

- the travelling pulse itself (uPulseHead/uPulseAmp) — the light still
  runs the route every 9-14 s, and on hover; the life lives in the strand,
  the destination holds;
- the hover lift and swell — the visitor's own hand, not an ambient clock;
- the kindle (hubIgnite) — reveal choreography, pure in progress, exactly
  1 at the rest.

After (12 s, 721 samples): opacity swing **0.00%**, scale constant,
position at the floor. The frozen goldens never saw the flare (drivers
are clock-gated and dt = 0 never fires them), so connect@* are untouched
byte-for-byte — `--check` MAE 0.00.

## 2026-08-11 — A little faster to Connect, and the ground lighting does not pay for it (Hannah's brief, item 2)

**The ask, verbatim.** *"Make the speed of the transition from Connect to
Inspire be a little bit faster too."*

She named it backwards, so both directions were established first, then
both were measured — the direction the words point is not always the
direction the complaint lives in, and `043d66d` is the reason to check.

### The leg, and why only part of it is available

The travel is the Inspire rest (p 0.26) to the Connect rest (p 0.5230),
and on the shipped tree it cost **11.31 vh** — the longest single stretch
on the route. Two passes ago it was deliberately made that long: the
ground-lighting arrival was slowed ~3.2x across `c77fb00` and `0701653`,
half of it bought by Connect's `scrollVh` 4.5 → 10.0. Trimming the leg
and keeping that slowdown are only in conflict if the leg is treated as
one thing. It is not. Measured in scroll, at 900 px of viewport:

| stretch | p | shipped | what is on screen |
|---|---|---|---|
| head | 0.2600 → 0.3510 | **2.97 vh** | pure travel — the network is not drawn yet |
| lead | 0.3510 → 0.3860 | **1.27 vh** | the network draws itself in (the pre-existence lead) |
| light | 0.3860 → 0.5201 | **6.94 vh** | LIGHT_LO → LIGHT_HI: the arrival Hannah slowed |
| settle | 0.5201 → 0.5230 | 0.13 vh | the fully-lit margin into the rest |

61% of the leg is the thing that must not move. The trim comes from the
other 39%, and from the head first.

### What changed — one number in the route, plus a declared split

Nothing in this chapter's own files moved: no camera key, no LIGHT_LO /
LIGHT_HI, no FRONT_SOFT, no schedule, no p-value anywhere on the route.
The whole item is `journey/route.js`:

- **Inspire `scrollVh` 7.5 → 5.6, declared as `segVh: [3.5, 2.1]`.** The
  chapter's stop (its rest, p 0.26) now splits its allocation, so the trim
  can be taken from the tail alone. Seg 0 — the Mission → Inspire arrival,
  which nobody asked about — holds 3.5 vh unchanged. Seg 1 goes 4.01 → 2.1.
- **Connect `scrollVh` 10.0 → 10.15, declared as `segVh: [7.30, 2.85]`.**
  The total barely moves; the split is what matters. Trimming Inspire's
  tail steepens the tangent at this chapter's opening knot, and left
  inferred it would have quietly moved road out of the ground lighting and
  into the dive. Declaring it holds seg 0 at the 7.30 vh the shipped
  spline gave it.

(The mechanism itself — `segVh`, and the sub-segment knots it puts in the
scroll spline — is described in route.js and in 18-one-species.md §17,
which is the other half of the same allocation.)

### Measured — road, both directions

Scroll cost is direction-symmetric by construction (one spline), and the
screen-motion-per-scroll-pixel profile is a pure function of p, so the
ROAD is identical forwards and backwards. Re-verified: optical flow across
the leg runs 0.026 → 0.247 → 0.002 screen-px per scroll-px, the same curve
either way, mean 0.0659.

| stretch | before | after | |
|---|---|---|---|
| whole travel | 11.31 vh | **9.40 vh** | **0.83x — 17% faster** |
| head | 2.97 | 1.52 | 0.51x |
| lead | 1.27 | 0.74 | 0.59x |
| **light (LIGHT_LO→HI)** | **6.94** | **7.01** | **1.011x — kept** |
| Mission → Inspire | 6.99 | 7.00 | 1.001x — untouched |
| Connect → Owned dive | 5.15 | 5.12 | 0.993x — untouched |

At a deliberate 1 vh/s the ride to Connect is 11.31 s → 9.40 s.

### Measured — real gestures, both directions

Identical mirrored gestures (70 px deltas, 180 ms drive + a decaying
momentum tail, dispatched on the input clock through the live capture
listeners; headless rig, so these are valid as BEFORE/AFTER pairs on one
rig, not as absolute seconds — the D29 cadence caveat).

| leg | before fwd | before back | after fwd | after back |
|---|---|---|---|---|
| **inspire ↔ connect** | 3.17 s | 3.30 s | **2.50 s** | **2.90 s** |
| mission ↔ inspire | 2.37 | 2.46 | 2.37 | 2.53 |
| connect ↔ owned | 1.97 | 1.84 | 1.97 | 1.83 |
| owned ↔ final | 2.73 | 3.20 | 2.87 | 3.60 |

Both directions of the asked-about leg got faster, so the answer does not
depend on which one she meant.

### The `043d66d` class of asymmetry is absent here — checked, not assumed

That commit's fault was structural: gesture strength was denominated in p
at the LOCAL spline slope, so the identical finger measured 9x weaker
leaving the Final rest backward, fell under the flick-carry floor, and the
backward ride never arrived at all. Tested on this leg:

- `gesturePeakPx` for the mirrored gestures: **3850.6 forward / 3778.8
  backward** — 1.9% apart, i.e. one finger, one answer. (The p-denominated
  number that caused `043d66d` would have differed by the ratio of the
  span's end slopes, which here is 2.4x.)
- Every gesture ARRIVES in both directions, at every rest, in both the
  before and after runs. No "never arrives", no against-motion glide back.
- `COMMIT_THRESHOLD` is a fraction of the span's SCROLL distance since
  `043d66d`, so both directions pay 35% of the same road; scrollgates R3b
  shows the notch reader stepping and returning cleanly.

### Residual, honestly

The two directions are not equal: 2.50 s forward against 2.90 s backward
(repeat runs 2.50/2.53/2.70 and 2.90/2.87/2.90, so the 0.3 s is real and
not rig noise). It is not the `043d66d` fault — it is the leg's own gain
profile, mirrored. The Inspire end of this span is now ~2.4x steeper in p
per scroll pixel than the Connect end (the ground-lighting deceleration is
what makes the Connect end flat, and it is deliberate), so the same
gesture converts to more p when it starts at the Inspire end. Forward
therefore spends more of the span inside the gesture and less on the
cruise. The shipped tree had the same asymmetry in the same direction at
4%; the trim raised it to 12% by steepening the Inspire end further.

This is the same class §16 explicitly declined to equalise on the
Final ↔ Owned span ("the camera easing OUT of the rest it eased into"),
and the lever if it ever matters is the Inspire split ratio — moving
`segVh` toward `[3.2, 2.4]` flattens it, at the cost of speeding up the
Mission → Inspire arrival that nobody asked about.

### Gates

- `capture.py --check`: PASS, all ten goldens, worst MAE 0.02/255 (the
  known owned wobble class). No reference moved — this change touches no
  rendering path and no p-value.
- Connect rest composed at 1440x900, 1280x800 and 375x812: all three land
  at p 0.5230 exactly, network fully lit, all three markers present in
  `6afd508`'s order, copy placed.
- Mirror scrub p 0.26 → 0.5230 → 0.26 through the `?capture` freeze,
  13 matched samples: worst MAE **0.0232/255**, and 0.0000 across the
  whole ground-lighting stretch. Exact mirroring.
- `tools/scrollgates.js`, default and `?nosnap=1`: every invariant at or
  better than the shipped tree's own output (E2/E3 1.0000, nosnap E1
  -5.6e-17, R1 exact return, R4 overshoot 0, R5 end-hold holds, R6 visits
  every anchor and parks nowhere else).
- Full real-wheel ride 0 → 1 → 0 (1034 frames) plus all five nav jumps:
  console **0 errors, 0 warnings**.

## 2026-08-12 — The rest is rebalanced: the ground comes up, the cap goes out

Hannah: *"The area below the 'Connected Community' text feels empty and the
composition is unbalanced. Fix by moving the mushroom further out of frame,
lowering the camera, or both. No prescribed values. Use visual judgment:
render it, look at it, adjust until the frame feels balanced, and iterate."*

She is describing one hole, and it is measurable. At 1440x900 the copy block
ends at y 303 and the first ground content inside the copy's own x-span
(757..1365) does not appear until y 557 — **254 px, 28.2% of the frame
height, of nothing at all**, directly under the words. The frame read as three
bands with a gap in the middle of the interesting one: bright organism upper
left, copy upper right, network fan across the bottom, and a void between the
copy and the fan.

### What the two levers actually do, measured

Both of her levers move the same thing, and only one of them moves it the way
the complaint needs.

**The aim is what fills the void.** Dropping the gaze target walks the whole
world UP the frame — the ground's far edge rises toward the copy and the cap
leaves through the top, which is her "further out of frame" and her "empty
area" in one gesture. Measured at 1440x900, eye held at the shipped 2.647:

| tgt.y | 1.028 (shipped) | 0.30 | -0.30 | -0.70 | -1.00 | -1.30 | -1.60 |
|---|---|---|---|---|---|---|---|
| void under copy | **254 px** | 203 | 162 | 137 | 115 | 97 | 76 |
| widest ribbon | 6.5 px | 7.6 | **15.0** | 14.5 | 14.2 | 13.9 | 13.6 |

**The eye height is what keeps it clean**, and that is the surprise in the
table above. Past about tgt.y -0.3 two of the organism's own ROOT RIBBONS
(organism.js §8) walk into the bottom-left corner at 14-15 screen px wide and
read as flat opaque planks laid on the network — nothing like the drawn web
around them. That is not this pose's bug. `nearFade(z)` tapers those ribbons
as a function of world z alone, authored for the HERO camera, which sits on
+Z; its own comment says the point is that "ribbons thin out near the camera
so they never project as wide bars". This chapter's camera stands at x 7.9,
off that axis, so it can stand close to a ribbon the fade thinks is far away.
Fixing `nearFade` would move the hero's own ground and every protected frame
with it, so the pose has to avoid the ribbons instead — and lowering the EYE
is what does that, by seeing the near ground at a grazing angle:

| eye y, at tgt.y -0.7 | 1.80 | **2.00** | 2.15 | 2.30 | 2.647 (shipped) | 3.20 | 3.70 |
|---|---|---|---|---|---|---|---|
| widest ribbon | 7.4 px | **7.6** | 7.7 | 7.8 | 14.5 | 13.2 | 10.0 |
| ribbons ≥ 10 px | 0 | **0** | 0 | 0 | 2 | 2 | 1 |
| void under copy | 118 px | **121** | 125 | 127 | 137 | 149 | 161 |
| under-copy fill | 0.115 | **0.112** | 0.102 | 0.097 | 0.093 | 0.087 | 0.083 |

Pulling the camera BACK instead (radius x1.15 / x1.30) also clears the
ribbons, but it shrinks everything: under-copy fill falls to 0.080 / 0.060 and
mean frame luminance to 32.3 / 28.4 against the shipped 38.0. It buys the
clean corner by emptying the frame, which is the complaint again.

### Shipped

```
eye  (7.943, 2.647, 4.256) -> (7.943, 2.0,  4.256)     pitch -8.91 -> -14.65 deg
aim  (1.827, 1.028, -4.067) -> (1.827, -0.7, -4.067)
fov  62 -> 62 (untouched)
```

| 1440x900 | before | after | |
|---|---|---|---|
| void under the copy | 254 px | **121 px** | 28.2% -> 13.4% of frame height |
| under-copy lit fill | 0.095 | **0.112** | more network in the band, not just a slid frame |
| luminance centroid y | 0.452 | **0.422** | |
| widest root ribbon | 6.5 px | 7.6 px | 0 over 10 px, before and after |

The eye now sits at exactly `INSPIRE.y`, so the gesture's HEIGHT channel is a
constant: the leg is a swing, a close and a gaze that walks down. The lowering
Hannah asked for is real but it is delivered against the PREVIOUS rest
(2.647 -> 2.0), not by moving the eye mid-gesture.

### Rejected

- **Trucking the aim right** (tgt.x 1.827 -> 3.4 / 5.0) to push the mushroom
  further out sideways. It closes the void further (112 / 107 px) but empties
  the band it exists to fill — under-copy fill 0.084 / 0.068 — because the
  frame pans onto the sparse far side, and it drags the luminance centroid
  LEFT (0.414 -> 0.386 / 0.380). It makes the left-heaviness worse, which is
  the actual complaint.
- **fov 68** — reopens the wide-ribbon corner. **fov 56** — neutral on every
  metric. fov stays 62.
- **Aiming to -1.3 / -1.6 with the low eye.** Closes the void to 97 / 76 px,
  but the cap is cut below its own rim and the hub fan compresses toward the
  horizon: the chips' vertical spread falls and the "three hubs fanned through
  the open diagonal" that this chapter was staged around stops reading. -0.7
  is the deepest aim that keeps the fan.

### The pre-existence lead had to be bought back

Lowering the eye made the camera LESS pitched down through the middle of the
leg (the same gaze bow aimed from lower is a shallower look), so the
camera-pure resolve's first draw moved LATER — 0.3514 -> 0.3547 — and the lead
between the first draw and `LIGHT_LO` fell to **0.0313**, under the restage's
0.035 floor. Two ways out, and only one of them is allowed:

- move `LIGHT_LO` to 0.3897. Restores the lead by making the whole ground
  arrival **2.7% faster**. After five separate requests for "slower", this is
  the one direction the chapter may never move. Rejected outright.
- move `PIN2`, the gaze bezier's bow control point, which shifts the resolve
  without touching either endpoint, the schedule, or any channel's ease.

`PIN2.y` 1.8 -> **1.65**:

| PIN2.y | 1.80 | **1.65** | 1.50 | 1.35 | 1.20 |
|---|---|---|---|---|---|
| first draw p | 0.3547 | **0.3488** | 0.3435 | 0.3389 | 0.3343 |
| lead vs LIGHT_LO 0.3860 | 0.0313 | **0.0372** | 0.0425 | 0.0471 | 0.0517 |

1.65 is the shallowest that clears the floor with margin, and it also clears
the shipped tree's own 0.0346. `LIGHT_LO`, `LIGHT_HI`, `LIGHT_OVERLAP`,
`FRONT_SOFT`, `EASE_MIX` and `LIGHT_ORDER` are all untouched — the arrival is
the same length, the same order and the same per-patch gradient it was.

| | before | after |
|---|---|---|
| first draw, landscape | p 0.3514 | p 0.3488 |
| lead, landscape | 0.0346 | **0.0372** |
| first draw, portrait | p 0.3382 | p 0.3376 |
| lead, portrait | 0.0478 | **0.0484** |
| arm (p 0.32) margin in fwd.y, landscape | 0.0324 | **0.0345** |
| arm (p 0.32) margin in fwd.y, portrait | 0.0133 | **0.0154** |

The arm margins went UP in both orientations, for the same reason the lead
went down: the mid-leg look is shallower. So the D16 hazard the arm window
guards against — `amount` is eased in TIME, so a first draw creeping back to
the arm edge would turn arming into a visible fade — got further away, not
closer.

### D16, re-measured on the protected frames

`resolve` is **exactly 0.000000** at the hero pose (p 0) and at the Inspire
rest (p 0.26) in BOTH orientations, and `group.visible` is false at every
sample up to and including the arm edge. Landscape holds fwd.y +0.0136 at
p 0.32 against a -0.0209 threshold; portrait holds -0.0055, i.e. 0.0154 of
margin against the handheld layer's whole 0.0059 peak wander.

### The gesture is still one motion

`approach()` was audited channel by channel against the shipped one, 2000
samples:

| | before | after |
|---|---|---|
| subject distance | 8.4253 -> 10.4546 | 8.4253 -> **10.6756** |
| worst against-step in it | -3.09e-05 | **-2.48e-05** |
| composed frame angle d | -0.095 -> -25.507 | **unchanged** |
| speed peak / mean | 1.297 | **1.297** |
| fov rate peak | 26.8 deg/u | **26.8 deg/u** |
| yaw rate peak | 101.3 deg/u | **101.3 deg/u** |

Every channel still rides the one shared trapezoid, so the shape of the move
is not merely similar, it is the same function with a different endpoint. The
only against-steps in the subject distance are the orbit-breath ripple, and
they are SMALLER than the shipped gesture's own. On the live path: yaw peak
389.5 deg/p (was 389.7), position peak 47.51 u/p (was 47.60), roll exactly 0.

### Chip clearances, all three sizes

Nothing collides and nothing comes close to colliding. The chips ride UP with
the ground, so their distance to the copy shrinks and their distance to the
bottom edge grows — ADOS in particular was 101 px off the bottom edge at
1440x900 and is now 285.

| | 1440x900 | 1280x800 | 375x812 |
|---|---|---|---|
| chip↔chip, min | 239 -> **228** | 202 -> **191** | 21 -> **20** |
| chip↔copy, min | 271 -> **133** | 226 -> **103** | 184 -> **125** |
| ADOS bottom-edge | 101 -> **285** | 88 -> **252** | 215 -> **275** |

375x812 is portrait, where the offset field dominates and the composition is
almost unchanged; its 20 px ADOS↔Discord gap is the shipped tree's own 21 and
is not a product of this change.

### The dive out of the rest, and the pin it moved

`owned/camera.js` derives the dive's `u = 0` endpoint from THIS key, so
dropping the eye shortened the dive's whole sink (D0.y 2.647 -> 2.0 against
the same D1.y -1.18). The same `easeY` therefore reaches y = 0 earlier and the
**soil crossing moved p 0.69318 -> 0.68805**. The T3 murk is pure in p and was
pinned to that crossing; left alone, the camera entered the soil at 90.9% of
the murk's depth and the swallow then peaked after it was already under.

Fixed at the registration, not at the arc: `SEAM_FOG_DIPS` T3 centre
`startOf('owned') + 0.093 -> + 0.088`. The murk peak is back ON the crossing
(fog.far 9.601 at both, 100% of peak depth), and `easeY` — which carries the
one continuous arc `86883b9` rebuilt the dive for — is untouched. No rest
anchor sits inside either fog band, so the fog at every reference frame is
identical.

Dive leg after the re-pin: yaw peak 445.4 deg/p (unchanged), pitch peak 473.4
-> 344.6, position peak 69.20 -> 65.81 u/p, roll 0, fog at the rest [7, 20]
exactly as before. Everything at p >= 0.725 is bit-identical — the Owned rest
key never moved.

### owned@* moved too, and that is `leg.js` doing what it says

`owned/leg.js` builds the chapter's colony against the camera polyline it
actually travels, sampled over p 0.660..0.872, and warns in as many words: *"If
a future edit moves either travel key, this range samples a changed approach
and the colony placement moves with it — re-measure before assuming."*
Re-measured: max camera drift over that range is **0.4275 units at p 0.6604**,
decaying to exactly 0 at the rest and 0 everywhere past it. The colony shifts
with it, which shows up as `owned@1440x900` MAE 0.32/255 and
`owned@430x932` 0.40/255 against the old goldens — an 8x-amplified diff is
nothing but fine hyphae and cords moving a pixel. Both are re-shot in this
commit alongside `connect@*`.

### Gates

- **`capture.py --check`: PASS**, worst MAE 0.01/255 across all ten goldens
  after the re-shoot. Before the re-shoot it read exactly the two intended
  families and nothing else: connect 20.93 / 11.38, owned 0.32 / 0.40,
  mission and inspire 0.00, final 0.01. `final@*` and `inspire@430x932` were
  rewritten by the full-set shoot at MAE 0.0000-0.0148 (a 1x1-pixel bbox on
  inspire) and have been restored to HEAD, so this commit's PNG diff is
  exactly connect@* + owned@*.
- **Mirror scrub, both directions.** Inspire→Connect at 1440x900, 17 matched
  pairs: worst MAE **0.0000/255**, max channel difference **0**. Same leg at
  375x812, 13 pairs: **0.0000**. Connect→Owned dive, 15 pairs: worst 0.0130 —
  and the shipped tree measures 0.0142 on the same two frames at the Connect
  end of that leg, so the residual is pre-existing and slightly smaller now.
  No self-ignition anywhere.
- **Root ribbons across the whole leg**, not just the rest: widest ribbon in
  frame 8.1 px at the Inspire end falling to 7.6 at the rest, against the
  shipped leg's identical 8.1 -> 6.5. **Zero** ribbons over 10 px at any p, in
  either tree.
- **`tools/scrollgates.js`**, default: E2/E3 1.0000, R1 settles 0.260000,
  R4 overshoot 4.00e-6, R5 end-hold 1.000000, R6 rides 0.26/0.523/0.725/0.97/1
  up and back with **no off-anchor stops**. With `?nosnap=1`: E1 **0.00e+0**.
- **Console over a full ride**: 1420 frames of real wheel 0 -> 1 -> 0 plus all
  five nav jumps (each landing on its own rest): **0 errors, 0 warnings**.
