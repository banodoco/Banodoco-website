# 26 — The scroll loop: the ride closes the circle

**Requested:** Hannah, 2026-08-12. **Built:** same day.
**Files:** `journey/scroll.js` (the loop is resolved here), `journey/journey.js`
(the way home), `tools/scrollgates.js` (R5 restated, R6 made a lap).
No route file, no camera key, no p-value, no golden moves.

> "Scrolling up from the first section wraps to the last. Scrolling down from
> the last section wraps to the first.
> · Uses the existing section navigation transition and should feel like any
> other section change.
> · The camera should take a visually elegant path from the last section back
> to the first, not the mathematically shortest one and not a rewind through
> every section in between. Design the path deliberately: it should feel like a
> considered move that closes the circle. Render it, watch it, and iterate
> until it reads well.
> · Triggers on the same gesture threshold as a normal section change. No extra
> resistance or second scroll at the edges.
> · The right-side nav indicator updates accordingly."

---

## 1. Where the loop lives, and why there

The wrap is **not** an edge handler bolted onto the ends of the route. It is
resolved inside `scroll.js`'s own resolution step, in the same block that
decides every other transition, immediately before the intent is armed.

That placement is the whole reason the brief's third bullet is satisfiable.
"Same gesture threshold, no extra resistance, no second scroll" cannot be
delivered by code that watches for a clamped scroll position and then reacts —
it has to be the model's own answer to the question it already asks each frame:
*given where this gesture is and how strong it is, what does it resolve to?*
Past the last rest going forward, and at the first going back, the answer is
simply the anchor on the other side of the seam.

The wrap then calls `onWrap(dir)`, which is `navigateTo('mission' | 'final')` —
**the existing nav jump**, not a second transition. Everything that jump already
owns comes free and is not re-implemented: the journey state snaps to the
destination this tick; the destination copy is keyed off the arrival
(`d1ecc23`); the destination chapter is suppressed for the blend (`a8d4518`);
the URL is not written (`239d6c7`).

### Two things the model had to be told

**The route's ends stopped being walls.** `push()` measured the gesture's rate
from the *applied* delta — clamped at `v = 0` and `v = total` — so that leaning
on a dead edge measured zero. Those two positions are the only places the clamp
ever bites, and they are exactly where the wrap now happens: measuring the
applied delta there would have made the wrap the one transition a visitor could
never build enough gesture for. It now reads the raw delta. Everywhere else on
the route the two numbers are the same number.

**A wrap is a placement performed mid-gesture.** `setProgress()` clears
`lastDir`, correctly, because a placement carries no motion — true of a deep
link, false of a wrap. Left at zero, the visitor's very next delta reads as a
direction change, mints a fresh gesture, and releases the wall that keeps one
gesture worth one section change. Measured before the fix: one flick wrapped
0 → 0.97 and then carried straight on to the Owned rest. The wrap restores
`lastDir` across the seam.

---

## 2. The end-hold is not a section

`p 0.97..1.0` is the authored end-hold. Measured on the live page, the camera
pose at `p = 1` is **identical** to the pose at `p = 0.97` — position
`(-14.72, 2.73, 2.70)`, target `(-3.06, 0.83, -1.94)`, fov `45.5` at both ends.
Only the fog moves, `14.3/60.93 → 15/62`.

So requiring a gesture to cross it before the wrap can fire would spend a whole
scroll on a move with nothing on screen to show for it — precisely the "second
scroll at the edge" the brief rules out. **The forward wrap therefore fires from
at-or-past the last REST, not from the terminal anchor.** The end-hold keeps its
anchor for scrub, `?p=`, `End` and the notch reader; it is simply no longer
somewhere a flick stops.

### The race that made a harder flick worse

A resolution already heading for the end-hold does **not** block the wrap, and
that exception is load-bearing. The end-hold is 545 px wide, so
`COMMIT_THRESHOLD` of it is 191 px: a hard flick carries the displayed position
across that in three frames, while the stream test cannot qualify until it has
seen `COMMIT_STREAM_MIN = 4` deltas. The position rule latched first, and **the
harder the flick the more reliably it did** — measured, 110 px/frame wrapped and
240 px/frame stopped dead on the held frame. Nothing else is let through: a
gesture that is not a stream still cannot wrap, so the notch reader keeps the
end-hold exactly as before (verified at 230, 400 and 700 ms spacing).

---

## 3. Threshold parity, measured

The wrap is denominated by the same rule every other resolution uses — the span
immediately beyond the rest being left. Minimum flick peak (px/s) that produces
a section change, bisected on the deterministic driver, against a second
scroll model built **without** `onWrap` as the pre-loop baseline:

| where | with the loop | baseline |
|---|---|---|
| Mission rest, backward — span `[0, 0.26]` | **558.0** (wrap to Final) | **558.0** (Inspire → Mission, same span) |
| Final rest, forward — span `[0.97, 1]` | **418.4** (wrap to Mission) | 361.7 (resolve to the end-hold) |

The backward wrap is **bit-identical** to its span's ordinary section change.
The forward wrap costs 418.4 against the 361.7 of the resolution it replaces —
and that 361.7 is not a section change at all but the *position* rule crossing
545 px of held frame, which has no analogue past the seam. Against the four real
section changes on the route it is the **easiest transition on the site**:

| ordinary section change | peak px/s |
|---|---|
| Mission → Inspire | 558.0 |
| Inspire → Connect | 740.8 |
| Connect → Owned | 525.4 |
| Owned → Final | 2029.8 |
| **forward wrap** | **418.4** |
| **backward wrap** | **558.0** |

There is no edge resistance: the wrap is cheaper than every section change it
sits next to.

---

## 4. The way home

### The route's own azimuth ledger

Measured on the live page, in the cylindrical frame `directJumpTo` already
interpolates in (`journey.js`, azimuth about the stipe axis):

| rest | azimuth | radius | height | fov |
|---|---|---|---|---|
| Mission `p 0` | **−13.8°** | 11.53 | 2.30 | 38.0 |
| Inspire `p 0.26` | +115.0° | 11.00 | 2.00 | 40.0 |
| Connect `p 0.523` | +61.8° | 9.01 | 2.00 | 62.0 |
| Owned `p 0.725` | +72.1° | 1.82 | −1.18 | 58.0 |
| Final `p 0.97` | **−79.6°** | 14.97 | 2.73 | 45.5 |

The legs run +128.8, −53.2, +10.3, −151.7 — **a net −65.8° from the first rest
to the last.**

### Why the long way is the right way

Final → Mission the short way is **+65.8°**. That is the numerically minimal
path, and it is the ride's own net rotation being *undone* — the rewind the
brief rules out, stated in one number. Continuing instead in the sense the ride
was last travelling (Owned → Final is −151.7°, the largest leg on the route)
costs **−294.2°**, and brings the total to **exactly −360°**: the camera arrives
at the hero pose having gone around the organism once.

That is what "closes the circle" means here, and it is a property of the route's
own numbers rather than a taste call. Verified live: the shipped forward wrap
sweeps **−294.19°** and the backward wrap **+294.19°** — an exact mirror, which
is also the reversibility property.

### The paths tried, and what the renders showed

Each was rendered as a frame strip on the live page. Headless cannot produce
frames fast enough to sample a 4 s blend, so the strips were shot with the blend
*clock* stretched (`wrapTuning.extra`) — the path is a function of the ease, not
of the duration, so the geometry rendered is exactly the shipped geometry.

| # | path | verdict |
|---|---|---|
| **P1** | short way, +65.8° | **Rejected.** Radius falls monotonically 15.0 → 11.5 across a 66° slide. On screen it is a straight pull-in: the field fades, the specimen grows, done. It reads as backing off the way you came, not as a return. |
| **P2** | lap, −294.2°, no swell | Works, but level and monotone — the camera holds y ≈ 2.6 and tightens 15.0 → 11.5 the whole way. Reads as a turntable. |
| **P3** | lap + `bow 3.2`, `rise 1.9` | **Shipped.** r peaks 16.6 and y peaks 4.4 at mid-lap, then draws in. Swings wide and lifts just over the cap top (4.37), so the cap stays silhouetted against the dark while the ground network sweeps below, then descends into the hero framing. |
| **P4** | lap + `rise 3.6` | **Rejected.** y peaks 6.1; the horizon leaves frame and the shot becomes a plan view of the ground network. Loses the silhouette that is the hero's signature. |
| **P5** | lap + `bow 6.0` | **Rejected.** r peaks 19.3; the organism becomes a speck on an empty dark field. Reads as backing away from the subject rather than circling it. |

Both swells are `sin(PI · e)` on the **position's own ease**, so both start and
end at zero velocity. The 2026-08-04 "weird little jump" was a lift running on
linear `f` under a position running on smootherstep; that shape is unreachable
here. A positive `bow` only moves the path further from the axis, so `arcLerp`'s
clearance guarantee survives it unchanged.

Backward, the same lap runs in reverse and the colony **fades up** as the camera
comes round — the world repopulates on the way home. It is the forward move's
exact mirror, not a separate authored path.

### Tempo

The ordinary duration law caps at `0.85 + 0.35 = 1.20 s` for any jump of 20+
units. The wrap's arc is **68.1 units** against **15.6** for the longest ordinary
jump (Mission ↔ Final), so at the shipped cap it would have run at 57 units/s —
**4x every other transition on the site**, a whip rather than a considered move.
`WRAP_EXTRA_S = 2.8` gives it **4.00 s**, i.e. 17 units/s against that jump's 13:
the same tempo over a longer path, which is what "feels like any other section
change" has to mean when the path is 4.4x longer. (Wall clock runs ~8–17% over
the computed duration on a live page; an ordinary jump measures the same
overhead, so it is the frame loop's, not the wrap's.)

---

## 5. The rail indicator

`rail.js update(p)` derives everything from `chapterAt(p)`, and the wrap is a
direct jump, so the state snaps to the destination in one tick. Sampled every
frame across 320 frames through a wrap in each direction, the only value
observed is the destination: `epilogue → mission` forward and `mission →
epilogue` backward, with **no intermediate chapter at any frame**. It cannot
flicker through the sections in between because it never visits them.

---

## 6. Gates

Scroll gate battery, live, before and after (see also EXECUTION.md 2026-08-12
for the settle fix this pass sits on):

* **R5** restated as the loop's own property — the old "a fling into the
  end-hold settles where it landed" premise is gone with the end-hold's status
  as a flick destination. Now: `fling past last -> 0.000000` (want 0.000000) |
  `fling before first -> 0.970000` (want 0.970000) | `notches past last ->
  1.0000` (the end-hold, unchanged).
* **R6** made a lap — the break is "arrived back where we started", not "hit
  p = 1". `up 0.26 0.523 0.7249 0.97 0 | down 0.97 0.725 0.523 0.26 0.0001 0.97
  0.725 0.5232 0.2601 0 | off-anchor stops: none`. R6 also gained a 240 ms beat
  between legs: without it the next leg's first delta lands inside
  `SNAP_ENGAGE_MS` of the last and is the SAME gesture by the model's own
  definition. The wrap exposed this because it completes in a frame at the p
  level; every other leg hid it behind a multi-second transition.
* R1/R2/R3/R4/E1/E2/E3 unchanged. R4 overshoot `0.00e+0`.
* `?nosnap=1` untouched and identical to `a94267c`'s figures: E1 `0.00e+0`,
  E2/E3 `1.0000`, N1 parks at `0.3600`; `?p=0.36&nosnap=1` lands at 0.3600.
* `?pose=owned` lands on the frozen pose exactly `(1.73, −1.18, 0.56)` fov 58.
* `capture.py --check` PASS, worst MAE **0.00/255** across all ten frozen
  references.
* Settle battery (2026-08-12, EXECUTION.md) re-run with the loop in: **420
  cells, 0 skip-throughs**; flick-carry, reversibility and the notch reader all
  bit-identical to HEAD.
* Two full laps forward and two backward — four wraps — one anchor per gesture
  throughout, console clean, URL clean (`?nointro=1&ride=2`, no hash written).

---

## 7. Residuals

* **A notch-by-notch reader cannot wrap.** The stream test excludes single
  notches from flick-carry everywhere on the route, and the wrap inherits that:
  notches walk to the end-hold and stop. Consistent with the model's own notch
  policy, and the rail still gets them anywhere in one click — but it does mean
  the loop is a flick-and-trackpad affordance, not a wheel-notch one.
* **After a wrap the visitor must pause 160 ms before the next section change.**
  The wall that makes one gesture worth one section change is released only by
  `newGesture()`. For an ordinary transition the several-second move guarantees
  that pause; the wrap's p-jump is instant (its 4 s camera blend is not the
  scroll model's business), so the gesture can still be live. In practice the
  visitor is watching the lap; in the gate it had to be modelled explicitly.
* `WRAP_TURN` ships at 0 (the authored sense). It exists so the short way can be
  re-rendered and the choice re-judged, alongside `WRAP_BOW`/`WRAP_RISE`/
  `WRAP_EXTRA_S`, through `window.journey.wrapTuning`.

---

# 2026-08-13 — the seam, not the path

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/lens.js`, `journey/journey.js`, `journey/chapters/owned/index.js`,
`journey/chapters/final/index.js`, `journey/ui.js`. No route file, no camera key,
no p-value, no golden moves, no change to the path.

> "The page is intended to behave as a continuous loop… Right now, these can feel
> like a cut or reset. Neither direction should ever feel like the page is
> teleporting. Both loop transitions should instead be implemented as continuous
> camera movements, consistent with the spatial transitions used throughout the
> rest of the site."

## 8. The path was not the problem

The lap above is a genuine 4.00 s camera move and it was already doing its job.
What read as a cut was everything *else* that crossed the seam in one frame
while the camera was still standing still. A wrap calls `directJumpTo`, which
snaps journey state to the destination in a single tick — and three separate
systems were keyed to that state rather than to the camera.

Measured frame by frame on the live page, sampling inside the render loop
(every rendered frame, both directions, 440 frames each):

| what | before | after |
|---|---|---|
| lens `warm` at the snap frame | **0.3012 → 0.0000 in one frame** | 0.0000 step; max **0.0034**/frame across the whole move |
| lens `lift` / `hal` / `gain` / `vig` | **0.1808 / 0.2481 / 0.1394 / 0.0497, all one frame** | 0.0000 step; max 0.0021 / 0.0028 / 0.0016 / 0.0006 |
| Owned retires (forward) | **ms +867, camera x −15.01, r 15.42** | ms +1483, camera x −4.18 |
| Final retires (forward) | ms +1486, camera x −4.21 | ms +1483, camera x −4.18 |
| Owned + Final arm (backward) | ms +2400, camera x −4.86 | ms +2400, camera x −4.86 |
| outgoing copy | snaps to 0.88 on the snap frame, **0 by 516 ms** | holds 1.00 at the snap, 0 by **1848 ms** |
| fog | already travelled (`a8d4518`) | unchanged |

### 8.1 The grade stepped; only the fog had been fixed

`a8d4518` made fog ride the blend because "fog is distance from the lens".
The *grade* is the same kind of statement and was left keyed to `p`, so on the
snap frame the entire frame re-graded at an unmoved camera — `warm` 0.301 → 0,
`hal` 1.248 → 1.000. That is every pixel changing at once, and it is the
loudest discontinuity in the wrap.

`lens.js` gains an `override`; `directJumpTo` captures the **live** look (not
`lookOf(origin p)` — a jump overtaking a jump starts from a graded frame that
belongs to no `p` at all, the same reason `pos0` is read off the camera) and
`lookOf(destination p)` after `placeAt`, and `stepCamBlend` lerps between them
on the position's own ease, written before `lens.update(p)` runs. `endCamBlend`
hands it back, and because the last value written is `lookOf(destination p)`
the hand-back is a no-op by construction — measured **0.0e+0** grade landing
error on all 20 ordered chapter pairs.

### 8.2 The chapter you leave retired on the wall clock

The forward wrap disarms Owned on the frame `p` snaps 0.97 → 0. Owned's ease
runs at 6.0/s, so the colony under the Final cutaway was **gone 0.87 s later —
with the camera still at the Final rest**, 0.3 units into a 68-unit move. The
colony dimmed to nothing on a frame that had not moved. That is the cut.

Backward the same chapter behaved correctly, because there the binding term is
`arrival = max(sink, keep)`, which is camera-pure, and it opens at x −4.86 as
the lap comes round. **The two directions were not mirrors**, and the one that
read worse was the one the state-derived ease governed.

The fix is the law `a8d4518` already wrote for Final, applied where it was
missing: inside a blend a chapter may trust only its camera-pure terms. Owned
gains `setBlending`; both chapters **hold their eased `amount`** for the length
of the blend (`placeAt`'s deferred snap, applied to the ease itself) and let the
camera decide. Final needed only the hold: its `eff` was already camera-pure,
but its visibility gate still read `amount`, which at 2.2/s drops at 2.64 s
against a 4.00 s move — it survived only because `rise` happened to cross first
at 1.49 s. Luck, not a rule.

After: Owned and Final retire on **the same frame, at the same camera x**, and
that x is where they arm coming the other way. The lap is now an exact mirror in
what is on screen as well as in azimuth.

A useful consequence: no wall-clock term survives inside a blend, so the wrap's
appearance is a pure function of its ease and can be inspected at any clock —
which is what makes the stretched-clock frame strips below faithful.

### 8.3 The words left on the scrub's clock, not the move's

`d1ecc23` placed the *arrival* inside the blend and left the *release* on
`COPY_OUT_K` (~0.15 s). Proportionate to an ordinary 1.2 s jump; not to a 4.00 s
lap — the Final block was at 0 by 516 ms with the camera 0.3 units into the
move, and 2.1 s of empty copy layer followed before the hero's arrived. The
departure now runs across `lead` (the same window the incoming block spends
waiting), so the two are one handover rather than two animations with a hole
between them. It ends at 0 — the value the scroll rule is already heading for —
so the hand-back is a no-op exactly as the entry's is, and it may only ever
*lower* a block, never raise one.

## 9. Frame strips

Shot on the live page at 1440x900, one wrap per direction, 16 shutters across
the move (`wrapTuning.extra` stretched; see 8.2 for why that is faithful).
Camera x, forward: −14.78 −15.05 −15.17 −13.83 −9.06 −0.24 +9.45 +14.83 +13.57
+8.40 +3.27 −0.13 −1.76 −2.23 −2.25. Backward, the same list reversed to within
the shutter's own jitter. `warm` runs 0.300 → 0.000 forward and 0.000 → 0.301
backward, monotonically, on both.

**How it reads.** Forward: the field holds while the camera pulls back off it,
the words releasing with the pull rather than ahead of it; the lap swings wide
and lifts, the colony sinking away below and behind rather than being switched
off; the cap stays silhouetted; then the camera draws in and the hero sentence
is the last thing to settle. Backward: the hero copy releases into the same
swing, the camera goes out and round, and the field comes **up** to meet it as
it arrives — the world repopulating on the way home — with the Final sentence
last. Neither direction has a frame where something is switched on or off in
open view. The one remaining single-frame event is a **draw-call** step (344 →
56 forward, 42 → 329 backward) at the moment both chapters cross their
camera-pure 0.003 visibility threshold — the site's own dark-at-arm bound, the
same one Final used before this pass, and now the same frame for both.

## 10. Gates

* Frame-by-frame trace, both directions, before and after — the table in §8.
* `capture.py --check`: **PASS**, worst MAE **0.00/255** across all ten frozen
  references. Nothing here touches a placement path.
* All 20 ordered chapter pairs: landing error **0.0e+0**, grade landing error
  **0.0e+0**. Worst single-frame grade step 0.045 under the headless cadence
  (which drops during a jump); on the wrap, sampled in the render loop, 0.0034.
* Scroll battery unchanged: `E1 −3.24e−4` (resolution live), `E2/E3 1.0000`,
  `R4 overshoot 0.00e+0`, `R5 fling past last → 0.000000 | fling before first →
  0.970000 | notches past last → 1.0000`, `R6 off-anchor stops: none`.
  `?nosnap=1`: `E1 0.00e+0`, `E2/E3 1.0000`, `N1 parks at 0.3600`.
* **One gesture, one section, across the seam** (`b0227bd`): a single 30-frame
  flick past the last rest lands `0.000000` and stops — 0.260 would be two.
  Backward, `0.970000` — 0.725 would be two. Out and back: `0.97 → 0.000000 →
  0.970000`.
* **The 90 ms threshold** (`f2bd1cd`) through the wrap: sweeping the pause
  between the wrapping flick and the next one, the landing holds at 25/48/54/56
  ms of measured inter-dispatch idle and releases at 81 ms (forward); backward,
  holds at 31 and releases at 56. A dispatched wheel is read on the following
  frame, so the delivered gap is the measurement plus one frame (~22 ms): the
  crossing brackets **90 ms**, the same beat the rest of the route gets.
  **This supersedes the 160 ms in §7** — that residual was written four hours
  before `f2bd1cd` moved the wall off `SNAP_ENGAGE_MS`.
* Deep links: `?p=0.36 → 0.2679` (Inspire), `?p=0.72 → 0.7250`, `?pose=owned →
  (1.73, −1.18, 0.56) fov 58`, `?pose=final → (−14.72, 2.73, 2.70) fov 45.5` —
  the frozen poses exactly. `?capture=` exercised by `capture.py --check`.
* Ride: three laps forward and two back by gesture — **five wraps**, 30 legs —
  every leg lands on an anchor, URL clean (no hash written), **console 0
  entries**.

## 11. Residuals

* The draw-call cliff in §9 is cost, not light: both chapters cross the 0.003
  bound together and the frame before it carries 0.3% of full reveal. It could
  be spread by fading the *cost* out over a few frames, but that would add a
  term the reveal laws do not have.
* The notch-by-notch residual in §7 stands: notches still walk to the end-hold.
* `WRAP_BOW`/`WRAP_RISE`/`WRAP_EXTRA_S`/`WRAP_TURN` are untouched — the path
  shipped in `2c22844` is the path that ships now.

## 12. …and the wrap was spending the gesture that made it

Found while gating the above, on the tree that already had every fix in §8:
**R5 failed intermittently** — `fling past last -> 0.259988` where it wants
`0.000000`, i.e. one flick buying Final → Mission → **Inspire**. Roughly one
run in two, and never reproducible with a gentler flick, which is why it
survived `2c22844`'s gates: R5 uses the hardest gesture in the battery
(18 frames × 240 px) and `b0227bd`'s guarantee only broke under it.

**The cause is the wrap's own cost, charged to the visitor.** `push()` drops
the arrival wall whenever a delta arrives more than `ARRIVAL_HOLD_MS` after
the last one. The wrap runs inside `update()`, and its frame is the most
expensive frame on the site: `placeAt`'s two `dt = 0` `applyFrame` passes,
every seam re-armed, the destination chapter's geometry touched, a 4 s blend
armed — and then that frame still has to render the destination world. When it
overran 90 ms, the **next delta of the very same flick** read as a pause,
dropped the wall, and the rest of the gesture bought a second section.

`f2bd1cd` had already named this hazard and measured it as a 0.055% tail of
">200 ms frame hitches"; the loop turned it from a tail into a mechanism,
because the wrap *causes* the hitch every single time. Its own residual note
recorded only the symptom ("after a wrap the visitor must pause before the
next section change") without reaching the cause.

**The fix is that a frame the site spent rendering is not the visitor
pausing.** `ARRIVAL_HOLD_MS`'s own derivation says the delivered spacing of a
continuous gesture *is* the site's own frame time — so when frame time spikes,
the gap spikes with it and means nothing about the visitor. The idle clock now
discounts the overrun of the frame in flight (`stallOf`, measured from
`lastFrameAt` rather than banked from the last `dt`, because input is
dispatched before rAF and banking it a frame late would miss exactly this
case). Only the **excess** over a 34 ms budget is discounted, so an ordinary
frame contributes exactly zero and every measured constant keeps its meaning;
and the discount is capped at 400 ms, because "no frame has ticked for a
while" also describes a backgrounded tab, which must still break the gesture.
The wrap additionally restarts the idle clock at the end of its own placement,
for the same reason it already restores `lastDir` there.

**After: R5 `0.000000` on 4 runs of 4**, and the rest of the battery unmoved —
`E1 −3.33e−4`, `E2/E3 1.0000`, `R4 0.00e+0`, `R6 off-anchor stops: none`,
`?nosnap=1` `E1 0.00e+0` / `N1 0.3600`, `capture.py --check` worst MAE
**0.00/255**. `W2`'s crossing is unchanged (holds to ~50 ms of measured idle,
moves by ~90 once the closing frame is counted), which is the point: the
threshold did not move, only the accounting of what counts as idle.
