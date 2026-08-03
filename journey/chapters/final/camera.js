// chapters/final/camera.js — FINAL's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.85..1.00
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA = {
  keys: [
    // --- the rise continues (from owned/camera.js's T4 keys) into the
    //     pullback ---
    { t: 0.18666666666666681, pos: V(-10.200, 1.05, 1.800), tgt: V(-7.92, 1.98, -3.32), fov: 51 },   // p 0.878
    { t: 0.3666666666666669,  pos: V(-12.300, 1.75, 2.250), tgt: V(-5.71, 1.68, -3.28), fov: 48 },   // p 0.905
    // --- FINAL rest: oblique cutaway recession from OUTSIDE the ring's west
    //     arc, gaze cutting across the ring chord. Shallow ~8.8 deg
    //     down-pitch puts the soil-line across the frame on a diagonal:
    //     fairy ring and spore sky above it, the colony in section below,
    //     the hero organism ~12.6 deg right of centre at 14.8 units — in
    //     family with the mature members, never the centre of the
    //     composition. The near arc passes behind the camera (members
    //     cleared > 3 units off the path, Spike B's clearance rule). Tilt is
    //     PITCH ONLY, never roll.
    { t: 0.5000000000000003,  pos: V(-14.72, 2.73, 2.700),  tgt: V(-3.06, 0.83, -1.94), fov: 45.5, hold: true, note: 'final-rest' },   // p 0.925
    { t: 1.0,                 pos: V(-17.73, 3.95, 3.260),  tgt: V(-5.44, 2.08, -0.97), fov: 44,   hold: true, note: 'final-recede' }, // p 1.000
  ],
};
