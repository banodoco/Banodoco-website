# Wave 2 / S3 — whole-system performance and failure exploration

Base: `1fa145fc51e89c8a1788db39aff98e775a576073`
Scope: performance/failure synthesis only; no application or source files changed.

## Executive conclusion

The live site currently behaves as one large startup transaction followed by one perpetual frame transaction.

Startup begins baked-geometry I/O and the journey module graph at module evaluation, starts the renderer, then withholds journey activation until all geometry downloads, chapter builds, portrait decode and atlas creation, shader compilation, hidden warm draws, and a GPU fence complete (`main.js:18-25`, `main.js:1174-1238`, `journey/journey.js:1451-1564`). Optional optimisations are therefore on the availability path. Rejections generally reach the static-tier note, but a request, image decode, or `compileAsync()` that never settles never reaches the catch. At the same time, card “idle” warming can begin 1.5 seconds after the early journey graph evaluates, rather than 1.5 seconds after readiness (`journey/ui.js:12-14`, `journey/cards/index.js:67-113`). It can consequently overlap the very geometry/network/Canvas2D/GPU work it is meant to avoid.

After boot, one RAF continuously combines scene animation, 4,200-spore CPU work, DOM measurement/placement, temporal accumulation, bloom, and rendering. It has no pause/stop state and remains scheduled through WebGL loss and render exceptions (`organism/animation.js:13-38`). This is a lifecycle correctness problem before it is an optimisation problem: the system cannot reliably become quiescent or hand visitors to the static tier when the live tier ceases to be viable.

Three measured costs deserve action without a broad redesign: initial DPR2 TAA history is four times the intended pixel count until any resize; the static tier fetches every chapter still; and the live tier downloads and retains every baked chapter before selection. Wave 1 measured these at 44 versus 121 frames in two seconds for the initial TAA case, 10.79 MB desktop / 3.33 MB mobile for static stills, and about 5.07 MB for baked geometry (`.oracle/findings/wave1/wave1-L6.txt:3-11`). They are amplified by a production origin that applies `no-store` to every file (`serve.py:18-23`, `railway.toml:5`), while the card warmer discards ordinary `fetch()` responses and assumes production caching.

The static fallback is substantial and useful, not illusory, but it is not route-equivalent without JavaScript. The test suite verifies that five sections and links exist, yet never verifies the requested no-JS destination (`tools/browser-smoke.mjs:158-168`). Wave 1 twice reproduced `static/#/owned` remaining at Mission because `#/owned` has no native fragment target and route handling is script-only (`.oracle/findings/wave1/wave1-L2.txt:3-4`, `.oracle/findings/wave1/wave1-L10.txt:3-4`; `static/index.html:1261-1304`, `static/index.html:1311-1536`, `static/index.html:1697-1733`).

## Evidence key

- **Reproduced**: runtime or repository-state observation repeated in this S3 pass.
- **Measured**: Wave 1 runtime measurement with a concrete result.
- **Source-proven**: control flow or contract follows directly from the cited source, but reach/cost may still need runtime measurement.
- **Hypothesis**: plausible impact with a specific falsification probe; not an implementation mandate.

## Priority map

| Priority | Outcome to pursue | Evidence and disposition |
|---|---|---|
| P0 | Bound the startup availability path and always publish a usable failure state | Source-proven unbounded waits; high-confidence Wave 1 finding repeated by L1/L3/L4. Reproduce each wait separately before choosing the bound or removing optional work from readiness. |
| P0 | Correct deployed byte-range semantics and cover them at the packaged-server boundary | Reproduced and source-proven. Narrow protocol correction, not a server rewrite. |
| P0 | Make browser, capture, artifact, and deploy gates state honestly what ran | Source-proven false-green/false-read-only paths. Correct Wave 1's `_check` tracking claim as described below. |
| P0 | Make the documented static/no-JS destination contract true, or narrow the documented contract explicitly | Measured twice. Preserve the full scrollable static document; fix only route/destination semantics. |
| P1 | Correct the initial DPR render-target sizing error | Strong measured evidence and a localized size-contract cause. Preserve visual output and compare initial-load captures/frame timing at the same drawing-buffer size. |
| P1 | Give WebGL/context/render failure a real lifecycle: pause, invalidate, restore or fall back | Rendering-during-loss is measured; stale TAA history is a hypothesis; post-render exception behavior is source-proven. One context-loss reproduction should adjudicate the whole cluster. |
| P1 | Stop mutating the global performance clock | Measured global discontinuity; it compromises both runtime consumers and measurement validity (`.oracle/findings/wave1/wave1-L7.txt:5`). Characterize visible behavior first, then preserve the intended intro acceleration without replacing a platform clock. |
| P1 | Reconcile eager loading/warming with the actual `no-store` delivery policy | Transfer sizes are measured/source-counted; duplicate transfer, decode, and first-hover effects need a production-equivalent trace before changing policy. |
| P1 | Close responsive composition and invalidation gaps | Same-mode tablet/compact omission is source-proven; square-mode mismatch and repeated render-target reallocations need narrow viewport traces. |
| P2 | Optimize steady frame CPU/DOM/GPU work only after a correlated trace | Spore emphasis cost is measured on one M2; DOM measurement and resize allocation costs are instrumentable hypotheses. Avoid isolated microbenchmarks. |
| P2 | Decide retry/recreate and same-container restart contracts | Non-reentrancy and `/tmp/public` reuse are real code properties; user/platform reach remains unproven. Do not build generalized lifecycle abstractions until the supported contract is explicit. |

## 1. Startup is an unbounded, correlated critical path

### Availability facts

1. `bakedGeomReady` begins at import time and awaits the manifest followed by all listed chapter bins via `Promise.all` (`journey/lib/baked.js:73-107`). `loadJourney()` cannot construct a chapter until that aggregate resolves (`main.js:1222-1227`). Network errors fall back to live builders, but a response that never completes has no timeout or abort. The comment that this wait is “bounded” at `main.js:18-21` is false. L1, L3, and L4 independently identified the hang (`.oracle/findings/wave1/wave1-L1.txt:3`, `.oracle/findings/wave1/wave1-L3.txt:3`, `.oracle/findings/wave1/wave1-L4.txt:1`).

2. Normal startup enables portraits (`flags.js:107-120`). The sprite loader creates a bare `Image` promise with no timeout or cancellation (`journey/chapters/owned/portrait-photo-loader.js:3-10`). Failed images reject and are converted to procedural portraits, but stalled images remain pending. `prepareGpu()` awaits that promise before shader preparation and `main.js` awaits `state.ready` before release (`journey/chapters/owned/portraits.js:1858-1879`, `journey/journey.js:1495-1504`, `main.js:1236-1238`). Late-settlement disposal guards (`portraits.js:2017-2037`) do not bound the initial readiness wait.

3. `renderer.compileAsync()` is also unbounded; only rejection triggers synchronous `compile()` fallback (`journey/journey.js:1502-1510`). The later GPU fence is explicitly bounded at eight seconds (`journey/journey.js:1454-1483`), so it should not be conflated with the earlier unbounded waits. Hidden 64×64 warm renders are synchronous (`journey/journey.js:1512-1557`); the source itself notes that software rendering can spend minutes there, while detection depends on optional debug renderer information.

4. A malformed version-1 manifest is not a hang but a different failure. `ready` accepts it, then `isBaked()` dereferences `manifest.chapters` (`journey/lib/baked.js:91-112`). Wave 1 intercepted `{version:1}` and lost the interactive journey (`.oracle/findings/wave1/wave1-L7.txt:3`, `.oracle/findings/wave1/wave1-L9.txt:3`). L9 is more precise about semantics: `main.js:1256-1268` catches the eventual error and displays the static link. The visitor is degraded, not left permanently blank. Packaging checks file presence and bytes, not manifest schema (`tools/package-public.py:52-94`).

5. Caught startup errors have a reasonable static handoff (`main.js:1256-1269`), but partial-markup exceptions before `window.sceneApi` publication do not. Required callouts are dereferenced at `main.js:814-823`; the scene handle is published only at `main.js:911-916`. L1 correctly treats this as a narrow mixed/partial-artifact failure candidate, not evidence of normal-markup fragility (`.oracle/findings/wave1/wave1-L1.txt:9`).

### Correlated cost, not four independent optimisations

The initial timeline has four concurrent producers:

- approximately 5.07 MB of manifest/bins fetched and retained, then copied into geometry attributes (`journey/lib/baked.js:75-99,137-145`; measured in `.oracle/findings/wave1/wave1-L6.txt:7`);
- one chapter built per painted slice (`main.js:1222-1227`), producing CPU/heap/GC work while the hero RAF is already rendering;
- portrait decode and multiple Canvas2D atlas bakes, including 4096×1024 hover atlases and a prepared next remix (`journey/chapters/owned/portraits.js:1830-1855,1858-1875,1905-1921,1980-1996`);
- shader compile, hidden draws, buffer/texture upload, and GPU drain (`journey/journey.js:1485-1559`).

The cards module then schedules fonts, 13 light assets, and seven MP4s from module evaluation (`journey/cards/index.js:80-113`). S3 summed the referenced repository files at 295,096 light bytes plus 2,944,815 heavy bytes, 3,239,911 bytes before fonts. This is almost twice the comment's “~1.6MB” heavy estimate. Each callback launches a fetch without awaiting network capacity; there is no cancellation or signal. Whether requests run early is scheduler-dependent, but once launched they do not “stop warming when hovers start competing,” contrary to `cards/index.js:75-79`.

This cluster should be reproduced as one cold-load trace. Moving any one task can merely expose another, and the adaptive DPR governor explicitly samples during this period (`organism/organism.js:1851-1955`).

## 2. Steady-frame and responsive failure boundary

### Verified high-impact costs

- **Initial TAA oversizing.** The composer is constructed with a target already sized in drawing-buffer pixels (`organism/organism.js:105-108`), records that width, and multiplies pass sizes by renderer DPR when a pass is added (`vendor/three/addons/postprocessing/EffectComposer.js:15-39,63-67`). Thus a DPR2 TAA history becomes 5760×3600 for a 2880×1800 drawing buffer. The explicit resize path later sets it to drawing-buffer size (`organism/organism.js:1836-1843`). Wave 1 measured 44 frames/2.04 s before resize, 121/2.01 s at DPR1, and 54/2.01 s after resize (`.oracle/findings/wave1/wave1-L6.txt:3`). Any comparison must record whether a resize already “fixed” the session.

- **Spore CPU work.** Ambient drift always scans 4,200 dots (`organism/spores.js:405-456`); active emphasis adds chain scans and region writes (`organism/spores.js:934-1001,1095-1138`). Wave 1 measured 2.963 ms/frame for emphasis alone on an M2 (`.oracle/findings/wave1/wave1-L6.txt:11`). This is material but not yet representative of low-end/mobile or a complete frame.

- **Context-loss work continues.** RAF schedules its successor before all work and has no stop condition (`organism/animation.js:13-38`). The context handlers only arm/hide a note (`main.js:320-336`). Wave 1 counted 181 composer renders during a three-second lost-context interval (`.oracle/findings/wave1/wave1-L6.txt:9`). This is sufficient to require lifecycle correction; battery magnitude on actual mobile Safari remains unmeasured.

### Instrumentable frame hypotheses

- `ui.update()` measures every hotspot's width and height on every frame (`journey/ui.js:2654-2669`), may read the active copy rectangle per hotspot (`journey/ui.js:2788-2794`), performs pairwise hit-pad distance checks (`journey/ui.js:2998-3006`), and repositions open popovers/cards with rectangle reads (`journey/ui.js:3074-3106`). The code batches some reads before writes, which is good, but no trace establishes layout/recalc cost or whether font-settlement still justifies permanent remeasurement. Measure chapter rests and transitions before caching or restructuring.

- Every resize event immediately calls `renderer.setSize()` and resizes composer targets, TAA history, bloom, and dense-material resolution (`organism/organism.js:1836-1849`). Continuous mobile-toolbar or split-view changes may therefore repeatedly allocate GPU targets and invalidate TAA while `main.js` independently waits 150 ms to refresh composition (`main.js:721-737`). Count actual events, allocations, long frames, and history resets; do not infer cost solely from the listener.

- Render/TAA/composer exceptions are outside the animator try/catch (`organism/animation.js:24-36`). Because the next RAF is already scheduled, a persistent render error can recur without a visitor fallback. Journey subsystem failures have the opposite problem: `createFailureGuard()` permanently disables the named subsystem and only logs (`journey/failure-guard.js:1-10`), so a UI failure can remain visitor-invisible and does not increment `window.__pageErrors` (`journey/journey.js:1006-1007`; `.oracle/findings/wave1/wave1-L9.txt:7`). Both need fault injection, not a generic catch-all.

### Responsive contradictions resolved

L4's “resize ordering appears coherent” (`.oracle/findings/wave1/wave1-L4.txt:7`) and L5's stale tablet/compact finding (`.oracle/findings/wave1/wave1-L5.txt:9-13`) describe different layers. The renderer immediately updates aspect and targets, so the single-page render order is coherent. Mission composition is still stale because same-mode `setView(viewFor(mode))` runs only for desktop, deskNarrow, and mobile, while `viewFor()` converts a pixel correction through current `innerHeight` (`main.js:213-252,721-737`). Tablet and compact resizes can therefore have correct buffers but old camera offsets.

Square viewports are a second, separate policy seam: JS defines portrait as `h > w` (`main.js:201-208`), while CSS uses portrait media queries through 900/620 px (`hero.css:867-931`). The predicted 620×620/800×800 disagreement remains a targeted browser hypothesis, not a measured visitor failure.

## 3. Context restoration and failure semantics

Context loss currently has three independently supported concerns:

1. Continued rendering is measured and should be fixed regardless of restoration visuals.
2. `TemporalAccumulatePass.validHistory` is cleared only by `setSize()` (`organism/organism.js:120-165`); restore only hides the note (`main.js:327-336`). Undefined/cleared history blended into the first restored frame is a plausible flash/smear hypothesis from L4, not yet pixel evidence (`.oracle/findings/wave1/wave1-L4.txt:3`).
3. Repeated loss overwrites `restoreTimer` without clearing the prior timer. Wave 1's synthetic loss/loss/restore left a stale fallback after 2.5 seconds (`.oracle/findings/wave1/wave1-L7.txt:11`). Confirm whether target browsers emit this sequence, but coalescing the state machine is narrow and low risk once reproduced.

The required reproduction should count RAF/composer calls during loss, capture the first restored frames against a fresh-load control, verify resource/texture availability, exercise loss/loss/restore, and assert exactly one visible state: live, restoring, or static fallback. A restored context must not merely hide the note while the rendered scene remains corrupt.

## 4. Static tier and origin delivery

### Static/no-JS

The static tier's content presence is real. The defect is destination behavior: its menu emits script routes (`#/chapter`) while its native section IDs are `ch-chapter`; without JS the Mission still remains selected and the browser cannot fragment-scroll. Preserve the existing five-section document and make route links native-compatible, or document that deep-link parity requires JS. A separate unresolved policy question is whether `ownership/index.html` promises no-JS ledger rows; Wave 1 measured empty tables without JS but explicitly could not establish the intended contract (`.oracle/findings/wave1/wave1-L2.txt:9-14`).

Static backgrounds are all CSS images on present elements (`static/index.html:119-153,1141-1146`). Wave 1 measured exactly the source corpus sizes; S3 independently summed 10,788,697 desktop bytes and 3,332,594 mobile bytes. Opacity does not defer CSS background fetching. Measure current-plus-next loading against direct/deep navigation before selecting a narrower loading policy.

### Origin/server

- **Range is incorrect and reproduced.** `_range_body()` parses `bytes=-N` as `start=0,end=N`, and the regex accepts only the prefix of a comma-separated request (`serve.py:25-52`). On this base, S3 requested `bytes=-3` from the 742-byte `package.json` and received `Content-Range: bytes 0-3/742` with four leading bytes; `bytes=0-1,2-3` returned only bytes 0-1 as `206`. This confirms L8's protocol finding (`.oracle/findings/wave1/wave1-L8.txt:9`). Cover closed, open-ended, suffix, unsatisfiable, multi-range, GET, and HEAD responses; then exercise real Safari seek/replay against packaged MP4s.

- **Caching contradicts warming.** The production command packages and runs this same `serve.py` (`railway.toml:5`), which sets `no-store` on HTML, modules, geometry, portraits, stills, and MP4s alike (`serve.py:18-23`). That prevents mixed-version cache state, as L9 notes (`.oracle/findings/wave1/wave1-L9.txt:11`), but it also means discarded card-warm fetches are not a durable HTTP-cache prime. Whether an in-flight/memory reuse prevents an immediate second transfer must be traced in a production-equivalent browser. The outcome should preserve module freshness while making deliberate asset caching/warming semantics true.

- **Compression at the origin is absent.** `serve.py` has no content-encoding path, although `DEPLOY.md:43-51` asks the host to enable gzip/brotli. S3 sent `Accept-Encoding: gzip, br` locally and received the 1,304,820-byte Three.js module without `Content-Encoding`. A Railway edge may still compress, so actual deployed headers and transferred sizes are required before ranking this as production cost.

- **Restart idempotence is a platform-reach hypothesis.** Railway always packages to `/tmp/public`, while packaging rejects a nonempty destination (`railway.toml:5`, `tools/package-public.py:112-117`). The code behavior is clear; whether a process restart reuses that filesystem is not. Simulate the platform lifecycle or inspect Railway restart evidence before changing it.

## 5. Test-gate honesty

1. Browser smoke exits success if Chrome is absent or cannot launch (`tools/browser-smoke.mjs:127-139`). Even with Chrome, the sole live journey scenario returns early if WebGL is unavailable (`tools/browser-smoke.mjs:244-253`) and the runner then prints that scenario as `PASS` (`tools/browser-smoke.mjs:296-303`). Required browser/WebGL coverage needs an explicit fail-or-authorized-skip mode; local convenience may remain skippable.

2. The browser suite serves the source checkout, not the packaged allowlist (`tools/browser-smoke.mjs:116-151`). Artifact verification checks bytes and a required subset (`tools/package-public.py:52-94`; `deploy/public-files.json:50-67`), while post-deploy verification polls only `release-revision.txt` (`tools/release.sh:152-169`). A packaged artifact can therefore serve the right revision without any post-package route/WebGL/static scenario having run. Add a packaged-artifact smoke lane before expanding scenario count.

3. The no-JS test asserts section/link counts and absence of canvas, not route landing (`tools/browser-smoke.mjs:158-168`). The manifest-corruption, hung-load, context-loss, default-photo, intro, warming, continuous-resize, and Range cases are also absent. These are behavior gaps, not reasons to discard the current smoke test.

4. Capture readiness is logged but not part of the failure predicate (`tools/capture.py:899-912,922-960`; `.oracle/findings/wave1/wave1-L8.txt:11`). A near-identical wrong frame can pass. Readiness, file presence, and pixel drift must all be independent gates.

5. The “read-only check leaves untracked `_check` files” claim in L8 is partly wrong. At this immutable SHA, S3's `git ls-tree -r HEAD static/captures/_check` shows all ten PNGs are tracked. `capture.py --check` does write them in place (`tools/capture.py:847-850,899-904`), so the documented read-only contract is still false and a variable result can dirty the tree; however, the files' mere presence is not untracked residue and does not make every release abort. Downgrade L8's universal-release-blocker claim to a tracked-output mutation/nondeterminism risk (`.oracle/findings/wave1/wave1-L8.txt:3`).

6. Full rebuild creates metadata before new captures, even though social cards consume Mission/Owned captures (`tools/rebuild.py:40-46,90-100`, `tools/build-meta.py:106-112`). `DEPLOY.md:83-87` documents manually rerunning metadata, but `tools/build.sh --with-captures` does not. The executable “full build” contract should produce self-consistent derived artifacts without a hidden second command.

## 6. Other Wave 1 contradictions and adjudications

- **Portrait safety:** L3's “portrait disposal guards late settlement” and its “portrait can block activation” are both true. Disposal protects a retired owner; it does not abort or time-bound the readiness promise (`.oracle/findings/wave1/wave1-L3.txt:3,9`).
- **Card warming:** L6 observed only font warming after about nine seconds, while L9 proved that the code schedules every fetch without cancellation (`.oracle/findings/wave1/wave1-L6.txt:13`, `.oracle/findings/wave1/wave1-L9.txt:9`). There is no contradiction: idle callbacks may be starved before requests launch, but launched requests have no backpressure/cancellation. Hidden, busy, and hover-competing traces are needed.
- **Malformed manifest:** L7 says it is fatal and L9 says main converts it to static fallback. “Fatal to the interactive tier, caught by the page shell” is the reconciled result.
- **Static usefulness:** Browser smoke's five sections/links and the no-JS deep-link failure can coexist. The page is readable by manual scroll; route parity is broken.
- **No-store:** It usefully avoids mixed module versions but makes eager transfers recur and undermines the warmer's stated cache contract. This is a policy tradeoff, not evidence to remove cache safety wholesale.
- **Recreate/lifecycle:** L3/L4 prove no teardown and module-global scene ownership, but the present page creates one scene. Treat leak/cross-wire severity as contingent on retry/recreate becoming a supported recovery path; do not let that uncertainty block pausing the one existing RAF on context loss.

## 7. Comparable measurement contract

No performance backlog item beyond the already reproduced TAA sizing error should be accepted without the following controls:

1. Record commit SHA, packaged artifact hash, browser/version, OS, renderer/vendor string, hardware acceleration, viewport, DPR, refresh rate, power/thermal state, reduced-motion state, flags, route, and whether any resize fired before sampling.
2. Separate cold origin/no-cache, repeat-load under the shipped headers, and intentionally cacheable controls. Record request start/end, status/range, encoded/decoded bytes, duplicate URLs, image decode, and first-use latency.
3. Trace one deterministic journey script across Mission, Inspire, Connect, Owned, Final and an open card. Report rAF interval p50/p95/p99, dropped frames, long tasks, scripting, style/layout, paint/composite, GPU time where available, draw calls/triangles, render-target/texture dimensions, JS heap, and resource totals.
4. Mark startup phases independently: scene creation; manifest and each bin; each chapter build slice; sprite load/decode; current and pending atlas bake/upload; compile; each hidden draw; GPU-ready; journey-interactive. A single “load time” cannot assign cause.
5. Compare one factor at a time: DPR1 versus DPR2; before versus after a synthetic resize; baked versus `?livebuild=1`; default photos versus `?photos=0`; warming enabled versus blocked; active versus lost context. Use at least five runs and report median plus spread, not a best run.
6. Do not use the page's overridden `performance.now()` after intro acceleration as the measurement clock. Wave 1 measured an 8.5-second discontinuity against the RAF timestamp (`.oracle/findings/wave1/wave1-L7.txt:5`; `organism/intro.js:209-224`). Prefer DevTools trace clocks or capture a native clock before input.
7. For graceful-failure claims, record a bounded deadline, visible status content, keyboard reachability of the static link, static destination, outstanding requests, RAF/render counts, and recovery state. Console text alone is not success.

## 8. Targeted Luna follow-ups

| ID | Narrow reproduction | Decision it unlocks |
|---|---|---|
| F1 | Independently stall manifest, one bin, portrait sprite, journey import, `compileAsync`, hidden warm render, and GPU fence; record UI/classes/requests at fixed deadlines | Which work leaves readiness, which gets a timeout/abort, and the single fallback contract |
| F2 | Intercept `{version:1}`, missing chapter/key/attribute, corrupt bin, hash mismatch, and 404 against the packaged artifact | Minimal manifest/package validation and per-chapter live-build fallback boundary |
| F3 | Inject one animator, `beforeRender`, composer render, UI, director, and chapter failure after boot | Which failures can degrade locally and which must pause live rendering/show static fallback |
| C1 | Real `WEBGL_lose_context`: loss, loss/restore, long loss, restore; capture RAF/render counts and first 10 restored frames on Chromium hardware/SwiftShader and Safari/mobile if available | Context state machine, timer coalescing, TAA/resource invalidation, fallback deadline |
| P1 | Cold-load correlated trace at 1280×800 DPR1/2 and 430×932 DPR2 with default photos; repeat after one resize and with `photos=0`/`livebuild=1` | Confirm TAA gain and assign geometry/portrait/compile/GC/GPU costs |
| P2 | Trace steady rests/transitions with UI/spore call sites isolated through profiling, not code changes; include low-end 30/60 Hz | Whether spore scans, hotspot measurement, collision work, or GPU fill is the next bottleneck |
| R1 | 768×1024→768×900 Mission; compact same-mode heights; 620×620 and 800×800; continuous resize during camera tween and mid-journey | Responsive camera policy and whether render-target resize needs coalescing |
| W1 | Production-equivalent `no-store`, throttled network, active/hidden tab, hover at 0/3/10 s; log idle jobs, requests, duplicate bytes, decode, first frame | Keep, cancel, reorder, or remove warming; quantify portrait/card memory instead of guessing |
| S1 | Serve the packaged artifact and test no-JS chapter/node links, all Range forms plus Safari seek, compression/cache headers, 404/subpath, and a same-container restart | Static/deploy acceptance contract and server corrections |
| G1 | Run gates with Chrome absent, WebGL absent, forced capture-readiness timeout, a sole known-flake capture, and a full rebuild whose captures change | Explicit skip policy, true read-only verification, build ordering, and release-gate honesty |

## North Star disposition

The highest-value work is not a rendering simplification or visual retreat. It is to make the existing adventurous presentation bounded and observable: optional startup work must not decide availability; the frame loop must have loss/failure states; fallback routes and server bytes must be correct; and green gates must mean the claimed browser/artifact behavior actually ran. After those contracts exist, the measured TAA, static-still, geometry, portrait, card, spore, DOM, and resize costs can be reduced one at a time without changing the site's intended visuals or merely moving coupling elsewhere.
