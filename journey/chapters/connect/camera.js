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
// ground as the network starts to grow. The rest is the panoramic frame of
// doc §3: mushroom wholly visible on the left third, the tendril network
// across the lower/middle right two-thirds, camera low, gentle downward
// gaze. The exit follows the tendrils home toward the trunk, ending near
// owned/camera.js's (re-authored) entry — the cleanest narrative joint in
// the ride: after watching the surface network, the camera follows it to
// the root and dives underground.
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
    { t: 0.13636363636363624, pos: V(8.200, 2.72, 3.300), tgt: V(0.75, 1.90, -1.35), fov: 48 },                                      // p 0.410  d 8.83
    { t: 0.30000000000000004, pos: V(7.950, 2.55, 3.700), tgt: V(0.60, 1.10, -1.85), fov: 52 },                                      // p 0.446  d 9.32
    { t: 0.409090909090909,   pos: V(7.750, 2.43, 3.950), tgt: V(0.50, 0.65, -2.15), fov: 54.5 },                                    // p 0.470  d 9.64
    // --- CONNECT rest: low panorama — mushroom left, network right ---
    { t: 0.5,                 pos: V(7.600, 2.35, 4.100), tgt: V(0.45, 0.42, -2.35), fov: 56, hold: true, note: 'connect-rest' },    // p 0.490  d 9.82
    { t: 0.6909090909090911,  pos: V(7.450, 2.34, 4.250), tgt: V(0.42, 0.43, -2.25), fov: 56, note: 'connect-rest-drift' },          // p 0.532
    // --- exit toward the trunk: the camera follows the tendrils home; the
    //     near-base stretch brightens (index.js uExit) as radius closes ---
    { t: 0.8863636363636362,  pos: V(4.900, 1.95, 3.100), tgt: V(0.25, 0.80, -0.10), fov: 53 },                                      // p 0.575
  ],
};
