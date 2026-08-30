// chapters/connect/camera.js — CONNECT's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// ONE MOVEMENT (2026-08-10, Hannah: "the transition from Inspire and Empower
// to Connect the Ecosystem feels a little bit stilted — it's like two
// separate movements... it could just naturally be one, more dramatic camera
// movement — like the one from the hero to the Inspire and Empower section").
//
// She named the reference exactly, and the reference is a MECHANISM, not a
// mood: the Mission -> Inspire arrival (inspire/camera.js arrival()) rides
// every channel — azimuth, radius, height, fov, gaze — on ONE shared
// trapezoidal ease, so all of them peak together and land together. This leg
// was the opposite, and measured so (401-sample drift-aware trace, 2026-08-10,
// journey-v6-plan/07-chapter-inspire.md): position speed was a single EARLY
// hump — 0 at the rest, peak 92 u/p at p 0.337, collapsed to ~10 u/p by
// p 0.43 — while the fov rate was a single LATE hump — ~30 deg/p through the
// swing, peaking at 253 deg/p at p 0.477, right where the position had died.
// Two channels, two peaks, a 9x speed trough between them: the eye reads a
// swing that ends, then a zoom that starts. Two movements, exactly as
// reported. (This is a different fault from the two this leg already had
// fixed: 6acceac cured a re-approach in the DISTANCE channel, e95820a a
// stall in the composed frame angle d — both were monotone here. The humps
// were never in any one channel's direction; they were in the ENVELOPES.)
//
// THE FIX IS THE REFERENCE'S OWN SHAPE. The whole travel — Inspire rest
// (p 0.260) to Connect rest (p 0.5230) — is now ONE analytic gesture,
// approach() below, composed by the director exactly as it composes the
// arrival (director.js: arrival | approach | keyed spline). All channels
// ride the arrival's own trapezoid. Connect keeps the same shape with a
// shorter 0.08 landing ramp, so its camera does not stop while the ground
// lights are still completing their visible arrival:
//
//   az     INSPIRE.az (115 deg) -> the rest's 61.81, on azEase — trapezoid
//          plus the same windowed orbit-breath the arrival carries, strictly
//          monotonic, breath zeroed (value AND slope) inside both ramps;
//   r, y   11 -> 9.0107, 2.0 -> 2.0, on the plain trapezoid (the dolly
//          must not wobble — arrival law). Since the 2026-08-12 rebalance the
//          HEIGHT channel is a constant: the rest sits at the eye height the
//          Inspire rest already established, so the leg is a swing, a close
//          and a gaze that walks down — and the "lower camera" Hannah asked
//          for is delivered against the PREVIOUS rest (2.647 -> 2.0), not by
//          moving the eye mid-gesture;
//   fov    40 -> 62, SAME trapezoid — this is what kills the late hump: the
//          widening now happens WITH the swing, not after it;
//   gaze   quadratic bezier INSPIRE.target -> rest target, bowed through
//          PIN2 (the upper stem) so the gaze slides off the cap, down the
//          stem, out to the ground network in one bow — C1, endpoints exact.
//
// Because az, fov and the gaze all ride affine(one shared ease), the
// composed-frame angle d = gazeYaw - camAz + 180 is monotone BY CONSTRUCTION
// (the e95820a fault cannot re-open), and every channel's rate profile is the
// same trapezoid — one hump, shared. Measured on the built gesture (see
// 07-chapter-inspire.md, 2026-08-10): one speed hump peaking mid-leg, fov
// and yaw peaking with it, subject distance 8.43 -> 10.40 monotone.
//
// BOTH ENDPOINTS ARE THE FROZEN APPROVED POSES, imported/derived rather than
// copied: u = 0 is INSPIRE (the same constants the arrival lands on — the
// D19 lesson: a seam disagreement is a hard cut), u = 1 is REST_KEY's pose
// exactly, which is also the keyed spline's first key (hold, zero tangent),
// so the gesture hands over with matching zero velocity. The trapezoid's
// zero-slope ends give both rests their ease-in/ease-out.
//
// THE REST SITS AT LEG-t 0.65 (route.js stops [0.65], 2026-08-10): the same
// pose at p 0.5230 instead of 0.490. The 0.15 of leg the dive gives up is
// spent on the approach — which is where the chapter's own ground-lighting
// arrival lives (index.js LIGHT_LO/HI), the FIFTH pacing request on that
// arrival. The dive keys below keep their shipped POSES (the straight dive
// line to the trunk, collinear with owned/camera.js's t 0.0 key, is the
// "one continuous dive" invariant) and only re-space in t; every owned key
// and the p 0.622+ spline (owned/leg.js's sampled range) are untouched.
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.38..0.60
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';
import { trapEase, azEase, quadBezier } from '../../lib/ease.js';
import { CONNECT_APPROACH_RAMP } from '../../constants.js';
import { INSPIRE } from '../inspire/camera.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* --- CONNECT rest: mushroom upper-LEFT and WHOLE IN FRAME, copy upper-RIGHT
   (ui.js CHAPTER_POSITION.connect = 'pos-topright'), the ground plane and its
   three hubs spread through the diagonal band between them.

   ---- 2026-08-13, THE THIRD REPORT: "it still feels too high on the page" ----

   Two passes had now traded along ONE axis in opposite directions, and each
   one re-opened the other's complaint. The ladder below is real and its
   exchange rate (~1.27px of band per 1px the subject comes down) is real, so a
   third trip along it would only have produced a fourth report. What that
   ladder does NOT say — because nobody had measured it — is WHY the band under
   the copy could not be filled:

       THE NETWORK STOPPED AT RADIUS 11.5, and the band starts at 6 and runs
       out past 20. The far half of every frame this chapter ever shot was
       BARE SOIL under fog.

   That is the whole story. Aiming down hid the hole by filling the frame with
   near ground, and pushed the subject up and out (f31a0a9's report). Aiming up
   recovered the subject and showed the hole again (330d3a1's report). Neither
   could win, because the ground the camera was being asked to look at was not
   there. The fix is in tendrils.js, not here: the network now runs out to 17.2
   and the band has ground in it. See that file's FAR FIELD block.

   With the band populated, this key does three things at once instead of
   trading (1440x900, and 1280x800 agrees):

       cap dome apex     60.2 -> 114.6 px      (the subject, 54.4px LOWER)
       band under copy    162 ->  101 px      (61px SMALLER, not 69 BIGGER)
       lit fill in band  0.0553 -> 0.0624     (13% MORE content, not less)

   The aim carries 54.4px of that drop; site.css's copy block carries the rest
   of the band (15vh -> 19vh, and the rail sets that ceiling — see the note
   there). The aim stops at +0.60 for a reason that is not compositional: the
   pre-existence lead runs out first. That bound, and the +0.95 frame it cost,
   are written up at PIN2 below.

   Rejected on measurement, again and freshly: FOV. The note below rejects it
   on the old pose; re-shot on THIS one (where the near ground has swept out of
   the bottom of the frame and the corner should have eased) it is still the
   same failure — fov 68 buys 37px of drop for 19px of band and puts the widest
   root ribbon at 12.62px with 2 over 10, fov 72 at 14.70px. fov stays 62.
   Rejected likewise: raising the EYE at constant pitch, which does drop the
   subject 213px and NARROWS the ribbons (7.28 -> 6.40) — but ground content
   moves down with it, so the band went 162 -> 320px. It is not a trade-break,
   it is the same trade at a better rate, and it would have moved REST_KEY.pos
   and with it the colony, the soil crossing and owned@*.

   ---- the 2026-08-13 rebalance that preceded it, kept for the record ----

   RE-BALANCED AGAIN 2026-08-13 (Hannah: "the mushroom currently sits
   noticeably too high in the viewport. Push the whole mushroom composition
   lower so that it feels properly balanced against the text again. This seems
   to have shifted accidentally during an earlier change"). It did, and the
   change was the one below: aiming DOWN is what pushes the subject UP, so the
   2026-08-12 pass bought its full frame at the cost of the cap. At the shipped
   -0.7 the cap's apex projected ABOVE y 0 of 900 — the dome was cut off by the
   top edge and the spore plume above it was gone entirely. (Exact figures and
   the geometry they are measured on are in the MEASURED block below.)

   THE TENSION IS REAL AND IT IS MEASURABLE. At fixed eye, radius and fov the
   two complaints ride ONE axis: the aim is a pure rotation, so a degree of
   pitch moves the mushroom and the ground's far edge by the same angle. Over
   the whole ladder (1440x900) the exchange rate is flat at

       ~1.27 px of void under the copy per 1 px the mushroom comes down.

   | tgt.y            | -0.70 | -0.45 | -0.20 | -0.02 | +0.20 | +1.03 (pre) |
   |------------------|-------|-------|-------|-------|-------|-------------|
   | cap apex, y      |     5 |    28 |    50 |    68 |    85 |         166 |
   | void under copy  |   115 |   132 |   149 |   163 |   177 |         242 |
   | widest ribbon    |  7.62 |  7.68 |  7.74 |  7.29 |  7.33 |        6.49 |

   -0.0246 is `groundY(1.827, -4.067)` — the soil directly under the aim point.
   The gaze now RESTS ON THE GROUND it is looking at, instead of 0.7 units
   under it, which is both the number and the reason for it. It buys back 63 px
   of the 161 px the last pass took, leaving the cap whole with real headroom
   and the plume readable, while the band under the copy stays populated: 163
   px against the 242 that drew the "feels empty" complaint, i.e. it gives back
   38% of that void to recover 39% of the mushroom.

   WHY NOTHING CHEAPER WORKS. The exchange rate above is only flat for levers
   that ROTATE the frame. Levers that scale it radially about the frame centre
   are ~20x cheaper on paper, because the void's boundary sits 31 px from the
   centre and the cap sits 445 px from it — and both were tried and both are
   rejected on measurement, not taste:

     fov   the cheapest of all (+33 px of drop for +2 px of void at fov 66) and
           it reopens the root-ribbon corner at EVERY aim depth, not just the
           one the last pass sampled: 14.91 / 15.17 / 12.42 px at fov 66 for
           tgt.y -0.70 / -0.45 / -0.20, and fov 70 and 74 are no better. fov
           stays 62.
     dolly  free on the void (115 -> 116 px at radius x1.20) but it guts the
           gesture: A1.r is derived from this key, so radius x1.20 turns the
           leg's close from 11 -> 9.01 into 11 -> 10.81 and there is no dolly
           left in the movement. Even x1.05 trips the corner (13.68 px, 2 over
           10) — the ribbon landscape is lumpy in the frustum's footprint and
           the shipped radius sits in a clean pocket.

   So the aim is the only lever that moves the mushroom and leaves the corner
   alone, and it leaves it alone for a reason: rotating the eye UP sweeps the
   near ground DOWN and out of the bottom of the frame. The widest ribbon is
   7.29 px here against the shipped pose's 7.62, with ZERO over 10 px — the
   corner is strictly better than what it replaces.

   MEASURED at 1440x900 (the void is the dark gap between the copy block's
   bottom edge and the first row inside the copy's own x-span carrying scene
   content — >= 20 px at or above 55/255, against a fog floor of 17-28; the
   cap's screen position is the topmost projected vertex of the cap DOME MESH,
   which is `groups.mushroom`'s first uWin child — the group as a whole also
   carries the long aerial hyphae out to r ~5.9, which are not the silhouette
   anyone means by "the cap"):

     void under the copy   116 px (12.9% of frame height) -> 163 px (18.1%)
     cap dome apex, y      -9 -> +52   (it was CLIPPED by the top edge; it now
                                        sits 52 px inside it, plume readable)
     cap dome centre       116 px -> 60 px above the copy block's own centre
     under-copy lit fill   0.0602 -> 0.0526   (copy x-span, its bottom edge to
                                        the frame bottom — the trade, paid)
     widest root ribbon    7.62 px -> 7.28 px, none over 10 px either side

   The apex row is re-measured on the definition spelled out above; an earlier
   draft of this block recorded 5 -> 68 on an unstated one, ~14 px lower. The
   MOVEMENT — which is what the trade turns on — agrees either way (+62 px
   there, +61.7 px here), and the void and ribbon rows agree exactly. The
   ladder's -0.02 column above was shot at tgt.y 0.00, worth ~2 px of apex.

   The eye, the radius and the fov are all untouched, so the height channel is
   still the constant the last pass made it and the leg is still a swing, a
   close and a gaze that walks down — the gaze just stops 0.7 units higher.

   ---- the previous pass, kept for the record ----

   REBALANCED 2026-08-12 (Hannah: "the area below the 'Connected Community'
   text feels empty and the composition is unbalanced. Fix by moving the
   mushroom further out of frame, lowering the camera, or both"). Both levers
   are pulled, and they are the same lever twice:

     eye  2.647 -> 2.0   the camera comes DOWN, to the height the Inspire rest
                         already sits at (INSPIRE.y), so the height channel is
                         now constant across the gesture;
     aim  1.028 -> -0.7  the gaze drops 1.73 units BELOW the ground plane, which
                         is what actually fills the frame: pitch -8.91 ->
                         -14.65 deg, so the ground rises up the frame and the
                         cap leaves through the top.

   MEASURED at 1440x900 (the void is the dark gap between the copy block's
   bottom edge and the first ground content inside the copy's own x-span):

     void under the copy   254 px (28.2% of frame height) -> 121 px (13.4%)
     under-copy lit fill   0.095 -> 0.112
     luminance centroid y  0.452 -> 0.422 of frame height

   WHY NOT FURTHER. Aiming past about -0.3 with the eye left at 2.647 walks two
   of the organism's ROOT RIBBONS (organism.js §8) into the bottom-left corner
   at 14-15 screen px wide, where they read as flat opaque planks. That is not
   a bug in this pose: nearFade(z) tapers those ribbons for the HERO camera's
   +Z axis only ("ribbons thin out near the camera so they never project as
   wide bars"), and this chapter's camera stands off that axis, so it can get
   close to a full-width one. Dropping the EYE is what fixes it — at 2.0 the
   near ground is seen at a grazing angle and the widest ribbon in frame is
   7.6 px against the shipped pose's own 6.5, with none at all over 10 px.
   Measured across the aim/height grid; the eye height is the binding
   constraint, not the aim, which is why the aim can go as deep as it does.

   Also tried and rejected: trucking the aim right to push the mushroom further
   out sideways (tgt.x 1.827 -> 3.4 / 5.0). It closes the void a little more
   (112 / 107 px) but empties the band it is supposed to fill — the under-copy
   fill falls to 0.084 / 0.068 because the frame pans onto the sparse far side
   — and it drags the luminance centroid LEFT (0.414 -> 0.386 / 0.380), i.e. it
   makes the left-heaviness worse, which is the actual complaint. fov 68 brings
   the wide ribbons back; fov 56 is neutral. fov is untouched at 62. --- */
const REST_KEY = {
  t: 0.65,
  pos: V(7.943, 2.0, 4.256),
  // The gaze still rests ON THE GROUND — just much further out. Measured on
  // the live camera: pitch -7.719 deg, and the aim ray meets the terrain
  // 14.89 units along itself at world (-0.79, 0, -7.63), radius 7.68 from the
  // stipe. The old value put the same ray down at 10.33 units and radius 4.4,
  // which is why the subject sat where it did. Bounded ABOVE at 0.60 by the
  // pre-existence lead, not by the frame: see the PIN2 note below.
  tgt: V(1.827, 0.60, -4.067),
  fov: 62,
  hold: true,
  note: 'connect-rest',
};

// The approach gesture's two ends, derived — never copied — from the poses
// they must match: INSPIRE (the arrival's landing) and REST_KEY (the keyed
// spline's first hold).
const A1 = {
  az: Math.atan2(REST_KEY.pos.x, REST_KEY.pos.z),
  r: Math.hypot(REST_KEY.pos.x, REST_KEY.pos.z),
  y: REST_KEY.pos.y,
  fov: REST_KEY.fov,
};

// The gaze's mid-bow control point: the mid stem, a touch toward the
// stream side — the cap stays composed while the aim walks down the stem to
// the ground network (the same PIN idea the arrival's bezier uses). Chosen
// against the live frame: subject distance stays strictly monotone
// (8.43 -> 10.68, the only against-steps being the orbit-breath ripple at
// 2.8e-05 units, the same class and size the shipped gesture carries) and the
// mid-leg frame holds the whole organism while the ground rises into the
// lower two-thirds. y sits at the mid stem rather than the cap line
// (2.1 -> 1.8 -> 1.65): the bow aims the gaze downward EARLIER, which is what
// hands the chapter's camera-pure resolve its first draw at p ~0.35 — the
// front bound of the ground-lighting schedule (index.js LIGHT_LO) — while the
// composed frame keeps the cap inside the upper half throughout.
//
// 1.8 -> 1.65 (2026-08-12, with the rest rebalance above) BUYS BACK THE
// PRE-EXISTENCE LEAD, and nothing else. Dropping the eye to 2.0 makes the
// camera LESS pitched down through the middle of the leg than the 2.647 pose
// was (the gaze bow is aimed from lower, so the same control point is a
// shallower look), which pushed the camera-pure resolve's first draw 0.3514 ->
// 0.3547 and cut the lead the restage measured at 0.035 to 0.0313. The lead is
// the D16 guarantee that the visitor reads the web as PRE-EXISTING before one
// strand of it is lit, so it is not negotiable; the schedule is the other
// thing that is not negotiable (five requests for "slower" — moving LIGHT_LO
// to 0.3897 would have restored the lead by making the whole arrival 2.7%
// FASTER, which is the one direction this chapter may never move).
//
// PIN2.y is the free lever between those two: it moves the resolve without
// touching either endpoint, the schedule, or any channel's ease — approach()'s
// speed profile, peak/mean and every rate peak are bit-identical across the
// sweep below. Measured, first draw / lead against LIGHT_LO's fixed p 0.3860:
//
//     PIN2.y   1.80     1.65     1.50     1.35     1.20
//     first    0.3547   0.3488   0.3435   0.3389   0.3343
//     lead     0.0313   0.0372   0.0425   0.0471   0.0517
//
// 1.65 is the shallowest that clears the floor with margin (0.0372 against
// 0.035, and against the shipped tree's own 0.0346). Going deeper is free on
// the lead but walks the mid-leg gaze off the stem early for no gain, and the
// arm window is the other bound: seams.js arms this chapter at p 0.32, and
// the `amount` ramp there is eased in TIME, so a first draw that creeps back
// toward 0.32 would turn the arm into a visible fade. 1.65 keeps 0.029 of p
// between the arm and the first draw — the shipped tree's own 0.031.
//
// 1.65 -> 1.50 (2026-08-13, with the rest re-balance above) FOR THE SAME
// REASON IN THE SAME DIRECTION. Raising the rest's aim raises the bezier's far
// endpoint, so the mid-leg look is shallower again and the resolve's first
// draw slid 0.3488 -> 0.3551, cutting the lead to 0.0309 — back under the
// 0.035 floor. LIGHT_LO is still the one thing that may not move (six requests
// for "slower"), so PIN2 pays again. Measured against LIGHT_LO's fixed
// p 0.3860, at the new rest aim:
//
//     PIN2.y   1.65     1.55*    1.50     1.45     1.30     1.15
//     first    0.3551   0.3520   0.3486   0.3466   0.3408   0.3358
//     lead     0.0309   0.0340   0.0374   0.0394   0.0452   0.0502
//                                (*interpolated; 1.50 and 1.45 were shot)
//
// 1.50 is the shallowest that clears BOTH bounds — the 0.035 floor and the
// shipped tree's own 0.0372 — and it lands the whole reveal schedule back
// within 0.0002 p of where it shipped: lead 0.0374 against 0.0372, arm-to-
// first-draw 0.0286 against 0.0288. Going to 1.45 buys 0.002 more lead and
// costs it in the binding direction: PORTRAIT is where the arm window is
// tight, and its margin in fwd.y at p 0.32 falls 0.01504 -> 0.01234 (1.50) ->
// 0.01068 (1.45) against the handheld layer's whole 0.0059 peak wander. 1.50
// keeps that at 2.1x the wander; 1.45 keeps 1.8x. Resolve is still EXACTLY 0
// at the hero pose, at the Inspire rest and at the arm edge, both aspects.
//
// 1.50 -> 1.40 (2026-08-13, with the rest aim going to +0.60). Same mechanism
// a third time, one notch further: raising the rest's aim makes the whole late
// leg a shallower look, the camera-pure resolve fires later, and the lead goes
// under its floor unless PIN2 pays. Measured on this tree, both aspects:
//
//     tgt.y 0.60, PIN2.y   1.50     1.42     1.40     1.35
//     lead, landscape      0.0287   0.0350   0.0360   0.0371
//     lead, portrait       0.0432   0.0495   0.0505   0.0516
//     fwd.y margin at arm  0.0154   0.0119   0.0113   0.0102
//
// AND THE ARM BAR IS NOW MEASURED RATHER THAN INHERITED. The note above
// carries the handheld wander as "0.0059 peak"; parked at p 0.32 with time
// RUNNING and fwd.y watched for 900 frames, the layer's actual peak-to-peak is
// 0.008779 — so what matters is the WORST-CASE margin, fwd.y_min - GAZE_HI,
// and the shipped tree's own is 0.0082 (0.01256 static, 0.0044 eaten by the
// drift's lower half). 1.40 holds 0.0069 of that worst case with ZERO ignited
// frames over 900; 1.35 holds 0.0059 and also never ignites, but it is 72% of
// the shipped tree's safety for 0.001 of lead, which is not a trade worth
// making on a reveal law.
//
// THIS PAIR IS ALSO WHAT BOUNDS THE REST AIM, and it is the reason the aim
// stops at +0.60 rather than the +0.95 the frame would otherwise have taken
// (that aim measured 84.0px of subject drop against 0.60's 54.4px, and a band
// SMALLER than the shipped one either way once the far field was in). At +0.95
// no PIN2.y clears both bars at once: 1.35 gives lead 0.0345, still under the
// floor, while already spending the arm margin down to 72%. The lead is a D16
// guarantee and the frame is a preference, so the frame yielded.
const PIN2 = V(1.0, 1.40, -1.8);

/** The approach into Connect. `u` is gesture-local (0 = the rest this leg
 *  departs from, 1 = the Connect rest); the composer maps global p over
 *  [that rest .. restProgress('connect')] onto u.
 *
 *  `from` IS A PARAMETER BECAUSE THE ROUTE OWNS IT, NOT THIS FILE (2026-08-30).
 *  Everything the block above derives — the one shared trapezoid, the windowed
 *  azimuth breath, the bezier gaze bowed through PIN2, the monotone composed
 *  frame angle — is a property of the SHAPE and holds from any departure pose.
 *  What is not this file's to decide is WHICH rest the shape departs from: for
 *  its whole life that was Inspire, and since Equip landed between the two it
 *  is Equip's underside rest. The default keeps the leg self-describing (and
 *  keeps every caller that only wants "the approach from the chapter before"
 *  working), and journey/director.js passes the live one.
 *
 *  Both ends are still frozen approved poses, imported/derived rather than
 *  copied — the D19 seam lesson is unchanged, it now just has one more seam
 *  to hold: u = 0 must equal whatever rest the composer hands it, exactly. */
function approach(u, out, from = INSPIRE) {
  const e = azEase(u, CONNECT_APPROACH_RAMP);
  const m = trapEase(u, CONNECT_APPROACH_RAMP);
  const az = from.az + (A1.az - from.az) * e;
  const r = from.r + (A1.r - from.r) * m;
  const y = from.y + (A1.y - from.y) * m;
  out.pos.set(Math.sin(az) * r, y, Math.cos(az) * r);
  // Gaze: quadratic bezier from.target -> REST_KEY.tgt bowed through PIN2
  // — C1-continuous, endpoints exact, the organism framed mid-swing while
  // the aim walks down the stem to the ground.
  quadBezier(m, from.target, PIN2, REST_KEY.tgt, out.target);
  out.fov = from.fov + (A1.fov - from.fov) * m;
  return out;
}

export const CAMERA = {
  approach,
  keys: [
    // The travel OUT of this rest — the old drift + exit keys (t 0.77/0.91,
    // the 2026-08-04 "one continuous dive") — was retired 2026-08-11: the
    // whole Connect -> Owned leg is now owned/camera.js's dive() gesture
    // (Hannah: "3 movements but it should be 1.5"), which derives its u = 0
    // endpoint from THIS key. The director never evaluates the keyed spline
    // between the two rests.
    REST_KEY,                                                                                                         // p 0.5230  pitch -11.09 yaw -143.69  (hold)
  ],
};
