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
import * as H from '../../lib/helpers.js';
import { TEST_PORTRAITS } from '../../../assets/test-portraits/manifest.js';
import { REST_P } from './leg.js';

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
  //    (ride-through #2: Hannah judged 0.62/0.90 "too faded" — faces keep more
  //    of their own colour now; the ember rim + grade still tie them in)
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = 'rgba(128,128,128,0.40)';
  g.fillRect(ox, oy, CELL, CELL);
  // 2. amber multiply — the main push into the palette
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgba(226,${(150 + warmth * 22) | 0},${(86 + warmth * 20) | 0},0.72)`;
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
  const { camDist, nearestCamPt, restFrame, projectInto, clampUnder, groundY } = leg;
  const { nearestCordPoint, inVoid } = substrate;

  /* ---------------- placement: AUTHORED IN THE REST FRAME ----------------
     ROOT-NETWORK RESTAGE (2026-08-06, 20-owned-root-network.md).

     The shipped build placed 48 nodes by frame-cell stratification across the
     whole leg — 16 routable ones biased to the rest, 32 ambient ones for
     glide coverage. Under the new composition that is the wrong instrument
     twice over. First, the reference is explicit about the count: "roughly
     14-16 PORTRAIT FACES", distributed "in a broad arc/oval across the
     field, denser toward the lower half, with clear dark breathing room
     between them" — 48 faces is a crowd, not a constellation, and the old
     frame read as a wall of glowing lanterns. Second, a 3x3 grid cannot
     author an arc; it authors a grid, and at this density that is exactly
     what it looked like.

     So the sixteen contributors ARE the field, and their positions are
     authored one by one in the REST FRAME (ndcX, ndcY, depth, size) — the
     house rule from the CONNECT restage: the frame is the spec. Read the
     table as the picture it is:

       · two far arms sweep up and outward at ndcY ~ +0.30, flanking the copy;
       · the sides fill at ndcY ~ 0;
       · the lower half carries nine of the sixteen, in two loose ranks;
       · the three nearest sit lowest and read largest.

     Depth falls as the row falls (13.0 at the top of the arc, 5.2 at the
     bottom), which is what makes "larger and lower reads as nearer" true in
     perspective rather than by drawing bigger sprites. Nothing is placed
     inside the copy block's box (|ndcX| < 0.5, ndcY in +0.15..+0.80) at any
     of the three review sizes.

     The 3.0-unit camera-path clearance rule from Spike B rev 2 SURVIVES
     unchanged below, and is now nearly free by construction: the camera
     glides just under the soil and the whole network hangs below it, so
     every site is already 3+ units under the flight line. The old build had
     to fight that rule; this one satisfies it. */
  const REST_SITES = [
    // ndcX, ndcY, depth, size
    [-0.70, 0.30, 12.4, 0.38],
    [0.72, 0.28, 11.8, 0.38],
    [-0.88, -0.03, 10.6, 0.39],
    [0.88, -0.06, 10.2, 0.39],
    [-0.58, 0.11, 11.6, 0.38],
    [0.56, 0.09, 11.2, 0.38],
    [-0.74, -0.32, 8.8, 0.42],
    [0.76, -0.30, 8.4, 0.42],
    [-0.26, -0.19, 9.8, 0.40],
    [0.21, -0.24, 9.4, 0.41],
    [-0.58, -0.47, 7.2, 0.44],
    [0.56, -0.45, 7.0, 0.44],
    [-0.05, -0.50, 8.0, 0.43],
    [-0.84, -0.68, 6.2, 0.46],
    [0.82, -0.64, 6.0, 0.46],
    [0.28, -0.76, 5.6, 0.47],
  ];

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
    const c = contributors[i % C_COUNT];
    const routable = i < C_COUNT;
    const rand = H.rng((((c.seed ?? (i + 1)) * 7919 + 17 + i * 977) | 0) >>> 0);
    const site = REST_SITES[i % REST_SITES.length];
    const f = restFrame;
    const TANV = Math.tan(0.5 * f.fov * Math.PI / 180);
    const ASPECT = 1.6;
    // a hair of authored-position jitter so the arc never reads as a plotted
    // curve, small enough that the composition above is what ships
    const cx = site[0] + (rand() - 0.5) * 0.045;
    const cy = site[1] + (rand() - 0.5) * 0.040;
    const d = site[2] * (0.96 + rand() * 0.08);
    const pos = f.pos.clone()
      .addScaledVector(f.fwd, d)
      .addScaledVector(f.right, cx * TANV * ASPECT * d)
      .addScaledVector(f.up, cy * TANV * d);
    pos.x = clamp(pos.x, -16.5, 5.0);
    pos.z = clamp(pos.z, -9.0, 9.0);
    clampUnder(pos, 0.9);
    // a site that lands in an authored void is nudged SIDEWAYS out of it,
    // never re-rolled and never dropped: the arc is the composition and the
    // void is only seasoning. (The first pass pushed down 0.45 per iteration
    // and moved two nodes half a frame south of where they were authored —
    // measured NDC y -0.45 -> -0.88. Lateral, small, and capped.)
    for (let guard = 0; guard < 4 && inVoid(pos.x, pos.y, pos.z); guard++) {
      // INWARD, toward frame centre — an outward nudge walks edge sites off
      // the frame (measured: authored 0.78 -> 0.96 ndc, past the chip layer's
      // placeable margin).
      pos.addScaledVector(f.right, (cx >= 0 ? -1 : 1) * 0.34)
         .addScaledVector(f.up, -0.10);
      clampUnder(pos, 0.9);
    }
    return {
      id: routable ? c.id : null, i, pos, content: c, routable, homeP: REST_P,
      // size/spacing jitter (rev-2 rule, kept): a spread wide enough that
      // density never reads as a "row of coins". The base size now comes
      // from the authored table so scale tracks the arc.
      size: site[3] * (0.92 + rand() * 0.20),
      seed: rand(),
      tilt: (rand() - 0.5) * 0.16,
      strandCount: 4 + Math.floor(rand() * 3),
      rand,
    };
  });

  // gentle separation pass — per-pair jittered minimum so spacing never
  // settles into an even chain. The authored arc already spaces them; this
  // only catches the jitter's worst case.
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
  // frame with margin for the hotspot layer (|ndc| <= 0.97 in x, 0.90 in y —
  // the arc deliberately runs wide, and a chip whose dot is at |x| 0.96 is
  // still fully placeable because ui.js flips the pill inboard) at a workable
  // depth. A failure is pulled straight back toward its authored site along
  // the rest gaze rather than re-rolled somewhere else: the arc is authored,
  // so the repair must preserve it.
  function restOk(nd) {
    const pr = projectInto(restFrame, nd.pos, 1.6);
    return pr.z > 2.6 && pr.z < 16.5 && Math.abs(pr.x) <= 0.97 && Math.abs(pr.y) <= 0.90;
  }
  for (const nd of nodes) {
    if (!nd.routable || restOk(nd)) continue;
    const site = REST_SITES[nd.i % REST_SITES.length];
    const TANV_R = Math.tan(0.5 * restFrame.fov * Math.PI / 180);
    for (let attempt = 0; attempt < 8; attempt++) {
      const shrink = 1 - attempt * 0.06;
      const d = site[2] * (1 - attempt * 0.05);
      const p = restFrame.pos.clone()
        .addScaledVector(restFrame.fwd, d)
        .addScaledVector(restFrame.right, site[0] * shrink * TANV_R * 1.6 * d)
        .addScaledVector(restFrame.up, site[1] * shrink * TANV_R * d);
      clampUnder(p, 0.35 + nd.size);
      if (camDist(p.x, p.y, p.z) < 3.0) continue;
      nd.pos.copy(p);
      if (restOk(nd)) break;
    }
    enforceClearance(nd);
  }

  /* ---------------- atlases (8 columns; flipY-correct cell coords) ------ */
  const CELL = 256;
  const COLS = 8;
  const ROWS = Math.ceil(NODE_COUNT / COLS);
  const cellUV = (i) => [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / ROWS];

  // arrangement 0 (`bustSeedsFor` lives with the remix machinery below, so the
  // seed rule has one home and the build-time atlas is simply its first call)
  const atlasA = makeAtlas(NODE_COUNT, COLS, CELL, drawBust, bustSeedsFor(0));
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
  function addLocalStrands(target, nodeIdx, count, seed, minLen, maxLen, cordBias, anchors) {
    const rand = H.rng(seed >>> 0);
    for (let k = 0; k < count; k++) {
      let start = null;
      if (rand() < cordBias) start = nearestCordPoint(target, rand);
      // WHERE THIS FACE IS WIRED INTO THE ROOT WORLD (2026-08-06, report C).
      // `nearestCordPoint` returns a point ON the substrate's own root pool —
      // i.e. this strand does not merely end near a root, it starts on one.
      // Recording those points is what lets substrate.assignOwners() find the
      // face's LOCAL filaments by walking the network graph out from them,
      // instead of guessing by distance. Strands that rolled a free-space
      // start (55% of them) are not anchors and are not recorded.
      if (start && anchors) anchors.push(start.clone());
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
    n.anchors = [];
    addLocalStrands(n.pos, n.i, n.strandCount, 8100 + n.i * 173, 1.7, 4.2, 0.45, n.anchors);
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
      // REMIX (Hannah, 2026-08-07). The *2 slots hold the INCOMING arrangement
      // during a swap; uSwap is the one clock that drives the whole field, and
      // aSwapD is each node's place in the wave. At rest uSwap is 0 and the *2
      // slots are never sampled — which is also why a frozen capture is
      // untouched by any of this.
      uMapA2: { value: atlasA },
      uMapP2: { value: atlasA },
      uSwap: { value: 0 },
      uSwapSpan: { value: 0.34 },   // each node's own crossfade, as a fraction
      // The flare's GATE, and it starts at 0 for a reason worth recording. The
      // per-node flare is a Gaussian on the distance from the node's own
      // crossing, and a Gaussian is never exactly zero: at uSwap = 0 the node
      // whose delay is 0 sits one sigma out and evaluates to exp(-2.4) = 0.091.
      // Left ungated that is a permanent 9% ember lift on one contributor at
      // the resting composition — enough to move a frozen golden and, worse,
      // to make one face quietly hotter than its neighbours forever. The
      // uniform is 0 whenever no swap is running (see promoteSwap), 1 during
      // one, and 0 under prefers-reduced-motion.
      uSwapFlare: { value: 0 },
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
      attribute float aSwapD;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform float uSwap, uSwapSpan, uSwapFlare;
      uniform vec3 uWaveC;
      uniform vec2 uCellAP;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF, vSwap, vFlare;
      void main() {
        vQ = aCorner;
        // THE WAVE. aSwapD is this node's normalised place in the order the
        // swap travels (distance out from the crown, see SWAP ORDER below), so
        // every node's crossfade is the same uSwapSpan-long window, opened at
        // a different moment by the one clock. Span 1 = the whole field turns
        // over together, which is the reduced-motion setting.
        float span = max(uSwapSpan, 0.001);
        float d0 = aSwapD * (1.0 - span);
        vSwap = smoothstep(d0, d0 + span, uSwap);
        // …and a flare centred on the node's own crossing, so the change
        // happens INSIDE a flush of ember rather than being watched happening.
        float fq = (uSwap - (d0 + span * 0.5)) / (span * 0.5);
        vFlare = exp(-fq * fq * 2.4) * uSwapFlare;
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
        // HOVER STAYS IN PLACE (Hannah, 2026-08-06 — report B, and the cause
        // of report A). This line used to read "mv.z += vH * 0.62": the plane
        // stepped 0.62 view units toward the lens on hover. A view-space step
        // toward the camera is not a translation on screen of zero — it is a
        // RADIAL magnification about the frame centre, so the node slid
        // OUTWARD from where it was drawn, by an amount proportional to its
        // eccentricity: measured 13 px at ndc x 0.05 and 87 px at ndc x 0.89,
        // 1440x900. The hit target never moved with it, so the further out a
        // face sat the further the picture disagreed with the pointer — which
        // is exactly why the EDGE faces were the worst ones to hover.
        // The emphasis is now entirely in place: a centred scale (below), the
        // ember ring and the image/core terms in the fragment shader, and the
        // node's own local strands. Nothing about hover moves a node.
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
        // 0.13 -> 0.20: the retired depth step bought 8-12% of apparent growth
        // on its own (a node 0.62 nearer at depth 5.6-12.4). Folding that into
        // the CENTRED scale keeps the hover reading as strong as it was while
        // leaving the node's centre exactly where it is drawn at rest.
        float size = aSize * breath * (1.0 + 0.20 * vH) * (1.0 + nearBlur * 1.0);
        mv.xy += c * size;
        vDepth = dist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapA, uMapP, uMapB, uMapA2, uMapP2;
      uniform vec3 uRim, uCore, uHaze;
      uniform float uTime, uOpacity, uAnon, uPhoto, uExposure;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF, vSwap, vFlare;
      void main() {
        float r = length(vQ);
        if (r > 1.30) discard;
        // foreground defocus is a REAL blur: force lower mips as vSoft rises
        float lod = vSoft * 5.5;
        // and the swap dissolves THROUGH soft focus: both the outgoing and the
        // incoming image lose definition together at the middle of the node's
        // crossfade and the new one comes back sharp. A straight A/B mix of two
        // sharp faces reads as a jump cut; this reads as a focus pull.
        float slod = lod + vFlare * 1.7;
        // three-way content: procedural bust -> real photo -> anonymous glyph
        // (vAnonF is the per-node consent gate: it forces the glyph even in
        // photo mode when enforcement is on)
        float anon = max(uAnon, vAnonF);
        vec4 tA = mix(texture2D(uMapA, vUvA, slod), texture2D(uMapA2, vUvA, slod), vSwap);
        vec4 tP = mix(texture2D(uMapP, vUvA, slod), texture2D(uMapP2, vUvA, slod), vSwap);
        vec4 tAP = mix(tA, tP, uPhoto);
        // the anonymous glyph is identity, not arrangement — a remix never
        // touches it, so it keeps the plain lod
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
        // 0.88 -> 1.12 on the image term and 0.07 -> 0.20 on the resting rim
        // (root-network restage): the reference's people are "softly
        // ringed/haloed with light", i.e. the ring is part of the RESTING
        // read, not only the hover response. The hover deltas are unchanged,
        // so hover still moves the same distance from a higher floor.
        // The swap's own light: the ember RING answers first and hardest (it
        // is the node's edge, so the change reads as arriving from the network
        // around the face) with a much smaller lift in the core and almost
        // none in the image.
        //
        // These levels were cut from a first pass (0.22 / 0.85 / 0.26) after
        // shooting the swap at 375x812. The flare and the colony wave the
        // chapter fires are deliberately SIMULTANEOUS, so their contributions
        // add on the same pixels — and at phone size the only faces on screen
        // are the three or four NEAREST, which are already the largest and
        // brightest things in the frame. Measured on that shot, the image term
        // ran 1.12 -> 1.89 and the near faces bloomed to featureless orbs under
        // UnrealBloom: exactly the failure EXPOSURE_PLANES was tuned against
        // (see index.js). The RING is what should carry a swap anyway — the
        // face has to stay a face while it is being exchanged.
        vec3 col = t.rgb * (1.12 + 0.30 * boost + 0.55 * vWv + 0.10 * vFlare)
          + uRim * rim * (0.20 + 0.80 * boost + 0.60 * vWv + 0.62 * vFlare) * (1.0 - vSoft * 0.85)
          + uCore * exp(-r * r * 8.0) * (0.07 + 0.24 * boost + 0.30 * vWv + 0.15 * vFlare);
        // distant nodes emerge from amber haze rather than vanishing to black
        float haze = exp(-0.00135 * vDepth * vDepth);
        col = mix(uHaze * 0.38, col, clamp(haze + 0.14, 0.0, 1.0)) * flick;
        float alpha = mask * (1.0 - vSoft * 0.85) * (0.35 + 0.75 * haze) * uOpacity * uExposure;
        alpha = clamp(alpha * (1.0 + 0.22 * vWv + 0.12 * vFlare), 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }`,
  });

  /* ---------------- SWAP ORDER: the wave the remix travels on -------------
     A remix that cut all sixteen faces at once would read as a page reload of
     the field. This orders it as a wave OUT FROM THE CROWN, which is the one
     epicentre the chapter already recognises: every root leaves the crown, so
     a change that starts there and runs outward is the network redistributing
     rather than the browser repainting (chapters/owned/index.js setHot fires
     the same gesture from the same point on a crown hover, and substrate
     surge() runs crown -> out along the roots underneath it).

     Measured IN THE REST FRAME, not in world space, and that is the decision
     worth recording. In world space the nodes nearest the crown are the
     NEAR-CAMERA ones — the crown sits 1.85 units off the lens — so a
     world-space order starts the wave on the three big foreground faces at the
     BOTTOM of the picture. Shot and compared: the visitor presses a button at
     top-centre and the answer begins at the far bottom edge, running back up
     the frame while the substrate's own surge runs the other way down the
     roots. Two waves crossing reads as noise. Ordered by distance from the
     crown AS DRAWN, the wave starts under the button, sweeps out along both
     arms and settles at the low corners — one direction, the same one the
     roots and the copy already establish. The house rule from the CONNECT and
     root-network restages, again: the frame is the spec.

     A small deterministic jitter keeps it off a clean expanding ring:
     near-equidistant nodes turn over a beat apart, so the field reads as
     thinking rather than counting. */
  const swapEpicentre = (leg.CROWN ? leg.CROWN.clone() : nodes[0].pos.clone());
  const swapDelays = (() => {
    const crownNdc = projectInto(restFrame, swapEpicentre, 1.6);
    const d = nodes.map((nd) => {
      const p = projectInto(restFrame, nd.pos, 1.6);
      // x by the same 1.6 the placement table uses, so "distance" is the
      // distance the eye sees rather than the one the NDC cube reports
      return Math.hypot((p.x - crownNdc.x) * 1.6, p.y - crownNdc.y);
    });
    const lo = Math.min(...d), hi = Math.max(...d);
    const spread = (hi - lo) || 1;
    return nodes.map((nd, i) => clamp((d[i] - lo) / spread + (nd.seed - 0.5) * 0.11, 0, 1));
  })();
  // World radius for the colony wave index.js fires alongside the swap — that
  // one IS a spherical wave in the world, so it keeps world units.
  const swapMaxR = Math.max(...nodes.map(nd => nd.pos.distanceTo(swapEpicentre)));

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
    const swapD = new Float32Array(n * 4);
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
        swapD[v] = swapDelays[i];
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
    geo.setAttribute('aSwapD', new THREE.BufferAttribute(swapD, 1));
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
        // in place, like the plane it rings — see the portrait shader's note
        float dist = max(-mv.z, 0.05);
        float nearBlur = (1.0 - smoothstep(2.2, 5.0, dist)) * (1.0 - vH * 0.45);
        vSoft = nearBlur; vDepth = dist;
        // moisture/substrate sway: per-fibre phase, tiny amplitude
        float ang = sin(uTime * (0.20 + aSeed * 0.47) + aSeed * 11.3) * 0.05;
        float ca = cos(ang), sa = sin(ang);
        vec2 o = vec2(aOff.x * ca - aOff.y * sa, aOff.x * sa + aOff.y * ca);
        mv.xy += o * (1.0 + 0.18 * vH) * (1.0 + nearBlur * 1.0);
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
          // in place — the core and halo grow about the node, they do not
          // travel toward the lens (see the portrait shader's note)
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * aSize * (1.0 + 0.42 * vH + 0.18 * vWv) / max(-mv.z, 0.1);
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
  // the halo each face sits inside; the core is the ember at its centre
  const cores = makeGlowPoints(H.softDisc(64), P.goldBright, 0.5, 0.085, 0.30, 3);
  const halos = makeGlowPoints(H.glowSprite(P.ember, 64), P.ember, 2.7, 0.058, 0.18, -2);

  /* ---------------- LOOK-DEV photo pipeline (async; never blocks boot) ---
     Photos are the test set in assets/test-portraits (README: never ship).
     Resolved against import.meta.url so the chapter works from the journey
     page's own base. On success the photo atlas is baked through the spike
     treatment and photo mode becomes available; on failure the field simply
     stays procedural. (`photosAvailable` / `photoSet` and the arrangement
     bakers live just below, with the remix machinery they belong to.) */
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
  /* ---------------- ARRANGEMENTS: what a remix actually re-deals ----------
     REMIX (Hannah, 2026-08-07) — see 20-owned-root-network.md.

     THE PORTRAIT-SET SITUATION, stated where the code lives. There is exactly
     ONE image set in this repo: assets/test-portraits, 20 small + 6 large,
     LOOK-DEV ONLY, with a standing pre-deploy rule that it is deleted before
     any public deploy (its README, and the snap() note above). No second set
     of real likenesses may be added to satisfy a remix button, and none has
     been. So the mechanism below is built GENERAL — an arrangement index that
     re-derives every node's source image and its whole treatment — and driven,
     for now, from the one set there is. Point `variantSpecs` at a second
     manifest the day a consented set exists and the button gains real new
     faces with no other change. It genuinely swaps: 16 nodes drawn from 26
     images, so an arrangement moves most of the field to a different face and
     re-lights all of it.

     Arrangement 0 is byte-identical to what shipped before this feature (the
     stride/offset pair at v=0 is the old `i * 7 + 3`, and every other term
     reduces to its old form), so nothing about the resting composition, the
     goldens or the look-dev calibration moves.

     Strides are all coprime with the 20-image small pool, so each is a
     different permutation rather than a rotation of the last. */
  const V_STRIDE = [7, 9, 3, 11, 13, 17, 19];
  const V_OFFSET = [3, 11, 5, 17, 2, 13, 8];

  let photosAvailable = false;
  let photoSet = null;        // { images, small, large } once loaded
  let largeRank = null;       // node index -> rank among the nearest, or absent

  function photoSpecs(v) {
    const st = V_STRIDE[v % V_STRIDE.length];
    const of = V_OFFSET[v % V_OFFSET.length];
    return nodes.map((nd, i) => {
      const lr = largeRank.get(i);
      const k = i * st + of;
      // large 512-source photos stay on the nodes nearest the camera path (a
      // 256px source on a foreground plane reads soft); which of the large
      // images each of them gets rotates with the arrangement.
      const img = lr != null
        ? photoSet.images[photoSet.large[(lr + v) % photoSet.large.length]]
        : photoSet.images[photoSet.small[k % photoSet.small.length]];
      const pass = lr != null ? 0 : Math.floor(k / photoSet.small.length);
      return {
        img,
        mirror: (pass + v + ((i * 13 + v * 5) % 7 < 3 ? 1 : 0)) % 2 === 1,
        exposure: 0.90 + ((i * 29 + v * 7) % 13) / 13 * 0.26,
        warmth: ((i * 17 + v * 3) % 11) / 11,
        seed: 5000 + i * 37 + v * 911,
      };
    });
  }
  function bustSeedsFor(v) {
    return nodes.map((nd, i) => (nd.content.seed ?? i + 1) * 131 + i * 7 + v * 9973);
  }
  function bakeBusts(v) {
    return v === 0 ? atlasA : makeAtlas(NODE_COUNT, COLS, CELL, drawBust, bustSeedsFor(v));
  }
  function bakePhotos(v) {
    return photoSet ? makeAtlas(NODE_COUNT, COLS, CELL, drawPhotoCell, photoSpecs(v)) : null;
  }

  const photosReady = loadPhotos().then((photos) => {
    photoSet = photos;
    const byNearness = nodes
      .map((nd) => ({ i: nd.i, gd: camDist(nd.pos.x, nd.pos.y, nd.pos.z) }))
      .sort((a, b) => a.gd - b.gd);
    largeRank = new Map();
    byNearness.slice(0, photos.large.length).forEach((e, rank) => largeRank.set(e.i, rank));
    portraitMat.uniforms.uMapP.value = bakePhotos(0);
    photosAvailable = true;
    // and start the NEXT arrangement warming while nothing is happening, so
    // the first press of Remix is a swap and not a bake (see prepareNext).
    schedulePrepare();
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

  /* ---------------- the remix swap ----------------
     One clock (uSwap 0 -> 1) opened at a different moment per node by aSwapD.
     While it runs, uMap*2 hold the incoming arrangement; when it lands, the
     incoming becomes current, uSwap drops back to 0 and the retired atlases
     are released. Nothing here touches placement, size, strands or camera —
     the field is exactly the field it was, wearing different faces. */
  const SWAP_MS = 1250;
  const SWAP_MS_REDUCED = 320;
  const SWAP_SPAN = 0.34;          // each node's own crossfade, as a fraction
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  let variant = 0;
  let pending = null;              // { v, bust, photo } — warmed ahead of the press
  let prepareTimer = null;
  let swap = null;                 // { t, dur }

  /** Bake the arrangement after the current one. Called on an idle beat after
   *  the photos land and again after every completed swap, so a press is never
   *  waiting on two canvas atlases; called inline from remix() only if the
   *  visitor got there first. */
  function prepareNext() {
    const v = variant + 1;
    if (pending && pending.v === v && (!photoSet || pending.photo)) return;
    if (pending) { retire(pending.bust); retire(pending.photo); }
    pending = { v, bust: bakeBusts(v), photo: bakePhotos(v) };
  }
  function schedulePrepare() {
    if (prepareTimer) return;
    const run = () => { prepareTimer = null; prepareNext(); };
    prepareTimer = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(run, { timeout: 1500 })
      : setTimeout(run, 400);
  }

  /** Release a canvas texture, unless it is still wired to something. The two
   *  build-time atlases are never released: atlasA is arrangement 0's busts and
   *  is also uMapP's stand-in until the photos land, and atlasB is the
   *  anonymous glyph sheet, which a remix has no business touching. */
  function retire(tex) {
    if (!tex || tex === atlasA || tex === atlasB) return;
    const u = portraitMat.uniforms;
    if (tex === u.uMapA.value || tex === u.uMapP.value
      || tex === u.uMapA2.value || tex === u.uMapP2.value) return;
    tex.dispose();
  }

  /** The incoming arrangement becomes the resting one. */
  function promoteSwap() {
    const u = portraitMat.uniforms;
    const oldBust = u.uMapA.value, oldPhoto = u.uMapP.value;
    u.uMapA.value = u.uMapA2.value;
    u.uMapP.value = u.uMapP2.value;
    u.uSwap.value = 0;
    u.uSwapFlare.value = 0;    // back to an exactly-unlit resting field
    swap = null;
    if (oldBust !== u.uMapA.value) retire(oldBust);
    if (oldPhoto !== u.uMapP.value) retire(oldPhoto);
    schedulePrepare();
  }

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
    /** World-space radius of the DRAWN face — the ember ring, not the quad.
     *  The quad's half-extent is `size`; the atlas draws its disc at 0.36 of
     *  the cell, i.e. 0.72 of the half-extent, and the shader's rim ring sits
     *  at the same 0.72. 0.80 takes in the ring itself and the fray just
     *  outside it. ui.js turns this into the chip's hit radius, which is the
     *  whole point: the thing you can hover is the thing you can see. */
    radiusOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.size * 0.80 : 0;
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

    /** REMIX: re-deal the field's faces (Hannah, 2026-08-07).
     *
     *  Returns the shape the caller needs to answer in the scene and in the
     *  DOM — { arrangement, ms, epicentre, maxR, speed } — or null if a swap
     *  is already running. `speed` is the world-units/sec a wave must travel
     *  to keep pace with the node order, so the strand/rim/halo response the
     *  chapter fires arrives at each face as that face turns over.
     *
     *  Under prefers-reduced-motion the span opens to 1: every node's window
     *  is the whole clock, so the field cross-fades as one over a third of a
     *  second, with the per-node ember flare off. Same start state, same end
     *  state, no travelling motion. */
    remix() {
      if (swap) return null;
      const reduced = !!reduceMotion.matches;
      if (!pending || pending.v !== variant + 1 || (photoSet && !pending.photo)) {
        if (prepareTimer) {
          if (typeof cancelIdleCallback === 'function') cancelIdleCallback(prepareTimer);
          else clearTimeout(prepareTimer);
          prepareTimer = null;
        }
        prepareNext();
      }
      const u = portraitMat.uniforms;
      u.uMapA2.value = pending.bust;
      // With no photo set the material's two channels are the same sheet, the
      // way they are at boot before the photos land — so a procedural-only
      // build still genuinely remixes (different busts) instead of no-oping.
      u.uMapP2.value = pending.photo || pending.bust;
      u.uSwapSpan.value = reduced ? 1 : SWAP_SPAN;
      u.uSwapFlare.value = reduced ? 0 : 1;
      u.uSwap.value = 0;
      variant = pending.v;
      pending = null;
      const dur = (reduced ? SWAP_MS_REDUCED : SWAP_MS) / 1000;
      swap = { t: 0, dur };
      return {
        arrangement: variant,
        ms: Math.round(dur * 1000),
        epicentre: swapEpicentre.clone(),
        maxR: swapMaxR,
        // the wave has to cross the field in the stretch of the clock the node
        // order actually occupies (1 - span), or it outruns its own faces
        speed: swapMaxR / Math.max(0.12, dur * (reduced ? 1 : 1 - SWAP_SPAN)),
      };
    },

    /** Advance the swap clock. Deliberately NOT inside update(): the chapter
     *  stops calling update the moment the group goes invisible, and a visitor
     *  who presses Remix and immediately scrolls out would otherwise come back
     *  to a field frozen half-way between two arrangements. Called from the
     *  chapter animator ahead of its own visibility gate. */
    tickSwap(dt) {
      if (!swap) return;
      swap.t += dt;
      const f = swap.t / swap.dur;
      portraitMat.uniforms.uSwap.value = f < 1 ? f : 1;
      if (f >= 1) promoteSwap();
    },
    get swapping() { return !!swap; },
    get arrangement() { return variant; },
    /** Jump the eased UI channels to their targets — the dt = 0 path (deep
     *  links, hidden-tab and frozen capture), reached through the chapter's
     *  snap().
     *
     *  uPhoto is DELIBERATELY not snapped. Under freezeTime(0) the photo
     *  crossfade never advances, so the frozen captures render the PROCEDURAL
     *  painted busts — and that is the behaviour we want to keep, not a bug to
     *  fix: assets/test-portraits is a placeholder set that must never ship,
     *  and static/captures/*.png is committed to the repo. Snapping it here
     *  would bake real likenesses into a checked-in image. The live page still
     *  crossfades to photos the moment they load, which is where they belong.
     *  (The pre-deploy checklist item — delete the test portraits before any
     *  public deploy — stands regardless.) */
    snap() {
      const u = portraitMat.uniforms;
      u.uAnon.value = anonTarget;
      hoverAmt = hoverIdx >= 0 ? 1 : 0;
      selAmt = selIdx >= 0 ? 1 : 0;
      u.uHoverIdx.value = hoverIdx; u.uHoverAmt.value = hoverAmt;
      u.uSelIdx.value = selIdx; u.uSelAmt.value = selAmt;
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
    // The node the field is currently answering, and how strongly — the same
    // pair `update()` feeds its own layers, exposed so the substrate's local
    // strand lighting can answer the identical node at the identical strength
    // (chapters/owned/index.js).
    get activeIdx() { return hoverIdx >= 0 ? hoverIdx : selIdx; },
    get activeAmt() { return Math.max(hoverAmt, selAmt * 0.85); },

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
