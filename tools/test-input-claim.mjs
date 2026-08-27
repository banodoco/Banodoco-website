#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-input-claim.mjs — J04a-3, the decision port.
 *
 * SUBJECT
 *   journey/claim.js    the ManualClaim type, the relocated freshness
 *                       threshold and its rationale, the three frozen claim
 *                       singletons, and the port registry.
 *   journey/scroll.js   `sinceInputMs()`, `claimNow()`, and the publication
 *                       of the port at the end of createScrollModel().
 *
 * WHAT IS BEING PROVED, IN ONE SENTENCE
 *   A consumer can answer journey/journey.js's blendCancelled() question —
 *   "has manual input taken the camera back?" — WITHOUT reading `sinceInput`,
 *   `answeredAt` or `lastDir`, and get the same answer on every state.
 *
 *   That is a claim about EQUIVALENCE, not about shape, so the load-bearing
 *   rows are D* and E* and nothing else. D* is A05a's oracle-closure
 *   technique: the predicate is sliced out of journey/journey.js AS TEXT, the
 *   port's is sliced out of journey/scroll.js AS TEXT, both are compiled and
 *   executed, and their answers are compared over a dense grid of states —
 *   no tree staged, no behaviour asserted from reading. E* then does the same
 *   against a LIVE model driven through a real input trace, because a grid
 *   proves agreement on states I chose and a trace proves agreement on states
 *   the model actually reaches.
 *
 * WHY A RELABELLING WOULD NOT PASS THESE ROWS
 *   J01 declined a journey/transition/claim.js that reads `scroll.sinceInput`
 *   and calls the result a decision: it would pass a focused proof to the
 *   letter while re-creating the duplication boundaries.md §A.9 exists to
 *   remove. C2 is the row that refuses that form here — the sliced body of
 *   claimNow() must name the model's PRIVATE state and no published getter —
 *   and C5 refuses the other half of it, by pinning that the file's
 *   clock-read count did not move.
 *
 * D46 — EVERY ASSERT-ZERO ROW CARRIES ITS POSITIVE CONTROL, in the same
 *   array as the zero, so a scan that stopped matching cannot read as clean:
 *   A5 (purity) and A6 (imports) are paired with the same scan over
 *   scroll.js, C2 with the same scan over journey.js's expression, and C4
 *   with the inlined 50 whose absence it is asserting.
 *
 * D94 — NO PIN READS A HAND-WRITTEN COLLECTION. Every array compared here is
 *   produced by executing or slicing the subject, and each is pinned on a
 *   cardinality the subject itself yields: the grid's own product, the
 *   trace's own step count, the sliced line count, the module's own export
 *   count.
 *
 * D84 — WHAT THIS FILE DOES NOT RE-DERIVE. The ledger, the abort sentinel,
 *   the harness-fault type, the five-gate mutant registry and the comment
 *   stripper come from tools/instrument-ledger.mjs, tools/mutant-registry.mjs
 *   and tools/strip-comments.mjs. The DOM-free environment and the input rig
 *   come from tools/test-c01-harness.mjs. Nothing is copied. No tree is
 *   staged and nothing is written anywhere (D56).
 *
 * D85, DECLARED DEVIATION — C3 anchors on COMMENT TEXT, deliberately. It is
 *   the row that proves boundaries.md §A.9's "the rationale must move with
 *   the constant", and prose is the only thing there is to anchor on. It
 *   extracts no code and no behaviour depends on it. Every other anchor in
 *   this file is a `function` header, an object-literal key, or a source
 *   expression, and every slice REFUSES on a miss rather than returning a
 *   short string (D93).
 *
 * Usage:
 *   node tools/test-input-claim.mjs
 *   node tools/test-input-claim.mjs --prove-failure
 * ==================================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { parse } from 'espree';

import { stripComments } from './strip-comments.mjs';
import {
  literalPredicateRe, literalPredicateHits, literalPredicateProbe,
  maskedToken, selfSiteSet, scanTautologyAst,
} from './self-controls.mjs';
import {
  HarnessFault, fault, mutateText, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');

const SENTINEL = armSentinel('test-input-claim', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const SELF_PATH = fileURLToPath(import.meta.url);
const SRC_SELF = readFileSync(SELF_PATH, 'utf8');

const SRC = {
  claim: read('journey/claim.js'),
  scroll: read('journey/scroll.js'),
  journey: read('journey/journey.js'),
  baseline: read('tools/test-render-baseline.mjs'),
};

/* The environment first: the harness installs the DOM-free globals and the
   frozen clock at module scope, BEFORE journey/scroll.js is evaluated. */
const H = await import(join(REPO, 'tools/test-c01-harness.mjs'));
const CLAIM = await import(join(REPO, 'journey/claim.js'));

/* ------------------------------------------------------------------ *
 * Slicing — text-anchored, refusing on a miss (D93).                  *
 * ------------------------------------------------------------------ */

/** `header` through the first `}` at `indent`. A miss is a HarnessFault. */
function fnSlice(tag, src, header, indent = '  ', close = null) {
  const lines = src.split('\n');
  const a = lines.indexOf(header);
  if (a < 0) fault(`${tag}: ANCHOR MISS on header ${JSON.stringify(header)}`);
  const end = close === null ? `${indent}}` : close;
  const b = lines.indexOf(end, a + 1);
  if (b < 0) fault(`${tag}: ANCHOR MISS on the closing ${JSON.stringify(end)} after ${header}`);
  return lines.slice(a, b + 1).join('\n');
}

/** One exact line, by its own text. */
function lineSlice(tag, src, text) {
  const lines = src.split('\n');
  const a = lines.indexOf(text);
  if (a < 0) fault(`${tag}: ANCHOR MISS on line ${JSON.stringify(text)}`);
  return lines[a];
}

const A = {
  claimNow: '  function claimNow() {',
  sinceInputMs: '  function sinceInputMs() { return performance.now() - lastInput; }',
  getter: '    get sinceInput() { return sinceInputMs(); },',
  retire: '    retire(dir) {',
  publish: '  publishInputPort(model, { claimNow, retire: model.retire });',
  rationaleHead: 'THE GESTURE THAT BOUGHT THE MOVE IS NOT THE VISITOR CANCELLING IT',
  rationaleTail: 'truthiness test.)',
};

/* THE EXPRESSION THE PORT REPLACED — A RECORD NOW, NOT A SLICE (J01).
 * ==================================================================
 * This line stood at journey/journey.js:1131 at commit
 * 6967a36ab309af7057336be64d6f0f9dd3c41b21, inside blendCancelled(), and
 * every row below that says "the expression it replaces" means THIS text.
 * J01 deleted blendCancelled() — that deletion IS what this suite was built
 * to license — so there is no longer anything in the tree to slice it out
 * of, and `lineSlice('journey', ...)` aborted the whole suite on the anchor
 * miss the moment the extraction landed.
 *
 * D94, DECLARED DEVIATION, and it is the ONE in this file. Every other
 * array here is produced by executing or slicing a live subject. This one
 * cannot be: a predicate that has been removed is not derivable from the
 * tree that no longer holds it, and reconstructing it from `git show` would
 * pin the suite to a commit rather than to a subject. What replaces the
 * derivation is a FAILABLE assertion in the other direction — C7 below
 * proves that no production module assembles this question any more, with
 * the same scan finding both getters where scroll.js DEFINES them. The
 * record is therefore load-bearing only for the D1 grid's left-hand side;
 * its right-hand side is still sliced out of the live model.
 *
 * DO NOT "restore" this by re-anchoring it on journey/transition/
 * controller.js. That file quotes the line in a doc comment, deliberately,
 * and a slice that matched the quote would silently start comparing
 * claimNow() against a comment. */
const WAS_ORACLE_EXPR = '    return scroll.sinceInput < 50 && scroll.answeredAt === null;';

const FN = {
  claimNow: fnSlice('scroll', SRC.scroll, A.claimNow),
  sinceInputMs: lineSlice('scroll', SRC.scroll, A.sinceInputMs),
  getter: lineSlice('scroll', SRC.scroll, A.getter),
  retire: fnSlice('scroll', SRC.scroll, A.retire, '    ', '    },'),
  publish: lineSlice('scroll', SRC.scroll, A.publish),
  oracleExpr: WAS_ORACLE_EXPR,
};

/** Lines of `block` (already normalised by rationale()) that `src` still
 *  carries, compared on the same normalisation. Derived from BOTH subjects:
 *  the needle is claim.js's own prose, the haystack is whatever file is
 *  handed in. */
function rationaleLinesIn(block, src) {
  const hay = new Set(src.split('\n')
    .map((l) => l.trim().replace(/^\/\*+/, '').replace(/\*\/$/, '').replace(/^\*+/, '').trim())
    .filter(Boolean));
  return block.filter((l) => hay.has(l)).length;
}

/** Reads of the two diagnostic getters the port replaced, across a source
 *  text, comments stripped. */
const RAW_READS = /\.\s*(?:sinceInput|answeredAt)\b/g;

/** The prose of one comment block, normalised: leaders removed, whitespace
 *  collapsed, blanks dropped. Used ONLY by C3 (see the D85 deviation above). */
function rationale(tag, src) {
  const lines = src.split('\n');
  const a = lines.findIndex((l) => l.includes(A.rationaleHead));
  if (a < 0) fault(`${tag}: ANCHOR MISS on the rationale head`);
  const b = lines.findIndex((l, i) => i >= a && l.includes(A.rationaleTail));
  if (b < 0) fault(`${tag}: ANCHOR MISS on the rationale tail`);
  return lines.slice(a, b + 1)
    .map((l) => l.trim().replace(/^\/\*+/, '').replace(/\*\/$/, '').replace(/^\*+/, '').trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * A — the type module, executed.                                      *
 * ------------------------------------------------------------------ */
console.log('A — journey/claim.js: the type, the singletons, the threshold');

pin('A1', 'the three claims are frozen, carry the single field `dir`, and carry the right sign — and the module mints exactly three',
  (i) => [...i.claims.map((c) => `${Object.isFrozen(c)}/${Object.keys(c).join('+')}/${c.dir}`),
    (i.src.match(/export const CLAIM_\w+ = Object\.freeze\(/g) || []).length],
  { claims: [CLAIM.CLAIM_FORWARD, CLAIM.CLAIM_BACKWARD, CLAIM.CLAIM_UNDIRECTED], src: SRC.claim },
  ['true/dir/1', 'true/dir/-1', 'true/dir/0', 3],
  'E-A3: the envelope is frozen at construction, and `dir` is the only field — the magnitude rule has nothing to hold');

pin('A2', 'manualClaim() is the identity on lastDir\'s whole domain',
  (i) => i.domain.map((d) => i.fn(d).dir),
  { fn: CLAIM.manualClaim, domain: [-1, 0, 1] }, [-1, 0, 1],
  'boundaries.md §A.8: `dir` is the model\'s own lastDir, never a re-derivation');

pin('A3', 'manualClaim() MINTS NOTHING — each call returns the module\'s own singleton',
  (i) => i.domain.map((d) => i.fn(d) === i.byDir[d]),
  { fn: CLAIM.manualClaim,
    domain: [-1, 0, 1],
    byDir: { '-1': CLAIM.CLAIM_BACKWARD, 0: CLAIM.CLAIM_UNDIRECTED, 1: CLAIM.CLAIM_FORWARD } },
  [true, true, true],
  'a claim is a value, not a record of an event: nothing is allocated per frame');

pin('A4', 'the threshold RELOCATED — the constant equals the literal still standing in journey.js',
  (i) => [i.fromJourney, i.constant],
  { fromJourney: (() => {
    const m = /scroll\.sinceInput\s*<\s*(\d+)\s*&&/.exec(FN.oracleExpr);
    if (!m) fault('A4: ANCHOR MISS on the threshold literal in journey.js');
    return Number(m[1]);
  })(),
  constant: CLAIM.MANUAL_CLAIM_FRESH_MS },
  [50, 50],
  'boundaries.md §A.9: the constant moves VERBATIM and arrives named');

/* D46: the zeros below are worthless without the control that the same scan
   finds these things where they DO live. scroll.js is the control subject. */
const PURITY = /performance\s*\.\s*now|Date\s*\.\s*now|requestAnimationFrame|window\s*\.|document\s*\.|innerHeight/g;
pin('A5', 'journey/claim.js reads NO clock and NO viewport — and the same scan finds both in scroll.js',
  (i) => [(i.claim.match(new RegExp(PURITY.source, 'g')) || []).length,
    (i.scroll.match(new RegExp(PURITY.source, 'g')) || []).length > 0],
  { claim: stripComments(SRC.claim, { blankStrings: true }),
    scroll: stripComments(SRC.scroll, { blankStrings: true }) },
  [0, true],
  'the type module holds a type, a threshold and a registry; the POLICY that reads the clock is in the model');

pin('A6', 'journey/claim.js imports nothing — a leaf, so no cycle and no ordering hazard',
  (i) => [(i.claim.match(/^import\b/gm) || []).length,
    (i.scroll.match(/^import\b/gm) || []).length > 0],
  { claim: stripComments(SRC.claim, { blankStrings: false }),
    scroll: stripComments(SRC.scroll, { blankStrings: false }) },
  [0, true]);

/* ------------------------------------------------------------------ *
 * B — the port, executed against real models.                         *
 * ------------------------------------------------------------------ */
console.log('\nB — the port: shape, registry, and the receiver hazard');

const rig = H.createRig({});
const PORT = CLAIM.inputPortOf(rig.scroll);
if (!PORT) fault('B: the model published no input port');

pin('B1', 'the port\'s member set is exactly the decision surface, and it is frozen',
  (i) => [Object.isFrozen(i.port), Object.keys(i.port).sort().join('+'), Object.keys(i.port).length],
  { port: PORT }, [true, 'claimNow+retire', 2],
  'E-A2: J01 is injected THIS, not the model — there is no `scroll` identifier in its scope to reach a getter through');

pin('B2', 'inputPortOf() answers only for a model that published one',
  (i) => [i.of(i.model) === i.port, i.of({}), i.of(null)],
  { of: CLAIM.inputPortOf, model: rig.scroll, port: PORT }, [true, null, null],
  'the registry is a lookup, not a default: an unpublished object gets null, never somebody else\'s port');

/* B3 — per-model, proved FUNCTIONALLY rather than by object identity: two
   models are driven to opposite states and each port must answer about ITS
   OWN. A single shared port would answer the same for both.
   NOT through the rig's DOM helpers: the harness registers every model's
   listeners in ONE shared map, so a dispatched wheel reaches every rig in the
   process and both models would be fresh. primeBootWheel() is a direct call
   on one model, which is exactly the isolation this row needs. */
const rigX = H.createRig({});
const rigY = H.createRig({});
/* The scenario is INSIDE the reader, not around it, so the mutant sweep
   replays it rather than re-reading a clock that has moved on since. It is
   deterministic: nothing here reads wall time, only the harness's counter. */
pin('B3', 'the port is per-model: two live models answer about their own state, not each other\'s',
  (i) => {
    const settle = (m) => {
      m.setProgress(0.3);
      for (let k = 0; k < 5; k++) { H.clock.advance(16); m.update(0.016); }
    };
    settle(i.y.model); settle(i.x.model);
    i.y.model.primeBootWheel(120);        // Y's input is delivered first
    H.clock.advance(400);                 // ...and then ages past the window
    i.x.model.primeBootWheel(120);        // X's input is fresh at this instant
    return [i.x.port.claimNow() !== null, i.y.port.claimNow() !== null];
  },
  { x: { model: rigX.scroll, port: CLAIM.inputPortOf(rigX.scroll) },
    y: { model: rigY.scroll, port: CLAIM.inputPortOf(rigY.scroll) } },
  [true, false]);

/* B4 — J04a's finding F5: turning a free call into a member call changes the
   receiver, and no token diff flags it. Checked rather than trusted. */
const rigC = H.createRig({});
rigC.reset(0.3);
const portC = CLAIM.inputPortOf(rigC.scroll);
const wallBefore = rigC.scroll.answeredAt;
portC.retire(1);
pin('B4', 'port.retire IS the model\'s own function, its body touches no `this`, and calling it through the port raises the wall',
  (i) => [/\bthis\b/.test(i.src), i.same, i.before, i.after !== null],
  { src: stripComments(FN.retire, { blankStrings: true }),
    same: portC.retire === rigC.scroll.retire,
    before: wallBefore,
    after: rigC.scroll.answeredAt },
  [false, true, null, true],
  'J04a F5: a free call has `this === undefined`; a method call has `this === host`. Nine call sites changed that way in J04a and a token diff saw nothing');

/* ------------------------------------------------------------------ *
 * C — the relocation, as text.                                        *
 * ------------------------------------------------------------------ */
console.log('\nC — the relocation: what moved, what did not, and what is NOT read');

pin('C1', 'claimNow()\'s body, line for line',
  (i) => i.src.split('\n').map((l) => l.trim()).filter(Boolean),
  { src: FN.claimNow },
  ['function claimNow() {',
    'const fresh = sinceInputMs() < MANUAL_CLAIM_FRESH_MS;',
    'if (!fresh) return null;',
    'if (answeredP !== null) return null;',
    'return manualClaim(lastDir);',
    '}'],
  'the clock is read FIRST and ONCE, exactly as `scroll.sinceInput` is read first by the && it replaces');

pin('C2', 'THE RELABELLING REFUSAL: claimNow() names the model\'s PRIVATE state and no published getter — and the same scan finds the two getter reads in the expression it replaces',
  (i) => [(i.body.match(/\b(?:scroll|model|this)\s*\./g) || []).length,
    (i.oracle.match(/\bscroll\s*\./g) || []).length,
    ['lastInput', 'answeredP', 'lastDir'].filter((n) => new RegExp(`\\b${n}\\b`).test(i.closure)).length],
  { body: stripComments(FN.claimNow, { blankStrings: true }),
    oracle: FN.oracleExpr,
    closure: `${FN.claimNow}\n${FN.sinceInputMs}` },
  [0, 2, 3],
  'boundaries.md §A.9: a module that reads `scroll.sinceInput` and calls the result a decision is a RELABELLING, not a port');

/* C3, RETIRED AND REPLACED — J01, 2026-08-22. The row this replaces read
   "the rationale moved WITH the constant — line for line, journey.js to
   claim.js" and compared the two copies. J01 deleted blendCancelled(), which
   is the deletion §A.9's move was FOR, so there is no second copy left to
   compare and the equality could only be asserted vacuously.

   WAS: [true, 51, 51] — claim.js's block, journey.js's block, and their
   equality. It is not deleted but INVERTED, because the interesting question
   after a move is whether the ORIGINAL went: the block stands whole in
   claim.js, and journey.js carries not one line of it. The zero is the
   claim; the two 51s are its D46 controls, in the same array, so a scan that
   quietly stopped matching cannot read as a clean delete. Both counts are
   produced by running the same reader over the two files (D94). */
pin('C3', 'the rationale is claim.js\'s ALONE now — J01 deleted the original, and the delete took the WHOLE block',
  (i) => [i.claim.length,
    rationaleLinesIn(i.claim, i.journeySrc),
    rationaleLinesIn(i.claim, i.claimSrc)],
  { claim: rationale('claim.js', SRC.claim), journeySrc: SRC.journey, claimSrc: SRC.claim },
  [51, 0, 51],
  'boundaries.md §A.9: a threshold that arrives in a file without its reasoning is how the next wave "simplifies" it — and a rationale left behind in TWO files is how the next wave finds them disagreeing');

pin('C4', 'the threshold is NEVER inlined in the policy — and the same scan finds the literal in the expression it replaces',
  (i) => [(i.body.match(/\b50\b/g) || []).length, (i.oracle.match(/\b50\b/g) || []).length],
  { body: stripComments(FN.claimNow, { blankStrings: true }), oracle: FN.oracleExpr },
  [0, 1]);

pin('C5', 'THE CLOCK DID NOT MOVE: scroll.js reads it in the same 11 places A05 measured, the subtraction exists once, and the getter delegates to it',
  (i) => [(i.scroll.match(/performance\s*\.\s*now|Date\s*\.\s*now|requestAnimationFrame/g) || []).length,
    (i.scroll.match(/performance\s*\.\s*now\(\)\s*-\s*lastInput/g) || []).length,
    i.getter],
  { scroll: stripComments(SRC.scroll, { blankStrings: true }), getter: FN.getter.trim() },
  [11, 1, 'get sinceInput() { return sinceInputMs(); },'],
  'design.md §12: claimNow() ADDS no clock read and RELOCATES none — it reads at the caller\'s instant, exactly where sinceInput reads today. test-road C2-CTL pins the same 11');

/* C7 — THE OTHER HALF OF THE D94 DEVIATION DECLARED AT WAS_ORACLE_EXPR.
   The D grid's left-hand side is a record rather than a slice because the
   subject was deleted. This row is the failable statement that makes that
   record safe: the deletion is REAL and TOTAL across production. The scan is
   for a READ of either getter through any receiver — `.sinceInput`,
   `.answeredAt`, however the receiver is spelled — over every .js under
   journey/ with comments stripped, scroll.js excluded because it is where
   they are defined. Its two positive controls sit in the same array (D46):
   the recorded expression still yields two hits, and scroll.js still
   declares two getters, so a scan that went blind reports [0, 0, 0] rather
   than a clean tree. */
const PRODUCTION = (() => {
  const files = readdirSync(join(REPO, 'journey'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.js') && f !== 'scroll.js');
  return files.map((f) => stripComments(read(`journey/${f}`), { blankStrings: true })).join('\n');
})();

pin('C7', 'THE READS ARE GONE FROM PRODUCTION: nothing under journey/ assembles the question any more — and the same scan still finds them in the record and in scroll.js\'s own declarations',
  (i) => [(i.production.match(new RegExp(RAW_READS.source, 'g')) || []).length,
    (i.record.match(new RegExp(RAW_READS.source, 'g')) || []).length,
    (i.scroll.match(/get (?:sinceInput|answeredAt)\(/g) || []).length],
  { production: PRODUCTION, record: WAS_ORACLE_EXPR,
    scroll: stripComments(SRC.scroll, { blankStrings: true }) },
  [0, 2, 2],
  'J01\'s focused proof, measured over the tree rather than over the one file it edited: no raw sinceInput/answeredAt dependency survives anywhere a frame can reach');

pin('C6', 'the port is published from inside the model, once, at the end of construction',
  (i) => [(i.scroll.match(/publishInputPort\(/g) || []).length, i.line.trim()],
  { scroll: stripComments(SRC.scroll, { blankStrings: true }), line: FN.publish },
  [1, 'publishInputPort(model, { claimNow, retire: model.retire });']);

/* ------------------------------------------------------------------ *
 * D — THE ORACLE CLOSURE. Both predicates, sliced and executed.        *
 * ------------------------------------------------------------------ */
console.log('\nD — the oracle closure: journey.js\'s predicate against the port\'s, over a grid');

/* The grid. Derived, not typed: the freshness axis is swept across the whole
   0-100 ms window at 0.5 ms and then out to both sentinels, the wall axis is
   the four REST_STOPS the model can answer at plus null plus the terminal,
   and the direction axis is lastDir's whole domain (A2). */
const SINCE = (() => {
  const out = [];
  for (let ms = 0; ms <= 100; ms += 0.5) out.push(ms);
  return out.concat([-1, 1e-9, 1.3, 7.1, 1e9, 2e9, Number.MAX_SAFE_INTEGER]);
})();
const WALLS = [null, 0, 0.26, 0.523, 0.725, 1];
const DIRS = [-1, 0, 1];

/** Build the two executable predicates OUT OF SLICED SOURCE. The only
 *  hand-written lines here are the preamble that binds the closure's names. */
function makeClosures(claimNowSrc, sinceMsSrc, oracleExprSrc) {
  const shippedBody = `
    let lastInput = 0, answeredP = null, lastDir = 0;
    let __now = 0;
    const performance = { now: () => __now };
${sinceMsSrc}
${claimNowSrc}
    return (state) => {
      __now = state.now; lastInput = state.lastInput;
      answeredP = state.answeredP; lastDir = state.lastDir;
      return claimNow();
    };
  `;
  const oracleBody = `
    return (scroll) => {
${oracleExprSrc}
    };
  `;
  let shipped;
  let oracle;
  try {
    shipped = new Function('MANUAL_CLAIM_FRESH_MS', 'manualClaim', shippedBody)(
      CLAIM.MANUAL_CLAIM_FRESH_MS, CLAIM.manualClaim);
  } catch (e) { fault(`the sliced claimNow() did not compile — ${e.message}`); }
  try {
    oracle = new Function(oracleBody)();
  } catch (e) { fault(`the sliced blendCancelled() expression did not compile — ${e.message}`); }
  return { shipped, oracle };
}

/** Run the grid. Returns COUNTS derived from execution, never a verdict. */
function survey(i) {
  const { shipped, oracle } = makeClosures(i.claimNow, i.sinceInputMs, i.oracleExpr);
  let compared = 0;
  let mismatch = 0;
  let live = 0;
  let none = 0;
  let dirMismatch = 0;
  const NOW = 5_000_000;
  for (const ms of i.since) {
    for (const wall of i.walls) {
      for (const dir of i.dirs) {
        compared++;
        const claim = shipped({ now: NOW, lastInput: NOW - ms, answeredP: wall, lastDir: dir });
        const want = oracle({ sinceInput: ms, answeredAt: wall });
        if ((claim !== null) !== want) mismatch++;
        if (claim === null) none++;
        else { live++; if (claim.dir !== dir) dirMismatch++; }
      }
    }
  }
  return [mismatch, dirMismatch, compared, live, none];
}

pin('D1', 'THE PORT ANSWERS WHAT THE RAW READS ANSWERED, on every state of the grid — and the grid reaches both verdicts',
  survey,
  { claimNow: FN.claimNow,
    sinceInputMs: FN.sinceInputMs,
    oracleExpr: FN.oracleExpr,
    since: SINCE, walls: WALLS, dirs: DIRS },
  [0, 0, 3744, 312, 3432],
  'mismatch, dir-mismatch, compared, live, null. A05a\'s technique: both sides sliced out of text and executed, so this is not "looks right"');

pin('D2', 'the grid\'s cardinality is the product of its own axes — nobody typed 3744',
  (i) => [i.since.length * i.walls.length * i.dirs.length, i.since.length, i.walls.length, i.dirs.length],
  { since: SINCE, walls: WALLS, dirs: DIRS }, [3744, 208, 6, 3],
  'D94: the collection is derived from the subject and pinned on the subject\'s own cardinality');

/* ------------------------------------------------------------------ *
 * E — the same equivalence, against a LIVE model on a real trace.      *
 * ------------------------------------------------------------------ */
console.log('\nE — the live model: the port against the raw reads, on states the model actually reaches');

/** Drive one model through wheels, keys, touches, frames, a retire and a
 *  placement, sampling BOTH answers after every step. */
function driveTrace() {
  const r = H.createRig({});
  const port = CLAIM.inputPortOf(r.scroll);
  const obs = [];
  const sample = (tag) => {
    /* The port's answer, and the answer journey.js assembles today. Both are
       taken at the same instant, off the same model. */
    const claim = port.claimNow();
    const raw = r.scroll.sinceInput < CLAIM.MANUAL_CLAIM_FRESH_MS && r.scroll.answeredAt === null;
    obs.push({
      tag,
      live: claim !== null,
      raw,
      dir: claim === null ? null : claim.dir,
      lastDir: r.scroll.lastDir,
      stale: !(r.scroll.sinceInput < CLAIM.MANUAL_CLAIM_FRESH_MS),
      walled: r.scroll.answeredAt !== null,
    });
  };

  r.reset(0.3); sample('reset');
  r.wheel(120, 16); sample('wheel-1');
  r.frame(16); sample('frame-1');
  r.wheel(120, 8); sample('wheel-2');
  r.wheel(240, 8); sample('wheel-3');
  r.frame(16); sample('frame-2');
  r.frame(16); sample('frame-3');
  r.scroll.retire(1); sample('retire-fresh');       // fresh input, wall UP
  r.frame(16); sample('frame-4');
  r.wheel(-120, 8); sample('wheel-back');
  r.settle(600); sample('settled');                 // stale, wall state settled
  r.wheel(120, 16); sample('wheel-4');
  r.key('ArrowDown'); sample('key');
  r.frame(400); sample('long-frame');               // stale by the frame alone
  r.touchStart(400); sample('touchstart');
  r.touchMove(300, 16); sample('touchmove');
  r.touchEnd(); sample('touchend');
  r.scroll.retire(-1); sample('retire-back');
  r.wheel(120, 8); sample('wheel-5');
  r.scroll.setProgress(0.5); sample('placement');   // dropWall via newGesture
  r.frame(16); sample('frame-5');
  r.settle(1200); sample('settled-2');
  return obs;
}

const OBS = driveTrace();

pin('E1', 'THE LIVE PROOF: on every sampled state the port and the raw reads give the same verdict, and the trace reaches BOTH verdicts',
  (i) => [i.obs.filter((o) => o.live !== o.raw).length,
    i.obs.filter((o) => o.live && o.dir !== o.lastDir).length,
    i.obs.length,
    i.obs.filter((o) => o.live).length,
    i.obs.filter((o) => !o.live).length],
  { obs: OBS }, [0, 0, 22, 13, 9],
  'disagreements, dir disagreements, samples, live, null. The live/null split is the Engine 3 guard: an all-null trace would agree vacuously');

pin('E2', 'D75 — every branch of claimNow() is ENTERED on this trace: stale, walled, and live',
  (i) => [i.obs.filter((o) => o.stale).length,
    i.obs.filter((o) => !o.stale && o.walled).length,
    i.obs.filter((o) => !o.stale && !o.walled).length],
  { obs: OBS }, [5, 4, 13],
  'three arms, three witnesses — a branch nobody entered is a branch nobody proved');

pin('E3', 'lastDir\'s domain on a live trace is exactly the domain manualClaim() is total over',
  (i) => [[...new Set(i.obs.map((o) => o.lastDir))].sort((a, b) => a - b), i.obs.length],
  { obs: OBS }, [[-1, 0, 1], 22],
  'A2 asserts the identity over {-1,0,1}; this is the row that proves that set is the real one');


/* ------------------------------------------------------------------ *
 * SC — design.md §12 ROW 1: push() keeps TWO SITUATED CLOCK READS.    *
 *                                                                    *
 * LIFTED HERE 2026-08-22 out of the J04b move verifier, which is      *
 * retired. It is the ONE assertion in that file that was never about  *
 * J04b's own change: its own header says so — "TWO jobs, and the      *
 * first one is not about J04b's change at all". The rest of that      *
 * suite proved that journey/ownership.js is the base commit's         *
 * scroll.js:43-168 verbatim, which is a MOVE proof and expired at     *
 * acceptance; this is a live behaviour contract over push(), and it   *
 * comes to the suite that already owns journey/scroll.js's decision   *
 * surface.                                                            *
 *                                                                    *
 * THE RULE, from §12 row 1 and boundaries.md §A.3:                    *
 *                                                                    *
 *   push() reads performance.now() TWICE — once on the refusal path,  *
 *   AFTER the host's onIntent() has run, and once on the normal path. *
 *   A single delivery-time read hoisted above onIntent() moves        *
 *   `lastInput` earlier by the whole cost of the host's close, which  *
 *   is a real input-timing change in a browser.                       *
 *                                                                    *
 * WHY IT NEEDS ITS OWN PIN AT ALL. J04a measured the forbidden        *
 * variant against every gate in the tree: trace 110/110, touch-gates  *
 * 0, perturbation 0, frame-order 0, matrix byte-identical. UNDER A    *
 * FROZEN CLOCK the hoisted read and the situated reads return the     *
 * same value in the same call, so no runtime comparison can tell them *
 * apart even in principle. The pin has to read the source.            *
 *                                                                    *
 * AND IT PARSES RATHER THAN GREPS (D137). J04b's form was eleven      *
 * substring counts over the sliced text — `countOf(PUSH, CLOCK)`,     *
 * `countOf(PUSH, 'const consumedAt = performance.now();')` — which    *
 * pinned the SPELLING as much as the property: renaming `consumedAt`, *
 * or wrapping the condition across a line, reddened rows that have no *
 * opinion about either. This reads the AST instead. The rows below    *
 * hold under any renaming, any reformatting, any change of `if` shape *
 * — and still red on the one edit the rule forbids.                   *
 * ------------------------------------------------------------------ */
console.log('\nSC — design.md §12 row 1: push() keeps two SITUATED clock reads');

/** The AST of one source, or a typed refusal. */
function astOf(tag, src) {
  try {
    return parse(src, { ecmaVersion: 'latest', sourceType: 'module', loc: true, range: true });
  } catch (e) {
    return fault(`${tag}: ${src.length} bytes did not parse — ${e.message}`);
  }
}

/** Every node in an AST, depth first. */
function* nodesOf(node) {
  if (!node || typeof node.type !== 'string') return;
  yield node;
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range' || k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) yield* nodesOf(c); }
    else if (v && typeof v === 'object' && typeof v.type === 'string') yield* nodesOf(v);
  }
}

const isNowRead = (n) => n.type === 'CallExpression'
  && n.callee.type === 'MemberExpression' && !n.callee.computed
  && n.callee.object.type === 'Identifier' && n.callee.object.name === 'performance'
  && n.callee.property.type === 'Identifier' && n.callee.property.name === 'now'
  && n.arguments.length === 0;

const isOnIntentCall = (n) => n.type === 'CallExpression'
  && n.callee.type === 'Identifier' && n.callee.name === 'onIntent';

/** push()'s declaration node, located by NAME rather than by header text. */
const PUSH_FN = (() => {
  for (const n of nodesOf(astOf('journey/scroll.js', SRC.scroll))) {
    if (n.type === 'FunctionDeclaration' && n.id && n.id.name === 'push') return n;
  }
  return fault('journey/scroll.js: no function declaration named `push`');
})();

/** The structure §A.3 is about, derived rather than described.
 *
 *  `situated` is the whole of it: for each clock read, WHICH SIDE of the
 *  onIntent() call it sits on, and whether the `lastInput` stamp reached
 *  from that side names the binding that read initialised. A read that
 *  moves above onIntent() flips a cell; a stamp that starts naming the
 *  other side's binding flips a different one. */
function pushClockShape(fn) {
  const nodes = [...nodesOf(fn)];
  const intent = nodes.filter(isOnIntentCall);
  const reads = nodes.filter(isNowRead).sort((a, b) => a.range[0] - b.range[0]);
  const boundary = intent.length ? Math.max(...intent.map((c) => c.range[1])) : -1;

  /* Each read, as the NAME it initialises (a `const x = performance.now();`)
     or `<unbound>` — plus the side of the boundary it evaluates on. */
  const named = reads.map((r) => {
    const decl = nodes.find((n) => n.type === 'VariableDeclarator'
      && n.init && n.init.range && n.init.range[0] === r.range[0] && n.init.range[1] === r.range[1]);
    return {
      name: decl && decl.id.type === 'Identifier' ? decl.id.name : '<unbound>',
      side: r.range[0] < boundary ? 'above-onIntent' : 'below-onIntent',
      start: r.range[0],
    };
  });

  /* Each `lastInput = <Identifier>` assignment, with the side IT sits on and
     the side of the read whose binding it names. Those two agreeing IS what
     "situated" means. */
  const stamps = nodes
    .filter((n) => n.type === 'AssignmentExpression' && n.operator === '='
      && n.left.type === 'Identifier' && n.left.name === 'lastInput')
    .sort((a, b) => a.range[0] - b.range[0])
    .map((a) => {
      const src = a.right.type === 'Identifier' ? a.right.name : `<${a.right.type}>`;
      const from = named.find((r) => r.name === src);
      return {
        stampSide: a.range[0] < boundary ? 'above-onIntent' : 'below-onIntent',
        readSide: from ? from.side : '<not-a-situated-read>',
        sameSide: !!from && (from.start < boundary) === (a.range[0] < boundary),
      };
    });

  return {
    onIntentCalls: intent.length,
    clockReads: reads.length,
    readsAboveOnIntent: named.filter((r) => r.side === 'above-onIntent').length,
    unboundReads: named.filter((r) => r.name === '<unbound>').length,
    lastInputStamps: stamps.length,
    everyStampFromItsOwnSide: stamps.length > 0 && stamps.every((x) => x.sameSide),
    stampSides: stamps.map((x) => `${x.stampSide} <- ${x.readSide}`),
  };
}

pin('SC-R1', 'design.md §12 row 1 / boundaries.md §A.3 — push() reads the clock TWICE, one read on each side of onIntent(), NONE above it, and each lastInput stamp is fed by the read situated on its own side',
  (i) => pushClockShape(i.fn), { fn: PUSH_FN },
  {
    onIntentCalls: 1,
    clockReads: 2,
    readsAboveOnIntent: 0,
    unboundReads: 0,
    lastInputStamps: 2,
    everyStampFromItsOwnSide: true,
    stampSides: ['below-onIntent <- below-onIntent', 'below-onIntent <- below-onIntent'],
  },
  'a single delivery-time read hoisted above onIntent() moves lastInput earlier by the whole cost of '
  + 'the host close, and UNDER A FROZEN CLOCK no runtime gate in this tree can see it — J04a measured '
  + 'that against all of them. Both stamps read below-onIntent because the refusal path is INSIDE the '
  + 'if-body: the boundary is the onIntent() CALL, not the branch. What separates them is which read '
  + 'each names, which is what `everyStampFromItsOwnSide` derives.');

pin('SC-R2', 'D46 — the reader is reading: the boundary is real, the two reads are distinguishable, and a hoisted read WOULD land above it',
  (i) => {
    const hoisted = astOf('hoisted', i.text.replace(
      'if (onIntent && onIntent(kind) === false) {',
      'const at = performance.now();\n    if (onIntent && onIntent(kind) === false) {'));
    const fn = [...nodesOf(hoisted)].find((n) => n.type === 'FunctionDeclaration' && n.id && n.id.name === 'push');
    const shape = pushClockShape(fn);
    return [shape.clockReads, shape.readsAboveOnIntent, pushClockShape(i.fn).readsAboveOnIntent];
  },
  { fn: PUSH_FN, text: SRC.scroll }, [3, 1, 0],
  'the third element is the live subject beside the manufactured one. Without it SC-R1\'s zero is the '
  + 'zero of a reader that cannot count above the boundary at all (D46).');

/* ------------------------------------------------------------------ *
 * F — the manifest entry.                                             *
 * ------------------------------------------------------------------ */
console.log('\nF — the source manifest');

pin('F1', 'X3 — journey/claim.js is in the source manifest, between its NAMED neighbours substrate.js and constants.js',
  (i) => {
    const m = i.src.match(/"journey\/chapters\/owned\/substrate\.js",\s*\n\s*"([^"]+)",\s*\n\s*"journey\/constants\.js",/);
    return m ? m[1] : 'NOT ADJACENT';
  }, { src: SRC.baseline }, 'journey/claim.js');

pin('F2', 'X3 — this order added exactly one manifest entry and touched nobody else\'s',
  (i) => (i.src.match(/"journey\/[a-z-]+\.js",/g) || []).filter((s) => s.includes('claim')).length,
  { src: SRC.baseline }, 1);

/* ------------------------------------------------------------------ *
 * G — this suite, audited (D44 / D76 / D86).                          *
 * ------------------------------------------------------------------ */
console.log('\nG — this suite, audited');

const PIN_TOKEN = maskedToken('p' + 'in');
const LIT_RE = literalPredicateRe(['L.same', PIN_TOKEN.whole], 2);
const LIT = literalPredicateHits(SRC_SELF, LIT_RE);
L.same('G1', 'D44 — bare-literal-predicate assertions in this suite', LIT.hits.length, 0,
  LIT.hits.join('\n        '));
L.same('G2', 'D46 — control: the D44 pattern DOES fire on a bare literal',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', true);"), true);
L.same('G3', 'D46 — control: it does NOT fire on a real comparison',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', a.length, 3);"), false);
L.same('G4', 'D45 — the D44 scan read this whole file, not a fragment', LIT.lineCount > 300, true);
L.same('G5', 'D76 — this self-scan MASKS its own token, so its stored rows are not occurrences it counts',
  [PIN_TOKEN.whole.length, SRC_SELF.includes("maskedToken('p' + 'in')")], [3, true]);

const TAUT = scanTautologyAst(SRC_SELF, new Map([['L.same', 2], [PIN_TOKEN.whole, PIN_RECEIVER]]));
L.same('G6', 'D86 — syntactic tautologies in this suite', TAUT.hits, [], TAUT.hits.join('\n        '));
L.same('G7', 'D86 — the AST pass reached this suite\'s call sites (a zero means the scan went blind, not that the file is clean)',
  [TAUT.sites > 0,
    TAUT.sites === REGISTRY.size + selfSiteSet('x', SRC_SELF, /(?:^|[^.\w$])L\.same\(/, null).length],
  [true, true]);
L.same('G8', 'D86 — control: the pass DOES fire on the shape a text scan cannot see',
  scanTautologyAst("L.same('X', 'what', 8, 8);", new Map([['L.same', 2]])).hits.length, 1);
L.same('G9', 'D76 — pin() call sites counted in this file equal the registry size',
  selfSiteSet('tools/test-input-claim.mjs', SRC_SELF,
    new RegExp(`^${PIN_TOKEN.head}${PIN_TOKEN.tail}\\(`), PIN_TOKEN.whole).length, REGISTRY.size);

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST. It targets a REAL pin
     (D1) and perturbs a field D1's reader does not read. The registry must
     score it CANNOT FAIL; a sweep that "kills" this is scoring noise and
     every [red] below it would be uninterpretable. It is deliberately NOT in
     the main list, because an unregistered id is reported BROKEN — a
     different verdict from the one this control exists to elicit. */
  const CTL = sweep([
    M('D1', 'D88 NULL CONTROL — a field D1\'s reader does not read is perturbed', null,
      (i) => ({ ...i, unreadDecoy: 'moved' })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['D1']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  const MUTANTS = [
    /* A — the type. */
    M('A1', 'a claim grows a second field — the magnitude rule acquires something to hold', [0],
      (i) => ({ ...i, claims: [Object.freeze({ dir: 1, gapMs: 0 }), i.claims[1], i.claims[2]] })),
    M('A2', 'manualClaim() re-derives a direction instead of carrying lastDir', [0],
      (i) => ({ ...i, fn: (d) => (d < 0 ? CLAIM.CLAIM_UNDIRECTED : i.fn(d)) })),
    M('A3', 'manualClaim() mints a fresh object per call', [0, 1, 2],
      (i) => ({ ...i, fn: (d) => Object.freeze({ dir: d > 0 ? 1 : d < 0 ? -1 : 0 }) })),
    M('A4', 'the relocated constant drifts off the literal journey.js still carries', [1],
      (i) => ({ ...i, constant: 60 })),
    M('A5', 'a clock read creeps into claim.js', [0],
      (i) => ({ ...i, claim: `${i.claim}\nconst z = performance.now();` })),
    M('A6', 'claim.js grows an import — the leaf stops being a leaf', [0],
      (i) => ({ ...i, claim: `import { SMOOTH_K } from './constants.js';\n${i.claim}` })),

    /* B — the port. */
    M('B1', 'the port grows a third member — a widened decision surface', [1, 2],
      (i) => ({ ...i, port: Object.freeze({ ...i.port, sinceInput: 0 }) })),
    M('B2', 'the registry answers with a default instead of a lookup', [1, 2],
      (i) => ({ ...i, of: (m) => (m === i.model ? i.port : i.port) })),
    M('B3', 'one shared port and one shared model answer for both — the registry stops being per-model', [1],
      (i) => ({ ...i, y: i.x })),
    M('B4', 'retire() acquires a `this` — J04a F5\'s receiver hazard, arriving', [0],
      (i) => ({ ...i, src: i.src.replace('answeredP = p;', 'answeredP = this.p;') })),

    /* C — the relocation. */
    M('C1', 'the wall test is evaluated BEFORE the freshness test — the clock read moves within the body', [2, 3],
      (i) => ({ ...i, src: mutateText(i.src, 'C1',
        '    if (!fresh) return null;\n    if (answeredP !== null) return null;',
        '    if (answeredP !== null) return null;\n    if (!fresh) return null;') })),
    M('C2', 'THE RELABELLING: claimNow() reads the published getter instead of the closure', [0],
      (i) => ({ ...i, body: i.body.replace('sinceInputMs()', 'scroll.sinceInput') })),
    M('C3', 'a line of the rationale goes missing from the block claim.js carries', [0, 2],
      (i) => ({ ...i, claim: i.claim.slice(0, -1) })),
    M('C4', 'the threshold is inlined back into the policy', [0],
      (i) => ({ ...i, body: i.body.replace('MANUAL_CLAIM_FRESH_MS', '50') })),
    M('C5', 'a twelfth clock read appears in scroll.js — the relocation register grows a row', [0],
      (i) => ({ ...i, scroll: `${i.scroll}\nconst z = performance.now();` })),
    M('C6', 'the port is published twice', [0],
      (i) => ({ ...i, scroll: `${i.scroll}\n  publishInputPort(model, {});` })),
    M('C7', 'a production module re-acquires the raw read — the relabelling arriving by the back door', [0],
      (i) => ({ ...i, production: `${i.production}\nconst z = scroll.sinceInput;` })),

    /* D — the oracle closure. The mutants are applied TO THE SLICED SOURCE,
       so each one is a change somebody could really make to journey/scroll.js
       and the grid is what catches it. */
    M('D1', 'the freshness comparison loosens to <=', [0, 3, 4],
      (i) => ({ ...i, claimNow: mutateText(i.claimNow, 'D1',
        'sinceInputMs() < MANUAL_CLAIM_FRESH_MS', 'sinceInputMs() <= MANUAL_CLAIM_FRESH_MS') })),
    M('D2', 'an axis of the grid is trimmed', [0, 2],
      (i) => ({ ...i, walls: i.walls.slice(1) })),

    /* E — the live trace. Perturbations of the OBSERVED data, proving the
       readers are sensitive to exactly the disagreement they report. */
    M('E1', 'the port and the raw reads disagree on one live state', [0, 3, 4],
      (i) => ({ ...i, obs: i.obs.map((o, j) => (j === 1 ? { ...o, live: !o.live } : o)) })),
    M('E2', 'a branch of claimNow() stops being entered on this trace', [0, 2],
      (i) => ({ ...i, obs: i.obs.map((o) => (o.stale ? { ...o, stale: false, walled: false } : o)) })),
    M('E3', 'lastDir leaves the domain manualClaim() is total over', [0],
      (i) => ({ ...i, obs: i.obs.map((o, j) => (j === 0 ? { ...o, lastDir: 2 } : o)) })),

    /* SC — §12 row 1, lifted from the retired J04b verifier. */
    M('SC-R1', 'THE FORBIDDEN VARIANT: a single delivery-time clock read is hoisted above onIntent(), so lastInput is stamped before the host close runs',
      /* The declared axis is what gate 4 CHECKS, not what the author hoped.
         The first draft declared five keys and gate 4 named the three that
         really move: `clockReads` and `lastInputStamps` both stay at 2, which
         is the point — the forbidden variant does not ADD a read or a stamp,
         it aliases one read into the other side's binding. A count could not
         see it; `stampSides` and `everyStampFromItsOwnSide` can. */
      ['everyStampFromItsOwnSide', 'readsAboveOnIntent', 'stampSides'],
      (i) => {
        const src = mutateText(SRC.scroll, 'SC-R1',
          '    if (onIntent && onIntent(kind) === false) {\n      const consumedAt = performance.now();',
          '    const at = performance.now();\n    if (onIntent && onIntent(kind) === false) {\n      const consumedAt = at;');
        const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module', loc: true, range: true });
        const fn = [...nodesOf(ast)].find((n) => n.type === 'FunctionDeclaration' && n.id && n.id.name === 'push');
        return { ...i, fn };
      }),
    M('SC-R2', 'the boundary derivation goes blind — with onIntent() unrecognised there is no side to be above, so the control can no longer tell the two apart',
      /* [0, 1], not [1]: with no boundary, the manufactured hoist is neither
         above nor below anything, so BOTH the injected read's count and the
         above-count move. Gate 4 named the second element. */
      [0, 1], (i) => ({ ...i, text: i.text.replaceAll('onIntent(kind)', 'onIntentX(kind)') })),

    /* F — the manifest. */
    M('F1', 'the entry is filed away from its named neighbours', null,
      (i) => ({ ...i, src: i.src.replace('    "journey/claim.js",\n', '') })),
    M('F2', 'a second claim-named entry appears in the manifest', null,
      (i) => ({ ...i, src: i.src.replace('"journey/claim.js",', '"journey/claim.js",\n    "journey/claim-extra.js",') })),
  ];

  const res = sweep(MUTANTS);
  L.discard();
  L.same('P1', 'D50 — mutants exercised', res.total, MUTANTS.length);
  L.same('P2', 'D50 — every mutant drove its named assertion red, on the axis it declared', res.bad, 0);
  /* D88 — THE DECLARED-EQUIVALENCE SET IS EMPTY. Every mutation above changes
     a quantity some pin reads; none is a refactoring that leaves behaviour
     intact. So the survivor set must be empty, and P0a is the separate proof
     that an empty survivor set is a finding rather than an instrument that
     cannot report one. */
  L.same('P3', 'D88 — the survivor set EQUALS the declared-equivalence set, which for this list is empty',
    res.gates.outputStill, []);
  L.same('P4', 'D74 — no mutant reported BROKEN (a rotted anchor is never a silent kill)',
    Object.entries(res.gates).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.join(',')}`), []);
  L.same('P5', 'D70 — harness faults during the sweep (re-raised after the report, never scored)', res.faults, []);
  L.same('P6', 'D58 — registered pins carrying no mutant', res.uncovered, []);
  L.same('P7', 'D58 — every registered pin is mutated exactly once; the null control is the only extra mutant and it ran separately',
    [REGISTRY.size, MUTANTS.length, CTL.total], [MUTANTS.length, MUTANTS.length, 1]);
  SENTINEL.reach('prove');
  exitCode = L.report() || exitCode;
  if (res.faults.length) {
    throw new HarnessFault(`${res.faults.length} harness fault(s) during the sweep:\n  ${res.faults.join('\n  ')}`);
  }
}

process.exit(exitCode);
