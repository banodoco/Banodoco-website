# Wave 3B Sol fallback Oracle

Date: 2026-08-30  
Reviewed HEAD: `737d37b`  
Preserved implementation checkpoint: `e250e4a`

## Binary verdict

**REVISE — NOT FREEZE-READY.**

The plan is still forming. The evidence establishes two immediate P0 defects: the browser-smoke deadline does not own or cancel the operation it times out, and product startup has no bounded terminal state for six demonstrated pending dependencies. The evidence does not establish a reduced-motion defect, an indefinite GPU-fence defect, or a product performance root cause. Environmental GPU/resource starvation is a reproduced trigger, not an excuse for the missing visitor-safe terminal state and not sufficient attribution for performance work.

The brief records `1b24936`, while this review was requested at `737d37b`. The intervening commits contain Oracle evidence/configuration only; application source remains the `e250e4a` checkpoint. No source change was made by this review.

## Evidence judgments

| Area | Judgment | What the evidence supports | What it does not support |
|---|---|---|---|
| Browser-smoke lifecycle | **DEFECT PROVEN** | `runWithDeadline()` races a timer without cancelling or awaiting the scenario it abandons. `closeWithin()` likewise permits continuation without proving closure. A later scenario can therefore begin before the timed-out scenario and its browser owner are quiescent. Inner and outer timeouts also obscure the failing phase. | The observed later runtime failures cannot be attributed specifically to cross-scenario leakage: fresh isolated probes also failed under host starvation. That consequence remains **UNDETERMINED**. |
| Reduced motion | **NO FINDING for this incident** | Static-door markup/CSS and the reduced-motion branch exist; the smoke assertions for the static state passed before root navigation failed. The root still synchronously constructs the renderer and waits on startup, so the observed timeout is not evidence of broken reduced-motion semantics. | No reduced-motion workaround, separate startup path, or visual change is justified. |
| Product startup terminality | **DEFECT REPRODUCED** | Holding each of dynamic module import, bake manifest, a bake bin, portrait image, `compileAsync`, or a hidden warm draw left the page preparing after eight seconds with no visible fallback. Releasing the held operation allowed activation. Current `loadJourney()` has no encompassing deadline/cancellation owner. | This does not prove every dependency is intrinsically slow or faulty. It proves the page lacks a bounded ready-or-fallback contract when any dependency stalls. |
| Existing rejection fallback | **USEFUL, INCOMPLETE MECHANISM** | Synthetic rejection reaches the existing accessible status/static-link fallback, releases intro input capture, restores free input, and resists late activation in that probe. | Synthetic rejection is not a shipped timeout and does not stop an indefinitely pending dependency. A `Promise.race` alone would also leave late continuations capable of mutation unless guarded. |
| GPU fence | **INDEFINITE-FENCE CLAIM FALSIFIED** | `drainGpu()` already bounds its fence phases, and the observed fence probe eventually became ready. | No fence rewrite or extra timeout is supported by this wave. |
| GPU/resource starvation | **TRIGGER REPRODUCED; ROOT CAUSE UNDETERMINED** | Isolated failures occurred while the server remained fast and responsive, pages reached `document.readyState=complete`, RAF progress nearly stopped, GPU ReadPixels stall messages appeared, and host load was extreme with unrelated GPU/browser workloads. | The evidence does not distinguish a product renderer defect from host contention, justify a performance optimization, prove a software-renderer classification miss, or implicate the server. Comparable quiet-host traces are required. |
| Retry/second boot | **OUT OF CURRENT CONTRACT** | A second successful `boot()` resolves to the first state; after forced fallback no supported same-document retry was demonstrated. | A retry framework, generalized teardown, or broader lifecycle rewrite is not warranted by the requested startup terminality fix. |

## Accepted backlog and priority

1. **P0 — browser-smoke cancellation and quiescence ownership: accept.** This is a gate-correctness defect. Fix it before using the harness for further startup conclusions.
2. **P0 — bounded product startup terminality: accept.** Every visitor must reach exactly one terminal state: interactive journey or visible accessible static fallback.
3. **P0 prerequisite evidence — quiet-host startup calibration: accept.** This selects and documents a defensible deadline; it is measurement work, not a new product defect.
4. **Performance/GPU optimization: hold as unprioritized pending attribution.** The environmental trigger is real, but the product root cause and optimization target are not established.
5. **Reduced-motion repair: reject.** Preserve current behavior and validate it through the repaired harness.
6. **GPU-fence timeout repair: reject.** The alleged indefinite wait was falsified.
7. **Cross-scenario leakage as the cause of the observed later failures: do not assert.** Repair the proven ownership defect, then remeasure.

Existing fault, context-loss, input, responsive, delivery, and profiling work remains on the broader backlog; this supplement does not adjudicate or absorb it.

## Supplemental implementation tasklist

All four tasks are **normal** bounded Luna work. None meets the `[XHARD]` threshold: the defects and ownership boundaries are localized, the evidence identifies concrete acceptance checks, and no irreducible architectural choice remains after decomposition. Reconsider `[XHARD]` only if new evidence proves that meeting terminality requires a cross-system renderer/process redesign rather than the existing page-level mechanisms.

### T1 — P0: make browser-smoke deadlines own cancellation and quiescence

**Dependency:** none. Do this first.

**Outcome:** A scenario deadline terminates its page/context/browser owner and waits for confirmed cleanup before the runner may start another scenario. Phase-local failures identify the operation that expired. Inner operation timeouts must not outlive or obscure the scenario deadline. Preserve existing required-failure and explicitly authorized skip semantics.

**Smallest design boundary:** extend the existing scenario runner/cleanup mechanism. Do not add a scheduler or general browser orchestration layer.

**Acceptance:**

- A deterministic synthetic scenario that never settles reaches its deadline, executes ownership cleanup, and cannot emit a later log, result, or state mutation.
- The next scenario cannot start until the timed-out owner's browser/context closure is confirmed; failure to confirm closure is itself a failed run, not a warning followed by continuation.
- A repeated timeout test returns process/profile/port ownership to its pre-test baseline and leaves no scenario-owned Chromium or server process.
- Timeout output identifies the active phase rather than only the outer scenario.
- The existing missing-Chromium failure and explicit-skip tests continue to pass.

**Validation:** focused deterministic harness test first; syntax/lint for changed tools; then one real timeout/cleanup proof under the exclusive browser lease defined below. Do not use a full smoke result obtained before this task as freeze evidence.

### T2 — P0 prerequisite: establish a quiet-host startup baseline and deadline policy

**Dependency:** T1 complete and its cleanup proof passing.

**Outcome:** Produce comparable timing evidence for healthy startup phases and the six controlled holds, sufficient to choose a named page-level terminal deadline. Record source hash, renderer, host load, server latency, and phase transitions so host starvation is not silently recast as product latency.

**Measurement contract:**

- Use a unique server port and temporary browser profile, one browser owner at a time, with no concurrent capture, performance, WebGL, or unrelated browser workload.
- Record at least five cold successful samples for the normal live path and the reduced-motion/no-intro paths exercised by the smoke suite.
- Record module import, manifest/bin loading, chapter preparation, portrait loading, compilation, hidden warming, fence completion, activation/fallback, RAF progress, and renderer identity where observable.
- Repeat the six one-at-a-time controlled holds with the repaired harness. Include the bounded fence as a control.
- Select a conservative explicit deadline from the observed healthy distribution and document the margin. If a quiet host cannot be obtained, report the evidence as unavailable; do not manufacture a threshold or call the product green/red from a contaminated run.

**Acceptance:** the resulting evidence either names the deadline and rationale needed by T3 or explicitly blocks T3's policy choice. Merely increasing existing smoke timeouts is not an acceptable outcome.

**Validation:** evidence review for repeatability and complete environment metadata; no application change in this task.

### T3 — P0: implement one explicit ready-or-fallback startup transaction

**Dependency:** T2 has selected and documented the deadline.

**Outcome:** The current journey startup has one page-level owner and exactly one terminal outcome: activation or the existing accessible static fallback. Reuse the current rejection cleanup and `showSceneNote()` handoff rather than introducing a new UI or lifecycle framework.

**Required ownership contract:**

- Apply the selected named deadline to the whole startup transaction.
- Propagate cancellation to operations that support it, including bake fetches and portrait loading cleanup.
- For non-abortable work such as module import or compilation, use a terminal/generation guard at every post-await mutation boundary. A timer race without late-settlement guards is insufficient.
- On fallback, stop intro input capture, clear preparing/departure ownership, restore free input, and show the existing role/status static-link handoff exactly once.
- Optional hidden warm draws must not determine visitor terminality. Because a synchronous draw cannot be preempted by an asynchronous timer, remove it from the readiness-critical path or place it behind a demonstrably bounded/preemptible boundary. Preserve it only as best-effort optimization supported by measurement.
- Do not add same-document retry, generalized teardown, or a new state framework.

**Preserved behavior:** healthy-path visuals, route/focus behavior, animator/frame order, content, reduced-motion static door, capture/static-deploy behavior, and the existing bounded GPU fence.

**Acceptance:**

- Each of the six controlled holds reaches visible accessible fallback by the selected deadline; the status and static journey link are present and usable, input policy is free, and preparing/departure capture is cleared.
- Releasing any held operation after fallback cannot activate the journey or mutate readiness, journey globals, rail DOM, body lifecycle classes, input ownership, or the already-published terminal result.
- Healthy startup still activates exactly once and produces no fallback.
- Synthetic rejection still uses the same fallback and cleanup behavior.
- Deadline, rejection, and success settle exactly once under deterministic fake-clock/signal tests.
- The existing fence remains bounded by its present phase contract; no duplicate timeout layer is added to it.

**Validation:** focused deterministic startup transaction tests; existing motion/entry/static-content tests; syntax/lint for changed files; then the exclusive browser matrix in T4.

### T4 — P1: remeasure and adjudicate after the fixes

**Dependency:** T1–T3 complete.

**Outcome:** Replace the contaminated runtime conclusions with evidence that distinguishes preserved healthy behavior, controlled dependency failure, and environmental starvation. Update the backlog from observed results rather than inference.

**Acceptance and validation:**

- Obtain two consecutive clean full-smoke runs under the exclusive quiet-host lease, with confirmed quiescence after every scenario and no owned processes remaining afterward.
- Confirm healthy live startup activates, reduced-motion/static-door and no-intro behavior remain unchanged, and each six-operation hold reaches the T3 fallback without late activation.
- Run the existing fence case and a deliberately stressed-host diagnostic last. Under pressure the page may fall back, but it must still reach one terminal state and report the phase.
- Record server responsiveness, renderer, host/GPU conditions, phase timings, and terminal result for every failure.
- Do not approve a renderer/performance change without a comparable trace that attributes the cost to a product-controlled operation.
- Keep context-loss and broader render lifecycle adjudication separate unless new evidence directly couples it to the startup transaction.

## Safe browser lease order

Browser-backed work must be serial and exclusive; a unique port and temporary profile belong to one test owner, and closure is verified before handoff.

1. Run T1's synthetic/offline checks without a browser.
2. Acquire an exclusive quiet-host lease and prove one real timeout cleans up completely.
3. Run static/no-JavaScript checks first, then reduced-motion/no-intro checks.
4. Run healthy live cold-start calibration serially.
5. Run the six controlled startup holds one at a time, verifying quiescence between cases.
6. Run the existing GPU-fence control.
7. Run deliberate resource-starvation diagnostics last, after saving the quiet baseline.
8. Run capture only if a visual source change actually requires it; it must never overlap startup measurement. Reconfirm no owned process/profile/port remains before releasing the lease.

This ordering is mandatory for evidence quality: T1 precedes all startup measurements, and clean healthy evidence precedes resource-heavy fault injection.

## Evidence required for the next plan revision or freeze decision

- T1's deterministic cancellation and real-browser quiescence proof.
- The T2 cold-start distribution, phase marks, environment metadata, and documented deadline rationale.
- T3's deterministic exactly-once and late-settlement tests.
- Browser evidence for all six held dependencies reaching fallback and remaining terminal after release.
- Preserved healthy live, reduced-motion, no-intro, static/no-JavaScript, route, content, and accessibility behavior.
- Two consecutive clean full-smoke runs with no scenario-owned orphan processes.
- Server/host/renderer metadata sufficient to separate server failure, host contention, and product-controlled work.
- Relevant syntax, lint, focused tests, deterministic artifact checks, and a diff audit preserving `e250e4a` outside the accepted scope.
- Completion or explicit scheduling of the broader Wave 3 fault, context-loss, input, responsive, delivery, and profiling probes. The supplement alone is not evidence that those remaining surfaces are safe to freeze.

The plan may move from forming to revision-ready when T1 and T2 produce trustworthy ownership and timing evidence. A freeze verdict requires T3/T4 validation plus disposition of the remaining planned Wave 3 probes.

## North Star and anti-pattern disposition

The accepted work directly improves dependable control flow: the gate becomes trustworthy, startup gets an explicit narrow owner, expensive work no longer has unlimited authority over visitor terminality, and failure reuses an accessible static-deploy-safe handoff. It preserves the distinctive visual path on healthy startup and makes late work observable and harmless rather than relocating coupling.

Explicitly reject:

- raising smoke or navigation timeouts until the run passes;
- a bare `Promise.race` presented as cancellation;
- blaming host pressure as the product root cause or using it to excuse nonterminal UI;
- claiming performance improvement without comparable quiet-host measurement;
- a reduced-motion-specific workaround for a renderer/startup failure;
- putting optional warmup on the availability-critical path;
- a generalized lifecycle/state framework, same-document retry, or broad renderer rewrite;
- changing visuals, captures, static artifacts, accessibility, or route semantics to make the test easier;
- authorized skip, swallowed cleanup failure, or ambiguous timeout output used to create a green gate.

No supplemental item is `[XHARD]`. Normal bounded implementation remains with Luna; Oracle escalation is for reviewing evidence or a newly proven exceptional architectural boundary, not for ordinary execution.
