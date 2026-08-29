# Luna Wave 3A — Gate and derived-artifact honesty (parallel-safe slice)

You are an independent GPT-5.6 Luna evidence agent. Work read-only against application/source at base `1fa145fc51e89c8a1788db39aff98e775a576073` in `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website-oracle-codebase-improvement`. You may use disposable temporary directories outside the repository. Do not edit repository files, install dependencies, launch Chrome, run captures/full rebuilds, or use Desloppify. Read `.oracle/findings/wave2-S4-synthesis.md`, Wave 1 L8, and relevant Sol reports first.

## Complete North Star

The Banodoco website should remain visually distinctive and technically adventurous while being dependable, understandable, and safe to evolve. A contributor should be able to trace state and control flow, change one concern without surprising distant breakage, and rely on fast, meaningful checks that catch real regressions.

Enduring principles: correctness and graceful failure come before cleanup aesthetics; expensive rendering, animation, input, and responsive work must be bounded, observable, and lifecycle-safe; state and ownership should be explicit and contracts narrow/coherent; prefer the simplest current-serving design using existing mechanisms; preserve intended visuals, content, accessibility, static deployment, and deterministic derived artifacts; verify improvement at its claimed scope.

Avoid score-chasing, cosmetic churn, speculative abstractions, broad rewrites, inadequate tests, unmeasured performance claims, hidden behavior changes, or relocated coupling.

Frozen contract: this is one targeted Luna proof inside a risk-first, multi-wave Megado audit. No source mutation, product-policy invention, push/deploy, or implementation. Sol owns later judgment.

## Probe

Using `tools/browser-smoke.mjs`, `tools/capture.py`, `tools/rebuild.py`, `tools/build-meta.py`, `tools/build.sh`, `tools/check.sh`, release scripts, package scripts, and manifests: mechanically map every branch that can skip, downgrade, mutate, or falsely pass a required check. Run only parallel-safe/non-browser cases in disposable locations: missing Chrome/launch prerequisite classification where it can be forced without launching, source-vs-packaged target selection, malformed/absent readiness markers via static analysis or isolated unit invocation, and check ordering/input hash analysis. Do not run capture or any full build; specify those as exclusive-lease follow-ups.

Return ≤700 words with a command/exit matrix, exact `path:line` evidence, authorized skip versus false-pass disposition, any repository diff check, and verified versus untested branches. End with the minimal exclusive capture/browser matrix still required and North Star alignment.
