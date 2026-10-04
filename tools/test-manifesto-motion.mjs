import assert from 'node:assert/strict';
import { manifestoPose, frameShiftAt, aerialPlacements, planAerialReveals, aerialRevealAt, AERIAL_BODY_COUNT, AERIAL_SCALE_MIN, AERIAL_SCALE_MAX, CAMERA_SECONDS, SPIRAL_START_SECONDS, lineSecondsFor, FIRST_LINE_SECONDS, TITLE_SECONDS, awaySecondsFrom, returnSecondsFrom } from '../journey/manifesto/pose.js';

const from = { position: { x: 8, y: 3, z: 9 }, target: { x: 0, y: 2, z: 0 }, fov: 46 };
for (const t of [0, 0.2, 0.8, SPIRAL_START_SECONDS]) {
  const pose = manifestoPose(from, t);
  assert.equal(pose.position.x, from.position.x, 'lift must not drift sideways');
  assert.equal(pose.position.z, from.position.z, 'lift must not drift in depth');
}
assert.deepEqual(manifestoPose(from, 0).position, from.position);
assert.ok(manifestoPose(from, 2.2).position.y > from.position.y + 8, 'lift must be substantial');
const beforeFormerHandoff = manifestoPose(from, 2.19);
const afterFormerHandoff = manifestoPose(from, 2.21);
assert.ok(Math.hypot(afterFormerHandoff.position.x - beforeFormerHandoff.position.x,
  afterFormerHandoff.position.z - beforeFormerHandoff.position.z) > 0.0001,
  'flight keeps moving through the former lift/orbit handoff');
let lastY = from.position.y;
let lastAz = Math.atan2(from.position.z, from.position.x);
let turn = 0;
for (let t = 0; t <= CAMERA_SECONDS + 0.001; t += 0.01) {
  const pose = manifestoPose(from, t);
  assert.ok(pose.position.y >= lastY - 1e-8, 'ascent must never dip');
  const shift = frameShiftAt(t, 1.6, from);
  const az = Math.atan2(pose.position.z - shift.z, pose.position.x - shift.x);
  const delta = Math.atan2(Math.sin(az - lastAz), Math.cos(az - lastAz));
  assert.ok(delta >= -1e-8, 'spiral must remain counterclockwise in the authored x/z plan');
  turn += delta; lastAz = az; lastY = pose.position.y;
  assert.ok(pose.fov >= 44 && pose.fov <= 48);
}
assert.ok(Math.abs(turn * 180 / Math.PI - 100) < 0.001);
assert.ok(manifestoPose(from, 26).position.y > manifestoPose(from, 16).position.y, 'world expands through the last copy beat');
assert.deepEqual(manifestoPose(from, CAMERA_SECONDS), manifestoPose(from, CAMERA_SECONDS + 10));
for (const aspect of [1440 / 900, 390 / 844]) {
  const pose = manifestoPose(from, CAMERA_SECONDS, aspect);
  const distance = Math.hypot(pose.position.x, pose.position.y - 3.15, pose.position.z);
  const capFraction = 4.7 / (2 * distance * Math.tan(pose.fov * Math.PI / 360) * aspect);
  assert.ok(capFraction >= (aspect < 1 ? 0.05 : 0.03) && capFraction <= (aspect < 1 ? 0.08 : 0.05), `${aspect}: cap scale ${capFraction}`);
}
assert.equal(TITLE_SECONDS, 0, 'the title is written on the press');
// the reading rhythm follows the text: a shorter sentence hands on sooner,
// and the pauses never grow for their own sake
const words = [26, 27, 20, 25, 21];
const LINE_SECONDS = lineSecondsFor(words);
assert.equal(LINE_SECONDS[0], FIRST_LINE_SECONDS);
const gaps = LINE_SECONDS.slice(1).map((t, i) => t - LINE_SECONDS[i]);
gaps.forEach((g, i) => assert.ok(g >= 3.4 && g <= 5, `beat ${i + 2} follows a readable pause (${g.toFixed(2)} s)`));
assert.ok(gaps[2] < gaps[1], 'the shortest sentence hands on sooner');
assert.ok(LINE_SECONDS.at(-1) <= CAMERA_SECONDS - 6, 'the last line lands well inside the flight, not at its end');
console.log('Manifesto motion: vertical lift, monotone 100° CCW spiral, 28s expansion, responsive cap scale and aligned reading beats pass.');

// Execute the actual branch against small DOM/scene doubles: camera ownership,
// reading after landing, pause, reduced motion and exact reversible hand-back.
const { createManifestoBranch } = await import('../journey/manifesto/branch.js');
class Element {
  constructor() {
    this.hidden = false; this.isConnected = true; this.children = []; this.listeners = {};
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(n => this.classes.add(n)),
      remove: (...names) => names.forEach(n => this.classes.delete(n)),
      toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  setAttribute() {}
  appendChild(child) { this.children.push(child); }
  querySelector(selector) { return this.parts[selector]; }
  querySelectorAll() { return this.children; }
  focus() { document.activeElement = this; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  removeEventListener(type) { delete this.listeners[type]; }
  remove() { this.isConnected = false; }
  set innerHTML(_value) {
    this.parts = Object.fromEntries(['#j-manifesto-title', '.j-manifesto-sr-only', '.j-manifesto-lines',
      '[data-action="pause"]', '[data-action="read-all"]', '[data-action="return"]', '.j-manifesto-panel'].map(key => [key, new Element()]));
  }
}
const vec = (x, y, z) => ({ x, y, z,
  clone() { return vec(this.x, this.y, this.z); },
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; },
  set(a, b, c) { this.x = a; this.y = b; this.z = c; },
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; },
});
let reduced = false;
globalThis.document = { body: new Element(), activeElement: new Element(), createElement: () => new Element() };
globalThis.window = new Element();
globalThis.matchMedia = () => ({ matches: reduced });
const camera = { position: vec(8, 3, 9), up: vec(0, 1, 0), fov: 46, far: 100, aspect: 390 / 844,
  updateProjectionMatrix() {}, lookAt() {} };
const controls = { target: vec(0, 2, 0), enabled: true, update() {} };
const fog = { near: 7, far: 20 };
const scroll = { enabled: true };
let fieldFogFar = null, fieldSeconds = null, preparations = 0;
const branch = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } },
  { scroll, field: { setManifesto(progress, seconds, departure) { if (progress !== null) { fieldFogFar = fog.far; fieldSeconds = seconds; } if (departure) preparations++; } } });
const root = document.body.children[0];
const tick = seconds => { for (let i = 0; i < seconds * 60; i++) branch.update(1 / 60); };
const snapshot = () => [camera.position.x, camera.position.y, camera.position.z, camera.fov, camera.far,
  controls.target.x, controls.target.y, controls.target.z, fog.near, fog.far, controls.enabled, scroll.enabled];
const original = snapshot();
const focus = document.activeElement;
branch.begin();
assert.deepEqual(snapshot().slice(-2), [false, false], 'the live branch claims controls and scroll');
tick(1);
assert.equal(branch.shownLines, 0);
assert.equal(document.activeElement, root.querySelector('.j-manifesto-panel'), 'focus rests on the reading region, not a control');
tick(CAMERA_SECONDS);
assert.equal(branch.shownLines, 5, 'every line is inked by the end of the flight');
assert.equal(branch.progress, 1, 'the flight settles');
assert.equal(fieldSeconds, CAMERA_SECONDS, 'every scheduled body settles on the shared frame');
assert.equal(preparations, 1, 'schedule is prepared once per activation');
assert.equal(fieldFogFar, fog.far, 'field shader handoff sees this frame’s expanded aerial fog');
const settled = snapshot(); tick(20);
assert.deepEqual(snapshot(), settled, 'the settled camera holds still');
assert.ok(camera.far > camera.position.y, 'portrait aerial cannot be clipped by the hero far plane');
window.listeners.keydown({ key: 'Escape', preventDefault() {} }); tick(2.3);
assert.equal(branch.active, true, 'the descent from the settled view is a flight, not a 2 s rewind');
tick(2.6);
assert.equal(branch.active, false);
assert.deepEqual(snapshot(), original);
assert.equal(document.activeElement, focus);

// A destination pressed mid-descent bends the fall toward it: no jump on the
// press, one continuous descent, and it lands exactly on the new rest.
const landA = { position: vec(-14, 4, 3), target: vec(0, 3, 0), fov: 40, fogNear: 7, fogFar: 20 };
const landB = { position: vec(2, -6, 11), target: vec(0, -8, 0), fov: 50, fogNear: 4, fogFar: 30 };
let landedOn = null;
branch.begin(); tick(12);
branch.returnTo(() => { landedOn = 'A'; }, { land: landA }); tick(1.2);
const beforeBend = snapshot();
assert.ok(branch.retarget(() => { landedOn = 'B'; }, { land: landB }), 'a descent accepts a new aim');
assert.equal(branch.returnPhase, 0, 'the new aim starts from the pose on screen');
branch.update(0);
beforeBend.forEach((v, i) => {
  if (typeof v === 'number') assert.ok(Math.abs(snapshot()[i] - v) < 1e-9, `no jump on the press (channel ${i})`);
});
let maxStep = 0, last = snapshot();
for (let i = 0; i < 600 && branch.active; i++) {
  branch.update(1 / 60);
  if (!branch.active) break;
  const now = snapshot();
  maxStep = Math.max(maxStep, Math.hypot(now[0] - last[0], now[1] - last[1], now[2] - last[2]));
  last = now;
}
assert.equal(branch.active, false, 'the bent descent lands');
assert.equal(landedOn, 'B', 'only the new destination is landed on');
assert.deepEqual([camera.position.x, camera.position.y, camera.position.z, camera.fov, fog.near, fog.far],
  [2, -6, 11, 50, 4, 30], 'it lands exactly on the new rest, in its depth');
assert.ok(maxStep < 3, `the bend is a glide, not a swing (largest step ${maxStep.toFixed(3)})`);
branch.destroy();
// hand the doubles back to the original rest for the reduced-motion pass
camera.position.set(original[0], original[1], original[2]); camera.fov = original[3]; camera.far = original[4];
controls.target.set(original[5], original[6], original[7]); fog.near = original[8]; fog.far = original[9];
reduced = true;
const accessible = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } }, { scroll });
const accessibleRoot = document.body.children.at(-1);
accessible.begin();
assert.equal(accessible.progress, 1);
assert.equal(accessible.shownLines, 5);
assert.equal(document.activeElement, accessibleRoot.querySelector('.j-manifesto-panel'), 'reduced motion focuses the reading region');
window.listeners.keydown({ key: 'Escape', preventDefault() {} });
accessible.update(1 / 60);
assert.equal(accessible.active, false);
assert.deepEqual(snapshot(), original);
accessible.destroy();
console.log('Manifesto branch: no page controls, full reading flight, long reading hold, far plane, eased Return, mid-descent retarget, focus, reduced motion and Escape pass.');

// All frame directions have a prepared continuation, with no rows or ring.
let seed = 41;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const placements = aerialPlacements([], random, () => 0);
assert.equal(placements.length, AERIAL_BODY_COUNT, 'the full colony is prepared before activation');
for (const [sx, sz] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
  assert.ok(placements.filter(b => b.x * sx > 0 && b.z * sz > 0).length > 55, 'every direction carries a substantial field');
}
for (const b of placements) {
  assert.ok(b.s >= AERIAL_SCALE_MIN && b.s <= AERIAL_SCALE_MAX && b.tone >= 0.25 && b.tone <= 0.9, 'only bounded authored scale/light variation');
  assert.ok(Math.hypot(b.x,b.z) > 8, 'primary clearance');
}
// The colony grows in patches, at the epilogue field's own scale: most
// bodies are small, most stand in a patch, and their neighbours are uneven
// (a Poisson-disc sheet has nearest-neighbour gaps within a narrow band).
const sorted = placements.map(b => b.s).sort((a, b) => a - b);
assert.ok(sorted[sorted.length >> 1] < 0.36, 'median body matches the field (~0.3), not the old 0.73');
assert.ok(placements.filter(b => b.patch >= 0).length > placements.length * 0.85, 'bodies stand in patches');
const nnGaps = placements.map(b => Math.min(...placements.filter(q => q !== b).map(q => Math.hypot(q.x-b.x, q.z-b.z))));
const meanGap = nnGaps.reduce((a, g) => a + g, 0) / nnGaps.length;
const spread = Math.sqrt(nnGaps.reduce((a, g) => a + (g - meanGap) ** 2, 0) / nnGaps.length) / meanGap;
assert.ok(spread > 0.35, `nearest-neighbour gaps vary like clumps, not an even sheet (cv ${spread.toFixed(2)})`);
const shedding = placements.filter(b => b.emits);
assert.ok(shedding.length > 40 && shedding.length < placements.length * 0.4, 'some patches shed spores, most do not');
console.log(`Manifesto colony: ${AERIAL_BODY_COUNT} deterministic placements, full directional coverage and bounded variation pass.`);

for (const aspect of [1440/900,390/844]) {
  const scheduled = [...placements, {x:3,z:8,gy:0,s:0.6,tier:4}];
  const first = planAerialReveals(scheduled, from, aspect, new Float32Array(scheduled.length*2));
  const again = planAerialReveals(scheduled, from, aspect, new Float32Array(scheduled.length*2));
  assert.deepEqual(first, again, 'same departure and placements must reproduce the reveal schedule');
  assert.equal(first.at(-2), -1, 'existing field bodies remain outside the arrival schedule');
  const counts = [0,8,14,20,26,28].map(t => placements.filter((b,i) => aerialRevealAt(t,first[i*2],first[i*2+1]) > 0.1).length);
  assert.equal(counts[0], 0, 'new aerial bodies start absent');
  assert.ok(counts[2] > counts[1] && counts[3] > counts[2] && counts[4] > counts[3] && counts[5] > counts[4], 'arrivals continue through middle, late, and final expansion');
  assert.equal(counts.at(-1), placements.length, 'all arrivals settle with the camera');
  for (let i = 0; i < scheduled.length; i++) {
    let prior = 0;
    for (let t = 0; t <= 28; t += 0.125) {
      const value = aerialRevealAt(t,first[i*2],first[i*2+1]);
      assert.ok(value >= prior && value >= 0 && value <= 1, 'fixed reveal windows are bounded and monotone');
      prior = value;
    }
  }
}
console.log('Manifesto arrivals: repeatable edge schedule, stable original field, monotone reveals and arrivals through 28s pass.');

// Exercise the real prepared field with Three's CPU-side geometry/material
// classes. Only its world-import is replaced with a deterministic flat seat;
// no renderer or GL context is needed to test resource identity across ticks.
const { readFileSync } = await import('node:fs');
const threeURL = new URL('../vendor/three/three.module.js', import.meta.url).href;
const THREE = await import(threeURL);
const poseURL = new URL('../journey/manifesto/pose.js', import.meta.url).href;
let colonySource = readFileSync(new URL('../journey/manifesto/colony.js', import.meta.url),'utf8')
  .replace("'three'", JSON.stringify(threeURL)).replace("'./pose.js'", JSON.stringify(poseURL))
  .replace("import { groundY, makeRng } from '../chapters/final/world.js';", 'const groundY = () => 0; const makeRng = () => { let n = 19; return () => ((n = (Math.imul(n,1664525)+1013904223)>>>0)/4294967296); };');
const {createAerialColony} = await import('data:text/javascript;base64,'+Buffer.from(colonySource).toString('base64'));
const stem = new THREE.Group(), cap = new THREE.Group(), bend = new THREE.Group(); bend.add(cap);
const tissue = new THREE.BufferGeometry();
tissue.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,1,1],3));
const shader = new THREE.ShaderMaterial({uniforms:{uProg:{value:2},uOpacity:{value:0.3}},vertexShader:'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',fragmentShader:'varying vec3 vColor; void main() { gl_FragColor = vec4(vColor,1.); }'});
cap.add(new THREE.LineSegments(tissue,shader));
stem.add(new THREE.Mesh(tissue,new THREE.MeshBasicMaterial()));
const colony = createAerialColony({groups:{stem,mushroom:cap}},[]);
colony.prepare(from,1440/900);
const resourceState = () => colony.group.children.map(o => [o,o.geometry,o.material,o.geometry.attributes.position,o.geometry.attributes.aColonyReveal,o.geometry.attributes.aColonyLink]);
const resources = resourceState();
const attributes = colony.group.children.map(o => o.geometry.attributes.aColonyReveal || o.geometry.attributes.aColonyLink || o.geometry.attributes.aSporeGate);
const versions = attributes.map(a=>a.version);
assert.equal(colony.group.children[0].geometry.attributes.position, tissue.attributes.position, 'instancing shares actual hero tissue buffers');
// 2026-10-04: two screen-size tiers (colony.js NEAR_PX) — each source layer
// draws once per tier, still never once per mushroom.
assert.equal(colony.group.children.length, 6, 'one draw per source layer per tier plus the ground and the spores, rather than per mushroom');
assert.equal(colony.lod.near + colony.lod.far, colony.bodies.length, 'every body is in exactly one tier');
for (let i = 0; i <= 1680; i++) colony.set(1,80,200,i/60);
assert.deepEqual(resourceState(),resources,'frame ticks preserve all mesh, material and geometry identities');
assert.deepEqual(attributes.map(a=>a.version),versions,'frame ticks do not upload or replace prepared reveal buffers');
console.log('Manifesto prepared field: shared hero buffers, fixed draws and stable resources through 1680 reveal ticks pass.');

// A curved strand has 20 segments (40 vertices). Both vertices of every
// segment carry the same TWO endpoint windows, in vec4 order A.xy / B.zw.
// The first source layer draws as children 0 (near tier) and 1 (far tier);
// each tier's instances are its filled prefix.
const windows = new Map();
for (const [child, filled] of [[0, colony.lod.near], [1, colony.lod.far]]) {
  const bodyPose = colony.group.children[child].geometry.attributes.aColonyPose;
  const bodyReveal = colony.group.children[child].geometry.attributes.aColonyReveal;
  for (let i=0;i<filled;i++) windows.set(`${bodyPose.getX(i)}|${bodyPose.getZ(i)}`, [bodyReveal.getX(i),bodyReveal.getY(i)]);
}
windows.set('0|0',[-1,1]);
const groundGeometry = colony.group.children.find(o => o.geometry.attributes.aColonyLink).geometry;
const gp = groundGeometry.attributes.position, gl = groundGeometry.attributes.aColonyLink;
assert.equal(gl.count,gp.count,'one complete endpoint-pair vec4 per ground vertex');
for (let v=0;v<gp.count;v+=40) {
  const a = windows.get(`${gp.getX(v)}|${gp.getZ(v)}`);
  const b = windows.get(`${gp.getX(v+39)}|${gp.getZ(v+39)}`);
  assert.ok(a && b,'strand endpoints resolve to the actual prepared body/root positions');
  for (let j=v;j<v+40;j++) assert.deepEqual([gl.getX(j),gl.getY(j),gl.getZ(j),gl.getW(j)], [...a,...b], 'both segment vertices carry the same correctly ordered endpoint windows');
}
console.log('Manifesto ground: every strand vertex carries its actual two body arrival windows in correct vec4 order.');

// Every colony spore belongs to a body: its gate is exactly that body's
// prepared arrival window, so a plume can neither precede nor outlive it.
const sporeGeometry = colony.group.children.find(o => o.geometry.attributes.aSporeGate).geometry;
const sporeWindows = new Set([...windows.values()].map(([a, b]) => `${a}|${b}`));
const sg = sporeGeometry.attributes.aSporeGate;
assert.ok(sg.count > 0, 'some bodies shed');
for (let i = 0; i < sg.count; i++) {
  assert.ok(sporeWindows.has(`${sg.getX(i)}|${sg.getY(i)}`), 'a spore rides its own body\'s arrival window');
  assert.ok(sg.getX(i) >= 0, 'only arriving colony bodies shed here (the field\'s seats shed in sky.js)');
}
console.log('Manifesto spores: every colony spore is gated on its own body\'s arrival window.');

// A descent that lands on another section is the longer journey: half as
// long again plus a second over the plain Return, from any height.
for (const u of [0, 0.5, 1]) {
  assert.ok(Math.abs(awaySecondsFrom(u) - (returnSecondsFrom(u) * 1.35 + 1)) < 1e-9);
  assert.ok(awaySecondsFrom(u) > returnSecondsFrom(u) + 1.5, 'leaving for another section takes clearly longer than a Return');
}
assert.ok(awaySecondsFrom(1) > 7 && awaySecondsFrom(1) < 8, 'about 7.5 s from the settled view');
console.log('Manifesto away descent: longer than a Return from every height pass.');
