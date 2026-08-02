# 04 — Look-Development Spikes (P2)

**Objective:** the handoff mandates **two separate look-development approvals** before production architecture is locked. These are the project's two highest-risk visual bets; they run as timeboxed spikes with explicit taste-owner gates.

**Owner:** 3D/Shader Dev, judged by Peter. **Exit gates G2a and G2b.**

## Spike A — Extension lens (gate G2a)

*Prove that the implemented hero's material and documentary-optics identity survives the rear-cap orbit. The extension inherits the existing lens rather than redefining it.*

- [ ] LA-1 Boot the hero scene with the donor optics stack (or the hero's own finishing, per AR-1) and a **raw-vs-finished debug toggle available from the first build** (donor binds `g`).
- [ ] LA-2 Rough rear-cap + under-cap source geometry on the existing mushroom (hidden until orbit; hero front view pixel-identical — regression check).
- [ ] LA-3 A crude orbit spline from the exact hero pose around the rear three-quarter (120–180°, slight push-in, no roll). Not tuned — just real enough to judge materials in motion.
- [ ] LA-4 Inspire plume treatment v1: spores originate **between gills**, travel laterally, curl around the rim, rise; multiple velocities and sizes; some drop, some circle, some rise. Hard no: cap-top fountain (see `reference-images/superseded/inspire-cap-top-plumes.png` — that composition is overridden).
- [ ] LA-5 One dense Connect frame (gill colonnade + cross-veins at target density) pushed through the same grade — proves the finishing language holds in the heaviest interior scene.
- [ ] LA-6 The optics stack per spec: selective warm halation on focal sources only; luminance-weighted animated grain (frozen frame under reduced motion); restrained edge aberration + vignette with clean centre and clean text-adjacent regions; LUT-driven grade with warm near-black and highlight roll-off (never clip to white). Authored anamorphic streak on the active Inspire exit only.
- [ ] LA-7 **Record hard budgets** while iterating: strand counts, particle counts, transparency-overdraw ceilings per tier, at the Mission pose, mid-orbit, and the Connect frame. These become the production budget table (below).
- [ ] LA-8 G2a review: approve the three frames (Mission / Inspire rest / dense Connect) *through the same grade*, in motion. Record the accepted real-time look as **the implementation fidelity baseline** — the stills are interpretation targets, not reproduction targets.

## Spike B — Owned portraits (gate G2b)

*The acceptance test is qualitative but clear: people must feel **grown into** the network, not like profile cards floating over it.*

- [ ] LB-1 Portrait node treatment: billboarded planes with circular masks, warm colour grading, emissive fibre rims, and **strand geometry that visibly terminates at each node**.
- [ ] LB-2 Depth: nodes on multiple depth planes; foreground softening out of focus during a camera glide; distant nodes emerging from amber haze; dark substrate pockets intact (never a uniformly lit circuit board).
- [ ] LB-3 Test at **production-equivalent density** (dozens of nodes, per the approved still), in motion, with hover emphasis (ember rim brighten + local strands only) and one open profile card.
- [ ] LB-4 Build the **anonymous fallback node** (consent-pending) in the same language — it ships wherever consent is missing, so it must look intentional, not like a placeholder.
- [ ] LB-5 G2b review against `reference-images/approved/owned.png`: embedded-not-pasted verdict from Peter, recorded with the approved parameter set.

## Deliverables out of P2

| Artifact | Feeds |
|---|---|
| Approved lens parameters + LUT + raw/finished toggle | all chapters, `11`, `12` (Tier 2/3 keep grade identity) |
| Budget table per tier (strands / particles / overdraw / draw calls per chapter) | CONTRACT rewrite, `14` perf tests |
| Approved Mission/Inspire/Connect frames + Owned portrait sample | regression references, Tier-3 still candidates |
| Named motion references (2–3 clips demonstrating slow, assured, documentary camera character — selected with Peter **before** tuning) | `05` grey-box tuning sessions |

## Timeboxes

Spike A: hold reviews at fixed calendar points rather than "when ready" (the handoff's warning about unbounded tuning applies to look-dev too). Suggested: two review sessions per spike, decisions logged, then gate.
