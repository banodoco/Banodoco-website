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
//            Gesture qualities (frozen at G2a/D16 review): no roll, early
//            target pin, constant radius, gentle push-in in the last 20%.
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

const SWING_Y = 2.9;              // Plate II: "cam y 2.25 -> ~2.9"
const PIN = V(0.5, 3.4, -0.1);    // cap lock, biased a touch toward the stream
                                  // side so the visible plume never leaves frame
const PUSH_START = 0.80;          // the push-in lives ONLY in the last 20%

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

const _ot = new THREE.Vector3();

/** The arrival gesture. `u` is gesture-local (0 = mission rest, 1 = the
 *  Inspire rest); `hero` is the LIVE hero pose of whatever responsive
 *  composition booted (injected by the composer — the orbit must start from
 *  the framing that is actually on screen). */
function arrival(u, out, hero) {
  let s = (u - ARRIVAL_DEAD) / (1 - ARRIVAL_DEAD);
  if (s < 0) s = 0;
  const e = azEase(s);
  const az = hero.az + (INSPIRE.az - hero.az) * e;
  const pin = smooth01(s / 0.22);                              // target locks on the cap early
  const push = smooth01((s - PUSH_START) / (1 - PUSH_START));  // deferred push-in
  const lift = smooth01((s - 0.06) / 0.58);                    // gentle rise to swing height
  const r = hero.r + (INSPIRE.r - hero.r) * push;              // CONSTANT radius until s = 0.8
  const y = hero.y + (SWING_Y - hero.y) * lift + (INSPIRE.y - SWING_Y) * push;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  out.target.copy(_ot.lerpVectors(hero.target, PIN, pin).lerp(INSPIRE.target, push));
  out.fov = hero.fov + (INSPIRE.fov - hero.fov) * push;
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
  // then: follow ONE plume backward + downward toward its release rim
  // (GB-2.1, re-keyed for D16) — the guide plume is ArtCompute, the hero's
  // own visible stream (cap az ~5.83, rim release ~(1.97, 3.0, -0.95)): the
  // path descends along the stream toward its release point, so the cap
  // climbs the frame and occludes the sky exactly as before, just from the
  // stream side. (The descent continues in connect/camera.js.)
  keys: [
    { t: 0.5,                pos: V(8.901, 3.25, 1.892), tgt: V(1.15, 3.95, -0.40), fov: 38,   hold: true, note: 'inspire-rest' },   // p 0.260
    { t: 0.7166666666666667, pos: V(8.300, 3.22, 1.500), tgt: V(1.30, 3.80, -0.50), fov: 38.5, note: 'inspire-rest-drift' },         // p 0.312
    { t: 0.9249999999999999, pos: V(5.600, 3.05, 0.550), tgt: V(1.70, 3.30, -0.75), fov: 42 },                                       // p 0.362
  ],
};
