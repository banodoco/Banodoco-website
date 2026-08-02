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
