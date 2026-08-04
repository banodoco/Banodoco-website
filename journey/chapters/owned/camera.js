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
    // --- the dive (re-keyed 2026-08-04; Hannah: Connect->Owned must read as
    //     ONE continuous down-and-forward gesture — approach, dive, level
    //     out). Only the GAZE is re-authored from t 0.088 on: gaze yaw walks
    //     -122 -> -94 deg monotonically (the old aims overswung to -71 deg
    //     mid-descent and came back) and gaze pitch bows through a single
    //     ~-26 deg valley near t 0.27 instead of the old crest-dip-crest
    //     (-8 -> -46 -> -1, which measured ~1530 and ~1800 deg/unit-p; the
    //     re-aim measures ~910 peak).
    //
    //     POSITION KEYS FROM t 0.088 ON ARE PLACEMENT-LOCKED, BIT-EXACT:
    //     owned/leg.js samples the director's POSITION spline over
    //     p 0.660-0.872 (camPts) for every clearance rule — cords, hypha
    //     culls (whose PRNG branches on camDist) and portrait pushes — so
    //     moving any pos at t >= 0.088 reshuffles built geometry and the
    //     goldens with it. Targets are freer: only frameAt(p >= 0.700)
    //     consumers (a handful of ambient portrait homes) read the target
    //     spline, a sub-threshold golden effect. The t 0.0 key position may
    //     move (its influence ends before p 0.660).
    { t: 0.0,                 pos: V(2.523, 1.654, 1.792), tgt: V(-1.176, 0.194, -0.519), fov: 52 },   // p 0.600, pitch -18.5 yaw -122
    { t: 0.08800000000000008, pos: V(1.550, 1.52, 1.350),  tgt: V(-1.736, 0.046, -0.147), fov: 51.5 }, // p 0.622, pitch -22.2 yaw -114.5
    // --- EXTERIOR stipe-side descent. Horizontal radius never drops below
    //     ~1.2 while stem radius is <= 0.69, so the camera is always OUTSIDE
    //     the stipe - the deferred Equip interior is never entered.
    { t: 0.18000000000000016, pos: V(0.940, 1.42, 0.940),  tgt: V(-1.901, -0.001, 0.044), fov: 51 },  // p 0.645, pitch -25.5 yaw -107.5
    { t: 0.27200000000000024, pos: V(0.920, 0.85, 0.920),  tgt: V(-1.528, -0.399, 0.386), fov: 50 },  // p 0.668, pitch -26.5 yaw -102.3 (the valley)
    // T3 soil-line crossing lands just past here (p ~0.692, unchanged: the
    // position path through the murk is the shipped one, bit-exact)
    { t: 0.3599999999999999,  pos: V(0.860, 0.15, 0.860),  tgt: V(-1.324, -0.788, 0.530), fov: 50 },  // p 0.690, pitch -23 yaw -98.6
    // levelling into the glide: pitch recovers along one smooth ramp
    // (-26.5 valley -> -1 at the rest, peak ~910 deg/unit-p measured). The
    // yaw tail deliberately keeps ~+3.4 deg of rise after p 0.700 (all
    // inside the murk): the portrait field's tgtRight ramp (0 -> 0.25 over
    // 0.700-0.725) pulls ~-3.2 deg the other way, and a flatter landscape
    // tail would let it reverse the portrait yaw mid-crossing.
    { t: 0.3999999999999999,  pos: V(0.720, -0.42, 0.720), tgt: V(-1.537, -1.182, 0.427), fov: 51 },  // p 0.700, pitch -18.5 yaw -97.4
    { t: 0.43999999999999995, pos: V(0.420, -0.92, 0.580), tgt: V(-2.012, -1.440, 0.329), fov: 52 },  // p 0.710, pitch -12 yaw -95.9
    { t: 0.472,               pos: V(0.050, -1.22, 0.420), tgt: V(-2.629, -1.465, 0.195), fov: 53 },  // p 0.718, pitch -5.2 yaw -94.8
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
