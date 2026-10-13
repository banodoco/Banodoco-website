import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../journey/boot/handoff.js', import.meta.url), 'utf8');
const queueSource = readFileSync(new URL('../journey/boot/entry-queue.js', import.meta.url), 'utf8');
const createQueue = new Function('globalThis', queueSource.slice(queueSource.indexOf('export function')).replace('export function', 'function') + '\nreturn createEntryQueue;')({});
const start = source.indexOf('export function createJourneyHandoff(');
assert(start >= 0);
const make = new Function('heroSpores', 'document', 'window', 'performance',
  'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'addEventListener', 'removeEventListener',
  'prepareHeroGpu', 'console',
  'const FREE_CAM = false; const NOTE = {}; const ownerOf = () => null; const modalLive = () => false; const targetOwnsKey = () => false;\n' + source.slice(start).replace('export function', 'function') +
  '\nreturn createJourneyHandoff;');
function harness({ landed = true, skipIntro = false, heroReady = true, pending = false,
  failure = null, heroUsable = true } = {}) {
  let now = 0, nextTimer = 0, impact = landed;
  const queue = createQueue();
  const failures = [], policies = [], marks = [];
  let activationAttempts = 0, failedStates = 0, revealAttempts = 0;
  let starts = 0, finishes = 0, strikes = 0, activations = 0, boots = 0, accelerations = 0;
  let navigationReady = false;
  let resolveModule, rejectModule, resolveReady, rejectReady, resolveHero, rejectHero;
  const frames = [], timers = new Map(), listeners = new Set();
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const module = new Promise((resolve, reject) => { resolveModule = resolve; rejectModule = reject; });
  const hero = new Promise((resolve, reject) => { resolveHero = resolve; rejectHero = reject; });
  if (heroReady) resolveHero(heroUsable);
  const intro = { complete: false, start() { starts++; }, finish() { finishes++; }, accelerate() { accelerations++; if (failure === 'accelerate') throw new Error('injected acceleration failure'); return true; } };
  const state = { ready, transitionSeconds: 4, activate() { activationAttempts++; if (failure === 'activate') throw new Error('injected activation failure'); activations++; }, failStartup() { failedStates++; }, revealRail() { revealAttempts++; if (failure === 'rail') throw new Error('injected rail failure'); } };
  const callback = make({ preludeStrike() { strikes++; }, preludeDismiss() {}, preludeFadeGround() {}, adopt() {},
    preludeLandingStatus: () => ({ firstImpact: impact, pending: pending && !impact }), preludeMsUntilStrike: () => 100 },
  { body: { classList: { add() {}, remove() {} } }, querySelector: () => null },
  { innerWidth: 1440 }, { now: () => now, mark(name) { marks.push(name); } },
  cb => { frames.push(cb); return frames.length; },
  (cb, ms = 0) => { const id = ++nextTimer; timers.set(id, { cb, due: now + ms }); return id; },
  id => timers.delete(id), (_, cb) => listeners.add(cb), (_, cb) => listeners.delete(cb),
  () => hero, { error() {} });
  callback({ scene: { intro, setInputPolicy(value) { policies.push(value); } },
    entryQueue: queue,
    note: { show() {}, showFailure(_html, stage, error) { if (!failure && heroUsable) throw new Error(`${stage}: ${error}`); failures.push({stage,error}); } }, journeyModule: module, bakedGeomReady: Promise.resolve(),
    skipIntro, frozen: false, introSeconds: 5.4 });
  async function tick(ms = 16) {
    now += ms;
    for (const frame of frames.splice(0)) frame(now);
    for (const [id, t] of [...timers]) if (t.due <= now) { timers.delete(id); t.cb(); }
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }
  return { intro, tick, land() { impact = true; }, heroReady() { resolveHero(true); },
    load() { resolveModule({ prepareRail: () => ({ setReady(value) { if (value && failure === 'setReady') throw new Error('injected readiness failure'); navigationReady = value; } }), prepareChapter: () => 0, boot: () => { boots++; return state; } }); },
    ready(value) { if (failure === 'ready') rejectReady(new Error('injected preparation failure')); else resolveReady(value); },
    rejectModule() { rejectModule(new Error('injected module failure')); },
    rejectHero() { rejectHero(new Error('injected hero draw failure')); },
    navigate(chapter = 'inspire', fast = true) { queue.request(chapter, { fast }); },
    get failures() { return failures; }, get policies() { return policies; }, get marks() { return marks; },
    get pendingTimers() { return timers.size; }, get inputListeners() { return listeners.size; },
    get activationAttempts() { return activationAttempts; }, get failedStates() { return failedStates; },
    get revealAttempts() { return revealAttempts; },
    scroll() { for (const cb of listeners) cb({ type: 'wheel', deltaY: 140, deltaMode: 0, cancelable: true, preventDefault() {} }); },
    get accelerations() { return accelerations; },
    get navigationReady() { return navigationReady; },
    get starts() { return starts; }, get finishes() { return finishes; }, get boots() { return boots; },
    get strikes() { return strikes; }, get activations() { return activations; } };
}
async function settle(h, n = 6) { for (let i = 0; i < n; i++) await h.tick(); }

// THE GROWTH WAITS FOR THE HERO, AND GIVES THE JOURNEY A GRACE (2026-10-04,
// zero-lag load). The hero's own programs gate it absolutely; the rest of
// the journey only for JOURNEY_GRACE_MS once the hero is ready. Whatever
// journey work is left then parks until the growth has finished, so the two
// never share the main thread.
const prepared = harness();
prepared.load(); prepared.ready();
await settle(prepared); await prepared.tick(120);
assert.equal(prepared.starts, 1, 'a journey prepared inside the grace starts growth at the landing');
assert.equal(prepared.activations, 0, 'navigation still waits for the growth to complete');
prepared.intro.complete = true;
await settle(prepared);
assert.equal(prepared.starts, 1, 'readiness never replays growth');
assert.equal(prepared.activations, 1);

// Gestures leave the growth alone; an explicit click starts travel in the
// same task as the growth acceleration, without waiting for its ramp timer.
const interactive = harness();
interactive.load(); interactive.ready();
await settle(interactive); await interactive.tick(120);
interactive.scroll();
assert.equal(interactive.accelerations, 0, 'scroll cannot accelerate the intro');
assert.equal(interactive.activations, 0, 'scroll cannot begin navigation');
interactive.navigate();
assert.equal(interactive.accelerations, 1, 'chapter click accelerates remaining growth');
assert.equal(interactive.activations, 1, 'camera activation overlaps growth immediately');
assert.equal(interactive.intro.complete, false, 'activation does not wait for completed growth');
await interactive.tick(1000);
assert.equal(interactive.activations, 1, 'handoff activates only once');

const coldHero = harness({ heroReady: false });
coldHero.load(); coldHero.ready();
await settle(coldHero); await coldHero.tick(3000);
assert.equal(coldHero.starts, 1, 'a prepared journey releases growth even before the hero warm-up reports');

const slow = harness();
await slow.tick(120);
assert.equal(slow.starts, 0, 'a landing alone does not start growth inside the journey grace');
await slow.tick(1500); await slow.tick(120);
assert.equal(slow.starts, 1, 'a hero ready past the grace starts growth without the journey');
slow.load();
await settle(slow); await slow.tick(500); await settle(slow);
assert.equal(slow.boots, 0, 'unfinished journey work parks while the growth runs');
slow.intro.complete = true;
await slow.tick(120); await settle(slow, 10);
assert.equal(slow.boots, 1, 'and resumes once the growth has finished');
slow.ready();
await settle(slow);
assert.equal(slow.starts, 1, 'a late journey never replays growth');
assert.equal(slow.activations, 1, 'a late journey activates as soon as it is ready');

const landing = harness({ landed: false });
landing.load(); landing.ready();
await settle(landing); await landing.tick(100);
assert.equal(landing.starts, 0, 'no premature growth before landing');
landing.land(); await landing.tick(50); await landing.tick(120);
assert.equal(landing.starts, 1);
const missing = harness({ landed: false });
missing.load(); missing.ready();
await settle(missing); await missing.tick(2800);
assert.equal(missing.starts, 1, 'missing landing has a bounded fallback');
// A slow settle still in the air is waited for: the growth must never start
// under a spore that has not landed (2026-10-04).
const slowSettle = harness({ landed: false, pending: true });
slowSettle.load(); slowSettle.ready();
await settle(slowSettle); await slowSettle.tick(3500);
assert.equal(slowSettle.starts, 0, 'a pending landing holds growth past the short fallback');
slowSettle.land(); await slowSettle.tick(50); await slowSettle.tick(120);
assert.equal(slowSettle.starts, 1, 'growth starts at the slow landing');
const stuck = harness({ landed: false, pending: true });
stuck.load(); stuck.ready();
await settle(stuck); await stuck.tick(7100); await stuck.tick(120);
assert.equal(stuck.starts, 1, 'a pending landing that never arrives is still bounded');
const hung = harness({ heroReady: false });
await hung.tick(9000);
assert.equal(hung.starts, 0, 'nothing prepared holds growth up to the backstop');
await hung.tick(1100); await hung.tick(120);
assert.equal(hung.starts, 1, 'a preparation that never settles cannot hold growth forever');
const early = harness({ landed: false });
early.navigate(); early.load(); early.ready();
await settle(early); await early.tick(500);
assert.equal(early.starts, 1); assert.equal(early.strikes, 1); assert.equal(early.activations, 1);
await early.tick(10000);
assert.equal(early.starts, 1, 'cancelled normal release cannot fire after early navigation');
const skipped = harness({ skipIntro: true });
await skipped.tick(3000); assert.equal(skipped.starts, 0);
skipped.load(); skipped.ready();
await settle(skipped);
assert.equal(skipped.finishes, 1); assert.equal(skipped.activations, 1);
console.log('hero handoff: hero gate, journey grace, parked journey work, real landing, bounded fallbacks, early navigation and skipped intro passed');

// Painting the early rail is not navigation readiness. The same gate opens
// after preparation even when no visitor ever clicks a disabled control.
const navigationGate = harness({ skipIntro: true });
navigationGate.load();
await settle(navigationGate);
assert.equal(navigationGate.boots, 1);
assert.equal(navigationGate.navigationReady, false, 'boot alone must not unlock navigation');
assert.equal(navigationGate.activations, 0);
navigationGate.ready();
await settle(navigationGate);
assert.equal(navigationGate.navigationReady, true, 'actual readiness unlocks navigation automatically');
assert.equal(navigationGate.activations, 1);

// Faults before publication, after preparation, and on deferred activation
// all enter the same terminal fallback. Inputs and already queued frames may
// still arrive, but cannot resurrect the retained startup state.
async function assertTerminal(h, stage, interactiveWasPublished = false) {
  assert.equal(h.failures.length, 1);
  assert.equal(h.failures[0].stage, stage);
  assert.equal(h.navigationReady, false);
  assert.equal(h.inputListeners, 0);
  assert.equal(h.policies.at(-1), 'free');
  const attempts = h.activationAttempts;
  h.navigate(); h.scroll(); h.intro.complete = true;
  await h.tick(20000); await settle(h);
  assert.equal(h.activationAttempts, attempts, 'later inputs and scheduled frames cannot revive fallback');
  assert.equal(h.failures.length, 1, 'failure is reported once');
  assert.equal(h.pendingTimers, 0, 'all startup timers retire');
  assert.equal(h.marks.includes('journey-interactive'), interactiveWasPublished, 'failed activation never publishes interactive');
}
const moduleFailure = harness({ failure: 'module' });
moduleFailure.rejectModule(); await settle(moduleFailure);
await assertTerminal(moduleFailure, 'loading journey modules');
for (const failure of ['ready', 'setReady']) {
  const h = harness({ failure }); h.load(); h.ready(); await settle(h);
  await assertTerminal(h, failure === 'ready' ? 'preparing journey shaders' : 'activating navigation and intro handoff');
  assert.equal(h.activations, 0);
  assert.equal(h.failedStates, 1, 'unpublished prepared state is retired');
}
for (const trigger of ['timer', 'frame', 'fast']) {
  const h = harness({ failure: 'activate' }); h.load(); h.ready(); await settle(h); await h.tick(120);
  if (trigger === 'timer') await h.tick(8000);
  else if (trigger === 'frame') { h.intro.complete = true; await h.tick(); }
  else h.navigate();
  await assertTerminal(h, 'activating navigation and intro handoff');
  assert.equal(h.activationAttempts, 1);
  assert.equal(h.activations, 0);
  assert.equal(h.accelerations, 0, 'failed activation cannot accelerate growth');
}
const railFailure = harness({ failure: 'rail' });
railFailure.load(); railFailure.ready(); await settle(railFailure); await railFailure.tick(120); await railFailure.tick(5000);
await assertTerminal(railFailure, 'revealing navigation');
const unavailable = harness({ heroUsable: false });
await settle(unavailable); unavailable.load(); unavailable.ready(); await settle(unavailable);
await assertTerminal(unavailable, 'preparing hero shaders');
const unavailableJourney = harness({ failure: 'gpu', skipIntro: true });
unavailableJourney.load(); unavailableJourney.ready(false); await settle(unavailableJourney);
await assertTerminal(unavailableJourney, 'preparing journey shaders');

// Home retains its non-fast intent both before the hook exists and while
// readiness is pending, including when it supersedes a prior chapter press.
for (const supersede of [false, true]) {
  const h = harness();
  if (supersede) h.navigate();
  h.navigate('mission', false); h.load(); h.ready(); await settle(h); await h.tick(120);
  assert.equal(h.activations, 0, 'queued Home respects the ordinary intro');
  assert.equal(h.accelerations, 0);
  h.intro.complete = true; await settle(h);
  assert.equal(h.activations, 1);
}
console.log('hero handoff failures: terminal module/readiness/GPU/rail/timer/frame/fast fallback and Home intent passed');

const rejectedHero = harness({ heroReady: false, failure: 'hero' });
await settle(rejectedHero); rejectedHero.rejectHero(); await settle(rejectedHero);
await assertTerminal(rejectedHero, 'preparing hero shaders');
assert.equal(rejectedHero.failures[0].error.message, 'injected hero draw failure', 'real GPU draw diagnosis is preserved');
const acceleratedFailure = harness({ failure: 'accelerate' });
acceleratedFailure.load(); acceleratedFailure.ready(); await settle(acceleratedFailure); acceleratedFailure.navigate();
await assertTerminal(acceleratedFailure, 'activating navigation and intro handoff', true);
assert.equal(acceleratedFailure.failedStates, 1, 'an acceleration fault retires the partially activated journey');
const skippedFailure = harness({ failure: 'activate', skipIntro: true });
skippedFailure.load(); skippedFailure.ready(); await settle(skippedFailure);
await assertTerminal(skippedFailure, 'activating navigation and intro handoff');
