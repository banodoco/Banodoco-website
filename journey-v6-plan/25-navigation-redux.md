# 25 — Navigation redux: the right-side navigator

**Requested:** Hannah, 2026-08-09. **Built:** same day.
**Supersedes the surfaces of:** 23-side-navigator.md (the left rail — the
component survives, relocated and re-formed) and `journey/ui-footer.js` (the
bottom "Site Information" band — removed entirely).
**Files:** `journey/rail.js`, `journey/site.css`, `journey/ui.js`,
`journey/ui-index.js` (one bugfix), `journey/state.js`, `journey/journey.js`,
`journey/constants.js`, `journey/route.js`, `journey/scroll.js`,
`journey/seams.js` (comments), `content/content.js`, `static/index.html`,
`tools/capture.py`, `static/captures/final@*` (deliberate re-baseline).
Deleted: `journey/ui-footer.js`.

> "Create a small, persistent navigation control attached to the right side of
> the viewport … At rest, it contains two symbols/icons: [the current section]
> and a separate menu symbol positioned beside it … hovering over the
> current-section symbol … expand[s] to reveal the symbols for all major
> sections … Hovering an individual symbol reveals the name of that section …
> Clicking the menu symbol should open a larger navigation panel that slides
> in from the right side of the screen. This replaces the existing Site
> Information section entirely."

The one component now does the three jobs the brief names: *Where am I?* (the
resting mark), *Where else can I go?* (the fan), *What is everything on this
website?* (the panel).

---

## 1. The component and its three states

### Resting — two symbols

The mark for `chapterAt(p)` — the scene actually on screen — sits at the
vertical centre of the right edge, with the menu mark directly below it, past
a short hairline. **The current mark is always in the same place.** The first
build laid the slots out in a fixed stack and lit one, so the resting symbol
wandered down the band as the ride progressed; the redux anchors the geometry
on the current mark instead, because a two-symbol persistent control has to
read as an *instrument*, and an instrument does not wander. (What was lost —
the stack position as a free progress reading — is carried by the fan itself:
open it anywhere and the stack hangs from the current mark asymmetrically,
which says the same thing.)

### Expanded — the fan

Hover on the section mark, keyboard focus anywhere in the rail, or a first
touch. The other sections' marks **fan out from behind the current one** to
their manifest positions — slot *i* travels to `(--i - --cur) * 44px` from
the anchor — and the menu mark slides down to hold the foot of the stack,
past its hairline. The mark the visitor is pointing at does not move by a
pixel; the previous build's law ("nothing moves") survives as "the thing
under the pointer never moves", which is the half of it that was load-bearing.

Names are **revealed per mark** (the brief's own words), on small scrim pills
to the left of the stack, arriving from a wider letter-spacing exactly as the
hero's `.co .tag` does. The current entry wears the hero callouts' reticle.
The menu mark's filaments draw themselves (`lead-draw`) once, as the rail
first reveals. Stagger is by *distance from the current mark* (`--d`), not by
list order — the fan opens outward from where you are, which is the spore
gesture, not a spreadsheet's.

The fan opens from the **list's** hover only: pointing at the menu mark shows
its name but does not unfold the sections, because the brief calls it "a
separate menu symbol" and the two resting controls should answer separately.
Once open, the fan stays open while the pointer is anywhere over the control
(rail.js manages a `.j-rail-hot` class from `pointerenter` on the list /
`pointerleave` on the whole control — a bare `:hover` could not tell the two
tiles apart).

Geometry lives entirely in the stylesheet as three custom properties (`--i`
per slot; `--cur`, `--n` on the root; `--d` per slot for the stagger);
rail.js only states where the visitor is.

### Menu open — the site map

A real modal dialog sliding in from the right (`min(29rem, 92vw)`, opaque,
scrim behind). Contents, in order: the wordmark; the site's one-line summary;
the five sections, each with its mark, number, name, heading line **and its
own contents** (see §3); the "Elsewhere" outbound links; the static-tier
pointer; the legal line. Someone who opens it understands what the site
contains without riding the journey — and everything the removed footer
carried is here.

---

## 2. What was removed, and where its functionality went

| Gone | Was | Where it went |
|---|---|---|
| `journey/ui-footer.js` (whole file) | The post-epilogue "Site Information" band: chapter deep links, ecosystem/social links, the static-tier note, the legal line, revealed over p 0.955..1 | The panel: chapter entries (5, epilogue included), "Elsewhere" (site.links + site.social), `.j-menu-note` (the same sentence, verbatim), `.j-menu-legal`. Available at **every** chapter, not only at the end of the ride. |
| `.j-foot-cue` ("Site information ⌄") | The keyboard-reachable route to the footer, riding the epilogue copy | Nothing replaces it, deliberately: its job was discoverability of a surface that only existed at p ≈ 1. The menu mark is one of the two resting symbols and is present everywhere, so the epilogue no longer needs a special door. |
| The flight system (`state.js` flyTo/cancelFlight/inFlight, `FLIGHT_*`/`SMOOTH_K_FLIGHT` constants, the `inFlight` branch in journey.js's animator) | A progress tween whose **only** remaining caller was the footer cue's fly to the end-hold | Removed with its caller. Chapter navigation has been direct-jump since D16; nothing travels but the scrub and the jump's own camera blend. `window.journey.flyTo(id)` (the QA alias for `navigateTo`) is kept, with a comment noting the name predates the removal. |
| `epilogueRetire` / `epilogueVeil` (ui.js) | Multiplied the epilogue copy down as the footer rose over it | Nothing — with no footer there is no handover. The epilogue copy holds through the end-hold, which its band (`hi: 2`) always allowed. |
| The old left rail's fixed-stack layout + all-names-at-once expansion | 23-side-navigator.md §3 | The anchored fan + per-mark reveal above. |

The **end-hold at p = 1 stays**: it is the route's own full stop
(`TERMINAL_P`, a snap-commit anchor), not the footer's. The epilogue now
simply holds its composition there.

**One pre-existing bug fixed in passing:** `.j-index-scrim` (the node-index
sheet, 24-mobile-pass.md) was created without `hidden` — an invisible
full-viewport surface at z-index 5 with default pointer-events, hit-testing
over everything beneath it (measured: `elementFromPoint` over the navigator
returned the scrim; the rail's hover could never fire, and hotspot hover was
being intercepted the same way). It is now `hidden` from birth, exactly as
the menu scrim is; `openSheet`/`closeSheet` already managed it.

`.j-card` still stands on the right flank. While a modal detail is open the
rail was already `inert`; it now also visually steps back (`.j-rail.dim`,
opacity 0.1), so the picture agrees with the hit model. Measured: no node
popover placement intersects the resting control at any shipped composition
(Inspire and Connect, every previewed node, 1440×900).

---

## 3. The panel's content model

Everything is from `content/content.js`; **no copy was written**:

| element | source |
|---|---|
| title | `Banodoco` (the wordmark, as the footer used it) |
| lede | `chapters.mission.sub` — the site's one sentence about itself |
| section number | manifest order (`01`…`05`) |
| section name | `chapters.<id>.nav`; the epilogue is titled with the structural word "Epilogue" (route.js's own word — `final.nav` is null by design) |
| section line | `chapters.<id>.heading` |
| item title | `nodes.<id>.label` |
| item line | `nodes.<id>.short` — the same sentence the node's popover shows, `[PLACEHOLDER]` tokens included (one voice, not two) |
| item link | `nodes.<id>.spotlight.link` / `.card.link` where one exists, authored label kept |
| Elsewhere | `site.links` + `site.social` |
| static note | ui-footer.js's sentence, verbatim; href resolved off `import.meta.url` |
| legal | `site.legal` |

Two content-model changes in `content.js`, both structural:

1. **Every node now carries `chapter: '<id>'`.** The chapter⇄node grouping
   existed only as comments and as registration order in journey.js — neither
   readable by a menu. The panel derives each section's items by filtering
   `CONTENT.nodes` on this field (insertion order = narrative order). A node
   added to content.js appears in the panel with no edit to rail.js.
2. **`footer` → `site`** (links, social, legal). The key held a footer's
   content; the footer no longer exists; the links and the legal line are the
   *site's*. Static tier `data-src` paths and the drift guard moved with it.

Owned's items are the three ownership pods (`pod-shared`, `pod-monthly`,
`pod-split`) — their labels and shorts are real, non-placeholder copy and
they summarise the section honestly. The sixteen contributors are
deliberately **not** listed: they are anonymous placeholder rows pending the
consent pipeline (CO-1.4), and a site map that lists "Contributor" sixteen
times is noise, not a map. Mission and the epilogue have no items; their
heading lines carry them.

### Missing links — for Hannah

**No external URL on this site is confirmed.** Contrary to the task brief's
assumption, the hero's own 2RP and Discord pills are also `href="#"` (both
`index.html` and the static header), so there was nothing confirmed to wire.
Every link below ships as a clearly-marked `'#'` placeholder (D10), with its
TODO in `content.js`:

* banodoco.ai homepage (`site.links[0]`)
* 2RP publication (`site.links[1]`, `nodes.tworp.spotlight.link`, and the hero's 2RP pill)
* Contact destination (`site.links[2]`)
* Discord invite (`site.social[0]`, `nodes.discord.card.link`, and the hero's Discord pill)
* GitHub org/repo (`site.social[1]`)
* Arca Gidan Prize page (`nodes.arca.spotlight.link`)
* ArtCompute page (`nodes.artcompute.spotlight.link`)
* "Owned by the ecosystem" Learn-more destination (`chapters.owned.actions[0]`)

No new prose needed Hannah's approval: every sentence in the panel already
existed in content.js.

---

## 4. The a11y model

* **Landmark.** A real `<nav aria-label="Journey sections">`, sibling of the
  hero's `<nav>` on `<body>`. Same bare-`nav` resets as before
  (`animation: none` is still the load-bearing one).
* **Real controls.** Four `<a href="#/chapter">`; `<button>` for the menu;
  `<a href>` for every panel entry and item link. The epilogue's rail slot is
  an `aria-hidden` `<span>` echo (unchanged rule: the panel is where the
  epilogue is named, and it marks `aria-current` when you are in it).
* **Expansion is not hover-only.** `:focus-within` expands the fan;
  the first Tab into the rail brings it up (the rail is *not* inert at p = 0
  — the skip-link pattern, carried over). Touch: first tap expands, second
  acts, decided per interaction from live `pointerType`. Verified tab order:
  `skip-link → wordmark → 2RP → Discord → Mission → Inspire → Connect →
  Owned → Menu → hotspots`.
* **Names for the keyboard.** A focused mark reveals its own name
  (`:focus-visible` pairs with `:hover` throughout); in the touch-expanded
  state every name arrives (no hover exists to reveal them one at a time).
* **The panel is a real dialog:** `role="dialog"`, `aria-modal="true"`,
  labelled, focus to the close button on open, Tab trapped (verified: 16
  focusables cycle and wrap both ways), Escape closes with focus returned to
  the menu button, rail `inert` behind it, Enter opens it from the button
  (verified through the real key pipeline).
* **Input ownership.** `claimInput(menu, { modal: true })` while open — the
  panel scrolls natively and the journey cannot be scrubbed under the reader.
* **Live region / skip link:** reused from ui.js / index.html, not
  duplicated. (The rail needs no announcements of its own; the panel
  announces itself by moving focus.)
* **44px targets.** Tiles are 52×44 by construction; panel item links get
  the standard `::before` hit pad under the coarse-pointer query.
* **`prefers-reduced-motion`:** every rule is a transition ending at the
  element's resting style; the reduced block switches them all off
  (durations *and* stagger delays). Verified emulated: fan state instant and
  complete, menu instant, `closeMenu` skips its fade timeout.

---

## 5. The static tier

`static/index.html` carries the hand-authored twin: same geometry (the same
three custom properties, `--cur` written by its own `setChapter`), same
two-symbol rest, same fan, same name pills, same panel content — every
string `data-src`'d and the drift guard extended: it now also asserts that
**every node with a `chapter` field has its label and short line in the
menu**, so the panel provably stays the map of everything.

The three divergences from Tier 1 stand (no reveal latch; the menu is a
`<details>` whose open form is the panel itself — now fixed to the *right*,
with `transform: none` guarding the fixed-position containing-block trap
recorded in 23 §8; expansion is `:hover`/`:focus-within` only, no
touch-arming). The no-JS fallback is unchanged in spirit: the rail ships
**expanded**, `--cur` defaulting to 2 so the fan hangs centred.

The page's own footer (`.site-footer`) is gone; the tier note and legal line
live at the foot of the menu panel. The chapter gutter flipped sides
(`padding … 11rem` right; 4.2rem at ≤900px).

Drift guard on load: 145 strings checked; the only errors are the **five
pre-existing ones** recorded in 23-side-navigator.md §11 (`owned.claims.*`
×4, `final.heading`) — still a separate task, still not folded in here.

---

## 6. p = 0, `mission`, and the final re-baseline

**`mission` did not move.** Neither did inspire, connect or owned:
`capture.py --check` (frozen, the real gate) reports **MAE 0.00/255, 0.0 %
px > 8 on all ten golden/size pairs**, and git confirms the only modified
captures are `final@1440x900`, `final@430x932` and the manifest.

**`final@*` moved deliberately.** The old goldens had the footer cue — "SITE
INFORMATION ⌄" — baked into the epilogue frame (it was never in
`HIDE_SELECTORS`). The cue is a component Hannah's brief removes, so the two
final goldens were re-shot without it and the reason recorded in
`manifest.json` (`--note`). Investigated first, re-shot second, as the
protocol demands.

The reveal latch and its two properties carry over unchanged and were
re-verified: cold load at p = 0 → rail opacity 0, unlatched; travel out and
back → rail stays (opacity 1 at p = 0).

---

## 7. Visual iteration notes

Shot at 1440×900, 1280×800 and 375×812, headless over capture.py's own CDP
client (the browser pane throttles rAF), every state.

**Pass 1 — built, then found it dead under an invisible surface.** The fan's
hover never fired: `elementFromPoint` over the rail returned
`.j-index-scrim`, the node-index sheet's scrim, created visible-but-
transparent over the whole viewport at z-index 5 (pre-existing; see §2). One
line (`scrim.hidden = true` at birth) and the component came alive. The
forced-state screenshots from this pass also showed the expanded band reading
as a **docked panel**: the first build's scrim recipe (0.95 alpha, solid for
58 % of a 4.6rem band) was tuned for names *inside* the band, and the redux's
names carry their own pills.

**Pass 2 — the band learns to be weather, not furniture.** Rebuilt the scrim
as 0.82 alpha, solid for only 22 % of a wider 6rem band — a long falloff that
reads as the frame darkening at its edge. Verified over the two brightest
frames (Connect's lit ground, Owned's colony): marks legible, no slab edge.
Also fixed a harness artifact from this pass: after closing the menu, focus
correctly returns to the menu button, which correctly holds the fan open via
`:focus-within` — the "resting" shots had to blur first to show rest.
(Finding: the focus-holds-fan behaviour itself is right — a keyboard visitor
never has the control fold under them.)

**Pass 3 — stress and journey sense.** The fan at Mission (downward), Owned
(upward past the crown), the epilogue and the end-hold; the phone's
tap-expanded state (all names + the opaque band + the chapter copy stepping
back to 0.14 — the mobile-pass behaviour, kept); the modal card over the
rail's own flank (rail dims to 0.1 and goes inert — without this the card and
the control fought for the same edge); popover placement measured against the
resting tiles (no intersection anywhere). The resting control over the busiest
frame (Owned's colony) stays legible on the current mark's existing
drop-shadow with no extra chrome — the two-glyph rest needs nothing added,
which is the best evidence it belongs.

What I would watch next (not defects): the `[PLACEHOLDER]` tokens are loud in
the panel — they disappear the day Content/Ops lands real shorts, and hiding
them would misrepresent the content's state; and at 375 the fan's name pills
lie over hotspot chips that are not part of the copy layer's step-back
(HIVEMIND's chip peeks between EPILOGUE and MENU) — same behaviour as the
first build, worth folding into any future mobile pass.

---

## 8. Gate results

| Gate | Result |
|---|---|
| References | **PASS.** 10/10 at MAE 0.00/255. `mission` untouched at both sizes; `final@*` deliberately re-baselined (cue removed), manifest noted. |
| Screenshots | Resting / fan / name reveal / panel (top + bottom) at 1440×900 and 1280×800; resting / tap-expanded / after-nav / panel at 375×812; static tier rest / fan / panel / no-JS / 375. |
| Keyboard | Full walkthrough through the real input pipeline: Tab order as in §4; focus expands the fan with visible ring + name; Enter opens the menu with focus on close; trap cycles 16 focusables and wraps both ways; Shift+Tab wraps backwards; Escape closes and restores focus; Enter on a rail link navigates. |
| Reduced motion | **PASS** (emulated): fan transitions 0s, expanded state instant and complete, menu instant, close skips its fade timeout. |
| Active tracking | **PASS.** 402-point scrub (0→1→0): exactly one `now`, one rail `aria-current`, one panel `aria-current` at every sample; `now=final, current=owned` through the epilogue. |
| Navigation | **PASS.** 45 trips — every rail entry from every section (20) and every panel entry from every section, epilogue included (25). All landed on `restProgress(target)` ±0.001 with the right hash and `aria-current`; the panel closes on navigate. |
| Jump behaviour | **PASS.** Nav click arms the copy entry (`arrivingChapter === 'owned'`) and the camera blends (moves in the first frames, settles 10 world units later) — 043a1f2 and d1ecc23 intact. |
| Modal detail | **PASS.** Deep link `#/owned/person-5`: rail dims to 0.1 and goes inert; restored on close. |
| Console | **CLEAN** over the full ride, 45 trips, keyboard pass, reduced-motion pass (console.error/warn + uncaught + rejections captured from document start). |
| Old components gone | **PASS.** No `.j-foot*`/`.j-footer`/`.site-footer`/`.flinks`/`.tier-note` selector or rule anywhere outside archive/ and plan history; `ui-footer.js` deleted; flight system removed with its last caller. |
| Both tiers | Static drift guard: 145 strings + 11 symbols in sync (plus the new menu-coverage assertion); only the five pre-existing errors of 23 §11 remain. No horizontal overflow at 375. No-JS renders the expanded rail and full menu content. |

---

## 9. Residuals

* The **five pre-existing Tier-3 content-drift errors** (23 §11) — unchanged,
  still a separate task.
* The **missing external URLs** listed in §3 — waiting on Hannah/Banodoco.
* `content.js` still has **no dedicated site-overview string** (mission.sub
  re-used, as before) and no authored epilogue title ("Epilogue" is
  structural).
* The 375 chip-behind-the-band note in §7 — cosmetic, for the next mobile
  pass.

---

## 10. 2026-08-09 (later) — the poke came back: overlays are now inert unless open

**Reported:** Hannah, straight after the redux landed. *"All the touch gestures
also seem to be broken right now … I mean like when I used to tap a mushroom it
would act like it had received physical contact and light up, same with the
ground."*

**Files:** `journey/site.css` (four selectors), `tools/inputgates.js` (new,
QA-only, not shipped).

### What she was describing

The POKE — `organism/organism.js` §10c. A `pointerdown`/`pointerup` pair on
`renderer.domElement`, gesture-gated to a tap (≤400 ms, ≤7 px), raycast against
the opaque body shells: an impulse torque rings the stalk down as a damped
oscillator, a short-range light ripple is planted at the fingertip, a cap tap
sheds spores, a touch pointer gets a 6 ms haptic tick; a miss plants the
far-carrying floor wave instead. `journey/chapters/final/interact.js` resolves
the epilogue's field bodies off the *same* element, second on the same event.

### What interfered

Not the poke, and not the navigation component. **`.j-index-scrim`** — the
node-index scrim from 24-mobile-pass. `position: fixed; inset: 0; z-index: 5;
opacity: 0`, and **no `pointer-events` declaration at all**, so it defaulted to
`auto`. An invisible full-viewport surface, hit-testable from boot, sitting over
the canvas. Every `pointerdown` on the frame landed on it; `organism`'s handler
never ran, and neither did the field picker.

`9e674d3` had already removed the live instance an hour earlier, by giving the
element `hidden` at birth. That commit is correct and stays. But it patched the
*instance*, not the *mechanism*: the only thing standing between this page and a
completely dead canvas was one JS assignment, and the redux had just cloned the
same pattern twice more — `.j-menu-scrim` (z 6, full viewport) and `.j-menu`
(z 7, `top:0;bottom:0`, `min(29rem, 92vw)` — nearly a whole phone). Neither
carried a `pointer-events` rule either; `.j-menu-scrim` did not even carry the
explicit `[hidden] { display: none }` belt that `.j-index-scrim` had. The next
overlay built to this pattern would have taken the canvas out again.

Measured, at HEAD, by stripping `hidden` from the scrims as they are created —
i.e. running the exact pre-fix code — on a cold load at 1440×900:

```
scrims:  pe=auto  z=5 / z=6   box=[1440,900]
cap    mouse  DEAD  down/up=0/0  top=DIV.j-menu-scrim
cap    touch  DEAD  down/up=0/0  top=DIV.j-menu-scrim
ground mouse  DEAD  down/up=0/0  top=DIV.j-menu-scrim
ground touch  DEAD  down/up=0/0  top=DIV.j-menu-scrim
```

The canvas received **zero** pointer events. That is Hannah's report exactly:
body and ground, mouse and touch, nothing lights up.

### Why it was not caught

Because every gate this repo has was blind to it, by construction:

* **It moves no pixel.** The element is `opacity: 0`. `capture.py --check`
  reported 10/10 at MAE 0.00 while the site was completely untappable — and
  still does now. A frozen-frame gate cannot see a hit-test.
* **It throws nothing.** The console stayed clean; no handler errored, they
  simply were never called.
* **It belongs to no component.** The defect is a property of the whole
  viewport, so neither the navigator's own review nor the poke's own review
  had reason to look at it. The redux was reviewed against the redux.
* **The one visible symptom was attributed and fixed in isolation.** 9e674d3
  found it via the rail's *hover* expansion failing, fixed that, and had no
  reason to suspect the canvas underneath was the bigger casualty.

### What now guarantees the canvas keeps its pointer events

**Hit-testability follows the visible state, declaratively.** The four
full-frame overlays are `pointer-events: none` in their base rule and
`pointer-events: auto` only under `.open` — the same class that makes them
visible, added and removed in the same synchronous task as `hidden`:

| Selector | closed | open |
|---|---|---|
| `.j-menu-scrim` | `none` | `auto` |
| `.j-menu` | `none` | `auto` |
| `.j-index-scrim` | `none` | `auto` |
| `.j-index` | `none` | `auto` |

`hidden` is still managed in JS and still correct; it is now a **second** belt
rather than the only one. `.j-menu-scrim` and `.j-menu` also gained the explicit
`[hidden] { display: none }` rule for parity with `.j-index-scrim`. An overlay
that is not open cannot take a pointer even if its `hidden` bookkeeping is
wrong, missing, or forgotten by whoever builds the next one.

`tools/inputgates.js` (QA-only, nothing imports it — same shape as
`tools/scrollgates.js`) asserts it, and asserts it *against sabotage*:

* **G1** the canvas owns the frame at rest — no element covering ≥12% of the
  viewport beats it. (The threshold is the point: the hero's HUD links, the
  rail and the hotspot chips are *supposed* to be on top, and a gate that
  flags them gets ignored.)
* **G2** the same, with `hidden` stripped from all four overlays. This is the
  guarantee under test: the pre-fix state must now be survivable.
* **G3** the poke actually fires — read off the scene's own shared pulse
  uniforms (`uPulseT` back to 0, `uPulseP` = (1.4,1.5,1.2) body /
  (2.6,0.33,1.4) floor), for body and ground, mouse and touch. A ground pixel
  is allowed to answer `body` where FINAL's field picker corrects organism's
  floor swell (interact.js §ORDERING) — requiring `ground` there would assert
  a bug.
* **G4/G5** each overlay is inert while closed, live while open, and inert
  again after.

### Gate results

| Gate | Result |
|---|---|
| References | **PASS.** 10/10 at MAE **0.00**/255, all ten frozen frames byte-identical, `mission` included. The change is invisible by construction: the overlays are `display:none` at every captured pose, so `pointer-events` on them cannot reach a pixel. |
| Input gates | **PASS** at 1440×900 and 375×812, and at the FINAL rest. G2 confirms the canvas keeps the frame with `hidden` stripped (`pe=none` on all four). |
| Poke — main model | **PASS.** cap / stem / ground × mouse / touch, at 1440×900 and 375×812, at mission, inspire, connect and final. Measured on the pulse uniforms with the clock armed past decay, plus the breeze-free ring-down residual `0.034·rot.x + 0.007·rot.z` (the breeze terms cancel exactly). At Owned the hero body is behind the camera — no pixel to tap, as designed. |
| Poke — FINAL field | **PASS**, both pointer types, both viewports, via the chapter's own `pickStats()`: at a field-body pixel, mouse ×5 → broad +5 / narrow +5, touch ×5 → broad +5 / narrow +5; 12 distinct field bodies poked per pointer type at 1440×900, `clonesRinging` non-empty. |
| Input surface walked | **PASS.** Rail hover-expand + collapse + click-to-navigate (after first travel — `.on` is a one-way latch, so the rail is deliberately inert at the Mission pose); menu open on a real click, panel and scrim both hit-testable while open, `modalInput` claimed, native wheel scrolling inside the panel (`scrollTop` 287/400), focus trap holding, scrim-click close, Escape close, input released (`inputOwners` 0); skip link; hotspot chips (hover opens the popover, click **pins** it — `openCard()` routes preview nodes to `pinPop`, so a card is not the contract); Owned face-node hit pads taking `pointerenter`/`leave` 1/1; the live face chip opening the card; `Learn more`/`Remix` pills live whenever their row is not `inert`; wheel scrubbing; touch-drag scrubbing measured *during* the gesture (p 0 → 0.041, then correctly resolved home — 672 px is well under the commit distance). |
| Console | **CLEAN** over full rides at both viewports (console.error/warn + uncaught + rejections captured from document start). |
| A/B against the pristine sheet | Chips, popovers, cards and action pills produce **byte-identical** state before and after the change. |

### Residual

* At Owned the one 246 px hover zone sits over part of the visible floor, so a
  ground tap there opens the node instead of pinging the mycelium. That is the
  hit pad doing its job (1325 of 1487 sampled ground pixels remain free) and
  predates this work — noted, not changed.

---

## 11. 2026-08-09 (later again) — four reports from Hannah: the fan's dead spots, the fleeing menu, the sticky fan, the vanishing rest

**Reported:** Hannah, same day, after using the shipped component. "Generally
looking very good … starting to feel quite nice" — these are refinements of a
component that stays as built, not a rebuild.

**Files:** `journey/rail.js`, `journey/site.css`, `static/index.html`.
`journey/route.js` untouched (`navChapterAt` simply lost its one caller and
stays as documented API).

Every cause below was REPRODUCED and measured headless over capture.py's own
CDP client before anything was changed, and re-measured after.

### (1) "The Epilogue button isn't clickable, and it closes when I try to hover over it"

Two defects wearing one report:

* **The Epilogue tile was an aria-hidden `<span>` echo** (§1's deliberate
  design), and every pointer-events-enabling rule says `a.j-rail-item` — so
  the tile was a **44px dead hole in the fan**. Measured, walking a pointer
  down the open fan at owned: `elementFromPoint` returned `CANVAS` across
  y 474–482, the control saw `pointerleave`, and `.j-rail-hot` dropped —
  the fan folded exactly as she approached the tile. Worse: after the fold,
  the RESTING MENU BUTTON sits under that very region (480–524), so her
  click "on the Epilogue" opened the site-map panel instead.
* **An 8px gap between the last tile and the menu mark** (the hairline's
  breathing room) was a second, thinner instance of the same class: dead
  space inside a control is a `pointerleave` under a moving pointer.

**Fix:** the epilogue slot is a **real link** — every chapter has a route,
the panel already navigated to it, and a tile a pointer can reach must be a
tile a pointer can press. It keeps the echo's quieter voice (`.j-rail-echo`,
now 0.42 in the fan, hover to parchment) and, with all five slots linked, the
rail's `aria-current` and reticle now follow `chapterAt(p)` — the rail can
finally say "you are in the epilogue" itself, as the panel always could. The
hairline gap is bridged by a hit pad riding the menu button
(`.j-rail-menu::after`, 8px, both states). Verified: the walk down the fan
holds `hot` at every sampled y; a click, a touch second-tap and a keyboard
Enter on the tile all land at `#/final` with exactly one `aria-current`.

### (2) "The first click just doesn't actually open the menu — it opens the expanded version"

Measured, in one line: **the menu button moved between mousedown and
mouseup.** On mouse, the press focused the button, `:focus-within` was one of
the fan's expansion conditions, the fan opened, and the button slid down to
hold the foot of the stack — mouseup landed on empty air, so no click event
was ever delivered. Literally "the first click opens the expanded version".
On touch it was the arming tap: `pointerdown` on ANY rail point (menu button
included) armed `.j-rail-open`, the button slid, and the tap's click died on
a moved target.

**Fix, three parts, all serving one law — *the control you are pressing does
not move, and if it moves anyway, pressing it still works*:**

* **Focus no longer expands the fan** — see (3); mousedown can't shove the
  button any more.
* **A touch press on the menu button never arms the fan** — the menu is the
  *other* resting control; its first tap is for the panel.
* **The menu opens on `pointerdown`** — the way an OS menu bar does. The
  press is the intent; acting on the press makes the button clickable
  throughout any motion. `preventDefault` keeps the press's focus where
  `openMenu` sends it; the `click` listener stays for Enter/Space, guarded.
* Plus **hover intent** (`HOT_INTENT_MS = 120`): the fan unfolds on dwell,
  not on transit, so a pointer merely crossing the current mark on its way
  to the menu leaves the menu where it was aimed.

Verified: from rest, one mouse click and one touch tap each open the panel —
including a click landing while the button was measurably mid-slide.

### (3) "After I clicked, it doesn't go away until I click somewhere else"

The fan's expansion conditions included `:focus-within`, and a mouse click
focuses the link it presses — so a *non-visible* focus held the fan open
until something else took focus. The `:focus-within` was deliberate (§4: a
keyboard visitor's fan must never fold under them) but it conflated the two
input worlds.

**Fix: `:has(:focus-visible)` replaces `:focus-within` in every expansion
selector, both tiers.** `:focus-visible` is exactly the keyboard half of
focus: Tab into the rail still opens and HOLDS the fan (verified: a pointer
sweep across and off the open fan does not fold it while a link keeps
keyboard focus), while a click's focus neither opens nor holds it. Section
clicks also stopped force-collapsing the hover fan — the pointer is still on
the control, so the fan now stays until it leaves (her words: "go away upon
de-hover"), and the touch state alone is collapsed by a navigating tap. The
resting hit-gate negation (`:not(...)`) mirrors the same three conditions, so
a click-focused rail can't keep folded tiles hit-testable.

### (4) "Sometimes the side menu thing is invisible … it's on top of a similarly coloured mushroom" — the taste call

The resting control is gold line-work over a scene made of gold line-work; on
the epilogue's lit field the current mark simply vanished (screenshotted: at
the Final rest the mark sits directly on the bright cap's wireframe). §7's
pass-3 conclusion — "the two-glyph rest needs nothing added" — was measured
over Owned's colony and did not survive the epilogue's field. Hannah asked
for judgement, suggesting a resting scrim. Four candidates were built and
screenshotted over the brightest frames (Connect's ground, Owned's colony,
the Final field) and the darkest (Mission's sky), at 1440×900, 1280×800 and
375×812:

* **A — the marks carry their own contrast:** a tight dark rim under every
  glyph (two stacked `drop-shadow`s, 1px @ 0.95 + 3px @ 0.6, riding UNDER
  the current mark's existing gold glow — `filter` replaces, it does not
  compose). Crisp, zero furniture; but the menu mark still fought the cap's
  rim at Final, and a rim alone can't calm a busy field behind a stroke.
* **B — a resting halo:** the expanded band's own recipe (gradient falloff,
  masked feather — "the frame darkening at its edge") sized to the two
  resting marks alone and quieter (0.62 vs 0.82, 4.6rem vs 6rem). It fades
  out as the band fades in, so the darkening *grows with the fan* rather
  than doubling under it. Legible, in-language; but the glyph itself still
  sat soft on the brightest pixels.
* **C = A + B — CHOSEN.** The halo calms the field; the rim keeps the glyph
  a drawn thing. Screenshotted over every chapter at all three sizes:
  legible everywhere, and the rest still reads as two symbols in weather,
  not a docked widget.
* **D — a backdrop-filter puck (blur + darken behind the marks) — REJECTED
  on sight:** a rounded rectangle floating on the scene is exactly the
  generic web furniture this component has avoided twice already (§7's
  "docked panel", 23's fixed stack). Also a per-frame compositing cost over
  a live WebGL canvas.
* **A hairline rule down the edge — REJECTED without building:** it fails
  the actual defect (a 1px line adds no legibility to a 24px glyph on a lit
  cap) and adds permanent chrome to every quiet frame that never needed it.

Both tiers carry the treatment (`.j-rail-inner::after` + `.j-sym` filter /
`.rail-inner::after` + `.sym` filter; the static tier's halo is always-on —
it has no reveal latch — and off under `.no-js`, where the expanded band is
already up). The reduced-motion blocks kill the halo's transition with the
band's. The frozen references cannot see any of it: `.j-rail` is in
capture.py's HIDE_SELECTORS, and `--check` confirms **10/10 at MAE 0.00/255**.

### The static twin

Same four fixes, same shapes: the epilogue slot is an `<a href="#/final">`
(navLinks picks it up by `data-nav`, `setChapter` drops its owned-stays-
current special case); every `.rail:focus-within` became
`.rail:has(:focus-visible)`; the closed summary opens on `pointerdown` (with
a one-shot click swallow so the same press's native toggle can't snap it
shut — keyboard activation passes untouched, no-JS keeps the pure native
toggle); Tier 1's hover intent appears as an enter-only 0.12s
`transition-delay` on the menu-wrap (reads as the stagger's last step;
reduced-motion re-zeroes it at matching specificity); the hairline hit pad
exists in its closed state only, since the open summary is the panel's
header row. Drift guard after all of it: 145 strings + 11 symbols, only the
five pre-existing §11-of-23 errors.

### Gate results

| Gate | Result |
|---|---|
| (1) | **PASS.** Mouse click, touch second-tap and keyboard Enter on the Epilogue tile all land at `#/final` (p 0.9250); `elementFromPoint` holds the control at every sampled y down the fan; exactly one `aria-current` in rail and panel, reticle on the epilogue at its rest. |
| (2) | **PASS.** Single mouse click and single touch tap from rest each open the panel — the mouse click verified landing while the button was mid-slide (rect y 480→490 at press). |
| (3) | **PASS.** Pointer: click → fan holds while hovered → folds on leave (slot transform back to identity). Keyboard: fan opens on focus, survives a pointer sweep on/off, Escape-close returns focus to the menu button and the fan correctly stays for the keyboard. |
| (4) | Screenshots of rest + fan over all five chapters at 1440×900, 1280×800, 375×812, before and after; legible at every one. |
| References | **PASS.** `capture.py --check`: 10/10 at MAE 0.00/255, zero px > 8 — all ten frozen frames byte-identical. |
| Input gates | **PASS** (`tools/inputgates.js` G1–G5) at 1440×900, 375×812 and the Final rest: canvas owns the frame, overlays inert-unless-`.open` even with `hidden` stripped — 6903c4a's guarantee intact. |
| Poke | **PASS.** Main model body and ground, mouse and touch, both viewports (G3); Final FIELD bodies via the chapter's own `pickStats()`: mouse → broad 4 / narrow 1 / 1 clone ringing; touch → broad 8 / narrow 2. |
| Keyboard | **PASS.** Tab order now `skip → wordmark → 2RP → Discord → Mission → Inspire → Connect → Owned → Epilogue → Menu → hotspots`; Enter opens the panel with focus on close; trap wraps both ways (Shift+Tab from close → the static-journey link; Tab from there → close); Escape restores focus. |
| Reduced motion | **PASS** (emulated): fan instant and complete (0s durations, halo included), menu instant, close on the tick. |
| Touch model | **PASS** at 1440 and 375: first tap arms, second acts, tap-away collapses, menu single-tap opens, scrim tap closes. |
| Console | **CLEAN** over a 402-point scrub ride plus the full interaction pass, both tiers (error/warn + uncaught + rejections from document start). |
| Both tiers | Static: drift guard 5 pre-existing errors only; epilogue link navigates with `aria-current`; fan folds on de-hover after a click; summary opens on one press; Escape closes; no-JS renders the expanded five-name rail with the band up and the halo off. |

### Residuals

* A pointer that DWELLS on the current mark (> 120ms) en route to the menu
  still opens the fan and slides the menu to the stack's foot — that is the
  fan working as designed; the press-to-open makes even that button
  catchable in flight. Only a click aimed from memory at the old resting
  spot, issued after the fan has fully opened, now lands on the Epilogue
  tile instead — the tile the visitor is looking at when it happens.
* The §7/§9 residuals stand (placeholder tokens in the panel, the 375
  chip-behind-the-band note, the five Tier-3 drift errors, the missing
  external URLs).
* `navChapterAt` (route.js) now has no callers; kept as documented manifest
  API.

---

## 12. 2026-08-09 (later still) — the jump's flash: the camera was read before it was written

**Reported:** Hannah, on Mission → Final. *"A weird flash — a bunch of stuff
flashes up for a moment, that looks maybe like the fully progressed view shown
right away and then disappears, and then it goes through the transition. It
feels like there's something glitchy happening."*

Three phases, three separate causes, all of them the same underlying mistake:
**things that describe the CAMERA were being computed from journey state that
had already snapped to the destination.**

**Files:** `journey/journey.js`, `journey/chapters/final/index.js`. Nothing
else; no chapter's reveal law changed, and no golden moved.

### The mechanism, measured

A nav jump is deliberately a DIRECT jump (§ the `directJumpTo` block): journey
state snaps to the destination in one tick — seams, copy, route, scroll surface
all land there — while the camera takes one short blend from where it stood.
Inside `placeAt`, `applyFrame` calls `director.apply(p)`, which WRITES the live
camera to the destination pose, and `snap()` then throws every chapter's eased
arm state to its target. Only after `placeAt` returns was `camBlend` armed, and
the blend ran at the very END of the `'journey'` animator.

Everything in between therefore read a pose that was about to be overwritten in
the same frame and never rendered:

1. **The flash.** `chapters.final = createFinal(...)` registers `'journey-final'`
   at boot, BEFORE the spine registers `'journey'`. Animators run in insertion
   order, so Final ran FIRST every frame and read whatever `camera.position`
   held — on the first frame after the click, the un-corrected DESTINATION pose.
   It computed a fully-kindled reveal; the spine's blend then put the camera
   back near Mission; the frame that rendered composited the arrived epilogue
   onto the departure camera. Measured on the live page, headless at 1440×900,
   reading `renderer.info` and the drawing buffer per frame:

   | Mission → Final, first rendered frame | before | Mission rest |
   |---|---|---|
   | draw calls | **336** | 42 |
   | triangles | **210,051** | 12,829 |
   | `uPull` / kindled fraction | **1.000 / 1.000** | 0 / 0 |
   | camera x | −2.252 (Mission) | −2.250 |

   16× the geometry of the pose being rendered, for one frame. Inspire → Final
   and Connect → Final measured 219,167 and 234,051 the same way.

2. **The disappearance.** Final composes `eff = 1 − (1 − amount)(1 − rise)` —
   an OR, not a product. `snap()` pins `amount = 1` (the T4 seam arms Final on
   the pure p-window `p > 0.80`, which the destination p 0.925 satisfies
   unconditionally), so `eff` was pinned wide open for the WHOLE blend no matter
   what the camera said. Meanwhile the per-vertex kindle
   (`smoothstep(aReveal, aReveal + 0.16, uPull)`) does track the camera, and the
   camera spends most of the blend far outside the pullback range — so every
   body collapsed to its 7% ember floor while the slab, colony, sky and mist
   stayed at full `uAmount`. That is the "disappears": not the epilogue leaving,
   the epilogue standing there unlit at the wrong pose.

3. **The transition.** The blend's tail finally brought the camera into range
   and the field genuinely re-revealed. That part was always correct — it only
   read as a third phase because of the two before it.

Contrast: Connect composes `uAmount = amount * resolve` and Inspire
`master(az) * arr(az)`, both products of camera-pure factors, so their identical
stale read self-corrects inside one frame. Final's OR is what turned a one-frame
artifact into a multi-hundred-millisecond collapse-and-recover, and Mission →
Final is the longest jump in the route, which maximises both halves.

### The fix — the class, then the instance

**(1) The camera is finished before anything reads it** (`journey.js`). The
blend moved out of the tail of the `'journey'` animator and INTO `applyFrame`,
immediately after `director.apply(p)` writes the destination pose and before the
first reader. And the spine's animator is now registered at the top of `boot()`,
before `createLens` and before `chapters`, so it runs ahead of every chapter's
own animator. Together those two lines make the pose a single-writer quantity:
the seams' T1/T3/T4 predicates, every chapter's `drive(p)`, the lens's focus
projection, the UI's hotspot projection and all four chapter animators now read
the pose the frame will actually present.

This is the CLASS fix. The same stale-read shape exists in Connect, Inspire and
Owned and was harmless only by luck of their gating maths; it is now
structurally unreachable rather than accidentally survivable.

**(2) A jump is not a placement** (`journey.js`). `placeAt` gained
`{ snap }`. Placements — deep links, `?p=`, `?pose=`, the frozen `?capture=`
burst — keep snapping, because a dt = 0 ride must render the finished frame.
A nav jump passes `snap: false` and the snap is DEFERRED to `endCamBlend`, the
frame the camera lands. This is the WebGL half of what `ui.armCopyEntry`
(`d1ecc23`) already does for the copy layer, and it fixes the outgoing mirror of
the bug too: leaving Final used to delete the entire 282,053-triangle epilogue
on the click frame while the camera was still standing in it.

**(3) Final composes on the camera while the camera disagrees with the state**
(`final/index.js`). New optional chapter method `setBlending(on)`, called by the
spine when a blend arms, cancels or lands. While it is set, Final drops the
`amount` term and composes on `rise` alone — its own camera-pure "the lens has
climbed into this chapter's territory" mask, which is 0 at every other chapter's
rest (their camera x runs −2.25 … +9.97, all above the −4.6 onset) and 1 at its
own. `group.visible` follows `eff` for that window instead of `amount`. Off a
blend it is `flag ? … : …` — byte-for-byte the shipped composition, which is why
no golden moves.

Connect and Inspire do not implement `setBlending`: their reveals are products
of camera-pure factors and (1) is sufficient for them. Owned does not either —
see the residuals.

**(4) The fog travels with the camera** (`journey.js`). The director keys fog
off p, so a jump also threw the world's whole depth to the destination ramp on
the click frame. Both ends are captured once in `directJumpTo` (p does not move
during a jump, so the destination ramp is a constant, and reading it live would
feed the blend back into itself at p = 0 exactly as the position once did) and
interpolated on the blend's own ease, beside fov.

This one was A/B'd on its own, because it is the departure direction's own
version of "and then it disappears". Final → Mission, the click frame, camera
essentially unmoved (x −14.720 → −14.714):

| Final → Mission, click frame | luminance | fog |
|---|---|---|
| origin (Final rest) | 67.24 | 13.75 / 60.30 |
| fog snapped (the shipped behaviour) | **32.16** | 7.00 / 20.00 |
| fog on the blend's ease | **61.00** | 13.74 / 60.27 |

Slamming near/far to the hero's 7 / 20 blacks out everything past 20 units while
the camera is still standing in a 60-unit-deep field: **−35.1/255, a 52% drop,
in one frame, with nothing moved.** On the ease it is −6.4, and even that is
mostly the lens grade step below (gain 1.1387 → 1.0000) plus Owned's colony
leaving. Fog is a camera-relative quantity — it is a function of distance FROM
THE LENS — so writing the destination's ramp over the origin's pose is the same
category of error as writing the destination's reveal over it.

### Before / after, per frame

Mission → Final, the same measurement either side. `tris` and `lum` are the
frame actually rendered; `lum` is mean luminance of a 1440×240 centre band read
straight off the drawing buffer after `composer.render()`.

| dt (ms) | before: tris / uPull / kindle | after: tris / uPull / kindle | cam x |
|---|---|---|---|
| rest (origin) | 12,829 / 0 / 0 | 12,829 / 0 / 0 | −2.25 |
| first frame | **210,051 / 1.000 / 1.000** | 16,757 / 0 / 0 | −2.26 |
| ~300 | 18,051 / 0 / 0 | 16,757 / 0 / 0 | −2.33 |
| ~600 | 18,051 / 0 / 0 | 16,755 / 0 / 0 | −4.64 |
| ~660 | 18,049 / 0 / 0 | 18,049 / 0 / 0 (Final first drawn) | −5.56 |
| ~1,000 | 18,051 / 0.14 / 0.004 | 18,051 / 0.15 / 0.006 | −8.9 |
| landing | 282,053 / 1.0 / 1.0 | 282,053 / 1.0 / 1.0 | −14.72 |

After the fix the epilogue is first submitted at camera x = −5.56 — just past
the −4.6 `rise` onset, which is exactly where the ordinary scrub reveals it —
and kindles across x −8 → −14 on `uPull`, exactly as the scrub does. The jump
now shows what a fast ride shows, at the pose it is actually standing at.

The departure mirrors it. Final → Connect, after: the epilogue holds at 278,133
triangles and kindle 1.000 while the camera is still at x −14.7, then retires
progressively — 273,335 → 178,967 → 66,451 → 14,131 — and goes dark at
x = −4.24, the same onset in reverse. Before, it was gone in one frame at
x = −14.72.

### What was deliberately NOT changed

* **Final's OR itself.** `amount OR rise` exists so a fling that outruns the
  arming clock still surfaces onto a finished world. It is correct whenever the
  camera is on the path p describes; the only state in which it is not is a jump
  blend, and that state now has a name. Rewriting it as a product would have
  re-timed the ordinary underground approach for no gain.
* **The seams.** T1/T3/T4 are hybrids of camera predicates and p-windows, and
  the p-windows are what arm a destination chapter on the click frame. Making
  them camera-coherent during a blend is not tractable without inventing a
  p-inverse of the director's spline; the arm is cheap and dark, and the
  composition on top of it is now camera-pure where it can be.
* **The lens grade.** `lens.update(p)` is a pure p → look curve, and it snaps:
  gain 1.0000 → 1.1387 on the click frame of Mission → Final, worth +3.8/255 in
  the centre band for the length of the blend. Left alone deliberately — unlike
  fog, the grade is not a camera-relative quantity, it is the leg's finishing
  look, and the state has legitimately arrived. Recorded here with its number so
  the next person can overrule it on taste rather than rediscover it.

### Gate results

| Gate | Result |
|---|---|
| Flash gone (Mission → Final) | **PASS.** First 400 ms peak: 210,051 → 16,757 triangles; kindled fraction 1.000 → 0.000. Over the origin's own resting draw: +197,222 → **+3,928**. |
| Same, Inspire/Connect/Owned → Final | **PASS.** +206,338 → +3,926 · +221,216 → +3,924 · +37,290 → +12,000 (Owned's origin rest draws only 4,753: the lens is under the soil). Kindled fraction 1.000 → 0.000 on all four. |
| Jumps to Connect / Inspire | **PASS.** First-400 ms peak equals the origin rest exactly (over-origin 0 or −6 triangles) from every origin. |
| Every jump lands | **PASS.** All 20 origin × destination pairs land on the right chapter, p and pose exact (e.g. Final `p=0.9250 [-14.72, 2.73, 2.7]`), twice over: once in the measured sweep, once in a 40-jump interaction pass. |
| Deep links / `?p=` / `?pose=` / `?capture=` | **PASS.** `#/final`, `#/connect/ados`, `?p=0.70`, `?pose=owned`, `?capture=final`, `?capture=inspire`, `?capture=0.83` all place at the right chapter and p. Two of them place somewhere other than the naive expectation — `?p=0.70` resolves to the Owned rest at 0.725 (commit-resolution, and it does so with `&nosnap=1` too), and `?capture=0.83` reports chapter `owned` because 0.83 is below `startOf('final')` — both verified IDENTICAL on unmodified HEAD before being written down as passes. |
| References | **PASS.** `capture.py --check`: 10/10 at **MAE 0.00/255**, zero px > 8 — all ten frozen frames byte-identical. |
| Departure coherence | **PASS.** Final → Mission click frame: luminance 67.24 → 32.16 before (a 52% crash at an unmoved camera), 67.36 → 61.00 after. Final → Connect: the epilogue holds at 278,133 triangles and retires to dark at x = −4.24 instead of vanishing in one frame at x = −14.72. |
| Full ride | **PASS.** Forward wheel ride reaches p = 1 at the end-hold; reverse ride returns to p = 0 with the hero pose exact (−2.25, 2.25, 10.4), fog restored to 7/20, lens gain back to 1.00, nothing armed. |
| Console | **CLEAN** (error/warn + uncaught + rejections trapped from document start) over the full forward+reverse ride, all 40 jumps, and every placement URL. |

### Residuals

* **The destination chapter still ARMS on the click frame**, because the seam
  that arms it is p-driven. With the deferred snap that is now an eased entry
  rather than a pop, and each chapter's own camera-pure factor bounds its
  brightness — but the geometry is submitted. Measured: **+3,928 triangles** of
  Owned colony drawn at the departure pose on any jump to Owned or Final
  (Owned's arrival mask is p-pure by design — "p and the camera are a bijection
  on the leg" — and that bijection is exactly what a jump breaks); **+17,200**
  of Connect network at the Final rest on Final → Connect, fading up from ~0
  over ~0.35 s. Frame luminance falls throughout both, so nothing reads as
  appearing. A camera-pure substitute for Owned's mask was designed and
  rejected: the colony is legitimately visible from ABOVE ground through the
  Final cutaway, so any "below the soil line" test would have gone dark for the
  whole Mission → Final blend and then popped at the landing.
* **Owned's colony leaves in one frame on a jump AWAY from Final** (−3,920
  triangles at an unmoved camera), for the same p-pure reason. Pre-existing, not
  introduced here, and the smaller half of the same argument.
* One frame of Final → Connect submits 299,253 triangles against 282,053 at the
  Final rest (+6%): the clones' entry-draw front re-running as `uPullRaw` falls.
  Camera-pure and identical to what a reverse scrub does through the same pose;
  frame luminance is falling (63.1 → 60.2) across it.
* `?capture=` and every deep link go through `placeAt` with `snap: true`
  unchanged, so the frozen-capture path is untouched by all four changes — the
  reason the ten references are byte-identical rather than merely within
  threshold.

---

## 2026-08-10 — 2RP leaves the header (register #63)

Hannah: *"Can we remove 2RP from the header? … Let's just remove the header
[control], but leave it in the Inspire and Empower section."*

One control gone from one row, in both tiers; the 2RP CONTENT is all still
where it was. What changed and what deliberately did not:

- **Gone**: the `2RP` pill in the live header's `.nav-cta` (index.html) and
  its Tier-3 twin (static/index.html). Discord stays; the row is
  logo-left / one-pill-right and needs no CSS change (`.pill` and `.nav-cta`
  are shared rules, nothing was sized to the pair).
- **Kept, by her own words**: the 2RP node in Inspire — chip, popover,
  spotlight — untouched; the site menu's outbound `2RP` link
  (`site.links`, both tiers) — that list is the navigator panel's
  destinations, not the header.
- **Un-dangled**: the tworp spotlight's placeholder body referenced "the
  persistent top-right 2RP control", which would have become a printed lie —
  reworded (content.js + the static mirror, verbatim-identical for the
  tier-3 drift guard) to point at the site menu's link instead. Comment
  references to "both pills / the 2RP-Discord pair" updated in hero.css
  (x2) and rail.js (x2).

Proof of clean removal — `grep -n 2RP index.html static/index.html` leaves:
index.html three comment lines only; static/index.html the two comment
lines, the Inspire menu-row/spotlight strings (nodes.tworp.*), the
site.links entry, and the `2rp` deep-link alias comment. `class="pill"`
occurs exactly once per tier (Discord). Verified on screen at 1440x900:
both headers render BANODOCO + Discord; the open site-map panel still lists
2RP under 02 INSPIRE with "Read the publication" and in the site links.

The tier-3 content drift guard reports the same 5 PRE-EXISTING drifts
before and after this change (Owned's claims-became-prose and the Final
heading never propagated to the static page — logged as its own task); the
tworp strings edited here check clean among its 145.

---

## 2026-08-10 — The mobile backing covers the icons, and only the icons (register #66)

Hannah: *"On mobile — when I open up my main menu, the black thing that shows
over the open menu spreads out far too much to the left. It should just cover
the icons, it shouldn't spread out to the left."*

### What was actually oversized

Reproduced at 375x812 and 430x932 over the bright Connect rest. The candidates
the brief named, checked one by one:

- **The site-map panel + its scrim**: not it. The panel is `min(29rem, 92vw)`
  (345 px at 375) and the `.j-menu-scrim` only shows in the ~30 px sliver
  beside it — nothing there "spreads left".
- **The resting halo** (`.j-rail-inner::after`, 4.6rem): not it — sized to
  the two marks, soft falloff, and the resting frame reads correctly.
- **The expanded band** (`.j-rail-inner::before`) — **this one.** At phone
  widths the 2026-08-07 mobile pass had turned it into an opaque panel
  (`#090602 76%`) while keeping the inherited 6rem width: opaque black to
  73 px from the edge, feather to 96 px — nearly twice the 52 px tile
  column, with the fan's name pills floating beyond it. That composite is
  the "black thing" (measured at 375x812: opaque to x 302, feather to
  x 279, tiles at x 323..375, name pills reaching x ~240).

### The fix

The band's phone-width override is now **sized to the icon column**: `width:
4rem`, opaque run 68% (= 43.5 px, the tiles' own footprint — marks at
x −38..−14 — fully inside), feather ending at 64 px. The two jobs it was
over-serving were already covered by their own mechanisms: every name pill
carries its own 0.85 scrim (the desktop mechanism, untouched), and the
chapter copy steps back to 0.14 while the fan is open (`body.j-rail-on`).
One addition with the re-size: **the chip layer steps back with the copy**
(`body.j-rail-on .j-hotspots`, same 0.14, same transition) — the wide panel
used to happen to bury any chip pill near the right edge (Connect's
Hivemind), and the band should not be wide for that reason either. Hit
model untouched: while the fan is open, a tap outside the rail collapses it
first (rail.js's document-level pointerdown), so a dimmed chip was never
reachable under the open fan anyway.

`48b7795`'s legibility win stays whole: the resting halo is untouched, the
glyphs keep their drawn dark rims, and the band under the tiles is still
fully opaque `#090602` — just no wider than the thing it protects.

### First-tap verification (the second half of the brief)

Simulated real `pointerType: 'touch'` taps headless at 375x812:

- **First tap on the MENU mark** → the panel opens on that tap
  (`menuOpen: true`, fan NOT armed) — the `48b7795` model holds on touch:
  menuBtn opens on pointerdown, and the rail's arming handler explicitly
  skips taps inside the menu mark.
- **First tap on a section mark** → arms the fan (`j-rail-open` +
  `body.j-rail-on`), second tap navigates; a tap anywhere else collapses.
- **Panel a11y intact**: focus moves into the panel on open, Escape closes
  it, focus returns to the menu mark (`opened/focusWasInside/closed/
  focusBackOnMark` all true).

### Gates

- `tools/inputgates.js` battery: **G1-G5 all PASS** at 1440x900 AND 375x812
  (canvas owns the frame at rest, overlays inert with `hidden` stripped,
  poke fires body+ground on mouse+touch, per-overlay closed=none/open=auto,
  restored after close) — `6903c4a` holds.
- Full real-wheel ride 0 → 1 → 0 at 1440x900 with error/warn/uncaught/
  rejection hooks from document start: **0 entries** (favicon.ico 404
  excluded as pre-existing server noise), finalP exactly 0.
- `capture.py --check`: PASS, all 10 goldens within threshold (the rail is
  DOM chrome, hidden at capture; the scene is untouched).
- Before/after screenshots: resting / armed fan / open panel at 375x812 and
  armed fan at 430x932.

---

## 2026-08-11 — The hero callouts hang down the right side

Hannah, on the landing frame's balance (voice, transcribed): *"Move the
EQUIP sign so it's pointing over from the right side… move the CONNECT sign
over to its right as well… it would feel more balanced if they were all
coming down the right side, basically, in terms of the balance with the
actual page."*

This supersedes `a089e40`'s placement (all three tags centred above their
nodes on vertical leaders) while keeping everything else that commit and
`e20f7ff` established: tags as links, EQUIP inert with its "coming soon"
reveal, and all three anchors static — no wind.

### The placement as authored

All three callouts return to the pre-`a089e40` **elbow language** — a short
diagonal off the node, then a horizontal run into the tag — but authored as
one system descending the frame's right side, balancing the hero copy on
the left:

- **01 INSPIRE** — its node already sits at the right edge, out in the
  spore plume, so its elbow is the one that reaches back *inward*
  (`L-32,-52 H-100` on desktop): the tag tops the column, above the cap
  rim. This also fixes two latent defects: at 1440x900 the old centred tag
  clipped the viewport (right edge 1450 > 1440) and entered the navigator
  band; at 430x932 it overlapped the rail mark's row.
- **02 EQUIP** — the sign Hannah pointed at: elbow comes in *from the
  right* (`L26,-14 H140`), tag right of the stem, roughly level with its
  node. The tag is **top-anchored** (no translateY) so the "coming soon"
  reveal drops below the label row instead of re-centring the box and
  shoving the row off the leader.
- **03 CONNECT** — elbow up-right off the ground node (`L30,-24 H70`),
  tag at the bottom of the column, `translateY(-50%)` on the run.

Leader shapes per breakpoint (every path keeps `pathLength="100"`, so
`lead-draw`/`.lit` dash geometry is untouched at any length):

| callout | desktop (min 901x561) | small frames (base) | via |
|---|---|---|---|
| INSPIRE | `L-32,-52 H-100`, tag -106/-52 | `L-18,-70 H-70`, tag -76/-70 | svg.tall / svg.std |
| EQUIP | `L26,-14 H140`, tag 146/-28 | `L16,-30 H40`, tag 46/-43 (mobile), 46/-44 (compact) | svg.std / svg.alt |
| CONNECT | `L30,-24 H70`, tag 76/-24 | `L20,-16 H48`, tag 54/-16 | svg.std / svg.alt |

The desktop INSPIRE media block now sits AFTER the base per-callout rules —
same specificity, source order decides, and in the old file the earlier
placement meant the `tall` tag offset silently never won (only the svg swap
did). EQUIP gained an `svg.alt` (it had one shape at every size); the
mobile-portrait block swaps EQUIP and CONNECT to the short elbows, and the
compact-landscape block (`max-height: 560px`) now does the same — see
"tried and rejected".

### Tried and rejected

- **A shared screen-x column for the three tags** — impossible with
  world-tracked nodes: offsets are per-node, node x varies with aspect
  inside each camera mode, so exact alignment can't be authored in CSS.
  The set is instead a *convention* column (left edges 1183–1216 at
  1440x900), which reads aligned without fighting the projection.
- **All three leaders pointing the same direction** — INSPIRE's node hugs
  the right edge; a rightward elbow would leave the frame. Its mirrored
  elbow keeps the vocabulary (diagonal + horizontal run) while the *tags*
  do the aligning.
- **EQUIP `translateY(-50%)` like CONNECT** — the reveal would grow the
  box symmetrically and lift the label row ~9px off the leader run on
  every hover. Top-anchoring pins the row and spends the growth downward.
- **Keeping compact landscape on the full-reach elbows** — at 844x390 the
  EQUIP and CONNECT nodes are ~40px apart and the tags stacked into one
  accidental two-row block, 3px apart, with EQUIP's reveal overlapping
  CONNECT. Short elbows + EQUIP's steeper rise separate them (27px at
  rest, 10px with the reveal open).
- **First mobile INSPIRE pass at dy-62** — the label row grazed the cap
  rim at 430x932; dy-70 clears it while keeping 17px under the CTA at
  375x812 and 22px under the nav at 844x390.

### Measured clearances (rest / hover-forced)

- **1440x900**: rail band 95/111/58px (01/02/03), rail mark never
  approached; tag-to-tag 301 and 194px (177 with EQUIP's reveal open);
  nav row to 01: 121px; hero copy right edge 704 vs leftmost tag 1183.
- **1280x800**: rail band 91/66/25px (22 hover); tag-to-tag 269 and 169px
  (152 hover); nav to 01: 89px.
- **375x812**: tag-to-tag 124 and 99px (84 hover); CTA to 01: 17px (the
  tight one, deliberate — the strip between CTA and cap apex is the only
  clean air on a phone); EQUIP's edge kisses the rail band's invisible
  x-range (+1px) and CONNECT enters it by 7-10px, both 270px+ below the
  rail's mark — no ink, no hit-area contact (rail is pointer-events:none
  outside its slots, slots live at the vertical centre).

### Gates

- Entry choreography: `lead-draw` runs on the elbows (dashoffset sampled
  in flight mid-boot, 0 at rest); numbered 01→02→03 boot order untouched.
- INSPIRE → `#/inspire` and CONNECT → `#/connect` verified headless,
  Back returns to `#/mission` both times; EQUIP click leaves hash and
  chapter untouched, reveal opens/closes on tap (`hover: none` emulated,
  force toggles on, off, and exclusively).
- Keyboard: tags tabbable (tabIndex 0), focus lands.
- Reduced-motion: `animation: none`, callouts opacity 1, leaders at
  dashoffset 0, tags in final position.
- Console over a full ride (real wheel 14 notches + every chapter by hash
  and home): 0 errors/warnings/rejections.
- `capture.py --check`: PASS, worst MAE 0.02/255 — `.callouts` is hidden
  at capture, the frozen `mission@*` goldens did not move.

## 2026-08-11 — The word becomes the mark (Hannah: "make the Discord thing in the top right be the Discord icon with an appropriate styling/lighting on it")

Both tiers' headers now carry the Discord MARK — the real clyde, inlined as
SVG (no build step, no icon system), never redrawn — in place of the word.
The `.pill` contract stays (it is still the header's one control beside the
wordmark, `6e828d2`); a `.pill-ic` modifier restates it as a circle in the
site's light:

- **ground**: near-black deep brown, lit faintly from the upper left where
  the specimen's glow reaches the row (a radial, not a flat fill);
- **hairline**: amber-gold (`--gold` at 0.52) — the one warm hairline in
  the header, which is what marks it as the lit control;
- **glyph**: parchment at rest; hover/keyboard-focus warm hairline and mark
  to `--gold-bright` with a soft box-shadow spill — the `.co` callouts'
  rest-hairline -> lit-gold state grammar, on the nav row's existing 0.25s
  transition. No new choreography; `prefers-reduced-motion` sets
  `transition: none` in both tiers (states intact, instant).

**The box holds the row's edge.** The live hero's nav bottom is the top of
the band Inspire's portrait camera is balanced against (the PL-1.4 note in
hero.css), so the circle is EXACTLY the text pill's computed height —
33px at desktop, 28.44px under the portrait query — and the 44px touch
minimum stays on the PL-1.4 transparent pad, measured live (`::before`
44x44px at 375x812). navBottom before/after: 100.1875 / 100.1875 (desktop),
70.03125 / 70.03125 (portrait) — byte-identical. Tier 3's pill already
carried its minimum in the box, so its circle is simply 44px.

**A11y**: the visible word is gone, so the `<a>` carries
`aria-label="Discord"` in both tiers and the svg is `aria-hidden`
/ `focusable="false"`. Verified headless: accessible name present, Tab
reaches the control, `:focus-visible` shows the shared gold ring — which
sets `border-radius: 2px` for the square controls it was written for, so
`.pill-ic:focus-visible` restates `999px` (the `.j-act` precedent).

**The destination is still nobody's.** `href="#"` — the placeholder it has
carried since the header was built; no real invite URL has been supplied.
Marked in both tiers' comments (and `data-placeholder` in Tier 3).

Gates: header shot at 1440x900, 1280x800 and 375x812 in rest/hover/focus;
console over a full ride (wheel 0 -> 1.000 -> 0.001) 0 errors/warnings —
the two pre-existing boot info lines only; `capture.py --check` PASS (the
header is DOM chrome, hidden at capture — no reference moved).
