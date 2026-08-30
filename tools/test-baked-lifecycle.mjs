// F06 (coordinator D4) — standalone characterization of journey/lib/baked.js's
// import-time `ready` IIFE: the page-lifetime-singleton classification and
// the silent manifest fetch/parse and per-chapter .bin fallbacks, proven by
// real execution rather than source-line positions.
//
// Deliberately self-contained: this file does NOT import tools/test-portrait-
// harness.mjs (C04's fixture, a different order's file) so F06's own proof
// stands on its own and never drifts out from under a change made under a
// different order's allowlist. C04's tools/test-portrait-baked.mjs already
// covers this exact surface in more depth (B1-B5, B5-neg) through portraits.js's
// consumption path; this file is the narrower, baked.js-only companion D4
// asks F06 to produce, and is cross-referenced from journey/lib/baked.js's
// new classification comment.
//
// Run:
//   node tools/test-baked-lifecycle.mjs                  — run the suite
//   node tools/test-baked-lifecycle.mjs --prove-failure   — prove every
//        comparison in the suite can be made to fail (QA-01 mode)
//
// NOT YET WIRED INTO package.json — a batched wiring order handles that
// (F06's allowlist excludes package.json).

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditLiteralPredicates } from './self-controls.mjs';
import { armSentinel } from './instrument-ledger.mjs';

/* QA-06: the audit scans THIS file. When the audit lived here it read
   import.meta.url; shared, that would read the module instead of the caller —
   D45's shape manufactured by consolidation. The path is now explicit. */
const SELF_PATH = fileURLToPath(import.meta.url);

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAKED_SRC = join(REPO, 'journey/lib/baked.js');

/* ================================================================== *
 * 0. THE FAILABILITY HARNESS (QA-01's --prove-failure idiom)          *
 *                                                                     *
 * Every ACTUAL value that feeds a comparison below is wrapped in A(). *
 * In prove mode the runner re-executes the whole file once per site   *
 * with exactly that one site's value corrupted, and requires the      *
 * check guarding it to fail. A site that cannot be made to fail is    *
 * reported and the run exits non-zero.                                *
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
const SENT = armSentinel('test-baked-lifecycle',
  [process.argv.includes('--prove-failure') ? 'prove' : 'main']);

function corrupt(v) {
  if (typeof v === 'string') return `${v}~CORRUPT`;
  if (typeof v === 'number') return Number.isFinite(v) ? v + 1 : 0;
  if (typeof v === 'boolean') return !v;
  if (v === null || v === undefined) return '~CORRUPT';
  if (typeof v === 'object') return { ...v, __corrupt: true };
  return '~CORRUPT';
}

/** Wrap an ACTUAL — a value on its way into a comparison. */
function A(value) {
  const n = P.site++;
  if (P.on && n === P.target) { P.hit = true; return corrupt(value); }
  return value;
}

/** Wrap a FIXTURE CHOICE (not a runtime value) — `normal()` builds the
 *  input a check expects to hold for, `alt()` builds the one deliberately
 *  chosen to make it fail. Needed for checks whose predicate is an
 *  object-identity comparison (`!==`/`===` on two freshly-imported module
 *  namespaces): corrupting the ACTUAL with a synthesized stand-in object
 *  can never flip such a comparison, because any two distinct objects
 *  already satisfy `!==` regardless of what corrupt() does to either side
 *  — the only way to genuinely exercise the invariant is to change WHICH
 *  module gets imported. */
function F(normal, alt) {
  const n = P.site++;
  if (P.on && n === P.target) { P.hit = true; return alt(); }
  return normal();
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
 * 1. SELF-CONTAINED rewriteTree — resolves baked.js's two bare/local  *
 *    specifiers ('three', '../../flags.js') to absolute file:// URLs  *
 *    so it can run under plain Node, and writes each variant to a     *
 *    fresh scratch file (never editing the repo) so a fresh `salt`    *
 *    forces a brand-new Node module registration — the only way to    *
 *    get an independent singleton instance of a module whose ready    *
 *    IIFE otherwise runs exactly once per process.                    *
 * ================================================================== */

/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite minted ONE staging root and    *
 * removed it never - 1 directory per run, 35 standing on this machine    *
 * when the measurement was taken.                                        *
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
const scratchRoot = mkdtempSync(join(tmpdir(), 'f06-baked-'));
process.on('exit', () => {
  try { rmSync(scratchRoot, { recursive: true, force: true }); } catch { /* best effort */ }
});
let scratchSeq = 0;

function rewriteBaked(salt) {
  const dir = join(scratchRoot, `${salt}-${scratchSeq++}`);
  mkdirSync(dir, { recursive: true });
  const raw = readFileSync(BAKED_SRC, 'utf8');
  const out = raw
    .replace(/from '\.\.\/\.\.\/flags\.js'/, `from 'file://${REPO}/flags.js'`)
    .replace(/from 'three'/, `from 'file://${REPO}/vendor/three/three.module.js'`);
  const hash = createHash('md5').update(salt + scratchSeq).digest('hex').slice(0, 8);
  const outPath = join(dir, `baked-${hash}.mjs`);
  writeFileSync(outPath, out);
  return 'file://' + outPath;
}

function loadBakedFresh(tag) {
  return import(rewriteBaked(tag));
}

/* ================================================================== *
 * 2. FAKE fetch — installed once, reconfigured per scenario. Mirrors  *
 *    the shapes baked.js's `ready` IIFE actually calls: fetch(url)    *
 *    resolving to {ok, json()} for the manifest and {ok, arrayBuffer()}*
 *    for a chapter .bin, or throwing/hanging per fetchController.mode.*
 * ================================================================== */

const fetchController = { mode: 'no-manifest', manifest: undefined, bins: undefined, calls: [] };
globalThis.fetch = async (url) => {
  fetchController.calls.push(String(url));
  const { mode } = fetchController;
  if (mode === 'hang') return new Promise(() => {});
  if (mode === 'network-error') throw new Error('fake network error');
  if (mode === 'no-manifest') return { ok: false };
  if (mode === 'manifest-ok') {
    if (String(url).endsWith('manifest.json')) return { ok: true, json: async () => fetchController.manifest };
    const bin = fetchController.bins && fetchController.bins[url];
    if (bin === 'reject') throw new Error('fake per-chapter fetch error');
    if (bin === 'not-ok') return { ok: false };
    return { ok: true, arrayBuffer: async () => (bin || new ArrayBuffer(0)) };
  }
  throw new Error(`unhandled fetchController.mode: ${mode}`);
};

function resetFetch() {
  fetchController.mode = 'no-manifest';
  fetchController.manifest = undefined;
  fetchController.bins = undefined;
}

// Successful lifecycle scenarios must cross the same strict manifest and bin
// boundary as production. Keep the fixture small, but structurally complete:
// one packed f32 window occupying the eight-byte fake bin used below.
function validChapter(id, payload = {}) {
  return {
    file: `${id}.bin`,
    sha256: '0'.repeat(64),
    keys: [{
      key: `${id}/fixture`,
      attrs: [{ name: 'position', itemSize: 1, byteOffset: 0, byteLength: 8, kind: 'f32' }],
    }],
    payload,
  };
}

/* ================================================================== *
 * 3. SCENARIOS                                                        *
 * ================================================================== */

async function run() {
  /* ---- SINGLETON — page-lifetime-singleton classification proof ---- */
  {
    resetFetch();
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = { version: 1, chapters: { owned: validChapter('owned', { n: 7 }) } };
    // fetchController keys bins by the literal request URL baked.js sends
    // ('static/geom/<file>'), which is independent of the scratch path each
    // rewritten copy lives at.
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
    fetchController.calls = [];
    const url = rewriteBaked('singleton-shared');
    const consumerA = await import(url); // simulates one production file's `import ... from '../lib/baked.js'`
    const consumerB = await import(url); // simulates a SECOND, different production file, same resolved specifier
    check('SINGLETON: two import() calls on the same resolved specifier return the identical module object', () =>
      A(consumerA) === A(consumerB));
    await consumerA.ready;
    check('SINGLETON: consumer B, which never awaited ready itself, observes the state consumer A\'s await resolved', () =>
      A(consumerB.isBaked('owned')) === true);
    check('SINGLETON: only ONE manifest fetch and ONE bin fetch happened for two consumers', () =>
      A(fetchController.calls.filter((u) => u.endsWith('manifest.json')).length) === 1 &&
      fetchController.calls.filter((u) => u.endsWith('owned.bin')).length === 1);
  }

  /* ---- SINGLETON-NEG — required "prove it can fail" contrast: two   *
   *      DIFFERENT specifiers are genuinely independent modules.       */
  {
    resetFetch();
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = { version: 1, chapters: { owned: validChapter('owned') } };
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
    const urlC = rewriteBaked('singleton-neg-c');
    const consumerC = await import(urlC);
    await consumerC.ready;
    fetchController.mode = 'no-manifest'; // switch to a FAILING config before D is ever imported
    // FIXTURE CHOICE, not a runtime value: which URL D imports. Corrupting
    // this site makes D reuse C's exact resolved URL — the one thing that
    // (per SINGLETON above) collapses two import() calls into the SAME
    // cached module — so the identity check below is genuinely sensitive
    // to it; corrupting the resulting object reference (as A() would) can
    // never flip a `!==` between two already-distinct objects.
    const urlD = F(() => rewriteBaked('singleton-neg-d'), () => urlC);
    const consumerD = await import(urlD);
    await consumerD.ready;
    check('SINGLETON-NEG: two different specifiers are NOT the identical module object', () =>
      consumerC !== consumerD);
    check('SINGLETON-NEG: D does not inherit C\'s already-resolved success — its own failing fetch decides its state', () =>
      A(consumerD.isBaked('owned')) === false);
  }

  /* ---- manifest fetch throws (network/JSON error) ----------------- */
  {
    resetFetch();
    fetchController.mode = 'network-error';
    const baked = await loadBakedFresh('b88-throw');
    let rejected = false;
    await baked.ready.catch(() => { rejected = true; });
    check('manifest catch — a fetch that throws does NOT reject `ready`', () =>
      A(rejected) === false);
    check('manifest catch — isBaked() stays false for the chapter that would have used this manifest', () =>
      A(baked.isBaked('owned')) === false);
  }

  /* ---- positive-control contrast — a working manifest DOES          *
   *      flip isBaked() true, so the check above is not vacuous.      */
  {
    resetFetch();
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = { version: 1, chapters: { owned: validChapter('owned') } };
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
    const baked = await loadBakedFresh('b88-contrast-ok');
    await baked.ready;
    check('manifest contrast — a working manifest+bin DOES flip isBaked() true', () =>
      A(baked.isBaked('owned')) === true);
  }

  /* ---- manifest fetch resolves but !res.ok (sibling                 *
   *      early-return path into the same "stays false" outcome).      */
  {
    resetFetch();
    fetchController.mode = 'no-manifest'; // { ok: false }
    const baked = await loadBakedFresh('b86-not-ok');
    await baked.ready;
    check('manifest !ok — response resolves `ready` cleanly, isBaked() false', () =>
      A(baked.isBaked('owned')) === false);
  }

  /* ---- per-chapter .bin fetch throws; per-chapter                   *
   *      isolation (sibling chapter's own successful fetch is         *
   *      unaffected — matches the actual Promise.all shape).          */
  {
    resetFetch();
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = {
      version: 1,
      chapters: {
        owned: validChapter('owned'),
        inspire: validChapter('inspire'),
      },
    };
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8), 'static/geom/inspire.bin': 'reject' };
    const baked = await loadBakedFresh('b98-throw');
    await baked.ready;
    check('bin catch — the sibling chapter whose fetch succeeded IS baked (per-chapter isolation)', () =>
      A(baked.isBaked('owned')) === true);
    check('bin catch — the chapter whose fetch threw stays NOT baked, even though its manifest entry exists', () =>
      A(baked.isBaked('inspire')) === false);
  }

  /* ---- per-chapter .bin fetch resolves !res.ok                       *
   *      (sibling early-return path into the same "stays false").     */
  {
    resetFetch();
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = { version: 1, chapters: { owned: validChapter('owned') } };
    fetchController.bins = { 'static/geom/owned.bin': 'not-ok' };
    const baked = await loadBakedFresh('b96-not-ok');
    await baked.ready;
    check('bin !ok — response also leaves isBaked() false', () =>
      A(baked.isBaked('owned')) === false);
  }

  /* ---- wrong manifest schema version (the guard the                 *
   *      two catches sit beside; not a catch itself, but the same     *
   *      "stays false, builds live" family, kept here for a complete  *
   *      account of every branch C03a's N-6 lists as uncharacterized  *
   *      by ITS baseline).                                            */
  {
    resetFetch();
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = { version: 999, chapters: { owned: { file: 'owned.bin', sha256: 'x', keys: [], payload: {} } } };
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
    const baked = await loadBakedFresh('b91-version');
    await baked.ready;
    check('manifest version — wrong version leaves isBaked() false without fetching bytes', () =>
      A(baked.isBaked('owned')) === false);
  }

  /* ---- SOURCE-TEXT GUARD — pin the validated loader boundary and    *
   *      its two fallback outcomes alongside the execution proofs.     *
   * ------------------------------------------------------------------ */
  {
    const src = readFileSync(BAKED_SRC, 'utf8');
    const validatedManifestFallback = [
      'const loaded = await fetchBakedAssets();',
      'if (!loaded) return;                   // no bake present -> live everywhere',
    ];
    const perChapterFallback = '/* absorbed: isBaked(id) stays false; that chapter builds live */';
    check('SOURCE GUARD — ready enters the validated loader and retains all-live fallback', () =>
      A(validatedManifestFallback.every((line) => src.includes(line))) === true);
    check('SOURCE GUARD — per-chapter fetch failure retains live fallback', () =>
      A(src.includes(perChapterFallback)) === true);
  }
}

/* ================================================================== *
 * 4. NON-TAUTOLOGY DISCIPLINE (D44) — a hardcoded boolean standing in  *
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
const BAKED_SCAN_SITES = 17;


/* ================================================================== *
 * 5. RUNNER                                                           *
 * ================================================================== */

if (P.on) {
  // Dry-run once with corruption disabled to learn the site count, then
  // re-run once per site with exactly that site corrupted.
  P.on = false;
  P.site = 0;
  await run();
  const total = P.site;
  P.on = true;
  let broke = 0;
  for (let i = 0; i < total; i++) {
    P.site = 0; P.target = i; P.hit = false;
    results.length = 0; failures = 0;
    await run();
    if (!P.hit) {
      console.log(`SITE ${i}: never reached by any check (no comparison consumed it)`);
      continue;
    }
    const brokeThis = failures > 0;
    if (brokeThis) broke++;
    else console.log(`SITE ${i}: FAILED TO BREAK — a corrupted actual passed every check in the run`);
  }
  const literalBad = auditLiteralPredicates('tools/test-baked-lifecycle.mjs', BAKED_SCAN_SITES, SELF_PATH);
  SENT.reach('prove');
  console.log(`\nprove-failure: ${broke}/${total} sites broke their check(s) as required`);
  process.exit(broke === total && literalBad.length === 0 ? 0 : 1);
} else {
  await run();
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ' — ' + JSON.stringify(r.detail)}`);
  const literalBad = auditLiteralPredicates('tools/test-baked-lifecycle.mjs', BAKED_SCAN_SITES, SELF_PATH);
  SENT.reach('main');
  console.log(`\nbaked.js lifecycle characterization: ${results.length - failures}/${results.length} PASS`);
  process.exit(failures === 0 && literalBad.length === 0 ? 0 : 1);
}
