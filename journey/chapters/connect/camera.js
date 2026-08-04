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
    { t: 0.13636363636363624, pos: V(8.440, 2.84, 3.280), tgt: V(1.16, 1.95, -1.55), fov: 48 },                                      // p 0.410  d 8.94
    { t: 0.30000000000000004, pos: V(8.280, 2.70, 3.720), tgt: V(1.55, 0.85, -2.55), fov: 53 },                                      // p 0.446  d 9.48
    { t: 0.409090909090909,   pos: V(8.100, 2.55, 4.050), tgt: V(1.83, 0.10, -3.28), fov: 58 },                                      // p 0.470  d 9.96
    // --- CONNECT rest: mushroom upper-LEFT, copy upper-RIGHT (ui.js
    //     CHAPTER_POSITION.connect = 'pos-topright'), the ground plane and
    //     its three hubs spread through the diagonal band between them ---
    { t: 0.5,                 pos: V(7.943, 2.397, 4.256), tgt: V(2.030, -0.450, -3.791), fov: 62, hold: true, note: 'connect-rest' }, // p 0.490  d 10.38
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
    { t: 0.6909090909090911,  pos: V(7.085, 2.279, 3.866), tgt: V(0.701, -0.483, -2.606), fov: 61.5, note: 'connect-rest-drift' },   // p 0.532  pitch -16.9 yaw -134.6
    { t: 0.8863636363636362,  pos: V(3.987, 1.854, 2.458), tgt: V(-1.029, -0.175, -1.322), fov: 54 },                                // p 0.575  pitch -17.9 yaw -143.0
  ],
};
