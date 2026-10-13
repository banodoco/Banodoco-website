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
/* scratch-backed CatmullRomCurve3: getPoint/getLengths reuse ping-pong
   Vector3 slots instead of allocating one per sample, reproducing three
   r169's CatmullRomCurve3.getPoint math bit-for-bit (same expressions, same
   operation order). (2026-08-16) GC churn: ~200 Vector3 per curve arc-table
   measured as post-load GC stall. */
function _cubicPoly() {
  let c0 = 0, c1 = 0, c2 = 0, c3 = 0;
  function init(x0, x1, t0, t1) {
    c0 = x0;
    c1 = t0;
    c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1;
    c3 = 2 * x0 - 2 * x1 + t0 + t1;
  }
  return {
    initCatmullRom(x0, x1, x2, x3, tension) {
      init(x1, x2, tension * (x2 - x0), tension * (x3 - x1));
    },
    calc(t) {
      const t2 = t * t;
      const t3 = t2 * t;
      return c0 + c1 * t + c2 * t2 + c3 * t3;
    },
  };
}
// ONE extrapolation temp, exactly as r169 (vendor three.module.js:36088 and
// :36103 share a single module-level `tmp`). On a 2-point strand both ends
// extrapolate in the same call and the vendor's p3 computation OVERWRITES p0
// through that shared temp — a quirk, but the quirk is the contract: this
// subclass exists to be bit-identical to the vendor, aliasing included.
// (Verified against the vendor source 2026-08-17; a two-temp "fix" was
// considered and reverted — it would silently change any future 2-point
// strand against the r169 baseline the goldens were shot on.)
const _crTmp = new THREE.Vector3();
const _crPx = _cubicPoly();
const _crPy = _cubicPoly();
const _crPz = _cubicPoly();
// ping-pong scratch slots: two suffice because every caller holds only the
// immediately-previous point (strandLines 'prev'), never older samples.
const _crP0 = new THREE.Vector3();
const _crP1 = new THREE.Vector3();
let _crPFlip = false;
const _crL0 = new THREE.Vector3();
const _crL1 = new THREE.Vector3();
class _ScratchCatmullRomCurve3 extends THREE.CatmullRomCurve3 {
  constructor(points) {
    super(points, false, 'catmullrom', 0.5);
  }
  getPoint(t, optionalTarget) {
    const point = optionalTarget !== undefined
      ? optionalTarget
      : (_crPFlip = !_crPFlip, _crPFlip ? _crP1 : _crP0);
    const points = this.points;
    const l = points.length;
    const p = (l - 1) * t;
    let intPoint = Math.floor(p);
    let weight = p - intPoint;
    if (weight === 0 && intPoint === l - 1) {
      intPoint = l - 2;
      weight = 1;
    }
    let p0, p3;
    if (intPoint > 0) {
      p0 = points[(intPoint - 1) % l];
    } else {
      // extrapolate first point
      _crTmp.subVectors(points[0], points[1]).add(points[0]);
      p0 = _crTmp;
    }
    const p1 = points[intPoint % l];
    const p2 = points[(intPoint + 1) % l];
    if (intPoint + 2 < l) {
      p3 = points[(intPoint + 2) % l];
    } else {
      // extrapolate last point — same shared temp as p0, as the vendor does
      // (see the _crTmp note above: the aliasing is part of the contract)
      _crTmp.subVectors(points[l - 1], points[l - 2]).add(points[l - 1]);
      p3 = _crTmp;
    }
    _crPx.initCatmullRom(p0.x, p1.x, p2.x, p3.x, this.tension);
    _crPy.initCatmullRom(p0.y, p1.y, p2.y, p3.y, this.tension);
    _crPz.initCatmullRom(p0.z, p1.z, p2.z, p3.z, this.tension);
    point.set(_crPx.calc(weight), _crPy.calc(weight), _crPz.calc(weight));
    return point;
  }
  /* Curve.getPoints / getSpacedPoints accumulate EVERY sample, which is
   * incompatible with the two-slot scratch path (the returned array would be
   * silently aliased to two vectors). No repo caller uses them on a catmull()
   * curve today; these overrides keep any future use correct by giving each
   * sample its own vector — vendor semantics, vendor loop bounds. */
  getPoints(divisions = 5) {
    const pts = [];
    for (let d = 0; d <= divisions; d++) pts.push(this.getPoint(d / divisions, new THREE.Vector3()));
    return pts;
  }
  getSpacedPoints(divisions = 5) {
    const pts = [];
    for (let d = 0; d <= divisions; d++) pts.push(this.getPointAt(d / divisions, new THREE.Vector3()));
    return pts;
  }
  getLengths(divisions = this.arcLengthDivisions) {
    if (this.cacheArcLengths &&
        (this.cacheArcLengths.length === divisions + 1) &&
        !this.needsUpdate) {
      return this.cacheArcLengths;
    }
    this.needsUpdate = false;
    const cache = [];
    let sum = 0;
    let last = this.getPoint(0, _crL0);
    cache.push(0);
    for (let p = 1; p <= divisions; p++) {
      const current = this.getPoint(p / divisions, (p & 1) ? _crL1 : _crL0);
      sum += current.distanceTo(last);
      cache.push(sum);
      last = current;
    }
    this.cacheArcLengths = cache;
    return cache;
  }
}
export function catmull(points) {
  return new _ScratchCatmullRomCurve3(points);
}

/*
 strandLines: build a single BufferGeometry of many polyline strands as line
 segments, with attributes:
   position, aAlong (0..1 along each strand), aStrand (strand index / count)
 generator(i, rand) → array of THREE.Vector3 (>= 2 points)
 Returns { geometry, count }.
*/
function _growF32(a) {
  const b = new Float32Array(a.length * 2);
  b.set(a);
  return b;
}

export function strandLines({ count = 100, seed = 1, generator }) {
  const rand = rng(seed);
  // Growable typed-array cursors: f32[i] = expr rounds to float32 exactly
  // like the old push() + Float32BufferAttribute path, but skips the
  // reallocation churn. (2026-08-16) GC churn: double-array push storms
  // measured as post-load GC stall.
  let positions = new Float32Array(1024);
  let along = new Float32Array(256);
  let strand = new Float32Array(256);
  let pn = 0, an = 0, sn = 0;
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
      if (pn + 6 > positions.length) positions = _growF32(positions);
      positions[pn++] = prev.x; positions[pn++] = prev.y; positions[pn++] = prev.z;
      positions[pn++] = p.x; positions[pn++] = p.y; positions[pn++] = p.z;
      if (an + 2 > along.length) along = _growF32(along);
      along[an++] = (j - 1) / n; along[an++] = t;
      if (sn + 2 > strand.length) strand = _growF32(strand);
      strand[sn++] = i / count; strand[sn++] = i / count;
      prev = p;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, pn), 3));
  geo.setAttribute('aAlong', new THREE.BufferAttribute(along.slice(0, an), 1));
  geo.setAttribute('aStrand', new THREE.BufferAttribute(strand.slice(0, sn), 1));
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
