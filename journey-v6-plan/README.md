# Mushroom Journey v6 — Delivery Plan (Master)

**Source of truth:** `source/handoff-v6-extracted.md` (extracted from *Banodoco Mushroom Journey Developer Handoff v6*). Where this plan and the handoff disagree, the handoff wins. Where mockups and the handoff disagree, **the written handoff wins** (see `REFERENCES.md` for the specific overrides).

**What we are building:** an additive extension of the already-approved Mission hero into one continuous journey around and through the same mushroom: **Mission → Inspire → Connect → Owned → Final (epilogue)**. Equip / PYPE / Arnold / Astrid are **deferred** — no routes, nav items, preloads, or scroll space.

---

## 1. The strategy in one paragraph

Prove the difficult parts first, behind explicit approval gates, while the approved hero is frozen and protected by a regression gate. The two highest-risk unknowns get dedicated look-development spikes (the documentary lens surviving the rear-cap orbit; portraits that feel *grown into* the mycelium). Continuity is the product promise, so the grey-box prototype — not production — is where we settle scroll feel, thresholds, and reversibility. Everything else is parallelizable chapter and systems work against a shared anatomy map and a shared acceptance checklist.

## 2. Current state and the one decision that gates everything

Two implementations exist in `glowshroom/`:

| Asset | What it is | Status vs v6 |
|---|---|---|
| `golden-mushroom-page.html` + `mushroom-scene.js` | The approved standalone Mission hero (growth intro, cursor wind, tap pulse), running at `http://localhost:8137/golden-mushroom-page.html` | **The accepted baseline** — confirmed by Hannah (2026-08-02). Header carries no chapter nav; the mushroom carries three projected callouts: **01 INSPIRE** (in the spore plume), **02 EQUIP — "coming soon"** (on the stipe, riding its sway), **03 CONNECT** (under the cap) |
| `journey/` (core/, chapters/, lib/, CONTRACT.md) | Full six-chapter build against the **previous** spec: order Mission → *Equip* → Connect → Inspire → Owned → Final, chapters as separated world clusters swapped behind "veil" occlusions | **Out of date in three structural ways:** Equip is an active chapter; the order is wrong; Mission → Inspire must now be a *continuous orbit of the same organism*, which the cluster-swap-behind-veil approach cannot deliver |

**Decision D1 — RESOLVED (Hannah, 2026-08-02):** the platform is the running hero page (`golden-mushroom-page.html` + `mushroom-scene.js`). The `journey/` build is a **systems donor**, not the platform: harvest its proven parts (journey state, optics stack, tier logic, content model, interaction core) and rebuild the world layout so Mission + Inspire + Connect + Owned share one co-located organism, using the cap-entry and soil-line occlusions (not veils) as the streaming thresholds. Remaining sub-decisions (what to harvest, how) in `02-architecture-reconciliation.md`.

**Decision D6 (needs Peter):** the hero's on-mushroom **"02 EQUIP — coming soon" callout**. v6 defers Equip from every active surface, but the callout is part of the approved hero DOM. Options: (a) remove it and renumber the remaining callouts, (b) re-point the three callouts at the journey chapters (Inspire / Connect / Owned) as deep-link entry points, (c) keep it as a passive "coming soon" tease. Recommendation: (b) — it converts an existing approved affordance into journey navigation without inventing new chrome. Small change either way, but it touches the approved hero, so it needs the taste owner's call at G1.

## 3. Operating model

- **Taste owner:** Peter — final motion/look calls, gate sign-offs. One named owner, per the handoff.
- **Producer:** Hannah — schedule, gate scheduling, decision log, consent pipeline, content owners.
- **Roles (can be fewer people wearing several hats):** Tech Lead (architecture, budgets, regression gate), 3D/Shader Dev (chapters, particles, optics), Interaction/Frontend Dev (DOM, routing, a11y, tiers), Motion Designer (splines, easing, scroll feel), Content/Ops (profiles, consent, copy).
- **Cadence:** timeboxed motion/look review sessions at each gate (the handoff explicitly warns motion tuning "can become unbounded without a named taste owner and timeboxed review sessions"). Decisions get logged in `DECISIONS.md` (create at kickoff).
- **Definition of done:** the acceptance checklist in `14-qa-acceptance.md` (verbatim from the handoff, mapped to test procedures) plus the hero regression gate.

## 4. Phases and gates

| Phase | Contents | Gate to exit |
|---|---|---|
| **P0 — Freeze & audit** (`01-baseline-freeze.md`) | Capture hero baseline: screenshots, bundle weight, frame time, TTI, interaction inventory. Set regression budgets. **Start the consent pipeline now** (long-lead). | **G0:** baseline doc + budgets agreed |
| **P1 — Architecture & map** (`02`, `03`) | Decide D1–D5. Produce the two-page anatomy/camera map. | **G1:** ADRs + map signed off (Peter + tech lead) |
| **P2 — Look-dev spikes** (`04`) | Spike A: extension lens (Mission material identity through the rear orbit + Inspire plumes + one dense Connect frame). Spike B: Owned portrait treatment. Record hard per-tier budgets. | **G2a / G2b:** taste-owner approval of both spikes |
| **P3 — Grey-box prototype** (`05`) | Mission→Inspire orbit first, then grey-box through Owned. Resolve scroll model, snap, text pinning, reversibility, thresholds. | **G3:** continuity + scroll decisions accepted in both scroll directions |
| **P4 — Production** (`06`–`11`) | Chapter builds at approved fidelity + product systems (nav, routing, deep links, drawers, motion layers). Parallel lanes. | **G4:** chapter acceptance criteria pass on desktop Tier 1 |
| **P5 — Platforms** (`12`) | Portrait poses, touch model, bottom sheets, reduced motion, Tier 2/3, capture pipeline, loading/streaming. | **G5:** device-matrix pass; Tier 2/3 identity review |
| **P6 — Hardening & content** (`13`, `14`) | Full acceptance sweep, perf regression re-check, real contributor content behind consent, named content owners. | **Launch readiness review** |

Suggested parallel lanes inside P4: **Lane A** camera/motion (Motion + 3D), **Lane B** chapter geometry/particles (3D), **Lane C** DOM/product/a11y (Frontend), **Lane D** content/consent (Ops). Lanes A–C sync at weekly integration checkpoints on the shared journey state.

## 5. Dependency spine (critical path)

```
G0 baseline ─► D1 architecture ─► anatomy map ─► Spike A (lens/orbit) ─► grey-box ─► Inspire production ─► Connect ─► Owned ─► Final ─► hardening
                                        │
                                        ├─► Spike B (portraits) ─► Owned production (field + interactions)
                                        └─► consent pipeline (P0 start) ─► real contributor content (P6)
```

Inspire is deliberately first in production: it is "the first proof that the current hero can grow into a journey without a reset" and gets the largest particle/orbit budget. Owned gets the largest art-direction budget. Transitions get the largest motion-design budget.

## 6. Top risks (owner → mitigation)

1. **Hero regression** (Tech Lead) — regression gate at every merge: screenshot diff at the Mission pose, bundle delta, frame-time delta. The hero "may not silently regress merely because later chapters exist."
2. **Expectation gap vs stills** (Peter + 3D) — the real-time build *interprets* the stills through the approved lens; lock this understanding at G2a, keep the raw-vs-finished toggle available from the first look-dev build.
3. **Portraits look pasted-on** (3D + Peter) — Spike B is a hard gate before Owned production; acceptance is the "embedded-not-pasted test at realistic density and in motion."
4. **Unbounded motion tuning** (Hannah) — timeboxed sessions, decisions logged, one taste owner.
5. **Overdraw/transparency cost** (Tech Lead) — hard budgets set during look-dev, not discovered in production profiling; fidelity hierarchy says reduce ambient density first.
6. **DOM/canvas state drift** (Frontend) — one canonical journey state drives camera, nav, routes, copy, and detail states. No second source of truth.
7. **Consent arrives late** (Hannah) — pipeline starts P0; anonymous ember-nodes are the defined fallback so launch never blocks on consent.
8. **Tier 3 drift** (Frontend) — captures generated from the live scene and wired into CI from the prototype stage (decision D5 resolves the current no-build conflict).
9. **Old six-chapter build bleeding through** (Tech Lead) — explicit deprecation task list in `02`: remove Equip nav/routes/preload/scroll range everywhere; superseded mockups quarantined in `reference-images/superseded/`.

## 7. Document index

| Doc | Scope |
|---|---|
| `01-baseline-freeze.md` | P0 audit, metrics, regression budgets |
| `02-architecture-reconciliation.md` | Decisions D1–D5, deprecation of the old build |
| `03-anatomy-camera-map.md` | The two-page key design artifact |
| `04-lookdev-spikes.md` | Spike A (lens/orbit/plumes), Spike B (portraits), budget tables |
| `05-greybox-prototype.md` | Scroll model, thresholds, reversibility, motion references |
| `06-mission-preservation.md` | Guardrails + the only allowed changes |
| `07-chapter-inspire.md` | Rear-cap orbit, three spore exits, spotlights |
| `08-chapter-connect.md` | Gill commons, three network behaviours |
| `09-chapter-owned.md` | Descent, ownership claims, portrait field |
| `10-chapter-final.md` | Epilogue cutaway, fairy ring, spore cloud |
| `11-product-systems.md` | Nav, routing, state, motion layers, footer |
| `12-platforms.md` | Mobile, a11y, reduced motion, tiers, loading |
| `13-content-ops.md` | Consent, contributor model, copy table, owners |
| `14-qa-acceptance.md` | Full acceptance checklist mapped to tests |
| `REFERENCES.md` | Image catalogue: what to take, what each image overrides |
