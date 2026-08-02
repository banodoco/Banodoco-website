# ADR AR-6 — URL / route scheme

- **Status:** approved (Tech Lead, 2026-08-02).
- **Filename note:** this records **AR-6** from `02-architecture-reconciliation.md`. It is unrelated to decision-log **D6** (the "02 EQUIP — coming soon" callout, resolved by Hannah as *keep as a passive tease*). The two share a number by filename convention only.

## Scheme

Hash routes on the hero page's own origin — one static page, no server rewrites, no history API path handling:

```
#/mission
#/inspire            #/inspire/arca      #/inspire/artcompute   #/inspire/tworp
#/connect            #/connect/community #/connect/ados         #/connect/hivemind
#/owned              #/owned/pod-shared  #/owned/pod-monthly    #/owned/pod-split
                     #/owned/person-0 … #/owned/person-13
#/final
```

- **Grammar:** `#/<chapter>[/<node>]`. Chapter ids are exactly the five journey-state ids in `journey-v6/constants.js` — the router has no id list of its own.
- **`#/final` takes no node.** The epilogue has no detail state by design (v6: "The Final pullback has no deep detail state"). Navigation *highlight* during Final stays on Owned per the handoff, but the shareable route is still `#/final` — highlight and route are separate concerns.
- **No `#/equip`, ever.** Equip has no route, nav item, preload entry, or scroll space. The hero's on-mushroom EQUIP callout keeps its inert `href="#"` (D6), so it cannot mint one. Legacy donor links (`#/equip`, `#/equip/pype`, `#/equip/arnold`, `#/equip/astrid`) and any unknown chapter are **normalised to `#/mission` with `replaceState`** — never a scroll to 0, never a 404 state.
- **Aliases:** `#/inspire/2rp` → `#/inspire/tworp` (ids stay `tworp`; `2rp` is the display name only).

## Write policy

| Event | History op | Why |
|---|---|---|
| Scroll/scrub crosses into a new chapter | `replaceState` | Scrubbing must not fill the back stack |
| Nav click / CTA hand-off to Inspire | `pushState`, then fly the camera | The visitor chose to travel; Back should undo it |
| Opening a detail state | `pushState` (only if none was open) | Back closes the detail — see below |
| Retargeting one open detail to another | `replaceState` | One Back should not walk a chain of drawers |
| Closing a detail manually (✕ / Esc / outside-click / scroll-intent) | `history.back()` when the current hash still names that node, else `replaceState` to the bare chapter | Consumes the entry the open pushed, so Back never looks dead on an identical hash |

## Deep-link behaviour

Landing on a deep link **places, never replays**:

1. Parse on boot, before the first frame. Unknown → normalise, above.
2. Set journey progress **instantly** to that chapter's resting `p` (`start + 0.5 × span`) — no flight, no journey replay.
3. Await that chapter's streaming set (the threshold streamer is forced to arm every seam up to and including the target) before opening anything.
4. If a node is present, open its detail once the camera has settled at the resting pose (≈600 ms), and move focus to the drawer's close control.
5. The hero intro choreography still plays on a deep link (it is the page's own entry), but the journey does not scrub through Mission → Inspire → … to get there.

Tier 3 / reduced-motion resolves the *same* hashes: the chapter section is scrolled into view and the node's `<details>` is opened. One URL space across all tiers.

## Back / Forward semantics

- Back with a detail open → closes the detail, camera stays at the chapter's resting pose.
- Back with no detail open → previous chapter state; the camera **flies** the spatial route rather than teleporting, unless the two states are non-adjacent, in which case it jumps (a full-journey flight on a Back press reads as a hang).
- A `hashchange` targeting the chapter the camera is already in must not yank the camera to the resting pose (donor bug already fixed in `core/journeyState.js`; behaviour is carried over).
- Manual scroll cancels any in-flight nav flight immediately and control returns to the visitor (v6 §Navigation).
- Forward re-applies the same rules; no state is reconstructed from anything but the hash plus journey progress.

## Consequences

- The router reads chapter ids from `constants.js` and node ids from the content model, so adding Equip back in a later phase is one range + one content block, with no router change.
- Hashes are not crawlable. The crawlable surface stays the footer index plus the Tier-3 DOM, exactly as v6 requires.
- `rel="canonical"` points at the bare page URL so shared detail links do not fragment analytics or search.
