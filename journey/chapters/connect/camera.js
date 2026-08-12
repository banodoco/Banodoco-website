// chapters/connect/camera.js — CONNECT's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// ONE MOVEMENT (2026-08-10, Hannah: "the transition from Inspire and Empower
// to Connect the Ecosystem feels a little bit stilted — it's like two
// separate movements... it could just naturally be one, more dramatic camera
// movement — like the one from the hero to the Inspire and Empower section").
//
// She named the reference exactly, and the reference is a MECHANISM, not a
// mood: the Mission -> Inspire arrival (inspire/camera.js arrival()) rides
// every channel — azimuth, radius, height, fov, gaze — on ONE shared
// trapezoidal ease, so all of them peak together and land together. This leg
// was the opposite, and measured so (401-sample drift-aware trace, 2026-08-10,
// journey-v6-plan/07-chapter-inspire.md): position speed was a single EARLY
// hump — 0 at the rest, peak 92 u/p at p 0.337, collapsed to ~10 u/p by
// p 0.43 — while the fov rate was a single LATE hump — ~30 deg/p through the
// swing, peaking at 253 deg/p at p 0.477, right where the position had died.
// Two channels, two peaks, a 9x speed trough between them: the eye reads a
// swing that ends, then a zoom that starts. Two movements, exactly as
// reported. (This is a different fault from the two this leg already had
// fixed: 6acceac cured a re-approach in the DISTANCE channel, e95820a a
// stall in the composed frame angle d — both were monotone here. The humps
// were never in any one channel's direction; they were in the ENVELOPES.)
//
// THE FIX IS THE REFERENCE'S OWN SHAPE. The whole travel — Inspire rest
// (p 0.260) to Connect rest (p 0.5230) — is now ONE analytic gesture,
// approach() below, composed by the director exactly as it composes the
// arrival (director.js: arrival | approach | keyed spline). All channels
// ride the arrival's own trapezoid (RAMP 0.18, peak 1.22x mean):
//
//   az     INSPIRE.az (115 deg) -> the rest's 61.81, on azEase — trapezoid
//          plus the same windowed orbit-breath the arrival carries, strictly
//          monotonic, breath zeroed (value AND slope) inside both ramps;
//   r, y   11 -> 9.0107, 2.0 -> 2.0, on the plain trapezoid (the dolly
//          must not wobble — arrival law). Since the 2026-08-12 rebalance the
//          HEIGHT channel is a constant: the rest sits at the eye height the
//          Inspire rest already established, so the leg is a swing, a close
//          and a gaze that walks down — and the "lower camera" Hannah asked
//          for is delivered against the PREVIOUS rest (2.647 -> 2.0), not by
//          moving the eye mid-gesture;
//   fov    40 -> 62, SAME trapezoid — this is what kills the late hump: the
//          widening now happens WITH the swing, not after it;
//   gaze   quadratic bezier INSPIRE.target -> rest target, bowed through
//          PIN2 (the upper stem) so the gaze slides off the cap, down the
//          stem, out to the ground network in one bow — C1, endpoints exact.
//
// Because az, fov and the gaze all ride affine(one shared ease), the
// composed-frame angle d = gazeYaw - camAz + 180 is monotone BY CONSTRUCTION
// (the e95820a fault cannot re-open), and every channel's rate profile is the
// same trapezoid — one hump, shared. Measured on the built gesture (see
// 07-chapter-inspire.md, 2026-08-10): one speed hump peaking mid-leg, fov
// and yaw peaking with it, subject distance 8.43 -> 10.40 monotone.
//
// BOTH ENDPOINTS ARE THE FROZEN APPROVED POSES, imported/derived rather than
// copied: u = 0 is INSPIRE (the same constants the arrival lands on — the
// D19 lesson: a seam disagreement is a hard cut), u = 1 is REST_KEY's pose
// exactly, which is also the keyed spline's first key (hold, zero tangent),
// so the gesture hands over with matching zero velocity. The trapezoid's
// zero-slope ends give both rests their ease-in/ease-out.
//
// THE REST SITS AT LEG-t 0.65 (route.js stops [0.65], 2026-08-10): the same
// pose at p 0.5230 instead of 0.490. The 0.15 of leg the dive gives up is
// spent on the approach — which is where the chapter's own ground-lighting
// arrival lives (index.js LIGHT_LO/HI), the FIFTH pacing request on that
// arrival. The dive keys below keep their shipped POSES (the straight dive
// line to the trunk, collinear with owned/camera.js's t 0.0 key, is the
// "one continuous dive" invariant) and only re-space in t; every owned key
// and the p 0.622+ spline (owned/leg.js's sampled range) are untouched.
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.38..0.60
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';
import { ORBIT_BREATH } from '../../constants.js';
import { INSPIRE } from '../inspire/camera.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* --- CONNECT rest: mushroom upper-LEFT and now CROPPED BY THE TOP EDGE, copy
   upper-RIGHT (ui.js CHAPTER_POSITION.connect = 'pos-topright'), the ground
   plane and its three hubs spread through the diagonal band between them.

   REBALANCED 2026-08-12 (Hannah: "the area below the 'Connected Community'
   text feels empty and the composition is unbalanced. Fix by moving the
   mushroom further out of frame, lowering the camera, or both"). Both levers
   are pulled, and they are the same lever twice:

     eye  2.647 -> 2.0   the camera comes DOWN, to the height the Inspire rest
                         already sits at (INSPIRE.y), so the height channel is
                         now constant across the gesture;
     aim  1.028 -> -0.7  the gaze drops 1.73 units BELOW the ground plane, which
                         is what actually fills the frame: pitch -8.91 ->
                         -14.65 deg, so the ground rises up the frame and the
                         cap leaves through the top.

   MEASURED at 1440x900 (the void is the dark gap between the copy block's
   bottom edge and the first ground content inside the copy's own x-span):

     void under the copy   254 px (28.2% of frame height) -> 121 px (13.4%)
     under-copy lit fill   0.095 -> 0.112
     luminance centroid y  0.452 -> 0.422 of frame height

   WHY NOT FURTHER. Aiming past about -0.3 with the eye left at 2.647 walks two
   of the organism's ROOT RIBBONS (organism.js §8) into the bottom-left corner
   at 14-15 screen px wide, where they read as flat opaque planks. That is not
   a bug in this pose: nearFade(z) tapers those ribbons for the HERO camera's
   +Z axis only ("ribbons thin out near the camera so they never project as
   wide bars"), and this chapter's camera stands off that axis, so it can get
   close to a full-width one. Dropping the EYE is what fixes it — at 2.0 the
   near ground is seen at a grazing angle and the widest ribbon in frame is
   7.6 px against the shipped pose's own 6.5, with none at all over 10 px.
   Measured across the aim/height grid; the eye height is the binding
   constraint, not the aim, which is why the aim can go as deep as it does.

   Also tried and rejected: trucking the aim right to push the mushroom further
   out sideways (tgt.x 1.827 -> 3.4 / 5.0). It closes the void a little more
   (112 / 107 px) but empties the band it is supposed to fill — the under-copy
   fill falls to 0.084 / 0.068 because the frame pans onto the sparse far side
   — and it drags the luminance centroid LEFT (0.414 -> 0.386 / 0.380), i.e. it
   makes the left-heaviness worse, which is the actual complaint. fov 68 brings
   the wide ribbons back; fov 56 is neutral. fov is untouched at 62. --- */
const REST_KEY = {
  t: 0.65,
  pos: V(7.943, 2.0, 4.256),
  tgt: V(1.827, -0.7, -4.067),
  fov: 62,
  hold: true,
  note: 'connect-rest',
};

// The approach gesture's two ends, derived — never copied — from the poses
// they must match: INSPIRE (the arrival's landing) and REST_KEY (the keyed
// spline's first hold).
const A1 = {
  az: Math.atan2(REST_KEY.pos.x, REST_KEY.pos.z),
  r: Math.hypot(REST_KEY.pos.x, REST_KEY.pos.z),
  y: REST_KEY.pos.y,
  fov: REST_KEY.fov,
};

// The gaze's mid-bow control point: the mid stem, a touch toward the
// stream side — the cap stays composed while the aim walks down the stem to
// the ground network (the same PIN idea the arrival's bezier uses). Chosen
// against the live frame: subject distance stays strictly monotone
// (8.43 -> 10.68, the only against-steps being the orbit-breath ripple at
// 2.8e-05 units, the same class and size the shipped gesture carries) and the
// mid-leg frame holds the whole organism while the ground rises into the
// lower two-thirds. y sits at the mid stem rather than the cap line
// (2.1 -> 1.8 -> 1.65): the bow aims the gaze downward EARLIER, which is what
// hands the chapter's camera-pure resolve its first draw at p ~0.35 — the
// front bound of the ground-lighting schedule (index.js LIGHT_LO) — while the
// composed frame keeps the cap inside the upper half throughout.
//
// 1.8 -> 1.65 (2026-08-12, with the rest rebalance above) BUYS BACK THE
// PRE-EXISTENCE LEAD, and nothing else. Dropping the eye to 2.0 makes the
// camera LESS pitched down through the middle of the leg than the 2.647 pose
// was (the gaze bow is aimed from lower, so the same control point is a
// shallower look), which pushed the camera-pure resolve's first draw 0.3514 ->
// 0.3547 and cut the lead the restage measured at 0.035 to 0.0313. The lead is
// the D16 guarantee that the visitor reads the web as PRE-EXISTING before one
// strand of it is lit, so it is not negotiable; the schedule is the other
// thing that is not negotiable (five requests for "slower" — moving LIGHT_LO
// to 0.3897 would have restored the lead by making the whole arrival 2.7%
// FASTER, which is the one direction this chapter may never move).
//
// PIN2.y is the free lever between those two: it moves the resolve without
// touching either endpoint, the schedule, or any channel's ease — approach()'s
// speed profile, peak/mean and every rate peak are bit-identical across the
// sweep below. Measured, first draw / lead against LIGHT_LO's fixed p 0.3860:
//
//     PIN2.y   1.80     1.65     1.50     1.35     1.20
//     first    0.3547   0.3488   0.3435   0.3389   0.3343
//     lead     0.0313   0.0372   0.0425   0.0471   0.0517
//
// 1.65 is the shallowest that clears the floor with margin (0.0372 against
// 0.035, and against the shipped tree's own 0.0346). Going deeper is free on
// the lead but walks the mid-leg gaze off the stem early for no gain, and the
// arm window is the other bound: seams.js arms this chapter at p 0.32, and
// the `amount` ramp there is eased in TIME, so a first draw that creeps back
// toward 0.32 would turn the arm into a visible fade. 1.65 keeps 0.029 of p
// between the arm and the first draw — the shipped tree's own 0.031.
const PIN2 = V(1.0, 1.65, -1.8);

function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

// The arrival's trapezoidal velocity profile, verbatim (inspire/camera.js):
// smoothstep ramps at both ends, CONSTANT rate through the middle, peak
// 1/(1 - RAMP) = ~1.22x the mean. One profile, every channel.
const RAMP = 0.18;
function trapEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const norm = 1 - RAMP;
  const ramp = (u) => RAMP * (u * u * u - (u * u * u * u) / 2);   // integral of smoothstep
  if (s < RAMP) return ramp(s / RAMP) / norm;
  if (s > 1 - RAMP) return 1 - ramp((1 - s) / RAMP) / norm;
  return (RAMP / 2 + (s - RAMP)) / norm;
}

// The plateau breathes (W3-B gap b), exactly as the arrival's does: windowed
// to zero (value AND derivative) inside both ramps, azimuth strictly
// monotonic, the ends and both rest poses untouched.
function azEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const w = smooth01(s / RAMP) * smooth01((1 - s) / RAMP);
  return trapEase(s)
    + ORBIT_BREATH.amp * Math.sin(2 * Math.PI * ORBIT_BREATH.cycles * s) * w;
}

/** The Inspire -> Connect gesture. `u` is gesture-local (0 = the Inspire
 *  rest, 1 = the Connect rest); the composer maps global p over
 *  [restProgress('inspire') .. restProgress('connect')] onto u. */
function approach(u, out) {
  const e = azEase(u);
  const m = trapEase(u);
  const az = INSPIRE.az + (A1.az - INSPIRE.az) * e;
  const r = INSPIRE.r + (A1.r - INSPIRE.r) * m;
  const y = INSPIRE.y + (A1.y - INSPIRE.y) * m;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  // Gaze: quadratic bezier INSPIRE.target -> REST_KEY.tgt bowed through PIN2
  // — C1-continuous, endpoints exact, the organism framed mid-swing while
  // the aim walks down the stem to the ground.
  const w0 = (1 - m) * (1 - m), w1 = 2 * m * (1 - m), w2 = m * m;
  out.target.set(
    w0 * INSPIRE.target.x + w1 * PIN2.x + w2 * REST_KEY.tgt.x,
    w0 * INSPIRE.target.y + w1 * PIN2.y + w2 * REST_KEY.tgt.y,
    w0 * INSPIRE.target.z + w1 * PIN2.z + w2 * REST_KEY.tgt.z,
  );
  out.fov = INSPIRE.fov + (A1.fov - INSPIRE.fov) * m;
  return out;
}

/** QA: a human-readable name for a gesture-local u (composer's poseNameAt). */
function approachName(u) {
  return `approach s=${Math.max(0, Math.min(1, u)).toFixed(2)}`;
}

export const CAMERA = {
  approach,
  approachName,
  keys: [
    // The travel OUT of this rest — the old drift + exit keys (t 0.77/0.91,
    // the 2026-08-04 "one continuous dive") — was retired 2026-08-11: the
    // whole Connect -> Owned leg is now owned/camera.js's dive() gesture
    // (Hannah: "3 movements but it should be 1.5"), which derives its u = 0
    // endpoint from THIS key. The director never evaluates the keyed spline
    // between the two rests.
    REST_KEY,                                                                                                         // p 0.5230  pitch -8.91 yaw -143.69  (hold)
  ],
};
