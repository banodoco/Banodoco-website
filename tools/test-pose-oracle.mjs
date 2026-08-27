/* ==================================================================== *
 * tools/test-pose-oracle.mjs — PAGE-02.
 *
 * THE GATE FOR tools/pose-oracle.mjs — the freeze-then-read discipline, the
 * pose-vector arithmetic, the two wall-clock gates the freeze cannot reach,
 * and the assert-zero that keeps the driven region driven by real input.
 *
 * WHAT IS IN THIS GATE AND WHAT IS NOT. The distinction is PAGE-01's and it
 * is repeated here because it is the honest limit of the order.
 * -------------------------------------------------------------------
 * IN THE GATE (`npm run check`, no browser, no server):
 *   · THE RAIL-GATE PIN, read from journey/rail.js ITSELF. The discipline
 *     waits RAIL_GATE_SETTLE_MS past two `Date.now()` gates in the shipped
 *     rail. If either literal grows past the wait, this suite goes red and
 *     names the file — rather than the wait quietly becoming too short and
 *     the harness quietly becoming a coin toss.
 *   · THE ARITHMETIC — every decision function, run over a RECORDED pose
 *     matrix from a real driven session, with mutants.
 *   · THE EVENT-PATH SCAN — that the driven region drives with the browser's
 *     own pointer and key events and with nothing else.
 *
 * NOT IN THE GATE:
 *   · THE LIVE POSE COMPARISON. A recording is a recording. This suite
 *     proves the oracle is right about the recorded matrix; it CANNOT
 *     observe that today's page still produces it. That is
 *     `npm run test:pose`, which needs Chrome and two served origins.
 *   · ANY PIXEL. Nothing here or in pose-run.mjs reads a framebuffer.
 *     `HB11` is not touched by this order either.
 *
 * Run:
 *   node tools/test-pose-oracle.mjs                 — the ledger
 *   node tools/test-pose-oracle.mjs --prove-failure — and the mutants
 * ==================================================================== */

import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HarnessFault, fault, mutateText, sliceBetween, createLedger, armSentinel } from './instrument-ledger.mjs';
import { createRegistry, M } from './mutant-registry.mjs';
import {
  code, literalPredicateRe, literalPredicateHits, foreignSiteSet,
  scanTautologyAst, TAUTOLOGY_FIXTURES,
} from './self-controls.mjs';
import {
  POSE_REGION, POSE_FIELDS, PLACED_POSES, EXCLUSIONS, EXCLUSIONS_UNFROZEN, SCENARIOS,
  INPUT_KINDS, FREEZE_PHASE_MS, FREEZE_SETTLE_TICKS, RAIL_GATE_SETTLE_MS, MIN_POSE_ROWS,
  splitRow, cellKey, maskExclusions, comparePose, movedCells, vectorDigest,
  reproducibility, railGateLiterals, trustVerdict, parseArgs,
  pvRead, pvFreeze, pvThaw, pvUiState, pvTargetBox,
} from './pose-oracle.mjs';

const SELF_PATH = fileURLToPath(import.meta.url);
const TOOLS = dirname(SELF_PATH);
const REPO = resolve(TOOLS, '..');
const ORACLE_REL = 'tools/pose-oracle.mjs';
const RUN_REL = 'tools/pose-run.mjs';
const DWELL_REL = 'tools/dwell-oracle.mjs';
/** D82 — a fixture relocated into tools/ joins every sweep that owns tools/.
 *  This file is read only as TEXT and takes an inert extension. */
const MATRIX_PATH = join(TOOLS, 'pose-oracle.matrix.json.txt');

const PROVE = process.argv.includes('--prove-failure');
const SENT = armSentinel('test-pose-oracle', ['ledger', 'sweep'], (p) => p === 'ledger' || PROVE);

const L = createLedger();
const { pin, sweep } = createRegistry({ ledger: L, fault });

console.log('tools/test-pose-oracle.mjs — the freeze-then-read discipline, its pose vector, and its event path\n');

/* ==================================================================== *
 * INPUTS. A mutant perturbs one of these; nothing writes to the tree.
 * ==================================================================== */

const FIX = { text: readFileSync(MATRIX_PATH, 'utf8') };
const SRC = { text: readFileSync(join(TOOLS, 'pose-oracle.mjs'), 'utf8') };
const RUN = { text: readFileSync(join(TOOLS, 'pose-run.mjs'), 'utf8') };
const DWELL = { text: readFileSync(join(TOOLS, 'dwell-oracle.mjs'), 'utf8') };
const RAIL = { text: readFileSync(join(REPO, 'journey', 'rail.js'), 'utf8') };
const SETS = { region: POSE_REGION, fields: POSE_FIELDS, poses: PLACED_POSES, scenarios: SCENARIOS };
const GUARD = { rows: null, exclusions: EXCLUSIONS };   /* filled below, once FIX is read */

/* ==================================================================== *
 * READERS OVER THE RECORDED MATRIX.
 * ==================================================================== */

/** D63 — a matrix that will not parse yields a typed refusal, never an empty
 *  vector list that would report "0 differences" and pass forever. */
function matrixOf(i) {
  let m;
  try { m = JSON.parse(i.text); } catch (e) { fault(`the recorded pose matrix does not parse — ${e.message}`); }
  if (!m || !Array.isArray(m.full) || m.full.length === 0) fault('the recorded pose matrix carries no vectors');
  return m;
}
const vecOf = (i, id) => {
  const hit = matrixOf(i).full.find((r) => r[0] === id);
  if (!hit || !Array.isArray(hit[1]) || hit[1].length === 0) fault(`the recorded matrix has no vector for "${id}"`);
  return hit[1];
};
const CONNECT = 'placed:connect';

/** Every distinct region root the RECORDING actually produced. The shipped
 *  POSE_REGION is asserted against this rather than against itself. */
const recordedRoots = (i) => {
  const seen = [];
  for (const row of vecOf(i, CONNECT)) {
    const p = row.split('|')[0];
    const root = p.includes('/') ? p.slice(0, p.indexOf('/')) : p;
    if (!seen.includes(root)) seen.push(root);
  }
  return seen;
};
const recordedShape = (i) => {
  const v = vecOf(i, CONNECT);
  const widths = new Set(v.map((r) => r.split('|').length));
  return { rows: v.length, cellWidths: [...widths].sort((a, b) => a - b), distinctPaths: new Set(v.map((r) => r.split('|')[0])).size };
};
const recordedDigests = (i) => matrixOf(i).full
  .filter((r) => Array.isArray(r[1]))
  .map((r) => `${r[0]} :: ${vectorDigest(r[1])}`);
const recordedReport = (i) => {
  const m = matrixOf(i);
  return Object.keys(m.report).sort()
    .map((k) => `${k} :: ${m.report[k].digest} :: ${m.report[k].exact ? 'EXACT' : 'DIFFER'} :: ${m.report[k].twoTree}`);
};
const recordedEvidence = (i) => {
  const e = matrixOf(i).evidence;
  return {
    poses: e.poseCount, torn: e.tornReads, freezeFailures: e.freezeFailures,
    predicateMisses: e.predicateMisses, hidden: e.hiddenReads, thin: e.thinVectors,
    stale: e.staleExclusions.length, consoleErrors: e.consoleErrors,
    pointer: e.positivePointer, key: e.positiveKey,
  };
};

/* ==================================================================== *
 * THE DRIVEN-REGION READER (D46 / the event-path scan).
 * ==================================================================== */

const REGION_START = '/* --- THE DRIVEN REGION ----';
const REGION_END = '/* --- END OF DRIVEN REGION ----';

/** THE FORBIDDEN SET. Two families, and both are forbidden for the same
 *  reason: a pose reached by either is not a pose the visitor could reach.
 *   · a progress setter or a placement call moves the ride WITHOUT the
 *     travel model (PAGE-01's pattern, extended with the placement calls a
 *     DOM harness is tempted by);
 *   · `dispatchEvent` and the bare DOM `el.click()` / `el.focus()` methods
 *     synthesise an UNTRUSTED event that skips hit-testing entirely, so they
 *     can "click" a control that is covered, disabled or off-screen. */
const FORBIDDEN_RE = () => /\.(?:scrollTo|flyTo|setProgress|snapTo|placeAt|navigateTo|activate|wrap)\s*\(|\bdispatchEvent\s*\(|\.(?:click|focus|blur)\s*\(\s*\)/g;
/** The presence control, inside the same slice: the browser's own input. */
const REAL_INPUT_RE = () => /\bpage\.(?:mouse|keyboard)\.[a-z]+\s*\(/g;

function regionOf(i) {
  return code(sliceBetween(i.text, 'driven-region', REGION_START, REGION_END));
}
const forbiddenInRegion = (i) => (regionOf(i).match(FORBIDDEN_RE()) || []).length;
const realInputInRegion = (i) => (regionOf(i).match(REAL_INPUT_RE()) || []).sort();
const forbiddenElsewhere = (i) => [...new Set((code(i.text).match(FORBIDDEN_RE()) || []))].sort();

/* --- source readers over the page-side half ------------------------- */

/** The pose must be a function of the DOM, not of the clock. A reader that
 *  consulted a clock would produce a vector that could never be exactly
 *  reproduced, and it would look exactly like this one. */
const CLOCK_RE = () => /\b(?:Date\.now|performance\.now|Math\.random)\s*\(/g;

/* ==================================================================== *
 * 1. THE DISCIPLINE'S CONSTANTS AND SITE SETS.
 * ==================================================================== */

GUARD.rows = vecOf(FIX, CONNECT);

pin('PV-REGION', 'D46 — the shipped region roots are the roots the RECORDING actually produced, in order',
  recordedRoots, FIX, [...POSE_REGION],
  'a root added to POSE_REGION that the page never renders, or a root the page renders that the '
  + 'constant does not name, is a pose vector that measures a different DOM than it claims to');

pin('PV-SHAPE', 'EXACT given the recording — the pose vector\'s shape: rows, cells per row, distinct ordinates',
  recordedShape, FIX, { rows: 363, cellWidths: [11], distinctPaths: 363 },
  'every row is one element and every element appears once; a repeated ordinate would make two '
  + 'different nodes compare as one');

pin('PV-DIGESTS', 'EXACT given the recording — the digest of every pose the sweep read',
  recordedDigests, FIX, [
    'placed:connect :: 5f481f4596dfda06',
    'driven:menu-escaped :: 5f481f4596dfda06',
    'driven:pop-pinned :: b9d72794fcb03c20',
  ],
  'note driven:menu-escaped and placed:connect: a real pointer click followed by a real Escape '
  + 'returns the DOM to a BIT-IDENTICAL pose. That equality is the strongest single thing this '
  + 'recording says, and it is an equality of digests, not a similarity of screenshots');

pin('PV-VERDICTS', 'EXACT given the recording — reproducibility across fresh sessions, and the two-tree verdict, per pose',
  recordedReport, FIX, [
    'driven:menu-escaped :: 5f481f4596dfda06 :: EXACT :: EXACT',
    'driven:menu-open :: c2a1c9698a3d6fd5 :: EXACT :: EXACT',
    'driven:pop-escaped :: d05d1b81b53899cb :: EXACT :: EXACT',
    'driven:pop-pinned :: b9d72794fcb03c20 :: EXACT :: EXACT',
    'placed:connect :: 5f481f4596dfda06 :: EXACT :: EXACT',
    'placed:final :: d706480f0cb94f8e :: EXACT :: EXACT',
    'placed:inspire :: 5990b25426ba0dea :: EXACT :: EXACT',
    'placed:mission :: 7b7cd1deb11bb0c5 :: EXACT :: EXACT',
    'placed:owned :: eaa4b93dee3a7cac :: EXACT :: EXACT',
  ],
  'the first column of each row is the recorded digest; the second says the two fresh sessions on ONE '
  + 'origin agreed exactly; the third says the working tree and a pristine git archive of 6967a36, '
  + 'served on two ports and driven sequentially and fronted, produced BIT-IDENTICAL poses');

pin('PV-EVIDENCE', 'D63 — the recorded run\'s own INPUTS, so a matrix produced by an untrusted sweep cannot be quoted here',
  recordedEvidence, FIX, {
    poses: 54, torn: 0, freezeFailures: 0, predicateMisses: 0, hidden: 0, thin: 0,
    stale: 0, consoleErrors: 0, pointer: true, key: true,
  });

pin('PV-SETS', 'D54 — the discipline\'s declared site sets and constants, as data rather than as counts',
  (i) => ({
    region: [...i.region],
    fields: [...i.fields],
    poses: [...i.poses],
    scenarios: i.scenarios.map((s) => `${s.id} :: ${s.pose} :: ${s.steps.map((t) => `${t.kind}(${t.target || t.key})->ui.${t.want}=${JSON.stringify(t.to)}`).join(' ')}`),
  }), SETS, {
    region: ['nav.j-rail', 'div.j-menu-scrim', 'aside#j-menu', 'div.j-copy', 'div.j-hotzones',
      'div.j-hotspots', 'aside.j-card', 'aside.j-pop', 'div.j-live'],
    fields: ['path', 'tag', 'class', 'rect', 'opacity', 'transform', 'visibility', 'display',
      'zIndex', 'pointerEvents', 'textHash'],
    poses: ['mission', 'inspire', 'connect', 'owned', 'final'],
    scenarios: [
      'menu-open :: connect :: click(menu-button)->ui.menuOpen=true',
      'menu-escaped :: connect :: click(menu-button)->ui.menuOpen=true key(Escape)->ui.menuOpen=false',
      'pop-pinned :: connect :: hover(hotspot:ados)->ui.popNode="ados" click(hotspot:ados)->ui.popPinned=true',
      'pop-escaped :: connect :: hover(hotspot:ados)->ui.popNode="ados" click(hotspot:ados)->ui.popPinned=true key(Escape)->ui.popPinned=false',
    ],
  });

/* ==================================================================== *
 * 2. THE EXCLUSION SET — declared EMPTY, and guarded against widening.
 * ==================================================================== */

pin('PV-EXCL-1', 'the exclusion set is EMPTY over the real recorded pose — nothing in 363 rows is excused',
  (i) => {
    const r = maskExclusions(i.rows, i.exclusions);
    return { entries: i.exclusions.length, maskedCells: r.masked, unmatched: r.unmatched, rows: r.rows.length };
  }, GUARD, { entries: 0, maskedCells: [], unmatched: [], rows: 363 },
  'THIS IS THE WIDENING GUARD. A future order that excuses a cell — for any reason, including a good '
  + 'one — moves this row and has to say so in a literal. An absent exclusion concept could be widened '
  + 'silently; a declared empty one cannot');

{
  /* The masker's own two-sided probe. An exclusion that MATCHES blanks
     exactly one cell and leaves the row count; one that matches NOTHING is
     reported, because a stale excuse silences the wrong cell later. */
  const rows = [
    'a|div|x|1,2,3,4|1|none|visible|block|auto|auto|00000001',
    'a/0|i|y|5,6,7,8|0|matrix(1)|hidden|block|1|none|00000002',
  ];
  const live = maskExclusions(rows, [{ path: 'a/0', field: 'transform', why: 'fixture' }]);
  const stale = maskExclusions(rows, [{ path: 'a/9', field: 'transform', why: 'fixture' }]);
  L.same('PV-EXCL-2', 'D46 — an exclusion that matches blanks exactly its own cell; one that matches nothing is REPORTED',
    [live.rows[1], live.masked, live.unmatched, stale.masked, stale.unmatched, stale.rows.length],
    ['a/0|i|y|5,6,7,8|0|EXCLUDED|hidden|block|1|none|00000002',
      ['a/0 :: transform'], [], [], ['a/9 :: transform'], 2]);
  const refuses = (f, needle) => {
    try { f(); return 'no refusal'; } catch (e) {
      if (!(e instanceof HarnessFault)) return `untagged ${e.constructor.name}`;
      return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 40)}`;
    }
  };
  L.same('PV-EXCL-3', 'the ordinate cannot be excluded, and a field that is not a pose field is a refusal',
    [refuses(() => maskExclusions(rows, [{ path: 'a', field: 'path' }]), 'ordinate'),
      refuses(() => maskExclusions(rows, [{ path: 'a', field: 'colour' }]), 'not a pose field'),
      refuses(() => maskExclusions(rows, [{ path: 'a' }]), 'needs a path and a field')],
    ['HarnessFault', 'HarnessFault', 'HarnessFault']);
  L.same('PV-EXCL-4', 'D45 — the UNFROZEN counter-measurement is the size and shape this order recorded (iteration pin)',
    [EXCLUSIONS_UNFROZEN.length, EXCLUSIONS_UNFROZEN[0], EXCLUSIONS_UNFROZEN.filter((s) => s.endsWith(':: pointerEvents')).length],
    [12, 'nav.j-rail/0/0/0 :: rect', 9],
    'twelve cells is what three fresh sessions disagree on when the page is driven LIVE (?pose=) and '
    + 'read after a quiescence loop — the design this discipline replaces. It is not an exclusion list; '
    + 'nothing excuses these. It is the measurement that makes "placing beats settling" a number');
}

/* ==================================================================== *
 * 3. THE ARITHMETIC. Exact, total, and no tolerance is reachable from any
 * of these signatures.
 * ==================================================================== */

pin('PV-CMP', 'EXACT comparison: identical, one moved row, and a length mismatch',
  (i) => {
    const a = i.rows.slice(0, 6);
    const same = comparePose(a, a.slice());
    const one = comparePose(a, a.map((r, n) => (n === 3 ? r.replace('|visible|', '|hidden|') : r)));
    const short = comparePose(a, a.slice(0, 5));
    return [same.identical, same.movedRows, one.identical, one.movedRows, short.identical, short.movedRows,
      `${short.lengthA}/${short.lengthB}`];
  }, GUARD, [true, 0, false, 1, false, 1, '6/5']);

pin('PV-CELLS', 'the moved-cell SITE SET names the ordinate and the axis, and a vanished node is named as a node',
  (i) => {
    const a = i.rows.slice(0, 6);
    const b = a.map((r, n) => (n === 2 ? r.replace('|visible|', '|hidden|') : r));
    return [movedCells(a, b), movedCells(a, a.slice(0, 5)).length, movedCells(a, a).length];
  }, GUARD, [['nav.j-rail/0/0 :: visibility'], 1, 0]);

pin('PV-DIGEST', 'the digest is content- AND order-sensitive; a reorder is not a coincidence it can miss',
  (i) => {
    const a = i.rows.slice(0, 40);
    const swapped = a.slice(); [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const edited = a.map((r, n) => (n === 7 ? `${r}x` : r));
    return [vectorDigest(a) === vectorDigest(a.slice()), vectorDigest(a) === vectorDigest(swapped),
      vectorDigest(a) === vectorDigest(edited), vectorDigest(a).length];
  }, GUARD, [true, false, false, 16]);

pin('PV-REPRO', 'reproducibility over a set of reads: exact when they agree, and it names the cell when they do not',
  (i) => {
    const a = i.rows.slice(0, 12);
    const good = reproducibility([{ label: 'S1', rows: a }, { label: 'S2', rows: a.slice() }]);
    const bad = reproducibility([{ label: 'S1', rows: a },
      { label: 'S2', rows: a.map((r, n) => (n === 5 ? r.replace('|visible|', '|hidden|') : r)) }]);
    return { goodExact: good.exact, goodPairs: good.pairs.length, badExact: bad.exact, badCells: bad.pairs[0].cells };
  }, GUARD, { goodExact: true, goodPairs: 1, badExact: false, badCells: ['nav.j-rail/0/0/1/0 :: visibility'] });

pin('PV-SPLIT', 'a recorded row splits into its eleven named cells, and the literal is written out per cell',
  (i) => splitRow(i.rows[0]), GUARD, {
    path: 'nav.j-rail',
    tag: 'nav',
    class: 'j-rail j-rail-following j-rail-hot on',
    rect: '66.547,574.000,304.000,70.000',
    opacity: '1',
    transform: 'none',
    visibility: 'visible',
    display: 'block',
    zIndex: '4',
    pointerEvents: 'none',
    textHash: '00001505',
  },
  'the class list is SORTED before it is written, so a reordered classList is not a difference and a '
  + 'changed one is');

/* ==================================================================== *
 * 4. THE TWO WALL-CLOCK GATES THE FREEZE CANNOT REACH — read from the
 * SHIPPED journey/rail.js, so this pin watches the live tree.
 * ==================================================================== */

pin('PV-RAIL-GATES', 'EXACT over live production source — journey/rail.js\'s two Date.now() gates, and the wait that clears both',
  (i) => {
    const g = railGateLiterals(i.text);
    return { ...g, settle: RAIL_GATE_SETTLE_MS, clearsFollow: RAIL_GATE_SETTLE_MS > g.followReadyMs, clearsTurn: RAIL_GATE_SETTLE_MS > g.turnTimerMs };
  }, RAIL, { followReadyMs: 720, turnTimerMs: 500, settle: 1500, clearsFollow: true, clearsTurn: true },
  'neither freezeTime (it pins the SHARED clock) nor document.getAnimations() (CSS only) can reach a '
  + 'Date.now() comparison. Both gates are ONE-WAY, so waiting past the longer literal reaches a state '
  + 'the page cannot leave — a lower bound on a monotone transition, not a tolerance on a measurement. '
  + 'If either literal grows past the wait, this row goes red and names the file');

{
  const refuses = (text, needle) => {
    try { railGateLiterals(text); return 'no refusal'; } catch (e) {
      if (!(e instanceof HarnessFault)) return `untagged ${e.constructor.name}`;
      return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 50)}`;
    }
  };
  L.same('PV-RAIL-R1', 'D63 — a rail source whose gates cannot be read yields a typed refusal, never a default',
    [refuses('nothing here', 'followReadyAt deadline'),
      refuses("followReadyAt = reduceMotion.matches ? Date.now() : Date.now() + 720;", 'j-rail-turn anchor'),
      refuses(42, 'needs journey/rail.js source text')],
    ['HarnessFault', 'HarnessFault', 'HarnessFault']);
  L.same('PV-RAIL-R2', 'D46 — the reader really read journey/rail.js (a 0 here would mean it read the wrong bytes)',
    [RAIL.text.length > 40000, RAIL.text.includes("classList.toggle('j-rail-following'"), RAIL.text.includes('followReadyAt')],
    [true, true, true], `journey/rail.js is ${RAIL.text.length} bytes`);
}

/* ==================================================================== *
 * 5. D63 — the trust gate, cause by cause.
 * ==================================================================== */

const CLEAN = Object.freeze({
  httpOk: true, httpStatus: 200, booted: true, positivePointer: true, positiveKey: true,
  hiddenReads: 0, consoleErrors: 0, freezeFailures: 0, tornReads: 0, predicateMisses: 0,
  staleExclusions: [], thinVectors: 0, originsIdentical: false, poseCount: 9,
});

pin('PV-TRUST', 'D63 — a clean sweep is trusted, and every flaw is a NAMED cause that suppresses the number entirely',
  (i) => {
    const cause = (over) => { const v = trustVerdict({ ...i.clean, ...over }); return v.trusted ? 'TRUSTED' : v.causes[0].slice(0, 44); };
    return {
      clean: trustVerdict(i.clean).trusted,
      http: cause({ httpOk: false, httpStatus: 404 }),
      boot: cause({ booted: false }),
      pointer: cause({ positivePointer: false }),
      key: cause({ positiveKey: false }),
      hidden: cause({ hiddenReads: 1 }),
      freeze: cause({ freezeFailures: 2 }),
      torn: cause({ tornReads: 1 }),
      predicate: cause({ predicateMisses: 1 }),
      stale: cause({ staleExclusions: ['a :: rect'] }),
      thin: cause({ thinVectors: 1 }),
      sameTree: cause({ originsIdentical: true }),
      empty: cause({ poseCount: 0 }),
    };
  }, { clean: CLEAN }, {
    clean: true,
    http: 'origin did not serve the page (HTTP 404)',
    boot: 'window.journey.ui never appeared — the page ',
    pointer: 'POSITIVE CONTROL failed: a real pointer clic',
    key: 'POSITIVE CONTROL failed: a real key press ch',
    hidden: '1 read(s) ran with document.hidden — a hidde',
    freeze: '2 animation(s) could not be frozen — the pos',
    torn: '1 TORN read(s): two consecutive reads inside',
    predicate: '1 driven step(s) whose ui predicate never be',
    stale: 'exclusion(s) matching no row: a :: rect — a ',
    thin: '1 pose vector(s) below 200 rows — a region r',
    sameTree: 'the two origins served byte-identical trees ',
    empty: 'no pose was read at all',
  },
  'PAGE-01 named nine causes for a browser harness. A freeze-then-read harness adds five, because '
  + '"the page looked fine" is compatible with every one of them');

/* ==================================================================== *
 * 6. THE EVENT PATH — D46 assert-zero WITH its positive controls.
 * ==================================================================== */

pin('PV-EVT-1', 'D46 assert-zero — progress setters, placement calls, synthesised events and DOM-method shortcuts inside the driven region',
  forbiddenInRegion, RUN, 0,
  'a pose reached by setProgress, placeAt or a synthesised click is not a pose the visitor could '
  + 'reach, and a preservation proof over it proves nothing about the page');

pin('PV-EVT-2', 'D46 positive control INSIDE THE SAME SLICE — the browser\'s own pointer and key calls '
  + '(a 0 here means the scan went blind, not that the region is clean)',
  realInputInRegion, RUN,
  ['page.keyboard.press(', 'page.mouse.down(', 'page.mouse.move(', 'page.mouse.up('],
  'these four are the whole input surface of this instrument: one key call and the three mouse calls '
  + 'a real click is made of. A click performed with page.mouse.click() would still be trusted input, '
  + 'but move/down/up is the form that cannot be confused with the DOM el.click() method');

pin('PV-EVT-3', 'D46/D54 — the SAME forbidden pattern, proved non-blind: it finds real sites in tools/dwell-oracle.mjs',
  forbiddenElsewhere, DWELL, ['.scrollTo(', 'dispatchEvent('],
  'an assert-zero is only trustworthy beside an assertion of presence, and the presence has to be '
  + 'found by the identical pattern — otherwise "0 hits" is indistinguishable from "read the wrong bytes". '
  + 'PAGE-01\'s driver legitimately does both of these; this one legitimately does neither');

{
  const hits = (text) => (code(text).match(FORBIDDEN_RE()) || []).length;
  L.same('PV-EVT-4', 'D46 — the forbidden pattern hits live code of each family and does NOT hit a commented-out copy',
    [hits('  j.scrollTo(0.5);\n'), hits('  el.dispatchEvent(e);\n'), hits('  btn.click();\n'),
      hits('  // j.scrollTo(0.5);\n'), hits('  await page.mouse.click(x, y);\n'), hits('  await page.keyboard.press("Escape");\n')],
    [1, 1, 1, 0, 0, 0],
    'the last two matter: `page.mouse.click(x, y)` and `page.keyboard.press(...)` are REAL input and '
    + 'must not be caught by a pattern aimed at the DOM `el.click()` method');
  L.same('PV-EVT-5', 'D46 inputs pin — FILES read (inputs, not matches), and the region is a proper part of its file',
    [4, RUN.text.length > 8000, regionOf(RUN).length > 400, regionOf(RUN).length < RUN.text.length,
      SRC.text.length > 8000, DWELL.text.length > 8000],
    [4, true, true, true, true, true],
    `pose-run is ${RUN.text.length} bytes, its driven region ${regionOf(RUN).length}`);
  L.same('PV-EVT-6', 'the forbidden set is DECLARED, so widening it is an edit to a literal rather than to a regex nobody reads',
    FORBIDDEN_RE().source,
    '\\.(?:scrollTo|flyTo|setProgress|snapTo|placeAt|navigateTo|activate|wrap)\\s*\\(|\\bdispatchEvent\\s*\\(|\\.(?:click|focus|blur)\\s*\\(\\s*\\)');
}

/* ==================================================================== *
 * 7. THE PAGE-SIDE HALF, READ AS SOURCE — which is the honest form.
 *
 * The bodies of pvRead/pvFreeze/pvThaw run INSIDE a browser, so they cannot
 * be called here. What CAN be read is the function objects the module
 * exports. That is a source assertion about behaviour, not an observation of
 * behaviour, and saying which is which is the point (PAGE-01's formulation).
 * ==================================================================== */

pin('PV-READER', 'D46 assert-zero WITH presence — the pose reader consults the DOM and never a clock',
  (i) => ({
    clocks: (String(i.read).match(CLOCK_RE()) || []).length,
    present: ['getBoundingClientRect', 'getComputedStyle', 'toFixed(3)'].filter((t) => String(i.read).includes(t)),
  }),
  { read: pvRead }, { clocks: 0, present: ['getBoundingClientRect', 'getComputedStyle', 'toFixed(3)'] },
  'a reader that consulted Date.now(), performance.now() or Math.random() would produce a vector that '
  + 'could never be exactly reproduced — and it would look exactly like this one');

pin('PV-FREEZER', 'the freeze both PAUSES and pins currentTime, and settles before anything is read',
  (i) => ({
    tokens: ['getAnimations', '.pause()', 'currentTime = arg.phaseMs', 'requestAnimationFrame']
      .filter((t) => String(i.freeze).includes(t)),
    phase: i.phase, ticks: i.ticks, floor: i.floor,
  }),
  { freeze: pvFreeze, phase: FREEZE_PHASE_MS, ticks: FREEZE_SETTLE_TICKS, floor: MIN_POSE_ROWS },
  { tokens: ['getAnimations', '.pause()', 'currentTime = arg.phaseMs', 'requestAnimationFrame'],
    phase: 100000, ticks: 2, floor: 200 },
  'pausing alone leaves each animation at whatever phase it had reached, which is the SAME clock '
  + 'dependence in a new place. The pinned currentTime is what makes the frozen state a function of a '
  + 'literal rather than of when the pause landed');

pin('PV-PAGESIDE', 'D45 — the page-side half is the size and shape this order shipped (iteration pin over the serialised surface)',
  (i) => ({
    read: typeof i.read, freeze: typeof i.freeze, thaw: typeof i.thaw, ui: typeof i.ui, box: typeof i.box,
    uiCells: Object.keys(i.ui() || {}).length,
    /* pvUiState runs in the page (it reads `window`), so it is read as
       SOURCE here — the named cells a scenario predicate may assert on. A
       predicate naming a cell the reader does not publish would be a step
       that can never become true, i.e. a permanent D63 refusal. */
    uiPublishes: ['menuOpen', 'cardOpen', 'cardNode', 'cardPinned', 'popNode', 'popPinned', 'armedNode']
      .filter((k) => String(i.uiSrc).includes(`${k}:`)),
    kinds: [...i.kinds],
    targets: ['menu-button', 'hotspot:'].filter((t) => String(i.box).includes(t)),
  }),
  { read: pvRead, freeze: pvFreeze, thaw: pvThaw, ui: () => null, box: pvTargetBox,
    uiSrc: pvUiState, kinds: INPUT_KINDS },
  { read: 'function', freeze: 'function', thaw: 'function', ui: 'function', box: 'function',
    uiCells: 0,
    uiPublishes: ['menuOpen', 'cardOpen', 'cardNode', 'cardPinned', 'popNode', 'popPinned', 'armedNode'],
    kinds: ['click', 'hover', 'key'], targets: ['menu-button', 'hotspot:'] });

/* ==================================================================== *
 * 8. CLI, and the refusals.
 * ==================================================================== */

{
  L.same('PV-CELLKEY', "the moved-cell ordinate is D54's `subject :: axis` shape, not a bare path",
    [cellKey('nav.j-rail/0', 'transform'), cellKey('a', 'ROW PRESENCE')],
    ['nav.j-rail/0 :: transform', 'a :: ROW PRESENCE']);
  L.same('PV-CLI', 'the CLI defaults, including the two-origin flags this protocol needs',
    parseArgs(['--origin-b=http://x:1', '--sessions=3']),
    { origin: 'http://localhost:8177', control: '', originB: 'http://x:1', sessions: 3,
      width: 1280, height: 800, record: null, only: '' });
  const refuses = (f, needle) => {
    try { f(); return 'no refusal'; } catch (e) {
      if (!(e instanceof HarnessFault)) return `untagged ${e.constructor.name}`;
      return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 50)}`;
    }
  };
  L.same('PV-R1', 'D63 — every arithmetic entry point refuses rather than returning a comparable-looking zero',
    [refuses(() => splitRow('a|b'), 'expected 11'),
      refuses(() => splitRow(7), 'not a string'),
      refuses(() => comparePose('a', []), 'two pose vectors'),
      refuses(() => vectorDigest('a'), 'needs a pose vector'),
      refuses(() => reproducibility([{ label: 'x', rows: [] }]), 'at least two reads'),
      refuses(() => matrixOf({ text: '{ not json' }), 'does not parse'),
      refuses(() => matrixOf({ text: '{"full":[]}' }), 'carries no vectors'),
      refuses(() => vecOf({ text: '{"full":[["a",[]]]}' }, 'a'), 'no vector for')],
    ['HarnessFault', 'HarnessFault', 'HarnessFault', 'HarnessFault', 'HarnessFault',
      'HarnessFault', 'HarnessFault', 'HarnessFault']);
}

/* ==================================================================== *
 * 9. D44 / D86 over this file's own source.
 * ==================================================================== */
{
  const RE = literalPredicateRe(['L.same', 'pin'], 2);
  const hits = literalPredicateHits(readFileSync(SELF_PATH, 'utf8'), RE).hits;
  L.same('PV-X1', 'D44 — bare-literal-predicate assertions in this suite', hits.length, 0,
    hits.length ? hits.join('\n        ') : null);
  const misses = TAUTOLOGY_FIXTURES
    .filter(([, , snippet, want]) => scanTautologyAst(snippet, new Map([['L.same', 2]])).hits.length !== want)
    .map(([id]) => id);
  L.same('PV-X2', "D46 — every D86 fixture row returns the count it was built for (the reader for PV-X3's zero)",
    misses, []);
  const tau = scanTautologyAst(readFileSync(SELF_PATH, 'utf8'), new Map([['L.same', 2], ['pin', null]]));
  L.same('PV-X3', 'D86 — syntactic tautologies in this suite', tau.hits.length, 0,
    tau.hits.length ? tau.hits.join('\n        ') : null);
  L.same('PV-X4', 'D45 — the AST scan reached this file at all (a 0 would mean it read the wrong bytes)',
    tau.sites > 10, true, `sites=${tau.sites}`);
  /* TWO since DWELL-G1 (2026-08-25): tools/dwell-oracle.mjs's driven region
     gained `dualTrial` beside `drivenTrial`, and both dispatch. This is a
     CROSS-SUITE ITERATION PIN on a file this suite does not own — it exists
     so the foreign-site helper is proved wired against a real site, and the
     count is the incidental part. Its twin is DW-EVT-2 in
     tools/test-dwell-oracle.mjs, which pins the same number over the driven
     region alone; a third driven function must move both. */
  L.same('PV-X5', 'D54 — the foreign-site helper is wired and names a file:line:text site for the forbidden pattern',
    foreignSiteSet(DWELL_REL, DWELL.text, /\bdispatchEvent\s*\(/).length, 2);
  L.same('PV-X6', 'D46 — the two shipped module paths this suite reads are the ones it names',
    [ORACLE_REL, RUN_REL, SRC.text.includes('FREEZE_PHASE_MS'), RUN.text.includes('RAIL_GATE_SETTLE_MS')],
    ['tools/pose-oracle.mjs', 'tools/pose-run.mjs', true, true]);
}

SENT.reach('ledger');
let code_ = L.report();

/* ==================================================================== *
 * --prove-failure — every registered pin, driven red by a perturbation of
 * its own registered input. Each names the axis it moves (D50) and the
 * elements it moves (gate 4).
 *
 * THE NULL MUTANT COMES FIRST. `PV-NULL` perturbs the recorded matrix in a
 * way that must NOT be scored as a mutation: it is the control that proves
 * gate 2 is live, and it is written first so that a reader sees the harness
 * refusing before it sees the harness killing.
 * ==================================================================== */

const bump = (t, from, to) => mutateText(t, 'fixture', from, to);

const MUTANTS = [
  /* --- the recorded matrix ------------------------------------------ */
  ['PM1', 'PV-REGION', 'a region root the page never rendered is claimed by the recording', null,
    (i) => ({ text: bump(i.text, '"nav.j-rail|', '"nav.j-phantom|') })],
  ['PM2', 'PV-SHAPE', 'one row gains a cell — the reader shape drifted', ['cellWidths'],
    (i) => ({ text: bump(i.text, '|00001505",', '|00001505|extra",') })],
  ['PM3', 'PV-DIGESTS', 'one cell of one row of one pose changes', null,
    (i) => ({ text: bump(i.text, '"nav.j-rail|nav', '"nav.j-rail|nAv') })],
  ['PM4', 'PV-VERDICTS', 'a pose that was EXACT across sessions is recorded as DIFFER', null,
    (i) => ({ text: bump(i.text, '"exact": true', '"exact": false') })],
  ['PM5', 'PV-EVIDENCE', 'the recorded run had a torn read and said so', ['torn'],
    (i) => ({ text: bump(i.text, '"tornReads": 0', '"tornReads": 3') })],
  ['PM6', 'PV-EVIDENCE', 'the recorded run\'s pointer positive control had failed', ['pointer'],
    (i) => ({ text: bump(i.text, '"positivePointer": true', '"positivePointer": false') })],

  /* --- the declared sets -------------------------------------------- */
  ['PS1', 'PV-SETS', 'a region root is dropped from the declared set', ['region'],
    (i) => ({ ...i, region: i.region.filter((r) => r !== 'aside.j-pop') })],
  ['PS2', 'PV-SETS', 'a pose cell is renamed', ['fields'],
    (i) => ({ ...i, fields: i.fields.map((f) => (f === 'opacity' ? 'alpha' : f)) })],
  ['PS3', 'PV-SETS', 'a scenario loses its Escape step — the key half of the input surface', ['scenarios'],
    (i) => ({ ...i, scenarios: i.scenarios.map((s) => (s.id === 'menu-escaped' ? { ...s, steps: s.steps.slice(0, 1) } : s)) })],
  ['PS4', 'PV-SETS', 'a placed pose is dropped', ['poses'],
    (i) => ({ ...i, poses: i.poses.filter((p) => p !== 'owned') })],

  /* --- the widening guard ------------------------------------------- */
  ['PX1', 'PV-EXCL-1', 'a future order excuses the rail ring by name — exactly the widening this pin exists for',
    ['entries', 'maskedCells'],
    (i) => ({ ...i, exclusions: [{ path: 'nav.j-rail/0/0/0', field: 'transform', why: 'it moves' }] })],
  ['PX2', 'PV-EXCL-1', 'a STALE exclusion is added — it silences nothing today and the wrong cell tomorrow',
    ['entries', 'unmatched'],
    (i) => ({ ...i, exclusions: [{ path: 'nav.j-gone/0', field: 'rect', why: 'stale' }] })],

  /* --- the arithmetic ----------------------------------------------- */
  ['PA1', 'PV-CMP', 'the row the "one moved cell" case is planted in loses the token the plant rewrites, so the comparison has nothing to find', [2, 3],
    (i) => ({ ...i, rows: i.rows.map((r, n) => (n === 3 ? r.replace('|visible|', '|collapse|') : r)) })],
  ['PA2', 'PV-CELLS', 'the row the cell reader names changes its ordinate', null,
    (i) => ({ ...i, rows: i.rows.map((r, n) => (n === 2 ? r.replace(/^[^|]+/, 'nav.j-rail/9/9') : r)) })],
  ['PA3', 'PV-DIGEST', 'two rows of the digested prefix are made equal, so a swap stops being visible', [1],
    (i) => ({ ...i, rows: i.rows.map((r, n) => (n === 1 ? i.rows[0] : r)) })],
  ['PA4', 'PV-REPRO', 'the row the disagreement is planted in loses the token the plant rewrites', ['badCells', 'badExact'],
    (i) => ({ ...i, rows: i.rows.map((r, n) => (n === 5 ? r.replace('|visible|', '|collapse|') : r)) })],
  ['PA5', 'PV-SPLIT', 'the first recorded row\'s text digest changes', ['textHash'],
    (i) => ({ ...i, rows: i.rows.map((r, n) => (n === 0 ? `${r.slice(0, -1)}f` : r)) })],

  /* --- the rail gates, read from live production source -------------- */
  ['PR1', 'PV-RAIL-GATES', 'the rail\'s follow deadline grows past the wait — the case this pin exists to catch',
    ['clearsFollow', 'followReadyMs'],
    (i) => ({ text: mutateText(i.text, 'PR1', 'Date.now() + 720', 'Date.now() + 4200') })],
  ['PR2', 'PV-RAIL-GATES', 'the j-rail-turn timer grows past the wait', ['clearsTurn', 'turnTimerMs'],
    (i) => ({ text: mutateText(i.text, 'PR2', '        syncAt();\n      }, 500);', '        syncAt();\n      }, 9000);') })],

  /* --- D63 ----------------------------------------------------------- */
  ['PT1', 'PV-TRUST', 'a torn read is present in the BASE evidence — the clean row stops being clean, and every cause '
    + 'listed after the tear is displaced by it, which is what an ordered cause list is for',
    ['clean', 'empty', 'predicate', 'sameTree', 'stale', 'thin'],
    (i) => ({ clean: { ...i.clean, tornReads: 2 } })],

  /* --- the event path ------------------------------------------------ */
  ['PE1', 'PV-EVT-1', 'the driven region reaches for a placement instead of a click — PAGE-01\'s setProgress sweep, in a DOM harness',
    null, (i) => ({ text: mutateText(i.text, 'PE1', 'await page.mouse.move(box.x, box.y);', 'await page.evaluate(() => window.journey.placeAt(0.5));') })],
  ['PE2', 'PV-EVT-1', 'the driven region synthesises an untrusted event', null,
    (i) => ({ text: mutateText(i.text, 'PE2', 'await page.keyboard.press(step.key);', 'await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k })), step.key);') })],
  ['PE3', 'PV-EVT-2', 'the key half of the input surface is removed — the positive control goes to three', null,
    (i) => ({ text: mutateText(i.text, 'PE3', 'await page.keyboard.press(step.key);', 'void step.key;') })],
  ['PE4', 'PV-EVT-3', 'the forbidden pattern is proved non-blind against a file that really contains both families', null,
    (i) => ({ text: mutateText(i.text, 'PE4', 'window.journey.scrollTo(fromP);', 'window.journey.place(fromP);') })],

  /* --- the page-side half read as source ----------------------------- */
  ['PP1', 'PV-READER', 'the pose reader starts consulting a clock', ['clocks'],
    () => ({ read: (a) => { void performance.now(); void 'getBoundingClientRect getComputedStyle toFixed(3)'; return pvRead(a); } })],
  ['PP2', 'PV-READER', 'the pose reader stops reading computed style, so opacity and transform become whatever the inline style says', ['present'],
    () => ({ read: (a) => { const s2 = a; return s2.getBoundingClientRect ? [] : ['toFixed(3)']; } })],
  ['PP3', 'PV-FREEZER', 'the pinned phase becomes a tuning knob rather than a constant', ['phase'],
    (i) => ({ ...i, phase: 250 })],
  ['PP4', 'PV-FREEZER', 'the thin-vector floor is lowered below the shipped pose', ['floor'],
    (i) => ({ ...i, floor: 1 })],
  ['PP5', 'PV-PAGESIDE', 'an input kind is dropped — a scenario step of that kind would become a silent no-op', ['kinds'],
    (i) => ({ ...i, kinds: i.kinds.filter((k) => k !== 'key') })],
];

if (PROVE) {
  /* ---- THE NULL-MUTANT CONTROL, FIRST ----------------------------- *
   * Before any mutant is believed to have killed anything, an INERT
   * perturbation is run through the same sweep. It must be REFUSED at gate 2
   * ("the perturbation moved the reader's input") and scored `bad`, not
   * `red`. Without this, "29/29 red" and "29/29 no-ops that happened to
   * differ from the expectation" are the same line of output.
   * ------------------------------------------------------------------ */
  console.log('\n--prove-failure — NULL-MUTANT CONTROL, before anything is believed killed');
  const nullOut = sweep([M('PV-EXCL-1', 'PV-NULL — an INERT perturbation: a shallow copy that changes nothing',
    ['entries'], (i) => ({ ...i }))]);
  L.discard();
  L.same('PV-M0', 'D50/D74 gate 2 — an inert perturbation is REFUSED as a no-op, never scored as a kill',
    [nullOut.bad, nullOut.gates.inputNoOp, nullOut.gates.outputStill, nullOut.total],
    [1, ['PV-EXCL-1'], [], 1],
    'a sweep that cannot tell an inert edit from a real one reports its whole budget as falsifiable '
    + 'while mutating nothing — D70\'s measured shape, in the other direction');

  console.log('\n--prove-failure — every pin above, driven red by a perturbation of its own registered input');
  let out;
  try {
    out = sweep(MUTANTS.map(([tag, id, moves, keys, perturb]) => M(id, `${tag} — ${moves}`, keys, perturb)));
  } finally {
    SENT.reach('sweep');
  }
  L.discard();
  L.same('PV-M1', 'D58 — mutants that did not drive their declared pin on its declared axis', out.bad, 0);
  L.same('PV-M2', 'D45 — every mutant ran (iteration pin)', out.total, MUTANTS.length);
  L.same('PV-M3', 'D58 — registered pins carrying no mutant', out.uncovered, []);
  L.same('PV-M4', 'D70 — harness faults raised by a guard, named separately from a failed gate', out.faults, []);
  /* D58's corollary: "equivalent-by-contract" is a legitimate verdict for a
     surviving mutant, but ONLY when it is named as such. This order declares
     no such survivor, so the observed survivor set must be empty — asserted
     as a SET rather than inferred from a count of zero. */
  L.same('PV-M5', 'D58 — the SURVIVOR set equals the declared equivalence set (empty: no mutant here is equivalent-by-contract)',
    [...out.gates.outputStill, ...out.gates.baselineMismatch, ...out.gates.axisMismatch,
      ...out.gates.inputNoOp, ...out.gates.unregistered, ...out.gates.threw].sort(), []);
  code_ = L.report() || code_;
  if (out.faults.length) throw new HarnessFault(out.faults.join('; '));
}

process.exit(code_);
