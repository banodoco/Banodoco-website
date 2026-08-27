/* ==================================================================== *
 * tools/test-gate-composition.mjs — QA-08.
 *
 * THE ONE THING NO INSTRUMENT WATCHED: THE GATE ITSELF.
 *
 * D80 established that `test:contracts` runs in four tiers and that the
 * wave-pinned inventory suite goes LAST, "so it conceals nothing" — an `&&`
 * chain reports the first problem and hides every other, and with the wave pin
 * at position 6 it hid 27 of the 33 things it ran.
 *
 * D80 ERODED WITHIN A DAY. `tools/test-clones-split.mjs` was appended PAST
 * `tools/test-render-baseline.mjs`, putting the newest and least-exercised
 * suite in the chain behind the entry most likely to be red for a reason that
 * belongs to nobody. The applier that did it verified that every pre-existing
 * entry was unchanged and in its original position — which was true, and is
 * not the property D80 established. Appending to a four-tier chain whose
 * fourth tier is one suite means appending past it.
 *
 * NOTHING IN THE GATE PINNED THE CHAIN'S COMPOSITION OR ITS ORDER. That is
 * also why D49 ("is this instrument wired?") reached instances ten and eleven:
 * a suite could be written, reviewed and left out of the chain entirely, and
 * every green run would agree with every other. A reordering decision with no
 * instrument is a preference, not a rule.
 *
 * THE PIN IS A SITE SET, NOT A COUNT (D54/D64/D61)
 * ------------------------------------------------
 * `chain length === 38` cannot tell "a suite was legitimately added" from "a
 * suite was dropped and another appended", and the cheap repair for a red
 * count is to bump the number — which retires the control by the act of
 * fixing it. So the chain is pinned as an ORDERED SET of `NN :: path` rows.
 * The ordinate is the POSITION rather than a line number (D54's usual key)
 * because the subject is a single JSON string whose meaning IS its order;
 * `file :: line :: text` would key every row to line 12 of package.json and
 * measure nothing.
 *
 * THE TAIL ROW IS THE D80 ONE, AND IT IS DECLARED RATHER THAN REPAIRED
 * -------------------------------------------------------------------
 * `GC-TAIL` pins the SET of suites that run after the wave-pinned suite. It is
 * `['tools/test-clones-split.mjs']` today, and D80 says it should be `[]`. The
 * repair is a reorder of another order's entry and belongs to whoever owns
 * that decision, so this order records the erosion as a literal instead of
 * silently normalising it — and a SECOND append past the wave pin reds the row
 * immediately, which is the property that was missing.
 *
 * Run:
 *   node tools/test-gate-composition.mjs                 — the ledger
 *   node tools/test-gate-composition.mjs --prove-failure — and the mutants
 * ==================================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HarnessFault, fault, mutateText, createLedger, armSentinel } from './instrument-ledger.mjs';
import { createRegistry, M } from './mutant-registry.mjs';
import { literalPredicateRe, literalPredicateHits, scanTautologyAst, TAUTOLOGY_FIXTURES } from './self-controls.mjs';

const SELF_PATH = fileURLToPath(import.meta.url);
const TOOLS = dirname(SELF_PATH);
const REPO = resolve(TOOLS, '..');
const PKG = join(REPO, 'package.json');

const PROVE = process.argv.includes('--prove-failure');
const SENT = armSentinel('test-gate-composition', ['ledger', 'sweep'], (p) => p === 'ledger' || PROVE);

const L = createLedger();
const { pin, sweep } = createRegistry({ ledger: L, fault });

/* ==================================================================== *
 * THE READER. Its input is the CHAIN TEXT, so a mutant perturbs the same
 * string package.json holds and nothing writes to the repository (D56).
 * ==================================================================== */

/** D63 — a chain that cannot be read yields NO measurement, never a zero. */
function chainOf(pkgText) {
  let pkg;
  try { pkg = JSON.parse(pkgText); } catch (e) { fault(`package.json does not parse — ${e.message}`); }
  const line = pkg && pkg.scripts && pkg.scripts['test:contracts'];
  if (typeof line !== 'string' || !line.length) fault('package.json has no test:contracts script');
  return line.split(' && ').map((s) => s.trim());
}

/** A named SIBLING script's text, or '' if package.json has no such script.
 *  A missing script is deliberately NOT a fault: an exemption that cites a
 *  ring which no longer exists IS the false claim GC-WIRED must red on, and a
 *  HarnessFault there would report "the harness broke" for a stale row. Only
 *  called after chainOf, which is what refuses an unparseable file (D63). */
const scriptOf = (pkgText, name) => (JSON.parse(pkgText).scripts || {})[name] || '';

const entries = (i) => chainOf(i.pkg);
/** The suite path of an entry, with the `node ` prefix and any arguments
 *  removed — the arguments are pinned separately, by GC-SHAPE. */
const suites = (i) => entries(i).map((e) => e.replace(/^node\s+/, '').split(/\s+/)[0]);

/* ==================================================================== *
 * THE DECLARED SHAPE. Every literal below is per-subject data; nothing
 * here is derived from the file it checks (QA-01 Engine 1/2/3).
 * ==================================================================== */

const WAVE_PIN = 'tools/test-render-baseline.mjs';
const AGGREGATOR = 'tools/test-coverage-floor.mjs';

/** Tier 1 — the instruments the other instruments rest on. Cheap, no wave
 *  pins, and the first thing you want to know is broken. QA-08 adds two: this
 *  suite (the chain's own shape) and tools/test-instrument-layer.mjs (the five
 *  shared modules every other suite imports). Both are tier-1 by D80's own
 *  definition, and both are placed at the HEAD rather than appended, because
 *  appending is the move that eroded D80. */
const TIER1 = [
  'tools/test-gate-composition.mjs',
  'tools/test-instrument-layer.mjs',
  /* QA-09. The assertion-provenance sweep: it reads every gated suite's SOURCE
     and every production comment, and reports assertions blind in their DATA
     (D94) and coverage claims citing ids that do not exist (D92). Tier 1 by
     D80's own definition — a cheap gating instrument over the instrument
     layer, 1.3 s, no wave pins, and nothing downstream depends on it running
     late. Placed at the HEAD, immediately after the two suites it rests on,
     rather than appended: QA-09's FIRST wiring appended it at position 44,
     past the wave pin, which is D80's exact erosion repeated and which
     `GC-ORDER`, `GC-TAIL` and `GC-SHAPE` all reddened within the hour.
     Inserting here moves rows 3-44 of GC-ORDER, the t1/t2/t3/t4 spans of
     GC-TIERS, GC-SHAPE's length AND flag set, and GC-R4's cardinalities:
     five independent objections to one wiring, which is what this file is
     for. The --prove-failure flag is declared in GC-SHAPE's `flagged` set
     for the same reason the two QA-08 suites are — a mutant sweep nobody
     runs is not a control (D88), and this one costs 0.3 s of the 1.3 s. */
  'tools/test-assertion-provenance.mjs',
  'tools/test-comment-stripper.mjs',
  /* DIET-01, 2026-08-22 — tools/verify-j04a.mjs and tools/verify-j04b.mjs sat
     here and are RETIRED to
     docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/,
     still runnable. Both are one-shot MOVE verifiers against base 6967a36,
     and `426dd44` fired their expiry condition: the moves they prove are in
     committed history, where `git diff --color-moved` reproduces the proof.
     verify-j04b's §12 row-1 pin was NOT retired with the file — it is a
     durable behaviour contract over journey/scroll.js's push() and was
     lifted into tools/test-input-claim.mjs (rows SC-R*). */
  'tools/test-error-classes.mjs',
  'tools/test-renderer-resources.mjs',
  'tools/test-check-cycles.mjs',
  'tools/test-browser-harness.mjs',
];
/** Tier 2 — contract and behaviour suites, in their existing relative order. */
const TIER2 = [
  'tools/test-chapter-entry.mjs',
  'tools/test-connect-motion.mjs',
  'tools/test-scroll-trace.mjs',
  'tools/test-frame-order.mjs',
  'tools/test-scroll-perturbation.mjs',
  'tools/test-render-perturbation.mjs',
  'tools/test-render-determinism.mjs',
  'tools/test-portrait-dealer.mjs',
  'tools/test-portrait-baked.mjs',
  'tools/test-portrait-textures.mjs',
  'tools/test-portrait-lifecycle.mjs',
  'tools/test-portrait-perturbation.mjs',
  'tools/test-animation-lifecycle.mjs',
  'tools/test-intro-lifecycle.mjs',
  'tools/test-card-warming.mjs',
  'tools/test-discord-card.mjs',
  'tools/test-detail-close-focus.mjs',
  'tools/test-ui-lifecycle.mjs',
  'tools/test-chapter-contract.mjs',
  'tools/test-spores-lifecycle.mjs',
  'tools/test-baked-lifecycle.mjs',
  'tools/test-portrait-paint.mjs',
  /* DIET-01, 2026-08-22 — the six one-shot extraction proofs that sat here
     (test-owned-substrate-split, test-portrait-remix, test-tendrils-split,
     test-ring-split, test-canopy-split, test-terrain-split) are RETIRED to
     docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/,
     still runnable, together with test-clones-split from past the wave pin.
     Each proved that ONE historical extraction preserved bytes; that property
     expired at acceptance, and their line-keyed pins red the gate whenever any
     lane touches the pinned files (D64/D66) — which is precisely what U03-U06
     move. See retired-suites/README.md for what was retired, what was lifted
     out first, and the ONE property that left the gate with them. */
  /* GATE-01. A05a's byte-exact proof that journey/road.js is the pixel<->route
     mapping lifted verbatim out of journey/scroll.js. It is an EXTRACTION
     PROOF over production source — the same kind as the six split suites
     immediately above it — so it lands at the END of that cluster, adjacent to
     its own kind, and BEFORE the aggregator and the wave pin rather than past
     them. Tier 2, not tier 1: nothing else in the chain imports it, and it
     rests on the instrument layer rather than carrying it. It costs 0.09 s and
     declares no flag (it has no --prove-failure mode), so GC-SHAPE's `flagged`
     set is deliberately UNCHANGED by this wiring.
     Placing it here rather than appending moves rows 39-45 of GC-ORDER, the
     t2/t3/t4 spans of GC-TIERS, GC-SHAPE's length and GC-R4's cardinalities:
     four independent objections to one wiring, which is what this file is for.
     D49's thirteenth instance is thereby CLOSED, not re-recorded — the
     transfer of the position decision to this order is what WIRE-04 was
     waiting on, so UNWIRED_TODAY empties in the same change. */
  'tools/test-road.mjs',
  /* ONE ENTRY WAS REMOVED HERE BY DIET-02, 2026-08-26, and this comment is
     the record of what the chain used to run.
     ==========================================================================
     WAS, in this position:
       WIRE-04  tools/test-c06-registry.mjs

     C06's proof over journey/chapter-registry.js, journey/journey.js and
     main.js. Ten of its twelve pins were ONE-SHOT MIGRATION PROOFS whose
     expiry fired at acceptance — main.js was not edited, the seam is atomic by
     construction, exactly one construction site exists in the served tree. Its
     ONE standing property, C06-B4 ("the prepared cache lives in the factory's
     closure, so two registries never share one"), was RESTATED FIRST as
     tools/test-chapter-contract.mjs's I11, over the same shipped bytes and
     with the same discrimination — the hoist mutant moves the actual from
     six construction calls to four — and only then was this file moved.

     Retired, not deleted, to
     docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/,
     runnable, WITH ITS --prove-failure MODE INTACT (verified green at the new
     path: 22 assertions in main, 10/10 mutants in the sweep).

     THIS REMOVAL MOVES EXACTLY THE ROWS D80 SAYS IT SHOULD: GC-ORDER's rows
     33-49 renumber to 33-48, GC-TIERS' t2/t3/t4 spans contract by one,
     GC-SHAPE's length shrinks, and GC-R4's cardinality follows. GC-SHAPE's
     `flagged` set is DELIBERATELY UNCHANGED BY THE REMOVAL: this entry never
     carried an argument. It is the eleventh of D189's dormant proof modes,
     and the only one this order did not arm — arming a suite on its way out
     of the chain buys nothing. */
  /* PAGE-01. Appended to TIER 2 — a contract/behaviour suite, not one of the
     instruments the other instruments rest on — so it lands BEFORE the
     aggregator and the wave pin rather than past them. Adding it moved rows
     38/39/40 of GC-ORDER, the three tier spans of GC-TIERS and GC-SHAPE's
     length: four independent objections to one wiring, which is what this
     file is for. */
  'tools/test-dwell-oracle.mjs',
  /* PAGE-02. Appended to TIER 2 immediately after PAGE-01's, for the same
     reason and with the same four objections: rows 39/40/41/42 of GC-ORDER,
     the tier spans of GC-TIERS, GC-SHAPE's length and flag set, and GC-R4's
     cardinalities. It is a contract suite over an instrument, so it lands
     BEFORE the aggregator and the wave pin rather than past them. */
  'tools/test-pose-oracle.mjs',
  /* WIRE-J04a3. J04a-3's proof of the decision port over journey/claim.js and
     journey/scroll.js — D49's FOURTEENTH instance, recorded by GATE-01 with
     an owner's name and repaired here. J01 was transferred the position
     decision explicitly, which is what WIRE-04 and GATE-01 both declined to
     take for somebody else's lane. It is a contract suite over PRODUCTION
     source, so tier 2, not tier 1: nothing else in the chain imports it. It
     lands at the END of tier 2 rather than past the wave pin — D80's erosion
     is an append past tools/test-render-baseline.mjs, and this is not one.
     It carries --prove-failure because its 24-row mutant registry costs
     5 ms of its 172 ms, and D88 is explicit that a sweep nobody runs is not
     a control. Placing it here moves rows 43-47 of GC-ORDER, the t2/t3/t4
     spans of GC-TIERS, GC-SHAPE's length AND flag set, and GC-R4's
     cardinalities: five independent objections to one wiring, which is what
     this file is for. UNWIRED_TODAY empties in the same change. */
  'tools/test-input-claim.mjs',
  /* WIRE-J01. J01's own contract suite: the transition controller's
     injection shape, the E-A4 identifier scan, the seam in journey.js, the
     oracle closure over the one substitution J01 made, and the five
     transitions traced against the shipped controller. Tier 2 for the same
     reason and in the same place, immediately after the port suite it rests
     on — the port is proved before its consumer is. --prove-failure for the
     same reason: 20 mutants and a null control, inside a 111 ms run. */
  'tools/test-transition.mjs',
  /* WIRE-J02. J02's own contract suite: the frozen frame publication — its
     leaf audit, the accessor trap that says no reader touches the camera
     after publication, the E-B3 file allow-list, and the oracle against the
     az/r/forward derivations already in the tree. Tier 2 for the same reason
     as its two neighbours — a contract suite over PRODUCTION source that
     nothing else in the chain imports — and in the same place, at the END of
     tier 2, immediately after the transition controller whose published
     phase it consumes. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one. --prove-failure
     because its 22-row mutant registry and null control cost 40 ms of a
     700 ms run, and D88 is explicit that a sweep nobody runs is not a
     control. Placing it here moves rows 44-48 of GC-ORDER, the t2/t3/t4
     spans of GC-TIERS, GC-SHAPE's length AND flag set, and GC-R4's
     cardinalities. */
  'tools/test-frame-publication.mjs',
  /* WIRE-J03. J03's own gate, and the only artefact of that order: it writes
     no production line at all (coordinator decision Q1(a) turned it into a
     verification order), so this entry and its evidence directory ARE the
     order. The subject is journey/ui.js, journey/chapter-interactions.js and
     journey/journey.js read as TEXT, plus three bodies sliced out of ui.js
     and the registrar imported and run under a recording accessor on
     window.journey. Tier 2 for the same reason as its three neighbours — a
     contract suite over PRODUCTION source that nothing else in the chain
     imports — and at the END of tier 2, immediately after J02's. D80's
     erosion is an append past tools/test-render-baseline.mjs and this is not
     one. --prove-failure because its 21-row mutant registry and null control
     cost 40 ms of a 900 ms run, and D88 is explicit that a sweep nobody runs
     is not a control. Placing it here moves rows 45-49 of GC-ORDER, the
     t2/t3/t4 spans of GC-TIERS, GC-SHAPE's length AND flag set, and GC-R4's
     cardinalities. */
  'tools/test-ui-closure.mjs',
  /* WIRE-J04c. J04c's own contract suite: journey/dial.js's QA-only keydown
     and journey/chapters/final/index.js's two document hooks, each now owned
     and detachable. The subject is those two files read as TEXT at two
     revisions — the working tree and the base commit — with the sliced bodies
     COMPILED AND EXECUTED against one recording world, plus journey/dial.js
     imported and driven directly. Tier 2 for the same reason as its four
     neighbours — a contract suite over PRODUCTION source that nothing else in
     the chain imports — and at the END of tier 2, immediately after J03's.
     D80's erosion is an append past tools/test-render-baseline.mjs and this
     is not one. --prove-failure because its 21-row mutant registry and null
     control cost 30 ms of a 300 ms run, and D88 is explicit that a sweep
     nobody runs is not a control. Placing it here moves rows 46-50 of
     GC-ORDER, the t2/t3/t4 spans of GC-TIERS, GC-SHAPE's length AND flag set,
     and GC-R4's cardinalities. GC-WIRED reddened naming this file before the
     wiring landed — D49's SIXTEENTH instance, caught by the gate. */
  'tools/test-global-hooks.mjs',
  /* SIX ENTRIES WERE REMOVED HERE BY THE DISPOSAL REMOVAL, 2026-08-25, and
     this comment is the record of what the chain used to run.
     ==========================================================================
     WAS, in this position and this order:
       WIRE-J04d  tools/test-preparation-lifecycle.mjs
       WIRE-R05   tools/test-r05-chapter-disposal.mjs
       WIRE-R06   tools/test-r06-owned-disposal.mjs
       WIRE-R07   tools/test-r07-final-disposal.mjs
       WIRE-R08   tools/test-r08-registry-cascade.mjs
       WIRE-J04e  tools/test-journey-lifecycle.mjs

     Every one was a contract suite over a disposal path with NO PRODUCTION
     CALLER: three chapter disposers, the registry cascade, the journey's root
     owner, and the async-preparation cancellation guarded by `owner.alive`.
     The subjects were removed; the suites were retired, not deleted, to
     docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites-disposal/,
     and docs/code-health/DISPOSAL-REMOVED.md lists what each was protecting
     and what still covers it.

     THIS REMOVAL MOVES EXACTLY THE ROWS D80 SAYS IT SHOULD: GC-ORDER's rows
     40-51 renumber to 40-45, GC-TIERS' t2/t3/t4 spans contract, GC-SHAPE's
     length and flag set both shrink, and GC-R4's cardinality follows. It is a
     REMOVAL FROM THE MIDDLE of tier 2, not an append past
     tools/test-render-baseline.mjs, so D80's erosion clause does not apply. */
  /* WIRE-J05. J05's own contract suite, and the LAST of Wave 3: flags.js's
     import-time migration IIFE (classified here as an accepted page-lifetime
     singleton, with the evidence executed rather than asserted), main.js's
     sixteen-site page-lifetime register, the one bounded attach/detach pair
     in that file, journey/transport.js's onWheel guard order — which is what
     journey.js's dispose() leans on instead of detaching — the specifier
     census behind "one install per page module", and journey/journey.js's
     two owner registrations driven through three recreation cycles. Tier 2
     for the same reason as its seven neighbours: a contract suite over
     PRODUCTION source that nothing else in the chain imports. At the END of
     tier 2, immediately after J04e's. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one. --prove-failure
     because its 16-row mutant registry and null control cost about 1.4 s of
     a 1.6 s run — the child-process oracle in A5 dominates both numbers —
     and D88 is explicit that a sweep nobody runs is not a control. Placing
     it here moves rows 49-53 of GC-ORDER, the t2/t3/t4 spans of GC-TIERS,
     GC-SHAPE's length AND flag set, and GC-R4's cardinalities. GC-WIRED
     reddened naming this file before the wiring landed — D49's NINETEENTH
     instance, caught by the gate for the fifth order running. */
  'tools/test-page-lifetime.mjs',
  /* WIRE-U01b (transferred). U01b's own contract suite: journey/cards/
     registry.js — the six builder imports, the null-filtered CARD_BUILDERS
     map and the CARD_ASSETS/REDUCE re-exports, lifted out of
     journey/cards/index.js. It measures FOUR observables U01b's acceptance
     names in four words — builder EVALUATION order, CARD_BUILDERS KEY order,
     per-key module-default identity, and index.js's export names — plus map
     identity, which is the only one that can see a spread copy.

     WIRED BY U01c, NOT BY U01b, AND THAT IS D49's NINETEENTH INSTANCE. U01b
     built the suite and correctly declined to pick another order's chain
     position, leaving `npm run check` red on GC-WIRED — the gate catching an
     unwired suite for the sixth order running. U01c was transferred the
     decision explicitly. NOT_IN_CHAIN would have been a lie: this is a
     standalone suite, not a harness and not wired elsewhere.

     Tier 2 for the same reason as its neighbours — a contract suite over
     PRODUCTION source that nothing else in the chain imports — and at the END
     of tier 2, immediately after J05's. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one. No flag: its five
     mutants and null control run unconditionally in about 0.2 s, so there is
     no sweep to gate behind --prove-failure. */
  'tools/test-card-registry.mjs',
  /* WIRE-U01c. U01c's own contract suite: journey/cards/icons.js — the `I()`
     glyph factory and the CARD_ICONS table, lifted out of
     journey/cards/index.js into one data-only owner. It measures the four
     things U01c's acceptance names — icon KEYS (membership and order), MARKUP
     (byte for byte, pre/post against a hash-fenced snapshot rather than
     retyped literals), the factory SIGNATURE (arity and wrapper, via a
     `new Function` arm over the shipped bytes), and the qualifier "NO WARMING
     SIDE EFFECT" (icons.js evaluated alone schedules zero timers, starts zero
     fetches and reads `document` zero times, and index.js's self-start epoch
     is unmoved at one 1500 ms timer) — plus table identity, which with STRING
     values is the only observable that can see a spread copy even in
     principle.

     Tier 2 for the same reason as its neighbours, and at the END of tier 2,
     immediately after U01b's. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one. No flag: its six
     mutants and null control run unconditionally in well under a second.

     Placing these two here moves rows 50-54 of GC-ORDER, the t2/t3/t4 spans
     of GC-TIERS, GC-SHAPE's length, and GC-R4's cardinalities. Neither entry
     carries an argument, so GC-SHAPE's flag set is unchanged. */
  'tools/test-card-icons.mjs',
  /* WIRE-U02. U02's own contract suite: journey/ui/hot-state.js — the hotspot
     and hover-zone registry and the one owner of the three-channel hot state,
     lifted out of journey/ui.js. It measures what U02's acceptance names in
     five words — the hover/focus/arm UNION and its latch over all eight
     channel combinations, the RECENCY tie-break both `hottest` selectors run
     on, the TOUCH channel (arm/disarm/armed as a derived singleton, which is
     the finger's path and the one a desktop harness never reaches), and
     CLEANUP BY COUNTING: records left hot, channel residue, and refresh calls
     across a teardown, with a branch-entry witness (D75) so a teardown over
     nothing cannot pass — plus registry IDENTITY, which with an all-primitive
     record is the only observable that can see a spread copy even in
     principle. It closes with a reverse-application verifier that rebuilds
     the pre-order journey/ui.js from the fourteen-hunk edit set and
     reproduces its sha256.

     Tier 2 for the same reason as its neighbours — a contract suite over
     PRODUCTION source that nothing else in the chain imports — and at the END
     of tier 2, immediately after U01c's. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one. No flag: its mutants
     and controls run unconditionally in well under a second.

     Placing it here moves row 55 of GC-ORDER, the t2/t3/t4 spans of GC-TIERS,
     GC-SHAPE's length, and GC-R4's cardinalities. It carries no argument, so
     GC-SHAPE's flag set is unchanged. */
  'tools/test-hot-state.mjs',
  /* connect-skip second pass, 2026-08-25. Owner report #26 — "it scrolls through the
     Connect / ecosystem section automatically, right through to the next".
     The suite pins the RELATIONSHIP between the wrap's copy handover
     (journey/constants/copy.js's jump clock) and the landing beat
     journey/constants/scroll.js used to author: two constants in two modules
     that had never referred to each other, whose mismatch was the measured
     cause of the report. The beat was retired on 2026-08-26 once that
     arithmetic gave it a budget of zero; the suite now derives the same
     budget and pins the retirement. Tier 2 for
     the same reason as its neighbours — a contract suite over PRODUCTION
     constants and source text that nothing else in the chain imports — and
     at the END of tier 2, immediately after test-hot-state's and BEFORE the
     aggregator and the wave pin. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one. --prove-failure
     because its six mutants, its null control and its one DECLARED LIMIT
     cost 4 ms of a 90 ms run, and D88 is explicit that a sweep nobody runs
     is not a control. Placing it here moves the last rows of GC-ORDER, the
     t2/t3/t4 spans of GC-TIERS, GC-SHAPE's length AND flag set, and GC-R4's
     cardinalities: five independent objections to one wiring, which is what
     this file is for. GC-WIRED reddened naming this file before the wiring
     landed — D49 caught it, exactly as designed. */
  'tools/test-rest-composition.mjs',
  /* no-auto-advance, 2026-08-26. Owner report #26, third pass — "NOT auto
     scroll to the next section would be nice when I haven't made any gesture
     to do so", and, after the landing beat was lengthened rather than the
     advance stopped, "So you didn't fix it? This is when scrolling through".
     The suite drives journey/scroll.js on scroll-touch-gates' DOM-free rig
     and pins the owner's ruling as a behavioural law in BOTH directions: the
     journey never leaves a rest unattended (L1, 32 cells, 12 s of silence
     each), a deliberate post-landing gesture is never swallowed (L2, 12
     cells), the latency that gesture pays does not grow (L3), and the wrap
     seam obeys both (L4).

     TWO-SIDED ON PURPOSE, and that is why it is a suite rather than more
     cases in scroll-touch-gates. This fault family has a dual — the same
     owner reported "two flicks buy one section" (evidence defect-02/) after an earlier
     fix walled the skip — and docs/code-health/2026-08-25-scroll-through-
     category.md §1.2 states that a gate asserting only "no skips" invites
     the next fix to trade skips for swallows invisibly. Its four mutants are
     two per side, and MUT-EXEMPT-SLOW specifically kills a DELAYED unattended
     departure, because "a longer delay is not a fix" is the owner's own
     sentence and a gate that only caught prompt departures would have passed
     the very thing that was shipped and rejected.

     Tier 2 for the same reason as its neighbours — a contract suite over a
     PRODUCTION module nothing else in the chain imports — and immediately
     after test-rest-composition, whose subject it inherits: that file's
     queued departure no longer exists, so the two are read together.
     --prove-failure because its four mutants and null control cost ~2 s and
     D88 is explicit that a sweep nobody runs is not a control. Placing it
     here moves the last rows of GC-ORDER, the t2/t3/t4 spans of GC-TIERS,
     GC-SHAPE's length AND flag set, and GC-R4's cardinalities. GC-WIRED
     reddened naming this file before the wiring landed — D49 caught it,
     exactly as designed. */
  'tools/test-rest-authority.mjs',
  /* border-flash, 2026-08-26. Owner report #30 — "when I hover over any of
     the items, the sections or owners, there's a weird border flash that
     disappears when I first hover". The suite pins a PROPERTY of the
     authored stylesheets rather than a named keyframe: across the stops of
     every @keyframes that animates `border-color`, the effective edge
     brightness (relativeLuminance x alpha x opacity) must be monotone and
     must not overshoot its endpoints. The reported defect —
     `j-detail-arrive`'s 68% stop peaking at 3.32x the brightness it settles
     to — is one instance of that property failing, and the suite reds on the
     unmutated pre-fix source, not only on synthetic mutants.

     Tier 2 for the same reason as its neighbours — a contract suite over
     PRODUCTION source (journey/site.css, journey/cards/cards.css, hero.css
     read as text) that nothing else in the chain imports — and at the END of
     tier 2, immediately after test-rest-composition's and BEFORE the
     aggregator and the wave pin. D80's erosion is an append past
     tools/test-render-baseline.mjs and this is not one; the first attempt at
     this wiring WAS such an append, and GC-ORDER/GC-TAIL reddened it before
     it could land, which is exactly what those rows are for.
     --prove-failure because its three mutants and its accept-the-unmutated
     control cost under a millisecond of a pure-text run, and D88 is explicit
     that a sweep nobody runs is not a control. Placing it here moves the
     last rows of GC-ORDER, the t2/t3/t4 spans of GC-TIERS, GC-SHAPE's length
     AND flag set, and GC-R4's cardinalities. GC-WIRED reddened naming this
     file before the wiring landed — D49 caught it, exactly as designed. */
  'tools/test-detail-shell-monotone.mjs',
  /* CONV-02's suite, wired by CONV-CLOSE, 2026-08-26 — D49's SIXTEENTH
     instance, closed. The declared-conversion gate
     (docs/code-health/2026-08-26-conversion-census.md): eleven pins over
     eight census rows — route.js's FORWARD_BRAKE_TAIL_S against the
     p-denominated solve in journey/scroll.js, Final's two reveal clocks
     against its 24-rung pull ladder, and Inspire's three ember onsets and
     HOTSPOT_ARRIVAL.formMs against the copy gate — with 17 red mutants, 4
     null controls and 3 declared limits.

     Tier 2 for the same reason as its neighbours — a contract suite over
     PRODUCTION constants and source text that nothing else in the chain
     imports — and at the END of tier 2, where every recent tier-2 suite has
     landed. CONV-02's own handover note asked for "the end of tier 2,
     immediately after tools/test-rest-composition.mjs", whose pattern this
     file generalizes; the two halves of that sentence no longer name the same
     slot, because test-rest-authority.mjs was afterwards placed IMMEDIATELY
     after test-rest-composition and says so in its own entry above. The end
     of tier 2 satisfies "after test-rest-composition" without falsifying a
     shipped comment, which is the half worth keeping. It is not an append
     past tools/test-render-baseline.mjs, so it is not D80's erosion.
     --prove-failure because the whole mutant sweep costs ~0.3 s of a 1.5 s
     run and D88 is explicit that a sweep nobody runs is not a control.
     Placing it here moves the last rows of GC-ORDER, the t2/t3/t4 spans of
     GC-TIERS, GC-SHAPE's length AND flag set, and GC-R4's cardinalities. */
  'tools/test-declared-conversions.mjs',
];
/** Tier 3 — the aggregator. It reads the other suites, so it must not sit
 *  upstream of them. Tier 4 — the wave-pinned inventory suite, LAST. */
const TIER3 = [AGGREGATOR];
const TIER4 = [WAVE_PIN];
/** Outside every tier, and that WAS the finding — see GC-TAIL.
 *
 *  EMPTY as of DIET-01, 2026-08-22. WAS: ['tools/test-clones-split.mjs'].
 *  D80 said this set should be `[]` and this file recorded the erosion as a
 *  literal rather than normalising it, because the repair was a reorder of
 *  another order's entry. DIET-01 owns that entry: the suite is retired out of
 *  the chain entirely, so the set empties by removal rather than by reorder.
 *  It stays a DECLARED LITERAL for the reason UNWIRED_TODAY does — an empty
 *  expectation is what makes the NEXT append past the wave pin red this row on
 *  the day it lands, and that is the whole property D80 exists to buy. */
const AFTER_TIER4 = [];

const DECLARED_ORDER = [...TIER1, ...TIER2, ...TIER3, ...TIER4, ...AFTER_TIER4];

/** D49's exception list. A `tools/test-*.mjs` or `tools/verify-*.mjs` that is
 *  not in `test:contracts` is unwired UNLESS it is one of these, each with a
 *  reason. A new suite that nobody wires reds GC-WIRED on the day it lands. */
const NOT_IN_CHAIN = {
  'tools/test-c01-harness.mjs': 'a harness imported by other suites, not a standalone suite',
  'tools/test-portrait-harness.mjs': 'a harness imported by other suites, not a standalone suite',
  'tools/test-static-content.mjs': 'wired into the `test:static` script, which `check` also runs',
  /* epilogue-race, 2026-08-26: a LIVE-BROWSER gate (real wheel-driven wrap,
     headless Chrome + serve.py), so it runs where the other live-page gates
     run — `test:browser`, under `check:browser` — not in the Node-only
     contracts chain. Same declared-sibling-script pattern as
     test-static-content.mjs above. Its red-proof is recorded in
     docs/code-health/evidence/2026-08-21-elegance-run-01/epilogue-race/. */
  'tools/test-epilogue-retire.mjs': 'wired into the `test:browser` script, which `check:browser` runs',
};

/** D49's thirteenth instance — CLOSED by GATE-01, 2026-08-22.
 *
 *  This array carried ONE row, `tools/test-road.mjs`, because WIRE-04 held the
 *  package.json reservation and correctly declined to choose another lane's
 *  chain position. GATE-01 was transferred that decision explicitly, so the
 *  suite is now wired — in TIER2, at the end of the extraction-proof cluster,
 *  see the comment at its entry above — and this array empties in the same
 *  change that wires it, which is the "one deliberate, visible line" the note
 *  it replaces asked for.
 *
 *  It stays a DECLARED LITERAL rather than being deleted: an empty expectation
 *  is what makes the NEXT unwired suite red this row on the day it lands, and
 *  that is the property the thirteen instances existed to buy.
 *
 *  AND THAT PROPERTY FIRED WITHIN THE HOUR — D49's FOURTEENTH instance.
 *  `tools/test-input-claim.mjs` (31,912 bytes, 23/23 green standalone) landed
 *  at 06:37 on 2026-08-22, from the LIVE J04a-3 lane proving the decision port
 *  over journey/claim.js and journey/scroll.js. GATE-01 emptied this array at
 *  06:35 and the very next control run reddened this row against it, naming
 *  the file. That is the mechanism working exactly as WIRE-04 built it.
 *
 *  It is recorded here and NOT repaired, for WIRE-04's reason unchanged: this
 *  order was transferred test-road.mjs's position and NOTHING ELSE, and
 *  choosing J04a-3's chain position would be the precise overreach WIRE-04
 *  declined. It is deliberately NOT in NOT_IN_CHAIN — it IS a standalone
 *  suite, so an exemption there would be a false statement that permanently
 *  blinds this pin to that path. A debt row with an owner's name is not a
 *  blessing; an exemption would be.
 *
 *  A FIFTEENTH unwired suite reds this row immediately, which is still the
 *  property that must survive. When J04a-3 wires it, emptying this array is
 *  again one deliberate, visible line. */
/*  ...AND IT IS CLOSED BY J01, 2026-08-22, in the same change that wires the
 *  suite — one deliberate, visible line, exactly as the note above asked.
 *  J01 was transferred the position decision that GATE-01 correctly declined
 *  to take, and the entry sits at the end of TIER2 with its reasoning at the
 *  entry itself.
 *
 *  It stays a DECLARED LITERAL rather than being deleted, for the reason the
 *  thirteenth and fourteenth instances both give: an empty expectation is
 *  what makes the NEXT unwired suite red this row on the day it lands. J01's
 *  own tools/test-transition.mjs would have been the fifteenth instance if it
 *  had landed unwired; it did not, because it is wired in this same change. */
/*  ...AND IT IS OPEN AGAIN, ONE ROW, BY CONV-02 ON 2026-08-26 — the
 *  SIXTEENTH instance, and the first that is blocked rather than declined.
 *
 *  tools/test-declared-conversions.mjs is the declared-conversion gate
 *  (docs/code-health/2026-08-26-the-missing-abstraction.md §6; census
 *  2026-08-26-conversion-census.md). It is a contract suite over PRODUCTION
 *  constants and source text, the exact species of its intended neighbour
 *  tools/test-rest-composition.mjs, and its home is at the end of tier 2
 *  immediately after that file, whose pattern it generalizes to three more
 *  subjects. It runs green standalone, with twenty-four scored mutants.
 *
 *  WHY IT IS NOT WIRED, AND WHY THAT IS A DEBT AND NOT AN EXEMPTION. Wiring
 *  it into ANY of the three gate scripts additionally requires one receiver
 *  row and two manifest literals in tools/test-assertion-provenance.mjs —
 *  that sweep derives its gated set from test:unit + test:contracts +
 *  test:static, so no choice of script avoids it, and it reds within the
 *  minute otherwise, by its own design. That file is held by a live lane and
 *  CONV-02 was instructed not to touch it, so the wiring is HANDED OVER
 *  rather than forced through another order's uncommitted edits. Measured,
 *  both directions: wiring it reds AP1 and AP1b; this row keeps GC-WIRED
 *  honest in the meantime.
 *
 *  It is deliberately NOT in NOT_IN_CHAIN, for the reason the fourteenth
 *  instance records: it IS a standalone gate suite, so an exemption there
 *  would be a false statement that permanently blinds this pin to that path.
 *  A debt row with an owner's name is not a blessing; an exemption would be.
 *
 *  THE MOVE, when the provenance lane releases its file: one RECEIVERS row
 *  ({ 'assert.equal': A2, 'assert.deepEqual': A2, 'assert.ok': AOK } —
 *  re-derive it from the file's own call sites, do not copy this) and the
 *  AP1b manifest counts there; a TIER2 entry here after
 *  tools/test-rest-composition.mjs; GC-TIERS t2 9-46 -> 9-47 with t3/t4
 *  shifted; GC-SHAPE length 48 -> 49 and one `flagged` row; one PC-3f row in
 *  tools/test-coverage-floor.mjs; and this array empties again in the same
 *  change, which is the one deliberate, visible line the thirteenth instance
 *  asked for. AP5 should be re-read on that run: this file cites assertion
 *  ids from its neighbours in prose, and that scan does not read tense. */
/*  ...AND IT IS CLOSED BY CONV-CLOSE, 2026-08-26, in the same change that
 *  wires the suite — the one deliberate, visible line the sixteenth instance
 *  asked for, and every edit in the move above was made as written except the
 *  chain POSITION, which is argued at the entry itself in TIER2. The
 *  provenance lane released tools/test-assertion-provenance.mjs, so the
 *  receiver row and the AP1b manifest landed there in this same change; AP4's
 *  expected inventory did NOT move, which is the half of that file's answer
 *  worth stating — this suite adds 0 data-blind rows and 0 inventory rows.
 *  AP5 was re-read as asked and reports nothing over the newly swept file.
 *
 *  It stays a DECLARED LITERAL rather than being deleted, for the reason the
 *  thirteenth, fourteenth and fifteenth instances all give: an empty
 *  expectation is what makes the NEXT unwired suite red this row on the day
 *  it lands. */
const UNWIRED_TODAY = [];

/* ==================================================================== *
 * THE LEDGER.
 * ==================================================================== */

console.log('tools/test-gate-composition.mjs — the composition and order of the test:contracts chain\n');

const INPUT = { pkg: readFileSync(PKG, 'utf8') };

pin('GC-ORDER', "D54/D80 — the chain's composition AND order, as a site set keyed by position",
  (i) => suites(i).map((s, n) => `${String(n + 1).padStart(2, '0')} :: ${s}`),
  INPUT, DECLARED_ORDER.map((s, n) => `${String(n + 1).padStart(2, '0')} :: ${s}`),
  'an entry added, dropped, renamed or reordered moves exactly the rows it touches — a count could not say which');

pin('GC-TAIL', 'D80 — the suites that run AFTER the wave-pinned inventory suite',
  (i) => { const s = suites(i); const k = s.indexOf(WAVE_PIN); return k === -1 ? ['WAVE PIN ABSENT'] : s.slice(k + 1); },
  INPUT, AFTER_TIER4,
  'D80 says this set should be EMPTY, and as of DIET-01 it IS — tools/test-clones-split.mjs, the one '
  + 'suite that had been appended past the wave pin, is retired out of the chain. The literal is kept '
  + 'rather than deleted: a SECOND append past the wave pin reds this row rather than eroding quietly, '
  + 'which is the property D80 exists to buy.');

pin('GC-TIERS', 'D80 — each tier occupies a contiguous block, in tier order',
  (i) => {
    const s = suites(i);
    const span = (tier) => {
      const ix = tier.map((f) => s.indexOf(f));
      if (ix.includes(-1)) return 'MEMBER MISSING';
      const lo = Math.min(...ix); const hi = Math.max(...ix);
      return `${lo + 1}-${hi + 1}${hi - lo + 1 === tier.length ? '' : ' NOT CONTIGUOUS'}`;
    };
    return { t1: span(TIER1), t2: span(TIER2), t3: span(TIER3), t4: span(TIER4) };
  },
  /* RE-BASELINED by order R05, 2026-08-22. WAS: t2 '11-50', t3 '51-51',
     t4 '52-52'. R05's contract suite lands at the END of tier 2, so tier 2
     grows by one and the two single-entry tiers above it shift by one. t1 is
     untouched, which is the half of this row that says the append did not
     erode a tier boundary. (The J05 re-baseline this replaces read: WAS t2
     '11-49', t3 '50-50', t4 '51-51'.) */
  /* RE-BASELINED AGAIN by order R07, 2026-08-22. WAS: t2 '11-52',
     t3 '53-53', t4 '54-54'. R07's contract suite lands at the END of tier 2
     for the same reason R05's and R06's did, so tier 2 grows by one and the
     two single-entry tiers above it shift by one. t1 untouched. */
  /* RE-BASELINED by order DIET-01, 2026-08-22. WAS: t1 '1-10', t2 '11-57',
     t3 '58-58', t4 '59-59'. Two tier-1 entries and six tier-2 entries are
     retired, so t1 loses 2, t2 loses 6 AND shifts down by the 2 above it,
     and the two single-entry tiers shift by 8. This is the first re-baseline
     of this row in the SHRINKING direction; every prior one added an entry. */
  /* t2 9-43 -> 9-44, t3/t4 shifted by one: connect-skip second pass, 2026-08-25,
     appends ONE tier-2 suite at the end of tier 2. */
  /* t2 9-44 -> 9-45, t3/t4 shifted by one again: border-flash, 2026-08-26,
     appends ONE tier-2 suite at the end of tier 2. */
  /* t2 9-45 -> 9-46, t3/t4 shifted by one again: no-auto-advance, 2026-08-26,
     inserts ONE tier-2 suite immediately after test-rest-composition, whose
     subject it inherits. Not an append past the wave pin. */
  /* t2 9-46 -> 9-47, t3/t4 shifted by one again: CONV-CLOSE, 2026-08-26,
     appends ONE tier-2 suite at the end of tier 2 (the declared-conversion
     gate, D49's sixteenth instance closed). t1 untouched, which is the half
     of this row that says the append did not erode a tier boundary. */
  /* t2 9-47 -> 9-46, t3/t4 shifted DOWN by one: DIET-02, 2026-08-26, retires
     ONE tier-2 suite from the middle of tier 2. Only the second re-baseline of
     this row in the shrinking direction; DIET-01's was the first. t1 untouched,
     which is the half of this row that says the retirement did not erode a
     tier boundary, and t2 staying CONTIGUOUS is the half that says the entry
     was removed rather than merely skipped. */
  INPUT, { t1: '1-8', t2: '9-46', t3: '47-47', t4: '48-48' },
  'a suite that changes tier, or a tier that stops being contiguous, moves exactly one key here');

pin('GC-WIRED', 'D49 — suites on disk that the chain does not run, against a declared exception list',
  (i) => {
    const inChain = new Set(suites(i));
    /* C9b — AN EXEMPTION IS A CLAIM, AND AN UNVERIFIED CLAIM IS THE BLIND
       SPOT THIS FILE EXISTS TO CLOSE. Every NOT_IN_CHAIN row that says
       "wired into the `X` script" asserted that and nothing checked it:
       delete the suite from that script and this pin stayed green with a row
       on file swearing it ran. Each such row is now resolved against the
       script it names, READ FROM package.json at run time — never a second
       copy of that script here, which would be CONTRIBUTING §5's shape of
       defect one ring out: a claim and its subject in two files that never
       refer to each other. Rows that name no ring (the two harnesses) claim
       nothing to check. A false row lands in this pin's own set, naming
       itself and the script it was checked against. */
    const stale = Object.entries(NOT_IN_CHAIN)
      .map(([f, why]) => [f, (/wired into the `([^`]+)`/.exec(why) || [])[1]])
      .filter(([f, s]) => s && !scriptOf(i.pkg, s).includes(f))
      .map(([f, s]) => `${f} :: EXEMPTION FALSE — its reason cites \`${s}\`, and that script does not run it`);
    return readdirSync(TOOLS)
      .filter((f) => /^(test-|verify-).*\.mjs$/.test(f))
      .map((f) => `tools/${f}`)
      .filter((f) => !inChain.has(f) && !NOT_IN_CHAIN[f])
      .concat(stale)
      .sort();
  },
  INPUT, UNWIRED_TODAY,
  'D49 reached eleven instances because nothing asked this question; an unwired suite is a green that means nothing '
  + '— and an exemption whose named script stopped running the suite is the same green over a blind spot, which is '
  + 'why the EXEMPTION FALSE rows are in this same set');

pin('GC-SHAPE', 'every entry is a plain `node tools/<suite>.mjs`, run once, and every ARGUMENT is declared',
  (i) => {
    const e = entries(i);
    const s = suites(i);
    return {
      allNodeInvocations: e.every((x) => /^node tools\/[\w.-]+\.mjs(?: --[\w-]+)*$/.test(x)),
      /* A SET, not a boolean (D54): the two QA-08 suites run their own mutant
         sweeps IN THE GATE because they cost 1.2 s between them, and D88's
         whole point is that a mutant sweep nobody runs is not a control. Any
         OTHER entry acquiring a flag — a `--quiet` that hides a phase, say —
         moves this row and names itself. */
      flagged: e.filter((x) => /\s--/.test(x)).map((x) => x.replace(/^node\s+/, '')).sort(),
      duplicates: s.filter((x, n) => s.indexOf(x) !== n).sort().join(',') || 'none',
      length: e.length,
    };
  },
  INPUT, {
    allNodeInvocations: true,
    flagged: [
      'tools/test-assertion-provenance.mjs --prove-failure',
      /* DIET-02, 2026-08-26 — TEN ENTRIES JOIN THIS SET IN ONE CHANGE, and
         not one of them is a new suite. They are D189's dormant proof modes:
         eleven suites that were already in the chain, already carried a live
         `--prove-failure` block, and never received the flag. Nothing was
         added to tools/ to arm them; the flag is the whole edit. The eleventh,
         tools/test-c06-registry.mjs, is not here because it retires in the
         same change — its proof mode was run and verified green (10/10
         mutants) before the move, and it keeps that mode at its retired path.

         Verified individually before arming: all eleven pass --prove-failure
         today, total added cost ~5 s across the chain. The exposure D189
         named was never that one had rotted — it was that nothing in the gate
         would notice if one did, the way M8 did for four orders (D188).

         Sorted, so they land throughout rather than at the end:
           baked-lifecycle, chapter-contract, coverage-floor, error-classes,
           portrait-paint, render-perturbation, renderer-resources, road,
           spores-lifecycle, ui-lifecycle.

         THE SHARPEST ONE IS test-render-perturbation, whose entire purpose is
         the sensitivity proof for the render baseline's pins — and the chain
         ran it without the flag. */
      'tools/test-baked-lifecycle.mjs --prove-failure',
      'tools/test-chapter-contract.mjs --prove-failure',
      'tools/test-coverage-floor.mjs --prove-failure',
      /* CONV-CLOSE, 2026-08-26 — the twentieth flagged entry. Sorted, so it
         lands second rather than last. */
      'tools/test-declared-conversions.mjs --prove-failure',
      /* border-flash, 2026-08-26 — the fourteenth flagged entry. Sorted, so
         it lands second rather than last. */
      'tools/test-detail-shell-monotone.mjs --prove-failure',
      'tools/test-dwell-oracle.mjs --prove-failure',
      'tools/test-error-classes.mjs --prove-failure',
      'tools/test-frame-publication.mjs --prove-failure',
      'tools/test-gate-composition.mjs --prove-failure',
      'tools/test-global-hooks.mjs --prove-failure',
      'tools/test-input-claim.mjs --prove-failure',
      'tools/test-instrument-layer.mjs --prove-failure',
      /* J05, 2026-08-22 — the thirteenth flagged entry and the last of
         Wave 3. WAS: twelve entries, and this file absent. */
      'tools/test-page-lifetime.mjs --prove-failure',
      'tools/test-portrait-paint.mjs --prove-failure',
      'tools/test-pose-oracle.mjs --prove-failure',
      'tools/test-render-perturbation.mjs --prove-failure',
      'tools/test-renderer-resources.mjs --prove-failure',
      /* connect-skip second pass, 2026-08-25 — the eighteenth flagged entry.
         WAS: seventeen entries, and this file absent. */
      /* no-auto-advance, 2026-08-26 — the nineteenth flagged entry. WAS:
         eighteen entries, and this file absent. */
      'tools/test-rest-authority.mjs --prove-failure',
      'tools/test-rest-composition.mjs --prove-failure',
      'tools/test-road.mjs --prove-failure',
      'tools/test-spores-lifecycle.mjs --prove-failure',
      /* R05, 2026-08-22 — the fourteenth flagged entry. WAS: thirteen
         entries, and this file absent. */
      /* R06, 2026-08-22 — the fifteenth flagged entry. WAS: fourteen
         entries, and this file absent. */
      /* R07, 2026-08-22 — the sixteenth flagged entry. WAS: fifteen
         entries, and this file absent. */
      /* R08, 2026-08-22 — the seventeenth flagged entry, and the last the
         R-series adds. WAS: sixteen entries, and this file absent. */
      'tools/test-transition.mjs --prove-failure',
      'tools/test-ui-closure.mjs --prove-failure',
      'tools/test-ui-lifecycle.mjs --prove-failure',
    ],
    duplicates: 'none',
    /* RE-BASELINED 60 -> 51 by order DIET-01, 2026-08-22 (WAS: 60). NINE
       entries leave, all named in the two comments in TIER1/TIER2 above and
       enumerated in retired-suites/README.md. `flagged` is DELIBERATELY
       UNCHANGED: not one of the nine carried an argument, so a flag set that
       moved here would mean this order removed something it did not mean to. */
    /* 45 -> 46 by connect-skip second pass, 2026-08-25 (WAS: 45). ONE entry joins,
       declared in TIER2 above; `flagged` moves with it because the entry
       carries --prove-failure. */
    /* 46 -> 47 by border-flash, 2026-08-26. ONE entry joins, declared in TIER2
       above; `flagged` moves with it for the same reason. */
    /* 47 -> 48 by no-auto-advance, 2026-08-26. ONE entry joins, declared in
       TIER2 above; `flagged` moves with it because the entry carries
       --prove-failure. */
    /* 48 -> 49 by CONV-CLOSE, 2026-08-26. ONE entry joins, declared in TIER2
       above; `flagged` moves with it for the same reason. */
    /* 49 -> 48 by DIET-02, 2026-08-26. ONE entry leaves — tools/test-c06-
       registry.mjs, retired — and `flagged` does not move with it, because it
       never carried an argument. `flagged` DOES move in this same change, by
       TEN, and for the unrelated reason recorded at the head of that set. Two
       independent movements in one row, and they are separable by inspection:
       if `flagged` had shrunk here, this order would have removed something it
       did not mean to. */
    length: 48,
  });

/* --- D46: the reader is proved to be reading, and to refuse when it cannot -- */
{
  const refuses = (text, needle) => {
    try { chainOf(text); return 'no refusal'; } catch (e) {
      if (!(e instanceof HarnessFault)) return `untagged ${e.constructor.name}`;
      return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 40)}`;
    }
  };
  L.same('GC-R1', 'D63 — an unparseable package.json yields a typed refusal, never an empty chain',
    refuses('{ not json', 'does not parse'), 'HarnessFault');
  L.same('GC-R2', 'D63 — a package.json with no test:contracts script refuses rather than measuring zero',
    refuses('{"scripts":{}}', 'no test:contracts'), 'HarnessFault');
  L.same('GC-R3', 'D46 — the reader really read package.json: a known member is present and the file is non-trivial',
    [INPUT.pkg.length > 500, suites(INPUT).includes(WAVE_PIN), suites(INPUT).includes('tools/test-comment-stripper.mjs')],
    [true, true, true], `package.json is ${INPUT.pkg.length} bytes`);
  L.same('GC-R4', 'D45 — the declared order is the size this order recorded (iteration pin)',
    /* RE-BASELINED by order DIET-01, 2026-08-22. WAS: [10, 47, 1, 1, 60].
       -2 in tier 1, -6 in tier 2, -1 past tier 4 (AFTER_TIER4 emptied), so
       -9 in the total. TIER3 and TIER4 are untouched, which is the half of
       this row that says the retirement did not disturb the aggregator or
       the wave pin. */
    /* +1 in tier 2 and +1 in the total by border-flash, 2026-08-26
       (WAS: [8, 36, 1, 1, 46]). TIER1/TIER3/TIER4 are untouched, which is the
       half of this row that says the append did not disturb the head of the
       chain, the aggregator, or the wave pin. */
    /* +1 in tier 2 and +1 in the total by no-auto-advance, 2026-08-26
       (WAS: [8, 37, 1, 1, 47]). TIER1/TIER3/TIER4 are untouched, which is the
       half of this row that says the insert did not disturb the head of the
       chain, the aggregator, or the wave pin. */
    /* +1 in tier 2 and +1 in the total by CONV-CLOSE, 2026-08-26
       (WAS: [8, 38, 1, 1, 48]). TIER1/TIER3/TIER4 are untouched, which is the
       half of this row that says the append did not disturb the head of the
       chain, the aggregator, or the wave pin. */
    /* -1 in tier 2 and -1 in the total by DIET-02, 2026-08-26
       (WAS: [8, 39, 1, 1, 49]). TIER1/TIER3/TIER4 are untouched, which is the
       half of this row that says the retirement did not disturb the head of
       the chain, the aggregator, or the wave pin. */
    [TIER1.length, TIER2.length, TIER3.length, TIER4.length, DECLARED_ORDER.length], [8, 38, 1, 1, 48]);
}

/* --- D44 / D86 over this file's own source --- */
{
  const RE = literalPredicateRe(['L.same', 'pin'], 2);
  const hits = literalPredicateHits(readFileSync(SELF_PATH, 'utf8'), RE).hits;
  L.same('GC-X1', 'D44 — bare-literal-predicate assertions in this suite', hits.length, 0,
    hits.length ? hits.join('\n        ') : null);
  const misses = TAUTOLOGY_FIXTURES
    .filter(([, , snippet, want]) => scanTautologyAst(snippet, new Map([['L.same', 2]])).hits.length !== want)
    .map(([id]) => id);
  L.same('GC-X2', "D46 — every D86 fixture row returns the count it was built for (the reader for GC-X3's zero)",
    misses, []);
  const tau = scanTautologyAst(readFileSync(SELF_PATH, 'utf8'), new Map([['L.same', 2], ['pin', null]]));
  L.same('GC-X3', 'D86 — syntactic tautologies in this suite', tau.hits.length, 0,
    tau.hits.length ? tau.hits.join('\n        ') : null);
  L.same('GC-X4', 'D45 — the AST scan reached this file at all (a 0 would mean it read the wrong bytes)',
    tau.sites > 10, true, `sites=${tau.sites}`);
}

SENT.reach('ledger');
let code = L.report();

/* ==================================================================== *
 * --prove-failure — mutants of the CHAIN, each declaring the pins it moves.
 *
 * CM1 is the demonstration D88 asked for: an append past the wave-pinned
 * suite. Before this file it changed nothing anywhere in the gate.
 * ==================================================================== */
const MUTANTS = [
  ['CM1', 'GC-ORDER', 'a suite is APPENDED PAST the wave pin — D80\'s exact erosion, repeated',
    null, ['node tools/test-render-baseline.mjs', 'node tools/test-render-baseline.mjs && node tools/test-newcomer.mjs']],
  ['CM1b', 'GC-TAIL', 'the same append, read through the tail set',
    null, ['node tools/test-render-baseline.mjs', 'node tools/test-render-baseline.mjs && node tools/test-newcomer.mjs']],
  ['CM1c', 'GC-SHAPE', 'the same append, read through the cardinality and shape pin',
    ['length'], ['node tools/test-render-baseline.mjs', 'node tools/test-render-baseline.mjs && node tools/test-newcomer.mjs']],
  /* QA-09: [21, 22] -> [22, 23]. The declared axis is POSITIONAL, so inserting
     one entry into tier 1 shifts it by exactly one — and gate 4 said so
     (`declared moved elements [21,22] but observed [22,23]`) rather than
     letting a stale declaration ride. That is D74 doing the job it exists
     for: the axis is checked, not written down. */
  /* DIET-01: [22, 23] -> [20, 21]. The declared axis is POSITIONAL and tier 1
     lost two entries, so every tier-2 row shifts down by exactly two. Gate 4
     checks this against the observed move rather than trusting the comment. */
  ['CM2', 'GC-ORDER', 'two adjacent tier-2 suites swap places',
    [20, 21], ['node tools/test-animation-lifecycle.mjs && node tools/test-intro-lifecycle.mjs',
      'node tools/test-intro-lifecycle.mjs && node tools/test-animation-lifecycle.mjs']],
  /* RE-ANCHORED by DIET-01, 2026-08-22. WAS `node tools/test-canopy-split.mjs`,
     which is neither in the chain nor in tools/ any more — a `.replace()` whose
     anchor is gone does not fail, it NO-OPS, and `mutateText` is what makes that
     a HarnessFault instead of a silent green. The replacement must name a suite
     that is BOTH in the chain and on disk in tools/, or GC-WIRED cannot move. */
  /* RE-ANCHORED AGAIN by DIET-02, 2026-08-26. WAS `node tools/test-spores-lifecycle.mjs && `,
     and arming D189's dormant proof modes rotted it inside the hour: the entry
     became `... --prove-failure && ` and the anchor no longer matched. It failed
     loudly (`GC-WIRED: anchor miss [CM3]`) rather than no-opping, which is D74
     working, and the repair is not to paste the flag into the anchor — that
     re-couples this row to a decision that has now moved twice.
     THE ANCHOR IS NOW A SUITE WITH NO `--prove-failure` BLOCK IN ITS SOURCE AT
     ALL, so the one thing that rotted it cannot happen to the replacement:
     tools/test-portrait-dealer.mjs is in the chain, on disk in tools/, and
     carries no argv-gated phase to acquire a flag for. */
  ['CM3', 'GC-WIRED', 'a suite is dropped from the chain but still sits on disk',
    null, ['node tools/test-portrait-dealer.mjs && ', '']],
  /* C9b. CM3 drops a suite from the chain; CM3b breaks the OTHER half of
     D49 — the exemption's own claim. The anchor is in `test:browser`, not
     `test:contracts`, so this mutant leaves every other pin in this file
     untouched and moves GC-WIRED alone: the proof that the exemption is
     checked against the script it names rather than believed. */
  ['CM3b', 'GC-WIRED', "an exemption's named script stops running the suite it exempts",
    null, [' && node tools/test-epilogue-retire.mjs', '']],
  ['CM4', 'GC-TAIL', 'the wave pin is ALSO run early — the position where it concealed 27 of the 33 things the chain ran',
    null, ['node tools/test-chapter-entry.mjs', 'node tools/test-render-baseline.mjs && node tools/test-chapter-entry.mjs']],
  ['CM5', 'GC-SHAPE', 'an entry is duplicated',
    ['duplicates', 'length'], ['node tools/test-frame-order.mjs && ', 'node tools/test-frame-order.mjs && node tools/test-frame-order.mjs && ']],
  ['CM6', 'GC-TIERS', 'a tier-2 suite is promoted into the tier-1 block',
    ['t1', 't2', 't3', 't4'], ['node tools/test-comment-stripper.mjs && ', 'node tools/test-comment-stripper.mjs && node tools/test-chapter-contract.mjs && ']],
  ['CM7', 'GC-SHAPE', 'an entry acquires an undeclared flag',
    ['flagged'], ['node tools/test-connect-motion.mjs', 'node tools/test-connect-motion.mjs --quiet']],
  ['CM8', 'GC-SHAPE', 'an entry stops being a node invocation of a tools/ suite at all',
    ['allNodeInvocations'], ['node tools/test-chapter-entry.mjs', 'bash -c true']],
  ['CM9', 'GC-SHAPE', "a QA-08 suite silently loses its --prove-failure sweep — a mutant table nobody runs",
    ['flagged'], ['node tools/test-instrument-layer.mjs --prove-failure', 'node tools/test-instrument-layer.mjs']],
];

if (PROVE) {
  console.log('\n--prove-failure — every pin above, driven red by a mutant of the chain itself');
  let out;
  try {
    out = sweep(MUTANTS.map(([tag, id, moves, keys, [from, to]]) => M(
      id, `${tag} — ${moves}`, keys, (i) => ({ pkg: mutateText(i.pkg, tag, from, to) }),
    )));
  } finally {
    SENT.reach('sweep');
  }
  L.discard();
  L.same('GC-M1', 'D58 — mutants that did not drive their declared pin on its declared axis', out.bad, 0);
  /* 11 -> 12 by C9b, 2026-08-26: ONE mutant joins, CM3b, declared in the
     deck above. The other eleven are untouched. */
  L.same('GC-M2', 'D45 — every mutant ran (iteration pin)', out.total, 12);
  L.same('GC-M3', 'D58 — registered pins carrying no mutant', out.uncovered, []);
  L.same('GC-M4', 'D70 — harness faults raised by a guard, named separately from a failed gate', out.faults, []);
  code = L.report() || code;
  if (out.faults.length) throw new HarnessFault(out.faults.join('; '));
}

process.exit(code);
