/* ==================================================================== *
 * tools/test-dwell-oracle.mjs — PAGE-01.
 *
 * THE GATE FOR tools/dwell-oracle.mjs — the program's first instrument that
 * delivers an event to the page, and its first assertion about where a
 * chapter's rest sits within its own road.
 *
 * WHAT IS IN THIS GATE AND WHAT IS NOT — read this first, because the
 * difference is the honest limit of the whole order.
 * -------------------------------------------------------------------
 * IN THE GATE (`npm run check`, no browser, no server, ~50 ms):
 *   · THE REST-POSITION PIN, read from journey/structure.js ITSELF. This is
 *     live: the day someone moves `owned`'s `segVh: [2.27, 7.00]`, or moves
 *     any chapter's rest within its own road, this suite goes red. S-4 named
 *     that value as "the entire reason this uniform rule has a non-uniform
 *     consequence" and as measured by nothing. It is measured now.
 *   · THE ORACLE ITSELF — every decision function in dwell-oracle.mjs, run
 *     over a RECORDED trace of a real driven session, with 20 mutants.
 *   · THE EVENT-PATH SCAN — that the driven region moves the ride with
 *     dispatched events and with nothing else.
 *
 * NOT IN THE GATE, and this must not be misread:
 *   · THE LIVE DWELL MEASUREMENT. A recorded trace is a recording. This
 *     suite proves the ORACLE is right about the trace; it CANNOT observe
 *     that today's page still behaves as the trace says. That is
 *     `npm run test:dwell`, which needs Chrome and a server, exactly as
 *     `npm run test:browser` does and for the same reason.
 *   · Stating this plainly rather than letting a green here read as a green
 *     page is the point of the paragraph. D45's shape is a check that never
 *     runs over its subject; a frozen recording is a subject that stopped
 *     moving, which is the same failure wearing better clothes.
 *
 * WHAT THE DWELL CONTRACT DOES NOT ASSERT, AND WHY
 * -----------------------------------------------
 * It does NOT assert "every rest anchor the ride passes is dwelt at."
 * That assertion is TRUE OF NOTHING — DEF-OWNED measured the skip at the
 * base commit `6967a36` on the SAME TRIALS as the current tree, 6/11 at
 * Connect and 5/11 at Owned both sides. `repeatAnchor` is deliberate and
 * documented ("one gesture / one additional section") and uniform across
 * chapters. A gate that is red for pre-existing intended behaviour is
 * disabled by the first person it inconveniences, and then it protects
 * nothing at all.
 *
 * It pins the rule AS DESIGNED instead:
 *   DW-C1  at most ONE additional section per gesture (a BOUND);
 *   DW-C2  the same one, measured over the visitor's HANDS-OFF stretch
 *          alone — the quiet phase of a gesture that began at a standstill
 *          (a BOUND);
 *   DW-C3  the SET of anchors ever swept past, as it stands today.
 * Two sections in one gesture goes red. The shipped behaviour does not.
 *
 * TWO STRONGER BOUNDS WERE WRITTEN AND FALSIFIED ON THE LIVE PAGE, and that
 * is the most useful thing this order measured.
 *
 *   "No rest is swept past under a pause >= 2,000 ms" — S-4's dwell/pause
 *   table read as a threshold. FAILED at trial 4: a 2,652 ms pause, and
 *   `connect` swept past anyway, because that trial's weak gesture (deltaY
 *   68 x 9) left the ride still ~0.1 s short of the rest when the next
 *   gesture arrived. The pause is a PROXY for "the resolution had landed",
 *   and the proxy loses whenever a glide is slower than the pause.
 *
 *   "A gesture from a standstill sweeps past NOTHING" — the mechanism read
 *   directly, since `repeatAnchor` needs an in-flight resolution to
 *   retarget. FAILED at trial 2: a 41-event, 1,230 ms stream from the
 *   `inspire` rest, then 444 ms of silence in which the ride crossed
 *   `connect` without stopping. `COMMIT_STREAM_MIN` is 4, so ONE long
 *   unbroken stream earns `carrying()` by itself and spends the additional
 *   section inside a single gesture.
 *
 * Both were shipped-then-retracted in an hour rather than shipped as gates.
 * A rule that is red on the page it describes protects nothing, and a bound
 * asserted without being measured is a preference.
 *
 * Run:
 *   node tools/test-dwell-oracle.mjs                 — the ledger
 *   node tools/test-dwell-oracle.mjs --prove-failure — and the mutants
 * ==================================================================== */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HarnessFault, fault, mutateText, sliceBetween, createLedger, armSentinel } from './instrument-ledger.mjs';
import { createRegistry, M } from './mutant-registry.mjs';
import {
  code, literalPredicateRe, literalPredicateHits, foreignSiteSet,
  scanTautologyAst, TAUTOLOGY_FIXTURES,
} from './self-controls.mjs';
import { JOURNEY_SCHEMA } from '../journey/structure.js';
import {
  ANCHORS, DEFAULT_CONTRACT, restRoadTable, restAnchors, gestureConfigs,
  truncateAtWrap, dwellTable, passedAnchors, analyseTrial, evaluateContract, trustVerdict,
  classifyCrossings, landings, proxyDisagreement,
  stepsAdvanced, transitWindows, dualDelaysMs, transitGestureConfigs, evaluateDual,
} from './dwell-oracle.mjs';

const SELF_PATH = fileURLToPath(import.meta.url);
const TOOLS = dirname(SELF_PATH);
const ORACLE_REL = 'tools/dwell-oracle.mjs';
const ORACLE_PATH = join(TOOLS, 'dwell-oracle.mjs');
/** D82 — a fixture relocated into tools/ joins every sweep that owns tools/:
 *  eslint globs `tools/**\/*.js`, check-cycles has `tools` in SRC_ROOTS. This
 *  file is read only as TEXT and takes an inert extension so it is data to
 *  the sweeps as well as to this suite. */
const TRACE_PATH = join(TOOLS, 'dwell-oracle.trace.json.txt');

const PROVE = process.argv.includes('--prove-failure');
const SENT = armSentinel('test-dwell-oracle', ['ledger', 'sweep'], (p) => p === 'ledger' || PROVE);

const L = createLedger();
const { pin, sweep } = createRegistry({ ledger: L, fault });

console.log('tools/test-dwell-oracle.mjs — the rest-dwell oracle, its route geometry, and its event path\n');

/* ==================================================================== *
 * INPUTS. A mutant perturbs one of these; nothing writes to the tree.
 * ==================================================================== */

const SCHEMA = { chapters: JSON.parse(JSON.stringify(JOURNEY_SCHEMA.chapters)) };
const SEEDING = { seed: 7, trials: 11 };
const TRACE = { text: readFileSync(TRACE_PATH, 'utf8') };
const SRC = { text: readFileSync(ORACLE_PATH, 'utf8') };

/* --- readers -------------------------------------------------------- */

const roadTable = (i) => restRoadTable(i.chapters);
const ownedRoad = (i) => restRoadTable(i.chapters).find((r) => r.id === 'owned');
const anchorPs = (i) => restAnchors(i.chapters).map((a) => a.p);
const configs = (i) => gestureConfigs(i.seed, i.trials);

/** D63 — a trace that will not parse yields a typed refusal, never an empty
 *  run list that would report "0 violations" and pass forever. */
function traceOf(i) {
  let t;
  try { t = JSON.parse(i.text); } catch (e) { fault(`the recorded trace does not parse — ${e.message}`); }
  if (!t || !Array.isArray(t.runs) || t.runs.length === 0) fault('the recorded trace carries no runs');
  return t;
}
const outcome = (i) => evaluateContract(traceOf(i).runs);
const dwellRows = (i) => outcome(i).rows.map((r) => `${r.t} :: ${JSON.stringify(r.dwell)}`);
const judgedRows = (i) => outcome(i).rows.map((r) => `${r.t} :: [${r.judged}]`);
const sweptRows = (i) => outcome(i).rows.map((r) => `${r.t} :: [${r.swept}]`);
const windowRows = (i) => outcome(i).rows.map((r) => r.maxSweptPerWindow);
const violationsOf = (i) => outcome(i).violations;
const everSweptOf = (i) => outcome(i).everSwept;

/* --- the POST-FIX law's readers (DWELL-G1) --------------------------- *
 *
 * A NOTE ON TWO NAMESPACES THAT NOW LOOK ALIKE, because a reader who
 * conflates them will misread every row below. `DW-C1`..`DW-C6` are ASSERTION
 * IDS IN THIS SUITE and have been since PAGE-01; the ledger cites `DW-C3` as
 * "a set" in that sense. `DW-C1`..`DW-C5` are ALSO the names the design
 * (§5.1) gives the CONTRACT RULES that dwell-oracle.mjs emits in its
 * violation strings. The ids were not renamed because renaming them would
 * falsify citations already on the record. The rule-name reading is the one
 * inside a violation string; every other occurrence is an assertion id.
 *
 * The post-fix law's own assertions carry `DW-LAW-*` ids for that reason. */

const machineOwnedRows = (i) => outcome(i).rows.map((r) => `${r.t} :: [${r.machineOwned.map((c) => `${c.anchor}/${c.mechanism}`)}]`);
const mechanismCensusOf = (i) => outcome(i).margin.mechanismCensus;
const shortLandingRows = (i) => outcome(i).rows.map((r) => `${r.t} :: [${r.shortLandings.map((s) => `${s.id}/${s.ms}`)}]`);
/** DW-C1/DW-C2 ALONE — the historical bounds, on the axis PAGE-01 pinned
 *  them on. The recording is a PRE-FIX one (committed 2026-08-22, a day
 *  before the queue fix landed), so the post-fix rules red all over it by
 *  design; separating the readers keeps the historical green comparable
 *  instead of drowning it. */
const boundViolationsOf = (i) => violationsOf(i).filter((v) => v.startsWith('DW-C1') || v.startsWith('DW-C2'));
const lawViolationsOf = (i) => violationsOf(i).filter((v) => v.startsWith('DW-C3') || v.startsWith('DW-C4'));

/* --- the driven-region reader (D46 / the event-path scan) ------------ */

const REGION_START = '/* --- THE DRIVEN REGION ----';
const REGION_END = '/* --- END OF DRIVEN REGION ----';
/** A progress setter — the thing the coordinator's failed sweep used and the
 *  thing this instrument must never use to make the ride travel. */
const SETTER_RE = () => /\.(?:scrollTo|flyTo|setProgress|wrap)\s*\(/g;
const DISPATCH_RE = () => /\bdispatchEvent\s*\(/g;

/** The driven region, comment-stripped. The DELIMITERS are comments, so they
 *  are located in raw source; the CONTENT is stripped before it is scanned. */
function regionOf(i) {
  return code(sliceBetween(i.text, 'driven-region', REGION_START, REGION_END));
}
const settersInRegion = (i) => (regionOf(i).match(SETTER_RE()) || []).length;
const dispatchesInRegion = (i) => (regionOf(i).match(DISPATCH_RE()) || []).length;
/* RE-KEYED `file :: line :: text` -> `file :: text` (D188/D93), 2026-08-26.
   `foreignSiteSet` stamps a line number unconditionally, which is correct for
   a STABLE foreign file and wrong for one this programme edits: retiring the
   landing beat moved this site from 1061 to 1029 and DW-EVT-3 reddened over a
   RENUMBERING rather than over a setter appearing where none may be. The text
   is the statement the control has always named. D188's guard replaces what
   the line gave for free — each retained text must match EXACTLY ONE site, or
   the key is ambiguous and this refuses rather than folding two sites into one
   row and reporting the fold as a clean set. */
const settersInFile = (i) => {
  const rows = foreignSiteSet(ORACLE_REL, i.text, /\.(?:scrollTo|flyTo|setProgress|wrap)\s*\(/)
    .map((r) => { const [file, , ...text] = r.split(' :: '); return `${file} :: ${text.join(' :: ')}`; });
  const dup = rows.find((r, n) => rows.indexOf(r) !== n);
  if (dup) fault(`settersInFile: ${JSON.stringify(dup)} matches more than one site in ${ORACLE_REL} — an ambiguous text key, not a hit`);
  return rows;
};

/* ==================================================================== *
 * 1. ROUTE GEOMETRY — S-4's second structural gap, closed.
 *
 * "Nothing asserts where a chapter's rest sits within its own road." These
 * four pins read journey/structure.js's shipped manifest, so they are the
 * one part of this order that watches the live tree rather than a recording.
 * EXACT: rational arithmetic on the shipped literals, no rounding anywhere.
 * ==================================================================== */

pin('DW-ROAD', 'EXACT — where every chapter\'s canonical rest sits within its own scroll road',
  roadTable, SCHEMA, [
    { id: 'mission', scrollVh: 3.5, beforeVh: 0, afterVh: 3.5, restAt: '0/3.5' },
    { id: 'inspire', scrollVh: 6.7, beforeVh: 3.5, afterVh: 3.2, restAt: '3.5/6.7' },
    { id: 'connect', scrollVh: 10.85, beforeVh: 8, afterVh: 2.85, restAt: '8/10.85' },
    { id: 'owned', scrollVh: 9.27, beforeVh: 2.27, afterVh: 7, restAt: '2.27/9.27' },
    { id: 'final', scrollVh: 10.6, beforeVh: 10, afterVh: 0.6, restAt: '10/10.6' },
  ],
  'a chapter\'s rest moving within its own road changes how much of that chapter a swept-past '
  + 'rest costs the visitor — the quantity S-4 identified and nothing in the tree measured');

pin('DW-ROAD-OWNED', 'EXACT — `owned` alone: the 24% rest and the 7.00 vh of road behind it (D61 — pin the part, not only the sum)',
  ownedRoad, SCHEMA, { id: 'owned', scrollVh: 9.27, beforeVh: 2.27, afterVh: 7, restAt: '2.27/9.27' },
  'S-4: skipping Connect\'s rest costs 26% of Connect; skipping Owned\'s costs 76% of Ownership — '
  + '5,600 px inside one 13,600 px glide, the largest unseen stretch on the route. '
  + 'THAT NUMBER SHOULD NOT BE FREE TO CHANGE SILENTLY, and until this pin it was.');

pin('DW-ASYM', 'EXACT — the asymmetry itself: which chapter holds the most road behind its own rest, and how much',
  (i) => {
    const t = restRoadTable(i.chapters);
    const worst = t.reduce((a, b) => (b.afterVh > a.afterVh ? b : a));
    return { id: worst.id, afterVh: worst.afterVh, ofOwnRoad: `${worst.afterVh}/${worst.scrollVh}` };
  },
  SCHEMA, { id: 'owned', afterVh: 7, ofOwnRoad: '7/9.27' },
  'the rule repeatAnchor applies is uniform; this is the value that makes its consequence not uniform');

pin('DW-ANCHORS', 'EXACT — the five rest anchors, re-derived from the manifest rather than copied from the probe',
  anchorPs, SCHEMA, [0, 0.26, 0.523, 0.725, 0.97],
  'DEF-OWNED recomputed these under node from both trees and got the same five doubles; '
  + 'this is the check that the ANCHORS literal in dwell-oracle.mjs is still those doubles');

L.same('DW-ANCHORS-LIT', 'D46 — the ANCHORS literal the oracle ships equals the manifest-derived anchors (a positive control on the pin above)',
  ANCHORS.map((a) => a.p), anchorPs(SCHEMA));

/* ==================================================================== *
 * 2. THE GESTURE GENERATOR — EXACT.
 *
 * DEF-OWNED's LCG, bit for bit, so its base-vs-current table and anything
 * measured by this instrument describe the same eleven trials.
 * ==================================================================== */

pin('DW-SEED', 'EXACT — seed 7 x 11 trials yields DEF-OWNED\'s eleven gesture configurations, unchanged',
  configs, SEEDING, [
    { t: 1, delta: 215, count: 18, iv: 20, pause: 2816, gestures: 6 },
    { t: 2, delta: 198, count: 41, iv: 30, pause: 444, gestures: 7 },
    { t: 3, delta: 115, count: 14, iv: 32, pause: 403, gestures: 5 },
    { t: 4, delta: 68, count: 9, iv: 24, pause: 2652, gestures: 6 },
    { t: 5, delta: 253, count: 9, iv: 22, pause: 1539, gestures: 5 },
    { t: 6, delta: 292, count: 9, iv: 27, pause: 630, gestures: 4 },
    { t: 7, delta: 246, count: 36, iv: 28, pause: 2376, gestures: 7 },
    { t: 8, delta: 253, count: 7, iv: 15, pause: 641, gestures: 6 },
    { t: 9, delta: 160, count: 18, iv: 27, pause: 1064, gestures: 7 },
    { t: 10, delta: 205, count: 14, iv: 18, pause: 1743, gestures: 5 },
    { t: 11, delta: 138, count: 40, iv: 22, pause: 1168, gestures: 6 },
  ],
  'if this moves, nothing measured by this instrument is comparable to DEF-OWNED\'s base-tree table');

/* ==================================================================== *
 * 3. THE ORACLE OVER A RECORDED TRACE.
 *
 * EXACT given the fixture: every row below is a deterministic function of
 * the recorded bytes. The BOUNDS are DW-C1/DW-C2/DW-C3, and they are marked.
 * ==================================================================== */

/* D46 — the inputs pin. INPUTS, not matches: a stale path, a truncated
   recording or a moved fixture must not read as "no violations". */
{
  const t = traceOf(TRACE);
  L.same('DW-IN-1', 'D46 — the trace fixture read back as the recording this order made (origin, seed, viewport, trial count)',
    [t.origin, t.seed, t.trials, t.fromP, t.viewport.join('x'), t.runs.length],
    ['http://localhost:8177', 7, 11, 0.26, '1280x800', 11]);
  L.same('DW-IN-2', 'D46 — the recording carried its own positive control and a clean input verdict',
    [t.evidence.positiveControl, t.evidence.hiddenTrials, t.evidence.consoleErrors, t.evidence.framesRendered > 0],
    [true, 0, 0, true]);
  L.same('DW-IN-3', 'D45 — the fixture is a non-trivial number of samples, pinned as a literal (iteration pin)',
    t.runs.reduce((a, r) => a + r.samples.length, 0), 3724);
}

pin('DW-DWELL', 'EXACT — the oracle\'s dwell table for every recorded trial',
  dwellRows, TRACE, [
    '1 :: {"mission":0,"inspire":174,"connect":828,"owned":1374,"final":5450}',
    '2 :: {"mission":0,"inspire":43,"connect":534,"owned":511,"final":445}',
    '3 :: {"mission":0,"inspire":79,"connect":0,"owned":0,"final":0}',
    '4 :: {"mission":0,"inspire":94,"connect":114,"owned":32,"final":4697}',
    '5 :: {"mission":0,"inspire":190,"connect":0,"owned":0,"final":40}',
    '6 :: {"mission":0,"inspire":124,"connect":75,"owned":0,"final":0}',
    '7 :: {"mission":0,"inspire":61,"connect":2326,"owned":2280,"final":236}',
    '8 :: {"mission":0,"inspire":66,"connect":31,"owned":82,"final":44}',
    '9 :: {"mission":0,"inspire":1904,"connect":0,"owned":0,"final":108}',
    '10 :: {"mission":0,"inspire":99,"connect":133,"owned":549,"final":4177}',
    '11 :: {"mission":0,"inspire":32,"connect":29,"owned":32,"final":25}',
  ]);

pin('DW-JUDGED', 'EXACT — the anchors each trial actually passed (departure and terminal anchors excluded, by design)',
  judgedRows, TRACE, [
    '1 :: [connect,owned]',
    '2 :: [connect,owned]',
    '3 :: [connect,owned]',
    '4 :: [connect,owned]',
    '5 :: [connect,owned]',
    '6 :: [connect,owned]',
    '7 :: [connect,owned]',
    '8 :: [connect,owned]',
    '9 :: [connect,owned]',
    '10 :: [connect,owned]',
    '11 :: [connect,owned]',
  ]);

pin('DW-SWEPT', 'EXACT given the recording — the skip behaviour AS IT STANDS TODAY, per trial',
  sweptRows, TRACE, [
    '1 :: []',
    '2 :: []',
    '3 :: [connect,owned]',
    '4 :: [connect,owned]',
    '5 :: [connect,owned]',
    '6 :: [connect,owned]',
    '7 :: []',
    '8 :: [connect,owned]',
    '9 :: [connect,owned]',
    '10 :: [connect]',
    '11 :: [connect,owned]',
  ],
  'this is deliberately NOT "no trial skips anything" — DEF-OWNED proved the same trials skip at the '
  + 'base commit. The row that must not change is WHICH trials, so a regression that makes skipping '
  + 'broader names itself instead of being absorbed into a rate');

pin('DW-C1', 'BOUND (per-trial reading) — sections swept past by any single gesture: "one gesture / one additional section"',
  windowRows, TRACE, [0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  'a 2 anywhere in this row is one gesture carrying the ride past two rests, which the design does not license');

pin('DW-C2', 'BOUND (per-trial reading) — sections swept during the QUIET phase of a gesture that began at a standstill',
  (i) => outcome(i).rows.map((r) => r.maxSweptFromRest), TRACE, [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  'the hands-off stretch, isolated: this is where "it scrolled through the section" is experienced, '
  + 'and a 2 here is a visitor carried past two rests without touching anything');

pin('DW-C2b', 'BOUND — the HISTORICAL contract violations over the recording: DW-C1 and DW-C2 together',
  boundViolationsOf, TRACE, [],
  'reads the two bound rules ALONE. It was `violationsOf` when the bounds were the whole contract; '
  + 'DWELL-G1 added the law rules, which red all over this pre-fix recording on purpose (DW-LAW-1), '
  + 'and pooling the two would have destroyed the historical green rather than adding to it');

/* ==================================================================== *
 * 3b. THE POST-FIX LAW OVER THE RECORDING — AND THE FIRST OF THE TWO
 * RED-PROOFS, PAID IN `npm run check` OVER FROZEN BYTES.
 *
 * The design (§5.3) asks for two proofs that the retuned contract can fail:
 * a staged pre-fix tree, and a staged mutant tree. Both are browser runs.
 * But THIS SUITE ALREADY SHIPS A PRE-FIX RECORDING: `dwell-oracle.trace
 * .json.txt` was committed 2026-08-22 (426dd44) and the queue fix landed
 * 2026-08-23 (8bb1042), so the eleven recorded trials are the behaviour the
 * owner reported, captured before it was fixed.
 *
 * So the tightened contract's sensitivity to the HISTORICAL FAULT is
 * provable here, deterministically, with no Chrome and no server — and it is
 * proved on the same axis the browser proof uses. 22 crossings, 14 of them
 * machine-owned: 64% of the crossings in that recording were distance the
 * visitor never earned. That is inside the design's predicted 30-75% band
 * for the pre-fix tree, derived independently.
 *
 * WHAT THIS DOES NOT PROVE, and the header's warning applies with full
 * force: a recording is a recording. These rows say the CONTRACT is right
 * about the pre-fix bytes. Whether TODAY's page still crosses that way is
 * `npm run test:dwell`, and nothing here can stand in for it.
 * ==================================================================== */

pin('DW-LAW-1', 'LAW (DW-C3) — every machine-owned crossing in the PRE-FIX recording, named with its mechanism',
  machineOwnedRows, TRACE, [
    '1 :: []',
    '2 :: []',
    '3 :: [owned/inflight-carry]',
    '4 :: [connect/inflight-carry,owned/inflight-carry]',
    '5 :: [connect/inflight-carry,owned/inflight-carry]',
    '6 :: [connect/inflight-carry,owned/inflight-carry]',
    '7 :: []',
    '8 :: [connect/inflight-carry,owned/inflight-carry]',
    '9 :: [connect/inflight-carry,owned/inflight-carry]',
    '10 :: [connect/quiet-carry]',
    '11 :: [connect/quiet-carry,owned/inflight-carry]',
  ],
  'THE RED-PROOF, AND THE POINT OF THE WHOLE ORDER. `sweptPerWindowMax: 1` scored this recording at '
  + 'ZERO violations — the gate for this category existed, ran over the owner\'s own reported behaviour, '
  + 'and was structurally incapable of failing. The same bytes now name fourteen violations, one per '
  + 'crossing, each with the mechanism that spent the distance');

{
  /* D46 — THE PARTITION CONTROL. Every violation the contract emits falls
     into exactly one of the two readers above, so DW-C2b's filter cannot be
     hiding a rule from view. Without this row, a rule whose prefix matched
     NEITHER filter would be asserted by nothing at all, and the split that
     protects the historical green would have become a place to lose one. */
  const all = violationsOf(TRACE);
  const bound = boundViolationsOf(TRACE);
  const law = lawViolationsOf(TRACE);
  L.same('DW-LAW-4', 'D46 — the bound and law readers PARTITION the violation list: nothing falls outside both',
    [all.length, bound.length, law.length, bound.length + law.length === all.length],
    [22, 0, 22, true],
    'fourteen DW-C3 crossings and eight DW-C4 abandoned landings over the pre-fix recording, and ZERO '
    + 'from the two bound rules — which is the finding stated as arithmetic: the contract that shipped '
    + 'saw none of this');
}

pin('DW-LAW-2', 'LAW — the mechanism census over the recording: how the twenty-two crossings divide',
  mechanismCensusOf, TRACE, { landing: 7, scrub: 1, 'inflight-carry': 12, 'quiet-carry': 2 },
  'the two LEGITIMATE mechanisms (landing, scrub) account for 8 of 22. A census rather than a rate '
  + 'because a rate over a stochastic fault passes by luck: 12 in-flight carries is twelve deterministic '
  + 'reds, and the day one of them becomes a `landing` this row says which one');

pin('DW-LAW-3', 'LAW (DW-C4) — landings that were DELIVERED and then abandoned inside the dwell floor',
  shortLandingRows, TRACE, [
    '1 :: []',
    '2 :: []',
    '3 :: []',
    '4 :: [connect/114,owned/32]',
    '5 :: []',
    '6 :: [connect/75]',
    '7 :: []',
    '8 :: [connect/31,owned/82]',
    '9 :: []',
    '10 :: [connect/133]',
    '11 :: [connect/29,owned/32]',
  ],
  'DISJOINT FROM DW-LAW-1 BY CONSTRUCTION: a crossing with zero contiguous dwell is a sweep and is '
  + 'C3\'s alone; this row is the other half — the ride DID stop, for 29 to 133 ms, and left. Trials 3, '
  + '5 and 9 appear in LAW-1 and not here for exactly that reason, which is what keeps the two counts '
  + 'from being one event reported twice');

{
  const out = outcome(TRACE);
  /* DW-BEAT WAS HERE, AND IT WENT WITH ITS SUBJECT (2026-08-26). Its job was
     the divergence between `DEFAULT_CONTRACT.restBeatMs` and the shipped
     `COMMIT_REST_BEAT_MS` — a restatement nobody compares is a memory, and it
     caught the copy failing to follow 300 -> 900. Both the constant and the
     restatement are now retired: there is no copy and nothing to diverge. The
     row below is the half that measured the RECORDING rather than the two
     literals, and it is unchanged. */
  L.same('DW-MARGIN', 'REPORTED, NOT ASSERTED — the shortest COMPOSED landing in the recording, against the floor it must clear',
    [out.margin.landings, out.margin.shortLandings, out.margin.minLandingMs, out.margin.crossings, out.margin.machineOwned],
    [7, 8, 511, 22, 14],
    'minLandingMs is the number the design asked to be measured and reported. On the pre-fix recording '
    + 'the seven composed landings all cleared 250 ms with the shortest at 511 — so the pre-fix page\'s '
    + 'failure was never a landing too short, it was a crossing with no landing at all');
  /* D88's second opinion, and it is honestly NULL here. */
  L.same('DW-PROXY', 'D63 — the p-proxy\'s second opinion over a recording made before the marks carried model state',
    [out.margin.proxy.observed, out.margin.proxy.disagree,
      proxyDisagreement({ marks: [{ kind: 'gesture-start', p: 0.26 }], anchors: ANCHORS })],
    [0, 0, null],
    'a recording with no `resolving` on its marks yields NULL — an honest "not observed" — never a 0 '
    + 'that would read as the proxy agreeing with a model state nobody recorded');
}

pin('DW-C3', 'SET — the anchors ever swept past across all eleven trials',
  everSweptOf, TRACE, ['connect', 'owned'],
  'connect and owned are the two mid-route rests a carried resolution can be retargeted across. '
  + 'A third id appearing here is new behaviour, not a worse rate of the old behaviour');

{
  const out = outcome(TRACE);
  /* REPORTED, NOT ASSERTED. This row exists so the falsified threshold stays
     on the record as a measurement rather than as a paragraph — if the page
     ever DID stop skipping under long pauses, this row moves and someone can
     re-open the question with data. */
  L.same('DW-C4', 'REPORTED, NOT ASSERTED — trials that paused >= 2,000 ms and still swept past a rest',
    [out.margin.longPauseTrials, out.margin.longPauseTrialsThatSwept, DEFAULT_CONTRACT.longPauseMs],
    [3, [4], 2000],
    'a NON-EMPTY second element is the counterexample to the threshold reading of S-4\'s dwell/pause table');
  L.same('DW-C5', 'the trials whose trace was truncated at a route wrap, named rather than silently absorbed',
    out.rows.filter((r) => r.wrapped).map((r) => r.t), [2, 5, 8, 11]);
  L.same('DW-C6', 'D63 — the trials in which the ride never moved at all, named (a still trial measured nothing)',
    out.margin.stillTrials, [],
    'the recorded sweep had one such trial in an earlier run: 36 wheel events dispatched, 0.000 travelled. '
    + 'It is a NAMED CAUSE in trustVerdict, so a live run containing one reports no number at all');
}

/* ==================================================================== *
 * 3c. THE POST-FIX LAW'S OWN DECISION FUNCTIONS, EACH DRIVEN INTO EVERY
 * ARM IT HAS.
 *
 * The rows above run the new rules over ONE recording, which exercises the
 * mechanisms that recording happens to contain. That is evidence about the
 * recording. These rows are evidence about the CLASSIFIER: each of the four
 * mechanism names is reached by a fixture built to land in it, and each
 * refusal branch is entered. D50's rule — a control that cannot reach its
 * own case is a claim, not a check — and the reason DO2's first draft was
 * caught reporting CANNOT FAIL over a case its fixture never touched.
 *
 * The anchors are the SHIPPED `ANCHORS`, so a fixture cannot drift into
 * describing a route the page does not have.
 * ==================================================================== */

const DWELL0 = Object.freeze({ mission: 0, inspire: 0, connect: 0, owned: 0, final: 0 });
const JUDGED2 = Object.freeze(['connect', 'owned']);
/** Parked at `inspire`; one gesture scrubs past `connect` under the
 *  visitor's own hand, hands off across `owned`, then a second gesture from
 *  mid-flight. Three of the four mechanisms, off one mark list. */
const MARKS_SCRUB = Object.freeze([
  { t: 0, p: 0.26, kind: 'gesture-start' },
  { t: 200, p: 0.60, kind: 'gesture-end' },
  { t: 700, p: 0.74, kind: 'gesture-start' },
  { t: 900, p: 0.80, kind: 'gesture-end' },
  { t: 1600, p: 0.98, kind: 'settle-end' },
]);
/** The class's own shape: gesture two BEGINS at p 0.60, which is no rest, so
 *  every metre it spends was banked by the resolution still in flight. */
const MARKS_INFLIGHT = Object.freeze([
  { t: 0, p: 0.26, kind: 'gesture-start' },
  { t: 200, p: 0.50, kind: 'gesture-end' },
  { t: 700, p: 0.60, kind: 'gesture-start' },
  { t: 900, p: 0.80, kind: 'gesture-end' },
]);
const CROSS = { marks: MARKS_SCRUB, dwell: DWELL0 };
const crossingsOf = (i) => classifyCrossings({ marks: i.marks, anchors: ANCHORS, dwell: i.dwell, judged: JUDGED2 })
  .map((c) => `${c.anchor}/${c.startState}/${c.phase}/${c.mechanism}/${c.machineOwned ? 'MACHINE' : 'earned'}`);

pin('DW-MECH-1', 'the two mechanisms a visitor EARNS — a scrub under their own hand, and a landing that composed',
  crossingsOf, CROSS, [
    'connect/LANDED/input/scrub/earned',
    'owned/LANDED/quiet/quiet-carry/MACHINE',
  ],
  'the crossing at `connect` happens during the INPUT phase of a gesture that began at a rest: the '
  + 'page is moving under their hand and there is no earlier flight to inherit banked distance from. '
  + 'DW-C2\'s header exempted exactly this case and for exactly this reason');

pin('DW-MECH-2', 'the SAME crossing at `owned`, now dwelt at for 900 ms — a landing, and no longer machine-owned',
  crossingsOf, { marks: MARKS_SCRUB, dwell: { ...DWELL0, owned: 900 } }, [
    'connect/LANDED/input/scrub/earned',
    'owned/LANDED/quiet/landing/earned',
  ],
  'the positive control for DW-MECH-1: the two fixtures differ in ONE number, the dwell at `owned`, so '
  + 'the verdict provably turns on whether the visitor saw the rest and on nothing else');

pin('DW-MECH-3', 'the class itself — a gesture that begins mid-flight spends distance it never earned',
  crossingsOf, { marks: MARKS_INFLIGHT, dwell: DWELL0 }, [
    'connect/LANDED/quiet/quiet-carry/MACHINE',
    'owned/IN-FLIGHT/input/inflight-carry/MACHINE',
  ],
  'def-skip/ measured this cell at 98.4% against 1.0% from a landed state. `inflight-carry` is reports '
  + '1-3\'s larger expression and `quiet-carry` is the 1.0% cell — the skip `sweptPerWindowMax: 1` used '
  + 'to license. Four mechanism names, and DW-MECH-1/2/3 between them reach all four');

pin('DW-LAND-1', 'DW-C4\'s two outcomes off one number: a landing that composed, and the same landing abandoned',
  (i) => {
    const s = [[0, 0.26], [100, 0.523], [200, 0.523], [300, 0.725], [400, 0.9]];
    const at = (ms) => landings({ samples: s, anchors: ANCHORS, judged: JUDGED2, dwell: { connect: ms, owned: 0 } });
    return [JSON.stringify(at(i.long)), JSON.stringify(at(i.shortMs)), JSON.stringify(at(0))];
  }, { long: 300, shortMs: 120 }, [
    '{"held":[{"id":"connect","ms":300}],"short":[]}',
    '{"held":[],"short":[{"id":"connect","ms":120}]}',
    '{"held":[],"short":[]}',
  ],
  'THE THIRD ROW IS THE ONE THAT MATTERS: at zero contiguous dwell the ride passed THROUGH the '
  + 'tolerance band between two frames and never landed at all, so C4 says nothing and C3 owns the '
  + 'event. Without that line the two rules would report one crossing twice and the counts this gate '
  + 'is denominated in would be inflated');

pin('DW-DUAL-1', 'DW-C5 — the dual, both directions off one integer, and the outcome that is neither',
  (i) => {
    const mk = (endP) => ({
      from: 'inspire', to: 'connect', delayMs: 650, startIdx: 1, dir: 1, endP, midFlight: { resolving: true },
    });
    const r = evaluateDual(i.ends.map(mk));
    return [r.legs, r.violations.map((v) => v.slice(0, 13))];
  }, { ends: [0.523, 0.725, 0.26, 0.6] }, [
    [1, 2, 0, null],
    ['DW-C5 SKIP in', 'DW-C5 REFUSED', 'DW-C5 inspire'],
  ],
  'ONE LEG IS THE CONTRACT since docs/code-health/2026-08-26-a7-ruling.md Ruling 1, and it yields '
  + 'nothing: flick A was born at a rest and bought its leg, flick B was born in flight and was spent '
  + 'at A\'s landing. TWO is the SKIP — owner reports 1-4, and #26 in the owner\'s words, "So you '
  + 'didn\'t fix it? This is when scrolling through"; it is the row a restored `intent.g === gSerial &&` '
  + 'drives. ZERO is the REFUSAL — the from-rest flick that opened the run bought nothing, DEFECT-02\'s '
  + 'true class, which MOBILE-OBSERVE called the new defect wearing the old one\'s clothes. THE TWO REDS '
  + 'ARE DIFFERENT FAULTS and the messages say which: a gate naming only the SKIP row would let the next '
  + 'fix trade one owner complaint for the other in silence, so both come off the same number');

pin('DW-DUAL-2', 'D63 — a run whose second stream arrived AFTER the resolution landed is DISCARDED, not pooled',
  (i) => {
    const mk = (endP, resolving) => ({
      from: 'inspire', to: 'connect', delayMs: i.delayMs, startIdx: 1, dir: 1, endP, midFlight: { resolving },
    });
    const r = evaluateDual([mk(0.523, true), mk(0.725, i.secondResolving)]);
    return [r.legs, r.violations.length, r.rows.map((x) => x.midFlightProved)];
  }, { delayMs: 650, secondResolving: false }, [[1, 2], 0, [true, false]],
  'the mirror of flick-probe.mjs, which refused any trial where the ride was NOT idle before its single '
  + 'flick. This probe is the other experiment and refuses the opposite way: the 2-leg row would be a '
  + 'loud SKIP violation if it were judged, and it is not judged, because a second flick into a landed '
  + 'ride measured the from-standstill case. `legs` still reports it — discarded is not hidden');

pin('DW-STEPS-1', 'the leg arithmetic on a LOOPED route, including the wrap and the outcome that is not a rest',
  (i) => [
    stepsAdvanced(1, 0.725, 1), stepsAdvanced(1, 0.97, 1),
    stepsAdvanced(3, 0.523, -1), stepsAdvanced(i.fromFinal, 0.26, 1), stepsAdvanced(1, 0.6, 1),
  ], { fromFinal: 4 }, [2, 3, 1, 2, null],
  'the fourth is the WRAP: forward from `final` past `mission` to `inspire` is two legs, not minus '
  + 'three. The fifth is a ride that stopped at p 0.6, which is no anchor — reported as null rather '
  + 'than rounded into whichever neighbour is closer, because a rounded null is an invented measurement');

pin('DW-WIN-1', 'the cadence, DERIVED from the route rather than from a remembered millisecond',
  (i) => {
    const transitOf = (lo) => (Math.abs(lo - 0.26) < 1e-9 ? i.inspireS : (Math.abs(lo - 0.523) < 1e-9 ? 0 : 1.8));
    return dualDelaysMs({ anchors: ANCHORS, transitOf }).map((w) => `${w.from}->${w.to} ${w.declared} ${w.ms} [${w.delays}]`);
  }, { inspireS: 1.3 }, [
    'mission->inspire 1.8 1800 [450,900,1350]',
    'inspire->connect 1.3 1300 [325,650,975]',
    'connect->owned null 1800 [450,900,1350]',
    'owned->final 1.8 1800 [450,900,1350]',
  ],
  'every delay is a FRACTION of that boundary\'s own window, so a TRANSIT_S edit that lengthens a leg '
  + '(and thereby WIDENS the window this defect lives in) moves the probe with it. A hard-coded delay '
  + 'would quietly start arriving after the landing and measure the standstill case — a coverage loss '
  + 'that reads as a green. `connect->owned` declares nothing and says so with a null rather than '
  + 'passing the 1.8 band off as a declaration');

pin('DW-WIN-2', 'the transit-derived sweep is a SECOND generator — `gestureConfigs` is bit-identical to DEF-OWNED\'s',
  (i) => [
    transitGestureConfigs(i.seed, 4, 1300).map((c) => c.pause),
    gestureConfigs(i.seed, 4).map((c) => c.pause),
    transitGestureConfigs(i.seed, 4, 1300).map((c) => c.delta).join() === gestureConfigs(i.seed, 4).map((c) => c.delta).join(),
  ], { seed: 7 }, [[260, 520, 780, 1040], [2816, 444, 403, 2652], true],
  'the pauses are redrawn inside the declared window and EVERYTHING ELSE is untouched, which is what '
  + 'lets the eleven comparable trials keep their meaning while the new cadence covers early, mid and '
  + 'late flight at every boundary');

/* D63/D70 — every refusal branch the new functions carry, entered. */
{
  const refuses = (thunk, needle) => {
    try { thunk(); return 'no refusal'; } catch (e) {
      if (!(e instanceof HarnessFault)) return `untagged ${e.constructor.name}`;
      return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 60)}`;
    }
  };
  L.same('DW-R9', 'D63 — the crossing classifier refuses a trial that drove nothing rather than reporting zero machine-owned crossings',
    refuses(() => classifyCrossings({ marks: [MARKS_SCRUB[0]], anchors: ANCHORS, dwell: DWELL0, judged: JUDGED2 }), 'nothing was driven'),
    'HarnessFault',
    'ZERO IS THE PASSING VALUE for this rule, so an empty input that returned zero would be a gate '
    + 'that passes hardest when it has observed least — the exact shape D63 exists to forbid');
  L.same('DW-R10', 'D63 — the landing reader refuses an empty sample list',
    refuses(() => landings({ samples: [], anchors: ANCHORS, judged: JUDGED2, dwell: DWELL0 }), 'samples is empty'), 'HarnessFault');
  L.same('DW-R11', 'D63 — the dual refuses when NO run reached the in-flight state it exists to measure',
    refuses(() => evaluateDual([{ from: 'a', to: 'b', delayMs: 1, startIdx: 1, dir: 1, endP: 0.725, midFlight: { resolving: false } }]),
      'still in flight'), 'HarnessFault',
    'every run measured the from-standstill case, which is flick-probe.mjs\'s experiment, not this one. '
    + '"No violations" over it would be an assertion of absence with no observation behind it');
  L.same('DW-R12', 'D63 — and on an empty run list',
    refuses(() => evaluateDual([]), 'no dual runs'), 'HarnessFault');
  L.same('DW-R13', 'D63 — the leg arithmetic refuses a start index that is not an index into the anchors',
    refuses(() => stepsAdvanced(9, 0.26, 1), 'not an index'), 'HarnessFault');
  L.same('DW-R14', 'D63 — the cadence refuses a missing transit table rather than falling back to the band silently',
    [refuses(() => transitWindows({ anchors: ANCHORS, transitOf: null }), 'must be a function'),
      refuses(() => transitWindows({ anchors: [ANCHORS[0]], transitOf: () => 1 }), 'fewer than two anchors'),
      refuses(() => dualDelaysMs({ anchors: ANCHORS, transitOf: () => 1, fractions: [1.5] }), 'strictly inside'),
      refuses(() => transitGestureConfigs(7, 4, 0), 'positive integer')],
    ['HarnessFault', 'HarnessFault', 'HarnessFault', 'HarnessFault'],
    'the third is the one that keeps the probe honest: a fraction outside (0,1) would deliver the '
    + 'second stream after the landing while still calling itself an in-flight measurement');
}

/* ==================================================================== *
 * 4. THE EVENT PATH — D46 assert-zero WITH its positive control.
 *
 * "No order in this program has ever delivered an event to the page." The
 * scan below is what keeps that true of this one in the other direction: the
 * driven region moves the ride with dispatched events or it is not an
 * instrument about the travel model at all.
 * ==================================================================== */

pin('DW-EVT-1', 'D46 assert-zero — progress setters inside the driven region',
  settersInRegion, SRC, 0,
  'the coordinator\'s own setProgress sweep reported "Mission" at every p and measured nothing. '
  + 'A harness that sets progress is not driving the travel model, it is overwriting it');

pin('DW-EVT-2', 'D46 positive control — dispatched events inside the driven region (a 0 here means the scan went blind, not that the region is clean)',
  dispatchesInRegion, SRC, 2,
  'TWO since DWELL-G1: `drivenTrial` and `dualTrial`. It is an ITERATION PIN as much as a positive '
  + 'control — a third driven function appearing here without this number being considered is a page-'
  + 'driving path nobody decided to add');

pin('DW-EVT-3', 'D46/D54 — the SAME forbidden pattern, proved non-blind: it matches the setup call that parks the ride, outside the region',
  settersInFile, SRC, ['tools/dwell-oracle.mjs :: window.journey.scrollTo(fromP);'],
  'an assert-zero is only trustworthy beside an assertion of presence, and the presence has to be '
  + 'found by the identical pattern — otherwise "0 hits" is indistinguishable from "read the wrong bytes"');

{
  /* The pattern's own two-sided probe: it must hit real code and must NOT
     hit a commented-out example, which is what stripping is for. */
  const hits = (text) => (code(text).match(SETTER_RE()) || []).length;
  L.same('DW-EVT-4', 'D46 — the setter pattern hits live code and does not hit a commented-out copy of the same line',
    [hits('  j.scrollTo(0.5);\n'), hits('  // j.scrollTo(0.5);\n'), hits('  window.dispatchEvent(e);\n')],
    [1, 0, 0]);
  L.same('DW-EVT-5', 'D46 inputs pin — files read (INPUTS, not matches), and the region is a proper part of the file',
    [1, SRC.text.length > 4000, regionOf(SRC).length > 200, regionOf(SRC).length < SRC.text.length],
    [1, true, true, true], `oracle is ${SRC.text.length} bytes, driven region ${regionOf(SRC).length}`);
}

/* ==================================================================== *
 * 5. D63 / D70 — the refusals. Every one of these is a branch that must
 * produce NO NUMBER, and each is entered here so none of them is a claim.
 * ==================================================================== */
{
  const refuses = (thunk, needle) => {
    try { thunk(); return 'no refusal'; } catch (e) {
      if (!(e instanceof HarnessFault)) return `untagged ${e.constructor.name}`;
      return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 50)}`;
    }
  };
  L.same('DW-R1', 'D63 — an unparseable recording refuses rather than reporting zero violations over zero runs',
    refuses(() => traceOf({ text: '{ not json' }), 'does not parse'), 'HarnessFault');
  L.same('DW-R2', 'D63 — a recording with no runs refuses rather than measuring an empty set',
    refuses(() => traceOf({ text: '{"runs":[]}' }), 'carries no runs'), 'HarnessFault');
  L.same('DW-R3', 'D63 — a chapter whose rest position is not derivable refuses rather than guessing a fraction',
    refuses(() => restRoadTable([{ id: 'x', span: 1, scrollVh: 5, stops: [0.5] }]), 'not derivable by this reader'), 'HarnessFault');
  L.same('DW-R4', 'D63 — a chapter with no positive scrollVh refuses',
    refuses(() => restRoadTable([{ id: 'x', span: 1, scrollVh: 0 }]), 'no positive scrollVh'), 'HarnessFault');
  L.same('DW-R5', 'D70 — the region slicer refuses on a rotted START anchor instead of returning the whole file',
    refuses(() => sliceBetween(SRC.text, 'driven-region', '/* --- NO SUCH MARKER', REGION_END), 'start anchor absent'), 'HarnessFault');
  /* This one is deliberately NOT a registry mutant. Renaming the END marker
     makes `regionOf` throw, and a HarnessFault is a HARNESS failure, not
     evidence about the subject (D70) — the registry would collect it in
     `faults` and the suite would re-raise it, which is correct behaviour and
     a useless mutant. The refusal is asserted directly instead. */
  L.same('DW-R5b', 'D70 — and on a rotted END anchor, so a slice that swallowed the rest of the file cannot pass',
    refuses(() => sliceBetween(SRC.text, 'driven-region', REGION_START, '/* --- end of driven region ----'), 'end anchor absent'),
    'HarnessFault');
  L.same('DW-R6', 'D63 — a bad seed refuses rather than generating a plausible-looking sequence',
    refuses(() => gestureConfigs(0, 11), 'positive integer'), 'HarnessFault');
  L.same('DW-R7', 'D63 — an empty sample list refuses rather than reporting that nothing was passed',
    refuses(() => passedAnchors({ samples: [], anchors: ANCHORS, fromP: 0.26 }), 'samples is empty'), 'HarnessFault');
  L.same('DW-R8', 'D63 — a trial with fewer than two gesture marks refuses rather than reporting zero swept windows',
    refuses(() => analyseTrial({ cfg: { t: 1, pause: 500 }, fromP: 0.26, samples: [[0, 0.26], [1, 0.27]], marks: [[0, 0.26]] }),
      'nothing was driven'), 'HarnessFault');
}

/* The D63 trust gate, every named cause entered. An instrument with an
   unreachable refusal branch has a refusal it has never made. */
{
  const clean = {
    httpOk: true, httpStatus: 200, booted: true, positiveControl: true,
    hiddenTrials: 0, thinTrials: 0, stillTrials: 0, framesRendered: 900, consoleErrors: 0,
    trialCount: 11, minSamples: 40,
  };
  const cause = (over) => trustVerdict({ ...clean, ...over }).causes.length;
  L.same('DW-T1', 'D63 — clean inputs are trusted, and each untrustworthy-input mode names exactly one cause',
    [
      trustVerdict(clean).trusted,
      cause({ httpOk: false, httpStatus: 404 }),
      cause({ booted: false }),
      cause({ positiveControl: false }),
      cause({ hiddenTrials: 3 }),
      cause({ framesRendered: 0 }),
      cause({ thinTrials: 1 }),
      cause({ stillTrials: 1 }),
      cause({ consoleErrors: 2 }),
      cause({ trialCount: 0 }),
    ],
    [true, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    'D63 as PAGE-01 extends it: a browser harness has more untrustworthy-input modes than any node '
    + 'suite — a tab that lost focus, a frame that never rendered, a server that 404\'d');
  L.same('DW-T2', 'D63 — the positive-control failure names the mechanism, not just the fact',
    trustVerdict({ ...clean, positiveControl: false }).causes[0].includes('setProgress sweep'), true);
  L.same('DW-T3', 'D63 — several bad inputs at once report EVERY cause, so a fixed one does not unmask a second run later',
    trustVerdict({ ...clean, positiveControl: false, hiddenTrials: 2, consoleErrors: 1 }).causes.length, 3);
  /* THE PACING CAUSE, ENTERED FROM BOTH SIDES — CONNECT-SKIP's discipline.
     A refusal branch that no control enters is a refusal the instrument has
     never made, and this one is new, so it needs both its arms driven. */
  const paced = (kept, out) => trustVerdict({
    ...clean, trialCount: kept, pacedOutTrials: out, frameGapBudgetMs: 50,
  });
  L.same('DW-T4', 'D63 — a run that lost MORE THAN HALF its trials to frame stalls reports no figure at all',
    [paced(5, 6).trusted, paced(5, 6).causes.length, paced(5, 6).causes[0].includes('fewer than half')],
    [false, 1, true],
    'the sibling order that established this measured load 30 at 40% CPU idle, so macOS load average '
    + 'is a poor contention proxy on this host and the trust criterion is per-trial FRAME PACING '
    + 'instead. A figure computed from whichever trials happened to get their frames is a survivorship '
    + 'artefact wearing a measurement\'s clothes');
  L.same('DW-T5', 'D46 — the control for DW-T4: a run that KEPT more than half its trials is trusted and still says how many it lost',
    [paced(6, 5).trusted, paced(6, 5).causes.length, paced(11, 0).trusted],
    [true, 0, true],
    'the half is a floor, not a target. An assert-that-it-refuses without an assert-that-it-does-not '
    + 'is indistinguishable from a branch that always refuses');
}

/* The wrap truncation and the dwell reader, exercised directly. */
{
  L.same('DW-W1', 'a route wrap truncates the trace and says so (DEF-OWNED\'s probe credited 4,785 ms of "mission dwell" to exactly this)',
    (() => { const r = truncateAtWrap([[0, 0.9], [1, 0.95], [2, 0.02], [3, 0.05]]); return [r.samples.length, r.wrapped]; })(),
    [2, true]);
  L.same('DW-W2', 'a forward-only trace is not truncated',
    (() => { const r = truncateAtWrap([[0, 0.1], [1, 0.5], [2, 0.9]]); return [r.samples.length, r.wrapped]; })(),
    [3, false]);
  L.same('DW-W3', 'dwell is contiguous time at the anchor, and a sample outside tolerance ends the run rather than bridging it',
    dwellTable({
      samples: [[0, 0.725], [100, 0.725], [200, 0.60], [300, 0.725], [400, 0.725], [500, 0.725]],
      anchors: [{ id: 'owned', p: 0.725 }],
    }),
    { owned: 200 },
    'the second run is 300->400->500, which is 200 ms. The 200->300 interval is the ride ARRIVING, '
    + 'not resting, and this expectation was hand-derived and disagreed with the code: the first draft '
    + 'said 300, crediting one travel interval to every arrival');
}

/* ==================================================================== *
 * 6. D44 / D86 over this suite's own source.
 * ==================================================================== */
{
  const selfText = readFileSync(SELF_PATH, 'utf8');
  const RE = literalPredicateRe(['L.same', 'pin'], 2);
  const hits = literalPredicateHits(selfText, RE).hits;
  L.same('DW-X1', 'D44 — bare-literal-predicate assertions in this suite', hits.length, 0,
    hits.length ? hits.join('\n        ') : null);
  const misses = TAUTOLOGY_FIXTURES
    .filter(([, , snippet, want]) => scanTautologyAst(snippet, new Map([['L.same', 2]])).hits.length !== want)
    .map(([id]) => id);
  L.same('DW-X2', 'D46 — every D86 fixture row returns the count it was built for (the reader for DW-X3\'s zero)',
    misses, []);
  const tau = scanTautologyAst(selfText, new Map([['L.same', 2], ['pin', null]]));
  L.same('DW-X3', 'D86 — syntactic tautologies in this suite', tau.hits.length, 0,
    tau.hits.length ? tau.hits.join('\n        ') : null);
  L.same('DW-X4', 'D45 — the AST scan reached this file at all (a 0 would mean it read the wrong bytes)',
    tau.sites > 10, true, `sites=${tau.sites}`);
}

SENT.reach('ledger');
let exitCode = L.report();

/* ==================================================================== *
 * --prove-failure — mutants of the SHIPPED SUBJECTS (D58): the shipped
 * manifest, the shipped oracle source, and the recorded trace. No poisons
 * of doubles anywhere; every perturb() returns a changed copy of the same
 * input the registered reader already reads.
 *
 * D88 — this harness is the only one of its kind in the tree, so it has no
 * sibling to disagree with it. That is exactly the condition D88 says makes
 * a single implementation unsafe, so it carries its own adversary here.
 * ==================================================================== */

const j = (v) => JSON.parse(JSON.stringify(v));
const chapter = (i, id, edit) => {
  const c = j(i.chapters);
  const hit = c.find((x) => x.id === id);
  if (!hit) fault(`mutant targets chapter ${id}, which is not in the manifest`);
  edit(hit);
  return { chapters: c };
};
/** Edit one recorded trial and hand back a whole perturbed trace TEXT, so a
 *  trace mutant perturbs the same bytes the reader parses. */
const trial = (i, t, edit) => {
  const parsed = JSON.parse(i.text);
  const hit = parsed.runs.find((r) => r.cfg.t === t);
  if (!hit) fault(`mutant targets trial ${t}, which is not in the recording`);
  edit(hit);
  return { text: JSON.stringify(parsed) };
};
/** Park the ride at an anchor for `ms` by rewriting the samples that cross
 *  it — the perturbation that turns a swept-past rest into a dwelt one. */
const parkOn = (run, p, ms) => {
  const out = [];
  let injected = false;
  for (const [t, at] of run.samples) {
    if (!injected && at > p) {
      for (let k = 0; k <= ms; k += 25) out.push([t + k, p]);
      injected = true;
      out.push([t + ms + 25, at]);
      continue;
    }
    out.push([injected ? t + ms + 50 : t, at]);
  }
  if (!injected) fault(`parkOn: no sample crosses p ${p}`);
  run.samples = out;
};

const MUTANTS = [
  /* --- the route geometry: the value S-4 says must not move silently --- */
  M('DW-ROAD', 'MR1 — `owned`\'s rest is moved to the middle of its own road (segVh 2.27/7.00 -> 4.635/4.635)',
    [3], (i) => chapter(i, 'owned', (c) => { c.segVh = [4.635, 4.635]; })),
  M('DW-ROAD-OWNED', 'MR2 — the same move, read through the single-chapter pin',
    ['afterVh', 'beforeVh', 'restAt'], (i) => chapter(i, 'owned', (c) => { c.segVh = [4.635, 4.635]; })),
  M('DW-ASYM', 'MR3 — `final` is given the longest road behind its rest instead of `owned`',
    ['afterVh', 'id', 'ofOwnRoad'], (i) => chapter(i, 'final', (c) => { c.segVh = [0.6, 10.0]; })),
  M('DW-ROAD', 'MR4 — `connect`\'s split moves, which no other pin in this file reads',
    [2], (i) => chapter(i, 'connect', (c) => { c.segVh = [7.0, 3.85]; })),
  M('DW-ANCHORS', 'MR5 — a chapter span changes, so every anchor from its own rest onward moves',
    [1, 2, 3, 4], (i) => chapter(i, 'inspire', (c) => { c.span = 26; })),
  M('DW-ANCHORS', 'MR6 — `connect`\'s declared stop moves within its own leg',
    [2], (i) => chapter(i, 'connect', (c) => { c.stops = [0.5]; })),

  /* --- the gesture generator --- */
  M('DW-SEED', 'MS1 — the seed changes, so these are no longer DEF-OWNED\'s eleven trials',
    null, (i) => ({ ...i, seed: 8 })),
  M('DW-SEED', 'MS2 — one more trial is generated, which must not silently extend the comparable set',
    null, (i) => ({ ...i, trials: 12 })),

  /* --- the oracle over the recording --- */
  M('DW-DWELL', 'MT1 — trial 3 is made to rest 900 ms at `owned` (the skip the user reported, repaired)',
    [2], (i) => trial(i, 3, (r) => parkOn(r, 0.725, 900))),
  M('DW-SWEPT', 'MT2 — the same repair, read through the per-trial skip set',
    [2], (i) => trial(i, 3, (r) => parkOn(r, 0.725, 900))),
  M('DW-JUDGED', 'MT3 — trial 1 is cut short so it never passes `owned` at all',
    [0], (i) => trial(i, 1, (r) => { r.samples = r.samples.filter((s) => s[1] < 0.70); })),
  M('DW-C2', 'MT4 — a gesture that began at a standstill is made to carry the ride past TWO rests with the visitor\'s hands off',
    null, (i) => trial(i, 1, (r) => {
      r.samples = r.samples.filter((s) => Math.abs(s[1] - 0.523) > 0.004 && Math.abs(s[1] - 0.725) > 0.004);
      r.marks = [r.marks[0], r.marks[1], r.marks[r.marks.length - 1]];
    })),
  M('DW-C2b', 'MT4b — the same, read through the violation list',
    null, (i) => trial(i, 1, (r) => {
      r.samples = r.samples.filter((s) => Math.abs(s[1] - 0.523) > 0.004 && Math.abs(s[1] - 0.725) > 0.004);
      r.marks = [r.marks[0], r.marks[1], r.marks[r.marks.length - 1]];
    })),
  M('DW-C1', 'MT5 — two adjacent gesture windows are merged, so ONE gesture carries the ride past TWO rests',
    null, (i) => trial(i, 3, (r) => { r.marks = r.marks.filter((m) => m.p < 0.45 || m.p > 0.70); })),
  M('DW-C3', 'MT6 — every trial is made to rest at `connect`, so only `owned` is ever swept past',
    null, (i) => {
      const parsed = JSON.parse(i.text);
      for (const r of parsed.runs) { try { parkOn(r, 0.523, 900); } catch { /* trial never reached it */ } }
      return { text: JSON.stringify(parsed) };
    }),
  M('DW-DWELL', 'MT7 — the recording is truncated to ten trials',
    null, (i) => { const p = JSON.parse(i.text); p.runs = p.runs.slice(0, 10); return { text: JSON.stringify(p) }; }),
  M('DW-DWELL', 'MT8 — a route wrap is introduced mid-trace, which must TRUNCATE rather than be read as travel '
    + "(DEF-OWNED's probe credited 4,785 ms of \"mission dwell\" to exactly this)",
    null, (i) => trial(i, 1, (r) => {
      const k = r.samples.findIndex((x) => x[1] > 0.6);
      if (k < 0) fault('MT8: trial 1 never passes p 0.6');
      r.samples = [...r.samples.slice(0, k), [r.samples[k][0], 0.002], ...r.samples.slice(k)];
    })),

  /* --- THE POST-FIX LAW (DWELL-G1) --------------------------------- *
   *
   * A NOTE ON WHAT THESE MUTANTS ARE AND ARE NOT, because the division of
   * labour matters. These perturb the READERS' INPUTS — the recording, and
   * the synthetic mark lists — and what they prove is that the rows above
   * are live functions of their data and that each fixture actually reaches
   * the case it claims to. They do NOT prove the shipped classifier logic is
   * load-bearing; a mutant of dwell-oracle.mjs's own source cannot be run
   * here, because these readers call the imported functions rather than
   * reading the file. THAT proof lives in tools/test-instrument-layer.mjs,
   * which stages the module and re-imports mutated copies of it (DO24-DO32).
   * Neither suite is sufficient alone and both are cheap. */
  M('DW-LAW-1', 'ML1 — trial 5\'s two in-flight carries are repaired into landings: the ride is made to rest 900 ms at `owned`',
    [4], (i) => trial(i, 5, (r) => parkOn(r, 0.725, 900))),
  M('DW-LAW-2', 'ML2 — the same repair, read through the census: one `inflight-carry` becomes one `landing`',
    null, (i) => trial(i, 5, (r) => parkOn(r, 0.725, 900))),
  M('DW-LAW-3', 'ML3 — trial 4\'s 114 ms stop at `connect` is extended past the floor, so it stops being an abandoned landing',
    [3], (i) => trial(i, 4, (r) => parkOn(r, 0.523, 900))),
  M('DW-MECH-1', 'ML4 — the first gesture no longer begins at a rest, so its own scrub is reclassified as spending banked distance',
    null, (i) => ({ ...i, marks: [{ ...i.marks[0], p: 0.30 }, ...i.marks.slice(1)] })),
  M('DW-MECH-2', 'ML5 — the 900 ms dwell at `owned` drops to 100, and the landing becomes a rest the visitor never saw',
    null, (i) => ({ ...i, dwell: { ...i.dwell, owned: 100 } })),
  M('DW-MECH-3', 'ML6 — the second gesture is moved onto the `connect` rest, so it no longer begins mid-flight',
    null, (i) => ({ ...i, marks: i.marks.map((m2) => (m2.t === 700 ? { ...m2, p: 0.523 } : m2)) })),
  M('DW-LAND-1', 'ML7 — the abandoned landing is given 300 ms instead of 120, which moves it across the floor',
    null, (i) => ({ ...i, shortMs: 300 })),
  M('DW-DUAL-1', 'ML8 — every dual run lands two legs on, so the contract row, the REFUSAL row and the not-a-rest row all vanish into a single repeated SKIP',
    null, (i) => ({ ...i, ends: i.ends.map(() => 0.725) })),
  M('DW-DUAL-2', 'ML9 — the discarded run is marked as having been delivered mid-flight after all, so its extra leg is judged',
    null, (i) => ({ ...i, secondResolving: true })),
  M('DW-STEPS-1', 'ML10 — the wrapping start moves off `final`, so the leg count that must survive the wrap is a different one',
    [3], (i) => ({ ...i, fromFinal: 3 })),
  M('DW-WIN-1', 'ML11 — `inspire->connect`\'s declared transit doubles, and every delay drawn inside it must move with it',
    [1], (i) => ({ ...i, inspireS: 2.6 })),
  M('DW-WIN-2', 'ML12 — the seed changes, so neither generator is drawing DEF-OWNED\'s trials any more',
    null, (i) => ({ ...i, seed: 8 })),

  /* --- the event path: mutants of the shipped oracle SOURCE --- */
  M('DW-EVT-1', 'ME1 — the driven region starts moving the ride with a progress setter instead of an event',
    null, (i) => ({ text: mutateText(i.text, 'ME1', 'window.dispatchEvent(new WheelEvent(', 'j.scrollTo(j.p + 0.01) || window.dispatchEvent(new WheelEvent(') })),
  /* `mutateText` replaces the FIRST occurrence, and since DWELL-G1 there are
     two driven functions — so this blanks `drivenTrial`'s dispatch and leaves
     `dualTrial`'s, moving the count 2 -> 1. That still reds the pin, and the
     pin is a count rather than a boolean precisely so a PARTIAL loss of the
     event path is visible rather than being absorbed by the other half. */
  M('DW-EVT-2', 'ME2 — the driven region stops dispatching events in `drivenTrial`, and the count falls rather than the scan going quiet',
    null, (i) => ({ text: mutateText(i.text, 'ME2', 'window.dispatchEvent(new WheelEvent(', 'noop(new WheelEvent(') })),
  M('DW-EVT-3', 'ME3 — the parking call the forbidden pattern is proved non-blind against is renamed away',
    null, (i) => ({ text: mutateText(i.text, 'ME3', 'window.journey.scrollTo(fromP);', 'window.journey.place(fromP);') })),
];

if (PROVE) {
  console.log('\n--prove-failure — mutants of the shipped manifest, the shipped oracle source, and the recorded trace');
  let out;
  try {
    out = sweep(MUTANTS);
  } finally {
    SENT.reach('sweep');
  }
  L.discard();
  L.same('DW-M1', 'D58 — mutants that did not drive their declared pin on its declared axis', out.bad, 0);
  L.same('DW-M2', 'D45 — every mutant ran (iteration pin)', out.total, 32);
  L.same('DW-M3', 'D58 — registered pins carrying no mutant', out.uncovered, []);
  L.same('DW-M4', 'D70 — harness faults raised by a guard, named separately from a failed gate', out.faults, []);
  exitCode = L.report() || exitCode;
  if (out.faults.length) throw new HarnessFault(out.faults.join('; '));
}

process.exit(exitCode);
