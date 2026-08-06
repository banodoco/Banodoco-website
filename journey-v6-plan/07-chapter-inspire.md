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

---

## 2026-08-06 (later) — Hannah's third report: it is not identity, it is extinction

Hannah reported the spore discontinuity a **third** time, now across **two**
boundaries (Mission → Inspire, and Inspire → Connect, "especially jarring").
This pass reproduced both on the current tree (HEAD `3868d09`, clean) and
measured them before touching anything. No scene code was changed — the
mechanism is organism-side and the chapter genuinely cannot reach it. See
"What is needed" below.

### Method

`?capture=` freeze mode + `journey.scrollTo(p)` makes the whole scene a **pure
function of p** (`_frozenT` sets `dt = 0`). Verified: five round-trips to
p = 0 and back to p = 0.16 produced **bit-identical** position buffers
(max per-dot difference 0.000, 0 dots differing) and identical luminance
(2914 every time). Every number below is therefore a property of p, not of
frame order or scroll history. The live unfrozen ride was then re-measured and
agrees (see "Live confirmation").

### 1. Reproduction

| Symptom | Reproduces? |
|---|---|
| Mission → Inspire: "they become different spores… they jump in awkwardly" | **Yes** |
| Inspire → Connect: "they switch again to different spores, really rapidly" | **Yes, and it is the worse of the two** |
| "weird arrows inside of them" | **Partly** — see §4. The forms retired at 7963d0b stay retired; other elongated forms remain. |

### 2. Are they different particles? No. Measured.

**One population, one object, continuous identity.** A full scene-graph
inventory of every drawn object at p 0.26, 0.37 and 0.385 finds exactly **one**
spore-drawing object in the shed volume — `Points`, **4,200 vertices, at every
p**. There is no second particle object in that volume to swap with, nothing is
hidden or shown at either boundary, and nothing is re-seeded. Index-tracked
against the p = 0 hero buffer, dot *i* is the same dot throughout:

| p | 0.10 | 0.12 | 0.14 | 0.16 | 0.18 | 0.26 | 0.385 |
|---|---|---|---|---|---|---|---|
| dots drawn | 4200 | 4200 | 4200 | 4200 | 4200 | 4200 | 4200 |
| dots displaced > 0.05 from their own hero position | 0 | 1941 | 3209 | 3948 | 4199 | 4199 | — |
| p95 displacement from hero | 0 | 2.64 | 3.42 | 3.81 | 4.09 | 4.09 | — |

Both curves are **monotone**. No count step, no re-seed, no population swap at
either boundary. **The answer to Hannah's question is: the same particles.**

### 3. What she is actually seeing: converted dots rendering black

The fault is not identity, it is **conservation of light**. In `steer()`
(`organism/spores.js`) a migrant dot's ambient shed colour is surrendered as it
converts —

```js
conv = ss(0, 0.30, rev - stag[i] * 0.25)   // complete by rev ~0.30–0.55
// dim(): f = f * (1 - cv) + pw            // cv = conv * T, T = 0.85
```

— but its plume light is not granted until the **migrant rise draw-on gate**
opens, which does not begin until rev **0.55**:

```js
const rl = rg * 1.12;                      // rg = ss(0.55, 1, rev) for e > 0
const g0 = rl - 0.10 > 0 ? rl - 0.10 : 0;
env *= 1 - ss(g0, rl + 0.001, u3);         // rg = 0  =>  env = 0
```

Between those two thresholds a migrant dot has given up **85%** of its ambient
light and been granted **none** of its plume light. It is drawn black.

The reason this hits so much of the field is that a dot's **stage** is a
free-running per-dot clock (`t = tNow / perA[i] + ph0A[i]`, period 7–15.5 s),
completely independent of the reveal. The draw-on gate assumed dots enter the
rise only after the walk front arrives; in fact **~60% of a migrant cohort is
in the braided-rise stage at any instant, at any reveal**. So the gate
extinguishes them wherever they happen to be.

**Per-dot proof.** Counting dots that are both displaced > 0.5 from hero
(converted) and below 25% of their own p = 0 luminance (dark):

| p | what is crossing | dark **and** converted | of those, above y = 3.0 | median y |
|---|---|---|---|---|
| 0.26 (Inspire rest) | nothing — baseline | **240** | 176 | 3.34 |
| 0.147 | Arca, eff = 0.58 | **754** | 699 | 3.84 |
| 0.167 | 2RP, eff = 0.535 | **676** | 509 | 3.47 |
| **0.385 (→ Connect)** | **both migrants together, eff = 0.50** | **1193** | **1027** | 3.74 |

Dark dots are *precisely* the converted ones (754 of 760; 1193 of 1197) and
they sit high in the braided rise, exactly as predicted. At the Connect
boundary **28% of the whole shed is extinguished in mid-air**, 5.0× the
resting baseline.

A population that goes dark and comes back on **is** perceived as a different
population. That is the whole of Hannah's report, both halves.

### 4. Total-light traces (frozen, Δp = 0.002 / 0.005)

Mission → Inspire — **two** troughs, one per migrating exit, each centred where
that exit's reveal ≈ 0.55:

```
p     0.129  0.135  0.141  0.147  0.155  0.161  0.167  0.175  0.183
eff1  0.001  0.096  0.310  0.580  0.901  1.000  1.000  1.000  1.000
eff2  0      0      0      0      0.052  0.255  0.535  0.878  1.000
lum   3022   3006   2730   2621   3023   2864   2722   3024   3029
```
Arca dip **3022 → 2621 = −13.3%**; 2RP dip **3023 → 2722 = −10.0%**.
The resident exit (eff0) shows **no** dip — `rg = 1` makes the gate inert for
it, which is itself the proof of the mechanism.

Inspire → Connect — **one trough, twice as deep**, because the retire envelope
`out` pulls all three exits down *simultaneously*, so both migrant cohorts
(50% of the shed) cross the dead zone together:

```
p     0.365  0.370  0.375  0.380  0.385  0.390  0.395  0.400  0.410
eff   0.926  0.844  0.741  0.624  0.500  0.376  0.259  0.156  0.020
lum   3029   2973   2637   2308   2264   2274   2492   2731   2831
hot60 2879   2834   2480   2150   2091   1962   2094   2453   2704
```
**3029 → 2264 = −25.3%** total light; dots above 0.60 luminance
**2879 → 1962 = −31.9%**. Recovery to the hero baseline (2831) by p 0.410.
This is why she singles this boundary out.

**Live confirmation** (unfrozen, `?nointro=1&nosnap=1`, same ride): 3050 at
p 0.365 → **2263** at p 0.385 → 2831 at p 0.410, i.e. **−25.8%**. The frozen
and live measurements agree to 0.5%, so this is not a freeze artefact.

### 5. Why 7963d0b did not fix it

That commit was right about what it looked at. It measured across the **arming
gate** (p 0.115 → 0.14) and fixed a genuine whole-population double-dim there,
−30% → −3.7%. Re-measured now, that fix is **holding**: p 0.10 → 0.14 shows
lum 2831 → 2794 (−1.3%) with the converted-dot count rising smoothly 0 → 3209,
no step at the arm. Both extinction troughs sit **downstream** of that window
(0.147, 0.167) and the Connect one (0.385) was never in any measured window —
the commit message says as much. The residual note at the end of the previous
section named this exact mechanism and named the right fix; what it missed is
that **the same gate fires again, twice as hard, at the retire.**

### 6. The arrows

The forms retired at 7963d0b **stay retired**, confirmed in the live inventory:
`CORE_OPACITY = 0.0` (the 648-segment ribbons draw nothing) and no `Sprite` is
drawn at the Inspire rest at all (the 12:1 anamorphic streaks are
hover/selection-only, `visible = false`).

Ruled out as the source of a *per-particle* arrow: the spore sprite is an
isotropic 64px radial gradient (`makeGlowTexture`), and the spore shader has no
motion-stretch, streak or tail term — `gl_PointSize` is a scalar, so a spore
cannot be drawn elongated or directional.

What remains elongated in the shed volume at the Inspire rest is **chapter
furniture, all `LineSegments`** — 1,404 drawn segments threading the plume:

| form | objects | segments | effective opacity (× T = 0.85) |
|---|---|---|---|
| wisp guides (4 continuous 30-segment curves per exit) | 3 | 360 | 0.109 |
| source filaments under the cap | 3 | 840 | **0.361** |
| rim delta links | 2 | 204 | 0.087 |

In a 3× crop of the `inspire` golden these read as smooth continuous strokes
arcing up through the dust — the same substance-mismatch class as the retired
ribbons, at lower opacity. That is the best-evidenced candidate for what she is
still calling arrows.

**Honest gap:** a second hypothesis — that the rim-walk front clamp
(`we = w < wFront ? w : wFront`) piles migrating dots onto a single azimuth and
draws a hard-edged dart sweeping around the rim — was tested with a cap-local
azimuth histogram and the test was **underpowered** (the rim band caught only
15–38 dots, peak/mean ~15–24 at every p including the rest, so it discriminates
nothing). It is neither confirmed nor excluded and should be retested with a
correct rim band before anyone acts on it.

### 7. What is needed (organism-side; `organism/*` is read-only)

There is **no chapter-side fix**, and this was checked rather than assumed:

- The chapter's only per-exit lever is the scalar `eff[i]`. Both `conv` (which
  takes the ambient away) and `rg` (which grants the plume light) are pure
  internal functions of **that same scalar**, with `conv` completing at
  0.30–0.55 and `rg` only starting at 0.55. They cannot be separated from
  outside, and `eff` must pass through the dead zone continuously.
- The three dim channels can only ever **reduce** light
  (`f = 1 - max(g, dimV)`, then `f = f * (1 - cv) + pw`). There is no channel
  that adds light back. They are already at zero.
- `transform` scales `cv` and `env` together, so lowering it shallows the
  trough — but T = 0.85 is Hannah's dialed value and below ~0.78 the three
  streams collapse into one (see the `T_SHIPPED` note above).

The minimal change, in `steer()`, is a **conservation floor**: the draw-on gate
must never remove more light than the dot has already ceded.

```js
const rl = rg * 1.12;
const g0 = rl - 0.10 > 0 ? rl - 0.10 : 0;
const drawOn = 1 - ss(g0, rl + 0.001, u3);
env *= drawOn + (1 - drawOn) * cvT;   // a dot keeps at least the share it gave up
```

At rev = 1 the gate is already inert, so this is a **no-op at both the Inspire
rest and p = 0** — the `mission` and `inspire` goldens are untouched by
construction. It is pure in (eff, time, T), scrub-safe, reversible, and does
not touch restore discipline. The alternative — keying the rise draw-on to
`mig` (which completes at 0.55, in step with conversion) instead of to `rg`
(which starts at 0.55) — is equally small and arguably truer to the intent.

**Deliberately not done as a substitute:** staggering the retire envelope so
the two migrants cross the dead zone separately would halve the Connect trough
(−25% → roughly −13%), but it leaves the mechanism intact, still breaks
Hannah's one-population rule, and would move the Connect arrival timing
(4146288). A smaller violation is still a violation.

### Gates (tree as found — no scene code changed)

- `python3 tools/capture.py --check`: **PASS**. mission **0.00 / 0.00**,
  inspire 0.00 / 0.00, connect 0.00 / 0.00, owned 0.00 / 0.00, final
  0.18 / 0.13 (its own determinism noise). Worst MAE 0.18/255 against
  warn > 0.50. `mission` is byte-identical.
- Console clean over a full ride: two expected `[journey-lens]` /
  `[journey-v6]` info lines per load, **zero** warnings or errors.
- Determinism: 5/5 bit-identical buffer repeats at p 0.16 via p = 0 round-trip.
- Drawn objects: 35 at the Inspire rest, 40 at the Connect approach; unchanged,
  since nothing was edited. Frame time was **not** measured — the review pane
  ran backgrounded and rAF was throttled to ~2 Hz, which makes any timing
  number from this session meaningless. No code changed, so before/after is
  identical by construction.

---

## 2026-08-06 (later still) — the conservation floor, applied

The read-only hold on `organism/*` was lifted for this fix, with the reasoning
recorded here because it is the useful part: **that rule exists to stop
CHAPTERS reaching in and writing the organism's buffers** — the driver/seat
architecture of `15-merge-and-architecture.md` §3. It was never meant to freeze
the organism's own internal light accounting against a genuine defect. A dot
surrendering ambient light it is never granted back is a bug in the module that
owns that accounting, so `spores.js` **is** the correct home for the fix;
patching it chapter-side would have been the actual architecture violation.

### What changed

Two functional lines in `organism/spores.js` `steer()`, plus the wisp colour
ramp in this chapter. Nothing else:

```js
const drawOn = 1 - ss(g0, rl + 0.001, u3);
env *= drawOn + (1 - drawOn) * cvT;      // was: env *= 1 - ss(g0, rl + 0.001, u3)
```

### The no-op claim, proved rather than asserted

At rev 1 (and for the resident exit at every rev) `rg = 1`, so `rl = 1.12`,
`g0 = 1.02`, and `u3 <= 1` makes `ss()` clamp to **exactly** 0. `drawOn` is
exactly 1 and the expression collapses to `env *= 1`. Two independent
confirmations:

- `capture.py --check` **before** the wisp change: mission 0.00/0.00,
  **inspire 0.00/0.00**, connect 0.00/0.00, owned 0.00/0.00. The inspire
  golden is the one that would have moved had the term not been identity at
  reveal 1; it did not move by a single quantisation step.
- In the like-for-like p-sweep below, every row where a reveal is 0 or 1 reads
  **+0.0%**: p 0.125–0.133, 0.175–0.185, 0.330–0.365 and 0.405–0.465 are
  identical to the digit, before and after.

Both traces were re-measured at the same 1440x900 headless viewport through
CDP. The first pass compared a 1440x900 run against a browser-pane run at a
different aspect, which shifts the camera azimuth and therefore the reveals —
a confound; the numbers below are the corrected apples-to-apples comparison,
which is why the "before" figures differ slightly from the section above.

### After numbers

| | before | after |
|---|---|---|
| Mission → Inspire trough (total shed light) | **−13.5%** | **−4.0%** |
| … dots above 0.60 luminance | −16.8% | −8.3% |
| Inspire → Connect trough | **−25.3%** | **−11.7%** |
| … dots above 0.60 luminance | −31.9% | −17.7% |

Dark-and-converted dots — the single best indicator, since these are the dots
that had ceded their ambient and been given nothing back:

| p | before | after | resting baseline |
|---|---|---|---|
| 0.26 (Inspire rest) | 240 | **240** | 240 |
| 0.147 (Arca) | 711 | **193** | 240 |
| 0.167 (2RP) | 676 | **243** | 240 |
| **0.385 (→ Connect)** | **1193** | **195** | 240 |

The excess cohort is **gone**: every transition point now sits at or below the
resting baseline. At the new residual trough (p 0.395) there are **18** such
dots, and at p 0.400 there are **zero**. The rest frame is untouched at 240.

### Honest assessment against "no perceptible dip"

**Mission → Inspire: achieved.** −4.0% total light is below the threshold at
which a global luminance change on a sparse particle field is noticeable during
motion, and the largest single-step change on a slow scrub is 2.9%.

**Inspire → Connect: improved, not eliminated.** −11.7% remains. But its
*character* has changed, which is the part that matters for Hannah's report: it
is no longer a cohort blinking out and back (1193 dots → 195), it is a gentle
sag in total light while half the population is mid-exchange between its
ambient look and its plume look. Dots in the 25–60% luminance band stay flat at
~230–325 right across the boundary, comparable to the rest state's 309 — i.e.
nothing goes dark, things merely pass through dimmer. That is lighting on one
population, which is exactly what her rule permits.

The residual is the arithmetic of the exchange itself: a dot's contribution is
`(1 - conv*T)*ambient + PLUME_GAIN*env*conv`, and `env` is shaped by the
plume's own envelope (`eu` at the bottom of the rise, the 0.62–1 fade at the
top). Dots at either end of that envelope give up more ambient than their plume
returns. At full conversion this nets positive (rest = 3029 vs hero 2831), but
mid-transition it sags. Flattening it completely means reshaping the plume's
brightness envelope, which would change the approved Inspire rest frame. Not
done, and not recommended without Hannah looking at it.

### The arrows — found and retired

The 1,404 LineSegments were the right suspects, and the wisps specifically. At
2.6x exposure on the inspire golden, **twelve** perfectly smooth continuous
curves (4 wisps x 3 exits) climb the full height of the shed, through and past
the dust — the most conspicuous thing in the frame and the only
continuous-line form left in open sky since the core ribbons went.

They survived to the top because of a floor: the ramp faded to 0.05 and then
added `+ 0.1`, so the strand bottomed out at `heat(0.126)` — and `heat(0)` is
not black either, it is `C_DARK` `0x421c05`. Under additive blending against an
empty sky that floor is plainly visible.

Fixed by fading the wisp to **literal black** (`multiplyScalar`, not a walk
down the heat ramp), completing at `t = 0.70` — past every exit's rim walk and
curl, before any of them starts to rise. The delta story the wisps exist to
tell (born between the gills, out to the margin, walking the rim to the release
sector) is untouched and still draws on with the live current; what is gone is
the stroke crossing open sky. A **static** fade baked into the vertex colours,
so it is not a fade-out over open view and reverse scrubs still mirror.

Verified on screen: at the same 2.6x exposure every one of the twelve curves is
gone and the dust is unchanged — same particles, same brightness, same
distribution.

The rim-walk pile-up hypothesis from the previous section **remains open**. Its
test was underpowered and re-testing it was not needed once the wisps were
identified; it is recorded, not resolved.

### Gates

- **Reverse mirrors exactly.** Forward vs reverse over the full ride
  (p 0 → 1 → 0, dp = 0.005, 201 points): **max |lum difference| = 0**,
  **max |hot60 difference| = 0**. Also 0 at dp = 0.0025 over both boundaries
  (161 points) and at dp = 0.02 fast scrub (21 points), and max |azimuth
  difference| 0.000 deg. Guaranteed by construction — the fix is pure in
  (eff, time, T) with no state — and confirmed by measurement.
- **Slow and fast scroll.** Max single-step luminance change 2.9% at
  dp = 0.0025, 5.0% at dp = 0.02, 4.5% over the full ride. No step, no flash.
- **No self-ignition.** The floor is scaled by `cvT`, which is ~0 wherever
  `conv` is ~0, so at the arming gate the expression is unchanged — arming
  stays invisible and the derived 34-deg threshold keeps its meaning. The wisp
  change is a static spatial fade, not a temporal one.
- **Console clean**, zero errors or warnings over a full ride; **0 non-finite
  values** in the position and colour buffers across 402 sampled frames.
- **`capture.py --check` PASS.** mission **0.00 / 0.00 — byte-identical on
  disk** (the file is not in the changed set), connect 0.00 / 0.00, owned
  0.00 / 0.00, final 0.18 / 0.13 (unchanged determinism noise).
- **References.** Only the `inspire` pair legitimately moved, and only because
  of the wisp retirement; both sizes re-shot **in this commit** via
  `python3 tools/capture.py --pose inspire`, `manifest.json` updated. The other
  eight PNGs are untouched.
- **No regressions.** The diff is two functional lines in `spores.js` plus the
  wisp colour ramp — verified by reading the diff, not assumed:
  - *Three legible Inspire streams (c6bbbab)* — the ARR ramps and the reveal
    drive are untouched; the streams resolve exactly as approved.
  - *Final particle match (836d373)* — `final` golden unchanged at its own
    noise floor, and the seat is quiescent past p 0.415 (`eff` = 0), so
    `steer()` does not run during Final at all.
  - *Connect arrival timing (4146288)* — nothing in `chapters/connect/` was
    touched, and no timing window was edited: `out`, `endOf('inspire')` and the
    retire envelope are exactly as they were. This is why the staggered-retire
    alternative was rejected in the previous section — it would have moved
    precisely this. `connect` golden 0.00 / 0.00.
- Frame time deliberately not reported: the only pane available was
  backgrounded and rAF-throttled, and a manufactured figure would be worse than
  none.

---

## 2026-08-06 (D19) — the cap over the copy: a re-aim, not a re-pose

Hannah, looking at the Inspire rest: *"the cap of the mushroom should be just
above the text ... see the space between the Inspire text and the top: the head
of the mushroom should be in the middle of that space vertically. And
horizontally it should be aligned with the text. Right now it's a little bit
off to the right, and it's too far down."*

Her read was exact. Measured at 1440x900, the copy block (`pos-bottom`, so its
centre **is** the viewport centre — confirmed from the live rect, not from the
CSS) has its top edge at y 608.5 and its centre at x 720. The midpoint of the
gap above it is therefore y 304.2. The cap silhouette's centre sat at
**(815.7, 474.0)**: **+95.7 px right, +169.8 px low**.

"Cap centre" here means the centre of the projected bounding box of the cap
surface — 4,680 samples of `capTopPt` and `capUnderPt` over a 180 x 13 grid,
through the live mushroom matrix and the live camera. It is reproducible and it
is what a viewer calls the head.

### The pose

```js
export const INSPIRE = { az: 115 * DEG, r: 11, y: 2, target: V(2.3349, 2.0903, -1.1016), fov: 40 };
```

**Only `target` changed.** `az`, `r`, `y` and `fov` are the shipped values to
the digit — the eye does not move, it only looks somewhere else. The target is
a solve, not a nudge: a 2x2 Newton on the gaze's (view-right, world-up)
offsets against the measured cap-centre error, converged in 12 iterations.

That choice is the whole point of this entry, because it is what makes the
change cheap in the one direction that was dangerous:

> **The reveal drive and the arming gate are functions of camera AZIMUTH
> alone.** `index.js camAzDeg()` reads `position.x` and `position.z`. Holding
> `az` — and `r`, the only other input to those two — leaves `az(p)` unchanged
> over the entire leg, so the `ARR` ramps, the `drive()` bounds and the 34-deg
> arming threshold see exactly the run they were keyed to. The particle
> continuity closed in `b2c9584` cannot re-open, because nothing it depends on
> has been touched.

That is not an argument, it is measured — see the trough table below.

### What was rejected, and why

Lifting the cap 170 px costs 7.5 deg of pitch. Three ways to spend it were
measured on the real projection, not reasoned about:

| approach | horizon | ground band mean lum | braid centroid sep | ArtCompute light lost off top | Connect join |
|---|---|---|---|---|---|
| shipped (cap at 474) | 633 | 21.1 | 214 px | 0% | — |
| **re-aim (shipped eye, this pose)** | **463** | **24.6** | **206 px** | **2.8%** | **intact** |
| widen (fov 48, r 11) | — | — | 164 px | — | scale 0.2668 vs Connect 0.2556 — leg becomes a hold |
| dolly back (fov 45, r 12.5) | — | — | 151 px | — | **push-IN**, scale 0.2437 < 0.2556 |
| drop the eye (y 0.4, fov 36) | 639 | **29.6** | 213 px | 11% | intact |

The dolly-back row is the one that matters most: Connect's first key is settled
(`f9e8317`) at subject distance 8.79 / fov 48, and the framing scale it implies
is `1/(d·tan(fov/2))` = 0.2556. Any Inspire rest wider than that turns the exit
leg from a widening into the re-approach the 2026-08-04 re-key removed.

The eye-drop row is the interesting failure. On paper it is the best answer —
it keeps the horizon *lower* than the shipped frame (639 vs 633) while hitting
the composition. On screen it is the worst: **near ground is bright ground**,
and it lays a lit band straight through the headline. Measured mean luminance
of the lower band (rows 600–900, x outside the copy column): shipped 21.1,
eye-drop **29.6**, the re-aim 24.6. The horizon's screen position is simply the
wrong proxy for "how much ground is in the frame"; luminance is the right one.
Recorded because it cost an hour and would cost it again.

### Composition, measured

| viewport | copy top | gap midpoint | cap centre | dx | dy |
|---|---|---|---|---|---|
| 1440x900 | 608.5 | (720.0, 304.2) | (720.0, 304.3) | **+0.0** | **+0.1** |
| 1280x800 | 522.0 | (640.0, 261.0) | (640.0, 270.5) | **+0.0** | **+9.5** |
| 375x812 (portrait) | 458.2 | (187.5, 229.1) | (187.1, 252.2) | **-0.4** | **+23.1** |
| 430x932 (portrait) | 628.3 | (215.0, 314.1) | (214.5, 289.4) | **-0.5** | **-24.7** |

**Tolerance: ±10 px horizontal, ±25 px vertical.** The horizontal axis can be
held exactly and is, at every size, because `pos-bottom` centres the copy on
the viewport centre and one gaze yaw satisfies all of them at once — so the
tolerance there is really only the solver's own convergence, and 10 px is
generous. The vertical axis cannot: the gap's midpoint is **not** a fixed
fraction of the frame, because the copy block's height in the frame depends on
how its prose wraps. Its top sits at 0.676 of the frame at 1440x900 and 0.653
at 1280x800; in portrait the spread is much wider, 0.564 at 375x812 against
0.674 at 430x932. One camera cannot hit two different fractions. 25 px is ~2.8%
of a 900-tall frame and roughly a third of the cap's own height — below the
threshold at which the cap stops reading as "centred in that space", which is
the actual requirement.

Landscape is fitted to 1440x900, the primary review size, leaving 1280x800 at
+9.5. Portrait is **balanced** rather than fitted (`portrait.js`, key p 0.260,
`tgtUp` 0 -> **-1.378**, `tgtRight` 0.30 -> **0.258**): fitting 375x812 exactly
put 430x932 at -44.8, so the value splits the residual to ±23.8 and takes the
smallest worst case a single pose allows.

### The exit keys had to move too

Only the rest's gaze moved, but a keyed spline does not care why an endpoint
moved. Leaving the two exit keys on their old targets would have put an 0.87-
high **upward flick** into the first 0.05 of the exit — the rest now aims at
y 2.09 and the old drift key aimed at 2.957. Both are re-derived from the rule
that generated them, read back off the shipped numbers rather than guessed:

```
s        = smoothstep((p - 0.26) / 0.15)      0 at the rest, 1 at Connect's first key (p 0.410)
tgt      = lerp(INSPIRE.target, connectKey1.target, s)
az/y/fov = lerp(rest, connectKey1, s)         UNCHANGED — the rest's az/y/fov are unchanged
r        = solved from the aimed target so camera-to-subject DISTANCE grows monotonically
```

Distance ladder rebased: **8.42 -> 8.55 -> 8.69 -> 8.79**, against the shipped
8.49 -> 8.59 -> 8.71 -> 8.79. It starts 0.07 *shorter*, so the widening into
Connect is slightly longer than it was, never shorter. `az`, `y` and `fov` at
both keys come out at the shipped values to the digit (102.18 / 2.2495 / 42.22
and 79.94 / 2.6825 / 46.07), which is the arithmetic confirming the decode.

### Gates

**Boundary troughs — identical, not merely no worse.** Same instrument, same
201-sample sweeps, tree stashed and un-stashed between runs:

| | before | after |
|---|---|---|
| Mission → Inspire trough (total shed light) | −0.19% | **−0.19%** |
| … dots above 0.60 luminance | −0.45% | **−0.45%** |
| Inspire → Connect trough | −8.72% | **−8.72%** |
| … dots above 0.60 luminance | −16.95% | **−16.95%** |

(These are this session's own reference — minimum against the straight line
between the window endpoints — not the same statistic as the 2026-08-06
−4.0% / −11.7% pair, which used a different reference. The point is the
before/after column, measured like for like.)

Why they are identical, confirmed rather than assumed: **max |azimuth
before−after| over p 0..0.52 is 0.0427 deg**, and that residual is entirely the
Hermite interpolating between the re-solved radii *between* keys — at every key
and at the rest it is exactly 0. Max |total luminance difference| across the
whole ride is 0.053 out of ~2,900 (0.002%), and the hot60 count differs by
**0 dots at every one of the 105 samples**.

- **Three streams still read.** Plume-axis minimum pair separation 196 -> 199.5
  px (it went *up*: the new gaze changes the projection slightly). Luminance-
  weighted braid centroid separation 214 -> 206 px. Light leaving the frame:
  ArtCompute 2.8%, Arca 0.0%, 2RP 0.2%. All three release lips still in frame
  with facing **1.00 / 0.21 / 0.19 — unchanged to the digit**, which is free:
  facing depends only on where the eye is, and the eye did not move. Checked on
  the pixels too, at 2.6x exposure against the old golden: same lobes, same
  density, same sources. Column-luminance profiles at matched heights above the
  cap top (40/80/120/160 px) give the same peak counts and the same valley
  depths. What is gone is the ~85 px of sky above the shed that used to sit at
  offsets 200–240; that band is now off the top edge.
- **No self-ignition.** All four reveal channels are exactly 1 at the rest, and
  no channel rises after it has fallen at any point in p 0..0.52. Forward vs
  reverse over the full ride, 201 samples: **max |luminance difference| = 0**.
- **Rate audit.** Peak rotation rate across Mission→Inspire→Connect, 201-sample
  drift-aware scrub: **765.4 deg per unit p** landscape (818.7 before — the
  reframe made it *slower*), 761.0 with the portrait field, 684.1 at 375x812.
  All well under the ~1.2k ceiling. **Max roll 0.00000 deg** in all three.
- **One continuous arc.** `arrival()`, `PIN`, `ARRIVAL_DEAD` and the trapezoid
  eases are untouched; only the bezier's endpoint moved. The cap tracks
  smoothly across the whole gesture — (1025, 350) at p 0 to (720, 304) at the
  rest, with no jump at the p 0.26 seam (the rate peak sits at p 0.221, inside
  the swing). p 0.00 and p 0.04 are identical: the dead-band passthrough holds.
- **Connect join.** Perceptual widening measured as the cap's projected width
  over p 0.26..0.49: 541.2 -> 491.0 px (9.3%), against 544.8 -> 491.0 (9.9%)
  before. Both bow the same way — the Hermite residual already documented on
  2026-08-04 — and the new keys bow **less**: largest single re-approach step
  3.2 px before, **2.0 px** after.
- **Console clean** over a full ride 0 -> 1 -> 0: the two expected
  `[journey-lens]` / `[journey-v6]` info lines, **zero** warnings or errors.
- **Labels.** All three chips still land on their braids and clear the copy at
  1440x900: ArtCompute x 547..677 y 110..133, Arca Gidan Prize x 330..498
  y 183..206, 2RP x 894..956 y 224..247. No chip-to-chip collision, 52 px of
  clearance under the nav row, and each chip holds the same offset from its
  braid's centroid it had before (the whole composition moved together).
- **`capture.py --check` PASS.** `mission` **0.00 / 0.00 — byte-identical, not
  in the changed set on disk**, connect 0.00 / 0.00, owned 0.00 / 0.00, final
  0.18 / 0.13 (its own unchanged determinism noise). Only the `inspire` pair
  moved — legitimately, and it is re-shot in this commit via
  `python3 tools/capture.py --pose inspire` with `manifest.json` updated.

### What was traded

One thing, and it is the ground. Aiming 7.5 deg lower brings more of the root
plane into the bottom of the frame: the horizon runs from 633 to 463, and the
lower band's mean luminance from 21.1 to 24.6 (+17%). Inspire's frame is a sky
frame and Connect's is the ground panorama, so this spends a little of
Connect's arrival. It is the **smallest** of the three available trades — the
alternatives cost either the Connect join outright or 40% more ground light —
but it is a real cost and Hannah should see it rather than read about it. If
she wants it back, the lever is the copy block: `bottom: 8vh` is what sets the
gap, and raising the copy raises the midpoint the cap is pinned to.

---

## 2026-08-06 (D20) — Inspire→Connect: one continuous rotation

Hannah, on the travel out of the Inspire rest: *"the camera motion from the
inspire section to the connect one doesn't feel smooth — it feels like a
rotate and then jump back, but it should be one smooth rotation."*

### Read this before you measure anything

**Gaze yaw and gaze pitch were both already monotone across the whole leg —
zero derivative sign flips, in both aspects — and the subject still reversed
on screen.** Every angle-only audit this project has run would have passed
this leg, and the previous three did. If you trace `dyaw`/`dpitch`, see them
clean, and conclude there is no bug, you have reproduced the exact mistake
that let this ship. The reversal is not in either channel; it is in the
composition of the two.

The quantity that matters is where the subject sits **across the frame**:

```
d = gazeYaw - camAz + 180        horizontal angle of the mushroom off the frame axis
```

Both terms fall through this leg — the orbit azimuth 115° → 68.8°, the gaze
yaw −65° → −124° — so each looks like a clean monotone sweep on its own. But
over **p 0.372–0.394 they fell at the same rate**, and their difference
stopped: d froze at −11.44°, advancing **0.7 °/unit-p** against 138 just
before it and 173 just after. A frozen angle inside a still-opening fov is a
subject sliding *back toward centre*. The mushroom stopped, drifted right and
sank, and then swept left again — Hannah's "rotate and then jump back".

This is the same fault `2a27db7` cured on the Connect→Owned leg (the aim
overswinging its destination and unwinding), expressed in the one coordinate
that hides it from a per-channel trace: the aim had overswung **relative to
the orbit**, not relative to the world.

### Measured before (261-sample drift-aware scrub, p 0.26–0.52, `?steady=1`, 1440x900)

Screen figures are the projected cap-rim silhouette's bbox centre, and the
stipe base as an independent check.

| | before |
|---|---|
| subject screen-x | 718.1 → **493.1 (p 0.376)** → **494.0 (p 0.390)** → 320.8 |
| … velocity | −2982 px/p (p 0.334) → **+94 RIGHTWARD (p 0.384)** → −3204 (p 0.432) |
| … sign flips / backtrack | **2** / 0.84 px (stipe base: 2 / 1.8 px) |
| slowest mid-leg sweep | **1 px/p** (a dead stop) |
| d advance, p 0.376–0.390 | **0.7 °/p** |
| gaze pitch rate | −56.4 (0.336) → **−14.4 (0.382)** → −99.5 (0.428) |
| fov rate | +86 (0.336) → **+24 (0.382)** → +266 |
| orbit azimuth rate | −504 (0.340) → **−50 (0.434)** |
| position speed | 92.4 (0.336) → **9.0 (0.434)** → 18.1 u/p |
| yaw / pitch sign flips | **0 / 0** ← the trap |
| distance re-approach | 0.095 |

The gaze target overswings in all three axes — x 2.3349 → **1.140** (0.687
past its 1.827 destination) → 1.827; y **rises** 2.0903 → 2.2572 (p 0.396)
before descending to 1.028; z −1.102 → −1.463 → −1.442 → −4.067 — but that is
a symptom, not the fault: the x overswing is Connect's own settled key list,
and the angles stay monotone through all of it.

**Where it came from.** The D19 rule above lerps the two exit keys from the
rest toward Connect's first key on a **smoothstep**, and smoothstep flattens
to zero slope at *both* ends. So d, fov and pitch all coasted to a halt
arriving at p 0.410 — exactly where Connect's own keys resume at full rate
(−179 °/p). Before D19 the same rule was harmless: the rest aimed 0.87
higher, which put the halt where the leg was slow anyway.

### The re-key — gaze and fov only, on one shared ease

Both keys are re-derived from what the eye reads rather than from the world
target. `x = (p − 0.26)/0.15`, `s = x^1.5` — zero slope at the rest (which
the `hold` key forces anyway), 1.5x mean slope at the join, which is what
meets Connect's −179 °/p without a step:

```
dx  = lerp(-0.079, -12.324, s)    horizontal angle of the cap off the frame axis
dy  = lerp( 5.354,   6.085, s)    the same, vertically
fov = lerp(40, 48, s)
tgt = pos + dir(dx, dy) * d       d = the shipped ladder, 8.55 / 8.69, kept to the digit
```

Both endpoints are fixed and neither moved: the approved Inspire rest
(`ca7a769`) and Connect's settled first key (`f9e8317` + the 2026-08-05 eye
lift). The exponent was chosen by measurement, not taste — a 2,700-point
sweep over (d-ease, vertical-ease, fov-ease, blend, two target distances)
found a broad plateau, 175 of which cleared every hard constraint; 1.5 sits
in the middle of it and lets one number describe all three schedules.

| key | before | after |
|---|---|---|
| drift p 0.312 | tgt (2.0037, 2.1235, −1.2295) fov 42.22 | tgt **(2.0571, 2.1443, −0.8376)** fov **41.63** |
| exit p 0.362 | tgt (1.4289, 2.1811, −1.4515) fov 46.07 | tgt **(1.2152, 2.2287, −0.8497)** fov **44.49** |

**Every `pos` is byte-identical, deliberately.** The Inspire reveal drive and
the 34-deg arming gate are functions of camera AZIMUTH alone (`index.js`
`camAzDeg` reads `position.x/z`), so holding the positions holds `az(p)` to
the last bit and the particle-continuity troughs closed in `b2c9584` cannot
re-open. That is a proof, not a measurement (see Gates).

### Measured after

| | before | after |
|---|---|---|
| subject screen-x backtrack | 0.84 px, **2 flips** | **0.00 px, 0 flips** |
| stipe-base screen-x backtrack | 1.8 px, 2 flips | **0.00 px, 0 flips** |
| slowest mid-leg sweep | **1 px/p** | **1247 px/p** (peak 3211 → 2964) |
| slowest d advance | **0.7 °/p** | **58.4 °/p** (p 0.291); ≈93 through the old stall |
| fov rate at p 0.38 | **+24 °/p** | **+65 °/p** |
| fov interval ladder | 42.7 / 77.0 / **40.2** / 138.9 / 208 / 200 | **31.4 / 57.1 / 73.2** / 138.9 / 208 / 200 |
| gaze yaw peak / flips | 640.4 / 0 | **594.4 / 0** |
| gaze pitch peak / flips | 99.6 / 0 | **98.8 / 0** |
| distance re-approach | 0.095 | **0.069** |
| subject relative size wobble | 5.37% | **4.87%** |
| roll | 0.000000 | **0.000000** |

The cap's screen track is now one migration with no pause anywhere:
718 → 691 (p 0.312) → 624 (0.362) → 547 (0.38) → 481 (0.41) → 398 (0.44) →
321 (the Connect rest). Portrait (`?aspect=portrait`): screen-x backtrack
0.00 px, 0 flips; leg rotation peak 576.5 °/p.

### Gates

- **Boundary troughs — the structural argument first, because it is the
  stronger evidence.** Every `pos` in the diff is byte-identical; `camAz(p)`
  is therefore identical (measured max |Δ| **3.4e-7 deg** on a full-precision
  key row). The reveal ramps are `sm(18,48)/sm(38,62)/sm(54,78)/sm(5,28)` on
  `camAzDeg`, slope 1/30 per degree, so a 3.4e-7 deg azimuth difference moves
  any channel by **≤1.1e-8**; the arming gate reads the same azimuth. The
  spore colour is pure in (reveal, time, T). The reveals cannot have moved,
  so the troughs cannot have moved.
  The like-for-like sweep agrees but **cannot resolve a change at this
  precision, and should not be read as if it could** (41 samples per window,
  live-frame — the frozen `?capture=` path latches the spore integrator so the
  colour buffer never updates, so this measurement is unavoidably
  time-contaminated):

  | | before | after |
  |---|---|---|
  | Mission → Inspire trough (total shed light) | −0.48% | −0.25% |
  | … dots above 0.60 luminance | −0.37% | −0.43% |
  | Inspire → Connect trough | −8.46% | −9.07% |
  | … dots above 0.60 luminance | −17.01% | −16.85% |

  The differences run in both directions and are **smaller than the
  instrument's own run-to-run noise**: the window ENDPOINTS, which are the
  same pose in both runs and must be identical, differ by 1–2% (2959.6 vs
  2903.9; 2931.4 vs 2950.4). Treat the table as "nothing gross happened" and
  the azimuth identity as the actual gate.
- **Rate + roll audit**, 601-sample drift-aware, p 0–0.60, Mission→Inspire→
  Connect. Peak composed rotation **765.4 °/unit-p landscape (unchanged, at
  p 0.220)** and **761.3 portrait (unchanged, at p 0.220)** — the peak lives
  in the arrival gesture, which this change does not touch; both reproduce
  D19's reported 765.4 / 761.0 to the digit. Well under the ~1.2k ceiling.
  **Max roll 0.000000 deg** in both aspects. Leg-only composed peak: 596.3
  landscape / 576.5 portrait.
- **Joins.** p 0.38 is a chapter boundary with no key on it — the director
  concatenates the legs into ONE global key list and computes tangents
  globally, so there is nothing there to be discontinuous; measured, the
  rates pass through it smoothly (fov +65 °/p either side, d ≈ −93 °/p). Into
  the leg from the rest, the `hold` key's zero tangent still holds: every
  rate leaves the rest at 0 and the first key's interval mean is the smallest
  of the four.
- **Reverse mirrors exactly.** Forward vs reverse over the full ride, 201
  points: **max position error 0.00e+0, max target error 0.00e+0**, fov
  8.28e-4 — which is the director's own 0.001 fov write deadband
  (`apply()` skips the write below it), shipped behaviour, not this change.
- **Nothing fades in over open view.** No opacity or reveal schedule was
  touched; the only edited values are two `tgt` vectors and two `fov` scalars.
- **Console clean.** The two expected info lines per load
  (`[journey-lens]`, `[journey-v6]`), zero application errors or warnings
  across slow and fast rides in both directions. (Chrome compositor
  `GL_INVALID_OPERATION: invalid mailbox name / texture is not a shared
  image` warnings appear in the pane around reloads and viewport resizes;
  they are browser-level, not from this codebase.)
- **`capture.py --check` PASS**, worst MAE 0.18/255. `mission` 0.00/0.00,
  **`inspire` 0.00/0.00 — the approved rest framing is untouched, which is
  the point**, `connect` 0.00/0.00, `owned` 0.00/0.00, `final` 0.18/0.13 (its
  own unchanged determinism noise). All ten golden PNGs are unmodified on
  disk; nothing was re-shot.
- **Three streams still read.** All three chips (ArtCompute, Arca Gidan
  Prize, 2RP) still land on their braids at p 0.312 with the streams
  distinct. The rest itself is byte-identical, so the approved legibility is
  preserved by construction.

### Residual / open

- **The cap sinks ~13 px before it rises 63.** cy runs 328 → 341 → 280, so
  the vertical turns once, at p 0.410. This is **forced**: the approved
  Inspire rest frames the cap at y 328 and Connect's settled first key at
  y 341, and both are fixed. Total downward travel is 16.15 px against a
  theoretical floor of 13.3; the worst single run improved 15.00 → 13.25.
  Removing it entirely means moving a rest, which is out of scope.
- **Portrait gaze pitch reverses twice on the leg, by 0.047 deg.** Before:
  2 flips at p 0.361/0.390. After: 2 flips at p 0.365/0.383. **Pre-existing,
  not introduced** — it is the portrait field's own `tgtUp` ramp between its
  p 0.260 and p 0.410 keys beating against the landscape pitch, the same
  class as the ±42 °/p portrait yaw wiggle recorded as a residual in
  `2a27db7`. At fov 57 over 900 px it is sub-pixel.
- **The subject still grows ~4.9% mid-leg** (relative angular size, down from
  5.37%). Driving it to the forced 2.2% floor requires the fov to copy the
  cap's angular-diameter curve, which reintroduces a rate dip at p 0.36 —
  measured: blend 1.0 gives 2.72% push-in but a 94.7 → 44.9 °/p fov rate dip.
  The pure ease was chosen instead because a strictly increasing fov ladder
  is what keeps the widening from pausing, and the push-in is a pre-existing
  residual rather than a regression.
- **The leg is more back-loaded than it was.** d now covers 21% of its travel
  in the first third (was 76%), because the rate has to ramp from a standstill
  at the rest to the −179 °/p Connect resumes at, and only −12.245 deg are
  available to do it in. That is structural given both endpoints are fixed;
  it reads as a build rather than a lurch, but it is a change in character
  and Hannah should be the judge of it.
