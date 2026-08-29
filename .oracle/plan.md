# Megado Plan

## Grounded baseline

The site is a compiler-free static ES-module application rooted in `main.js`, `journey/`, `organism/`, `ownership/`, canonical `content/`, generated `static/`, and vendored Three.js. Preserve `deploy/public-files.json`, visual/accessibility behavior, and deterministic geometry/capture contracts.

Risk is concentrated in large shared control centers (`journey/ui.js`, `journey/scroll.js`, `journey/rail.js`, `journey/journey.js`, `organism/organism.js`, and Owned portraits). Initial source evidence also flags an uncancellable recursive RAF, missing aggregate teardown, anonymous listeners without detach, module-global chapter preparation, import-time timer/fetch work, browser checks that can skip live WebGL assertions while green, an implicit capture-failure exception, and possibly incorrect HTTP suffix-range handling. These are candidates until independently reproduced. Historical code-health notes are leads only; Desloppify is excluded.

## Evidence rules

Every finding records observed behavior, exact source/runtime evidence, reach, severity, confidence, user impact, disposition, dependencies, acceptance criteria, and validation. Correctness requires source evidence plus reproduction or behavioral test; performance requires comparable measurement; refactoring requires a demonstrated ownership or contract failure. Do not touch archives, vendor, generated assets, or public content unless an accepted finding requires it.

## Exploration waves

### Wave 1 — broad Luna fan-out

Run independent bounded probes from the same base:

1. Architecture/control flow: entry-to-frame and input-to-route maps, globals, cycles, broad interfaces, ownership ambiguity.
2. UI/accessibility: DOM, ARIA, focus, disclosure/sheet/keyboard contracts and CSS/JS coupling.
3. State/lifecycle/async: mutable owners, listeners, timers, RAFs, fetches, promises, teardown, late settlement.
4. Animation/3D/resources: frame order, renderer/resource ownership, determinism, context loss, disposal.
5. Responsive/input: breakpoint and input state machines, resize order, touch/wheel/keyboard, rail/camera/layout authority.
6. Performance: CPU/GPU/frame/layout/network/memory work, boundedness, observability, instrumentable hypotheses.
7. Maintainability/coherence: duplicated policy/data, compatibility paths, overbroad facades, misleading contracts, accidental complexity; never size alone.
8. Tooling/build/test/deploy: false greens, missing roots/scenarios, mutating checks, generated drift, static deploy and Range behavior.
9. Recurring failure/security patterns: catches, globals, HTML injection, external I/O, cache-query imports, event installation, cancellation.
10. Content/ownership/static tier: canonical-data integrity, no-JS parity, ledger/render behavior, cardinality hazards, missing coverage.

Each Luna report is ranked, concise, evidence-cited, and recommends outcomes rather than architecture.

### Wave 2 — Sol whole-system passes

1. Architecture: boot → scene → journey → chapters → UI/rail, plus ownership/static tiers.
2. Lifecycle/state: reconcile all ownership maps across listeners, timers, RAF, async, resources, and globals.
3. Performance/failure: correlated GPU/DOM/network work, responsive invalidation, boot/fallback/context-loss behavior.
4. Cross-wave synthesis: adjudicate contradictions, challenge severity/abstractions, and identify evidence gaps.

### Wave 3+ — evidence-derived Luna follow-ups

- Reproduce/falsify every high-severity candidate.
- Characterize observable contracts before moving ownership.
- Examine a recurring pattern only after at least three verified sites share the failure.
- Run an adversarial gap wave against accepted severity and hidden behavior changes.
- Repeat Luna follow-ups and Sol synthesis until a complete wave yields no material new finding, every named area has evidence or an explicit no-finding disposition, and every accepted item has sufficient proof.

## Backlog synthesis and freeze

Deduplicate into one backlog ordered: P0 visitor-visible correctness/data/accessibility/false-green gates; P1 hidden failure/lifecycle/resource/non-local fragility; P2 measured performance/responsive/input risks; P3 simplicity/coherence. Every item carries disposition, scope, preserved behavior, dependencies, model class, criteria, validation, artifact impact, and North Star mapping. Reject unsupported performance claims, file-size-only splits, vague cleanup, duplicate abstractions, shape-only tests, score-driven work, and changes whose only support is speculation.

Sol revises until `STABLE`; then run a Luna settled-plan simplification wave against one immutable snapshot, incorporate accepted reductions, repeat as needed, and obtain one independent pre-execution contract review before freezing `.oracle/tasklist.md`.

## Provisional execution batches

1. Honest quality floor: reproducible dependencies; deterministic versus browser checks; explicit skips/failures; dependency/root coverage; non-mutating captures; ownership/static/public-artifact coverage.
2. Verified correctness/graceful failure: all accepted P0 items, including server/media semantics, boot/fallback, accessibility, state corruption, async races, and harness failures.
3. Canonical contracts/explicit state: narrow real chapter/navigation/schema contracts, remove unsafe module-global ownership, establish explicit semantic input/transition decisions.
4. Journey lifecycle/control flow: named owners and idempotent detach/dispose/recreate while preserving route, landing, reversal, direct-entry, focus, frame-order and handoff behavior.
5. Rendering/animation/resource lifecycle: bound RAF and acceleration; dispose resources where supported; cancel late settlement; preserve RNG, geometry, draw ranges, shader text, and captures.
6. Responsive/input/UI ownership: single owners for rail measurement and Connect placement; remove duplicated frame-time reads/private recovery; extract only demonstrated controllers.
7. Measured performance: optimize only reproduced bottlenecks and remeasure under the same environment.
8. Coherence/maintainability: remove competing sources/dead compatibility/accidental duplication; split only around proven coherent ownership.
9. Integrated closure: align docs with executable behavior; close every accepted item; full evidence matrix, validation, path audit, and final review.

Independent Luna tasks may run concurrently only inside an approved batch. Shared control-center writers serialize. Browser/WebGL/capture/performance use one exclusive lease with frozen served-source hashes and no concurrent writes. Every batch converges code, artifacts, receipts, evidence, status, and a local commit before one Sol-orchestrated independent gate. Later work consumes only passed checkpoints.

## Validation strategy

- Task: syntax, targeted ESLint, focused deterministic behavioral tests, `git diff --check`.
- Batch: lint, cycle/unresolved-local analysis, contract/static suites, public-artifact verification.
- Browser scenarios kept distinct: static JS/no-JS, interactive fallback, desktop, touch, reduced motion, deep links, keyboard/focus/disclosure, ownership, and context loss where supported.
- Scene: `tools/check.sh --skip-captures`, full leased capture lane when required, no baseline refresh without an intentional reviewed visual change.
- Performance: comparable browser/renderer/viewport/DPR/flags and recorded frame, long-task, layout, latency, resource, memory/draw and network metrics.
- Lifecycle: repeated create/prepare/activate/dispose/recreate plus late-success/failure under controlled clocks/RAF/fetch/loaders.
- Final commands and path/evidence audit remain those frozen in `agent_goal.md`.

## North Star gate

Every task must improve dependable behavior, traceability, bounded lifecycle, explicit ownership, or meaningful regression detection; preserve visual identity, accessibility, content, static deployment, and deterministic artifacts; use the simplest demonstrated existing mechanism; and verify the claimed benefit at the changed scope. Reject cosmetic churn, speculative layers, framework migration, broad rewrites, pass-through wrappers, masked drift, inadequate tests, unmeasured optimization, or relocated coupling.

## Effort and huge-run policy

Exploration/synthesis/freeze: 5–8 focused engineer-days. Accepted implementation/validation: 30–50. Total: 35–58 engineer-days, approximately 22–36 elapsed working days with two safe write lanes. This is unambiguously a huge run (`>2 weeks`). Cumulative gates are provisionally required after correctness (B2), lifecycle/resources (B5), measured behavior (B7), and final integration (B9), with cadence revised after backlog freeze.

No implementation item is yet proven `[XHARD]`. Transition/frame semantics and cross-tree renderer/resource ownership are candidates only if decomposition leaves an irreducible kernel satisfying the full exceptional threshold.
