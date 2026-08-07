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
    // --- growth-front rise-tilt-recede, RE-AIMED AGAIN (2026-08-07,
    //     17-final-field.md; Hannah: "the transition from Owned to the final
    //     section feels unnatural, like a weird jumpy thing — what if it
    //     zoomed out and went up instead?").
    //
    //     WHAT WAS WRONG. The two rests between them MANDATE a gaze reversal:
    //     the Owned rest looks -X (yaw -72.9, straight at the root crown) and
    //     the Final rest looks +X (yaw +68.3, back across the ring chord).
    //     That is 141 deg of turn that has to be spent somewhere. The shipped
    //     leg spent it LATE — only 70% done by p 0.878, with the last 42 deg
    //     crammed into p 0.878-0.925 at a peak of 1334 deg/p (over the 1.2k
    //     budget) and an optical-flow crest of 21.8k px/p at p 0.9115 against
    //     ~12-13k mid-leg. So the camera flew forward through the colony
    //     looking where it was going, and then WHIPPED sideways exactly while
    //     the field was revealing. That whip is the "jumpy thing": the reveal
    //     was delivered by a pan, which reads as being dragged, not as
    //     withdrawing.
    //
    //     THE RE-KEY. The same 141 deg is now spent EARLY and underground,
    //     where the frame is a homogeneous network and a turn reads as
    //     turning to look back the way you came. Yaw is monotone (zero sign
    //     flips) and ~91% complete by p 0.878, so the camera surfaces already
    //     facing the field and the last 0.047 of p only eases 13 deg home.
    //     Peak rate 1070 deg/p at p 0.794, inside budget. Pitch keeps ONE
    //     shallow crest but its excursion drops from 19 deg (+10.8 -> -8.6,
    //     peak 601 deg/p) to 7 deg (-1.0 -> -8.6, peak 288). And fov stops
    //     fighting the recede: it used to drop 58 -> 54 across this key,
    //     MAGNIFYING by 8.7% just as the camera closed on the crown; it now
    //     holds wide (57.2) through that stretch and eases later, peak
    //     114 deg/p against 166.
    //
    //     POSITIONS ARE BIT-EXACT — every key below keeps the shipped pos.
    //     That is not politeness, it is the constraint: owned/leg.js samples
    //     the director's POSITION spline over p 0.660-0.872 for every
    //     clearance rule, and final/index.js's reveal front is pullOf(camera
    //     .position.x). Holding pos fixed means the built colony and the
    //     reveal front are unchanged by construction, so this re-key can only
    //     move where the lens is POINTED. (The residual it therefore cannot
    //     fix is documented in 17-final-field.md: the path still passes
    //     within 0.82 units of the crown at p 0.751, so the crown leaves the
    //     top of frame instead of receding. That is a position fault inside
    //     the placement-bearing window and restaging it is a colony rebuild.)
    { t: 0.7280000000000002,  pos: V(-3.300, -1.40, 0.350), tgt: V(-4.979, -1.808, -2.808), fov: 57.2, note: 'owned-rest-drift' },   // p 0.782, pitch -6.5 yaw -28
    { t: 0.8480000000000003,  pos: V(-5.300, -1.02, 0.780), tgt: V(-5.136, -1.389, -3.903), fov: 55.2 },                             // p 0.812, pitch -4.5 yaw +2
    // T4 fires in here: the camera clears the soil-line at p ~ 0.86
    { t: 0.98,                pos: V(-7.700, -0.20, 1.250), tgt: V(-4.653, -0.466, -4.028), fov: 52.8 },                             // p 0.845, pitch -2.5 yaw +30
  ],
};
