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
// The field is EXACTLY zero at and below the orbit start: below it
// the camera is the hero's pose verbatim, and in portrait the hero's own
// responsive table (index.html VIEWS.mobile / .tablet) already IS the
// approved Mission portrait composition (Plate II row 1: "portrait — live
// mobile pose, cam y 3.2, fov 64"). Mission portrait is the hero's, kept.
//
// Everything here is a pure function of (p, aspect, viewportWidth) — no state,
// no time, no DOM reads — so reverse scrubbing is exact and capture tooling
// can request either orientation from any window (?aspect=portrait, wired in
// director).

import { restProgress, startOf } from './route.js';
import { smooth01 } from './lib/ease.js';
import {
  PHONE_FINAL_SCENE_LIFT_PX,
  cameraWorldUnitsForPixels,
} from './layout/final-composition.js';

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
// p values reference director.js: the orbit start, then the rests, then the
// descent keys 0.6644-0.718 (the first of those rides the leg since
// 2026-08-24 — see its own note).
//
// THE ORBIT START IS A DECLARED CONVERSION, NOT A LITERAL (2026-08-30). It was
// written 0.040 here and in the note above, which was the right number for as
// long as the Inspire rest sat at p 0.26: the orbit's dead band is authored in
// chapters/inspire/camera.js as ARRIVAL_DEAD, a FRACTION of the arrival, and
// the product it forms with the live Inspire rest is 0.0308. Equip's arrival
// moved that rest 0.26 -> 0.20 and the product 0.040 -> 0.0308 with it, so the
// literal would have left 0.0092 of p — nearly a third of the dead band's own
// width — of real orbit with the field still pinned at zero, which is the one
// thing the note above says cannot happen.
//
// WHY THE FRACTION IS COPIED HERE RATHER THAN IMPORTED. chapters/inspire/
// camera.js imports three.js, and this module is deliberately three-free so
// that DOM-free suites (tools/test-connect-motion.mjs and friends) can import
// it in Node; importing the constant would drag three into every one of them.
// So the two ends are declared apart and PINNED AGAINST EACH OTHER in the pure
// ring — tools/test-declared-conversions.mjs recomputes the product and reds if
// either end moves without the other. That is the template
// tools/test-rest-composition.mjs set for exactly this shape of split
// (CONTRIBUTING.md §5), and it is what keeps this a conversion rather than a
// duplicated magic number.
const ZERO = { back: 1, rise: 0, truck: 0, tgtUp: 0, tgtRight: 0, fov: 0 };

const ORBIT_DEAD_FRACTION = 0.15384615384615385;   // == chapters/inspire/camera.js ARRIVAL_DEAD
const ORBIT_P0 = ORBIT_DEAD_FRACTION * restProgress('inspire');

const KEYS = [
  // Mission + orbit head: zero — the hero's own mobile pose is the portrait
  // composition, and the orbit must lift off from it without a step.
  { p: ORBIT_P0, ...ZERO },

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
  // RIDES THE ROUTE, not a literal (2026-08-30). This was `p: 0.260`, which is
  // where the Inspire rest sat until Equip's arrival re-timed it to 0.20. The
  // composition below is unchanged to the digit; only the p it is authored AT
  // is now asked of route.js, which owns it. This file's two other keys made
  // the same move in 2026-08-10 and 2026-08-09 for exactly this reason.
  { p: restProgress('inspire'), back: 1.50, rise: -0.50, truck: -0.30, tgtUp: -0.856, tgtRight: 0.296, fov: 13 },

  // EQUIP (rest restProgress('equip') — 0.32; the underside ceiling, R3).
  // The landscape rest stands 2.4 out at eye 0.85 with fov 56, looking 49 deg
  // UP — the gill fan overhead, the stalk a column on the right third. The
  // view axis therefore CLIMBS steeply, and that changes what `back` does
  // here: dollying out slides the eye down that axis fast (0.42 of back is
  // ~1.26 units of eye drop). The retired shallow pose could spend back 1.42
  // and pay the height back with a small negative rise; folded onto the steep
  // pose the same key drove the eye to y -0.75 — underground, the whole frame
  // fogged brown. Every number below was re-derived against the steep pose on
  // rendered 430x932 / 744x1133 frames:
  //   back  1.16   one step out from under the rim (horizontal 2.4 -> 2.8) so
  //                the narrow frame keeps a taller run of stalk and the near
  //                rim's arc enters the top of the frame as structure;
  //   rise  0.34   pays back the dolly's geometric drop — net eye y 0.70,
  //                still 1.7+ under the lowest cap geometry (2.47);
  //   tgtUp -0.15, tgtRight 0.17 — the aim eases toward the throat's centre
  //                line ((0.45,3.85) -> ~(0.30,3.70)) so the stalk holds the
  //                middle of the tall frame instead of its right edge;
  //   fov   +4     60 vertical: the tall frame's horizontal fov is what
  //                collapses, and the widening keeps a corner-to-corner sweep
  //                of gill rays overhead without leaving the underside.
  { p: restProgress('equip'), back: 1.16, rise: 0.34, truck: 0, tgtUp: -0.15, tgtRight: 0.17, fov: 4 },

  // Ground-descent approach (D16 restage; retuned 2026-08-04 for the
  // monotone Inspire->Connect zoom-out): the landscape leg no longer pushes
  // in toward the stream, so the old light back (1.14) here made the
  // PORTRAIT travel re-approach mid-leg while the landscape widened. The
  // back eases 1.60 -> 1.55 -> 1.62 between the two rests so portrait
  // subject-distance and fov grow monotonically with the landscape's; the
  // tgtUp/tgtRight now lean toward the re-composed Connect rest so the last
  // slice of the leg is a settle, not a second movement.
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
  // D24 (2026-08-21, repeated stall-then-roll report): D23 added an equal
  // +0.80 eye/target truck only at the Connect rest. Because every field key
  // has zero slope, the old 0.28/0.30 mid key made that new truck stop here,
  // then accelerate through the visible ground-light intro. Carry the same
  // +0.80 into this travel key: the approved rest stays byte-identical, pitch
  // stays unchanged, and the reframe is distributed through one movement.
  // RE-ANCHORED TO THE LEG IT DESCRIBES (2026-08-30). The fraction 0.652 and
  // every value below are untouched; what changed is which leg the fraction is
  // OF. This key is the ground-descent approach — the travel into Connect —
  // and until Equip landed, that travel began at the Inspire rest. It begins
  // at the Equip rest now (journey/director.js composes connect/camera.js's
  // approach from there), so anchoring it to Inspire would have put the
  // mid-travel key a third of the way back inside the fly-around, where the
  // camera is doing the opposite of descending.
  { p: restProgress('equip') + 0.652 * (restProgress('connect') - restProgress('equip')),
    back: 1.55, rise: 1.08, truck: 0, tgtUp: 1.10, tgtRight: -0.12, fov: 11 },

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

  // The approach to the trunk + the exterior descent: near-zero field —
  // clearance to the stipe is small and the leg's whole job is the
  // convergence itself. A whisper of fov keeps the frame from feeling
  // suddenly narrower than the panorama.
  //
  // RE-TIMED, NOT RE-AUTHORED (2026-08-24, Hannah on a phone: "when I scroll
  // into Owned from Connect on mobile, the mushroom should be in the middle
  // of the camera view. Currently it's off to the left and then it turns in
  // when it's near to it"). Every value below is the shipped one; only WHEN
  // it arrives has changed, 0.49 -> 0.70 of the leg.
  //
  // The desktop report that arrived alongside this one is a different fault
  // with a different cause (owned/camera.js's gaze ease, fixed there). On
  // desktop the subject's screen-x is a monotone arc that is merely badly
  // paced. IN PORTRAIT IT REVERSES: measured at 430x932, the root crown ran
  // -159 px -> -292 px -> centre, i.e. it swung 136 px FURTHER LEFT — 77 px
  // beyond the left edge of a 430-wide frame, off-screen entirely — before
  // coming back. Same words from the owner, genuinely different defect.
  //
  // Why: this key's collapse of the Connect composition is where portrait's
  // leftward motion lives. Dollying in (back 1.62 -> 1.04) magnifies the
  // off-centre offset of anything that is not the target, and the crown is
  // far off-centre here; the fov narrowing and rise drop add to it, and
  // tgtRight -0.30 -> 0 is worth another 71 px of leftward travel on its own.
  // Freezing back alone removes 117 of the 136 px, so it is the bulk of it.
  // ALL of that was spent in the leg's first half, while the landscape yaw —
  // the only rightward contribution — spent itself in the back half. Two
  // opposed movements, phased apart: the sum is the largest reversal the
  // parts can produce.
  //
  // So the fix is to make them overlap. The key rides 0.70 of the leg instead
  // of 0.49, which delays back/fov/rise/tgtRight TOGETHER, in their authored
  // proportions, into the window where the yaw is working. With the gaze fix
  // in owned/camera.js the reversal goes 136 px -> 20 px and the crown never
  // leaves the frame (min -179 px inside a 215 px half-frame). Neither lever
  // is sufficient alone: the gaze fix by itself still clips off-frame at
  // -229 px, and this re-timing by itself still clips at -247 px.
  //
  // Nothing composed moves: both rest keys are untouched and both rest poses
  // are bit-exact, landscape is bit-identical by construction (portraitWeight
  // is 0 at aspect >= 1, verified), and owned/leg.js only ever calls frameAt
  // at the rest (0.725) and at exitP (~0.85), so the colony is untouched.
  // Clearance is not spent but gained — holding `back` higher for longer
  // keeps the eye FURTHER out through the descent (min stipe clearance
  // 2.065 -> 2.070). The portrait soil crossing moves 0.68813 -> 0.68866,
  // 5.4e-4 against a 0.020-wide murk window.
  //
  // Rides the leg rather than a literal p, like the Inspire mid-leg key
  // above and for the same reason (route.js owns p).
  { p: restProgress('connect') + 0.70 * (restProgress('owned') - restProgress('connect')),
    back: 1.04, rise: 0.05, truck: 0, tgtUp: 0.05, tgtRight: 0, fov: 4 },
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
  // the composition does not drift after arrival. The phone-only lift is
  // applied separately below, where the width breakpoint cannot be confused
  // with the tablet aspect band.
  { p: restProgress('final'), back: 1.08, rise: 2.35, truck: 0.45, tgtUp: 0.55, tgtRight: -0.35, fov: 8 },
  { p: 1.000, back: 1.08, rise: 2.35, truck: 0.45, tgtUp: 0.55, tgtRight: -0.35, fov: 8 },
];

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
//                 -0.18 -> -0.50 (2026-08-30, owner on iPad Mini portrait:
//                 the second section should come closer, with mobile-like
//                 presence, and be RECOMPOSED rather than scaled down from
//                 desktop). 13% was not enough of a step: measured on the
//                 rendered 744x1133 frame the shipped pose left the top third
//                 of the screen carrying nothing but faint plume, which is the
//                 same "too delicate" reading this block was opened to fix,
//                 one form factor along. -0.50 takes subject-distance to ~9.9.
//                 THE CEILING HERE IS THE SAME ONE THE PHONE HAS — the three
//                 initiative labels must stay inside the frame without an
//                 edge nudge. Measured at 744x1133: at -0.18 Arca sits at
//                 x 123..233 and ArtCompute at 485..604; at -0.35, 97..208 and
//                 506..625; at -0.50, 69..179 and 529..647 — 69px of left
//                 margin and 97px of right still in hand, all three admitted.
//                 The phone's -0.66 is NOT available here: it is only reachable
//                 with the phone-portrait label-anchor pull in inspire/index.js
//                 nodeWorld(), which this band does not get.
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
// The delta is gone by the EQUIP rest, not by the mid-travel key (2026-08-30).
// Both these bands bloom at the Inspire rest and decay to zero at their last
// key; with Equip between the rests, decaying to the mid-travel key would have
// left roughly half of Inspire's dolly-in still applied at the Equip rest — an
// unauthored composition folded on top of an authored one. Equip's own key in
// KEYS above is where its tablet/phone framing is decided.
const TAB_KEYS = [
  { p: ORBIT_P0, ...TZERO },
  { p: restProgress('inspire'), back: -0.50, rise: 0, truck: 0, tgtUp: 0.50, tgtRight: 0, fov: 0 },
  { p: restProgress('equip'), ...TZERO },
];

/* ------------------------------------------------------------------ */
/* The phone Inspire close-up (2026-08-27, Hannah's phone feedback)    */
/* ------------------------------------------------------------------ */
// "On Inspire, on mobile, can you make it zoom in significantly closer to
// the head of the mushroom and maybe be looking at it from below a bit more
// ... right now it feels too similar to the prior section on mobile."
//
// She is right about the cause, not just the symptom: the phone Inspire rest
// was a whole-organism portrait at subject-distance 12.6 — the same picture
// as the Mission hero with the plume mirrored. The two rests need to be two
// PLACES: Mission keeps the full figure, Inspire moves under the cap.
//
// Same mechanism as the tablet band above — a DELTA field folded into the
// portrait offsets — but gated by the phone width branch (<= 620px, the
// design contract the phone typography and the Connect/Final phone blocks
// already use), so tablets (768px) and every landscape mode are bit-identical
// BY CONSTRUCTION. The deltas bloom at the Inspire rest and are gone by the
// mid-leg key, exactly like the tablet band, so the Connect approach and its
// REST-01 gaze contract inherit the shipped path.
//
// The same session then widened the brief twice ("the mushroom should be
// higher up, pushed up on the page"; "consider deeply the overall feng shui
// of the Inspire page on mobile — too much dead space above the mushroom"),
// so the values below are a BALANCE solve for the whole 430x932 screen, not
// a zoom knob. Measured on the shipped pose: the organism's ink did not
// reach 30% of its peak until y 425 — 46% of a phone screen carrying faint
// plume against black — while the copy block and the navigator share the
// bottom 280 px. The rest below moves the subject up AND closer.
//
// Why these axes and not others (judged on rendered 430x932 / 375x812 pairs
// each iteration — before/after and the iteration ladder are archived in
// docs/code-health/evidence/2026-08-21-elegance-run-01/inspire-cam-mobile/):
//   back  -0.66   1.50 -> 0.84: eye-to-cap distance 14.87 -> 9.43, the cap
//                 ~58% larger on screen — the "zoom in significantly". This
//                 is the CEILING the chips set, not a taste stop: the two
//                 flanking release lips must project inside hotspot-frame's
//                 |ndc| 0.92 admission band or their labels are culled
//                 outright (measured: Arca's anchor at ndc -0.937 = hidden,
//                 -0.87 = a pill clipped by the frame edge). Even this value
//                 is only reachable together with the phone-portrait label-
//                 anchor pull in inspire/index.js nodeWorld() — Arca lands
//                 at ndc -0.66 and 2RP at 0.81, with 18.3 px and 16.2 px of
//                 frame margin and no edge-nudge on either.
//                 (First pass put Arca at -0.77; that cleared ADMISSION but
//                 not the FRAME — the pill still landed 4 px from the left
//                 edge and only got there through resolveX's +-26 px nudge,
//                 i.e. with its dot pulled off its own node. See the pull's
//                 own note in inspire/index.js.)
//   rise  -0.40   eye y 2.0 -> 1.167 net of the dolly's geometric lift —
//                 under every release lip (lips at 2.55/2.92/3.11, rim low
//                 point 2.42), so the underside gills read. NOT lower: a
//                 2026-08-27 iteration at eye 0.48 reproduced the exact trap
//                 camera.js's D19 note records ("near ground is bright
//                 ground") — the grazing root field became a lit band laid
//                 straight across the body copy.
//   tgtUp +0.46   net target y 2.024, gaze pitch +6.9 deg (shipped +1.2).
//                 THIS IS D21's EQUAL-VOIDS RULE, RE-SOLVED FOR THE CLOSE-UP.
//                 It was +0.70 when this block was first written (2026-08-27,
//                 pitch +8.8), on the reasoning that more upward pitch is what
//                 reads as "from below". That reasoning was WRONG and is
//                 retracted here rather than deleted: "from below" is bought
//                 by `rise` — the EYE below every release lip — not by the
//                 aim. Ablated on rendered 430x932 frames the same day: the
//                 underside gills read identically at pitch +5.5, +6.9, +8.8,
//                 because eye y 1.167 never moved. All the aim decides is
//                 where the head sits on the page, which is D21's question.
//                 Measured on no-chrome frames, cap silhouette taken as the
//                 rows carrying >= 80 lit strands, voids taken between the
//                 top furniture's bottom edge (y 59.8) and the copy block's
//                 top (y 650) — D21's "anchor to the furniture a viewer
//                 actually sees":
//                     tgtUp   cap rows    centre   void above / below
//                     shipped 349..365      357        289 / 285
//                     +0.70   312..462      387        252 / 188
//                     +0.57   295..444      369        235 / 206
//                     +0.46   281..453      367        221 / 197   <-
//                     +0.28   257..408      332        197 / 242
//                 +0.46 is the only value that closes D21's two voids (1 px
//                 apart) and it lands the head within 2 px of where D21 put
//                 it on the shipped pose — the same composition law, 58%
//                 more cap, seen from underneath. +0.28 INVERTS the voids,
//                 which is the shape D21 measured and rejected at +70 px.
//                 It also repays D19's ground: the bright root ring rides UP
//                 past the copy with the rest of the scene, so the field
//                 behind the sub falls from mean 51.6 / p95 116 at +0.70 to
//                 35.4 / 81 here (headline band flat at ~80 / 155). The
//                 close-up still costs copy contrast against the shipped
//                 pose's near-black 18.8 / 27 — that is this pose's real
//                 price and it is recorded, not hidden.
//   tgtRight -0.05  shares the admission margin between the two flanking
//                 lips (Arca was the binding edge, 2RP had slack) and holds
//                 D23's centring: measured on the rendered no-chrome frame,
//                 the stalk's SILHOUETTE centre (half-max edges of the
//                 stalk-only band, the stable form of this measurement) sits
//                 at x 211.0 against a 215 midline — the same -4 px the
//                 SHIPPED pose carries at 210.5, i.e. the close-up does not
//                 spend D23 at all.
//                 A -0.13 pan was tried on 2026-08-27 to buy Arca's frame
//                 margin from the camera instead of the label, and REJECTED
//                 on measurement: it moved the stalk to 221.0, from 4 px
//                 left of the midline to 6 px right, which is spending a
//                 recorded decision for a cosmetic gain. (An earlier read
//                 of that pan claimed it IMPROVED the centring to 214.6.
//                 That number came from a baseline-subtracted luminous
//                 centroid over a fixed row band, which drifts by 13 px with
//                 the band's choice because the band catches a varying slice
//                 of root glow. It is retracted; the silhouette measure
//                 above is band-stable and is the one to use.) The margin is
//                 therefore bought where D22 buys it — in the label anchor,
//                 inspire/index.js nodeWorld().
//                 What the frame does keep is an uneven pair of cut edges —
//                 in the cap band, column 0 / column 429 mean luminance
//                 97.3 / 75.5. That is the CHAPTER's asymmetry, not a
//                 framing error: D16/D18 put the spore stream on this side
//                 deliberately, so the left edge is where the light is.
//   fov   +2      53 -> 55: a touch of wide-angle steepens the from-below
//                 perspective without pushing the rim lips off-frame.
//
// What it deliberately spends: the cap's rim tips and the plume tops spill
// off the frame edges (they are context; the head is the subject — the same
// argument as landscape D21), and the root field drops to a thin ground band
// under the copy. Both are what makes the frame read as a different place
// from Mission's full figure — which was the original complaint.
//
// Inspire's own reveal machinery is safe under this by construction-plus-
// measurement: its reveal channels ride camera AZIMUTH alone
// (inspire/index.js camAzDeg reads pos.x/z), the dolly slides pos along the
// view line whose endpoints sit at az ~113.2/114.4 — far above the 78-deg
// ramp ceiling and far from the -90 fold — and az(p) over the whole phone
// arrival stays strictly monotone with max |delta| 1.30 deg vs the 621-wide
// ablation (measured, 441-sample scrub over p 0.040..0.26, both phone
// widths, 2026-08-27). The 2026-08-27 rebalance below moved only `tgtUp` and
// `tgtRight`, both of which re-aim the TARGET and leave pose.pos alone, so
// az(p) is bit-identical to that scrub rather than merely close to it.
const PHONE_KEYS = [
  { p: ORBIT_P0, ...TZERO },
  { p: restProgress('inspire'), back: -0.66, rise: -0.40, truck: 0, tgtUp: 0.46, tgtRight: -0.05, fov: 2 },
  // Zero at the Equip rest — see the TAB_KEYS note above.
  { p: restProgress('equip'), ...TZERO },
];

const FIELDS = ['back', 'rise', 'truck', 'tgtUp', 'tgtRight', 'fov'];
const _off = { ...ZERO };
const _toff = { ...TZERO };
const _poff = { ...TZERO };

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

// Phone-only Connect framing. Keep this as a projection-space camera offset
// so the live director and Connect's ADOS placement solve consume the
// same pose. The envelope is zero-slope at the chapter boundaries and peaks
// at the authored Connect rest, preserving exact reverse scrubbing.
//
// DELIVERY CHANGED, MAGNITUDE UNTOUCHED (2026-08-24). The authored 0.45 and
// its width ramp and its envelope are all the shipped ones; what changed is
// that the offset now moves EYE AND TARGET TOGETHER — a pure vertical truck —
// instead of the target alone.
//
// Why it had to: target-alone is a PITCH, and the Connect rest key twelve
// lines above says why that is not available on this leg — "Connect's reveal
// is derived from forward.y, so changing tgtUp alone would leave the ground
// under-resolved". Measured at 430x932 against the 621-wide ablation (same
// portrait field, phone-only blocks off): gaze at the rest -6.20 deg instead
// of -7.72, so the camera-pure resolve read 0.9267 at the rest instead of
// 1.0000, never reached 1 before the rest, and was NON-MONOTONE across the
// leg (0.296 at p 0.400 -> 0.242 at p 0.420 -> rising). The gaze rate
// reversed sign mid-glide, -36 -> +15 -> -40 deg/p: a visible nod, with the
// whole network's brightness (arm x resolve x entry) dipping and recovering
// with it. Downstream, the chips' 0.72 gate floor rode the depressed resolve,
// so the section's own icons could not finish forming at the rest — the
// owner's "the icon arrives in too late and out of sync".
// (docs/code-health/evidence/2026-08-21-elegance-run-01/phone-01/)
//
// A truck keeps forward.y bit-exact, so every camera-pure reveal threshold on
// the leg is exactly the ablation's, while the frame still moves down: it is
// the same pattern as Final's phone lift below, and as the 2026-08-19
// rise/tgtUp +0.80 pass, adopted there for this same reason.
//
// What it costs, measured, on the frame: at the rest the three Connect hubs
// sat 19.4 / 18.6 / 20.0 px lower than the ablation under the pitch, and sit
// 23.9 / 20.2 / 25.8 px lower under the truck — the same composition a few px
// deeper (a truck is a parallax move, so the shift grows mildly with depth,
// where a pitch is near-uniform). 0.45 is deliberately NOT re-tuned to erase
// those 1.6-5.8 px: that is a taste call on a rendered phone frame, and it is
// the owner's, not this file's. It does mean connect@430x932 legitimately
// changes and wants a deliberate re-shoot.
const PHONE_CONNECT_TARGET_Y = 0.45;

function phoneConnectTargetY(viewportWidth) {
  return PHONE_CONNECT_TARGET_Y * smooth01((viewportWidth - 320) / 70);
}

function phoneConnectWeight(p) {
  const rest = restProgress('connect');
  const full = restProgress('inspire') + 0.652 * (rest - restProgress('inspire'));
  if (p <= full) {
    return smooth01((p - startOf('connect')) / (full - startOf('connect')));
  }
  if (p <= rest) return 1;
  return 1 - smooth01((p - rest) / (startOf('owned') - rest));
}

/** Blend the authored portrait field over a landscape pose, in place.
 *  Pure in (pose, p, aspect, viewportWidth); a no-op (bit-identical pose) for
 *  aspect >= 1. */
export function applyPortrait(pose, p, aspect, viewportWidth = Infinity) {
  const w = portraitWeight(aspect);
  if (w <= 0) return pose;
  const o = offsetAt(p);
  // tablet band: fold the delta field straight into this frame's offsets so
  // the application below stays one code path. tw rides w, so it inherits
  // portraitWeight's fade toward landscape.
  // THE WIDTH GATE IS WHAT MAKES "ZERO THROUGH EVERY PHONE" TRUE. The block
  // above says the two form factors are cleanly separated in ASPECT — phones
  // <= ~0.47, portrait tablets 0.66-0.80 — and that is a fact about DEVICES,
  // not about viewports. A 620x1000 window is aspect 0.62: inside the tablet
  // ramp AND inside the phone width branch below, so both delta fields landed
  // on the same frame and their `back` values summed. Measured at 620x1000
  // while opening the tablet band up to -0.50: the stacked pose reached -1.07
  // and CULLED ArtCompute outright, with Arca Gidan 8px off the left edge —
  // the exact admission failure the phone block records as its own ceiling.
  // Gating on the same <= 620 the phone branch uses makes the two fields
  // disjoint BY CONSTRUCTION rather than by an assumption about device
  // aspects, and restores all three labels at that viewport.
  const tw = viewportWidth > 620 ? tabletBand(aspect) : 0;
  if (tw > 0) {
    const t2 = fieldAt(p, TAB_KEYS, _toff);
    o.back += t2.back * tw;
    o.rise += t2.rise * tw;
    o.truck += t2.truck * tw;
    o.tgtUp += t2.tgtUp * tw;
    o.tgtRight += t2.tgtRight * tw;
    o.fov += t2.fov * tw;
  }
  // phone Inspire close-up: same fold, gated by the phone width branch (the
  // contract the Connect lift and Final truck below already use). Width is a
  // hard branch and the field's own keys are zero outside the Inspire leg,
  // so tablets, landscape and every other chapter are untouched by
  // construction. See the PHONE_KEYS note above.
  if (viewportWidth <= 620 && aspect < 1) {
    const p2 = fieldAt(p, PHONE_KEYS, _poff);
    o.back += p2.back;
    o.rise += p2.rise;
    o.truck += p2.truck;
    o.tgtUp += p2.tgtUp;
    o.tgtRight += p2.tgtRight;
    o.fov += p2.fov;
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

  if (viewportWidth <= 620 && aspect < 1) {
    const connectW = phoneConnectWeight(p);
    const connectLift = phoneConnectTargetY(viewportWidth) * connectW;
    // Eye and target by the SAME amount: forward stays bit-exact, so
    // Connect's camera-pure resolve is the ablation's. See the note above.
    pose.pos.y += connectLift;
    pose.target.y += connectLift;
  }

  // Final's phone composition needs a literal CAMERA move, independent of
  // the aspect field above. The previous version folded this into KEYS and
  // then tried to cancel it through the tablet aspect band. That made the
  // requested lift weak or invisible on short/wide phones as their aspect
  // entered the tablet ramp. Width is the actual design contract used by the
  // phone typography (<= 620px), so use it here too. Moving eye and target by
  // the same amount is a pure vertical truck: foreground + background colony
  // rise together while pitch, scale, diagonal and reveal drivers stay exact.
  // The first taste pass lifted the colony 1.45 units, leaving a broad empty
  // ground band between it and Final's lower-left copy. The epilogue wants the
  // opposite relationship on phones: the field should settle down over the
  // heading and loosely wrap its top edge. A small downward camera truck puts
  // the near stems and the right-hand cap back into that band without changing
  // their scale, the cutaway diagonal, or any camera-pure reveal threshold.
  if (viewportWidth <= 620 && aspect < 1) {
    const finalW = smooth01(
      (p - startOf('final')) / (restProgress('final') - startOf('final')),
    );
    const legacyTruck = 0.35 * finalW;
    pose.pos.y += legacyTruck;
    pose.target.y += legacyTruck;

    // Move the world picture upward independently of Final's fixed copy and
    // Purpose navigation. Eye and target move together, preserving pitch,
    // scale and every camera-pure reveal threshold; only scene framing moves.
    const distance = Math.hypot(
      pose.target.x - pose.pos.x,
      pose.target.y - pose.pos.y,
      pose.target.z - pose.pos.z,
    );
    const finalLiftWorld = cameraWorldUnitsForPixels({
      pixels: PHONE_FINAL_SCENE_LIFT_PX,
      distance,
      fov: pose.fov,
      viewportHeight: viewportWidth / aspect,
    }) * finalW;
    pose.pos.y -= finalLiftWorld;
    pose.target.y -= finalLiftWorld;
  }
  return pose;
}
