// chapters/inspire/camera.js — INSPIRE's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// Two pieces, exactly the shipped path:
//
//   arrival  the Mission -> Inspire gesture: Spike A's approved orbit,
//            re-aimed per D16 — a ~90 deg swing RIGHT toward the hero's
//            visible spore stream. Authored in GESTURE-LOCAL u (0 = the
//            mission rest / hero pose, 1 = the Inspire rest); the composer
//            maps global p over [0 .. restProgress('inspire')] onto u.
//            Gesture qualities (re-shaped 2026-08-04, Hannah: "one smooth
//            arc"): no roll, and radius / height / fov / target all evolve
//            TOGETHER with the azimuth swing on one shared trapezoid ease —
//            no early target pin, no deferred push-in, no phase change
//            anywhere between the hero pose and the Inspire rest.
//
//   keys     the rest hold + rest drift + the first exit-follow key, in
//            LEG-LOCAL t over the chapter's route span (0.14..0.38 on the
//            shipped route; global p in comments). Keys are never authored
//            in global p, so re-timing or inserting chapters never
//            invalidates them (merge doc §5).
import * as THREE from 'three';
import { trapEase, azEase, quadBezier } from '../../lib/ease.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Inspire rest — D16 (Hannah, 2026-08-03) swung the camera RIGHT to az 78, off
// the rear three-quarter and onto the stream-side rim, so the spores the
// visitor was already watching are the spores the chapter organizes. D18
// (Hannah, 2026-08-05) keeps that intent and carries it FURTHER round:
// "reorientate ... a more advanced angle, such that the 3 streams coming from
// the edge of the mushroom are defined and just above the hero text ... it
// should be visible where they're coming from."
//
// WHY 115, AND WHY NOT FURTHER. Two quantities move against each other as the
// azimuth grows, and they were both measured on the real projection (a 201-
// sample drift-aware scrub of the rest, both aspects):
//
//   · LIP SPREAD. A rim point at cap azimuth `a` lands at screen-lateral
//     R*cos(az + a) and at depth R*sin(az + a); it is on the camera-facing
//     hemisphere only while sin(az + a) > 0. ArtCompute is frozen at a = 5.83
//     (334 deg), so az 116 would put it exactly at the nearest rim point and
//     both flanking lips symmetrically off it. That is the widest the three
//     release points ever project.
//   · BRAID OVERLAP. The plumes are strictly PARALLEL (anatomy.js explains
//     why), so past a point extra azimuth stops separating them and starts
//     laying them along one screen line. Measured minimum inter-plume screen
//     gap at 1440x900, gaps held at 1.15 rad: az 110 -> 59 px, az 115 -> 79,
//     az 120 -> 44, az 125 -> 35, az 130 -> 23, az 140 -> 3, az 150+ -> ~1.
//     Past ~125 the lips also cross behind the silhouette (facing < 0).
//
// 115 is where those meet: 79 px of dark sky between adjacent braids, all
// three lips still 0.20+ onto the near rim. Rotations of 95/100/105/110/120/
// 125/130/140/150/160/175 were all scored and rejected — see 07-chapter-
// inspire.md. Total arrival swing is now ~127 deg (hero az ~ -12 -> 115).
//
// THE EYE DROPS to y 2.0, below every release lip (the rim's world y runs
// 2.42..3.32 around the ring, and the three exits sit at 2.55 / 2.92 / 3.11).
// The lips are on the cap's UNDERSIDE: from above, the dome hides them and the
// plumes cross the whole cap before clearing it. Measured share of plume mass
// projecting inside the cap silhouette: y 2.9 -> 32%, y 2.5 -> 26%, y 2.0 ->
// 15%, y 1.0 -> 8%. y 2.0 is the compromise — the sources read, and the exit
// leg still only has to climb 0.9 to meet Connect at y 2.90 instead of 1.9.
// r 11 (from 9.1) and fov 40 (from 38) hold the widened cluster inside the
// frame without reaching the chapter's own fog (FOG_FAR 20).
//
// D19 (Hannah, 2026-08-06): "the cap of the mushroom should be just above the
// text ... the head should be in the middle of that space vertically, and
// horizontally aligned with the text. Right now it's a little bit off to the
// right, and it's too far down." Measured at the rest, 1440x900: the cap
// silhouette's centre sat at (815.7, 474.0) against a copy block whose top
// edge is 608.5 and whose centre is 720 — i.e. +95.7 px right and +169.8 px
// below the midpoint of the gap over the copy. Her read was exact.
//
// THE EYE DOES NOT MOVE. az, r and y are untouched; only `target` changes.
// That is not economy for its own sake, it is what makes this reframe cheap
// in every direction that matters:
//
//   · The reveal drive and the arming threshold are functions of camera
//     AZIMUTH alone (index.js camAzDeg reads position.x/z). Holding az 115 —
//     and holding r, which is the only other input to x/z — leaves az(p)
//     bit-identical over the whole leg, so the ARR ramps, the drive() bounds
//     and the 34-deg arming gate see exactly the run they were keyed to and
//     the particle-continuity troughs closed in b2c9584 cannot re-open.
//   · The lip-spread / braid-overlap balance that chose az 115 in the first
//     place is a property of the azimuth, so it survives verbatim.
//   · y 2.0 keeps the eye below every release lip, which is what makes the
//     sources read (see THE EYE DROPS above). Panning is the one move that
//     re-composes without spending that.
//
// WHY NOT WIDEN INSTEAD. Lifting the cap 170 px costs 7.5 deg of pitch, and
// the alternatives to spending it on the gaze were all measured: dollying
// back or opening the fov to hold more sky pushes the subject distance and
// fov past Connect's settled first key (8.79 / 48), which turns the exit leg
// from a widening into a push-IN — the exact regression the 2026-08-04 re-key
// removed. Dropping the eye to y 0.4 keeps the horizon low on paper (639 vs
// the shipped 633) but is worse on screen, not better: near ground is bright
// ground, and it lays a lit band straight through the headline (measured mean
// luminance of the lower band, x outside the copy column: shipped 21.1,
// eye-drop 29.6, this pose 24.6).
//
// WHAT IT COSTS. Aiming 7.5 deg lower brings more of the root plane into the
// bottom of the frame — the horizon runs from 633 to 463. That is the trade,
// and it is the smallest of the three on offer. The braids are barely touched:
// luminance-weighted centroid separation 214 px -> 206 px, and 2.8% of
// 2RP's light (0% of Arca's, 0.2% of ArtCompute's) passes off the top edge.
// All three release lips stay in frame with their facing unchanged at
// 1.00 / 0.21 / 0.19.
//
// The target is the exact solve, not a hand-nudge: a 2x2 Newton on the gaze's
// (right, up) offsets against the projected cap silhouette's bbox centre.
//
// D21 (Hannah, 2026-08-07): "for the inspire section, can you push the
// mushroom down a bit so the page feels more balanced." D19's construction was
// right and its ANCHORS were wrong. It centred the cap between the top of the
// VIEWPORT (y 0) and the top of the copy BLOCK (y 608.4, which is the block's
// padding box, not its text). Neither edge is a thing a viewer sees. What a
// viewer sees is the nav — logo / links / pills, bottom edge y 66.1 — and the
// first glyph of the headline, whose cap-height top is y 641.0 (the h2's rect
// starts at 634.0; the 7.0 px is the font's internal leading, and it scales
// with font-size: 0.1568 x fs, which is how the other viewports are derived).
// Anchored to the furniture the page actually draws, the band is [66.1, 641.0]
// and its midpoint is 353.5 — 49.3 px below where D19 put the cap. Same rule,
// honest anchors, and the frame's two voids come out EQUAL: 179.4 px of sky
// above the cap, 179.4 px of dark between the cap's rim and the headline.
//
// WHY NOT FURTHER, even though the plume is all above the cap. The subject's
// luminance-weighted centroid (mushroom + plume, everything above the horizon)
// sits 61 px HIGHER than the cap's bbox centre at every offset tested, so
// centring the INK rather than the head would want the cap at y 414 — sitting
// on the headline. Measured at +30 / +50 / +70 / +90 px and read on screen:
// +90 crowds the copy (139 px of clearance) and shortens the stipe to nothing,
// +70 inverts the two voids (200 above / 159 below). The plume is context that
// deliberately spills off the top edge; the head is the subject. Anchor the
// head, and let the plume be air.
//
// IT ALSO REPAYS SOME OF D19's GROUND. Aiming higher pitches the horizon back
// DOWN the frame: 463.3 -> 511.7 at 1440x900, recovering 48 of the 170 px D19
// spent, and the lower-band mean luminance falls 24.80 -> 24.62. Light lost
// off the top edge falls with it (mean of rows 0-3: 18.39 -> 16.63).
// D23 CENTRED REST (2026-08-19): the deliberate D22 2%-right offset read as
// an alignment miss once the lower copy was tuned. Put the stalk and the
// centred heading on the viewport's actual midpoint. A full 0.196-u reversal
// centres the cap transform but leaves the stalk's asymmetric luminous mass
// 5.5px left of centre in the rendered 1440x900 frame. Reversing 0.158 u
// instead is the optical solve for the stalk itself. At this pose view-right
// is (-0.4211, 0, -0.9070), giving the target below. Az/r/y, pitch and every
// reveal input remain exact. Portrait cancels the remaining 0.038-u offset in
// portrait.js, so its solved phone/tablet framing stays visually unchanged.
// (2026-08-27: the PHONE rest is since re-composed downstream — a close-up
// from below, portrait.js PHONE_KEYS, per Hannah's mobile feedback. Nothing
// here moved: tablets still read this rest through the D23 solve verbatim,
// and the phone pose is a pure portrait-field fold over it. A second pass the
// same day checked whether the close-up had SPENT D23 on the phone, and it
// had not: measured on the rendered no-chrome frame, the stalk's silhouette
// centre sits at x 211.0 against a 215 midline — the same ~4 px the shipped
// pose carries at 210.5. A camera pan that would have moved it to 221.0 was
// tried and rejected for exactly that reason. D21's equal-voids rule WAS
// re-solved for the close-up in that pass, through PHONE_KEYS' tgtUp; both
// records live with the values, in portrait.js.)
export const INSPIRE = { az: 115 * DEG, r: 11, y: 2, target: V(2.3531, 2.4199, -1.0707), fov: 40 };

// The gaze's mid-swing waypoint (was the old "early pin" target): the cap,
// biased a touch toward the stream side so the visible plume never leaves
// frame. Since the one-arc re-shape (2026-08-04) it is the CONTROL POINT of
// a quadratic bezier hero.target -> INSPIRE.target — the gaze bows through
// the cap continuously instead of locking onto it in the first 22%.
const PIN = V(0.5, 3.4, -0.1);

// Dead band at the head of the gesture: below this fraction of the arrival
// the camera IS the hero pose exactly — what makes #/mission and a cold load
// render the frozen hero composition, pixel for pixel. On the shipped route
// this is global p 0.040 (~1 vh of scroll): 0.040 / 0.26.
export const ARRIVAL_DEAD = 0.15384615384615385;

/** The arrival gesture. `u` is gesture-local (0 = mission rest, 1 = the
 *  Inspire rest); `hero` is the LIVE hero pose of whatever responsive
 *  composition booted (injected by the composer — the orbit must start from
 *  the framing that is actually on screen). */
function arrival(u, out, hero) {
  let s = (u - ARRIVAL_DEAD) / (1 - ARRIVAL_DEAD);
  if (s < 0) s = 0;
  // ONE shared progression (2026-08-04 re-shape): the azimuth keeps its
  // trapezoid + windowed orbit-breath (azEase — strictly monotonic, breath
  // zeroed at both ends), and radius, height, fov and gaze all ride the SAME
  // trapezoid (trapEase, no breath — the dolly must not wobble). Position
  // and gaze turn together the whole way: no pin phase, no push phase.
  const e = azEase(s);
  const m = trapEase(s);
  const az = hero.az + (INSPIRE.az - hero.az) * e;
  const r = hero.r + (INSPIRE.r - hero.r) * m;
  const y = hero.y + (INSPIRE.y - hero.y) * m;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  // Gaze: quadratic bezier hero.target -> INSPIRE.target bowed through PIN
  // (the cap) — C1-continuous, endpoints exact, the plume framed mid-swing.
  quadBezier(m, hero.target, PIN, INSPIRE.target, out.target);
  out.fov = hero.fov + (INSPIRE.fov - hero.fov) * m;
  return out;
}

export const CAMERA = {
  arrival,
  // --- INSPIRE rest, the drift that holds it, and the exit that hands off ---
  //
  // The rest key MUST equal INSPIRE exactly: the arrival gesture owns p below
  // 0.26 and this keyed spline owns p at and above it, so any disagreement is
  // a hard cut at the seam. (It has been one: a half-finished D18 pass moved
  // INSPIRE and left this key on the old az 78, which snapped 37 deg of
  // azimuth and 2.1 of height across a single frame. If you re-aim the rest,
  // re-derive pos = (sin az, y, cos az) * r here in the same edit.)
  //
  // Then: ONE continuous widening toward the Connect ground rest (re-keyed
  // 2026-08-04, Hannah: the old exit pushed IN toward the stream, r 9.1 ->
  // ~5.6, and Connect pulled back OUT again — a felt zoom-in-then-out).
  // Connect's own first key is settled (f9e8317) at az 68.76 / y 2.90 /
  // fov 48 / subject-distance 8.79, so these two keys are solved to MEET it:
  // the gaze lerps toward Connect's target on a smoothstep, and each key's
  // radius is then solved from the aimed target so the camera-to-subject
  // DISTANCE grows monotonically — 8.49 -> 8.59 -> 8.71 -> 8.79 — rather than
  // the radius doing so (a shrinking radius here is a wider framing, because
  // the gaze is walking down the stem at the same time). fov 40 -> 48 grows
  // with it. Residual: the Hermite bows 0.14 below its running-max distance
  // around p 0.335 (1.7% of 8.5; 0.34 / 2.5% in portrait) — a wobble, not the
  // old zoom-in, which was 38%.
  //
  // AZIMUTH TURNS ONCE, AT THE HOLD. The arrival climbs -12 -> 115 and this
  // leg falls 115 -> 68.8 into Connect. That single reversal happens AT the
  // rest key, where `hold: true` forces a zero tangent — the camera comes to a
  // full stop before it turns, which is the only place a reversal can sit
  // without reading as a whip. Everything after the rest is monotone: az
  // 115 -> 103 -> 81 -> 68.8 -> 61.8 straight through the Connect rest.
  // D19 RE-SOLVE. Only the rest's GAZE moved, but a keyed spline does not care
  // why an endpoint moved: leaving these two on the old targets would have put
  // an 0.87-high upward flick into the first 0.05 of the exit, since the rest
  // now aims at y 2.09 and the old drift key aimed at 2.957. So both are
  // re-derived from the same rule that generated them, with the new endpoint:
  //
  //   s      = smoothstep((p - 0.26) / 0.15)   — 0 at the rest, 1 at Connect's
  //            first key (p 0.410), which is settled (f9e8317) and untouched
  //   tgt    = lerp(INSPIRE.target, connect-key1.target, s)
  //   az/y/fov = lerp(rest, connect-key1, s)   — UNCHANGED, because the rest's
  //            az/y/fov are unchanged: 102.18 / 2.2495 / 42.22 and
  //            79.94 / 2.6825 / 46.07, the shipped values to the digit
  //   r      = solved from the aimed target so camera-to-subject DISTANCE
  //            grows monotonically, never the radius (a shrinking radius here
  //            is a WIDER framing — the gaze is walking down the stem at the
  //            same time)
  //
  // The distance ladder rebases on the new rest and keeps its shape:
  // 8.42 -> 8.55 -> 8.69 -> 8.79, linear in the leg fraction with the same
  // +0.018 lift on the third key the shipped ladder carried to offset the
  // Hermite's bow. It starts 0.07 SHORTER than before (8.42 vs 8.49), so the
  // widening into Connect is slightly longer than it was, never shorter.
  //
  // ------------------------------------------------------------------
  // D20 RE-KEY (2026-08-06, Hannah: "the camera motion from the inspire
  // section to the connect one ... feels like a rotate and then jump back,
  // but it should be one smooth rotation").
  // ------------------------------------------------------------------
  // The reversal was real and it was NOT in either angle channel. Gaze yaw
  // and gaze pitch were both already monotone across the whole leg (zero
  // derivative sign flips, measured) — which is why every angle-only audit
  // before this one passed. It was in the COMPOSED frame:
  //
  //   d = gazeYaw - camAz + 180
  //
  // is the horizontal angle between the aim and the mushroom, i.e. where the
  // subject actually sits across the frame. The orbit azimuth falls
  // 115 -> 68.8 while the gaze yaw falls -65 -> -124, and over p 0.372-0.394
  // the two fell at the SAME rate: d froze at -11.44 deg (advancing 0.7 deg
  // per unit p, against 138 just before and 173 just after). A frozen angle
  // inside a still-widening fov is a subject sliding BACK toward centre — so
  // the mushroom stopped, drifted right and sank, and then swept left again.
  // Measured on the projected cap silhouette at 1440x900: screen-x velocity
  // -2982 px/unit-p (p 0.334) -> +94 RIGHTWARD (p 0.384) -> -3204 (p 0.432).
  // Every other rate had the same crest-dip-crest through the same window:
  // pitch -56.4 -> -14.4 -> -99.5, fov +86 -> +24 -> +266, orbit azimuth
  // -504 -> -50, position speed 92 -> 9 u/p. The aim had overswung relative
  // to the orbit and was unwinding — the same fault 2a27db7 cured on the
  // Connect->Owned leg, in the one coordinate that hides it from an
  // angle-only trace.
  //
  // Its origin is arithmetic, not intent: the D19 rule above lerps the two
  // exit keys from the rest toward Connect's first key on a SMOOTHSTEP, and
  // smoothstep flattens to zero slope at BOTH ends — so d, fov and pitch all
  // came to a halt approaching p 0.410 exactly where Connect's own keys
  // resume at full rate. (Before D19 the same rule was harmless: the rest
  // aimed 0.87 higher, so the halt sat where the leg was slow anyway.)
  //
  // THE RE-KEY: gaze + fov only, on ONE shared ease. The two keys are
  // re-derived from what the eye reads rather than from the world target —
  // where the mushroom sits in the frame, and how wide the frame is:
  //
  //   x   = (p - 0.26) / 0.15        0 at the rest, 1 at Connect's key 1
  //   s   = x^1.5                    zero slope at the rest (the `hold`),
  //                                  1.5x mean slope at the join, which is
  //                                  what meets Connect's own -179 deg/p
  //   dx  = lerp(-0.079, -12.324, s) horizontal angle of the cap off the
  //                                  frame axis (both ends are FIXED: the
  //                                  approved rest, and settled Connect k1)
  //   dy  = lerp( 5.354,   6.085, s) the same, vertically
  //   fov = lerp(40, 48, s)
  //   tgt = pos + dir(dx, dy) * d    d = the shipped ladder, 8.55 / 8.69,
  //                                  kept to the digit
  //
  // POSITIONS ARE BIT-EXACT SHIPPED, deliberately and not incidentally: the
  // Inspire reveal drive and the 34-deg arming gate are functions of camera
  // AZIMUTH alone (index.js camAzDeg reads position.x/z), so holding pos
  // holds az(p) to the last bit and the particle-continuity troughs closed
  // in b2c9584 cannot re-open — proved by construction rather than measured
  // and hoped for. fov and the gaze are free: nothing reads them on this leg.
  //
  // MEASURED (261-sample drift-aware scrub, p 0.26..0.52, both aspects):
  //   subject screen-x backtrack   0.84 px -> 0.00 px, zero sign flips
  //   slowest mid-leg screen sweep    1 px/p -> 1245 (peak 3211 -> 2965)
  //   d advance through p 0.37-0.39   0.7 deg/p -> 74 (never below 48)
  //   fov rate through p 0.38          +24 deg/p -> +65, and the interval
  //                                    ladder is now strictly increasing:
  //                                    31 / 57 / 73 / 139 / 208 / 200
  //   yaw peak 640 -> 595, pitch peak 100 -> 99, zero sign flips in either
  //   distance re-approach          0.095 -> 0.069
  // Residual: the cap still SINKS ~13 px between the two poses before it
  // rises 63. That is forced — the approved Inspire rest frames it at
  // y 328 and settled Connect k1 at y 341 — so the vertical turns once, at
  // Connect's own key, and nothing here can remove it without moving a rest.
  //
  // ------------------------------------------------------------------
  // D21 RE-DERIVE (2026-08-07, Hannah: "push the mushroom down a bit so the
  // page feels more balanced").
  // ------------------------------------------------------------------
  // Only the rest's GAZE moved again, so the same thing is true as at D19:
  // a keyed spline does not care why an endpoint moved. Both exit keys are
  // re-derived from the D20 rule above with the new rest, and NOTHING ELSE
  // changes — every `pos` is byte-identical for the third re-key running,
  // `d` stays 8.55 / 8.69 (the ladder rebases to 8.4253 -> 8.55 -> 8.69 ->
  // 8.788 and rounds to the same digits), and both `fov` values are
  // untouched at 41.63 / 44.49 because fov = lerp(40, 48, s) never read the
  // rest's gaze. Only `dy` moves, and only because the rest's own dy did:
  //
  //   dx  rest -0.079 -> -0.095   (the cap is still on the frame centreline)
  //   dy  rest +5.354 -> +3.112   (the cap now sits lower in the rest frame)
  //
  // The decode was re-proved before it was re-used: running the rule on the
  // SHIPPED rest reproduces the shipped key targets to all four decimals
  // (2.0571 / 2.1443 / -0.8376 and 1.2152 / 2.2287 / -0.8497), and the
  // connect-side endpoint comes back at -12.3239 / +6.0850 against the
  // -12.324 / 6.085 written above.
  //
  // A RESIDUAL D20 RECORDED AS FORCED IS NOW GONE. D20 had to accept that
  // the cap SINKS ~13 px before it rises, because the approved rest framed
  // it above Connect's settled first key and the vertical had to turn once.
  // The rest is now BELOW Connect's key, so dy climbs 3.112 -> 6.085 with
  // nothing to unwind: the cap rises monotonically across the whole leg.
  // ------------------------------------------------------------------
  // ONE MOVEMENT (2026-08-10, Hannah's brief item 1). The rest-drift and
  // exit keys that used to live here (t 0.7167 / 0.9250 — the D19/D20/D21
  // re-derivations above) are RETIRED: the whole Inspire -> Connect travel
  // is now one analytic gesture, connect/camera.js approach(), composed by
  // the director over p [restProgress('inspire') .. restProgress('connect')]
  // exactly as the arrival is composed below the rest. The D20/D21 rules
  // remain above as the record of why the keyed form kept failing the
  // composed frame: two keyed stations gave the leg two envelopes (an early
  // position hump, a late fov hump — measured in 07-chapter-inspire.md,
  // 2026-08-10), and the cure is the arrival's own shape: every channel on
  // ONE shared trapezoid. The rest key stays: it is the arrival's landing
  // and the gesture's departure, and any disagreement between the three
  // parameterisations is a hard cut at the seam (the D18 lesson above).
  keys: [
    { t: 0.5,                pos: V(9.9694, 2.0000, -4.6488), tgt: V(2.3531, 2.4199, -1.0707), fov: 40,    hold: true, note: 'inspire-rest' },  // p 0.260  az 115.0  d 8.43  D23 centred gaze (must equal INSPIRE.target — the D18 seam lesson)
  ],
};
