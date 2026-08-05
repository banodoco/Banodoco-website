# 07 — Chapter: Inspire (P4, first production chapter)

**Objective:** the visitor discovers the three spore exits by moving around the existing mushroom — not by entering a new scene. Inspire carries the project's largest particle-flow and camera-orbit budget because it is the proof that the hero can grow into a journey without a reset.

**Owner:** 3D Dev (geometry/particles) + Motion (orbit) + Frontend (spotlights). **Reference:** `reference-images/approved/inspire.png` (note: its painted header nav showing EQUIP is overridden; label positions are indicative). **Overridden reference:** `superseded/inspire-cap-top-plumes.png` — plumes must NOT erupt from the cap top.

## Copy (locked)

- Heading: **"Inspire and empower."**
- Support: Banodoco helps people push open models beyond their expected limits through challenges, compute, and rigorous research, turning breakthrough ideas into a thriving commons.
- Copy position: **bottom**.

## Tasks

### IN-1 Rear-cap and under-cap source geometry (M)
- [ ] IN-1.1 Rear cap rim + under-cap gill sectors on the existing organism, matching the hero's material language (G2a parameters).
- [ ] IN-1.2 Three spatially distinct exit regions around the rear under-cap rim, each visibly fed by a gill sector — placement per the anatomy map (Arca Gidan Prize, ArtCompute, 2RP).

### IN-2 Spore system (L)
- [ ] IN-2.1 Authored airflow fields: spores originate **between gills**, travel laterally through gill spaces, curl around the rim, then rise into three plumes.
- [ ] IN-2.2 Multiple velocities and particle sizes per plume; some spores drop, some circle briefly, some carry upward — never a clean synthetic emitter or fountain.
- [ ] IN-2.3 Sequential reveal of the three exits during the orbit; all three visible together at rest, distinct but sharing the same gill network and airflow.
- [ ] IN-2.4 Faint travelling bioluminescent flow on the cap surface; restrained anamorphic streak **only** on the currently active release point.
- [ ] IN-2.5 Scale across tiers within the LA-7 budget table.

### IN-3 Orbit (M)
- [ ] IN-3.1 Production spline from the grey-box decision: 120–180° rear orbit, slight push-in, upward bias, no roll, no full revolution; reversible.

### IN-4 Initiative interactions (M)
- [ ] IN-4.1 Hover/focus an initiative → its plume brightens and coheres slightly; the flow traces **backward** around the rim to the under-cap gill sector of origin.
- [ ] IN-4.2 Click/Enter → compact **project spotlight**: summary, current status where relevant, primary external link. (Copy owned per `13`.)
- [ ] IN-4.3 The **2RP node** opens its contextual spotlight first (role + link to the publication); the persistent top-right 2RP control still opens the publication directly. These are different behaviours — do not merge them.
- [ ] IN-4.4 Touch: first tap = hover state, second tap = spotlight (per `12`).

### IN-5 Transition stubs (S)
- [ ] IN-5.1 Entry: continuous from the Mission handoff (MP-1). Exit: one plume becomes the visual guide backward/down under the rim toward Connect; the cap-occlusion streaming seam fires here.

## Acceptance (chapter-specific, from the master checklist)
- The three exits reveal sequentially, stay spatially distinct, and visibly originate **beneath** the cap.
- No plume behaves like a cap-top fountain.
- The orbit reads as controlled discovery, not a decorative spin.
- Hover traces a causal path back to a real gill origin.
- Inspire is unmistakably the second chapter, with no Equip anything in between.

---

## 2026-08-05 — D18: the Inspire restage (Hannah)

> "can you reorientate the inspire ones so we're at a more advanced angle, such
> that the 3 streams that are coming from the edge of the mushroom are defined
> and just above the hero text, we should rotate more around it until this is
> the case. Make it elegant, keep tweaking till you get it right. there should
> be 3 visible streams of spores, and they should be right above the text and
> it should be visible where they're coming from."

### What was actually wrong

The note reads as a camera note, and it is one, but the camera was only a third
of it. Three independent things each produced "one merged cloud" on their own,
and fixing any one alone leaves the frame unchanged:

1. **The exits were closer together than a braid is wide.** The steerer gives
   every dot `curl = (strand-1)*0.30` plus a winding wobble of ±0.20, so a braid
   is ~1.0 rad wide at the rim, and it leans every plume along the one breeze
   vector — so the three are strictly *parallel*, and rise sets a plume's length,
   never its direction. D16's gaps were 0.55 and 0.42 rad. The plumes physically
   interpenetrated. **No camera angle can separate them.**
2. **The reveal ramps never opened two of them.** The per-exit fades were keyed
   to absolute camera azimuth as `sm(36,72) / sm(76,112) / sm(104,142)`, authored
   when the rest was az 78. At az 78 that is reveal `1.00 / 0.06 / 0.00` — Arca
   and 2RP were essentially unlit *at the rest*.
3. **`T_SHIPPED = 0.30`.** Each dot's displacement onto its braid is
   `cvT = conv * T`, so at 0.30 a dot travels 30% of the way onto the designed
   path and keeps the rest of its free drift. Measured on the live 4,200-dot
   buffer, the horizontal density profile of the plume band has **exactly one
   peak** at T ≤ 0.65 — at every azimuth tried.

`T_SHIPPED` had been sitting at its code default since M3 with the note
"awaiting Hannah's ride + her chosen T". This was that ride.

### The shipped pose

| | value |
|---|---|
| `INSPIRE` | az **115°**, r **11**, y **2.0**, target **(2.633, 3.244, −0.566)**, fov **40** |
| rest key (p 0.260, hold) | pos (9.9694, 2.0000, −4.6488) · d 8.49 |
| rest-drift (p 0.312) | pos (10.6540, 2.2490, −2.3000) · tgt (2.219, 2.957, −0.842) · fov 42.22 · az 102.2 · d 8.59 |
| exit key (p 0.362) | pos (9.6610, 2.6830, 1.7150) · tgt (1.501, 2.460, −1.322) · fov 46.07 · az 79.9 · d 8.71 |
| joins Connect (p 0.410) | az 68.76 · fov 48 · d 8.79 — *Connect unchanged* |
| `PIN`, `ARRIVAL_DEAD` | unchanged |
| portrait field @ 0.260 | back 1.50, rise −0.50, truck −0.30, tgtUp 0, tgtRight 0.30, fov +13 |

Exits (`anatomy.js`) — gaps **1.15 rad**, ArtCompute frozen at 5.83:

| id | az | rise | lean | tone | knot |
|---|---|---|---|---|---|
| artcompute | 5.83 | 1.70–2.20 | 0.52 | 0.66 | **0.58** |
| arca | **6.98** (downwind) | 1.05–1.40 | 0.42 | 0.60 | 0.95 |
| 2rp | **4.68** (upwind) | 1.76–2.21 | 0.38 | 0.74 | 1.00 |

Also: `T_SHIPPED` 0.30 → **0.85**; arrival ramps → (14,44)/(34,58)/(50,74);
per-exit fades → (18,48)/(38,62)/(54,78), band (5,28).

### Tried and rejected

- **az 95 / 100 / 105** — a flanking lip sits at or behind the silhouette
  (`facing` ≤ 0.18), so you cannot see where that plume comes from. Fails (3).
- **az 120 / 125 / 130 / 140 / 150 / 160 / 175** — separation *collapses*.
  Minimum inter-plume screen gap: 115 → 79 px, 120 → 44, 125 → 35, 130 → 23,
  140 → 3, 150+ → ~1. Past the knee the drift becomes purely lateral and the
  three braids lie along one screen line, end to end. "Rotate further" is not
  monotonically better, and this is the measurement that says where to stop.
- **az 116 with the eye above the rim (the abandoned first pass)** — `facing`
  put two of three lips on the far side; sources unreadable.
- **Eye at y 1.0** — best dome-crossing figure (8% of plume mass over the cap
  vs 15% at y 2.0) and a lovely low angle, but it forces the exit leg to climb
  1.9 to meet Connect at y 2.90, on top of the azimuth turn. y 2.0 keeps all
  three lips under-rim and halves the climb.
- **Exit gaps 1.25 / 1.35 rad** — 94/97 px of separation, but `facing` falls to
  0.09 / −0.01. Buys criterion 1 by selling criterion 3.
- **T = 1.0** — three lobes become two again (the shortest plume tucks under),
  and the *furniture* that also scales with T (56 source filaments per exit,
  wisp guides, rim currents, core ribbons) goes wiry and over-drawn.
- **Leaving Arca on the rightmost plume** — its chip is 132 px of text / 161 px
  of wrapper in a 375 px frame. It overflowed by 88 px and an 8,640-point sweep
  of the portrait field found **zero** settings that fit all three chips with
  all three plumes in frame. Swapping Arca (long label) onto the downwind lip
  and 2RP (27 px) onto the upwind one fixes it and leaves the landscape
  geometry identical — the physical plumes don't move, only the labels.
- **Rotating the long way round** (hero −12 → −245 ≡ 115, so the exit continues
  in the same rotational sense and never reverses) — 233° over Δp 0.22 is
  ~1,290 °/unit p at the trapezoid peak, over the 1.2k budget, and it
  reintroduces the sparse middle D16 removed.

### Measured

- **Rotation rate** (201-sample drift-aware scrub, `?steady=1`, p 0 → 0.60):
  max azimuth **767 °/unit p** landscape (1440×900 and 1280×800), **749**
  portrait (375×812 and 430×932); max gaze-yaw **823 / 816**; max pitch
  **144 / 163**. Budget 1,200. *(Before the exit keys were re-solved these were
  1,073 and 1,334 — the stale keys were the whole overrun.)*
- **Hero passthrough** below `ARRIVAL_DEAD` is bit-exact at all four aspects.
- **Monotone handoff** p 0.26 → 0.49: fov never decreases (0 drops); subject
  distance grows 8.49 → 8.59 → 8.71 → 8.79 → 10.45. Residual: the Hermite bows
  **0.141 below its running max** at p ≈ 0.335 (1.7% of 8.5; 0.34 / 2.5% in
  portrait). The zoom-in this leg was re-keyed to remove was 38%.
- **Azimuth turns exactly once**, at the rest key, where `hold: true` forces a
  zero tangent — a full stop before the turn. After it: 115 → 103 → 81 → 68.8 →
  61.8, monotone through the Connect rest.
- **Three plumes**, 1440×900 density profile of the live dot buffer: peaks at
  x 507 / 783 / 996 (0.36 / 1.00 / 0.28 of max), valleys 0.21 and 0.21 — the
  gaps dip to 58% and 75% of their neighbouring flank. Minimum inter-plume
  screen gap 79 px; 38 px at 375×812 and 43 px at 430×932 (≈5% of frame width
  at every size). Cap-silhouette overlap 12.6%.
- **T sweep** (lobes in the density profile): 0.30 → 1, 0.50 → 1, 0.65 → 1,
  0.80 → 3, 0.85 → 3, 0.94 → 3, 1.00 → 2. Threshold ≈ 0.78.
- **Clearances**, 1440×900: copy block top y 634; plume mass ends y 547; chips
  at y 287–415, no chip-to-chip collision, all clear the copy. 375×812: plume
  union x 13–354 in frame, chips 50–356, copy top 484, lowest chip 394.
- **No self-ignition**: sampling all three effective reveals across p 0 → 0.42,
  no channel rises after it has fallen. All three saturate by p 0.22 and hold
  through the rest and the drift; the only thing that fades them is the seam's
  own `out` retire from p 0.355.
- **Scrub** forward and backward over Mission → Inspire → Connect → Owned: no
  step > 0.02 in p, exact return to p 0 / `mission`. Console clean.
- **References**: a full `capture.py --check` on the reworked tree reproduced
  mission **0.00 / 0.00**, connect **0.00 / 0.00**, owned **0.00 / 0.00** and
  final **0.02 / 0.01** MAE. Only the inspire pair was re-shot (it drifted
  14.86 / 11.87 by design); `manifest.json` was merged so the other four poses
  keep their original entries.

### Residual / open

- The centre braid carries **50%** of the dots (`W_EXIT0` in `organism/spores.js`,
  read-only), so the flanks read at ~0.3 of its density however they are lit.
  ArtCompute's `knot` is damped to 0.58 to claw some of that back. Making the
  three equal would need the exit weighting opened up in the organism.
- The copy block stays `pos-bottom`. It did not need to move: the plume union
  centres at x ≈ 720 against a copy centred at 720.
- Raising `T` pushes against the older "the stream transforms into a different
  thing when I rotate around" note that `T` was introduced to restrain. It is
  the number in this restage most likely to want Hannah's own eye; `?t=` still
  rides it live, and below ~0.78 the three streams collapse back into one.
