# Elegance program

## Purpose

Move the website from "safer and partly decomposed" to an architecture whose
boundaries are obvious, testable, and difficult to misuse. This is a
behavior-preserving program. It does not redesign the website, refresh visual
baselines, or treat smaller files as an end in themselves.

This plan is informed by three independent GPT-5.6 Luna audits covering:

- journey orchestration, UI, cards, navigation, and schema;
- organism, portraits, chapter rendering, and resource lifecycle;
- tests, tooling, deployment boundaries, scanner debt, and integration safety.

The companion
[execution runbook](./2026-08-20-elegance-execution-runbook.md) converts these
architectural packages into dispatch-sized work orders, assigns review and test
ownership, and defines the coordinator's durable progress protocol.

## What "elegant" means here

The result is elegant when all of the following are true:

1. Each facade composes collaborators and exposes a stable public contract; it
   does not also implement multiple state machines.
2. Mutable state has one named owner. Timers, listeners, RAF callbacks, async
   loaders, textures, geometries, and materials have explicit cleanup.
3. Dependencies point inward: schema and contracts are leaves; orchestration
   depends on them; UI and chapters do not recover dependencies through globals
   or private object shapes.
4. Chapter identity, routing, aliases, copy bands, symbols, navigation targets,
   and interaction metadata have one validated source of truth.
5. Frame order, entry/landing semantics, seeded output, shader text, geometry
   bytes, route values, DOM structure, and interaction timing are executable
   contracts rather than tribal knowledge.
6. Cheap checks are deterministic and always run. Browser unavailability is an
   explicit environment skip, never an application pass.
7. The code has no unexplained lint warnings, skipped dependency roots, empty
   catches, import-time timers, or accidental visitor-visible failure paths.
8. A new contributor can change one subsystem without understanding unrelated
   closure state or silently changing another subsystem.
9. One trace can follow a physical input sample through gesture identity,
   controller decision, route progress, the frame's presented camera state, and
   screen-space motion; a green endpoint alone cannot conceal disagreement
   between those layers.

Line count is a diagnostic, not the goal. A large geometry builder may remain
large when splitting it would obscure construction order or seeded randomness.
A facade over roughly 1,000 lines requires an explicit cohesion justification,
but passing an arbitrary size threshold is not acceptance.

## Current position

Important foundations already exist:

- the card registry cycle is removed;
- Madge reports no detected cycles;
- journey metadata has a validated schema;
- camera, frame, navigation, failure, UI helper, renderer, animation, random,
  shader, and portrait helper modules have begun to establish real seams;
- static content has a canonical generator and drift test;
- check, build, release, and public artifact responsibilities are separated;
- focused structure, chapter-entry, and static-content tests pass.

The remaining architectural centers are still substantial:

- `journey/ui.js`: about 3,044 lines and several UI state machines;
- `organism/organism.js`: about 2,083 lines and incomplete runtime teardown;
- `journey/chapters/owned/portraits.js`: about 2,253 lines;
- `journey/journey.js`: about 1,553 lines and transition ownership;
- `journey/rail.js`: about 1,790 lines and mixed page/journey/layout lifecycle;
- `main.js`: about 1,269 lines and mixed page boot/layout/handoff ownership;
- multiple chapter renderers remain above 1,000 lines.

The current scanner score is not a trustworthy elegance baseline: its config is
stale, browser/import-map entrypoints create false orphan findings, and
subjective dimensions are unreviewed. Use evidence and acceptance gates during
the work, then rescan and review at the end.

### Reconciled execution baseline — 2026-08-20

#### Post-push custody update — 2026-08-21

Commit `4b02a6a43df1cac5664990819d45c807149b625d` is now both `main` and
`origin/main`. It durably contains the previously uncommitted content,
hero/rail, navigation/flight, scroll, Connect ground-network placement,
responsive camera, UI/CSS, test, capture, and all three elegance documents.
The `16a16d8` inventory below remains the provenance record for that
reconciliation, but every reference there to a dirty or untracked path is a
historical description of the pre-`4b02a6a` snapshot, not its present custody.
The worktree continued changing after that commit; every later user edit is
again protected, including currently observed Connect, portrait, UI, rail, and
site-CSS paths. X00 must begin from `4b02a6a` plus a fresh then-live worktree
snapshot and must not restore any of them.

Moving the protected work into a pushed commit does not promote an elegance
order to DONE: the frozen contract, focused proof, independent review, and
coordinator acceptance are still required. It does make the three documents
durable on GitHub and removes the old untracked-goal ambiguity.

This reconciliation audited commit
`16a16d8cafc9590f61fb3a6ac5de618d0e2db2d7` plus the complete staged,
unstaged, and relevant untracked worktree immediately before these plan edits.
There were no staged changes. The dirty tree contained the current content,
hero/preboot rail, navigation, Mission/Inspire flight, scroll correction,
Connect placement, UI/layout, CSS, static-fallback, focused-test, and capture changes, plus
untracked `.DS_Store`, `.tmp-scroll-investigation/`, and this goal document.
Within that historical reconciliation window, HEAD advanced from the initial
`b3a2ecd1` audit snapshot only through the
committed `DEPLOY.md` Railway-operations change; it was re-read and folded into
F04 below. `journey/scroll.js` and `tools/scroll-touch-gates.mjs` also gained an
uncommitted answered-wall restart correction and delayed-momentum-tail regression
while the audit ran; the focused suite passed after both settled.
Commit/push state is not code semantics: X00 must record the then-live tree
again, and any later change supersedes this inventory without authorizing a
restore.

Status meanings: **DONE** requires the frozen work-order contract, focused proof,
required independent review, and coordinator acceptance; **PARTIAL** means a
useful seam or proof exists but the order is not closed; **REMAINING** means no
qualifying implementation/proof exists; **REVALIDATE** means prior evidence must
be rerun against protected concurrent behavior before it can be consumed. No
order is DONE in this audit. Existing files alone are not completion evidence.

| Work-order family | Reconciled status | Exact repository evidence and remaining contract |
| --- | --- | --- |
| X00 | REMAINING | No execution ledger or external patch journal exists; the now-tracked goal explicitly defers ledger creation until execution. Start from pushed baseline `4b02a6a`, then record all later dirty/untracked paths and their owners. |
| Q01 / Q02 / Q03 / Q04 / Q05 | PARTIAL / PARTIAL / PARTIAL / REMAINING / REMAINING | `package.json:9-13` still couples browser smoke into `test`/`check`; `madge.webpack.cjs:3-11` has aliases but no query-normalizing/fail-on-skipped-local proof; `tools/browser-smoke.mjs:127-139,244-290` silently greens unavailable WebGL and combines touch+reduced motion; no durable warning/catch inventory exists; `tools/check.sh:84-100` still treats the named mobile fail-band as success and `tools/capture.py:847-850,896-904` writes `_check` beneath its output by default. |
| P01 / C01 / C02 / C03 / C04 | REMAINING / PARTIAL / PARTIAL / REMAINING / PARTIAL | The smoke harness and current `tools/scroll-touch-gates.mjs`/`tools/test-chapter-entry.mjs` are foundations, and `4b02a6a` contains passing delayed-tail, route-gain, and Connect camera-motion regressions, but there is no fixed reference-environment record, separate live desktop/touch/reduced scenarios, fault-injected transition suite, deterministic composed choreography/resource/performance report, or late-loader portrait suite. The historical focused commands below are REVALIDATE inputs; none proves the missing contracts. |
| S01 / S02 | PARTIAL / PARTIAL | `journey/structure.js:4-51` centralizes values and indexes, but exports mutable objects and `validateJourneyStructure()` at `:57-122` validates only selected caller-supplied references, not all raw totals/bands/stops. `journey/structure.test.mjs:7-59` freezes useful route/copy/key values and passes, but not full symbol DOM/signatures or protected visible/menu ordering. Current `structure.js:24` still says `Owned` while protected `content/content.js` says `Ownership`; this must be reconciled as compatibility evidence, not normalized back. |
| C05 / C06 / N01 | REMAINING / REMAINING / PARTIAL | Chapters still expose broad ad hoc shapes; `chapter-registry.js:22-41` retains module-global `preparedChapters`; `navigation.js:4-11` only normalizes a string and `chapter-interactions.js` still contains named Inspire/Connect/Owned branches. |
| J01 / J02 / J03 | PARTIAL / PARTIAL / REMAINING | Camera blend, chapter-entry, and `frame-application.js` are real seams, but transition/hero/entry state remains in `journey.js`; the orchestrator still contains named focus branches around `journey.js:981-995`; `ui.js:214-215,807,1562-1575` still reads `window.journey` and private portraits. The route-faithful navigation committed in `4b02a6a` is protected and must enter C01/C03 before extraction. |
| A02 / J04a–J04e / J05 / A05 / A05a | REMAINING | `state.js`, `scroll.js`, `ui.js`, `rail.js`, `dial.js`, registry, GPU preparation, and page handlers still install anonymous or non-detachable work; `scroll.js` still combines input classification, credit/wall policy, and route mapping; `journey.js:1361-1449` exposes no facade `dispose()`, and `main.js` singleton handlers have no installation-count proof. The new preboot/live rail adoption makes A02 a prerequisite, not completed work; A05 decides whether A05a is required before J01. |
| R01 / R02 / R03 / R04 | PARTIAL / REMAINING / PARTIAL / PARTIAL | `organism/animation.js:4-48` owns a scheduler but returns no stop handle; intro acceleration owns recursive RAF/global clock mutation; organism/spores listeners remain attached; `organism/renderer.js` and portrait helper files are useful seams but do not compose idempotent resource or async cancellation. |
| R05 / R06 / R07 / R08 | REMAINING | Connect/Inspire/Owned/Final facades and the module-global registry do not provide the frozen descriptor-wide disposal and two-instance proof. Existing isolated disposers (for example Final interaction/ring helpers) are partial leaves, not facade closure. |
| U01a / U01b / U01c / U01d | REMAINING / PARTIAL / REMAINING / REMAINING | `cards/index.js:48-65` has an acyclic builder map, but `:67-112` still self-starts warming at import and mixes registry/icons/scheduling; `cards/discord.js:192-220,438-466` still self-starts fallback/live preparation and owns uncancelled idle/timer/fetch settlement. |
| U02 / U03 / U04 / U05 / U06 | PARTIAL / REMAINING / PARTIAL / PARTIAL / REMAINING | `journey/ui/` contains useful DOM, gesture, arrival, live-region, and label leaves, while the state machines and listeners remain in the 3,044-line facade. Current `ui.js:1635-1655` and `journey/chapters/connect/index.js:502-517` independently measure/query the rail exclusion: U05 must create one policy owner and inject the result into Connect; no pass-through wrapper is warranted. |
| O01 / O02 | PARTIAL / REMAINING | `organism/renderer.js`, `random.js`, `shaders.js`, and `performance.js` are foundations, but postprocessing/resource composition and cohesive seeded world-builders remain in `organism.js`; there is no byte/order/resource proof for extraction. |
| H01 / H02 / H03 / H04 / H05 / H06 | REMAINING | `substrate.js`, `tendrils.js`, `ring.js`, `canopy.js`, `terrain.js`, and `clones.js` remain 1,082–1,842-line builders. No order has a frozen build/resource/runtime contract plus focused lifecycle, byte, capture, review, and acceptance evidence. H02 must consume the U05 rail-exclusion capability rather than preserve its current direct DOM query. |
| A01 / A01a / A03 / A04 / A06 and conditionals | REMAINING | No post-lifecycle responsibility/state decision artifacts exist for portraits, Inspire, Final, or spores. Conditional extractions remain untriggered until those evidence-backed decisions; do not pre-create them. Scroll cohesion is decided earlier by A05/A05a. |
| B01 / B02 / B03 / B04 / B05 | REMAINING | `main.js` still owns global failure handlers, responsive layout, early input, async prepare, preboot/live-rail adoption, and activation handoff. The `4b02a6a` `index.html`, `hero.css`, `main.js`, rail/site CSS, and captures define protected user intent; later dirty `rail.js`/`site.css` work is protected too. B03/B04 must preserve, not redesign, it. The removed Explore CTA still has null-tolerant consumers in `main.js` and `journey.js`; B01 must classify them and B04/B05 may remove them only after the new rail handoff contract is frozen. |
| F01 / F02 / F03 / F04 / F05 / F06 | PARTIAL / PARTIAL / PARTIAL / PARTIAL / REMAINING / REMAINING | Constants/symbol/route/tooling foundations exist, but competing exports/history remain; current symbol/content/static/preboot-SVG edits require compatibility fixtures; scanner evidence is stale; and the exact catch inventory above has not been classified or closed. Committed `DEPLOY.md:61-92` now advertises a manual `git add -A`/commit/push quick path alongside the earlier exact-path `tools/release.sh` contract; F04 must reconcile the executable truth and documentation without running either release path. |
| G0 / G1 / G2 / G3 / G4 / G5 | REMAINING | No gate has the required ledger, package reviews, source-freeze served-closure hashes, required live scenarios, resource/performance report, RX verdict, and coordinator acceptance. |

The visual/behavior work now committed in `4b02a6a`, plus later user edits, is
protected user intent, not evidence that an
elegance order landed. In particular preserve the preboot-to-live rail handoff,
horizontal rail/menu and hero choreography, route-faithful Mission/Inspire
flight, copy/arrival behavior, rail collision/exclusion, Connect ADOS placement,
current content/symbol/static ordering, and all five protected capture bytes
(including the large Owned desktop size change). Do not
refresh, re-bless, or normalize those captures during this program.

The recovered Codex session and its investigation artifacts record the
continued-travel/overshoot, Connect stall-then-roll, responsive-camera, and
ground-network-placement problems. Their corrections and focused tests are now
part of `4b02a6a`; they are protected corrective work, not elegance completion.
X00 must coordinate ownership and C01 must independently validate the fixed
case and reproduce or explicitly clear any remaining symptom before J01. Any
remaining reproducible defect gets a separate root-approved corrective brief;
it is not silently frozen as desired behavior or opportunistically fixed by
structural extraction.

Historical focused audit evidence on the pre-`4b02a6a` snapshot: `node
journey/structure.test.mjs`, `node tools/scroll-touch-gates.mjs`, `node
tools/test-chapter-entry.mjs`, and `node tools/test-static-content.mjs` all
passed, as did `node --check` for `main.js`, `journey/journey.js`,
`journey/ui.js`, `journey/rail.js`, `journey/chapter-registry.js`, and
`organism/organism.js`. After the concurrent answered-wall restart and its
delayed-momentum-tail case settled, `node tools/scroll-touch-gates.mjs` was
re-run and all cases passed. Browser/WebGL,
capture, and full suites were deliberately not run. These results are
REVALIDATE inputs at X00/G0, not gate acceptance.

## Non-negotiable invariants

Do not change any of the following unless a later, separate product brief says
to do so:

- hero composition, hero sizing, sidebar/navigation effects, rail placement,
  DOM order, CSS classes/IDs, ARIA behavior, copy, symbols, links, or asset URLs;
- route values, aliases, hash/query behavior, camera paths, fog, lens behavior,
  wrap behavior, transition timing, or frame application order;
- card warming delay, sheet drag thresholds, copy/hotspot/card timing, focus
  return, keyboard/pointer behavior, or reduced-motion behavior;
- RNG seeds or draw order, portrait dealing semantics, geometry attributes or
  byte output, draw ranges, shader source, uniform names, material flags, TAA
  jitter, `dt` clamping, freeze behavior, or performance calibration;
- direct source serving, `main.js` as the browser entry point, the local Three.js
  import map, static fallback, capture/live-build flags, QA methods, or
  visitor-safe failure fallbacks.

Never restore, reset, checkout, stash, clean, autoformat broadly, refresh
goldens, or regenerate production assets as part of structural work. The user
has intentional concurrent changes. At the start of every package, record the
status and hashes of its exact allowlist plus protected visual files. At the end,
classify every changed path as allowlisted agent work, pre-existing work, or
concurrent external work; stop only on an unexplained agent-owned path. Never
overwrite or restore work in the latter two categories.

Capture comparison must write fresh images outside the repository. A check that
overwrites tracked `_check` images is mutating even when it does not refresh the
golden source and is not permitted during this program.

## Target architecture

```text
main.js
  -> journey facade
       -> immutable structure/indexes
       -> chapter registry + normalized chapter descriptors
       -> transition controller
       -> fixed-order frame pipeline
       -> UI facade
            -> hotspot/zone registry
            -> disclosure/card controller
            -> copy/arrival controller
            -> projection/layout engine
       -> chapter facades
            -> build graph
            -> runtime/update
            -> owned resources + dispose

organism facade
  -> renderer/postprocessing owner
  -> animation scheduler owner
  -> input/listener owner
  -> cohesive world builders
  -> public runtime + idempotent dispose
```

Stable compatibility facades remain in place throughout. New collaborators take
explicit callbacks, clocks, schedulers, descriptors, or resource registries.
They do not read `window.journey` or reach into private chapter fields.

## End-state in plain English

The website looks and behaves exactly like the user-approved version, including
the hero and navigation sidebar effects, but the implementation no longer feels
like one continuous hidden machine.

- `main.js` boots the page and owns only page-lifetime infrastructure.
- The journey facade composes a validated manifest, an instance-owned chapter
  registry, one transition controller, one fixed frame pipeline, and one UI
  facade. It does not contain chapter-specific branches or multiple transition
  machines.
- Chapter identity, route, aliases, symbols, copy bands, navigation, and
  interaction ownership come from one immutable validated model.
- Every chapter implements a small core lifecycle contract and opts into
  separate capabilities for focus, interaction, selection, and visibility.
- UI hotspots, disclosure/cards, copy arrival, and projection/layout each own
  their state. The UI can be destroyed without leaving a timer or listener.
- The organism scene owns its animation, intro acceleration, input, renderer,
  GPU resources, and teardown. Recreating it does not duplicate work or leak.
- Portrait loading and texture replacement have explicit cancellation and
  ownership; late async results cannot mutate a disposed chapter.
- Large renderers remain large only when their geometry is genuinely cohesive.
  They are not split into decorative utility modules that hide ordering or RNG.
- Cheap deterministic checks answer most package-level questions in seconds.
  Browser, WebGL, capture, and performance checks run at explicit risk/wave
  gates under one owner, with environment failures distinguished from regressions.
- A contributor can locate the owner of a behavior, change it through a narrow
  contract, run the relevant focused test, and understand the blast radius
  without reading thousands of unrelated lines.

That is the intended elegance: explicit ownership and locally provable behavior,
not maximal abstraction or the smallest possible files.

## Execution waves

### Wave 0 — Protect the baseline and make the gates honest

#### E0.1 — Package-level worktree guard

Deliverables:

- define an exact file allowlist for every package;
- record a baseline manifest of path hashes plus the initial dirty/untracked
  ownership ledger for allowlisted files and protected visual files;
- create an external per-package patch journal with exact before/after byte
  copies, rolling manifests, and agent-owned hunk coordinates;
- require a pre-write byte assertion against the reserved or last agent-written
  state before every patch;
- record the current expected hero/sidebar behavior and chapter-arrival events;
- establish one browser-lane owner so concurrent agents never contend for it.

Acceptance:

- classify end-of-package changes as allowlisted agent changes, pre-existing
  changes, or concurrent external changes;
- never overwrite or restore a pre-existing or concurrent external change;
- stop on any unexplained agent-owned path outside the allowlist;
- rollback only verified journalled agent hunks, never a whole-file restore;
- no staging, commits, or new worktrees unless the user explicitly authorizes a
  durable snapshot and integration workflow;
- `git diff --check -- <package-allowlist>` passes after every package; unrelated
  pre-existing whitespace errors are reported, not attributed to that package.

Estimate: 0.25–0.5 day.

#### E0.2 — Separate and harden the quality scripts

Refine the package scripts into these explicit layers:

- `test:unit`: schema, route math, flags, scroll model, alias normalization,
  chapter entry, and content derivation;
- `test:contracts`: fake scene/chapter/UI/animation/portrait lifecycle tests;
- `test:static`: non-browser accessible source/generated-content semantics and
  drift; no-JavaScript runtime behavior remains a browser scenario;
- `test:browser`: environment-aware browser smoke with explicit skip reporting;
- `test:browser:required`: fail when Chromium or required WebGL is unavailable;
- `check`: lint, complete cycle analysis, unit, contracts, and static;
- `check:browser`: `check` plus browser coverage.

Add a non-mutating normalized analysis entrypoint or resolver hook that strips
browser cache-query suffixes before Madge resolution. Treat `playwright-core` as
an explicit approved external dependency; fail on every skipped or unresolved
local production module. Keep build, capture regeneration, release, and
deployment outside normal checks. Wire `journey/structure.test.mjs` into
`test:unit` rather than leaving it outside the package test graph.

Pure UI contract tests use narrow injected element/event, clock, media-query,
focus, and scheduler doubles. Real DOM order, ARIA, focus, responsive layout,
and CSS-visible behavior stay in Playwright. Do not add a DOM emulator by
default. Deliberate perturbation uses fixtures/fakes, never temporary edits to
production source.

Acceptance:

- each script has one clear contract and useful exit status;
- absent Chromium/WebGL cannot create a false application green;
- dependency analysis reports no skipped or unresolved production entrypoint;
- every frozen capture fail-band is a real failure; a coordinator may classify
  a documented environment exception, but it remains a non-pass that blocks
  completion and release readiness;
- no check rewrites source or generated artifacts.

Estimate: 0.5–1 day.

#### E0.3 — Inventory warnings and define error-handling policy

Assign every current lint warning to the later package that owns its file rather
than editing all architectural hotspots in Wave 0. Each package must leave its
allowlist warning-free and the global warning count may never increase; the
remaining budget ratchets to zero as packages land. Remove genuinely unused
imports and dead assignments; name intentionally ignored arguments consistently;
document and test side-effectful assignments rather than suppressing them.

Define one shared classification policy for optional fallback, expected probe
failure, and fatal visitor-visible failure. Implement it locally inside the
journey, organism, page bootstrap, card, or media package that owns each call
site. Do not introduce a shared runtime error abstraction unless concrete
duplicate behavior—not merely common terminology—justifies it. Add a final
closure package for mapped error sites untouched by other work.

Acceptance:

- every warning has an owning package and no package introduces a warning;
- targeted ESLint runs with `--max-warnings=0` on every completed allowlist;
- no empty catch exists without an explicit classification and test;
- visitor-safe fallbacks remain observable and subsystem-local.

Estimate: 0.5–1 day.

### Wave 1 — Characterize behavior before moving ownership

Before characterization, prove one supported reference Chromium/WebGL
environment with fixed browser version, renderer, viewport, DPR, and capture
flags. It must pass the required live preflight and provide a writable external
capture directory. Stop here if that environment is unavailable rather than
accumulating changes that cannot reach their first visual gate.

#### E1.1 — Journey and UI characterization

Add behavior-level tests for:

- hero entry/exit and the current sidebar/navigation effect;
- direct navigation, aliases, wrap steering, cancellation, reversal, and
  natural versus forced landing;
- raw wheel/touch delivery, physical or inferred gesture boundaries, arrival
  walls, boot replay, stall attribution, and the rule that one physical gesture
  may answer at most one new rest while two deliberate pulses may answer two;
- delayed, long, and coalesced momentum tails; multiple events per frame;
  RAF-before-event ordering; visible long frames; background resume; reversal;
  exact touch contacts; and genuine rapid repeats;
- camera-writer ordering, `dt = 0` placement, and one immutable per-frame
  presentation snapshot shared by every downstream reader;
- card/popover tiers, Escape dismissal, focus return, touch sheet thresholds,
  hover/focus parity, copy arrival, and reduced motion;
- DOM/ARIA order without asserting internal module names.

Freeze three narrow trace contracts during characterization:

- factual input only:
  `ScrollInputSample { sampleId, kind, sourcePhase, eventTs, deliveryTs,
  deltaPx, contactId, visibilityEpoch, frameEpoch }`, where `sourcePhase` is a
  raw event phase and never an inferred gesture boundary;
- discriminated semantic decisions:
  `ScrollDecision { type: 'gesture-start' | 'gesture-continue' | 'gesture-end'
  | 'manual-takeover' | 'arrival' | 'retire', gestureId, causeSampleId,
  reason, targetP, answeredP, routeP }`;
- diagnostic telemetry only:
  `ScrollTelemetry { sampleId, frameEpoch, stallDiscountMs, creditPxPerS,
  surfacePx, displayedRate }`.

Names may change in the root-authored interface, but the separation may not:
samples record facts, decisions express semantic state changes, and heuristic
telemetry cannot authorize a transition or become part of a public decision
contract. Preserve a causal sample/decision trace rather than forcing a
decision for every sample: every decision cites its causing
sample or frame, while a sample may yield no decision and a frame decision may
be trace-linked. Endpoint-only tests are insufficient; the trace must show why
a tail was retained, retired, or classified as a new gesture.

Characterize live behavior in three bounded environments: normal-motion desktop,
touch/mobile including sheet thresholds, and live reduced motion. These run at
gate seams, not in each implementation package. The normal desktop and touch
scenarios must actually traverse consecutive rests and emit raw-event,
event-to-frame, decision, route, presentation, and arrival traces. Record at
least one real trackpad momentum-tail and deliberate two-pulse reference with
browser/OS/input provenance; Playwright-generated wheel events alone cannot
prove physical gesture identity.

#### E1.2 — Rendering and lifecycle characterization

Record and test:

- animator registration order and failure isolation;
- RNG draw counts at stable seams;
- geometry attribute/index schemas, counts, draw ranges, and baked bytes;
- renderer memory/draw-call baselines and listener/RAF counts;
- portrait deal atomicity and late image-load behavior;
- repeated boot/prepare/dispose cycles.

Also record deterministic composed-motion traces across every route segment:
route gain, camera-pose derivative, and the screen projection of stable world
landmarks. Exact traces must contain no unintended interior stop followed by
re-acceleration and no direction reversal. In the supported live environment,
record long tasks, RAF gaps, style/layout counts, and event-to-frame latency so
application stalls cannot silently be reclassified as visitor pauses. Numeric
trace contracts are deterministic; live frame-time thresholds remain soft and
environment-specific rather than flaky screenshot-speed assertions.

Connect receives an explicit choreography fixture at named progress samples in
landscape, phone portrait, and portrait-tablet compositions. Each sample records
`stateP`, `routeP`, `presentedP`, the final post-responsive/post-blend camera
pose and derivative, camera-derived ground resolve, the three route-front
positions and hub-ignition states, and projections of the stipe base, all three
hub cores, route endpoints, and the seeded hero-ground ADOS nexus. The fixture
freezes the authored distinction: the ground network and its destinations
pre-exist at their settled responsive placement; only light travels. It must
fail if route progress is smooth while final screen motion stops and restarts,
if responsive camera composition moves a rooted landmark during reveal, if the
Hivemind → Discord → ADOS lighting order or front windows drift, or if the
Connect hub, strand/point field, node/focus/DOM anchor, and organism ground
nexus disagree.

Record a separate direct-navigation Connect trace with readiness history,
presented camera/route coordinate, entry clock, resolve, route fronts, and the
landing handoff. Once readiness authorizes entry it cannot regress; established
ground must precede travelling light; and the final `driveEntry` frame must be
continuous with `drive(rest)`. If current behavior reproduces the recovered
level-gate/fixed-clock mismatch, resolve it through a separate corrective brief
before J01/J02 may consume the behavior. Do not silently redefine the authored
scroll pacing during structural work.

Preserve the recovered negative performance result too: trusted Chrome traces
found a warm 10–12 ms Connect onset with no compile, GC, or long-task spike.
Later work may remove measured frame-loop layout reads, but it must not justify
shader, particle, or GPU redesign with this incident unless a new supported
trace first contradicts that evidence.

Store these measurements in a small report schema that records the supported
browser, renderer, viewport, DPR, capture flags, and hardware/software renderer.
Treat geometry schemas, draw ranges, listener counts, and RAF counts as exact.
Treat frame-time and GPU metrics as soft comparisons with a documented tolerance
on one supported reference environment; never compare those numbers across
unrecorded GPUs.

Acceptance for Wave 1:

- focused tests fail when an invariant is deliberately perturbed;
- browser tests distinguish environmental failure from application failure;
- no implementation extraction begins before its characterization test exists.

Estimate: 1.5–2.5 days. Journey and rendering characterization can proceed in
parallel because their source allowlists do not overlap.

### Wave 2 — Establish canonical contracts

#### E2.1 — Harden the immutable journey manifest

Make `structure.js` the validated boundary for chapter/node identity, route and
copy-band ordering, segment totals, hotspot cardinality, navigation uniqueness,
symbols, and aliases. Export frozen or defensive indexes. Remove validation that
changes depending on optional caller-supplied reference subsets.

Freeze the current protected visible navigation/menu/content ordering before
choosing canonical values. The current `Ownership` label and menu ordering must
not be overwritten by older schema text, and visible menu order must not be
mistaken for seeded chapter/node build order.

Validate raw manifest segment values and totals before route derivation. Do not
rely on the current `route.js` console diagnostics as schema enforcement.

Do not change any exported route number or public registry shape during this
package; compatibility adapters remain.

Acceptance:

- malformed bands, stops, segment totals, navigation IDs, aliases, symbol
  coverage, and duplicate ownership fail focused tests;
- existing route/copy/symbol values compare exactly to the baseline.

Estimate: 0.75–1 day.

#### E2.2 — Normalize chapter contracts and registry ownership

Keep the core descriptor narrow: `id`, `group`, frame driving, entry, natural
landing, forced placement, and `dispose`. Expose focus, interaction, selection,
and visibility as separate optional capability objects with explicit ownership.
Create a per-chapter migration table from current methods instead of one broad
duck-typed interface. Move Inspire-specific and Owned-portrait adapters behind
those capabilities.

Replace module-global `preparedChapters` with an explicit registry instance that
supports `prepare(sceneApi)`, `build(sceneApi)`, and `dispose()`. Migrate the
current `main.js` prebuild call and `journey.js` build call atomically so the
deferred-preparation path cannot observe a different registry instance.

Preserve existing chapter module methods through adapters until all consumers
move.

Acceptance:

- fake chapters prove registration order, optional-hook defaults, cardinality,
  entry/landing call order, focus handling, and disposal;
- prebuilt-before-boot, build-without-preparation, two simultaneous scene
  instances, and disposal without cross-instance reuse all pass;
- UI and journey orchestration no longer inspect private `portraits` fields;
- missing required hooks fail during preparation with a visitor-safe fallback.

Estimate: 1–1.5 days.

#### E2.3 — Resolve navigation through canonical ownership

Make navigation return a validated `{ chapter, node }` target rather than a
loosely normalized string. Remove hard-coded chapter branches from interaction
registration while preserving `final`, aliases, hashes, and public QA behavior.

Acceptance:

- all current URLs resolve identically;
- unknown targets fail explicitly;
- interaction registration is manifest-driven and contains no named chapter
  branch.

Estimate: 0.5–0.75 day.

Dependency: E2.1 precedes E2.2 and E2.3.

### Wave 3 — Give runtime state one owner

Two lanes can run in parallel after Wave 2.

#### Lane A: journey transition and UI ownership

Before extracting transition orchestration, complete E3.A4's state/scroll input
slice, then immediately perform the execution runbook's A05 scroll-cohesion
audit. Record a responsibility/state map for physical or inferred gesture
classification, credit/arrival-wall policy, and pure pixel-to-route mapping. If
those responsibilities still share mutable closure, execute the runbook's
conditional A05a split before E3.A1. This ordering prevents a cleaner transition
facade from merely depending on the existing temporal god object.

##### E3.A1 — Transition controller

Extract direct jumps, wrap steering, cancellation, reversal, hero gates, camera
blend ownership, and chapter-entry tickets into `transition-controller.js`.
Inject clock/path/entry collaborators. Consume semantic `gesture-start`,
`manual-takeover`, and `arrival` decisions through the characterized scroll
contract; the transition controller must not read raw timing heuristics such as
`sinceInput`, gesture-credit counters, or `answeredAt`. Keep exact timing and
formulas.

Acceptance: endpoint, monotonic path, cancellation, reversal, rewind, natural
landing, forced placement, and rapid navigation tests all pass.

Estimate: 1–1.5 days.

##### E3.A2 — Fixed-order frame pipeline

Move camera composition, seam updates, chapter drives, lens focus, and UI
projection into a pipeline whose order is declared once and tested with spies.
Remove chapter-specific focus and portrait branches from the orchestrator.

After the complete camera write—including responsive portrait/tablet
composition and any active navigation blend—publish one immutable
`FrameSnapshot { stateP, routeP, presentedP, cameraPose, viewport,
aspectProfile, transitionPhase, dt }`. Seams, chapters, lens, rail, hero, and UI
consume that same snapshot rather than selecting independently among `p`,
`travelP`, `frameP`, or mutable camera state. A camera-coupled chapter such as
Connect derives resolve/readiness from `snapshot.cameraPose`; it may not
re-read `sceneApi.camera` after publication or run a second responsive pose
calculation.

Acceptance: final-camera-before-reader order is executable; frame output and
visual captures do not drift; fixed-`dt` traces prove monotonicity, reversal
continuity, landing reconciliation, monotone direct-entry readiness, and exact
Connect ground/front projection across the three responsive compositions;
`journey.js` becomes a boot/public compatibility facade.

Estimate: 0.75–1 day.

##### E3.A3 — Replace UI global lookups with injected capabilities

Introduce a narrow UI runtime interface for navigation, selection, chapter
interaction, clock, media queries, and public QA compatibility. Keep
`window.journey` only at the top-level compatibility boundary.

Acceptance: lower UI modules contain no `window.journey` read and no private
chapter-shape access; initialization-order tests pass.

Estimate: 0.5–1 day.

##### E3.A4 — Journey lifecycle owner

Treat journey disposal as an XHARD design family followed by five independently
reviewable and rollback-safe implementation packages:

1. state and scroll timers/listeners, including anonymous visibility/hash/input
   ownership, a detachable input owner, and the characterized factual-sample →
   semantic-decision boundary with diagnostic telemetry kept non-authoritative;
2. UI and rail timers/listeners/backdrop ownership, after freezing the rail
   page-versus-journey lifecycle decision;
3. dial and chapter-owned global hooks;
4. registry/preparation cancellation, including pending `prepareGpu()` work;
5. facade generation, journey animator removal, compatibility-global cleanup,
   and repeated recreation.

The final facade exposes an idempotent journey-level `dispose()` that composes
those five owners. No child package may silently absorb another child's state.

Treat `main.js` error, rejection, skip-link, resize, keyboard, click, and boot
timer handlers as explicit page-lifetime singleton infrastructure: they install
once per module/page load and are not part of journey re-creation. Document and
test that boundary. If the application later supports re-running the page
bootstrap without a navigation, introduce a separate top-level bootstrap
disposer before enabling that behavior.

Acceptance: boot → prepare → activate → dispose → recreate passes twice,
including disposal during GPU preparation, transition, card disclosure, and
chapter entry. Journey-owned handlers do not accumulate; page-lifetime handlers
remain singletons. No timer, listener, animator, async callback, or compatibility
global may mutate the disposed journey instance.

Estimate: 2–3 days across the five lifecycle packages and integration proof.

#### Lane B: rendering lifecycle ownership

##### E3.B1 — Stoppable animation lifecycle

Make `start()` return an idempotent stop handle. Inject the RAF scheduler and
clock for tests. Preserve a single shared clock, insertion order, failure
isolation, `dt` clamping, and freeze semantics.

The intro accelerator is a separate RAF owner: add an explicit cancellation or
`dispose()` handle to `organism/intro.js` and cascade it from scene disposal.
Restore any temporary clock/performance behavior it owns before disposal
returns.

Acceptance: start/stop/restart and double-dispose tests prove that no callback
runs after stop. Disposing during intro acceleration cancels its recursive RAF
and proves that no later clock patch or callback affects the disposed scene.

Estimate: 0.75–1 day.

##### E3.B2 — Scene input and resource disposal

Give resize/pointer listeners, controls, renderer, composers/TAA targets,
textures, geometries, materials, and timers explicit owners. Expose an
idempotent `dispose()` from the scene facade and remove spore listeners.

Acceptance: repeated create/dispose leaves zero owned listeners/RAF/timers;
renderer memory returns to the characterized baseline; normal runtime ordering
and output are unchanged.

Estimate: 1–1.5 days.

##### E3.B3 — Portrait async and texture ownership

Replace the late-resolution boolean guard with real cancellation where the
platform permits it and a deterministic late-result discard otherwise. Maintain
an explicit texture ledger (`permanent`, `current`, `pending`, `retired`) and
document the renderer-facing mutation performed by contributor dealing.

Acceptance: late success, late failure, redeal, repeated disposal, and
double-disposal tests show no post-dispose mutation or leaked texture.

Estimate: 0.75–1 day.

##### E3.B4 — Propagate disposal through every chapter

Every chapter descriptor must dispose its listeners, animators, loaders, and
owned resources. Final document listeners and prepared-chapter caches must be
instance-owned and removable.

Acceptance: rapid prepare/away/back/teardown tests pass in baked and live modes;
no visible chapter is disposed early.

Estimate: 1–1.5 days.

### Wave 4 — Cohesive extraction behind proven contracts

#### E4.1 — Split cards by responsibility

Separate builder registry, icon metadata, and warming scheduler. Replace the
import-time timer with an explicit start/stop scheduler invoked at the same
1500 ms boundary. Keep builder exports, build-once behavior, asset order, and
activation semantics intact. Give the UI/journey lifecycle owner the scheduler
stop handle before asserting that destruction clears all timers.

Treat Discord preparation as a separate lifecycle owner: its import-time idle
work, timers, remote fetch, late settlement, and deactivation cancellation must
be explicit and testable rather than hidden in module evaluation.

The root-frozen caller contract is that the UI facade creates and synchronously
starts one card-preparation lifecycle at the characterized boot epoch and owns
its stop/dispose handle through `ui.destroy()`. J04e may release it only by
cascading `ui.destroy()`; journey code must not reach into card internals, and
card modules must never self-start during import.

Acceptance: lazy build-once, warming order/timing, activate/deactivate
idempotence, Discord preparation/failure/late-settlement behavior, and
cancellation-on-dispose tests pass.

Estimate: 0.75–1.25 days across scheduler, registry, and icon-data packages.

#### E4.2 — Decompose the UI facade

Extract in this order, one package at a time:

1. hotspot and hover-zone registry;
2. popover/card disclosure controller;
3. copy/arrival controller;
4. projection/collision/layout engine, including one rail-exclusion policy that
   supplies an injected measured value to UI and Connect consumers;
5. facade-owned `destroy()` that cascades through all UI collaborators.

Keep `createUI`, current DOM construction, CSS hooks, timing constants, and
public methods stable. Remove wrapper functions that add no policy after their
callers move.

Acceptance after every extraction:

- focused DOM/ARIA/input tests pass;
- no listener or timer survives `destroy()`;
- hero/sidebar/navigation captures remain at the current user-approved baseline;
- no extracted module owns state that another module mutates directly.

The layout contract publishes an immutable
`RailExclusionSnapshot { revision, viewport, rect }`. Its owner performs a
write → measure → publish pass once per invalidation. UI, Connect, and the H02
runtime perform zero rail DOM queries or geometry reads during frame drive;
fake counters prove this exactly before soft live-performance comparison.

That snapshot is measurement input, not ground-placement authority. Connect
owns one responsive screen-to-ground placement solver evaluated against the
settled responsive Connect camera and docked rail rectangle, never the
travelling camera or rail animation. It publishes one destination/delta before
the chapter can reveal. Connect's hub core, strand and point materials,
node/focus/DOM anchor, and the organism's seeded hero-ground ADOS nexus consume
that same result. The rooted feather back to the undisturbed ground remains
planted. No consumer recomputes a responsive destination or keeps a second
placement clock.

Estimate: 2–3 days total.

#### E4.3 — Split organism construction only at ownership seams

Move renderer/postprocessing/resize ownership fully behind the renderer facade;
move input behind its owner; group tightly coupled geometry construction in one
`world-builders` module rather than creating a utility file per primitive.

Acceptance: shader strings, RNG order, geometry bytes, animator order, and draw
ranges match exactly. The seeded hero-ground nexus keeps its exact source,
attachment weights, and feather topology and consumes Connect's one placement
delta without a second camera/layout calculation. Renderer memory and frame
timing use the Wave 1 reference environment/report schema and documented
tolerances.

Estimate: 1–1.5 days.

#### E4.4 — Split large chapter renderers conservatively

Treat `substrate`, `tendrils`, `ring`, `canopy`, `terrain`, and `clones` as six
independent packages. Each package may add at most three collaborator modules,
where those responsibilities genuinely exist:

- static graph/build;
- materials and owned resources;
- runtime update and disposal.

Complete, review, capture, and accept one source package before the next renderer
write begins. Preserve placement ownership across files as an explicit data
contract. For Connect tendrils this includes authored hub world anchors, route
topology/order and normalized lengths, lighting windows, the planted root/feather
weights, and exact landscape/phone/tablet projections at the C03 checkpoints.
The tendril package consumes Connect's one responsive destination/delta and may
not own camera, viewport, or rail policy. Stop when the remaining file is
cohesive, even if it is still long.

The organism world-builder order and Connect tendril order alter opposite ends
of the same ADOS ground-junction contract. Their read-only reconnaissance may
overlap, but their implementation, review, deterministic projection proof, and
acceptance are serialized even when their path allowlists are disjoint.

Acceptance: rebuild byte checks, focused lifecycle tests, performance counters,
and captures pass after each individual source split. Connect additionally
proves core/strand/point/node/focus/DOM/hero-ground alignment, exact rooted
feather behavior, placement-before-reveal, and no response to travelling camera
or rail-docking motion.

Estimate: 3–5 days total. Read-only reconnaissance may parallelize across
disjoint files; implementation, review, capture, and acceptance remain serial.

#### E4.5 — Reduce `main.js` to a page bootstrap facade

After journey, UI, and scene lifecycle boundaries stabilize:

1. freeze a responsibility/state map for every global handler, timer,
   responsive layout calculation, early-input buffer, intro transition, failure
   path, and lazy journey handoff;
2. extract page-level failure reporting and singleton handler ownership;
3. extract responsive hero/sidebar layout behind an explicit page-layout owner
   that invalidates and consumes the sole U05 rail snapshot owner;
4. extract boot-input buffering and intro/scene/journey handoff;
5. leave `main.js` as the direct browser entry, composition, and compatibility
   facade.

The responsive-layout and handoff packages are XHARD. Preserve the user's
current hero/sidebar hunks, entry/import-map behavior, handler installation
count, early input, intro skip, fallback, prepare order, and all breakpoints.
The responsive-layout package consumes the already accepted U05
`RailExclusionSnapshot` as its parent contract. It may invalidate that sole
snapshot owner after page-layout writes, but it may not measure rail geometry,
publish a competing snapshot, or create another rail-layout authority.

Acceptance: `main.js` coordinates page boot rather than implementing unrelated
layout and lifecycle systems; approved hero/sidebar captures and all focused
handoff/lifecycle/browser tests pass.

Estimate: 2–3 days.

#### E4.6 — Prove residual runtime cohesion

Freeze `journey/rail.js` page-versus-journey lifecycle ownership before the E3.A4
UI/rail teardown slice. After the relevant lifecycle work, independently audit:

- the remaining `portraits.js` geometry/material/runtime coordinator;
- `journey/chapters/inspire/index.js`;
- `journey/chapters/final/index.js`;
- `organism/spores.js` after listener ownership moves.

For each file, record an evidence-backed responsibility/state map and cohesion
exception when it has one genuine owner. If unrelated owners remain, insert one
root-defined extraction package with its own review and rollback seam before the
Wave 4 gate.

Acceptance: no large runtime is accepted merely because it missed the original
queue. Each audited file is cohesive and documented or its remaining independent
owner has been extracted and verified.

Estimate: 1–3 days depending on conditional extractions.

### Wave 5 — Remove competing sources and prove the result

#### E5.1 — Consolidate constants, symbols, and historical route material

Split constants by domain (`scroll`, `copy`, `ui`, `scene`) without changing
exports. Separate symbol data/signatures from DOM rendering. Replace commented
duplicate routes and legacy runtime assertions with fixtures/tests once the
canonical manifest proves equivalence.

Acceptance: no duplicate route source remains; public exports and every numeric
value remain compatible; symbols render and sign identically.

Estimate: 1–1.5 days.

#### E5.2 — Reconcile documentation and scanner classification

Update stale tool paths and deploy wording. Configure scanner zones/entrypoints
for HTML/import-map roots, generated ownership data, vendor code, and manually
loaded QA scripts. Categorize every orphan before resolving it; do not hide debt
with broad exclusions or `wontfix` attestations.

Acceptance: documentation matches executable scripts; scanner false positives
are explained by precise configuration; a fresh scan has no stale-config flag.

Estimate: 0.5 day.

#### E5.3 — Integrated proof and independent review

Run, in order:

1. warning-free lint;
2. dependency analysis with no skipped production entrypoint;
3. unit, contract, static, chapter-entry, scroll/reveal/input, and content tests;
4. deterministic geometry/meta rebuild checks;
5. environment-aware browser smoke;
6. required live Chromium/WebGL journey tests in a supported environment;
7. capture comparison without refreshing goldens;
8. desktop/mobile manual checks for hero, sidebar, navigation, cards, chapters,
   reduced motion, rapid navigation, fallback, baked, and live-build modes;
9. renderer memory, draw-call, listener, RAF, and frame-time comparison;
10. fresh mechanical scan followed by independent subjective review.

The branch is not complete while the live test is merely timing out. That is an
environment limitation, not an application failure, but a supported environment
must produce a real pass before release readiness is claimed.

Estimate: 1–2 days, including investigation time for environment-only failures.

## Dependency and parallelism map

```text
Wave 0 quality floor
  -> Wave 1 characterization
       -> E2.1 manifest
            -> E2.2 chapter contract -> E3.A journey lane -> E4.1 cards -> E4.2 UI
            -> E2.3 navigation       -> E3.A journey lane
       -> E3.B rendering lane -> E4.3 organism -> E4.4 chapter renderers
       -> stable Wave 3/4 boundaries -> E4.5 main bootstrap -> E4.6 cohesion proof
  -> Wave 5 consolidation and integrated proof
```

Safe parallel waves:

- journey characterization and rendering characterization;
- journey runtime ownership and rendering lifecycle ownership;
- read-only reconnaissance for individual chapter renderers; their writes,
  capture, and acceptance remain serialized for attribution.

Unsafe parallel work:

- two agents touching `journey/ui.js`, `journey/journey.js`, a shared contract,
  package scripts, or browser infrastructure;
- any browser/WebGL run while another browser lane is active;
- any source write while a browser/capture/performance gate owns a frozen served
  dependency closure;
- schema changes in parallel with consumers that depend on the old schema.

## Agent operating model

Use the main agent as coordinator and GPT-5.6 Luna as the default implementer
for bounded packages and mechanical slices. XHARD packages follow the runbook's
root-designed protocol and may use GPT-5.6 Sol for a slice that still requires
frontier cross-state reasoning. Each brief must contain:

- exact allowed files and protected paths;
- one ownership boundary, not a menu of possible refactors;
- current public contract and invariants;
- exact focused tests and stop conditions;
- an instruction never to reset, restore, stash, clean, stage, commit, regenerate,
  or edit outside the allowlist;
- a concise handoff containing changed files, preserved contract, tests, residual
  risk, and pre/post hash verification.

Use a different Luna as the read-only package reviewer for every T2/T3 or
public-contract package and as batch reviewer for at most three related
low-risk packages. Reviews that require reconstructing the architecture across
several state machines are themselves XHARD: GPT-5.6 Sol reviews the
root-authored canonical-contract, runtime/lifecycle, and visual/page designs
before their named XHARD implementations. A fresh Sol first validates the whole
evidence foundation after G1, then fresh Sol reviewers assess the integrated
results at G2, G3, G4, and G5. The runbook names these RX tasks and their
downstream holds. All reviewers are advisory; the coordinator alone
accepts work, resolves ownership, classifies regressions, and waives nothing by
implication.

Reviewers look for contract drift, new indirection without ownership value,
hidden globals, unowned lifecycle work, cross-package contradictions, and tests
that assert implementation rather than behavior. The coordinator runs only
integration checks and resolves conflicts; agents do the byproduct-heavy
searches, implementation, focused validation, and read-only review.

## Stop/go rules

Proceed to the next package only when:

- its focused characterization and contract tests pass;
- targeted lint is warning-free for the package, the global warning budget does
  not rise, and cycle analysis has no skipped production root;
- no unexpected file changed;
- no generated asset or golden was refreshed;
- no public facade or behavior changed without an explicit compatibility adapter;
- the package can be rolled back independently.

Stop immediately when:

- hero/sidebar/nav, DOM/ARIA, route, copy, URL, capture, seeded geometry, shader,
  frame order, timing, or reduced-motion behavior drifts;
- a browser harness cannot distinguish environment failure from application
  failure;
- disposal affects a still-visible chapter;
- an extraction changes closure construction order or RNG consumption;
- the proposed module has no single state/resource/policy boundary and would be
  only a smaller-file wrapper.

## Completion criteria

The elegance program is complete when:

- facades contain composition, compatibility, and public API code rather than
  several implementation state machines;
- chapter and UI consumers depend on normalized descriptors, not globals or
  private fields;
- all owned asynchronous and rendering resources have idempotent teardown;
- the page-level journey owner can cancel preparation and tear down UI,
  chapters, animation, listeners, timers, resources, and its compatibility
  global without affecting a newer instance;
- the canonical manifest is the sole source for journey identity and ordering;
- lint has zero warnings, cycle analysis has no skipped production roots, and
  all cheap checks are deterministic and non-mutating;
- live browser, visual, deterministic-byte, accessibility, input, fallback, and
  performance gates genuinely pass;
- physical-input references, deterministic event/RAF replay, semantic gesture
  decisions, immutable frame snapshots, composed-motion traces, and layout
  invalidation counters agree across the G1, G3/G4, and G5 evidence;
- an independent subjective review finds no high-confidence ownership,
  coupling, lifecycle, or contract defect;
- residual large files are demonstrably cohesive and documented, not simply
  deferred god objects.

## Estimated scope

Total: approximately 25–41 focused engineer-days plus access to a supported live
WebGL browser environment. With two carefully isolated implementation lanes and
one review lane, elapsed time is roughly 15–26 working days. This range is the
sum of the detailed package estimates and includes the likely conditional A05a
scroll separation, the required XHARD design/gate reviews, and bounded
integration evidence. The estimate assumes
behavior-preserving extraction; any visual redesign or product change must be a
separate program.

The reconciliation does not reduce this estimate: the program was already
written against the committed helper-module foundations, and none of the
remaining orders has its full frozen contract, proof, review, and acceptance.
The active UI work and recovered scroll incident add revalidation, narrow the
J04a/A05/J01/J02 and U05/H02/B03 interfaces, and make the existing conditional
A05a allowance likely. They do not justify another top-level abstraction package
or a speculative contingency allowance.
