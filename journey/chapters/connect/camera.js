// chapters/connect/camera.js — CONNECT's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// GROUND RESTAGE (16-connect-ground-restage.md §5): the leg no longer slips
// under the rim into the gill chamber. Re-keyed 2026-08-04 (Hannah: the
// Inspire->Connect travel must read as ONE monotonic zoom-out): from
// inspire/camera.js's last key (p 0.362: pos (8.55, 2.95, 2.85), tgt
// (0.95, 2.9, -0.9), fov 44) the camera keeps receding and sinking OUTSIDE
// the rim — camera-to-subject distance and fov only ever grow from the
// Inspire rest to the Connect rest, no re-approach anywhere — while the
// gaze slides off the cap down the stem to the base and out across the
// ground as the network starts to grow. The exit follows the tendrils home
// toward the trunk, ending near owned/camera.js's entry — the cleanest
// narrative joint in the ride: after watching the surface network, the
// camera follows it to the root and dives underground.
//
// TOP-LEFT / TOP-RIGHT RESTAGE (2026-08-04, Hannah: "the TEXT goes in the
// TOP RIGHT and the MUSHROOM in the TOP LEFT, with the three anchor points
// positioned throughout the sensible gap between"). The rest frame is
// re-composed, not re-invented: the camera keeps the SAME straight dive
// line toward the trunk (see the exit note below) but slides 0.38 world
// units further back along it, drops its gaze ~4.5 deg and swings the aim
// ~12 deg to camera-right while the fov opens 56 -> 62. Consequences at the
// rest, measured at 1440x900: the whole mushroom (cap + stem + base) lands
// in the frame's upper-left (box x 31..573, y 26..467 — left 40%, top 52%),
// the horizon rises to y ~237 so the ground plane owns the lower two-thirds,
// and the open diagonal band from the lower-left to the mid-right — the gap
// between the mushroom and the top-right copy block — is all ground for the
// three hubs to sit in (tendrils.js HUBS).
//
// EYE RAISED (2026-08-05, Hannah: "in connect the ecosystem, can you push the
// camera up a bit, so that the mushroom is more towards the middle of the
// page vertically"). The mushroom was riding the top edge — its box centred
// at y 248 of 900 (0.28 of frame) with the cap clipped against y 0. Two
// things move together here, because the eye alone cannot do it: raising the
// camera with the target pinned only steepens the gaze and pushes the subject
// FURTHER up (the two effects nearly cancel — measured ~12 px per world unit
// of lift). So the whole rig rises 0.25 world units ALONG THE DIVE LINE and
// the gaze lifts 7 deg with it: rest pitch -15.9 -> -8.9. Measured at
// 1440x900 the mushroom box moves 45,19..570,477 -> 79,160..575,594 —
// centre y 248 -> 377, i.e. 0.28 -> 0.42 of the frame, cap clear of the top
// edge by 160 px — while its LEFT edge and its width are untouched, so the
// upper-left placement the restage above authored is exactly preserved. The
// horizon rides down 241 -> 338 (ground still owns the lower ~62% instead of
// ~73%), and all three hubs travel down with the ground, staying spread
// through the same open diagonal band.
//
// The lift is spent as +y ONLY: rest, drift and exit keep their shipped x/z
// to within 0.001 and stay COLLINEAR with owned/camera.js's t 0.0 key on one
// straight dive (new unit (0.89794, 0.16451, 0.40822) out of owned's
// (2.523, 1.654, 1.792); each key's own unit agrees to 1e-4, tighter than the
// shipped set's 4e-4). The approach keys rise with it (2.90 / 2.82 / 2.73)
// so the descent from the Inspire splice stays monotone in y, and every gaze
// on the leg is re-pitched onto one monotone descent — -0.3 (inspire's last
// key) -> -4.5 -> -7.6 -> -8.6 -> -8.9 (rest) -> -12.6 -> -15.8 -> -18.5
// (owned t 0.0) -> owned's single ~-26.5 valley — with each key's YAW kept
// bit-exact (targets are re-pitched in the vertical plane only).
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.38..0.60
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA = {
  keys: [
    // --- descent OUTSIDE the rim: one continuous widening from the Inspire
    //     rest (monotone subject-distance + fov — no re-approach), the gaze
    //     walking down the stem toward the base; the first tendrils leave
    //     the base in frame as the growth window opens (leg t 0.10) ---
    { t: 0.13636363636363624, pos: V(8.440, 2.90, 3.280), tgt: V(1.140, 2.210, -1.563), fov: 48 },                                   // p 0.410  pitch -4.5  yaw -123.56
    { t: 0.30000000000000004, pos: V(8.280, 2.82, 3.720), tgt: V(1.458, 1.576, -2.636), fov: 53 },                                   // p 0.446  pitch -7.6  yaw -132.97
    { t: 0.409090909090909,   pos: V(8.100, 2.73, 4.050), tgt: V(1.674, 1.235, -3.462), fov: 58 },                                   // p 0.470  pitch -8.6  yaw -139.46
    // --- CONNECT rest: mushroom upper-LEFT, copy upper-RIGHT (ui.js
    //     CHAPTER_POSITION.connect = 'pos-topright'), the ground plane and
    //     its three hubs spread through the diagonal band between them.
    //     Eye raised 2026-08-05 (see the header note): +0.25 along the dive
    //     line and +7 deg of gaze, which drops the mushroom from 0.28 to
    //     0.42 of the frame height without moving it off the left third. ---
    { t: 0.5,                 pos: V(7.943, 2.647, 4.256), tgt: V(1.827, 1.028, -4.067), fov: 62, hold: true, note: 'connect-rest' }, // p 0.490  pitch -8.91 yaw -143.69
    // --- exit re-keyed 2026-08-04 (Hannah: Connect->Owned must read as ONE
    //     continuous down-and-forward dive, no whip at the soil). The drift
    //     already creeps along the dive line toward the trunk (the old drift
    //     backed away +z, so the exit had to reverse it), and the exit key
    //     rides the same line: from here to the Owned rest, gaze yaw walks
    //     -132 -> -94 deg MONOTONICALLY (the old exit overswung to -71 and
    //     came back) and gaze pitch bows through a single ~-26 deg valley.
    //     The near-base stretch brightens (index.js uExit) as radius closes.
    //
    //     THE DIVE LINE IS PRESERVED. rest, drift, exit and owned/camera.js's
    //     t 0.0 key are all COLLINEAR on the straight approach to the trunk
    //     (unit (0.9033, 0.1238, 0.4107) out of owned's (2.523, 1.654, 1.792));
    //     the top-left/top-right restage only slid the rest from arc 5.62 to
    //     6.00 along that same line and re-spaced the drift (4.92 -> 5.05) so
    //     the extra 0.38 units are spent in the slow creep, not in the dive.
    //     Speed profile 22 -> 80 -> 65 u/p (was 17 -> 76 -> 65). Gaze walks
    //     yaw -126.3 -> -134.6 -> -143.0 -> -148.0 (owned t 0.0) with zero
    //     derivative sign flips, and pitch descends -15.9 -> -16.9 -> -17.9
    //     -> -18.5 straight into owned's single ~-26.5 valley — no crest-dip.
    { t: 0.6909090909090911,  pos: V(7.0846, 2.4897, 3.8657), tgt: V(0.530, 0.403, -2.779), fov: 61.5, note: 'connect-rest-drift' }, // p 0.532  pitch -12.6 yaw -135.39
    { t: 0.8863636363636362,  pos: V(3.9863, 1.9221, 2.4572), tgt: V(-1.101, 0.119, -1.377), fov: 54 },                              // p 0.575  pitch -15.8 yaw -127.00
  ],
};
