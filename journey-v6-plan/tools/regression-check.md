# Hero regression check — repeatable procedure

Re-runs the W1-A baseline comparison against `BASELINE.md`. **Mandatory at every gate and before every merge into the extended build** (risk #1 in the master plan: the hero "may not silently regress merely because later chapters exist").

Budgets live in `BASELINE.md` §8 and are **proposed, not yet signed**. Until they are signed this check reports numbers; it does not fail a build.

Roughly 10 minutes by hand.

---

## 0. Preconditions

```bash
# The static server must be up on 8137, rooted at glowshroom/
curl -sI http://localhost:8137/golden-mushroom-page.html | head -1
# expect: HTTP/1.0 200 OK

# If it is not running:
python3 -m http.server 8137 --directory /Users/hannahomalley/nigel/ados-paris/glowshroom
```

**Claim the browser pane.** Other tasks in a shared session will navigate it out from under you — this happened twice during the original capture (`BASELINE.md` §9.6). Open a dedicated tab and pass its `tabId` to every browser call. After every navigation, assert you are on the right page before trusting any reading:

```js
location.href  // must contain golden-mushroom-page.html
```

**Query-param gotcha.** The in-app `navigate` tool has been observed to drop everything after the first `&`. Put `dbg=1` **first** — `?dbg=1&nointro=1`, not `?nointro=1&dbg=1` — and verify `typeof window.sceneApi === 'object'` before measuring.

---

## 1. Integrity — has the frozen hero moved?

```bash
cd /Users/hannahomalley/nigel/ados-paris/glowshroom
shasum -a 256 golden-mushroom-page.html mushroom-scene.js
```

Expected, byte-for-byte:

```
5638dd0d3d9ed7e19cf47b19f8d87852f6e116ddbb653a5ff8f41e1d5ee85f5c  golden-mushroom-page.html
eee1967d5acd4a9f4be10864012de3c8f253b97cbf2decbd483271884fd87d7e  mushroom-scene.js
```

A mismatch is not automatically a failure — the extension work will eventually change these files. It means **switch to comparing behaviour, not hashes**, and record what changed and why. Diff against the frozen copies:

```bash
diff archive/golden-mushroom-page-2026-08-02.html golden-mushroom-page.html
diff archive/mushroom-scene-2026-08-02.js       mushroom-scene.js
```

---

## 2. Bundle weight

```bash
cd /Users/hannahomalley/nigel/ados-paris/glowshroom
for f in golden-mushroom-page.html mushroom-scene.js \
  vendor/three/three.module.js \
  vendor/three/addons/controls/OrbitControls.js \
  vendor/three/addons/postprocessing/EffectComposer.js \
  vendor/three/addons/postprocessing/RenderPass.js \
  vendor/three/addons/postprocessing/UnrealBloomPass.js \
  vendor/three/addons/postprocessing/OutputPass.js \
  vendor/three/addons/postprocessing/Pass.js \
  vendor/three/addons/postprocessing/MaskPass.js \
  vendor/three/addons/postprocessing/ShaderPass.js \
  vendor/three/addons/shaders/CopyShader.js \
  vendor/three/addons/shaders/LuminosityHighPassShader.js \
  vendor/three/addons/shaders/OutputShader.js; do
  b=$(curl -sI "http://localhost:8137/$f" | grep -i content-length | tr -d '\r' | awk '{print $2}')
  g=$(gzip -c "$f" | wc -c | tr -d ' ')
  printf "%-62s %8s %8s\n" "$f" "$b" "$g"
done | tee /tmp/bundle-now.txt
awk '{r+=$2; g+=$3} END {printf "TOTAL raw %d  gzip %d\n", r, g}' /tmp/bundle-now.txt
```

**Compare to:** raw 1,491,377 · gzip ~319,387 · 14 requests.
**Proposed budget:** +10 % raw (≤ 1,640,515), +10 % gzip (≤ ~351,326), ≤ 18 requests.

If the extension adds files, extend the list above — the authoritative request list is whatever `performance.getEntriesByType('resource')` reports in step 3.

---

## 3. TTI and request count (warm cache)

Navigate a dedicated tab to `http://localhost:8137/golden-mushroom-page.html?cb=<random>`, then:

```js
(() => {
  const n = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  return JSON.stringify({
    href: location.href,
    responseEnd: +n.responseEnd.toFixed(1),
    domInteractive: +n.domInteractive.toFixed(1),
    dclEnd: +n.domContentLoadedEventEnd.toFixed(1),
    loadEnd: +n.loadEventEnd.toFixed(1),
    requests: res.length + 1,
    encodedTotal: res.reduce((s, r) => s + r.encodedBodySize, 0) + n.encodedBodySize,
  });
})()
```

**Compare to:** `loadEnd` 340.4 ms · `domInteractive` 83.9 ms · 14 requests · 1,491,377 encoded bytes.
**Proposed budget:** `loadEnd` ≤ 374 ms.

Run it three times and take the median — first navigation after a server restart is cold and will read high. Note in the log whether the run was warm.

---

## 4. Frame time and scene composition at the Mission resting pose

Navigate to `http://localhost:8137/golden-mushroom-page.html?dbg=1&nointro=1` at **1440 × 900**. Confirm `window.sceneApi` exists.

### 4a. Arm the per-frame probe

```js
(() => {
  window.__p = { frameMs: [], cpuMs: [], last: null };
  (function probe(ts) {
    const p = window.__p;
    p.cpuMs.push(performance.now() - ts);
    if (p.last !== null) p.frameMs.push(ts - p.last);
    p.last = ts;
    requestAnimationFrame(probe);
  })(performance.now());
  return 'armed';
})()
```

The probe re-registers from inside its own callback, so it always runs **after** the scene's `animate()` in the same frame — `performance.now() - ts` is therefore the scene's whole CPU frame cost (all animators + composer submit).

### 4b. Drive frames

The browser pane runs the page as a hidden tab, so rAF only ticks while a screenshot is being captured. **Take 2–3 screenshots back to back.** Each yields ~8–16 frames.

### 4c. Read the result

```js
(() => {
  const p = window.__p;
  const stat = a => {
    if (!a.length) return null;
    const s = a.slice().sort((x, y) => x - y);
    const q = pp => s[Math.min(s.length - 1, Math.floor(s.length * pp))];
    return { n: a.length, avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2),
             p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), min: +s[0].toFixed(2) };
  };
  const api = window.sceneApi, r = api.renderer;
  r.info.autoReset = false; r.info.reset();
  api.composer.render();
  const info = { calls: r.info.render.calls, triangles: r.info.render.triangles,
                 points: r.info.render.points, lines: r.info.render.lines };
  r.info.autoReset = true;
  return JSON.stringify({
    cadence: stat(p.frameMs.filter(x => x < 100)),
    sceneCpu: stat(p.cpuMs),
    perFrame: info,
    memory: r.info.memory,
    pixelRatio: r.getPixelRatio(),
    buffer: [r.domElement.width, r.domElement.height],
  });
})()
```

**Compare to:**

| | Baseline | Proposed budget |
|---|---:|---:|
| cadence `p50` | 16.7 ms | 16.7 ms, no dropped frames |
| `sceneCpu` `min` (clean floor) | 0.9 ms | ≤ 1.9 ms |
| `sceneCpu` `p50` | ~1.2 ms | ≤ 2.2 ms |
| draw calls | 41 | ≤ 45 |
| triangles | 12,828 | ≤ 14,111 |
| points | 24,090 | ≤ 26,499 |
| lines | 44,377 | ≤ 48,815 |
| `pixelRatio` | 2 | **must still be 2** |
| buffer | 2880 × 1800 | unchanged |

> **Ignore `sceneCpu` outliers of 5–15 ms.** They are screenshot pixel-readback charged into the frame, not scene cost. Judge on `min` and `p50`. A `pixelRatio` below 2 means the scene's own `perf-governor` engaged (2.5 s window averaged > 24 ms) — that is an automatic **fail**, and the most reliable single signal in this whole check.

---

## 5. State matrix

For each row: navigate, confirm `location.href`, screenshot, and read the structural assertion. The structural readings are the real gate — pixels drift every frame because the scene never stops moving.

| # | URL suffix | Viewport | Expected `body.className` |
|---|---|---|---|
| 1 | `?nointro=1` | 1440 × 900 | `mode-desktop` |
| 2 | `?nointro=1` | 1280 × 800 | `mode-desktop` |
| 3 | `?nointro=1` | 768 × 1024 | `mode-tablet` |
| 4 | `?nointro=1` | 375 × 812 | `mode-mobile` |
| 5 | `?nointro=1` | 900 × 700 | `mode-deskNarrow` |
| 6 | `?nointro=1` | 900 × 400 | `mode-compact` |
| 7 | `?introat=0.25` | 1440 × 900 | ground network only, no stalk |
| 8 | `?introat=0.55` | 1440 × 900 | bare stalk, no cap |
| 9 | `?introat=0.85` | 1440 × 900 | cap + gills + rim; callouts still opacity 0 |
| 10 | `?nointro=1&lit=1` | 1440 × 900 | all three lit, brackets locked in |

**Resize note:** the page reads the viewport at load and re-evaluates on a **150 ms debounced** resize. Always `resize_window` **first**, then navigate — a navigate-then-resize sequence leaves a 0 × 0 canvas or a stale mode. If the canvas reads `[0, 0]`, reload.

Structural assertion, run on every row:

```js
(() => JSON.stringify({
  href: location.href,
  vp: [innerWidth, innerHeight],
  mode: document.body.className,
  canvas: (c => c ? [c.width, c.height] : null)(document.querySelector('#stage canvas')),
  tags: [...document.querySelectorAll('.callout')].map(c => {
    const r = c.querySelector('.tag').getBoundingClientRect();
    return { id: c.id, L: +r.left.toFixed(1), R: +r.right.toFixed(1),
             T: +r.top.toFixed(1), overflowR: +(r.right - innerWidth).toFixed(1) };
  }),
  anchors: [...document.querySelectorAll('.callout')]
    .map(c => ({ id: c.id, t: c.style.transform, v: c.style.visibility })),
}))()
```

**Compare `tags` to `BASELINE.md` §5.1. Proposed tolerance ± 2 px.**

Known baseline values that must **not** be "fixed" without a logged decision:
- `desktop` @ 1440 × 900 — `co-inspire.overflowR = +9.6` (label clipped off the right edge)
- `desktop` @ 1280 × 800 — `co-inspire.overflowR = +14.3`
- `compact` — `co-connect` clipped at the right edge

If those overflows *disappear*, someone changed the approved hero's anchors. That is a diff to explain, not a win.

---

## 6. Interaction smoke test

Each of these must still hold. Full descriptions in `BASELINE.md` §6.

### 6a. Tap pulse

On `?dbg=1&nointro=1`, dispatch a synthetic tap on the cap, then screenshot (to drive frames) and read the HUD:

```js
(() => {
  const cv = document.querySelector('#stage canvas');
  const x = Math.round(innerWidth * 0.72), y = Math.round(innerHeight * 0.35);
  const mk = (t, b) => new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse', buttons: b });
  cv.dispatchEvent(mk('pointerdown', 1));
  cv.dispatchEvent(mk('pointerup', 0));
  return 'tapped at ' + x + ',' + y;
})()
```

Then read the HUD text (bottom-left green monospace). **Pass:** `tap` goes from `0.000deg` to a non-zero value (baseline observed **0.248deg**) and `pulse` resets from `1000.00s` to near `0`. The cap should visibly tip and shed a puff of spores.

### 6b. Region highlight on callout hover

```js
(() => {
  const m = window.sceneApi.groups.spores.material;
  const before = m.uniforms.uOpacity.value;
  document.getElementById('co-inspire').dispatchEvent(new MouseEvent('mouseenter'));
  window.__hl = { before, m };
  return 'before ' + before;
})()
```

Screenshot to drive frames, then:

```js
JSON.stringify({ before: window.__hl.before, after: window.__hl.m.uniforms.uOpacity.value })
```

**Pass:** `before` = 2.40, `after` in the range **3.67 – 5.21** (the breathing band ×1.53–×2.17; baseline sample 4.197). The stem material must stay at 0.32.

### 6c. Cursor slipstream wind

Not scriptable into a single assertion — it is a look call. Sweep the mouse **against** the wind (right → left) across the plume and confirm the plume **stalls and turns** rather than merely receiving an additive nudge. If a refactor made the slipstream additive instead of displacing the ambient carry, this is the only place it shows. See `BASELINE.md` §6.2.

### 6d. EQUIP rides the sway

`TRACKS.equip` must still carry `sway: true`. Confirm the 02 EQUIP node tracks the stipe as it leans, while 01 and 03 sit still in world space. Grep guard:

```bash
grep -n "sway: true" /Users/hannahomalley/nigel/ados-paris/glowshroom/golden-mushroom-page.html
```

### 6e. Touch callout model

Emulate a touch device (`hover: none`), then tap each tag in turn. **Pass:** at most one callout lit at a time (radio, not checkbox), and tapping the lit one turns it off.

### 6f. Reduced motion

Load with `prefers-reduced-motion: reduce`. **Pass:** the entry choreography is skipped and the page shows the settled state. **Known baseline:** the scene keeps moving (breeze, spores, wind, TAA). Do not record that as a regression — it is the reference behaviour.

### 6g. QA hooks still live

`?introat=P`, `?nointro=1`, `?lit=1`, `?hl=…`, `?dbg=1`, `?notaa=1`, `?body=serif`, **B** key. The check itself depends on `?dbg=1` and `?nointro=1`, so those two are self-testing.

---

## 7. Accessibility snapshot

```js
(() => {
  const f = [...document.querySelectorAll('a[href],button,[tabindex]')];
  return JSON.stringify({
    tabOrder: f.map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()),
    ariaLabels: f.map(e => e.getAttribute('aria-label')),
    canvasAria: (c => c ? { role: c.getAttribute('role'), label: c.getAttribute('aria-label') } : null)
                 (document.querySelector('#stage canvas')),
  });
})()
```

**Baseline tab order:** `03 CONNECT`, `01 INSPIRE`, `02 EQUIP coming soon`, `BANODOCO`, `2RP`, `Discord`, `EXPLORE THE ECOSYSTEM`. All `aria-label`s null; canvas unlabelled; no `:focus` styling anywhere.

This is the "no regression" reference, imperfections included. Improving it is welcome and is `12-platforms.md` work — but it must be a **logged, intentional** change, not an accident, because the tab order is load-bearing for the acceptance checklist.

---

## 8. Recording the run

Append to `journey-v6-plan/regression-log.md` (create on first run):

```
## <date> — <branch/commit> — <who>
- Integrity:    hashes match / diff summarised
- Bundle:       raw ______ (Δ __%)  gzip ______ (Δ __%)  requests __
- TTI:          ______ ms (Δ __%)   [warm/cold]
- Frame:        cadence p50 ____ ms · sceneCpu min ____ / p50 ____ ms · pixelRatio __
- Composition:  calls __ · tris ______ · points ______ · lines ______
- Anchors:      max deviation ____ px
- Interactions: 6a __ 6b __ 6c __ 6d __ 6e __ 6f __ 6g __
- Verdict:      PASS / PASS-WITH-NOTES / FAIL
- Notes:
```

---

## 9. Known harness limitations

Carried from `BASELINE.md` §2 and §9 — do not rediscover these:

- The browser pane is a **permanently hidden tab**. rAF runs only during screenshot capture; `paint` timing entries never appear; GPU timer queries never resolve. **GPU-side frame time is not obtainable here** — CPU frame cost and vsync cadence are the available proxies.
- Screenshots cannot be written to disk from this harness, so there are no stored reference PNGs. Visual comparison is human, against the descriptions in `BASELINE.md` §5. **To close this properly**, re-run the matrix once under a headless capture tool that can write files (Playwright/Puppeteer against the same URLs and viewports) and commit the PNGs to `baseline-captures/`; the structural assertions in §5 above transfer unchanged.
- Cold-cache TTI and CPU-throttled Tier 2 numbers are **not yet captured**. Both are needed before G5.
- A concurrent session sharing this browser will navigate your tab away mid-run. Always re-assert `location.href` before trusting a reading.
