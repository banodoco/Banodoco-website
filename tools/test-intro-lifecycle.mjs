// Intro lifecycle and behavior contract.
//
// The scene-visible choreography is compared frame-for-frame with the pinned
// shipped implementation. The replacement contract is stricter about scope:
// acceleration may transform intro-local elapsed time, but must never replace
// or define the realm-wide performance.now.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const THREE_URL = pathToFileURL(join(REPO_ROOT, 'vendor/three/three.module.js')).href;
const FLAGS_URL = pathToFileURL(join(REPO_ROOT, 'flags.js')).href;
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';
const STAGE_ROOT = mkdtempSync(join(tmpdir(), 'intro-local-clock-'));
process.on('exit', () => {
  try { rmSync(STAGE_ROOT, { recursive: true, force: true }); } catch { /* best effort */ }
});

const CURRENT_SOURCE = readFileSync(join(REPO_ROOT, 'organism/intro.js'), 'utf8');
const CLOCK_SOURCE = readFileSync(join(REPO_ROOT, 'organism/intro-clock.js'), 'utf8');
const BASELINE_SOURCE = execFileSync(
  'git',
  ['show', RUN_START_SHA + ':organism/intro.js'],
  { cwd: REPO_ROOT, encoding: 'utf8' },
);

assert.notEqual(CURRENT_SOURCE, BASELINE_SOURCE, 'the behavior oracle differs from current');
assert.match(CURRENT_SOURCE, /from '.\/intro-clock\.js'/,
  'setupIntro consumes the isolated clock owner');

const forbiddenClockWrites = [
  /\bperformance\s*\.\s*now\s*=/,
  /\bperformance\s*\[\s*['"]now['"]\s*\]\s*=/,
  /\b(?:Object|Reflect)\s*\.\s*definePropert(?:y|ies)\s*\(\s*performance\b/,
  /\bObject\s*\.\s*assign\s*\(\s*performance\b/,
];
for (const [file, source] of [
  ['organism/intro.js', CURRENT_SOURCE],
  ['organism/intro-clock.js', CLOCK_SOURCE],
]) {
  assert.ok(forbiddenClockWrites.every((pattern) => !pattern.test(source)),
    file + ' must not replace or define performance.now');
}

let loadSequence = 0;
async function loadIntro(introSource, label, clockSource = CLOCK_SOURCE) {
  assert.ok(introSource.includes("from 'three'"), label + ': three rewrite target');
  assert.ok(introSource.includes("from '../flags.js'"), label + ': flags rewrite target');
  const dir = mkdtempSync(join(STAGE_ROOT, 'load-'));
  writeFileSync(join(dir, 'intro-clock.mjs'), clockSource, 'utf8');
  const rewritten = introSource
    .replace("from 'three'", "from '" + THREE_URL + "'")
    .replace("from '../flags.js'", "from '" + FLAGS_URL + "'")
    .replace("from './intro-clock.js'", "from './intro-clock.mjs'");
  const file = join(dir, 'intro-' + label + '-' + loadSequence++ + '.mjs');
  writeFileSync(file, rewritten, 'utf8');
  return import(pathToFileURL(file).href);
}

const current = await loadIntro(CURRENT_SOURCE, 'current');
const baseline = await loadIntro(BASELINE_SOURCE, 'baseline');

function makeEnvironment() {
  const state = { t: 0 };
  const writes = [];
  const baseNow = function now() { return state.t; };
  const target = {};
  Object.defineProperty(target, 'now', {
    value: baseNow,
    writable: true,
    configurable: true,
  });
  const observedPerformance = new Proxy(target, {
    set(object, property, value) {
      if (property === 'now') writes.push({ kind: 'set', value });
      return Reflect.set(object, property, value);
    },
    defineProperty(object, property, descriptor) {
      if (property === 'now') writes.push({ kind: 'defineProperty', descriptor });
      return Reflect.defineProperty(object, property, descriptor);
    },
  });

  const previousPerformance = globalThis.performance;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCaf = globalThis.cancelAnimationFrame;
  globalThis.performance = observedPerformance;

  let nextId = 1;
  let rafInvocations = 0;
  const pending = new Map();
  const cancelled = [];
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextId++;
    pending.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cancelled.push(id);
    pending.delete(id);
  };

  return {
    state,
    baseNow,
    writes,
    pending,
    cancelled,
    get rafInvocations() { return rafInvocations; },
    frame(animators, dtMs) {
      state.t += dtMs;
      for (const [, animator] of animators) animator(0, 0);
      const due = [...pending.values()];
      pending.clear();
      for (const callback of due) {
        rafInvocations += 1;
        callback();
      }
    },
    dispose() {
      globalThis.performance = previousPerformance;
      globalThis.requestAnimationFrame = previousRaf;
      globalThis.cancelAnimationFrame = previousCaf;
    },
  };
}

function makeGeometry(count, seed) {
  const xs = [];
  const ys = [];
  const zs = [];
  const drawn = new Array(count).fill(0);
  for (let i = 0; i < count; i++) {
    xs.push(((i * 7 + seed * 13) % 11) * 0.31);
    ys.push(((i * 5 + seed * 3) % 9) * 0.47);
    zs.push(((i * 3 + seed * 17) % 13) * 0.23);
  }
  return {
    attributes: {
      position: {
        count,
        getX: (i) => xs[i],
        getY: (i) => ys[i],
        getZ: (i) => zs[i],
      },
      aDraw: {
        needsUpdate: false,
        drawn,
        setX(i, value) { drawn[i] = value; },
      },
    },
  };
}

function makeDrawable(seed) {
  return {
    isMesh: false,
    visible: true,
    geometry: makeGeometry(6, seed),
    material: {
      userData: { uWin: true },
      uniforms: {
        uWin: { value: { a: 0, b: 0, set(a, b) { this.a = a; this.b = b; } } },
        uClampY: { value: 0 },
      },
      transparent: false,
      opacity: 1,
      clippingPlanes: null,
    },
  };
}

function makeShell() {
  return {
    isMesh: true,
    visible: true,
    geometry: makeGeometry(4, 1),
    material: {
      userData: {},
      transparent: false,
      opacity: 1,
      clippingPlanes: null,
    },
  };
}

function makeScene({ intro = 5.4, deferIntro = false } = {}) {
  const ground = [0, 1, 2, 3, 4, 5, 6].map(makeDrawable);
  const stemDraw = [10, 11, 12].map(makeDrawable);
  const stemShells = [makeShell()];
  const capDraw = [20, 21, 22, 23, 24, 25, 26, 27].map(makeDrawable);
  const capShells = [makeShell(), makeShell()];
  const sceneDraw = [30, 31].map(makeDrawable);
  const animators = new Map();
  const renderer = {};
  const drawU = { value: -1 };
  const ctx = {
    scene: { children: sceneDraw },
    renderer,
    mushroom: { children: [...capDraw, ...capShells] },
    stemGroup: { children: [...stemDraw, ...stemShells] },
    groundGroup: { children: ground },
    drawU,
    drawWin: (object) => object.material.uniforms.uWin,
    animators,
    addAnimator(name, animator) {
      animators.set(name, animator);
      return function removeAnimator() {
        if (animators.get(name) === animator) animators.delete(name);
      };
    },
    intro,
    deferIntro,
  };
  return {
    ctx,
    animators,
    renderer,
    drawU,
    ground,
    stemDraw,
    stemShells,
    capDraw,
    capShells,
    sceneDraw,
  };
}

function sample(scene) {
  const clip = scene.stemShells[0].material.clippingPlanes;
  return [
    scene.drawU.value,
    scene.stemShells[0].material.opacity,
    scene.stemShells[0].material.transparent ? 1 : 0,
    scene.stemShells[0].visible ? 1 : 0,
    scene.capShells[0].material.opacity,
    scene.capShells[1].material.opacity,
    clip ? clip[0].constant : null,
    scene.animators.has('intro-draw') ? 1 : 0,
  ];
}

const DEFAULTS = {
  intro: 5.4,
  deferIntro: false,
  dtMs: 16.6667,
  frames: 420,
  startT: 1000,
  accelAtFrame: 10,
  totalMs: 6300,
  rampMs: 480,
  teardownAtFrame: null,
};

function runScenario(setupIntro, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const environment = makeEnvironment();
  const scene = makeScene(config);
  const events = [];
  const identity = [];
  let teardownRaf = null;

  try {
    environment.state.t = config.startT;
    const api = setupIntro(scene.ctx);
    identity.push(globalThis.performance.now === environment.baseNow);
    const trace = [sample(scene)];

    for (let frame = 0; frame < config.frames; frame++) {
      if (frame === config.accelAtFrame) {
        events.push(['accelerate', api.accelerate({
          totalMs: config.totalMs,
          rampMs: config.rampMs,
        })]);
        identity.push(globalThis.performance.now === environment.baseNow);
      }
      if (frame === config.teardownAtFrame) {
        const pendingBefore = [...environment.pending.keys()];
        const value = api.teardown();
        teardownRaf = {
          value,
          pendingBefore,
          invocations: environment.rafInvocations,
          cancelled: [...environment.cancelled],
        };
        events.push(['teardown', value]);
        identity.push(globalThis.performance.now === environment.baseNow);
      }
      environment.frame(scene.animators, config.dtMs);
      identity.push(globalThis.performance.now === environment.baseNow);
      trace.push(sample(scene));
    }

    const drawables = scene.ground.concat(
      scene.stemDraw,
      scene.capDraw,
      scene.sceneDraw,
    );
    const result = {
      scene,
      trace,
      events,
      identity,
      writes: environment.writes.slice(),
      pending: environment.pending.size,
      cancelled: environment.cancelled.slice(),
      rafInvocations: environment.rafInvocations,
      teardownRaf,
      windows: drawables.map((drawable) => {
        const value = drawable.material.uniforms.uWin.value;
        return [value.a, value.b];
      }),
      clampY: scene.stemDraw.map((drawable) =>
        drawable.material.uniforms.uClampY.value),
      aDraw: scene.ground.concat(scene.stemDraw).map((drawable) =>
        drawable.geometry.attributes.aDraw.drawn.slice()),
      localClipping: scene.renderer.localClippingEnabled,
    };
    if (config.teardownAtFrame !== null) result.secondTeardown = api.teardown();
    return result;
  } finally {
    environment.dispose();
  }
}

function assertStaticStateParity(actual, expected, label) {
  assert.deepEqual(actual.windows, expected.windows, label + ': draw windows');
  assert.deepEqual(actual.clampY, expected.clampY, label + ': stem clamps');
  assert.deepEqual(actual.aDraw, expected.aDraw, label + ': draw re-keying');
  assert.equal(actual.localClipping, expected.localClipping, label + ': clipping');
  assert.equal(actual.windows.length, 20, label + ': window cardinality');
  assert.equal(actual.clampY.length, 3, label + ': clamp cardinality');
  assert.equal(actual.aDraw.length, 10, label + ': draw-key cardinality');
}

function assertGlobalClockUntouched(run, label) {
  assert.deepEqual(run.writes, [], label + ': no performance.now writes');
  assert.ok(run.identity.every(Boolean), label + ': performance.now identity at every seam');
}

function traceMaxDelta(actual, expected) {
  assert.equal(actual.length, expected.length, 'trace frame cardinality');
  let max = 0;
  for (let frame = 0; frame < actual.length; frame++) {
    assert.equal(actual[frame].length, expected[frame].length,
      'trace field cardinality at frame ' + frame);
    for (let field = 0; field < actual[frame].length; field++) {
      const a = actual[frame][field];
      const b = expected[frame][field];
      if (typeof a === 'number' && typeof b === 'number') {
        max = Math.max(max, Math.abs(a - b));
      } else {
        assert.equal(a, b, 'discrete trace state at frame ' + frame + ', field ' + field);
      }
    }
  }
  return max;
}

function assertTraceEquivalent(actual, expected, label) {
  const maxDelta = traceMaxDelta(actual, expected);
  assert.ok(maxDelta <= 1e-12,
    label + ': numerical drift exceeds local-clock round-off (' + maxDelta + ')');
}

const desktopCurrent = runScenario(current.setupIntro);
const desktopBaseline = runScenario(baseline.setupIntro);
assertTraceEquivalent(desktopCurrent.trace, desktopBaseline.trace,
  'desktop acceleration preserves the shipped scene trace frame-for-frame');
assertStaticStateParity(desktopCurrent, desktopBaseline, 'desktop');
assert.equal(desktopCurrent.events[0][1], true, 'desktop acceleration engages');
assert.ok(new Set(desktopCurrent.trace.map((row) => row[0])).size > 25,
  'desktop trace genuinely traverses the draw');
assert.equal(desktopCurrent.trace.at(-1)[0], 2, 'desktop intro parks at drawU=2');
assert.ok(desktopCurrent.rafInvocations > 20, 'desktop acceleration uses a real rAF ramp');
assertGlobalClockUntouched(desktopCurrent, 'desktop success');
assert.ok(desktopBaseline.writes.length > 0,
  'the pinned legacy oracle exercises the former global-clock mutation');

const mobileCurrent = runScenario(current.setupIntro, { rampMs: 220 });
const mobileBaseline = runScenario(baseline.setupIntro, { rampMs: 220 });
assertTraceEquivalent(mobileCurrent.trace, mobileBaseline.trace,
  'mobile acceleration preserves the shipped scene trace frame-for-frame');
assertStaticStateParity(mobileCurrent, mobileBaseline, 'mobile');
assertGlobalClockUntouched(mobileCurrent, 'mobile success');

const unacceleratedCurrent = runScenario(current.setupIntro, { accelAtFrame: null });
const unacceleratedBaseline = runScenario(baseline.setupIntro, { accelAtFrame: null });
assert.deepEqual(unacceleratedCurrent.trace, unacceleratedBaseline.trace,
  'ordinary unaccelerated intro remains byte-identical');
assertGlobalClockUntouched(unacceleratedCurrent, 'ordinary intro');

const lateCurrent = runScenario(current.setupIntro, { accelAtFrame: 380 });
const lateBaseline = runScenario(baseline.setupIntro, { accelAtFrame: 380 });
assert.deepEqual(lateCurrent.trace, lateBaseline.trace,
  'late declined acceleration preserves the shipped scene trace');
assert.deepEqual(lateCurrent.events[0], ['accelerate', false],
  'acceleration declines after the choreography is complete');
assertGlobalClockUntouched(lateCurrent, 'late decline');

const zeroCurrent = runScenario(current.setupIntro, { intro: 0 });
const zeroBaseline = runScenario(baseline.setupIntro, { intro: 0 });
assert.deepEqual(zeroCurrent.trace, zeroBaseline.trace, 'intro=0 behavior remains identical');
assert.deepEqual(zeroCurrent.events[0], ['accelerate', false], 'intro=0 cannot accelerate');
assertGlobalClockUntouched(zeroCurrent, 'intro=0');

{
  const environment = makeEnvironment();
  const scene = makeScene({ intro: 5.4, deferIntro: true });
  environment.state.t = 1000;
  try {
    const api = current.setupIntro(scene.ctx);
    assert.equal(api.started, false, 'deferred intro begins unstarted');
    assert.equal(scene.animators.has('intro-draw'), false,
      'deferred intro has no animator before start');
    assert.equal(api.start(), true, 'deferred intro starts exactly once');
    assert.equal(api.start(), false, 'second deferred start is rejected');
    assert.equal(api.started, true, 'started getter reflects the local clock');
    for (let i = 0; i < 8; i++) environment.frame(scene.animators, 16.6667);
    assert.equal(api.accelerate({ totalMs: 6300, rampMs: 480 }), true,
      'deferred intro accelerates after start');
    for (let i = 0; i < 8; i++) environment.frame(scene.animators, 16.6667);
    assert.equal(api.teardown(), true, 'deferred running intro tears down');
    assert.equal(api.teardown(), false, 'deferred teardown is idempotent');
    assert.deepEqual(environment.writes, [], 'deferred path never writes performance.now');
    assert.equal(globalThis.performance.now, environment.baseNow,
      'deferred path retains performance.now identity');
  } finally {
    environment.dispose();
  }
}

const interrupted = runScenario(current.setupIntro, {
  frames: 90,
  teardownAtFrame: 13,
});
assert.equal(interrupted.teardownRaf.value, true, 'mid-ramp teardown reports work');
assert.equal(interrupted.teardownRaf.pendingBefore.length, 1,
  'mid-ramp teardown owns one pending acceleration frame');
assert.deepEqual(interrupted.teardownRaf.cancelled, interrupted.teardownRaf.pendingBefore,
  'mid-ramp teardown cancels the exact pending frame');
assert.equal(interrupted.rafInvocations, interrupted.teardownRaf.invocations,
  'no acceleration callbacks run after teardown');
assert.equal(interrupted.pending, 0, 'teardown leaves no pending acceleration frame');
assert.equal(interrupted.scene.animators.has('intro-draw'), false,
  'teardown retires intro-draw');
assert.equal(interrupted.secondTeardown, false, 'teardown is idempotent');
assertGlobalClockUntouched(interrupted, 'interrupted intro');

{
  const environment = makeEnvironment();
  const scene = makeScene();
  environment.state.t = 1000;
  try {
    const api = current.setupIntro(scene.ctx);
    for (let i = 0; i < 4; i++) environment.frame(scene.animators, 16.6667);
    assert.equal(api.finish(), true, 'finish parks a live intro');
    assert.equal(scene.drawU.value, 2, 'finish parks drawU');
    assert.equal(scene.animators.has('intro-draw'), false, 'finish retires intro-draw');
    assert.ok(scene.stemShells.every((shell) => shell.material.opacity === 1
      && shell.material.clippingPlanes === null), 'finish restores stem shells');
    assert.ok(scene.capShells.every((shell) => shell.material.opacity === 1
      && shell.material.clippingPlanes === null), 'finish restores cap shells');
    assert.deepEqual(environment.writes, [], 'finish never writes performance.now');
  } finally {
    environment.dispose();
  }
}

function mutate(source, from, to, label) {
  assert.ok(source.includes(from), label + ': mutation target exists');
  const changed = source.replace(from, to);
  assert.notEqual(changed, source, label + ': mutation changes source');
  return changed;
}

const curveClock = mutate(
  CLOCK_SOURCE,
  'remaining * (f * f * (3 - 2 * f))',
  'remaining * (f * f * (3 - 2.0001 * f))',
  'curve mutant',
);
const curve = await loadIntro(CURRENT_SOURCE, 'curve-mutant', curveClock);
assert.ok(traceMaxDelta(runScenario(curve.setupIntro).trace, desktopBaseline.trace) > 1e-9,
  'trace oracle rejects a changed acceleration curve');

const noCancelSource = mutate(
  CURRENT_SOURCE,
  '      cancelAnimationFrame(accelerationRaf);\n',
  '',
  'no-cancel mutant',
);
const noCancel = await loadIntro(noCancelSource, 'no-cancel-mutant');
const noCancelRun = runScenario(noCancel.setupIntro, {
  frames: 90,
  teardownAtFrame: 13,
});
assert.ok(noCancelRun.cancelled.length === 0
  && noCancelRun.rafInvocations > noCancelRun.teardownRaf.invocations,
  'teardown assertions reject an abandoned rather than cancelled ramp');

const keepAnimatorSource = mutate(
  CURRENT_SOURCE,
  "    let undid = animators.delete('intro-draw');",
  '    let undid = false;',
  'keep-animator mutant',
);
const keepAnimator = await loadIntro(keepAnimatorSource, 'keep-animator-mutant');
const keepAnimatorRun = runScenario(keepAnimator.setupIntro, {
  frames: 20,
  teardownAtFrame: 13,
});
assert.equal(keepAnimatorRun.scene.animators.has('intro-draw'), true,
  'teardown assertion rejects a surviving intro animator');

const globalWriteClock = mutate(
  CLOCK_SOURCE,
  '    const rampT0 = now();',
  '    performance.now = performance.now;\n    const rampT0 = now();',
  'global-write mutant',
);
assert.ok(forbiddenClockWrites.some((pattern) => pattern.test(globalWriteClock)),
  'source invariant rejects an identity-preserving performance.now assignment');
const globalWrite = await loadIntro(CURRENT_SOURCE, 'global-write-mutant', globalWriteClock);
const globalWriteRun = runScenario(globalWrite.setupIntro, { frames: 30 });
assert.ok(globalWriteRun.writes.length > 0,
  'runtime trap rejects a transient or identity-preserving performance.now write');

for (const [label, from, to, field] of [
  ['window mutant', '[capBeads, 0.776, 0.885]', '[capBeads, 0.777, 0.885]', 'windows'],
  ['clamp mutant', 'uClampY.value = 3.65;', 'uClampY.value = 3.6500001;', 'clampY'],
  ['draw-key mutant', 'a.setX(i, (rMax - r) / span);',
    'a.setX(i, (rMax - r) / span + 1e-9);', 'aDraw'],
]) {
  const mutantSource = mutate(CURRENT_SOURCE, from, to, label);
  const mutant = await loadIntro(mutantSource, label.replace(/ /g, '-'));
  const run = runScenario(mutant.setupIntro);
  assert.notDeepEqual(run[field], desktopBaseline[field],
    label + ' is rejected by the scene-state oracle');
}

console.log('intro lifecycle/local-clock contract: PASS');
