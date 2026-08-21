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

// Chrome may deliver one aggregate wheel event after a long render frame.
// Advance the input clock without advancing the scroll frame, then integrate
// with animation.js's real 50 ms dt ceiling.
function coalescedAfterStall(deltaY, stallMs = 300, target = surfaceTarget) {
  now += stallMs;
  const event = {
    target, deltaY, deltaMode: 0, cancelable: true, preventDefault() {},
  };
  for (const fn of handlers.get('wheel') || []) fn(event);
  scroll.update(0.05);
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

// Connect's first segment used to hide a controller-independent velocity
// trough: the p-per-pixel gain halved through the intro, then rose at the
// rest. Sample the actual spline inverse so future pacing edits cannot restore
// that stall-then-roll profile while endpoint-only tests continue to pass.
const gainAt = (p) => {
  const x = scroll.scrollFor(p);
  return (scroll.pAt(x + 1) - scroll.pAt(x - 1)) / 2;
};
const connectGains = [0.40, 0.42, 0.44, 0.46, 0.48, 0.50, 0.52].map(gainAt);
const connectGainMin = Math.min(...connectGains);
const connectGainMax = Math.max(...connectGains);
const connectGainRatio = connectGainMin / connectGainMax;
results.push({ name: 'Connect road has no stall-then-roll trough',
  value: connectGainRatio,
  pass: connectGainRatio >= 0.85
    && connectGains.at(-1) <= connectGainMin * 1.08,
  trace: { gains: connectGains.map(v => +v.toFixed(8)) } });

// A frame hitch must not turn the wheel deltas Chrome coalesced across that
// hitch into a synthetic fling. The 120 px aggregate arrived over 300 ms, so
// its physical input rate is 400 px/s; on this road that is < 0.01 p/s. The
// old discounted 34 ms denominator reported ~3,500 px/s instead.
reset(0.26);
wheel(40);
coalescedAfterStall(120);
const stalledWheelPeak = scroll.gesturePeak;
results.push({ name: 'coalesced wheel after a frame stall keeps physical rate',
  value: stalledWheelPeak,
  pass: stalledWheelPeak > 0 && stalledWheelPeak < 0.012 });

// A same-direction second gesture may extend an in-flight Connect resolution
// toward Owned, but its immature rate EMA must not replace the speed floor the
// first gesture is already delivering. That replacement was the controller's
// exact stall-then-roll shape: collapse during the eight modest deltas, then
// recovery when their cruise latched.
reset(0.30);
for (let i = 0; i < 8; i++) wheel(120);
for (const delta of [96, 72, 48, 32, 20, 12]) wheel(delta);
for (let i = 0; i < 80; i++) frame(16);
const repeatPreRate = Math.abs(scroll.rate);
const repeatRates = [];
for (let i = 0; i < 8; i++) {
  wheel(24);
  repeatRates.push(Math.abs(scroll.rate));
}
for (let i = 0; i < 16; i++) {
  frame(16);
  repeatRates.push(Math.abs(scroll.rate));
}
const repeatMinRate = Math.min(...repeatRates);
const repeatTroughRatio = repeatMinRate / repeatPreRate;
results.push({ name: 'second gesture cannot collapse an in-flight Connect floor',
  value: repeatTroughRatio,
  pass: scroll.resolveTarget === 0.725 && repeatTroughRatio >= 0.70,
  trace: {
    preRate: +repeatPreRate.toFixed(5),
    minRate: +repeatMinRate.toFixed(5),
    target: scroll.resolveTarget,
  } });

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

// A delivered momentum tail can straddle the shorter arrival-wall timeout
// without crossing the longer gesture timeout. Once the first landing has
// answered the gesture, that 90-160 ms window must not let one stale sample
// reuse the old stream/rate credit to buy the following section.
reset();
for (let i = 0; i < 10; i++) wheel(120);
for (let i = 0; i < 500 && scroll.answeredAt === null; i++) wheel(18);
for (let i = 0; i < 5; i++) frame(16);
wheel(103, 12);
wheel(18);
wheel(10);
settle(10000);
results.push({ name: 'delayed momentum tail holds at Inspire',
  value: scroll.progress, pass: near(scroll.progress, 0.26) });

reset();
for (let i = 0; i < 10; i++) wheel(120);
for (let i = 0; i < 500 && scroll.answeredAt === null; i++) wheel(18);
for (let i = 0; i < 5; i++) frame(16);
wheel(103, 12);
for (const delta of [40, 30, 20, 10]) wheel(delta);
settle(10000);
results.push({ name: 'coalesced delayed tail holds at Inspire',
  value: scroll.progress, pass: near(scroll.progress, 0.26) });

reset();
for (let i = 0; i < 10; i++) wheel(120);
for (let i = 0; i < 500 && scroll.answeredAt === null; i++) wheel(18);
for (let i = 0; i < 5; i++) frame(16);
wheel(103, 12);
for (const delta of [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]) wheel(delta);
settle(10000);
results.push({ name: 'long coalesced momentum tail holds at Inspire',
  value: scroll.progress, pass: near(scroll.progress, 0.26) });

reset(0.26);
for (let i = 0; i < 10; i++) wheel(120);
for (let i = 0; i < 500 && scroll.answeredAt === null; i++) wheel(18);
for (let i = 0; i < 5; i++) frame(16);
wheel(103, 12); // 92 ms since the prior delta: > arrival hold, < gesture idle
wheel(18);
wheel(10);
settle(10000);
results.push({ name: 'delayed momentum tail cannot buy a second section',
  value: scroll.progress, pass: near(scroll.progress, 0.523) });

// Connect's road, camera and ground-light curves all decelerate over the same
// final slice. A released gesture must not add the global exponential crawl on
// top: the route declares a bounded brake tail while retaining its 2.5 s
// position-authored transit and fully reversible manual scrub.
reset(0.26);
for (let i = 0; i < 10; i++) wheel(110);
const connectReleasedAt = now;
for (let i = 0; i < 500 && scroll.answeredAt === null; i++) frame(16);
const connectReleaseMs = now - connectReleasedAt;
results.push({ name: 'Connect released glide has no near-static landing crawl',
  value: scroll.progress,
  pass: near(scroll.progress, 0.523) && connectReleaseMs <= 2700,
  trace: { releaseToLandingMs: connectReleaseMs } });

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}: ${result.value.toFixed(6)}`
    + (result.trace ? ` ${JSON.stringify(result.trace)}` : ''));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
