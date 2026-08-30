/* ==================================================================== *
 * tools/mutant-registry.mjs — QA-06.
 *
 * THE ONE MUTANT REGISTRY (D74), used by every suite that has one.
 *
 * D74 is the most important instrument pattern of this run and it was
 * re-derived four times: tools/test-tendrils-split.mjs (the original),
 * tools/test-canopy-split.mjs, tools/test-terrain-split.mjs and
 * tools/test-ui-lifecycle.mjs. The five-gate loop in those four files is
 * character-for-character identical apart from comment style, one `let`
 * declaration, three different error-message truncation lengths (90 / 110 /
 * 130) and the assertion ids. Six comment-strippers became one; this is the
 * same shape and the same remedy.
 *
 * The registry is not a table. `pin()` stores the assertion's own READER,
 * its INPUT and its EXPECTED literal. A mutant supplies ONLY a perturbed
 * input; the harness drives the registered reader and compares against the
 * registered expectation. FOUR gates fire per mutant:
 *
 *   1. the baseline reproduces the registered expectation
 *      — catches "this mutant targets a different assertion";
 *   2. the perturbation moves the reader's INPUT;
 *   3. it moves the reader's OUTPUT, WHICH IS THE ASSERTION GOING RED
 *      — catches D50's neighbouring-quantity error;
 *   4. the OBSERVED moved-element set equals the DECLARED one
 *      — what makes the axis declaration checked rather than decorative.
 *
 * QA-08 / D88 — THERE WERE NEVER FIVE. A fifth gate, "and the comparison
 * goes red" (`canon(after) === canon(reg.expected)`), shipped in all four
 * original registries and was inherited verbatim here. It is PROVABLY
 * UNREACHABLE: gate 1 continues unless `canon(before) === canon(expected)`
 * and gate 3 continues unless `canon(after) !== canon(before)`, so past both,
 * `canon(after) !== canon(expected)` holds by construction and gate 5's test
 * can never be true. Its `gates.cannotFail` arm was therefore the one arm of
 * the returned object that could never be non-empty — a check that cannot
 * answer `false`, which is D45's own shape enshrined in the module that
 * enforces D45, documented as live in four suites' prose.
 *
 * It is DELETED rather than repaired, because the property it claimed to test
 * is exactly gate 3's: past gate 1, "the output moved" and "the comparison
 * goes red" are the same statement. Gate 3 keeps the `CANNOT FAIL` vocabulary
 * it always printed. Six arms remain and EVERY ONE IS REACHABLE — pinned, one
 * positive control per arm, by tools/test-instrument-layer.mjs, which is also
 * the first reader the `gates` object has ever had.
 *
 * A rotted anchor reports BROKEN, never a silent `[red]`. And the registry
 * IS the D58 contract: `uncovered` names every pin added without a mutant,
 * so coverage is checked mechanically rather than remembered.
 *
 * WHAT THIS MODULE DOES NOT DO, and must not: it does not supply readers,
 * inputs, expectations or mutants. Those are the per-subject data that make
 * an assertion specific. A shared registry DRIVES readers; it does not
 * replace them. Every literal stays in the suite that earned it.
 *
 * THIS MODULE SATISFIES ITS OWN FOUR GATES for its consumers: gate 1 is
 * `baselineMismatch`, gate 2 `inputNoOp`, gate 3 `outputStill`, gate 4
 * `axisMismatch`, and `unregistered` / `threw` cover the two ways a mutant
 * fails to be a mutation at all. Each is reported by name so a suite's own
 * controls can pin which gate fired rather than only that something did.
 * ==================================================================== */

import { HarnessFault, canon, inputCanon } from './instrument-ledger.mjs';

/** The receiver spec for `pin` in tools/self-controls.mjs's tautology scan.
 *
 *  QA-08 / D88. Both converted suites declared `['pin', 2]` — the ADJACENT
 *  actual/expected arity — and `pin(id, what, reader, input, expected, hint)`
 *  has no adjacent pair: argument 2 is the reader and argument 3 is its input.
 *  T2 was therefore comparing a reader against an input, which is never a
 *  tautology and so never fired, and NO REGISTRY-PINNED ASSERTION WAS T2
 *  SCANNED AT ALL — 42 of 111 rows in one suite, 25 of 41 in another, and
 *  every pinned row in a third.
 *
 *  The actual of a pinned assertion is `reader(input)`, so the tautology a
 *  pin can carry is QA-01's Engine 2 — the formula restated instead of its
 *  result, `pin(id, what, r, input, r(input))`. That is what this spec asks
 *  for, and `scanTautologyAst` REFUSES a numeric declaration for a callee
 *  named `pin` rather than accepting a claim the signature cannot support. */
export const PIN_RECEIVER = Object.freeze({ actualCall: [2, 3], expected: 4 });

/** Declare a mutant. `perturb(input)` returns a PERTURBED COPY of the
 *  registered pin's input — never a poisoned double of it (D58).
 *
 *  @param id           the registered pin this mutant must drive red.
 *  @param moves        prose naming the QUANTITY moved (D50, extended: the
 *                      axis error is not always announced, so name it).
 *  @param movedIndices the DECLARED moved-element set: array indices for an
 *                      array-shaped reader, key names for an object-shaped
 *                      one, or null for a scalar-shaped reader.
 *  @param perturb      (input) => perturbedInput
 */
export const M = (id, moves, movedIndices, perturb) => ({ id, moves, movedIndices, perturb });

/** The default moved-element observer.
 *
 *  Arrays yield moved INDICES. Plain objects with an identical key set yield
 *  the moved KEY NAMES — without this every object-shaped reader falls
 *  through to `movedIndices: null` and gate 4 never runs for it, which is a
 *  gate that silently does not apply rather than a gate that passes.
 *  A changed shape returns null: the axis IS the shape. */
export function movedPositions(before, after) {
  if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
    const out = [];
    for (let i = 0; i < before.length; i++) if (canon(before[i]) !== canon(after[i])) out.push(i);
    return out;
  }
  if (before && after && typeof before === 'object' && typeof after === 'object'
      && !Array.isArray(before) && !Array.isArray(after)) {
    const kb = Object.keys(before).sort();
    const ka = Object.keys(after).sort();
    if (kb.join(',') === ka.join(',')) {
      return kb.filter((k) => canon(before[k]) !== canon(after[k]));
    }
  }
  return null;
}

/**
 * @param {object} opts
 * @param {{same:Function}} opts.ledger  the shared ledger (tools/instrument-ledger.mjs)
 * @param {Function} opts.fault          declare a harness fault (D70)
 */
export function createRegistry({ ledger, fault }) {
  const REGISTRY = new Map();

  /** A mutant-covered assertion. `reader(input)` produces the actual;
   *  `expected` is a literal. Both are stored so --prove-failure drives
   *  exactly these, against exactly this expectation. */
  function pin(id, what, reader, input, expected, hint) {
    if (REGISTRY.has(id)) fault(`duplicate pin id ${id}`);
    REGISTRY.set(id, { what, reader, input, expected });
    return ledger.same(id, what, reader(input), expected, hint);
  }

  /**
   * Drive every mutant through the four gates.
   *
   * Returns { total, bad, uncovered, faults, gates } — NUMBERS AND SETS, not
   * assertions. The caller pins them against ITS OWN literals, because those
   * literals are the per-subject data D84 forbids consolidating away.
   *
   * D70: a HarnessFault raised by a guard is COLLECTED and named separately
   * from a mutant that merely failed a gate, and the caller re-raises it
   * after reporting. A guard that fires is never scored as a mutation.
   *
   * @param {Array} mutants
   * @param {Function} [observe] moved-element observer (defaults to
   *        movedPositions; a suite whose readers have a bespoke shape passes
   *        its own and keeps gate 4 live rather than losing it).
   */
  function sweep(mutants, observe = movedPositions) {
    let bad = 0;
    const faults = [];
    const gates = { baselineMismatch: [], inputNoOp: [], outputStill: [], axisMismatch: [], unregistered: [], threw: [] };

    for (const m of mutants) {
      const reg = REGISTRY.get(m.id);
      if (!reg) {
        bad++; gates.unregistered.push(m.id);
        console.log(`  BROKEN  ${m.id}  targets an assertion that is not a registered pin`);
        continue;
      }
      let before;
      let after;
      let note = '';
      try {
        before = reg.reader(reg.input);
        /* GATE 1 — the mutant targets the assertion it names. */
        if (canon(before) !== canon(reg.expected)) {
          bad++; gates.baselineMismatch.push(m.id);
          console.log(`  BROKEN  ${m.id}  baseline mismatch — this mutant is not driving the assertion it names`);
          continue;
        }
        const perturbed = m.perturb(reg.input);
        /* GATE 2 — the perturbation moved the reader's INPUT. */
        if (inputCanon(perturbed) === inputCanon(reg.input)) {
          bad++; gates.inputNoOp.push(m.id);
          console.log(`  BROKEN  ${m.id}  perturbation was a no-op on the reader's input`);
          continue;
        }
        after = reg.reader(perturbed);
      } catch (e) {
        /* A rotted anchor is LOUD (D70), and a HARNESS fault is named as
           one rather than being counted as evidence about the subject. */
        bad++;
        if (e instanceof HarnessFault) faults.push(`${m.id}: ${e.message}`);
        else gates.threw.push(m.id);
        console.log(`  ${e instanceof HarnessFault ? 'FAIL HARNESS FAULT' : 'BROKEN'}  ${m.id}  ${e.message.slice(0, 130)}`);
        continue;
      }
      /* GATE 3 — the reader's OUTPUT moved (D50's neighbouring-quantity
         error), which past gate 1 IS the assertion going red: `before` is
         the registered expectation, so `after !== before` is `after !==
         expected`. The deleted gate 5 tested the second form of the same
         sentence and could not fire (QA-08, see the header). */
      if (canon(after) === canon(before)) {
        bad++; gates.outputStill.push(m.id);
        console.log(`  CANNOT FAIL  ${m.id}  moves: ${m.moves}`);
        console.log('        >>> the reader\'s output did not move. A "cannot fail" verdict is a claim about the MUTANT until proven otherwise (D50).');
        continue;
      }
      /* GATE 4 — the OBSERVED moved-element set equals the DECLARED one. */
      const observed = observe(before, after);
      if (m.movedIndices !== null && m.movedIndices !== undefined) {
        if (observed === null || canon(observed) !== canon(m.movedIndices)) {
          bad++; gates.axisMismatch.push(m.id);
          console.log(`  BROKEN  ${m.id}  declared moved elements ${canon(m.movedIndices)} but observed ${canon(observed)}`);
          continue;
        }
        note = ` [elements ${canon(observed)} verified]`;
      } else if (observed !== null && observed.length === 0) {
        bad++; gates.axisMismatch.push(m.id);
        console.log(`  BROKEN  ${m.id}  scalar-shaped declaration but no element moved`);
        continue;
      }
      console.log(`  [red]  ${m.id}  moves: ${m.moves}${note}`);
    }

    console.log(`\n  ${mutants.length - bad}/${mutants.length} mutants drove their declared axis red.`);

    /* D58 — the registry IS the coverage contract. A pin added later without
       a mutant appears HERE rather than being noticed by a reviewer. */
    const mutated = new Set(mutants.map((m) => m.id));
    const uncovered = [...REGISTRY.keys()].filter((id) => !mutated.has(id));

    return { total: mutants.length, bad, uncovered, faults, gates, size: REGISTRY.size };
  }

  return { REGISTRY, pin, sweep };
}
