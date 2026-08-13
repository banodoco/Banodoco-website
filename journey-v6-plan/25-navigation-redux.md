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

## 2026-08-11 (later) — The mark becomes an outline (Hannah: "make it be an outline of the Discord logo — keep tweaking it until it looks nice. Right now it's excessively dominant, especially on mobile. Make it ELEGANT.")

The mark shipped this morning was a filled clyde on a ringed, lit disc. That
is **two enclosed shapes**, and they were the only opaque things on a page
whose entire language is fine glowing line — the wireframe specimen, the
`.co` leader lines, the `.cta`'s hairline, the letterspaced wordmark. It read
as an app badge stuck onto the frame. On a phone, where the row is
proportionally larger and the scene behind it thinner, it took the top of the
composition outright.

**The treatment.** No disc, no ground, no fill. The official clyde path is
left **unfilled and stroked** — the same `d`, never redrawn; recognisability
was never in question — at the 1px `.co .lead` / `.co .lit` are drawn at.
`vector-effect: non-scaling-stroke` holds that 1px true whatever the glyph is
scaled to, so the weight is stated once and means the same thing at every
size. `overflow: visible` on the `<svg>` is load-bearing: the box is exactly
the viewBox and would otherwise clip the outer half of the stroke.

The mark's own subpaths do the work — the outer silhouette becomes one drawn
contour, the two eye counters become two small rings. Nothing was redesigned.

**Colour: parchment at rest, gold when lit.** Gold is this site's LIT state
everywhere else (`.co`'s rest hairline lighting on hover, the CTA, every
`:focus-visible` ring); spending it at rest is most of what made the badge
shout. So the mark rests in parchment and lifts to `--gold-bright` with the
`.co .lit` drop-shadow on hover/focus — a `filter` now rather than a
`box-shadow`, since there is no box left to light.

**Rest alpha was measured, not guessed.** Shot at 0.58 / 0.66 / 0.74 / 0.82 in
the real row, at actual size, 1440 and 375@2x. 0.58 is the old text pill's
BORDER alpha and was the tempting "same hairline value" answer — but that
pill also carried a FULL-parchment *word*, so matching only its border
undersells the control and it goes ghostly. 0.82 starts to rival the
wordmark. **0.74** is where the mark's stroke reads at the same density as
BANODOCO's letter strokes: the two sit in the row as peers, which is the
whole point.

**Mobile got its own numbers**, since that is where she flagged it. The ink
shrinks with the wordmark (1.05rem -> 0.92rem is -12%; 20px -> 18px is -10%)
and **the stroke shrinks with it, 1px -> 0.9px** — a 1px line on a smaller
glyph is a bigger *fraction* of it and coarsens, which is exactly the failure
the brief warned about. At DPR 2-3 (a real phone) 0.9px is 1.8-2.7 device px,
crisper than the DPR-1 stills below.

### Tried and rejected

- **Keeping the ring, outlining only the glyph.** Shot it first. The ring is
  what makes it read as a badge — an outlined face inside a circle is still a
  disc with something in it. Rejected on sight.
- **Gold at rest** (`--gold` 0.62). Warmer and it *does* echo the `.co`
  leaders — but the callouts are IN the scene, world-tracked, part of the
  specimen's light; the header is page chrome, and its wordmark and pill
  border were always parchment. Gold at rest also pre-spends the lit state and
  visibly pulls the eye. Rejected.
- **19px ink** (the old glyph's size). Too small once unfilled — the eye rings
  crowd and the lower jaw muddies. **25px** draws cleanest but is a larger
  footprint than the badge it replaces, which loses the argument. 20px is the
  ink that reads.
- **A transparent border** instead of `border: 0`. The base `.pill`'s 1px is
  still LAYOUT under `box-sizing: border-box`: a transparent one silently ate
  2px off the ink (measured 20x15 where 22 was declared) and pushed the mark a
  pixel off the margin. Caught by measuring, not by looking.
- **The focus ring on the box.** The `<a>` is 20x33 — it has to be, the row's
  edge is camera-balanced — while the mark is 20x15, so the shared ring came
  out a tall portrait rectangle around a wide little face. That is the
  enclosing-shape problem this pass removed, handed back on focus. The ring now
  hangs on the `<svg>` (26x21 at the shared 3px offset); same colour, same
  width, same offset, different element.

### The row's edge never moved

Height is still EXACTLY the text pill's computed height — 33px desktop,
28.44px portrait — because the nav row's bottom is the top of the band
Inspire's portrait camera is balanced against (the PL-1.4 note in hero.css).
**Only the ink changed.** Width now follows the ink rather than being a 33px
square, so with the disc gone the ink *is* the visual edge and it sits flush
to the margin the wordmark starts at (right edge 1385.6 = 1440 - 3.4rem;
352.5 = 375 - 6vw).

| | before | after |
|---|---|---|
| navBottom @1440x900 | 100.1875 | **100.1875** |
| navBottom @1280x800 | 100.1875 | **100.1875** |
| navBottom @375x812 | 70.03125 | **70.03125** |
| box @desktop | 33x33 | 20x33 |
| box @375 | 28.44x28.44 | 18x28.4375 |
| ink @desktop | 19x14.39 (filled) | 20x15.16 (1px stroke) |
| ink @375 | 17x12.88 (filled) | 18x13.64 (0.9px stroke) |
| touch target @375 | 44x44 (PL-1.4 pad) | **44x44 (PL-1.4 pad)** |

### Tier 3

Same treatment, and it picks up the **PL-1.4 pad** it never needed before: its
box used to be 44px square and got the touch minimum for free, but the ink is
20px now and the box follows it, so a transparent 44x44 `::before` carries the
target in both tiers.

One latent bug fell out and is fixed: inside `@media (max-width: 900px)`,
`.pill` re-pads to `1rem` at the same specificity as the base `.pill-ic` and
*later in source*, so it won — 32px of horizontal padding against a 20px
border-box left the content box negative and **the svg measured 0.00x0.00**,
i.e. the mark vanished entirely below 900px. `padding: 0` is now restated in
that block. (hero.css's portrait block already restated it, which is why the
live tier never showed this.) The old 44px box masked it as a squeeze rather
than a disappearance.

### Gates

- Shot at **1440x900, 1280x800 and 375x812** in rest / hover / focus, before
  and after, actual size and zoomed.
- **navBottom byte-identical** at all three (table above); `inspire@430x932`
  drifted 0.00/255, so the portrait composition is provably untouched.
- **A11y, verified headless with real Tab keypresses** (not `element.focus()`):
  AX role `link`, AX name `"Discord"`, svg `aria-hidden="true"` /
  `focusable="false"`. Live tier reaches the control on hop 6 (skip link ->
  03/01/02 callouts -> wordmark -> mark), Tier 3 on hop 3. `:focus-visible`
  matches and the gold ring paints on the glyph in both tiers at both sizes.
- **Touch target measured at 375**: `::before` 44x44px, both tiers.
- **`prefers-reduced-motion`**: `transition: none / 0s` in both tiers at both
  sizes, with rest AND lit colour/filter both intact and instant.
- **Tier 3 drift checker: 5 problems — the same 5 that were already there**
  (4 `chapters.owned.claims.*` paths, 1 `chapters.final.heading` mismatch).
  No sixth.
- **Console over a full ride** (`mission -> final -> mission`, wheel both
  directions): 0 errors / warnings / uncaught / rejections; the two
  pre-existing boot info lines only.
- **`capture.py --check`: PASS**, worst MAE 0.02/255 — the header is DOM
  chrome and is hidden at capture, so all ten frozen references stayed put.

**The destination is still nobody's.** `href="#"` — still the unconfirmed
placeholder, still marked in both tiers' comments and `data-placeholder` in
Tier 3.

---

## 2026-08-11 (later still) — The wordmark becomes the mark (Hannah: "Can you crop this properly and then use it as the logo instead of the BANODOCO text? … And maybe the Discord logo needs a ring around it in the top right or something.")

**Files:** `index.html`, `hero.css`, `static/index.html`, `tools/build-mark.py`
(new), `assets/brand/` (new).

The word `BANODOCO` is gone from both tiers. In its place is the mark Hannah
supplied: an **isometric wireframe capital B**, drawn as glowing amber line
art, cropped to its ink and cut out on the source's own alpha.

### The treatment: a mask, not an image

The central fact about the asset is that it is **taller than it is wide**
(814x1112, aspect 0.732) where the thing it replaces was a long thin word.
The second fact is that it arrived **amber** — already lit.

It ships as a **CSS mask painted with `currentColor`**, not as an `<img>`.
Two reasons that are really one:

1. **State.** `5762167` established that *gold is this site's lit state* and
   that spending it at rest is what made the old Discord badge shout. The
   control at the other end of this row rests in parchment and lifts to
   `--gold-bright` on hover and keyboard focus. A baked amber raster is lit at
   rest and has **nowhere to go when you touch it** — the row would have had
   one control that answers and one that cannot. Masked, the B is the same ink
   as its neighbour and lifts with it. The two ends are peers in colour and in
   behaviour, not merely in size.
2. **Bytes.** Only the alpha channel is needed, so what ships is grayscale +
   alpha at **2.9–9.7 kB** instead of the 28–155 kB colour cutouts.

The full-page frame settled it: the page's centre is a glowing amber wireframe
mushroom. **An amber B competes with the specimen; a parchment B lets it
lead** — and the mark's own wireframe language then rhymes with the specimen
instead of shouting over it. Rest alpha is **0.82**, measured against the
neighbouring 0.74: the B is a lattice of many thin lines where the clyde is
one closed outline, so the same alpha reads lighter on it and went ghostly.

**Masking on alpha, not luminance**, was also measured. The master's RGB
carries a lighting gradient (bright near faces, dark far ones); a luminance
mask drops the far faces almost entirely and the drawing comes apart into an
illustration with holes. On alpha every line holds the same hairline the `.co`
leaders and the Discord outline are drawn at — which is what makes it read as
a *mark* and not a picture of one. Nothing was traced or re-drawn.

`tools/build-mark.py` derives the masks from the master and `--check`s them
byte-for-byte, so the raster step is reproducible rather than folkloric.

### The size, and how the row's edge survived it

Shot in the real row at 30/33/36/40/44/48. **Under 36 the interior lattice
mushes** and it stops being a drawing; **over 44 it owns the frame**. The word
it replaces was 17px of cap height spread over 140px — matching that would
have been both unreadable and, oddly, still too heavy.

**40px** at desktop, **34px** portrait (-15%, close to the word's own
1.05rem -> 0.92rem step). At 40 the mark is 29.27px wide against the Discord
outline's 26 — nearly the same footprint at nearly the same weight, at
opposite ends of the row.

The row's bottom edge is camera-balanced, and 40 > the 33px band. Rather than
redistribute nav padding (five rules, five magic numbers, fragile), **the mark
overflows its box symmetrically**: `.logo` keeps the band's exact height and
the ink hangs 3.5px past it top and bottom. Padding is whitespace and nav's
height is still `max(33, 33)`, so **navBottom is arithmetically untouched** —
verified identical in every state and at every breakpoint.

| | before | after |
|---|---|---|
| navBottom @1440x900 | 100.1875 | **100.1875** |
| navBottom @1280x800 | 100.1875 | **100.1875** |
| navBottom @375x812 | 70.03125 | **70.03125** |
| navBottom @430x932 | 70.03125 | **70.03125** |
| logo box @desktop | 122x17 (text) | 29.27x33 |
| logo ink @desktop | 122x17 | **29.27x40** |
| logo ink @375 | 121.53x17 | **24.88x34** |
| Discord ink @desktop | 20x15.16 | **26x19.71** |
| Discord ink @375 | 18x13.64 | **22x16.67** |
| touch target, both | 44x44 | **44x44** |
| bytes @1x / 2x / 3x | 0 | **2 983 / 4 777 / 9 729** |

Because navBottom never moved, **Inspire's portrait framing never moved**:
`inspire@430x932` came back at MAE 0.00/255, which is the direct proof.

### The hit pad had to leave PL-1.4

PL-1.4 pads `.pill, .cta, .logo` to 44px, but only on coarse pointers, and it
sizes on `max(100%, 44px)` — **the element's box**. Correct while the logo was
a word, whose box *is* its ink. Wrong now: on a desktop pointer the top and
bottom 3.5px of the drawing would have been **visible but not hoverable**. So
`.logo` carries its own pad, unconditionally, sized to the **ink**
(`max(var(--mark-h), 44px)`). Hit-tested at all four extremes of the ink at
both breakpoints: all four resolve to the link. This is a superset of PL-1.4,
not an exception to it — still >= 44x44 everywhere, just enforced in one place.

The **focus ring** moved for the mirror-image of `5762167`'s reason. There the
`<a>` was *taller* than its glyph; here it is *shorter* — 33px of box under
40px of drawing — so the shared `nav a:focus-visible` ring cut across the B.
It cannot hang on `.mark` either: **`mask` clips an element's own outline away
with everything else it paints**, so the ring would simply not draw. A pseudo
sized to the ink is drawn outside the masked box and hugs the drawing exactly.

### The Discord ring: tried, shot, rejected — and what was done instead

Hannah asked for one, and the case had genuinely changed since `5762167` took
the old one off: both ends of the row are marks now rather than a mark and a
word, so a ring could have read as a **matched frame** rather than a badge. It
was worth shooting rather than assuming. Shot at **30, 34 and 40px diameter**,
hairline, unfilled, same `currentColor`, beside the 40px B.

**All three failed, the same way:**

- **A circle is a closed shape.** After `5762167` there is not one enclosed
  form left in this header — the B is open wireframe, the clyde is open
  outline, the `.co` leaders and the `.cta` are open line. The ring puts the
  only closed contour on the page back in the corner it was removed from, and
  it reads as a **button** again. That *is* the dominance she objected to,
  arriving by a slightly quieter road.
- **It inverts the hierarchy.** At 34 and 40 the eye goes to the *ring* before
  the *logo*, because a circle in an otherwise angular field is the strongest
  figure in it. The logo has to lead the row.
- **The geometries fight.** The B is all 30/60/90 edges and flat faces; a true
  circle shares no vocabulary with it. The pair looked assembled from two
  different kits.

**But the instinct behind the request was right.** What she was reading is
that the row changed underneath that control: it used to answer a 140x17 word
and now answers a 29x40 drawing, and at 20px the clyde had become the smaller
*order* of object — the eye stopped treating the two ends as a pair. So the
remedy is a **rebalance, not an enclosure**: **20 -> 26px** at desktop,
**18 -> 22px** portrait (both -15%, the same step the mark takes, so the two
ends hold their proportion at every breakpoint). Everything `5762167`
established is intact — official path, unfilled, 1px `vector-effect` stroke,
no disc, flush to the margin, 33px box. 26px of open outline is a long way
from the lit filled disc she called excessively dominant.

### Tier 3

Same treatment, same files, same three resolutions one directory up. Its row
is **not** camera-balanced (nothing downstream is framed against it), so there
the box is simply the touch target — `min-height: 44px` — and the mark sits
inside it rather than overflowing it.

### Gates

- **Before/after header shots at 1440x900, 1280x800 and 375x812**, in rest,
  hover and focus, for *both* controls; mobile at actual size and zoomed.
- **navBottom byte-identical at all four breakpoints** (table above), in every
  interaction state, and `inspire@430x932` at MAE 0.00 — the portrait
  composition is provably untouched, so no camera field went stale.
- **Accessible name survives**: AX name `"Banodoco"` from `aria-label`, the
  `<i class="mark">` is `aria-hidden="true"`, no text and no `<img>`. Mirrors
  the Discord control exactly. Reached on **tab hop 5** with real Tab
  keypresses (skip link -> 03/01/02 callouts -> logo -> Discord),
  `:focus-visible` matching, gold ring painting, in both tiers.
- **Touch target at 375: 44x44**, and all four extremes of the *ink*
  hit-test to the link at both breakpoints.
- **`prefers-reduced-motion`**: `transition: none` on both marks; rest and lit
  states intact and instant.
- **Bytes**: exactly **one** raster fetched per breakpoint —
  `mask-48` (2 983 B) at 1x, `mask-64` (4 777 B) at 2x, `mask-96` (9 729 B) at
  3x. `image-set` verified live; a plain `url()` is declared *first* as the
  fallback, because a dropped `image-set` would otherwise paint the element as
  a **solid parchment rectangle**.
- **Tier 3 drift checker: 5 problems — the same 5 that were already there.**
  No sixth.
- **Console over a full ride** (`mission -> final -> mission`) at all four
  breakpoints: **clean**, 0 errors / warnings / uncaught / rejections.
- **`capture.py --check`: PASS.** Nine of ten frozen references byte-identical;
  `owned@*` at MAE 0.02/255, **confirmed pre-existing** by re-running the gate
  with these changes stashed at `5762167` and getting the identical 0.02. The
  header is DOM chrome and is hidden at capture, so nothing here can reach it.

### Residuals

- The Discord destination is **still nobody's** — `href="#"`, still the
  unconfirmed placeholder in both tiers.
- The four colour downscales that came with the master
  (`mark-b-{512,256,160,96}.png`) are **not committed**: they are derived
  intermediates the mask pipeline supersedes, and shipping ~2.1 MB of unused
  raster into a page whose whole language is vector would be the wrong trade.
  The master is kept (losslessly re-encoded, 1.30 -> 1.20 MB) and everything
  served is regenerable from it via `tools/build-mark.py`.
- The mark is a **raster in a vector page**. At 3x it is a 9.7 kB fetch, which
  is cheap, but a true vector B would be cheaper still and would never need an
  `image-set`. Tracing was rejected as lossy against artwork this fine; if a
  vector master ever exists, `.logo .mark` is the only rule that changes.

---

## 2026-08-11 — The URL stops being a route: the hash goes, inbound links stay

> "When we go into a new section, let's NOT append this hashtag thing to the
> URL — `http://localhost:8137/#/connect` — and if they do have it, let's strip
> it out. It destroys our journey." — Hannah

The address bar was a **live readout of the scrub**. Crossing a chapter
boundary called `writeRoute` from inside `applyFrame`, so one wheel gesture
from Mission to the epilogue rewrote the URL four times, and every nav press
pushed a history entry on top. The route system was never designed as
decoration — it carried four separate jobs — so the removal had to be decided
job by job rather than by deleting the writer and seeing what broke.

### What the hash used to do, and what replaced each job

| Job | Was | Now |
|---|---|---|
| **1. Scroll-driven section changes** | `applyFrame`'s tail edge-detected `chapterAt(p)` against `lastChapter` and `replaceState`d `#/<chapter>` — the thing Hannah reported | **Nothing.** The block and its `lastChapter` edge-detector are gone. The crossing is still detected where it does work — ui.js's copy bands, seams.js, the rail's own `chapterAt(p)` — it simply no longer has an opinion about the URL. |
| **2. Nav clicks push a history entry** | `navigateTo` called `writeRoute(id, null, { push: true })`, so Back stepped back through the ride | **Nothing.** `navigateTo` closes any open detail and jumps. Back leaves the site — see the decision below. |
| **3. Detail cards write `#/<chapter>/<node>` and close via Back** | `openDetail` pushed the entry, `closeDetail` spent it with `history.back()`, and a `detailPushed` flag distinguished "we pushed this" from "we arrived on it" so a deep-linked card did not walk the visitor off the page | **Direct close.** With nothing pushed there is nothing to spend and nothing to distinguish: `detailPushed` and the `history.back()` are both gone, and every close path — the X, Escape, a press outside, the scroll intent, a nav jump — runs the same `ui.closeCard()`. `history.back()` is not called anywhere in the build. |
| **4. Deep links** | `parseHash` at boot placed the journey and opened the node's card | **Kept, and then cleaned.** The boot chain still reads the hash once, still normalises the retired routes (`community` → `discord`, `person-N` → `contributor-N`, `2rp` → `tworp`), still places and still opens the card — and then `journey.clearRoute()` strips the hash with `replaceState`. Not a redirect: no reload, no second history entry. |

`state.js`'s `writeRoute` is replaced by `clearRoute`, which only ever
**deletes** (`location.pathname + location.search`, so `?p=`, `?pose=` and
`?capture=` are untouched). The `hashchange` listener survives for one reason:
a hash can still *appear* after boot — pasted into the address bar — and it is
treated exactly like an arrival, honoured and then taken back out. So the
promise is not "we stop writing"; it is **the URL never keeps a route, however
it got one**.

### Every caller, checked

- **The rail and its site-map panel** (`rail.js`) already navigated by
  handler: both `.j-rail-item` and `.j-menu-item` are real `<a href="#/id">`
  elements whose click handlers `preventDefault()` and call `onNav`. The hrefs
  are **kept** — they cost nothing, they keep the tiles real links for the
  keyboard, and a middle-click opens a tab that arrives as an inbound deep
  link and is cleaned on arrival.
- **The hero callouts** (`index.html`, made into `#/inspire` / `#/connect`
  links in `a089e40`) were the one place where **the navigation *was* the
  href**: the browser wrote the hash and the router picked up the
  `hashchange`. They now navigate through `window.journey.flyTo` in main.js
  (a direct camera jump, as the rail's tiles do), and a click that lands
  *before* the journey has booted is held in `pendingEntry` and handed to
  `boot({ entry })` — the same intent the browser used to record for us.
  `#co-equip` is unchanged (deferred chapter, `preventDefault` only).
- **`?pose=`** no longer echoes itself into the hash. It was the one QA path
  that dirtied a clean address bar on purpose.
- **The static tier** (`static/index.html`) is **untouched, deliberately.**
  Its hash *is* its navigation and its no-JS contract; it is a separate plain
  HTML document, not the ride Hannah was describing.

### The Back button — the decision

**Back leaves the site**, and nothing in the ride touches the back stack.

That is the honest consequence of what she asked for: with no entry pushed,
there is no entry to go back to. It is also normal behaviour for a
single-page experience, and it removes the failure the `detailPushed` flag
existed to paper over — there is now no code path that can call
`history.back()` and walk a visitor off the page. Measured: five nav presses,
a card open and a card close leave `history.length` **unchanged** at 4.

The alternative — keep pushing entries for nav and cards, strip only the
scroll-driven writes — was rejected. It would have kept a *hidden* stack the
URL no longer explains: Back would undo travel the visitor cannot see
recorded anywhere, which is a worse contract than "Back leaves", not a better
one.

### The trade, stated plainly

- **No shareable link to a section or a card.** Riding to Connect and copying
  the address bar gives the landing page. The links still *work* inbound —
  `#/connect`, `#/owned/contributor-3` and the legacy `#/connect/community`
  all place correctly — so anything already written down, bookmarked or
  authored in the markup keeps working; the site just stops *producing* them.
- **Back no longer steps through the ride.** One press leaves.
- A sensible middle exists and is exactly what shipped for the inbound half:
  **accept deep links inbound, never write them outbound.** The half that is
  genuinely lost is *outbound* — there is no way to hand someone a link to a
  contributor card without hand-writing the hash. If that ever matters, a
  "copy link" control on the card is the right shape for it: an explicit act,
  not a URL that rewrites itself under the visitor.

### Gate results

- **Full ride by scroll**, Mission → Inspire → Connect → Owned → Final
  (p 0 → 0.972, all four boundaries crossed): the URL never changed, and a
  wrapper over `pushState` / `replaceState` / `back` recorded **zero calls**.
- **All ten nav destinations** — five rail tiles, five site-map entries —
  reach their chapter's rest with the URL unchanged and no history call. One
  real trusted pointer click through the panel's CONNECT entry verified the
  same (p 0.523, panel closed, URL clean).
- **Cards**: opened by pointer (chip and portrait), by keyboard, and by deep
  link; closed by Escape, by the X, by a press outside and by the scroll
  intent. Focus restores to the originating chip in every pointer/keyboard
  case, the modal card's trap and live region are untouched, and no path
  writes or pops history.
- **Deep links**: `#/connect` (cold load) → Connect rest, URL cleaned to `/`;
  `#/owned/contributor-3` → Owned rest with the card open and focus on its
  close control, URL cleaned; legacy `#/connect/community` → Connect rest with
  the **discord** node open, URL cleaned. All three by `replaceState`:
  `history.length` does not grow.
- **Back from a clean state**: leaves to the previous document and lands as a
  normal cold load (p = 0, Mission, empty hash) — no stranding, no stale
  route.
- **`?p=0.62`** → p 0.620 (Owned); **`?pose=inspire`** → p 0.260 with the flag
  intact and no hash written; **`?capture=connect`** → p 0.523, hash empty.
- **Hero callouts**: CONNECT and INSPIRE both jump (p 0.523 / 0.260) with a
  clean URL; a CONNECT press *before* boot lands the journey in Connect when
  it boots.
- **Console over a full ride**: clean — no site errors, and the boot line now
  reads `route (none)`.
- **`python3 tools/capture.py --check`: PASS.** Eight of ten frozen
  references at MAE 0.00/255; `owned@*` at 0.03, **confirmed pre-existing** by
  re-running the gate with these changes stashed at `bc5a89f` and getting the
  identical 0.03. No golden file is modified.

### Residuals

- **`scroll.js:453` throws on a wheel event whose `target` is not a Node.**
  `ownerOf(e.target)` calls `el.contains(node)`, which rejects `window`. Not
  reachable by real input (a user's wheel always targets an element) and it
  only fires while an input owner is registered, i.e. while a card or the menu
  is open — but a synthetic `window.dispatchEvent(new WheelEvent(...))` in QA
  hits it every time. Pre-existing; found while driving this pass's gates.
- **The hrefs in the markup now describe a destination the site never writes.**
  That is deliberate (they are the middle-click affordance and the a11y
  contract), but it means `#/connect` is discoverable only by inspecting a
  link, never by riding to it.

---

## 2026-08-12 — The fan wraps the button; the logo rests gold and becomes the way home

Three requests in one pass, two of them explicitly judgement work: *"Do not
build this from the spec alone … The description sets the structure, visual
judgment sets the details."*

**Provenance note.** This pass began with an unclean tree: `journey/rail.js`
and `journey/site.css` carried 378 uncommitted lines dated the same day and
already implementing most of Task A, from an interrupted earlier session. The
brief said the tree was clean, so this is recorded rather than passed over.
The work was kept — its geometry is right and its reasoning is sound — but
every empirical claim in its comments was re-measured rather than trusted, and
two of them turned out to be false (below). Both were corrected in place. The
inherited state is preserved at `scratchpad/INHERITED.patch` for the session.

### A — the cluster

The brief's ring, implemented as written: seven cells, being the 3×3 grid
around the button minus the top-left one the path never rests in; slot 1
directly above and always the active section; then left, bottom-left, below,
bottom-right, and the overflow continuing to right and top-right. Position is
polar — one animated angle per slot with the radius derived from it by the
square law `pitch / max(|cos a|, |sin a|)` — so an item shifting more than one
cell tracks the square's own perimeter *through* the cells between rather than
cutting the chord across the button. A chapter change is one monotone
rotation: every item steps clockwise, and the item leaving slot 1 continues
clockwise through the two empty overflow cells to the tail rather than
crossing the middle. `rail.js` falls back to the shipped column if a manifest
ever outgrows the seven cells.

The column is untouched and still ships for touch: the cluster is written
under `(hover: hover)`, which is the negation of *"where hover does not
exist"*. Everything outside geometry is shared — the 120 ms dwell, the
`pointerdown` menu, the touch arming, the `:has(:focus-visible)` keyboard
state, the halo, the reticle.

**What the hard-won behaviours became.** The fan no longer anchors on the
current mark; it anchors on the **button**, which in this geometry never moves
at all. That is a replacement, not a loss, and it is strictly better: the
column had to slide the button down to hold the foot of an opening stack, and
that motion is precisely what lost its first click (`26ca8d3` → `48b7795`).
The cost is that the resting pair now sits with the button on the viewport
centre and the current mark a pitch above it, rather than the mark on centre —
the open cluster is balanced about the centre instead, which is the right
trade for a block. The 44 px abutment promise, the 120 ms dwell and the
`pointerdown` menu all carry over unchanged.

**Refined by eye, after shooting.**

1. **The cells did not tile.** A pitch-wide, 44 px-tall tile leaves a 4 px
   seam per row in a grid that is a pitch in *both* axes. Measured travelling
   the pointer straight down from slot 1 to the button: at y = 424 and y = 426
   nothing matched `.j-rail-item:hover`. The fan survived (the cluster's pad
   keeps the pointer inside `.j-rail-inner`) but the name pill blinked out on
   every vertical traverse. Tiles are now the pitch square — 48 px, so the
   44 px touch minimum is a floor this clears rather than meets — the anchor
   moved to half a tile so the taller cell does not hang the cluster low, and
   the hairline moved onto the seam the square cells create, where it lands
   exactly halfway through the 24 px of clear air between the two glyphs.
   After: `:hover` unbroken across every traverse in both axes.

2. **The names cleared the whole cluster instead of their own row.** One flat
   offset pushed every pill out to the cluster's left edge. That is necessary
   for the full rows and wrong for slot 1, which is the pill a visitor sees
   most — it is the active section, and it is the mark the pointer is on when
   the cluster opens — and it left the label an empty cell away from its own
   mark, reading as floating rather than as belonging. `pillClearance()` now
   counts cells to the leftmost *occupied* cell of each row, so slot 1 sits
   against its mark (the top row's left cell is the one the path never uses,
   at five chapters or at seven) while the three full-row pills still land on
   one line. Derived, so six and seven chapters come out right without an
   edit. Measured after: slot 1 at 5 px from its own tile, rings 1–4 all on
   the cluster edge at x = 1289.

3. **The pill then touched the reticle.** Slot 1 is the tile that wears
   things — the reticle at inset −5 px, and a focus ring at the shared 3 px
   offset lands in the same place. At the first build's 0.3 rem (4.8 px) the
   pill's edge and the bracket were touching, and it read as a collision.
   0.72 rem puts ~6 px of air past the bracket.

4. **Three names drew in one heap.** `.j-rail-open` — the touch arming —
   reveals every name at once, which a single file can do and a cluster
   cannot. On the one machine that matches `(hover: hover)` *and* can set that
   class (a 2-in-1 in touch mode), the three bottom-row pills all drew at
   y = 486.8 (x = 1207.8 / 1211.5 / 1201.6), with the epilogue's and the
   button's overlapping a row above. In cluster geometry the blanket reveal is
   withdrawn and the active section's name stands in for it — the one pill
   that cannot collide, in the top row over the cell the path never uses.
   Pointing and keyboard focus are untouched.

**Two inherited claims corrected.** The first build's prose said the tiles
abutted at a 44 px pitch (they did not — the pitch was 48 and the tiles 44),
and that `:hover` does not re-evaluate under a stationary pointer when the
layout moves beneath it. The second is false in Chrome and was worth
recording: held still on slot 1 through Connect → Owned, the pill went out and
came back reading **OWNED**, the section that had arrived under the cursor —
not a stale CONNECT carried round to the far side. The turn suppression is
kept, restated as what it actually is: cosmetic cover for the transit, not a
correctness fix, with its 460 ms sized to outlast the 420 ms angle transition.

**Tab order stays manifest order,** not ring order. Ring order is distance
from the active section and therefore reshuffles on every navigation, which is
a WCAG 2.4.3 focus-order smell; manifest order is the narrative order and
preserves meaning.

### B — the logo rests gold

This **overrides `8b29670`**, which deliberately rested the B in parchment and
lifted it to gold on the reasoning that gold is this site's *lit* state and
spending it at rest is what had made the earlier Discord badge shout. Hannah's
call, for this control; the reasoning is untouched elsewhere and `.pill-ic` is
not edited. The mark is a CSS mask painted with `currentColor`, so this is two
colour values and no new asset.

Shot in the real row on the real background at 1440, 1280 and 375, at actual
size, against parchment .82, `#f0c877`, `#eec27f`, `#e9c489`, `#e6bd6e`,
`#d9a441`, `#cf9a33`, `#e0a838` and `#e8b04a`.

**Rest `#e6bd6e`.** "Lighter gold" has a floor: it must still read as gold,
and in Lab the giveaway is b\*. The lighter candidates run `#e9c489` at 34.5
and `#eec27f` at 39.5, and both go creamy against this near-black ground —
they drift back into the parchment family and look exactly as washed out as
she warned. `#e6bd6e` holds b\* 45.1 at L\* 78.7. It is deliberately **not**
`--gold-bright`: that token is what every other control reaches only on hover,
so resting in it would leave the logo permanently wearing its neighbour's lit
colour, with nowhere brighter to go.

**Hover `#e0a838`.** Every gold-to-gold step is small next to what this
control used to do — parchment → gold measures ΔE 39.3, and the widest honest
step available inside gold is ΔE 19.2. It is also the right *kind* of step:
a\* and b\* climb 5.2 → 10.3 and 45.1 → 62.4 while L\* falls only
78.7 → 72.3, so it deepens by **saturation** rather than by going dark, which
is what "heavier, richer" describes. `--gold` `#d9a441` (ΔE 15.0) and
`#cf9a33` (ΔL −11.7) spend more of the change on dimming and read duller
rather than richer. The existing glow is what keeps a deepening hover from
reading as a dimming one; on a lattice of hairlines that halo carries most of
the perceived lift, which is why the hover tone can afford to lose lightness
at all.

Both tiers moved together — `static/index.html` carries its own copy of these
rules and would otherwise have become a sixth drift error.

#### On the pair — reported, not acted on

Only the logo was in scope, so nothing was changed on `.pill-ic`; this is the
reading.

- **At rest the row is one gold mark and one parchment mark.** This reads as
  *hierarchy*, not as a mismatch, and it is arguably an improvement: this
  file's own ring note (2026-08-11) already concluded that "the logo has to
  lead the row", and until now the only thing making that true was size. The
  peerage `5762167` engineered was peerage of *ink*, and the row can lose it
  without losing composure.
- **The real incoherence is the lit states, which now point in opposite
  directions.** The logo deepens (L\* 78.7 → 72.3); `.pill-ic` brightens
  (parchment → `#f0c877`, L\* ≈ 79 → 82.5). So hovering the Discord mark makes
  the *secondary* control momentarily lighter and more brilliant than the
  resting primary one, and the row has two different grammars for "lit".
- **The logo's hover is also now a much smaller event than its neighbour's** —
  ΔE 19.2 against `.pill-ic`'s ΔE 40.7, roughly half the perceptual step.
- **Smallest fix, if she wants one:** take `.pill-ic`'s lit tone to the logo's
  `#e0a838` and leave its parchment rest alone. One grammar for "lit", the
  new rest hierarchy preserved, and no return of gold-at-rest to the corner
  `58a63c3` was called out for.

### C — the logo travels home

Through `window.journey.flyTo`, the handle the rail's tiles and the two hero
callouts already use — not an href, because `239d6c7` removed hash routing
outright and the ride writes nothing. Going through the shared handle means
the jump is inherited by construction rather than re-implemented: the
cylindrical arc (`043a1f2`), the destination copy keyed off the arrival
(`d1ecc23`), the destination chapter suppressed through the blend
(`a8d4518`), and the rail's active mark following `chapterAt(p)`.

The href becomes the honest `#/mission` rather than the placeholder `#`, kept
for the reasons the callouts keep theirs — a real link for the keyboard and
for "open in new tab", arriving as an inbound deep link that boot places and
then cleans. It also puts Tier 1 back in step with Tier 3, whose logo has
pointed at `#/mission` and acted as a home control since it shipped. No
`isTouch` gate, unlike the callouts: those are gated because their tags do
something else entirely on touch, and the logo has no second job.

**"It must not fire in a way that feels like a jolt when the visitor is
already at the hero."** Measured in both directions, because the worry is real
in principle: a jump blanks the destination's copy for the whole blend, so a
jump travelling almost nowhere would take away the hero copy being read and
hand it back a second later. Sampling the hero block's opacity every 40 ms, a
click at p = 0.02 does exactly that — 1.00 straight to 0.00, still 0.00 two
seconds later.

But **p = 0.02 is not a state this site can be in.** The scroll surface rests
only at chapter poses: wheeled from a cold load it settles at 0.0000 (10 and
16 notches, hero copy still 1.00) or at 0.2600 in Inspire (24 notches and up),
with nothing in between. 0.02 exists only under the QA `?p=` flag, and the
surface was actively settling out of it even while it was being measured — the
first two attempts at this measurement disagreed with each other for exactly
that reason. So "already at the hero" always means p = 0, where
`directJumpTo`'s own 1e-4 refusal fires first. No special case was added, and
a note is left in `main.js` for whenever the ride gains free scrolling.

### Gates

- **Cluster shot at rest, hovered and mid-shift** at 1440×900, 1280×800 and
  375×812. Cells land exactly on the ring at every size (1440: slot 1
  (1366, 402), slot 2 (1318, 450), slots 3–5 across y = 498 at x = 1318 /
  1366 / 1414, hub (1366, 450)). Mid-rotation frames captured by driving CDP's
  Animation domain at 0.09× playback: the wrapping item is visibly outside the
  hub travelling the perimeter, every other item stepping one cell the same
  way round.
- **`:hover` continuity**: unbroken on every sampled pixel from slot 1 through
  the hub to slot 4, and straight across the bottom row.
- **Keyboard**: all five tiles and the button reachable, each 48×48, each
  `:focus-visible`, cluster held open by `:has(:focus-visible)`, name shown
  per focused tile, `aria-current` on the active one, Enter navigating
  (Owned focused → `window.journey.chapter === 'owned'`).
- **Reduced motion**: every ring index at its final cell within 50 ms of a
  chapter change — lands correctly, no animation.
- **Touch unchanged** at 375×812 with `(hover: hover)` false: single file at
  x = 349, 44 px pitch (318 / 362 / 406 / 450 / 494), 52×44 tiles, all six
  names revealed on the arming tap — i.e. exactly the shipped column.
- **Hit model (`6903c4a`)**: the only full-viewport hit-testable elements
  while closed are the stage `div` and the `CANVAS`; sampled points across the
  frame all resolve to `CANVAS`, so the poke still works.
- **Logo, both states**, shot at all three sizes; computed colour
  `rgb(230,189,110)` → `rgb(224,168,56)` in both tiers.
- **Logo travel**: to the hero from Inspire, Connect, Owned and Final by
  pointer; from Owned by keyboard (Tab to a focus-visible logo, Enter); from
  Connect by tap at 375×812. Every landing p = 0, chapter `mission`, rail
  active mark `mission`, `location.hash` empty throughout. 40–63 sampled
  frames per blend with the camera radius travelling (1.82 → 10.64 from
  Owned), so the arc runs and nothing snaps. At the hero: camera unchanged to
  four decimals with zero spread, fov unchanged, hero copy pinned at 1.000.
- **Console over a full ride** — scroll both ways, all five chapters by
  `flyTo`, the cluster opened and traversed, the menu opened and closed by
  Escape, both logo presses: **clean**, and the URL never left
  `http://localhost:8137/index.html`.
- **`python3 tools/capture.py --check`: PASS** — all ten frozen references at
  MAE 0.00/255, run after all three tasks. No golden file modified.

### Residuals

- **The `.pill-ic` pair imbalance above is open** — reported, deliberately not
  acted on, since only the logo was in scope.
- **The resting pair sits a pitch higher than the column's did**, because the
  cluster anchors on the button rather than on the current mark. Deliberate
  (it balances the open block on the viewport centre) but it is a visible
  change to the closed instrument, not only to the hover state.
- **The mid-rotation frame is loose by nature.** For ~420 ms the marks are at
  non-cell positions and the block reads less like a cluster than it does at
  either end. Nothing is wrong with it; it is simply the honest cost of
  animating a rotation rather than snapping, and it is the part most worth a
  second opinion on screen.
- **`?p=` places somewhere the scroll surface will not hold.** Not new, and
  harmless for QA, but it makes any measurement taken through that flag near a
  chapter rest untrustworthy unless the settle is checked — as it was here,
  twice, before the reading was believed.

## 2026-08-12 (later) — The hero furniture arrives with the camera, and gets one owner

Hannah: *"There is a sequencing issue with the hero / first-section labels …
the hero labels currently flash into view immediately and then disappear,
before later appearing again as part of the proper section sequence. … There
should be a single authoritative condition controlling their visibility,
aligned with the proper hero load/entrance sequence."*

She also asked for the structural cause rather than a delay, and guessed the
shape of it correctly: *"the labels are reacting to the destination section
becoming active before the actual camera/section entrance sequence has
completed."*

### The instrumented diagnosis — three writers, two clocks

Traced frame by frame at 1440×900 through a rAF sampler registered after the
scene's own animators, so every row is the state that frame actually
presented: container opacity, per-callout `visibility`, the `.co` / `.tag`
keyframe opacities multiplied into one effective on-screen alpha, `inert`, `p`
and the live camera position. Run through a logo click from each of the four
rests, the rail from each rest, the site-map panel, a real wheel scrub upward,
and the scroll wrap.

Three things write these elements, and they do not share a clock:

1. **`journey.js` `applyFrame`'s `heroFurniture` loop** — `opacity = 1 -
   smooth01((p - 0.006) / 0.05)`, a pure function of `p`. `p` is journey
   STATE, and a nav jump snaps state to the destination in a single `dt = 0`
   tick (`directJumpTo`) while the camera takes 0.85–4.00 s to follow. So the
   furniture was written to **full opacity on the click frame**. Measured
   onsets against camera landings:

   | route | labels reach α 1 | camera lands | early by |
   |---|---|---|---|
   | logo ← Inspire | 314 ms | 1538 ms | 1.22 s |
   | logo ← Connect | 291 ms | 1300 ms | 1.01 s |
   | logo ← Owned   | 155 ms | 1177 ms | 1.02 s |
   | logo ← Final   | 146 ms | 1218 ms | 1.07 s |
   | rail ← any     | 179–240 ms | 1246–1373 ms | ~1.1 s |
   | site-map ← Final | 1370 ms | 2480 ms | 1.11 s |
   | **scroll wrap** | **140 ms** | **3938 ms** | **3.80 s** |

   (The click lands at t ≈ 120 ms in every trace; scrolling up is honest —
   1076 ms against a 1076 ms landing — because a scrub has no camera that
   disagrees.) **This is the writer that made them appear early.**

2. **`organism/furniture.js`'s tracker projection** — `visibility = z < 1`,
   keyed to the CAMERA. The only one of the three that was honest, and with
   (1) holding the container open it was doing its frustum cull in front of
   the visitor. From the **Owned** rest the INSPIRE anchor sits behind the
   camera plane, and the trace is Hannah's sentence verbatim:

   ```
   t=155  p 0.725→0   boxA 0→1   inspire α 1   visibility visible
   t=167  p 0         boxA 1     inspire α 0   visibility hidden   ← one frame later
   … 294 ms of nothing …
   t=461  p 0         boxA 1     inspire α 1   visibility visible  ← camera still 716 ms away
   ```

   Visible, gone one frame later, back 300 ms afterwards, all of it before the
   camera arrives. It is a **cull, not a reveal**, and it needed no change:
   hold the container shut for the flight and the whole flicker happens inside
   something nobody can see. `d46e6bb`'s jitter-free projection is untouched.

3. **`ui.js`'s `calloutsEl.inert = !(p <= 0.01)`** — keyed to `p`, so the same
   fault in the a11y channel: three off-screen links handed to the tab order
   on the click frame and held there for the whole jump (`inert` false at
   t = 155 ms above).

(1) and (3) trust journey state, which snaps. (2) trusts the camera, which
travels. Neither is wrong on its own; there was simply **no owner**. This is
the third instance of the same class — `a8d4518` fixed it for chapter
geometry, `d1ecc23` for the section copy — and the hero's own furniture had
never been given a ticket.

### The single authoritative condition

> **PRESENCE × ARRIVAL**, computed once and written by one function,
> `journey.js`'s `paintHeroFurniture`.

- **`presence(p)`** is the shipped composition term, byte for byte:
  `1 - smooth01((p - 0.006) / 0.05)`. It owns the scrub in both directions, so
  leaving the hero releases exactly as before and scrolling back up returns
  exactly as before — neither route has a camera that disagrees, so neither
  route needed changing, and the measured traces confirm both are identical.
- **`arrival`** is the missing half: 0 while a jump is flying *into* the hero,
  easing to 1 on the same envelope and the same C2 ease the destination copy
  already uses (`COPY_JUMP_LEAD` 0.55 / `COPY_JUMP_TAIL_S` 0.15 s), so the
  furniture and the sentence it frames arrive as one movement rather than two.
  It is 1 at every other moment — which is why a cold load, a deep link and
  every `?capture=` still are unchanged: none of them has a blend in flight.

`inert` moved onto that same number, thresholded identically to
`pointer-events` (α ≥ 0.05), so the picture, the hit tree and the tab order
are now one statement rather than three differently-timed ones. Nothing about
the callouts is written from `ui.js` any more.

Two details that are not optional:

- **The arm repaints in the same task.** `placeAt()` has already run two
  `dt = 0` `applyFrame` passes by the time `directJumpTo` can call
  `armHeroEntry`, so the furniture is sitting at full opacity right then;
  deferring the correction to the next animator frame ships one rendered frame
  of exactly the flash being removed. Same reasoning and same shape as
  `ui.armCopyEntry`.
- **Manual input hands back continuously.** `stepCamBlend`'s input drop calls
  `cancelHeroEntry()`, which releases the *authority* but never the *value* —
  the gate then relaxes to 1 on `COPY_IN_K`, so the furniture breathes in from
  wherever the envelope had reached instead of snapping.

### Should the CSS entrance and the JS write remain two systems?

**They stop being independent, but the load choreography stays the load's.**
The 1-2-3 instrument power-up in `hero.css` (`co-on` … `no-flicker`,
`--d` 5.55 / 6.20 / 6.85 s) and the per-frame opacity write were never really
competing — they multiply. What made them read as two systems is that the JS
side had no notion of *"the hero has been arrived at"*, so it asserted
presence at moments the entrance had never sanctioned. Giving it that notion
is the entire fix; the JS scalar is now unconditionally on top, and the
keyframes are a member of it rather than a peer.

Re-running the power-up on every arrival was considered and **rejected**: the
hero COPY does not re-run its ink wipes on arrival either (`ui.js` builds no
`mission` block, by construction), the callouts are that copy's furniture, and
a 1.5 s boot sequence every time the home control is pressed would make the
mark feel heavy. The power-up is the *page's* entrance, not the *section's*.
One authority over whether they are there; one choreography for how they first
appear.

### Gate results

- **Frame-by-frame trace, before and after, per arrival route** — logo from
  Inspire / Connect / Owned / Final, rail from all four, the site-map panel,
  a real wheel scrub upward, and the scroll wrap (`2c22844`). After: the
  container holds **0 through the whole lead** on every jump, the ramp opens
  at ~70 % of the flight and settles at α 1 a beat *after* the camera stops
  (e.g. Final: α 0.006 at 783 ms, 0.084 at 874 ms, 0.93 at 1239 ms, 0.992 at
  1315 ms, camera landing 1217 ms). **One run, peak 1.000, `flash: false` on
  every route and every callout** — including the two that previously showed a
  genuine two-run flash (logo ← Owned, rail ← Owned).
- **The wrap**, traced over a 4.4 s window to cover its 4.00 s flight: on at
  2729 ms, settling at 1 — against 140 ms before. Its arrival is the biggest
  single win on the page.
- **Scrolling up is untouched**: 1006–1076 ms onset against a 1020–1076 ms
  landing, before and after.
- **Leaving the hero is untouched**: traced rail → Final from the Mission
  rest, before and after — `boxA` 1 → 0 and `inert` false → true on the click
  frame in both, settled tail `{0}` / `{true}` in both.
- **Cold load unchanged**: real 9 s load trace, no flags. Label onsets
  5513 / 6162 / 6813 ms before → 5498 / 6149 / 6802 ms after (−15 / −13 /
  −11 ms, i.e. under one frame of navigation-timing jitter; the authored
  650 ms spacing is preserved to 651 / 653 ms). Container opacity is `{1}` and
  `inert` is `{false}` for the entire load — the journey layer never touches
  it.
- **Reduced motion** (`prefers-reduced-motion: reduce`, emulated): labels at
  α 1 on the first sampled frame (19.9 ms) — the CSS entrance is off and they
  simply *are* there, which is the contract. Leaving releases them to 0 and
  `inert`; coming home gates 0 → 1 correctly. No keyframe was added or
  changed.
- **Placement survives**: `2e6ed4b`'s right-side hang, `e20f7ff`'s no-wind
  hold, and the click behaviour — `#/inspire` and `#/connect` hrefs live
  (INSPIRE clicked → `chapter === 'inspire'`), EQUIP still `#` with its
  `.soon` reveal present and inert.
- **Console over a full ride** — cold-ish load, every nav surface, both
  directions of scrub, the wrap, the menu, a callout click and two logo
  presses: **clean**, no warning, error, uncaught exception or rejection.
  Final `debugState` at rest: `p 0`, `mission`, hash empty, hero pose.
- **`python3 tools/capture.py --check`: PASS** — all ten frozen references at
  **MAE 0.00/255**, `mission@*` included. No golden file modified (SHA-256 of
  all ten identical before and after).

### Residuals

- **Leaving the hero still snaps.** `presence(p)` drops the furniture to 0 on
  the click frame of an outbound jump, while the camera is still standing at
  the Mission pose — the mirror image of the fault just fixed, and the same
  shape. It was explicitly held out of scope ("leaving the hero releases them
  as it does now") and it reads far better than the inbound case did, because
  a fast release is what departure is supposed to feel like. It is still
  logically the same asymmetry and is the obvious next thing to look at.
- **The arrival reveal is simultaneous, not numbered.** All three come in
  together on one envelope, which is what the scrub has always done and what
  makes the arrival consistent with it. A staggered 01-02-03 arrival that
  echoed the boot-up was deliberately not invented here; if it is wanted it is
  a design call, not a bug fix.
- **A deep link to a later chapter still shows the boot-up first.** On a cold
  load of `#/inspire` the CSS entrance runs over the hero at 5.5–6.9 s and the
  journey then places at Inspire at 7.6 s, so the callouts appear and are
  removed. Pre-existing, untouched by this change, and outside the reported
  fault — but it is the one remaining place the load choreography and the
  journey's placement disagree about who the page belongs to.
- **`cam_land` in the traces is a floor, not a stopwatch.** The documentary
  handheld layer never fully stops, so the "camera landed" column is derived
  from a 2 mm/frame motion threshold and can read late on long flights. Every
  before/after comparison above is drawn from the same detector, so the
  deltas are sound; the absolute landings are ±1 frame at best.

---

## 2026-08-13 — The bubble peels off the button: the current section becomes a SLOT

> "The menu control should feel attached to the right edge of the viewport.
> Right now it sits slightly too far inward … It may also benefit from being
> slightly larger … When the navigation is not being hovered, the control
> should remain very compact. There should be a small circular current-section
> icon associated with the menu button … The key rule is that the current
> section must always end up immediately to the left of the menu button …
> (1) The current section icon should first move smoothly out to the left …
> (2) Once it reaches that position, the other section icons should emerge from
> around/below it … (3) arrange themselves around the current item in a loose
> circular or ring-like structure … (4) As the user scrolls through sections,
> this ring should rotate/update smoothly, while the current section continues
> to occupy the fixed position immediately left of the menu." — Hannah,
> "the biggest refinement"

**Files:** `journey/rail.js`, `journey/site.css`. Nothing else.

**This supersedes the L-shaped cluster of 2026-08-12 (`e5bdc69` / §"The fan
wraps the button").** That geometry hung the sections off the button in a 3×3
block with the active one directly ABOVE it. Here the active one sits
immediately LEFT of the button and never moves again; everything else turns
around it.

### Provenance

This pass began with an unclean tree: `rail.js` and `site.css` carried 602
uncommitted lines from a session cut off by a network error before it could
verify or commit. That work implements the geometry and the staging above and
its reasoning is sound; it was **inherited and kept**, and every empirical
claim in its comments was re-measured rather than trusted. Two did not survive
(below). What follows is the shipped state, not the inherited one.

### The geometry, as shipped (measured at 1440×900)

One circle, two numbers on it.

| | |
|---|---|
| anchor | (1410, 450) — the button's centre, `--cl-edge` 2px off the frame |
| **the hub** | the menu button. Box 1382…1438 × 422…478 (56px). It does not move in ANY state — not on unfold, not on fold, not on a chapter change |
| hub glyph | 28px at 1398…1426 → **14px of air to the viewport edge** |
| **the bubble** | centre (1394, 428) — `--cl-bx` 16 / `--cl-by` 22 up and left of the hub's centre, overlapping its shoulder. A 32px hairline circle on a 0.66 ground, mark at `--cl-bub` 0.64 (15.4px) |
| **the slot** | (1352, 450). `--cl-cur` = 58px left of the hub centre, 6px box-to-box. A POSITION, not an item |
| **the ring** | the circle whose RIGHTMOST POINT is the slot: centre (1284, 450), radius **68px**. `x = r·cos a − r`, `y = r·sin a`, `a = 0` at the slot |
| the five points | 0, ±72°, ±144°. At Connect: inspire (1305, 385), mission (1229, 410), owned (1305, 515), final (1229, 490) |
| tiles | 48×48 sections, 56×56 hub — PL-1.4's 44px is a floor both clear, not one they meet |

`--cl-rad` is derived in rail.js from the chapter count (`(TILE + AIR) /
2 sin(180/n)`, floored at `RAD_MIN` 68) and only falls back to the column past
eleven chapters. Verified: at n = 5 the formula asks for **62.95px** and 68
ships — the inherited comment's "63px" is right.

**Point 4 falls out of the geometry rather than being enforced.** The item at
the slot has angle 0, so `r·cos 0 − r` and `r·sin 0` are both zero: it is the
transform's fixed point and is not special-cased anywhere.

**The ring order is a cycle, verified at every chapter**: the two PREVIOUS
sections sit above (nearest at upper-right), the two UPCOMING below (nearest at
lower-right), wrapping. At Final: owned and connect above, inspire and mission
below.

### The staging is real, and it is one clock

`--t` is the peel, `--u` the unfurl, and `--u` is delayed by exactly the peel's
duration (`--cl-travel`), so "once it reaches that position" is structural.
Traced per frame at 1440×900 through a real pointer dwell:

| t | what the frame shows |
|---|---|
| 0…150 ms | the 120 ms dwell. Nothing moves |
| 150 ms | `.j-rail-hot`; the bubble leaves the shoulder |
| 150…540 ms | it travels to the slot, growing to full size, its circle fading out across the whole trip. Every slot carries the peel, but only the current one is visible while it does — which is what makes it read as the bubble itself moving |
| **541 ms** | **arrival.** (1352, 450), exactly the slot. The reticle begins to close on it |
| 608 ms | the others first appear (opacity 0.16) and start out of the spot it now occupies |
| 675…941 ms | they sweep ROUND the orbit — `--u` scales the ANGLE, not the offset, so the marks are on the ring for the whole journey and the drawn circle is the path they took. The ±1 pair leads, the ±2 pair follows |
| 1075 ms | settled |

The fold is the same two quantities backwards, the ring collapsing into the
slot before the bubble walks home.

### What I refined by eye, and why

1. **The bubble moved onto the button's shoulder** — `--cl-bx` 0 → 16,
   `--cl-by` 27 → 22. Shot at (0,27), (16,22), (22,18), (10,30) at rest and
   mid-travel. Dead above — the inherited value — reads as a **stack**: two
   right-aligned marks in a column, the badge sitting *on top of* the control
   rather than *on* it, and the peel then leaves diagonally (left 58, down 27)
   where the brief says "out to the LEFT". On the shoulder the pair reads as
   one object with an indicator attached and the travel flattens to left 74 /
   down 22 — the same landing, arrived at along the axis the sentence names.
   (22,18) goes far enough to read as two things side by side; (10,30) reads as
   (0,27) with a mistake in it. The `::before` hit pad is sized off `--cl-bx`
   and `--cl-by`, so it followed the bubble without an edit.

2. **The hub glyph 26 → 28px.** Shot at 24 / 26 / 28 / 30 in the real row
   against the bubble's 15.4px mark. At 24 and 26 the list glyph is visibly
   SUBORDINATE to the badge riding on it — the indicator outweighs the control,
   which is backwards for the one thing on this flank a visitor presses. At 30
   the bullets coarsen against a page drawn in hairlines and the circle's lower
   arc runs into the glyph. **28** is where the button leads: bigger than the
   24px section marks, bigger than the badge, still a drawing. This is the
   brief's "slightly larger", and with it the 2px box gives the glyph the same
   **14px** optical gutter the 52px column shipped with.

3. **The expanded scrim is now isotropic.** It was 2r+210 wide by 2r+140 tall —
   an ellipse over a circle — so the four marks did not get the same cover: the
   left/right pair sat at 39% of the box's half-width and the top/bottom pair at
   49% of its half-height, i.e. further down the same falloff. Measured over
   Final's lit field, where it shows: **the top and bottom marks were the two
   that read soft, and they are exactly the two the ellipse under-served.** Same
   alphas, same stops, same recipe; only the box is round now, which puts every
   mark at the same 39%. Shot against 200/0.86 (starts to read as a disc over
   Owned's colony) and 240/0.80 (gives the top mark back to the field).

4. **The resting halo is centred on the resting pair**, derived as
   `(−bx/2, −by/2)` from the anchor so it follows the bubble. Written out it was
   26px left and 14px below the pair it is supposed to sit under — inherited
   from when the bubble was dead above the button, and worse the moment it moved.

5. **The narrow-window step-back.** `body.j-rail-on` — the 2026-08-07 mobile
   pass's 0.14 step-back for the chapter copy and the hotspot chips — was
   TOUCH-ONLY, because the geometry it was written for is a 52px column and at a
   phone width hover does not exist. The ring changed that: a hover-capable
   window at 375 opens a 184px circle straight across the frame, and shot at
   that size the chapter copy and the Learn-more / Remix pills ran right through
   it. The class now tracks BOTH states JS owns. The rule lives inside
   `@media (pointer: coarse), (max-width: 720px)`, so **nothing on a desktop
   moves.**

**Checked and deliberately left alone:** the reticle's `--cl-travel` delay. Shot
frame by frame through a turn at 0.1× — the brackets ghost in at +380 ms on a
mark that is 90% arrived and decelerating, and close at +500. It reads as the
mark being *claimed*, not *dragged*, which is what that delay was for.

### Two inherited claims did not survive measurement

**(1) "THE RESTING BUBBLE: up and to the left of the hub's centre."** False as
shipped: `--cl-bx` was `0px` and the bubble sat dead above the button, measured
at (1410, 423) against a hub centre of (1410, 450). Corrected by making the
comment true rather than by weakening it — see refinement 1.

**(2) "Chrome does re-hit-test `:hover` when the layout moves under a stationary
pointer."** **False**, and this one was a live defect. Every mark on this ring is
placed by `transform`, and a transform-only move produces no pointer event, so
Chrome never re-runs the hit test. Measured at 1440×900, pointer parked on the
slot at (1352, 450), Connect → Owned, no mouse movement at any point:

| | now | `:hover` | position | name pill |
|---|---|---|---|---|
| before — connect | 1 | **1** | (1352, 450) | **1.00** |
| after — connect | 0 | **1** | (1305, 385) | **1.00** |
| after — owned | 1 | 0 | (1352, 450) | **0.00** |

`elementFromPoint(1352, 450)` returned **owned**. So the label "CONNECT" was
drawn against a mark 80px up the ring while the mark genuinely under the cursor
had none — and it stayed that way until the pointer moved (a 1px nudge corrected
it instantly). This is the *second* time the claim has been recorded backwards:
the 2026-08-12 cluster pass wrote it down as a measured finding ("the pill went
out, and came back reading OWNED"). What that measurement caught was the `.now`
CLASS moving to Owned — a JS write, so `.j-rail-slot.now .j-rail-name` really
did read "Owned" — and not the pill being revealed. Its opacity was 0.

**The fix — `.at`.** The pointer's position is a fact JS can read, so JS reads
it: `rail.js` tracks the last pointer position and resolves the slot under it
with `elementFromPoint`, publishing `.at`; the stylesheet drives the ring's name
reveal from `.at` and puts a stale `:hover` on any other slot back down. It is
re-resolved on every pointer move (where it simply agrees with `:hover`) and
once more when a turn settles (where it does not) — which is exactly when the
names are allowed back. `:focus-visible` is untouched: focus follows the
element, not the point, so a rotation cannot strand it. The column is untouched.

**Claims that DID survive**: the derived radius (62.95 asked, 68 shipped); the
`RAD_MIN > 60` argument for the current pill clearing the ±2 marks (they sit
±40px away and no pill collides with any mark at any chapter or size); the
"lowest occupied point is 65px down and 105px out" that places the MENU pill;
the staging being one clock; and the 48/56px targets. The "front-loaded curve
carries a mark 55% round in 1/6 of the duration" reading is inherited from the
cluster pass and was not re-measured here — the curve it justifies is unchanged.

### What the hard-won behaviours became

- **The 120 ms dwell survives verbatim.** Measured: a 50 ms transit leaves
  `hot = false`; a 400 ms dwell opens; leaving folds.
- **The menu still opens on `pointerdown`** (`48b7795`). Measured: `menuOpen`
  is true after `mousePressed` alone, before any release.
- **Pitch-square tiles are gone, and replaced by something better.** A ring
  cannot tile — points on a circle have air between them by definition. What
  the square cells actually protected was "an open control must not fold
  because the pointer crossed a seam", and that is now the **pointer floor**
  (`.j-rail-list::before`), sized off the full circle and live only while open.
  Measured: **156 sampled points** walking the whole ring slot → inspire →
  mission → final → owned → slot → hub — **zero folds, and not one point where
  the control lost the pointer to the canvas.** The column keeps its abutting
  tiles unchanged.
- **Name pills clear the occupied cells, not the whole cluster** — restated for
  a ring as `--pillx`: every non-current pill is held off to the circle's own
  leftmost point so they land on ONE vertical line (x = 1193.5 at 1440), while
  the current item's is zero and hangs directly off its own mark. Derived; no
  collisions measured at 1440, 1280 or 375.
- **Touch keeps the current behaviour.** The whole ring is written under
  `(hover: hover)`. Measured at 375×812 with `hover: none`: the shipped column,
  single file at x 323…375, 44px pitch, 52×44 tiles, all six names on the arming
  tap, second tap acts, first tap on the menu mark opens the panel.
- **The epilogue** keeps its real link and its quieter voice, and the rail shows
  its own symbol at rest — verified: at the Final rest the bubble carries the
  epilogue's glyph and the open ring marks it current with the reticle.

### Gate results

| Gate | Result |
|---|---|
| References | **PASS.** `python3 tools/capture.py --check`: **10/10 at MAE 0.00/255, 0.0% px > 8** — all ten frozen frames byte-identical, `mission@*` included. No golden file modified (`git status` clean but for the two source files). |
| Screenshots | Resting / bubble mid-travel / the moment it arrives / the others emerging / fully unfolded / the ring mid-rotation, at **1440×900, 1280×800 and 375×812**, mid-transition frames shot over CDP's Animation domain at 0.1× playback. Plus rest + open at all five chapters, and the turn frame by frame at +0/120/240/380/500/700 ms. |
| Keyboard | **PASS.** Tab order `skip → logo → Discord → mission → inspire → connect → owned → final → Menu → hotspots`. Every tile 48×48 and the button 56×56, each `:focus-visible`, each revealing its own name; `:has(:focus-visible)` holds the ring open with the slots at their ring positions; `aria-current` on the active one; Enter on Owned → `journey.chapter === 'owned'`; Enter on the button opens the panel with focus on Close; the trap cycles 16 focusables and Shift+Tab wraps; Escape closes and returns focus to the button. |
| Reduced motion | **PASS** (emulated). 50 ms after the dwell the ring is fully deployed with every slot at its own point and opacity 1; 60 ms after a chapter change every slot is at its new cell; 100 ms after leaving all five are back at the bubble with only the current one visible; the menu is at opacity 1 within 120 ms of the press and `closeMenu` skips its fade timeout. The staging included: with no durations there is nothing for stage 2's delay to wait for. |
| Touch | **PASS**, unchanged — see above. |
| Hit model (`6903c4a`) | **PASS.** Closed, 63/63 sampled points across the frame resolve to `CANVAS`; the only elements covering ≥12% of the viewport with live pointer-events are the stage `div` and the `CANVAS`. A `pointerdown` at (700, 600) reaches the canvas — the poke works. |
| Pointer floor | **PASS.** 156 points, zero folds — see above. |
| `.at` | **PASS.** One `.at` and exactly one pill per mark, the right one, at all five ring positions and the slot; none over open air inside the ring; MENU on the hub; cleared on leave; the turn resolves to the mark actually under the cursor. |
| Console | **CLEAN** over a full wheel ride (p 0 → 0.970, all five chapters crossed) and back to p = 0 with the hero pose exact (−2.25, 2.25, 10.4), plus the ring opened and traversed, the menu opened and closed, the reduced-motion pass and the touch pass. Error/warn/uncaught/rejection trapped from document start. URL never left `/index.html`. |
| Both tiers | Tier 3 is on the COLUMN and was not touched — its documented divergence (§5, 23 §8): it has no hover-driven ring and ships expanded under no-JS, so the column is its correct geometry for the same reason touch keeps it. Drift guard: **5 problems — the same 5 that were already there** (4 `chapters.owned.claims.*`, 1 `chapters.final.heading`) across 145 strings and 11 symbols. **No sixth.** |
| Not undone | `d46e6bb` (jitter-free projection) and `a3ba9fd` (the hero furniture's single visibility condition) are untouched — the diff is confined to `rail.js` and to `site.css` lines 1821–2373, i.e. the ring block and its reduced-motion reset. |

### Residuals

* **At the Mission pose there is still no navigator at all.** The reveal latches
  on the first travel (`SHOW_P`, 23 §9) and is what keeps `mission@*` byte-
  identical, so it stays — but it means the landing frame has no way in but the
  keyboard until the visitor scrolls. Pre-existing, unchanged, and worth a
  decision of its own.
* **A hover-capable window at 375 still gives the ring a third of the frame.**
  The copy and chips now step back under it, which is what made it unreadable,
  but the circle is sized for a desktop flank. Real phones get the column
  (`hover: none`), so this is only a deliberately-narrowed desktop window; a
  radius that tracked the viewport was considered and left alone rather than
  add a third geometry for a case nobody reaches.
* **The keyboard's first Tab into the rail lands on an invisible tile** for the
  ~300 ms of the peel, because the staging is the staging: the others do not
  exist until the bubble has arrived. It resolves correctly and reduced motion
  makes it instant, but the first thing a keyboard visitor focuses is briefly
  not on screen.
* **`.at` is resolved from the last pointer position, not from a live pointer.**
  If the page scrolls or reflows under a stationary pointer by some route that
  is neither a chapter turn nor a pointer move, `.at` will be stale until the
  next of either. No such route exists on this page today.
* The §7/§9 residuals stand (the placeholder tokens in the panel, the five
  Tier-3 drift errors, the missing external URLs).

---

## 2026-08-13 (later) — The ring goes AROUND the button: the centre moves, the bubble goes

> "The ring thing around the menu button is crap right now. Basically, we
> should remove the little circle version that shows — the one at the opening
> of both the menu and the top left — it's obviously crap. Basically, I want
> the current one to show just to the LEFT of it, then the previous one to
> show ABOVE it, and the one before that to the RIGHT of that. So it's like a
> ring AROUND the menu button — whereas right now it seems like a ring to the
> LEFT. The ring should be around the menu button. So make it so that the five
> items wrap around the menu button, with the first one on the left, instead
> of the way it is now. And let's just remove that other thing entirely — the
> little circle. The menu button should just come from below the menu button
> left." — Hannah

**Files:** `journey/rail.js`, `journey/site.css`. Nothing else. (`symbols.js`
was read and not touched: the five marks are unchanged, only where they sit.)

She is right, and the first half is arithmetic rather than taste. `f53fab3`
drew *the circle whose rightmost point is the slot*, which puts the centre one
radius left of the slot and **two** radii left of the button. Measured on the
shipped build at 1440×900: ring centre **(1284, 450)**, button centre
**(1410, 450)** — the button **126 px outside its own ring**. "A ring to the
left" is the correct reading of that drawing, not a misreading of it.

### The geometry, as shipped (measured at 1440×900)

One circle, and its centre is the button.

| | |
|---|---|
| the hub | the menu button, 56 px. **Closed** its centre is (1410, 450), box 1382…1438, `--cl-edge` 2 px off the frame. **Open** it is (1363.1, 450), box 1335…1391 — see THE EDGE |
| the ring | the circle of radius `--cl-rad` **about the hub**. 62.95 px, derived `(TILE 48 + AIR 26) / 2 sin(180/n)`; floored at `RAD_MIN` = `HUB/2 + GAP + TILE/2` = 58 |
| the slot | the ring's LEFTMOST point, (1300, 450). A POSITION, not an item |
| placement | `x = −rad·cos(ang)`, `y = rad·sin(ang)`, both about the hub; `ang 0` is the slot |
| the five points (at Connect) | connect **(1300, 450) LEFT** · inspire **(1344, 390) ABOVE** · mission **(1414, 413) UPPER RIGHT** · final (1414, 487) lower right · owned (1344, 510) below |
| the same, hub-relative | (−63, 0) · (−19.5, −59.9) · (+51.0, −37.0) · (+51.0, +37.0) · (−19.5, +59.9) |
| tiles | 48×48 sections, 56×56 hub. Neighbours 74.1 px apart → 26.1 px of tile air; hub box to slot box, 11 px |

**Her sentence is the negative sweep, and it holds at every chapter** — verified
at all five: the current one at the slot, the **previous** one above, **the one
before that** upper-right, then lower-right and below for the two upcoming,
wrapping. At Final: owned above, connect upper-right, inspire lower-right,
mission below.

`signedRing`, `writeAngles`, the unwrapped angles and the turn direction are
untouched. The only line of placement that changed sign is `--rx`.

### THE EDGE — the one real problem, and how it is solved

A circle around a button 2 px from the frame **cannot fit**, and no choice of
radius or squashing makes it fit:

* the rightmost marks sit at `rad·cos 36°` = 51 px right of the hub and carry
  24 px of tile, so the open control needs **75 px** to the right of its centre;
* an edge-hugging button has **30 px** (`--cl-edge` 2 + `--cl-hub`/2 28);
* the floor radius 58 still needs 71 px, so shrinking does not reach;
* an ellipse does not either — the same horizontal radius that clears the hub
  on the LEFT is the one that throws the right-hand pair out.

Standing the button ~48 px in permanently was rejected outright: that is
approximately where the 2026-08-12 cluster stood it, and *"it sits slightly too
far inward … move it over so it hugs the edge of the screen"* is the sentence
that moved it to 2 px in the first place. Undoing a request while answering a
different one is not a trade, it is a regression.

**So the control hugs the edge CLOSED and steps in as it opens**, by

```
--cl-shift = (rightmost mark + TILE/2) − HUB/2 = 0.809·rad + 24 − 28 = 46.93 px
```

— exactly the room the ring needs and not a pixel more. The consequence is the
part worth stating: with that shift **the open ring's rightmost tile edge lands
exactly where the closed button's box edge was**, so the control hugs the frame
in *both* states. Closed it is the button that touches the wall; open it is the
ring. Measured, at all three sizes:

| | closed hub box right | open rightmost tile right | frame |
|---|---|---|---|
| 1440×900 | 1438 | **1438** | 1440 |
| 1280×800 | 1278 | **1278** | 1280 |
| 375×812 | 373 | **373** | 375 |

and the right-hand marks inherit the button's own **14 px** glyph-to-frame
optical gutter by the same arithmetic (glyph 1402…1426 against a 1440 frame).
The step-in is derived in rail.js from the same points as the radius, so it
cannot go stale behind a manifest change.

**The step-in is stage 1 of the opening**, on the same clock and curve as the
current mark coming out of the button, so it reads as one gesture: the
instrument leans off the wall to unfold and settles back against it to close.

**A moving button is a known hazard here** (`48b7795`: the fan used to slide the
button and a press aimed at it landed on nothing), so it is answered twice
rather than assumed away:

1. the menu still opens on **`pointerdown`**, so a press made before or during
   the step cannot be lost — measured: `menuOpen` true after `mousePressed`
   alone;
2. **the button keeps its footprint at the wall.** `.j-rail-menu::before` is
   re-purposed as a pad spanning from the open button's right edge to the
   frame, at the button's own height, live only while open, and given
   `z-index` below the two right-hand tiles so they win every point they cover.
   **Measured: with the ring open, a press at (1410, 450) — where the closed
   button stood — resolves to `.j-rail-menu` and opens the panel.**
   What is exposed is the 26 px band on the button's own row between the two
   right marks; it is a redundancy for a 56 px target 47 px away, not a target
   of its own, and is not claimed as a 44 px hit area.

And the fold-under-a-stationary-pointer hazard is covered by the pointer floor,
which is sized off the whole circle (half-width `rad + tile/2` = 87 px) and so
covers the 46.9 px of ground the button vacates.

### What replaced the bubble and the peel

The resting **bubble** (a 32 px hairline circle carrying the current mark at
0.64 on the button's upper-left shoulder) and the **peel** that staged the
opening as that badge travelling to the slot are both deleted, with
`--cl-bx`, `--cl-by`, `--cl-bub` and `.j-rail-item::before`. **At rest there is
the button and nothing else** — measured: all five slots at opacity 0, stacked
at the hub, and `pointer-events: none`, so the closed instrument is exactly one
56 px button in the picture *and* in the hit model.

The staging survives, and `--t` simply changed jobs — it is now **the
emergence**, and it scales the *radius*:

```
transform: translate(−t·rad·cos(u·ang), t·rad·sin(u·ang))

  t = 0            every slot at the HUB — inside the button
  t = 1, u = 0     every slot at the SLOT — immediately left of it
  t = 1, u = 1     each on its own point of the circle
```

which is both simpler than the two-term lerp it replaces (the bubble offset is
gone from the expression entirely) and a better answer to *"the menu button
should just come from below the menu button left"*: the marks come **out of the
control**, not out of a separate badge. `--u` still scales the ANGLE, so the
marks are on the ring for the whole journey and the drawn orbit is the path
they took. The current item is still the fixed point by construction —
`−rad·cos 0` is `−rad` for every value of `u`.

**Traced per frame at 1440×900 through a real pointer dwell** (0.1× playback via
CDP's Animation domain, times given at 1×):

| t | what the frame shows |
|---|---|
| 0…120 ms | the dwell. Nothing moves |
| 120 ms | `.j-rail-hot`. The control leaves the wall and the current mark leaves the button together |
| ~270 ms | mid-stage-1: step-in 33.7 of 46.93 px, the current mark out at opacity 0.86 and growing from `--cl-emit`, the other four still at zero |
| **~420 ms** | **stage 1 complete.** Transform −46.93, the current mark exactly at the slot (1300, 450), opacity 1. Nothing else has appeared |
| ~670 ms | the other four are up and sweeping ROUND the orbit; the ±1 pair leads the ±2 pair |
| ~970 ms | settled on their own points |

One deletion had to be paid for in the opacity delays: the current mark used to
be exempt from stage 2's wait *for free*, because it was already on screen as
the badge. Starting from zero it would have travelled out of the button
invisible and popped on at the end, so the delay is now
`min(--step, 1) · --cl-travel` — the "is this the current one" test the cascade
cannot otherwise ask. The fold is the mirror: the four that only ever exist on
the ring go out as it collapses, the one walking home stays lit for the walk.

### What I refined by eye, and why

1. **The radius, 68 → the derived 62.95.** Shot at **54 / 58 / 62.95 / 68 / 74**
   at 1440×900. 68 was chosen by eye in the previous pass and was *free* there,
   because the ring hung off to the left; centred on the button every pixel of
   radius costs 0.81 px of frame retreat, so it has to earn itself. At **54**
   (2 px between hub box and slot box) the current mark's reticle brackets sit
   on the button's glyph and the ring reads cramped. At **74** the opposite
   failure: the button stops being *held* by the ring and reads as a lone dot in
   a large circle, and the shift grows to 55.9. **62.95** is where the reticle
   clears the button (11 px of box air) and the ring still closes around it —
   and it is the value the AIR formula asks for, so `RAD_MIN` could be demoted
   from an eyeball number to a **geometric floor** (`HUB/2 + GAP + TILE/2`), the
   smallest circle on which the current mark is not sitting on the control.

2. **The MENU pill moved twice.** Held off to the circle's leftmost point with
   the section names — the tidy answer, one line of names — "MENU" lands 145 px
   from its own button **with the current section's mark standing between the
   two**, and every reading of that picture has the pill labelling the mark.
   Hung off the button directly, it draws across the inside of the ring and
   through the mark below it. It now drops **below the whole circle**,
   right-aligned to the same 2 px of frame the ring's rightmost tiles hold:
   nothing is under the ring, it is the widest thing on the flank, and read
   there it captions the instrument, which is what a menu button's label is.
   Cleared by `--cl-rad + tile/2` — the circle's own bottom, not the lowest
   mark's — so it cannot go stale if the manifest changes the angles.

3. **…and then it had to be below in BOTH states.** Hung off the left while
   closed and dropped below on open, it **jumped at the 120 ms dwell**: a hover
   reveals the pill at once, and the ring then decides to open underneath it.
   Below in both states, the same label simply steps down to make room, on the
   travel's own clock and curve. Its `right` carries the shift too, so the label
   holds the wall exactly as the button and then the ring do.

4. **Both scrims are now centred on the anchor**, and that is a deletion rather
   than a tuning: the expanded one used to carry `--cl-cur + --cl-rad − w/2` to
   reach the ring's offset centre, and the resting halo carried `(−bx/2, −by/2)`
   to sit under the bubble-plus-button pair. With the circle around the button
   both are `−half the box` in each axis. Coverage was checked, not assumed:
   every mark sits at 37.5 % of the scrim's half-width (it was 39 % at r 68), so
   the isotropy the previous pass measured its way to is preserved and the
   recipe is untouched. Verified over the two frames where it shows — Owned's
   colony and Final's lit field — marks legible, no slab edge, and the resting
   halo still lifts the closed button off the epilogue's lattice.

5. **The keyboard's first Tab no longer lands on nothing.** A standing residual
   of the previous pass: the staging means the marks do not exist until stage 1
   has run, so the first Tab into the rail put a focus ring on a mark at
   opacity 0 for ~300 ms. Focus is not a dwell and has no transit to guard
   against, so a slot holding `:focus-visible` is lit from the first frame and
   travels out already visible. **Measured: 50 ms after the first Tab onto
   Mission, opacity 0.47 at x 1387 — moving and visible, where it was 0.**
   Position is untouched; it still rides the same staging as its neighbours.

**Checked and deliberately left alone:** `--cl-emit`, the scale a mark has while
still inside the button. Shot at **0.40 / 0.62 / 0.85** at the frame where it
should read most strongly, and the difference is under 2 px of a 24 px glyph —
the scale transition carries no delay while the position does, so by the time
the mark is clear of the button it is nearly full size whatever it started at.
It is a grace note, not a load-bearing number, and it is recorded here as one.

### The hard-won behaviours, re-verified under the new geometry

* **The 120 ms dwell** — verbatim, untouched.
* **The menu opens on `pointerdown`** (`48b7795`) — and is now load-bearing
  again, because the button moves again. See THE EDGE.
* **`.at` beats `:hover`, and the premise was re-measured, not inherited.**
  With the pointer parked on the slot (1300, 450) and the ring turned one step
  **by a pure transform write — no scroll, no reflow, no pointer event** —
  `:hover` stayed on CONNECT while `elementFromPoint(1300, 450)` returned
  OWNED. Chrome does not re-hit-test a stationary pointer when the layout under
  it moves by transform, exactly as `f53fab3` found, and the new geometry moves
  every mark. (Worth recording: on the *real* chapter-change path this Chrome
  was additionally seen to correct `:hover` on its own — navigation does more
  than move the marks. That is not something this component controls, so the
  isolated measurement is what the rule is written against.)
* **Name pills clear the occupied positions** — and the previous pass's
  exemption for the current item disappeared *for free*: with the circle
  centred on the button its leftmost point IS the slot, so `PILLX[0]` comes out
  0 by arithmetic rather than by clause. One rule where there were two, and no
  pill crosses any mark at any chapter or size.
* **Touch keeps the current behaviour** — the whole ring is still written under
  `(hover: hover)`. Measured at 375×812 with `hover: none` / `pointer: coarse`:
  the shipped column, single file at x 323…375, 44 px pitch, 52×44 tiles, the
  current mark lit at rest, arming tap brings all six names, second tap acts.

### Gate results

| Gate | Result |
|---|---|
| References | **PASS.** `python3 tools/capture.py --check`: **10/10 at MAE 0.00/255, 0.0 % px > 8**. No golden modified — `git status` clean but for the two source files. |
| Screenshots | Resting (no bubble) / emerging / fully unfolded / mid-rotation at **1440×900, 1280×800 and 375×812**, mid-transition frames over CDP's Animation domain at 0.1×. Plus the ring open at all five chapters, and the before/after pair that shows the button moving from outside its ring to its centre. |
| Ring order | **PASS**, all five chapters: current at the slot, previous ABOVE, the one before that UPPER RIGHT, the two upcoming below and lower-right, wrapping. |
| Edge | **PASS.** Open rightmost tile edge 1438/1440, 1278/1280, 373/375 — the same 2 px the closed button's box holds. Glyph gutter 14 px. |
| `.at` | **PASS. 25/25** parked-position × turn combinations (five ring positions × five targets): exactly one `.at`, exactly one pill, on the slot `elementFromPoint` actually returns; no stale `:hover` ever produced a pill. |
| Pointer floor | **PASS.** 108 points walked round the whole ring **including the ground the button vacates** and the hub: **0 folds, 0 points that left the control.** |
| Button pad | **PASS.** Ring open, press at (1410, 450) — the closed button's own spot — resolves to `.j-rail-menu`, `aria-expanded` true. |
| Keyboard | **PASS.** Tab order `logo → Discord → mission → inspire → connect → owned → final → Menu → hotspots`; `:has(:focus-visible)` opens the ring with every slot at its ring point and `aria-current` on the active one; the focused mark is lit from the first frame (see refinement 5); Enter on Owned → `journey.chapter === 'owned'`; Enter on the button opens the panel with focus on Close; the trap holds through 18 Tabs; Escape closes and returns focus to the button. |
| Reduced motion | **PASS** (emulated). 50 ms after the dwell the control is fully stepped in (−46.93) with all five slots on their own points at opacity 1; 60 ms after a chapter change every slot is at its new cell; 100 ms after leaving, the hub is back at 1410 and all five are at opacity 0. The staging included — with no durations there is nothing for stage 2's delay to wait for. |
| Touch | **PASS**, unchanged — see above. |
| Hit model (`6903c4a`) | **PASS.** Closed, 104 of 108 sampled points resolve to `CANVAS` (the other four are the hero header and the rail button); the only elements ≥ 12 % of the viewport with live pointer-events are the stage `div` and the `CANVAS`; a `pointerdown` at (700, 600) reaches the canvas — the poke works. |
| Overflow | **PASS.** `scrollWidth === innerWidth` at rest, open and mid-turn, at 1440 and 375. |
| Console | **CLEAN** over a cold load, a full wheel ride and back to p = 0 with the hero pose exact (−2.25, 2.25, 10.4), the ring opened and traversed, the menu opened and closed, plus the keyboard, reduced-motion and touch passes. Error/warn/uncaught/rejection trapped from document start. URL never left `/index.html`. |
| Both tiers | Tier 3 is on the COLUMN and was not touched — its documented divergence (§5, 23 §8). Drift guard: **5 problems — the same 5 that were already there** (4 `chapters.owned.claims.*`, 1 `chapters.final.heading`) across 145 strings and 11 symbols. **No sixth.** |
| Not undone | `d46e6bb`, `a3ba9fd`, `961b2d1` and `8987500` are untouched — the diff is confined to `rail.js` and to `site.css`'s ring block and its reduced-motion reset. |

### Residuals

* **At rest the navigator no longer says which section you are in.** That is
  the deletion Hannah asked for, not an oversight: the badge was the only
  resting reading of position, and it went with the circle. The reading returns
  the moment the control is hovered, focused or tapped. Named here because it
  is a real thing spent, and it was hers to spend.
* **Mid-turn one mark passes the circle's rightmost point**, at which its glyph
  reaches x 1438 of 1440 — on screen, with the same 2 px every box holds, but
  it is the tightest the composition ever gets. Its 48 px tile overhangs the
  frame by 10 px for that moment; measured to cause no horizontal overflow
  (`.j-rail` is `position: fixed`). Transient, once per chapter change.
* **At the Mission pose there is still no navigator at all** — the reveal latch
  (`SHOW_P`, 23 §9) is what keeps `mission@*` byte-identical. Pre-existing,
  unchanged, still worth a decision of its own.
* **A hover-capable window at 375 still gives the ring a third of the frame.**
  The copy and chips step back under it (`body.j-rail-on`), real phones get the
  column. Unchanged.
* **`.at` is resolved from the last pointer position**, so a route that moves
  the ring without being either a chapter turn or a pointer move leaves it
  stale. Unchanged, and now demonstrated: the isolated pure-transform test above
  is exactly such a route and reproduces it. No such route exists on this page.
* The **five pre-existing Tier-3 drift errors**, the placeholder tokens in the
  panel and the missing external URLs all stand.
