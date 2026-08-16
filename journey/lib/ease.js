// journey/lib/ease.js — one easing family, one home.
//
// smooth01 (smoothstep), trapEase (the trapezoid, RAMP 0.18), azEase (the
// windowed orbit-breath on the azimuth) and quadBezier (the shared quadratic
// gaze) — extracted from the byte-identical copies in
// chapters/inspire/camera.js and chapters/connect/camera.js (diffed before
// extraction), so every chapter leg rides one profile.
import { ORBIT_BREATH } from '../constants.js';

export function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

export const RAMP = 0.18;

export function trapEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const norm = 1 - RAMP;
  const ramp = (u) => RAMP * (u * u * u - (u * u * u * u) / 2);   // integral of smoothstep
  if (s < RAMP) return ramp(s / RAMP) / norm;
  if (s > 1 - RAMP) return 1 - ramp((1 - s) / RAMP) / norm;
  return (RAMP / 2 + (s - RAMP)) / norm;
}

export function azEase(s) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const w = smooth01(s / RAMP) * smooth01((1 - s) / RAMP);
  return trapEase(s)
    + ORBIT_BREATH.amp * Math.sin(2 * Math.PI * ORBIT_BREATH.cycles * s) * w;
}

export function quadBezier(m, a, pin, b, out) {
  const w0 = (1 - m) * (1 - m), w1 = 2 * m * (1 - m), w2 = m * m;
  out.copy(a).multiplyScalar(w0).addScaledVector(pin, w1).addScaledVector(b, w2);
  return out;
}
