# North Star

The Banodoco website should remain visually distinctive and technically adventurous while being dependable, understandable, and safe to evolve. A contributor should be able to trace state and control flow, change one concern without surprising distant breakage, and rely on fast, meaningful checks that catch real regressions.

Enduring principles:

- Correctness and graceful failure come before cleanup aesthetics.
- Expensive rendering, animation, input, and responsive work must be bounded, observable, and lifecycle-safe.
- State and ownership should be explicit; cross-module contracts should be narrow and coherent.
- Prefer the simplest design that serves current behavior, reusing existing mechanisms and removing accidental complexity.
- Preserve the intended visual experience, content, accessibility, static-deploy model, and deterministic derived-artifact contracts.
- Improvements must be evidence-led and verified at the scope they claim to improve.

Avoid hollow success: score-chasing, cosmetic churn, speculative abstractions, broad rewrites without demonstrated value, tests that miss the changed behavior, performance claims without measurement, hidden behavior changes, or cleanup that merely relocates coupling.
