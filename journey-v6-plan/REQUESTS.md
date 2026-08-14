# Hannah's request register

Every request Hannah has made, in the order she made it, with its state and
where it landed. Kept so nothing gets lost — she asked for this on 2026-08-09
after a long run of voice notes, and it is the authority on what is
outstanding. Update it whenever a request lands or a new one arrives.

Status: **done** (shipped, gated) · **open** (not started) · **running**
(in flight) · **blocked** · **decision** (waiting on Hannah)

---

## Open — not yet started

| # | Request | Notes |
|---|---|---|
| 62 | **Inspire→Connect should be ONE dramatic movement.** Reads as two separate movements, feels stilted; wants the character of the hero→Inspire arrival. | The leg has been worked twice (`6acceac` monotone zoom-out, `e95820a` composed-frame stall). This is a new complaint: it reads as two gestures, not one. |
| 65 | **Owned portraits: put colour back in.** Too much has been sapped out. | Keep them integrated with the warm palette. |
| 59 | **Three glowing lines still visible after Inspire**, clearly in the Epilogue. | Strong suspicion: `d42c9a8`'s three lee filaments are permanent by design (that permanence is what made crossings motionless), so any lighting reveals the lanes everywhere. Resolving it must not regress the motionless boundary. |
| 60 | **Epilogue tap still drops sparkles off the body.** | **Refutes** the previous pass's "already gone" verdict. Look wider than the shed — the clones carry the main model's five point layers, and its tap ripple makes motes glint. |
| 61 | **Final field at ~quarter speed**, both per-body kindle and overall progression. | FIFTH pacing request. `5401820` said a further slowdown needs chapter-boundary moves; those are authorized. |
| 47 | **End-hold: stale zoomed-out view still reachable.** At the very bottom you can still scroll out to a more zoomed-out view. | Hannah thinks it is a hangover of the old footer/end-hold; likely left by removing the Site Information band and the flight system. |
| 48 | **Final: mushrooms light one at a time, like a town of Christmas trees.** Much more gradual than now. | Taste/pacing. Builds on the stagger widened in `0965a73`; she wants it considerably further. |
| 49 | **Final: tapping a field body emits a different spore effect.** Something pops out from underneath; should be identical to the main mushroom's response. | Regression or leftover despite `070892c` / `e1b1e2b`. |
| 52 | **Mission → Final jump flashes the end state.** A burst that looks like the fully-progressed epilogue appears, vanishes, then the transition runs. | Investigation dispatched. |

## Waiting on Hannah

| Item | What is needed |
|---|---|
| **The push** | 99+ commits and two tags are local only. Needs a GitHub classic PAT with `repo` scope: generate it, then `pbpaste > ~/.github_token`. Everything ships in one command after that. |
| **Missing external URLs** | The site menu and several nodes carry placeholder `#` links. Unconfirmed: banodoco.ai, the 2RP publication, Contact, the Discord invite, GitHub, Arca Gidan Prize, ArtCompute, and Owned's "Learn more". |
| **Test portraits** | `assets/test-portraits/` is placeholder imagery under a standing pre-deploy deletion rule. Real portraits (with consent) are needed before any public deploy. |
| **A second portrait set** | Remix currently re-deals one set. A second real set would make it a true recast. |
| **Final heading length** | It is four lines on mobile at house type scale. If that is too many, the lever is the copy, not the type. |

## Done

### Navigation
| # | Request | Landed |
|---|---|---|
| 31 | Replace the top nav with a side section navigator | `02f6ec0`, `9eb274d` |
| — | **Right-side navigation redux**: two-symbol rail, hover-expand fan, slide-in site map; remove the left rail and the bottom Site Information band | `26ca8d3`, `194e451` |
| 43 | Epilogue item unclickable, fan closed on approach | `48b7795` |
| 44 | Menu button's first click should open the menu | `48b7795` |
| 45 | Fan should collapse on de-hover after a click | `48b7795` |
| 46 | Rail needs a backing so it stays visible over bright frames | `48b7795` |
| 63 | Remove 2RP from the header only; Inspire keeps its node | `6e828d2` |
| 66 | Mobile: the expanded backing covers only the icons; first tap on the menu mark verified to open the panel on touch | `09a0c39` |

### Spores (the long thread)
| # | Request | Landed |
|---|---|---|
| 22/24 | Spores read as a different population entering Inspire; must be one population, lighting only | `b2c9584` |
| 35 | Entering Inspire they "flash up and weirdly appear" | `9e2a277` |
| 37 | Widen the reveal's scroll budget so it cannot flash at speed | `2fdb4e6` |
| 38 | Spores rearrange weirdly Connect → Inspire | `e2bd6e8` |
| — | Spores "move position to work for the next section" leaving Inspire | `30fd839` |
| 42 | Spores gather on the way BACK into Inspire | `4feb006` |
| 13 | Final spores must match the hero's and react to wind | `836d373` |
| 33 | Sparkles dropping from non-primary mushrooms | `e1b1e2b` |

### Camera and motion
| # | Request | Landed |
|---|---|---|
| — | Mission → Inspire should be one continuous arc | `6acceac` |
| — | Inspire → Connect should be a single zoom-out | `6acceac` |
| 26 | Inspire → Connect should be one smooth rotation | `e95820a` |
| — | Connect → Owned is jerky | `2a27db7` |
| 21 | Owned → Final should zoom out and rise | `1d0f5e0` |
| 36 | …and lose the push-in and the initial sink | `8b71687` |
| — | Nav jumps do a weird little hop | `043a1f2` |
| — | Scroll stops and starts when momentum is short | `7e98b73`, `e149884`, `90920fa`, `9c2cce1` |

### Connect
| # | Request | Landed |
|---|---|---|
| — | Restage as an above-ground ground network | `3cd1885`, `5c8b3fd` |
| — | ADOS to the left of the mushroom | `6acceac` |
| — | Text top-right, mushroom top-left, hubs through the gap | `9e76bf4` |
| — | Paths should pre-exist rather than being conjured | `f9e8317` |
| — | Raise the camera so the mushroom sits centred | `f9e8317` |
| 14 | Hubs light one at a time, slower | `4146288` |
| 25 | Verify the growth is slow enough | `e0bedf5` — she was on an old build |
| 39 | Ground lighting much more gradual | `c77fb00` |

### Inspire
| # | Request | Landed |
|---|---|---|
| 11 | Reorient so three streams sit above the copy | `c6bbbab` |
| 23 | Centre the cap above the text | `ca7a769` |
| 34 | Push the mushroom down for balance | `93723f0` |

### Owned
| # | Request | Landed |
|---|---|---|
| — | Redesign to the reference image (root crown, faces in the network) | `81a9861` |
| — | Claims become prose | `e20f7ff` |
| 15 | Hover on face nodes unreliable | `696e95d` |
| 16 | Faces jump toward the viewer on hover | `696e95d` |
| 28 | Only localised roots should light on hover | `696e95d` |
| 17/18 | Learn more + Remix buttons | `eea3ffe` |
| 69 | **The Owned click state becomes the hover state** — remove the separate hover state, show the full click-state treatment on hover, available immediately on entering the section (no ~5s delay), released immediately on de-hover, no click required. | `b3dc34b` — the card grew the popover's two tiers (transient hover/focus reveal + the shipped pinned dialog). The "~5s delay" was `HOTSPOT_STAGGER_MS` queuing chips that draw nothing at rest: last chip live 3251 ms → 1052 ms on a jump, 1999 ms → 205 ms on a wheel entry. Touch: one tap → the committed sheet. See `20-owned-root-network.md` §25–31. |
| 70 | **Two things show on the orbs on hover; delete the smaller one, keep the black panel above.** | `eec1d47` — the smaller one was the `labelOnHover` chip pill (a gold dot + "CONTRIBUTOR · RESEARCHER"), which predates request 69; it only ever coexisted with the card from `b3dc34b`. Deleted from the DOM per-node via a new `chip: 'none'` label policy, so Inspire/Connect pills are untouched. Nothing lost — the card's heading and first line carry the same two fields, and `aria-label` is unchanged. See `20-owned-root-network.md` §32–37. |
| 71 | **Greatly reduce the sepia on the hovered image.** | `eec1d47` — measurement moved the diagnosis: the bake (`45f600b`) was not the dominant term. The hover response was — the core lamp goes 0.07 → 0.31 over the middle of the face and the image term 1.12 → 1.42, before bloom. All three new terms ride `uPhoto * vH`, so the resting frame and the goldens are untouched. Hovered face is 33% closer to the resting photographic read (dE76 23.99 → 16.16, noise floor 3.05). The ember RIM is deliberately unchanged. See `20-owned-root-network.md` §34. |

### Final
| # | Request | Landed |
|---|---|---|
| — | Match the hero's design; add a field into the distance; move copy; hide the faces | `8d7e21f` |
| 12 | Vary the field so each body is its own thing | `d0ff2b3`, `9493fcc`, `66d1bed` |
| 19 | Field poke must match the hero's | `e493737`, `070892c` |
| 20 | Field bodies enter like the hero, not turning black | `070892c` |
| — | Field must not light up on hover | `0d9bcbd` |
| — | Entry animation on the clones | `e493737` |
| 32 | One interconnected root canopy | `2f4c2f1` |
| 40 | Bodies arrive slower, one at a time | `0965a73` |
| 51 | Dense world through the transit, no half-built edges | `45a6628` |

### The scroll loop
| # | Request | Landed |
|---|---|---|
| — | Scrolling past either end wraps to the other, on the same gesture threshold, by a considered camera path | `2c22844` |
| — | Neither loop direction may feel like a cut or a teleport | `6f23d90` |
| — | "It still just jumps DIRECTLY" — the lap was armed and cancelled on its own gesture, so no visitor ever saw it | `e4df4b0` |
| — | Stopping mid-loop leaves the hero mushroom permanently displaced | `a937444` |
| — | The fairy ring lights up / down "all in one go"; wants it one piece at a time | `e1e8381` |
| — | Down-wrap switches the field off before the motion starts; wants them going off as it goes | `027f969` |
| 68 | **The ground lights up and darkens very suddenly in both loop directions; make it incremental.** | `9865e86` — the Final terrain and root canopy were the only things in the chapter with no ladder, so their whole brightness was the one fade scalar, and on a lap that scalar is a step at both ends. They now ride the field's own driver: 2.8% → 59.7% of the lap going out, 2.6% → 32.9% coming in. See `26-scroll-loop.md` §31–36. |

### Interface and content
| # | Request | Landed |
|---|---|---|
| — | Hero callouts clickable, labels above their nodes | `a089e40` |
| — | Hero callouts must not move with the wind | `e20f7ff` |
| — | Hover reveals details beside the cursor | `e20f7ff` |
| 29 | Popovers need an elegant entry animation | `d1ecc23` |
| 27 | Section copy needs an entry animation on jump | `d1ecc23` |
| — | New Final heading, two lines | `e20f7ff` |
| 30 | Make every mobile layout elegant | `75082e6`, `0bdb4df` |
| 41 | Tap/poke response broken (regression) | `6903c4a` |
| 50 | Hovered items should stop moving in the wind | `6d37205` (hover), subsumed by `851c77a` (all states) |
| 58 | Inspire labels point at the lit rim edge (the `ce91bc2` embers) | `851c77a` |
| 67 | Chips and their markers never ride the wind, any state, any chapter | `851c77a` |

### Process
| Request | Outcome |
|---|---|
| 73 | **"Do we have some concept of the terminal velocity — the natural velocity to go from one section to another? Could you make the velocity from Owned to Final and back be faster."** | Yes, and it is now named and per-leg declarable: `TRANSIT_S` in route.js, in SECONDS rest-to-rest. Owned<->Final 3.27/3.44 s baseline (7.01/7.54 as mis-shipped by `3daac2e`) -> **2.60 / 3.01 s**. Field kindle went SLOWER (1.04/1.16 -> 1.31/1.27) — travel and kindle decoupled by arming the Final reveal limiter on glides. Per-leg transit table in 26-scroll-loop.md §37. |
| 64 | Connect ground lighting at ~a third of current speed | `0701653` (road), superseded/completed by the glide-unit fix below |
| 72 | **Connect ground lines "even slower, one at a time elegantly — they still appear rapidly and manically"; "roots growing out, not lights turning on"; Hivemind into ADOS, getting slower as they go.** SIXTH pass. | Root cause was NOT in this chapter: the commit glide was denominated in p/s, so every `scrollVh` raise the five earlier passes bought was discarded for any visitor who scrolled and released. Arrival 1.70 s -> 5.54 s (3.26x), windows 1.05/2.25/3.21 s decelerating. |
| Structural audit of the codebase | Delivered. Verdict: the architecture has held; debt is absolute-p leakage in two files, four camera↔geometry couplings, and a decision log frozen at D16. An 8-item cleanup plan exists; **items 1–5 are not yet done.** |
| Keep a structured register of requests | This file. |

---

## Deferred by Hannah's own instruction

Nothing currently. Items she has explicitly parked would be listed here.

## Known residuals worth her eye

- Inspire → Connect still has a shallow (~9%) brightness sag; the character is
  fixed but the magnitude is not. Flattening it means reshaping the stream
  envelope, which moves an approved rest frame.
- The audit's cleanup items 1–5 (docs, absolute-p derivation, sheet-drag
  dedupe, dead code, gate hardening) are queued but unstarted.
- **The Epilogue's sky still switches on the loop.** Request 68 fixed the
  ground; the spore cloud and mist horizon on the same frames still change
  their whole brightness inside 100 ms in both directions. Left alone
  deliberately — it is the air, not the floor, and it carries 82% of the
  particulate light in frame, so re-timing it is a composition decision.
  `26-scroll-loop.md` §36 has the one-line change if she wants it.
