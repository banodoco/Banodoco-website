/* ======================================================================= *
 * THE WRAP'S OWN COPY CLOCK LEAVES A PRE-DEPARTURE HOLD NOTHING TO BUY —
 * WHICH IS WHY THERE IS NO LANDING BEAT ANY MORE.
 *
 *   node tools/test-rest-composition.mjs
 *   node tools/test-rest-composition.mjs --prove-failure
 *
 * WHAT THIS GATE IS FOR. `COMMIT_REST_BEAT_MS` and its one reader,
 * `restBeatUntil` (journey/scroll.js), were RETIRED on 2026-08-26. This file
 * is the arithmetic that retired them and the pin that keeps them retired: it
 * derives, in a module that imports neither, that a pre-departure hold on the
 * wrap has a budget of ZERO, and it reds if the mechanism comes back or if
 * either clock moves so that the budget reopens.
 *
 * WHICH CLOCK, AND WHY IT CHANGED. Until 2026-08-26 the beat was measured
 * against the SCROLL arrival clock — COPY_IN_K and the settle gate, which need
 * 1049 ms from a landing frame to breathe a chapter to nine tenths. That was
 * the right clock for the mechanism the beat was authored for, a QUEUED
 * DEPARTURE that left a landed rest on a timer. Owner report #26 retired that
 * mechanism outright ("So you didn't fix it? This is when scrolling
 * through"), leaving the wrap as the beat's only subject — and the wrap does
 * not use that clock at all. The WRAP is a nav jump, and a jump's copy is
 * timed against the CAMERA on a wall-clock envelope armed at the END of the
 * jump (journey.js hands `ui.armCopyEntry(chapterId, dur)` the lap's live
 * duration; copy-arrival.js places the destination at `dur * COPY_JUMP_LEAD`
 * and finishes it at `dur + COPY_JUMP_COPY_TAIL_S`). Measured on the wrap's
 * own terms the budget came out at zero, and a constant whose only value is
 * zero, read by a conjunct that is always true, is not a guard.
 *
 * THE ARITHMETIC, AND WHY THE ANSWER IS ZERO (evidence
 * docs/code-health/evidence/2026-08-21-elegance-run-01/wrap-beat/). The beat is
 * spent BEFORE the wrap fires; the wrap's whole handover is spent AFTER it, the
 * destination waiting out `lead` before its first pixel while the rest being
 * left releases across that same `lead` — one handover, not two animations with
 * a hole between them. Measured from the frame the wrap fires, 1280x800, frame
 * pacing the trust criterion, 0 of 16 trials excluded:
 *
 *     destination first painted    2498 ms forward, 2435 ms backward
 *     destination at copyEase 0.9  3894 ms forward, 3900 ms backward
 *     rest being LEFT still painted for 1526 ms after the wrap fires
 *                                  (minimum over 24 clean trials)
 *
 * A beat prepended to that buys none of it — it cannot advance an envelope that
 * has not been armed yet — and the rest the wrap leaves is already shown for
 * 477 ms LONGER than a whole scroll arrival takes. The budget is zero, and C3
 * derives it rather than declaring it.
 *
 * WHAT THE BEAT CHARGED FOR THAT NOTHING, and it is not a delay. The beat
 * does not pause the gesture, it only shuts the wrap; the gesture keeps
 * delivering, and with the wrap shut the only road in front of it is the
 * end-hold. A refused ask therefore resolves ONTO the end-hold, `answeredP`
 * is set there, and the wrap block's `answeredP === null` locks the seam for
 * the rest of that gesture. Measured forward at a 150 ms ask, six trials a
 * cell: wrapped 6/6 at beat 0 and at 300, 1/6 at 600, 0/6 at 900 — and 0/6
 * at 900 with a 400 ms ask as well. C3's upper end is that ceiling. Its lower
 * end never was the beat's to hold: "the wrap must not fire on the landing
 * frame" is the arrival wall's job, already a conjunct of the wrap block,
 * plus the stream test the second gesture has to earn — measured at 363 ms
 * with no beat, and M2b drives that end red by removing it. With the beat
 * retired, both of C3's ends are the wall's.
 *
 * WHAT SURVIVED THE RETIREMENT, AND WHY. C1d and its MUT-QUEUE killer are
 * untouched — the retirement of the timed departure is still pinned
 * separately, because everything else here would go quiet if a departure came
 * back. C1a/C1b/C1c keep their jobs: the wrap's four measured figures are
 * declared in the constants tombstone and checked against what this file
 * computes. C3 keeps the two conjuncts that were never the beat's — something
 * separates the landing from the wrap, and that something is inside what the
 * wrap survives — and they are now the ARRIVAL WALL's law alone, which is
 * what M2b drives. C4 keeps the budget and gains the retirement pin, whose
 * killers are M1 and M2: put the constant back, or put its reader back, and
 * this file reds.
 *
 * It is pure, DOM-free and deterministic: no browser, no clock, no flake.
 *
 * D63/provenance: every empirical input below carries the file it was
 * measured into. C2 is the pin that keeps the model honest — if this file's
 * arithmetic ever stops reproducing the recorded browser trace, every other
 * assertion here is arithmetic about nothing.
 *
 * DECLARED LIMIT OF THE MODEL. The lap is not derivable from a constant:
 * journey.js prices it by the arc the camera actually flies
 * (`WRAP_EXTRA_S * Math.min(len / 68, 1)`) and `len` is measured geometry. So
 * the lap is a MEASURED input, read off the page's own authority — the
 * `--j-in` property armCopyEntry writes onto the destination block — and C1a
 * cross-checks it against the ceiling the source law allows.
 * ======================================================================= */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COPY_IN_K, COPY_SETTLE_LO, COPY_SETTLE_HI, COPY_JUMP_TAIL_S,
  COPY_JUMP_LEAD, COPY_JUMP_COPY_TAIL_S,
} from '../journey/constants/copy.js';
import { smoothA } from '../journey/ui/bands.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PROVE = process.argv.slice(2).includes('--prove-failure');
const read = (p) => readFileSync(join(REPO, p), 'utf8');

/* ---- The measured inputs, each a number taken off the running page rather
   than chosen to make a test pass. Evidence: docs/code-health/evidence/
   2026-08-21-elegance-run-01/wrap-beat/ ---------------------------------- */

/** The smoothed |dp/dt| still on the books at the frame the model assigns
 *  `p = intent.target`. Source: connect-skip/compose-hold-quiet.json — kept,
 *  because the SCROLL arrival is still one side of C5's comparison. */
const ARRIVAL_PSPEED = 0.0551;      // p/s — connect/one, exact-landing frame

/** THE WRAP'S LAP in ms, read off the page rather than re-derived: armCopyEntry
 *  writes the entry's own duration onto the destination block as `--j-in`, so
 *  blendDur falls out of it exactly. Source: wrap-beat/wrap-lap.json. */
const WRAP_LAP_MS = 3904;

/** Two points off the recorded wrap trace, proving this file's simulation is
 *  the page's behaviour and not a plausible-looking curve.
 *  Source: wrap-beat/wrap-arrival-base.json, forward cell, 8/8 clean. */
const WRAP_TRACE = [
  { ms: 2433, ease: 0.015 },
  { ms: 3894, ease: 0.90 },
];

/** What "the visitor saw the section" is taken to mean. Nine tenths of the
 *  chapter's own eased copy opacity — the site's single composition
 *  authority (journey/ui.js:1020). */
const REST_COMPOSITION_TARGET = 0.9;
/** HOW LONG THE WRAP KEEPS SHOWING THE REST IT IS LEAVING, from the frame the
 *  wrap fires to the frame the departing block's painted opacity falls under
 *  0.015. The MINIMUM over 24 clean trials is taken, so the pin is the
 *  pessimistic edge of the measurement rather than its mean (medians 1552-1669).
 *  Source: wrap-beat/wrap-gate-beat0.json, all four pause cells. */
const WRAP_SRC_SHOWN_MS = 1526;
/** THE FLOOR THE ARRIVAL WALL ALREADY HOLDS. Shortest landing-to-wrap over 24
 *  clean trials with the beat at zero: the second gesture has to be made, and
 *  to earn the stream test. Source: wrap-beat/wrap-gate-beat0.json. */
const WRAP_WALL_FLOOR_MS = 363;

/** THE CEILING THE WRAP ITSELF IMPOSES. The lowest swept beat at which a
 *  deliberate forward ask was DESTROYED rather than delayed — spent on the
 *  end-hold, with `answeredP` set there and the seam locked for the rest of that
 *  gesture. 5 of 6 trials at a 150 ms ask, and 6 of 6 at beat 900.
 *  Source: wrap-beat/beat-sweep.log. */
const WRAP_SWALLOW_MS = 600;

/** THE DECLARED BUDGET, and the only number here an owner may move.
 *  Milliseconds of showing-the-section that a pre-departure hold can add to
 *  the wrap. NOT an allowance and NOT a tolerance: a measured, owner-visible
 *  quantity, recorded so it cannot move without somebody saying why.
 *
 *  2026-08-25: the subject was a queued departure and the analogous number was
 *  a DEFICIT of 749 ms (beat 300, need ~1049). 2026-08-26 morning: 149 ms, the
 *  beat retimed 300 -> 900 by owner decision. 2026-08-26, later: the queued
 *  departure is gone, the subject is the WRAP, its handover is spent entirely
 *  after the wrap fires, and it already shows the rest it leaves for longer than
 *  a scroll arrival takes. The budget is 0 — and with nothing left to buy, the
 *  beat and its reader were retired rather than kept at zero. */
const DECLARED_BUDGET_MS = 0;
const BUDGET_TOL_MS = 40;

/* ------------------------------------------------------------------ *
 * The two clocks, each modelled where it lives.
 * ------------------------------------------------------------------ */

/** The one loose literal in the SCROLL arrival clock: `pSpeed`'s smoothing
 *  rate is written inline in copy-arrival.js, not exported as a constant, so
 *  it is read from source rather than copied. */
function smoothingRateFromSource(src) {
  const m = src.match(/pSpeed \+= \(inst - pSpeed\) \* Math\.min\(1, dt \* ([0-9.]+)\);/);
  return m ? Number(m[1]) : null;
}

/** The WRAP's duration law, read out of journey.js the same way. Returns the
 *  law's CEILING in ms — the longest lap it can price, and what the measured lap
 *  is checked against. `len` is geometry and cannot be recovered from source,
 *  which is exactly why the lap itself is measured. */
function wrapLapCeilingMsFromSource(src) {
  const law = src.match(
    /0\.85 \+ 0\.35 \* Math\.min\(len \/ 20, 1\) \+ WRAP_EXTRA_S \* Math\.min\(len \/ 68, 1\)/);
  const extra = src.match(/let WRAP_EXTRA_S = ([0-9.]+);/);
  return law && extra ? (0.85 + 0.35 + Number(extra[1])) * 1000 : null;
}

/** Milliseconds from a landing until a chapter's eased copy opacity reaches
 *  `target` ON THE SCROLL PATH, integrating the settle gate and the breathe
 *  exactly as journey/ui/copy-arrival.js's step() does. */
function msToCompose(target, k, {
  v0 = ARRIVAL_PSPEED, settleLo = COPY_SETTLE_LO, settleHi = COPY_SETTLE_HI,
  smooth = 5, dt = 0.001, capMs = 8000,
} = {}) {
  let v = v0;
  let ease = 0;
  let t = 0;
  while (t * 1000 < capMs) {
    const settled = 1 - smoothA((v - settleLo) / (settleHi - settleLo));
    ease += (1 - ease) * Math.min(1, dt * k * settled);
    v += (0 - v) * Math.min(1, dt * smooth);
    t += dt;
    if (ease >= target) return t * 1000;
  }
  return null;
}

/** The WRAP entry envelope, exactly as copy-arrival.js steps it: wait out
 *  `lead`, then smootherstep to 1 over the remainder. */
function wrapEase(ms, {
  lapMs = WRAP_LAP_MS, lead = COPY_JUMP_LEAD, tailS = COPY_JUMP_COPY_TAIL_S,
} = {}) {
  const leadMs = lapMs * lead;
  const durMs = lapMs + tailS * 1000 - leadMs;
  if (durMs <= 0) return ms >= leadMs ? 1 : 0;
  const f = Math.max(0, Math.min(1, (ms - leadMs) / durMs));
  return f * f * f * (f * (f * 6 - 15) + 10);
}

/** Milliseconds after the wrap fires until the destination reaches `target`;
 *  monotone in ms, so the bisection is exact. */
function msToWrapCompose(target, over = {}) {
  let lo = 0;
  let hi = 20_000;
  if (wrapEase(hi, over) < target) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (wrapEase(mid, over) >= target) hi = mid; else lo = mid;
  }
  return hi;
}

/* ------------------------------------------------------------------ *
 * The pins.
 * ------------------------------------------------------------------ */

/* Bare `assert.*` at the top level, fail-fast, exactly as this suite's nearest
   neighbour in the chain (tools/test-connect-motion.mjs) does. An earlier draft
   wrapped each check in a `pin(id, why, fn)` collector and QA-09's AP15 reddened
   on it within the minute, correctly: `pin` is a DECLARED receiver shape
   belonging to two other suites. Each id is carried in its own message instead. */

const COPY_SRC = read('journey/ui/copy-arrival.js');
const SCROLL_SRC = read('journey/scroll.js');
const CONST_SRC = read('journey/constants/scroll.js');
const JOURNEY_SRC = read('journey/journey.js');
const SMOOTH = smoothingRateFromSource(COPY_SRC);
const LAP_CEILING_MS = wrapLapCeilingMsFromSource(JOURNEY_SRC);

/* C1 — PROVENANCE. The claims this gate exists to check must still be made by
   the code, and the numbers the model needs must still be where it reads them.
   A gate whose subject has been rewritten is not passing, it is looking at the
   wrong thing. */
assert.equal(typeof SMOOTH, 'number',
  'C1a: copy-arrival.js no longer contains the `pSpeed += (inst - pSpeed) * Math.min(1, dt * N)` '
  + 'line this gate reads its smoothing rate from — re-derive the model before trusting anything below');
assert.ok(SMOOTH > 0, 'C1a: the smoothing rate read from source is not positive');
assert.ok(Number.isFinite(LAP_CEILING_MS),
  'C1a: journey.js no longer prices the wrap with `0.85 + 0.35 * Math.min(len / 20, 1) + '
  + 'WRAP_EXTRA_S * Math.min(len / 68, 1)`, or WRAP_EXTRA_S is no longer a single `let` this gate '
  + 'can read. The lap is a MEASURED input precisely because `len` is geometry; without the law '
  + 'there is nothing to check the measurement against, so re-derive rather than dropping it.');
assert.ok(WRAP_LAP_MS > 0 && WRAP_LAP_MS <= LAP_CEILING_MS,
  `C1a: the measured lap is ${WRAP_LAP_MS} ms and journey.js's duration law tops out at `
  + `${LAP_CEILING_MS.toFixed(0)} ms. A lap outside the law is a stale measurement or a moved law — `
  + 're-measure on the page (wrap-beat/wrap-lap.mjs reads it off `--j-in`), do not widen this.');
assert.ok(/if \(wrap\) guarded\('ui', \(\) => ui\.armCopyEntry\(chapterId, dur\)\);/.test(JOURNEY_SRC),
  'C1a: the wrap no longer arms the copy-entry envelope, so the destination is not on the wall-clock '
  + 'ticket this gate models. Whatever replaced it is the clock the beat is now answerable to: '
  + 're-derive C2/C5 against it rather than re-anchoring this pattern.');

/* C1b — THE COMMENT AND THE ARITHMETIC ARE THE SAME STATEMENT. Re-anchored
   2026-08-26 onto the wrap's four figures; the mechanism is unchanged from the
   version that policed the queued departure's four. Every quantity the shipped
   comment declares is parsed back out of the source and checked against what
   this file computes, so the comment cannot drift away from the arithmetic that
   justifies it in either direction — a prose edit that changes a figure goes red
   here, and a constant that moves under unchanged prose goes red at C3/C5. The
   claim is a wrapped `//` comment, so it is compared with the comment furniture
   and line breaks flattened out rather than as raw bytes. */
const FLAT = CONST_SRC.replace(/\n\s*\/\/ ?/g, ' ').replace(/\s+/g, ' ');

/** One declared figure out of the shipped comment; null when the sentence that
 *  carries it is gone, which is a re-anchor demand and not a pass. */
const declared = (re) => {
  const m = FLAT.match(re);
  return m ? Number(m[1]) : null;
};

const DECLARED_IN_SOURCE = [
  ['the copyEase the destination reaches on the wrap',
   /destination at copyEase ([0-9.]+)/, REST_COMPOSITION_TARGET, 0.001],
  ['when the destination gets there',
   /destination at copyEase [0-9.]+ ([0-9]+) ms forward/, null, BUDGET_TOL_MS],
  ['how long the wrap keeps showing the rest it leaves',
   /still on screen[^0-9]{0,40}([0-9]+) ms after the wrap fires/, WRAP_SRC_SHOWN_MS, 0.001],
  ['the floor the arrival wall already holds',
   /shortest landing -> wrap[^0-9]{0,60}was ([0-9]+) ms/, WRAP_WALL_FLOOR_MS, 0.001],
];

for (const [what, re] of DECLARED_IN_SOURCE) {
  assert.ok(FLAT.match(re),
    `C1b: journey/constants/scroll.js no longer declares ${what} in the form this gate reads `
    + `(${re}). The comment and this file are one statement in two places — re-anchor the pattern `
    + "and confirm the figure, or retract this gate's framing rather than deleting the check.");
}

/* C1d — THE RETIREMENT, AND THE ONE PIN THIS FILE GAINED RATHER THAN LOST.
   Everything from C2 down is arithmetic about a beat whose only subject is the
   wrap, and it has no other subject because journey/scroll.js no longer arms a
   departure on a clock at all (owner report #26). That is the property the whole
   re-derivation is downstream of, so it is pinned directly: reinstate a timed
   departure and the beat is answerable to the SCROLL arrival clock again, and
   somebody must re-read C3/C5 in that light rather than inheriting a green.
   Source-text deliberately — the behavioural two-sided law lives in
   tools/test-rest-authority.mjs. Driven red by MUT-QUEUE. */
const TIMED_DEPARTURE = /\b(queuedNext|holdUntil)\b\s*[:.=]/;
const timedDeparture = (src) => src
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .some((l) => TIMED_DEPARTURE.test(l));
assert.ok(!timedDeparture(SCROLL_SRC),
  'C1d: journey/scroll.js arms a departure on a timer again (`queuedNext` or `holdUntil` in live '
  + 'code). That mechanism was removed on 2026-08-26 because it took the visitor off a rest with '
  + 'nothing touching the page — owner report #26, and lengthening the beat did not answer it. If '
  + 'this is a deliberate reinstatement, the beat has a second subject again and the wrap arithmetic '
  + 'below is no longer the whole law: say so here and re-justify C3/C5 on the new departure.');

/* C2 — THE MODEL IS THE PAGE: two points from the recorded WRAP trace, without
   which everything below is arithmetic about nothing. */
for (const { ms, ease } of WRAP_TRACE) {
  const got = wrapEase(ms);
  assert.ok(Math.abs(got - ease) <= 0.05,
    `C2: at ${ms} ms after the wrap fires the page measured copyEase ${ease}, this file's model says `
    + `${got.toFixed(3)} — the model has drifted off the page it claims to describe`);
}

/* C3 — THE LAW, AND IT IS THE ARRIVAL WALL'S ALONE NOW. Two conjuncts, each
   with its own failure and its own killer: something separates the landing
   from the wrap, and that something is inside what the wrap survives. A third
   conjunct used to sit here — the beat equals its derived budget — and it went
   with the beat on 2026-08-26; the budget itself is still derived and pinned,
   at C4. `realized` is what a visitor actually waits, and with no beat it is
   exactly the floor the wall and the stream test already impose: 363 ms,
   measured. M2b proves this pin can see that contribution vanish. */
const scrollArrivalMs = msToCompose(REST_COMPOSITION_TARGET, COPY_IN_K);
assert.ok(Number.isFinite(scrollArrivalMs),
  `C3: the scroll arrival clock never reaches ${REST_COMPOSITION_TARGET} — it is broken, not merely `
  + 'slower than the wrap, and C5 compares against it.');
const budgetMs = Math.max(0, scrollArrivalMs - WRAP_SRC_SHOWN_MS);
const realizedMs = WRAP_WALL_FLOOR_MS;
assert.ok(realizedMs > 0,
  `C3: nothing separates the landing from the wrap — the wall floor is ${WRAP_WALL_FLOOR_MS} ms, so `
  + 'the wrap may fire on the landing frame itself. That floor is the arrival wall\'s and the stream '
  + 'test\'s, and since the landing beat was retired it is the whole of the separation: fix it there, '
  + 'and do not answer it by re-authoring a pre-departure hold, which was measured to destroy the '
  + 'gesture rather than delay it.');
assert.ok(realizedMs < WRAP_SWALLOW_MS,
  `C3: a visitor waits ${realizedMs.toFixed(0)} ms between the landing and the wrap, and a `
  + `deliberate forward ask was measured DESTROYED at ${WRAP_SWALLOW_MS} ms — spent on the end-hold, `
  + 'with answeredP set there and the seam locked for that gesture. Not a longer wait: a lost '
  + 'gesture and a second scroll at the edge. Shorten the beat.');

/* C4a — THE BUDGET, DERIVED AND DECLARED, AND THEY MUST AGREE. This is the
   quantity the retirement rests on: the wrap shows the rest it leaves for
   1526 ms against a 1049 ms arrival, so there is 477 ms to spare and nothing
   at all for a pre-departure hold to add. Reopen it and the retirement below
   is no longer justified by this file's own arithmetic. Killers: M2c and M6,
   from either side of the subtraction. */
assert.ok(Math.abs(budgetMs - DECLARED_BUDGET_MS) <= BUDGET_TOL_MS,
  `C4a: the budget the wrap leaves a pre-departure hold is ${budgetMs.toFixed(0)} ms and this file `
  + `declares ${DECLARED_BUDGET_MS} — the wrap shows the rest it leaves for ${WRAP_SRC_SHOWN_MS} ms `
  + `against a ${scrollArrivalMs.toFixed(0)} ms arrival. A clock has moved. Re-measure on the page `
  + '(the probes are in the wrap-beat evidence directory) and rewrite the declaration with the new '
  + 'number and its evidence — do not widen the tolerance.');

/* C4b — VACUITY. The declared budget must still be the zero the retirement was
   justified by. Deliberately a comparison against a literal: it is a
   self-consistency tripwire on this file's own declaration, not a measurement.
   tools/test-assertion-provenance.mjs carries it in its inventory of
   assertions that are legitimately literal, for exactly that reason, and C3's
   two conjuncts joined that inventory when the beat left them. */
assert.ok(DECLARED_BUDGET_MS === 0,
  'C4b: DECLARED_BUDGET_MS is no longer zero, so a pre-departure hold has something to buy on the '
  + 'wrap again — and the beat was retired on the strength of it having nothing. Re-derive on the '
  + 'page and rewrite the declaration with the new measurement, and re-open the retirement question '
  + 'below rather than re-baselining this line.');

/* C4c — THE RETIREMENT ITSELF, PINNED. Same species as C1d and driven the same
   way: a source pin over live code, comment-stripped, so the tombstone in
   journey/constants/scroll.js and the retirement notes in journey/scroll.js
   may name what they buried. M1 and M2 put each half back; RETIRE-NULL is the
   control that keeps the prose from firing it. */
const RETIRED_NAMES = /\b(?:COMMIT_REST_BEAT_MS|restBeatUntil)\b/;
const retiredNamesLive = (src) => src
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .some((l) => RETIRED_NAMES.test(l));
assert.ok(!retiredNamesLive(CONST_SRC) && !retiredNamesLive(SCROLL_SRC),
  'C4c: `COMMIT_REST_BEAT_MS` or `restBeatUntil` is back in live code. Both were retired on '
  + '2026-08-26 because the beat had a measured budget of zero on the wrap and its conjunct was '
  + 'always true, while the 900 ms value the owner shipped DESTROYED a deliberate ask on 14 of 14 '
  + 'trials. What holds the seam off a landing frame is the arrival wall (`answeredP === null`), '
  + 'which is set at every delivering landing. If a hold is genuinely wanted again, re-derive it on '
  + 'the page first — wrap-beat/ has the probes — and rewrite this pin with the new evidence.');

/* C1c — the second half of C1b: every figure the shipped comment declares,
   checked against what this file computes. C1b proved the sentences are
   there; this proves they are still TRUE. */
const wrapComposeMs = msToWrapCompose(REST_COMPOSITION_TARGET);
for (const [what, re, expect, tol] of DECLARED_IN_SOURCE) {
  const got = declared(re);
  const want = expect === null ? wrapComposeMs : expect;
  assert.ok(Math.abs(got - want) <= tol,
    `C1c: journey/constants/scroll.js declares ${got} for ${what}, but this file computes `
    + `${typeof want === 'number' && want > 10 ? want.toFixed(0) : want} (+/-${tol}). The comment and `
    + 'the constants have drifted apart. Whichever is wrong, fix that one — do not relax this check: '
    + 'a comment that states a measured figure is part of the measurement, not decoration.');
}

/* C5 — THE REGIME, which is the claim the corrected comment actually makes.
   C3 pins the beat's exact VALUE against the budget, so it reddens on any
   drift — including drift that leaves the design intact. C5 pins the two
   facts the budget is derived FROM, and the two are not redundant: C3 catches
   a 60 ms slip that C5 would forgive, and C5 catches a re-measure that moved
   the budget honestly but out of the regime the comment describes.

     the destination's arrival lies wholly AFTER the wrap fires
                                                 entry start > 0
     the wrap shows the rest it LEAVES for longer than an arrival takes
                                                 srcShown > scrollArrival

   Both ends are load-bearing and each has its own failure. The first is why
   no beat can advance the destination by one millisecond: the envelope is not
   armed until the wrap has already fired. The second is why no beat is needed
   to show the departing rest either. Lose the first and a hold WOULD buy
   composition and this file's framing is wrong; lose the second and the
   budget reopens and C3's number has to move with it. */
const wrapEntryStartMs = WRAP_LAP_MS * COPY_JUMP_LEAD;
assert.ok(wrapEntryStartMs > 0,
  `C5: the wrap's copy entry now starts ${wrapEntryStartMs.toFixed(0)} ms after the wrap fires, so `
  + 'the destination is shown from the wrap frame and a pre-departure hold could genuinely advance '
  + 'it. That is a different design and a different law: re-derive the budget against it rather than '
  + 'keeping a zero that was true of the old envelope.');
assert.ok(WRAP_SRC_SHOWN_MS > scrollArrivalMs,
  `C5: the wrap keeps the rest it leaves on screen for ${WRAP_SRC_SHOWN_MS} ms and a chapter needs `
  + `${scrollArrivalMs.toFixed(0)} ms to compose, so the wrap no longer covers its own departure and `
  + 'a hold before it has something to buy. This is the direction that reopens the budget: '
  + 're-measure the tail on the page and move DECLARED_BUDGET_MS with it.');

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
if (!PROVE) {
  console.log('Rest composition: PASS');
  console.log(`  wrap lap ${WRAP_LAP_MS} ms (law tops out at ${LAP_CEILING_MS.toFixed(0)} ms); `
    + `destination waits ${wrapEntryStartMs.toFixed(0)} ms, reaches `
    + `${REST_COMPOSITION_TARGET} at ${wrapComposeMs.toFixed(0)} ms `
    + `(page measured ${WRAP_TRACE[WRAP_TRACE.length - 1].ms} ms)`);
  console.log(`  the wrap shows the rest it leaves for ${WRAP_SRC_SHOWN_MS} ms against a `
    + `${scrollArrivalMs.toFixed(0)} ms arrival, so the budget for a hold is `
    + `${budgetMs.toFixed(0)} ms (declared ${DECLARED_BUDGET_MS} +/-${BUDGET_TOL_MS})`);
  console.log(`  no landing beat (retired 2026-08-26); realized landing -> wrap `
    + `${realizedMs.toFixed(0)} ms on the arrival wall alone, inside `
    + `(0, ${WRAP_SWALLOW_MS}) where an ask is destroyed`);
  console.log(`  ${DECLARED_IN_SOURCE.length} declared figures in constants/scroll.js match; `
    + `model reproduces the recorded wrap trace at `
    + `${WRAP_TRACE.map((p) => `${p.ms}ms`).join('/')}; smoothing ${SMOOTH}/s read from source`);
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * --prove-failure — every pin names its killer, and the null runs first.
 * ------------------------------------------------------------------ */
console.log('\n--- mutants: the NULL CONTROL runs first and must NOT fire ---\n');

const scrollArrivalUnder = (over) => {
  const k = 'k' in over ? over.k : COPY_IN_K;
  const n = msToCompose(REST_COMPOSITION_TARGET, k, over);
  return Number.isFinite(n) ? n : Infinity;
};
const budgetUnder = (over) => Math.max(0,
  scrollArrivalUnder(over) - ('src' in over ? over.src : WRAP_SRC_SHOWN_MS));

/* Each pin's killer is scored SEPARATELY. A mutant that reddens only C3 has
   proved C3 discriminates and said nothing about C5, and vice versa; scoring
   one function for both would let either pin rot behind the other. */
const c2Fires = (over) => WRAP_TRACE.some(({ ms, ease }) =>
  Math.abs(wrapEase(ms, over) - ease) > 0.05);
const c3Fires = (over) => {
  const realized = 'floor' in over ? over.floor : WRAP_WALL_FLOOR_MS;
  const swallow = 'swallow' in over ? over.swallow : WRAP_SWALLOW_MS;
  return !(realized > 0 && realized < swallow);
};
const c4Fires = (over) => Math.abs(budgetUnder(over) - DECLARED_BUDGET_MS) > BUDGET_TOL_MS;
const c5Fires = (over) => {
  const lapMs = 'lapMs' in over ? over.lapMs : WRAP_LAP_MS;
  const lead = 'lead' in over ? over.lead : COPY_JUMP_LEAD;
  const src = 'src' in over ? over.src : WRAP_SRC_SHOWN_MS;
  return !(lapMs * lead > 0 && src > scrollArrivalUnder(over));
};

const MUTANTS = [
  ['NULL', 'a copy constant no clock here reads is perturbed (COPY_JUMP_TAIL_S '
    + `${COPY_JUMP_TAIL_S} -> 0.5)`, false,
    () => c2Fires({}) || c3Fires({}) || c4Fires({}) || c5Fires({})],

  /* M1/M2 — THE RETIREMENT, DRIVEN RED FROM BOTH MODULES (2026-08-26). They
     used to restore the beat to 900 and to 300 and score against C3's budget
     conjunct; that conjunct went with the constant, and re-inserting the
     MECHANISM is now the thing that must be loud. The two halves are killed
     separately on purpose: a constant nobody reads and a reader with no
     constant are each half of the machinery, and either coming back alone is
     how it would come back. RETIRE-NULL is their control. */
  ['M1', 'THE CONSTANT COMES BACK — `COMMIT_REST_BEAT_MS` re-declared in '
    + 'journey/constants/scroll.js at 900, the value the owner shipped and then '
    + 'rejected: C4c must see it in live code',
    true, () => retiredNamesLive(`${CONST_SRC}\nexport const COMMIT_REST_BEAT_MS = 900;\n`)],
  ['M2', 'THE READER COMES BACK — the wrap gate re-acquires `&& nowF >= '
    + 'restBeatUntil` in journey/scroll.js, which is the half that actually shut '
    + 'the wrap and destroyed the ask: C4c must see it',
    true, () => retiredNamesLive(`${SCROLL_SRC}\n          && nowF >= restBeatUntil;\n`)],
  ['RETIRE-NULL', 'the retired names appearing ONLY in the constants tombstone '
    + 'and in journey/scroll.js\'s retirement notes must NOT fire C4c. Without it '
    + 'the pin would be red at base and somebody would answer that by deleting the '
    + 'record', false,
    () => retiredNamesLive(CONST_SRC) || retiredNamesLive(SCROLL_SRC)],
  ['M2b', 'TOO SHORT — the wall floor is removed (363 -> 0), so nothing at all '
    + 'separates the landing from the wrap and it may fire on the landing frame. '
    + 'C3\'s lower end, and with the beat retired it is the whole separation',
    true, () => c3Fires({ floor: 0 })],
  ['M2c', 'the wrap stops covering its own departure (the rest it leaves is shown '
    + '1526 -> 900 ms): the budget reopens to 149 ms, so C4a AND C5 both fire — the '
    + 'two pins are linked through the budget and this is where that shows',
    true, () => c4Fires({ src: 900 }) && c5Fires({ src: 900 })],

  ['M3', 'the destination stops waiting out the lap (COPY_JUMP_LEAD 0.55 -> 0): the '
    + 'entry is armed at the wrap frame, so a hold COULD advance it — C5\'s first '
    + 'conjunct, and C2 with it',
    true, () => c5Fires({ lead: 0 }) && c2Fires({ lead: 0 })],
  ['M4', 'the lap collapses (the measured lap -> 900 ms): the model no longer '
    + 'reproduces the recorded wrap trace at either point',
    true, () => c2Fires({ lapMs: 900 })],
  ['M5', 'the entry\'s tail triples (COPY_JUMP_COPY_TAIL_S 0.55 -> 3.0): the '
    + 'destination reaches nine tenths far later than the page recorded',
    true, () => c2Fires({ tailS: 3.0 })],
  ['M6', 'the SCROLL arrival clock slows (COPY_IN_K 2.4 -> 0.6): a chapter takes '
    + 'longer to compose than the wrap keeps it on screen, so the budget reopens',
    true, () => c4Fires({ k: 0.6 }) && c5Fires({ k: 0.6 })],

  /* MUT-QUEUE — C1d's own killer. The other mutants all perturb a constant;
     this one perturbs the SOURCE, because C1d is a source pin. It re-inserts
     the exact line the 2026-08-26 fix removed (the queued leg's `holdUntil`)
     into a copy of scroll.js held in memory, and C1d must see it. Nothing is
     written to disk. */
  ['MUT-QUEUE', 'the timed departure is re-armed (`holdUntil: nowF + '
    + 'COMMIT_REST_BEAT_MS,` re-inserted into scroll.js) — C1d must see it',
    true, () => timedDeparture(SCROLL_SRC
      + '\n            holdUntil: nowF + COMMIT_REST_BEAT_MS,\n')],
  /* ...and its own null: the WORD in a comment is not a reinstatement. C1d
     strips comment lines, so the retirement note in scroll.js that names both
     `queuedNext` and `holdUntil` must not redden it. Without this, C1d would
     be red at base and someone would answer it by deleting the note. */
  ['MUT-QUEUE-NULL', 'the words `queuedNext`/`holdUntil` appearing only in the '
    + 'retirement COMMENT must not fire C1d', false, () => timedDeparture(SCROLL_SRC)],

  /* L1 — A DECLARED LIMIT, NOT A HOLE. Scored as CANNOT FAIL on purpose, and
     printed, so the blind spot is on the record instead of being discovered
     later as a silent pass. COPY_SETTLE_LO 0.012 -> 0.004 moves the scroll
     arrival by 32 ms, which is inside BUDGET_TOL_MS and, at a budget clamped
     at zero by a 477 ms margin, moves nothing at all. If a future edit needs
     the LOW end of the settle gate pinned, that needs a different instrument
     (the browser ring's per-frame `settled`), not a tighter tolerance here. */
  ['L1', 'DECLARED LIMIT — COPY_SETTLE_LO 0.012 -> 0.004 moves the scroll arrival '
    + 'only 32 ms, and the budget is clamped at zero with 477 ms of margin, so the '
    + 'LOW end of the settle gate is outside what this law can see',
    false, () => c4Fires({ settleLo: 0.004 }) || c5Fires({ settleLo: 0.004 })],
];

let bad = 0;
for (const [id, why, shouldFire, run] of MUTANTS) {
  const fired = run();
  const ok = fired === shouldFire;
  if (!ok) bad++;
  console.log(`  [${fired ? 'red' : 'green'}] ${id} ${ok ? 'OK ' : 'BAD'} — ${why}`);
}
console.log(`\n  base budget ${budgetUnder({}).toFixed(0)} ms `
  + `(declared ${DECLARED_BUDGET_MS} +/-${BUDGET_TOL_MS}); no beat (retired); `
  + `realized ${realizedMs.toFixed(0)} ms on the arrival wall alone `
  + `against a ${WRAP_SWALLOW_MS} ms swallow ceiling`);

if (bad) {
  console.log(`\nRest composition: ${bad} mutant(s) scored wrong — the gate is not red-capable`);
  process.exit(1);
}
console.log(`\nRest composition: PASS (${MUTANTS.filter((m) => m[2]).length} mutants red, `
  + `${MUTANTS.filter((m) => !m[2]).length} controls green: the null, C1d's and C4c's comment-only `
  + 'nulls, and one declared limit)');
process.exit(0);
