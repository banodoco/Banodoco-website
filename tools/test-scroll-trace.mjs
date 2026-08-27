// C01 — deterministic characterization traces for journey/scroll.js.
// Run with: node tools/test-scroll-trace.mjs   (add --emit-matrix <path> to
// write the trace matrix artifact).
//
// THIS IS A CHARACTERIZATION SUITE. Every expectation below records what the
// shipped model DOES today; none of it is a preference, and nothing here was
// chosen to make an outcome look right. Where the recorded behaviour looks
// wrong it is left exactly as it is and written up as an OBSERVATION in
// docs/code-health/evidence/2026-08-21-elegance-run-01/c01/README.md.
//
// It deliberately does NOT restate tools/scroll-touch-gates.mjs. That file
// PASSES and its cases are REVALIDATE inputs: the touch swipe battery, the
// four wheel momentum-tail shapes, the cold-boot touch bridge, the Connect
// second-gesture floor and the Connect landing budget all live there. What is
// here is the layer underneath them — raw sample vs semantic decision, the
// event/rAF permutation matrix, the gesture-identity boundaries at their
// exact constants, cancellation, landing, and the invariants those gates
// depend on but never state.
//
// DELIVERY CADENCE. A browser delivers a coalesced wheel event and then a
// rAF, over and over; `pulse()` below is that cadence and is the default.
// A bare `wheel()` with no frame after it is a real permutation and is used
// deliberately (Area B), but note what it means to the model: the idle clock
// stops while the main thread is blocked, and "no rAF ran" is indistinguishable
// from "a frame overran", so an input gap with no frame inside it is
// discounted down to STALL_FRAME_MS. That is characterized in C7, not
// worked around.

import { writeFileSync } from 'node:fs';
import {
  ARRIVAL_HOLD_MS, SNAP_ENGAGE_MS, STALL_FRAME_MS, SNAP_DEAD_P,
  COMMIT_STREAM_MIN, COMMIT_STREAM_GAP_MS, KEY_STEP_PX, WHEEL_LINE_PX,
  TOUCH_GAIN, MAX_SCRUB_RATE,
} from '../journey/constants.js';
import { REST_STOPS, TERMINAL_P } from '../journey/route.js';
import {
  createRig, createLedger, claimInput, releaseInput, dispatch, env, SURFACE,
} from './test-c01-harness.mjs';

const L = createLedger('scroll trace');
const matrix = [];
const emitAt = process.argv.indexOf('--emit-matrix');

/** Record one named trace into the matrix artifact and hand it back. */
function capture(id, purpose, rig) {
  const rows = rig.trace.map((t) => ({ ...t }));
  matrix.push({ id, purpose, steps: rows });
  return rows;
}
const decisionsOf = (rows) => rows.map((r) => r.decisions);
const flat = (rows) => rows.flatMap((r) => r.decisions.map((d) => `${r.id}:${d}`));

/** One delivered wheel sample followed by the frame that renders it — the
 *  cadence a browser actually produces for a non-passive wheel listener. */
const pulse = (rig, deltaY, gap = 16) => { rig.wheel(deltaY, gap); rig.frame(gap); };

/** Flick until a rest is ANSWERED, keeping the input alive all the way in so
 *  the wall is raised with a hot input clock — exactly the situation a real
 *  momentum tail arrives into. Leaves sinceInput === 16 ms. */
function landHot(rig, from = 0, { delta = 120, tail = 18 } = {}) {
  rig.stop();
  rig.reset(from);
  for (let i = 0; i < 10; i++) pulse(rig, delta);
  for (let i = 0; i < 500 && rig.scroll.answeredAt === null; i++) pulse(rig, tail);
  return rig.scroll.answeredAt;
}

/** Advance the input clock to exactly `gapMs` since the last delivered sample
 *  WITHOUT ever starving rAF, then deliver `emit(finalGap)`. Frames of 16 ms
 *  keep every interval inside STALL_FRAME_MS, so nothing is discounted and the
 *  boundary under test is the one the constant names. */
function idleThenSample(rig, gapMs, emit) {
  const remaining = gapMs - rig.scroll.sinceInput;
  const frames = Math.max(0, Math.ceil((remaining - 18) / 16));
  for (let i = 0; i < frames; i++) rig.frame(16);
  emit(gapMs - rig.scroll.sinceInput);
}

/* ==================================================================
   AREA A — RAW SAMPLE vs SEMANTIC DECISION
   Every decision cites the sample or frame that produced it, and a
   sample producing NO decision is asserted as such.
   ================================================================== */
{
  const rig = createRig();

  // A1. A lone wheel notch at a rest: it sets travel direction and nothing
  // else. No intent, no wall, no stream — and the two frames after it decide
  // nothing at all, they only integrate.
  rig.reset(0);
  rig.record();
  rig.wheel(110, 120);
  rig.frame(16);
  rig.frame(16);
  const a1 = capture('A1', 'lone wheel notch at the Mission rest', rig);
  L.same('A', 'A1 lone notch: decisions per step', decisionsOf(a1),
    [['dir=1'], [], []]);
  L.check('A', 'A1 lone notch is not a stream', rig.scroll.streaming === false,
    rig.scroll.streaming);
  L.near('A', 'A1 lone notch settles back at the rest', rig.settle(6000).p, 0, 1e-6);

  // A2. Four stream deltas: the stream is recognised on sample 4 (exactly
  // COMMIT_STREAM_MIN), and the resolution is armed on the FRAME that follows.
  // No sample ever arms a resolution — that authority is update()'s alone.
  rig.stop(); rig.reset(0); rig.record();
  for (let i = 0; i < 4; i++) rig.wheel(120, 16);
  rig.frame(16);
  const a2 = capture('A2', 'four-delta wheel stream: sample vs frame authority', rig);
  L.same('A', 'A2 stream: decisions per step', decisionsOf(a2),
    [['dir=1'], [], [], ['stream.on'], ['intent.arm->0.26']]);
  L.check('A', 'A2 the arm decision belongs to a FRAME, not a sample',
    a2[4].id.startsWith('F') && a2[4].decisions.includes('intent.arm->0.26'), a2[4].id);
  L.check('A', 'A2 the stream decision belongs to the 4th SAMPLE',
    a2[3].id === 'S4' && a2[3].decisions.includes('stream.on'), a2[3].id);
  L.check('A', 'A2 an armed resolution is not yet GLIDING: the finger still wins',
    rig.scroll.resolving === true && rig.scroll.gliding === false,
    `${rig.scroll.resolving}/${rig.scroll.gliding}`);
  rig.settle(12000);

  // A3. A wheel event with deltaY === 0 still counts toward the stream shape:
  // gCount and gapEma advance, but no direction, no motion, no strength.
  // (OBSERVATION O-1 — see the C01 README.)
  rig.stop(); rig.reset(0); rig.record();
  for (let i = 0; i < 4; i++) rig.wheel(0, 16);
  const a3 = capture('A3', 'zero-deltaY wheel samples: shape credit without motion', rig);
  L.same('A', 'A3 zero-delta samples: only the 4th decides anything',
    decisionsOf(a3), [[], [], [], ['stream.on']]);
  L.check('A', 'A3 zero-delta samples move nothing and earn no strength',
    rig.scroll.progress === 0 && rig.scroll.surface === 0
      && rig.scroll.gesturePeak === 0 && rig.scroll.lastDir === 0,
    `${rig.scroll.surface}/${rig.scroll.gesturePeak}`);

  // A4. ...and that shape credit is spendable. With travel direction already
  // established, three zero-delta samples let a gesture cross a rest on its
  // SECOND real delta, where four real deltas are otherwise required.
  rig.stop(); rig.reset(0);
  pulse(rig, 120);
  for (let i = 0; i < 3; i++) pulse(rig, 0);
  pulse(rig, 400);
  L.near('A', 'A4 zero-delta padding lets two real deltas buy a rest',
    rig.settle(12000).p, REST_STOPS[1]);
  rig.stop(); rig.reset(0);
  pulse(rig, 120);
  pulse(rig, 400);
  L.near('A', 'A4 control: the same two real deltas alone buy nothing',
    rig.settle(12000).p, 0, 1e-5);

  // A5. A frame with dt <= 0 returns the displayed position and decides
  // nothing. The early return precedes the frame-epoch write, so it does not
  // refresh the stall clock either.
  rig.stop(); rig.reset(0.26);
  L.check('A', 'A5 update(0) returns p and decides nothing',
    rig.scroll.update(0) === rig.scroll.progress && rig.scroll.resolving === false,
    rig.scroll.update(0));
  L.check('A', 'A5 update(-1) returns p unchanged',
    rig.scroll.update(-1) === rig.scroll.progress, rig.scroll.update(-1));

  // A6. A disabled model consumes nothing at all.
  rig.scroll.enabled = false;
  const beforeP = rig.scroll.progress;
  const beforeSurface = rig.scroll.surface;
  rig.wheel(600, 16);
  rig.touchStart(700); rig.touchMove(200); rig.touchEnd();
  rig.key('ArrowDown', { gap: 400 });
  L.check('A', 'A6 disabled: update() returns null and every input is inert',
    rig.scroll.update(0.016) === null && rig.scroll.progress === beforeP
      && rig.scroll.surface === beforeSurface,
    String(rig.scroll.update(0.016)));
  rig.scroll.enabled = true;
}

/* ==================================================================
   AREA B — EVENT / rAF PERMUTATIONS
   ================================================================== */
{
  // B1. Several events inside ONE frame vs the same events one-per-frame.
  // The surface is the exact running sum either way, and one rest is bought
  // either way — the delivery packing is not part of the decision.
  const packed = createRig();
  packed.reset(0);
  for (let i = 0; i < 6; i++) packed.wheel(120, 16);
  const packedSurface = packed.scroll.surface;
  const packedP = packed.settle(12000).p;

  const spread = createRig();
  spread.reset(0);
  for (let i = 0; i < 6; i++) pulse(spread, 120);
  const spreadSurface = spread.scroll.surface;
  const spreadP = spread.settle(12000).p;

  L.near('B', 'B1 six events in one frame vs one-per-frame: same surface',
    packedSurface, spreadSurface, 1e-9);
  L.near('B', 'B1 six events in one frame buy exactly Inspire', packedP, REST_STOPS[1]);
  L.near('B', 'B1 six events one-per-frame buy exactly Inspire', spreadP, REST_STOPS[1]);

  // B2. ONE big event across many frames. The sample decides direction and
  // nothing else; a lone sample is never a stream, so it is judged purely by
  // POSITION — and the servo's own lag means the displayed position has not
  // reached COMMIT_THRESHOLD of the span by the time the gesture times out.
  // The 2400 px sample therefore resolves BACKWARD, to the rest it left.
  const rig = createRig();
  rig.reset(0);
  rig.record();
  rig.wheel(2400, 16);
  for (let i = 0; i < 4; i++) rig.frame(16);
  const b2 = capture('B2', 'one sample, many frames: the servo lag decides it', rig);
  L.same('B', 'B2 a lone sample decides direction and nothing else',
    decisionsOf(b2), [['dir=1'], [], [], [], []]);
  L.check('B', 'B2 a single sample is never a stream',
    rig.scroll.streaming === false, rig.scroll.streaming);
  L.near('B', 'B2 one 2400 px sample is judged by position and returns home',
    rig.settle(12000).p, 0, 1e-5);

  // B3. Events with NO frame between them: nothing is resolved until a frame
  // runs, because every resolution decision lives in update().
  const noframe = createRig();
  noframe.reset(0);
  noframe.record();
  for (let i = 0; i < 8; i++) noframe.wheel(240, 16);
  const b3 = capture('B3', 'eight samples, no frame between any of them', noframe);
  L.check('B', 'B3 samples alone never arm a resolution',
    noframe.scroll.resolving === false, noframe.scroll.resolving);
  L.check('B', 'B3 the picture has not moved while no frame has run',
    noframe.scroll.progress === 0 && noframe.scroll.surface > 0.04,
    `${noframe.scroll.progress}/${noframe.scroll.surface.toFixed(4)}`);
  L.same('B', 'B3 the only sample-side decisions are direction and stream',
    flat(b3), ['S1:dir=1', 'S4:stream.on']);
  L.near('B', 'B3 eight starved samples still buy exactly one rest',
    noframe.settle(14000).p, REST_STOPS[1]);

  // B4. A frame with no events, at the one anchor where the model is exactly
  // at rest (p = 0, v = 0): five empty frames decide nothing and the position
  // is bit-stable.
  const quiet = createRig();
  quiet.reset(0);
  quiet.settle(3000);
  quiet.record();
  for (let i = 0; i < 5; i++) quiet.frame(16);
  const b4 = capture('B4', 'frames with no events at the Mission anchor', quiet);
  L.same('B', 'B4 five empty frames at p = 0 decide nothing',
    decisionsOf(b4), [[], [], [], [], []]);
  L.check('B', 'B4 ...and the position is bit-stable',
    quiet.scroll.progress === 0, quiet.scroll.progress);

  // B5. At EVERY OTHER anchor the same five empty frames are not quiet at all.
  // scrollFor() is a sampled inverse, so a settled rest sits a round-trip
  // artefact away from its own anchor; the position rule re-arms a
  // sub-SNAP_DEAD_P resolution that lands inside the same frame, and `gliding`
  // — which is NOT QA-only, chapters read it to gate camera-paced reveals —
  // alternates every frame, indefinitely. (OBSERVATION O-2.)
  const dither = [];
  for (const anchor of [...REST_STOPS.slice(1), TERMINAL_P]) {
    const r = createRig();
    r.reset(anchor);
    r.settle(2000);
    const ps = []; const gl = [];
    for (let i = 0; i < 60; i++) { r.frame(16); ps.push(r.scroll.progress); gl.push(r.scroll.gliding); }
    dither.push({
      anchor,
      span: +(Math.max(...ps) - Math.min(...ps)).toExponential(3),
      flips: gl.filter((v, i) => i && v !== gl[i - 1]).length,
    });
  }
  matrix.push({ id: 'B5', purpose: 'settled-rest dither and gliding flap', steps: dither });
  // QA-02 P1: the expected side used to be `dither.map(() => 59)` — its
  // arity was derived from `dither` itself (the actual side), so cutting
  // the anchor set to 0 elements would still pass ([] === []). The anchor
  // set is REST_STOPS.slice(1) (4 anchors) plus TERMINAL_P (1 anchor) = 5;
  // pinned as a literal so the count itself is asserted, not assumed.
  L.same('B', 'B5 every anchor above p = 0 flaps `gliding` on every frame',
    dither.map((d) => d.flips), [59, 59, 59, 59, 59], { dither });
  L.check('B', 'B5 ...including p = 1, where the position itself is bit-exact',
    dither.at(-1).anchor === TERMINAL_P && dither.at(-1).span < 1e-12,
    dither.at(-1).span);
}

/* ==================================================================
   AREA C — MOMENTUM TAILS AND THE GESTURE-IDENTITY BOUNDARIES
   Extends tools/scroll-touch-gates.mjs by pinning the boundaries to
   their exact constants rather than sampling shapes around them.
   ================================================================== */
{
  const rig = createRig();

  // C1. WHEEL needs the FULL gesture timeout at an answered wall: a coalesced
  // momentum tail can itself contain an ARRIVAL_HOLD_MS pause, so timing alone
  // may not prove a second physical ask. 160 ms holds; 161 ms releases.
  for (const [gap, expectDrop] of [[SNAP_ENGAGE_MS, false], [SNAP_ENGAGE_MS + 1, true]]) {
    const raised = landHot(rig);
    idleThenSample(rig, gap, (g) => rig.wheel(120, g));
    L.check('C', `C1 wheel wall at gapMs=${gap}: released=${expectDrop}`,
      raised === REST_STOPS[1] && (rig.scroll.answeredAt === null) === expectDrop,
      `answered=${rig.scroll.answeredAt}`);
  }

  // C2. A KEY sample is a discrete ask, so ARRIVAL_HOLD_MS is enough for it.
  // 90 ms holds; 91 ms releases. This is the split dropWall() exists to make.
  for (const [gap, expectDrop] of [[ARRIVAL_HOLD_MS, false], [ARRIVAL_HOLD_MS + 1, true]]) {
    const raised = landHot(rig);
    idleThenSample(rig, gap, (g) => rig.key('ArrowDown', { gap: g }));
    L.check('C', `C2 key wall at gapMs=${gap}: released=${expectDrop}`,
      raised === REST_STOPS[1] && (rig.scroll.answeredAt === null) === expectDrop,
      `answered=${rig.scroll.answeredAt}`);
  }

  // C3. A monotonically decaying tail never proves a second ask, however many
  // samples arrive: the wheel-pulse shape test needs a quiet beat AND a rise
  // in both the rate and the raw delta.
  landHot(rig);
  rig.record();
  for (const d of [90, 70, 55, 40, 30, 22, 16, 12, 9, 6, 4, 3]) pulse(rig, d);
  const c3 = capture('C3', 'twelve decaying tail samples against an answered wall', rig);
  L.same('C', 'C3 a monotonically decaying tail decides nothing at all',
    flat(c3), []);
  L.near('C', 'C3 the decaying tail buys no second rest',
    rig.settle(14000).p, REST_STOPS[1]);

  // C4. A tail that REVERSES sign is a new gesture on the spot: a reversal is
  // one of dropWall()'s three releases and needs no pause at all.
  landHot(rig);
  rig.record();
  rig.wheel(-40, 16);
  const c4 = capture('C4', 'sign reversal inside the momentum tail', rig);
  L.check('C', 'C4 a reversal drops the wall with no pause',
    c4[0].decisions.includes('wall.drop') && c4[0].decisions.includes('dir=-1'),
    JSON.stringify(c4[0].decisions));

  // C5. A wheel sample delivered after a 300 ms site-owned frame overrun is
  // NOT a new gesture. (scroll-touch-gates.mjs asserts the RATE is not
  // fabricated; this asserts the GESTURE IDENTITY underneath it survives.)
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 4; i++) pulse(rig, 120);
  const streamingBeforeStall = rig.scroll.streaming;
  rig.frameCapped(300, 50);
  rig.wheel(120, 4);
  L.check('C', 'C5 a 300 ms site-owned overrun does not retire the gesture',
    streamingBeforeStall === true && rig.scroll.streaming === true,
    rig.scroll.streaming);

  // C6. ...and while the tab is HIDDEN nothing is forgiven: a suspended tab
  // is genuine gesture idle, and duration alone cannot tell the two apart.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 4; i++) pulse(rig, 120);
  env.hidden = true;
  rig.frameCapped(300, 0.05);
  env.hidden = false;
  rig.wheel(120, 4);
  L.check('C', 'C6 the same 300 ms while hidden DOES retire the gesture',
    rig.scroll.streaming === false, rig.scroll.streaming);

  // C7. THE COST OF THE DISCOUNT, characterized rather than worked around:
  // "no rAF ran" is indistinguishable from "a frame overran", so an input gap
  // with no frame inside it is discounted down to STALL_FRAME_MS. A 400 ms
  // pause between two starved samples is read as a 34 ms one, and the gesture
  // is not retired. With a frame supplying the idle, the same pause retires it.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 4; i++) pulse(rig, 120);
  rig.wheel(120, 400);
  const starved = rig.scroll.streaming;
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 4; i++) pulse(rig, 120);
  idleThenSample(rig, 400, (g) => rig.wheel(120, g));
  const rendered = rig.scroll.streaming;
  L.same('C', 'C7 a starved 400 ms gap is discounted; a rendered one is not',
    [starved, rendered], [true, false]);

  // C8. The stream test itself: COMMIT_STREAM_MIN samples at or under
  // COMMIT_STREAM_GAP_MS mean spacing. One sample either side of each bound.
  // The spacing is delivered through idleThenSample so that rAF keeps up and
  // the discount characterized in C7 contributes exactly nothing — otherwise
  // the cadence under test is not the cadence the model measures.
  const streamAt = (count, gap) => {
    const r = createRig();
    r.reset(0);
    pulse(r, 120, 16);
    for (let i = 1; i < count; i++) {
      idleThenSample(r, gap, (g) => r.wheel(120, g));
      r.frame(16);
    }
    return r.scroll.streaming;
  };
  L.same('C', 'C8 the stream gate is exactly COMMIT_STREAM_MIN x COMMIT_STREAM_GAP_MS',
    [streamAt(COMMIT_STREAM_MIN - 1, 16), streamAt(COMMIT_STREAM_MIN, 16),
      streamAt(8, COMMIT_STREAM_GAP_MS), streamAt(8, COMMIT_STREAM_GAP_MS + 20)],
    [false, true, true, false]);
}

/* ==================================================================
   AREA D — ONE GESTURE ANSWERS AT MOST ONE NEW REST
   The load-bearing invariant of the whole program.
   ================================================================== */
{
  const rig = createRig();

  // D1. A hard wheel flick from the Mission rest lands on Inspire and stops.
  rig.reset(0);
  for (let i = 0; i < 18; i++) pulse(rig, 240);
  L.near('D', 'D1 an 18x240 px wheel flick buys exactly Inspire',
    rig.settle(16000).p, REST_STOPS[1]);

  // D2/D3. Deliberate pulses, each separated by more than the gesture timeout,
  // answer one rest EACH. The rule caps a gesture, not a visitor.
  const pulses = [];
  rig.stop(); rig.reset(0);
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 8; i++) pulse(rig, 160);
    rig.settle(5000);
    pulses.push(+rig.scroll.progress.toFixed(6));
  }
  L.near('D', 'D2 pulse 1 answers Inspire', pulses[0], REST_STOPS[1]);
  L.near('D', 'D2 pulse 2 answers Connect', pulses[1], REST_STOPS[2]);
  L.near('D', 'D3 pulse 3 answers Owned', pulses[2], REST_STOPS[3]);

  // D4. A single UNBROKEN stream buys exactly one rest however long it runs.
  // 120 samples of 240 px at 8 ms — 28,800 px, four times the whole span —
  // still stops at Inspire, because the answered wall clamps the SURFACE and
  // the tail has nothing left to move.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 120; i++) pulse(rig, 240, 8);
  L.near('D', 'D4 a 120-sample unbroken stream still buys exactly one rest',
    rig.settle(20000).p, REST_STOPS[1]);

  // D5. That is the mechanism: while answeredAt is non-null the surface itself
  // is clamped at the anchor, so there is nothing banked to jump when the wall
  // comes down.
  landHot(rig);
  const wallAt = rig.scroll.answeredAt;
  for (let i = 0; i < 6; i++) pulse(rig, 200);
  L.check('D', 'D5 the answered wall clamps the SURFACE, not just the picture',
    wallAt === REST_STOPS[1] && rig.scroll.surface <= wallAt + 1e-9
      && rig.scroll.progress <= wallAt + 1e-9,
    `surface=${rig.scroll.surface.toFixed(9)}`);

  // D6. answeredAt can legitimately be 0 (the Mission anchor). Every reader
  // must test it against null, never for truthiness — journey.js's
  // stepCamBlend is one such reader.
  rig.stop(); rig.reset(REST_STOPS[1]);
  for (let i = 0; i < 12; i++) pulse(rig, -160);
  rig.settle(16000);
  L.check('D', 'D6 answeredAt is 0 at the Mission anchor, never falsy-as-absent',
    rig.scroll.answeredAt === 0 && Math.abs(rig.scroll.progress) < 1e-6,
    `answered=${rig.scroll.answeredAt}`);

  // D7. Backward is the same one-rest rule, at the same strength: the gesture
  // is measured in surface px so one finger reads identically both ways.
  rig.stop(); rig.reset(REST_STOPS[3]);
  for (let i = 0; i < 18; i++) pulse(rig, -240);
  L.near('D', 'D7 an 18x240 px backward flick buys exactly one rest',
    rig.settle(16000).p, REST_STOPS[2]);
}

/* ==================================================================
   AREA E — LONG FRAMES AND BACKGROUND RESUME
   ================================================================== */
{
  const rig = createRig();

  // E1. A single very long frame integrates at the model's own rate ceiling.
  rig.reset(0);
  for (let i = 0; i < 10; i++) pulse(rig, 400);
  rig.frame(400);
  L.check('E', 'E1 a 400 ms frame cannot exceed MAX_SCRUB_RATE',
    Math.abs(rig.scroll.rate) <= MAX_SCRUB_RATE + 1e-12, rig.scroll.rate);
  L.near('E', 'E1 ...and one long frame still buys exactly one rest',
    rig.settle(16000).p, REST_STOPS[1]);

  // E2. A hidden tab: visibilitychange latches a background gap, and the NEXT
  // input is unconditionally a fresh gesture, however short its own gap.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 6; i++) pulse(rig, 160);
  const streamingBefore = rig.scroll.streaming;
  rig.visibilityChange(true);
  rig.visibilityChange(false);
  rig.record();
  rig.wheel(160, 8);
  const e2 = capture('E2', 'resume from a hidden tab', rig);
  L.check('E', 'E2 a background resume retires the gesture on the next sample',
    streamingBefore === true && rig.scroll.streaming === false,
    JSON.stringify(e2[0].decisions));

  // E3. ...and the latch survives frames: a background gap is consumed by the
  // next INPUT, not by the next render.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 6; i++) pulse(rig, 160);
  rig.visibilityChange(true);
  rig.visibilityChange(false);
  for (let i = 0; i < 5; i++) rig.frame(16);
  rig.wheel(160, 8);
  L.check('E', 'E3 the background latch is consumed by input, not by a frame',
    rig.scroll.streaming === false, rig.scroll.streaming);

  // E4. A long frame with a CAPPED dt — the site animator's real behaviour —
  // still advances the wall clock, and the whole overrun is discounted.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 6; i++) pulse(rig, 160);
  rig.frameCapped(1000, 0.05);
  rig.wheel(160, 16);
  L.check('E', 'E4 a 1000 ms visible overrun is fully discounted',
    rig.scroll.streaming === true, rig.scroll.streaming);

  // E5. A long frame cannot make the model overshoot its anchor either: the
  // integrator is position-capped at the target whatever dt was.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 12; i++) pulse(rig, 300);
  let worst = -Infinity;
  for (let i = 0; i < 40; i++) {
    rig.frame(200);
    worst = Math.max(worst, rig.scroll.progress - REST_STOPS[1]);
    if (rig.scroll.answeredAt !== null) break;
  }
  L.check('E', 'E5 200 ms frames still cannot overshoot the anchor', worst <= 0, worst);

  // E6. A viewport resize MID-GLIDE re-measures the whole road (every
  // allocation is vh) and re-seats the surface at the same p. The latched
  // resolution keeps its target, because targets are in p and only the road
  // under them changed — and the landing is still exact and overshoot-free.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 10; i++) pulse(rig, 160);
  for (let i = 0; i < 20; i++) rig.frame(16);
  const beforeResize = { p: rig.scroll.progress, target: rig.scroll.resolveTarget,
    total: rig.scroll.total };
  env.innerHeight = 600;
  dispatch('resize', {});
  const afterResize = { p: rig.scroll.progress, target: rig.scroll.resolveTarget,
    total: rig.scroll.total };
  let resizeOvershoot = -Infinity;
  for (let i = 0; i < 900; i++) {
    rig.frame(16);
    resizeOvershoot = Math.max(resizeOvershoot, rig.scroll.progress - REST_STOPS[1]);
    if (rig.scroll.answeredAt !== null) break;
  }
  env.innerHeight = 932;
  dispatch('resize', {});
  L.check('E', 'E6 a resize mid-glide keeps p and the target, and still lands exactly',
    beforeResize.target === REST_STOPS[1] && afterResize.target === REST_STOPS[1]
      && afterResize.p === beforeResize.p && afterResize.total < beforeResize.total
      && resizeOvershoot <= 0 && rig.scroll.progress === REST_STOPS[1],
    `${beforeResize.total.toFixed(1)}->${afterResize.total.toFixed(1)}`);
}

/* ==================================================================
   AREA F — REVERSAL, RAPID REPEAT, TOUCH CONTACTS, BOOT REPLAY
   ================================================================== */
{
  const rig = createRig();

  // F1. Reversal mid-gesture retires the abandoned half's strength on the
  // sample that turns, and drops any latched resolution in the same step.
  rig.reset(0);
  for (let i = 0; i < 6; i++) pulse(rig, 160);
  const armed = rig.scroll.resolving;
  rig.record();
  rig.wheel(-160, 16);
  const f1 = capture('F1', 'reversal against a latched resolution', rig);
  L.check('F', 'F1 a reversal releases the intent and the strength together',
    armed === true && f1[0].decisions.includes('intent.release')
      && f1[0].decisions.includes('dir=-1') && rig.scroll.gesturePeak === 0,
    JSON.stringify(f1[0].decisions));

  // F2. A SAME-direction second gesture arriving mid-flight does NOT release
  // the resolution — and does NOT retarget it either (DEF-SKIP, 2026-08-23:
  // the mid-flight retarget was the owner's "keeps scrolling through
  // sections"). It books the FOLLOWING transition behind the landing: the
  // flight still lands on the rest it was going to, and the queued leg then
  // departs from it, so the repeat is never a dead gesture and never an
  // overflown rest.
  rig.stop(); rig.reset(REST_STOPS[1]);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  for (let i = 0; i < 40; i++) rig.frame(16);
  const midTarget = rig.scroll.resolveTarget;
  rig.record();
  for (let i = 0; i < 8; i++) pulse(rig, 140);
  const f2 = capture('F2', 'same-direction repeat queues behind a flight in progress', rig);
  L.check('F', 'F2 a same-direction repeat neither releases nor retargets the flight',
    midTarget === REST_STOPS[2]
      && rig.scroll.resolveTarget === REST_STOPS[2]
      && !flat(f2).find((d) => d.includes('intent.retarget'))
      && !flat(f2).includes('intent.release'),
    JSON.stringify(flat(f2)));
  /* ...AND THE RIDE STOPS THERE (owner report #26, 2026-08-26; WAS
     REST_STOPS[3], the queued leg's destination). The repeat used to be
     latched behind the landing and delivered as a leg that left the rest by
     itself after a timed beat; the owner ruled that a gesture which
     began mid-flight is not a request for another section, at any delay, so
     there is no queue and nothing departs. The two checks above are unchanged
     and still assert the older half of the law — the repeat may not release
     or retarget the flight. */
  L.near('F', 'F2 ...and the ride STOPS on that anchor, unattended',
    rig.settle(16000).p, REST_STOPS[2]);
  /* The partner that stops this row going green over a wall: the same repeat,
     delivered once the ride has stopped, must still buy the next section. */
  rig.stop(); rig.reset(REST_STOPS[1]);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  const f2Landed = rig.settle(6000).p;
  rig.settle(304);
  for (let i = 0; i < 8; i++) pulse(rig, 140);
  L.check('F', 'F2 ...but the SAME repeat after the landing still buys the next',
    Math.abs(f2Landed - REST_STOPS[2]) < 2e-3
      && Math.abs(rig.settle(16000).p - REST_STOPS[3]) < 2e-3,
    `${f2Landed.toFixed(5)} -> ${rig.scroll.progress.toFixed(5)}`);

  // F3. Touch: a second finger is a pinch and never feeds the ride.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const restSurface = rig.scroll.surface;
  rig.touchStart(780);
  rig.touchMove(400, 16, { touches: [{ clientY: 400 }, { clientY: 500 }] });
  rig.touchEnd();
  L.check('F', 'F3 a two-finger touchmove leaks no delta into the ride',
    rig.scroll.surface === restSurface && rig.scroll.lastDir === 0,
    rig.scroll.surface);

  // F4. ...and a contact that BEGINS with two fingers never establishes a
  // touchY at all, so the pinch cannot become travel when a finger lifts.
  rig.stop(); rig.reset(REST_STOPS[1]);
  rig.touchStart(780, { touches: [{ clientY: 780 }, { clientY: 700 }] });
  rig.touchMove(300);
  rig.touchEnd();
  L.near('F', 'F4 a two-finger contact never becomes travel',
    rig.scroll.surface, REST_STOPS[1], 1e-4);

  // F5. Ownership is decided ONCE, at touchstart: a drag that begins inside a
  // registered owner stays the owner's even after the finger leaves it.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const sheet = { nodeType: 1, isConnected: true, contains: (n) => n === sheet };
  claimInput(sheet);
  rig.touchStart(780, { target: sheet });
  rig.touchMove(600, 16, { target: SURFACE });
  rig.touchMove(300, 16, { target: SURFACE });
  rig.touchEnd();
  releaseInput(sheet);
  L.near('F', 'F5 an owned drag stays owned after the finger leaves the element',
    rig.scroll.surface, REST_STOPS[1], 1e-4);

  // F6. TOUCH_GAIN is applied to the raw pixel displacement, exactly once.
  rig.stop(); rig.reset(0);
  rig.touchStart(500);
  rig.touchMove(400, 16);
  const oneMovePx = rig.scroll.scrollFor(rig.scroll.surface);
  rig.touchEnd();
  L.near('F', 'F6 one 100 px touchmove applies exactly TOUCH_GAIN',
    oneMovePx, 100 * TOUCH_GAIN, 0.02);

  // F7. deltaMode conversion, both branches.
  rig.stop(); rig.reset(0);
  rig.wheel(3, 16, { deltaMode: 1 });
  const linePx = rig.scroll.scrollFor(rig.scroll.surface);
  rig.stop(); rig.reset(0);
  rig.wheel(0.25, 16, { deltaMode: 2 });
  const pagePx = rig.scroll.scrollFor(rig.scroll.surface);
  L.near('F', 'F7 deltaMode 1 is lines x WHEEL_LINE_PX', linePx, 3 * WHEEL_LINE_PX, 0.02);
  L.near('F', 'F7 deltaMode 2 is pages x innerHeight', pagePx, 0.25 * env.innerHeight, 0.02);

  // F8. Boot replay: primeBootWheel arms the one-transition guard, names its
  // reason, and the FIRST landing is what releases it.
  rig.stop(); rig.reset(0);
  rig.scroll.primeBootWheel(100);
  const armedGuard = rig.scroll.bootGuardState;
  for (const d of [100, 70, 35, 12, 8, 3]) pulse(rig, d);
  rig.settle(16000);
  const landedGuard = rig.scroll.bootGuardState;
  L.check('F', 'F8 the boot guard arms, names itself, and retires at the landing',
    armedGuard.active === true && armedGuard.reason === 'armed' && armedGuard.dir === 1
      && landedGuard.active === false && landedGuard.reason === 'landing',
    `${armedGuard.reason}->${landedGuard.reason}`);
  L.near('F', 'F8 ...and the boot-primed gesture buys exactly one rest',
    rig.scroll.progress, REST_STOPS[1]);

  // F9. Every documented boot-guard release reason is reachable and named.
  // 'reprime' clears and immediately re-arms inside one call, so the state a
  // reader observes after it is 'armed' — recorded as it is.
  const reach = (fn) => {
    rig.stop(); rig.reset(0);
    rig.scroll.primeBootWheel(100);
    fn();
    return rig.scroll.bootGuardState.reason;
  };
  L.same('F', 'F9 every boot-guard release reason is reachable and named',
    [
      reach(() => rig.wheel(-100, 16)),
      reach(() => rig.key('End')),
      reach(() => rig.scroll.setProgress(0.5)),
      reach(() => { rig.visibilityChange(true); rig.visibilityChange(false); rig.wheel(100, 16); }),
      reach(() => rig.scroll.primeBootWheel(100)),
    ],
    ['reversal', 'jump', 'placement', 'background', 'armed']);

  // F10. primeBootWheelStream / primeBootTouch reject malformed input rather
  // than inventing a gesture.
  rig.stop(); rig.reset(0);
  L.check('F', 'F10 primeBootWheelStream refuses an empty or non-array replay',
    rig.scroll.primeBootWheelStream([]) === false
      && rig.scroll.primeBootWheelStream(null) === false, 'false/false');
  L.check('F', 'F10 primeBootTouch refuses a non-finite or reversed contact',
    rig.scroll.primeBootTouch({ startY: NaN, latestY: 1, startedAt: 0, latestAt: 1, active: false }) === false
      && rig.scroll.primeBootTouch({ startY: 1, latestY: 2, startedAt: 5, latestAt: 1, active: false }) === false
      && rig.scroll.primeBootTouch(null) === false, 'false/false/false');

  // F11. A held key auto-repeats as DISCRETE STEPS: the repeat flag zeroes the
  // peak and the EMA, so the OS repeat clock cannot become a fling.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 12; i++) { rig.key('ArrowDown', { gap: 32, repeat: true }); rig.frame(32); }
  L.check('F', 'F11 a held-key repeat earns no flick strength',
    rig.scroll.gesturePeak === 0, rig.scroll.gesturePeak);
  L.near('F', 'F11 ...so a held key travels by position only',
    rig.settle(16000).p, 0, 1e-5);

  // F13. primeBootWheelStream replays the captured stream in order. The
  // samples carry a delta and a deltaMode and NOTHING ELSE — no timestamps —
  // and the whole replay runs inside one synchronous call, so every sample
  // after the first has gapMs === 0. The consequence is exact and deliberate:
  // the replay contributes DISTANCE and EVENT COUNT, never rate and never
  // spacing, so `gesturePeak` and `gapEma` both stay zero and a replayed boot
  // stream is judged PURELY BY POSITION. Strength arrives with the first
  // genuinely delivered post-boot sample, which is what the cold-boot cases in
  // tools/scroll-touch-gates.mjs exercise.
  rig.stop(); rig.reset(0);
  const stream = (deltas) => deltas.map((deltaY) => ({ deltaY, deltaMode: 0 }));
  const replayed = rig.scroll.primeBootWheelStream(stream([140, 130, 120, 100, 80, 60, 40, 20]));
  L.check('F', 'F13 primeBootWheelStream consumes the stream and arms the guard',
    replayed === true && rig.scroll.bootGuardState.active === true, replayed);
  L.check('F', 'F13 ...but earns no rate and no spacing from it',
    rig.scroll.gesturePeak === 0 && rig.scroll.streaming === false,
    `${rig.scroll.gesturePeak}/${rig.scroll.streaming}`);
  L.near('F', 'F13 690 px of replayed boot stream is under the position rule',
    rig.settle(16000).p, 0, 1e-5);
  // ...and no amount of distance changes that on its own. The position rule
  // reads the DISPLAYED position, which is speed-limited to MAX_SCRUB_RATE, so
  // in the SNAP_ENGAGE_MS the gesture has left it can advance at most
  // 0.45 x 0.160 = 0.072 of p — a tenth of this span. A replayed stream longer
  // than the whole Mission -> Inspire road (6,524 px) therefore still resolves
  // back to the rest it left. Strength has to arrive with a genuinely
  // delivered post-boot sample. (OBSERVATION O-6.)
  for (const total of [3000, 8000]) {
    rig.stop(); rig.reset(0);
    rig.scroll.primeBootWheelStream(stream(Array.from({ length: 5 }, () => total / 5)));
    L.near('F', `F13 ${total} px of replayed boot stream still returns home`,
      rig.settle(16000).p, 0, 1e-5);
  }
  L.check('F', 'F13 the ceiling that causes it: MAX_SCRUB_RATE x SNAP_ENGAGE_MS',
    MAX_SCRUB_RATE * (SNAP_ENGAGE_MS / 1000) < 0.35 * (REST_STOPS[1] - REST_STOPS[0]),
    +(MAX_SCRUB_RATE * (SNAP_ENGAGE_MS / 1000)).toFixed(4));

  /* F12. A rapid second touch contact is a new GESTURE at the exact physical
     boundary — before either idle window — and it is still minted as one. What
     changed on 2026-08-26 (owner report #26) is what a new gesture BUYS when
     it begins mid-flight: nothing further. 64 ms into a 2.9 s ride the visitor
     has seen 2% of the section they already bought, and the second contact is
     what a visitor does when nothing has visibly happened yet.

     THE TOUCH DUAL IS PINNED BY THE PARTNER BELOW, not by this row. The
     earlier owner report known as the two-flicks-buy-one-section complaint
     (evidence directory defect-02/) was a real defect with a different
     mechanism — a settle-jitter reversal destroying the leg the first flick
     had already bought — and its fix, the `!contactSettling(kind)` conjunct in
     push(), is untouched. Two contacts either side of the landing still buy
     two rests, which is the row after this one. */
  rig.stop(); rig.reset(0);
  const swipe = (start, distance, moves = 8) => {
    rig.touchStart(start);
    for (let i = 1; i <= moves; i++) rig.touchMove(start - (distance * i) / moves, 16);
    rig.touchEnd();
  };
  swipe(780, 560);
  for (let i = 0; i < 4; i++) rig.frame(16);
  swipe(780, 560);
  L.near('F', 'F12 two touch contacts under the idle window buy ONE rest',
    rig.settle(16000).p, REST_STOPS[1]);
  rig.stop(); rig.reset(0);
  swipe(780, 560);
  const f12Landed = rig.settle(6000).p;
  rig.settle(304);
  swipe(780, 560);
  L.check('F', 'F12 ...but two contacts either side of the landing buy two',
    Math.abs(f12Landed - REST_STOPS[1]) < 2e-3
      && Math.abs(rig.settle(16000).p - REST_STOPS[2]) < 2e-3,
    `${f12Landed.toFixed(5)} -> ${rig.scroll.progress.toFixed(5)}`);
}

/* ==================================================================
   AREA G — KEY DISPATCH AND INPUT OWNERSHIP (raw delivery)
   ================================================================== */
{
  const rig = createRig();
  rig.reset(REST_STOPS[1]);

  // G1. A modal owner takes every travel key off the table — and refuses
  // WITHOUT preventDefault, so the focused control keeps its own semantics.
  const dialog = { nodeType: 1, isConnected: true, contains: (n) => n === dialog };
  claimInput(dialog, { modal: true });
  const restSurface = rig.scroll.surface;
  const modalKey = rig.key('ArrowDown', { gap: 300 });
  L.check('G', 'G1 a modal owner refuses travel keys without preventDefault',
    modalKey.prevented === false && rig.scroll.surface === restSurface,
    modalKey.prevented);
  releaseInput(dialog);

  // G2. A detached owner self-retires on the next lookup.
  const detached = { nodeType: 1, isConnected: false, contains: () => true };
  claimInput(detached, { modal: true });
  L.check('G', 'G2 a detached owner no longer holds the keys',
    rig.key('ArrowDown', { gap: 300 }).prevented === true, true);

  // G3. Modifier chords and IME composition are never travel; Shift is exempt
  // because Shift+Space is the platform's own scroll idiom.
  rig.stop(); rig.reset(REST_STOPS[1]);
  L.same('G', 'G3 modifier chords are refused; Shift+Space is travel',
    [
      rig.key('ArrowDown', { gap: 300, metaKey: true }).prevented,
      rig.key('ArrowDown', { gap: 300, ctrlKey: true }).prevented,
      rig.key('ArrowDown', { gap: 300, altKey: true }).prevented,
      rig.key('ArrowDown', { gap: 300, isComposing: true }).prevented,
      rig.key('ArrowDown', { gap: 300, defaultPrevented: true }).prevented,
      rig.key(' ', { gap: 300, shiftKey: true }).prevented,
    ], [false, false, false, false, false, true]);

  // G4. Controls-first: Space on a FOCUSED button activates the button; the
  // same key delivered to a merely hovered one is travel.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const button = { nodeType: 1, tagName: 'BUTTON', getAttribute: () => null };
  env.activeElement = button;
  const focusedSpace = rig.key(' ', { gap: 300, target: button });
  env.activeElement = null;
  const strandedSpace = rig.key(' ', { gap: 300, target: button });
  L.same('G', 'G4 Space belongs to a focused button, not a merely hovered one',
    [focusedSpace.prevented, strandedSpace.prevented], [false, true]);

  // G5. ...but Space on a focused LINK is travel: the platform scrolls there,
  // and Enter is the link's activation key. This is the spec's split.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const link = { nodeType: 1, tagName: 'A', getAttribute: () => null };
  env.activeElement = link;
  const linkSpace = rig.key(' ', { gap: 300, target: link });
  env.activeElement = null;
  L.check('G', 'G5 Space on a focused link is travel (the spec split)',
    linkSpace.prevented === true, linkSpace.prevented);

  // G6. A scrollable ancestor outranks the journey for the scrolling keys.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const scroller = {
    nodeType: 1, tagName: 'DIV', getAttribute: () => null,
    scrollHeight: 400, clientHeight: 100, overflowY: 'auto', parentElement: null,
  };
  env.activeElement = scroller;
  const inScroller = rig.key('ArrowDown', { gap: 300, target: scroller });
  scroller.overflowY = 'visible';
  const notScrollable = rig.key('ArrowDown', { gap: 300, target: scroller });
  env.activeElement = null;
  L.same('G', 'G6 a scrollable ancestor claims ArrowDown; a visible one does not',
    [inScroller.prevented, notScrollable.prevented], [false, true]);

  // G7. Text entry keeps everything, focused or not.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const input = { nodeType: 1, tagName: 'INPUT', getAttribute: () => null };
  L.check('G', 'G7 text entry keeps every key regardless of focus',
    rig.key('ArrowDown', { gap: 300, target: input }).prevented === false, false);

  // G8. Wheel inside a registered owner is neither travel NOR preventDefault:
  // the region scrolls natively. Outside it, the journey claims and cancels.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const region = { nodeType: 1, isConnected: true, contains: (n) => n === region };
  const wheelInto = (target) => {
    let cancelled = false;
    dispatch('wheel', {
      target, deltaY: 400, deltaMode: 0, cancelable: true,
      preventDefault() { cancelled = true; },
    });
    return cancelled;
  };
  const beforeOwned = rig.scroll.surface;
  claimInput(region);
  const ownedCancelled = wheelInto(region);
  const ownedMoved = rig.scroll.surface !== beforeOwned;
  releaseInput(region);
  const freeCancelled = wheelInto(SURFACE);
  L.same('G', 'G8 an owned region keeps its native wheel; the surface does not',
    [ownedCancelled, ownedMoved, freeCancelled], [false, false, true]);

  // G8b. A non-cancelable wheel is still travel; only preventDefault is skipped.
  rig.stop(); rig.reset(REST_STOPS[1]);
  dispatch('wheel', {
    target: SURFACE, deltaY: 400, deltaMode: 0, cancelable: false,
    preventDefault() { throw new Error('must not preventDefault a passive wheel'); },
  });
  L.check('G', 'G8b a non-cancelable wheel still travels',
    rig.scroll.surface > REST_STOPS[1], rig.scroll.surface);

  // G9. The travel key table and its step sizes, measured on the surface.
  const stepOf = (key) => {
    rig.stop();
    rig.scroll.setProgress(0.4);
    const startPx = rig.scroll.scrollFor(rig.scroll.surface);
    rig.key(key, { gap: 400 });
    return rig.scroll.scrollFor(rig.scroll.surface) - startPx;
  };
  const bigStep = env.innerHeight * 0.78;
  L.check('G', 'G9 arrow keys step KEY_STEP_PX; page/space step 0.78 vh',
    Math.abs(stepOf('ArrowDown') - KEY_STEP_PX) < 0.05
      && Math.abs(stepOf('ArrowUp') + KEY_STEP_PX) < 0.05
      && Math.abs(stepOf('PageDown') - bigStep) < 0.1
      && Math.abs(stepOf('PageUp') + bigStep) < 0.1
      && Math.abs(stepOf(' ') - bigStep) < 0.1
      && Math.abs(stepOf('Spacebar') - bigStep) < 0.1,
    `${stepOf('ArrowDown').toFixed(4)}/${stepOf('PageDown').toFixed(4)}`);

  // G11. THE KEY TABLE IS A PLAIN OBJECT LITERAL, so `KEYS[e.key]` reaches
  // Object.prototype. A keydown whose `key` is an inherited member name is
  // therefore claimed and preventDefault()ed — and then contributes nothing,
  // because `k * KEY_STEP_PX` is NaN and push() ignores a falsy delta. No
  // real KeyboardEvent produces these values, so this is latent rather than
  // user-facing; it is recorded, not corrected. (OBSERVATION O-5.)
  rig.stop(); rig.reset(REST_STOPS[1]);
  const inheritedSurface = rig.scroll.surface;
  const inherited = ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__']
    .map((key) => rig.key(key, { gap: 400 }).prevented);
  L.same('G', 'G11 inherited Object member names are claimed as travel keys',
    inherited, [true, true, true, true, true]);
  L.check('G', 'G11 ...and then move nothing, because the step is NaN',
    rig.scroll.surface === inheritedSurface && rig.scroll.lastDir === 0,
    rig.scroll.surface);

  // G10. Home / End TRAVEL, they do not place: the destination is latched as
  // the resolution up front and the picture rides the whole way.
  rig.stop();
  rig.scroll.setProgress(0.4);
  rig.key('End', { gap: 400 });
  const afterEndSample = rig.scroll.progress;
  rig.frame(16);
  const endTarget = rig.scroll.resolveTarget;
  L.check('G', 'G10 End latches the terminal anchor and rides there',
    afterEndSample === 0.4 && endTarget === TERMINAL_P,
    `${afterEndSample}/${endTarget}`);
  L.near('G', 'G10 ...and arrives exactly at the terminal anchor',
    rig.settle(20000).p, TERMINAL_P, 1e-9);
  rig.key('Home', { gap: 400 });
  L.near('G', 'G10 Home rides to the first anchor', rig.settle(20000).p, 0, 1e-9);
}

/* ==================================================================
   AREA H — CANCELLATION AND LANDING
   ================================================================== */
{
  const rig = createRig();

  // H1. Interrupting a glide returns control within ONE sample: the intent is
  // dropped on the spot and the surface is handed back at the displayed
  // position, so p does not move at all on the cancelling sample.
  rig.reset(REST_STOPS[1]);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  for (let i = 0; i < 30; i++) rig.frame(16);
  const beforeCancel = rig.scroll.progress;
  const wasResolving = rig.scroll.resolving;
  rig.wheel(-150, 16);
  L.check('H', 'H1 cancelling a glide is instant and moves nothing by itself',
    wasResolving === true && rig.scroll.resolving === false
      && rig.scroll.progress === beforeCancel,
    `${wasResolving}->${rig.scroll.resolving}`);

  // H2. ...and the surface handed back is the FOLDED one: an out-and-back
  // inside one gesture returns to where it started.
  rig.stop(); rig.reset(REST_STOPS[1]);
  const home = rig.scroll.surface;
  for (let i = 0; i < 6; i++) pulse(rig, 150);
  for (let i = 0; i < 6; i++) pulse(rig, -150);
  L.near('H', 'H2 an out-and-back inside one gesture folds back exactly',
    rig.scroll.surface, home, 5e-4);

  // H3. The landing is exact: p lands ON the anchor, the rate is zeroed and
  // the intent is dropped in the same frame, and the wall is raised there.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 10; i++) pulse(rig, 160);
  let landingFrame = null;
  for (let i = 0; i < 900 && landingFrame === null; i++) {
    rig.frame(16);
    if (rig.scroll.progress === REST_STOPS[1]) landingFrame = i;
  }
  L.check('H', 'H3 the landing settles exactly on the anchor and zeroes the rate',
    landingFrame !== null && rig.scroll.progress === REST_STOPS[1]
      && rig.scroll.rate === 0 && rig.scroll.resolving === false
      && rig.scroll.answeredAt === REST_STOPS[1],
    `frame=${landingFrame}`);

  // H4. p never passes the anchor on the way in — asymptotic by construction.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 24; i++) pulse(rig, 300);
  let overshoot = -Infinity;
  for (let i = 0; i < 900; i++) {
    rig.frame(16);
    overshoot = Math.max(overshoot, rig.scroll.progress - REST_STOPS[1]);
    if (rig.scroll.answeredAt !== null) break;
  }
  L.check('H', 'H4 a hard flick never overshoots its anchor', overshoot <= 0, overshoot);

  // H5. A resolution that delivers NO transition does not answer the gesture.
  // scrollFor() is a sampled inverse, so a placement's own p -> px -> p
  // round-trip lands microscopically off the anchor and the position rule
  // quite correctly resolves that hair back; SNAP_DEAD_P is what stops that
  // from retiring a gesture that has not moved.
  rig.stop(); rig.reset(REST_STOPS[2]);
  rig.settle(2000);
  L.check('H', 'H5 a sub-SNAP_DEAD_P resolution raises no wall',
    rig.scroll.answeredAt === null
      && Math.abs(rig.scroll.progress - REST_STOPS[2]) < SNAP_DEAD_P,
    `answered=${rig.scroll.answeredAt}`);

  /* H6. An in-flight resolution is answered by the gesture that ARMED it —
     and since 2026-08-26 (owner report #26) so is every other gesture on the
     books at that landing. A second flick delivered while the first move flies
     is still a separate GESTURE; it is no longer a separate ASK. Its deltas
     help complete the arrival and are spent there, because a rest the visitor
     is put at and then taken away from without asking is the defect at any
     delay. The after-landing partner below keeps the other direction pinned. */
  rig.stop(); rig.reset(REST_STOPS[1]);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  for (let i = 0; i < 20; i++) rig.frame(16);
  rig.settle(400);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  L.near('H', 'H6 a second flick during the first flight buys no further leg',
    rig.settle(20000).p, REST_STOPS[2]);
  rig.stop(); rig.reset(REST_STOPS[1]);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  const h6Landed = rig.settle(6000).p;
  rig.settle(304);
  for (let i = 0; i < 10; i++) pulse(rig, 150);
  L.check('H', 'H6 ...but a second flick AFTER the landing is its own ask',
    Math.abs(h6Landed - REST_STOPS[2]) < 2e-3
      && Math.abs(rig.settle(20000).p - REST_STOPS[3]) < 2e-3,
    `${h6Landed.toFixed(5)} -> ${rig.scroll.progress.toFixed(5)}`);

  // H7. setProgress is a PLACEMENT: it clears direction, intent and the whole
  // gesture measurement, and lands surface, picture and rate together.
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 10; i++) pulse(rig, 200);
  rig.call('setProgress(0.6)', () => rig.scroll.setProgress(0.6));
  L.check('H', 'H7 a placement lands surface, picture and rate together',
    rig.scroll.progress === 0.6 && rig.scroll.rate === 0
      && rig.scroll.resolving === false && rig.scroll.lastDir === 0
      && rig.scroll.gesturePeak === 0 && rig.scroll.answeredAt === null,
    `${rig.scroll.progress}/${rig.scroll.lastDir}`);

  // H8. retire(dir) raises the wall at the displayed position without moving
  // anything — journey.js's steerWrapBlend depends on exactly this.
  rig.stop(); rig.reset(0.4);
  for (let i = 0; i < 6; i++) pulse(rig, 150);
  const beforeRetire = rig.scroll.progress;
  rig.call('retire(1)', () => rig.scroll.retire(1));
  L.check('H', 'H8 retire() raises the wall in place and spends the strength',
    rig.scroll.answeredAt === beforeRetire && rig.scroll.gesturePeak === 0
      && rig.scroll.progress === beforeRetire,
    `answered=${rig.scroll.answeredAt}`);
  rig.call('retire(0) is a no-op', () => rig.scroll.retire(0));
  L.check('H', 'H8 retire(0) is a no-op', rig.scroll.answeredAt === beforeRetire,
    rig.scroll.answeredAt);
}

/* ==================================================================
   AREA I — THE WRAP SEAM (the loop's own resolution)
   ================================================================== */
{
  const wraps = [];
  const rig = createRig({ onWrap: (dir) => wraps.push(dir) });

  // I1. A stream at the last rest wraps forward. The wrap decision is a FRAME
  // decision, the wall is raised at the displayed position, and the travel
  // direction survives the placement the host is about to perform.
  rig.reset(REST_STOPS[4]);
  rig.record();
  for (let i = 0; i < 8; i++) pulse(rig, 200);
  const i1 = capture('I1', 'forward wrap from the last rest', rig);
  L.check('I', 'I1 a forward stream at the last rest fires exactly one wrap',
    wraps.length === 1 && wraps[0] === 1, JSON.stringify(wraps));
  L.check('I', 'I1 the wrap raises the wall and keeps travel direction',
    rig.scroll.answeredAt !== null && rig.scroll.lastDir === 1,
    `answered=${rig.scroll.answeredAt}`);
  L.check('I', 'I1 the wrap decision is cited to a FRAME',
    flat(i1).some((d) => d.startsWith('F') && d.includes('wrap(1)')),
    JSON.stringify(flat(i1).filter((d) => d.includes('wrap'))));

  // I2. A notch reader never wraps: the stream test still gates the seam, so
  // the end-hold is unchanged for anyone reading it a notch at a time.
  wraps.length = 0;
  rig.stop(); rig.reset(REST_STOPS[4]);
  for (let i = 0; i < 6; i++) { pulse(rig, 110); rig.settle(600); }
  L.check('I', 'I2 a notch-by-notch reader never wraps', wraps.length === 0, wraps.length);

  // I3. Backward at the first anchor wraps the other way.
  wraps.length = 0;
  rig.stop(); rig.reset(0);
  for (let i = 0; i < 8; i++) pulse(rig, -200);
  L.check('I', 'I3 a backward stream at the first anchor wraps back',
    wraps.length === 1 && wraps[0] === -1, JSON.stringify(wraps));

  // I4. With no onWrap host wired at all the seam never fires and the
  // end-hold behaves as the ordinary terminal anchor it was before the loop.
  const noWrap = createRig({ onWrap: false });
  noWrap.reset(REST_STOPS[4]);
  for (let i = 0; i < 14; i++) pulse(noWrap, 200);
  L.near('I', 'I4 without an onWrap host the end-hold is an ordinary anchor',
    noWrap.settle(16000).p, TERMINAL_P, 1e-9);
}

/* ==================================================================
   AREA J — onIntent: THE FIRST SCROLL INTENT IS CONSUMABLE
   ================================================================== */
{
  let refuse = true;
  const rig = createRig({ onIntent: () => !refuse });

  // J1. A refused sample moves nothing and leaves no measurement behind.
  rig.reset(REST_STOPS[1]);
  const restSurface = rig.scroll.surface;
  rig.record();
  rig.wheel(400, 16);
  const j1 = capture('J1', 'the detail state consumes the first scroll intent', rig);
  L.check('J', 'J1 a consumed sample moves nothing',
    rig.scroll.surface === restSurface && rig.scroll.lastDir === 0
      && j1[0].decisions.includes('intent.consumed(wheel)'),
    JSON.stringify(j1[0].decisions));

  // J2. Travel resumes on the very next sample once the frame is clear, and
  // one gesture still buys exactly one rest.
  refuse = false;
  rig.stop();
  for (let i = 0; i < 8; i++) pulse(rig, 200);
  L.near('J', 'J2 travel resumes immediately once the intent is released',
    rig.settle(16000).p, REST_STOPS[2]);

  // J3. A refused jump neither places nor latches a resolution.
  refuse = true;
  rig.stop();
  rig.scroll.setProgress(0.4);
  const endKey = rig.key('End', { gap: 400 });
  rig.frame(16);
  L.check('J', 'J3 a refused End neither places nor latches a resolution',
    endKey.prevented === true && rig.scroll.resolveTarget !== TERMINAL_P,
    `target=${rig.scroll.resolveTarget}`);
}

/* ================================================================== */

if (emitAt >= 0) {
  const out = process.argv[emitAt + 1]
    || 'docs/code-health/evidence/2026-08-21-elegance-run-01/c01/trace-matrix.json';
  writeFileSync(out, `${JSON.stringify({
    generatedBy: 'tools/test-scroll-trace.mjs',
    constants: {
      ARRIVAL_HOLD_MS, SNAP_ENGAGE_MS, STALL_FRAME_MS, SNAP_DEAD_P,
      COMMIT_STREAM_MIN, COMMIT_STREAM_GAP_MS, KEY_STEP_PX, WHEEL_LINE_PX,
      TOUCH_GAIN, MAX_SCRUB_RATE, REST_STOPS, TERMINAL_P,
    },
    traces: matrix,
  }, null, 2)}\n`);
  console.log(`trace matrix written to ${out}`);
}

process.exitCode = L.report() === 0 ? 0 : 1;
