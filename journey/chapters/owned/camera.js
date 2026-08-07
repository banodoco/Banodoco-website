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
    // --- growth-front rise-tilt-recede, RE-PATHED (2026-08-07 pass 2,
    //     17-final-field.md; Hannah: "what if the actual effect was more of a
    //     reverse and out to show the mushrooms… what if it zoomed out and
    //     went up instead?").
    //
    //     Pass 1 (1d0f5e0) re-aimed gaze and fov and fixed the WHIP, but left
    //     two faults it could not reach because they are PURE POSITION:
    //     the path passed within 0.82 units of the root crown at p 0.751
    //     (distance 1.85 -> 0.82 -> 15.37, apparent scale RISING +44k/p) so
    //     the crown left the TOP of frame at p 0.7325 instead of receding;
    //     and y sank -1.180 -> -1.403 before climbing, so the first 27% of a
    //     leg asked to go "up" went down.
    //
    //     WHY THE OLD PATH HAD TO PUSH IN. The Owned rest sits at x +1.73,
    //     the crown at x +0.06, the Final rest at x -14.72 — the crown is
    //     BETWEEN the two rests, so the x-gap must pass through zero. The old
    //     path ran almost straight down the x axis, so when the x-gap
    //     collapsed the whole distance collapsed with it: a fly-past, and a
    //     gaze tracking a point you fly past has unbounded angular rate at
    //     closest approach. That is why re-aiming could not fix it.
    //
    //     THE FIX IS LATERAL, AND IT IS THE ONLY KIND THAT WORKS. Distance
    //     lost in x has to be already banked in z BEFORE the crossing, and it
    //     has to be banked PERMANENTLY — a straight dolly back along -gaze
    //     (+X) was measured and rejected: it buys distance and then gives it
    //     all back on the way past, re-magnifying the crown +50/p over
    //     p 0.752-0.767 and putting a second closest approach where the first
    //     one was. z is the only axis whose offset survives, because the
    //     Final rest already sits at z +2.70. So the leg now swings OUT to
    //     z 3.11 while it crosses, on ONE hump (a single sign change in z),
    //     and comes home to the frozen 2.700. Nothing is invented: the leg
    //     spends z the world already had, just earlier.
    //
    //     Measured over p 0.725-0.925 at 20,001 samples per aspect (step 1e-5
    //     in p), landscape AND portrait: ZERO negative distance steps, ZERO
    //     negative height steps, ZERO positive x steps. Not "small" — none.
    //     The distance minimum IS the rest and the height minimum IS the rest,
    //     so there is no closest approach and no sink anywhere on the leg, and
    //     holding x monotone keeps pullOf/riseOf single-direction. The crown's
    //     apparent scale never rises once (0 samples, against 52, and its peak
    //     rate is -24/p — always falling). It now recedes INTO frame — NDC y
    //     0.92 -> 0.72, shrinking 31%
    //     — before the turn carries it out the RIGHT edge at p 0.7635, where
    //     it used to be gone out of the TOP by p 0.7325, 8% BIGGER than it
    //     was at the rest.
    //
    //     WHAT IS HELD. x at the three reveal-bearing keys is BIT-EXACT
    //     (-7.700 / -10.200 / -12.300): final's reveal front is
    //     pullOf(camera.position.x) and its rise mask is riseOf(the same), so
    //     holding x holds the reveal schedule. The soil crossing lands at
    //     p 0.8555 against 0.8495. Both rests are untouched. Pass 1's gaze
    //     schedule is CARRIED, not re-authored: every key below keeps pass
    //     1's yaw and pitch to 0.1 deg and its gaze length, so the 141.2 deg
    //     reversal is still spent early and underground (yaw peak 1064 deg/p,
    //     against pass 1's 1070) — only the eye's place moved.
    //
    //     POSITION KEYS FROM HERE ARE PLACEMENT-BEARING: owned/leg.js samples
    //     the director's POSITION spline over p 0.660-0.872 for every
    //     clearance rule, so this re-path necessarily regrows the colony
    //     around the new corridor — which is the point, and why owned@* is
    //     re-shot in this commit. The rest key's zero tangent (hold) means
    //     nothing at p <= 0.725 moves: the dive, the T3 crossing and the
    //     Owned rest composition are bit-exact.
    //
    //     THE GAZE, unchanged in intent from pass 1: the two rests MANDATE a
    //     141.2 deg reversal (Owned looks -X straight up the root crown,
    //     Final looks +X back across the ring chord), and it is spent EARLY
    //     and underground, where the frame is a homogeneous network and a
    //     turn reads as turning to look back the way you came. Yaw stays
    //     monotone with zero sign flips, ~88% complete by p 0.878, so the
    //     camera surfaces already facing the field and the last stretch only
    //     eases home. fov still holds wide through the recede instead of
    //     fighting it.
    //
    //     THE WITHDRAW KEY (t 0.60) IS NEW. The rest's hold forces a zero
    //     tangent, so without a key inside the first 0.025 of p the leg left
    //     the rest already committed to the old straight-down-x run. This key
    //     is what lets the swing start while the camera is still close.
    //
    //     THE Y SCHEDULE IS THE SHIPPED ONE WITH THE DIP TAKEN OUT, not a
    //     steeper climb: -1.180 -> -1.16 -> -1.12 -> -1.00 -> -0.40 and then
    //     the real rise. Lifting y harder underground was measured and
    //     rejected — portrait's own `rise` offset stacks on top of it, and it
    //     pierced the soil at p 0.817 with final's rise mask only 11% open,
    //     against 58% shipped. Held down like this, portrait pierces at
    //     p 0.829 with the mask 69% open, BETTER than the shipped 0.823/58%,
    //     while landscape still clears at mask 1.0. Monotone is the ask; a
    //     race to the surface is not.
    { t: 0.6000000000000001,  pos: V(1.200, -1.16, 2.250),  tgt: V(-1.503, -1.595, 0.674),  fov: 57.9, note: 'withdraw' },          // p 0.750, pitch -7.9 yaw -120.2
    { t: 0.7280000000000002,  pos: V(-1.200, -1.12, 3.000), tgt: V(-2.879, -1.528, -0.158), fov: 57.2, note: 'owned-rest-drift' },  // p 0.782, pitch -6.5 yaw -152.0
    { t: 0.8480000000000003,  pos: V(-4.600, -1.00, 3.100), tgt: V(-4.436, -1.369, -1.583), fov: 55.2 },                            // p 0.812, pitch -4.5 yaw +178.0
    // T4 fires in here: the camera clears the soil-line at p ~ 0.856
    { t: 0.98,                pos: V(-7.700, -0.40, 2.950), tgt: V(-4.653, -0.666, -2.328), fov: 52.8 },                            // p 0.845, pitch -2.5 yaw +150.0
  ],
};
