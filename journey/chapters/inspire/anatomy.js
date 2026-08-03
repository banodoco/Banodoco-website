// chapters/inspire/anatomy.js — INSPIRE's sector truths (M4: a chapter's
// anatomy lives in ONE file, inside the chapter that stages it; merge doc
// §2). The shared organism form-language mirror (rimRad, capUnderPt, heat,
// ...) stays in journey/anatomy.js — this file holds only what is INSPIRE's:
// where its exits sit on the rim and how each plume reads.
//
// The chapter passes these anchors through the spore-system driver seat
// (organism/spores.js setDriver({ exits })); the organism reads its own form
// language and never imports this file (M3 seam rule: behaviour in the
// system, anatomy + intent in the chapter).

// The three spore-exit sectors, in hero cap azimuth (pos = (cos a, y, sin a)).
// RESTAGED per D16 (Hannah, 2026-08-03, after six rejected fixes at the old
// rear staging): the exits are a TIGHT CLUSTER at the hero's ONE visible
// stream — the shed spilling from under the back-RIGHT rim and carried +x by
// the breeze (its visible plume centres on world (3.24, 3.97, -0.50), the
// hero page's own 01-INSPIRE callout anchor; back-projected along BREEZE_DIR
// that plume releases from cap az ~5.83). Supersedes the map's rear-sector
// staging (Plate I) for Inspire.
//   - ArtCompute: exactly AT the visible stream — it IS the stream the
//     visitor has been watching. Strongest lean, mid height.
//   - Arca Gidan Prize: ~31 deg rearward along the rim — near neighbour, the
//     tallest plume; fed by a short rim current peeling off the stream.
//   - 2RP: ~24 deg frontward along the rim, at the right margin — lowest
//     start, shortest rise; the other branch of the delta.
// All three sit inside (or a hair past) the hero shed's own birth wedge
// (a in [pi, 1.98pi]) and compose in ONE view of the right flank.
// `knot` is the per-plume knot-cadence gain (W4-A gap a): how hard the bright
// pearls along each winding core read. Arca — the tallest — carries the
// hottest cadence, per the approved spike's own review note.
export const EXITS = [
  { id: 'artcompute', label: 'ArtCompute',       az: 5.83, riseMin: 2.3, riseMax: 3.0, lean: 0.52, tone: 0.66, knot: 0.70 },
  { id: 'arca',       label: 'Arca Gidan Prize', az: 5.28, riseMin: 2.7, riseMax: 3.4, lean: 0.38, tone: 0.74, knot: 1.00 },
  { id: '2rp',        label: '2RP',              az: 6.25, riseMin: 1.8, riseMax: 2.4, lean: 0.42, tone: 0.60, knot: 0.55 },
];
