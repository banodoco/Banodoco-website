// QA-03 / D47 F-3 + F-4 — the coverage floor.
//
//   node tools/test-coverage-floor.mjs
//   node tools/test-coverage-floor.mjs --emit-allowlist   (bootstrap/refresh)
//   node tools/test-coverage-floor.mjs --prove-failure    (corruption sweep)
//
// THE CLAIM. Every `throw`, `fail(` and `problems.push(` site in
// journey/chapter-contract.js and journey/structure.js must have a V8 block
// execution count greater than zero somewhere in the suite set below — except
// for the sites enumerated in ALLOWLIST, which are recorded debt.
//
// WHY THIS EXISTS, and why it is not a duplicate of the other two defences.
// D47 names three orthogonal instruments. Perturbation supplies a synthetic
// subject and proves a check goes red; cardinality pinning (D45) proves a
// loop ran. Both defend a site an author REMEMBERED to write a check for.
// A coverage floor is the only one that catches a branch nobody thought to
// check at all — QA-02 found 25 of 45 `fail()` sites in journey/structure.js
// and 5 rejection sites in journey/chapter-contract.js that could be deleted
// or inverted with `npm run check` green, and it found them from coverage,
// not from reading.
//
// IT RATCHETS. The allowlist is debt, not permission. A NEW uncovered site
// fails immediately. Closing an allowlisted one also fails — deliberately —
// because ALLOWLIST_SIZE is pinned to a literal, so debt cannot be paid off
// silently either. Both directions require an edit that says what changed.
//
// NO SOURCE EDIT TO THE SUBJECTS. This file reads them and measures them; it
// never writes them, and it asserts their hashes are unchanged across its own
// coverage run (D39: coverage collected during concurrent execution must be
// hash-fenced or it is not evidence — QA-02's first sweep produced two false
// positives from byte offsets into a file another order had replaced).
//
// OFFSETS ARE BYTES, NOT LINES. V8 coverage ranges are byte offsets into the
// file as loaded. Comments must therefore be blanked with a LENGTH-PRESERVING
// substitution, never removed: a stripper that shortens the text silently
// re-points every site at the wrong range. That mistake was made and caught
// while building this tool, and it reproduced QA-02's own false-positive
// mechanism exactly; assertion PC-0 pins the invariant so it cannot return.
//
// ASSERT-ZERO SHAPE, SO D46 APPLIES IN FULL. "No uncovered site outside the
// allowlist" passes just as happily when nothing was read at all. Hence:
//   PC-0  the comment blanker preserves byte length (offset validity)
//   PC-1  the number of SUBJECT FILES read, pinned to a literal
//   PC-2  the site census per subject, pinned to literals — a moved file or a
//         renamed helper takes these to 0, which a clean file never does
//   PC-3  the number of coverage directories consumed, pinned to a literal,
//         AND every named suite proved to have produced ranges for a subject
//   PC-4  the number of COVERED sites, pinned to a literal — the must-be-
//         present token; if the offset mapping breaks, this collapses
//   PC-5  a synthetic positive in P16's shape (test-render-perturbation.mjs
//         :275): manufacture a site the floor MUST reject and confirm it is
//         enumerated (PC-5a), and that the classifier is not stuck on zero
//         (PC-5c)
//   PC-6  an anchor-miss guard: every allowlist entry must still resolve to
//         the exact line text it records
//   PC-7  no coverage range bucketed against a subject extends past the end
//         of that subject on disk. A range that does was measured from a
//         DIFFERENT source, so every offset in the run is foreign. It was
//         the MIDDLE ROW OF PC-5, framed as a synthetic control, until
//         floor-02 promoted it: it went red on exactly that condition, and
//         the framing made the red read as "the control broke" rather than
//         "your offsets are not yours". Its retired id is deliberately not
//         written here — see the note at the assertion itself
//
// ---------------------------------------------------------------------------
// REGENERATING THE ALLOWLIST — read this before running --emit-allowlist.
//
// Any order that edits journey/structure.js or journey/chapter-contract.js, or
// that adds negative fixtures to a suite in SUITES, must budget one
// --emit-allowlist regeneration and re-pin the literals above. That is the
// intended cost: both directions of the ratchet are meant to require an edit
// that says what changed.
//
// THE CASE TO AUDIT IS A REGENERATED ALLOWLIST IN WHICH A ROW ARRIVED.
// A newly uncovered site gets laundered in alongside a debt row closed in the
// same edit: the two cancel, neither FLOOR-1 nor FLOOR-2 ever sees them,
// because the list was rewritten before either ran. Reviewers: diff the
// allowlist ROW BY ROW, never by size, and a regeneration that reports no row
// change at all did not need to happen.
//
// THIS PARAGRAPH USED TO NAME AN UNCHANGED SIZE AS THE SIGNATURE, AND THAT
// WAS WRONG — not incomplete, wrong, and the emitter's guard was built to
// match it. A laundered row does not need an unchanged size. It needs a net
// delta smaller than the number of rows that moved, which any size can
// supply. floor-02 caught it live: E02's probe defect moved SEVEN rows, four
// out and three in, and the size went 29 -> 28 — so the "size did not change"
// warning stayed silent through the exact event it existed to announce.
// The signal is ARRIVAL, and --emit-allowlist now refuses to print a
// pasteable block whenever a row has arrived, unconditionally.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stripComments } from './strip-comments.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const EMIT = process.argv.includes('--emit-allowlist');
const PROVE = process.argv.includes('--prove-failure');

/* ================================================================== *
 * THE SUBJECTS and THE SUITE SET                                      *
 *                                                                     *
 * The suite set is every suite in the gate that loads a subject at all *
 * — established by running the whole 29-suite chain under             *
 * NODE_V8_COVERAGE once and keeping the ones that produced ranges for  *
 * a subject. PC-3 re-proves that membership on every run, so a suite   *
 * that silently stops loading a subject is a failure, not a quiet      *
 * shrinking of the evidence base.                                      *
 * ================================================================== */

const SUBJECTS = ['journey/chapter-contract.js', 'journey/structure.js'];

const SUITES = [
  'journey/structure.test.mjs',
  'tools/scroll-touch-gates.mjs',
  'tools/test-chapter-contract.mjs',
  'tools/test-connect-motion.mjs',
  'tools/test-frame-order.mjs',
  'tools/test-scroll-perturbation.mjs',
  'tools/test-scroll-trace.mjs',
  /* DIET-01, 2026-08-22 — `tools/verify-j04a.mjs` was the eighth member and is
   * REMOVED, not repointed.
   *
   * QA-07's note (kept here because it is the reason this entry may never come
   * back as a path): the entry once pointed at the EVIDENCE copy of the suite,
   * which was D65 inside the gate itself. DIET-01 retires the suite back INTO
   * an evidence directory — so repointing it there is the one repair this row
   * is forbidden to make, and PC-3e is the assertion that says so.
   *
   * The floor is therefore a SEVEN-suite set. What that costs is measured, not
   * argued: the allowlist was regenerated in the same change and the row delta
   * is recorded at ALLOWLIST_SIZE below. */
];

/* ================================================================== *
 * SUB-01 / D65 — THE GATE, DERIVED FROM THE GATE.                     *
 *                                                                     *
 * QA-09's data-blindness sweep classified `PC-3e` DB1: it asserted     *
 * "no subject or suite in this gate lives under an evidence           *
 * directory" over the two HAND-WRITTEN arrays above. Both are          *
 * literally closed, so the predicate never opened anything, and the    *
 * assertion could only see D65 in the floor's OWN eight-suite list —   *
 * it LET D65'S RECURRENCE THROUGH IN ANY GATED SUITE ABSENT FROM IT,   *
 * which is forty of the forty-eight. `PC-3e2` kept the list non-empty  *
 * while NOTHING pinned that the list was the gate.                     *
 *                                                                     *
 * The subject of "no suite in this gate …" is THE GATE, so the reader  *
 * is now the chain itself, read out of package.json the way            *
 * tools/test-gate-composition.mjs reads it (`chainOf`, one entry per   *
 * ` && `, the `node ` prefix and any flags stripped).                  *
 *                                                                     *
 * ALL THREE gate scripts, not `test:contracts` alone. `npm run check`  *
 * runs test:unit, test:contracts and test:static, and two entries of   *
 * SUITES above (journey/structure.test.mjs, tools/scroll-touch-gates   *
 * .mjs) live in test:unit — reading only the contracts chain would     *
 * make the derived set NARROWER than the hand-written list it          *
 * replaces, which is the wrong direction for this repair.              *
 *                                                                     *
 * D63 — a chain that cannot be read yields NO measurement, never a     *
 * zero: a missing script refuses rather than returning an empty set    *
 * that would make PC-3e pass over nothing.                             *
 *                                                                     *
 * D99, and it is the reason PC-3f exists as a SEPARATE assertion:      *
 * deriving the collection from the subject satisfies D94 and DOES NOT  *
 * satisfy D54. They ask different questions — "was the reader          *
 * populated from the subject?" and "can the pin survive the subject    *
 * legitimately changing?" — and a pin can pass one and fail the other. *
 * So PC-3e reads the gate (D94) and PC-3f pins the scanned set as a    *
 * SITE SET KEYED BY NAME (D54): wiring a suite into the gate requires  *
 * ADDING A ROW here, which a count could never distinguish from a      *
 * reader that went blind and returned nothing.                         *
 * ================================================================== */
const GATE_SCRIPTS = ['test:unit', 'test:contracts', 'test:static'];

/** Every suite path the gate runs, from the package.json text supplied. */
function gatedPaths(pkgText) {
  let pkg;
  try {
    pkg = JSON.parse(pkgText);
  } catch (e) {
    throw new Error(`package.json does not parse, so the gate cannot be derived — ${e.message}`, { cause: e });
  }
  const seen = new Set();
  for (const key of GATE_SCRIPTS) {
    const line = pkg && pkg.scripts && pkg.scripts[key];
    if (typeof line !== 'string' || !line.length) {
      throw new Error(`package.json has no ${key} script — the gated set cannot be derived (D63)`);
    }
    for (const entry of line.split(' && ')) {
      const m = entry.trim().match(/^node\s+([^\s]+)/);
      if (m) seen.add(m[1]);
    }
  }
  return [...seen];
}

/** PC-3e/PC-3f's reader: every path this gate is made of, plus the two files
 *  the floor measures. Sorted and de-duplicated so the set is order-free —
 *  a suite MOVING in the chain is GC-ORDER's business, not this one's. */
const gateSurface = (pkgText) => [...new Set([...SUBJECTS, ...SUITES, ...gatedPaths(pkgText)])].sort();

/* ---- the pinned literals. Every expected value below is a literal; no
 * arithmetic appears on an expected side. ------------------------------- */
const SUBJECT_FILE_COUNT = 2;
const SUITE_COUNT = 7;
/* RE-PINNED by order U04, 2026-08-22. WAS: SITES_IN_STRUCTURE 46,
   TOTAL_SITES 59, COVERED_SITES 30. U04 added `copySurface` to the chapter
   manifest and four validations for it in journey/structure.js — the
   regeneration this file's header budgets for exactly that edit.

   ALLOWLIST_SIZE IS UNCHANGED AT 29, AND THAT IS THE NUMBER TO LOOK AT TWICE.
   The first regeneration banked U04's four new rejection arms as debt, 29 ->
   33. They were driven instead, with five negative fixtures in
   journey/structure.test.mjs (already a SUITES member), so the size came back
   to 29 with the four COVERED rather than recorded. The emitter then raised
   its own "size did not change but the rows did" warning, which is correct and
   is answered: the 48 moved row strings are pure line renumbering below the
   insertion point, and the row set is IDENTICAL BY (file, text) — 29 of 29,
   zero added, zero removed. Audited row by row as the header requires, not by
   size. Evidence: docs/code-health/evidence/2026-08-21-elegance-run-01/u04/
   coverage-allowlist-audit.txt.

   NOTE FOR THE COORDINATOR: this file is not on U04's allowlist. The edit is
   the one its own header instructs any order touching journey/structure.js to
   make, and the debt total did not move. */
const SITES_IN_CHAPTER_CONTRACT = 13;
const SITES_IN_STRUCTURE = 50;
const TOTAL_SITES = 63;
const COVERED_SITES = 34;
const ALLOWLIST_SIZE = 29;
/* DIET-01, 2026-08-22 — MEASURED, NOT ASSUMED, and the measurement is the
 * finding. Dropping tools/verify-j04a.mjs from SUITES took the set 8 -> 7 and
 * moved NOTHING: 59 sites, 30 executed, 29 uncovered, and `--emit-allowlist`
 * reported "rows added or removed vs the shipped list: 0". So that suite
 * contributed no site this floor could not already see through the other
 * seven, and the entry QA-07 preserved was buying nothing.
 *
 * This is exactly the case the header above says to AUDIT — a regeneration
 * whose size did not change — so it was diffed ROW BY ROW rather than by size,
 * which is what "0 rows changed" above is. The four literals are therefore
 * deliberately NOT touched by this order; an unchanged number that was
 * re-derived is worth more than one that was left alone. */

/* ================================================================== *
 * RECORDED DEBT — sites with execution count 0 across the suite set.  *
 *                                                                     *
 * This is NOT a list of sites that are allowed to stay uncovered. It  *
 * is the measured state on the day the floor was installed, written   *
 * out so that anything WORSE fails. Closing one of these is welcome    *
 * and requires removing its row and lowering ALLOWLIST_SIZE.          *
 *                                                                     *
 * Regenerate with --emit-allowlist. Format: file :: line :: site text. *
 * ================================================================== */
const ALLOWLIST = [
  "journey/chapter-contract.js :: 167 :: throw new Error('[chapter contract] a schema chapter row is required');",
  "journey/chapter-contract.js :: 171 :: throw new Error(`[chapter contract] schema row has no usable id: ${JSON.stringify(id)}`);",
  "journey/chapter-contract.js :: 174 :: throw new Error(`[chapter contract] ${id}: schema row has no boolean 'runtime' flag`);",
  "journey/chapter-contract.js :: 184 :: problems.push(`descriptor must be an object, got ${typeOf(descriptor)}`);",
  "journey/chapter-contract.js :: 218 :: problems.push(`capability '${cap}' must be an object or null, got ${describe(value)}`);",
  "journey/structure.js :: 131 :: if (typeof nodeAliases !== 'object' || Array.isArray(nodeAliases)) fail('aliases.nodes must be an object');",
  "journey/structure.js :: 133 :: if (typeof alias !== 'string' || !alias) fail(`invalid alias key: ${JSON.stringify(alias)}`);",
  "journey/structure.js :: 134 :: if (typeof target !== 'string' || !target) fail(`invalid alias target for ${alias}: ${JSON.stringify(target)}`);",
  "journey/structure.js :: 137 :: if (!Array.isArray(patterns)) fail('aliases.patterns must be an array');",
  "journey/structure.js :: 139 :: if (!p || !(p.pattern instanceof RegExp)) fail(`invalid alias pattern for ${(p && p.example) || '<pattern>'}`);",
  "journey/structure.js :: 140 :: if (typeof p.replacement !== 'string') fail(`invalid alias pattern replacement for ${p.example || '<pattern>'}`);",
  "journey/structure.js :: 141 :: if (typeof p.example !== 'string' || !p.example) fail('invalid alias pattern example');",
  "journey/structure.js :: 159 :: if (chapter.nav !== null && typeof chapter.nav !== 'string') fail(`invalid nav for ${label}: ${JSON.stringify(chapter.nav)}`);",
  "journey/structure.js :: 161 :: if (typeof chapter.symbol !== 'string' || !chapter.symbol) fail(`invalid symbol for ${label}: ${JSON.stringify(chapter.symbol)}`);",
  "journey/structure.js :: 163 :: fail(`invalid copyPosition for ${label}: ${JSON.stringify(chapter.copyPosition)}`);",
  "journey/structure.js :: 166 :: fail(`invalid scrollVh for ${label}: ${JSON.stringify(chapter.scrollVh)}`);",
  "journey/structure.js :: 171 :: fail(`invalid copyBand for ${label}`);",
  "journey/structure.js :: 173 :: if (band.lo !== null && !isFiniteNumber(band.lo)) fail(`invalid copyBand.lo for ${label}: ${JSON.stringify(band.lo)}`);",
  "journey/structure.js :: 174 :: if (band.hi !== null && !isFiniteNumber(band.hi)) fail(`invalid copyBand.hi for ${label}: ${JSON.stringify(band.hi)}`);",
  "journey/structure.js :: 195 :: if (!Array.isArray(stops)) fail(`invalid stops for ${label}: ${JSON.stringify(chapter.stops)}`);",
  "journey/structure.js :: 199 :: if (stop <= prevStop) fail(`non-monotonic stops for ${label}: ${JSON.stringify(stops)}`);",
  "journey/structure.js :: 212 :: if (!Array.isArray(segVh) || segVh.length === 0) fail(`invalid segVh for ${label}: ${JSON.stringify(segVh)}`);",
  "journey/structure.js :: 219 :: if (!isFiniteNumber(vh) || vh <= 0) fail(`invalid segVh entry for ${label}: ${JSON.stringify(vh)}`);",
  "journey/structure.js :: 234 :: fail(`invalid shape.k for ${label}: ${JSON.stringify(shape && shape.k)}`);",
  "journey/structure.js :: 253 :: if (!['none', 'fixed', 'dynamic'].includes(hot.kind)) fail(`unsupported hotspot kind for ${chapter.id}: ${hot.kind}`);",
  "journey/structure.js :: 285 :: if (!chapter) fail(`missing chapter reference: ${chapterId}`);",
  "journey/structure.js :: 290 :: if (hot.kind === 'dynamic' && actual.length !== hot.cardinality) fail(`unsupported fixed cardinality for ${chapterId}: ${actual.length}`);",
  "journey/structure.js :: 293 :: if (alias === target || !actualNodes.has(target)) fail(`alias points nowhere: ${alias} -> ${target}`);",
  "journey/structure.js :: 306 :: if (refs.symbols && !refs.symbols[schema.menuSymbol]) fail(`missing symbol reference: menu -> ${schema.menuSymbol}`);",
];

/* ================================================================== *
 * LEDGER                                                              *
 * ================================================================== */
const rows = [];
let failures = 0;
/** Every expectation passed here is a LITERAL. */
function eq(id, what, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  rows.push({ id, what, ok, actual: a, expected: e });
}

/* ================================================================== *
 * SITE ENUMERATION                                                    *
 * ================================================================== */

/** Blank every comment character to a space, keeping newlines, so the text
 *  is byte-for-byte the same LENGTH as the original. Offsets and line
 *  numbers therefore remain valid against V8's byte ranges. PC-0 asserts it.
 *
 *  QA-04: this was two regexes with no string, template or regex-literal
 *  state — the D67 defect, which R1's F-6 recorded here as harmless-today
 *  and which measured 80 wrongly-blanked characters across 3 lines of THIS
 *  file. Now the one shared implementation (S-3). It is length-preserving
 *  and line-preserving by construction, which is both properties this
 *  call site needs; PC-0 keeps asserting the first. */
const blankComments = (src) => stripComments(src);

// `throw`, a call to fail() that is not fail()'s own declaration, and a push
// onto the contract's `problems` accumulator.
const SITE_RE = () => /\bthrow\b|(?<!function\s)\bfail\(|\bproblems\.push\(/g;

/** Enumerate every rejection site in one subject's text.
 *  Returns [{ line, text, offset }]. */
function enumerateSites(src) {
  const blanked = blankComments(src);
  const lines = src.split('\n');
  const out = [];
  const re = SITE_RE();
  let m;
  while ((m = re.exec(blanked))) {
    const line = blanked.slice(0, m.index).split('\n').length;
    out.push({ line, offset: m.index, text: (lines[line - 1] || '').trim() });
  }
  return out;
}

/* ================================================================== *
 * COVERAGE COLLECTION — hash-fenced (D39)                             *
 * ================================================================== */
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const fence = (rels) => rels.map((r) => `${sha(join(REPO, r))}  ${r}`).join('\n');

function collect(covRoot) {
  const exits = [];
  for (const suite of SUITES) {
    const dir = join(covRoot, `cov-${suite.replace(/[/.]/g, '_')}`);
    mkdirSync(dir, { recursive: true });
    let code = 0;
    try {
      execFileSync(process.execPath, [join(REPO, suite)], {
        cwd: REPO, env: { ...process.env, NODE_V8_COVERAGE: dir }, stdio: 'ignore',
      });
    } catch (e) { code = e.status ?? 1; }
    exits.push({ suite, code, dir });
  }
  return exits;
}

/* ================================================================== *
 * floor-02 — ATTRIBUTION IS NOT A PATH MATCH.                         *
 *                                                                     *
 * `fileURLToPath` DISCARDS THE QUERY STRING. A suite that loads a      *
 * subject under a patched specifier — journey/structure.test.mjs does, *
 * `./structure.js?e02-alias-probe=1` through a registerHooks `load`    *
 * hook that injects 28 characters at offset 2047 — produces a SECOND   *
 * ScriptCoverage whose url differs only in its query, and which landed *
 * in the SAME bucket as the file on disk. Its ranges were then read as *
 * offsets into a source they do not describe. Seven sites flipped, and *
 * the four that flipped to COVERED were credited from ranges spanning  *
 * an `if` CONDITION in the probe's source, which land, shifted by the  *
 * injection delta, on the offset of a `fail(...)` CONSEQUENT that      *
 * never ran. Measured three ways in                                    *
 * docs/code-health/evidence/2026-08-21-elegance-run-01/floor-01/.      *
 *                                                                     *
 * THIS IS PC-0'S DEFECT ARRIVING THROUGH THE OTHER DOOR. PC-0 guards   *
 * the length of the transformation THIS FILE performs. Nothing guarded *
 * the length of the one the LOADER performs — and the header's warning *
 * that a transformation which changes the text "silently re-points     *
 * every site at the wrong range" is precisely what happened, to a      *
 * lengthener, in another file. The D39 hash fence cannot see it: the   *
 * tree never changed. The divergence lives in memory, in a load hook.  *
 *                                                                     *
 * So a ScriptCoverage may be bucketed against a subject only if the    *
 * source V8 measured is DEMONSTRABLY the source on disk. Two           *
 * independent tests, and each covers the other's blind spot:           *
 *                                                                     *
 *   URL     the url must be the bare file — no query, no fragment. A   *
 *           suffixed specifier is a distinct module instance whose     *
 *           source passed through the loader and was never verified.   *
 *           Catches a LENGTH-PRESERVING patch, which EXTENT cannot.    *
 *   EXTENT  the largest endOffset must EQUAL the length of the file on *
 *           disk. V8 emits the whole-module range [0, len) as          *
 *           functions[0] for every ESM script, so on the honest path   *
 *           this is an exact identity — measured 8 of 8 across the     *
 *           suite set, with the probe url the only miss. Catches a     *
 *           patch applied to the BARE specifier, which URL cannot.     *
 *                                                                     *
 * OFFSETS ARE UTF-16 CODE UNITS, NOT BYTES, and this file's header has *
 * always called them bytes. That was harmless until something needed   *
 * to compare a length: BOTH SUBJECTS CONTAIN NON-ASCII — structure.js  *
 * is 17158 bytes and 17122 code units — so an EXTENT test written      *
 * against statSync().size would refuse every honest script in the set. *
 * The comparison is against the `.length` of the decoded string, which *
 * is the same quantity enumerateSites() indexes with.                  *
 *                                                                     *
 * REFUSED, NOT SILENTLY DROPPED. A refusal names the url, the length   *
 * on disk and the extent observed, so whoever next loads a subject     *
 * under a patched specifier meets the diagnosis instead of a number.   *
 * It does not fail the run by itself: excluding a foreign source IS    *
 * the correct measurement, and a refusal can only LOWER the covered    *
 * count, which PC-4 reds on loudly. A refused script also stops        *
 * proving PC-3 membership for its suite — coverage that is not         *
 * evidence cannot testify that a suite loaded the subject either.      *
 * PC-7 is the paired control: it reds if a foreign range ever reaches  *
 * a bucket again.                                                      *
 * ================================================================== */

/** Why this ScriptCoverage may NOT be attributed to the file on disk, or
 *  null if it may. `srcLen` is the subject's length in UTF-16 code units. */
function foreignReason(sc, srcLen) {
  let u;
  try { u = new URL(sc.url); } catch { return 'its url does not parse, so nothing about its source can be verified'; }
  let maxEnd = -Infinity;
  for (const fn of sc.functions) for (const r of fn.ranges) if (r.endOffset > maxEnd) maxEnd = r.endOffset;
  const extent = maxEnd === -Infinity ? 'no ranges at all' : `${maxEnd}`;
  if (u.search || u.hash) {
    return `loaded under a SUFFIXED SPECIFIER ${JSON.stringify(u.search + u.hash)}, so its source `
      + `reached V8 through the loader and was never verified against the file on disk `
      + `(on disk ${srcLen} code units; these ranges extend to ${extent})`;
  }
  if (maxEnd !== srcLen) {
    return `its ranges span a source ${extent} code units long, but the file on disk is ${srcLen} `
      + '— these offsets do not describe this file';
  }
  return null;
}

/** Read every coverage JSON under `covRoot` and bucket the ranges by subject.
 *  Also records, per coverage directory, which subjects it saw — PC-3's
 *  per-suite positive control — and every script refused by `foreignReason`. */
function readCoverage(covRoot, srcLenOf) {
  const bySubject = new Map(SUBJECTS.map((s) => [s, []]));
  const dirsSeen = [];
  const foreign = [];
  for (const name of readdirSync(covRoot)) {
    const dir = join(covRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    const subjectsHere = new Set();
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      let j;
      try { j = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
      for (const sc of j.result) {
        if (!sc.url.startsWith('file://')) continue;
        let p;
        try { p = fileURLToPath(sc.url); } catch { continue; }
        const rel = relative(REPO, p);
        if (!bySubject.has(rel)) continue;
        const why = foreignReason(sc, srcLenOf(rel));
        if (why) { foreign.push({ dir: name, url: sc.url, rel, why }); continue; }
        subjectsHere.add(rel);
        for (const fn of sc.functions) for (const r of fn.ranges) bySubject.get(rel).push(r);
      }
    }
    dirsSeen.push({ dir: name, subjects: [...subjectsHere].sort() });
  }
  return { bySubject, dirsSeen, foreign };
}

/** Innermost V8 range containing `off`; among equally-innermost ranges from
 *  different runs, the highest count wins (union semantics). null = no range
 *  covers this offset at all, which is as uncovered as count 0. */
function countAt(ranges, off) {
  let bestLen = Infinity;
  let best = null;
  for (const r of ranges) {
    if (r.startOffset <= off && off < r.endOffset) {
      const len = r.endOffset - r.startOffset;
      if (len < bestLen) { bestLen = len; best = r.count; }
      else if (len === bestLen && r.count > best) best = r.count;
    }
  }
  return best;
}

/* ================================================================== *
 * RUN                                                                 *
 * ================================================================== */

/* ================================================================== *
 * ABORT SENTINEL (D57)                                                *
 *                                                                     *
 * A run that crashes — a ReferenceError, a throw from an anchor guard, *
 * a process killed mid-collection — prints neither a FAIL line nor a   *
 * summary line. Under a reader or a CI filter that greps for "FAIL",   *
 * an abort is then BYTE-IDENTICAL TO A CLEAN PASS. An order shipped a  *
 * ReferenceError into the gate this run for exactly that reason.       *
 *                                                                     *
 * So: arm a sentinel now, disarm it only on the one path that reaches  *
 * the summary. If the process ends any other way, the last line it     *
 * emits begins with FAIL and names the exit code. Silence is never a   *
 * pass.                                                                *
 * ================================================================== */
let reachedSummary = false;
process.on('exit', (code) => {
  if (reachedSummary) return;
  console.log(`FAIL ABORT coverage floor ended before reporting (exit ${code}) — an aborted run is not a pass`);
  console.log('\ncoverage floor: ABORTED before reporting');
});

const fenceRels = [...SUBJECTS, ...SUITES];

const covRoot = mkdtempSync(join(tmpdir(), 'coverage-floor-'));
/* floor-02 — THE CLEANUP HAS TO HANG OFF `exit`, NOT OFF `finally` ALONE.
 * `process.exit()` does not unwind the stack: it runs exit listeners and
 * stops. The two INCONCLUSIVE paths below both call it from INSIDE the try,
 * so the `finally` that removes this tree is skipped every time either one
 * fires — as is every `--prove-failure` anchor throw that escapes. Nineteen
 * stale trees holding 25 MB were sitting in the system temp directory when
 * floor-02 went looking. Pre-existing, and a one-line class of fix:
 * registering the removal here covers every way out of this process,
 * including the ones nobody has written yet. The `finally` stays, because it
 * frees the tree promptly on the normal path, and `force: true` makes the
 * second removal a no-op. */
process.on('exit', () => rmSync(covRoot, { recursive: true, force: true }));
let exits;
try {
  /* D39 — the fence, with ONE bounded retry.
   *
   * Six orders write to this tree concurrently. If a suite or subject is
   * rewritten during collection, the byte offsets this measurement rests on
   * stop mapping and the result is not evidence. Observed live: a concurrent
   * order rewrote tools/test-chapter-contract.mjs mid-collection, that run of
   * it exited 1 and produced no coverage for journey/chapter-contract.js, and
   * all 8 of that subject's covered sites went dark at once.
   *
   * The window is milliseconds wide, so one retry clears almost every
   * occurrence. What must NOT happen is the retry quietly becoming a way to
   * keep going: if the second attempt also drifts, the run is INCONCLUSIVE and
   * says so, and no measurement is reported at all. */
  let hashesPost;
  let attempts = 0;
  let fenceStart;
  do {
    attempts++;
    fenceStart = fence(fenceRels);
    exits = collect(covRoot);
    hashesPost = fence(fenceRels);
    if (fenceStart !== hashesPost && attempts < 2) {
      console.log('  fence drifted during collection — discarding and re-collecting once');
      rmSync(covRoot, { recursive: true, force: true });
      mkdirSync(covRoot, { recursive: true });
    }
  } while (fenceStart !== hashesPost && attempts < 2);

  const drifted = fenceStart !== hashesPost;
  eq('HF1', 'no subject or suite drifted across the coverage run (D39 hash fence)',
    drifted ? 'DRIFT' : 'no drift', 'no drift');
  if (drifted) {
    const pre = fenceStart.split('\n');
    const post = hashesPost.split('\n');
    for (let i = 0; i < pre.length; i++) if (pre[i] !== post[i]) console.log(`  DRIFT  ${pre[i]}  ->  ${post[i]}`);
    /* INCONCLUSIVE, not FAILING-ON-THE-FLOOR.
     *
     * Everything downstream — the covered count, the uncovered set, FLOOR-1/2/3
     * — is computed from offsets that no longer map. Reporting those numbers
     * would put eight `NEW UNCOVERED` rows in front of a reviewer that describe
     * a concurrent write, not a regression, and that is exactly the misreading
     * D39 exists to prevent. So the run stops here: one red, naming the cause,
     * and no measurement presented as a finding. Still exit non-zero — an
     * inconclusive gate is never a pass. */
    console.log('\n  *** INCONCLUSIVE — coverage was collected across a tree that changed under it.');
    console.log('  *** No floor verdict is reported: these offsets no longer map to these files.');
    console.log('  *** This is a concurrent-write condition, NOT a coverage regression.');
    console.log('  *** Re-run when the file(s) named above are settled.');
    console.log('');
    for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.what}`);
    console.log('\ncoverage floor: INCONCLUSIVE (fence drift after 2 attempts)');
    reachedSummary = true;
    process.exit(1);
  }

  /* A CRASHED SUITE IS INCONCLUSIVE, FOR THE SAME REASON DRIFT IS.
   *
   * The floor reads coverage produced by suites it spawns. A suite that exits
   * non-zero — or, as observed live, one a concurrent order left holding a
   * SyntaxError — produces partial or empty coverage, and every site it would
   * have exercised goes dark at once. The resulting numbers describe the crash,
   * not the tree: when tools/test-chapter-contract.mjs was mid-edit, this floor
   * reported all 8 covered sites in journey/chapter-contract.js as NEW
   * UNCOVERED, which reads exactly like a catastrophic regression and was
   * nothing of the kind.
   *
   * A floor whose inputs did not run has measured nothing, so it reports
   * nothing — one red naming the suite, and still a non-zero exit. The gate
   * runs those suites in their own right, so the real failure is never masked;
   * it is simply not restated here as a coverage finding. */
  const crashed = exits.filter((e) => e.code !== 0);
  eq('PC-3d', 'every suite in the set exited 0, so its coverage is complete',
    crashed.length, 0);
  if (crashed.length > 0) {
    for (const c of crashed) console.log(`  SUITE FAILED  ${c.suite}  exit ${c.code}`);
    console.log('\n  *** INCONCLUSIVE — a suite in the coverage set did not complete.');
    console.log('  *** No floor verdict is reported: sites that suite would have exercised');
    console.log('  *** are dark because it crashed, not because they are unreachable.');
    console.log('  *** Fix the suite(s) named above, then re-run. The gate already fails on');
    console.log('  *** them in their own right; this is not a second, independent finding.');
    console.log('');
    for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.what}`);
    console.log('\ncoverage floor: INCONCLUSIVE (a suite in the set failed)');
    reachedSummary = true;
    process.exit(1);
  }

  /* floor-02 — the subjects are read BEFORE the coverage is attributed,
   * because attribution now depends on their length: a script whose ranges
   * span a different number of code units was measured from a different
   * source. See foreignReason() above. */
  const sources = new Map();
  for (const rel of SUBJECTS) sources.set(rel, readFileSync(join(REPO, rel), 'utf8'));

  const { bySubject, dirsSeen, foreign } = readCoverage(covRoot, (rel) => sources.get(rel).length);
  for (const f of foreign) {
    console.log(`  COVERAGE REFUSED  ${f.dir}`);
    console.log(`    ${f.url}`);
    console.log(`    NOT attributed to ${f.rel}: ${f.why}`);
    console.log('    Its offsets index a source this floor never read. Counting them would credit');
    console.log('    rejection sites from bytes that describe other code. If this suite means to');
    console.log('    measure the subject, load it under its real specifier and patch nothing.');
  }

  /* ---- PC-0: offsets are valid because blanking preserves length -------- */
  let blankerPreservesLength = 0;
  for (const rel of SUBJECTS) {
    const src = sources.get(rel);
    if (blankComments(src).length === src.length) blankerPreservesLength++;
  }
  eq('PC-0', 'the comment blanker preserved byte length on every subject (V8 offsets stay valid)',
    blankerPreservesLength, 2);

  /* ---- PC-1: files-read pin. Inputs, not matches. ---------------------- */
  eq('PC-1a', 'the floor read exactly 2 subject files (files-read pin)', sources.size, SUBJECT_FILE_COUNT);
  eq('PC-1b', 'every subject file read back non-empty',
    [...sources.values()].filter((s) => s.length > 0).length, SUBJECT_FILE_COUNT);

  /* PC-3e — D65 in the gate itself, pinned so it cannot come back. A gated
   * instrument may not depend on an append-only evidence directory.
   *
   * SUB-01: the subject is now THE GATE, derived from package.json (see
   * `gateSurface` above), not the two hand-written arrays this assertion
   * used to read. It covers all 48 gated suites plus the floor's own two
   * subjects, so D65's recurrence ANYWHERE in the gate reds here. */
  const EVIDENCE_PREFIX = 'docs/code-health/evidence/';
  const gateSurfaceNow = gateSurface(readFileSync(join(REPO, 'package.json'), 'utf8'));
  eq('PC-3e', 'D65 — no subject or suite in this gate lives under an evidence directory',
    gateSurfaceNow.filter((r) => r.startsWith(EVIDENCE_PREFIX)), []);
  /* PC-3f — D54, and D99's point that D94 did not already buy it. PC-3e's
   * reader is now populated from the subject, which is all D94 asks; it says
   * nothing about whether the pin survives the subject legitimately changing.
   * A bare `gateSurfaceNow.length === 50` could not tell "a suite was wired
   * in" from "the derivation went blind and returned a different set of the
   * same size", and the cheapest repair to a red count is to bump the number.
   * So: THE SET, BY NAME. Wiring a suite into any of the three gate scripts
   * requires ADDING A ROW here — a deliberate act with a visible subject —
   * and a reader that stops reading yields the EMPTY set, which no edit to a
   * number can repair. */
  eq('PC-3f', 'D54 — the exact set of paths PC-3e scanned, keyed by NAME: adding a suite to the gate requires adding a row here, not bumping a count',
    gateSurfaceNow, [
      'journey/chapter-contract.js',
      'journey/structure.js',
      'journey/structure.test.mjs',
      'tools/scroll-touch-gates.mjs',
      'tools/test-animation-lifecycle.mjs',
      'tools/test-assertion-provenance.mjs',
      'tools/test-baked-lifecycle.mjs',
      'tools/test-browser-harness.mjs',
      /* ONE ROW WAS REMOVED HERE BY DIET-02, 2026-08-26.
         WAS: 'tools/test-c06-registry.mjs'
         PC-3e's subject is THE GATE, derived from package.json, and that suite
         is retired out of it to docs/code-health/evidence/
         2026-08-21-elegance-run-01/retired-suites/. PC-3f is name-keyed exactly
         so that a suite LEAVING the gate is a visible row removal and not a
         decremented count — the direction in which a silent drift looks like
         housekeeping. */
      /* Wired into the gate by U01c, 2026-08-22: U01b's card-registry suite
         (transferred — U01b built it and declined to pick another order's
         chain position) and U01c's own card-icons suite. PC-3f is name-keyed
         exactly so that this is a visible row rather than a bumped count. */
      'tools/test-card-icons.mjs',
      'tools/test-card-registry.mjs',
      'tools/test-card-warming.mjs',
      'tools/test-chapter-contract.mjs',
      'tools/test-chapter-entry.mjs',
      'tools/test-check-cycles.mjs',
      'tools/test-comment-stripper.mjs',
      'tools/test-connect-motion.mjs',
      'tools/test-coverage-floor.mjs',
      /* Wired into the gate by CONV-CLOSE, 2026-08-26, in the same change as
         its package.json entry — CONV-02's declared-conversion suite, D49's
         sixteenth instance closed. PC-3f is name-keyed exactly so that this is
         a visible row rather than a bumped count, and the row is SORTED into
         place because the set is compared in order. What it is NOT: a member
         of the coverage SET (the seven suites PC-3a consumes), because it
         neither imports nor executes journey/structure.js or
         journey/chapter-contract.js — it is a pure recomputation over route,
         chapter and copy constants. It appears here because PC-3e's subject
         is THE GATE, not the coverage set. */
      'tools/test-declared-conversions.mjs',
      'tools/test-detail-close-focus.mjs',
      /* Wired into the gate by the border-flash suite (owner report #30) and
         adjudicated here on 2026-08-26 by the order that closed its wiring
         debt. It is the same species of row as U01c's and J02's above: the
         suite joined test:contracts and this pin asked for a NAME, which is
         the whole reason it is not a count. Note what it is NOT: it is not a
         member of the coverage SET (the seven suites PC-3a consumes), because
         it neither imports nor executes journey/structure.js or
         journey/chapter-contract.js — it is a static reader of three
         stylesheets. It appears here because PC-3e's subject is THE GATE, not
         the coverage set. */
      'tools/test-detail-shell-monotone.mjs',
      'tools/test-discord-card.mjs',
      'tools/test-dwell-oracle.mjs',
      'tools/test-error-classes.mjs',
      'tools/test-frame-order.mjs',
      /* Wired into the gate by J02, 2026-08-22, in the same change as its
         package.json entry. PC-3f is name-keyed exactly so that this is a
         row rather than a count bump. */
      'tools/test-frame-publication.mjs',
      'tools/test-gate-composition.mjs',
      /* Wired into the gate by J04c, 2026-08-22, in the same change as its
         package.json entry. PC-3f is name-keyed exactly so that this is a
         row rather than a count bump. */
      'tools/test-global-hooks.mjs',
      /* Wired into the gate by U02, 2026-08-22, in the same change as its
         package.json entry. PC-3f is name-keyed exactly so that this is a
         visible row rather than a bumped count. */
      'tools/test-hot-state.mjs',
      /* Wired into the gate by J01, 2026-08-22. PC-3f is name-keyed exactly so
         that this is a row rather than a count bump, and it reddened naming
         both files the moment package.json grew them. */
      'tools/test-input-claim.mjs',
      'tools/test-instrument-layer.mjs',
      'tools/test-intro-lifecycle.mjs',
      /* `tools/test-journey-lifecycle.mjs` stood here and was removed by the
         DISPOSAL REMOVAL, 2026-08-25, with five others below. PC-3f is
         name-keyed exactly so a RETIREMENT is a visible row deletion rather
         than a count bump, and it reddened naming all six the moment
         package.json shed them. */
      /* Wired into the gate by J05, 2026-08-22, in the same change as its
         package.json entry. PC-3f is name-keyed exactly so that this is a
         row rather than a count bump — and the row is SORTED into place,
         because the set is compared in order. */
      'tools/test-page-lifetime.mjs',
      'tools/test-portrait-baked.mjs',
      'tools/test-portrait-dealer.mjs',
      'tools/test-portrait-lifecycle.mjs',
      'tools/test-portrait-paint.mjs',
      'tools/test-portrait-perturbation.mjs',
      'tools/test-portrait-textures.mjs',
      'tools/test-pose-oracle.mjs',
      /* Five more retirements by the DISPOSAL REMOVAL, 2026-08-25, in this
         position: test-preparation-lifecycle, test-r05-chapter-disposal,
         test-r06-owned-disposal, test-r07-final-disposal and
         test-r08-registry-cascade. All five proved disposal paths with no
         production caller; the paths were removed and the suites retired to
         docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites-disposal/.
         See docs/code-health/DISPOSAL-REMOVED.md. */
      'tools/test-render-baseline.mjs',
      'tools/test-render-determinism.mjs',
      'tools/test-render-perturbation.mjs',
      'tools/test-renderer-resources.mjs',
      /* no-auto-advance, 2026-08-26 — wired into test:contracts in the same
         change, for owner report #26. A row, not a bumped count, exactly as
         this pin requires. */
      'tools/test-rest-authority.mjs',
      /* connect-skip second pass, 2026-08-25 — wired into test:contracts in the
         same change. A row, not a bumped count, exactly as this pin requires. */
      'tools/test-rest-composition.mjs',
      'tools/test-road.mjs',
      'tools/test-scroll-perturbation.mjs',
      'tools/test-scroll-trace.mjs',
      'tools/test-spores-lifecycle.mjs',
      'tools/test-static-content.mjs',
      'tools/test-transition.mjs',
      /* Wired into the gate by J03, 2026-08-22, in the same change as its
         package.json entry. PC-3f is name-keyed exactly so that this is a
         row rather than a count bump. */
      'tools/test-ui-closure.mjs',
      'tools/test-ui-lifecycle.mjs',
      /* NINE ROWS LEFT, by order DIET-01, 2026-08-22, and they are named here
         rather than deducted from a count because that is the whole of D54:
         tools/{verify-j04a,verify-j04b,test-owned-substrate-split,
         test-portrait-remix,test-tendrils-split,test-ring-split,
         test-canopy-split,test-terrain-split,test-clones-split}.mjs, retired
         to docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/
         and still runnable there. A suite LEAVING the gate is as much a
         finding as one arriving, which is why this row is name-keyed in both
         directions. */
    ]);
  /* The control runs over a SYNTHETIC pair, not over the real arrays with a
   * synthetic row appended. Sharing the subject would make it redden on the
   * same fault as PC-3e — a control that fails whenever the thing it controls
   * fails reports nothing extra. The second term keeps PC-3e's own subject
   * honest: an assert-zero over an empty set passes.
   *
   * SUB-01 left this row exactly as it stood, deliberately. It is the one
   * assertion here that is SUPPOSED to be literal on both sides: its input is
   * a manufactured pair whose whole purpose is to be known, which is why
   * QA-09's sweep files it under "literals that are legitimately literal"
   * rather than as a data-blindness hit. The non-emptiness term it carries is
   * now subsumed by PC-3f, which pins the same subject by name. */
  eq('PC-3e2', 'D46 control for PC-3e: the predicate DOES recognise an evidence path and does NOT flag a tools/ one, and PC-3e\'s subject is non-empty',
    /* DIET-01: the synthetic tools/ row was `tools/verify-j04a.mjs`, which is
       no longer on disk. The pair is manufactured and its whole purpose is to
       be known, so nothing about the control changes — but a control that
       names a file nobody can open reads as an anchor, and it is not one. */
    [['tools/test-comment-stripper.mjs', `${EVIDENCE_PREFIX}x/y.mjs`].filter((r) => r.startsWith(EVIDENCE_PREFIX)),
      SUBJECTS.length + SUITES.length > 5],
    [[`${EVIDENCE_PREFIX}x/y.mjs`], true]);

  /* ---- PC-2: site census per subject, pinned. A moved file or a renamed
   * helper drives these to 0; a clean file never does. -------------------- */
  const sites = new Map();
  for (const rel of SUBJECTS) sites.set(rel, enumerateSites(sources.get(rel)));
  eq('PC-2a', 'rejection-site census: journey/chapter-contract.js',
    sites.get('journey/chapter-contract.js').length, SITES_IN_CHAPTER_CONTRACT);
  eq('PC-2b', 'rejection-site census: journey/structure.js',
    sites.get('journey/structure.js').length, SITES_IN_STRUCTURE);

  /* ---- PC-3: coverage directories consumed, and per-suite membership ---- */
  eq('PC-3a', 'the floor consumed exactly 7 coverage directories (one per suite in the set)',
    dirsSeen.length, SUITE_COUNT);
  eq('PC-3b', 'every suite in the set produced coverage for at least one subject',
    dirsSeen.filter((d) => d.subjects.length > 0).length, SUITE_COUNT);
  eq('PC-3c', 'journey/chapter-contract.js was loaded by at least one suite in the set',
    dirsSeen.filter((d) => d.subjects.includes('journey/chapter-contract.js')).length > 0, true);

  /* ---- the measurement ------------------------------------------------- */
  const rowsMeasured = [];
  let iterated = 0;
  for (const rel of SUBJECTS) {
    const ranges = bySubject.get(rel);
    for (const s of sites.get(rel)) {
      iterated++;
      const count = countAt(ranges, s.offset);
      rowsMeasured.push({ key: `${rel} :: ${s.line} :: ${s.text}`, rel, line: s.line, text: s.text, count: count ?? 0 });
    }
  }
  // D45 — the loop's iteration count is a primary assertion pinned to a
  // non-zero literal. A floor that iterated over nothing must not pass.
  eq('PC-2c', 'the measurement loop ran over every enumerated site (iteration pin)', iterated, TOTAL_SITES);

  const covered = rowsMeasured.filter((r) => r.count > 0);
  const uncovered = rowsMeasured.filter((r) => r.count === 0);

  /* ---- PC-4: the must-be-present token. If the offset mapping breaks, the
   * covered count collapses while the uncovered count balloons — and an
   * assert-zero check on "new uncovered sites" alone would not notice. ---- */
  eq('PC-4', 'sites measured as EXECUTED (must-be-present token — 0 here means the mapping broke, not that the code is dead)',
    covered.length, COVERED_SITES);

  /* ---- PC-5: synthetic positive, in P16's shape. Manufacture a site the
   * floor must reject, rather than corrupt an absent one. ----------------- */
  {
    const real = sources.get('journey/structure.js');
    const synthetic = `${real}\nfail('QA-03 synthetic uncovered site');\n`;
    const synthSites = enumerateSites(synthetic);
    /* 51 = SITES_IN_STRUCTURE (50) + the one manufactured above. Left as a
       literal, in this file's own idiom: a pin derived from another pin cannot
       fail when that pin is the thing that drifted. Re-pinned 47 -> 51 by U04
       with the copySurface validations. */
    eq('PC-5a', 'a manufactured rejection site is enumerated (census moves by exactly one)',
      synthSites.length, 51);
    const injected = synthSites[synthSites.length - 1];
    /* PC-7 — PROMOTED OUT OF THIS CONTROL BLOCK BY floor-02, KEEPING THE
     * MECHANISM, BECAUSE THE MECHANISM WORKED.
     *
     * This was PC-5's middle row, and it read "the manufactured site sits
     * past every real coverage range and is classified UNCOVERED" — a
     * synthetic positive control, sitting between two others. It went red
     * the day the alias-probe graph was attributed to journey/structure.js,
     * for exactly the right reason, and the framing meant its red said THE
     * CONTROL BROKE when what it had found was YOUR OFFSETS ARE FOREIGN.
     *
     * ITS RETIRED ID IS NOT SPELLED OUT ANYWHERE IN THIS FILE, and that is
     * deliberate rather than coy. A renamed id left behind in prose is a
     * citation of an assertion that no longer exists, which is precisely
     * what the gate's false-citation sweep is built to find — and it found
     * this one, in this very comment, on the first run after the rename.
     * That sweep is also why the order that made this change spells
     * its own name in lower case throughout: the upper-case form collides
     * with the live FLOOR-1/2/3 prefix defined below and reads, correctly,
     * as a citation of an assertion id that was never defined.
     *
     * There is nothing synthetic about what it detects. The site is placed
     * one character past the end of the subject, so a non-null count at
     * that offset means SOME BUCKETED RANGE EXTENDS BEYOND THE FILE ON
     * DISK — which can only happen if those ranges were produced from a
     * different source, and if they were, every offset in this run is
     * suspect, not just this one. Renamed and reworded so the red names
     * that condition on sight.
     *
     * It is now the standing control on the attribution refusal above: if a
     * foreign source ever reaches a subject bucket again, this is the row
     * that says so. PC-5a and PC-5c around it remain what they always were. */
    eq('PC-7', 'no coverage range attributed to journey/structure.js reaches past the end of the file on disk — one that does was measured from a DIFFERENT source, so every offset in this run is foreign (see COVERAGE REFUSED above, and PC-0 for the same defect in this file\'s own transformation)',
      countAt(bySubject.get('journey/structure.js'), injected.offset) ?? 0, 0);
    eq('PC-5c', 'a site known to execute is classified COVERED (the classifier is not stuck on zero)',
      countAt(bySubject.get('journey/structure.js'), sites.get('journey/structure.js')[0].offset) > 0, true);
  }

  /* ---- PC-6: anchor-miss guard on the allowlist ------------------------- */
  /** Resolve every allowlist row against a supplied view of the subjects.
   *  Factored out so --prove-failure's M5 can drive the SAME quantity PC-6a
   *  asserts (`resolved`) rather than a single-row boolean proxy. */
  function resolveAnchors(srcOf) {
    let resolved = 0;
    const misses = [];
    for (const entry of ALLOWLIST) {
      const idx = entry.indexOf(' :: ');
      const rel = entry.slice(0, idx);
      const rest = entry.slice(idx + 4);
      const idx2 = rest.indexOf(' :: ');
      const line = Number(rest.slice(0, idx2));
      const text = rest.slice(idx2 + 4);
      const src = srcOf(rel);
      if (src && (src.split('\n')[line - 1] || '').trim() === text) resolved++;
      else misses.push(entry);
    }
    return { resolved, misses };
  }
  const { resolved: anchorsResolved, misses: anchorMisses } = resolveAnchors((rel) => sources.get(rel));
  eq('PC-6a', 'every allowlist entry still resolves to the exact line text it records (anchor-miss guard)',
    anchorsResolved, ALLOWLIST_SIZE);
  eq('PC-6b', 'the allowlist is exactly the size it declares', ALLOWLIST.length, ALLOWLIST_SIZE);

  /* ---- THE FLOOR ------------------------------------------------------- */
  const allow = new Set(ALLOWLIST);
  const newlyUncovered = uncovered.filter((r) => !allow.has(r.key));
  const closedDebt = ALLOWLIST.filter((k) => !uncovered.some((r) => r.key === k));

  eq('FLOOR-1', 'no rejection site outside the recorded allowlist is unexecuted', newlyUncovered.length, 0);
  eq('FLOOR-2', 'the recorded allowlist still describes the measured debt exactly (a closed site must be removed from it, not left)',
    closedDebt.length, 0);
  eq('FLOOR-3', 'total uncovered sites equals the recorded debt', uncovered.length, ALLOWLIST_SIZE);

  if (EMIT) {
    console.log('\n--emit-allowlist — paste into ALLOWLIST, and update the pinned literals.');
    /* floor-02 — THE GUARD STAYED SILENT THROUGH THE EVENT IT WAS BUILT FOR.
     *
     * It warned only when `sizeUnchanged && rowsChanged > 0`. On E02's probe
     * defect the size DID change — 29 -> 28 — so no warning printed while
     * SEVEN rows moved: four departed and three arrived. The four that left
     * were never closed (their coverage was credited from another source's
     * bytes) and the three that arrived were newly uncovered rejection
     * sites. Pasting the emitted block would have laundered all seven, and
     * the report the previous order read said only "7".
     *
     * A LAUNDERED ROW DOES NOT NEED AN UNCHANGED SIZE. It needs a net delta
     * smaller than the number of rows that moved, and every size satisfies
     * that for some pair. The size was never the signal. ARRIVAL is: a row
     * arriving in recorded debt is a rejection site that is newly
     * unexecuted, which is the precise condition FLOOR-1 goes red on — and
     * --emit-allowlist is the one code path in this file that can retire
     * that red BEFORE FLOOR-1 ever runs, by rewriting the list it is
     * checked against.
     *
     * The old code computed both halves and then DESTROYED THE DISTINCTION
     * by summing them into `rowsChanged`. They are two numbers now, each
     * with its rows named, and while any row has arrived the emitter
     * REFUSES TO PRINT A PASTEABLE BLOCK AT ALL. Unconditionally: no size
     * term, no threshold, nothing for a hurried reader to reason past. That
     * makes the previous order's stop mechanical instead of discretionary —
     * it stopped by producing a row-by-row diff it had to think to want.
     *
     * The literals are still printed. They are a measurement, they are not
     * pasteable on their own, and a reader who has just been refused a
     * block is exactly the reader who needs to see what moved. */
    const shipped = new Set(ALLOWLIST);
    const arrivedRows = uncovered.filter((r) => !shipped.has(r.key)).map((r) => r.key);
    const departedRows = ALLOWLIST.filter((k) => !uncovered.some((r) => r.key === k));
    console.log(`  rows ARRIVED in the debt (newly uncovered sites): ${arrivedRows.length}`);
    console.log(`  rows DEPARTED from the debt (no longer uncovered): ${departedRows.length}`);
    console.log(`  allowlist size: ${ALLOWLIST_SIZE} -> ${uncovered.length}`);
    for (const k of arrivedRows) console.log(`    ARRIVED   ${k}`);
    for (const k of departedRows) console.log(`    DEPARTED  ${k}`);
    if (arrivedRows.length === 0 && departedRows.length === 0) {
      console.log('  (no row changed — this regeneration was not needed)');
    }
    console.log('');
    console.log(`  SITES_IN_CHAPTER_CONTRACT = ${sites.get('journey/chapter-contract.js').length}`);
    console.log(`  SITES_IN_STRUCTURE        = ${sites.get('journey/structure.js').length}`);
    console.log(`  TOTAL_SITES               = ${rowsMeasured.length}`);
    console.log(`  COVERED_SITES             = ${covered.length}`);
    console.log(`  ALLOWLIST_SIZE            = ${uncovered.length}\n`);
    if (arrivedRows.length > 0) {
      console.log('  *** REFUSING TO EMIT A PASTEABLE ALLOWLIST.');
      console.log(`  *** ${arrivedRows.length} row(s) ARRIVED in the recorded debt, named above. An arriving row is a`);
      console.log('  *** rejection site that is newly unexecuted — the condition FLOOR-1 exists to go');
      console.log('  *** red on — and pasting a regenerated list would retire that red before FLOOR-1');
      console.log('  *** ever ran. Whatever else this regeneration was for, it is carrying that too.');
      console.log('  ***');
      console.log('  *** THE SIZE IS NOT THE SIGNAL, and this refusal has no size term. A laundered');
      console.log('  *** row needs only a net delta smaller than the rows that moved; that is why the');
      console.log('  *** old "size did not change" warning said nothing while seven rows moved and the');
      console.log('  *** count fell by one. Arrival is the signal, so arrival is the whole condition.');
      console.log('  ***');
      console.log('  *** Drive those sites from a suite in SUITES, or — if one is genuinely');
      console.log('  *** unreachable — add its row BY HAND, alone, with the reason it is debt and not');
      console.log('  *** a bug. A row worth recording as debt is worth typing out.');
    } else {
      console.log('const ALLOWLIST = [');
      for (const r of uncovered) console.log(`  ${JSON.stringify(r.key)},`);
      console.log('];');
    }
  }

  console.log('\ncoverage floor — journey/chapter-contract.js + journey/structure.js');
  console.log(`  suite set: ${SUITES.length} suites, exits ${exits.map((e) => e.code).join(',')}`);
  console.log(`  ${rowsMeasured.length} rejection sites; ${covered.length} executed, ${uncovered.length} not`);
  for (const r of newlyUncovered) console.log(`  NEW UNCOVERED  ${r.key}`);
  for (const k of closedDebt) console.log(`  DEBT CLOSED (remove from ALLOWLIST and lower the literal)  ${k}`);
  for (const e of anchorMisses) console.log(`  ANCHOR MISS  ${e}`);

  if (PROVE) {
    /* ---------------------------------------------------------------- *
     * --prove-failure. The corruption acts on the SUPPLIED SUBJECT, not *
     * on an actual: per D47, a zero-match measurement has no actual to  *
     * corrupt, so each mutant MANUFACTURES the missing subject. Every   *
     * mutant is in memory; not one byte of the tree is written.         *
     * ---------------------------------------------------------------- */
    console.log('\n--prove-failure — each floor assertion fed the mutant built to break it');
    let bad = 0;
    let axisMismatches = 0;
    const provenAxes = new Set();
    const ledgerIds = new Set(rows.map((r) => r.id));

    /* THE EXTENDED D50 RULE, enforced mechanically.
     *
     * D50 as first written catches the loud symptom: a mutant that cannot
     * move its assertion at all announces "cannot fail". The extended form
     * catches the quiet one: a mutant that DOES move something, reports
     * [red], and moved a quantity the named assertion never reads. H01's
     * HSUB49 is the reference instance; QA-03's own M3 was another — it was
     * labelled FLOOR-1 but never applied the allowlist filter, which is
     * FLOOR-1's entire content, so it was really proving FLOOR-3.
     *
     * Every mutant therefore declares two things: `moves`, the quantity it
     * perturbs, and `readBy`, the assertion id that reads THAT SAME
     * quantity. `readBy` is checked against the ids actually in the ledger,
     * so a mutant naming an assertion that does not exist is a failure, not
     * a comment. */
    const prove = (id, { moves, readBy }, what, good, mutant) => {
      const g = JSON.stringify(good);
      const m = JSON.stringify(mutant);
      // Arity guard. A dropped `what` argument shifts every operand left and
      // leaves `mutant` undefined; the comparison then differs and reports
      // PROVED while proving nothing. That happened while writing this very
      // block — six mutants reported PROVED against `undefined`. An operand
      // that is undefined is an authoring slip, never evidence.
      if (good === undefined || mutant === undefined || typeof what !== 'string') {
        axisMismatches++;
        console.log(`  ARITY ERROR ${id}  operands did not arrive as (id, axis, what, good, mutant) — good=${JSON.stringify(good)} mutant=${JSON.stringify(mutant)}`);
        return;
      }
      const known = ledgerIds.has(readBy);
      if (!known) { axisMismatches++; console.log(`  AXIS ERROR ${id}  names assertion '${readBy}', which is not in this run's ledger`); }
      else provenAxes.add(readBy);
      if (m !== g) {
        console.log(`  PROVED     ${id} -> ${readBy}   ${what}`);
        console.log(`             moves: ${moves}`);
        console.log(`             good: ${g}   mutant: ${m}`);
      } else {
        bad++;
        console.log(`  TAUTOLOGY  ${id} -> ${readBy}  ${what} — the mutant produced the same value as good code`);
      }
    };

    const structSrc = sources.get('journey/structure.js');
    const baseSrcOf = (rel) => sources.get(rel);
    const baseRangesOf = (rel) => bySubject.get(rel);

    /** Recompute the floor's quantities from a (possibly mutated) view of
     *  the subjects and their coverage. Each mutant swaps exactly one of the
     *  two views and reads back exactly the quantity its assertion reads. */
    function remeasure(srcOf, rangesOf) {
      const keys = [];
      let blankerOk = 0;
      for (const rel of SUBJECTS) {
        const src = srcOf(rel);
        if (blankComments(src).length === src.length) blankerOk++;
        for (const s of enumerateSites(src)) {
          keys.push({ key: `${rel} :: ${s.line} :: ${s.text}`, count: countAt(rangesOf(rel), s.offset) ?? 0 });
        }
      }
      const unc = keys.filter((r) => r.count === 0);
      const allowSet = new Set(ALLOWLIST);
      return {
        blankerOk,
        covered: keys.filter((r) => r.count > 0).length,
        uncovered: unc.length,
        newlyUncovered: unc.filter((r) => !allowSet.has(r.key)).length,
        closedDebt: ALLOWLIST.filter((k) => !unc.some((r) => r.key === k)),
      };
    }
    const base = remeasure(baseSrcOf, baseRangesOf);
    const withExtraSite = (rel) => (rel === 'journey/structure.js'
      ? `${structSrc}\nfail('QA-03 mutant: an unexercised rejection site');\n` : sources.get(rel));

    // M1 -> PC-0. Moves: the count of subjects whose comment blanking is
    // length-preserving — PC-0's own quantity, over both files, not a
    // single-file boolean.
    const shortening = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    prove('M1', { moves: 'blankerPreservesLength (subjects whose blanking preserves byte length)', readBy: 'PC-0' },
      'a stripper that shortens the text is detected as offset-invalidating',
      base.blankerOk,
      SUBJECTS.filter((rel) => shortening(sources.get(rel)).length === sources.get(rel).length).length);

    // M2 -> PC-2b. Moves: the rejection-site census of journey/structure.js.
    prove('M2', { moves: 'the journey/structure.js site census', readBy: 'PC-2b' },
      'renaming fail() to reject() drives the site census toward 0',
      enumerateSites(structSrc).length,
      enumerateSites(structSrc.replaceAll('fail(', 'reject(')).length);

    // M3 -> FLOOR-3. Moves: the TOTAL uncovered count, unfiltered by the
    // allowlist. Re-labelled from FLOOR-1: it never applied the allowlist
    // filter, so it was proving FLOOR-3 all along.
    prove('M3', { moves: 'total uncovered sites (allowlist filter NOT applied)', readBy: 'FLOOR-3' },
      'an unexercised rejection site appended to the subject raises the TOTAL uncovered count',
      base.uncovered,
      remeasure(withExtraSite, baseRangesOf).uncovered);

    // M4 -> PC-4. Moves: the covered-site count across both subjects.
    prove('M4', { moves: 'sites measured as executed, across both subjects', readBy: 'PC-4' },
      'with no coverage ranges at all, ZERO sites read as executed',
      base.covered,
      remeasure(baseSrcOf, () => []).covered);

    // M5 -> PC-6a. Moves: `anchorsResolved` over the WHOLE allowlist, via a
    // one-line shift of the subject — not a single-row boolean.
    prove('M5', { moves: 'allowlist rows resolving to their recorded line text', readBy: 'PC-6a' },
      'a one-line shift of the subject stops allowlist rows resolving to their recorded text',
      resolveAnchors(baseSrcOf).resolved,
      resolveAnchors((rel) => (rel === 'journey/structure.js' ? `\n${structSrc}` : sources.get(rel))).resolved);

    // M6 -> HF1. Moves: the pre/post fence equality.
    prove('M6', { moves: 'the pre-run vs post-run hash fence comparison', readBy: 'HF1' },
      'a changed hash makes the fence report DRIFT',
      fenceStart === hashesPost, fenceStart === `${hashesPost}\nx`);

    // M7 -> FLOOR-1. Moves: the FILTERED set — uncovered sites NOT on the
    // allowlist, which is FLOOR-1's entire content. The manufactured site is
    // absent from the allowlist, so unlike M3 it moves the filtered count.
    prove('M7', { moves: 'uncovered sites NOT on the allowlist (the filtered set)', readBy: 'FLOOR-1' },
      'an unexercised rejection site that is NOT on the allowlist enters the filtered set',
      base.newlyUncovered,
      remeasure(withExtraSite, baseRangesOf).newlyUncovered);

    // M8 -> FLOOR-2. Moves: `closedDebt` — allowlist rows that are no longer
    // uncovered. This is the RATCHET'S SECOND DIRECTION, and it was the one
    // claim in this order shipped without a red. A synthetic coverage range
    // is manufactured over an allowlisted site (P16's shape: supply the
    // missing subject), so that row leaves the uncovered set and must be
    // reported as debt that was closed without being removed from the list.
    {
      /* RE-AIMED AND RE-KEYED, BASELINE-01, 2026-08-23.
       *
       * This anchor read `journey/structure.js :: 163 :: if (stop <= prevStop)
       * …` — `file :: line :: text`, which D93 permits only for a STABLE
       * FOREIGN file. `journey/structure.js` is a SUBJECT of this floor and
       * orders edit it, so the key was mis-shaped from the day it was written,
       * and it rotted exactly the way D93 predicts: U04 (`866f559`) inserted
       * lines above the statement, moving it 163 -> 199 and leaving a
       * DIFFERENT allowlisted row (`fail(\`invalid copyPosition …\`)`) sitting
       * at 163. The pair had not coexisted since.
       *
       * The anchor then behaved correctly — it REFUSED rather than no-opped
       * (D78). But the refusal is a throw, the throw aborts the run at axis 8
       * of 10, and THE CHAIN RUNS THIS SUITE WITHOUT `--prove-failure`, so
       * nothing noticed for four orders. A sensitivity proof that is never
       * executed is a sensitivity that is unproven.
       *
       * It is now keyed `file :: text` — D93's shape for a subject — so a
       * renumbering cannot rot it again. Note what the re-keying preserves
       * that a line-only repair would have destroyed: re-aiming 163 -> 199 by
       * TEXT keeps the proof on the SAME production statement the anchor has
       * always named. Re-aiming by LINE — keeping 163 and accepting whatever
       * text now lives there — would have silently moved the ratchet's second
       * direction onto the `invalid copyPosition` row instead, which is the
       * substitution nobody would have seen.
       *
       * Two guards replace the one the line-key gave for free:
       *   - the text must match EXACTLY ONE site (refuse on 0 and on >1; a
       *     text key that matches twice is an ambiguous anchor, not a hit);
       *   - the site's derived key must be ON THE ALLOWLIST, because covering
       *     a site that is not recorded debt moves FLOOR-1, not FLOOR-2, and
       *     would prove the wrong axis while still going green.
       * The old key checked neither: it was a single equality that happened to
       * imply both. */
      const ANCHOR_TEXT = 'if (stop <= prevStop) fail(`non-monotonic stops for ${label}: ${JSON.stringify(stops)}`);';
      const matches = enumerateSites(structSrc).filter((s) => s.text === ANCHOR_TEXT);
      if (matches.length !== 1) {
        throw new Error(`M8 anchor miss: ${matches.length} sites match ${JSON.stringify(ANCHOR_TEXT)} in journey/structure.js — expected exactly 1`);
      }
      const hit = matches[0];
      const anchorKey = `journey/structure.js :: ${hit.line} :: ${hit.text}`;
      if (!ALLOWLIST.includes(anchorKey)) {
        throw new Error(`M8 anchor miss: ${JSON.stringify(anchorKey)} is not an ALLOWLIST row — covering it would move FLOOR-1, not FLOOR-2`);
      }
      const syntheticRanges = (rel) => (rel === 'journey/structure.js'
        ? [...bySubject.get(rel), { startOffset: hit.offset, endOffset: hit.offset + 1, count: 1 }]
        : bySubject.get(rel));
      const mutated = remeasure(baseSrcOf, syntheticRanges);
      prove('M8', { moves: 'closedDebt — allowlist rows no longer uncovered (the ratchet\'s second direction)', readBy: 'FLOOR-2' },
        'a listed debt row that becomes COVERED is reported as debt closed without being removed',
        base.closedDebt.length, mutated.closedDebt.length);
      for (const k of mutated.closedDebt) console.log(`             DEBT CLOSED in the mutant: ${k}`);
    }

    /* M9 -> PC-3e, M10 -> PC-3f. SUB-01.
     *
     * Both perturb the PACKAGE.JSON TEXT, in memory, and re-derive — which is
     * the point of the repair: PC-3e's subject is the gate, so its mutant has
     * to be a mutant OF THE GATE. Nothing is written to the tree (D56), and
     * both anchors refuse rather than approximate (D78): a chain entry that
     * has moved makes this throw, never silently prove nothing. */
    {
      const pkgText = readFileSync(join(REPO, 'package.json'), 'utf8');
      /* RE-ANCHORED by DIET-01, 2026-08-22. WAS `node tools/verify-j04a.mjs`,
         which the chain no longer runs. A `.replace()` whose anchor is gone
         does not fail — it no-ops and the mutant proves nothing — so the
         explicit `includes` guard below is what turns that into a throw. The
         replacement is a tier-1 entry chosen for the same reason the original
         was: it is stable, cheap, and certain to be in the chain. */
      const D65_ANCHOR = 'node tools/test-comment-stripper.mjs';
      const DROP_ANCHOR = ' && node tools/test-road.mjs';
      if (!pkgText.includes(D65_ANCHOR)) throw new Error(`M9 anchor miss: package.json no longer runs ${JSON.stringify(D65_ANCHOR)}`);
      if (!pkgText.includes(DROP_ANCHOR)) throw new Error(`M10 anchor miss: package.json no longer runs ${JSON.stringify(DROP_ANCHOR)}`);
      const evidenceRows = (text) => gateSurface(text).filter((r) => r.startsWith(EVIDENCE_PREFIX));

      // M9 moves the exact array PC-3e asserts is empty — the gate's own
      // entries that live under an evidence directory. This is the case the
      // pre-SUB-01 form could not see: verify-j04a.mjs is IN the gate but was
      // reachable through the floor's hand-written SUITES list only, and the
      // other forty gated suites had no assertion covering them at all.
      prove('M9', { moves: 'gate entries whose path lives under docs/code-health/evidence/', readBy: 'PC-3e' },
        'a gate entry repointed at the evidence copy of a suite is D65 recurring, and PC-3e sees it',
        evidenceRows(pkgText),
        evidenceRows(pkgText.replace(D65_ANCHOR, `node ${EVIDENCE_PREFIX}2026-08-21-elegance-run-01/retired-suites/test-comment-stripper.mjs`)));

      // M10 moves the SET, not its size, which is the whole of D54: a suite
      // leaving the gate must name itself here rather than shrink a number.
      prove('M10', { moves: 'the set of paths PC-3e scans, keyed by name', readBy: 'PC-3f' },
        'a suite removed from the chain leaves the scanned set, and the site set names which one',
        gateSurface(pkgText), gateSurface(pkgText.replace(DROP_ANCHOR, '')));
    }

    // D45: the mutant table's own cardinality, pinned to a literal, and one
    // distinct assertion proved per mutant. SUB-01 bumped 8 -> 10 by ADDING
    // M9 and M10 for PC-3e and PC-3f — two assertions that had no mutant at
    // all before this order, one of which did not exist. Bumped with
    // provenance, which is the only way this literal may ever move.
    if (provenAxes.size !== 10) { axisMismatches++; console.log(`  AXIS ERROR  10 mutants named ${provenAxes.size} distinct assertions — each mutant must prove a different one`); }
    console.log(`\n--prove-failure: ${bad === 0 && axisMismatches === 0 ? 'PASS' : 'FAIL'} — ${10 - bad}/10 assertions correctly caught, ${axisMismatches} axis error(s)`);
    console.log(`  axes proved: ${[...provenAxes].sort().join(', ')}`);
    if (bad > 0 || axisMismatches > 0) failures++;
  }
} finally {
  rmSync(covRoot, { recursive: true, force: true });
}

console.log('');
for (const r of rows) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.what}`);
  if (!r.ok) console.log(`     actual ${r.actual}   expected ${r.expected}`);
}
console.log(`\ncoverage floor: ${rows.length - failures}/${rows.length} PASS`);
reachedSummary = true; // disarm the D57 sentinel — this is the only path that may
process.exit(failures === 0 ? 0 : 1);
