// journey-v6 — portrait re-composition field (W4-F / 12-platforms PL-1.1).
//
// A tall frame cannot hold the landscape compositions: the copy blocks own
// more of the frame (Inspire bottom, Connect left-low, Owned top-centre,
// Final top) and the horizontal fov collapses. Plate II's portrait column
// gives each rest a DELIBERATE portrait pose — this module is those poses,
// expressed as an authored OFFSET FIELD blended over the landscape path:
//
//   pose(p, aspect) = poseAt(p) ∘ offset(p) · w(aspect)
//
//   offset(p)  — authored per-rest deltas, interpolated between keys with
//                zero-slope smoothstep, so every leg eases from one portrait
//                intention to the next with no velocity step of its own.
//   w(aspect)  — 0 for aspect >= 1 (landscape is BIT-identical to the
//                un-offset path), 1 for aspect <= 0.75 (phones), smooth
//                between (folded tablets, split windows).
//
// Offsets are FRAME-relative, not world-relative, so they survive the legs:
//
//   back     dolly multiplier along the view axis, about the landscape
//            target (1 = none). Re-aims nothing; buys vertical context.
//   rise     camera world-Y delta — lifts/lowers the eye without re-aiming.
//   truck    camera+target shift along view-right — slides the whole frame
//            sideways, gaze direction unchanged.
//   tgtUp    target world-Y delta — the vertical re-aim (what actually moves
//            the composition up or down the tall frame).
//   tgtRight target-only shift along view-right — the horizontal re-aim.
//   fov      additive vertical-fov delta.
//
// The field is EXACTLY zero at and below the orbit start (p 0.040): below it
// the camera is the hero's pose verbatim, and in portrait the hero's own
// responsive table (index.html VIEWS.mobile / .tablet) already IS the
// approved Mission portrait composition (Plate II row 1: "portrait — live
// mobile pose, cam y 3.2, fov 64"). Mission portrait is the hero's, kept.
//
// Everything here is a pure function of (p, aspect) — no state, no time, no
// DOM reads — so reverse scrubbing is exact and capture tooling can request
// either orientation from any window (?aspect=portrait, wired in director).

import { restProgress } from './route.js';
import { smooth01 } from './lib/ease.js';

/* ------------------------------------------------------------------ */
/* Aspect weight                                                       */
/* ------------------------------------------------------------------ */
export const PORTRAIT_FULL_ASPECT = 0.75;   // at or below: full field
export const PORTRAIT_ZERO_ASPECT = 1.00;   // at or above: exactly zero

export function portraitWeight(aspect) {
  if (!(aspect < PORTRAIT_ZERO_ASPECT)) return 0;   // NaN/undefined → landscape
  return 1 - smooth01(
    (aspect - PORTRAIT_FULL_ASPECT) / (PORTRAIT_ZERO_ASPECT - PORTRAIT_FULL_ASPECT),
  );
}

/* ------------------------------------------------------------------ */
/* The authored field                                                  */
/* ------------------------------------------------------------------ */
// Keys at the rests carry the composition; keys on the legs exist only to
// keep the travel honest (the slip-under must still slip UNDER the rim, the
// stipe descent must stay outside the stipe — clearance there is ~0.5 world
// units, so those legs run the field near zero and let it bloom at the rest).
// p values reference director.js: ORBIT_P0 0.040, rests 0.26 / 0.5230 / 0.725 /
// restProgress('final') (0.97 since §14), descent keys 0.622–0.718.
const ZERO = { back: 1, rise: 0, truck: 0, tgtUp: 0, tgtRight: 0, fov: 0 };

const KEYS = [
  // Mission + orbit head: zero — the hero's own mobile pose is the portrait
  // composition, and the orbit must lift off from it without a step.
  { p: 0.040, ...ZERO },

  // INSPIRE (rest 0.26) — RE-AUTHORED for the D18 restage. The old field
  // (back 1.60, rise 0.60, tgtRight 1.05, fov +14) was composed for the az 78
  // rest and its tight plume cluster; against the az 115 rest it drove the
  // whole organism off the left edge and clipped Arca's chip.
  //
  // The binding constraint in portrait is not the plumes, it is the CHIPS.
  // "Arca Gidan Prize" is 132 px of text — 161 px of wrapper — in a 375 px
  // frame, and it anchors to a plume. An 8,640-point sweep of this field found
  // ZERO settings that fit all three chips while keeping all three plumes in
  // frame, until anatomy.js moved Arca onto the downwind (screen-left) lip and
  // 2RP's 27 px chip onto the upwind one. With that swap this field clears
  // everything: plume union x 13..354 inside a 375 frame, chips 50..356, no
  // chip-to-chip collision at either 375x812 or 430x932, and 29 px of dark sky
  // between adjacent braids (the landscape figure is 79 px at 1440 — the same
  // ~5% of frame width). The copy block starts at y 484; the plumes end at 455
  // and the lowest chip at 394.
  //
  // back stays at 1.50, deliberately close to the 1.55 of the p 0.4315 key
  // below: portrait subject-distance is roughly landscape-distance x back, so
  // a bigger dolly here would make the portrait travel ZOOM IN toward Connect
  // while the landscape widened. 1.50 -> 1.55 keeps it growing (12.7 -> 13.6),
  // and fov +13 keeps that growing too (53 -> 59).
  //
  // D19 (Hannah, 2026-08-06) asks for the cap's centre at the midpoint of the
  // gap over the copy in BOTH orientations, and portrait cannot inherit it:
  // the landscape re-aim is a fixed world target, but the tall frame's copy
  // block sits at a different fraction of the viewport, so the same gaze left
  // the cap 113.9 px low at 375x812. This field's whole purpose is that
  // mismatch, and tgtUp is the documented lever for it (the vertical re-aim).
  // At portrait's own distance (8.42 x back = 12.6) and fov 53, -1.64 is
  // exactly the 7.4 deg of pitch that 113.9 px is worth, and it lands 375x812
  // at +5.5 px. But ONE portrait pose cannot serve both phone sizes: the copy
  // block wraps to more lines in a 375-wide column than a 430-wide one, so its
  // top edge sits at 0.564 of the frame at 375x812 and 0.674 at 430x932 — the
  // gap's midpoint is a genuinely different place in the two frames, 0.282 vs
  // 0.337 of frame height. -1.64 overshot 430x932 to -44.8.
  //
  // So the value is balanced rather than fitted: -1.378 splits the residual
  // evenly, +23.8 px at 375x812 and -23.8 px at 430x932, which is the smallest
  // worst case available to a single pose. tgtRight comes back a hair,
  // 0.30 -> 0.258, for the 2.8 px the cap sat left of the copy's centre.
  //
  // D21 (2026-08-07) re-anchors the landscape band to the furniture the page
  // actually draws — nav bottom to headline glyph top, not viewport top to the
  // copy block's padding — and pushes the cap 49.3 px down. Portrait inherits
  // the landscape target, so it moved down by itself and this offset has to
  // come back up to meet the SAME re-anchored band in the tall frames.
  //
  // The portrait band is NOT the landscape one scaled. Its bottom is the
  // headline's first glyph, read off the rendered frame: y 489.0 at 375x812
  // and 659.0 at 430x932. Its top is y 93.1 in BOTH — and it is the active
  // nav link's underline, not the pills. The nav stacks in portrait (pills on
  // top at 49.7, links below at 85.1) where it is one row in landscape, so the
  // lowest thing the nav draws is the 1 px rule the `.active` ::after hangs
  // 8 px under its link. In landscape the same rule sits at 64.6, above the
  // pills' 66.1, and the pills win. Midpoints: 291.05 and 376.05.
  //
  // Balanced the same way and by the same argument, tgtUp -1.378 -> -0.856:
  // +19.5 px at 375x812 and -19.6 px at 430x932. That is a SMALLER worst case
  // than the pose it replaces (±23.8), which is the one piece of luck in this
  // edit — the two phone sizes' band midpoints sit closer together in
  // frame-fraction terms (0.358 vs 0.403) than their copy tops did (0.564 vs
  // 0.674). tgtRight is untouched: the horizontal never moved, and the cap is
  // still 187.17 / 214.62 against frame centres 187.5 / 215.
  // D23 (2026-08-19): desktop retains just 0.038 u of D22's pan to optically
  // centre the asymmetric stalk rather than its cap transform. Portrait was
  // already centred by measure, so retain only the matching +0.038 response
  // here (0.258 -> 0.296); the phone/tablet projection remains unchanged.
  { p: 0.260, back: 1.50, rise: -0.50, truck: -0.30, tgtUp: -0.856, tgtRight: 0.296, fov: 13 },

  // Ground-descent approach (D16 restage; retuned 2026-08-04 for the
  // monotone Inspire->Connect zoom-out): the landscape leg no longer pushes
  // in toward the stream, so the old light back (1.14) here made the
  // PORTRAIT travel re-approach mid-leg while the landscape widened. The
  // back eases 1.60 -> 1.55 -> 1.62 between the two rests so portrait
  // subject-distance and fov grow monotonically with the landscape's; the
  // tgtUp/tgtRight now lean a third of the way toward the re-composed
  // Connect rest so the last 0.08 of the leg is a settle, not a lurch.
  // tgtUp 0.55 -> 0.30 with the 2026-08-05 eye lift: the landscape leg now
  // aims ~5-7 deg higher on its own, so the portrait field has to add
  // proportionally less to reach the same portrait composition (and to keep
  // the chapter's camera-pure resolve — which reads the GAZE — matching the
  // landscape's).
  //
  // The key RIDES THE LEG, not a literal (2026-08-10, when the Connect rest
  // moved 0.490 -> 0.5230 with route.js stops [0.65] and the travel became
  // the one-movement approach gesture): this file was the other documented
  // absolute-p violation of route.js's ownership, and for these two keys it
  // no longer is. The mid-leg key keeps its authored position IN LEG TERMS —
  // 0.652 of the way from the Inspire rest to the Connect rest, exactly the
  // fraction (0.4315 - 0.26) / (0.5230 - 0.26) the shipped literal encoded.
  { p: restProgress('inspire') + 0.652 * (restProgress('connect') - restProgress('inspire')),
    back: 1.55, rise: 0.28, truck: 0, tgtUp: 0.30, tgtRight: -0.12, fov: 11 },

  // CONNECT (rest restProgress('connect') — 0.5230 since the 2026-08-10 stop
  // move; ground panorama) — re-authored 2026-08-04 for the
  // top-left / top-right restage. The landscape frame gives the mushroom the
  // upper-LEFT and the copy the upper-RIGHT; a 375-wide frame has no "beside",
  // so portrait stacks the same three elements instead: copy across the top
  // (pos-topright at 88vw), the mushroom in the middle-left band directly
  // under it, and the three hubs fanned through the lower half. The strong
  // tgtUp is what pushes the whole organism DOWN clear of the copy block, the
  // rise keeps the ground plane open under it, and the dolly-back compresses
  // the 56-deg landscape hub fan into the ~35-deg portrait frustum so all
  // three hub cores stay inside the frame. (Per-orientation hub label anchors
  // are the chapter's own affair — doc §3; only Discord still needs one.)
  // tgtUp 2.75 -> 1.50 (2026-08-05, the eye lift): the landscape rest already
  // aims 7 deg higher, so the old delta double-counted it — the portrait
  // mushroom sank to 0.59 of the tall frame and, worse, the portrait gaze came
  // out at only -4.7 deg, which left the chapter's camera-pure resolve at 0.66
  // instead of 1 at the portrait rest. 1.50 restores BOTH: portrait gaze -8.9
  // deg (matching the landscape rest exactly, so the network resolves fully in
  // both orientations) and the shipped portrait stack — copy across the top,
  // mushroom in the middle-left band under it, hubs fanned through the lower
  // half. The strong-tgtUp reasoning below is unchanged, only its magnitude.
  //
  // rise/tgtUp 1.50 -> 2.30 (2026-08-19, portrait taste pass): phones wanted
  // another ~32-36px of separation below the copy, tablets ~40-46px. Moving
  // the EYE and TARGET up by the same 0.80 is a pure vertical frame truck:
  // the mushroom/network move down together while pitch stays bit-identical.
  // That last property is load-bearing — Connect's reveal is derived from
  // forward.y, so changing tgtUp alone would leave the ground under-resolved.
  { p: restProgress('connect'), back: 1.62, rise: 2.30, truck: 0, tgtUp: 2.30, tgtRight: -0.30, fov: 8 },

  // The approach to the trunk + the exterior descent (0.575–0.718):
  // near-zero field — clearance to the stipe is small and the leg's whole
  // job is the convergence itself. A whisper of fov keeps the frame from
  // feeling suddenly narrower than the panorama.
  { p: 0.622, back: 1.04, rise: 0.05, truck: 0, tgtUp: 0.05, tgtRight: 0, fov: 4 },
  { p: 0.700, back: 1.01, rise: 0, truck: 0, tgtUp: 0, tgtRight: 0, fov: 3 },

  // OWNED (rest 0.725) — RE-KEYED for the root-network restage
  // (20-owned-root-network.md). The landscape composition hangs on one thing:
  // the root crown entering the frame at TOP CENTRE, at NDC (0, 0.92). The
  // shipped portrait field was authored for the old level-gaze colony and
  // pulled that apart in both axes — its dolly-back and +10 fov dropped the
  // crown to NDC y 0.57 (mid-frame, buried behind the sub line) and its
  // tgtRight 0.25, which existed to keep the retired POD CLUSTER off the
  // right edge, slid it to NDC x -0.23.
  //
  // So: tgtRight to 0 (the pods it protected no longer exist, and the
  // portrait arc is symmetric), a much smaller dolly-back, and the gaze
  // dropped further (tgtUp -0.16 -> -0.28) so the frame keeps its lower
  // two-thirds of network while the crown climbs back to the top edge.
  // Measured at 375x812: crown NDC (0.000, 0.792) — top of frame, the
  // headline overlapping the upper fan exactly as it does at 1440x900.
  { p: 0.725, back: 1.08, rise: 0.18, truck: 0, tgtUp: -0.28, tgtRight: 0, fov: 6 },

  // FINAL (rest → end-hold) — "steeper diagonal; copy top, ring stacked in
  // depth". Lift the eye and drop the gaze so the soil-line cuts a steeper
  // diagonal; the small rightward frame-shift (tgtRight < 0 aims left of
  // the hero, sliding it toward the right edge) keeps the headline clear of
  // the hero's cap. The end-hold carries the same offsets so the epilogue
  // stays one continuing line.
  //
  // The key rides restProgress('final') instead of a literal (2026-08-09
  // §14, when the rest moved 0.925 -> 0.97 and a stale literal here would
  // have completed the Final portrait composition mid-approach): this file
  // was one of the two documented absolute-p violations of route.js's
  // ownership, and for this key it no longer is. The key continues to follow
  // the route; the portrait-only composition values are refined below.
  // Final portrait taste pass (2026-08-19): the large right-hand mushroom
  // carried too much weight at the top edge while the lower field went quiet.
  // +0.45 truck moves the world ~18-26px left, bringing that anchor farther
  // into frame. The equal +1.00 rise/tgtUp delta lowers the whole field by
  // ~40-60px without changing pitch and makes the bright bottom-right crop
  // decisive rather than incidental. The end-hold repeats the same pose so
  // the composition does not drift after arrival.
  { p: restProgress('final'), back: 1.08, rise: 2.35, truck: 0.45, tgtUp: 0.55, tgtRight: -0.35, fov: 8 },
  { p: 1.000, back: 1.08, rise: 2.35, truck: 0.45, tgtUp: 0.55, tgtRight: -0.35, fov: 8 },
];

/* Connect -> Owned portrait centring arc (2026-08-19).
   The narrowing portrait frustum left the mushroom/stipe outside the left
   edge for most of the visible descent. This is an independent horizontal
   frame truck so it cannot perturb the authored dolly, sink, fov or gaze:
   camera and target move together, peaking while the stipe is still visible
   and relaxing to zero before Owned's centred rest. The remaining rightward
   drift is intentional — a perfectly pinned subject read as stabilization,
   not a camera move. Values are projection-tuned at 430x932 and 768x1024. */
const DESCENT_TRUCK_KEYS = [
  { p: restProgress('connect'), value: 0 },
  { p: 0.570, value: -3.50 },
  { p: 0.600, value: -2.90 },
  { p: 0.622, value: -2.35 },
  { p: 0.660, value: -1.10 },
  { p: 0.700, value: 0 },
];

function descentTruckAt(p) {
  if (p <= DESCENT_TRUCK_KEYS[0].p || p >= DESCENT_TRUCK_KEYS[DESCENT_TRUCK_KEYS.length - 1].p) return 0;
  let i = 0;
  while (i < DESCENT_TRUCK_KEYS.length - 2 && p > DESCENT_TRUCK_KEYS[i + 1].p) i++;
  const a = DESCENT_TRUCK_KEYS[i], b = DESCENT_TRUCK_KEYS[i + 1];
  const t = smooth01((p - a.p) / (b.p - a.p));
  return a.value + (b.value - a.value) * t;
}

/* ------------------------------------------------------------------ */
/* The tablet band (2026-08-17, Hannah's tablet feedback on Inspire)   */
/* ------------------------------------------------------------------ */
// One portrait pose cannot serve a phone AND a portrait tablet: the Inspire
// key above is balanced across 375x812 / 430x932 (aspect ~0.46), but at
// 768x1024 (aspect 0.75) the same pose leaves the mushroom "a touch too
// delicate" with a dead band between cap and headline (Hannah, 2026-08-17).
// The two form factors are cleanly separated in aspect — phones <= ~0.47,
// portrait tablets ~0.66-0.80 — so a second, DELTA field rides on top of the
// portrait field, weighted by a band ramp that is zero through every phone
// and full across the tablet range. It composes multiplicatively with
// portraitWeight (which itself fades to zero by aspect 1.0), so landscape
// remains bit-identical and phones remain bit-identical BY CONSTRUCTION.
//
// Inspire tablet intent (both judged on the rendered 768x1024 frame):
//   back  -0.18   1.50 -> 1.32: subject-distance 12.6 -> 11.1, the mushroom
//                 reads ~13% larger — portrait height can carry the weight.
//   tgtUp +0.50   aims higher, so the subject sits ~46 px LOWER in the tall
//                 frame (0.0108 u/px at the tablet's distance and fov) —
//                 closing the dead band between stem and headline from the
//                 top while the copy block's tablet raise closes it from
//                 below (site.css pos-bottom tablet rule, same date).
// The deltas bloom at the Inspire rest and are gone by the mid-leg key —
// the travel legs and every other rest are untouched until they earn their
// own tablet pass.
const TABLET_FULL_ASPECT = 0.66;   // at or above (to portraitWeight's fade): full
const TABLET_ZERO_ASPECT = 0.52;   // at or below: exactly zero (phones)
function tabletBand(aspect) {
  if (!(aspect > TABLET_ZERO_ASPECT)) return 0;
  return smooth01((aspect - TABLET_ZERO_ASPECT) / (TABLET_FULL_ASPECT - TABLET_ZERO_ASPECT));
}
const TZERO = { back: 0, rise: 0, truck: 0, tgtUp: 0, tgtRight: 0, fov: 0 };
const TAB_KEYS = [
  { p: 0.040, ...TZERO },
  { p: restProgress('inspire'), back: -0.18, rise: 0, truck: 0, tgtUp: 0.50, tgtRight: 0, fov: 0 },
  { p: restProgress('inspire') + 0.652 * (restProgress('connect') - restProgress('inspire')), ...TZERO },
];

const FIELDS = ['back', 'rise', 'truck', 'tgtUp', 'tgtRight', 'fov'];
const _off = { ...ZERO };
const _toff = { ...TZERO };

function fieldAt(p, keys, out) {
  if (p <= keys[0].p) { Object.assign(out, keys[0]); return out; }
  const last = keys[keys.length - 1];
  if (p >= last.p) { Object.assign(out, last); return out; }
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const a = keys[i], b = keys[i + 1];
  const t = smooth01((p - a.p) / (b.p - a.p));   // zero slope at every key
  for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * t;
  return out;
}

function offsetAt(p) { return fieldAt(p, KEYS, _off); }

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */
// Scratch — plain objects so this module needs no three.js import and stays
// trivially testable. pose.pos / pose.target are THREE.Vector3-compatible.
const _fwd = { x: 0, y: 0, z: 0 }, _right = { x: 0, y: 0, z: 0 };

/** Blend the authored portrait field over a landscape pose, in place.
 *  Pure in (pose, p, aspect); a no-op (bit-identical pose) for aspect >= 1. */
export function applyPortrait(pose, p, aspect) {
  const w = portraitWeight(aspect);
  if (w <= 0) return pose;
  const o = offsetAt(p);
  o.truck += descentTruckAt(p);
  // tablet band: fold the delta field straight into this frame's offsets so
  // the application below stays one code path. tw is 0 for every phone and
  // rides w, so it inherits portraitWeight's fade toward landscape.
  const tw = tabletBand(aspect);
  if (tw > 0) {
    const t2 = fieldAt(p, TAB_KEYS, _toff);
    o.back += t2.back * tw;
    o.rise += t2.rise * tw;
    o.truck += t2.truck * tw;
    o.tgtUp += t2.tgtUp * tw;
    o.tgtRight += t2.tgtRight * tw;
    o.fov += t2.fov * tw;
  }

  // view frame of the LANDSCAPE pose
  _fwd.x = pose.target.x - pose.pos.x;
  _fwd.y = pose.target.y - pose.pos.y;
  _fwd.z = pose.target.z - pose.pos.z;
  // right = normalize(fwd × worldUp)  (worldUp = +Y; no roll anywhere)
  _right.x = -_fwd.z; _right.y = 0; _right.z = _fwd.x;
  const rl = Math.hypot(_right.x, _right.z) || 1;
  _right.x /= rl; _right.z /= rl;

  // dolly about the landscape target
  const back = 1 + (o.back - 1) * w;
  pose.pos.x = pose.target.x - _fwd.x * back;
  pose.pos.y = pose.target.y - _fwd.y * back;
  pose.pos.z = pose.target.z - _fwd.z * back;

  // camera lift + truck (truck carries the target with it)
  pose.pos.y += o.rise * w;
  pose.pos.x += _right.x * o.truck * w;
  pose.pos.z += _right.z * o.truck * w;
  pose.target.x += _right.x * o.truck * w;
  pose.target.z += _right.z * o.truck * w;

  // re-aim
  pose.target.y += o.tgtUp * w;
  pose.target.x += _right.x * o.tgtRight * w;
  pose.target.z += _right.z * o.tgtRight * w;

  pose.fov = Math.min(72, Math.max(24, pose.fov + o.fov * w));
  return pose;
}
