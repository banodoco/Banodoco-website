// journey-v6 — camera director. ONE continuous, reversible path through the
// five resting poses of the approved camera map (journey-v6-plan/map/
// page2-camera.html), authored in the hero's own world coordinates against
// real anatomy (adr-d3-world-layout.md: one organism, five vantages).
//
// Two parameterisations, joined with matching zero velocity at p = 0.26:
//
//   p <= 0.26  the Mission -> Inspire leg: Spike A's approved orbit GESTURE
//              (target pins to the cap early, constant radius until the last
//              20%, no roll, gentle late push-in) re-aimed per D16 — a ~90 deg
//              swing RIGHT toward the hero's visible spore stream, never away
//              from it. Adapted here, not imported from spike-a/.
//   p >= 0.26  a keyed path sampled with non-uniform Catmull-Rom / Hermite,
//              with tangents forced to zero at every resting pose so each
//              composition eases in and eases out with no velocity step.
//
// Nothing in this file cuts. Every value is a pure function of p, which is
// what makes reverse scrubbing identical to forward scrubbing.

import * as THREE from 'three';
import {
  FOG_RAMP, HANDHELD, ORBIT_BREATH, SEAM_FOG_DIPS, CHAPTERS, restProgress,
} from './constants.js';
import { applyPortrait } from './portrait.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ================================================================
   1. Mission -> Inspire: Spike A's orbit, adapted
   ================================================================ */
// Hero desktop pose, cylindrical about the stipe axis. These are the numbers
// the hero page actually boots with (panX -2.4 => x = 0.15 - 2.4).
export const HERO = {
  az: Math.atan2(-2.25, 10.4),   // ~ -0.213 rad
  r: Math.hypot(2.25, 10.4),     // ~ 10.64
  y: 2.25,
  target: V(-2.4, 2.6, 0),
  fov: 38,
};
// Inspire rest — RESTAGED per D16 (Hannah, 2026-08-03): no longer the rear
// three-quarter. The camera swings RIGHT, toward the hero's one visible
// stream (the shed released at cap az ~5.83, carried +x by the breeze), and
// rests on the stream-side rim so the spores the visitor was already watching
// are the spores the chapter organizes. ~90 deg of swing instead of ~172; the
// stream stays in frame essentially the whole leg. Gesture qualities kept:
// no roll, early target pin, constant radius, gentle push-in in the last 20%.
export const INSPIRE = { az: 78 * DEG, r: 9.1, y: 3.25, target: V(1.15, 3.95, -0.40), fov: 38 };

const SWING_Y = 2.9;              // Plate II: "cam y 2.25 -> ~2.9"
const PIN = V(0.5, 3.4, -0.1);    // cap lock, biased a touch toward the stream
                                  // side so the visible plume never leaves frame
const PUSH_START = 0.80;          // the push-in lives ONLY in the last 20%

// The orbit occupies p in [ORBIT_P0, ORBIT_P1]. Below ORBIT_P0 the camera is
// the hero pose EXACTLY - that dead band is what makes #/mission and a cold
// load render the frozen hero composition, pixel for pixel. It is kept short
// (~1 vh of scroll) because scrolling through a band where nothing moves is
// dead weight; the "restrained flow toward the cap" the map asks for is the
// ramp at the head of the orbit itself, where the target pins to the cap and
// the camera lifts while the azimuth has barely started to turn.
export const ORBIT_P0 = 0.040;
export const ORBIT_P1 = 0.260;    // == restProgress('inspire')

function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

// Trapezoidal velocity profile: smoothstep ramps at both ends, CONSTANT rate
// through the middle. Peak rate = 1/(1 - RAMP) = ~1.22x the mean.
//
// This replaces the cubic easeInOut Spike A used on the orbit azimuth. That
// ease peaks at 3x its own mean, which is fine for a 20 s autoplay but is
// exactly what the spike's own v2 note asked NOT to happen ("slower, constant
// angular feel") - and under a scrub it put a 145 deg/s whip in the middle of
// the swing at ordinary scroll speed. Measured peak here: ~39 deg/s. The
// SHAPE of the approved orbit (rear three-quarter, early target pin, constant
// radius, push-in in the last 20%, no roll) is unchanged; only the timing
// profile along it is, and timing is the grey-box's decision to make (05 GB-3).
const RAMP = 0.18;
function trapEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const norm = 1 - RAMP;
  const ramp = (u) => RAMP * (u * u * u - (u * u * u * u) / 2);   // integral of smoothstep
  if (s < RAMP) return ramp(s / RAMP) / norm;
  if (s > 1 - RAMP) return 1 - ramp((1 - s) / RAMP) / norm;
  return (RAMP / 2 + (s - RAMP)) / norm;
}

// W3-B gap b: the plateau breathes. A conveyor-constant swing is analytically
// correct and feels machined; a real operator's pan drifts a few percent
// around its mean. The deviation is windowed to zero (value AND derivative)
// inside both ramps, so the ends, the zero-velocity joins and the rest poses
// are untouched, and its peak slope (amp * 2pi * cycles ~= 0.107) is far
// below the plateau slope (~1.22), so azimuth stays strictly monotonic —
// no new whip, no reversal.
function azEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const w = smooth01(s / RAMP) * smooth01((1 - s) / RAMP);
  return trapEase(s)
    + ORBIT_BREATH.amp * Math.sin(2 * Math.PI * ORBIT_BREATH.cycles * s) * w;
}

const _ot = new THREE.Vector3();
// `hero` is injected so the orbit can start from the LIVE hero pose of
// whatever responsive composition booted (desktop / deskNarrow / compact /
// tablet / mobile). The module default is the authored desktop pose, which is
// what the pure QA sampler uses.
function orbitPose(s, out, hero = HERO) {
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

/* ================================================================
   2. Inspire -> Connect -> Owned -> Final: keyed path
   ================================================================
   `hold: true` forces a zero tangent, i.e. the pose is a resting pose the
   camera eases into and out of. Rest anchors are exactly restProgress(id):
   inspire 0.26, connect 0.49, owned 0.725, final 0.925.                     */
const KEYS = [
  // --- INSPIRE rest, and the drift that holds it (D16 restage: the rest is
  //     on the STREAM side, az ~78 deg — pos = (sin az, ., cos az) * 8.3) ---
  { p: 0.260, pos: V(8.901, 3.25, 1.892), tgt: V(1.15, 3.95, -0.40), fov: 38, hold: true, note: 'inspire-rest' },
  { p: 0.312, pos: V(8.300, 3.22, 1.500), tgt: V(1.30, 3.80, -0.50), fov: 38.5, note: 'inspire-rest-drift' },
  // --- follow ONE plume backward + downward toward its release rim (GB-2.1,
  //     re-keyed for D16) --- the guide plume is ArtCompute — the hero's own
  //     visible stream, cap az ~5.83, rim release ~(1.97, 3.0, -0.95): the
  //     path descends along the stream toward its release point, so the cap
  //     climbs the frame and occludes the sky exactly as before, just from
  //     the stream side.
  { p: 0.362, pos: V(5.600, 3.05, 0.550), tgt: V(1.70, 3.30, -0.75), fov: 42 },
  { p: 0.410, pos: V(3.550, 2.85, -0.350), tgt: V(1.90, 3.05, -1.00), fov: 48 },
  // T2 fires in here: slipping under the lifted rim beside the stream release
  { p: 0.446, pos: V(2.300, 2.62, -1.300), tgt: V(0.60, 3.14, -0.70), fov: 55 },
  { p: 0.470, pos: V(1.700, 2.40, -1.600), tgt: V(-0.60, 3.34, 0.05), fov: 58 },
  // --- CONNECT rest: wide low angle in the chamber, looking up ~18 deg ---
  { p: 0.490, pos: V(1.430, 2.15, -1.170), tgt: V(-1.50, 3.50, 0.40), fov: 60, hold: true, note: 'connect-rest' },
  { p: 0.532, pos: V(1.280, 2.16, -1.030), tgt: V(-1.62, 3.48, 0.56), fov: 60, note: 'connect-rest-drift' },
  // --- lateral across the chamber to the stipe-cap junction (GB-2.2) ---
  // The gaze has to travel ~90 deg of PITCH between "looking up in the
  // chamber" and "looking down the stipe". That turn is spread deliberately
  // across p 0.575-0.690 (~11% of the journey, ~1.5 vh of scroll) so it reads
  // as a tilt, not a whip: the measured peak stays near 1.2 k deg per unit p,
  // i.e. ~90 deg/s at an ordinary scroll speed.
  { p: 0.575, pos: V(0.960, 2.06, -0.200), tgt: V(-0.85, 3.32, 0.90), fov: 58 },  // pitch +31
  { p: 0.600, pos: V(0.880, 2.00, 0.420), tgt: V(-0.60, 2.90, 1.30), fov: 55 },   // pitch +28
  { p: 0.622, pos: V(0.920, 1.80, 0.800), tgt: V(-0.55, 2.10, 1.55), fov: 53 },   // pitch +10
  // --- EXTERIOR stipe-side descent. Horizontal radius never drops below ~1.2
  //     while stem radius is <= 0.69, so the camera is always OUTSIDE the
  //     stipe - the deferred Equip interior is never entered.
  { p: 0.645, pos: V(0.940, 1.42, 0.940), tgt: V(-0.30, 1.20, 1.35), fov: 51 },   // pitch -10
  { p: 0.668, pos: V(0.920, 0.85, 0.920), tgt: V(-0.10, 0.10, 1.00), fov: 50 },   // pitch -36
  // T3 soil-line crossing lands at p ~ 0.693
  { p: 0.690, pos: V(0.860, 0.15, 0.860), tgt: V(-0.10, -0.85, 0.70), fov: 50 },  // pitch -46
  // levelling into the glide: spread over three keys so the pitch comes up at
  // ~60 deg/s rather than the ~96 deg/s a two-key version measured
  { p: 0.700, pos: V(0.720, -0.42, 0.720), tgt: V(-0.70, -1.30, 0.42), fov: 51 }, // pitch -31
  { p: 0.710, pos: V(0.420, -0.92, 0.580), tgt: V(-1.35, -1.52, 0.34), fov: 52 }, // pitch -19
  { p: 0.718, pos: V(0.050, -1.22, 0.420), tgt: V(-2.20, -1.55, 0.24), fov: 53 }, // pitch -8
  // --- OWNED rest: the underground glide, drifting -X away from the stipe ---
  { p: 0.725, pos: V(-0.400, -1.40, 0.300), tgt: V(-3.20, -1.45, 0.10), fov: 54, hold: true, note: 'owned-rest' },
  // --- growth-front rise-tilt-recede: ONE continuous gesture (W3-B gap c),
  //     RE-AIMED for W4-D (Hannah's direction: the hero organism is PART of
  //     the Final scene — the pullback reveals the whole fairy ring with the
  //     hero on its arc, so the previous "keep the hero out of frame" intent
  //     is reversed). The gesture qualities the review approved are kept:
  //     one continuous rise-tilt-recede; yaw spread nearly evenly (interval
  //     means 833-970 deg/p, in the ~964 family, lead-out during the drift
  //     at ~350); pitch rises to ~+9.5 through the substrate and eases down
  //     into the cutaway's -8.8 with a single crest, no nod; the recede
  //     continues the arrival vector (both normalize to ~(-0.91, 0.37,
  //     0.17)) so the rest is a pause on one continuing line. The gaze
  //     sweeps ~176 deg around the horizon during the rise — past the dark
  //     outward field, across the far arc of the ring — and the hero slides
  //     into frame-right only during the settle, one lit body among the
  //     others (chapters/final-world.js places the ring about RING_C
  //     (-6, -0.8) with the hero ON the arc).
  { p: 0.782, pos: V(-3.300, -1.40, 0.350), tgt: V(-6.22, -1.46, -0.95), fov: 54, note: 'owned-rest-drift' },
  { p: 0.812, pos: V(-5.300, -1.02, 0.780), tgt: V(-7.52, -0.77, -2.06), fov: 53.5 },
  // T4 fires in here: the camera clears the soil-line at p ~ 0.86
  { p: 0.845, pos: V(-7.700, -0.20, 1.250), tgt: V(-8.28, 0.47, -2.91), fov: 52.5 },
  { p: 0.878, pos: V(-10.200, 1.05, 1.800), tgt: V(-7.92, 1.98, -3.32), fov: 51 },
  { p: 0.905, pos: V(-12.300, 1.75, 2.250), tgt: V(-5.71, 1.68, -3.28), fov: 48 },
  // --- FINAL rest: oblique cutaway recession from OUTSIDE the ring's west
  //     arc, gaze cutting across the ring chord. Shallow ~8.8 deg down-pitch
  //     puts the soil-line across the frame on a diagonal: fairy ring and
  //     spore sky above it, the colony in section below, the hero organism
  //     ~12.6 deg right of centre at 14.8 units — in family with the mature
  //     members, never the centre of the composition. The near arc passes
  //     behind the camera (members cleared > 3 units off the path, Spike B's
  //     clearance rule). Tilt is PITCH ONLY, never roll.
  { p: 0.925, pos: V(-14.72, 2.73, 2.700), tgt: V(-3.06, 0.83, -1.94), fov: 45.5, hold: true, note: 'final-rest' },
  { p: 1.000, pos: V(-17.73, 3.95, 3.260), tgt: V(-5.44, 2.08, -0.97), fov: 44, hold: true, note: 'final-recede' },
];

// Non-uniform Catmull-Rom tangents, zeroed at rest keys.
const TAN = KEYS.map((k, i) => {
  if (k.hold) return { pos: V(0, 0, 0), tgt: V(0, 0, 0), fov: 0 };
  const a = KEYS[i - 1] || k, b = KEYS[i + 1] || k;
  const h = Math.max(b.p - a.p, 1e-6);
  return {
    pos: b.pos.clone().sub(a.pos).divideScalar(h),
    tgt: b.tgt.clone().sub(a.tgt).divideScalar(h),
    fov: (b.fov - a.fov) / h,
  };
});

const _k0 = new THREE.Vector3(), _k1 = new THREE.Vector3();
function hermite(p0, m0, p1, m1, h, u, out) {
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return out.copy(p0).multiplyScalar(h00)
    .add(_k0.copy(m0).multiplyScalar(h10 * h))
    .add(_k1.copy(p1).multiplyScalar(h01))
    .add(_k0.copy(m1).multiplyScalar(h11 * h));
}

function keyedPose(p, out) {
  if (p <= KEYS[0].p) { out.pos.copy(KEYS[0].pos); out.target.copy(KEYS[0].tgt); out.fov = KEYS[0].fov; return out; }
  const last = KEYS[KEYS.length - 1];
  if (p >= last.p) { out.pos.copy(last.pos); out.target.copy(last.tgt); out.fov = last.fov; return out; }
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1], h = b.p - a.p;
  const u = (p - a.p) / h;
  hermite(a.pos, TAN[i].pos, b.pos, TAN[i + 1].pos, h, u, out.pos);
  hermite(a.tgt, TAN[i].tgt, b.tgt, TAN[i + 1].tgt, h, u, out.target);
  const u2 = u * u, u3 = u2 * u;
  out.fov = (2 * u3 - 3 * u2 + 1) * a.fov + (u3 - 2 * u2 + u) * h * TAN[i].fov
          + (-2 * u3 + 3 * u2) * b.fov + (u3 - u2) * h * TAN[i + 1].fov;
  return out;
}

/* ================================================================
   2b. Documentary handheld layer (W3-B gap a)
   ================================================================ */
// A seeded sine bank — deterministic, reproducible, no Math.random anywhere.
// Three incommensurate frequencies per channel inside 0.045-0.27 Hz (periods
// of ~4-22 s): slow enough to read as an operator holding a frame, never as
// shake or sway-lag. Purely additive on the analytic pose — no springs, no
// history — so it can never lag the path or overshoot it.
const HH_BANK = (() => {
  let s = 1337 >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mk = (fLo, fHi) => [0, 1, 2].map(i => ({
    f: (fLo + ((fHi - fLo) * (i + 0.25 + rnd() * 0.5)) / 3) * 2 * Math.PI,
    ph: rnd() * 2 * Math.PI,
    a: 1 / (i + 1.6),
  }));
  return {
    yaw: mk(0.045, 0.22), pitch: mk(0.055, 0.26),
    px: mk(0.05, 0.16), py: mk(0.065, 0.19),
  };
})();
function hhSample(bank, t) {
  let v = 0, n = 0;
  for (const o of bank) { v += Math.sin(t * o.f + o.ph) * o.a; n += o.a; }
  return v / n;
}
// Rest anchors (plus the terminal hold): handheld amplitude is EXACTLY zero
// within HANDHELD.restFadeP of each, so every rest pose stays byte-identical
// and the 0 -> 1 -> 0 pose audit is unaffected.
const HH_ANCHORS = CHAPTERS.map(c => restProgress(c.id)).concat([1]);

/* ================================================================
   3. The public pose function
   ================================================================ */
const _pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };

/** Pure: journey progress -> camera pose. No state, no time, no randomness -
 *  which is exactly why the path reverses perfectly and why ?p= sampling is a
 *  valid audit of the whole route.
 *
 *  `aspect` selects the composition: >= 1 (the default) is the landscape
 *  path, bit-identical to what this function has always returned; < 1 blends
 *  in the authored portrait field (core/portrait.js, PL-1.1). Passed in, not
 *  read from any global, so capture tooling can request either orientation
 *  from any window. */
export function poseAt(p, out = _pose, hero = HERO, aspect = 1.6) {
  if (p <= ORBIT_P0) orbitPose(0, out, hero);
  else if (p < ORBIT_P1) orbitPose((p - ORBIT_P0) / (ORBIT_P1 - ORBIT_P0), out, hero);
  else keyedPose(p, out);
  return applyPortrait(out, p, aspect);
}

/** Name of the nearest authored key - used by the QA audit, not by rendering. */
export function poseNameAt(p) {
  if (p <= ORBIT_P0) return 'mission-rest (hero pose, exact)';
  if (p < ORBIT_P1) return `orbit s=${((p - ORBIT_P0) / (ORBIT_P1 - ORBIT_P0)).toFixed(2)}`;
  let best = KEYS[0], d = Infinity;
  for (const k of KEYS) { const dd = Math.abs(k.p - p); if (dd < d) { d = dd; best = k; } }
  return `${best.note || 'travel'} (nearest key p=${best.p})`;
}

export function createDirector(sceneApi, { steady = false } = {}) {
  const { camera, controls, scene } = sceneApi;
  const baseFogNear = scene.fog ? scene.fog.near : 7;
  const baseFogFar = scene.fog ? scene.fog.far : 20;
  const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };

  // The hero's own responsive setView() would fight the director on a
  // breakpoint change (its 'view-tween' animator is registered AFTER ours and
  // would win for 0.6s). Once the journey owns the camera we hold that call
  // and replay it when the camera is handed back at p = 0.
  let owned = false;
  const rawSetView = sceneApi.setView;
  let pendingView = null;
  sceneApi.setView = (v, secs) => {
    if (owned) { pendingView = v; captureHero(v); return; }
    return rawSetView(v, secs);
  };

  // The orbit must start from the composition that actually booted, not from
  // the authored desktop numbers - otherwise the first scroll on a phone would
  // snap the framing. Captured live from the hero, refreshed on every
  // breakpoint change, frozen while the journey owns the camera.
  const hero = { az: HERO.az, r: HERO.r, y: HERO.y, target: HERO.target.clone(), fov: HERO.fov };
  const heroSnapshot = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };
  function captureHero(view) {
    // From an explicit view description (the hero's own responsive table)...
    if (view) {
      const x = 0.15 + (view.panX ?? 0), z = view.camZ ?? 10.4;
      hero.az = Math.atan2(x, z);
      hero.r = Math.hypot(x, z);
      hero.y = view.camY ?? 2.25;
      hero.target.set(view.panX ?? 0, view.targetY ?? 2.6, 0);
      hero.fov = view.fov ?? 38;
    } else {
      // ...or from the live camera, which is the truth at boot.
      hero.az = Math.atan2(camera.position.x, camera.position.z);
      hero.r = Math.hypot(camera.position.x, camera.position.z);
      hero.y = camera.position.y;
      hero.target.copy(controls.target);
      hero.fov = camera.fov;
    }
    heroSnapshot.pos.set(Math.sin(hero.az) * hero.r, hero.y, Math.cos(hero.az) * hero.r);
    heroSnapshot.target.copy(hero.target);
    heroSnapshot.fov = hero.fov;
  }

  // Portrait re-composition lives in core/portrait.js (authored per-rest
  // field, PL-1.1) and is blended inside poseAt itself. The director only
  // decides WHICH aspect the frame is composed for: the real viewport's, or
  // a QA override (?aspect=portrait forces the full portrait field in a wide
  // window, for capture tooling and desktop review; a number forces that
  // exact aspect; ?aspect=landscape pins the landscape path on a phone).
  const qAspect = new URLSearchParams(location.search).get('aspect');
  const forcedAspect =
    qAspect === 'portrait' ? 0.55
    : qAspect === 'landscape' ? 1.6
    : qAspect !== null && isFinite(parseFloat(qAspect)) ? parseFloat(qAspect)
    : null;

  /** Fog re-parameterisation for the Final pullback (adr-d3 seam T4), plus
   *  the W3-B seam dips (gap d). Everything here is pure in p, so reverse
   *  scrubbing restores Fog(bg, 7, 20) exactly. Near and far open on
   *  staggered schedules (gap c): far starts easing during the rise so the
   *  sky is already breathing open as the camera crests the soil; near holds
   *  the substrate's thickness longer and releases late. */
  function applyFog(p) {
    if (!scene.fog) return;
    const tf = smooth01((p - FOG_RAMP.farFromP) / (FOG_RAMP.farToP - FOG_RAMP.farFromP));
    const tn = smooth01((p - FOG_RAMP.nearFromP) / (FOG_RAMP.nearToP - FOG_RAMP.nearFromP));
    let near = baseFogNear + (FOG_RAMP.near - baseFogNear) * tn;
    let far = baseFogFar + (FOG_RAMP.far - baseFogFar) * tf;
    // T2 / T3: passing THROUGH something, not a parameter blend. The bell is
    // C1 at its centre and edges, zero at every rest anchor.
    for (const d of SEAM_FOG_DIPS) {
      const b = smooth01(1 - Math.abs(p - d.c) / d.w);
      if (b > 0) { near *= 1 - d.near * b; far *= 1 - d.far * b; }
    }
    scene.fog.near = near;
    scene.fog.far = far;
  }

  /* ---- handheld state (per-director, not per-pose: poseAt stays pure) ---- */
  let hhT = 0;             // documentary clock, advances only on live frames
  let hhLastP = 0;
  let hhSpeed = 0;         // smoothed |dp/dt|, p per second
  const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _up2 = new THREE.Vector3();
  const _worldUp = new THREE.Vector3(0, 1, 0);

  /** W3-B gap a: the handheld offset. Applied to the analytic pose only at
   *  apply() time — poseAt() stays pure, so the audit sampler and the path
   *  itself are untouched. Gated to exactly zero at rest anchors and under
   *  fast scrub; disabled entirely by ?steady=1. */
  function applyHandheld(out, p, dt) {
    if (steady) return;
    if (dt > 0) {
      hhT += dt;
      const inst = Math.abs(p - hhLastP) / dt;
      hhSpeed += (inst - hhSpeed) * Math.min(1, dt * 4);
    }
    hhLastP = p;
    let dMin = Infinity;
    for (const a of HH_ANCHORS) { const d = Math.abs(p - a); if (d < dMin) dMin = d; }
    const amp = smooth01(dMin / HANDHELD.restFadeP)
      * (1 - smooth01((hhSpeed - HANDHELD.scrubLo) / (HANDHELD.scrubHi - HANDHELD.scrubLo)));
    if (amp <= 0.001) return;
    _fwd.copy(out.target).sub(out.pos);
    const dist = _fwd.length();
    if (dist < 1e-4) return;
    _fwd.divideScalar(dist);
    _right.crossVectors(_fwd, _worldUp);
    if (_right.lengthSq() < 1e-6) return;    // gaze straight up/down never happens, but be safe
    _right.normalize();
    _up2.crossVectors(_right, _fwd);
    const angRad = HANDHELD.ampDeg * DEG * amp;
    const yawOff = hhSample(HH_BANK.yaw, hhT) * angRad * dist;
    const pitchOff = hhSample(HH_BANK.pitch, hhT) * angRad * 0.7 * dist;
    out.target.addScaledVector(_right, yawOff).addScaledVector(_up2, pitchOff);
    const pAmp = HANDHELD.posAmp * amp;
    out.pos.addScaledVector(_right, hhSample(HH_BANK.px, hhT) * pAmp)
       .addScaledVector(_up2, hhSample(HH_BANK.py, hhT) * pAmp);
  }

  /** Apply the pose for progress p. Runs after the hero's own 'controls'
   *  animator, so a direct write wins; there is never a frame in which
   *  OrbitControls and the director disagree. */
  function apply(p, dt = 0) {
    poseAt(p, pose, hero, forcedAspect ?? camera.aspect);
    applyHandheld(pose, p, dt);
    camera.position.copy(pose.pos);
    controls.target.copy(pose.target);
    camera.up.set(0, 1, 0);          // NO ROLL, anywhere
    camera.lookAt(pose.target);
    if (Math.abs(camera.fov - pose.fov) > 0.001) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    applyFog(p);
    return pose;
  }

  function setOwned(on) {
    on = !!on;
    if (on === owned) return;
    if (on) captureHero(pendingView);          // freeze the composition we start from
    owned = on;
    controls.enabled = !on;
    if (!on) {
      // Hand back exactly what the hero had: no tween, no re-frame, no drift.
      if (pendingView) { rawSetView(pendingView, 0); pendingView = null; }
      else {
        camera.position.copy(heroSnapshot.pos);
        controls.target.copy(heroSnapshot.target);
        camera.fov = heroSnapshot.fov;
        camera.updateProjectionMatrix();
        camera.lookAt(heroSnapshot.target);
      }
      if (scene.fog) { scene.fog.near = baseFogNear; scene.fog.far = baseFogFar; }
    }
  }

  captureHero(null);

  return {
    apply, setOwned,
    poseAt: (p, out, aspect) => poseAt(p, out, hero, aspect),
    get owned() { return owned; },
    get pose() { return pose; },
    get heroPose() { return hero; },
    /** Re-apply the hero composition exactly (returning to p = 0). */
    releaseToHero() { setOwned(false); },
  };
}
