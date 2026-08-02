# ADR AR-3 / D4 — Stay vanilla, no build step

- **Status:** approved (Tech Lead, 2026-08-02).
- **Decision:** the journey extension ships as **vanilla ES modules with no bundler, no transpiler, and no framework**, served statically from `glowshroom/`. Three.js stays vendored at `glowshroom/vendor/three/` and is resolved by an in-page import map. React Three Fiber and drei are **not** adopted.

## Rationale

1. **The handoff allows it.** v6 recommends R3F "because scene state, DOM state, drawers, routing, focus, and accessibility must remain coordinated", but states plainly that "raw Three.js is still acceptable if the team prefers it" and calls the direction "not a rigid mandate". The technical lead owns this call.
2. **D1 makes the hero the platform, and the hero is vanilla.** `mushroom-scene.js` is 2 095 lines of hand-written Three.js with its own composer (RenderPass → UnrealBloom → temporal-accumulate TAA → OutputPass), an OrbitControls rig, a physical tap/breeze model, and five authored responsive camera modes. Porting that into R3F would mean *rebuilding the approved hero* — the single thing v6 forbids ("do not rebuild its composition or replace its systems").
3. **The donor is vanilla too.** Every module classified reuse/adapt in `adr-d2-harvest-map.md` is a plain ES module. Adopting R3F would discard the harvest and re-open settled work.
4. **The coordination argument R3F answers is answered elsewhere.** v6's real requirement is *one canonical journey state* driving camera, DOM, routes and detail states. That is satisfied by `journey-v6/core/journeyState.js` + `constants.js` as the single source of truth (risk #6 in the master plan), not by a renderer binding.
5. **Zero-install debuggability.** Any reviewer can open `http://localhost:8137/journey-v6/index.html` and read the exact shipping source in devtools. That has been load-bearing for every review round so far.

## Costs accepted

- No JSX/component ergonomics; chapter modules keep the donor's explicit `createChapter(ctx) → { group, hotspots, update, setHover, setSelected, setQuality, dispose }` contract, which has already proven adequate at six-chapter scale.
- No tree-shaking or minification. Mitigation: the vendored three build is already the only large dependency, chapters lazy-load per threshold, and bundle weight is a tracked regression budget (`01-baseline-freeze.md`).
- No TypeScript. Mitigation: JSDoc on public module surfaces; the contract file is the type system.

## Boundaries

- Any new runtime dependency requires a new ADR. Nothing may be loaded from a CDN.
- **Build-time tooling is not banned** — only a build step *between the source and the runtime*. Node scripts that produce artefacts (the Tier-3 capture pipeline in `adr-d5-tier3-captures.md`, screenshot regression diffs) are explicitly allowed, because the served bytes remain the authored bytes.
- Revisit trigger: if the executing team disagrees at G1, or if a chapter proves unimplementable without a compiler.
