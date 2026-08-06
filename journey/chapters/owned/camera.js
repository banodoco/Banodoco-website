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
    // --- ROOT-WORLD RESTAGE (2026-08-06, 20-owned-root-network.md; Hannah's
    //     reference: the mushroom's BASE enters the top of the frame, a wide
    //     fan of root filaments descends from it, and the people ARE the
    //     bright intersections of the network below).
    //
    //     The composition is a camera problem before it is a geometry one.
    //     The shipped rest sat at (-0.4,-1.40,0.3) looking -X on a LEVEL
    //     gaze, i.e. PAST the stipe and away from it: the root crown was
    //     behind the lens and the soil lid filled the top of frame, so every
    //     lit thing in the section hugged the ceiling and the lower
    //     two-thirds was empty black (see the pre-restage owned golden).
    //
    //     Three things move together, because none of them works alone:
    //
    //       1. the rest slides to the +X/+Z side of the stipe (1.73, 0.56)
    //          so the root crown is AHEAD of the lens, on the gaze, instead
    //          of behind it. Crown bearing from the rest is -107.1 deg,
    //          which IS the rest yaw — the crown lands at frame centre in x.
    //       2. the gaze pitches DOWN 8 deg instead of levelling out. That
    //          puts the soil-plane vanishing line at NDC y +0.254 — the lid
    //          owns the top ~37% and the open volume owns the lower ~63%,
    //          which is the reference's "network fills the lower two-thirds".
    //          A level gaze splits the frame 50/50 and a gaze pitched UP
    //          gives the whole frame to the ceiling.
    //       3. fov opens 54 -> 58, which drops the crown from NDC y 1.001
    //          (just off the top edge) to 0.920 (entering the frame at the
    //          top edge, exactly as described) and widens the fan.
    //
    //     The DIVE is re-pathed to arrive there: it now sinks on the stipe's
    //     +X/+Z side at radius ~1.8-2.5 instead of closing to ~1.3, so there
    //     is no x reversal anywhere (x walks 2.523 -> 1.730 monotonically and
    //     keeps walking -X after the rest). The Y SCHEDULE IS UNTOUCHED at
    //     t 0.360 / 0.400 / 0.440 (0.15 / -0.42 / -0.92), which is what pins
    //     the T3 soil crossing where it has always been (p ~0.693, inside the
    //     0.692-0.712 murk window; CONNECT_HOLD_HI 0.705 stays lawful).
    //
    //     GAZE, re-authored end to end and now MONOTONE through the whole
    //     join: yaw -135 (connect drift) -> -127 -> -122 (t 0.0) -> -119 ->
    //     -116 -> -113.5 -> -111.5 -> -110 -> -108.7 -> -107.8 -> -107.1
    //     (rest) -> -114 (drift) -> ... The shipped leg swung UP to -94 at
    //     the rest and back down; the restage removes that 13-deg overswing.
    //     Pitch keeps its single valley (-18.5 -> -26.5 at t 0.272 -> -8 at
    //     the rest -> -1.2 -> +10.7), so the descent still bows through one
    //     dip and never nods.
    //
    //     POSITION KEYS AT t >= 0.088 ARE PLACEMENT-BEARING: owned/leg.js
    //     samples the director's POSITION spline over p 0.660-0.872 (camPts)
    //     for every clearance rule, so this restage necessarily rebuilds the
    //     chapter's geometry — which is the point. The t 0.728 / 0.848 / 0.98
    //     keys are UNTOUCHED, bit-exact, so the pose at p >= 0.845 (the whole
    //     FINAL splice) is unchanged by construction. The t 0.0 key is
    //     untouched too, so CONNECT's exit stays collinear with the dive.
    { t: 0.0,                 pos: V(2.523, 1.654, 1.792), tgt: V(-1.176, 0.194, -0.519), fov: 52 },   // p 0.600, pitch -18.5 yaw -122
    { t: 0.08800000000000008, pos: V(2.230, 1.520, 1.430), tgt: V(-0.361, 0.311, -0.006), fov: 52 },   // p 0.622, pitch -22.2 yaw -119.0
    // --- EXTERIOR stipe-side descent. Horizontal radius never drops below
    //     ~1.8 while stem radius is <= 0.69, so the camera is always OUTSIDE
    //     the stipe - the deferred Equip interior is never entered.
    { t: 0.18000000000000016, pos: V(2.010, 1.420, 1.150), tgt: V(-0.586, 0.042, -0.116), fov: 52.5 }, // p 0.645, pitch -25.5 yaw -116.0
    { t: 0.27200000000000024, pos: V(1.895, 0.850, 0.965), tgt: V(-0.731, -0.578, -0.177), fov: 53 },  // p 0.668, pitch -26.5 yaw -113.5 (the valley)
    // T3 soil-line crossing lands just past here (p ~0.693: the Y schedule
    // through the murk is the shipped one, key for key)
    { t: 0.3599999999999999,  pos: V(1.820, 0.150, 0.830), tgt: V(-0.921, -1.100, -0.250), fov: 54 },  // p 0.690, pitch -23.0 yaw -111.5
    // levelling into the glide: pitch recovers along one smooth ramp
    // (-26.5 valley -> -8 at the rest) while the fov opens toward 58, so the
    // root crown rises into the top of frame as the murk clears.
    { t: 0.3999999999999999,  pos: V(1.790, -0.420, 0.760), tgt: V(-1.062, -1.435, -0.278), fov: 55 },  // p 0.700, pitch -18.5 yaw -110.0
    { t: 0.43999999999999995, pos: V(1.762, -0.920, 0.680), tgt: V(-1.185, -1.667, -0.318), fov: 56.5 },// p 0.710, pitch -13.5 yaw -108.7
    { t: 0.472,               pos: V(1.742, -1.100, 0.610), tgt: V(-1.254, -1.683, -0.352), fov: 57.5 },// p 0.718, pitch -10.5 yaw -107.8
    // --- OWNED rest: under the root, the crown at top centre, the fan
    //     descending into the portrait network below ---
    { t: 0.5,                 pos: V(1.730, -1.180, 0.560), tgt: V(-1.298, -1.625, -0.373), fov: 58, hold: true, note: 'owned-rest' },   // p 0.725
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
