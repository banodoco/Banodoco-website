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
