// journey-v6 — OWNED contributor portrait field (W4-C).
// Port of the APPROVED Spike B treatment (spike-b/portraits.js) into the
// live journey. Copied + adapted, never imported from spike-b/.
//
// Carried verbatim from the approved spike:
//   - the per-photo treatment: 62% desaturation -> 0.90 amber multiply ->
//     warm-black lift -> hard edge burn -> unify/grain -> mask feather 0.76
//     -> ember rim arcs + outward fibre ticks;
//   - procedural painted busts + anonymous spore-print glyphs, 3-way
//     crossfade in the shader (procedural / photo / anonymous);
//   - REAL strand geometry terminating exactly at each node (local strands,
//     node-to-node links, cord attachments) — hover lights ONLY the active
//     node's strands;
//   - 3D rim fibres, ember cores + halos, defocus band 2.2->5.0;
//   - the two hard placement rules from rev 2, verbatim: >=3.0 world units
//     of camera-path clearance from EVERY point of the leg (descent + rise
//     included), and frame-cell stratification (home moment on the path +
//     3x3 frustum cell + near/mid/far depth pattern).
//
// New for the journey:
//   - placement is authored against the REAL leg (owned-leg.js poseAt
//     samples), stratified against the REST pose frustum primarily (the 16
//     routable contributors) with glide coverage second (32 ambient nodes)
//     — this is the fix for the grey-box reachability gap;
//   - size/spacing jitter rule against "row of coins" chains at density;
//   - underground clamps (whole disc below the soil);
//   - uFade on every layer for the T3 streaming seam;
//   - consent hook: aAnon per-node attribute forces the anonymous glyph for
//     any contributor with consent !== true when enforcement is on. Photos
//     here are the LOOK-DEV ONLY test set (assets/test-portraits, never
//     ship); anonymous mode stays one call away (setMode('anonymous')).
import * as THREE from 'three';
import * as H from '../lib/helpers.js';
import { TEST_PORTRAITS } from '../assets/test-portraits/manifest.js';
import { UG_P0, UG_P1, REST_P } from './owned-leg.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/* ================================================================== */
/* atlas painting (spike verbatim)                                     */
/* ================================================================== */

const SKIN_RAMP = [
  [78, 50, 34], [102, 66, 44], [130, 86, 56], [158, 110, 74],
  [184, 138, 98], [206, 164, 124],
];
const CLOTH = [[40, 30, 22], [54, 40, 27], [32, 27, 31], [62, 46, 31], [46, 35, 41]];
const HAIR = [[36, 24, 17], [52, 36, 22], [76, 53, 30], [30, 27, 30], [96, 70, 40], [160, 138, 114]];

function lerpC(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rampPick(ramp, t) {
  const f = clamp(t, 0, 0.999) * (ramp.length - 1);
  const i = Math.floor(f);
  return lerpC(ramp[i], ramp[i + 1], f - i);
}
function css(c, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function scaleC(c, f) { return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)]; }

// Shared edge language: irregular ember rim arcs + outward fibre ticks,
// drawn AFTER the circular soft mask so they fray past the disc edge.
function drawEmbedEdge(g, cx, cy, R, r) {
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 88; k++) {
    const a0 = (k / 88) * TAU + (r() - 0.5) * 0.05;
    const a1 = a0 + (TAU / 88) * (1.05 + r() * 0.6);
    const rr = R * (0.90 + (r() - 0.5) * 0.09);
    g.strokeStyle = `rgba(255,${185 + ((r() * 45) | 0)},${115 + ((r() * 55) | 0)},${(0.07 + r() * 0.24).toFixed(3)})`;
    g.lineWidth = (0.8 + r() * 1.8) * 2;
    g.beginPath(); g.arc(cx, cy, rr, a0, a1); g.stroke();
  }
  for (let k = 0; k < 44; k++) {
    const a = r() * TAU;
    const r0 = R * 0.93, r1 = R * (1.02 + r() * 0.26);
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
    const bend = (r() - 0.5) * 0.20;
    const x1 = cx + Math.cos(a + bend) * r1, y1 = cy + Math.sin(a + bend) * r1;
    const gl = g.createLinearGradient(x0, y0, x1, y1);
    gl.addColorStop(0, `rgba(255,190,120,${(0.10 + r() * 0.28).toFixed(3)})`);
    gl.addColorStop(1, 'rgba(255,190,120,0)');
    g.strokeStyle = gl;
    g.lineWidth = (0.6 + r() * 1.1) * 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

function grainAndGrade(g, ox, oy, CELL, cx, cy, R, r) {
  // amber unify — everything drawn so far pulls toward the palette
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(196,124,48,0.33)';
  g.fillRect(ox, oy, CELL, CELL);
  // upper-left key bloom
  const bloom = g.createRadialGradient(cx - R * 0.55, cy - R * 0.65, R * 0.05, cx - R * 0.55, cy - R * 0.65, R * 1.4);
  bloom.addColorStop(0, 'rgba(255,200,140,0.13)');
  bloom.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = bloom;
  g.fillRect(ox, oy, CELL, CELL);
  // photographic speckle
  for (let k = 0; k < 340; k++) {
    const a = r() * TAU, rr = R * Math.sqrt(r());
    const lum = r() < 0.5;
    g.fillStyle = lum
      ? `rgba(255,214,160,${(0.02 + r() * 0.05).toFixed(3)})`
      : `rgba(8,5,2,${(0.03 + r() * 0.07).toFixed(3)})`;
    g.beginPath();
    g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.5 + r() * 1.2, 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

function softMask(g, ox, oy, CELL, cx, cy, R, feather = 0.86) {
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(feather, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(ox, oy, CELL, CELL);
  g.globalCompositeOperation = 'source-over';
}

// Real-photo treatment (LOOK-DEV ONLY; assets/test-portraits, never ship).
// Spike-calibrated pipeline: 62% desaturation -> 0.90 amber multiply ->
// warm-black lift -> edge burn -> unify/grain -> mask feather 0.76 -> edge.
function drawPhotoCell(g, ox, oy, CELL, spec) {
  const { img, mirror, exposure, warmth, seed } = spec;
  const r = H.rng(((seed * 3319 + 811) | 0) >>> 0);
  const cx = ox + CELL / 2, cy = oy + CELL / 2;
  const R = CELL * 0.36;
  g.save();
  g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  const D = R * 2.06;
  g.save();
  g.translate(cx, cy);
  if (mirror) g.scale(-1, 1);
  g.drawImage(img, -D / 2, -D / 2, D, D);
  g.restore();

  // 1. partial desaturation — kill the cool studio colour cast
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = 'rgba(128,128,128,0.62)';
  g.fillRect(ox, oy, CELL, CELL);
  // 2. amber multiply — the main push into the palette
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgba(226,${(150 + warmth * 22) | 0},${(86 + warmth * 20) | 0},0.90)`;
  g.fillRect(ox, oy, CELL, CELL);
  // 3. deterministic exposure trim (density variation)
  if (exposure < 1) {
    const k = (exposure * 255) | 0;
    g.fillStyle = `rgb(${k},${k},${k})`;
    g.fillRect(ox, oy, CELL, CELL);
  }
  // 4. warm-black lift — ties the photo's blacks to the field's near-black
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(58,30,12,${exposure > 1 ? 0.26 : 0.16})`;
  g.fillRect(ox, oy, CELL, CELL);
  // 5. edge burn — crush bright studio backgrounds so only the person holds
  // light and the disc melts into the dark substrate before the ember arcs
  g.globalCompositeOperation = 'multiply';
  const burn = g.createRadialGradient(cx, cy - R * 0.08, R * 0.30, cx, cy, R);
  burn.addColorStop(0, 'rgba(255,255,255,1)');
  burn.addColorStop(0.58, 'rgba(206,172,140,1)');
  burn.addColorStop(0.85, 'rgba(96,62,32,1)');
  burn.addColorStop(1, 'rgba(34,20,10,1)');
  g.fillStyle = burn;
  g.fillRect(ox, oy, CELL, CELL);
  // and give the face itself back a touch of ember key light
  g.globalCompositeOperation = 'lighter';
  const faceKey = g.createRadialGradient(cx, cy - R * 0.12, R * 0.05, cx, cy - R * 0.08, R * 0.55);
  faceKey.addColorStop(0, 'rgba(255,196,130,0.16)');
  faceKey.addColorStop(1, 'rgba(255,196,130,0)');
  g.fillStyle = faceKey;
  g.fillRect(ox, oy, CELL, CELL);
  g.globalCompositeOperation = 'source-over';
  g.restore();   // circle clip off

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r);
  softMask(g, ox, oy, CELL, cx, cy, R, 0.76);   // wider feather than the busts
  drawEmbedEdge(g, cx, cy, R, r);
  g.restore();
}

function drawBust(g, ox, oy, CELL, seed) {
  const r = H.rng((seed * 7919 + 4111) >>> 0);
  const cx = ox + CELL / 2, cy = oy + CELL / 2;
  const R = CELL * 0.36;
  g.save();
  g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

  // --- dark warm chamber behind the person ---
  const bg = g.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
  bg.addColorStop(0, 'rgba(68,41,19,0.96)');
  bg.addColorStop(0.6, 'rgba(34,20,9,0.97)');
  bg.addColorStop(1, 'rgba(12,7,3,0.98)');
  g.fillStyle = bg;
  g.beginPath(); g.arc(cx, cy, R * 1.02, 0, TAU); g.fill();

  const skin = rampPick(SKIN_RAMP, r());
  const cloth = CLOTH[(r() * CLOTH.length) | 0];
  const hair = HAIR[(r() * HAIR.length) | 0];

  const hx = cx + (r() - 0.5) * R * 0.10;
  const hy = cy - R * 0.22 + (r() - 0.5) * R * 0.06;
  const rx = R * (0.40 + r() * 0.05);
  const ry = rx * (1.20 + r() * 0.10);

  // --- neck (deep shadow — never brighter than the face) ---
  g.fillStyle = css(scaleC(skin, 0.48));
  g.beginPath();
  g.rect(hx - rx * 0.32, hy + ry * 0.50, rx * 0.64, ry * 0.85);
  g.fill();

  // --- shoulders: a full bust filling the lower disc ---
  const shTop = cy + R * (0.30 + r() * 0.07);
  const shW = R * (1.10 + r() * 0.15);
  const shGrad = g.createLinearGradient(cx - shW, shTop, cx + shW * 0.5, cy + R);
  shGrad.addColorStop(0, css(scaleC(cloth, 1.9)));
  shGrad.addColorStop(0.45, css(cloth));
  shGrad.addColorStop(1, css(scaleC(cloth, 0.55)));
  g.fillStyle = shGrad;
  g.beginPath();
  g.moveTo(cx - shW, cy + R * 1.1);
  g.bezierCurveTo(cx - shW * 0.96, shTop + R * 0.12, cx - rx * 1.4, shTop, cx - rx * 0.60, shTop - R * 0.02);
  g.lineTo(cx + rx * 0.60, shTop - R * 0.02);
  g.bezierCurveTo(cx + rx * 1.4, shTop, cx + shW * 0.96, shTop + R * 0.12, cx + shW, cy + R * 1.1);
  g.closePath();
  g.fill();

  // --- head, key-lit from upper-left ---
  const key = g.createRadialGradient(
    hx - rx * 0.42, hy - ry * 0.42, rx * 0.12,
    hx, hy, ry * 1.25,
  );
  key.addColorStop(0, css(scaleC(skin, 1.26)));
  key.addColorStop(0.42, css(scaleC(skin, 0.98)));
  key.addColorStop(1, css(scaleC(skin, 0.44)));
  g.fillStyle = key;
  g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.fill();

  // --- warm bounce from BELOW: the mycelium's own light on the jaw ---
  g.save();
  g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.clip();
  g.globalCompositeOperation = 'lighter';
  const up = g.createRadialGradient(hx, hy + ry * 1.15, ry * 0.1, hx, hy + ry * 1.15, ry * 1.2);
  up.addColorStop(0, 'rgba(255,179,107,0.16)');
  up.addColorStop(1, 'rgba(255,179,107,0)');
  g.fillStyle = up;
  g.fillRect(hx - rx, hy - ry, rx * 2, ry * 2.2);
  g.globalCompositeOperation = 'source-over';
  g.restore();

  // shade the far side of the face
  g.save();
  g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.clip();
  const sh = g.createLinearGradient(hx - rx * 0.2, hy, hx + rx, hy + ry * 0.6);
  sh.addColorStop(0, 'rgba(18,9,4,0)');
  sh.addColorStop(1, 'rgba(18,9,4,0.52)');
  g.fillStyle = sh;
  g.fillRect(hx - rx, hy - ry, rx * 2, ry * 2);
  // abstract feature shadows: brow line + eye sockets + under-nose, all soft
  g.shadowColor = 'rgba(15,8,4,0.7)';
  g.shadowBlur = CELL * 0.04;
  g.fillStyle = 'rgba(24,12,6,0.17)';
  g.beginPath(); g.ellipse(hx - rx * 0.36, hy - ry * 0.05, rx * 0.19, ry * 0.062, 0.08, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(hx + rx * 0.34, hy - ry * 0.05, rx * 0.19, ry * 0.062, -0.08, 0, TAU); g.fill();
  g.fillStyle = 'rgba(24,12,6,0.10)';
  g.beginPath(); g.ellipse(hx - rx * 0.02, hy + ry * 0.22, rx * 0.10, ry * 0.055, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(24,12,6,0.13)';
  g.beginPath(); g.ellipse(hx, hy + ry * 0.44, rx * 0.24, ry * 0.045, 0, 0, TAU); g.fill();
  g.shadowBlur = 0;
  g.restore();

  // chin/jaw shadow onto neck
  g.fillStyle = 'rgba(12,6,3,0.38)';
  g.beginPath(); g.ellipse(hx, hy + ry * 0.72, rx * 0.42, ry * 0.16, 0, 0, TAU); g.fill();

  // optional facial hair
  if (r() < 0.32) {
    g.fillStyle = css(scaleC(hair, 0.85), 0.62);
    g.beginPath(); g.ellipse(hx, hy + ry * 0.42, rx * 0.52, ry * 0.30, 0, 0, Math.PI); g.fill();
  }

  // --- hair / head-covering variants ---
  const hv = (r() * 5) | 0;
  g.fillStyle = css(hair, 0.96);
  if (hv === 0) {
    g.beginPath(); g.ellipse(hx, hy - ry * 0.42, rx * 1.06, ry * 0.52, 0, Math.PI, TAU); g.fill();
  } else if (hv === 1) {
    g.beginPath(); g.ellipse(hx, hy - ry * 0.40, rx * 1.12, ry * 0.55, 0, Math.PI, TAU); g.fill();
    g.beginPath();
    g.ellipse(hx - rx * 1.02, hy + ry * 0.34, rx * 0.30, ry * 0.85, 0.12, 0, TAU); g.fill();
    g.beginPath();
    g.ellipse(hx + rx * 1.02, hy + ry * 0.34, rx * 0.30, ry * 0.85, -0.12, 0, TAU); g.fill();
  } else if (hv === 2) {
    g.beginPath(); g.ellipse(hx, hy - ry * 0.44, rx * 1.04, ry * 0.48, 0, Math.PI, TAU); g.fill();
    g.beginPath(); g.arc(hx + rx * 0.15, hy - ry * 1.06, rx * 0.34, 0, TAU); g.fill();
  } else if (hv === 3) {
    for (let k = 0; k < 11; k++) {
      const a = Math.PI + (k / 10) * Math.PI;
      const rr = rx * (1.02 + r() * 0.22);
      g.beginPath();
      g.arc(hx + Math.cos(a) * rr, hy - ry * 0.30 + Math.sin(a) * ry * 0.62, rx * (0.24 + r() * 0.14), 0, TAU);
      g.fill();
    }
  } else {
    // hood / head-wrap (like the approved still's hooded figures)
    g.strokeStyle = css(scaleC(cloth, 1.35), 0.95);
    g.lineWidth = rx * 0.46;
    g.beginPath(); g.ellipse(hx, hy - ry * 0.06, rx * 1.22, ry * 1.02, 0, Math.PI * 1.06, TAU - Math.PI * 0.06); g.stroke();
  }

  // lit edge of hair (key side)
  g.strokeStyle = css(scaleC(hair, 2.6), 0.75);
  g.lineWidth = CELL * 0.012;
  g.beginPath(); g.ellipse(hx, hy - ry * 0.40, rx * 1.02, ry * 0.52, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();

  // --- ember rim light on the shadow side (the mycelium lights them) ---
  g.shadowColor = 'rgba(255,179,107,0.9)';
  g.shadowBlur = CELL * 0.03;
  g.strokeStyle = 'rgba(255,185,118,0.62)';
  g.lineWidth = CELL * 0.011;
  g.beginPath(); g.ellipse(hx, hy, rx * 1.01, ry * 1.01, 0, -Math.PI * 0.22, Math.PI * 0.38); g.stroke();
  g.shadowBlur = 0;

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r);
  softMask(g, ox, oy, CELL, cx, cy, R);
  drawEmbedEdge(g, cx, cy, R, r);
  g.restore();
}

function drawAnonGlyph(g, ox, oy, CELL, seed) {
  const r = H.rng((seed * 6011 + 977) >>> 0);
  const cx = ox + CELL / 2, cy = oy + CELL / 2;
  const R = CELL * 0.36;
  g.save();
  g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

  const bg = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 1.05);
  bg.addColorStop(0, 'rgba(58,34,14,0.96)');
  bg.addColorStop(0.55, 'rgba(28,16,7,0.97)');
  bg.addColorStop(1, 'rgba(10,6,3,0.98)');
  g.fillStyle = bg;
  g.beginPath(); g.arc(cx, cy, R * 1.02, 0, TAU); g.fill();

  g.globalCompositeOperation = 'lighter';
  // spore-print glyph: fine radiating filaments, like a gill print
  const N = 46 + ((r() * 10) | 0);
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU + (r() - 0.5) * 0.05;
    const r0 = R * (0.14 + r() * 0.05);
    const r1 = R * (0.52 + r() * 0.30);
    const bend = (r() - 0.5) * 0.16;
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
    const x1 = cx + Math.cos(a + bend) * r1, y1 = cy + Math.sin(a + bend) * r1;
    const gl = g.createLinearGradient(x0, y0, x1, y1);
    gl.addColorStop(0, `rgba(255,196,128,${(0.16 + r() * 0.26).toFixed(3)})`);
    gl.addColorStop(1, `rgba(255,180,110,${(0.02 + r() * 0.06).toFixed(3)})`);
    g.strokeStyle = gl;
    g.lineWidth = (0.5 + r() * 0.9) * 2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(
      cx + Math.cos(a + bend * 0.5) * (r0 + r1) * 0.5,
      cy + Math.sin(a + bend * 0.5) * (r0 + r1) * 0.5,
      x1, y1);
    g.stroke();
  }
  // two broken concentric rings
  for (const rr of [0.34, 0.58]) {
    const segs = 7 + ((r() * 4) | 0);
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * TAU + r() * 0.3;
      const a1 = a0 + (TAU / segs) * (0.45 + r() * 0.35);
      g.strokeStyle = `rgba(255,200,135,${(0.10 + r() * 0.16).toFixed(3)})`;
      g.lineWidth = (0.7 + r() * 0.8) * 2;
      g.beginPath(); g.arc(cx, cy, R * (rr + (r() - 0.5) * 0.03), a0, a1); g.stroke();
    }
  }
  // warm core — a held place, not a missing image
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
  core.addColorStop(0, 'rgba(255,214,158,0.60)');
  core.addColorStop(0.5, 'rgba(255,190,120,0.26)');
  core.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = core;
  g.beginPath(); g.arc(cx, cy, R * 0.19, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r);
  softMask(g, ox, oy, CELL, cx, cy, R);
  drawEmbedEdge(g, cx, cy, R, r);
  g.restore();
}

function makeAtlas(cells, cols, CELL, drawFn, seeds) {
  const c = document.createElement('canvas');
  c.width = cols * CELL;
  c.height = Math.ceil(cells / cols) * CELL;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < cells; i++) {
    drawFn(g, (i % cols) * CELL, Math.floor(i / cols) * CELL, CELL, seeds[i]);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/* ================================================================== */
/* node-strand material: one draw call for every node's LOCAL strands  */
/* ================================================================== */
function makeNodeStrandMat(baseColor, pulseColor, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: -1 },
      uPulseOn: { value: 0 },
      uActive: { value: -999 },
      uActiveAmt: { value: 0 },
      uFade: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.135 },
      uWidth: { value: opts.pulseWidth ?? 0.13 },
      uFogDensity: { value: opts.fogDensity ?? 0.016 },
      uColor: { value: new THREE.Color(baseColor) },
      uPulseColor: { value: new THREE.Color(pulseColor) },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      attribute float aNode;
      uniform float uActive, uActiveAmt, uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      varying float vA, vS, vSel, vFog, vWv;
      void main() {
        vA = aAlong; vS = aStrand;
        vSel = step(abs(aNode - uActive), 0.5) * uActiveAmt;
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uBase, uWidth, uFogDensity, uFade;
      uniform vec3 uColor, uPulseColor;
      varying float vA, vS, vSel, vFog, vWv;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.41 + vS * 1.55) + vS * 51.3);
        float amb = uBase * (0.66 + 0.34 * tw) * (0.65 + 0.55 * vA);
        float d = vA - uPulse;
        float p = exp(-d * d / (uWidth * uWidth)) * uPulseOn * vSel;
        float trail = 0.26 * exp(min(d, 0.0) * 6.0) * step(d, 0.0) * uPulseOn * vSel;
        vec3 col = uColor * amb * (1.0 + 2.90 * vSel + 2.1 * vWv)
          + uPulseColor * (p + trail) * 1.25 + uPulseColor * vWv * amb * 1.4;
        col *= exp(-uFogDensity * uFogDensity * vFog * vFog);
        col *= smoothstep(1.1, 2.9, vFog);    // near-fade (see substrate note)
        gl_FragColor = vec4(col * uFade, 1.0);
      }`,
  });
}

/* ================================================================== */
export function buildPortraitField({
  leg, contributors, substrate, palette: P, nodeCount = 48, exposure = 1,
}) {
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);
  const group = new THREE.Group();
  const NODE_COUNT = nodeCount;
  const C_COUNT = contributors.length;          // routable, hoverable nodes
  group.name = 'owned-portraits-' + NODE_COUNT;
  const { camPts, camDist, nearestCamPt, frameAt, restFrame, projectInto, clampUnder, groundY } = leg;
  const { nearestCordPoint, inVoid } = substrate;

  /* ---------------- placement: frame-cell stratification ----------------
     Rev-2 rule, carried verbatim: each node gets a home moment on the REAL
     leg and a cell of a 3x3 frustum grid at a near/mid/far depth pattern,
     so edge/corner/depth coverage is authored, not hoped for.
     Journey-specific split (the reachability fix):
       - the C_COUNT routable contributors stratify against the REST pose
         frustum primarily (12 of 16 literally in the rest frame; 4 in the
         early drift frames, which share the rest's gaze direction) — a
         healthy hoverable set at the rest is authored in;
       - the remaining ambient nodes stratify across the WHOLE underground
         leg so the glide and rise stay populated (coverage second). */
  const CELLS = [
    [-0.78, -0.70], [0.0, -0.70], [0.78, -0.70],
    [-0.78, -0.12], [0.0, -0.12], [0.78, -0.12],
    [-0.78, 0.42], [0.0, 0.42], [0.78, 0.42],
  ];
  const DEPTHS = [6.4, 3.4, 9.6, 5.4, 11.5, 7.6, 4.4, 10.2, 6.0, 8.8, 3.8, 12.5];
  const DRIFT_PS = [0.762, 0.788, 0.812, 0.832];

  const frameCache = new Map();
  const homeFrame = (p) => {
    const key = Math.round(p * 1000);
    if (!frameCache.has(key)) frameCache.set(key, frameAt(p));
    return frameCache.get(key);
  };

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
    const c = contributors[i % C_COUNT];
    const routable = i < C_COUNT;
    const rand = H.rng((((c.seed ?? (i + 1)) * 7919 + 17 + i * 977) | 0) >>> 0);
    let homeP;
    if (routable) {
      homeP = i < C_COUNT - DRIFT_PS.length ? REST_P : DRIFT_PS[i - (C_COUNT - DRIFT_PS.length)];
    } else {
      const j = i - C_COUNT, n = NODE_COUNT - C_COUNT;
      homeP = clamp(UG_P0 + ((j + 0.5) / n) * (UG_P1 - UG_P0)
        + (rand() - 0.5) * (0.6 * (UG_P1 - UG_P0) / n), UG_P0, UG_P1);
    }
    const f = homeFrame(homeP);
    // stride-4 walk through the 9 cells (gcd(4,9)=1): consecutive nodes land
    // in scattered cells, and every cell is visited before any repeats
    const cell = CELLS[(i * 4 + Math.floor(i / 9)) % 9];
    let depth = DEPTHS[i % DEPTHS.length] * (0.85 + rand() * 0.30);
    // the page copy owns top-centre: force that cell deep
    if (Math.abs(cell[0]) < 0.4 && cell[1] > 0.3) depth = Math.max(depth, 10.0);
    if (routable) depth = Math.min(depth, 12.0);   // hover targets stay legible
    const jx = routable ? 0.24 : 0.34;
    const jy = routable ? 0.22 : 0.30;
    const TANV = Math.tan(0.5 * f.fov * Math.PI / 180);
    const ASPECT = 1.55;
    let pos = null;
    for (let attempt = 0; attempt < 7 && !pos; attempt++) {
      const cx = clamp(cell[0] + (rand() - 0.5) * jx, -0.84, 0.84);
      const cy = cell[1] + (rand() - 0.5) * jy;
      const d = depth * (attempt ? 0.88 + rand() * 0.28 : 1);
      const p = f.pos.clone()
        .addScaledVector(f.fwd, d)
        .addScaledVector(f.right, cx * TANV * ASPECT * d)
        .addScaledVector(f.up, cy * TANV * d);
      p.x = clamp(p.x, -16.5, 5.0);
      p.z = clamp(p.z, -9.0, 9.0);
      clampUnder(p, 0.9);
      if (!inVoid(p.x, p.y, p.z)) pos = p;
    }
    if (!pos) {
      pos = f.pos.clone().addScaledVector(f.fwd, depth);
      clampUnder(pos, 0.9);
    }
    return {
      id: routable ? c.id : null, i, pos, content: c, routable, homeP,
      // size/spacing jitter (rev-2): wider size spread than the first spike
      // build, so density never reads as a "row of coins". Smaller than the
      // spike's 0.55-0.81 — at the journey's fov 54 the spike sizes read as
      // lanterns, the approved still's faces are small against the frame.
      size: 0.34 + rand() * 0.24,
      seed: rand(),
      tilt: (rand() - 0.5) * 0.16,
      strandCount: 3 + Math.floor(rand() * 3),
      rand,
    };
  });

  // gentle separation pass — per-pair jittered minimum so spacing never
  // settles into an even chain
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].pos, b = nodes[j].pos;
        const d = a.distanceTo(b);
        const min = 1.7 + ((i * 31 + j * 17) % 7) * 0.07;
        if (d < min && d > 0.001) {
          const push = a.clone().sub(b).normalize().multiplyScalar((min - d) * 0.5);
          a.add(push); b.sub(push);
          clampUnder(a, 0.9); clampUnder(b, 0.9);
        }
      }
    }
  }

  // HARD RULE (rev 2, verbatim): every portrait node keeps >=3.0 world units
  // of clearance from ANY point of the camera path — descent and rise
  // included — or its defocused plane can swallow the whole frame on a
  // different pass. If the push breaches the soil, it is redirected along
  // the horizontal component.
  function enforceClearance(nd) {
    for (let it = 0; it < 4; it++) {
      const cd = camDist(nd.pos.x, nd.pos.y, nd.pos.z);
      if (cd >= 3.0) return;
      const nearest = nearestCamPt(nd.pos);
      const away = nd.pos.clone().sub(nearest);
      if (away.lengthSq() < 0.001) away.set(0, -1, 0);
      away.normalize();
      const lid = groundY(nd.pos.x, nd.pos.z) - (0.35 + nd.size);
      if (nd.pos.y + away.y * (3.0 - cd) > lid) {
        away.y = Math.min(away.y, 0);
        if (away.lengthSq() < 0.05) away.set(0, -1, 0);
        away.normalize();
      }
      nd.pos.addScaledVector(away, 3.05 - cd);
      clampUnder(nd.pos, 0.35 + nd.size);
    }
  }
  for (const nd of nodes) enforceClearance(nd);

  // Rest reachability repair (the grey-box gap, fixed by construction and
  // then VERIFIED here): every routable node must project into the rest
  // frame with margin for the hotspot layer (|ndc| <= 0.85) at a workable
  // depth. Failures re-home to their cell in the rest frame at mid depth.
  const TANV_R = Math.tan(0.5 * restFrame.fov * Math.PI / 180);
  function restOk(nd) {
    const pr = projectInto(restFrame, nd.pos);
    return pr.z > 2.6 && pr.z < 15.5 && Math.abs(pr.x) <= 0.85 && Math.abs(pr.y) <= 0.85;
  }
  for (const nd of nodes) {
    if (!nd.routable || restOk(nd)) continue;
    const cell = CELLS[(nd.i * 4 + Math.floor(nd.i / 9)) % 9];
    for (let attempt = 0; attempt < 10; attempt++) {
      const cx = clamp(cell[0] * 0.9 + (nd.rand() - 0.5) * 0.2, -0.8, 0.8);
      const cy = clamp(cell[1] * 0.9 + (nd.rand() - 0.5) * 0.2, -0.8, 0.62);
      const d = 5.0 + nd.rand() * 5.5;
      const p = restFrame.pos.clone()
        .addScaledVector(restFrame.fwd, d)
        .addScaledVector(restFrame.right, cx * TANV_R * 1.55 * d)
        .addScaledVector(restFrame.up, cy * TANV_R * d);
      clampUnder(p, 0.35 + nd.size);
      if (camDist(p.x, p.y, p.z) < 3.0) continue;
      nd.pos.copy(p);
      break;
    }
    enforceClearance(nd);
  }

  /* ---------------- atlases (8 columns; flipY-correct cell coords) ------ */
  const CELL = 256;
  const COLS = 8;
  const ROWS = Math.ceil(NODE_COUNT / COLS);
  const cellUV = (i) => [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / ROWS];

  const bustSeeds = nodes.map((nd, i) => (nd.content.seed ?? i + 1) * 131 + i * 7);
  const atlasA = makeAtlas(NODE_COUNT, COLS, CELL, drawBust, bustSeeds);
  const anonSeeds = [11, 23, 37, 53];
  const atlasB = makeAtlas(4, 2, CELL, drawAnonGlyph, anonSeeds);

  /* ---------------- local strands that TERMINATE at each node ----------- */
  const nodeStrandSpecs = [];
  function addStrandCurve(startPt, target, nodeIdx, strandVal, seedA, seedB, amp) {
    const segs = 5;
    const pts = [];
    for (let j = 0; j <= segs; j++) {
      const t = j / segs;
      const e = H.easings.smooth(t);
      const p = startPt.clone().lerp(target, e);
      const hump = Math.sin(Math.PI * t);
      p.x += H.fbm3(seedA * 2.3, t * 3.3, 1.7, 3) * amp * hump;
      p.y += H.fbm3(3.9, t * 3.1 + seedA * 1.4, seedB * 0.0005, 3) * amp * 0.75 * hump;
      p.z += H.fbm3(1.1, 2.6, t * 2.8 + seedA * 1.9, 3) * amp * hump;
      clampUnder(p, 0.16);
      pts.push(p);
    }
    pts[segs].copy(target);   // terminate exactly at the node
    nodeStrandSpecs.push({ pts, node: nodeIdx, strand: strandVal });
  }
  function addLocalStrands(target, nodeIdx, count, seed, minLen, maxLen, cordBias) {
    const rand = H.rng(seed >>> 0);
    for (let k = 0; k < count; k++) {
      let start = null;
      if (rand() < cordBias) start = nearestCordPoint(target, rand);
      if (!start) {
        const a = rand() * TAU;
        const b = (rand() - 0.5) * Math.PI * 0.85;
        const rr = minLen + rand() * (maxLen - minLen);
        start = V(
          target.x + Math.cos(a) * Math.cos(b) * rr,
          target.y + Math.sin(b) * rr * 0.75,
          target.z + Math.sin(a) * Math.cos(b) * rr,
        );
        clampUnder(start, 0.16);
      }
      addStrandCurve(start, target, nodeIdx, (k + 1) / (count + 1), k + seed * 0.0007, seed, 0.95);
    }
  }
  for (const n of nodes) {
    addLocalStrands(n.pos, n.i, n.strandCount, 8100 + n.i * 173, 1.7, 4.2, 0.45);
  }
  // node-to-node links: people are woven into EACH OTHER's networks —
  // each node reaches its nearest neighbour(s), endpoints exact at both.
  for (const n of nodes) {
    const byDist = nodes
      .filter(m => m.i !== n.i)
      .sort((a, b) => a.pos.distanceToSquared(n.pos) - b.pos.distanceToSquared(n.pos));
    const linkCount = n.rand() < 0.45 ? 2 : 1;
    for (let k = 0; k < linkCount; k++) {
      const m = byDist[k];
      if (!m || m.pos.distanceTo(n.pos) > 8.5) continue;
      addStrandCurve(m.pos.clone(), n.pos, n.i, 0.9 - k * 0.25, n.i * 1.7 + k * 3.1, 7700 + n.i, 1.35);
    }
  }

  const nodeStrands = (() => {
    const pos = [], along = [], strand = [], nodeA = [];
    const N = 8;
    for (const s of nodeStrandSpecs) {
      const curve = H.catmull(s.pts);
      let prev = curve.getPointAt(0);
      for (let j = 1; j <= N; j++) {
        const t = j / N;
        const p = curve.getPointAt(t);
        pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        along.push((j - 1) / N, t);
        strand.push(s.strand, s.strand);
        nodeA.push(s.node, s.node);
        prev = p;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    geo.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
    geo.setAttribute('aNode', new THREE.Float32BufferAttribute(nodeA, 1));
    const mat = makeNodeStrandMat(P.gold, P.goldBright, {
      baseOpacity: 0.14 * exposure, pulseWidth: 0.13, fogDensity: 0.016,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.renderOrder = -3;
    group.add(lines);
    return { lines, mat, geo, driver: H.pulseDriver(1.35), verts: pos.length / 3 };
  })();

  /* ---------------- portrait planes (one draw call) ---------------- */
  const portraitMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMapA: { value: atlasA },
      uMapP: { value: atlasA },     // becomes the photo atlas when it lands
      uMapB: { value: atlasB },
      uAnon: { value: 0 },
      uPhoto: { value: 0 },
      uCellAP: { value: new THREE.Vector2(1 / COLS, 1 / ROWS) },
      uRim: { value: new THREE.Color(P.ember) },
      uCore: { value: new THREE.Color(P.goldBright) },
      uHaze: { value: new THREE.Color(P.deepGold) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      uOpacity: { value: 0 },       // == chapter fade
      uExposure: { value: exposure },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute vec2 aCorner;
      attribute vec2 aCellA;
      attribute vec2 aCellB;
      attribute float aNode;
      attribute float aSeed;
      attribute float aSize;
      attribute float aTilt;
      attribute float aAnonF;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      uniform vec2 uCellAP;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF;
      void main() {
        vQ = aCorner;
        vec2 half01 = aCorner * 0.5 + 0.5;
        vUvA = half01 * uCellAP + aCellA;
        vUvB = half01 * 0.5 + aCellB;
        vSeed = aSeed;
        vAnonF = aAnonF;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += vH * 0.62;                       // hover: step forward in depth
        float dist = max(-mv.z, 0.05);
        // defocus band (rev-2 retune): only true near passes (< ~5) soften;
        // the mid field reads crisp like the approved still
        float nearBlur = (1.0 - smoothstep(2.2, 5.0, dist)) * (1.0 - vH * 0.45);
        vSoft = nearBlur;
        // grown, not pinned: slight per-node tilt + slow micro-sway + breath
        float ang = aTilt + sin(uTime * (0.05 + fract(aSeed) * 0.06) + aSeed * 3.0) * 0.02;
        float ca = cos(ang), sa = sin(ang);
        vec2 c = vec2(aCorner.x * ca - aCorner.y * sa, aCorner.x * sa + aCorner.y * ca);
        float breath = 1.0 + 0.010 * sin(uTime * (0.14 + fract(aSeed) * 0.21) + aSeed * 7.0);
        float size = aSize * breath * (1.0 + 0.13 * vH) * (1.0 + nearBlur * 1.0);
        mv.xy += c * size;
        vDepth = dist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapA, uMapP, uMapB;
      uniform vec3 uRim, uCore, uHaze;
      uniform float uTime, uOpacity, uAnon, uPhoto, uExposure;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF;
      void main() {
        float r = length(vQ);
        if (r > 1.30) discard;
        // foreground defocus is a REAL blur: force lower mips as vSoft rises
        float lod = vSoft * 5.5;
        // three-way content: procedural bust -> real photo -> anonymous glyph
        // (vAnonF is the per-node consent gate: it forces the glyph even in
        // photo mode when enforcement is on)
        float anon = max(uAnon, vAnonF);
        vec4 tAP = mix(texture2D(uMapA, vUvA, lod), texture2D(uMapP, vUvA, lod), uPhoto);
        vec4 t = mix(tAP, texture2D(uMapB, vUvB, lod), anon);
        float soft = exp(-r * r * 1.7);
        float mask = mix(t.a, soft * 0.72, vSoft * 0.88);
        // independent flicker — two incommensurate rates, no shared loop
        float flick = 0.86 + 0.14 * (
            0.62 * sin(uTime * (0.29 + vSeed * 0.61) + vSeed * 17.3)
          + 0.38 * sin(uTime * (0.163 + vSeed * 0.37) + vSeed * 5.1));
        float rq = (r - 0.72) / 0.115;
        float rim = exp(-rq * rq);
        float boost = vH;
        vec3 col = t.rgb * (0.88 + 0.30 * boost + 0.55 * vWv)
          + uRim * rim * (0.07 + 0.80 * boost + 0.60 * vWv) * (1.0 - vSoft * 0.85)
          + uCore * exp(-r * r * 8.0) * (0.04 + 0.24 * boost + 0.30 * vWv);
        // distant nodes emerge from amber haze rather than vanishing to black
        float haze = exp(-0.00135 * vDepth * vDepth);
        col = mix(uHaze * 0.38, col, clamp(haze + 0.14, 0.0, 1.0)) * flick;
        float alpha = mask * (1.0 - vSoft * 0.85) * (0.35 + 0.75 * haze) * uOpacity * uExposure;
        alpha = clamp(alpha * (1.0 + 0.22 * vWv), 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }`,
  });

  const portraits = (() => {
    const n = NODE_COUNT;
    const pos = new Float32Array(n * 4 * 3);
    const corner = new Float32Array(n * 4 * 2);
    const cellA = new Float32Array(n * 4 * 2);
    const cellB = new Float32Array(n * 4 * 2);
    const nodeA = new Float32Array(n * 4);
    const seedA = new Float32Array(n * 4);
    const sizeA = new Float32Array(n * 4);
    const tiltA = new Float32Array(n * 4);
    const anonF = new Float32Array(n * 4);
    const idx = new Uint16Array(n * 6);
    const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    nodes.forEach((nd, i) => {
      const [ax, ay] = cellUV(i);
      const bcell = i % 4;
      const bx = (bcell % 2) * 0.5, by = 1 - (Math.floor(bcell / 2) + 1) * 0.5;
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k;
        pos[v * 3 + 0] = nd.pos.x; pos[v * 3 + 1] = nd.pos.y; pos[v * 3 + 2] = nd.pos.z;
        corner[v * 2 + 0] = CORNERS[k][0]; corner[v * 2 + 1] = CORNERS[k][1];
        cellA[v * 2 + 0] = ax; cellA[v * 2 + 1] = ay;
        cellB[v * 2 + 0] = bx; cellB[v * 2 + 1] = by;
        nodeA[v] = i; seedA[v] = nd.seed * 9.7 + i * 1.31;
        sizeA[v] = nd.size; tiltA[v] = nd.tilt;
        anonF[v] = 0;    // consent enforcement writes 1s via setConsentEnforced
      }
      const o = i * 4;
      idx.set([o, o + 1, o + 2, o, o + 2, o + 3], i * 6);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    geo.setAttribute('aCellA', new THREE.BufferAttribute(cellA, 2));
    geo.setAttribute('aCellB', new THREE.BufferAttribute(cellB, 2));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
    geo.setAttribute('aTilt', new THREE.BufferAttribute(tiltA, 1));
    geo.setAttribute('aAnonF', new THREE.BufferAttribute(anonF, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mesh = new THREE.Mesh(geo, portraitMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    group.add(mesh);
    return { mesh, geo, planes: n };
  })();

  /* ---------------- real 3D fibre rim: strands radiating off each disc --- */
  const RIM_FIBRES = 12;
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(P.ember) },
      uHot: { value: new THREE.Color(P.goldBright) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      uBase: { value: 0.30 * exposure },
      uFade: { value: 0 },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute vec2 aOff;
      attribute float aNode;
      attribute float aSeed;
      attribute float aAlong;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      varying float vA, vSeed, vH, vSoft, vDepth, vWv;
      void main() {
        vA = aAlong; vSeed = aSeed;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += vH * 0.62;
        float dist = max(-mv.z, 0.05);
        float nearBlur = (1.0 - smoothstep(2.2, 5.0, dist)) * (1.0 - vH * 0.45);
        vSoft = nearBlur; vDepth = dist;
        // moisture/substrate sway: per-fibre phase, tiny amplitude
        float ang = sin(uTime * (0.20 + aSeed * 0.47) + aSeed * 11.3) * 0.05;
        float ca = cos(ang), sa = sin(ang);
        vec2 o = vec2(aOff.x * ca - aOff.y * sa, aOff.x * sa + aOff.y * ca);
        mv.xy += o * (1.0 + 0.11 * vH) * (1.0 + nearBlur * 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor, uHot;
      uniform float uTime, uBase, uFade;
      varying float vA, vSeed, vH, vSoft, vDepth, vWv;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.37 + vSeed * 0.9) + vSeed * 23.1);
        float fall = 1.0 - vA;                    // hot at the rim, fading outward
        float a = uBase * fall * fall * (0.62 + 0.38 * tw) * (1.0 - vSoft * 0.9);
        a *= exp(-0.0013 * vDepth * vDepth) * (1.0 + 1.5 * vH + 1.7 * vWv);
        vec3 col = mix(uColor, uHot, clamp(vH * 0.7 + 0.15 + vWv * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(a * uFade, 0.0, 1.0));
      }`,
  });

  const rimFibres = (() => {
    const SEGS = 3;
    const total = NODE_COUNT * RIM_FIBRES * SEGS * 2;
    const pos = new Float32Array(total * 3);
    const off = new Float32Array(total * 2);
    const nodeA = new Float32Array(total);
    const seedA = new Float32Array(total);
    const alongA = new Float32Array(total);
    let w = 0;
    nodes.forEach((nd, i) => {
      const rand = H.rng((3300 + i * 97) >>> 0);
      for (let f = 0; f < RIM_FIBRES; f++) {
        const a0 = (f / RIM_FIBRES) * TAU + (rand() - 0.5) * 0.42;
        const r0 = nd.size * (0.66 + rand() * 0.10);
        const len = nd.size * (0.34 + rand() * 0.72);
        const bend = (rand() - 0.5) * 0.9;
        const sd = rand();
        const pts = [];
        for (let s = 0; s <= SEGS; s++) {
          const t = s / SEGS;
          const a = a0 + bend * t * t;
          const rr = r0 + len * t;
          const jit = (H.noise3(i * 2.1 + f * 0.7, t * 4.0, sd * 9.0)) * nd.size * 0.10 * t;
          pts.push([Math.cos(a) * rr + jit, Math.sin(a) * rr - jit * 0.6, t]);
        }
        for (let s = 0; s < SEGS; s++) {
          for (const q of [pts[s], pts[s + 1]]) {
            pos[w * 3 + 0] = nd.pos.x; pos[w * 3 + 1] = nd.pos.y; pos[w * 3 + 2] = nd.pos.z;
            off[w * 2 + 0] = q[0]; off[w * 2 + 1] = q[1];
            nodeA[w] = i; seedA[w] = sd * 7.3 + f * 0.53; alongA[w] = q[2];
            w++;
          }
        }
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 2));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute('aAlong', new THREE.BufferAttribute(alongA, 1));
    const lines = new THREE.LineSegments(geo, rimMat);
    lines.frustumCulled = false;
    lines.renderOrder = 1;
    group.add(lines);
    return { lines, geo, verts: total };
  })();

  /* ---------------- ember cores + broad halos (Points, 2 draws) --------- */
  function makeGlowPoints(map, color, sizeMul, baseA, hoverA, order) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: map },
        uColor: { value: new THREE.Color(color) },
        uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
        uScale: { value: 220 },
        uBaseA: { value: baseA * exposure }, uHoverA: { value: hoverA },
        uFade: { value: 0 },
        uWaveC: { value: new THREE.Vector3(0, 0, 0) },
        uWaveR: { value: -100 },
        uWaveW: { value: 2.5 },
        uWaveAmt: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aSeed;
        attribute float aNode;
        uniform float uTime, uHoverIdx, uHoverAmt, uScale;
        uniform float uWaveR, uWaveW, uWaveAmt;
        uniform vec3 uWaveC;
        varying float vSeed, vH, vWv;
        void main() {
          vSeed = aSeed;
          vH = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
          float wd = distance(position, uWaveC) - uWaveR;
          vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          mv.z += vH * 0.62;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * aSize * (1.0 + 0.35 * vH + 0.18 * vWv) / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uTime, uBaseA, uHoverA, uFade;
        varying float vSeed, vH, vWv;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float flick = 0.80 + 0.20 * sin(uTime * (0.33 + vSeed * 0.71) + vSeed * 13.7);
          float a = t.a * (uBaseA + uHoverA * vH) * flick * (1.0 + 1.3 * vWv);
          gl_FragColor = vec4(uColor, clamp(a * uFade, 0.0, 1.0));
        }`,
    });
    const n = NODE_COUNT;
    const pos = new Float32Array(n * 3);
    const sizeA = new Float32Array(n);
    const seedA = new Float32Array(n);
    const nodeA = new Float32Array(n);
    nodes.forEach((nd, i) => {
      pos[i * 3] = nd.pos.x; pos[i * 3 + 1] = nd.pos.y; pos[i * 3 + 2] = nd.pos.z;
      sizeA[i] = nd.size * sizeMul;
      seedA[i] = nd.seed * 11.3 + i * 0.77;
      nodeA[i] = i;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = order;
    group.add(pts);
    return { pts, mat };
  }
  const cores = makeGlowPoints(H.softDisc(64), P.goldBright, 0.5, 0.062, 0.30, 3);
  const halos = makeGlowPoints(H.glowSprite(P.ember, 64), P.ember, 2.5, 0.035, 0.18, -2);

  /* ---------------- LOOK-DEV photo pipeline (async; never blocks boot) ---
     Photos are the test set in assets/test-portraits (README: never ship).
     Resolved against import.meta.url so the chapter works from the journey
     page's own base. On success the photo atlas is baked through the spike
     treatment and photo mode becomes available; on failure the field simply
     stays procedural. */
  let photosAvailable = false;
  async function loadPhotos() {
    const base = new URL(TEST_PORTRAITS.base, import.meta.url);
    const load = (name) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res([name, im]);
      im.onerror = () => rej(new Error('photo failed: ' + name));
      im.src = new URL(name, base).href;
    });
    const entries = await Promise.all(
      [...TEST_PORTRAITS.small, ...TEST_PORTRAITS.large].map(load));
    return {
      images: Object.fromEntries(entries),
      small: TEST_PORTRAITS.small,
      large: TEST_PORTRAITS.large,
    };
  }
  const photosReady = loadPhotos().then((photos) => {
    // large 512-source photos to the nodes nearest the camera path (the
    // foreground planes), the small pool everywhere else, deterministic
    // mirror / exposure / warmth variation — spike rev-1 scheme verbatim.
    const byNearness = nodes
      .map((nd) => ({ i: nd.i, gd: camDist(nd.pos.x, nd.pos.y, nd.pos.z) }))
      .sort((a, b) => a.gd - b.gd);
    const largeRank = new Map();
    byNearness.slice(0, photos.large.length).forEach((e, rank) => largeRank.set(e.i, rank));
    const specs = nodes.map((nd, i) => {
      const lr = largeRank.get(i);
      const img = lr != null
        ? photos.images[photos.large[lr]]
        : photos.images[photos.small[(i * 7 + 3) % photos.small.length]];
      const pass = lr != null ? 0 : Math.floor((i * 7 + 3) / photos.small.length);
      return {
        img,
        mirror: (pass + ((i * 13) % 7 < 3 ? 1 : 0)) % 2 === 1,
        exposure: 0.90 + ((i * 29) % 13) / 13 * 0.26,
        warmth: ((i * 17) % 11) / 11,
        seed: 5000 + i * 37,
      };
    });
    portraitMat.uniforms.uMapP.value = makeAtlas(NODE_COUNT, COLS, CELL, drawPhotoCell, specs);
    photosAvailable = true;
    return true;
  }).catch((e) => {
    console.warn('[owned] test photos unavailable — staying procedural:', e.message);
    return false;
  });

  /* ---------------- state + frame update ---------------- */
  let hoverIdx = -999, selIdx = -999;
  let hoverAmt = 0, selAmt = 0;
  let anonTarget = 0, photoTarget = 0;
  let wave = null;
  let fade = 0;

  const timeMats = [portraitMat, rimMat, cores.mat, halos.mat, nodeStrands.mat];
  const waveMats = timeMats;   // every node layer answers the wave

  const api = {
    group, nodes,
    photosReady,
    get photosAvailable() { return photosAvailable; },
    counts: {
      nodeCount: NODE_COUNT,
      routable: C_COUNT,
      planes: portraits.planes,
      strandVerts: nodeStrands.verts,
      rimVerts: rimFibres.verts,
      strandCurves: nodeStrandSpecs.length,
      atlasPx: `${atlasA.image.width}x${atlasA.image.height} ×2 + ${atlasB.image.width}x${atlasB.image.height}`,
    },

    indexOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.i : -1;
    },
    worldOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.pos.clone() : null;
    },
    /** QA: routable nodes that frame at the rest pose (the reachability audit). */
    restVisible() {
      return nodes.filter(n => n.routable && restOk(n)).map(n => n.id);
    },

    setHover(idx) {
      if (idx === hoverIdx) return;
      hoverIdx = idx;
      if (idx >= 0) nodeStrands.driver.fire();
    },
    setSelected(idx) {
      if (idx === selIdx) return;
      selIdx = idx;
      if (idx >= 0) nodeStrands.driver.fire();
    },
    // mode: 'procedural' | 'photo' | 'anonymous'
    setMode(m) {
      photoTarget = m === 'photo' ? 1 : 0;
      anonTarget = m === 'anonymous' ? 1 : 0;
    },
    get mode() {
      return anonTarget ? 'anonymous' : (photoTarget ? 'photo' : 'procedural');
    },
    /** OW-4.4 consent gate: when on, any contributor without consent:true
     *  renders the anonymous glyph regardless of the global mode. With the
     *  current all-placeholder content this blanks every real image — which
     *  is exactly the rule. */
    setConsentEnforced(on) {
      const attr = portraits.geo.attributes.aAnonF;
      nodes.forEach((nd, i) => {
        const v = on && nd.content.consent !== true ? 1 : 0;
        for (let k = 0; k < 4; k++) attr.setX(i * 4 + k, v);
      });
      attr.needsUpdate = true;
    },
    // pod-hover responses (OW-3): an expanding spherical wave in WORLD space.
    wavePulse(center, { speed = 3.6, width = 2.8, maxR = 30, amp = 1 } = {}) {
      wave = { c: center.clone(), r: -width * 0.6, speed, width, maxR, amp };
    },
    setFade(a) {
      fade = a;
      portraitMat.uniforms.uOpacity.value = a;
      rimMat.uniforms.uFade.value = a;
      cores.mat.uniforms.uFade.value = a;
      halos.mat.uniforms.uFade.value = a;
      nodeStrands.mat.uniforms.uFade.value = a;
    },
    get hoverIdx() { return hoverIdx; },
    get selIdx() { return selIdx; },

    update(dt, time) {
      if (fade <= 0 && !wave) return;
      for (const m of timeMats) m.uniforms.uTime.value = time;

      // colony wave: expand, fade out over the last quarter, then rest
      if (wave) {
        wave.r += dt * wave.speed;
        const fadeW = 1 - clamp((wave.r / wave.maxR - 0.72) / 0.28, 0, 1);
        const amt = wave.amp * fadeW;
        for (const m of waveMats) {
          m.uniforms.uWaveC.value.copy(wave.c);
          m.uniforms.uWaveR.value = wave.r;
          m.uniforms.uWaveW.value = wave.width;
          m.uniforms.uWaveAmt.value = amt;
        }
        if (wave.r > wave.maxR) {
          wave = null;
          for (const m of waveMats) m.uniforms.uWaveAmt.value = 0;
        }
      }

      hoverAmt += ((hoverIdx >= 0 ? 1 : 0) - hoverAmt) * Math.min(dt * 5.0, 1);
      selAmt += ((selIdx >= 0 ? 1 : 0) - selAmt) * Math.min(dt * 3.2, 1);
      const u = portraitMat.uniforms;
      u.uHoverIdx.value = hoverIdx; u.uHoverAmt.value = hoverAmt;
      u.uSelIdx.value = selIdx; u.uSelAmt.value = selAmt;
      u.uAnon.value += (anonTarget - u.uAnon.value) * Math.min(dt * 2.6, 1);
      u.uPhoto.value += (photoTarget - u.uPhoto.value) * Math.min(dt * 2.6, 1);
      rimMat.uniforms.uHoverIdx.value = hoverIdx;
      rimMat.uniforms.uHoverAmt.value = hoverAmt;
      rimMat.uniforms.uSelIdx.value = selIdx;
      rimMat.uniforms.uSelAmt.value = selAmt;
      const activeIdx = hoverIdx >= 0 ? hoverIdx : selIdx;
      const activeAmt = Math.max(hoverAmt, selAmt * 0.85);
      cores.mat.uniforms.uHoverIdx.value = activeIdx;
      cores.mat.uniforms.uHoverAmt.value = activeAmt;
      halos.mat.uniforms.uHoverIdx.value = activeIdx;
      halos.mat.uniforms.uHoverAmt.value = activeAmt;

      // only the LOCAL strands of the active node illuminate
      nodeStrands.driver.update(dt);
      nodeStrands.mat.uniforms.uActive.value = activeIdx;
      nodeStrands.mat.uniforms.uActiveAmt.value = Math.max(hoverAmt, selAmt * 0.9);
      nodeStrands.mat.uniforms.uPulse.value = nodeStrands.driver.value;
      nodeStrands.mat.uniforms.uPulseOn.value = nodeStrands.driver.active ? 1 : 0;
    },
  };
  return api;
}
