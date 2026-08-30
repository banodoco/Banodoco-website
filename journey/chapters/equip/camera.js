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
// The lowest cap geometry sits at world y 2.47; the eye is at 1.15, more than a
// unit under it, so the gill surface is seen from underneath at every azimuth
// in frame. This is the same finding the phone Inspire close-up records in
// journey/portrait.js ("'from below' is bought by `rise` — the EYE below every
// release lip — not by the aim"), and it is what lets the aim stay shallow.
//
// THE PITCH IS AS SHALLOW AS THE PICTURE ALLOWS, and the ceiling is not taste —
// it is borrowed from the next chapter. Connect's ground network is revealed by
// a CAMERA-PURE quantity, `forward.y`, the downward component of the look axis
// (connect/index.js resolveNow), and the whole Equip -> Connect leg is that
// quantity unwinding from wherever this rest leaves it. Every degree of extra
// pitch here is route progress spent later in that leg before the network can
// draw at all, against a light schedule whose beats are its own. So the pose
// was chosen at the SHALLOW end of what still reads as an underside, and where
// that end is was found by shooting it, not by arithmetic. Every row below is a
// rendered 1440x900 frame of this chapter at its own rest, with its copy block
// and both chips live:
//
//     r / eye y / aim y     pitch    what the frame shows
//     4.3 / 1.05 / 3.30     27.6     the fan fills the frame corner to corner;
//                                    its lower edge crowds the copy block
//     4.6 / 1.10 / 3.20     24.5     open fan, long stalk — the most present
//                                    the specimen ever is
//     5.0 / 1.15 / 3.10     21.3     the same picture with air around it: the
//                                    fan open and whole, the stalk a full
//                                    column, a clear dark band for the copy <-
//     5.4 / 1.20 / 3.05     18.9     still an underside, but the specimen has
//                                    gone small in the frame
//     5.2 / 1.35 / 2.90     16.4     NOT AN UNDERSIDE. The near margin closes
//                                    over the fan and what reads is the DOME,
//                                    seen from slightly below — the ordinary
//                                    three-quarter this chapter exists to leave
//     7.0 / 1.60 / 2.75      9.3     a low three-quarter of the whole specimen
//
// The 18.9 and 16.4 rows are the useful ones: 2.5 deg apart, and between them
// the picture STOPS being the thing. An aim shallow enough to be free for
// Connect is an aim that does not show the gills, so the pose is pinned to the
// last row that still does (18.9), plus one row of margin — 21.3, the 5.0 row.
//
// fov 48 rather than the Inspire rest's 40: the widening is what holds the far
// rim inside the frame at this distance without dollying back out of the
// underside. It is also on the way to Connect's 62, so the leg out of here
// keeps opening rather than turning around.
export const EQUIP = { az: 200 * DEG, r: 5.0, y: 1.15, target: V(0, 3.10, 0), fov: 48 };

// The gaze's mid-arc control point — the CONTROL POINT of a quadratic bezier
// INSPIRE.target -> EQUIP.target, the same construction the arrival and the
// approach both use. It sits on the cap's outer flank, between the rim-side
// point the Inspire rest is aimed at and the underside centre this rest is
// aimed at, so the gaze walks along the cap and in under it continuously
// instead of cutting across open sky mid-swing.
const PIN = V(1.05, 2.86, -0.55);

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
    { t: 0.5, pos: V(-1.7101, 1.1500, -4.6985), tgt: V(0, 3.10, 0), fov: 48, hold: true, note: 'equip-rest' },
  ],
};
