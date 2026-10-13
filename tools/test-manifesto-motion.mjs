import assert from 'node:assert/strict';
import { CONTENT } from '../content/content.js';
import { manifestoPose, mobileFieldCenter, frameShiftAt, aerialPlacements, planAerialReveals, aerialRevealAt, AERIAL_BODY_COUNT, AERIAL_SCALE_MIN, AERIAL_SCALE_MAX, CAMERA_SECONDS, SPIRAL_START_SECONDS, MOBILE_LIFT_SECONDS, MOBILE_OVERHEAD_TURN, descentU, lineSecondsFor, mobileReadingSchedule, revealSecondsFor, WORD_STAGGER_SECONDS, WORD_REVEAL_SECONDS, FIRST_LINE_SECONDS, TITLE_SECONDS, awaySecondsFrom, returnSecondsFrom } from '../journey/manifesto/pose.js';

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
  const distance = aspect < 1 ? pose.position.y - 3.15
    : Math.hypot(pose.position.x, pose.position.y - 3.15, pose.position.z);
  const capFraction = 4.7 / (2 * distance * Math.tan(pose.fov * Math.PI / 360) * aspect);
  assert.ok(capFraction >= (aspect < 1 ? 0.20 : 0.03) && capFraction <= (aspect < 1 ? 0.36 : 0.05), `${aspect}: cap scale ${capFraction}`);
}
// Phones rise over the actual cluster while tilting down, then stay overhead.
const phoneFrom = { ...from, roll: .2, fieldCenter: { x: -2, z: -1 } };
assert.deepEqual(mobileFieldCenter([{x: 6, z: 3, s: 1, tier: 2},
  {x: 500, z: 500, s: 100, tier: 4}], from.target), {x: 3, z: 1.5},
  'near caps and hero determine framing; distant hints cannot move the centre');
let lastPitch = Infinity, lastHeading = 0;
for (let seconds = 0; seconds <= CAMERA_SECONDS; seconds += .02) {
  const pose = manifestoPose(phoneFrom, seconds, 390 / 844);
  for (const axis of ['x', 'z']) {
    const progress = (pose.position[axis] - from.position[axis]) / (phoneFrom.fieldCenter[axis] - from.position[axis]);
    assert.ok(progress >= 0 && progress <= 1, 'rise moves smoothly toward the mushroom centre without overshoot');
    if (seconds >= MOBILE_LIFT_SECONDS) assert.equal(pose.position[axis], phoneFrom.fieldCenter[axis]);
  }
  const dx = pose.target.x - pose.position.x, dz = pose.target.z - pose.position.z;
  const pitch = Math.atan2(pose.target.y - pose.position.y, Math.hypot(dx, dz));
  assert.ok(pitch <= lastPitch + 1e-9, 'opening tilts continuously toward overhead');
  lastPitch = pitch;
  const delta = Math.atan2(dz, dx) - Math.atan2(from.target.z - from.position.z,
    from.target.x - from.position.x);
  const heading = Math.atan2(Math.sin(delta), Math.cos(delta));
  assert.ok(heading >= lastHeading - 1e-8 && heading <= MOBILE_OVERHEAD_TURN + 1e-8,
    'small heading turn is smooth and never overshoots or flips');
  lastHeading = heading;
  if (seconds >= MOBILE_LIFT_SECONDS) assert.ok(Math.abs(heading - MOBILE_OVERHEAD_TURN) < 1e-8,
    'overhead zoom holds its finished framing');
  if (seconds >= MOBILE_LIFT_SECONDS) {
    assert.ok(Math.abs(pitch + Math.PI / 2) < 1.1e-5, 'remaining zoom stays straight down');
    assert.equal(pose.roll, 0);
  }
}
assert.ok(manifestoPose(phoneFrom, MOBILE_LIFT_SECONDS, .5).position.y >= from.position.y + 16);
assert.equal(manifestoPose(phoneFrom, CAMERA_SECONDS, .5).position.y, 38);
for (const startU of [.08, .2, .6, 1]) {
  const initial = manifestoPose(phoneFrom, startU * CAMERA_SECONDS, .5).position.y - from.position.y;
  for (const k of [.1, .3, .5, .9]) {
    const seconds = descentU(startU, k, .5, from.position.y) * CAMERA_SECONDS;
    const height = manifestoPose(phoneFrom, seconds, .5).position.y - from.position.y;
    const eased = k*k*k*(k*(k*6-15)+10);
    assert.ok(Math.abs(height - initial * (1 - eased)) < 1e-6,
      'returns invert the complete new lift without a second landing move');
  }
}
assert.equal(TITLE_SECONDS, 0, 'the title is written on the press');
// the reading rhythm follows the text: a shorter sentence hands on sooner,
// and the pauses never grow for their own sake
const words = [26, 27, 20, 25, 21];
const LINE_SECONDS = lineSecondsFor(words);
assert.equal(LINE_SECONDS[0], FIRST_LINE_SECONDS);
const gaps = LINE_SECONDS.slice(1).map((t, i) => t - LINE_SECONDS[i]);
gaps.forEach((g, i) => assert.ok(Math.abs(g - (1.6 + .14 * words[i])) < .001, `beat ${i + 2} follows a readable pause (${g.toFixed(2)} s)`));
assert.ok(gaps[2] < gaps[1], 'the shortest sentence hands on sooner');
assert.ok(LINE_SECONDS.at(-1) <= CAMERA_SECONDS - 5, 'the last line lands well inside the flight, not at its end');
console.log('Manifesto motion: vertical lift, monotone 100° CCW spiral, camera-clock expansion, responsive cap scale and aligned reading beats pass.');

// Execute the actual branch against small DOM/scene doubles: camera ownership,
// reading after landing, pause, reduced motion and exact reversible hand-back.
const { createManifestoBranch } = await import('../journey/manifesto/branch.js');
class Element {
  constructor() {
    this.hidden = false; this.isConnected = true; this.children = []; this.listeners = {};
    this.classes = new Set();
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.classList = {
      add: (...names) => names.forEach(n => this.classes.add(n)),
      remove: (...names) => names.forEach(n => this.classes.delete(n)),
      toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  contains(node) { return this.children.includes(node); }
  getBoundingClientRect() { return this.rect || { top: 0, bottom: 0, height: 0 }; }
  setAttribute() {}
  appendChild(child) { this.children.push(child); }
  append(...children) { this.children.push(...children); }
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
globalThis.document = { addEventListener() {}, removeEventListener() {}, body: new Element(), activeElement: new Element(), createElement: () => new Element() };
globalThis.window = new Element();
globalThis.matchMedia = () => ({ matches: reduced });
globalThis.getComputedStyle = () => ({ paddingTop: '3.2px' });
const resizeObservers = [];
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; resizeObservers.push(this); }
  observe(element, options) { this.observations ||= []; this.observations.push({ element, options }); }
  disconnect() {}
};
const camera = { position: vec(8, 3, 9), up: vec(0, 1, 0), fov: 46, far: 100, aspect: 390 / 844,
  updateProjectionMatrix() {}, lookAt() {} };
const controls = { target: vec(0, 2, 0), enabled: true,
  minDistance: 3.5, maxDistance: 18, minPolarAngle: 0, maxPolarAngle: Math.PI * 0.58,
  minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity,
  update() {
    // OrbitControls clamps even when user input is disabled. Model the
    // relevant constraint so the actual branch handoff must preserve its pose.
    const x = camera.position.x - this.target.x;
    const y = camera.position.y - this.target.y;
    const z = camera.position.z - this.target.z;
    const radius = Math.hypot(x, y, z);
    const phi = Math.acos(y / radius);
    const limited = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));
    if (Math.abs(limited - phi) > 1e-12) {
      const scale = Math.sin(limited) / Math.sin(phi);
      camera.position.set(this.target.x + x * scale,
        this.target.y + radius * Math.cos(limited), this.target.z + z * scale);
    }
  } };
const fog = { near: 7, far: 20 };
const scroll = { enabled: true };
let fieldFogFar = null, fieldSeconds = null, preparations = 0, preparedCenter = null;
const branch = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } },
  { scroll, field: { setManifesto(progress, seconds, departure) { if (progress !== null) { fieldFogFar = fog.far; fieldSeconds = seconds; } if (departure) { preparations++; preparedCenter = departure.fieldCenter; } } } });
const root = document.body.children.find(el => el.className === 'j-manifesto');
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
// Camera motion lasts through the last word's complete fade, not merely the
// paragraph's entrance. Copy edits and changes to reveal speed stay in sync.
const liveCounts = CONTENT.manifesto.lines.map(line => line.trim().split(/\s+/).length);
const lastReadingBeat = lineSecondsFor(liveCounts).at(-1);
const lastWordFinish = lastReadingBeat + (liveCounts.at(-1) - 1) * WORD_STAGGER_SECONDS + WORD_REVEAL_SECONDS;
assert.equal(CAMERA_SECONDS, lastWordFinish);
assert.equal(revealSecondsFor([10, 20]), lineSecondsFor([10, 20]).at(-1) + 19 * WORD_STAGGER_SECONDS + WORD_REVEAL_SECONDS);
assert.equal(root.style['--stagger'], `${WORD_STAGGER_SECONDS}s`);
assert.equal(root.style['--word-reveal-duration'], `${WORD_REVEAL_SECONDS}s`);
tick(lastReadingBeat - 1);
assert.ok(branch.progress < 1, 'camera still moves as the final paragraph starts');
tick(lastWordFinish - lastReadingBeat - 0.1);
assert.ok(branch.progress < 1, 'camera still moves during the final word fade');
const finalRevealLateness = Number.parseFloat(root.querySelector('.j-manifesto-lines').children.at(-1).style['--reveal-lateness']);
assert.ok(finalRevealLateness >= 0 && finalRevealLateness < 1 / 60 + 1e-9,
  'CSS reveal catches up to its scheduled beat within the crossing frame');
tick(0.2);
assert.equal(branch.shownLines, CONTENT.manifesto.lines.length, 'every manifesto line is inked by the final reading beat');
assert.equal(branch.progress, 1, 'the flight settles');
assert.deepEqual({x: camera.position.x, z: camera.position.z}, preparedCenter,
  'the live camera settles over the same centre used to prepare visible instances');
// A fitting fractional-height column must never activate the 3.2rem top mask.
const readingBox = root.querySelector('.j-manifesto-lines');
readingBox.rect = { top: 132, bottom: 443.2926, height: 311.2926 };
readingBox.children[0].rect = { top: 135.2, bottom: 200, height: 64.8 };
readingBox.children.at(-1).rect = { top: 418, bottom: 443.2926, height: 25.2926 };
resizeObservers[0].callback();
assert.equal(readingBox.style['--lift'], '0px', 'fractional geometry that fits stays still');
assert.equal(readingBox.classes.has('is-lifted'), false, 'no top fade when every line fits');
// Changing only the reading box must refresh overflow, even after the camera
// and paragraph count stop changing (font loading / responsive flex layout).
readingBox.rect.height -= 40;
resizeObservers[0].callback();
assert.equal(readingBox.style['--lift'], '-40px', 'real overflow lifts exactly what is needed');
assert.equal(readingBox.classes.has('is-lifted'), true);
readingBox.rect.height += 40;
resizeObservers[0].callback();
assert.equal(readingBox.classes.has('is-lifted'), false, 'expanding the box clears the lift');
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

// A mobile Equip landing looks above the orbit gesture's polar ceiling.
// It must not be clamped on the single handoff frame before the director
// resumes, and the visitor's original gesture constraints must be restored.
const equipLanding = { position: vec(-1.024, 0.71, -2.616),
  target: vec(0.049, 3.7, 0.226), fov: 60, fogNear: 7, fogFar: 20 };
branch.begin(); tick(CAMERA_SECONDS + 1);
branch.returnTo(null, { land: equipLanding }); tick(branch.awaySeconds + 0.1);
assert.deepEqual([camera.position.x, camera.position.y, camera.position.z],
  [equipLanding.position.x, equipLanding.position.y, equipLanding.position.z],
  'first released frame is exactly the upward-looking destination pose');
assert.equal(controls.maxPolarAngle, Math.PI * 0.58, 'handoff restores gesture polar limits');
assert.equal(controls.maxDistance, 18, 'handoff restores gesture distance limits');

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
// A late change of destination stretches only the reading shade, while
// the words keep their departure pace and already-painted progress.
tick(branch.returnSeconds - 0.2);
const fade = { transitionProperty: 'opacity', playbackRate: 1, currentTime: 1200,
  updatePlaybackRate(rate) { this.playbackRate = rate; } };
root.querySelector('.j-manifesto-panel').getAnimations = () => [fade];
const shadeFade = { ...fade };
root.getAnimations = () => [shadeFade];
const remainingBefore = branch.returnSeconds;
branch.retarget(() => { landedOn = 'B'; }, { land: landB });
assert.ok(branch.returnSeconds > remainingBefore, 'late retarget extends the remaining flight');
assert.ok(Math.abs(shadeFade.playbackRate - remainingBefore / branch.returnSeconds) < 1e-9,
  'reading shade slows by exactly the flight extension');
assert.equal(shadeFade.currentTime, 1200, 'retiming leaves the painted shade progress untouched');
assert.equal(fade.playbackRate, 1, 'retarget never slows the outgoing words');
assert.equal(fade.currentTime, 1200, 'retarget leaves the painted copy progress untouched');
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
// Exercise the actual desktop branch (not just its flight helper): Inspire
// is across the heading, where the old two-target blend flipped at the pole.
{
  const T = await import('../vendor/three/three.module.js');
  window.innerWidth = 1280; camera.aspect = 1.6;
  camera.position.set(-14.72, 2.73, 2.7); controls.target.set(-3.06, .83, -1.94);
  const desktopAway = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } });
  desktopAway.begin();
  for (let i = 0; i < 720; i++) desktopAway.update(1/60);
  desktopAway.returnTo(null, { land: { position: vec(9.9694, 2, -4.6488), target: vec(2.3531, 2.4199, -1.0707), fov: 40, roll: 0, fogNear: 7, fogFar: 20 } });
  const observed = new T.PerspectiveCamera();
  let prior = null;
  for (let i = 0; i < 480; i++) {
    desktopAway.update(1/60);
    observed.position.set(camera.position.x, camera.position.y, camera.position.z);
    observed.up.set(camera.up.x, camera.up.y, camera.up.z);
    observed.lookAt(new T.Vector3(controls.target.x, controls.target.y, controls.target.z));
    if (prior) assert.ok(observed.quaternion.angleTo(prior) * 60 < 1.6, 'actual desktop away branch avoids Inspire pole flip');
    prior = observed.quaternion.clone();
  }
  desktopAway.destroy(); camera.aspect = 390/844;
}
// Mobile retains the desktop reveal rhythm in a continuous native scroller,
// gently following each reveal until native reader input takes ownership.
window.innerWidth = 390;
const mobile = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } }, { scroll });
const mobileRoot = document.body.children.at(-1);
const mobileBox = mobileRoot.querySelector('.j-manifesto-lines');
const mobilePanel = mobileRoot.querySelector('.j-manifesto-panel');
const { ownerOf } = await import('../journey/ownership.js');
mobile.begin();
assert.equal(resizeObservers.at(-1).observations.find(o => o.element === mobileBox).options.box, 'border-box', 'retiring padding must not retrigger viewport easing');
assert.ok(mobileRoot.classes.has('is-scroll-reading'));
assert.equal(mobile.shownLines, 0, 'mobile begins with the same quiet opening as desktop');
assert.ok(mobileBox.children.every(line => line.hidden), 'unrevealed mobile paragraphs contribute no empty scroll extent');
for (let i = 0; i < 114; i++) mobile.update(1 / 60);
assert.equal(mobile.shownLines, 0, 'no immediate copy on mobile entry');
for (let i = 0; i < 12; i++) mobile.update(1 / 60);
assert.equal(mobile.shownLines, 1, 'first paragraph starts after the two-second opening');
assert.equal(mobileBox.children.filter(line => !line.hidden).length, 1, 'only available copy participates in mobile layout');
assert.ok(ownerOf(mobilePanel), 'reading surface owns touch, wheel and keys');
mobileBox.clientHeight = 400;
mobileBox.scrollHeight = 2000;
mobilePanel.listeners.wheel({ type: 'wheel' });
mobileBox.scrollTop = 180;
mobileBox.listeners.scroll();
assert.ok(mobileRoot.classes.has('has-reading-above'));
assert.ok(mobileRoot.classes.has('has-reading-below'));
mobileBox.scrollTop = 1600;
mobileBox.listeners.scroll();
assert.ok(!mobileRoot.classes.has('has-reading-below'), 'last paragraph removes the onward scroll hint');
mobileBox.scrollTop = 180;
for (let i = 0; i < 120; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 180, 'camera frames preserve the reader scroll position');
assert.equal(mobileBox.style['--lift'], '0px');
assert.ok(mobile.progress > 0 && mobile.progress < 1, 'camera still takes its full scenic flight');
for (let i = 0; i < CAMERA_SECONDS * 60; i++) mobile.update(1 / 60);
assert.equal(mobile.shownLines, CONTENT.manifesto.lines.length, 'all paragraphs accumulate by the end');
assert.ok(mobileBox.children.every(line => !line.hidden), 'all copy is available after the reveal');
assert.notEqual(mobileBox.scrollTop, 180, 'idle reader smoothly rejoins the reveal');
mobile.returnTo();
for (let i = 0; i < 600 && mobile.active; i++) mobile.update(1 / 60);
assert.equal(ownerOf(mobilePanel), null, 'closing releases reading input ownership');
mobile.begin();
assert.equal(mobileBox.scrollTop, 0, 'reentry starts at the beginning');
assert.ok(mobileBox.children.every(line => line.hidden), 'reentry removes future scroll space again');
assert.equal(mobileBox.style['--reading-pad-bottom'], '0px', 'no future-centering padding before the first reveal');
mobileBox.rect = { top: 100, bottom: 500, height: 400 };
const mobileParagraphs = mobileBox.children;
mobileParagraphs.forEach((line, i) => {
  line.getBoundingClientRect = () => ({ top: 100 + Number.parseFloat(mobileBox.style['--reading-pad-top']) + i * 240 - mobileBox.scrollTop,
    bottom: 300 + Number.parseFloat(mobileBox.style['--reading-pad-top']) + i * 240 - mobileBox.scrollTop, height: 200 });
});
for (let i = 0; i < 300; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 0, 'first paragraph remains centred');
const mobileSchedule = mobileReadingSchedule(lineSecondsFor(liveCounts), liveCounts.map((n, i) => i === 0 && CONTENT.manifesto.note ? n : n - 1));
const secondStart = mobileSchedule.reveal[1];
const readingAdvance = () => 200 - mobileParagraphs[0].getBoundingClientRect().top;
const advanceMobileTo = seconds => {
  while (mobile.progress * mobileSchedule.seconds < seconds - 1e-8) mobile.update(1 / 60);
};
advanceMobileTo(mobileSchedule.admit[1] - 0.025);
assert.equal(mobile.shownLines, 1, 'incoming ink retains its original reveal beat');
assert.equal(mobileParagraphs[1].hidden, true, 'incoming paragraph creates no scroll space before the lead starts');
assert.equal(mobileBox.scrollTop, 0, 'scroll stays still before its new earlier lead');
advanceMobileTo(mobileSchedule.admit[1] + 0.2);
assert.equal(mobile.shownLines, 1, 'scroll leads the incoming text instead of waiting for its reveal');
assert.equal(mobileParagraphs[1].hidden, false, 'space is admitted exactly when the lead scroll needs it');
assert.ok(!mobileParagraphs[1].classes.has('shown'), 'admitted incoming paragraph remains visually uninked');
assert.ok(readingAdvance() > 0 && readingAdvance() < 25, 'the scroll is already moving before new text starts');
advanceMobileTo(secondStart - 0.025);
assert.ok(readingAdvance() > 70, 'the lead visibly advances before incoming ink starts');
assert.equal(mobile.shownLines, 1);
advanceMobileTo(secondStart + 0.05);
assert.equal(mobile.shownLines, 2, 'new paragraph starts after a clear pre-ink scroll lead');
advanceMobileTo(secondStart + 0.1);
assert.ok(readingAdvance() > 70 && readingAdvance() < 164, 'next reveal gently moves into the bottom of the view');
const beforeResizeFollow = mobileBox.scrollTop;
resizeObservers.at(-1).callback();
assert.equal(mobileBox.scrollTop, beforeResizeFollow, 'layout remeasure does not jump the visible position');
advanceMobileTo(mobileSchedule.admit[1] + 2.8);
assert.ok(Math.abs(readingAdvance() - 164) < .01, 'same bottom target is reached on its reveal deadline even after resize');
mobilePanel.listeners.touchstart({ type: 'touchstart' });
mobileBox.scrollTop = 75;
for (let i = 0; i < 600; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 75, 'held touch prevents following even across later paragraph beats');
window.listeners.touchend({ type: 'touchend', touches: [] });
for (let i = 0; i < 120; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 75, 'release leaves three quiet seconds before resuming');
mobileBox.listeners.scroll();
for (let i = 0; i < 120; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 75, 'momentum scrolling restarts the idle delay');
for (let i = 0; i < 120; i++) mobile.update(1 / 60);
assert.ok(mobileBox.scrollTop > 75 && mobileBox.scrollTop < 960, 'idle return eases from the manual position');
for (let i = 0; i < 300; i++) mobile.update(1 / 60);
assert.ok(mobileBox.scrollTop >= 544, 'following rejoins the current revealing paragraph');
// After every scheduled deadline has passed, manual release still gets a
// full gentle catch-up rather than jumping onto an already-expired deadline.
for (let i = 0; i < 600; i++) mobile.update(1 / 60);
mobilePanel.listeners.wheel({ type: 'wheel' });
mobileBox.scrollTop = 75;
for (let i = 0; i < 174; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 75, 'idle delay remains three seconds');
for (let i = 0; i < 18; i++) mobile.update(1 / 60);
assert.ok(mobileBox.scrollTop > 75 && mobileBox.scrollTop < 100, 'expired reveal deadline cannot snap manual catch-up');
for (let i = 0; i < 72; i++) mobile.update(1 / 60);
assert.ok(mobileBox.scrollTop > 200 && mobileBox.scrollTop < 800, 'manual catch-up spends its own full duration');
for (let i = 0; i < 90; i++) mobile.update(1 / 60);
assert.ok(Math.abs(mobileBox.scrollTop - 784) < .01, 'manual catch-up reaches the last bottom target');
mobilePanel.listeners.touchstart({ type: 'touchstart' });
mobileBox.scrollTop = 0;
mobileBox.listeners.scroll();
assert.equal(mobileBox.style['--reading-pad-top'], '0px', 'opening centering inset is gone once reading has advanced');
assert.equal(mobileParagraphs[0].getBoundingClientRect().top, mobileBox.rect.top, 'scrolling back reaches first text at the top, not the old empty inset');
// A native gesture that starts before the opening inset is spent must own
// scrollTop completely, including its momentum scroll events.
mobile.returnTo();
for (let i = 0; i < 900; i++) mobile.update(1 / 60);
mobile.begin();
mobileBox.scrollHeight = 2000;
for (let i = 0; i < 300; i++) mobile.update(1 / 60);
mobilePanel.listeners.touchstart({ type: 'touchstart' });
advanceMobileTo(mobileSchedule.admit[1] + 0.1);
const heldPadding = mobileBox.style['--reading-pad-top'];
assert.ok(parseFloat(heldPadding) > 0);
mobileBox.scrollTop = 40;
mobileBox.listeners.scroll();
assert.equal(mobileBox.scrollTop, 40, 'native drag is not rewritten by inset retirement');
assert.equal(mobileBox.style['--reading-pad-top'], heldPadding);
window.listeners.pointercancel({ type: 'pointercancel' });
for (let i = 0; i < 200; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 40, 'native pan pointercancel does not release the still-held touch');
window.listeners.touchend({ type: 'touchend', touches: [] });
mobileBox.scrollTop = 80;
mobileBox.listeners.scroll();
assert.equal(mobileBox.scrollTop, 80, 'native momentum is not rewritten either');
for (let i = 0; i < 170; i++) mobile.update(1 / 60);
assert.equal(mobileBox.scrollTop, 80, 'native position remains owned for three quiet seconds');
mobile.destroy();
const cadence = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } }, { scroll });
cadence.begin();
for (let i = 0; i < (CAMERA_SECONDS - 0.1) * 60; i++) cadence.update(1 / 60);
assert.ok(cadence.progress < 1, 'mobile camera keeps moving through the original final word fade');
for (let i = 0; i < 12; i++) cadence.update(1 / 60);
assert.equal(cadence.progress, 1, 'camera and complete mobile text settle together');
cadence.destroy();
// hand the doubles back to the original rest for the reduced-motion pass
camera.position.set(original[0], original[1], original[2]); camera.fov = original[3]; camera.far = original[4];
controls.target.set(original[5], original[6], original[7]); fog.near = original[8]; fog.far = original[9];
reduced = true;
const accessible = createManifestoBranch({ camera, controls, groups: { sway: { traverse() {} } }, scene: { fog } }, { scroll });
const accessibleRoot = document.body.children.at(-1);
accessible.begin();
assert.equal(accessible.progress, 1);
assert.equal(accessible.shownLines, CONTENT.manifesto.lines.length);
assert.ok(accessibleRoot.classes.has('is-scroll-reading'), 'reduced motion keeps all paragraphs scrollable');
assert.equal(document.activeElement, accessibleRoot.querySelector('.j-manifesto-panel'), 'reduced motion focuses the reading region');
window.listeners.keydown({ key: 'Escape', preventDefault() {} });
accessible.update(1 / 60);
assert.equal(accessible.active, false);
assert.deepEqual(snapshot(), original);
accessible.destroy();
console.log('Manifesto branch: no page controls, full reading flight, long reading hold, far plane, eased Return, mid-descent retarget, focus, reduced motion and Escape pass.');

// Geometry fixtures select their viewport by aspect after the DOM branch tests.
window.innerWidth = 1440;
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
  const counts = [0, .28, .5, .71, .93, 1].map(f => f * CAMERA_SECONDS).map(t => placements.filter((b,i) => aerialRevealAt(t,first[i*2],first[i*2+1]) > 0.1).length);
  assert.equal(counts[0], 0, 'new aerial bodies start absent');
  if (aspect >= 0.9) {
    assert.ok(counts[2] > counts[1] && counts[3] > counts[2] && counts[4] > counts[3] && counts[5] > counts[4], 'desktop arrivals continue through middle, late, and final expansion');
  } else {
    assert.ok(counts.at(-1) > counts[1], 'the overhead patch grows as the phone zooms out');
    assert.ok(counts.every((n, i) => i === 0 || n >= counts[i - 1]), 'admitted mobile bodies remain present');
  }
  const scheduledCount = placements.filter((_, i) => first[i*2] <= CAMERA_SECONDS).length;
  assert.equal(counts.at(-1), scheduledCount, 'admitted arrivals settle with the camera');
  if (aspect < 0.9) assert.ok(scheduledCount <= 140, 'mobile only admits the near patch');
  for (let i = 0; i < scheduled.length; i++) {
    let prior = 0;
    for (let t = 0; t <= CAMERA_SECONDS; t += 0.125) {
      const value = aerialRevealAt(t,first[i*2],first[i*2+1]);
      assert.ok(value >= prior && value >= 0 && value <= 1, 'fixed reveal windows are bounded and monotone');
      prior = value;
    }
  }
}
console.log('Manifesto arrivals: repeatable edge schedule, stable original field, monotone reveals and arrivals through the full camera clock pass.');

// Exercise the real prepared field with Three's CPU-side geometry/material
// classes. Only its world-import is replaced with a deterministic flat seat;
// no renderer or GL context is needed to test resource identity across ticks.
const { readFileSync } = await import('node:fs');
const threeURL = new URL('../vendor/three/three.module.js', import.meta.url).href;
const THREE = await import(threeURL);
const { applyCameraRoll } = await import('../journey/camera-roll.js');
const orientationCamera = new THREE.PerspectiveCamera();
let lastQuaternion = null;
for (let seconds = 0; seconds <= CAMERA_SECONDS; seconds += .01) {
  const pose = manifestoPose(phoneFrom, seconds, 390 / 844);
  orientationCamera.position.set(pose.position.x, pose.position.y, pose.position.z);
  applyCameraRoll(orientationCamera, new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z), pose.roll);
  const q = orientationCamera.quaternion;
  assert.ok(q.toArray().every(Number.isFinite), 'overhead camera has a finite orientation');
  if (lastQuaternion) assert.ok(q.angleTo(lastQuaternion) < .007, 'no yaw/roll flip through the overhead handoff');
  lastQuaternion = q.clone();
}

const poseURL = new URL('../journey/manifesto/pose.js', import.meta.url).href;
const dissolveURL = new URL('../journey/lib/body-dissolve.js', import.meta.url).href;
let colonySource = readFileSync(new URL('../journey/manifesto/colony.js', import.meta.url),'utf8')
  .replace("'three'", JSON.stringify(threeURL)).replace("'./pose.js'", JSON.stringify(poseURL))
  .replace("'../lib/body-dissolve.js'", JSON.stringify(dissolveURL))
  .replace("import { groundY, makeRng } from '../chapters/final/world.js';", 'const groundY = () => 0; const makeRng = () => { let n = 19; return () => ((n = (Math.imul(n,1664525)+1013904223)>>>0)/4294967296); };');
const {createAerialColony} = await import('data:text/javascript;base64,'+Buffer.from(colonySource).toString('base64'));
const stem = new THREE.Group(), cap = new THREE.Group(), bend = new THREE.Group(); bend.add(cap);
const tissue = new THREE.BufferGeometry();
tissue.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,1,1],3));
const shader = new THREE.ShaderMaterial({uniforms:{uProg:{value:2},uOpacity:{value:0.3}},vertexShader:'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',fragmentShader:'varying vec3 vColor; void main() { gl_FragColor = vec4(vColor,1.); }'});
cap.add(new THREE.LineSegments(tissue,shader));
stem.add(new THREE.Mesh(tissue,new THREE.MeshBasicMaterial()));
const viewCamera = new THREE.PerspectiveCamera(from.fov, 390 / 844, .1, 1000);
const colonyScene = {groups:{stem,mushroom:cap}};
const colony = createAerialColony(colonyScene,[]);
window.innerWidth = 1440;
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
for (let i = 0; i <= CAMERA_SECONDS * 60; i++) colony.set(1,80,200,i/60);
assert.deepEqual(resourceState(),resources,'frame ticks preserve all mesh, material and geometry identities');
assert.deepEqual(attributes.map(a=>a.version),versions,'frame ticks do not upload or replace prepared reveal buffers');
console.log('Manifesto prepared field: shared hero buffers, fixed draws and stable resources through the full reveal clock pass.');

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

// The phone path excludes distant bodies from real instance submission,
// rather than merely darkening the same full landscape in the fragment shader.
colonyScene.camera = viewCamera;
colony.prepare(from, 390 / 844);
const paintPhone = seconds => {
  const pose = manifestoPose(from, seconds, viewCamera.aspect);
  viewCamera.position.set(pose.position.x, pose.position.y, pose.position.z);
  viewCamera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  viewCamera.fov = pose.fov; viewCamera.updateProjectionMatrix();
  colony.set(1, 80, 200, seconds);
};
paintPhone(CAMERA_SECONDS);
const phoneInstances = colony.lod.near + colony.lod.far;
assert.ok(phoneInstances > 0 && phoneInstances <= 140);
const drawnCount = () => colony.group.children[0].geometry.instanceCount + colony.group.children[1].geometry.instanceCount;
const endpointCount = drawnCount();
assert.ok(endpointCount > 0 && endpointCount < phoneInstances, 'only currently visible admitted bodies enter instance draws');
viewCamera.lookAt(viewCamera.position.x, viewCamera.position.y + 20, viewCamera.position.z);
colony.set(1, 80, 200, CAMERA_SECONDS);
assert.equal(drawnCount(), 0, 'looking into empty sky submits zero mushroom instances, not transparent bodies');
paintPhone(CAMERA_SECONDS);
assert.equal(drawnCount(), endpointCount, 'turning back restores exactly the visible instances');
const tickAttributes = colony.group.children.filter(o => o.geometry.attributes.aColonyPose)
  .flatMap(o => ['aColonyPose', 'aColonyTone', 'aColonyReveal'].map(key => o.geometry.attributes[key]));
const stillVersions = tickAttributes.map(a => a.version);
for (let i = 0; i < 60; i++) paintPhone(CAMERA_SECONDS);
assert.deepEqual(tickAttributes.map(a => a.version), stillVersions, 'a steady view does not reupload instance buffers');
assert.deepEqual(resourceState(), resources, 'frustum changes reuse the existing geometry, material and tissue');
const drawnBodies = () => colony.group.children.slice(0, 2).map(o => Array.from(
  o.geometry.attributes.aColonyPose.array.slice(0, o.geometry.instanceCount * 4)));
paintPhone(CAMERA_SECONDS * .5); const outward = drawnBodies();
paintPhone(CAMERA_SECONDS); paintPhone(CAMERA_SECONDS * .5);
assert.deepEqual(drawnBodies(), outward, 'returning through a pose restores the same visible bodies');
console.log(`Mobile colony: ${phoneInstances}/${colony.bodies.length} bodies intersect the flight; ${endpointCount} submitted at the endpoint, zero when facing sky.`);

// Desktop now uses the same conservative instance bounds. Ground and spores
// retain independent footprints, and return/re-entry compacts identical data.
for (const aspect of [390 / 844, 1.6]) {
  viewCamera.aspect = aspect;
  colony.prepare(from, aspect);
  paintPhone(CAMERA_SECONDS);
  const count = drawnCount();
  assert.ok(count > 0 && count < colony.lod.near + colony.lod.far,
    'both phone and desktop omit offscreen bodies from instance submission');
  const groundCount = groundGeometry.drawRange.count, sporesCount = sporeGeometry.drawRange.count;
  assert.ok(groundCount > 0 && groundCount < gp.count, 'offscreen ground strands do not reach the GPU');
  assert.ok(sporesCount < sg.count, 'offscreen or unarrived spore cohorts do not reach the GPU');
  assert.equal(groundCount % 40, 0, 'whole curved strands survive the guard band');
  assert.equal(sporesCount % 54, 0, 'whole full-lifetime spore cohorts survive the guard band');
  const indices = [groundGeometry, sporeGeometry].map(g => Array.from(g.index.array.slice(0, g.drawRange.count)));
  const versions = [groundGeometry.index.version, sporeGeometry.index.version];
  for (let i = 0; i < 60; i++) paintPhone(CAMERA_SECONDS);
  assert.deepEqual([groundGeometry.index.version, sporeGeometry.index.version], versions,
    'stationary camera does not upload batch indices');
  viewCamera.lookAt(viewCamera.position.x, viewCamera.position.y + 20, viewCamera.position.z);
  colony.set(1,80,200,CAMERA_SECONDS);
  assert.equal(drawnCount(), 0);
  assert.equal(groundGeometry.drawRange.count, 0, 'ground behind the camera submits no vertices');
  assert.equal(sporeGeometry.drawRange.count, 0, 'spores behind the camera submit no vertices');
  assert.ok(colony.group.children.filter(o => o.geometry === groundGeometry || o.geometry === sporeGeometry)
    .every(o => !o.visible), 'empty ground and spore batches also skip their draw calls');
  paintPhone(CAMERA_SECONDS);
  assert.deepEqual([groundGeometry, sporeGeometry].map(g => Array.from(g.index.array.slice(0,g.drawRange.count))), indices,
    'turning back restores exactly the same strand and spore identities');
  console.log(`${aspect < 1 ? 'Mobile' : 'Desktop'} visible submissions: ${count} bodies, ${groundCount}/${gp.count} ground vertices, ${sporesCount}/${sg.count} spores.`);
}

// Purpose reuses only its old far-field seats, not the extra Manifesto field
// or nearby literal clones. The same batch survives the branch handoff.
const purposeCamera = new THREE.PerspectiveCamera(58, 390 / 844, .1, 1000);
purposeCamera.position.set(0, 12, 12); purposeCamera.lookAt(0, 0, 0);
const purposeColony = createAerialColony({ ...colonyScene, camera: purposeCamera }, [
  { x: 0, z: 0, gy: 0, s: .5, tier: 4, reveal: .2 },
  { x: 100, z: 0, gy: 0, s: .5, tier: 4, reveal: .2 },
  { x: 2, z: 0, gy: 0, s: .5, tier: 3, reveal: .2 },
]);
purposeColony.prepare(from, 390 / 844);
const purposeResources = purposeColony.group.children.map(o => [o, o.geometry, o.material]);
purposeColony.setPurpose(1, 1, 14, 61);
assert.deepEqual(purposeColony.lod, { near: 0, far: 2 }, 'Purpose selects existing far seats only');
assert.deepEqual(purposeColony.drawn, { near: 0, far: 1 }, 'Purpose submits only the visible far seat');
assert.ok(purposeColony.group.children.slice(-2).every(o => !o.visible), 'Purpose does not duplicate existing ground or spores');
purposeCamera.lookAt(0, 30, 12);
purposeColony.setPurpose(1, 1, 14, 61);
assert.equal(purposeColony.drawn.far, 0, 'offscreen Purpose mushrooms are not submitted');
purposeColony.prepare(from, 390 / 844);
purposeColony.setSeatLight(1); purposeColony.set(0, 14, 61, 0);
assert.ok(purposeColony.group.visible, 'Purpose seats survive the first Manifesto frame');
assert.deepEqual(purposeColony.group.children.map(o => [o, o.geometry, o.material]), purposeResources,
  'Purpose/Manifesto reuse the same batches and GPU resources');
console.log('Purpose quality: existing far seats only, visible submission, no duplicate ground/spores, stable branch resources pass.');
