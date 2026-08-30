# Wave 3B T3 source map — bounded startup terminality

## Transaction boundary

- `main.js:1173-1271` (`loadJourney`) owns startup but currently has no deadline, abort controller, generation, or exactly-once terminal state.
- `main.js:1120-1137` (`activateJourney`) must run only for the current, non-terminal generation.
- Reuse the fallback cleanup at `main.js:1255-1268`: stop intro capture, clear departure state, restore free input, mark intro live, and publish `showSceneNote()` exactly once.
- Guard asynchronous rail/rAF callbacks at `main.js:1205-1218` and `journey/rail.js:815-830` against stale generations.

## Potentially nonterminal work

- `nextTask()` rAF yields at `main.js:1180-1182` and `1224-1227`.
- Dynamic journey import at `main.js:25`, awaited at `1187`.
- Module-level baked `ready` at `main.js:21`, awaited at `1221`.
- Manifest/bin fetch, JSON/array-buffer decoding, and aggregate `Promise.all` at `journey/lib/baked.js:210-258`.
- Portrait `Image` loading at `journey/chapters/owned/portrait-photo-loader.js:4-10` and `photosReady` at `journey/journey.js:1499`.
- Non-abortable `renderer.compileAsync` at `journey/journey.js:1503`.
- Hidden warm renders at `journey/journey.js:1518-1556`; synchronous `gl.finish()` at `1481`; remix/texture preparation at `journey/chapters/owned/portraits.js:1984-1995`.
- `drainGpu` is already bounded to eight seconds at `journey/journey.js:1463-1475`; retain that contract rather than adding a second fence timeout.

## Implementation shape

1. Add a page-level startup transaction with `{ generation, AbortController, terminal }` and one deadline spanning the first yield through `state.ready`.
2. Use exactly-once `finishReady` / `finishFallback` transitions. Timeout or rejection marks the generation terminal, invalidates it, aborts supported work, clears timers, and invokes the existing fallback path.
3. Check `isCurrent(generation)` after every await and before every mutation: rail state, body classes, readiness publication, activation, opacity/reveal, and input policy.
4. Make baked loading transaction-invoked and abort-aware. Publish manifest/bin globals only for the current generation.
5. Thread `{ signal, isCurrent }` through chapter registry and Owned portrait construction. Abort image work cleanly and guard `photosReady.then()`.
6. Keep non-abortable import and compile work inert after terminal settlement through generation checks.
7. Remove optional hidden draws and remix upload from the readiness-critical path; schedule them best-effort after readiness with error and generation guards.

Late work must never activate the journey, publish readiness, mutate rail/body/input state, install baked data, change portrait mode, or cause a second terminal transition.

## Deterministic evidence

- Add a pure startup-transaction test with injectable deferred stages and timer/clock control.
- Prove success, rejection, and timeout settle exactly once; prove fallback appears by the selected deadline and abort fires.
- Resolve every deferred stage after fallback and prove no activation or later mutation occurs.
- Extend baked-manifest tests for abort propagation and no late installation.
- Add a fake-`Image` abort/load/error race test.
- Test GPU preparation through injected hooks: optional warm work is absent before readiness, while compile and the existing bounded fence remain critical phases.

This is source-only preparation. T3 implementation remains gated on T2 selecting a conservative quiet-host deadline.
