# 23 — The side navigator

**Requested:** Hannah, 2026-08-07. **Built:** same day.
**Files:** `journey/symbols.js`, `journey/rail.js`, `journey/site.css`,
`journey/ui.js`, `journey/journey.js`, `static/index.html`, `tools/capture.py`,
`hero.css` (one comment), `journey-v6-plan/map/symbol-sheet.html`.

> "Could you replace the 'Mission / Inspire / Connect / Own' navigation at the
> top with a more elegant section navigator positioned along the side of the
> page? By default, it should display a simple symbol representing the section
> the user is currently viewing … When the user hovers over it, the navigator
> should expand to reveal symbols for all of the main sections … The expanded
> state should also include a prominent menu button … It would effectively
> serve as the simpler, HTML-based version of the journey."

---

## 1. What was removed

| Gone | Was |
|---|---|
| `.j-nav` / `.j-navlink` | Built by `journey/ui.js` into the hero's own `<nav>`, between the wordmark and the 2RP / Discord pair. ~40 lines of construction, ~30 lines of CSS, a mobile band under the header, a `::before` touch-target rule, a reduced-motion line. |
| `.chapters` (Tier 3) | The same four links in `static/index.html`'s fixed header, with their own `::after` underline rule and a `@media` reflow. |

`grep -rn "j-nav" --exclude-dir=archive` now returns only prose: five comments
that name the thing they replaced, plus one line in `EXECUTION.md`'s history.
No selector, no class, no dead rule. `journey.js`'s `debugState()` read
`.j-navlink.active` and now reads `.j-rail-slot.active .j-rail-item`.

The **wordmark and the 2RP / Discord pill pair are untouched.** They did not
move; they simply have the top rule to themselves now, which is what let the
mobile header stop wrapping to three lines (see §7).

---

## 2. The symbol language

`journey/symbols.js` is the single source. One rule governs every mark:

> **Draw the thing that chapter's camera is actually looking at, reduced to the
> fewest hairlines that still name it.**

The source of truth for each derivation is the shipped still in
`static/captures/` — not a mood board and not an icon set. If a chapter is
restaged, its still moves and its mark should be **re-derived from the new
one**, not patched.

| id | mark | derived from |
|---|---|---|
| `mission` | **The specimen, whole.** Cap, gill rim, a two-walled stipe flaring into the floor, ground line. | `mission@1440x900` — one mushroom standing on the mycelial ground. The only mark that draws a complete organism, because Mission is the only chapter that frames one. |
| `inspire` | **The cap releasing.** A deeper dome, its gill rim, and five spores climbing off the left shoulder, thinning as they go. No stipe, no ground. | `inspire@1440x900` — the same cap with a spore plume leaving it. The chapter's own copy: "push open models beyond their expected limits … turning breakthrough ideas into a thriving commons." Its frame has already left the stipe and the ground behind. |
| `connect` | **The ground network.** A horizon hairline, one meandering strand with two branches climbing toward it, three filled hubs on the strand. | `connect@1440x900` — horizon high, lower frame given to a lit ground plane with three bright hubs (ADOS, Hivemind, Discord) strung on strands running to the edges. The horizon is what keeps this from being a generic node graph: the network here is a **place**, lying on the ground. |
| `owned` | **The root crown and the colony.** One crown node, four strands, four bodies at their ends. | `owned@1440x900` — a single bright crown at the top of frame raining strands down into an arc of lit bodies. The strands **terminate in** the bodies rather than stopping short of them, because that adjacency is the claim: 100% shared, granted downward, split between groups. |
| `final` | **The field.** Mission's specimen, three times, at three sizes, on one ground line. | `final@1440x900` — many mushrooms of different sizes on one plain. Deliberately Mission's own mark multiplied: "so one thriving ecosystem becomes many." The epilogue is the mission having worked. |
| `menu` | **The contents.** Three filaments leaving three nodes. | Not a scene — the one control glyph here. Drawn in the site's own node-and-filament vocabulary rather than as a hamburger. |

**Craft notes.** 22-unit box drawn at **24px**, so a unit is about a pixel.
Hairline paths at stroke-width 1 with round caps; anything the scene renders as
a lit point (spores, hubs, bodies, the crown) is a **filled** circle, so the
marks read as light on dark rather than as outline drawings. Dot radii are
floored near 0.6 — the first pass used radii down to 0.28 and those spores
simply did not rasterise. The first Inspire dome was also too shallow and read
as a hill; without a stipe under it the silhouette has to carry "mushroom"
alone, so its control point went from `Q11 8.2` to `Q11 1.8`. Colour is
`currentColor` throughout: a mark's state is set by the colour of the control
it sits in, and `symbols.js` knows nothing about hover, focus or "current".

`journey-v6-plan/map/symbol-sheet.html` renders every mark at 108px and at
24px, lit and dim, against the site's ground — the look-at sheet these
decisions were made on. Not shipped, not linked from the site.

---

## 3. The three states

The rail is fixed to the **left** flank, vertically centred.

**Why left.** The right is spoken for: `.j-card` is fixed at `right: 3.4vw;
top: 50%` and is 400px wide at 1440 — exactly the band a right-hand rail would
want — and the node popover prefers the right of its chip. The left carries the
wordmark at the top and then nothing until `.pos-bottomleft` at the bottom, so
a vertically centred band on the left is the one stretch of frame no other
element claims at any chapter.

### Resting

One symbol: the mark for **`chapterAt(p)`** — the scene actually on screen.
Everything else in the rail is `opacity: 0` with `pointer-events: none`, so the
only live surface on the flank is that one 44px tile. It is gold at 0.82 alpha
with a soft drop shadow — lit, not loud.

Because the slots are laid out in manifest order, the resting symbol's vertical
position tracks the journey: Mission near the top of the band, Owned near the
bottom. That is a free reading of progress that costs no ink.

### Expanded — hover, keyboard focus, or a first touch

Every slot's symbol and name arrives, the current one wearing the reticle, and
the menu control arrives last. **Nothing moves to get there.** The slots are
always in their final positions; expanding is the rest of them turning on
*around* the one already showing, so the symbol under the pointer does not
shift by a pixel. The tiles are 44px and **abut** — no dead space between them
— so a pointer travelling from the resting symbol to a neighbour can never fall
out of `:hover` and collapse the rail under itself.

Motion is the hero's `.co` callout boot (`hero.css`), the same family the node
popovers took in `d1ecc23`:

| hero | here |
|---|---|
| `co-on` / `tag-in` | symbols and names fade up in rail order on a per-slot delay (`--k`), names arriving from a wider letter-spacing (0.30em → 0.24em) exactly as `.co .tag` does |
| `.co .ck` | the current section wears the **reticle**: four corner brackets locking in clockwise (tl → tr → br → bl, 0.05s apart) with the same overshoot curve. "This is the one you are on" and "this is the label you are pointing at" are the same statement and should not have two drawings. |
| `lead-draw` | the menu control's three filaments draw themselves left to right, last of all |

A local scrim fades in behind the rail so names stay legible over a bright
chapter. It is a horizontal gradient with a **vertical mask** — a scrim with
hard top and bottom edges reads as a panel laid over the composition, and this
should read as the frame simply getting darker where the rail is. The mask
feathers over a fixed 34px and the box extends 2.8rem past the first and last
tile to give that feather room; a percentage feather was measured at 375×812
putting MISSION and EPILOGUE outside the dark and straight onto the chapter
copy.

### Menu open

A real modal dialog holding the overview. See §5.

---

## 4. The epilogue

`route.js` gives Final a route and **no nav entry**, deliberately, and
`navChapterAt(p)` keeps the last nav'd chapter current through it. Two
consequences, both taken on purpose:

* The rail's **links and its `aria-current` are unchanged** by the epilogue —
  four links, Owned current, exactly what the manifest says. A fifth link would
  contradict `route.js`.
* But the **resting symbol is `chapterAt(p)`, not the current nav entry**, so
  out in the field the rail shows the field. That is the literal reading of the
  brief ("a symbol representing the section the user is currently viewing"),
  and it is the one place the two rules differ. The epilogue's slot is a plain
  `<span>`, not a link, and is `aria-hidden`: it is a visual echo of where the
  camera is.

The **a11y statement about the epilogue is made in the menu**, which lists it as
a real entry ("05 · Epilogue") and marks it `aria-current` when you are in it.
So `now` (the scene) and `active` (the nav entry) each have exactly one surface
that expresses them, and neither rule is bent.

This is derived, not special-cased: the rail builds an echo slot for *any*
manifest chapter with `nav: null`, wherever it sits.

---

## 5. The menu, and where its content comes from

A left-edge panel, `min(27rem, 92vw)`, opaque `#0b0702` over a 0.62 scrim.
(Opaque deliberately: at 0.97 the hero's wordmark ghosted through the panel's
own heading, and the obvious fix — `backdrop-filter` — asks for a full-frame
blur every frame over a live WebGL scene that is already the page's whole frame
budget.)

Every string is from `content/content.js`:

| element | source |
|---|---|
| title | `Banodoco` — the same wordmark `ui-footer.js` already uses as its heading, not new copy |
| lede | `chapters.mission.sub` — the site's own one-line summary of itself; it is the hero's support line and already the `<meta name="description">` of `static/index.html` |
| item number | derived from manifest order (`01`…`05`), matching the hero callouts' `no` and the static tier's eyebrows |
| item title | `chapters.<id>.nav` |
| item line | `chapters.<id>.heading` — one short statement per section, which is exactly what an overview wants. The `sub`s are the long form and belong to the chapters themselves. |
| "Elsewhere" | `footer.links` + `footer.social` |

### Two gaps, flagged rather than filled

1. **There is no dedicated site-overview string in `content.js`.**
   `chapters.mission.sub` is re-used as the lede. It is the right sentence and
   it is already load-bearing in two other places, but if Content/Ops wants a
   distinct one it is one key.
2. **`chapters.final.nav` is `null` by design**, so the epilogue's menu entry
   has no authored title. It is titled with the structural word **"Epilogue"**,
   which is `route.js`'s and `10-chapter-final.md`'s own word for that chapter,
   not invented copy. Its heading and its route are real content.

Nothing else was written. No placeholder prose was added anywhere.

---

## 6. The a11y model

* **Landmark.** A real `<nav aria-label="Journey sections">` on `<body>`. It is
  a *sibling* of the hero's `<nav>` rather than a child of it — the old nav
  nested inside, which is why it had to fight the hero's bare `nav {}` rule for
  its padding and its entry animation. The rail resets `display`, `padding` and
  `animation` for the same reason (`animation: none` is load-bearing: fill-mode
  `both` would pin opacity at the animation's end value and light the rail at
  the Mission pose).
* **Real controls.** Four `<a href="#/chapter">`; a `<button type="button">` for
  the menu; `<a href>` for every menu entry. No div with a click handler
  anywhere. Deep links and "open in new tab" work.
* **Expanded state is not hover-only.** `:hover`, `:focus-within` and a
  touch-armed class are three ways into the same state. The first Tab into the
  rail expands it, and the tab order is
  `skip-link → wordmark → 2RP → Discord → Mission → Inspire → Connect → Owned →
  Menu → chapter actions → hotspots` (verified with real Tab presses). The
  epilogue echo is a `<span>` and is correctly skipped.
* **Touch.** First tap expands, second acts — the model this site already uses
  for its hotspot chips, decided per *interaction* from the live `pointerType`,
  never from a capability sniff at boot, so a hybrid machine gives its mouse the
  one-click behaviour and its finger the two-tap behaviour in the same session.
* **`aria-current="true"`** on exactly one rail link at all times
  (`navChapterAt(p)`), and on exactly one menu entry (`chapterAt(p)`).
* **Focus.** `:focus-visible` gets the journey layer's shared gold ring; the
  rail and menu were added to that rule rather than growing their own.
* **The menu is a real dialog:** `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby`, focus moved to the close button on open, **Tab trapped**
  inside (verified: 14 Tabs cycle the 11 controls and wrap; Shift+Tab from the
  first lands on the last), **Escape closes and focus returns to the menu
  button**, and the rail goes `inert` while it is open.
* **Input ownership.** The menu scrolls, so it registers with
  `claimInput(menu, { modal: true })` — `scroll.js` then never treats wheel or
  touch inside it as travel and never `preventDefault()`s them, so it scrolls
  natively and the journey cannot be scrubbed out from under the reader. Travel
  keys are off the table while it is open.
* **No duplication.** The existing skip link and the polite live region in
  `ui.js` are reused, not re-created; `rail.js` takes the announce function as
  a parameter.
* **`prefers-reduced-motion`.** Every rule in the component is a transition
  ending at the element's resting style, so the reduced-motion block switches
  them all off (durations *and* the reticle's cascade delays) and the three
  states are intact and instant. Verified by lifting the whole
  `@media (prefers-reduced-motion: reduce)` block out of its query and applying
  it unconditionally: the expanded rail is complete, reticle already locked in,
  menu filaments already drawn, nothing half-finished. `closeMenu` also skips
  its fade timeout under reduced motion.

---

## 7. Mobile (375×812)

The rail was the **fix** for this width's original problem, not a new victim of
it. The old `.j-nav` sat in the hero's one flex row (wordmark | chapters |
2RP+Discord), which added up to ~556px at 375 and pushed the last chapter entry
and both hero CTAs off-screen entirely; it needed a fixed full-width band of its
own to be reachable at all. A side rail is off that row by construction, so the
hero row is back to wordmark + CTAs (~315px, fits) with **nothing lifted out of
it**, and the extra band under the header is gone from both tiers.

What phone width does change is the expansion. There is no hover, so it is
always a deliberate tap, and there is no width left for the band to sit *beside*
the chapter copy — so while it is open it stops pretending to be a scrim and
becomes an **opaque panel**. (At 0.96 alpha the copy ghosted through the names;
measured, "Learn more" was still legible under CONNECT.) The menu is 92vw.

Deliberately **not** solved here: the broader mobile layout pass.

---

## 8. The static tier

`static/index.html` carries a hand-authored twin of the rail — same three
states, same symbols, same left gutter. The symbol geometry is authored (the
page must draw it with scripting disabled) and the page's existing **drift
guard** was extended to import `SYMBOLS` / `buildSymbol` / `signature` from
`journey/symbols.js` and assert the authored SVG matches path-for-path and
dot-for-dot, plus a coverage check that every chapter has a mark. Exactly the
arrangement the copy already has with `content.js`. Current run: **128 strings
and 11 symbols checked, zero symbol drift.**

Three deliberate divergences, each forced by this page's own contract:

1. **No reveal latch.** Tier 1 keeps the rail dark at the Mission pose to
   protect the captured reference frame. There is no captured frame here — the
   still *is* the capture — so the rail is simply always present, as
   `.chapters` was.
2. **The menu is a `<details>`.** Tier 1's is a modal dialog with a focus trap,
   which needs script. A `<details>`/`<summary>` is a real disclosure with real
   keyboard semantics and no script at all. When it opens, the `<details>`
   element **itself** becomes the fixed full-height panel and its `<summary>`
   becomes the panel's header row — which is what keeps a no-JS visitor's way
   out visible and clickable. Script adds Escape, focus return, scrim-click and
   close-on-navigate *on top of* a menu that already works without it.
3. **No touch-arming branch.** Expansion is `:hover` / `:focus-within` only, so
   a tap on a phone follows the link under it — the right trade for a page whose
   whole content is one scroll away below.

**No-JS.** `.now` and `aria-current` are the only parts that need script, and
without them the resting state would be an empty rail — the one way this
component could have broken the page's "complete with no JS at all" promise. So
under `.no-js` the rail ships **expanded**: every section visible, named and
linked, which is the honest fallback for a navigator that cannot know where you
are. Mission is also authored `class="rail-slot now"` so the first paint is
right before the scroll observer speaks. (The collapse rules needed a
`body:not(.no-js)` guard — they are far more specific than the `.no-js`
overrides, and without it a scripting-disabled visitor would have seen the whole
rail and been able to click none of it.)

**One layout change beyond the component:** `.chapter` gained an 11rem left
gutter (4.2rem at ≤900px). Tier 1's chapter copy sits out in the middle of a
full-bleed scene and never comes near the rail; here the content is a document
flush to the page, so the expanded rail lay across the start of every line.
Giving it a lane is cheaper and cleaner than making the scrim opaque enough to
win a fight with the panel underneath it.

**Gotcha, recorded because it cost time:** the rail was originally centred with
`top: 50%` + `translateY(-50%)`. A transform on an ancestor becomes the
containing block for `position: fixed` descendants, so the static tier's menu
panel — which lives *inside* the rail — was positioned against the 260px rail
instead of the viewport and rendered as a clipped stub. Both tiers now centre
with flex and no transform.

---

## 9. p = 0, and whether `mission` moved

### `mission` did NOT move. Nor did any other reference.

`python3 tools/capture.py --check`, frozen mode, all ten golden/size pairs:

```
mission@1440x900  MAE 0.00/255   0.0% px >8   [within]
mission@430x932   MAE 0.00/255   0.0% px >8   [within]
inspire, connect, owned, final … all 0.00
owned@430x932     MAE 0.04/255   0.0% px >8   [within]
worst MAE 0.04/255. Thresholds warn>0.50 fail>1.00. PASS
```

The rail is invisible at the Mission pose and fades in with the first travel,
as the old nav did. Two deliberate differences:

* **The reveal LATCHES.** The old nav keyed purely off `p > 0.004`, so
  navigating *back* to Mission — whose rest is p = 0 — took the whole nav off the
  page and left the visitor somewhere with no way out but the browser. A
  component whose brief is "always accessible" cannot do that. The latch is set
  the first time p leaves the Mission pose and never cleared: a cold load at
  p = 0 is untouched, a **return** to p = 0 keeps the rail. Verified — after a
  full ride, `journey.scrollTo(0)` leaves the rail at opacity 1 showing
  Mission's symbol.
* **It is NOT `inert` at p = 0.** The old nav was, to keep four invisible links
  out of the first Tab (a11y debt #1). Here the rail's own `:focus-within`
  brings it up, so the first Tab lands on something that is *on screen by the
  time it is focused* — the skip-link pattern, not the invisible-target bug.
  The captured frame has no focus, so it is unaffected.

`tools/capture.py`'s `HIDE_SELECTORS` gained `.j-rail`, `.j-menu` and
`.j-menu-scrim`. The old nav was inside `.ui` and covered by the first entry;
the rail is a sibling landmark on `<body>` and needed naming. Tier 3 renders its
own copy of the rail as real HTML over the still — exactly as it does for the
nav row this replaced — so a baked-in one would double it.

---

## 10. Gate results

| Gate | Result |
|---|---|
| References | **PASS.** 10/10 within threshold, worst MAE 0.04/255. `mission` 0.00 at both sizes. |
| Screenshots — 1440×900 | resting / expanded / menu ✓ |
| Screenshots — 1280×800 | resting / expanded / menu ✓ |
| Screenshots — 375×812 | resting / expanded (touch-armed) / menu ✓ |
| Keyboard | Full tab order verified with real Tab presses; rail expands on focus with a visible ring; menu trap cycles 11 controls and wraps both ways; Escape closes and restores focus to the menu button. **Caveat:** Enter/Space *activation* could not be exercised — this harness's synthetic key events arrive un-prevented (`defaultPrevented: false`) but do not synthesise the platform click, which is a harness limit, not a page one. The control is a plain `<button type="button">` with a click listener, the same pattern the chapter action pair already ships. |
| Reduced motion | **PASS.** Whole `@media` block lifted out of its query and applied unconditionally: all transitions `none`, all delays `0s`, all end states correct (slot 1, name 1, reticle 1, menu dash 0). |
| Active tracking | **PASS.** 101-point placeAt scrub *and* a full rAF-driven ride (0→1→0, 420 steps each way) through the real scroll surface. Transitions at p 0.14 / 0.38 / 0.60 / 0.85; `now=final current=owned` through the epilogue; exactly one `now` and one `aria-current` at every sample; zero anomalies. |
| Navigation | **PASS.** 45 trips — every rail entry from every section (20) and every menu entry from every section, epilogue included (25). All landed on `restProgress(target)` with the right hash and the right `aria-current`. |
| Jump behaviour preserved | Nav click still arms the copy entry (`ui.arrivingChapter === 'owned'`) and still runs the cylindrical arc blend (0.084 of 1.298 world units in the first two frames, not a snap). `043a1f2` and `d1ecc23` both intact. |
| Console | **CLEAN** over the full ride, the 45 navigation trips, and menu open/trap/close. Zero errors, warnings, throws or rejections. |
| Old nav removed | **PASS.** `grep -rn "j-nav" --exclude-dir=archive` returns prose only. `.chapters` gone from the static tier including its dead click-handler selector. |
| Tier 3 | 128 strings + 11 symbols checked; **zero symbol drift**; no-JS fallback verified. |

---

## 11. Residuals

* **Five pre-existing Tier-3 content-drift errors** (`chapters.owned.claims.*`
  ×4, `chapters.final.heading`) were already present at `1d0f5e0` and are
  untouched by this work — the Owned claims array was deliberately deleted from
  `content.js` on 2026-08-05 and the Final heading overridden, and the static
  page was never updated. Flagged as a separate task; do not fold it into a
  navigator change.
* **`content.js` has no dedicated site-overview string** and no title for the
  epilogue. See §5.
* **The mobile pass is still owed.** The rail is in a good state at 375×812 and
  the header no longer overflows, but the broader mobile layout task is not
  touched here.
