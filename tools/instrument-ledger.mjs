/* ==================================================================== *
 * tools/instrument-ledger.mjs — QA-06.
 *
 * THE ONE LEDGER, THE ONE ABORT SENTINEL, THE ONE HARNESS-FAULT TYPE.
 *
 * D84 ordered the instruments to collapse the way the code did. Before this
 * module the tree carried:
 *
 *   · THREE incompatible `check` shapes — `check(name, actual, expected)`,
 *     `check(area, name, pass)` and `check(label, thunk)` — which is the
 *     direct cause of D59: a scan written against one shape mis-fires on
 *     another, and a widened pattern reddened four healthy suites.
 *   · THIRTEEN hand-written abort sentinels (D57/D73), four of which do not
 *     emit a line beginning `FAIL` and are therefore invisible to the very
 *     `grep '^FAIL'` filter D57 exists to defeat, and five `--prove-failure`
 *     suites with no sentinel at all.
 *   · TWO harness-fault types (D70) and one string-prefixed impostor, against
 *     seventeen suites that mutate code they also catch exceptions from.
 *
 * NOTHING HERE REPLACES A READER OR AN EXPECTATION. A suite keeps every
 * literal it pinned; this module owns only the plumbing those literals
 * travel through. The output format is byte-identical to the form the four
 * strongest suites already emitted, because other instruments and the
 * coordinator's own commands grep it.
 *
 * The `check(area, name, pass)` shape (tools/test-c01-harness.mjs,
 * tools/test-portrait-harness.mjs) is DELIBERATELY NOT collapsed into this
 * module — see the note on `createLedger` below.
 * ==================================================================== */

import { createHash } from 'node:crypto';

/* ==================================================================== *
 * D70 — a guard that fires must never be scored as a mutation.
 *
 * `mutate()`'s anchor-miss and inert-edit guards throw INSIDE the code a
 * --prove-failure harness wraps in try/catch. A harness that cannot tell
 * "the subject threw" (evidence) from "my own guard fired" (a harness
 * failure) converts a rotted anchor into a pass — measured twice, in an
 * out-of-repo copy, at 16/16 falsifiable with zero mutation occurring.
 *
 * The type is the fix. Guard throws carry it; the sweep re-raises them
 * OUTSIDE the catch and AFTER the report.
 * ==================================================================== */
export class HarnessFault extends Error {}

/** Declare a harness fault. Never a silent return, never a bare Error. */
export function fault(msg) { throw new HarnessFault(msg); }

/** Replace `from` with `to` in `src`, or declare a harness fault (D78: an
 *  edit that cannot find its anchor must refuse, not approximate). Both the
 *  anchor-miss and the inert-edit case are faults, not failures. */
export function mutateText(src, tag, from, to) {
  if (typeof src !== 'string') fault(`mutate(${tag}): input is not source text`);
  if (!src.includes(from)) {
    fault(`anchor miss [${tag}]: ${JSON.stringify(String(from).slice(0, 70))}`);
  }
  const out = src.replace(from, to);
  if (out === src) fault(`inert mutant [${tag}] — the source did not change`);
  return out;
}

/** Slice `src` between two anchors, refusing on any miss or degenerate
 *  result. A slice equal to the whole file is a miss wearing a success. */
export function sliceBetween(src, tag, startAnchor, endAnchor) {
  const a = src.indexOf(startAnchor);
  if (a === -1) fault(`anchor miss (${tag}): start anchor absent — "${String(startAnchor).slice(0, 60)}"`);
  const b = src.indexOf(endAnchor, a + startAnchor.length);
  if (b === -1) fault(`anchor miss (${tag}): end anchor absent — "${String(endAnchor).slice(0, 60)}"`);
  const out = src.slice(a, b + endAnchor.length);
  if (out.length === 0) fault(`anchor miss (${tag}): empty slice`);
  if (out.length === src.length) fault(`anchor miss (${tag}): slice is the whole file`);
  return out;
}

/* ==================================================================== *
 * Canonicalisation.
 * ==================================================================== */

const sha12 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const viewBytes = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength);

/** Canonical form of an assertion's ACTUAL and EXPECTED. Identical in all
 *  four registry suites; reproduced here unchanged so no comparison moves. */
export function canon(v) {
  return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v);
}

/** Canonical form of a READER'S INPUT, for the registry's gate 2 ("the
 *  perturbation moved the reader's input").
 *
 *  THIS IS THE STRONGEST OF THE FOUR SHIPPED FORMS, not the average of them.
 *  Two of the four were measurably blind and both blindnesses were caught by
 *  a mechanism rather than by review:
 *
 *   · H02's first registry reduced typed arrays to their LENGTH, blinding
 *     gate 2 to the byte flips two of its assertions are entirely about.
 *   · H04's registry found the same bug in a new dress — a BufferGeometry
 *     summarised by its uuid is byte-blind for exactly the same reason — and
 *     digests the attribute bytes instead. Gate 2 caught it there too.
 *
 *  So: typed arrays and Buffers are DIGESTED; a BufferGeometry is its sorted
 *  attribute digests plus its index digest; an Object3D carries the child
 *  properties a relocation would move AND the geometry it draws; a function is
 *  digested by SOURCE, not flattened to a single `<fn>` token that makes every
 *  substitution look like a no-op. Cycles are named rather than thrown on.
 *
 *  QA-08 / D88 — THE BRANCH ORDER WAS THE BUG, AND IT SURVIVED THREE REPAIRS
 *  OF ITSELF. A `THREE.Mesh` is `isObject3D`; it is not `isBufferGeometry`.
 *  The Object3D branch therefore DOMINATED the geometry branch for the single
 *  likeliest reader input in this tree, and its child summary carried only
 *  `type/renderOrder/frustumCulled` — so `inputCanon(mesh)` never reached the
 *  attribute-byte digest that this header calls the fix for "H02's typed-array
 *  bug in a new dress", and gate 2 was byte-blind straight through a Mesh.
 *  Measured before the repair: two meshes differing by one float in
 *  `position` canonicalised IDENTICALLY, and a registry mutant flipping that
 *  float reported `BROKEN — perturbation was a no-op on the reader's input`.
 *  The Object3D branch now digests `geometry` and `material` through the same
 *  walk, and recurses into children rather than summarising them, so a nested
 *  Mesh's bytes are reached too.
 *
 *  ALSO QA-08: `seen` was added to on entry and NEVER REMOVED, so a shared but
 *  ACYCLIC reference canonicalised as `<cycle>` on its second visit — which is
 *  now load-bearing, because a scene graph shares geometries and materials by
 *  design. The set is an ANCESTOR stack: a value is in it only while it is on
 *  the current path, so a true cycle is still named and a diamond is walked.
 *
 *  Anything with no special handling walks structurally with sorted keys.
 *  There is no JSON.stringify replacer here and there cannot be: stringify
 *  calls a value's own toJSON() BEFORE the replacer sees it, which is how
 *  "THREE.Texture: Unable to serialize Texture" got into an evidence log
 *  seven times per sweep. */
export function inputCanon(v) {
  const path = new Set();
  const walk = (x) => {
    if (typeof x === 'function') return `<fn:${sha12(String(x))}>`;
    if (x === null || typeof x !== 'object') return String(x);
    if (path.has(x)) return '<cycle>';
    path.add(x);
    try {
      return body(x);
    } finally {
      path.delete(x);
    }
  };
  const body = (x) => {
    if (Buffer.isBuffer(x) || ArrayBuffer.isView(x)) {
      return `<bytes:${x.constructor.name}:${x.byteLength}:${sha16(viewBytes(x))}>`;
    }
    if (x instanceof ArrayBuffer) return `<buf:${x.byteLength}:${sha16(Buffer.from(x))}>`;
    if (x.isBufferGeometry) {
      const attrs = Object.keys(x.attributes || {}).sort().map((n) => {
        const a = x.attributes[n];
        const arr = a && a.array;
        return `${n}=${arr ? sha12(viewBytes(arr)) : 'nil'}`;
      });
      const ix = x.index && x.index.array ? sha12(viewBytes(x.index.array)) : 'none';
      return `<geo:${attrs.join(',')}:idx=${ix}>`;
    }
    if (x.isObject3D) {
      const kids = (x.children || []).map(walk).join('|');
      return `<three:${x.type || x.constructor.name}:${x.uuid || 'anon'}:ro=${x.renderOrder}`
        + `:fc=${x.frustumCulled}`
        + `:geo=${x.geometry ? walk(x.geometry) : 'none'}`
        + `:mat=${x.material ? walk(x.material) : 'none'}`
        + `:kids=${kids}>`;
    }
    if (x.isTexture || x.isMaterial || x.isBufferAttribute) {
      return `<three:${x.type || x.constructor.name}:${x.uuid || 'anon'}>`;
    }
    if (Array.isArray(x)) return '[' + x.map(walk).join(',') + ']';
    return '{' + Object.keys(x).sort().map((k) => `${k}:${walk(x[k])}`).join(',') + '}';
  };
  return walk(v);
}

/* ==================================================================== *
 * D57 / D73 — the abort sentinel, ONE PER REPORTING PHASE.
 *
 * D57 rule 2: every suite carries a process-exit hook emitting a
 * recognisable failure line if the run ends before reporting. An instrument
 * that only speaks when it completes is silent in exactly the case that
 * matters — a crashing run prints neither a FAIL line nor a summary, so an
 * aborted run is byte-identical to a clean pass under `grep '^FAIL'`.
 *
 * D57's own addendum: a crash AFTER the ledger but BEFORE the sweep leaves a
 * log whose last visible line is `53/53 passed`. Phases, not one flag.
 *
 * D73 is why this is only half the defence: a sentinel is installed by code
 * that must first PARSE, so it cannot fire on a syntax error. The exit code,
 * read in the producing command and joined with `&&`, covers that region and
 * nothing else does.
 *
 * THE LINE MUST BEGIN `FAIL`. Four shipped sentinels print `!!! ABORTED`,
 * which the filter D57 was written about does not match.
 *
 * QA-08 / D88 — AND THE LINE IS NOT THE SIGNAL. The sentinel's only channel
 * was stdout, and `grep '^FAIL'` is the filter QA-07 proved unreliable: a
 * genuine gate failure emits zero column-0 FAIL lines and so does a clean run.
 * A suite that called `process.exit(0)` without reaching a phase printed
 * `FAIL … ABORTED … (exit 0)` and left the `&&` chain GREEN — a sentinel that
 * announces a failure it cannot cause. It now sets `process.exitCode = 1`
 * from inside the `exit` handler, which Node honours even after an explicit
 * `process.exit(0)`, so the one reliable signal carries it. A NON-ZERO code
 * is never overwritten: a suite that is already failing keeps its own code.
 * ==================================================================== */

/** Arm abort sentinels for a suite.
 *
 *  @param name    the suite's name, printed in every sentinel line.
 *  @param phases  ordered reporting-phase names, e.g. ['ledger', 'sweep'].
 *  @param active  optional (phase) => boolean — a phase that was never
 *                 REQUESTED (a sweep in a non---prove-failure run) must not
 *                 announce itself. Silent on clean runs is the whole point.
 *  @returns { reach(phase), reached() } — call reach() at each report.
 */
export function armSentinel(name, phases, active = () => true) {
  const done = new Set();
  const known = new Set(phases);
  process.on('exit', (code) => {
    let fired = 0;
    for (const p of phases) {
      if (done.has(p) || !active(p)) continue;
      fired++;
      console.log(`FAIL ${name} ABORTED before reporting phase "${p}" (exit ${code}) — `
        + 'the suite did not run that phase to completion; no total is available for it');
    }
    /* The line is the diagnosis; THIS is the signal (D57 rule 1). */
    if (fired && code === 0) process.exitCode = 1;
  });
  return {
    reach(phase) {
      if (!known.has(phase)) fault(`unknown reporting phase "${phase}" for ${name}`);
      done.add(phase);
    },
    reached() { return [...done]; },
  };
}

/* ==================================================================== *
 * The ledger.
 *
 * ONE SHAPE: `same(id, what, actual, expected, hint)` — id first, actual and
 * expected adjacent and both stored. This is the shape D44's literal-
 * predicate scan is written against and the shape the registry's gate 1
 * needs, because a mutant can only be checked against an expectation that
 * was recorded rather than inlined into a boolean.
 *
 * WHAT IS DELIBERATELY LEFT ALONE — `check(area, name, pass, value)` in
 * tools/test-c01-harness.mjs and tools/test-portrait-harness.mjs. It is not
 * a worse ledger, it is a DIFFERENT one: it groups by area for a report that
 * reads by area, and it takes an already-evaluated predicate because its
 * subjects are async browser-shaped scenarios where actual/expected are not
 * both available at the call. Converting it would rewrite ~150 call sites in
 * two harnesses and four consumers to gain nothing but uniformity, and D59
 * is about a SCAN mis-firing on that shape, which is fixed by giving the
 * scan the right pattern (tools/self-controls.mjs), not by deleting the
 * shape. Recorded rather than re-implemented.
 * ==================================================================== */

/** @param {string} title used only in the final report line. */
export function createLedger() {
  let pass = 0;
  const failures = [];

  function record(id, what, actual, expected, hint) {
    const a = canon(actual);
    const e = canon(expected);
    if (a === e) { pass++; console.log(`  PASS  ${id}  ${what}`); return true; }
    console.log(`  FAIL  ${id}  ${what}`);
    console.log(`        expected: ${e}`);
    console.log(`        actual:   ${a}`);
    if (hint) console.log(`        >>> ${hint}`);
    failures.push(`${id}  ${what}\n        expected: ${e}\n        actual:   ${a}${hint ? '\n        >>> ' + hint : ''}`);
    return false;
  }

  return {
    record,
    /** An assertion with NO mutant. Controls, cardinality tallies and
     *  branch-entry witnesses only; everything load-bearing uses pin(). */
    same(id, what, actual, expected, hint) { return record(id, what, actual, expected, hint); },
    get pass() { return pass; },
    failures,
    /** Reset the counters. --demo-delta injects synthetic failures whose
     *  whole purpose is the printed message; they are not scored. */
    discard() { failures.length = 0; pass = 0; },
    /** The report. Byte-identical to the line four suites already print,
     *  because instruments and shell commands grep it.
     *  Returns the process exit code; the CALLER exits, so that a suite can
     *  still re-raise a HarnessFault after reporting (D70). */
    report(extraTail) {
      console.log(`\n${pass + failures.length} assertions — ${pass} PASS, ${failures.length} FAIL`);
      if (failures.length) {
        console.log('\nFailures:\n');
        for (const f of failures) console.log('  ' + f + '\n');
      }
      if (extraTail) console.log(extraTail);
      return failures.length ? 1 : 0;
    },
  };
}
