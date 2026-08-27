/* ==================================================================== *
 * tools/pose-oracle.mjs — PAGE-02.
 *
 * THE FREEZE-THEN-READ DISCIPLINE, AND THE POSE VECTOR IT READS.
 *
 * PAGE-01 built a live-DOM harness and then named, precisely, the three
 * things a `createUI` preservation proof still needed: a pose-vector reader,
 * pointer and key input, and "a freeze-then-read discipline, and this is the
 * real one. Every assertion this harness makes today is a BOUND, because it
 * samples a clock. A behaviour-preservation proof needs EXACT equality of a
 * pose ... a `createUI` order leaning on this harness as-is would be proving
 * preservation with an instrument whose outputs are not exactly reproducible.
 * That is D72 again in a new dress."
 *
 * This module is the third thing. It contains no bound. Every quantity it
 * produces is either an exact string or a refusal.
 *
 * WHY A FREEZE IS NOT OPTIONAL, AND IT IS NOT ONLY ABOUT REPRODUCIBILITY
 * ---------------------------------------------------------------------
 * The pose vector walks 363 elements and reads eleven cells from each. A
 * `getComputedStyle` on a node with a running CSS transition returns an
 * INTERPOLATED value, so an unfrozen read is TORN: row 3 is sampled at one
 * instant and row 290 at another, and the vector describes a DOM state that
 * never existed. Reproducibility across runs is the second reason; a vector
 * that is internally coherent is the first.
 *
 * THE DISCIPLINE, IN FOUR STEPS
 * -----------------------------
 *  1. PLACE. Navigate to `?capture=<pose>&steady=1`. This is a production
 *     path, not an instrument hook: main.js calls `sceneApi.freezeTime(0)`
 *     and journey.js runs `placeAt(p)` with `snap: true`, which throws every
 *     eased chapter state to its target IN ONE TICK and then holds it,
 *     because `freezeTime` pins `dt` at exactly 0 (organism/animation.js).
 *     `?steady=1` removes the documentary handheld layer. The result is a
 *     DEFINED state rather than a settled one — nothing is asymptotically
 *     approaching anything.
 *  2. DRIVE (optional). Real pointer and key input, dispatched by the browser
 *     itself through CDP — trusted events, not `dispatchEvent`. The UI tier
 *     `createUI` owns responds to these WITHOUT the shared clock, because its
 *     state changes are class toggles and CSS transitions, neither of which
 *     is driven by the frozen `dt`. Each action is followed by a PREDICATE on
 *     `window.journey.ui` — not a sleep — so a driven pose that did not
 *     happen is a refusal rather than a quietly different vector.
 *  3. FREEZE. `document.getAnimations()` is paused and every animation's
 *     `currentTime` is set to `FREEZE_PHASE_MS`, a pinned literal far past
 *     the longest transition in the sheet (400 ms). A finite transition
 *     clamps to its filled end state; an infinite one lands on a phase that
 *     is a function of the literal alone. Then two rAF ticks, so style
 *     recalculation has run before anything is read.
 *  4. READ. The pose vector.
 *
 * WHAT EACH STEP BUYS, MEASURED RATHER THAN CLAIMED — AND ONE RETRACTION
 * ----------------------------------------------------------------------
 * An earlier draft of this header claimed the freeze alone converts 32
 * unstable cells into none. THAT WAS FALSIFIED by an ablation against the
 * SHIPPED code and is retracted; the number came from a probe running its own
 * local freeze and a different comparison. The measured table (three fresh
 * sessions per cell, driven pose, `ablation.txt`):
 *
 *     wait   freeze   verdict
 *     0 ms   on       DIFFER, 6 cells      off   DIFFER, 12 cells
 *   200 ms   on       DIFFER, 6 cells      off   DIFFER, 20 cells
 *  1500 ms   on       EXACT                off   EXACT
 *
 * So, honestly: THE FREEZE REMOVES THE ANIMATION-PHASE INSTABILITY (rect,
 * transform and opacity read mid-transition) AND NOT THE JS-TIMED CLASS
 * TOGGLES — journey/ui.js's icon crossfade flips `visibility` and a class on
 * its own schedule, and no animation API reaches that. At the SHIPPED wait,
 * where `RAIL_GATE_SETTLE_MS` has already carried the page past every
 * transition in the sheet, the freeze changes nothing and its value is that
 * it MEASURES that: `residual === 0` is the evidence that nothing was
 * running, and `residual > 0` is a fact a reader needs. It is also what keeps
 * the read a snapshot rather than a walk for any pose whose transitions
 * outlast the wait.
 *
 * `EXCLUSIONS_UNFROZEN` below is a different measurement again — the LIVE
 * `?pose=` path with a quiescence loop, the design this one replaces.
 *
 * With all four steps the comparison is 363 of 363 rows bit-identical, nine
 * poses deep, including the four driven ones, across fresh browser processes
 * and across two independent full runs. `EXCLUSIONS` is therefore EMPTY, and
 * it is a declared SET rather than an absent concept precisely so that a
 * later order cannot widen it without moving a pinned row.
 *
 * THE RAIL RING IS FROZEN, NOT EXCLUDED. PAGE-01's one mover — the
 * `j-rail-active-ring` at 0.001 px — is `nav.j-rail/0/0/0`. It is an rAF-eased
 * inline transform, and it is exact here because step 1 SNAPS it rather than
 * because step 3 stops it: under the live `?pose=` path it is the first of
 * the twelve unstable cells and it never converges (measured: 900 rAF ticks,
 * no two consecutive samples equal). That is why the discipline places
 * rather than settles, and why "wait longer" is not the same instrument.
 *
 * NO BROWSER IMPORT LIVES HERE (D84/D88's split, PAGE-01's precedent). The
 * launch, the CLI, the two-origin protocol and the D63 refusal are
 * tools/pose-run.mjs. Everything that DECIDES anything is here, is pure, and
 * is a subject of tools/test-instrument-layer.mjs under COV-1.
 * ==================================================================== */

import { createHash } from 'node:crypto';

import { fault } from './instrument-ledger.mjs';

/* ==================================================================== *
 * THE SITE SETS. Every one of these is per-subject data (D54): a set with
 * named members, never a count, so that a member added, dropped or renamed
 * moves exactly the row it touches.
 * ==================================================================== */

/** The DOM `createUI` owns, as roots, in document order.
 *
 *  Derived by enumerating `document.body.children` on the live page and
 *  keeping every root the UI tier creates: the rail and its menu, the copy
 *  block, the hover zones, the hotspots, the card, the popover and the live
 *  region. `aside.j-pop` is created on demand and reads `ABSENT` until a
 *  hover opens it — which is itself a row of the vector, so the popover
 *  coming into existence is a DIFFERENCE rather than a shorter vector. */
export const POSE_REGION = Object.freeze([
  'nav.j-rail',
  'div.j-menu-scrim',
  'aside#j-menu',
  'div.j-copy',
  'div.j-hotzones',
  'div.j-hotspots',
  'aside.j-card',
  'aside.j-pop',
  'div.j-live',
]);

/** The cells of one row, in order. `path` is the ordinate; the other ten are
 *  the measured quantities. Geometry is read at THREE decimals and nothing
 *  is rounded further — a coarser precision would be a tolerance wearing a
 *  pin's clothes, which is the exact substitution D72 warns about. */
export const POSE_FIELDS = Object.freeze([
  'path', 'tag', 'class', 'rect', 'opacity', 'transform',
  'visibility', 'display', 'zIndex', 'pointerEvents', 'textHash',
]);

/** The pinned animation phase. Longer than the longest transition in
 *  hero.css (400 ms), so every finite animation clamps to its filled end
 *  state and every infinite one lands on a phase determined by this literal
 *  alone. Changing it changes every frozen pose; it is a constant of the
 *  discipline, not a tuning knob. */
export const FREEZE_PHASE_MS = 100000;

/** How many rAF ticks separate the freeze from the read. Two, so that a
 *  style recalculation scheduled by the pause has run and been committed. */
export const FREEZE_SETTLE_TICKS = 2;

/** How many freeze passes may run before the fixpoint is declared out of
 *  reach. See `pvFreeze`: forcing a transition to its end fires
 *  `transitionend`, and journey/ui.js's icon crossfade starts a second
 *  transition there — so one pass provably is not enough, measured. */
export const FREEZE_PASSES = 6;

/** How many times a torn read may be re-frozen and re-read before the pose
 *  is refused. A budget on a REFUSAL, never a tolerance on a measurement:
 *  every attempt compares EXACTLY, and exhausting the budget reports no
 *  pose at all. */
export const TEAR_RETRIES = 3;

/* -------------------------------------------------------------------- *
 * THE ONE THING THE FREEZE CANNOT REACH: `journey/rail.js`'s TWO
 * WALL-CLOCK GATES.
 *
 * The rail root's class list is not a function of the pose alone. Two gates
 * in journey/rail.js are keyed to `Date.now()`, which neither `freezeTime`
 * (it pins the SHARED clock, organism/animation.js) nor
 * `document.getAnimations()` (CSS only) can touch:
 *
 *   · `j-rail-turn` is added on a live turn and removed by a 500 ms timer;
 *   · `j-rail-following` is gated on `Date.now() >= followReadyAt`, where
 *     `followReadyAt` is set to `Date.now() + 720` at reveal.
 *
 * BOTH ARE ONE-WAY. Once the timer has fired the class is gone until another
 * turn; once the deadline has passed the comparison is true forever. So the
 * post-gate state is not "the state it settles into" — it is a state the
 * page reaches and cannot leave, and waiting past the longer of the two
 * literals reaches it WITH CERTAINTY rather than with probability. That is
 * the difference between advancing deterministically and settling, and it is
 * why this is a lower bound on a monotone transition and not a tolerance on
 * a measurement.
 *
 * MEASURED FIRST, THEN FIXED. Without this wait the harness's own EXACT
 * comparison reported `nav.j-rail :: class` and `nav.j-rail/0/2 :: class`
 * moving between two fresh sessions — one cell each, and no other cell in
 * 363 rows. It was the harness that found it, not review.
 *
 * `PV-RAIL-GATES` pins the two literals against the shipped source. If
 * either grows past `RAIL_GATE_SETTLE_MS` the pin reds and names the file,
 * rather than this wait quietly becoming too short.
 * -------------------------------------------------------------------- */
export const RAIL_GATE_SETTLE_MS = 1500;

/** Read journey/rail.js's two wall-clock gate literals out of its source.
 *  A miss is a fault, never a default: a gate whose anchor moved is a gate
 *  this instrument can no longer see. */
export function railGateLiterals(src) {
  if (typeof src !== 'string') fault('railGateLiterals needs journey/rail.js source text');
  const follow = /followReadyAt\s*=\s*reduceMotion\.matches\s*\?\s*Date\.now\(\)\s*:\s*Date\.now\(\)\s*\+\s*(\d+)\s*;/.exec(src);
  if (!follow) fault('journey/rail.js: the followReadyAt deadline could not be read');
  const turnAt = src.indexOf("root.classList.add('j-rail-turn');");
  if (turnAt === -1) fault("journey/rail.js: the j-rail-turn anchor is absent");
  const turn = /\}\s*,\s*(\d+)\s*\)\s*;/.exec(src.slice(turnAt, turnAt + 900));
  if (!turn) fault('journey/rail.js: the j-rail-turn timer duration could not be read');
  return { followReadyMs: Number(follow[1]), turnTimerMs: Number(turn[1]) };
}

/** The placed poses. Chapter ids, which `?capture=` accepts and resolves
 *  through `restProgress()` — so the harness speaks pose names and the page
 *  owns the arithmetic. */
export const PLACED_POSES = Object.freeze(['mission', 'inspire', 'connect', 'owned', 'final']);

/* ==================================================================== *
 * THE EXCLUSION SET — declared EMPTY, and that is the finding.
 *
 * The order that commissioned this module said: "If a component cannot be
 * frozen — an animated ring, a CSS transition, an RAF-driven value — exclude
 * it explicitly and pin the exclusion list as a site set, so a future order
 * cannot silently widen it."
 *
 * Nothing needed excluding. The set is shipped anyway, EMPTY and pinned,
 * because an absent concept cannot be widened without being noticed and a
 * declared empty one can only be widened by moving `PV-EXCL-1`.
 *
 * A member would be `{ path, field, why }` and `maskExclusions` would blank
 * exactly that cell — never the whole row, so a node whose CLASS changed
 * would still be caught even if its TRANSFORM were excused.
 * ==================================================================== */
export const EXCLUSIONS = Object.freeze([]);

/** THE COUNTER-MEASUREMENT, AND THE REASON THE FREEZE EXISTS.
 *
 *  These twelve cells are what three fresh sessions disagree on when the
 *  page is driven LIVE (`?pose=connect&steady=1&nointro=1`) and read after a
 *  quiescence loop instead of a freeze. They are not excluded by anything —
 *  the shipped discipline never produces them — they are recorded so that
 *  the claim "the freeze is load-bearing" is a number rather than an
 *  argument, and so that a future order that proposes reading a live page
 *  can see the size of what it is taking on.
 *
 *  `nav.j-rail/0/0/0` is PAGE-01's 0.001 px rail ring. The eight
 *  `pointerEvents` cells and the class token beneath `nav.j-rail/0/0/5` are
 *  a rail slot mid-recycle: `j-rail-echo` with or without `j-rail-recycle`,
 *  depending on how many frames had elapsed. */
export const EXCLUSIONS_UNFROZEN = Object.freeze([
  'nav.j-rail/0/0/0 :: rect',
  'nav.j-rail/0/0/0 :: transform',
  'nav.j-rail/0/0/5 :: class',
  'nav.j-rail/0/0/5/0/0/0 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/0 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/1 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/2 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/3 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/4 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/5 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/6 :: pointerEvents',
  'nav.j-rail/0/0/5/0/0/0/7 :: pointerEvents',
]);

/* ==================================================================== *
 * THE SCENARIOS — the driven poses, as DATA.
 *
 * A scenario is a placed pose plus an ordered list of real-input steps. Each
 * step carries the PREDICATE that must become true before the pose is
 * frozen, expressed over `window.journey.ui`. The predicate is the step's
 * own positive control: an input that reached nothing is a named D63 cause,
 * never a silently different vector.
 *
 * `target` is resolved on the page by `pvTargetBox` and handed back as
 * viewport coordinates; the CLICK ITSELF is performed by the browser, in
 * tools/pose-run.mjs's driven region. Nothing here dispatches an event.
 * ==================================================================== */
export const SCENARIOS = Object.freeze([
  Object.freeze({
    id: 'menu-open',
    pose: 'connect',
    what: 'a real pointer click on the rail Menu control opens the menu',
    steps: Object.freeze([
      Object.freeze({ kind: 'click', target: 'menu-button', want: 'menuOpen', to: true }),
    ]),
  }),
  Object.freeze({
    id: 'menu-escaped',
    pose: 'connect',
    what: 'and a real Escape keypress closes it again',
    steps: Object.freeze([
      Object.freeze({ kind: 'click', target: 'menu-button', want: 'menuOpen', to: true }),
      Object.freeze({ kind: 'key', key: 'Escape', want: 'menuOpen', to: false }),
    ]),
  }),
  Object.freeze({
    id: 'pop-pinned',
    pose: 'connect',
    what: 'a real hover then click on the `ados` hotspot pins its popover — J04b\'s hover/pin seam',
    steps: Object.freeze([
      Object.freeze({ kind: 'hover', target: 'hotspot:ados', want: 'popNode', to: 'ados' }),
      Object.freeze({ kind: 'click', target: 'hotspot:ados', want: 'popPinned', to: true }),
    ]),
  }),
  Object.freeze({
    id: 'pop-escaped',
    pose: 'connect',
    what: 'and Escape dismisses the pinned popover',
    steps: Object.freeze([
      Object.freeze({ kind: 'hover', target: 'hotspot:ados', want: 'popNode', to: 'ados' }),
      Object.freeze({ kind: 'click', target: 'hotspot:ados', want: 'popPinned', to: true }),
      Object.freeze({ kind: 'key', key: 'Escape', want: 'popPinned', to: false }),
    ]),
  }),
]);

/** The input kinds this instrument knows how to perform. A scenario step of
 *  any other kind is a HARNESS FAULT, never a skipped step — a driver that
 *  silently ignores a step reports a pose for a scenario that did not run. */
export const INPUT_KINDS = Object.freeze(['click', 'hover', 'key']);

/* ==================================================================== *
 * ROW ARITHMETIC. All exact, all total.
 * ==================================================================== */

/** Split one pose row into its named cells. A row with the wrong cell count
 *  is a fault: a reader whose shape drifted must not be silently compared. */
export function splitRow(row) {
  if (typeof row !== 'string') fault('pose row is not a string');
  const parts = row.split('|');
  if (parts.length !== POSE_FIELDS.length) {
    fault(`pose row has ${parts.length} cells, expected ${POSE_FIELDS.length}: ${row.slice(0, 80)}`);
  }
  const out = {};
  for (let i = 0; i < POSE_FIELDS.length; i++) out[POSE_FIELDS[i]] = parts[i];
  return out;
}

/** The ordinate of one excluded cell (D54's `subject :: axis` shape). */
export function cellKey(path, field) { return `${path} :: ${field}`; }

/** Blank exactly the excluded cells, leaving every other cell and the ROW
 *  COUNT untouched.
 *
 *  `unmatched` is the load-bearing return value. An exclusion naming a path
 *  that no longer exists is a STALE excuse: it silences nothing today and
 *  will silence the wrong thing tomorrow, and it is indistinguishable from a
 *  working exclusion in the diff count alone. tools/pose-run.mjs refuses on
 *  a non-empty `unmatched` (D46: an assertion of absence needs an assertion
 *  of presence beside it). */
export function maskExclusions(rows, exclusions = EXCLUSIONS) {
  const wanted = new Map();
  for (const e of exclusions) {
    if (!e || typeof e.path !== 'string' || typeof e.field !== 'string') fault('exclusion entry needs a path and a field');
    if (!POSE_FIELDS.includes(e.field)) fault(`exclusion names field "${e.field}", which is not a pose field`);
    if (e.field === 'path') fault('the path cell is the ordinate and cannot be excluded');
    wanted.set(cellKey(e.path, e.field), false);
  }
  const masked = [];
  const out = rows.map((row) => {
    const cells = row.split('|');
    if (cells.length !== POSE_FIELDS.length) return row;
    let hit = false;
    for (let i = 1; i < POSE_FIELDS.length; i++) {
      const k = cellKey(cells[0], POSE_FIELDS[i]);
      if (wanted.has(k)) { wanted.set(k, true); cells[i] = 'EXCLUDED'; masked.push(k); hit = true; }
    }
    return hit ? cells.join('|') : row;
  });
  const unmatched = [...wanted.entries()].filter(([, seen]) => !seen).map(([k]) => k).sort();
  return { rows: out, masked: masked.sort(), unmatched };
}

/** EXACT comparison of two pose vectors. No tolerance exists in this
 *  function and none can be passed to it. */
export function comparePose(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) fault('comparePose needs two pose vectors');
  const n = Math.max(a.length, b.length);
  const rows = [];
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) rows.push({ i, a: a[i] === undefined ? 'MISSING' : a[i], b: b[i] === undefined ? 'MISSING' : b[i] });
  }
  return {
    lengthA: a.length,
    lengthB: b.length,
    identical: rows.length === 0 && a.length === b.length,
    movedRows: rows.length,
    rows,
  };
}

/** The cells two vectors disagree on, as an ordered site set. A row present
 *  on one side only contributes `<PATH> :: <ROW PRESENCE>`, because a
 *  vanished node is a difference in the node, not in one of its styles. */
export function movedCells(a, b) {
  const out = new Set();
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    const A = a[i] === undefined ? null : a[i].split('|');
    const B = b[i] === undefined ? null : b[i].split('|');
    if (A === null || B === null || A.length !== POSE_FIELDS.length || B.length !== POSE_FIELDS.length
        || A[0] !== B[0]) {
      out.add(cellKey((A && A[0]) || (B && B[0]) || `#${i}`, 'ROW PRESENCE'));
      continue;
    }
    for (let f = 1; f < POSE_FIELDS.length; f++) if (A[f] !== B[f]) out.add(cellKey(A[0], POSE_FIELDS[f]));
  }
  return [...out].sort();
}

/** A pose vector's digest. Used for logging and for cheap equality across a
 *  matrix; `comparePose` remains the authority, because a digest cannot say
 *  WHICH row moved. */
export function vectorDigest(rows) {
  if (!Array.isArray(rows)) fault('vectorDigest needs a pose vector');
  return createHash('sha256').update(rows.join('\n')).digest('hex').slice(0, 16);
}

/** Every cross-comparison of one pose across a set of reads, as exact
 *  verdicts. `reads` is `[{ label, rows }]`. */
export function reproducibility(reads) {
  if (!Array.isArray(reads) || reads.length < 2) fault('reproducibility needs at least two reads');
  const pairs = [];
  for (let i = 1; i < reads.length; i++) {
    const cmp = comparePose(reads[0].rows, reads[i].rows);
    pairs.push({
      a: reads[0].label, b: reads[i].label,
      identical: cmp.identical, movedRows: cmp.movedRows,
      cells: cmp.identical ? [] : movedCells(reads[0].rows, reads[i].rows),
    });
  }
  return {
    reads: reads.length,
    rows: reads[0].rows.length,
    digest: vectorDigest(reads[0].rows),
    exact: pairs.every((p) => p.identical),
    pairs,
  };
}

/* ==================================================================== *
 * D63 — WHEN THIS INSTRUMENT MAY NOT REPORT A NUMBER.
 *
 * PAGE-01 extended D63 to a browser harness and named nine causes. A
 * freeze-then-read harness adds five of its own, because "the page looked
 * fine" is compatible with every one of them:
 *
 *  · THE FREEZE DID NOT TAKE. `document.getAnimations()` returned entries
 *    that could not be paused (a cross-document animation, a detached
 *    effect). A pose read over a running transition is torn, and a torn
 *    vector's diff count is meaningless in both directions.
 *  · A DRIVEN STEP'S PREDICATE NEVER BECAME TRUE. The input did not reach
 *    the handler. Reporting the pose anyway would report the pose of the
 *    scenario that did not happen.
 *  · AN EXCLUSION MATCHED NOTHING. A stale excuse (see `maskExclusions`).
 *  · THE VECTOR IS THIN. A region root that failed to render leaves a short
 *    vector, and two short vectors compare equal.
 *  · THE TWO ORIGINS SERVED THE SAME BYTES. A two-tree protocol whose second
 *    origin is a mistyped port pointing back at the first reports perfect
 *    preservation of nothing.
 * ==================================================================== */

/** The floor a pose vector must clear to be believed. Derived from the
 *  measured region: the smallest shipped pose is 363 rows. */
export const MIN_POSE_ROWS = 200;

export function trustVerdict(evidence) {
  const e = evidence || {};
  const causes = [];
  if (!e.httpOk) causes.push(`origin did not serve the page (HTTP ${e.httpStatus || 0})`);
  if (!e.booted) causes.push('window.journey.ui never appeared — the page did not boot');
  if (!e.positivePointer) causes.push('POSITIVE CONTROL failed: a real pointer click changed no ui state — '
    + 'the event path is not being exercised and every pose below it is the pose of nothing happening');
  if (!e.positiveKey) causes.push('POSITIVE CONTROL failed: a real key press changed no ui state');
  if (e.hiddenReads) causes.push(`${e.hiddenReads} read(s) ran with document.hidden — a hidden tab throttles `
    + 'setTimeout and trips push()\'s resumedFromBackground branch');
  if (e.consoleErrors) causes.push(`${e.consoleErrors} console error(s) during the sweep`);
  if (e.freezeFailures) causes.push(`${e.freezeFailures} animation(s) could not be frozen — the pose read over them is torn`);
  if (e.tornReads) causes.push(`${e.tornReads} TORN read(s): two consecutive reads inside one freeze disagreed, `
    + 'so the 363-row walk did not describe a single DOM state and its diff count means nothing in either direction');
  if (e.predicateMisses) causes.push(`${e.predicateMisses} driven step(s) whose ui predicate never became true`);
  if (e.staleExclusions && e.staleExclusions.length) {
    causes.push(`exclusion(s) matching no row: ${e.staleExclusions.join(', ')} — a stale excuse silences the wrong cell later`);
  }
  if (e.thinVectors) causes.push(`${e.thinVectors} pose vector(s) below ${MIN_POSE_ROWS} rows — a region root did not render`);
  if (e.originsIdentical) causes.push('the two origins served byte-identical trees — a two-tree comparison across one tree '
    + 'reports preservation of nothing');
  if (!e.poseCount) causes.push('no pose was read at all');
  return { trusted: causes.length === 0, causes };
}

/* ==================================================================== *
 * CLI.
 * ==================================================================== */

export function parseArgs(argv) {
  const get = (k, d) => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`));
    return hit === undefined ? d : hit.slice(k.length + 3);
  };
  return {
    origin: get('origin', 'http://localhost:8177'),
    control: get('control', ''),
    originB: get('origin-b', ''),
    sessions: Number(get('sessions', '2')),
    width: Number(get('width', '1280')),
    height: Number(get('height', '800')),
    record: get('record', null),
    only: get('only', ''),
  };
}

/* ==================================================================== *
 * THE PAGE-SIDE HALF.
 *
 * These four run INSIDE the browser, serialised by Playwright. They close
 * over nothing: every constant they need arrives in `arg`, because a
 * serialised function that referenced module scope would throw a
 * ReferenceError in the page and be indistinguishable from a page that has
 * no such element.
 *
 * They are read as SOURCE by tools/test-pose-oracle.mjs — `String(fn)` — for
 * exactly the reason PAGE-01 gives for its own driver: a source assertion
 * about behaviour is not an observation of behaviour, and saying which is
 * which is the point.
 * ==================================================================== */

/** THE POSE VECTOR READER.
 *
 *  One row per element, depth-first, keyed by its INDEX PATH from its region
 *  root rather than by its class — the class is a measured cell, so keying
 *  on it would make a class change look like a different element rather than
 *  a changed one. */
export const pvRead = (arg) => {
  const out = [];
  const h = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0; return x.toString(16).padStart(8, '0'); };
  const F = arg.fields;
  for (const q of arg.region) {
    const root = document.querySelector(q);
    if (!root) { out.push([q, 'ABSENT', '', '', '', '', '', '', '', '', ''].join('|')); continue; }
    const stack = [[root, '']];
    while (stack.length) {
      const [el, path] = stack.pop();
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
      const own = [];
      for (const n of el.childNodes) if (n.nodeType === 3) own.push(n.nodeValue);
      const row = [
        `${q}${path}`, el.tagName.toLowerCase(), cls,
        `${r.x.toFixed(3)},${r.y.toFixed(3)},${r.width.toFixed(3)},${r.height.toFixed(3)}`,
        s.opacity, s.transform, s.visibility, s.display, s.zIndex, s.pointerEvents, h(own.join('')),
      ];
      out.push(row.slice(0, F.length).join('|'));
      for (let i = el.children.length - 1; i >= 0; i--) stack.push([el.children[i], `${path}/${i}`]);
    }
  }
  return out;
};

/** THE FREEZE, DRIVEN TO A FIXPOINT.
 *
 *  ONE PASS IS NOT ENOUGH, AND THE HARNESS FOUND THAT ITSELF. Forcing a
 *  transition to its end phase makes it FINISH, which fires `transitionend`
 *  — and `journey/ui.js`'s icon crossfade starts a SECOND transition in that
 *  handler. The first live sweep with the tear detector armed reported
 *  exactly that: two reads inside one single-pass freeze disagreed on
 *  `aside.j-pop/0/0/0/1 :: class` and its neighbours. So the freeze repeats
 *  until no animation is left running or the pass budget is spent, and
 *  reports both, because "residual animations" is a fact a reader needs and
 *  a silent retry is not.
 *
 *  The fixpoint is a DEFINED state, not a settled one: each pass moves every
 *  running animation to a phase that is a function of `phaseMs` alone.
 *
 *  Returns the number of animations it could NOT stop, which is a D63 cause
 *  rather than a warning. */
export const pvFreeze = async (arg) => {
  let failures = 0;
  let total = 0;
  let passes = 0;
  let residual = 0;
  for (let p = 0; p < arg.passes; p++) {
    passes++;
    const live = document.getAnimations();
    for (const a of live) {
      total++;
      try { a.pause(); a.currentTime = arg.phaseMs; } catch (e) { void e; failures++; }
    }
    for (let i = 0; i < arg.ticks; i++) await new Promise((r) => requestAnimationFrame(r));
    residual = document.getAnimations().length;
    if (residual === 0) break;
  }
  return { total, failures, passes, residual, hidden: document.hidden };
};

/** THE THAW. Between two driven steps the page must run again, or a CSS
 *  transition pinned at its end phase would swallow the next state change.
 *  `freezeTime(null)` resumes live time with no dt spike — the raw clock was
 *  tracked throughout (organism/animation.js). */
export const pvThaw = (arg) => {
  for (const a of document.getAnimations()) { try { a.play(); } catch (e) { void e; } }
  if (arg.hero && window.journey && window.journey.hero && window.journey.hero.freezeTime) {
    window.journey.hero.freezeTime(null);
  }
  return document.getAnimations().length;
};

/** The `window.journey.ui` cells a scenario step's predicate is written
 *  over. A named subset, so a step cannot assert on something the UI does
 *  not publish and silently pass. */
export const pvUiState = () => {
  const ui = window.journey && window.journey.ui;
  if (!ui) return null;
  return {
    menuOpen: !!(ui.rail && ui.rail.menuOpen),
    railExpanded: !!(ui.rail && ui.rail.expanded),
    cardOpen: !!ui.cardOpen,
    cardNode: ui.cardNode === undefined ? null : ui.cardNode,
    cardPinned: !!ui.cardPinned,
    popNode: ui.popNode === undefined ? null : ui.popNode,
    popPinned: !!ui.popPinned,
    armedNode: ui.armedNode === undefined ? null : ui.armedNode,
    hotspots: Array.isArray(ui.hotspots) ? ui.hotspots.length : -1,
  };
};

/** Resolve a scenario target to viewport coordinates. Returns `null` when
 *  the element is absent or has no box — the driver turns that into a named
 *  refusal rather than clicking at (0, 0), which would hit the page and look
 *  like an input that did nothing. */
export const pvTargetBox = (arg) => {
  let el = null;
  if (arg.target === 'menu-button') el = document.querySelector('.j-rail-menu');
  else if (arg.target.startsWith('hotspot:')) {
    const want = arg.target.slice('hotspot:'.length);
    for (const b of document.querySelectorAll('.j-hotspots .j-hot')) {
      if (b.getAttribute('data-node') === want) { el = b; break; }
    }
  }
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const s = getComputedStyle(el);
  if (s.visibility === 'hidden' || s.pointerEvents === 'none') return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
};
