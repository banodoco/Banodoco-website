# BUDGETS — Spike A measured numbers (task W2-A, LA-7)

**Measured:** 2026-08-02, on the BASELINE.md reference machine (MacBook Air M3, DPR 2,
Chromium 148 in-app pane), viewport 1600 × 1000 CSS px, Tier 1, grade pass ON.
**Page:** `http://localhost:8137/journey-v6/spike-a/` (`window.__spikeBudget()`, key `b`).
**Method:** identical to BASELINE §4 — `renderer.info` accumulated per displayed frame
(`autoReset` off, manual reset in a pre-render animator, read in a post-render probe rAF);
CPU/frame = `performance.now()` at the probe minus the frame's rAF timestamp.

**Harness caveat (same as BASELINE §2):** the pane is a hidden tab; frames run only in
capture bursts, so CPU medians are contaminated by screenshot readback. The
uncontaminated signal is the rAF cadence, which stayed vsync-locked in every state.
`renderer.getPixelRatio()` stayed **2** throughout — the hero's perf governor never engaged.

## Measured, per state (Tier 1)

| State | Draw calls | Lines | Points | Triangles | CPU med (ms)* | Cadence med | Extension particles live |
|---|---:|---:|---:|---:|---:|---:|---|
| Hero pose, raw ([1]+[g]) — extensions retired | **41** | **44,377** | **24,090** | **12,828** | ~1–2 (baseline) | 16.7 ms | 0 |
| Hero pose, graded — extensions retired | 42 | 44,377 | 24,090 | 12,829 | 2.3–2.8* | 16.8 ms | 0 |
| Mid-orbit (s = 0.5, az ≈ 74°, T1 armed) | 56 | 45,766 | 29,273 | 12,831 | 1.9* | 16.7 ms | 5,100 plume + 4,200 hero spores |
| Inspire rest (rear ¾, all three exits) | 56 | 45,766 | 29,273 | 12,831 | 1.8* | 16.7 ms | 5,100 + 4,200 |
| Connect frame (colonnade density test) | 53 | 48,529 | 24,419 | 12,843 | 5.2* | 17.5 ms | 0 (plumes disarmed) |

\* contaminated medians — treat cadence, not CPU, as the frame-health signal in this harness.
The 41/44,377/24,090/12,828 raw row is an **exact match of the frozen BASELINE §4.3** — the
regression identity holds; grade ON adds exactly 1 draw call + 1 triangle (the fullscreen grade quad).

## Extension composition (what the deltas are made of)

| Piece | Amount | Notes |
|---|---:|---|
| Plume spores (GPU phase shader, zero per-frame CPU) | 5,100 pts (1,700/exit, round-robin interleaved) | born between gills → lateral → rim curl → braided rise; 15% drop cohort |
| Under-rim source filaments | 774 line segs (3 sectors) | brightened between-gill strokes, travelling flow |
| Airflow wisps | 360 segs | 4/exit, opacity 0.15 |
| Cap-surface flow strips | 255 segs | faint travelling glow toward each exit |
| Source ember beads | 83 pts | |
| Anamorphic streaks | 3 sprites, ≤1 visible | active exit only, opacity ≤ 0.42 |
| Connect colonnade (28 primaries + lamellulae + tertiaries + veins) | 4,152 segs + 329 beads + 7 haze sprites | free-edge-lit, faces dark (donor light-budget rule) |
| GradePass | 1 fullscreen pass | between TAA and OutputPass; no second composer, no double bloom |

Draw-call deltas vs baseline 41: +1 grade, +14 plume objects (armed), +11 connect objects (armed).
Both extension groups fully retire (`visible = false`) outside their states — the Mission pose
carries only the +1 grade pass.

## Transparency / overdraw ceilings observed

- Plume spores are additive point sprites at 0.026–0.14 world size with the hero's min-size
  shrink trick (no sub-pixel sparkle). Worst local overdraw is the rim-curl band at the
  active exit (~3–4× over ~2% of the frame at the Inspire rest). No full-screen
  transparency layers were added; the grade pass is opaque.
- Connect frame: from inside the chamber a view ray crosses 10–20 blades; faces are
  intentionally dark and only free edges carry light (donor lesson), so accumulated
  additive line coverage stays below the hero's own gill-fan worst case at the Mission pose.

## Proposed Tier-2 reductions (not yet exercised on throttled hardware)

| Piece | Tier 1 | Tier 2 proposal | Mechanism (already wired where noted) |
|---|---:|---:|---|
| Plume spores | 5,100 | 2,550 | `?tier=2` / `plumes.setTier(2)` — drawRange prefix, round-robin keeps the three plumes balanced (wired) |
| Wisps + cap flow | 615 segs | 0 | drop both objects; sources + spores carry the read |
| Source filaments | 774 segs | ~50% | build-time count halving |
| Streaks | 1 active sprite | 0 | handoff: streaks are Tier-1 only |
| Grade pass | full | keep LUT/lift/roll-off + grain; drop halation + aberration | uniform flags (`uHalation`, `uAberration`), donor tier model |
| Connect colonnade | 4,152 segs | ~2,400 | halve lamellulae/tertiaries + veins to 60 |
| Hero point clouds at Connect | dimmed ×0.22 | same | production: T2 threshold re-parameterisation per adr-d3 §4 |

## Gaps

- GPU frame time still unmeasurable in this harness (BASELINE §9.2 applies unchanged).
- Tier-2 numbers above are proposals; no CPU-throttled run was possible (BASELINE §9.4).
- CPU medians need one visible-tab session to confirm the clean-frame floor at the
  Inspire rest and Connect frame; cadence and governor behaviour suggest ample headroom.

---

# Spike B — Owned portrait field (task W2-B, LB-1…LB-4)

**Measured:** 2026-08-02, Apple-silicon Mac, in-app pane ~800×720 CSS px @ DPR 2,
fronted tab (vsync live), Tier-1 stack.
**Page:** `http://localhost:8137/journey-v6/spike-b/` (HUD always on; `window.__spikeB`).
**Stack:** RenderPass → UnrealBloom 0.5/0.4/0.5 → GradePass (donor shader; `g` raw toggle).
**Note on colour pipeline:** this spike's composer deliberately has **no OutputPass** —
the whole scene is raw ShaderMaterials whose donor-calibrated opacities assume the
un-encoded display-space additive sum (encoding the linear sum lifted the entire field
to an olive wash). The grade therefore operates on the same image the raw path shows,
which is the donor note "the grade operates in display space" taken literally. This
must be reconciled with the hero composer (which has an OutputPass before its grade)
when Spike A and Spike B stacks merge — flagging as an integration decision for AR-1.

## Geometry / vertex counts (Tier 1)

| Element | Count | Vertices | Draw calls |
|---|---:|---:|---:|
| Fine hyphae — 3 depth batches (3,800 far / 4,400 mid / 1,700 near) | 9,900 strands | 65,724 line verts | 3 |
| Rhizomorph cords (5 tapered tubes 64×6) + 7 filament polylines each | 5 cords | 4,095 verts | 10 |
| Node-local strands (terminate exactly at nodes; incl. node↔node links + cord attachments) | 87 curves | 1,392 line verts | 1 |
| 3D rim fibres (12/node × 3 segs) | 192 fibres | 1,152 line verts | 1 |
| Portrait planes (in-shader billboards, one indexed mesh, 16 nodes) | 16 planes | 64 verts | 1 |
| Node cores + halos (2 Points layers) | 2×16 pts | 32 | 2 |
| Soil aggregates (2 layers) | 125 pts | 125 | 2 |
| Amber haze backdrop sprites | 8 | — | 8 |
| **Scene total (typical frame)** | | **~72.6k** | **35–38** |

Textures: portrait atlas **1024×1024** (16 procedural busts @256px — no photographs,
no real identities), anonymous atlas **512×512** (4 spore-print glyph variants).
Both canvas-painted at boot; zero network fetches.

## Runtime (Tier 1, fronted tab)

- **60 fps sustained** during the glide, hover churn, card open, mode crossfades.
- **CPU frame 0.3–0.8 ms** (EMA over render + raycast).
- Zero console errors across full traverses, ping-pong reversal, resizes, all toggles.

## Transparency / overdraw ceilings observed

- Worst case is a **near pass**: a defocused portrait plane grows ×~2.3 and can cover
  ~⅓ of the frame briefly; current placement yields ≤2–3 nodes inside the blur zone
  (camera distance < 2.6) at once. Proposed production placement rule: **max 3 nodes
  within 2.6 units of the glide path per segment**.
- 8 haze sprites are the only standing large transparent quads, each ≤0.03 additive.
- Overdraw, not vertex count, is the governing constraint at production density.

## Proposed Tier-2 reductions (grade identity preserved)

| Piece | Tier 1 | Tier 2 proposal |
|---|---:|---|
| Hyphae | 65.7k verts | `setDrawRange` to 45% (donor pattern) → ~29k |
| Cords | 5 + filaments | drop 2 thinnest cords and ALL filament overlays |
| Rim fibres | 12/node | 6/node; halo Points layer off, cores stay |
| Portrait planes | 16 | keep all 16 (identity content is the chapter's point); atlases 512²/256² |
| Bloom | UnrealBloom | baked glow sprites; **keep GradePass** (LUT/grain/vignette = tier identity) |
| Expected | 35–38 draws | <20 draws |

## Production-density extrapolation (for OW-4 / G2b re-verification)

Portrait planes, rims, cores, halos and node strands each stay **one draw call at any
node count**. At 60 nodes: strands ~5.2k verts, rims ~4.3k, planes 240 — trivial.
Density scaling is safe; enforce the near-pass placement rule above.

## Spike B revision — real-photo mode + 48-node density (Hannah, 2026-08-02)

Measured after adding `[p]` (procedural → real test photos → anonymous) and `[d]`
(16 ↔ 48 nodes) to the same page. Photos are the LOOK-DEV ONLY set in
`journey-v6/assets/test-portraits/` (never ship), loaded same-origin and baked
through the identical canvas treatment into per-field photo atlases at boot.
The density run reuses the 26-photo pool with deterministic mirror / exposure /
warmth variation; no extra network fetches, no per-frame photo work.

| State (fronted tab, glide on) | Draw calls | Node-strand verts | Rim verts | Planes | CPU (ms) | fps |
|---|---:|---:|---:|---:|---:|---:|
| 16 nodes, procedural (baseline above) | 35–38 | 1,456 (91 curves) | 1,152 | 16 | 0.3–0.8 | 60 |
| 16 nodes, PHOTO | 36–38 | 1,456 | 1,152 | 16 | 0.3–1.0 | 60 |
| **48 nodes, PHOTO (production density)** | **36–38** | **4,048 (253 curves)** | **3,456** | **48** | **0.5–0.9** | **60.1** |
| 48 nodes, ANONYMOUS | 36–38 | 4,048 | 3,456 | 48 | 0.5 | 60 |

Draw calls are **flat across density** — planes/rims/cores/halos/strands are one
draw each regardless of node count, exactly as extrapolated. Atlas memory:
16-node field 2×2048×512, 48-node field 2×2048×1536, + 512² anon (≈29 MB RGBA
total before mips — fine for Tier 1; Tier 2 halves cell size to 128px → ≈7 MB).
Both fields coexist in the scene (hidden one culled at the group), so [d] is an
instant toggle with no rebuild.

Zero console errors through photo loading, mode crossfades, density toggles,
hover/select and full traverses.


## Spike B revision 2 — arc camera, full page chrome, no-empty-frames pass (Hannah's notes, 2026-08-02)

Taste-owner revision addressing: dead stretches in the glide, missing page copy,
"stuff zooming at me", and mid-frame clustering.

**What changed:**

1. **Camera is now an ARC, not a corridor dolly.** The colony spine is unchanged;
   the lens sweeps a broad lateral arc (enters +8 on one flank, crosses the
   corridor diagonally, exits −8 on the other) while the look target counter-pans
   toward the flank being left behind. View direction stays ~45–75° off the motion
   vector for the whole traverse, so faces/cords parallax laterally — nothing
   streams along the view ray. Traverse clamped to u ∈ [0.05, 1.0] (below 0.05 the
   entry cord-knot crossed the look centre and the additive stack blew out).
   84 s ping-pong. QA scrub: `?u=0.35` or `window.__setU(v)`.

2. **Decentralized, frame-stratified node placement.** Each node gets a home
   parameter on the arc and is placed inside THAT moment's frustum, in a cell of
   a 3×3 frame grid (corners/edges included) at a near/mid/far depth pattern.
   Top-centre cell is forced deep (≥10) because the page copy owns that region.
   New **camera-path clearance pass**: no disc may sit <3.0 units from any point
   of the arc — near-pass defocus moments survive (3–5 band), frame-swallowing
   ghosts do not. Defocus band retuned 2.2→5.0 (was 2.6→8.5) so the mid field
   reads crisp like the approved still.

3. **Field re-authored against the camera polyline** (not the spine): near/mid
   hyphae sample a full-3D shell around the arc (vertical fill included), far-layer
   exclusion + aggregate layers + cord clearance all measure against the sampled
   64-point camera path, voids moved to the far flanks (±11–12, one under-floor)
   with a programmatic push-clear (r + 2.4 min clearance), and 4 new dim haze
   sprites sit above/below the corridor so the top/bottom of frame dissolves into
   amber instead of hard black.

4. **Full page chrome, real DOM, never graded:** locked heading + "100% shared"
   primary pill + two secondary pods (strings asserted from `content/content.js`
   at boot), BANODOCO wordmark, nav Mission · Inspire · Connect · Owned (Owned
   softly active; no Equip, no Final), paired 2RP/Discord pills — all treatments
   cribbed from the hero page CSS. Soft top-centre scrim buys copy contrast.
   **Pod interactions (OW-3):** primary hover fires ONE broad slow wave (world-
   space expanding sphere across every node layer: planes, rims, cores, halos,
   node strands — plus staggered cord re-fires and a quiet 3-batch hyphae light
   sweep, ~7 s to cross the colony); secondary pods fire a small localized wave
   (maxR 7) at their region anchor. Ambient remains loop-free.

5. **Default boot = real photos × 48 nodes** (the best-reading state).
   [space]/[g]/[p]/[a]/[d]/[b] unchanged.

**Gap audit (no-empty-frames):** scrubbed u = 0, 0.06, 0.1, 0.2, 0.3, 0.4, 0.5,
0.6, 0.7, 0.75, 0.8, 0.9, 1.0 at 1280×800 and u = 0.06, 0.2, 0.4, 0.6, 0.8, 1.0
at 900×700. After the clearance pass, every position holds composed structure
(faces at depth, cords, lit hyphae, haze) in every third of the frame, both
axes; authored voids read only as passing pockets. The single pre-fix violation
(u≈0.4: a node <1.5 from the path swallowed the frame as a defocus ghost) is
eliminated by the 3.0-unit clearance.

| State (fronted tab, gliding) | Draw calls | CPU (ms) | fps |
|---|---:|---:|---:|
| 48 nodes, PHOTO, graded (boot default) | 41–43 | 0.3–1.0 | 60.6 |
| 16 nodes, PHOTO | 42 | 0.3 | 60+ |
| 48 nodes, ANONYMOUS | 41 | 0.8 | 60 |
| RAW ([g]) | 27 | 0.7 | 60 |

Zero console errors across boot, scrubs, mode/density toggles, pod waves,
hover/select, card open/close, and resizes (1280×800 ↔ 900×700).

**For production:** (a) the 3.0-unit camera-path clearance and the frame-cell
stratification are the two placement rules worth carrying into OW-4 verbatim;
(b) the pod wave runs entirely on per-material uniforms — no per-node JS — so it
scales to any node count; (c) chrome strings must keep coming from content.js,
never hardcoded in the chapter page.

---

# W4-C — Owned chapter production (Spike B ported into the live journey, 2026-08-02)

**Measured:** Apple-silicon Mac, in-app pane (fronted tab, vsync live), Tier-1,
`http://localhost:8137/journey-v6/?nointro=1&p=0.725`. Field authored against the
REAL Owned leg (owned-leg.js samples director `poseAt` over p 0.660–0.872; 107-pt
polyline). Files: `chapters/owned.js` + new `owned-leg.js` / `owned-substrate.js`
/ `owned-portraits.js`. spike-b/ untouched.

## Geometry / memory (armed state)

| Element | Amount | Verts / px |
|---|---:|---:|
| Fine hyphae (2,700 far / 3,300 mid / 1,400 near) + soil-underside lid (560) | 7,400 strands | 56,544 line verts |
| Rhizomorph cords (6 tapered tubes 64×6 + 7-filament bundles each; one climbs to the stipe, one runs out the exit corridor) | 6 cords | 4,914 verts |
| Node-local strands (terminate at nodes; node↔node links; cord attachments) | 268 curves | 4,288 line verts |
| 3D rim fibres (12/node × 3 segs) | 48 nodes | 3,456 verts |
| Portrait planes (one indexed mesh) | 48 planes | 192 verts |
| Cores + halos (2 Points layers) | 2×48 | 96 pts |
| Soil aggregates (2 layers) + haze sprites | 134 pts + 12 sprites | — |
| Ownership pods (3 nexus knots: strand bundle + core + halo) | 3 | ~1.6k line verts |
| Growth front (fan beyond the exit, p-gated 0.775→0.81) | 40 strands | ~0.6k |
| **Drawable objects when armed** | **45** | fully retired (`group.visible=false`) outside T3 arming |

Atlases: busts 2048×1536, photos 2048×1536 (26-photo look-dev set, baked async
through the spike treatment — never blocks boot; load failure degrades to
procedural busts), anon 512×512. ≈25 MB RGBA before mips.

## Runtime

- **59.9 fps median (16.7 ms, vsync-locked) at the Owned rest**, fronted tab;
  p95 34 ms attributable to shared-machine contention during parallel agent runs.
- Zero console errors from the Owned chapter across placement, leg sweep
  (p 0.696→0.858), pod waves, hover/select, card open/close, photo/anon
  crossfades, consent toggle, resize 1600-wide ↔ 900×700, and return to p=0.
  (Two logged shader errors in this period belong to the in-progress W4-B
  `chapters/connect.js` — GLSL reserved word `patch`, its fragment shader —
  which also blacks the composer once Connect arms. Not an Owned issue; flagged
  to the Connect owner.)
- Mission preservation intact: at p=0, nothing armed, hero fog (7,20), hero
  pose exact, chapter group invisible.

## Reachability (the grey-box gap, closed)

- 19 nodes registered (3 pods + **all 16 contributors**; grey-box had 3+4).
- All 16 contributors frame inside the rest frustum (`restVisible()` = 16/16).
- 13 hotspots live at the rest pose (3 pods + 10 contributors; the other 6
  in-frame but suppressed by copy-rect / edge margins). ≥10 requirement met.
- Placement: 12 contributors stratified against the REST frustum cells, 4 in
  drift frames; 32 ambient nodes cover the whole underground leg. Hard rules
  carried verbatim: ≥3.0-unit clearance from every point of the leg polyline
  (descent + rise included, with soil-safe push redirection), 3×3 frame-cell
  stratification with near/mid/far depth pattern, top-centre forced deep,
  size (0.34–0.58) + per-pair spacing jitter (1.70–2.12) against coin-rows.

## Colour pipeline — REQUIRED READING for the grade-unification pass

Spike B calibrated with **no OutputPass** (raw display-space additive sum). The
live journey renders through the hero composer: RenderPass → UnrealBloom
(0.62/0.45/0.1) → TAA → SpikeGradePass (Mission/Inspire leg only; uAmount = 0
across Owned) → **OutputPass (ACES filmic, exposure 0.95, sRGB)**. Under ACES,
dim additive values screen 2–4× brighter than the spike's raw path, so the port
carries explicit compensation that unification must reconcile:

- `EXPOSURE_LINES 0.30` on every additive line/sprite base opacity;
  `EXPOSURE_PLANES 0.42` on portrait-plane alpha (uExposure) + rim/core/halo.
- Cords: spike's 0.62 opacity factor → 0.34, fogDensity 0.010 → 0.020 (tubes
  at min clearance read as frame-wide ribbons under ACES otherwise); cord
  clearance raised 2.8 → 3.4 for the same reason (journey fov 54).
- Plane shader constants: t.rgb 1.12 → 0.88, rim 0.10 → 0.07, core 0.06 → 0.04,
  haze floor 0.55 → 0.38; defocus size growth 1.35 → 1.0; node sizes ~62% of
  spike's. Halos 3.4×/0.06 → 2.5×/0.035; cores 0.10 → 0.062.
- New **near-fade** `smoothstep(1.1, 2.9, viewDepth)` on all pulse-mat line
  layers and node strands: anything grazing the lens dims away instead of
  blazing flat (the near field belongs to defocus, not brightness).
- The atlas treatment itself (62% desat, 0.90 amber multiply, edge burn,
  feather 0.76) survives ACES ≈ unchanged — texture content round-trips
  through sRGB decode/encode; only the additive constants shifted.

## Leg audit (no-empty-frames)

Sampled p = 0.696 / 0.702 / 0.706 / 0.725 / 0.745 / 0.788 / 0.815 / 0.845 /
0.858 at 1600-wide and 900×700. Every frame holds composed structure (portraits
at depth, cords, lit hyphae, lid, haze); T3 passes through the soil-underside
lid + entry collar, T4 exits through the growth-front corridor with the OW-5
pulse (fires crossing p 0.795 forward, re-arms below 0.765). Known soft spots
(acceptable, noted for polish): bottom third at p 0.696–0.706 reads as dark
deep-soil with sparse strands; a quiet mid-band stripe at p ~0.815 between the
soil-line and the portrait belt.

---

# W4-A — Inspire production polish (chapters/inspire.js + inspire-ambient.js)

**Measured:** 2026-08-02, Apple-silicon Mac, in-app browser pane ~800×718 CSS px @ DPR 1.75,
fronted tab. **Page:** `journey-v6/index.html?p=…&steady=1`. Same harness caveats as
Spike A above (renderer.info per-pass reset; cadence is the frame-health signal).

## What was added (deltas on the Spike-A/W3 inspire numbers)

| Piece | Amount | Cost class |
|---|---:|---|
| Core ribbons — 3 winding cores × 3 plumes, positions evaluated in the vertex shader with the exact spore braid math (uTime terms included) | 648 line segs, 1,296 verts | **+1 draw call**, zero per-frame CPU |
| Spore core cohort (aMisc grew vec2 → vec3: coreness) | 0 new particles (32% of the 5,100 re-tagged) | attribute +5,100 floats, zero per-frame CPU |
| Knot cadence (per-plume gain uniform `uKnot` = 0.70 / 1.00 / 0.55 from the anatomy map; Arca hottest) | in-shader | zero per-frame CPU |
| Hover trace-back (IN-4.1): `uTrace`/`uTraceAmp` on source + wisp strand mats, vec3 amp on the core-ribbon mat | 8 uniforms | zero geometry |
| Ambient shed dimmer (`inspire-ambient.js`): per-frame JS loop over the hero's 4,200 shed spores + one color-attribute upload (~50 KB) while the ArtCompute reveal fade > 0; byte-exact restore on exit | 4,200 pts touched | ~0.1 ms JS/frame at rest, zero when retired |

## Runtime (fronted tab)

| State | rAF median | p90 | Notes |
|---|---:|---:|---|
| Inspire rest (all three exits, dimmer live, streak on Arca) | **16.7 ms** | 18.6 ms | vsync-locked |
| Mid-orbit p ≈ 0.19 (2RP igniting) | **16.7 ms** | 33.3 ms | p90 contaminated by the QA jump + TAA re-converge in the sample window |

Zero console errors across: cold boot, `?p=` placements at 0/0.05/0.10–0.26,
forward + reverse orbit sampling, hover enter/leave on all three initiatives,
Escape/detail churn, shed hide/show diagnostics.

## Ambient dimmer accounting (gap b)

At the Inspire rest the corridor dim removes **24.5%** of the hero shed's total
color-attribute luminance (sum 7,789 → 5,881), concentrated in a 0.65-radius
full-dim / 2.05-radius feather cylinder around the ArtCompute release→plume-top
segment (world space, re-derived from the live mushroom matrix every frame, so
it rides cap bend + sway). `scrollTo(0)` restores the attribute verbatim
(`array.set(base)`) — hero p = 0 regression clean, confirmed numerically and
visually.

## Tier notes

- Core ribbons are **kept at Tier 2** (1 draw call, 1.3k verts — cheaper than the
  wisps they visually replace when Tier 2 drops wisps + cap flow).
- The ambient dimmer runs at both tiers (it is a subtraction, not a load); its JS
  loop is O(4,200) adds/mults — no measurable cadence impact.
- Streak auto-active (gap c) adds no cost: same 3 sprites, still ≤ 1 visible.

## Honest-comparison note for grade unification (W5)

The winding cores now read as continuous sinuous filaments with travelling knot
pearls — the approved still's core language, full definition. The remaining
visible difference vs `reference-images/approved/inspire.png` is plume-silhouette
WIDTH: the still's sheaths are tighter columns; ours inherit the approved spike's
broader turbulent sheath, and gl_PointSize is pixel-based so a narrow pane
(≤ 800 px) exaggerates apparent density/size. Judge sheath width at ≥ 1280 px,
and treat any further tightening as a grade/taste call for the unification pass,
not a W4-A defect.

---

# W4-D — Final-chapter production stage (Hannah's "hero joins the ring" revision, 2026-08-02)

**Page:** `http://localhost:8137/journey-v6/index.html?p=…&steady=1`, in-app pane (hidden tab).
**Scope:** `journey-v6/chapters/final.js` + new `final-world.js` / `final-ring.js` /
`final-terrain.js` / `final-sky.js`, plus the sanctioned re-key of the director's
Final leg (p ≥ 0.782 only). Measured with the parallel W4 builds live in the same
tree (production Owned portrait field + product-systems footer both armed at the rest).

## Chapter composition (build-time counts, from `journey.chapters.final.counts`)

| Piece | Amount | Draws |
|---|---:|---:|
| Fairy ring: 9 built agarics + 2 far hints, merged line batch (build-time LOD by distance from the rest camera) | ~610 segs | 1 |
| Ring glow points (halo + under-cap + core + base per body) | ~40 pts | 1 |
| Primordia (dwell-driven buds, GPU grow) | 5 pts | 1 |
| Surface strokes (kept side of the cut) | 1,040 segs | 1 |
| Cut lip + face (continuous lip, ragged drops, strata ticks) | ~600 segs | 1 |
| Lip beads + face aggregates | 260 pts | 1 |
| Underground hyphae (colony + exposed section) | 1,700 segs | 1 |
| Rhizomorph cords (6, double-stroked, cut ends flagged) | 110 segs + ends pts | 2 |
| Growth-front arc (pulse carrier, aArc-addressed) | 130 segs | 1 |
| Member↔front connectors (reveal-gated) | 36 segs | 1 |
| Spore sky (GPU phase: plume-born + standing broad cloud) | 3,600 pts | 1 |
| Forest horizon conifers (2 fogged distance bands) | ~1,150 segs | 1 |
| Mist / horizon-glow / dark-pocket sprites | 9 sprites | 9 |
| **Chapter total** | **~5.4k segs + ~3.9k pts** | **~22** |

All lit geometry rides ONE shared shader pair (strand + point) with per-vertex
aArc/aReveal/aTw/aBoost/aWave channels and one uniform block ticked per frame —
zero per-frame CPU geometry work; the spores are a pure GPU phase shader
(Spike A pattern). Fog uniforms are copied from `scene.fog` each frame, so the
chapter renders inside the director's ramp exactly (rest fog measured 13.75/60.3,
matching the pure-function prediction).

## Whole-frame at the Final rest (accumulated `renderer.info`, autoReset off, post-render probe)

| State (900×700 pane, DPR 2) | Draws | Lines | Points | Tris |
|---|---:|---:|---:|---:|
| Final rest p=0.925 — hero + production Owned field + Final stage + footer + grade | 104 | 82,933 | 28,224 | 17,578 |

Baseline hero alone is 42 / 44.4k / 24.1k / 12.8k (BASELINE §4.3); the delta is
shared between the parallel Owned production field (~33k line verts of hyphae)
and this chapter (~5k segs + ~3.9k pts + ~22 draws). Draw-call total stays
double-digit; no full-screen transparency was added; worst local overdraw is the
under-cap glow stack at the near-right lip member (~4 sprite-points over <1% of
frame).

## Cadence caveat (same as BASELINE §2 / Spike A)

The pane is a hidden tab: frames run only in capture bursts, so no honest fps
median exists in this harness (a 2 s rAF probe caught 1 frame; in-burst deltas
ran 8–33 ms). `renderer.getPixelRatio()` stayed 2 — the governor never engaged.
Everything added is static merged geometry + one GPU point shader, with less
per-frame CPU than Spike B's measured 60 fps state (which carried this same
Owned field fronted). **Gap: one visible-tab session should confirm the rest-pose
cadence**, as Spike A flagged for its own states.

## Tier-2 levers (wired at build constants, not yet exercised)

- Spores 3,600 → 1,800 via drawRange prefix (sources interleaved, stays balanced).
- Hyphae 1,700 → ~900, surface 1,040 → ~600 (count constants).
- Horizon far band + 4 of 9 sprites droppable; ring LOD floor already ~0.5.

# D14 — Ring members rebuilt as individuated copies of the hero (2026-08-02)

**Scope:** `journey-v6/chapters/final-ring.js` rewrite (members now generated
from a parameterization of the hero's own form recipe — mushroom-scene.js §4
cap form language, §6 gill cavity shading, §7 stem taper/flare — individuated
per member across scale/growth stage, cap ratio, lean, rim waviness + droop +
fold, gill density, stem thickness/curve, heat sector, glints, shed). Plus one
shared-language parameter in `final-world.js`: per-member seeded `shed`
strength, expressed to the sky by weighting `SPORE_SOURCES` via repetition
(sky code untouched; spore count unchanged at 3,600).

| Piece | Was (W4-D) | Now (D14) | Draws |
|---|---:|---:|---:|
| Fairy ring merged line batch (9 members + 2 far hints, 3-tier build-time LOD) | ~610 segs | 825 segs | 1 (unchanged) |
| Ring glow points (halo/core/base + NEW per-member moisture glints, margin beads, shed trails) | ~40 pts | 94 pts | 1 (unchanged) |
| Primordia | 5 authored / 4 surviving pts | unchanged | 1 |

Chapter total moves ~5.4k → ~5.6k segs and ~3.9k → ~3.95k pts; draw calls
unchanged (~22). Everything still rides the shared strand/point shader pair and
the aArc/aReveal/aTw/aBoost/aWave channels — undarken, growth-front pulse,
CTA wave and primordia untouched. Verified in-pane at p=0.85/0.88/0.90/0.925/1.0
(cache-busted hard reloads, screenshot pumping): sequential kindle intact,
hero at p=0 untouched, zero console errors.

# D15 — Ring members densified to the hero's render (2026-08-02)

**Trigger (Hannah, live review):** "The mushrooms there don't seem to be based
on the main one — why do they have way worse texture?" D14 carried the hero's
FORM recipe at ~825 segs total for nine members vs the hero's ~16k-seg line
build — and the hero's texture IS its density. The performance caution behind
that was unnecessary (BASELINE: whole frame vsync-locked with headroom on the
M3, the only target device, D8).

**Scope:** `journey-v6/chapters/final-ring.js` (buildMushroom rewritten around
the hero's actual texture systems: §4 cap lattice grid + overlay net + node
points + speckle motes, §6 gill fan with cavity-shading curve + 8% doubled
veins + hot core, the 3-ring rim + depth-weighted front arc + lip + fringe
ticks + margin beads, §7 stem lattice + wiggling vertical fibres with every
fifth doubled, §8 ground-merge root flare on real groundY clipped at the cut
lip) and one mechanism in `final-world.js`: `meta.mul`, a build-time color
multiplier in makeBatch (== per-segment material opacity under additive
blending), so ONE merged batch carries the hero's per-system opacities
(cap 0.28 / gills 0.33 / rim 0.55 / stem 0.32 / roots 0.42). Hero §5 occlusion
shells are mirrored WITHOUT new draws as build-time far-side damping against
the rest camera (same precedent as the build-time LOD tiers). D14's seeded
per-member individuation, reveal thresholds, growth-front/CTA boost channels,
shed weighting, glints language, halo points, far hints and primordia are all
unchanged.

## Built density (from `journey.chapters.final.counts.ringMembers`)

| Tier | Members | Segs each (was D14 ~90 avg) | Pts each | % of hero line build |
|---|---|---:|---:|---:|
| T0 near (dist<8) | i3 h1.7, i4 h1.5 | 4,144 / 3,760 | 438 / 398 | ~24% each |
| T1 mid (<14) | i0, i1, i2, i5 | 2,133–2,996 | ~220 | ~13–18% |
| T2 far | i6, i7, i8 | 863–1,168 | ~90 | ~5–7% |

| Piece | Was (D14) | Now (D15) | Draws |
|---|---:|---:|---:|
| Fairy ring merged line batch | 825 segs | **21,280 segs** (~42.6k line verts) | 1 (unchanged) |
| Ring glow points (adds lattice beads, node dots, speckle, gill core, rim/stem points) | 94 pts | **2,001 pts** | 1 (unchanged) |
| Primordia | 4 pts | unchanged | 1 |

## Whole-frame at the Final rest (accumulated renderer.info, autoReset off, 10 pumped frames, 1440×860)

| State | Draws | Line segs | Points | Tris |
|---|---:|---:|---:|---:|
| p=0.925 rest, D15 | **104** | 103,667 | 30,187 | 17,578 |
| (D14 reference) | 104 | 82,933 | 28,224 | 17,578 |

Draw calls IDENTICAL — density lives inside the two existing merged batches.
In-burst rAF deltas at the rest: median **16.7 ms (vsync-locked)**, p90 32.5 ms
(burst hiccups, same 8–33 ms spread BASELINE §2 recorded). No evidence of
median CPU frame cost >10 ms; per-frame CPU work is unchanged (static merged
geometry, same uniform tick). Hidden-pane caveat stands as in BASELINE §2 —
one visible-tab session should confirm cadence.

Verified in-pane (cache-busted loads, screenshot pumping, 1440-wide and
900×700): side-by-side at p=0.925 and p=0.90 reads as one material world —
members show the hero's cap crumple, gill fans under lifted rims, stem
striations and base flares at their distances; whisper state carries the
density (faint full bodies, not lit diagrams); reveal partial state clean at
p=0.87; reverse scrub clean; hero at p=0 untouched; zero console errors.

## Tier-2 levers for the ring (cut in this order)

1. capSpkPts + capBeadP motes (~600 pts) — invisible first.
2. T1 ticks 160→80-equivalents and capSegs −25% (~1.5k segs).
3. T2 members back toward sketch density (~2k segs — they are tiny in frame).
4. gillSub 8→6 on T0, front-arc second pass off (~750 segs).
Keep last: rim rings + gill fans (they carry each member's identity).

---

# W4-B — Connect chapter production (gill commons, 2026-08-02)

**Measured:** headless Chromium (ANGLE Metal, `--use-angle=metal`, same rendering
stack as the in-app pane) at **1440×900 DPR 1**, `?nointro=1&steady=1&p=0.49`.
Method: `renderer.info` with `autoReset` off, reset at rAF head and read at the
next rAF (true per-frame accumulation across the whole composer, not last-pass).
Frame cadence via a 240-frame rAF histogram. The shared pane (615×317 CSS,
DPR 2) was used for real-GPU parity spot-checks only.

## Geometry (Tier 1, chamber armed)

| Piece | Amount | Draws |
|---|---:|---:|
| Blade sheets — 3 instanced batches (28 primaries + 28 lamellulae + 16 tertiaries), grids 40×3 / 26×3 / 16×2, DoubleSide, cropped to the lit band (v ≤ 0.55 of depth) | 72 blades, 12,112 tris | 3 |
| Free-edge polylines (the crisp light carrier — 1-px lines like the hero gills) | 2,120 segs | 1 |
| Cross-veins (taut arcs, patchy, densified through the Community sector) | 605 segs | 1 |
| Moisture beads (vein junctions + edge glints) | 123 pts | 1 |
| Chamber spores (in-shader migration toward the rim → feeds Inspire) | 380 pts | 1 |
| Haze sprites (far/front-left wall only) | 7 | 7 |
| ADOS strands (14 × 11 segs) + knot tangle + core sprite | 154 + 60 segs | 3 |
| Hivemind braid (5 strands × 44) + memory points | 220 segs + 5 pts | 2 |
| **Chamber total** | ~3.16k line segs, 12.1k tris, 508 pts | **+19** |

## Measured, per state

| State | Draw calls | Tris | Line verts | Points | Cadence med (p95) |
|---|---:|---:|---:|---:|---:|
| Connect rest, armed, full chain | **51** | 24,956 | 47,520 | 4,708 | **16.7 ms (17.4)** — 60 fps locked |
| Hero baseline (§4.3, for reference) | 41+1 | 12,828 | 44,377 | 24,090 | 16.7 ms |

Points DROP by ~19k at the rest: the hero's mote/bead clouds (fake-DOF bokeh,
frame-filling at chamber range) are **fully retired** (`visible = false`) once the
eased chamber amount deepens past ~88% — dimming them to 6% still paid their entire
raster cost, and that raster load is what tipped heavy frames into the Metal aborts
below. They restore exactly (opacity AND visibility) as the amount eases out; the
spore shed (4,200 pts) stays live throughout, as in the G2a spike. Between the
retired clouds and the +19 chamber draws, the armed rest nets **+9 draw calls**
over the hero baseline.

## Stability — the TAA NaN soak (new verification, keep using it)

Two distinct failure modes were found, fixed, and are now guarded in code:

1. **`pow()` NaN**: varying interpolation can deliver a base a hair below zero
   (e.g. `aAlong` at a strand's first vertex); `pow(-ε, 2.4)` is NaN by GLSL spec.
   One NaN fragment spreads through the bloom mip chain, and the hero's
   TemporalAccumulatePass then holds it FOREVER — `mix(x, NaN, 0.0)` is still NaN,
   so the blend re-poisons its own history every frame. Symptom: most of the frame
   goes black 1–2 s after the chamber arms. All shader `pow()` bases in the chapter
   are clamped strictly positive; gaussians use the donor's `exp(-d*d/w²)` band form.
2. **Metal command-buffer aborts under peak load**: with a heavy per-fragment
   shader across 70+ stacked DoubleSide sheets (plus the hero's ballooned bokeh
   quads underneath), rare frames aborted mid-pass and left a rectangular tile
   region of the composer's HalfFloat target as garbage NaN bit patterns — same
   permanent TAA blackout. Fixes: all smooth-along-the-blade math moved to the
   VERTEX shader (fragment = 4 `exp()`s shaping light across v), sheets cropped to
   the lit band, hero bokeh retired (above), and the blade fragment clamps its
   varyings to domain + caps output at 48 — the worst possible bad frame is now a
   finite one-frame shimmer that TAA absorbs.

**Soak method** (recommended for any chapter that adds shaders): scan
`composer.renderTarget1/2` as `Uint16Array` for half-float NaN bit patterns
(`(v & 0x7C00) === 0x7C00 && (v & 0x03FF)`) every ~250 ms. Verified clean: 21 s
static rest, 24 s continuous hover-storm across all three behaviours, entry/exit
glides both directions. Zero console errors throughout. NOTE for grade
unification / core: the TAA blend could self-heal from any future NaN with a
one-line guard (sanitise history or use `w > 0 ? mix(...) : current`), and its
history cannot be cleared by `validHistory` once poisoned — worth considering
when the composer is next touched (core-owned; not changed by W4-B).

## Composition / anchors

- Copy is LEFT: the colonnade's sector behind the copy block (az ≈ 1.95 from the
  rest camera) is a deliberately dark luminosity patch — reads as organic sector
  patchiness, doubles as copy legibility.
- Community = az 2.95 ± 0.36 (front-left wall, centre-frame at the rest), anchor
  at the lit region's floor; ADOS = the knot at the gill/stem apex (az 3.35,
  upper-centre); Hivemind = braided route lower-right, threading to the junction.
- All three anchors verified visible (unsuppressed, in-frustum) at **1440×900,
  430×932 and 375×812**. Hivemind's chip is orientation-aware (same route,
  different anchor point): mid-route in landscape; the junction turn-in when
  `camera.aspect < 1` — the only stretch of the route inside the portrait
  frustum and clear of the portrait copy rect (GREYBOX-DECISIONS §23 follow-up).

## Tier-2 proposals (not yet exercised)

| Piece | Tier 1 | Tier 2 |
|---|---:|---|
| Blade sheets | 72 / 12.1k tris | drop tertiaries + halve lamellulae (~7k tris); grids 26×2 |
| Edge polylines | 2,120 segs | ~1,200 (primaries full, secondaries halved) |
| Veins | 605 segs | ~350 (keep Community sector dense) |
| Spores | 380 | 220 |
| Haze | 7 sprites | 4 |
| Ambient exchanges | 3 regions | 2 (donor tier model) |

## For grade unification (W4 optics pass)

Raw render as instructed; material family is the hero palette via `heat()`.
Notes: (a) chamber light is deliberately line-carried — if the unified grade adds
halation, re-check the free-edge polylines first, they are the brightest thing in
frame; (b) the blade under-glow (`uEdge` 0.26) and face haze (`uBase` 0.26) were
tuned against the ACES OutputPass with bloom 0.62 — a grade that lifts near-blacks
will need those two uniforms stepped down, they are the whole silk-vs-blade
balance; (c) the fog constants in the chapter materials (`uFog` 0.26–0.34) fake
depth falloff the scene fog can't provide at chamber range (scene fog near = 7);
if grade unification re-parameterises scene fog inside T2, these can drop.

---

# W5 — Grade unification (documentary lens across the full journey, 2026-08-02)

**Scope:** `core/lens.js` (rewritten around the G2a shader), `journey.js` (wiring:
always-on grade, per-leg focus hints, [g] key), `chapters/inspire.js` (ONE named
taste knob — see below). `core/seams.js` untouched (the T2/T3 bells are computed
from the same `SEAM_FOG_DIPS` constants the director uses; no shared uniform was
needed). No other chapter knob was turned.

**Verified:** in-app pane, 1440×860 and 900×700, `?nointro=1&steady=1&nosnap=1&p=…`
plus `window.journey.scrollTo()` sampling with `journey.scroll.enabled = false`
(both snap models re-target arbitrary mid-leg p, so held sampling must freeze the
scroll model). Screenshot-pump convergence per BASELINE §2. NOTE for future
sessions, learned the hard way: python http.server + heuristic HTTP caching can
serve a STALE module against fresh siblings after a concurrent edit (symptom:
`does not provide an export` for an export that exists). Fix: `fetch(url,
{cache:'reload'})` for each stale module, then a plain reload.

## What the unified lens is

ONE finishing language, p 0..1: the G2a shader (aberration, selective warm
halation + focus hint, warm lift, low-luma amber gain, ember roll-off, luminance-
weighted grain, clean-centre vignette, master uAmount) plus:

- **uGain** — pre-tonemap exposure gain (the Final leg's missing luminosity is
  the grade's job, per W4-D).
- **uHalation** is now a continuous strength (0 disables), so the per-leg curve
  and Tier 2 share one uniform.
- **Per-leg look curve** (smoothstep-interpolated keys in p, in `lens.js`):

| Leg | gain | lift | warm | halation | vignette | grain | anchored to |
|---|---:|---:|---:|---:|---:|---:|---|
| Mission/Inspire p≤0.38 | 1.00 | 1.00 | 0.00 | 1.00 | 0.34 | 0.030 | G2a identity, byte-exact |
| Connect 0.44–0.60 | 1.00 | 1.00 | 0.10 | **0.62** | 0.35 | 0.031 | W4-B note (a): free-edge polylines are the brightest element; full halation smears the crisp carrier |
| Owned 0.68–0.85 | 1.02 | 1.35 | 0.55 | 0.85 | 0.36 | 0.035 | underground warm near-black (this pass's leg curve licence) |
| Final 0.93–1.00 | **1.14** | 1.18 | 0.30 | **1.25** | 0.29 | 0.030 | W4-D: raw is deliberately less dense/luminous than the approved still |

- **T2/T3 seam bells** (same `SEAM_FOG_DIPS` p-bells as the director's fog dips,
  so zero at every rest, perfectly reversible): grain +0.014·b, lift ×(1+0.55·b),
  warm +0.40·b, vignette +0.045·b, halation ×(1−0.30·b) — the crossings read
  RICHER, not just darker (W3-B's prediction, verified A/B at p=0.436 and 0.693).
- **Halation focus hints** (journey.js, per frame): active Inspire exit
  (`inspire.activeWorld()`), ADOS knot (`connect.nodeWorld('ados')`), primary
  ownership nexus (`owned.nodeWorld('pod-shared')`), and on the Final leg the
  nearest mature in-frustum ring member to the rest camera (a static "selected
  fairy-ring highlight" — the travelling front exposes no world position and
  final.js is outside this pass's file boundary; noted for polish).
- **[g]** everywhere (journey.js keydown): raw = post-bloom, pre-grade hero
  baseline at any p. `userRaw` is held inside the lens so the per-frame update
  can never fight the toggle.
- **Reduced motion:** grain freezes to a static frame (uGrainSeed pinned; live
  `matchMedia` listener) — never removed (handoff VISUAL FINISHING). Could not
  be exercised in-pane (no media-query emulation); code path only.
- **setTier(2):** keeps LUT/lift/roll-off/grain/vignette, zeroes uHalation +
  uAberration (streak-class effects are Tier-1 only). Verified live at the
  Connect rest: identity holds, edges cleaner. `debugState().lens` now reports
  the whole look {on, amount, gain, lift, warm, hal, vig, grain, tier}.

## Chapter knobs turned (log)

| Knob | Was | Now | Why |
|---|---|---|---|
| `chapters/inspire.js` spore-sheath scatter (`SHEATH` define, W4-A's open taste knob) | 1.0 | **0.72** | the approved still's sheaths are tighter columns. ONLY the per-particle scatter terms carry it — the winding terms are shared verbatim with the core-ribbon shader (4b), which must keep threading the braid. Verified ≥1280px: cores read, sheath hugs. |
| `EXITS[].knot`, `coreMat uOpacity` (0.62) | — | untouched | knot cadence reads correctly under the unified grade |
| `connect-blades uBase/uEdge` (0.26/0.26), chapter `uFog` | — | untouched | reconciled grade-side instead (halation 0.62, lift held at identity through Connect) — silk-vs-blade balance survives as tuned |
| `final-ring` glow-points opacity (1.5) / halo sizes | — | untouched | under gain 1.14 + halation 1.25 the under-cap stacks read as lamps, not clips (ember roll-off absorbs the lift) |

## TAA NaN hardening (W4-B's recommendation, implemented core-side)

The hero's `TemporalAccumulatePass` lives in frozen `mushroom-scene.js`, so the
lens patches the pass's blend material at boot (`hardenTAA()` in `core/lens.js`,
idempotent, finds the pass by `.history && .blendMat`): non-finite history pixels
are replaced by the current frame; a non-finite blend result flushes to black for
one frame; either way the feedback loop re-converges. GLSL compiles as ES 3.00
under WebGL2, so `isnan()/isinf()` are real builtins. Logs
`[journey-lens] TAA history sanitise installed`; `journey.lens.taaHardened` = true.

**Positive verification (new — stronger than the soak):** injected a 64×64 block
of half-float NaN (0x7FFF) directly into `taaPass.history` via
`copyTextureToTexture` at the Final rest — read back 16,384 poisoned components —
then rendered on: **history NaN count 0 within the next frame(s), frame visually
intact, composer targets clean.** Pre-fix this exact injection is permanent
(mix(x, NaN, w) re-poisons every frame; `validHistory` cannot clear it).

**Soak (BUDGETS W4-B method, 128×128 random-region scans of
`composer.renderTarget1/2` for half-float NaN bit patterns):** clean at the two
heaviest states — Connect rest under a programmatic hover-storm across all three
behaviours, and the D15-density Final rest. Zero console errors across the whole
session (boot, scrubs 0→1→0, tier toggle, storm, poison test, resizes).

## Per-rest A/B verdicts (grade ON vs [g] raw, vs approved stills)

- **Mission p=0** — raw IS the untouched hero (pose/fog/params byte-exact:
  pose −2.25/2.25/10.4, fog 7/20, look = G2a identity). Grade ON = the exact
  G2a family: warm halation breathing at the rim, lifted warm blacks, grain.
  Unchanged from the approved leg. PASS.
- **Inspire 0.26** — graded adds the warm envelope + halation focused on the
  auto-active Arca column; SHEATH 0.72 tightens the columns toward the still.
  Honest gap vs `approved/inspire.png`: our plumes remain airier/whiter than the
  still's saturated amber braids, and the still's are still narrower.
- **Connect 0.49** — graded warms the chamber and blooms the ADOS knot without
  smearing the 1-px free edges (halation 0.62); blacks stay deep like the still.
  Closest match of the five. PASS.
- **Owned 0.725** — warm-lifted near-black turns the soil amber-dark exactly in
  the still's family; portraits glow warm; deep pockets stay dark. PASS.
- **Final 0.925** — gain 1.14 + halation 1.25 + warm lift moves the raw render
  decisively toward the still's luminous density; members read as soft lamps.
  Honest gap vs `approved/final.png`: the still's spore sky is far denser and
  carries broad mist bands ours doesn't have (chapter geometry, not grade).
- **Seam dips 0.436 / 0.693** — A/B shows raw as crisp/cool with hard white
  bokeh; graded is warmer, softer-highlighted, grainier — "passing through
  something", richer as predicted.
- **DOM** — zoomed checks at Connect + Owned rests (900×700, near-native):
  headings/copy/chips/nav pin-sharp; the canvas grade never touches DOM.

## Cadence

The pane never yielded a live rAF window this session (fronting was contested by
a parallel session; collector starved) — **no honest fps median, same caveat as
BASELINE §2 / W4-D.** In-burst rAF deltas at the Final rest clustered at
16.7–18.6 ms median (n=14, contaminated). The pass adds zero geometry and one
already-measured fullscreen pass (Spike A: grade ON = +1 draw, +1 tri); the new
uniforms cost nothing measurable. The standing "one visible-tab session"
follow-up now also covers the unified grade.

## What still falls short of the stills (for the polish round)

1. **Inspire plume saturation/width** — SHEATH 0.72 helps, but the still's
   braids are narrower and more amber; candidates: SHEATH → ~0.6, a slight
   spore-tone warm bias, or per-plume halation instead of frame halation.
2. **Final spore-sky density + mist bands** — the still carries a dense glowing
   sky and layered haze; needs chapter-side spores/sprites (Tier-1 headroom
   exists), not more grade gain.
3. **Final-leg halation focus is static** (nearest ring member); following the
   growth-front pulse needs `final.js` to expose a front world position.
4. **Owned deep-soil bottom third at p 0.696–0.706** (W4-C known soft spot)
   reads flatter under the T3 bell's warm lift; if polish wants more structure
   there, it is chapter content, not grade.
5. **Reduced-motion frozen grain** verified by code path only; needs one session
   with OS-level reduce-motion (and the TIER-WIRING §1 routing decision is still
   open — today reduced-motion visitors get the live page).

---

# IN-CC — Inspire one-population handoff (Hannah's conceptual-continuity revision, 2026-08-02)

**Trigger (Hannah, live ride):** the Inspire plume spores read as NEW spores appearing on
scroll, doing the same conceptual work as the hero's visible right-drift. Binding note:
ONE spore population, evolving — the drift the visitor watched during Mission must BECOME
the plumes.

**Scope:** `chapters/inspire.js` + `chapters/inspire-ambient.js` only. No new files, no
core/ or journey.js changes, mushroom-scene.js untouched (scene-state reads/writes with
verbatim restore, per the established W4-A discipline).

## Mechanism (three pieces, all pure functions of effective reveal + time)

1. **Arrival ramps.** Root cause of the pop: the T1 seam arms Inspire at ~92 deg of camera
   azimuth past Mission, where driveInspire's ArtCompute ramp (az 36–72) is already
   complete — the seam-gated fade stepped 0→1 in one frame and the whole 5,100-spore system
   eased in fully formed. The chapter now multiplies each exit's fade by its own azimuth
   ramp starting strictly AFTER the desktop arming azimuth (ArtCompute 82→116 deg, Arca
   108→140, 2RP 130→154, gill band 80→100; all saturated by az ~154, before the rest window
   at ~157.8–160). Effective reveal = fade × ramp is continuous in p, monotone along the
   orbit, and identical forward/backward (parked-state audit: max fwd/bwd deviation 0.0002).
2. **Drift→braid morph (spore vertex shader).** Below full reveal each plume particle IS a
   hero-shed member: its own under-cap origin, dropped clear of the gills, carried by the
   hero's breeze law (travel ∝ age, scatter spreading with travel, same normalized BREEZE
   vector). As the reveal rises each particle converts at its own staggered moment
   (hash-staggered smoothstep of rev) from drift to its staged gill→rim→braid path; knot
   pearls, core brightening and the core ribbons (gated smoothstep(0.5,1,rev)) condense in
   the second half. At rev = 1 every mix is exactly 1 — the staged math, i.e. the approved
   rest look, is untouched (incl. the W5 SHEATH tightening that landed in parallel).
3. **Shed conservation dim (inspire-ambient.js).** Generalized from W4-A's single ArtCompute
   corridor to 9 capsules (per exit: under-cap origin wedge gain 0.55, rise corridor gain
   0.78 with W4-A's approved radii, downwind drift envelope gain 0.52/0.40/0.40 with length
   4.8/3.2/2.6 — ArtCompute rides the hero's full carry). Strength = gain × that exit's
   effective reveal; max-combine across overlaps, total dim capped at 0.85. Same byte-exact
   color-attribute restore on retire.

## Cost

- Zero new draw calls, zero new geometry, zero new particles. Spore + ribbon vertex shaders
  gained a handful of ALU (one extra envelope + mix); attribute set unchanged.
- Shed dimmer JS loop: 4,200 particles × ≤9 capsule distances while the leg is live
  (~38k mul/adds per frame, still ~0.1–0.2 ms class; zero when retired — unchanged pattern).
- At the settled Inspire rest the shed now hands over ~50–55% of its total color-attribute
  luminance (sum 7,789 → ~3,500–4,100, oscillating with sway as the capsules ride the live
  mushroom matrix) vs W4-A's 24.5% — the population has visibly moved into the plumes.

## Verification (headless CDP harness at 1440×900, live frames; capture.py machinery)

- Fine forward scrub p 0.10→0.26 (27 samples, 0.0025 steps through ignition): rev(p)
  continuous — [0, 0.001, 0.079, 0.248, 0.466, 0.689, 0.985, 1] for ArtCompute across
  p 0.1575–0.19; zero before az 82.7 (seam fade-step fully masked). Backward scrub over the
  same targets: every parked sample byte-matches forward (max dRev 0.0002). Dense in-motion
  sampling through the Arca/2RP window (p 0.19→0.26, 137+ samples): both ramps monotone,
  no dRev > 0.30 within any dp < 0.01, in any pass.
- Stills at p 0.15/0.165/0.175/0.19/mid-Arca/mid-2RP/0.26 forward and 0.175/0.15/0.1375
  backward: the right-drift visibly reorganizes into ArtCompute's braid (curtain thins in
  the corridor exactly as the cores condense — no double-exposure, no pop-in); Arca and 2RP
  gather out of the under-rim haze as the camera reveals their sectors; reverse relaxes the
  braid back into the curtain.
- Restore: after full forward + backward + return to 0, shed color-attribute sum AND
  index-weighted checksum equal the pristine boot values exactly (7789.45663 /
  350099.30091) — byte-exact, twice.
- Zero console errors from these files across all runs (a transient COMMIT_RAMP_S import
  error observed once came from the parallel scroll-model edit mid-save, not this work).

## Notes for parallel owners

- Scroll model: under the new commit resolution (and even `?nosnap=1`), p ≈ 0.20–0.245
  cannot be PARKED — it resolves to the 0.26 rest. The Arca/2RP arrival therefore only
  plays in motion; QA that wants to freeze it must sample mid-glide (this audit did).
- The arrival ramps are desktop-orbit absolute (mission az ≈ −12 deg), like driveInspire's
  own ramps. If a responsive composition ever pushes the T1 arming azimuth past 82 deg,
  the ArtCompute ramp start should move with it (single constant, `ARR[0].a0`).
- Fades still ease (k = dt·3.2), so during a fast flight the reveal lags its azimuth target
  slightly and converges at the rest — velocity-dependent by design, never discontinuous.

---

# FD — Final declutter (Hannah's two-round composition revision, 2026-08-02)

**Trigger (Hannah, twice):** round 1 — "very cluttered... left side imbalanced, messy
sticks on the right, the main mushroom looks like a different kind"; round 2 — "the
first mushroom still looks different... messy lines that go all over the place,
ESPECIALLY ALONG THE FOREST FLOOR."

**Scope:** `chapters/final.js` / `final-world.js` / `final-ring.js` / `final-terrain.js`
/ `final-sky.js`, plus ONE surgical line in `journey.js` (the Final halation focus hint
now prefers the live `chapters.final.frontWorld()` — the API this round adds — falling
back to the static nearest-member hint; W5 polish item 3). Director keys untouched (the
scoped exception was not needed: rebalance was achieved in content). Hero files untouched.

## Root-cause diagnosis (what the floor mess actually was)

Under additive blending nothing occludes: every underground stroke — this chapter's
hyphae/cords/front/connectors, the Owned colony field (which stays armed through the
epilogue by design), and the hero's own §8 ground network lying at y≈0 across the whole
stage — rendered THROUGH the soil as countable lines lying on the floor. Dimming alone
cannot fix geometry with no occluder.

## What changed

1. **Soil occluder (the decisive fix):** an opaque fog-colored slab under the kept-side
   surface + a face sheet down the cut (1,272 tris, 1 draw, `renderOrder -10`), the
   mirror of the hero's §5 occlusion shells. The colony is now visible ONLY in the
   section the cutaway opens — the approved still's exact reading. Depth-tested additive
   fragments behind it are culled (an overdraw saving, not a cost).
2. **Hero ground network scene-state dim** (`final.js`, Connect precedent): collected
   once (`[web, myc, mossPts, pools, roots, ribbon, beads]` + the scene-level ambient
   mote/bokeh cloud), dimmed per class as amount x pull rises (lines to 10–15%, moss/bead
   points to 25–28%, glow POOLS kept at 55% — they are the new floor language; motes
   retire below 12% visibility). **Restore proven byte-exact** (snapshot at the Owned
   rest == snapshot after Final round-trip, incl. visibility flags).
3. **Roots -> pools:** member root flares cut from up to ~40 wandering forking beaded
   segments each to 1–2 short stubs; ground-merge mass moved to two soft base glow pools
   per member in the existing glow batch (reveal-gated — they kindle with their member).
4. **Terrain stroke cull:** surface 520->140 pairs (band-focused, shorter, dimmer), cut
   face drops 130->60 + strata 90->40 + overhang ticks p 0.3->0.14 (lip statement kept,
   near-camera taper added — the lip bloomed into a hot bar at the bottom-right edge),
   hyphae 850->380 (deeper, dimmer), growth front 130->72 shorter sub-surface strokes +
   44 glow carriers in the aggregate batch (boost 1: the pulse reads as travelling glow),
   connectors 2->1 per member at lower rest tones, 12 colony glow pools in the exposed
   wedge + ~30 lit cord junctions (glow, not strokes).
5. **Species unity:** (a) elevation occlusion baked against the rest camera — gills, gill
   core, upper stem lattice/fibres and the under-cap glow stack all fall toward 12% when
   the lens looks down past a member's rim plane (the two near members read as open lit
   bowls because their interiors showed through the cap; the hero's opaque shells never
   allow that); (b) the lamp-look glow stack reworked (heart halo 3.0->2.1 capR and
   0.48->0.36 tone, cavity/core gated by the same occlusion); (c) near/short members
   raised (m3 1.7->2.0, m4 1.5->1.85, m1 1.6->2.0 + m 0.45->0.55) so the rest camera sees
   them side-on; (d) individuation spreads tightened toward the hero's proportions
   (rimScale/domeH/wave-harmonic/droop ranges all narrowed); (e) density ladder raised
   where it was sketchiest — T2 (the visible frame-LEFT arc) up ~60%, T1 up ~20%, T0 up
   ~5%: ring 21,280 -> 25,876 segs, 2,338 glow pts; (f) the two schematic far-side hint
   octagons DELETED (they read as floating rings once the floor was clean) — two soft
   ground glows keep their light.
6. **Sky:** spores 3,600 -> 5,200 with the growth all in the standing broad cloud
   (fraction 0.42->0.60), a third of it spread LOW over the frame-left arc (rebalance,
   held under the copy block's dark ground); trees 48 -> 26 at roughly half tone with a
   gap behind the hero's cap ("sticks", both rounds — additive line trees can only be
   whispers; mist carries the horizon now); 2 mid-distance mist bands across the ring
   (one over the left arc) + far mist bases raised; horizon glow re-centred off the right
   frame edge + a faint left answer; 2 extra dark-pocket haze sprites under the left arc.
7. **Left imbalance** addressed via content (denser left-arc members, left mist band +
   haze + low spore cohort + colony pools biased left) — no director key change needed.

## Measured (single accumulated frame, 1440x860, Final rest p=0.925, graded)

| State | Draws | Line verts | Points | Tris |
|---|---:|---:|---:|---:|
| FD (this round) | **103** | 105,479 | 32,138 | 18,851 |
| D15 reference | 104 | 103,667 | 30,187 | 17,578 |

Delta: −1 draw net (+1 soil, +6 sprites, −1 retired mote cloud, sprite/point visibility
wash), +1.8k line verts (ring densification minus terrain cull), +1.9k points (spores),
+1.3k tris (the soil slab). In-burst rAF deltas cluster at 13.5–21.3 ms around the
16.7 ms vsync median; hidden-pane caveat as BASELINE §2. The slab additionally CULLS
under-soil additive fragments by depth test, so effective overdraw went down.

## Verified

Graded rest 0.925 and mid-reveal 0.90 at 1440x860 AND 900x700 (cache-busted loads,
screenshot-pumped fades): floor clean of countable strokes, one species, left balanced,
sky denser; undarken forward + re-darken reverse clean (0.725 -> 0.925 -> 0.725);
hero-ground dim restore byte-exact; [g] raw toggle live (look curve reports gain 1.139 /
hal 1.246 at the rest); `frontWorld()` returns live front positions and journey.js
follows it; fresh boot at p=0 renders the pristine hero; **zero console errors** across
every load and scrub of the session.

## Open notes for Hannah / next round

- The Owned portrait FACES now read clearly in the near-field section wedge (bottom-left)
  at the Final rest — the veil of hero bokeh that used to blur them is retired and the
  floor around them is clean. If they should not appear in the epilogue frame, that is an
  owned-chapter (or seam-retire) decision — outside this round's file boundary.
- Reverse pass through the soil crossing now happens against a real slab (DoubleSide, in
  family with Owned's own soil-underside lid). Verified clean in reverse scrub; one live
  ride-through of T4 in both directions is the standing confirmation wish.
- Tier-2 note: the soil slab must NEVER be cut (it is what keeps the floor legible); cut
  order for the ring stands as D15 wrote it, with the new T2 counts as the new floor.
