# 02 — Architecture Reconciliation (P1)

**Objective:** resolve the structural conflicts between the two existing codebases and the v6 brief, and write short ADRs (architecture decision records) so production never relitigates them.

**Owner:** Tech Lead. **Exit gate G1** (jointly with `03`): ADRs approved.

## Context

- **D1 is resolved:** the platform is the running hero (`golden-mushroom-page.html` + `mushroom-scene.js`). Confirmed by Hannah 2026-08-02.
- `journey/` (previous-spec build) is a **donor codebase**. Its CONTRACT.md describes cluster offsets, veils, and an Equip chapter that are all invalid under v6, but its *systems* are proven and reusable.
- v6's continuity rule is the forcing function: Mission → Inspire is a camera orbit around the **same organism**, so Mission and Inspire cannot be separate clusters swapped behind a veil. Connect (under-cap), Owned (below soil), and Final (pullback) can still use occlusion thresholds for streaming/LOD handoff — v6 explicitly encourages this.

## Decisions to record

### AR-1 Harvest map from `journey/` (M) — decision D2
For each donor module: reuse / adapt / drop, with a one-line reason.
- [ ] `core/journeyState.js` — likely **adapt**: single canonical progress `p` is exactly what v6 requires; ranges change to five chapters (Equip range deleted).
- [ ] `core/camera.js` — **adapt**: rest-band logic reusable; path itself is new (orbit + descent, not z-flythrough between clusters).
- [ ] `core/optics.js` — likely **reuse**: the documentary-optics stack (selective bloom, grade, grain, aberration, vignette, raw-vs-finished toggle on `g`) matches the v6 optics spec; verify against `04` spike results.
- [ ] `core/interact.js`, `core/content.js` — **adapt**: hover/focus/selection model and content schema fit v6; delete Equip/PYPE/Arnold/Astrid nodes from *active* content (keep in an archived file for the future phase).
- [ ] `lib/helpers.js`, `lib/organism.js` — **reuse** where they don't fight the hero's own scene code.
- [ ] `chapters/{inspire,connect,owned,final}.js` — **adapt**: geometry ideas and budgets carry over; world placement and camera relationships are rebuilt per the new anatomy map.
- [ ] `chapters/equip.js` — **drop from active build**; move to `journey/deferred/` (do not delete — approved conceptual work is retained for a later phase).

### AR-2 World layout under v6 (M) — decision D3
- [ ] Define the single-organism layout: Mission exterior pose (existing hero coordinates are authoritative), rear-cap/under-cap Inspire geometry added to the *same* mushroom, Connect chamber inside/under the same cap, Owned volume below the same soil-line, Final as the wide field around it.
- [ ] Define the three streaming thresholds as scene-management seams: rear-cap reveal (Inspire assets), cap occludes sky (Connect cluster), soil crossing (Owned cluster), rise/cutaway (Final cluster). Veil transitions are **retired**.
- [ ] Confirm the hero's existing scene graph in `mushroom-scene.js` can host attachment points ("hidden rear-cap extension hooks") without visual change — this is the only permitted touch on the hero scene in P1.

### AR-3 Stack choice stays vanilla (S) — decision D4
v6 recommends R3F but explicitly allows raw Three.js. Both existing codebases are vanilla no-build ES modules.
- [ ] Record ADR: stay vanilla/no-build to preserve the hero untouched and reuse donor modules. Revisit only if the team that executes disagrees — the handoff delegates this to the technical lead.

### AR-4 Tier-3 capture pipeline (M) — decision D5
Conflict: v6 requires *"static fallback captures must be part of CI from the prototype stage"*; the donor build's accepted deviation #1 hand-authored them to stay no-build.
- [ ] Decide: add a minimal capture step (headless browser screenshotting the live scene at the five resting poses + detail states) run as a script/CI job — this does not add a *bundler*, keeping the no-build runtime intact. Recommended.
- [ ] Record where captures land and how the static journey consumes them.

### AR-5 Deprecation sweep of the old order (S)
- [ ] Remove Equip from: journey nav DOM, routes, preload graph, scroll ranges, content, Tier-3 stills. (Both `journey/index.html` — 6 hits — and any copied chrome.)
- [ ] The five approved mockups still show EQUIP in their *painted* header nav — add a note to `REFERENCES.md` (done) and never copy nav from mockups.
- [ ] Hero callout "02 EQUIP — coming soon": execute whatever D6 decides (see README §2); until decided, leave untouched.

### AR-6 URL / route scheme (S)
- [ ] Define shareable URLs for five chapters + detail states (`#/inspire/arca`, `#/owned/person-3`, …) on the hero page's origin, replacing the donor's scheme; deep link lands at the resting pose with the detail open, without replaying the journey.

## Acceptance
- One short ADR per decision (AR-1…AR-6) committed under `journey-v6-plan/adr/`, each with status *approved* and the approver named.
- A branch/scaffold exists where the hero page boots with the journey systems present but visually and behaviourally identical to baseline (regression check passes).

## Status — W1-B delivered 2026-08-02 (Tech Lead)

| Item | State |
|---|---|
| AR-1 / D2 | **Done** — `adr/adr-d2-harvest-map.md`; `journey/chapters/equip.js` → `journey/deferred/equip.js` |
| AR-2 / D3 | **Done** — `adr/adr-d3-world-layout.md`. The hero needed **no** modification: `createScene()` already returns `groups`/`consts`/`addAnimator`, so extension hooks are child groups |
| AR-3 / D4 | **Done** — `adr/adr-d4-stack.md` (vanilla, no build) |
| AR-4 / D5 | **Done** — `adr/adr-d5-tier3-captures.md` (headless Chrome + Pillow; `?capture=` freeze is a prerequisite of the diff gate) |
| AR-5 | **Partial** — Equip is absent from every `journey-v6/` surface by construction (no nav, route, range, or preload). The donor `journey/index.html`'s six Equip hits are deliberately **not** swept: the donor is frozen as a reference build, not a shipping surface |
| AR-6 | **Done** — `adr/adr-d6-routes.md` |
| Scaffold | **Done** — `glowshroom/journey-v6/` (`index.html`, `journey.js`, `constants.js`, `core/journeyState.js`, `lib/helpers.js`); console-clean, verified at parity with the hero |
