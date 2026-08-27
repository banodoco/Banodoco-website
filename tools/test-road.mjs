#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-road.mjs — A05a, the road extraction.
 *
 * SUBJECT
 *   journey/road.js     the pure pixel<->route mapping, extracted from
 *                       journey/scroll.js:63-64, :278-279 and :281-390 at
 *                       base commit 6967a36.
 *   journey/scroll.js   the residue, and the four sites that still read the
 *                       road through the `total` mirror.
 *
 * THE BAR IS BIT-EXACTNESS, NOT BEHAVIOURAL SIMILARITY.
 *   A05 measured that this seam is closed — 7 of 45 closure variables, two
 *   writer scopes, no non-road writes, no clock read — and then measured the
 *   ONE way the extraction can silently change the numbers. This suite exists
 *   for that second measurement more than the first.
 *
 * THE TRAP, IN ONE PARAGRAPH (checks B*)
 *   `total` is summed from CHAPTERS' `scrollVh`. The spline's last knot is
 *   accumulated from SEGMENTS' `vh`. Two arrays over one road. Deriving
 *   `total` from `segLens` — the obvious tidy, since road.js already holds it
 *   — moves the number by one ULP at h = 812 and h = 932, both real device
 *   heights, and shipped `pAt(total)` goes from 0.9999999999999996 to exactly
 *   1. The B checks pin the SHIPPED value of that quantity, so the tidy is
 *   red the moment it is written. `structure.js:187`'s 1e-9 guard BOUNDS this
 *   divergence at one ULP; it does not remove it.
 *
 * HOW THE BYTE PROOF IS BUILT (checks A*, G*)
 *   Two closures, neither of them hand-written arithmetic:
 *     ORACLE   — buildSpline / pAt / scrollFor / lengthAtP sliced verbatim
 *                out of `git show 6967a36:journey/scroll.js`, plus a resize()
 *                whose body is that commit's `measure()` lines verbatim.
 *     SHIPPED  — the same functions sliced verbatim out of journey/road.js.
 *   Both are executed. G* compares their knot arrays, their inverse tables
 *   and 8 x 2049 sampled outputs with Object.is, so a one-ULP drift anywhere
 *   in the spline is a FAIL and not a rounding footnote. A6 additionally pins
 *   the sliced buildSpline+pAt digest against the one A05 recorded from
 *   scroll.js — the two artifacts agree on the same bytes.
 *   G7 then proves the SHIPPED closure is not a fiction: the real module's
 *   exported functions agree with it exactly.
 *
 * D94 — NO PIN READS A HAND-WRITTEN COLLECTION.
 *   Every array these checks compare is produced by executing the subject,
 *   and every one is pinned on CARDINALITY against a count the subject itself
 *   yields (SEGMENTS.length + 1 knots, S + 1 inverse samples, the module's own
 *   export count). A correct predicate over a literal nobody populated is the
 *   failure mode D94 names; the X* rows are what stop it here.
 *
 * D84 — WHAT THIS FILE DOES NOT RE-DERIVE
 *   The ledger, the abort sentinel, the harness-fault type, the five-gate
 *   mutant registry, the literal-predicate scan and the comment stripper all
 *   come from tools/instrument-ledger.mjs, tools/mutant-registry.mjs,
 *   tools/self-controls.mjs and tools/strip-comments.mjs. No copy of any of
 *   them is in this file. It stages NO tree and writes NOTHING to os.tmpdir()
 *   — the base text arrives through `git show`, in memory (D56).
 *
 * D85 — no assertion here anchors an extraction on a comment marker. Every
 *   slice anchor is a `function` header or a `}` at a known indent, and every
 *   slice REFUSES on a miss rather than returning a short string (D93).
 *
 * Usage:
 *   node tools/test-road.mjs
 *   node tools/test-road.mjs --prove-failure
 * ==================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { stripComments } from './strip-comments.mjs';
import {
  HarnessFault, fault, mutateText, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M } from './mutant-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');
const BASE_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

/* A05's own recorded digest of the buildSpline+pAt slice, taken from
   journey/scroll.js before this order ran. See a05/output/ulp-consequence.txt
   line 2. If A6 goes red, either the road's arithmetic moved or A05's artifact
   did — and the two are supposed to be the same bytes. */
const A05_SLICE_SHA = '8075afa303d5850dfebbb260d0da08144643302a344948629655ddf6ec2e5c22';

/* The heights A05 measured. 812 and 932 are the two that diverge. */
const HEIGHTS = [812, 932, 900, 1080, 1440, 800, 720, 320];
const DIVERGENT = [812, 932];

const SENTINEL = armSentinel('test-road', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const sha = (s) => createHash('sha256').update(s).digest('hex');
const read = (p) => readFileSync(join(REPO, p), 'utf8');

const SRC = {
  road: read('journey/road.js'),
  scroll: read('journey/scroll.js'),
  baseline: read('tools/test-render-baseline.mjs'),
  base: execFileSync('git', ['show', `${BASE_SHA}:journey/scroll.js`],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 24 }),
};

const { CHAPTERS, SEGMENTS } = await import(join(REPO, 'journey/route.js'));
const { createRoad } = await import(join(REPO, 'journey/road.js'));

/* ------------------------------------------------------------------ *
 * Slicing — text-anchored, refusing on a miss (D93).                  *
 * ------------------------------------------------------------------ */

/** The lines of `fn`'s declaration, header through the `}` at `indent`.
 *  A miss is a HarnessFault, never a short string. */
function fnSlice(tag, src, header, indent = '  ') {
  const lines = src.split('\n');
  const a = lines.indexOf(header);
  if (a < 0) fault(`${tag}: ANCHOR MISS on header ${JSON.stringify(header)}`);
  const close = `${indent}}`;
  const b = lines.indexOf(close, a + 1);
  if (b < 0) fault(`${tag}: ANCHOR MISS on the closing ${JSON.stringify(close)} after ${header}`);
  return lines.slice(a, b + 1).join('\n');
}

const H = {
  buildSpline: '  function buildSpline() {',
  pAt: '  function pAt(px) {',
  scrollFor: '  function scrollFor(p) {',
  measure: '  function measure() {',
  lengthAtP: '  function lengthAtP(p) {',
  resize: '  function resize(h) {',
};

/* A05 sliced buildSpline THROUGH pAt's closing brace. Reproduce that exactly. */
const a05Region = (src) => {
  const lines = src.split('\n');
  const a = lines.indexOf(H.buildSpline);
  const p = lines.indexOf(H.pAt, a + 1);
  const c = lines.indexOf('  }', p + 1);
  if (a < 0 || p < 0 || c < 0) fault('a05Region: ANCHOR MISS');
  return lines.slice(a, c + 1).join('\n');
};

const FN = {
  baseBuildSpline: fnSlice('base', SRC.base, H.buildSpline),
  roadBuildSpline: fnSlice('road', SRC.road, H.buildSpline),
  basePAt: fnSlice('base', SRC.base, H.pAt),
  roadPAt: fnSlice('road', SRC.road, H.pAt),
  baseScrollFor: fnSlice('base', SRC.base, H.scrollFor),
  roadScrollFor: fnSlice('road', SRC.road, H.scrollFor),
  baseLengthAtP: fnSlice('base', SRC.base, H.lengthAtP),
  roadLengthAtP: fnSlice('road', SRC.road, H.lengthAtP),
  baseMeasure: fnSlice('base', SRC.base, H.measure),
  roadResize: fnSlice('road', SRC.road, H.resize),
};

/** The five statements of base `measure()` that became `resize(h)`'s body:
 *  from the `lens` line through `buildSpline();`, verbatim. */
const MEASURE_MIDDLE = (() => {
  const lines = FN.baseMeasure.split('\n');
  const a = lines.findIndex((x) => x.startsWith('    const lens = CHAPTERS.map('));
  const b = lines.indexOf('    buildSpline();', a + 1);
  if (a < 0 || b < 0) fault('MEASURE_MIDDLE: ANCHOR MISS in base measure()');
  return lines.slice(a, b + 1).join('\n');
})();
const RESIZE_BODY = (() => {
  const lines = FN.roadResize.split('\n');
  const a = lines.findIndex((x) => x.startsWith('    const lens = CHAPTERS.map('));
  const b = lines.indexOf('    buildSpline();', a + 1);
  if (a < 0 || b < 0) fault('RESIZE_BODY: ANCHOR MISS in road resize()');
  return lines.slice(a, b + 1).join('\n');
})();

/* ------------------------------------------------------------------ *
 * The two executable closures.                                        *
 * ------------------------------------------------------------------ */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);   // scroll.js:36 / road.js, verbatim

/** Build a road closure out of SLICED SOURCE. Nothing arithmetic is written
 *  here; the preamble and the peek are the only hand-written lines. */
function makeClosure(tag, buildSplineSrc, pAtSrc, scrollForSrc, lengthAtPSrc, resizeBodySrc) {
  const body = `
    let segLens = [], total = 0;
    let kx = [], ky = [], km = [];
    let invX = [], invY = [];
${buildSplineSrc}
${pAtSrc}
${scrollForSrc}
${lengthAtPSrc}
  function resize(h) {
${resizeBodySrc}
  }
    return { resize, pAt, scrollFor, lengthAtP,
      peek: () => ({ kx, ky, km, invX, invY, total, segLens }) };
  `;
  try {
    return new Function('CHAPTERS', 'SEGMENTS', 'clamp01', body)(CHAPTERS, SEGMENTS, clamp01);
  } catch (e) {
    fault(`${tag}: the sliced closure did not compile — ${e.message}`);
    return null;
  }
}

const ORACLE = makeClosure('ORACLE', FN.baseBuildSpline, FN.basePAt,
  FN.baseScrollFor, FN.baseLengthAtP, MEASURE_MIDDLE);
const SHIPPED = makeClosure('SHIPPED', FN.roadBuildSpline, FN.roadPAt,
  FN.roadScrollFor, FN.roadLengthAtP, RESIZE_BODY);

/** Every road quantity at one height, from one closure. Derived, never typed. */
function survey(road, h) {
  road.resize(h);
  const s = road.peek();
  const pxGrid = [];
  const N = 2048;
  for (let i = 0; i <= N; i++) pxGrid.push(road.pAt((i / N) * s.total));
  const pGrid = [];
  for (let i = 0; i <= N; i++) pGrid.push(road.scrollFor(i / N));
  const lenGrid = [];
  for (let i = 0; i <= 200; i++) lenGrid.push(road.lengthAtP(i / 200));
  return { ...s, pxGrid, pGrid, lenGrid };
}

const SURVEY = { oracle: {}, shipped: {} };
for (const h of HEIGHTS) {
  SURVEY.oracle[h] = survey(ORACLE, h);
  SURVEY.shipped[h] = survey(SHIPPED, h);
}

/** Object.is over two numeric arrays: the index of the first difference, or
 *  -1. `===` would call 0 and -0 equal and NaN and NaN different; neither is
 *  what a bit-exactness claim means. */
function firstDiff(a, b) {
  if (a.length !== b.length) return `length ${a.length} vs ${b.length}`;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return `[${i}] ${a[i]} vs ${b[i]}`;
  return -1;
}

/* ------------------------------------------------------------------ *
 * X — cardinality, first. D94: every collection below is derived from *
 *     the subject and counted against the subject's own number.       *
 * ------------------------------------------------------------------ */

L.same('X1', 'D94 — the knot arrays are as long as the route has segments, +1 for the origin',
  [SURVEY.shipped[900].kx.length, SURVEY.shipped[900].ky.length, SURVEY.shipped[900].km.length],
  [SEGMENTS.length + 1, SEGMENTS.length + 1, SEGMENTS.length + 1]);
L.same('X2', 'D94 — the inverse table carries buildSpline\'s own S + 1 samples',
  [SURVEY.shipped[900].invX.length, SURVEY.shipped[900].invY.length],
  [1025, 1025]);
L.same('X3', 'D94 — segLens is one allocation per SEGMENT, not per chapter',
  [SURVEY.shipped[900].segLens.length, SEGMENTS.length, CHAPTERS.length],
  [9, 9, 5]);
L.same('X4', 'D94 — the sampled grids are populated, at the size the survey declares',
  [SURVEY.shipped[900].pxGrid.length, SURVEY.shipped[900].pGrid.length, SURVEY.shipped[900].lenGrid.length],
  [2049, 2049, 201]);
L.same('X5', 'D94 — every height was surveyed on both sides',
  [Object.keys(SURVEY.oracle).length, Object.keys(SURVEY.shipped).length, HEIGHTS.length],
  [8, 8, 8]);
L.same('X6', 'the sliced sources are non-degenerate (a short slice is a miss wearing a success)',
  [FN.roadBuildSpline.split('\n').length, FN.roadPAt.split('\n').length,
    FN.roadScrollFor.split('\n').length, FN.roadLengthAtP.split('\n').length,
    RESIZE_BODY.split('\n').length],
  [50, 11, 14, 6, 6]);

/* ------------------------------------------------------------------ *
 * A — THE BYTE PROOF. The road moved; it was not rewritten.           *
 * ------------------------------------------------------------------ */

pin('A1', 'buildSpline() is the base commit\'s, character for character',
  (i) => i.road === i.base, { road: FN.roadBuildSpline, base: FN.baseBuildSpline }, true,
  'the spline construction was edited during the move');
pin('A2', 'pAt() is the base commit\'s, character for character',
  (i) => i.road === i.base, { road: FN.roadPAt, base: FN.basePAt }, true);
pin('A3', 'scrollFor() is the base commit\'s, character for character (its `p` no longer shadows anything — D-A05-5 — but not one byte of the body moved)',
  (i) => i.road === i.base, { road: FN.roadScrollFor, base: FN.baseScrollFor }, true);
pin('A4', 'lengthAtP() is the base commit\'s, character for character',
  (i) => i.road === i.base, { road: FN.roadLengthAtP, base: FN.baseLengthAtP }, true);
pin('A5', 'resize(h)\'s body is the verbatim middle of base measure() — design.md §4.4\'s own seam',
  (i) => i.road === i.base, { road: RESIZE_BODY, base: MEASURE_MIDDLE }, true,
  'resize() is supposed to BE those five statements, not a re-expression of them');
/* A6 — LOOKED AT UNDER PIN-C8 AND LEFT ALONE. C8 records it as "redundant
 * with G1-G7"; measured, it is redundant with neither those nor A1-A4.
 *
 *   * NOT with G1-G7. Those execute two closures and compare 8 x 2049 sampled
 *     outputs — BEHAVIOURAL. A6 is textual, and no textual-only edit (a
 *     renamed local, a reflowed comment) moves any G reader. They overlap
 *     nowhere; neither is a weaker copy of the other.
 *   * NOT with A1-A4 either, though it is close. Over the same 852-mutant
 *     sweep that retired A7, A6 went red 245 times and 9 were solo, A1-A4 all
 *     green. All 9 land in the two lines a05Region() spans that no fnSlice()
 *     covers: the blank line after buildSpline's close, and pAt's docstring.
 *     A6's content over its neighbours is that A05 digested a CONTIGUOUS
 *     region — a third declaration spliced between the two is caught.
 *
 * It does carry C8's defect in miniature: on those 9 it reds saying the
 * road's arithmetic moved, and it has not. What it does NOT do is stand
 * between a repair and journey/road.js — A1 through A5 are five
 * character-for-character pins over the same four functions and hold this
 * file frozen whatever A6 says. Converting the one row C8 names while the
 * five above it stand would shrink a count without unfreezing a line: the
 * census-metric inversion DIET-02 declined C8 to avoid, reproduced inside
 * C8. The bar here is A1-A5, and that is another order's scope. Recorded
 * rather than half-done. */
pin('A6', 'the buildSpline+pAt slice digests to the value A05 recorded off scroll.js',
  (i) => sha(a05Region(i.road)), { road: SRC.road }, A05_SLICE_SHA,
  'either the road\'s arithmetic moved, or A05\'s artifact and this one no longer describe the same bytes');
/* A7 IS RETIRED — PIN-C8, as PROVABLY UNFALSIFIABLE, not as surplus. It read
 * "nothing was re-indented: every moved line keeps its exact leading
 * whitespace" over `[roadBuildSpline, roadPAt, roadScrollFor, roadLengthAtP]
 * .join('\n')` against the same join of the base slices — the EXACT four
 * strings A1-A4 compare character for character, one pin apiece. String
 * equality entails leading-whitespace equality, so A7 could not go red unless
 * one of A1-A4 already had. No edit to journey/road.js is caught by A7 and
 * missed by A1-A4, and none could be.
 *
 * MEASURED ANYWAY, because "provable" is not a licence to skip it: 852
 * mutants — each of road.js's 213 lines deleted, duplicated, given a trailing
 * space, and given two more spaces of indent. A7 went red 233 times; in 233
 * of 233 at least one of A1-A4 went red with it. Zero solo reds.
 *
 * DELETED rather than repaired, for QA-08's reason when it deleted gate 5 out
 * of tools/mutant-registry.mjs: the property it claimed is exactly its
 * neighbours', and a check that cannot answer false is D45's shape in the
 * vocabulary of extra rigour. Its mutant went with it.
 *
 * NOT RETIRED, deliberately: A6 above. C8 records the two together as
 * "redundant with G1-G7"; for A6 that is measurably false in both halves. */

/* ------------------------------------------------------------------ *
 * B — THE TRAP. `total` comes from CHAPTERS and must keep coming      *
 *     from CHAPTERS. These pin the SHIPPED NUMBERS, not the shape.    *
 * ------------------------------------------------------------------ */

pin('B1', 'the `lens` line is the base commit\'s CHAPTERS.map expression, character for character',
  (i) => i.road.split('\n').some((l) => l === i.want),
  { road: SRC.road,
    want: '    const lens = CHAPTERS.map(c => (c.scrollVh || 2) * h);   // px per chapter, only needed to size total — allocations live in route.js' },
  true, 'THE forbidden tidy: total must not be derived from segLens (A05 §4)');

pin('B2', 'road.js reduces `lens` into total and NEVER segLens (assert-zero over comment-stripped source)',
  (i) => {
    const src = stripComments(i.road, { blankStrings: true });
    return [
      (src.match(/total\s*=\s*lens\.reduce/g) || []).length,
      (src.match(/total\s*=\s*segLens\.reduce/g) || []).length,
    ];
  }, { road: SRC.road }, [1, 0]);

/* B3/B4 are the load-bearing rows: the shipped VALUE of pAt(total), which is
   the exact quantity the tidy changes. Derived by executing the module. */
const LIVE = createRoad();
const livePAtTotal = {};
const liveTotal = {};
const liveKxLast = {};
for (const h of HEIGHTS) {
  LIVE.resize(h);
  liveTotal[h] = LIVE.total;
  livePAtTotal[h] = LIVE.pAt(LIVE.total);
  liveKxLast[h] = SURVEY.shipped[h].kx[SURVEY.shipped[h].kx.length - 1];
}

pin('B3', 'at h = 812 and h = 932 the SHIPPED pAt(total) is 0.9999999999999996 — the tidied form returns exactly 1',
  (i) => DIVERGENT.map((h) => i[h]), livePAtTotal,
  [0.9999999999999996, 0.9999999999999996],
  'a 1 returned here means total was derived from segLens; see road.js\'s header');
pin('B4', 'at the six non-divergent heights pAt(total) is exactly 1',
  (i) => HEIGHTS.filter((h) => !DIVERGENT.includes(h)).map((h) => i[h]), livePAtTotal,
  [1, 1, 1, 1, 1, 1]);
pin('B5', 'total and kx[last] still disagree by exactly one ULP at the two device heights, and agree at the other six',
  (i) => HEIGHTS.map((h) => i.kx[h] - i.total[h]), { kx: liveKxLast, total: liveTotal },
  [7.275957614183426e-12, 7.275957614183426e-12, 0, 0, 0, 0, 0, 0],
  'F03/DEF-04\'s 1e-9 guard in structure.js BOUNDS this at one ULP; it does not remove it');
pin('B6', 'the height-independent root of the whole trap: sum(scrollVh) is not acc(segVh)',
  (i) => [i.chapterVh.reduce((a, b) => a + b, 0), i.segVh.reduce((a, b) => a + b, 0)],
  { chapterVh: CHAPTERS.map((c) => (c.scrollVh || 2)), segVh: SEGMENTS.map((x) => (x.vh || 2)) },
  [40.919999999999995, 40.92],
  'if these two ever agree exactly, the trap is gone and B3/B5 must be re-measured, not deleted');

/* ------------------------------------------------------------------ *
 * G — BIT-EXACTNESS against the pre-split oracle.                     *
 * ------------------------------------------------------------------ */

pin('G1', 'the knot arrays kx/ky/km are bit-identical to the pre-split model at all 8 heights',
  (i) => HEIGHTS.flatMap((h) => ['kx', 'ky', 'km'].map((k) => `${h}.${k}:${firstDiff(i.o[h][k], i.s[h][k])}`)),
  { o: SURVEY.oracle, s: SURVEY.shipped },
  HEIGHTS.flatMap((h) => ['kx', 'ky', 'km'].map((k) => `${h}.${k}:-1`)));
pin('G2', 'the inverse table invX/invY is bit-identical at all 8 heights (this is what scrollFor interpolates)',
  (i) => HEIGHTS.flatMap((h) => ['invX', 'invY'].map((k) => `${h}.${k}:${firstDiff(i.o[h][k], i.s[h][k])}`)),
  { o: SURVEY.oracle, s: SURVEY.shipped },
  HEIGHTS.flatMap((h) => ['invX', 'invY'].map((k) => `${h}.${k}:-1`)));
pin('G3', 'total and segLens are bit-identical at all 8 heights',
  (i) => HEIGHTS.map((h) => (Object.is(i.o[h].total, i.s[h].total)
    && firstDiff(i.o[h].segLens, i.s[h].segLens) === -1 ? 'ok' : `${h}`)),
  { o: SURVEY.oracle, s: SURVEY.shipped }, HEIGHTS.map(() => 'ok'));
pin('G4', 'pAt is bit-identical across 2049 samples per height — 16,392 comparisons under Object.is',
  (i) => HEIGHTS.map((h) => `${h}:${firstDiff(i.o[h].pxGrid, i.s[h].pxGrid)}`),
  { o: SURVEY.oracle, s: SURVEY.shipped }, HEIGHTS.map((h) => `${h}:-1`));
pin('G5', 'scrollFor is bit-identical across 2049 samples per height',
  (i) => HEIGHTS.map((h) => `${h}:${firstDiff(i.o[h].pGrid, i.s[h].pGrid)}`),
  { o: SURVEY.oracle, s: SURVEY.shipped }, HEIGHTS.map((h) => `${h}:-1`));
pin('G6', 'lengthAtP is bit-identical across 201 samples per height',
  (i) => HEIGHTS.map((h) => `${h}:${firstDiff(i.o[h].lenGrid, i.s[h].lenGrid)}`),
  { o: SURVEY.oracle, s: SURVEY.shipped }, HEIGHTS.map((h) => `${h}:-1`));
pin('G7', 'the SHIPPED closure is not a fiction: the real createRoad() module agrees with it exactly',
  (i) => {
    const r = createRoad();
    return HEIGHTS.map((h) => {
      r.resize(h);
      const N = 512;
      for (let j = 0; j <= N; j++) {
        const px = (j / N) * r.total;
        if (!Object.is(r.pAt(px), i.s[h].pxGrid[j * 4])) return `${h}.pAt[${j}]`;
        if (!Object.is(r.scrollFor(j / N), i.s[h].pGrid[j * 4])) return `${h}.scrollFor[${j}]`;
      }
      return Object.is(r.total, i.s[h].total) ? 'ok' : `${h}.total`;
    });
  }, { s: SURVEY.shipped }, HEIGHTS.map(() => 'ok'));

/* ------------------------------------------------------------------ *
 * W — D75 branch-entry witnesses. A pin over a branch the drive never *
 *     enters is blind, and silence about it is the defect.            *
 * ------------------------------------------------------------------ */

const kSegs = SEGMENTS.filter((s) => s.k).length;
const s900 = SURVEY.shipped[900];
const flatKnots = (() => {
  let n = 0;
  const d = [];
  for (let i = 0; i < s900.kx.length - 1; i++) d.push((s900.ky[i + 1] - s900.ky[i]) / (s900.kx[i + 1] - s900.kx[i]));
  for (let i = 1; i < d.length; i++) if (d[i - 1] * d[i] <= 0) n++;
  return n;
})();

L.same('W1', 'D75 — buildSpline\'s `shape` override branch IS entered: the route declares k on 3 of its 9 segments',
  [kSegs, SEGMENTS.length], [3, 9]);
L.same('W2', 'D75 — buildSpline\'s flat-knot branch (d[i-1]*d[i] <= 0 -> km[i] = 0) is NOT entered on the shipped route. Stated, not assumed: this route is strictly monotone increasing, so the branch is unreachable from route.js and no G check covers it',
  flatKnots, 0);
L.same('W3', 'D75 — scrollFor\'s two saturation branches ARE entered: p <= invY[0] returns invX[0] and p >= invY[hi] returns invX[hi]',
  [SURVEY.shipped[900].pGrid[0], SURVEY.shipped[900].pGrid[2048]],
  [0, SURVEY.shipped[900].invX[1024]]);
L.same('W4', 'D75 — scrollFor\'s empty-table branch IS entered: a road that has never been resized returns 0',
  createRoad().scrollFor(0.5), 0);
/* Two of the nine segments are allocated the same vh, so a DISTINCT-VALUE
   count answers 8 and would understate the coverage. Probe each segment's own
   span instead and require its own allocation back — nine branch entries,
   named individually. */
const lengthProbe = (() => {
  const r = createRoad(); r.resize(900);
  const segLens = SURVEY.shipped[900].segLens;
  let hit = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    const lo = i === 0 ? 0 : SEGMENTS[i - 1].end;
    if (Object.is(r.lengthAtP((lo + SEGMENTS[i].end) / 2), segLens[i])) hit++;
  }
  return hit;
})();
L.same('W5', 'D75 — lengthAtP\'s per-segment arm is entered for EVERY one of the nine segments (probed inside each span; a distinct-value count would answer 8, because two segments share a vh)',
  [lengthProbe, SEGMENTS.length], [9, 9]);
L.same('W6', 'D75 — pAt\'s degenerate-span branch (h <= 0) is NOT entered: no segment on the shipped route is allocated zero px',
  s900.segLens.filter((x) => !(x > 0)).length, 0);

/* ------------------------------------------------------------------ *
 * C — the road's purity, as A05 measured it. Assert-zero scans, each  *
 *     with a positive control (D46) so "0 hits" cannot be blindness.  *
 * ------------------------------------------------------------------ */

const roadCode = stripComments(SRC.road, { blankStrings: true });

pin('C1', 'ZERO viewport reads enter road.js (D-A05-1) — the Math.max(320, …) floor stays with measure()',
  (i) => (i.src.match(/window\s*\.|innerHeight|innerWidth|document\s*\./g) || []).length,
  { src: roadCode }, 0,
  'design.md D9 / J-H9: J02 and U05 must not unify the road\'s height into frame.viewport — and there is nothing here to unify');
L.same('C1-CTL', 'D46 — C1\'s scan is not blind: over the residue it finds the SIX live innerHeight reads A05 measured at HEAD (D-A05-1), exactly one of which is road code and stays with measure()',
  (stripComments(SRC.scroll, { blankStrings: true }).match(/innerHeight/g) || []).length, 6);
pin('C2', 'ZERO clock reads in road.js — A05 measured all 11 live performance.now() sites outside the road region',
  (i) => (i.src.match(/performance\s*\.\s*now|Date\s*\.\s*now|requestAnimationFrame/g) || []).length,
  { src: roadCode }, 0);
L.same('C2-CTL', 'D46 — C2\'s scan is not blind: the same pattern over the residue finds scroll.js\'s clock sites',
  (stripComments(SRC.scroll, { blankStrings: true }).match(/performance\s*\.\s*now|Date\s*\.\s*now|requestAnimationFrame/g) || []).length,
  11);
/* Comment-stripped but STRING-PRESERVING: the specifier IS the assertion, and
   blankStrings would blank the very thing being pinned (S-3 / D46's own trap). */
const roadCodeStrings = stripComments(SRC.road, { blankStrings: false });
pin('C3', 'road.js imports exactly one module, and it is route.js for CHAPTERS and SEGMENTS',
  (i) => (i.src.match(/^import .*$/gm) || []).map((s) => s.trim()),
  { src: roadCodeStrings }, ["import { CHAPTERS, SEGMENTS } from './route.js';"]);
pin('C4', 'road.js exports exactly one name',
  (i) => (i.src.match(/^export\s+(?:function\s+)?(\w+)/gm) || []).map((s) => s.trim()),
  { src: roadCode }, ['export function createRoad']);
pin('C5', 'the road object\'s key set and order — the compatibility surface every consumer sees',
  (i) => i.keys, { keys: Object.keys(createRoad()) },
  ['pAt', 'scrollFor', 'lengthAtP', 'resize', 'total']);

/* ------------------------------------------------------------------ *
 * E — the residue: the `total` mirror, and what did NOT move.         *
 * ------------------------------------------------------------------ */

const scrollCode = stripComments(SRC.scroll, { blankStrings: true });

pin('E1', 'scroll.js writes `total` in EXACTLY ONE place, and it is the mirror copy in measure()',
  (i) => (i.src.match(/^\s*total\s*=\s*.*$/gm) || []).map((s) => s.trim()),
  { src: scrollCode }, ['total = road.total;'],
  'the mirror has one writer; a second assignment is a second source of truth');
pin('E2', 'the mirror equals road.total after every rebuild, at all 8 heights, under Object.is',
  (i) => {
    const out = [];
    for (const h of HEIGHTS) { i.road.resize(h); out.push(Object.is(i.road.total, i.road.total) && i.road.total > 0); }
    return out;
  }, { road: createRoad() }, HEIGHTS.map(() => true));
pin('E3', 'measure() reads the viewport, hands the height to road.resize(h), and re-seats v — in that order',
  (i) => fnSlice('scroll', i.src, H.measure).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6),
  { src: SRC.scroll },
  ['function measure() {', 'const h = Math.max(320, window.innerHeight);',
    'const keepP = total > 0 ? clamp01(pAt(v) + carry) : 0;', 'carry = 0;',
    'road.resize(h);', 'total = road.total;'],
  'keepP must be sampled off the OLD road and v re-derived off the NEW one');
/* E4 WAS A MOVE PROOF, AND IT IS NOW A PROPERTY (converted 2026-08-25 by
   DEFECT-02, authorised).

   The row that stood here asserted `push()` byte-identical to base 6967a36.
   That is a proof about a MOVE: it can say push() is UNCHANGED, never that it
   is CORRECT, and it reds identically whether the next edit breaks push() or
   fixes it. It reds for a fix is not a hypothetical — DEFECT-02 fixed a
   user-visible defect inside push() (a 2 px finger-settle at a flick's landing
   was read as a reversal, so two flicks bought one section; base swallow rate
   100%, 36/36) and this row was the only thing in `npm run check` that went
   red. The move it proved is in committed history since 426dd44 and
   `git diff --color-moved` reproduces it for free; the verifier its text names,
   verify-j04b, was retired by DIET-01, which retired nine suites on exactly
   this reasoning. E4 survived only because the lift classified it "durable" —
   a byte-identity pin on a LIVE subject is not durable, it is a value recorded
   where a property belongs.

   What was worth keeping is the reason the header of journey/scroll.js gives
   for not touching push() in the first place: THE `total` MIRROR MUST NOT BE
   BYPASSED. That is a property, it is the thing E4's own mutant has always
   mutated, and — unlike byte identity — it holds over the WHOLE residue rather
   than at one function, so it is asserted here at every site instead of one.

   Blind spot, stated plainly: nothing now pins push()'s BODY. A change to how
   push() measures a gesture is invisible to this file, as it always should
   have been — that behaviour is the scroll-touch-gates suite's and
   test-scroll-perturbation's to hold, not the road extraction's. */
const MIRROR_READERS = {
  push: '  function push(dpx, kind, repeat = false, { exactContact = false } = {}) {',
  slopeAtP: '  function slopeAtP(q) {',
  update: '  function update(dt) {',
};
pin('E4', 'THE MIRROR IS NEVER BYPASSED: every `road.` access in the residue is inside measure(), each of the three sites that read the road\'s length reaches it through the `total` BINDING and not through the road object, and no fourth site touches `total` at all',
  (i) => {
    const code = stripComments(i.now, { blankStrings: true });
    const roads = (t) => (t.match(/\broad\s*\./g) || []).length;
    const measure = fnSlice('E4/measure', code, H.measure);
    const out = [`road-outside-measure:${roads(code.split(measure).join(''))}`];
    /* D94 — the reader list below is three anchors, so it is also asked to
       account for itself: strip measure() and all three readers out of the
       residue and NOTHING that mentions `total` may be left except the
       binding's own declaration and the getter that publishes it. A fourth
       reader reaching past the mirror cannot hide from that subtraction. */
    let rest = code.split(measure).join('');
    for (const [n, header] of Object.entries(MIRROR_READERS)) {
      const body = fnSlice(`E4/${n}`, code, header);
      out.push(`${n}:reads-total=${/\btotal\b/.test(body)}:road=${roads(body)}`);
      rest = rest.split(body).join('');
    }
    for (const line of rest.split('\n')) {
      if (/\btotal\b/.test(line)) out.push(`unaccounted:${line.trim()}`);
    }
    return out;
  },
  { now: SRC.scroll },
  ['road-outside-measure:0',
    'push:reads-total=true:road=0',
    'slopeAtP:reads-total=true:road=0',
    'update:reads-total=true:road=0',
    'unaccounted:let total = 0;',
    'unaccounted:get total() { return total; },'],
  'a reader that reaches past the mirror to road.total is a second source of truth for the same number, and the mirror is only a mirror while nobody does');

/* ------------------------------------------------------------------ *
 * F — nothing was left behind, and the entry contract is unmoved.     *
 * ------------------------------------------------------------------ */

pin('F1', 'the road\'s state and its builder are GONE from scroll.js — no orphan copy',
  (i) => ['segLens', 'buildSpline', 'invX', 'invY']
    .map((n) => `${n}:${(i.src.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length}`),
  { src: scrollCode }, ['segLens:0', 'buildSpline:0', 'invX:0', 'invY:0']);
pin('F2', 'scroll.js no longer imports CHAPTERS or SEGMENTS — the whole route-array dependency left with the road',
  (i) => [/\bCHAPTERS\b/, /\bSEGMENTS\b/].map((re) => (i.src.match(new RegExp(re.source, 'g')) || []).length),
  { src: scrollCode }, [0, 0]);
pin('F3', 'the model\'s ROOT SURFACE is unmoved: the same 26 members, in the same order, with pAt/scrollFor/total still on it',
  (i) => i.members,
  { members: await (async () => {
    const { createRig } = await import(join(REPO, 'tools/test-c01-harness.mjs'));
    return Object.keys(createRig({}).scroll);
  })() },
  ['attach', 'enabled', 'progress', 'surface', 'setProgress', 'sinceInput',
    'commitP', 'lastDir', 'rate', 'gesturePeak', 'streaming', 'resolving',
    'gliding', 'answeredAt', 'bootGuardState', 'primeBootWheel',
    'primeBootWheelStream', 'primeBootTouch', 'retire', 'resolveCruise',
    'resolveTarget', 'nosnap', 'update', 'pAt', 'scrollFor', 'total'],
  'verify-j04a 1a/1b pins this same list; if it moved, that instrument is red too');
pin('F4', 'lengthAtP is STILL NOT EXPORTED from the model (A05 §2.1) — an absence pinned as a value',
  (i) => i.members.includes('lengthAtP'),
  { members: Object.keys((await import(join(REPO, 'journey/scroll.js'))).createScrollModel({})) },
  false);
pin('F5', 'X3 — journey/road.js is in the source manifest, between its NAMED neighbours rail.js and route.js',
  (i) => {
    const m = i.src.match(/"journey\/rail\.js",\s*\n\s*"([^"]+)",\s*\n\s*"journey\/route\.js",/);
    return m ? m[1] : 'NOT ADJACENT';
  }, { src: SRC.baseline }, 'journey/road.js');
pin('F6', 'X3 — A05a added exactly one manifest entry and touched nobody else\'s',
  (i) => (i.src.match(/"journey\/[a-z-]+\.js",/g) || []).filter((s) => s.includes('road')).length,
  { src: SRC.baseline }, 1);

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* ---------------------------------------------------------------- *
   * D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST.                  *
   *                                                                    *
   * It targets a REAL pin (A1) and perturbs a field that pin's reader   *
   * does not read. The registry must score it CANNOT FAIL. A sweep that *
   * "kills" this is scoring noise, and every [red] below it would be    *
   * uninterpretable. It is deliberately NOT in the main list: an        *
   * unregistered id is reported BROKEN, which is a different verdict    *
   * from the one this control exists to elicit.                        *
   * ---------------------------------------------------------------- */
  const CTL = sweep([
    M('A1', 'D88 NULL CONTROL — a field A1\'s reader does not read is perturbed', null,
      (i) => ({ ...i, unreadDecoy: 'moved' })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['A1']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  const MUTANTS = [
    M('A1', 'one operator in the spline construction changes', null,
      (i) => ({ ...i, road: mutateText(i.road, 'A1', 'km[0] = d[0];', 'km[0] = d[1];') })),
    M('A2', 'pAt\'s Hermite basis loses a term', null,
      (i) => ({ ...i, road: mutateText(i.road, 'A2', '(2 * u3 - 3 * u2 + 1)', '(2 * u3 - 3 * u2)') })),
    M('A3', 'scrollFor\'s bisection tie-break flips', null,
      (i) => ({ ...i, road: mutateText(i.road, 'A3', 'if (invY[mid] <= p)', 'if (invY[mid] < p)') })),
    M('A4', 'lengthAtP\'s comparison loosens', null,
      (i) => ({ ...i, road: mutateText(i.road, 'A4', 'if (p <= SEGMENTS[i].end', 'if (p < SEGMENTS[i].end') })),
    M('A5', 'resize() re-expresses one of its five statements', null,
      (i) => ({ ...i, road: mutateText(i.road, 'A5', 'total = lens.reduce((a, b) => a + b, 0);', 'total = lens.reduce((a, b) => b + a, 0);') })),
    M('A6', 'one byte drifts INSIDE the digested slice', null,
      (i) => ({ ...i, road: mutateText(i.road, 'A6', 'const S = 1024;', 'const S = 1024 ;') })),
    /* PIN-C8: A7's mutant went with A7. It re-indented `km[0] = d[0];`, which
       is a line INSIDE buildSpline, so it was always killing A1 as well; the
       registry drives one registered reader per mutant and could not see it. */

    /* B — THE TRAP ITSELF, applied. */
    M('B1', 'THE FORBIDDEN TIDY: total is derived from segLens', null,
      (i) => ({ ...i, road: mutateText(i.road, 'B1',
        '    const lens = CHAPTERS.map(c => (c.scrollVh || 2) * h);   // px per chapter, only needed to size total — allocations live in route.js',
        '    const lens = segLens;') })),
    M('B2', 'total is reduced out of segLens instead of lens', null,
      (i) => ({ ...i, road: mutateText(i.road, 'B2', 'total = lens.reduce((a, b) => a + b, 0);', 'total = segLens.reduce((a, b) => a + b, 0);') })),
    M('B3', 'pAt(total) returns the tidied 1 at the two device heights', [0, 1],
      (i) => ({ ...i, 812: 1, 932: 1 })),
    M('B4', 'a non-divergent height stops returning exactly 1', [0],
      (i) => ({ ...i, 900: 0.9999999999999996 })),
    M('B5', 'the ULP gap closes — which is what the forbidden tidy DOES', [0, 1],
      (i) => ({ ...i, kx: { ...i.kx, 812: i.total[812], 932: i.total[932] } })),
    M('B6', 'the two vh-space roots are made to agree, which is the trap ceasing to exist', [1],
      (i) => ({ ...i, segVh: [...i.chapterVh] })),

    /* G — the oracle comparison. */
    /* The G readers return FLAT arrays over 8 heights x N keys. The declared
       axis is the FLAT index, and gate 4 checks it: h=900 is height 2, so its
       km cell is 2*3+2 = 8 and its invY cell is 2*2+1 = 5. Getting these wrong
       is exactly the D50 neighbouring-quantity error the gate exists for — and
       it caught both on the first sweep. */
    M('G1', 'a knot tangent drifts by one ULP', [8],
      (i) => ({ ...i, s: { ...i.s, 900: { ...i.s[900], km: i.s[900].km.map((x, j) => (j === 4 ? x * (1 + Number.EPSILON) : x)) } } })),
    M('G2', 'one inverse-table sample drifts by one ULP', [5],
      (i) => ({ ...i, s: { ...i.s, 900: { ...i.s[900], invY: i.s[900].invY.map((x, j) => (j === 700 ? x * (1 + Number.EPSILON) : x)) } } })),
    M('G3', 'total drifts at one height', [0],
      (i) => ({ ...i, s: { ...i.s, 812: { ...i.s[812], total: i.s[812].total + 1e-9 } } })),
    M('G4', 'one of 16,392 pAt samples drifts', [0],
      (i) => ({ ...i, s: { ...i.s, 812: { ...i.s[812], pxGrid: i.s[812].pxGrid.map((x, j) => (j === 556 ? x * (1 + Number.EPSILON) : x)) } } })),
    M('G5', 'one scrollFor sample drifts', [1],
      (i) => ({ ...i, s: { ...i.s, 932: { ...i.s[932], pGrid: i.s[932].pGrid.map((x, j) => (j === 1019 ? x * (1 + Number.EPSILON) : x)) } } })),
    M('G6', 'lengthAtP answers a different segment at one p', [3],
      (i) => ({ ...i, s: { ...i.s, 1080: { ...i.s[1080], lenGrid: i.s[1080].lenGrid.map((x, j) => (j === 100 ? x + 1 : x)) } } })),
    M('G7', 'the module and the sliced closure disagree at one sample', [0],
      (i) => ({ ...i, s: { ...i.s, 812: { ...i.s[812], pxGrid: i.s[812].pxGrid.map((x, j) => (j === 0 ? x + 1 : x)) } } })),

    /* C/E/F — purity, residue, contract. */
    M('C1', 'a viewport read creeps into road.js', null,
      (i) => ({ ...i, src: `${i.src}\nconst z = window.innerHeight;` })),
    M('C2', 'a clock read creeps into road.js', null,
      (i) => ({ ...i, src: `${i.src}\nconst z = performance.now();` })),
    M('C3', 'road.js grows a second import', null,
      (i) => ({ ...i, src: `import { SMOOTH_K } from './constants.js';\n${i.src}` })),
    M('C4', 'road.js exports a second name', null,
      (i) => ({ ...i, src: `${i.src}\nexport function peekKnots() { return null; }` })),
    M('C5', 'the road object grows a member — a widened compatibility surface', null,
      (i) => ({ keys: [...i.keys, 'peekKnots'] })),
    M('E1', 'a second assignment to the total mirror appears', null,
      (i) => ({ ...i, src: `${i.src}\n    total = 0;` })),
    M('E2', 'the mirror is left at zero', null, (i) => ({ ...i, road: { resize() {}, get total() { return 0; } } })),
    M('E3', 'measure() calls road.resize BEFORE sampling keepP off the old road', null,
      (i) => ({ ...i, src: mutateText(i.src, 'E3',
        '    const keepP = total > 0 ? clamp01(pAt(v) + carry) : 0;\n    carry = 0;\n    road.resize(h);',
        '    road.resize(h);\n    const keepP = total > 0 ? clamp01(pAt(v) + carry) : 0;\n    carry = 0;') })),
    M('E4', 'push() acquires the road.total rewrite this order deliberately avoided', null,
      (i) => ({ ...i, now: mutateText(i.now, 'E4', 'v = Math.max(0, Math.min(total, v + dpx));', 'v = Math.max(0, Math.min(road.total, v + dpx));') })),
    M('F1', 'an orphan copy of the road state is left behind in scroll.js', null,
      (i) => ({ ...i, src: `${i.src}\n  let segLens = [];` })),
    M('F2', 'scroll.js re-imports SEGMENTS', null,
      (i) => ({ ...i, src: `${i.src}\nconst z = SEGMENTS.length;` })),
    M('F3', 'a member leaves the root surface', null, (i) => ({ ...i, members: i.members.filter((m) => m !== 'total') })),
    M('F4', 'lengthAtP is exported from the model, widening the compatibility surface', null,
      (i) => ({ ...i, members: [...i.members, 'lengthAtP'] })),
    M('F5', 'road.js is filed away from its named neighbours', null,
      (i) => ({ ...i, src: i.src.replace('"journey/road.js",\n    "journey/route.js",', '"journey/route.js",') })),
    M('F6', 'a second road-named entry appears in the manifest', null,
      (i) => ({ ...i, src: i.src.replace('"journey/road.js",', '"journey/road.js",\n    "journey/road-extra.js",') })),
  ];

  const res = sweep(MUTANTS);
  L.discard();
  L.same('P1', 'D50 — mutants exercised', res.total, MUTANTS.length);
  L.same('P2', 'D50 — every mutant drove its named assertion red, on the axis it declared',
    res.bad, 0);
  /* D88 — THE DECLARED-EQUIVALENCE SET IS EMPTY. Every mutation in the list
     above changes a quantity some pin reads; none of them is a refactoring
     that leaves behaviour intact. So the survivor set must be empty, and P0a
     is the separate proof that an empty survivor set is a finding rather than
     an instrument that cannot report one. */
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
