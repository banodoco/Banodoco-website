// C05 slice A — the chapter descriptor contract, its validator, and the source
// scans that stop the named branches coming back.
//
//   node tools/test-chapter-contract.mjs                 — run the suite
//   node tools/test-chapter-contract.mjs --prove-failure — prove every
//        comparison in the suite can be made to fail
//
// Wired into `package.json`'s `test:contracts`, so `npm run check` runs it.
// (An earlier revision of this header said it was not; another order did the
// wiring and the sentence went stale — C05-B R1 MINOR-NIT 4.)
//
// ---------------------------------------------------------------------------
// WHAT T1/T2/T3 ARE, AND WHAT THEY ARE NOT  (copied from design.md §9.3, which
// requires it to live here and not only there).
//
// They are CREEP RATCHETS: they stop a chapter-id literal or a global read from
// coming back. They are NOT proof that dispatch became capability-based, and
// three gaps make that explicit:
//
//   1. They scan three files. A branch that migrates to a new fourth file
//      passes all three unchanged.
//   2. They match a *literal*, not a concept. A named branch re-expressed as
//      `chapters[RUNTIME_CHAPTER_IDS[2]]` passes.
//   3. They prove source text, not runtime behaviour — c01/limitations.md
//      §1a's standing verdict on area `S`.
//
// The proof of capability dispatch is I3-I6 and I10 executing, plus the code
// review of slices C and D. c01/limitations.md §1a records that a later gate
// citing a static scan as runtime evidence is exactly the error this program
// keeps repeating: do not cite T1-T5 as runtime evidence.
//
// ---------------------------------------------------------------------------
// WHAT THIS SUITE EXECUTES. The labels are load-bearing:
//
//   [validator]  — executes the real journey/chapter-contract.js.
//   [executed]   — executes real production code. As of slice C that is
//                  journey/chapter-entry.js (I2) AND the real
//                  journey/chapter-interactions.js (I4, I6, I10), which is
//                  imported and run below over descriptor-shaped fakes.
//   [materialised] — executes REAL PRODUCTION BYTES that cannot be imported.
//                  As of slice D that is journey/journey.js's own
//                  `pickChapterFocus` (I3b), extracted from the shipped source
//                  by brace matching and reconstituted with `new Function`
//                  over the REAL `startOf` and RUNTIME_CHAPTER_IDS. The bytes
//                  are the shipped bytes; what is NOT proved is the binding —
//                  that applyFrame calls it — which T3 pins by source text.
//   [reference]  — executes a REFERENCE IMPLEMENTATION, written in this file,
//                  of a loop the design specifies but that no production file
//                  contains yet. A [reference] check passing is not evidence
//                  about the shipped tree. AS OF SLICE E THERE ARE NONE:
//                  slice C deleted `referenceRegistrar`, slice D deleted
//                  `referenceFocusPick`, and slice E materialised I5. Every
//                  check in this file now executes real bytes or reads real
//                  source. If you add a [reference], say in its name why.
//
//   SLICE A's OBLIGATION — DISCHARGED IN FULL AT SLICE E. Slice A's
//   limitations.md §4 required each consuming slice to re-point the reference
//   bodies it replaced and delete them. Slice C re-pointed I4, I6 and I10 at
//   the real registrar and deleted `referenceRegistrar`. Slice D re-pointed
//   I3(b) at journey/journey.js's own bytes and deleted `referenceFocusPick`.
//   Slice E re-pointed the last one, I5, and the paragraph that used to stand
//   here said it could not be done. It is quoted in full above the check,
//   because the reason it was wrong is worth keeping:
//
//     * it said `selection.setHot` "closes over EXITS and the chapter's
//       `active` variable, so reconstituting it would mean rebuilding the
//       chapter's state". Neither free name is chapter state.
//       the root contract has no browser dependency, so the REAL EXITS is
//       importable under plain node; and a mutable closure variable
//       is what a PARAMETER is when the body's last act is to return it.
//     * I5 remains the program's ONLY guard on the DI-1 release semantics —
//       golden captures run at dt = 0 with no hover, so no capture can see it
//       — but it is now a guard over the SHIPPED BYTES, with the guarded
//       release it forbids as a D58 mutant of those bytes rather than as a
//       second hand-written body standing beside a first.
//
//   The general lesson, recorded because this program keeps meeting it: "this
//   cannot be executed offline" is a MEASUREMENT, and it was inherited across
//   four slices without being re-measured after the tree changed underneath
//   it.
//
// ---------------------------------------------------------------------------
// The source pins (T1-T4) record the tree AS IT IS. As of slice D they are ALL
// at the design's end state: T1 (chapter-interactions.js) and T4 since slice
// C, T2 (ui.js) and T3 (journey.js) since slice D. They are exact-value pins
// in both directions: adding a literal fails, and removing one fails too.
//
// T2 and T3 are now ASSERT-ZERO scans — zero chapter-name literals, zero
// `window.journey` reads, zero `chapters.<id>` inside applyFrame — and zero is
// also what a scan that never read the file reports. Each therefore carries
// D46's remedy in D54's improved form: an inputs pin, plus a positive control
// pinned to the SET of sites that replaced what was removed, keyed
// `file :: trimmed text`. See `siteSet` for why a set and not a count, and
// D93 for why neither subject takes the `line` component: journey/ui.js and
// journey/journey.js are both under active rewrite by later orders, so a line
// key on either churns on edits it has no opinion about. (T2 was re-keyed by
// QA-05; T3's four rows by PIN-01.)
//
// ---------------------------------------------------------------------------
// D44/D46 — a `--prove-failure` harness cannot see an assertion that is not a
// comparison, and it cannot see an assert-ZERO that never read its inputs.
// `LPS1` is the comment-aware literal-predicate scan D44 requires, with the
// positive control and the inputs pin D46 requires. Both run in BOTH modes.
//
// LPS1 and LPS2 PIN NUMBERS AND MANIFESTS ABOUT THIS FILE — the count of
// registered `check(` sites, the count of `assert.*` sites, and (D54) the
// ID MANIFEST of every registered check. They are the D46 inputs pin, and they
// are deliberately brittle: ANY edit to this suite that adds or removes a
// check or an assertion must move them. That is the cost of the pin and it is
// the point of it. If you are here because one failed on a count, update the
// literal — do not loosen the comparison. If you are here because the MANIFEST
// failed, add or remove the row; that is D54, and bumping a number is exactly
// what it exists to prevent.
//
// LPS2 adopts QA-03's widened receiver-agnostic PATTERN verbatim and its
// 27-row fixture table. It does NOT adopt QA-03's comment stripper, which is
// measurably wrong on this file — see the note at LPS2.
//
// ---------------------------------------------------------------------------
// S-2/F-3 — WHAT THIS SUITE DOES NOT PROVE ABOUT THE SHIPPED CHAPTERS.
// STILL OPEN AT THE END OF C05. SLICE E DID NOT CLOSE IT AND DOES NOT CLAIM TO.
//
// `validateChapterDescriptor` has never been invoked over a real chapter: no
// journey/chapters/*/index.js is loaded by any suite in the tree, because they
// pull `three` and build DOM/WebGL state at construction. So the type contract
// at journey/chapter-contract.js:77-110 is unexecuted against production, and
// `chapter-contract.js:60`'s claim that conformance "is proved offline by
// tools/test-chapter-contract.mjs" is TRUE FOR KEY PRESENCE AND FALSE FOR THE
// TYPE CONTRACT. T4 reads declared key names out of source text; T4d reads the
// declared value TEXT of the five members the registrar branches on. Neither
// executes a chapter. Do not cite either as evidence that a chapter's
// descriptor VALUES conform.
//
// WHAT SLICE E DID DO IS BOUND IT, so the gap is an enumerated list rather
// than an open-ended "the values are unchecked". Of the 38 declared members:
//
//   * 20 are DATA VALUES (`null`, `true`, `false`, `NODE_IDS`,
//     `[...FIXED_HOTSPOTS.inspire]`, `bindLandingGate`, and owned's `nodeIds`,
//     which is a reference to a `const` ARRAY). Their declared text is pinned
//     by T4/T4d; five of them are what the registrar branches on.
//   * 18 are FUNCTIONS (6 inline methods, 12 references to local `function`
//     declarations). T6 resolves and scans every one of their bodies for
//     `this`. None of the eighteen has ever been CALLED by anything offline.
//
// So the residue is exact, and T6 pins both numbers so they cannot drift:
// **eighteen function bodies, never executed.** ONE of the eighteen now has
// its bytes run — inspire's `selection.setHot` (I5, materialised) — and the
// three ui.js closures that CALL into them are run over doubles (MUTD). The
// other seventeen are read, never run.
//
// Slice E imports the dependency-free root-level Inspire exit contract, NOT a
// chapter module. It makes I5's fixture real and does not close F-3.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CORE_KEYS, CAPABILITY_KEYS, CAPABILITY_MEMBERS, validateChapterDescriptor,
} from '../journey/chapter-contract.js';
import { snapChapterLandings } from '../journey/chapter-entry.js';
import { registerChapterInteractions } from '../journey/chapter-interactions.js';
import {
  JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, FIXED_HOTSPOTS, validateJourneyStructure,
} from '../journey/structure.js';
// The registrar's own two dependencies, imported here for the SAME reason it
// imports them: the D58 mutant sweep materialises the shipped registrar from
// its bytes and must close it over exactly the names its import block supplied.
import { CONTENT } from '../content/content.js';
// The REAL route thresholds. journey/route.js imports no `three` and builds no
// DOM, so unlike journey.js itself it can be imported here — which is what
// lets I3(b) drive the materialised focal pick over shipped route data rather
// than over a synthetic ladder.
import { startOf } from '../journey/route.js';
// The REAL inspire exits. The dependency-free root contract can be imported
// under plain node; the chapter's own index.js is the only thing that pulls `three`.
// This is what lets slice E's I5 drive inspire's SHIPPED `setHot` bytes over
// the SHIPPED exit list instead of over a hand-transcribed stand-in. It is NOT
// a chapter descriptor and it does not close S-2/F-3: see the header note.
import { EXITS, EXIT_SLOT, exitIndexOf } from '../inspire-exits.js';
import { parse } from 'espree';

import { stripComments } from './strip-comments.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Every production `.js` module, off the disk rather than hand-listed (D94),
 *  so a file that lands tomorrow is scanned tomorrow. Fixtures and tests are
 *  excluded by extension: production directories hold `.js`, instruments hold
 *  `.mjs`. Used by the `onHot` census in section MUTD. */
const PRODUCTION_JS = (() => {
  const out = [];
  const walk = (dir, prefix) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const rel = `${prefix}${e.name}`;
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}/`);
      else if (e.name.endsWith('.js')) out.push(rel);
    }
  };
  walk('journey', 'journey/');
  walk('organism', 'organism/');
  out.push('main.js', 'flags.js');
  return out.sort();
})();

/* ================================================================== *
 * 0a. THE ABORT SENTINEL  (D57)                                      *
 *                                                                    *
 * This suite does real work at module top level — it reads eight     *
 * source files, materialises two production bodies with `new         *
 * Function`, and runs the 15-mutant sweep — so a ReferenceError, a   *
 * failed read or a broken anchor kills the process BEFORE the runner *
 * prints anything. A crashing run is then byte-identical to a clean  *
 * one through any filter that matches only failure lines: an order   *
 * shipped a ReferenceError into the gate this way, reading its own   *
 * output through `grep -E "^FAIL|verify:"` and taking the empty      *
 * result for "no failures". A crashing run prints neither a FAIL     *
 * line nor a summary line. The exit code said otherwise and was not  *
 * consulted.                                                         *
 *                                                                    *
 * So: emit a line BEGINNING `FAIL` if the process ends before the    *
 * runner reported. It fires through the very filter that hid the     *
 * original crash. J04a's `verify-j04a.mjs` is the reference          *
 * implementation and this is the same shape.                         *
 * ================================================================== */

/* SLICE E — ONE SENTINEL PER REPORTING PHASE, NOT ONE PER PROCESS.
 *
 * The flag used to be raised on the line BEFORE the summary was printed. That
 * leaves a window — narrow, but exactly the wrong shape — in which the suite
 * has stood the sentinel down and has not yet said anything: a crash there
 * prints NO summary AND NO sentinel, which is the silent case the sentinel
 * exists to abolish. Worse in principle, and the reason D57 names phases: any
 * work added after a summary would run with the sentinel already down, so a
 * crash in it would leave a reassuring `PASS (N checks)` as the last line.
 *
 * So the flag is raised only once the summary has actually been WRITTEN, and
 * the sentinel names the phase that died. `PHASE` is assigned at the top of
 * each branch, so an abort during module-scope work — where this suite does
 * most of its reading, materialising and mutating — reports `startup`. */
let REPORTED = false;
let PHASE = 'startup';
process.on('exit', (code) => {
  if (!REPORTED) {
    console.log(`FAIL chapter contract ABORTED during '${PHASE}' before reporting (exit ${code}) — `
      + 'the suite did not run to completion; no check total and no site total are available');
  }
});

/* ================================================================== *
 * 0. THE FAILABILITY HARNESS                                         *
 *                                                                    *
 * Twelve tautological assertions were found across seven orders this *
 * run. The cure QA-01 named is a --prove-failure mode: every value   *
 * that feeds a comparison, and every deliberately-broken fixture, is *
 * wrapped in a numbered SITE. In prove mode the runner re-runs each  *
 * check once per site with that one site corrupted (an actual is     *
 * perturbed; a broken fixture is replaced by its unbroken base, or   *
 * a valid one by a broken variant) and REQUIRES the check to throw.  *
 * A site that cannot be made to fail is reported and exits non-zero. *
 * ================================================================== */

const P = { on: false, site: 0, target: -1, hit: false };

function corrupt(v) {
  if (typeof v === 'string') return `${v}~CORRUPT`;
  if (typeof v === 'number') return Number.isFinite(v) ? v + 1 : 0;
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'bigint') return v + 1n;
  if (typeof v === 'function') return function corrupted() {};
  if (Array.isArray(v)) return [...v, '~CORRUPT'];
  if (v instanceof Set) return new Set([...v, '~CORRUPT']);
  if (v instanceof Map) return new Map([...v, ['~CORRUPT', 1]]);
  if (v === null || v === undefined) return '~CORRUPT';
  if (typeof v === 'object') return { '~CORRUPT': true };
  return '~CORRUPT';
}

/** Wrap an ACTUAL — a value on its way into a comparison. */
function A(value) {
  const n = P.site++;
  if (P.on && n === P.target) { P.hit = true; return corrupt(value); }
  return value;
}

/** Wrap a FIXTURE that has a counterpart. For a check that asserts a throw,
 *  `normal` builds the broken input and `alt` returns the sound one; for a
 *  check that asserts acceptance, the two are the other way round. Either way
 *  the swap must turn the check red. */
function F(normal, alt) {
  const n = P.site++;
  if (P.on && n === P.target) { P.hit = true; return alt(); }
  return normal();
}

const CHECKS = [];
const check = (name, fn) => { CHECKS.push({ name, fn }); };

/* ================================================================== *
 * 1. FIXTURES — fake chapters                                        *
 * ================================================================== */

/** A conforming descriptor and nothing else: a plain object literal, no THREE,
 *  no DOM. The idiom is already the codebase's (tools/test-chapter-entry.mjs,
 *  tools/test-frame-order.mjs's makeChapter). */
function fake(id, extra = {}) {
  return {
    id,
    group: { name: `${id}-root` },
    counts: null,
    _armed: false,
    setArmed(on) { this._armed = !!on; },
    get armed() { return this._armed; },
    snap() { this.calls.push('snap'); },
    snapLanding: null,
    calls: [],
    ...extra,
  };
}

const rowOf = (id) => JOURNEY_SCHEMA.chapters.find((c) => c.id === id);

/** A conforming `visibility` — every declared member present, nullable ones
 *  explicitly null. */
function visibility(nodeIds, over = {}) {
  return {
    nodeIds,
    nodeWorld: (nid) => ({ node: nid }),
    nodeReveal: null,
    nodeRadius: null,
    labelPolicy: null,
    revealDirect: false,
    revealScrub: false,
    setExcludedNodes: null,
    bindCopyEase: null,
    ...over,
  };
}

/* ================================================================== *
 * 2. [validator] I1, I7, I8, I9 — the contract machinery             *
 * ================================================================== */

check('I1 [validator] a descriptor missing any core key fails, and the message names the chapter id', () => {
  // Seven keys, six members — setArmed and its `armed` readback are one member
  // but two keys, and both must be declared.
  assert.deepEqual(A([...CORE_KEYS]),
    ['id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding'],
    'the core key set is pinned; adding or removing one is a contract change');

  for (const key of CORE_KEYS) {
    const d = F(
      () => { const o = fake('inspire'); delete o[key]; return o; },
      () => fake('inspire'),
    );
    assert.throws(
      () => validateChapterDescriptor(d, rowOf('inspire')),
      (err) => err.message.includes('inspire') && err.message.includes(`'${key}'`),
      `a descriptor with no '${key}' must be rejected, by a message naming the chapter and the key`,
    );
  }

  // The null value is not the problem — the missing KEY is. `snapLanding: null`
  // and `counts: null` are conforming.
  const nulls = F(() => fake('inspire'), () => { const o = fake('inspire'); delete o.counts; return o; });
  validateChapterDescriptor(nulls, rowOf('inspire'));
  assert.equal(A(nulls.snapLanding), null, 'snapLanding: null is a declared absence, not a hole');
});

check('I1b [validator] a core key of the wrong type fails, and a runtime row with no descriptor fails', () => {
  const wrong = F(() => fake('connect', { group: null }), () => fake('connect'));
  assert.throws(() => validateChapterDescriptor(wrong, rowOf('connect')),
    /connect: core key 'group' must be object/,
    'group is non-null: a chapter that draws nothing is not a runtime chapter');

  const missing = F(() => null, () => fake('connect'));
  assert.throws(() => validateChapterDescriptor(missing, rowOf('connect')),
    /connect: runtime chapter has no descriptor/);
});

check('I7 [validator] an unknown member INSIDE a capability fails; an unknown key on the descriptor ROOT passes', () => {
  const bad = F(
    () => fake('owned', { selection: { setHot: null, setSelected: null, setWarm: () => {} } }),
    () => fake('owned', { selection: { setHot: null, setSelected: null } }),
  );
  assert.throws(() => validateChapterDescriptor(bad, rowOf('owned')),
    /owned: capability 'selection' declares unknown member 'setWarm'/,
    'the production surface is closed: a capability may not grow a member silently');

  // H12 — a capability may not carry a timing constant.
  const numeric = F(
    () => fake('owned', { selection: { setHot: null, setSelected: 90 } }),
    () => fake('owned', { selection: { setHot: null, setSelected: null } }),
  );
  assert.throws(() => validateChapterDescriptor(numeric, rowOf('owned')),
    /capability 'selection' member 'setSelected' must be function\|null, got number/);

  // A capability that omits a declared member fails too: the declare-the-key
  // rule holds inside a capability as well as on the core.
  const partial = F(
    () => fake('owned', { selection: { setHot: null } }),
    () => fake('owned', { selection: { setHot: null, setSelected: null } }),
  );
  assert.throws(() => validateChapterDescriptor(partial, rowOf('owned')),
    /capability 'selection' is missing member 'setSelected'/);

  // The QA surface stays open — `exits`, `pacing`, `portraits`, `_sporeSeat`
  // are unknown root keys and must not be rejected.
  const qa = F(
    () => fake('owned', { portraits: { photosReady: true }, _sporeSeat: {}, dispose() {} }),
    () => fake('owned', { portraits: { photosReady: true }, selection: { nope: 1 } }),
  );
  validateChapterDescriptor(qa, rowOf('owned'));
  assert.equal(A(typeof qa.dispose), 'function', 'an unread QA member survives validation');
});

check('I8 [validator] a descriptor whose id differs from its schema row id fails', () => {
  const d = F(() => fake('inspire'), () => fake('connect'));
  assert.throws(() => validateChapterDescriptor(d, rowOf('connect')),
    /connect: declared id "inspire" does not match its schema row id "connect"/,
    'C06 must be able to check that the descriptor under key k claims id === k');

  // Positive control: the matching case is accepted, so the check above is not
  // rejecting every descriptor for some other reason.
  const ok = F(() => fake('connect'), () => fake('final'));
  validateChapterDescriptor(ok, rowOf('connect'));
  assert.equal(A(ok.id), 'connect');
});

check('I9 [validator] a runtime:false schema row requires no descriptor; a runtime:true one does', () => {
  const mission = rowOf('mission');
  assert.equal(A(mission.runtime), false, 'mission is a schema row with no module');
  const absent = F(() => undefined, () => ({ id: 'mission' }));
  validateChapterDescriptor(absent, mission);
  validateChapterDescriptor(null, mission);

  // Positive control on the same instrument: the four runtime rows do require
  // one, so the acceptance above is about `runtime: false` and nothing else.
  const runtimeIds = A([...RUNTIME_CHAPTER_IDS]);
  assert.deepEqual(runtimeIds, ['inspire', 'equip', 'connect', 'owned', 'final'],
    'five runtime chapters since Equip (2026-08-30), and mission still not one of them');
  for (const id of runtimeIds) {
    assert.throws(() => validateChapterDescriptor(undefined, rowOf(id)), /has no descriptor/);
  }
});

check('I9b [validator] a conforming descriptor with all four capabilities is accepted', () => {
  const d = F(
    () => fake('owned', {
      counts: { portraits: 16 },
      snapLanding() {},
      focus: null,
      interaction: { zones: () => [], trigger: () => null },
      selection: { setHot: () => {}, setSelected: () => {} },
      visibility: visibility(['contributor-0'], { nodeRadius: () => 1, labelPolicy: () => null, setExcludedNodes: () => {} }),
    }),
    () => fake('owned', { focus: { world: () => null, extra: 1 } }),
  );
  validateChapterDescriptor(d, rowOf('owned'));
  assert.deepEqual(A(Object.keys(d).filter((k) => CAPABILITY_KEYS.includes(k))),
    ['focus', 'interaction', 'selection', 'visibility'],
    'all four capabilities are declarable on one descriptor');
  assert.deepEqual(A([...CAPABILITY_KEYS]), ['focus', 'interaction', 'selection', 'visibility']);
  // ALL FOUR member lists are pinned, not just `visibility` (C05B-MAJOR-1's
  // compounding half). T4 subtracts the shipped chapters' declared members
  // against these lists; an unpinned allowlist can widen with nothing failing,
  // and slices C-E open journey/chapter-contract.js.
  assert.deepEqual(A([...CAPABILITY_MEMBERS.focus]), ['world']);
  assert.deepEqual(A([...CAPABILITY_MEMBERS.interaction]), ['zones', 'trigger']);
  assert.deepEqual(A([...CAPABILITY_MEMBERS.selection]), ['setHot', 'setSelected']);
  assert.deepEqual(A([...CAPABILITY_MEMBERS.visibility]), [
    'nodeIds', 'nodeWorld', 'nodeReveal', 'nodeRadius', 'labelPolicy',
    'revealDirect', 'revealScrub', 'setExcludedNodes', 'bindCopyEase',
  ]);
  // D45 — the four lists above are the whole table, and it has 14 members.
  assert.deepEqual(A([
    Object.keys(CAPABILITY_MEMBERS).length,
    Object.values(CAPABILITY_MEMBERS).reduce((n, m) => n + m.length, 0),
  ]), [4, 14], 'the capability table is four lists and fourteen members — cardinality pinned');
});

/* ================================================================== *
 * 3. [executed] I2 — against the real journey/chapter-entry.js       *
 * ================================================================== */

check('I2 [executed] snapLanding: null validates AND draws zero calls from the real snapChapterLandings', () => {
  const inspireLike = F(() => fake('inspire'), () => { const o = fake('inspire'); delete o.snapLanding; return o; });
  validateChapterDescriptor(inspireLike, rowOf('inspire'));

  const landed = [];
  const connectLike = fake('connect', { snapLanding() { landed.push('connect'); } });
  snapChapterLandings({ inspire: inspireLike, connect: connectLike });

  // H2: inspire's intro cascade dies if snapLanding is implemented as a call to
  // snap(). `null` produces literally zero calls — identical to today's absence.
  assert.deepEqual(A(inspireLike.calls), [], 'a null snapLanding must not reach snap()');
  // Positive control on the same instrument: the neighbouring chapter WAS
  // called, so the empty log above is an absence of calls, not a dead harness.
  assert.deepEqual(A(landed), ['connect'], 'the instrument counts a real snapLanding');
});

/* ================================================================== *
 * 4. [reference] the loops the design specifies — see the header      *
 * ================================================================== */

/* `referenceFocusPick` — design.md §5.3 — WAS HERE, and was DELETED BY SLICE
 * D, which put that loop into journey/journey.js as `pickChapterFocus`. Slice
 * A's limitations.md §4 required exactly this of every consuming slice:
 * re-point the pin and delete the reference body, because a reference
 * implementation that survives beside its production twin is a spec nobody is
 * obliged to satisfy. What replaces it is below. */

/** journey/journey.js's OWN `pickChapterFocus`, materialised from its bytes.
 *
 *  journey.js cannot be imported under plain node — it pulls `three` through
 *  the page's import map (`Cannot find package 'three'`), the same wall that
 *  keeps the four chapter modules out of this suite. So the body is extracted
 *  from the shipped source by brace matching and reconstituted with
 *  `new Function`. The free names are supplied, and they are the REAL values:
 *  `startOf` imported from journey/route.js, `RUNTIME_CHAPTER_IDS` from
 *  journey/structure.js. Nothing here is a copy of the loop.
 *
 *  WHAT THIS IS AND IS NOT. The bytes are the shipped bytes and the route data
 *  is the shipped route data, which is strictly more than the deleted
 *  reference proved. It is still NOT [executed] in the sense I2/I4/I6/I10 are:
 *  no module was imported, so what stays unproved is the BINDING — that
 *  `applyFrame` calls this function, with these arguments, at this point in
 *  the frame. T3 pins that half by source text, in the same invocation.
 *
 *  ANCHOR-MISS GUARDS, structural rather than textual (slice B found a bare
 *  `${cap}: null` anchor matching the phrase inside a doc comment):
 *    * `bodyOf` throws if there is no `function pickChapterFocus(`;
 *    * the extracted body's IDENTIFIER SET is pinned as an exact literal list,
 *      so a body that grows a fifth free name — one `new Function` would not
 *      supply and this fixture might never reach — fails loudly here rather
 *      than silently later;
 *    * `new Function` is non-strict, so an unsupplied free name that IS
 *      reached throws ReferenceError at call time. Both halves, deliberately. */
function materialiseFocusPick() {
  const body = bodyOf(codeKeepStrings(read('journey/journey.js')), 'pickChapterFocus');
  const words = [...new Set(body.match(/[A-Za-z_$][\w$]*/g) || [])].sort();
  return { body, words, fn: new Function('chapters', 'frameP', 'startOf', 'RUNTIME_CHAPTER_IDS', body) };
}

/* `referenceRegistrar` — design.md §5.1 + §3.4 + H4 + H5 — WAS HERE, and was
 * DELETED BY SLICE C. journey/chapter-interactions.js now contains that body,
 * so I4, I6 and I10 import and execute the real `registerChapterInteractions`
 * instead. Slice A's limitations.md §4 required exactly this: "re-point ...
 * and delete the reference bodies", because a reference implementation that
 * survives beside its production twin is a spec nobody is obliged to satisfy.
 *
 * The real function does two things the reference did not, and both make the
 * checks below stronger rather than weaker:
 *   1. it calls `validateJourneyStructure(JOURNEY_SCHEMA, { nodes })`, so a
 *      fixture whose node ids or ORDER do not match the shipped schema throws
 *      rather than merely failing an assertion — which is why the fixtures use
 *      SCHEMA_NODES below;
 *   2. it resolves each hotspot's accessible `label` out of the real CONTENT.
 */

/** Node id lists that satisfy the shipped schema, so the REAL registrar's
 *  validateJourneyStructure call passes. inspire and connect are `kind:
 *  'fixed'` and are pinned to the schema's own ids IN ORDER; owned is `kind:
 *  'dynamic'` with cardinality 16. Cardinalities are pinned as literals at
 *  every use (D45). */
const SCHEMA_NODES = {
  inspire: ['artcompute', 'arca', 'tworp'],
  equip: ['quark', 'brotchen'],
  connect: ['ados', 'hivemind', 'discord'],
  owned: Array.from({ length: 16 }, (_, i) => `contributor-${i}`),
};

function fakeUi(log) {
  return {
    copyEase: (id) => () => `ease:${id}`,
    addHotspot(opts) { const h = { ...opts }; log.push(`hotspot:${opts.chapter}/${opts.id}`); return h; },
    addHoverZone(opts) { log.push(`zone:${opts.chapter}/${opts.id}`); return opts; },
  };
}

check('I3 [validator+materialised] capabilities are opt-in, and a null focus yields setFocusHint(null)', () => {
  // (a) A descriptor declaring only `visibility` validates, and the other three
  //     capability keys are absent — so every consumer's `ch.focus &&` guard is
  //     false and the chapter is never asked.
  const only = F(
    () => fake('connect', { visibility: visibility(['ados', 'hivemind', 'discord'], { revealScrub: true }) }),
    () => fake('connect', { visibility: visibility(['ados'], { revealScrub: null }) }),
  );
  validateChapterDescriptor(only, rowOf('connect'));
  assert.deepEqual(A(CAPABILITY_KEYS.filter((k) => Object.hasOwn(only, k))), ['visibility']);

  // (b) H9 — owned's focal source is null TODAY and must stay null: the lens
  //     receives setFocusHint(null) for the whole Owned leg. Giving it a real
  //     focal point is visual authoring that drifts two goldens (Q1/DI-5).
  //
  //     RE-POINTED BY SLICE D. This drove `referenceFocusPick`, a copy of the
  //     loop written in this file. It now drives journey/journey.js's own
  //     `pickChapterFocus`, materialised from its bytes, over the REAL route
  //     thresholds.
  const { body, words, fn: pickFocus } = materialiseFocusPick();

  // ANCHOR-MISS GUARD (structural). The identifier set of the extracted body,
  // pinned exactly. A body that grows a free name `new Function` does not
  // supply fails HERE, on every run, rather than on the one fixture that
  // happens to reach it.
  assert.deepEqual(A(words), [
    'RUNTIME_CHAPTER_IDS', 'armed', 'break', 'ch', 'chapters', 'const', 'continue',
    'focus', 'for', 'frameP', 'i', 'id', 'if', 'length', 'let', 'next', 'null',
    'return', 'startOf', 'world',
  ], 'the materialised body must reference only the four supplied names plus its own locals');
  // D45 — the extraction really produced a body, not an empty string.
  assert.equal(A(body.includes('ch.focus.world()')), true,
    'the materialised body must be the capability-driven pick, not an empty extraction');

  // The REAL route thresholds, pinned as literals. Legs are `startOf(next) +
  // 0.02`: inspire below 0.28, equip below 0.40, connect below 0.62, owned
  // below 0.87, final otherwise. (Equip joined the runtime set 2026-08-30 and
  // took the front of Inspire's old span; the shipped values were 0.40 / 0.62 /
  // 0.87 before it, and everything from 0.38 up is unmoved.)
  assert.deepEqual(A(RUNTIME_CHAPTER_IDS.map((id) => startOf(id))), [0.14, 0.26, 0.38, 0.6, 0.85],
    'route data: if these move, the leg probes below move with them');

  const world = { x: 1, y: 2, z: 3 };
  const chapters = {
    inspire: fake('inspire', { _armed: true, focus: { world: () => world } }),
    equip: fake('equip', { _armed: true, focus: { world: () => world } }),
    connect: fake('connect', { _armed: true, focus: { world: () => null } }),
    owned: F(() => fake('owned', { _armed: true, focus: null }),
      () => fake('owned', { _armed: true, focus: { world: () => world } })),
    final: fake('final', { _armed: true, focus: { world: () => world } }),
  };
  const pick = (p) => pickFocus(chapters, p, startOf, RUNTIME_CHAPTER_IDS);
  assert.equal(A(pick(0.10)), world, 'inspire leg: the chapter is asked');
  assert.equal(A(pick(0.32)), world, 'equip leg: the chapter is asked');
  assert.equal(A(pick(0.50)), null, 'connect leg: this chapter answers null');
  assert.equal(A(pick(0.70)), null, 'owned leg: focus: null stays null — the chapter is never asked');
  assert.equal(A(pick(0.95)), world, 'final leg');

  // Positive control: an UNARMED chapter yields null on a leg that otherwise
  // yields a world, so the null above is the capability's value and not a loop
  // that never reaches the chapter.
  chapters.inspire._armed = false;
  assert.equal(A(pick(0.10)), null, 'an unarmed chapter is not asked');
});

/* I4, I6 and I10 take the registrar AS A PARAMETER rather than closing over the
 * import. The checks below supply the real `registerChapterInteractions`, so
 * nothing about what they measure changes; the MUT sweep supplies a MUTATED
 * copy of the same shipped bytes and requires the body to go red.
 *
 * D58. That parameter is the whole point. Slice C shipped four POISONS — all of
 * which perturb the harness's own doubles — and zero MUTANTS. A poison can only
 * ever show that a comparison is live; it says nothing about what the
 * instrument fails to look at. Its R1 reviewer mutated the SHIPPED registrar
 * instead and found two live gaps (F-1, F-2) in an artifact that four poisons
 * had pronounced sound. So these three bodies are now reusable subjects, and
 * `MUT` below names, for every one of fifteen mutants, WHICH of them is
 * expected to kill it — so that a survivor is a decision on the record rather
 * than an oversight. */
function i4Body(reg) {
  const log = [];
  const zoneOpts = [];
  const triggered = [];
  const ui = fakeUi(log);
  const addZone = ui.addHoverZone.bind(ui);
  ui.addHoverZone = (opts) => { zoneOpts.push(opts); return addZone(opts); };
  const ownedZones = () => [
    // AN ACTIONED ZONE AND AN ACTIONLESS ONE. Before this slice's repair the
    // fixture had only the actionless arm, so `z.action && interaction.trigger`
    // was exercised on ONE side and asserted on NEITHER: R1's M11 (`null` ->
    // a no-op function) and M15 (the action neutered to `null`) both survived
    // the whole suite. One zone per arm is what makes them both die below.
    { id: 'root-crown', world: () => null, radius: 1, label: 'crown', announce: 'the crown', action: 'redeal' },
    { id: 'root-rim', world: () => null, radius: 2, label: 'rim', announce: null, action: null },
  ];
  const chapters = {
    inspire: fake('inspire', {
      visibility: visibility(F(() => [...SCHEMA_NODES.inspire], () => ['arca', 'artcompute', 'tworp'])),
    }),
    equip: fake('equip', { visibility: visibility([...SCHEMA_NODES.equip]) }),
    connect: fake('connect', { visibility: visibility([...SCHEMA_NODES.connect]) }),
    owned: fake('owned', {
      visibility: visibility([...SCHEMA_NODES.owned]),
      interaction: { zones: ownedZones, trigger: (name) => { triggered.push(name); } },
    }),
    // final declares no `visibility`, exactly as it ships, and must be SKIPPED
    // — the old body's three hard-coded calls never mentioned it either.
    final: fake('final'),
  };
  const nodeChapter = reg(ui, chapters);

  // H3 — registration order is tab order and label stagger. Chapter order is
  // RUNTIME_CHAPTER_IDS; within a chapter it is visibility.nodeIds order.
  assert.deepEqual(A(log), [
    'hotspot:inspire/artcompute', 'hotspot:inspire/arca', 'hotspot:inspire/tworp',
    'hotspot:equip/quark', 'hotspot:equip/brotchen',
    'hotspot:connect/ados', 'hotspot:connect/hivemind', 'hotspot:connect/discord',
    'hotspot:owned/contributor-0', 'hotspot:owned/contributor-1', 'hotspot:owned/contributor-2',
    'hotspot:owned/contributor-3', 'hotspot:owned/contributor-4', 'hotspot:owned/contributor-5',
    'hotspot:owned/contributor-6', 'hotspot:owned/contributor-7', 'hotspot:owned/contributor-8',
    'hotspot:owned/contributor-9', 'hotspot:owned/contributor-10', 'hotspot:owned/contributor-11',
    'hotspot:owned/contributor-12', 'hotspot:owned/contributor-13', 'hotspot:owned/contributor-14',
    'hotspot:owned/contributor-15',
    'zone:owned/root-crown', 'zone:owned/root-rim',
  ]);
  // D45 — the registrar's own loop cardinality, pinned to literals rather than
  // left implicit in the array above. 24 hotspots, 2 zones, 26 entries.
  assert.deepEqual(A([
    log.length,
    log.filter((e) => e.startsWith('hotspot:')).length,
    log.filter((e) => e.startsWith('zone:')).length,
    Object.keys(nodeChapter).length,
  ]), [26, 24, 2, 24], 'the registrar iterated 24 nodes and 2 zones — pinned, not derived');

  // H5 stated as its own predicate, so the pin above is not the only guard.
  const lastHotspot = log.map((e) => e.startsWith('hotspot:')).lastIndexOf(true);
  const firstZone = log.findIndex((e) => e.startsWith('zone:'));
  assert.equal(A(firstZone > lastHotspot), true, 'zones must not jump the hotspot tab order');
  assert.equal(A(firstZone), 24, 'the zone count and its position are pinned, not merely ordered');

  /* ---- F-2: THE `action: null` ARM IS NOW ASSERTED, NOT MERELY RUN -------
     R1: "the false arm of `z.action && interaction.trigger ? … : null` runs —
     but nothing reads `action` off the recorded zone", so M11 (null -> a no-op
     function) survived both instruments. This is the mechanism by which a
     chapter states "this zone commits nothing"; turning it into a function
     makes every actionless zone appear committable to ui.js, which decides
     whether to offer the affordance on `typeof z.action === 'function'`.

     Both arms, pinned by VALUE and not by typeof alone: `null` is the fact,
     and a function that does nothing is not the same fact. */
  assert.deepEqual(A(zoneOpts.map((z) => (z.action === null ? 'null' : typeof z.action))),
    ['function', 'null'],
    'an actioned zone gets a thunk; an actionless one gets NULL, not a no-op function');
  // And the thunk is the chapter's own trigger, closed over the zone's own
  // action name — the other half of the same branch.
  zoneOpts[0].action();
  assert.deepEqual(A(triggered), ['redeal'],
    "the thunk calls the chapter's trigger with the zone's own action name");

  // The returned node->chapter map is the registrar's other output, and it is
  // what validateJourneyStructure was handed. Pin its partition exactly.
  assert.deepEqual(A([
    Object.values(nodeChapter).filter((c) => c === 'inspire').length,
    Object.values(nodeChapter).filter((c) => c === 'connect').length,
    Object.values(nodeChapter).filter((c) => c === 'owned').length,
    Object.values(nodeChapter).filter((c) => c === 'final').length,
  ]), [3, 3, 16, 0], 'final registers nothing: it declares no visibility');

  // H6 — inspire registers from FIXED_HOTSPOTS.inspire, which is the schema's
  // own order, and the fixture's nodeIds must be that array.
  assert.deepEqual(A([...FIXED_HOTSPOTS.inspire]), ['artcompute', 'arca', 'tworp']);
  assert.deepEqual(A([...SCHEMA_NODES.inspire]), [...FIXED_HOTSPOTS.inspire]);

  /* ---- F-1: THE VALIDATE CALL'S EFFECT, NOT ITS POSITION ----------------
     `chapter-interactions.js:100` is the ONLY runtime caller of the node-
     registry validation anywhere in the tree: symbols/data.js validates
     symbols, chapter-registry.js validates builders, structure.test.mjs tests
     this validator in ISOLATION. Nothing executes it over a real registration
     pass except the registrar itself.

     Everything above proves the call SITS between the two passes — the log
     shows every hotspot before every zone, and M5b (a pure two-pass reorder)
     dies on it. Nothing above proved the call DOES anything: R1 deleted line
     100 outright and the probe stayed green, all checks stayed green,
     --prove-failure still reported every site failable, targeted lint exited
     0. Preserved structure was asserted; preserved EFFECT was not.

     So: drive the registrar over a fixture whose `nodeIds` violate the
     schema's own cardinality for a `kind: 'fixed'` chapter, and require a
     throw that NAMES THE CHAPTER. A registrar that has lost its validate call
     registers two inspire hotspots perfectly happily and returns — which is
     precisely the silent boot-time structural drift the call exists to
     prevent, and slices D and E are both scheduled to open this file. */
  const badLog = [];
  const under = F(
    () => ['artcompute', 'arca'],                    // 2 ids where the schema fixes 3
    () => [...SCHEMA_NODES.inspire],                 // the sound list: no throw, check reds
  );
  assert.throws(
    () => reg(fakeUi(badLog), {
      inspire: fake('inspire', { visibility: visibility(under) }),
      equip: fake('equip', { visibility: visibility([...SCHEMA_NODES.equip]) }),
      connect: fake('connect', { visibility: visibility([...SCHEMA_NODES.connect]) }),
      owned: fake('owned', { visibility: visibility([...SCHEMA_NODES.owned]) }),
      final: fake('final'),
    }),
    /inspire/,
    'a node registry that violates the schema must THROW from the registrar — the validate call is load-bearing, not decorative',
  );
  // …and the throw came from the validator, after the pass it validates had
  // actually run. A registrar that threw on entry would satisfy assert.throws
  // while proving nothing about the registration it is supposed to be checking.
  assert.deepEqual(A([
    badLog.length,
    badLog.filter((e) => e.startsWith('hotspot:')).length,
    badLog.filter((e) => e.startsWith('zone:')).length,
  ]), [23, 23, 0],
  'the throw arrives AFTER the whole hotspot pass and BEFORE the zone pass — 2 + 2 + 3 + 16 hotspots, no zone');
}

check('I4 [executed] hotspots register in declaration order, and every zone registers after every hotspot', () => {
  i4Body(registerChapterInteractions);
});

/* ================================================================== *
 * I5 — THE LAST [reference] BECOMES [materialised]  (C05 slice E)    *
 *                                                                    *
 * Slice A's limitations.md §4 required each consuming slice to       *
 * re-point the reference bodies it replaced and delete them. Slice C *
 * did it for the registrar, slice D for the focal pick. This file's  *
 * header said ONE would remain and would stay a reference forever:   *
 *                                                                    *
 *   "unlike journey.js's focal pick it is not a self-contained body  *
 *    that can be materialised: it closes over EXITS and the          *
 *    chapter's `active` variable, so reconstituting it would mean    *
 *    rebuilding the chapter's state, which is writing the reference  *
 *    again under another name."                                      *
 *                                                                    *
 * THAT IS FALSE, and slice E measured it rather than repeating it.   *
 * The two free names are not chapter state:                          *
 *                                                                    *
 *   * `EXITS` is the root-level contract. It has no browser          *
 *     dependency, so the REAL array                                 *
 *     is importable under plain node. It does not                    *
 *     have to be rebuilt; it has to be imported.                     *
 *   * `active` is a mutable closure variable, and a mutable closure  *
 *     variable is exactly what a PARAMETER is when the body's last   *
 *     act is to return it. It arrives as an argument and leaves as   *
 *     the return value, so the shipped statement `active = …` writes *
 *     the parameter. Nothing is global and nothing is rebuilt.       *
 *                                                                    *
 * So I5 now executes the SHIPPED BYTES of the expression DI-1 is     *
 * about, over the SHIPPED EXITS, and the guarded release it forbids  *
 * is a D58 MUTANT of those bytes rather than a second hand-written   *
 * reference standing beside a first. What is still NOT proved is the *
 * BINDING — that ui.js's hover path reaches this member — which is   *
 * I4/I10's subject over the real registrar, and T2's by source text. *
 * ================================================================== */

/** The body of a method-shorthand member `name(args) {` inside a descriptor
 *  literal, by brace matching from an EXACT anchor that includes its own
 *  indentation. Throws if the anchor is missing OR not unique: a
 *  materialisation whose anchor has stopped matching must be loud on every
 *  run, never silently empty on the one fixture that reaches it. */
function methodBodyOf(src, anchor, where) {
  const head = src.indexOf(anchor);
  if (head < 0) throw new Error(`${where}: anchor no longer matches source: ${JSON.stringify(anchor)}`);
  if (src.indexOf(anchor, head + 1) >= 0) throw new Error(`${where}: anchor matches more than once`);
  const open = src.indexOf('{', head + anchor.length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error(`${where}: unbalanced body`);
}

const INSPIRE_SRC = read('journey/chapters/inspire/index.js');
const SET_HOT_ANCHOR = '\n      setHot(id, on) {';

/** Reconstitute a `setHot` body as `(active, id, on) -> active`. Non-strict,
 *  so an unsupplied free name that IS reached throws ReferenceError rather
 *  than reading undefined. */
function materialiseSetHot(body) {
  const fn = new Function('id', 'on', 'exitIndexOf', 'active', `${body}\n  return active;`);
  return (active, id, on) => fn(id, on, exitIndexOf, active);
}

/** The hover sequence both forms are driven over. Steps 5 and 7 are the two
 *  readings DI-1 is about: an OFF for a node that is NOT the active one. */
const I5_TRACE = [
  ['artcompute', true], ['tworp', true], ['arca', true],
  ['artcompute', true], ['arca', true], ['artcompute', false],
  ['arca', true], ['no-such-node', false], ['no-such-node', true],
];
const driveSetHot = (setHot) => {
  let active = -1;
  return I5_TRACE.map(([id, on]) => { active = setHot(active, id, on); return active; });
};

check('I5 [materialised] inspire\'s SHIPPED setHot over the REAL EXITS, and D58\'s mutant of its release', () => {
  // design.md §5.1 / MAJOR-1 / DI-1. Inspire's shipped member clears on ANY
  // off. The tempting tidy-up — `active = on ? i : (active === i ? -1 : active)`
  // — is a BEHAVIOUR CHANGE, reachable whenever an OFF for one node lands
  // after an ON for another (ui.js's deferred hover clear). Golden captures
  // run at dt = 0 with no hover, so NO capture can see the difference and this
  // check is still the program's only guard on it. What changed in slice E is
  // what it guards: the shipped bytes, not a transcription of them.

  const body = methodBodyOf(INSPIRE_SRC, SET_HOT_ANCHOR, 'inspire.selection.setHot');

  // (0a) THE FREE-NAME PIN, per slice D's I3(b). The extracted body's
  //      identifier set is an exact literal list, so a body that grows a free
  //      name `new Function` does not supply fails on EVERY run rather than on
  //      the one fixture that happens to reach it.
  const idents = [...new Set(codeEmptyStrings(body).match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [])].sort();
  assert.deepEqual(A(idents), ['active', 'const', 'exitIndexOf', 'i', 'id', 'on'],
    'the shipped body closes over exactly exitIndexOf and active; every other name is its own');

  // (0b) THE IMPORT PRODUCED SOMETHING (D45). EXITS is the real array, not a
  //      transcription of it. Geometry and schema now share canonical ids;
  //      legacy route aliases are normalized before reaching the chapter.
  assert.deepEqual(A(EXITS.map((e) => e.id)), ['tworp', 'arca', 'artcompute'],
    'the REAL root EXITS, in physical-slot order — imported, not transcribed');
  assert.deepEqual(A(EXITS.map((e) => e.slot)),
    [EXIT_SLOT.CENTER, EXIT_SLOT.LEFT, EXIT_SLOT.RIGHT],
    'every exit declares the physical slot where the shared contract placed it');
  assert.deepEqual(A(['tworp', 'arca', 'artcompute', '2rp'].map(exitIndexOf)),
    [EXIT_SLOT.CENTER, EXIT_SLOT.LEFT, EXIT_SLOT.RIGHT, -1],
    'identity resolves through explicit slots; the route layer owns the legacy alias');
  assert.deepEqual(A([...FIXED_HOTSPOTS.inspire]), ['artcompute', 'arca', 'tworp'],
    'and the independent registration order, whose alias and ordering differ');

  // (1) THE NULL-MUTANT CONTROL, and it runs FIRST. Without it a death below
  //     proves the harness broke rather than the mutation being caught.
  const shipped = driveSetHot(materialiseSetHot(body));
  assert.deepEqual(A(shipped), [2, 0, 1, 2, 1, -1, 1, -1, -1],
    'the null mutant — shipped bytes, unmodified — reproduces the shipped trace');

  // (a) the canonical lookup is id-based. Two different ids select two
  //     different targets, not one shared slot.
  assert.deepEqual(A(shipped.slice(0, 3)), [2, 0, 1],
    "id-based lookup: 'tworp' resolves to EXITS' canonical id at index 0");

  // (b) THE RELEASE. A -> B -> release(A) must leave NOTHING active. Under the
  //     guarded form step 5 would read 1. An unknown id clears on the OFF path
  //     (step 7) and selects nothing on the ON path (step 8) — both are
  //     today's behaviour, findIndex returning -1 in each case.
  assert.deepEqual(A([shipped[5], shipped[7], shipped[8]]), [-1, -1, -1],
    'a stale OFF clears, and so does an OFF for an id this chapter does not know');

  // (2) D58 — MUTANTS OF THE SHIPPED SUBJECT. What stood here was
  //     `F(normal, alt)` supplying a hand-written guarded release beside a
  //     hand-written unconditional one: two references, neither of them the
  //     chapter. `injected` throws if the expression it rewrites is gone, so a
  //     mutant that has stopped applying is loud rather than green.
  //
  //     D50 — each row names the QUANTITY it moves and the reading that sees
  //     it. Both mutants move `active` at a release, and the AGREEMENT pin
  //     below reads the same quantity at every step where they must NOT
  //     differ, so a mutant that perturbed something else fails there instead.
  const I5_MUTANTS = [
    {
      name: 'm1 guarded release (DI-1 itself)',
      from: 'active = on ? i : -1;',
      to: 'active = on ? i : (active === i ? -1 : active);',
      moves: 'active after an OFF for a node that is not the active one',
      killer: 'I5(b)',
      diverges: [5, 7],
    },
    {
      name: 'm2 the canonical tworp lookup deleted',
      from: 'const i = exitIndexOf(id);',
      to: "const i = id === 'tworp' ? -1 : exitIndexOf(id);",
      moves: "the index 'tworp' resolves to",
      killer: 'I5(a)',
      diverges: [1],
    },
  ];

  const survivors = [];
  const divergenceMap = {};
  for (const m of I5_MUTANTS) {
    const trace = driveSetHot(materialiseSetHot(injected(body, m.from, m.to)));
    const moved = trace.map((v, i) => (v === shipped[i] ? null : i)).filter((i) => i !== null);
    divergenceMap[m.name] = moved;
    if (moved.length === 0) survivors.push(m.name);
  }

  // Each mutant moved EXACTLY the readings its row names — not merely "some"
  // reading. A mutant that changed a step it does not claim would fail here.
  assert.deepEqual(A(divergenceMap), {
    'm1 guarded release (DI-1 itself)': [5, 7],
    'm2 the canonical tworp lookup deleted': [1],
  }, 'every mutant moves exactly the trace steps its row declares, and no others');

  // D58's loop shut: the survivor set must be EXACTLY the set declaring an
  // equivalence. Neither of these does, so a survivor here is an oversight and
  // this assertion is what stops it being a silent one.
  assert.deepEqual(A(survivors), I5_MUTANTS.filter((m) => m.equivalent).map((m) => m.name),
    'the survivors are exactly the mutants declaring an equivalence — here, none');
  assert.equal(A(I5_MUTANTS.length), 2, 'both mutants ran (D45: the loop was entered)');
});

function i6Body(reg) {
  const log = [];
  const seen = [];
  const ui = fakeUi(log);
  ui.addHotspot = (opts) => { seen.push(opts); log.push(`hotspot:${opts.id}`); return { ...opts }; };
  const chapters = {
    inspire: fake('inspire', {
      visibility: visibility([...SCHEMA_NODES.inspire], F(
        () => ({ nodeReveal: (id) => (id === 'artcompute' ? 0.5 : 0), revealDirect: true }),
        () => ({ nodeReveal: null, revealDirect: true }),
      )),
    }),
    equip: fake('equip', { visibility: visibility([...SCHEMA_NODES.equip], { revealDirect: true }) }),
    connect: fake('connect', { visibility: visibility([...SCHEMA_NODES.connect], { revealScrub: true }) }),
    owned: fake('owned', { visibility: visibility([...SCHEMA_NODES.owned], { nodeRadius: () => 4 }) }),
    final: fake('final'),
  };
  reg(ui, chapters);
  // D45 — the loop ran over every node of every declaring chapter before the
  // four samples below are read off it. 3 + 2 + 3 + 16.
  assert.equal(A(seen.length), 24, 'the registrar iterated all 24 nodes');
  const ins = seen[0];
  const equ = seen[3];
  const con = seen[5];
  const own = seen[8];
  assert.deepEqual(A([ins.chapter, equ.chapter, con.chapter, own.chapter]),
    ['inspire', 'equip', 'connect', 'owned'],
    'the four samples are one per declaring chapter, at pinned positions');

  // H4 — owned has no nodeReveal, so its sixteen labels ride the chapter COPY
  // EASE. Forwarding null as any function makes h.reveal truthy and switches
  // them onto a reveal product.
  assert.equal(A(own.reveal), undefined, 'a null nodeReveal must not become a function');
  assert.equal(A(con.radius), undefined, 'a null nodeRadius must not become a function');
  assert.equal(A(typeof own.radius), 'function', 'a declared nodeRadius does reach the hit model');
  assert.equal(A(typeof ins.reveal), 'function', 'a declared nodeReveal does reach the label gate');
  assert.equal(A(ins.reveal()), 0.5, 'and it is the chapter\'s own function, bound to its own id');

  assert.deepEqual(A([ins.revealDirect, ins.revealScrub]), [true, false]);
  assert.deepEqual(A([con.revealDirect, con.revealScrub]), [false, true]);
  assert.deepEqual(A([own.revealDirect, own.revealScrub]), [false, false]);
}

check('I6 [executed] nodeReveal/nodeRadius null arrive as undefined; the reveal flags round-trip as booleans', () => {
  i6Body(registerChapterInteractions);
});

function i10Body(reg) {
  const log = [];
  const ui = fakeUi(log);
  const hotspots = [];
  const zones = [];
  ui.addHotspot = (opts) => { const h = { ...opts }; hotspots.push(h); return h; };
  ui.addHoverZone = (opts) => { zones.push(opts); return opts; };

  const hits = [];
  const chapters = {
    inspire: fake('inspire', {
      visibility: visibility([...SCHEMA_NODES.inspire]),
      selection: F(() => null, () => ({ setHot: (id, on) => hits.push(`${id}:${on}`), setSelected: null })),
      interaction: { zones: () => [{ id: 'plume', world: () => null, radius: 1, label: 'p', announce: null, action: null }], trigger: null },
    }),
    equip: fake('equip', { visibility: visibility([...SCHEMA_NODES.equip]) }),
    connect: fake('connect', {
      visibility: visibility([...SCHEMA_NODES.connect]),
      selection: { setHot: (id, on) => hits.push(`${id}:${on}`), setSelected: null },
    }),
    owned: fake('owned', { visibility: visibility([...SCHEMA_NODES.owned]) }),
    final: fake('final'),
  };
  reg(ui, chapters);

  // D45 — both passes ran to completion before anything below is read.
  assert.deepEqual(A([hotspots.length, zones.length]), [24, 1],
    'the hotspot pass and the zone pass each ran, with pinned cardinality');

  // ui.js:1199 (z.onHot(on)) and ui.js:3101 call it BARE — an undefined value
  // would throw there, so the closure is always assigned and the guard is
  // inside it.
  assert.equal(A(typeof hotspots[0].onHot), 'function', 'selection: null still yields a callable h.onHot');
  assert.equal(A(typeof zones[0].onHot), 'function', 'and a callable z.onHot');
  hotspots[0].onHot(true);
  zones[0].onHot(true);
  assert.deepEqual(A(hits), [], 'calling it is a no-op when the chapter declares no selection');

  // Positive control: the neighbouring chapter DOES declare one, so the empty
  // log above is a no-op and not an unwired harness. hotspots[5] is connect's
  // first node — the pinned boundary I6 also uses (3 inspire + 2 equip before
  // it since 2026-08-30).
  hotspots[5].onHot(true);
  assert.deepEqual(A(hits), ['ados:true']);
}

check('I10 [executed] a chapter with visibility but selection: null still receives a callable onHot', () => {
  i10Body(registerChapterInteractions);
});

/* ================================================================== *
 * 4a-bis. I11 — THE FACTORY INVARIANT, INHERITED FROM C06            *
 *                                                                    *
 * tools/test-c06-registry.mjs is RETIRED by DIET-02 to               *
 * docs/code-health/evidence/2026-08-21-elegance-run-01/               *
 * retired-suites/, runnable, with its own --prove-failure intact.     *
 * Ten of its twelve pins were one-shot migration proofs — main.js was *
 * not edited, the seam is atomic by construction, exactly one         *
 * construction site exists — and those expired when C06 was accepted. *
 * ONE did not, and it is the order's whole point:                     *
 *                                                                    *
 *   the prepared-chapter cache lives in the FACTORY'S CLOSURE, never  *
 *   at module scope, so two registries never share one cache.         *
 *                                                                    *
 * That is a standing property of shipped bytes, not a claim about a   *
 * historical move, so it is restated here rather than retired with    *
 * the rest. It was `C06-B4`, whose own note read "THE ORDER'S POINT.  *
 * Its mutant hoists `prepared` to the wrapper's module scope —        *
 * exactly where the pre-C06 global lived — and this pin must go red   *
 * when it does."                                                     *
 *                                                                    *
 * [materialised], for the reason C06 gave: journey/chapter-registry   *
 * .js cannot be imported under plain node — it imports four chapter   *
 * modules that need DOM and WebGL at construction — so the factory's  *
 * SHIPPED SOURCE is sliced out of the real file and evaluated against *
 * stub builders. These are the bytes that ship, not a restatement of  *
 * them. `CHAPTER_BUILDERS` is supplied at the WRAPPER's module scope, *
 * which is precisely where the pre-C06 global lived, so a hoist       *
 * lands there and is caught rather than failing to compile.           *
 * ================================================================== */

check('I11 [materialised] the prepared-chapter cache lives in the factory\'s CLOSURE — two registries never share one (was C06-B4)', () => {
  const raw = read('journey/chapter-registry.js');
  const START = 'export function createChapterRegistry() {';

  // D78/D85 — the slice refuses an ambiguous or rotted anchor rather than
  // taking the first of two matches. Every brace inside the factory is
  // indented, so the end anchor is the only column-0 `}` after the head.
  assert.equal(A(countOf(raw, START)), 1, 'the factory anchor must be unambiguous, or this check is reading something else');
  const head = raw.indexOf(START);
  const tail = raw.indexOf('\n}\n', head);
  assert.ok(A(tail > head), 'the factory\'s closing brace was not found — the anchor has rotted');
  const factory = raw.slice(head, tail + 2);

  const IDS = ['inspire', 'equip', 'connect', 'owned', 'final'];
  const make = new Function(
    `let CHAPTER_BUILDERS;\n${factory.replace('export function ', 'function ')}\n`
    + 'return function make(b) { CHAPTER_BUILDERS = b; return createChapterRegistry(); };',
  )();

  const calls = [];
  const builders = {};
  for (const id of IDS) builders[id] = () => { calls.push(id); return { id }; };

  // Two independent registries. The first prepares two chapters; the second
  // then builds cold. With the cache in closure the second sees NOTHING the
  // first prepared, so inspire and connect are constructed a second time.
  const first = make(builders);
  const second = make(builders);
  first.prepare({ sceneApi: 'stub' });
  first.prepare({ sceneApi: 'stub' });
  const built = second.build({ sceneApi: 'stub' });

  // SIX construction calls, in this order. A `prepared` hoisted to module
  // scope gives FOUR and `inspire,connect,owned,final` — the pre-C06 global,
  // restored — and reds this row. The key set is carried in the same actual
  // as the D46 control that the rig really built something: a reader that
  // returned an empty registry would give [0, ''] and could not be mistaken
  // for a pass.
  assert.deepEqual(A([calls.length, calls.join(','), Object.keys(built).join(',')]),
    [7, 'inspire,equip,inspire,equip,connect,owned,final', 'inspire,equip,connect,owned,final'],
    'two registries must not share a prepared cache');
});

/* ================================================================== *
 * 4b. MUT — FIFTEEN MUTANTS OF THE SHIPPED REGISTRAR  (D58)          *
 *                                                                    *
 * D58, adopted from this slice's own R1 review: "a behaviour-        *
 * preservation claim must falsify with MUTANTS OF THE SHIPPED        *
 * SUBJECT, not only poisons of its doubles — each naming which       *
 * instrument should kill it, so a survivor is a decision on the      *
 * record, not an oversight."                                         *
 *                                                                    *
 * A poison perturbs the harness's own fixtures; a mutant perturbs    *
 * the shipped code. Slice C shipped four poisons and zero mutants,   *
 * and that is exactly why F-1 and F-2 were sitting there: four       *
 * poisons had pronounced the registrar sound while two of its        *
 * branches were unmeasured. The fifteen rows below are the           *
 * reviewer's set, re-run here rather than transcribed — the KILLER   *
 * COLUMN IS MEASURED, and the check fails if the measurement stops   *
 * matching the declaration in either direction.                      *
 *                                                                    *
 * "Equivalent-by-contract" is a legitimate verdict, but only when it *
 * is named AS SUCH with its reason. Six rows carry one; two of those *
 * reasons (M12's disjointness, M14's discarded return) are not       *
 * assertions of faith but are themselves pinned, below.              *
 * ================================================================== */

/** The registrar, materialised from its own shipped bytes.
 *
 *  `journey/chapter-interactions.js` cannot simply be re-imported per mutant:
 *  a module URL is cached, and writing a mutated copy anywhere inside the tree
 *  is D56 — this review's own predecessor put scaffolding in `tools/.r1tmp/`
 *  and `tools/check-cycles.mjs` scans the DIRECTORY, so a dangling import made
 *  madge drop a whole subtree from cycle analysis and turned `npm run check`
 *  red for five other lanes. Nothing is written anywhere. The import block is
 *  stripped and the body is closed over the four names those imports supplied
 *  — the same technique I3 already uses on journey.js's `pickChapterFocus`.
 *
 *  ANCHOR-MISS GUARDS, all three structural:
 *    * the export anchor must be found, or this throws by name;
 *    * the IMPORT BLOCK is pinned as an exact literal, so a registrar that
 *      grows a fifth dependency fails HERE rather than throwing ReferenceError
 *      inside whichever mutant happens to reach it;
 *    * `new Function` is non-strict, so any free name that is NOT supplied and
 *      IS reached throws ReferenceError at call time. */
const VALIDATE_ANCHOR = '  validateJourneyStructure(JOURNEY_SCHEMA, { nodes: registeredNodes });';
const REGISTRAR_IMPORTS = "import { CONTENT } from '../content/content.js';\n"
  + 'import {\n'
  + '  JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, validateJourneyStructure,\n'
  + "} from './structure.js';";

function materialiseRegistrar(src, where) {
  const at = src.indexOf('export function registerChapterInteractions(');
  if (at < 0) throw new Error(`${where}: anchors no longer match source — journey/chapter-interactions.js exports no registerChapterInteractions`);
  const body = src.slice(at).replace('export function', 'function');
  const fn = new Function('CONTENT', 'JOURNEY_SCHEMA', 'RUNTIME_CHAPTER_IDS', 'validateJourneyStructure',
    `${body}\nreturn registerChapterInteractions;`);
  return fn(CONTENT, JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS, validateJourneyStructure);
}

/** R1's fifteen mutants, as textual edits to the shipped bytes. `killer` is the
 *  DECLARATION; the sweep measures the truth and compares. Every `from` runs
 *  through `injected`, which throws if the anchor stops matching — so a mutant
 *  that has quietly stopped mutating cannot masquerade as an equivalence. */
function mutantTable() {
  const HOTSPOT_ONHOT = '      h.onHot = (on) => { if (selection && selection.setHot) selection.setHot(id, on); };';
  const ZONE_ONHOT = '        onHot: (on) => { if (selection && selection.setHot) selection.setHot(z.id, on); },';
  const ACTION = '        action: z.action && interaction.trigger ? () => interaction.trigger(z.action) : null,';
  const HOT_LOOP = '  for (const id of RUNTIME_CHAPTER_IDS) {\n    const ch = chapters[id];\n    const vis = ch && ch.visibility;';
  const BIND = '    // Renamed from bindLandingGate: what it receives is the chapter\'s eased\n'
    + '    // copy opacity, not a gate. Same function object.\n'
    + '    if (vis.bindCopyEase) vis.bindCopyEase(() => ui.copyEase(id));\n  }';
  const ZONE_LOOP = '  for (const id of RUNTIME_CHAPTER_IDS) {\n    const ch = chapters[id];\n'
    + '    if (ch) registerHoverZones(id, ch.interaction, ch.selection);\n  }';
  const VALIDATE = '  validateJourneyStructure(JOURNEY_SCHEMA, { nodes: registeredNodes });';
  const LABEL = '      const label = (CONTENT.nodes[id] && CONTENT.nodes[id].label)\n'
    + '        || (CONTENT.contributors.find(c => c.id === id) || {}).role\n        || id;';

  return [
    ['M1  hotspot guard hoisted out of the closure', [[HOTSPOT_ONHOT,
      '      if (selection && selection.setHot) h.onHot = (on) => { selection.setHot(id, on); };']], 'I10'],
    ['M2  hotspot guard deleted', [[HOTSPOT_ONHOT,
      '      h.onHot = (on) => { selection.setHot(id, on); };']], 'I10'],
    ['M3  zone guard hoisted out of the closure', [[ZONE_ONHOT,
      '        onHot: selection && selection.setHot ? (on) => { selection.setHot(z.id, on); } : undefined,']], 'I10'],
    ['M4  bindCopyEase hoisted out of the loop', [[BIND, '  }\n'
      + '  for (const id of RUNTIME_CHAPTER_IDS) {\n'
      + '    const v2 = chapters[id] && chapters[id].visibility;\n'
      + '    if (v2 && v2.bindCopyEase) v2.bindCopyEase(() => ui.copyEase(id));\n  }']],
    'equivalent-by-contract: every shipped bindCopyEase is bindLandingGate, whose whole body is a store (`landGate = fn`); nothing reads it during registration'],
    ['M5  the zone pass runs twice', [[ZONE_LOOP, `${ZONE_LOOP}\n${ZONE_LOOP}`]], 'I4'],
    ['M5b two-pass order reversed', [[ZONE_LOOP, ''], [HOT_LOOP, `${ZONE_LOOP}\n${HOT_LOOP}`]], 'I4'],
    ['M6  validateJourneyStructure call deleted', [[VALIDATE, '  void registeredNodes;']], 'I4'],
    ['M7  chapter order reversed', [[HOT_LOOP,
      '  for (const id of [...RUNTIME_CHAPTER_IDS].reverse()) {\n    const ch = chapters[id];\n    const vis = ch && ch.visibility;']], 'I4'],
    ["M8  typeof nodeRadius === 'function' -> truthy", [["typeof vis.nodeRadius === 'function' ?", 'vis.nodeRadius ?']],
      'equivalent-by-contract: T4d pins every shipped nodeRadius to `null` or a method, and over that domain truthiness and typeof-function agree'],
    ["M9  typeof nodeReveal === 'function' -> truthy", [["typeof vis.nodeReveal === 'function' ?", 'vis.nodeReveal ?']],
      'equivalent-by-contract: same domain, same argument — T4d pins nodeReveal to `null` or a method for all four chapters'],
    ['M10 revealDirect === true -> !!', [['revealDirect: vis.revealDirect === true,', 'revealDirect: !!vis.revealDirect,']],
      'equivalent-by-contract: T4d pins revealDirect/revealScrub to the boolean literals true/false, over which === true and !! agree'],
    ['M11 actionless zone gets a no-op function', [[ACTION,
      '        action: z.action && interaction.trigger ? () => interaction.trigger(z.action) : () => {},']], 'I4'],
    ['M12 label fallback chain reordered', [[LABEL,
      '      const label = (CONTENT.contributors.find(c => c.id === id) || {}).role\n'
      + '        || (CONTENT.nodes[id] && CONTENT.nodes[id].label)\n        || id;']],
    'equivalent-by-contract: the two sources are disjoint over the registered ids and no contributor carries a `.label` — both pinned below, not asserted on faith'],
    ['M14 onHot returns the callee\'s value', [[HOTSPOT_ONHOT,
      '      h.onHot = (on) => selection && selection.setHot && selection.setHot(id, on);']],
    "equivalent-by-contract: this IS the pre-slice-C behaviour, and all three consumers call onHot in STATEMENT position and discard the value — the count of call sites is pinned below"],
    ['M15 zone action neutered to null', [[ACTION, '        action: null,']], 'I4'],
  ];
}

/** Run one instrument body against a registrar, reporting only whether it went
 *  red. The failability harness is suspended for the duration: these runs are
 *  not comparison sites of the enclosing check, and letting them advance
 *  `P.site` would renumber every site after them on every sweep iteration. */
function survives(body, reg) {
  const saved = { on: P.on, site: P.site, target: P.target, hit: P.hit };
  P.on = false;
  P.target = -1;
  try {
    body(reg);
    return true;
  } catch {
    return false;
  } finally {
    P.on = saved.on; P.site = saved.site; P.target = saved.target; P.hit = saved.hit;
  }
}

const INSTRUMENTS = [['I4', i4Body], ['I6', i6Body], ['I10', i10Body]];

check('MUT [executed] fifteen mutants of the shipped registrar, each naming its killer (D58)', () => {
  const raw = read('journey/chapter-interactions.js');

  // ANCHOR-MISS GUARD — the import block, pinned exactly. A registrar that
  // grows a dependency `new Function` does not supply fails HERE, on every
  // run, rather than as a ReferenceError inside one arbitrary mutant.
  assert.equal(A(raw.slice(0, raw.indexOf('\n\n')).trim()), REGISTRAR_IMPORTS,
    'the registrar imports exactly the four names materialiseRegistrar supplies');

  /* THE NULL MUTANT — the control without which every row below is worthless.
     If materialisation were broken, all fifteen mutants would "die" and the
     table would read as a perfect score. So: the UNMUTATED bytes, materialised
     the same way, must pass all three instruments. */
  const clean = materialiseRegistrar(F(() => raw, () => injected(raw, VALIDATE_ANCHOR, '  void registeredNodes;')), 'null mutant');
  assert.deepEqual(A(INSTRUMENTS.filter(([, body]) => !survives(body, clean)).map(([id]) => id)), [],
    'the materialised registrar, UNMUTATED, passes every instrument — otherwise the deaths below are the harness dying, not the mutants');

  /* …and materialisation is faithful to the IMPORT, not merely self-consistent:
     the same three instruments pass over the imported module too. */
  assert.deepEqual(A(INSTRUMENTS.filter(([, body]) => !survives(body, registerChapterInteractions)).map(([id]) => id)), [],
    'and so does the real imported registrar — the materialised copy is not a divergent second subject');

  // THE SWEEP. `killedBy` is MEASURED. D44's chooser move: the sweep corrupts
  // WHICH TABLE is supplied, so a table that stopped being populated reds.
  const table = F(() => mutantTable(), () => mutantTable().slice(1));
  const measured = table.map(([name, edits]) => {
    const mutated = edits.reduce((src, [from, to]) => injected(src, from, to), raw);
    if (mutated === raw) throw new Error(`${name}: the mutation produced identical bytes`);
    const reg = materialiseRegistrar(mutated, name);
    const killers = INSTRUMENTS.filter(([, body]) => !survives(body, reg)).map(([id]) => id);
    return `${name} -> ${killers.length ? killers.join('+') : 'SURVIVED'}`;
  });

  /* THE VERDICT TABLE. Each row states the killer this slice is ON RECORD as
     expecting. Nine mutants die; six survive, each with its reason named in
     `mutantTable` above. A survivor that starts dying reds this just as loudly
     as a corpse that starts surviving — the equivalences are claims too. */
  assert.deepEqual(A(measured), [
    'M1  hotspot guard hoisted out of the closure -> I10',
    'M2  hotspot guard deleted -> I10',
    'M3  zone guard hoisted out of the closure -> I10',
    'M4  bindCopyEase hoisted out of the loop -> SURVIVED',
    // Declared 'I4' from R1's table, which ran the two instruments separately;
    // MEASURED I4+I10, because I10's own zone pin sees the duplicate too. The
    // measurement is the record.
    'M5  the zone pass runs twice -> I4+I10',
    'M5b two-pass order reversed -> I4',
    'M6  validateJourneyStructure call deleted -> I4',
    'M7  chapter order reversed -> I4+I6+I10',
    "M8  typeof nodeRadius === 'function' -> truthy -> SURVIVED",
    "M9  typeof nodeReveal === 'function' -> truthy -> SURVIVED",
    'M10 revealDirect === true -> !! -> SURVIVED',
    'M11 actionless zone gets a no-op function -> I4',
    'M12 label fallback chain reordered -> SURVIVED',
    "M14 onHot returns the callee's value -> SURVIVED",
    'M15 zone action neutered to null -> I4',
  ], 'the measured killer of every mutant, against the killer this slice declared');

  // D45 — the sweep really ran fifteen rows, and nine of them really died.
  assert.deepEqual(A([
    measured.length,
    measured.filter((r) => r.endsWith('SURVIVED')).length,
    table.filter(([, , killer]) => killer.startsWith('equivalent')).length,
  ]), [15, 6, 6], 'fifteen mutants, six survivors, six declared equivalences — and the two sets are the same six');

  /* ---- THE TWO EQUIVALENCES THAT REST ON A FACT, NOT ON A READING -------
     M12 survives because the two halves of the label chain never both match
     the same id. That is a property of CONTENT, not of the registrar, and it
     is exactly the kind of fact that stops being true without anyone noticing.
     Pinned, so the equivalence expires loudly rather than silently. */
  const contributorIds = CONTENT.contributors.map((c) => c.id);
  assert.deepEqual(A(contributorIds.filter((id) => Object.hasOwn(CONTENT.nodes, id))), [],
    'no contributor id is also a CONTENT.nodes key — the two halves of the label chain are disjoint');
  assert.deepEqual(A(CONTENT.contributors.filter((c) => c.label !== undefined).map((c) => c.id)), [],
    'and no contributor carries a `.label`, so reordering the chain cannot change which branch answers');

  /* M14 survives because the RETURN VALUE of `onHot` reaches nobody.
   *
   * CONVERTED 2026-08-22, FROM THREE LINES OF TEXT TO THE PROPERTY.
   * ---------------------------------------------------------------
   * This row used to pin three `journey/ui.js` lines VERBATIM:
   *
   *     'journey/ui.js :: if (h.onHot) h.onHot(on);'
   *     'journey/ui.js :: z.onHot(on);'
   *     'journey/ui.js :: if (z.hot) { z.hot = false; z.onHot(false); }'
   *
   * That is not what the equivalence rests on, and the difference has cost
   * this program real architecture. U02 reported it plainly: those three
   * literals "forced the seam — state moved, effects could not", so the hover
   * registry it shipped owns the zone ARRAY and not the zone STATE MACHINE,
   * because the machine's latch is fenced by lines a suite in another file
   * spells out. That is a test literal choosing a module boundary.
   *
   * The property is: EVERY call of `onHot` in production is in STATEMENT
   * position, so no caller can consume what it returns. Nothing about that
   * needs the calls to be in `ui.js`, to be three, to be spelled `z.onHot`,
   * or to sit on one line each. So it is now derived by PARSING every
   * production module — not by matching text, and not only in `ui.js`:
   *
   *   · a call that moves to another file is still found;
   *   · a call that is renamed, re-indented or re-wrapped is still found;
   *   · a FOURTH call is found, wherever it lands;
   *   · a call that moves into expression position — `const x = z.onHot(on)`,
   *     `return h.onHot(on)`, `a && z.onHot(on)` — is what reds the row, and
   *     it is the only thing that does.
   *
   * That is the whole of D137's "censuses should parse, not grep", applied to
   * the pin D144 names. U06 may move the hover zone's state machine anywhere
   * it likes; this row will follow it. */
  {
    const callsOfOnHot = (src) => {
      let ast;
      try {
        ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module', range: true });
      } catch (e) {
        throw new Error(`onHot census: a production module did not parse — ${e.message}`, { cause: e });
      }
      const found = [];
      /* Depth-first with the PARENT carried, because "statement position" is a
         fact about the parent node and nothing else. */
      const walk = (node, parent) => {
        if (!node || typeof node.type !== 'string') return;
        if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression'
          && !node.callee.computed && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'onHot') {
          found.push(parent && parent.type === 'ExpressionStatement' ? 'statement' : `VALUE-CONSUMED-BY-${parent ? parent.type : 'ROOT'}`);
        }
        for (const k of Object.keys(node)) {
          if (k === 'loc' || k === 'range') continue;
          const v = node[k];
          if (Array.isArray(v)) { for (const c of v) walk(c, node); }
          else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, node);
        }
      };
      walk(ast, null);
      return found;
    };
    const positions = PRODUCTION_JS.flatMap((rel) => callsOfOnHot(read(rel)).map((pos) => `${rel} :: ${pos}`));
    assert.deepEqual(A([...new Set(positions.map((x) => x.split(' :: ')[1]))]), ['statement'],
      'every onHot call in production is in STATEMENT position, so the value it returns reaches nobody — which is why M14 is an equivalence and not a defect');
    /* D46 / D75 — the census found calls at all. An assert over an empty set
       is the passing answer, and a parse that went wide or a module set that
       went empty would give exactly that. Pinned as a NON-ZERO count, not as
       a site set: the count is what makes the zero impossible, and the SET is
       deliberately not pinned here because pinning it is the defect this
       conversion exists to remove. */
    assert.deepEqual(A([positions.length > 0, PRODUCTION_JS.length > 50]), [true, true],
      'the census read a real corpus and found real calls — without this, "no call consumes a value" is satisfied by finding no calls');
  }
});

/* ================================================================== *
 * 5. STATIC SCANS — T1, T2, T3, with both-direction controls         *
 * ================================================================== */

/** Strip comments so a literal search cannot match prose, while PRESERVING
 *  string literals — which are the evidence T1/T2 exist to find. Deliberately
 *  NOT tools/test-frame-order.mjs's code(): that one empties every literal,
 *  which would make these scans pass unconditionally, forever. Duplicated here
 *  rather than imported because that file is owned by another order.
 *  The `(^|[^:])` guard on the line-comment rule is carried over verbatim; it
 *  exists so a `//` inside `https://` is not treated as a comment. */
function codeKeepStrings(src) {
  // S-3 / D67, QA-05. This WAS two regex replacements. The colon guard
  // kept `https://` from reading as a comment, but nothing kept a `/*`
  // or a `//` inside a string, a template or a REGEX LITERAL from opening
  // one — and this file's own header carries the glob `chapters/*` plus a
  // slash, which read as a block-comment opener. Measured at the QA-05
  // fence: 4248 non-whitespace characters across 106 lines of this file,
  // and 1250 across 31 lines of journey/journey.js — whose :18 line
  // comment names `chapters/*.js`, opening a phantom comment over the
  // whole import block. The shared module keeps string literals (which is
  // what T1/T2 exist to find) and is length- and line-preserving, so
  // bodyOf()'s brace matching below indexes the same offsets as before.
  return stripComments(src);
}

/** The body of `function <name>(` in `src`, by brace matching. Duplicated from
 *  tools/test-frame-order.mjs for the same ownership reason. */
function bodyOf(src, name) {
  const head = src.indexOf(`function ${name}(`);
  if (head < 0) throw new Error(`no function ${name} in source`);
  const open = src.indexOf('{', src.indexOf(')', head));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error(`unbalanced body for ${name}`);
}

const SCAN_IDS = ['mission', 'inspire', 'equip', 'connect', 'owned', 'final'];

/** How many times each chapter id appears as a whole string literal. */
function idLiteralCounts(src) {
  const out = {};
  for (const id of SCAN_IDS) {
    const re = new RegExp(`(?:'${id}'|"${id}"|\`${id}\`)`, 'g');
    out[id] = (src.match(re) || []).length;
  }
  return out;
}

const countOf = (src, token) => src.split(token).length - 1;

/** Guard every source-text pin: a pattern that silently stops matching must
 *  become a loud error, not a quiet pass. */
function injected(src, from, to) {
  const moved = src.replace(from, to);
  if (moved === src) throw new Error(`anchors no longer match source: ${JSON.stringify(String(from))}`);
  return moved;
}

/** D54 — THE SITE SET, which is what a positive control must be pinned to.
 *
 *  D46 requires every assert-ZERO scan to carry a positive control: a token
 *  that MUST be present, so that a scan which has gone blind (stale path,
 *  moved file, empty read) fails instead of reporting "clean" forever. D46
 *  specified that control as a literal COUNT, and D54 recorded — correctly —
 *  that a count goes stale in the one direction that matters. A red control
 *  has two possible causes, the subject legitimately grew or the scan went
 *  blind, and a bare number cannot tell them apart; the maintainer under time
 *  pressure bumps the number and the control is retired by the act of
 *  "fixing" it.
 *
 *  So the controls below pin the SET of sites, each keyed
 *  `file :: line :: trimmed source text`. Then:
 *    * adding a site requires adding a ROW — a deliberate act with a subject;
 *    * a blind scan yields the EMPTY SET, which is unmistakable and cannot be
 *      repaired by editing a number;
 *    * the review diff shows WHAT changed, not merely that something did.
 *
 *  Comments are blanked and strings emptied by `codeEmptyStrings`, which is
 *  ALIGNMENT-PRESERVING — every consumed newline is kept — so the line number
 *  in each row is the real line number in the real file. `codeKeepStrings`
 *  must NOT be used here: it collapses each block comment to one space and
 *  would key every row to a wrong line.
 *
 *  A note on churn, because these files are contended. A row whose text is
 *  unchanged but whose line moved is a LEGIBLE failure — the diff shows the
 *  same sentence at a new number — and is repaired by moving the number. A
 *  scan that went blind is an EMPTY set and cannot be repaired that way. That
 *  distinction is the whole of D54 and is the reason to accept the churn. */
function siteSet(rel, src, matches, { withLine = true } = {}) {
  const out = [];
  src.split('\n').forEach((line, i) => {
    out.push(matches(line) ? (withLine ? `${rel} :: ${i + 1} :: ${line.trim()}` : `${rel} :: ${line.trim()}`) : null);
  });
  return out.filter(Boolean);
}

/* ================================================================== *
 * MUTD — D58 OVER SLICE D's THREE `ui.js` SITES  (C05 slice E)       *
 *                                                                    *
 * Slice D's central behavioural artifact is an OLD-vs-NEW comparison *
 * that ships FOUR POISONS AND ZERO MUTANTS, and it said so:          *
 *   "both sides are materialised from real bytes, but that is not an *
 *    enumerated mutant table and I don't claim it is."               *
 * D58 postdates that probe's design, so the gap was correctly named  *
 * rather than papered over — and left UNOWNED. This closes it.       *
 *                                                                    *
 * A poison perturbs the HARNESS'S OWN FIXTURES; a mutant perturbs    *
 * the SHIPPED CODE. Only the second is evidence about the code. Each *
 * row below rewrites the shipped `journey/ui.js` text, names the     *
 * QUANTITY it moves (D50) and the instrument that should kill it,    *
 * and `injected` throws if the text it rewrites has gone — so a      *
 * mutant that stopped applying is loud, never quietly absent.        *
 *                                                                    *
 * D56 — NOTHING IS WRITTEN TO DISK. Every variant is materialised    *
 * from the file's own bytes with `new Function`, which is the        *
 * technique slice C's repair established for a multi-lane run: an    *
 * in-repo temp file broke `npm run cycles` for every lane twice in   *
 * one day.                                                           *
 *                                                                    *
 * D65 — the doubles, the 22-hotspot fixture and the three free-name  *
 * lists are COPIED WITH PROVENANCE from                              *
 * `docs/code-health/evidence/2026-08-21-elegance-run-01/c05d/        *
 *  equivalence-probe.mjs`, not imported from it. This suite is a     *
 * GATED instrument and D52 forbids a gated instrument depending on   *
 * an append-only evidence directory. Copy-with-provenance is the     *
 * third option between "import" and "re-derive".                     *
 *                                                                    *
 * WHAT IT IS NOT. It drives three closures of `createUI` in          *
 * isolation. It is not a browser, it is not a capture, and slice D   *
 * has no visual evidence — nor does this. It says these three bodies *
 * compute what they computed; it says nothing about pixels.          *
 * ================================================================== */

/** The source between two exact anchors, first inclusive, second exclusive.
 *  Copied with provenance from c05d/equivalence-probe.mjs. */
function regionOf(src, from, to) {
  const a = src.indexOf(from);
  if (a < 0) throw new Error(`anchor no longer matches source: ${JSON.stringify(from)}`);
  const b = src.indexOf(to, a);
  if (b < 0) throw new Error(`closing anchor no longer matches source: ${JSON.stringify(to)}`);
  return src.slice(a, b);
}

check('MUTD [executed] nine mutants of slice D\'s three shipped sites, each naming its killer (D58)', () => {
  /* THE SUBJECT IS THE SURFACE, not one file (U03). Slice D's second site —
     the selected-light notifier — moved into journey/ui/selection.js with the
     state it writes. Concatenating keeps every mutant anchor unique and every
     body extractable, so the nine mutations are the same nine. */
  /* U06 MOVED TWO OF THIS SECTION'S THREE SITES OUT OF `journey/ui.js`.
     `resolveLabelPolicies` is now `journey/ui/label-policies.js`'s and the
     rail-exclusion pass is `journey/ui/rail-mask.js`'s. The subject is the UI
     SURFACE, not one address — same correction U03 made for T2 below and for
     the same reason: a probe that keeps reading one file after the code left
     it reports "no function ... in source" at best and a silent pass over
     nothing at worst. */
  const UI = ['journey/ui.js', 'journey/ui/selection.js',
    'journey/ui/label-policies.js', 'journey/ui/rail-mask.js']
    .map((f) => read(f)).join('\n');

  /* -------- the doubles (c05d, copied with provenance) -------- */
  let calls = [];
  const ownedPolicy = (id) => ({ labelOnHover: true, label: `${id} · Contributor` });
  const doubles = () => ({
    inspire: {
      selection: { setHot: () => {}, setSelected: (id, on) => calls.push(`inspire.setSelected(${id},${on})`) },
      visibility: { labelPolicy: null, setExcludedNodes: null, nodeRadius: null },
    },
    connect: {
      selection: { setHot: () => {}, setSelected: null },
      visibility: { labelPolicy: null, setExcludedNodes: null, nodeRadius: null },
    },
    owned: {
      selection: { setHot: () => {}, setSelected: (id, on) => calls.push(`owned.setSelected(${id},${on})`) },
      visibility: {
        labelPolicy: ownedPolicy,
        nodeRadius: () => 0.4,
        setExcludedNodes: (ids) => calls.push(`owned<-excluded(${[...ids].sort().join(',')})`),
      },
    },
    final: { selection: null, visibility: null },
  });
  const HOTSPOTS = [
    ...['artcompute', 'arca', 'tworp'].map((id) => ({ id, chapter: 'inspire' })),
    ...['ados', 'hivemind', 'discord'].map((id) => ({ id, chapter: 'connect' })),
    ...Array.from({ length: 16 }, (_, i) => ({ id: `contributor-${i}`, chapter: 'owned' })),
  ];
  assert.equal(A(HOTSPOTS.length), 22, 'the fixture is the shipped 3 + 3 + 16, not a sample');

  /* -------- S1: resolveLabelPolicies -------- */
  const runS1 = (src) => {
    const body = bodyOf(src, 'resolveLabelPolicies');
    if (body.includes('window.journey')) throw new Error('anchor miss: resolveLabelPolicies reads the global again');
    if (!body.includes('pending = left;')) throw new Error('anchor miss: resolveLabelPolicies no longer sets the retry latch');
    const applied = [];
    const applyLabelPolicy = (h, pol) => applied.push(`${h.id} -> ${JSON.stringify(pol)}`);
    /* Wrapped in an INNER function, not concatenated with the report: the body
       contains a `continue` inside a loop but also assigns the outer
       `pending` binding, and slice D's probe found that concatenating a
       report onto a body with an early return reads `undefined` against an
       object — a divergence in the HARNESS that looks like one in the SUBJECT. */
    /* U06: the latch is `pending` in `label-policies.js`, where it was
       `policyPending` as a `createUI` binding. The probe reports it under its
       old name so the four null-mutant assertions below keep reading the
       property they were written about — the NAME moved, the machine did not. */
    const fn = new Function('chapters', 'hotspots', 'applyLabelPolicy', 'pending',
      `(function () {${body}}());\nreturn { policyPending: pending, done: hotspots.map((h) => !!h.policyDone) };`);
    const pass = (chapters) => {
      applied.length = 0;
      const out = fn(chapters, HOTSPOTS.map((h) => ({ ...h })), applyLabelPolicy, true);
      return { ...out, applied: [...applied] };
    };
    return { unmounted: pass({}), mounted: pass(doubles()) };
  };

  /* -------- S2: notifySelect -------- */
  const S2_PROBES = [
    ['artcompute', true], ['artcompute', false], ['ados', true], ['ados', false],
    ['contributor-3', true], ['contributor-3', false], ['no-such-node', true],
  ];
  const runS2 = (src) => {
    const body = bodyOf(src, 'notify');
    if (body.includes('portraits')) throw new Error('anchor miss: the notifier names portraits again');
    const fn = new Function('chapters', 'hotspots', 'nodeId', 'on', body);
    const chapters = doubles();
    return S2_PROBES.map(([id, on]) => {
      calls = [];
      // A mutant may THROW where the shipped body returns — a throw is a
      // divergence like any other and must be recorded, not allowed to abort
      // the sweep and be read as "the harness broke".
      try { fn(chapters, HOTSPOTS, id, on); } catch (e) { calls.push(`THREW:${e.constructor.name}`); }
      return `${id}/${on}: ${calls.join(' ') || '(nothing)'}`;
    });
  };

  /* -------- S3: the rail-exclusion pass -------- */
  /* U06: the names are `rail-mask.js`'s now — the pass reads `box`/`excluded`/
     `nodes`/`debug` where `ui.js` read `profileRailBox`/`railExcluded`/
     `profileRailNodes`/`profileRailDebug`; it takes its chapter ids as an
     injected `chapterIds` rather than closing over the import; and it
     projects through the published `project` rather than through
     `projectStable(v, camera)`, so it names no camera at all (§B.7, C5). The REGION is
     the same code; only what the free variables are called changed. */
  const S3_FREE = ['box', 'hotspots', 'project', 'viewDepth',
    'tanHalf', 'window', 'chapterIds', 'chapters', 'debug'];
  const runS3 = (src) => {
    const region = regionOf(src, '    const excluded = new Set();', '    return excluded;');
    // Guards read CODE, not comments: the region's own comment QUOTES the
    // branch it replaced, and a guard that matched prose would be pinning
    // prose (D45's companion finding).
    const code = codeEmptyStrings(region);
    if (code.includes('window.journey')) throw new Error('anchor miss: the rail pass reads the global again');
    if (!code.includes('setExcludedNodes')) throw new Error('anchor miss: the rail pass no longer dispatches setExcludedNodes');
    const fn = new Function(...S3_FREE,
      `${region}\nreturn { excluded: [...excluded].sort(), debug };`);
    const box = { left: 900, right: 1000, top: 200, bottom: 700 };
    const hotspots = HOTSPOTS.map((h, i) => ({
      ...h,
      radius: h.chapter === 'owned' ? () => 0.4 : undefined,
      world: () => ({ x: (i / 22) * 2 - 1, y: 0.5, z: 0, clone() { return { ...this, clone: this.clone }; } }),
    }));
    calls = [];
    const out = fn(box, hotspots, (v) => ({ x: v.x, y: v.y, z: 0.5 }), () => 1, 0.5,
      { innerWidth: 1000, innerHeight: 1000 }, [...RUNTIME_CHAPTER_IDS], doubles(), null);
    return { excluded: out.excluded, colliding: out.debug.colliding.slice().sort(), calls: [...calls] };
  };

  const observe = (src) => JSON.stringify({ s1: runS1(src), s2: runS2(src), s3: runS3(src) });

  /* ---------------- THE NULL-MUTANT CONTROL, FIRST ---------------- *
   * Without it, a death below proves the harness broke rather than   *
   * the mutation being caught. Slice C's repair: "otherwise the      *
   * deaths below would be the harness dying."                        */
  const base = observe(UI);
  const baseObj = JSON.parse(base);
  assert.equal(A(baseObj.s1.unmounted.policyPending), true,
    'null mutant S1 — with no chapter mounted, the retry stays armed');
  assert.deepEqual(A(baseObj.s1.unmounted.applied), [],
    'null mutant S1 — and nothing is applied on that pass');
  assert.equal(A(baseObj.s1.mounted.policyPending), false,
    'null mutant S1 — with the map available, the retry stands down');
  assert.equal(A(baseObj.s1.mounted.applied.length), 16,
    'null mutant S1 — sixteen owned labels get a policy, the other six chapters\' nodes none');
  assert.deepEqual(A(baseObj.s2), [
    'artcompute/true: inspire.setSelected(artcompute,true)',
    'artcompute/false: inspire.setSelected(artcompute,false)',
    'ados/true: (nothing)',
    'ados/false: (nothing)',
    'contributor-3/true: owned.setSelected(contributor-3,true)',
    'contributor-3/false: owned.setSelected(contributor-3,false)',
    'no-such-node/true: (nothing)',
  ], 'null mutant S2 — the shipped selection trace, including connect\'s declared setSelected: null');
  // TEN, not three. This literal was first written as 3 by hand and the
  // control objected on its first run — the third arithmetic error a D46
  // positive control has found in the text specifying it this run, and the
  // second inside this one order. Slice D measured the same 10 of 22.
  assert.equal(A(baseObj.s3.excluded.length), 10, 'null mutant S3 — ten of the sixteen owned nodes collide with the rail box');
  assert.deepEqual(A(baseObj.s3.calls), [`owned<-excluded(${baseObj.s3.excluded.join(',')})`],
    'null mutant S3 — exactly one chapter is handed exactly its own colliding ids');

  /* ---------------- THE MUTANTS ---------------- */
  const MUTANTS = [
    { id: 'd1', site: 'S1', moves: 'policyPending when a chapter is not yet mounted',
      killer: 'MUTD S1 policyPending', equivalent: null,
      from: 'if (!ch) { left = true; continue; }', to: 'if (!ch) { continue; }' },
    { id: 'd2', site: 'S1', moves: 'which labelPolicy values are treated as callable',
      killer: 'none — see equivalence',
      equivalent: 'Under the SHIPPED descriptor values, which T4d pins by text, labelPolicy is '
        + 'either a function (owned) or literally null (inspire, connect), and `!= null` and '
        + '`typeof === "function"` agree on both. They diverge only on a non-null non-function, '
        + 'which the contract forbids and I9b rejects. Equivalent BY CONTRACT, not by accident.',
      from: "typeof vis.labelPolicy === 'function'", to: 'vis.labelPolicy != null' },
    { id: 'd3', site: 'S1', moves: 'which chapter each hotspot resolves to',
      killer: 'MUTD S1 applied + T2 (it reintroduces a chapter literal in ui.js)', equivalent: null,
      from: 'const ch = chapters[h.chapter];', to: "const ch = chapters.owned;" },
    { id: 'd4', site: 'S2', moves: 'which capability the selection channel is read from',
      killer: 'MUTD S2 trace', equivalent: null,
      from: 'chapters[h.chapter] && chapters[h.chapter].selection;',
      to: 'chapters[h.chapter] && chapters[h.chapter].visibility;' },
    { id: 'd5', site: 'S2', moves: 'the `on` argument delivered to the chapter',
      killer: 'MUTD S2 trace', equivalent: null,
      from: 'sel.setSelected(nodeId, on);', to: 'sel.setSelected(nodeId, true);' },
    { id: 'd6', site: 'S3', moves: 'nothing measurable — it reinstates the deleted chapter half of the collision test',
      killer: 'T2 (the chapter literal), NOT this probe',
      equivalent: 'This is slice D\'s own §5.5 justification, executed rather than argued: '
        + '"the chapter half was redundant, because chapter-interactions.js only forwards `radius` '
        + 'when the chapter declares visibility.nodeRadius, and owned is the only chapter that does." '
        + 'Membership is unchanged TODAY and would diverge the day a second chapter declares one — '
        + 'which is why the guard against it is T2\'s literal scan and not a value comparison.',
      from: 'if (!h.radius || typeof h.world !== \'function\') continue;',
      to: 'if (h.chapter !== \'owned\' || !h.radius || typeof h.world !== \'function\') continue;' },
    { id: 'd7', site: 'S3', moves: 'nothing measurable — it hands every chapter the UNION instead of its own ids',
      killer: 'none today — see equivalence',
      equivalent: 'D61 exactly: a set that is conserved as a total is blind to redistribution. '
        + 'Owned declares the only nodeRadius, so `excluded` is entirely owned\'s and the union '
        + 'equals the part. A second chapter with a hit-radius model would make this a real defect, '
        + 'and NOTHING offline would see it — recorded here rather than left implicit in the comment.',
      from: 'if (h.chapter === id && excluded.has(h.id)) mine.add(h.id);',
      to: 'if (excluded.has(h.id)) mine.add(h.id);' },
    { id: 'd8', site: 'S3', moves: 'the payload delivered to the chapter',
      killer: 'MUTD S3 calls', equivalent: null,
      from: 'vis.setExcludedNodes(mine);', to: 'vis.setExcludedNodes(new Set());' },
    { id: 'd9', site: 'S3', moves: 'which chapters are offered the exclusion set at all',
      killer: 'MUTD S3 calls', equivalent: null,
      from: 'for (const id of chapterIds) {', to: "for (const id of ['inspire']) {" },
  ];

  const survivors = [];
  for (const m of MUTANTS) {
    // `injected` throws if the anchor is gone: a mutant that has stopped
    // applying must be loud, not silently equal to the base.
    if (observe(injected(UI, m.from, m.to)) === base) survivors.push(m.id);
  }

  // D58's LOOP SHUT. The survivors must be EXACTLY the set declaring an
  // equivalence — so no mutant can survive silently, and no equivalence can be
  // declared for a mutant that actually dies.
  assert.deepEqual(A(survivors), MUTANTS.filter((m) => m.equivalent).map((m) => m.id),
    'the survivors are exactly the mutants declaring an equivalence — d2, d6, d7');
  assert.deepEqual(A(survivors), ['d2', 'd6', 'd7'],
    'and that set is pinned as a literal too, so a NEW equivalence has to be added here deliberately');
  assert.equal(A(MUTANTS.length), 9, 'nine mutants ran (D45: the loop was entered)');
  assert.equal(A(MUTANTS.filter((m) => !m.equivalent).length), 6, 'six of them died');
  // Every row states its killer — an unattributed death is not evidence about
  // an instrument, only about the mutation.
  assert.deepEqual(A(MUTANTS.filter((m) => !m.killer).map((m) => m.id)), [],
    'every mutant names the instrument that should kill it');
});
check('T1 [static ratchet] chapter-id literals in journey/chapter-interactions.js — pinned exactly', () => {
  const files = ['journey/chapter-interactions.js'];
  const raw = read(files[0]);
  const src = codeKeepStrings(raw);
  const counts = idLiteralCounts(src);
  // SLICE C HAS LANDED. All four named branches are gone and this file names
  // no chapter. WAS (pre-slice-C): { mission: 0, inspire: 2, connect: 1,
  // owned: 1, final: 0 } — two at registerHotspots('inspire', ...) and
  // chapters.inspire, one each at registerHotspots('connect'|'owned', ...).
  //
  // This is now an ASSERT-ZERO over a real file, and D46 says an assertion of
  // absence is only trustworthy beside an assertion of presence. Both parts
  // of the remedy are below: a literal pin on the number of INPUTS read, and
  // a positive control of tokens that must be present, pinned to literal
  // counts. A stale path, a renamed file or an emptied read sends the control
  // to zero and fails T1 instead of passing it forever.
  assert.deepEqual(A(counts), {
    mission: 0, inspire: 0, equip: 0, connect: 0, owned: 0, final: 0,
  }, 'slice C deleted every named branch: no chapter id survives in this file');

  // D46 (1) — INPUTS PIN. One file, and it is not empty.
  assert.equal(A(files.length), 1, 'exactly one file is scanned');
  assert.equal(A(read(files[0]).length > 0), true, 'and it was actually read');
  // D46 (2) — POSITIVE CONTROL over the same stripped bytes the zero above was
  // measured on. These are the structures that REPLACED the named branches; if
  // the scan stopped reading the file these go to zero together.
  assert.deepEqual(A([
    countOf(src, 'RUNTIME_CHAPTER_IDS'),
    countOf(src, 'registerHotspots('),
    countOf(src, 'registerHoverZones('),
    countOf(src, 'bindCopyEase'),
    countOf(src, 'addHotspot('),
    countOf(src, 'addHoverZone('),
  ]), [3, 2, 2, 2, 1, 1], 'the capability-driven registrar is present in the bytes that scanned clean');

  // CONTROL, add direction: the scan must be able to see a new literal.
  const more = idLiteralCounts(codeKeepStrings(`${raw}\nconst probe = 'owned';\n`));
  assert.equal(A(more.owned), 1, 'an injected literal must move the count off zero');

  // CONTROL, remove direction. There is no chapter-id literal left to delete
  // from the real file, so the removal runs on the injected source above —
  // which is the honest way to keep a both-directions control once the pin has
  // reached zero. `injected` still throws if its anchor stops matching.
  const withProbe = `${raw}\nconst probe = 'owned';\n`;
  const fewer = idLiteralCounts(codeKeepStrings(injected(withProbe, "const probe = 'owned'", 'const probe = OWNED_ID')));
  assert.equal(A(fewer.owned), 0, 'a removed literal must move the count too');

  // CONTROL, prose: a chapter id inside a comment must NOT count, or the
  // ratchet would be unsatisfiable by any real file.
  const prosed = idLiteralCounts(codeKeepStrings(`${raw}\n// a comment naming 'owned' and 'final'\n`));
  assert.deepEqual(A(prosed), counts, 'comments are stripped before the literal search');

  // CONTROL, the MAJOR-3 trap itself: the sibling helper in
  // tools/test-frame-order.mjs empties every string literal, so the same scan
  // built on it would report zero for every id, forever.
  const emptied = idLiteralCounts(codeKeepStrings(raw)
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""'));
  assert.deepEqual(A(emptied), {
    mission: 0, inspire: 0, equip: 0, connect: 0, owned: 0, final: 0,
  }, 'a string-stripping scan reports zero unconditionally — hence codeKeepStrings');
});

/** The identifier `chapters` NOT preceded by a `.`, i.e. the injected map —
 *  never `JOURNEY_SCHEMA.chapters` or `CONTENT.chapters`, which are different
 *  objects that happen to share a name. */
const INJECTED_CHAPTERS = /(?:^|[^.\w$])chapters\b/;

check('T2 [static ratchet] the UI surface reads NO global and names NO chapter — with a D54 site set as the positive control', () => {
  /* U03 SPLIT THE SUBJECT, 2026-08-22. The two disclosure state machines and
     the selected-light owner left journey/ui.js for journey/ui/. Scanning only
     the composition root after that would have let a chapter literal or a
     global reach walk into a vessel unseen — the ratchet would have gone on
     reporting zero about a file that no longer holds the code. The claim is
     about the SURFACE; the file list below is the D46 inputs pin for it. */
  /* U06 SPLIT THE SUBJECT AGAIN. The label-policy latch and the rail
     exclusion pass left journey/ui.js for their own owners, and both READ THE
     INJECTED CHAPTER MAP — which is the whole subject of this ratchet. Adding
     them to the list is not bookkeeping: a chapter literal or a global reach
     could otherwise walk into either one unseen, which is exactly what U03
     recorded when it widened this list the first time. */
  const files = ['journey/ui.js', 'journey/ui/popover-tier.js',
    'journey/ui/card-tier.js', 'journey/ui/selection.js',
    'journey/ui/copy-arrival.js', 'journey/ui/label-policies.js',
    'journey/ui/rail-mask.js', 'journey/ui/hotspot-frame.js',
    'journey/ui/hover-zone.js', 'journey/ui/frame-projection.js'];
  const raws = files.map((f) => read(f));
  const raw = raws.join('\n');
  const src = codeKeepStrings(raw);
  const counts = idLiteralCounts(src);

  // U04 HAS LANDED, AND THE COUNT IS NOW ZERO IN EVERY CHAPTER. WAS
  // (pre-slice-D): { mission: 5, inspire: 0, connect: 0, owned: 2, final: 0 }
  // and nine textual `window.journey` occurrences across four reads. Slice D
  // took the two owned literals and the four reads; U04 took the last five.
  //
  // The five survivors were all 'mission' — the HERO's own DOM, which §6.5
  // kept deliberately because there was nowhere better to say it. There is
  // now: `copySurface` on the chapter manifest declares WHERE a chapter's copy
  // lives, and `journey/ui/copy-arrival.js` derives `HERO_CHAPTER_ID` from
  // that table (throwing on none-or-many, the CONNECT_FOCAL_ID pattern). The
  // three sites that tested the id — the copy-block builder, the painter, and
  // the deferred-paint gate — dispatch on the declared surface instead, and
  // the two remaining reads were `eased.mission` member accesses that a grep
  // for the literal never counted in the five at all.
  //
  // `journey/ui/copy-arrival.js` is in the file list above for the reason
  // U03's note gives: the claim is about the SURFACE, and a ratchet that stops
  // scanning the file the code moved to reports zero about nothing.
  assert.deepEqual(A(counts), {
    mission: 0, inspire: 0, equip: 0, connect: 0, owned: 0, final: 0,
  });
  assert.equal(A(countOf(src, 'window.journey')), 0,
    'ui.js no longer reaches the chapter modules through the global handle');

  /* ---- D46 + D54: this check is now an ASSERT-ZERO, twice over ---------
     Two of the three assertions above pass when the value is zero, and zero
     is also what a scan that never read the file reports. D46's remedy is an
     inputs pin plus a positive control; D54's refinement is that the control
     must be a SET OF SITES, not a count. Both, below. */

  // D46 (1) — INPUTS PIN: how many files were read, as a literal.
  assert.equal(A(files.length), 10, 'exactly ten files — the composition root, the three owners U03 split out of it, the copy/arrival controller U04 did, and the five U06 did — are scanned');

  // D46 (2) / D54 — POSITIVE CONTROL as a SITE SET. These are the reads that
  // REPLACED the four global reaches: the injection point itself and the three
  // consumers. If the scan goes blind this list is empty; if someone adds or
  // moves a read, the diff names it.
  //
  // QA-05 — RE-KEYED FROM `file :: line :: text` TO `file :: text`, WHICH IS
  // WHAT D64 REQUIRES, and the row was red when this order picked it up.
  //
  // The UI-lifecycle order moved journey/ui.js and all four line numbers
  // shifted — 177->167, 828->869, 1604->1645, 2787->2828 — while THE TEXT OF
  // ALL FOUR ROWS STAYED BYTE-IDENTICAL. Nothing this control exists to catch
  // had happened; the pin was reporting its subject's line numbering. The
  // tempting repair is to bump the four numbers, and that is precisely the
  // failure D54 and D64 were written about: U01a and U02-U06 all rewrite this
  // same file, so a line-keyed row here is guaranteed to churn five more
  // times and be re-baselined five more times.
  //
  // The line numbers are NOT re-baselined. They are removed, because they
  // were never the property under test: the property is WHICH LINES read the
  // injected map. `withLine: false` is siteSet's own supported key.
  const injectedSites = files.flatMap((f, i) =>
    siteSet(f, codeEmptyStrings(raws[i]), (l) => INJECTED_CHAPTERS.test(l), { withLine: false }));
  /* U06: THREE OWNERS NOW, NOT ONE, AND THE TWO READS MOVED WITH THEM.
     `const ch = chapters[h.chapter]` went to label-policies.js and
     `chapters[id] && chapters[id].visibility` to rail-mask.js — the same two
     reads, in the owners that now perform them, plus the two handoffs that
     get the map there. The map is still destructured EXACTLY ONCE, at
     createUI's parameter list, and every reader below is reached from it by
     injection rather than by import. That is the property; the row count is
     not. Extended by NAME, per D54: a manifest cannot be repaired by bumping
     a number. */
  assert.deepEqual(A(injectedSites), [
    'journey/ui.js :: rail: preparedRail = null, chapters = {} }) {',
    'journey/ui.js :: const selection = createSelection({ hotspots, chapters });',
    'journey/ui.js :: const policies = createLabelPolicies({ hotspots, chapters });',
    'journey/ui.js :: hotspots, railGeom, chapters, chapterIds: RUNTIME_CHAPTER_IDS,',
    'journey/ui/selection.js :: export function createSelection({ hotspots, chapters }) {',
    'journey/ui/selection.js :: const sel = h && chapters[h.chapter] && chapters[h.chapter].selection;',
    'journey/ui/label-policies.js :: export function createLabelPolicies({ hotspots, chapters }) {',
    'journey/ui/label-policies.js :: const ch = chapters[h.chapter];',
    'journey/ui/rail-mask.js :: export function createRailMask({ hotspots, railGeom, chapters, chapterIds }) {',
    'journey/ui/rail-mask.js :: const vis = chapters[id] && chapters[id].visibility;',
  ], 'the injected map is destructured once, handed to three owners, and read by exactly four consumers');

  /* The line component is not simply dropped — dropping it could let two
     distinct reads collapse into one indistinguishable row and hide a
     deletion. So the CARDINALITY of the keyed set is pinned too: four rows,
     four distinct texts. If a future edit makes two reads textually equal,
     this goes red rather than silently merging them. */
  assert.equal(A(new Set(injectedSites).size), 10,
    'the ten rows are textually DISTINCT, so keying on text alone cannot merge two reads into one');

  // CONTROL, ADD direction — a sixth chapter-id literal and a new global read.
  const added = codeKeepStrings(`${raw}\nconst probe = 'connect'; const g = window.journey;\n`);
  assert.equal(A(idLiteralCounts(added).connect), 1, 'an added literal fails T2');
  assert.equal(A(countOf(added, 'window.journey')), 1, 'an added global read fails T2');

  /* CONTROL, DELETE direction — AND THE HALF THAT HAD TO BE SEPARATED (U04).
     This used to delete a `'mission'` literal out of the REAL source and
     assert the count fell 5 -> 4. That control was parasitic on the very
     literals the ratchet exists to remove: at zero, `injected` finds no anchor
     and THROWS, so the check could not reach green by succeeding.

     A control must not share a subject with the claim it controls. The claim
     above is about the real surface and is now zero; this proves the COUNTER
     still sees a deletion, on a fixture built for the purpose. If
     `idLiteralCounts` ever goes blind, the fixture drops to a number that is
     not 4 and this fails — which is the property under test, and the only one
     that was ever under test here. */
  const fixture = codeKeepStrings(
    "const a = 'mission'; const b = 'mission'; const c = 'mission';\n"
    + "const d = 'mission'; const e = 'mission';\n");
  assert.equal(A(idLiteralCounts(fixture).mission), 5,
    'the fixture control is not vacuous — the counter sees all five before the deletion');
  const deleted = codeKeepStrings(injected(fixture, "'mission'", 'MISSION_ID'));
  assert.equal(A(idLiteralCounts(deleted).mission), 4,
    'a deleted mission literal fails T2 as loudly as an added one');

  // CONTROL for the site set — deleting a real read must move the LIST, not a
  // number. `injected` throws if the anchor stops matching, so this cannot go
  // hollow.
  const unread = codeEmptyStrings(injected(raw, 'const vis = chapters[id] && chapters[id].visibility;', 'const vis = null;'));
  /* U06: ten rows, so a deletion leaves NINE. The literal follows the site
     set above and is derived from the same surface — it moved because the
     manifest did, not because the control weakened. */
  assert.deepEqual(A(siteSet(files[0], unread, (l) => INJECTED_CHAPTERS.test(l)).length), 9,
    'a removed consumer removes its row');
});

/* D1 (2026-08-25) — THREE ANCHORS RE-POINTED, THE CLAIM UNCHANGED. Every
   reader below applyFrame's publication now takes its coordinate off the
   frozen frame, so the focal pick's ARGUMENT is spelled `frame.routeP` where
   it was spelled `frameP`. The three literals below (the binding assertion,
   the site-set row, and the removal control) follow the statement to its new
   spelling; `function pickChapterFocus(chapters, frameP) {` is untouched
   because that function's own parameter name did not change. What T3 asserts
   — zero named chapters inside applyFrame, one module-scope focal pick,
   called once, from this file — is exactly what it asserted before. */
check('T3 [static ratchet] journey/journey.js names no chapter inside applyFrame, and the ONE surviving reach elsewhere is named', () => {
  const files = ['journey/journey.js'];
  const raw = read(files[0]);
  const src = codeKeepStrings(raw);
  const body = bodyOf(src, 'applyFrame');
  // Anchor-miss guard: bodyOf brace-matches over a source whose strings are
  // preserved, so a stray brace in a literal could truncate the body. If these
  // anchors are not both inside it, the extraction is wrong and must be loud.
  if (!body.includes('applyChapterFrame(') || !body.includes('ui.update(')) {
    throw new Error('anchors no longer match source: applyFrame body lost applyChapterFrame(/ui.update(');
  }
  const seq = (b) => b.match(/chapters\.(?:mission|inspire|connect|owned|final)/g) || [];

  // SLICE D/E HAS LANDED. WAS: the four named branches of the lens focal pick,
  // each read twice (`.armed` and the focal expression) —
  // ['chapters.inspire' x2, 'chapters.connect' x2, 'chapters.owned' x2,
  //  'chapters.final' x2]. They are one call to pickChapterFocus now.
  assert.deepEqual(A(seq(body)), []);

  // D46 (1) — INPUTS PIN.
  assert.equal(A(files.length), 1, 'exactly one file is scanned');
  // D45 — the extraction produced a real body, not an empty string. Without
  // this, `seq('')` is also [] and this check would pass on a broken bodyOf.
  assert.equal(A(body.includes('lens.setFocusHint(pickChapterFocus(chapters, frame.routeP))')), true,
    'applyFrame must still be the caller — this is the BINDING half I3(b) cannot execute');

  // D46 (2) / D54 — POSITIVE CONTROL as a SITE SET: the capability-driven pick
  // that replaced the four branches. A blind scan yields [].
  //
  // PIN-01 — RE-KEYED FROM `file :: line :: text` TO `file :: text`, THE SAME
  // REPAIR T2's `ui.js` SET TOOK ABOVE, AND FOR THE SAME REASON.
  //
  // D93 settles the question these rows got wrong. The deciding property is
  // not self-versus-foreign — D64 permits a line key on a foreign file — it is
  // whether THE SUBJECT'S LINE NUMBERS ARE STABLE FOR THE LIFE OF THE PIN.
  // journey/journey.js is edited by four more orders (J01, J02, J04d, J04e),
  // two of which insert inside the regions these rows bracket, so a line key
  // here was wrong regardless of who owned it.
  //
  // Measured before the repair, with a null control run first and again after
  // restore from a hash-fenced copy: ONE COMMENT LINE at journey.js:2 red the
  // whole suite (25/25 -> 1/25) on `:: 89 -> :: 90`, and one at :1200 red it
  // on `:: 1550 -> :: 1551`. Permitted delta was exactly 0 lines across four
  // regions — a line-neutrality contract no editing order can honour.
  //
  // The numbers are NOT re-baselined. Bumping them recreates the defect one
  // edit later, which is the failure mode D54 and D64 were written about. They
  // are REMOVED, because they were never the property under test: the property
  // is THAT the focal pick is one module-scope function, reading the
  // capability, called once — and WHERE, to file granularity. A reach that
  // MOVES FILE or is DELETED still empties or changes its row and still fails.
  // `withLine: false` is siteSet's own supported key.
  const focusSites = siteSet(files[0], codeEmptyStrings(raw), (l) => /\.focus\b|pickChapterFocus/.test(l), { withLine: false });
  assert.deepEqual(A(focusSites), [
    'journey/journey.js :: function pickChapterFocus(chapters, frameP) {',
    'journey/journey.js :: if (ch.armed && ch.focus) focus = ch.focus.world();',
    'journey/journey.js :: lens.setFocusHint(pickChapterFocus(chapters, frame.routeP));',
  ], 'the focal pick is one module-scope function, reading the capability, called once');

  /* THE ONE NAMED-CHAPTER REACH C05 DID NOT CLOSE, pinned by site rather than
     left in prose. `prepareGpu` reads `chapters.owned.portraits` for the
     boot-time photo decode and first remix — a named chapter AND a private
     field, and after slice D the only private-portrait reach left outside
     journey/chapters/owned/.

     PROVENANCE, CORRECTED BY SLICE E. This comment used to read "No C05 slice
     was assigned it", and slice D's limitations added that closing it "requires
     a new contract member in slice A's file". Both readings are wrong in the
     same direction: they describe an OVERSIGHT. It is a SETTLED DEFERRAL, and
     the settlement forbids exactly the remedy that was proposed.

       * `migration-table.md` §5(a) enumerates this read by name, classifies it
         as a boot-READINESS concern — "this chapter has asynchronous build work
         outstanding" — which is none of the four capabilities, and hands it to
         C06 as a CONSTRUCTION concern, C06's subject.
       * `design.md` §11-Q7 settles the ownership question: "C06 owns it. If C06
         declines, the fallback is a recorded, dated exception — NOT a fifth
         capability."
       * `design.md` §7.3 gives that exception its text, and slice E records it
         here as the dated exception the design asked for:

           "journey.js:1498-1500 reads a named chapter's private field; owned by
            neither C05 nor C06; revisit when chapter teardown or a second async
            chapter exists."                        (dated 2026-08-21, slice E)

     So a `readiness` capability is not the closure of this row — it is the
     over-abstraction §7.3 exists to refuse, "and the refusal must not quietly
     reverse itself because a hand-off failed." The guard against that reversal
     already exists and is not duplicated here: I9b pins CAPABILITY_KEYS to
     exactly the four, so a fifth capability reds this suite BY NAME. (Cited
     without a line number on purpose: this comment's own first draft said
     `:392`, and the header edits made in the same order moved it. A line
     number in prose is a pin nothing checks.)

     The row below carried `:1550`, not §5(a)'s `:1498` — the read moved under
     slices C and D, and even then the comment had to say "the TEXT is what
     identifies it". PIN-01 acted on that sentence: the number is REMOVED, not
     re-baselined a third time, per D93. Recorded so that closing this deletes
     a ROW rather than going unnoticed, and so that a SECOND one cannot appear
     quietly — both of which the text alone still detects. */
  const namedElsewhere = siteSet(files[0], codeEmptyStrings(raw), (l) => /chapters\.(?:mission|inspire|connect|owned|final)/.test(l), { withLine: false });
  assert.deepEqual(A(namedElsewhere), [
    'journey/journey.js :: const portraits = chapters.owned && chapters.owned.portraits;',
  ], 'exactly one named-chapter reach survives in journey.js, and it is prepareGpu\'s');

  /* DISTINCTNESS, because dropping the line component is only safe while the
     four texts stay distinct. Two rows that became textually equal would
     COLLAPSE into one and hide a deletion — the failure T2 pinned against
     above, and the same literal-cardinality shape.

     D94: the collection is DERIVED FROM THE SUBJECT — both site sets are read
     out of journey.js's own bytes — never hand-written data standing in for
     it. TWO assertions, because one cannot say this:

       * the CARDINALITY, against a literal. A blind scan makes this 0, not 4,
         and an added or lost reach moves it. This is the D94 pin.
       * the DISTINCTNESS, as unique-versus-total. A literal cannot express
         it: a set of 4 rows with two collapsed still has 3 uniques, and
         pinning `3` would forbid the healthy state instead of the sick one.
         The expected side is derived, which is legal here precisely because
         the cardinality pin above already fails on the degenerate 0 === 0
         reading that a derived expected would otherwise wave through.

     The collapse this guards is real under a text-only key and not under a
     line key: ONE physical line can satisfy BOTH regexes — `.focus`/
     `pickChapterFocus` and `chapters.<id>` — and be keyed identically into
     both sets, so the four rows would silently become three reaches. */
  const keyedRows = [...focusSites, ...namedElsewhere];
  assert.equal(A(keyedRows.length), 4,
    'four rows are keyed over journey.js — cardinality against the subject, so a blind scan reads 0');
  assert.equal(A(new Set(keyedRows).size), keyedRows.length,
    'and the rows are textually DISTINCT, so keying on text alone cannot merge two reaches into one');

  // CONTROL, add direction — a named branch back inside applyFrame.
  assert.equal(A(seq(`${body}\nif (chapters.final.armed) {}\n`).length), 1);
  // CONTROL for the site set — removing the real call must empty its row.
  const uncalled = codeEmptyStrings(injected(raw, 'lens.setFocusHint(pickChapterFocus(chapters, frame.routeP));', 'lens.setFocusHint(null);'));
  assert.deepEqual(A(siteSet(files[0], uncalled, (l) => /\.focus\b|pickChapterFocus/.test(l)).length), 2,
    'a removed call removes its row');
});

/* ================================================================== *
 * 6. T4 — the four REAL chapters, by source extraction               *
 *                                                                    *
 * I1-I10 exercise fakes: they prove the contract machinery and       *
 * nothing about the four shipped modules, which cannot be imported   *
 * under plain node (three via the page's import map, DOM/WebGL at    *
 * construction). So the real-descriptor check has to be a source     *
 * assertion or a live-page one, with nothing in between.             *
 * ================================================================== */

/** Walk `src` from `i`, skipping one string, template, comment or regex
 *  literal if one starts there. Returns the index after it, or i if none. */
function skipLiteral(src, i, prevSignificant) {
  const c = src[i];
  if (c === '/' && src[i + 1] === '/') {
    const nl = src.indexOf('\n', i);
    return nl < 0 ? src.length : nl;
  }
  if (c === '/' && src[i + 1] === '*') {
    const end = src.indexOf('*/', i + 2);
    if (end < 0) throw new Error('unterminated block comment');
    return end + 2;
  }
  if (c === '/' && !'})]abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$'.includes(prevSignificant)) {
    // A regex literal: `/` only starts one where a value may start.
    let j = i + 1;
    let inClass = false;
    for (; j < src.length; j++) {
      const d = src[j];
      if (d === '\\') { j++; continue; }
      if (d === '[') inClass = true;
      else if (d === ']') inClass = false;
      else if (d === '/' && !inClass) return j + 1;
      else if (d === '\n') break;
    }
    return i + 1;                       // not a regex after all: plain division
  }
  if (c === '"' || c === "'") {
    for (let j = i + 1; j < src.length; j++) {
      if (src[j] === '\\') { j++; continue; }
      if (src[j] === c) return j + 1;
    }
    throw new Error('unterminated string literal');
  }
  if (c === '`') {
    for (let j = i + 1; j < src.length; j++) {
      if (src[j] === '\\') { j++; continue; }
      if (src[j] === '`') return j + 1;
      if (src[j] === '$' && src[j + 1] === '{') {
        let depth = 1;
        let k = j + 2;
        while (k < src.length && depth > 0) {
          const after = skipLiteral(src, k, ' ');
          if (after !== k) { k = after; continue; }
          if (src[k] === '{') depth++;
          else if (src[k] === '}') depth--;
          k++;
        }
        j = k - 1;
      }
    }
    throw new Error('unterminated template literal');
  }
  return i;
}

/** Advance past whitespace, comments and one balanced value, stopping at the
 *  first `,` or `}` that is at the caller's own nesting depth. */
function skipValue(src, from) {
  let depth = 0;
  let prev = ' ';
  for (let i = from; i < src.length; i++) {
    const after = skipLiteral(src, i, prev);
    if (after !== i) { i = after - 1; prev = 'x'; continue; }
    const c = src[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') {
      if (depth === 0 && c === '}') return i;
      depth--;
    } else if (c === ',' && depth === 0) return i;
    if (!/\s/.test(c)) prev = c;
  }
  throw new Error('unbalanced object literal');
}

/** `bodyOf`, but brace-matching through strings, templates, regexes and
 *  comments rather than over them. T3 can use the plain `bodyOf` because it
 *  scans a comment-stripped source for a token; T4 reads raw chapter sources,
 *  where a `}` inside a string literal would truncate the body silently. */
function functionBody(src, name) {
  const head = src.indexOf(`function ${name}(`);
  if (head < 0) throw new Error(`no function ${name} in source`);
  const open = src.indexOf('{', src.indexOf(')', head));
  let depth = 0;
  let prev = ' ';
  for (let i = open; i < src.length; i++) {
    const after = skipLiteral(src, i, prev);
    if (after !== i) { i = after - 1; prev = 'x'; continue; }
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(open + 1, i);
    if (!/\s/.test(c)) prev = c;
  }
  throw new Error(`unbalanced body for ${name}`);
}

const IDENT = /[A-Za-z0-9_$]/;

/**
 * The top-level keys of the object literal whose `{` is at `open`.
 *
 * THIS FUNCTION FAILS LOUDLY ON ANY SHAPE IT DOES NOT RECOGNISE, and that is
 * deliberate. Two descriptor shapes exist today — a plain object literal
 * (connect, owned, final) and a named `api` literal that is returned by
 * identifier (inspire) — and both are handled. If a THIRD shape ever appears —
 * a spread element, a computed key, a conditional member, an identifier with no
 * literal — the extractor THROWS. The tempting defensive line
 * `if (!lit) continue;` would silently skip such a descriptor and leave T4
 * asserting nothing about it, recreating exactly the vacuity T4 exists to
 * prevent. That line must never be written here: for this extractor, failing
 * loudly is the safe direction.
 */
function literalKeys(src, open, where) {
  return literalEntries(src, open, where).map((e) => e.name);
}

/** As `literalKeys`, but also carrying each member's VALUE TEXT.
 *
 *  T4 reads declared key NAMES. That is all S-2/F-3 leaves the program: no
 *  suite anywhere loads a chapter module, so nothing offline has ever seen a
 *  descriptor's VALUES or TYPES. Slice C makes that gap load-bearing, because
 *  the registrar's `typeof vis.nodeReveal === 'function'` test is what turns
 *  owned's declared-absent reveal into `undefined` (H4). A key-name reading
 *  cannot tell `nodeReveal: null` from `nodeReveal: () => 1`. T4d pins the
 *  value text of exactly the members the registrar branches on.
 *
 *  A method shorthand and a shorthand property have no value expression; they
 *  are reported as the sentinels `<method>` and `<shorthand>` so the two are
 *  distinguishable from each other and from any literal. */
function literalEntries(src, open, where) {
  if (src[open] !== '{') throw new Error(`${where}: expected an object literal at ${open}`);
  const keys = [];
  let i = open + 1;
  for (;;) {
    // trivia
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      const after = skipLiteral(src, i, ' ');
      if ((src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) && after !== i) { i = after; continue; }
      break;
    }
    if (i >= src.length) throw new Error(`${where}: unterminated object literal`);
    if (src[i] === '}') return keys;
    if (src.startsWith('...', i)) {
      throw new Error(`${where}: unrecognised descriptor shape — spread element in the returned object literal`);
    }
    if (src[i] === '[') {
      throw new Error(`${where}: unrecognised descriptor shape — computed key in the returned object literal`);
    }
    // modifiers: get / set / async / *
    let name;
    for (;;) {
      if (src[i] === '*') { i++; continue; }
      let j = i;
      if (src[j] === '"' || src[j] === "'") {
        const end = skipLiteral(src, j, ' ');
        name = src.slice(j + 1, end - 1);
        i = end;
        break;
      }
      while (j < src.length && IDENT.test(src[j])) j++;
      if (j === i) throw new Error(`${where}: unrecognised descriptor shape at ${JSON.stringify(src.slice(i, i + 40))}`);
      const word = src.slice(i, j);
      let k = j;
      while (k < src.length && /\s/.test(src[k])) k++;
      if ((word === 'get' || word === 'set' || word === 'async') && IDENT.test(src[k] || '')) { i = k; continue; }
      name = word;
      i = j;
      break;
    }
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] === ':' || src[i] === '(') {
      const method = src[i] === '(';
      const from = method ? i : i + 1;
      // For a method shorthand the scan must start ON the `(`, so the comma
      // between its parameters is seen at depth 1 and not mistaken for the end
      // of the member.
      i = skipValue(src, from);
      keys.push({
        name,
        value: method ? '<method>' : src.slice(from, i).replace(/\s+/g, ' ').trim(),
      });
    } else if (src[i] === ',' || src[i] === '}') {
      keys.push({ name, value: '<shorthand>' });         // shorthand property
    } else {
      throw new Error(`${where}: unrecognised descriptor member '${name}' at ${JSON.stringify(src.slice(i, i + 40))}`);
    }
    if (src[i] === ',') i++;
  }
}

/* ------------------------------------------------------------------ *
 * The identifier-shape mutation scan.                                  *
 *                                                                      *
 * Inspire returns a named `api` literal, so T4 reads that literal — and *
 * that is sound ONLY while nothing writes a key onto the object after   *
 * it. The first version of this scan enumerated the ways a write could  *
 * be spelled (`api.x =`, `api[…] =`, `Object.assign(api`, `delete`).    *
 * R1 found five spellings it missed silently: `??=`, `||=`,             *
 * `Reflect.set(api, …)`, passing `api` to a function that writes its    *
 * parameter, and aliasing it through another variable. A blacklist of   *
 * mutation spellings keeps losing that race, because the language keeps *
 * adding spellings and indirection has no fixed syntax at all.          *
 *                                                                      *
 * So the scan is INVERTED. It no longer asks "is this a write?" — it    *
 * asks "is this provably a read?", and throws on everything else. Every *
 * occurrence of the identifier must be one of:                          *
 *                                                                      *
 *   - its own `const <name> = {` declaration;                           *
 *   - a member access `<name>.prop` / `<name>[expr]` whose next token   *
 *     is NOT an assignment operator and NOT `++`/`--`  (so a call, a    *
 *     plain read, or a deeper chain — none of which changes the top-    *
 *     level key set);                                                   *
 *   - the sanctioned `return <name>;`.                                  *
 *                                                                      *
 * Anything else — the identifier appearing as an argument, an alias, a  *
 * spread, an assignment target, a `delete`/`++` operand — is an ESCAPE, *
 * and an escape is rejected because this scan cannot tell a read-escape *
 * from a write-escape without a parser. Loud and conservative is the    *
 * safe direction here, exactly as it is for the descriptor shape: a     *
 * silent miss would let T4 pass while a core key was added by a path it *
 * cannot see, which is the vacuity T4 exists to prevent.                *
 * ------------------------------------------------------------------ */

const ASSIGN_OPS = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=',
  '&=', '|=', '^=', '&&=', '||=', '??=',
]);

/** Longest-first, so `>>>=` is never read as `>>` + `>=`. */
const MULTI_OPS = [
  '>>>=', '===', '!==', '**=', '<<=', '>>=', '&&=', '||=', '??=', '>>>', '...',
  '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '=>', '++', '--',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**',
];

/** Coarse tokens — names, operators, punctuation — with strings, templates,
 *  regexes and comments consumed whole so nothing inside them is ever seen as
 *  code. Comments emit no token, so a comment can never sit between an
 *  identifier and the operator that would classify it. */
function tokenize(src) {
  const toks = [];
  let prev = ' ';
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }
    const isComment = src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*');
    const after = skipLiteral(src, i, prev);
    if (after !== i) {
      if (!isComment) { toks.push({ t: 'lit', v: src.slice(i, after), i }); prev = 'x'; }
      i = after;
      continue;
    }
    if (IDENT.test(src[i])) {
      let j = i;
      while (j < src.length && IDENT.test(src[j])) j++;
      toks.push({ t: 'name', v: src.slice(i, j), i });
      prev = src[j - 1];
      i = j;
      continue;
    }
    const op = MULTI_OPS.find((o) => src.startsWith(o, i)) || src[i];
    toks.push({ t: 'punc', v: op, i });
    prev = op[op.length - 1];
    i += op.length;
  }
  return toks;
}

const WRITES_ITS_OPERAND = new Set(['delete', '++', '--']);
const DECLARERS = new Set(['const', 'let', 'var']);

/**
 * Throw unless EVERY occurrence of `name` in `body` is provably a read.
 * See the block comment above for why this is a whitelist and not a
 * blacklist of mutation spellings.
 */
function assertOnlyRead(body, name, where) {
  const toks = tokenize(body);
  const fail = (why) => {
    throw new Error(`${where}: unrecognised descriptor shape — '${name}' ${why}, so the literal is no longer the descriptor`);
  };

  const declarations = toks
    .map((t, k) => k)
    .filter((k) => toks[k].t === 'name' && toks[k].v === name
      && toks[k - 1] && DECLARERS.has(toks[k - 1].v)
      && toks[k + 1] && toks[k + 1].v === '=');
  if (declarations.length !== 1) {
    fail(`is declared ${declarations.length} times, not once`);
  }

  let reads = 0;
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    if (tok.t !== 'name' || tok.v !== name) continue;
    if (k === declarations[0]) continue;
    const before = toks[k - 1];
    const after = toks[k + 1];
    // `something.api` is a property that happens to share the name, not this
    // binding. It cannot reach the descriptor object. Nor can `{ api: … }`,
    // where the name is another object's KEY — but `{ api }` shorthand IS the
    // binding escaping, so the preceding token must be `{` or `,` and the
    // following one `:` for this to be a key.
    if (before && (before.v === '.' || before.v === '?.')) continue;
    if (before && after && (before.v === '{' || before.v === ',') && after.v === ':') continue;

    if (before && WRITES_ITS_OPERAND.has(before.v)) fail(`is the operand of \`${before.v}\``);
    if (before && before.v === 'return' && after && after.v === ';') { reads++; continue; }
    if (!after) fail('is the final token of the factory body');

    if (after.v === '.' || after.v === '?.') {
      const prop = toks[k + 2];
      if (!prop || prop.t !== 'name') fail('is accessed through a shape this scan does not model');
      const next = toks[k + 3];
      if (next && (ASSIGN_OPS.has(next.v) || next.v === '++' || next.v === '--')) {
        fail(`has its member '${prop.v}' written by \`${next.v}\``);
      }
      reads++;                       // a call, a plain read, or a deeper chain
      continue;
    }
    if (after.v === '[') {
      let depth = 0;
      let j = k + 1;
      for (; j < toks.length; j++) {
        if (toks[j].v === '[') depth++;
        else if (toks[j].v === ']' && --depth === 0) break;
      }
      const next = toks[j + 1];
      if (next && (ASSIGN_OPS.has(next.v) || next.v === '++' || next.v === '--')) {
        fail(`has a computed member written by \`${next.v}\``);
      }
      reads++;
      continue;
    }
    fail(`escapes this scan's reach (followed by \`${after.v}\`) — it may be aliased, spread, or handed to something that writes it`);
  }

  // Anchor-miss guard: the identifier form always has at least the `return`,
  // so zero reads means the scan stopped matching the source rather than
  // finding it clean.
  if (!reads) fail('never appears again after its declaration — the scan has lost the source');
}

/** Locate a chapter module's returned descriptor and read its top-level keys.
 *  Handles the object-literal form and the returned-identifier form; anything
 *  else throws — see literalKeys. */
function descriptorKeys(src, factory, where) {
  const body = functionBody(src, factory);
  const at = body.lastIndexOf('\n  return ');
  if (at < 0) throw new Error(`${where}: no top-level return in ${factory}`);
  let i = at + '\n  return '.length;
  while (i < body.length && /\s/.test(body[i])) i++;
  if (body[i] === '{') return literalKeys(body, i, where);

  let j = i;
  while (j < body.length && IDENT.test(body[j])) j++;
  const name = body.slice(i, j);
  let k = j;
  while (k < body.length && /\s/.test(body[k])) k++;
  if (!name || body[k] !== ';') {
    throw new Error(`${where}: unrecognised descriptor shape — ${factory} returns ${JSON.stringify(body.slice(i, i + 60))}`);
  }
  const decl = body.indexOf(`const ${name} = {`);
  if (decl < 0) {
    throw new Error(`${where}: unrecognised descriptor shape — ${factory} returns the identifier '${name}' but no 'const ${name} = {' literal exists`);
  }
  // Reading the literal is only sufficient while nothing mutates the object
  // after it. Prove that, do not assume it.
  assertOnlyRead(body, name, where);
  return literalKeys(body, body.indexOf('{', decl), where);
}

const CHAPTER_FACTORY = {
  inspire: 'createInspire', equip: 'createEquip', connect: 'createConnect',
  owned: 'createOwned', final: 'createFinal',
};

check('T4 [static] the five shipped chapters — core keys declared, and no capability declares a foreign member', () => {
  assert.deepEqual(A(Object.keys(CHAPTER_FACTORY)), ['inspire', 'equip', 'connect', 'owned', 'final'],
    'the extractor covers every runtime chapter — cardinality pinned, not derived');
  assert.deepEqual(A([...RUNTIME_CHAPTER_IDS]), Object.keys(CHAPTER_FACTORY),
    'and that list is the schema\'s own, cross-checked rather than copied from it');

  const declared = {};
  for (const [id, factory] of Object.entries(CHAPTER_FACTORY)) {
    const where = `journey/chapters/${id}/index.js`;
    const keys = descriptorKeys(read(`journey/chapters/${id}/index.js`), factory, where);
    if (!keys.includes('group')) throw new Error(`${where}: anchors no longer match source — no 'group' in the extracted descriptor`);
    declared[id] = keys;
  }

  // SLICE B HAS LANDED: all seven core keys, on all four chapters. Inspire's
  // `snapLanding` is declared `null` and must stay that way — a function there
  // would run snap() at every camera landing and kill the intro cascade
  // beginEntry() exists to re-arm (design.md §8.2-H2). This extractor reads
  // the DECLARED key, not its value, so the null is pinned as a live member by
  // I2 rather than here.
  const core = Object.fromEntries(Object.entries(declared)
    .map(([id, keys]) => [id, CORE_KEYS.filter((k) => keys.includes(k))]));
  assert.deepEqual(A(core), {
    inspire: ['id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding'],
    equip: ['id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding'],
    connect: ['id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding'],
    owned: ['id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding'],
    final: ['id', 'group', 'counts', 'setArmed', 'armed', 'snap', 'snapLanding'],
  }, 'slice B landed all seven core keys on all five chapters — Equip arrived already conforming');
  // WAS (pre-slice-B): inspire ['group','counts','setArmed','armed','snap'],
  // the other three the same plus 'snapLanding'; no chapter declared `id`.

  // Capability declaration — design.md §3's table, as landed by slice B. Still
  // an exact value in both directions: adding a capability fails this and
  // removing one fails it too, so a later slice cannot satisfy it by loosening.
  // `owned` appears here with `focus` declared because the extractor reads the
  // declared KEY; owned's focus VALUE is null, which is the stated absence
  // preserving journey.js's always-null focal hint for the Owned leg (§8.2-H9).
  const caps = Object.fromEntries(Object.entries(declared)
    .map(([id, keys]) => [id, CAPABILITY_KEYS.filter((k) => keys.includes(k))]));
  // Equip declares `interaction: null` — an explicit statement that it offers
  // no hover zone and no committed action, which the extractor reads as a
  // declared KEY exactly as it reads owned's null `focus`.
  assert.deepEqual(A(caps), {
    inspire: ['focus', 'selection', 'visibility'],
    equip: ['focus', 'interaction', 'selection', 'visibility'],
    connect: ['focus', 'selection', 'visibility'],
    owned: ['focus', 'interaction', 'selection', 'visibility'],
    final: ['focus'],
  }, "design.md §3's table, as landed by slice B, plus Equip (2026-08-30)");
  // WAS (pre-slice-B): [] on all four.

  // And the member check itself, which since slice B has eleven real
  // capability declarations to run over.
  //
  // C05B-MAJOR-1, REPAIRED HERE. What stood here was
  //     assert.deepEqual(foreign, [], `${id}.${cap} declares only ...`)
  // inside this loop — the ONLY assertion T4 made about the ten real non-null
  // capabilities, and it had three defects at once (C05-B R1 §6b):
  //   1. it was an emptiness assertion, green when the tree is clean AND green
  //      when the instrument is dead;
  //   2. its actual was bare `foreign`, not `A(foreign)`, so `--prove-failure`
  //      never enumerated it — the D44 blind spot, reached from the other side;
  //   3. nothing pinned that `capabilityMembers` had returned a non-empty
  //      member list for ANY real chapter. An indentation change that made
  //      `literalKeys` read an empty region would have returned [] for all ten,
  //      `foreign` would have been [] for all ten, and T4 would have been green
  //      over ten real capabilities while asserting nothing about any of them.
  // Its only positive control was over a SYNTHETIC source (T4b), which is
  // exactly the distinction D45 draws.
  //
  // The repair collects the member lists and pins them as an EXACT VALUE.
  // That pins non-emptiness, membership, cardinality and order in one
  // comparison, and it is a failability site by construction.
  const memberIndex = {};
  const declaredNull = [];
  let filesRead = 0;            // D46: inputs read, not matches found
  let capsRead = 0;             // D45: this loop's own iteration count
  for (const [id, keys] of Object.entries(declared)) {
    const chapterSrc = read(`journey/chapters/${id}/index.js`);
    filesRead++;
    for (const cap of CAPABILITY_KEYS) {
      if (!keys.includes(cap)) continue;
      capsRead++;
      const members = capabilityMembers(chapterSrc, CHAPTER_FACTORY[id], cap, id);
      if (members === null) { declaredNull.push(`${id}.${cap}`); continue; }
      memberIndex[`${id}.${cap}`] = members;
    }
  }
  // D45/D46 — the loop's cardinality and its inputs, both literal, both
  // asserted BEFORE anything is read off the collection they produced.
  assert.equal(A(filesRead), 5, 'five chapter sources were read — the inputs, not the matches');
  assert.equal(A(capsRead), 15, 'fifteen capability declarations were visited: 13 literal + 2 stated absences');

  assert.deepEqual(A(memberIndex), {
    'inspire.focus': ['world'],
    'inspire.selection': ['setHot', 'setSelected'],
    'inspire.visibility': ['nodeIds', 'nodeWorld', 'nodeReveal', 'nodeRadius', 'labelPolicy',
      'revealDirect', 'revealScrub', 'setExcludedNodes', 'bindCopyEase'],
    'equip.focus': ['world'],
    'equip.selection': ['setHot', 'setSelected'],
    'equip.visibility': ['nodeIds', 'nodeWorld', 'nodeReveal', 'nodeRadius', 'labelPolicy',
      'revealDirect', 'revealScrub', 'setExcludedNodes', 'bindCopyEase'],
    'connect.focus': ['world'],
    'connect.selection': ['setHot', 'setSelected'],
    'connect.visibility': ['nodeIds', 'nodeWorld', 'nodeReveal', 'nodeRadius', 'labelPolicy',
      'revealDirect', 'revealScrub', 'setExcludedNodes', 'bindCopyEase'],
    'owned.interaction': ['zones', 'trigger'],
    'owned.selection': ['setHot', 'setSelected'],
    'owned.visibility': ['nodeIds', 'nodeWorld', 'nodeReveal', 'nodeRadius', 'labelPolicy',
      'revealDirect', 'revealScrub', 'setExcludedNodes', 'bindCopyEase'],
    'final.focus': ['world'],
  }, 'every member of every real capability, by name and in order');
  assert.equal(A(Object.values(memberIndex).reduce((n, m) => n + m.length, 0)), 50,
    'fifty declared members across thirteen capabilities — the extractor found something');

  // The membership relation itself, now that BOTH sides are pinned exactly:
  // the ten member lists above, and CAPABILITY_MEMBERS (all four lists pinned
  // at I9b). Wrapped in A(), so --prove-failure enumerates it.
  const foreignOf = (index, allow) => Object.entries(index)
    .flatMap(([site, members]) => members
      .filter((m) => !allow[site.split('.')[1]].includes(m))
      .map((m) => `${site}.${m}`));
  assert.deepEqual(A(foreignOf(memberIndex, CAPABILITY_MEMBERS)), [],
    'no capability declares a member of another capability');
  // D46 POSITIVE CONTROL, over the REAL member lists and the SAME predicate:
  // narrowing the allowlist by one member must produce that member, at every
  // site that declares it, as an exact value. A dead filter returns [] here.
  const narrowed = { ...CAPABILITY_MEMBERS, visibility: CAPABILITY_MEMBERS.visibility.filter((m) => m !== 'nodeIds') };
  assert.deepEqual(A(foreignOf(memberIndex, narrowed)),
    ['inspire.visibility.nodeIds', 'equip.visibility.nodeIds', 'connect.visibility.nodeIds',
      'owned.visibility.nodeIds'],
    'the filter can find something: it is not an assert-zero over a dead predicate');

  // A stated absence is a fact to PIN, not a case to skip past. TWO exist,
  // and each is a design decision recorded at its own site: owned's `focus`,
  // preserving journey.js's always-null focal hint for the Owned leg
  // (design.md §8.2-H9 / §11-Q1), and equip's `interaction` — Equip has no
  // hover zone and no committed action, which is a claim about the chapter
  // rather than an unfinished edge (2026-08-30). A THIRD one appearing is a
  // design decision too, not a detail, and reds here.
  assert.deepEqual(A(declaredNull), ['equip.interaction', 'owned.focus'],
    'exactly two capabilities are declared as stated absences');
});

/** The top-level member names of one capability sub-literal on a descriptor. */
function capabilityMembers(src, factory, cap, where) {
  const body = functionBody(src, factory);
  // Anchored to the descriptor's own indentation. A bare `${cap}: null` search
  // also matches the phrase inside a doc comment — owned's focus comment
  // contains one — and a reader who let that through would be pinning prose.
  // A comment line never starts with four spaces and the capability name.
  const lit = body.indexOf(`\n    ${cap}: {`);
  const nul = body.indexOf(`\n    ${cap}: null`);
  // A capability may be declared `null`: a STATED ABSENCE, which
  // journey/chapter-contract.js accepts and skips (`if (value === null)
  // continue;`) and which owned.focus is the shipped case of (design.md
  // §8.2-H9). Return null, not []: "declared with no members" and "declared
  // absent" are different facts, and collapsing them would let a capability
  // that LOST its members pass as a stated absence.
  if (nul >= 0 && (lit < 0 || nul < lit)) return null;
  if (lit < 0) throw new Error(`${where}: capability '${cap}' is declared as neither an object literal nor null`);
  return literalKeys(body, body.indexOf('{', lit), `${where}.${cap}`);
}

/** As `capabilityMembers`, but each member's VALUE TEXT (see literalEntries).
 *  Same anchors, same throws — it is the same read, reported differently. */
function capabilityValues(src, factory, cap, where) {
  const body = functionBody(src, factory);
  const lit = body.indexOf(`\n    ${cap}: {`);
  const nul = body.indexOf(`\n    ${cap}: null`);
  if (nul >= 0 && (lit < 0 || nul < lit)) return null;
  if (lit < 0) throw new Error(`${where}: capability '${cap}' is declared as neither an object literal nor null`);
  return Object.fromEntries(literalEntries(body, body.indexOf('{', lit), `${where}.${cap}`)
    .map((e) => [e.name, e.value]));
}

check('T4d [static] the five members journey/chapter-interactions.js BRANCHES on, pinned by VALUE', () => {
  // WHY THIS EXISTS, and what it does NOT close.
  //
  // S-2/F-3 measured that `validateChapterDescriptor` has been invoked 25
  // times, all over synthetic fakes, and that NO journey/chapters/*/index.js is
  // loaded by any suite in the tree. So the type table at
  // journey/chapter-contract.js:77-110 has never run over a shipped chapter,
  // and T4/T4b read declared key NAMES out of source text and never a value.
  //
  // Slice C is what makes that gap load-bearing. The registrar now branches on
  // five members of `visibility`, and two of the branches are `typeof x ===
  // 'function'` tests whose whole job is to turn a declared-absent member into
  // `undefined` at the addHotspot boundary (H4). A key-name reading cannot
  // tell `nodeReveal: null` from `nodeReveal: () => 1`, and the second one
  // switches all sixteen owned contributor labels off the chapter copy ease
  // and onto a reveal product with a different gate — invisible to every
  // golden, because captures run at dt = 0.
  //
  // T4d pins the VALUE TEXT of exactly those five members, on all three
  // chapters that declare `visibility`. It is still a SOURCE assertion: it
  // does not execute a chapter and it is not a substitute for closing F-3.
  // What it removes is the one-line edit that would silently change what the
  // registrar forwards.
  const VIS = {
    inspire: {
      nodeIds: '[...FIXED_HOTSPOTS.inspire]',
      nodeWorld: '<shorthand>',
      nodeReveal: '<shorthand>',
      nodeRadius: 'null',
      labelPolicy: 'null',
      revealDirect: 'true',
      revealScrub: 'false',
      setExcludedNodes: 'null',
      bindCopyEase: 'bindLandingGate',
    },
    connect: {
      nodeIds: 'NODE_IDS',
      nodeWorld: '<shorthand>',
      nodeReveal: '<shorthand>',
      nodeRadius: 'null',
      labelPolicy: 'null',
      revealDirect: 'false',
      revealScrub: 'true',
      setExcludedNodes: 'null',
      bindCopyEase: 'null',
    },
    owned: {
      nodeIds: '<shorthand>',
      nodeWorld: '<shorthand>',
      nodeReveal: 'null',
      nodeRadius: '<shorthand>',
      labelPolicy: '<shorthand>',
      revealDirect: 'false',
      revealScrub: 'false',
      setExcludedNodes: '<method>',
      bindCopyEase: 'null',
    },
  };
  const read4d = {};
  let filesRead = 0;
  for (const id of ['inspire', 'connect', 'owned']) {
    read4d[id] = capabilityValues(read(`journey/chapters/${id}/index.js`), CHAPTER_FACTORY[id], 'visibility', id);
    filesRead++;
  }
  // D45/D46 — inputs and cardinality first, both literal.
  assert.equal(A(filesRead), 3, 'three chapters declare visibility; final does not');
  assert.deepEqual(A(Object.values(read4d).map((v) => Object.keys(v).length)), [9, 9, 9],
    'nine members read from each — the extractor found something');
  assert.deepEqual(A(read4d), VIS, 'the five branched-on members, and their four neighbours, by value');

  // H4 restated as its own predicate, so the table above is not the only guard.
  assert.equal(A(read4d.owned.nodeReveal), 'null',
    'owned declares NO per-node reveal; anything callable here moves sixteen labels');
  assert.deepEqual(A([read4d.inspire.nodeRadius, read4d.connect.nodeRadius]), ['null', 'null'],
    'only owned has a hit-radius model; the other two must reach addHotspot as undefined');
  // The reveal-flag pair, one true at most, per chapter.
  assert.deepEqual(A([
    [read4d.inspire.revealDirect, read4d.inspire.revealScrub],
    [read4d.connect.revealDirect, read4d.connect.revealScrub],
    [read4d.owned.revealDirect, read4d.owned.revealScrub],
  ]), [['true', 'false'], ['false', 'true'], ['false', 'false']],
  'revealDirect moved home to inspire; revealScrub stays connect\'s');

  // POSITIVE CONTROL, on a synthetic source, that the value reader can tell a
  // null from a function — the exact discrimination H4 turns on. Without this
  // the table above is an equality between two things the reader might be
  // producing identically.
  const wrap = (v) => `export function createX() {\n  return {\n    group: 1,\n    visibility: {\n      nodeReveal: ${v},\n    },\n  };\n}\n`;
  assert.equal(A(capabilityValues(F(() => wrap('null'), () => wrap('() => 1')), 'createX', 'visibility', 'synthetic').nodeReveal),
    'null', 'a null reads as null');
  assert.equal(A(capabilityValues(wrap('(id) => id ? 1 : 0'), 'createX', 'visibility', 'synthetic').nodeReveal),
    '(id) => id ? 1 : 0', 'and a function reads as the function, not as null');
  assert.equal(A(capabilityValues(wrap('true'), 'createX', 'visibility', 'synthetic').nodeReveal),
    'true', 'and a boolean reads as the boolean');
});


/* ================================================================== *
 * T6 — DEF-C05-01's PROPERTY, PINNED  (C05 slice E)                  *
 *                                                                    *
 * Both design documents prescribe a focus member that does not work, *
 * and they disagree with each other:                                 *
 *                                                                    *
 *   migration-table.md:79  world() { return this.nodeWorld('ados'); }*
 *   design.md:191          world: () => api.nodeWorld('ados')        *
 *                                                                    *
 * The first THROWS from the real consumer — `ch.focus.world()` binds *
 * `this` to the FOCUS object, which has no `nodeWorld` — and the     *
 * second presumes an `api` binding slice B was instructed to remove. *
 * The SHIPPED form is a third: capability members are called as       *
 * methods on the capability object, and that works for a reason      *
 * neither document states — every member body is `this`-FREE, so     *
 * the receiver a call form happens to bind is irrelevant.            *
 *                                                                    *
 * Slice C's R1 verified that property by READING all 38 members.     *
 * Slice C's repair then recorded it as still open, because a         *
 * property the whole migration rests on was guarded by nothing but   *
 * a review that had already finished (F-3). This is that guard.      *
 *                                                                    *
 * WHY THE SCAN SURFACE IS THE MEMBER'S OWN BODY, AND NOT A           *
 * TRANSITIVE CALLEE CLOSURE (D55). D55 requires a transitive callee  *
 * inventory before a claim may say "by construction" — and it does   *
 * NOT apply here, for a reason specific to `this`: a callee's `this` *
 * is bound at ITS OWN call site, not inherited from ours. When       *
 * `world()` calls `activeWorld()`, that plain call binds `undefined` *
 * inside an ES module no matter what receiver `world` was invoked    *
 * on. The ONE construct that does inherit is an arrow function, and  *
 * an arrow inside a member body is inside its TEXT and therefore     *
 * inside this scan already. So the member's own body is not a        *
 * convenient boundary — it is the exact boundary of the property.    *
 * (Measured anyway before it was argued: the transitive closure over *
 * local function declarations is 8/3/7/2 functions per chapter and   *
 * is `this`-free too. The claim does not need it.)                   *
 *                                                                    *
 * WHAT THIS DOES NOT CLOSE. It is a SOURCE assertion. It does not    *
 * execute a chapter, and S-2/F-3 stays open — see the header. It     *
 * says the shipped call form cannot mis-bind, not that the members   *
 * compute the right answers.                                         *
 * ================================================================== */

/** The literal TEXT of one capability sub-object, by the same two anchors
 *  `capabilityValues` uses — so the three readings cannot drift apart. */
function capabilityRegion(src, factory, cap, where) {
  const body = functionBody(src, factory);
  const lit = body.indexOf(`\n    ${cap}: {`);
  if (lit < 0) throw new Error(`${where}: capability '${cap}' is not an object literal`);
  const open = body.indexOf('{', lit);
  let depth = 0;
  for (let i = open; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}' && --depth === 0) return body.slice(open, i + 1);
  }
  throw new Error(`${where}: unbalanced capability literal '${cap}'`);
}

/** Resolve one member of a capability to the TEXT whose `this` bindings are
 *  that member's own.
 *
 *  Three shapes, and every one of them must yield real bytes or throw. The
 *  third was found by this check's own D58 mutant rather than by reading:
 *  `capabilityValues` reports an inline method as the literal string
 *  `'<method>'`, so a first draft of T6 scanned that placeholder for SIX of
 *  the thirty-eight members — inspire's `setHot`, all three `focus.world`s,
 *  `owned.interaction.zones` and `owned.visibility.setExcludedNodes` — and
 *  found no `this` in it because there is no `this` in the string `<method>`.
 *  The assert-zero was green and blind over 16% of its subject.
 *
 *  The shape CARDINALITIES beside it caught a second error the same minute,
 *  and it was the author's: this comment first said FIVE methods because
 *  `connect.focus.world` was missed by hand. D46's control finding an
 *  arithmetic error in the very text specifying it, for the third time in
 *  this run. The mutant is
 *  what told them apart, which is the whole of D58 in one reading. */
function memberBody(src, chapterId, factory, cap, member, value) {
  const where = `journey/chapters/${chapterId}/index.js`;
  if (value === '<method>') {
    return {
      kind: 'method',
      body: methodBodyOf(capabilityRegion(src, factory, cap, where),
        `\n      ${member}(`, `${where} ${cap}.${member}`),
    };
  }
  if (value !== '<shorthand>') return { kind: 'value', body: value };
  // WHICH DECLARATION IT RESOLVED TO IS RECORDED HERE, not re-derived from the
  // returned text. A first draft re-derived it with `/^\s*(?:const|let|var)/`
  // over the body and measured 11 functions where there are 18: `functionBody`
  // returns the text INSIDE the braces, and most of these bodies simply BEGIN
  // with a `const`. The fact is known at the moment of resolution and is
  // knowable nowhere else, so it is carried, not reconstructed.
  if (src.indexOf(`function ${member}(`) >= 0) {
    return { kind: 'reference-fn', body: functionBody(src, member) };
  }
  const decl = new RegExp(`\\b(?:const|let|var)\\s+${member}\\s*=`).exec(src);
  if (decl) return { kind: 'reference-data', body: src.slice(decl.index, src.indexOf(';', decl.index) + 1) };
  throw new Error(`${where}: shorthand member '${member}' resolves to no local declaration`);
}

/** Every capability member of every shipped chapter, as
 *  `{ site, body }` — the text whose `this` bindings are the member's own. */
function shippedMemberBodies(readFile) {
  const out = [];
  for (const [id, factory] of Object.entries(CHAPTER_FACTORY)) {
    const src = readFile(id);
    const where = `journey/chapters/${id}/index.js`;
    // Only capabilities this chapter DECLARES. `capabilityValues` throws on an
    // undeclared one, which is correct for its callers and wrong here: an
    // opt-in capability that is simply not taken up is not a defect. The
    // declared list comes from the same extractor T4 pins, so a chapter that
    // silently lost a capability shrinks the manifest below rather than
    // slipping past this loop.
    const declared = descriptorKeys(src, factory, where);
    for (const cap of CAPABILITY_KEYS) {
      if (!declared.includes(cap)) continue;
      const values = capabilityValues(src, factory, cap, where);
      if (values === null) continue;                       // a stated absence
      for (const [member, value] of Object.entries(values)) {
        const declared = value === '<method>' ? 'method' : (value === '<shorthand>' ? 'reference' : 'value');
        const resolved = memberBody(src, id, factory, cap, member, value);
        out.push({
          site: `${id}.${cap}.${member}`,
          shape: declared,
          kind: resolved.kind,
          body: resolved.body,
        });
      }
    }
  }
  return out;
}

check('T6 [static] DEF-C05-01 — every capability member body is `this`-free, so the SHIPPED call form cannot mis-bind', () => {
  const readChapter = (id) => read(`journey/chapters/${id}/index.js`);

  // D46 (2) — THE INPUTS PIN. Not the number of matches: the number of INPUTS.
  const files = Object.keys(CHAPTER_FACTORY).map((id) => `journey/chapters/${id}/index.js`);
  assert.equal(A(files.length), 5, 'exactly five chapter modules are read');
  // WHAT "A REAL MODULE" MEANS IS THE FACTORY, NOT THE BYTE COUNT (2026-08-30).
  // This read `length > 20000`, a proxy that held only while every chapter was
  // a large one. Equip's module is deliberately the smallest on the site — it
  // builds no geometry, because its subject is the specimen itself — so the
  // proxy went false on a module that is perfectly real. Assert the thing the
  // extractor actually needs: each file declares the factory this suite is
  // about to read out of it.
  assert.deepEqual(
    A(Object.keys(CHAPTER_FACTORY).map((id) => readChapter(id).includes(`export function ${CHAPTER_FACTORY[id]}(`))),
    [true, true, true, true, true],
    'and all five reads returned a module declaring its own factory, not an empty string');

  const members = shippedMemberBodies(readChapter);

  // D45 — THE CARDINALITY PIN, and it is the same 38 T4 counts by a DIFFERENT
  // route (T4 counts declared KEYS; this counts resolved BODIES). Two
  // extractors agreeing on 38 is a cross-check; one extractor asserting its
  // own output is not.
  assert.equal(A(members.length), 50, 'fifty member bodies were resolved — the loop was entered');

  // D45, one level in. `members.length === 38` is satisfied by thirty-eight
  // PLACEHOLDERS as easily as by thirty-eight bodies, which is exactly what a
  // first draft of this check did. So the three resolution shapes are pinned
  // by cardinality too, and the two that produce real bytes are pinned to have
  // produced them: a `<method>` or `<shorthand>` that survived into the scan
  // as its own placeholder text would be counted here and caught.
  const byShape = { method: 0, reference: 0, value: 0 };
  for (const m of members) byShape[m.shape]++;
  // 6/13/19 -> 11/13/26 with Equip (2026-08-30). Its three real capabilities
  // declare every member INLINE rather than as references to local function
  // declarations — the chapter is small enough that a hoisted body per member
  // would be indirection for its own sake — so it contributes five methods and
  // seven values and no new references.
  assert.deepEqual(A(byShape), { method: 11, reference: 13, value: 26 },
    'eleven inline methods, thirteen references to local declarations, twenty-six data values');
  assert.deepEqual(A(members.filter((m) => /^<(?:method|shorthand)>$/.test(m.body)).map((m) => m.site)), [],
    'no member reached the scan as an unresolved placeholder');

  // S-2/F-3, BOUNDED. The header claims the unexecuted residue is exactly
  // EIGHTEEN function bodies. That is a claim about the shipped tree, so it is
  // pinned here rather than asserted in prose: a member is function-valued if
  // it is an inline method, or a reference that resolved to a `function`
  // declaration. Everything else is data, whose declared text T4/T4d pin.
  // (Written first as "nineteen functions, nineteen values" by hand —
  // `owned.visibility.nodeIds` is a reference to a `const` ARRAY, not to a
  // function. The pin objected. That is the third such correction in this
  // check alone.)
  //
  // 18 -> 23 with Equip (2026-08-30): its five inline capability methods are
  // five more unexecuted bodies in the same residue.
  const isFunction = (m) => m.kind === 'method' || m.kind === 'reference-fn';
  assert.equal(A(members.filter(isFunction).length), 23,
    'twenty-three of the fifty members are function bodies — the F-3 residue, counted not estimated');
  assert.deepEqual(A(members.filter((m) => m.kind === 'reference-data').map((m) => m.site)),
    ['owned.visibility.nodeIds'],
    'and the one reference that is NOT a function is named, so the count above cannot drift silently');

  // D54 — THE SITE MANIFEST, not a count. Adding a member requires adding a
  // ROW. Keyed by `chapter.capability.member`, which no line edit can move.
  assert.deepEqual(A(members.map((m) => m.site)), [
    'inspire.focus.world', 'inspire.selection.setHot', 'inspire.selection.setSelected',
    'inspire.visibility.nodeIds', 'inspire.visibility.nodeWorld', 'inspire.visibility.nodeReveal',
    'inspire.visibility.nodeRadius', 'inspire.visibility.labelPolicy', 'inspire.visibility.revealDirect',
    'inspire.visibility.revealScrub', 'inspire.visibility.setExcludedNodes', 'inspire.visibility.bindCopyEase',
    'equip.focus.world', 'equip.selection.setHot', 'equip.selection.setSelected',
    'equip.visibility.nodeIds', 'equip.visibility.nodeWorld', 'equip.visibility.nodeReveal',
    'equip.visibility.nodeRadius', 'equip.visibility.labelPolicy', 'equip.visibility.revealDirect',
    'equip.visibility.revealScrub', 'equip.visibility.setExcludedNodes', 'equip.visibility.bindCopyEase',
    'connect.focus.world', 'connect.selection.setHot', 'connect.selection.setSelected',
    'connect.visibility.nodeIds', 'connect.visibility.nodeWorld', 'connect.visibility.nodeReveal',
    'connect.visibility.nodeRadius', 'connect.visibility.labelPolicy', 'connect.visibility.revealDirect',
    'connect.visibility.revealScrub', 'connect.visibility.setExcludedNodes', 'connect.visibility.bindCopyEase',
    'owned.interaction.zones', 'owned.interaction.trigger', 'owned.selection.setHot',
    'owned.selection.setSelected', 'owned.visibility.nodeIds', 'owned.visibility.nodeWorld',
    'owned.visibility.nodeReveal', 'owned.visibility.nodeRadius', 'owned.visibility.labelPolicy',
    'owned.visibility.revealDirect', 'owned.visibility.revealScrub', 'owned.visibility.setExcludedNodes',
    'owned.visibility.bindCopyEase', 'final.focus.world',
  ], 'the member manifest — owned.focus is absent because it is a STATED ABSENCE, not a member');

  // THE ASSERTION ITSELF. Comments and strings are removed first: all six
  // `this` occurrences in the four chapters' capability regions are PROSE
  // inside doc comments, and a check that matched them would be pinning prose
  // — the exact error D45 recorded `capabilityMembers` making with a bare
  // `${cap}: null` anchor.
  const thisIn = (body) => (codeEmptyStrings(body).match(/\bthis\b/g) || []).length;
  assert.deepEqual(A(members.filter((m) => thisIn(m.body) > 0).map((m) => m.site)), [],
    'no capability member reads `this` — which is why ch.focus.world() works and this.nodeWorld() would not');

  // D46 (1) / D54 — THE POSITIVE CONTROL, as a SITE SET over the same bytes
  // and the same predicate. `this` IS present in these four modules and the
  // scanner must find it: connect's inlined one-shot pulse driver is a plain
  // object whose two methods are invoked on the driver itself. It is NOT
  // reachable from any capability member (it is in no member body above), and
  // it is pinned here so that a NEW `this` anywhere in a chapter has to be
  // classified rather than absorbed.
  //
  // D64/D66 — keyed `file :: text`, NOT `file :: line :: text`. These four
  // files are contended across lanes; a line-keyed row re-reds mechanically on
  // an unrelated edit above it, and the cheapest repair to a red line number
  // is bumping the number, which is the failure mode D54 exists to prevent.
  const thisSites = files.flatMap((f) => siteSet(f, codeEmptyStrings(read(f)), (l) => /\bthis\b/.test(l), { withLine: false }));
  assert.deepEqual(A(thisSites), [
    'journey/chapters/connect/index.js :: fire() { this.active = true; this.t = 0; },',
    'journey/chapters/connect/index.js :: if (!this.active) return;',
    'journey/chapters/connect/index.js :: this.t += dt;',
    'journey/chapters/connect/index.js :: this.value = this.t / this.dur;',
    'journey/chapters/connect/index.js :: if (this.value >= 1) { this.active = false; this.value = -1; }',
  ], 'the scanner finds `this` where it really is — connect\'s pulseDriver, and nowhere else in four chapters');

  // D58 — A MUTANT OF THE SHIPPED SUBJECT. The assert-zero above is green when
  // the tree is clean AND green when the extractor has gone blind; this is the
  // reading that tells them apart. `injected` throws if its anchor is gone, so
  // a mutant that stopped applying is loud rather than absent.
  //
  // D50 — the quantity it moves: the number of member bodies containing a
  // `this` token, from 0 to 1, at one NAMED site.
  const poisoned = injected(read('journey/chapters/final/index.js'),
    'world() { return focusWorld(); },', 'world() { return this.focusWorld(); },');
  const mutated = shippedMemberBodies((id) => (id === 'final' ? poisoned : readChapter(id)));
  assert.deepEqual(A(mutated.filter((m) => thisIn(m.body) > 0).map((m) => m.site)), ['final.focus.world'],
    'one `this` planted in one shipped member is reported, at that member, by name');
  assert.equal(A(mutated.length), 50, 'and the mutant moved the `this` count only — the manifest is unchanged');
});

check('T4b [instrument] the descriptor extractor reads both shipped shapes, and FAILS LOUDLY on any third', () => {
  const wrap = (inner) => `export function createX(a) {\n  const q = 1;\n${inner}\n}\n`;

  // Shape 1 — a plain object literal, with every trap a real chapter contains:
  // a `}` inside a string, a regex with braces, a template literal, a getter,
  // a shorthand property, a method, and a nested object.
  const literal = wrap([
    '  const group = {};',
    '  return {',
    '    group,',
    '    counts: { a: 1, b: { c: 2 } },',
    '    label: "a } brace, a \' quote and a /* not-comment */",',
    '    pattern: /^\\{[a-z,]+\\}$/,',
    '    tpl: `x ${ { y: 1 }.y } }`,',
    '    setArmed(on) { if (on) { q; } },',
    '    get armed() { return true; },',
    "    'quoted-key': 3,",
    '    snap() {},',
    '    snapLanding: null,',
    '  };',
  ].join('\n'));
  assert.deepEqual(A(descriptorKeys(literal, 'createX', 'synthetic')), [
    'group', 'counts', 'label', 'pattern', 'tpl', 'setArmed', 'armed', 'quoted-key', 'snap', 'snapLanding',
  ], 'the literal form is read exactly, through strings, regexes and templates');

  // Shape 2 — a named literal returned by identifier (inspire's shape).
  const named = wrap([
    '  const api = {',
    '    group: 1,',
    '    setArmed(on) { if (!on) api.setReveal(0); },',
    '    setReveal(v) { return v; },',
    '  };',
    '  return api;',
  ].join('\n'));
  assert.deepEqual(A(descriptorKeys(named, 'createX', 'synthetic')), ['group', 'setArmed', 'setReveal'],
    'a call THROUGH the identifier is a read, not a mutation, and is accepted');

  // Shape 3 and beyond — every one of these must THROW, not be skipped.
  const unrecognised = [
    ['spread', wrap('  const base = {};\n  return { ...base, group: 1 };'), /spread element/],
    ['computed key', wrap('  const k = "g";\n  return { [k]: 1, group: 2 };'), /computed key/],
    ['conditional', wrap('  const a = {}, b = {};\n  return q ? a : b;'), /unrecognised descriptor shape/],
    ['call expression', wrap('  return buildDescriptor(q);'), /unrecognised descriptor shape/],
    ['identifier with no literal', wrap('  let api;\n  api = { group: 1 };\n  return api;'), /no 'const api = \{' literal exists/],
  ];
  for (const [label, src, pattern] of unrecognised) {
    const probe = F(() => src, () => literal);
    assert.throws(() => descriptorKeys(probe, 'createX', 'synthetic'), pattern,
      `an unrecognised shape (${label}) must fail loudly, never be silently skipped`);
  }

  // The capability member reader, exercised in both directions on a SYNTHETIC
  // source containing a foreign member (`setWarm`) that no real chapter has.
  // (An earlier revision of this comment said "T4's own loop over it is empty
  // today, so this is where it earns its keep." That stopped being true when
  // slice B moved T4's pin, and C05-B R1 MINOR-NIT 3 flagged it: T4 now runs
  // this reader over eleven real declarations and pins their members exactly.
  // What this fixture still earns is the FOREIGN-member direction, which the
  // shipped tree has no instance of — a positive control for a rejection T4's
  // real subjects can never exercise.)
  const withCap = wrap([
    '  return {',
    '    group: 1,',
    '    selection: { setHot: (id, on) => id && on, setSelected: null },',
    '    visibility: { nodeIds: ["a"], setWarm: 1 },',
    '  };',
  ].join('\n'));
  assert.deepEqual(A(capabilityMembers(withCap, 'createX', 'selection', 'synthetic')), ['setHot', 'setSelected']);
  const foreign = capabilityMembers(withCap, 'createX', F(() => 'visibility', () => 'selection'), 'synthetic')
    .filter((m) => !CAPABILITY_MEMBERS.visibility.includes(m));
  assert.deepEqual(A(foreign), ['setWarm'], 'a foreign capability member is detected, not merely tolerated');
});

check('T4c [instrument] the identifier-shape scan rejects EVERY way of writing a key onto the returned object', () => {
  // R1 found five paths the first (blacklist) version of this scan missed
  // SILENTLY. Slice B rewrites inspire — the one chapter using this shape — so
  // a silent miss there would let T4 pass while a core key was added by a route
  // the scan cannot see. Each path below is constructed as a fixture and must
  // now throw. The scan is a whitelist of provable reads, so this list is
  // illustrative of the class, not the definition of it.
  const wrap = (inner) => `export function createX(q) {\n${inner}\n}\n`;
  const clean = wrap('  const api = { group: 1 };\n  return api;');

  const writes = [
    // — the four the first version already caught, re-proved against the new scan
    ['plain member assignment', '  api.snap = () => {};', /has its member 'snap' written by `=`/],
    ['computed member assignment', '  api["snap"] = 1;', /has a computed member written by `=`/],
    ['Object.assign', '  Object.assign(api, { snap: 1 });', /escapes this scan's reach/],
    ['delete', '  delete api.group;', /is the operand of `delete`/],
    // — R1's five
    ['logical-nullish assignment (??=)', '  api.snap ??= () => {};', /has its member 'snap' written by `\?\?=`/],
    ['logical-or assignment (||=)', '  api.snap ||= () => {};', /has its member 'snap' written by `\|\|=`/],
    ['Reflect.set', "  Reflect.set(api, 'snap', 1);", /escapes this scan's reach/],
    ['aliased parameter', '  function mutate(o) { o.snap = 1; }\n  mutate(api);', /escapes this scan's reach/],
    ['alias variable', '  const alias = api;\n  alias.snap = 1;', /escapes this scan's reach/],
    // — neighbours of the same class, closed by the same inversion
    ['logical-and assignment (&&=)', '  api.snap &&= 1;', /has its member 'snap' written by `&&=/],
    ['postfix increment', '  api.counts++;', /has its member 'counts' written by `\+\+`/],
    ['prefix increment', '  ++api.counts;', /is the operand of `\+\+`/],
    ['spread out of the binding', '  const copy = { ...api };', /escapes this scan's reach/],
    ['defineProperty', "  Object.defineProperty(api, 'snap', { value: 1 });", /escapes this scan's reach/],
    ['re-declared', '  const api2 = api;\n  const api = { group: 2 };', /escapes this scan's reach|is declared/],
  ];
  for (const [label, mutation, pattern] of writes) {
    const src = F(() => wrap(`  const api = { group: 1 };\n${mutation}\n  return api;`), () => clean);
    assert.throws(() => descriptorKeys(src, 'createX', 'synthetic'), pattern,
      `a key written by '${label}' must fail loudly, never be silently accepted`);
  }

  // THE OTHER DIRECTION, which matters just as much: a scan that starts
  // rejecting legitimate reads is worse than the gap it closed. Inspire really
  // does call THROUGH its own identifier — api.setReveal(...) twice and
  // api.setLeanScale(1) once — and those are reads.
  const reads = [
    ['method call through the identifier', '  const api = {\n    group: 1,\n    setArmed(on) { if (!on) api.setReveal(0, 0, 0, 0); },\n    setReveal(a, b, c, d) { return a + b + c + d; },\n  };\n  return api;', ['group', 'setArmed', 'setReveal']],
    ['plain property read', '  const api = { group: 1, transform: 2 };\n  const t = api.transform;\n  q(t);\n  return api;', ['group', 'transform']],
    ['deeper chain read', '  const api = { group: 1, counts: { n: 2 } };\n  q(api.counts.n);\n  return api;', ['group', 'counts']],
    ['optional chaining read', '  const api = { group: 1, pacing: null };\n  q(api?.pacing);\n  return api;', ['group', 'pacing']],
    ['a homonym property elsewhere', '  const api = { group: 1 };\n  const other = { api: 2 };\n  other.api = 3;\n  return api;', ['group']],
  ];
  for (const [label, src, expected] of reads) {
    const probe = F(() => wrap(src), () => wrap(src.replace('return api;', 'api.injected = 1;\n  return api;')));
    assert.deepEqual(A(descriptorKeys(probe, 'createX', 'synthetic')), expected,
      `a read (${label}) must stay a read — rejecting it would be worse than the gap`);
  }

  // THE REAL-FILE CASE IS RETIRED, AND THIS IS THE JUSTIFICATION.
  //
  // WAS (pre-slice-B): this block read the shipped
  // journey/chapters/inspire/index.js, asserted that its three calls through
  // `api` and its `return api;` were accepted, and asserted that the same
  // source with one `api.snapLanding = …` injected was rejected. Inspire was
  // the only chapter using the identifier shape, so it was the only real
  // subject the scan ever had.
  //
  // Slice B converted inspire to the plain object-literal form — §7a's own
  // recommended resolution — so NO shipped chapter returns a named identifier
  // any more and `assertOnlyRead` is unreachable from every real descriptor.
  // The subject ceased to exist; it did not merely move.
  //
  // It is NOT replaced by a synthetic module dressed as a real-file case. That
  // would be write-fixture #1 above wearing a different hat, and it would read
  // to a later gate as coverage of a chapter that is no longer scanned. The
  // fifteen write fixtures and five read fixtures above stay exactly as they
  // are, so THE SCAN ITSELF KEEPS ITS FULL COVERAGE — a chapter that
  // reintroduces the shape gets the same treatment inspire got.
  //
  // What replaces it is a ratchet on the fact that justified the retirement.
  // For the real-file scan to be NEEDED again, one of the four chapters would
  // have to go back to `const api = { … }; … return api;`. That is exactly
  // what this fails on, by name, so the day it happens the author is told to
  // reinstate a real-file scan for that chapter rather than discovering years
  // later that nothing was watching.
  const shapes = {};
  for (const [id, factory] of Object.entries(CHAPTER_FACTORY)) {
    const src = F(
      () => read(`journey/chapters/${id}/index.js`),
      () => `export function ${factory}(q) {\n  const api = { group: q };\n  return api;\n}\n`,
    );
    const body = functionBody(src, factory);
    const at = body.lastIndexOf('\n  return ');
    if (at < 0) throw new Error(`${id}: anchors no longer match source — no top-level return in ${factory}`);
    let i = at + '\n  return '.length;
    while (i < body.length && /\s/.test(body[i])) i++;
    shapes[id] = body[i] === '{' ? 'object-literal' : 'returned-identifier';
  }
  assert.deepEqual(A(shapes), {
    inspire: 'object-literal', equip: 'object-literal', connect: 'object-literal',
    owned: 'object-literal', final: 'object-literal',
  }, 'no shipped chapter uses the identifier shape, so assertOnlyRead is unreachable from every REAL descriptor — if this fails, restore a real-file scan for the chapter named');
});

/* ================================================================== *
 * 7. T5 — the two-contract statement                                 *
 * ================================================================== */

check('T5 [static] chapter-contract.js states that the descriptor is NOT the whole chapter contract', () => {
  const raw = read('journey/chapter-contract.js');
  const flat = raw.replace(/^\s*\/\/ ?/gm, '').replace(/\s+/g, ' ');
  if (flat === raw) throw new Error('anchors no longer match source: chapter-contract.js has no line-comment doc block');

  const sentence = 'THE DESCRIPTOR IS NOT THE WHOLE CHAPTER CONTRACT.';
  const source = F(() => flat, () => flat.split(sentence).join(''));
  assert.equal(A(source.includes(sentence)), true,
    'the sentence T5 pins must survive every edit to this module');
  for (const token of ['duck-typed', 'chapter-entry.js', 'frame-application.js', 'entry/drive lifecycle']) {
    assert.equal(A(source.includes(token)), true,
      `the statement must name ${token}: a later contributor "tidying" those typeof guards would delete the program's only executed frame-order evidence`);
  }
});

/* ================================================================== *
 * 7. LPS1 — the suite's scan of ITSELF (D44 + D46)                   *
 *                                                                    *
 * D44: a --prove-failure harness works by corrupting the ACTUAL of a *
 * comparison. An assertion whose actual is a bare literal has no     *
 * actual to corrupt, so the sweep is structurally blind to it and    *
 * reports the check as fully proved. Every suite shipping a          *
 * --prove-failure mode must therefore also run a comment-aware       *
 * literal-predicate scan in the SAME invocation.                     *
 *                                                                    *
 * S-2/F-1 measured that all three shipped implementations of that    *
 * scan have never matched anything and have no positive control — an *
 * assert-zero that cannot distinguish "clean" from "never read the   *
 * file". This one carries both halves of D46's remedy: an inputs pin *
 * and a positive control, the latter run over the REAL source with a *
 * real assertion rewritten into the shape being hunted.              *
 *                                                                    *
 * LPS1 also scans for the shape C05-B R1 MAJOR-1 found from the      *
 * other side: a comparison whose actual is NOT wrapped in A()/F(),   *
 * which the sweep cannot enumerate even though the check runs.       *
 * ================================================================== */

/** Comments stripped AND string literals emptied.
 *
 *  This is the OPPOSITE choice to T1/T2's `codeKeepStrings`, deliberately, and
 *  the reason is that the two scans hunt opposite things. T1/T2 hunt chapter-id
 *  string literals, so emptying strings would make them pass unconditionally
 *  forever (design.md §9.3's MAJOR-3 trap). LPS1 hunts an assertion whose
 *  ACTUAL is a bare literal — a thing that cannot exist inside a string — so
 *  keeping strings would make LPS1 match its own positive-control replacement
 *  text and fail on prose. Both scans are guarded against their own trap: T1
 *  proves a string-emptying scan reports zero unconditionally, and LPS1's
 *  positive controls below prove this one still finds a real hit. */
function codeEmptyStrings(src) {
  // Built on skipLiteral, NOT on a chain of regex replacements. A regex-based
  // version was written first and was wrong on this very file: the source
  // contains regex literals such as /'(?:\\.|[^'\\])*'/g, whose apostrophes a
  // regex stripper reads as the start of a string and then runs to the next
  // one, swallowing real code — including three `check(` registrations, which
  // the inputs pin below caught. skipLiteral consumes strings, templates,
  // regexes and comments whole, so nothing inside one is ever seen as code.
  //
  // Alignment-preserving: every replacement keeps the newlines it consumed, so
  // a multi-line template or block comment cannot merge two statements onto
  // one line.
  let out = '';
  let prev = ' ';
  for (let i = 0; i < src.length; i++) {
    const after = skipLiteral(src, i, prev);
    if (after === i) {
      out += src[i];
      if (!/\s/.test(src[i])) prev = src[i];
      continue;
    }
    const lit = src.slice(i, after);
    const quote = (lit[0] === '"' || lit[0] === "'" || lit[0] === '`') ? lit[0] : '';
    out += (quote ? quote + quote : ' ') + lit.replace(/[^\n]/g, '');
    if (lit[0] !== '/' || quote) prev = 'x';       // a comment leaves prev alone
    else if (lit[1] !== '/' && lit[1] !== '*') prev = 'x';   // a regex is a value
    i = after - 1;
  }
  return out;
}

/** Assertions whose FIRST argument (the actual) is a bare literal. */
const LITERAL_ACTUAL_RE = new RegExp(
  String.raw`\bassert\.(?:ok|equal|strictEqual|notEqual|notStrictEqual|deepEqual|deepStrictEqual)\(\s*`
  + String.raw`(?:true|false|null|undefined|-?\d+(?:\.\d+)?|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*[,)]`,
  'g',
);

const hitsOf = (src, re) => (src.match(re) || []).length;

/** Every `assert.<fn>(` site's first argument, by paren matching. `throws` and
 *  `doesNotThrow` are excluded: their first argument is a thunk, and their
 *  failability comes from the F() fixture they close over, not from an actual. */
function assertActuals(src) {
  const out = [];
  const re = /\bassert\.([A-Za-z]+)\(/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] === 'throws' || m[1] === 'doesNotThrow') continue;
    let depth = 1;
    let i = re.lastIndex;
    let start = i;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '(' || src[i] === '[' || src[i] === '{') depth++;
      else if (src[i] === ')' || src[i] === ']' || src[i] === '}') depth--;
      else if (src[i] === ',' && depth === 1) break;
    }
    out.push({ fn: m[1], actual: src.slice(start, i).trim() });
  }
  return out;
}

/* ---- F-4: THE ONE SPELLING THAT DEFEATED BOTH SCANS AT ONCE ------------
   Both scans above key off a LITERAL `assert.` member expression —
   `LITERAL_ACTUAL_RE` in its source text, `assertActuals` in its `/\bassert\.
   ([A-Za-z]+)\(/`. R1 demonstrated, rather than argued, that this is one blind
   spot and not two:

       const eq = assert.equal;
       const dq = assert.deepEqual;
       check('LPS1 …', () => {
         eq(true, true);
         dq([1, 2], [1, 2]);

   Two genuine literal tautologies, planted INSIDE THE CHECK THAT FORBIDS THEM,
   and the suite reported `PASS, 165/165, clean scan` — every pinned number
   held, because the tautologies were ADDED through an unrecognised binding
   rather than substituted for a recognised one.

   Graded MINOR by R1, with its reasoning left on the record so a later gate
   could overrule it. It is closed here rather than left as debt because D53
   grades an instrument's defect over the SERVICE LIFE of the guarantee, and
   this scan guards every future slice of this file — two of which are already
   scheduled to open it.

   THE REPAIR IS NOT A WIDER REGEX. It is to stop hard-coding the callee set:
   census the file for every binding that captures `assert` or one of its
   members, then hunt literal actuals under THOSE names as well. A new spelling
   now extends the scan instead of escaping it. The receiver-optional prefix
   `(?:[A-Za-z_$][\w$]*\.)?` is QA-03's, adopted rather than re-derived — the
   same construction LPS2 carries, applied to the assert family instead of to
   `check(`. */
const ASSERT_FAMILY = ['ok', 'equal', 'strictEqual', 'notEqual', 'notStrictEqual',
  'deepEqual', 'deepStrictEqual'];

/** Every local name under which an `assert` comparison can be reached.
 *  `code` has strings emptied (so a docstring quoting the exploit is not a
 *  hit); `withStrings` keeps them, because the module-specifier form is only
 *  recognisable by its string. */
function assertAliases(code, withStrings) {
  const out = [];
  const push = (raw) => {
    const name = raw.includes(':') ? raw.split(':').pop() : raw;
    const t = name.replace(/\bas\b/, ' ').trim().split(/\s+/).pop();
    if (t && t !== 'assert' && /^[A-Za-z_$][\w$]*$/.test(t)) out.push(t);
  };
  //   const eq = assert.equal;   |   const a = assert;
  for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*assert\b(?:\s*\.\s*[A-Za-z_$][\w$]*)?/g)) push(m[1]);
  //   const { equal, deepEqual: dq } = assert;
  for (const m of code.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*assert\b/g)) m[1].split(',').forEach(push);
  //   import { equal as eq } from 'node:assert/strict';
  for (const m of withStrings.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*['"]node:assert[^'"]*['"]/g)) m[1].split(',').forEach(push);
  return [...new Set(out)].sort();
}

/** QA-03's receiver-agnostic call prefix, applied to the assert family plus
 *  whatever `assertAliases` found, hunting a BARE LITERAL in the actual slot. */
function literalActualRe(callees) {
  return new RegExp(
    String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\s*\.\s*)?(?:${callees.join('|')})\(\s*`
    + String.raw`(?:true|false|null|undefined|-?\d+(?:\.\d+)?|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*[,)]`,
    'g',
  );
}

check('LPS1 [instrument] this suite contains no assertion the failability sweep cannot see', () => {
  // NEGATIVE CONTROL, in situ and on real bytes: the next line writes the
  // hunted shape inside a COMMENT — assert.ok(true) — and both scans below
  // must still report zero over this file. codeKeepStrings strips comments
  // before either regex runs, so a docstring naming the pattern (including
  // this one) is not a false positive. If that ever stopped being true, the
  // count assertions here would fail rather than quietly over-report.
  const files = ['tools/test-chapter-contract.mjs'];
  const raw = read(files[0]);
  const src = codeEmptyStrings(raw);

  // D46 (1) — INPUTS PIN. One file, read live, non-empty, and the token that
  // proves it is THIS suite rather than an empty or stale read.
  assert.equal(A(files.length), 1, 'exactly one file is scanned');
  /* 25 -> 26 by DIET-02, 2026-08-26: I11 joins, carrying tools/test-c06-registry
     .mjs's ONE surviving property (the factory invariant, was C06-B4) as that
     suite retires. The manifest row below moves in the same change — a bumped
     number alone could not distinguish a check arriving from the scan going
     blind, which is D54's whole objection to counts. */
  assert.equal(A(countOf(src, '\ncheck(')), 26, 'twenty-six checks are registered in the bytes that scanned clean');

  /* D54 — THE REGISTRY AS A MANIFEST, NOT A COUNT. This read
     `CHECKS.length === 21` beside the source count above. Both numbers are
     right, and D54's objection is that when they go red — which they do on
     any edit to this suite — the cheapest repair is to bump them, and a
     bumped number cannot distinguish "a check was added" from "the scan went
     blind and something else drifted to the same total". The ID manifest
     cannot be repaired that way: adding a check means adding a ROW, and a
     registry that failed to populate yields the EMPTY LIST.

     Slice D moved BOTH of the numbers this suite pins (the assert-site count
     below went 101 -> 111) and left the manifest to be extended by name only
     where a name changed, which is the diff a reviewer can actually read. */
  assert.deepEqual(A(CHECKS.map((c) => c.name.split(' ')[0])), [
    'I1', 'I1b', 'I7', 'I8', 'I9', 'I9b', 'I2', 'I3', 'I4', 'I5', 'I6', 'I10',
    // DIET-02, 2026-08-26 — ONE ROW, inherited not invented: C06-B4's factory
    // invariant, restated over the same shipped bytes as tools/test-c06-registry
    // .mjs retires. It registers immediately after I10 and before MUT.
    'I11', 'MUT',
    // Slice E adds two ROWS, which is the manifest working: `MUTD` (D58 over
    // slice D's three ui.js sites) and `T6` (DEF-C05-01's no-`this` property).
    // Multi-letter prefixes per D46's namespace rule — the single-letter space
    // is exhausted and a collision re-baselines the wrong pin silently.
    'MUTD',
    'T1', 'T2', 'T3', 'T4', 'T4d', 'T6', 'T4b', 'T4c', 'T5', 'LPS1', 'LPS2',
  ], 'the runtime registry, by id and in registration order — cross-checked against the source count, not derived from it');

  // (a) D44's shape: a literal in the actual position.
  assert.equal(A(hitsOf(src, LITERAL_ACTUAL_RE)), 0, 'no assertion compares against a bare literal actual');

  // D46 (2) / D54 — POSITIVE CONTROL, on the REAL source, not a hand-built
  // fixture: rewrite one real assertion into the hunted shape and require the
  // scan to name exactly that SITE. `injected` throws if the anchor stops
  // matching, so this control cannot go hollow the way F-1's did — and pinning
  // the site rather than the count `1` means a second, unrelated literal
  // actual appearing in this file cannot be absorbed by bumping a number.
  // The anchor is UNIQUE to this check — `assert.equal(A(files.length), 1,`
  // now occurs three times in this file (T2, T3, LPS1) and `injected` replaces
  // only the first, so using it would poison T2's line and pin a site in
  // another check's body. This one poisons the very assertion under test.
  // ASSEMBLED, not written whole — QA-03's `'ch' + 'eck'` trick, applied for
  // the same reason: an anchor written verbatim occurs TWICE in these bytes
  // (its own definition and its target), so the uniqueness assertion below
  // would read 2 and the poison would land on the wrong one. A deliberately
  // wrong assembly reds this line rather than silently mis-anchoring.
  const anchor = `assert.equal(A(hits${'Of'}(src, LITERAL_ACTUAL_RE)), 0,`;
  assert.equal(A(countOf(raw, anchor)), 1, 'the poison anchor must be unambiguous');
  const poisoned = codeEmptyStrings(injected(raw, anchor, 'assert.equal(0, 0,'));
  /* D54, REFINED BY THE ONE CASE IT DOES NOT FIT. The site key is
     `file :: line :: text` wherever a control reads a foreign file whose LINE
     NUMBERS ARE STABLE for the life of the pin: there, a moved line means
     someone edited the subject, which is exactly the event the key exists to
     surface. (D93 corrected the "foreign" framing this paragraph first used:
     stability is the test, not ownership, and by it T2's and T3's subjects
     both fail — journey/ui.js and journey/journey.js are rewritten by later
     orders, so both are keyed `file :: text` and neither is an exception to
     what follows.) It is `file :: text` here for the stronger reason, that
     this control reads the file it lives in — so any edit ANYWHERE above it,
     this paragraph included, would move the number. A line key on a self-scan turns
     every unrelated edit into a red control whose cheapest repair is bumping
     the number, which regenerates D54's own failure mode inside D54's remedy.
     The set property is unchanged: a blind scan still yields [], and adding a
     literal actual still requires adding a row. */
  assert.deepEqual(A(siteSet(files[0], poisoned, (l) => LITERAL_ACTUAL_RE.test(l), { withLine: false })), [
    'tools/test-chapter-contract.mjs :: assert.equal(0, 0, \'\');',
  ], 'the scan finds a literal actual, and names it, when one exists');
  // The regexes carry /g, so their lastIndex survives a .test(). Reset it, or
  // the next scan starts mid-file and under-reports — an assert-zero's exact
  // failure mode.
  LITERAL_ACTUAL_RE.lastIndex = 0;

  // (b) C05-B R1 MAJOR-1's shape: a comparison whose actual is not wrapped, so
  // --prove-failure never enumerates it. Pinned as an EXACT VALUE rather than
  // an assert-zero — one site is legitimately unwrapped and is named here.
  const actuals = assertActuals(src);
  assert.equal(A(actuals.length), 181, 'every assert site was located — cardinality pinned (D45; 180 before Equip promoted T6\'s length proxy into a factory-declaration check, which is ONE assertion replaced by ONE and one new comparison; 178 before the Inspire exit contract added two explicit physical-slot assertions; 175 before DIET-02 restated C06-B4 as I11 — three sites: the slice anchor\'s uniqueness refusal, its rotted-tail refusal, and the two-registry claim itself; 101 before slice D, 122 before the C05C R1 repairs, 138 before slice E, 166 before QA-05 added five rows, 171 before PIN-01 added T3\'s cardinality and distinctness pins, 173 before the M14 onHot pin was converted from a three-line text site set to a parse-based statement-position census, which is ONE assertion replaced by TWO — the census and its non-empty-corpus control; 174 before U04 separated T2\'s delete-direction control from its claim, adding the fixture\'s own non-vacuity assertion)');
  const unwrapped = actuals.filter((a) => !a.actual.includes('A(') && !a.actual.includes('F('));
  assert.deepEqual(A(unwrapped.map((a) => a.actual)), ['runtimeIds'],
    'the one unwrapped actual is I9\'s, and it was wrapped by A() on the line that built it');

  // POSITIVE CONTROL for (b): unwrapping a real assertion must move that list.
  const stripped = codeEmptyStrings(injected(raw, 'assert.deepEqual(A(declaredNull),', 'assert.deepEqual(declaredNull,'));
  assert.deepEqual(A(assertActuals(stripped)
    .filter((a) => !a.actual.includes('A(') && !a.actual.includes('F('))
    .map((a) => a.actual)), ['runtimeIds', 'declaredNull'],
  'an unwrapped actual is detected where one exists');

  /* ---- (c) F-4 — the scans above derive their callee set from the FILE ---
     Everything above this line reads a literal `assert.`. R1 planted two real
     tautologies behind `const eq = assert.equal` and got a clean scan, a clean
     165/165 and a green suite. The census below is what makes a new spelling
     extend the hunt instead of escaping it. */
  const aliases = assertAliases(src, codeKeepStrings(raw));
  assert.deepEqual(A(aliases), [],
    'this suite reaches assert through the single name `assert`, at every one of its sites');

  const wideHits = (text, names) => {
    const re = literalActualRe(names);
    return siteSet(files[0], text, (line) => { re.lastIndex = 0; return re.test(line); });
  };
  assert.deepEqual(A(wideHits(src, [...ASSERT_FAMILY, ...aliases])), [],
    'no literal actual under ANY spelling — receiver-agnostic, and over the aliases the file actually declares');

  /* D46 (2) — POSITIVE CONTROL, and it is R1's exploit VERBATIM rather than a
     fixture of my own devising, planted where R1 planted it: inside the check
     that forbids the shape. Both halves must fire — the census must NAME the
     two aliases, and the widened scan must find BOTH tautologies at their
     lines. A scan that had gone blind yields two empty lists here, which is
     unmistakable and cannot be repaired by editing a number (D54).

     The exploit lives in a string literal, so `codeEmptyStrings` erases it
     from every scan of this file's own bytes — which is why the census over
     `src` above still legitimately reads []. */
  const EXPLOIT = '\n  const eq = assert.equal;\n  const dq = assert.deepEqual;\n  eq(true, true);\n  dq(1, 1);';
  const exploited = injected(raw, '  const badLog = [];', `  const badLog = [];${EXPLOIT}`);
  assert.deepEqual(A(assertAliases(codeEmptyStrings(exploited), codeKeepStrings(exploited))), ['dq', 'eq'],
    'an aliased assert binding is named by the census — the shape that defeated BOTH earlier scans at once');
  assert.deepEqual(A(wideHits(codeEmptyStrings(exploited), [...ASSERT_FAMILY, 'dq', 'eq'])
    .map((s) => s.replace(/ :: \d+ :: /, ' :: '))), [
    'tools/test-chapter-contract.mjs :: eq(true, true);',
    'tools/test-chapter-contract.mjs :: dq(1, 1);',
  ], 'and both planted tautologies are found, under the aliases the census supplied');

  // NEGATIVE CONTROL, the direction that matters just as much: introducing the
  // ALIAS alone, with no tautology behind it, must not manufacture a hit. A
  // scan that reddens on a legitimate destructuring is worse than the gap it
  // closed, because the cheap repair for it is deletion.
  const aliasOnly = injected(raw, '  const badLog = [];', '  const badLog = [];\n  const eq = assert.equal;\n  eq(A(1), 1);');
  assert.deepEqual(A(wideHits(codeEmptyStrings(aliasOnly), [...ASSERT_FAMILY, 'eq'])), [],
    'an alias with a WRAPPED actual behind it is not a hit — the scan hunts tautologies, not spellings');
});

/* ================================================================== *
 * 7b. LPS2 — QA-03's WIDENED literal-predicate scan, adopted whole   *
 *                                                                    *
 * D44 requires the comment-aware literal-predicate scan on EVERY     *
 * invocation, and the ledger's QA-03 entry requires the widened      *
 * receiver-agnostic pattern to be ADOPTED rather than re-derived —   *
 * because D44's originally shipped regex missed six unfalsifiable    *
 * shapes, all of which the pattern below catches: an escaped quote   *
 * in the label, a bare `check(` with no receiver, `, 1)` / `, 0)`,   *
 * `, !0)` / `, !1)`, a string-literal predicate, and the identity    *
 * family `x === x` / `x !== x` / `a.b.c === a.b.c`.                  *
 *                                                                    *
 * WHY BOTH LPS1 AND LPS2. They hunt DIFFERENT shapes and neither     *
 * subsumes the other. LPS1 reads the ACTUAL of an `assert.<fn>(`     *
 * comparison; LPS2 reads the PREDICATE of a `check(label, …)` call.  *
 * A suite whose harness is `check(label, predicate)` — which several *
 * in this tree are — is invisible to LPS1 entirely. This suite's own *
 * harness is `check(label, thunk)`, so LPS2 legitimately reports     *
 * zero here; the fixture table below is what stops that zero from    *
 * being F-1's "a scan that has never matched anything".              *
 *                                                                    *
 * The table assembles its token as 'ch' + 'eck' so it cannot match   *
 * itself, and a deliberately wrong assembly reds its own control.    *
 * ================================================================== */

/** Verbatim from
 *  docs/code-health/evidence/2026-08-21-elegance-run-01/qa-03/regex-scanner-proto.mjs.
 *  Copied rather than imported: that file lives in an append-only evidence
 *  directory, and D52 is explicit that a gated instrument must not depend on
 *  one. Copied rather than re-derived, because re-deriving it is exactly what
 *  produced the six missed shapes. */
/* D73 — the four comment delimiters, assembled. Nothing below writes one
 * literally, so the fixtures that use them cannot be clean by malformation. */
const SLASHES = '/' + '/';
const OPENER = '/' + '*';
const CLOSER = '*' + '/';
const SLASHES_RE = '\\' + '/' + '\\' + '/';
const OPENER_RE = '\\' + '/' + '\\' + '*';
const CLOSER_RE = '\\' + '*' + '\\' + '/';

function stripCommentsQA(src) {
  // S-3 / D67, QA-05 — CONVERTED. QA-03's regex pair used to live here
  // verbatim, and the paragraph above LPS2 records what slice D found by
  // running it: the glob in this file's own header opened a phantom block
  // comment, blanking 48 lines, then 1555-1658 including a check(
  // registration, and after slice E re-keyed things, the whole import
  // block. 4248 non-whitespace characters across 106 lines, measured at
  // the QA-05 fence. The name is kept so the two readings below stay
  // distinguishable, but it is now the shared stripper.
  return stripComments(src);
}
const QA_CALL = String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\.)?check\(\s*(['"` + '`' + String.raw`])(?:\\[\s\S]|(?!\1)[\s\S])*?\1\s*,\s*(?:\(\s*\)\s*=>\s*)?`;
const QA_SITE_RE = () => new RegExp(String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\.)?check\(`, 'g');
const QA_CONST_RE = () => new RegExp(QA_CALL + String.raw`(true|false|!\s*[01]|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*[,)]`, 'g');
const QA_IDENT_RE = () => new RegExp(QA_CALL + String.raw`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:===|!==|==|!=)\s*\2\s*[,)]`, 'g');

function qaScan(text, strip = stripCommentsQA) {
  const stripped = strip(text);
  const lines = text.split('\n');
  const lineOf = (i) => stripped.slice(0, i).split('\n').length;
  let sites = 0; { const r = QA_SITE_RE(); while (r.exec(stripped)) sites++; }
  const hits = [];
  for (const [shape, re] of [['constant', QA_CONST_RE()], ['identity', QA_IDENT_RE()]]) {
    let m; while ((m = re.exec(stripped))) {
      const ln = lineOf(m.index + m[0].length - 1);
      hits.push({ line: ln, shape, predicate: m[2], text: (lines[ln - 1] || '').trim() });
    }
  }
  hits.sort((a, b) => a.line - b.line);
  return { sites, hits, lines: lines.length };
}

/** QA-03's 27-row fixture table, verbatim, behind a factory so that the
 *  --prove-failure sweep can corrupt WHICH TABLE IS SUPPLIED rather than a
 *  value inside one (D44's chooser move, applied to cardinality). */
function qaFixtures(K) {
  return [
    ['plain single-quoted', `  L.${K}('a thing', true);`, 1],
    ['double-quoted', `  L.${K}("a thing", true);`, 1],
    ['template label', '  L.' + K + '(`a thing`, false);', 1],
    ['multiline args', `  L.${K}(\n    'a thing',\n    true,\n  );`, 1],
    ['escaped quote in label', `  L.${K}('it\\'s a thing', true);`, 1],
    ['apostrophe via double q', `  L.${K}("it's a thing", true);`, 1],
    ['bare check() (no L.)', `  ${K}('a thing', true);`, 1],
    ['arrow-wrapped bare', `  ${K}('a thing', () => true);`, 1],
    ['arrow-wrapped false', `  ${K}('a thing', () => false);`, 1],
    ['truthy non-literal 1', `  L.${K}('a thing', 1);`, 1],
    ['falsy literal 0', `  L.${K}('a thing', 0);`, 1],
    ['negated zero', `  L.${K}('a thing', !0);`, 1],
    ['negated one', `  L.${K}('a thing', !1);`, 1],
    ['string literal predicate', `  L.${K}('a thing', 'yes');`, 1],
    ['identity always-true', `  L.${K}('a thing', x === x);`, 1],
    ['identity !== always-false', `  L.${K}('a thing', x !== x);`, 1],
    ['member identity', `  L.${K}('a thing', a.b.c === a.b.c);`, 1],
    ['NEG: real predicate', `  L.${K}('a thing', n === 3);`, 0],
    ['NEG: x === true', `  L.${K}('a thing', x === true);`, 0],
    ['NEG: negation of var', `  L.${K}('a thing', !x);`, 0],
    ['NEG: distinct idents', `  L.${K}('a thing', a === b);`, 0],
    ['NEG: call result', `  L.${K}('a thing', f(1));`, 0],
    ['NEG: length compare', `  L.${K}('a thing', xs.length === 3);`, 0],
    ['NEG: literal in comment', `  // L.${K}('a thing', true);`, 0],
    ['NEG: literal in block cmt', `  /* L.${K}('a thing', true); */`, 0],
    ['NEG: recheck( lookalike', `  re${K}('a thing', true);`, 0],
    ['NEG: assert.ok literal', `  assert.ok(true, 'a thing');`, 0],
  ];
}

check('LPS2 [instrument] QA-03\'s widened check-predicate scan, its 27 fixtures, and this file', () => {
  /* THE SELF-MATCH TRICK, and why it is not decoration. Written whole, the
     token above would appear 27 times in this file's bytes and the scan of
     this file would report 17 hits in its own fixture table. Assembled, it
     appears zero times. The WRONG assembly is supplied by the sweep, and the
     row below is what turns that into a red line rather than a silent
     under-count. */
  const K = F(() => 'ch' + 'eck', () => 'ch' + 'ecked');
  const fixtures = qaFixtures(K);
  assert.equal(A(fixtures.length), 27, 'D45 — the fixture table really has 27 rows');

  const wrong = [];
  const matched = [];
  for (const [name, src, want] of fixtures) {
    const got = qaScan(src).hits.length;
    if (got !== want) wrong.push(`${name}: want ${want} got ${got}`);
    if (got > 0) matched.push(name);
  }
  assert.deepEqual(A(wrong), [], 'every fixture row behaves as QA-03 measured it');

  /* D54 — THE POSITIVE CONTROL AS A SET, not "17". Seventeen rows MUST match
     and ten MUST NOT; pinning the number lets a pattern that stopped catching
     `!0` and started catching `!x` keep reporting 17. Pinning the names says
     which shapes are guarded, and a pattern that has gone inert yields []. */
  assert.deepEqual(A(matched), [
    'plain single-quoted', 'double-quoted', 'template label', 'multiline args',
    'escaped quote in label', 'apostrophe via double q', 'bare check() (no L.)',
    'arrow-wrapped bare', 'arrow-wrapped false', 'truthy non-literal 1',
    'falsy literal 0', 'negated zero', 'negated one', 'string literal predicate',
    'identity always-true', 'identity !== always-false', 'member identity',
  ], 'the seventeen shapes this pattern is responsible for, by name');

  /* THE SCAN OVER THIS FILE, AND THE ONE PART OF QA-03 THAT IS NOT ADOPTED.
     QA-03's PATTERN is adopted verbatim above and is sound. Its COMMENT
     STRIPPER is not sound on this file, and slice D found that by running it:
     `stripCommentsQA` is a pair of regex replacements, so the glob
     `journey/chapters/*` + `/index.js` in this suite's own header reads to it
     as the START of a block comment. It then runs to the next `*` + `/`, 48
     lines later at line 133 — and again from 1555 to 1658, blanking the whole
     of T4c and T4b including one `check(` registration. Measured: 21 sites
     where 22 are registered, and the missing one is T4b's.

     That is the SAME defect this suite already recorded about itself (slice
     C's limitations §6: a regex stripper read the apostrophes in
     /'(?:\\.|[^'\\])*'/g as a string and swallowed three registrations), and
     the same defect QA-03 itself recorded about its coverage tool. It
     regenerates. So the file scan runs the adopted pattern over
     `codeEmptyStrings`, which is built on `skipLiteral` and consumes strings,
     templates, regexes and comments whole. The FIXTURES above still run
     through QA-03's own stripper, so the 27 numbers are reproduced exactly as
     QA-03 measured them rather than re-measured under a different tool.

     Both readings are asserted, and the difference is pinned — so if QA-03's
     stripper is ever repaired, this row goes red and says so. */
  const files = ['tools/test-chapter-contract.mjs'];
  const raw = read(files[0]);
  assert.equal(A(files.length), 1, 'exactly one file is scanned');
  const scanned = qaScan(raw, codeEmptyStrings);
  /* 25 -> 26 by DIET-02, 2026-08-26 — I11. This counter is receiver-agnostic
     and LPS1's is a text count of ; they move together or one of
     them has gone blind, which is why both are pinned. */
  assert.equal(A(scanned.sites), 26, 'twenty-six registration sites, found by the receiver-agnostic counter');
  assert.equal(A(CHECKS.length), 26, 'and the runtime registry agrees — cross-checked, not derived');
  /* The defect pinned STRUCTURALLY rather than by a count, because a count
     here would move with every edit to this file's own prose — including the
     paragraph above, which mentions the pattern.

     SLICE E RE-KEYED THIS ROW, AND THE REASON IS THE FINDING. It used to pin
     that QA-03's stripper BLANKS T4b's registration line. Slice E inserted two
     new banner comments above T4b, each carrying a real block-comment
     TERMINATOR, which closes the phantom block comment EARLIER — so the run of blanked lines no longer
     reaches T4b and the row went red. The tempting repair was to flip the
     boolean. That would have been a check pinning a fact that had stopped
     being true, which is the exact shape A01a-1's `paintImportEdge()` shipped
     (D62's companion entry: "a check pinned a fact the design had scheduled to
     stop being true", and it ran zero of its 53 checks for it).

     THE DEFECT IS NOT REPAIRED — IT RELOCATED. Measured at the fence for this
     order: QA-03's stripper still blanks 262 real code lines of this file,
     INCLUDING THE ENTIRE IMPORT BLOCK, because the glob `journey/chapters/*`
     in the header reads to it as the start of a block comment. It simply no
     longer lands on a `check(` at column 0. So the row is re-keyed onto a site
     that does not move with this file's prose and does not depend on where the
     phantom run happens to stop: the FIRST import. If QA-03's stripper is ever
     repaired, this row goes red and says so.

     D64 — keyed on TEXT, not on a line number: this control runs over its own
     file, where any edit above moves the number and the cheapest repair to a
     red number is bumping it. */
  const anchorText = `${'im'}${'port'} assert from 'node:assert/strict';`;
  const anchorLine = raw.split('\n').findIndex((l) => l === anchorText) + 1;
  assert.equal(A(anchorLine > 0), true,
    'anchor: this suite still imports node:assert at column 0 — if not, the comparison below is meaningless');
  /* QA-05 — THIS ROW WAS PINNING THE BUG, AND IT HAS NOW FIRED.

     It asserted [true, false]: that QA-03's regex stripper DOES blank this
     file's first import and the skipLiteral one does not. Its stated
     purpose was "if QA-03's stripper is ever repaired, this row goes red
     and says so." S-3 repaired it — stripCommentsQA is now the shared
     character-level module — so the row went red exactly as designed, and
     the honest repair is to INVERT it, not to delete it. The purpose is
     unchanged: it still compares the two strippers on a site that does not
     move with this file's prose, and it still goes red if either one starts
     eating live code. Measured damage before the conversion: 4248
     non-whitespace characters across 106 lines of this file. */
  assert.deepEqual(A([
    stripCommentsQA(raw).split('\n')[anchorLine - 1].trim() === '',
    codeEmptyStrings(raw).split('\n')[anchorLine - 1].trim() === '',
  ]), [false, false],
  'NEITHER stripper blanks this file\'s first import any more — S-3 closed the phantom-comment run');

  /* ...and the D67 property pinned the RIGHT WAY ROUND, with the positive
     control D46 requires, because [false, false] above is a pair of
     ZEROES and a stripper that blanked nothing at all would also satisfy
     it. The fixture reproduces journey/journey.js:18 exactly — a LINE
     comment whose text contains a glob that reads as a block-comment
     opener, live code after it, and a later real block comment supplying
     the terminator the block pass runs to.

     D73 — every fragment carrying a delimiter is ASSEMBLED. Written
     literally, the glob would open a comment in THIS file and the fixture
     would be clean by malformation. */
  const GLOB = ['chapters/', '*', '.js'].join('');
  const LIVE = 'const live = 1;';
  const phantomFixture = [
    `${SLASHES} geometry          ${GLOB}`,
    LIVE,
    `${OPENER} a later, real block comment ${CLOSER}`,
  ].join('\n');
  const twoRegexStripper = (s) => s
    .replace(new RegExp(`${OPENER_RE}[\\s\\S]*?${CLOSER_RE}`, 'g'), ' ')
    .replace(new RegExp(`${SLASHES_RE}[^\\n]*`, 'g'), ' ');
  assert.equal(A(stripComments(phantomFixture).includes(LIVE)), true,
    'D67: a glob inside a LINE comment does not open a block comment — the code after it survives');
  assert.equal(A(twoRegexStripper(phantomFixture).includes(LIVE)), false,
    'D67 positive control: the two-regex form this file shipped DOES eat that code, so the row above is not a blind pass');

  /* QA-05 mutants m1 and m3 found the gap these two rows close.

     Reverting stripCommentsQA to the two-regex form, and separately
     reverting codeKeepStrings, left this suite GREEN on every row. Every
     reader either of them has is an assert-ZERO scan — the alias census
     expects [], T1 expects all-zero counts — and blanking live code can
     only make an assert-zero scan MORE zero. That is D46 exactly: the
     stripper goes blind, the scan finds nothing, and "0 hits" is the
     passing answer. The pin above is geometry-dependent for the same
     reason slice E recorded: where the phantom run happens to STOP moves
     with this file's prose, so it cannot be relied on to catch a revert.

     So both strippers get a reader that cannot go blind: identity against
     the shared module over this file's own bytes. A revert of either one
     is now a red row naming the function. */
  assert.equal(A(stripCommentsQA(raw) === stripComments(raw)), true,
    'stripCommentsQA IS the shared stripper — byte-identical over this file (kills a silent revert)');
  assert.equal(A(codeKeepStrings(raw) === stripComments(raw)), true,
    'codeKeepStrings IS the shared stripper — byte-identical over this file (kills a silent revert)');
  assert.deepEqual(A(scanned.hits.map((h) => `${h.line} [${h.shape}] ${h.predicate}`)), [],
    'no check in this file passes a literal or an identity comparison as its predicate');

  /* POSITIVE CONTROL for the file scan (D46 (2)), on REAL bytes: rewrite one
     real registration into the hunted shape and require the pattern to find
     exactly it. Without this, "0 hits" over this file is indistinguishable
     from a pattern that no longer matches anything — F-1's exact shape. */
  const poisonedFile = codeEmptyStrings(injected(raw, `${'ch'}${'eck'}('LPS1 [instrument]`, `${'ch'}${'eck'}('LPS1 [instrument]', true); ignored(`));
  assert.deepEqual(A(qaScan(poisonedFile, (x) => x).hits.map((h) => h.predicate)), ['true'],
    'the pattern finds a literal predicate when a real registration is rewritten into one');
});

/* ================================================================== *
 * 8. RUNNER                                                          *
 * ================================================================== */

const proveMode = process.argv.includes('--prove-failure');
let failures = 0;
let sites = 0;

if (!proveMode) {
  PHASE = 'run';
  for (const { name, fn } of CHECKS) {
    P.site = 0;
    try {
      fn();
      sites += P.site;
      console.log(`  ok   ${name}`);
    } catch (err) {
      failures++;
      console.error(`  FAIL ${name}\n       ${err.message.split('\n').join('\n       ')}`);
    }
  }
  console.log(failures
    ? `chapter contract: FAIL (${failures}/${CHECKS.length} checks)`
    : `chapter contract: PASS (${CHECKS.length} checks, ${sites} comparison sites)`);
  REPORTED = true;                  // D57 — AFTER the summary, never before it
  process.exit(failures ? 1 : 0);
} else {
  PHASE = 'prove-failure';
  console.log('chapter contract — PROVE-FAILURE: every comparison site is corrupted in turn');
  console.log('and must turn its check red. A site that cannot be made to fail is a tautology.\n');
  for (const { name, fn } of CHECKS) {
    P.on = false;
    P.site = 0;
    P.target = -1;
    // D57 / C05C-R1. The clean run used to be UNGUARDED here, where the normal
    // mode wraps it. With any check red — including one reddened by another
    // lane's in-flight work, which is how this was found — the whole sweep died
    // on an unhandled AssertionError and a V8 stack trace, reporting nothing
    // about the other checks and leaving through the crash path rather than
    // this harness's own exit(1). In a six-lane run, a sweep that crashes
    // instead of reporting is how a real UNFALSIFIABLE gets missed.
    try {
      fn();                                  // clean run: must pass, and counts
    } catch (err) {
      failures++;
      console.error(`  FAIL  ${name} — the CLEAN run failed, so no site of this check was swept\n`
        + `       ${err.message.split('\n').join('\n       ')}`);
      continue;
    }
    const total = P.site;
    sites += total;
    let unfalsifiable = 0;
    for (let i = 0; i < total; i++) {
      P.on = true;
      P.site = 0;
      P.target = i;
      P.hit = false;
      let threw = null;
      try { fn(); } catch (err) { threw = err; }
      if (!threw) {
        unfalsifiable++;
        console.error(`  UNFALSIFIABLE  ${name} — site ${i} corrupted, check still passed`);
      } else if (!P.hit) {
        unfalsifiable++;
        console.error(`  INCONCLUSIVE   ${name} — site ${i} threw before the corruption was reached`);
      }
    }
    P.on = false;
    failures += unfalsifiable;
    console.log(`  ${unfalsifiable ? 'FAIL' : ' ok '}   ${name} — ${total - unfalsifiable}/${total} sites provably failable`);
  }
  console.log(failures
    ? `\nchapter contract prove-failure: FAIL — ${failures} of ${sites} sites could not be made to fail`
    : `\nchapter contract prove-failure: PASS — all ${sites} comparison sites across ${CHECKS.length} checks were made to fail`);
  REPORTED = true;                  // D57 — AFTER the summary, never before it
  process.exit(failures ? 1 : 0);
}
