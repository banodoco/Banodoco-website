// A01a-1 — the canvas painting library extracted out of
// journey/chapters/owned/portraits.js (:45-632) into
// journey/chapters/owned/portrait-paint.js.
//
//   node tools/test-portrait-paint.mjs                  the contract
//   node tools/test-portrait-paint.mjs --prove-failure  mutants + literal-predicate scan
//   node tools/test-portrait-paint.mjs --capture-baseline   re-derive the pinned literals
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS, AND WHY IT IS SHAPED THE WAY IT IS
//
// A01's decision.md §3 records that drawPhotoCell is covered by NO golden
// capture — portraits.js:2217-2219 says so in its own words ("the ten goldens
// do not cover the photo pipeline"), because snap() deliberately does not snap
// uPhoto, so every frozen capture renders the procedural busts. drawBust and
// drawAnonGlyph are covered byte-for-byte by the D16 goldens; drawPhotoCell is
// covered by nothing at all.
//
// A01a-1's FIRST proposed proof for that gap was "a direct before/after canvas
// byte comparison under a fixed dealSalt". Its R1 review graded that
// qa-01/patterns.md **Engine 1** — a value derived from the subject appearing
// on both sides of the comparison, whose own example list literally names
// "dealFor(0) called twice" — and the coordinator recorded it as the run's
// twenty-second tautology finding, notable for being caught in a *proposal*
// rather than in shipped code. decision.md §3 replaced it with the six-step
// contract **A01a-1-P1**, which this file implements:
//
//   1. pre-move digests pinned as SOURCE LITERALS, captured before any file
//      moved, with the capture command and source commit recorded (below);
//   2. the cell count pinned to a literal (D45: "a check that has never run
//      over its subject is not evidence about its subject, however green it
//      was") — a bake that painted zero cells must go RED, not silently green;
//   3. PER-CELL digests, never one whole-atlas hash (Engine 3: a single hash
//      over a discovered collection loses its arity dimension, and a short or
//      empty canvas hashes perfectly cleanly);
//   4. a positive control beside every `after === before` (Engine 4);
//   5. `--prove-failure` AND the D44 comment-aware literal-predicate scan in
//      ONE invocation, both failing the exit code;
//   6. the D44-addendum fixture-chooser form for provenance/identity claims,
//      so the sweep corrupts WHICH FIXTURE IS SUPPLIED rather than what a
//      supplied value contains.
//
// The closing rule of that contract, obeyed throughout: **no comparison in
// this file has both of its sides produced by the run under test.** Every
// `expected` is a literal or an imported constant. In particular this file
// never re-derives the pre-move digests at assertion time and diffs them
// against the post-move ones — that is precisely the shape that was rejected.
//
// ---------------------------------------------------------------------------
// WHAT THE DIGESTS ARE A DIGEST OF, STATED HONESTLY
//
// Node has no rasterizing canvas and this order may not add one (nor run the
// browser harness — the 21 captures must stay hash-unchanged). So the pinned
// value is NOT a hash of rasterized pixels. It is a SHA-256 over the complete,
// ordered transcript of Canvas2D operations the painter issues into a
// recording context: every method call with every argument, every property
// assignment, every gradient created and every colour stop added to it, in
// issue order.
//
// That is a faithful pin for THIS order's question. Canvas2D output is a pure
// function of the ordered call sequence and its arguments, so an identical
// transcript rasterizes identically in a given browser. The transcript is in
// one respect STRICTER than a pixel hash (it is sensitive to state ordering
// that a rasterizer could coincidentally wash out) and in one respect weaker
// (it cannot catch a change in how the browser rasterizes an unchanged call
// sequence — which no source relocation can cause). The named limitation is
// recorded in this order's evidence rather than left implicit.
//
// The transcript also captures the seeded stream by construction: each painter
// opens its OWN H.rng stream from a caller-supplied scalar (drawPhotoCell at
// portraits.js:337, drawBust at :424, drawAnonGlyph at :572), and every draw
// below consumes it. A single perturbed draw from any of those streams moves
// every subsequent op in the transcript. Mutants m3 and m4 in --prove-failure
// exist to demonstrate exactly that.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripComments } from './strip-comments.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/* -------------------------------------------------------------------- *
 * D57 — ABORT SENTINEL.                                                 *
 *                                                                       *
 * This suite is straight-line at module top level and loads several      *
 * rewritten module trees, so a throw anywhere kills the process before   *
 * the ledger reports. A crashed run then emits neither a FAIL line nor a *
 * summary line, which makes it BYTE-IDENTICAL to a clean pass under any  *
 * filter that only matches failure — and this file has already done      *
 * exactly that once: when A01a-2 removed `drawPhotoCell` from            *
 * portraits.js's import list, `paintImportEdge()` threw at module scope  *
 * and this suite aborted having run ZERO of its 53 checks. It was masked *
 * in the chain only because an earlier suite was independently red.      *
 *                                                                       *
 * The sentinel announces the crash through the very filter that would    *
 * hide it. Implementation is J04a's (verify-j04a.mjs:67-83), the         *
 * reference D57 names, as adopted by A01a-2's suite.                     *
 * -------------------------------------------------------------------- */
let REPORTED = false;
let SWEEP_REPORTED = false;
const SWEEP_REQUESTED = process.argv.includes('--prove-failure');
process.on('exit', (code) => {
  if (!REPORTED) {
    console.log(`FAIL test-portrait-paint ABORTED before reporting (exit ${code}) — `
      + 'the suite did not run to completion; no assertion total is available');
  } else if (SWEEP_REQUESTED && !SWEEP_REPORTED) {
    // The sweep half needs its own flag. A crash AFTER the ledger reports but
    // BEFORE the sweep summary leaves a log whose last line is `53/53 passed`
    // — which reads as success to a human skimming and to any filter keyed on
    // the summary. This happened here: m10 threw mid-sweep and the run's
    // visible tail was a clean ledger.
    console.log(`FAIL test-portrait-paint ABORTED mid --prove-failure (exit ${code}) — `
      + 'the ledger reported but the mutant sweep did not finish; no mutant total is available');
  }
});

// This run's starting commit, pinned explicitly rather than as `HEAD`. R01's
// tools/test-animation-lifecycle.mjs records why: the moment this order's own
// edits are committed, `HEAD` advances past the pre-change file and the
// baseline silently becomes byte-identical to the subject.
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

const PORTRAITS_REL = 'journey/chapters/owned/portraits.js';
const PAINT_REL = 'journey/chapters/owned/portrait-paint.js';
// The paint cluster's SECOND consumer, created by A01a-2. See the census pins.
const REMIX_REL = 'journey/chapters/owned/portrait-remix.js';

/* ==================================================================== *
 * Ledger — self-contained, no dependency on another order's test infra. *
 * ==================================================================== */
function createLedger(title) {
  const rows = [];
  return {
    check(name, actual, expected) {
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      rows.push({ name, ok, actual, expected });
      return ok;
    },
    report() {
      console.log(`\n${title}`);
      let failures = 0;
      for (const r of rows) {
        if (r.ok) {
          console.log(`  ok    ${r.name}`);
        } else {
          failures++;
          console.log(`  FAIL  ${r.name}`);
          console.log(`        expected: ${JSON.stringify(r.expected)}`);
          console.log(`        actual:   ${JSON.stringify(r.actual)}`);
        }
      }
      console.log(`  ${rows.length - failures}/${rows.length} passed`);
      return failures;
    },
    get count() { return rows.length; },
  };
}

/* ==================================================================== *
 * The recording Canvas2D context.                                       *
 * ==================================================================== */
const CTX_METHODS = [
  'save', 'restore', 'beginPath', 'closePath', 'rect', 'clip', 'arc', 'ellipse',
  'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'translate', 'scale',
  'rotate', 'transform', 'setTransform', 'resetTransform', 'fill', 'stroke',
  'fillRect', 'strokeRect', 'clearRect', 'drawImage', 'fillText', 'strokeText',
];
const CTX_PROPS = [
  'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
  'globalAlpha', 'globalCompositeOperation', 'shadowBlur', 'shadowColor',
  'shadowOffsetX', 'shadowOffsetY', 'font', 'textAlign', 'textBaseline',
  'filter', 'imageSmoothingEnabled', 'imageSmoothingQuality',
];

/** Renders one argument or property value into its transcript token. Numbers
 *  use String() (V8's shortest round-trip form — lossless and deterministic),
 *  so a perturbation of any size shows up rather than being rounded away. */
function token(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  const t = typeof v;
  if (t === 'number' || t === 'boolean' || t === 'string') return String(v);
  if (t === 'object' && typeof v.__rec === 'string') return v.__rec;
  return `[${t}]`;
}

function createRecordingContext() {
  const ops = [];
  let gradientSeq = 0;
  const ctx = {};
  for (const m of CTX_METHODS) {
    ctx[m] = (...args) => { ops.push(`${m}(${args.map(token).join(',')})`); };
  }
  const gradient = (kind, args) => {
    const id = `${kind}#${gradientSeq++}`;
    ops.push(`${kind}(${args.map(token).join(',')})->${id}`);
    return {
      __rec: id,
      addColorStop(offset, colour) { ops.push(`${id}.addColorStop(${token(offset)},${token(colour)})`); },
    };
  };
  ctx.createLinearGradient = (...a) => gradient('createLinearGradient', a);
  ctx.createRadialGradient = (...a) => gradient('createRadialGradient', a);
  ctx.createPattern = (...a) => gradient('createPattern', a);
  ctx.measureText = (s) => { ops.push(`measureText(${token(s)})`); return { width: 0 }; };
  ctx.getImageData = (...a) => {
    ops.push(`getImageData(${a.map(token).join(',')})`);
    return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
  };
  ctx.putImageData = (...a) => { ops.push(`putImageData(${a.slice(1).map(token).join(',')})`); };
  const store = {};
  for (const p of CTX_PROPS) {
    Object.defineProperty(ctx, p, {
      get() { return store[p]; },
      set(v) { store[p] = v; ops.push(`${p}=${token(v)}`); },
      enumerable: true,
    });
  }
  return {
    ctx,
    get opCount() { return ops.length; },
    digest() { return createHash('sha256').update(ops.join('\n')).digest('hex').slice(0, 16); },
  };
}

/* ==================================================================== *
 * Fixtures.                                                             *
 *                                                                       *
 * Deliberately written as flat literals rather than obtained from       *
 * portrait-deal.js's photoSpecs(): a fixture pulled out of another      *
 * module would make this suite's inputs move whenever THAT module moves *
 * (portrait-deal.js is R04's file, edited concurrently), and would put  *
 * a value derived from the subject tree on the input side. The shape    *
 * mirrors portrait-deal.js:52-68 exactly; the values are this suite's   *
 * own. CELL 256 and HOVER_CELL 512 are portraits.js:1019 and :1848.     *
 * ==================================================================== */
const SHEET = { __rec: 'sprite-sheet-960x96' };

const PHOTO_FIXTURES = [
  // resting grade (spec.grade absent -> PHOTO_GRADE), exposure < 1 so the
  // step-3 trim branch is TAKEN, no mirror, cell at the atlas origin
  { name: 'photo/rest/exposure<1/no-mirror/origin-cell', ox: 0, oy: 0, cell: 256, hover: false,
    spec: { sx: 0, sy: 0, sw: 96, sh: 96, mirror: false, exposure: 0.90, warmth: 0.0, seed: 5000, bustSeed: 131 } },
  // resting grade, exposure > 1 so the trim branch is SKIPPED and step 4 takes
  // its 0.26 arm rather than 0.16; mirrored, so the scale(-1,1) op appears
  { name: 'photo/rest/exposure>1/mirror/col-1', ox: 256, oy: 0, cell: 256, hover: false,
    spec: { sx: 96, sy: 0, sw: 96, sh: 96, mirror: true, exposure: 1.16, warmth: 0.5, seed: 5037, bustSeed: 269 } },
  // resting grade, exposure exactly 1 — the trim boundary
  { name: 'photo/rest/exposure=1/row-1', ox: 512, oy: 256, cell: 256, hover: false,
    spec: { sx: 192, sy: 0, sw: 96, sh: 96, mirror: false, exposure: 1.00, warmth: 1.0, seed: 5074, bustSeed: 407 } },
  // HOVER_GRADE at HOVER_CELL: level 0.786 forces the trim branch even though
  // exposure is 1.05, veil 0 skips the bloom and the 340-speckle loop, key 0
  // and lift 0.2 rescale steps 4 and 6, feather 0.92 retunes the mask
  { name: 'photo/hover/level-trim/veil-0/hover-cell', ox: 0, oy: 0, cell: 512, hover: true,
    spec: { sx: 288, sy: 0, sw: 96, sh: 96, mirror: false, exposure: 1.05, warmth: 0.25, seed: 5111, bustSeed: 545 } },
  // HOVER_GRADE, mirrored, exposure < 1 so trim = exposure * level
  { name: 'photo/hover/exposure<1/mirror/hover-cell', ox: 512, oy: 0, cell: 512, hover: true,
    spec: { sx: 384, sy: 0, sw: 96, sh: 96, mirror: true, exposure: 0.92, warmth: 0.75, seed: 5148, bustSeed: 683 } },
  // resting grade again with a high-column source tile and a large seed, to
  // put a second independent RNG stream through the same code path
  { name: 'photo/rest/high-tile/large-seed', ox: 1792, oy: 512, cell: 256, hover: false,
    spec: { sx: 864, sy: 0, sw: 96, sh: 96, mirror: false, exposure: 0.98, warmth: 0.375, seed: 15911, bustSeed: 9973 } },
];

// bustSeedsFor's law is (content.seed ?? i+1) * 131 + i * 7 + v * 9973
// (portraits.js:1825). These three are real outputs of it: i=0/v=0 with
// seed 1, i=5/v=0 with seed 6, i=0/v=1.
const BUST_FIXTURES = [
  { name: 'bust/seed-131/origin-cell', ox: 0, oy: 0, cell: 256, seed: 131 },
  { name: 'bust/seed-821/col-3', ox: 768, oy: 0, cell: 256, seed: 821 },
  { name: 'bust/seed-10104/row-2', ox: 256, oy: 512, cell: 256, seed: 10104 },
];

// anonSeeds is [11, 23, 37, 53] at portraits.js:1027; the 2x2 anon atlas
// paints them at CELL 256.
const ANON_FIXTURES = [
  { name: 'anon/seed-11/origin-cell', ox: 0, oy: 0, cell: 256, seed: 11 },
  { name: 'anon/seed-23/col-1', ox: 256, oy: 0, cell: 256, seed: 23 },
  { name: 'anon/seed-53/row-1-col-1', ox: 256, oy: 256, cell: 256, seed: 53 },
];

/* The fixture set behind a CHOOSER.
 *
 * F-2 / D50: a mutant must perturb the exact quantity its target assertion
 * reads. The cardinality checks 1b-1f read *how many fixtures were painted*,
 * and no mutation of portrait-paint.js can move that number — the fixture
 * arrays live here, in the suite. Before this repair the sweep offered m7 (a
 * painter made to early-return) as their mutant; applied, 1b-1f all stayed
 * GREEN, because these counters count invocations, not output. Only the
 * op-count half of check 2 ever caught it.
 *
 * So the buckets are supplied through `fixturesFor()` and the sweep corrupts
 * WHICH FIXTURE SET IS SUPPLIED — the same move the D44 addendum prescribes
 * for provenance, applied to cardinality. Mutants m11-m15 empty or trim one
 * bucket each, which is D45's founding scenario made executable: a member loop
 * that ships green over zero items. */
const FULL_FIXTURES = Object.freeze({ photo: PHOTO_FIXTURES, bust: BUST_FIXTURES, anon: ANON_FIXTURES });

/** The fixture set the run under test uses. `trim` is used ONLY by
 *  --prove-failure, to demonstrate that each cardinality pin can go red. */
function fixturesFor(trim) {
  if (!trim) return FULL_FIXTURES;
  const { bucket, keep } = trim;
  if (!(bucket in FULL_FIXTURES)) throw new Error(`anchors no longer match source: no fixture bucket ${bucket}`);
  return Object.freeze({ ...FULL_FIXTURES, [bucket]: FULL_FIXTURES[bucket].slice(0, keep) });
}

/** Paints the supplied fixture set through `painters` and returns one record
 *  per cell plus the number of painter INVOCATIONS in each bucket. The counts
 *  are returned — not merely computed — so the caller can pin them to literals
 *  (D45). Note the honest noun: these count invocations, not painted output.
 *  Check 2's op-count pin is what observes whether anything was drawn. */
function paintAll(painters, fixtures = FULL_FIXTURES) {
  const { drawPhotoCell, drawBust, drawAnonGlyph, HOVER_GRADE } = painters;
  const cells = [];
  let photoCells = 0, bustCells = 0, anonCells = 0;
  for (const f of fixtures.photo) {
    const rec = createRecordingContext();
    const spec = { img: SHEET, ...f.spec };
    if (f.hover) spec.grade = HOVER_GRADE;
    drawPhotoCell(rec.ctx, f.ox, f.oy, f.cell, spec);
    photoCells++;
    cells.push({ name: f.name, digest: rec.digest(), ops: rec.opCount });
  }
  for (const f of fixtures.bust) {
    const rec = createRecordingContext();
    drawBust(rec.ctx, f.ox, f.oy, f.cell, f.seed);
    bustCells++;
    cells.push({ name: f.name, digest: rec.digest(), ops: rec.opCount });
  }
  for (const f of fixtures.anon) {
    const rec = createRecordingContext();
    drawAnonGlyph(rec.ctx, f.ox, f.oy, f.cell, f.seed);
    anonCells++;
    cells.push({ name: f.name, digest: rec.digest(), ops: rec.opCount });
  }
  return { cells, photoCells, bustCells, anonCells, total: cells.length };
}

/* ==================================================================== *
 * Module loading. Both the pre-move baseline and the post-move subject   *
 * are loaded by rewriting import specifiers onto absolute file:// URLs   *
 * in a temp tree OUTSIDE the repo (the C04 harness's technique). The     *
 * baseline reads EVERY file out of RUN_START_SHA via `git show`, never   *
 * out of the working tree, so --capture-baseline reproduces the pinned   *
 * literals no matter what four concurrent orders are doing to the tree.  *
 * ==================================================================== */
/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite minted ONE staging root and    *
 * removed it never - 1 directory per run, 34 standing on this machine    *
 * when the measurement was taken.                                        *
 *                                                                        *
 * This suite ALREADY had a process.on('exit') hook - the D57 abort       *
 * sentinel above. It cleaned up nothing: that hook reports an abort, it  *
 * does not release the tree. A second listener is registered here rather *
 * than folded into the sentinel, because the two have different jobs and *
 * the sentinel must keep working if this one throws.                     *
 *                                                                        *
 * Note this suite ALSO imports test-portrait-harness.mjs, which mints a  *
 * c04-portraits root of its own. That one is released by the harness,    *
 * not here.                                                              *
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
const scratchRoot = mkdtempSync(join(tmpdir(), 'a01a1-paint-'));
process.on('exit', () => {
  try { rmSync(scratchRoot, { recursive: true, force: true }); } catch { /* best effort */ }
});
let scratchSeq = 0;

function browserSurface() {
  const noop = () => undefined;
  globalThis.document = globalThis.document || {
    createElement: () => ({ width: 0, height: 0, getContext: () => createRecordingContext().ctx }),
  };
  globalThis.window = globalThis;
  globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false, addEventListener: noop, removeEventListener: noop }));
  globalThis.requestIdleCallback = globalThis.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 0 }), 0));
  globalThis.cancelIdleCallback = globalThis.cancelIdleCallback || clearTimeout;
  globalThis.Image = globalThis.Image || class { set src(_v) { /* never settles */ } };
}
browserSurface();

const SPECIFIER_RE = /from\s+'([^']+)'/g;

/** Rewrites `entryRel` and everything it transitively imports into a fresh
 *  temp directory, resolving `three` onto the vendored module and every local
 *  relative specifier onto its rewritten twin. `read(rel)` supplies the source
 *  text for a repo-relative path, so the caller chooses the tree: working copy
 *  or a pinned commit. `append` is added verbatim to the ENTRY file only. */
function loadTree({ read, entryRel, tag, append = '' }) {
  const dir = join(scratchRoot, `${tag}-${scratchSeq++}`);
  mkdirSync(dir, { recursive: true });
  const done = new Map();

  const outPathFor = (rel) => {
    const base = rel.split('/').pop().replace(/\.js$/, '');
    const hash = createHash('md5').update(rel).digest('hex').slice(0, 8);
    return join(dir, `${base}-${hash}.mjs`);
  };
  const resolveRel = (fromRel, spec) => {
    const parts = fromRel.split('/').slice(0, -1).concat(spec.split('/'));
    const out = [];
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') out.pop();
      else out.push(p);
    }
    return out.join('/');
  };

  function rewrite(rel) {
    if (done.has(rel)) return done.get(rel);
    const outPath = outPathFor(rel);
    done.set(rel, outPath); // reserved before recursing: cycle-safe
    const raw = read(rel);
    const deps = [];
    raw.replace(SPECIFIER_RE, (m, spec) => { if (spec.startsWith('.')) deps.push(resolveRel(rel, spec)); return m; });
    for (const d of deps) rewrite(d);
    let out = raw.replace(SPECIFIER_RE, (m, spec) => {
      if (spec === 'three') return `from '${pathToFileURL(join(REPO, 'vendor/three/three.module.js')).href}'`;
      if (spec.startsWith('.')) return `from '${pathToFileURL(done.get(resolveRel(rel, spec))).href}'`;
      return m;
    });
    if (rel === entryRel) out += append;
    writeFileSync(outPath, out);
    return outPath;
  }

  return import(pathToFileURL(rewrite(entryRel)).href);
}

const readFromWorkingTree = (rel) => readFileSync(join(REPO, rel), 'utf8');
const readFromRunStart = (rel) =>
  execFileSync('git', ['show', `${RUN_START_SHA}:${rel}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** The pre-move painters, out of RUN_START_SHA's portraits.js, which does not
 *  export them — an export list is appended to the entry copy. The appended
 *  names are ANCHOR-GUARDED: if a declaration this suite expects to find is
 *  not in that source, the capture stops rather than producing a baseline for
 *  something other than what it names. */
const PRE_MOVE_EXPORT_ANCHORS = [
  'function drawPhotoCell(', 'function drawBust(', 'function drawAnonGlyph(',
  'const PHOTO_GRADE = Object.freeze({', 'const HOVER_GRADE = Object.freeze({',
];
function loadPreMovePainters() {
  const src = readFromRunStart(PORTRAITS_REL);
  for (const a of PRE_MOVE_EXPORT_ANCHORS) {
    if (!src.includes(a)) throw new Error(`anchors no longer match source: ${RUN_START_SHA}:${PORTRAITS_REL} has no ${JSON.stringify(a)}`);
  }
  return loadTree({
    read: readFromRunStart,
    entryRel: PORTRAITS_REL,
    tag: 'pre-move',
    append: '\nexport { drawPhotoCell, drawBust, drawAnonGlyph, PHOTO_GRADE, HOVER_GRADE };\n',
  });
}

/* ==================================================================== *
 * Source census — comment-aware, and PURE in its source argument so     *
 * --prove-failure can feed it mutated text (R03's countAttachmentSites  *
 * pattern; the same discipline that replaced R03's unfalsifiable        *
 * `L.check('...', true)`).                                              *
 * ==================================================================== */

/** Block comments become an equal count of newlines and line comments are
 *  blanked, so line numbers are preserved and prose that merely MENTIONS a
 *  symbol is not counted as a reference. portraits.js names PHOTO_GRADE in
 *  five separate comment passages (:1168, :1169, :1190, :1312, :1316, :1420,
 *  :2283); without this, the reach-in census would be pinning prose — the
 *  exact failure C05-B recorded under D45 ("a check that matched prose would
 *  have been pinning prose"). */
/** S-3 / D67 — the two regex replacements that used to be defined here are
 *  now the shared character-level stripper, imported above. They could not
 *  tell a comment from a `/*` or `//` inside a string, a template or a
 *  regex literal, so a phantom comment blanked live code and every scan
 *  below silently found nothing there (D46: "0 hits" is the passing answer).
 *
 *  Measured at the QA-05 fence, non-whitespace source characters treated as
 *  comment: journey/chapters/owned/portraits.js 7811 characters across 150
 *  lines — the largest production-subject figure measured in this run — and
 *  325 characters across 7 lines of this file. portrait-paint.js and
 *  portrait-remix.js measured 0.
 *
 *  The shared module is length- AND line-preserving, so every line number
 *  derived from stripped text below still indexes the original. */

/* ==================================================================== *
 * The D44 literal-predicate scanner — ADOPTED, not re-derived.           *
 *                                                                       *
 * Pattern taken verbatim from QA-03's                                    *
 *   docs/code-health/evidence/.../qa-03/regex-scanner-proto.mjs          *
 * which widened D44's shipped regex to catch six shapes it missed: an    *
 * escaped quote in the label, a bare `check(` in three variants, `, 1)` /*
 * `, 0)`, `, !0)` / `, !1)`, a string-literal predicate, and the `x === x`
 * identity form. The first of those is why this file's own previous scan *
 * was blind: it was anchored on the literal `L.check(`, so a pure rename *
 * of the ledger binding disabled it silently.                            *
 * ==================================================================== */
const SCAN_CALL = String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\.)?check\(\s*(['"\`])(?:\\[\s\S]|(?!\1)[\s\S])*?\1\s*,\s*(?:\(\s*\)\s*=>\s*)?`;
const scanSiteRe = () => new RegExp(String.raw`(?:^|[^.\w$])(?:[A-Za-z_$][\w$]*\.)?check\(`, 'g');
const scanConstRe = () => new RegExp(SCAN_CALL + String.raw`(true|false|!\s*[01]|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*[,)]`, 'g');
const scanIdentRe = () => new RegExp(SCAN_CALL + String.raw`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:===|!==|==|!=)\s*\2\s*[,)]`, 'g');

/** Scans one source text. Returns the assertion-call-site census (`sites` —
 *  the D46 positive control's subject) alongside the hits, so a caller can
 *  tell "read the file and found nothing" from "never read the file". */
function scanLiteralPredicateText(text) {
  const stripped = stripComments(text);
  const lines = text.split('\n');
  const lineOf = (i) => stripped.slice(0, i).split('\n').length;
  let sites = 0;
  { const r = scanSiteRe(); while (r.exec(stripped)) sites++; }
  const hits = [];
  for (const [shape, re] of [['constant', scanConstRe()], ['identity', scanIdentRe()]]) {
    let m;
    while ((m = re.exec(stripped))) {
      const lineNo = lineOf(m.index + m[0].length - 1);
      hits.push({ lineNo, shape, predicate: m[2], text: (lines[lineNo - 1] || '').trim() });
    }
  }
  hits.sort((a, b) => a.lineNo - b.lineNo);
  return { sites, hits, lines: lines.length };
}

/* PC-3's synthetic fixture table, adopted from QA-03's regex-fixtures.mjs.
 * The assertion token is assembled at run time (`'ch' + 'eck'`) so this table
 * does not inflate the PC-1 site census of the very file it lives in — QA-03's
 * own trick, kept for the same reason. */
const SK = 'ch' + 'eck';
const SCAN_FIXTURES = [
  ['SF-01', 'plain single-quoted', `  L.${SK}('a thing', true);`, 1],
  ['SF-02', 'double-quoted', `  L.${SK}("a thing", true);`, 1],
  ['SF-03', 'template label', '  L.' + SK + '(`a thing`, false);', 1],
  ['SF-04', 'multiline args', `  L.${SK}(\n    'a thing',\n    true,\n  );`, 1],
  ['SF-05', 'escaped quote in label', `  L.${SK}('it\\'s a thing', true);`, 1],
  ['SF-06', 'apostrophe via double quote', `  L.${SK}("it's a thing", true);`, 1],
  ['SF-07', 'bare check() with no receiver', `  ${SK}('a thing', true);`, 1],
  ['SF-08', 'arrow-wrapped bare true', `  ${SK}('a thing', () => true);`, 1],
  ['SF-09', 'arrow-wrapped bare false', `  ${SK}('a thing', () => false);`, 1],
  ['SF-10', 'truthy numeric literal 1', `  L.${SK}('a thing', 1);`, 1],
  ['SF-11', 'falsy numeric literal 0', `  L.${SK}('a thing', 0);`, 1],
  ['SF-12', 'negated zero', `  L.${SK}('a thing', !0);`, 1],
  ['SF-13', 'negated one', `  L.${SK}('a thing', !1);`, 1],
  ['SF-14', 'string literal in predicate position', `  L.${SK}('a thing', 'yes');`, 1],
  ['SF-15', 'identity comparison, always true', `  L.${SK}('a thing', x === x);`, 1],
  ['SF-16', 'identity inequality, always false', `  L.${SK}('a thing', x !== x);`, 1],
  ['SF-17', 'identity on a member path', `  L.${SK}('a thing', a.b.c === a.b.c);`, 1],
  ['SF-18', 'CLEAN: a real comparison against a literal', `  L.${SK}('a thing', n === 3);`, 0],
  ['SF-19', 'CLEAN: comparison whose right side is a literal', `  L.${SK}('a thing', x === true);`, 0],
  ['SF-20', 'CLEAN: negation of a variable', `  L.${SK}('a thing', !x);`, 0],
  ['SF-21', 'CLEAN: two distinct identifiers', `  L.${SK}('a thing', a === b);`, 0],
  ['SF-22', 'CLEAN: a call result', `  L.${SK}('a thing', f(1));`, 0],
  ['SF-23', 'CLEAN: a length comparison', `  L.${SK}('a thing', xs.length === 3);`, 0],
  ['SF-24', 'CLEAN: the shape named inside a line comment', `  // L.${SK}('a thing', true);`, 0],
  ['SF-25', 'CLEAN: the shape named inside a block comment', `  /* L.${SK}('a thing', true); */`, 0],
  ['SF-26', 'CLEAN: a longer identifier ending in the assertion name', `  re${SK}('a thing', true);`, 0],
  ['SF-27', 'CLEAN: a different assertion API taking the literal first', `  assert.ok(true, 'a thing');`, 0],
];

/* LEDGER-SHAPE COLLISION — checked executably, not assumed.
 *
 * The coordinator's instruction to adopt QA-03's widened receiver-agnostic
 * pattern was REVERSED after A01a-2 measured that it produces FALSE POSITIVES
 * against C04's ledger. The mechanism is precise and worth encoding rather
 * than trusting to memory: the widened pattern reads *the argument after the
 * quoted label* as the predicate. C04's `createLedger`
 * (tools/test-portrait-harness.mjs:263) takes `check(area, name, pass)` — TWO
 * quoted arguments — so its `name` lands in predicate position and every call
 * in the five C04 suites scans as a `string-literal predicate`. Four gated
 * suites would light up on adoption.
 *
 * THIS suite's ledger is `check(name, actual, expected)`: one quoted label,
 * and the argument after it is the actual. So the pattern reads exactly the
 * thing whose being a literal WOULD be a defect, and there is no collision —
 * the suite reports 0 hits over 40 assertion sites for the right reason, not
 * by luck. The pattern is therefore KEPT here.
 *
 * That conclusion is a claim about two ledger shapes, so it is pinned as two
 * fixtures rather than asserted in a comment: this suite's shape must scan
 * CLEAN, and C04's shape must scan as a HIT. If a future edit changes this
 * ledger's argument order, the first fixture goes red and points here. */
const LEDGER_SHAPE_FIXTURES = [
  ['LS-1', "this suite's shape (name, actual, expected) — the actual is an expression",
    `  L.${SK}('a label', someValue.field, EXPECTED);`, 0],
  ['LS-2', "this suite's shape with a genuinely literal actual — still correctly a HIT",
    `  L.${SK}('a label', true, EXPECTED);`, 1],
  ['LS-3', "C04's shape (area, name, pass) — the second LABEL lands in predicate position",
    `  L.${SK}('area', 'a name', pass);`, 1],
];
// LS-3 expects a hit, and that hit is a FALSE POSITIVE against C04's shape —
// which is the whole finding. Pinned so the incompatibility stays measured.
const LEDGER_SHAPE_ROWS = 3;

/* D46's two mandated controls.
 *
 * PC-1's literal — a POSITIVE control: the count of assertion call sites the
 * scanner can still SEE in this file's comment-stripped source. If it ever
 * reads 0, the scan is not reading this file's code at all, which is exactly
 * the state that is otherwise indistinguishable from "clean". Bump it
 * deliberately when assertion sites are added or removed.
 *
 * THE CONTROL EARNED ITS KEEP ON ITS FIRST RUN, and the error is worth
 * recording because it is the one D46 predicts. This literal was first written
 * as **54** — reasoned as "53 checks reported by the ledger, plus the one
 * `check(...)` method definition in createLedger". That conflates two
 * different quantities. The ledger's 53 is checks EXECUTED; PC-1 counts
 * assertion call sites in SOURCE, and section 2 is a loop — two call sites
 * that execute twenty-four times. The measured census is **33**. Nothing was
 * wrong with the suite; the number specifying its control was wrong, and the
 * control caught it before it could ever go quiet. D46's founding note records
 * the identical experience ("the control found the error before the scan
 * existed"). */
// QA-05: 40 -> 42, the two new call sites 6o/6p registered above.
// PIN-C8: 42 -> 42, and the number staying still is not the same thing as
// nothing happening. Three `L.check` sites went (5a's old sha256 row, 5b, 5c)
// and three arrived (the converted 5a, 5-BAL, 5-CTL). This census counts
// SITES in source, not checks executed — the distinction that made it read 33
// and not 54 the first time it was written — so a one-for-one exchange is
// invisible to it by design, and the check-count pin above is what carries
// the retirement.
const OWN_SCAN_SITES = 42;
/* PC-2's literal: the number of INPUTS read, not the number of matches. */
const OWN_SCAN_INPUTS = 1;

const PAINTER_DECLARATIONS = [
  'const SKIN_RAMP', 'const CLOTH', 'const HAIR',
  'function lerpC(', 'function rampPick(', 'function css(', 'function scaleC(',
  'function drawEmbedEdge(', 'function grainAndGrade(', 'function softMask(',
  'const PHOTO_GRADE', 'const HOVER_GRADE',
  'function drawPhotoCell(', 'function drawBust(', 'function drawAnonGlyph(',
];

/** How many of the fifteen painter-cluster declarations this source defines. */
function countPainterDeclarations(src) {
  const stripped = stripComments(src);
  let n = 0;
  for (const d of PAINTER_DECLARATIONS) if (stripped.includes(d)) n++;
  return n;
}

/* PIN-C8 — the relocated block's DECLARATION MANIFEST, in source order with
 * full signatures. Check 5a's reader; the note above 5a records the
 * measurement that retired the sha256/line/byte triple it replaces.
 *
 * `countPainterDeclarations` above does not stand in for it and is not made
 * redundant by it: that one asks whether each of fifteen substrings appears
 * SOMEWHERE, so it is blind to order, to signature, and to a second
 * declaration of the same name — `includes` answers true once and stops.
 *
 * D93: the pattern requires the closing paren on the same line, so a header
 * whose parameter list wraps drops OUT of the manifest and goes red rather
 * than being sliced short and passing. */
const TOP_LEVEL_DECL = /^(?:function\s+[A-Za-z_$][\w$]*\s*\([^)]*\)|const\s+[A-Za-z_$][\w$]*)/;
function blockDeclManifest(text) {
  return text.split('\n')
    .map((l) => (l.match(TOP_LEVEL_DECL) || [null])[0])
    .filter((m) => m !== null)
    .map((m) => m.replace(/\s+/g, ' '));
}

const REACH_IN_NAMES = ['drawBust', 'drawAnonGlyph', 'drawPhotoCell', 'PHOTO_GRADE', 'HOVER_GRADE'];

/** The factory's reach into the paint cluster, counted over comment-stripped
 *  source with the import statement itself excluded. Returns both the number
 *  of distinct LINES that reach in (inventory.md §1's "seven executable
 *  reference points") and the number of identifier OCCURRENCES, because
 *  :1850 reaches in twice on one line and a site count alone would hide it.
 *
 *  QA-05 / S-3: STRINGS ARE BLANKED HERE, and only here. portraits.js embeds
 *  GLSL as template literals, and that GLSL carries `//` line comments —
 *  three of them name HOVER_GRADE and PHOTO_GRADE in shader prose (the lines
 *  GLSL_PROSE_ANCHORS resolves; deliberately not cited by number here). To
 *  JavaScript those are STRING CONTENT, not comments, so a correct JS comment
 *  stripper leaves them standing and this census counted 10 sites where 7
 *  reach in — pinning prose, the exact failure this docstring exists to
 *  prevent (D45). The regex stripper that used to be here got 7 by blanking
 *  them as if they were JS comments: the right answer for the wrong reason.
 *  Blanking string BODIES (interpolations are still scanned as code) gives 7
 *  from the same seven lines — verified site-for-site against the pre-QA-05
 *  reading on all three consumers. A reference cannot live in shader text,
 *  so nothing real is lost. */
function countReachIn(src) {
  const lines = stripComments(src, { blankStrings: true }).split('\n');
  let sites = 0, occurrences = 0;
  for (const line of lines) {
    if (/^\s*import\s/.test(line)) continue;
    let onThisLine = 0;
    for (const n of REACH_IN_NAMES) {
      const m = line.match(new RegExp(`\\b${n}\\b`, 'g'));
      if (m) onThisLine += m.length;
    }
    if (onThisLine > 0) { sites++; occurrences += onThisLine; }
  }
  return { sites, occurrences };
}

/** The deliberate two-line duplication decision.md §3 and the A01 acceptance
 *  entry both record: TAU and clamp sit OUTSIDE the :45-632 move range and are
 *  used on both sides, so portrait-paint.js must declare its own. Counted, so
 *  a later reader who deletes one gets a red check pointing at the decision. */
function countLeafAliases(src) {
  const stripped = stripComments(src);
  return {
    tau: (stripped.match(/const TAU = Math\.PI \* 2;/g) || []).length,
    clamp: (stripped.match(/const clamp = THREE\.MathUtils\.clamp;/g) || []).length,
  };
}

/** The paint import edge of ONE consumer, read out of that consumer's own
 *  source rather than assumed. Returns the specifier and the sorted name list.
 *
 *  RE-SCOPED after A01a-2 (finding R-A01a2-1). This function used to identify
 *  the edge by looking for **`drawPhotoCell`** in the import list — and
 *  `a01/decision.md` §2 Seam 1 had already *specified* that `drawPhotoCell`'s
 *  three call sites would move into `portrait-remix.js` one order later. The
 *  anchor was keyed to a fact the design had scheduled for removal, so the
 *  suite aborted at module scope the moment A01a-2 landed, having run zero of
 *  its 53 checks.
 *
 *  The lesson is narrow and worth stating: an anchor must key on what the
 *  design says is INVARIANT, not on whichever detail happens to be true when
 *  the anchor is written. The invariant here is the SPECIFIER — every consumer
 *  of the paint cluster imports from `./portrait-paint.js` — not any
 *  particular name in the list. */
function paintImportEdge(src) {
  const stmts = stripComments(src).match(/import\s*\{([^}]*)\}\s*from\s*'(\.\/[A-Za-z0-9._-]+\.js)';\n/g) || [];
  for (const stmt of stmts) {
    const parsed = stmt.match(/import\s*\{([^}]*)\}\s*from\s*'(\.[^']*)';/);
    if (parsed[2] !== EXPECTED_IMPORT_SPECIFIER) continue;
    const names = parsed[1].split(',').map((x) => x.trim()).filter(Boolean).sort();
    return { specifier: parsed[2], names };
  }
  return { specifier: null, names: [] };
}

/** The paint cluster's consumers, and the union census across them.
 *
 *  A01a-2 split the seven reach-in points across two files, and did the
 *  arithmetic in its own evidence: sites 10 = 7 + 3, occurrences 11 = 7 + 4,
 *  and the two name lists UNION to exactly the five exports. Both A01a-1 pins
 *  are therefore **conserved as sums across the seam**, so this is a
 *  re-scoping of WHERE the census reads, not a re-baselining of what it found.
 *
 *  The per-file parts are pinned as well as the sums, deliberately. A pin on
 *  the total alone would let a later order shuffle reach-in points between the
 *  two consumers with the sum unchanged and nothing going red — which is the
 *  same "conserved quantity hides a real move" hazard the sum is here to
 *  catch in the first place. */
function paintConsumerCensus(sources) {
  const perFile = sources.map(({ rel, src }) => {
    const edge = paintImportEdge(src);
    const reach = countReachIn(src);
    return { rel, specifier: edge.specifier, names: edge.names, sites: reach.sites, occurrences: reach.occurrences };
  });
  const union = [...new Set(perFile.flatMap((f) => f.names))].sort();
  return {
    perFile,
    union,
    sites: perFile.reduce((a, f) => a + f.sites, 0),
    occurrences: perFile.reduce((a, f) => a + f.occurrences, 0),
    consumers: perFile.length,
  };
}

/* ==================================================================== *
 * --capture-baseline                                                    *
 * ==================================================================== */
if (process.argv.includes('--capture-baseline')) {
  const painters = await loadPreMovePainters();
  const result = paintAll(painters);
  const preSrc = readFromRunStart(PORTRAITS_REL);
  const lines = preSrc.split('\n');
  const block = lines.slice(44, 632).join('\n') + '\n'; // :45-632 inclusive
  console.log(`// captured from ${RUN_START_SHA}:${PORTRAITS_REL}`);
  console.log(`// node tools/test-portrait-paint.mjs --capture-baseline`);
  console.log(`const PRE_MOVE = Object.freeze({`);
  for (const c of result.cells) {
    console.log(`  ${JSON.stringify(c.name)}: { digest: '${c.digest}', ops: ${c.ops} },`);
  }
  console.log(`});`);
  console.log(`photoCells=${result.photoCells} bustCells=${result.bustCells} anonCells=${result.anonCells} total=${result.total}`);
  console.log('const MOVED_BLOCK_DECLS = Object.freeze([');
  for (const d of blockDeclManifest(block)) console.log(`  ${JSON.stringify(d)},`);
  console.log(']);');
  console.log(`PRE_MOVE_PAINTER_DECLS_IN_PORTRAITS=${countPainterDeclarations(preSrc)}`);
  console.log(`PRE_MOVE_REACH_IN=${JSON.stringify(countReachIn(preSrc))}`);
  console.log(`PRE_MOVE_LEAF_ALIASES=${JSON.stringify(countLeafAliases(preSrc))}`);
  REPORTED = true;   // D57: a completed capture is a completed run, not an abort
  process.exit(0);
}

/* ==================================================================== *
 * THE PINS.                                                             *
 *                                                                       *
 * Captured BEFORE any file moved, out of                                *
 *   6967a36ab309af7057336be64d6f0f9dd3c41b21:journey/chapters/owned/portraits.js
 * with                                                                  *
 *   node tools/test-portrait-paint.mjs --capture-baseline               *
 * and pasted here verbatim as string and number literals. That mode     *
 * reads every file it loads out of that commit via `git show`, never    *
 * out of the working tree, so it re-derives these values identically no *
 * matter what the four concurrent orders are doing to the tree — and it *
 * keeps re-deriving them after this order lands, which is what makes    *
 * them auditable rather than merely asserted.                           *
 *                                                                       *
 * NOTHING BELOW IS COMPUTED BY THIS RUN. A01a-1-P1's closing rule:      *
 * "any comparison whose two sides are both produced by the run under    *
 * test is forbidden."                                                   *
 * ==================================================================== */
const PRE_MOVE = Object.freeze({
  'photo/rest/exposure<1/no-mirror/origin-cell': { digest: '7bf8de092eae3675', ops: 2255 },
  'photo/rest/exposure>1/mirror/col-1': { digest: 'a2dfab6cc77d7b34', ops: 2254 },
  'photo/rest/exposure=1/row-1': { digest: '9225fb7454aeade5', ops: 2253 },
  'photo/hover/level-trim/veil-0/hover-cell': { digest: '14abaf1502ad32b5', ops: 890 },
  'photo/hover/exposure<1/mirror/hover-cell': { digest: 'f922a50910f6063e', ops: 891 },
  'photo/rest/high-tile/large-seed': { digest: '2b05ab910abd3640', ops: 2255 },
  'bust/seed-131/origin-cell': { digest: 'f9a479b3e1365b8f', ops: 2319 },
  'bust/seed-821/col-3': { digest: '1c6522fa77aeef72', ops: 2319 },
  'bust/seed-10104/row-2': { digest: 'b582ea32666b604b', ops: 2315 },
  'anon/seed-11/origin-cell': { digest: '342d290abc7753c4', ops: 2741 },
  'anon/seed-23/col-1': { digest: '77803982f27b3f7e', ops: 2814 },
  'anon/seed-53/row-1-col-1': { digest: 'dd5c92ec2a3134be', ops: 2782 },
});
const PRE_MOVE_CELL_NAMES = Object.freeze(Object.keys(PRE_MOVE));

// D45 — the cardinality pins. "A check that has never run over its subject is
// not evidence about its subject, however green it was." A member loop shipped
// green over ZERO items, survived an XR review, a 902-assertion audit and its
// own prove-failure sweep at 100/100, and broke the first time it met a real
// subject. So the counts are literals, asserted beside the digests, and a bake
// that painted nothing goes RED rather than silently green.
const EXPECTED_PHOTO_CELLS = 6;
const EXPECTED_BUST_CELLS = 3;
const EXPECTED_ANON_CELLS = 3;
const EXPECTED_TOTAL_CELLS = 12;

/* The moved block itself: portraits.js:45-632 at RUN_START_SHA.
 *
 * PIN-C8 — WHAT THIS USED TO BE. Three pins (5a sha256, 5b 588 lines, 5c
 * 29143 bytes) over a window taken as a FIXED BYTE COUNT forward from the
 * banner. Measured over 1,764 mutants — every block line deleted, duplicated
 * and given a trailing space:
 *
 *   * THE TRIPLE COULD NOT TELL A BREAK FROM A REPAIR. 5a went red 1,758
 *     times: on the suite's own m2 break (88 ember arcs -> 87), and with the
 *     same one-line message on adding a clamp to rampPick and on editing a
 *     docstring. E4 blocked a user-visible fix in exactly this way.
 *   * 5b AND 5c COULD NOT FAIL WHILE 5a PASSED — not once in 1,764. Not a
 *     sample artefact: `movedBlock` was built by `.slice(0, BYTES)`, so 5c
 *     compared a slice's length to the length it had just been sliced to, and
 *     a sha256 match entails the string, which entails 5b's line count.
 *   * AND THE WINDOW WAS BLIND OFF ITS OWN END. Everything past byte 29,143
 *     fell outside it. All three stayed GREEN through a duplicated closing
 *     brace on the block's last line (`node --check`: SyntaxError), through a
 *     second corrupted `drawAnonGlyph` appended after the block, and through
 *     an appended `const LEAK = new Array(1e7)`.
 *
 * WHAT REPLACES IT — the S12/S13 move (cardinality to name manifest, made in
 * test-render-baseline.mjs yesterday): a TEXT-ANCHORED extent, and the
 * block's ordered DECLARATION MANIFEST with signatures. Added, removed,
 * renamed, reordered or re-signatured moves it; an edit inside a body does
 * not, which is the point. Section 2's twelve transcript digests and twelve
 * op counts are the behavioural half and are untouched — they name WHICH cell
 * moved and by how many ops, a report a whole-block sha256 cannot produce.
 * 5-BAL and 5-CTL below close the two ends of the trade.
 *
 * Text keying, not extent-derivation, is 6p's lesson in this same file: a set
 * derived from the extent it polices is how an assertion becomes
 * unfalsifiable. MOVED_BLOCK_DECLS is transcribed from
 * RUN_START_SHA:portraits.js:45-632 by --capture-baseline like every other
 * literal here — nothing below is computed by this run. */
const MOVED_BLOCK_START = '/* ================================================================== */\n/* atlas painting (spike verbatim)                                     */\n';
const MOVED_BLOCK_END = '\nexport {';
const MOVED_BLOCK_DECLS = Object.freeze([
  'const SKIN_RAMP',
  'const CLOTH',
  'const HAIR',
  'function lerpC(a, b, t)',
  'function rampPick(ramp, t)',
  'function css(c, a = 1)',
  'function scaleC(c, f)',
  'function drawEmbedEdge(g, cx, cy, R, r)',
  'function grainAndGrade(g, ox, oy, CELL, cx, cy, R, r, unify = 0.33, veil = 1)',
  'function softMask(g, ox, oy, CELL, cx, cy, R, feather = 0.86)',
  'const PHOTO_GRADE',
  'const HOVER_GRADE',
  'function drawPhotoCell(g, ox, oy, CELL, spec)',
  'function drawBust(g, ox, oy, CELL, seed)',
  'function drawAnonGlyph(g, ox, oy, CELL, seed)',
]);

// The frozen grade records, transcribed from portraits.js:206-281 and :289-321
// at RUN_START_SHA. Pinned as literals in their own right, not only through
// the digests, because they are the four values the FACTORY still reaches in
// for (portraits.js:1172, :1175, :1176, :1177, :2286 pre-move) and those reads
// are not exercised by any painter call.
const PRE_MOVE_PHOTO_GRADE = Object.freeze({
  desat: 0.06, amber: 0.64, unify: 0.16, burnMute: 0.70,
  hoverDeSepia: 1.0, hoverCoreMute: 1.0, hoverImgMute: 1.0, hoverSolid: 1.0,
});
const PRE_MOVE_HOVER_GRADE = Object.freeze({
  desat: 0, amber: 0, unify: 0, burnMute: 1.0, lift: 0.2,
  key: 0, veil: 0, feather: 0.92, level: 0.786,
});

// The post-move shape A01's inventory.md §1 specifies, transcribed from the
// design rather than measured from the result.
//
//   * fifteen painter-cluster declarations, ALL of them in portrait-paint.js
//     and NONE left in portraits.js;
//   * five exported names — ten intended-private symbols have zero outside
//     references and stay private;
//   * the factory's reach in is READ-ONLY and unchanged. inventory.md §1 calls
//     it "seven executable reference points"; four of those seven
//     (:1172/:1175/:1176/:1177, consecutive uniform declarations) are one
//     grouped row in that table but four separate LINES, so a line-based
//     census reads TEN lines / ELEVEN identifier occurrences. Both numbers are
//     pinned; the occurrence count is what catches :1850, the one site that
//     reaches in twice on a single line.
const EXPECTED_PAINTER_DECLS_IN_PAINT = 15;
const EXPECTED_PAINTER_DECLS_IN_PORTRAITS = 0;
const EXPECTED_REACH_IN_SITES = 10;
const EXPECTED_REACH_IN_OCCURRENCES = 11;
const EXPECTED_EXPORTS = Object.freeze(['HOVER_GRADE', 'PHOTO_GRADE', 'drawAnonGlyph', 'drawBust', 'drawPhotoCell']);
const EXPECTED_IMPORT_SPECIFIER = './portrait-paint.js';

/* --- the census after A01a-2, RE-SCOPED rather than re-baselined ---------
 *
 * A01a-2 moved three of the seven reach-in points into `portrait-remix.js`,
 * exactly the three `a01/decision.md` §2 Seam 1 named: `bakeBusts` ->
 * `drawBust`, `bakePhotos` -> `drawPhotoCell`, `bakePhotosHover` ->
 * `drawPhotoCell` + `HOVER_GRADE`. Figures below are taken from A01a-2's own
 * evidence (`../a01a-2/README.md` §10, finding R-A01a2-1), not re-derived.
 *
 *     sites        10 = 7 + 3
 *     occurrences  11 = 7 + 4
 *     names        {PHOTO_GRADE, drawAnonGlyph, drawBust}
 *                U {HOVER_GRADE, drawBust, drawPhotoCell}
 *                = the five EXPECTED_EXPORTS
 *
 * BOTH A01a-1 pins are conserved exactly as sums across the seam, so the
 * totals above are UNCHANGED and stay pinned to their original literals. Only
 * the set of files the census reads has moved.
 *
 * The parts are pinned as well as the sums. A total-only pin would let a later
 * order shuffle reach-in points between the two consumers with the sum intact
 * and nothing going red — the same "a conserved quantity hides a real move"
 * hazard that makes the sum worth having. */
const EXPECTED_CONSUMERS = 2;
const EXPECTED_NAMES_IN_PORTRAITS = Object.freeze(['PHOTO_GRADE', 'drawAnonGlyph', 'drawBust']);
const EXPECTED_NAMES_IN_REMIX = Object.freeze(['HOVER_GRADE', 'drawBust', 'drawPhotoCell']);
const EXPECTED_SITES_IN_PORTRAITS = 7;
const EXPECTED_SITES_IN_REMIX = 3;
const EXPECTED_OCCURRENCES_IN_PORTRAITS = 7;
const EXPECTED_OCCURRENCES_IN_REMIX = 4;

/* ==================================================================== *
 * The provenance fixture-chooser (A01a-1-P1 step 6 / the D44 addendum). *
 *                                                                       *
 * The claim under test is PROVENANCE, not value: "the painters this      *
 * suite pinned are the ones production actually resolves." A bare        *
 * `a !== b` over two module namespaces is satisfied by construction —    *
 * any two distinct objects already satisfy it — and a --prove-failure    *
 * sweep that corrupts a VALUE is corrupting an axis the assertion never  *
 * depended on. So the chooser takes portraits.js's OWN import statement  *
 * as its input and supplies whichever module that statement names. The   *
 * sweep then corrupts WHICH MODULE IS SUPPLIED (by feeding the chooser a *
 * portraits.js whose import points somewhere else), which is the axis    *
 * the claim actually rests on.                                          *
 * ==================================================================== */
async function paintersChosenBy(consumerSource) {
  const edge = paintImportEdge(consumerSource);
  // F-5 discipline: a consumer that names no paint module yields NO PAINTERS,
  // which paintOrSentinel turns into a legible `<not painted>` row. It does
  // not throw. Throwing here is what made m10 kill the sweep, and it is the
  // same shape as the abort this suite already shipped once: the absence of a
  // paint import is a finding checks 1a/6d/6e are built to report, not a
  // reason to deny every other check the chance to run.
  if (!edge.specifier) return {};
  const rel = `journey/chapters/owned/${edge.specifier.replace(/^\.\//, '')}`;
  return loadTree({ read: readFromWorkingTree, entryRel: rel, tag: 'chosen' });
}

/** Runs the fixture set through `painters`, returning a per-cell map. A module
 *  that does not supply the painters yields a legible sentinel rather than an
 *  exception, so the sweep can report a difference instead of crashing. */
function paintOrSentinel(painters, fixtures) {
  try {
    const r = paintAll(painters, fixtures);
    const byName = {};
    for (const c of r.cells) byName[c.name] = { digest: c.digest, ops: c.ops };
    return { ok: true, byName, counts: { photo: r.photoCells, bust: r.bustCells, anon: r.anonCells, total: r.total } };
  } catch (err) {
    return { ok: false, byName: {}, counts: { photo: 0, bust: 0, anon: 0, total: 0 }, error: String(err && err.message) };
  }
}

/* ==================================================================== *
 * MAIN                                                                  *
 * ==================================================================== */
const L = createLedger('A01a-1 — portrait-paint.js extraction contract');

const portraitsSource = readFromWorkingTree(PORTRAITS_REL);
const paintSource = readFromWorkingTree(PAINT_REL);

// --- 1. the painters, chosen by production's own import statement ---------
const PAINT_SPECIFIER = paintImportEdge(portraitsSource).specifier;
const painters = await paintersChosenBy(portraitsSource);
const painted = paintOrSentinel(painters);

// Engine 4 — each name below is read back as a question, and the predicate has
// to be able to answer `false` to THAT question. The four that could not are
// repaired here: `1a`'s name had lost an interpolation mid-sentence and named
// no module at all; `1b`-`1e` said "cells painted" while counting painter
// INVOCATIONS (F-2 — the gap that let m7 ship green against all five); `1f`
// said "actually painted" over a key set that is populated per invocation
// regardless of output. The prose now stops exactly where the predicate does.
L.check(`1a  the module portraits.js names in its painter import (${PAINT_SPECIFIER}) supplied all three painters`, painted.ok, true);

// D45 cardinality, asserted BEFORE the digests so an empty run cannot look green
L.check('1b  photo painter invocations (D45 cardinality pin)', painted.counts.photo, EXPECTED_PHOTO_CELLS);
L.check('1c  bust painter invocations (D45 cardinality pin)', painted.counts.bust, EXPECTED_BUST_CELLS);
L.check('1d  anon painter invocations (D45 cardinality pin)', painted.counts.anon, EXPECTED_ANON_CELLS);
L.check('1e  total painter invocations (D45 cardinality pin)', painted.counts.total, EXPECTED_TOTAL_CELLS);
L.check('1f  every pinned cell name is present in the painted set', Object.keys(painted.byName).sort(), [...PRE_MOVE_CELL_NAMES].sort());

// --- 2. per-cell digests against the pre-move literals --------------------
// Engine 3: per-cell, never one whole-atlas hash. A short or empty canvas
// hashes perfectly cleanly, so a single digest over the collection would have
// lost its arity dimension entirely.
for (const name of PRE_MOVE_CELL_NAMES) {
  const got = painted.byName[name] || { digest: '<not painted>', ops: -1 };
  L.check(`2   ${name} — transcript digest === pre-move literal`, got.digest, PRE_MOVE[name].digest);
  L.check(`2   ${name} — canvas op count === pre-move literal`, got.ops, PRE_MOVE[name].ops);
}

// --- 3. the frozen grade records -----------------------------------------
L.check('3a  PHOTO_GRADE === its pre-move value', { ...painters.PHOTO_GRADE }, { ...PRE_MOVE_PHOTO_GRADE });
L.check('3b  HOVER_GRADE === its pre-move value', { ...painters.HOVER_GRADE }, { ...PRE_MOVE_HOVER_GRADE });
L.check('3c  PHOTO_GRADE is still frozen', Object.isFrozen(painters.PHOTO_GRADE), true);
L.check('3d  HOVER_GRADE is still frozen', Object.isFrozen(painters.HOVER_GRADE), true);

/* --- 4. positive controls (Engine 4) -------------------------------------
 * "Every `after === before` needs a neighbouring `after !== before` on the
 * same instrument", and "whatever makes the negative case legible must be
 * applied to the positive case too" — so the controls run through the SAME
 * recording context, the SAME digest function and the SAME ledger, and each
 * perturbs exactly one field of one fixture.
 */
/* F-5: this instrument used to call the painter bare. When a painter THROWS —
 * and the most likely way it throws is exactly the scenario check 7a exists to
 * catch, `const TAU` deleted from portrait-paint.js, which is a call-time
 * ReferenceError rather than an import-time one — the exception escaped the
 * top-level module body and killed the process HERE, in section 4, three
 * sections before `L.report()`. The suite still exited 1, so the guarantee
 * held; but 7a never fired and the operator got a stack trace instead of the
 * one red line that names the cause. An instrument whose failure mode is a
 * crash reports nothing about the other twelve things it was going to check.
 * A throw is now a legible sentinel value, so every check downstream still
 * runs and the ledger still reports. */
function digestPhotoCellWith(mutate, ps = painters) {
  const f = PHOTO_FIXTURES[0];
  const rec = createRecordingContext();
  try {
    ps.drawPhotoCell(rec.ctx, f.ox, f.oy, f.cell, mutate({ img: SHEET, ...f.spec }));
  } catch (err) {
    return `<threw: ${err && err.message}>`;
  }
  return rec.digest();
}
const CONTROL_TARGET = PRE_MOVE['photo/rest/exposure<1/no-mirror/origin-cell'].digest;
L.check('4a  control: a perturbed exposure MOVES the digest',
  digestPhotoCellWith((s) => ({ ...s, exposure: 0.91 })) === CONTROL_TARGET, false);
L.check('4b  control: a perturbed seed MOVES the digest (the H.rng stream is live in the transcript)',
  digestPhotoCellWith((s) => ({ ...s, seed: 5001 })) === CONTROL_TARGET, false);
L.check('4c  control: a perturbed mirror flag MOVES the digest',
  digestPhotoCellWith((s) => ({ ...s, mirror: true })) === CONTROL_TARGET, false);
L.check('4d  control: swapping in HOVER_GRADE MOVES the digest',
  digestPhotoCellWith((s) => ({ ...s, grade: painters.HOVER_GRADE })) === CONTROL_TARGET, false);
L.check('4e  control: the unperturbed fixture still LANDS on the digest (the control instrument is sound)',
  digestPhotoCellWith((s) => s), CONTROL_TARGET);

/* --- 5. the moved block is the moved block -------------------------------
 * Both ends are text anchors and BOTH REFUSE on a miss (D93). The old
 * window's far end was a byte count, which cannot miss and therefore could
 * not refuse — it just silently stopped reading, which is how a duplicated
 * closing brace got past it. */
const blockStart = paintSource.indexOf(MOVED_BLOCK_START);
if (blockStart === -1) throw new Error('anchors no longer match source: portrait-paint.js has no atlas-painting banner');
const blockEnd = paintSource.indexOf(MOVED_BLOCK_END, blockStart);
if (blockEnd === -1) throw new Error('anchors no longer match source: portrait-paint.js has no export list after the atlas-painting banner');
const movedBlock = paintSource.slice(blockStart, blockEnd + 1);
L.check('5a  the relocated block still declares portraits.js:45-632\'s fifteen painter-cluster symbols — same names, same signatures, same order, and nothing else between the banner and the export list',
  blockDeclManifest(movedBlock), [...MOVED_BLOCK_DECLS]);

/* 5-BAL — the manifest's own blind spot, closed rather than recorded. m17
 * covers the half of the retired window's far-end blindness that IS a
 * declaration; a duplicated closing brace is not one, adds nothing to any
 * manifest, and makes the file a SyntaxError.
 *
 * Brace balance over the comment-stripped, string-blanked extent catches it,
 * and — the test that decides whether a converted pin is a byte pin under a
 * new name — does not catch what a repair does. Measured: comment-only edit,
 * 0; a balanced guard clause added to rampPick, 0; the suite's own m2
 * behavioural break, 0 (section 2's to catch, and it does); the duplicated
 * brace, -1. */
L.check('5-BAL  the relocated block\'s braces balance — it is a whole set of declarations, not a truncation or a splice',
  (() => {
    const c = stripComments(movedBlock, { blankStrings: true });
    let n = 0;
    for (const ch of c) { if (ch === '{') n++; else if (ch === '}') n--; }
    return n;
  })(), 0);

/* 5-CTL — the other direction. --prove-failure shows only that an assertion
 * CAN go red; nothing in a mutant sweep shows that it STAYS GREEN through an
 * edit it is meant to permit, and a converted pin that reds on any edit at
 * all is the pin it replaced under a new name. So the permitted edit runs
 * here, in memory, on the block the pin reads, and both halves are asserted:
 * the manifest holds, the retired sha256 does not. Same shape as section 4
 * (4a-4d "the digest MOVES", 4e "the unperturbed fixture LANDS"). Both sides
 * run-produced is what a CONTROL is; A01a-1-P1 forbids it in a PIN, which is
 * why 5a's expectation is a literal out of RUN_START_SHA and this is not a
 * pin. */
const COMMENT_EDIT_FROM = '/* THE PHOTO GRADE, IN ONE PLACE (Hannah, 2026-08-11';
if (!movedBlock.includes(COMMENT_EDIT_FROM)) {
  throw new Error(`anchors no longer match source: the relocated block has no ${JSON.stringify(COMMENT_EDIT_FROM)}`);
}
const commentEdited = movedBlock.replace(COMMENT_EDIT_FROM,
  '/* THE PHOTO GRADE, IN ONE PLACE — a01/decision.md §2 (Hannah, 2026-08-11');
L.check('5-CTL  the conversion is real, not a relabelling: a comment-only edit inside the block leaves the manifest standing, and the sha256 pin that used to be 5a would have gone red on it',
  [JSON.stringify(blockDeclManifest(commentEdited)) === JSON.stringify([...MOVED_BLOCK_DECLS]),
    createHash('sha256').update(commentEdited).digest('hex') === createHash('sha256').update(movedBlock).digest('hex')],
  [true, false]);

// --- 6. the seam's source census -----------------------------------------
// Order is load-bearing: perFile[0] is portraits.js, perFile[1] is
// portrait-remix.js, and the checks below index them by position.
const remixSource = readFromWorkingTree(REMIX_REL);
const census = paintConsumerCensus([
  { rel: PORTRAITS_REL, src: portraitsSource },
  { rel: REMIX_REL, src: remixSource },
]);
L.check('6a  portrait-paint.js declares all fifteen painter-cluster symbols',
  countPainterDeclarations(paintSource), EXPECTED_PAINTER_DECLS_IN_PAINT);
L.check('6b  portraits.js declares none of them',
  countPainterDeclarations(portraitsSource), EXPECTED_PAINTER_DECLS_IN_PORTRAITS);
// Engine 4: the old name here read "...(ten stay private)", which this
// predicate does not assert — it reads the export list, and the ten private
// symbols are absent from it only as a consequence. The privacy claim is
// carried by 6a (all fifteen declared here) together with this one (only five
// exported); neither says it alone, so neither name claims it alone.
L.check('6c  portrait-paint.js exports exactly the five public names',
  Object.keys(painters).sort(), [...EXPECTED_EXPORTS]);
/* 6d-6j — the consumer census, RE-SCOPED across both consumers after A01a-2.
 * The parts are asserted first and the conserved sums last, so a failure
 * report reads in the direction that diagnoses it: which file moved, then
 * whether the total survived. */
L.check(`6d  the paint cluster has exactly ${EXPECTED_CONSUMERS} consumers`, census.consumers, EXPECTED_CONSUMERS);
L.check('6e  every consumer imports from ./portrait-paint.js (the invariant the anchor now keys on)',
  census.perFile.map((f) => f.specifier), census.perFile.map(() => EXPECTED_IMPORT_SPECIFIER));
L.check('6f  portraits.js imports its three names', census.perFile[0].names, [...EXPECTED_NAMES_IN_PORTRAITS]);
L.check('6g  portrait-remix.js imports its three names', census.perFile[1].names, [...EXPECTED_NAMES_IN_REMIX]);
L.check('6h  the two import lists UNION to exactly the five exports',
  census.union, [...EXPECTED_EXPORTS]);
L.check('6i  portraits.js reaches in on 7 lines', census.perFile[0].sites, EXPECTED_SITES_IN_PORTRAITS);
L.check('6j  portrait-remix.js reaches in on 3 lines', census.perFile[1].sites, EXPECTED_SITES_IN_REMIX);
L.check('6k  portraits.js reaches in for 7 identifier occurrences', census.perFile[0].occurrences, EXPECTED_OCCURRENCES_IN_PORTRAITS);
L.check('6l  portrait-remix.js reaches in for 4 occurrences (:1262 reaches in twice on one line)',
  census.perFile[1].occurrences, EXPECTED_OCCURRENCES_IN_REMIX);
// The two conserved sums. These literals are UNCHANGED from before A01a-2 —
// that is the point. 7 + 3 = 10 and 7 + 4 = 11; the extraction moved reach-in
// points between files without creating or destroying one.
L.check('6m  reach-in SITES across all consumers still total ten (7 + 3 — conserved across the A01a-2 seam)',
  census.sites, EXPECTED_REACH_IN_SITES);
L.check('6n  reach-in OCCURRENCES across all consumers still total eleven (7 + 4 — conserved)',
  census.occurrences, EXPECTED_REACH_IN_OCCURRENCES);

/* 6o/6p — S-3 / D67, the property pinned the RIGHT WAY ROUND.
 *
 * 6i/6k above are worth exactly as much as the stripper under them. Until
 * QA-05 that stripper was a pair of regexes with no string state; it read
 * the `//` line comments inside portraits.js's GLSL TEMPLATE LITERALS as
 * JavaScript comments and blanked them, which happened to give 7 — the
 * right answer for the wrong reason. A correct JS stripper leaves shader
 * text standing, and the census then reported 10, counting prose.
 *
 * So both readings are asserted. 6o names the three shader lines that must
 * NOT be counted; 6p requires that a strings-KEPT strip does see them, so
 * 6o cannot go green by the census going blind. If someone reverts
 * countReachIn to a string-blind stripper, or drops blankStrings, one of
 * these two goes red and says which. */
/* CONVERTED 2026-08-25 from `file :: line` to `file :: text` (D93).
 *
 * HISTORY. The set was a literal — [726, 730, 834], then hand-re-baselined to
 * [726, 730, 850], then red a third time when portraits.js absorbed ~452 lines
 * of legitimate work. Nothing about the SUBJECT regressed on any of those
 * occasions; the prose sat where it always had and said what it always said.
 * The pin was keyed on the one property of it that is guaranteed to move.
 * CONTRIBUTING.md: "a pin re-baselined in the same commit as the change it is
 * supposed to police is a conversion order on the spot — the pin did not fail,
 * it complied." A second hand-re-baseline is that, so this is the conversion.
 *
 * WHY TEXT AND NOT THE PARSE THE OLD NOTE POINTED AT. That note ruled out the
 * cheap derivation — "in the strings-kept reading and not in the strings-
 * blanked one" — because it is the definition of what 6o asserts, and named a
 * parse of the template literal's EXTENT as the honest route. The extent route
 * was tried and rejected here for the SAME reason one level down: a set built
 * from "`//` prose lying inside a shader template literal" is a set every one
 * of whose members is inside a string, and "inside a string" is precisely the
 * property that makes blankStrings blank it. 6o would then be unfalsifiable by
 * any change to portraits.js — only a stripper regression could redden it, and
 * that half is already 6p's job. Extent-keying buys faithfulness to the note at
 * the cost of half of 6o's service life.
 *
 * Text-keying costs nothing and keeps both halves live. The prose CONTENT is
 * stable; only its position moves. Resolve position at run time, and the pin
 * asks for a human exactly when someone edits the prose — which is when a human
 * should in fact look, because that is when the census's reading of these lines
 * can genuinely change.
 *
 * THE ANCHORS STOP SHORT OF THE IDENTIFIER, deliberately. Each fragment below
 * ends just before the `HOVER_GRADE` / `PHOTO_GRADE` that follows it in the
 * comment. That is load-bearing for 6p: an edit that strips the reach-in name
 * out of the shader prose still RESOLVES, so 6p reports two lines of three and
 * goes red naming the reading that changed — rather than failing to resolve and
 * dying in the precondition, which would say much less.
 *
 * NOT ENGINE 1. Both sides of 6p are derived from portraits.js, but by two
 * independent readings: the expected side is a raw-text search for prose that
 * carries no identifier, the actual side is an identifier scan over stripped
 * source. Neither can drag the other along — which is what the mutant proofs in
 * this order's evidence directory demonstrate.
 *
 * CARDINALITY is a precondition throw, not a check: the suite's check count is
 * itself pinned (EXPECTED_CHECKS below), and this file already uses the throw
 * idiom for anchor integrity at :468 and :1028, where D57's sentinel turns it
 * into a loud FAIL line and a non-zero exit. Without it a trimmed anchor list
 * would degrade 6p to `[] === []` — vacuous in the other direction. */
const GLSL_PROSE_ANCHORS = [
  'THE HOVER GRADE (2026-08-18) — a crossfade to the',
  'MORE amber than doing nothing — see',
  'the cover with the light. See',
];
const EXPECTED_GLSL_PROSE_LINES = 3;
/** Resolve one prose anchor to the single line of `src` that carries it.
 *  Zero matches (the prose was deleted) and two (it was duplicated) are both
 *  "a human must look", and neither may quietly become a line number. */
const resolveProseLine = (src, anchor) => {
  const hits = src.split('\n')
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => line.includes(anchor))
    .map(([i]) => i);
  if (hits.length !== 1) {
    throw new Error(`anchors no longer match source: ${PORTRAITS_REL} has ${hits.length} lines`
      + ` containing ${JSON.stringify(anchor)}, expected exactly 1`);
  }
  return hits[0];
};
const GLSL_PROSE_LINES = [...new Set(
  GLSL_PROSE_ANCHORS.map((a) => resolveProseLine(portraitsSource, a)),
)].sort((a, b) => a - b);
if (GLSL_PROSE_LINES.length !== EXPECTED_GLSL_PROSE_LINES) {
  throw new Error(`the GLSL prose pin resolved ${GLSL_PROSE_LINES.length} distinct lines,`
    + ` expected ${EXPECTED_GLSL_PROSE_LINES} — a short or empty set makes 6p vacuous`);
}
const reachInLines = (src, opts) => stripComments(src, opts).split('\n')
  .map((line, i) => [i + 1, line])
  .filter(([, line]) => !/^\s*import\s/.test(line)
    && REACH_IN_NAMES.some((n) => new RegExp(`\\b${n}\\b`).test(line)))
  .map(([i]) => i);
L.check('6o  the reach-in census does NOT count the three GLSL comment lines in portraits.js shader text',
  reachInLines(portraitsSource, { blankStrings: true }).filter((l) => GLSL_PROSE_LINES.includes(l)), []);
L.check('6p  ...and they are genuinely there — a strings-KEPT strip sees all three, so 6o is not a blind zero',
  reachInLines(portraitsSource).filter((l) => GLSL_PROSE_LINES.includes(l)), GLSL_PROSE_LINES);

// --- 7. the deliberate two-line duplication ------------------------------
// decision.md §3 and the ledger's A01 acceptance entry both record this as a
// DECISION. Pinned on both sides so a later "dedup" is a red check, not a
// silent behaviour change — and so the decision is discoverable mechanically.
L.check('7a  portrait-paint.js declares its own TAU', countLeafAliases(paintSource).tau, 1);
L.check('7b  portrait-paint.js declares its own clamp', countLeafAliases(paintSource).clamp, 1);
L.check('7c  portraits.js keeps its TAU (2 factory sites: :1064, :1615 pre-move)', countLeafAliases(portraitsSource).tau, 1);
L.check('7d  portraits.js keeps its clamp (4 factory sites)', countLeafAliases(portraitsSource).clamp, 1);

/* F-3 — the suite's own check count, pinned to a literal.
 *
 * `createLedger` has always exposed `count`, and nothing read it. That is the
 * D45 shape aimed at the suite rather than at a loop inside it: a coordinated
 * fixture trim drops both the checks and the total, and "49/49 passed, exit 0"
 * looks exactly like "53/53 passed, exit 0" to everything downstream — CI, a
 * reviewer skimming, and the operator. `EXPECTED_MUTANTS` got this treatment in
 * the first pass and the suite's own tally did not; the omission is the same
 * one twice.
 *
 * Asserted OUTSIDE the ledger, deliberately: a check that counts the checks
 * cannot be one of them without pinning its own arithmetic. */
// QA-05 added 6o/6p (S-3 / D67), so the pin moves 60 -> 62. A legitimate
// addition is a visible row in the diff; that is what this pin is for.
// PIN-C8 retired 5b and 5c — measured unable to fail while 5a passed, in
// 1,764 of 1,764 mutants — so the pin moves 62 -> 60. A legitimate REMOVAL is
// a visible row in the diff too, and this is the row that makes it one.
const EXPECTED_CHECKS = 62;
const checkCountOk = L.count === EXPECTED_CHECKS;
if (!checkCountOk) {
  console.log(`\n  CHECK-COUNT MISMATCH — the suite pins ${EXPECTED_CHECKS} checks and ran ${L.count}.`);
  console.log('  A trimmed fixture set drops checks and the total together; the pin is what tells them apart.');
}

REPORTED = true;   // D57: past this line the run has produced a report
const mainFailures = L.report();
console.log(`  check-count pin: ${checkCountOk ? 'PASS' : 'FAIL'} — ${L.count}/${EXPECTED_CHECKS}`);

/* ==================================================================== *
 * --prove-failure — targeted mutants, each fed to the one check built    *
 * to catch it, PLUS the D44 comment-aware literal-predicate scan, in one *
 * invocation, both failing the exit code.                                *
 * ==================================================================== */
if (process.argv.includes('--prove-failure')) {
  // The sweep's own cardinality, pinned. A sweep that silently ran fewer
  // mutants than it advertises is the D45 shape one level up — "a check that
  // has never run over its subject is not evidence about its subject" — and a
  // hand-maintained header count is exactly how that goes unnoticed.
  const EXPECTED_MUTANTS = 23;   // PIN-C8: +m17/m18/m19, check 5's first mutants
  console.log(`\n--prove-failure — ${EXPECTED_MUTANTS} mutants, each fed to the one check built to catch it`);
  let bad = 0;
  let run = 0;

  const prove = async (id, what, goodValue, mutantValuePromise) => {
    run++;
    const mutantValue = await mutantValuePromise;
    const g = JSON.stringify(goodValue);
    const m = JSON.stringify(mutantValue);
    if (m !== g) {
      console.log(`  PROVED     ${id}  ${what}`);
      console.log(`             good: ${g}   mutant: ${m}  -> the real check (asserting === good) would FAIL here`);
    } else {
      bad++;
      console.log(`  TAUTOLOGY  ${id}  ${what} — the mutant produced the SAME value as good code. This check cannot fail.`);
    }
  };

  /** Anchor-checked string substitution. Per qa-01/patterns.md, a perturbation
   *  keyed to source anchors must THROW when the anchor stops matching, or a
   *  silently-inert mutant reports as a proved check. */
  const mutate = (src, id, pairs) => {
    let out = src;
    for (const [from, to] of pairs) {
      const moved = out.replace(from, to);
      if (moved === out) throw new Error(`anchors no longer match source (mutant ${id}): ${JSON.stringify(from)}`);
      out = moved;
    }
    return out;
  };

  const PAINT_SRC = readFromWorkingTree(PAINT_REL);
  let mutantSeq = 0;
  const loadMutant = (source, id) => {
    const rel = `journey/chapters/owned/__mutant_${id}_${mutantSeq++}.js`;
    return loadTree({
      read: (r) => (r === rel ? source : readFromWorkingTree(r)),
      entryRel: rel,
      tag: `mutant-${id}`,
    });
  };
  const cellOf = async (source, id, cellName) => {
    const r = paintOrSentinel(await loadMutant(source, id));
    return (r.byName[cellName] || { digest: '<not painted>' }).digest;
  };

  // m1 — the resting grade's amber strength. Caught by every resting photo
  // cell's digest AND by check 3a's literal grade pin.
  await prove('m1', 'PHOTO_GRADE.amber 0.64 -> 0.65 must move a resting photo digest (2)',
    PRE_MOVE['photo/rest/exposure<1/no-mirror/origin-cell'].digest,
    cellOf(mutate(PAINT_SRC, 'm1', [['  amber: 0.64,', '  amber: 0.65,']]), 'm1', 'photo/rest/exposure<1/no-mirror/origin-cell'));

  // m2 — drawEmbedEdge's 88 ember arcs. The shared cell effect: every one of
  // the twelve cells runs it, so this is the mutant that proves the digests
  // are sensitive to the THREE relocated helpers, not only to the painters.
  await prove('m2', 'drawEmbedEdge 88 arcs -> 87 must move a BUST digest (2) — the shared helpers moved too',
    PRE_MOVE['bust/seed-131/origin-cell'].digest,
    cellOf(mutate(PAINT_SRC, 'm2', [['for (let k = 0; k < 88; k++)', 'for (let k = 0; k < 87; k++)']]), 'm2', 'bust/seed-131/origin-cell'));

  // m3 — THE LOAD-BEARING ONE. decision.md's central claim is that no seeded
  // stream crosses this seam: each painter opens its own H.rng from a scalar
  // its caller supplies. This mutant perturbs drawPhotoCell's stream seeding
  // by one and nothing else. If the digest did not move, the transcript would
  // not be observing the stream at all and every RNG claim here would be
  // unevidenced.
  await prove('m3', 'drawPhotoCell H.rng seeding (seed*3319+811 -> +812) must move its digest (2) — the RNG claim',
    PRE_MOVE['photo/rest/exposure<1/no-mirror/origin-cell'].digest,
    cellOf(mutate(PAINT_SRC, 'm3', [['H.rng(((seed * 3319 + 811) | 0) >>> 0)', 'H.rng(((seed * 3319 + 812) | 0) >>> 0)']]), 'm3', 'photo/rest/exposure<1/no-mirror/origin-cell'));

  // m4 — softMask's DEFAULT feather, which only the busts and glyphs take
  // (drawPhotoCell always passes G.feather explicitly). Proves the bust/anon
  // fixtures are exercising a path the photo fixtures do not.
  await prove('m4', 'softMask default feather 0.86 -> 0.85 must move an ANON digest (2)',
    PRE_MOVE['anon/seed-11/origin-cell'].digest,
    cellOf(mutate(PAINT_SRC, 'm4', [['R, feather = 0.86)', 'R, feather = 0.85)']]), 'm4', 'anon/seed-11/origin-cell'));

  // m5 — HOVER_GRADE.level, reached ONLY by the two hover fixtures. Without
  // this mutant, nothing would show that the hover cells take a different
  // branch from the resting ones rather than merely having different seeds.
  await prove('m5', 'HOVER_GRADE.level 0.786 -> 0.8 must move a HOVER photo digest (2)',
    PRE_MOVE['photo/hover/level-trim/veil-0/hover-cell'].digest,
    cellOf(mutate(PAINT_SRC, 'm5', [['  level: 0.786,', '  level: 0.8,']]), 'm5', 'photo/hover/level-trim/veil-0/hover-cell'));

  // m6 — grainAndGrade's 340-speckle loop, scaled by veil. Op COUNT, not
  // digest: proves the op-count half of each pin is a live comparison and not
  // decoration riding along on the digest.
  await prove('m6', 'grainAndGrade 340 speckles -> 339 must move a bust OP COUNT (2)',
    PRE_MOVE['bust/seed-131/origin-cell'].ops,
    (async () => {
      const r = paintOrSentinel(await loadMutant(mutate(PAINT_SRC, 'm6', [['for (let k = 0; k < 340 * veil; k++)', 'for (let k = 0; k < 339 * veil; k++)']]), 'm6'));
      return (r.byName['bust/seed-131/origin-cell'] || { ops: -1 }).ops;
    })());

  /* m7 — RE-LABELLED (F-2). This mutant was first shipped claiming to prove
   * the cardinality pins, labelled `(1d/2)`. Applied, `1b`-`1f` all stay
   * GREEN: `paintAll` counts painter INVOCATIONS, and drawAnonGlyph is still
   * invoked three times — it just draws nothing. The only assertion that moves
   * is check 2's op count. That is D50's shape one level over: a mutant must
   * perturb the exact quantity its target assertion reads, and this one never
   * touched the quantity `1d` reads.
   *
   * So m7 now claims only what it proves — check 2's op-count half — and the
   * cardinality pins get their own axis-correct mutants at m11-m15, which
   * corrupt the FIXTURE SET rather than the painter. */
  await prove('m7', 'a painter that early-returns must move the anon OP COUNT off its pin (check 2 only — NOT 1b-1f, see m11-m15)',
    PRE_MOVE['anon/seed-11/origin-cell'].ops,
    (async () => {
      const r = paintOrSentinel(await loadMutant(mutate(PAINT_SRC, 'm7', [
        ['function drawAnonGlyph(g, ox, oy, CELL, seed) {', 'function drawAnonGlyph(g, ox, oy, CELL, seed) {\n  if (true) return;'],
      ]), 'm7'));
      return (r.byName['anon/seed-11/origin-cell'] || { ops: -1 }).ops;
    })());

  // m8 — the export surface. Ten symbols are meant to stay private; this
  // publishes one and check 6c must see it.
  await prove('m8', 'exporting a private helper must move the export census (6c)',
    [...EXPECTED_EXPORTS],
    (async () => Object.keys(await loadMutant(mutate(PAINT_SRC, 'm8', [
      ['export { PHOTO_GRADE, HOVER_GRADE, drawPhotoCell, drawBust, drawAnonGlyph };',
        'export { PHOTO_GRADE, HOVER_GRADE, drawPhotoCell, drawBust, drawAnonGlyph, softMask };'],
    ]), 'm8')).sort())());

  // m9 — the census functions are pure in their source argument, so the sweep
  // feeds them mutated TEXT directly. This is R03's countAttachmentSites
  // pattern: the replacement for an assertion that had no actual to corrupt.
  await prove('m9a', 'a painter left behind in portraits.js must move the declaration census (6b)',
    EXPECTED_PAINTER_DECLS_IN_PORTRAITS,
    countPainterDeclarations(mutate(portraitsSource, 'm9a', [
      ['const TAU = Math.PI * 2;', 'function softMask() {}\nconst TAU = Math.PI * 2;'],
    ])));
  await prove('m9b', 'an eighth reach-in point in portraits.js must move its per-file pin (6i)',
    EXPECTED_SITES_IN_PORTRAITS,
    countReachIn(mutate(portraitsSource, 'm9b', [
      ['const TAU = Math.PI * 2;', 'const _extra = PHOTO_GRADE.unify;\nconst TAU = Math.PI * 2;'],
    ])).sites);

  /* m9d/m9e — the CONSERVED SUMS need mutants of their own, or 6m/6n are two
   * pins nothing can move. m9d adds a reach-in point (the sum rises); m9e is
   * the one that matters — it MOVES a reach-in point from one consumer to the
   * other, leaving the sum at ten. That is the case a total-only pin cannot
   * see, and it is why 6i-6l pin the parts as well. m9e therefore proves the
   * PARTS catch what the SUM cannot. */
  await prove('m9d', 'an added reach-in point must move the conserved SITES sum (6m)',
    EXPECTED_REACH_IN_SITES,
    paintConsumerCensus([
      { rel: PORTRAITS_REL, src: mutate(portraitsSource, 'm9d', [['const TAU = Math.PI * 2;', 'const _extra = PHOTO_GRADE.unify;\nconst TAU = Math.PI * 2;']]) },
      { rel: REMIX_REL, src: remixSource },
    ]).sites);
  await prove('m9e', 'MOVING a reach-in point between consumers must move a PART pin (6i) while the SUM (6m) stays ten',
    { sites: EXPECTED_SITES_IN_PORTRAITS, sum: EXPECTED_REACH_IN_SITES },
    (() => {
      // delete one reach-in line from portraits.js, add one to remix: 6+4=10
      const shifted = paintConsumerCensus([
        { rel: PORTRAITS_REL, src: mutate(portraitsSource, 'm9e-a', [['      uSolid: { value: PHOTO_GRADE.hoverSolid },\n', '']]) },
        { rel: REMIX_REL, src: mutate(portraitsSource === remixSource ? remixSource : remixSource, 'm9e-b', [['import { HOVER_GRADE, drawPhotoCell, drawBust }', 'const _shim = PHOTO_GRADE;\nimport { HOVER_GRADE, drawPhotoCell, drawBust }']]) },
      ]);
      return { sites: shifted.perFile[0].sites, sum: shifted.sites };
    })());
  await prove('m9c', 'deleting portrait-paint.js\'s own TAU must move the duplication pin (7a)',
    1,
    countLeafAliases(mutate(PAINT_SRC, 'm9c', [['const TAU = Math.PI * 2;', '']])).tau);

  // m10 — THE PROVENANCE AXIS (D44 addendum). The chooser is fed a portraits.js
  // whose painter import names a DIFFERENT module. Nothing about any VALUE is
  // corrupted; what changes is WHICH MODULE IS SUPPLIED. A bare `a !== b` over
  // two namespaces would have been satisfied by construction here, and a sweep
  // corrupting an actual would have been corrupting an axis the claim never
  // rested on.
  await prove('m10', 'pointing portraits.js\'s painter import at another module must move the digest (1a/2) — provenance, not value',
    PRE_MOVE['photo/rest/exposure<1/no-mirror/origin-cell'].digest,
    (async () => {
      const decoyed = mutate(portraitsSource, 'm10', [[EXPECTED_IMPORT_SPECIFIER, './portrait-atlas.js']]);
      const r = paintOrSentinel(await paintersChosenBy(decoyed));
      return (r.byName['photo/rest/exposure<1/no-mirror/origin-cell'] || { digest: '<not painted>' }).digest;
    })());

  /* --- m11-m15: the cardinality pins, on the axis they actually read ------
   *
   * F-2 / D50. Checks 1b-1f read how many fixtures were painted, and that
   * number lives in this suite, not in portrait-paint.js — so no mutation of
   * the subject can move it and, before this repair, four of the five had no
   * mutant at all. The corruption has to target WHICH FIXTURE SET IS SUPPLIED,
   * which is the D44-addendum chooser move applied to cardinality instead of
   * provenance. Emptying a bucket is D45's founding scenario made executable:
   * a member loop that ships green over zero items. */
  await prove('m11', 'an emptied photo fixture bucket must move the photo invocation pin (1b) — D45',
    EXPECTED_PHOTO_CELLS,
    paintOrSentinel(painters, fixturesFor({ bucket: 'photo', keep: 0 })).counts.photo);
  await prove('m12', 'an emptied bust fixture bucket must move the bust invocation pin (1c) — D45',
    EXPECTED_BUST_CELLS,
    paintOrSentinel(painters, fixturesFor({ bucket: 'bust', keep: 0 })).counts.bust);
  await prove('m13', 'an emptied anon fixture bucket must move the anon invocation pin (1d) — D45',
    EXPECTED_ANON_CELLS,
    paintOrSentinel(painters, fixturesFor({ bucket: 'anon', keep: 0 })).counts.anon);
  await prove('m14', 'dropping ONE photo fixture must move the total invocation pin (1e)',
    EXPECTED_TOTAL_CELLS,
    paintOrSentinel(painters, fixturesFor({ bucket: 'photo', keep: 5 })).counts.total);
  await prove('m15', 'dropping ONE anon fixture must move the painted-name set (1f)',
    [...PRE_MOVE_CELL_NAMES].sort(),
    Object.keys(paintOrSentinel(painters, fixturesFor({ bucket: 'anon', keep: 2 })).byName).sort());

  /* m16 — F-5. The control instrument in section 4 used to call the painter
   * bare, so the single most likely real failure — `const TAU` deleted from
   * portrait-paint.js, which check 7a exists to catch — killed the process in
   * section 4 with an uncaught ReferenceError, three sections before the
   * ledger reported. Exit code 1 either way, so the guarantee held; but the
   * operator got a stack trace instead of a red line naming the cause, and 7a
   * never fired. This mutant loads a TAU-less module and runs the control
   * against it: the value must MOVE (proving the control is live) and it must
   * arrive as a sentinel rather than as an exception (proving the guard). */
  await prove('m16', 'a TAU-less portrait-paint.js must move the control digest and arrive as a SENTINEL, not a crash (4a-4e / 7a)',
    CONTROL_TARGET,
    (async () => {
      const tauLess = await loadMutant(mutate(PAINT_SRC, 'm16', [['const TAU = Math.PI * 2;\n', '']]), 'm16');
      const got = digestPhotoCellWith((s) => s, tauLess);
      if (!got.startsWith('<threw:')) throw new Error(`m16 expected a sentinel, got ${got}`);
      return got;
    })());

  /* --- m17/m18: PIN-C8. Check 5 had NO mutant at all before this order ----
   *
   * Three assertions over 29,143 bytes — the largest pin surface in the suite
   * — and the sweep never drove any of them. That is D58's contract failing
   * quietly in a suite that keeps its coverage by hand rather than through
   * the registry's `uncovered` list. Both mutants below target the converted
   * 5a on the axis it actually reads, and both are cases chosen because the
   * RETIRED window reported them green (m17) or because no behavioural digest
   * can see them (m18). */
  const manifestOf = (src) => {
    const s = src.indexOf(MOVED_BLOCK_START);
    const e = s === -1 ? -1 : src.indexOf(MOVED_BLOCK_END, s);
    if (s === -1 || e === -1) throw new Error('mutant anchor: the block extent is no longer resolvable');
    return blockDeclManifest(src.slice(s, e + 1));
  };

  // m17 — the retired window's measured blind spot, made a mutant. Appending
  // a declaration after the block's last line fell outside a fixed 29,143
  // bytes; it does not fall outside a text anchor.
  await prove('m17', 'a sixteenth declaration appended after the block\'s last line must move the manifest (5a) — the retired 29,143-byte window reported this GREEN',
    [...MOVED_BLOCK_DECLS],
    manifestOf(mutate(PAINT_SRC, 'm17', [
      ['\nexport { PHOTO_GRADE', '\nconst LEAK = new Array(1e7).fill(0);\n\nexport { PHOTO_GRADE'],
    ])));

  // m18 — the axis the manifest adds over section 2. An added parameter
  // changes a painter's CONTRACT and changes no canvas op, so every one of
  // the twenty-four transcript pins stays green and only 5a moves.
  await prove('m18', 'a painter whose parameter list changed must move the manifest (5a) — a contract change no transcript digest can see',
    [...MOVED_BLOCK_DECLS],
    manifestOf(mutate(PAINT_SRC, 'm18', [
      ['function drawBust(g, ox, oy, CELL, seed) {', 'function drawBust(g, ox, oy, CELL, seed, opts) {'],
    ])));

  // m19 — the other half of the retired window's blind spot, on 5-BAL's axis.
  // This is the mutant whose subject does not parse; the sha256/line/byte
  // triple reported it green on all three rows.
  await prove('m19', 'a duplicated closing brace on the block\'s last line must move the brace balance (5-BAL) — the retired 29,143-byte window reported this GREEN too, and the file it produces is a SyntaxError',
    0,
    (() => {
      const src = mutate(PAINT_SRC, 'm19', [['}\n\nexport { PHOTO_GRADE', '}\n}\n\nexport { PHOTO_GRADE']]);
      const s = src.indexOf(MOVED_BLOCK_START);
      const e = s === -1 ? -1 : src.indexOf(MOVED_BLOCK_END, s);
      if (s === -1 || e === -1) throw new Error('mutant anchor: the block extent is no longer resolvable');
      const c = stripComments(src.slice(s, e + 1), { blankStrings: true });
      let n = 0;
      for (const ch of c) { if (ch === '{') n++; else if (ch === '}') n--; }
      return n;
    })());

  /* ================================================================ *
   * D44 — the literal-predicate scan. A --prove-failure sweep works by *
   * corrupting each COMPARISON SITE in turn; a bare literal predicate  *
   * has no actual to corrupt, so it is invisible to the sweep BY       *
   * CONSTRUCTION. R03's check 2h was literally L.check('...', true) in *
   * a suite that had just reported 9/9 on its own sweep. QA-01's       *
   * tree-wide scan found zero hits, but 2h post-dated it — so the scan *
   * lives in the suite, permanently, not in a one-time audit.          *
   * R03's implementation is the reference: comment-aware (so a comment *
   * MENTIONING the pattern — including this docstring — is not a false *
   * positive), read live at run time, line numbers computed against    *
   * the stripped text but reported text taken from the ORIGINAL source *
   * so what prints is real code rather than a paraphrase.              *
   * ================================================================ */
  console.log('\nliteral-predicate scan — an assertion whose predicate is a constant is unfalsifiable by construction');
  const scanProblems = [];
  const say = (ok, id, what, detail) => {
    if (!ok) scanProblems.push(`${id} ${what}`);
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${id}  ${what}${detail ? ' — ' + detail : ''}`);
  };

  // PC-3 — the scanner is exercised against hand-built positives and negatives
  // before it is trusted over real source. D45 applies to the fixture table
  // itself: its iteration count is pinned to a non-zero literal, so an empty
  // table cannot pass silently, and the number of rows that MUST yield a hit
  // is pinned too, so a scanner that matched nothing at all would fail here
  // rather than reporting a clean sweep.
  let fixtureRuns = 0, fixtureAsExpected = 0, fixtureYielding = 0;
  for (const [id, what, snippet, want] of SCAN_FIXTURES) {
    fixtureRuns++;
    const got = scanLiteralPredicateText(snippet).hits.length;
    if (got === want) fixtureAsExpected++;
    else console.log(`    FIXTURE MISS ${id} ${what} — expected ${want} hit(s), scanner returned ${got}`);
    if (got > 0) fixtureYielding++;
  }
  let lsRuns = 0, lsAsExpected = 0;
  for (const [id, what, snippet, want] of LEDGER_SHAPE_FIXTURES) {
    lsRuns++;
    const got = scanLiteralPredicateText(snippet).hits.length;
    if (got === want) lsAsExpected++;
    else console.log(`    LEDGER-SHAPE MISS ${id} ${what} — expected ${want} hit(s), scanner returned ${got}`);
  }
  say(lsRuns === LEDGER_SHAPE_ROWS, 'PC-4a', 'the ledger-shape collision fixtures ran over every row (iteration pin)', `ran ${lsRuns}, expected ${LEDGER_SHAPE_ROWS}`);
  say(lsAsExpected === LEDGER_SHAPE_ROWS, 'PC-4b', 'this ledger scans CLEAN and C04\'s scans as a hit — the pattern is safe HERE and not there', `${lsAsExpected}/${LEDGER_SHAPE_ROWS}`);

  say(fixtureRuns === 27, 'PC-3a', 'the synthetic fixture table ran over every row (iteration pin)', `ran ${fixtureRuns}, expected 27`);
  say(fixtureAsExpected === 27, 'PC-3b', 'every fixture row returned exactly the hit count it was built for', `${fixtureAsExpected}/27`);
  say(fixtureYielding === 17, 'PC-3c', 'the scanner returned NON-ZERO on every row manufactured to be caught', `${fixtureYielding}, expected 17`);

  // PC-2 — the files-read pin. INPUTS, not matches.
  const scanInputs = [fileURLToPath(import.meta.url)];
  const scanTexts = scanInputs.map((p) => readFileSync(p, 'utf8'));
  say(scanTexts.length === OWN_SCAN_INPUTS, 'PC-2a', `the scan read exactly ${OWN_SCAN_INPUTS} input file (files-read pin)`, `read ${scanTexts.length}`);
  say(scanTexts[0].length > 0, 'PC-2b', 'the input file read back non-empty', `${scanTexts[0].length} bytes`);

  const ownScan = scanLiteralPredicateText(scanTexts[0]);
  // PC-1 — the positive control. Zero here means the scan is reading the wrong
  // bytes, or the assertion helper was renamed, NOT that the file is clean.
  // This is the control whose absence let a `ledger.check('…', true, true)`
  // tautology ship at 54/54 with "scan: PASS — 0 hits" and exit 0.
  say(ownScan.sites === OWN_SCAN_SITES, 'PC-1', 'the scan pattern still sees this file\'s assertion call sites (census)', `${ownScan.sites}, expected ${OWN_SCAN_SITES}`);

  const literalHits = ownScan.hits;
  for (const h of literalHits) console.log(`    HIT  tools/test-portrait-paint.mjs:${h.lineNo}  [${h.shape}]  ${h.text}`);
  say(literalHits.length === 0, 'D44', 'literal-predicate scan: 0 unfalsifiable assertions in this file',
    `${literalHits.length} hit(s) across ${ownScan.lines} lines, ${ownScan.sites} assertion sites`);

  const miscount = run !== EXPECTED_MUTANTS;
  if (miscount) console.log(`\n  MISCOUNT — the sweep advertises ${EXPECTED_MUTANTS} mutants and ran ${run}.`);
  console.log(`\n--prove-failure: ${bad === 0 && !miscount ? 'PASS' : 'FAIL'} — ${run - bad}/${run} assertions correctly caught, ${run}/${EXPECTED_MUTANTS} mutants run`);
  SWEEP_REPORTED = true;   // D57: the sweep has produced its summary
  console.log(`literal-predicate scan: ${scanProblems.length === 0 ? 'PASS' : 'FAIL'} — ${literalHits.length} hit(s), ${scanProblems.length} control failure(s)`);
  if (bad > 0 || miscount || scanProblems.length > 0) process.exitCode = 1;
}

if ((mainFailures > 0 || !checkCountOk) && process.exitCode !== 1) process.exitCode = 1;
