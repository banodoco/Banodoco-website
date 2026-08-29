# Wave3B L2 — Failure transaction

You are GPT-5.6 Luna, producing a stdout evidence report against base `1fa145fc51e89c8a1788db39aff98e775a576073` in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`. Read S4 synthesis and Wave3A outputs. Run read-only fault injection in disposable temp assets/copies with a unique port; never edit application/source, install dependencies, implement, redesign, push/merge/deploy, or refresh baselines. Cite exact `path:line`; separate verified observations from source-supported hypotheses and give a binary result per injection. Preserve source.

## North Star

The Banodoco website should remain visually distinctive and technically adventurous while being dependable, understandable, and safe to evolve. A contributor should be able to trace state and control flow, change one concern without surprising distant breakage, and rely on fast, meaningful checks that catch real regressions.
Enduring principles:
- Correctness and graceful failure come before cleanup aesthetics.
- Expensive rendering, animation, input, and responsive work must be bounded, observable, and lifecycle-safe.
- State and ownership should be explicit; cross-module contracts should be narrow and coherent.
- Prefer the simplest design that serves current behavior, reusing existing mechanisms and removing accidental complexity.
- Preserve the intended visual experience, content, accessibility, static-deploy model, and deterministic derived-artifact contracts.
- Improvements must be evidence-led and verified at the scope they claim to improve.
Avoid hollow success: score-chasing, cosmetic churn, speculative abstractions, broad rewrites without demonstrated value, tests that miss the changed behavior, performance claims without measurement, hidden behavior changes, or cleanup that merely relocates coupling.

## Frozen contract and lease

Frozen contract: multi-wave risk-first Megado audit; no source mutation, product-policy invention, push/merge/deploy, redesign/framework migration, baseline refresh, or implementation; bounded exploration and normal work are Luna; Sol owns system synthesis and judgment; preserve visual/accessibility/static/deterministic contracts. L1–L6 plus browser/WebGL/capture/performance work are sequential under one exclusive lease; L7–L10 follow L1–L6 sequentially. Use unique ports/temp files and preserve repository source. Run after L1 so fallback vocabulary is established.

## Mechanical probe

Inject one controlled fault at each boundary: callout lookup, animator, `beforeRender`, composer render, UI, director, and chapter drive, using `main.js:320-336,1256-1269`, `organism/animation.js:13-38`, and `journey/failure-guard.js:1-11`. Observe one frame and 5 seconds later. Capture thrown/logged errors, active RAF, render count, visible/keyboard state, static handoff, remaining input, `__pageErrors`, and repeated-error count. State whether each fault locally degrades, permanently silences, or leaves an untrustworthy interactive tier. Do not infer a visitor outcome without observing it.
