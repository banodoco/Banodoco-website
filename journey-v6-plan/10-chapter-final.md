# 10 — Epilogue: Final Pullback (P4/P5)

**Objective:** a long exhale from an oblique above/below-ground cutaway: fairy ring on the surface, living colony beneath, broad broken spore cloud above. **Not a sixth peer chapter** — no nav item, no deep detail state; Owned remains the active nav state while the journey resolves.

**Owner:** 3D Dev + Motion. **Reference:** `reference-images/approved/final.png`.

> **Direction change (Hannah, 2026-08-02, decision D12):** the hero mushroom is PART of the final scene — the ring composes around/including it, and the pullback reveals the others by "undarkening" (they were always there, unlit). Emphasis equalizes as they come up; the hero must never read as the parent/source, and no spore flow runs hero→others.

> **Hard constraint (from ADR D3, W1-B):** the hero scene ships `Fog(bg, 7, 20)` — everything past ~20 world units renders flat black. The rise/cutaway seam MUST re-parameterise fog (far plane + density) before the recession begins, and restore it on reverse scroll, or the entire pullback composition is invisible.

## Copy (locked)

- Heading: **"We're working to accelerate the second renaissance."**
- Support: *"Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many."*
- Copy position: **upper-left / centre-left** over the diagonal ground plane.

## Tasks

### FN-1 Cutaway composition (L)
- [ ] FN-1.1 Terrain cutaway with the soil-line crossing the frame on a slight diagonal; surface fairy ring, forest horizon, underground colony, and upper spore field share the frame with no dead space.
- [ ] FN-1.2 Irregular fairy ring of instanced mushrooms (controlled variation + aggressive distance LOD); foreground/midground/background depth; several mature fruiting bodies share emphasis — **no parent mushroom**, and no tree-root reading: fruiting bodies emerge from the pre-existing wider colony.
- [ ] FN-1.3 Forest mist, shallow depth-of-field shifts, foreground soil parallax — supporting the lens, never competing with the closing statement.

### FN-2 Motion (M)
- [ ] FN-2.1 Continuous recession + tilt; the camera never settles into another detailed product view.
- [ ] FN-2.2 Sequential ring activation: a slow pulse travels the underground growth front; fruiting bodies brighten in sequence, never simultaneously.
- [ ] FN-2.3 Spores rise from multiple under-caps and merge into one broad, broken cloud: one dominant drift direction, many particles peeling away; turbulence separates eddies, clusters, isolated points.
- [ ] FN-2.4 Optional long-hold micro-moment: a few tiny primordia become visible — subtle and time-compressed, no theatrical sprouting.
- [ ] FN-2.5 Below ground: fine hyphae brighten locally as the camera passes; thicker cords carry slower outward waves.

### FN-3 CTA (S)
- [ ] FN-3.1 Closing CTA hover/focus → a single pulse around part of the fairy ring, briefly revealing the surface-bodies ↔ colony relationship.
- [ ] FN-3.2 A conventional footer follows: plain-text links, social, contact, legal, crawlable index (built in `11`).

## Acceptance
- The cutaway communicates fairy ring + growth front + spore cloud simultaneously, without dead compositional space and without reading as a clean diagram.
- Ring activation is sequential; no single mushroom reads as the parent.
- The epilogue never appears in nav; Owned stays active.
- Reverse scroll returns cleanly into Owned.
