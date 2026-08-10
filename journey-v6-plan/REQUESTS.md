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
| 64 | **Connect ground lighting at ~a third of current speed.** | FOURTH request on this pacing. `c77fb00` reported Connect's schedule fully spent (0.1021 p is the whole distance from first-draw to the frozen rest), so this needs more road — a route/rest change. |
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
