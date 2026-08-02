# BASELINE — Mushroom Journey v6, task W1-A

**Frozen:** 2026-08-02. **Owner:** Tech Lead. **Gate:** G0.
**Subject:** the approved Banodoco Mission hero — `glowshroom/golden-mushroom-page.html` + `glowshroom/mushroom-scene.js`, served at `http://localhost:8137/golden-mushroom-page.html`.

Everything below describes the hero **as it is**, not as it should be. Where the hero has a defect, the defect is recorded as part of the baseline. "No regression" means *no change from these numbers and states* — it does not mean "fix these".

Budgets in §8 were **APPROVED by Hannah 2026-08-02** — G0 is closed; the §8 numbers are binding.

---

## 1. The frozen artifact (BF-1)

| File | Bytes | SHA-256 (full) |
|---|---:|---|
| `golden-mushroom-page.html` | 29,993 | `5638dd0d3d9ed7e19cf47b19f8d87852f6e116ddbb653a5ff8f41e1d5ee85f5c` |
| `mushroom-scene.js` | 94,183 | `eee1967d5acd4a9f4be10864012de3c8f253b97cbf2decbd483271884fd87d7e` |

Both copied verbatim (checksums verified identical) to:

- `/Users/hannahomalley/nigel/ados-paris/glowshroom/archive/golden-mushroom-page-2026-08-02.html`
- `/Users/hannahomalley/nigel/ados-paris/glowshroom/archive/mushroom-scene-2026-08-02.js`

This completes BF-1.1 — the previous archive (`…-2026-07-31`) held only the HTML; the JS is now archived alongside it. Source mtime on both files is `Jul 31 17:07`; they were **not** modified during this task.

### Serving setup (BF-1.2)

- `python3 -m http.server 8137 --directory /Users/hannahomalley/nigel/ados-paris/glowshroom` (PID 9261 at time of capture), `SimpleHTTP/0.6 Python/3.9.6`.
- **No build step.** ES modules loaded natively via an in-page `<script type="importmap">` mapping `three` → `./vendor/three/three.module.js` and `three/addons/` → `./vendor/three/addons/`.
- No minification, no bundler, no hashing. `mushroom-scene.js` is imported with a hand-written cache-buster: `./mushroom-scene.js?v=1785427900`.
- Server sends no `Cache-Control`; the browser serves subresources from memory cache on repeat navigations (see §4).

---

## 2. Reference machine (BF-5, decision D8)

This machine is the reference device. Tier 1 = native. Tier 2 = device emulation **on this same machine** and is labelled as such everywhere below. Real-Android verification is a recorded deviation, deferred until hardware exists.

| Property | Value |
|---|---|
| Model | `Mac15,12` (MacBook Air, M3) |
| CPU | Apple M3, 8 cores (8 physical / 8 logical) |
| GPU | Apple M3, 8 cores, Metal 3 |
| RAM | 8 GB (`hw.memsize` 8,589,934,592) |
| OS | macOS 15.6.1 (build 24G90) |
| Display | Built-in Liquid Retina, 2560 × 1664, DPR 2 |
| Browser | Chromium 148.0.7778.280 via Electron 42.7.0 (the Claude in-app browser pane) |
| WebGL | WebGL2, `ANGLE (Apple, ANGLE Metal Renderer: Apple M3)`, `MAX_SAMPLES` = 4 |
| `hardwareConcurrency` | 8 · `deviceMemory` 8 |

**Harness caveat — read before re-running.** The browser pane runs the page as a **hidden tab** (`document.visibilityState === "hidden"` permanently). Consequences, all of which shape §4:

1. `requestAnimationFrame` does not run continuously. Frames are produced only while a screenshot is being captured (bursts of ~8–16 frames each).
2. `performance.getEntriesByType("paint")` is empty — no FP/FCP entries are ever recorded.
3. `EXT_disjoint_timer_query_webgl2` is present and `beginQuery`/`endQuery` succeed, but the result never becomes available (polled 1.17M spins / 200 ms with `GPU_DISJOINT` false). ANGLE-on-Metal services query readback on a later frame, and there are no later frames. **True GPU-side frame time is therefore not measurable through this harness.** Recorded as a known gap.

---

## 3. Bundle weight (BF-3.1)

14 requests to first meaningful render (1 document + 13 ES modules). No images, fonts, or CSS files — all styling is inline, the grain texture is an inline SVG data URI, and the glow sprite is generated in a canvas at runtime.

| Resource | Raw bytes | gzip bytes |
|---|---:|---:|
| `golden-mushroom-page.html` | 29,993 | 9,228 |
| `mushroom-scene.js` | 94,183 | 29,949 |
| `vendor/three/three.module.js` | 1,304,820 | 264,174 |
| `vendor/three/addons/controls/OrbitControls.js` | 32,134 | 6,850 |
| `vendor/three/addons/postprocessing/UnrealBloomPass.js` | 12,410 | 2,940 |
| `vendor/three/addons/postprocessing/EffectComposer.js` | 4,651 | 1,205 |
| `vendor/three/addons/postprocessing/OutputPass.js` | 2,524 | 840 |
| `vendor/three/addons/postprocessing/MaskPass.js` | 2,231 | 682 |
| `vendor/three/addons/postprocessing/RenderPass.js` | 1,941 | 637 |
| `vendor/three/addons/postprocessing/Pass.js` | 1,706 | 759 |
| `vendor/three/addons/postprocessing/ShaderPass.js` | 1,576 | 662 |
| `vendor/three/addons/shaders/OutputShader.js` | 1,490 | 579 |
| `vendor/three/addons/shaders/LuminosityHighPassShader.js` | 1,147 | 538 |
| `vendor/three/addons/shaders/CopyShader.js` | 571 | 344 |
| **TOTAL** | **1,491,377** | **~319,387** |

**Headline: 1,491,377 raw bytes / ~319 KB gzipped over 14 requests.**

`three.module.js` alone is **87.5 %** of raw weight (1,304,820 / 1,491,377) and ~83 % of gzipped weight. It is the unminified, untree-shaken full three.js module build. The server does not gzip — the gzip column is the compression headroom available, not what is currently sent.

Cold network transfer of all 14 resources over loopback: **126 ms** wall for 1,491,377 bytes via sequential `curl` (includes 14 process spawns, so this is an upper bound on the network component).

---

## 4. Load and runtime performance (BF-3.2, BF-3.3, BF-3.4)

### 4.1 Time-to-interactive — warm cache, 1440 × 900

From `PerformanceNavigationTiming` on a same-session repeat navigation. All subresources served from memory cache (`transferSize` 0, `duration` 0).

| Mark | ms from navigation start |
|---|---:|
| `responseEnd` (document) | 18.4 |
| `domInteractive` | 83.9 |
| `domContentLoadedEventStart` / `End` | 340.0 |
| `domComplete` | 340.3 |
| `loadEventEnd` | **340.4** |

**TTI proxy = 340 ms (warm cache).** Justification: the page's only script is an inline `type="module"`, so it is deferred and evaluates *before* DOMContentLoaded. `createScene()` runs to completion inside that evaluation — it builds all geometry, appends the canvas, and calls `animate()` before returning. So DCL is the first instant at which the scene exists and the first frame has been requested. The ~256 ms between `domInteractive` (83.9) and DCL (340.0) is module evaluation: parse + compile of 1.49 MB of JS plus procedural geometry generation.

**Not measured:** FCP/FP (no paint entries in a hidden tab, §2) and a genuinely cold-cache TTI (the harness offers no cache-disable, and the importmap paths carry no cache-busting query so they cannot be busted from the URL). The 340 ms figure is warm-cache and is the reproducible one; treat it as the regression subject.

### 4.2 Frame time at the resting pose — 1440 × 900, DPR 2, `?nointro=1`

Frames only exist during screenshot capture (§2), so the sample is short and the capture readback is charged into the frames it touches. Two separate measurements:

**Cadence (rAF timestamp deltas).** In every uninterrupted run of frames the cadence is **16.5–17.7 ms**, i.e. locked to the 60 Hz vsync with no dropped frames. Observed clean run: `16.6, 16.7, 16.6, 16.7, 17.7 … 16.6, 16.7, 16.5, 16.8, 15.9, 17.5`. The gaps of 49.9 / 83.2 / 149.9 ms are the boundaries *between* capture bursts, not dropped frames.

**Scene CPU per frame** (measured as `performance.now()` at a probe rAF callback registered after the scene's own, minus the frame's rAF timestamp — this captures all animators plus the composer submit):

| | ms |
|---|---:|
| clean-frame floor | 0.9 |
| typical (median of clean frames) | ~1.2 |
| typical range | 0.9 – 2.2 |
| frames contaminated by screenshot readback | 5.6 – 14.7 |

**Read this as: ~1–2 ms of CPU per frame against a 16.7 ms budget, holding a locked 60 fps at rest.** The 5.6–14.7 ms outliers are harness artifacts (screenshot pixel readback), not scene cost — do not carry them into the budget.

Two corroborating signals that there is real headroom: the scene's own `perf-governor` animator steps `pixelRatio` down whenever a 2.5 s window averages > 24 ms/frame, and it **never engaged** — `getPixelRatio()` stayed at 2 throughout. And a tight loop of `composer.render()` + `gl.finish()` measured 0.20 ms median / 0.6 ms p95 (n=120); that number is *not trustworthy as GPU time* (`gl.finish()` does not appear to be stalling meaningfully in a hidden tab) and is recorded only as a floor.

**GPU frame time during the intro: NOT MEASURED** (BF-3.3 partially unmet). The intro is driven by wall clock, so it completes in 5.4 s regardless of frames; with rAF suspended it cannot be sampled continuously. This needs either a visible-tab harness or an external profiler.

### 4.3 Scene composition at rest (BF-3.4)

Read from `renderer.info` with `autoReset = false` around exactly one `composer.render()` — i.e. these are **per displayed frame**, across all composer passes:

| Metric | Value |
|---|---:|
| Draw calls | **41** |
| Triangles | **12,828** |
| Points | **24,090** |
| Lines | **44,377** |
| Geometries resident | 25 |
| Textures resident | 15 |
| Compiled programs | 18 |
| Spore particles (animated on CPU every frame) | 4,200 |
| Drawing buffer @ 1440 × 900 | 2880 × 1800 (DPR 2) |

Transparency/overdraw notes for the fidelity hierarchy: the scene is overwhelmingly **additive-blended line and point work** (44k lines + 24k points vs 12.8k triangles). The opaque triangles are the black occluder shells whose entire job is to hide far-side wires. The post chain is 4× MSAA offscreen → `UnrealBloomPass` (strength 0.62, radius 0.45, threshold 0.1) → custom `TemporalAccumulatePass` (TAA, Halton(2,3) 8-sample jitter, HDR blend before tonemap) → `OutputPass` (ACES Filmic, exposure 0.95). `?notaa=1` disables the accumulation for A/B measurement.

The hottest CPU loop is `spore-drift`: 4,200 spores updated per frame over a raw `Float32Array` (the comment explicitly notes the getter/setter API was too slow here).

---

## 5. Screenshot / state matrix (BF-2)

All captures on the reference machine, DPR 2, via the in-app browser pane. **"Visually verified" = a pixel screenshot was taken and inspected in this session.** "Structurally verified" = geometry, computed styles, and/or scene state read out of the live page via JS. Pixel files could not be written to disk from the harness (the screenshot tool returns images inline, with no file-write path), so `baseline-captures/` currently holds no PNGs — see §9.

| # | State | Viewport | Mode | Visually verified | Structurally verified | Notes |
|---|---|---|---|---|---|---|
| 1 | Resting, `?nointro=1` | 1440 × 900 | `desktop` | ✅ | ✅ | Spec's primary desktop pose |
| 2 | Resting, `?nointro=1` | 1280 × 800 | `desktop` | ✅ | ✅ | Canvas 2560 × 1600 |
| 3 | Resting, `?nointro=1` | 768 × 1024 | `tablet` | ✅ | ✅ | Stacked portrait layout |
| 4 | Resting, `?nointro=1` | 375 × 812 | `mobile` | ✅ | ✅ | CTA collapses to "EXPLORE"; CONNECT switches to the compact `alt` leader |
| 5 | Resting, `?dbg=1&nointro=1` | 615 × 317 | `compact` | ✅ | ✅ | Short-landscape composition |
| 6 | Intro frozen `?introat=0.25` | 1440 × 900 | `desktop` | ✅ | ✅ | Ground network only, converging inward. No stalk. Matches `WINDOWS`: ground 0.000–0.326, stem starts 0.296 |
| 7 | Intro frozen `?introat=0.55` | 1440 × 900 | `desktop` | ✅ | ✅ | Bare stalk risen to full height, no cap, no gills. Stem clip plane visibly slicing the top |
| 8 | Intro frozen `?introat=0.85` | 1280 × 720 | `desktop` | ✅ | ✅ | Cap + gills + rim inked; plume still gathering; **all three callouts still at opacity 0** (they boot at 5.55 s = progress 1.028) |
| 9 | All three callouts lit, `?nointro=1&lit=1` | 1440 × 900 | `desktop` | ✅ | ✅ | Corner brackets locked in, leaders lit, rings shown, EQUIP reveals "coming soon" |
| 10 | 01 INSPIRE lit alone (hover) | 1440 × 900 | `desktop` | ✅ | ✅ | Spore region highlight confirmed numerically — see below |
| 11 | 02 EQUIP idle / lit | — | all | via #9 | ✅ | Computed styles + geometry read; not isolated as its own pixel capture |
| 12 | 03 CONNECT idle / lit | — | all | via #9 | ✅ | As above |
| 13 | Tap pulse fired | 615 × 317 | `compact` | ✅ | ✅ | HUD `tap 0.000deg pulse 1000.00s` → `tap 0.248deg pulse 0.10s` |

`deskNarrow` (landscape, aspect < 1.55) was **not** captured — recorded gap, see §9.

### 5.1 Callout anchor geometry, measured (structural baseline)

Screen-space positions of the tracked node and the label box, at rest. These are the numbers a regression check should diff, since they are deterministic where pixels are not.

**1440 × 900, `desktop`:**

| Callout | Node transform | Label box L / R / T | Right-edge clearance |
|---|---|---|---:|
| `co-connect` | `translate(1231.9…)` region | 1231.9 / 1345.6 / 744.5 | −94.4 (clear) |
| `co-inspire` | — | 1348.0 / **1449.6** / 201.1 | **+9.6 (OVERFLOWS)** |
| `co-equip` | — | 863.5 / 957.0 / 550.1 | −483.0 (clear) |

**1280 × 800, `desktop`:** node transforms `co-connect translate(1013.2, 720.5)`, `co-inspire translate(1243.4, 255.2)`, `co-equip translate(923.5, 513.9)`. Label boxes: connect 1105.3–1219.0, inspire 1192.7–**1294.3**, equip 748.2–841.7. **INSPIRE overflows the right edge by 14.3 px.**

**768 × 1024, `tablet`:** nodes `connect translate(487.9, 916.2)`, `inspire translate(675.4, 558.0)`, `equip translate(455.6, 764.9)`. Clearances −74.4 / −41.8 / −394.4. All clear.

**375 × 812, `mobile`:** clearances −32.5 / −12.2 / −247.4. All clear. `#co-connect svg.alt` = `block`, `#co-inspire svg.tall` = `none` — the compact leaders engage as designed.

> **Known baseline defect, do not silently "fix":** in `desktop` mode at 16:10 the **01 INSPIRE label is clipped by the right viewport edge** — by 9.6 px at 1440 × 900 and 14.3 px at 1280 × 800. Its `tr` and `br` corner brackets sit off-screen in the lit state. This is present in the approved hero and is therefore part of the baseline. `compact` mode (615 × 317) similarly clips the 03 CONNECT label. Both are pre-existing. They are candidates for the anchor-tuning pass, not for a quiet drive-by change under a "no regression" banner.

### 5.2 Region-highlight verification (numeric)

Hovering `#co-inspire` (mouseenter dispatched, then frames driven):

| | Value |
|---|---:|
| Spore point-material `uOpacity` at rest | 2.4000 |
| Same, hovered | 4.1972 |
| Effective gain | ×1.749 |
| Stem material `uOpacity` (control) | 0.3200, unchanged |

Consistent with the source: `boost = 1 + h·(gain + gain·0.38·sin(t·3.1))` with `spores.gain = 0.85`, giving a breathing range of ×1.53–×2.17. The measured 1.749 falls mid-range. Regions are independent — hovering INSPIRE did not touch the stem.

---

## 6. Interaction inventory (BF-4.1) — everything that must survive

### 6.1 Tap pulse (`mushroom-scene.js` §10c, lines ~1512–1593)

Modelled as real mechanics, not a canned animation.

- Registered on `renderer.domElement` as `pointerdown` → `pointerup`. A tap qualifies only if released within **400 ms** and the pointer moved **≤ 7 px**; anything else is an OrbitControls drag and is ignored.
- Raycast hits **only the opaque `MeshBasicMaterial` occluder shells** of `mushroom` + `stemGroup` — those shells *are* the solid body for hit-testing.
- **Body hit:** torque `r × F` about the origin kicks `tap.vx` / `tap.vz` (coefficient 0.008), so lever arm falls out naturally — a cap tap (r.y ≈ 4) tips ~4× as far as a low stem tap, and pressing one cap edge tips toward that side. Angular velocity is **saturated at 0.09** so repeated pokes don't wind up ("flesh, not a bell").
- Ring-down: damped oscillator, `TAP_W = 2.3 rad/s`, `TAP_ZETA = 0.14`, integrated semi-implicit Euler in the `breeze` animator — so a poked mushroom **keeps swaying while it recovers**; the tap rides *on top of* the breeze, it does not replace it.
- **Light answer:** `pulseC` = hit point, `pulseT` = 0, `pulseP = (1.4, 1.5, 1.2)` — slow, short-range, gentle. The radial wave is a shared uniform injected into *every* glowing material (`injectDraw`, `pulseAt(vec3)`).
- **Cap taps** (`hit.point.y > 2.8`) call `shedSpores(28)` — 28 spores restart from their own gill release points.
- **Floor miss:** the ray is intersected with the `y = 0` plane; if the point is within radius 14 of `(0, 2)`, the wave fires from there instead with `pulseP = (2.6, 0.33, 1.4)` — fast, far-carrying, through the web. Outside 14, nothing.
- **Haptics:** `navigator.vibrate(6)` when `pointerType === 'touch'`. Source comment notes iOS exposes no web vibration API, so it silently no-ops there.
- `tap-pulse` animator advances `pulseT` only while `< 8` — parked past its decay it stops accumulating.
- **Verified live:** HUD went `tap 0.000deg pulse 1000.00s` → `tap 0.248deg pulse 0.10s`, with a visible cap tip and a fresh spore shed.

### 6.2 Cursor slipstream wind (lines ~1690–1789)

The single most distinctive behaviour, and the easiest to break.

- **Mouse only.** `pointermove` returns early if `e.pointerType !== 'mouse'`; and if `e.buttons !== 0` it sets `mw.on = false` — dragging is orbiting, not hovering. `document.mouseleave` clears it.
- Screen velocity is smoothed with `a = 1 - exp(-dt·7)` and clamped to ±3, so the stirred air **trails the cursor by a beat**.
- The cursor's view ray becomes an air current. For each spore: depth along the ray `tp` (only `1 < tp < 16` participates), perpendicular distance² `sd2`, falloff `fall = exp(-sd2/0.81)`, ignored beyond `sd2 ≥ 7.3` (~3 radii).
- **The subtle part, per the source comment:** inside the slipstream the ambient breeze **yields** rather than adds — `carry` is multiplied by `(1 - 0.6·fall)`. A purely additive push against the wind would cancel a comparable drift and read as nothing; displacing the ambient flow is what lets an against-the-wind sweep **visibly stall and turn the plume**. Any refactor that makes this additive will look correct in code and wrong on screen.
- Screen→world velocity is scaled per unit depth via `tan(fov/2)` and `camera.aspect`, so near and far plume deflect by the same **visual** amount.
- A resting cursor still applies a `steady = 0.018` units/s outward drift — enough to sense hover, never to scatter the cloud.
- Spores that leave bounds (`x > 6.8 || y > 7.6 || y < 0.2 || x < gx − 2.5`) re-release from their own gill spot; bounds are closed on every side so nothing wanders off permanently.

### 6.3 Callout hover / tap model

- **Hover (pointer devices):** `mouseenter` / `mouseleave` on each `.callout` calls `sceneApi.setHighlight(region, on)` with the mapping `co-inspire → spores`, `co-equip → stem`, `co-connect → ground`. Each region eases at `dt·5` toward its target and breathes at `sin(t·3.1)`. Gains: spores 0.85, stem 0.42, ground 0.42.
- **DOM lit state** is pure CSS on `.co:is(:hover, .force)`: core brightens + glows, ring becomes visible and starts the 1.7 s `co-pulse` loop, `.lit` leader path draws itself via `stroke-dashoffset: 100 → 0`, `.lead` brightens, tag goes gold with letter-spacing `0.30em → 0.34em`, `.no` brightens, and the four corner brackets **lock in clockwise** (tl, tr, br, bl) at 0 / 0.05 / 0.10 / 0.15 s delays with a `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot. Deactivation snaps back as one.
- **EQUIP only:** `.soon` ("coming soon") expands `max-height 0 → 1.4em` with a 0.1 s delay.
- **Touch (`matchMedia('(hover: none)')`):** hover is replaced by a tap toggle on the `.tag`. `preventDefault()`, then `.force` is cleared from **all** `.co` elements and re-added only if the tapped one wasn't already forced — so it is a **radio, not a checkbox**: at most one callout is lit at a time, and tapping the lit one turns it off. Scene highlights are set in the same pass, one region on and the other two off.
- **Touch idle boost** (`@media (hover: none)`): tag colour `0.48 → 0.72` alpha, leader stroke `0.30 → 0.45`, core `0.55 → 0.8` — because there is no hover to discover the affordance with.
- **Important asymmetry:** `?lit=1` forces the DOM `.force` class on all three but does **not** call `setHighlight` — so the QA lit screenshot shows lit labels over an *unhighlighted* scene. Hover is the only path that lights both. Don't read `?lit=1` as a full hover reference.

### 6.4 Stem sway, and EQUIP riding it

- One breeze signal drives both body lean and spore carry — "sharing one signal is what makes the motion read as air rather than as two unrelated animations."
- `breeze(t) = gust · (0.62·sin(1.20t) + 0.26·sin(1.83t + 1.3) + 0.07·sin(2.60t + 2.7))`, where `gust = 0.55 + 0.45·sin(0.13t + 0.6)` — a ~48 s swell/lull over a ~5.2 s primary sway, ~3.4 s second mode, ~2.4 s flutter.
- Two pivots: `swayGroup` (rotation.z `= −b·0.034 + tap.z`, rotation.x `= b·0.007 + tap.x`) and `capBend`, positioned exactly at the stem throat so the junction cannot shear. The cap **trails** the stalk — `capBend.rotation.z = −breeze(t − 0.30)·0.013 + (tap.z − 0.30·tap.vz)·0.38` — so the head whips a beat late.
- `swayGroup.updateMatrixWorld(true)` is called inside the `breeze` animator specifically so the `trackers` animator later in the same frame reads a current matrix.
- **The EQUIP callout is the only tracker with `sway: true`** — its world point is multiplied by `swayGroup.matrixWorld`, so the 02 label rides the stipe rather than sitting in static world space. INSPIRE and CONNECT are static world anchors. This is a named acceptance behaviour; preserve the flag.
- Trackers project to screen space every frame and write `translate(sx, sy)` plus `visibility = z < 1 ? 'visible' : 'hidden'`.

### 6.5 Intro choreography

Two halves keyed to each other; the CSS header warns "change one, move all."

**Scene half** — one `drawU` progress 0→1 over `intro = 5.4 s`, driven by **wall clock** (`performance.now()`), explicitly not accumulated rAF dt, because "rAF stops entirely in a hidden tab" and the CSS runs on wall clock. Each object claims a window:

| Objects | Window (fraction of 5.4 s) |
|---|---|
| web, roots | 0.000 – 0.311 |
| myc, ribbon | 0.015 – 0.311 |
| mossPts, beads | 0.047 – 0.326 |
| pools | 0.078 – 0.326 |
| motes | 0.233 – 0.556 |
| stemVerts | 0.296 – 0.515 |
| stemMesh | 0.419 – 0.560 |
| stemPts | 0.463 – 0.600 |
| gills | 0.574 – 0.715 |
| gillCore | 0.637 – 0.730 |
| rim | 0.698 – 0.793 |
| rimPts | 0.730 – 0.807 |
| capMesh | 0.761 – 0.870 |
| capBeads | 0.776 – 0.885 |
| overlay | 0.793 – 0.885 |
| overlayPts | 0.807 – 0.893 |
| spores | 0.715 – 1.000 (longest window — the plume gathers slowly) |

Draw order is **re-keyed**, not random: `convergeDraw` re-keys every ground vertex by distance from the base so threads stream **inward** and arrive as the stalk fires; `riseDraw` re-keys stem vertices by height so the stalk climbs as **one ring of ember light** rather than strand-by-strand.

Occluder shells are a special case: near-black shells would loom as a full silhouette from frame one, so `shellsAt(p)` fades the stem shell in over `p = 0.30…0.54` and the cap shells over `p = 0.574…0.714`, while the stem shell's clipping plane **rises with the climbing front** (capped at the cap line, `uClampY = 3.65`). At park, `drawU` glides **1 → 2 over 0.7 s** rather than snapping, so the stem's buried joint fades in behind the cap instead of popping.

**Page half** — CSS delays tuned against those beats: nav/h1/sub/CTA fade at 0.15 s; `.spill` (the mushroom's light touching the page) at 3.8 s as the cap ignites; callouts boot in **numbered order** at `--d` = 5.55 s (01 INSPIRE), 6.20 s (02 EQUIP), 6.85 s (03 CONNECT), each a small instrument powering on: core pops with overshoot, ring pings once, leader draws itself node→label, tag fades in as its number flickers (`steps(1, end)`).

**QA hooks:** `?introat=P` sets `drawU = P` and freezes the page's animations at `P × 5400 ms`; `?nointro=1` skips both halves. *Caveat found:* `?introat` pauses only animations that exist at the `load` event (`document.getAnimations()` is enumerated once) — anything created later, such as the hover `co-pulse`, keeps running.

### 6.6 Reduced motion

`skipIntro = matchMedia('(prefers-reduced-motion: reduce)').matches || ?nointro=1`. When set, an injected stylesheet kills all entry animations and `createScene` is called with `intro: 0` so the scene starts complete. The CSS block at `@media (prefers-reduced-motion: reduce)` additionally zeroes the callout animations, the `co-pulse` ring loop, and the `.lit` / `.ring` / `.tag` / `.ck` transitions. Every intro keyframe is authored to **end at the resting style**, so the reduced-motion path is the final state by construction.

> **Gap, as-is:** reduced motion stops the *entry choreography and the CSS transitions only*. The **scene keeps animating** — breeze sway, 4,200-spore drift, cursor wind, TAA jitter, and the highlight breathing all continue at full rate. A user with `prefers-reduced-motion: reduce` still gets a continuously moving mushroom. Recorded as baseline behaviour, and flagged as a real accessibility question for `12-platforms.md`.

### 6.7 WebGL-failure fallback

**There is none.** Greppted both files for `try`/`catch`, `isWebGLAvailable`, `webglcontextlost`, `<noscript>`, and any fallback path — **zero matches**. `new THREE.WebGLRenderer(...)` is called unguarded at module top level. On a machine without WebGL2, or on context loss, the module evaluation throws and the page is left as static text over an empty `#stage` (the nav, h1, sub and CTA still render, since they are plain DOM). There is no poster image, no `<noscript>`, and no context-restore handler. Recorded as a baseline gap — it is not a regression to add one, but the *current* behaviour is the reference point.

### 6.8 Responsive `ANCHORS` modes and resize

`getMode()` — evaluated at load and after a **150 ms debounced** resize:

| Mode | Condition | Camera (panX, camY, camZ, targetY, fov) |
|---|---|---|
| `mobile` | `w ≤ 620` and portrait | −0.15, 3.2, 11.5, 4.75, 64 |
| `tablet` | `w ≤ 900` and portrait | −0.7, 2.9, 12.0, 4.0, 50 |
| `compact` | landscape and `h ≤ 560` | −2.9, 2.3, 11.2, 2.7, 38 |
| `deskNarrow` | landscape and `w/h < 1.55` | −2.0, 2.3, 11.6, 2.65, 38 |
| `desktop` | otherwise | −2.4, 2.25, 10.4, 2.6, 38 |

Two modes interpolate continuously rather than snapping: `deskNarrow` blends `panX −2.0 → −1.7` and `camZ 11.6 → 12.5` across aspect 1.55 → 1.25 (keeping right-side callouts clear down to 4:3 iPads); `mobile` blends `targetY 4.75 → 5.95` and `camZ 11.5 → 12.8` across aspect 0.44 → 0.60. Both re-run `setView` on resize *even when the mode has not changed*.

Mode changes call `setView(view, 0.6)` — the camera **eases** between breakpoints via a cancellable `view-tween` animator (cubic in-out over position, target, and fov), never snaps. Per-mode world anchors are copied into `TRACKS[key].pos` in place, and `document.body` gets `mode-<name>`.

Per-mode `ANCHORS` (world units) are recorded verbatim in the source at `golden-mushroom-page.html:642-668` and are tuned against screenshots — treat them as measured constants, not guesses.

Renderer resize is separate (`syncRenderSizes`): renderer size, both composer targets, the TAA history (which invalidates itself — "stale-size history would smear a resize"), the bloom pass (sized in **CSS pixels**, since its spread is tuned there), and every dense-line material's `uRes`.

**Adaptive resolution:** a `perf-governor` animator samples 2.5 s windows and, if the average frame exceeds 24 ms, steps `pixelRatio` down by 0.25 (floor 1.0). It is a **one-way ratchet** — it never steps back up, so there is no resolution flicker. It did not engage on this machine at any tested viewport.

### 6.9 2RP / Discord control grouping

Both are plain `<a class="pill" href="#">` inside `nav > .nav-cta`, `gap: 0.7rem`, pill-shaped with a 1 px `rgba(242,237,225,0.58)` border, hover lifting border to full `--ink` plus a 6 % background wash. `href="#"` — **neither is wired to a destination.** They fade in with the rest of the nav at 0.15 s. No JS is attached. On mobile they shrink to `0.42rem 1rem` padding / `0.72rem` font.

### 6.10 Other QA / design-review hooks (must keep working)

| Param / key | Effect |
|---|---|
| `?introat=P` | Freeze both halves of the intro at progress P |
| `?nointro=1` | Skip the entry entirely |
| `?lit=1` | Force `.force` on all three callouts, transitions snapped (DOM only — no scene highlight) |
| `?hl=spores\|stem\|ground` | Force one scene region highlight |
| `?dbg=1` | Expose `window.sceneApi` **and** render a live HUD (`t / sway / bend / tap / pulse`) bottom-left |
| `?notaa=1` | Disable the temporal accumulation pass |
| `?body=serif` or the **B** key | Toggle the serif body-copy A/B |

`?dbg=1` is the hook the regression check depends on — `window.sceneApi` exposes `scene`, `camera`, `renderer`, `composer`, `controls`, `groups` (mushroom / stem / sway / ground / spores), `consts` (CAP_Y, CAP_R, CAP_H, STEM_TOP, FOG_NEAR, FOG_FAR), `setHighlight`, `setView`, and `addAnimator`.

---

## 7. Accessibility, as-is (BF-4.2)

Recorded as the "no regression" reference, imperfections included.

- **Focus order is the DOM order, and the DOM puts the callouts first.** Tab order: `03 CONNECT` → `01 INSPIRE` → `02 EQUIP` → `BANODOCO` → `2RP` → `Discord` → `EXPLORE THE ECOSYSTEM`. So a keyboard user meets the three on-mushroom annotations **before** the logo and nav, and meets them in the order 03, 01, 02 — neither visual order nor numeric order. (`.callouts` is a sibling that precedes `.ui` in the markup.)
- **Accessible names come only from visible text**, computed as `"03 CONNECT"`, `"01 INSPIRE"`, `"02 EQUIP coming soon"`. No `aria-label`, no `title`, no `aria-describedby` anywhere in the page.
- **Every link is `href="#"`.** All seven. Nothing navigates.
- **`:focus` is never styled.** The lit state is bound to `.co:is(:hover, .force)` only — `:focus` and `:focus-visible` are absent from the stylesheet, so a keyboard user tabbing to a callout gets the UA default outline and **no leader, ring, bracket, or scene highlight**. The entire hover affordance is mouse/touch-only.
- **The canvas is unlabelled** — no `role`, no `aria-label`, no fallback content inside `#stage`. To a screen reader the mushroom does not exist.
- No skip link. No landmarks beyond the implicit `<nav>`. Single `<h1>`, correct and unique. Zero `<img>` elements, so no alt-text surface.
- The three callout tags are `visibility: hidden` whenever their tracked point goes behind the camera (`_trackV.z ≥ 1`) — which correctly removes them from the a11y tree, but is driven by camera state, not by intent.

---

## 8. PROPOSED regression budgets — *pending Hannah sign-off*

**These numbers are proposed by the Tech Lead and are NOT yet agreed.** BF-6.1 requires Peter + Tech Lead to set them; Hannah to schedule that call. Gate G0 does not close until they are signed.

Rationale for the shape of these: the hero currently sits at ~1–2 ms CPU on a 16.7 ms budget with the adaptive-resolution governor never engaging, so there is real headroom — but 87.5 % of the bundle is one unminified vendor file, so *bundle* is where an extension will hurt first, and it is the metric worth holding tightest.

| Metric | Baseline | Proposed max delta | Proposed hard ceiling | Measured how |
|---|---:|---:|---:|---|
| Initial-load bundle, raw | 1,491,377 B | **+10 % (+149,138 B)** | 1,640,515 B | §3 table, `curl -sI` per resource |
| Initial-load bundle, gzip | ~319,387 B | **+10 % (+31,939 B)** | ~351,326 B | `gzip -c \| wc -c` |
| Requests to first meaningful render | 14 | **+4** | 18 | `performance.getEntriesByType('resource')` |
| TTI (warm cache, `loadEventEnd`) | 340 ms | **+10 % (+34 ms)** | 374 ms | `PerformanceNavigationTiming` |
| Scene CPU / frame at Mission rest | ~1.2 ms typ. (0.9 floor) | **+1.0 ms** | 2.2 ms typ. | rAF probe, §4.2 |
| Frame cadence at Mission rest | 16.7 ms locked, 0 drops | **no dropped frames** | — | rAF timestamp deltas |
| Draw calls / frame at rest | 41 | **+10 %** | 45 | `renderer.info`, `autoReset = false` |
| Lines + points / frame at rest | 68,467 | **+10 %** | 75,313 | `renderer.info` |
| `renderer.getPixelRatio()` at rest | 2 | **must stay 2** | — | governor must not engage |
| Callout screen anchors | §5.1 table | **± 2 px** | — | `getBoundingClientRect()` |
| Screenshot diff at Mission pose | — | **see below** | — | visual |

**Proposed screenshot-diff tolerance.** A naive per-pixel diff will fail 100 % of the time here and must not be used as the gate: the scene is in permanent motion (breeze on a ~48 s gust cycle, 4,200 drifting spores, TAA jitter), so no two frames are ever identical. Proposed instead:

- **Gate on the frozen intro states**, which *are* deterministic in geometry: `?introat=0.25 / 0.55 / 0.85`. Even there the spores and sway differ per frame, so compare with a perceptual metric, not exact pixels — proposed **≤ 2 % of pixels differing by more than 8/255 per channel**, ignoring the spore-plume bounding box.
- **Gate the resting pose structurally, not visually**: the anchor table in §5.1 (± 2 px), the `renderer.info` counts, the mode string, and the drawing-buffer size. These are stable frame to frame and catch every layout/composition regression a screenshot would.
- **Keep a human eye in the loop** for look: side-by-side of states 1, 6, 7, 8, 9 against this document's descriptions at every gate. The handoff's own language is "may not *silently* regress" — a named reviewer is the intended backstop, not a pixel threshold.

---

## 9. Gaps, deviations, and things that blocked this capture

Recorded honestly so the gate decision is informed.

1. **No PNG files on disk.** `baseline-captures/` was created but is empty. The in-app browser returns screenshots inline to the agent; it exposes no write-to-path option, and the page cannot be asked to save its own canvas without modifying it (forbidden). Every state in §5 was visually inspected in-session, and the structural readings that *can* be persisted are recorded in §5.1. **Recommendation:** re-run the matrix once with a headless capture tool that can write files (see `tools/regression-check.md` §5), or accept the structural baseline as the gate and keep visual review human.
2. **GPU frame time not measurable** (BF-3.3). Timer queries never resolve in a hidden tab; `gl.finish()` does not stall meaningfully. Only CPU-side frame cost and vsync cadence are recorded.
3. **Intro-phase frame time not measured** (BF-3.3). rAF is suspended; the wall-clock-driven intro completes without frames to sample.
4. **Cold-cache TTI not measured** (BF-3.2, "throttled and unthrottled"). No cache-disable in the harness, and the importmap paths carry no bustable query. Only the warm 340 ms is recorded. **No CPU throttling was applied either — so the Tier 2 emulation half of decision D8 is not yet exercised.** Tier 2 numbers in this document are viewport-only emulation, on this machine, with no CPU slowdown. That is a material gap against BF-5.1 and should be closed before G5.
5. **`deskNarrow` mode not captured.** The other four `ANCHORS` modes are covered. `deskNarrow` is the iPad-landscape case with continuous interpolation, so it deserves its own row.
6. **Concurrent-session interference.** Twice during this task the shared browser pane was navigated away from the hero mid-measurement by a parallel task in this session — once to `http://localhost:8137/journey-v6/index.html` and once to `file://…/journey-v6-plan/map/page1-anatomy.html`. A `journey-v6/` directory appeared under `glowshroom/` at 15:16–15:23 while this task was running. **The hero files themselves were not touched** — SHA-256 re-verified identical at task end, mtimes still `Jul 31 17:07`. But any future re-run of this baseline needs the browser pane to itself, or a dedicated tab, or it will silently measure the wrong page.
7. **Two pre-existing layout defects** are now baseline, not bugs to fix quietly: INSPIRE clipped at the right edge in `desktop` mode (§5.1), and CONNECT clipped in `compact`.
8. **Two pre-existing behavioural gaps** are now baseline: no WebGL-failure fallback of any kind (§6.7), and reduced motion that stops the intro but not the scene (§6.6).
9. **BF-7.1 (consent pipeline kickoff) is not part of this task** and has not been actioned here. It remains open and is the longest-lead item in the project.

---

## 10. Sign-off

| Item | Status |
|---|---|
| BF-1 Snapshot the artifact | ✅ Done |
| BF-2 Visual baseline | 🟡 States verified in-session; no persisted PNGs (§9.1), `deskNarrow` missing (§9.5) |
| BF-3 Performance baseline | 🟡 Bundle, TTI, CPU frame time, scene counts done; GPU time and intro-phase time not measurable (§9.2–9.4) |
| BF-4 Interaction inventory | ✅ Done (§6, §7) |
| BF-5 Reference devices | 🟡 Machine recorded; Tier 2 CPU throttling not yet exercised (§9.4) |
| BF-6 Regression budgets | ✅ **Signed by Hannah 2026-08-02** (see below) |
| BF-7 Consent pipeline | 🔴 Deferred per decision D10 (placeholders for now) |

**G0 closed 2026-08-02** — budgets in §8 are binding as of this date.

- [x] Hannah — budgets reviewed and approved (2026-08-02, in session)
- [ ] Peter — retroactive taste-owner ack of the screenshot-diff approach (non-blocking; Hannah exercised operational authority per project decision model)
- [x] Tech Lead — regression methodology validated against the untouched hero during W1-A (structural gate: anchors ±2px + renderer.info counts; perceptual diff on frozen `?introat` states only)
