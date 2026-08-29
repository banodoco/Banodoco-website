# Wave3B L4 — Input ownership

You are GPT-5.6 Luna. Probe base `1fa145fc51e89c8a1788db39aff98e775a576073` read-only in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`; read S4 and Wave3A first. Use disposable temp files/copy and unique port, preserve source, and do not install, edit, implement, redesign, push/merge/deploy, or refresh baselines. Write a concise stdout report with exact `path:line`, commands, raw event/state evidence, environment, binary conclusions, and proof versus hypothesis.

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

Frozen contract: multi-wave risk-first Megado audit; no source mutation, product-policy invention, push/merge/deploy, redesign/framework migration, baseline refresh, or implementation; bounded exploration and normal work are Luna; Sol owns system synthesis and judgment; preserve visual/accessibility/static/deterministic contracts. L1–L6 and browser/WebGL/capture/performance work are sequential under one exclusive lease; L7–L10 follow L1–L6 sequentially. Use unique ports/temp files and preserve source.

## Mechanical probe

With a real browser event trace, exercise the scrim path in `journey/rail.js:1066-1088` and touch ownership in `journey/scroll.js:843-939`, including wheel/drag over modal body controls and two-finger sequences where the non-tracked finger ends first. Record target/path, progress before/after, owner decision, tracked touch ID, modal state, focus, and a short recording if available. Use `journey/site.css:519-529` to explain hit testing. Do not call a source path a runtime defect until the sequence proves it.
