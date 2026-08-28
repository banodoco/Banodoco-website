# TIER-WIRING — HISTORICAL (integration landed differently)

**Task:** W4-F (platforms), second half. **Written:** 2026-08-02.
**Status (2026-08-16):** superseded. The static tier was linked from the
rail's site-map panel instead of the capability-redirect design below
(decision D11: a link a person chooses, not a reduced-motion redirect —
journey/rail.js), and the failure doors this doc specified were built in
the 2026-08-16 resilience pass (main.js: createScene guard, journey-import
recovery, context-loss note — each pointing at `static/`). The `?tier=`
flag was never created. The Tier-3 page sections below remain accurate;
the wiring sections are kept as design history only. File references to
`mushroom-scene.js` and `core/` predate the M2/M4 renames.

**Current navigation note (2026-08-27):** with JavaScript available, Tier 3
shows one chapter at a time and switches it only through its chapter links;
wheel, vertical touch and scroll keys cue that navigator instead of changing
chapters. Its menu and long active chapter retain internal overflow so content
stays reachable. With JavaScript disabled, the five authored sections remain a
normally scrollable document as the accessibility-safe recovery baseline.

**Capture pipeline sections (§2 and §4) are ALSO now historical, not current
behavior — flagged here rather than rewritten.** They describe the pre-freeze
state: `?capture=` as a proposal rather than shipped (§2, "the hard
prerequisite for a pixel gate... without it... `capture.py --check` is
advisory only"), and `--check` as "advisory today, a real gate once
`?capture=` lands" (§4). Both landed at M6 (2026-08-04, capture.py's own
header) — before this status note was written — and `--check` is a REAL,
non-advisory gate in frozen mode today (see `tools/README.md`, `BUILDING.md`).
§4 also predates current git availability (the doc's "git is still
unavailable" no longer holds). For current capture/gate behavior, see
`tools/README.md`'s "The capture loop" and "The commit gate" sections.

Original handover text follows, unedited:

| Built this pass | Path |
|---|---|
| Capture pipeline | `tools/capture.py` |
| Ten chapter stills + manifest | `static/captures/` |
| The complete static journey | `static/index.html` |

Everything below is ordered by what blocks what. **§1 and §2 are the two items
that actually block G5;** §3–§6 are correctness and hygiene.

---

## 1. Route to Tier 3 — capability detection in the live page

Today the live page has **no fallback of any kind**. BASELINE.md §6.7 recorded
this and grep still agrees: `new THREE.WebGLRenderer(...)` is called unguarded
at module top level inside `createScene()`, so on a machine without WebGL2 the
module evaluation throws and the visitor is left with nav + headline over an
empty `#stage`. Tier 3 now exists; it needs three doors into it.

### 1.1 Where the probe goes

A **classic** `<script>` (not `type="module"`) in `<head>` of
`index.html`, *before* the importmap and before the module that
imports `../mushroom-scene.js`. It must be inline: the hero's regression budget
allows +4 requests and +10 % bytes (BASELINE.md §8), and this should spend
none of either.

```html
<script>
(function () {
  var q = new URLSearchParams(location.search);
  if (q.get('tier') === '1') return;                 // QA escape hatch, both ways
  var go = function (why) {
    // carry the route across: a deep link handed to a Tier-3 visitor must land
    // in the same chapter/node. static/index.html parses the identical scheme.
    location.replace('static/' + (location.hash || '#/mission') + '?from=' + why);
  };
  if (q.get('tier') === '3') return go('qa');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return go('reduced-motion');
  try {
    var c = document.createElement('canvas');
    if (!c.getContext('webgl2')) return go('no-webgl2');
  } catch (e) { return go('no-webgl2'); }
})();
</script>
```

`?tier=1` and `?tier=3` are the QA overrides — without them neither tier is
reachable on a machine that auto-detects the other, and the G5 tier-identity
review (PL-3.4) needs to put all three side by side.

### 1.2 Door two — WebGL *init* failure

The capability probe passes on machines where context creation still fails
later (driver blocklists, exhausted GPU memory, headless VMs). Wrap the
`createScene(...)` call in `index.html`:

```js
let sceneApi;
try { sceneApi = createScene({ ... }); }
catch (err) {
  console.error('[tier1] scene init failed, falling back to Tier 3', err);
  location.replace('static/' + (location.hash || '#/mission') + '?from=init-failure');
  throw err;                                   // stop the rest of this module
}
```

### 1.3 Door three — context loss

`webglcontextlost` on `sceneApi.renderer.domElement`. This is the **only**
runtime condition allowed to swap to static (PL-3.2). Prefer a restore attempt
first; fall back if restore does not arrive:

```js
sceneApi.renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();                                  // allow restore
  setTimeout(() => {
    if (!sceneApi.renderer.getContext().isContextLost || sceneApi.renderer.getContext().isContextLost())
      location.replace('static/' + (location.hash || '#/mission') + '?from=context-lost');
  }, 2500);
});
```

### 1.4 ⚠ One decision this needs, not an implementation detail

Routing `prefers-reduced-motion` to `static/` is **required** by PL-2.4 and by
the handoff ("prefers-reduced-motion receives a complete static journey"), but
it **changes the accepted Mission path**, which the handoff's LOADING section
says to preserve. Today (BASELINE.md §6.6) reduced motion stops the intro and
the CSS transitions and lets the scene keep moving — sway, 4,200 spores, cursor
wind, TAA jitter all continue. The correct fix is this redirect; it is also a
visible change to what a reduced-motion visitor sees on the *hero*.

**Get an explicit ack before wiring 1.1** — this is a Peter-class call (what the
page *is* for a class of visitor), not an operational one. Frame it as: "reduced
motion currently still gets a fully animated mushroom, which is the thing the
setting exists to prevent; the fix sends them to the static journey instead."

---

## 2. `?capture=<pose>` — what it must actually freeze

This is the hard prerequisite for a pixel gate (ADR D5 §"Measured, not assumed";
BASELINE.md §8). Without it, run-to-run variance on *identical URLs* is ~1–3
MAE/255 with ~8 % of pixels differing by more than 8 — so a diff threshold is
meaningless and `capture.py --check` is advisory only (it is coded that way, see
`CHECK_IS_ADVISORY`).

The current stills are correct and ship-quality — they are one honest frame of a
living scene. What they are *not* is reproducible. Freeze list, by source:

| # | What | Where it lives | What "frozen" means |
|---|---|---|---|
| 1 | Journey progress | `journey.js` `placeAt()` | already covered by `?pose=` — keep it |
| 2 | Breeze / gust | `mushroom-scene.js` `breeze` animator | evaluate `breeze(t)` at a fixed `t` (0 is fine) and stop advancing it: `swayGroup.rotation.z/.x` and `capBend.rotation.z` become constants |
| 3 | Tap ring-down | same animator | `tap.x/z/vx/vz = 0`, `pulseT` parked past decay |
| 4 | Spore field | `spore-drift`, 4,200 spores over a raw `Float32Array` | re-seed from the existing fixed seed (`1337`, `helpers.rng` = mulberry32) and step a **fixed N with a fixed dt**, never wall clock |
| 5 | Cursor slipstream | `pointermove` handler | `mw.on = false` **and** kill the resting `steady = 0.018` outward drift |
| 6 | TAA | `TemporalAccumulatePass`, Halton(2,3) ×8 | pin the jitter to sample 0 and pre-converge the history over a fixed frame count. Do **not** just use `?notaa=1` — that changes the grade, and Tier 3 must carry the *shipping* grade (PL-3.4) |
| 7 | Handheld / quiet drift | `quiet:{x:-5.2,z:4.2,rx:4.8,rz:3.4,strength:0.7}` in `index.html`, plus the handheld layer in `core/director.js` | phase 0, amplitude 0 |
| 8 | Region-highlight breathing | `sin(t·3.1)`, gains spores 0.85 / stem 0.42 / ground 0.42 | hold at the eased target, no breath |
| 9 | Adaptive resolution | `perf-governor` one-way `pixelRatio` ratchet | pin to the capture DPR so a slow capture run cannot silently halve the resolution |

**And the one addition worth more than all nine:** expose a readiness flag.

```js
// after the deterministic settle frames have run
window.journey.captureReady = true;
```

`capture.py` currently gates on `window.journey.chapter === <pose>` and then
sleeps `SETTLE_S = 2.5 s` — 35 s of wall clock across the golden list, all of it
guesswork. With the flag it gates on truth and the sleep goes to zero. When you
add it, change `READY_JS` in `capture.py` to check it and set `SETTLE_S = 0`.

---

## 3. Watchdog demotion — Tier 1 → Tier 2 only

PL-3.2 and the handoff are both categorical: **never live-swap WebGL → static
unless WebGL fails.** Encode that as a hard rule, not a convention.

- The only paths to Tier 3 are the three in §1 (detection, init failure, context
  loss). A frame-rate watchdog must have **no** code path to `static/`.
- Demotion is Tier 1 → Tier 2 (`setQuality`-style per-chapter scaling, PL-3.1 —
  not built yet, and it is the other half of this task).
- Make it **one-way within a session**, like the existing `perf-governor`
  pixelRatio ratchet (BASELINE.md §6.8, floor 1.0, never steps back up). Two-way
  demotion produces visible quality flicker, which reads as a fault.
- **Never silent.** The handoff says a 30 fps mobile fallback "requires explicit
  approval rather than silent acceptance". At minimum `console.info` the
  demotion with the measured window, and surface it on `window.journey.debugState()`
  so the device-matrix pass can assert on it.
- Reference budget for the trigger: BASELINE.md §4.2 measured ~1–2 ms scene CPU
  against 16.7 ms at the Mission rest, and the existing governor fires on a
  2.5 s window averaging > 24 ms. Reuse that window length so the two governors
  cannot fight.

---

## 4. The gate hook

There is no CI server and `git` is still unavailable (Xcode CLI tools missing),
so per ADR D5 the gate is a script run, not a hook. Two commands, both at every
gate (G2a, G3, G4, G5) and before any merge that touches scene code:

```bash
# 1. regenerate the Tier-3 stills from the live scene (~40 s, 10 PNGs)
python3 tools/capture.py

# 2. drift check — advisory today, a real gate once ?capture= lands
python3 tools/capture.py --check
```

Prerequisite for both: the static server already running —
`python3 -m http.server 8137 --directory .../glowshroom`. `capture.py` checks
and refuses with the exact command if it is not up; it never starts or stops it.

**Third check, and do not skip it:** open
`http://localhost:8137/static/` and confirm the console says

```
[tier3] content in sync with ../content/content.js — N strings, 16 contributors, 9 nodes
```

That is the drift guard at the bottom of `static/index.html`. It imports
`content/content.js` and compares every `data-src` path against the rendered
text, then checks coverage (every contributor, every footer link, every named
node). A `[tier3] CONTENT DRIFT` error names the exact path and both strings.
This is what enforces CO-2.2 ("one content source ... no duplicated strings")
for a page that must also work with scripting disabled — the copy is authored
HTML so it survives with no JS, and the guard is what keeps authored from
drifting away from source. **Any content.js edit must be followed by this
check.** When `git` returns, both commands become a pre-push hook unchanged.

---

## 5. Known deviations and open items

1. **Capture DPR is 1, not 2.** ADR D5 specifies `--force-device-scale-factor=2`
   and budgets "≈16 poses × 2 sizes ≈ 1–3 MB total". That budget is off by an
   order of magnitude for this scene: at DPR 1 the ten stills are **11.6 MB**
   (desktop stills are 1.7–2.2 MB each — dense additive line work plus baked
   grain is close to incompressible). At DPR 2 it would be ~45 MB. Shipped at
   DPR 1; `--dpr 2` is available.
2. **Weight lever, measured.** `capture.py --quantize` writes 256-colour palette
   PNGs: `inspire@1440x900` goes 2109 KB → 1040 KB at **MAE 1.10/255** against
   the lossless original — i.e. the palette costs *less* fidelity than
   re-running the capture does (run-to-run is 1–3 MAE). It is **off by default**
   because the G5 tier-identity review should compare lossless bytes, and the
   fidelity-for-weight trade is the integrator's call. Recommendation: ship
   `--quantize` once G5 has signed off on the lossless set.
3. **Detail-state captures are not in the golden list.** ADR D5 also lists three
   Inspire spotlights, three Connect cards and three Owned pods as capture
   targets. Tier 3 as built does not need them — it renders every detail as a
   real expandable HTML panel, which is strictly better for keyboard and screen
   reader than a picture of a drawer. Add them only if the G5 review wants the
   *scene's* detail composition shown behind the panels.
4. **Mobile size is 430×932, not the ADR's 390×844** — the W4-F brief specifies
   430×932 and supersedes it. Both land in the scene's `mobile` ANCHORS mode
   (`w ≤ 620` and portrait), so the still is the deliberate portrait pose
   (PL-1.1), not a squeezed desktop frame.
5. **Every `href` in the static page is `#`**, matching content.js under
   decision D10. A click handler on `a[data-placeholder]` calls
   `preventDefault()` so a placeholder link cannot destroy the hash route.
   Delete that handler when the real URLs land.
6. **Tier 2 does not exist.** PL-3.1 (`setQuality`-style honest per-chapter
   scaling against the LA-7 budget table) is the unbuilt half of this task. Until
   it lands the watchdog in §3 has nothing to demote *to*, so §3 is a spec, not
   a wiring job.
7. **`?tier=1` / `?tier=3` do not exist yet** — they arrive with §1.1. Until
   then Tier 3 is reachable only by typing `/static/`.

---

## 6. What was verified, and how

Headless Chrome over CDP (own instance — the shared browser pane was at its tab
cap), 1280×800 and 430×932, against `http://localhost:8137/static/`.

- **Zero `<canvas>` elements, zero console errors/warnings** at both sizes, on
  load and after exercising every route.
- All five sections render with their headings, support copy and node lists;
  three ownership claims; **16/16 contributors**; five footer links; the legal
  line. No horizontal overflow at either size (`scrollWidth === innerWidth`).
- Routes: `#/inspire/arca`, `#/owned/pod-split`, `#/connect/2rp` (normalises to
  the `tworp` node, as `journey.js` does), `#/owned/person-3` (normalises to
  `contributor-3` and focuses the index row), `#/final` (Owned stays the current
  nav entry, per 10-chapter-final.md), `#/bogus` → normalised to `#/mission`
  *and* scrolled there.
- Keyboard: Escape closes an open panel and returns focus to its trigger; a
  chapter route moves focus to the arrived `<section>`; every panel is a real
  `aria-expanded` / `aria-controls` disclosure.
- Scroll walk down the page steps mission → inspire → connect → owned → final
  with the still, the nav `aria-current`, and the hash all tracking (hash via
  `replaceState`, so scrolling never fills the back stack).
- `prefers-reduced-motion: reduce` → still `transition-duration: 0s`,
  `scroll-behavior: auto`. No other motion exists on the page.
- Scripting disabled → all 9 detail panels render open and all 16 contributors
  are present. The page is complete with no JS at all.
- Contrast, worst case (body text over the panel over the brightest possible
  still pixel): `--muted` **8.9:1**, `--gold-bright` **10.3:1**, `--gold`
  **7.3:1**. All three clear WCAG AA (4.5:1) for normal text, and all three
  clear AAA (7:1) as well (PL-2.3).
