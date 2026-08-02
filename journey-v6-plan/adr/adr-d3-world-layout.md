# ADR AR-2 / D3 — Single co-located organism world layout, occlusion thresholds replace veils

- **Status:** approved (Tech Lead, 2026-08-02); the *compositions* it enables still need Peter at G1 via `03-anatomy-camera-map.md`.
- **Supersedes:** the "chapter clusters at world offsets + boundary veils" table in `journey/CONTRACT.md`.

## 1. The hero's coordinate space is the world (authoritative measurements)

Read out of `mushroom-scene.js`; also exposed at runtime as `sceneApi.consts`. **Never hard-code these — read them from the API.**

| Quantity | Value | Note |
|---|---|---|
| Origin | stipe base, on the ground | `(0,0,0)`; y is up |
| Ground plane | `y ≈ 0` | `groundY(x,z)` undulates ±≈0.1; ground network reaches r ≈ 14 |
| `STEM_TOP` | 3.9 | stem radius ≈0.69 at the base, ≈0.20 at the top |
| `CAP_Y` / `CAP_R` / `CAP_H` | 3.15 / 2.35 / 1.22 | nominal rim height / rim radius / dome above rim → **apex y ≈ 4.37** |
| Rim shape | `rimRad(a)`, `rimYoff(a)`, `marginDroop`, `capLump` | rim radius varies ±9%; the margin rolls down; one crisp fold at a ≈ 5.3 rad |
| Cap lean | `LEAN_DIR = 3.6 rad` | the cap droops back-left; the back-right rim lifts and **exposes the gills there** |
| Cap throat (stem↔cap joint) | ≈ `(0.03, 3.62, −0.06)` | `capThroat`, after `tiltX = −0.14`, `leanZ = −0.03` |
| Spore source | back half of the gill skirt, `a ∈ [π, 2π]`, `u ∈ [0.55, 1]` | i.e. **z < 0, away from the Mission camera** |
| Breeze | `(1.0, 0.62, 0.17)` normalised | spores travel +x and up; the stalk leans on the same signal |
| Mission camera (desktop) | pos `(−2.25, 2.25, 10.4)`, target `(−2.4, 2.6, 0)`, fov 38 | +z is "front"; four other authored modes exist |
| Fog / clip | `THREE.Fog(bg, 7, 20)`, camera `near 0.1 / far 100` | **hard constraint on Final** — see §4 |
| Orbit limits | `minDistance 3.5`, `maxDistance 18`, `maxPolarAngle 0.58π` | user orbit only; the journey director will drive the camera directly |

**Scale note vs the donor.** The donor's `mission` cluster used stipe top y≈5 / cap r≈3.4. Hero units are ≈0.7× that. Every harvested chapter geometry must be re-parameterised against `sceneApi.consts`, not rescaled by a magic number.

## 2. Attachment points — the hero needs **zero** modification

`createScene()` already returns everything AR-2 asked for. `groups = { mushroom, stem, sway, ground, spores }`, `consts`, `scene`, `camera`, `renderer`, `composer`, `controls`, `addAnimator(fn)`, `setView`, `setHighlight`. The "hidden rear-cap extension hooks" are therefore **new `THREE.Group`s parented to the existing groups**, and the permitted-touch clause in AR-2 is not exercised at all.

Live scene graph:

```
scene
├── swayGroup            rotation only (pivot = world origin) — the breeze/tap signal
│   ├── stemGroup
│   └── capBend          position = capThroat, rotation.z only — the cap's extra bend
│       └── mushroom     position = −capThroat  ⇒ its children sit in WORLD coords at rest
├── groundGroup          not swayed
└── sporePts             simulated in world space against swayCos/swaySin
```

Consequence that decides the layout: **anything added under `groups.mushroom` is authored directly in world coordinates and automatically inherits cap bend + sway.** Nothing needs a local frame or an offset.

| Chapter | Parent | Why |
|---|---|---|
| Inspire — rear-cap rim sources, three plume regions, airflow field | `groups.mushroom` | Plumes must ride the same cap bend as the gills they leave; sources are placed with the real `capUnderPt(u,a)` / `rimRad(a)`, in the rear sectors the hero already sheds from |
| Connect — gill commons, cross-veins, the three semantic behaviours | `groups.mushroom` | It *is* the underside of this cap; sharing the bend keeps the chamber from shearing off the rim |
| Owned — mycelial mat, cords, portrait field | `scene` (sibling of `groundGroup`) | Soil does not sway; a swaying substrate would break the descent |
| Final — fairy ring, cutaway terrain, spore cloud, horizon | `scene` | The wider field surrounds the whole organism, including the sway pivot |

The hero's own `mushroom` / `stem` / `ground` / `spores` content is never re-parented, re-scaled, or re-materialled. Extensions are additive children only, hidden (`group.visible = false`) until their threshold arms them.

## 3. Layout — one organism, five vantages (no clusters, no offsets)

- **Mission** — the existing exterior three-quarter pose. Unchanged, and the fixed start of the journey.
- **Inspire** — the *same* mushroom seen from a 120–180° rear orbit at cap height (camera r ≈ 6–9, y ≈ 3–5), with a restrained push-in toward the rim. Three exit regions live on the rear under-cap between the gills, in the same azimuth band the hero already sheds spores from.
- **Connect** — beneath the *same* cap: `y ∈ [CAP_Y − 0.9, CAP_Y + 0.4]`, radial extent bounded by `rimRad(a) ≈ 2.35`. The chamber is entered by continuing the Inspire orbit down and inward under the rim, not by a cut.
- **Owned** — below the *same* soil-line: `y ∈ [−7, 0]`, x/z within roughly ±16, entered by descending the stipe exterior and crossing y = 0.
- **Final** — the wide field around all of the above: fairy ring at r ≈ 10–18, oblique cutaway of the ground plane, spore cloud above y ≈ 6.

Mission → Inspire is one continuous orbit of one organism. **There is no occlusion, veil, or asset swap between them** — this is the product promise and the reason cluster-swapping was retired.

## 4. The three occlusion thresholds, defined as streaming seams

Each threshold is a *predicate on the camera*, evaluated every frame, with hysteresis so a shaky scrub can't strobe the streamer. Crossing arms the next chapter's assets and retires the previous chapter's high-detail geometry; per v6 they are also where fog, LOD and particle budgets may be re-parameterised.

| # | Seam | Predicate (hero coordinates) | Arms | Retires |
|---|---|---|---|---|
| T1 | **Rear-cap reveal** | camera azimuth about the stipe axis passes ≈100° from the Mission azimuth (i.e. the camera crosses into the z<0 half) while `y > CAP_Y` | Inspire plumes, rear-cap sources | nothing (Mission stays resident — it is the same organism) |
| T2 | **Cap occludes sky** | `camera.y < capUnderPt(1, a).y − 0.15` **and** horizontal radius `< rimRad(a)` — the cap fills the upper frame | Connect gill commons, cross-veins | Inspire plume simulation → frozen impostor; ground network → LOD |
| T3 | **Soil crossing** | `camera.y < groundY(x,z) − 0.15` | Owned mat, cords, portrait planes | Connect chamber; cap/stem shells → silhouette LOD |
| T4 | **Rise / cutaway** | `camera.y > groundY(x,z) + 0.5` **while travelling outward**, `p > 0.85` | Final ring, terrain cutaway, spore cloud, horizon | Owned interior detail; **fog must be re-parameterised here** — the hero's `Fog(bg, 7, 20)` fully obscures anything past ≈20 units, so the pullback needs an animated far-plane/fog ramp or the epilogue renders as flat black |

Hysteresis: ±0.15 world units (or ±8° for T1), plus a 250 ms minimum dwell before a reverse crossing retires anything. Reverse scrubbing through T3 → T2 → T1 is an explicit acceptance test (v6 §scroll model).

T1 is *not* a scene-management veil: it is a pure streaming trigger with no visual expression. T2/T3/T4 are natural occlusions the camera path already produces; nothing is drawn over the frame to hide them.

## 5. Consequences

- No `CLUSTER_OFFSETS`, no veil quad, no per-cluster camera-direction blending. Camera keys are authored in world coordinates against real anatomy.
- Any chapter geometry that assumed a standalone envelope (donor `inspire` cap r≈10, donor `connect` r 2–18) must be rebuilt against `sceneApi.consts` — recorded in `adr-d2-harvest-map.md` as "adapt", never "reuse".
- The regression gate stays cheap: the hero's own scene graph is byte-identical, so a Mission-pose screenshot diff is a valid regression signal for the whole extension.
