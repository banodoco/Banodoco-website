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

// Inspire rest — RESTAGED per D16 (Hannah, 2026-08-03): no longer the rear
// three-quarter. The camera swings RIGHT, toward the hero's one visible
// stream (the shed released at cap az ~5.83, carried +x by the breeze), and
// rests on the stream-side rim so the spores the visitor was already watching
// are the spores the chapter organizes. ~90 deg of swing instead of ~172; the
// stream stays in frame essentially the whole leg.
export const INSPIRE = { az: 78 * DEG, r: 9.1, y: 3.25, target: V(1.15, 3.95, -0.40), fov: 38 };

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
  // --- INSPIRE rest, and the drift that holds it (D16 restage: the rest is
  //     on the STREAM side, az ~78 deg — pos = (sin az, ., cos az) * r) ---
  // then: ONE continuous widening toward the Connect ground rest (re-keyed
  // 2026-08-04, Hannah: the old exit pushed IN toward the stream, r 9.1 ->
  // ~5.6, and Connect pulled back OUT again — a felt zoom-in-then-out).
  // From the rest the camera now sinks and recedes in a single monotone
  // zoom-out: camera-to-subject distance and fov only ever grow, and the
  // gaze slides off the cap down the stem toward the ground as the descent
  // proceeds. (The widening continues seamlessly in connect/camera.js.)
  keys: [
    { t: 0.5,                pos: V(8.901, 3.25, 1.892), tgt: V(1.15, 3.95, -0.40), fov: 38,   hold: true, note: 'inspire-rest' },   // p 0.260  d 8.11
    { t: 0.7166666666666667, pos: V(8.950, 3.18, 2.150), tgt: V(1.10, 3.75, -0.55), fov: 39.5, note: 'inspire-rest-drift' },         // p 0.312  d 8.32
    { t: 0.9249999999999999, pos: V(8.550, 2.95, 2.850), tgt: V(0.95, 2.90, -0.90), fov: 44 },                                       // p 0.362  d 8.48
  ],
};
