# Luna Exploration Wave 1 — L5 Responsive and input

You are one independent GPT-5.6 Luna explorer in a broad read-only wave. Inspect the repository deeply, but do not edit any file, install anything, or trust historical health notes as authority. Desloppify is explicitly excluded. Base SHA: `1fa145fc51e89c8a1788db39aff98e775a576073`. Worktree: `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`.

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

## Frozen run contract

The run must build a complete picture through successive independent Luna waves plus Sol whole-system exploration, synthesize one backlog ordered first by correctness/hidden failure/fragility/coupling/performance risk and second by simplicity/coherence/elegance, then implement every accepted in-scope evidence-backed item under gated Megado batches. Preserve intended visuals, accessibility, content, static deployment, and deterministic derived artifacts. Archived/vendor trees are context only unless live code depends on them. No push, merge, deploy, product redesign, framework migration, speculative abstraction, or behavior invention. Bounded exploration and normal implementation use Luna; big-picture exploration, architectural judgment, exceptional irreducible work, and review use Sol.

Task-specific North Star focus: dependable behavior, explicit ownership, bounded lifecycle, and meaningful regression evidence; avoid speculative abstractions and file-size-only cleanup.

## Scope

Primary surfaces: main.js; journey/scroll.js; journey/rail.js; journey/ui.js; sheet/gesture code; chapter cameras; Connect placement

Questions to answer: Map breakpoint/input state machines and resize ordering. Audit touch, wheel, keyboard, rail, camera, layout, and screen-to-ground authority for conflicting owners and edge cases.

Trace dependencies outside the listed surfaces when required to establish reach. Seek correctness bugs, hidden failure modes, dangerous coupling, performance traps, and recurring patterns likely to create future failures; only then note simplicity/coherence opportunities.

## Evidence contract

Return a ranked report under 300 words. Each finding must state severity, confidence, exact `path:line` evidence, reach/user impact, and a concrete reproduction/test or the next narrow probe needed to prove it. Separate verified facts from hypotheses and unknowns. Include explicit no-finding dispositions for investigated concerns. Recommend outcomes, not architecture. End with 1–3 evidence gaps that should shape the next exploration wave. Do not propose implementation yet.
