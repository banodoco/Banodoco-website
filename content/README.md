# Editing content: what changes safely, and what needs code

`content/content.js` is the single source of truth for every string on the
site (13-content-ops.md CO-2.2: "No duplicated strings"). It has two readers:
the live journey reads it directly, and `static/index.html` carries a
**hand-authored twin** of the same copy, asserted by a drift guard at the foot
of that file (`static/index.html:1729` imports `CONTENT`; any mismatch is a
`console.error` naming the path, the expected string and the rendered one —
`static/index.html:1808-1813`). The symbol marks get the same treatment
(`static/index.html:1782-1815`).

One extra mirror: the Mission sub is also the hero's own block in the Tier-1
`index.html` (`index.html:118`). Every other string has exactly two homes.
Read the provenance comment above a string before touching it — the lock
overrides mark which strings are Hannah's and how they were approved.

## Safe: strings only

Editing a string in `content/content.js` **and** the matching spot in
`static/index.html` changes nothing structural:

- chapter `nav`, `heading`, `sub`
- node `label`, `short`, `spotlight` `title`/`body`/`status`/`link.label`/`link.href`
- card `title`/`body`/`claim`, action `label`/`href`
- contributor `name`/`role`/`blurb`
- `site.links` / `site.social` `label`/`href`, `site.legal`

Pass condition: load the page and read the console. Green
`[tier3] content in sync with ../content/content.js — N strings, N contributors,
N nodes, N symbols` (`static/index.html:1812`) means both twins agree. Red
`[tier3] CONTENT DRIFT — N problem(s)` is the mirror you forgot.

## Structural: silently breaks without code

Every row below looks like a copy edit and is not one. The drift guard covers
only strings and symbols — nothing in the console tells you the rail, the
scene or the goldens have drifted.

| What you want | What it actually takes |
|---|---|
| add / remove / reorder a **chapter** | a `ROUTE` entry (`journey/route.js:71` — span, stops, scroll) + a chapter module (import in `journey/journey.js:27-30`, new `journey/chapters/<id>/` with `index.js` + `camera.js`) + a `COPY_BANDS` row (`journey/constants.js:289`) + a `CHAPTER_POSITION` row (`journey/ui.js:58`) + a mark in `SYMBOLS` (`journey/symbols.js:69`) + the static twin's rail/panel/copy + new goldens (`POSES` at `tools/capture.py:108` + `static/captures/`). "Reorder" alone moves every derived p-range and every golden |
| rename a **chapter or node id** | three layers of string coupling: (1) the key in `content/content.js` (chapter/nodes map plus every `chapter:` pointer); (2) the code registries — `route.js:71` ids, the `registerHotspots` lists (`journey/journey.js:312`), chapter anatomy ids (`EXITS` at `journey/chapters/inspire/anatomy.js:100`, `HUB_IDS` at `journey/chapters/connect/tendrils.js:239`), and the `COPY_BANDS` / `CHAPTER_POSITION` / `SYMBOLS` keys; (3) the static twin's authored `data-chapter` / `data-node` / `data-sym` attributes. In the middle sits the alias table: `normaliseNode` maps `2rp → tworp` and `community → discord` (`journey/journey.js:475-478`), mirrored in the twin's own router (`static/index.html:1531-1533`) and in `chapters/inspire/index.js` (`:1257`, `:1272`, `:1297`). Miss one and old deep links silently 404 or land on the wrong node |
| add / remove an **Inspire spotlight** | `EXITS` is exactly three entries (`journey/chapters/inspire/anatomy.js:100-103`), and the hero spore driver hard-requires three: `organism/spores.js:61-62` mirrors the exit azimuths/rises in 3-wide arrays (`FIL_AZ`, `FIL_RISEMAX`) consumed by `for (e = 0; e < 3; ...)` loops (`spores.js:125, 166, 461, 756, 875, 903`). No lane for a fourth, no hole-proof for a third. Plus the hotspot list (`journey.js:312`), the twin's spotlight markup, and the Inspire golden |
| add / remove a **Connect hub** | `HUB_IDS` (`tendrils.js:239`) + `HUBS` positions (`tendrils.js:234`) feed shader lanes hard-vectored to three: `uLit`/`uHead`/`uLitMax`/`uRouteAmp`/`uPulseHead`/`uPulseAmp` are all `vec3`, "ONE FRONT PER ROUTE" (`tendrils.js:62-63, 254-261`), and `chapters/connect/index.js` writes exactly three components (`:631-632`) and reads `pulses[0..2]` by hand (`:662-671`). **2 hubs throws** — `pulses[2]` is undefined and the per-frame animator dies. **A 4th hub is silently unlit** — no vec3 lane for it, and its route index 3 collides with the hairline tier (`tendrils.js:277-278`) |
| add a **17th contributor** | `REST_SITES` is authored for sixteen (`journey/chapters/owned/portraits.js:682-698` — the composition IS the table, "the frame is the spec"). Placement wraps: `REST_SITES[i % REST_SITES.length]` (`portraits.js:706`), so #17 reuses site 0 and overlaps a face. The atlas is a fixed 8-wide grid — `ROWS = ceil(NODE_COUNT / 8)` (`portraits.js:824-826`) — so the row math changes and the Owned golden must be re-shot. Fewer than 16 reads sparser; more crowds. Both are scene changes |
| ship **real portrait photos** | DONE 2026-08-16, and not via this file. The field shows real contributors' own avatars from Banodoco's published sprite (`assets/contributor-portraits/`), and WHO appears is dealt at random per load from `content/contributors.js` (120 people). To change the roster, edit that pool, not the sixteen slot rows in `content.js` — those rows are positions, and portraits.js overwrites their name/role/blurb on every deal. Name, role, blurb and face are dealt together and must never be separated. |
| a **very long heading or word** | line counts are layout promises held in `journey/site.css` measures — `CONNECT MEASURE` (`:939`), `FINAL HEADING MEASURE` (`:972`), `CONNECT AND FINAL SUB MEASURE` (`:1000`) — copy gave way, the type scale did not. The Mission sub's two-line promise is the same deal (`content/content.js:53-63`). And there is no `overflow-wrap` / `word-break` / `hyphens` anywhere in the repo yet: a single long unbreakable word can still blow a measured block sideways |

## Golden rule

If the edit changes which strings exist, which ids name them, or how many of
anything there is — that is structure. Structure needs code and goldens, not
copy. String-only edits are safe as long as both twins move together.
