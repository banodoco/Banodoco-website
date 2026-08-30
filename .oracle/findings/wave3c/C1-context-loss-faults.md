# Wave3C C1 — context loss, renderer faults, and ownership

Source-only review of the checked-out tree (`b7e0ca7`; no browser run and no
application edits). Scope is `main.js` and `journey/**/*.js`, with the hero
render owner included because `main.js` delegates WebGL work to it. Earlier
Wave1/Wave2 browser evidence is cited only as existing evidence, not repeated
here.

## Decision

This is normal bounded lifecycle work, not `[XHARD]`. The highest-risk defects
are localized: rendering has no terminal failure owner, context restoration is
only a visitor note, and startup is not a deadline/abort transaction. A broad
scene-recreation or universal teardown rewrite is not justified by the
one-document contract; first add deterministic fault tests and the accepted
ready-or-fallback transaction.

## Proven source facts and defects

1. **Context loss is not a render lifecycle.** `main.js:320-336` calls
   `preventDefault()`, starts one 2.5-second note timer, and on restoration only
   clears the timer and hides the note. It does not pause the render loop,
   invalidate TAA history, resize/recreate composer targets, or rewarm renderer
   resources. The RAF is scheduled before every frame and cannot be stopped:
   `organism/animation.js:13-38`; `organism/organism.js:1753-1755,1843`.
   Existing Wave1 evidence measured 181 composer renders during three seconds
   of forced loss (`.oracle/findings/wave1/wave1-L6.txt:9-10`). This is a
   confirmed containment defect, not merely a visual hypothesis.

2. **Loss timer ownership is racy.** Every loss overwrites `restoreTimer`
   (`main.js:326-331`), while restoration clears only the newest handle
   (`main.js:333-335`). Thus loss → loss → restore can leave an older callback
   able to show a stale fallback; Wave1 already reproduced that sequence
   (`.oracle/findings/wave1/wave1-L7.txt:11-12`). Restoration also unconditionally
   hides the note, so it has no state/generation check against another active
   startup or renderer error (`main.js:60-62,75-87,333-336`).

3. **Core render exceptions escape all product containment.** The animator map
   catches only named animator functions and deletes the failed animator
   (`organism/animation.js:22-32`). `beforeRender()` and `render()` then run
   outside that `try` (`organism/animation.js:34-36`), after the next RAF has
   already been queued (`organism/animation.js:17-19`). The actual core hooks
   are TAA and `composer.render()` (`organism/organism.js:1753-1755`). A
   persistent TAA/composer error therefore produces uncaught errors and keeps
   submitting frames; the global handlers only count/log and optionally render
   a debug overlay (`main.js:64-87`). No visitor fallback or terminal stop is
   reached.

4. **Startup failure is rejection-only, not bounded.** The loader has no
   owner, deadline, abort controller, or generation guard (`main.js:1173-1271`).
   Its awaits include a RAF/task (`main.js:1180-1182`), dynamic module import
   (`main.js:1187`), baked geometry (`main.js:1221`), per-chapter task slices
   (`main.js:1222-1227`), and `state.ready` (`main.js:1236`). `prepareGpu()` in
   turn awaits portrait readiness (`journey/journey.js:1495-1500`) and
   `compileAsync` (`journey/journey.js:1502-1509`). The catch at
   `main.js:1255-1268` is useful for actual rejection, but cannot run when one
   of these operations remains pending. Existing Wave1 source/evidence records
   this as an indefinite `scene-preparing` path
   (`.oracle/findings/wave1/wave1-L1.txt:3-5`).

5. **Late startup settlements are not harmless by construction.** After each
   await, the loader mutates rail/DOM/scene state and eventually publishes
   `readyState` and schedules activation (`main.js:1187-1218,1221-1253`). There
   is no transaction generation or cancellation predicate. A future deadline
   race must therefore guard every post-await mutation; racing a timer alone
   would leave late module/compile/render settlements able to activate a
   fallback page. This is the exact gap identified by the Wave3B Oracle
   decision (`.oracle/findings/wave3b-sol-oracle-fallback.md:22,89-92`).

6. **GPU warmup has a partial bound, not an end-to-end bound.** `drainGpu()`
   checks context loss, bounds fence polling at 8 seconds, and deletes its sync
   (`journey/journey.js:1454-1483`). That existing fence bound is sound and
   should be preserved. It does not bound `gl.finish()` when no fence exists
   (`journey/journey.js:1478-1482`), synchronous `r.compile()` fallback
   (`journey/journey.js:1504-1509`), synchronous hidden draws
   (`journey/journey.js:1512-1557`), or texture uploads in
   `portraits.prepareRemix()` (`journey/chapters/owned/portraits.js:1984-2000`).
   These are potential driver stalls; source review cannot prove that they
   hang in this browser. The Wave3B decision specifically falsified an
   “indefinite fence” claim while retaining the startup transaction defect
   (`.oracle/findings/wave3b-sol-oracle-fallback.md:23-24`).

7. **Restoration lacks TAA history invalidation (visual defect remains a
   hypothesis).** `TemporalAccumulatePass.validHistory` becomes true after a
   render and is reset only by `setSize()` (`organism/organism.js:156-174`).
   The context-restored handler does not call `setSize()` or another reset
   (`main.js:327-336`). A restored context may have cleared or recreated GPU
   attachments while the pass still blends history. A flash/smear is plausible,
   but needs a forced-loss/restore pixel probe; the source proves the missing
   recovery action, not the exact visual artifact.

8. **Journey subsystem guards are narrower than renderer ownership.**
   `createFailureGuard()` latches and disables explicitly wrapped journey
   subsystems (`journey/failure-guard.js:1-11`), and the animator registry
   similarly isolates named callbacks (`organism/animation.js:22-32`). Neither
   handles `prepareGpu()`, TAA, composer, renderer context events, or startup
   promise ownership. A chapter fault can be logged and isolated while a core
   render fault remains an uncaught, repeating page-level failure.

9. **Cleanup is intentionally incomplete at the scene/page boundary.** The
   public scene API exposes `addAnimator` and `freezeTime`, but no stop or
   aggregate dispose (`organism/organism.js:2070-2144`). The RAF and resize,
   pointer, and controls listeners are installed without a scene teardown
   (`organism/organism.js:1693-1696,1843-1858`; `journey/scroll.js:1668-1693`;
   `journey/state.js:72-81`; `journey/chapters/final/index.js:141-148`).
   Individual resources do have local disposal—TAA’s pass
   (`organism/organism.js:170-174`), owned portraits
   (`journey/chapters/owned/portraits.js:2018-2037`), and the owned chapter
   forwards portrait disposal (`journey/chapters/owned/index.js:709-713`)—but
   no journey-level owner calls those paths on terminal fallback. This is a
   proven lack of a recreate/cleanup boundary, not proof of a leak in the
   supported one-document happy path.

10. **Boot is permanently latched before validation.** `journey/journey.js:106,
    123-131` sets module-global `started = true` before checking
    `window.sceneApi`. A missing scene, or a later failed boot, cannot safely
    retry; chapter preparation is also module-global and scene-unkeyed
    (`journey/chapter-registry.js:22-41`). This is proven cross-instance/retry
    ownership risk, but same-document retry is outside the current product
    contract and should not be expanded as part of T3.

## Proven versus unproven diagnosis

- **Proven product defects:** no render-loop stop or core-render exception
  containment; context-loss timer race; restoration does not perform renderer/
  TAA recovery; rejection-only startup; no startup generation guard; no
  aggregate scene/journey teardown; boot latch before validation.
- **Previously observed trigger, root cause unresolved:** Wave3B’s isolated
  browser failures occurred with a responsive server, complete document, very
  low RAF progress and GPU `ReadPixels` stalls under extreme host contention
  (`.oracle/findings/wave3b-sol-oracle-fallback.md:23-24`). This supports
  renderer/resource exhaustion as a trigger, but does not establish whether
  the product pipeline or the host GPU/process load is primary.
- **Hypotheses requiring a controlled browser/GPU probe:** post-restore TAA
  smear/flash; CPU/GPU burn from continued lost-context rendering; an
  unbounded `gl.finish()`/sync compile/draw stall; fallback-note suppression
  during a repeated loss/restore race; and actual resource retention after
  page closure.

## Prioritized probes and deterministic tests

**P0 — deterministic, no browser/GPU.**

- Test `createAnimationLifecycle` with injected fake RAF/cancelRAF and fake
  callbacks that throw from `beforeRender` and `render`; require one terminal
  error route, no further frame scheduling, and no repeated uncaught errors.
- Test a fake context state machine with loss, repeated loss, restore, timer
  expiry, and restore-after-fallback. Assert one owned timer, no rendering while
  lost, restoration invalidates TAA history, and unrelated status content is
  not hidden. This directly covers `main.js:320-336` and
  `organism/animation.js:13-38`.
- Test the T3 startup transaction with deferred module, baked, image, compile,
  task-slice, and `state.ready` promises. Assert deadline fallback, supported
  abort calls, generation guards on every late settlement, and no late rail,
  scene, or activation mutation. Keep hidden warm draws off the availability
  path unless a bounded/preemptible implementation is demonstrated.

**P1 — controlled browser/GPU.**

- Use `WEBGL_lose_context` for loss shorter than 2.5s, longer than 2.5s,
  repeated loss, and restore. Count composer submissions and RAF callbacks;
  capture status text, `validHistory`/first-frame pixels, console errors, and
  renderer resource counters against a fresh-load reference.
- Inject one post-boot TAA/composer/render throw. Assert visitor fallback or a
  bounded terminal stop, exactly one logged fault, and no continuing RAF/error
  storm.
- In a disposable page, create/close/recreate only if that lifecycle becomes
  supported; compare RAF/listener/resource/process counts before and after.
  Do not infer a leak merely from page-lifetime allocations in the current
  one-document contract.

**P2 — stress after quiet-host P0/P1 results.** Exercise cold shader caches,
  constrained GPU/CPU, photo request stalls, and context loss together. This is
  for trigger classification, not a reason to add speculative renderer
  optimization.

## Recommended implementation boundary

Implement the accepted narrow ready-or-fallback transaction in `main.js` and
the preparation contract in `journey/journey.js`: one owner deadline, abort
where supported, generation guards for non-abortable imports/compile, existing
fallback cleanup, and optional warm draws off the critical path. Separately,
make the render lifecycle own loss/restore and core render failures, with TAA
history invalidation and one terminal fallback route. Defer same-document
retry, global scene teardown, and renderer recreation until a product contract
or P1 evidence requires them.

