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

---

# 13. The lap was never reachable (2026-08-14)

> Hannah: "Sorry, you got it completely wrong on the loop — it still just jumps
> DIRECTLY when I scroll up from the top, or down from the bottom. The camera
> should move like normal, as if it's a normal transition."

She is right, and both previous passes were wrong about the same thing in the
same way. **On a real wheel-driven wrap the camera blend ran exactly ZERO
frames.** The camera stood where `placeAt`'s director pass had put it — the
destination — and never moved again. §8's opening claim, "THE PATH IS
UNTOUCHED… it was already doing its job", was true of the code and false of
the site: the 4 s lap existed, was correct, and no visitor could reach it.

## 13.1 What the trace says

A per-frame camera trace of a **real wheel flick** (12–14 deltas of 120 px, one
per rAF, dispatched at the shipped `window` listener), sampled from an animator
registered last so it reads the pose the frame actually renders:

| | before | before |
|---|---|---|
| | forward (Final→Mission) | backward (Mission→Final) |
| frames that moved after the wrap | **1** | **1** |
| biggest single-frame camera move | **14.6643** | **14.6636** |
| path length | 14.6643 | 14.6636 |
| chord (pre-wrap pose → final pose) | 14.6644 | 14.6636 |
| duration of travel | **0 ms** | **0 ms** |

Path length equals the chord to four decimals, which is the definition of a
teleport. The camera then held that pose, unchanged to 3 dp, for the **next
5.5 s** of trace.

## 13.2 Why two passes measured it as working

Both gated the wrap through `window.journey.wrap(dir)` — the QA hook, which is
`navigateTo()` with **no wheel event anywhere near it**. Traced side by side,
same call, same destination, same build:

| | QA hook `journey.wrap(1)` | real wheel flick |
|---|---|---|
| frames that moved | 178 | **1** |
| path length | 76.4223 | **14.6643** |
| travel | 3815 ms | **0 ms** |
| `scroll.sinceInput` at the wrap frame | ~1e9 | **1.3 ms** |

That last row is the whole defect. §9's frame strip was shot down the hook and
is a truthful picture of a path the site never took.

**The lesson is a rule, not an anecdote: a wrap may never be gated from a
script that does not deliver the input that causes it.** The hook exercises
`directJumpTo`; only a wheel exercises the wrap.

## 13.3 The cause

`stepCamBlend` opens with `if (scroll.sinceInput < 50) endCamBlend()` — manual
input drops the blend. It was written for a jump asked for by a **click**,
where a scroll afterwards is unambiguously the visitor taking the camera back.

A wrap is asked for by the scroll itself. It is armed inside `scroll.update()`,
which `boot()` calls one line before `applyFrame()` **in the same frame**. So
`sinceInput` on the blend's own first frame is the age of the wheel delta that
just caused the wrap — measured, **1.3 ms forward and 7.1 ms back**. The test
fired immediately, every time, in both directions.

`6f23d90` §12 made it deterministic rather than merely likely: the wrap now
restarts the idle clock at the end of its own placement (`lastInput =
performance.now()`, correctly, to stop charging the visitor for the wrap's own
frame). That is right for the arrival wall and it also guarantees `sinceInput`
is ~0 on the very next frame. The two fixes were each correct and together
they closed the blend out completely.

The brief's own suspicion — "the wrap may be reaching the destination by a
state placement rather than the blend" — is half right: `placeAt` **is** what
puts the camera on the destination, exactly as designed, and the blend is what
was supposed to pull it back off again. The blend was armed and then cancelled
0 frames later, so the placement was all that was left.

## 13.4 The fix

**A blend is cancelled by input the model ACTS ON.** Input the model is
currently *refusing* is not the visitor taking control — it is the gesture that
asked for this move still finishing.

`scroll.answeredAt` is exactly that refusal already, with no new state: it is
the arrival wall, raised by the wrap at the end of its own placement, and while
it stands `carrying()` refuses every remaining delta of the same gesture. Those
deltas buy nothing and move nothing, so cancelling on them could only strand
the camera mid-lap. One line:

```js
if (scroll.sinceInput < 50 && scroll.answeredAt === null) {
```

It comes down — and the camera goes back to the visitor — on exactly the three
events that already mean *the visitor is asking for something new*: an
`ARRIVAL_HOLD_MS` (90 ms) pause, a reversal, or a placement (`dropWall`).
Tying the camera hand-back to that threshold is the point rather than a
coincidence: **the instant a visitor has earned another section is the instant
they have earned the camera back.**

The click jump's contract is untouched. `directJumpTo → placeAt → setProgress →
newGesture → dropWall` means the wall is DOWN on every frame of a click blend,
so the first stray delta still cancels it within one frame. (`answeredAt` can
legitimately be `0` — the Mission anchor — so this must be a null test and
never a truthiness test; `scroll.js`'s getter now says so.)

## 13.5 After

Same probe, same flick, same build:

| | after, forward | after, backward |
|---|---|---|
| frames that moved after the wrap | **177** | **190** |
| biggest single-frame camera move | 1.1846 | 1.0418 |
| **path length** | **76.4208** | **76.4233** |
| chord | 14.6644 | 14.6636 |
| duration of travel | **3837 ms** | **3791 ms** |

The wheel-driven path length now matches the QA hook's 76.42 to four
significant figures in both directions: the visitor gets the authored lap, and
gets the *same* lap the hook has been reporting since `2c22844`.

## 13.6 How it reads

**Forward (Final → Mission).** The colony holds while the camera lifts off it
and the Final sentence releases with the pull; the lap swings wide and rises
until the organism is small and far below; then it draws back in and the hero
mushroom grows into frame with its sentence settling last. It reads as one
continuous move that goes *around* the thing rather than through it.

**Backward (Mission → Final).** The exact mirror — the hero copy releases into
the swing, the camera goes out and over, and the field of the colony comes up
to meet it as it arrives. Neither direction has a frame where anything is
switched on or off in open view.

**Honest note on length.** At ~3.8 s this is three to four times any other
transition on the site, and around t≈1.8 s the composition is briefly very
empty — the organism small, far, and low in frame. That is a real consequence
of the authored `-294.2°` lap, whose reasoning (§4) is sound and which I have
deliberately **not** changed in this pass: Hannah has never actually seen it,
so changing the travel and the path in one go would leave her unable to say
which part she is reacting to. If she wants it shorter, `WRAP_EXTRA_S` is the
one number to move, and the path is otherwise independent of it.

# 14. Gates (2026-08-14)

* **The defect, before and after** — §13.1 and §13.5, a real wheel-driven wrap
  in both directions, plus the QA-hook control in §13.2 that isolates the cause
  to the input clock and nothing else.
* **Frame strips** — `before` shows the destination pose in the first frame
  after the wrap and *identically* in all eight subsequent frames
  (`cam -2.2 2.2 10.4 fov 38` throughout); `after` shows the lap.
* **`b0227bd`, one gesture one section, through the wrap** — R5
  `fling past last -> 0.000000` (want 0.000000), `fling before first ->
  0.970000` (want 0.970000), `notches past last -> 1.0000` (the end-hold, which
  a notch reader must still reach). R6 `off-anchor stops: none`.
* **`f2bd1cd`, the 90 ms threshold, swept through the wrap** — wrap, pause,
  flick again: holds at 0 and 30 ms of wall-clock pause, buys a second section
  from 60 ms. The crossing is unmoved (§12's "holds to ~50 ms of measured idle,
  moves by ~90 once the closing frame is counted") — 60 ms of wall clock plus
  the flick's own closing frame is the same ~90 ms of measured gap.
* **`6f23d90`'s seam continuity survives, and is strengthened.** Grade, chapter
  retire and copy all ride the blend's ease; the cancel branch that this fix
  stops taking is also the branch that called `ui.cancelCopyEntry()` and
  `cancelHeroEntry()`, so before this change the copy envelope and the hero
  furniture entry were being killed on the wrap frame too. They now run for the
  move they were armed against — which is what §8 intended.
* Rest of the battery unmoved: E1 `-3.45e-4`, E2/E3 `1.0000`, R1 settles
  `0.260000`, R2 control back next frame, R3a/R3b unchanged, R4 overshoot
  `0.00e+0`.
* **Console** over three laps forward and two back by gesture — 28 legs, **6
  wraps** — 2 entries, both the ordinary boot `info` lines; **0 warnings, 0
  errors**. URL clean throughout (`hash=''`).
* **Deep links** `?p=0.5 -> 0.5230 connect`, `?pose=final -> (-14.72, 2.73,
  2.70) fov 45.5` (the frozen pose exactly), `?capture=inspire -> 0.2600`.
* **`capture.py --check` PASS, worst MAE 0.00/255** over all ten frozen
  references — no placement path is touched.

# 15. Residuals (2026-08-14)

* **Taking the camera back mid-lap still ends in a step, and it is now
  reachable.** Cancelling the blend drops it, and the next frame the director
  writes the pose for the live `p` — the same hard hand-back every click jump
  has always had. Measured across the wrap by pausing then scrolling on at
  300/900/1800 ms: the biggest single-frame move after the hand-back is
  **0.25–3.37 world units**, which is inside the frame-to-frame motion of an
  ordinary hard scrub and an order of magnitude below the 14.66-unit teleport
  that was the defect. Left alone deliberately; a soft hand-back would be new
  machinery on a contract that is shared with every other jump.
* §11's residuals stand: the draw-call cliff, and the notch reader still
  cannot wrap.
* `WRAP_BOW`/`WRAP_RISE`/`WRAP_EXTRA_S`/`WRAP_TURN` remain untouched — see the
  honest note in §13.6.

---

# 2026-08-14 — the interrupted lap left the hero behind

**Requested:** Hannah. **Built:** same day (inherited from a session cut off
mid-gating; every empirical claim in the inherited comments was re-measured
before it was kept — see §19).
**Files:** `journey/journey.js`, `journey/director.js`. No route file, no
camera key, no p-value, no golden move, no change to the path.

> "If halfway through the loop I stop the scroll, the hero mushroom can end up
> displaced, stuck in the wrong position, and it stays permanently stuck."

## 16. What was actually stuck

A wrap arms a camera blend and snaps journey state to the destination in the
same tick. A genuinely new gesture — 90 ms of stillness and then one delta,
which is `dropWall()`'s own definition — cancels that blend within a frame,
**by design**: `b0227bd`'s contract is that manual input takes the camera back
immediately. So far so good, and in one direction that is the whole story.

The two directions were not the same story, because the two destinations are
not on the same side of the ownership threshold.

| | up-wrap | down-wrap |
|---|---|---|
| destination | Final rest, `p 0.97` | Mission, `p 0` |
| director at the destination | **owns** the camera | **un-owned** (`p > 0.0008` is false) |
| who writes the pose after the cancel | `director.apply(p)`, the very next line of `applyFrame`, every frame | **nobody** |

At `p = 0` the hero composition is restored by a **one-shot inside
`setOwned(false)`** — which fired at the *start* of the lap, four seconds
earlier — and re-asserted per frame only from *inside* `stepCamBlend`, which
is precisely the thing that just stopped. So the camera simply stayed wherever
the lap had got to, and nothing ever wrote it again.

### Measured, before

Real in-page rAF-timed `WheelEvent`s at ~15–22 ms spacing (the only path that
can fire a wrap at all — CDP `Input.dispatchMouseEvent` cannot beat the 45 ms
same-gesture threshold on this machine, and `journey.wrap()` bypasses the wheel
path entirely). One case per **fresh page**, because the fault poisons the page
and contaminates any later case sharing it. The lap is interrupted at four
points; the trace then runs 5 s past the cut.

| cut at | camera off the hero pose | fov off | drift over the next 5 s |
|---|---|---|---|
| 400 ms | **16.11** | 7.30° | **0.0000** |
| 1200 ms | **24.98** | 5.73° | **0.0000** |
| 2000 ms | **22.29** | 2.97° | **0.0000** |
| 3200 ms | 1.07 | 0.14° | **0.0000** |

Drift `0.0000` on every frame of every case *is* the "permanently". The
up-wrap, same four points, same input: **0.0000 units of disagreement**, within
one frame, at all four. The asymmetry is exactly the ownership column above.

### It does not stop at the framing

The strand is what the **next** `setOwned(true)` hands to `captureHero()`,
which reads the live camera — correctly, because a visitor may have orbited the
hero before scrolling. That is right only while the un-owned camera IS the
hero's. Once it is not, the strand is baked into `hero` itself, and `hero` is
the wrap's own destination. Re-firing a clean wrap on the same page afterwards:

| after a cut at | lap arc | lap duration |
|---|---|---|
| 400 ms | **7.97** units | 0.98 s |
| 1200 ms | **22.84** units | 1.97 s |
| 2000 ms | **53.77** units | 3.14 s |
| 3200 ms | 75.67 units | 3.88 s |
| *(clean page)* | *76.43 units* | *3.86 s* |

So one interruption silently un-does **`e4df4b0`** — "the wrap genuinely
travels" — for the rest of the session, turning a 294° lap into a 16° nudge.
That is the loudest thing the strand costs, and it is why this was not a
framing blemish.

### And one frame earlier than that

The cancellation test used to live at the top of `stepCamBlend`, i.e. *after*
`setOwned()` and `director.apply()` had already run for that frame. One line
too late in exactly one case: when the delta that cancels the blend is also the
delta that carries `p` past `0.0008`, `setOwned(true)` runs **first** and
captures `hero` off a camera the dying blend still has mid-lap. Measured: a
single 500 px delta at 1800 ms (worth `p = 0.0224`, twenty-eight times the
threshold) poisoned `hero` by **25.68 units / 3.76°** one frame after the cut;
a 120 px delta at 1000 ms by **22.44 units / 6.30°**.

## 17. The cure

Three lines, each the smallest statement of one of the three faults.

1. **`director.restoreHero()`** — `setOwned(false)`'s hand-back body, lifted
   out so it can be called again. The camera pose *and* the fog, because the
   blend lerps `scene.fog` too and restoring one without the other leaves the
   landing lit for a `p` it is no longer at.
2. **`endCamBlend()` calls it when the director is un-owned.** The un-owned
   half now does what the owned half already did, rather than getting a third
   behaviour invented for it. Skipped when the director owns the camera, so it
   can never fight `director.apply()`.
3. **The cancellation is decided at the TOP of `applyFrame`**, before ownership
   is. Same frame, same values — "control returns within one frame" is
   untouched — but the camera is now always the hero's before anyone reads it.

Weighed and rejected: leaving the camera where it is and letting the next
gesture take over makes the view a function of *history*, which is the M4 stuck
camera again; refusing cancellation past some point of the lap trades a bug for
a 3.8 s lockout and breaks `b0227bd`.

`releaseToHero()` was also made exact. It has no callers today, but the
inherited form called `setOwned(false)` **and** `restoreHero()` — and
`restoreHero()` *spends* `pendingView` via `rawSetView`, which refreshes
`camera.aspect` and runs `controls.update()`. The second call would find
`pendingView` null, fall to `applyHeroPose()`, and write the same three numbers
without either side effect: a breakpoint replay silently downgraded to a bare
pose write. It is now exactly one restore either way.

## 18. Gates

Every measurement below is through **real in-page rAF-timed `WheelEvent`s**
unless it says otherwise. Nothing here was gated through `journey.wrap()`.

* **The strand and its permanence, before and after, both directions, four
  interruption points each** — the tables in §16, and after the fix: camera
  error **0.0000** and fov error **0.000** at all eight, drift `0.0000` over
  the following 5 s, `hero` drift **0.0000** including after a further
  `setOwned(true)`.
* **The lap still travels** (`e4df4b0`): re-fired after every one of the eight
  interruptions, **76.43 units over ~3.90 s**, the clean figure, in every case.
* **The ordering case**: a 500 px and a 120 px interrupting delta, both of
  which cross the ownership threshold — `hero` drift **0.0000** one frame after
  the cut and at the end of the trace, against 25.68 and 22.44 units before.
  Both settle on an anchor (`p 0.00000` / `p 0.97000`).
* **A full ride** — four laps (two forward, two backward), **twenty legs**,
  four wraps of which **two were interrupted mid-lap and then scrolled on
  from**: every leg lands on an anchor, no off-anchor stop, camera-vs-`p`
  error `0.0000` at every landing, `hero` drift `0.0000`, URL clean (no hash
  written), **console 0 entries**.
* Scroll battery, live: `E1 −3.38e−4` (resolution live), `E2/E3 1.0000`,
  `R1 0.260000`, `R4 overshoot 0.00e+0`, `R5 fling past last → 0.000000 |
  fling before first → 0.970000 | notches past last → 1.0000`,
  `R6 off-anchor stops: none`.
* Deep links: `?p=0.36 → 0.2676 inspire`, `?p=0.72 → 0.7250`,
  `?pose=owned → (1.73, −1.18, 0.56) fov 58`, `?pose=final → (−14.72, 2.73,
  2.70) fov 45.5` — the frozen poses exactly. Cold load → `p 0`,
  `(−2.25, 2.25, 10.40)` fov 38.
* `capture.py --check` **PASS, worst MAE 0.00/255** across all ten frozen
  references. No placement path is touched.

## 19. Which inherited claims survived

The uncommitted work this pass inherited was re-measured claim by claim, on the
grounds that three earlier inherited-work cases on this codebase each carried a
false one.

| inherited claim | verdict |
|---|---|
| the down-wrap strands at `p = 0` because the director is un-owned there | **confirmed** — 16.11–24.98 units, drift 0.0000 |
| the up-wrap does not, because `director.apply(p)` re-asserts it | **confirmed** — 0.0000 at all four points |
| `captureHero()` then bakes the strand into `hero` | **confirmed** — 0.0000 at the cut, 16.11–24.98 after the next `setOwned(true)` |
| the cancellation test was one line too late for a threshold-crossing delta | **confirmed** — 25.68 / 22.44 units, one frame after the cut |
| all ten frozen references at MAE 0.00 | **confirmed** |
| `restoreHero()` must carry the fog as well as the pose | **kept** — the blend does lerp `scene.fog`; not independently exercised by a gate here |
| the quoted figures 26.62 / 16.47 / 26.62 / 4.47 units at 600/1800/3000 ms | **replaced.** Not re-measured at those sample points; the comments now carry this pass's own figures at its own points, so no number in either file is unverified. |
| `releaseToHero() { setOwned(false); restoreHero(); }` | **corrected** — see §17; the doubled call downgrades the `pendingView` path |

## 20. Residuals

* **§15's residual is corrected.** It reported the hand-back step as "0.25–3.37
  world units"; that is the largest frame-to-frame move *after* the hand-back,
  not the hand-back itself. Measured properly — the single frame in which the
  camera returns to the pose `p` implies — the step is **15.40 / 24.78 / 23.13
  / 1.94** units forward and **16.15 / 27.01 / 25.81 / 1.74** units backward at
  400/1200/2000/3200 ms. The backward figures are what the site has shipped
  since `e4df4b0`; this pass gives the forward direction the same step instead
  of a permanent strand, so the two are now genuinely mirrors. A step of that
  size is still a step: softening it would be new machinery on a contract
  shared with every other jump, and is deliberately not attempted here.
* §11's residuals stand: the draw-call cliff, and the notch reader still cannot
  wrap.

---

# 2026-08-14 — the ring stops switching and starts going out

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/chapters/final/index.js` (the blend driver's rate). No
ladder rung, no threshold, no route file, no camera key, no p-value.

> "When I'm going from the end to the beginning in the loop, or the beginning
> to the end, the whole fairy ring kind of just lights up all in one go, or
> lights down all in one go. Could you make that a lot more gradual and
> progressive, so it looks more elegant — maybe one piece at a time, so the
> ring goes and then all the mushrooms come in or go away after that. So it
> feels like the lights are going off somewhere."

## 21. The rate was right; the distribution was not

`1825393` paced the Final field's reveal over the camera move instead of over
the move's speed, taking per-body kindling from 62–75 ms to ~160 ms. That
number is still right, and this pass does not change it. What it could not fix
— and never claimed to — is the **shape**.

The chapter's 24-rung arrival ladder (`18-one-species.md` §13.2) is an
**accelerando**: gaps of 7.5 millip at the head tightening to 1.2 at the tail,
authored so the openers are "each one its own event" and the closers land "as
the town fills". That shape was designed for the forward **scrub**, where the
scroll model's own landing brake decelerates into the rest and stretches the
tail back out in time. A blend has no landing brake — `1825393` slews at a
**constant** 1.0 pull/s — so the ladder's threshold spacing maps straight onto
the clock and the tail is delivered raw.

### Measured, before

Real in-page rAF-timed `WheelEvent`s; a tracer animator registered last, so
every reading is the **presented** frame. `journey.wrap()` was not used.
Gaps between consecutive ring members crossing lit/unlit:

| | member-to-member gaps (ms) | tightest |
|---|---|---|
| down-wrap (end → beginning) | 50, 32, 34, 333, 186, 83, 83, 82 | **32 ms** |
| up-wrap (beginning → end) | 83, 83, 84, 200, 316, 50, 17, 50 | **17 ms** |

Four of the nine inside 116 ms going out; four inside 117 ms coming in, one
pair 17 ms apart. On the same frames the field collapsed **103 → 17 bodies in
200 ms**. That is "all in one go", and it is the ladder's own tail played at
constant speed.

The threshold table says why, once you look at it as a histogram rather than a
list — 79 of the 103 drawn bodies live in the top band and 29 of those inside
0.036 of pull, which at 1.0 pull/s is **36 ms**:

| tier | n | threshold range |
|---|---|---|
| 0–2 (ring members) | 9 | 0.0966 … 0.9511 |
| 3 (field clones) | 15 | 0.4118 … 0.9046 |
| 4 (far batch) | 50 | 0.7204 … 0.9375 |
| 5 (cap-rim hints) | 29 | 0.8024 … **0.8384** |

## 22. The fix is the clock, not the ladder

Nothing here re-authors a rung. Every threshold, and the **order**, is
untouched — which matters, because the order is what carries Hannah's staging
(§23). What changes is that on a blend the driver spends the same **time** per
rung instead of the same **pull** per rung:

```
rate(u) = clamp( gapAround(u − REVEAL_W/2) / LADDER_GAP_S,
                 RATE_MIN, BLEND_REVEAL_RATE )
```

* **The ceiling is the shipped rate.** A gap already wider than the target is
  left exactly as it ships — so the sparse head is unchanged, per-body kindling
  included. `REVEAL_W / rate` *is* the kindle time, and `1825393` derived 160 ms
  to sit between the forward flick's 136 and the forward firm read's 190; going
  faster there would buy a pop.
* **Narrow gaps are stretched** to `LADDER_GAP_S`. The tightest ladder gap today
  is 0.0137 of pull — 13.7 ms at the shipped rate, now 40 ms.
* **The lookup is half a reveal width behind the driver**, and that is not a
  detail. A rung's light runs from its threshold to threshold + `REVEAL_W`, so
  what reads as its *arrival* is the half-way point. The first cut paced on
  `gapAround(u)` and failed exactly where it mattered: the top three rungs all
  arrive **above** the last rung, off the end of the table. Measured with the
  un-shifted lookup, the last three members crossed **0, 42 and 46 ms** apart
  going out and **85, 23, 24** coming in — the clump intact, just moved.
* **`RATE_MIN` is a guard, not a shaper.** Today's tightest gap needs 0.304 and
  the floor is 0.30, so it never binds; it exists so a future pair of rungs
  landing on top of each other cannot stall the reveal inside a move.
* **Below the first rung nothing is kindling**, so the driver runs at
  `RATE_FAST` there. That dead road pays for part of the stretch.
* **The rungs are read from the build**, not restated as constants —
  `18-one-species.md` §13.4 lists "the ladder constants bake the measured camera
  curve" as a standing hazard, and a second table to keep in step would be a
  second copy of it. Tiers 0–3 are exactly the 24 authored bodies; T4 haze and
  T5 hints are texture and deliberately do not pace anything.

**The budget is the binding constraint, and it is measured.** The down-wrap
gives the chapter **1.384 s** from the move's first frame to the frame its own
`rise` begins fading it (`uAmount` leaves 1.0 at 1452 ms, reaches 0 at 1535 ms).
The up-wrap gives **1.450 s** between the chapter becoming visible and the lap
landing. At `LADDER_GAP_S = 0.040` the whole band costs **1.351 s**; at 0.045 it
is 1.431 s and does not fit.

## 23. The staging was already in the order — it needed time

Hannah asks for "the ring goes and then all the mushrooms come in or go away
after that". The ladder already says that: the four lowest rungs are ring
members (0.0966, 0.1833, 0.2638, 0.3406) and the field's first body is at
0.4118. At 32–34 ms apart it was unreadable. From the real-time frame strip
(captured in-page off the drawing buffer immediately after `composer.render()`,
because a screenshot costs 750 ms and the whole reveal is 1.2 s — and because
the stretched-clock method that is faithful for geometry is **not** faithful
here, the blend pacing being rate-limited in wall clock):

**Coming in** — four ring members arrive alone, one at a time, before a single
field body:

| ms | camera x | pull | ring | field |
|---|---|---|---|---|
| 2630 | −8.28 | 0.037 | 0/9 | 0 |
| 2748 | −10.59 | 0.215 | **1/9** | 0 |
| 2863 | −12.40 | 0.310 | **2/9** | 0 |
| 2986 | −13.75 | 0.411 | **3/9** | 0 |
| 3098 | −14.62 | 0.519 | **4/9** | 1 |
| 3448 | −15.20 | 0.781 | 5/9 | 5 |
| 3681 | −15.03 | 0.897 | 5/9 | 46 |
| 3798 | −14.90 | 0.943 | 5/9 | 74 |

**Going out** — the field empties, then the last ring members go out one at a
time: field 94 → 20 over 466 ms (it was 234 ms), 0 by 1303 ms, and the ring
still stepping 4 → 3 at 1422 ms.

## 24. Gates

* **Frame strip, both directions, before and after**, real speed, 13 shutters
  at 110 ms — the tables above.
* **Member-to-member gaps**, every presented frame:

  | | before | after |
  |---|---|---|
  | down-wrap tightest | **32 ms** | **49 ms** |
  | up-wrap tightest | **17 ms** | **66 ms** |
  | down-wrap ring transition | 966 ms | 1218 ms |
  | up-wrap ring transition | 967 ms | 1200 ms |
  | field 103 → ~20 | 200 ms | **466 ms** |

* **`revealgates.js` G1 and G2 bit-exact**: `G1 scrub |uPull − pullOf(camera.x)|
  max over 246 frames: 0.00e+0`, `G2 placement, 10 poses: 0.00e+0`. Off a blend
  this file is what it was — the scrub, `?p=`, `?pose=` and the frozen
  `?capture=` path are camera-pure by assignment, not by measurement.
* **G3–G6 restated over the reachable input path.** `revealgates.js` refuses to
  produce them from a synthetic event (it asserts `e.isTrusted`), and CDP cannot
  deliver a trusted stream inside the model's 45 ms same-gesture threshold on
  this machine — so the wrap it wants to gate is unreachable through it. Asserted
  here over real in-page wheel wraps instead:
  * **G4, nothing fades in over open view** — worst `shown − max(pure, held)`:
    **0** in both directions.
  * **G5, the landing does not pop** — worst single-frame driver step
    **0.0749** (down) and **0.0662** (up) against the 0.16 limit.
  * **G6, it converges** — final lag **0** in both directions; no lag is latched
    into the next ride.
* `capture.py --check` **PASS, worst MAE 0.00/255** over all ten frozen
  references.
* Scroll battery unchanged: `E1 −2.60e−4`, `E2/E3 1.0000`, `R1 0.260000`,
  `R4 overshoot 0.00e+0`, `R5 0.000000 / 0.970000 / 1.0000`, `R6 off-anchor
  stops: none`.
* **Full gestured ride**: 23 legs, four laps, four wraps including two
  interrupted mid-lap — every leg on an anchor, `hero` drift 0.0000,
  **console 0 entries**.

## 25. Residuals

* **Only a blend is re-paced.** A forward or reverse scrub still plays the
  accelerando, tight tail and all, which is what it was authored for and what
  Hannah has accepted twice. If the tail ever reads as a clump on a *scrub*,
  that is the ladder's own shape and belongs to `18-one-species.md`.
* **The down-wrap has ~33 ms of budget left.** Anything that lengthens the
  reveal, shortens the lap, or moves the Final rest again will make the retire
  overrun into `uAmount`'s fade. That overrun is graceful — a continuous fade
  over an unfinished retire, not a pop — but the margin is real and small, and
  `LADDER_GAP_S` is the dial.
* T4 haze and the T5 cap-rim hints still arrive as weather inside whichever
  ladder gap they fall in. 29 hints inside one 40 ms gap is by design; they are
  texture, not events.

# 2026-08-14 — the down-wrap stops switching off and starts leaving

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/chapters/final/index.js` (the departure's clock and the
chapter's own fade), `journey/journey.js` (the move tells the chapter how long
it has). No ladder rung, no threshold, no route file, no camera key, no
p-value.

> "Right now, when I scroll down from the final section to loop back to the
> first one, all the lights switch off before the actual loop starts — before
> the motion properly starts. Could you make all the other mushrooms switch off
> as I'm going, and make sure that's a nice elegant motion with them switching
> off as it goes? Maybe they should be turning off throughout the whole
> duration of the thing. The motion the other way is perfect — it's the
> bottom-to-top that feels not good."

## 26. The asymmetry is the ceiling, and it is one-sided by design

`§21`–`§25` re-shaped the *distribution* of the blend reveal and left its
*anchor* alone. The anchor is where the two directions differ, and it is one
line: `slewPull`'s

```
ceil = max(pure, held)     //  "may HOLD light the lens has earned,
                           //   never CREATE light it has not"
```

Coming **in**, that clamp binds on every frame — `pure` leads and the driver
follows it, so the reveal cannot start before the lens has arrived. Going
**out**, `pure < held` makes the ceiling `held`, which is a no-op: the retire
free-runs on the ladder clock with **no camera term in it at all**.

### 26.1 Measured, before

Real in-page rAF-timed `WheelEvent`s (CDP `Input.*` cannot stream inside the
model's 45 ms threshold); a tracer animator registered last, so every row is
the presented frame. `journey.wrap()` was not used anywhere in this pass.

| | up-wrap (in) | down-wrap (out) |
|---|---|---|
| move | 3839 ms | 3867 ms |
| first body crosses | 2576 ms (**67%**) | 122 ms (**3%**) |
| last body crosses | 3684 ms (**96%**) | 1245 ms (**32%**) |
| the 94-body field | 2874 → 3656 ms | 145 → **926 ms** |
| chapter on screen | 2402 → landing | 0 → **1519 ms** |

The row that names the fault is the camera's, not the field's: **at 926 ms,
with every one of the 94 field bodies already dark, `pullOf(camera.x)` is still
exactly 1.120 — saturated.** The camera has moved 0.24 of x. Not one light that
went out in the first second was asked for by the lens. So it is (a) *and* (b)
together, and worse than either: the extinguish starts on the blend's **first
frame** and finishes inside a window where the camera-pure driver has not moved
at all. That is "before the motion properly starts", exactly.

### 26.2 Why the camera cannot pace it either

`pullOf` reads camera **x**, which is the Final **leg's** own coordinate. The
lap is an **orbit**. Traced:

| | camera x | `pullOf(x)` |
|---|---|---|
| 0 → 926 ms | −14.72 → −14.96 (via −15.21) | 1.120, **clamped flat** |
| 926 → 1413 ms | −14.96 → −8.0 | 1.120 → **0**, a 409 ms cliff |
| 1413 → 3867 ms | −8.0 → +15.09 → −2.25 | 0, and meaningless |

The driver's whole dynamic range is spent in the first 1.4 s of a 3.87 s move
because a leg coordinate is being read on a path that does not travel along it.
`rise` (uAmount) is keyed the same way and closes the chapter at 1519 ms for the
same reason: **61% of the lap has no epilogue in it whatsoever.** A frame strip
with the chapter held composed shows the colony still well inside frame at
1.2–2.0 s — filling precisely the emptiness §13.6 flagged at t≈1.8 s.

## 27. The fix is the window; the shape is untouched

A move that is **leaving** now tells the chapter how long it has —
`setBlending(true, dstCamX, dur)`, for the same reason it already hands over
`dstCamX`. The retire then spends `RETIRE_SPAN` of the move instead of spending
the ladder's own clock:

```
retireScale = min(1, BAND_S / (RETIRE_SPAN * dur))
rate(u)     = blendRate(u) * retireScale
```

* **One scalar on `e1e8381`'s curve.** Every rung keeps its *relative* time, so
  the re-shaped accelerando, the half-reveal-width lookup and the `RATE_MIN`
  guard all survive intact. Only the tempo moves.
* **It can only ever slow.** `min(1, …)` leaves a move with less room than the
  ladder needs bit-for-bit as it ships. The longest ordinary jump's duration law
  tops out at 1.20 s, whose window is 0.74 s — under `BAND_S` — so **no
  non-wrap blend can reach this code**, and the rail click out of the epilogue
  is unchanged by arithmetic rather than by hope. Today only the wrap's 4.00 s
  lap clears the bar: window 2.48 s, `retireScale` **0.526**.
* **`BAND_S` is integrated off `blendRate`, not restated** — 1.3048 s, ∫du/rate
  over the whole `PULL_MAX` band. Doc 18 §13.4's standing hazard is "the ladder
  constants bake the camera curve"; a second cost table would be a second copy
  of it.
* **`retiring` is `blendPull < shownPull`** and nothing else. An arrival is
  already paced by its landing (the ceiling above), so it never arms.

### 27.1 …and the chapter's own fade has to wait for its lights

On the **leg** the ordering is free: `pull` reaches 0 at x −8 and `rise` only
begins falling at x −7.4, so **the reveal is finished before the fade begins**.
On the lap that held by luck (retire done 1245 ms, fade 1440 ms) and a stretched
retire breaks it — `rise` would snuff a 60%-lit field in 79 ms, which is the
same complaint moved to the end of the move.

While a stretched retire runs, the chapter therefore fades on **its own last
light** rather than on a leg coordinate the lap does not travel along: `eff`
eases out across `[0, LADDER[0]]` — exactly the dead road below the first rung,
where `blendRate` already knows nothing is kindling. No light is ever cut (`eff`
is 1 for every pull at or above the lowest threshold, 0.0966), the last light
and the fade reach 0 together, and the interval is *read from the ladder* rather
than invented. It is latched monotone, because the visibility gate reads `eff`
and resets `shownPull` to the camera-pure value the moment it closes — without
the latch that is an oscillator.

The same sentence covers the third leg-coordinate term. `uPullRaw` — the clone
entry-draw front — is `pullRawOf(camera.x) + (pull − pure)`, which on the lap
puts the draw front **three whole pull units below the pierce while bodies are
still lit**: the exact "un-draw bodies that are still lit" the offset exists to
prevent, arrived at from the other side. Above the pierce the raw and clamped
drivers are the same number, so reading it at the driver is what the line
already computes wherever it is reachable today; only the window this pass
opened differs.

### 27.2 `RETIRE_SPAN` = 0.62 is measured

Each shutter renders the **same frame twice** — once with the epilogue held
composed and the whole field alight, once with its driver at 0 — so sway, spore
drift, twinkle and TAA cancel and the difference is the colony's light and
nothing else:

| into the lap | colony light, as a share of frame luma |
|---|---|
| 0 – 2000 ms | 1.6% → 2.7% (receding behind the lens) |
| 2200 ms | 4.1% |
| 2400 ms | 4.6% |
| 3000 ms | 6.3% |
| 3600 ms | **8.7%** |

The curve **turns upward** after ~2.2 s: past there the lap is bringing the
colony back into view *from the Mission side*, so a retire that ran later would
be putting lights out in a distance the visitor is approaching — lighting the
epilogue up on the way to the hero rather than leaving it behind. 0.62 of a
4.00 s move lands the last light at 2.27 s with 1.5 s of margin before the rest,
and the epilogue's terrain gone at 2.44 s, long before the Mission pose it would
otherwise paint over.

## 28. After

| | before | after |
|---|---|---|
| **down-wrap**, first body | 122 ms (3% of move) | 154 ms (**4%**) |
| **down-wrap**, last body | 1245 ms (32%) | **2267 ms (59%)** |
| **down-wrap**, span | 1123 ms | **2113 ms** |
| the 94-body field | 145 → 926 ms (781 ms) | 204 → 1696 ms (**1492 ms**) |
| tightest ring gap, out | 23 ms | **66 ms** |
| chapter on screen | 0 → 1519 ms | 0 → **2439 ms** |
| **up-wrap**, first/last body | 2576 / 3684 ms (67% / 96%) | 2554 / 3685 ms (**67% / 97%**) |
| **up-wrap**, field span | 782 ms | 778 ms |

The up-wrap rows are the same measurement on the same input path, and they are
unchanged because `retiring` is false on every arriving move — the new code is
not merely inert there, it is unreachable.

**How it reads.** The colony holds while the camera turns off the rest, then
empties around and behind the lens as the lap swings out: at 1.6 s a receding
row of lit caps trails the hero, at 2.0 s four, at 2.4 s the last one goes and
the ground network is all that is left. The lights leave with the distance
instead of being switched off in place.

## 29. Gates

* **Per-body extinguish times, both directions, before and after** — §26.1 and
  §28. Every reading through real in-page rAF-timed `WheelEvent`s off an
  animator registered last. **Frame strips of both**, shuttered in-page off the
  drawing buffer immediately after `composer.render()`.
  · *Harness note:* the shutter costs 15–30 ms and may not arrive before the
  wrap does — shuttering from the flick's first frame stalls rAF enough that the
  **up**-fling reads as notches and no wrap fires at all. The strip's t0 is the
  wrap's own frame for that reason.
* **`revealgates.js` G1/G2 bit-exact**, driven by an in-page rAF wheel supplied
  as `opts.wheel`: `G1 scrub |uPull − pullOf(camera.x)| max over 473 frames:
  0.00e+0`, `G2 placement, 10 poses: 0.00e+0`. G3–G6 are **not** taken from that
  file: it asserts `e.isTrusted`, and its step counts are tuned to a driver that
  moves progress far faster than a wheel. Calibrated here: **0.00095 of progress
  per 40 px delta** on the in-page rAF driver.
* **G4/G5/G6 restated over real in-page wraps.** G4 worst
  `shown − max(pure, held)`: **0** both directions. G5 worst single-frame driver
  step **0.0456** (down) / **0.0888** (up) against the 0.16 limit. G6 final lag
  **0** both directions.
* **The interrupted lap** (`a937444`), flick-and-reverse at 400/900/1400/2000/
  2600 ms into the down-lap, counting only frames the group is actually drawn
  on: worst `uAmount` step **0.757** against the shipped build's **0.760**,
  worst driver step **0.104** against **0.120**, and all five settle on the
  Final rest (x −14.720, p 0.97). Same class as shipped, no regression.
* **Scroll battery unchanged:** `E1 −3.80e−4`, `E2/E3 1.0000`, `R1 0.260000`,
  `R4 overshoot 0.00e+0`, `R5 0.000000 / 0.970000 / 1.0000`, `R6 off-anchor
  stops: none`.
* `capture.py --check` **PASS, worst MAE 0.00/255** over all ten frozen
  references.
* **Full gestured ride**: 35 legs — four wraps, nine nav jumps including four
  into and four out of the epilogue, and an interrupted lap — every leg on an
  anchor, **console 0 entries**.

## 30. Residuals

* **Only a departure with room is re-paced.** A scrub, a placement, an arrival
  and every non-wrap jump are byte-identical by construction. If the wrap's
  duration law ever drops below ~2.1 s, `retireScale` saturates at 1 and this
  whole pass silently becomes a no-op — `RETIRE_SPAN` is the dial, and
  `WRAP_EXTRA_S` is the number that would move it.
* **T4 haze and the T5 cap-rim hints still do not pace anything.** 79 of the 103
  drawn bodies are texture by §22's decision, so the middle of the retire is
  still denser than its ends. Stretched to 2.48 s that now reads as a thinning
  rather than a dump, but the ladder's own 24 rungs are what carry the shape,
  and re-authoring the other 79 belongs to `18-one-species.md`.
* **The last 1.5 s of the down-lap has no epilogue in it.** That is deliberate
  (§27.2's contribution curve turns upward) and it is the one part of "turning
  off throughout the whole duration" not delivered literally.
* **An interrupted lap can still drop `uAmount` by ~0.75 on a drawn frame.**
  Pre-existing and measured on the shipped build at the same magnitude; it is
  the visibility gate toggling, not this pass's clock.

---

# 2026-08-14 — the ground stops switching and starts leaving with the lights

**Requested:** Hannah. **Built:** same day.
**Files:** `journey/chapters/final/index.js` (the bed's own fade). No ladder
rung, no threshold, no route file, no camera key, no p-value, no change to the
path, no change to the bodies.

> "in the loop from bottom to top and vice versa, the ground lights up and
> darkens in a very sudden way. Can you make sure this is all more
> incremental"

## 31. Which surface "the ground" is

Third report on the wrap's lighting, second on it being abrupt, and the first
job was to find out what she is looking at. "The ground" is not one thing in
this scene, so every candidate was traced per **presented** frame across a real
wheel-driven lap in both directions — in-page rAF-timed `WheelEvent`s, a tracer
animator registered last. `journey.wrap()` was not used anywhere in this pass.

| candidate | what it is | verdict |
|---|---|---|
| **Final `terrain`** | the cutaway / soil ground plane, 9 materials | **it is this** |
| **Final `canopy`** | the root network lying across that plane | **and this** |
| Final `ring` | the fruiting bodies | control — already spread (`027f969`) |
| Final `sky` | GPU spore cloud + mist horizon | steps on the same frame; it is the **air**, not the floor — §33 |
| Owned's root network | `20-owned-root-network.md`'s "ground network" | toggles, but is worth 0.15/255 — §33 |
| `sceneApi.groups.ground` | the **hero's own** ground network | already gradual (20.8% / 12.0% of the lap), untouched |

**The two that step are the two with no ladder.** The chapter draws bodies,
which have a 24-rung ladder on `uPull` and are therefore carried across the
move by their own driver — that is what `e1e8381` shaped and `027f969` paced.
Everything else it draws is multiplied by one scalar, `uAmount`, and nothing
else. The terrain and the canopy ARE that scalar, so whatever `uAmount` does,
the ground does.

### 31.1 Measured, before

Matched runs, same harness, same frame rate (44–45 fps on the down lap, 54 fps
on the up), both laps 76.42 units over ~3.86 s. `worst100` is the most of its
own range a surface moves inside any 100 ms window — the frame-rate-independent
companion to the single-frame step.

| | before: spread / max frame step / worst100 |
|---|---|
| canopy, **down**-wrap | 2350–2459 ms = **2.8%** of the lap · 0.3792 · **99%** |
| terrain, **down**-wrap | 2350–2459 ms = **2.8%** · 0.3302 · **99%** |
| canopy, **up**-wrap | 2376–2477 ms = **2.6%** · 0.1996 · **99%** |
| terrain, **up**-wrap | 2376–2477 ms = **2.6%** · 0.1738 · **99%** |
| *(ring, the same frames)* | *63.6% down, 36.0% up* |

Ninety-nine per cent of the ground's entire brightness change, in both
directions, inside one tenth of a second of a 3.9 second move — while the
bodies standing on it spend a third to two thirds of the lap. That is the
report, in numbers.

In pixels, over the **ground region** (lower third of frame, read with
`readPixels` straight after `composer.render()`; `toDataURL` returns a stale
buffer): the biggest single-frame luma step of the whole down-lap is
**3.017/255 at 2472 ms**, and of the up-lap **6.486/255 at 2516 ms** with
4.046 on the frame before it. The worst 100 ms window of the up-lap carries
**13.277 luma, 48% of everything that changes across the entire lap.**

## 32. The mechanism: one scalar, two leg coordinates, one orbit

`eff` is the chapter's only fade, and on a lap it is a step at both ends for
two *different* reasons that are the same reason:

```
leaving    eff = retireEff = smoothstep(shownPull / LADDER[0])
           — the DEAD ROAD below the lowest rung, 0.0966 of pull, crossed at
             RATE_FAST (2.4) x retireScale (0.526) = 1.26 pull/s  ->  77 ms

arriving   eff = rise = riseOf(camera.x)
           — a smoothstep over 2.8 units of the Final LEG's camera x
             (-4.6 -> -7.4), which an ORBIT crosses at ~35 units/s  ->  81 ms
```

§26.2 already wrote the diagnosis for the retire: *"`pullOf` reads camera x,
which is the Final leg's own coordinate. The lap is an orbit."* It named `rise`
in the same breath — *"`rise` (uAmount) is keyed the same way"* — and then
`027f969` fixed the bodies and, in as many words, touched nothing else. The bed
is the nothing else. `027f969` moved the retire OFF `rise` and onto
`retireEff`, which is correct for ordering (§27.1) and which relocated the step
from 1519 ms to 2459 ms without making it any less of a step: the dead road is
2.5% of the pull band, so a fade confined to it is a fade confined to 2.5% of
the move.

**And the arriving direction was never touched at all.** Both directions were
therefore equally sudden — 2.8% and 2.6% — which is exactly what Hannah
reported and is the one place this pass differs from the last two: there is no
"good direction" to copy here.

## 33. The fix: the bed rides the driver the field already rides

```js
const bedUniforms = Object.assign({}, uniforms, { uAmount: { value: 0 } });
...
bed = bedSpread && (blending || lagging)
    ? smoothstep(shownPull / PULL_MAX)
    : eff;
```

The terrain and the canopy get their **own** `uAmount` and nothing else does.
`Object.assign` copies the shared uniform objects by reference, so `uPull`,
`uTime`, `uFront`, `uCta` and the fog pair stay the one shared set — the bed
still breathes with the growth front and answers the same tap wave. Exactly one
float in the chapter is duplicated.

What it buys, and why it is this quantity and not a new one:

* **No new clock and no new pacing.** `shownPull` is already spread across 62%
  of a departing move (`027f969`'s `RETIRE_SPAN`) and across the ladder on an
  arriving one — both measured, both mirrored. The ground is now carried by the
  same spread that carries the lights, so the floor and the lamps standing on it
  stop being two separate events.
* **It is camera-keyed through `slewPull`'s own ceiling**, not through a second
  invariant: `shownPull <= max(pure, held)` means the bed can never be brighter
  than the lens has earned. This is the repeat bug class on this project
  (`a8d4518`, `d1ecc23`, `a3ba9fd`, `783729b`, `046e024`) and it is closed here
  by inheritance rather than by a new rule. Gate B1 below measures it.
* **It is the same function in both directions**, so the two wraps are one
  event run forwards and backwards by construction rather than by tuning.
* **Ordering is free.** Going out, the bed reaches 0 on the same driver value as
  the last light (both at pull 0), so it is already dark before `eff` begins its
  own fade — the retire never has a lit floor snuffed under it, which is the
  hazard §27.1 had to argue its way around. Coming in, bed and field rise
  together from the pierce.
* **The occluder goes with it.** `terrain.setAmount()` drives the soil slab's
  stipple dissolve as well as the haze sprites, and that stays coherent:
  everything the slab exists to hide (the underground cords, hyphae and front)
  is the bed's own geometry and fades with it, so there is never a frame with
  strokes to hide and no slab to hide them.
* **It arms on the move's length and nothing else** — `RETIRE_SPAN * dur >
  BAND_S`, the arithmetic `027f969` already established, and deliberately NOT
  gated on `retiring`, because the bed steps in both directions. The longest
  ordinary jump's duration law tops out at 1.20 s (window 0.74 s, under
  `BAND_S` = 1.305 s), so **no non-wrap blend can reach this code**: the rail
  click into and out of the epilogue is unchanged by arithmetic, and gate N
  below confirms it empirically at 0.000e+00. Off a blend, `bed` is assigned
  `eff` outright, so the scrub, `?p=`, `?pose=` and the frozen `?capture=` path
  are byte-identical by construction.

The visibility gate now reads `max(eff, bed)`. On today's lap that is `eff` on
every frame in both directions, so the draw-call edge does not move — but a gate
reading only `eff` is a gate that can cut a lit bed, and the bed is now the one
thing in the chapter `eff` does not govern.

**Two surfaces were deliberately left alone, and both are named here rather
than left for a fourth report.** `sky` — the GPU spore cloud and the mist
horizon — steps on the same frame (2.1–2.6% of the lap, max step 0.48/0.23) and
is not changed: it is the air, not the floor, and 82% of the particulate light
in frame belongs to it, so re-timing it is a separate decision about the
composition rather than a fix to the ground. Owned's root network toggles its
group in one frame at a mirror-image pose in both directions (camera x −15.18),
which is §11's draw-call cliff, and it is worth **0.15/255 of the whole frame
and 0.45/255 of the ground region** by direct double-render measurement — below
anything the eye can be reporting.

## 34. After

| | before | after |
|---|---|---|
| **canopy, down** | 2.8% of lap · 0.3792 · 99% in 100 ms | **59.7%** · **0.0172** · **7%** |
| **terrain, down** | 2.8% · 0.3302 · 99% | **59.7%** · **0.0150** · **7%** |
| **canopy, up** | 2.6% · 0.1996 · 99% | **32.9%** · **0.0469** · **17%** |
| **terrain, up** | 2.6% · 0.1738 · 99% | **32.9%** · **0.0409** · **17%** |
| the bed's own driver, worst frame step, down | 0.5159 | **0.0235** |
| the bed's own driver, worst frame step, up | 0.2716 | **0.0639** |
| *ring (untouched control), down / up* | *63.6% / 36.0%* | *64.0% / 36.4%* |

In pixels, ground region, matched runs:

| | before | after |
|---|---|---|
| **down**, biggest single-frame luma step | **3.017 @2472 ms** | the 2.4 s step is **gone**; the largest step left in the whole lap is a pre-existing 2.28 @663 ms (2.14 before) |
| **down**, worst 100 ms window | 4.174 (22% of range) | 4.831 (**20%**) |
| **up**, biggest single-frame luma step | **6.486 @2516 ms** (4.046 the frame before) | **3.172 @3189 ms** |
| **up**, worst 100 ms window | 13.277 (**48%** of range) | 8.215 (**29%**) |

The terrain's own contribution to the ground region across the up-lap, measured
by rendering each shutter twice — once as-is, once with the surface suppressed,
so sway, spores, twinkle and TAA cancel: **0 → 2.50 → 3.53 → 3.74 → 4.19 →
4.70 → 5.23 → 5.49** over 2907–3807 ms. Before this pass that whole climb
happened inside one 100 ms window.

**How it reads.** Going out, the ground dims as the camera lifts off it: at
0.7 s it is full, at 1.3 s it is three quarters, at 1.9 s a third with the field
already gone, at 2.3 s the last tenth, and the hero's own floor network has come
up underneath by the time the epilogue's has gone. Coming in, the mirror — the
hero's floor hands over, then the epilogue's ground comes up under the first
bodies rather than arriving whole a fifth of a second before them. Neither
direction has a frame where the floor is switched.

## 35. Gates

Every reading through **real in-page rAF-timed `WheelEvent`s** off a tracer
animator registered last, so every row is the presented frame. `journey.wrap()`,
`flyTo()` and `scrollTo()` were not used to produce any claim in this section.

* **The measurement itself** — §31.1 and §34, both directions, before and
  after, matched runs at matched frame rates, plus the ground-region luma trace
  and the double-render contribution curve.
* **B1, the new invariant: the bed may never be brighter than the lens has
  earned** — `bed − smoothstep(max(pure, held) / PULL_MAX)`, worst over every
  frame of a real wrap: **before 0.9674 (down) / 1.0000 (up)** — a total
  violation, the ground composed at full over a lens that had earned nothing —
  **after 0.0000 / 0.0000.**
* **N, nav jumps into and out of the Final chapter** (the camera-keying check),
  by a real pointer press on the shipped rail anchor, traced over 296 frames:
  worst `|bed − eff|` **0.000e+00** — no ordinary jump has room, so the bed is
  the shipped scalar bit for bit — and **0 frames** with the bed lit while the
  camera is above x −4.6.
* **`revealgates.js` G1/G2 bit-exact**, driven by an in-page rAF wheel:
  `G1 scrub |uPull − pullOf(camera.x)| max over 392 frames: 0.00e+0`,
  `G2 placement, 10 poses: 0.00e+0`. G3–G6 are still not takeable from that
  file (it asserts `e.isTrusted`; §29), so restated over real in-page wraps:
  **G4 worst `shown − max(pure, held)` 0.0000** both directions, **G5 worst
  driver step 0.0420 (down) / 0.0540 (up)** against the 0.16 limit, **G6 final
  lag 0.0000** both — all unchanged from before this pass, which is the point:
  the bodies are untouched.
* **Frame strips**, both directions, 9 shutters each, shot in-page off the
  drawing buffer immediately after `composer.render()`. Down: `bed` 0.9887,
  0.9184, 0.7310, 0.3237, 0.0966, 0 while `eff` holds 1.0000 throughout. Up:
  0, 0, 0, 0, 0, 0, 0.3913, 0.8905, 0.9992.
* **Scroll battery unchanged:** `E1 −6.26e−4` (resolution live), `E2/E3
  1.0000`, `R1 0.260000`, `R4 overshoot 0.00e+0`, `R5 fling past last →
  0.000000 | fling before first → 0.970000 | notches past last → 1.0000`,
  `R6 off-anchor stops: none`.
* **Full gestured ride, 12 legs including both wraps** —
  `0.2600 0.5230 0.7250 0.9700 0.0000 0.2600 0.0000 0.9700 0.7250 0.5230
  0.2600 0.0000` — every leg on an anchor, off-anchor stops none, **console 0
  entries, 0 warnings, 0 errors.**
* **`capture.py --check` PASS, worst MAE 0.00/255** across all ten frozen
  references. No placement path is touched: `blending` is false on every one of
  them and `bed` is assigned `eff`.
* **`prefers-reduced-motion: reduce`** — the wrap still lands `p 0` and the bed
  still spreads. The change only ever makes an existing brightness change
  slower, so it is the friendlier value under that setting, not the riskier one.

## 36. Residuals

* **The sky still steps, and it is the loudest thing left on that frame.**
  2.1% (down) / 2.6% (up) of the lap, max single-frame step 0.4845 / 0.2313 of
  its own range, 100% inside one 100 ms window. It is deliberately out of scope
  — spore cloud and mist horizon are the air — but it is the one surface that
  would make a fourth report on this frame reasonable. Putting it on the bed is
  one argument (`createFinalSky(sceneApi, bedUniforms)` and
  `sky.update(t, bed)`), and the reason not to do it blind is that the spore
  cloud carries 82% of the particulate light in frame, so the mid-lap
  composition is a real judgement rather than a measurement.
* **Owned's root network still toggles in one frame**, at a mirror pose in both
  directions. §11's draw-call cliff, unchanged, and measured here at 0.15/255 of
  the frame and 0.45/255 of the ground region.
* **The bed is one frame behind the bodies.** `bed` is read off the previous
  frame's `shownPull`, because it must be known before the visibility gate —
  exactly as `retireEff` already is, and for the same reason.
* §30's residuals stand: only a departure with room is re-paced, and if the
  wrap's duration ever drops below ~2.1 s both `retireScale` and `bedSpread`
  silently become no-ops.
* §11's notch-reader residual stands.

---

## 37. Transit velocity: the leg gets faster, the field keeps its clock

Hannah, 2026-08-14: *"And do we have some concept of, like, the terminal
velocity? You know, the natural velocity to go from one section to another. If
so, could you make the velocity from the... owned by the contributors to the
final section and back be faster than it currently is."*

### 37.1 The answer to the question she asked

Yes, there is such a concept, and until this pass it was implicit. Naming it is
half the value of this section, because she is trying to acquire the vocabulary
to ask for this precisely.

**Two different things move the picture.** While your finger is on the trackpad,
progress follows the SURFACE — you are metering it yourself. When the gesture
ends, a *commit resolution* takes over and glides the rest of the way to the
next rest. That glide has a speed, and that speed is the "natural velocity"
she is describing.

**It is denominated in scroll pixels per second** (`3daac2e`; before that it was
in progress-per-second, which is the bug that pass fixed). So:

    transit time  =  the leg's ROAD  /  the transit velocity

A leg's road is its `scrollVh` allocation — how much wheel it costs. That is why
a leg can feel slow to travel without anything about its camera being slow: the
Owned -> Final leg owns **23.99 vh**, 44% of the whole route's road, because the
Final field's kindle was deliberately given room (`61`/`77`/`107`).

**The three numbers that set it** (`journey/constants.js`):

| name | value | what it does |
|---|---|---|
| `COMMIT_GLIDE_PX` | 1500 px/s | floor — the slowest an ordinary released gesture will ever glide |
| `COMMIT_CRUISE_MAX_PX` | 2200 px/s | ceiling — the fastest, so a fling still reads as travel and not a cut |
| `COMMIT_GLIDE_MAX_S` | 7.5 s | no single transition autoplays longer than this |

...and, new in this pass, **`TRANSIT_S` in `journey/route.js`** — a per-leg
override declared in **seconds, rest to rest**, which is the unit Hannah asked
in. Seconds rather than px/s is not a convenience: road is measured in viewport
heights, so `roadPx / seconds` re-derives the right px/s at every viewport size,
and the transition takes the same time on a laptop and on a phone.

**The per-leg table as it now stands** (900 px viewport; "cruise" excludes the
landing brake's tail, which adds ~0.9-1.5 s depending on direction):

| leg | road | transit velocity | cruise | set by |
|---|---|---|---|---|
| Mission -> Inspire | 7.00 vh | 2200 px/s | 2.86 s | ceiling |
| Inspire -> Connect | 17.90 vh | 2200 px/s | 7.32 s | ceiling |
| Connect -> Owned | 5.12 vh | 2200 px/s | 2.09 s | ceiling |
| **Owned -> Final** | **23.99 vh** | **14396 px/s** | **1.50 s** | **`TRANSIT_S` declared** |
| Final -> end-hold | 0.61 vh | 2200 px/s | 0.25 s | ceiling |

To make any leg faster or slower from here, the knob is one line in `TRANSIT_S`
and the unit is seconds.

### 37.2 What was wrong, and my part in it

`3daac2e` fixed a real unit error — the glide was denominated in progress, so
every `scrollVh` raise five Connect passes had bought was discarded whenever a
visitor scrolled and released. Road-denominating it was correct and stays.

But that same change handed this leg the 24 vh it owns, and took it from
**3.27 s forward / 3.44 s back to 7.01 / 7.54** — measured live, both. That was
an uncommissioned side-effect, and it was justified in that commit by pointing
at request 61. **That justification was wrong.** Request 61 is about the field's
KINDLE — how the mushrooms light — and this is the leg's TRAVEL. They are
separable, and Hannah has consistently asked for them in opposite directions:
lighting slower, travel faster. So the leg shipped 2.25x away from what she
wanted rather than closer to it.

### 37.3 The fix, and why it is a velocity and not an allocation

The obvious way to speed this leg up is to give it less road. It is the wrong
way, twice:

* `owned` seg 1 holds 7.00 vh because **request 83** ("one motion, not two
  speeds") needed its mean density to land near the Final arrival's pinned
  handover at p 0.85. That fault WAS a 7.08x scroll-density step on this exact
  leg.
* `final` seg 0 holds 17.0 vh because **requests 61/77/107** want the kindle
  slow.

Declaring a velocity instead **moves no road at all**, so request 83's density
profile is preserved *by construction* rather than by re-measurement, and every
p-value, span, stop and golden is untouched.

### 37.4 Decoupling travel from kindle — the part that made it possible

Speeding the transit alone would have run the ladder faster, because the field's
reveal is **camera-pure** (`pullOf(camera.x)`) and a faster glide sweeps the
camera faster. That is the same fault `BLEND_REVEAL_RATE` already exists for,
arriving through a different door: on a camera BLEND the reveal is rate-limited,
because the visitor is not metering that motion — the machine is.

**A commit glide is the machine too.** So it gets the same answer rather than a
second one: the limiter is now armed by a glide as well as by a blend
(`chapters/final/index.js`, the new `gliding` branch), targeting the camera-pure
value rather than a destination pose — a glide moves the camera continuously
along the real path, so `pure` IS the truth and all the branch does is refuse to
let the ladder be dragged through faster than its own clock. The invariant is
untouched:

    shown_t  <=  max( pullOf(camera.x)_t , shown_{t-1} )

so it can only ever SLOW a light-up, never create light the lens has not earned.
**Requests 61/77/107 are therefore protected by construction**, not by choosing
a transit that happens not to hurt them.

**The flag is `scroll.gliding`, not `scroll.resolving`.** An intent is latched
through most of a live gesture, so `resolving` would rate-limit ordinary brisk
scrolling — the exact failure `final/index.js` records from the first build of
the blend limiter (caught by G1). `gliding` is true only on frames where the
resolution's drive term actually beats the visitor's own servo.

### 37.5 Measured — real wheel path, trusted rig

All timings on a quiet machine at **37.7 fps with `simRatio` exactly 1.000**
(max frame gap 34.5 ms, under the 50 ms `dt` clamp), so these are wall-clock.
The previous pass's numbers were sim-seconds at ~11 fps; where both exist they
agree to ~1%, so nothing moved materially.

    OWNED <-> FINAL, rest to rest        forward    backward
      baseline (before 3daac2e)           3.272 s    3.442 s
      shipped by 3daac2e                  7.011      7.542
      THIS PASS                           2.603      3.012
      vs baseline                         -20.4%     -12.5%
      vs shipped                          -62.9%     -60.1%

    THE FIELD'S KINDLE (uPull sweep, 5% -> 95% of PULL_MAX)
      baseline (before 3daac2e)           1.041 s    1.163 s
      shipped by 3daac2e                  3.434      —
      THIS PASS                           1.312      1.274
      vs baseline                         +26%       +10%   (SLOWER, as required)

So the transit is 20% / 12.5% faster than the state Hannah was riding when she
wrote the note, and the kindle is *slower* than that same state in both
directions. That is the decoupling working: the two numbers moved in opposite
directions from one change.

    CONNECT'S GROUND ARRIVAL — re-verified unchanged (it is hers now, request 72)
      arrival            5.54 s shipped  ->  5.49 s here   (~1%, gesture variance)
      windows H/D/A      1.05/2.25/3.21  ->  1.01/2.27/3.22
      departs            0.88/1.60/3.20  ->  0.84/1.52/3.12
      order + deceleration Hivemind -> Discord -> ADOS, each longer than the last

### 37.6 Gates

1. **Both directions faster than baseline** on the real wheel path: 2.603 /
   3.012 against 3.272 / 3.442. Every gesture landed exactly on its anchor.
2. **Kindle not sped up:** 1.312 / 1.274 s against the baseline 1.041 / 1.163 —
   slower in both directions, and bounded above by `BLEND_REVEAL_RATE` now that
   the limiter is armed on glides.
3. **Connect unchanged:** 5.49 s, same order, same deceleration, and nothing
   drawn below `LIGHT_LO`.
4. **No density step (request 83):** no road moved — `owned` segVh, `final`
   segVh and both `shape` declarations are byte-identical. Preserved by
   construction.
5. **Mirror:** full gestured ride 0 -> 1 -> wrap -> 0, Connect's light window
   sampled 392 forward / 175 reverse: **max |delta uLit| 0.0016** at p 0.3875 —
   tighter than the 0.0069 the previous pass measured, because the rig now
   samples at 37.7 fps instead of 11. **No self-ignition: over 1515 frames
   below `LIGHT_LO`, `group.visible` is false on every frame where uLit > 0.001
   — `framesLitAndVisible` = 0.** (`uLit` and `uAmount` DO read stale below the
   window on a ride that wraps: the animator early-returns before writing them
   while the chapter is retired, so they hold their last value. `group.visible`
   is the draw gate and the only honest test — a uniform read alone would have
   reported a false positive here, and did on the first probe.)
6. **`capture.py --check`: PASS, worst MAE 0.00/255, all ten frozen references
   byte-identical.** No golden re-shot. Nothing here touches a p-value, a camera
   key or a frozen frame — the glide and the limiter are both inert at dt = 0.
7. **Console:** 0 entries across the measurement rides and a full 0 -> 1 -> 0
   gestured ride.
8. **Rests and spans unchanged:** `[0, 0.26, 0.523, 0.725, 0.97]`.

### 37.7 Residuals

- **The two directions are not equal: 2.603 s forward against 3.012 s back, a
  15.7% gap where the baseline's was 5.2%.** Both are faster than baseline in
  absolute terms — the slower direction here still beats the baseline's *faster*
  one — but the RATIO got worse, and this leg carries request 72 ("Final back to
  Owned scrolls much slower than forward") so it is worth naming precisely.
  The cause is the one unit the glide fix did not reach: `SNAP_K` is denominated
  in p, so `brake = |target - p| * SNAP_K` gives a landing tail whose length
  depends on the local road density. At the Final end the road is dense and the
  tail is ~1.10 s; at the Owned end it is sparse and the tail is ~1.51 s. The
  cruise is now perfectly symmetric (it is road-denominated); only the tail is
  not. **The fix is to road-denominate the brake too** — `brake` computed on
  scroll distance with a road dead-zone — which would make the whole motion a
  pure function of road and therefore exactly symmetric in both directions by
  construction. It was NOT taken in this pass: `SNAP_K` governs the landing at
  every rest on the route, and shortening the brake zone at road-dense places
  would land on the tail of Connect's ground arrival, which this pass is
  explicitly required to leave alone. It wants its own pass with its own
  Connect re-verification.
- `COMMIT_GLIDE_PX` (1500) still never binds on any leg.
- The declared transit is the CRUISE; the felt transition is cruise + tail. If
  Hannah asks for a specific number of seconds end to end, the tail has to come
  out of the declaration or out of the brake.

---

# 2026-08-14 — the wrap's spread stopped following the visitor around

**Requested:** found while re-measuring the sky residual (§36) on top of
`a0a89f8`. **Files:** `journey/chapters/final/index.js`. No route file, no
camera key, no p-value, no ladder rung.

## 38. Two correct commits, one wrong interaction

`9865e86` gave the bed a spread armed by `bedSpread`, and deliberately did NOT
clear it on the blend's `false` edge. The reasoning was written down:

> *Not cleared on the `false` edge above: the convergence tail after a landing
> must keep the pacing it was armed with, and the next blend re-answers the
> question here.*

That reasoning depended on what `lagging` meant — "this blend has not converged
yet" — and `lagging` had exactly one armer, the blend. **`a0a89f8` gave it a
second.** To decouple the Owned→Final transit speed from the field's kindle it
armed the same limiter on a COMMIT GLIDE (`scroll.gliding`), which is right, and
that branch also sets `lagging`. From that commit onward `lagging` means "the
driver is behind the camera" — something an ordinary gestured leg now causes
every time.

So `bedSpread && (blending || lagging)` became true on a **scrub**. Neither
commit is wrong on its own; the latched flag is wrong the moment the other flag
it leans on acquires a second meaning.

### 38.1 Measured, before

Real in-page rAF-timed `WheelEvent`s, one gesture per leg, **no nav jump
anywhere** — a nav jump calls `setBlending` and re-answers `bedSpread`, which
hides the fault. From the Final rest: flick down (the wrap, which latches
`bedSpread`), then four gestured legs Mission → Inspire → Connect → Owned →
Final. `|bed − eff|` on every presented frame the chapter is drawn on:

| leg | drawn frames | gliding frames | worst `\|bed − eff\|` |
|---|---|---|---|
| 0 — the wrap itself | 62 | 0 | 0.9739 *(the intended spread)* |
| 1–3 — chapter off screen | 0 | 143 / 199 / 94 | 0.0000 |
| **4 — Owned → Final, gestured** | **140** | 103 | **0.9386** |

On that last leg, at `p 0.8724` / camera x −9.78, the epilogue's ground drew at
**`bed` 0.0614 against `eff` 1.0000** — a near-black floor under a fully
composed chapter, on an ordinary scroll, for the rest of the session after a
single wrap. It was live on `a0a89f8`.

## 38.2 The cure

The spread belongs to the blend and ends with it: `bedSpread = false` on the
`false` edge, and the condition is `bedSpread && blending` — the blend and
nothing else. The convergence tail hands back to `eff`, which is what a landing
is for, and it costs nothing because the lag at a wrap's landing is **0.0000 in
both directions** (G6, measured again here).

After, same sequence, same input: **leg 4 worst `|bed − eff|` 0.0000 over 139
drawn frames**, with the wrap's own spread intact at 0.9764.

**The lesson is narrower than "don't latch flags".** It is that a flag whose
condition reads *another* module's flag has taken a dependency on that flag's
MEANING, not just its value — and meanings are not covered by any gate here. A
condition scoped to the thing that armed it (`blending`) cannot acquire a second
armer behind its back.

---

# 2026-08-14 — the horizon joins the ground, but not on the same curve

**Requested:** Hannah's §31 report, second half — the sky was named as a
residual there (§36) and is now landed. **Files:**
`journey/chapters/final/index.js`. No route file, no camera key, no p-value, no
ladder rung, nothing in `organism/`.

## 39. It is the chapter's own sky, not the organism's spores

Established before touching anything, because the two have different owners.
`sky.js` builds ten children into one group:

| child | what | how it fades |
|---|---|---|
| 0 | this chapter's **own** GPU spore cloud | `uPull` + `uAmount` |
| 1 | the horizon trees | `makeStrandMat` → `uOpacity × uAmount` |
| 2–9 | eight mist sprites | `update(t, amount)` on `material.opacity` |

All three ride the chapter's single `uAmount` — §32's scalar, §32's step.

**`organism/*` is not implicated, and that is measured, not argued.** The
organism's shed (`sceneApi.groups.spores`) carries `uOpacity`, `fogNear` and
`fogFar` and **no `uAmount` at all**: the chapter never scales it, it only lerps
its fog through `applyShedFog`. Traced across both laps, before and after, the
shed's emitted scale is **constant at 2.4000 on every presented frame**. Nothing
was steered through `organism`'s API because nothing needed to be.

## 40. The offset, and why there is one

The one-line change — hand `sky.js` the bed's uniform set — would have put the
horizon on the floor's exact curve. That is the flat-sheet case by construction:
every non-body pixel of the epilogue scaling by one number.

Shot both ways, real speed, same shutters, same lap: **the no-offset strip is
visibly flatter.** At `bed ≈ 0.41` (down, ~2.6 s) the offset frame still has the
spore trail bright and distant caps and verticals standing on the right, while
the no-offset frame at the same floor brightness has gone sparse and empty. The
floor is identical in both; only the distance differs. That is the whole
argument for spending a second float.

So the sky gets its own, on the **same driver and the same smoothstep**, but
whole a third of the band early:

```
bed = smoothstep(shownPull / PULL_MAX)     PULL_MAX = 1.12
sky = smoothstep(shownPull / SKY_FULL)     SKY_FULL = 0.80
```

`sky ≥ bed` at every driver value, and the two meet **exactly** at 0 and 1, so
the seams stay the no-ops §33 established and the hand-back at a landing is
still by construction. The sense is the physical one: **far leads on arrival and
trails on departure.** Going out, the floor starts dimming while the horizon
holds; coming in, the horizon resolves before the floor fills in. Maximum
separation is 0.28, around the middle of the band.

That shows up directly in the measured windows rather than only in the frames —
down, the sky starts moving at **1488 ms** against the ground's **294 ms**; up,
the sky finishes at **3437 ms** against the ground's **4010 ms**.

## 41. Measured, before and after

Matched runs, real in-page rAF-timed `WheelEvent`s, tracer animator registered
last, **28/29 fps** on a contended rig (both figures from the same window; every
headline is normalised by the surface's own range so the sampling rate does not
enter). Both laps **76.40–76.41 units**.

| | before | after |
|---|---|---|
| **down-wrap**, spread | 2447–2533 ms = **2.2%** of the lap | 1488–2820 ms = **31.1%** |
| **down-wrap**, max single-frame step | **62%** of range | **5%** |
| **down-wrap**, worst 100 ms window | **100%** of range | **10%** |
| **up-wrap**, spread | 2362–2477 ms = **2.9%** | 2599–3437 ms = **20.7%** |
| **up-wrap**, max single-frame step | **49%** of range | **13%** |
| **up-wrap**, worst 100 ms window | **91%** of range | **20%** |

Per layer, absolute max single-frame step:

| layer | down before → after | up before → after |
|---|---|---|
| spore cloud | 0.6220 → **0.0536** | 0.4918 → **0.1259** |
| horizon trees | 0.4354 → **0.0375** | 0.3443 → **0.0882** |
| mist sprites | 0.0244 → **0.0021** | 0.0193 → **0.0049** |

Controls on the same frames: the organism's shed **constant 2.4000**; the ring
and the hero's ground network within run-to-run variance of before.

**B1 restated for the sky** — the horizon may never be brighter than the lens
has earned, `sky ≤ smoothstep(max(pure, held) / SKY_FULL)`, worst over every
presented frame of a real wrap:

| | before | after |
|---|---|---|
| down-wrap | **+0.9495** | **+0.0000** |
| up-wrap | **+1.0000** | **+0.0000** |

The bed's own B1 is **+0.0000** in both directions before and after — untouched.

### 41.1 One pixel measurement that did not work, reported as such

The intended sky-region pixel trace (upper third of the frame, `readPixels`
straight after `composer.render()`) came out **7% → 7%** down and **12% → 11%**
up, i.e. showing nothing. That is a bad instrument, not a null result: at these
camera poses the epilogue's horizon and mist sit near **mid-frame**, not in the
top third, so the band is dominated by background and by the hero's own cap and
spore trail. The isolating measurement — double-rendering each shutter with the
sky group suppressed — could not be completed either: seven renders per shutter
stalled rAF hard enough that the lap did not travel (camera parked at the hero
pose from 900 ms). The claim therefore rests on the driver trace, which is exact
and which these materials multiply directly into `gl_FragColor`, plus the frame
strips. **A properly-banded or single-key contribution measurement is the one
thing this section is short of.**

## 42. Gates

* **Matched before/after driver traces, both directions, all three sky layers** —
  §41, real wheel path, tracer registered last.
* **B1 for the sky**, both directions — §41.
* **Frame strips both ways, offset against no-offset**, nine shutters each,
  shot in-page off the drawing buffer immediately after `composer.render()` —
  the basis for §40's decision.
* **Nav jumps into and out of the epilogue** by a real pointer press on the
  shipped rail anchor, 160 frames: worst `|bed − eff|` **0.000e+00** and worst
  `|sky − eff|` **0.000e+00** — no ordinary jump has room, so both are the
  shipped scalar bit for bit — and **0 frames** with either lit while the camera
  is above x −4.6.
* **Scroll battery:** `E1 −4.60e−4`, `E2 1.0000`, `E3 1.0320`, `R1 0.260000`,
  `R4 overshoot 0.00e+0`, `R5 0.000000 / 0.970000 / 1.0000`,
  `R6 off-anchor stops: none`. (`E3` is a time-sampled drag and reads 1.0000 on a
  quiet rig; 1.0320 is the 28 fps window, not this change — nothing here can
  affect scroll distance accounting.)
* **Console: 0 entries, 0 warnings, 0 errors** over a twelve-leg gestured ride
  containing **both wraps** (`0.97 → 0` and `0 → 0.97`). Two legs under-shot
  their rest at 28 fps; `R6` on its own driver reports `off-anchor stops: none`,
  which is where that property is actually gated.
* **`capture.py --check` PASS, worst MAE 0.00/255** across all ten frozen
  references.
* **The lap has not moved under `a0a89f8`'s new denomination** — 76.40–76.42
  units over 3881–3974 ms against §31–36's 76.42 u / ~3.86 s. The wrap's camera
  motion is a `directJumpTo` blend on `WRAP_EXTRA_S`, not a commit glide, so the
  px/s work does not reach it. **Every number in §31–36 therefore stands as
  published**; none is re-baselined.

## 43. Residuals

* **`revealgates.js` G1 and G2 FAIL on `a0a89f8`, before this change and not
  because of it.** Measured on clean HEAD: `G1 3.06e-1`, `G2 8.27e-1` against a
  bit-exact requirement; with this change present, `3.15e-1` / `8.88e-1` — the
  same numbers to run-to-run variance. G1's premise is what moved (a scrub now
  contains a glide, during which the driver legitimately lags), but **G2 is the
  PLACEMENT gate** covering `?p=`, `?pose=` and deep links, and it wants a real
  answer rather than a restatement. Raised separately; not touched here.
* §41.1's missing pixel isolation.
* The bed and the sky are one frame behind the bodies (§36) — unchanged.
* §36's other residuals stand.
