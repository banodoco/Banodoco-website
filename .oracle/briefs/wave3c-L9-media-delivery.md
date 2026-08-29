# Wave3C L9 — Packaged media and HTTP delivery

You are GPT-5.6 Luna. Run after L1–L6, sequentially, against immutable base `1fa145fc51e89c8a1788db39aff98e775a576073` in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`. Read S4, Wave3A packaged-HTTP output, and earlier reports. Use a disposable package/temp directory and unique port; preserve repository source. No source mutation, implementation, installs, redesign/framework migration, baseline refresh, product-policy invention, push/merge/deploy, or claims beyond observed local/deployed evidence. GPT-5.6 Luna performs the probe, reports stdout; Sol owns synthesis/judgment.

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

Frozen contract: multi-wave risk-first Megado audit; no source mutation, product-policy invention, push/merge/deploy, redesign/framework migration, baseline refresh, or implementation; bounded exploration and normal work are Luna; Sol owns system synthesis and judgment; preserve visual/accessibility/static/deterministic contracts. L1–L6 and browser/WebGL/capture/performance work are sequential under one exclusive lease; L7–L10 follow sequentially. Use unique ports/temp files and preserve source. HTTP-only tests may use separate unique ports; browser media seek still takes the exclusive lease.

## Mechanical probe

Package via `tools/package-public.py` into temp space and exercise `serve.py` with GET/HEAD, closed/open/suffix/unsatisfiable/multi-range requests. Then use Chromium video initial play, seek, and replay against packaged MP4; log request sequence, status, range, lengths, stalls, and completion. Probe `/`, subpaths, 404, revision query, and if authorized the deployed origin headers (`Content-Encoding`, `Vary`, cache, Range), clearly labeling local versus deployed. Cite `serve.py:18-52`, packaging/release manifests, and Wave3A’s verified suffix/multi-range defect. Do not infer Railway restart persistence locally.
