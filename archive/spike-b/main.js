// Spike B — Owned portrait look-development. Self-contained underground scene.
// Keys: [space] glide, [g] raw/finished, [p] cycle procedural/photo/anonymous,
//       [a] anonymous toggle, [d] 16 vs 48 node density, [b] HUD.
// QA:   ?u=0.35 freezes the arc at that parameter; window.__setU(v) too.
import * as THREE from 'three';
import * as H from '../../journey/lib/helpers.js';
import { CONTENT } from '../../content/content.js';
import { TEST_PORTRAITS } from '../../assets/test-portraits/manifest.js';
import { buildField } from './field.js';
import { buildPortraitField } from './portraits.js';
import { createOptics } from './optics.js';

const PAL = {
  gold: 0xd9a441,
  goldBright: 0xf0c877,
  ember: 0xffb36b,
  deepGold: 0x8a6426,
  warmBlack: 0x0a0805,
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- renderer / scene / camera ---------------- */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(PAL.warmBlack, 1);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// warm near-black fog for sprite/points layers (custom shaders carry their own)
scene.fog = new THREE.FogExp2(0x140c05, 0.026);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 220);

/* ---------------- the colony spine + the camera ARC ----------------
   The SPINE (GA -> GB, roughly world -X) is the content axis the colony is
   grown along — unchanged from the first build so the substrate reads the
   same. The CAMERA no longer dollies down that axis: it sweeps a broad arc
   that enters on the +RIGHT flank, crosses the corridor diagonally and exits
   on the -RIGHT flank, while the look target counter-pans toward the flank
   the camera is leaving. View direction stays 45-75 degrees off the motion
   vector for the whole traverse, so faces/cords parallax LATERALLY across
   the frame — nothing streams along the view ray at the lens. */
const GA = new THREE.Vector3(15.0, 2.4, 6.0);
const GB = new THREE.Vector3(-14.0, 2.6, -6.0);
const GD = GB.clone().sub(GA);
const GLEN2 = GD.lengthSq();
const GDIR = GD.clone().normalize();
const RIGHT = new THREE.Vector3().crossVectors(GDIR, new THREE.Vector3(0, 1, 0)).normalize();
const UPN = new THREE.Vector3().crossVectors(RIGHT, GDIR).normalize();

function camPose(s, pos, look) {
  const tc = 0.055 + 0.845 * s;
  const swing = Math.PI * (0.10 + 0.80 * s);
  const side = 8.0 * Math.cos(swing);
  const lift = -0.2 + 1.6 * Math.sin(Math.PI * (0.20 + 0.70 * s));
  pos.copy(GA).addScaledVector(GD, tc)
    .addScaledVector(RIGHT, side)
    .addScaledVector(UPN, lift);
  if (look) {
    const tl = Math.min(tc + 0.155, 1.02);
    // counter-pan: bias the target toward the flank being LEFT behind, so the
    // near field always crosses the frame instead of converging on the lens
    const lookSide = -side * 0.10 + 2.8 * Math.sin(swing);
    look.copy(GA).addScaledVector(GD, tl)
      .addScaledVector(RIGHT, lookSide)
      .addScaledVector(UPN, 0.55 + 0.55 * Math.sin(Math.PI * (0.15 + 1.05 * s)));
  }
  return pos;
}

// sampled camera polyline: field + portrait authoring measure against the
// path the lens ACTUALLY travels (corridor clearance, near tubes, voids)
const CAM_N = 64;
const camPts = [];
for (let i = 0; i <= CAM_N; i++) camPts.push(camPose(i / CAM_N, new THREE.Vector3()));
function camDist(x, y, z) {
  let best = 1e9;
  for (let i = 0; i < camPts.length; i++) {
    const p = camPts[i];
    const dx = x - p.x, dy = y - p.y, dz = z - p.z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
function camAt(s, out) {
  const f = THREE.MathUtils.clamp(s, 0, 1) * CAM_N;
  const i = Math.min(Math.floor(f), CAM_N - 1);
  return out.copy(camPts[i]).lerp(camPts[i + 1], f - i);
}
// full camera basis at parameter s — portrait placement composes the frame
// with this (stratified cells of the frustum at each node's home moment)
const _fp = new THREE.Vector3(), _fl = new THREE.Vector3();
function frameAt(s) {
  camPose(s, _fp, _fl);
  const fwd = _fl.clone().sub(_fp).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  return { pos: _fp.clone(), fwd, right, up };
}
const glide = { GA, GB, GD, GLEN2, GDIR, RIGHT, UPN, camPts, camDist, camAt, frameAt };

/* ---------------- world ---------------- */
const field = buildField({ glide, palette: PAL });
scene.add(field.group);

// LOOK-DEV ONLY test photos (assets/test-portraits/README.md — never ship).
// Same-origin relative fetch; if anything fails to load, photo mode simply
// stays unavailable and the spike still boots (procedural busts instead).
async function loadPhotos() {
  const load = (name) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res([name, im]);
    im.onerror = () => rej(new Error('photo failed: ' + name));
    im.src = TEST_PORTRAITS.base + name;
  });
  const entries = await Promise.all(
    [...TEST_PORTRAITS.small, ...TEST_PORTRAITS.large].map(load));
  return {
    images: Object.fromEntries(entries),
    small: TEST_PORTRAITS.small,
    large: TEST_PORTRAITS.large,
  };
}
let photos = null;
try { photos = await loadPhotos(); }
catch (e) { console.warn('[spike-b] test photos unavailable:', e.message); }

const contributors = (CONTENT.contributors || []).slice(0, 16);
// Two complete fields share the substrate: the approved 16-node run and the
// production-density 48-node run ([d] toggles which is live).
const pf16 = buildPortraitField({ glide, contributors, field, palette: PAL, nodeCount: 16, photos });
const pf48 = buildPortraitField({ glide, contributors, field, palette: PAL, nodeCount: 48, photos });
scene.add(pf16.group);
scene.add(pf48.group);
// DEFAULT BOOT = the best-reading state: real photos at production density
pf16.group.visible = false;
let pf = pf48;                 // the live field
let modeIdx = 0;               // 0 procedural · 1 photo · 2 anonymous
const MODE_NAMES = ['procedural', 'PHOTO', 'ANONYMOUS'];
function applyMode(m) {
  modeIdx = m;
  pf16.setMode(m);
  pf48.setMode(m);
}
applyMode(photos ? 1 : 0);

/* ---------------- page copy (locked strings from content.js) ----------
   The chrome is real DOM above the canvas; strings are asserted from the
   single content source so the spike can never drift from the locked copy. */
{
  const owned = CONTENT.chapters.owned;
  document.querySelector('#copy h1').textContent = owned.heading;
  const byId = Object.fromEntries((owned.claims || []).map(c => [c.id, c]));
  const shared = byId['pod-shared'];
  if (shared) document.getElementById('pod-shared').textContent = shared.text;
  const monthly = byId['pod-monthly'];
  if (monthly) document.querySelector('#pod-monthly .t').textContent = monthly.text;
  const split = byId['pod-split'];
  if (split) {
    document.querySelector('#pod-split .t').textContent = split.text;
    if (split.detail) document.querySelector('#pod-split .detail').textContent = split.detail;
  }
}

/* ---------------- pods -> colony responses (OW-3 handoff) -------------
   Primary claim hover: ONE broad slow pulse travels through the whole
   colony (radial wave across every node layer + staggered cord/hyphae
   surge). Secondary pods: a smaller localized response near their anchor. */
const spineAt = (t) => GA.clone().addScaledVector(GD, t);
const colonyCentre = spineAt(0.5).addScaledVector(UPN, 0.4);
const POD_ANCHORS = {
  'pod-monthly': spineAt(0.30).addScaledVector(RIGHT, -2.0).addScaledVector(UPN, 0.6),
  'pod-split': spineAt(0.72).addScaledVector(RIGHT, 2.2).addScaledVector(UPN, -0.4),
};
document.getElementById('pod-shared').addEventListener('mouseenter', () => {
  const opts = { speed: 4.0, width: 3.2, maxR: 36, amp: 1.0 };
  pf16.wavePulse(colonyCentre, opts);
  pf48.wavePulse(colonyCentre, opts);
  field.surge();
});
for (const id of ['pod-monthly', 'pod-split']) {
  document.getElementById(id).addEventListener('mouseenter', () => {
    const opts = { speed: 3.2, width: 2.0, maxR: 7, amp: 0.85 };
    pf16.wavePulse(POD_ANCHORS[id], opts);
    pf48.wavePulse(POD_ANCHORS[id], opts);
  });
}

/* ---------------- optics (raw-vs-finished from first build) ---------------- */
const optics = createOptics(renderer, scene, camera, {
  width: window.innerWidth, height: window.innerHeight, reducedMotion,
});
optics.setSize(window.innerWidth, window.innerHeight);

/* ---------------- camera glide state ---------------- */
let glideOn = !reducedMotion;      // [space]
let glideAmt = glideOn ? 1 : 0;
let u = 0.10;                      // param along the arc
let dir = 1;                       // ping-pong
const TRAVERSE_S = 84;             // slow, assured, documentary
// below u≈0.05 the entry cord-knot crosses the look centre and the additive
// stack blows out into a lens-flare streak — the arc turns before it
const U_MIN = 0.05;

// QA scrub: freeze the arc for the gap audit
const qU = new URLSearchParams(location.search).get('u');
if (qU !== null) {
  u = THREE.MathUtils.clamp(parseFloat(qU) || 0, 0, 1);
  glideOn = false; glideAmt = 0;
}
window.__setU = (v) => {
  u = THREE.MathUtils.clamp(v, 0, 1);
  glideOn = false; glideAmt = 0;
};

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const pointer = { x: 0, y: 0, nx: 0, ny: 0 };  // ndc + smoothed look offset

function updateCamera(dt, time) {
  glideAmt += ((glideOn ? 1 : 0) - glideAmt) * Math.min(dt * 1.1, 1);
  u += (dt / TRAVERSE_S) * dir * glideAmt;
  if (u > 1) { u = 1; dir = -1; }
  if (u < U_MIN) { u = U_MIN; dir = 1; }

  camPose(u, _pos, _look);
  // documentary handheld: tiny, slow positional noise
  _pos.x += H.noise3(time * 0.05, 1.7, 0) * 0.06;
  _pos.y += H.noise3(0, time * 0.045, 3.1) * 0.05;
  _pos.z += H.noise3(5.2, 0, time * 0.05) * 0.06;
  camera.position.copy(_pos);

  // slow look drift + pointer influence
  _look.x += H.noise3(time * 0.021, 8.8, 0) * 0.55 + pointer.nx * 1.35;
  _look.y += H.noise3(0, time * 0.019, 12.4) * 0.4 + pointer.ny * 0.8;
  _look.z += H.noise3(3.3, 0, time * 0.023) * 0.55;
  camera.lookAt(_look);
}

/* ---------------- interaction ---------------- */
const raycaster = new THREE.Raycaster();
const card = document.getElementById('card');
const cardName = card.querySelector('.name');
const cardRole = card.querySelector('.role');
const cardBlurb = card.querySelector('.blurb');
let cardOpenIdx = -1;

window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function raycastHover() {
  raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
  const hits = raycaster.intersectObjects(pf.proxies, false);
  const idx = hits.length ? hits[0].object.userData.idx : -1;
  pf.setHover(idx);
  document.body.style.cursor = idx >= 0 ? 'pointer' : 'default';
  if (idx >= 0) optics.setFocusHint(pf.nodes[idx].pos);
  else if (cardOpenIdx >= 0) optics.setFocusHint(pf.nodes[cardOpenIdx].pos);
  else optics.setFocusHint(null);
}

function openCard(idx) {
  const c = pf.nodes[idx].content;
  const anon = pf.anon || c.consent !== true;
  cardName.textContent = anon && c.consent !== true && pf.anon ? 'Anonymous contributor' : c.name;
  cardRole.textContent = c.role;
  cardBlurb.textContent = c.blurb;
  card.classList.add('open');
  card.setAttribute('aria-hidden', 'false');
  cardOpenIdx = idx;
  pf.setSelected(idx);
}
function closeCard() {
  card.classList.remove('open');
  card.setAttribute('aria-hidden', 'true');
  cardOpenIdx = -1;
  pf.setSelected(-1);
}
card.querySelector('.close').addEventListener('click', closeCard);

renderer.domElement.addEventListener('click', () => {
  if (pf.hoverIdx >= 0) openCard(pf.hoverIdx);
  else closeCard();
});

const _proj = new THREE.Vector3();
function positionCard() {
  if (cardOpenIdx < 0) return;
  const nd = pf.nodes[cardOpenIdx];
  _proj.copy(nd.pos).project(camera);
  if (_proj.z > 1) { closeCard(); return; }
  const sx = (_proj.x + 1) / 2 * window.innerWidth;
  const sy = (1 - _proj.y) / 2 * window.innerHeight;
  const W = 248, pad = 14;
  let x = sx + 34;
  if (x + W + pad > window.innerWidth) x = sx - W - 34;
  let y = sy - 30;
  x = Math.max(pad, Math.min(x, window.innerWidth - W - pad));
  y = Math.max(70, Math.min(y, window.innerHeight - 170));
  card.style.left = x + 'px';
  card.style.top = y + 'px';
}

/* ---------------- keys ---------------- */
const hud = document.getElementById('hud');
let hudOn = true;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); glideOn = !glideOn; }
  else if (e.key === 'g') optics.setRaw(!optics.raw);
  else if (e.key === 'p') {
    // cycle procedural -> photo -> anonymous (skip photo if assets missing)
    let next = (modeIdx + 1) % 3;
    if (next === 1 && !photos) next = 2;
    applyMode(next);
  }
  else if (e.key === 'a') applyMode(modeIdx === 2 ? 0 : 2);
  else if (e.key === 'd') {
    closeCard();
    pf.setHover(-1);
    pf.group.visible = false;
    pf = pf === pf16 ? pf48 : pf16;
    pf.group.visible = true;
  }
  else if (e.key === 'b') { hudOn = !hudOn; hud.style.display = hudOn ? '' : 'none'; }
  else if (e.key === 'Escape') closeCard();
});

/* ---------------- resize ---------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  optics.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- HUD / budget instrumentation ---------------- */
window.__optics = optics;   // spike debug
let fpsEMA = 60, cpuEMA = 8, lastHud = 0, drawCalls = 0;
const budgets = window.__spikeB = {
  hyphae: field.counts,
  portraits16: pf16.counts,
  portraits48: pf48.counts,
  drawCalls: 0, cpuMs: 0, fps: 0,
};
function updateHud(time) {
  if (time - lastHud < 0.5) return;
  lastHud = time;
  budgets.drawCalls = drawCalls;
  budgets.cpuMs = +cpuEMA.toFixed(2);
  budgets.fps = +fpsEMA.toFixed(1);
  hud.textContent =
    `${fpsEMA.toFixed(0)} fps · cpu ${cpuEMA.toFixed(1)} ms · ${drawCalls} draws\n` +
    `hyphae ${field.counts.hyphaeVerts.toLocaleString()}v (${field.counts.hyphaeStrands} strands) · ` +
    `cords ${field.counts.cordVerts.toLocaleString()}v\n` +
    `node strands ${pf.counts.strandVerts.toLocaleString()}v (${pf.counts.strandCurves} curves) · ` +
    `rims ${pf.counts.rimVerts.toLocaleString()}v · ${pf.counts.planes} portraits\n` +
    `${optics.raw ? 'RAW' : 'graded'} · ${MODE_NAMES[modeIdx]} · ${pf.counts.nodeCount} nodes · ` +
    `arc u ${u.toFixed(2)} ${glideOn ? 'gliding' : 'held'}`;
}

/* ---------------- frame loop ---------------- */
const clock = new THREE.Clock();
let time = 0;
renderer.info.autoReset = false;   // composer runs many internal passes;
                                   // reset once per frame for true call counts

function frame() {
  requestAnimationFrame(frame);
  const t0 = performance.now();
  renderer.info.reset();
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  // smoothed pointer -> look offset
  pointer.nx += (pointer.x - pointer.nx) * Math.min(dt * 2.2, 1);
  pointer.ny += (pointer.y - pointer.ny) * Math.min(dt * 2.2, 1);

  updateCamera(dt, time);
  raycastHover();
  field.update(dt, time);
  pf.update(dt, time);
  positionCard();

  optics.render(dt, time);
  drawCalls = renderer.info.render.calls;

  const cpu = performance.now() - t0;
  cpuEMA += (cpu - cpuEMA) * 0.06;
  const fps = dt > 0 ? 1 / dt : 60;
  fpsEMA += (fps - fpsEMA) * 0.05;
  updateHud(time);
}
frame();
