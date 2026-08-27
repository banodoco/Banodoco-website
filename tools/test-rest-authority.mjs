/* ======================================================================= *
 * THE JOURNEY NEVER LEAVES A REST THE VISITOR DID NOT ASK IT TO LEAVE —
 * AND NEVER REFUSES A VISITOR WHO ASKS.
 *
 *   node tools/test-rest-authority.mjs
 *   node tools/test-rest-authority.mjs --prove-failure
 *
 * WHAT THIS GATE IS FOR (owner report #26, 2026-08-26), verbatim:
 *
 *   "NOT auto scroll to the next section would be nice when I haven't made
 *    any gesture to do so. I'm pretty sure it's a race condition or something
 *    but maybe not."
 *
 * and, on being shown a longer landing beat instead of a stopped advance:
 *
 *   "So you didn't fix it? This is when scrolling through."
 *
 * THE LAW, in one sentence an editor can apply without re-deriving anything:
 *
 *   The journey advances past a rest only under live deltas from a gesture
 *   that began AFTER the journey came to that rest. A gesture that began
 *   while a resolution was still flying completes that arrival and is spent
 *   there; it buys nothing further, at any delay.
 *
 * WHY THIS FILE EXISTS AT ALL, AND WHY IT IS TWO-SIDED. This fault family has
 * a dual and this codebase has been bitten by both halves in turn:
 *
 *   - SKIP  — the journey moves past a rest nobody asked it to leave.
 *             Reported four times (DEF-SKIP, and #26 twice more after two
 *             separate fixes), each time diagnosed as correct-by-design.
 *   - SWALLOW — a fix walls the skip and over-refuses, and the SAME owner
 *             reports "two flicks buy one section" (evidence defect-02/).
 *             The observation order
 *             called that "the new defect wearing the old one's clothes".
 *
 * docs/code-health/2026-08-25-scroll-through-category.md §1.2 states the
 * consequence directly: a gate that asserts only "no skips" invites the next
 * fix to trade skips for swallows invisibly. So every boundary here is driven
 * BOTH ways and both outcomes are integers, and the mutant battery below
 * includes killers for each side. A wall that refuses everything reds this
 * file just as loudly as a queue that departs by itself.
 *
 * THE THIRD THING IT MEASURES, because "no swallow" is not only a count:
 * L3 pins the LATENCY a legitimate post-landing gesture pays. A fix that
 * honours the second gesture but makes the visitor wait for it has traded the
 * complaint for a quieter one. Measured on the tree this file was written
 * against, and unchanged from the tree before the fix: 144 ms on touch,
 * 176 ms on wheel, identical at all eight boundaries and both directions.
 *
 * PURE, DOM-FREE, DETERMINISTIC. Same rig as tools/scroll-touch-gates.mjs — a
 * fake clock, no browser, no rAF, no flake by construction. Its honest limit
 * is the same as that suite's: constant synthetic deltas, no real event path,
 * no coalescing physics, no real fingers. It exists so an editor of
 * journey/scroll.js cannot land a member of this class without `npm run check`
 * going red AT THE DESK; the browser ring (tools/dwell-oracle.mjs) remains the
 * arbiter of the real page.
 * ======================================================================= */

import assert from 'node:assert/strict';

const PROVE = process.argv.slice(2).includes('--prove-failure');

/* ------------------------------------------------------------------ *
 * The rig. Lifted from scroll-touch-gates.mjs so the two suites drive
 * the model through the same door; kept local rather than imported
 * because that file is a script with side effects, not a module.
 * ------------------------------------------------------------------ */
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
globalThis.document = { hidden: false, body: {}, activeElement: null, addEventListener: add };
globalThis.window = { innerHeight: 932, addEventListener: add };

const { createScrollModel } = await import('../journey/scroll.js');
const { REST_STOPS } = await import('../journey/route.js');
const { SNAP_DEAD_P } = await import('../journey/constants/scroll.js');

const scroll = createScrollModel();
scroll.attach();
scroll.enabled = true;

/* THE WRAP NEEDS A CALLBACK OR IT DOES NOT EXIST, and the first draft of this
   file did not pass one. `createScrollModel({ onWrap })` defaults it to null
   and the model's wrap block is guarded `if (onWrap && ...)`, so on a bare
   model a forward gesture at the last rest simply resolves to the END-HOLD
   (p 1.0) and L4 was asserting that instead — green over a seam it never
   drove, which is the exact blind-spot failure this program keeps catching in
   its own instruments. Verified before the fix: identical 0.97 -> 1.000 on
   this tree and on the pre-fix tree, in both kinds, at six pause lengths.

   The stub places the position at the destination, which is what the model's
   own comment says the callback is for ("the jump places the surface at the
   destination") and what journey.js's real onWrap reaches via navigateTo. */
let wrapCalls = [];
const wrapModel = createScrollModel({
  onWrap: (dir) => {
    wrapCalls.push(dir);
    wrapModel.setProgress(dir > 0 ? REST_STOPS[0] : REST_STOPS[REST_STOPS.length - 1]);
  },
});
wrapModel.attach();
wrapModel.enabled = true;
/* Both models are attached to the same handler map, so a dispatched event
   reaches both. That is harmless and deliberate — L1/L2/L3 read `scroll` and
   have finished by the time L4 reads `wrapModel` — but it does mean the
   driver has to be told WHICH model to integrate. */
let MODEL = scroll;

const surfaceTarget = { nodeType: 1 };
function fire(type, touches) {
  const event = { target: surfaceTarget, touches, cancelable: true, preventDefault() {} };
  for (const fn of handlers.get(type) || []) fn(event);
}
function wheelEvent(deltaY, gap) {
  now += gap;
  const event = {
    target: surfaceTarget, deltaY, deltaMode: 0, cancelable: true, preventDefault() {},
  };
  for (const fn of handlers.get('wheel') || []) fn(event);
  MODEL.update(gap / 1000);
}
const frame = (ms = 16) => { now += ms; MODEL.update(ms / 1000); };
const settle = (ms) => { for (let e = 0; e < ms; e += 16) frame(16); };
const reset = (p) => { MODEL.setProgress(p); for (let i = 0; i < 25; i++) frame(16); };

/** One gesture, in the direction given. Both kinds deliver a comparable
 *  amount of road so the two arms are answering the same question. */
const GESTURE = {
  touch: (dir) => {
    const start = dir > 0 ? 780 : 220;
    const distance = dir * 560;
    fire('touchstart', [{ clientY: start }]);
    for (let i = 1; i <= 8; i++) {
      now += 16;
      fire('touchmove', [{ clientY: start - distance * i / 8 }]);
      MODEL.update(0.016);
    }
    fire('touchend', []);
  },
  wheel: (dir) => { for (let i = 0; i < 10; i++) wheelEvent(dir * 120, 16); },
};
const KINDS = ['touch', 'wheel'];

/* Every boundary on the route, both ways: eight of them, plus the two wrap
   seams handled separately in L4. Derived from REST_STOPS rather than
   transcribed, so a route edit that adds a rest is covered by construction
   instead of by somebody remembering to add a case. */
const BOUNDARIES = [];
for (let i = 0; i < REST_STOPS.length; i++) {
  for (const dir of [1, -1]) {
    const j = i + dir;
    if (j >= 0 && j < REST_STOPS.length) {
      BOUNDARIES.push({ from: REST_STOPS[i], to: REST_STOPS[j], dir });
    }
  }
}
assert.equal(BOUNDARIES.length, 8,
  `rig: expected 8 inter-rest boundaries from REST_STOPS, derived ${BOUNDARIES.length} — the route `
  + 'changed shape and this file has not been re-read');

const at = (p, q) => Math.abs(p - q) <= SNAP_DEAD_P;
const restIndexAt = (p) => REST_STOPS.findIndex((r) => at(p, r));

/** Run the model forward until it has come to rest, or `capMs` elapses.
 *
 *  "At rest" is a RANGE test over the last `window` frames, not a
 *  frame-to-frame stillness test, and that is deliberate. The servo settles
 *  into a steady sub-pixel limit cycle at an anchor — measured, a persistent
 *  +/-1.1e-5 of p per frame, indefinitely, with the reported position sitting
 *  exactly on the anchor. That dither is four hundred times smaller than
 *  SNAP_DEAD_P, is present identically before and after the 2026-08-26 fix,
 *  and is nothing this gate is about; an exact-stillness test would simply
 *  never terminate on it. Range over a window sees a ride that is still
 *  travelling (which is what this needs to exclude) and ignores the dither. */
function runUntilStill(windowFrames = 24, capMs = 20000) {
  const recent = [];
  for (let e = 0; e < capMs; e += 16) {
    frame(16);
    recent.push(MODEL.progress);
    if (recent.length > windowFrames) recent.shift();
    if (recent.length === windowFrames
        && Math.max(...recent) - Math.min(...recent) < SNAP_DEAD_P / 4) {
      return { p: MODEL.progress, t: now, settled: true };
    }
  }
  return { p: MODEL.progress, t: now, settled: false };
}

/* A plain array and a plain `push`, deliberately NOT a `note(id, msg)` helper.
   AP15 (tools/test-assertion-provenance.mjs) reads label-bearing callees as
   assertion receivers, and an undeclared one is a receiver the provenance
   sweep does not read. tools/test-rest-composition.mjs hit exactly this with
   a `pin(id, why, fn)` collector and the house answer was to REMOVE the
   wrapper rather than declare it; this file follows that. Every verdict below
   is a bare `assert.ok` or a push onto this array, drained by one `assert.ok`
   at the end so a run reports ALL its violations rather than only the first. */
const failures = [];

/* ================================================================== *
 * L1 — NO UNREQUESTED ADVANCE.
 *
 * Land at a rest, then deliver NOTHING for twelve seconds, and the journey
 * must not move. Driven on both the one-gesture path and the two-gesture
 * path, because the two-gesture path is the one the owner reported and the
 * one every previous measurement declared correct-by-design: at quiet load
 * Connect departed unattended on 8 of 8 rides, and lengthening the beat
 * 300 -> 900 only moved the departure later.
 *
 * Twelve seconds is not arbitrary. The retired mechanism departed at the
 * landing beat, which stood at 900 ms when it was retired (the constant has
 * since been re-derived to 0 on the wrap's own terms — see
 * journey/constants/scroll.js), and the longest transit on the route is under
 * 3 s, so 12 s is four times the whole worst-case ride — long enough that a
 * regression which merely delays the departure again, rather than stopping
 * it, still reds here. "A longer delay is not a fix" is the owner's sentence
 * and this is the assertion that holds us to it.
 * ================================================================== */
for (const kind of KINDS) {
  for (const { from, to, dir } of BOUNDARIES) {
    for (const path of ['one gesture', 'two gestures mid-flight']) {
      reset(from);
      GESTURE[kind](dir);
      if (path !== 'one gesture') {
        // 128 ms in: measured, the flight is 1.3-3.1% of the way there, so
        // this is the ordinary "nothing has happened yet, scroll again"
        // cadence rather than a contrived edge.
        for (let f = 0; f < 8; f++) frame(16);
        GESTURE[kind](dir);
      }
      const landing = runUntilStill();
      if (!landing.settled) {
        failures.push(`L1: ` + `${kind} ${from}->${to} (${path}) never came to rest within 20 s`);
        continue;
      }
      if (!at(landing.p, to)) {
        failures.push(`L1: ` + `${kind} ${from}->${to} (${path}) came to rest at ${landing.p.toFixed(5)}, `
          + `which is not the section the gesture bought`);
        continue;
      }
      const restedAt = landing.p;
      settle(12000);
      if (Math.abs(MODEL.progress - restedAt) > SNAP_DEAD_P) {
        failures.push(`L1: ` + `${kind} ${from}->${to} (${path}) LEFT THE REST UNATTENDED: stood at `
          + `${restedAt.toFixed(5)}, moved to ${MODEL.progress.toFixed(5)} with no input at all. `
          + 'This is owner report #26.');
      }
    }
  }
}

/* ================================================================== *
 * L2 — NO SWALLOWED GESTURE (the dual).
 *
 * The same boundaries, but the second gesture is delivered AFTER the ride has
 * landed, separated by a plainly deliberate 304 ms pause. It must buy exactly
 * one further section — not zero (the two-flicks-buy-one-section complaint),
 * and not two.
 *
 * This is the pin that stops the next fix for L1 from being a wall. It is
 * driven at every boundary and in both directions precisely because a wall is
 * usually total: a change that refuses second gestures generally reds all
 * twelve of these at once.
 * ================================================================== */
const LATENCY = [];
for (const kind of KINDS) {
  for (const { from, to, dir } of BOUNDARIES) {
    const j = restIndexAt(to) + dir;
    if (j < 0 || j >= REST_STOPS.length) continue; // the wrap seams are L4's
    const onward = REST_STOPS[j];

    reset(from);
    GESTURE[kind](dir);
    const landing = runUntilStill();
    if (!at(landing.p, to)) {
      failures.push(`L2: ` + `${kind} ${from}->${to}: the FIRST gesture did not deliver its section `
        + `(rested at ${landing.p.toFixed(5)}) — L2 cannot ask its question`);
      continue;
    }
    for (let f = 0; f < 19; f++) frame(16); // 304 ms: a pause the visitor made
    const askedAt = now;
    GESTURE[kind](dir);

    let leftAt = null;
    for (let g = 0; g < 600 && leftAt === null; g++) {
      frame(16);
      if (Math.abs(MODEL.progress - to) > SNAP_DEAD_P) leftAt = now;
    }
    const arrival = runUntilStill();

    if (leftAt === null) {
      failures.push(`L2: ` + `${kind} ${to}->${onward}: a deliberate gesture 304 ms after the landing was `
        + 'SWALLOWED — the journey never left the rest. This is the '
        + 'two-flicks-buy-one-section complaint returning.');
      continue;
    }
    LATENCY.push({ kind, from: to, to: onward, ms: leftAt - askedAt });
    if (!at(arrival.p, onward)) {
      failures.push(`L2: ` + `${kind} ${to}->${onward}: the post-landing gesture moved the journey to `
        + `${arrival.p.toFixed(5)} instead of the one section it bought`);
    }
  }
}

/* ================================================================== *
 * L3 — THE LATENCY A LEGITIMATE GESTURE PAYS.
 *
 * Counting sections is not enough: a fix that honours the second gesture but
 * makes the visitor wait for it has traded a loud complaint for a quiet one.
 *
 * The numbers below are the measured cost on the tree this file was written
 * against, and they are IDENTICAL on the tree before the fix (A/B'd at all
 * twelve cells, both kinds) — the fix touched the arrival, not the arming, so
 * the fresh-gesture path is the one that was already shipping. They are a
 * gesture's own arming cost, not a hold: touch resolves on the contact's
 * eighth move, wheel two frames later on its rate EMA.
 *
 * The ceiling is deliberately not much above the measurement. This pin is not
 * a budget to spend — it is here to catch a fix that pays for L1 by making the
 * visitor wait, which is the cheapest wrong way to close this defect.
 * ================================================================== */
const LATENCY_MEASURED = { touch: 144, wheel: 176 };
const LATENCY_TOL_MS = 48; // three frames of slack, no more

for (const kind of KINDS) {
  const cells = LATENCY.filter((l) => l.kind === kind);
  assert.ok(cells.length > 0,
    `L3: no latency samples for ${kind} — L2 never got far enough to measure, so this pin is `
    + 'silently guarding nothing');
  for (const cell of cells) {
    const drift = cell.ms - LATENCY_MEASURED[kind];
    if (Math.abs(drift) > LATENCY_TOL_MS) {
      failures.push(`L3: ` + `${kind} ${cell.from}->${cell.to}: a deliberate gesture waited ${cell.ms} ms to be `
        + `honoured; this file measured ${LATENCY_MEASURED[kind]} ms (+/-${LATENCY_TOL_MS}). `
        + (drift > 0
          ? 'The journey has become less responsive to a visitor who asked. Do not widen this '
            + 'tolerance — find what is holding the gesture.'
          : 'Faster than measured, which is welcome but unexplained: re-measure and rewrite '
            + 'LATENCY_MEASURED with the evidence.'));
    }
  }
}

/* ================================================================== *
 * L4 — THE WRAP SEAMS, both laws at once.
 *
 * The route is a loop, and the seam is where the queue latch could never
 * reach (backward at the first rest there is no anchor beyond to queue), so
 * it is where the two laws are most easily broken in opposite directions.
 * Forward off the last rest must wrap when asked and stand still when not.
 * ================================================================== */
const lastRest = REST_STOPS[REST_STOPS.length - 1];

/* L4-VACUITY — the control that would have caught this file's own first
   draft. A model built WITHOUT an onWrap callback must fail to wrap, because
   if it "wraps" anyway then L4 is reading the end-hold resolution and the
   seam is not being driven at all. Run before L4 so a vacuous L4 is a
   refusal, not a pass. */
{
  const bare = createScrollModel();
  bare.attach();
  bare.enabled = true;
  const prev = MODEL;
  MODEL = bare;
  reset(lastRest);
  for (let f = 0; f < 19; f++) frame(16);
  GESTURE.touch(1);
  const out = runUntilStill();
  MODEL = prev;
  assert.ok(!at(out.p, REST_STOPS[0]),
    'L4-VACUITY: a model with NO onWrap callback reached the first rest, so L4 cannot tell a real '
    + 'wrap from an ordinary resolution and its "wraps when asked" arm is measuring nothing. This '
    + 'control exists because this file\'s first draft did exactly that: it built a bare model, '
    + 'read p 1.0 (the END-HOLD, not a wrap) and reported the seam green.');
}

MODEL = wrapModel;
for (const kind of KINDS) {
  // ...it stands still when nobody asks.
  wrapCalls = [];
  reset(REST_STOPS[REST_STOPS.length - 2]);
  GESTURE[kind](1);
  const landed = runUntilStill();
  if (!at(landed.p, lastRest)) {
    failures.push(`L4: ` + `${kind}: the ride into the last rest ended at ${landed.p.toFixed(5)}`);
  } else {
    settle(12000);
    if (Math.abs(MODEL.progress - lastRest) > SNAP_DEAD_P || wrapCalls.length) {
      failures.push(`L4: ` + `${kind}: the journey left the last rest UNATTENDED — stood at ${lastRest}, `
        + `moved to ${MODEL.progress.toFixed(5)} with no input (${wrapCalls.length} wrap calls). `
        + 'The wrap is a section change and is subject to the same law.');
    }
  }

  // ...and it wraps when asked — ASKED FROM A REAL LANDING, which is the only
  // state this seam is ever actually in. This arm used to drive the ask from
  // `reset(lastRest)`, a PLACEMENT: it stamps no landing beat and raises no
  // arrival wall, so the guard the wrap is subject to was never in force when
  // the ask was made. It scored green for the whole period the forward wrap
  // was unaskable — a 900 ms beat destroyed 14 of 14 deliberate 150 ms asks
  // and this arm said nothing. So the ride below is the same real landing the
  // "stands still" arm above performs, and the ask is delivered 144 ms past
  // it (nine frames; the measured ask is 150 ms), inside the window the beat
  // governed. Asserted on the CALLBACK, not on the position: the stub places
  // p itself, so reading p back would be reading this file's own stub rather
  // than the model's decision.
  wrapCalls = [];
  reset(REST_STOPS[REST_STOPS.length - 2]);
  GESTURE[kind](1);
  const arrived = runUntilStill();
  /* The POSED PRECONDITION — L4-VACUITY's discipline applied to this arm.
     "X happens when asked" means nothing unless the guarded state was in
     force at the ask, so say out loud that the model is standing on the last
     rest, having landed there, with no wrap already spent. */
  if (!at(arrived.p, lastRest) || wrapCalls.length) {
    failures.push(`L4: ` + `${kind}: the ask arm never posed its precondition — the ride into the last `
      + `rest ended at ${arrived.p.toFixed(5)} after ${wrapCalls.length} wrap call(s), so "wraps when `
      + `asked" would be asserting over a state the seam never occupies.`);
  }
  for (let f = 0; f < 9; f++) frame(16);
  GESTURE[kind](1);
  runUntilStill();
  if (!wrapCalls.includes(1)) {
    failures.push(`L4: ` + `${kind}: a deliberate forward gesture 144 ms after LANDING on the last rest did `
      + `not wrap — the model never called onWrap and came to rest at ${MODEL.progress.toFixed(5)}. `
      + 'The seam has been walled along with the skip, or a hold on the landing clock is charging '
      + 'the visitor for a gesture they plainly made.');
  }

  // ...and backward off the FIRST rest, which is the seam the retired queue
  // latch could never reach (there is no anchor beyond to queue), so it is
  // where a fix for L1 is most likely to have walled something by accident.
  wrapCalls = [];
  reset(REST_STOPS[0]);
  for (let f = 0; f < 19; f++) frame(16);
  GESTURE[kind](-1);
  runUntilStill();
  if (!wrapCalls.includes(-1)) {
    failures.push(`L4: ` + `${kind}: a deliberate backward gesture at the first rest did not wrap — the model `
      + `never called onWrap and came to rest at ${MODEL.progress.toFixed(5)}.`);
  }
}
MODEL = scroll;

/* ================================================================== *
 * Report
 * ================================================================== */
const latencyLine = KINDS.map((k) => {
  const cells = LATENCY.filter((l) => l.kind === k).map((l) => l.ms);
  return `${k} ${Math.min(...cells)}-${Math.max(...cells)} ms`;
}).join(', ');

assert.ok(failures.length === 0,
  `Rest authority: ${failures.length} violation(s) of the rest law —\n  `
  + failures.join('\n  '));

if (!PROVE) {
  console.log('Rest authority: PASS');
  console.log(`  L1 no unrequested advance: ${BOUNDARIES.length * KINDS.length * 2} cells `
    + '(8 boundaries x 2 kinds x {one gesture, two mid-flight}), 12 s unattended each');
  console.log(`  L2 no swallowed gesture:   ${LATENCY.length} cells, each buying exactly one section`);
  console.log(`  L3 latency to honour a deliberate gesture: ${latencyLine}`);
  console.log('  L4 wrap seam: stands still unasked, wraps when asked, both kinds');
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * --prove-failure
 *
 * Every pin names its killer, and both SIDES are killed. The mutants are
 * applied to a fresh model built from a rewritten copy of journey/scroll.js
 * held in memory — nothing is written to the tree. A mutant that fails to
 * apply is a HarnessFault, not a green: an anchor that has drifted would
 * otherwise silently retire the proof it carries.
 * ------------------------------------------------------------------ */
const { readFileSync } = await import('node:fs');
const { dirname, join, resolve } = await import('node:path');
const { fileURLToPath } = await import('node:url');
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(REPO, 'journey/scroll.js'), 'utf8');

/** Build a model from mutated source, drive one scenario, return the outcome.
 *  Each mutant gets its own module instance via a data: URL, so the mutants
 *  cannot contaminate each other or the run above. */
async function withMutant(edits, drive) {
  let src = SRC;
  for (const [find, replace] of edits) {
    if (!src.includes(find)) {
      throw new Error(`HarnessFault: mutant anchor missed: ${JSON.stringify(find.slice(0, 70))}`);
    }
    src = src.replace(find, replace);
  }
  // Rewrite the relative specifiers against the real files on disk.
  src = src.replace(/from '(\.\.?\/[^']+)'/g,
    (_, spec) => `from '${new URL(spec, new URL('journey/scroll.js', `file://${REPO}/`)).href}'`);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
  const m = mod.createScrollModel();
  m.attach();
  m.enabled = true;
  return drive(m);
}

/* The two scenarios, written once and driven against whatever model is handed
   in. Each owns its own clock reads so mutants cannot inherit state.

   BOTH USE TOUCH, and that is a measured decision rather than a preference.
   The skip scenario needs the second stream to be a SECOND GESTURE by the
   model's own reckoning, and on wheel it is not: two bursts 144 ms apart fall
   inside SNAP_ENGAGE_MS (160 ms), so the model reads them as one continuous
   gesture and the exemption under test is never reached. A touchstart mints
   the gesture outright. Verified against the pre-fix tree, which is the
   ground truth here: two touch swipes 128 ms apart bought two sections
   (0 -> 0.523) while the identical wheel cadence bought one (0 -> 0.26). A
   mutant driven on wheel would have scored green over a scenario that never
   posed the question — which is how this file's first two attempts failed. */
const swipeInto = (m) => {
  const f = (ms) => { now += ms; m.update(ms / 1000); };
  const fireAll = (type, touches) => {
    const e = { target: surfaceTarget, touches, cancelable: true, preventDefault() {} };
    for (const fn of handlers.get(type) || []) fn(e);
  };
  return { f, fireAll };
};

/** Settle to a stop using the same range test the main run uses. */
function stillOn(m, f) {
  const recent = [];
  for (let e = 0; e < 20000; e += 16) {
    f(16);
    recent.push(m.progress);
    if (recent.length > 24) recent.shift();
    if (recent.length === 24 && Math.max(...recent) - Math.min(...recent) < SNAP_DEAD_P / 4) break;
  }
  return m.progress;
}

function scenarioSkip(m) {
  // Two touch gestures, the second 128 ms into the flight, then TWELVE
  // SECONDS of nothing at all. Any departure inside that window is the defect,
  // however long it waited first.
  const { f, fireAll } = swipeInto(m);
  const swipe = () => {
    fireAll('touchstart', [{ clientY: 780 }]);
    for (let i = 1; i <= 8; i++) {
      now += 16;
      fireAll('touchmove', [{ clientY: 780 - 560 * i / 8 }]);
      m.update(0.016);
    }
    fireAll('touchend', []);
  };
  m.setProgress(0); for (let i = 0; i < 25; i++) f(16);
  swipe();
  for (let i = 0; i < 8; i++) f(16);
  swipe();
  const rested = stillOn(m, f);
  for (let e = 0; e < 12000; e += 16) f(16);
  return { rested, after: m.progress, moved: Math.abs(m.progress - rested) > SNAP_DEAD_P };
}

function scenarioSwallow(m) {
  // One gesture; wait for the ride to actually STOP (not a fixed settle — a
  // fixed settle would run past the landing beat and let a mutant that holds
  // the wall on that clock score green); then a plainly deliberate 304 ms
  // pause, then a second gesture. It must buy a section.
  const { f, fireAll } = swipeInto(m);
  const swipe = () => {
    fireAll('touchstart', [{ clientY: 780 }]);
    for (let i = 1; i <= 8; i++) {
      now += 16;
      fireAll('touchmove', [{ clientY: 780 - 560 * i / 8 }]);
      m.update(0.016);
    }
    fireAll('touchend', []);
  };
  m.setProgress(0); for (let i = 0; i < 25; i++) f(16);
  swipe();
  const landed = stillOn(m, f);
  for (let i = 0; i < 19; i++) f(16);
  swipe();
  for (let e = 0; e < 8000; e += 16) f(16);
  return { landed, after: m.progress, advanced: Math.abs(m.progress - landed) > SNAP_DEAD_P };
}

/* THE KILLERS, AND WHAT WRITING THEM TAUGHT.
 *
 * The first attempt at MUT-EXEMPT restored ONLY the conjunct the fix changed
 * (`intent.g === gSerial &&` on the arrival wall) and scored GREEN — it did
 * not reproduce the defect. That is a finding, not a nuisance: the fix is
 * load-bearing in two places at once. With the queue gone, a mid-flight
 * gesture whose strength survives the landing has nowhere to spend it, because
 * `bracketAt` at an anchor returns the span that ENDS there — the "repeat
 * consumed as a no-op" the DEF-SKIP comment describes. Restoring the exemption
 * alone therefore produces a SWALLOW, not a skip. A faithful killer has to
 * reinstate the departure too, so these mutants do both.
 *
 * MUT-EXEMPT-SLOW exists because of the owner's own sentence. A longer delay
 * is not a fix, so a gate that only catches a PROMPT unattended departure
 * would pass the very thing that was shipped and rejected. It arms the same
 * leg but holds it for 2700 ms before departing — three times the landing
 * beat AS IT STOOD WHEN THIS MUTANT WAS WRITTEN, and longer than any beat
 * anybody has proposed — and L1 must still red. The beat itself
 * (`COMMIT_REST_BEAT_MS`) was retired outright on 2026-08-26, so the 2700 is
 * history rather than a derivation: it is deliberately a literal, for the same
 * reason MUT-WALL-2's 900 is, and the row below says so at its own site.
 *
 * MUT-WALL-2's first attempt scored green too, for its own instructive
 * reason: lengthening the arrival-wall idle boundary changes nothing, because
 * a 304 ms pause already exceeds SNAP_ENGAGE_MS and mints a fresh gesture,
 * which drops the wall on its own. The wall is genuinely hard to hold shut by
 * accident. So the mutant holds it deliberately, on the beat's own clock —
 * which is exactly the shape a "just make the hold longer" fix would take.
 */
const REARM = `
        const _mutDir = intent.g !== gSerial ? intent.dir : 0;
        fold(); intent = null; vel = 0;
        if (_mutDir) {
          const _i = RESOLVE_P.findIndex((a) => Math.abs(a - p) < 1e-6);
          const _j = _i + _mutDir;
          if (_i >= 0 && _j >= 0 && _j < RESOLVE_P.length) {
            _mutAsk = { at: nowF + MUT_DELAY, dir: _mutDir, i: _i, j: _j };
          }
        }`;

/* Consumed at the top of the resolution step's arming branch, which is where
   an ordinary departure from rest is armed too — so the mutant's leg travels
   through the real machinery rather than teleporting. */
const CONSUME = `      if (!intent && _mutAsk && nowF >= _mutAsk.at) {
        const _lo = Math.min(RESOLVE_P[_mutAsk.i], RESOLVE_P[_mutAsk.j]);
        const _hi = Math.max(RESOLVE_P[_mutAsk.i], RESOLVE_P[_mutAsk.j]);
        const _band = glideBand(_lo, _hi, _mutAsk.dir);
        intent = { target: RESOLVE_P[_mutAsk.j], lo: _lo, hi: _hi, dir: _mutAsk.dir,
          from: p, g: gSerial, band: _band, floorPx: 0, cruisePx: _band.nominal,
          snapK: brakeK(_band, _lo, _hi, _mutAsk.dir) };
        _mutAsk = null;
      }
      if (!intent) {`;

const exemptEdits = (delayMs) => [
  // the conjunct the fix changed, restored
  ['        if (Math.abs(intent.target - intent.from) > SNAP_DEAD_P) {\n'
   + '          gPeak = 0;\n'
   + '          answeredP = intent.target; answeredDir = intent.dir;\n'
   + '        }',
   '        if (intent.g === gSerial && Math.abs(intent.target - intent.from) > SNAP_DEAD_P) {\n'
   + '          gPeak = 0;\n'
   + '          answeredP = intent.target; answeredDir = intent.dir;\n'
   + '        }'],
  // the departure, restored
  ['  let intent = null;    // the latched resolution:',
   `  let _mutAsk = null; const MUT_DELAY = ${delayMs};\n`
   + '  let intent = null;    // the latched resolution:'],
  ['        fold(); intent = null; vel = 0;', REARM],
  ['      if (!intent) {\n        const [lo, hi] = bracketAt(p);', CONSUME + '\n        const [lo, hi] = bracketAt(p);'],
];

const MUTANTS = [
  ['NULL', 'a comment-only edit to the arrival block', false,
    [['ARRIVED. ONE GESTURE BUYS ONE TRANSITION', 'ARRIVED. (null control)']],
    'skip'],

  ['MUT-EXEMPT', 'THE SKIP SIDE — the landing exempts a gesture that did not arm the flight AND '
    + 'the departure it used to feed is restored: the journey leaves the rest by itself. L1 must red.',
    true, exemptEdits(0), 'skip'],

  ['MUT-EXEMPT-SLOW', 'THE SKIP SIDE, DELAYED — the same unattended departure, held for 2700 ms '
    + 'first (three times the beat as it stood when this mutant was written). "A longer delay is '
    + 'not a fix" is the owner\'s ruling; L1 must red on this too or it would pass what was '
    + 'already shipped and rejected.',
    true, exemptEdits(2700), 'skip'],

  ['MUT-WALL', 'THE SWALLOW SIDE (the dual) — the arrival wall is never dropped, so a gesture '
    + 'that plainly began after the landing buys nothing. L2 must red.',
    true,
    [['  function dropWall() { answeredP = null; answeredDir = 0; }',
      '  function dropWall() { /* MUT-WALL: refuses to release */ }']],
    'swallow'],

  /* THE HOLD IS A LITERAL SINCE 2026-08-26, AND THAT IS A FINDING RATHER THAN
     A CONVENIENCE. This mutant was written to hold the wall shut "for the
     landing beat", reading COMMIT_REST_BEAT_MS through `restBeatUntil`. The
     wrap-beat order then re-derived that constant on the wrap's own arithmetic
     and set it to 0, which made the mutation INERT: `restBeatUntil` was stamped
     at the landing frame and with a zero beat it had already expired by the
     next one, so the mutant stopped reddening L2 and would have gone quietly
     green — a killer keyed to a live constant dies when the constant reaches
     the value the law is protecting against. The 900 below is the value the
     owner shipped and then rejected, which is precisely what L2 has to keep
     refusing. Same treatment, and the same reason, as MUT-EXEMPT-SLOW's 2700.

     RE-ANCHORED 2026-08-26 when the beat was retired outright: the constant,
     its conjunct and `restBeatUntil` itself are gone from journey/scroll.js,
     so the offset needs a host that is not the mechanism under test. It takes
     the LANDING STAMP OF `answeredP` — the arrival wall's own moment, the one
     frame this mutant has always been measuring from — carried in a stamp the
     mutant declares and writes itself. The behaviour is byte-for-byte what it
     was: the wall refuses to drop until 900 ms after the delivering landing.
     Nothing in the mutation now reads a shipped constant, which is the whole
     lesson above applied a second time. */
  ['MUT-WALL-2', 'THE SWALLOW SIDE, SUBTLER — the wall is held shut for 900 ms past the landing '
    + '(the beat as shipped and rejected on 2026-08-26), which is what paying for L1 with a '
    + 'longer hold looks like from the other end. L2 must red.',
    true,
    [['  let intent = null;    // the latched resolution:',
      '  let _mutLandAt = -1e9; // MUT-WALL-2: the delivering landing\'s own frame\n'
      + '  let intent = null;    // the latched resolution:'],
      ['          answeredP = intent.target; answeredDir = intent.dir;',
        '          answeredP = intent.target; answeredDir = intent.dir; _mutLandAt = nowF;'],
      ['  function dropWall() { answeredP = null; answeredDir = 0; }',
        '  function dropWall() { if (performance.now() < _mutLandAt + 900) return; '
        + 'answeredP = null; answeredDir = 0; }']],
    'swallow'],
];

console.log('\n--- mutants: the NULL CONTROL runs first and must NOT fire ---\n');
let bad = 0;
for (const [id, why, shouldFire, edits, scenario] of MUTANTS) {
  let fired;
  try {
    fired = await withMutant(edits, (m) => {
      if (scenario !== 'skip') return !scenarioSwallow(m).advanced;
      /* L1 has TWO halves and the mutants must be scored against both, or a
         killer that reds only one of them looks like a dead mutant. A prompt
         unattended departure never lets the ride stop at the section the
         gesture bought at all (it rolls straight on and comes to rest a
         section further along), so `moved` alone misses it; a delayed one
         stops there and then leaves, which `moved` catches. Both are L1
         violations and both are scored here. */
      const r = scenarioSkip(m);
      return r.moved || Math.abs(r.rested - REST_STOPS[1]) > SNAP_DEAD_P;
    });
  } catch (err) {
    console.log(`  [FAULT] ${id} — ${err.message}`);
    bad++;
    continue;
  }
  const ok = fired === shouldFire;
  if (!ok) bad++;
  console.log(`  [${fired ? 'red' : 'green'}] ${id} ${ok ? 'OK ' : 'BAD'} — ${why}`);
}

if (bad) {
  console.log(`\nRest authority: ${bad} mutant(s) scored wrong — the gate is not red-capable`);
  process.exit(1);
}
console.log(`\nRest authority: PASS (${MUTANTS.filter((m) => m[2]).length} mutants red across BOTH `
  + 'sides — skip and swallow — null control green)');
process.exit(0);
