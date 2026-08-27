# One trace — a wheel tick, end to end

**What this is.** One physical wheel notch, followed from the window listener that
receives it to the DOM write that answers it, with `file:line` at every hop. The
elegance program's criterion 9 is *"a reader can follow one wheel tick end to end
without leaving the pipe."* This page is that claim turned into an artifact.

**How to use it at a gate.** Re-walk it. Open each file at the named line and check
that the hop still reads as written. **A hop that no longer matches source is a red** —
either the code moved and this page is stale, or the pipe grew a branch that is not
described here. Both are findings; neither is allowed to pass quietly.

Verified against the working tree on **2026-08-26** (GATE-F, commit `9614625`). Line
numbers are the first line of the construct named, not of its comment block.

**GATE-F re-walked all nineteen hops and found sixteen of them stale.** That is a red
under this page's own rule, and it is the *expected* red: §"Where this page will next be
wrong" predicted it, naming U05, U06, N01 and O01. Only four citations survived the run
untouched — `journey/state.js:96` and `:115`, `journey/director.js:326`,
`journey/frame-application.js:2`, and `journey/ownership.js:82`. Every other hop moved,
none of them because the pipe grew a branch: the shape below is the shape that was
walked in August, with the same nineteen hops in the same order. What moved was line
numbers, plus **one structural change that is a real new hop** — step 19 now fans into
`journey/ui.js`'s fixed-order owner composition, which is what U05/U06 landed and what
this page was told to expect.

Earlier walks, kept for the record: TRACE-01 verified the page on 2026-08-22; hops 1–10
were re-walked on 2026-08-23 after E02 shifted them by 1, 7, 12 and 5 lines.

---

## The pipe

```
 1  window 'wheel'          journey/transport.js:130     capture, non-passive
 2  ownership gate          journey/transport.js:57      ownerOf(e.target) -> the card scrolls itself
 3  normalise + push        journey/transport.js:58-62   deltaMode -> px, then host.push(d,'wheel')
 4  the scroll model        journey/scroll.js:514        push(dpx, kind, repeat, opts)
 5  virtual surface         journey/scroll.js:1175       surf = clamp01(pAt(v) + carry)
 6  road geometry           journey/road.js              pAt / scrollFor / lengthAtP (bound at scroll.js:105)
 7  the frame               journey/journey.js:1228      spineFrame(t, dt)
 8    scroll.update(dt)     journey/journey.js:1233      the servo runs; `progress` becomes readable
 9    journey.setProgress   journey/state.js:96          rawP = clamp01(v)
10    p = journey.update()  journey/state.js:115         the published progress
11  applyFrame(p, dt)       journey/journey.js:1236
12    director pose         journey/journey.js:1067      director.apply(p, dt) -> director.js:326 poseAt()
13    jump blend composes   journey/journey.js:1071      transition.stepCamBlend(dt)
14    THE PUBLICATION       journey/journey.js:1106      framePublisher.publish({...})
15      pose frozen         journey/frame/publication.js:147  a COPY of position/target/fog, Object.freeze
16    chapter consumers     journey/journey.js:1161      applyChapterFrame(...)
17      per chapter         journey/frame-application.js:2
18    surface consumer      journey/journey.js:1200      ui.update(p, ch.id, camera, dt, {...})
19      the DOM answers     journey/ui.js `update()`    update(p, chapterId, camera, dt = 0, opts)
20        the owners run    journey/ui.js `update()`    ten owner calls, fixed order (U05/U06)
```

---

## The hops, in prose

**1–3. The event.** `journey/transport.js:130` binds `wheel` on `window` with
`{ capture: true, passive: false }`. Capture so the journey sees the notch before any
element handler; non-passive so `preventDefault()` is available, which is what stops
rubber-band and back-swipe. `onWheel` (`transport.js:53`) does three things and no
more: asks `host.ownerOf(e.target)` whether a **registered input owner** covers the
target — the open dialog card and the bottom sheet register themselves, and if one
does the handler returns without travelling *and without preventing default*, so the
panel's own native scroll runs (`transport.js:57`); converts `deltaMode` 1 and 2 into
pixels (`:59-60`); and hands the pixels to the model (`:62`).

> The ownership registry is `journey/ownership.js:82` `ownerOf`, re-exported through
> `journey/scroll.js:81` as `claimInput` / `releaseInput`. `journey/ui.js` claims while
> the card is open. This is the single mechanism that replaced a hard-coded class-name
> guard in `ui.js`; the module-scope note headed `NOTE (a11y debt #1, closed)` records why.

**4–6. The scroll model.** `push` (`journey/scroll.js:514`) is the only door into the
model. It classifies the pulse (`wheel` has no `wheelstart`, so the model remembers the
*shape* of the pulse — `scroll.js:219`), banks stall discount, and moves the
virtual coordinate `v`. Displayed progress is derived, not stored: `scroll.js:1175`
computes `surf = clamp01(pAt(v) + carry)`, where `pAt` comes from `journey/road.js`
through the destructure at `scroll.js:105`. **The road owns the geometry; the model
owns the ride.** That separation is why a re-timed route needs no change here.

**7–10. The frame.** `spineFrame` (`journey/journey.js:1228`) is the animator. Four
statements, in this order and no other: land a fully rewound wrap first
(`:1232`), run the servo (`:1233`), hand the servo's answer to the route state
(`:1234` -> `journey/state.js:96`), and read back the published progress
(`:1235` -> `state.js:115`). Nothing else writes `p`.

> **`state.js` does not ease.** Hop 10 said "the eased, published progress" until
> 2026-08-23, and it had been wrong since the second lag was removed: `update()` is
> `p = rawP` and returns. The smoothing lives once, in `scroll.js`, at `SMOOTH_K` with
> a speed limit and a persistent rate — which is the whole point of the note headed
> `SMOOTHING LIVES IN ONE PLACE, AND IT IS NOT HERE` above `update()`. One adjective
> in the page that exists to forbid stale words.

**11–15. Pose, then publication.** `applyFrame` (`journey.js:963`) composes the camera
in one order and only one: `director.apply(p, dt)` first (`journey.js:1067`, calling the
pure `poseAt()` at `director.js:326`), and then a jump's blend composes **onto that
written pose** (`journey.js:1071`). The comment at `:1061-1064` records why it cannot be
the other way round — writing the parked destination first advances handheld state twice
and lets two camera clocks disagree inside one frame. **Then, and only then, the pose is
published** (`journey.js:1106`). The publisher copies position, target, fov, forward
vector and fog out as numbers and freezes them (`frame/publication.js:147`, the
`cameraPose` freeze, wrapped by the whole-frame freeze at `:164`), so every downstream
reader is handed the pose *this frame will actually present* rather than a live object
that a later writer could still move. The comment at `journey.js:1087-1096` records the
measurement that forced the position of this line: taking it at the top of `applyFrame`
inverted the fog correction and rendered the Mission pose 3.6/255 brighter on the click
frame.

**16–17. The world.** `applyChapterFrame` (`journey/frame-application.js:2`) fans the
frame out to the mounted chapters, each behind its own runtime interface. Called at
`journey.js:1161`, and — note the D1 barrier comment at `:1114-1120` — every reader from
`journey.js:1106` down takes its progress, delta and glide state off `frame`, never off
the loose `p`/`dt`/`frameP`/`travelP` that were the publication's inputs.

**18–20. The surface.** `ui.update(frame.stateP, ch.id, sceneApi.camera, frame.dt, {...})`
at `journey.js:1200`, inside `guarded('ui', ...)`. The options object carries exactly four
values — `cameraStateDisagree`, `railWrap`, `railFlight`, `travelP`. `journey/ui.js`'s
`update()` receives them and — this is hop 20, the one U05 and U06 added — **fans them
into ten owner calls in a fixed order**, which is the composition this page was told to
expect: `rail.update` → `cardTier.syncRailVisibility` → `copy.step` → `chips.measure` →
`projection.publish` → `railMask.refresh` → `chips.place` → `zones.frame` →
`popover.frame` → `cardTier.frame`. `update()`'s own comment above the signature records
why `measure` and `place` are separated by the rail's read: both are reads, and the
barrier between the read side and the write side runs between them.

---

## Two things a reader should notice, because they are the pipe's real edges

**`guarded()` swallows throws (S-1).** Every consumer at step 16 and 18 is wrapped, so
an exception inside `ui.update` does not stop the frame — it silently skips the rest of
that consumer's work for that tick and leaves whatever state it had half-written.
**A throw here is permanent state loss with no visible error.** TRACE-01's recorder
therefore recorded a throw as a `throw` record in the stream rather than letting the run
look merely quiet. *That recorder retired at GATE-F* — it lives, runnable, at
`docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/trace/world.mjs`,
`createClock`. **The hazard did not retire with it**, which is why this paragraph stays.

**One projection bypasses the published pose.** The UI projects world points through the
injected jitter-free `projectStable` everywhere except one site: `projectRaw`, minted at
`journey/ui/frame-projection.js:78` as THREE's own `v.project(camera)` and consumed only
by the hover zones (`journey/ui/hover-zone.js:241`, guarded by the note at `:212` that
says in capitals it is deliberately *not* the steady projection the chips use). U05 moved
this site out of `ui.js`'s `addHoverZone()` into its own module and its own named export;
what did **not** change is that this is the one place the pipe's "read the frame, never
the live object" rule is knowingly relaxed.

---

## Why the `ui.js` hops are cited by SYMBOL and the other forty are cited by line

Every hop on this page used to carry a `file:line`. Four of them named `journey/ui.js`,
and all four were **already stale** when U04 opened them: U03 had renumbered the file
and `ui.js:2521` pointed at nothing in particular (D154). That is not bad luck. `ui.js`
is the one file six consecutive orders rewrite, so a line-keyed citation into it is
guaranteed to rot and be re-baselined once per order — the churn D54 and D64 name, and
the same reasoning that made `test-chapter-contract`'s QA-05 row drop its line numbers
rather than bump them.

So the four `ui.js` hops now cite **symbols** — `update()`, `addHoverZone()`, a note by
its heading. A symbol moves with the code it names.

**The other forty hops keep their line numbers deliberately.** They point into files no
current order is rewriting, where a line number is more precise than a symbol and costs
nothing to keep true. This is a targeted change to the churning citations, not a
stylistic sweep.

## Where this page will next be wrong

**The prediction the last version of this page made came true, and the page paid for it.**
It said steps 18–19 would gain a hop when U05 and U06 landed, and that hops 1–17 should
re-walk clean until N01 and O01. Both halves happened: step 20 exists now, and *sixteen of
the nineteen citations below step 8 had rotted* by the time GATE-F walked them — because
N01, O01, B01, the defect wave and the disposal removal all landed in between. The page
was not wrong about the pipe. It was wrong about line numbers, sixteen times.

**So the honest forecast is about the citation style, not the pipe.** Thirty-six of the
citations on this page are `file:line` into files that six orders have now each rewritten
at least once, and every one of them rotted silently — nothing reds when a line number in
a markdown file stops pointing at its construct. The `ui.js` hops, which cite **symbols**
for exactly this reason (see the section below), survived every one of those orders
untouched. **If this page is ever re-walked and found stale again, the fix to consider is
not better line numbers — it is fewer of them.**

Structurally, hops 1–20 describe the pipe as it ships at `9614625`, and no order in the
remaining programme touches production. The next thing that moves them is D1 (finish the
frame publication) or D2 (viewport-mode authority), both of which are handed over rather
than scheduled — and both of which would land squarely on hops 11–15.
