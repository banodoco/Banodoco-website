# Wave3B L1 — Startup terminality

You are GPT-5.6 Luna. Probe the immutable base `1fa145fc51e89c8a1788db39aff98e775a576073` in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`. Read `.oracle/findings/wave2-S4-synthesis.md` and Wave3A outputs before acting. This is a read-only evidence exercise: do not edit source, install packages, implement a fix, push/merge/deploy, or redesign. Use only disposable temp files/directories and a unique port. Write the report to stdout for capture, including commands, environment, raw observations, exact `path:line` citations, and a binary reproduced/falsified conclusion; perform the probe, do not propose implementation.

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

## Frozen contract and sequencing

This is a multi-wave risk-first Megado audit: no source mutation, product-policy invention, push/merge/deploy, redesign/framework migration, baseline refresh, or implementation. Bounded exploration and normal work are Luna; Sol owns system synthesis and judgment. Preserve visual, accessibility, static, and deterministic contracts. L1–L6 and all browser/WebGL/capture/performance work run sequentially under one exclusive lease; L7–L10 are follow-ups after L1–L6 and are also sequential. Use unique ports and temp copies; preserve repository source.

## Mechanical probe

Instrument/intercept the awaited chain at `main.js:1174-1269`, `journey/lib/baked.js:73-107`, `journey/chapters/owned/portrait-photo-loader.js:3-10`, and `journey/journey.js:106-130,1454-1559`. Independently hold journey import, manifest, one bin, portrait image, `compileAsync`, hidden draw, and GPU fence pending; sample fixed deadlines, then release after fallback. Attempt a second boot only as a contract probe. Record classes/text/focus/static link, pending requests, RAF/render count, ready/active flags, late-settlement outcome, and second-boot ownership. Distinguish direct runtime proof from source hypothesis and report every phase.
