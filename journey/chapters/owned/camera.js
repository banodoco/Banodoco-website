// chapters/owned/camera.js — OWNED's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.60..0.85
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA = {
  keys: [
    // --- finishing the chamber -> stipe pitch turn (see connect/camera.js) ---
    { t: 0.0,                 pos: V(0.880, 2.00, 0.420),  tgt: V(-0.60, 2.90, 1.30),  fov: 55 },  // p 0.600, pitch +28
    { t: 0.08800000000000008, pos: V(0.920, 1.80, 0.800),  tgt: V(-0.55, 2.10, 1.55),  fov: 53 },  // p 0.622, pitch +10
    // --- EXTERIOR stipe-side descent. Horizontal radius never drops below
    //     ~1.2 while stem radius is <= 0.69, so the camera is always OUTSIDE
    //     the stipe - the deferred Equip interior is never entered.
    { t: 0.18000000000000016, pos: V(0.940, 1.42, 0.940),  tgt: V(-0.30, 1.20, 1.35),  fov: 51 },  // p 0.645, pitch -10
    { t: 0.27200000000000024, pos: V(0.920, 0.85, 0.920),  tgt: V(-0.10, 0.10, 1.00),  fov: 50 },  // p 0.668, pitch -36
    // T3 soil-line crossing lands just past here
    { t: 0.3599999999999999,  pos: V(0.860, 0.15, 0.860),  tgt: V(-0.10, -0.85, 0.70), fov: 50 },  // p 0.690, pitch -46
    // levelling into the glide: spread over three keys so the pitch comes up
    // at ~60 deg/s rather than the ~96 deg/s a two-key version measured
    { t: 0.3999999999999999,  pos: V(0.720, -0.42, 0.720), tgt: V(-0.70, -1.30, 0.42), fov: 51 },  // p 0.700, pitch -31
    { t: 0.43999999999999995, pos: V(0.420, -0.92, 0.580), tgt: V(-1.35, -1.52, 0.34), fov: 52 },  // p 0.710, pitch -19
    { t: 0.472,               pos: V(0.050, -1.22, 0.420), tgt: V(-2.20, -1.55, 0.24), fov: 53 },  // p 0.718, pitch -8
    // --- OWNED rest: the underground glide, drifting -X away from the stipe ---
    { t: 0.5,                 pos: V(-0.400, -1.40, 0.300), tgt: V(-3.20, -1.45, 0.10), fov: 54, hold: true, note: 'owned-rest' },   // p 0.725
    // --- growth-front rise-tilt-recede: ONE continuous gesture (W3-B gap c),
    //     RE-AIMED for W4-D (Hannah's direction: the hero organism is PART of
    //     the Final scene — the pullback reveals the whole fairy ring with the
    //     hero on its arc). Gesture qualities the review approved are kept:
    //     one continuous rise-tilt-recede; yaw spread nearly evenly (interval
    //     means 833-970 deg/p, lead-out during the drift at ~350); pitch
    //     rises to ~+9.5 through the substrate and eases down into the
    //     cutaway's -8.8 with a single crest, no nod; the recede continues
    //     the arrival vector (both normalize to ~(-0.91, 0.37, 0.17)) so the
    //     rest is a pause on one continuing line. The gaze sweeps ~176 deg
    //     around the horizon during the rise; the hero slides into
    //     frame-right only during the settle, one lit body among the others
    //     (chapters/final-world.js places the ring about RING_C (-6, -0.8)
    //     with the hero ON the arc). The rise continues in final/camera.js.
    { t: 0.7280000000000002,  pos: V(-3.300, -1.40, 0.350), tgt: V(-6.22, -1.46, -0.95), fov: 54, note: 'owned-rest-drift' },        // p 0.782
    { t: 0.8480000000000003,  pos: V(-5.300, -1.02, 0.780), tgt: V(-7.52, -0.77, -2.06), fov: 53.5 },                                // p 0.812
    // T4 fires in here: the camera clears the soil-line at p ~ 0.86
    { t: 0.98,                pos: V(-7.700, -0.20, 1.250), tgt: V(-8.28, 0.47, -2.91), fov: 52.5 },                                 // p 0.845
  ],
};
