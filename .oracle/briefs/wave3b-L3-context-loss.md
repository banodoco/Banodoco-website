# Wave3B L3 — WebGL context-loss state machine

Act as GPT-5.6 Luna against immutable base `1fa145fc51e89c8a1788db39aff98e775a576073` in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`. Read S4 and Wave3A findings. This is read-only fault injection: use a disposable copy/temp files, a unique port, and no source edits, implementation, install, redesign, push/merge/deploy, or baseline refresh. Report only to stdout with environment, commands, exact `path:line` evidence, raw timeline, and binary conclusions. Mark proof versus hypothesis.

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

## Frozen contract and exclusive sequencing

Frozen contract: multi-wave risk-first Megado audit; no source mutation, product-policy invention, push/merge/deploy, redesign/framework migration, baseline refresh, or implementation; bounded exploration and normal work are Luna; Sol owns system synthesis and judgment; preserve visual/accessibility/static/deterministic contracts. L1–L6 and all browser/WebGL/capture/performance work are sequential under one exclusive lease; L7–L10 follow sequentially after them. Use unique ports/temp files and preserve source. Run after L1–L2.

## Mechanical probe

Use `WEBGL_lose_context` against `main.js:320-336` and `organism/animation.js:13-38`; exercise loss, long loss, loss/loss/restore, and restore. Examine TAA/history setup at `organism/organism.js:120-165`. Count renders before/during/after, timer coalescing, visible-state exclusivity, resource errors, and first 10 restored frames. Capture comparable fresh-load and restore images and pixel differences, without changing goldens. Report whether rendering pauses, restore recovers, and temporal history is invalidated; do not promote the smear hypothesis without visual evidence.
