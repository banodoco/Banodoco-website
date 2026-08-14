# 13 — Content Operations: Consent, Contributors, Copy (starts P0, lands P6)

**Objective:** maintainable content and real people, with consent as a hard gate. This is the longest-lead workstream in the project — start it at P0.

**Owner:** Content/Ops + Hannah (pipeline), Peter (final copy approval).

## Consent pipeline (start immediately — CO-1)

- [ ] CO-1.1 Draft the consent ask: explicit opt-in covering **image, name, role, and profile copy**, with an example of how the portrait appears (use the approved Owned still).
- [ ] CO-1.2 Build the tracker: contributor → contacted / opted-in / photo received / copy drafted / copy approved by the person / approved by Peter. Keep consent records stored durably.
- [ ] CO-1.3 Collect: portraits (usable resolution for the mask treatment), names, roles, 1–2 sentence contribution + ownership blurbs.
- [ ] CO-1.4 Anyone not fully consented by content-freeze ships as an anonymous ember-node (LB-4). Launch never blocks on consent.

## Contributor content model

- [ ] CO-2.1 Structured model (extend donor `content.js` schema): `{ id, name, role, blurb, portrait, consent, seed, pos? }` — people can be added/updated/removed without redesigning the chapter.
- [ ] CO-2.2 **One content source governs everything:** node labels, accessible text, routes, drawers, profiles, footer entries, and Tier-3/fallback metadata. No duplicated strings.
- [ ] CO-2.3 CMS-vs-repository decision is delegated to the tech lead (ADR) — repository JSON/module is acceptable if it stays the single source.

## Live modules rule

- [ ] CO-3.1 **No manually maintained activity numbers anywhere.** A live module (workflow counts, update feeds, etc.) ships only with an automated source + an agreed freshness rule.
- [ ] CO-3.2 Any live module whose source exceeds its freshness window **hides itself automatically**. Test this path.
- [ ] CO-3.3 If no automated source exists by P6: the module doesn't ship. (The superseded Astrid drawer mockup's "128 open workflows / 1.2K builders" is exactly what this rule prohibits faking.)

## Locked copy table (single source for `11`/chapter docs)

| Where | String |
|---|---|
| Mission H1 | We're working to help the open-source AI art ecosystem thrive. |
| Mission sub | Banodoco builds tools, spaces, and shared infrastructure for the open-source AI art ecosystem. |
| Inspire H | Inspire and empower. |
| Connect H | Connect the ecosystem. |
| Connect sub | Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art. |
| Owned claims | 100% shared · Granted 1% per month · Split between different groups (artists, core engineers, knowledge creators) |
| Final H | We're working to accelerate the second renaissance. |
| Final sub | Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many. |

Inspire supporting copy and all spotlight/card/profile bodies: drafted by Content/Ops, approved by Peter before G4. Mockup captions are **not** copy sources where they differ from the handoff.

## Named owners before launch

- [ ] CO-4.1 Assign a named owner for each: drawer/spotlight copy · activity feeds · contributor profiles · consent records · public links (2RP, Discord, GitHub, banodoco.ai). Record in this file.

## Acceptance
- Every rendered string traces to the single content source; consent flags enforced in code (OW-4.4); owners named; freshness auto-hide demonstrated.

---

## 2026-08-07 — Entry animations: arriving copy, and the popover opening (Hannah)

Two requests, one subject: **things appearing gracefully instead of popping.**

> "When I jump between sections, the text for the new section INSTANTLY
> appears, but we should have some nice intro animation and proper timing."
>
> "When I hover over the individual items (2RP, ArtCompute, etc.) can you make
> the thing open with a nice cool understated but elegant entry animation,
> similar to the one that shows when I hover over Equip etc. on the hero
> mushrooms."

**Files:** `journey/constants.js` (`COPY_JUMP_LEAD`, `COPY_JUMP_TAIL_S`),
`journey/journey.js` (`directJumpTo`, the blend-drop branch),
`journey/ui.js` (`armCopyEntry` / `cancelCopyEntry` / `endArrive`, `paintCopy`,
`runPopEntry`, `POP_ENTER_MS`), `journey/site.css` (ARRIVING COPY, POPOVER
ENTRY, the reduced-motion block). No scene, camera or route change.

---

### 1. Why a nav jump popped, and why the scroll rule could not fix it

The copy choreography that has been shipping since W3-B is written against
**scroll speed**: `COPY_TRAVEL_*` releases copy when `|dp/dt|` rises,
`COPY_SETTLE_*` lets it back in when the camera has settled, and `dt === 0`
snaps (which is what makes deep links and `capture.py` deterministic).

That instrument has nothing to measure on a jump. `directJumpTo` calls
`placeAt(targetP)`, which runs `journey.snapTo` plus two `applyFrame(p, 0)`
passes — progress arrives at the destination inside a single `dt = 0` tick, so
`|dp/dt|` never rises, `settled` reads 1, and the eased loop writes the
destination's copy at full opacity **on the frame the visitor clicked**.
Measured before the change, at 1440x900: `.j-block[data-chapter=inspire]`
computed opacity was `1` at the first sampled frame (39 ms) after clicking
INSPIRE, while the camera was still 1.17 s from its destination pose.

So the copy was not *early*. It was not timed against anything at all.

### 2. The timing model: keyed to the arrival, not to the click

The camera blend already has a duration derived from the path it actually
travels (`journey.js`, commit `043a1f2`):

```
dur = 0.85 + 0.35 * min(arcLength(from, to) / 20, 1)     // 0.85 s … 1.20 s
```

`directJumpTo` now hands that number to `ui.armCopyEntry(chapterId, dur)` — the
one call is made *after* `placeAt`, because the destination pose (and therefore
the arc length, and therefore the duration) does not exist until the director
has written it. The copy is then placed **inside** that window:

| | | |
|---|---|---|
| entry starts | `dur * COPY_JUMP_LEAD` | `LEAD = 0.55` |
| entry ends | `dur + COPY_JUMP_TAIL_S` | `TAIL = 0.15 s` |
| entry duration | `dur * 0.45 + TAIL` | 0.53 s … 0.69 s |

Two properties are the point of authoring it this way:

- **The words wait out the first 55% of the move.** They arrive into a frame
  that is already recognisably the destination rather than racing the camera
  to it. The old copy, meanwhile, releases at the ordinary `COPY_OUT_K` rate
  (~0.15 s) — the same release a scrub gives it — so the middle of a jump is
  clean frame, which is exactly what the camera move wants.
- **The words finish a beat after the camera stops.** The last thing that
  settles on screen is the sentence. Because the duration is *derived* rather
  than fixed, a longer flight buys a longer settle for free, and the pair reads
  as one movement at both extremes of the duration law.

The envelope runs on **smootherstep** — the same C2 ease `camBlend` uses — so
copy and camera share an ease family, not just a clock.

Measured, 1440x900, all four nav chapters (opacity ≥ 0.99 vs. the frame the
camera goes still):

| jump | camera settles | copy 10% | copy 50% | copy 99% |
|---|---|---|---|---|
| → inspire | 1233 ms | 850 | 1024 | 1295 |
| → connect | 1103 ms | 776 | 931 | 1157 |
| → owned | 1153 ms | 836 | 981 | 1215 |
| → mission | 1147 ms | 834 | 964 | 1214 |

Nothing above 0 before 500 ms in any of them; largest single-frame opacity step
0.095. The same shape holds at 1280x800 and 375x812.

### 3. One writer, so the two paths cannot fight

The requirement that a jump "must not leave a block half-faded by the scroll
rule" is not met by a second opacity channel layered over the first — two
writers on one style is precisely how that state arises. So the envelope drives
`eased[id]` **itself**, and is defined to end at the same value the scroll rule
was heading for (`target * arriveE`, with `arriveE → 1`). When it lets go,
`eased[id] === target` already: the scroll rule resumes on the next frame with
nothing to correct and nothing to re-animate.

Three consequences fall out of that choice:

- **`easedPrev`.** `placeAt` has already snapped every block by the time
  `armCopyEntry` is reachable. Arming restores the last frame that actually
  *travelled* (a `dt = 0` placement never writes the snapshot), which undoes
  that one snap and leaves the outgoing chapter at the opacity it really had.
- **The snap is undone on screen in the same task**, via `paintCopy` — the one
  place a block's eased opacity reaches the DOM. Leaving the correction to the
  next animator frame shipped one *rendered* frame of exactly the pop this
  work removes (measured: 16 ms of the whole block at opacity 1).
- **Cancellation is a hand-back, not a stop.** When manual input drops the
  camera blend, `journey.js` calls `ui.cancelCopyEntry()` in the same branch.
  The scroll rule picks the block up at whatever opacity the envelope had
  reached, so there is no step. Measured with a scroll injected 820 ms into a
  jump to OWNED: the block rose to 0.42, handed over, and released to 0 at the
  normal `COPY_OUT_K` rate — largest frame step 0.043, which *is* that rate.

`dt === 0` still ends the entry outright, so deep links, `?pose=`, `?p=` and
`?capture=` keep snapping and captures stay deterministic.

### 4. The DOM half: what the parts do

`.j-block.j-arrive` carries the inner choreography (`site.css`), with the
timing published as two custom properties written per arrival — `--j-in-wait`
(the lead) and `--j-in` (the duration) — so every delay and duration is a
fraction of the *live* window rather than a constant that only matches one
flight length. The order borrows the hero's numbered callout boot: the block's
local scrim lights first (`j-bed-in`, 40% of the window), then the heading
(`j-line-in`, from `translateY(0.16em)`, delayed 12%), then the sub (delayed
26%). The last part lands at 92% of the envelope, leaving the final beat as a
pure settle of the whole block.

**Nothing in that entry may change the block's layout**, and this is a hard
constraint rather than a preference: `ui.js` reads `getBoundingClientRect()` on
these blocks *every frame, for every hotspot*, to decide which chips the copy
suppresses. An entry that animated width, letter-spacing or margin would both
thrash layout and make hotspots strobe through the arrival. Hence opacity plus
**child** transforms only — a child's transform leaves its parent's rect alone,
which is why the rise sits on `.j-h`/`.j-sub` and not on `.j-block` (whose own
`transform` is its position, anyway).

Mission is in the envelope but not the DOM choreography: its copy is the
hero's own block, which has its own entry language in `hero.css`. It gets the
fade — which is the part that removes the pop — and nothing else.

---

### 5. The popover: the same designer as the hero callouts

The named reference is the `.co` callout boot in `hero.css` — INSPIRE / EQUIP /
CONNECT powering on like numbered instruments. The popover entry is built from
the same four gestures rather than from a fade or a slide:

| hero | here |
|---|---|
| `lead-draw` — a line draws itself node → label | the panel **unfurls** from the edge facing its chip, its own gold border drawing across as the leading edge of a `clip-path` wipe |
| `core-pop` + `ring-ping` — the node flares, a ring pings once and ends at nothing | a one-pixel **filament** on the contact edge lights, draws to full height, and goes out again — ending at opacity 0, exactly as `ring-ping` does |
| `no-flicker` — the small `01` gutters alive in hard steps | the **link** (same typographic species: 0.66rem uppercase gold at 0.18em) takes the same `steps(1, end)` flicker, last of all |
| `tag-in` — the label fades in as its number flickers | title then short line, staggered, opacity only |

Timing: `j-pop-lamp` 0.26 s (the vessel's light) and `j-pop-unfurl` 0.4 s (its
extent) on `cubic-bezier(0.22, 1, 0.36, 1)` — the house settle curve already
used by `.co .ring`, `.co .lit` and the `.soon` disclosure; filament 0.62 s;
title +0.10 s, short +0.17 s, link +0.24 s. Total ~0.62 s.

**Direction is load-bearing, not decorative.** The wipe is selected from
`data-side`, which `placePop()` already sets from the flip-to-fit placement, so
the panel always opens *away* from its chip — which means the region nearest
the chip is the first to become hittable, and a pointer walking the `POP_GAP`
from chip to popover never arrives at a clipped-out area. All three placements
were exercised for real: `right` at 1440x900 and 1280x800, `left` at 375x812,
`below` at 340x640.

**What is deliberately absent: any transform, any scale, any change of size.**
`transform` on `.j-pop` is `ui.js`'s placement channel, rewritten every frame
because the chip it hangs off is world-tracked; an animation there would fight
the tracking. Scale would be motion toward the viewer, which the
hover-reliability work (`696e95d`) exists to keep out of this element. And
because the panel's box never changes, `placePop()`'s per-frame
`getBoundingClientRect()` reads a stable size right through the entry —
measured across every run at every viewport, the popover's rect took exactly
**one** size (304x121 at desktop, 233x121 at 375). The hit target it offers at
40 ms is the one it offers at rest.

Two mechanical notes worth keeping:

- **The 0.3 s opacity transition never ran on the way in, and could not.**
  `showPop()` re-parents the popover next to its chip (`h.btn.after(pop)` — what
  puts a pinned popover's link in the right place in the tab order), and a
  freshly inserted element has no previous computed style for a transition to
  run *from*. That is the whole of why the shipped popover arrived at full
  opacity on frame one with no ceremony. `j-pop-lamp` replaces it on the way
  in; the transition still owns the way out, and `hidePop()` drops
  `.j-pop-enter` *before* `.open` so the animation is never holding opacity up
  when the transition needs to take it down.
- **The entry is scoped to `.j-pop-enter`, not to `.open`** (`POP_ENTER_MS`,
  700 ms). `animation-name` is chosen by `data-side`, and `placePop()`
  re-decides that side every frame from live geometry — left on `.open`, a
  chip drifting across the flip threshold with its popover pinned would swap
  `animation-name` on a *finished* animation and replay the whole wipe, at
  rest, for no reason the visitor could see. Once the entry is spent the class
  goes and a side change is inert. `runPopEntry()` fires only on a *fresh*
  reveal, so a pointer wobbling inside a chip, or a `syncPop()` re-asserting an
  already-open popover, does not re-play it.

**Parity.** Hover, keyboard focus and the touch arm all reach `showPop` through
the same `hot` state, so all three get the identical entry with nothing said
about pointer type. Verified as identical curves at all three viewports, with
the `e20f7ff` contract intact throughout: `aria-describedby` set on reveal,
`aria-expanded` false for a transient hover/focus reveal and true once pinned
by the second tap, link out of the tab order until pinned, Escape dismissing.

---

### 6. Reduced motion

Every keyframe in both entries **ends at its element's resting style**, the
contract `hero.css`'s `.co` boot already keeps, so the reduced-motion rule is
the whole of the path: switch the animations off and the arriving copy and the
opened popover are simply already finished. Measured under emulated
`prefers-reduced-motion: reduce` at 375x812 — popover `clip-path` takes exactly
one value (`inset(-70px)`, the resting one), the filament never leaves 0, title
and link sit at 1, rect unchanged, aria unchanged.

The copy block's **opacity envelope is deliberately left running.** It is a
cross-fade, not motion; it is the same fade the scroll path has always given
copy; and switching it off would restore the instant pop for exactly the
visitors least well served by one.

### 7. Gates

- `python3 tools/capture.py --check` — **PASS**, all ten frozen goldens, worst
  MAE 0.04/255 against a 1.00 fail threshold. Copy blocks and hotspots are
  hidden by the capture CSS, so neither entry can reach a still.
- Console clean (**0 events**) over a full ride: the whole scroll down and
  back, twelve nav jumps, a jump interrupting a jump, a scroll interrupting a
  jump, every popover mode, Escape, chip-to-chip hop, home.
- Slow scroll to a rest still breathes copy in over ~2.3 s with a largest frame
  step of 0.018 and no `.j-arrive` anywhere — the scroll path is untouched, and
  the two never both run.

---

## 2026-08-11 — Three lock overrides: Connect's title, and two subs onto two lines (Hannah)

One direction, transcribed from voice, carrying three changes:

> "For the h2 of the Final section, can you have something that says something
> along the lines of — 'a thriving open AI art ecosystem'… a world in which the
> AI art ecosystem thrives would really be one in which humans and artificial
> intelligence maximise their collective creative potential. Say something like
> that, and then make that over two lines instead of three. And could you also
> make the Connect the ecosystem one over two lines as well — and change the
> title to 'Connect the community'."

**Files:** `content/content.js` (the three strings plus their provenance),
`journey/site.css` (CONNECT MEASURE, CONNECT AND FINAL SUB MEASURE),
`static/index.html` (the Tier-3 twin of the two changed-in-place strings).
No scene, camera, route or interaction change.

### The retired strings, verbatim

Three rows of the locked copy table above are now overridden. The table is
left as it stands — it is the record of what was locked, and these are the
overrides against it, the same arrangement the 2026-08-05 Final H override
uses. Retired, in full:

| Row | Retired string |
|---|---|
| Connect H | `Connect the ecosystem.` |
| Final sub | `Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many.` |

`Connect sub` is **not** in that table's retired list: the string is unchanged
to the byte. Only its rendered line count moved, and that was bought in CSS.

### What shipped

| Where | String |
|---|---|
| Connect H | `Connect the community.` |
| Connect sub | `Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art.` (unchanged) |
| Final sub | `When the open AI art ecosystem thrives, humans and artificial intelligence maximise their collective creative potential.` |

### The three judgements

**1. Connect's full stop is kept.** The direction arrived as voice, which
cannot carry a trailing period, and it asked for a *title change* rather than
for an exact string — unlike the 2026-08-05 Final H override, which dictated
its string and so got its unhyphenated "open source" and numeral "2nd"
preserved as written. The site's short chapter headings close with a stop
("Inspire and empower.", Mission's H1), so dropping it would have been a
second, unasked-for change to the one string she named. One word moves.

**2. The Final sub is drafted, not transcribed.** She gave the sense and asked
for it to be written properly. Her sentence is a conditional identity — a
world where X holds is a world where Y holds — and written out it runs 147
characters, 28 of them spent on "a world in which … is one in which". "When X,
Y" is the same claim in one move. Every load-bearing term survives in her
order: open · AI art ecosystem · thrives · humans and artificial intelligence ·
maximise · their collective creative potential. "Artificial intelligence" stays
spelled out where the same sentence abbreviates "AI art"; that contrast is hers.

Those 28 characters are not taste, they are the two-line promise: written long
the line needs 544px of column to break in two, written as shipped it needs
448px, and 448px is what leaves the measure enough headroom to survive the
fallback font. **Copy gave way; the type scale did not** — the principle the
Final heading established on 2026-08-07, applied here to a sub.

**3. Two lines is a desktop promise.** Held at 1440x900 and 1280x800; at
375x812 both subs run to four lines. That is not a shortfall against the ask so
much as the ask meeting geometry: at phone widths the blocks offer ~266px
(Connect) and ~285px (Final) of column against natural line widths of 822px and
850px, so two lines is short by a factor of three and the only remaining lever
is the type scale. Both subs ran to **four lines at 375 before this change as
well** — the phone line count is unchanged in both sections; the lines are
merely balanced now rather than greedy.

### Where the line count is actually held

`journey/site.css`, two blocks, both position-scoped so Mission, Inspire and
Owned keep the 26rem house measure and the greedy break they shipped with:

- **CONNECT MEASURE** — the block to 38rem. Not a line-count fix: "Connect the
  community." sets 494px at 1440 against "Connect the ecosystem."'s 476px, and
  the old column was 476px exactly, so the heading would have broken in two.
  The block is right-anchored and right-ragged, so it takes the width on its
  left and the type's own edge does not move.
- **CONNECT AND FINAL SUB MEASURE** — the two subs released from 26rem to the
  column their block already owns (34rem and 36rem), plus `text-wrap: balance`.
  Neither block is *widened* for a sub — both ceilings were already set by the
  heading above it. Final's block is unchanged outright (its sub stops 96px
  short of the column); Connect's renders 608px rather than the 558px its
  heading alone would ask for, which is width the 38rem ceiling already
  permitted, spent on text instead of padding, and taken on the left because
  the block is right-anchored. Balance is what makes the wider measure
  free: it minimises the longest line rather than filling to the measure, so
  the rendered result is identical at 480px and at 576px, and the extra width
  is pure fallback-font tolerance. Nothing in this build loads a webfont
  (`document.fonts` is empty), so that tolerance is not hypothetical.

### The site-map panel

No change needed, and verified rather than assumed. `journey/rail.js` builds
each menu row from `chapters.<id>.nav` (the name) and `chapters.<id>.heading`
(the line), so row 03 picked up "Connect the community." on its own. The
panel's own label is `chapters.connect.nav` = "Connect", which is still what
the section is called — only the heading names the community — so it stays.

### Gates

- **Rendered line counts**, measured off the live DOM (element height / computed
  line-height), both sections at all three sizes:

  | | 1440x900 | 1280x800 | 375x812 |
  |---|---|---|---|
  | Connect H | 1 | 1 | 2 (was 2) |
  | Connect sub | **2** | **2** | 4 (was 4) |
  | Final H | 2 | 2 | 4 (unchanged) |
  | Final sub | **2** | **2** | 4 (was 4) |

- **Tier-3 drift checker** — 5 problems across 145 checked strings and 11
  symbols, byte-identical to the 5 that were there before this change (the four
  `chapters.owned.claims.*` paths and the stale `chapters.final.heading`). **No
  sixth.** Those five are pre-existing and were deliberately not touched here.
- **Console clean** over a full ride: the wheel road down through all five
  chapters and eight nav jumps covering Connect and Final twice each — two
  `[info]` lines, zero errors, zero warnings.
- `python3 tools/capture.py --check` — **PASS**, all ten frozen goldens, worst
  MAE 0.02/255 against a 1.00 fail threshold. The capture CSS hides DOM copy,
  so a copy change cannot reach a still; all ten stayed byte-stable, as they
  should have.

---

## 2026-08-14 — Four lock overrides: Inspire renamed, Owned renamed, and the hero comes down to two lines (Hannah)

One direction, transcribed from voice and approximate by her own intent — she
asked for the sense to be written properly, so two of these four are drafted
lines rather than transcriptions:

> "The Inspire heading becomes 'Inspire the movement'. The Inspire description
> becomes roughly: 'We aim to launch and steward initiatives that inspire more
> people to care about the open-source AI art ecosystem.' The hero description
> should come down to two lines — it is three now and that looks awkward:
> something like 'Banodoco builds tools, spaces, and initiatives for the
> open-source AI art ecosystem', but find a better phrasing if there is one.
> And the Owned section becomes 'Owned by contributors', with copy along the
> lines of: 'Banodoco is 100% shared with the people who contribute to the
> open-source AI art ecosystem — granted 1% per month, between artists,
> engineers, and knowledge creators.'"

**Files:** `content/content.js` (the five strings plus their provenance),
`index.html` (the hero's own `<p class="sub">` — Mission's copy is the hero
block, not a `.j-block`), `static/index.html` (the Tier-3 twin: eight bindings,
the `<meta name="description">`, and the retired claims list — see §Tier 3).
**No CSS.** No measure moved, no type scale moved, no scene, camera, route or
interaction change.

### The retired strings, verbatim

Four rows of the locked copy table above are now overridden, plus one string
whose lock lived in a chapter doc. The table is left as it stands — it is the
record of what was locked, and these are the overrides against it, the same
arrangement every override since 2026-08-05 uses.

| Row | Retired string |
|---|---|
| Mission sub | `Banodoco builds tools, spaces, and shared infrastructure for the open-source AI art ecosystem.` |
| Inspire H | `Inspire and empower.` |
| Inspire sub *(locked by 07-chapter-inspire.md, not by this table)* | `Banodoco helps people push open models beyond their expected limits through challenges, compute, and rigorous research, turning breakthrough ideas into a thriving commons.` |
| Owned H *(locked by 09-chapter-owned.md)* | `Owned by the ecosystem` |
| Owned claims → sub *(second override; see below)* | `Banodoco is 100% shared with the people who build it — ownership granted 1% per month, split between artists, core engineers, and knowledge creators.` |

### What shipped

| Where | String |
|---|---|
| Mission sub | `Banodoco builds tools, spaces, and initiatives for open-source AI art.` |
| Inspire H | `Inspire the movement.` |
| Inspire sub | `Banodoco launches and stewards initiatives that inspire more people to care about open-source AI art.` |
| Owned H | `Owned by contributors` |
| Owned sub | `Banodoco is 100% shared with the people who contribute to the open-source AI art ecosystem — granted 1% per month, split between artists, engineers, and knowledge creators.` |

### The judgements

**1. The full stop goes both ways, and the rule is the SLOT, not the house.**
Inspire's heading keeps its stop; Owned's does not gain one. Both follow the
same rule — *the string being replaced is the precedent* — and the site has
never been uniform here: the short headings close with a stop (Mission's H1,
`Inspire and empower.`, `Connect the community.`), the long ones run open
(`Owned by the ecosystem`, `The open source ecosystem can accelerate a 2nd
Renaissance`). This is the 2026-08-11 Connect reasoning applied twice: voice
cannot carry a trailing period, and she named titles rather than dictating
strings — unlike the 2026-08-05 Final H override, which dictated its string and
so got its unhyphenated "open source" and numeral "2nd" preserved as written.

**2. The hero's two lines were bought with four words, at every size.** Her
sketch — `…initiatives for the open-source AI art ecosystem.` — was measured
first, and renders **2 / 2 / 3** lines against the hero sub's 24rem (384px)
measure: the desktop ask met, and the phone left at the three she called
awkward. Dropping `the … ecosystem` takes the natural line from 635.5px to
520.2px and renders **2 / 2 / 2**.

That is the first time on this site that *copy gives way before the type scale*
has bought the promise at **all three sizes** rather than desktop-only, and the
words it spent were the weakest on the page: the H1 immediately above this line
**ends** with "open-source AI art ecosystem thrive.", so the sub was repeating
its neighbour's closing phrase verbatim, one line down. "ecosystem" is still the
site's word — it survives in that H1, in the Owned sub and in the Final sub.

Her own substitution, `shared infrastructure` → `initiatives`, is better than a
synonym swap and is kept for a reason worth stating: the site has three
chapters, and "tools, spaces, and initiatives" names them — Inspire's
initiatives, Connect's spaces, the tools throughout. "shared infrastructure"
named nothing on the page. The word then recurs in the Inspire sub, which is
structure rather than repetition: the hero states the third term, the chapter
elaborates it.

**3. The Inspire sub is drafted, and the third person is bought rather than
paid for.** The register split on this site is deliberate and visible: HEADINGS
speak as "we" (Mission's H1, "We're working to help…"), SUBS speak as
"Banodoco" — all four of them. A first-person sub among three third-person ones
reads as an inconsistency rather than a choice, so "We aim to" became
"Banodoco". The hedge went with it and cost nothing it was carrying: the
initiatives are not aspirational — they are the three nodes of this very
chapter (Arca Gidan Prize, ArtCompute, 2RP). What *is* aspirational is
inspiring people to care, and that survives intact as the purpose clause.

The layout arithmetic is the interesting half. Her exact sentence rendered
third-person is 115 characters and sets a natural line of **850.7px**, against
the **832px** two lines of the block's 26rem (416px) measure can hold — so it
would have been **3 / 3 / 4**, one line WORSE than her own sketch's 2 / 2 / 4.
Dropping the same four words the hero gave up takes it to 740.5px and
**2 / 2 / 3**: two lines at both desktop sizes and one line fewer than her
sketch on a phone. Every load-bearing term survives in her order — launch ·
steward · initiatives · inspire · more people to care · open-source AI art —
and the echo of the heading's "inspire" is hers and is deliberately kept.

**4. The Owned sub is a SECOND override, and it goes further than the first
did.** The 2026-08-05 override turned the three locked claims into prose and
recorded that their meaning was "preserved intact… split between those exact
three groups". This one does not preserve them intact, and that is stated
rather than glossed:

- **`core engineers` → `engineers` moves a locked claim.** The "Owned claims"
  row names the three groups as *artists, core engineers, knowledge creators*,
  and core engineers are a subset of engineers, so the circle is genuinely
  wider. It is kept as she said it and read as deliberate rather than as a
  transcription slip, because the sentence's other change moves the same way:
  `the people who build it` → `the people who contribute to the open-source AI
  art ecosystem` widens who is included by exactly the same gesture. Two
  widenings in one sentence is an intent, not a slip.
- **`ownership` is dropped and not restored.** 2026-08-05 added that word
  because "granted 1% per month" had no antecedent in a run-on sentence. It has
  one now — the sentence's subject is the sharing, so the em-dash clause reads
  as a reduced relative on the 100% share. Her tightening stands.
- **`split` IS restored against her transcript**, and it is the one word here
  where following the transcript exactly would have printed something she did
  not mean. Voice can carry "granted 1% per month, between artists…" as an
  ellipsis; print cannot — "between" is left with no verb and the reader has to
  supply "divided". It is also one of the locked claim strings ("Split between
  different groups"), so restoring it repairs the grammar and returns a locked
  word in the same move, at zero cost to her sense. Same class of judgement as
  keeping Connect's full stop.

**Left alone, deliberately:** `nodes.pod-split` and `site.legal` still read
"core engineers". The pod cards are not rendered in this build — Owned
registers the sixteen `contributor-N` hotspots, not pods — and the legal line
is explicitly placeholder pending Legal/Peter sign-off. Editing a legal
sentence off the back of a voice note about a heading would be worse than the
inconsistency. Flagged, not fixed; it wants Legal's own pass.

### Rendered line counts

Measured off the live DOM (element height minus padding, over computed
line-height), all three review sizes. Untouched sections are included as the
control.

| | 1440x900 | 1280x800 | 375x812 |
|---|---|---|---|
| **Mission sub (hero)** | **2** (was 3) | **2** (was 3) | **2** (was 3) |
| **Inspire H** | 1 (was 1) | 1 (was 1) | 2 (was 2) |
| **Inspire sub** | **2** (was 4) | **2** (was 4) | **3** (was 6) |
| **Owned H** | **1** (was 2) | 1 (was 1) | 2 (was 2) |
| **Owned sub** | 4 (was 3) | 4 (was 3) | 5 (was 5) |
| Connect H / sub | 1 / 2 | 1 / 2 | 2 / 4 |
| Final H / sub | 2 / 2 | 2 / 2 | 4 / 4 |

Connect and Final are **unchanged from the 2026-08-11 table**, which is the
proof that no measure moved: every block still owns exactly the column it did.

Two notes on the numbers that are not improvements:

- **Owned's sub gained a line at desktop** (3 → 4). No line count was asked for
  there and none is promised. The sentence grew by 23 characters and took a
  fourth line for them; three lines would need it under ~1248px of natural
  width and it sets 1290.6px. The heading it sits under **lost** one (2 → 1),
  so the block is the same height it was.
- **Owned's heading gains nothing at 1280**, where it was already one line, and
  is still two at 375. `Owned by the ecosystem` set 499.4px against a 480px
  column at 1440 and broke by 19px; `Owned by contributors` sets 468px and does
  not. The measure did not move — the copy came in under it.

**No size fails a promise.** The only line count Hannah asked for is the hero's
two, and it holds at 1440x900, 1280x800 **and** 375x812 — so unlike the Connect
and Final subs of 2026-08-11, this one needs no desktop-only caveat and no
mobile fallback to explain.

### Tier 3, and the drift checker

Eight `data-src` bindings moved with the five strings (each heading appears
twice — once in the site-map menu row, once as the section's own `<h2>`), plus
the page's `<meta name="description">`, which carries the hero sub and is not
`data-src`-bound.

**The Owned section's claims list is retired here too, and that is not
incidental scope.** The list retired in the live tier on 2026-08-05 —
`CONTENT.chapters.owned.claims` was deleted outright, and ui.js's `.j-claims`
renderer and site.css's `.j-claim*` rules went with it rather than staying as
an unreachable branch — but this twin was left behind, still bound to four
paths that no longer exist. Those four were **four of the five standing drift
errors on this page.** They had to go now because the string this section
should be mirroring is one Hannah changed today: the section cannot carry
`chapters.owned.sub` while it is rendering the list that sub replaced. It is
now the same `<p class="sub">` every other chapter's section uses, and the five
dead `.claims` / `.claim-*` rules went with the markup, exactly as their live
counterparts did.

**Drift checker, before and after:**

| | before | after |
|---|---|---|
| problems | **5** | **1** |
| checked strings | 145 | 142 |
| symbols | 11 | 11 |

The arithmetic is exact: 145 − 4 retired claim bindings + 1 new
`chapters.owned.sub` = 142. **No sixth error was added**, and the one that
remains is the fifth pre-existing one — `chapters.final.heading`, whose section
`<h2>` still reads `We're working to accelerate the second renaissance.` while
`content.js` carries the 2026-08-05 override. It is untouched here because it
is nothing to do with these five strings; it is a one-line fix waiting for
whoever next opens that section.

### The site-map panel

Verified rather than assumed, at all three sizes, by opening the panel for
real. `journey/rail.js` builds the lede from `chapters.mission.sub` (line 544)
and each row from `chapters.<id>.nav` + `chapters.<id>.heading` (573/574), so
all three changed strings arrive on their own:

    lede      Banodoco builds tools, spaces, and initiatives for open-source AI art.
    Mission   We're working to help the open-source AI art ecosystem thrive.
    Inspire   Inspire the movement.
    Connect   Connect the community.
    Owned     Owned by contributors
    Epilogue  The open source ecosystem can accelerate a 2nd Renaissance

The row NAMES are `chapters.<id>.nav` — "Inspire" and "Owned" — which are still
what the sections are called; only the headings were renamed. They stay, the
same decision 2026-08-11 took for Connect.

### Gates

- **Rendered line counts** at 1440x900, 1280x800 and 375x812 for every changed
  string, plus Connect and Final as unchanged controls — table above.
- **Screenshots** of all three changed sections at all three sizes, plus the
  site-map panel open.
- **Tier-3 drift checker** — 5 problems → **1**, no new one; arithmetic
  reconciled above.
- **Site-map panel** verified live at all three sizes.
- **Console clean** — 0 errors / 0 warnings at all three sizes over a ride
  through all five chapters plus the panel.
- `python3 tools/capture.py --check` — **PASS**, all ten frozen goldens MAE
  **0.00/255**, 0.0% px>8. The capture CSS hides `.ui` and `.j-copy`, so a copy
  change cannot reach a still; all ten byte-stable, as they should be. Nothing
  re-shot.

### Residuals

1. **`nodes.pod-split`, `nodes.pod-shared` and `site.legal` still say "core
   engineers"** (and pod-shared still says "the people who build it"). Unrendered
   in Tier 1, rendered in Tier 3's node list, and awaiting Legal/Peter on the
   legal line. Named above; not fixed here.
2. **The locked copy table at the head of this file now has five overrides
   against it** (Connect H, Final H, Final sub, and today's Mission sub /
   Inspire H / Inspire sub / Owned H / Owned claims-as-sub). It is still the
   record of what was locked, which is why it is not edited — but a reader
   coming to it cold now has to read four dated sections to know what ships. A
   "current strings" table alongside it would be worth having.
3. **`chapters.final.heading` drift in Tier 3 is still there** — the fifth
   pre-existing error, one line, out of scope for a copy change that does not
   touch Final.
