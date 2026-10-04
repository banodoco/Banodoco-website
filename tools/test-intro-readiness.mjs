import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPortraitSprite } from '../journey/chapters/owned/portrait-photo-loader.js';

// Execute the shipped preparation closure with a controllable driver and
// timers. This checks behavior without needing a deliberately hung GPU.
const journey = readFileSync(new URL('../journey/journey.js', import.meta.url), 'utf8');
const start = journey.indexOf('  async function prepareGpu()');
const end = journey.indexOf('\n  state.ready = prepareGpu();', start);
assert(start >= 0 && end > start);
// compileForFrame is journey/boot/hero-gpu.js's import; the rig's stands in
// for it with the bare driver call, which is all prepareGpu() asks of it.
const compileForFrame = (api, object) => api.renderer.compileAsync(object, api.camera, api.scene);
const prepare = new Function('sceneApi', 'chapters', 'THREE', 'performance',
  'console', 'setTimeout', 'clearTimeout', 'compileForFrame',
  journey.slice(start, end) + '\nreturn prepareGpu();');
function rig(compileAsync) {
  const timers = new Map(), marks = [], warnings = [];
  let nextId = 0, renders = 0;
  const renderer = { getContext: () => ({}), compileAsync,
    render: () => { renders++; } };
  const promise = prepare({ renderer, rendererName: 'hardware renderer' },
    { owned: { portraits: { photosReady: new Promise(() => {}), prepareRemix() { throw new Error('optional remix must not gate startup'); } } } }, {},
    { mark: name => marks.push(name) },
    { warn: message => warnings.push(message), info() {} },
    (callback, ms) => { const id = ++nextId; timers.set(id, { callback, ms }); return id; },
    id => timers.delete(id), compileForFrame);
  return { promise, timers, marks, warnings, get renders() { return renders; } };
}
const normal = rig(() => Promise.resolve());
await normal.promise;
assert.deepEqual(normal.marks, ['journey-gpu-ready'], 'unresolved portraits do not gate the intro');
assert.equal(normal.renders, 0, 'normal startup never runs hidden chapter draws');
assert.equal(normal.timers.size, 0, 'successful compile clears its deadline');
let rejectLate;
const stalled = rig(() => new Promise((_, reject) => { rejectLate = reject; }));
await Promise.resolve();
const deadline = [...stalled.timers.values()][0];
assert(deadline.ms > 0 && deadline.ms <= 8000, 'shader preparation has a bounded deadline');
deadline.callback();
await stalled.promise;
assert.deepEqual(stalled.marks, ['journey-gpu-ready']);
assert.equal(stalled.renders, 0, 'timeout does not leave hidden render work running');
assert.equal(stalled.warnings.length, 1);
rejectLate(new Error('late driver failure'));
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(stalled.marks, ['journey-gpu-ready'], 'late failure does not publish readiness twice');

// The hero's own warm-up (journey/boot/hero-gpu.js) gates the growth, so it
// must settle on a driver that never finishes, and never reject.
const { prepareHeroGpu } = await import('../journey/boot/hero-gpu.js');
{
  const warned = [];
  const previousWarn = console.warn;
  console.warn = (message) => warned.push(message);
  try {
    const hung = { renderer: { compileAsync: () => new Promise(() => {}) } };
    assert.equal(await prepareHeroGpu(hung, { timeoutMs: 5 }), true,
      'a hung hero compile still releases the growth');
    assert.equal(warned.length, 1, 'and says so once');
    const failing = { renderer: { compileAsync: () => Promise.reject(new Error('driver')) } };
    assert.equal(await prepareHeroGpu(failing, { timeoutMs: 1000 }), true,
      'a failed hero compile still releases the growth');
    assert.equal(await prepareHeroGpu({}), false, 'no renderer, nothing to prepare');
  } finally {
    console.warn = previousWarn;
  }
}

// The real loader must settle a hung request and ignore a later onload.
const previousImage = globalThis.Image;
let image;
globalThis.Image = class { constructor() { image = this; } };
try {
  const pending = loadPortraitSprite(5);
  await assert.rejects(pending, /timed out/);
  image.onload();
  await assert.rejects(pending, /timed out/);
  const loaded = loadPortraitSprite(50);
  image.onload();
  assert.equal((await loaded).sheet, image);
} finally {
  if (previousImage === undefined) delete globalThis.Image;
  else globalThis.Image = previousImage;
}

console.log('intro readiness: stalled and late shader/image preparation regressions passed, hero warm-up bounded');
