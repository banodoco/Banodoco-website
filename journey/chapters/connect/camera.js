// chapters/connect/camera.js — CONNECT's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// GROUND RESTAGE (16-connect-ground-restage.md §5): the leg no longer slips
// under the rim into the gill chamber. From inspire/camera.js's last key
// (p 0.362: pos (5.6, 3.05, 0.55), tgt (1.7, 3.3, -0.75), fov 42) the camera
// sinks and widens OUTSIDE the rim to ground level, the gaze sliding off the
// cap down the stem to the base and out across the ground as the network
// starts to grow. The rest is the panoramic frame of doc §3: mushroom wholly
// visible on the left third, the tendril network across the lower/middle
// right two-thirds, camera low, gentle downward gaze. The exit follows the
// tendrils home toward the trunk, ending near owned/camera.js's (re-authored)
// entry — the cleanest narrative joint in the ride: after watching the
// surface network, the camera follows it to the root and dives underground.
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.38..0.60
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA = {
  keys: [
    // --- descent OUTSIDE the rim: sinking, widening, the gaze walking down
    //     the stem toward the base; the first tendrils leave the base in
    //     frame as the growth window opens (leg t 0.10) ---
    { t: 0.13636363636363624, pos: V(6.000, 2.78, 1.900), tgt: V(1.05, 2.60, -0.90), fov: 47 },                                      // p 0.410
    { t: 0.30000000000000004, pos: V(6.800, 2.52, 2.900), tgt: V(0.75, 1.55, -1.50), fov: 51 },                                      // p 0.446
    { t: 0.409090909090909,   pos: V(7.350, 2.42, 3.700), tgt: V(0.55, 0.80, -2.05), fov: 54 },                                      // p 0.470
    // --- CONNECT rest: low panorama — mushroom left, network right ---
    { t: 0.5,                 pos: V(7.600, 2.35, 4.100), tgt: V(0.45, 0.42, -2.35), fov: 56, hold: true, note: 'connect-rest' },    // p 0.490
    { t: 0.6909090909090911,  pos: V(7.450, 2.34, 4.250), tgt: V(0.42, 0.43, -2.25), fov: 56, note: 'connect-rest-drift' },          // p 0.532
    // --- exit toward the trunk: the camera follows the tendrils home; the
    //     near-base stretch brightens (index.js uExit) as radius closes ---
    { t: 0.8863636363636362,  pos: V(4.900, 1.95, 3.100), tgt: V(0.25, 0.80, -0.10), fov: 53 },                                      // p 0.575
  ],
};
