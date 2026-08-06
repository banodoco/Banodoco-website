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
