# Mushroom Journey — Architecture Contract (v1)

This file is the single source of truth for module boundaries. Every module MUST
conform exactly. The product spec is the handoff document (extracted at
`/private/tmp/claude-501/-Users-hannahomalley-nigel-ados-paris/2711fc86-eb4f-4d1f-9f0f-ceb3b4a66ed5/scratchpad/handoff.md`)
— read the sections relevant to your module before writing code.

## Runtime

- Vanilla ES modules, no build step. Served from `glowshroom/` by a static server.
- Three.js r-modern is vendored. Import map (already in `journey/index.html`):
  - `three` → `../vendor/three/three.module.js`
  - `three/addons/` → `../vendor/three/addons/` (has EffectComposer, RenderPass,
    ShaderPass, UnrealBloomPass, OutputPass, CopyShader, LuminosityHighPassShader)
- Chapter modules may import ONLY: `three`, and files under `journey/lib/`.
  Everything else arrives via `ctx`.
- No network fetches. No external CDNs. No textures from disk — generate all
  textures procedurally (canvas or DataTexture) or use `ctx.helpers` sprites.
- Deterministic randomness only: use `ctx.helpers.rng(seed)` — never `Math.random()`
  directly in geometry generation (interactions may use it).

## Palette (fixed)

```js
palette = {
  gold: 0xd9a441, goldBright: 0xf0c877, ember: 0xffb36b, deepGold: 0x8a6420,
  parchment: 0xf2ebdd, muted: 0xc9bfa8, coolAccent: 0x7fa8c9,
  bgWarmBlack: 0x0a0805, soil: 0x1a120a,
}
```
Amber-led. Cool accent is rare and restrained. Never pure white cores except tiny
hot centers; prefer `goldBright`.

## World layout — chapter clusters

One logical world; each chapter is a cluster whose group is placed by core code at
a world offset. **Chapter modules build everything in LOCAL coordinates around
origin (0,0,0)** and never set `group.position` themselves.

| Cluster | World offset (set by core) | Local scene envelope |
|---|---|---|
| mission | (0,0,0) | Whole organism. Ground plane y=0 extends r≈40. Stipe base at origin, stipe top y≈5, cap centered ≈(0.2, 5.6, 0), cap radius ≈3.4, slight tilt/asymmetry. Diffuse mycelial field ON/UNDER the ground surface out to r≈30 (faint, patchy). NOT tree roots. |
| equip | (0,0,220) | Interior of stipe at extreme magnification. Vertical fibre field: radius ≈14, y from −12 to +24. Camera ascends from y≈−6 to y≈14 near axis. PYPE = braided fascicle of ~7–12 intertwined strands hugging the axis (r≈0.8 bundle). Arnold knot ≈(−3.4, 4.5, 1.5), Astrid knot ≈(3.2, 7.5, −1.0), fed by real branch fibres off PYPE. |
| connect | (0,0,440) | Under-cap chamber. Radial gills: ~28 primary blades radiating from center axis, inner radius 2, outer radius 18, height ≈5 (y 0..5), plus shorter secondary gills between, plus fine cross-veins bridging neighbours. Camera orbits inside at y≈2, r≈8–11. Community region centered azimuth ≈ 0.0rad, ADOS knot ≈ azimuth 2.1rad at r≈9, Hivemind route = braided path spanning azimuths 3.6→5.2 at r≈7–10. |
| inspire | (0,0,660) | Exterior crown. Cap: dome radius ≈10, cap top at y≈8, rim ring at y≈4.5 r≈10. Gills visible under rim. Camera sits low outside rim (y≈3–7, r≈13–17) looking across the crown. Three plume regions rising from rim sectors at azimuths ≈ 5.6 (arca), 0.6 (artcompute), 2.6 (tworp) — spores ORIGINATE under-cap between gills, migrate to rim, curl up. |
| owned | (0,0,880) | Underground mycelial mat. Volume ≈ x∈[−22,22], y∈[−7,7], z∈[−16,16]. Camera glides from (−14,0,6) to (12,1,−4) roughly along +x. Dark soil pockets, thick rhizomorph cords (3–5), thousands of fine hyphae. Pod `pod-shared` ≈(0, 3.5, 0) primary; `pod-monthly` ≈(−6, −1.5, 3); `pod-split` ≈(6, −2, −3). ~14 contributor nodes scattered at depths (positions from ctx.content.contributors[i].pos if present, else distribute deterministically). |
| final | (0,0,1100) | Oblique cutaway. Terrain surface = slightly diagonal plane (normal tilted ~12° around z), soil-line visible as a cut face. Fairy ring of ~9–13 instanced mushrooms, irregular ring r≈14–20 centered (0,0,0). Underground colony visible beneath cut (y<0 down to −8). Spore cloud above y 6–24. Forest-mist horizon backdrop (billboards/fog). Camera recedes from (8,5,20) to (26,17,52). |

Clusters swap behind full-screen organic "veil" occlusion moments at every chapter
boundary (core handles the veil; your cluster just needs to look correct from the
camera path).

## Global journey progress `p ∈ [0,1]` — chapter ranges

```
mission  0.000–0.135
equip    0.135–0.320
connect  0.320–0.500
inspire  0.500–0.665
owned    0.665–0.850
final    0.850–1.000
```
Boundary veils peak exactly at the range edges (width ±0.018). Chapter-local
progress `cp = (p − start)/(end − start)`; copy/labels show in the rest band
`cp ∈ [0.20, 0.80]` (canonical constants `REST_LO`/`REST_HI` in core/camera.js).

## Chapter module interface (files `journey/chapters/<id>.js`)

```js
export function createChapter(ctx) {
  // build synchronously; heavy generation OK (runs once, possibly lazily)
  return {
    id: '<id>',
    group,                      // THREE.Group, local coords
    hotspots: [                 // interactive nodes (may be empty)
      { id: 'astrid', object: <Object3D used as anchor+raycast proxy>, radius: 1.2,
        labelOffset: {x:0,y:1.2,z:0} }   // radius = world units for hit sphere
    ],
    update(dt, time, cp, active) {},  // dt sec, time sec, cp chapter-local 0..1,
                                      // active = this chapter is current
    setHover(idOrNull) {},
    setSelected(idOrNull) {},
    trigger(name) {},           // optional named one-shot pulses, e.g. 'ctaPulse'
    setQuality(tier) {},        // 1 = full, 2 = reduced (≈45–60% density)
    dispose() {},
  };
}
```

`ctx` = `{ THREE, helpers, palette, tier, reducedMotion, content }`.
- `ctx.content` is the full CONTENT object from `journey/core/content.js`.
- Raycast proxies: give each hotspot an invisible `THREE.Mesh` (SphereGeometry,
  `visible=false` is NOT raycastable — instead use `material.transparent=true,
  opacity=0, depthWrite=false` on a small sphere) OR set `object` to a visible
  node mesh. Core raycasts `hotspot.object` recursively.

### Performance budgets (Tier 1 desktop / Tier 2 mobile)

- mission: ≤ 45k / 20k line-vertices + ≤ 3k / 1.2k particles
- equip:   ≤ 70k / 28k instanced strand vertices, ≤ 40 / 16 transparent draw calls
- connect: ≤ 60k / 25k, gills instanced
- inspire: ≤ 10k / 4k particles total across plumes + cap geometry
- owned:   ≤ 60k / 25k hyphae vertices, ≤ 20 / 12 portrait planes
- final:   ≤ 50k / 20k + instanced mushrooms (≤ 13, 3 LOD-ish variants) + ≤ 6k / 2.5k spores
- Additive blending everywhere for glow; `depthWrite:false` on all transparent
  materials; fog-friendly (scene fog is set by core: `THREE.FogExp2(0x0a0805, d)`).
- All ambient motion: randomized phase, low amplitude, NO global synchronized
  breathing. Every motion answers: transport, connection, or environmental force.

## helpers (journey/lib/helpers.js) — provided, do not rewrite

```js
helpers.rng(seed) → () => float [0,1)          // mulberry32
helpers.noise3(x,y,z) → float [-1,1]           // value noise, smooth
helpers.fbm3(x,y,z,oct=4) → float [-1,1]
helpers.glowSprite(color=0xf0c877, size=64) → THREE.Texture   // radial glow
helpers.softDisc(size=64) → THREE.Texture       // for round particles
helpers.tubeFrom(points, {radius, radialSegments, taper}) → THREE.BufferGeometry
helpers.ribbon(points, width) → THREE.BufferGeometry (camera-facing handled by material.side)
helpers.catmull(points) → THREE.CatmullRomCurve3
helpers.strandLines({count, seed, pointsPer, generator}) → THREE.LineSegments-ready
   // generator(i, rand) must return array of THREE.Vector3
helpers.makePulseMat(baseColor, opts) → THREE.ShaderMaterial for lines with
   uniforms { uTime, uPulse (0..1 progress of a travelling pulse), uPulseOn }
   — attribute `aAlong` (0..1 along strand) must be provided by geometry;
   strandLines does this automatically.
helpers.easings: { inOut, out, in, smooth }
```
If you need something beyond this, build it locally inside your chapter file.

## Content model (journey/core/content.js)

```js
export const CONTENT = {
  chapters: { mission: { nav:'Mission', heading, sub }, ... final: {...} },
  nodes: {
    pype:   { label:'PYPE', short:'…one-liner…', drawer:{ title, body[], links[{label,href}], workflows[]? } },
    arnold: {...}, astrid: {...},
    community: { label, short, card:{ title, body[] } }, ados: {...}, hivemind: {...},
    arca: { label:'Arca Gidan Prize', short, spotlight:{ title, body[], link } },
    artcompute: {...}, tworp: {...},
    'pod-shared':  { label:'100% shared', short, card:{...} },
    'pod-monthly': { label:'Granted 1% per month', ... },
    'pod-split':   { label:'Split between groups', ... },
  },
  contributors: [ { id:'person-0', name, role, blurb, consent:false, seed:7 }, ... ],
  footer: { links:[{label,href}], social:[...], legal:'…' },
}
```
Node ids are FIXED as listed (use `tworp` not `2rp` in ids). Hrefs: use real ones
(github.com/banodoco, discord.gg/banodoco, banodoco.ai) where guessable, else '#'.
Contributors: 14 entries, `consent:false`, anonymous display names ("Contributor",
archetype roles) — real names/photos require consent per the handoff.

## Interaction / camera focus (core-owned; chapters only react)

- Hover → `setHover(id)`; focus (keyboard) is IDENTICAL to hover.
- Click/Enter → core opens drawer/card DOM, calls `setSelected(id)`, and for
  drawer-class nodes (pype/arnold/astrid) lerps camera toward the node with the
  world kept visible. Escape / outside-click / scroll-intent closes.
- Deep links: `#/equip/astrid` etc. Core handles routing; chapters need nothing.

## Optics module (journey/core/optics.js)

```js
export function createOptics(THREE, renderer, scene, camera, opts)
// opts = { tier, width, height, palette }
→ {
  render(dt, time),      // renders the composed frame (replaces renderer.render)
  setSize(w, h),
  setRaw(bool),          // raw-vs-finished A/B toggle (key 'g' handled by core)
  setTier(tier),         // 1 | 2 — tier 2 drops aberration/streaks, keeps grade+grain+fog identity
  setFocusHint(worldPos|null),  // optional: where halation/streak may concentrate
}
```
Stack (tier 1): selective warm bloom (UnrealBloomPass, threshold high so only hot
cores bloom) → grade pass (single ShaderPass): warm LUT-ish grade with lifted
near-black `#0a0805`, highlight roll-off toward ember (never clip to white),
luminance-weighted animated fine grain (strong in shadows, suppressed in
highlights; FROZEN static frame when `opts.reducedMotion`), tiny edge-weighted RGB
aberration, soft vignette, faint warm halation tint around brights. Keep center +
text-adjacent regions clean (vignette/aberration edge-weighted). No CRT, no dither
patterns, no watercolour.

## Copy positions per chapter (already in index.html/CSS)

mission left · equip right · connect left · inspire bottom · owned top-centre ·
final upper-left. DOM copy is core-owned; chapters never create DOM.

## Absolute rules

1. The visitor must perceive ONE continuous organism — obey your cluster envelope
   and the camera path notes so entry/exit framings line up with the veils.
2. No perfectly symmetric, uniformly bright, or rhythmically breathing structures.
3. Additive warm glow on near-black; documentary, slow, causal motion.
4. Zero console errors; module must import cleanly in a browser with no DOM access
   at import time (build only inside createChapter).
5. Stay in budget; implement `setQuality(2)` honestly.


## Accepted deviations (audited 2026-08-01)

Deliberate, documented departures from the handoff spec — not oversights:

1. **Tier 3 stills are hand-authored CSS compositions**, not build-time captures
   of the live scene. This project is deliberately no-build (vanilla ES modules);
   a capture pipeline would introduce the project's first build step. Revisit if
   a build step ever lands. (Spec: "Generate Tier 3 captures automatically.")
2. **Loader progress is an eased minimum-duration animation** gated on the hero
   cluster only, not blended with real per-asset progress — all six clusters are
   procedural (no network assets), so "real load progress" has no meaningful
   signal beyond module import latency.
3. **Reduced-motion grain**: prefers-reduced-motion routes to the complete
   Tier 3 static journey (per spec §accessibility), so the WebGL frozen-grain
   path in optics.js is only exercised if Tier 3 is ever bypassed. The CSS
   stills carry no grain.
4. **Keyboard order**: node buttons live in a single #node-layer after the
   chapter copy rather than inside each section; off-chapter buttons are
   `hidden` (unfocusable), so effective tab order still follows the narrative.
5. **Tier heuristics** are pointer-coarseness + viewport size + a runtime
   watchdog; no GPU-string probing. The watchdog covers the weak-desktop case
   within a few seconds.
6. **The final cluster's fairy-ring mushrooms are merged-geometry line batches**
   (4 draw calls each), not THREE.InstancedMesh — "instanced" in the contract is
   satisfied in spirit (one shared builder, seeded variation) and the vertex
   budget holds with a wide margin.
