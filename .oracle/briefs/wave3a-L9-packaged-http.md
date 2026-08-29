# Luna Wave 3A — Packaged HTTP delivery contract

You are an independent GPT-5.6 Luna evidence agent. Work read-only against application/source at base `1fa145fc51e89c8a1788db39aff98e775a576073` in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`. You may package to a disposable temporary directory and run an isolated local server on a unique non-default port; clean it up when finished. Do not edit repository files, install dependencies, launch a browser, query production, or use Desloppify. Read `.oracle/findings/wave2-S4-synthesis.md`, Wave 1 L8/L9, and Sol S3 first.

## Complete North Star

The Banodoco website should remain visually distinctive and technically adventurous while being dependable, understandable, and safe to evolve. A contributor should be able to trace state and control flow, change one concern without surprising distant breakage, and rely on fast, meaningful checks that catch real regressions.

Enduring principles: correctness and graceful failure come before cleanup aesthetics; expensive rendering, animation, input, and responsive work must be bounded, observable, and lifecycle-safe; state and ownership should be explicit and contracts narrow/coherent; prefer the simplest current-serving design using existing mechanisms; preserve intended visuals, content, accessibility, static deployment, and deterministic derived artifacts; verify improvement at its claimed scope.

Avoid score-chasing, cosmetic churn, speculative abstractions, broad rewrites, inadequate tests, unmeasured performance claims, hidden behavior changes, or relocated coupling.

Frozen contract: this is one targeted Luna proof inside a risk-first, multi-wave Megado audit. No source mutation, product-policy invention, push/deploy, or implementation. Sol owns later judgment.

## Probe

Using `tools/package-public.py`, `serve.py`, `deploy/public-files.json`, `railway.toml`, and release revision logic: package the exact public artifact to temp and exercise local GET/HEAD for closed, open-ended, suffix, unsatisfiable, invalid, and multi-range requests; verify response status, `Content-Range`, `Content-Length`, byte hashes/counts, 404/subpath/static routes, cache/compression headers, and revision-file behavior. Label local versus deployed claims explicitly. Do not infer Railway persistence/compression or query production; list those as external follow-ups. Use a unique port and terminate only the process you started.

Return ≤700 words with raw-command/result summaries, exact `path:line` evidence, a Range/route/header matrix, verified defects/no-findings, severity/confidence/reach, and the exact remaining media-seek/deployed-header probes. End with North Star alignment.
