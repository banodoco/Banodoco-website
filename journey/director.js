// journey/director.js — the camera COMPOSER (M4).
//
// Chapters own their camera legs (chapters/<id>/camera.js — keys authored in
// LEG-LOCAL 0..1 time, plus Inspire's analytic arrival gesture); the director
// owns none of them. It sequences the legs per route.js and guarantees the
// global motion language. The composition order is FIXED and documented
// (merge doc §5 — adding motion means one chapter file, or ONE layer here,
// never a re-ordering):
//
//   1. BASE LEG        the chapter-owned path: Inspire's arrival gesture for
//                      p below its rest, else the Hermite spline through the
//                      concatenated chapter key legs (re-based to global p).
//   2. CHAPTER MODIFIERS  (none shipped today — a chapter-local offset layer
//                      would compose here, before the global language.)
//   3. GLOBAL LANGUAGE portrait re-composition (aspect field, portrait.js);
//                      documentary handheld (zero at every route stop);
//                      seam fog dips + the T4 fog ramp; NO ROLL, anywhere.
//   4. LENS            the finishing grade (lens.js) — applied by the frame
//                      loop after the pose, same order every frame.
//
// ONE continuous, reversible path through the resting poses of the approved
// camera map (journey-v6-plan/map/page2-camera.html), in the hero's own
// world coordinates: the two parameterisations join with matching zero
// velocity at the Inspire rest, and hold keys force zero tangents so every
// rest eases in and out with no velocity step. Nothing in this file cuts.
// Every value is a pure function of p, which is what makes reverse scrubbing
// identical to forward scrubbing.

import * as THREE from 'three';
import { CHAPTERS, REST_STOPS, TERMINAL_P, restProgress } from './route.js';
import { FOG_RAMP, HANDHELD, SEAM_FOG_DIPS } from './constants.js';
import { applyPortrait } from './portrait.js';
import { CAMERA as INSPIRE_CAM } from './chapters/inspire/camera.js';
import { CAMERA as CONNECT_CAM } from './chapters/connect/camera.js';
import { CAMERA as OWNED_CAM } from './chapters/owned/camera.js';
import { CAMERA as FINAL_CAM } from './chapters/final/camera.js';
import { ASPECT } from '../flags.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ================================================================
   1. The composed base path
   ================================================================ */
// Hero desktop pose, cylindrical about the stipe axis. These are the numbers
// the hero page actually boots with (panX -2.4 => x = 0.15 - 2.4). Mission's
// "leg" IS this pose — the composer's boundary condition, refreshed live
// from whatever responsive composition booted (see captureHero below).
export const HERO = {
  az: Math.atan2(-2.25, 10.4),   // ~ -0.213 rad
  r: Math.hypot(2.25, 10.4),     // ~ 10.64
  y: 2.25,
  target: V(-2.4, 2.6, 0),
  fov: 38,
};

// The arrival gesture lands ON the Inspire rest; below this p the base path
// is the gesture. From there to the Connect rest the base path is a SECOND
// analytic gesture — connect/camera.js approach(), the 2026-08-10 "one
// movement" re-shape (Hannah: the Inspire -> Connect travel must read like
// the hero -> Inspire arrival — one gesture, not a swing then a zoom). From
// the Connect rest to the Owned rest it is a THIRD — owned/camera.js
// dive(), the 2026-08-11 re-shape of the same complaint on the next leg
// ("3 movements but it should be 1.5"): one arc that steepens continuously
// into the soil. Above that, the keyed spline. All derived from the
// manifest; the four parameterisations join with matching zero velocity at
// every rest (each gesture ends on zero-slope ramps, and the rest keys are
// holds with zero tangents).
const ARRIVAL_END = restProgress('inspire');
const APPROACH_END = restProgress('connect');
const DIVE_END = restProgress('owned');

// Chapter legs -> ONE global key list: each chapter's leg-local key times
// re-base to global p through its route span (p = start + t * span — the
// exact inverse of the authoring transform, so the composed key positions
// are bit-identical to the retired global table). Concatenation order is
// route order; within a leg, authored order. Tangents are then computed
// GLOBALLY, exactly as before — neighbouring keys across a chapter boundary
// still shape each other's tangents, so the path through a seam is the same
// curve it always was.
const CHAPTER_CAMERAS = {
  inspire: INSPIRE_CAM, connect: CONNECT_CAM, owned: OWNED_CAM, final: FINAL_CAM,
};

const KEYS = CHAPTERS.flatMap((c) => {
  const cam = CHAPTER_CAMERAS[c.id];
  if (!cam || !cam.keys) return [];
  return cam.keys.map((k) => ({
    p: c.start + k.t * (c.end - c.start),
    pos: k.pos, tgt: k.tgt, fov: k.fov, hold: !!k.hold, note: k.note,
  }));
});

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
   2. Documentary handheld layer (W3-B gap a — global language)
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
// and the 0 -> 1 -> 0 pose audit is unaffected. Every declared route stop is
// an anchor, so a chapter adding a mid-leg stop gets its handheld zero free.
const HH_ANCHORS = [...REST_STOPS, TERMINAL_P];

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
 *  in the authored portrait field (portrait.js, PL-1.1). Passed in, not
 *  read from any global, so capture tooling can request either orientation
 *  from any window. */
export function poseAt(p, out = _pose, hero = HERO, aspect = 1.6) {
  if (p < ARRIVAL_END) INSPIRE_CAM.arrival(p / ARRIVAL_END, out, hero);
  else if (p < APPROACH_END) {
    CONNECT_CAM.approach((p - ARRIVAL_END) / (APPROACH_END - ARRIVAL_END), out);
  } else if (p < DIVE_END) {
    OWNED_CAM.dive((p - APPROACH_END) / (DIVE_END - APPROACH_END), out);
  } else keyedPose(p, out);
  return applyPortrait(out, p, aspect);
}

/** Name of the nearest authored key - used by the QA audit, not by rendering. */
export function poseNameAt(p) {
  if (p < ARRIVAL_END) return INSPIRE_CAM.arrivalName(p / ARRIVAL_END);
  if (p < APPROACH_END) {
    return CONNECT_CAM.approachName((p - ARRIVAL_END) / (APPROACH_END - ARRIVAL_END));
  }
  if (p < DIVE_END) {
    return OWNED_CAM.diveName((p - APPROACH_END) / (DIVE_END - APPROACH_END));
  }
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

  // The arrival gesture must start from the composition that actually booted,
  // not from the authored desktop numbers - otherwise the first scroll on a
  // phone would snap the framing. Captured live from the hero, refreshed on
  // every breakpoint change, frozen while the journey owns the camera.
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

  // Portrait re-composition lives in portrait.js (authored per-rest field,
  // PL-1.1) and is blended inside poseAt itself. The director only decides
  // WHICH aspect the frame is composed for: the real viewport's, or a QA
  // override (?aspect=portrait forces the full portrait field in a wide
  // window, for capture tooling and desktop review; a number forces that
  // exact aspect; ?aspect=landscape pins the landscape path on a phone).
  // (parsed once, in ../flags.js — THE flag registry)
  const forcedAspect = ASPECT;

  const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

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

  /** Apply the pose for progress p — the fixed composition order (see the
   *  file header): base leg (+ portrait, inside poseAt) -> handheld -> the
   *  no-roll camera write -> fog. Runs after the hero's own 'controls'
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

  /** Write the hero snapshot to the camera. The p=0 restore in setOwned()
   *  is a ONE-SHOT — nothing re-writes the camera on later frames while the
   *  director is un-owned. That is correct alone, but any layer that keeps
   *  composing onto the camera after the restore (the direct-jump camBlend)
   *  must be able to re-assert the restored pose each frame first, or it
   *  ends up composing onto its own previous output (the M4-found stuck
   *  camera). Exposed for exactly that caller. */
  function applyHeroPose() {
    camera.position.copy(heroSnapshot.pos);
    controls.target.copy(heroSnapshot.target);
    if (camera.fov !== heroSnapshot.fov) {
      camera.fov = heroSnapshot.fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(heroSnapshot.target);
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
      else applyHeroPose();
      if (scene.fog) { scene.fog.near = baseFogNear; scene.fog.far = baseFogFar; }
    }
  }

  captureHero(null);

  return {
    apply, setOwned, applyHeroPose,
    poseAt: (p, out, aspect) => poseAt(p, out, hero, aspect),
    get owned() { return owned; },
    get pose() { return pose; },
    get heroPose() { return hero; },
    /** Re-apply the hero composition exactly (returning to p = 0). */
    releaseToHero() { setOwned(false); },
  };
}
