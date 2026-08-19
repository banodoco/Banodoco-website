// Deterministic, DOM-free touch traces for journey/scroll.js.
// Run with: node tools/scroll-touch-gates.mjs

let now = 0;
const handlers = new Map();
const add = (type, fn) => {
  const list = handlers.get(type) || [];
  list.push(fn);
  handlers.set(type, list);
};

globalThis.performance = { now: () => now };
globalThis.location = { search: '' };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = {
  hidden: false,
  body: {},
  activeElement: null,
  addEventListener: add,
};
globalThis.window = {
  innerHeight: 932,
  addEventListener: add,
};

const { createScrollModel, claimInput, releaseInput } = await import('../journey/scroll.js');
const scroll = createScrollModel();
scroll.attach();
scroll.enabled = true;

const surfaceTarget = { nodeType: 1 };
function fire(type, touches, target = surfaceTarget) {
  const event = {
    target,
    touches,
    cancelable: true,
    preventDefault() {},
  };
  for (const fn of handlers.get(type) || []) fn(event);
}

function wheel(deltaY, gap = 16, target = surfaceTarget) {
  now += gap;
  const event = {
    target, deltaY, deltaMode: 0, cancelable: true, preventDefault() {},
  };
  for (const fn of handlers.get('wheel') || []) fn(event);
  scroll.update(gap / 1000);
}

function frame(ms = 16) {
  now += ms;
  scroll.update(ms / 1000);
}

function settle(ms = 6000) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) frame(16);
}

function swipe({ start = 780, distance = 560, moves = 8, gap = 16 } = {}) {
  fire('touchstart', [{ clientY: start }]);
  for (let i = 1; i <= moves; i++) {
    now += gap;
    fire('touchmove', [{ clientY: start - distance * i / moves }]);
    scroll.update(gap / 1000);
  }
  fire('touchend', []);
}

// The intro collector exists before scroll.attach(), so the scroll model never
// receives this contact's touchstart. Advance the fake event clock through the
// real contact, then through site-owned boot work without calling update(); the
// typed handoff must preserve the physical duration while ignoring boot delay.
function primeBootTouch({ start = 780, latest = 220, duration = 80,
  bootDelay = 500, active = false } = {}) {
  const startedAt = now;
  now += duration;
  const latestAt = now;
  now += bootDelay;
  return scroll.primeBootTouch({
    startY: start,
    latestY: latest,
    startedAt,
    latestAt,
    active,
  });
}

function continueTouch(ys, gap = 16) {
  for (const y of ys) {
    now += gap;
    fire('touchmove', [{ clientY: y }]);
    scroll.update(gap / 1000);
  }
  fire('touchend', []);
}

function reset(p = 0) {
  scroll.setProgress(p);
  for (let i = 0; i < 25; i++) frame(16);
}

function near(value, expected, epsilon = 0.002) {
  return Math.abs(value - expected) <= epsilon;
}

const results = [];

reset();
swipe();
settle();
results.push({ name: 'single swipe buys Inspire only', value: scroll.progress,
  pass: near(scroll.progress, 0.26) });

reset();
swipe({ moves: 1 });
const coalescedTrace = { streaming: scroll.streaming, peak: scroll.gesturePeak,
  target: scroll.resolveTarget, p: scroll.progress, surface: scroll.surface };
settle();
results.push({ name: 'single coalesced swipe buys Inspire only', value: scroll.progress,
  pass: near(scroll.progress, 0.26), trace: coalescedTrace });

reset();
swipe({ distance: 6, moves: 1 });
settle();
results.push({ name: 'single touch jitter buys nothing', value: scroll.progress,
  pass: near(scroll.progress, 0) });

reset();
const activeBootConsumed = primeBootTouch({ latest: 650, duration: 16,
  bootDelay: 500, active: true });
continueTouch([500, 350, 220]);
settle();
results.push({ name: 'cold-boot touch continues without scroll-side touchstart',
  value: scroll.progress, pass: activeBootConsumed && near(scroll.progress, 0.26) });

reset();
const endedBootConsumed = primeBootTouch({ duration: 120,
  bootDelay: 500, active: false });
const endedBootTrace = { streaming: scroll.streaming, peak: scroll.gesturePeak,
  target: scroll.resolveTarget, p: scroll.progress, surface: scroll.surface };
settle();
results.push({ name: 'cold-boot coalesced touch ended before boot buys Inspire',
  value: scroll.progress, pass: endedBootConsumed && near(scroll.progress, 0.26),
  trace: endedBootTrace });

reset();
const jitterBootConsumed = primeBootTouch({ latest: 774, duration: 60,
  bootDelay: 500, active: false });
settle();
results.push({ name: 'cold-boot touch jitter stays at Mission', value: scroll.progress,
  pass: jitterBootConsumed && near(scroll.progress, 0) });

reset();
const longBootConsumed = primeBootTouch({ start: 900, latest: -700,
  duration: 120, bootDelay: 500, active: false });
settle(10000);
results.push({ name: 'one cold-boot touch contact cannot buy two sections',
  value: scroll.progress, pass: longBootConsumed && near(scroll.progress, 0.26) });

reset();
swipe();
for (let i = 0; i < 8; i++) frame();
swipe();
settle(10000);
results.push({ name: 'rapid repeat buys Connect', value: scroll.progress,
  pass: near(scroll.progress, 0.523) });

for (const moves of [2, 3, 4]) {
  reset();
  swipe({ moves });
  for (let i = 0; i < 8; i++) frame();
  swipe({ moves });
  settle(10000);
  results.push({ name: `rapid repeat (${moves} delivered moves) buys Connect`,
    value: scroll.progress, pass: near(scroll.progress, 0.523) });
}

reset();
swipe({ moves: 1 });
for (let i = 0; i < 8; i++) frame();
swipe({ moves: 1 });
settle(10000);
results.push({ name: 'rapid repeat (one coalesced move each) buys Connect',
  value: scroll.progress, pass: near(scroll.progress, 0.523) });

reset();
swipe();
for (let i = 0; i < 8; i++) frame();
swipe({ start: 220, distance: -560 });
settle();
results.push({ name: 'rapid reversal returns to Mission', value: scroll.progress,
  pass: near(scroll.progress, 0) });

reset(0.26);
const owner = { nodeType: 1, isConnected: true, contains: node => node === owner };
claimInput(owner, { modal: true });
fire('touchstart', [{ clientY: 780 }], owner);
now += 16;
fire('touchmove', [{ clientY: 220 }], owner);
frame(16);
fire('touchend', [], owner);
releaseInput(owner);
results.push({ name: 'owned sheet drag never reaches journey', value: scroll.progress,
  pass: near(scroll.progress, 0.26) });

reset();
scroll.primeBootWheel(100);
for (const [delta, gap] of [[100, 16], [70, 16], [35, 300], [12, 16], [8, 16], [3, 16]]) {
  wheel(delta, gap);
}
settle(10000);
results.push({ name: 'cold-boot delayed tail buys one section only',
  value: scroll.progress, pass: near(scroll.progress, 0.26) });

reset();
scroll.primeBootWheel(100);
for (const delta of [100, 70, 35, 12]) wheel(delta);
for (let i = 0; i < 11; i++) frame(16);
for (const delta of [20, 50, 110, 110, 110]) wheel(delta);
settle(12000);
results.push({ name: 'genuine post-boot repeat still buys Connect',
  value: scroll.progress, pass: near(scroll.progress, 0.523) });

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}: ${result.value.toFixed(6)}`
    + (result.trace ? ` ${JSON.stringify(result.trace)}` : ''));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
