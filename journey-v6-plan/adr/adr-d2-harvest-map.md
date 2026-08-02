# ADR AR-1 / D2 — Harvest map from the donor `journey/` build

- **Status:** approved (Tech Lead, 2026-08-02) — pending Peter's countersign at G1 for the optics row only.
- **Context:** D1 made the running hero (`golden-mushroom-page.html` + `mushroom-scene.js`) the platform and `journey/` a systems donor. Every donor module below was read before classification.
- **Rule this ADR enforces:** nothing is copied out of `journey/` by reference. Harvested code is **copied into `journey-v6/` and adapted there**; `journey/` stays frozen as a reference build.

## Verdicts

| Donor module | Verdict | One-line reason |
|---|---|---|
| `core/journeyState.js` | **adapt** | One canonical progress `p` + hash routing + flight-cancel-on-manual-scroll is exactly v6's "one source of truth"; ranges become five chapters and the scroll-spacer wiring is deferred until the grey-box (the hero page has `overflow:hidden` and no scroll surface yet). |
| `core/camera.js` — `CHAPTER_RANGES`, `REST_LO/REST_HI`, `chapterAt`, `localProgress`, `samplePath` | **adapt** | Rest-band + keyframe-spline sampler are chapter-agnostic and reusable verbatim; moved into `journey-v6/constants.js` + a new director. |
| `core/camera.js` — `CLUSTER_OFFSETS`, `VEILS`, the veil shader/mesh, boundary direction-blending | **drop** | v6 retires veils and co-locates every chapter on one organism, so world offsets and boundary occlusion quads have no meaning; the cap/soil occlusions do that job for free. |
| `core/camera.js` — portrait pose back-off (`camera.aspect < 1`) | **adapt** | v6 demands *deliberate* portrait poses per chapter, not an automatic dolly-back; keep the idea, replace the formula with authored portrait keys. |
| `core/optics.js` | **adapt (gated on Spike A)** | The hero already owns an approved composer (RenderPass → UnrealBloom 0.62/0.45/0.1 → TAA → OutputPass) plus CSS `.grain/.vignette/.scrim/.spill`; a second composer would double-bloom and change the baseline. Harvest the **GradePass shader source** and the raw-vs-finished `g` toggle only, as a candidate pass appended to the *hero's existing* composer if and only if Spike A approves. |
| `core/interact.js` | **adapt** | Projected DOM node-buttons, hover≡focus, drawer/bottom-sheet/drag-dismiss, Back-closes-detail-first and the touch two-tap model all match v6 §PRODUCT BEHAVIOUR; the `DRAWER_NODES` set loses `pype`/`arnold`/`astrid`, and hotspot registration loses cluster offsets. |
| `core/content.js` | **adapt** | Schema (chapters / nodes / contributors / footer) is correct; move `equip`, `pype`, `arnold`, `astrid` into an archived `content-deferred.js` and keep the 14 anonymous `consent:false` contributors as v6's approved placeholder (D10). |
| `core/main.js` | **drop as a boot file, adapt as a checklist** | It boots its own renderer/scene/camera/fog/loader — all of which the hero already owns. Harvest four behaviours only: lazy `ensureChapter()` streaming, the tier-2 frame-time watchdog, copy visibility from the rest band, and the `?dbg=1` internals hook. |
| `lib/helpers.js` | **reuse (verbatim copy)** | Pure, DOM-free, deterministic (`rng`/`noise3`/`fbm3`/`strandLines`/`makePulseMat`/`tubeFrom`/`ribbon`/`easings`/`pulseDriver`) and does not fight the hero's own scene code. Copied unchanged into `journey-v6/lib/helpers.js`. |
| `lib/organism.js` | **reuse (with a scale note)** | The seeded line-work agaric builder is exactly what the Final fairy ring needs; it is parameterised on `height`/`capRadius`, so hero scale (`CAP_R 2.35`, `STEM_TOP 3.9`) is passed in rather than baked. |
| `chapters/mission.js` | **drop** | The hero *is* Mission. Rebuilding it is the one thing v6 forbids. |
| `chapters/inspire.js` | **adapt** | Under-gill spore origin → rim migration → curl → plume, and the three azimuth sectors, are the approved behaviour; its standalone cap dome (r≈10, apex y≈8) is replaced by attachment to the hero's real cap (`capUnderPt`, `rimRad`, `CAP_R 2.35`). |
| `chapters/connect.js` | **adapt** | The gill-commons architecture (28 primary lamellae + lamellulae + cross-veins) and the three distinct network behaviours (region / knot / route) carry over; radii rescale from the donor's r 2–18 chamber to the hero's cap. |
| `chapters/owned.js` | **adapt** | Flow-field hyphae, rhizomorph cords, soil pockets, depth-scattered portrait nodes with terminating strands: this is Spike B's starting point; its volume re-anchors under the hero's soil-line at y=0. |
| `chapters/final.js` | **adapt** | Tilted cutaway + fairy ring + underground colony + spore cloud is the right epilogue; the ring must now surround the hero's own organism instead of a synthetic centre. |
| `chapters/equip.js` | **dropped from the active build — moved** | Deferred per v6; relocated to `journey/deferred/equip.js` (done in this task). Approved conceptual work retained, not deleted. |
| `journey/index.html`, `journey/journey.css`, `CONTRACT.md` | **reference only** | Chrome, nav and copy positions are re-derived from the hero's DOM; never copy the donor nav (it carries Equip). CONTRACT.md's cluster table is superseded by `adr-d3-world-layout.md`. |

## Consequences

- `journey/deferred/equip.js` no longer resolves from `journey/core/main.js`'s lazy `import('../chapters/equip.js')`. The donor page therefore logs one caught `[journey] chapter failed: equip` and skips that cluster. Accepted: `journey/` is a frozen reference, not a shipping surface, and AR-5's full nav/route sweep is deliberately not applied to it.
- No `journey-v6` file may import from `../journey/`. Harvest = copy + adapt, so the donor can be archived without breaking the build.
