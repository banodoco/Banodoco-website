// chapters/owned/camera.js — OWNED's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// ONE MOVEMENT, SECOND LEG (2026-08-11, Hannah: "the transition from Connect
// to Owned feels a little choppy — how could we make it smoother? Right now
// it feels like 3 movements but it should be 1.5. It slowly arcs below the
// ground.").
//
// Measured (521-sample drift-aware trace, journey-v6-plan/
// 20-owned-root-network.md 2026-08-11), the leg WAS three envelopes:
//
//   1. THE DIVE      pos speed 0 -> 124.7 u/p at p 0.567 with fov rate
//                    -285 deg/p riding it (a zoom-IN), collapsed 8.3x to
//                    ~15 u/p by p 0.612;
//   2. THE CRAWL     p 0.61-0.69: speed 15-38 u/p, the crown's on-screen
//                    velocity near zero (0.22/p at 0.632), fov REVERSED
//                    direction (+20 deg/p) — the frame all but stops, then
//                    creeps down the stipe;
//   3. THE PLUNGE    a second speed hump (63 u/p at 0.696) with pitch rate
//                    +520 and fov rate +157 peaking together after the soil
//                    crossing, dying at the rest.
//
// Three envelope groups peaking at 0.567 / ~0.67 / 0.70, and one channel
// broken on its own: fov ran 62 -> 51.8 -> 58, a zoom-in then a zoom-out.
// (This is a different fault from 2a27db7, which cured the GAZE whip at the
// soil by re-aiming targets over bit-exact positions — that fix's intent,
// aim monotone through the join, is carried into the gesture below.)
//
// THE WHOLE TRAVEL IS NOW ONE ANALYTIC GESTURE — dive() below, the
// destination owning its arrival exactly like connect/camera.js approach()
// (the 2026-08-10 precedent) — composed by the director over
// p [restProgress('connect') .. restProgress('owned')]:
//
//   az, r   61.81 -> 72.05 deg, 9.011 -> 1.818, on ONE asymmetric trapezoid
//           (ramp-in 0.40 of the leg — the slow start out of the rest that
//           "slowly" asks for — plateau to 0.70, ramp-out done by 0.94);
//   y       2.647 -> -1.180 on a LATE-SURGING monotone ease (velocity grows
//           as smoothstep^2 to u 0.91, then hands off to a zero-slope
//           landing): the arc steepens continuously into the soil, which is
//           what pins the T3 crossing at p 0.6924 (shipped: 0.6926, murk
//           window 0.692-0.712, owned/index.js ARRIVAL_LO; y at p 0.712 is
//           -0.91, under the lid's own 0 -> -0.5 thickness, so the arm/
//           retire swap stays behind genuine occlusion);
//   fov     62 -> 58 on the SAME sinking ease — MONOTONE, the widening
//           arriving with the ground instead of a zoom-in-then-out;
//   gaze    quadratic bezier CONNECT rest target -> rest target, bowed
//           through PIN3 (the stipe base), eased by 0.85*easeM + 0.15*easeY
//           — mostly the dolly's ease, with a minority share of the sink so
//           the aim still walks down with the descent (see THE GAZE CARRIES
//           YAW below for why this is not the mean of the two).
//
// Measured on the built gesture: ONE speed envelope — 0 -> a 59-68 u/p
// plateau (peak 68.4 at p 0.667) -> a monotone decay through the crossing
// to 0 at the rest. No trough anywhere. Yaw strictly monotone (peak 442
// deg/p), subject distance 10.45 -> 3.20 with zero re-approach beyond
// 0.0005 u/step, radius and height strictly monotone, roll zero.
//
// THE GAZE CARRIES YAW, SO IT SCHEDULES THE COMPOSITION (2026-08-24, Hannah
// reporting the same motion twice — "it can feel too much to the left side,
// and then it goes into the middle… it should be more of a steady arc", then
// again on a phone: "it's off to the left and then it turns in when it's
// near to it").
//
// This ease was `(easeM + easeY) / 2`, and every word of the reasoning behind
// that choice was about PITCH. But the gaze is a direction, not an angle: the
// same curve that pitches the eye down also yaws it round, and the yaw is what
// decides where the subject sits ACROSS the frame. easeY is deliberately,
// heavily back-loaded — it is what steepens the descent into the soil and
// pins the T3 crossing — so half-weighting it back-loaded the composition too.
//
// Measured at 1440x900, tracking the root crown in screen space against the
// visitor's own axis (scroll, not p): the crown sat 347 px left of centre and
// moved FOUR PIXELS across the first half of the leg's scroll, then travelled
// the whole 347 px in the back half. 47.7% of the leg ran under 10% of the
// mean horizontal rate; peak/mean 4.09x. That trough is not authored — nobody
// chose "hold at the left edge for 2.44 vh and then rush" — it fell out of a
// parameter picked for the vertical. The 2026-08-11 rework's own acceptance
// criterion for this leg was "one movement, one envelope, no trough anywhere",
// applied to camera speed; the channel the visitor actually reads was never
// measured, because it is a FRAME channel and not a camera one.
//
// 0.85/0.15 halves the trough — 2.44 vh -> 1.20 vh, peak/mean 4.09x -> 3.06x,
// 1.2% -> 13.2% of the recentring done by the scroll midpoint — while keeping
// screen-x strictly monotone (g = easeM alone is faster still but reverses,
// 6 negative steps). Past ~0.90 the trough stops shrinking and the pitch cost
// keeps growing, so 0.85 is the knee rather than a taste call.
//
// WHAT IT DOES NOT MOVE, checked and not assumed: az, r, y and fov never read
// the gaze, so camera POSITION is bit-exact — the T3 soil crossing (0.687771,
// unchanged to six decimals), owned/leg.js's sampled corridor and the whole
// colony placement are untouched. Owned's reveal is camera-position-pure.
// Connect's camera-pure resolve needs forward.y <= -0.1253 and the leg's max
// is -0.1343 either way. Both rest poses are bit-exact at both aspects.
//
// THE COST, and it is the whole cost: the pitch valley deepens, -15.99 deg ->
// -21.65 deg (at p 0.6811), and its recovery steepens 320 -> 577 deg/p. It is
// still ONE valley — a single local minimum, which was always the design
// property — and the ends are untouched (-7.72 -> -7.99).
//
// (The header figures this block replaces claimed a -20.1 deg valley
// recovering at 462 deg/p. Re-measured on the shipped gesture at aspect 1.6
// and again at 0.4614, the shipped valley was -15.99 deg recovering at
// 320 deg/p — the stated numbers matched neither the shipped schedule nor any
// candidate, so they described a `g` that was never shipped. Every figure in
// this comment is measured; docs/code-health/evidence/…/a5b/scripts/pitch.mjs
// re-takes them.)
//
// PORTRAIT IS A SECOND, DIFFERENT FAULT — it is not fixed here, and this
// change alone does not fix it. See journey/portrait.js's Connect->Owned
// mid-leg key.
//
// BOTH ENDPOINTS ARE THE FROZEN APPROVED POSES, derived rather than copied:
// u = 0 reconstructs CONNECT's rest hold (imported), u = 1 this file's own
// REST key — a seam disagreement is impossible rather than checked-for.
// Both ends land with zero velocity (every ease is zero-slope at 0 and 1;
// both rest keys are holds).
//
// THE RETIRED KEYS: connect's two travel keys (t 0.77/0.91) and this file's
// eight descent keys (t 0.0/0.088/0.18/0.272/0.36/0.40/0.44/0.472). Their
// corridor — the close stipe-hugging crawl — is replaced by the gesture's
// wider single arc, so owned/leg.js's sampled window (p 0.660-0.872; the
// 0.660-0.723 half of it) DELIBERATELY regrows the colony around the new
// corridor and owned@* is re-shot in this commit. Every key at and past the
// rest (t >= 0.5) is bit-exact: the rest's hold tangent is zero and the
// withdraw key's tangent derives from the rest + drift keys only, so the
// whole approved withdraw/rise path (17-final-field.md) and every sample at
// p >= 0.725 are unchanged by construction.
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.60..0.85
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';
import { CAMERA as CONNECT_CAM } from '../connect/camera.js';
import { quadBezier } from '../../lib/ease.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// --- OWNED rest: under the root, the crown at top centre, the fan
//     descending into the portrait network below (root-world restage,
//     20-owned-root-network.md). Frozen approved pose. ---
const REST_KEY = {
  t: 0.5,
  pos: V(1.730, -1.180, 0.560),
  tgt: V(-1.298, -1.625, -0.373),
  fov: 58,
  hold: true,
  note: 'owned-rest',
};

// The gesture's two ends, derived — never copied — from the poses they must
// match: CONNECT's rest hold (its keys[0]) and REST_KEY above.
const C0 = CONNECT_CAM.keys[0];
const D0 = {
  az: Math.atan2(C0.pos.x, C0.pos.z),
  r: Math.hypot(C0.pos.x, C0.pos.z),
  y: C0.pos.y,
  fov: C0.fov,
};
const D1 = {
  az: Math.atan2(REST_KEY.pos.x, REST_KEY.pos.z),
  r: Math.hypot(REST_KEY.pos.x, REST_KEY.pos.z),
  y: REST_KEY.pos.y,
  fov: REST_KEY.fov,
};

// The gaze's mid-bow control point: the stipe base. The bow slides the aim
// off the ground network, in to the trunk's foot, and down onto the root
// crown in one curve; chosen against the live frame so subject distance
// falls strictly (10.45 -> 3.20) and pitch bows through one gentle valley.
const PIN3 = V(-0.2, 0.35, -1.2);

// ∫ smoothstep — the trapezoid family's closed-form ramp (S(1) = 1/2).
function iS(x) {
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  const x3 = x * x * x;
  return x3 - x3 * x / 2;
}
// ∫ smoothstep² — the surge's slow-growing onset (T(1) = 13/35).
function iT(x) {
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  const x5 = x * x * x * x * x;
  return 1.8 * x5 - 2 * x5 * x + (4 / 7) * x5 * x * x;
}

// Master ease (az, r, and half the gaze): asymmetric trapezoid velocity —
// smoothstep ramp-in over [0, 0.40], constant to 0.70, ramp-out landing at
// 0.94, flat (arrived) after. C1, zero slope at both ends.
const MA = 0.40, MB = 0.70, MC = 0.94;
const M_NORM = MA / 2 + (MB - MA) + (MC - MB) / 2;
function easeM(u) {
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  let i;
  if (u < MA) i = MA * iS(u / MA);
  else if (u < MB) i = MA / 2 + (u - MA);
  else if (u < MC) i = MA / 2 + (MB - MA) + (MC - MB) * (0.5 - iS((MC - u) / (MC - MB)));
  else i = M_NORM;
  return i / M_NORM;
}

// Sinking ease (y, fov, half the gaze): velocity grows as smoothstep² over
// [0, 0.91] — the continuously steepening arc — holds to 0.925, then a
// smoothstep ramp lands it at zero slope on the rest. C1. The 0.91/0.925
// pair is what pins the soil crossing at p 0.6924 with y(0.712) = -0.91.
const YA = 0.91, YB = 0.925;
const Y_NORM = YA * (13 / 35) + (YB - YA) + (1 - YB) / 2;
function easeY(u) {
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  let i;
  if (u < YA) i = YA * iT(u / YA);
  else if (u < YB) i = YA * (13 / 35) + (u - YA);
  else i = YA * (13 / 35) + (YB - YA) + (1 - YB) * (0.5 - iS((1 - u) / (1 - YB)));
  return i / Y_NORM;
}

/** The Connect -> Owned gesture. `u` is gesture-local (0 = the Connect rest,
 *  1 = the Owned rest); the composer maps global p over
 *  [restProgress('connect') .. restProgress('owned')] onto u. */
function dive(u, out) {
  const e = easeM(u);
  const h = easeY(u);
  const az = D0.az + (D1.az - D0.az) * e;
  const r = D0.r + (D1.r - D0.r) * e;
  const y = D0.y + (D1.y - D0.y) * h;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  // Gaze: bezier C0.tgt -> REST_KEY.tgt through PIN3. Eased mostly by the
  // dolly, with a 0.15 share of the sink so the aim still walks down with the
  // descent. The gaze carries YAW as well as pitch, so this ease schedules
  // where the subject sits across the frame — it may not simply inherit the
  // sink's deliberate back-loading (header, THE GAZE CARRIES YAW).
  const g = 0.85 * e + 0.15 * h;
  quadBezier(g, C0.tgt, PIN3, REST_KEY.tgt, out.target);
  out.fov = D0.fov + (D1.fov - D0.fov) * h;
  return out;
}

export const CAMERA = {
  dive,
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
    //     (The restage's keyed descent — the exterior stipe-side crawl that
    //     arrived at this rest — was retired 2026-08-11 for the dive()
    //     gesture above; its Y-schedule's one load-bearing property, the T3
    //     soil crossing at p ~0.692, is carried by the gesture's sinking
    //     ease. The rest pose itself is unchanged, bit-exact.)
    //
    // --- The descent to the rest is the dive() gesture above (2026-08-11,
    //     "one movement"): the director never evaluates the keyed spline
    //     below the rest, and the rest's hold (zero tangent) means the keys
    //     from here on are shaped by each other alone. ---
    REST_KEY,                                                                                                                            // p 0.725
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
