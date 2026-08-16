// Shared utilities for journey-v6 chapters.
// Harvested VERBATIM from journey/lib/helpers.js (donor) - classified `reuse`
// in adr-d2-harvest-map.md: pure, DOM-free at import time, deterministic, and
// it does not fight the hero's own scene code. Copied rather than imported so
// journey-v6 has no dependency on the frozen donor tree.
//
// rng / noise3 / fbm3 / easings / glowSprite / softDisc / catmull /
// strandLines / pulseDriver
import * as THREE from 'three';

/* ---------------- deterministic randomness ---------------- */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- value noise ---------------- */
const _perm = new Uint8Array(512);
{
  const r = rng(1337);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
}
function _hash3(x, y, z) {
  return _perm[(x + _perm[(y + _perm[z & 255]) & 255]) & 255] / 127.5 - 1;
}
function _smooth(t) { return t * t * (3 - 2 * t); }
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = _smooth(xf), v = _smooth(yf), w = _smooth(zf);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c000 = _hash3(xi, yi, zi),     c100 = _hash3(xi + 1, yi, zi);
  const c010 = _hash3(xi, yi + 1, zi), c110 = _hash3(xi + 1, yi + 1, zi);
  const c001 = _hash3(xi, yi, zi + 1), c101 = _hash3(xi + 1, yi, zi + 1);
  const c011 = _hash3(xi, yi + 1, zi + 1), c111 = _hash3(xi + 1, yi + 1, zi + 1);
  return lerp(
    lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
    lerp(lerp(c001, c101, u), lerp(c011, c111, u), v), w);
}
export function fbm3(x, y, z, oct = 4) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise3(x * f, y * f, z * f);
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return sum / norm;
}

/* ---------------- easings ---------------- */
export const easings = {
  inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  out:   t => 1 - Math.pow(1 - t, 3),
  in:    t => t * t * t,
  smooth: t => t * t * (3 - 2 * t),
};

/* ---------------- procedural sprite textures ---------------- */
const _texCache = new Map();
export function glowSprite(color = 0xf0c877, size = 64) {
  const key = 'glow' + color + '_' + size;
  if (_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const col = new THREE.Color(color);
  const rgb = `${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0}`;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, `rgba(${rgb},1)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.6, `rgba(${rgb},0.14)`);
  grad.addColorStop(1.0, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _texCache.set(key, tex);
  return tex;
}
export function softDisc(size = 64) {
  const key = 'disc' + size;
  if (_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  _texCache.set(key, tex);
  return tex;
}

/* ---------------- geometry builders ---------------- */
export function catmull(points) {
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

/*
 strandLines: build a single BufferGeometry of many polyline strands as line
 segments, with attributes:
   position, aAlong (0..1 along each strand), aStrand (strand index / count)
 generator(i, rand) → array of THREE.Vector3 (>= 2 points)
 Returns { geometry, count }.
*/
export function strandLines({ count = 100, seed = 1, generator }) {
  const rand = rng(seed);
  const positions = [], along = [], strand = [];
  for (let i = 0; i < count; i++) {
    const pts = generator(i, rand);
    if (!pts || pts.length < 2) continue;
    // resample through catmull for smoothness if few points
    const curve = catmull(pts);
    const n = Math.max(pts.length, 6);
    let prev = curve.getPointAt(0);
    for (let j = 1; j <= n; j++) {
      const t = j / n;
      const p = curve.getPointAt(t);
      positions.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      along.push((j - 1) / n, t);
      strand.push(i / count, i / count);
      prev = p;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
  return { geometry: geo, count };
}

/* one-shot pulse driver: call .fire(), pass .update(dt) each frame, read .value */
export function pulseDriver(duration = 1.6) {
  return {
    t: 1e9, duration,
    fire() { this.t = 0; },
    update(dt) { this.t += dt; },
    get value() { return Math.min(this.t / this.duration, 1); },
    get active() { return this.t < this.duration; },
  };
}
