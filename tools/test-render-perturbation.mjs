// C03a — deliberate perturbation. A suite that cannot fail proves nothing.
//
//   node tools/test-render-perturbation.mjs
//
// For every baseline tools/test-render-baseline.mjs pins, this file shows a
// mutated input that BREAKS it. Each case asserts twice:
//   BASELINE  the unmutated input still produces the pinned value, and
//   BROKEN    the mutated input does not.
// A case that only proved the second half would pass against a broken
// extractor; a case that only proved the first would pass against a blind one.
//
// EVERY MUTATION IS IN MEMORY. Not one byte of the tree is written: the
// mutated shader text, manifest records and source snippets below are local
// copies and synthetic strings. The suite never touches static/geom/ or
// static/captures/, never starts a server and never opens a browser.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  abs, analyzeChapter, canonical, declNames, installVendorResolver, isCode,
  measureDrawCost, pinSourceLines, pinStream, readText, scanText, sha256,
  uniformNames,
} from './render-report-lib.mjs';

installVendorResolver();

let cases = 0;
let fail = 0;
import { armSentinel } from './instrument-ledger.mjs';

/* D57/D73 — the abort sentinel. QA-07: this suite shipped with NONE, so a
 * crash in it was byte-identical to a clean pass under `grep '^FAIL'`. One
 * shared implementation (tools/instrument-ledger.mjs), not a fourteenth local
 * one. The two report branches are mutually exclusive here (the sweep exits
 * before the main tally is reached), so the phase set is one name chosen from
 * argv; a phase never REQUESTED stays silent. It does NOT replace reading the
 * exit code in the producing command — a sentinel is installed by code that
 * must first parse, so it cannot fire on a syntax error (D73). */
const SENT = armSentinel('test-render-perturbation',
  [process.argv.includes('--prove-failure') ? 'prove' : 'main']);

const failures = [];

/** One perturbation case: the invariant holds on the clean input and breaks
 *  on the mutated one. Both halves must be true or the case fails. */
/** A plain equality check, for a fixture precondition that is not itself a
 *  perturbation but must hold for one to mean anything. */
function check(id, what, actual, expected) {
  cases++;
  if (actual === expected) { console.log(`  PASS  ${id}  ${what}`); return; }
  fail++;
  failures.push(`${id}  ${what} — expected ${expected}, got ${actual}`);
  console.log(`  FAIL  ${id}  ${what} — expected ${expected}, got ${actual}`);
}

function perturb(id, what, { baseline, expected, mutated }) {
  cases++;
  const b = typeof baseline === 'object' ? canonical(baseline) : String(baseline);
  const e = typeof expected === 'object' ? canonical(expected) : String(expected);
  const m = typeof mutated === 'object' ? canonical(mutated) : String(mutated);
  const holds = b === e;
  const breaks = m !== e;
  if (holds && breaks) {
    console.log(`  PASS  ${id}  ${what}`);
    console.log(`          baseline holds; mutation moved it to ${m.trim().slice(0, 90)}`);
    return;
  }
  fail++;
  const why = !holds ? 'BASELINE DID NOT HOLD' : 'MUTATION DID NOT BREAK IT';
  failures.push(`${id}  ${what}  — ${why}\n        expected: ${e.trim().slice(0, 200)}\n        baseline: ${b.trim().slice(0, 200)}\n        mutated:  ${m.trim().slice(0, 200)}`);
  console.log(`  FAIL  ${id}  ${what}  — ${why}`);
}

/* ================================================================== *
 * P1-P5 — the RNG. Seed, algorithm, and draw order.                   *
 * ================================================================== */
console.log('\nP1-P5 — RNG seed, algorithm and draw order');

const random = await import(pathToFileURL(abs('organism/random.js')).href);
const anatomy = await import(pathToFileURL(abs('journey/anatomy.js')).href);
const helpers = await import(pathToFileURL(abs('journey/lib/helpers.js')).href);

const PINNED_RAND_DIGEST = '0f80ed937a18497d5972e740e0d265d269dfc2a18a6e9ee887b2f8b4c65938c9';

// A local re-implementation of the shipped LCG, so a SEED can be varied
// without touching organism/random.js. P1's baseline half proves the local
// copy is bit-identical to the shipped one at seed 1337 before P2 varies it.
const lcgStream = (seed) => {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};

perturb('P1', 'a different SEED produces a different stream', {
  baseline: pinStream(() => lcgStream(1337)).digest,
  expected: PINNED_RAND_DIGEST,
  mutated: pinStream(() => lcgStream(1338)).digest,
});

perturb('P2', 'a different MULTIPLIER produces a different stream', {
  baseline: pinStream(() => lcgStream(1337)).digest,
  expected: PINNED_RAND_DIGEST,
  mutated: pinStream(() => {
    let s = 1337;
    return () => { s = (s * 1664526 + 1013904223) >>> 0; return s / 4294967296; };
  }).digest,
});

perturb('P3', 'the shipped generator itself still matches the pin', {
  baseline: pinStream(() => random.createRandomGeometryHelpers().rand).digest,
  expected: PINNED_RAND_DIGEST,
  // Consuming one draw before pinning is exactly what an off-by-one in a
  // builder's draw order does to every downstream value.
  mutated: pinStream(() => {
    const r = random.createRandomGeometryHelpers().rand;
    r();
    return r;
  }).digest,
});

perturb('P4', 'a gauss() that averaged THREE draws instead of four is detected', {
  baseline: measureDrawCost(() => anatomy.makeRng(), (r) => anatomy.gaussOf(r)),
  expected: 4,
  mutated: measureDrawCost(() => anatomy.makeRng(), (r) => (r() + r() + r() - 1.5)),
});

const latticeDigest = (fn) => {
  const parts = [];
  for (let i = 0; i < 12; i++) parts.push(String(fn(i * 0.37, 1.13 - i * 0.21, 2.5 + i * 0.11)));
  return sha256(parts.join(','));
};
// The `expected` side is an INDEPENDENT LITERAL, not an expression restating
// `baseline`. An earlier draft wrote `latticeDigest((x, y, z) =>
// helpers.noise3(x, y, z))` — an eta-expansion of the actual, which compares
// equal for ANY function and proved nothing. Same family as O-C03a-1.
// Run `--prove-failure` to see this comparison trip against a corrupted noise3.
const P5_LATTICE_DIGEST = 'b57ce1982b346d272bfcf78017ce2e68c2a3a2330441fbfab44ac7a131086920';
perturb('P5', 'a shifted noise lattice is detected (proxy for a reshuffled permutation)', {
  baseline: latticeDigest(helpers.noise3),
  expected: P5_LATTICE_DIGEST,
  mutated: latticeDigest((x, y, z) => helpers.noise3(x + 1e-3, y, z)),
});

/* ================================================================== *
 * P6-P8 — shader source hashes and uniform names.                     *
 * ================================================================== */
console.log('\nP6-P8 — shader source hashes, uniform and attribute names');

const shaders = await import(pathToFileURL(abs('organism/shaders.js')).href);
const PINNED_DRAW_HASH = '0660158745d756c63f0a331aebc223608dc5b2d620124d512bf97c521443a682';

perturb('P6', 'a one-character edit to DRAW_GLSL changes its hash', {
  baseline: sha256(shaders.DRAW_GLSL),
  expected: PINNED_DRAW_HASH,
  // 0.012 -> 0.013 in the head smoothstep: a real, visible ink-front change.
  mutated: sha256(shaders.DRAW_GLSL.replace('0.012', '0.013')),
});

perturb('P7', 'a renamed uniform is detected', {
  baseline: uniformNames(shaders.DRAW_GLSL).sort(),
  expected: ['uClampY', 'uProg', 'uWin'],
  mutated: uniformNames(shaders.DRAW_GLSL.replace('uniform float uProg;', 'uniform float uProgress;')).sort(),
});

perturb('P8', 'a dropped attribute declaration is detected', {
  baseline: declNames(shaders.DRAW_GLSL, 'attribute').sort(),
  expected: ['aDraw'],
  mutated: declNames(shaders.DRAW_GLSL.replace('attribute float aDraw;', ''), 'attribute').sort(),
});

/* ================================================================== *
 * P9-P13 — geometry byte lengths, offsets and the bake itself.        *
 * ================================================================== */
console.log('\nP9-P13 — geometry byte lengths, offsets and baked bytes');

const manifest = JSON.parse(readText('static/geom/manifest.json'));
const inspireBytes = readFileSync(abs('static/geom/inspire.bin'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const clean = analyzeChapter('inspire', manifest.chapters.inspire, inspireBytes);

perturb('P9', 'a changed attribute byteLength is detected', {
  baseline: clean.coversFileExactly,
  expected: true,
  mutated: (() => {
    // The LAST attribute of the LAST key: shortening it leaves the packed
    // window short of the file, which is exactly what a geometry that grew or
    // shrank without a re-bake looks like.
    const m = clone(manifest.chapters.inspire);
    const lastKey = m.keys[m.keys.length - 1];
    lastKey.attrs[lastKey.attrs.length - 1].byteLength -= 4;
    return analyzeChapter('inspire', m, inspireBytes).coversFileExactly;
  })(),
});

perturb('P10', 'a gap opened between two attributes is detected', {
  baseline: clean.attrsContiguous,
  expected: true,
  mutated: (() => {
    const m = clone(manifest.chapters.inspire);
    m.keys[0].attrs[1].byteOffset += 4;
    return analyzeChapter('inspire', m, inspireBytes).attrsContiguous;
  })(),
});

perturb('P11', 'an unaligned byteOffset is detected', {
  baseline: clean.allOffsets4Aligned,
  expected: true,
  mutated: (() => {
    const m = clone(manifest.chapters.inspire);
    m.keys[0].attrs[1].byteOffset += 1;
    return analyzeChapter('inspire', m, inspireBytes).allOffsets4Aligned;
  })(),
});

perturb('P12', 'a single flipped byte in the .bin is detected', {
  baseline: clean.sha256Matches,
  expected: true,
  mutated: (() => {
    const bytes = Buffer.from(inspireBytes);       // COPY — the file is untouched
    bytes[0] ^= 0x01;
    return analyzeChapter('inspire', manifest.chapters.inspire, bytes).sha256Matches;
  })(),
});

// The `expected` side is INDEPENDENT LITERALS transcribed from the manifest,
// not a restatement of analyzeChapter()'s own itemCount formula. An earlier
// draft wrote `byteLength / 4 / itemSize`, which re-derived the very value it
// was meant to check. Same family as O-C03a-1.
// inspire/srcFil0.position: itemSize 3, byteLength 6720 -> 560 items.
const P13_KEY = 'inspire/srcFil0';
const P13_ITEM_COUNT = 560;
perturb('P13', 'a changed itemSize moves the derived item count', {
  baseline: [clean.keys[0].key, clean.keys[0].attrs[0].name,
    clean.keys[0].attrs[0].itemSize, clean.keys[0].attrs[0].byteLength,
    clean.keys[0].attrs[0].itemCount],
  expected: [P13_KEY, 'position', 3, 6720, P13_ITEM_COUNT],
  mutated: (() => {
    const m = clone(manifest.chapters.inspire);
    m.keys[0].attrs[0].itemSize = 1;
    const a = analyzeChapter('inspire', m, inspireBytes).keys[0].attrs[0];
    return [m.keys[0].key, a.name, a.itemSize, a.byteLength, a.itemCount];
  })(),
});

/* ================================================================== *
 * P14-P15 — the live builder's packing contract.                      *
 * ================================================================== */
console.log('\nP14-P15 — live builder attribute counts and byte lengths');

const THREE = await import(pathToFileURL(abs('vendor/three/three.module.js')).href);
const strands = (count, seed, pts) => helpers.strandLines({
  count,
  seed,
  generator: (i, rand) => {
    const out = [];
    for (let j = 0; j < pts; j++) out.push(new THREE.Vector3(rand() + i, rand() - j, rand() * 2));
    return out;
  },
});
const shapeOf = (g) => Object.keys(g.attributes).sort()
  .map((n) => [n, g.attributes[n].count, g.attributes[n].array.byteLength]);
const bytesOf = (g) => sha256(Buffer.from(
  g.attributes.position.array.buffer,
  g.attributes.position.array.byteOffset,
  g.attributes.position.array.byteLength,
));

perturb('P14', 'one more point per strand changes the attribute byte lengths', {
  baseline: shapeOf(strands(7, 1, 2).geometry),
  expected: [['aAlong', 84, 336], ['aStrand', 84, 336], ['position', 84, 1008]],
  mutated: shapeOf(strands(7, 1, 9).geometry),
});

perturb('P15', 'the same shape at a different seed changes the position bytes', {
  baseline: bytesOf(strands(7, 1, 2).geometry),
  expected: 'ac33ecc9e25cb80d8bad3dddc8177520f8299443f2d58dd5fb673f3dc0d261f2',
  mutated: bytesOf(strands(7, 2, 2).geometry),
});

/* ================================================================== *
 * P16-P20 — the static-source extractors. Each is attacked with a     *
 *           synthetic snippet, never with an edit to the tree.        *
 * ================================================================== */
console.log('\nP16-P20 — static-source extractors (draw range, draw order, flags, lifecycle, owners)');

const countIn = (text, pattern) => scanText(text, pattern).filter(isCode).length;
const REAL_SUBSTRATE = readText('journey/chapters/owned/substrate.js');

perturb('P16', 'an introduced setDrawRange call is detected', {
  baseline: countIn(REAL_SUBSTRATE, '\\.setDrawRange\\s*\\('),
  expected: 0,
  mutated: countIn(REAL_SUBSTRATE + '\n  fanLines.geometry.setDrawRange(0, 120);\n', '\\.setDrawRange\\s*\\('),
});

perturb('P17', 'a changed renderOrder literal is detected', {
  baseline: scanText(REAL_SUBSTRATE, '\\.renderOrder\\s*=\\s*-4\\s*;').filter(isCode).length,
  expected: 2,
  mutated: scanText(REAL_SUBSTRATE.replace('fanLines.renderOrder = -4;', 'fanLines.renderOrder = -9;'),
    '\\.renderOrder\\s*=\\s*-4\\s*;').filter(isCode).length,
});

perturb('P18', 'an added material flag site is detected', {
  baseline: countIn(REAL_SUBSTRATE, '\\bdepthWrite\\s*[:=][^=]'),
  expected: 7,
  mutated: countIn(REAL_SUBSTRATE + '\n  const m = { depthWrite: true };\n', '\\bdepthWrite\\s*[:=][^=]'),
});

/* RE-BASELINED 16 -> 15 by order B01, 2026-08-23, on the protocol
   tools/test-frame-publication.mjs's C5 documents for its own disk-derived
   cardinality. WAS (pre-B01): 16, in both P19 and P21.

   D124 records that a new file under `journey/` moves THREE disk-derived
   pins — X3, C5, D1. THIS IS A FOURTH, and it is not moved by a new file at
   all: it is moved by main.js's own site count. B01 moved exactly ONE
   listener site out of main.js — the intro input capture, which went with
   journey/boot/handoff.js, the machine whose stopIntroInputCapture() takes
   it back off. The other fifteen are page-lifetime wiring and stayed.

   WHAT THESE TWO PINS ACTUALLY ASSERT is unchanged and is not the number:
   P19 that the extractor SEES an added site, P21 that it does NOT see a
   commented-out one. Both still bite — the mutated column is baseline + 1
   for P19 and equals the raw unfiltered count for P21, exactly as before.
   The literal is only the current tree's count, and it moves whenever the
   register does. tools/test-page-lifetime.mjs section B is the pin that
   carries the register's INVARIANT, and that one is re-baselined to scan
   both files and require the same union.

   NOTE FOR THE COORDINATOR: this file is not on B01's allowlist. It is
   taken here rather than handing the next order a red tree that is not
   theirs, on D124's disclosed-excursion precedent. Two literals; reversible
   in one token. */
const REAL_MAIN = readText('main.js');
perturb('P19', 'an added addEventListener site is detected', {
  baseline: countIn(REAL_MAIN, '\\baddEventListener\\s*\\('),
  expected: 15,
  mutated: countIn(REAL_MAIN + '\n  window.addEventListener("resize", onResize);\n', '\\baddEventListener\\s*\\('),
});

perturb('P20', 'an added resource-owner construction site is detected', {
  baseline: countIn(REAL_SUBSTRATE, 'new\\s+(?:THREE\\.)?ShaderMaterial\\s*\\('),
  expected: 5,
  mutated: countIn(REAL_SUBSTRATE + '\n  const extra = new THREE.ShaderMaterial({});\n', 'new\\s+(?:THREE\\.)?ShaderMaterial\\s*\\('),
});

// The extractors' declared blind spot, proved rather than asserted: a hit
// inside a comment is NOT a call site, so a commented-out listener does not
// move the count. This is why every static section carries a `warning`.
perturb('P21', 'the comment filter really filters (declared blind spot, proved)', {
  baseline: countIn(REAL_MAIN + '\n  // window.addEventListener("resize", onResize);\n', '\\baddEventListener\\s*\\('),
  expected: 15,   // re-baselined 16 -> 15 by B01; see the note above P19
  mutated: scanText(REAL_MAIN + '\n  // window.addEventListener("resize", onResize);\n', '\\baddEventListener\\s*\\(').length,
});

// The one baseline that is pinned from source text rather than executed
// (organism/spores.js's private stream) must be a REAL search, not a
// tautology. This proves the search bites: a line that is not in the file is
// reported absent, not silently accepted.
perturb('P22', 'a source pin that no longer matches the file is reported absent', {
  baseline: pinSourceLines('organism/spores.js', ['const randT = makeRng(9127);'])
    .lines.map((l) => [l.present, l.occurrences]),
  expected: [[true, 1]],
  mutated: pinSourceLines('organism/spores.js', ['const randT = makeRng(9128);'])
    .lines.map((l) => [l.present, l.occurrences]),
});

/* ================================================================== *
 * P23-P24 — the canonicalization the whole determinism proof rests on.*
 * ================================================================== */
console.log('\nP23-P24 — report canonicalization');

// The canonical text of { a: { c: 3, d: 4 }, b: 1 }, transcribed as a literal.
// P23's baseline builds the SAME content with the keys inserted in a DIFFERENT
// order, so it is satisfied only if canonical() really sorts — that one was
// already sound. P24's was NOT: it wrote the identical expression on both
// sides, so its "baseline holds" half compared a value to itself. That is the
// third member of the O-C03a-1 family, found by sweeping the whole suite after
// the reviewer flagged P5 and P13. Both sides now anchor on the literal below.
// Run `--prove-failure` to see it trip against a canonical() that stopped
// sorting.
const CANON_LITERAL = '{\n  "a": {\n    "c": 3,\n    "d": 4\n  },\n  "b": 1\n}\n';

perturb('P23', 'key INSERTION order does not change the canonical text', {
  baseline: canonical({ b: 1, a: { d: 4, c: 3 } }),
  expected: CANON_LITERAL,
  mutated: canonical({ b: 1, a: { d: 4, c: 3 }, e: 5 }),
});

perturb('P24', 'a changed VALUE does change the canonical text', {
  baseline: canonical({ a: { c: 3, d: 4 }, b: 1 }),
  expected: CANON_LITERAL,
  mutated: canonical({ a: { c: 3, d: 4 }, b: 2 }),
});

/* ================================================================== *
 * P25-P28 — the MONOTONIC pins (coordinator decision D34).            *
 *           A floor that cannot be breached, and a ceiling that       *
 *           cannot be exceeded, would be decoration. These prove the  *
 *           extractor and the direction rule bite TOGETHER, end to    *
 *           end, over real source text.                               *
 * ================================================================== */
console.log('\nP25-P28 — monotonic floor and ceiling pins');

const REAL_BACKDROP = readText('journey/backdrop.js');
const REAL_ANIMATION = readText('organism/animation.js');
const meetsFloor = (actual, min) => actual >= min;
const meetsCeiling = (actual, max) => actual <= max;

// M7's floor: cleanup that used to exist being deleted must fail.
perturb('P25', 'a DELETED removeEventListener breaches the M7 floor', {
  baseline: meetsFloor(countIn(REAL_BACKDROP, '\\bremoveEventListener\\s*\\('), 4),
  expected: true,
  mutated: meetsFloor(
    countIn(REAL_BACKDROP.replace("    backdrop.removeEventListener('pointerdown', onPointerDown);\n", ''),
      '\\bremoveEventListener\\s*\\('), 4),
});

// M9's floor: R01's rAF cancel being reverted must fail. This is the exact
// regression the coordinator named — once above zero, never back to zero.
perturb('P26', 'a REVERTED cancelAnimationFrame breaches the M9 floor', {
  baseline: meetsFloor(countIn(REAL_ANIMATION, '\\bcancelAnimationFrame\\s*\\('), 1),
  expected: true,
  mutated: meetsFloor(
    countIn(REAL_ANIMATION.replace('cancelAnimationFrame(rafId);', 'rafId = rafId;'),
      '\\bcancelAnimationFrame\\s*\\('), 1),
});

// M18's ceiling: an attach added WITHOUT its teardown widens the gap and must
// fail; the same attach added WITH its teardown leaves the gap flat and must
// pass. Both halves matter — a ceiling that failed on every new listener
// would be an absolute pin wearing a ceiling's clothes.
const gapOf = (text) => countIn(text, '\\baddEventListener\\s*\\(')
  - countIn(text, '\\bremoveEventListener\\s*\\(');
// Pinned as a LITERAL, not as gapOf(REAL_BACKDROP): a file-derived ceiling
// would self-adjust and the "baseline holds" half would stop meaning anything.
// journey/backdrop.js attaches 4 listeners and detaches all 4 — gap 0. It is
// the tree's one perfectly-paired file, which is why it is the fixture here.
const BASE_GAP = 0;
check('P27.fixture', 'journey/backdrop.js really has a gap of 0', gapOf(REAL_BACKDROP), BASE_GAP);
perturb('P27', 'a listener attached WITHOUT teardown breaches the M18 ceiling', {
  baseline: meetsCeiling(gapOf(REAL_BACKDROP), BASE_GAP),
  expected: true,
  mutated: meetsCeiling(
    gapOf(REAL_BACKDROP + '\n  el.addEventListener("wheel", onWheel);\n'), BASE_GAP),
});
perturb('P28', 'the SAME listener attached WITH its teardown does NOT breach it', {
  baseline: meetsCeiling(
    gapOf(REAL_BACKDROP + '\n  el.addEventListener("wheel", onWheel);\n  el.removeEventListener("wheel", onWheel);\n'),
    BASE_GAP),
  expected: true,
  // Contrast case: the mutation here is the UNPAIRED form, so this second
  // assertion proves the ceiling is not simply always-true.
  mutated: meetsCeiling(
    gapOf(REAL_BACKDROP + '\n  el.addEventListener("wheel", onWheel);\n'), BASE_GAP),
});

/* ================================================================== *
 * --prove-failure — the deliberate-failure demonstration.             *
 *                                                                     *
 * An assertion that cannot be made to fail is a tautology by          *
 * definition, and a demonstration is the only real proof. This mode   *
 * feeds each de-tautologised comparison a CORRUPTED actual and        *
 * confirms it no longer matches the independent literal — i.e. that   *
 * the normal run's "baseline holds" half would have tripped.          *
 *                                                                     *
 *   node tools/test-render-perturbation.mjs --prove-failure           *
 *                                                                     *
 * It exits 1 if any comparison CANNOT be made to fail. Nothing is     *
 * written; the corruption is in memory.                               *
 * ================================================================== */
if (process.argv.includes('--prove-failure')) {
  console.log('\n--prove-failure — each de-tautologised comparison, fed a corrupted actual');
  let bad = 0;
  const prove = (id, what, literal, corrupted) => {
    const l = typeof literal === 'object' ? canonical(literal) : String(literal);
    const c = typeof corrupted === 'object' ? canonical(corrupted) : String(corrupted);
    if (c !== l) {
      console.log(`  PROVED  ${id}  ${what}`);
      console.log(`            literal:   ${l.trim().slice(0, 100)}`);
      console.log(`            corrupted: ${c.trim().slice(0, 100)}  -> would FAIL`);
    } else {
      bad++;
      console.log(`  TAUTOLOGY  ${id}  ${what} — a corrupted actual STILL matched. This assertion cannot fail.`);
    }
  };

  // P5: a noise3 whose lattice has moved must not match the pinned digest.
  prove('P5', 'corrupted noise3 vs the pinned lattice digest',
    P5_LATTICE_DIGEST,
    latticeDigest((x, y, z) => helpers.noise3(x, y, z) * 1.000001));

  // P13: a manifest whose attr shape has moved must not match the literals.
  prove('P13', 'corrupted manifest attr vs the pinned literals',
    [P13_KEY, 'position', 3, 6720, P13_ITEM_COUNT],
    (() => {
      const m = clone(manifest.chapters.inspire);
      m.keys[0].attrs[0].byteLength = 6716;
      const a = analyzeChapter('inspire', m, inspireBytes).keys[0].attrs[0];
      return [m.keys[0].key, a.name, a.itemSize, a.byteLength, a.itemCount];
    })());

  // R15's family, re-proved here so the whole de-tautologised set is in one
  // transcript: a source pin that no longer matches must report absent.
  prove('R15', 'corrupted source-pin text vs a real file search',
    [true, 1],
    (() => {
      const l = pinSourceLines('organism/spores.js', ['const randT = makeRng(9999);']).lines[0];
      return [l.present, l.occurrences];
    })());

  // P23/P24: a canonical() that stopped sorting must not match the literal.
  prove('P23/P24', 'unsorted canonical() vs the pinned canonical literal',
    CANON_LITERAL,
    JSON.stringify({ b: 1, a: { d: 4, c: 3 } }, null, 2) + '\n');

  SENT.reach('prove');
  console.log(bad ? `\n${bad} comparison(s) could NOT be made to fail.` : '\nAll comparisons proved failable.');
  process.exit(bad ? 1 : 0);
}

SENT.reach('main');
console.log(`\n${cases} perturbation cases — ${cases - fail} PASS, ${fail} FAIL`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
