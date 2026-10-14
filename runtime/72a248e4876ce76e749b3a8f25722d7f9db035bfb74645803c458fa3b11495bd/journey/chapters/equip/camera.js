// chapters/equip/camera.js — EQUIP's camera leg (M4: chapters own their legs;
// the director composes them per route.js).
//
// THE BRIEF, in the owner's words: clicking Equip should carry the camera from
// the front-facing view AROUND the specimen to the back and the underside, and
// settle in a stable, composed, upward-looking view beneath the cap. Two things
// have to be legible from that rest — the STALK, and the GILLS the spores leave
// from — and it must never read as gimmick, vertigo, or a cramped box.
//
// One piece, exactly the shipped path:
//
//   arc      the Inspire -> Equip gesture, authored in GESTURE-LOCAL u
//            (0 = the Inspire rest, 1 = the Equip rest); the composer maps
//            global p over [restProgress('inspire') .. restProgress('equip')]
//            onto u. It carries the arrival's own qualities verbatim: no roll,
//            and azimuth / radius / height / fov / gaze all evolve TOGETHER on
//            one shared trapezoid, so every channel peaks together and lands
//            together (inspire/camera.js's 2026-08-04 re-shape, and the law
//            connect/camera.js restates: one movement, not two).
//
//   keys     the rest hold, in LEG-LOCAL t over the chapter's route span
//            (0.26..0.38 on the shipped route). Never authored in global p, so
//            re-timing or inserting chapters cannot invalidate it.
//
// THE DEPARTURE IS NOT HERE, and that is deliberate. Equip -> Connect is
// connect/camera.js's own `approach()` gesture, composed from THIS rest instead
// of the Inspire rest — see the `from` parameter there. That leg's shape,
// its PIN2 gaze bow and the pre-existence lead it is tuned against all belong
// to the chapter it arrives at; re-authoring a second copy of them here would
// have given Connect two owners for one movement.
import * as THREE from 'three';
import { trapEase, azEase, quadBezier } from '../../lib/ease.js';
import { INSPIRE } from '../inspire/camera.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// EQUIP rest — the underside pose.
//
// AZIMUTH 200, AND THE DIRECTION IS THE POINT. The arrival already turns one
// way and one way only: hero az -12 -> Inspire az 115, a 127 deg swing to the
// right. Carrying on in the SAME direction to 200 is what makes this read as
// going round the specimen rather than doubling back past where the visitor has
// already been — and 200 is behind it, 212 deg of turn from the hero pose, with
// the front the visitor booted on now fully out of frame. Nothing reverses
// until the Connect approach, and that reversal happens AT this rest, where
// `hold: true` forces a zero tangent: the camera comes to a full stop before it
// turns, which is the only place a reversal can sit without reading as a whip
// (inspire/camera.js states the same rule for its own single reversal).
//
// WHY NOT FURTHER ROUND. Two ceilings, both measured on the built frame:
//   · Inspire's exit furniture closes on a windowed azimuth ramp — its master
//     carries a `far` term of 1 - smoothstep(150, 220) (inspire/index.js), so
//     the rim-link web and strand furniture are at 0.33 of full here and gone
//     by 220. Past that the specimen loses the filigree that makes the gill fan
//     read as structure rather than as a flat disc.
//   · The cap LEANS toward geometry azimuth 3.6 rad, i.e. camera az 244, where
//     the rim droops lowest (rimYoff's -0.16*lean term, anatomy.js). Standing
//     under the drooping side puts the near margin between the eye and the
//     gills; 200 keeps the near rim lifted enough to see under it while still
//     being behind the specimen.
//
// THE EYE IS BELOW THE RIM AND THAT — NOT THE AIM — IS WHAT BUYS "FROM BELOW".
// The lowest cap geometry sits at world y 2.47; the eye is at 0.85, more than
// one and a half units under it, and at r 2.4 it stands ON the rim's own
// footprint (rim radius ~2.35-2.6), so the fan is not a subject ahead of the
// camera but a ceiling over it. This is the same finding the phone Inspire
// close-up records in journey/portrait.js ("'from below' is bought by `rise` —
// the EYE below every release lip — not by the aim"), taken to where this
// chapter was always pointed.
//
// THE PITCH IS STEEP ON PURPOSE (R3, the owner's direction: "facing up at a
// really high angle, almost into the sky, but covered by the underside of it —
// an extreme angle, and a lot more elegant"). The look axis climbs 49.2 deg,
// against the 21.3 the previous rest held. That earlier shallow ceiling was
// borrowed from Connect — its ground network resolves on `forward.y`, the
// downward component of the look axis (connect/index.js resolveNow), and every
// degree of pitch here is route progress the Equip -> Connect leg spends
// unwinding before the network can draw. The borrowing is now repaid in
// measurement instead of shallowness: with this pose the resolve's first draw
// and full arrival were re-measured over the whole leg by the property sweep
// in tools/test-connect-motion.mjs — all eleven compositions — and both still
// land before the rest, with the monotone rise that sweep demands. The
// steeper start costs leg progress, not the guarantee.
//
// The pose itself, judged on rendered 1440x900 frames with copy and chips
// live (the survey walked r 3.4 -> 1.9, pitch 37 -> 60): at r 2.8 the frame is
// still a specimen seen from below; at r 1.9 / 60 deg the near lattice starts
// to abstract. r 2.4 with the aim at (0.45, 3.85, 0) is the seat between —
// the gill fan radiates corner to corner overhead like a lit ceiling, the far
// rim sweeps the lower right into open dark, and the stalk rises just right of
// centre from the frame's bottom edge to the throat, anchoring the headline's
// own corner. The 0.45 of aim-x is composition, not geometry: it seats the
// throat on the frame's right third and hands the copy block the calmer
// left field under the fan's fading edge.
//
// fov 56 rather than the Inspire rest's 40: at r 2.4 the widening is what
// keeps both the throat and a long run of the fan inside one frame without
// dollying back out from under the canopy. It is also on the way to Connect's
// 62, so the leg out of here keeps opening rather than turning around.
export const EQUIP = { az: 200 * DEG, r: 2.4, y: 0.85, target: V(0.45, 3.85, 0), fov: 56 };

// The gaze's mid-arc control point — the CONTROL POINT of a quadratic bezier
// INSPIRE.target -> EQUIP.target, the same construction the arrival and the
// approach both use. It sits on the cap's outer flank, between the rim-side
// point the Inspire rest is aimed at and the underside centre this rest is
// aimed at, so the gaze walks along the cap and in under it continuously
// instead of cutting across open sky mid-swing.
const PIN = V(1.05, 2.90, -0.55);

/** The Inspire -> Equip gesture. `u` is gesture-local (0 = the Inspire rest,
 *  1 = the Equip rest); the composer maps global p over
 *  [restProgress('inspire') .. restProgress('equip')] onto u. */
function arc(u, out) {
  // ONE shared progression: the azimuth keeps the trapezoid plus the windowed
  // orbit-breath (azEase — strictly monotonic, breath zeroed at both ends), and
  // radius, height, fov and gaze all ride the SAME trapezoid (trapEase, no
  // breath — the dolly must not wobble).
  const e = azEase(u);
  const m = trapEase(u);
  const az = INSPIRE.az + (EQUIP.az - INSPIRE.az) * e;
  const r = INSPIRE.r + (EQUIP.r - INSPIRE.r) * m;
  const y = INSPIRE.y + (EQUIP.y - INSPIRE.y) * m;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  quadBezier(m, INSPIRE.target, PIN, EQUIP.target, out.target);
  out.fov = INSPIRE.fov + (EQUIP.fov - INSPIRE.fov) * m;
  return out;
}

export const CAMERA = {
  arc,
  keys: [
    // The rest key MUST equal EQUIP exactly, in every channel: the arc owns p
    // below the rest and connect/camera.js's approach owns p at and above it,
    // so any disagreement between the three parameterisations is a hard cut at
    // the seam. (Inspire's own file records what that costs when it is allowed
    // to drift — a half-finished pass left its key on a retired azimuth and
    // snapped 37 deg across one frame.) If you re-aim this rest, re-derive
    // pos = (sin az, y, cos az) * r here in the same edit.
    //
    // Nothing evaluates this key today — the director runs the analytic
    // gestures from the hero all the way to the Owned rest and only reaches the
    // keyed spline above it. It is declared for the same reason Inspire's is:
    // it is the arc's landing and the approach's departure, and a seam with no
    // written-down pose is a seam nobody can check.
    { t: 0.5, pos: V(-0.8208, 0.8500, -2.2553), tgt: V(0.45, 3.85, 0), fov: 56, hold: true, note: 'equip-rest' },
  ],
};
