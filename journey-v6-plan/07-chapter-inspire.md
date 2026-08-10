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

---

## 2026-08-07 (D21) — the same rule, anchored to furniture the page draws

Hannah, on the framing `ca7a769` shipped: *"for the inspire section, can you
push the mushroom down a bit so the page feels more balanced — use your vision
to judge where."*

### What was wrong with D19, precisely

D19's construction was right and its **anchors** were wrong. It centred the cap
between **y 0** — the top of the viewport — and **y 608.4** — the top of the
copy block's *padding box*. Neither of those is a thing a viewer can see. The
page draws a nav across the top whose lowest element (the `2RP` / `Discord`
pills) bottoms at **y 66.1**, and the copy's first visible mark is the headline
glyph, whose cap-height top is **y 641.0** — the `h2`'s rect starts at 634.0 and
the 7.0 px is the font's internal leading. So D19 centred the cap in a band with
66 px of invisible furniture stapled to its top and 33 px of invisible padding
stapled to its bottom, and the two errors did not cancel: they both pushed the
midpoint up.

Anchored to what the page draws, the band is **[66.1, 641.0]** and its midpoint
is **353.6**, which is **49.3 px below** where D19 put the cap. That is the
whole change. It is not a taste correction applied on top of a rule; it is the
same rule with its inputs read off the rendered frame instead of off the CSS.

The check that it is the right band: at the new pose the frame's two voids come
out **equal to a tenth of a pixel** — 179.3 px of sky between the nav and the
top of the cap, 179.4 px of dark between the cap's rim and the headline.

### Why not further, even though all the plume is above the cap

Measured, not assumed. The subject's luminance-weighted centroid — mushroom and
plume together, everything above the geometric horizon, sky floor subtracted —
sits **61 px higher than the cap's bbox centre at every offset tested**:

| cap centre | 304.2 (D19) | 334.2 | **353.5** | 374.2 | 394.2 |
|---|---|---|---|---|---|
| subject ink centroid | 252.0 | 275.4 | **292.1** | 309.2 | 326.5 |
| void above cap (from nav) | 129.2 | 159.8 | **179.3** | 200.3 | 220.5 |
| void below cap (to glyph) | 227.8 | 198.4 | **179.4** | 158.9 | 139.1 |

Centring the **ink** rather than the head would want the cap at y 414 — sitting
on the headline. That criterion over-weights a diffuse low-contrast scatter that
deliberately spills off the top edge. Hannah's language in D19 and again here is
about *the mushroom* and *the head*; the plume is context. Anchor the head, and
let the plume be the air.

The four offsets above were also read on screen at 1440x900, which is what
settled it. **+90** crowds the copy — 139 px of clearance and a stipe with
nothing left of it. **+70** inverts the two voids, 200 above against 159 below,
and reads bottom-heavy in exactly the way D19 read top-heavy. **+30** is a real
improvement and still leaves the cap's void the largest single empty area in the
frame. **+49.3** is where the two voids cross.

### The pose

```js
export const INSPIRE = { az: 115 * DEG, r: 11, y: 2, target: V(2.3371, 2.4199, -1.1052), fov: 40 };
```

**`az`, `r`, `y` and `fov` are the shipped values to the digit for the third
re-key running.** The eye does not move; it looks somewhere else. That is not
economy, it is the safety argument, and here it is measured rather than argued:
over p 0..0.60, **max |Δ camera azimuth| is exactly 0 and max |Δ position| is
exactly 0** in landscape, on a 601-sample full-precision row. The Inspire reveal
drive and the 34-deg arming gate are functions of camera azimuth alone
(`index.js camAzDeg` reads `position.x/z`), so the reveals are bit-identical and
the particle-continuity troughs closed in `b2c9584` cannot move. There is no
sweep to report because there is no difference to resolve.

**Correction to D20's blanket claim.** D20 wrote "every `pos` is byte-identical"
without qualification. That is true in landscape and **false in portrait**: the
portrait field dollies about the *landscape target* (`portrait.js applyPortrait`:
`pos = target - fwd * back`), so moving the target moves the portrait eye.
Measured here: **max |Δ az| 0.0052 deg, max |Δ pos| 0.165** world units, almost
all of it along the view axis. The reveal ramps are `sm(…)` on `camAzDeg` with
slope 1/30 per degree, so 0.0052 deg moves any reveal channel by **≤1.7e-4**,
and the 34-deg arming gate is crossed at hundreds of deg per unit p. Negligible,
but it should have said so, and D19 had the same exposure unrecorded.

### Composition, measured

Landscape is **fitted** to 1440x900, the primary review size. Portrait is
**balanced** between the two phone sizes, because one pose cannot serve both.

| viewport | nav bottom | headline glyph top | band midpoint | cap centre | dx | dy |
|---|---|---|---|---|---|---|
| 1440x900 | 66.1 | 641.0 | (720.0, 353.6) | (720.0, 353.5) | **+0.0** | **-0.1** |
| 1280x800 | 66.1 | 553.0 | (640.0, 309.6) | (640.0, 314.2) | **+0.0** | **+4.7** |
| 375x812 (portrait) | 93.1 | 489.0 | (187.5, 291.1) | (187.2, 310.6) | **-0.3** | **+19.5** |
| 430x932 (portrait) | 93.1 | 659.0 | (215.0, 376.1) | (214.6, 356.5) | **-0.4** | **-19.6** |

Every glyph top in that table is read off the rendered PNG (first row in the
copy column with text-bright pixels), not computed: 641 / 553 / 489 / 659. The
1280x800 and 375x812 frames were shot for the purpose through a scratch harness
that appends to `capture.py`'s `SIZES` at import time — the shipped tool is not
edited and its two golden sizes are unchanged.

**The portrait band's top is not the landscape band's top.** It is y 93.1 in
both phone frames, and it is the **active nav link's underline**, not the pills.
The nav stacks in portrait — pills on top ending at 49.7, links below ending at
85.1, and the 1 px `.active::after` rule hangs 8 px under its link. In landscape
the same rule sits at 64.6 and the pills' 66.1 wins. Reading "the bottom of the
nav" off one orientation and reusing the number in the other would have been
wrong by 27 px.

Portrait residuals are ±19.6, **better than the ±23.8 D19 balanced to**. That is
luck rather than skill: the two phone sizes' band midpoints happen to sit closer
together as a fraction of frame height (0.358 vs 0.403) than their copy-block
tops did (0.564 vs 0.674). `tgtRight` is untouched — nothing horizontal moved.

### The exit keys, re-derived from the D20 rule

Only the rest's gaze moved, and a keyed spline does not care why an endpoint
moved. Both exit keys are re-derived from the rule D20 authored, with the new
rest. **The decode was re-proved before it was re-used**: run on the *shipped*
rest it reproduces the shipped key targets to all four decimals — `2.0571 /
2.1443 / -0.8376` and `1.2152 / 2.2287 / -0.8497` — and the Connect endpoint
comes back at `-12.3239 / +6.0850` against the `-12.324 / 6.085` written into
the file. Only then was the new rest fed in.

| key | before | after |
|---|---|---|
| rest p 0.260 | dx -0.079, dy **+5.354** | dx **-0.095**, dy **+3.112** |
| drift p 0.312 | tgt (2.0571, 2.1443, -0.8376) | tgt **(2.0576, 2.4106, -0.8396)** |
| exit p 0.362 | tgt (1.2152, 2.2287, -0.8497) | tgt **(1.2093, 2.3779, -0.8526)** |

Everything else is untouched, and deliberately so: every `pos` is byte-identical,
both `fov` values stay at 41.63 / 44.49 (fov is `lerp(40, 48, s)` and never read
the rest's gaze), and the distance ladder rebases to 8.4253 -> 8.55 -> 8.69 ->
8.788 — **the same digits it already carried**.

**A residual D20 recorded as forced is now gone.** D20 had to accept that the cap
*sinks ~13 px before it rises 63*, because the approved rest framed it above
Connect's settled first key and the vertical had to turn once. The rest now sits
**below** Connect's key, so `dy` climbs 3.112 -> 6.085 with nothing to unwind.
Measured over the leg at 1440x900: **vertical backtrack 8.64 px -> 0.00, sign
flips 3 -> 0.** The cap rises monotonically from the rest to the Connect rest.

### Gates

All figures from one instrument — a drift-aware scrub of `director.poseAt` (pure
in p and aspect), cap-rim silhouette bbox centre, tree swapped between runs so
before and after are like for like.

- **Reveal continuity.** Landscape `camAz(p)` and `pos(p)` differ by **exactly
  0** over p 0..0.60. Nothing that reads them can have moved. Portrait differs
  by 0.0052 deg / ≤1.7e-4 of a reveal channel (above).
- **Leg, p 0.26–0.49.** Screen-x backtrack **0.00 px, 0 sign flips** in both
  aspects, unchanged from D20. Screen-y backtrack **8.64 -> 0.00 px, 3 -> 0
  flips** landscape; portrait 4.47 -> 6.59 px, 2 -> 2 flips (the pre-existing
  `tgtUp`-ramp wobble D20 recorded, sub-pixel at fov 53). Slowest mid-leg sweep
  31.3 -> 31.1 px/p, peak 2925 -> 2923. Distance re-approach 0.0694 -> 0.0710
  landscape (0.02% of 8.5), 0.0275 -> **0.0248** portrait.
- **Rate + roll**, 601-sample, p 0..0.60, Mission->Inspire->Connect. Composed
  rotation peak **766.0 -> 763.1 deg/unit-p landscape** and **761.9 -> 758.2
  portrait**, both still at p 0.221 in the arrival gesture, both **improved**,
  both far under the ~1.2k ceiling. **Max roll 0.000000 deg** in both aspects.
  Leg-only peak 596.4 -> 598.3 landscape, 576.6 -> 579.7 portrait.
- **Arrival reversals unchanged.** The single vertical turn in the arrival stays
  a single turn, landscape 1 -> 1 flip (moving p 0.14 -> 0.166); portrait 2 -> 2.
  Nothing new was introduced, the existing one just lands lower.
- **Reverse mirrors exactly.** Forward vs reverse over the full ride, 201
  points: **max position, target and fov error all 0.00e+0** in both aspects.
  (`poseAt` is pure; D20's 8.28e-4 fov figure was the director's `apply()` write
  deadband, which this does not touch.)
- **Nothing fades in over open view.** No opacity or reveal schedule was edited:
  the diff is four `tgt` vectors and one portrait `tgtUp`.
- **Three streams still read, and read better.** Share of each braid's vertices
  passing off the frame edge: **0 / 10.00 / 0.83 % -> 0 / 5.83 / 0.00 %** —
  strictly better on all three, which is the direct consequence of aiming
  higher. Inter-braid screen separations 99.0 / 207.5 -> **98.7 / 206.4 px**
  (-0.3% / -0.5%). All three release lips stay in frame and their facing is
  unchanged at 1.00 / 0.21 / 0.19 **by construction** — facing depends only on
  where the eye is, and the eye did not move.
- **Chips clear the copy.** At 1440x900 the three land at y 161-185 (ArtCompute),
  233-256 (Arca Gidan Prize) and 274-297 (2RP), against a copy block starting at
  608 — clearances 423 / 352 / 311 px. No chip-to-chip overlap: x 333-501,
  548-679, 892-955. Each dot still sits on its own braid. Portrait verified on
  screen at both phone sizes.
- **Console clean.** The two expected info lines per load (`[journey-lens]`,
  `[journey-v6]`), zero application errors or warnings across a slow
  Mission->Inspire->Connect scrub forward and backward. The one 404 in the log
  is `/favicon.ico`, which the dev server has never served.
- **`capture.py --check` PASS**, worst MAE **0.04/255** (owned mobile, its own
  determinism noise). `mission` **0.00/0.00 — byte-identical, which the brief
  requires**; `connect`, `owned`, `final` all 0.00. Only `inspire@1440x900` and
  `inspire@430x932` were re-shot, with provenance in `manifest.json`.

### What it gives back

D19 spent the ground to lift the cap: the horizon ran 633 -> 463 and the lower
band brightened 17%. Aiming higher pitches some of that back down the frame.

| | D19 | D21 |
|---|---|---|
| horizon, 1440x900 | 463.3 | **511.7** |
| horizon, 1280x800 | 411.8 | **454.8** |
| lower-band mean luminance | 24.80 | **24.62** |
| light off the top edge (mean of rows 0-3) | 18.39 | **16.63** |

48 of the 170 px D19 spent come back, and the plume that was clipping at the top
clips less. Neither was the reason for the change; both are why it is cheap.

### Residual / open

- **Connect's paths now become visible 0.024 of p later.** The camera-pure
  resolve reads `forward.y`, and aiming higher delays it: `group.visible` flips
  at **p 0.3500** against the shipped 0.3256 (measured live, 0.000625 steps).
  Connect's own arrival is p-pure and does **not** move — the three fronts still
  depart at 0.4006 / 0.4231 / 0.4469 to the digit — so the lead the `4146288`
  restage bought, "the web must read as pre-existing before a strand of it is
  lit", narrows from 0.075 to **0.051** of p. That is still comfortably above
  the 0.035 that restage set as its own requirement, and the `connect` golden is
  0.00/0.00, but it is now the binding constraint on ever starting Connect's
  arrival earlier, and anyone who wants that budget should read this line first.
- **It also FIXES a portrait violation nobody had noticed.** On the shipped
  build the camera-pure resolve was **0.2982 at the portrait Inspire rest** —
  not the "exactly 0 at the Inspire rest" the connect chapter's own header
  claims. Only the arm gate (`amount > 0.003`, p 0.32) kept it off screen. The
  new pose puts `forward.y` at +0.0217 there and the resolve back to exactly 0,
  restoring the stated invariant.
- **1280x800 sits +4.7 px low** and portrait ±19.6. Both are inherent: the
  band's midpoint is not a fixed fraction of the frame, because the copy's
  height in the frame depends on how its prose wraps. Both are better than the
  residuals D19 left (+9.5 and ±23.8).
- **The stipe still crosses the headline.** It always has; nothing here changes
  it, and at this offset the crossing is slightly shorter than it was.

## 2026-08-07 — "they just flash up": the arrival was a switch, not a growth

Hannah, on entering Inspire: *"why when I go into Inspire does it feel like they
just flash up and weirdly appear?"*

Not a second population and not a dip — the emphasis she approved in `c6bbbab`
arrives too fast. This section records what was measured, what the cause turned
out to be (**not** what a first pass had concluded), and what changed.

### The instrument

A frozen, exactly reversible per-dot probe against the live page at 1440x900:
place with `journey.scrollTo(p)`, hold the organism clock at `freezeTime(0)` so
every dot's free-running stage phase is the same at every sample, then read
`sceneApi.spores.sporePts`'s colour and position buffers directly. Luminance is
Rec.709 on the vertex colour; since `dim()` writes `col = colorBase * f`, the
per-dot *ratio* to its own p = 0 luminance is exactly `f`, independent of the
weighting — so the "dark" test is instrument-free.

Two controls say the instrument is the same one the earlier sections used:
p = 0 and the Inspire rest reproduce to the digit across reloads, and the
`b2c9584` boundary troughs come back as **−3.90%** and **−11.71%** against that
section's published −4.0% and −11.7%.

### What it actually is — the correction

A prior investigation named the **migrant draw-on gate** (`rl`/`g0`/`drawOn`,
below the braided-rise branch) as the cause, on the argument that `rg` is one
number per exit per frame and therefore sweeps the whole cohort's clocks in
lockstep. That argument about the gate is **correct**, and the gate has been
fixed here too — but it is not what Hannah is seeing, because **the gate is not
running during the event she reported.**

The per-exit effective reveals, measured through `seat.drive()`:

| p | eff[0] resident | eff[1] Arca | eff[2] 2RP |
|---|---|---|---|
| 0.1075 | 0.105 | **0** | **0** |
| 0.115 | 0.330 | **0** | **0** |
| 0.125 | 0.683 | **0** | **0** |
| 0.130 | 0.830 | 0.022 | **0** |
| 0.1425 | 1.000 | 0.432 | 0 |

The steepest rise — dots above luminance 1.0 going **0 → 387** — lands entirely
inside p 0.1075–0.130, where *both migrant reveals are exactly zero*. No migrant
dot has any conversion there, so no migrant dot reaches the gate. Every one of
those 387 dots belongs to the **resident** exit (ArtCompute), and the resident's
`rg` is the literal `1` at every reveal — its gate never fires, by construction.

The real cause is simpler and one level up: **`pw = PLUME_GAIN * env * conv`**,
so a dot's brightness rides its conversion ramp, and that ramp's per-dot
stagger was the population's entire arrival spread. It was **0.45 of reveal**
wide for the resident (`ss(0, 0.35, rev - stag*0.45)`), against a reveal that
crosses its whole range in **0.045 of p**. The cohort therefore delivered 80% of
its amplitude in Δp ≈ 0.0098 — about **one degree of camera azimuth**, which at
a brisk scroll is three rendered frames. That is a switch.

`b2c9584`'s conservation floor is a contributing factor exactly as suspected —
it makes previously-gated dots brighten as ∝ conv² rather than sitting at zero,
which concentrates more of the total gain into that same window. It is not
reverted; it fixed a real defect and its metrics are re-checked below.

### The fix — three changes, all in `organism/spores.js`

1. **Widen the conversion stagger to the choreography's limit.** Resident
   `ss(0, 0.35, rev - stag*0.45)` → `ss(0, 0.26, rev - sw*0.74)`: the cohort now
   spans the **whole** reveal instead of its first 45%, completing at exactly
   rev 1. Migrants `ss(0, 0.30, rev - stag*0.25)` → `ss(0, 0.22, rev - sw*0.33)`,
   still complete at exactly rev 0.55 where their walk front lands.

2. **Pre-warp the stagger against the reveal's own shape** (`stagW`, built once
   in `initSteer`). A stagger uniform in *reveal* is not uniform on *screen*:
   the chapter drives each reveal as a smoothstep of progress, so it crawls at
   both ends and sprints through the middle, re-clustering a flat stagger into
   the middle third of the scroll. Warping the hash through the same smoothstep
   puts proportionally more dots where the reveal is slow. `stag` itself is
   untouched, so every other assignment that reads it keeps its approved value.
   This is worth as much as change 1 — see the table.

3. **Stagger the migrant draw-on gate per dot**, which is the prior
   investigation's own prescription and remains right on its merits: `rg` was
   one number per exit, now `ss(0.55 - sw*0.42, 1, rev)`. The gate's soft edge
   also widens from 0.10 to `GATE_WIDE` 0.25, with `GATE_TOP` raised 1.12 → 1.30
   so that `GATE_TOP - GATE_WIDE ≥ 1` keeps the rev-1 clamp exact.

**Nothing here is an approximation at the rest.** Every ramp reaches exactly 1
at its stated reveal for every dot, so `env *= 1` and `conv = 1` hold literally.

### Before / after

Rate of brightening, scored on "dots above luminance 1.0" mapped onto two
**recorded real wheel gestures** (the traces are unchanged by the fix — nothing
here touches scroll — so the same p(t) drives both columns):

| | before | stagger only | **stagger + warp** |
|---|---|---|---|
| first surge 10→90%, deliberate | 114 ms / 6 fr | 180 ms / 10 fr | **221 ms / 12 fr** |
| first surge 10→90%, brisk | 56 ms / 3 fr | 79 ms / 5 fr | **103 ms / 6 fr** |
| peak dots per 60 Hz frame, deliberate | 54.2 | 31.5 | **30.7** |
| peak dots per 60 Hz frame, brisk | 127.4 | 74.5 | **71.9** |
| peak dots per 50 ms, deliberate | 161.3 | 95.3 | **87.8** |
| peak dots per 50 ms, brisk | 322.9 | 223.1 | **186.2** |
| peak dots per 100 ms, deliberate | 288.0 | 187.8 | **155.9** |

The steepest single step of the trace, per unit p, runs **36,400 → 20,000
dots**, and the curve's shape changes from an S with a hard middle to very
nearly a straight line — per-step deltas across the resident's arrival are now
22/50/47/30/44/30/35/30/34/40/19 against 30/64/91/83/68/37/11/1 before. There is
no longer a peak to shave; the remaining spread is bounded by the reveal's own
p-width.

**Honest limit.** The rise is now roughly twice as long in wall clock at both
speeds, and the peak rate is down ~44%. At a *brisk* scroll the first surge is
6 frames — better than 3, but still inside the 5–7 band the brief named. That
residual is structural and lives **outside** this file: the resident's reveal
occupies Δp 0.045, so at `MAX_SCRUB_RATE` 0.45 p/s the entire arrival cannot
take longer than ~100 ms however it is distributed. Spreading it further means
spending more journey progress on the reveal, which is the chapter's
camera-driven mapping (`journey/chapters/inspire/camera.js`) and out of scope
here. Anyone who wants the rest of it should start there — and note that
p 0.1825–0.26 is already all rest, so the budget exists.

### `b2c9584` re-measured — no regression, small improvement

Dark **and** converted (displaced > 0.5 from hero, below 25% of own p = 0
luminance), same run, same instrument:

| p | before | after | resting baseline |
|---|---|---|---|
| 0.147 (Arca) | 196 | **198** | 243 / 245 |
| 0.167 (2RP) | 246 | **248** | 243 / 245 |
| 0.26 (Inspire rest) | 243 | **245** | — |
| **0.385 (→ Connect)** | 196 | **180** | 243 / 245 |

(The two baselines differ by 2 counts because the hero drift state is
path-dependent across reloads; read each column against its own. Normalised,
0.147 and 0.167 are *identical* before and after, and 0.385 improves from −47 to
−65 relative to baseline.) Every transition point still sits at or below the
resting baseline — the excess cohort `b2c9584` removed has not come back.

Boundary troughs, total shed light, local drawdown from the preceding peak:

| | before | after |
|---|---|---|
| Mission → Inspire | −3.90% | **−1.81%** |
| Inspire → Connect | −11.71% | **−9.59%** |

Both improve, which is the expected sign: spreading the arrival keeps light in
the population across the window instead of concentrating and then releasing it.

### Gates

- **`capture.py --check` PASS**, worst MAE **0.04/255** (owned mobile, its own
  determinism noise, unchanged). **`mission` 0.00/0.00 — byte-identical**, as the
  brief requires. `inspire@1440x900` and `inspire@430x932` are also **0.00** —
  the Inspire goldens did **not** move, so nothing was re-shot and no provenance
  entry was needed. `connect`, `owned` desktop and `final` all 0.00.
- **Three streams still legible at the rest.** Guaranteed by the above rather
  than merely observed: the rest frame is pixel-identical to the approved
  `c6bbbab`/`ca7a769` golden. Confirmed on screen at 1440x900 — three distinct
  rising braids off the rim, each still carrying its chip's anchor dot.
- **Reverse scrubs mirror exactly.** Forward-arrived vs reverse-arrived per-dot
  luminance across 21 sample points spanning p 0.10–0.20: **max difference 0**.
- **Nothing fades in over open view.** Arming is unchanged: at low reveal `conv`
  and so `cvT` are ~0, the conservation floor is ~0, and the gate is as it was.
- **Console clean** over a full ride — slow forward, fast forward to the
  epilogue, fast back, slow back to p = 0, all five chapters reached and p
  returning to exactly 0. Two expected info lines per load, zero application
  errors or warnings.
- **Cost.** One extra `Float32Array(N)` built once, and the per-dot `rg`
  smoothstep replaces a hoisted lookup — 4,200 iterations of three flops in a
  loop that already runs several `Math.sin` per dot.

### Also found, deliberately not fixed here

At the **Inspire → Connect** boundary there *is* a genuine second particle
system, unlike at Mission → Inspire. `journey/chapters/connect/tendrils.js`
builds its own **108 drifting particles plus glints**, chapter-owned, with its
own CPU integrator, becoming visible around p ≈ 0.365. That is a real second
source of dots at that boundary and it is deliberate — recorded here so the next
person measuring particle counts across that seam is not surprised by it, and
does not mistake it for the shed gaining or losing population.

## 2026-08-07 (later) — the ramps were finishing early: spending the rest of the swing

`9e2a277` spread each cohort's brightening across the whole of its own reveal
and then stopped, because that is all a dot can do. Its residual was structural:
the resident's reveal occupied Δp 0.045, so at `MAX_SCRUB_RATE` 0.45 p/s the
entire arrival could not last longer than ~100 ms however its amplitude was
distributed, and under ~150 ms a luminance change reads as a cut. This section
spends more scroll progress on the arrival, which is what that residual asked
for.

### Where the budget was — and where it was not

`9e2a277` pointed at **p 0.1825–0.26**, which is indeed all rest. That budget
turns out to be **unspendable**, and saying so is half the finding.

The reveals are functions of camera AZIMUTH. p 0.1825–0.26 is the stretch of
the arrival above **az 78**, and no ramp may finish above ~83: the arrival
climbs to az 115 and the exit leg falls back through it to meet Connect, so a
ramp still open up there would run BACKWARD in view on the way out. That is the
rule D18 wrote when it pulled the old bounds in, and it caps every ramp's top
regardless of how much p sits above it. The 0.0775 of progress between the end
of the cascade and the Inspire rest is progress the camera spends going
somewhere the reveal is not allowed to follow.

Re-shaping `az(p)` was measured as the alternative, since that is the other way
to move p into the band. It is worth very little. The arrival spends 0.22 of p
on 127.2 deg, so a perfectly uniform sweep — no departure ramp, no settle,
which is not a real option — would give the cascade band 0.135 against the
0.111 it already has. Modelled honestly (trapezoid ramp 0.18 → 0.10, and a
two-plateau profile that slows the band and accelerates the empty tail), the
whole family buys **0.5 to 1 frame** on the worst stream, and the two-plateau
variants pay for it by raising the peak azimuth rate 767 → 912 deg/unit-p. It
was rejected: `camera.js` is untouched, byte for byte.

**The budget that was spendable was inside the ramps themselves.** The
resident's window was az 14..44. It *saturated at 44* and then sat flat for the
34 further degrees the cascade still had before the ceiling. Every ramp was
finishing early and idling. Nothing had to move for that budget to exist — it
only had to be claimed.

### The change

`journey/chapters/inspire/index.js`, the `ARR` ramps:

| exit | before | after | window |
|---|---|---|---|
| ArtCompute | az 14 → 44 | **az 5 → 78** | 30 → 73 deg |
| Arca | az 34 → 58 | **az 17 → 78** | 24 → 61 deg |
| 2RP | az 50 → 74 | **az 29 → 78** | 24 → 49 deg |

Every ramp now runs to the ceiling and the **sequence is carried by the onsets
alone**. The three streams still enter in the authored order and are always
visibly at different stages — at az 40 they stand at 0.47 / 0.32 / 0.13 — but
each one now spends every remaining degree of the swing growing instead of
stopping.

The resident's onset moves to **az 5** because that is the master drive's own
onset (`band = sm(5, 28)`); the reveal is a product of the two, so nothing can
begin earlier, and putting it exactly there costs nothing and makes the seam
derivation exact.

`drive()`'s `a`/`b`/`c` channels are re-keyed to mirror the new windows. They
are **inert** and were inert before: `setReveal` takes `max(a, b, c, band)` and
`band` is the steepest of the four from az -37.7 upward, so the master drive is
`sm(5, 28)` exactly. Verified rather than asserted — `max(a,b,c,band) - band`
is **0.000e+0** at every 0.01 deg over az -40..120. They are re-keyed so the
master's onset stays 5 whichever of them someone edits next, because the T1
derivation rests on it.

**Spacing is 12 deg, and smaller is better here.** All three windows end at 78,
so every degree of spacing is a degree taken off the later streams. Measured
per cohort (frames carrying 80% of that cohort's amplitude, `MAX_SCRUB_RATE`):

| spacing | ArtCompute | Arca | 2RP | conservation drawdown |
|---|---|---|---|---|
| shipped 20/16 | 4 | 2 | 2 | −2.10% |
| **12 (this)** | **7** | **5** | **3** | −1.97% |
| 18 | 7 | 4 | 3 | −1.50% |
| 21 | 7 | 4 | 2 | −0.84% |

### The re-derived T1 threshold: 34 → 25

Arming must land where the reveal product is exactly zero. The product is
`master(az) * arrOf(az, ARR[i])`; the master is `sm(5, 28)` and the earliest
onset is az 5, so **both factors are identically zero for az ≤ 5** — which is
d ≤ 17.2 with Mission at az -12.2076. With `HYS_DEG` 8:

```
arm      d > T - 8    ->  az > T - 20.2076   must be <= 5        ->  T <= 25.21
release  d < T - 16   ->  az < T - 28.2076   must be > -12.2076  ->  T > 16
```

T = **25** is the top of that window rounded down to the integer the shipped
numbers are written in, leaving the arm edge 0.21 deg below the bound — exactly
the margin 34 left against its own bound of 14. Evaluated:

| edge | az | eff[0] | eff[1] | eff[2] |
|---|---|---|---|---|
| arm, d > 17 | 4.7924 | **0.000e+0** | **0.000e+0** | **0.000e+0** |
| release, d < 9 | -3.2076 | **0.000e+0** | **0.000e+0** | **0.000e+0** |

Both factors are zero at the arm edge (master 0.000e+0, arr0 0.000e+0), the
release edge is reachable (az -3.21 > the hero pose's -12.21, so a reverse
scrub does retire), and the gate is not armed at the hero pose (d = 0 is not
> 17).

### Before / after

Same frozen per-dot instrument as `9e2a277` — `journey.scrollTo(p)`,
`freezeTime(0)`, Rec.709 on the vertex colour buffer — but run in a **real
headless Chrome via `capture.py`'s own CDP client**, because the browser pane
in this session was hidden (`document.hidden`), which throttles rAF and makes
live frame timing meaningless. The instrument reproduces `9e2a277`'s published
`eff` table to ±0.004 and its p = 0 baseline to the digit.

**Per-cohort.** Dots crossing luminance 1.0, split three ways by cap-local
azimuth at the rest (the same coordinate `spores.js` assigns lanes in; the
three cohorts partition exactly, 475 + 167 + 48 = 690). Scored as *frames
carrying 80% of that cohort's own amplitude*, which is the brief's language:

| cohort | deliberate 0.21 p/s | brisk 0.35 p/s | fastest 0.45 p/s |
|---|---|---|---|
| ArtCompute | 9 → **14** fr (150 → 233 ms) | 5 → **9** fr (83 → 150 ms) | 4 → **7** fr (67 → 117 ms) |
| Arca | 4 → **9** fr (67 → 150 ms) | 3 → **6** fr (50 → 100 ms) | 2 → **5** fr (33 → 83 ms) |
| 2RP | 3 → **6** fr (50 → 100 ms) | 2 → **4** fr (33 → 67 ms) | 2 → **3** fr (33 → 50 ms) |

**Structural — each reveal's full p-width**, the quantity `9e2a277` named as
the bound:

| exit | Δp | deliberate | brisk | fastest |
|---|---|---|---|---|
| ArtCompute | 0.044 → **0.101** | 209 → **481** ms | 126 → **289** ms | 98 → **224** ms (5.9 → **13.5** fr) |
| Arca | 0.032 → **0.084** | 152 → **400** ms | 91 → **240** ms | 71 → **187** ms |
| 2RP | 0.030 → **0.066** | 143 → **314** ms | 86 → **189** ms | 67 → **147** ms |

**Trajectory and steepness.** Per-step deltas of the count trace over
p 0.10–0.19 in equal steps go from front-loaded to late-and-even:

```
before  0  58  98  92  76  63  62  74  32  25  63  46  1  0  0
after   0  13  61  42  51  53  84  99  89  73  92  28  4  1  0
```

Steepest **d(luminance)/dp 17,860 → 11,230 (−37%)**; steepest d(count)/dp
26,000 → 22,000, and its location moves from p 0.113 (the very start of the
rise, where a step is most visible) to p 0.140.

### `b2c9584` re-measured

Dark **and** converted — displaced > 0.5 from its own p = 0 position and below
25% of its own p = 0 luminance. Resting baseline 243:

| p | before | after |
|---|---|---|
| 0.147 (Arca) | 196 | **206** |
| 0.167 (2RP) | 246 | **233** |
| 0.26 (Inspire rest) | 243 | **243** |
| 0.385 (→ Connect) | 180 | **176** |

Every transition point sits at or below the resting baseline. p 0.167 is an
outright improvement: it was **above** baseline before (246 vs 243) and is now
comfortably under.

Boundary troughs — total shed light, local drawdown from the preceding peak:

| | before | after |
|---|---|---|
| Mission → Inspire | −2.10% | **−1.97%** |
| Inspire → Connect | −9.48% | **−9.44%** |

Both improve. **One honest cost, recorded rather than buried:** the arrival's
total shed light now dips **1.51% below its own pre-arrival baseline** around
p 0.140, where it previously never went under it. The cause is real and
specific — a migrant dot's conversion completes at rev 0.55 (the walk front)
but its draw-on gate only completes near rev 0.96, so it has ceded its ambient
share before its plume light is fully granted. That gap existed before; the old
sequencing *hid* it, because each cohort's deficit was covered by the previous
cohort's already-completed gain. Widening the windows overlaps the cohorts and
exposes it. Measured against the metric `b2c9584` actually published — drawdown
from the preceding peak — it is still an improvement, and the deficit is
bounded (a gated dot keeps 0.85 of its plume term, not zero).

### Gates

- **`capture.py --check` PASS**, worst MAE **0.00/255** across all ten goldens.
  `mission` **0.00/0.00 — byte-identical**; `inspire@1440x900` and
  `inspire@430x932` **0.00**, and the desktop still's diff bbox against the
  golden is **None** — zero differing pixels. Nothing was re-shot. The frozen
  Inspire rest pose is untouched, as required.
- **Three streams legible at the rest.** Guaranteed by the pixel-identity
  above and confirmed on the still: three distinct rising braids off the rim
  with dark sky between them.
- **Rate + roll, both aspects.** Peak |daz/dp| **766.9** deg/unit-p landscape,
  **740.6** portrait — unchanged, and `camera.js` is byte-identical so this is
  true by construction. Azimuth strictly monotone, **0** sign flips, both
  aspects. Max roll residual **5.55e-17** (camera right-vector y, over p 0..1).
- **Nothing fades in over open view; no self-ignition.** No reveal channel
  rises after it has fallen, at any point over p 0..0.42, in either aspect
  (**0** occurrences). Arming is dark by construction — see the table above.
- **Reverse scrubs mirror exactly.** Forward-arrived vs reverse-arrived
  per-dot luminance across 21 points spanning p 0.060–0.200: **max difference
  0**, at every point.
- **Console clean over a full ride** — slow forward, fast back, fast forward,
  slow back. All five chapters reached, p returns to exactly 0, **zero** errors
  or warnings.
- **Cost.** None. Six numbers changed.

### Residual — and where the next person should start

**2RP still lands 80% of its amplitude in 3 frames at `MAX_SCRUB_RATE`** (up
from 2, and 4 frames at a brisk scroll). All three streams improve, and the
first surge — the one Hannah reported — clears the 5–7 frame band at a brisk
scroll with margin. But the two migrant streams are now bounded by something
this section cannot reach, and it is worth naming precisely because it is the
exact analogue of what `9e2a277` handed over:

A migrant's brightness is dominated by `conv`, and `conv` completes at
**rev 0.55** because that is where its walk front lands (`mig = ss(0, 0.55,
rev)` in `organism/spores.js`, and `CONV_RAMP_MIG + CONV_STAG_MIG = 0.55` was
set to match). So a migrant delivers its amplitude in the **first ~53%** of its
window no matter how wide the window is. The draw-on gate carries the rest, but
it only swings env between 0.85 and 1.0 — about 15% of the change.

That bounds the migrants at roughly 7–8 frames even with **zero** onset
spacing, which is why widening alone cannot finish the job for them. Moving it
means moving the walk front itself — `mig`, both `CONV_*_MIG`, `RG_OPEN`, and
`furnOf`'s `(eff - 0.55) / 0.45` retime in the chapter, which is keyed to the
same 0.55. Four coupled constants, each with an identity to preserve at rev 1.
That is a separable piece of work with its own verification burden, and it is
where the remaining margin is.

## 2026-08-07 (D22) — the shed had no hysteresis; the REVEAL did

Hannah's fourth report on this family, and the first about the reverse
direction:

> "When I go from Connect to Inspire, all the spores rearrange weirdly. I
> really feel like there must be some weird inconsistencies with how we manage
> the spores for the main mushroom."

Every prior fix in this family was measured and tuned FORWARD. Her instinct
that this is systemic rather than local is correct, and this section is the
structural audit it asked for rather than another single-boundary patch.

**It reproduces.** Riding backward from the Connect rest at a deliberate wheel
rate, the shed enters its conversion on a visibly different schedule than the
one it left on: total shed luminance dips to 2647 (−3.6% against the resting
2746) as `nConv` goes 0 → 1,714 in twelve frames, and the population centroid
moves 0.11 world units inside single frames around p 0.37.

### The measurement that names it

Positions cannot be the metric here, and that is worth stating before the
numbers. A dot's stage on its braid path rides a free-running per-dot clock
(`t = tNow / perA[i] + ph0A[i]`), so the braid genuinely flows with wall time:
holding p at the Inspire rest and simply waiting 9 s moves 2,177 of 4,200 dots
by more than a world unit, mean displacement 1.35. That clock is an exact
function of absolute time, not an integration, so it is identical forward and
backward — it is the plume being alive, and it stays. It also swamps any
position difference, which is why it hid this for four rounds.

**`cv` — the per-dot conversion — is the structural quantity**, because it is a
pure function of the exit's effective reveal and the dot's own static hash. So
ride p 0.10 ↔ 0.50 at a deliberate rate and difference the whole per-dot state
at matched p, with a same-direction control:

| p | eff fwd | eff rev | dots with Δcv > 0.05 | Δcv > 0.25 | control: fwd vs fwd |
|---|---|---|---|---|---|
| 0.30 | 0.999 | 0.950 | 163 | 0 | **0** (Δcv max 0.0000) |
| 0.34 | 1.000 | 0.781 | 646 | 539 | **0** (0.0000) |
| 0.37 | 0.971 | 0.379 | 2,414 | 2,083 | **0** (0.0007) |
| 0.40 | 0.609 | 0.024 | **3,570** | 3,463 | **0** (0.0009) |

Two forward passes over the same span agree to `Δcv max 0.0009`. The
conversion was perfectly reproducible ALONG a direction and never reproducible
ACROSS one. At p 0.40 the same scroll position carried reveals differing by a
factor of **26**, and 85% of the shed sat at a different conversion. That gap
is what "all the spores rearrange weirdly" is.

### Root cause 1 — the reveal was a first-order lag

`journey/chapters/inspire/index.js`:

```js
ex.fade += (ex.target - ex.fade) * k;     // k = min(1, dt * 3.2)
```

A ~0.31 s lag on the ONE number every visual channel of the handoff reads
(`eff = fade * arrOf(az)`). A lag always TRAILS: it trails HIGH when the target
falls and LOW when it rises. `out` collapses the reveal across Δp 0.06 — about
0.67 s at a deliberate rate, comparable to the time constant — so forward and
reverse sat on opposite sides of the true value through the whole boundary.

`target` was already everything the ease pretended to smooth: `max(a, b, c,
band) * out`, four smoothsteps of camera azimuth and p, and azimuth is itself
C1 in p (the director's Hermite spline). **The fix is `ex.fade = ex.target`.**

Three things make that safe, and each was checked rather than assumed:

- **The seam cannot show.** `setArmed(false)` snaps target to 0, but T1 is
  derived (`seams.js`, `2fdb4e6`) so that BOTH its edges sit where the reveal
  is already exactly zero — it arms at az 4.79 against an onset of 5, and
  releases either at az < −3.21 (`arrOf` = 0) or at p > 0.46, where `out` has
  been 0 since p 0.415. The snap has nothing to snap.
- **It is a no-op at every landing frame.** `snap()` — the path every `?p=`
  deep link and every `?capture=` golden takes — has always done exactly
  `ex.fade = ex.target`. The scrub now agrees with the still instead of
  lagging behind it. `capture.py --check` reports MAE **0.00/255** on all ten
  goldens, `inspire@*` and `mission@*` included.
- **The exponential ghost is gone.** The old `if (fade < 0.012) fade = 0` guard
  left a residual reveal of 0.001–0.003 sitting at the Mission rest after any
  ride through Inspire. It now reads exactly 0.000.

### Root cause 2 — the drift integrator was recycling the STEERED buffer

The systemic half, and the one that answers "how we manage the spores".

`organism/spores.js`'s drift integrator ran its whole loop on `arr`. But while
the seat holds a dot, `arr` is not that dot's drift position: it is `heroP`
blended toward a braid path, and at the shipped taste value (`T_SHIPPED` 0.85)
the braid is **85%** of it. Differencing that back into `heroP` works for the
parts of the loop that are position-independent. The recycle test is not:

```js
if (x > 6.8 || y > 7.6 || y < 0.2 || x < gx - 2.5) { …recycle… }
```

That envelope is authored for the AMBIENT plume, which is shed from the back
half of the gills and blown +x. The braid deliberately puts dots all around the
rim, including upwind of `gx − 2.5`. So the test fired on dots whose ambient
selves had gone nowhere near a bound. Measured as recycles per 1.6 s (via
`sporeAge`, which resets to 0 on one):

| | before | after |
|---|---|---|
| Mission rest (hero only, the true ambient rate) | 4 | 2 |
| **Inspire rest (shed fully converted)** | **127** | **2** |
| peak over a deliberate ride, forward | 149 | 9 |
| peak over a deliberate ride, reverse | 147 | 14 |

A **~30x false recycle rate**, and every one of them teleported that dot's
`heroP` to its gill origin — `steer()` accepts a jump past `TELEPORT2` as the
dot's new hero home — and reset its `sporeAge`. The ambient population was
being quietly rewritten by the act of driving the chapter, and because `heroP`
is 15% of a converted dot's rendered position, that rewrite was on screen.

**The fix:** a dot the seat is holding has its ambient state carried in
`heroP`, and `arr` is left alone (steer overwrites it later in the same frame
anyway). Every other dot integrates `arr` exactly as it always did. Five lines:

```js
const held = inited ? writ : null;
…
const own = held !== null && held[i] === 1;
const src = own ? heroP : arr;
let x = src[i3], …
…
src[i3] = x; …
```

`steer()` needs no change and degenerates correctly: for a held dot `arr` is
untouched by drift, so its measured delta is exactly zero and the shadow it
maintains is the one the drift loop just wrote. Handover is continuous both
ways — the frame a dot converts, `writ` is still 0 and `heroP == arr`; the
frame it ceases, steer has already written `arr = heroP` and cleared `writ`.

### What the audit checked and CLEARED

Stating these matters as much as the two findings:

- **`exIdx[i]` and every per-dot draw** (`stag`, `stagW`, `perA`, `ph0A`,
  `h1A/h2A/sdA`, `coreA`, the stage boundaries) are computed once in
  `initSteer()` behind an `inited` guard and are never recomputed. No random
  draw is ever re-taken. *Latent hazard, not a live one:* `setDriver` replaces
  `exits` without clearing `inited`, so a second driver claiming the seat with
  different exit geometry would silently inherit the first one's assignments.
  Only Inspire claims the seat today, so nothing is wrong; it is written down
  here because it would not announce itself.
- **The free-running per-dot stage clock** (`t = tNow / perA + ph0A`) — an
  exact function of absolute time, not an integration. Identical in both
  directions. Legitimate, and kept.
- **`colorBase`** is captured once, before any dim, from pristine colours; the
  byte-exact restore holds (`sumLum` returns to 2746.2 at every rest, both
  directions, after any ride).
- **`sporeAge`** integrates, but only the corrupted recycle path was resetting
  it abnormally; fixing the source fixes it.
- **Seam hysteresis** (T1's `gate()`, the dwell) is deliberate and stays. It
  never reached the particles once the reveal became pure, because both its
  edges sit on exact zero.
- **`connect/tendrils.js`**'s own 108 drifting particles — a genuine second
  source, built once at chapter build; no per-frame integrator in it.
- **`uCoh` and the streak opacity** are still eased (`+= (target - v) * k`),
  and `computeAuto()` still carries deliberate hysteresis. These are hover and
  selection channels driven by the pointer, not by scroll, and no shed dot's
  `cv`/`pw`/position reads them. Left alone — noted as a residual, since it
  means chapter FURNITURE is still not a pure function of p.

### Forward vs reverse, after

Arriving at exactly the same p from below and from above, pinned and settled:

| p | Δcv mean | Δcv max | dots with Δcv > 0.05 |
|---|---|---|---|
| 0.30 | 0.000000 | **0.000000** | 0 |
| 0.34 | 0.000000 | **0.000000** | 0 |
| 0.37 | 0.000739 | 0.00641 | **0** |
| 0.40 | 0.001288 | 0.00462 | **0** |
| 0.41 | 0.000017 | 0.00028 | **0** |

**Not one dot in 4,200 differs by more than 0.05 at any matched p**, against
3,570 before. The residual at 0.37/0.40 is fully explained by the pin's own p
resolution: the two samples differ by ~1e-4 in p, and `deff/dp ≈ 16` there
times `dcv/drev ≈ 6.8 × T` predicts Δcv ≈ 0.0046 — which is the measured
`cv_max` to two figures. A brisk reverse approach agrees with a deliberate one
to the same tolerance, so the reveal is now rate-independent as well as
direction-independent.

### The three prior commits, re-measured

| metric | before | after |
|---|---|---|
| `b2c9584` dark-and-converted (lum < 0.15), Inspire rest | 225 | 238 |
| dark-and-converted, peak over a ride | 234–248 | 239–248 |
| dark-and-converted at lum < 0.05 (the black-in-air case) | 0 | 0 |
| boundary trough, deliberate fwd / rev | −3.52% / −3.53% | −3.44% / −3.79% |
| boundary trough, brisk fwd / rev | −2.35% / −3.73% | −3.86% / −3.33% |
| `9e2a277`/`2fdb4e6` arrival, deliberate fwd / rev | 3217 / 2950 ms | 3100 / 3100 ms |
| arrival, brisk fwd / rev | 1133 / 967 ms | 1033 / 1033 ms |
| three streams at the rest (`eff`) | [1, 1, 1] | [1, 1, 1] |
| rest legibility: dots above lum 0.60 / 1.00 | 2713 / 683 | 2716 / 708 |

All within run-to-run variance, and the arrival is now **symmetric**: forward
and reverse deliver the same 3100 ms deliberate / 1033 ms brisk, where before
they differed by 9% and 17%. Both remain an order of magnitude above the
~150 ms at which a luminance change reads as a cut, so `9e2a277` and `2fdb4e6`
are intact. Nothing fades in over open view; nothing was re-keyed.

### Residuals

- Chapter furniture (`uCoh`, streak opacity, `computeAuto`'s hysteresis) is
  still time-eased. Pointer-driven, so it does not break the scroll invariant,
  but it is the same class of thing.
- `setDriver` does not clear `inited`, as above.
- The ambient-fingerprint test (an 8³ spatial histogram of the shed at the
  Connect rest, fresh vs after a round trip) could not resolve the improvement:
  round trip 14.4% → 14.7%, wait-only control 12.3% → 10.9%, i.e. the natural
  drift churn over the same wall time is the same size as the effect. The
  recycle-rate collapse (127 → 2) is the direct evidence; the histogram is
  reported here only so it is not silently dropped.

---

## 2026-08-09 (D23) — the field arrived; the RETIRE was still a removal van

Hannah's fifth report in this family, and the first that names position
rather than light:

> "WHEN I GO FROM INSPIRE TO CONNECT THE SPORES STILL SHIFT WEIRDLY, LIKE
> THEY MOVE POSITION TO WORK FOR THE NEXT SECTION, IT LOOKS AWKWARD."

Every prior fix here addressed brightness — conservation, stagger, ramp
width, hysteresis. She is describing **physical rearrangement**, and she is
right: it was there, it was measured, and it was the retire.

### The instrument

`tools/capture.py`'s own CDP client driving a headless 1440x900 page
(`?nointro=1&steady=1&nosnap=1`), riding `scroll.setProgress` per rAF at a
fixed p-rate — deliberate 0.10 p/s and brisk 0.45 p/s (`MAX_SCRUB_RATE`) —
with all metrics computed in-page per frame over the full 4,200-dot buffer:
per-dot displacement per frame, direction coherence (|Σd| / Σ|d|), median
screen-space flow with the SAME camera applied to both endpoints (so camera
motion cancels and only particle motion counts), fraction of dots inside the
frustum, and the colour-buffer sums the earlier sections used. Hannah's own
pane was 534x317 at measurement time and cannot be trusted for rates;
nothing here was measured through it. Motion baselines, same instrument:

| | population mean speed | median screen flow | coherence |
|---|---|---|---|
| ambient drift (Mission / Connect rest) | 0.09 u/s | 7–8 px/s | 0.39 (slow, downwind) |
| braid alive, holding the Inspire rest | 1.29 u/s | 127 px/s | **0.02–0.15** |

The braid is full of motion (the per-dot stage clocks), but it is
*incoherent* — the pattern stands still while individuals cycle. That is
what "alive" looks like. Coherent population motion is what "rearranging"
looks like.

### It reproduces, and it is the unwind

`steer()` renders every converted dot at `heroP + (path − heroP) · cvT`.
On the exit leg the reveal collapses across **Δp ≈ 0.039** (p 0.372–0.411:
`out` falls from p 0.355 and the camera drops below the ARR ceiling az 78 at
p ≈ 0.372), so cvT falls 0.85 → 0 and every dot travels ~85% of its path
displacement back toward its old drift position. Riding forward through the
boundary, before:

| | deliberate | brisk |
|---|---|---|
| peak population speed through the collapse | **19.2 u/s** | **38.0 u/s** |
| … as multiples of braid-alive / ambient | 15x / 213x | 29x / 422x |
| sustained through the falling window | 3–11 u/s | 7–38 u/s |
| median screen flow at peak | **2,256 px/s** | 4,398 px/s |
| direction coherence at peak | **0.40** | 0.39 |
| net per-dot travel across the window, mean / max | 2.20 u / 6.8 u | 2.18 u / 6.7 u |
| dots moving > 1 u net | **3,512 / 4,200** | 3,507 |
| travel per unit p through the collapse | ~50 u/p | ~50 u/p |
| dots on screen while it happens | 83–97% | 85–95% |

At a deliberate rate the entire return trip fits in ~0.4 s, at 15–29x the
speed of everything else the shed ever does, with the whole population
moving the same way (coherence 0.40 against the braid's 0.02–0.15), centred
mid-frame around screen (720, 265) — the cap is on screen for the whole leg
(D20's own track: 624 → 321 px). Reverse rides show the mirrored wind-up at
25–33 u/s. And **no retiming can hide it**: the shed never leaves the frame
on this leg, and the D18 ceiling rule already bans a reveal running backward
in open view — the retire IS a reveal running backward, expressed in
position. `connect/tendrils.js` was checked and cleared: its 108 particles
ride `uPartAmp = sm(0.9, 1.0, litMin)`, which only opens as the ground
network reaches full light near p 0.487 — nothing of Connect's second
source exists on screen during the p 0.372–0.411 event.

### The fix — retire in place (`organism/spores.js` only)

The invariant Hannah has asked for five times over: one population,
continuous, whose appearance changes by **lighting**, not by rearrangement.
The rising half already obeys a version of it (the arrival gather is the
approved, motivated gesture). The falling half now does too, exactly:

- **A falling cvT moves the dot's ambient home, not the dot.** When a dot's
  cvT drops below last frame's (`lastCv`, new per-dot Float32Array), heroP
  is re-based so the rendered position is unchanged by the fall:
  `heroP' = path + (heroP − path) · (1 − c0) / (1 − cvT)`. Frame over
  frame the dot then carries only its drift share and its live path share —
  precisely what a dot at *constant* conversion shows. The braid does not
  march home; it is simply lit less, then left drifting.
- **Ceasing hands back in place.** The conv ≤ 0 release branch and
  `releaseSeat()` now adopt the buffer position as the dot's ambient home
  (`heroP = arr`) instead of writing `arr = heroP`. This is also the
  discrete-jump-safe face of the absorb: however much conversion a fast
  scrub drops in one frame, the dot stays put. (It also retires a latent
  teleport: the watchdog / driver-swap path used to snap every
  still-converted dot by cvT of its displacement in one frame.)
- **A rising cvT is untouched**, so every landing frame is bit-identical:
  lastCv primes at 0 and rises monotonically to any rest, deep link or
  `?capture=`, and the absorb branch never runs there.

The ambient positions are not sacred. The braid lives inside the drift's
own diagonal envelope by the D17 locus law, and measured at the full rest
only **7 of 4,200** braid positions sit outside the drift's recycle bounds
(all on the upwind `x < gx − 2.5` bound, worst −2.96) — so handing dots
back where they stand costs at most a handful of background recycles, at
the ambient rate's own scale (2 per 1.6 s).

**Alternatives weighed and rejected:**

- *Unwind more gradually* (stretch the collapse over the whole exit leg,
  re-derive T1): the shed is on screen the whole way, so this dilutes the
  migration (~6 u/s deliberate at the maximum stretch) without changing its
  nature, breaks D18's no-backward-ramp-in-view law openly, and starts
  dissolving the streams while the visitor is still at the rest.
- *Retire before the camera turns away*: same law, worse seat — the
  dissolution lands dead-centre in the approved rest framing.
- *Slew-limiting the blend* (cap per-frame position change): makes position
  rate-dependent, which un-does exactly the rate-independence D22 bought.

### After, same instrument

| | deliberate | brisk |
|---|---|---|
| peak population speed through the collapse | 19.2 → **2.06 u/s** | 38.0 → **1.84 u/s** |
| sustained through the falling window | 3–11 → **1.0 u/s** | 7–38 → **1.5 u/s** |
| median screen flow at peak | 2,256 → **216 px/s** | 4,398 → **212 px/s** |
| direction coherence at peak | 0.40 → **0.18** | 0.39 → **0.08** |
| net per-dot travel across the window, mean | 2.20 → **0.82 u** | 2.18 → **0.32 u** |
| dots moving > 1 u net | 3,512 → **924** | 3,507 → **332** |

The after numbers are the braid-alive baseline: 1.0–2.1 u/s against the
rest's own 1.29 u/s, coherence back in the alive band, and the residual net
travel is the stage clocks cycling over the ride's wall time plus ambient
drift — not migration. Riding the boundary at both speeds, nothing moves
but the light: the streams dim through the handoff exactly as before, and
the dots those streams were made of are simply the shed again, drifting on
from where the braid left them, relaxing over the following ~30–60 s of
drift. Re-entering Inspire from Connect after a forward pass re-lights and
re-gathers from those braid-shaped homes at 2–5 u/s, coherence ~0.15 (was
10–12 u/s at 0.40).

### What position path-dependence now means, stated plainly

cv is still a pure function of (reveal, per-dot hash) — measured per dot at
pinned p 0.37 and 0.40 from both directions, before-build vs after-build:
**max |Δcv| = 0.0000** on all four pins, so D22's forward/reverse agreement
gate is untouched to the bit. Positions were never pure in p (the drift
integrates, the stage clocks free-run), and this change makes their
path-dependence *deliberate*: after a ride through Inspire the shed's
ambient homes keep the braid's shape, unlit, dispersing under drift. That
lingering shape is inside the drift envelope (D17), carries ambient colour
(byte-exact restore holds), and is the honest version of "the same spores" —
they really are wherever you last saw them.

### The four prior commits, re-measured (one instrument, before → after)

| metric | before | after |
|---|---|---|
| `b2c9584` dark-and-converted, Inspire rest (live sample) | 214 | 244 (D22 band 225–248) |
| … peak over boundary rides | 240–283 | 243–286 |
| boundary trough, deliberate fwd / rev | −3.6% / −4.1% | −3.1% / −3.7% |
| boundary trough, brisk fwd / rev | −3.4% / −4.1% | −3.2% / −2.0% |
| `9e2a277`/`2fdb4e6` arrival: per-dot cv(p) schedule | — | **bit-identical** (pins, 4x max Δ 0.0000) |
| arrival 10–90% on this harness, deliberate / brisk | 433 / 135 ms | 567 / 183 ms (pacing noise; code path untouched) |
| `e2bd6e8` fwd/rev per-dot Δcv at pinned p | 0.0000 | **0.0000** |
| … drift recycles per frame over rides | 0–1 | 0–1 |
| three streams at the rest: screen-x density profile | — | corr 0.943 fresh, **0.926 after a full round trip** |
| rest legibility, dots > 0.60 / > 1.00 luminance (live sample) | 2441 / 526 | 2395 / 494 (cadence phase; frozen rest bit-identical) |

### Gates

- **`capture.py --check` PASS, worst MAE 0.00/255 on all ten goldens** —
  `mission@*` 0.00 (byte-identical, the required proof), `inspire@*` 0.00
  (the landing-frame no-op is exact, not approximate), `connect@*`,
  `owned@*`, `final@*` 0.00.
- **Console clean** over a full p 0 → 1 → 0 ride: the two expected info
  lines, zero warnings, zero errors.
- **Nothing fades in over open view**: no opacity, reveal or colour
  schedule was touched — the diff is position bookkeeping only.
- **Camera untouched**: no key, ramp, seam or route value changed;
  `journey/` has no diff.
- Reverse scrubs: cv agreement exact (above); the visible reverse gesture
  is now hand-back-in-place both ways, which is the same lighting-only law
  forward and backward.

### Residuals

- **A fresh page deep-linked at/past Connect, scrubbed backward into
  Inspire, still gathers from the diffuse cloud** at 9–11 u/s (coh 0.38) —
  exactly the before-fix behaviour, unchanged by this change, because a
  rising conversion must move dots or the braid never forms. It is the
  arrival gesture played from the near side, compressed into the exit leg's
  reveal window. If it ever draws a report, the lever is the reveal
  schedule on the exit side (chapter file), not the spore system.
- Under live handheld camera jitter (steady off), cv wiggles a few 1e-4 per
  frame, so the absorb ratchets ambient homes toward the braid while a
  visitor parks mid-arrival — bounded by the braid−home distance, inside
  the D17 envelope, and each step is orders below perception. Noted so
  nobody rediscovers it as a mystery drift.
- The QA transform dial (`?t=`, `[`/`]`) now absorbs on lowering rather
  than sliding dots home — calmer than before, but a QA-visible behaviour
  change worth one line here.

---

## 2026-08-09 (D24) — coming home gathers like arriving, not like moving day

Hannah's sixth report in this family, pinning the direction D23's residual
predicted:

> "The spores still shift/rearrange awkwardly at the Inspire/Connect
> boundary … it particularly happens when I scroll BACK to the Inspire
> section from the Connect."

D23 retired the outbound half (a falling reveal changes lighting only) and
recorded, verbatim: *"a fresh deep-link at/past Connect scrubbed backward
still gathers from the diffuse cloud at 9–11 u/s (pre-existing, unchanged —
the arrival gesture from the near side; lever is the chapter's exit-side
reveal schedule if ever reported)."* This is that report.

### Instrument

D23's, rebuilt on `tools/capture.py`'s own CDP client: headless 1440x900
(`?nointro=1&steady=1&nosnap=1`), riding `scroll.setProgress` per rAF at
0.10 p/s (deliberate) and 0.45 p/s (brisk, `MAX_SCRUB_RATE`), all metrics
in-page per frame over the full 4,200-dot buffer. Baselines re-measured to
anchor comparability: ambient drift **0.09–0.10 u/s** (D23: 0.09), braid
alive at the rest **1.14–1.32 u/s** p25–p75, coherence ≤ 0.28 (D23: 1.29 at
0.02–0.15). Peak speeds below are 3-frame rolling unless marked (1f) — the
journey applies a scrub's p-step one frame after it is set, so a
single-frame peak lands on catch-up frames with 3 ms deltas and reads high
by an order of magnitude. The measurement harness's own artifact, named so
nobody chases it.

### Reproduction (fresh deep link at p 0.50, scrubbed backward)

| | deliberate | brisk |
|---|---|---|
| peak population speed (1f) | **12.6 u/s** | **46.1 u/s** |
| … as multiples of braid-alive / ambient | 10x / 130x | 36x / 480x |
| sustained p25 / p50 / p75 | 1.15 / 2.08 / **4.59 u/s** | 0.15 / 8.86 / **20.2 u/s** |
| direction coherence at peak | **0.38** | 0.36 |
| net per-dot travel across the window, mean / max | **2.18 u** / 7.0 | 2.17 u / 7.0 |
| dots moving > 1 u net | **3,513 / 4,200** | 3,497 |
| travel per unit p | ~51 u/p | ~51 u/p |
| dots on screen while it happens | 82–99% | 83–98% |

The whole shed converges onto the braid paths inside the exit leg's
Δp ≈ 0.04 reveal window (`out` falls p 0.355→0.415, the ARR ceiling az 78
crosses at p ≈ 0.372), at 10x the braid's own living motion, coherently,
in open view. The mirror of what D23 removed.

### The calibration that set the target

The same instrument was pointed at the APPROVED gesture — a fresh page
riding forward from Mission into Inspire, the arrival Hannah signed off:

| approved entry (fwd) | deliberate | brisk |
|---|---|---|
| peak (1f) | 7.2–8.2 u/s | 16.4 u/s |
| sustained p50 / p75 | 1.32 / 2.13 u/s | 1.42 / 10.7 u/s |
| coherence max | 0.44–0.55 | 0.60 |
| net travel mean / dots > 1 u | **2.01 u / 3,308** | 1.63 u / 2,612 |
| window | Δp ≈ 0.17 | Δp ≈ 0.17 |

So the approved arrival is NOT still — it is the same class of directed
gather, at the same net travel, spread over 4x the scroll. The offense
inbound was never the gesture; it was the compression. The target is
therefore parity with this table, not with the braid-alive floor.

### The fix — two halves that compose

**1. Arrive nearby (`organism/spores.js`).** The dot-to-slot pairing was
frozen at `initSteer` from an RNG stream — convention, never geometry. At
every seat ENGAGE (the `!wasActive` prime), each still-unconverted dot is
re-paired with the nearest free slot of its own exit cohort (grid-hashed
greedy nearest, deterministic order, one-time cost 0.4–0.5 ms). A swap
between two conv = 0 dots is invisible at the swap frame by construction
(the cease branch renders nothing from the slot tuple), converted dots are
never touched, swaps are exit-local so `exIdx`/`stag`/`stagW` stay with the
dot — which is what keeps cv a pure function of (reveal, hash) and the D22
gate exact. Measured matching (?tkdbg probe): mean dot-to-slot distance
2.17 / 2.83 / 2.68 u per exit before, **1.20 / 1.93 / 1.89 u** after.
Not further: the braid at any instant is a filament set inside a
volumetric cloud, so any bijection has a **transport floor** — re-pairing
alone cut net travel only 2.18 → 1.79 u. Necessary, not sufficient.

**2. The gather drive (`chapters/inspire/index.js` → seat).** The position
blend's schedule is split from the lighting's. Lighting rides `eff`
untouched. The blend rides `cvP = conv * T * gather`, where `gather` is a
new per-frame drive, pure in p: 1 through the whole rest framing, falling
to 0 across **p 0.315 → 0.415** (route-derived, `endOf('inspire') − 0.065`
to `+ 0.035` — reaching zero exactly where `out` does, so the seat goes
quiet at the same p and the T1 seam derivation stands). Forward, the fall
is invisible: a falling position blend is absorbed in place (D23), so the
braid dims exactly as before while its living motion quiets — measured
1.36 → 0.09 u/s across the leg, a smooth ramp, no step. Inbound, the same
Δp 0.10 window paces the transport share at the approved gesture's rate.
The conservation floor in the draw-on gate stays on `cvL = conv * T` — the
lighting share — because it must match what `dim()` takes.

### After, same instrument

| inbound (rev) | deliberate | brisk |
|---|---|---|
| peak population speed (3-frame) | 12.6 → **3.3 u/s** | 46.1 → **19.3 u/s** |
| sustained p50 / p75 | 2.08 / 4.59 → **2.28 / 2.90** | 8.86 / 20.2 → **8.18 / 12.1** |
| coherence at peak | 0.38 → 0.42 | 0.36 → 0.50 |
| net per-dot travel, mean | 2.18 → **1.90 u** | 2.17 → **1.66 u** |
| dots moving > 1 u net | 3,513 → 3,064 | 3,497 → 2,646 |
| travel per unit p | ~51 → **~19 u/p** | ~51 → ~17 u/p |

Against the approved entry's own row: deliberate inbound now peaks BELOW
the approved gesture (3.3 vs 7.2–8.2) at the same coherence class and the
same net travel; brisk is at parity (19.3 vs 16.4 peak, 12.1 vs 10.7 p75,
1.66 vs 1.63 u net). The dots still move — they must, the streams have to
end on their paths — but they move the way the approved arrival moves,
paced over Δp 0.10 instead of crammed into 0.04. On screen (8-step
backward scrub strip, p 0.42 → 0.30): the shed lights in place as a
diffuse emphasis, brightens, and condenses gradually while the camera
swings — the three braids resolve by the rest. No beat where the field
reorganizes.

### Rejected, with reasons

- **Widening the exit-side reveal schedule** (the lever D23's residual
  named): `eff` carries LIGHTING. Stretching `out` drags the streams'
  dimming into Connect's approach (its first key is p 0.410, rest 0.487)
  or starts the dissolution inside the approved rest framing — D23
  rejected that seat once already — and forces a T1 re-derivation, all to
  buy at most ~2x. Splitting position from lighting buys 2.3x with the
  forward look untouched.
- **Re-pairing alone**: transport floor, measured above. Kept, but only as
  half the fix.
- **Phase-matching** (choosing `ph0A` freely so each slot's path point
  lands beside its dot): the best distance coverage of all — the path
  curve spans the whole envelope — but it skews the stage-clock phase
  distribution the approved rest depends on (uniform), and the skew
  persists for a full period (7–15.5 s) after a backward arrival parks at
  the rest. Rest legibility is not for sale.
- **Gather while off-screen / occluded**: not available. 82–99% of the
  population is on screen through the entire window (measured, both
  directions — same finding as D23).
- **Slew-limiting the blend**: rate-dependence; rejected on D22/D23's
  precedent without re-litigating.

### The five prior commits, re-measured

| metric | before (this session) | after |
|---|---|---|
| `b2c9584` dark-and-converted, Inspire rest | 204–242 (D22 band 225–248) | **208–242** |
| … at the Connect end of a forward ride | 0 | **0** |
| boundary trough, deliberate fwd / rev (endpoint-line ref, stashed-tree A/B) | −5.9% / −6.7% | **−5.9% / −6.6%** |
| boundary trough, brisk fwd / rev | −6.5% / −7.8% | **−6.8% / −5.6%** |
| `9e2a277`/`2fdb4e6` arrival 10–90%, deliberate / brisk | 783 / 174 ms | **802 / 132 ms** (pacing noise; ramps untouched) |
| `e2bd6e8` fwd/rev per-dot Δcv at pins 0.30/0.34/0.37/0.40 | 0.0000 | **0.00000 exact, 0 dots > 0.05** |
| … drift recycles per frame, full 0→1→0 ride | 0–1 | **avg 0.026, max 3** (ambient ~2 / 1.6 s) |
| `30fd839` outbound retire, peak / net / dots > 1 u (deliberate) | 2.06 u/s / 0.82 u / 924 | **1.05 u/s / 0.24 u / 281** |
| … brisk | 1.84 u/s / 0.32 u / 332 | **0.88 u/s / 0.07 u / 38** |
| three streams at the rest, hot60 / hot100 | 2716 / 708 (D22) | fresh **2701 / 698**, after backward arrival **2721 / 719** |
| screen-x density profile corr vs fresh | 0.926–0.943 (D23) | round trip **0.990**, backward arrival **0.970** |

The outbound retire IMPROVED: the gather damp quiets the braid's cycling
progressively before the dim, so even less residual motion crosses the
boundary forward than D23 shipped.

### Gates

- **`capture.py --check` PASS, worst MAE 0.00/255 on all ten goldens.**
  No golden was re-shot: `mission@*` and `inspire@*` are the files already
  on disk, byte-identical, and the fresh captures match them to 0.00 —
  the landing-frame no-op is exact. At reveal 1 every dot's conv is 1, so
  zero dots are refit-eligible and `gather` is 1 at every rest: both new
  mechanisms collapse to identity at every landing frame by construction,
  and the gate confirms it on pixels.
- **Console clean** over a full p 0 → 1 → 0 ride and over every
  reproduction ride, both directions, both rates: zero warnings, zero
  errors.
- **Nothing fades in over open view; no self-ignition**: no lighting,
  reveal or colour schedule changed — `eff`, the ARR ramps, `out`, the
  dim exchange and `pw` are byte-identical code paths. `gather` is
  monotone per leg and drives position only.
- **Camera untouched**: no key, ramp, seam or route value changed.
- **Forward/reverse mirror**: cv agreement exact (table above); position
  path-dependence remains deliberate (D23) and now includes the engage
  refit, same class as `heroP`.
- **Cost**: refit 0.4–0.5 ms once per seat engage; steer per-frame
  1.15 ms (`?tkdbg`), unchanged loop shape — one extra multiply per dot.

### Residuals

- **Brisk inbound still peaks ~19 u/s (3-frame)** — but the approved entry
  gesture itself peaks 16.4 u/s at `MAX_SCRUB_RATE`; at the scroll clamp,
  travel/time is bounded below by net travel over window time for any
  schedule. Parity with the approved gesture is the design target this
  pass adopted; going below it means less net travel, which means less
  braid, which is a taste call for Hannah, not a bug.
- **The forward exit leg's braid life now quiets progressively**
  (1.36 → 0.09 u/s across p 0.315 → 0.415) while the streams dim. Smooth,
  measured, and arguably the calmer read — but it is a visible-in-principle
  change to the forward leg, recorded here so it is traceable to this
  commit if it ever draws a note.
- **A minority of dots keep their RNG slots at brisk engages**: dots whose
  conv is already > 0 on the engage frame (the reveal can step ~0.05–0.2
  in one brisk frame) are ineligible for refit by design — swapping a
  partly-converted dot would pop it. ~5–15% of the shed at 60 fps; they
  gather from wherever they are, paced by the same gather drive.
- **The slot matching is greedy in dot-index order** — early dots get the
  nearest slots, the tail takes what remains (the far counts in the probe
  table). An optimal-transport assignment would shave the residual, at
  real cost and for a gesture that now reads correctly. Not pursued.
- The `slotPoint` evaluator is a wobble-free mirror of `steer()`'s staged
  path. If the choreography is re-authored, it should be updated in the
  same commit; divergence degrades matching quality only.

---

## 2026-08-09 — THE HOVER HOLD: a chip stops riding the wind while you are on it

Hannah: *"when I'm hovering over the items like Arca Gidan Prize, ArtCompute,
2RP — can you make it so that it stays in place so it doesn't actually move
when I'm hovering over it? Right now they get moved by the wind and stuff, and
if they're being moved when I hover it causes a weird shudder."*

### What was happening

She is right about the cause, and the measurement says the wind is the whole
of it. A chip is projected every frame from a world anchor (`ui.js`, the
hotspot loop); Inspire's three anchor mid-plume, on the streak head the breeze
is carrying (`labelOffsets` / `nodeWorld`, this chapter's index.js). Traced at
the Inspire rest over 12 s at 1440×900, decomposed by re-projecting a FIXED
world point through the same live camera:

| chip | total wander | of which the CAMERA | max step between frames |
|---|---|---|---|
| artcompute | 29.5 × 41.5 px | 0.65 × 0.62 px | 2.72 px |
| arca | 28.3 × 29.0 px | 0.65 × 0.62 px | 2.07 px |
| tworp | 14.8 × 12.6 px | 0.65 × 0.62 px | 1.07 px |

98% of it is the anchor, not the lens — the handheld layer is zeroed at every
route rest, so the camera's contribution at a rest is essentially nil. A 41 px
target that slides out from under the pointer is not a target; that is the
shudder.

**Connect's hubs and Owned's faces do NOT have it.** Same mechanism, but their
anchors are static world points: traced the same way, `ados` and
`contributor-0` wander 0.65 × 0.62 px — the camera-only floor, i.e. nothing.
The fix is in the shared loop, so they get it anyway; they simply had nothing
to be fixed.

### What it does now

A HOT chip — hover, keyboard focus or touch-armed, i.e. the same `hot` state
the chip's own lit read runs on, so all three channels get the same answer —
freezes its **world anchor**, not its screen position. Freezing the anchor is
what keeps it honest: the chip stops riding the wind but keeps riding the
LENS, so a wheel scroll or a nav jump under a held hover still carries it with
the scene instead of pinning it to the glass.

Everything downstream derives from the same `w` — the dot, the pill's flip and
nudge hysteresis, the hit pad's centre AND its projected radius, the copy-rect
suppression test, and `placePop()` off the chip's own rect — so they all hold
still together and none of them can disagree about where the node is.

`constants.js` gains `HOTSPOT_HOLD_HOME_K = 6.0`; `ui.js` gains
`holdAnchor()` and two per-hotspot fields (`holdAt`, `holdOff`).

**It cannot drift out of alignment on a long hover.** The anchor's motion is a
bounded oscillation, not a drift: traced over 24 s, the live anchor's distance
from a fixed one runs 0 → 39 px → 0 with a ~5 s period and returns under 1 px
four times. The held chip's error is bounded by the swing, never accumulates,
and the node keeps coming back to it.

**Release is a movement, not a jump, and it provably ends.** Going cold turns
the held point into an OFFSET which then decays geometrically to zero and is
dropped. Deliberately not a lerp of the held point toward the live one: the
live one is moving, and a first-order lag chasing a moving target settles at a
nonzero steady-state error (measured here — the anchor's typical 0.27 px/frame
against a 0.1/frame gain parks the chip ~2.7 px behind its node, forever). A
chip hovered once would have carried a permanent low-pass filter for the rest
of the ride. Decaying the offset converges whatever the node does.

### Gates

- **Held trace, artcompute, 6 s each phase**: free 29.5 × 41.5 px, max frame
  step 2.89 px → **held 0.65 × 0.62 px, max frame step 0.70 px**. The residual
  is exactly the camera-only figure above: 100% of the scene-driven motion is
  gone and only the lens is left, which is the intent. Released: tracking
  again, hold dropped (`holdAt`/`holdOff` both null).
- **Popover (d1ecc23) not regressed**: `ui.popNode` reports the hovered node
  while hot on both `artcompute` and `ados`; it is re-placed each frame off a
  chip that is now still, which is the condition it was designed for.
  `contributor-0` correctly reports none — contributors open a card, not a
  popover.
- **Hit pad (696e95d) not regressed**: `contributor-0` holds `hitR` 21.82 px
  / `--j-hit: 43.6px` / a 44×44 pad, `hitR_range` 0.000 while held (the pad
  does not breathe either, because its depth comes off the same held anchor),
  and `elementFromPoint` at the pad's centre resolves inside the button.
- **Frozen path untouched**: `dt === 0` (deep link, `?p=`, the `?capture=`
  freeze) drops any hold outright and nothing is hot there.
  **`capture.py --check` PASS, worst MAE 0.00/255, all ten goldens.**
- **Console** clean over a full 0→1→0 ride that hovers and releases every chip
  in all three chapters; p = 0 restores the hero pose exactly
  (−2.25, 2.25, 10.4), fov 38, fog 7/20, nothing armed, no hold left over.

### Residuals

- **A held chip can sit up to ~39 px off its node** at the worst phase of the
  plume's swing (Inspire only — the other two chapters' anchors do not move).
  That is the same 39 px the chip used to travel THROUGH while the pointer was
  on it; holding it is what was asked for, and the oscillation brings the node
  back rather than walking away from it. If it ever wants tightening, the
  lever is the anchor itself (a smoothed plume sample in this chapter's
  `nodeWorld`), not the hold — but that would move the resting composition and
  the goldens with it.
- **The hold is on `hot`, so keyboard focus freezes a chip too.** Deliberate
  (one visual, three reasons — `ui.js` `refresh()`), and it means a tabbed
  chip is as steady to read as a hovered one; noted because it is a behaviour
  change for the keyboard path that nobody reported.

---

## 2026-08-09 (D25) — the seventh report is not a bug in the model; it IS the model

Hannah's seventh report in this family, now explicitly asking for a rethink:

> "There still seems to be a completely different stream of spores or
> something that appears when I enter the Inspire section that causes a lot
> of jankiness. Can you try to understand what this might be? How could we
> rethink this so it doesn't look like it changes completely when I move
> into it, from above or below?"

Six rounds — `b2c9584`, `9e2a277`, `2fdb4e6`, `e2bd6e8`, `30fd839`,
`4feb006` — each fixed a real defect, each was measured, and each reduced
the symptom without removing it. This section records why that was
inevitable, what was measured before anything was changed, the model that
shipped, and the evidence.

### Why six rounds of refinement could not remove it

The model held **two unrelated arrangements of the same 4,200 dots** — a
free wind-blown drift and a designed braid — and asked a reveal to swap
between them at a section edge. Every prior fix refined the SWAP: conserve
its light (b2c9584), stagger its cohorts (9e2a277), widen its ramps
(2fdb4e6), purify its schedule (e2bd6e8), absorb its fall (30fd839), pace
and re-pair its rise (4feb006). After all six, position was continuous,
light was conserved, the schedule was pure — and the field still reads as
replaced, because three channels still switch **as a category, at the
seam**, measured at HEAD on the live 4,200-dot buffer (1440x900 headless,
`?nointro=1&steady=1&nosnap=1`, capture.py's own CDP client):

1. **The hot class.** The ambient shed has **zero** dots above luminance
   1.0, at every p, ever (its own P99 is ~0.90). The lit braid carries
   **~700** (17% of the shed — PLUME_GAIN x the kn⁴ cadence). Every entry
   therefore marches a sixth of the population into a luminance class that
   does not exist in the state being left — h10 ran 0 → 674 in **Δp 0.041**
   entering from Connect, where the ARR azimuth ramps are already saturated
   and the single shared `out` envelope (Δp 0.06, all three exits at once)
   was the whole schedule. The Mission side got its cascade in `2fdb4e6`;
   the Connect side never had one.
2. **The motion signature.** Ambient drift: 0.09 u/s, coherence 0.4-0.5
   (slow, downwind, together). Braid alive: 1.3-1.9 u/s, coherence
   0.02-0.15 (fast, cycling, independent). Sustained — not the transport
   spike, the STANDING character — swaps 14-20x across the same seam, both
   directions. Dust that begins to stream IS "a different stream of
   spores", at zero position error.
3. **Literal jank.** On a cold page, the first crossing froze: **267 ms +
   118 ms** frames at p ≈ 0.09 entering from Mission, **415 ms** at
   p ≈ 0.407 entering from Connect (fresh deep link), 150 ms at p 0.355
   forward. Lazy shader compilation of the chapter groups' programs at
   first visibility, lazy `initSteer`, and `refitSlots` — whose greedy
   matcher degenerates from the Connect side (downwind cloud vs
   source-bunched slots) and measured **360 ms in one frame** at engage.
   The freeze lands at the exact scroll position where the field
   transforms, every session, both directions.

That is the whole of the seventh report: a category switch in appearance
and motion, stapled to a real frame freeze, at a section edge. No pacing
of the old swap removes any of the three.

### The model shipped: the routes are part of the world; arriving lights them

The Connect chapter already solved this shape of problem once (`f9e8317`):
the paths exist quietly as part of the world, and arriving only lights
them. This is that model for the shed, in three parts:

- **The standing route-ride floor** (`FLOOR_B = 0.35`, chapter-side;
  `floor` through the seat; `organism/spores.js` composes the position
  blend as the LERP `cvP = fl·(1 − conv·g) + T·(conv·g)`). Inside the
  chapter's reach the dots are ALWAYS drawn 0.35·T ≈ 0.30 of the way onto
  their slot paths — so they already carry the routes' living motion,
  faintly, before, during and after anything lights. The floor ramps in
  across the QUIET runways on both sides (p 0.015 → 0.085 before the
  earliest reveal onset at az 5 ≈ p 0.105; p 0.478 → 0.415 between the
  Connect rest and the first light at 0.430), pure in p, monotone per leg,
  position/motion only — a floored dot at conv 0 renders its full ambient
  colour, so the floor cannot self-ignite. 0.35 sits deliberately under
  the ~0.78 lobe threshold from the D18 T sweep: the unlit field still
  reads as ONE diffuse wind-blown plume (verified on screen at p 0.081 —
  no three-column spoiler at ambience), while the reveal's remaining
  travel drops by a third and — the real point — entering now TIGHTENS a
  flow that already exists instead of conjuring one. Ramp pacing measured
  on a continuous ride from p 0: peak 1.15 u/s at coherence ~0.5, unlit —
  braid-alive scale, an order under the old boundary transport.
- **The Connect side gets its cascade** (per-exit retire envelopes
  replacing the one shared `out`): ArtCompute 0.352 → 0.430, Arca
  0.358 → 0.418, 2RP 0.365 → 0.405. The source stream is widest and last
  out — forward, the migrants hand back first and the visible stream
  lingers (the delta played backward); entering from Connect, the source
  organizes first, then Arca peels off, then 2RP — the same authored order
  as the Mission-side ARR cascade. All three are exactly 1 at the rest and
  through p 0.35 (the approved framing never dims) and exactly 0 by 0.430,
  inside T1's re-arm edge at p 0.44 and release at 0.46 — the seam
  derivation stands unchanged. The gather widens to 0.315 → 0.425 to pace
  the condensation under the new window.
- **Nothing compiles, allocates or matches at the boundary any more.**
  `seat.prime()` runs `initSteer` at chapter build; journey boot warms
  every chapter's GPU programs (`compileAsync`, KHR parallel) and then
  first-draws each chapter group once into a small offscreen target in
  per-chapter idle slices (one all-at-once warm render measured ~150 ms —
  sliced so no task exceeds a few tens of ms); the D24 refit is rebuilt as
  a **budgeted, resumable job** — dense linked-cell grid (integer keys),
  swap-removed free list, 1,100 dots matched per frame, one exit applied
  atomically at a time, run only while every reveal is exactly 0 and
  abandoned un-applied if light begins first. 360 ms in one frame → 29 ms
  across ~10 frames, same matching quality (post-refit mean dot-to-slot
  1.21 / 1.88 / 1.84 u against D24's 1.20 / 1.93 / 1.89). And because a
  conv-0 dot under the floor is no longer parked on `heroP`, the apply is
  made **render-invariant**: `heroP' = heroP + (oldPt − newPt)·fl/(1−fl)`,
  the retire-in-place algebra again — without it the tuple swap jumped the
  runway at 5.8 u/s (measured, then removed: runway peak back to the
  ramp's own 1.1 u/s).

Identity at every landing frame is arithmetic, not tolerance: the lerp is
exactly `T` at conv 1 (rest golden), the floor is exactly 0 at p = 0, at
the Connect rest and beyond (their goldens), and the refit queue drops
whole at any landing frame because the reveal is already 1 there.

### Rejected, with reasons

- **Making the ambient drift itself follow the routes at all times,
  everywhere** (the literal "always travel their three routes"): the
  landing view's live stationary distribution is the seeded scatter plus
  the shipped integrator; a route-following field has a different
  stationary distribution, so the landing would visibly evolve over the
  first minute, on the hero frame this project froze first (`06-mission-
  preservation.md`). The floor gets the same invariant inside the
  chapter's reach without touching the drift law: `heroP` still integrates
  the byte-identical ambient rules, and the rendered bias collapses to
  zero outside the window.
- **Conversion gated at the dot's own rebirth** (join the braid only at
  the gill source, flow-through instead of transport): ambient turnover
  through the source is minutes, and forcing it means teleporting mid-sky
  dots to the gills — a de-ignition in open view. Rejected on the D18 law.
- **A never-steered reserve / bimodal T** (the "shedShare" residual from
  2026-08-06): both change the approved rest arrangement — the inspire
  golden moves. Out of scope by the brief's own rule ("stop and report
  before re-shooting"); not needed once the emphasis reads as lighting.
- **Floor above the lobe threshold** (≥ 0.5): the unlit field starts
  resolving into columns — the routes must stay a bias, not a channel.
- **Slew-limiting or time-easing any of it**: rate-dependence, rejected on
  `e2bd6e8`'s precedent without re-litigating.
- **Widening the Connect-side window past 0.430**: T1 re-arms backward at
  p 0.44 (`seams.js`, derived) and the Connect approach owns the frame
  from there; the lighting window is structurally boxed to [0.35, 0.435].
  The cascade spends the whole box; the box itself is a settled trade.

### Before / after — all four crossings, one instrument, stashed-tree A/B

3-frame rolling population speed, full-buffer, like-for-like runs (the
"before" column re-measured on the stashed HEAD tree in the same session,
same machine load — the D23/D24-era published numbers were shot on a
2x-slower headless cadence and are not directly comparable):

| crossing, deliberate 0.10 p/s | before | after |
|---|---|---|
| Mission → Inspire, lit-window peak | 6.22 u/s | **5.06 u/s** |
| … quiet-runway peak (unlit) | 0.11 u/s | **1.15 u/s — the floor ramp, by design** |
| Connect → Inspire, lit-window peak | 2.44 u/s | **1.85 u/s** |
| Inspire → Mission peak | 1.56 u/s | **1.57 u/s** |
| Inspire → Connect peak | 1.49 u/s | **1.40 u/s** |
| Connect-side h10 (hot-class) arrival | 0 → 674 in Δp 0.041, onset 0.403 | 0 → 709 in **Δp 0.050, onset 0.415, sequenced, peak step −35%/unit p** |
| Mission-side h10 rise 10→90% | Δp 0.046, max step 53/frame | **Δp 0.047, max step 48/frame — untouched** |

Fresh-page brisk entries (0.45 p/s, `MAX_SCRUB_RATE`, 3 trials each, both
trees, the gesture as Hannah actually makes it):

| | before | after |
|---|---|---|
| Mission → Inspire peak | 18.7 / 22.0 / 19.8 u/s | **13.3 / 12.9 / 13.3 u/s (−35%)** |
| Connect → Inspire peak | 8.0 / 16.6 / 3.5 u/s (wild) | **10.6 / 8.4 / 10.1 u/s (stable)** |
| … median screen flow at peak | 2,169–3,211 px/s | **625–1,145 px/s (−3x)** |

Frame time through the crossings (light probe, dt only, fresh pages):

| scenario | before (max frame) | after |
|---|---|---|
| COLD Mission → Inspire | **267 ms** (+118, +100) | **35 ms** |
| COLD Connect → Inspire (deep link) | **415 ms** | **35 ms** |
| warm crossings, both directions | 50–184 ms spikes | **≤ 35 ms** |
| every scenario, median | — | 16.7 ms (display-locked) |

Baselines re-anchored: ambient drift 0.09–0.11 u/s; braid alive at the
rest p50 1.29 u/s, peak 1.65; the floor's standing motion sits at ~0.2 u/s
ambient-side of the window and blends smoothly into braid-alive inside it.

### The six prior commits, re-measured on the shipped tree

| metric | result |
|---|---|
| `b2c9584` dark-and-converted at p 0.147 / 0.167 / 0.26 / 0.385 | **203 / 231 / 226 / 193** — all at or under the resting band (225–248); 0.385 well under |
| `9e2a277` + `2fdb4e6` Mission-side arrival | ramps untouched byte-for-byte; h10 rise Δp 0.046 → 0.047, max step 53 → 48 |
| `e2bd6e8` fwd/rev per-dot Δcv at pins 0.30/0.34/0.37/0.40 | **0.00000 exact, 0 dots > 0.05, all four pins** |
| `30fd839` outbound retire (Inspire → Connect) | peak 1.40–1.81 u/s, net 0.35–0.90 u — at/under the before column |
| `4feb006` inbound gather (Connect → Inspire) | deliberate peak 2.44 → **1.85**; brisk screen flow **−3x**; refit quality preserved (above) |
| `c6bbbab` three streams at the rest | `inspire@*` goldens **0.00 / 0.00 — byte-identical**, which is the strongest possible form of the gate |

### Gates

- **`capture.py --check` PASS, worst MAE 0.00/255 on all ten goldens.**
  `mission@*` byte-identical (floor is 0 at p = 0 and the drift law is
  untouched); `inspire@*` byte-identical (lerp = exactly T at conv 1; the
  refit queue drops whole at reveal 1); `connect@*`, `owned@*`, `final@*`
  0.00. Nothing re-shot; `manifest.json` untouched.
- **Console clean** over full p 0 → 1 → 0 rides and every reproduction
  ride: zero warnings, zero errors, zero exceptions.
- **No self-ignition.** Total conversion mass is single-humped in both
  directions (0 re-dips on the rise, 0 re-rises on the fall, 208/190
  sampled frames); every retire envelope and the floor are monotone per
  leg by construction; the floor drives position only.
- **Reverse mirrors.** cv exact at all pins (above); position
  path-dependence remains deliberate (D23/D24 doctrine, now including the
  floor's engage-time refit and the render-invariant rebase, which edits
  `heroP` without moving a rendered dot).
- **Restore discipline.** p returns to exactly 0; total ambient luminance
  returns to exactly 2746.2 (the byte-exact base) after every ride.
- **T1/T2 derivations stand**: reveal still zero at both T1 edges (master
  zero below az 5 at arm; every envelope zero from p 0.430 < relax edges).
- **Cost.** Steer's per-frame loop shape unchanged (one lerp replaces one
  multiply); the floor keeps the seat active over p 0.015–0.478 (~1 ms
  class, previously ~0.09–0.46); refit ≤ ~3 ms/frame for ≤ 10 frames per
  engage; boot warm runs once, off the critical path, in idle slices.

### Residuals / open

- **Placements are still placements.** A nav jump or deep link landing
  inside the window engages the floor (and at a rest, the full braid) in
  one frame — the whole page teleports on a placement, and that contract
  (`placeAt`, "place, never replay") predates this work. Noted because the
  floor makes the engage frame *technically* a position step for unlit
  dots; it is invisible inside a full-scene jump.
- **The measurement harness discovered the idle resolution glides p toward
  the nearest rest even under `?nosnap=1`** during any settled hold via
  `setProgress` placements. Harness-side re-assertion fixed the
  instrument; whether `?nosnap=1` SHOULD suppress that glide is a QA-flag
  question left open — it does not affect visitors.
- **The brisk refit depends on its runway arithmetic**: 5 frames of work
  against ~6.5 frames of quiet at `MAX_SCRUB_RATE` 0.45. If the scrub
  clamp or the route timing ever changes, re-derive (the failure mode is
  graceful — abandoned cohorts keep RNG pairing — but the gather pays it).
- **The hot class still arrives**; it is the approved emphasis. What
  changed is that it arrives sequenced on both sides, onto a field whose
  structure and motion no longer switch underneath it, with no frame
  hitch stapled to it. If Hannah still reads the *lighting* itself as "a
  different stream", the next lever is tonal — bringing the braid's peak
  luminance class down toward the shed's own ceiling — and that is a
  taste call on the approved rest frame, hers to make, not a defect.
- The instrument's environment ran at half cadence during part of this
  session (earlier published D23/D24 peaks were shot on that slower
  cadence); every before/after pair in this section was re-measured
  like-for-like in one session, stashed-tree A/B, and the fresh-page brisk
  table is the one to trust for absolute levels.

---

## 2026-08-09 (D26) — the eighth report taken literally: zero is the only constant, and one density field cannot pose twice

Hannah's eighth report in this family, stated as an absolute:

> "When I scroll from Inspire to Connect and back, it seems like spores
> still have their positions reset crudely. It looks like shit. They
> shouldn't EVER switch positions based on a move — emphasis should just
> be changed."

Read as a specification: **the particles' positions must not depend on
which section you are in; crossing a boundary may change only how they are
lit.** She is right that D25 did not deliver it: the standing floor made
the position blend a lerp `cvP = fl·(1−cg) + T·cg` from `fl ≈ 0.30` up to
`T = 0.85` — and a lerp whose endpoints differ IS a position change at the
boundary, by construction. ~59% of each dot's drift-to-braid distance was
still travelled on entry and given back on exit, however well paced.

This session did the work the specification demands — made the blend a
single constant — and this section records the result: **the only constant
that satisfies the landing is zero, and at zero, two of the three streams
have nothing to light.** No constant serves both poses. This is the
brief's named stop-and-report case, not a ninth partial fix, and the
decision it surfaces belongs to Hannah (and, for the hero frame, Peter —
`06-mission-preservation.md` names him for any visual exception).

### The candidate built: blend ≡ 0, emphasis carried entirely by light

`organism/spores.js` was restructured (preserved as a patch + stash, see
"Where the candidate lives" below; NOT shipped):

- **The seat never writes positions.** The drift integrator is the sole
  owner of the buffer at every p, both directions, every taste value. All
  reconciliation machinery — heroP/lastW/writ shadows, retire-in-place,
  the D24 engage refit, the D25 floor, the gather drive — deleted with the
  steering, not disabled.
- **The three routes become a lighting field.** Each exit's chain (source
  wedge → rim walk → braided rise along DRIFT_RX/RZ, three winding strands
  at half the braid's old curl) is sampled per frame as ~20 world-space
  capsules; every dot's proximity to the *lit portion* of a chain sets its
  exchange (cv), brightness (pw ≥ cv, so emphasis only ever adds — the
  b2c9584 conservation law strengthened to monotone), and sprite swell
  (psize gains a byte-exact-restoring base copy beside color's). The
  reveal opens each chain from the source outward (draw-on along the feed,
  identical at rev 1 by arithmetic), staggered per dot by the same warped
  hash (arrival is growth, not a switch). A knot-pearl cadence travels
  along the lane as a *wave of light* with deliberately small per-dot
  phase jitter — coherent light along a path, carried by dots the wind
  happens to have there. The region-dim capsules return re-weighted
  (rise 0.60 / wedge 0.30 / walk 0.25 / downwind 0.22, riding eff²·T so
  they lag the light) for figure/ground, plus a 0.30 far-history grad.
- Reveal schedules (ARR cascade, per-exit retire envelopes), T1/T2
  derivations, warming, camera: untouched.

### The requirement, delivered exactly — measured

One instrument (capture.py's own CDP client, headless 1440×900,
`?nointro=1&steady=1&nosnap=1`, ~30 fps cadence — same-session A/B, HEAD
vs candidate). Ambient baseline (hold at Connect rest): 3-frame peak
0.135 u/s, p50 0.093, net 8 s drift mean 0.38 u. Braid-alive at HEAD rest:
p50 1.24 u/s.

Population speed through the crossings (3-frame rolling; net per-dot
travel across the ride window):

| crossing | HEAD peak / net mean / dots>1u | candidate peak / net mean / dots>1u |
|---|---|---|
| Connect→Inspire 0.10 p/s | 3.10 u/s / 2.10 u / 3,403 | **0.117 u/s / 0.19 u / 4** |
| Connect→Inspire 0.45 p/s | 7.30 u/s / 2.02 u / 3,228 | **0.119 u/s / 0.05 u / 2** |
| Inspire→Connect 0.10 | 1.58 u/s / 0.98 u / 1,326 | **0.116 u/s / 0.22 u / 3** |
| Inspire→Connect 0.45 | 1.66 u/s / 0.44 u / 462 | **0.095 u/s / 0.11 u / 1** |
| Mission→Inspire 0.10 | 6.42 u/s / 2.15 u / 3,516 | **0.102 u/s / 0.23 u / 2** |
| Mission→Inspire 0.45 | — | **0.096 u/s / 0.09 u / 0** |

Every candidate crossing sits INSIDE the ambient hold's own band (its
peak-of-peaks 0.119 < the hold's 0.135). The dots-over-1u are the drift's
own gill recycles. Matched-pin round trip (0.49 → 0.26 → 0.49 at
0.10 p/s, per-dot |Δposition| between the two visits to the same p):

| pin | Δt | p25 / p50 / p75 / p90 / p99 | dots > 1 u | ambient drift · Δt |
|---|---|---|---|---|
| p 0.42 | 3.9 s | 0.22 / 0.29 / 0.39 / 0.46 / 0.54 | 5 | 0.36 |
| p 0.36 | 2.7 s | 0.17 / 0.22 / 0.30 / 0.36 / 0.42 | 4 | 0.25 |
| p 0.30 | 1.5 s | 0.11 / 0.14 / 0.19 / 0.22 / 0.26 | 3 | 0.14 |

The distribution IS the ambient drift over the elapsed wall time — it is
the same code path, so this is arithmetic confirmed by measurement, not a
tuning result. Frozen-capture gate on the candidate tree: **mission,
connect, owned, final all 0.00/255 byte-identical**; only `inspire@*`
moves (3.67 / 3.77 MAE — the re-lit rest, the one pixel change in the
whole journey). Console clean over every ride. Total-light trough
entering: −5.5% (shipped band −5.9/−6.7%; the 2026-08-06 offense was
−25.3%). Emphasis loop ~3.5 ms/frame at the rest (steer was ~1.15 —
would need its own pass if this ever ships).

### Why it still fails the rest — and why no other constant exists

**A constant blend means the rest and the landing render the SAME density
field** (modulo minutes of statistically-stationary drift). That is the
whole point — it is what makes the boundary motionless — and it is also a
theorem with teeth: the approved landing (one visible stream, spilling
from the back-right rim, carried +x by the one wind) and the approved rest
(three visible streams at az 5.83 / 6.98 / 4.68) demand different fields.
Measured occupancy of the drift cloud at the rest, dots within r of each
exit's rise spines:

| r | ArtCompute | Arca | 2RP |
|---|---|---|---|
| 0.55 u | 2,422 | **24** | 429 |
| 0.80 u | 3,166 | **133** | 879 |
| 1.20 u | 3,595 | **514** | 1,702 |

The wind never crosses Arca's front-left sector. Worse: only **14 dots**
project within 40 px of Arca's entire lane in SCREEN space at ANY depth —
so no lighting geometry, projective tricks included, can draw that stream
out of this field. On the candidate's best tuning (per-exit catchments
0.34/1.10/0.72 u, per-exit boosts, coherent cadence, region contrast):
ArtCompute reads as a lit lane (~700–1,000 carriers), 2RP is a sparse
glitter trail (~580), Arca is absent (~150 faint dots). Rest counts
h>0.6 / h>1.0: 1,173 / 536 against the braid rest's 2,716 / 708.

The intermediate constants close the gap from neither side:
- Positional legibility needs `cvP ≥ ~0.78` (the D18 lobe sweep — 1 peak
  at 0.65, 3 at 0.80). A constant 0.78 puts the same three-lobed
  organization in the landing frame.
- At C = 0.5, the Arca cohort's median dot still sits ~0.95 u off its slot
  (D24's measured pairing distances × (1−C)) — outside a stream-tight
  tube — while the landing already carries C·(braid-alive 1.3–1.9 u/s)
  ≈ 0.7 u/s of standing route-cycling motion, 7× ambient, at the hero
  frame, forever.
- Any C > 0 breaks `mission@*` byte-identity outright (rendered p = 0
  moves), rescuable only by inverse-seeding the frozen frame — the exact
  scheme D25 rejected because the live landing then diverges from its own
  golden over the first minute.

So: **either the landing frame gives way, or the streams do.** There is
no third setting of the constant.

### The trade, stated for the decision

1. **Landing gives way** — reshape the ambient wind/seeding (globally,
   p-independent) so the shed genuinely flows past all three sectors.
   Positions then never depend on section AND three streams light up
   honestly. Cost: the hero frame changes — the one-visible-stream
   composition, the D16/D18 river-delta story built on it, `mission@*`,
   and `06-mission-preservation.md`'s do-not-touch list (micro-life:
   under-cap spore drift). That doc names **Peter** for any visual
   exception on the hero. Also re-derives the D21 cap re-aim and the label
   solve if plume balance shifts.
2. **Streams give way** — ship the candidate: a motionless boundary,
   ArtCompute as *the* lit stream, 2RP a sparse trail, Arca carried by
   its chip, furniture and a faint glitter. Cost: the D18 requirement
   ("there should be 3 visible streams") is no longer met by the dots;
   `inspire@*` re-shot to a materially thinner rest.
3. **Neither** — keep D25's shipped model (tree restored to it): the
   boundary still moves ~59% of the drift-to-braid distance, paced at the
   approved arrival's own rate. This is the state Hannah just rejected.

### Where the candidate lives

- `journey-v6-plan/source/d26-lighting-only-candidate.patch` — the full
  diff against `336f31d` (organism/spores.js + chapters/inspire/index.js).
- A git stash with the same content ("D26 lighting-only candidate…").
- Apply the patch and `capture.py --pose inspire` re-shoots the rest; the
  other eight goldens stay 0.00 by construction.

### Rejected along the way

- **Depth-bending the flank lanes** to run through the fan volume while
  projecting onto the lip→label screen path: killed by measurement (the
  14-dots-in-projection number) before its wrong-wind physics had to be
  argued.
- **Furniture-carried flank streams** (boosting filaments/beads to stand
  in for dots): a stream made of non-shed substance is the exact
  "different stream" read this family of reports began with (the retired
  ribbons/ARROWS).
- **Per-cohort constants** (Arca's dots permanently drawn to its route):
  p-independent, so it honours the letter of the requirement — and puts a
  permanent Arca-ward filament in the hero frame, which is option 1
  wearing a mask.
- **Global/graded dims at 2026-08-06 strengths** to force contrast: the
  disappearance-by-name objection stands; the candidate uses 0.60/0.30/
  0.25/0.22 lagging weights and keeps the trough at −5.5%.

### The seven prior commits, re-measured at HEAD this session

Same instrument, before any change: ambient 0.09–0.10 u/s (published
0.09–0.11 ✓); braid-alive p50 1.24 (band 1.14–1.32 ✓); dark-and-converted
class and cv purity untouched by this session (no scene change shipped);
outbound retire peak 1.58/1.66 u/s and inbound 3.10/7.30 u/s at this
cadence — the D25-published levels for this class of ride (their absolute
levels are cadence-sensitive; D25's own note says compare like-for-like
only). The shipped tree is byte-identical to `336f31d`; `capture.py
--check` PASS, worst MAE 0.00/255, all ten goldens, after the candidate
was stashed. Nothing regressed because nothing shipped.

---

## 2026-08-09 (D27) — Hannah's trade, landed: the wind now goes where the streams are

D26 ended at a stop-and-report: the lighting-only model delivered the
motionless boundary exactly, and then had nothing to light in two of the
three sectors, because the ambient wind never carried dust there. Hannah
chose the trade this section ships: **the landing gives way — reshape the
wind so dust genuinely reaches all three sectors.** The D26 candidate is
restored from its patch and is now the shipped model; this section is the
wind reshape on top of it, the craft pass that keeps the landing beautiful,
and the measurements.

### The wind reshape — two halves, both p-independent, both organism-side

1. **The release arc** (`organism/spores.js`, seed block). The old arc
   `[π, 1.98π]`, biased hard toward the lee, fed one sector: measured
   2,422 / 24 / 429 dots within 0.55 u of the ArtCompute / Arca / 2RP rise
   spines. The hymenium now sheds around a wider sweep of the margin —
   one smooth single-peaked density (peak az 5.90 at the lee, ArtCompute's
   side; tapered tails through 2RP's az 4.68 and Arca's az 6.98, reaching
   ~zero at 3.20 and 7.45) sampled by inverse-CDF from the SAME single
   `rand()` draw the old mapping consumed — the hero stream's downstream
   consumers are byte-identical, which is why `owned@*` did not move by a
   single byte (see Gates).
2. **The lee filaments** (`organism/spores.js`, drift integrator). Wind
   past a bluff cap organizes its shed into standing lee filaments. Three
   weak line-attractors — base at each exit's rim lip, direction
   BREEZE_DIR, the same axis the D17 locus law already derives every rise
   from — apply a gentle lateral contraction (λ = 0.10/s inside a ~0.9 u
   gaussian catch, basin capped at 1.5 u, ramped to zero over the first
   10% of each filament so the near-lip curtain stays a diffuse shed) to
   every dot, everywhere, at every p, forever. The stationary density now
   genuinely carries three soft streams; the chapter's lighting picks them
   out. The seed block integrates the same rule over each dot's own
   estimated transit (per-filament dwell scales 0.03/0.10/0.18, calibrated
   against the measured live equilibrium) so the frozen landing is the
   wind's own shape, not a start-up transient.

Corridor occupancy within 0.55 u of the rise spines: **seeded
1,380 / 503 / 425; live equilibrium ~1,050–1,150 / ~390–430 / ~330–500**
(the equilibrium band is the drift's own recycle/gust fluctuation), against
2,422 / 24 / 429 before. All three sectors are fed; ArtCompute stays the
densest, as approved.

### Emphasis retune (the candidate's starved-field dials, re-dialled for a fed field)

- Rise catchments re-tightened: `R1_RIS_E` [0.34, 1.10, 0.72] →
  **[0.34, 0.55, 0.48]** (wide catchments on a populated field light a
  wash, not a stream); cores [0.14, 0.24, 0.20]; boosts [1.15, 1.34, 1.24].
- Radial feather squared (the lanes converge toward the breeze's vanishing
  point in projection; the soft skirt was smearing the gaps).
- Tip fade 0.80→1.0 became **0.70→1.0** — the positional plume's own top
  fade, read off steer()'s 0.62–1 rise fade: the light lets go exactly
  where the old braid's density did, so the converging upper third never
  merges the three lanes.
- Knot cadence spatial frequency 11 → **26** per arc: ~2.5 crests ride
  each lane at any instant — a single travelling crest reads as a pulse,
  several at once read as a beaded stream. Body/knot split re-weighted
  (GAIN_BODY 1.15, GAIN_KNOT 4.6 concentrated on the core: 0.10 floor,
  was 0.35); sprite swell keyed to the core beads.
- Region dims: weights back near the candidate's (rise 0.46 / wedge 0.25 /
  downwind 0.24 / walk 0.22), rise core r0 0.72, and the drive late-gated —
  `ss(0.55, 1, eff) × eff × T`, not eff² — after a first pass at deepened
  dims measured a **−19…−27% total-light trough** mid-transition (the
  2026-08-06 offense class, caught by the gate and rolled back). The
  density filaments carve the valleys now; the recede only finishes them.
- Emphasis bounding reject R_BOUND 2.1 → 1.45 (sized to the tightened
  tubes; the fine scan admits ~half the dots it did).

### The requirement, re-proved on the shipped wind (capture.py's own CDP client, headless 1440×900)

Ambient holds (8 s, 3-frame rolling mean population speed): Connect rest
peak 0.158 u/s, p50 0.095; Inspire rest 0.157 / 0.096; landing
0.193 / 0.107 (its own gill-recycle churn: 95 dots > 1 u in 8 s).

| crossing | 0.10 p/s peak / p50 | 0.45 p/s peak / p50 |
|---|---|---|
| Mission → Inspire | 0.179 / 0.120 | 0.151 / 0.116 |
| Inspire → Mission | 0.171 / 0.101 | 0.122 / 0.102 |
| Inspire → Connect | 0.245 / 0.119 | 0.150 / 0.111 |
| Connect → Inspire | 0.237 / 0.110 | 0.169 / 0.119 |

Every crossing, both boundaries, both directions, both rates, sits inside
the ambient holds' own band. Matched-pin round trips (per-dot |Δposition|
between two visits to the same p, 0.10 p/s):

| pin | Δt | p25 / p50 / p75 / p90 / p99 | >1 u | p50 ÷ Δt |
|---|---|---|---|---|
| p 0.42 | 3.5 s | 0.196 / 0.258 / 0.352 / 0.425 / 5.82 | 61 | 0.074 u/s |
| p 0.36 | 2.3 s | 0.140 / 0.181 / 0.248 / 0.299 / 0.38 | 41 | 0.079 u/s |
| p 0.30 | 0.9 s | 0.063 / 0.081 / 0.111 / 0.134 / 0.15 | 15 | 0.090 u/s |
| p 0.14 (Mission side) | 3.0 s | 0.173 / 0.226 / 0.306 / 0.369 / 6.05 | 73 | 0.075 u/s |
| p 0.08 (Mission side) | 1.3 s | 0.081 / 0.104 / 0.139 / 0.168 / 0.20 | 34 | 0.080 u/s |

The distributions ARE ambient drift × elapsed time (holds' p50 ≈ 0.095
u/s); the p99/>1u tails are the drift's own gill recycles, present in the
holds at the same rate. It is the same code path — arithmetic confirmed by
measurement.

### The three streams at the rest

At the live equilibrium (t ≥ 150 s), 1440×900: three separate rising
streams of dust — Arca left, ArtCompute centre (the densest), 2RP right —
each a streaky filament of the one wind with dark sky between, pearls
riding the lanes, chips on their streams. Screenshots in the D27 session
record. Portrait (375×812, 430×932): **two streams read cleanly in open
sky; 2RP is marked by its chip and a dust cluster at its release, with
only a faint rise at the frame edge.** That is strictly more than the
pre-D27 baseline showed in portrait (one merged fan), and the limiter is
the D19-balanced portrait pose, untouched by this change. Recorded as a
known portrait limitation, not hidden.

### Gates

- **Frozen determinism:** 5/5 round trips (0.26 → 0 → 0.16) bit-identical
  buffers; forward vs reverse over 26 matched pins, max |Δ luminance|
  **0.0**; per-exit emphasis single-humped, saturating by p 0.22, retiring
  to exactly 0 — no self-ignition, mirrors exact.
- **Restore discipline:** after full rides 0 → 1 → 0, total ambient
  luminance returns to **exactly 2746.2** (the byte-exact base) at p 0.
- **Total light through the transitions:** monotone between the ambient
  level (2746) and the rest's own figure/ground level (~2350, −14% — the
  approved rest look, re-shot in `inspire@*`); worst transient below the
  travelling endpoint **−1.2%** (2026-08-06 offense −25.3%; D26 candidate
  −5.5%). The first-pass deepened dims that measured −19…−27% were rolled
  back before shipping.
- **Cold-entry hitch:** worst first-crossing frame 68–119 ms across three
  trials — inside HEAD's own 83–184 ms spread measured like-for-like in
  the same headless environment (the class is pre-existing; the D25 warm
  path is untouched and the refit machinery is deleted with the position
  channel).
- **Console:** zero errors, zero warnings — frozen sweeps, live rides both
  directions, cold entries, hover/leave on the live hotspots.
- **Conservation:** dark dots (luminance < 0.16): **0**, at p 0.147 /
  0.167 / 0.26 / 0.385 — the dark-and-converted class is empty by
  construction (pw ≥ cv) and by measurement.
- **Cost:** emphasis loop 2.5–3.3 ms/frame at the rest (was ~3.5 in the
  candidate; steer was ~1.15). The R_BOUND cut bought ~25%; further work
  belongs to a dedicated pass if it ever shows on the frame budget
  (display-locked 16.7 ms in every ride measured here).
- **References:** re-shot **all four moved poses in this commit** with
  manifest provenance: `mission@*` (0.51 / 0.93 MAE — the authorized
  landing change), `inspire@*` (2.87 / 2.84 — the re-lit, wind-fed rest),
  `connect@*` (4.06 / 1.70) and `final@*` (0.48 / 0.54). `owned@*` is
  **0.00 / 0.00 byte-identical** (the one pose whose frame holds no sky).
  The connect/final moves were **investigated before re-shooting**, per
  the brief: with the spore Points hidden, the current tree and HEAD
  render connect/final/mission **pixel-identical** (0 differing pixels on
  connect; 3 px at 1/255 on mission — TAA noise), so every changed pixel
  in those goldens is the shed itself, and the shed is the authorized
  change. A p-independent field is visible from every framing that shows
  sky; connect/final could only have stayed byte-identical by keeping the
  boundary-dependent field this fix exists to remove.

### Honest residuals

- **Seed vs equilibrium:** the seeded cloud sits slightly sharper than the
  live equilibrium in the primary corridor (1,380 vs ~1,100 within
  0.55 u); the field relaxes over ~2 minutes, always in the softening
  direction, at ≤ 0.04 u/s — under the ambient drift's own p50. The
  frozen goldens bake the seed state and are self-consistent; a visitor
  who parks on one frame for two minutes sees the middle stream breathe
  slightly softer. Tightening this further means either a better
  closed-form transit model or seeding by direct integration; neither is
  needed at the current visual level.
- **The rest carries −14% total shed light** vs the ambient base (the
  figure/ground recede at full reveal). The old braid rest carried +10%,
  from condensed density. The pearls carry the emphasis now; if Hannah
  wants the rest brighter overall, GAIN_BODY and the rise dim weight are
  the two dials, in that order.
- **Portrait 2RP** as above — D19 pose is the limiter.
- **The wind's filament azimuths duplicate the chapter's exit anatomy**
  (5.83 / 6.98 / 4.68, rise maxima) in `organism/spores.js` (`FIL_AZ`),
  because the organism cannot import chapter anatomy (M3 seam rule). The
  coupling is documented at both ends; if an exit ever moves, both files
  move together.

---

## 2026-08-10 — D28: the braid softens, the light carries the three (Hannah's written brief, items 1–2)

Hannah's brief, in her own structure: (1) in Inspire, light three specific
points along the relevant edge and brighten the spores of those three
channels, while the rest of the side keeps shedding — "three highlighted
pathways within one organic spore field, not three isolated streams";
(2) outside Inspire the pathways must dim right down — Connect currently
reads "decorated with persistent bright lights"; the baseline field must
not read as three fixed streams.

### What the diagnosis found

- **The seat is already structurally silent outside Inspire.** The per-exit
  retire envelopes (out0/out1/out2) zero every reveal by p 0.430, the seat's
  release path restores colors/sizes byte-exact, and the emphasis cannot
  fire in Connect or the Epilogue. Verified in code and by the golden diffs:
  what Hannah sees outside Inspire is not the routes.
- **What persists everywhere is D27's lee-filament DENSITY bias** —
  λ = 0.100 condensed the shed hard enough that the Final pullback showed
  two-three distinct white lumps over the hero's cap ("three distinct
  clouds", her item 3), and the baseline carried a stronger three-stream
  scaffold than "weather" wants.
- **Connect's glitter is the shed itself at close range**: the tone draw
  `0.64 + rand^1.4 · 0.36` put ~1 dot in 5 above tone 0.9 (near-white),
  and the close Connect camera renders the top size tail at full
  brightness — additive stacking does the rest. Not the routes, not
  tendrils' 108 ground particles (measured dim), not the hub stars (the
  network's own design language, untouched).
- **In Inspire the opposite failing**: at the D27 gains the rest frame read
  as ONE broad fan — under-legible for the chapter whose job is three
  channels — and nothing marked the three release points on the edge.

### The moves (one balance, tuned on pixels)

- `organism/spores.js` **FIL_LAM 0.100 → 0.060**: the wind keeps a whisper
  of three-stream occupancy for the light to pick out; the far view reads
  as one irregular wind. Global, scroll-independent by construction.
- **Tone white-tail 1.4 → 1.9**, in all three mirrors of the one substance
  (`organism/spores.js`, `final/sky.js` TONE_POW, `final/shed.js`): the
  near-white share thins ~1-in-5 → ~1-in-8; the amber body is untouched.
  This is what softens Connect's "Christmas lights" and warms the
  Epilogue's white clumps, without touching any chapter-specific state.
- **Emphasis gains re-balanced for the thinner substrate**:
  GAIN_BODY 1.15 → 1.40, GAIN_KNOT 4.6 → 6.2, GAIN_SIZE 1.15 → 1.45,
  Inspire rise-dim DIM_ROLE 0.46 → 0.54. The radii stay tight (the D27
  wash guard); the lift lands on the winding cores and pearls.
- **Three lip-glow anchors** (`inspire/index.js` §5b): one small soft
  sprite per exit at the release lip, law `o = 0.22 · furnOf(i) · T`,
  identical in the animator and snap(), no easing — pure in (eff, T), so
  reverse scrubs mirror and frozen captures agree. Fully lit at the rest,
  exactly zero outside the section (furnOf rides eff). Scale 0.70 — an
  ember concentration, not a headlight; first cut (0.30 / 0.85) read as
  two headlights and was pulled back on sight. At the rest camera two of
  the three lips sit on the visible silhouette edge; Arca's shows through
  the wireframe cap as a soft under-cap brightening.

### The requirement, re-proved on the softened wind

Same instrument as D26/D27 (capture.py's CDP client, live page, 1440×900;
3-frame rolling population speed, statistics computed in-page). Ambient
holds this session: peak 0.115–0.157 u/s, p50 0.099–0.125.

| crossing | 0.10 p/s peak / p50 | 0.45 p/s peak / p50 |
|---|---|---|
| Mission → Inspire | 0.124 / 0.104 | 0.128 / 0.109 |
| Inspire → Mission | 0.135 / 0.109 | 0.149 / 0.121 |
| Inspire → Connect | 0.151 / 0.117 | 0.143 / 0.116 |
| Connect → Inspire | 0.155 / 0.125 | 0.137 / 0.122 |

Every ride inside the same-session ambient band — crossings remain
motionless on the retuned wind.

### Goldens

mission / inspire / connect / final re-shot deliberately in this commit
(provenance in manifest.json). Pre-reshoot drift: inspire 1.46/1.23 MAE,
connect 1.57/0.97, mission 0.15/0.27, final 0.24/0.31 — the deliberate
changes and nothing else. **owned@\* untouched at MAE 0.00, byte-identical
in git.** `--check` passes at 0.00 after the reshoot.

---

## 2026-08-10 — D29: the near-wake ends, and the Epilogue gets its sky back (Hannah's report, refuting D28's "resolved")

Hannah, after D28 shipped: "It still seems as though the spores continue to
glow after I've left the Inspire and Empower section. If you look at the
Epilogue, you can clearly see three lines of glowing spores coming from the
main mushroom."

### What the diagnosis found (headless CDP at the Epilogue pose, live wind)

D28's verdict — the seat is structurally silent outside Inspire — was
re-confirmed and is **not what she is seeing**. Hiding the hero's spore
Points at the Epilogue removes all three lines outright: they are the
**4,200-dot shed itself, organised into three density lanes by D27's lee
filaments**, which run at every scroll position by design (that permanence
is the motionless-boundary trade). D28 softened the catch (λ 0.100 → 0.060)
but left it running the FULL length of every filament, and contraction
accumulates over transit:

- Occupancy within 0.30 u of the three filament axes at the live
  equilibrium: **1,023 / 255 / 370** dots, against **507 / 18 / 0** at a
  control rotated half-way between the lanes — the space between two of the
  lanes was nearly empty.
- The lanes **tighten with height**: rms lateral distance along the primary
  filament fell 0.80 u at the lip → **0.31 u** four units up. Against dark
  sky at the pullback, a 0.3 u-wide density core over a ~2 u lane spacing
  is a drawn line. No lighting is involved — the shed's own tone under
  additive stacking is enough once the density is a line.

### The resolution — the wind keeps the lanes, and also an atmosphere

The tension held explicitly: the boundary-motionless property NEEDS the
organisation to be the wind's own, everywhere, at every p — so the fix
changes what the wind IS, globally, rather than gating anything on scroll.
Real lee filaments are a NEAR-wake: they exist behind the obstacle and
break up downstream. Two moves in `organism/spores.js`, both p-free:

1. **The catch releases along its own length** (`FIL_FADE0/1` = 0.34/0.60
   of each filament's sMax, one shared `filProf()`): full contraction
   through the band Inspire's emphasis actually lights, smoothly gone just
   above each lane's lit top. The near-rim occupancy bias the chapter's
   light picks out is untouched.
2. **Upper-air decoherence** (`DISP_RATE` 0.016 u/s under a world-height
   gate `DISP_Y0/1` = 4.2/5.6): above the lanes' tops each dot drifts along
   its own fixed lateral direction (golden-angle hash of its index, in the
   plane ⊥ the wind), dissolving inherited organisation back into one
   irregular cloud over the remaining transit. Deterministic, pure in
   (time, wind) — same code path at every p, so crossings stay motionless
   by construction.

The seed mirrors both. The old closed form evaluated the catch at the dot's
FINAL arc position, where the release window would have zeroed the history
it actually flew through, so the seed now **averages `filProf` analytically
over each dot's own path** and integrates the decoherence in closed form
over its climb (∫smoothstep = q³ − q⁴/2). `FIL_SEED_T` re-calibrated
[0.03, 0.10, 0.18] → **[0.75, 0.55, 1.60]** (the path average removed the
overstatement the old scales were compensating for). Seed vs 100 s live
equilibrium after: inWin030 **667/161/227 vs 669/162/230** — the frozen
landing sits on the running wind's own stationary shape, and the residual
relaxation stays in the softening direction.

### After, measured at the Epilogue

- Occupancy within 0.30 u: 1,023/255/370 → **669/162/230** (control
  409/16/0 — the bias Inspire lights survives; the emptiness between lanes
  is gone from the upper plume).
- rms lateral along the primary lane, upper bands: 0.31/0.39 → **0.52–0.80**
  — the plume's top is diffuse cloud, not a line.
- Stills (session record, live equilibrium, 1440×900 and 375×812): the
  three drawn lines are gone; the hero carries one irregular spray, denser
  where the wind is. The Inspire rest still reads its streams: near-rim
  organisation intact, streams dissolving upward exactly where the
  emphasis tip-fade (arc 0.70) already lets the light go.

### The requirement, re-proved (same instrument as D26/D27/D28)

Live page `?nointro=1&steady=1&nosnap=1`, 1440×900, capture.py's CDP
client, 3-frame rolling population speed normalised by the integrator's
own clamped step (cadence-independent; identical numbers to the D28
instrument at its ~30 fps cadence). Ambient holds this session: peaks
0.127–0.227 u/s, p50 0.099–0.110.

| crossing | 0.10 p/s peak / p50 | 0.45 p/s peak / p50 |
|---|---|---|
| Mission → Inspire | 0.201 / 0.111 | 0.123 / 0.095 |
| Inspire → Mission | 0.123 / 0.099 | 0.116 / 0.116 |
| Inspire → Connect | 0.207 / 0.127 | 0.195 / 0.097 |
| Connect → Inspire | 0.174 / 0.131 | 0.144 / 0.130 |

Every crossing inside the holds' own band. Matched-pin round trip
(0.19 → 0.06 → 0.19 at 0.10 p/s, through the Inspire rest stop and the
Mission boundary twice) against a parked control over the SAME wall time:
per-dot |Δposition| p50 **0.215 vs the control's 0.275**, p99 0.407 vs
0.453, >1 u 17 vs 20 — the trip IS the ambient drift, measured against
itself with cadence cancelled.

### Gates

- **Isolation:** frozen `?capture=` frames with the spore Points hidden,
  HEAD vs this tree: final 6 px at 1/255, inspire 104 px at 1/255 (TAA
  noise class), MAE 0.0000 — every visible change is the shed.
- **Console:** zero errors/warnings over full rides 0 → 0.97 → 0 at 0.25
  and 0.45 p/s, hooks on console.error/warn + window error/rejection.
- **References:** mission / inspire / connect / final re-shot deliberately
  in this commit (provenance in manifest.json). Pre-reshoot drift:
  inspire 1.48/1.30 MAE, connect 1.92/1.22, mission 0.16/0.23, final
  0.25/0.30 — the wind and nothing else. **owned@\* untouched,
  byte-identical in git.** `--check` passes at 0.00 after the reshoot.

### Honest residuals

- The frozen final golden moved only 0.25 MAE because the seed's upper
  plume was already soft; the drawn lines Hannah saw were the LIVE
  equilibrium sharpening over ~2 minutes of parked wind. The seed
  re-calibration closes that gap (seed ≈ equilibrium above), so what the
  golden shows is now also what a parked visitor sees.
- The Inspire streams' upper thirds are softer than D28 shipped, by
  design — the release window ends where the tip-fade was already letting
  the light go. If Hannah wants the streams to carry higher, FIL_FADE0/1
  are the dials, at the direct cost of line-ness returning to the
  Epilogue's sky.

## 2026-08-10 — ONE MOVEMENT: the Inspire → Connect travel becomes the arrival's own shape (Hannah's brief, item 1)

**The ask, verbatim.** *"The transition from Inspire and Empower to Connect
the Ecosystem feels a little bit stilted — it's like two separate movements.
Could you figure out how to make that into one smooth movement? It feels like
it could just naturally be one, more dramatic camera movement — like the one
from the hero to the Inspire and Empower section, similar to that."*

Third complaint on this leg, each on a different fault: `6acceac` cured a
re-approach in the DISTANCE channel (the zoom-in-then-out), `e95820a` cured a
stall in the composed frame angle d = gazeYaw − camAz + 180 (the subject
freezing mid-leg). Both channels were monotone on the tree she rode — her
complaint this time is about GESTURE, and she names the reference.

### The diagnosis: two envelopes, two peaks

Measured (401-sample drift-aware trace of the shipped tree, landscape,
window p 0.26 → 0.49):

    position speed   0 at the rest -> PEAK 92 u/p at p 0.337
                     -> 43 by 0.38 -> ~10 u/p through 0.42-0.44
                     -> a ~17 u/p shelf -> 0 at the rest.  ONE EARLY HUMP.
    fov rate         ~30-60 deg/p through the swing
                     -> 124 / 159 / 221 / 253 deg/p, PEAK at p 0.477.
                     ONE LATE HUMP.
    yaw rate         peak 594 deg/p at 0.338, falling to a ~250-270 shelf.

No single channel reverses — every prior audit passed — but the two
ENVELOPES peak 0.14 of p apart with a 9x speed trough between them: the eye
reads a swing that ends (position-led, dead by p 0.42), then a zoom that
starts (fov-led, peaking at 0.477). Two movements, exactly as reported. The
reference she names is a mechanism, not a mood: the Mission → Inspire
arrival rides azimuth, radius, height, fov and gaze on ONE shared
trapezoidal ease, so every envelope peaks together. This leg was a keyed
spline through two station keys (rest-drift, exit) plus Connect's three
approach keys — five stations, each with its own local tangent shape, and
no shared profile anywhere.

### The re-shape: the whole travel is one analytic gesture

`connect/camera.js approach(u)` (the destination owns its arrival — the
inspire/camera.js arrival() precedent), composed by the director over
p [restProgress('inspire') .. restProgress('connect')] exactly as the
arrival is composed below the Inspire rest. All channels ride the arrival's
own trapezoid (RAMP 0.18, peak 1.22x mean): az 115 -> 61.81 deg on azEase
(trapezoid + windowed orbit-breath, strictly monotonic), r 11 -> 9.011,
y 2.0 -> 2.647, fov 40 -> 62 on the plain trapezoid, gaze on a quadratic
bezier INSPIRE.target -> rest target bowed through PIN2 (1.0, 1.8, −1.8),
the mid stem. Because az, fov and the gaze are affine in one shared ease,
d is monotone BY CONSTRUCTION and the e95820a fault class cannot re-open.
The retired keys: inspire's rest-drift + exit (t 0.7167 / 0.9250) and
Connect's three approach keys. The rest keys stay, bit-exact — the gesture
derives its endpoints from INSPIRE and from Connect's rest key, so a seam
disagreement is impossible rather than checked-for (the D18 lesson).

The rest slides to leg-t 0.65 — route.js stops [0.65], p 0.490 -> 0.5230,
SAME approved pose — and connect scrollVh 4.5 -> 10.0. One allocation
decision with brief item 2 (the ground-lighting pace, its fifth request)
and item 3; the reasoning is in EXECUTION.md 2026-08-10 and
16-connect-ground-restage.md. The dive keys keep their shipped poses on
the same dive line and re-space onto leg-t 0.77 / 0.91 (p 0.5494 / 0.5802);
every owned/camera.js key and every pose at p ≥ 0.6225 is bit-identical
(measured: max |Δ| exactly 0 over the trace grid — owned/leg.js samples
p 0.660-0.872, so the colony cannot have moved; owned@* goldens 0.00).

### After, measured (321-sample traces, both aspects)

    landscape (p 0.26 -> 0.523)
      speed        0 -> ~42-47 u/p plateau (peak 47.0 @ 0.408) -> 0.  ONE HUMP.
      yaw          peak 385 deg/p @ 0.404, same plateau           }
      pitch        peak 61 deg/p                                  } all peak
      fov          102 deg/p flat through the plateau             } TOGETHER
      d            monotone, one hump (peak 142 deg/p @ 0.305), zero stalls
      subject-dist 8.425 -> 10.454, one 0.002-unit flat spot inside the
                   first ramp (0.02%; the shipped tree's own bow was 0.14)
      roll         0 everywhere (director law)
    portrait
      speed        one plateau ~68-81 u/p, peak 81 @ 0.473 (the authored
                   portrait dolly-back blooming toward the rest)
      dist         12.63 -> 16.94 STRICTLY monotone, zero sign flips
      yaw/pitch    379 / 59 deg/p peaks
    rates everywhere an order of magnitude under the ~1.2k deg/p threshold.

Wall-clock: the gesture now spans ~10.3 vh of scroll (3.75 in Inspire's
allocation + 6.5 in Connect's) against ~6.0 before — statelier, and the
PCHIP gain ramp across the boundary means it eases out as it lands, the
arrival's own manner.

### Gates

- **Rides**: full 0 -> 1 -> 0 real-wheel rides at 1440x900 and 375x812,
  console.error/warn/exception hooks: 0 entries (sub-agent battery,
  2026-08-10). Frozen frame series through the leg both aspects read as one
  continuous sweep; rest frames at both ends composed correctly.
- **Boundary spores (D26-D29 instrument, ~11 fps cadence normalised by the
  integrator's 0.033 s clamp)**: crossing population speed Inspire→Connect
  0.155/0.113 (peak/p50, 0.10 p/s) and 0.131/0.111 (0.45 p/s), reverse
  0.141/0.111 and 0.145/0.116 — all inside the same session's ambient-hold
  band (holds: 0.142/0.100 Inspire, 0.132/0.100 Connect). Total shed light
  through the crossing: monotone 2324 -> 2464, worst dip 0.00% at 0.05 and
  0.20 p/s (an early −3.38% reading reproduced as a probe settling artifact,
  not a travel property; reverse worst −0.45%). Restore discipline: total
  ambient luminance at p 0 identical before/after the rides (2464.3).
- **Inspire arrival untouched**: poses p ≤ 0.26 identical to the shipped
  tree (trace delta ≤ 1.4e-5, the fov write-threshold hysteresis class);
  mission/inspire goldens 0.00.
- **az-gate ordering preserved**: under the new leg az stays above 78 until
  p 0.434, so the ARR ramps are saturated through the whole per-exit retire
  cascade (0.352-0.430) exactly as the D25 design assumes, with MORE margin
  than the shipped tree; T1's p-relax (0.44/0.46) still lands on reveal = 0.

### Residuals

- The landscape subject-distance flat spot (0.002 u inside the first ramp)
  is an order of magnitude under the shipped tree's own 0.14 bow; not worth
  a PIN2 chase.
- The portrait speed plateau peaks late (81 u/p at 0.473) because the
  authored portrait field blooms toward the rest; it is one hump and slower
  on screen than the shipped tree at every point (scroll gain 2.22x), so it
  was left as authored.
- Mid-leg copy: the Inspire block fades out by p 0.338 and Connect's fades
  in at 0.509 — the long copyless travel is deliberate (it is the movement
  she asked to feel).
