# Elegance execution runbook

## Status and authority

This runbook makes the
[elegance program](./2026-08-20-elegance-program.md) dispatch-ready. The program
defines the architecture and invariants; this document defines work-order size,
test ownership, review cadence, concurrency, and durable state.

The primary agent is the decision-maker. GPT-5.6 Luna agents provide bounded
implementation and independent evidence. They do not choose architecture,
reinterpret visual behavior, resolve ownership of concurrent edits, waive a
test, change a public contract, or decide that a browser failure is acceptable.

Execution is authorized only when the user explicitly asks to start. Creating
this runbook does not authorize staging, committing, pushing, deploying,
resetting, restoring, stashing, cleaning, regenerating assets, or refreshing
goldens.

## Is the program execution-ready?

Yes, with this runbook. The architectural plan alone was not sufficient because
several E-items contained multiple agent-sized changes and did not assign full
suite or review ownership. The work-order catalogue below removes that
ambiguity.

Exact allowlists are intentionally frozen immediately before dispatch rather
than hard-coded permanently: this is a dirty shared worktree and the user may
make intentional edits between packages. Each catalogue row gives the maximum
candidate scope. The coordinator must narrow it to exact paths and allowed new
files using the live ownership ledger; an implementer cannot expand it.

## Roles

### Coordinator — primary agent

The coordinator:

- owns architecture, ordering, scope, and final acceptance;
- maintains the ledger and path reservations;
- writes every implementer and reviewer brief;
- freezes exact allowlists and protected paths immediately before dispatch;
- classifies user, pre-existing, agent, and concurrent external changes;
- decides whether a proposed extraction is a real ownership seam;
- assigns the single browser lane;
- runs or delegates wave gates and interprets failures;
- accepts, reworks, or stops a package.

### Implementer — GPT-5.6 Luna

One implementer owns one work order. It may edit only the frozen allowlist and
allowed new files, runs only the assigned focused checks, and returns a compact
handoff. It never runs the full suite unless its brief explicitly assigns a
wave gate.

### Reviewer — different GPT-5.6 Luna

The reviewer is read-only. It checks the brief, changed hunks, contract,
ownership, and focused evidence. It classifies findings as blocker, follow-up,
or acceptable residual. It does not edit or silently redesign.

### Gate owner

The gate owner runs aggregate checks after a coherent batch. The browser gate
owner also owns the server, browser process, temporary profile, and cleanup for
that lease. Implementers do not launch competing browser runs.

## Durable execution state

Create `docs/code-health/elegance-execution-ledger.md` only when execution
starts. Keep one row per work order and a detail block for every attempt.

Required row fields:

| Field | Meaning |
| --- | --- |
| ID | Stable work-order ID from this runbook |
| State | `planned`, `reserved`, `working`, `focused-pass`, `review`, `accepted`, `wave-gated`, `blocked` |
| Parents | Accepted prerequisite IDs |
| Owner | Luna task/session and attempt number |
| Reservation | Exact paths, lease timestamp, and expiry |
| Baseline | Base commit plus per-path status, existence, hash, and known owner |
| Protected | User visual/behavior files or hunks that must not change |
| Changes | Changed paths, hunk summary, post-hashes, generated/golden flag |
| Checks | Exact command, exit code, environment, and result classification |
| Review | R0/R1/R2/RX class, reviewer/session, verdict, findings, repair result, downstream holds |
| Residual | Known risk that remains for the wave gate |
| Next | Newly unblocked work orders |

Hashes are evidence, not ownership. If a dirty path changes concurrently, the
coordinator compares hunks and timestamps, classifies it, and re-baselines or
stops. Nobody restores it to an earlier hash.

X00 also creates an external per-run patch journal in a private directory
outside the repository and records that absolute path in the ledger. For every
package it stores:

- an existence/status/SHA-256 manifest and exact byte copy of each allowlisted
  path before the first write;
- a rolling post-write manifest after each accepted patch;
- exact copies of allowed new files, with their prior state recorded as absent;
- the agent-owned before/after diff and changed-hunk coordinates;
- the final accepted byte manifest and reviewer verdict.

Before the first write, the implementer asserts that current bytes match the
reserved baseline. Before each later patch, it asserts that current bytes match
its own last recorded post-write manifest. A mismatch stops the order before
writing. The coordinator communicates the reservation before dispatch; silence
or a local hash file is not a reservation.

Rollback is coordinator-only. It may inverse only journalled agent-owned hunks
after verifying their current context. It never restores a whole file, applies
an old full-file copy, or overwrites a pre-existing or concurrent hunk.

## Work-order state machine

```text
planned
  -> reserved                 coordinator freezes paths and baseline
  -> working                  one implementer, one attempt
  -> focused-pass             assigned micro-tests pass
  -> review                   independent review where required
  -> accepted                 coordinator accepts code and evidence
  -> wave-gated               aggregate gate has covered it

Any state -> blocked          ownership conflict, architecture ambiguity,
                              unexplained path, contract drift, or real failure
```

An accepted package is not release-verified until its wave gate passes. A wave
gate does not excuse a missing package review.

## Risk classes and test ownership

### T0 — documentation or coordinator metadata

Examples: ledger, path corrections, explanatory documentation.

Implementer runs:

- `git diff --check -- <allowlist>`;
- for each allowed untracked text file,
  `git diff --no-index --check -- /dev/null <path>`;
- direct link/path validation when relevant.

Review: coordinator diff review. Use an independent reviewer only when the text
defines deployment, security, public behavior, or architecture.

### T1 — pure data, schema, or deterministic contract

Examples: manifest validation, aliases, route fixtures, symbols, static content.

Implementer runs:

- `node --check <changed-js-files>`;
- `npx eslint --max-warnings=0 <changed-js-files>`;
- only the directly affected unit/static test.

Review: independent review for public contracts; otherwise one reviewer may
cover a batch of at most three related T1 orders.

### T2 — orchestration, UI, lifecycle, async, or tooling semantics

Examples: registry instances, transitions, UI state, cancellation, disposal,
browser harness, check scripts.

Implementer runs:

- syntax and targeted warning-free lint;
- the relevant unit and contract tests with fake clocks/RAF/DOM/resources;
- no full browser suite.

Review: independent review for every order, followed by coordinator acceptance.

### T3 — frame-critical, rendering, visual, geometry, shader, RNG, or performance

Examples: organism construction, chapter renderers, camera/frame ordering.

Implementer runs:

- syntax and targeted lint;
- focused contract tests;
- deterministic byte/schema checks assigned by the brief.

The browser/golden/performance gate owner runs expensive checks serially after
the package or renderer batch. Independent review is mandatory before those
checks.

### XHARD — root-designed, multi-proof work

XHARD is independent of T0–T3 risk. It marks an order where hidden state spans
multiple lifecycles, the public behavior is difficult to observe completely,
and a plausible local refactor can still create a subtle global regression.
Large files are not automatically XHARD.

An XHARD order is never handed to one Luna with "clean this up." Its protocol is:

1. Luna performs bounded reconnaissance or characterization and returns
   evidence only.
2. The coordinator writes the exact state model, interface, migration sequence,
   and forbidden choices.
3. The implementation brief covers one root-decided slice. Use GPT-5.6 Luna for
   mechanical slices; use GPT-5.6 Sol when the slice still requires frontier
   cross-state reasoning.
4. A different strong agent performs read-only review.
5. The coordinator personally inspects the contract diff and classifies every
   test/browser result before acceptance.
6. Same-family slices may advance after focused proof, R1 review, and
   coordinator acceptance. The relevant wave gate must pass before work outside
   that family/wave consumes the integrated result.

The XHARD orders in this program are:

- **C05** — the chapter core/capability boundary affects every chapter and all
  downstream UI/orchestration dependencies;
- **C06** — registry ownership must migrate `main.js` prebuild and journey boot
  atomically without losing deferred preparation or sharing instances;
- **J01** — hero, jump, wrap, reversal, cancellation, camera blend, and entry
  state are currently interleaved;
- **J02** — frame ordering is visually and numerically critical even when each
  individual stage looks correct;
- **J04a–J04e family** — disposal crosses state, scroll, UI/rail, dial/chapter
  hooks, registry/GPU preparation, async completion, facade generations, and
  compatibility globals; the XHARD decision is the ownership map, while each
  child implementation remains bounded;
- **R01** — intro acceleration replaces a global clock while owning a recursive
  RAF independent of the main animation lifecycle;
- **R03** — GPU resource teardown must preserve renderer/TAA behavior while
  proving ownership and idempotence;
- **R04** — portrait async settlement, contributor mutation, atlas/uniform
  rewiring, texture retirement, and GPU disposal span several lifecycles;
- **R07** — Final teardown cascades across a deep renderer tree and document
  listeners with inconsistent existing ownership;
- **U05** — projection/collision/layout changes can subtly alter the hero/sidebar
  and responsive interaction even with a green DOM unit test;
- **O02** — extracting world builders can change construction order, RNG draws,
  geometry bytes, and animator registration without obvious source-level errors;
- **B03** — responsive hero/sidebar/rail ownership is visually approved behavior
  in the most sensitive user-edited entry file;
- **B04** — boot-input buffering and intro-to-journey handoff cross page, scene,
  async preparation, and compatibility lifetimes.

H01–H06 are T3 but not automatically XHARD: byte/order/capture gates make each
single-renderer extraction bounded. Escalate one to XHARD only if its initial
reconnaissance finds cross-owner mutable state that the frozen lifecycle
contract does not contain.

## Test commands

### Commands available before Q01–Q03

Use these only where directly relevant:

```sh
node journey/structure.test.mjs
node tools/scroll-touch-gates.mjs
node tools/test-chapter-entry.mjs
node tools/test-static-content.mjs
npx eslint --max-warnings=0 <allowlisted-js-files>
node --check <changed-js-file>
python3 tools/rebuild.py --check
git diff --check -- <allowlist>
```

Do not give `npm test` or `npm run check` to ordinary implementers in the
current tree: both invoke the browser harness, so they are neither cheap nor a
clean unit-level signal.

### Commands Q01–Q03 must provide

```sh
npm run test:unit
npm run test:contracts
npm run test:static
npm run test:browser -- --scenario <stable-id>
npm run test:browser:required -- --scenario <stable-id>
npm run check
npm run check:browser
```

Required stable browser scenario IDs:

- `fallback-boot`;
- `no-js`;
- `webgl-fallback`;
- `static-navigation`;
- `static-alias`;
- `static-input`;
- `reduced-motion`;
- `live-journey`;
- `live-desktop`;
- `live-touch`;
- `live-reduced-motion`.

`test:browser` may report `SKIP(environment)` distinctly. The required variant
must fail on absence, launch failure, WebGL unavailability, timeout, harness
failure, or an application assertion. `npm run check` remains cheap and
non-browser; `check:browser` is a gate-owner command.

Q01 has meaningful interim providers from the first revision:

- `test:unit`: `journey/structure.test.mjs` and
  `tools/scroll-touch-gates.mjs`;
- `test:contracts`: `tools/test-chapter-entry.mjs`, extended by C01–C04 later;
- `test:static`: `tools/test-static-content.mjs` and other non-browser source or
  generated-content assertions.

No-JavaScript behavior stays in the `no-js` browser scenario; it must not be
misrepresented as a non-browser static test. An empty aggregator is a failure.

The DOM substrate is a root decision, not an implementer choice:

- pure UI controllers use narrow injected element/event, clock, media-query,
  focus, and scheduler doubles; no DOM emulator dependency is added by default;
- real DOM order, ARIA state, focus behavior, responsive layout, and CSS-visible
  behavior use the existing Playwright/browser lane;
- deliberate perturbation uses fake adapters, fixtures, or fault injection.
  Tests never temporarily edit and restore production source.

### Warning policy

Do not edit 31 unrelated warning sites in Wave 0. Q04 records each current
warning against its owning later work order. Every implementer must leave its
allowlist at zero warnings and may not increase the global count. The gate owner
records the declining global count after each batch. Wave 5 requires zero.

Q04 also records every empty/swallowed catch or ad hoc recoverable-error path,
its classification, owning subsystem, owning work order, expected visitor
behavior, and required focused test. A package implements the policy only for
mapped sites in its own allowlist. F06 closes untouched sites by subsystem; it
must not create a shared cross-subsystem runtime error module merely to reuse
terminology.

## Review cadence

Review difficulty is separate from implementation risk. A T3 extraction can
have a bounded local review, while a read-only cross-wave review can be XHARD
because it must reconstruct several interacting state machines.

### Reviewer classes

| Class | Reviewer | When | Authority |
| --- | --- | --- | --- |
| R0 | Coordinator | Every package; sole reviewer for ordinary T0 metadata | Accepts/rejects and resolves ownership |
| R1 | Different GPT-5.6 Luna | Every T2/T3 package and public-contract T1 package | Read-only blocker/follow-up evidence |
| R2 | Different GPT-5.6 Luna | Batch of at most three related low-risk T1 packages | Detects combined drift, duplication, and adapter clutter |
| RX | GPT-5.6 Sol, high/xhigh reasoning | Root-defined XHARD design and integrated wave reviews | Read-only big-picture challenge; coordinator still decides |

The implementation agent never reviews its own work. A Luna that performed
reconnaissance may review facts, but not give the independent package verdict.
An RX post-implementation reviewer must be a different agent/session from the
implementer and preferably different from the RX design critic.

### Normal package and batch reviews

1. Every T2/T3 order and every public-contract T1 order gets an R1 review before
   coordinator acceptance.
2. At most three related low-risk T1 orders may share one R2 review.
3. Every XHARD implementation still gets an immediate R1 review of its bounded
   brief and hunks. That catches local defects; it does not replace RX.
4. The coordinator inspects every blocker, ownership claim, public-contract
   change, and test classification. Agent verdicts are advisory.

### XHARD review tasks

These read-only review tasks are themselves XHARD and are recorded in the
ledger like implementation orders:

| Review ID | When | GPT-5.6 Sol reviews | Downstream hold |
| --- | --- | --- | --- |
| XR-BASELINE | After G1 evidence, before Wave 2 | Q01–Q05/P01/C01–C04 semantics, capture truthfulness, environment classification, live scenario coverage, deterministic/resource/performance report completeness, and fault-injection validity | Wave 2 cannot start |
| XR-C-DESIGN | After S01/S02 evidence, before C05 | Root's manifest, chapter capability, registry-instance, navigation, and compatibility migration design | C05/C06/N01 cannot start |
| XR-C-GATE | At G2 after C05/C06/N01 and focused/browser evidence | Integrated canonical model, dependency direction, adapter debt, and two-instance behavior | J01/J03/R05–R08 cannot start |
| XR-RUNTIME-DESIGN | Before J01 and before lifecycle XHARD orders J04a–J04e/R01/R03/R04/R07 | Root's transition/frame state model, disposal graph, async cancellation, clock/RAF, GPU, rail/UI, and page/journey lifetime decisions | Affected XHARD family/order cannot start |
| XR-RUNTIME-GATE | At G3 after journey/rendering lifecycle lanes | Integrated frame order, transition semantics, teardown ownership, late async behavior, recreation, and visitor fallbacks | Wave 4 cannot start |
| XR-VISUAL-DESIGN | Before U05, O02, B03, and B04 | Root's projection/layout, seeded builder, responsive page-layout, and boot-handoff extraction boundaries | Named XHARD order cannot start |
| XR-VISUAL-GATE | At G4 | Whole UI/organism/chapter/page composition, visual determinism, residual facade cohesion, and abstraction-churn risk | Wave 5 cannot start |
| XR-FINAL | At G5 after all mechanical/browser/capture/performance evidence | Complete diff, cross-wave architecture, residual debt, release risk, and whether the stated end-state was actually reached | No completion/release-readiness claim |

For `XR-RUNTIME-DESIGN` and `XR-VISUAL-DESIGN`, the coordinator may present
separate root-authored design notes in one Sol session, but each named XHARD
order receives an explicit `approved`, `revise`, or `not covered` result. A
generic wave-level compliment does not unlock it.

### What big-picture reviewers answer

An RX or wave reviewer answers:

- Is there one owner for each new mutable state/resource?
- Did dependencies move in the intended direction?
- Is any compatibility adapter now unnecessary or leaking private state?
- Did tests protect behavior rather than module layout?
- Did a split create pass-through wrappers without policy?
- Are any facades still coordinating unrelated state machines?
- Can the entire wave be understood and rolled back by package?
- Did individually reasonable packages compose into a new god interface,
  circular lifecycle, or unnecessary abstraction layer?
- Do the tests collectively prove the user-visible contract, or only each
  module's local interpretation of it?

Root judgement is mandatory for schema shape, chapter capability boundaries,
page versus journey lifetime, `window.journey` compatibility, transition and
landing semantics, frame order, visual equivalence, RNG/shader/geometry
equivalence, concurrent hunk ownership, and every test waiver.

## Work-order catalogue

The source paths below are maximum candidate scopes. The dispatch brief freezes
a narrower exact allowlist and names allowed new files.

### Wave 0 — make execution safe and tests addressable

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| X00 | Create ledger, communicated reservations, external patch journal, ownership map, rolling pre-write assertions, and protected-hunk baseline | new execution ledger plus private external journal only | T0 | manifests/copies/diffs complete; injected mismatch stops before write; no app edit |
| Q01 | Split cheap unit/contract/static scripts from browser execution | `package.json`, lockfile, new test aggregators only | T2 | each script runs independently and writes nothing |
| Q02 | Normalize cache-query imports for dependency analysis and fail on skipped local roots | `package.json`, `madge.webpack.cjs`, one analyzer helper/test | T2 | organism local import analyzed; `playwright-core` explicitly external |
| Q03 | Add browser modes, stable scenario filtering, machine-readable environment classification, and bounded cleanup | `tools/browser-smoke.mjs`, package scripts/tests | T2 | parser/unit probes; gate owner runs one static scenario only |
| Q04 | Inventory all current warnings and empty catches; assign an owning order and define error classes | ledger/documentation only | T1 | every warning/catch mapped; no broad source edit |
| Q05 | Make capture comparison non-mutating and truthful: write fresh output outside the repository and remove automatic fail-band success | `tools/capture.py`, `tools/check.sh`, focused harness tests/docs | T2 | repo capture paths remain byte-identical; every fail-band exits nonzero, or an explicit coordinator environment adjudication remains recorded as a blocking non-pass |

Wave 0 is serialized because Q01–Q03 and Q05 share package/test/gate
infrastructure. Q04 may run after their file boundaries freeze. No capture gate
runs before Q05 is accepted.

### Wave 1 — characterize behavior

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| P01 | Provision and prove one supported reference browser/WebGL/performance environment before characterization depends on it | external environment plus ledger metadata; no app source | T2 | required WebGL preflight and `live-journey` pass with fixed browser/renderer/viewport/DPR; temp capture path writable |
| C01 | Characterize hero, direct/wrap transitions, cancellation, landing, and frame-writer order | new journey contract tests; minimal explicit test seam only | T2 | deliberate perturbation makes each assertion fail |
| C02 | Characterize UI DOM/ARIA, sidebar/nav effect, disclosure, focus, sheet, copy arrival, and reduced motion | new UI/DOM tests; harness scenario definitions | T2 | `live-desktop`, `live-touch`, and `live-reduced-motion` cover normal desktop, mobile sheet/focus, hero/sidebar, copy timing, and reduced motion |
| C03 | Define deterministic rendering report schema and record RNG/order/geometry/resource/performance baselines | new rendering tests/report fixture; read-only probes | T3 | RNG/geometry/draw ranges, renderer memory/draw calls, listener/RAF/resource counts repeat exactly; environment provenance and soft frame/GPU tolerances recorded |
| C04 | Characterize portrait deal atomicity, late load/failure, cancellation, and disposal | new portrait contract tests; minimal loader seam only | T2 | fake loader/clock tests fail on post-dispose mutation |

P01 follows Q03/Q05 and precedes C01–C04. If no supported reference environment
can pass, execution stops here rather than accumulating unverifiable source
changes. C01/C02 serialize if they touch the browser harness. C03/C04 can run in
parallel with them after P01, provided their test files and production seams are
disjoint.

### Wave 2 — canonical contracts

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| S01 | Validate raw manifest values/totals and expose immutable indexes | `journey/structure.js`, its tests | T1 | malformed raw inputs fail; current values exact |
| S02 | Add route/copy/symbol compatibility fixtures before removing competing sources | route/symbol/constants tests and fixtures only | T1 | current exported values/signatures exact |
| C05 | Define narrow core chapter descriptor plus separate focus/interaction/selection/visibility capabilities | new contract/adapters and chapter contract tests | T2 / **XHARD** | per-chapter migration table and fake chapters pass |
| C06 | Replace module-global prepared cache with one registry instance; migrate prebuild/build atomically | `chapter-registry.js`, `main.js`, `journey.js`, focused tests | T2 / **XHARD** | prebuild, no-prebuild, two instances, dispose isolation |
| N01 | Return validated `{chapter,node}` navigation targets and migrate named consumers | `navigation.js`, `chapter-interactions.js`, direct consumers/tests | T2 | every current URL identical; invalid target explicit |

S01 precedes S02, C05, and N01. C05 precedes C06. C06 and N01 serialize if
both need `journey.js` or `main.js`. The coordinator decides the capability
shape before C05 dispatch; `XR-C-DESIGN` must challenge and cover that decision
before Luna implements it.

### Wave 3A — journey runtime ownership

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| J01 | Extract one transition controller for jump/wrap/cancel/reverse/hero/entry state | `journey.js`, transition/path/entry collaborators and tests | T3 / **XHARD** | endpoint, reversal, cancellation, rewind, landing exact |
| J02 | Declare the fixed frame pipeline once and remove chapter-specific branches | `journey.js`, `frame-application.js`, new pipeline/tests | T3 / **XHARD** | spy event sequence exact; frame output unchanged |
| J03 | Inject narrow UI runtime capabilities and remove lower-level global/private-shape reads | `ui.js`, `journey.js`, `chapter-interactions.js`, adapter/tests | T2 | no lower `window.journey`/`portraits` access |
| A02 | Freeze `journey/rail.js` page-versus-journey ownership before teardown | `journey/rail.js`, UI/page consumers, read-only responsibility/state map | T1 under **XHARD** lifecycle design | every rail timer/listener/backdrop/disposer has one target owner |
| J04a | Own and detach journey state/scroll timers, hash/input/resize/visibility listeners | `journey/state.js`, `journey/scroll.js`, narrow lifecycle helpers/tests | T2 under **XHARD** lifecycle design | repeated attach/dispose leaves zero owned work; scroll behavior exact |
| J04b | Own and detach UI/rail timers, listeners, backdrop, and subordinate teardown | `journey/ui.js`, `journey/rail.js`, UI modules/tests | T2 under **XHARD** lifecycle design | UI/rail destroy is idempotent; sheet/nav/rail behavior exact |
| J04c | Own and detach dial and chapter-installed global hooks | `journey/dial.js`, exact chapter hook owners, focused tests | T2 under **XHARD** lifecycle design | keys/listeners detach once without changing chapter behavior |
| J04d | Own registry/preparation cancellation and late async settlement | `chapter-registry.js`, preparation helpers, `journey.js`, tests | T2 under **XHARD** lifecycle design | dispose during `prepareGpu`; no stale registry/late mutation |
| J04e | Compose facade-generation, journey animator, compatibility-global, and recreation cleanup | `journey.js`, new journey lifecycle owner/tests | T2 under **XHARD** lifecycle design | boot/prepare/activate/dispose/recreate twice; old global cannot affect new instance |
| J05 | Document and test page-lifetime singleton handlers separately from journey recreation | `main.js` test seam, tests, lifecycle docs | T2 | one install per page module; no journey accumulation |

Run J01 → J02 → J03 → A02 → J04a → J04b → J04c → J04d → J04e → J05
serially. Each child has a separate reservation, patch journal, review, and
rollback seam. `XR-RUNTIME-DESIGN` must explicitly cover J01/J02 and the complete
J04a–J04e ownership map before their dispatch.

### Wave 3B — rendering and chapter lifecycle ownership

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| R01 | Stop shared animation and intro acceleration RAF/clock ownership | `organism/animation.js`, `organism/intro.js`, tests | T3 / **XHARD** | dispose during acceleration; no later callback/clock patch |
| R02 | Give resize, pointer, tap, and spore listeners one input owner | `organism/organism.js`, `spores.js`, new input module/tests | T2 | repeated attach/dispose leaves zero owned listeners |
| R03 | Dispose renderer, controls, composer/TAA targets, textures, materials, and geometries | organism renderer/facade/resource helpers/tests | T3 / **XHARD** | idempotence; memory and deterministic outputs match baseline |
| R04 | Own portrait cancellation and explicit texture state transitions | portraits and `portrait-*` helpers/tests | T3 / **XHARD** | late success/failure/redeal/double-dispose leak-free |
| R05 | Add Connect and Inspire disposal behind the frozen chapter contract | their `index.js` files and owned helpers/tests | T2 | lifecycle contract and away/back tests |
| R06 | Add Owned/substrate/portrait disposal behind the contract | Owned facade and owned resource helpers/tests | T3 | no early disposal; late portrait work cancelled |
| R07 | Add Final tree and document-listener disposal behind the contract | Final facade and explicit sub-builder disposal adapters/tests | T3 / **XHARD** | all listeners/resources cascade once |
| R08 | Integrate registry-wide chapter disposal and clear prepared instances | registry/journey lifecycle and tests | T2 | two registries never share or retain a chapter |

R01 → R02 → R03 is serial where `organism.js` overlaps. R04 can run beside
R01–R03. R05–R07 run only after C05/C06; they may parallelize only with disjoint
files and a frozen contract. R04 is a hard prerequisite of R06; R06 may consume
the portrait lifecycle contract but may not edit `portraits.js` or `portrait-*`
helpers unless the coordinator explicitly merges those orders and serializes
them. `XR-RUNTIME-DESIGN` must explicitly cover R01, R03, R04, and R07 before
each starts. R08 waits for all of them.

### Wave 4A — UI ownership and cards

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| U01a | Replace card import timer with an explicit start/stop scheduler and wire the UI lifecycle caller | `journey/cards/index.js`, runtime/new scheduler, `journey/ui.js` or narrow card-lifecycle adapter/tests | T2 | UI facade starts preparation at the characterized epoch; 1500 ms/build-once behavior is exact; UI destroy stops it and J04e cascades disposal |
| U01b | Move builder registry/exports behind one acyclic registry owner | `journey/cards/index.js`, new registry module, builder-contract tests | T1 | builder identity/order/default exports exact |
| U01c | Move card icon metadata behind one data-only owner | `journey/cards/index.js`, new icon-data module/tests | T1 | icon keys/markup/signatures exact; no warming side effect |
| U01d | Own Discord card preparation, idle/timer work, remote fetch, late settlement, and cancellation under the same UI lifecycle caller | `journey/cards/discord.js`, narrow preparation helper, UI card-lifecycle adapter/tests | T2 | no import-time async work; UI start/dispose ownership and prepare/deactivate/failure/late-result behavior are exact |
| U02 | Extract hotspot and hover-zone registry with one state owner | `ui.js`, new UI module/tests | T2 | hover/focus/touch behavior and cleanup exact |
| U03 | Extract popover/card disclosure controller | `ui.js`, UI/cards adapters/tests; CSS protected | T2 | tiers, Escape, focus return, activation exact |
| U04 | Extract copy/arrival controller | `ui.js`, arrival/live-region helpers/tests | T2 | timing and reduced-motion exact |
| U05 | Extract projection/collision/layout engine | `ui.js`, new layout module/tests | T3 / **XHARD** | DOM projection and current captures unchanged |
| U06 | Make UI facade composition-only and cascade idempotent destroy | UI facade/modules/tests | T2 | zero UI timers/listeners after destroy |

Run U01a → U01b → U01c → U01d before U02. Run U02 → U03 → U04 → U05 → U06
serially because they converge on `ui.js`. Review after every T2/T3 order and
batch-review U01b/U01c together; run targeted browser scenarios after U03, U04,
and U05, not after every extraction.

The root-frozen U01 interface is: the UI facade creates and synchronously starts
one card-preparation lifecycle at the characterized boot epoch. Its `destroy()`
stops the scheduler, idle work, fetch/late settlement, and card-specific
preparation; J04e reaches it only by cascading `ui.destroy()`. Card modules never
self-start during import, and journey code does not reach into card internals.

### Wave 4B — organism and large renderer cohesion

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| O01 | Finish renderer/postprocessing composition behind its owner | organism facade/renderer/resource modules | T3 | exact shaders/order/draw ranges; memory tolerance |
| O02 | Extract cohesive world-builders without splitting seeded loops into utilities | organism facade plus one new builder module | T3 / **XHARD** | RNG draws and baked geometry exact |
| H01 | Split Owned substrate into build, resources, and runtime only where real | `journey/chapters/owned/substrate.js`, allowed siblings | T3 | byte/schema/capture/lifecycle gates |
| H02 | Split Connect tendrils on the same rule | `journey/chapters/connect/tendrils.js`, allowed siblings | T3 | byte/schema/capture/lifecycle gates |
| H03 | Split Final ring on the same rule | `journey/chapters/final/ring.js`, allowed siblings | T3 | byte/schema/capture/lifecycle gates |
| H04 | Split Final canopy on the same rule | `journey/chapters/final/canopy.js`, allowed siblings | T3 | byte/schema/capture/lifecycle gates |
| H05 | Split Final terrain on the same rule | `journey/chapters/final/terrain.js`, allowed siblings | T3 | byte/schema/capture/lifecycle gates |
| H06 | Split Final clones on the same rule | `journey/chapters/final/clones.js`, allowed siblings | T3 | byte/schema/capture/lifecycle gates |

O01 precedes O02. H01–H06 are independent packages after Wave 3 disposal
contracts freeze, but their writes are not concurrent: complete focused checks,
R1 review, frozen-source capture, and coordinator acceptance for H01 before H02
begins, and so on. Stop an H-order when its remainder is cohesive; line count
alone cannot authorize another split.
`XR-VISUAL-DESIGN` must explicitly cover O02 before its dispatch.

### Wave 4C — entry facade and residual-cohesion decisions

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| A01 | Decide whether the remaining portrait facade is cohesive after R04/R06 | `portraits.js`, portrait helpers, contract map; read-only decision artifact | T1 | remaining code is only geometry/material/runtime coordination, or A01a is required before G4 |
| A01a | Conditional: extract one additional portrait owner found by A01 | exact paths and contract fixed by root from A01 evidence | T3, optionally **XHARD** | focused portrait lifecycle, byte/order, and capture gates |
| A03 | Decide whether Inspire's remaining facade/build/runtime state is cohesive | `journey/chapters/inspire/index.js`, direct collaborators; read-only decision artifact | T1 | one owner is evidenced, or A03a extraction is required before G4 |
| A04 | Decide whether Final's remaining facade/build/runtime state is cohesive | `journey/chapters/final/index.js`, direct collaborators; read-only decision artifact | T1 | one owner is evidenced, or A04a extraction is required before G4 |
| A05 | Decide whether the detachable scroll runtime is cohesive after J04a | `journey/scroll.js`, state/input collaborators; read-only decision artifact | T1 | one owner is evidenced, or A05a extraction is required before G4 |
| A06 | Decide whether spores is cohesive after listener ownership moves | `organism/spores.js`, input/runtime collaborators; read-only decision artifact | T1 | one owner is evidenced, or A06a extraction is required before G4 |
| B01 | Freeze the page-bootstrap state model and characterization map | `main.js`, direct collaborators, C01/C02/J05 evidence; test/document only | T2 | every handler/timer/layout/handoff has a named owner and baseline |
| B02 | Extract page-level failure reporting and singleton global-handler ownership | `main.js`, new bootstrap failure/lifecycle modules/tests | T2 | one install per page load; visitor fallback unchanged |
| B03 | Extract responsive hero/sidebar/rail layout behind an explicit page-layout owner | `main.js`, `journey/rail.js`, new bootstrap/layout module/tests; CSS protected | T3 / **XHARD** | approved hero/sidebar behavior, breakpoints, rail placement, resize order, captures exact |
| B04 | Extract boot-input buffering and intro/scene/journey handoff | `main.js`, narrow bootstrap/handoff modules/tests | T3 / **XHARD** | early input, intro skip, lazy prepare, failure, and handoff ordering exact |
| B05 | Leave `main.js` as entry/composition and documented page-lifetime compatibility facade | `main.js`, bootstrap modules/tests | T2 | facade contains boot/composition only; public entry/import-map behavior exact |

A01 follows R04/R06; A03–A06 follow their lifecycle owners. Conditional IDs
A03a–A06a are root-defined, separately reviewed extraction orders and must be
accepted before G4 when triggered. A02 already precedes J04b and B03. B01 follows
J05 and the Wave 3 gate;
B02 → B03 → B04 → B05 serialize because they touch `main.js`. The coordinator
defines every B-interface before dispatch and protects the user's current hero
and sidebar hunks explicitly. `XR-VISUAL-DESIGN` must explicitly cover B03 and
B04 before their dispatch. The same review covers U05 before the UI lane reaches
that package.

### Wave 5 — remove competing sources and close

| ID | Goal | Candidate scope | Risk | Focused proof |
| --- | --- | --- | --- | --- |
| F01 | Split constants by domain behind compatible exports | `journey/constants.js`, domain modules/tests | T1 | every exported value exact |
| F02 | Separate symbol data/signatures from DOM rendering | `journey/symbols.js`, new symbol modules/tests | T1 | signature and DOM output exact |
| F03 | Replace commented/legacy route sources with durable fixtures | `journey/route.js`, route fixtures/tests | T1 | canonical equivalence proves removal |
| F04 | Reconcile tooling/deployment documentation and exact path claims | `tools/README.md`, build/deploy/public docs | T0 | docs match executable scripts |
| F06 | Close the error-classification map without introducing a shared cross-subsystem runtime abstraction | only Q04-mapped call sites not already handled by their owning package; split by subsystem if more than one path cluster | T2 | every catch/result classified and tested; subsystem-local implementations; visitor behavior unchanged |
| F05 | Correct scanner zones/entrypoints, categorize orphans, rescan, and run unbiased subjective review | `.desloppify` config/state and review artifacts only | T2 | fresh, non-stale evidence; no broad suppression |

F01–F03 serialize where imports overlap. Every earlier package implements the
Q04 error policy in call sites it already owns; F06 closes only untouched mapped
sites and runs before F05. F04 can run after executable behavior freezes. F05 is
last; scanner score never drives a behavior change by itself.

## Wave gates

### G0 — quality floor

After serialized Q01–Q03 and Q05, with Q04's inventory completed before the
gate:

- each new script executes with the promised semantics;
- X00's external journal, communicated reservation, and rolling pre-write
  mismatch probe are demonstrated on a disposable fixture;
- `npm run check` is non-browser and non-mutating;
- local production imports have no skipped/unresolved root;
- the current warning ownership map and count are recorded;
- DOM-controller contracts use injected doubles while real DOM/ARIA/layout
  assertions remain in named browser scenarios;
- capture comparison writes only to a private temporary output directory and
  leaves repository capture paths byte-identical;
- no named capture fail-band can become a green result; an environment
  adjudication is visibly `blocked`, never `pass`;
- an R1 Luna tooling review passes and the coordinator accepts G0.

### G1 — characterization baseline

After P01 and C01–C04:

- `npm run check` passes;
- gate owner runs all eleven browser scenarios once, with `live-journey` required
  in the supported environment;
- `live-desktop`, `live-touch`, and `live-reduced-motion` pass in their fixed
  viewport/input/motion configurations;
- deterministic rendering report repeats exact RNG/order/geometry/draw-range,
  renderer-memory/draw-call, listener/RAF, and resource-owner fields;
- the report records browser/renderer/viewport/DPR/flags provenance and accepted
  soft frame-time/GPU tolerances for later G3/G4 comparison;
- capture/baseline files are observed, never refreshed;
- an R1 Luna characterization review confirms tests fail under deliberate
  invariant perturbations;
- XHARD review `XR-BASELINE` by a fresh GPT-5.6 Sol approves tooling semantics,
  capture truthfulness, environment classification, scenario coverage, and the
  deterministic/resource/performance baseline before Wave 2;
- the coordinator accepts P01/G1/RX evidence.

### G2 — canonical contract gate

After S01–N01:

- `npm run check` passes;
- targeted `static-navigation`, `static-alias`, and `live-journey` pass;
- XHARD review `XR-C-GATE` by a GPT-5.6 Sol approves manifest, capabilities,
  registry, navigation direction, and composed compatibility;
- compatibility adapters and intended removal wave are recorded.

### G3 — lifecycle and orchestration gate

After J01–J03, A02, J04a–J04e, J05, and R01–R08:

- `npm run check` passes;
- required `live-journey`, `live-desktop`, `live-touch`,
  `live-reduced-motion`, `static-input`, and `reduced-motion` pass;
- `python3 tools/rebuild.py --check` passes;
- capture comparison and reference-environment resource/performance report pass;
- repeated create/prepare/activate/dispose/recreate proves zero owned work leaks;
- XHARD review `XR-RUNTIME-GATE` by a GPT-5.6 Sol approves state ownership,
  dependency direction, frame/transition semantics, and teardown composition.

### G4 — cohesive extraction gate

After U01a–U01d/U02–U06, O01–O02, serialized H01–H06, A01/A03–A06 and every
required conditional extraction, plus B01–B05:

- focused checks were recorded after every order;
- `npm run check` and all required browser scenarios pass;
- deterministic byte, shader, RNG/order, capture, memory, and draw-call gates
  pass in their supported environments;
- XHARD review `XR-VISUAL-GATE` by a GPT-5.6 Sol identifies no visual contract
  drift, pass-through-wrapper churn, or unjustified residual god facade.

### G5 — final integrated gate

Run once, not per implementer:

1. warning-free lint with zero global warnings;
2. cycle analysis with no skipped local production root;
3. unit, contract, static, chapter-entry, scroll/input, and content checks;
4. public artifact, bake, and metadata checks;
5. all required browser/WebGL scenarios;
6. capture comparison without refresh;
7. desktop/mobile manual hero, sidebar, navigation, cards, chapters, fallback,
   reduced-motion, baked, and live-build checks;
8. reference-environment memory, draw-call, listener, RAF, and timing comparison;
9. fresh mechanical scan and independent subjective review;
10. confirmation that every Q04 error site is classified with subsystem-local
    behavior and a focused test;
11. XHARD review `XR-FINAL` by a fresh GPT-5.6 Sol of the complete evidence and
    cross-wave architecture;
12. root review of the complete diff, RX findings, and residual-debt rationale.

No release-readiness claim is allowed while the live browser gate is merely
timing out or skipped.

## Concurrency and collision rules

Maximum useful execution concurrency is two implementers plus one reviewer/gate
owner. More agents increase collision risk in this repository.

Browser, capture, WebGL, and performance gates are global source-freeze points,
not a third concurrent lane. Before a gate, the coordinator reserves the full
served dependency closure, records exact hashes/status for every served source,
and pauses all repository writes by agents. The gate owner re-hashes the closure
afterward. Any source change during the lease invalidates the result, even when
the changed path was outside the scenario's apparent subsystem.

Never run these concurrently:

- two orders touching `main.js`, `journey/journey.js`, `journey/ui.js`,
  `organism/organism.js`, `chapter-registry.js`, package scripts, or the browser
  harness;
- schema producers and consumers migrating from the old schema;
- chapter contract edits and chapter disposal/extraction;
- two browser, server, WebGL, capture, or performance runs;
- any implementation write while a browser/capture/WebGL/performance gate owns
  the frozen served dependency closure;
- scanner configuration and source refactoring.

Safe parallel lanes after prerequisites:

- journey characterization beside rendering characterization;
- journey runtime ownership beside organism/portrait lifecycle ownership;
- UI work beside organism/chapter renderer work;
- read-only H01–H06 reconnaissance; renderer writes, review, capture, and
  acceptance are serialized package-by-package.

## Browser-lane lease

The coordinator records owner, scenario IDs, port, profile path, server PID,
browser PID/process group, start time, deadline, viewport, DPR, browser version,
renderer, flags, and the complete pre-gate served-source manifest. The owner:

- starts the server and browser in recorded owned process groups with an
  explicit unique profile path under a private `mktemp` directory;
- cleans up only processes and paths created by that lease;
- closes gracefully, then applies bounded TERM/KILL only to the recorded owned
  process groups when needed;
- verifies the leased port, profile path, server group, browser group, and all
  recorded descendants are gone before releasing the lane;
- verifies the complete served dependency closure is byte-identical to the
  pre-gate manifest; a mismatch invalidates all results from that lease;
- uses a firm per-scenario and outer deadline;
- reports `pass`, `application-fail`, `environment-blocked`, or `harness-fail`;
- never retries an application assertion automatically;
- may retry one environment/harness failure after proving the application was
  not reached;
- never refreshes a golden.

Stale-lease recovery is allowed only when PID, process group, command line,
profile path, and port all match the ledger. A pre-existing or ambiguous process
is reported and left untouched.

## Implementer brief template

```text
Work order and accepted parents:
Single ownership goal:
Root-decided target contract/interface:
Exact allowed existing files:
Exact allowed new files:
Protected files/hunks and current hashes:
Known pre-existing/concurrent changes:
External patch-journal path and current rolling manifest:
Behavioral/numeric/visual invariants:
Required implementation steps:
Focused commands only:
Independent review required: yes/no
Stop conditions:

Never reset, restore, checkout, stash, clean, broadly format, stage, commit,
regenerate, refresh goldens, or edit outside the allowlist. Do not decide a new
architecture when the brief is ambiguous; stop and report the ambiguity.

Handoff: changed paths/hunks, contract preserved, exact checks/results,
pre/post hashes, generated/golden status, residual risk, and questions.
```

## Reviewer brief template

```text
Read-only review of work order <ID> against its brief and ledger baseline.
Check only the changed hunks plus necessary contract consumers.
Look for contract/URL/DOM/ARIA/timing/RNG/shader/frame/visual drift; hidden globals
or private-shape access; listener/timer/RAF/async/resource leaks; new cycles;
false-green tests; and wrappers without ownership or policy.
Verify allowlist, ownership classification, generated/golden status, and focused
commands. Do not edit. Return blocker/follow-up/acceptable residual findings and
a GO/NO-GO recommendation. Root makes the decision.
```

## XHARD reviewer brief template

```text
Read-only XHARD review <XR-ID>. You are reviewing the root-authored design or
the integrated result, not implementing it. Reconstruct the relevant state,
resource, dependency, timing, compatibility, and failure model across all named
packages. Test the composition against user-visible invariants and the recorded
evidence. Look specifically for locally green packages that disagree globally,
missing owners, circular teardown, async work crossing lifetimes, permanent
compatibility adapters, visual/RNG/frame drift, false-green environment results,
and abstraction churn.

Return: GO / GO WITH CONDITIONS / NO-GO; blocker/high findings only; exact
affected contracts/files/evidence; named downstream orders that must remain
held. Do not edit. Do not redesign implicitly: propose a correction for root to
decide. The coordinator is the acceptance authority.
```

## Repair, retry, and escalation

- A reviewer blocker returns to the same implementer once with a narrow repair
  brief; no new cleanup scope is added.
- A second reproducible failure stops the order. The coordinator re-evaluates
  the contract, splits the order, or assigns a new agent.
- An environment or harness failure gets one bounded retry only after evidence
  distinguishes it from application execution.
- Any concurrent edit on an allowlisted path stops the implementer. The
  coordinator classifies hunks and re-baselines; the agent never merges or
  restores on its own.
- Any proposed public-contract, visual, route, timing, RNG, shader, geometry, or
  golden change stops and requires a separate root decision. Structural work
  cannot normalize that change as incidental.
- If a focused test is missing, add the characterization order before the
  implementation; do not substitute a full suite and hope it covers the seam.
- Every allowed untracked text file is part of the baseline and review evidence
  and must pass the no-index whitespace check; tracked-only diff commands are
  not sufficient.

## Start sequence

When the user authorizes execution, the coordinator should:

1. create X00 and record the live dirty-worktree ownership baseline;
2. reserve and dispatch Q01 only;
3. review Q01, then proceed through serialized Wave 0;
4. run G0;
5. run P01 and stop before characterization if the required reference
   browser/WebGL/performance environment is unavailable;
6. complete C01–C04, run G1, and hold Wave 2 until `XR-BASELINE` and coordinator
   acceptance confirm that the evidence foundation is truthful and complete;
7. dispatch only work whose parents are accepted and whose exact paths do not
   collide with active reservations;
8. update the ledger and external patch journal after every write, handoff,
   review, repair, and gate;
9. provide the user a concise report at each wave seam, not a stream of every
   subagent tool call;
10. stop only for a genuine authorization/ownership ambiguity, product decision,
   or unrecoverable environment requirement.

This is the point at which the work can be run one piece at a time without
individual agents improvising the architecture or repeatedly running the full
suite.
