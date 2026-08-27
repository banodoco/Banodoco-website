// F06 — companion characterization for the second silent-catch cluster this
// order closes: tools/browser-smoke.mjs's six §4-mapped sites (Q04 map,
// docs/code-health/elegance-warning-ownership-map.md) that Q03 (the file's
// owning order, T2, accepted with a full R1 review — see
// docs/code-health/evidence/2026-08-21-elegance-run-01/q03/) did not close,
// because Q03's own contract was scoped to "browser modes, stable scenario
// filtering, machine-readable environment classification, and bounded
// cleanup" (docs/code-health/2026-08-20-elegance-execution-runbook.md line
// 635) — not silent-catch classification.
//
// WHAT THIS FILE DOES AND DOES NOT PROVE, HONESTLY, PER SITE:
//
//   tools/browser-smoke.mjs:52 (awaitInteraction's tagging catch) — NOT
//   retested here. It is already both exported AND thoroughly exercised by
//   Q03's own accepted suite, tools/test-browser-harness.mjs, whose "D14:
//   frozen error objects thrown inside awaitInteraction still land safely
//   (no crash, no silent pass)" check constructs a frozen Error, throws it
//   through the real awaitInteraction(), and asserts the catch at :52 is
//   reached and absorbed exactly as its own rationale comment (already
//   present pre-F06, matching this order's classification verbatim) says.
//   Duplicating that coverage here would risk the two drifting apart, the
//   same reasoning C03a's own N-6 note gives for not re-pinning baked.js's
//   fallback behavior alongside C04's suite. §1 below confirms that test
//   still exists in the tree rather than merely asserting it once existed.
//
//   tools/browser-smoke.mjs:604, :633, :768, :778, :845 — the other five
//   catches this order documented (comment-only, see the diff) sit inside
//   `closeWithin`, `getWebglRendererString`, the SIGTERM/SIGKILL cleanup
//   fallback in `main()`'s `finally`, and the `isMain` IIFE — NONE of which
//   are exported, and all of which only run inside a real
//   spawn()+chromium.launch() session. Testing their actual CATCH behavior
//   in isolation would require either (a) adding `export` to previously-
//   private helpers — a shape change beyond "add documentation to a catch,"
//   which risks conflicting with Q03's just-accepted, R1-reviewed file more
//   than this narrow order's mandate justifies — or (b) running the browser
//   harness, which this order's own constraints explicitly forbid ("Do NOT
//   run the browser harness or capture pipeline"). §2 below is what CAN be
//   proven without either: that this order's edit to each of the five sites
//   changed nothing but a comment, mechanically, against the source text.
//   This is the same class of static/source-grounded proof C04's
//   limitations.md §4 used for a claim real execution could not
//   affordably reach, disclosed there rather than skipped silently — this
//   file does the same, not a substitute for behavioral proof but an
//   honest, checkable narrower one.
//
// Run:
//   node tools/test-error-classes.mjs                  — run the suite
//   node tools/test-error-classes.mjs --prove-failure   — prove every
//        comparison in the suite can be made to fail (QA-01 mode)

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditLiteralPredicates } from './self-controls.mjs';
import { armSentinel } from './instrument-ledger.mjs';

/* QA-06: the audit scans THIS file. When the audit lived here it read
   import.meta.url; shared, that would read the module instead of the caller —
   D45's shape manufactured by consolidation. The path is now explicit. */
const SELF_PATH = fileURLToPath(import.meta.url);

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SMOKE_SRC = join(REPO, 'tools/browser-smoke.mjs');
const HARNESS_TEST_SRC = join(REPO, 'tools/test-browser-harness.mjs');

/* ================================================================== *
 * 0. THE FAILABILITY HARNESS (QA-01's --prove-failure idiom) — same    *
 *    shape as tools/test-baked-lifecycle.mjs's, kept independent      *
 *    (not imported from there) so each cluster's proof stands alone.  *
 * ================================================================== */

const P = { on: process.argv.includes('--prove-failure'), site: 0, target: -1, hit: false };

/* D57/D73 — the abort sentinel. QA-07: this suite shipped with NONE, so a
 * crash in it was byte-identical to a clean pass under `grep '^FAIL'`. One
 * shared implementation (tools/instrument-ledger.mjs), not a fourteenth local
 * one. The phase set is computed from argv, so a phase that was never
 * REQUESTED stays silent; the line begins FAIL so the filter D57 exists to
 * defeat cannot hide it. It does NOT replace reading the exit code in the
 * producing command — a sentinel is installed by code that must first parse,
 * so it cannot fire on a syntax error (D73). */
const SENT = armSentinel('test-error-classes',
  [process.argv.includes('--prove-failure') ? 'prove' : 'main']);

function corrupt(v) {
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'number') return Number.isFinite(v) ? v + 1 : 0;
  if (typeof v === 'string') return `${v}~CORRUPT`;
  return '~CORRUPT';
}

function A(value) {
  const n = P.site++;
  if (P.on && n === P.target) { P.hit = true; return corrupt(value); }
  return value;
}

const results = [];
let failures = 0;
function check(name, predicateFn) {
  let ok, detail;
  try {
    detail = predicateFn();
    ok = detail === true;
  } catch (e) {
    ok = false;
    detail = { error: String(e && e.message || e) };
  }
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

/* ================================================================== *
 * SCENARIOS                                                           *
 * ================================================================== */

function run() {
  const smokeSrc = readFileSync(SMOKE_SRC, 'utf8');

  /* ---- §1: the claimed cross-reference to Q03's existing coverage of  *
   *      :52 is real, not assumed — the exact check name is present    *
   *      in the file this order cites, and it constructs a genuinely   *
   *      FROZEN error (the specific condition :52's catch guards).     */
  {
    const harnessSrc = readFileSync(HARNESS_TEST_SRC, 'utf8');
    check('§1 — tools/test-browser-harness.mjs still contains the D14 frozen-error awaitInteraction check this order cites', () =>
      A(harnessSrc.includes('D14: frozen error objects thrown inside awaitInteraction still land safely')));
    check('§1 — that check actually freezes the error object it throws (the exact condition :52 guards against)', () =>
      A(harnessSrc.includes('Object.freeze(new Error(')));
    check('§1 — browser-smoke.mjs:52 itself still documents the same frozen/non-extensible condition', () =>
      A(smokeSrc.includes("A frozen/non-extensible error-like value can't carry the tag")));
  }

  /* ---- §2: SOURCE GUARD — this order's five comment-only edits to    *
   *      browser-smoke.mjs changed nothing but a comment: the exact    *
   *      original statement inside each catch body (or immediately     *
   *      guarded by it) is present, byte-for-byte, unchanged.          */
  {
    const originals = [
      [':604 — resource.close().catch(() => {}) inside closeWithin', 'resource.close().catch(() => {}),'],
      [':633 — return null; inside getWebglRendererString\'s catch', 'return null;\n  } finally {\n    await page.close();'],
      [':768 — process.kill(-server.pid, \'SIGTERM\') guarded by the try', "process.kill(-server.pid, 'SIGTERM');"],
      [':768/778 fallback — server.kill(\'SIGTERM\') in the catch', "server.kill('SIGTERM');"],
      [':778 — process.kill(-server.pid, \'SIGKILL\') guarded by the try', "process.kill(-server.pid, 'SIGKILL');"],
      [':778 fallback — server.kill(\'SIGKILL\') in the catch', "server.kill('SIGKILL');"],
      [':845 — the isMain comparison itself', 'return import.meta.url === pathToFileURL(process.argv[1]).href;'],
      [':845 — the isMain catch fallback', 'return false;'],
    ];
    for (const [label, needle] of originals) {
      check(`§2 SOURCE GUARD — ${label} is present unchanged`, () =>
        A(smokeSrc.includes(needle)));
    }
  }

  /* ---- §2b: NEGATIVE CONTROL for the source-guard method itself —    *
   *      proves includes() is actually discriminating (Engine 3 from   *
   *      qa-01/patterns.md: a predicate over discovered text is only   *
   *      meaningful if it can find something ABSENT, not just present).*/
  {
    check('§2b — the source-guard method correctly reports an ABSENT string as absent (not vacuously true)', () =>
      A(smokeSrc.includes('this string does not exist in browser-smoke.mjs~~~')) === false);
  }
}

/* ================================================================== *
 * NON-TAUTOLOGY DISCIPLINE (D44) — a hardcoded boolean standing in  *
 *    for a real comparison, scanned mechanically across this file      *
 *    itself. Such a site is invisible to the --prove-failure sweep     *
 *    above: a comparison-site harness only sees comparisons, and a     *
 *    bare literal predicate is not one.                                *
 *                                                                      *
 *    D47/F-2 + D46: this scan DID run, but the suite it lives in was   *
 *    an orphan no gate invoked, and its match loop had never been      *
 *    entered anywhere in the tree. "0 hits" from a scan that has never *
 *    matched anything cannot distinguish a clean file from a stale     *
 *    anchor or a renamed helper. It now carries the two controls D46   *
 *    requires, plus P16-style synthetic positives:                     *
 *                                                                      *
 *      PC-1  POSITIVE CONTROL — a census of the assertion call sites    *
 *            the scan's own pattern can see, pinned to a literal.      *
 *      PC-2  FILES-READ pin — the number of INPUTS, not of matches.    *
 *      PC-3  synthetic positives modelled on P16 in                    *
 *            tools/test-render-perturbation.mjs:275 — MANUFACTURE the  *
 *            shapes the scan exists to catch and feed them to the same *
 *            scanner, so "0 hits" is only reported by a scanner just   *
 *            shown to return non-zero on what it is looking for.       *
 *                                                                      *
 *    The pattern is wider than D44's original, which QA-02 replayed    *
 *    verbatim and measured blind to: an escaped quote in the label, a  *
 *    bare unqualified call, a numeric predicate, a negated-numeric     *
 *    predicate, and the identity comparison of D44's addendum.         *
 *                                                                      *
 *    NOTE when editing: keep the bare token naming an assertion call   *
 *    out of STRING literals here. Comments are stripped before         *
 *    scanning, strings are not, so a string carrying it would inflate  *
 *    the PC-1 census with a site that is not a call.                    *
 * ================================================================== */

// Block comments become an equal count of newlines (line numbers survive);
// line comments are blanked. A comment that merely NAMES the pattern —
// including this one — is not a hit; fixtures PC3-24/PC3-25 prove it both ways.
// QA-04 / S-3: this was two regexes with no string, template or
// regex-literal state — the D67 defect. A `/*` inside a string constant
// opened a phantom comment and blanked live code, and because "0 hits" is
// the passing answer for this scan (D46) the loss was silent. Now the one
// shared implementation in tools/strip-comments.mjs, which is both
// length-preserving and line-preserving, so the line arithmetic below is
// unchanged and the offsets are now valid as well.
/* QA-06: the D44 scan kit — SCAN_CALL, the three patterns, the 31-row
   synthetic-positive table and scanLiteralPredicateText() — is now the ONE
   shared implementation in tools/self-controls.mjs. Four byte-identical
   copies shipped; this file carried one of them. The PC-1 literal below is
   per-subject data and stays here. */

/* QA-06: the 31-row synthetic-positive table and its `SK` interpolation
   guard are now the ONE shared table in tools/self-controls.mjs. The rows
   still interpolate the assertion token so no row is itself counted as a
   call site, and PC-3a/PC-3b/PC-3c still pin 31/31/19 here. */

// PC-1's literal. Measured against the shipped file; bump it deliberately
// when assertion call sites are added or removed. It is a POSITIVE control:
// if it ever reads 0, the scan is not reading this file's code at all.
const ERROR_CLASSES_SCAN_SITES = 7;


/* ================================================================== *
 * RUNNER                                                               *
 * ================================================================== */

if (P.on) {
  P.on = false;
  P.site = 0;
  run();
  const total = P.site;
  P.on = true;
  let broke = 0;
  for (let i = 0; i < total; i++) {
    P.site = 0; P.target = i; P.hit = false;
    results.length = 0; failures = 0;
    run();
    if (!P.hit) {
      console.log(`SITE ${i}: never reached by any check`);
      continue;
    }
    if (failures > 0) broke++;
    else console.log(`SITE ${i}: FAILED TO BREAK — a corrupted actual passed every check in the run`);
  }
  const literalBad = auditLiteralPredicates('tools/test-error-classes.mjs', ERROR_CLASSES_SCAN_SITES, SELF_PATH);
  SENT.reach('prove');
  console.log(`\nprove-failure: ${broke}/${total} sites broke their check(s) as required`);
  process.exit(broke === total && literalBad.length === 0 ? 0 : 1);
} else {
  run();
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ' — ' + JSON.stringify(r.detail)}`);
  const literalBad = auditLiteralPredicates('tools/test-error-classes.mjs', ERROR_CLASSES_SCAN_SITES, SELF_PATH);
  SENT.reach('main');
  console.log(`\nbrowser-smoke.mjs catch-cluster source guard: ${results.length - failures}/${results.length} PASS`);
  process.exit(failures === 0 && literalBad.length === 0 ? 0 : 1);
}
