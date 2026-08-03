// chapters/connect/camera.js — CONNECT's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.38..0.60
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA = {
  keys: [
    // --- the descent along the stream continues (from inspire/camera.js's
    //     exit-follow key); T2 fires in here: slipping under the lifted rim
    //     beside the stream release ---
    { t: 0.13636363636363624, pos: V(3.550, 2.85, -0.350), tgt: V(1.90, 3.05, -1.00), fov: 48 },                                     // p 0.410
    { t: 0.30000000000000004, pos: V(2.300, 2.62, -1.300), tgt: V(0.60, 3.14, -0.70), fov: 55 },                                     // p 0.446
    { t: 0.409090909090909,   pos: V(1.700, 2.40, -1.600), tgt: V(-0.60, 3.34, 0.05), fov: 58 },                                     // p 0.470
    // --- CONNECT rest: wide low angle in the chamber, looking up ~18 deg ---
    { t: 0.5,                 pos: V(1.430, 2.15, -1.170), tgt: V(-1.50, 3.50, 0.40), fov: 60, hold: true, note: 'connect-rest' },   // p 0.490
    { t: 0.6909090909090911,  pos: V(1.280, 2.16, -1.030), tgt: V(-1.62, 3.48, 0.56), fov: 60, note: 'connect-rest-drift' },         // p 0.532
    // --- lateral across the chamber to the stipe-cap junction (GB-2.2) ---
    // The gaze travels ~90 deg of PITCH between "looking up in the chamber"
    // and "looking down the stipe". That turn is spread deliberately across
    // this key and owned/camera.js's first three (~11% of the journey,
    // ~1.5 vh of scroll) so it reads as a tilt, not a whip: measured peak
    // stays near 1.2 k deg per unit p, i.e. ~90 deg/s at an ordinary scroll.
    { t: 0.8863636363636362,  pos: V(0.960, 2.06, -0.200), tgt: V(-0.85, 3.32, 0.90), fov: 58 },  // p 0.575, pitch +31
  ],
};
