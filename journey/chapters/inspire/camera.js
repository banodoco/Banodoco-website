// chapters/inspire/camera.js — INSPIRE's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// Two pieces, exactly the shipped path:
//
//   arrival  the Mission -> Inspire gesture: Spike A's approved orbit,
//            re-aimed per D16 — a ~90 deg swing RIGHT toward the hero's
//            visible spore stream. Authored in GESTURE-LOCAL u (0 = the
//            mission rest / hero pose, 1 = the Inspire rest); the composer
//            maps global p over [0 .. restProgress('inspire')] onto u.
//            Gesture qualities (re-shaped 2026-08-04, Hannah: "one smooth
//            arc"): no roll, and radius / height / fov / target all evolve
//            TOGETHER with the azimuth swing on one shared trapezoid ease —
//            no early target pin, no deferred push-in, no phase change
//            anywhere between the hero pose and the Inspire rest.
//
//   keys     the rest hold + rest drift + the first exit-follow key, in
//            LEG-LOCAL t over the chapter's route span (0.14..0.38 on the
//            shipped route; global p in comments). Keys are never authored
//            in global p, so re-timing or inserting chapters never
//            invalidates them (merge doc §5).
import * as THREE from 'three';
import { ORBIT_BREATH } from '../../constants.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Inspire rest — D16 (Hannah, 2026-08-03) swung the camera RIGHT to az 78, off
// the rear three-quarter and onto the stream-side rim, so the spores the
// visitor was already watching are the spores the chapter organizes. D18
// (Hannah, 2026-08-05) keeps that intent and carries it FURTHER round:
// "reorientate ... a more advanced angle, such that the 3 streams coming from
// the edge of the mushroom are defined and just above the hero text ... it
// should be visible where they're coming from."
//
// WHY 115, AND WHY NOT FURTHER. Two quantities move against each other as the
// azimuth grows, and they were both measured on the real projection (a 201-
// sample drift-aware scrub of the rest, both aspects):
//
//   · LIP SPREAD. A rim point at cap azimuth `a` lands at screen-lateral
//     R*cos(az + a) and at depth R*sin(az + a); it is on the camera-facing
//     hemisphere only while sin(az + a) > 0. ArtCompute is frozen at a = 5.83
//     (334 deg), so az 116 would put it exactly at the nearest rim point and
//     both flanking lips symmetrically off it. That is the widest the three
//     release points ever project.
//   · BRAID OVERLAP. The plumes are strictly PARALLEL (anatomy.js explains
//     why), so past a point extra azimuth stops separating them and starts
//     laying them along one screen line. Measured minimum inter-plume screen
//     gap at 1440x900, gaps held at 1.15 rad: az 110 -> 59 px, az 115 -> 79,
//     az 120 -> 44, az 125 -> 35, az 130 -> 23, az 140 -> 3, az 150+ -> ~1.
//     Past ~125 the lips also cross behind the silhouette (facing < 0).
//
// 115 is where those meet: 79 px of dark sky between adjacent braids, all
// three lips still 0.20+ onto the near rim. Rotations of 95/100/105/110/120/
// 125/130/140/150/160/175 were all scored and rejected — see 07-chapter-
// inspire.md. Total arrival swing is now ~127 deg (hero az ~ -12 -> 115).
//
// THE EYE DROPS to y 2.0, below every release lip (the rim's world y runs
// 2.42..3.32 around the ring, and the three exits sit at 2.55 / 2.92 / 3.11).
// The lips are on the cap's UNDERSIDE: from above, the dome hides them and the
// plumes cross the whole cap before clearing it. Measured share of plume mass
// projecting inside the cap silhouette: y 2.9 -> 32%, y 2.5 -> 26%, y 2.0 ->
// 15%, y 1.0 -> 8%. y 2.0 is the compromise — the sources read, and the exit
// leg still only has to climb 0.9 to meet Connect at y 2.90 instead of 1.9.
// r 11 (from 9.1) and fov 40 (from 38) hold the widened cluster inside the
// frame without reaching the chapter's own fog (FOG_FAR 20).
export const INSPIRE = { az: 115 * DEG, r: 11, y: 2, target: V(2.633, 3.244, -0.566), fov: 40 };

// The gaze's mid-swing waypoint (was the old "early pin" target): the cap,
// biased a touch toward the stream side so the visible plume never leaves
// frame. Since the one-arc re-shape (2026-08-04) it is the CONTROL POINT of
// a quadratic bezier hero.target -> INSPIRE.target — the gaze bows through
// the cap continuously instead of locking onto it in the first 22%.
const PIN = V(0.5, 3.4, -0.1);

// Dead band at the head of the gesture: below this fraction of the arrival
// the camera IS the hero pose exactly — what makes #/mission and a cold load
// render the frozen hero composition, pixel for pixel. On the shipped route
// this is global p 0.040 (~1 vh of scroll): 0.040 / 0.26.
export const ARRIVAL_DEAD = 0.15384615384615385;

function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

// Trapezoidal velocity profile: smoothstep ramps at both ends, CONSTANT rate
// through the middle. Peak rate = 1/(1 - RAMP) = ~1.22x the mean.
//
// This replaces the cubic easeInOut Spike A used on the orbit azimuth. That
// ease peaks at 3x its own mean, which is fine for a 20 s autoplay but is
// exactly what the spike's own v2 note asked NOT to happen ("slower, constant
// angular feel") - and under a scrub it put a 145 deg/s whip in the middle of
// the swing at ordinary scroll speed. Measured peak here: ~39 deg/s.
const RAMP = 0.18;
function trapEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const norm = 1 - RAMP;
  const ramp = (u) => RAMP * (u * u * u - (u * u * u * u) / 2);   // integral of smoothstep
  if (s < RAMP) return ramp(s / RAMP) / norm;
  if (s > 1 - RAMP) return 1 - ramp((1 - s) / RAMP) / norm;
  return (RAMP / 2 + (s - RAMP)) / norm;
}

// W3-B gap b: the plateau breathes. Windowed to zero (value AND derivative)
// inside both ramps, so the ends, the zero-velocity joins and the rest poses
// are untouched; azimuth stays strictly monotonic.
function azEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const w = smooth01(s / RAMP) * smooth01((1 - s) / RAMP);
  return trapEase(s)
    + ORBIT_BREATH.amp * Math.sin(2 * Math.PI * ORBIT_BREATH.cycles * s) * w;
}

/** The arrival gesture. `u` is gesture-local (0 = mission rest, 1 = the
 *  Inspire rest); `hero` is the LIVE hero pose of whatever responsive
 *  composition booted (injected by the composer — the orbit must start from
 *  the framing that is actually on screen). */
function arrival(u, out, hero) {
  let s = (u - ARRIVAL_DEAD) / (1 - ARRIVAL_DEAD);
  if (s < 0) s = 0;
  // ONE shared progression (2026-08-04 re-shape): the azimuth keeps its
  // trapezoid + windowed orbit-breath (azEase — strictly monotonic, breath
  // zeroed at both ends), and radius, height, fov and gaze all ride the SAME
  // trapezoid (trapEase, no breath — the dolly must not wobble). Position
  // and gaze turn together the whole way: no pin phase, no push phase.
  const e = azEase(s);
  const m = trapEase(s);
  const az = hero.az + (INSPIRE.az - hero.az) * e;
  const r = hero.r + (INSPIRE.r - hero.r) * m;
  const y = hero.y + (INSPIRE.y - hero.y) * m;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  // Gaze: quadratic bezier hero.target -> INSPIRE.target bowed through PIN
  // (the cap) — C1-continuous, endpoints exact, the plume framed mid-swing.
  const w0 = (1 - m) * (1 - m), w1 = 2 * m * (1 - m), w2 = m * m;
  out.target.set(
    w0 * hero.target.x + w1 * PIN.x + w2 * INSPIRE.target.x,
    w0 * hero.target.y + w1 * PIN.y + w2 * INSPIRE.target.y,
    w0 * hero.target.z + w1 * PIN.z + w2 * INSPIRE.target.z,
  );
  out.fov = hero.fov + (INSPIRE.fov - hero.fov) * m;
  return out;
}

/** QA: a human-readable name for a gesture-local u (composer's poseNameAt). */
function arrivalName(u) {
  if (u <= ARRIVAL_DEAD) return 'mission-rest (hero pose, exact)';
  return `orbit s=${((u - ARRIVAL_DEAD) / (1 - ARRIVAL_DEAD)).toFixed(2)}`;
}

export const CAMERA = {
  arrival,
  arrivalName,
  // --- INSPIRE rest, the drift that holds it, and the exit that hands off ---
  //
  // The rest key MUST equal INSPIRE exactly: the arrival gesture owns p below
  // 0.26 and this keyed spline owns p at and above it, so any disagreement is
  // a hard cut at the seam. (It has been one: a half-finished D18 pass moved
  // INSPIRE and left this key on the old az 78, which snapped 37 deg of
  // azimuth and 2.1 of height across a single frame. If you re-aim the rest,
  // re-derive pos = (sin az, y, cos az) * r here in the same edit.)
  //
  // Then: ONE continuous widening toward the Connect ground rest (re-keyed
  // 2026-08-04, Hannah: the old exit pushed IN toward the stream, r 9.1 ->
  // ~5.6, and Connect pulled back OUT again — a felt zoom-in-then-out).
  // Connect's own first key is settled (f9e8317) at az 68.76 / y 2.90 /
  // fov 48 / subject-distance 8.79, so these two keys are solved to MEET it:
  // the gaze lerps toward Connect's target on a smoothstep, and each key's
  // radius is then solved from the aimed target so the camera-to-subject
  // DISTANCE grows monotonically — 8.49 -> 8.59 -> 8.71 -> 8.79 — rather than
  // the radius doing so (a shrinking radius here is a wider framing, because
  // the gaze is walking down the stem at the same time). fov 40 -> 48 grows
  // with it. Residual: the Hermite bows 0.14 below its running-max distance
  // around p 0.335 (1.7% of 8.5; 0.34 / 2.5% in portrait) — a wobble, not the
  // old zoom-in, which was 38%.
  //
  // AZIMUTH TURNS ONCE, AT THE HOLD. The arrival climbs -12 -> 115 and this
  // leg falls 115 -> 68.8 into Connect. That single reversal happens AT the
  // rest key, where `hold: true` forces a zero tangent — the camera comes to a
  // full stop before it turns, which is the only place a reversal can sit
  // without reading as a whip. Everything after the rest is monotone: az
  // 115 -> 103 -> 81 -> 68.8 -> 61.8 straight through the Connect rest.
  keys: [
    { t: 0.5,                pos: V(9.9694, 2.0000, -4.6488), tgt: V(2.633, 3.244, -0.566), fov: 40,    hold: true, note: 'inspire-rest' },   // p 0.260  az 115.0  d 8.49
    { t: 0.7166666666666667, pos: V(10.6540, 2.2490, -2.3000), tgt: V(2.219, 2.957, -0.842), fov: 42.22, note: 'inspire-rest-drift' },        // p 0.312  az 102.2  d 8.59
    { t: 0.9249999999999999, pos: V(9.6610, 2.6830, 1.7150), tgt: V(1.501, 2.460, -1.322), fov: 46.07 },                                      // p 0.362  az  79.9  d 8.71
  ],
};
