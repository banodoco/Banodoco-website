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
//
// D16 (2026-08-03) clustered the exits tightly at the hero's ONE visible
// stream — ArtCompute exactly AT it (cap az ~5.83, back-projected along
// BREEZE_DIR from the plume centred on world (3.24, 3.97, -0.50), the hero
// page's own 01-INSPIRE callout anchor), with Arca ~31 deg and 2RP ~24 deg
// away along the rim. That cluster is what this file supersedes.
//
// D18 SPREAD (Hannah, 2026-08-05: "there should be 3 visible streams of
// spores ... it should be visible where they're coming from"). The D16
// cluster CANNOT show three streams, and no camera angle fixes it. The reason
// is geometric and it bounds every future restage of this chapter:
//
//   The spore steerer (organism/spores.js) gives every dot an angular offset
//   of curl = (strand - 1) * 0.30 rad plus a winding wobble of about +/- 0.20,
//   and it leans EVERY plume along the one breeze vector — xLean = leanScale *
//   leanA * h * riseA * DRIFT_RX. So (a) each braid is ~1.0 rad wide at the
//   rim and stays that wide all the way up, and (b) the three plumes are
//   strictly PARALLEL: rise sets a plume's LENGTH, never its direction. Two
//   plumes therefore overlap along their whole length unless their rim
//   azimuths differ by more than the braid is wide. D16's gaps were 0.55 and
//   0.42 rad against a ~1.0 rad braid, so the three interpenetrated: one
//   cloud, by construction. The seat exposes only az / riseMin-Max / knot, so
//   RIM AZIMUTH IS THE ONLY SEPARATION LEVER the chapter has.
//
// Measured at the rest pose (1440x900, minimum inter-plume screen gap; and the
// smallest `facing` = how far a release lip has turned onto the camera-facing
// rim, which is what makes its source readable):
//   gap 1.05 rad -> 58 px, facing 0.30      gap 1.25 -> 94 px, facing 0.09
//   gap 1.15 rad -> 79 px, facing 0.20      gap 1.35 -> 97 px, facing -0.01
// 1.15 is the knee: past it the extra separation is bought by rolling a lip
// behind the silhouette, which trades criterion 1 for criterion 3. Below it
// the braids re-merge.
//
// WHICH LABEL SITS WHERE IS A LAYOUT CONSTRAINT, NOT A TASTE ONE. "Arca Gidan
// Prize" is a 132 px chip; at 375 px wide its wrapper is 161 px, 43% of the
// frame. With Arca on the RIGHTMOST plume its chip ran 88 px off the right
// edge and no portrait field could recover it (every candidate in a 8,640-
// point sweep failed). Arca therefore takes the DOWNWIND lip (6.98) where it
// projects leftmost, and 2RP — a 27 px chip — takes the upwind one (4.68).
// The physical plumes are unchanged by that swap; only the labels move.
//   - ArtCompute: FROZEN at 5.83 — it is the hero's own visible stream, and
//     the whole one-population claim rests on this number not moving. The
//     steerer sends it 50% of the dots, so it is the densest braid.
//   - Arca Gidan Prize: 1.15 rad downwind, releasing at the cap's screen-LEFT
//     rim. Already over open sky, so it keeps the shortest rise — which also
//     drops its label ~30 px clear of ArtCompute's, the last thing standing
//     between the two chips at 375 px.
//   - 2RP: 1.15 rad upwind, at the screen-RIGHT rim. Furthest upwind, so it
//     has the most frame to cross before it clears the dome — hence the
//     longest rise, and the hottest knot cadence.
// Rises are shorter across the board than D16's: the same dot budget in less
// length is what makes a plume read as a defined stream instead of a thin
// scatter, and it keeps the band inside the frame.
// Births are unaffected — every dot is still born in ArtCompute's wedge and
// walks the rim out (the delta rule), so the birth-wedge constraint applies to
// the SOURCE only; the two release sectors may sit outside it.
// `knot` is the per-plume knot-cadence gain (W4-A gap a): how hard the bright
// pearls along each winding core read. ArtCompute's is damped to 0.58 because
// it already carries half the dots — without that the centre braid drowns the
// two flanks and the frame reads as one plume with wings.
// RISE SPREAD IS THE DENSITY DIAL (2026-08-06). Each plume's dots are handed a
// rise drawn uniformly from [riseMin, riseMax], so the MEAN sets where the
// plume ends — the composition, the chip clearance, the dome crossing — and the
// SPREAD sets how concentrated it reads on the way there. Those are separable,
// and until now only the mean was being used.
//
// This matters because the exit weighting is 50/28/22 (W_EXIT0 in
// organism/spores.js, read-only), so ArtCompute has 2,100 dots against 2RP's
// 924 and outshines both flanks however they are lit — the residual this file
// has carried since D18. With the core ribbons retired (see index.js) the dots
// are the only thing marking the three regions, so the flanks have to earn
// their definition from density rather than from a drawn line through them.
//
// Every mean below is UNCHANGED to 3 decimal places, so no plume moves and the
// approved D18 composition, label solve and clearances all still hold:
//   ArtCompute 1.70-2.20 -> 1.55-2.35  mean 1.950 (spread x1.60: deliberately
//     DIFFUSED, so the centre stops drowning the flanks)
//   Arca       1.05-1.40 -> 1.13-1.32  mean 1.225 (spread x0.54: concentrated)
//   2RP        1.76-2.21 -> 1.87-2.10  mean 1.985 (spread x0.51: concentrated,
//     the weakest plume and the one that needed it most)
export const EXITS = [
  { id: 'artcompute',   label: 'ArtCompute',         az: 5.83, riseMin: 1.55, riseMax: 2.35, lean: 0.52, tone: 0.66, knot: 0.58 },
  { id: 'arca',         label: 'Arca Gidan Prize',   az: 6.98, riseMin: 1.13, riseMax: 1.32, lean: 0.42, tone: 0.6, knot: 0.95 },
  { id: '2rp',          label: '2RP',                az: 4.68, riseMin: 1.87, riseMax: 2.10, lean: 0.38, tone: 0.74, knot: 1.0 },
];
