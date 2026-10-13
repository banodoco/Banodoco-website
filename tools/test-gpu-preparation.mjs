import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareGpuWarmup, prepareHeroGpu } from '../journey/boot/hero-gpu.js';

// Execute the actual vendored compile/compileAsync implementations with only
// the renderer's expensive GL dependencies replaced. Polls use real timers.
const three = await readFile(new URL('../vendor/three/three.module.js', import.meta.url), 'utf8');
const compileStart = three.indexOf('\t\tthis.compile = function (');
const asyncStart = three.indexOf('\t\tthis.compileAsync = function (');
const compileSource = three.slice(compileStart, three.indexOf('\n\t\t// compileAsync', compileStart));
const asyncSource = three.slice(asyncStart, three.indexOf('\n\t\t// Animation Loop', asyncStart))
  .replaceAll('_contextGeneration', 'contextState.generation')
  .replaceAll('_isContextLost', 'contextState.lost');
function pollingRenderer(program, { parallel = true } = {}) {
  const contextState = { generation: 0, lost: false };
  const material = {};
  let currentProgram = program;
  const renderer = { compile: () => new Set([material]) };
  new Function('contextState', 'properties', 'extensions', asyncSource).call(renderer,
    contextState, { get: () => ({ currentProgram }) }, { get: () => parallel ? {} : null });
  return { renderer, contextState, replaceProgram(value) { currentProgram = value; } };
}

const scene = {}, camera = {};
const healthy = pollingRenderer({ isReady: () => true });
assert.equal(await healthy.renderer.compileAsync(scene, camera), scene);

// Restoration may already have completed between two 10ms polls. The old
// context's compile still rejects normally, with no uncaught timer exception.
const restored = pollingRenderer({ isReady: () => false });
const restoring = restored.renderer.compileAsync(scene, camera);
restored.contextState.generation += 2;
restored.replaceProgram(undefined);
await assert.rejects(restoring, { name: 'WebGLContextInvalidatedError' });

const lost = pollingRenderer({ isReady: () => false });
const losing = lost.renderer.compileAsync(scene, camera);
lost.contextState.lost = true;
await assert.rejects(losing, { name: 'WebGLContextInvalidatedError' });

// A material switching variants must not replace the program being polled.
let originalReady = false;
const variant = pollingRenderer({ isReady: () => originalReady });
const linking = variant.renderer.compileAsync(scene, camera);
variant.replaceProgram(undefined);
originalReady = true;
assert.equal(await linking, scene);

const pollError = new Error('driver status failure');
const broken = pollingRenderer({ isReady() { throw pollError; } }, { parallel: false });
await assert.rejects(broken.renderer.compileAsync(scene, camera), error => error === pollError);

let polls = 0;
const aborting = pollingRenderer({ isReady() { polls++; return false; } });
const controller = new AbortController();
const aborted = aborting.renderer.compileAsync(scene, camera, null, { signal: controller.signal });
controller.abort();
await assert.rejects(aborted, { name: 'AbortError' });
const pollsAtAbort = polls;
await new Promise(resolve => setTimeout(resolve, 25));
assert.equal(polls, pollsAtAbort, 'aborting removes the recursive poll');

// Three compilation retains hidden chapter variants so immediate first
// navigation keeps its existing material coverage.
const collected = [];
const lights = { init() {}, setupLights() {}, pushLight() {}, pushShadow() {} };
const compiler = {};
new Function('renderStates', 'renderStateStack', 'prepareMaterial',
  'let currentRenderState;\n' + compileSource).call(compiler,
  { get: () => lights }, [], material => collected.push(material));
const visibleMaterial = {}, hiddenMaterial = {};
const object = {
  traverse(fn) { fn({ isMesh: true, material: visibleMaterial }); fn({ isMesh: true, material: hiddenMaterial }); },
  traverseVisible(fn) { fn({ isMesh: true, material: visibleMaterial }); },
};
assert.equal(compiler.compile(object, camera).size, 2);
assert.deepEqual(collected.splice(0), [visibleMaterial, hiddenMaterial]);

const warnings = [];
const savedWarn = console.warn;
console.warn = (...args) => warnings.push(args);
try {
  let target = { canvas: true };
  const renderTarget = { frame: true };
  const observations = [];
  const r = {
    getContext: () => ({ isContextLost: () => false }),
    getRenderTarget: () => target,
    setRenderTarget(value) { target = value; },
    render() {},
    compileAsync(_object, _camera, _scene, options) {
      observations.push({ target, signal: options.signal });
      return Promise.resolve();
    },
  };
  const api = { renderer: r, scene, camera, composer: { readBuffer: renderTarget } };
  assert.equal(await prepareHeroGpu(api), true);
  assert.equal(await prepareGpuWarmup(api), true);
  assert.equal(observations.length, 2);
  assert(observations.every(value => value.target === renderTarget && value.signal instanceof AbortSignal));
  assert.deepEqual(target, { canvas: true }, 'preparation restores the frame target');

  const compileError = new Error('optional shader warmup failure');
  let syncCalls = 0;
  r.compileAsync = () => Promise.reject(compileError);
  r.compile = () => { syncCalls++; throw new Error('sync compile must not become a second readiness gate'); };
  assert.equal(await prepareGpuWarmup(api), true);
  assert.equal(syncCalls, 0);
  assert(warnings.some(args => args.includes(compileError)), 'original compile error is diagnostic');
  r.compileAsync = () => { throw compileError; };
  assert.equal(await prepareHeroGpu(api), true, 'hero uses the same optimisation policy');

  r.compileAsync = (_object, _camera, _scene, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('cancelled poll')), { once: true });
  });
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 15 }), true);
  assert(warnings.some(args => /timed out/.test(args[0])));

  const contextError = new Error('restored context invalidates prior compile');
  contextError.name = 'WebGLContextInvalidatedError';
  r.compileAsync = () => Promise.reject(contextError);
  assert.equal(await prepareGpuWarmup(api), false);
  r.getContext = () => ({ isContextLost: () => true });
  assert.equal(await prepareHeroGpu(api, { timeoutMs: 30, recoveryTimeoutMs: 10 }), false);
  assert.equal(await prepareGpuWarmup(null), false);

  // A stale generation can reject after restoration has already happened.
  // It must rewarm the fresh generation and prove a frame rather than fail.
  let lostNow = false, compileCalls = 0, draws = 0;
  r.getContext = () => ({ isContextLost: () => lostNow });
  r.render = () => { draws++; };
  r.compileAsync = () => ++compileCalls === 1 ? Promise.reject(contextError) : Promise.resolve();
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 80, recoveryTimeoutMs: 30 }), true);
  assert.equal(compileCalls, 2);
  assert.equal(draws, 1, 'restored generation must pass an actual frame draw');

  // Loss still in progress gets a short grace, also on initial entry.
  lostNow = true; compileCalls = 0; draws = 0;
  r.compileAsync = () => { compileCalls++; return Promise.resolve(); };
  setTimeout(() => { lostNow = false; }, 10);
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 80, recoveryTimeoutMs: 40 }), true);
  assert.equal(compileCalls, 1);
  assert.equal(draws, 1);

  compileCalls = 0; draws = 0;
  r.compileAsync = () => {
    if (++compileCalls === 1) {
      lostNow = true;
      setTimeout(() => { lostNow = false; }, 10);
      return Promise.reject(contextError);
    }
    return Promise.resolve();
  };
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 80, recoveryTimeoutMs: 40 }), true);
  assert.equal(compileCalls, 2);
  assert.equal(draws, 1);

  lostNow = true; compileCalls = 0;
  const permanentStart = performance.now();
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 80, recoveryTimeoutMs: 15 }), false);
  assert.equal(compileCalls, 0, 'permanently lost context never compiles');
  assert(performance.now() - permanentStart < 200, 'permanent loss is bounded');

  // Recovery uses the SAME deadline as preparation, not an additional full
  // compile timeout. The post-recovery pending compile gets only what remains.
  lostNow = true;
  setTimeout(() => { lostNow = false; }, 20);
  r.compileAsync = (_object, _camera, _scene, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('cancelled poll')), { once: true });
  });
  const boundedStart = performance.now();
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 40, recoveryTimeoutMs: 30 }), true);
  assert(performance.now() - boundedStart < 150, 'recovery cannot reset the total deadline');

  lostNow = false; compileCalls = 0;
  r.compileAsync = () => { compileCalls++; return Promise.reject(contextError); };
  assert.equal(await prepareGpuWarmup(api, { timeoutMs: 80 }), false);
  assert.equal(compileCalls, 2, 'invalidations cannot form an unbounded retry loop');

  r.getContext = () => ({ isContextLost: () => false });
  delete r.compileAsync;
  let syncOptions;
  r.compile = (_object, _camera, _scene, options) => { syncOptions = options; };
  assert.equal(await prepareGpuWarmup(api), true, 'renderer without async support uses sync preparation');
  assert(syncOptions.signal instanceof AbortSignal);

  // A variant draw throwing after async compile starts must observe and stop
  // that pending compile too, while preserving the draw failure's diagnosis.
  r.compileAsync = (_object, _camera, _scene, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('cancelled compile')), { once: true });
  });
  const drawError = new Error('variant draw failure');
  await assert.rejects(prepareGpuWarmup(api, { renderVariants() { throw drawError; } }), error => error === drawError);
  r.compileAsync = () => Promise.reject(compileError);
  r.render = () => { throw drawError; };
  await assert.rejects(prepareGpuWarmup(api), error => error === drawError);
  delete r.render;
  await assert.rejects(prepareGpuWarmup(api), error => error === compileError);
} finally {
  console.warn = savedWarn;
}
console.log('GPU preparation: PASS');
