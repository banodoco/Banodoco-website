// journey-v6 — anatomy mirror (adapted from spike-a/anatomy.js, which stays
// frozen as the look-dev spike; this is the production copy the grey-box and
// the chapters build against).
// The hero scene does not export its cap form-language functions, and nothing
// here may modify mushroom-scene.js. These are byte-faithful copies of the
// form functions and palette from mushroom-scene.js (sections 1 and 4), so
// extension geometry lands EXACTLY on the real gills/rim. If the hero's form
// language ever changes, this file must be re-mirrored (checked by the
// regression screenshot, which would drift visibly).
// groundY() is mirrored too (mushroom-scene.js section 8) because the T3
// soil-line seam is a predicate on it.
import * as THREE from 'three';

// ---------- deterministic RNG (own seed stream — must NOT consume the hero's) ----------
export function makeRng(seed = 20260802) {
  let s = seed >>> 0;
  return function rand() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function gaussOf(rand) {
  return (rand() + rand() + rand() + rand() - 2) / 2;
}

// ---------- palette: deep orange -> amber -> hot near-white (copied) ----------
const C_DARK  = new THREE.Color(0x421c05);
const C_MID   = new THREE.Color(0xb96b1c);
const C_AMBER = new THREE.Color(0xf5a63c);
const C_HOT   = new THREE.Color(0xffdfae);
const C_WHITE = new THREE.Color(0xfff3e0);
export function heat(t, out) {
  t = Math.max(0, Math.min(1, t));
  const c = out || new THREE.Color();
  if (t < 0.35)      c.lerpColors(C_DARK, C_MID,  t / 0.35);
  else if (t < 0.65) c.lerpColors(C_MID, C_AMBER, (t - 0.35) / 0.3);
  else if (t < 0.88) c.lerpColors(C_AMBER, C_HOT, (t - 0.65) / 0.23);
  else               c.lerpColors(C_HOT, C_WHITE, (t - 0.88) / 0.12);
  return c;
}

// ---------- cap form language (copied verbatim from mushroom-scene.js §4) ----------
export const CAP_Y = 3.15;
export const CAP_R = 2.35;
export const CAP_H = 1.22;
export const STEM_TOP = 3.9;
export const LEAN_DIR = 3.6;

export function angWrap(d) { return Math.atan2(Math.sin(d), Math.cos(d)); }
export function rimRad(a) {
  const lean = Math.cos(a - LEAN_DIR);
  return CAP_R * (1 + 0.09 * lean
                    + 0.045 * Math.cos(2 * a - 1.1)
                    + 0.018 * Math.sin(3 * a + 4.1));
}
export function rimYoff(a) {
  const lean = Math.cos(a - LEAN_DIR);
  const fold = Math.exp(-Math.pow(angWrap(a - 5.3) / 0.35, 2));
  return -0.16 * lean
       + 0.05 * Math.cos(2 * a + 0.7)
       - 0.13 * fold;
}
export function marginDroop(u, a) {
  const m = Math.max(0, (u - 0.78) / 0.22);
  return -(0.11 + 0.05 * Math.cos(a - LEAN_DIR)) * m * m;
}
export function capLump(u, a) {
  return (0.038 * Math.sin(u * 6.3 + a * 2.1 + 1.0)
        + 0.026 * Math.sin(u * 9.7 - a * 3.3 + 2.0)) * Math.sin(Math.PI * Math.min(u, 1));
}
export function capTopPt(u, a) {
  const uc = Math.min(u, 1);
  const r = u * rimRad(a);
  const dome = CAP_H * Math.pow(Math.cos(uc * Math.PI / 2), 1.15);
  const y = CAP_Y + dome + rimYoff(a) * Math.pow(uc, 1.6) + marginDroop(uc, a) + capLump(u, a);
  const x = Math.cos(a) * r - 0.15 * (1 - uc * uc);
  return new THREE.Vector3(x, y, Math.sin(a) * r);
}
export function capUnderPt(u, a) {
  const r = Math.max(u * rimRad(a), 0.2);
  const edge = Math.pow(Math.max(0, (u - 0.8) / 0.2), 2);
  const y = CAP_Y + 0.5 * Math.pow(Math.max(0, 1 - u), 1.8) + 0.03
          + rimYoff(a) * Math.pow(u, 1.6) + marginDroop(u, a)
          - 0.11 * edge;
  const x = Math.cos(a) * r - 0.075 * (1 - u * u);
  return new THREE.Vector3(x, y, Math.sin(a) * r);
}

// ---------- ground undulation (mirrored from mushroom-scene.js section 8) ----------
export function groundY(x, z) {
  return 0.02 * Math.sin(x * 1.3 + 2) + 0.03 * Math.sin(z * 0.9 + 5) + 0.02 * Math.sin((x + z) * 0.7)
       + 0.05 * Math.sin(x * 0.4 + z * 0.5 + 1);
}

// ---------- glow sprite (same construction as the hero's) ----------
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ---------- anamorphic streak texture: a horizontal blade of light ----------
export function makeStreakTexture() {
  const w = 256, h = 64;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * 2 - 1;          // -1..1 across the blade
      const ny = (y / h) * 2 - 1;
      // long soft horizontal falloff, tight vertical core
      const horiz = Math.exp(-Math.pow(Math.abs(nx), 1.6) * 4.2);
      const vert = Math.exp(-ny * ny * 22.0);
      const core = Math.exp(-(nx * nx * 30.0 + ny * ny * 55.0));
      const v = Math.min(1, horiz * vert * 0.85 + core * 0.9);
      const i = (y * w + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

// The three spore-exit sectors, in hero cap azimuth (pos = (cos a, y, sin a)).
// RESTAGED per D16 (Hannah, 2026-08-03, after six rejected fixes at the old
// rear staging): the exits are a TIGHT CLUSTER at the hero's ONE visible
// stream — the shed spilling from under the back-RIGHT rim and carried +x by
// the breeze (its visible plume centres on world (3.24, 3.97, -0.50), the
// hero page's own 01-INSPIRE callout anchor; back-projected along BREEZE_DIR
// that plume releases from cap az ~5.83). Supersedes the map's rear-sector
// staging (Plate I) for Inspire.
//   - ArtCompute: exactly AT the visible stream — it IS the stream the
//     visitor has been watching. Strongest lean, mid height.
//   - Arca Gidan Prize: ~31 deg rearward along the rim — near neighbour, the
//     tallest plume; fed by a short rim current peeling off the stream.
//   - 2RP: ~24 deg frontward along the rim, at the right margin — lowest
//     start, shortest rise; the other branch of the delta.
// All three sit inside (or a hair past) the hero shed's own birth wedge
// (a in [pi, 1.98pi]) and compose in ONE view of the right flank.
// `knot` is the per-plume knot-cadence gain (W4-A gap a): how hard the bright
// pearls along each winding core read. Arca — the tallest — carries the
// hottest cadence, per the approved spike's own review note.
export const EXITS = [
  { id: 'artcompute', label: 'ArtCompute',       az: 5.83, riseMin: 2.3, riseMax: 3.0, lean: 0.52, tone: 0.66, knot: 0.70 },
  { id: 'arca',       label: 'Arca Gidan Prize', az: 5.28, riseMin: 2.7, riseMax: 3.4, lean: 0.38, tone: 0.74, knot: 1.00 },
  { id: '2rp',        label: '2RP',              az: 6.25, riseMin: 1.8, riseMax: 2.4, lean: 0.42, tone: 0.60, knot: 0.55 },
];
