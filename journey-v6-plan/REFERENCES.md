# Reference Images — Catalogue & Overrides

All images extracted from the v6 handoff docx. **The written handoff overrides mockups wherever they disagree.** The known disagreements are listed per image.

## Global overrides (apply to every mockup)

1. **Painted header nav is wrong everywhere.** Every mockup shows `MISSION EQUIP CONNECT INSPIRE OWNED`. The v6 nav is **Mission · Inspire · Connect · Owned** — no Equip, and the order is Inspire-first. Never copy nav from an image.
2. **The real baseline is the live hero** (`http://localhost:8137/golden-mushroom-page.html`), which has *no* chapter nav in the header and three on-mushroom callouts (01 INSPIRE / 02 EQUIP "coming soon" / 03 CONNECT). Decision D6 governs the Equip callout.
3. Mockup captions/supporting copy differ from the approved copy in places — the locked table in `13-content-ops.md` wins.
4. The stills have photographic/painterly glow the real-time build **interprets** through the approved lens, not reproduces (expectation-gap risk).

## `approved/` — the five current-phase poses

| File | Chapter | Take from it | Ignore / overridden |
|---|---|---|---|
| `mission-hero.png` | Mission | The accepted hero composition: left copy, three-quarter organism, colony ground field | Header nav (see live hero instead) |
| `inspire.png` | Inspire | Rear-crown framing, three rim-fed plumes with label chips (Arca Gidan Prize top, ArtCompute left, 2RP right), bottom copy position, rim-light emphasis | Painted nav; final plume shapes come from the airflow-field build, not the still |
| `connect.png` | Connect | Gill colonnade architecture, three annotated behaviours (Community region, ADOS knot upper-right, Hivemind braided trail lower-right), left copy | Painted nav; "EXPLORE THE ECOSYSTEM" CTA in-frame is Mission's CTA, not a Connect element |
| `owned.png` | Owned | Top-centre claims hierarchy (100% shared primary pill, two secondary pods), portrait ember-nodes woven at many depths, dark pockets | Painted nav; exact portrait count/placement comes from the content model |
| `final.png` | Final | Oblique above/below cutaway, diagonal soil-line, irregular ring, forest horizon, broad broken spore sky, upper-left copy | Painted nav; no CTA text change is implied ("Explore the ecosystem" appears here in the still — final CTA copy TBD with Peter) |

## `sheets/` — contact sheets (orientation only)

- `contact-sheet-a.png`, `contact-sheet-b.png`: six-frame overviews from the earlier phase (numbered with Equip as chapter 2). Useful for grade/mood consistency at a glance; the ordering and Equip frames are obsolete.

## `superseded/` — retained for a later phase or overridden

| File | What it is | Status |
|---|---|---|
| `mission-early.png` | Earlier hero comp (taller dome cap) | Superseded by the implemented hero |
| `equip-v1.png`, `equip-v2.png` | Equip chapter (PYPE / Arnold / Astrid stipe interior) | **Deferred phase.** Retain conceptually; build nothing |
| `astrid-drawer.png` | Astrid detail drawer with activity stats | Deferred; also note its hardcoded stats are exactly what CO-3 prohibits without an automated source |
| `connect-alt.png` | Alternate Connect comp (distant pillars + city-like blocks) | Superseded by `approved/connect.png` |
| `inspire-cap-top-plumes.png` | **Inspire with plumes erupting from the cap top** | **Explicitly overridden**: spores must originate between gills, curl around the rim, then rise. Keep as the anti-pattern reference |
| `owned-central-pods.png` | Owned with three pods dominating the centre | Superseded: v6 wants 100% shared primary but not overwhelming; portraits carry the field |
| `final-alt.png` | Final as flat mushroom field with sky spiral (typo'd CTA) | Superseded by the cutaway composition |
