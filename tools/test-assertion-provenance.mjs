/* ==================================================================== *
 * tools/test-assertion-provenance.mjs — QA-09.
 *
 * THE GATE FOR tools/assertion-provenance.mjs, AND THE TREE-WIDE SWEEP FOR
 * D94's ELEVENTH SHAPE: AN ASSERTION BLIND IN ITS DATA, NOT ITS PREDICATE.
 *
 * The shape, in one line: `HCLO100` — the guard written to close D85 in its
 * own suite — does not read its own suite. `usedAnchors` is a hand-written
 * empty literal, so the reader is a constant. The predicate is correct; the
 * INPUT was never derived from the subject, so `scanTautologyAst` cannot see
 * it, `auditLiteralPredicates` cannot see it, and the mutant registry — which
 * perturbs the inputs a pin DECLARES — cannot see it either.
 *
 * WHAT THIS FILE PINS
 *   AP1   every gated suite is DECLARED — with a receiver shape, or as
 *         unscannable with a reason. A new suite lands as a red row here on
 *         the day it is wired, which is D49's detector applied to this scan.
 *   AP2   no declared suite reads ZERO assertion sites. This is the whole
 *         D46 argument: a renamed ledger method takes a file to zero hits,
 *         which is also the passing answer. `sites` is the positive control
 *         and it is pinned per file, not summed.
 *   AP3/AP4  the data-blind MANIFEST — hits and inventory, as SETS keyed
 *         `file :: id :: class` with NO line numbers (D54/D64: a manifest
 *         catches a move, a count does not, and three lanes are live in
 *         tools/ so a line-keyed control would re-red on every neighbour's
 *         edit — D66).
 *   AP5   the CITATION manifest, same keying.
 *   AP6/AP7  the two fixture tables, row by row, with their iteration counts
 *         pinned as literals (D45).
 *   AP8   the ADVERSARIAL CROSS-CHECK. tools/assertion-provenance.mjs
 *         re-derives the single-binding `const` table that
 *         tools/self-controls.mjs keeps private, so there are now two of
 *         them. D88's whole argument is that one implementation cannot
 *         disagree with itself — so this suite runs BOTH over
 *         `TAUTOLOGY_FIXTURES`' guard rows (TA13-TA19) and requires them to
 *         agree about which names are propagatable. A divergence is a red,
 *         not a difference of opinion.
 *   AP9   the D95 fresh-registration guard and its positive control, driven
 *         through the shipped `tools/stage-tree.mjs`.
 *   AP10/AP11  this file's own D44 literal-predicate scan and its control.
 *   AP12  `scanTautologyAst` over this file, with its fixture control.
 *   AP15  COMPLETENESS. AP1 pins that every gated suite is DECLARED; this
 *         pins that its declaration is COMPLETE. Every callee in every gated
 *         suite carrying a ledger-row label is DERIVED from that suite's own
 *         source and must be adjudicated — a receiver shape in RECEIVERS, or
 *         a named non-receiver in NOT_RECEIVERS with a reason. Without it a
 *         suite that adopts a receiver NARROWS THIS SCAN SILENTLY, which is
 *         D54's failure inside the instrument built to find D94's.
 *   AP15b/AP15c  the exclusions as a SITE SET keyed `file :: callee` (D54/D99
 *         — never a count), and the guard that every exclusion is reached.
 *   AP16  THE STATED LIMIT AS DATA: the declared receivers the derivation
 *         cannot see, because their rows carry no label. Non-empty on
 *         purpose, and it is AP15's positive control (D46).
 *   AP17/AP17b  the receiver-drift fixture table, row by row and as a set.
 *
 * WHAT THIS FILE DOES NOT RE-DERIVE (D84): the ledger, the abort sentinel,
 * the harness-fault type, the five-gate mutant registry, the literal-
 * predicate scan, the syntactic-tautology scan and the tree stager all come
 * from tools/instrument-ledger.mjs, tools/mutant-registry.mjs,
 * tools/self-controls.mjs and tools/stage-tree.mjs. The ONE thing QA-09
 * re-derives is named at the top of tools/assertion-provenance.mjs and
 * checked by AP8 rather than asserted away.
 *
 * THE RECEIVER TABLE IS PER-SUBJECT DATA, and it is the reason this scan is
 * not one regex. Three ledger shapes ship in this tree —
 * `same(id, what, actual, expected)`, `same(name, value, expected, detail)`
 * and `same(area, name, value, expected, trace)` — and a scan that assumes
 * one measures the WRONG ARGUMENT in the other two, silently, with a
 * plausible row. That is D59, and the answer is the same as
 * tools/self-controls.mjs's: each suite declares its own shape.
 *
 * AND THE TABLE IS HAND-MAINTAINED, which is the other half of the same
 * problem. A declared SHAPE cannot be derived — see PART 1b of
 * tools/assertion-provenance.mjs for why, and for the two `check(name, fn)`
 * helpers in this tree that settle it — but the set of receiver NAMES can
 * be, and AP15 derives it and requires every member to be adjudicated. So
 * the shapes stay hand-written and the COMPLETENESS of the list stops being
 * a matter of anyone remembering.
 *
 * Run:
 *   node tools/test-assertion-provenance.mjs
 *   node tools/test-assertion-provenance.mjs --prove-failure
 *   node tools/test-assertion-provenance.mjs --report   (the sweep, verbose)
 * ==================================================================== */

import { readFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  HarnessFault, fault, mutateText, createLedger, armSentinel, inputCanon,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';
import {
  createStager, writeRegistrationWitness, proveRegistrationFreshness, auditRegistrations,
} from './stage-tree.mjs';
import {
  literalPredicateRe, literalPredicateHits, scanTautologyAst, TAUTOLOGY_FIXTURES,
} from './self-controls.mjs';
import {
  scanDataBlind, citationCandidates, collectAssertionIds, literallyClosed, idBearingCallees,
  DATA_BLIND_FIXTURES, CITATION_FIXTURES, RECEIVER_DRIFT_FIXTURES,
} from './assertion-provenance.mjs';

const SELF_PATH = fileURLToPath(import.meta.url);
const TOOLS = dirname(SELF_PATH);
const REPO = resolve(TOOLS, '..');
const SELF = 'tools/test-assertion-provenance.mjs';

const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');
const REPORT = ARGV.has('--report');

const SENT = armSentinel('test-assertion-provenance', ['ledger', 'sweep'], (p) => p === 'ledger' || PROVE);
const L = createLedger();
const { pin, sweep } = createRegistry({ ledger: L, fault });

const read = (rel) => readFileSync(join(REPO, rel), 'utf8');

/* ==================================================================== *
 * THE RECEIVER SHAPES.
 *
 * `data` is the argument whose PROVENANCE is in question: the actual for a
 * comparison receiver, the predicate for a predicate receiver, the pin's
 * INPUT for a registry receiver. `expected: null` states plainly that a
 * receiver has no expected side rather than guessing an index for it.
 * ==================================================================== */
const SAME = { id: 0, what: 1, data: 2, expected: 3 };
const SAME3 = { id: 0, what: 0, data: 1, expected: 2 };
const SAME5 = { id: 1, what: 1, data: 2, expected: 3 };
const PIN = { id: 0, what: 1, data: 3, reader: 2, expected: 4 };
const CHECK4 = { id: 0, what: 1, data: 2, expected: 3 };
const CHECK3 = { id: 0, what: 0, data: 1, expected: 2 };
const CHECKP3 = { id: 0, what: 1, data: 2, expected: null };
const CHECKP2 = { id: 0, what: 0, data: 1, expected: null };
const CHECKP4 = { id: 1, what: 1, data: 2, expected: null };
const CHECKC = { id: 1, what: 1, data: 0, expected: null };
const EQ4 = { id: 0, what: 1, data: 2, expected: 3 };
/* `EQ3` — the `eq(id, actual, expected)` shape — was declared here for the
   two J04 move verifiers only. Both are retired out of the gate, so the shape
   has no subject; removed rather than left, or lint reports it unused and the
   next reader has to work out which suite it described. */
const A2 = { id: null, what: null, data: 0, expected: 1 };
const AOK = { id: null, what: null, data: 0, expected: null };
/* A --prove-failure receiver: `prove(id, what, goodValue, corruptedActual)`.
   Its CONTRACT is that the corrupted side came from perturbing the subject
   (D58), so a literal on both sides is a defect by definition, not a
   judgement — which is why these get their own class. */
const PROVE4 = { id: 0, what: 1, data: 3, expected: 2, prove: true };
const PROVE5 = { id: 0, what: 2, data: 4, expected: 3, prove: true };
const PROVE6 = { id: 0, what: 1, data: 4, expected: 3, prove: true };
/* AP-02's additions. Each re-derived from the helper's own DEFINITION in the
   suite that owns it, never from the call site — the call site is exactly
   what cannot be read (D59; see PART 1b of tools/assertion-provenance.mjs).
   `say(ok, id, what, detail)` inverts the usual order and puts the predicate
   FIRST; `perturb(id, what, { baseline, expected, mutated })` carries all
   three quantities inside ONE argument, so the whole options object is the
   data and there is no positional expected side — a site where that object
   is literally closed is a --prove-failure case with no subject anywhere,
   which is exactly what DBP means. */
const SAY = { id: 1, what: 2, data: 0, expected: null };
const PERTURB = { id: 0, what: 1, data: 2, expected: null, prove: true };

/** file -> its own ledger shape. Verified against the helper's declaration
 *  in that file, one at a time; AP2 is what keeps them honest afterwards. */
const RECEIVERS = {
  'tools/test-gate-composition.mjs': { 'L.same': SAME, pin: PIN },
  'tools/test-instrument-layer.mjs': { 'L.same': SAME, pin: PIN },
  'tools/test-comment-stripper.mjs': { check: CHECK4 },
  /* Two rows stood here, for the J04a and J04b move verifiers. Both suites
     are retired out of the gate on 2026-08-22. AP1 derives the gated set from
     package.json, so a receiver shape for a file the gate no longer runs is a
     claim about a subject that is not there — removed rather than left. */
  'tools/test-error-classes.mjs': { check: CHECKP2 },
  'tools/test-renderer-resources.mjs': { 'L.same': SAME3, 'L.check': CHECKP2, prove: PROVE4 },
  'tools/test-check-cycles.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK },
  /* AP-02: `checkAsync(name, fn)` queues an async check and drains it at the
     end of the file with the same PASS/FAIL verdict as `check`. Eleven sites
     the sweep did not read. */
  'tools/test-browser-harness.mjs': { check: CHECKP2, checkAsync: CHECKP2 },
  'tools/test-chapter-entry.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK },
  'tools/test-connect-motion.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK },
  /* connect-skip second pass, 2026-08-25. Wired into the gate in the same change as its
     package.json entry. Re-derived from THIS file's own call sites, not copied
     from the neighbour above it: the suite asserts with bare `assert.ok` and
     `assert.equal` at the top level and reaches for no wrapper at all. An
     earlier draft of it DID carry a `pin(id, why, fn)` collector and AP15
     reddened naming `tools/test-rest-composition.mjs :: pin` — the same
     shape-name collision AP15 exists for, since `pin` is PIN elsewhere and
     that suite's signature was not PIN's. The wrapper was removed rather than
     declared, so the receiver set here is the plain-assert one. */
  'tools/test-rest-composition.mjs': { 'assert.equal': A2, 'assert.ok': AOK },
  /* no-auto-advance, 2026-08-26. Wired into the gate in the same change as its
     package.json entry. Re-derived from THIS file's own call sites: the suite
     asserts with bare `assert.ok` and `assert.equal` at the top level and
     reaches for no wrapper at all. Its first draft DID carry a
     `note(id, msg)` collector and AP15 reddened naming
     `tools/test-rest-authority.mjs :: note` — the same shape the neighbour
     above hit with `pin`. The wrapper was removed rather than declared, for
     the reason recorded there, and the multi-violation report it existed for
     is now a bare array drained by one assert.ok. */
  'tools/test-rest-authority.mjs': { 'assert.equal': A2, 'assert.ok': AOK },
  /* border-flash (owner report #30), declared 2026-08-26 by the wiring order that
     found AP1 red over it: the suite was wired into test:contracts with no
     declaration here, which is the mid-run narrowing AP1's own hint describes.
     Re-derived from THIS file's five call sites, not copied from the two
     neighbours above: it asserts with bare `node:assert/strict` at the top of
     `main()` and reaches for no wrapper at all — `assert.equal(bad.length, 0, …)`,
     `assert.ok(subjects > 0, …)` and, inside the --prove-failure block,
     `assert.notEqual(mutated, src, …)`, the staleness guard that fires when a
     mutant's anchor text has moved.
     THE THIRD ROW IS THE POINT. `assert.notEqual` carries no shape anywhere else
     in this map, and leaving it undeclared would leave one of the five sites
     unread while the file still looked covered — AP-02's own failure mode, one
     assertion wide. Its ARGUMENT INDICES are A2's exactly (actual 0, compared
     side 1, message 2); only the comparison DIRECTION is inverted, and direction
     is not a thing this scan reads. What it reads is whether both sides are
     literally closed, and `assert.notEqual([], [])` is data-blind by the same
     rule as `assert.equal([], [])` — so A2 classifies it correctly rather than
     conveniently. Measured after declaring: 5 sites reached, 0 rows, so this
     file adds nothing to AP3 or AP4. */
  'tools/test-detail-shell-monotone.mjs': { 'assert.equal': A2, 'assert.ok': AOK, 'assert.notEqual': A2 },
  /* CONV-02's declared-conversion gate, wired into test:contracts by
     CONV-CLOSE on 2026-08-26 and declared here in the same change — AP1 is
     what makes that a required edit rather than an optional tidy, and it was
     measured red over this file before the declaration landed, exactly as its
     own hint describes.
     RE-DERIVED FROM THIS FILE'S OWN CALL SITES, not copied from the three
     neighbours above that happen to agree: it asserts with bare
     `node:assert/strict` at the top level of the module and reaches for no
     collector — `assert.equal(a, b, msg)`, `assert.deepEqual(a, b, msg)` and
     `assert.ok(cond, msg)`, 33 sites between them.
     WHAT IS DELIBERATELY NOT DECLARED, and why that is not a gap. The file
     also defines `near(got, want, tol, id, what)`, a tolerance wrapper whose
     body is one `assert.ok`. It is NOT a receiver row here because its label
     is argument 3: `idBearingCallees` reads arguments 0 and 1 only, so the
     completeness derivation does not reach it and AP15 does not ask for it —
     verified, not assumed. Declaring it would not widen this sweep either,
     because every `near` site's verdict is the `assert.ok` inside the helper,
     which is already declared and already read; what a declaration WOULD do
     is count the same comparison twice, which is the `F` adjudication
     recorded in NOT_RECEIVERS. Measured after declaring the three above: 33
     sites reached, 0 hits and 0 inventory rows, so this file adds nothing to
     AP3 or AP4. */
  'tools/test-declared-conversions.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK },
  /* AP-02: `L.near(area, name, value, expected, eps, trace)` is a THIRD method
     on the same ledger and reaches 33 sites — the largest single gap found,
     and one AP-01's narrower id shape could not see. */
  'tools/test-scroll-trace.mjs': { 'L.same': SAME5, 'L.check': CHECKP4, 'L.near': SAME5 },
  'tools/test-frame-order.mjs': { 'L.same': SAME5, 'L.check': CHECKP4 },
  'tools/test-scroll-perturbation.mjs': { prove: PROVE6 },
  'tools/test-render-perturbation.mjs': { check: CHECK4, prove: PROVE4, perturb: PERTURB },
  'tools/test-render-determinism.mjs': { check: CHECKP3 },
  'tools/test-portrait-dealer.mjs': { 'L.same': SAME5, 'L.check': CHECKP4 },
  'tools/test-portrait-baked.mjs': { 'L.same': SAME5, 'L.check': CHECKP4 },
  'tools/test-portrait-textures.mjs': { 'L.same': SAME5, 'L.check': CHECKP4 },
  'tools/test-portrait-lifecycle.mjs': { 'L.same': SAME5, 'L.check': CHECKP4 },
  'tools/test-portrait-perturbation.mjs': { 'L.same': SAME5, 'L.check': CHECKP4 },
  'tools/test-animation-lifecycle.mjs': { 'L.same': SAME3, 'L.check': CHECKP2 },
  /* The local-clock compatibility rewrite uses node:assert directly. All six
     callees carry observed/expected in arguments 0/1 (or a predicate in 0),
     with the human description in node:assert's message position. */
  'tools/test-intro-lifecycle.mjs': {
    'assert.equal': A2,
    'assert.notEqual': A2,
    'assert.deepEqual': A2,
    'assert.notDeepEqual': A2,
    'assert.match': A2,
    'assert.ok': AOK,
  },
  'tools/test-card-warming.mjs': { check: CHECKC },
  /* Wired into the gate by U01c, 2026-08-22 — U01b's suite by transfer, and
     U01c's own. Both declare `check(condition, msg)`: the predicate is
     argument 0 and the message carries both id and what, which is CHECKC.
     Re-derived from each file's OWN `function check` declaration, not copied
     from the neighbour above — that neighbour happens to agree, but AP-02's
     `say(ok, id, what, detail)` is the standing reminder that a shape copied
     from a sibling can measure an id string as its data. */
  'tools/test-card-registry.mjs': { check: CHECKC },
  'tools/test-card-icons.mjs': { check: CHECKC },
  /* Wired into the gate by U02, 2026-08-22, in the same change as its
     package.json entry. Re-derived from this file's OWN `function check`
     declaration, not copied from the two rows above: it happens to be the
     same `check(condition, msg)` shape, and AP-02 is the standing reminder
     that a shape copied from a sibling can measure an id string as data. */
  'tools/test-hot-state.mjs': { check: CHECKC },
  /* Hotspot departure is a top-level node:assert contract: equality,
     structural equality, and predicate assertions only. */
  'tools/test-hotspot-departure.mjs': {
    'assert.equal': A2,
    'assert.deepEqual': A2,
    'assert.ok': AOK,
  },
  'tools/test-discord-card.mjs': { check: CHECKC },
  'tools/test-detail-close-focus.mjs': { check: CHECKP3 },
  'tools/test-ui-lifecycle.mjs': { 'L.same': SAME, pin: PIN },
  'tools/test-chapter-contract.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK },
  'tools/test-spores-lifecycle.mjs': { 'L.same': SAME3, 'L.check': CHECKP2, prove: PROVE4 },
  'tools/test-baked-lifecycle.mjs': { check: CHECKP2 },
  'tools/test-portrait-paint.mjs': { 'L.check': CHECK3, prove: PROVE4, say: SAY },
  /* SUB-01 converted seventeen `prove` poisons in this file into registry
     `pin` sites, and added two more ledgers (`SW` — the mutant sweep, `SC` —
     the D44 self-scan). Declaring only `L.same` and `prove` after that would
     make this scan NARROWER over this file than it was before the repair it
     prompted: the seventeen converted sites would not be read at all, and the
     manifest's zero would be the zero of not looking. Measured with these
     three declared: `pin` reaches 17 sites, `SW.same` 7, `SC.same` 3 — 103
     sites against 76 — and every one of them classifies CLEAN. AP2 could not
     have caught this: it asks whether a file reached ANY site, and `L.same`
     alone reaches 46. */
  /* Seven rows stood here — the six one-shot extraction proofs and the
     portrait-remix contract — and all seven are retired out of the gate on
     2026-08-22, along with the two move verifiers above. Removed for the same
     reason: the gated set is derived from package.json. */
  /* AP-02: the shared registry's `pin` reaches 15 sites here and was undeclared. */
  'tools/test-dwell-oracle.mjs': { 'L.same': SAME, pin: PIN },
  'tools/test-pose-oracle.mjs': { 'L.same': SAME, pin: PIN },
  /* ONE DECLARATION WAS REMOVED HERE BY DIET-02, 2026-08-26.
     WAS: 'tools/test-c06-registry.mjs': { 'L.same': SAME, pin: PIN, 'q.pin': PIN },
     with AP-02's note that a SECOND registry is built inside its null/positive-
     control block and pinned through as `q.pin` — the same shape, a different
     binding. The suite is retired out of the chain to
     docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/, so it
     is no longer a gated subject and a declaration left standing here would be a
     receiver shape for a file this derivation never reads: AP15c's stale-silencer
     case, which is the maintenance obligation this map carries. Its exclusion row
     leaves AP15b in the same change. */
  /* AP-02: 35 registry sites, the gap AP-01 measured as the largest of the five
     it named. tools/test-road.mjs was wired into the chain by GATE-01 as D49's
     thirteenth instance and declared `L.same` alone. */
  'tools/test-road.mjs': { 'L.same': SAME, pin: PIN },
  /* Wired into the chain by J01, 2026-08-22, which is what obliges it to
     declare them here: AP1 reds on the day a gated suite has no receiver
     shape, and it did, naming both. Both carry the registry's `pin` and the
     ledger's `L.same`, the same pair as tools/test-gate-composition.mjs. */
  'tools/test-input-claim.mjs': { 'L.same': SAME, pin: PIN },
  'tools/test-transition.mjs': { 'L.same': SAME, pin: PIN },
  /* Wired into the chain by J02, 2026-08-22. Same obligation, same pair:
     the registry's `pin` and the ledger's `L.same`. AP1 reds on the day a
     gated suite has no receiver shape. */
  'tools/test-frame-publication.mjs': { 'L.same': SAME, pin: PIN },
  /* Wired into the chain by J03, 2026-08-22. Same obligation, same pair:
     the registry's `pin` and the ledger's `L.same`. AP1 reds on the day a
     gated suite has no receiver shape. */
  'tools/test-ui-closure.mjs': { 'L.same': SAME, pin: PIN },
  /* Wired into the chain by J04c, 2026-08-22. Same obligation, same pair:
     the registry's `pin` and the ledger's `L.same`. AP1 reds on the day a
     gated suite has no receiver shape. */
  'tools/test-global-hooks.mjs': { 'L.same': SAME, pin: PIN },
  /* SIX RECEIVER DECLARATIONS WERE REMOVED HERE BY THE DISPOSAL REMOVAL,
     2026-08-25 — J04d's, R05's, R06's, R07's, R08's and J04e's, all six on
     the same `{ 'L.same': SAME, pin: PIN }` pair. Their suites retired with
     the disposal machinery they proved. AP1 is what makes this a required
     edit rather than an optional tidy: it reds on the day a gated suite has
     no receiver shape, and AP15c reds on the day a declaration has no suite. */
  /* Wired into the chain by J05, 2026-08-22 — the last of Wave 3. Same
     obligation, same pair: the registry's `pin` and the ledger's `L.same`.
     AP1 reds on the day a gated suite has no receiver shape. */
  'tools/test-page-lifetime.mjs': { 'L.same': SAME, pin: PIN },
  'tools/test-coverage-floor.mjs': { eq: EQ4, prove: PROVE5 },
  /* AP-02: four more ratchet receivers on the same (id, what, actual, expected)
     shape — a wave baseline, a set manifest, a monotonic manifest floor and a
     ceiling. 28 sites, and `manifestFloor` carries the ONE row this widening
     adds to the inventory (M9.demo, an injected --demo-delta value). */
  'tools/test-render-baseline.mjs': {
    check: CHECK4, wave: CHECK4, waveManifest: CHECK4, manifestFloor: CHECK4, ceiling: CHECK4,
  },
  'tools/test-static-content.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2 },
  'tools/test-no-scroll-navigation.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2 },
  /* Purpose/Ownership's handoff contract uses only node:assert receivers.
     Regex matches and throws have the same observed/expected/message shape
     as equality for this provenance scan. */
  'tools/test-rail-handoff.mjs': {
    'assert.equal': A2,
    'assert.deepEqual': A2,
    'assert.match': A2,
    'assert.doesNotMatch': A2,
    'assert.throws': A2,
  },
  'journey/structure.test.mjs': { 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK },
  [SELF]: { 'L.same': SAME, pin: PIN },
};

/** Gated files this scan cannot read, each with the reason. A file here is
 *  a DECLARED gap, which is the only kind this order is willing to have. */
const UNSCANNABLE = {
  'tools/scroll-touch-gates.mjs': 'no assertion receiver at all — it pushes rows onto a '
    + '`results` array and prints a table, so there is no call site whose arguments carry an '
    + 'actual and an expected. Reachable only by giving it a ledger, which is another order\'s work.',
};

/* ==================================================================== *
 * THE GATED SET, DERIVED — never hand-listed (D80: nothing pins the
 * chain's composition, so this scan reads the chain itself).
 * ==================================================================== */
function gatedSuites() {
  const pkg = JSON.parse(read('package.json'));
  const seen = new Set();
  for (const key of ['test:unit', 'test:contracts', 'test:static']) {
    const script = pkg.scripts[key];
    if (typeof script !== 'string') fault(`package.json has no ${key} script — the gated set cannot be derived`);
    for (const m of script.matchAll(/node\s+([A-Za-z0-9._/-]+\.mjs)/g)) seen.add(m[1]);
  }
  return [...seen].sort();
}
const GATED = gatedSuites();

/* ==================================================================== *
 * THE SWEEP.
 * ==================================================================== */
const SUBJECTS = GATED.filter((f) => RECEIVERS[f]);
/**
 * A PLAIN OBJECT, not a Map, and the reason is a live defect in the shared
 * instrument layer rather than taste. `inputCanon` (tools/instrument-ledger.mjs)
 * has no Map branch: a Map falls through to `Object.keys(x)`, which is `[]`
 * for every Map ever built, so EVERY Map canonicalises to `{}`. A registry
 * mutant that perturbs a Map-shaped input is therefore reported `BROKEN —
 * perturbation was a no-op on the reader's input` by gate 2, whatever it
 * changed. Measured here on the first sweep; pinned as AP14 so it is a
 * finding on the record rather than a workaround in a data structure.
 */
const SOURCE = Object.fromEntries(SUBJECTS.concat([SELF]).map((f) => [f, read(f)]));

/** file :: id :: class rows, ordered — a manifest, not a count (D54). */
function sweepRows(sources) {
  const hits = [];
  const inventory = [];
  const blindFiles = [];
  for (const [file, src] of Object.entries(sources)) {
    const { rows, sites } = scanDataBlind(src, RECEIVERS[file]);
    if (sites === 0) blindFiles.push(file);
    for (const r of rows) {
      (r.cls === 'DB3' ? inventory : hits).push(`${file} :: ${r.id} :: ${r.cls}`);
    }
  }
  hits.sort();
  inventory.sort();
  return { hits, inventory, blindFiles: blindFiles.sort() };
}

/* ==================================================================== *
 * THE CITATION WORLD.
 * ==================================================================== */
/** Stems that are shaped like assertion ids and are not. Each carries its
 *  reason, so a NEW namespace arrives as a red row in AP-N rather than as
 *  silence — the same argument test-instrument-layer.mjs's COV-1 makes about
 *  a new shared module. */
const NOT_ASSERTION_NAMESPACES = {
  D: 'ledger DECISION numbers — D45, D94',
  S: 'program-level findings — S-2, S-3',
  R: 'review findings — R-D2',
  F: 'per-order findings — F-1, F-4',
  C: 'order names — C04, C05',
  U: 'order names — U01, U05',
  H: 'order names — H01…H06',
  J: 'order names — J04a, J04b',
  P: 'order names — P01',
  A: 'order names — A01, A01a',
  Q: 'order names — Q01…Q05',
  G: 'gate names — G5, G7',
  T: 'tautology SHAPES — T1…T5',
  L: 'proof LEGS — L0-a, L2',
  M: 'per-order mutant labels — M6, M8',
  N: 'per-order finding labels',
  X: 'per-order experiment labels',
  B: 'per-order baseline labels',
  W: 'per-order witness labels',
  K: 'per-order labels', V: 'per-order labels', I: 'per-order labels',
  O: 'per-order labels', Y: 'per-order labels', Z: 'per-order labels',
  E: 'per-order labels',
  QA: 'order names — QA-01…QA-09',
  GATE: 'order names — GATE-01, A05a\'s byte-exact road proof',
  PAGE: 'order names — PAGE-01, PAGE-02',
  WIRE: 'order names — WIRE-02, WIRE-03',
  /* Added 2026-08-22 by the instrument-diet order, whose own name has this
     stem. It is the SAFE case and not the AP one: no assertion in this tree
     carries this prefix, so declaring the stem blinds the sweep to nothing.
     The AP collision needed full-token keying precisely because AP1..AP17 are
     live ids; this needs none. */
  DIET: 'order names',
  DEF: 'DEFECT ids — DEF-04, DEF-C05-01',
  MAJOR: 'review severities', MINOR: 'review severities',
  HB: 'the shared BAKE CONTRACT obligations — HB6, HB11. Not assertion ids: '
    + 'they are design-document obligations that suites claim or decline.',
  DI: 'the C05 dependency-injection contract — DI-1. A design obligation, not an assertion.',
  SHA: 'digest names — SHA-256', RFC: 'standards', HTTP: 'standards',
  WCAG: 'standards', ES: 'language versions', UTF: 'encodings',
  XR: 'cross-review names', ADR: 'decision-record names', GB: 'per-order block labels',
  ISO: 'standards', RGB: 'colour', RGBA: 'colour', SRGB: 'colour',
  WEBGL: 'graphics APIs', GLSL: 'graphics APIs',
  PL: 'design-document section prefixes', PS: 'design-document section prefixes',
};

/** Files whose PROSE is swept: every gated suite, every shared instrument,
 *  and every production module under journey/. */
function citationSubjects() {
  const out = new Set(GATED);
  out.add(SELF);
  for (const f of Object.keys(UNSCANNABLE)) out.add(f);
  for (const m of ['tools/assertion-provenance.mjs', 'tools/instrument-ledger.mjs',
    'tools/mutant-registry.mjs', 'tools/self-controls.mjs', 'tools/stage-tree.mjs',
    'tools/strip-comments.mjs', 'tools/dwell-oracle.mjs', 'tools/pose-oracle.mjs']) out.add(m);
  for (const f of PRODUCTION) out.add(f);
  return [...out].sort();
}

/** journey/ production sources, listed by walking the tree the gate lints. */
import { readdirSync, statSync } from 'node:fs';
function jsUnder(relDir, out = []) {
  for (const e of readdirSync(join(REPO, relDir)).sort()) {
    if (e.startsWith('.')) continue;
    const rel = `${relDir}/${e}`;
    if (statSync(join(REPO, rel)).isDirectory()) jsUnder(rel, out);
    else if (/\.(js|mjs)$/.test(e)) out.push(rel);
  }
  return out;
}
const PRODUCTION = jsUnder('journey');

/** The world: every id DEFINED anywhere in the swept set, the live prefixes
 *  those ids imply, and the run-time-assembled prefixes that cannot be
 *  enumerated at all. */
function citationWorld(sources) {
  const defined = new Set();
  const dynamicPrefixes = new Set();
  for (const src of Object.values(sources)) {
    const { ids, dynamicPrefixes: dyn } = collectAssertionIds(src);
    for (const i of ids) defined.add(i);
    for (const d of dyn) dynamicPrefixes.add(d);
  }
  const prefixes = new Set();
  for (const id of defined) {
    const m = id.match(/^[A-Za-z]+/);
    if (m && !NOT_ASSERTION_NAMESPACES[m[0]]) prefixes.add(m[0]);
  }
  return { defined, prefixes, dynamicPrefixes, namespaces: new Set(Object.keys(NOT_ASSERTION_NAMESPACES)) };
}

/**
 * D76 — THE MASK, and this instrument needs one more than most.
 *
 * A scan whose own stored rows are written in its subject's vocabulary must
 * mask them, or every row it pins becomes an occurrence it counts. QA-09's
 * two files NAME the ids they exist to find, in prose, as examples — so
 * without a mask this sweep reports itself, forever, and the cheapest repair
 * would be to stop naming the examples, which is D54's failure mode wearing
 * D76's clothes.
 *
 * The mask applies to QA-09's OWN TWO FILES ONLY. It is pinned as a literal
 * (AP5d) so adding a token to it is a visible edit rather than a silencing,
 * and AP5e requires every masked token to actually occur — a stale entry is
 * a silencer with nothing to silence.
 */
const QA09_FILES = ['tools/assertion-provenance.mjs', SELF];
const isQa09 = (f) => QA09_FILES.includes(f);
/* Assembled rather than written, and that is not decoration: a bare literal
   here is the FIRST ELEMENT OF AN ARRAY, which is exactly the shape
   `collectAssertionIds` reads as a fixture-table row — so writing the mask
   out plainly would DEFINE the ids it masks and blind the sweep tree-wide.
   Measured: with these written as literals, the id vanished from the world's
   undefined set and the whole scan went quiet. D76, twice in one constant. */
/* WIDENED 2026-08-22 by the instrument-diet order, from two tokens to five,
   and the widening is a SUBTRACTION of subjects rather than a silencing of
   findings. The three added tokens are worked examples in QA-09's own prose —
   the two data-blindness instances the module header narrates, and the
   family-stem example beside `isFamilyStem` — and every one of them named an
   id in a suite that is now retired out of the gate. They are therefore
   undefined in the swept corpus and classify FC1 on the scan's own terms,
   correctly. The mask rather than a reword, because the examples are worth
   more concrete than abstract, AP5d pins this list's SIZE so the growth is a
   visible edit, and AP5e refuses any entry that no longer occurs. The mask
   still applies to QA-09's TWO FILES ONLY, so a citation of any of them
   anywhere else in the tree is still a row to adjudicate. */
const SELF_CITED = ['HCLO' + '40', 'HTEN' + '72b', 'HCLO' + '08', 'HCLO' + '60-65', 'PC' + '-1c'];
/**
 * A SECOND mask, with a DIFFERENT reason, kept in its own list rather than
 * folded into the one above — a mask widened for a reason its own comment
 * does not state is a silencer.
 *
 * ORDER NAMES WHOSE STEM IS ALSO A LIVE ASSERTION PREFIX. QA-09 already
 * declared order-name stems as non-assertion namespaces — `QA`, `GATE`,
 * `PAGE`, `WIRE` — and that works because none of them also names an
 * assertion. `AP` is the first collision in this program: this suite's own
 * rows are `AP1`…`AP14`, so `AP` is a LIVE prefix, while the two orders that
 * built and widened this scan are written in the ledger's own style as an
 * `AP` stem plus a number. The sweep classifies them `FC1` — prefix live, id
 * defined nowhere — and it is right on its own terms.
 *
 * `NOT_ASSERTION_NAMESPACES` cannot take `AP`: it is keyed by ALPHA STEM, so
 * declaring it there would blind the sweep to every genuinely false `AP*`
 * citation tree-wide, in the file that owns those ids. The collision needs
 * keying by FULL TOKEN, which is what this is — and, like the mask above, it
 * applies to QA-09's two files only, so a citation of these names anywhere
 * else still lands as a row to adjudicate.
 *
 * Assembled from parts for the same reason as SELF_CITED: written whole as
 * the first element of an array, the token would be read as a fixture-table
 * row and DEFINE the very id it masks.
 */
const SELF_ORDERS = ['AP' + '-01', 'AP' + '-02'];
const MASKED = [...SELF_CITED, ...SELF_ORDERS];
function citationSweep(sources, world) {
  const rows = [];
  for (const [f, src] of Object.entries(sources)) {
    for (const r of citationCandidates(src, world)) {
      if (isQa09(f) && MASKED.includes(r.token)) continue;
      rows.push(`${f} :: ${r.token} :: ${r.tier}`);
    }
  }
  return [...new Set(rows)].sort();
}
const CITE_FILES = citationSubjects();
const CITE_SOURCE = Object.fromEntries(CITE_FILES.map((f) => [f, read(f)]));
/**
 * WHERE AN ID CAN BE DEFINED, and it is narrower than where one can be
 * CITED — deliberately, with the limit stated.
 *
 * Definitions are read from the gated suites and the shared instruments in
 * tools/. Production sources under journey/ are SWEPT for citations (that is
 * where the `media.js` one lived) but never read for definitions, because
 * nothing there calls an assertion receiver and parsing them costs 6,379 ms
 * against 115 ms for tools/ — the difference between a tier-1 instrument and
 * a minute of gate time. THE LIMIT: an id defined only inside a production
 * file would read here as undefined and could be reported as a false
 * citation. There are none today; if one ever lands, this is the line that
 * explains the row.
 */
const ID_CORPUS = Object.fromEntries(
  CITE_FILES.filter((f) => f.startsWith('tools/') || GATED.includes(f)).map((f) => [f, CITE_SOURCE[f]]),
);
const WORLD = citationWorld(ID_CORPUS);
const CITATIONS = citationSweep(CITE_SOURCE, WORLD);

/* ==================================================================== *
 * READERS. Every pin below drives one of these over an INPUT, so a mutant
 * can perturb the input and the registry can check that the output moved.
 * ==================================================================== */
const sitesOf = (i) => scanDataBlind(i.src, i.recv).sites;
const fixtureVerdicts = (i) => i.rows.map(([id, , src, want]) => {
  const got = scanDataBlind(src, i.recv).rows.map((r) => r.cls);
  return `${id}:${got.join(',') === want.join(',') ? 'ok' : `WRONG got=${got.join(',')}`}`;
});
const citationVerdicts = (i) => i.rows.map(([id, , src, want]) => {
  const got = citationCandidates(src, i.world).map((r) => r.tier);
  return `${id}:${got.join(',') === want.join(',') ? 'ok' : `WRONG got=${got.join(',')}`}`;
});

/* ==================================================================== *
 * THE LEDGER.
 * ==================================================================== */
console.log('QA-09 — assertion provenance: data-blindness (D94) and false citations (D92)\n');

/* ---- AP1/AP2: the scan is reading what it claims to read ------------ */
pin('AP1', 'D49 — every gated suite is declared: a receiver shape, or an UNSCANNABLE entry with a reason',
  (i) => i.gated.filter((f) => !i.recv[f] && !i.skip[f]),
  { gated: GATED, recv: RECEIVERS, skip: UNSCANNABLE }, [],
  'a suite wired into package.json with no declaration here is a suite this sweep silently skips; '
  + 'declare its ledger shape in RECEIVERS or name it in UNSCANNABLE with the reason. This fired for '
  + 'real during QA-09\'s own development: another lane wired tools/test-c06-registry.mjs into the '
  + 'gate mid-run and this row was red within the minute.');
L.same('AP1b', 'D45 — the gated set this sweep derived from package.json, as a manifest',
  /* RE-BASELINED by order R05, 2026-08-22. WAS: [56, 55, 1]. One suite
     joined the chain — tools/test-r05-chapter-disposal.mjs — so the gated
     set and the scanned subjects each grow by one and the declared
     unscannable set does not move. (The J05 re-baseline this replaces read:
     WAS [55, 54, 1], for tools/test-page-lifetime.mjs.) */
  /* RE-BASELINED AGAIN by order R07, 2026-08-22. WAS: [58, 57, 1]. One
     suite joined the chain — tools/test-r07-final-disposal.mjs — so the
     gated set and the scanned subjects each grow by one and the declared
     unscannable set does not move. */
  /* RE-BASELINED AGAIN by order R08, 2026-08-22, the last of the R-series.
     WAS: [59, 58, 1]. One suite joined the chain —
     tools/test-r08-registry-cascade.mjs — same shape, same single step. */
  /* RE-BASELINED 2026-08-22 by the instrument-diet order. WAS: [63, 62, 1].
     NINE suites leave the chain, so the gated set and the scanned subjects
     each fall by nine and the declared unscannable set does not move. Every
     prior re-baseline of this row was +1; this is the first that is -9. The
     nine are named in the retired-suites README and in the TIER1/TIER2
     comments of the gate-composition suite. */
  /* RE-BASELINED 2026-08-26 by the wiring order that found AP1 red over
     tools/test-detail-shell-monotone.mjs. WAS: [49, 48, 1]. This step is +2 and
     only ONE of the two is this order's: TWO suites joined the chain since this
     row was last bumped — tools/test-rest-authority.mjs, whose receiver shape is
     declared above but whose count bump had not landed when this was measured,
     and tools/test-detail-shell-monotone.mjs, which this order declares. Both are
     now scanned subjects, so gated and subjects each move by two and the declared
     unscannable set does not move. The count is written out rather than deduced
     so that the +2 is visible as two suites and not as an arithmetic slip; if the
     sibling order bumps this row too, this pin goes red and says so, which is the
     behaviour that makes the row worth having. */
  /* RE-BASELINED 2026-08-26 by CONV-CLOSE, which wired
     tools/test-declared-conversions.mjs into test:contracts. WAS: [51, 50, 1].
     ONE suite joined the chain and is declared above, so the gated set and the
     scanned subjects each grow by one and the declared unscannable set does
     not move. A +1 and not a +2 this time: the sibling debt the previous
     re-baseline absorbed is closed, and D49's UNWIRED_TODAY array in
     tools/test-gate-composition.mjs is empty again as of the same change. */
  /* RE-BASELINED AGAIN 2026-08-26 by DIET-02, which RETIRES
     tools/test-c06-registry.mjs out of test:contracts. WAS: [52, 51, 1].
     ONE suite leaves the chain and its receiver declaration leaves the map
     above in the same change, so the gated set and the scanned subjects each
     shrink by one and the declared unscannable set does not move. THE FIRST
     RE-BASELINE OF THIS ROW IN THE SHRINKING DIRECTION — every prior one added
     a suite — which is why the -1 is written out as one suite rather than
     deduced: a shrink is the direction in which a silent arithmetic slip looks
     like housekeeping. */
  /* RE-BASELINED 2026-08-27 for the production no-scroll transport contract,
     which is wired through test:unit and uses ordinary node:assert receivers. */
  /* RE-BASELINED 2026-08-27 for the Purpose/Ownership rail handoff contract,
     also wired through test:unit and declared above. */
  /* Hotspot departure adds one gated suite and, once declared above, one
     scanned subject. The single explicit unscannable suite is unchanged. */
  [GATED.length, SUBJECTS.length, Object.keys(UNSCANNABLE).length], [54, 53, 1],
  'derived by reading test:unit + test:contracts + test:static, not hand-listed');
pin('AP2', 'D46 — every scanned suite reached at least one assertion call site (a ZERO is a rotted receiver declaration, and zero is also the passing answer)',
  (i) => Object.keys(i.sources).filter((f) => sitesOf({ src: i.sources[f], recv: i.recv[f] }) === 0),
  { sources: SOURCE, recv: RECEIVERS }, [],
  'a renamed ledger method takes its file to 0 sites and 0 hits, which reads exactly like a clean file');

/* ---- AP3/AP4: the manifests ---------------------------------------- */
pin('AP3', 'D94 — the DATA-BLIND HITS across every gated suite (DB1 assert-empty over invented data, DB2 a census claim over it, DBP a prove-failure site with no subject on either side)',
  (i) => sweepRows(i.sources).hits, { sources: SOURCE }, [],
  'a MANIFEST, keyed file :: id :: class and deliberately not line-keyed (D64/D66): three lanes are '
  + 'live in tools/ and a line number churns on every neighbour edit. A row leaving is as much a '
  + 'finding as a row arriving. EIGHTEEN ROWS LEFT, and this is the record of why, because a '
  + 'manifest that shrinks silently buys nothing: SUB-01 rewrote all 17 `HSUB*` DBP rows into '
  + 'registry pins whose INPUT is the shipped bytes — SRC.substrate, SRC.oracle, the staged module '
  + 'namespace, a readFileSync of static/geom — where each had previously compared two literals an '
  + 'author typed, and rewrote PC-3e to filter the gate surface it derives from package.json rather '
  + 'than a hand-written list. Each of the 18 was verified individually against the shipped text, '
  + 'not cleared as a block. THE LAST ROW LEFT WITH ITS FILE, 2026-08-22: the one remaining hit '
  + 'lived in the clones extraction proof, which is retired out of the gate, so this manifest is '
  + 'now EMPTY and no longer carries its own D46 positive control. That control did not vanish, it '
  + 'changed hands: AP6 runs the data-blindness scanner over SEVENTEEN synthetic fixture rows, nine '
  + 'of them CLEAN, and AP6b reds when a row is removed — so "this scan can still find the shape it '
  + 'was built to find" is now proved on manufactured subjects rather than on whichever shipped '
  + 'suite happens still to contain one, which is the stronger of the two. The AP3 mutant is '
  + 're-aimed to match: it INJECTS the shape into a swept suite and requires a row to ARRIVE, which '
  + 'is the only direction an empty manifest can be driven in.');
pin('AP4', 'D94 — the INVENTORY: literally-closed assertions with no census claim. These are the literals that are legitimately literal (iteration pins over a suite\'s own table, demo rows), reported so the boundary is on the record rather than in a reviewer\'s head',
  (i) => sweepRows(i.sources).inventory, { sources: SOURCE }, [
    'tools/test-assertion-provenance.mjs :: AP5d :: DB3',
    'tools/test-coverage-floor.mjs :: PC-3e2 :: DB3',
    'tools/test-coverage-floor.mjs :: PC-6b :: DB3',
    'tools/test-instrument-layer.mjs :: COV-3 :: DB3',
    /* Purpose/Ownership handoff, 2026-08-28. This is the fixed
       forward-and-reverse fixture for the gather projector: the assertion
       executes `1 - ownership` over the declared trace and compares it with
       that fixture's closed symmetric complement. It is intentionally
       literal test data, not a census or coverage claim, so DB3 is the honest
       classification and the row belongs in the recorded inventory. */
  /* 418 -> 465 (2026-08-30): the row did not change class and nothing was
     repaired — the Purpose nav-pocket's two coordinate pins above it became a
     coverage property over eleven viewports, which is longer than what it
     replaced, so this site moved down the file. The manifest is keyed by site
     precisely so that shows up here rather than in a count. */
  'tools/test-rail-handoff.mjs :: assert.deepEqual@465 :: DB3',
    'tools/test-render-baseline.mjs :: M9.demo :: DB3',
    /* connect-skip second pass, 2026-08-25 — the SIXTH row. tools/test-rest-composition.mjs's
       C4, the vacuity pin: `assert.ok(DECLARED_DEFICIT_MS > 0, ...)`. It compares
       a constant this suite declares against a literal ON PURPOSE — a
       self-consistency tripwire that fires when the shortfall the file exists to
       pin is closed, which is the same species as the allowlist-vs-size row
       described in the standing note above. Legitimately literal; reported, not
       repaired. */
    /* @313 -> @373 by no-auto-advance, 2026-08-26. The id is line-anchored and
       that file gained a header retirement note and a C1d pin ABOVE this site;
       the assertion itself is untouched.

       ONE ROW BECAME THREE, 2026-08-26, when the wrap's landing beat was
       retired. @373 -> @382 is the same renumbering as before — the vacuity
       tripwire on `DECLARED_BUDGET_MS`, untouched. The TWO NEW ROWS are a real
       change of class and are reported rather than absorbed: that file's C3
       used to read `Math.max(COMMIT_REST_BEAT_MS, WRAP_WALL_FLOOR_MS)`, a call
       over a shipped constant, and with the constant retired its two conjuncts
       compare two of that file's own MEASURED DECLARATIONS against each other
       (the wall floor is positive; it is under the swallow ceiling). That is
       legitimately literal — a self-consistency pin between two measurements,
       with its killer beside it — but it is literal where it was not before,
       and this manifest exists so that line moves visibly. */
    /* @351/@357/@382 -> @432/@438/@463 by the ceremonial-seam re-derivation,
       2026-09-01: that file gained a header amendment, the crossfade model
       note and two C1a source pins ABOVE these sites; the three assertions
       themselves are untouched — the same two C3 conjuncts and the same C4b
       vacuity tripwire. Line-anchored renumbering only, the @313 -> @373
       species. */
    'tools/test-rest-composition.mjs :: assert.ok@432 :: DB3',
    'tools/test-rest-composition.mjs :: assert.ok@438 :: DB3',
    'tools/test-rest-composition.mjs :: assert.ok@463 :: DB3',
  ],
  'FIVE rows as of 2026-08-22 (WAS: nine). FOUR LEFT WITH THEIR FILES, and they are named here '
  + 'rather than deducted from a number, because a manifest that shrinks silently buys nothing: two '
  + 'demo rows in the clones proof, one iteration pin in the ring proof and one in the tendrils '
  + 'proof, all four retired out of the gate. Not one was repaired and not one changed class; their '
  + 'files simply stopped being swept. What follows is the standing nine-row note, kept because it '
  + 'is this manifest\'s account of what the class means. '
  + 'ORIGINALLY NINE rows, and the ninth is the ONE ROW AP-02\'s receiver widening added — reported here rather '
  + 'than absorbed, because a manifest that grows silently buys nothing either. `M9.demo` sits inside '
  + 'tools/test-render-baseline.mjs\'s --demo-delta block, which the gate never runs: '
  + '`manifestFloor(\'M9.demo\', \'cancelAnimationFrame sites (INJECTED DELTA)\', [], CANCEL_RAF_SITES)` '
  + 'hands a hand-written empty actual to a monotonic floor ON PURPOSE, to show what the failure '
  + 'message names. Same species as the two HCLO-DEMO rows already below, and the discrimination is '
  + 'worth noting: its two siblings in the same block, X3.demo and M7.demo, are NOT rows, because '
  + 'their actuals really are read off the report. It was unread until this order declared '
  + '`manifestFloor` as a receiver. Every one of them is a literal that is legitimately literal: three '
  + '--demo-delta '
  + 'rows whose whole purpose is a synthetic value, an iteration pin over the mutant table a suite '
  + 'wrote itself, a self-consistency tripwire between a hand-written allowlist and its declared '
  + 'size, a cardinality pin over a hand-written key list, an assert-zero\'s own D46 control, a '
  + 'decomposition of a literal whose ANCHOR to the subject is the assertion immediately above it '
  + '(HRING98 after HRING93) — and AP5d, THIS SUITE\'S OWN. The scan '
  + 'classifies its own iteration pin exactly as it classifies everyone else\'s, which is the only '
  + 'honest way to ship a class called "legitimately literal". They are pinned so that the LINE '
  + 'between DB3 and DB1 is on the record and moves visibly, not so that anyone repairs them.');

/* ---- AP5: the citation manifest ------------------------------------ */
pin('AP5', 'D92/D94 — assertion ids CITED IN PROSE that exist in no suite',
  (i) => citationSweep(i.sources, i.world), { sources: CITE_SOURCE, world: WORLD }, [],
  'the two the order named — one in tools/test-clones-split.mjs, one in journey/ui/media.js — were '
  + 'here and are REPAIRED by QA-09, comment only, never the assertion. The one that remains is not a '
  + 'coverage claim: it names a RETIRED id in the past tense ("the previous revision\'s …"). Tense is '
  + 'not mechanically readable and this scan does not pretend otherwise — it was reported, and '
  + 'left. IT LEFT WITH ITS FILE, 2026-08-22: it lived in the tendrils extraction proof, now retired '
  + 'out of the gate, so this manifest is EMPTY. Its controls are AP5b (the corpus is real) and AP7 '
  + '(the citation fixtures classify as declared); neither depends on a live row being present.');
L.same('AP5b', 'D46 — the citation sweep read a real corpus (files swept / ids defined / live prefixes), so a zero above is a zero over something',
  /* RE-BASELINED 2026-08-22. WAS: `> 800` defined ids. The nine retired suites
     held ~212 ids between them (measured: 800+ -> 588), so the FLOOR moves with
     the corpus. It is a floor on a corpus, not a pin on a count, and it is
     lowered exactly once with the reason attached rather than turned into a
     bare truth. */
  [CITE_FILES.length > 100, WORLD.defined.size > 500, WORLD.prefixes.size > 20], [true, true, true],
  `swept ${CITE_FILES.length} files, ${WORLD.defined.size} defined ids, ${WORLD.prefixes.size} live prefixes`);
/* NARROWED 2026-08-22 by the instrument-diet order, from two subjects to one.
   QA-09 repaired two false citations: one in the clones extraction proof, one
   in journey/ui/media.js. The clones half is DROPPED, not repointed. Its file
   is retired to the run's evidence directory and is no longer shipped, gated
   or swept — so "gone from the shipped text" has no subject there any more,
   and reading it back out of an evidence directory to keep a green row would
   be D65 recurring inside the gate for the sake of a pin. The media half is
   the more valuable one regardless: it is LIVE PRODUCTION prose, still swept
   on every run, and the mutant below drives it. */
pin('AP5c', 'D94 — the false citation QA-09 repaired in LIVE PRODUCTION prose is gone from the shipped text, and the repair was a COMMENT',
  (i) => [i.media.includes(i.tok), i.media.includes(i.keep)],
  {
    media: read('journey/ui/media.js'),
    /* assembled: see SELF_CITED — a bare literal here would DEFINE the id */
    tok: 'MQ' + '2',
    keep: 'typeof matchMedia',
  },
  [false, true],
  'the second element is the control: the production expression the comment described still stands. '
  + 'A repair that deleted the code along with the comment would read the same on the first.');
L.same('AP5d', 'D76 — the two self-masks, pinned as literals so adding to either is a visible edit and not a silencing',
  /* RE-BASELINED 2 -> 5 on the first element, 2026-08-22. See the comment on
     SELF_CITED: three worked examples in QA-09's own prose lost their subjects
     when their suites were retired. */
  [SELF_CITED.length, SELF_ORDERS.length, QA09_FILES.length], [5, 2, 2],
  'both masks apply to QA-09\'s own two files only; every other file in the tree is unmasked. They '
  + 'are counted SEPARATELY because they are silencing different things for different reasons — the '
  + 'first, ids this scan names as its own examples; the second, ORDER NAMES whose stem `AP` is also '
  + 'this suite\'s live assertion prefix, which is the first such collision in this program');
pin('AP5e', 'D54 — every masked token actually occurs in a QA-09 file: a stale entry is a silencer with nothing to silence',
  (i) => i.tokens.filter((t) => !i.files.some((f) => f.includes(t))),
  { tokens: MASKED, files: QA09_FILES.map((f) => read(f)) }, []);

/* ---- AP6/AP7: the fixture tables (D46) ----------------------------- */
const FIXTURE_RECEIVERS = {
  'L.same': SAME, pin: PIN, 'L.check': CHECKP3, prove: PROVE4,
};
pin('AP6', 'D46 — every data-blindness fixture classifies exactly as declared, CLEAN rows included',
  fixtureVerdicts, { rows: DATA_BLIND_FIXTURES, recv: FIXTURE_RECEIVERS },
  ['DB-F1:ok', 'DB-F2:ok', 'DB-F3:ok', 'DB-F4:ok', 'DB-F5:ok', 'DB-F6:ok',
    'DB-F7:ok', 'DB-F8:ok', 'DB-F9:ok', 'DB-F10:ok', 'DB-F11:ok', 'DB-F12:ok',
    'DB-F13:ok', 'DB-F14:ok', 'DB-F15:ok', 'DB-F16:ok', 'DB-F17:ok'],
  'nine of the seventeen are CLEAN rows: a scan that started reddening everything would fail here, '
  + 'not merely a scan that went blind');
/* D54 over D45 — AP6b and AP7b USED TO BE `DATA_BLIND_FIXTURES.length === 15`
   and `CITATION_FIXTURES.length === 8`. Both went stale within the hour of
   being written, when the gating proof found a miss and three rows were added.
   The count satisfied D94 — the collection IS read off the subject — and
   failed D54, which is a different question: can the pin survive the subject
   legitimately growing, and can a reader audit the repair? A bumped number
   cannot be audited; a missing ROW names itself. AP6 and AP7 already pin the
   fixture SET, keyed by id, so the counts are deleted rather than converted:
   an existing pin covers the property (D84 rule 3). What the counts DID cover
   and the verdict lists do not is a row being REMOVED — so that is pinned
   here, as a set, by name. */
pin('AP6b', 'D54 — the data-blindness fixture SET, by name: a row removed names itself, where a bumped count could not',
  (i) => i.rows.map((r) => r[0]), { rows: DATA_BLIND_FIXTURES },
  ['DB-F1', 'DB-F2', 'DB-F3', 'DB-F4', 'DB-F5', 'DB-F6', 'DB-F7', 'DB-F8',
    'DB-F9', 'DB-F10', 'DB-F11', 'DB-F12', 'DB-F13', 'DB-F14', 'DB-F15',
    'DB-F16', 'DB-F17'],
  'DB-F13/14/15 are the rows the gating proof forced: the INLINE form of D94\'s shape, which the '
  + 'first draft of this scan could not see. DB-F16/17 are the pair this order forced: a container '
  + 'written through a CONDITIONAL target, and the same assertion with the write deleted, so the '
  + 'repair is pinned in both directions at once.');
const FIXTURE_WORLD = {
  /* CITE-TOKENS adds one row: a three-segment id, DEFINED, so FC-F9 can pin
     that a citation of a real one is not a row while FC-F10 pins that its
     undefined sibling still is. The token itself lives in the array below
     rather than in this comment, because a comment naming an id that no suite
     defines is the shape this whole sweep exists to report — and the array is
     data, which the sweep does not read. */
  defined: ['HCLO100', 'HCLO60', 'HCLO65', 'PC-2a', 'PC-2b', 'HCLO-EVT-2'],
  prefixes: ['HCLO', 'PC'],
  dynamicPrefixes: [],
  namespaces: Object.keys(NOT_ASSERTION_NAMESPACES),
};
pin('AP7', 'D46 — every citation fixture classifies exactly as declared',
  citationVerdicts, { rows: CITATION_FIXTURES, world: FIXTURE_WORLD },
  ['FC-F1:ok', 'FC-F2:ok', 'FC-F3:ok', 'FC-F4:ok', 'FC-F5:ok', 'FC-F6:ok', 'FC-F7:ok', 'FC-F8:ok',
    'FC-F9:ok', 'FC-F10:ok', 'FC-F11:ok']);
/* CITE-TOKENS, 2026-08-26. AP7 compares TIERS, which is enough to red on a
   `\b`-delimited harvester but does not say what the harvest UNIT is. This row
   does, and it pins the two halves of the repair together, because either one
   alone is a defect:

     · the CITATION half — the token a three-segment citation yields is the
       WHOLE hyphenated word, or nothing at all. Never an interior fragment.
     · the DEFINITION half — the SAME shape is collected as a definition off
       the SHIPPED subject, tools/test-dwell-oracle.mjs. Harvest a citation
       whole while the definition side still cannot see the id and the row
       does not go away, it changes tier.

   The definition half reads the real file rather than a synthetic string on
   purpose (D94): a hand-written subject here would prove the scan agrees with
   this order's typing, not that it reads the tree. */
pin('AP7c', 'D92 — THE HARVEST UNIT: a three-segment citation yields the WHOLE hyphenated word or nothing, and the same shape is COLLECTED as a definition off the shipped subject',
  (i) => [
    ...i.rows.filter((r) => ['FC-F9', 'FC-F10', 'FC-F11'].includes(r[0]))
      .map(([id, , src]) => `${id} :: ${citationCandidates(src, i.world)
        .map((r) => `${r.token}/${r.tier}`).join(',') || '(no row)'}`),
    `defined :: ${collectAssertionIds(i.dwellSrc).ids.filter((x) => x.split('-').length === 3).length > 0}`,
  ],
  { rows: CITATION_FIXTURES, world: FIXTURE_WORLD, dwellSrc: read('tools/test-dwell-oracle.mjs') },
  ['FC-F9 :: (no row)', 'FC-F10 :: HCLO-EVT-9/FC1', 'FC-F11 :: (no row)', 'defined :: true'],
  'the middle row is the one that keeps this from being a silencer: an id of the SAME shape that no '
  + 'suite defines is still reported, and reported under its whole name. The last row is the '
  + 'definition half, asserted as a PRESENCE over the shipped file rather than as a count, so it '
  + 'survives that suite legitimately gaining or losing guards.');
pin('AP7b', 'D54 — the citation fixture SET, by name',
  (i) => i.rows.map((r) => r[0]), { rows: CITATION_FIXTURES },
  ['FC-F1', 'FC-F2', 'FC-F3', 'FC-F4', 'FC-F5', 'FC-F6', 'FC-F7', 'FC-F8',
    'FC-F9', 'FC-F10', 'FC-F11'],
  'FC-F9/F10/F11 are the rows CITE-TOKENS forced: the harvest unit. They are a SET rather than a '
  + 'count for the reason the note above gives, and they come as a trio because one of them alone '
  + 'is a silencer — F9 says the false tail is gone, F10 says the real dangling citation is not.');

/* ---- AP15-AP17: IS THE DECLARATION COMPLETE? ----------------------- *
 *
 * THE GAP THIS CLOSES. AP1 pins that every gated suite is DECLARED.
 * NOTHING pinned that its declaration is COMPLETE — so a suite adopting a
 * new assertion receiver narrowed this scan SILENTLY, which is D54's "goes
 * stale in the direction that matters", inside the instrument built to find
 * data-blindness. It had already happened: SUB-01 moved seventeen sites onto
 * `pin`, and until the receiver map was widened those seventeen — the sites
 * this program had just repaired — were unread, while AP2 stayed green
 * because it asks whether a file reached ANY site and `L.same` alone reaches
 * 46. That is the worst outcome available from a repair, and it shipped
 * green.
 *
 * WHY THE MAP IS NOT SIMPLY DERIVED, which is the honest half of the answer.
 * The receiver NAMES are derivable and are derived below. The receiver
 * SPECS are not: `{ id, what, data, expected, reader, prove }` are argument
 * indices that cannot be read off a call site, only off the helper's own
 * definition, and `prove` is a judgement about a CONTRACT that no source
 * states. The proof is two helpers in this tree: `check(name, fn)` in
 * tools/test-browser-harness.mjs RUNS the function and renders a verdict, so
 * it is a receiver; `check(name, fn)` in tools/test-chapter-contract.mjs is
 * `(name, fn) => CHECKS.push({ name, fn })`, a REGISTRAR whose comparisons
 * are the `assert.*` calls inside the body — already declared, already
 * scanned, and double-counted if `check` were declared too. The two are
 * IDENTICAL at every call site. A derivation that produced specs would have
 * to get one of them wrong, silently, with a plausible-looking row (D59).
 *
 * So the derivation produces CANDIDATE NAMES and every one is adjudicated:
 * declared in RECEIVERS with a shape, or named here as a non-receiver with a
 * reason. D99 is honoured explicitly — deriving the candidate set from the
 * subject satisfies D94, and NOT D54, so what is pinned is a SITE SET KEYED
 * BY NAME (`file :: callee`) and never a count. A suite that adopts a
 * receiver ADDS A ROW.
 * ==================================================================== */

/** Callees that carry a ledger-row label and are NOT assertion receivers.
 *  Keyed by name with the reason; the SITES are pinned separately by AP15b,
 *  so a NEW file reaching for one of these still lands as a row to read. */
const NOT_RECEIVERS = {
  M: 'the mutant registry\'s DECLARATOR — `M(pinId, what, axis, perturb)` names the pin a mutant '
    + 'targets. It renders no verdict; the registry does. HSUB70 excludes it for the same reason.',
  mutateText: 'a TEXT MUTATOR — `mutateText(src, tag, from, to)`. The label-shaped argument is `tag`, '
    + 'which names the mutation for the failure message. There is no actual and no expected.',
  /* `F` — the J04 verifiers' corruption injector — stood here and is REMOVED
     2026-08-22 with the suites that called it. AP15c is the pin that demanded
     it: a declared exclusion nothing reaches is a licence with nothing to
     license, and AP15c reddened naming it the moment the suites left. Its
     adjudication, kept for the record because the shape can return: `F(site,
     value)` wrapped the ACTUAL on its way into `eq` or `check`, both of which
     were declared, so declaring it would have counted the same comparison
     twice under a receiver with no expected side at all. */
  capture: 'tools/test-scroll-trace.mjs\'s `capture(id, purpose, rig)` — it records a trace into the '
    + '--emit-matrix artifact and hands the rows back. No comparison, no verdict.',
  bend: 'tools/test-transition.mjs\'s `bend(tag, from, to)` — a mutation FACTORY returning a '
    + 'perturbation closure for the registry, not an assertion.',
  uniqueSlice: 'tools/test-ui-closure.mjs\'s `uniqueSlice(src, tag, start, end)` — the shared '
    + 'sliceBetween with J02\'s ambiguity refusal in front of it. The label-shaped argument is `tag`, '
    + 'which names the slice for the refusal message, exactly as `mutateText`\'s does. There is no '
    + 'actual and no expected. NOTE FOR A LATER ORDER: tools/instrument-ledger.mjs\'s own '
    + 'sliceBetween has the same shape and is NOT here only because no gated suite has yet passed it '
    + 'an id-shaped tag; the day one does, AP15 reds and this is the adjudication it wants.',
  literalMembers: 'tools/test-global-hooks.mjs\'s `literalMembers(src, tag, openAnchor)` — an '
    + 'EXTRACTOR. It brace-matches an object literal and returns its top-level member names for a '
    + 'pin to compare; the label-shaped argument is `tag`, which names the literal in the refusal '
    + 'message when the anchor is absent or ambiguous, exactly as `mutateText`\'s and '
    + '`uniqueSlice`\'s do. There is no actual and no expected. J04c, 2026-08-22 — AP15 found it '
    + 'the moment the suite was wired, which is the second time the completeness pin has named a '
    + 'new callee on a wiring rather than a reviewer doing it.',
/* `mutate` — tools/test-ui-lifecycle.mjs's local alias for the shared
     `mutateText` — stood here and is REMOVED by the DISPOSAL REMOVAL,
     2026-08-25, with the one call site above this derivation's horizon.
     J05 declared it when its re-aimed UIL-T10b mutant called it directly from
     a perturb arrow; UIL-T10b was the no-production-caller census over
     `ui.destroy()` and went with the method. Every surviving `mutate` call in
     that suite is nested inside another function again, so the derivation no
     longer reaches one. AP15c is the pin that demanded this deletion: it
     reddened naming `mutate` on the first run after the retirement — the
     FOURTH time the completeness pin has named a drifting exclusion on an
     edit rather than a reviewer doing it. The alias itself still exists and
     is still a text mutator, so if a future edit calls it directly again,
     this entry comes back with the adjudication above `uniqueSlice`'s. */
  /* `armSentinel` — the abort sentinel's constructor (D70), whose first
     argument is a label — stood here and is REMOVED 2026-08-22 for AP15c's
     reason. It is STILL CALLED, by many surviving suites: what left is every
     call site that passed it an ID-SHAPED first argument, which is the only
     shape this derivation reaches. If a suite ever labels a sentinel with an
     id again, AP15 reds and this row is the adjudication it wants back. */
  auditRegistrations: 'tools/stage-tree.mjs\'s D95 guard. It raises a typed fault or returns a '
    + 'tally; it writes no ledger row.',
  /* `D.same` — the owned-substrate proof's --demo-delta ledger, whose rows
     were SYNTHETIC by design — stood here and is REMOVED 2026-08-22 with the
     suite that defined it, for AP15c's reason. */
  check: 'ONLY as it appears in tools/test-chapter-contract.mjs, where it is '
    + '`(name, fn) => CHECKS.push({ name, fn })` — a registrar, not a receiver. Everywhere else in '
    + 'this tree `check` IS declared as a receiver, which is why this exclusion is keyed by SITE '
    + 'below and not by name alone.',
};
/* FOUR MORE WERE WRITTEN HERE AND ARE GONE, and AP15c is why. `fault`,
   `REGISTRY.get`, `Buffer.from` and `harnessSrc.includes` all surfaced in a
   first, wider probe of this tree and were adjudicated in good faith — and
   the SHIPPED derivation never produces any of them, because each is a
   one-argument call and the arity floor (fixture RD-F6) drops it before it
   is ever a candidate. Four licences with nothing to license, written by the
   author of the guard that caught them, on its first run. They are deleted
   rather than kept "for safety": an exclusion nobody reaches reads to the
   next maintainer as a decision somebody made about a real call site. */

/** Every gated file, including the UNSCANNABLE one — a receiver appearing
 *  there would be the news that it is no longer unscannable. */
const ALL_SOURCE = Object.fromEntries(GATED.map((f) => [f, read(f)]));

/** `file :: callee` for every label-bearing callee, split three ways. */
function receiverDrift(sources, recv, notRecv) {
  const undeclared = [];
  const excluded = [];
  for (const [file, src] of Object.entries(sources)) {
    const declaredHere = Object.keys(recv[file] || {});
    for (const callee of [...idBearingCallees(src).keys()].sort()) {
      if (declaredHere.includes(callee)) continue;
      (notRecv[callee] ? excluded : undeclared).push(`${file} :: ${callee}`);
    }
  }
  return { undeclared: undeclared.sort(), excluded: excluded.sort() };
}

const DRIFT = receiverDrift(ALL_SOURCE, RECEIVERS, NOT_RECEIVERS);
pin('AP15', 'D54/D59 — COMPLETENESS: every label-bearing callee in every gated suite is adjudicated, as a receiver shape or as a named non-receiver. An undeclared one is a receiver this sweep does not read',
  (i) => receiverDrift(i.sources, i.recv, i.notRecv).undeclared,
  { sources: ALL_SOURCE, recv: RECEIVERS, notRecv: NOT_RECEIVERS }, [],
  'this is the pin AP1 could not be: AP1 asks whether a FILE is declared, this asks whether the '
  + 'declaration is COMPLETE. It fired for real when it was written — see AP15b\'s hint.');
/* ELEVEN ROWS LEFT 2026-08-22, and they are named here rather than deducted:
   `M` in the canopy, clones, owned-substrate, tendrils and terrain proofs,
   `armSentinel` in the canopy, tendrils and terrain proofs, `D.same` in the
   owned-substrate proof, and `F` in both J04 move verifiers. All nine suites
   are retired out of the gate. "A row leaving means a call site vanished" is
   exactly right here, and this is what it vanished into: a file the gate no
   longer sweeps. Three of the DECLARATIONS went with them — see the removal
   notes in NOT_RECEIVERS, which AP15c required rather than permitted. */
pin('AP15b', 'D54 — the EXCLUSIONS as a site set keyed `file :: callee`, never a count: a suite reaching for a non-receiver adds a row here, and a row leaving means a call site vanished',
  (i) => receiverDrift(i.sources, i.recv, i.notRecv).excluded,
  { sources: ALL_SOURCE, recv: RECEIVERS, notRecv: NOT_RECEIVERS }, [
    'tools/test-assertion-provenance.mjs :: M',
    'tools/test-assertion-provenance.mjs :: auditRegistrations',
    /* ONE EXCLUSION ROW WAS REMOVED HERE BY DIET-02, 2026-08-26.
       WAS: 'tools/test-c06-registry.mjs :: M'
       Its file is retired out of the chain and its receiver declaration went
       with it. "A row leaving means a call site vanished" is exactly right
       here, and this is what it vanished into: a file the gate no longer
       sweeps. AP15c is the row that would have reported the declaration as a
       stale silencer had it been left. */
    'tools/test-chapter-contract.mjs :: check',
    'tools/test-dwell-oracle.mjs :: M',
    'tools/test-dwell-oracle.mjs :: mutateText',
    /* J02, 2026-08-22. Its text mutants call the SHARED mutateText directly
       rather than wrapping it in a local factory, so this order adjudicates
       two already-named non-receivers and adds no new name to the map. */
    'tools/test-frame-publication.mjs :: M',
    'tools/test-frame-publication.mjs :: mutateText',
    /* J04c, 2026-08-22. Two already-named non-receivers, and ONE NEW NAME:
       `literalMembers`, the descriptor extractor A5 reads through. `uniqueSlice`
       is defined in this suite too and is absent from these rows only because
       every call it makes is inside another function the derivation does not
       reach as a call site of its own. */
    'tools/test-global-hooks.mjs :: M',
    'tools/test-global-hooks.mjs :: literalMembers',
    'tools/test-global-hooks.mjs :: mutateText',
    'tools/test-input-claim.mjs :: M',
    'tools/test-input-claim.mjs :: mutateText',
    /* SIX EXCLUSION ROWS WERE REMOVED HERE BY THE DISPOSAL REMOVAL, 2026-08-25.
       WAS:
         'tools/test-journey-lifecycle.mjs :: M'
         'tools/test-journey-lifecycle.mjs :: mutateText'
         'tools/test-preparation-lifecycle.mjs :: M'
         'tools/test-preparation-lifecycle.mjs :: mutateText'
         'tools/test-r05-chapter-disposal.mjs :: M'
         'tools/test-r05-chapter-disposal.mjs :: mutateText'
         'tools/test-r06-owned-disposal.mjs :: M'
         'tools/test-r07-final-disposal.mjs :: M'
         'tools/test-r08-registry-cascade.mjs :: M'
       Nine rows across six suites, all retired from the chain with the
       disposal machinery they proved. AP15c is the row that would have
       reported them as stale silencers had they been left, which is the
       maintenance obligation this list carries and the reason it is a SITE
       set rather than a name set. */
    'tools/test-page-lifetime.mjs :: M',
    'tools/test-page-lifetime.mjs :: mutateText',
    'tools/test-pose-oracle.mjs :: M',
    'tools/test-pose-oracle.mjs :: mutateText',
    'tools/test-road.mjs :: M',
    'tools/test-road.mjs :: mutateText',
    'tools/test-scroll-trace.mjs :: capture',
    'tools/test-transition.mjs :: M',
    'tools/test-transition.mjs :: bend',
    /* J03, 2026-08-22. Two already-named non-receivers, and ONE NEW NAME:
       `uniqueSlice`, which AP15 found for real the moment the suite was
       wired — the completeness pin doing exactly what it exists for. */
    'tools/test-ui-closure.mjs :: M',
    'tools/test-ui-closure.mjs :: mutateText',
    'tools/test-ui-closure.mjs :: uniqueSlice',
    'tools/test-ui-lifecycle.mjs :: M',
    /* `tools/test-ui-lifecycle.mjs :: mutate` WAS HERE and was removed by the
       DISPOSAL REMOVAL, 2026-08-25. J05 adjudicated it when it re-aimed the
       UIL-T10b mutant, whose perturb arrow called `mutate` directly rather
       than through a nested helper — the one call site above this
       derivation's horizon. UIL-T10b was the no-production-caller census over
       `ui.destroy()`; it is gone with the method, and every surviving call to
       `mutate` in that suite is nested again. AP15c is what said so: it
       reported this row as a silencer with nothing to silence on the first
       run after the retirement. */
  ],
  'keyed by SITE and not by name, because `check` is a receiver in six suites and a registrar in '
  + 'tools/test-chapter-contract.mjs — a name-keyed exclusion would silence it everywhere.');
pin('AP15c', 'D54 — every declared non-receiver actually occurs somewhere: a stale exclusion is a silencer with nothing to silence',
  (i) => Object.keys(i.notRecv).filter((c) => !i.rows.some((r) => r.endsWith(` :: ${c}`))),
  { notRecv: NOT_RECEIVERS, rows: DRIFT.excluded }, [],
  'the same argument AP5e makes about the citation mask, one instrument over: an exclusion nothing '
  + 'reaches is a licence sitting unused, and the next reader takes it for evidence that something '
  + 'was adjudicated.');
pin('AP16', 'D46 — THE STATED LIMIT AS DATA: the declared receivers this derivation CANNOT see, keyed `file :: callee`. Non-empty on purpose, and it is this pin\'s positive control',
  (i) => {
    const out = [];
    for (const [file, spec] of Object.entries(i.recv)) {
      if (!i.sources[file]) continue;
      const found = idBearingCallees(i.sources[file]);
      for (const callee of Object.keys(spec)) if (!found.has(callee)) out.push(`${file} :: ${callee}`);
    }
    return out.sort();
  },
  { sources: ALL_SOURCE, recv: RECEIVERS }, [
    'journey/structure.test.mjs :: assert.deepEqual',
    'journey/structure.test.mjs :: assert.equal',
    'journey/structure.test.mjs :: assert.ok',
    'tools/test-animation-lifecycle.mjs :: L.check',
    'tools/test-animation-lifecycle.mjs :: L.same',
    'tools/test-baked-lifecycle.mjs :: check',
    'tools/test-card-icons.mjs :: check',
  'tools/test-card-registry.mjs :: check',
  'tools/test-card-warming.mjs :: check',
    'tools/test-chapter-contract.mjs :: assert.deepEqual',
    'tools/test-chapter-contract.mjs :: assert.equal',
    'tools/test-chapter-contract.mjs :: assert.ok',
    'tools/test-chapter-entry.mjs :: assert.deepEqual',
    'tools/test-chapter-entry.mjs :: assert.equal',
    'tools/test-chapter-entry.mjs :: assert.ok',
    'tools/test-check-cycles.mjs :: assert.deepEqual',
    'tools/test-check-cycles.mjs :: assert.equal',
    'tools/test-check-cycles.mjs :: assert.ok',
    'tools/test-connect-motion.mjs :: assert.deepEqual',
    'tools/test-connect-motion.mjs :: assert.equal',
    'tools/test-connect-motion.mjs :: assert.ok',
    /* CONV-CLOSE, 2026-08-26 — THREE entries, the same bare-assert trio the
       neighbours below declare and for the same reason: every one of that
       suite's 33 sites is a top-level `assert.*` whose id travels in the
       MESSAGE argument, which this derivation cannot see. Note what did NOT
       arrive with them: that file's `near(got, want, tol, id, what)` wrapper
       is not a declared receiver, so it is not this pin's business either —
       AP15 does not reach it (its label is argument 3) and the verdict it
       renders is the already-declared `assert.ok` inside it. */
    'tools/test-declared-conversions.mjs :: assert.deepEqual',
    'tools/test-declared-conversions.mjs :: assert.equal',
    'tools/test-declared-conversions.mjs :: assert.ok',
    /* border-flash, 2026-08-26 — THREE entries, all five of that suite's sites
       being top-level `assert.*` whose id travels in the MESSAGE argument, which
       this derivation cannot see. `assert.notEqual` is the third and is the one
       worth reading twice: it is declared with A2's indices ON PURPOSE (see the
       receiver note), so it lands here for the same reason as its two siblings
       and not because anything about it is special. Contrast
       tools/test-rest-composition.mjs, whose `assert.ok` is NOT here because its
       sites do carry a label the derivation reaches. */
    'tools/test-detail-shell-monotone.mjs :: assert.equal',
    'tools/test-detail-shell-monotone.mjs :: assert.notEqual',
    'tools/test-detail-shell-monotone.mjs :: assert.ok',
    'tools/test-discord-card.mjs :: check',
    'tools/test-error-classes.mjs :: check',
    'tools/test-hotspot-departure.mjs :: assert.deepEqual',
    'tools/test-hotspot-departure.mjs :: assert.equal',
    'tools/test-hotspot-departure.mjs :: assert.ok',
    'tools/test-instrument-layer.mjs :: pin',
    'tools/test-intro-lifecycle.mjs :: assert.deepEqual',
    'tools/test-intro-lifecycle.mjs :: assert.equal',
    'tools/test-intro-lifecycle.mjs :: assert.match',
    'tools/test-intro-lifecycle.mjs :: assert.notDeepEqual',
    'tools/test-intro-lifecycle.mjs :: assert.notEqual',
    'tools/test-intro-lifecycle.mjs :: assert.ok',
    /* no-scroll navigation, 2026-08-27 — the focused transport checks use
       top-level node:assert calls whose descriptions live in the message
       argument, so this derivation deliberately cannot recover their ids. */
    'tools/test-no-scroll-navigation.mjs :: assert.deepEqual',
    'tools/test-no-scroll-navigation.mjs :: assert.equal',
    'tools/test-portrait-lifecycle.mjs :: L.same',
    'tools/test-portrait-paint.mjs :: L.check',
    'tools/test-portrait-paint.mjs :: prove',
    'tools/test-portrait-perturbation.mjs :: L.same',
    'tools/test-portrait-textures.mjs :: L.same',
    /* Purpose/Ownership handoff, 2026-08-27 — the focused assertions carry
       their descriptions in node:assert's message argument, so the receiver
       derivation cannot recover a label from any of these five callees. */
    'tools/test-rail-handoff.mjs :: assert.deepEqual',
    'tools/test-rail-handoff.mjs :: assert.doesNotMatch',
    'tools/test-rail-handoff.mjs :: assert.equal',
    'tools/test-rail-handoff.mjs :: assert.match',
    'tools/test-rail-handoff.mjs :: assert.throws',
    'tools/test-renderer-resources.mjs :: L.check',
    'tools/test-renderer-resources.mjs :: L.same',
    'tools/test-renderer-resources.mjs :: prove',
    /* connect-skip second pass, 2026-08-25. C1a is `assert.equal(typeof SMOOTH, 'number',
       '<prose>')` — a two-argument assert whose id travels in the MESSAGE, so
       the derivation cannot see a label argument and the row lands here by the
       same rule as its neighbours. `assert.ok` from the same file does NOT land
       here, which is the discrimination worth keeping: AOK declares no expected
       side at all, so there is nothing for the derivation to miss. */
    /* no-auto-advance, 2026-08-26 — two entries, the same bare-assert pair the
       neighbour below declares, for the same reason: this derivation cannot
       see a top-level `assert.*` call's id. */
    'tools/test-rest-authority.mjs :: assert.equal',
    'tools/test-rest-authority.mjs :: assert.ok',
    'tools/test-rest-composition.mjs :: assert.equal',
    'tools/test-spores-lifecycle.mjs :: prove',
    'tools/test-static-content.mjs :: assert.deepEqual',
    'tools/test-static-content.mjs :: assert.equal',
  ],
  'a receiver whose rows carry NO label — `assert.equal(a, b)`, or a check labelled in plain prose — '
  + 'is invisible to the derivation and must be declared by hand, as it always was. Pinned as a SET '
  + 'rather than described in prose so the limit moves with the code (AP13\'s discipline), and it '
  + 'doubles as the D46 control the derivation otherwise lacks: if the label shape rots or the parse '
  + 'goes wide, EVERY declared receiver lands here at once and names itself, where AP15\'s empty set '
  + 'would go quietly green.');
pin('AP17', 'D46 — every receiver-drift fixture derives exactly the callees it declares, the empty rows included',
  (i) => i.rows.map(([id, , src, want]) => {
    const got = [...idBearingCallees(src).keys()].sort();
    return `${id}:${got.join(',') === want.join(',') ? 'ok' : `WRONG got=${got.join(',')}`}`;
  }), { rows: RECEIVER_DRIFT_FIXTURES },
  ['RD-F1:ok', 'RD-F2:ok', 'RD-F3:ok', 'RD-F4:ok', 'RD-F5:ok', 'RD-F6:ok', 'RD-F7:ok', 'RD-F8:ok'],
  'three of the eight derive NOTHING, so a derivation that started returning every callee would fail '
  + 'here, not merely one that went blind');
pin('AP17b', 'D54 — the receiver-drift fixture SET, by name',
  (i) => i.rows.map((r) => r[0]), { rows: RECEIVER_DRIFT_FIXTURES },
  ['RD-F1', 'RD-F2', 'RD-F3', 'RD-F4', 'RD-F5', 'RD-F6', 'RD-F7', 'RD-F8']);

/* ---- AP8: the adversarial cross-check against the twin (D88) -------- */
/*  tools/assertion-provenance.mjs re-derives the single-binding const table
    that tools/self-controls.mjs keeps private, so there are two of them and
    D88 says a single implementation cannot disagree with itself. These are
    two, so they can. TA13-TA19 are exactly the rows where the two tables
    must agree about what a propagatable const is: TA15 (blocked by a second
    binding), TA18 (the determinism idiom) and TA19 (a container mutated in
    place) are `scanTautologyAst`'s OWN guards, each written because a first
    draft reddened a healthy gated suite. */
const TA = new Map(TAUTOLOGY_FIXTURES.map((r) => [r[0], r]));
const twinRow = (id) => {
  const [, , src] = TA.get(id);
  const wrapped = src.replace(/L\.same\(/g, 'L.same(');
  const mine = scanDataBlind(wrapped, { 'L.same': SAME }).rows.map((r) => r.cls);
  const theirs = scanTautologyAst(wrapped, new Map([['L.same', 2]])).hits.map((h) => h.replace(/^\d+: /, '').slice(0, 4));
  return `${id} mine=[${mine.join(',')}] theirs=[${theirs.join(',')}]`;
};
pin('AP8', 'D88 — the two single-binding const tables in this tree agree on scanTautologyAst\'s OWN guard rows',
  (i) => i.ids.map(twinRow), { ids: ['TA13', 'TA15', 'TA18', 'TA19'] },
  ['TA13 mine=[] theirs=[[T4]]',
    'TA15 mine=[] theirs=[]',
    'TA18 mine=[] theirs=[]',
    'TA19 mine=[] theirs=[]'],
  'TA13 is Engine 1 — an expectation derived from the subject one const away. It is THEIRS to catch '
  + 'and not mine: the const is initialised by a CALL, so it is not literally closed and this scan '
  + 'correctly declines it. TA15/TA18/TA19 must be silent in BOTH, and TA19 is the container-escape '
  + 'rule that this module re-derives — if the two tables ever disagree there, one of them is wrong.');

/* ---- AP9: D95 ------------------------------------------------------ */
const SCRATCH = mkdtempSync(join(tmpdir(), 'qa09-provenance-'));
const stageTree = createStager({ scratchRoot: SCRATCH, threePath: join(REPO, 'vendor/three/three.module.js'), label: 'QA-09' });
const WITNESS = writeRegistrationWitness(join(SCRATCH, 'witness-src'));
const FRESH = await proveRegistrationFreshness({ stageTree, witnessPath: WITNESS });
pin('AP9', 'D95 — a staged module registers FRESH per salt, and the control proves the check is not stuck: re-importing one URL returns the SAME instance and its module scope carries over',
  (i) => [i.f.distinctUrls, ...i.f.freshLoads, ...i.f.freshMarks, i.f.reusedMark, i.f.reusedIsSameInstance],
  { f: FRESH }, [2, 1, 1, 1, 1, 2, true],
  'the two 1s in freshMarks are the FRESH arm (each copy\'s module scope started empty); the 2 is the '
  + 'SHARED arm (a reused URL kept the first copy\'s marks). Both arms observed in one run, so an '
  + 'assertion of difference is accompanied by an assertion of sameness (D46).');
const AUDIT_FRESH = auditRegistrations('AP9 control', [{ subject: 'with-ring', url: 'u1' }, { subject: 'without-ring', url: 'u2' }]);
let auditShared = 'NO FAULT';
try {
  auditRegistrations('AP9 control', [{ subject: 'with-ring', url: 'u1' }, { subject: 'without-ring', url: 'u1' }]);
} catch (e) { auditShared = e instanceof HarnessFault ? 'HarnessFault' : e.constructor.name; }
let auditEmpty = 'NO FAULT';
try { auditRegistrations('AP9 control', []); } catch (e) { auditEmpty = e instanceof HarnessFault ? 'HarnessFault' : e.constructor.name; }
pin('AP9b', 'D95/D70 — the guard REFUSES a memoised cross-module measurement with a TYPED fault, and passes a genuinely fresh one',
  (i) => [i.fresh.subjects, i.fresh.registrations, i.shared, i.empty],
  { fresh: AUDIT_FRESH, shared: auditShared, empty: auditEmpty },
  [2, 2, 'HarnessFault', 'HarnessFault'],
  'the ring->terrain measurement that returned ZERO BYTES MOVED had two subjects and one '
  + 'registration; the true answer is 144 of 392,604. This is that case, refused.');
L.same('AP9c', 'D95 — the stager now records every staging it issues, so a caller memoising ABOVE it shows fewer registrations than subjects',
  [stageTree.registrations.length, typeof stageTree.cleanup], [2, 'function']);

/* ---- AP10-AP12: this file's own scans ------------------------------ */
const RE_SELF = literalPredicateRe(['L.same', 'pin'], 2);
const selfHits = literalPredicateHits(SOURCE[SELF], RE_SELF).hits;
L.same('AP10', 'D44 — bare-literal-predicate assertions in this suite', selfHits.length, 0,
  selfHits.length ? selfHits.join('\n        ') : null);
L.same('AP11', 'D46 — the control for AP10: the pattern DOES fire on a bare literal and NOT on a comparison',
  [RE_SELF.test("  pin('X', 'w', true);"), RE_SELF.test("  L.same('X', 'w', n === 3, 2);")], [true, false]);
const tau = scanTautologyAst(SOURCE[SELF], new Map([['L.same', 2], ['pin', PIN_RECEIVER]]));
L.same('AP12', 'D86 — syntactic tautologies in this suite', tau.hits, [],
  tau.hits.length ? tau.hits.join('\n        ') : null);
L.same('AP12b', 'D46 — and the scan reached this file\'s assertion sites (a zero would be a renamed receiver, not a clean file)',
  tau.sites > 20, true, `sites: ${tau.sites}`);

/* ---- AP13: the module's OWN blindness, stated as data --------------- */
pin('AP13', 'D94 — HTER103\'s dress is OUT OF REACH and is pinned as such: an extraction whose input IS read off the subject and comes back empty at RUN TIME is not literally closed, so this scan declines it',
  (i) => literallyClosed(i.node, new Map()),
  { node: { type: 'CallExpression', callee: { type: 'Identifier', name: 'sliceBetween' }, arguments: [] } },
  false,
  'stated as an assertion rather than as prose so the limit moves with the code. The remedy for that '
  + 'dress is a cardinality pin beside the assertion (D85), not this module.');

/* ---- AP14: a defect in the shared instrument layer, found by using it -- */
L.same('AP14', 'D88 — `inputCanon` has NO Map branch, so every Map canonicalises to `{}` and registry gate 2 is blind through a Map-shaped input',
  [inputCanon(new Map([['a', 1]])), inputCanon(new Map()), inputCanon({ a: 1 }) === inputCanon({})],
  ['{}', '{}', false],
  'the third element is the control: the SAME perturbation through a plain object IS visible. Found '
  + 'the first time this suite handed the registry a Map of source texts — every mutant reported '
  + '`BROKEN — perturbation was a no-op on the reader\'s input`, whatever it had changed. Same class '
  + 'as D88\'s byte-blind Mesh: a branch that dominates the shape you actually pass. NOT REPAIRED '
  + 'HERE — tools/instrument-ledger.mjs is not on QA-09\'s allowlist; pinned so the next order that '
  + 'opens that file inherits a failing statement rather than a hunch.');

if (REPORT) {
  console.log('\n---- the sweep, verbose ----');
  for (const [file, src] of Object.entries(SOURCE)) {
    const { rows, sites } = scanDataBlind(src, RECEIVERS[file]);
    if (!rows.length) continue;
    console.log(`\n  ${file}  (${sites} assertion sites)`);
    for (const r of rows) console.log(`    ${r.cls}  ${r.id}:${r.line}  data=${r.data}\n         exp=${r.expected}\n         what=${r.what.slice(0, 120)}`);
  }
  console.log('\n---- citations ----');
  for (const c of CITATIONS) console.log(`    ${c}`);
}

SENT.reach('ledger');
let code = L.report();

/* ==================================================================== *
 * --prove-failure — the registry sweep. Every mutant perturbs a REAL
 * input (D58): a shipped suite's source text, a fixture table, or the
 * observations the D95 control produced. None of them poisons a double.
 * ==================================================================== */
if (PROVE) {
  console.log('\n--prove-failure — every registered pin driven red by a perturbation of its own input');
  /* RE-ANCHORED 2026-08-22. Five of these mutants anchored into the clones,
     owned-substrate and tendrils proofs, all three retired out of the gate.
     THE ANCHORS DID NOT ROT QUIETLY: `mutateText` raised a typed HarnessFault
     on the first run after the retirement, which is exactly the difference
     between the shared mutator and a bare `.replace()` — a `.replace()` whose
     anchor is gone NO-OPS, gate 3 scores the mutant CANNOT FAIL, and a
     permanently-green pin ships. Every replacement below names a suite that
     is in the chain today, and each mutant was re-verified red afterwards. */
  const dwell = 'tools/test-dwell-oracle.mjs';
  const floor = 'tools/test-coverage-floor.mjs';
  const road = 'tools/test-road.mjs';
  const paint = 'tools/test-portrait-paint.mjs';
  const withSource = (inp, file, from, to) => ({
    ...inp,
    sources: { ...inp.sources, [file]: mutateText(inp.sources[file], file, from, to) },
  });

  /* ---- THE NULL-MUTANT CONTROL, FIRST ------------------------------- *
   * Before any mutant is believed, one perturbation that MUST NOT move
   * anything: a comment inserted into a swept suite. If the manifest moves
   * here, this sweep is measuring formatting and every [red] after it is
   * worthless. It cannot ride in the registry — the registry's gate 3 fails
   * a mutant whose output does NOT move, which is the opposite of what a
   * null control asserts — so it is asserted here, in its own right. */
  const nullPerturbed = withSource({ sources: SOURCE }, dwell,
    ' * tools/test-dwell-oracle.mjs — PAGE-01.',
    ' * tools/test-dwell-oracle.mjs — PAGE-01. (null-mutant control: prose only)');
  L.same('AP-M0', 'D46/D50 — NULL MUTANT: a comment added to a swept suite moves the INPUT and must NOT move the manifest',
    [nullPerturbed.sources[dwell] !== SOURCE[dwell],
      JSON.stringify(sweepRows(nullPerturbed.sources).hits) === JSON.stringify(sweepRows(SOURCE).hits)],
    [true, true],
    'first element: the perturbation really happened. Second: it changed nothing this scan measures. '
    + 'A sweep whose null control moves is measuring the wrong thing, and every mutant below it is '
    + 'unreadable.');

  const MUTANTS = [
    M('AP1', 'a suite is wired into the gate with no receiver declaration — the D49 case, which fired for real mid-run', null,
      (i) => ({ ...i, gated: [...i.gated, 'tools/test-not-declared.mjs'] })),
    M('AP2', 'a swept suite\'s ledger method is renamed, so its receiver declaration reaches ZERO assertion sites and the file reads clean', null,
      (i) => ({
        ...i,
        sources: {
          ...i.sources,
          [dwell]: i.sources[dwell].replaceAll('L.same(', 'L.assert(').replaceAll('\npin(', '\nrecord('),
        },
      })),
    /* RE-AIMED with the pin: the manifest is EMPTY now, so the only direction
       it can be driven in is ARRIVAL. The injected assertion is the D94 shape
       verbatim — a correct predicate over a collection the author typed —
       written into a swept suite's source. A row must appear naming it. */
    M('AP3', 'a data-blind assertion is written into a swept suite: an assert-empty over a hand-typed collection, which is the D94 shape, and a DB1 row ARRIVES', null,
      (i) => withSource(i, dwell, '\npin(',
        "\npin('ZQ7', 'a correct predicate over a collection nobody populated',"
        + '\n  (x) => x.anchors.filter((a) => !x.used.includes(a)),'
        + '\n  { anchors: [1, 2], used: [] }, []);\npin(')),
    /* RE-AIMED at a surviving DB3 row. PC-6b compares a hand-written array's
       length against the literal that array declares — legitimately literal,
       and classified DB3 for it. Make its actual read the subject instead and
       the row leaves the inventory. */
    M('AP4', 'a DB3 inventory row starts reading its subject rather than a hand-written table, and the row leaves', null,
      (i) => withSource(i, floor, "eq('PC-6b', 'the allowlist is exactly the size it declares', ALLOWLIST.length, ALLOWLIST_SIZE);",
        "eq('PC-6b', 'the allowlist is exactly the size it declares', resolveAnchors(baseSrcOf).resolved, ALLOWLIST_SIZE);")),
    M('AP5', 'a false coverage claim is written into shipped prose: the citation manifest grows', null,
      (i) => ({
        ...i,
        sources: {
          ...i.sources,
          [road]: `/* Pinned by tools/test-road.mjs (\`ZQ7\`). */\n${i.sources[road]}`,
        },
      })),
    /* RE-AIMED 2026-08-22 with the pin above: the clones subject is retired, so
       the mutant writes the citation back into the PRODUCTION file instead. */
    M('AP5c', 'the repaired citation is written back into the media.js header', [0],
      (i) => ({ ...i, media: `${i.media}\n/* ${i.tok} is the guard that says so. */\n` })),
    M('AP5e', 'a stale token is added to the self-mask — a silencer with nothing to silence', null,
      /* assembled from parts that do not spell it, because a token written
         out here would OCCUR in this file and the reader would find it —
         D76 again, one level down: the mutant's own text is inside the
         corpus the reader searches. */
      (i) => ({ ...i, tokens: [...i.tokens, 'Z'.repeat(2) + (44 * 2)] })),
    M('AP6b', 'a fixture row is REMOVED — the case a bare count could report as a legitimate shrink', null,
      (i) => ({ ...i, rows: i.rows.filter((r) => r[0] !== 'DB-F13') })),
    M('AP7b', 'a citation fixture row is renamed, which a count cannot see at all', [0],
      (i) => ({ ...i, rows: i.rows.map((r) => (r[0] === 'FC-F1' ? ['FC-F1x', ...r.slice(1)] : r)) })),
    M('AP6', 'the DB1 fixture is given a non-empty expectation, so its declared class no longer holds', [0],
      (i) => ({ ...i, rows: i.rows.map((r) => (r[0] === 'DB-F1'
        ? [r[0], r[1], r[2].replace('{ anchors: A, used: [] }, []);', "{ anchors: A, used: [] }, ['/*']);"), r[3]] : r)) })),
    M('AP7', 'the citation fixture loses its coverage claim, so FC-F3 stops being a citation', [2],
      (i) => ({ ...i, rows: i.rows.map((r) => (r[0] === 'FC-F3'
        ? [r[0], r[1], r[2].replace('Pinned by tools/test-ui-lifecycle.mjs', 'see also'), r[3]] : r)) })),
    /* CITE-TOKENS' mutant, and it is aimed at the SILENCER direction on
       purpose. The tokenizer repair's whole risk is that harvesting a
       hyphenated id whole stops reporting the dangling ones; so the mutant
       DEFINES the undefined sibling, FC-F10's row vanishes, and the pin must
       say so. The element it moves is the middle one, which is the row that
       exists to prove this scan still reports a false citation at all. */
    M('AP7c', 'the dangling three-segment id is declared DEFINED, so the one row proving this harvester still reports a false citation disappears', [1],
      (i) => ({ ...i, world: { ...i.world, defined: [...i.world.defined, `HCLO${'-EVT-9'}`] } })),
    M('AP8', 'the twin cross-check is fed HRING110\'s own row, where the two tables must NOT agree', [0],
      (i) => ({ ...i, ids: ['TA1', 'TA15', 'TA18', 'TA19'] })),
    M('AP9', 'the D95 control reports a FRESH mark where the SHARED arm must carry over — the exact reading that made the ring dependency measure zero', [5],
      (i) => ({ f: { ...i.f, reusedMark: 1 } })),
    M('AP9b', 'the guard stops refusing a shared registration', [2],
      (i) => ({ ...i, shared: 'NO FAULT' })),
    M('AP13', 'the literal-closure test starts calling a CALL literally closed, which is the property the whole scan rests on', null,
      () => ({ node: { type: 'Literal', value: 1, start: 0, end: 1 } })),
    /* AP-02's six. Every one perturbs a SHIPPED SUITE'S SOURCE TEXT or a
       shipped fixture table — never a double (D58). */
    M('AP15', 'a swept suite adopts a NEW assertion receiver and this scan silently stops reading those sites — the exact narrowing that shipped green when seventeen repaired sites moved onto `pin`', null,
      (i) => withSource(i, road, "pin('A1'", "verifyPin('A1'")),
    M('AP15b', 'a suite reaches for a declared NON-receiver it had never used, so a row ARRIVES in the exclusion set — the move a count of exclusions would have reported as a larger number and nothing more', null,
      (i) => ({
        ...i,
        sources: { ...i.sources, [paint]: `M('X1', 'a mutant declaration', null, (n) => n);\n${i.sources[paint]}` },
      })),
    M('AP15c', 'a non-receiver is excluded that nothing in the tree calls — a licence with nothing to license, which is exactly what this pin caught its own author writing four of', null,
      (i) => ({ ...i, notRecv: { ...i.notRecv, neverCalledAnywhere: 'a reason for a call site that does not exist' } })),
    M('AP16', 'a swept suite\'s receivers stop carrying labels, so the DERIVATION goes blind over that file and EVERY declared receiver in it lands here at once — the state in which AP15\'s empty set is the empty set of not looking', null,
      (i) => ({
        ...i,
        sources: {
          ...i.sources,
          [road]: i.sources[road].replaceAll('\npin(', '\nrecordPin(').replaceAll('L.same(', 'L.record('),
        },
      })),
    M('AP17', 'the RD-F1 fixture\'s receiver is renamed, so the callees it declares no longer hold', [0],
      (i) => ({ ...i, rows: i.rows.map((r) => (r[0] === 'RD-F1'
        ? [r[0], r[1], r[2].replace('L.same(', 'logRow('), r[3]] : r)) })),
    M('AP17b', 'a receiver-drift fixture row is REMOVED — the case a bare count could report as a legitimate shrink', null,
      (i) => ({ ...i, rows: i.rows.filter((r) => r[0] !== 'RD-F5') })),
  ];
  let out;
  try {
    out = sweep(MUTANTS);
  } finally {
    SENT.reach('sweep');
  }
  L.discard();
  L.same('AP-M1', 'D58 — mutants that did not drive their declared axis red', out.bad, 0);
  L.same('AP-M2', 'D45 — every mutant ran (iteration pin)', out.total, MUTANTS.length);
  L.same('AP-M3', 'D58 — registered pins carrying no mutant', out.uncovered, []);
  L.same('AP-M4', 'D70 — harness faults raised by a guard, named separately from a failed gate', out.faults, []);
  code = L.report() || code;
  if (out.faults.length) { stageTree.cleanup(); throw new HarnessFault(out.faults.join('; ')); }
}

/* D56 / the disk: this suite gives back every tree it staged. */
stageTree.cleanup();
process.exit(code);
