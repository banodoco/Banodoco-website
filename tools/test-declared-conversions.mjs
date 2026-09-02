/* ======================================================================= *
 * THE DECLARED CONVERSIONS — three beats and the clocks they are answerable
 * to, recomputed against each other.
 *
 *   node tools/test-declared-conversions.mjs
 *   node tools/test-declared-conversions.mjs --prove-failure
 *
 * WHAT THIS GATE IS FOR. CONTRIBUTING.md §5 states the law this file
 * enforces: *a beat, floor, brake, onset or reveal is spent in the coordinate
 * it is authored in; price it by the span actually being travelled, never by
 * a coordinate whose exchange rate to visible motion nothing declares.* The
 * census behind it (docs/code-health/2026-08-26-conversion-census.md) found
 * 26 sites in journey/ that price a perceptual intent in a coordinate other
 * than seconds-of-presented-time. FOUR carried a cross-checked pin, and three
 * of those four are one suite written this week. Seventeen are prose only.
 *
 * This file is CONV-02: the prose-only rows whose BOTH ENDS are importable
 * pure. It follows tools/test-rest-composition.mjs — the template — in shape
 * and in doctrine: recompute the conversion from the shipped constants, pin
 * the exact NUMBER so drift is caught, pin the REGIME so a legitimate
 * re-measure that moves the number a little does not quietly become a
 * different design, and drive every pin red with a named mutant.
 *
 * FOUR SUBJECTS, ONE LAW.
 *
 *   BRAKE  (census A1) journey/route.js's FORWARD_BRAKE_TAIL_S — a budget
 *          declared in SECONDS whose delivered value is set by a
 *          p-denominated solve in journey/scroll.js. The sharpest exhibit in
 *          the tree: the constant's own comment has to tell you it does not
 *          deliver what it says.
 *   LADDER (census D8/D7/D6) journey/chapters/final/index.js's two reveal
 *          clocks — pull-units-per-second ceilings and seconds-per-rung
 *          floors, over a 24-rung ladder authored in pull, whose purpose is
 *          "a town lighting one house at a time".
 *   EMBER  (census D1/B7, and B6 as a rider) Inspire's three ember onsets —
 *          GATE UNITS against a saturating exponential, purpose stated in
 *          milliseconds. The gate's rate constant COPY_IN_K lives in
 *          journey/constants/copy.js, which journey/chapters/inspire/index.js
 *          DOES NOT IMPORT. That is the law's own pre-fault definition of the
 *          defect: a beat whose implementation coordinate and whose stated
 *          purpose live in files that never refer to each other.
 *   ORBIT  (rider, added 2026-08-30 with Equip) journey/portrait.js's zero
 *          head against journey/chapters/inspire/camera.js's ARRIVAL_DEAD —
 *          a FRACTION of a leg, duplicated in a file that cannot import it
 *          (portrait.js is deliberately three-free), whose product with the
 *          live Inspire rest is the p that actually ships. It was a literal
 *          until the route moved under it.
 *
 * WHERE THE TWO ENDS NEVER MEET, SAID OUT LOUD. Each subject below names the
 * two modules and whether either imports the other. None of the three pairs
 * do. This file is the only place in the tree where they are computed
 * against each other.
 *
 * IT IS PURE, DOM-FREE AND DETERMINISTIC: no browser, no wall clock, no
 * flake. The BRAKE section drives the shipped journey/scroll.js on
 * tools/scroll-touch-gates.mjs's own fake-event/fake-clock rig at a fixed
 * 1/60 s step, so its "measurement" is an exact frame count, not a timing.
 *
 * ----------------------------------------------------------------------
 * THE FINDING THIS ORDER WAS SENT TO SETTLE, AND WHICH WAY IT WENT.
 *
 * Two comments in this tree contradicted each other about the same eight
 * lines of code:
 *
 *   journey/scroll.js:1016-1017 — the brake constant is solved by "one fixed-
 *     point iteration from SNAP_K (THE LOG IS FLAT, A SECOND CHANGES
 *     NOTHING)".
 *   journey/route.js:255-259 — "it does not run a second — so what actually
 *     ships is SHORTER than what is written here ... Declared 0.35 delivers
 *     183 ms on Inspire -> Connect".
 *
 * Reproduced here, on the rig, at HEAD: Inspire -> Connect delivers
 * 183.3 ms against a declared 0.35 s, at K_eff 10.1037 against route.js's
 * recorded 10.11. Connect -> Owned delivers 300.0 ms at K_eff 8.3173 against
 * its recorded 300 ms / 8.32. Mission -> Inspire delivers 266.7 ms on a flick
 * and 216.7 ms on a gentle release against its recorded 267 / 217.
 *
 * ROUTE.JS IS RIGHT AND SCROLL.JS IS WRONG. The solve takes its engage point
 * at SNAP_K and then runs the brake at the solved K, so the delivered tail is
 * `tailS - ln(K/SNAP_K)/K` — strictly short, and short by 30% of the budget
 * on every leg carrying an entry, not by nothing. Running a second iteration
 * moves K from 8.648 to 5.981 on Inspire -> Connect (-31%) and takes the
 * delivered tail from 183 ms to 412 ms; the true fixed point is K 6.707, at
 * which the tail is the declared 350 ms exactly. "A second changes nothing"
 * is false in every direction it can be read.
 *
 * THE REPAIR IS NOT IN THIS ORDER'S HANDS. journey/scroll.js is held by a
 * live order (NO-AUTO-ADVANCE) and this order may not edit it, so the false
 * sentence is reported to the coordinator rather than fixed here. What this
 * file does instead is make the repair impossible to get wrong: BR-REGIME
 * below reds the day somebody converges the solve, which is the exact edit
 * scroll.js's sentence invites.
 * ----------------------------------------------------------------------
 *
 * THREE FIGURES IN SHIPPED PROSE WERE STALE AND ARE **NOT** PINNED HERE.
 * Recording them rather than pinning them, because a pin that reds at base
 * is not a pin and a tolerance widened to swallow them would be a silencer:
 *
 *   1. journey/constants/copy.js:128 — "Inspire's first ember saturates its
 *      gate in ~116 ms on a settled arrival". True at b711a0a, where
 *      LAND_ON/LAND_GATE_RISE were 0.18/0.20 (116.5 ms). TIMING-01 then
 *      retimed them to 0.20/0.14 and the figure was not carried across: those
 *      constants saturated in 80.2 ms. The ARGUMENT was untouched and if
 *      anything stronger (80 ms is more of a pop than 116), so formMs was
 *      never in question — only the figure. SETTLED 2026-08-26: the owner
 *      amended that sentence in place, and INSPIRE-ONSET then moved Inspire's
 *      sequence 49.1 ms earlier the same day WITHOUT moving this quantity —
 *      the retiming scales every gate complement by one λ, which translates
 *      the onsets in time and leaves every duration alone, so the saturation
 *      is still 80.2 ms between two earlier instants. EM-SATURATE pins it.
 *   2. journey/chapters/final/index.js:365-369 — "the seven gaps already
 *      wider than the target ... the sixteen narrower ones ... totals 1.351 s
 *      — inside the tighter of the two windows with ~33 ms in hand." That is
 *      the PRE-RE-CUT accelerando ladder. On the shipped rungs (world.js
 *      RING_LADDER + ring.js FIELD_LADDER, re-authored 2026-08-16) it is
 *      TWELVE gaps wider and ELEVEN narrower, and the band costs 1.1655 s —
 *      218 ms in hand, not 33. The file's own 2026-08-16 note says the
 *      ladder was re-cut; the budget paragraph above it was not updated.
 *      LD-FIT pins the recomputed 1.1655 s.
 *   3. journey/chapters/final/index.js:474-475 — "tightest gap 0.023 pull
 *      needs 0.575 and 0.177 respectively". The shipped tightest gap is
 *      0.0224 (between RING_LADDER's 0.9276 and 0.9500, neither jittered),
 *      needing 0.560 and 0.172. The CLAIM — that neither floor binds — is
 *      true and is pinned by LD-FLOORS; the three figures are 2-3% stale.
 *
 * ALL FOUR REPAIRS LANDED ON 2026-08-26, by the follow-on order CONV-CLOSE,
 * once the three lanes holding those files released them. The account above is
 * kept in the past tense it was written in rather than deleted, because it is
 * the record of WHY each number is what it is — which is the whole doctrine
 * this file enforces. What shipped, and what did NOT change with it:
 *
 *   · journey/scroll.js's brakeK comment now reads "ONE fixed-point iteration
 *     from SNAP_K" with the sentence about the log being flat replaced by the
 *     arithmetic, an amendment naming the shortfall and the fixed point.
 *   · constants/copy.js reads ~80 ms, with the b711a0a figure and the retiming
 *     preserved beneath it and the note that the case for formMs is unaffected.
 *   · final/index.js §40 carries both ladders — the pre-re-cut arithmetic as
 *     history and the shipped 12/11 split at 1.1655 s as the live figure — and
 *     the 2026-08-16 note's three rounded figures are corrected in place.
 *   · NOT ONE EXPECTED VALUE IN THIS FILE MOVED. Every pin below was already
 *     anchored on the recomputation rather than on the prose, which is why the
 *     repairs could be made without touching a tolerance. The one pin that
 *     reads shipped prose as data, BR-NUMBER, reads route.js — which was
 *     right all along and was not edited.
 *
 * This file is wired into `npm run check` as of the same change (test:contracts,
 * end of tier 2, --prove-failure), so the debt row that stood in D49's
 * UNWIRED_TODAY is closed and the twenty-four mutants run in the gate.
 *
 * D63/provenance: every empirical input below carries the file it was
 * measured into, and there are only two of them (the wrap windows in LD-FIT).
 * Everything else is recomputed from shipped constants on every run.
 * ======================================================================= */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stripComments } from './strip-comments.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PROVE = process.argv.slice(2).includes('--prove-failure');
const read = (p) => readFileSync(join(REPO, p), 'utf8');
/** The same file with every comment blanked, byte-for-byte in length. Every
 *  CODE anchor below reads this: `LADDER_GAP_S = 0.040` appears twice in
 *  final/index.js, once as the declaration and once inside the prose that
 *  justifies it, and an anchor that cannot tell them apart is reading a
 *  sentence for a constant. The prose anchors read the raw text instead. */
const code = (p) => stripComments(read(p));

/** Comment furniture flattened out, exactly as test-rest-composition.mjs
 *  does it: the claims below are wrapped `//` and `*` comments, so they are
 *  compared with line breaks and continuation markers removed rather than as
 *  raw bytes. */
const flat = (p) => read(p)
  .replace(/\n\s*\*\s?/g, ' ')
  .replace(/\n\s*\/\/ ?/g, ' ')
  .replace(/\s+/g, ' ');

/** A constant declared inside a factory closure cannot be imported, so it is
 *  cut out of the shipped source on its NAME — the same anchor shape
 *  tools/test-connect-motion.mjs uses for the chapter constants it cannot
 *  import. Exactly once, or it is ambiguous and this file is reading the
 *  wrong number. */
const localNum = (text, name, where) => {
  const hits = [...text.matchAll(new RegExp(`\\b${name} = (-?[0-9.]+)`, 'g'))];
  assert.equal(hits.length, 1,
    `PROV: the anchor for ${name} must hit exactly once in ${where} (hit ${hits.length}). `
    + 'This file reads the constant out of source because it lives inside a factory closure '
    + 'and cannot be imported; if it moved or gained a twin, re-anchor before trusting anything below.');
  return Number(hits[0][1]);
};

/** A declared figure pulled back out of shipped prose. Null when the sentence
 *  that carries it is gone, which is a re-anchor demand, not a pass. */
const declaredIn = (text, re, what) => {
  const m = text.match(re);
  assert.ok(m,
    `PROV: the source no longer declares ${what} in the form this gate reads (${re}). `
    + 'The comment and this file are one statement in two places — if the comment was rewritten, '
    + 're-anchor and confirm the figure still matches; if the claim was retracted, retract the '
    + 'pin with it rather than deleting the check.');
  return m.slice(1).map(Number);
};

const near = (got, want, tol, id, what) => assert.ok(Math.abs(got - want) <= tol,
  `${id}: ${what} — this file computes ${got}, the shipped declaration says ${want} `
  + `(+/-${tol}). One of the two ends moved without the other. Whichever is wrong, fix that one; `
  + 'do not relax this check. A comment that states a measured figure is part of the measurement.');

const REPORT = [];

/* ===================================================================== *
 * 1. BRAKE — census A1. journey/route.js's FORWARD_BRAKE_TAIL_S against
 *    the p-denominated solve in journey/scroll.js.
 *
 * THE TWO ENDS AND WHETHER THEY MEET. journey/route.js declares the budget
 * in seconds and imports nothing from journey/constants/scroll.js, where
 * SNAP_K and SNAP_DEAD_P — the two constants that decide what the budget
 * actually buys — live. journey/scroll.js imports both and is the only place
 * they meet, in eight lines that nothing checks. The budget's delivered
 * value is recoverable only by measurement, and until this file the
 * measurement lived in a comment.
 * ===================================================================== */

/* The rig. tools/scroll-touch-gates.mjs's fake event bus and fake clock,
   reduced to what a released forward glide needs. The globals must be in
   place before journey/scroll.js is imported, so the import is dynamic. */
let vt = 0;
const handlers = new Map();
const addListener = (type, fn) => {
  const list = handlers.get(type) || [];
  list.push(fn);
  handlers.set(type, list);
};
globalThis.performance = { now: () => vt };
globalThis.location = { search: '' };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { hidden: false, body: {}, activeElement: null, addEventListener: addListener };
globalThis.window = { innerHeight: 900, addEventListener: addListener };

const { createScrollModel } = await import('../journey/scroll.js');
const { SNAP_K, SNAP_DEAD_P, COMMIT_GLIDE_PX, COMMIT_GLIDE_MAX_S } =
  await import('../journey/constants/scroll.js');
const { REST_STOPS, REST_OWNER, restProgress, transitSeconds, forwardBrakeTailSeconds,
  FORWARD_BRAKE_TAIL_S } = await import('../journey/route.js');

const scroll = createScrollModel();
scroll.attach();
scroll.enabled = true;

/** The frame step. 1/60 s exactly, which is what makes every tail below an
 *  integer frame count rather than a timing: the rig has no real clock, so a
 *  tail that reads 183.3 ms is eleven frames and nothing else. */
const DT = 1 / 60;
const surfaceTarget = { nodeType: 1 };

function wheel(deltaY, gapMs = 16) {
  vt += gapMs;
  const event = { target: surfaceTarget, deltaY, deltaMode: 0, cancelable: true, preventDefault() {} };
  for (const fn of handlers.get('wheel') || []) fn(event);
  scroll.update(gapMs / 1000);
}
function frame() { vt += DT * 1000; scroll.update(DT); }
function seat(p) { scroll.setProgress(p); for (let i = 0; i < 40; i++) frame(); }

/** One released forward glide from `lo`'s rest to `hi`'s, sampled every
 *  frame from the last input delta to the settle. */
function glide(lo, hi, notches, deltaPx) {
  seat(lo);
  const t0 = vt;
  for (let i = 0; i < notches; i++) wheel(deltaPx, 16);
  const rows = [];
  for (let i = 0; i < 900; i++) {
    frame();
    rows.push({ vt: vt - t0, p: scroll.progress });
    if (i > 5 && Math.abs(scroll.progress - hi) < 1e-12) break;
  }
  return rows;
}

/** THE RECORDED INSTRUMENT, re-implemented exactly.
 *
 *  tools/trace/brake-tail.py is the rig every figure in route.js's comment
 *  was measured on, and its definition of "the brake tail" is not obvious:
 *  K_eff = (dp per frame) * 60 / |err| is ~0 through the ramp-in, rises
 *  through the cruise, and PLATEAUS the moment the exponential brake takes
 *  the resolution over. It takes the median of the last six pre-settle
 *  frames as the plateau and walks back while K_eff stays inside 5% of it;
 *  the frame that breaks is the engage. Reproducing route.js's figures means
 *  reproducing its ESTIMATOR, not inventing a cleaner one — a different
 *  definition would land ~1.5 frames earlier and the comparison would be
 *  against a number nobody measured. */
function brakeWindow(rows, target) {
  let settle = null;
  let settleI = null;
  for (let i = 0; i < rows.length; i++) {
    if (Math.abs(rows[i].p - target) < 1e-9) { settle = rows[i].vt; settleI = i; break; }
  }
  assert.ok(settleI !== null && settleI > 12,
    'BR-PROV: the rig never settled on the rest, or settled inside twelve frames — there is no '
    + 'glide to measure, so every brake figure below would be arithmetic about nothing. The rig, '
    + 'not the constants, is what to look at first.');
  const keff = new Array(rows.length).fill(null);
  for (let i = 1; i < settleI; i++) {
    const err = Math.abs(target - rows[i].p);
    const dp = Math.abs(rows[i].p - rows[i - 1].p);
    keff[i] = err > 1e-9 ? dp * 60 / err : null;
  }
  const tail = keff.slice(Math.max(1, settleI - 6), settleI).filter(Boolean).sort((a, b) => a - b);
  const plateau = tail.length ? tail[Math.floor(tail.length / 2)] : null;
  let engageI = null;
  if (plateau) {
    let i = settleI - 1;
    while (i > 1 && keff[i] && Math.abs(keff[i] - plateau) / plateau < 0.05) { engageI = i; i -= 1; }
  }
  assert.ok(engageI !== null,
    'BR-PROV: no K_eff plateau was found before the settle, so the brake never took the '
    + 'resolution over on this leg. Read the rig before reading the constants.');
  return { keffMeasured: plateau, tailMs: settle - rows[engageI].vt };
}

/** THE SOLVE, RE-DERIVED FROM THE SHIPPED CONSTANTS AND NOTHING ELSE.
 *
 *  journey/scroll.js's brakeK, transcribed, plus the one input it takes from
 *  the band: `pRate = band.nominal * spanSlope(lo, hi)`, which reduces to
 *  (hi - lo) / declaredSeconds on a leg with a declared transit and to the
 *  glide fit otherwise. No measurement enters here — the whole point is that
 *  K is predictable at the desk, and BR-MECH proves the prediction is the
 *  page. */
function nominalPRate(lo, hi) {
  const spanPx = scroll.scrollFor(hi) - scroll.scrollFor(lo);
  const declared = transitSeconds(lo, hi, 1);
  const nominal = declared ? spanPx / declared
    : Math.max(COMMIT_GLIDE_PX, spanPx / COMMIT_GLIDE_MAX_S);
  return nominal * (hi - lo) / spanPx;
}
function solveK(pRate, tailS, { snapK = SNAP_K, dead = SNAP_DEAD_P, iterations = 1 } = {}) {
  if (!tailS) return snapK;
  let k = snapK;
  for (let n = 0; n < iterations; n++) {
    const engage = Math.max(pRate / k, dead * Math.E);
    k = Math.max(snapK, Math.log(engage / dead) / tailS);
  }
  return k;
}
/** The fixed point the one-iteration solve is one step of — the K at which
 *  the delivered tail IS the declared budget, i.e. what the solve would
 *  return if journey/scroll.js's "a second changes nothing" were true. Found
 *  by bisection rather than by iterating, because the raw iteration
 *  OSCILLATES around the root (8.648 -> 5.981 -> 7.035 -> ...) — which is
 *  itself a refutation of the sentence. Used only by the mutants. */
function convergedK(pRate, tailS, { dead = SNAP_DEAD_P } = {}) {
  const err = (k) => Math.log(pRate / (k * dead)) / k - tailS;
  let lo = 1e-3;
  let hi = 1e4;
  for (let n = 0; n < 200; n++) {
    const mid = (lo + hi) / 2;
    if (err(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
/** What the budget actually buys, at the nominal cruise: the creep from the
 *  overtake point `pRate / K` down to the dead band, run at K. */
const deliveredTailS = (pRate, k, dead = SNAP_DEAD_P) => Math.log(pRate / (k * dead)) / k;
/** The gap between the dial and what it delivers, as a fraction of the dial.
 *  This is route.js's whole claim reduced to one number. */
const shortfall = (pRate, tailS, opts = {}) =>
  (tailS - deliveredTailS(pRate, solveK(pRate, tailS, opts), opts.dead)) / tailS;

const LEGS = REST_STOPS.slice(0, -1).map((lo, i) => ({
  name: `${REST_OWNER[i]}>${REST_OWNER[i + 1]}`,
  lo,
  hi: REST_STOPS[i + 1],
}));

const ROUTE_SRC = flat('journey/route.js');

/* BR-PROV / BR-ENUM — the subject is still the subject. The set of legs
   carrying a forward tail budget is declared here, so an entry ADDED to
   route.js without a measurement reds this and asks for one. That is the
   whole failure mode: the third entry ('mission>inspire') was added on a
   measurement, and nothing would have stopped a fourth being added on a
   guess. */
const ENTRIED = LEGS.filter((l) => forwardBrakeTailSeconds(l.lo, l.hi, 1)).map((l) => l.name);
assert.deepEqual(ENTRIED, ['mission>inspire', 'inspire>equip', 'equip>connect', 'connect>owned'],
  'BR-ENUM: the set of forward legs carrying a FORWARD_BRAKE_TAIL_S budget has changed. Every '
  + "entry in that table is a MEASUREMENT — route.js's own comment says the readings are "
  + 'measurements, not algebra — so a new entry owes this file its delivered tail and its K_eff, '
  + 'and a removed one owes an account of what happened to the leg it was curing.');
assert.deepEqual(Object.keys(FORWARD_BRAKE_TAIL_S).sort(), [...ENTRIED].sort(),
  'BR-ENUM: FORWARD_BRAKE_TAIL_S names a leg that is not a forward rest-to-rest transition on '
  + 'the shipped route, or misses one that is. The table is keyed by anchor name and resolved by '
  + 'namedTransitSeconds; a key nothing resolves is a budget that silently never applies.');

const CONTROL = LEGS.find((l) => !forwardBrakeTailSeconds(l.lo, l.hi, 1));
assert.ok(CONTROL,
  'BR-ENUM: every forward leg now carries a tail budget, so this file has lost its control — '
  + 'the un-entried leg whose ~0.9 s SNAP_K creep is the fault the budgets exist to cure. '
  + 'Without it BR-CONTROL is asserting a property of nothing. Re-derive the control (a reverse '
  + 'glide, or a leg with the entry removed) before trusting the section.');

/* The measurement. Two gesture classes per leg, because route.js's own
   mission>inspire ladder is stated per gesture class and the difference is
   real: a flick's cruise engages the brake further out than a gentle
   release's, so the same dial delivers a longer tail. */
const BRAKE = [];
for (const leg of LEGS) {
  const pRate = nominalPRate(leg.lo, leg.hi);
  const tailS = forwardBrakeTailSeconds(leg.lo, leg.hi, 1);
  const k = solveK(pRate, tailS);
  for (const [gesture, notches, deltaPx] of [['flick', 12, 120], ['gentle', 6, 60]]) {
    const rows = glide(leg.lo, leg.hi, notches, deltaPx);
    assert.ok(Math.abs(rows[rows.length - 1].p - leg.hi) < 1e-9,
      `BR-PROV: the ${gesture} release on ${leg.name} did not land on the rest, so there is no `
      + 'landing brake to measure. The rig, not the brake, is what changed.');
    BRAKE.push({ ...leg, gesture, pRate, tailS, k, ...brakeWindow(rows, leg.hi) });
  }
}

/* BR-MECH — THE MODEL IS THE PAGE, and it is pure.
   The brake integrates as `p += err * K * dt` with dt = 1/60, so one frame's
   K_eff — measured as dp/err with err taken AFTER the step — is K/(1 - K*dt)
   exactly. Predicting the rig's measured plateau from the shipped constants
   alone, with no fitted quantity anywhere, is what makes every mutant below
   evidence about the page rather than arithmetic about a plausible curve.
   It is also the pin that catches the two ends moving under each other:
   SNAP_K or SNAP_DEAD_P moving in journey/constants/scroll.js, or the budget
   moving in journey/route.js, changes K and reds here. */
for (const b of BRAKE) {
  const predicted = b.k / (1 - b.k * DT);
  near(predicted, b.keffMeasured, 0.001, 'BR-MECH',
    `${b.name} (${b.gesture}) brake constant: the rig measures K_eff ${b.keffMeasured.toFixed(4)}, `
    + `the solve recomputed from SNAP_K=${SNAP_K}, SNAP_DEAD_P=${SNAP_DEAD_P} and a budget of `
    + `${b.tailS === null ? 'none' : `${b.tailS} s`} predicts ${predicted.toFixed(4)}`);
}

/* BR-NUMBER — the four figures route.js's own comment declares, against what
   the rig delivers. C1c's discipline: the comment and the arithmetic are one
   statement in two places.

   The tolerance is 1 ms and that is not slack — the rig has no real clock,
   so each tail is an exact multiple of 16.667 ms and the declared figures are
   those multiples rounded to the millisecond. One frame of drift is 16.7 ms,
   sixteen times this tolerance. */
const TAIL_TOL_MS = 1;
const [dialS, dialInspire, dialConnect] = declaredIn(ROUTE_SRC,
  /Declared ([0-9.]+) delivers ([0-9]+) ms on Inspire -> Equip and ([0-9]+) ms on Connect -> Owned/,
  "the dial's delivered tails on the two 2026-08-17/24 entries");
const [missionFlick, missionGentle] = declaredIn(ROUTE_SRC,
  /Delivered \(measured, not algebra\): ([0-9]+) ms flick \/ ([0-9]+) ms gentle/,
  "mission>inspire's two gesture classes");
const [declaredKeff, declaredTail] = declaredIn(ROUTE_SRC,
  /equip>connect fwd ([0-9.]+) ([0-9]+) ms/,
  "the K_eff ladder's equip>connect row");

const measured = (name, gesture) => BRAKE.find((b) => b.name === name && b.gesture === gesture);
near(measured('inspire>equip', 'flick').tailMs, dialInspire, TAIL_TOL_MS, 'BR-NUMBER',
  'the tail Inspire -> Equip delivers against its declared 0.35 s dial');
near(measured('connect>owned', 'flick').tailMs, dialConnect, TAIL_TOL_MS, 'BR-NUMBER',
  'the tail Connect -> Owned delivers against its declared 0.35 s dial');
near(measured('mission>inspire', 'flick').tailMs, missionFlick, TAIL_TOL_MS, 'BR-NUMBER',
  "the tail Mission -> Inspire delivers on a 12-notch flick");
near(measured('mission>inspire', 'gentle').tailMs, missionGentle, TAIL_TOL_MS, 'BR-NUMBER',
  'the tail Mission -> Inspire delivers on a gentle release');
near(measured('equip>connect', 'flick').keffMeasured, declaredKeff, 0.01, 'BR-NUMBER',
  "the K_eff route.js's own measured ladder records for equip>connect");
assert.equal(declaredTail, measured('equip>connect', 'flick').tailMs.toFixed(0) * 1,
  'BR-NUMBER: route.js states the equip>connect delivered tail twice — in the five-leg table '
  + `and in the K_eff ladder (${declaredTail} ms) — and the ladder no longer agrees with what the `
  + 'rig delivers. One of them was updated and the other was not; this file will not choose '
  + 'between them.');
for (const b of BRAKE) {
  if (!b.tailS) continue;
  near(+b.tailS.toFixed(3), dialS, 1e-9, 'BR-NUMBER',
    `${b.name}'s budget against the single dial value route.js's comment quotes`);
}

/* BR-REGIME — THE CLAIM THE COMMENT ACTUALLY MAKES, and the pin that
   survives a re-measure.

   BR-NUMBER pins the delivered milliseconds, so it reddens on any drift,
   including drift that leaves the design intact. BR-REGIME pins the design:

     the dial OVER-DECLARES                       shortfall > 0
     and it over-declares by a THIRD, not a hair  shortfall > 0.15
     and it still buys most of what it says       shortfall < 0.50

   Both ends are load-bearing and each has its own failure.

   BELOW 0.15 is the repair journey/scroll.js's false comment invites. If the
   solve is ever iterated to its fixed point — which is what "the log is flat,
   a second changes nothing" would mean if it were true — the shortfall goes
   to exactly 0, the delivered tail becomes the declared 350 ms, and EVERY
   figure in route.js's comment, every reading in mission-tail/ and defect-04/,
   and the owner's three shipped complaints about slow landings are answered
   by a number that no longer means what it did. That must be loud.

   ABOVE 0.50 the dial declares more than twice what it buys, at which point
   the constant has stopped carrying information and the honest cure is to
   re-author it in delivered seconds — the TRANSIT_S precedent — rather than
   to keep a dial nobody can read. */
const SHORTFALL_LO = 0.15;
const SHORTFALL_HI = 0.50;
for (const b of BRAKE) {
  if (!b.tailS || b.gesture !== 'flick') continue;
  const s = shortfall(b.pRate, b.tailS);
  assert.ok(s > SHORTFALL_LO,
    `BR-REGIME: on ${b.name} the declared ${b.tailS} s budget now buys `
    + `${(deliveredTailS(b.pRate, b.k) * 1000).toFixed(0)} ms — a shortfall of `
    + `${(s * 100).toFixed(1)}%, at or under the ${SHORTFALL_LO * 100}% floor this design runs at. `
    + 'If the solve was converged, route.js\'s "READ THE NUMBER AS A DIAL, NOT AS THE DELIVERED '
    + 'TAIL" is now false and every measured figure in that comment is stale: retract the dial '
    + 'framing and re-measure, do not lower this floor. If the solve was not touched, a cruise or '
    + 'a spring constant moved under it.');
  assert.ok(s < SHORTFALL_HI,
    `BR-REGIME: on ${b.name} the declared ${b.tailS} s budget buys only `
    + `${(deliveredTailS(b.pRate, b.k) * 1000).toFixed(0)} ms — under half of what it says. A dial `
    + 'that reads twice its delivery is not a dial, it is a coordinate nobody can price. Author '
    + 'the budget in delivered seconds (the TRANSIT_S precedent) rather than widening this bound.');
}

/* BR-CONTROL — the fault the budgets exist to cure, still measurable on the
   one forward leg that has no budget. Without this the section could pass on
   a tree where the brake had been retired altogether, and "the tail is short"
   would be true for the wrong reason. */
const controlTail = measured(CONTROL.name, 'flick').tailMs;
assert.ok(controlTail > 2 * dialS * 1000,
  `BR-CONTROL: the un-entried leg ${CONTROL.name} now lands in ${controlTail.toFixed(0)} ms, `
  + `which is inside twice the ${dialS} s budget the other three legs had to declare to get there. `
  + "Either the global SNAP_K creep is gone — in which case FORWARD_BRAKE_TAIL_S's whole "
  + 'justification has changed and the three entries should be re-argued — or this leg quietly '
  + 'acquired a budget of its own.');
near(measured(CONTROL.name, 'flick').keffMeasured, SNAP_K / (1 - SNAP_K * DT), 0.001, 'BR-CONTROL',
  `the un-entried leg's brake constant, which must be the bare global SNAP_K`);

REPORT.push(['BRAKE', BRAKE.filter((b) => b.tailS).map((b) =>
  `${b.name}/${b.gesture} ${b.tailMs.toFixed(1)}ms of a ${b.tailS}s dial `
  + `(${(shortfall(b.pRate, b.tailS) * 100).toFixed(0)}% short, K_eff ${b.keffMeasured.toFixed(3)})`)
  .concat(`${CONTROL.name}/flick ${controlTail.toFixed(1)}ms — no budget, bare SNAP_K`)]);

/* ===================================================================== *
 * 2. LADDER — census D8 / D7 / D6. journey/chapters/final/index.js's two
 *    reveal clocks, over the 24-rung ladder they pace.
 *
 * THE TWO ENDS AND WHETHER THEY MEET. The clocks are seven constants inside
 * `createFinal`'s closure in final/index.js. The ladder they pace is
 * assembled at BUILD time from world.js's RING_LADDER and ring.js's
 * FIELD_LADDER, and index.js reads it back off `ring.seats` — deliberately,
 * because "a pacing table that had to be re-derived alongside them would be a
 * second copy of the same hazard". So the clocks and the rungs never meet in
 * a form either module can check, and the whole of D8's design claim is an
 * inequality written in a comment.
 * ===================================================================== */

const FINAL_SRC = code('journey/chapters/final/index.js');
const FINAL_FLAT = flat('journey/chapters/final/index.js');
/* world.js imports three, so its `REVEAL_W` and `PULL_MAX` are reached the
   way tools/test-connect-motion.mjs reaches `pullOf`/`PULL_MAX` from the same
   module: through the vendor resolver, not through a copied literal. REVEAL_W
   in particular CANNOT be source-anchored — the name appears three times with
   a number beside it, twice inside shader text. */
const { installVendorResolver } = await import('./render-report-lib.mjs');
installVendorResolver();
const { REVEAL_W, PULL_MAX } = await import('../journey/chapters/final/world.js');

const BLEND_REVEAL_RATE = localNum(FINAL_SRC, 'BLEND_REVEAL_RATE', 'final/index.js');
const LADDER_GAP_S = localNum(FINAL_SRC, 'LADDER_GAP_S', 'final/index.js');
const RATE_MIN = localNum(FINAL_SRC, 'RATE_MIN', 'final/index.js');
const RATE_FAST = localNum(FINAL_SRC, 'RATE_FAST', 'final/index.js');
const ARRIVE_GAP_S = localNum(FINAL_SRC, 'ARRIVE_GAP_S', 'final/index.js');
const ARRIVE_RATE = localNum(FINAL_SRC, 'ARRIVE_RATE', 'final/index.js');
const ARRIVE_RATE_MIN = localNum(FINAL_SRC, 'ARRIVE_RATE_MIN', 'final/index.js');

/** The two authored rung tables, cut out of the modules that own them. */
const rungTable = (src, name, where) => {
  const m = src.match(new RegExp(`\\bconst ${name} = \\[([^\\]]*)\\]`));
  assert.ok(m, `LD-PROV: ${name} is no longer a single bracketed array literal in ${where}; `
    + 'this file reads the ladder from source because neither table is exported.');
  const vals = m[1].split(',').map((s) => Number(s.trim()));
  assert.ok(vals.every((v) => Number.isFinite(v) && v > 0 && v < PULL_MAX),
    `LD-PROV: ${name} in ${where} holds a value that is not a pull threshold in (0, PULL_MAX)`);
  return vals;
};
const RING_LADDER = rungTable(code('journey/chapters/final/world.js'), 'RING_LADDER', 'world.js');
const FIELD_LADDER = rungTable(code('journey/chapters/final/ring.js'), 'FIELD_LADDER', 'ring.js');
const REV_JIT = localNum(code('journey/chapters/final/ring.js'), 'REV_JIT', 'ring.js');
const LADDER = [...RING_LADDER, ...FIELD_LADDER].sort((a, b) => a - b);

assert.equal(LADDER.length, 24,
  `LD-PROV: the pacing ladder is ${LADDER.length} rungs, not the 24 the chapter is authored over `
  + '(nine ring members at tiers 0-2, fifteen field clones at tier 3). index.js builds it from '
  + '`ring.seats.filter(s => s.tier <= 3)`; if the count moved, every figure below is about a '
  + 'different chapter.');

/* LD-PROV — the limiter this file re-implements is still the limiter that
   ships. The discipline tools/test-connect-motion.mjs uses for the same
   problem: the executed SHAPE is pinned by asserting the shipped statement
   text, so upstream moving a NUMBER moves this file's arithmetic with it,
   and upstream moving the LAW reds and asks for a re-read. */
for (const line of [
  'const a = u - REVEAL_W * 0.5;',
  'if (a <= LADDER[0]) return RATE_FAST;',
  'if (a >= LADDER[n - 1]) return rateMax;',
  'const r = (LADDER[hi] - LADDER[lo]) / gapS;',
  'return r < rateMin ? rateMin : r > rateMax ? rateMax : r;',
  'const blendRate = (u) => paceRate(u, LADDER_GAP_S, BLEND_REVEAL_RATE, RATE_MIN);',
  'const arriveRate = (u) => paceRate(u, ARRIVE_GAP_S, ARRIVE_RATE, ARRIVE_RATE_MIN);',
]) {
  assert.ok(FINAL_SRC.includes(line),
    `LD-PROV: final/index.js no longer contains «${line}». This file re-implements paceRate to `
    + 'recompute the conversion; a limiter that has been re-shaped needs the re-implementation '
    + 'read again, not the pin re-anchored.');
}

/** paceRate, transcribed. The half-reveal-width shift is load-bearing and is
 *  part of the conversion: a rung's light runs from its threshold to
 *  threshold + REVEAL_W, so the instant the eye reads as its arrival is the
 *  midpoint, and pacing on the raw driver value paces the wrong instant. */
function paceRate(ladder, u, gapS, rateMax, rateMin) {
  const n = ladder.length;
  if (!n) return rateMax;
  const a = u - REVEAL_W * 0.5;
  if (a <= ladder[0]) return RATE_FAST;
  if (a >= ladder[n - 1]) return rateMax;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ladder[m] <= a) lo = m; else hi = m; }
  const r = (ladder[hi] - ladder[lo]) / gapS;
  return r < rateMin ? rateMin : r > rateMax ? rateMax : r;
}
const clocks = (o = {}) => ({
  blend: {
    gapS: o.ladderGapS ?? LADDER_GAP_S,
    rateMax: o.blendRate ?? BLEND_REVEAL_RATE,
    rateMin: o.rateMin ?? RATE_MIN,
  },
  arrive: {
    gapS: o.arriveGapS ?? ARRIVE_GAP_S,
    rateMax: o.arriveRate ?? ARRIVE_RATE,
    rateMin: o.arriveRateMin ?? ARRIVE_RATE_MIN,
  },
});
const rateAt = (ladder, u, c) => paceRate(ladder, u, c.gapS, c.rateMax, c.rateMin);

/** The seconds the driver spends crossing the whole band at one clock. Exact
 *  rather than sampled: the rate is piecewise constant in u, so the cost is a
 *  sum over the fast run, the 23 rung gaps, and the run past the last
 *  arrival. */
function bandCost(ladder, c) {
  const n = ladder.length;
  let t = (ladder[0] + REVEAL_W * 0.5) / RATE_FAST;
  for (let i = 0; i < n - 1; i++) {
    const gap = ladder[i + 1] - ladder[i];
    const r = Math.min(Math.max(gap / c.gapS, c.rateMin), c.rateMax);
    t += gap / r;
  }
  return t + (PULL_MAX - (ladder[n - 1] + REVEAL_W * 0.5)) / c.rateMax;
}

/** The largest amount by which the arrival clock is FASTER than the
 *  departure clock anywhere in the band. The design says this is zero. */
function oneSidednessViolation(ladder, o = {}) {
  const c = clocks(o);
  const probes = [0, PULL_MAX];
  for (const rung of ladder) {
    for (const d of [-1e-9, 0, 1e-9, REVEAL_W * 0.5 - 1e-9, REVEAL_W * 0.5, REVEAL_W * 0.5 + 1e-9]) {
      probes.push(rung + d);
    }
  }
  for (let i = 0; i <= 4000; i++) probes.push(i * PULL_MAX / 4000);
  let worst = -Infinity;
  for (const u of probes) {
    if (u < 0 || u > PULL_MAX) continue;
    worst = Math.max(worst, rateAt(ladder, u, c.arrive) - rateAt(ladder, u, c.blend));
  }
  return worst;
}

/* LD-ONESIDED — census D8's NUMBER. The cheapest row in the census to pin,
   and the only one whose design claim was already written as arithmetic:

     "`ARRIVE_GAP_S > LADDER_GAP_S` and `ARRIVE_RATE < BLEND_REVEAL_RATE`
      make `arriveRate(u) <= blendRate(u)` at every u"

   Checked here at every rung threshold, at every reveal-midpoint, either side
   of both, and on a 4000-point sweep of the band. The claim matters because
   `slewPull`'s ceiling is `max(pure, held)`: a limiter that ever ran FASTER
   than the departure clock would not merely mistime a light, it would invent
   light the lens has not earned, on the frozen `?capture=` path included. */
declaredIn(FINAL_FLAT,
  /.(ARRIVE_GAP_S > LADDER_GAP_S). and .(ARRIVE_RATE < BLEND_REVEAL_RATE). make .(arriveRate\(u\) <= blendRate\(u\)). at every u/,
  "D8's one-sidedness argument");
assert.ok(oneSidednessViolation(LADDER) <= 0,
  `LD-ONESIDED: the arrival clock is faster than the departure clock somewhere in the band, by `
  + `${oneSidednessViolation(LADDER).toFixed(6)} pull/s. The arrival limiter is supposed to be able `
  + 'only to SLOW a light-up, never to speed one — see §41, IT STAYS ONE-SIDED. Whatever moved, '
  + 'the fix is to restore the ordering of the three constant pairs, not to accept a small '
  + 'violation: `slewPull` takes max(pure, held), so this is light the lens has not earned.');

/* LD-REGIME — census D8's DESIGN, which LD-ONESIDED cannot see on its own.

   LD-ONESIDED is a statement about TODAY'S rungs. It would stay green under
   an edit that broke the design but happened not to bite on the shipped
   ladder — and one such edit is proved below as MUT-FLOOR. The design is
   three orderings, and with all three the one-sidedness holds for ANY ladder,
   because `clamp(x/A, mA, MA) <= clamp(x/B, mB, MB)` whenever A >= B,
   mA <= mB and MA <= MB, and both clocks share RATE_FAST below the first
   rung. So the regime is pinned as the orderings AND as the property over
   randomly generated ladders — the second is what makes the first more than
   a restatement. */
assert.ok(ARRIVE_GAP_S >= LADDER_GAP_S,
  `LD-REGIME: ARRIVE_GAP_S (${ARRIVE_GAP_S}) is now tighter than LADDER_GAP_S (${LADDER_GAP_S}), `
  + 'so the arrival stagger is shorter than the departure stagger and the arrival clock can '
  + 'outrun the departure clock on some ladder. §41 splits these two budgets precisely because '
  + 'an arrival has no window and a retire has a hard one — the arrival is the SLOW half.');
assert.ok(ARRIVE_RATE <= BLEND_REVEAL_RATE,
  `LD-REGIME: ARRIVE_RATE (${ARRIVE_RATE}) now exceeds BLEND_REVEAL_RATE (${BLEND_REVEAL_RATE}), `
  + 'so an arriving body kindles FASTER than a departing one. REVEAL_W / rate is the kindle time; '
  + 'the shipped 1.0 was derived to sit between the forward flick and the forward firm read, and '
  + 'the arrival is deliberately below that band.');
assert.ok(ARRIVE_RATE_MIN <= RATE_MIN,
  `LD-REGIME: ARRIVE_RATE_MIN (${ARRIVE_RATE_MIN}) now exceeds RATE_MIN (${RATE_MIN}). Both are `
  + 'guards against a degenerate rung pair, and neither binds on the shipped ladder — which is '
  + 'exactly why this ordering is invisible until a future rung pair lands on top of another. At '
  + 'that moment the arrival clock would be floored ABOVE the departure clock and would run '
  + 'faster than it, on the one ladder nobody tested.');

/** A deterministic ladder generator, used only to prove the orderings above
 *  are the reason LD-ONESIDED holds, rather than an accident of the shipped
 *  rungs. Seeded LCG: no Math.random anywhere in this file. */
function* ladders(n) {
  let seed = 20260826;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let t = 0; t < n; t++) {
    const rungs = [];
    let u = 0.02 + rnd() * 0.10;
    while (u < 0.95 && rungs.length < 40) { rungs.push(u); u += 0.002 + rnd() * rnd() * 0.09; }
    if (rungs.length > 1) yield rungs;
  }
}
const randomLadderWorst = (o = {}) => {
  let worst = -Infinity;
  for (const l of ladders(400)) worst = Math.max(worst, oneSidednessViolation(l, o));
  return worst;
};
assert.ok(randomLadderWorst() <= 0,
  'LD-REGIME: the one-sidedness fails on a ladder that is not the shipped one, so it holds today '
  + 'by accident rather than by the three orderings above. The chapter re-cuts its rungs (twice '
  + 'already: 2026-08-09 and 2026-08-16, both on owner passes) and the limiter is supposed to '
  + 'survive that by construction.');

/* LD-KINDLE — census D6's NUMBERS. Same-unit arithmetic on both clocks, but
   the conversion crosses the module boundary: REVEAL_W is world.js's
   smoothstep width, the rates are index.js's, and the product is the seconds
   a body takes to light. Every figure here is declared in shipped prose. */
const [declaredKindleMs] = declaredIn(FINAL_FLAT, /REVEAL_W \/ 1.0 = ([0-9]+) ms/,
  "D6's per-body kindle at the departure rate");
near(Math.round(REVEAL_W / BLEND_REVEAL_RATE * 1000), declaredKindleMs, 0, 'LD-KINDLE',
  'the seconds one body takes to kindle at the departure rate');
const [declaredBandS] = declaredIn(FINAL_FLAT, /whole PULL_MAX band is spent in ([0-9.]+) s/,
  "D6's whole-band time at the ceiling rate");
near(+(PULL_MAX / BLEND_REVEAL_RATE).toFixed(2), declaredBandS, 0.005, 'LD-KINDLE',
  'the seconds the whole PULL_MAX band takes at the departure ceiling');
const [stagFrom, stagTo, stagX] = declaredIn(FINAL_FLAT,
  /ARRIVE_GAP_S is the stagger[^]{0,120}?([0-9.]+) -> ([0-9.]+), x([0-9]+\.[0-9]+)/,
  "§41's stagger multiplier");
near(LADDER_GAP_S, stagFrom, 1e-9, 'LD-KINDLE', "the stagger's departure-clock baseline");
near(ARRIVE_GAP_S, stagTo, 1e-9, 'LD-KINDLE', "the stagger's arrival-clock value");
near(+(ARRIVE_GAP_S / LADDER_GAP_S).toFixed(2), stagX, 0.005, 'LD-KINDLE',
  'the factor §41 says the stagger was multiplied by');
const [kindFrom, kindTo, kindX] = declaredIn(FINAL_FLAT,
  /divided by this rate IS its kindle time. ([0-9.]+) -> ([0-9.]+), x([0-9]+\.[0-9]+)/,
  "§41's kindle multiplier");
near(BLEND_REVEAL_RATE, kindFrom, 1e-9, 'LD-KINDLE', "the kindle's departure-clock baseline");
near(ARRIVE_RATE, kindTo, 1e-9, 'LD-KINDLE', "the kindle's arrival-clock value");
near(+(BLEND_REVEAL_RATE / ARRIVE_RATE).toFixed(2), kindX, 0.005, 'LD-KINDLE',
  'the factor §41 says the kindle was divided by');

/* LD-FLOORS — census D7's REGIME, and the one guard in this chapter whose
   whole point is that it does NOT bind.

   `RATE_MIN` and `ARRIVE_RATE_MIN` exist "so that a future rung pair landing
   on top of each other cannot drive the rate to zero and stall the reveal
   inside a move". The chapter's 2026-08-16 note asserts neither binds on the
   re-cut ladder. If one starts to bind, the reveal's shape changes silently:
   the tightest gaps stop being stretched to their target and get the floor's
   flat rate instead, and the fit LD-FIT pins moves with it.

   Checked at the WORST jitter, not the nominal table. ring.js adds
   `fr() * REV_JIT` to every field rung at build time, so the shipped ladder
   is one of a family; the tightest gap the family can produce is what the
   guard has to clear. */
const worstJitterMinGap = (() => {
  let seed = 90210;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let worst = Infinity;
  for (let t = 0; t < 4000; t++) {
    const l = [...RING_LADDER, ...FIELD_LADDER.map((v) => v + rnd() * REV_JIT)].sort((a, b) => a - b);
    for (let i = 1; i < l.length; i++) worst = Math.min(worst, l[i] - l[i - 1]);
  }
  return worst;
})();
declaredIn(FINAL_FLAT, /tightest gap ([0-9.]+) pull needs ([0-9.]+) and ([0-9.]+) respectively/,
  "the 2026-08-16 note that neither rate floor binds on the re-cut ladder");
assert.ok(worstJitterMinGap / LADDER_GAP_S > RATE_MIN,
  `LD-FLOORS: RATE_MIN (${RATE_MIN}) now BINDS on the departure clock — the tightest gap the `
  + `build can produce is ${worstJitterMinGap.toFixed(5)} pull, which asks for `
  + `${(worstJitterMinGap / LADDER_GAP_S).toFixed(3)} pull/s. A guard that binds is no longer a `
  + 'guard: those rungs stop taking LADDER_GAP_S each and the fit below moves under it. Either a '
  + 'rung pair collapsed or the floor was raised into the working range.');
assert.ok(worstJitterMinGap / ARRIVE_GAP_S > ARRIVE_RATE_MIN,
  `LD-FLOORS: ARRIVE_RATE_MIN (${ARRIVE_RATE_MIN}) now BINDS on the arrival clock — the tightest `
  + `gap the build can produce asks for ${(worstJitterMinGap / ARRIVE_GAP_S).toFixed(3)} pull/s. `
  + 'The same reading as above, on the clock §41 added: a bound floor silently flattens the '
  + 'stagger Hannah asked for in her fifth pass.');

/* LD-FIT — census D7's NUMBER. What the departure clock costs the chapter,
   against the window the wrap actually gives it.

   THE TWO WINDOWS ARE THE ONLY MEASURED INPUTS IN THIS FILE. They are frame
   counts off real wheel-driven wraps and they belong to TEMPO-01, not here;
   the census assigns them there explicitly. What is pure — and what this pin
   owns — is the LEFT side: the cost the ladder and the two clocks produce.

   THE SHIPPED COMMENT'S 1.351 s IS THE PRE-RE-CUT LADDER and is deliberately
   not the anchor; see the header. On the rungs that ship the cost is
   1.1655 s. The 2026-08-16 re-cut is what moved it, and the same note says
   the limiters stay precisely because reading the rungs from the build let
   them survive the re-cut unchanged — which is the claim this pin makes
   checkable. */
/* RE-MEASURED 2026-09-01 on the owner-confirmed ceremonial seam (both wraps
   +/-426.9 deg, 5333 ms delivered laps). The 1.384/1.450 pair was the
   2026-08-21 page's 3.87-4.00 s lap, before the wrap rode the
   navigation-timing conversion — stale against the live page even before the
   seam re-judgment, as the lane ledger recorded. Definitions unchanged:
   DOWN is move-first-frame -> the chapter's own uAmount leaving 1.0 (its
   fade now rides the retire's last light, so the window ends with the
   ladder rather than on a leg coordinate — min over 7 clean trials,
   3221-3252 ms); UP is the chapter's uAmount leaving 0 -> the lap landing
   (min over 2 trials, 4335-4601 ms). Evidence:
   banodoco-brief-v16/evidence/r4-grammar/loop-ceremony/ceremony-window*.json
   (probe r4b-ceremony-window.mjs). */
/* THE UP WINDOW RE-MEASURED AND ITS PIN CONVERTED, 2026-09-01 (final/index.js
   §43 — the owner: on mission -> final "the mushrooms light up when I start,
   then disappear, only to reappear again"). The 4.335 s figure WAS the
   defect: uAmount left 0 at ~1.0 s of the -426.9deg lap because `rise` reads
   the Final LEG's camera x, and the ceremonial lap swings through that
   territory on its way OUT of Mission before crossing it again to land. §43
   holds the arriving lap dark for the origin's own RETIRE_SPAN of the move
   and opens it on its own first light, so uAmount now leaves 0 on the
   genuine approach (measured 4079 ms of a 47..5277 ms motion window, 3/3
   trials: window 1.198 s; evidence
   banodoco-brief-v16/evidence/r6-lapfade/ceremony-window-postfix.json,
   probe r4b-ceremony-window.mjs on :8583).
     The old assertion (departure cost < up window) lost its subject with the
   flash: nothing departs inside the up window any more, and §41 already
   legalised an arrival that outlives its lap ("an ARRIVAL has no window at
   all"). What the re-derived pin holds instead is §43's own load-bearing
   consequence: the arrival clock's full-band cost EXCEEDS the window the
   genuine approach leaves, so the ceremonial arrival is still converging
   when the lap lands and the spread MUST ride the convergence tail
   (`spreadTail`). Its killer: quicken the arrive clock (or re-cut the
   ladder) until the band fits inside the window and the tail machinery goes
   dead silently — this pin reds first and asks for the §43 hand-off to be
   re-read, not for the number to be moved. */
const WRAP_DOWN_WINDOW_S = 3.221;   // final/index.js §40 subject, measured on real driven wraps
const WRAP_UP_WINDOW_S = 1.198;     // §43 subject: first light -> landing on the held lap
const DECLARED_BLEND_COST_S = 1.1655;
const BLEND_COST_TOL_S = 0.010;     // > the 5 ms REV_JIT can move it, < a rung
const blendCost = bandCost(LADDER, clocks().blend);
near(+blendCost.toFixed(4), DECLARED_BLEND_COST_S, BLEND_COST_TOL_S, 'LD-FIT',
  'the seconds the departure clock spends crossing the whole band on the shipped 24 rungs');
assert.ok(blendCost < WRAP_DOWN_WINDOW_S,
  `LD-FIT: the departure clock now spends ${blendCost.toFixed(3)} s crossing the band and the `
  + `wrap DOWN is on screen for ${WRAP_DOWN_WINDOW_S} s. The reveal is cropped mid-retire — a `
  + 'light that goes out after the colony has left frame goes out where nobody can see it. '
  + 'Lower LADDER_GAP_S, or re-measure the window on the page and rewrite it here with the '
  + 'evidence. Do not widen this.');
const arriveCost = bandCost(LADDER, clocks().arrive);
assert.ok(arriveCost > WRAP_UP_WINDOW_S,
  `LD-FIT: the arrival clock crosses the band in ${arriveCost.toFixed(3)} s, INSIDE the wrap `
  + `UP's ${WRAP_UP_WINDOW_S} s first-light window — §43's convergence-tail hand-off `
  + '(`spreadTail`) is dead code and the ceremonial arrival now completes mid-lap. Re-read '
  + 'final/index.js §43 before touching either side of this.');

REPORT.push(['LADDER', [
  `24 rungs, span ${(LADDER[23] - LADDER[0]).toFixed(4)} pull, tightest gap `
  + `${worstJitterMinGap.toFixed(5)} at worst jitter`,
  `blend band ${blendCost.toFixed(4)} s inside the wrap DOWN's ${WRAP_DOWN_WINDOW_S} s `
  + `(${((WRAP_DOWN_WINDOW_S - blendCost) * 1000).toFixed(0)} ms in hand)`,
  `arrive band ${arriveCost.toFixed(4)} s outside the wrap UP's ${WRAP_UP_WINDOW_S} s `
  + `first-light window (tail carries ${((arriveCost - WRAP_UP_WINDOW_S) * 1000).toFixed(0)} ms)`,
  `one-sidedness margin ${(-oneSidednessViolation(LADDER)).toFixed(4)} pull/s worst-case, `
  + 'and 0 violations over 400 generated ladders',
]]);

/* ===================================================================== *
 * 3. EMBER — census D1 and B7, with B6 as a rider. Inspire's three ember
 *    onsets, authored in GATE UNITS, stated in milliseconds.
 *
 * THE TWO ENDS AND WHETHER THEY MEET. THEY DO NOT, AND THIS IS THE EXHIBIT.
 * `LAND_ON`, `LAND_GATE_STEP` and `LAND_GATE_RISE` live inside
 * `createInspire`'s closure. The gate they are thresholds ON is
 * `1 - e^(-COPY_IN_K t)`, and COPY_IN_K lives in journey/constants/copy.js —
 * which journey/chapters/inspire/index.js does not import, has never
 * imported, and cannot import without taking a dependency the chapter
 * contract forbids. The chapter's own comment writes the algebra out by hand
 * and states the answer in milliseconds. Until this file, that algebra had no
 * expression anywhere in code.
 *
 * The rider, census B6: FLIGHT_ENVELOPES.standard.land is a ceiling in
 * copy-arrival.js that decides how many of Inspire's embers may kindle
 * mid-flight. copy-arrival.js says nothing about Inspire; Inspire says "that
 * ceiling is copy-arrival.js's and is not this chapter's to move". Nothing
 * held the two together. EM-FLIGHT does.
 * ===================================================================== */

const { COPY_IN_K, HOTSPOT_ARRIVAL } = await import('../journey/constants/copy.js');
const INSPIRE_SRC = code('journey/chapters/inspire/index.js');
const INSPIRE_FLAT = flat('journey/chapters/inspire/index.js');
const COPY_ARRIVAL_SRC = code('journey/ui/copy-arrival.js');

const LAND_ON = localNum(INSPIRE_SRC, 'LAND_ON', 'inspire/index.js');
const LAND_GATE_STEP = localNum(INSPIRE_SRC, 'LAND_GATE_STEP', 'inspire/index.js');
const LAND_GATE_RISE = localNum(INSPIRE_SRC, 'LAND_GATE_RISE', 'inspire/index.js');

/** The scroll gate's time image: the milliseconds after a settled landing at
 *  which the copy ease — and so the ember gate — reaches `g`. This one
 *  logarithm IS the conversion the two modules never state to each other. */
const gateMs = (g, k = COPY_IN_K) => -Math.log(1 - g) / k * 1000;
/** The thresholds the three embers kindle at, and the gates they reach full
 *  bloom at, in the chapter's own coordinate. */
const onsetGate = (s, o = {}) => (o.landOn ?? LAND_ON) + s * (o.step ?? LAND_GATE_STEP);
const fullGate = (s, o = {}) => onsetGate(s, o) + (o.rise ?? LAND_GATE_RISE);
const onsetsMs = (o = {}) => [0, 1, 2].map((s) => gateMs(onsetGate(s, o), o.k));
const bloomsMs = (o = {}) => [0, 1, 2].map((s) => gateMs(fullGate(s, o), o.k) - gateMs(onsetGate(s, o), o.k));

/* EM-PROV — the driver still reads the gate the way this file models it. */
assert.ok(INSPIRE_SRC.includes('(g - (LAND_ON + s * LAND_GATE_STEP)) / LAND_GATE_RISE'),
  'EM-PROV: inspire/index.js no longer computes its ember gate as '
  + '`(g - (LAND_ON + s * LAND_GATE_STEP)) / LAND_GATE_RISE`. This file re-implements that '
  + 'expression to convert the thresholds into milliseconds; a re-shaped driver needs the '
  + 'conversion re-derived, not the pin re-anchored.');
assert.ok(!/from '(\.\.\/)+constants\/copy\.js'/.test(INSPIRE_SRC)
  || !/COPY_IN_K/.test(INSPIRE_SRC.split('\n').filter((l) => l.startsWith('import')).join('\n')),
  'EM-PROV: inspire/index.js now imports COPY_IN_K. That is a WELCOME change — the conversion '
  + 'would then have an expression in production and this file would be the second copy. Read '
  + "the chapter contract's rule on timing constants crossing module lines, then either keep the "
  + 'import and retire this section, or keep this section and drop the import.');

/* EM-ONSETS — census D1's NUMBERS. Every figure the shipped comment declares,
   recomputed from COPY_IN_K and the three gate constants. The comment writes
   "0.10 / 0.4375 / 0.775 kindle at 44 / 240 / 622 ms" — so a chapter edit that
   moves a threshold, or a constants edit that moves the breathe rate, is
   caught here in whichever file it happens.

   RE-DERIVED 2026-08-26 (INSPIRE-ONSET, owner report #35: the icons should
   come in sooner, "the speed is nice right now"). The onsets were 93/289/671
   and are now 44/240/622. THE GAPS AND THE BLOOMS DID NOT MOVE AND THAT IS
   THE POINT OF THE PIN HERE: 195.835 / 381.788 ms and 80.155 / 136.877 /
   501.655 ms, identical doubles before and after, because the edit scaled
   every gate COMPLEMENT by one λ = 1.125 and that is a rigid translation in
   time on 1 - e^(-K t). The three declared figures this section reads split
   cleanly along that line — the ONSETS were re-baselined with the change and
   the GAPS and BLOOMS were not touched at all — which is why the mutants
   below re-prove the onset pin in both directions on both constants rather
   than resting on the fact that the suite is green. */
const [declaredK] = declaredIn(INSPIRE_FLAT, /1 - e\^\(-COPY_IN_K t\) with COPY_IN_K = ([0-9.]+)\/s/,
  "the gate's rate constant, as inspire/index.js quotes it from constants/copy.js");
near(COPY_IN_K, declaredK, 1e-9, 'EM-ONSETS',
  "COPY_IN_K as constants/copy.js exports it, against the value inspire/index.js's comment quotes "
  + '— the two modules do not import each other, so this is the only place the quote is checked');
const declaredOnsets = declaredIn(INSPIRE_FLAT, /kindle at ([0-9]+) \/ ([0-9]+) \/ ([0-9]+) ms/,
  "D1's three ember onsets");
onsetsMs().forEach((ms, i) => near(Math.round(ms), declaredOnsets[i], 1, 'EM-ONSETS',
  `ember ${i + 1}'s onset, at gate ${onsetGate(i).toFixed(2)}`));
const declaredGaps = declaredIn(INSPIRE_FLAT, /gaps of ~([0-9]+) then ~([0-9]+) ms/,
  "D1's two onset gaps");
const gaps = [onsetsMs()[1] - onsetsMs()[0], onsetsMs()[2] - onsetsMs()[1]];
gaps.forEach((ms, i) => near(Math.round(ms), declaredGaps[i], 1, 'EM-ONSETS',
  `the gap between ember ${i + 1} and ember ${i + 2}`));
const [declaredRise, ...declaredBlooms] = declaredIn(INSPIRE_FLAT,
  /RISE ([0-9.]+) keeps each ember's KINDLE quick[^0-9]{1,4}([0-9]+) \/ ([0-9]+) \/ ([0-9]+) ms of bloom/,
  "D1's three bloom durations");
near(LAND_GATE_RISE, declaredRise, 1e-9, 'EM-ONSETS', 'LAND_GATE_RISE as the comment quotes it');
bloomsMs().forEach((ms, i) => near(Math.round(ms), declaredBlooms[i], 1, 'EM-ONSETS',
  `ember ${i + 1}'s bloom, from gate ${onsetGate(i).toFixed(2)} to ${fullGate(i).toFixed(2)}`));
const [declaredTopGate, declaredTopMs] = declaredIn(INSPIRE_FLAT,
  /third ember reaches full at gate ([0-9.]+), t[^0-9]{1,3}([0-9]+) ms/,
  "D1's third ember settling point");
near(+fullGate(2).toFixed(2), declaredTopGate, 1e-9, 'EM-ONSETS',
  'the gate the third ember reaches full bloom at');
near(Math.round(gateMs(fullGate(2))), declaredTopMs, 1, 'EM-ONSETS',
  'the milliseconds at which the third ember reaches full bloom');

/* EM-REGIME — census D1's DESIGN. Two properties, each with its own failure,
   neither of them a restatement of the numbers above.

   HEADROOM. The gate saturates: it never reaches 1, so a threshold at or
   above 1 is an ember that never lights. The third ember reaches full at
   0.9325 today — 0.0675 of headroom. The chapter's own reason is sharper than
   "it works": at a settled dt = 0 capture the gate is pinned to 1, so an
   ember whose full-bloom gate is below 1 reads a = 1 EXACTLY and every
   frozen golden is unchanged by construction. Push it to 1 and the goldens
   move — silently, on a capture path nobody watches while retiming a beat.

   THE MARGIN GREW ON 2026-08-26 (INSPIRE-ONSET): it was 0.94 and 0.06. The
   retiming scaled the complements by λ = 1.125 and the top complement is one
   of them, so 0.06 -> 0.0675. An EARLIER sequence on this gate is a SAFER one
   by this pin's axis, and that direction is worth stating because the reflex
   reading — "the beat was moved, check the goldens" — has the sign backwards.
   The goldens were unchanged by construction and were confirmed unchanged.

   THIS PIN IS ONE-SIDED BY CONSTRUCTION and L4 below demonstrates it: every
   downward perturbation of the three constants increases the headroom, so no
   mutant can red EM-REGIME from below. Its two failure DIRECTIONS are the two
   asserts, not two signs — overshoot past saturation (gate >= 1) and a margin
   thinned into the width of a single retune (gate in [0.96, 1)) — and MUT-RISE
   and MUT-RISE-THIN drive one each.

   WIDENING is deliberately NOT pinned. On a saturating exponential, equal
   steps in gate units always widen in time, so "the cadence slows into rest"
   is true of any thresholds and a pin on it would be a tautology wearing a
   law's clothes. It is recorded here so the omission is a decision on the
   record rather than a gap. */
assert.ok(fullGate(2) < 1,
  `EM-REGIME: the third ember reaches full bloom at gate ${fullGate(2).toFixed(3)}, at or past the `
  + 'saturation of `1 - e^(-COPY_IN_K t)`, so it never completes on the live path and a settled '
  + 'dt = 0 capture no longer reads a = 1 exactly. Every frozen golden through Inspire changes. '
  + 'Lower LAND_ON, LAND_GATE_STEP or LAND_GATE_RISE — do not re-bless the goldens.');
assert.ok(1 - fullGate(2) >= 0.04,
  `EM-REGIME: the third ember's full-bloom gate leaves only ${(1 - fullGate(2)).toFixed(3)} of `
  + 'headroom under saturation. It still completes, but the margin is inside the width of a '
  + 'single retune, and the failure on the far side is a golden change on the capture path. '
  + 'The shipped margin is 0.0675.');

/* EM-FLIGHT — census B6, the rider. The ceiling that decides how many embers
   kindle mid-flight lives in journey/ui/copy-arrival.js and is not exported;
   the sentence explaining what it does to Inspire lives in
   journey/chapters/inspire/index.js. Moving 0.38 to 0.55 silently gives
   Inspire two mid-flight embers instead of one — the census's own words, and
   there is nothing in copy-arrival.js that would tell an editor so.

   BOTH BRACKETS MOVED ON 2026-08-26 (INSPIRE-ONSET) AND THEY MOVED THE SAME
   WAY, WHICH IS NOT THE SAME AS SAFELY. The whole sequence now sits lower in
   gate units, so the ceiling's usable band is [0.2575, 0.4375) where it was
   [0.34, 0.50). Below, the first ember completes sooner and there is MORE
   room: the ceiling could fall to 0.2575 before cutting it off. Above, the
   second ember waits nearer and there is LESS: 0.0575 of clearance instead
   of 0.12, and the census's 0.55 scenario is now reached at 0.4375. That is
   the one real cost of the retiming and the reason MUT-CEIL-DOWN below had to
   be re-derived — at 0.30 it no longer fires, because 0.30 is now INSIDE the
   band. A mutant left at a value the new baseline has made legal is a mutant
   that has quietly stopped proving anything. */
const FLIGHT_LAND = (() => {
  const m = COPY_ARRIVAL_SRC.match(/standard: \{ onset: [0-9.]+, land: ([0-9.]+) \}/);
  assert.ok(m, 'EM-PROV: copy-arrival.js no longer declares FLIGHT_ENVELOPES.standard as '
    + '`{ onset: N, land: N }`; this file reads `land` from source because the table is not exported.');
  return Number(m[1]);
})();
const [declaredCap] = declaredIn(INSPIRE_FLAT, /caps the gate at ([0-9.]+) until the camera has landed/,
  "B6's flight ceiling, as inspire/index.js quotes it from copy-arrival.js");
near(FLIGHT_LAND, declaredCap, 1e-9, 'EM-FLIGHT',
  "FLIGHT_ENVELOPES.standard.land as copy-arrival.js declares it, against the value "
  + "inspire/index.js's comment quotes — the two modules never refer to each other in code");
assert.ok(fullGate(0) <= FLIGHT_LAND,
  `EM-FLIGHT: the first ember reaches full bloom at gate ${fullGate(0).toFixed(3)}, above `
  + `copy-arrival.js's flight ceiling of ${FLIGHT_LAND}. On a nav jump it is now cut off `
  + 'mid-kindle and finishes only when the camera lands — a light that starts, stops, and starts '
  + 'again. Inspire says the ceiling "is not this chapter\'s to move"; whichever end moved, the '
  + 'two have to be decided together.');
assert.ok(onsetGate(1) > FLIGHT_LAND,
  'EM-FLIGHT: the SECOND ember now kindles under the flight ceiling too (onset '
  + `${onsetGate(1).toFixed(3)} <= ${FLIGHT_LAND}). Inspire's design is that exactly one ember `
  + 'kindles mid-flight and "the pair behind it waits for the entry envelope"; two of them '
  + 'kindling in the air is the lumpiness ICON-ARRIVAL was filed against, arriving from the '
  + 'other module.');

/* EM-SATURATE — census B7. `HOTSPOT_ARRIVAL.formMs` is a floor in SECONDS
   over a scene gate denominated in GATE UNITS, and its justification is the
   speed of that gate.

   THE DECLARED FIGURE IN constants/copy.js WAS STALE AND THIS PIN IS STILL
   THE ANCHOR. "Inspire's first ember saturates its gate in ~116 ms on a
   settled arrival" was true at b711a0a, where LAND_ON and LAND_GATE_RISE were
   0.18 and 0.20 (116.5 ms by this file's own arithmetic). TIMING-01 then
   retimed them to 0.20 and 0.14 and the figure did not travel. The argument
   was unaffected — 80 ms is more of a pop, not less — so `formMs` was never
   in question, only the figure, and this file pinned the recomputed number
   and handed the sentence to its owner. The owner amended it on 2026-08-26.

   AND THEN THE SAME DAY THE CONSTANTS MOVED AGAIN AND THIS NUMBER DID NOT.
   INSPIRE-ONSET took LAND_ON 0.20 -> 0.10 and LAND_GATE_RISE 0.14 -> 0.1575,
   which sounds exactly like the edit that went stale last time. It is not,
   and the difference is the whole reason the sentence survived: both were
   scaled by one λ = 1.125 applied to the gate COMPLEMENTS, and on
   1 - e^(-K t) that is a rigid translation in time. The onset moved 93.0 ->
   43.9 ms and the full bloom 173.1 -> 124.1 ms; the SPAN between them is
   80.2 ms in both. Had RISE been left at 0.14 while LAND_ON moved — the
   obvious way to answer "make it sooner" — this would have become 70.4 ms
   and gone stale for the second time in one week. Recomputing it here is
   what would have made that visible: nothing else in the tree computes this
   quantity. (80.2, not the 80.1 CONV-02 first wrote: the value is 80.155 ms
   and rounds up at one decimal. Corrected in the same pass as the amended
   sentence so the two ends read the same digits; the quantity is unmoved and
   the tolerance is untouched.) */
const DECLARED_SATURATION_MS = 80.2;
const SATURATION_TOL_MS = 1;
near(+bloomsMs()[0].toFixed(1), DECLARED_SATURATION_MS, SATURATION_TOL_MS, 'EM-SATURATE',
  "the milliseconds Inspire's first ember takes to saturate its scene gate on a settled arrival");

/* EM-PERFORMED — census B7's REGIME. `formMs` is a FLOOR under
   `min(scene, performed)`, so it only does anything while it is the binding
   term. Two ends, two different failures:

   THE VACUITY END. If formMs ever falls to the scene gate's own speed, the
   `min` returns the scene gate and ICON-ARRIVAL is silently retired — the
   marker goes back to riding `h.a`, which is the exact defect Hannah filed
   ("still show up really fast"). The mechanism would still be there, still
   green, buying nothing. Five times the scene saturation is the margin the
   shipped tempo runs at (700 against 80).

   THE CEREMONIAL END. The owner chose `grand` specifically so that "the third
   [is] still settling as the copy finishes breathing in". That is a claim
   about THREE modules — inspire/index.js's third onset, constants/copy.js's
   formMs, and the COPY_IN_K envelope in constants/copy.js and
   ui/copy-arrival.js — and none of them states it. Here it is arithmetic.
   The settled-path image of the copy's own 0.9 crossing is used, which is the
   same clock the onsets above are computed on; tools/test-rest-composition.mjs
   measures the real arrival at 1049 ms against this 959 ms, so the real
   margin is wider than the one pinned and this end is the conservative
   reading. */
const sceneSaturationMs = bloomsMs()[0];
const copyBreatheMs = gateMs(0.9);
assert.ok(HOTSPOT_ARRIVAL.formMs >= 5 * sceneSaturationMs,
  `EM-PERFORMED: formMs is ${HOTSPOT_ARRIVAL.formMs} ms against a scene gate that saturates in `
  + `${sceneSaturationMs.toFixed(0)} ms. It is a FLOOR under min(scene, performed): at less than a `
  + 'few multiples of the gate it stops being the binding term and ICON-ARRIVAL is retired '
  + 'without anything being deleted — the marker rides `h.a` again and the entrance is a pop, '
  + 'which is the owner report the mechanism was built for.');
assert.ok(onsetsMs()[2] + HOTSPOT_ARRIVAL.formMs > copyBreatheMs,
  `EM-PERFORMED: the third marker now finishes forming at `
  + `${(onsetsMs()[2] + HOTSPOT_ARRIVAL.formMs).toFixed(0)} ms, before the copy finishes breathing `
  + `in at ${copyBreatheMs.toFixed(0)} ms. The owner chose the 'grand' tempo for the opposite `
  + 'reading — "three deliberate acts, the third still settling as the copy finishes breathing '
  + 'in". Either the tempo was re-chosen or a gate constant moved; both are decisions, and both '
  + 'owe constants/copy.js a rewritten sentence.');

REPORT.push(['EMBER', [
  `onsets ${onsetsMs().map((m) => m.toFixed(0)).join(' / ')} ms at gates `
  + `${[0, 1, 2].map((s) => onsetGate(s).toFixed(2)).join(' / ')}`,
  `blooms ${bloomsMs().map((m) => m.toFixed(0)).join(' / ')} ms; third full at gate `
  + `${fullGate(2).toFixed(2)} (${(1 - fullGate(2)).toFixed(2)} of headroom)`,
  `flight ceiling ${FLIGHT_LAND}: ember 1 completes at ${fullGate(0).toFixed(2)}, `
  + `ember 2 waits at ${onsetGate(1).toFixed(2)}`,
  `formMs ${HOTSPOT_ARRIVAL.formMs} ms over a ${sceneSaturationMs.toFixed(0)} ms scene gate; `
  + `third marker settles at ${(onsetsMs()[2] + HOTSPOT_ARRIVAL.formMs).toFixed(0)} ms against the `
  + `copy's ${copyBreatheMs.toFixed(0)} ms`,
]]);

/* ===================================================================== *
 * 4. ORBIT — census rider. journey/portrait.js's zero-field head against
 *    journey/chapters/inspire/camera.js's arrival dead band.
 *
 * THE TWO ENDS AND WHY THEY NEVER MEET. inspire/camera.js authors the
 * arrival's dead band as ARRIVAL_DEAD, a FRACTION of the arrival gesture —
 * the stretch at the head of the leg that holds the hero pose exactly and
 * buys zero world units of path. journey/portrait.js's three correction
 * ladders (KEYS, TAB_KEYS, PHONE_KEYS) all begin with a zero key that must
 * sit at the p where that band ENDS: the file's own note says the field is
 * exactly zero at and below the orbit start because below it the camera is
 * the hero's pose verbatim, and a zero key placed late leaves a window of
 * real orbit with the correction still pinned at zero.
 *
 * portrait.js CANNOT import the fraction. It is deliberately three-free so
 * that DOM-free suites can import it in Node, and inspire/camera.js imports
 * three. So the fraction is DECLARED TWICE, in two files that never refer to
 * each other — CONTRIBUTING.md §5's own pre-fault definition — and this is
 * where the two ends are computed against each other.
 *
 * WHAT IT BOUGHT, since tools/ mass is a gated number. Until 2026-08-30 the
 * orbit start was a LITERAL 0.040 in portrait.js, which was the product only
 * while the Inspire rest sat at p 0.26. Equip's arrival moved that rest to
 * 0.20 and the product to 0.0308; the literal would have gone on passing
 * every suite in the tree while leaving 0.0092 of p — nearly a third of the
 * dead band's own width — of real orbit with all three ladders pinned at zero.
 * Nothing in tools/ could see it. This pin is what makes the rest a route
 * lookup rather than a copied number, and it reds if either end moves alone.
 * ===================================================================== */
const PORTRAIT_SRC = code('journey/portrait.js');
const ORBIT_DEAD_FRACTION = localNum(PORTRAIT_SRC, 'ORBIT_DEAD_FRACTION', 'portrait.js');
const ARRIVAL_DEAD = localNum(code('journey/chapters/inspire/camera.js'),
  'ARRIVAL_DEAD', 'inspire/camera.js');

near(ORBIT_DEAD_FRACTION, ARRIVAL_DEAD, 1e-12, 'OR-FRACTION',
  "portrait.js's copy of inspire/camera.js's arrival dead band");

/* THE PRODUCT, not just the two factors. The number that actually ships is
   the fraction times the LIVE Inspire rest, and the failure this catches is a
   route re-timing that moves the rest while both declarations sit still. */
const orbitP0 = ARRIVAL_DEAD * restProgress('inspire');
const [declaredOrbitP0] = declaredIn(flat('journey/portrait.js'),
  /ARRIVAL_DEAD, a FRACTION of the arrival, and the product it forms with the live Inspire rest is ([0-9.]+)\./,
  "portrait.js's stated product of the dead fraction and the Inspire rest");
near(orbitP0, declaredOrbitP0, 5e-4, 'OR-PRODUCT',
  "the orbit start portrait.js's own prose computes against the live route");

/* REGIME, so a legitimate re-timing that moves the number a little does not
   quietly become a different design: the zero head must stay INSIDE the
   Mission leg and must not collapse onto p 0. A head at 0 would put the
   correction ladder's first key on the hero pose itself, where the field is
   the hero's own responsive table and not this file's. */
assert.ok(orbitP0 > 0 && orbitP0 < REST_STOPS[1],
  `OR-REGIME: the orbit start is ${orbitP0.toFixed(4)}, outside the open interval `
  + `(0, ${REST_STOPS[1]}) between the hero and the Inspire rest. The zero head belongs inside `
  + 'the arrival it is the dead band OF.');

/* ALL THREE LADDERS SHARE THE HEAD, asserted rather than assumed. The
   landscape field and the tablet/phone bands are three separate ladders and
   the note above is about all of them; a head that moved on one would leave
   the other two describing a different camera. */
const orbitHeads = [...PORTRAIT_SRC.matchAll(/\{\s*p:\s*ORBIT_P0\s*,/g)].length;
assert.equal(orbitHeads, 3,
  `OR-LADDERS: ${orbitHeads} of portrait.js's ladders begin at ORBIT_P0, not 3. KEYS, TAB_KEYS `
  + 'and PHONE_KEYS all bloom off the same zero head; one of them has been re-anchored to a '
  + 'literal, or a fourth ladder arrived without one.');

REPORT.push(['ORBIT', [
  `dead fraction ${ARRIVAL_DEAD} declared in both inspire/camera.js and portrait.js`,
  `x Inspire rest ${restProgress('inspire')} = orbit start ${orbitP0.toFixed(4)} `
  + `(prose says ${declaredOrbitP0})`,
  `3 ladders share the head; regime (0, ${REST_STOPS[1]}) holds`,
]]);

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
if (!PROVE) {
  console.log('Declared conversions: PASS');
  for (const [section, lines] of REPORT) {
    console.log(`  ${section}`);
    for (const l of lines) console.log(`    ${l}`);
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * --prove-failure — every pin names its killer, and the null runs first.
 *
 * Each mutant is scored on ITS OWN AXIS, never on "something moved". Where a
 * mutant is expected to red one pin and leave a neighbour green, that split
 * is asserted in both directions — a mutant that reddens everything has
 * proved that the pins are one pin written three times.
 * ------------------------------------------------------------------ */
console.log('\n--- mutants: the NULL CONTROLS run first and must NOT fire ---\n');

/* ---- BRAKE axes.

   WHAT THESE MUTANTS PERTURB, AND WHY THAT IS ENOUGH. A pure suite cannot
   rewrite a module binding, so the mutants below move THIS FILE'S
   recomputation of the solve while the rig keeps running the shipped one.
   BR-MECH is the pin that says the two are the same thing — to four decimal
   places, on all four legs, including the un-entried control where it
   predicts the bare SNAP_K creep — so a mutant that moves the recomputation
   and reds BR-MECH has proved BR-MECH is load-bearing rather than vacuous.

   THE OTHER DIRECTION WAS PROVED SEPARATELY AND IS NOT INFERRED. Twelve real
   production constants were moved one at a time on a staged copy of the tree
   (journey/ + tools/ + vendor/, scratch, never the working tree) and each red
   its own pin: ARRIVE_RATE -> LD-ONESIDED, ARRIVE_RATE_MIN -> LD-REGIME,
   LADDER_GAP_S -> LD-KINDLE then LD-FIT, BLEND_REVEAL_RATE -> LD-KINDLE,
   FORWARD_BRAKE_TAIL_S / SNAP_K / SNAP_DEAD_P -> BR-NUMBER, LAND_ON,
   LAND_GATE_STEP and LAND_GATE_RISE -> EM-ONSETS, FLIGHT_ENVELOPES.standard.land
   -> EM-FLIGHT, COPY_IN_K -> EM-ONSETS, formMs -> EM-PERFORMED. Note which pin
   the budget edit reds: moving FORWARD_BRAKE_TAIL_S moves the rig AND the
   recomputation together, so BR-MECH correctly stays green — the mechanism is
   intact — and BR-NUMBER reds because the prose no longer describes what
   ships. That split is the whole design. */
const BR_LEG = BRAKE.find((b) => b.name === 'equip>connect' && b.gesture === 'flick');
const brMechFires = (o = {}) => {
  const k = o.k ?? solveK(BR_LEG.pRate, o.tailS ?? BR_LEG.tailS, o);
  return Math.abs(k / (1 - k * DT) - BR_LEG.keffMeasured) > 0.001;
};
const brRegimeFires = (o = {}) => {
  const tailS = o.tailS ?? BR_LEG.tailS;
  const k = o.k ?? solveK(BR_LEG.pRate, tailS, o);
  const s = (tailS - deliveredTailS(BR_LEG.pRate, k, o.dead)) / tailS;
  return !(s > SHORTFALL_LO && s < SHORTFALL_HI);
};
/* BR-NUMBER's own axis is the shipped prose against the rig, so its killer
   perturbs the PROSE — the only end of that comparison a pure suite can
   move. Nothing is written to disk. */
/* The subject leg of the prose comparison is Inspire -> Equip since 2026-08-30
   — the half of the retired Inspire -> Connect entry whose delivered tail the
   dial paragraph now quotes. BR_LEG stays equip>connect (it is the K_eff
   ladder's row), so this reader takes its own. */
const BR_PROSE_LEG = BRAKE.find((b) => b.name === 'inspire>equip' && b.gesture === 'flick');
const brNumberFires = (src) => {
  const m = src.match(/delivers ([0-9]+) ms on Inspire -> Equip/);
  return !m || Math.abs(Number(m[1]) - BR_PROSE_LEG.tailMs) > TAIL_TOL_MS;
};

/* ---- LADDER axes. */
const ldOneSidedFires = (o = {}) => oneSidednessViolation(LADDER, o) > 0;
const ldRegimeFires = (o = {}) => {
  const gapOk = (o.arriveGapS ?? ARRIVE_GAP_S) >= (o.ladderGapS ?? LADDER_GAP_S);
  const rateOk = (o.arriveRate ?? ARRIVE_RATE) <= (o.blendRate ?? BLEND_REVEAL_RATE);
  const floorOk = (o.arriveRateMin ?? ARRIVE_RATE_MIN) <= (o.rateMin ?? RATE_MIN);
  return !(gapOk && rateOk && floorOk) || randomLadderWorst(o) > 0;
};
const ldFitFires = (o = {}) =>
  Math.abs(bandCost(LADDER, clocks(o).blend) - DECLARED_BLEND_COST_S) > BLEND_COST_TOL_S;
const ldKindleFires = (o = {}) =>
  Math.round(REVEAL_W / (o.blendRate ?? BLEND_REVEAL_RATE) * 1000) !== declaredKindleMs;

/* ---- EMBER axes. */
const emOnsetsFires = (o = {}) => onsetsMs(o).some((ms, i) => Math.abs(Math.round(ms) - declaredOnsets[i]) > 1)
  || bloomsMs(o).some((ms, i) => Math.abs(Math.round(ms) - declaredBlooms[i]) > 1);
const emRegimeFires = (o = {}) => !(fullGate(2, o) < 1 && 1 - fullGate(2, o) >= 0.04);
const emFlightFires = (o = {}) => {
  const land = o.flightLand ?? FLIGHT_LAND;
  return !(fullGate(0, o) <= land && onsetGate(1, o) > land);
};
const emPerformedFires = (o = {}) => {
  const form = o.formMs ?? HOTSPOT_ARRIVAL.formMs;
  return !(form >= 5 * bloomsMs(o)[0] && onsetsMs(o)[2] + form > gateMs(0.9, o.k));
};

/* ---- ORBIT axes. Both ends of this conversion are TEXT — one is a literal
   in a file the suite cannot import for its own reason, the other a sentence
   — so the killers perturb the recomputation and the prose, the only ends a
   pure suite can move. Nothing is written to disk. */
const orFractionFires = (o = {}) =>
  Math.abs((o.portraitFraction ?? ORBIT_DEAD_FRACTION) - (o.arrivalDead ?? ARRIVAL_DEAD)) > 1e-12;
const orProductFires = (o = {}) =>
  Math.abs((o.arrivalDead ?? ARRIVAL_DEAD) * (o.inspireRest ?? restProgress('inspire'))
    - (o.declared ?? declaredOrbitP0)) > 5e-4;
const orRegimeFires = (o = {}) => {
  const p0 = (o.arrivalDead ?? ARRIVAL_DEAD) * (o.inspireRest ?? restProgress('inspire'));
  return !(p0 > 0 && p0 < REST_STOPS[1]);
};

const MUTANTS = [
  ['NULL-ORBIT', 'the Inspire rest is nudged by half the product pin\'s own tolerance '
    + '(0.20 -> 0.2010, worth 0.00015 of p in the product) — inside every ORBIT pin, so a '
    + 'route re-timing too small to matter must not fire one',
  false, () => orProductFires({ inspireRest: 0.2010 }) || orRegimeFires({ inspireRest: 0.2010 })
    || orFractionFires({})],
  ['MUT-OR-FRACTION', 'portrait.js\'s copy of the dead fraction drifts one part in a thousand '
    + '(0.153846 -> 0.153) while inspire/camera.js keeps the original — the duplicated-constant '
    + 'failure this pin exists for, and the one no other suite in the tree can see',
  true, () => orFractionFires({ portraitFraction: 0.153 })],
  ['MUT-OR-PRODUCT', 'the ROUTE moves under both declarations: the Inspire rest goes back to '
    + 'its pre-Equip 0.26 with the fraction and the prose untouched. This is the live defect '
    + 'the pin was written for, and it fires the product WITHOUT firing the fraction',
  true, () => orProductFires({ inspireRest: 0.26 })],
  ['MUT-OR-PRODUCT-SPLIT', 'and the split is asserted in the other direction too: the same '
    + 'route move must leave OR-FRACTION green, because both copies of the fraction still agree '
    + 'with each other — one pin, not two names for one pin',
  false, () => orFractionFires({ inspireRest: 0.26 })],
  ['MUT-OR-REGIME', 'the dead band is zeroed — the fraction goes to 0, which puts the zero head '
    + 'on the hero pose itself where the correction field is the hero\'s own responsive table '
    + 'and not portrait.js\'s',
  true, () => orRegimeFires({ arrivalDead: 0 })],
  ['NULL-BRAKE', 'a route constant no clock in this section reads is perturbed '
    + '(the backward COMMIT_BRAKE_TAIL_S arm, which brakeK only reaches on dir < 0)',
  false, () => brMechFires({}) || brRegimeFires({}) || brNumberFires(ROUTE_SRC)],
  ['NULL-LADDER', 'RATE_FAST is doubled — SHARED by both clocks below the first rung, '
    + 'so it cancels out of the one-sidedness exactly and must not fire it',
  false, () => ldOneSidedFires({}) || ldRegimeFires({})],
  ['NULL-EMBER', 'HOTSPOT_STAGGER_MS is perturbed — a copy constant on the marker\'s own '
    + 'clock that neither the ember gate nor formMs reads',
  false, () => emOnsetsFires({}) || emRegimeFires({}) || emFlightFires({}) || emPerformedFires({})],

  /* --- BRAKE. The first two are the finding this order was sent to settle. */
  ['MUT-CONVERGE', 'THE FALSE COMMENT ACTED ON — journey/scroll.js says the solve is "one fixed-'
    + 'point iteration from SNAP_K (the log is flat, a second changes nothing)". Iterate it to '
    + 'its actual fixed point: K 8.648 -> 6.707 and the tail becomes the declared 350 ms exactly, '
    + 'so the shortfall is 0 and route.js\'s dial framing is false. BR-REGIME must see it',
  true, () => brRegimeFires({ k: convergedK(BR_LEG.pRate, BR_LEG.tailS) })
      && brMechFires({ k: convergedK(BR_LEG.pRate, BR_LEG.tailS) })],
  ['MUT-ITER2', 'THE SAME COMMENT READ LITERALLY — run exactly one MORE iteration, which it says '
    + 'changes nothing: K 8.648 -> 5.981 (-31%) and the delivered tail goes 183 -> 412 ms, past '
    + 'the budget in the other direction',
  true, () => brRegimeFires({ iterations: 2 }) && brMechFires({ iterations: 2 })],
  ['MUT-DIAL', 'the budget is tightened in the recomputation only (0.35 -> 0.25): BR-MECH '
    + 'reddens because the solve no longer predicts the rig, while the shortfall stays at 42% '
    + 'and BR-REGIME correctly stays GREEN — the drift/design split the two pins exist for. On '
    + 'a REAL edit to FORWARD_BRAKE_TAIL_S both ends move together and it is BR-NUMBER that '
    + 'reds (proved on the staged tree: delivered 100 ms against a declared 183)',
  true, () => brMechFires({ tailS: 0.25 }) && !brRegimeFires({ tailS: 0.25 })],
  ['MUT-SNAPK', 'the global spring is stiffened (SNAP_K 3.4 -> 6.0), which moves the engage point '
    + 'the solve is taken at without touching the budget',
  true, () => brMechFires({ snapK: 6.0 })],
  ['MUT-DEAD', 'the settle dead band is widened (SNAP_DEAD_P 0.0015 -> 0.006) in the module '
    + 'route.js does not import, which moves both the solve and where the creep stops: K 8.648 '
    + '-> 4.687. BR-MECH sees it; BR-REGIME does NOT, because the shortfall only falls to 20% '
    + 'and that is still the design — scored on the one axis it actually drives',
  true, () => brMechFires({ dead: 0.006 })],
  ['MUT-PROSE', 'BR-NUMBER\'s own killer, and the only end of that comparison a pure suite can '
    + 'move: route.js\'s "delivers 233 ms on Inspire -> Equip" is rewritten to 270 in a copy '
    + 'held in memory. Nothing is written to disk',
  true, () => brNumberFires(ROUTE_SRC.replace('delivers 233 ms on Inspire', 'delivers 270 ms on Inspire'))],
  ['MUT-PROSE-NULL', 'and its own null: rewriting the figure to a value inside the 1 ms tolerance '
    + '(233 -> 233) must NOT fire, so MUT-PROSE is proved to be about the NUMBER and not about '
    + 'the string having been touched',
  false, () => brNumberFires(ROUTE_SRC.replace('delivers 233 ms on Inspire', 'delivers 233 ms on Inspire'))],

  /* --- LADDER. */
  ['MUT-GAP', 'the arrival stagger is cut below the departure stagger (ARRIVE_GAP_S 0.130 -> '
    + '0.030), inverting the first of §41\'s three orderings. LD-ONESIDED stays GREEN and that '
    + 'is the finding: on the shipped rungs the arrival clock is pinned at its 0.42 ceiling '
    + 'everywhere, so the broken ordering is invisible until a ladder with wider gaps arrives. '
    + 'LD-REGIME must red on the ordering itself',
  true, () => ldRegimeFires({ arriveGapS: 0.030 }) && !ldOneSidedFires({ arriveGapS: 0.030 })],
  ['MUT-RATE', 'the arrival kindle is raised past the departure ceiling (ARRIVE_RATE 0.42 -> 1.2): '
    + 'an arriving body lights faster than a departing one',
  true, () => ldOneSidedFires({ arriveRate: 1.2 }) && ldRegimeFires({ arriveRate: 1.2 })],
  ['MUT-FLOOR', 'THE MUTANT LD-REGIME EXISTS FOR — the arrival guard is raised above the '
    + 'departure guard (ARRIVE_RATE_MIN 0.09 -> 0.40). Neither floor binds on the shipped ladder, '
    + 'so LD-ONESIDED stays GREEN and sees nothing; the design is broken and every future rung '
    + 're-cut can expose it. LD-REGIME must red on the orderings AND on the generated ladders',
  true, () => ldRegimeFires({ arriveRateMin: 0.40 }) && !ldOneSidedFires({ arriveRateMin: 0.40 })],
  ['MUT-LADGAP', 'LADDER_GAP_S 0.040 -> 0.045, the value §40 tested and rejected: the band cost '
    + 'moves 1.166 -> 1.224 s. LD-FIT must see it while the one-sidedness stays green',
  true, () => ldFitFires({ ladderGapS: 0.045 }) && !ldOneSidedFires({ ladderGapS: 0.045 })],
  ['MUT-KINDLE', 'BLEND_REVEAL_RATE 1.0 -> 1.5: the per-body kindle goes 160 -> 107 ms, so '
    + 'LD-KINDLE reddens; the arrival is still the slower clock so LD-ONESIDED stays green',
  true, () => ldKindleFires({ blendRate: 1.5 }) && !ldOneSidedFires({ blendRate: 1.5 })],

  /* --- EMBER. Re-proved in both directions on both chapter constants at the
     2026-08-26 baseline, because INSPIRE-ONSET re-baselined EM-ONSETS in the
     same commit as the change it polices and a pin re-anchored that way has
     to earn its authority back rather than inherit it. The four onset mutants
     below are the earning: LAND_ON and LAND_GATE_STEP, each moved up and each
     moved down, each landing on EM-ONSETS ALONE while EM-REGIME and EM-FLIGHT
     stay green — so the re-baselined figure is discriminating in every
     direction it can be approached from, not merely satisfied by the values
     that were written next to it. */
  ['MUT-ON-LATE', 'THE OWNER REPORT PARTLY UN-ANSWERED — LAND_ON 0.10 -> 0.12, a fifth of the way '
    + 'back towards the 0.20 that was too late. The onsets move 44/240/622 -> 53/255/660 ms and '
    + 'EM-ONSETS reddens on all three; the headroom is still 0.0475 and the flight brackets still '
    + 'hold, so EM-REGIME and EM-FLIGHT correctly stay green. This is the direction the report '
    + 'was filed against and it is now caught to within a millisecond',
  true, () => emOnsetsFires({ landOn: 0.12 })
      && !emRegimeFires({ landOn: 0.12 }) && !emFlightFires({ landOn: 0.12 })],
  ['MUT-ON-EARLY', 'the same constant the other way — LAND_ON 0.10 -> 0.06, onsets 26/211/553 ms. '
    + 'The direction of the fix is not a licence to keep going: a pin that only reds when a beat '
    + 'moves LATE would have been re-anchored into a one-way ratchet by this order. EM-ONSETS '
    + 'must red here too, and the neighbours must stay green',
  true, () => emOnsetsFires({ landOn: 0.06 })
      && !emRegimeFires({ landOn: 0.06 }) && !emFlightFires({ landOn: 0.06 })],
  ['MUT-STEP', 'THE NAIVE READING OF THE ORDER — LAND_GATE_STEP left at its pre-order 0.30 while '
    + 'LAND_ON alone is lowered to 0.10. That is what "make the first one sooner" looks like if '
    + 'the gate is treated as linear, and it is wrong in exactly the way the owner ruled out: the '
    + 'onsets become 44/213/502 ms and the approved cadence CONTRACTS from 196/382 to 169/289 ms '
    + 'gaps. EM-ONSETS reddens on the second and third onsets while EM-REGIME stays green — the '
    + 'drift/design split, and the reason the retiming scales all three constants together',
  true, () => emOnsetsFires({ step: 0.30 }) && !emRegimeFires({ step: 0.30 })],
  ['MUT-STEP-UP', 'and its mirror — LAND_GATE_STEP 0.3375 -> 0.35, the cadence stretched to '
    + '205/422 ms gaps. EM-ONSETS reddens; the headroom falls to 0.0425 and is still inside '
    + 'EM-REGIME\'s 0.04, so the design pin correctly stays green and the number pin does the work',
  true, () => emOnsetsFires({ step: 0.35 }) && !emRegimeFires({ step: 0.35 })],
  ['MUT-RISE', 'LAND_GATE_RISE 0.1575 -> 0.30: the third ember\'s full-bloom gate goes 0.9325 -> '
    + '1.075, past the saturation of the exponential, so it never completes and every frozen '
    + 'capture through Inspire changes. Both EM-ONSETS and EM-REGIME must see it — EM-REGIME on '
    + 'its OVERSHOOT assert, the first of its two failure directions',
  true, () => emOnsetsFires({ rise: 0.30 }) && emRegimeFires({ rise: 0.30 })],
  ['MUT-RISE-THIN', 'EM-REGIME\'s OTHER failure direction, which the overshoot mutant cannot '
    + 'reach: LAND_GATE_RISE 0.1575 -> 0.20 puts the third ember\'s full bloom at gate 0.975. It '
    + 'still completes — the first assert is green — but 0.025 of headroom is inside the width of '
    + 'a single retune, and the far side of that is a silent golden change. The margin assert '
    + 'must red on its own, with EM-FLIGHT green',
  true, () => emRegimeFires({ rise: 0.20 }) && !emFlightFires({ rise: 0.20 })],
  ['MUT-K', 'the copy breathe is halved (COPY_IN_K 2.4 -> 1.2) in the module Inspire does not '
    + 'import: every ember onset doubles, in a file that never mentions the constant',
  true, () => emOnsetsFires({ k: 1.2 })],
  ['MUT-CEIL-UP', 'copy-arrival.js\'s FLIGHT_ENVELOPES.standard.land 0.38 -> 0.55 — the census\'s '
    + 'own scenario. Inspire silently gets TWO mid-flight embers instead of one, and nothing in '
    + 'copy-arrival.js mentions Inspire. Since INSPIRE-ONSET the scenario arrives EARLIER than '
    + '0.55: the second ember now waits at 0.4375, so anything above that trips it',
  true, () => emFlightFires({ flightLand: 0.55 }) && !emOnsetsFires({}) && !emRegimeFires({})],
  ['MUT-CEIL-BOUNDARY', 'the same ceiling moved only to 0.44, a hair past where the second ember '
    + 'now waits. It proves the upper bracket is pinned at its true edge and not merely somewhere '
    + 'short of 0.55 — the distinction that stopped mattering silently when the sequence moved '
    + 'down in gate units',
  true, () => emFlightFires({ flightLand: 0.44 })],
  ['MUT-CEIL-DOWN', 'RE-DERIVED FOR THIS BASELINE — the ceiling 0.38 -> 0.24, so the first ember '
    + 'no longer COMPLETES under it (it reaches full at 0.2575) and is cut off mid-kindle on '
    + 'every nav jump. This mutant used to read 0.30 and 0.30 is now a LEGAL ceiling: the '
    + 'sequence sits lower in gate units, so the value that once proved the lower bracket would '
    + 'have scored green here and the bracket would have gone unproven without anything failing',
  true, () => emFlightFires({ flightLand: 0.24 }) && !emFlightFires({ flightLand: 0.30 })],
  ['MUT-SOONER-TOO-FAR', 'THE MUTANT THAT BOUNDED THIS ORDER — the retiming lever pulled further, '
    + 'λ 1.125 -> 1.25, which is 93 ms earlier instead of 49 and puts the first ember exactly at '
    + 'the instant of arrival (LAND_ON 0, STEP 0.375, RISE 0.175). The cadence is untouched, gaps '
    + 'still 196/382 to the same doubles, and the headroom is still 0.075, so EM-REGIME stays '
    + 'green: nothing has DRIFTED. What has changed is the composition — the second ember now '
    + 'kindles at 0.375, under copy-arrival.js\'s 0.38, so two embers are alight before the '
    + 'camera lands. EM-FLIGHT is the only pin that sees it, and it is why the shift was 49 ms',
  true, () => emFlightFires({ landOn: 0, step: 0.375, rise: 0.175 })
      && !emRegimeFires({ landOn: 0, step: 0.375, rise: 0.175 })],
  ['MUT-FORM', 'formMs 700 -> 100, inside two multiples of the scene gate: min(scene, performed) '
    + 'stops returning the performed envelope and ICON-ARRIVAL is retired without a line being '
    + 'deleted. EM-PERFORMED must see it while the gate arithmetic stays green',
  true, () => emPerformedFires({ formMs: 100 }) && !emOnsetsFires({})],

  /* --- Declared limits. Scored as CANNOT FIRE on purpose and printed, so
     each blind spot is on the record instead of being found later as a
     silent pass. */
  ['L1', 'DECLARED LIMIT — the WIDENING of Inspire\'s onset cadence ("one — two —— three") is '
    + 'not pinned by EM-REGIME and cannot be: on a saturating exponential, equal steps in gate '
    + 'units widen in time for ANY (LAND_ON, LAND_GATE_STEP) whatever. Demonstrated rather than '
    + 'asserted — 2000 generated pairs across the whole usable range and not one narrows. The '
    + 'boundary of the limit is stated too: the tautology holds because the chapter authors '
    + 'EQUAL steps (LAND_ON + s * STEP). Thresholds with unequal steps CAN narrow in time, so a '
    + 'chapter that ever authored its onsets individually would need this pin after all',
  false, () => {
    let seed = 4242;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let t = 0; t < 2000; t++) {
      const landOn = 0.01 + rnd() * 0.5;
      const step = 0.01 + rnd() * ((0.98 - landOn) / 2);
      const [a, b, c] = [0, 1, 2].map((n) => gateMs(landOn + n * step));
      if (!(c - b > b - a)) return true;
    }
    return false;
  }],
  ['L4', 'DECLARED LIMIT — EM-REGIME cannot be driven red from BELOW, and after INSPIRE-ONSET '
    + 'answered an owner report by moving the offset DOWN, below is the direction the next '
    + 'editor is most likely to push. All three constants enter the third ember\'s full-bloom '
    + 'gate with a positive sign, so lowering any of them only ADDS headroom and the pin has no '
    + 'lower edge to fail at. Demonstrated rather than asserted — 2000 generated triples, each '
    + 'constant independently anywhere at or below its shipped 0.10 / 0.3375 / 0.1575, and not '
    + 'one reds EM-REGIME. So the two-directional proof this pin can carry is its two ASSERTS, '
    + 'not two signs: MUT-RISE drives the overshoot and MUT-RISE-THIN the thinned margin. The '
    + 'downward direction is covered instead by EM-ONSETS (MUT-ON-EARLY, MUT-STEP), which is the '
    + 'drift/design split working as designed — a beat that moves early is drift, not a broken '
    + 'regime, until it reaches the flight ceiling, where MUT-SOONER-TOO-FAR picks it up',
  false, () => {
    let seed = 8686;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let t = 0; t < 2000; t++) {
      if (emRegimeFires({
        landOn: LAND_ON * rnd(), step: LAND_GATE_STEP * rnd(), rise: LAND_GATE_RISE * rnd(),
      })) return true;
    }
    return false;
  }],
  ['L2', 'DECLARED LIMIT — the two wrap windows LD-FIT measures against (1.384 s / 1.450 s) are '
    + 'browser measurements and are NOT recomputed here; the census hands them to TEMPO-01. '
    + 'Halving the cost leaves the fit green, so this pin sees the LEFT side of the comparison '
    + 'only',
  false, () => bandCost(LADDER, clocks({ ladderGapS: 0.020 }).blend) >= WRAP_DOWN_WINDOW_S],
  ['L3', 'DECLARED LIMIT — BR-REGIME is computed at the NOMINAL cruise, so it cannot see a '
    + 'gesture-class effect: the desktop transit cap holds equip>connect\'s realized cruise at '
    + 'its own fraction of nominal and both gesture classes deliver the same 200 ms. A leg whose '
    + 'flick and gentle tails diverge (mission>inspire: 283 / 233) is caught by BR-NUMBER, not '
    + 'here',
  false, () => {
    const flick = BRAKE.find((b) => b.name === 'equip>connect' && b.gesture === 'flick');
    const gentle = BRAKE.find((b) => b.name === 'equip>connect' && b.gesture === 'gentle');
    return Math.abs(flick.tailMs - gentle.tailMs) > TAIL_TOL_MS;
  }],
];

let bad = 0;
for (const [id, why, shouldFire, run] of MUTANTS) {
  const fired = run();
  const ok = fired === shouldFire;
  if (!ok) bad += 1;
  console.log(`  [${fired ? 'red' : 'green'}] ${id} ${ok ? 'OK ' : 'BAD'} — ${why}`);
}

console.log(`\n  brake: ${BR_LEG.name} delivers ${BR_LEG.tailMs.toFixed(1)} ms of a `
  + `${BR_LEG.tailS} s dial (${(shortfall(BR_LEG.pRate, BR_LEG.tailS) * 100).toFixed(1)}% short), `
  + `K_eff ${BR_LEG.keffMeasured.toFixed(4)}`);
console.log(`  ladder: band ${blendCost.toFixed(4)} s, one-sidedness margin `
  + `${(-oneSidednessViolation(LADDER)).toFixed(4)} pull/s`);
console.log(`  ember: onsets ${onsetsMs().map((m) => m.toFixed(0)).join('/')} ms, `
  + `third full at gate ${fullGate(2).toFixed(2)}`);

if (bad) {
  console.log(`\nDeclared conversions: ${bad} mutant(s) scored wrong — the gate is not red-capable`);
  process.exit(1);
}
const red = MUTANTS.filter((m) => m[2]).length;
const limits = MUTANTS.filter((m) => /^L[0-9]+$/.test(m[0])).length;
console.log(`\nDeclared conversions: PASS (${red} mutants red, `
  + `${MUTANTS.length - red - limits} null controls + ${limits} declared limits green)`);
process.exit(0);
