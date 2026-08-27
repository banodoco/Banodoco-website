/* ==================================================================== *
 * tools/self-controls.mjs — QA-06.
 *
 * THE ONE D44 LITERAL-PREDICATE SCAN AND THE ONE SITE-SET KEYING RULE.
 *
 * Two ideas, each re-derived across the tree:
 *
 * 1. D44's literal-predicate scan — an assertion whose predicate is the
 *    literal `true` or `false` cannot fail. Seven suites carry a scan for
 *    it; four of them carry the SAME regex, character for character, and one
 *    carries a wider one. D59 exists because a widened pattern mis-fires on
 *    the `check(area, name, pass)` ledger shape and would redden four
 *    healthy suites. The remedy is not a narrower scan everywhere, it is a
 *    scan that takes the CALLER'S ledger shape as a parameter — so a suite
 *    declares which token it asserts through, and gets a pattern that is
 *    exactly as wide as its own shape.
 *
 * 2. D54's site SET, with D64's keying rule and D76's masking rule. A count
 *    pin cannot distinguish "the subject legitimately grew" from "the scan
 *    went blind", and the maintainer under time pressure takes the cheap
 *    branch — bumping the number retires the control by the act of fixing
 *    it. A manifest catches a move; a count does not.
 *
 *      · a control over a FOREIGN file keys `file :: line :: text`;
 *      · a control over ITS OWN file keys `file :: text`, because the line
 *        component churns on every header edit and a red control repaired by
 *        bumping a number regenerates D54's failure mode inside D54's
 *        remedy (D64);
 *      · a self-scanning site set MASKS the token it counts, or every pinned
 *        row is itself an occurrence — measured once at a census doubling
 *        50 -> 100 (D76).
 *
 * Both readers run over COMMENT-STRIPPED source from tools/strip-comments.mjs
 * — the single shared, string-aware, template-interpolation-aware stripper.
 * A scan built on a regex stripper is measuring a mutilated file and the
 * failure is silent by construction: the stripper blanks a region, the scan
 * finds nothing there, and "0 hits" is the passing answer (S-3, D46).
 * ==================================================================== */

import { readFileSync } from 'node:fs';
import { stripComments } from './strip-comments.mjs';

/** Comment-blanked source, strings blanked too. Use for any scan whose
 *  subject is CODE STRUCTURE. Do not use where the specifier IS the string
 *  (an import scan) — pass `{ blankStrings: false }` there. */
export const code = (src, opts = { blankStrings: true }) => stripComments(src, opts);

/* ==================================================================== *
 * D44 — the literal-predicate scan.
 * ==================================================================== */

/** Build the literal-predicate pattern for a caller's own ledger shape.
 *
 *  @param tokens  the assertion tokens this suite asserts through, e.g.
 *                 ['L.same', 'pin'] or ['check', 'eq'].
 *  @param labels  how many LABEL arguments precede the predicate.
 *                 1 for `check(name, pass)`, 2 for `same(id, what, actual)`
 *                 and for C04's `check(area, name, pass)`.
 *
 *  D59 IN ONE PARAMETER. The widened receiver-agnostic pattern reddened four
 *  gated suites because it assumed one label. A suite states its own arity
 *  and the pattern is right for it; nothing is measured against a shape it
 *  does not have. */
export function literalPredicateRe(tokens, labels = 2) {
  if (!Array.isArray(tokens) || !tokens.length) throw new Error('literalPredicateRe: tokens required');
  if (!(labels >= 1 && labels <= 3)) throw new Error(`literalPredicateRe: labels out of range (${labels})`);
  const alt = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`\\b(?:${alt})\\s*\\(${'[^,]*,'.repeat(labels)}\\s*(?:true|false)\\s*[,)]`);
}

/** Every line of `src` whose assertion predicate is a bare literal.
 *  Returns `${lineNo}: ${trimmed}` rows — the rows themselves are the
 *  failure message, because "3 unfalsifiable assertions" is not actionable
 *  and three quoted lines are.
 *
 *  The source is comment-stripped first, so a commented-out example is not a
 *  hit; strings are blanked, so a source-shaped string in a FIXTURE is not
 *  one either. Both directions are worth a control in the calling suite —
 *  see `literalPredicateProbe`. */
export function literalPredicateHits(src, re) {
  const lines = code(src).split('\n');
  const hits = [];
  lines.forEach((line, n) => { if (re.test(line)) hits.push(`${n + 1}: ${line.trim()}`); });
  return { hits, lineCount: lines.length };
}

/** A one-line probe of the pattern, for the three controls D46 requires of
 *  any assert-zero scan: a bare literal IS a hit, a real comparison is NOT,
 *  and a commented-out bare literal is NOT.
 *
 *  D46 is why these exist at all: an assert-zero scan that has gone blind
 *  returns zero, which is the passing answer. The scan needs a reader that
 *  cannot go blind, and that reader is a positive control. */
export function literalPredicateProbe(re, sample) {
  return re.test(code(sample).split('\n')[0]);
}

/* ==================================================================== *
 * D54 / D64 / D76 — site sets.
 * ==================================================================== */

/** D76 — assemble a token so a self-scan's own stored rows are not hits.
 *  Returned split so the calling file never contains the whole token in one
 *  piece; the caller asserts that its own source contains the ASSEMBLY
 *  expression rather than the token, which is the property that can rot. */
export function maskedToken(token) {
  if (typeof token !== 'string' || token.length < 2) throw new Error('maskedToken: token too short to mask');
  return { head: token.slice(0, 1), tail: token.slice(1), whole: token };
}

/** Site set over a FOREIGN file — keyed `file :: line :: text` (D54).
 *  The line component belongs here and only here: the file is not the one
 *  being edited when the control's own header moves. */
export function foreignSiteSet(file, src, re, opts) {
  const lines = code(src, opts).split('\n');
  const rows = [];
  lines.forEach((line, n) => { if (re.test(line)) rows.push(`${file} :: ${n + 1} :: ${line.trim()}`); });
  return rows.sort();
}

/** Site set over the control's OWN file — keyed `file :: text` (D64).
 *  No line numbers, because they churn on every header edit and the cheapest
 *  repair for that churn is to re-baseline, which is the failure mode D54
 *  exists to prevent.
 *
 *  `mask` (D76) is applied to each stored row so the rows this control pins
 *  do not themselves become occurrences the control counts. Pass the token
 *  the pattern matches; it is replaced with a marker in the OUTPUT only. */
export function selfSiteSet(file, src, re, mask, opts) {
  const lines = code(src, opts).split('\n');
  const rows = [];
  lines.forEach((line) => {
    if (!re.test(line)) return;
    let text = line.trim();
    if (mask) text = text.split(mask).join(`<${mask.length}c>`);
    rows.push(`${file} :: ${text}`);
  });
  return rows.sort();
}

/* ==================================================================== *
 * THE `check(...)` LITERAL-PREDICATE SCAN KIT.
 *
 * QA-06: four byte-identical copies of the block below shipped in
 * tools/test-baked-lifecycle.mjs, tools/test-error-classes.mjs,
 * tools/test-renderer-resources.mjs and tools/test-spores-lifecycle.mjs
 * (the fourth differing only in comment wording), plus a FIFTH, NARROWER
 * copy in tools/test-portrait-remix.mjs and a sixth in
 * tools/test-portrait-paint.mjs. This is the same shape as the six
 * comment-strippers and it gets the same remedy.
 *
 * THE DIVERGENCE, MEASURED: test-portrait-remix.mjs's copy lacks the
 * block-bodied-thunk clause `(?:\{\s*return\s+)?` and terminates on
 * `[,)]` rather than `[,);}]`. It is therefore blind to three shapes the
 * other four catch — `check('x', () => { return true; })` and its number
 * and identity-inequality variants — while agreeing on two controls, so
 * the probe is not measuring nothing. Latent today (both scanners return 0
 * over that file), so it is a D53 service-life item, not a live defect,
 * and it is NOT repaired here: that file belongs to another order.
 * ==================================================================== */

// Optional `<ident>.` qualifier, the assertion name, an escape-tolerant
// quoted label, and an optional `() =>` thunk wrapper. The leading
// `(?:^|[^.\w$])` stops a longer identifier ending in the same letters from
// reading as an unqualified call.
export const SCAN_CALL = String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\.)?check\(\s*(['"\`])(?:\\[\s\S]|(?!\1)[\s\S])*?\1\s*,\s*(?:\(\s*\)\s*=>\s*(?:\{\s*return\s+)?)?`;
export const SCAN_SITE_RE = () => new RegExp(String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\.)?check\(`, 'g');
// Shape 1 — a constant in predicate position: true/false, a number, !0/!1,
// reached either directly, through a `() => …` thunk, or through a
// BLOCK-BODIED thunk `() => { return … }`. The block body is the one that
// matters most here: thunks are the calling convention in two of the four
// suites carrying this scan, so a block body is the natural way to write an
// assertion in them and it escaped the pattern entirely until R2.
// or a string literal. Each is decided at parse time.
export const SCAN_CONST_RE = () => new RegExp(SCAN_CALL + String.raw`(true|false|!\s*[01]|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*[,);}]`, 'g');
// Shape 2 — D44's addendum: `x === x` holds by construction, `x !== x` fails
// by construction, whatever x contains.
export const SCAN_IDENT_RE = () => new RegExp(SCAN_CALL + String.raw`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:===|!==|==|!=)\s*\2\s*[,);}]`, 'g');


// PC-3 — the synthetic positives. Fixture rows interpolate the assertion token
// through `SK` so the literal never appears in this file's source; a row
// written LITERALLY would be counted by the PC-1 census as a call site that is
// not one. It is the INTERPOLATION that does the work: the value of SK is
// immaterial — 'check' works exactly as well as 'ch' + 'eck', and the earlier
// wording here claimed otherwise. Measured, not assumed, in
// docs/code-health/evidence/2026-08-21-elegance-run-01/qa-03/sk-guard-probe.mjs.
// Only a MISSPELLED SK is caught automatically, by PC-3b; the interpolation
// itself is not self-checking, so do not "simplify" a row into a literal.
export const SK = 'ch' + 'eck';
export const SCAN_FIXTURES = [
  ['PC3-01', 'plain single-quoted literal', `  L.${SK}('a thing', true);`, 1],
  ['PC3-02', 'double-quoted label', `  L.${SK}("a thing", true);`, 1],
  ['PC3-03', 'template label', '  L.' + SK + '(`a thing`, false);', 1],
  ['PC3-04', 'multiline arguments', `  L.${SK}(\n    'a thing',\n    true,\n  );`, 1],
  ['PC3-05', 'NEW: escaped quote in the label', `  L.${SK}('it\\'s a thing', true);`, 1],
  ['PC3-06', 'apostrophe carried by a double-quoted label', `  L.${SK}("it's a thing", true);`, 1],
  ['PC3-07', 'NEW: bare unqualified call, no dotted prefix', `  ${SK}('a thing', true);`, 1],
  ['PC3-08', 'NEW: bare unqualified call, thunk-wrapped true', `  ${SK}('a thing', () => true);`, 1],
  ['PC3-09', 'NEW: bare unqualified call, thunk-wrapped false', `  ${SK}('a thing', () => false);`, 1],
  ['PC3-10', 'NEW: truthy numeric predicate', `  L.${SK}('a thing', 1);`, 1],
  ['PC3-11', 'NEW: falsy numeric predicate', `  L.${SK}('a thing', 0);`, 1],
  ['PC3-12', 'NEW: negated zero', `  L.${SK}('a thing', !0);`, 1],
  ['PC3-13', 'NEW: negated one', `  L.${SK}('a thing', !1);`, 1],
  ['PC3-14', 'NEW: string literal in predicate position', `  L.${SK}('a thing', 'yes');`, 1],
  ['PC3-15', 'NEW: identity comparison, always true (D44 addendum)', `  L.${SK}('a thing', x === x);`, 1],
  ['PC3-16', 'NEW: identity inequality, always false', `  L.${SK}('a thing', x !== x);`, 1],
  ['PC3-17', 'NEW: identity on a member path', `  L.${SK}('a thing', a.b.c === a.b.c);`, 1],
  ['PC3-18', 'CLEAN: a real comparison against a literal', `  L.${SK}('a thing', n === 3);`, 0],
  ['PC3-19', 'CLEAN: comparison whose right side is a literal', `  L.${SK}('a thing', x === true);`, 0],
  ['PC3-20', 'CLEAN: negation of a variable', `  L.${SK}('a thing', !x);`, 0],
  ['PC3-21', 'CLEAN: two distinct identifiers', `  L.${SK}('a thing', a === b);`, 0],
  ['PC3-22', 'CLEAN: a call result', `  L.${SK}('a thing', f(1));`, 0],
  ['PC3-23', 'CLEAN: a length comparison', `  L.${SK}('a thing', xs.length === 3);`, 0],
  ['PC3-24', 'CLEAN: the shape named inside a line comment', `  // L.${SK}('a thing', true);`, 0],
  ['PC3-25', 'CLEAN: the shape named inside a block comment', `  /* L.${SK}('a thing', true); */`, 0],
  ['PC3-26', 'CLEAN: a longer identifier ending in the assertion name', `  re${SK}('a thing', true);`, 0],
  ['PC3-27', 'CLEAN: a different assertion API taking the literal first', `  assert.ok(true, 'a thing');`, 0],
  ['PC3-28', 'NEW: block-bodied thunk returning a literal', `  ${SK}('a thing', () => { return true; });`, 1],
  ['PC3-29', 'NEW: block-bodied thunk returning false', `  ${SK}('a thing', () => { return false; });`, 1],
  ['PC3-30', 'CLEAN: block-bodied thunk returning a real comparison', `  ${SK}('a thing', () => { return n === 3; });`, 0],
  ['PC3-31', 'CLEAN: block-bodied thunk returning a call result', `  ${SK}('a thing', () => { return f(1); });`, 0],
];

const stripCommentsForScan = (src) => stripComments(src);

/** Scan `text` for assertion call SITES and for literal-predicate HITS.
 *  Comment-stripped through the one shared stripper, so a shape named in
 *  prose is not a hit and a `//` inside a string does not blank live code. */
export function scanLiteralPredicateText(text) {
  const stripped = stripCommentsForScan(text);
  const lines = text.split('\n');
  let sites = 0;
  {
    const re = SCAN_SITE_RE();
    while (re.exec(stripped)) sites++;
  }
  const hits = [];
  for (const [shape, re] of [['constant', SCAN_CONST_RE()], ['identity', SCAN_IDENT_RE()]]) {
    let m;
    while ((m = re.exec(stripped))) {
      const lineNo = stripped.slice(0, m.index + m[0].length - 1).split('\n').length;
      hits.push({ lineNo, shape, predicate: m[2], text: (lines[lineNo - 1] || '').trim() });
    }
  }
  hits.sort((a, b) => a.lineNo - b.lineNo);
  return { sites, hits };
}

/** The D44/D45/D46 audit: the 31 synthetic positives, the files-read pin, the
 *  PC-1 positive control and the assert-zero scan itself.
 *
 *  `selfPath` IS A PARAMETER AND MUST BE. The three shipped copies read
 *  `fileURLToPath(import.meta.url)` — correct while the function lived in the
 *  suite, and silently WRONG the moment it is shared, because it would then
 *  scan this module instead of the caller. That is D45's shape (a check that
 *  never runs over its subject) manufactured by the act of consolidating, and
 *  it is exactly what PC-2a/PC-1 exist to catch.
 *
 *  Returns the list of PROBLEMS (empty === clean); the caller folds a
 *  non-empty list into its exit code, as all three copies already did. */
export function auditLiteralPredicates(selfLabel, expectedSites, selfPath) {
  const problems = [];
  const say = (ok, id, what, detail) => {
    if (!ok) problems.push(`${id} ${what}${detail ? ' — ' + detail : ''}`);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${what}${detail ? ' — ' + detail : ''}`);
  };

  let runs = 0; let asExpected = 0; let yieldingHits = 0;
  for (const [id, what, snippet, want] of SCAN_FIXTURES) {
    runs++;
    const got = scanLiteralPredicateText(snippet).hits.length;
    if (got === want) asExpected++;
    else console.log(`  FIXTURE MISS ${id} ${what} — expected ${want} hit(s), scanner returned ${got}`);
    if (got > 0) yieldingHits++;
  }
  // D45: the loop's iteration count is a primary assertion pinned to a
  // non-zero literal, so an empty fixture table cannot pass silently.
  say(runs === 31, 'PC-3a', 'the synthetic-positive fixture table ran over every row (iteration pin)', `ran ${runs}, expected 31`);
  say(asExpected === 31, 'PC-3b', 'every fixture row returned exactly the hit count it was built for', `${asExpected}/31`);
  say(yieldingHits === 19, 'PC-3c', 'the scanner returned NON-ZERO on every row manufactured to be caught', `${yieldingHits}, expected 19`);

  // PC-2 — files-read pin: INPUTS, not matches.
  const inputs = [selfPath];
  const texts = inputs.map((p) => readFileSync(p, 'utf8'));
  say(texts.length === 1, 'PC-2a', 'the scan read exactly 1 input file (files-read pin, not a match count)', `read ${texts.length}`);
  say(texts[0].length > 0, 'PC-2b', 'the input file read back non-empty', `${texts[0].length} bytes`);

  const self = scanLiteralPredicateText(texts[0]);
  // PC-1 — the positive control. A 0 here means the scan is reading the wrong
  // bytes or the assertion helper was renamed, NOT that the file is clean.
  say(self.sites === expectedSites, 'PC-1', `the scan pattern still sees ${selfLabel}'s assertion call sites (census)`, `${self.sites}, expected ${expectedSites}`);
  for (const h of self.hits) console.log(`  HIT ${selfLabel}:${h.lineNo} [${h.shape}] ${h.text}`);
  say(self.hits.length === 0, 'D44', 'literal-predicate scan: 0 unfalsifiable assertions in this file', `${self.hits.length} hit(s) across ${texts[0].split('\n').length} lines`);
  return problems;
}

/* ==================================================================== *
 * D86 — THE SHAPE A REGEX CANNOT REACH.
 *
 * `HRING110` shipped unfalsifiable inside a gated suite:
 *
 *     L.same('HRING110', '…', seq2.join(''),
 *       'ggrrr…'.slice(0, seq2.length) === seq2.join('')
 *         ? seq2.join('') : seq2.join(''));
 *
 * BOTH ternary branches return `seq2.join('')`, so the expected side WAS the
 * actual side for every input. Every shape the regex scan above knows —
 * a bare literal, a self-identity between IDENTIFIERS — misses it, because
 * the predicate is a CALL. A call is opaque to a pattern by construction, and
 * a seventh widening of the pattern cannot change that.
 *
 * WHAT IS REACHABLE WITHOUT EVALUATION, and is closed here: SYNTACTIC
 * tautology. Parse the file, walk the assertion call sites, and compare
 * SUB-EXPRESSIONS to each other by normalised source text. That reaches
 * arbitrary expressions — calls included — where a regex reaches identifiers.
 *
 *   T1  a ConditionalExpression whose consequent and alternate are the same
 *       expression. UNCONDITIONAL: only one branch ever evaluates, so this is
 *       a no-op whatever the operands do. This is HRING110's exact shape.
 *   T2  an assertion whose ACTUAL and EXPECTED arguments are the same
 *       expression.
 *   T3  a comparison whose two sides are the same expression — D44's identity
 *       addendum, generalised from identifiers to any expression.
 *   T4  QA-08 — patterns.md ENGINE 1, the convenience variable that swallows
 *       the anchor: `const expected = gapOf(B); L.same(…, gapOf(B), expected)`.
 *       One step of LOCAL CONSTANT PROPAGATION, and only for a name bound
 *       exactly once, by `const`, with an initialiser, never reassigned. It
 *       is listed first in the run's own taxonomy and a reader of the old
 *       header would reasonably have believed it covered.
 *   T5  QA-08 — the tautology ONE CALL DEEP: an argument calls a helper
 *       defined once in the same file, and T1/T3 hold inside that helper's
 *       body. `const read = () => (c ? s.join('') : s.join('')); L.same(…,
 *       read(), 'gg')` is HRING110 the moment anybody extracts its ternary.
 *
 * T2–T5 evaluate their operand twice, or reason across a binding, so a subject
 * with side effects can in principle make them honest. T4 says REVIEW in the
 * row itself; T1 needs no such caveat.
 *
 * WHAT REMAINS OUT OF REACH, STATED PRECISELY RATHER THAN QUIETLY MISSED —
 * and the first two of these were inside the previous header's stated gap
 * only by accident, which is why they are now enumerated:
 *
 *   · a tautology knowable only by EVALUATING — `f(x) === g(x)` where `f` and
 *     `g` are different names bound to the same function, or a predicate that
 *     is constant for reasons no syntax shows. Executing arbitrary assertion
 *     operands is not something a scan may do.
 *   · MORE THAN ONE STEP of indirection. T4 propagates one const; a chain
 *     `const a = gapOf(B); const b = a;` is missed. T5 goes one call deep; a
 *     helper that calls a second helper is missed. Both are deliberate: each
 *     extra level multiplies the false-positive surface, and D59's rule is
 *     that reddening a healthy suite is worse than missing a latent shape.
 *   · anything reached through a `let`, a `var`, a parameter, a property, a
 *     destructuring pattern, or a name bound twice in the file. A scan that
 *     guessed at scope would have to model shadowing, and it does not.
 *   · anything CROSS-FILE. The subject is one source text.
 *   · a helper whose body is an expression that is a tautology only for the
 *     arguments this call site passes — the body is scanned as written, not
 *     as specialised.
 *
 * D63: a file that does not parse yields NO measurement. `scanTautologyAst`
 * throws with the cause named; callers must not convert that into a zero.
 * ==================================================================== */

import { parse } from 'espree';

/** Human-readable form of a node, for the message a hit prints. Not the
 *  comparison key — see `makeKeyer`. */
const nodeText = (src, n) => src.slice(n.start, n.end).replace(/\s+/g, ' ').trim();

/**
 * The comparison key for T1–T5: a node's TOKEN STREAM, joined by single
 * spaces, with a trailing comma before a closing bracket dropped.
 *
 * QA-08 / D88 — THIS WAS `src.slice(...).replace(/\s+/g, ' ').trim()`,
 * documented as *"whitespace-insensitive, so a reformatted duplicate is still
 * a duplicate."* It was whitespace-COLLAPSING, which is a different property:
 * it maps runs of whitespace to one space but keeps the space, so
 *
 *     drawSequenceFor(live, RAND)      -> `drawSequenceFor(live, RAND)`
 *     drawSequenceFor(\n  live,\n  RAND,\n)
 *                                      -> `drawSequenceFor( live, RAND, )`
 *
 * are different keys — and T1, T2 and T3 all miss the pair. That is not an
 * exotic evasion; it is how a linter wraps a long call, and HRING110 escaped
 * six text scans only because its operands were short enough to fit on one
 * line. The claim was untestable from outside too: ALL EIGHT rows of
 * TAUTOLOGY_FIXTURES were single-line, so the D46 reader that keeps the
 * assert-zero honest did not exercise the property the docstring asserted.
 * Multi-line rows are now in the table (TA9–TA12), so the claim and its
 * reader move together.
 *
 * Tokens rather than a whitespace-squash because `a instanceof b` and
 * `a\ninstanceof\nb` must agree while `a instanceof b` and `ainstanceofb`
 * must not; the token stream is the only normalisation that gets both right.
 * The trailing-comma rule is separate and deliberate: `f(a, b,)` and
 * `f(a, b)` are the same expression to the parser and to a reader.
 */
function makeKeyer(src, tokens) {
  const starts = tokens.map((t) => t.start);
  /* first token index whose start >= pos */
  const from = (pos) => {
    let lo = 0; let hi = tokens.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (starts[mid] < pos) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const cache = new Map();
  return (n) => {
    if (!n) return '';
    const ck = `${n.start}:${n.end}`;
    if (cache.has(ck)) return cache.get(ck);
    const parts = [];
    for (let i = from(n.start); i < tokens.length && tokens[i].end <= n.end; i++) {
      parts.push(src.slice(tokens[i].start, tokens[i].end));
    }
    const out = [];
    for (let k = 0; k < parts.length; k++) {
      if (parts[k] === ',' && (parts[k + 1] === ')' || parts[k + 1] === ']' || parts[k + 1] === '}')) continue;
      out.push(parts[k]);
    }
    const key = out.join(' ');
    cache.set(ck, key);
    return key;
  };
}

/** Collapse a ternary whose branches are identical to that branch, so T2 sees
 *  through the exact indirection HRING110 used to hide behind. */
function collapse(key, n) {
  let cur = n;
  while (cur && cur.type === 'ConditionalExpression'
    && key(cur.consequent) === key(cur.alternate)) {
    cur = cur.consequent;
  }
  return cur;
}

/** Does this subtree compute anything? T4's second guard — an initialiser
 *  with no call in it is a container or a literal, not a derivation. */
function containsCall(n) {
  let found = false;
  walk(n, (m) => { if (m.type === 'CallExpression' || m.type === 'NewExpression') found = true; });
  return found;
}

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) walk(c, visit); } else if (v && typeof v.type === 'string') walk(v, visit);
  }
}

const calleeText = (src, n) => (n.callee ? nodeText(src, n.callee) : '');

/* ==================================================================== *
 * QA-08 / D88 — RECEIVER SPECS, and the one the registry could not state.
 *
 * A receiver's entry in the map is one of:
 *
 *   n                              the adjacent pair: actual at n, expected
 *                                  at n + 1. `L.same(id, what, actual, exp)`
 *                                  is `2`.
 *   null                           this receiver has no actual/expected pair;
 *                                  T2 does not apply. `check(area, name,
 *                                  pass, value)` is null — D59.
 *   { actual, expected }           an explicit NON-ADJACENT pair.
 *   { actualCall: [f, a], expected }
 *                                  the actual is not an argument at all: it
 *                                  is argument `f` APPLIED TO argument `a`.
 *
 * The last form exists because of a live defect. `pin(id, what, reader,
 * input, expected, hint)` was declared `2` in both converted suites, so T2
 * compared the READER against the INPUT — never a tautology, never a hit —
 * and NOT ONE registry-pinned assertion was T2-scanned anywhere in the tree.
 * `null` would have been honest and would have covered nothing. A pin's
 * actual is `reader(input)`, so the tautology it can carry is QA-01's Engine
 * 2, the formula restated instead of its result:
 *
 *     pin('X', 'the row count', rowsOf, TABLE, rowsOf(TABLE))
 *
 * mutant-registry.mjs exports `PIN_RECEIVER` for exactly this, and a NUMERIC
 * declaration for a callee named `pin` is REFUSED rather than accepted — the
 * signature cannot support the claim, and D74's lesson is that the only thing
 * that reliably stops a shape regenerating is a check an author cannot
 * satisfy by forgetting the rule.
 * ==================================================================== */
const PIN_NAMES = new Set(['pin']);

function normaliseSpec(callee, spec) {
  if (spec === null || spec === undefined) return null;
  if (typeof spec === 'number') {
    if (PIN_NAMES.has(callee)) {
      throw new Error(`scanTautologyAst REFUSES: receiver "${callee}" is declared with the adjacent `
        + `actual/expected arity ${spec}, but pin(id, what, reader, input, expected) has no adjacent `
        + 'pair — argument 2 is the reader and argument 3 is its input, so T2 would compare a reader '
        + "against an input and never fire. Import PIN_RECEIVER from './mutant-registry.mjs' and "
        + 'declare that, or declare null to state plainly that T2 does not apply here.');
    }
    return { actual: spec, expected: spec + 1 };
  }
  if (typeof spec === 'object' && Number.isInteger(spec.expected)) {
    if (Array.isArray(spec.actualCall) && spec.actualCall.length === 2
      && spec.actualCall.every(Number.isInteger)) return { actualCall: spec.actualCall, expected: spec.expected };
    if (Number.isInteger(spec.actual)) return { actual: spec.actual, expected: spec.expected };
  }
  throw new Error(`scanTautologyAst: receiver "${callee}" has an unreadable spec ${JSON.stringify(spec)} `
    + '— expected a number, null, { actual, expected } or { actualCall: [f, a], expected }');
}

/**
 * Syntactic-tautology scan over a source text.
 *
 * @param src        the source (RAW — espree needs real syntax, not blanked text).
 * @param receivers  EITHER an array of callee texts (all sharing `actualIx`),
 *                   OR — and this is the form to prefer — a MAP from callee
 *                   text to that receiver's own SPEC (see above), with
 *                   `null` for a receiver that has no adjacent actual/expected
 *                   pair at all.
 *
 *                   D59 IS THIS PARAMETER, and it fired on this scan during
 *                   development. Swept with one global `actualIx: 2`, T2
 *                   reported `tools/test-portrait-baked.mjs:173` and `:216` as
 *                   tautologies. They are not: C04's ledger is
 *                   `check(area, name, pass, value)`, where argument 2 is the
 *                   PREDICATE and argument 3 is the value REPORTED for it, so
 *                   passing the same expression twice is the idiom. A widened
 *                   pattern that reddens a healthy suite is worse than a narrow
 *                   one that misses a latent shape — so arity is declared per
 *                   receiver and never assumed.
 * @param actualIx   default index for the array form.
 * @returns { hits, sites } — hits are `${line}: [T#] ${text}` rows; `sites` is
 *          the number of assertion call sites the AST actually reached, which
 *          is this scan's own positive control (a 0 means it read the wrong
 *          file or the receivers were renamed, NOT that the file is clean).
 * @throws  on a parse failure, naming the cause (D63).
 */
export function scanTautologyAst(src, receivers, actualIx = 2) {
  const declared = receivers instanceof Map ? receivers
    : new Map((Array.isArray(receivers) ? receivers : []).map((r) => [r, actualIx]));
  if (!declared.size) throw new Error('scanTautologyAst: receivers required');
  const arity = new Map([...declared].map(([callee, spec]) => [callee, normaliseSpec(callee, spec)]));
  let ast;
  try {
    ast = parse(src, {
      ecmaVersion: 'latest', sourceType: 'module', loc: true, range: true, tokens: true,
    });
  } catch (e) {
    throw new Error(`scanTautologyAst REFUSES: the subject does not parse — ${e.message}`, { cause: e });
  }
  const key = makeKeyer(src, ast.tokens || []);
  const { constInit, fnBody } = localBindings(ast);
  const hits = [];
  let sites = 0;
  const row = (n, shape, text) => hits.push(`${n.loc.start.line}: [${shape}] ${text.slice(0, 140)}`);

  /* T1 and T3 over one subtree — the two shapes that are tautologies wherever
     they sit, so they can be run over an assertion's arguments and, for T5,
     over the body of a helper those arguments call. `tag` renames them when
     they are found one call deep, so a reader can tell the two apart. */
  const identityShapes = (node, tag, where) => {
    walk(node, (m) => {
      if (m.type === 'ConditionalExpression' && key(m.consequent) === key(m.alternate)) {
        row(m, tag || 'T1', `both ternary branches are \`${nodeText(src, m.consequent)}\`${where}`);
        return;
      }
      if (m.type !== 'BinaryExpression') return;
      if (!['===', '!==', '==', '!='].includes(m.operator)) return;
      if (key(m.left) !== key(m.right)) return;
      row(m, tag || 'T3', `\`${nodeText(src, m.left)} ${m.operator} ${nodeText(src, m.right)}\`${where}`);
    });
  };

  /* T4 — one step of local constant propagation. A side that is a lone
     identifier is replaced by the initialiser of its `const` binding, when
     that name is bound exactly once in the file and never reassigned. */
  const propagate = (n) => {
    if (!n || n.type !== 'Identifier') return n;
    const init = constInit.get(n.name);
    return init || n;
  };

  walk(ast, (n) => {
    if (n.type !== 'CallExpression' || !arity.has(calleeText(src, n))) return;
    sites++;
    const spec = arity.get(calleeText(src, n));
    const args = n.arguments || [];

    // T1 and T3 — anywhere inside the arguments.
    for (const a of args) identityShapes(a, null, '');

    // T2 — actual and expected are the same expression (after T1 collapse),
    // and T4 — after one step of local constant propagation as well.
    if (spec) {
      const need = spec.actualCall ? Math.max(...spec.actualCall, spec.expected) : Math.max(spec.actual, spec.expected);
      if (args.length > need) {
        const e = collapse(key, args[spec.expected]);
        const aKey = spec.actualCall
          ? `${key(collapse(key, args[spec.actualCall[0]]))} ( ${key(collapse(key, args[spec.actualCall[1]]))} )`
          : key(collapse(key, args[spec.actual]));
        const eKey = key(e);
        if (aKey && eKey && aKey === eKey) {
          row(n, 'T2', `actual and expected are both \`${nodeText(src, e)}\``);
        } else if (aKey && eKey) {
          /* T4 — patterns.md Engine 1: the convenience variable that swallows
             the anchor. `const expected = gapOf(B); L.same(…, gapOf(B), expected)`
             is `gapOf(B) === gapOf(B)` with one binding in between, and the
             taxonomy lists it FIRST. Reported as REVIEW: propagation is sound
             only if the initialiser has no side effects, which syntax cannot
             decide. */
          const eSub = propagate(args[spec.expected]);
          const aSub = spec.actualCall ? null : propagate(args[spec.actual]);
          const eMoved = eSub !== args[spec.expected];
          const aMoved = aSub !== null && aSub !== args[spec.actual];
          const ePropKey = eMoved ? key(collapse(key, eSub)) : eKey;
          const aPropKey = aMoved ? key(collapse(key, aSub)) : aKey;
          /* TWO GUARDS, and both were written because the first draft reddened
             a healthy gated suite — D59's rule, met by measurement rather than
             by assertion:
             (1) ONE SIDE ONLY. `const a = f(); const b = f(); same(id, w, a, b)`
                 is the DETERMINISM idiom — calling a pure function twice on
                 purpose is the assertion, not a tautology. Engine 1 is
                 asymmetric: one side is the raw expression and the other is a
                 const bound to it. Measured live at
                 tools/test-portrait-dealer.mjs:50.
             (2) THE CONST MUST BE COMPUTED. `const broken = []` mutated by
                 `push()` and then compared against `[]` is an assert-zero, not
                 a restatement; an initialiser with no call in it is not
                 "derived from the subject". Measured live at
                 tools/test-ring-split.mjs:1712. */
          if (aPropKey === ePropKey && (eMoved !== aMoved) && containsCall(eMoved ? eSub : aSub)) {
            row(n, 'T4', `REVIEW — actual and expected are both \`${aPropKey}\` once a single-binding `
              + 'const is propagated one step');
          }
        }
      }
    }

    // T5 — the tautology one call deep. An argument calls a locally-defined
    // helper by name; the helper's BODY is scanned for T1/T3. This is the
    // shape HRING110 would take the moment anyone extracted its ternary.
    // Depth is exactly one, by construction, and that is stated rather than
    // implied — see the residual-gap note in the header.
    for (const a of args) {
      walk(a, (m) => {
        if (m.type !== 'CallExpression' || !m.callee || m.callee.type !== 'Identifier') return;
        const body = fnBody.get(m.callee.name);
        if (!body) return;
        identityShapes(body, 'T5', ` — inside \`${m.callee.name}()\`, one call deep`);
      });
    }
  });

  /* One row per (line, shape, text); a helper called from ten assertions is
     one defect, not ten. */
  const unique = [...new Set(hits)];
  unique.sort((x, y) => parseInt(x, 10) - parseInt(y, 10));
  return { hits: unique, sites };
}

/**
 * Local single-binding tables for T4 and T5.
 *
 *  · `constInit` — name -> initialiser node, for every `const NAME = expr`
 *    declared EXACTLY ONCE in the file and never the target of an assignment
 *    or an update. One binding per name is the whole safety argument: with two
 *    bindings the scan would have to resolve scope, and a scan that guesses at
 *    scope reddens healthy code, which D59 says is worse than missing a latent
 *    shape.
 *  · `fnBody` — name -> body node, for a function declared exactly once, as a
 *    declaration or as a `const NAME = () => …` / `const NAME = function …`.
 */
function localBindings(ast) {
  const constCount = new Map();
  const constNode = new Map();
  const fnCount = new Map();
  const fnNode = new Map();
  const unsafe = new Set(); // reassigned, or bound by let/var, or bound twice
  const bump = (map, k) => map.set(k, (map.get(k) || 0) + 1);

  walk(ast, (n) => {
    if (n.type === 'AssignmentExpression' && n.left && n.left.type === 'Identifier') unsafe.add(n.left.name);
    if (n.type === 'UpdateExpression' && n.argument && n.argument.type === 'Identifier') unsafe.add(n.argument.name);
    if (n.type === 'FunctionDeclaration' && n.id) { bump(fnCount, n.id.name); fnNode.set(n.id.name, n.body); }
    if (n.type !== 'VariableDeclaration') return;
    for (const d of n.declarations || []) {
      if (!d.id || d.id.type !== 'Identifier') continue;
      const name = d.id.name;
      /* A `let` or `var` binding is out of reach by construction: its value at
         the assertion is a question about control flow, not about syntax. */
      if (n.kind !== 'const' || !d.init) { unsafe.add(name); continue; }
      if (d.init.type === 'ArrowFunctionExpression' || d.init.type === 'FunctionExpression') {
        bump(fnCount, name);
        fnNode.set(name, d.init.body);
        continue;
      }
      bump(constCount, name);
      constNode.set(name, d.init);
    }
  });

  const ok = (name, counts) => counts.get(name) === 1 && !unsafe.has(name)
    && !(constCount.has(name) && fnCount.has(name));
  const constInit = new Map();
  for (const [name, node] of constNode) if (ok(name, constCount)) constInit.set(name, node);
  const fnBody = new Map();
  for (const [name, node] of fnNode) if (ok(name, fnCount)) fnBody.set(name, node);
  return { constInit, fnBody };
}

/** The D46 positive controls for `scanTautologyAst`'s zero, as a table so a
 *  caller pins the SET of shapes the scan can see rather than a bare count.
 *  Row 1 is HRING110's exact form, reduced. */
export const TAUTOLOGY_FIXTURES = [
  ['TA1', 'HRING110: a ternary whose branches are identical calls',
    "L.same('x', 'w', s.join(''), a === s.join('') ? s.join('') : s.join(''));", 2],
  ['TA2', 'actual and expected are the same call',
    "L.same('x', 'w', s.join(''), s.join(''));", 1],
  ['TA3', 'a self-comparison between two identical calls',
    "L.same('x', 'w', s.join('') === s.join(''), true);", 1],
  ['TA4', 'a self-comparison between member paths (D44 addendum, generalised)',
    "L.same('x', 'w', a.b.c === a.b.c, true);", 1],
  ['TA5', 'CLEAN: a real comparison against a literal',
    "L.same('x', 'w', s.join(''), 'ggrr');", 0],
  ['TA6', 'CLEAN: a ternary with different branches',
    "L.same('x', 'w', a ? p.join('') : q.join(''), 'ggrr');", 0],
  ['TA7', 'CLEAN: two different calls compared',
    "L.same('x', 'w', p.join('') === q.join(''), true);", 0],
  ['TA8', 'CLEAN: the shape named inside a comment reaches no call site',
    "// L.same('x', 'w', s.join(''), s.join(''));", 0],
  /* QA-08 / D88 — the rows that test the NORMALISATION CLAIM. Every row above
     is single-line, so the table could not tell a whitespace-insensitive key
     from a whitespace-collapsing one, and the shipped key was the latter while
     the docstring said the former. TA9 and TA10 are the shapes a linter
     produces for a long call; TA11 and TA12 are their clean twins, so a key
     that normalised too much would redden here instead of passing silently. */
  ['TA9', 'NEW: identical branches, one of them wrapped as a linter wraps a long call',
    "L.same('x', 'w', s.join(''),\n  a ? drawSequenceFor(live, RAND) : drawSequenceFor(\n    live,\n    RAND,\n  ));", 1],
  ['TA10', 'NEW: actual and expected the same expression, the expected side line-wrapped',
    "L.same('x', 'w', drawSequenceFor(live, RAND), drawSequenceFor(\n    live,\n    RAND,\n  ));", 1],
  ['TA11', 'CLEAN: a line-wrapped call against a DIFFERENT call is still clean',
    "L.same('x', 'w', drawSequenceFor(live, RAND), drawSequenceFor(\n    baked,\n    RAND,\n  ));", 0],
  ['TA12', 'CLEAN: whitespace inside a string literal is content, not formatting',
    "L.same('x', 'w', label, 'a  b');", 0],
  /* QA-08 — Engine 1 and the one-call-deep shape, the two the header used to
     leave outside its own stated gap. */
  ['TA13', 'NEW: Engine 1 — the expectation derived from the subject, one const away',
    "const expected = gapOf(B);\nL.same('x', 'w', gapOf(B), expected);", 1],
  ['TA14', 'CLEAN: the same shape where the const is a different expression',
    "const expected = gapOf(A);\nL.same('x', 'w', gapOf(B), expected);", 0],
  ['TA15', 'CLEAN: Engine 1 blocked by a second binding of the same name',
    "const expected = gapOf(B);\nfunction f() { const expected = 1; return expected; }\nL.same('x', 'w', gapOf(B), expected);", 0],
  ['TA16', 'NEW: a tautology hidden one call deep in a local helper',
    "const read = () => (c ? s.join('') : s.join(''));\nL.same('x', 'w', read(), 'gg');", 1],
  ['TA17', 'CLEAN: the same helper with different branches',
    "const read = () => (c ? p.join('') : q.join(''));\nL.same('x', 'w', read(), 'gg');", 0],
  /* QA-08 — T4's two guards, each a live false positive the first draft
     produced against a healthy gated suite. They are fixtures, not prose,
     because the guard is the load-bearing part of the shape. */
  ['TA18', 'CLEAN: the determinism idiom — the same call bound twice on purpose',
    "const a = dealFor(0);\nconst b = dealFor(0);\nL.same('x', 'w', a, b);", 0],
  ['TA19', 'CLEAN: a const container mutated in place, compared against its empty literal',
    "const broken = [];\nrows.forEach((r) => broken.push(r));\nL.same('x', 'w', broken, []);", 0],
];
