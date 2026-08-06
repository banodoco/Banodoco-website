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

---

## 2026-08-06 — The shed is EMPHASIZED, not replaced (Hannah)

Hannah, on the ride into Inspire: *"it feels like there's a different stream of
particles that appears … the particles that are there before kind of disappear,
and then new particles appear, and it's just a really glitchy transition … the
one that shows when you turn around, it looks like ARROWS. It looks kind of
trashy as a result, because the arrows don't look like organic particles. And
also — there should be particles coming from EVERYWHERE, but they should just be
MORE EMPHASIZED in three parts."*

Three complaints, one root: **the leg was authored as a REPLACEMENT.** The whole
shed was dimmed away and a designed structure was drawn in its place. Every fix
below is the same move — stop deleting the shed, and let the three regions be
emphases *within* it.

### Diagnosis, with the numbers that found it

All figures are the live 4,200-dot buffer at 1440×900: luminance is Rec.709 on
the colour attribute, "v30"/"v60" are dot counts above 0.30 / 0.60 luminance,
"cvAct" is dots with conversion > 0.01 read off the seat's own per-dot feed.
The sampling noise floor, from 8 repeats parked at the rest, is ±2.0% on total
light, ±2.3% on v30, ±3.0% on v60.

**1. The swap was a seam, and it was a regression.** `seams.js` armed T1 at
`d > 48 - HYS_DEG` = 40.3° from Mission, i.e. absolute camera azimuth 28.1°. But
the chapter's reveal is `sm(18,48,az) × arrOf(az,14,44)`, which starts opening at
az 14. **Arming therefore landed ten degrees inside an already-open ramp.**
Measured either side of that one crossing (p 0.115 → 0.118):

| | before gate | after gate | Δ |
|---|---|---|---|
| converted dots | 0 | 1975 | **0 → 47% of the shed, in one gate** |
| total shed luminance | 2746.2 | 2137.4 | **−22.2%** |
| luminance P50 | 0.643 | 0.502 | −22.0% |
| luminance P99 | 0.901 | 1.126 | **+25.0%** |
| v30 | 4200 | 3530 | −16.0% |
| v60 | 2475 | 1318 | **−47.4%** |

48 was *correct when it was written* — the ramps then began at az 36, exactly
where it armed, and the comment above it said so. **D18 (`c6bbbab`) pulled the
ramps in to (18,48)/(38,62)/(54,78) to make the three streams resolve, and did
not move the seam with them.** The stale comment asserting "arming can never step
on it" survived and was false in both its numbers.

**2. The disappearance was a light-budget trough, and it was double-counting.**
`organism/spores.js` already performs the entire hand-over per dot, in one line:
`f = f * (1 - cv) + pw` — a dot cedes exactly as much ambient look as it has
converted and gains exactly its own plume brightness. That is conservative by
construction. On top of it the chapter ran **three more whole-population dim
channels** (`regions`, `globalK`, `grad`), which dimmed the dots that had *not*
converted yet: they lost ambient light while gaining no plume light. Measured
across the approach, total shed luminance fell **2746 → 1920 at p 0.14, a −30%
trough**, with v30 collapsing 4200 → 2426 (−42%) before recovering. That trough
is "the particles that are there before kind of disappear".

**3. The arrows were not the dots — they were drawn line geometry.** Inventory
at the rest: **648 core-ribbon `LineSegments` at 0.527 opacity**, 840 source-
filament segments at 0.425, 360 wisp segments, 204 rim-link segments, and a
**12:1 anamorphic streak sprite** (2.1 × 0.17) lit on the merely-derived auto
exit. In the old golden these are the long pale strokes arcing over the cap and
the hard white bar at the left rim — cooler-toned than the warm dust, and the
only non-particulate forms in the frame. The dots contributed too: `PLUME_GAIN`
plus the `kn⁴` pearl cadence on the tightened core cohort put luminance P99 at
**1.45 (max 2.1) against the shed's own 0.90 ceiling**, +61%, which reads as
specular streak heads rather than dust.

**4. "Everywhere" was structurally impossible, and T is not the lever.**
`initSteer` partitions **all 4,200 dots** across the three exits (50/28/22);
measured `cvAct = 4200 / 4200` at the rest. Revealing three exits claims the
entire shed — there is no ambient remainder by construction. And the obvious
escape does not work: swept on the shipped build, T from 0.20 to 1.00 moved
cap-azimuth sector occupancy only between 7 and 10 sectors (p 0 = 10) and
luminance entropy between 1.94 and 2.14 nats (p 0 = 2.223) — i.e. **lowering T
does not give the shed its spread back**, it only merges the three lobes into
one (1 lobe at T ≤ 0.78, 3 from T ≥ 0.85, confirming D18's knee independently).
T blurs the braids; it does not restore a shed.

### The model as shipped: everywhere, emphasized in three

- **The shed never cedes.** `regions`, `globalK` and `grad` are all zero. The
  per-dot exchange in the spore system is the *only* hand-over, so brightness is
  conserved dot by dot and the surrounding shed survives the whole transition.
  Zero, not smaller: it is the only value that is exactly reversible for free.
- **The emphasis is density, not deletion.** Each plume's dots draw a rise from
  `[riseMin, riseMax]`; the **mean** sets where the plume ends (composition, chip
  clearance, dome crossing) and the **spread** sets how concentrated it reads on
  the way there. Those are separable and only the mean had been used. Every mean
  is unchanged to three decimals — no plume moves — while the spread is re-dialled:
  ArtCompute ×1.60 (deliberately diffused, so the 2,100-dot centre stops drowning
  the flanks), Arca ×0.54 and 2RP ×0.51 (concentrated). This is what replaces the
  ribbons as the thing that marks three regions.
- **The seam is derived, not chosen.** T1's threshold is now 34, so it arms at
  d 26 (az 13.8) and releases at d 18 (az 5.8) — **both edges where both factors
  of the chapter's reveal product are exactly zero**, which is the same law T2
  already states. Anything that re-keys those ramps must re-derive this number.
- **Lines are not dust.** The core ribbons are retired (`CORE_OPACITY = 0` and
  `visible = false`, so the draw call goes too) and the anamorphic streak is
  hover/selection-only. A continuous line cannot read as dust at any opacity.

### Measured after

- **Arming is invisible.** At p 0.10 / az 16.5 the statistics are *identical* to
  p 0: 2746.2 total, v30 4200, v60 2475, cvAct 0. No step at all.
- **No trough.** Minimum total shed luminance across p 0 → 0.26 is **2643.8,
  −3.7%** against the p 0 reference (was −30%). Minimum v60 **2372, −4.2%** (was
  −47%). Minimum v30 **3473, −17.3%** (was −42%). Sampled at Δp 0.0025 the dips
  are smooth ramps: worst adjacent step 7.6%, against a ±2% noise floor.
- **The three streams survive.** Density profile of the plume band (48 bins,
  y 90–470, averaged over 12 frames, three independent runs): **3 lobes at
  495 / 765 / 975 px, relative 0.39 / 1.00 / 0.24, valleys 0.21 and 0.11.**
  D18 measured 507 / 783 / 996, 0.36 / 1.00 / 0.28, valleys 0.21 and 0.21 — same
  positions within 21 px, same weights, valleys as deep or deeper.
- **Same composition, more substance.** Against the shipped build's own profile
  the new one correlates at **Pearson r 0.990–0.997** (RMS 0.024–0.040 of peak)
  over three y-bands — the shape Hannah approved is unchanged. What changed is
  level: band light **+11%**, total light **+13%**, and contrast (weakest peak /
  strongest gap) **0.604 vs 0.588**. The dim channels were never providing the
  emphasis; they were only darkening everything.
- **Ride.** Slow scrub p 0 → 0.45 → 0 at Δp 0.0025, 2,172 recorded frames: no
  reveal channel re-rose after falling, on either leg (0.0000 on all six);
  forward and backward agree to **0.001** across 203 matched positions; console
  clean, zero errors or warnings.
- **Cost.** Draw calls at the Inspire rest **55 → 53** (the ribbon `LineSegments`
  and the resting streak sprite); 42 unchanged at Mission. Frame time is
  display-locked at both ends (16.67 ms), so there is no measurable GPU delta to
  report either way.
- **References.** `capture.py --check`: mission **0.00 / 0.00**, connect
  **0.00 / 0.00**, owned **0.00 / 0.00**, final **0.18 / 0.13** (its own
  determinism noise, identical to the pre-change baseline). Only the inspire
  pair was re-shot; the other eight PNGs are byte-identical by SHA-256 before and
  after, and `manifest.json` was merged so they keep their original provenance.

### Residual / open

- **Two shallow troughs remain**, one per migrating exit: **−6.4%** total light
  as Arca converts (p 0.140–0.1475) and **−4.4%** as 2RP does (p 0.1625–0.1675).
  The mechanism is organism-side and the chapter cannot reach it: in `steer`, a
  migrant's rise draw-on gate is `env *= 1 - ss(g0, rl + 0.001, u3)` with
  `rl = rg * 1.12` and `rg = ss(0.55, 1, rev)`, so **every dot in a migrant's
  braided-rise stage renders black until that exit's reveal passes 0.55** — while
  `(1 - cv)` is already taking its ambient away. Half a migrant's cohort is in
  that stage at any instant. Fixing it properly means letting the rise draw on
  from the dot's own conversion rather than from a whole-exit threshold.
- **A true "everywhere" reserve still needs the organism.** `initSteer` claims
  100% of the dots for whatever exits are revealed, so there is no population
  that stays on pure ambient drift while the three braids resolve. The minimal
  honest change would be a claim field — `setDriver({ exits, shedShare })` — that
  reserves a fraction of the 4,200 as never-steered: they would keep `cv = 0`
  and `pw = 0`, the drift integrator would own them outright, and with the dim
  channels already at zero they would render at full shed colour. That is the
  literal reading of "particles coming from everywhere". What ships instead is
  the perceptual reading: the shed is no longer deleted anywhere, so the field
  between the emphases is continuous and lit.
- **The flanks are still starved by `W_EXIT0`** (50/28/22, read-only): 2RP reads
  at 0.24 of ArtCompute. Rise spread claws back what it can without moving any
  plume; making the three genuinely equal still needs the exit weighting opened
  up in the organism.
