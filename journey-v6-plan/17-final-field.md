# 17 — Final field: the epilogue restage

**Status: SHIPPED (same-commit goldens).** Hannah's brief, verbatim intent:
the fairy-ring mushrooms must read as the hero's species; a whole field of
smaller mushrooms should stretch into the distant background; the headline
must stop fighting the mushrooms; the Owned portrait faces must not appear
in the epilogue frame; the copy moves to the bottom-left corner and the
upper-right of the frame goes to the field.

## What changed

| File | Change |
|---|---|
| `journey/chapters/final/ring.js` | Two FIELD tiers + a hint rung on the D15 ladder; anti-lamp damping (innerK / crowdK / lum·lumMul); zero-count guards so the one builder serves every rung |
| `journey/chapters/final/world.js` | Member az 291 → 297: it sat on the same rest-camera ray as the az 279 body (−44.3 vs −44.7 deg) and the two caps summed into one over-wide white "pancake" — the worst species-breaking read in frame |
| `journey/chapters/final/index.js` | `snap()` added (placeAt contract). Until now the frozen capture pipeline shot the epilogue with `amount` stuck at 0 — the shipped final golden showed the hero over an unlit floor, none of the chapter's content. The golden now contains the composition it gates |
| `journey/chapters/owned/index.js` | Portrait-field surface mask: `portraits.setFade(eff * faceVis)`, `faceVis = 1 − smooth01((p − 0.815)/0.030)` |
| `journey/ui.js`, `journey/site.css` | `final: 'pos-bottomleft'` + the new position class (desktop `left 5.2vw / bottom 9vh`, ≤900px `left 6vw / bottom 11vh`, clear of the footer cue's band) |

Copy strings untouched (locked verbatim, content.js). Camera keys untouched —
the splice at p 0.85, the rest pose and the end-hold are the shipped ones.

## The field

Same species, same builder, same TWO draw calls. `buildMushroom()` now takes
a tier override and the D15 ladder keeps walking down:

| Tier | Band (from rest cam) | Count | What survives |
|---|---|---|---|
| T3 | 15–24 units (19+ on frame-left) | 15 | sparse cap lattice (5×20), 2-ring rim + 14 ticks, 12-gill whisper, 6×7 stem lattice + 7 fibres |
| T4 | 24–36 units | 28 | 3×14 cap, 24-seg rim, 3×5 stem + 4 fibres, cavity + pool glows |
| hints | 34–46 units | 20 | a front-facing rim arc (8 segs, bright toward the lens), cap ember + soil pool |

Placement is authored in the REST frame about the rest-gaze heading (read
from the chapter's own `final-rest` key): ~2/3 of bodies on the frame-right
side, a 9.6-unit moat around the ring band, hero clearance + the trees' airy
sky sector kept, and `cutVal ≥ 0.4` everywhere — the cutaway wedge stays
void, which is exactly where the copy now floats. Sizes mostly smaller than
ring members with a seeded 12% of "elders" (+0.8 h).

**Reveal:** field members carry `aReveal = 0.45 + 0.37·distFrac` — the
kindling travels OUTWARD from the ring into the fog as the pullback
completes, pure in uPull (camera-x), so reverse scrubs retract the field
back toward the ring and a fling still surfaces onto a finished world
(rise-mask OR unchanged). Dark at arm as before. Hints complete only as the
camera settles (0.80–0.84).

## The lamp fix (species match)

Hannah, third round: distant members read as glass lamps — a different
creature. Measured cause (A/B with interior points zeroed): NOT the glow
points — additive **stroke pileup** under bloom. A far body's stem lattice +
fibres + gill fan live in a screen column a few px wide; their sum saturates
white while the hero's identical strokes stay textured because they cover
pixels. Fixes, all build-time:

- `crowdK = [1, 0.52, 0.42, 0.78, 0.75][tier]` on stem-lattice, fibre and
  gill stroke tones (cap lattice + rim spared — they are the identity);
- `innerK = [1, 0.55, 0.45, 0.5, 0.4][tier]` on the interior point stack
  (gill core, stem motes, heart/cavity, both ground pools — the second pool
  had escaped every earlier dim and was the "foot ball");
- cavity sprite trimmed (1.15→0.95 capR), heart 0.36→0.29 and smaller;
  T0 near bodies untouched;
- per-field-member `lum` (heat-ramp tone slide — dimmer AND warmer, the
  fog's own direction) and `lumMul` (carried opacity), T3 0.70 / T4 0.52;
- base-flare warmth (yT<0.12 boost) now T0-only;
- fibre counts T1 17→13, T2 13→9;
- the az-291 ray-overlap move (world.js above).

## The faces

The colony stays armed through the epilogue (OWNED_HOLD_HI past-the-end) and
the cutaway deliberately shows it in section — but the contributor FACES
were surfacing as readable portrait blobs in the corner of the surfacing and
rest frames. Mechanism: the Owned chapter multiplies only its **portrait
field** fade by a p-keyed mask that completes at 0.845, *before* the surface
pierce (~0.850) — measured: the first window (0.836–0.872) still showed
faces bottom-right at p 0.855; the shipped window is 0.815–0.845 and the
0.845/0.855/0.875 stills are clean. p and the camera are a bijection on the
leg, so this is a camera-keyed fade (D16-lawful): reverse rides restore the
faces as the lens re-enters the colony's dark upper reaches, no pop. The
substrate keeps its glow — the wedge's underground light is the designed
read. Owned rest (p 0.725) and its golden: untouched, mask ≡ 1.

## Measured

- **Geometry:** ring+field segs 25,876 → 36,241 (+10,365); glow pts +765;
  **draw calls 102 → 102**; triangles unchanged (18,851).
- **Frame (hidden-pane, 1280×800 @dpr1, same probe both runs):** cadence p50
  16.8 ms (~60 fps) after vs 32.5 ms before (pane-burst noise; after-run is
  the healthier trace); sceneCpu p50 11.8 ms vs 10.3 ms baseline (+1.5 ms);
  pixelRatio 1 in BOTH runs (pane environment, not a change effect).
- **Camera (untouched, measured for the record):** over p 0.80–1.0 peak yaw
  1308 deg/unit-p, peak pitch 592, both at p≈0.9125 (the approach into the
  rest) — the shipped leg's own values, identical by construction.
- **Gates:** capture.py --check PASS (worst MAE 0.00/255, all ten);
  mission/inspire/connect/owned goldens byte-identical in git; final golden
  re-shot same-commit with manifest provenance. Scrub stills (live,
  `?nosnap=1&p=`) at 0.78–1.0 both directions: no self-ignition, faces
  retire before the pierce, field arrives as whispers + outward kindling,
  end-hold + footer cue flow verified (cue click → p=1, footer live).
  Console: info-only over a full 0→1→0 ride. 375×812 / 430×932 / 1280×800 /
  1440×900 compositions checked.

## Residuals

- The shipped leg's yaw peak (1308 deg/p at the rest approach) sits above
  the ~1.2k house aim; pre-existing, untouched here — a future re-key can
  spread the approach if it ever reads as a whip.
- Frozen captures still exclude the Owned colony's faint wedge glow (owned
  has no `snap()` by design — its golden must stay frozen). Live shows it;
  the delta is now small since the faces are masked anyway.
- The end-hold recede runs the field at full kindle and the near-right field
  bodies sit a touch hot behind the footer; acceptable in review, monitor.
- Footer focus handoff after a *synthetic* cue click landed on the skip
  link, not the first footer link; shipped behaviour, not touched here —
  retest with a real gesture before filing.
