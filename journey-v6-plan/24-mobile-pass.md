# 24 — The mobile pass

**Requested:** Hannah, 2026-08-07. **Built:** same day.
**Files:** `journey/ui-index.js` (new), `journey/ui.js`, `journey/ui-footer.js`,
`journey/rail.js`, `journey/site.css`, `hero.css`, `content/content.js`
(one comment).

> "can you run through all the layouts on mobile sizes and try to make them as
> elegant as possible, even if that means changing things in some ways"

Deliberately last in the backlog: everything before it kept changing what was
on screen. Two items were carried in as known debt — the epilogue's heading
hierarchy and Owned's unreachable contributors — and the rest of this came out
of riding the whole thing at 375×812, 430×932 and 812×375.

**Nothing in this pass moves a camera, a pose, a portrait offset or a scene
layer.** It is entirely the DOM/CSS tier. That is not a scope rule imposed from
outside; it is what the findings turned out to be. The one consequence worth
stating up front:

> **No reference moved. `python3 tools/capture.py --check`: 10/10 within,
> worst MAE 0.04/255, `mission@430x932` exactly 0.00, every desktop still
> byte-identical.** `capture.py` hides `.ui`, `.j-copy`, `.j-hotspots`,
> `.j-card` and `.j-rail` at capture time, so a pass that only touches those
> layers cannot move a golden — and did not.

---

## 1. The two known issues

### 1.1 Final heading hierarchy — RESOLVED, three lines became four

**Found.** The shipped rule bought two lines with a font step-down to `5.6vw`:
**21.0px at 375** against a 16px sub. Ratio **1.31**, where every other chapter
on the same phone runs 30.4/16 = **1.90**. The epilogue — the one place the
site raises its voice — was arriving in the smallest display type on the page.
The rule that shipped it flagged itself and asked for the call.

**The call: line count gives way, hierarchy does not.** The heading keeps the
house clamp (which floors at 1.9rem across the whole phone range) and runs
long. The old rule's arithmetic was right and is preserved in the comment: at
375 the natural single-line width is 839px, the balanced two-line break needs
434px of column, and a 375px phone can offer ~320px. Two lines really is
unreachable. It simply is not worth 9.4px of heading.

I estimated three lines and it is **four** — words do not split, and the greedy
break is set by the longest word group at 230px. Four lines at full scale still
reads better than two at 21px, and it is what shipped:

| | before | after |
|---|---|---|
| 375×812 | 21.0px, 2 lines, sub 16px, ratio **1.31** | 30.4px, 4 lines `[230,195,159,229]`, ratio **1.90** |
| 430×932 | 24.1px, 2 lines, ratio **1.51** | 30.4px, 4 lines `[230,195,159,229]`, ratio **1.90** |
| 812×375 | 30.4px, 2 lines `[601,229]` | 30.4px, 2 lines `[434,396]` |

`text-wrap: balance` is what turns four lines into a stanza instead of three
long ones and a stub, and it is also what fixed the landscape rag — 601/229 was
a 2.6:1 imbalance. **Scoped to the phone and short-viewport queries**; desktop's
own two-line break is already even and is left exactly as shipped.

`pos-bottomleft` is anchored by its BOTTOM edge, so the taller heading grows
upward into open sky. The block's bottom, the footer cue under it and the safe
area are all where they were.

**One knock-on, found by measuring rather than by looking.** The taller heading
brings its first line up into the band the side navigator rests in: measured at
375×812, the heading's first glyph starts at x 39 and the resting mark occupies
x 14..38 at y 465..478. **One pixel apart, and only by luck.**
`23-side-navigator.md` §8 gave the static tier a left gutter for exactly this
reason, on the grounds that Tier 1's blocks "never come near the rail" — true
of a 21px two-line epilogue, not of this one. So Tier 1 takes the same
medicine below 480px: `padding-left` 1rem → 3.2rem, sized to the **resting**
tile (44px) plus air, not to the expanded band. It costs nothing — the break is
set by a 230px word group against 289px of remaining column, so the line count
and the balance are unchanged and the mark simply has the margin to itself.

`content/content.js` carried a comment promising the two-line wrap. It now
records that the promise is desktop-only and points here.

### 1.2 Owned contributors unreachable — RESOLVED, the index exists

**Found, and worse than documented.** `20-owned-root-network.md` §9.4 recorded
"4 of the 16 chips" on mobile. Measured at 375×812, four are *placeable* and
**two are actually reachable** — the other two are suppressed behind the copy
block. On a phone, a section whose whole claim is "100% shared with the people
who build it" was representing that with two faces out of sixteen.

|  | placeable | reachable (before) | reachable (after) |
|---|---|---|---|
| 375×812 | 4 / 16 | **2** | **16** |
| 430×932 | 4 / 16 | 4 | **16** |
| 812×375 | 16 / 16 | 3 (13 suppressed) | **16** (6 spatially, up from 3) |
| 1440×900 | 16 / 16 | 16 | 16 (no index — see below) |

**What was built: `journey/ui-index.js`, the node index.** A bottom sheet
listing every contributor, grouped by role, opened from a quiet control under
the chapter's copy.

**Why a list and not a portrait-specific arc.** Recorded so it is not silently
re-litigated:

1. Node positions are **world** positions fixed at build time, and everything
   hanging off them — rim fibres, halo cores, node-to-web strands, the 430-node
   mesh they are wired into, the ≥3.0-unit camera-path clearance guarantee — is
   baked from those positions. Making them a function of aspect means
   rebuilding all of it on a rotate.
2. Sixteen faces in a 375px frame is ~23px of frame width each. The reference
   this section was built to asks for "clear dark breathing room between them".
   A portrait arc fixes reachability by breaking the picture.
3. **The picture is not the problem; reaching it is.** A list is the right
   instrument for "show me all of them", and it is the same instrument that
   serves a screen reader, a keyboard, and a landscape phone whose copy block
   suppresses ten chips.

So the spatial composition is untouched at every size and the index is offered
**alongside** it, never instead of it.

**The contract it keeps.** A row is a hotspot by another route. It opens
through the same `onOpen(id, trigger)` funnel a chip click uses, so journey.js
writes the same `#/owned/contributor-N`, pushes the same single history entry,
runs the same `notifySelect` → `setSelected` ember treatment, and opens the
same dialog card. `ui-index.js` does not know what a card is. Hovering or
focusing a row calls the hotspot's own `onHot`, so **the node lights out in the
field** — the list is a way into the composition, not a replacement for it.
(Deliberately `onHot` and not `refresh()`: refresh also toggles the chip's
`.hot` class and syncs the popover, and an off-frame chip has neither.)

**When it appears is derived, not guessed.** The frame loop counts how many of
a chapter's routable nodes it is actually placing; the control appears when
that count falls short, latched per viewport and cleared on resize. Desktop
places all sixteen and **never grows the control at all**. The count is taken
from `want` (placeability), not from `vis` — `vis` is still climbing through
the arrival stagger for a second after a landing, and counting that would have
latched an index open on a desktop that is perfectly fine.

**Where the strings come from.** Nothing was written for this.

| element | source |
|---|---|
| title / control label | `Contributors` — `content.js` calls the array `contributors`; the data's own word for itself, the same justification `23-side-navigator.md` §5 used for "Epilogue" |
| lede | the chapter's own `sub` — which, for Owned, is the sentence that names the very groups the list is sectioned by |
| group heading | the `role` field **verbatim** (`Artist`, `Core Engineer`, …). Pluralising would be this file writing copy; the tally beside it is derived |
| row name | the node's authored `name` |
| row ordinal `01`…`16` | derived from manifest order, exactly as the rail menu's "01 · Mission" is |

The ordinal earns its place: all sixteen contributors are authored as the
literal string "Contributor" pending consent (CO-1.4), so without it the list
would be sixteen identical rows. It is structural derivation, not invented
content — and the same fact is given to AT properly through `aria-posinset` /
`aria-setsize` on a real `<ul>`.

**A measured mistake, corrected.** The control was first placed in the copy
block's flow. `.j-block`'s border box is what `ui.js` suppresses hotspots
against, so it made the chapter's copy claim ~46px more of the frame and hid
the very nodes the index exists to reach — **430×932 fell from 4 placeable
chips to 2, and 812×375 lost another**. The control now sits in a wrapper taken
out of flow (`position: absolute; top: 100%`), so the composition claims
exactly what it claimed before the index existed. Verified restored: 430 back
to 4, landscape at 6.

**Form.** The sheet borrows rather than invents: the control is the footer
cue's vocabulary (small caps, letterspaced, hairline chevron) because it makes
the same kind of offer; the sheet is `.j-card.sheet`'s form — grip, header
strip, a body that scrolls inside itself, same radius, same near-opaque ground
— because a phone should not learn two bottom sheets from one site. It is a
separate element rather than a mode of `.j-card` for one reason that matters: a
row **opens** a card, so the two have to exist a moment apart while focus moves
between them.

---

## 2. Section by section

### Mission / the landing frame (p 0)

Composition is good at both phone sizes and was not touched — the hero's own
responsive table is the approved portrait pose and `mission@430x932` is
protected. One real defect, and it was the oldest thing on the page:

**The hero row never paid PL-1.4.** The journey layer has carried 44px minimum
touch targets since PL-1.4; the hero's own row was never brought into that rule.
Measured at 375×812 and 430×932: `2RP` **58×28**, `Discord` **80×28**, the
wordmark `.logo` **122×17**. That row is fixed and rides the **whole journey**,
so those were 16–27px-short targets on every single view of the site, at every
chapter. `.cta` measured 328×43 on a landscape phone, 1px short.

Fixed with the journey layer's own method — a transparent pseudo-element sized
to `max(its own box, 44px)` — so the hit area reaches the minimum and the
artwork renders at exactly the size it was designed at. **Deliberately a pad and
not a bigger pill:** growing the pills would move the nav row's bottom edge,
and that edge is the top of the band Inspire's portrait camera is balanced
against (`portrait.js`, the p 0.260 key). A pad changes no furniture, so no
camera field goes stale. Same media condition as the journey layer's block, so
the two halves of one rule cannot drift apart.

### Inspire (rest 0.26)

Sound at both phone sizes and left alone. The p 0.260 portrait key is the most
carefully balanced number in `portrait.js` and nothing here disturbs its
furniture. Chips: 3/3 placeable at 375, 430 and landscape; `arca` sits at x 19,
tight against the left edge but fully placed, which is the nudge rule working as
designed. Heading wraps to 2 lines at 375 and 1 at 430 — both fine.

### Connect (rest 0.49)

Sound and left alone. 3/3 chips at every size. The `pos-topright` stack —
copy across the top, mushroom in the middle-left band, hubs fanned through the
lower half — holds at both phone widths. Landscape gains from §3.

### Owned (rest 0.725)

§1.2 above. The spatial composition is untouched; the index is new.

### Final (rest 0.925)

§1.1 above.

### The end-hold (p 1) — the epilogue was reading through the footer

**Found by screenshot, present at every width, and not a mobile-only bug.** The
`pos-bottomleft` block and the footer occupy the same lower band of the frame,
and both were at full strength at the end-hold. The footer is a 0.95-alpha
panel, so the heading and sub read straight through it as ghost text under the
link rows:

```
1440x900   footer y 680..900   block y 575..819   — 139px of overlap
 375x812   footer y 412..812   block y 532..723   — block ENTIRELY behind it
 430x932   footer y 617..932   block y 632..830   — likewise
```

A phone is where it is unmissable (the footer is 49% of the frame there and
swallows the whole block), but the defect is the same shape at every width, so
the fix is too — **a mobile-only version would have been a second rule for one
bug.** Stated plainly because it is the one place this pass changes what a
desktop visitor sees: past p 0.955, desktop now loses text that should never
have been legible there.

The epilogue copy retires on `epilogueRetire(p)` — **the cue's own long-standing
expression**, lifted to module scope in `ui-footer.js` and now shared, so the
block, its cue and the footer are one composition handing over to another
rather than three layers competing for the same pixels. Pure in `p`, so a
reverse scrub brings the block back through the same values, and **exactly zero
at and below p 0.955** — the epilogue rest at 0.925, which is the captured
pose, is untouched. Applied in `paintCopy` rather than to `eased.final` itself:
that value still gates the cue, the hotspots and the arrival envelope, none of
which should learn about the footer.

Verified: `debugState().copy` is `[]` at p 1 and `['final']` at p 0.925.

---

## 3. The landscape phone

A phone on its side is not a small desktop and not a tall phone: it is
~812×375, and **the only scarce axis is height.** Everything in the sheet sized
copy off width, so `max-width: 900px` handed the block 88vw = **715px of an
812px frame** while the viewport had 375px of height to give — a block 246px
tall, **66% of the frame**, centred in it.

That is not only a bad picture. `.j-block`'s **box** is what the hotspot
suppression tests against, and the box is far wider than the text inside it (the
sub is capped at 26rem and centres). Measured before: Owned projected **16 of
16** contributors inside the frame — the landscape frustum is wide enough for
the whole arc, the one orientation where it is — and then **suppressed 13 of
them** behind a copy box whose right two-fifths was empty padding. The best
composition on the site for that chapter was the one you could interact with
least.

So the block stops taking width it has no text for: `min(88vw, 34rem)`, which is
the `.j-sub` measure plus its padding, i.e. the width the copy actually
occupies. Vertical rhythm tightens; **type size does not change.** Keyed on
`max-height: 520px` + `orientation: landscape` rather than on `pointer: coarse`,
because the shape of the frame is the problem and a short desktop window has it
too.

Result: Owned 715→544px wide, suppression 13→10, chips **3 → 6** spatially
(and 16 through the index). Final's rag 601/229 → 434/396. Inspire and Connect
gain the same recovered flanks.

---

## 4. The side navigator on mobile

Verified rather than worked around, and improved once.

The rail is in good shape at phone widths — the resting tile is 44px by
construction, the menu is a clean 92vw panel with all five sections, and the
touch-arm model works. `23-side-navigator.md` §7 already recorded the one
compromise: at 375 there is no width for the expanded band to sit *beside* the
copy, so it becomes an opaque panel over it.

**The panel solved legibility and left composition unsolved.** Screenshotted, the
expanded state is a hard-edged rectangle laid across the middle of five lines of
prose, with words chopped at both ends of it — a slab dropped on a sentence.

So while the rail is **held open on touch**, the chapter copy steps back to
0.14 and the navigator has the frame. `.j-copy` is the host element and carries
no inline opacity — the per-block opacities `ui.js` writes every frame are on
the `.j-block` children — so this composes with the frame loop instead of
fighting it, and nothing in the loop learns about the rail.

`rail.js` announces the touch-expanded state on `<body>` as `j-rail-on`,
exactly as `openMenu` already announces itself with `j-menu-on` — the
component's own idiom, and more robust than a `:has()` selector. **Set from the
touch path only**, so hover and keyboard focus on a desktop are completely
unaffected and none of `02f6ec0` / `9eb274d` changes behaviour.

---

## 5. Touch-target audit

Full sweep at every pose, with touch emulation on, counting the `::before` pad
and the `.j-hot-hit` pad where they exist.

| | before | after |
|---|---|---|
| 375×812, all 5 poses | `.pill` 58×28, `.pill` 80×28, `.logo` 122×17 | **0 undersized** |
| 430×932 | same | **0 undersized** |
| 812×375 | same + `.cta` 328×43 | **0 undersized** |

The index's own controls needed almost nothing: a row, the grip and the close
button are 44px in the box by construction. The **cue** is small caps on a
hairline chevron — 28px tall by design, like the footer cue it borrows from —
so it takes the same PL-1.4 pad rather than a bigger box.

---

## 6. Gate results

| Gate | Result |
|---|---|
| **References** | **PASS.** `capture.py --check`, frozen: 10/10 within. `mission@1440x900` 0.00, `mission@430x932` **0.00**, inspire/connect/final both sizes 0.00, `owned@1440x900` 0.00, `owned@430x932` 0.04 (the same pre-existing sampling noise `20-owned-root-network.md` recorded). **No reference moved; none re-shot; every desktop still byte-identical.** |
| **Screenshots** | Every section before/after at 375×812 and 430×932, plus the full landscape set at 812×375, plus rail-expanded / menu / card / index states. |
| **Issue 1 — Final hierarchy** | **FIXED.** 21.0px → 30.4px at 375, 24.1px → 30.4px at 430; heading/sub ratio 1.31 → **1.90**, matching every other chapter. |
| **Issue 2 — all 16 reachable** | **PASS.** Scripted: open the index, activate all 16 rows in turn, assert each writes its own `#/owned/contributor-N` and opens the card. `rows 16, reached 16, PASS true, failures []`. Groups `Artist 4 / Core Engineer 4 / Knowledge Creator 4 / Researcher 4`. Console clean through all 16. |
| **Touch targets** | **PASS.** 0 undersized at 375×812, 430×932 and 812×375, across every pose. |
| **Full ride, phone viewport** | **PASS.** 202-point scrub 0→1→0 plus a sampled pass through the live surface. Every chapter and nav entry correct; `copy: []` at p 1 (the handover) and `['final']` at 0.925. **Console: zero errors, zero warnings, zero rejections.** |
| **Reduced motion** | **PASS.** With `prefers-reduced-motion: reduce` emulated: sheet `transitionDuration 0s`, opacity 1 within 60ms of open (i.e. instant, not mid-fade), scrim 1, row transitions 0s, and `closeSheet` hides in the same task rather than after a 340ms fade that never ran. Every rule in the new component ends at the element's resting style. |
| **Index a11y** | **PASS.** `<button aria-haspopup="dialog">` control; `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the sheet; focus moved to the close button on open; Tab trapped across 17 controls and wrapping both ways; **Escape closes and focus returns to the control**; input ownership released on close; real `<ul>`/`<li>` with `aria-posinset` / `aria-setsize`; 3px gold focus ring on rows. |
| **Input ownership** | **PASS.** The sheet scrolls (`scrollHeight > clientHeight` at 375) and registers `claimInput(sheet, { modal: true })`; `journey.scroll.modalInput` reads `true` while open and `false` after close. |
| **Not regressed** | Side navigator (both tiers, desktop behaviour bit-identical — the new body class is set from the touch path only); Owned hover/hit-pad and root lighting; the Learn more / Remix pair; copy entry on nav jumps and the popover unfurl; particle conservation and arrival stagger; every camera framing commit. No camera, pose, portrait offset or scene layer is touched by this pass. |

---

## 7. Residuals

* **The bottom-sheet drag gesture is implemented twice** — once in `ui.js` for
  `.j-card`, once in `ui-index.js` for `.j-index`. They are the same ~30 lines
  and the same constants (0.28 of height, 0.55 px/ms flick, 44px floor). I
  duplicated rather than refactored because factoring it out means editing the
  card's working gesture in a pass that had no other reason to touch it. It
  wants one shared helper the next time either is opened.
* **The index is Owned-only in practice.** `CHAPTER_INDEX` is a one-line table
  and the machinery is chapter-agnostic, but only Owned has enough nodes to
  need it. Connect and Inspire place 3/3 everywhere and correctly never grow a
  control.
* **Landscape Owned still suppresses 10 of 16 spatially** (down from 13). The
  remaining cause is that suppression tests the copy block's **box**, which is
  still taller than its text. Testing against the text's own rects would help
  every chapter at every size — but it is a change to shared hit logic with a
  desktop blast radius, and it did not belong in a mobile pass. Reachability is
  no longer affected by it: the index covers all 16.
* **Four lines is a lot of heading.** It is the right trade against 21px, and
  it is what shipped, but if Hannah wants the epilogue shorter on a phone the
  honest lever is the copy, not the type scale — the sentence is 839px of
  Didot at the house floor and no measure closes that on a 375px frame.
* **Five pre-existing Tier-3 content-drift errors** (`chapters.owned.claims.*`
  ×4, `chapters.final.heading`) are still present and still untouched, as
  `23-side-navigator.md` §11 recorded. Not folded into this pass either.
* **The index has no Tier-3 twin.** The static journey lists every contributor
  as real HTML already — that page *is* the index, by construction — so nothing
  is missing there, but the two have never been checked against each other the
  way the rail's symbols are.
