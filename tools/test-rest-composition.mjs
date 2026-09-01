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
 * AMENDED 2026-09-01, ON THE CEREMONIAL SEAM. The owner's confirmed seam form
 * (both wraps one full turn plus the step home, +/-426.9 deg, the wrap law's
 * 4.00 s base through the mission|final speed row: 5333 ms delivered) forced
 * a re-measure, and the re-measure exposed that the in-flight paint model
 * above had rotted: the destination's visible opacity during the lap is the
 * WRAP TICKET CROSSFADE on the camera blend's own eased phase (chooseEase's
 * railWrap branch, NAV_COPY_FADE_PHASE), not the armCopyEntry envelope —
 * which still exists, still prices --j-in (how the lap is read off the page),
 * and still owns the settle after a landing. Model re-derived at wrapEase;
 * every figure below re-measured on the ceremonial laps (evidence
 * banodoco-brief-v16/evidence/r4-grammar/loop-ceremony/). The conclusion the
 * file exists for is unchanged and stronger: the whole handover is keyed to
 * the lap's own phase, armed at the fire, so a pre-departure hold still buys
 * nothing, and the longer lap widens every margin (source shown 2077 ms vs a
 * 1049 ms arrival).
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
import { navigationSpeed } from '../journey/navigation-timing.js';
import { smoothA } from '../journey/ui/bands.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PROVE = process.argv.slice(2).includes('--prove-failure');
const read = (p) => readFileSync(join(REPO, p), 'utf8');

/* ---- The measured inputs, each a number taken off the running page rather
   than chosen to make a test pass. Original evidence: docs/code-health/
   evidence/2026-08-21-elegance-run-01/wrap-beat/. RE-MEASURED 2026-09-01 on
   the owner-confirmed ceremonial seam (both wraps +/-426.9 deg, priced at the
   wrap law's 4.00 s base / the mission|final default speed row): evidence
   banodoco-brief-v16/evidence/r4-grammar/loop-ceremony/ (ceremony-window.json,
   up-trace-ramp.json; probes r4b-ceremony-window.mjs, r4b-trace.mjs). ------ */

/** The smoothed |dp/dt| still on the books at the frame the model assigns
 *  `p = intent.target`. Source: connect-skip/compose-hold-quiet.json — kept,
 *  because the SCROLL arrival is still one side of C5's comparison. */
const ARRIVAL_PSPEED = 0.0551;      // p/s — connect/one, exact-landing frame

/** THE WRAP'S LAP in ms, read off the page rather than re-derived: armCopyEntry
 *  writes the entry's own duration onto the destination block as `--j-in`, and
 *  blendDur falls out of it through the same two constants armCopyEntry
 *  spends: lap = (jin - COPY_JUMP_COPY_TAIL_S) / (1 - COPY_JUMP_LEAD). The
 *  derivation is written out (not a pre-multiplied number) so a moved lead or
 *  tail reds against the C1a ceiling instead of silently re-dating the lap.
 *  2026-09-01: --j-in 2950 ms on the up-wrap, 3/3 trials -> 5333 ms, and the
 *  camera's own motion window agrees (5649 ms including the convergence
 *  tail). Both crossings share the figure: the two ceremonial laps are the
 *  same +/-426.9 deg path mirrored, so their lengths and prices are equal.
 *  (The prior 3904 was the 2026-08-21 page, before the wrap rode the
 *  navigation-timing conversion — stale against the live page even then, as
 *  the lane ledger recorded.) */
const WRAP_JIN_MS = 2950;
const WRAP_LAP_MS = Math.round(
  (WRAP_JIN_MS - COPY_JUMP_COPY_TAIL_S * 1000) / (1 - COPY_JUMP_LEAD));

/** Three points off the recorded wrap trace, proving this file's simulation is
 *  the page's behaviour and not a plausible-looking curve. Medians of 3 clean
 *  up-wrap trials (the destination block's painted opacity), 1280x800.
 *  Source: loop-ceremony/up-trace-ramp.json. */
const WRAP_TRACE = [
  { ms: 3600, ease: 0.317 },
  { ms: 4000, ease: 0.741 },
  { ms: 4400, ease: 0.954 },
];

/** What "the visitor saw the section" is taken to mean. Nine tenths of the
 *  chapter's own eased copy opacity — the site's single composition
 *  authority (journey/ui.js:1020). */
const REST_COMPOSITION_TARGET = 0.9;
/** HOW LONG THE WRAP KEEPS SHOWING THE REST IT IS LEAVING, from the frame the
 *  wrap fires to the frame the departing block's painted opacity falls under
 *  0.015. The MINIMUM over the clean trials is taken, so the pin is the
 *  pessimistic edge of the measurement rather than its mean. 2026-09-01: 6
 *  down-wrap trials on the ceremonial lap measured 2077-2092 ms; the ticket
 *  crossfade model puts the crossing at 2069 ms of the 5333 ms lap.
 *  Source: loop-ceremony/ceremony-window.json (was 1526 on the 2026-08-21
 *  page, wrap-beat/wrap-gate-beat0.json). */
const WRAP_SRC_SHOWN_MS = 2077;
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
 *  law's BASE ceiling in ms — the longest base it can price. `len` is geometry
 *  and cannot be recovered from source, which is exactly why the lap itself is
 *  measured. The DELIVERED ceiling divides this by the mission|final
 *  navigation speed row, the conversion journey.js applies exactly once at
 *  the duration seam (navigationDurationSeconds, pinned in
 *  tools/test-no-scroll-navigation.mjs) — the old model omitted that
 *  conversion and its 3904 ms input predated it, so the pair agreed with each
 *  other while the page had moved (the lane ledger recorded the staleness);
 *  the 2026-09-01 re-anchor added the divisor and imports the live row. */
function wrapLapCeilingMsFromSource(src) {
  const law = src.match(
    /0\.85 \+ 0\.35 \* Math\.min\(len \/ 20, 1\) \+ WRAP_EXTRA_S \* Math\.min\(len \/ 68, 1\)/);
  const extra = src.match(/let WRAP_EXTRA_S = ([0-9.]+);/);
  return law && extra
    ? (0.85 + 0.35 + Number(extra[1])) * 1000 / navigationSpeed('final', 'mission')
    : null;
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

/** The WRAP entry, exactly as copy-arrival.js paints it while the wrap ticket
 *  is live (the `railWrap` branch of chooseEase): the camera blend's own
 *  eased phase — smootherstep of t/lap, written onto the ticket by
 *  camera-blend.js — crossfaded through NAV_COPY_FADE_PHASE, so the
 *  destination rises across the lap's closing fade window and the departure
 *  fades across its opening one.
 *
 *  RE-DERIVED 2026-09-01 (C1a's own instruction). The previous model here —
 *  wait out COPY_JUMP_LEAD of the lap, smootherstep over the remainder plus
 *  COPY_JUMP_COPY_TAIL_S — was the 2026-08-21 page, and its recorded trace
 *  points were from the same era, so C2 stayed green while the page moved
 *  underneath both: model and evidence agreed with each other, not with the
 *  page. The ceremonial-seam re-measure exposed the drift (fresh points sat
 *  0.1+ off the old model). The lead/tail pair still price the arrive
 *  envelope armCopyEntry builds (and --j-in with it, which is how the lap is
 *  read); the VISIBLE in-flight paint is the ticket crossfade, and that is
 *  what "the destination reaches copyEase 0.9" is a claim about. The phase
 *  is the blend's C2 smootherstep; the crossfade is smoothA — the same
 *  import the scroll model uses, which is bands.js's smoothstep. Verified
 *  against the fresh trace at C2 (max deviation 0.013 across the ramp). */
function smoother(x) {
  const f = Math.max(0, Math.min(1, x));
  return f * f * f * (f * (f * 6 - 15) + 10);
}
function wrapEase(ms, { lapMs = WRAP_LAP_MS, fade = NAV_FADE } = {}) {
  return smoothA((smoother(ms / lapMs) - (1 - fade)) / fade);
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
/** The ticket crossfade's window, read from source rather than copied — the
 *  one constant the re-derived wrapEase model turns on. */
const NAV_FADE = (() => {
  const m = COPY_SRC.match(/const NAV_COPY_FADE_PHASE = ([0-9.]+);/);
  return m ? Number(m[1]) : null;
})();

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
assert.ok(typeof NAV_FADE === 'number' && NAV_FADE > 0 && NAV_FADE < 0.5,
  'C1a: copy-arrival.js no longer declares `const NAV_COPY_FADE_PHASE = N;` in the form this gate '
  + 'reads, or the crossfade window has grown past half the lap (the opening and closing fades '
  + 'would overlap and the model\'s "one handover, no hole" framing stops holding) — re-derive the '
  + 'wrapEase model before trusting anything below.');
assert.ok(
  /const phase = clamp01\(Number\(railWrap && railWrap\.phase\) \|\| 0\);/.test(COPY_SRC)
  && /return smoothA\(\(phase - \(1 - NAV_COPY_FADE_PHASE\)\) \/ NAV_COPY_FADE_PHASE\);/.test(COPY_SRC),
  'C1a: chooseEase no longer paints the wrap destination off the ticket\'s own phase through the '
  + 'NAV_COPY_FADE_PHASE crossfade — the clause the re-derived wrapEase model describes (and the '
  + 'structural reason no pre-departure hold can advance the destination: its paint is a pure '
  + 'function of a phase that starts at the fire). Re-derive the model against whatever replaced '
  + 'it; MUT-PHASE drives this pin red.');

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
   2077 ms against a 1049 ms arrival, so there is 1028 ms to spare and nothing
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
   no beat can advance the destination by one millisecond — and under the
   ticket crossfade it is structural twice over: the destination's paint is a
   pure function of a phase that starts at zero on the fire frame, and the
   fade window sits at the phase's far end. Its numeric half below is the
   window's placement; its structural half is the crossfade source pin at
   C1a, driven red by MUT-PHASE. The second is why no beat is needed to show
   the departing rest either. Lose the first and a hold WOULD buy composition
   and this file's framing is wrong; lose the second and the budget reopens
   and C3's number has to move with it. */
const msToWrapFirstPaint = (over = {}) => {
  let lo = 0;
  let hi = 20_000;
  if (wrapEase(hi, over) < 0.001) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (wrapEase(mid, over) >= 0.001) hi = mid; else lo = mid;
  }
  return hi;
};
const wrapEntryStartMs = msToWrapFirstPaint();
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
  const src = 'src' in over ? over.src : WRAP_SRC_SHOWN_MS;
  return !(msToWrapFirstPaint(over) > 0 && src > scrollArrivalUnder(over));
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
    + '2077 -> 900 ms): the budget reopens to 149 ms, so C4a AND C5 both fire — the '
    + 'two pins are linked through the budget and this is where that shows',
    true, () => c4Fires({ src: 900 }) && c5Fires({ src: 900 })],

  ['M3', 'the crossfade window widens to the whole lap (NAV_COPY_FADE_PHASE 0.32 '
    + '-> 1): the destination rises from the wrap frame, C1a\'s window bound would '
    + 'refuse it, and the model stops reproducing the recorded trace — C2 fires',
    true, () => c2Fires({ fade: 1 })],
  ['M4', 'the lap collapses (the measured lap -> 900 ms): the model no longer '
    + 'reproduces the recorded wrap trace at any point',
    true, () => c2Fires({ lapMs: 900 })],
  ['M5', 'the crossfade window collapses (NAV_COPY_FADE_PHASE 0.32 -> 0.05): the '
    + 'destination pops in at the lap\'s very end, far later than the page recorded',
    true, () => c2Fires({ fade: 0.05 })],
  /* MUT-PHASE — the structural half of C5's first conjunct, a source mutant
     like MUT-QUEUE: the wrap destination's paint stops reading the ticket's
     phase (the crossfade clause rewritten onto the settle envelope), and the
     C1a crossfade pin must stop matching. Nothing is written to disk. */
  ['MUT-PHASE', 'the wrap destination is painted off the settle envelope instead of '
    + 'the ticket\'s own phase — the C1a crossfade source pin must lose its anchor',
    true, () => !/return smoothA\(\(phase - \(1 - NAV_COPY_FADE_PHASE\)\) \/ NAV_COPY_FADE_PHASE\);/
      .test(COPY_SRC.replace(
        'return smoothA((phase - (1 - NAV_COPY_FADE_PHASE)) / NAV_COPY_FADE_PHASE);',
        'return target * arriveE;'))],
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
     at zero by a 1028 ms margin, moves nothing at all. If a future edit needs
     the LOW end of the settle gate pinned, that needs a different instrument
     (the browser ring's per-frame `settled`), not a tighter tolerance here. */
  ['L1', 'DECLARED LIMIT — COPY_SETTLE_LO 0.012 -> 0.004 moves the scroll arrival '
    + 'only 32 ms, and the budget is clamped at zero with 1028 ms of margin, so the '
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
