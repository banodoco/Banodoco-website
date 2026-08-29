# Prioritized Improvement Backlog v0 — Evidence Checkpoint

This is the risk-first checkpoint after Luna Waves 1/3A/3B-L1 and Sol Wave 2. It remains provisional until the remaining targeted probes and adversarial gap wave complete.

## Completed in reviewed Sol burst

1. **P0 — Validation could report false green or mutate capture state.** Fixed missing/unlaunchable browser and WebGL semantics, capture readiness, temporary check output, and full-build ordering. Evidence: Wave3A L8 attempt 2; focused gate tests; Sol review.
2. **P0 — Static no-JS chapter deep links landed on Mission/top.** Fixed generated native targets and no-JS scroll behavior while preserving enhanced aliases/routes. Evidence: Wave1 L2/L10, Sol S3, focused Chromium and static-content tests.
3. **P0 — Packaged server implemented suffix/multi/416 Range semantics incorrectly.** Fixed single-range parsing, suffixes, HEAD parity, multi-range rejection, and `Content-Range` on 416. Evidence: Wave3A L9 and `test-serve-range.mjs`.
4. **P0 — Intro acceleration corrupted the realm-wide monotonic clock.** Replaced with an intro-local time transform preserving ramp/order. Evidence: Sol S1/S2; `test-intro-clock.mjs`; independent Sol review.
5. **P1 — Malformed baked manifests failed late/obscurely.** Added early path-specific schema/layout validation while preserving partial-manifest and per-chapter live fallback. Evidence: Sol S4 risk 8; `test-baked-manifest.mjs`; independent Sol repair/review.
6. **P2 — Initial DPR2 TAA targets allocated four times intended pixels until resize.** Normalized initial composer sizing to the existing CSS-size contract. Evidence: Wave1 L6/Sol S3; `test-initial-render-target-size.mjs`; independent Sol review.

## Open — correctness and hidden failure first

1. **P0 reproduced:** six startup dependencies can remain pending indefinitely with no visible terminal state while rendering continues; GPU fence is already bounded. Next: define the smallest timeout/abort transaction and characterize real failure/late-settlement paths.
2. **P0/P1 unverified:** renderer/composer/UI/director/chapter fault outcomes. Wave3B L2 was interrupted before evidence and must be rerun in smaller bounded probes.
3. **P1 source/runtime candidate:** real WebGL loss/restore does not clearly quiesce rendering or invalidate temporal history. Requires exclusive context-loss probe before implementation.
4. **P1/P2 candidates:** scrim/multi-touch ownership, same-mode responsive invalidation, and square layout policy conflicts. Require targeted event/viewport matrices.
5. **P1/P2 delivery/gate follow-ups:** packaged-browser smoke, capture timeout/wrong-frame/full-build capture ordering, media seek, and deployed header behavior.
6. **P2 performance:** correlated cold-start and steady-frame profiling under a quiet machine; no additional optimization before attribution.

## Open — simplicity and coherence second

1. Reconcile global scene/camera/animator-order contracts only where the remaining probes demonstrate a local-change failure.
2. Remove stale content/tooling documentation and semantic authority ambiguity after product intent is source-resolved.
3. Consider UI/controller or lifecycle extraction only around verified owners; reject file-size-only decomposition and generalized lifecycle frameworks.

No open implementation item is currently classified `[XHARD]`; Sol remains the judgment owner and decomposition is still expected to keep implementation mechanical.
