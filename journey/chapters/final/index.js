// journey-v6 — FINAL epilogue, PRODUCTION STAGE (W4-D).
//
// The grey-box proxy is replaced by the composed cutaway the re-keyed
// pullback resolves onto: an irregular fairy ring THAT INCLUDES THE HERO
// ORGANISM as one mature member (Hannah's direction — "the current mushroom
// is part of the scene"), a terrain cutaway with the living colony exposed
// in section, a broad broken spore sky, and a forest-mist horizon.
//
// Modules:
//   final-world.js    shared ring/cut geometry + the reveal/pulse shaders
//   final-ring.js     the fruiting bodies + primordia   (2 draws + 1)
//   final-terrain.js  cutaway, colony, front, connectors (7 draws + sprites)
//   final-sky.js      GPU spore cloud + horizon          (2 draws + sprites)
//
// Choreography owned here:
//   - uPull: camera-x -> reveal driver. The "undarken": bodies kindle in a
//     single-direction sequence around the arc as the camera pulls back, and
//     RE-DARKEN in reverse on a reverse scroll — pure in the pose.
//   - the growth-front pulse: a slow travelling wave along the underground
//     front; fruiting bodies brighten in step as it passes (FN-2.2), on a
//     randomized cycle so no loop is perceptible.
//   - primordia dwell: settled time at the rest, time-compressed emergence.
//   - CTA pulse (FN-3.1): trigger('ctaPulse'|'ringPulse') — one wave from
//     the hero around part of the ring, lighting the connectors that tie
//     surface bodies to the colony. Registered against any future closing
//     CTA via [data-final-cta] delegation (the footer lands in task 11).
//
// Fog: the director owns the ramp (Fog near 7->15, far 20->62 across the
// leg). These materials copy scene.fog every frame and fade to black — authored
// WITHIN the ramp, never fighting it.
//
// Parented to `scene` (adr-d3): the field does not sway.

import * as THREE from 'three';
import {
  makeUniforms, pullOf, pullRawOf, makeRng, TAU, RING_C, HERO_AZ, MEMBERS,
  groundY, REVEAL_W, PULL_MAX,
} from './world.js';
import { createFinalRing } from './ring.js';
import { drawWOf } from './clones.js';
import { createFinalTerrain } from './terrain.js';
import { createFinalSky } from './sky.js';
import { createFinalCanopy } from './canopy.js';
import { CAMERA } from './camera.js';

export function createFinal(sceneApi) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.jFinal = true;   // QA handle: budget A/Bs isolate this leg
  sceneApi.scene.add(group);

  // sceneApi: makeUniforms harvests the HERO's own tap-pulse trio off its live
  // materials, so a poke anywhere in this chapter plants the same wave the
  // hero answers (world.js heroPulse).
  const uniforms = makeUniforms(sceneApi);
  /** THE BED'S OWN FADE (2026-08-14, Hannah: "in the loop from bottom to top
   *  and vice versa, the ground lights up and darkens in a very sudden way.
   *  Can you make sure this is all more incremental").
   *
   *  The chapter draws two kinds of thing. The BODIES have a 24-rung ladder on
   *  `uPull` and are therefore spread over the move by their own driver — that
   *  is what `e1e8381` shaped and `027f969` paced. The BED they stand on — the
   *  terrain cutaway and the root canopy lying across it — has no ladder at
   *  all, so its entire brightness is the chapter's single fade scalar
   *  `uAmount`, and on a lap that scalar is a step (§31).
   *
   *  So the bed gets its own `uAmount`, and nothing else does. `Object.assign`
   *  copies the shared uniform OBJECTS by reference, so uPull, uTime, uFront,
   *  uCta and the fog pair stay the one shared set — the bed still breathes
   *  with the growth front and answers the same tap wave. Exactly one float in
   *  the chapter is duplicated, and the animator writes both every frame from
   *  the same place. Off a blend the two carry the same number by assignment
   *  (see `bed` in the animator), so the scrub, `?p=`, `?pose=` and the frozen
   *  `?capture=` path are byte-identical by construction rather than by
   *  measurement. */
  const bedUniforms = Object.assign({}, uniforms, { uAmount: { value: 0 } });
  const ring = createFinalRing(sceneApi, uniforms);
  const terrain = createFinalTerrain(sceneApi, bedUniforms);
  /** THE HORIZON IS FAR, AND FAR LEAVES LAST (§39). The sky — this chapter's
   *  own spore cloud, the horizon trees and the mist sprites — has the same
   *  fault as the bed and takes the same cure, but not the same curve: sharing
   *  one scalar with the floor makes every non-body pixel of the epilogue scale
   *  by a single number, which is a sheet, not a world. It gets its own float
   *  and reaches full a third of the band early (SKY_FULL), so the horizon is
   *  whole before the floor is on the way in and still standing after the floor
   *  has begun to go on the way out. Both curves are the same smoothstep on the
   *  same driver and meet exactly at 0 and 1, so the seams stay no-ops. */
  const skyUniforms = Object.assign({}, uniforms, { uAmount: { value: 0 } });
  const sky = createFinalSky(sceneApi, skyUniforms);
  // THE ROOT CANOPY (2026-08-07). Built after the ring because it is built
  // FROM it: ring.seats is where every fruiting body in the chapter stands,
  // and canopy.js lays one connected network over the lot, rooted at the
  // hero's own foot. It carries no state and no update().
  //
  // It does NOT kindle on uPull (2026-08-14 — it did until this pass, and
  // that was the fault: uPull is 0 until the lens passes x −8.0, so the
  // network was absent for the first 45% of the Owned -> Final transit and
  // then drew itself in over open view). Every vertex is now always-lit and
  // the whole network is gated by surfacedOf() below — one camera-pure float
  // on the canopy's own two materials. It still breathes with the growth
  // front and the CTA wave through the shared uniforms, and still costs the
  // frame nothing per-frame.
  const canopy = createFinalCanopy(bedUniforms, ring.seats);
  group.add(canopy.group, ring.group, terrain.group, sky.group);

  /* ---- growth-front cycle: randomized duration + rest, one direction ---- */
  const cycleRand = makeRng(9182);
  const front = { phase: -0.1, running: true, dur: 13 + cycleRand() * 5, wait: 0, on: 0 };

  /* ---- CTA wave: one-shot, hero -> part of the ring ---- */
  const cta = { t: -1 };            // -1 idle; 0..1 running
  const CTA_TRAVEL = 0.52;          // how far around the arc the wave runs
  const CTA_SECS = 2.6;
  function fireCta() { if (cta.t < 0 || cta.t > 0.3) cta.t = 0; }

  // Delegated registration for the closing CTA the product-systems pass
  // adds (task 11). Harmless while absent; live the moment it exists.
  const CTA_SEL = '[data-final-cta], .j-final-cta';
  const onOver = (e) => {
    if (amount > 0.5 && e.target.closest && e.target.closest(CTA_SEL)) fireCta();
  };
  document.addEventListener('pointerover', onOver);
  document.addEventListener('focusin', onOver);

  /** BURIED (2026-08-11): 1 once the lens is 0.25 units under the soil, 0 at
   *  the surface and above. A pure function of the camera pose, so it reverse-
   *  scrubs exactly and a nav jump lands on the honest value with no state to
   *  carry. See the note at its call site and terrain.js's material. */
  function buriedOf(pos) {
    const cy = pos.y - groundY(pos.x, pos.z);
    const b = Math.max(0, Math.min(1, -cy / 0.25));
    return b * b * (3 - 2 * b);
  }

  /** THE ROOT CANOPY'S PRESENCE (2026-08-14, Hannah: "there's this kind of
   *  network or web thing visible halfway through, but it only appears when
   *  I'm halfway there. Can you make it so it's always there and we just zoom
   *  into it?"). canopy.js §REVEAL carries the whole argument; this is the
   *  scalar it is gated by.
   *
   *  The SAME AXIS as buriedOf above — depth of the lens relative to the soil
   *  it is climbing through — and deliberately so: OWNED's colony was fixed by
   *  keying its reveal to exactly this quantity (fc1e151), and the canopy is
   *  that fix seen from the other side of the surface. It runs 0 -> 1 over the
   *  lens's last stretch of buried travel and SATURATES 0.30 UNDER THE SOIL,
   *  so it is finished before the pierce: measured, a fully lit canopy is
   *  worth MAE <= 0.139 to the frame anywhere below the line and MAE 1.5-2.0
   *  above it, so the whole ramp is spent where it cannot be seen and the
   *  visitor's first sight of the ground is of a network already whole.
   *
   *  Pure in the pose, with no state and no clock: a reverse ride re-descends
   *  through the identical values, and a nav jump lands on the honest one
   *  rather than composing a lit field over a camera that has not arrived —
   *  the failure 25-navigation-redux.md named and `rise` already guards. */
  const CANOPY_D0 = -1.10;    // dark at and below this depth
  const CANOPY_D1 = -0.30;    // whole here — still under the soil
  function surfacedOf(pos) {
    const cy = pos.y - groundY(pos.x, pos.z);
    const t = Math.max(0, Math.min(1, (cy - CANOPY_D0) / (CANOPY_D1 - CANOPY_D0)));
    return t * t * (3 - 2 * t);
  }

  /* ---- primordia dwell: settled time at the Final rest ---- */
  let dwell = 0;
  let lastPull = 0;
  let wasVisible = false;

  let amount = 0, amountTarget = 0;

  /* ---- THE REVEAL'S OWN SPEED LIMIT, AND ONLY ON A BLEND ----------------
     (2026-08-14, Hannah: "when I go into the bottom section the mushrooms
     light up far too quickly... particularly when I scroll down and then back
     up, or down from the bottom to the top, or up from the top to the bottom."
     18-one-species.md, the 2026-08-14 section.)

     The reveal is CAMERA-PURE — `pullOf(camera.x)` — and six passes have paced
     it beautifully, but every one of them paced the SCROLL->PROGRESS->CAMERA
     chain (6282080's 1.99x arrival, a51aab8's ladder, a94267c's allocation,
     22ce47d's half tempo). A camera-pure driver does not consult any of that:
     it runs the kindling at whatever speed the camera happens to be moving,
     and a CAMERA BLEND moves it on a clock that knows nothing about the
     ladder.

     MEASURED, every row through the real input path — trusted wheel at 60 Hz
     via CDP Input.dispatchMouseEvent, or a real pointer press on the rail.
     (The QA hooks journey.wrap()/flyTo() are NOT the input path and must
     never be used for a claim about behaviour; two passes on this codebase
     were lost that way.) Median of three, 1440x900, shipped state:

       transition                     path      sweep    bodies/s   kindle
       forward firm  (2400 px/s)      scrub     0.860 s     27.9    190 ms
       forward flick (9000 px/s)      scrub     0.689 s     34.8    136 ms
       reverse firm  (2400 px/s)      scrub     1.247 s     19.3    370 ms
       reverse flick (9000 px/s)      scrub     0.581 s     41.3    134 ms
       arrive, then scroll back up    scrub     0.718 s     33.5    166 ms
       wrap DOWN (bottom -> top)      BLEND     0.279 s     86.1     64 ms
       wrap UP   (top -> bottom)      BLEND     0.372 s     64.5     75 ms
       rail click Epilogue->Mission   BLEND     0.311 s     77.2     71 ms

     THE SCRUB IS NOT THE FAULT, IN EITHER DIRECTION. Reverse straddles
     forward — slower at a firm read, 19% quicker at a hard flick — and an
     arrive-then-back-up sits inside the forward band. Every BLEND is 2.3x to
     3.1x faster than the tuned forward path, and all three of them are.

     THE LAW. While a camera blend is in flight (and through the convergence
     that follows it) the reveal driver travels toward the pull at the blend's
     DESTINATION pose, at no more than BLEND_REVEAL_RATE, under one invariant:

         shown_t  <=  max( pullOf(camera.x)_t , shown_{t-1} )

     "the limiter may HOLD light the lens has already earned, but it may never
     CREATE light the lens has not." That is "nothing fades in over open view"
     and "dark at arm" restated as a property of every frame rather than of
     the ends. Note what it does NOT say: it does not force shown <= pure.
     Forcing that makes the limiter one-sided — it could only ever slow a
     light-up — and the two worst rows above (wrap DOWN, click out) are
     RETIRES, which it would leave exactly as they are. It is also not safe:
     it slams `shown` to 0 on the frame the camera passes x -8, which on the
     rail click out is a 0.56 one-frame drop to black where today there is
     none. Letting a retire lag is safe instead, because the chapter's own
     `rise` (uAmount) fades it out continuously across x -8 -> -4.6 and there
     is nothing left to pop.

     Taking the DESTINATION pull as the target is what lets the leaving
     direction begin retiring during the second the wrap spends bowing out of
     the rest — the camera is moving there (r 14.97 -> 16.3 and rising), so
     this is the retire riding the move, 6f23d90's rule, not a chapter dimming
     on a frame that has not moved.

     OFF A BLEND THIS FILE IS BYTE-FOR-BYTE WHAT IT WAS. `blending` is false
     and the lag is zero from boot, so `pull` is `pullOf(camera.x)` exactly,
     every frame — scrubbing forward, scrubbing back, ?p=, ?pose= and the
     frozen ?capture= path every golden is shot through. The forward pacing is
     untouched by construction, not merely by measurement (gate G1 asserts it
     bit-exactly over every frame of three scrubs; tools/revealgates.js).

     RATE — DERIVED, NOT CHOSEN. 1.0 pull/s makes the limiter reproduce the
     shipped forward arrival:
       · per body  REVEAL_W / 1.0 = 160 ms, between the forward flick's 136
         and the forward firm read's 190;
       · the 24-rung ladder's midpoints span 0.8545 of pull, so the sweep is
         0.854 s at 28.1 bodies/s — the forward firm read's 0.860 s / 27.9;
       · the whole PULL_MAX band is spent in 1.12 s, and MEASURED on real
         wheel-driven wraps that fits both windows the move actually gives it:
         the wrap DOWN is on screen for 1.384 s from the move's first frame
         (0.264 s in hand) and the wrap UP has 1.472 s between `rise` opening
         and the lap landing (0.352 s in hand). Neither is cropped mid-retire
         and neither needs a tail.
     (0.75, this pass's first value, does NOT fit: it needs 1.493 s against
     the wrap DOWN's real 1.384 s window. The 1.68 s it was chosen against was
     measured from the FLICK rather than from the MOVE, and the wrap's own
     placement takes ~250 ms of that before the limiter is even armed.)

     A blend shorter than the band still lands honestly: the convergence tail
     below keeps the same rate after `blending` clears, which is what the
     shipped forward arrival does too — its last rungs finish as the camera
     settles into the rest. */
  const BLEND_REVEAL_RATE = 1.0;    // pull units per second, blends only

  /* THE RATE WAS RIGHT AND THE DISTRIBUTION WAS NOT (2026-08-14 — Hannah:
     "when I'm going from the end to the beginning in the loop, or the
     beginning to the end, the whole fairy ring kind of just lights up all in
     one go, or lights down all in one go. Could you make that a lot more
     gradual and progressive... maybe one piece at a time, so the ring goes and
     then all the mushrooms come in or go away after that. So it feels like the
     lights are going off somewhere.")

     `1825393` fixed the chapter's AVERAGE pace on a blend — 62-75 ms/body up
     to ~160 ms — and that number is still right. What it could not fix, and
     did not claim to, is the SHAPE. The 24-rung ladder (18-one-species.md
     §13.2) is an ACCELERANDO: gaps of 7.5 millip at the head tightening to 1.2
     at the tail, "each one its own event" opening and "the gaps tighten as the
     town fills" closing. That shape was authored for the forward SCRUB, where
     the scroll model's own landing brake decelerates into the rest and stretches
     the tail back out. A blend has no landing brake — it slews at a CONSTANT
     rate — so the ladder's threshold spacing maps straight onto the clock and
     the tail is delivered raw.

     Measured on real wheel-driven wraps (in-page rAF-timed deltas; a tracer
     animator registered last, so every reading is the presented frame), the
     nine ring members crossing lit/unlit:

       down-wrap, gaps between members  50, 32, 34, 333, 186, 83, 83, 82 ms
       up-wrap,   gaps between members  83, 83, 84, 200, 316, 50, 17, 50 ms

     Four of the nine inside 116 ms going out, four inside 117 ms coming in,
     with a 17 ms gap in there — and, on the same frames, the field collapsing
     103 -> 17 bodies in 200 ms. That is "all in one go", and it is the ladder's
     own tail, played at constant speed.

     THE FIX IS THE CLOCK, NOT THE LADDER. Nothing here re-authors a rung: the
     order — which is what carries Hannah's staging, see below — is untouched,
     and so is every threshold, so the scrub, `?p=`, `?pose=` and the frozen
     `?capture=` path are bit-identical by construction (`blending` is false on
     all of them and `shownPull` is assigned `pure` outright). What changes is
     that on a BLEND the driver spends the same TIME on each rung instead of
     the same PULL on each rung:

         rate(u) = clamp( gapAround(u) / LADDER_GAP_S, RATE_MIN, RATE_MAX )

     · A gap WIDER than LADDER_GAP_S is already slower than the target, so the
       ceiling `RATE_MAX = BLEND_REVEAL_RATE` leaves it exactly as it ships.
       The sparse head is therefore untouched, per-body kindling included —
       which matters, because REVEAL_W / rate IS the kindle time and the
       shipped 160 ms was derived to sit between the forward flick's 136 and
       the forward firm read's 190. Going faster there would buy a pop.
     · A gap NARROWER than it is stretched to take LADDER_GAP_S. That is the
       whole of the complaint: today's tightest ladder gap is 0.0137 of pull
       (13.7 ms at rate 1.0) and it becomes 45 ms.
     · `RATE_MIN` is a guard, not a shaper: the tightest gap today needs 0.304
       and the floor is 0.30, so it does not bind on this ladder. It exists so
       that a future rung pair landing on top of each other cannot drive the
       rate to zero and stall the reveal inside a move.
     · BELOW the first rung nothing is kindling at all — every threshold is
       above — so the driver runs at RATE_FAST there. That dead road (0.0966 of
       pull, 97 ms at the shipped rate) is what pays for part of the stretch.
       ABOVE the last rung is NOT dead and the first cut of this treated it as
       though it were: a rung's light runs from its threshold to threshold +
       REVEAL_W, so the top of the band is where the last rungs are actually
       kindling. Running it fast collapsed the closers to 17 ms apart —
       measured, worse than the fault — so [last rung, PULL_MAX] holds
       BLEND_REVEAL_RATE, which is exactly the 160 ms per body `1825393`
       derived.

     THE BUDGET, MEASURED, because it is the binding constraint. The down-wrap
     gives the chapter 1.384 s from the move's first frame to the frame its own
     `rise` starts fading it out (uAmount leaves 1.0 at 1452 ms, reaches 0 at
     1535 ms; the reveal today finishes at ~1168 ms). The up-wrap gives 1.450 s
     between the chapter becoming visible and the lap landing, with the
     convergence tail legal after that. The seven gaps already wider than the
     target keep their shipped cost (0.502 s), the sixteen narrower ones cost
     LADDER_GAP_S each, the run below the first rung costs 40 ms at RATE_FAST,
     and the run above the last rung 169 ms at the shipped rate. At
     LADDER_GAP_S = 0.040 that totals 1.351 s — inside the tighter of the two
     windows with ~33 ms in hand. At 0.045 it is 1.431 s and does not fit.
     Measured, not guessed.

     AND THE STAGING IS ALREADY IN THE ORDER. Hannah asks for "the ring goes
     and then all the mushrooms come in or go away after that", and the ladder
     says exactly that once its gaps stop hiding it. The four lowest rungs are
     ring members (0.0966, 0.1833, 0.2638, 0.3406) and the field's first body
     is at 0.4118 — so coming in, FOUR RING MEMBERS OPEN ALONE, one at a time,
     before a single mushroom of the field arrives; going out, the same four
     are the last lights left, one at a time, after the field has emptied. That
     reading was always authored; at 32-34 ms apart it was unreadable. Nothing
     needed inventing — it needed time. */
  const LADDER_GAP_S = 0.040;   // seconds per ladder rung, blends only
  const RATE_MIN = 0.30;        // guard against a degenerate (near-zero) gap
  const RATE_FAST = 2.4;        // below every threshold — nothing is kindling

  /* ---- §41. AN ARRIVAL AND A DEPARTURE DO NOT HAVE THE SAME ROOM ---------
     (2026-08-14, Hannah's FIFTH request on this arrival, verbatim: "could you
     make the INDIVIDUAL MUSHROOMS AT THE END LIGHT UP SLOWER AND MORE
     STAGGERED". Two knobs, and she has said before what she is after: a town
     where the houses light one at a time, "like a town of Christmas trees".)

     WHY FOUR PASSES BOUGHT A FACTOR AND SHE ASKED AGAIN. Every one of them
     scaled the whole arrival uniformly — `route.js` scrollVh 3.5 -> 6 -> 12 ->
     17.6, `clones.js` DRAW_W 0.16 -> 0.28 -> 0.32 -> 0.50. A uniform scale
     cannot touch the SHAPE, and the shape is the complaint: the 24-rung ladder
     is an accelerando whose gaps run 0.0867 of pull at the head down to 0.0137
     at the tail, a 6.3x tightening, and the camera accelerates into the rest on
     top of it. Measured on this tree at 2400 px/s on the real wheel path, the
     first eleven rungs arrive 96-179 ms apart and the last thirteen arrive
     21-45 ms apart. Whatever the overall tempo, the town's far half always
     lights at once, because the tightening survives every scale factor applied
     to it.

     AND THE PULL AXIS IS EXHAUSTED. The ladder occupies [0.0966, 0.9511] of a
     band whose top is pinned by `PULL_MAX` = 1.12 (the rest's own camera x)
     and whose bottom is the surface pierce; evening the gaps out in pull would
     have to take the road from the head, which is the half that already reads
     correctly. So the stagger cannot be bought in pull. It has to be bought in
     TIME — which is exactly what this limiter is, and what `a0a89f8` made
     reachable tonight by arming it on commit glides as well as on blends.
     Before that commit a gestured arrival — the way a visitor actually reaches
     this chapter — was not rate-limited at all, and these two constants could
     not touch it. That is the binding constraint moving, and it is why this
     pass is not a fifth application of the previous four levers.

     THE SPLIT. A RETIRE and an ARRIVAL have different budgets, and conflating
     them is what pinned `LADDER_GAP_S` at 0.040:

     · A retire on the lap has a HARD window. `RETIRE_SPAN` 0.62 of the wrap's
       4.00 s is 2.48 s, and it is measured, not chosen — past ~2.4 s of the lap
       the colony has left frame, so a light that goes out after that goes out
       where nobody can see it. `retireScale` already fits the retire into that
       window and `bedSpread` arms off the same comparison, both against
       `BAND_S`. The retire is therefore AT its ceiling already and cannot be
       slowed; measured, the down-wrap spends 2.33 s of a 2.48 s window.
     · An ARRIVAL has no window at all. Its lights may finish after the camera
       lands — the shipped forward arrival already does exactly that ("its last
       rungs finish as the camera settles into the rest"), and the convergence
       tail below is the machinery that lets them. A town you are walking into
       may go on lighting while you stand still; a town you are leaving may not
       go on darkening after it is out of sight.

     So the arrival gets its own clock and the departure keeps the shipped one.
     `BAND_S` still integrates `blendRate` and nothing else, so `retireScale`,
     `bedSpread` and every departure — the lap out, the rail click out — are
     bit-for-bit what they were: unchanged by construction, not by measurement
     (this is the `ba09f49` hazard, a flag taking a dependency on another
     flag's meaning, and the way to not repeat it is to not touch the flag).

     IT STAYS ONE-SIDED, which `a0a89f8` requires of anything routed through
     here. `ARRIVE_GAP_S > LADDER_GAP_S` and `ARRIVE_RATE < BLEND_REVEAL_RATE`
     make `arriveRate(u) <= blendRate(u)` at every u, and `slewPull`'s ceiling
     `max(pure, held)` is untouched — so this can only ever SLOW a light-up,
     never speed one and never invent light the lens has not earned.

     THE TWO KNOBS, SEPARATELY, and both denominated in the unit Hannah is
     describing rather than in pull:

     · ARRIVE_GAP_S is the stagger — seconds between one body starting and the
       next. 0.040 -> 0.130, x3.25. It is a floor, not a schedule: a gap
       already wider than it is left exactly as it is by the `ARRIVE_RATE`
       ceiling, so the head — the eleven rungs that already read one at a time
       — does not move, and only the collapsed tail is stretched. That is what
       flattens the accelerando in time without taking anything from the head:
       measured after, the ladder runs 176 ms at the head to 138 ms at the tail
       instead of 176 ms to 32 ms.
     · ARRIVE_RATE is the individual light-up — one body's own window `drawW`
       divided by this rate IS its kindle time. 1.0 -> 0.42, x2.38.

     Derived against the same real-wheel measurements the shipped pair was:
     `BLEND_REVEAL_RATE` 1.0 was set to sit between the forward flick's 136 ms
     per body and the forward firm read's 190 ms. This is deliberately BELOW
     that band, because the band is the thing being complained about. */
  const ARRIVE_GAP_S = 0.130;   // seconds per rung, arrivals — the STAGGER
  const ARRIVE_RATE = 0.42;     // pull/s ceiling, arrivals — the KINDLE
  const ARRIVE_RATE_MIN = 0.09; // the same guard as RATE_MIN, on this clock's
                                // scale: the tightest gap today needs 0.105, so
                                // it does not bind — it exists only so a future
                                // rung pair landing on top of each other cannot
                                // drive the rate to zero and stall the reveal.
  // The rungs are read from the BUILD, not restated as constants — doc 18
  // §13.4 lists "the ladder constants bake the measured camera curve" as a
  // standing hazard, and a pacing table that had to be re-derived alongside
  // them would be a second copy of the same hazard. Tiers 0-2 are the nine
  // ring members and tier 3 the fifteen field clones: the same twenty-four
  // bodies the ladder is authored over. T4 haze and the T5 cap-rim hints are
  // texture ("haze may arrive as weather") and deliberately do not pace it.
  const LADDER = ring.seats.filter(s => s.tier <= 3).map(s => s.reveal)
    .sort((a, b) => a - b);
  /** Pull units per second for the blend driver at `u`.
   *
   *  THE LOOKUP IS HALF A REVEAL WIDTH BEHIND THE DRIVER, and that is not a
   *  detail. A rung's light runs from its threshold to threshold + REVEAL_W,
   *  so what the eye reads as its ARRIVAL is the half-way point — the driver
   *  is at `reveal + REVEAL_W/2` when the body reads as on. Pacing on
   *  `gapAround(u)` therefore paces the wrong instant, and it fails exactly
   *  where it matters: the ladder's top three rungs all arrive ABOVE the last
   *  rung, off the end of the table, where the first cut of this had a flat
   *  rate. Measured on a real wheel-driven wrap with the un-shifted lookup,
   *  the ring's last three members crossed 0 ms, 42 ms and 46 ms apart going
   *  out and 85, 23, 24 coming in — the clump intact, just moved. Shifting the
   *  lookup by REVEAL_W/2 asks "whose arrival is happening now?", which is the
   *  question the rate is answering.
   *
   *  Below the first rung nothing has begun. Past the last arrival there is
   *  only the final body's own tail to finish, at the rate derived for it. */
  function paceRate(u, gapS, rateMax, rateMin) {
    const n = LADDER.length;
    if (!n) return rateMax;
    const a = u - REVEAL_W * 0.5;          // the rung arriving at this driver value
    if (a <= LADDER[0]) return RATE_FAST;
    if (a >= LADDER[n - 1]) return rateMax;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LADDER[m] <= a) lo = m; else hi = m; }
    const r = (LADDER[hi] - LADDER[lo]) / gapS;
    return r < rateMin ? rateMin : r > rateMax ? rateMax : r;
  }
  /** The DEPARTURE clock — the shipped one, unchanged, and the only one
   *  `BAND_S` is integrated from. */
  const blendRate = (u) => paceRate(u, LADDER_GAP_S, BLEND_REVEAL_RATE, RATE_MIN);
  /** The ARRIVAL clock (§41). Slower than `blendRate` at every u by
   *  construction — `ARRIVE_GAP_S` is larger and `ARRIVE_RATE` smaller — which
   *  is what keeps the limiter one-sided. */
  const arriveRate = (u) => paceRate(u, ARRIVE_GAP_S, ARRIVE_RATE, ARRIVE_RATE_MIN);

  /* THE DEPARTURE HAS TO RIDE THE MOVE, AND ONLY THE ARRIVAL EVER DID
     (2026-08-14 — Hannah: "when I scroll down from the final section to loop
     back to the first one, all the lights switch off before the actual loop
     starts — before the motion properly starts. Could you make all the other
     mushrooms switch off as I'm going... maybe they should be turning off
     throughout the whole duration of the thing. The motion the other way is
     perfect — it's the bottom-to-top that feels not good.")

     THE ASYMMETRY IS THE CEILING, and it is one-sided BY DESIGN. `slewPull`
     clamps the driver to `max(pure, held)` — "may hold light the lens has
     earned, never create light it has not". Coming IN that clamp binds every
     frame: the camera leads and the driver follows it. Going OUT it is a
     no-op (`pure < held` makes the ceiling `held`), so the retire free-runs on
     the ladder clock with no camera term in it at all.

     Measured through real in-page rAF-timed wheel wraps, tracer registered
     last so every row is the presented frame:

       up-wrap    bodies cross 2576 -> 3684 ms of a 3839 ms move — 67% .. 96%,
                  landing with the camera. Driver 0.509 against a camera-pure
                  1.073 at 2874 ms: it lags the lens the whole way in.
       down-wrap  bodies cross 122 -> 1245 ms of a 3867 ms move — 3% .. 32%.
                  The 94-body field is COMPLETELY OUT at 926 ms, at which
                  point the camera has moved 0.24 of x and pullOf(camera.x) is
                  still exactly 1.120 — SATURATED. Not one light that went out
                  in the first second was asked for by the lens.

     So it is (a) and (b) at once, and worse than either: the extinguish
     starts on the blend's FIRST frame and finishes before a third of the move
     is spent, entirely inside a window where the camera-pure driver has not
     moved. That is Hannah's "before the motion properly starts", exactly.

     WHY THE CAMERA CANNOT PACE IT. `pullOf` reads camera X, which is the
     FINAL LEG's own coordinate. The lap is an ORBIT: x runs -14.72 -> -15.2
     (deeper, and clamped away by PULL_MAX) for a second, then cliffs -14 ->
     -8 in 409 ms as the swing crosses, then means nothing at all. The
     driver's whole dynamic range is spent in the first 1.4 s of a 3.87 s move
     because a leg coordinate is being read on a path that does not travel
     along it. `rise` (uAmount) is keyed the same way and closes the chapter at
     1519 ms for the same reason — measured, 61% of the lap has no epilogue in
     it whatsoever, and a frame strip with the chapter held composed shows the
     colony is still well inside frame at 1.2-2.0 s, filling the emptiness
     §13.6 flagged.

     THE FIX IS THE WINDOW, AND THE SHAPE IS UNTOUCHED. A move that is leaving
     tells the chapter how long it has (journey.js hands `dur` to setBlending
     for the same reason it already hands `dstCamX`). The retire then spends
     RETIRE_SPAN of that move instead of spending the ladder's own clock:

         retireScale = min(1, BAND_S / (RETIRE_SPAN * dur))
         rate(u)     = blendRate(u) * retireScale

     · ONE SCALAR ON e1e8381's CURVE. Every rung keeps its relative time, so
       the accelerando's re-shaped distribution, the half-reveal-width lookup
       and the RATE_MIN guard all survive intact; only the tempo moves.
     · IT CAN ONLY EVER SLOW. `min(1, ...)` leaves a move with less room than
       the ladder needs bit-for-bit as it ships. The ordinary jump's duration
       law tops out at 1.20 s, whose window is 0.74 s — under BAND_S — so NO
       NON-WRAP BLEND CAN REACH THIS CODE, and the rail click out of the
       epilogue is unchanged by arithmetic rather than by hope. Today only the
       wrap's 4.00 s lap clears the bar: window 2.48 s, retireScale 0.526.
     · BAND_S IS INTEGRATED FROM THE BUILD, not restated: the time the shipped
       blend clock takes to cross the whole PULL_MAX band, integral du/rate(u).
       Doc 18 §13.4's standing hazard is "the ladder constants bake the camera
       curve"; a second copy of the cost table would be a second copy of it.

     AND THE CHAPTER'S OWN FADE HAS TO WAIT FOR ITS LIGHTS. On the LEG the
     ordering is free: `pull` reaches 0 at x -8 and `rise` only starts falling
     at x -7.4, so the reveal is FINISHED before the fade begins. On the lap
     that ordering held only by luck (retire done 1245 ms, fade 1440 ms) and a
     stretched retire breaks it — `rise` would snuff a 60%-lit field in 79 ms,
     which is the same complaint moved to the end of the move. While a
     stretched retire runs, the chapter therefore fades on ITS OWN LAST LIGHT
     instead of on a leg coordinate the lap does not travel along: eff eases
     out across [0, LADDER[0]] — exactly the dead road below the first rung,
     where `blendRate` already knows nothing is kindling. No light is ever cut
     (eff is 1 for every pull at or above the lowest threshold), the two
     reach 0 together, and the interval is read from the ladder rather than
     invented. It is latched monotone so the visibility gate — which reads
     `eff`, and which resets `shownPull` to the camera-pure value the moment it
     closes — cannot oscillate.

     RETIRE_SPAN 0.62 is measured, not chosen: past ~2.4 s of the lap the
     colony has left frame (a forced-composed strip diffs to the shipped frame
     by less than the terrain it would add), and the epilogue's own terrain
     must be gone well before the Mission rest it would otherwise paint over.

     NOTHING HERE IS REACHABLE OFF A BLEND. `blending` is false on the scrub,
     `?p=`, `?pose=` and the frozen `?capture=` path, and `retiring` is false
     on every arriving move — so the up-wrap, every jump INTO the epilogue and
     all ten goldens are unchanged by construction, not by measurement. */
  const RETIRE_SPAN = 0.62;   // of the move, for a departure that has room

  /* ---- §31. THE BED HAD NO DRIVER OF ITS OWN --------------------------
     (2026-08-14, Hannah: "in the loop from bottom to top and vice versa, the
     ground lights up and darkens in a very sudden way. Can you make sure this
     is all more incremental." 26-scroll-loop.md §31.)

     `027f969` above spread the BODIES' retire across the move and said, in as
     many words, that it touched nothing else. The bed underneath them — the
     terrain cutaway and the root canopy across it — is the nothing else, and
     it had the same fault in BOTH directions at once, because its whole
     brightness is `eff` and `eff` is a step on a lap:

       leaving   eff = retireEff, a smoothstep over the DEAD ROAD below the
                 lowest rung, [0, LADDER[0]] = 0.0966 of pull, crossed at
                 RATE_FAST x retireScale = 1.26 pull/s  ->  77 ms
       arriving  eff = rise = riseOf(camera.x), a smoothstep over 2.8 units of
                 the Final LEG's camera x (-4.6 -> -7.4), which an ORBIT
                 crosses at ~35 units/s                 ->  81 ms

     Measured on the real wheel path (in-page rAF-timed WheelEvents, a tracer
     animator registered last, so every reading is the presented frame): the
     bed's whole transition takes 109 ms of a 3867 ms lap going out (2.8%) and
     101 ms of 3877 ms coming in (2.6%) — and 99% of it lands inside a single
     100 ms window in both directions — against the 63.6% and 36.0% of the lap
     the bodies standing on it already spend. It is §26.2's diagnosis exactly,
     a leg coordinate read on a path that does not travel along it, arrived at
     from the two sides `027f969` did not have to touch.

     THE BED RIDES THE DRIVER THE FIELD ALREADY RIDES. `bed` is the chapter's
     own reveal driver mapped over its whole band rather than over a 0.0966
     tail of it:

         bed = smoothstep( shownPull / PULL_MAX )

     · It costs no new pacing and no new clock. `shownPull` is already spread
       across 62% of a departing move (RETIRE_SPAN, above) and across the
       ladder on an arriving one, both measured, both mirrored — so the ground
       is carried by the same spread that carries the lights, and the two stop
       being separate events. "The lights are going off somewhere" gets the
       floor they are going off on.
     · IT IS CAMERA-KEYED THROUGH slewPull's OWN CEILING, not through a second
       invariant. `shownPull <= max(pure, held)` means the bed can never be
       brighter than the lens has earned, so a nav jump into the epilogue
       cannot light the ground at the click while the camera is still at
       Mission — the failure class a8d4518 / d1ecc23 / a3ba9fd / 783729b /
       046e024 were all instances of. Nothing here reads `p`.
     · IT IS THE SAME FUNCTION IN BOTH DIRECTIONS, so the two wraps are one
       event run forwards and backwards by construction.
     · ORDERING IS FREE. Going out the bed reaches 0 on the same driver value
       as the last light (both at pull 0), so it is already dark by the time
       `eff` starts its own fade — the retire never has a lit floor snuffed
       under it, which is the hazard §27.1 had to argue for. Coming in the bed
       and the field rise together from the pierce.
     · THE OCCLUDER GOES WITH IT. terrain.setAmount() drives the soil slab's
       dissolve as well as the haze, and that stays coherent: everything the
       slab exists to hide (the underground cords, hyphae and front) is the
       bed's own geometry and fades with it, so there is never a frame with
       strokes to hide and no slab to hide them.

     WHEN IT ARMS. Only a move with room, by exactly the arithmetic `027f969`
     already established — `RETIRE_SPAN * dur > BAND_S`. The longest ordinary
     jump's duration law tops out at 1.20 s (window 0.74 s, under BAND_S), so
     NO non-wrap blend can reach this code and the rail click into or out of
     the epilogue is unchanged by arithmetic rather than by hope. Off a blend
     `bed` is assigned `eff` outright. */
  /** The driver value at which the HORIZON is whole, against PULL_MAX = 1.12
   *  for the floor (§39). 0.80 puts the two curves at most 0.28 apart, around
   *  the middle of the band, and exactly together at both ends. */
  const SKY_FULL = 0.80;
  let bedSpread = false;

  /** Seconds the SHIPPED blend clock takes to cross the whole band. Integrated
   *  off `blendRate` so it can never disagree with it. */
  const BAND_S = (() => {
    const N = 4096, du = PULL_MAX / N;
    let s = 0;
    for (let i = 0; i < N; i++) s += du / blendRate((i + 0.5) * du);
    return s;
  })();

  // null = "adopt the camera-pure value on the next tick" (boot).
  let shownPull = null;
  let blendPull = 0;                // pull at the blend's destination pose
  let lagging = false;              // armed by a blend; cleared on convergence
  let retiring = false;             // this blend is LEAVING the epilogue
  let retireScale = 1;              // 1 = the shipped clock, exactly
  let retireEff = 1;                // monotone fade, latched while retiring
  /** One step toward `target`, capped at the rate, then held under the
   *  invariant above — `pure` is this frame's camera-pure value and `held` is
   *  last frame's shown value. One place, so the law has one implementation. */
  function slewPull(held, target, pure, dt) {
    /* WHICH CLOCK (§41). Lighting up and going out do not have the same room,
       so they do not run on the same clock: an arrival may finish after the
       camera lands, a retire on the lap may not — it has `RETIRE_SPAN` of the
       move and then the colony is out of frame. The direction is read off the
       step itself rather than off a flag, so there is no second piece of state
       to fall out of sync with `retiring` (the `ba09f49` failure), and it
       cannot chatter: within `step` of the target the branch is not taken at
       all, `d` is consumed whole either way.
       `retireScale` is a departure's own fitting term and is 1 on every
       arriving move, so naming it only on this side changes nothing it did. */
    const d = target - held;
    const step = (d > 0 ? arriveRate(held) : blendRate(held) * retireScale) * dt;
    const v = held + (Math.abs(d) <= step ? d : (d > 0 ? step : -step));
    const ceil = pure > held ? pure : held;
    return v > ceil ? ceil : v;
  }

  /* ---- hero ground-network re-parameterisation (declutter round) ----
     Hannah, twice: "messy lines that go all over the place, ESPECIALLY
     ALONG THE FOREST FLOOR." The worst offender was the HERO's own §8
     ground network — web, mycelium threads, root arteries, hub stars —
     which lies at y≈0 across the entire Final floor and reads as a
     countable-stroke carpet from the pullback camera. The hero itself is
     untouchable, so this is handled scene-state-wise at the Final leg
     (the Connect-chapter precedent): materials are collected once, dimmed
     per class as the pullback proceeds, and restored EXACTLY on retire.
     The soft moss glow POOLS keep most of their light (they ARE the
     ground-glow language this revision moves the floor to); the stroke
     carriers fall to a whisper. The scene-level ambient mote cloud (the
     fake-DOF bokeh balloons in the near field) dims out entirely and is
     retired below 12% — Connect's raster lesson. */
  const heroDim = [];
  let heroDimReady = false, heroDimActive = false;
  function addDim(o, keep) {
    const m = o.material;
    const u = m && m.uniforms && m.uniforms.uOpacity;
    if (u) heroDim.push({ o, u, base: u.value, keep, vis: o.visible });
    else if (m && typeof m.opacity === 'number')
      heroDim.push({ o, m, base: m.opacity, keep, vis: o.visible });
  }
  function collectHeroGround() {
    if (heroDimReady) return;
    heroDimReady = true;
    const gg = sceneApi.groups && sceneApi.groups.ground;
    if (gg) {
      // same predicate + order the hero itself uses (§ intro sequencing):
      // [web, myc, mossPts, pools, roots, ribbon, beads]
      const withWin = gg.children.filter(o => o.material &&
        ((o.material.uniforms && o.material.uniforms.uWin) ||
         (o.material.userData && o.material.userData.uWin)));
      const KEEP = [0.10, 0.10, 0.28, 0.55, 0.12, 0.15, 0.25];
      withWin.forEach((o, i) => addDim(o, KEEP[i] ?? 0.20));
    }
    // ambient mote/bokeh cloud: a direct scene child, never the shed
    for (const o of sceneApi.scene.children) {
      if (o.isPoints && o !== sceneApi.groups.spores) addDim(o, 0.0);
    }
  }
  function applyHeroDim(reach) {
    heroDimActive = reach > 0.001;
    for (const d of heroDim) {
      const f = 1 - reach * (1 - d.keep);
      if (d.u) d.u.value = d.base * f;
      else d.m.opacity = d.base * f;
      d.o.visible = d.vis && (d.o.isPoints ? f > 0.12 : true);
    }
  }
  function restoreHeroDim() {
    for (const d of heroDim) {
      if (d.u) d.u.value = d.base;
      else d.m.opacity = d.base;
      d.o.visible = d.vis;
    }
    if (shedFog) {
      shedFog.near.value = shedFog.n0;
      shedFog.far.value = shedFog.f0;
    }
    heroDimActive = false;
  }

  /* ---- the hero's own shed, on the world's fog (2026-08-06) ----------------
     Hannah: the spores at the end feel like a different substance from the
     ones at the beginning. Most of that lives in this chapter's own sky layer
     (sky.js's header has the diagnosis and the four fixes), but one part of
     it is the hero's REAL shed, and it is the same bug clones.js already
     names in capitals: THE ONE UNIFORM A CLONE MUST NOT INHERIT IS FOG.

     organism/organism.js's makePoints latches `fogNear`/`fogFar` per material
     at construction, to the hero page's fixed 7 -> 20. The director opens the
     world to 13.75 -> 60.3 across this leg and every other thing in frame
     rides that ramp — terrain, sky, the species batch, and the clone bodies,
     which had to be taken OFF the hero's pair for exactly this reason. The
     4,200-particle shed was never given the same treatment, so at the rest:

       · mean per-particle output 0.109, against 0.518 at the opening — the
         same cloud, 4.7x dimmer, for no reason a viewer can see;
       · on the world's own fog it would be 0.446, i.e. its own fog pair costs
         it 4.1x while the soil under it keeps its light;
       · and a hard black wall at 20 units cuts a cloud that spans 13.1-20.7
         clean in half. The hero's plume literally stops mid-air.

     So the shed rides the chapter's ramp here, by the same eased `reach` the
     ground-network dim uses (pure in the camera pose, so reverse scrubs
     retract it), and hands the two numbers back verbatim on retire. The
     material is the organism's; the VALUES are scene state for the length of
     one leg, which is the Connect-chapter precedent this file already runs on
     twenty lines above. Nothing inside organism/ is touched, and at p = 0 the
     chapter is not visible, so the Mission frame cannot see this at all. */
  let shedFog = null;
  function collectShedFog() {
    if (shedFog) return;
    const sp = sceneApi.groups && sceneApi.groups.spores;
    const u = sp && sp.material && sp.material.uniforms;
    if (!u || !u.fogNear || !u.fogFar) return;   // shader drifted: do nothing
    shedFog = { near: u.fogNear, far: u.fogFar, n0: u.fogNear.value, f0: u.fogFar.value };
  }
  function applyShedFog(reach) {
    if (!shedFog || !sceneApi.scene.fog) return;
    shedFog.near.value = shedFog.n0 + (sceneApi.scene.fog.near - shedFog.n0) * reach;
    shedFog.far.value = shedFog.f0 + (sceneApi.scene.fog.far - shedFog.f0) * reach;
  }

  /* ---- rise mask (M5 ignition audit, D16) ----
     The T4 hold arms this chapter at p 0.80, while the camera is still deep
     in the Owned colony (x −4.4). Between there and the surface pierce
     (x −8.06 at p 0.85) this mask runs 0 → 1 as a pure function of the pose
     — the same discipline as uPull — so every fade the chapter owns (soil
     slab dissolve, whisper bases, haze, sky, mist) COMPLETES underground,
     behind the slab it is itself dissolving in, before anything above ground
     can be seen. Combined with `amount` as a probabilistic OR: a fling that
     outruns the arming clock still surfaces onto a finished world, because
     the mask alone saturates the reveal. Reverse rides re-descend behind the
     same slab and the mask retires everything in place. */
  const riseOf = (camX) => {
    const u = (-camX - 4.6) / 2.8;             // 0 at x −4.6, 1 by x −7.4
    const c = u < 0 ? 0 : u > 1 ? 1 : u;
    return c * c * (3 - 2 * c);
  };

  /* ---- the jump window: state says arrived, the camera says otherwise ----
     `amount` is the T4 arm, and the arm is driven by journey PROGRESS. On a
     nav jump progress snaps to the destination in one tick while the camera
     takes the best part of a second to get there, so for that window `amount`
     is not evidence about the pose — and the OR above lets it pin `eff` wide
     open regardless of `rise`. That is the second half of Hannah's "weird
     flash" (25-navigation-redux.md): even with the camera read fixed, a jump
     to Final composed the whole epilogue — soil slab, colony, sky, mist — at
     full uAmount over a camera still standing at Mission, while the per-vertex
     kindle (which DOES track the camera) held every body at its ember floor.
     Measured: +3,900 to +8,100 triangles of epilogue drawn at the departure
     pose, and the frame ~6.6/255 brighter than the Mission rest, for the whole
     blend.

     So while a blend is in flight the chapter composes on its CAMERA-PURE
     term alone. `rise` is exactly the right one: it already means "the lens
     has climbed into this chapter's territory", it is 0 at every other
     chapter's rest (their camera x is -2.25 .. +9.97, all well above the
     -4.6 onset) and 1 at this one's, and it is the same mask the ordinary
     underground approach composes on. The result is that a jump to Final
     reveals exactly as the scrub does — nothing until the lens passes
     x -4.6, then the slab dissolving in, then the bodies kindling on uPull —
     and a jump AWAY from Final retires it the same way, in reverse, instead
     of vanishing the whole field on the click frame.

     Off a blend this is byte-for-byte the shipped composition, including the
     visibility gate: `flag ? … : …` and not a blend of the two. Deep links,
     ?p= and the frozen ?capture= path never blend, so every golden is
     untouched by construction. */
  let blending = false;
  // Set every frame from scroll.gliding — true only while the commit
  // resolution is actually carrying the picture, never during a live gesture.
  let gliding = false;

  sceneApi.addAnimator('journey-final', (t, dt) => {
    // THE EASE HOLDS WHILE THE STATE AND THE CAMERA DISAGREE (2026-08-13 —
    // the loop's seam). `amount` is state-derived: it starts falling on the
    // frame a jump snaps p to the destination, i.e. seconds before the camera
    // leaves. `eff` below is already camera-pure across a blend, but the
    // visibility gate still reads `amount`, so a long enough move retires the
    // chapter on the WALL CLOCK rather than on the lens — at 2.2/s the gate
    // drops at 2.64 s, and the wrap's move is 4.00 s. It survived only
    // because `rise` happened to cross first (measured 1.49 s). Frozen here,
    // the gate cannot be the thing that retires anything; placeAt's deferred
    // snap lands it at endCamBlend exactly as it always did.
    if (!blending) {
      amount += (amountTarget - amount) * Math.min(1, dt * 2.2);
      if (amount < 0.004 && amountTarget === 0) amount = 0;
    }
    // The soil slab's `buried` dissolve is written EVERY frame, before the
    // visibility gate and outside setAmount — it is one float, and it is the
    // only way the term is genuinely stateless. Written inside the gate it
    // LATCHES whenever the chapter stops ticking: a reverse ride retires the
    // epilogue at p ~0.80 with the lens still 1.1 under the soil, leaving
    // buried = 1 for every p below that, against 0 on the way out. No frame
    // ever RENDERS the stale value (the group is invisible, and the animator
    // runs spine-first and rewrites it before any frame the group is drawn
    // for), but a forward/reverse uniform sweep then reports a full 1.0
    // mismatch that cannot be told apart from real hysteresis. Written here,
    // the sweep measures 0.000e+00 and the audit means what it says.
    terrain.setBuried(buriedOf(sceneApi.camera.position));
    // The canopy's presence is written on the SAME terms as the slab's
    // dissolve and for the same reason: one float, camera-pure, written every
    // frame BEFORE the visibility gate and outside setAmount. Written inside
    // the gate it would latch at whatever the lens was doing when the chapter
    // last ticked — a reverse ride retires the epilogue at p ~0.80 with the
    // lens still buried — and a forward/reverse uniform sweep would then
    // report hysteresis that is really a stale write. Written here, the sweep
    // measures zero and the audit means what it says.
    canopy.setPresence(surfacedOf(sceneApi.camera.position));
    const rise = riseOf(sceneApi.camera.position.x);
    // A STRETCHED RETIRE FADES ON ITS OWN LAST LIGHT, not on `rise`. See the
    // RETIRE_SPAN block: on the leg the reveal always finishes before the fade
    // starts, and on the lap `rise` is a leg coordinate read off an orbit, so
    // it would close the chapter with the field still 60% lit. The band is
    // [0, LADDER[0]] — the dead road below the first rung — so eff is 1 for
    // every pull that still owns a light, and the last light and the fade
    // reach 0 together. Latched monotone: the visibility gate below reads
    // `eff` and resets `shownPull` to the camera-pure value the moment it
    // closes, which without the latch could re-open it.
    if (blending && retiring && retireScale < 1) {
      const u = LADDER.length && shownPull !== null
        ? Math.max(0, Math.min(1, shownPull / LADDER[0])) : 1;
      const s = u * u * (3 - 2 * u);
      if (s < retireEff) retireEff = s;
    }
    const eff = blending
      ? (retiring && retireScale < 1 ? retireEff : rise)
      : 1 - (1 - amount) * (1 - rise);   // amount OR rise
    // THE BED'S OWN FADE (§31). Read off `shownPull` — last frame's value, the
    // same one `retireEff` above is read from and for the same reason: this
    // block runs before the visibility gate, and the gate has to see it.
    //
    // THE SPREAD BELONGS TO THE BLEND AND ENDS WITH IT (§38). It used to also
    // run through `lagging`, to carry the blend's own convergence tail. That
    // was true of `lagging` when it was written and stopped being true at
    // `a0a89f8`, which armed the limiter — and therefore `lagging` — off a
    // COMMIT GLIDE as well. `lagging` no longer means "this blend has not
    // converged"; it means "the driver is behind the camera", which an ordinary
    // gestured leg now causes. With `bedSpread` latched by an earlier wrap that
    // put the wrap's spread on a SCRUB: measured on the real wheel path, a
    // gestured Owned -> Final leg after one wrap drew the ground at bed 0.0614
    // against eff 1.0000 — worst |bed - eff| 0.9386 over 140 drawn frames.
    // `bedSpread` is now cleared with the blend, so the condition is the blend
    // and nothing else, and the tail hands back to `eff` — which is what the
    // landing is for, and costs nothing because the lag at a wrap's landing is
    // 0.0000 in both directions (G6).
    let bed = eff, skyv = eff;
    if (bedSpread && blending && shownPull !== null) {
      const b = Math.max(0, Math.min(1, shownPull / PULL_MAX));
      bed = b * b * (3 - 2 * b);
      const s = Math.max(0, Math.min(1, shownPull / SKY_FULL));
      skyv = s * s * (3 - 2 * s);
    }
    // Still gated by the arm — `rise` says where the lens is, not which
    // chapter owns the frame, and the lens is below the onset on every other
    // leg anyway. `amountTarget > 0` keeps an arriving jump live before the
    // ease has moved; `amount > 0.003` keeps a departing one live while it
    // retires on the camera.
    // The gate takes the BRIGHTER of the two fades (§31). On today's lap it is
    // `eff` at every frame in both directions, so the draw-call edge does not
    // move — but a gate that reads only `eff` is a gate that can cut a lit bed,
    // and the bed is now the one thing in the chapter `eff` does not govern.
    group.visible = blending
      ? (amountTarget > 0 || amount > 0.003) && Math.max(eff, bed, skyv) > 0.003
      : amount > 0.003;
    if (!group.visible) {
      lastPull = pullOf(sceneApi.camera.position.x);
      // Retired: the driver is the camera-pure value again, exactly. Nothing
      // renders while this holds, so a lag can never be latched behind the
      // gate and carried into the next entry — the guarantee is that whenever
      // this chapter is off screen, its reveal state IS pullOf(camera.x).
      shownPull = lastPull;
      lagging = false;
      if (heroDimActive) restoreHeroDim();   // byte-exact hand-back
      if (wasVisible) {
        // One last INACTIVE tick as the chapter goes dark, so the ring drops
        // any poke still ringing and the clone bodies retire their opacities
        // in place instead of freezing mid-kindle behind the camera. It is
        // also what parks pickOn false, which is the picker's only gate now
        // that it holds no state of its own. Once retired we stop ticking
        // entirely — the epilogue costs nothing for the rest of the ride.
        wasVisible = false;
        uniforms.uAmount.value = eff;
        bedUniforms.uAmount.value = bed;
        skyUniforms.uAmount.value = skyv;
        uniforms.uPull.value = pullOf(sceneApi.camera.position.x);
        uniforms.uPullRaw.value = pullRawOf(sceneApi.camera.position.x);
        ring.update(t, dt, false);
      }
      return;
    }
    wasVisible = true;

    // shared uniforms.
    // `pure` is the shipped camera-pure driver. `pull` is what the chapter
    // SHOWS, and the two are the same float everywhere except inside a blend
    // and its convergence tail — see BLEND_REVEAL_RATE above. One value feeds
    // everything (uPull, the hero floor dim's `reach`, the growth front's
    // 0.35 gate, the dwell test, ring's PICK_PULL), because the chapter has
    // exactly one reveal driver and splitting it would be two clocks again.
    const pure = pullOf(sceneApi.camera.position.x);
    // THE LIMITER IS ARMED BY A BLEND AND BY NOTHING ELSE. `lagging` has to be
    // its own flag: "shownPull !== pure" is NOT the test, because shownPull
    // holds the PREVIOUS frame's value and so differs from `pure` on every
    // frame the camera moved at all — the first build used it and rate-limited
    // ordinary brisk scrolling (caught by G1, the every-frame equality gate).
    // With the flag, a ride that never blends never touches this branch and
    // `pull` is `pullOf(camera.x)` by assignment.
    if (shownPull === null) { shownPull = pure; lagging = false; }
    if (blending && dt > 0) {
      shownPull = slewPull(shownPull, blendPull, pure, dt);
      lagging = shownPull !== pure;
    } else if (gliding && dt > 0) {
      // ...AND BY A COMMIT GLIDE (2026-08-14). Hannah asked for the transit
      // from Owned to this chapter and back to be FASTER (route.js TRANSIT_S),
      // and the reveal is camera-pure, so a quicker transit would have run the
      // ladder quicker for exactly the reason a blend does: the visitor is not
      // metering this motion with their hand, the machine is. That is the same
      // fault BLEND_REVEAL_RATE was built for, arriving through the other
      // machine-driven path, so it gets the same answer rather than a second
      // one.
      //
      // THE TARGET IS `pure`, NOT A DESTINATION POSE. A blend teleports the
      // camera and has to be told where it lands; a glide moves the camera
      // continuously along the real path, so the camera-pure value IS the
      // truth and all this branch does is refuse to let the ladder be dragged
      // through faster than its own clock. The invariant is untouched —
      // slewPull still holds `shownPull <= max(pure, held)` — so this can only
      // ever SLOW a light-up, never create light the lens has not earned.
      // That is what decouples travel speed from kindle speed: TRANSIT_S may
      // now be set for the travel alone, and requests 61/77/107 (the field
      // must light SLOWLY) are protected by construction rather than by
      // choosing a transit that happens not to hurt them.
      shownPull = slewPull(shownPull, pure, pure, dt);
      lagging = shownPull !== pure;
    } else if (lagging && dt > 0) {
      // The blend has landed (or was cancelled) and the reveal has not caught
      // up yet. It keeps its own rate home — the last rungs go on finishing
      // after the camera settles, which is what the shipped forward arrival
      // does too. Reachable only because snap() no longer discards the lag;
      // see the note there.
      shownPull = slewPull(shownPull, pure, pure, dt);
      if (Math.abs(shownPull - pure) < 1e-4) { shownPull = pure; lagging = false; }
    } else if (!blending) {
      // Camera-pure, bit-exactly. This is the scrub path, and the dt = 0
      // freezeTime path (?capture=, hidden tab): a frozen frame is a
      // placement, and a placement is camera-pure.
      shownPull = pure;
      lagging = false;
    }
    const pull = shownPull;
    // hero floor-network dim rides amount x pull — eases in with the
    // pullback, reverses with it, restores exactly on retire
    collectHeroGround();
    collectShedFog();
    const reachT = Math.max(0, Math.min(1, (pull - 0.25) / 0.45));
    const reach = eff * reachT * reachT * (3 - 2 * reachT);
    applyHeroDim(reach);
    applyShedFog(reach);
    uniforms.uAmount.value = eff;
    bedUniforms.uAmount.value = bed;
    skyUniforms.uAmount.value = skyv;
    uniforms.uPull.value = pull;
    // the unclamped twin, for the clone entry-draw front (clones.js part B).
    // It carries the SAME OFFSET, with sign: the entry draw runs a reveal-width
    // ahead of the kindle (clones.js DRAW_W_HI/LO) and the two must stay
    // exactly that far apart in BOTH directions — a slowed light-up would
    // otherwise leave bodies standing fully inked and unlit (the shipped-state
    // fault 070892c bought the ahead-draw to avoid), and a lagging retire would
    // un-draw bodies that are still lit. `pull - pure` is negative while the
    // reveal is behind the lens and positive while it is holding light out in
    // front of it, and adding it moves the draw front by the same amount
    // either way. Off a blend it is exactly 0 and this is
    // `pullRawOf(camera.x)` bit for bit.
    // ...and while the retire is riding the move, the raw twin is read at the
    // DRIVER rather than at the camera, for the same reason `eff` is (see
    // RETIRE_SPAN). `pullRawOf` is the Final LEG's coordinate; on the lap the
    // lens runs to x +15, so the offset above lands the draw front three whole
    // pull units below the pierce while bodies are still lit — the exact
    // "un-draw bodies that are still lit" the offset exists to prevent, just
    // arrived at from the other side. Above the pierce the raw and clamped
    // drivers ARE the same number, so this is what the line already computes
    // wherever it is reachable today: with `pure` in range the offset cancels
    // to `pull` identically, and at `pull` 0 every clone threshold is above the
    // front either way. Only the window this pass opened differs.
    uniforms.uPullRaw.value = (blending && retiring && retireScale < 1)
      ? pull
      : pullRawOf(sceneApi.camera.position.x) + (pull - pure);
    uniforms.uTime.value = t;
    if (sceneApi.scene.fog) {
      uniforms.uFogNear.value = sceneApi.scene.fog.near;
      uniforms.uFogFar.value = sceneApi.scene.fog.far;
    }

    // growth-front pulse: travels the whole arc, then rests a random while.
    // Held off until the reveal is underway — the first bodies kindle from
    // the pull itself, and the pulse then reads as the colony breathing.
    if (pull > 0.35) {
      if (front.running) {
        front.phase += dt / front.dur;
        if (front.phase >= 1.1) {
          front.running = false;
          front.phase = -0.1;
          front.wait = 3 + cycleRand() * 4;
        }
      } else {
        front.wait -= dt;
        if (front.wait <= 0) { front.running = true; front.dur = 13 + cycleRand() * 5; }
      }
    }
    const edge = Math.max(0, Math.min(1,
      Math.min(front.phase + 0.1, 1.1 - front.phase) / 0.14));
    const wantOn = front.running && pull > 0.35 ? edge * edge * (3 - 2 * edge) : 0;
    front.on += (wantOn - front.on) * Math.min(1, dt * 4);
    uniforms.uFront.value = front.phase;
    uniforms.uFrontOn.value = front.on * 0.85;

    // CTA wave
    if (cta.t >= 0) {
      cta.t += dt / CTA_SECS;
      if (cta.t >= 1) cta.t = -1;
    }
    if (cta.t >= 0) {
      const env = Math.sin(Math.min(cta.t, 1) * Math.PI);
      uniforms.uCta.value = cta.t * CTA_TRAVEL;
      uniforms.uCtaOn.value = env;
    } else {
      uniforms.uCtaOn.value = 0;
      uniforms.uCta.value = -1;
    }

    // primordia dwell: only while settled near the rest (pull high, camera
    // quiet); reverse scroll drains it slowly so re-entry re-earns the buds
    const settled = pull > 0.88 && Math.abs(pull - lastPull) < dt * 0.25;
    dwell = settled ? dwell + dt : Math.max(0, dwell - dt * 0.5);
    lastPull = pull;
    ring.setDwell(dwell);

    // the bodies: clone reveal + sway, and the pointer response for clones
    // and batched members alike. Last, so it reads this frame's uniforms.
    ring.update(t, dt, true);

    // sprite layers (outside the shared shader uniforms).
    // `buried` (2026-08-11): 1 once the lens is 0.25 under the soil, 0 at the
    // surface and above. MEASURED along p 0.725–0.970, every underground frame
    // of this leg is on the KEPT side (cutVal +10.06 → +0.56, crossing zero
    // only at p ≈ 0.862, AFTER the pierce at 0.8555) — so while this term is
    // up, the soil slab can only be the section wall standing in front of a
    // buried lens, and it dissolves. See terrain.js's material note.
    //
    // IT REPLACES the 2026-08-09 `under` tint, which is retired here. That
    // term sank the slab toward near-black over the 0.9 units EITHER side of
    // the soil line, to make its underside bearable; with the underside gone
    // it has nothing left to fix and one thing left to break — at the pierce
    // (p 0.8555) the lens stands ON the soil line with `under` still at 0.96,
    // so the surface it has just broken through filled the lower half of the
    // frame as a BLACK PLATE (10.7% of the frame pure black). Fog tone above
    // ground is what the slab was designed for and what its rest frame has
    // always had — `under` was already 0 at the Final rest (the lens stands
    // 2.68 up), so retiring it cannot touch either Final golden.
    //
    // 0.25 units, not 0.9: the slab must be back the instant the lens
    // surfaces, because above ground is where it does its job (stopping
    // underground strokes reading as lines on the floor). Camera-pure, so
    // reverse rides retrace it exactly.
    // The haze sprites and the soil slab's dissolve are the bed's, not the
    // chapter arm's (§31) — they cannot share the shader uniform, so they take
    // the same float by hand. Off a blend `bed` IS `eff`, so this line is the
    // line it has always been.
    terrain.setAmount(bed);
    // ...and so are the mist sprites, which sit outside the shared uniforms and
    // take the float by hand for the same reason terrain's haze does (§37).
    sky.update(t, skyv);
  });

  /* ---- growth-front world position (lens halation focus hint) ----
     The travelling pulse finally has an exposed position (BUDGETS W5
     polish item 3): the same pure arc formula final-terrain builds the
     front from, sampled at the live phase. Null while the pulse rests or
     runs off-arc — the journey falls back to its static member hint. */
  const _front = new THREE.Vector3();
  function frontWorld() {
    if (!front.running || front.on < 0.08) return null;
    const ph = Math.max(0, Math.min(1, front.phase));
    const az = ph * TAU + HERO_AZ;
    const r = 6.4 + 1.1 * Math.sin(ph * TAU * 2.3 + 1.0);
    return _front.set(
      RING_C.x + Math.cos(az) * r, -0.5, RING_C.z + Math.sin(az) * r);
  }

  /* ---- Final-leg halation focus fallback (migrated from journey.js, M4:
     the chapter owns its own focal anatomy): the nearest mature ring member
     IN FRONT of the Final rest camera — its own camera.js's 'final-rest'
     key, so the reference can never drift from the authored leg — is the
     frame's focal highlight ("selected fairy-ring highlights", handoff)
     while the travelling front rests. Deterministic; ring members are
     scene-parented and never move. */
  const REST_FOCUS = (() => {
    const rk = CAMERA.keys.find(k => k.note === 'final-rest');
    const cam = rk.pos, dir = rk.tgt.clone().sub(cam).normalize();
    let best = null, score = Infinity;
    const v = new THREE.Vector3();
    for (const m of MEMBERS) {
      v.set(m.x - cam.x, 0, m.z - cam.z);
      if (v.x * dir.x + v.z * dir.z <= 0 || m.m < 0.55) continue;  // behind / immature
      const dd = v.length();
      if (dd < score) { score = dd; best = m; }
    }
    return best ? new THREE.Vector3(best.x, best.gy + best.h * 0.82, best.z) : null;
  })();

  return {
    group,
    nodeIds: [],   // the epilogue has no detail state by design (adr-d6)
    /** T4 streaming seam. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },
    /** journey.js: a nav jump's camera blend is in flight, so the journey's
     *  state and the camera disagree — compose on the camera alone until it
     *  lands. See the block above the animator.
     *
     *  `dstCamX` is the camera x of the pose the blend is travelling TO,
     *  read by journey.js after placeAt has written the destination — it is
     *  the reveal's target for the length of the move (see BLEND_REVEAL_RATE).
     *  Absent (an older caller, or the `false` edge) it is simply not used. */
    /** Told every frame whether the commit glide is carrying the picture.
     *  Cheap and idempotent by design — journey.js calls it unconditionally in
     *  the frame loop rather than on edges, so there is no state to get out of
     *  step with scroll.js. See the `gliding` branch in the animator. */
    setGliding(on) { gliding = !!on; },
    setBlending(on, dstCamX, durS) {
      blending = !!on;
      if (!blending) {
        retiring = false; retireScale = 1; retireEff = 1; bedSpread = false; return;
      }
      if (typeof dstCamX === 'number') blendPull = pullOf(dstCamX);
      /* A DEPARTURE IS A MOVE WHOSE DESTINATION IS DARKER THAN THIS FRAME, and
         it is the only kind that needs the move's length: an arrival is
         clamped by the camera on the way up (slewPull's ceiling) and so is
         already paced by the landing. `shownPull` is null only at boot, before
         anything is lit, which is not a departure. See RETIRE_SPAN. */
      const here = shownPull === null ? pullOf(sceneApi.camera.position.x) : shownPull;
      retiring = blendPull < here - 1e-4;
      retireEff = 1;
      retireScale = 1;
      /* THE BED'S SPREAD IS ARMED BY THE MOVE'S LENGTH AND NOTHING ELSE (§31)
         — the same "has it room" arithmetic the retire uses, and deliberately
         NOT gated on `retiring`, because the bed steps in both directions.
         Cleared with the blend on the `false` edge above (§38): a latched
         `bedSpread` outlived its blend and, once `a0a89f8` gave `lagging` a
         second armer, put the wrap's spread on an ordinary gestured leg. */
      bedSpread = typeof durS === 'number' && durS > 0
        && RETIRE_SPAN * durS > BAND_S;
      if (retiring && typeof durS === 'number' && durS > 0) {
        const window = RETIRE_SPAN * durS;
        if (window > BAND_S) retireScale = BAND_S / window;
      }
    },
    /** Deep-link / frozen-capture snap (journey.js placeAt contract): jump
     *  the eased arm state to its target so a dt=0 ride sees the finished
     *  chapter. Before this, ?capture=final shot the epilogue DARK — amount
     *  never integrated under the frozen clock, so the golden showed the
     *  hero over an unlit floor instead of the composition being gated.
     *
     *  IT MUST NOT TOUCH THE REVEAL DRIVER, and this pass's first build did.
     *  journey.js calls snapChapters() from TWO places: placeAt (a real
     *  placement) and endCamBlend (the LANDING of a travel). Resetting
     *  `shownPull` here therefore fired on every blend landing and discarded
     *  whatever lag was still outstanding — a one-frame pop of up to 0.78 of
     *  pull, the whole ladder at once, which is the reported fault relocated
     *  to the arrival instant rather than fixed. It also made the animator's
     *  convergence branch dead code on the only path that reaches it.
     *  Nothing is lost by leaving it alone: a placement runs placeAt's dt = 0
     *  passes with no blend in flight, and the dt = 0 arm of the animator
     *  assigns `shownPull = pure` outright, so deep links, ?p=, ?pose= and
     *  the frozen ?capture= path stay camera-pure through the branch that was
     *  always going to run anyway (gate G2). */
    /** QA-ONLY PACING READOUT — the arrival ladder, in the units it is
     *  authored in. Five passes on this arrival's pacing have each had to
     *  re-derive the same two numbers by reading constants out of two files
     *  and replicating `drawWOf` in a probe, which is a second copy of the
     *  math in exactly the place doc 18 §13.4 names as a standing hazard.
     *  It is a getter over a build product: no per-frame cost, no state, and
     *  nothing rendered reads it.
     *
     *  Per rung: `reveal` is the body's threshold (the START of its light,
     *  the gap between consecutive ones IS the stagger) and `drawW` its own
     *  window (its light runs s = (pullRaw − reveal)/drawW from 0 to 1, so
     *  drawW IS the per-body kindle). Both in pull units; divide by the
     *  driver's pull/s to get seconds. Tiers 0–2 are the nine ring members,
     *  tier 3 the fifteen field clones — the twenty-four bodies the ladder
     *  is authored over. */
    get pacing() {
      return ring.seats.filter(s => s.tier <= 3)
        .map(s => ({ tier: s.tier, reveal: s.reveal, drawW: drawWOf(s.reveal) }))
        .sort((a, b) => a.reveal - b.reveal);
    },
    snap() { amount = amountTarget; },
    setHot() {},
    nodeWorld() { return null; },
    /** Live growth-front position for the halation focus hint (or null). */
    frontWorld,
    /** The focal source for the lens: the travelling front when it runs,
     *  else the static nearest-member hint at the rest. */
    focusWorld() { return frontWorld() || REST_FOCUS; },
    /** FN-3.1 — closing-CTA hook. Donor trigger names preserved. */
    trigger(name) { if (name === 'ctaPulse' || name === 'ringPulse') fireCta(); },
    /** QA introspection */
    counts: { ...ring.counts, ...terrain.counts, ...sky.counts, ...canopy.counts },
    /** QA: every fruiting body's seat ({x, z, gy, s, reveal, tier}) — the
     *  arrival-pacing measurements (18-one-species.md §12/§13) read the
     *  reveal ladder here instead of recovering each threshold by inverting
     *  frozen uProg samples. A build product, never state: seats are filled
     *  once by placeMushroom and bodies never move. */
    seats: ring.seats,
    /** LIVE QA: the poke's own numbers, read now rather than at construction
     *  (the spread above freezes anything it touches). */
    pickStats: ring.pickStats,
  };
}
