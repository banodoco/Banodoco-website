# Supplemental Tasklist — Wave 3B Oracle

Oracle verdict: **REVISE — NOT FREEZE-READY**. Grok was preferred but unavailable (HTTP 402); the user explicitly authorized GPT-5.6 Sol fallback.

All tasks are `normal` GPT-5.6 Luna work. None meets the exceptional `[XHARD]` threshold because the proven defects, ownership boundaries, acceptance criteria, and validation are localized after decomposition.

## T1 — P0 browser-smoke cancellation and quiescence

- Dependency: none; must pass before using the harness for further startup evidence.
- Outcome: scenario deadlines own page/context/browser cancellation and confirmed cleanup; active phase is reported; no later scenario starts after unconfirmed closure.
- Scope: existing browser-smoke scenario runner/cleanup plus focused lifecycle test.
- Acceptance: synthetic never-settling case cannot mutate/log later; next case waits for confirmed closure; repeated timeout returns owned process/profile/port to baseline; missing-browser and explicit skip semantics remain correct.
- Validation: deterministic lifecycle test, syntax/lint, existing gate test, then one exclusive-browser timeout/cleanup proof.

## T2 — P0 prerequisite quiet-host baseline and deadline policy

- Dependency: T1 cleanup proof.
- Outcome: at least five comparable cold healthy samples for live and reduced-motion/no-intro paths plus six controlled holds and bounded-fence control.
- Evidence: source SHA, renderer, host load, server latency, phase transitions, RAF progress, and terminal state.
- Acceptance: name a conservative page-level deadline with margin, or explicitly report quiet-host evidence unavailable. Never manufacture a threshold.

## T3 — P0 ready-or-fallback startup transaction

- Dependency: T2 selects/document deadline.
- Outcome: exactly one terminal state—interactive activation or existing visible accessible static fallback.
- Requirements: whole-transaction deadline; abort supported fetch/image work; terminal/generation guards after non-abortable awaits; late settlement cannot mutate; optional hidden warm draws leave the availability-critical path; reuse existing fallback/cleanup; no retry/general lifecycle framework.
- Acceptance: each six-operation hold reaches fallback by deadline, remains terminal after release, healthy startup activates once, rejection uses same path, deterministic exactly-once tests pass, bounded GPU fence remains unchanged.

## T4 — P1 remeasure and adjudicate

- Dependency: T1–T3.
- Acceptance: two consecutive clean full-smoke runs under exclusive quiet-host lease; healthy/reduced/static behavior preserved; six holds fall back without late activation; stressed-host diagnostic last; environment/phase evidence separates server, host, and product effects.

Broader Wave 3 fault, context-loss, input, responsive, delivery, and profiling probes remain separate and required before plan freeze.
