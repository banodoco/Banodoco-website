# Wave 2 / S1 — whole-system architecture

Base: `1fa145fc51e89c8a1788db39aff98e775a576073`

Focus: interactive boot → scene → journey → chapters → UI/rail, plus ownership and static tiers. This is an evidence pass, not an implementation proposal.

## Executive judgment

The codebase has a sound conceptual spine: a deterministic scene, a single virtual journey coordinate, a derived route schema, chapter-local geometry/animation, and a deliberately accessible static tier. The main architectural risk is not its visual ambition or even the size of the coordinator. It is that the current one-shot page works through several hidden, process-wide contracts: `window.sceneApi`, `window.journey`, a mutated `performance.now`, module-singleton preparation, monkey-patched scene methods, and animator insertion order. Those contracts make boot, resize, navigation, rendering, and fallback affect each other without a narrow ownership boundary.

The most consequential verified cross-system defect is the global clock mutation during intro acceleration. The most consequential source-verified availability risk is the unbounded readiness chain: a request or decode that never settles never reaches the existing catch/fallback. The most consequential evolvability risk is that correct frame composition depends on registration chronology established across `main.js`, `journey.js`, `chapter-registry.js`, and the scene's `Map`-based animator registry.

This does **not** justify a rewrite. Several boundaries are already good and should be preserved: `state.js` is a small progress/hash owner; `scroll.js` owns the virtual input controller; `structure.js` drives route/chapter derivation and validates registries; chapter frame calls are isolated by name; static copy is checked through `data-src`. The improvement target is the handful of cross-boundary contracts, not a replacement architecture.

## Actual system topology and ownership

### 1. Boot and availability boundary: `main.js`

`main.js` is the page composition root. At module evaluation it synchronously imports the scene factory and lens, starts baked-geometry loading through the import of `ready`, and begins the asynchronous journey-module import (`main.js:12-25`). It then:

1. creates the WebGL scene (`main.js:302-318`);
2. reserves the `journey` animator slot and installs the grade (`main.js:339-361`);
3. installs responsive camera/callout behavior (`main.js:696-738`);
4. publishes the broad scene handle as `window.sceneApi` (`main.js:911-916`);
5. moves OrbitControls into journey input policy before journey activation (`main.js:946-955`);
6. builds the live rail, awaits all baked geometry, prepares chapters one per task, boots the journey, awaits GPU/photo readiness, then activates it (`main.js:1174-1255`);
7. converts only *rejected* preparation into the visitor-facing static-tier note (`main.js:1256-1269`).

This is a legitimate composition-root responsibility, but availability ownership is incomplete: the catch owns rejection, while no owner bounds non-settlement.

### 2. Scene boundary: `organism/organism.js`

`createScene()` owns renderer, composer, camera, controls, seeded hero geometry, render-size synchronization, the shared RAF clock, and the adaptive resolution governor (`organism/organism.js:66-172`, `1810-1955`). Its returned API exposes both coherent capabilities (`steadyProject`, `setHighlight`, `setView`, `addAnimator`, `setInputPolicy`, `freezeTime`) and raw mutable internals (`scene`, `camera`, `renderer`, `composer`, `controls`, `groups`) (`organism/organism.js:2069-2144`).

The render lifecycle itself is small and intelligible: named animators are held in insertion-ordered `Map` state, each animator is isolated, then `beforeRender()` and `render()` execute (`organism/animation.js:4-38`). That last distinction matters for failure propagation: animator exceptions are contained, renderer/composer exceptions are not.

### 3. Journey orchestration boundary: `journey/journey.js`

`boot()` is a one-shot process-wide coordinator: it latches `started`, reads `window.sceneApi`, constructs state/scroll/director/lens/chapters/seams/UI, attaches input, and returns a broad diagnostic/runtime handle (`journey/journey.js:106-170`, `186-283`, `1361-1449`). Its steady frame is traceable:

`scroll.update()` → `journey.setProgress/update()` → `applyFrame()` (`journey/journey.js:1262-1271`), then camera ownership/blend → seams → chapter drives → lens → hero furniture → UI/rail (`journey/journey.js:922-1007`).

That is a useful single orchestration point. The risk is not central coordination itself; it is that the coordinator also relies on mutable external globals and unwritten timing contracts.

### 4. Chapter boundary

`chapter-registry.js` maps schema runtime IDs to four factories and validates builder coverage (`journey/chapter-registry.js:1-20`). Chapters expose small behavioral surfaces to the orchestrator (`drive`, `driveEntry`, `setGliding`, node/world/reveal methods); `applyChapterFrame()` calls them without knowing internal geometry (`journey/frame-application.js:1-28`). `chapter-interactions.js` connects declared hotspot IDs to those chapter methods and validates the assembled node registry (`journey/chapter-interactions.js:6-60`).

This is a real boundary and should remain. Its ownership leak is that constructed chapters are cached in the module-global `preparedChapters` object without a scene identity (`journey/chapter-registry.js:22-41`), while constructors receive and can mutate the broad scene handle (for example Connect changes hero ground placement at `journey/chapters/connect/index.js:508-517`).

### 5. UI and rail boundary

`createUI()` owns chapter copy, cards, popovers, hotspots, responsive placement and per-frame rail updates; it accepts a stable projection capability and can adopt the preboot rail (`journey/ui.js:156-205`, `2445-2473`). `createRail()` owns the navigator and modal site-map DOM (`journey/rail.js:405-582`, `584-675`). `scroll.js` provides a small explicit input-ownership registry (`journey/scroll.js:89-116`).

This separation is conceptually good, but there are two reverse reach-ins: UI locates chapter modules through `window.journey` (`journey/ui.js:1571-1589`) and writes Owned's rail-exclusion state through `window.journey.chapters.owned` every frame (`journey/ui.js:2718-2722`). Those are hidden dependencies from view code back into scene/chapter internals.

### 6. Static and ownership tiers

The static tier is a separate progressive-enhancement application, not merely a fallback screenshot. Its five chapters and content are real HTML (`static/index.html:38-61`, `1308-1536`), while JavaScript adds still switching, routing and disclosure behavior (`static/index.html:1685-1744`). `tools/build-static-content.mjs` derives marked strings/links from `CONTENT` and checks drift (`tools/build-static-content.mjs:3-81`); a browser-side guard also compares content and symbol coverage (`static/index.html:1941-1997`).

The ownership tier is another separate application. It imports the ledger, canonical person registry and its own visual system, then renders grants, totals and contributors (`ownership/ownership.js:1-7`, `68-103`, `176-225`, `259-295`). `PERSON` is explicitly declared canonical and is joined from ownership data/reasons/portrait metadata (`content/contributors.js:1-24`, `36-46`, `265-283`).

These tiers are valid independent boundaries. The architectural problem is that their shared semantics are only partially derived: strings are guarded, but route behavior, roster meaning, site-link coverage, no-JS behavior and resource policy are independently authored.

## Highest-risk cross-cutting coupling

### A. Process-global time is overwritten by one animation feature — verified High

Intro acceleration replaces `performance.now` with a skewed function and never restores it (`organism/intro.js:208-224`). The trigger is ordinary early input (`main.js:1152-1170`). This clock is also used by scroll gesture/stall state (`journey/scroll.js:861-890`, `1668-1690`, `1713-1714`), seam dwell (`journey/seams.js:74-85`) and GPU-readiness timeout accounting (`journey/journey.js:1454-1475`).

Wave 1 measured an ~8.5-second discontinuity after one wheel trigger (`.oracle/findings/wave1/wave1-L7.txt:5`). That proves the global behavior, not merely the source possibility. Cross-browser/user-visible effects on each consumer still need targeted reproduction, but ownership is already wrong: a hero animation controls the platform clock observed by unrelated subsystems.

### B. Correct frame output depends on registration history across modules — verified architecture, regression candidate High

`addAnimator` stores callbacks in an insertion-ordered `Map`; replacing a name preserves its original position (`organism/animation.js:5-10`). Before chapters exist, `main.js` parks an empty `journey` animator so the eventual spine retains the first journey-side slot (`main.js:351-359`). `journey.js` then replaces that callback and assumes it runs before lens/chapter readers (`journey/journey.js:142-164`). Chapter construction itself registers callbacks, including during preboot slices (`journey/journey.js:108-122`; `main.js:1222-1235`).

Current source intentionally satisfies this contract, and its comments contain measured evidence of the historical flash when it did not. The current bug is therefore not “wrong order”; it is that order is a hidden inter-module API. A contributor can locally move lens or chapter preparation and silently change camera/read/render composition. This needs a behavioral invariant test before any decomposition, not a generalized scheduler rewrite.

### C. The scene API has conflicting camera authorities — verified architecture, failure candidate High

The scene owns responsive `setView()` and its tween (`organism/organism.js:2023-2066`). The director takes camera authority by replacing `sceneApi.setView`, capturing/defering responsive requests while journey progress owns the camera (`journey/director.js:196-218`, `375-401`). Meanwhile resize code in `main.js` calls the same method (`main.js:721-738`), and the journey compositor writes camera and fog every frame (`journey/journey.js:922-945`).

The handoff logic is careful, but ownership is expressed by monkey-patching a shared object rather than by an explicit scene capability. This is the same fault line implicated by Wave 1's reinitialization findings (`wave1-L1 #5`, `wave1-L3 #2-3`, `wave1-L4 #3`). Current single-instance behavior is not shown broken; cross-instance corruption and stale responsive handoff remain reproduction candidates.

### D. Availability has one reject path but no deadline/cancellation owner — source-verified High, runtime hang pending

The baked loader starts at import time, fetches the manifest and every bin concurrently without cancellation/deadline, and exports one aggregate promise (`journey/lib/baked.js:73-107`). `main.js` awaits it before chapter preparation (`main.js:1222-1228`). Journey readiness then awaits an uncancellable portrait `Image` (`journey/chapters/owned/portrait-photo-loader.js:3-10`; `journey/journey.js:1495-1504`) and may await shader compilation. `main.js` waits for `state.ready` before releasing/activating (`main.js:1236-1253`).

The existing catch correctly degrades on rejection (`main.js:1256-1269`), but a never-settling operation cannot reach it. L1, L3 and L4 independently found the same chain (`.oracle/findings/wave1/wave1-L1.txt:3`; `wave1-L3.txt:3`; `wave1-L4.txt:1`). All three also acknowledge that a controlled hanging-fetch/image browser test was not run. Treat the unbounded gate as verified source architecture and the indefinite visitor state as a high-confidence candidate requiring reproduction, not as a runtime-proven incident yet.

### E. Failure isolation stops at subsystem/animator boundaries and can leave an incoherent live tier — source-verified Medium/High, reproduction pending

The journey guard permanently drops a named subsystem after one exception and only logs (`journey/failure-guard.js:1-11`); `ui.update` and individual chapter drives are behind that guard (`journey/journey.js:961-1007`). The scene loop catches animator callbacks, but not `beforeRender()` or `render()` (`organism/animation.js:24-36`). Context-loss handling displays a delayed note but does not stop the RAF (`main.js:320-336`; `organism/animation.js:17-18`).

Wave 1 measured continued composer calls during context loss (`wave1-L6 #4`) and identified invisible subsystem degradation (`wave1-L9 #3`) and uncontained renderer failure (`wave1-L1 #2`). The continued work on synthetic context loss is verified; visitor behavior under a real post-boot render throw or isolated UI/chapter failure is not. The architectural issue is inconsistent failure semantics: some failures fall back, some silently remove one owner, and some escape the frame entirely.

### F. Live route identity, content identity and static route behavior are separate authorities — verified Medium

`structure.js` is the strongest identity source: it owns chapter IDs, hotspot IDs/cardinality and aliases (`journey/structure.js:4-51`) and validates builders/symbols/registered nodes (`journey/structure.js:53-120`). But route normalization only aliases a node; it does not prove that the node belongs to the supplied chapter (`journey/navigation.js:3-11`). The live hash handler can therefore set detail state against the wrong chapter (`journey/journey.js:786-806`). The static tier independently duplicates normalization and likewise opens any named detail after scrolling to the requested chapter (`static/index.html:1685-1733`).

Wave 1 reproduced both versions: live `#/inspire/discord` produced hidden detail state and consumed the next wheel (`wave1-L7 #4`), while static `#/connect/arca` showed a chapter/panel mismatch (`wave1-L10 #4`). This is not a theoretical schema issue; it is a verified conflict between chapter authority and node authority.

### G. Static/ownership contributor semantics conflict despite string-drift checks — verified Medium

`CONTENT.contributors` explicitly describes sixteen *slots*, whose opening occupants are overwritten from the larger contributor pool (`content/content.js:761-781`, `793-810`). `PERSON` is explicitly the canonical person record and contains the full ledger join (`content/contributors.js:13-24`, `274-283`). The ownership page consumes `PERSON` (`ownership/ownership.js:176-225`, `259-285`). The static tier, however, calls the sixteen slot records the “complete”, “authoritative, crawlable” contributor index and says there are sixteen contributors (`static/index.html:1497-1507`).

Wave 1 reported all sixteen static/journey blurbs differing from their `PERSON` records (`wave1-L10 #2`). The deeper architectural contradiction is roster meaning, not just prose drift: slot defaults, canonical people, and a supposedly complete fallback index are three distinct concepts under two data structures. The existing `data-src` check faithfully preserves the wrong semantic mapping.

## Verified risks from Wave 1 that cross these boundaries

The following have runtime or direct deterministic evidence in Wave 1 and should enter synthesis as verified, with severity adjusted for fallback/reach:

1. **High — global clock discontinuity:** measured after ordinary early input; see coupling A and `wave1-L7 #2`.
2. **High — modal rail scrim leaks wheel/drag to the journey:** the dialog alone is registered as the input owner (`journey/rail.js:1066-1088`), while the scrim is pointer-active (`journey/site.css:519-529`) and wheel ownership checks only the event target (`journey/scroll.js:843-852`). L5 reports direct reproduction (`wave1-L5 #1`). This crosses rail/UI/scroll ownership.
3. **High — second-finger release terminates the surviving touch scrub:** multi-touch start/move preserve the first contact, but every `touchend` unconditionally clears it (`journey/scroll.js:915-939`); L5 reports reproduction (`wave1-L5 #2`). This is an input-state ownership bug, not a general scroll architecture failure.
4. **High — malformed version-1 bake manifest disables the interactive tier:** `manifest` is accepted after only a version check, while `isBaked` dereferences `manifest.chapters` (`journey/lib/baked.js:83-112`). L7 and L9 independently reproduced it (`wave1-L7 #1`; `wave1-L9 #1`). Severity should not be described as total-site outage: `main.js` catches the eventual boot rejection and offers the static tier (`main.js:1256-1269`). It is still a high-dependency interactive availability defect and a packaging/schema contract gap.
5. **High — static no-JS deep links do not land:** the page promises matching routes (`static/index.html:38-56`), but menu hashes such as `#/mission` do not match section IDs such as `ch-mission`, and the translator is script-only (`static/index.html:1195-1205`, `1310-1321`, `1685-1744`). L2 reproduced `scrollY=0`; L10 independently confirmed the mismatch (`wave1-L2 #1`; `wave1-L10 #1`). This is a real static-tier contract failure, not merely progressive-enhancement polish.
6. **High performance, bounded scope — eager tier payloads:** L6 measured ~5.07 MB of all-chapter baked geometry on interactive boot and 10.79 MB desktop / 3.33 MB mobile for all five static stills (`wave1-L6 #2-3`). Source confirms concurrent all-bin loading (`journey/lib/baked.js:93-99`) and five CSS background layers (`static/index.html:140-153`, `1141-1146`). This is verified cost; device-level user harm still needs comparable low-end/network measurement before optimization choice.
7. **Medium — cross-chapter detail routes:** verified in live and static as described in coupling F (`wave1-L7 #4`; `wave1-L10 #4`).
8. **Medium — contributor/static authority conflict:** source comparison verified by L10, expanded in coupling G (`wave1-L10 #2`).
9. **Medium — same-mode responsive camera staleness:** `main.js` only reapplies same-mode view changes for desktop/deskNarrow/mobile, excluding compact/tablet (`main.js:721-738`); L5 reports the source path but not a browser trace (`wave1-L5 #3`). Keep this in the reproduction-needed group until the visual/camera delta is observed.

## Candidates that still require controlled reproduction or a support decision

1. **Unbounded startup hang (High candidate):** the wait chain is verified; no Luna report actually held the manifest, image or `compileAsync` promise open and observed the final UX. Probe before accepting precise timeout/fallback criteria.
2. **Post-boot renderer failure (High candidate):** unguarded render calls are verified source; inject a persistent composer/render exception and observe RAF, note, static door and `__pageErrors` before deciding the recovery boundary.
3. **Frame-order regression (High evolvability candidate):** current order is deliberate and appears correct. Demonstrate the invariant with instrumentation rather than labeling the current output defective.
4. **Multi-scene/recreate corruption (Medium candidate):** the global `started`, chapter registry and lens singleton prove non-reentrancy (`journey/journey.js:106-130`; `journey/chapter-registry.js:22-41`; `journey/lens.js:288-304`). The shipped page currently constructs one scene once. L3/L4 themselves leave “whether multi-scene teardown is supported” open. Decide support before promoting this to visitor severity; retry work would make it immediately relevant.
5. **Context restoration smear and timer race (Medium/High candidate):** TAA history resets only on resize (`organism/organism.js:120-165`), while restore only hides the note (`main.js:327-335`). L4's visual smear is a hypothesis; L7's repeated synthetic-loss timer result is stronger but needs real browser/device confirmation (`wave1-L4 #2`; `wave1-L7 #5`).
6. **Silent isolated-subsystem degradation (Medium candidate):** source semantics are clear, but no forced `ui.update`, chapter or lens failure was visually assessed (`wave1-L9 #3`).
7. **Square/tablet composition conflict (Medium candidate):** CSS/JS breakpoint semantics differ according to L5, but target-browser output was not captured (`wave1-L5 #4`).
8. **Ownership no-JS data absence (policy candidate):** empty HTML bodies and JS-only rendering are verified (`ownership/index.html:181-248`, `317`; `ownership/ownership.js:68-103`, `176-225`, `259-295`), but L2 correctly marks the intended no-JS contract unknown (`wave1-L2 #3`). This requires a support decision, not an assumed implementation.

## Luna agreement and contradiction adjudication

- **Strong convergence:** L1/L3/L4 independently identify the same unbounded readiness and module-global lifecycle seams. This raises confidence in the source diagnosis, but not in the absent runtime reproduction. Their “verified/high confidence” wording conflicts with their own evidence-gap notes; synthesis should record “source verified, behavior pending”.
- **Strong convergence:** L2/L10 independently identify static no-JS route failure; L2 includes runtime observation. Accept as verified.
- **Strong convergence:** L7/L9 independently reproduce malformed-manifest failure. Accept the defect, but narrow the impact statement: interactive loss with a visible static escape, not a blank total outage.
- **Complementary, not contradictory:** L1 says no import cycle was visible; this pass agrees. The dangerous coupling is runtime mutation/chronology, not an ES-module cycle.
- **Severity correction:** L3 calls the chapter registry High while L4 calls the overall non-reentrant scene lifecycle Medium and asks whether it is supported. For the current single-page single-scene product, Medium candidate is the defensible classification. It becomes High dependency if retry/recreate is accepted as an availability remedy.
- **Contract correction:** L10 frames contributor copy as two canonical records. Source comments show `CONTENT.contributors` was intended as sixteen visual slots, while `PERSON` is the canonical person record. The defect is therefore not that both datasets exist; it is that the static tier represents slot defaults as the complete contributor index.
- **Fallback correction:** L1/L9 describe subsystem or render failure as leaving a broken live tier; source supports that possibility. Do not claim the visitor impact is reproduced until the forced-failure probes run.
- **Performance discipline:** L6 supplies actual browser measurements, so the eager geometry/static-still costs are verified. The active-dot CPU scan has one M2 measurement but no low-end comparative outcome; keep it outside the architecture priority until the performance/failure Sol pass correlates it.

## Prioritized cross-system risk map

| Priority | Boundary | Risk | Status | Failure propagation | Next decision |
|---|---|---|---|---|---|
| 1 | Intro → all runtime clocks | `performance.now` overwritten | Verified High | early input → global time jump → scroll/seam/GPU/third-party timing ambiguity | reproduce consumer effects; restore a single trustworthy clock contract |
| 2 | Boot → resources → activation | unbounded manifest/bin/image/compile waits | Source-verified High candidate | one non-settling dependency → no `readyState` → no intro release/activation/fallback catch | controlled hang matrix and bounded UX requirement |
| 3 | Scene → journey → chapters/lens | animator order is a hidden temporal API | Verified architecture / High regression candidate | local registration change → stale camera reads → chapter/lens/UI frame mismatch | behavioral ordering invariant before refactor |
| 4 | Scene renderer → fallback | failure semantics inconsistent | Mixed verified/candidate High | context/render/subsystem failure → continued RAF, silent subsystem death, or escaped frame with no common recovery | forced failure matrix and explicit degradation policy |
| 5 | Rail/UI → scroll | modal/input ownership gaps | Verified High | scrim or multi-touch event → background journey state changes under modal/gesture | focused input regressions; keep existing ownership mechanism |
| 6 | Route schema → live/static detail | node ownership not enforced | Verified Medium | malformed deep link → chapter, detail and next input disagree | shared ownership invariant and route matrix |
| 7 | Content slots → canonical people → static/ownership | roster semantics conflict | Verified Medium | generator preserves slot copy as “complete” roster → public tiers disagree | choose semantic source per presentation; add meaning-aware coverage |
| 8 | Scene → responsive main/director | competing camera authorities and deferred resize | Candidate Medium | resize during journey/blend → stale hero snapshot or mode-specific composition | viewport/motion matrix before changing handoff |
| 9 | One-shot globals → future retry/recreate | started/lens/chapter/listener state cannot reset | Candidate Medium | retry or second scene → stale scene attachments/listeners/RAF | decide supported lifecycle, then test that contract only |
| 10 | Static tier → network/no-JS | all stills eager; hash translation JS-only | Verified High cost / verified route failure | fallback visit → large eager payload; no-JS link → wrong landing | separate resource and route fixes; preserve authored HTML |

## Targeted Luna follow-up probes

Run these as small evidence tasks, not a broad second review:

1. **Boot non-settlement matrix (highest priority):** separately hold manifest fetch, one bin, portrait image decode, `compileAsync`, and GPU fence. Record DOM classes, hero visibility, input policy, rail availability, note/static link, promise state and timestamps at 2/5/10/20 seconds. Distinguish “slow but eventually works” from “never settles”.
2. **Clock-consumer trace:** around one early wheel/touch acceleration, record native event timestamps, rAF timestamps, `performance.now`, scroll `sinceInput`, seam dwell transitions, GPU fence elapsed accounting and timer firing in Chromium/WebKit. Confirm which observed errors are caused by skew rather than merely correlated.
3. **Frame-order invariant harness:** capture the call order and camera pose seen by `journey`, each chapter, lens and UI on cold boot, direct jump, reverse mid-blend, deep link and capture. Then deliberately register a late animator/recreate the lens to prove the test detects stale-pose composition.
4. **Failure-semantics matrix:** inject one throw at `ui.update`, each chapter `drive`, lens update, `beforeRender`, composer render and camera blend. For each, record `__pageErrors`, console, continuing RAF/draws, keyboard/scroll behavior, visible notice and static escape.
5. **Context loss/restore sequence:** real `WEBGL_lose_context` single loss/restore and loss/loss/restore. Count render attempts, timers and post-restore TAA/history pixels against a fresh frame; include hidden-tab and mobile Safari if available.
6. **Route ownership matrix:** every chapter × every fixed/dynamic/alias node in live, static JS and static no-JS. Assert visible chapter, visible detail, stored detail, focus, hash cleanup/normalization and first subsequent wheel behavior.
7. **Rail/input matrix:** wheel, one-finger drag, pinch, add/lift second finger, keys and scrim click over open menu/card on desktop touch emulation and mobile browser. Assert both progress and native dialog scrolling.
8. **Responsive camera handoff:** resize within and across all five JS modes, including 800×800 and 620×620, during hero, intro acceleration, ordinary scrub, direct camera blend and return to Mission. Compare camera, target, fov, callout/rail geometry and CSS media state.
9. **Single-instance contract probe:** construct scene A, prepare chapters, attempt boot without/with a scene, then scene B/second boot. Inventory scene parents, animator names, listeners, RAFs and `setView` identity. Use results to decide whether retry/recreate is supported; do not assume teardown scope beforehand.
10. **Tier semantics/resource audit:** compare the sixteen static contributors to the slot records and `PERSON`; verify what “complete” should mean. Separately use cold-cache Resource Timing for first static paint and chapter navigation to determine whether all stills must be eager. Add coverage for `CONTENT.site.links`, which source says is rendered but live rail actually consumes only `site.social` (`content/content.js:812-860`; `journey/rail.js:587-631`).

## Bottom line

The architecture is not directionless: its route/state/chapter concepts are stronger than the Wave 1 problem count suggests. The risk cluster is narrower and more actionable—availability ownership, global time, camera/frame-order authority, and cross-tier semantic duplication. Preserve the existing composition and visual contracts; make those seams observable and testable before moving ownership. The next backlog should not treat file size or global teardown as the first-order problem, and it should not dilute runtime-proven defects with un-reproduced hypotheses.
