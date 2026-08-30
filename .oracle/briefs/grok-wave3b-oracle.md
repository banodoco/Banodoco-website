# Grok 4.6 Oracle — Wave 3B timeout/fallback judgment

You are the user-selected Oracle for the Banodoco website Megado run. Work read-only in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement` at HEAD `1b24936`. Do not edit files, launch browsers, install, commit, push, merge, deploy, or delegate. Read `.oracle/agent_goal.md`, `.oracle/plan.md`, `.oracle/findings/prioritized-backlog-v0.md`, `.oracle/findings/wave3b/wave3b-L1-startup.txt`, and the three `wave3b-L2*.md` findings, plus source as needed.

## Complete North Star

The Banodoco website should remain visually distinctive and technically adventurous while being dependable, understandable, and safe to evolve. A contributor should be able to trace state and control flow, change one concern without surprising distant breakage, and rely on fast, meaningful checks that catch real regressions.

Enduring principles:

- Correctness and graceful failure come before cleanup aesthetics.
- Expensive rendering, animation, input, and responsive work must be bounded, observable, and lifecycle-safe.
- State and ownership should be explicit; cross-module contracts should be narrow and coherent.
- Prefer the simplest design that serves current behavior, reusing existing mechanisms and removing accidental complexity.
- Preserve the intended visual experience, content, accessibility, static-deploy model, and deterministic derived-artifact contracts.
- Improvements must be evidence-led and verified at the scope they claim to improve.

Avoid hollow success: score-chasing, cosmetic churn, speculative abstractions, broad rewrites without demonstrated value, tests that miss the changed behavior, performance claims without measurement, hidden behavior changes, or cleanup that merely relocates coupling.

## Frozen contract

The run uses Luna for bounded exploration and normal implementation. Grok 4.6 owns `[XHARD]` and Oracle judgment/review. Prior checkpoint `e250e4a` passed and must be preserved. No push/merge/deploy authority. The goal is a risk-first backlog and end-to-end implementation, correctness/hidden failure/coupling/performance before simplicity.

## Oracle questions

1. Judge what the evidence proves, falsifies, and leaves undetermined for (a) browser-smoke lifecycle/cancellation, (b) reduced-motion behavior, (c) product startup terminality, and (d) GPU/resource starvation.
2. Decide which issues enter the accepted backlog now and at what priority. Do not promote an environmental trigger into a product root cause, but do not excuse a missing graceful terminal state merely because starvation is external.
3. Produce the smallest supplemental tasklist with dependencies, exact outcomes/scopes, preserved behavior, acceptance criteria, and validation. Classify every task `normal` or `[XHARD]`; enforce the exceptional threshold and explain any `[XHARD]` evidence. Select Luna for normal and Grok only for proven `[XHARD]`.
4. Decide safe synchronization: whether harness lifecycle must be fixed before measuring startup, and which browser/GPU tests require an exclusive quiet-host lease.
5. State whether the plan remains forming and the exact evidence required for the next freeze/revision.
6. Give an explicit North Star alignment/anti-pattern disposition.

Return a concise binary Oracle verdict plus an implementation-ready supplemental tasklist. Do not write code.
