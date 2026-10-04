import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../journey/boot/handoff.js', import.meta.url), 'utf8');
const start = source.indexOf('export function createJourneyHandoff(');
assert(start >= 0);
const make = new Function('heroSpores', 'document', 'window', 'performance',
  'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'addEventListener', 'removeEventListener',
  'prepareHeroGpu',
  'const FREE_CAM = false; const NOTE = {};\n' + source.slice(start).replace('export function', 'function') +
  '\nreturn createJourneyHandoff;');
function harness({ landed = true, skipIntro = false, heroReady = true, pending = false } = {}) {
  let now = 0, nextTimer = 0, impact = landed, queued = null, requested;
  let starts = 0, finishes = 0, strikes = 0, activations = 0, boots = 0;
  let resolveModule, resolveReady, resolveHero;
  const frames = [], timers = new Map(), listeners = new Set();
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const module = new Promise(resolve => { resolveModule = resolve; });
  const hero = new Promise(resolve => { resolveHero = resolve; });
  if (heroReady) resolveHero(true);
  const intro = { complete: false, start() { starts++; }, finish() { finishes++; }, accelerate: () => true };
  const state = { ready, activate() { activations++; }, revealRail() {} };
  const callback = make({ preludeStrike() { strikes++; }, preludeDismiss() {}, preludeFadeGround() {}, adopt() {},
    preludeLandingStatus: () => ({ firstImpact: impact, pending: pending && !impact }), preludeMsUntilStrike: () => 100 },
  { body: { classList: { add() {}, remove() {} } }, querySelector: () => null },
  { innerWidth: 1440 }, { now: () => now, mark() {} },
  cb => { frames.push(cb); return frames.length; },
  (cb, ms = 0) => { const id = ++nextTimer; timers.set(id, { cb, due: now + ms }); return id; },
  id => timers.delete(id), (_, cb) => listeners.add(cb), (_, cb) => listeners.delete(cb),
  () => hero);
  callback({ scene: { intro, setInputPolicy() {} },
    entryQueue: { whenRequested(cb) { requested = cb; }, peek: () => queued,
      take() { const value = queued; queued = null; return value; } },
    note: { show() {} }, journeyModule: module, bakedGeomReady: Promise.resolve(),
    skipIntro, frozen: false, introSeconds: 5.4 });
  async function tick(ms = 16) {
    now += ms;
    for (const frame of frames.splice(0)) frame(now);
    for (const [id, t] of [...timers]) if (t.due <= now) { timers.delete(id); t.cb(); }
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }
  return { intro, tick, land() { impact = true; }, heroReady() { resolveHero(true); },
    load() { resolveModule({ prepareChapter: () => 0, boot: () => { boots++; return state; } }); },
    ready() { resolveReady(); }, navigate() { queued = 'inspire'; requested(); },
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
