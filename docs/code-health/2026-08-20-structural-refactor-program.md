# Structural refactor program

## Objective

Reduce the website's highest-risk structural debt without changing its visual
composition, copy, URLs, interaction semantics, performance budgets, static
fallback, or deployment behavior. Every workstream is an implementation task,
not a speculative redesign.

## Rules shared by every workstream

- Work only inside the files explicitly named by the assigned workstream,
  except for a narrowly necessary new module beside those files.
- Preserve all public exports, DOM structure/classes, URL/query/hash behavior,
  timing constants, seeded output, WebGL output, reduced-motion behavior,
  keyboard/pointer behavior, and error fallbacks unless the brief explicitly
  changes a contract.
- Do not make opportunistic style or copy edits.
- Do not commit, push, deploy, reset, or discard work. Other agents share the
  working tree; preserve their changes.
- Prefer behavior-preserving extraction and dependency inversion over rewrites.
- Run the strongest relevant checks that do not mutate generated production
  assets. Record exact commands and results.
- If a requested refactor cannot be proved safe with the available harness,
  stop at the smallest safe improvement and report the remaining boundary.
- Return a concise handoff: files changed, contract preserved, checks run,
  residual risks, and any follow-up that is genuinely required.

## Functional invariants

1. `index.html` remains directly servable without a compilation step.
2. `main.js` remains the browser entry point and the existing import map keeps
   resolving Three.js locally.
3. The hero intro, chapter transitions, wrapping scroll, cards, ownership page,
   static fallback, capture flags, live-build flags, and QA globals keep working.
4. No generated geometry, screenshots, images, or videos are refreshed merely
   because source code was reorganized.
5. Existing failure handling must remain visitor-safe when WebGL, storage,
   dynamic imports, network requests, or media playback fail.

## WS-01 — Remove the card registry cycle

Scope: `journey/cards/index.js`, the six `journey/cards/*.js` builder modules,
and narrowly scoped new modules under `journey/cards/`.

Problem: the registry imports every builder while builders import `REDUCE` and
`CARD_ASSETS` from the registry. The source itself documents a TDZ crash caused
by this cycle.

Deliverables:

- Move shared runtime/configuration bindings into an acyclic leaf module.
- Keep `CARD_BUILDERS`, `CARD_ICONS`, warming behavior, asset URLs, reduced
  motion behavior, and every builder's default export compatible.
- Prove the card graph contains no cycle and all browser modules parse.

Acceptance: no builder imports `./index.js`; browser-visible behavior and asset
warming order are unchanged.

## WS-02 — Add developer tooling without adding a build requirement

Scope: new root tooling manifests/configuration and narrowly necessary ignore
files only. Do not edit application modules in this workstream.

Deliverables:

- Add a minimal package manifest with pinned development tooling for linting,
  formatting checks if justified, module-graph/cycle checks, and tests.
- Provide stable `lint`, `test`, and aggregate `check` scripts. The deployed
  website must remain compiler-free and continue serving source files directly.
- Configure generated, archived, vendored, and plan material deliberately so
  production lint results are meaningful rather than hidden accidentally.

Acceptance: a fresh dependency install is reproducible; commands have useful
exit codes; no production behavior or deployment artifact changes.

## WS-03 — Separate checking, building, and deployment side effects

Scope: `tools/preflight.sh`, new scripts under `tools/`, `BUILDING.md`, and
`DEPLOY.md` only.

Problem: one script checks, regenerates assets, stages every file, commits,
merges unrelated history, pushes `main`, and polls production.

Deliverables:

- Extract composable, independently runnable check/build/release phases.
- Ensure the default verification command never stages, commits, merges, pushes,
  deploys, or rewrites unrelated files.
- Keep an explicit release command capable of the current authorized deployment
  flow, with confirmations and clear failure modes.
- Remove blanket `git add -A` behavior or constrain staging to an explicit,
  reviewed file set.

Acceptance: existing documented release capability remains available, while a
read-only check path is obvious and side-effect-free.

## WS-04 — Establish behavioral browser coverage

Scope: test files/configuration and narrowly necessary test-only helpers. Avoid
application edits unless a stable, behavior-neutral test seam is indispensable.

Deliverables:

- Add deterministic browser smoke tests for initial boot/no uncaught errors,
  static fallback, chapter navigation, deep-link aliases, keyboard access,
  pointer/card open-close, reduced motion, and the content drift guard.
- Reuse existing server/capture conventions; do not replace visual goldens.
- Make skips explicit when WebGL is unavailable and distinguish an environment
  skip from an application pass.

Acceptance: tests run from one documented command, clean up processes, and fail
on observable regressions rather than implementation details.

## WS-05 — Make content genuinely canonical

Scope: `content/content.js`, `static/index.html`, content-generation tooling,
the relevant content documentation, and content-consistency tests.

Deliverables:

- Replace hand synchronization of duplicated content with deterministic
  generation or another one-way derivation from the canonical content model.
- Preserve the static page as real accessible HTML that works without JavaScript.
- Preserve existing markup semantics, links, symbols, and copy exactly.
- Add a check mode that fails on drift without rewriting files.

Acceptance: editing canonical content followed by generation updates the static
tier deterministically; verification reports a clean tree afterward.

## WS-06 — Introduce one journey structure schema

Scope: `journey/route.js`, `journey/constants.js`, `journey/symbols.js`, relevant
registries in `journey/journey.js` and `journey/ui.js`, plus one new schema module
and focused tests. Do not redesign chapter rendering.

Deliverables:

- Define chapter/node identity and metadata once, then derive compatible route,
  symbol, copy-position, hotspot, and alias registries where safe.
- Add validation for duplicate IDs, missing references, unsupported cardinality,
  and aliases pointing nowhere.
- Preserve all current exports and numeric route/camera behavior.

Acceptance: common rename/addition mistakes fail in validation instead of
silently drifting; no generated scene or screenshot changes.

## WS-07 — Separate public runtime files from repository-only material

Scope: hosting/deployment configuration, ignore/classification configuration,
and repository documentation. Moving files is allowed only when all references
and history-sensitive workflows are preserved.

Deliverables:

- Establish an explicit deploy allowlist or public-root boundary so `archive/`,
  planning documents, scanner state, caches, and internal tools are not served.
- Keep required local Three.js vendor assets public, but classify them as vendor
  for lint/scanning.
- Classify generated data such as `ownership/reasons.js` without pretending it
  is hand-maintained application logic.

Acceptance: every runtime URL used by the live and static tiers remains present;
repository-only material is absent from the deploy artifact; local development
still works.

## WS-08 — Decompose `journey/ui.js`

Scope: `journey/ui.js` and new modules under a dedicated `journey/ui/` directory.

Deliverables:

- Extract cohesive subsystems for DOM construction, hotspot/label policy,
  popover/card lifecycle, sheet drag/gesture handling, and copy/arrival motion.
- Keep `createUI` as a small facade with the exact existing external contract.
- Make ownership of timers, listeners, mutable state, and cleanup explicit.

Acceptance: substantial reduction in facade size and responsibility count;
browser behavior tests, syntax/lint, and relevant manual gates pass.

## WS-09 — Decompose `organism/organism.js`

Scope: `organism/organism.js` and new modules under `organism/`.

Deliverables:

- Separate renderer/postprocessing setup, deterministic random/geometry helpers,
  material/shader construction, performance/pixel-ratio policy, and animation
  lifecycle while keeping `createScene` compatible.
- Avoid allocation or execution-order changes inside frame-critical paths.
- Preserve seeds, draw ranges, shader text, uniforms, and generated geometry.

Acceptance: deterministic bake/check output remains byte-identical and visual
goldens do not change.

## WS-10 — Decompose Owned portrait rendering

Scope: `journey/chapters/owned/portraits.js` and new sibling modules within the
same directory.

Deliverables:

- Separate contributor dealing, atlas/canvas drawing, field geometry/materials,
  photo texture loading/swapping, and lifecycle coordination.
- Preserve the inseparable person/name/blurb/sprite assignment, random-per-load
  selection semantics, fixed sixteen-site composition, and capture-mode busts.
- Make texture ownership/disposal and async cancellation explicit.

Acceptance: live portraits, capture mode, hover/redeal, and teardown behave
identically; no golden or baked asset refresh is required.

## WS-11 — Decompose the journey orchestrator

Scope: `journey/journey.js` and new focused modules under `journey/`.

Deliverables:

- Extract navigation/routing, chapter registration, camera blending/wrap logic,
  frame application, and failure guarding into explicit collaborators.
- Keep `boot` and `prepareChapter` exports compatible.
- Preserve frame ordering, transition timing, hash behavior, QA globals, and
  chapter lifecycle call order.

Acceptance: the entry module becomes an understandable orchestrator; behavioral
tests and existing scroll/reveal/input gates pass without baseline changes.

## Final integrated gate

- Run syntax/lint, cycle checks, behavioral tests, existing rebuild check, and
  capture checks where the environment supports them.
- Inspect the final diff for contract drift and accidental generated assets.
- Re-run code-health scanning with correct zones and compare objective findings.
- Obtain an independent adversarial review of the integrated changes before the
  branch is considered ready.
