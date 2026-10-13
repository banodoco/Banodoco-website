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

export function trapEase(s, rampWidth = RAMP) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const r = Math.max(1e-6, Math.min(0.499999, rampWidth));
  const norm = 1 - r;
  const ramp = (u) => r * (u * u * u - (u * u * u * u) / 2);   // integral of smoothstep
  if (s < r) return ramp(s / r) / norm;
  if (s > 1 - r) return 1 - ramp((1 - s) / r) / norm;
  return (r / 2 + (s - r)) / norm;
}

export function azEase(s, rampWidth = RAMP) {
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const r = Math.max(1e-6, Math.min(0.499999, rampWidth));
  const w = smooth01(s / r) * smooth01((1 - s) / r);
  return trapEase(s, r)
    + ORBIT_BREATH.amp * Math.sin(2 * Math.PI * ORBIT_BREATH.cycles * s) * w;
}

export function quadBezier(m, a, pin, b, out) {
  const w0 = (1 - m) * (1 - m), w1 = 2 * m * (1 - m), w2 = m * m;
  out.copy(a).multiplyScalar(w0).addScaledVector(pin, w1).addScaledVector(b, w2);
  return out;
}
