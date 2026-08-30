#!/usr/bin/env node
// ---------------------------------------------------------------------------
// tools/test-comment-stripper.mjs — the fixture suite for tools/strip-comments.mjs
//
// S-3 / D67. Five separate regex comment-strippers shipped in this repository,
// none of which tracked string, template or regex-literal state. Each of them
// silently blanked live code, and because every scan built on one is an
// assert-zero scan, "0 hits" was the PASSING answer (D46). This suite is the
// guarantee that the single shared implementation does not regress into the
// same shape.
//
// HOW TO READ THE FIXTURE TABLE
// -----------------------------
// Every expected output is a LITERAL, never a transformation of the input and
// never a call into the subject. Blanked characters are written as MIDDLE DOTS
// so that a reviewer can count them; `render()` maps dot -> space and does
// nothing else. That is a rendering of a literal, not a derivation from an
// actual.
//
// D73. Every fixture that contains a comment delimiter is ASSEMBLED FROM
// FRAGMENTS (`SS`, `SE`, `DS`, `BQ`, `ITP`). Not one of them is written
// literally, so this file cannot terminate its own comment or open one. The
// order that recorded D73 shipped a block-comment terminator inside the
// sentence describing that hazard, and only the exit code caught it — an abort
// sentinel is installed by code that must first parse.
//
// PHASES, each with its own abort sentinel (D57). A crash after one phase's
// ledger would otherwise leave that phase's reassuring N/N as the last line.
// The sentinels are SILENT on a clean run.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stripComments, stripInvariants } from './strip-comments.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SUBJECT = join(HERE, 'strip-comments.mjs');
const SELF = join(HERE, 'test-comment-stripper.mjs');

/* ================================================================== *
 * D70 — GUARD THROWS ARE TAGGED AND RE-RAISED.                        *
 *                                                                     *
 * A harness that catches exceptions from the code it mutates must     *
 * distinguish a throw FROM THE SUBJECT (evidence) from a throw from   *
 * ITS OWN GUARDS (a harness failure). One order's anchor-miss guard    *
 * threw inside measure(), was caught by prove(), was scored `proved`,  *
 * and reported 16/16 falsifiable with ZERO mutation having occurred.   *
 * ================================================================== */
class HarnessError extends Error {
  constructor(msg) { super(msg); this.name = 'HarnessError'; }
}
const harnessFail = (msg) => { throw new HarnessError(msg); };

/* ================================================================== *
 * LEDGER + ABORT SENTINELS (D57)                                      *
 * ================================================================== */
const PHASES = ['fixtures', 'invariants', 'consumers', 'mutants'];
const reported = new Set();
const rows = [];
let failures = 0;

function check(id, what, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const pass = a === e;
  if (!pass) failures++;
  rows.push({ id, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${what}${pass ? '' : `\n     actual:   ${a}\n     expected: ${e}`}`);
  return pass;
}

function endPhase(name, count) {
  if (!PHASES.includes(name)) harnessFail(`unknown phase ${name}`);
  reported.add(name);
  console.log(`-- phase ${name}: ${count} assertion(s) --\n`);
}

// One sentinel PER REPORTING PHASE, not one per process: a crash after the
// third phase's ledger leaves three reassuring counts as the last thing
// printed. Silent when every phase reported — a sentinel that speaks on
// success is how a real abort gets dismissed as noise.
process.on('exit', () => {
  for (const p of PHASES) {
    if (!reported.has(p)) console.log(`FAIL test-comment-stripper phase '${p}' ABORTED before reporting`);
  }
});

/* ================================================================== *
 * D63 — REFUSE TO REPORT ON UNTRUSTWORTHY INPUTS.                     *
 * A qualified number is read as a number.                             *
 * ================================================================== */
const sha = (s) => createHash('sha256').update(s).digest('hex');
const SUBJECT_SRC_AT_START = readFileSync(SUBJECT, 'utf8');
const SUBJECT_HASH = sha(SUBJECT_SRC_AT_START);

function refuse(cause) {
  console.log(`\nINCONCLUSIVE — no measurement reported.\n  cause: ${cause}`);
  process.exit(2);
}

/* ================================================================== *
 * PHASE 1 — THE FIXTURE TABLE                                         *
 * ================================================================== */
// Fragments. Nothing below writes a comment delimiter literally (D73).
const SS = `/${'*'}`;          // slash-star
const SE = `${'*'}/`;          // star-slash
const DS = `${'/'}${'/'}`;     // double slash
const BQ = String.fromCharCode(96);
const ITP = `$${'{'}`;
const render = (s) => s.split('·').join(' ');

// [ name, input, expectedRendered, opts ]
const FIXTURES = [
  // ---- shape 1: a block-comment opener that is NOT a comment -------------
  ['slashstar in single-quoted string',
    `const a = '${SS} x ${SE}'; const b = 1;`,
    `const a = '${SS} x ${SE}'; const b = 1;`],
  ['slashstar in double-quoted string',
    `const a = "${SS} x ${SE}"; const b = 1;`,
    `const a = "${SS} x ${SE}"; const b = 1;`],
  ['slashstar in template literal',
    `const a = ${BQ}${SS} x ${SE}${BQ}; const b = 1;`,
    `const a = ${BQ}${SS} x ${SE}${BQ}; const b = 1;`],
  ['slashstar inside a interpolation',
    `const a = ${BQ}p ${ITP} "${SS}" } q${BQ}; const b = 1;`,
    `const a = ${BQ}p ${ITP} "${SS}" } q${BQ}; const b = 1;`],
  ['slashstar in a regex character class',
    `const r = /[${SS}]/; const b = 1;`,
    `const r = /[${SS}]/; const b = 1;`],

  // ---- shape 2: a line-comment opener that is NOT a comment --------------
  ['doubleslash in single-quoted string',
    `const u = 'http:${DS}x'; const b = 1;`,
    `const u = 'http:${DS}x'; const b = 1;`],
  ['doubleslash in double-quoted string',
    `const u = "http:${DS}x"; const b = 1;`,
    `const u = "http:${DS}x"; const b = 1;`],
  ['doubleslash in template literal',
    `const u = ${BQ}http:${DS}x${BQ}; const b = 1;`,
    `const u = ${BQ}http:${DS}x${BQ}; const b = 1;`],
  ['doubleslash inside a interpolation',
    `const u = ${BQ}p ${ITP} "${DS}" } q${BQ}; const b = 1;`,
    `const u = ${BQ}p ${ITP} "${DS}" } q${BQ}; const b = 1;`],
  ['doubleslash in a regex character class',
    `const r = /[${DS}]/; const b = 1;`,
    `const r = /[${DS}]/; const b = 1;`],

  // ---- shape 3: escapes, which is where the quote-scanners went wrong ----
  ['escaped quote then slashstar in a string',
    `const a = 'it\\'s ${SS} fine ${SE}'; const b = 1;`,
    `const a = 'it\\'s ${SS} fine ${SE}'; const b = 1;`],
  ['escaped backtick then doubleslash in a template',
    `const a = ${BQ}x\\${BQ} ${DS} y${BQ}; const b = 1;`,
    `const a = ${BQ}x\\${BQ} ${DS} y${BQ}; const b = 1;`],

  // ---- shape 4: division must not be read as a regex ---------------------
  ['division is not a regex literal',
    `const q = total / 2; const w = count / 3; ${DS} note`,
    `const q = total / 2; const w = count / 3; ·······`],

  // ---- shape 4b: division FOLLOWED BY a real comment ---------------------
  // Added because mutant m5 ("every slash opens a regex") SURVIVED the table
  // without it. The `/` case alone is not enough: m5's regex swallows from
  // the division slash up to the NEXT slash, which is the comment's own
  // opener, so the comment is never recognised. D50 — a mutant reporting
  // "cannot fail" is a claim about the mutant until proven otherwise, and
  // here the claim was false: the gap was in the fixtures.
  ['division followed by a real block comment on the same line',
    `const a = b / c ${SS} real ${SE} + d;`,
    'const a = b / c ·········· + d;'],

  // ---- shape 5: nested templates -----------------------------------------
  ['nested template carrying a slashstar',
    `const n = ${BQ}a ${ITP}${BQ}b ${SS} c${BQ}} d${BQ};`,
    `const n = ${BQ}a ${ITP}${BQ}b ${SS} c${BQ}} d${BQ};`],

  // ---- the POSITIVE direction: real comments MUST be blanked -------------
  ['a real line comment is blanked',
    `const a = 1; ${DS} real`,
    'const a = 1; ·······'],
  ['a real block comment is blanked, newline kept',
    `const a = 1; ${SS} real\n more ${SE} const b = 2;`,
    'const a = 1; ·······\n········ const b = 2;'],
  ['an unterminated block comment blanks to EOF',
    `const a = 1; ${SS} to the end`,
    'const a = 1; ·············'],

  // ---- THE PRODUCTION SHAPE: journey/journey.js:18 ------------------------
  // A LINE comment containing a slash-star. Every regex stripper in the tree
  // ran its block-comment pass FIRST, over raw source, so this opened a
  // comment that ran to the next terminator — 31 lines of journey.js,
  // its entire import block among them.
  ['slashstar inside a line comment opens nothing',
    `${DS} see chapters/${'*'}.js\nconst a = 1;`,
    '····················\nconst a = 1;'],

  // ---- blankStrings mode --------------------------------------------------
  ['blankStrings blanks contents, keeps delimiters',
    "const s = 'ab'; const t = 1;",
    "const s = '··'; const t = 1;", { blankStrings: true }],
  ['blankStrings keeps interpolation code intact',
    `const n = ${BQ}a${ITP}x+1}b${BQ};`,
    `const n = ${BQ}·${ITP}x+1}·${BQ};`, { blankStrings: true }],
];

// D45 — the fixture count is a literal, asserted as a PRIMARY assertion, and
// D54/D64 — the site SET is pinned too, keyed `file :: text` because this
// control runs over its own file and a line component would churn on every
// header edit. Adding a fixture requires ADDING A ROW, which is a deliberate
// act with a visible subject; a blind scan yields the empty set, which cannot
// be repaired by editing a number.
const FIXTURE_COUNT = 21;
const FIXTURE_SITES = [
  'test-comment-stripper.mjs :: slashstar in single-quoted string',
  'test-comment-stripper.mjs :: slashstar in double-quoted string',
  'test-comment-stripper.mjs :: slashstar in template literal',
  'test-comment-stripper.mjs :: slashstar inside a interpolation',
  'test-comment-stripper.mjs :: slashstar in a regex character class',
  'test-comment-stripper.mjs :: doubleslash in single-quoted string',
  'test-comment-stripper.mjs :: doubleslash in double-quoted string',
  'test-comment-stripper.mjs :: doubleslash in template literal',
  'test-comment-stripper.mjs :: doubleslash inside a interpolation',
  'test-comment-stripper.mjs :: doubleslash in a regex character class',
  'test-comment-stripper.mjs :: escaped quote then slashstar in a string',
  'test-comment-stripper.mjs :: escaped backtick then doubleslash in a template',
  'test-comment-stripper.mjs :: division is not a regex literal',
  'test-comment-stripper.mjs :: division followed by a real block comment on the same line',
  'test-comment-stripper.mjs :: nested template carrying a slashstar',
  'test-comment-stripper.mjs :: a real line comment is blanked',
  'test-comment-stripper.mjs :: a real block comment is blanked, newline kept',
  'test-comment-stripper.mjs :: an unterminated block comment blanks to EOF',
  'test-comment-stripper.mjs :: slashstar inside a line comment opens nothing',
  'test-comment-stripper.mjs :: blankStrings blanks contents, keeps delimiters',
  'test-comment-stripper.mjs :: blankStrings keeps interpolation code intact',
];

/** Run the table. Returns the failing row names — used by the mutant phase,
 *  which is why it is a function and not a top-level loop. */
function runFixtures(strip) {
  const failed = [];
  let ran = 0;
  for (const [name, input, expectedDots, opts] of FIXTURES) {
    ran++;
    let got;
    try {
      got = strip(input, opts);
    } catch (e) {
      if (e instanceof HarnessError) throw e;   // D70: never eat our own guard
      got = `THREW: ${e.message}`;
    }
    if (got !== render(expectedDots)) failed.push(name);
  }
  if (ran !== FIXTURE_COUNT) {
    harnessFail(`fixture loop ran ${ran} times, expected the literal ${FIXTURE_COUNT}`);
  }
  return failed;
}

{
  const failed = runFixtures(stripComments);
  let n = 0;
  for (const [name, input, expectedDots, opts] of FIXTURES) {
    n++;
    check(`FX${String(n).padStart(2, '0')}`, name, stripComments(input, opts), render(expectedDots));
  }
  // D45 — the loop's iteration count, pinned to a non-zero literal, as a
  // PRIMARY assertion. A table that silently emptied would otherwise pass.
  check('FXC1', 'the fixture loop ran exactly its literal count', n, FIXTURE_COUNT);
  check('FXC2', 'the fixture SITE SET, by name (D54/D64: a manifest catches a move)',
    FIXTURES.map(([name]) => `test-comment-stripper.mjs :: ${name}`), FIXTURE_SITES);
  check('FXC3', 'no fixture row failed', failed, []);
  // D46 POSITIVE CONTROL on the assert-zero row above: the runner CAN report a
  // failure. A runner stuck on "nothing failed" would pass FXC3 forever.
  check('FXC4', 'CONTROL: a deliberately wrong stripper fails rows (FXC3 is not stuck on empty)',
    runFixtures((s) => s.split(SS).join('  ')).length > 0, true);
  // D46 INPUTS-READ PIN, on the SUBJECT rather than on the count of matches.
  check('FXC5', 'the subject module was read and is non-trivial (inputs-read pin)',
    SUBJECT_SRC_AT_START.length > 4000, true);
  // AN INNOCENT CONTROL THAT IS SECRETLY A DEFECT MAKES EVERY GREEN BESIDE IT
  // MEANINGLESS. Most rows above expect the input back UNCHANGED, and an
  // identity expectation is trivially satisfiable by a malformed input that
  // the stripper happens to walk off the end of. So pin the property that
  // makes those rows genuinely clean: every fixture input is REAL JAVASCRIPT,
  // and so is every stripped output.
  // The ONE row whose input is deliberately not valid JavaScript, named with
  // its reason rather than absorbed into a count. An unterminated block
  // comment IS malformed source — that is the point of the row: the stripper
  // must not run off the end or throw on it.
  const DELIBERATELY_MALFORMED = ['an unterminated block comment blanks to EOF'];
  const unparsable = (texts) => texts.filter((t) => {
    try { void new Script(t); return false; } catch { return true; }
  });
  const malformedInputs = FIXTURES
    .filter(([, input]) => unparsable([input]).length === 1).map(([name]) => name);
  check('FXC6', 'the only fixture INPUT that is not valid JavaScript is the declared one',
    malformedInputs, DELIBERATELY_MALFORMED);
  check('FXC7', 'every stripped OUTPUT parses as JavaScript',
    unparsable(FIXTURES.map(([, input, , opts]) => stripComments(input, opts))), []);
  // D46 positive control on those two zeroes: the parse probe CAN say no.
  check('FXC8', 'CONTROL: the parse probe rejects text that is not JavaScript',
    unparsable(['const = = ;']).length, 1);
  endPhase('fixtures', FIXTURE_COUNT + 8);
}

/* ================================================================== *
 * PHASE 2 — THE TWO INVARIANTS, OVER REAL REPOSITORY FILES            *
 *                                                                     *
 * Length preservation, because V8 coverage ranges are byte offsets    *
 * into the ORIGINAL text; and line preservation, because every        *
 * consumer derives a line number from the stripped text and reads     *
 * that line out of the original. R1's F-5 named the second as the     *
 * term the coverage floor's PC-0 was missing.                         *
 * ================================================================== */
const INVARIANT_FILES = [
  'journey/journey.js', 'journey/ui.js', 'journey/rail.js', 'journey/scroll.js',
  'journey/ownership.js', 'journey/structure.js', 'journey/chapter-contract.js',
  'journey/chapters/connect/tendrils.js', 'tools/strip-comments.mjs',
  'tools/test-frame-order.mjs', 'tools/test-coverage-floor.mjs',
  /* SUBSTITUTED 2026-08-22. The twelfth row was tools/verify-j04b.mjs, which
     is retired out of tools/ with the rest of the one-shot move verifiers.
     It is REPLACED rather than dropped: this list is a CORPUS — twelve real
     files the two invariants must hold over — and a corpus that shrinks every
     time a file moves stops being evidence. The replacement is the largest
     surviving suite in the tree, so the corpus keeps a big, comment-dense,
     template-and-regex-heavy member, which is what verify-j04b was here for. */
  'tools/test-chapter-contract.mjs',
];
const INVARIANT_FILE_COUNT = 12;

{
  let read = 0;
  const badLength = [], badLines = [];
  for (const rel of INVARIANT_FILES) {
    let src;
    try {
      src = readFileSync(join(REPO, rel), 'utf8');
    } catch (e) {
      // D63 — an input we cannot trust means NO number, named cause, exit != 0.
      refuse(`could not read invariant input ${rel}: ${e.message}`);
    }
    read++;
    for (const opts of [undefined, { blankStrings: true }]) {
      const inv = stripInvariants(src, opts);
      if (!inv.length) badLength.push(rel);
      if (!inv.lines) badLines.push(rel);
    }
  }
  if (read !== INVARIANT_FILE_COUNT) {
    harnessFail(`invariant loop read ${read} files, expected the literal ${INVARIANT_FILE_COUNT}`);
  }
  check('IV1', 'the invariant loop read exactly its literal count of files (D45/D46 inputs pin)',
    read, INVARIANT_FILE_COUNT);
  check('IV2', 'length is preserved on every real file, both modes', badLength, []);
  check('IV3', 'line count is preserved on every real file, both modes', badLines, []);
  // D46 positive controls: both assert-zero rows above CAN go non-empty.
  const shortener = (s) => s.split(SS).join('');
  check('IV4', 'CONTROL: a length-changing stripper is detected as such',
    shortener(`a${SS}b${SE}`).length === `a${SS}b${SE}`.length, false);
  check('IV5', 'CONTROL: a line-eating stripper is detected as such',
    stripComments(`a${SS}\n${SE}b`).split('\n').length, 2);
  endPhase('invariants', 5);
}

/* ================================================================== *
 * PHASE 3 — EVERY CONVERTED CONSUMER USES THE SHARED MODULE           *
 *                                                                     *
 * An assert-zero scan (D46): no converted consumer may still carry a  *
 * local regex comment-stripper. Its positive control is the site set  *
 * of shared-module imports, keyed `file :: line :: text` because      *
 * these are FOREIGN files (D64), plus a literal inputs-read pin.      *
 *                                                                     *
 * D59 — the pattern below was measured against each consumer's OWN    *
 * ledger shape before adoption. It keys on the import statement, not  *
 * on an assertion receiver, so it cannot collide with C04's           *
 * `check(area, name, pass)` shape the way QA-03's widened pattern     *
 * does.                                                               *
 * ================================================================== */
const CONSUMERS = [
  'tools/test-frame-order.mjs',
  'tools/test-coverage-floor.mjs',
  'tools/test-error-classes.mjs',
  'tools/test-renderer-resources.mjs',
  'tools/test-spores-lifecycle.mjs',
  'tools/test-baked-lifecycle.mjs',
  /* THREE ROWS LEFT 2026-08-22, and they are named rather than deducted:
     tools/test-owned-substrate-split.mjs, tools/test-tendrils-split.mjs and
     tools/verify-j04b.mjs, all retired out of tools/ with the one-shot move
     verifiers. Unlike INVARIANT_FILES above, this list is NOT a corpus — it is
     the enumerated set of files QA-04/QA-05 CONVERTED off their local regex
     strippers, so a file that leaves the tree leaves this list; substituting
     an unconverted file in would be a false claim about what was converted. */
];
const CONSUMER_COUNT = 6;
// The forbidden shape: a regex literal whose body is the block-comment
// pattern. Assembled, so this line is not itself a hit.
// The declared exceptions: occurrences that are deliberate controls, not
// live strippers. Each carries the reason it is allowed to stand.
const STRIPPER_EXCEPTIONS = [
  {
    key: "tools/test-coverage-floor.mjs :: const shortening = (s) => s.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/\\/\\/[^\\n]*/g, '');",
    why: "mutant M1's poison — a deliberately length-changing blanker, used to prove PC-0 detects an offset-invalidating stripper. Not a live code path.",
  },
];

const REGEX_STRIPPER = new RegExp(`\\${'/'}\\\\${'/'}\\\\\\${'*'}\\[`);

/* QA-06 / D84. Four consumers below no longer import the shared stripper
   DIRECTLY: they import tools/self-controls.mjs, which owns the one D44
   literal-predicate scan kit and imports the stripper itself. CN3's reader was
   a proxy for the property — "does this file name strip-comments.mjs?" — and
   the proxy went stale the moment the kit was shared, while the property it
   defends (no consumer re-derives a stripper) still holds and is still
   asserted by CN2 over all nine files.
   CN3's EXPECTED SET IS UNCHANGED. What changed is that an import of a named
   re-exporter counts, and CN3b pins that each named re-exporter really does
   import the shared stripper — so the transitive claim is checked, never
   assumed. Widening a control without checking what the widening admits is
   how a positive control quietly stops being one. */
const SHARED_STRIPPER_REEXPORTERS = ['tools/self-controls.mjs'];
/* Matched on the SPECIFIER line, not on `^import`, because a multi-line
   `import {\n  … \n} from './self-controls.mjs';` puts the specifier on a line
   that does not begin with `import`. CN3c caught exactly that the moment a
   converted suite grew its import list past one line — which is the whole
   reason a per-consumer count sits beside the file set. */
const REEXPORTER_IMPORT = new RegExp(
  `from '\\.\\/(?:${SHARED_STRIPPER_REEXPORTERS.map((f) => f.split('/').pop().replace('.', '\\.')).join('|')})';$`);

{
  let read = 0;
  const stillLocal = [];
  const importSites = [];
  for (const rel of CONSUMERS) {
    let src;
    try {
      src = readFileSync(join(REPO, rel), 'utf8');
    } catch (e) {
      refuse(`could not read consumer ${rel}: ${e.message}`);
    }
    read++;
    const stripped = stripComments(src);
    const lines = src.split('\n');
    stripped.split('\n').forEach((line, i) => {
      if (REGEX_STRIPPER.test(line)) stillLocal.push(`${rel} :: ${lines[i].trim()}`);
      const t = line.trim();
      if (/^import .*from '\.\/strip-comments\.mjs';$/.test(t) || REEXPORTER_IMPORT.test(t)) {
        importSites.push(`${rel} :: ${i + 1} :: ${lines[i].trim()}`);
      }
    });
  }
  if (read !== CONSUMER_COUNT) {
    harnessFail(`consumer loop read ${read} files, expected the literal ${CONSUMER_COUNT}`);
  }
  check('CN1', 'the consumer loop read exactly its literal count of files (inputs-read pin)',
    read, CONSUMER_COUNT);
  // D59 IN MINIATURE, and it fired on this order's own scan. The pattern
  // above collides with a LEGITIMATE shape: tools/test-coverage-floor.mjs
  // declares a deliberately length-changing stripper as mutant M1's poison,
  // to prove PC-0 catches an offset-invalidating blanker. A widened pattern
  // that reddens a healthy control is worse than a narrow one, so the zero
  // becomes a MANIFEST (D36/D54): every remaining occurrence is a named row
  // with a reason, and a new one is an addition to this list rather than a
  // number to bump.
  //
  // Keyed `file :: text` rather than `file :: line :: text` although these
  // are foreign files: they are under concurrent authorship and a line key
  // makes two lanes re-red each other's pins (D66). CN6 closes the gap the
  // line component would otherwise carry, by pinning that each exception
  // text occurs exactly once in its file.
  check('CN2', 'every remaining regex-stripper shape is a declared, reasoned exception',
    stillLocal, STRIPPER_EXCEPTIONS.map((e) => e.key));
  // POSITIVE CONTROL for CN2's zero: every consumer imports the shared module,
  // and the control is the SITE SET, not its cardinality.
  // De-duplicated by FILE. tools/test-tendrils-split.mjs legitimately carries
  // BOTH a direct strip-comments import and a re-exporter import, so the raw
  // site list has two rows for it; the property CN3 controls is "every consumer
  // is wired to the shared stripper", which is per file. CN3c keeps the raw
  // per-file site counts visible so a file silently losing one is still seen.
  const importFiles = [...new Set(importSites.map((x) => x.split(' :: ')[0]))];
  check('CN3', 'every consumer imports the shared module — at least one site each',
    importFiles, CONSUMERS);
  check('CN3c', 'qualifying shared-stripper import sites per consumer',
    CONSUMERS.map((rel) => importSites.filter((x) => x.startsWith(`${rel} :: `)).length),
    /* RE-BASELINED 2026-08-22. WAS: [1, 1, 1, 1, 1, 1, 1, 2, 1]. The three
       trailing entries left with their files; the `2` was the tendrils proof,
       which carried BOTH a direct import and a re-exporter import. Every
       surviving consumer has exactly one site, which is why this is now flat. */
    [1, 1, 1, 1, 1, 1]);
  // CN3b — what CN3's widening admits, checked rather than assumed. A named
  // re-exporter that stopped importing the shared stripper would make CN3 a
  // control over nothing.
  check('CN3b', 'each named re-exporter itself imports the shared module',
    SHARED_STRIPPER_REEXPORTERS.filter((f) => !readFileSync(join(REPO, f), 'utf8')
      .split('\n').some((l) => /^import .*from '\.\/strip-comments\.mjs';$/.test(l.trim()))), []);
  check('CN4', 'CONTROL: the forbidden-shape pattern is live (it matches the shape it forbids)',
    REGEX_STRIPPER.test(`x.replace(${'/'}\\${'/'}\\${'*'}[\\s\\S]*?${'*'}${'/'}${'/'}g, ' ')`), true);
  check('CN5', 'CONTROL: and it does not match an ordinary line',
    REGEX_STRIPPER.test('const a = 1;'), false);
  // Closes the gap left by dropping the line component from CN2's key: an
  // exception text that appeared twice would let a second, undeclared
  // occurrence hide behind a declared one.
  check('CN6', 'each declared exception text occurs exactly once in its file',
    STRIPPER_EXCEPTIONS.map((e) => {
      const [rel, text] = [e.key.split(' :: ')[0], e.key.split(' :: ').slice(1).join(' :: ')];
      return readFileSync(join(REPO, rel), 'utf8').split(text).length - 1;
    }), STRIPPER_EXCEPTIONS.map(() => 1));
  endPhase('consumers', 8);   // QA-06 added CN3b and CN3c — deliberate rows, not a bumped number
}

/* ================================================================== *
 * PHASE 4 — MUTANTS OF THE SHIPPED SUBJECT (D50 / D58 / D70)          *
 *                                                                     *
 * D58: a behaviour-preservation claim must falsify with mutants of    *
 * the SHIPPED code, not poisons of the harness's own doubles. Each    *
 * mutant declares the QUANTITY it moves and the ASSERTION that reads  *
 * that quantity (D50) — perturbing a neighbouring quantity produces a *
 * green "cannot fail" that reads as a defect in the assertion when it *
 * is a defect in the mutant.                                          *
 *                                                                     *
 * The NULL MUTANT RUNS FIRST. Without it, a death proves the harness  *
 * broke rather than that the mutation was caught.                     *
 * ================================================================== */
/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite minted ONE staging root and    *
 * removed it never - 1 directory per run, 48 standing on this machine    *
 * when the measurement was taken.                                        *
 *                                                                        *
 * This suite ALREADY had a process.on('exit') hook - the D57 phase       *
 * sentinel a few hundred lines above. It cleaned up nothing: the hook    *
 * existed to report an abort, not to release the tree. A second listener *
 * is registered here rather than folding cleanup into the sentinel,      *
 * because the two have different jobs and the sentinel must keep working *
 * if this one throws. Node runs both, in registration order.             *
 *                                                                        *
 * WHY AN EXIT HOOK AND NOT try/finally: the root is created at module    *
 * top level, where there is no enclosing try to attach a finally to -    *
 * and this suite terminates through process.exit(), which does NOT run   *
 * finally blocks.                                                        *
 *                                                                        *
 * Both halves of that are measured rather than assumed. The positive     *
 * control in this order's evidence directory (hygiene-01/control-exit-   *
 * hook.mjs) shows a finally whose try calls process.exit leaking its     *
 * directory, while the exit hook fires on a normal end, on               *
 * process.exit(), AND on an uncaught throw.                              *
 *                                                                        *
 * Removal is best effort by design: a suite must not fail because a temp *
 * tree was already gone.                                                 *
 * ====================================================================== */
const TMP = mkdtempSync(join(tmpdir(), 'qa04-mut-'));   // D56: outside the repo
process.on('exit', () => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
});
let mutantSerial = 0;

/** Apply one anchored substitution to the SHIPPED subject and import it.
 *  Both guards throw HarnessError, which runFixtures re-raises rather than
 *  scoring — D70's one-line structural fix. */
async function mutantStrip(from, to) {
  const src = readFileSync(SUBJECT, 'utf8');
  if (sha(src) !== SUBJECT_HASH) refuse('tools/strip-comments.mjs changed during the mutant sweep');
  const n = src.split(from).length - 1;
  if (n !== 1) harnessFail(`anchor "${from.slice(0, 40)}" matched ${n} times, expected exactly 1`);
  const out = src.split(from).join(to);
  if (out === src) harnessFail(`inert edit: "${from.slice(0, 40)}" -> "${to.slice(0, 40)}"`);
  const p = join(TMP, `m${++mutantSerial}.mjs`);
  writeFileSync(p, out);
  const mod = await import(`file://${p}`);
  return mod.stripComments;
}

// id, what it changes, THE QUANTITY IT MOVES, THE ASSERTION THAT READS IT,
// the killing instrument, and whether it is declared equivalent-by-contract.
const MUTANTS = [
  ['m0', 'NULL MUTANT — a comment inserted, no behaviour changed',
    'nothing', 'none', 'none — must survive', true,
    ['const blank = (s) =>', '// qa-04 null mutant\nconst blank = (s) =>']],
  ['m1', 'string state removed: a quote no longer opens a string',
    'the set of offsets treated as comment inside single/double-quoted strings',
    'FX01/FX02/FX06/FX07', 'the fixture table', false,
    ["if (src[i] === '\"' || src[i] === \"'\") {", 'if (false) {']],
  ['m2', 'template state removed: a backtick no longer opens a template',
    'the offsets treated as comment inside template literals',
    'FX03/FX08/FX15', 'the fixture table', false,
    ["if (src[i] === '`') {", 'if (false) {']],
  ['m3', 'regex state removed: a regex literal is scanned as ordinary code',
    'the offsets treated as comment inside regex literals',
    'FX05/FX10', 'the fixture table', false,
    ["if (src[i] === '/' && regexHere()) {", 'if (false) {']],
  ['m4', 'escape handling removed inside strings',
    'where a string ENDS when it contains an escaped quote',
    'FX11', 'the fixture table', false,
    ["if (c === '\\\\') { j += 2; continue; }\n        // A raw newline", "if (false) { j += 2; continue; }\n        // A raw newline"]],
  ['m5', 'every slash is a regex: division is read as a regex literal',
    'whether `/` after an identifier opens a regex',
    'FX13/FX14', 'the fixture table', false,
    ['if (src[i] === \'/\' && regexHere()) {', "if (src[i] === '/') {"]],
  ['m6', 'the interpolation stack is disabled: `${` no longer re-enters code',
    'whether `${ … }` is scanned as code or as template text',
    'FX21', 'the fixture table', false,
    ["if (c === '$' && src[i + 1] === '{') {", 'if (false) {']],
  ['m7', 'blanking no longer preserves newlines',
    'the LINE COUNT of the output',
    'IV3/IV5', 'the invariant phase', false,
    ["const blank = (s) => s.replace(/[^\\n]/g, ' ');", "const blank = (s) => s.replace(/[\\s\\S]/g, ' ');"]],
];
const MUTANT_COUNT = 8;
const DECLARED_EQUIVALENT = ['m0'];

{
  const survivors = [];
  let ran = 0;
  let nullRan = false;
  for (const [id, what, quantity, readBy, killer, equivalent, [from, to]] of MUTANTS) {
    ran++;
    if (id === 'm0' && ran !== 1) harnessFail('the null mutant must run FIRST');
    let strip;
    // D70. The guards inside mutantStrip throw HarnessError. They are NOT
    // caught here — only a throw from the SUBJECT is evidence, and a throw
    // from a guard is a harness failure that must reach the process.
    strip = await mutantStrip(from, to);
    let failed;
    if (id === 'm7') {
      const s = `a${SS}\n${SE}b`;
      failed = strip(s).split('\n').length === s.split('\n').length ? [] : ['line-count'];
    } else {
      failed = runFixtures(strip);
    }
    const killed = failed.length > 0;
    if (!killed) survivors.push(id);
    if (id === 'm0') {
      nullRan = true;
      // The null-mutant control, asserted rather than assumed. If this dies,
      // every later death is a broken harness, not a caught mutation.
      check('MU0', 'NULL MUTANT CONTROL: an inert change kills nothing (the harness is not broken)',
        killed, false);
    }
    console.log(`  ${id} ${killed ? 'KILLED' : 'SURVIVED'} — moves: ${quantity}; read by: ${readBy}; killer: ${killer}${equivalent ? '; declared equivalent-by-contract' : ''}`);
    void what;
  }
  if (ran !== MUTANT_COUNT) harnessFail(`mutant loop ran ${ran} times, expected the literal ${MUTANT_COUNT}`);
  if (!nullRan) harnessFail('the null-mutant control never ran');
  check('MU1', 'the mutant loop ran exactly its literal count (D45)', ran, MUTANT_COUNT);
  // D58's corollary: a survivor must be a DECISION on the record. The survivor
  // set is asserted to EQUAL the set declaring an equivalence — not merely to
  // be a subset of it, and not merely to be small.
  check('MU2', 'the survivor set equals exactly the set declaring an equivalence',
    survivors, DECLARED_EQUIVALENT);
  endPhase('mutants', 3);
}

/* ================================================================== *
 * REPORT                                                              *
 * ================================================================== */
if (sha(readFileSync(SUBJECT, 'utf8')) !== SUBJECT_HASH) {
  refuse('tools/strip-comments.mjs changed under this run — re-measure, do not reconcile (D63/D69)');
}
console.log(`comment stripper: ${rows.length - failures}/${rows.length} PASS`);
if (failures > 0) process.exitCode = 1;
void SELF;
