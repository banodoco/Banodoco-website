# GREY-BOX DECISIONS — task W3-A (P3 prototype)

Every scroll and motion parameter the grey-box was asked to settle (05-greybox-prototype.md
§"Scroll model decisions", GB-3.1 … GB-3.6), with the measurement or reasoning behind it.
**These are proposals for the motion review — they are formally logged at G3, not here.**

Numbers live in `constants.js` and `core/director.js`; this file explains *why*.

---

## 1. Scroll model: virtual, not a native spacer

**Decision.** Progress is driven by a virtual scroll position (`core/scroll.js`) accumulating
wheel / touch / key deltas, not by a scroll spacer + `window.scrollY`.

**Why.**

- The hero page is `overflow: hidden`. Adding a spacer changes document height, can mint a
  scrollbar, and therefore changes the canvas aspect the frozen hero screenshot was taken at.
  A virtual surface keeps the hero page byte-identical in layout.
- It coexists with the existing input shield rather than weakening it. The shield stops
  wheel/pointer on `#stage` at capture phase (passive, so it cannot `preventDefault`). A
  *window*-level capture listener runs **before** the shield, so scroll capture sees every
  delta while OrbitControls still sees none, and the tap-pulse replay is untouched.
- Soft rest magnetism must be able to move the position at any moment. Fighting native
  momentum scrolling with `window.scrollTo()` is the classic route to a stuttering,
  non-reversible scrub.

`journeyState` therefore stays a pure smoothing + routing owner; it no longer reads `scrollY`.

## 2. GB-3.1 — scroll distance per chapter

| Chapter | Allocation | Rationale |
|---|---:|---|
| Mission | **3.5 vh** | ~1 vh of frozen hero hold, then the restrained flow toward the cap |
| Inspire | **7.5 vh** | the orbit — the slowest, longest single move in the journey |
| Connect | **4.5 vh** | slip-under, the chamber rest, the lateral to the stipe junction |
| Owned | **5.0 vh** | stipe descent, soil crossing, level-out, the glide |
| Final | **3.5 vh** | rise + recession |
| **Total** | **24 vh** (≈ 19,200 px at a 800 px viewport, ≈ 24 s of ordinary scrolling) | |

**Sized from the orbit.** Spike A played the swing over 20 s with the review note *"slower,
constant angular feel"*. Under a scrub the visitor sets the pace, so the allocation has to make
an ordinary scroll (≈800 px/s) produce a stately orbit. At 7.5 vh the measured orbit is
**6.4 s end to end with a 39 °/s peak**. Everything else is scaled against that by how much
camera work it carries.

**Mission is deliberately not the shortest allocation** even though it holds a static pose for
its first ~30%: the orbit starts inside the Mission *p* range (p 0.04), so a tight Mission
allocation makes the head of the orbit travel faster than its tail.

### 2a. The scroll → p map is a monotone spline, not piecewise linear

The obvious mapping — linear within each chapter — is wrong. Chapter *p* spans and px
allocations have different ratios, so every chapter boundary becomes a **step change in
scroll-to-motion gain**. Measured on the first build: the Mission/Inspire boundary at p = 0.14
sits in the *middle* of the orbit and made its first third travel **2.2× faster** than the rest.

`scroll.js` now maps px → p through a **PCHIP (Fritsch–Carlson) monotone cubic** over the
allocation knots. Allocations stay honest (each chapter still costs its own scroll distance)
while the gain is C1-continuous. **Measured maximum gain step across the whole journey: 2.1%.**

## 3. GB-3.2 — soft rest behaviour and snap magnetism

| Parameter | Value | Note |
|---|---:|---|
| `SNAP_ENGAGE_MS` | 160 ms | input-idle before magnetism engages |
| `SNAP_K` | 3.4 /s | critically-damped pull, not a snap |
| `SNAP_BAND` | 0.30 × chapter scroll length | capture band around each rest |
| `SNAP_DEAD_P` | 0.0015 | closer than this, settle exactly on the anchor |

Behaviour: any new delta resets the idle timer and the pull restarts from wherever it is, so
magnetism can never override an input, and it is strictly monotonic — it can never introduce a
direction reversal the visitor did not ask for. **Measured:** released 0.021 p short of the
Connect rest, it settles exactly on 0.490 in ≈1.5 s.

Rest anchors are `restProgress(id)`: **0.00 / 0.26 / 0.49 / 0.725 / 0.925**.

**Mission's rest anchor is 0.00, not mid-chapter.** `CHAPTERS[0].rest = 0` is a new per-chapter
override. `#/mission` and a cold load must render the *frozen hero pose*, and mid-chapter would
be a third of the way into the orbit.

## 4. GB-3.3 — text pinning

Copy windows are **absolute-p bands** (`COPY_BANDS`), not the generic `REST_LO/REST_HI` chapter
band. A chapter's copy may only appear once its composition has come to rest and made its
negative space, which happens later inside a chapter than `REST_LO`:

| Chapter | Band | Position |
|---|---|---|
| Mission | … – 0.042 | left (the hero's **own** DOM — never duplicated) |
| Inspire | 0.248 – 0.338 | bottom-centre |
| Connect | 0.476 – 0.548 | left |
| Owned | 0.716 – 0.792 | top-centre (claims hierarchy) |
| Final | 0.914 – … | upper-left |

Fade width 0.020 p at each edge, smoothstepped. Copy **cross-fades in place — it never slides**,
so no editorial type is ever in motion during a camera move. Each block carries its own local
radial scrim, so it does not depend on the hero's Mission-pose gradient (which releases as the
journey starts).

## 5. GB-3.4 — fast scroll

`MAX_SCRUB_RATE = 0.45 p/s` speed-limits the *smoothed* progress. An ordinary scroll runs at
≈0.03–0.05 p/s, so this leaves ~9–15× headroom: the limiter never engages during normal reading,
fast reads as fast, and the full journey still traverses in ≥2.2 s.

**Measured:** a 12,000 px fling (≈⅔ of the whole journey in one gesture) traverses to the target
over 99 frames, **monotonically**, capped exactly at 0.0075 p/frame. Every intermediate frame is
on the authored path — no cut, no unrelated frame.

## 6. GB-3.5 — nav flight vs manual scroll

Nav click → `pushState` then a flight (`FLIGHT_BASE_S 1.4 + FLIGHT_SPAN_S 4.0 × distance`).
Manual wheel / touch / key intent cancels the flight immediately, at capture phase.

**The scroll surface is not pre-placed at the destination on a nav click** — it follows the
flight frame by frame. Pre-placing it (the first implementation) meant a cancelling scroll handed
control back at the *destination* rather than where the camera actually was: measured as a jump
from p 0.496 to raw 0.733, exactly the camera disagreement GB-3.5 forbids. **After the fix:**
cancel at p 0.496 → control resumes at 0.496 and one wheel notch moves it to 0.506.

## 7. GB-3.6 — detail states and travel

An open detail consumes the **first** scroll intent (`onIntent` returns false, the delta is
swallowed and the card closes); the second scrolls. Escape closes and returns focus to the
triggering hotspot. Browser Back closes the detail and the camera **does not move** — verified:
Back from `#/connect/community` leaves the pose at exactly `(1.43, 2.15, −1.17)`.

Hotspots are hidden entirely while a detail is open, and any hotspot that projects into the
active copy block's rect is suppressed *and removed from the tab order*, so keyboard and
pointer hit models always agree.

---

## 8. Camera-timing decisions (not in 05's list, but they are motion decisions)

### 8a. The orbit's easing profile changed — deliberately

Spike A drove the orbit azimuth with a cubic `easeInOut`, whose **peak rate is 3× its own mean**.
That is fine for a 20 s autoplay, but it is the opposite of the spike's own v2 note ("constant
angular feel"), and under a scrub it put a **145 °/s whip in the middle of the swing** at
ordinary scroll speed.

Replaced with a **trapezoidal velocity profile** (`RAMP = 0.18`): smoothstep ramps at both ends,
constant rate through the middle, peak 1.22× the mean. **Measured peak: 39 °/s.**

The **shape** of the approved orbit is unchanged — rear three-quarter, target pins to the cap
inside the first ~20%, constant radius until the last 20%, push-in deferred to the last 20%, no
roll, ~172°, never a revolution. Only the timing along it changed, and timing is what the
grey-box exists to settle.

### 8b. Rest keys have zero tangents

The keyed path (p ≥ 0.26) is sampled with non-uniform Catmull-Rom / Hermite, with tangents
**forced to zero at every resting pose**. Each composition therefore eases in and eases out with
no velocity step, and the join to the orbit at p = 0.26 is velocity-matched on both sides
(the orbit's own derivative is 0 at s = 1).

### 8c. The chamber → stipe pitch turn is spread on purpose

The gaze travels ~90° of pitch between "looking up in the gill chamber" and "looking down the
stipe". It is spread across **p 0.575 – 0.690** (~11% of the journey, ~1.5 vh of scroll) so it
reads as a tilt rather than a whip. A two-key version measured 96 °/s; the current five-key
version measures ~60 °/s at ordinary scroll speed.

### 8d. The Final gaze never turns back on the organism

The first Final draft turned the camera around to look back at the hero mushroom. That was
**a ~180° whip-pan** (measured 12,382 °/p) *and* it made the hero mushroom read as the parent of
the fairy ring, which the map explicitly forbids. The epilogue now keeps its gaze on the growth
front and opens outward: shallow ~8° down-pitch, soil-line across the frame, ring and spore sky
above, colony below, hero organism behind the camera.

### 8e. Fog re-parameterisation (adr-d3 seam T4)

`FOG_RAMP`: near 7 → 15, far 20 → 62, ramped over **p 0.80 → 0.95**, smoothstepped. It is a pure
function of p, so reverse scrubbing restores `Fog(bg, 7, 20)` exactly — verified byte-identical
at all 31 audit sample points in both directions. Handing the camera back at p = 0 also restores
the hero fog explicitly.

### 8f. Optics scope

The grade (Spike A's lens, plus a new master `uAmount` crossfade) runs on the **Mission/Inspire
leg only** and is fully faded out by p = 0.38. Everything from Connect onward renders raw. This
is the scope the task set, because of the BUDGETS.md finding that Spike B's grade calibration ran
without OutputPass; full optics reconciliation is a production task.

---

## 9. Hero preservation

- At **p = 0** the director does not own the camera at all. Same pose, same fog, same
  `controls.enabled`, same DOM. Journey nav is `opacity: 0`; copy blocks, hotspots and the card
  do not exist until `journey.js` boots (post-intro, lazy).
- The orbit starts from the **live** hero pose, captured at ownership, so every responsive
  composition (desktop / deskNarrow / compact / tablet / mobile) hands off from its own framing
  rather than from the authored desktop numbers.
- The hero's responsive `setView()` is held while the journey owns the camera and replayed on
  hand-back, so a breakpoint change cannot fight the director (its `view-tween` animator would
  otherwise be registered after ours and win for 0.6 s).
- `window.sceneApi` was promoted from `?dbg=1`-only to unconditional **in this copy of the page
  only**. `../golden-mushroom-page.html` and `../mushroom-scene.js` are untouched.

---

# W3-B — MOTION PASS (documentary feel)

The grey-box path was analytically correct and felt machined. This pass makes it feel
*observed*: slow, assured, causal, never bouncy (handoff, MOTION SYSTEM). Every addition is
either pure in p (reversible, audit-safe) or gated to exactly zero at every rest anchor.
Verified after the pass: 31-point 0→1→0 scrub byte-identical in both directions (pose + fov +
fog, `?steady=1`), all five rest anchors + the p=1 hold land exactly on their authored poses,
hero boots clean on both `?nointro=1` and the full intro, zero console errors.

## 10. Documentary handheld layer (`HANDHELD`, director.js)

A very-low-amplitude wander on the analytic camera — the difference between a motion-control
move and a camera someone is holding. **Deterministic**: a seeded sine bank (LCG seed 1337,
three incommensurate frequencies per channel, 0.045–0.27 Hz — periods of 4–22 s), no
`Math.random` anywhere, so a given elapsed time always produces the same offset.

- `ampDeg 0.34` (~0.9% of frame height at fov 38), `posAmp 0.016` world units — rotation
  dominates, translation is a whisper. Nothing fast enough to read as shake, no springs or
  history, so it can never lag the path (sway-lag was explicitly forbidden).
- **Zero at rests:** amplitude is `smooth01(dist/0.018 p)` from the nearest rest anchor
  (including p=1), so every rest pose stays byte-identical and snap-magnetism lands exactly.
- **Fades out under fast scrub:** full below 0.06 p/s, gone above 0.16 p/s (smoothed |dp/dt|).
- `?steady=1` disables it entirely (QA: mid-leg pose sampling must reproduce frame-to-frame).
- Applied in `createDirector().apply(p, dt)` only — `poseAt()` stays pure.
- Measured: ~0.013 world units of positional wander over 4 s mid-leg; offset from the analytic
  pose is exactly 0 at anchors and exactly 0 during a 0.225 p/s sweep.

## 11. The orbit breathes (`ORBIT_BREATH`)

The trapezoid killed the 145 °/s whip but left the plateau conveyor-constant. `azEase()` adds
`amp 0.010 × sin(2π · 1.7 · s)`, windowed by `smooth01(s/RAMP)·smooth01((1−s)/RAMP)` so the
deviation *and its derivative* are zero inside both ramps — the endpoints, the zero-velocity
join at p = 0.26, and the rest poses are untouched. Peak added slope 0.107 ≪ plateau slope
1.22, so azimuth stays strictly monotonic (verified numerically at 440 samples). Peak rate
rises 39 → **44 °/s** at ordinary scroll — a ±9% ease variation you feel rather than see.

## 12. Final rise-tilt-recede re-authored as one gesture (KEYS 0.782–1.000)

Measured on the W3-A keys: a **1,665 °/p yaw peak** (~67 °/s at ordinary scroll — 1.7× the
orbit) concentrated at p ≈ 0.89; a pitch crest that *nodded* (+16.8° then back down to −8°
with the rate flipping +49→−67 °/p within 0.004 p); and a recede leg that left the rest on a
different vector than it arrived on (z-sign flip), so pushing past the Final rest veered.

Re-keyed (five intervals, 0.782 / 0.812 / 0.845 / 0.878 / 0.905 / 0.925 / 1.000):

- the gaze starts leading outward during the Owned drift, so the yaw turn is spread across the
  whole leg — measured peak now **964 °/p (~41 °/s)**, in the same family as the orbit;
- pitch rises to **+11.5°** through the substrate and eases into the cutaway's −8° with no
  crest-flip — rise and tilt are one breath;
- the recede continues the arrival vector (both normalize to ~(−0.68, 0.64, −0.27)), so the
  Final rest is a pause on one continuing line, not a stop-start;
- Final rest pose (0.925) unchanged; the 1.000 key moved to (−12.55, 5.15, −3.35) →
  (−8.15, 1.95, −12.55) to carry the line — end framing is equivalent (yaw 154°, pitch −17°).
- T4 still fires at p ≈ 0.86.

**Fog opens on staggered schedules** (`FOG_RAMP` reshaped): far 0.78 → 0.945, near 0.835 →
0.955. The far plane is already easing open as the camera crests the soil at ~0.86 — the
reveal breathes open with the rise instead of popping on one shared smoothstep.

## 13. Seam crossings read as passing THROUGH something (`SEAM_FOG_DIPS`)

Brief multiplicative fog thickenings, pure in p, centred on the two physical crossings:
T2 slip-under `{c 0.436, w 0.035, near −26%, far −34%}` (the rim shadow closes over the lens)
and T3 soil `{c 0.693, w 0.026, near −46%, far −52%}` (substrate swallows the frame). The bell
is C1 at centre and edges, fully closed before every rest anchor (measured 7/20 exactly at
0.395/0.475/0.665/0.720/0.725). T1 stays a pure streaming trigger (ADR: no visual); T4's
crossing is carried by the fog ramp above. Threshold dwell/hysteresis constants unchanged —
they measured clean.

## 14. Copy fade choreography (gap e — `COPY_*` constants, ui.js)

The p-bands still say WHERE copy may live; a temporal layer now decides WHEN:

- **Release as travel begins:** target opacity is multiplied by a travel gate on smoothed
  |dp/dt| (starts releasing at 0.03 p/s, fully released at 0.09), and fade-out runs at
  `COPY_OUT_K 7.0` (~0.15 s) — so the first real scroll off a rest lets the text go
  immediately, even while p is still inside the band.
- **Re-anchor only after the camera settles:** fade-in runs at `COPY_IN_K 2.4` (~0.9 s
  breathe-in), gated by a settle factor (full below 0.012 p/s, held above 0.062), so a fast
  pass through a rest never flashes its copy and a deliberate arrival gets its text only after
  the composition has made its negative space. Measured on a real fling into Connect: copy 0
  during travel, 0 at +400 ms (still settling), 0.6 at +800 ms, 1.0 at +1.4 s.
- `dt === 0` (deep-link placement / hidden-tab capture) snaps to target — captures stay
  deterministic. Symmetric in both scroll directions by construction.
- Same DOM, same styles — only timing changed.

## 15. Hotspot label choreography + suppression hysteresis (gap g)

- Labels now follow the **eased** copy state, arriving after the copy has re-anchored, one per
  `HOTSPOT_STAGGER_MS 150` in narrative order (`HOTSPOT_IN_K 3.2` in, `9.0` out). Inspire's
  registration order changed to ArtCompute → Arca → 2RP to match Plate II's reveal order
  (this is also the tab order).
- **Inspire label anchors moved from the rim release lip to the plume body** (lip + 55% of the
  plume's mid rise, leaned 45% of the spores' own breeze lean — inspire.js `labelOffsets`).
  At the rest the lip projected into the lower third of the frame, exactly where the
  bottom-centre copy lives, and two of the three initiative labels were suppressed by the copy
  rect. All three now read in their own sky sectors (measured 1440×900: ArtCompute (368,312),
  Arca (844,303), 2RP (1130,416) vs copy top 608).
- The copy-rect suppression test now has **hysteresis** (enter at rect+8 px, leave at
  rect+26 px): the organism's live sway modulates projections by ±20 px/s and a single margin
  made borderline labels strobe.
- Connect's `community` node lowered y 2.86 → 2.00 (chapters/connect.js): its label sat inside
  the left copy block's rect at every sway phase, costing it both its label and its tab stop.
  It now reads at the chamber's lower commons floor, ~66 px clear at all phases; all three
  Connect labels are legible at the rest.

## 16. Reverse feel

The path, fog, dips and reveal drivers are all pure in p, so reverse framing is byte-identical
(the 31-point audit runs both directions). The temporal layers are direction-symmetric by
construction: copy releases on speed and re-anchors on settling in either direction, and the
Inspire exits re-bloom over ~0.3 s eased fades when re-entered from Connect — a deliberate
retrace, not a rewind. No pacing asymmetry was found to fix beyond the Final-leg re-keying
(§12), which is what made Owned→Final and its retrace read the same weight in both directions.

## 17. Measurement note for future sessions

Two traps cost this pass real time: (1) the dev server sends no cache headers and `?v=` on the
page URL does **not** bust ES-module subresources — hard-reload (⌘⇧R) after every module edit
before trusting page state; (2) projections computed from a `javascript_exec` probe *between*
frames can use a camera `matrixWorldInverse` recomputed after render by other animators and
disagree with what `ui.update` (and the rendered frame) used by ~100 px — when auditing label
positions, sample **inside** the frame callback (wrap `h.world()`), never from outside.

---

# G3 MOTION NOTE — commit resolution (no man's land eliminated)

Hannah's binding note: *"as soon as you've gone past the point where you're leaving the
current section, it should snap-scroll to the next one... right now you can get stuck in
no man's land. That shouldn't be possible."* Implemented in `core/scroll.js` `update()`;
constants in `constants.js` (`COMMIT_THRESHOLD`, `COMMIT_GLIDE_RATE`, `COMMIT_RAMP_S`).

## 18. The rule

While input is live the model is untouched — fully scrubbed, fully reversible (handoff
requirement). After `SNAP_ENGAGE_MS` (160 ms) of idle, the position **always** resolves
to an anchor. The pair of rests bracketing p is found and the direction rule picks one:

| Situation | Resolution |
|---|---|
| travelling forward, ≥ `COMMIT_THRESHOLD` of the inter-rest p-span behind you | **onward** to the next rest |
| travelling forward, less than that | back to the rest you left |
| travelling backward | mirrored (the rest being "left" is the upper one) |
| placed programmatically, never scrolled (`?p=`, post-flight) | nearest rest |

- **`COMMIT_THRESHOLD` = 0.35**, measured as a fraction of the inter-rest span **in p**
  (the perceptual transition), not px. 0.35 < 0.5 is the forward bias: in your direction
  of travel you commit after a third of the transition; changing your mind requires
  scrolling 35% back the other way — a real gesture, not a stray notch. This is also
  natural hysteresis: a small counter-nudge during a glide never cancels an arrival
  (measured: −140 px reverse at 66% across still carries on; −300 px at 44% across, or
  any reverse before ~65%, resolves back).
- **p = 1.0 is a resolution anchor** in addition to the five rests. Without it, a fling
  to the end of the journey would be tugged back to the Final rest (0.925) — a visible
  retreat the visitor didn't ask for. The 1.000 key is an authored hold (§12) and
  handheld already zeroes there, so dwelling at 1.0 is a designed pose.

## 19. The glide is a scroll, not an animation

The glide only moves the virtual position `v`; `journey.js` smooths and speed-limits it
exactly as it does a wheel delta (`SMOOTH_K`, `MAX_SCRUB_RATE`). So the copy release /
re-anchor choreography (§14), seam fog dips (§13), handheld suppression (§10) and the
travel gate all behave under a glide precisely as under a real scroll — verified: gliding
back into Connect, copy is released (0.06) during travel and re-anchored (1.00) after
settle, same timing family as the W3-B fling measurement.

Speed profile — assured and continuous, no spring, no overshoot, no bounce:

- smoothstep ramp-in over **`COMMIT_RAMP_S` 0.35 s** from standstill (the glide starts
  as a decision, not a yank);
- cruise at **`COMMIT_GLIDE_RATE` 0.10 p/s** — ~2× a calm read scroll (0.03–0.05 p/s),
  4.5× under `MAX_SCRUB_RATE`;
- landing handed to the existing critically-damped `SNAP_K` (3.4 /s) pull once
  `K·dist < rate`; every step ≤ remaining distance, so overshoot is impossible by
  construction, and `SNAP_DEAD_P` settles the last 0.0015 exactly on the anchor.

Any manual delta resets the idle timer and control returns within one frame; the new
delta's sign re-aims the next resolution. `setProgress()` (flights, deep links) clears
the direction memory, so a flight landing on a rest pins there (dead zone) and never
inherits a stale direction.

## 20. Measured settle behaviour (1440×900, wheel-nudged direction, then idle)

| start p | dir | resolves to | expected | full-stop ms |
|---:|:--:|---:|---:|---:|
| 0.05 | fwd | 0.000 | 0.000 (f 0.19 < 0.35) | 2058 |
| 0.12 | fwd | 0.260 | 0.260 (f 0.46) | 3054 |
| 0.33 | fwd | 0.260 | 0.260 (f 0.30) | 2263 |
| 0.36 | fwd | 0.490 | 0.490 (f 0.44) | 2984 |
| 0.42 | back | 0.490 | 0.490 (back-travel 0.30) | 2234 |
| 0.30 | back | 0.260 | 0.260 (back-travel 0.83) | 1910 |
| 0.60 | back | 0.490 | 0.490 (back-travel 0.53) | 2601 |
| 0.68 | back | 0.725 | 0.725 (back-travel 0.19) | 1975 |
| 0.76 | fwd | 0.725 | 0.725 (f 0.18) | 1884 |
| 0.80 | fwd | 0.925 | 0.925 (f 0.38) | 2799 |
| 0.96 | fwd | 1.000 | 1.000 (tail, f 0.47) | 1886 |
| 0.95 | back | 0.925 | 0.925 (tail) | 1731 |

12/12 per the rule, all four transitions plus the 0.925–1.0 tail, both directions.
"Full stop" is instrument-strict (< 0.00017 p/s); perceived arrival is ~0.7 s earlier
(the exponential tail is invisible). Cancel-mid-glide: reverse input at p 0.3666 during
a forward glide reversed the on-screen motion **on the next trace sample** (0.3666 →
0.3648, no forward creep) and resolved to 0.26. A fast full-journey fling (one 30,000 px
gesture) traversed 226 frames strictly monotonically and held at 1.0. Zero console
errors throughout.

## 21. QA affordances

- **`?nosnap=1`** disables commit-resolution entirely and restores the W3-A band-limited
  soft snap verbatim, so `?p=` deep-scrub QA can park anywhere outside a band. Verified:
  `?nosnap=1&p=0.17` parks at 0.17 indefinitely. (Note `?nosnap=1&p=0.55` drifts to
  0.49 — that is the *old* band magnetism, unchanged: 0.55 was already inside Connect's
  0.30-band before this work.)
- Bare `?p=` without nosnap now resolves to the **nearest** rest (no direction memory):
  `?p=0.55` → 0.49. Deep links, `?pose=` and nav flights land on rests and are pinned by
  the dead zone — measured `?pose=connect` → 0.4900 exact, `#/owned` → 0.7250 exact,
  no post-landing motion.
- `scroll.commitP` (QA getter) reports the rest idle would resolve to from the current
  position; `scroll.lastDir` and `scroll.nosnap` are also exposed.

## 22. Feel-verdict for Hannah's next ride

The forward bias at 0.35 reads clearly directional: a third of the way into any
transition commits you onward, and every idle ends composed on a rest. If it should push
forward even harder, drop `COMMIT_THRESHOLD` to 0.30 (one constant); if the long
Mission→Inspire glide (~3 s worst case) feels leisurely rather than assured, raise
`COMMIT_GLIDE_RATE` to 0.12 — at 0.10 it deliberately sits in "calm scroll" territory so
the glide is indistinguishable from a patient visitor finishing the gesture themselves.
