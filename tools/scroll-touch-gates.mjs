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

// A same-direction second gesture arriving mid-flight is SPENT AT THE LANDING
// (owner report #26, 2026-08-26). Two properties are pinned here.
//
// UNCHANGED since DEF-SKIP (2026-08-23): the repeat may not retarget the
// flight past the rest it was going to (that overfly was the owner's "keeps
// scrolling through sections", measured at 98.4% of in-flight repeats), and
// its immature rate EMA must not replace the speed floor the first gesture is
// already delivering. `midTarget` and `troughRatio` below are those two, and
// they still assert exactly what they always did.
//
// CHANGED, 2026-08-26 — the settled position, 0.725 -> 0.523. DEF-SKIP queued
// the repeat behind the landing and the arrival armed that leg, so the ride
// stopped at Connect and then left it after a timed beat with nothing
// touching the page. That is the defect the owner reported ("NOT auto scroll
// to the next section would be nice when I haven't made any gesture to do
// so"), and lengthening the beat 300 -> 900 did not answer it ("So you didn't
// fix it? This is when scrolling through"). The queue is gone; the repeat's
// deltas complete THIS arrival and buy no further leg.
//
// THIS IS A RE-BASELINE AGAINST A DECIDED CHANGE, NOT A LOOSENING. The pin is
// still an exact anchor with the same tolerance; it names a different anchor
// because the owner moved the behaviour. Measured at the second stream's first
// delta: resolving=true, answeredAt=null, target=0.523, p=0.44562 — squarely
// mid-flight, which is the condition the ruling turns on. The visitor's ask is
// not lost, only deferred: the same repeat delivered AFTER the landing still
// buys the next section in 176 ms, which the case below this one pins.
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
const repeatMidTarget = scroll.resolveTarget;
settle();
results.push({ name: 'second gesture cannot collapse an in-flight Connect floor',
  value: repeatTroughRatio,
  pass: repeatMidTarget === 0.523 && repeatTroughRatio >= 0.70
    && near(scroll.progress, 0.523),
  trace: {
    preRate: +repeatPreRate.toFixed(5),
    minRate: +repeatMinRate.toFixed(5),
    midTarget: repeatMidTarget,
    settledP: +scroll.progress.toFixed(5),
  } });

// THE OTHER SIDE OF THE SAME RULING, and the reason the case above cannot go
// green over a wall that refuses everything: the SAME repeat, delivered once
// the ride has landed at Connect, must still buy Ownership. If a future edit answers the
// owner's report by refusing second gestures generally, this reds.
reset(0.30);
for (let i = 0; i < 8; i++) wheel(120);
for (const delta of [96, 72, 48, 32, 20, 12]) wheel(delta);
settle(4000);
const afterLandingFrom = scroll.progress;
for (let i = 0; i < 19; i++) frame(16);
for (let i = 0; i < 8; i++) wheel(24);
settle(6000);
results.push({ name: 'the same repeat AFTER the landing still buys Ownership',
  value: scroll.progress,
  pass: near(afterLandingFrom, 0.523) && near(scroll.progress, 0.725),
  trace: { landedAt: +afterLandingFrom.toFixed(5) } });

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

/* THE RAPID-REPEAT FAMILY, RE-ANCHORED 2026-08-26 (owner report #26).
   0.523 -> 0.26 on all five: a second flick delivered 128 ms into a 2.9 s
   transit no longer buys a second section.

   WHY THIS IS THE RULING AND NOT A SWALLOWED FLICK — the distinction the
   owner drew, and the one this suite must keep visible. Measured at the second
   swipe's touchstart on this very trace: `resolving=true`, `answeredAt=null`,
   target 0.26, and p between 0.02982 and 0.03108. The visitor has seen THREE
   PER CENT of the transition they already bought. The second flick is what a
   visitor does when nothing has visibly happened yet, not a request for a
   further section — and under the old law it bought one anyway, delivered by
   parking on Inspire for a timed beat and then leaving unattended.
   That unattended departure is the report.

   Those deltas are not discarded. They scrub the surface and the arrival comes
   144 ms SOONER with the second flick than without it (2800 vs 2944 ms,
   identical before and after this change), which is what the owner's "its
   deltas help complete the arrival" means in numbers.

   THE FLICK IS DEFERRED, NOT REFUSED. The after-landing case below buys the
   second section at the same 144 ms it always did. Both sides are pinned here
   deliberately: a wall that refuses second flicks outright reds the case
   below, and a fix that restores the unattended departure reds these five.
   Full two-sided coverage across all eight boundaries and both input kinds is
   tools/test-rest-authority.mjs. */
reset();
swipe();
for (let i = 0; i < 8; i++) frame();
swipe();
settle(10000);
results.push({ name: 'rapid repeat mid-flight buys Inspire only', value: scroll.progress,
  pass: near(scroll.progress, 0.26) });

for (const moves of [2, 3, 4]) {
  reset();
  swipe({ moves });
  for (let i = 0; i < 8; i++) frame();
  swipe({ moves });
  settle(10000);
  results.push({ name: `rapid repeat mid-flight (${moves} delivered moves) buys Inspire only`,
    value: scroll.progress, pass: near(scroll.progress, 0.26) });
}

reset();
swipe({ moves: 1 });
for (let i = 0; i < 8; i++) frame();
swipe({ moves: 1 });
settle(10000);
results.push({ name: 'rapid repeat mid-flight (one coalesced move each) buys Inspire only',
  value: scroll.progress, pass: near(scroll.progress, 0.26) });

// THE DUAL'S GUARD ON THE TOUCH PATH. The same two flicks, the second one
// delivered after the ride has landed, must still buy Connect — and must do so
// without the visitor waiting on anything the model invented. The earlier
// owner report known as the two-flicks-buy-one-section complaint ("two
// flicks buy one section") was a real defect and this is the case that keeps
// it fixed: it reds if a fix for report #26 over-refuses.
reset();
swipe();
settle(4000);
const twoFlickLanded = scroll.progress;
for (let i = 0; i < 19; i++) frame(16);
swipe();
settle(10000);
results.push({ name: 'two flicks either side of the landing buy Connect',
  value: scroll.progress,
  pass: near(twoFlickLanded, 0.26) && near(scroll.progress, 0.523),
  trace: { landedAt: +twoFlickLanded.toFixed(5) } });

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

/* THE GENUINE POST-BOOT REPEAT, RESTAGED 2026-08-26 (owner report #26).
   This case exists to prove the BOOT GUARD does not swallow a real second
   push, and it used to prove it mid-flight, because mid-flight was where a
   second push could still buy a section. Under the ruling it no longer can,
   so asserting 0.26 here would have left the case green over a boot guard
   that swallowed everything — the blind-spot failure this suite has been
   bitten by before. The repeat is therefore moved to where a real second push
   IS honoured, after the landing, and the mid-flight arm is kept below as its
   own two-sided partner.

   The second stream is deliberately delivered at ordinary 16 ms spacing, well
   inside the SNAP_ENGAGE_MS the time-only boundary demands of wheel, so the
   ONLY thing that can honour it is wheelPulseRestart's quiet-then-
   re-acceleration proof. That proof is the model's own evidence that a
   visitor pushed again rather than a momentum tail decaying, and it is what
   keeps a deliberate repeat immediate instead of making it wait out the
   arrival wall — i.e. it is load-bearing for the dual, not for the skip. */
reset();
scroll.primeBootWheel(100);
for (const delta of [100, 70, 35, 12]) wheel(delta);
settle(6000);
const bootLanded = scroll.progress;
for (let i = 0; i < 5; i++) frame(16);
for (const delta of [20, 50, 110, 110, 110]) wheel(delta);
settle(12000);
results.push({ name: 'genuine post-boot repeat after the landing still buys Connect',
  value: scroll.progress,
  pass: near(bootLanded, 0.26) && near(scroll.progress, 0.523),
  trace: { landedAt: +bootLanded.toFixed(5) } });

reset();
scroll.primeBootWheel(100);
for (const delta of [100, 70, 35, 12]) wheel(delta);
for (let i = 0; i < 11; i++) frame(16);
for (const delta of [20, 50, 110, 110, 110]) wheel(delta);
settle(12000);
results.push({ name: 'post-boot repeat delivered mid-flight buys Inspire only',
  value: scroll.progress, pass: near(scroll.progress, 0.26) });

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
