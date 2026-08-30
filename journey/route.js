// journey/route.js — derived route values (merge doc §2, M4).
import { JOURNEY_SCHEMA } from './structure.js';
//
// One ordered list declares the chapters: their RELATIVE durations, their
// rest stops, their nav anchors, their scroll allocations. Every global
// number that used to be hand-authored twice — chapter p-ranges, snap-commit
// targets, seam positions, nav entries, hash routes — is DERIVED from this
// list. Adding a chapter, a mid-chapter stop, or reordering the ride is an
// edit to this file plus one chapter folder; scroll.js, ui.js and the seams
// never grow per-chapter special cases (merge doc §5).
//
// `span` is a relative duration in integer route units (today: percent, so
// the derived boundaries land on the exact doubles the shipped build used —
// 14/100 is the same IEEE double as the literal 0.14). p-ranges renormalize
// automatically when spans change; nothing downstream is touched by hand.
//
// `stops` are chapter-local rest positions in 0..1 leg time. The FIRST stop
// is the chapter's canonical rest — where nav clicks and deep links land.
// Every stop becomes a snap-commit resolution anchor and a handheld zero.
// Mission's rest is 0 (the frozen hero pose; the camera must not have moved
// when #/mission settles — 06-mission-preservation.md).
//
// `scrollVh` is the scroll distance allocated to the chapter, in viewport
// heights (GB-3; the reasoning for each number is in archive/
// GREYBOX-DECISIONS.md). Deliberately decoupled from `span`: scroll -> p is
// a monotone spline through these allocations (scroll.js), so re-timing a
// camera leg never changes how far the visitor scrolls.
//
// `segVh` (optional) splits that scroll ACROSS THE CHAPTER'S OWN STOPS —
// n stops delimit n + 1 sub-segments, and this array says what each one
// costs (it must sum to `scrollVh`). Until 2026-08-11 the spline's only
// knots were chapter boundaries, so where the scroll landed INSIDE a
// chapter was whatever PCHIP happened to do with the neighbours'
// densities — and it was doing something expensive: the Final chapter's
// end-hold (p 0.97..1.0, a held frame with a `hold: true` camera key and
// nothing to watch) was quietly taking 3.47 of the chapter's 12.0 vh, and
// TAKING A GROWING SHARE OF EVERY RAISE. That is why the fourth and fifth
// passes on the Final arrival bought so little for so much page: measured
// on the shipped spline, scrollVh 12 -> 24 (a 12 vh page cost, for ONE
// chapter) moved the arrival only 1.75x, because the hold absorbed the
// rest. Declaring the split reclaims it: the hold is now 0.6 vh, and
// road bought for the arrival reaches the arrival.
//
// `shape` (optional) pins one sub-segment's two end tangents to fixed
// MULTIPLES of that segment's own mean slope: `{ seg, k: [k0, k1] }`. This
// is what makes a re-allocation a pure STRETCH instead of a re-timing.
// A cubic Hermite whose end tangents scale with its mean slope has an
// identical normalised gain curve however much scroll it is given, so
// every p-interval inside it costs the same MULTIPLE of what it used to —
// which is exactly what "slower, and nothing else changes" has to mean.
// Without it, a knot's tangent comes from its neighbours: pinning only the
// hold knot left the arrival's gain with a TROUGH (it fell to 0.0026 p/vh
// at p 0.95 and rose again into the rest — a stall at the climax, then a
// re-acceleration), and the ladder stretched 1.48x at the openers against
// 2.39x at the closers. With the shape pinned, the per-body spread across
// all 72 bodies is 0.2% (18-one-species.md §17).
//
// A PINNED KNOT IS SHARED WITH THE SEGMENT BEFORE IT, and that is the whole
// story of the 2026-08-12 pass below. scroll.js applies these overrides in
// segment order, writing km at BOTH of a shaped segment's knots, so where two
// adjacent segments both declare `k`, the LATER one wins at the knot they
// share. Pinning a segment's opening tangent therefore dictates the CLOSING
// tangent of its neighbour — and if that neighbour's own mean slope is far
// away from the pinned value, the neighbour has to spend its progress early
// and collapse into the join. That is a scroll-side fault that no amount of
// camera work can reach: a geometrically smooth path over a stepped gain
// still reads as two speeds. Declare the incoming segment's allocation so its
// mean slope lands NEAR the pin, and the join stops being a cliff.

export const DEFAULT_STOP = 0.5;      // mid-chapter rest

// F03 (2026-08-21-elegance-run-01): the commented-out `DOCUMENTED_ROUTE`
// array that used to sit here — a dead, pre-manifest alternative
// construction of the route table, interleaved with a per-chapter tuning
// changelog — is removed. Its final values are proven identical to the
// live, canonical `ROUTE` below (derived from structure.js's
// JOURNEY_SCHEMA.chapters) by tools/fixtures/route-legacy.fixture.mjs.
//
// A fixture that preserves VALUES does not license deleting the RATIONALE
// for those values (R1 review, MAJOR 1). Most of the changelog prose the
// array carried is not lost — every dated entry that cites a doc names one
// that already holds the full version: journey-v6-plan/16-connect-ground-restage.md,
// journey-v6-plan/17-final-field.md, journey-v6-plan/18-one-species.md,
// journey-v6-plan/EXECUTION.md. (journey-v6-plan/06-mission-preservation.md
// and journey-v6-plan/26-scroll-loop.md are cited elsewhere in THIS file —
// the mission-rest note above and the TRANSIT_S note below — not inside the
// deleted array; naming them here was a citation error, corrected.) But
// three dated passages carried reasoning that is NOT written down anywhere
// else in the repo — confirmed by grepping journey-v6-plan/ for their
// measured numbers and finding no match. One of them is the rationale for
// the values Connect ships TODAY. Restored verbatim below, next to the
// chapter each one explains.

// ---- connect: rationale for segVh [8.00, 2.85], shape k [1.10, 1.00] ----
// (structure.js JOURNEY_SCHEMA.chapters, id: 'connect') ----------------------
//
// SEVENTH pass, 2026-08-16 (Hannah — "the 3 ground lights animation feels
// like it stalls the actual motion from continuing"). The fault is where
// the road sat, not the light schedule. ADOS's finale window (p
// ~0.4726..0.5201) plays entirely inside the camera's own landing ramp
// (connect/camera.js trapEase, ramp from p ~0.4757 to the rest), and the k1
// = 0.80 tail made exactly that stretch the most expensive scroll in the
// leg: the last third of seg 0's p — camera braking to zero, particles and
// pulses still gated on full arrival, one light line the only motion — held
// ~45% of 14.70 vh. Scroll stopped converting into anything, which is the
// stall as reported. Three coordinated edits, of which this is the road
// half (the other half is the chips: connect/index.js nodeReveal now lands
// each label with its own light, so the tail owns a narrative beat instead
// of trailing one):
//   · seg 0 14.70 -> 11.50 vh. Six passes of "slower" are respected — the
//     light schedule (LIGHT_LO/HI, OVERLAP, order, one head speed) does not
//     move, and at the glide floor the arrival still reads ~6.9 s against
//     the shipped ~8.9 — but the fraction of that road parked on a
//     near-static frame stops being the plurality of it.
//   · k1 0.80 -> 0.95 releases the parking brake: the finale converts
//     scroll to light-motion near the leg's mean instead of at 0.62x of
//     it, while staying under 1 so the rest is still approached, not hit.
//   · k0 2.15 -> 1.60 spends what the tail gave back on the HEAD, where the
//     camera is at full trapezoid speed — the swing into the chapter stops
//     racing past its own best motion. The declared head slope lands at
//     19.9 mp/vh against the shipped 20.9, so the Inspire seg-1 handover
//     the 2026-08-14 note levelled holds at 0.58x against its shipped
//     0.61x — same class, no new cliff.
//   The mild decelerando of the sixth pass ("slower as they go") survives
//   in shape — 1.60 down to 0.95 still relaxes as it runs — it just no
//   longer ends at a wall. Page 54.62 -> 51.42 vh, -3.20. (segVh at this
//   point: [11.50, 2.85], shape k [1.60, 0.95] — superseded by the EIGHTH
//   pass below, which is what ships today.)
//
// EIGHTH PASS, 2026-08-21 — the pass that produced today's shipped values
// ("still does a kinda stall going into connect then ... a roll through").
// The measured scroll gain across the visible arrival fell 0.0198 -> 0.0100
// p/vh, then rose to 0.0115 at the rest: the exact stall-then-roll shape.
// The declared 2.5 s released transit already owns total duration, so
// shorten only the road and flatten its normalised tangent profile. At
// [8.00, 2.85] / [1.10, 1.00], the same samples stay within 0.0196..0.0173
// and finish at 0.0178 — no trough/re-acceleration, while the light
// schedule, camera path and rest remain position-identical.

// ---- final: rationale for scrollVh's fourth-pass step toward today's 10.6 --
// (structure.js JOURNEY_SCHEMA.chapters, id: 'final') -----------------------
//
// scrollVh 3.5 -> 6.0 (2026-08-10, Hannah's brief item 3 — the FOURTH pass
// on this arrival's pacing, and the end-hold road is already spent
// (336f31d). This is the one lever left that buys real wall-clock without
// moving a single p-value, camera key, ladder rung or golden: the same
// p-progression stretches over 1.71x the physical scroll, so the whole
// kindle sequence — and everything else in the chapter — slows by that
// factor at any fixed scroll speed. (Superseded by later passes — fifth
// through seventh, most with surviving detail in journey-v6-plan/18-one-species.md
// — that carried scrollVh on to today's shipped 10.6.)

export const ROUTE = JOURNEY_SCHEMA.chapters.map((chapter) => {
  const route = {
    id: chapter.id, span: chapter.span, nav: chapter.nav,
  };
  if (chapter.stops) route.stops = chapter.stops;
  route.scrollVh = chapter.scrollVh;
  if (chapter.segVh) route.segVh = chapter.segVh;
  if (chapter.shape) route.shape = chapter.shape;
  return route;
});

// The authored end-hold: p = 1 is a resolution anchor of its own (a fling to
// the end settles there, never tugged back to the Final rest) and a handheld
// zero. (The footer band used to live against it; the footer is gone —
// navigation redux, 2026-08-09 — and the end-hold stays, because it is the
// route's own full stop, not the footer's.)
export const TERMINAL_P = 1;

/* ------------------------------------------------------------------ */
/* TRANSIT — the natural velocity from one section to the next          */
/* ------------------------------------------------------------------ */
/* Hannah, 2026-08-14: "do we have some concept of, like, the terminal
   velocity? You know, the natural velocity to go from one section to another.
   If so, could you make the velocity from the owned by the contributors to the
   final section and back be faster than it currently is."
 *
 * We do, and this is it. When a gesture ends, the commit resolution glides the
 * rest of the way to the next rest at a speed denominated in SCROLL PIXELS per
 * second (constants.js COMMIT_GLIDE_PX / COMMIT_CRUISE_MAX_PX). A leg's transit
 * TIME is therefore its road divided by that speed — which is why a leg that
 * owns a lot of road takes a long time to autoplay even though nothing about
 * its camera changed.
 *
 * This table overrides that for one span, in the unit Hannah actually asked in:
 * SECONDS from rest to rest. Seconds is the right unit and not a convenience —
 * a leg's road is measured in viewport heights, so `spanPx / seconds` re-derives
 * the correct px/s at every viewport size on its own, and the transition takes
 * the same time on a laptop and on a phone.
 *
 * WHY A VELOCITY AND NOT AN ALLOCATION. The obvious way to speed this leg up is
 * to give it less road. It is also the wrong way, twice over: `owned` seg 1
 * holds 7.00 vh because request 83 ("one motion, not two speeds") needed its
 * mean density to land near the Final arrival's pinned handover at p 0.85, and
 * `final` seg 0 holds 17.0 vh because requests 61/77/107 want the field's
 * kindle SLOW. Moving either re-opens a shipped complaint. Declaring a velocity
 * moves NO road at all, so the density profile request 83 fixed is untouched by
 * construction, and the kindle keeps its share of whatever budget is set — it
 * owns 74% of this leg's road, so it still gets 74% of the seconds.
 *
 * Keys are `'<from>><to>'` in route order. A NUMBER serves both directions,
 * which is what "and back" asks for. An OBJECT `{ fwd, back }` declares the
 * two directions separately (2026-08-17, Hannah — the Inspire<->Connect leg
 * wants them different, see the entry below). An absent entry means the leg
 * uses the global band, which is what every other leg does today. */
export const TRANSIT_S = {
  // 2.5 s rest to rest, both ways. History: this leg had no declared transit,
  // so its nominal came from the COMMIT_GLIDE_MAX_S cap — at ~14.7 vh it is
  // the route's biggest road (six passes of ground-lighting slowdown bought
  // it), so the fit rate pinned it to the full 7.5 s while every other leg
  // autoplays in 1.5-2.9 s. 2026-08-16 ("sometimes the scroll is really,
  // really slow") declared 4.0 to lift the released-gesture floor while
  // keeping this the slowest leg; 2026-08-17 ("the terminal speed... feels
  // too slow, it should *want* to go faster") says a floor that merely
  // un-sticks the leg is not enough — the glide should be eager. 2.5 puts it
  // at the top of the band the rest of the route lives in, so it no longer
  // reads as the outlier. Declaring the transit still moves NO road: the
  // light schedule, the shape and a scrubbing finger keep their pacing
  // exactly; only the released-gesture glide changes.
  //
  // SPLIT BY DIRECTION 2026-08-17 (Hannah, same day, after the backward glide
  // went gesture-paced in scroll.js: "scroll backwards from the connect the
  // ecosystem section into inspire the movement still feels REALLY slow").
  // The forward 2.5 is content pacing — the ground-light arrival rides it —
  // and she likes it ("its actually nice going INTO the section"), so it does
  // not move. Backward there is no content to breathe for: the lights un-play
  // by position wherever the camera happens to be, and the ride is just the
  // approach swing run in reverse. 1.6 puts its cruise in the same visual
  // class as the Connect -> Owned dive next door (measured vis ~20 against
  // the dive's ~32 peak, from ~13 at the shared 2.5), which is the punchy
  // departure she keeps contrasting it with.
  //
  // SPLIT IN TWO 2026-08-30, when Equip landed between these two rests. The
  // entry above is the whole history of a leg that no longer exists as one
  // span, and both halves inherit its finding rather than re-deriving it:
  // forward is content pacing and may breathe, backward is the same swing in
  // reverse with nothing to breathe for and wants to be punchy. What changed
  // is the geometry each half now covers — measured camera-path arc length at
  // desktop aspect, against the 9.50 units the retired single leg carried:
  //
  //   inspire > equip   the arc around the specimen and in under the cap
  //   equip > connect   back out from under the cap to the ground panorama
  //
  // Forward figures are set so each half runs at roughly the retired leg's
  // own units-per-second rather than inheriting its seconds wholesale: a
  // longer path given the same clock is a faster camera, which is the one
  // direction six passes of "slower" on the Connect arrival may never move.
  'inspire>equip': { fwd: 2.4, back: 1.6 },
  'equip>connect': { fwd: 2.8, back: 1.8 },
  // 1.5 s rest to rest, both ways. Measured live: 7.01 s forward / 7.54 s back
  // on the shipped tree, and 3.27 / 3.44 before the glide-unit fix (3daac2e)
  // handed this leg the 17.0 vh of road it owns. Hannah's baseline when she asked
  // is the 3.27 / 3.44, and she asked for faster than that.
  // The declared time is the CRUISE; the landing brake adds its own tail on top
  // (SNAP_K is denominated in p, so the tail differs by direction — see the
  // residual in 26-scroll-loop.md, 2026-08-14).
  'owned>final': 1.5,
};

/* Optional landing-tail budgets for FORWARD released-gesture glides.
 *
 * Most arrivals deliberately keep scroll.js's global SNAP_K brake: their
 * final camera easing is short enough that the resulting soft tail reads as
 * part of the settle. Two arrivals are not like that. Their road decelerando,
 * camera trap-ease ramp and last light pass all occupy the same final slice,
 * so the global exponential brake adds a second near-stop exactly where the
 * chapter is still visibly introducing itself. Keep the authored cruise and
 * all position-driven light timing; only bound that extra controller tail to
 * the same proven budget used for reverse glides.
 *
 * READ THE NUMBER AS A DIAL, NOT AS THE DELIVERED TAIL. scroll.js's brakeK
 * solves K from an engage point taken at SNAP_K — "one fixed-point iteration",
 * and it does not run a second — so what actually ships is shorter than what
 * is written here, by a factor that depends on the leg's own cruise. Declared
 * 0.35 delivers 233 ms on Inspire -> Equip and 300 ms on Connect -> Owned.
 * The dial is monotone and the readings below are measurements, not algebra.
 *
 * RE-MEASURED 2026-08-30, and the shape of the re-measurement is the point.
 * Not one constant in this table moved; the ROUTE under it did, and the
 * delivered tails moved with it, because the factor between dial and delivery
 * is the leg's own cruise. All five forward legs, 12-notch flick, on the pure
 * rig (tools/test-declared-conversions.mjs, which recomputes these from
 * SNAP_K and SNAP_DEAD_P with no fitted quantity):
 *
 *                      K_eff   delivered   was
 *   mission>inspire     7.14      283 ms   267 ms   (the leg lost p, not road)
 *   inspire>equip       7.32      233 ms   ——       (new)
 *   equip>connect       8.68      200 ms   183 ms   (the Inspire -> Connect
 *                                                    row, split and re-cruised)
 *   connect>owned       8.32      300 ms   300 ms   (untouched leg, untouched
 *                                                    reading — the control)
 *   owned>final         3.60      917 ms   917 ms   (no budget: the control
 *                                                    the whole table is for)
 *
 * connect>owned reading back at exactly its shipped 300 ms is what says the
 * other four moved because their legs moved and not because the rig did.
 *
 * ENTRIES
 *
 * 'inspire>equip' / 'equip>connect' — 2026-08-17 as one entry, split
 * 2026-08-30 when Equip landed between the two rests. The original was the
 * first of these and the one that named the fault; both halves inherit it
 * unchanged, at the same dial. See the split note under the entries below.
 *
 * 'connect>owned' — 2026-08-24 (DEFECT-04; owner: "the entry animation on the
 * owner thing feels a little janky"). This leg had no entry, and nobody chose
 * that — it was simply the global SNAP_K default, and SNAP_K is denominated in
 * p, so its tail is a ~constant 0.9 s however the leg is paced. Here that lands
 * on a camera whose own ease-out has already taken the picture to a standstill.
 *
 * 'mission>inspire' — 2026-08-25 (owner: "sometimes when I scroll from the
 * first to the second section it moves really slow towards the end").
 * "Sometimes" is exact, and it is the gesture class: only a RELEASED gesture
 * rides the commit glide into this brake — a finger that scrubs all the way
 * in is landed by the servo (SMOOTH_K) and never sees it. Measured at
 * 1440x900 on the virtual clock (tools/trace/brake-tail.py), forward from
 * the Mission rest:
 *
 *                          brake tail  camera <2% of its own peak, at settle
 *   12-notch flick, no entry   783 ms   433 ms — buying 0.17% of a 24.0-u path
 *   gentle release, no entry   700 ms   367 ms — buying 0.09%
 *   sustained scrub (control)     --    100 ms
 *
 * Same violation as the two entries above, and the worst geometry of the
 * three: this is the route's longest camera path (24.0 world units), and
 * INSPIRE_CAM.arrival's trapezoid has its own C2 tail exactly where the
 * exponential creep parks — an eased clock in p spending ~half a second that
 * buys no visible motion. The nav-jump path of this same leg was already
 * cured of exactly this in metric pacing (journey.js buildRoutePace,
 * 2026-08-24); this entry is the scroll path's half of that finding, using
 * the brake's own declared-tail mechanism rather than a new one. 0.35 for
 * the third time: the budget is the class's, not the leg's, and the two
 * shipped entries bracket this leg's cruise geometry. Delivered (measured,
 * not algebra): 283 ms flick / 233 ms gentle, camera <2%-of-peak window
 * 433 -> 167 ms (flick), 367 -> 133 ms (gentle), p settled 367 ms sooner;
 * worst frame-to-frame camera-speed drop through the brake above a
 * 10%-of-peak floor 26.8% (was 13.1%) — inside the shipped band (28.0% on
 * Connect -> Owned, 39.0% on the firmest reverse glide). The scrub control
 * is bit-identical before and after, as it must be: the brake never runs
 * under a live finger. Evidence:
 * docs/code-health/evidence/2026-08-21-elegance-run-01/mission-tail/.
 *
 * Measured at 1440x900 on a virtual clock (tools/trace/brake-tail.py), one
 * released 12-notch wheel flick from the Connect rest; vt ms from boot:
 *
 *                        K_eff  brake tail  camera still  p settled  DEAD BEAT
 *   before (no entry)     3.61      967 ms          1883       2317     433 ms
 *   after  (0.35)         8.32      300 ms          1700       1867     167 ms
 *   equip>connect fwd     8.68      200 ms          2483       2617     133 ms
 *
 * WHY 0.35 AND NOT A NUMBER FITTED TO THIS LEG. The two legs' geometry really
 * does differ — Connect's approach segment is 8.00 vh against Owned's 2.27, and
 * the cruise brakeK derives its engage point from is 0.202/1.35 = 0.150 p/s here
 * against 0.263/2.5 = 0.105 p/s there — so the same dial does NOT deliver the
 * same tail. It was still kept, on the measurement: the dead beat lands 2 frames
 * off the boundary that already has this treatment, which is the same class, and
 * every shorter value is bought with jerk. Worst frame-to-frame drop in camera
 * speed through the brake, above a 10%-of-peak floor: 12.4% before, 28.0% at
 * 0.35, 39.2% at 0.25, 47.6% at 0.20 — against 25.9% on Inspire -> Connect
 * forward and 39.0% on its backward glide, which is the firmest thing shipping.
 * 0.25 would close the last 50 ms and spend the whole remaining jerk budget to
 * do it; 0.20 would overspend it. The full ladder is in
 * docs/code-health/evidence/2026-08-21-elegance-run-01/defect-04/.
 *
 * WHAT THIS DOES NOT FIX, and what is not the brake's to fix. The copy still
 * finishes breathing in ~1.1 s after the picture stops — 1120 ms after, against
 * 1034 ms before. That number gets slightly WORSE here by construction and the
 * direction is not a regression: the picture now lands 183 ms sooner while
 * COPY_IN_K (2.4/s) is wall-clock and does not compress when the tail does, so
 * the same breathe starts from a nearer standstill. The residual is not this
 * leg's: Inspire -> Connect, which has had this treatment for a week, measures
 * 1083 ms on the same rig. It is the copy envelope's authored breathe — copy
 * that is speed-gated on the p-servo rather than timed against the camera the
 * way the nav-jump envelope is — and moving it is a deliberate design change in
 * journey/ui/copy-arrival.js, not a side effect of a landing-tail budget.
 *
 * 'inspire>equip' / 'equip>connect' — 2026-08-30, when Equip split the
 * 'inspire>connect' entry described above. 0.35 for the fourth and fifth
 * time, and for the reason the Mission entry already gives: THE BUDGET IS
 * THE CLASS'S, NOT THE LEG'S. Both halves are arrivals whose camera ends on
 * the same authored trapezoid ease-out the retired leg ended on, so both
 * inherit the same exponential creep parked on a picture that has already
 * stopped. Neither is fitted; the two shipped entries either side of them
 * bracket their cruise geometry exactly as they bracketed Mission's. */
export const FORWARD_BRAKE_TAIL_S = {
  'mission>inspire': 0.35,
  'inspire>equip': 0.35,
  'equip>connect': 0.35,
  'connect>owned': 0.35,
};

/* Desktop-only FORWARD speed limits for the four opening transitions.
 *
 * These are minimum rest-to-rest times, not raw p/s guesses. scroll.js
 * measures the authored progress span between the two rests, then derives:
 *
 *     max displayed speed = rest-to-rest progress / seconds
 *
 * That is the relative-distance calculation: a leg twice as long in route
 * progress gets twice the p/s ceiling for the same minimum time. The cap is
 * applied to the controller's FINAL displayed rate, so it covers both a live
 * scrub and a hard released glide; the natural cruise can remain below it.
 *
 * The table is deliberately separate from TRANSIT_S. Those values are the
 * cross-device natural cruises; these are true caps for a fine-pointer
 * desktop resolution. Touch keeps the shipped band exactly. Only `fwd` is
 * declared because the request is route-order travel; reverse pacing remains
 * untouched.
 *
 * Relative to the current 0.45 p/s desktop maximum, the resulting minimum
 * full-span times are:
 *   mission -> inspire  0.58 s -> 1.80 s  (3.12x calmer)
 *   inspire -> equip    (see below)
 *   equip   -> connect  (see below)
 *   connect -> owned    0.45 s -> 1.35 s  (3.01x calmer)
 *
 * Those are ceilings, not forced durations: the existing road-denominated
 * cruises remain free to run more slowly. Camera-path sampling at desktop
 * aspect measured the legs at 24.03 / 9.50 / 8.68 world units respectively;
 * Hero therefore gets the longest minimum, while Connect -> Owned keeps a
 * deliberately slower editorial class despite its similar physical arc.
 *
 * 2026-08-30: Equip splits the 9.50-unit 'inspire>connect' row in two. Its
 * 0.75 s was the shortest minimum on the table because its arc was the
 * shortest; the two halves are each LONGER than it was, so inheriting 0.75
 * would have made a longer path finish in the same time, i.e. a faster
 * camera. Re-derived at the retired row's own 12.7 units/s, re-measured on
 * the built gesture (tools note in chapters/equip/camera.js). */
export const DESKTOP_TRANSIT_CAP_S = {
  'mission>inspire': { fwd: 1.80 },
  'inspire>equip': { fwd: 1.00 },
  'equip>connect': { fwd: 1.25 },
  'connect>owned': { fwd: 1.35 },
};

function namedTransitSeconds(table, lo, hi, dir = 0) {
  const i = REST_STOPS.findIndex(v => Math.abs(v - lo) < 1e-9);
  const k = REST_STOPS.findIndex(v => Math.abs(v - hi) < 1e-9);
  if (i < 0 || k < 0) return null;
  const a = REST_OWNER[Math.min(i, k)], b = REST_OWNER[Math.max(i, k)];
  let v = table[`${a}>${b}`];
  if (v && typeof v === 'object') v = dir < 0 ? v.back : v.fwd;
  return v > 0 ? v : null;
}

/** The declared transit time for the span between two rests, or null if the
 *  span has no entry (then scroll.js uses the global band). `dir` is the
 *  travel direction in p (+1 toward hi, -1 toward lo); a plain-number entry
 *  ignores it, an `{ fwd, back }` entry picks its side by it. Callers that
 *  do not know the direction (or pass 0) get the forward figure. */
export function transitSeconds(lo, hi, dir = 0) {
  return namedTransitSeconds(TRANSIT_S, lo, hi, dir);
}

/** A forward-only landing-tail budget for the span, or null. */
export function forwardBrakeTailSeconds(lo, hi, dir = 0) {
  if (dir < 0) return null;
  return namedTransitSeconds(FORWARD_BRAKE_TAIL_S, lo, hi, dir);
}

/** Desktop-only minimum transit time for a capped span, or null. */
export function desktopTransitCapSeconds(lo, hi, dir = 0) {
  return namedTransitSeconds(DESKTOP_TRANSIT_CAP_S, lo, hi, dir);
}

/* ------------------------------------------------------------------ */
/* Derivation — the ONLY place p-ranges are computed                    */
/* ------------------------------------------------------------------ */
const TOTAL = ROUTE.reduce((a, c) => a + c.span, 0);

export const CHAPTERS = (() => {
  let acc = 0;
  return ROUTE.map((c) => {
    const start = acc / TOTAL;
    acc += c.span;
    const end = acc / TOTAL;
    const stopsLocal = c.stops && c.stops.length ? c.stops : [DEFAULT_STOP];
    return {
      id: c.id,
      start,
      end,
      nav: c.nav,
      scrollVh: c.scrollVh,
      segVh: c.segVh || null,
      shape: c.shape || null,
      // chapter-local rest fractions, and their absolute p positions.
      // rest-p arithmetic is exactly the shipped restProgress() formula, so
      // the derived doubles are bit-identical to the pre-manifest build.
      stopsLocal,
      stops: stopsLocal.map((s) => start + (end - start) * s),
      rest: stopsLocal[0],
    };
  });
})();

export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

/** THE SCROLL SPLINE'S KNOT LIST — one entry per sub-segment, in route order.
 *
 *  Until 2026-08-11 scroll.js built its knots straight from CHAPTERS, so a
 *  chapter was one segment and the only knots were chapter boundaries. It now
 *  reads this instead, so a chapter that declares `segVh` contributes one knot
 *  per stop as well. A chapter that declares nothing yields exactly one
 *  segment ending at its own `end` — bit-identical to the old list, which is
 *  why Mission and Owned are untouched by this change.
 *
 *  `end`  the p this segment finishes at (a chapter boundary, or a rest stop)
 *  `vh`   its scroll allocation
 *  `k`    optional [k0, k1] tangent multipliers for THIS segment's two knots,
 *         as multiples of its own mean slope (see `shape` at the top).
 */
export const SEGMENTS = CHAPTERS.flatMap((c) => {
  if (!c.segVh || c.segVh.length < 2) {
    return [{ id: c.id, end: c.end, vh: c.scrollVh, k: null }];
  }
  // sub-segment i runs to stop i, and the last one to the chapter's end.
  // DEF-04 (F03, 2026-08-21-elegance-run-01): this used to carry two
  // console.error guards here — a segVh/stops count-mismatch check and a
  // segVh/scrollVh sum-mismatch check. Both are removed: structure.js's
  // validateJourneyStructure() (called unconditionally at structure.js's
  // own module top level, before this module's body can run, per ES
  // module import-evaluation order) now hard-validates both of those exact
  // invariants on the raw manifest and throws before CHAPTERS/SEGMENTS —
  // derived purely from JOURNEY_SCHEMA.chapters with no alternate
  // construction path — are ever built. Reachability proof (isolated,
  // out-of-repo, both branches) and the equivalence fixture are in
  // tools/fixtures/route-def04.fixture.mjs and
  // docs/code-health/evidence/2026-08-21-elegance-run-01/f03/def04-reachability/.
  const ends = [...c.stops, c.end];
  return c.segVh.map((vh, i) => ({
    id: c.id, end: ends[i], vh,
    k: c.shape && c.shape.seg === i ? c.shape.k : null,
  }));
});

/** Every rest stop on the route, in order — snap-commit anchors, handheld
 *  zeros and nav landings all read THIS list (plus TERMINAL_P where the
 *  end-hold counts). */
export const REST_STOPS = CHAPTERS.flatMap((c) => c.stops);

/** The chapter id owning each entry of REST_STOPS, index for index. Used by
 *  transitSeconds() so a transit can be declared by name ('owned>final')
 *  rather than by a pair of p-literals that would silently mean something else
 *  the next time a span or a stop moves. */
export const REST_OWNER = CHAPTERS.flatMap((c) => c.stops.map(() => c.id));

export function chapterAt(p) {
  for (const c of CHAPTERS) if (p <= c.end) return c;
  return CHAPTERS[CHAPTERS.length - 1];
}

export function localProgress(p, c) {
  const t = (p - c.start) / (c.end - c.start);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

const byId = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));

export function startOf(id) { return byId[id] ? byId[id].start : 0; }
export function endOf(id) { return byId[id] ? byId[id].end : 0; }

/** Where a nav click or deep link lands: the chapter's FIRST declared stop. */
export function restProgress(id) {
  const c = byId[id];
  return c ? c.stops[0] : 0;
}

/* ------------------------------------------------------------------ */
/* The hero's place on the route                                       */
/* ------------------------------------------------------------------ */
/* WHICH CHAPTER IS THE HERO IS A DECLARED PROPERTY, NOT A P-LITERAL.
 *
 * "We are at, or near, the hero" was written three separate ways and derived
 * from nothing: an ownership threshold `p > 0.0008` in journey.js (compared
 * twice), a presence envelope opening at `p - 0.006` in the same file, and
 * `CHAPTERS[1]` in rail.js standing for "the chapter after the hero". Each
 * was correct only while the hero happened to be first on the route with its
 * rest at exactly zero — and each had to be found separately by someone who
 * already knew it existed.
 *
 * structure.js already says which chapter it is, once, in the only place the
 * question is actually answered: `copySurface.host: 'hero'` — the chapter
 * whose copy IS the hero's markup rather than a block the UI builds. Order
 * U04 converted the `id === 'mission'` string tests in journey/ui.js onto
 * that property; these two exports finish the job for the numbers.
 *
 * WHAT THIS DOES AND DOES NOT UNIFY. It publishes the ANCHOR — where the
 * hero sits — and nothing else. The distances the three sites keep from that
 * anchor (0.0008, 0.006, and the rail's own chapter-end boundary) are three
 * different authored quantities and stay where they are authored, exactly as
 * journey/seams.js keeps its own `startOf('connect') + 0.06` shape. Folding
 * them into one shared threshold would make three unrelated decisions move
 * together the first time any one of them was retuned.
 */
export const HERO_CHAPTER_ID = (() => {
  const heroes = JOURNEY_SCHEMA.chapters.filter((c) => c.copySurface && c.copySurface.host === 'hero');
  // Loud at module init, in the posture the shipped-value assert below already
  // sets for this file. A silent miss would hand every consumer restProgress's
  // unknown-id fallback of 0 — which is the hero's rest TODAY, so the defect
  // would reproduce the current values perfectly and surface only on the route
  // where it matters.
  if (heroes.length !== 1) {
    throw new Error(`[route] the route must declare exactly one hero chapter `
      + `(copySurface.host === 'hero'); found ${heroes.length}`
      + `${heroes.length ? `: ${heroes.map((c) => c.id).join(', ')}` : ''}`);
  }
  return heroes[0].id;
})();

/** The hero's frozen pose, in route progress — its first declared stop.
 *  Zero today, because Mission opens the route and rests at its own start;
 *  the point of the name is that nothing downstream has to know that. */
export const HERO_REST_P = restProgress(HERO_CHAPTER_ID);

/** Where the hero's leg ends and the ride proper begins. Identical BY
 *  CONSTRUCTION to the next chapter's `start` — CHAPTERS accumulates one
 *  `acc / TOTAL` and hands the same double to this chapter's `end` and the
 *  next one's `start` — so this is the same boundary the rail used to reach
 *  positionally, said in terms of the hero instead of an index. */
export const HERO_END_P = endOf(HERO_CHAPTER_ID);

/* ------------------------------------------------------------------ */
/* Shipped-value assert (merge doc M4 gate)                            */
/* ------------------------------------------------------------------ */
// The manifest replaces a hand-authored table; the shipped p-values must be
// IDENTICAL. Recompute-and-compare at module init: the legacy literals of
// the pre-manifest build, checked to float-noise tolerance. Costs a few
// comparisons once per load; THROWS at module init if an edit to the spans
// silently moved the shipped route (renormalizing IS allowed — then this
// table is updated deliberately, with the diff in front of the reviewer).
//
// It throws rather than logging because the LEGACY table below IS the escape
// hatch the sentence above describes, and it only works as one if skipping it
// is impossible: a maintainer who moves a span deliberately says so by
// editing LEGACY in the same diff, and the throw goes away. A console.error
// let the same edit ship unannounced — and this guards the higher-stakes
// invariant of the two here, since journey/portrait.js and
// chapters/owned/leg.js hang absolute-p literals off these spans (see the
// note in the block below). Same module-init phase and same posture as
// structure.js's validateJourneyStructure(), and the same direction DEF-04
// took above — its two console.error guards are gone because that validator
// now throws for their invariants. This one has no validator to hand it to,
// so it does the throwing itself.
{
  // NOT UPDATED by the 2026-08-11 re-allocation, deliberately, and that is the
  // headline of that change: `span` and `stops` were not touched, so every
  // derived p is the same double it was. scrollVh/segVh/shape move WHEEL
  // distance only. This matters beyond the assert — journey/portrait.js and
  // chapters/owned/leg.js both carry absolute p literals (portrait keys at
  // p 0.040/0.622/0.700/0.725; leg.js LEG_P0 0.660, LEG_P1 0.872, UG_P0/P1,
  // REST_P 0.725), and the Owned colony is BUILT from samples over
  // LEG_P0..LEG_P1. A span move would have silently re-pointed all of it at
  // the wrong route; a scroll move cannot, because nothing in either file is
  // a function of scroll. Verified after the edit: this assert silent, and
  // the owned@* goldens byte-identical.
  //
  // Final rest 0.5 -> 0.8 of its span (0.925 -> 0.97): deliberate, 2026-08-09
  // — the arrival-road rebalance (see the ROUTE entry's comment). Every other
  // value is the shipped table, unchanged.
  // EQUIP ARRIVES (2026-08-30). The route grows a sixth chapter between
  // Inspire and Connect, so every derived p from 0.14 to 0.38 renormalises
  // and this table is updated deliberately, in the same diff, exactly as the
  // sentence above requires. What moved and what did not:
  //
  //   · The boundary at 0.38 and EVERYTHING above it is bit-identical.
  //     Equip's 12 units come entirely out of Inspire's 24, so connect,
  //     owned and final keep their spans, their stops and their p-ranges to
  //     the last bit. That is not thrift: journey/portrait.js and
  //     chapters/owned/leg.js hang absolute-p literals off those spans
  //     (0.622 / 0.700 / 0.725, LEG_P0 0.660, LEG_P1 0.872), and
  //     chapters/connect/index.js's LIGHT_LO/HI are leg-local fractions of a
  //     span that has not moved. A rebalance that touched 0.38+ would have
  //     silently re-pointed all of it.
  //   · The INSPIRE REST moves 0.26 -> 0.20, and that is the one shipped
  //     p-value this change spends. It is spent for the copy system: two
  //     rests need ~0.10 of p between them before their COPY_BANDS (rest
  //     +/- offsets, each with a 0.020 fade skirt) stop overlapping, and
  //     Inspire at 0.26 with Equip at 0.32 leaves 0.06 — two copy blocks
  //     cross-fading over each other at 50%. Inspire at 0.20 opens the gap
  //     to 0.12 and every band closes cleanly again.
  //   · NO CAMERA POSE MOVES WITH IT. Every leg is authored in leg-local or
  //     gesture-local time (chapters/<id>/camera.js), so the Mission ->
  //     Inspire arrival is the same gesture over a shorter p; the pose AT
  //     the Inspire rest is still INSPIRE exactly, and inspire@* / mission@*
  //     are unchanged. `scrollVh` is re-split to keep the arrival's
  //     viewport-heights-per-gesture flat (mission 3.5 -> 4.9, inspire seg 0
  //     3.5 -> 2.1): the mission/inspire knot now falls at gesture u 0.70
  //     instead of u 0.538, so holding the old vh would have front-loaded
  //     the swing and parked the tail.
  const LEGACY = {
    starts: [0.00, 0.14, 0.26, 0.38, 0.60, 0.85],
    ends:   [0.14, 0.26, 0.38, 0.60, 0.85, 1.00],
    // Connect rest 0.5 -> 0.65 of its span (0.490 -> 0.5230): deliberate,
    // 2026-08-10 — the ground-lighting road rebalance (see the ROUTE entry's
    // comment; same pose, references re-shot same-commit).
    rests:  [0.00, 0.14 + (0.26 - 0.14) * 0.5, 0.26 + (0.38 - 0.26) * 0.5,
             0.38 + (0.60 - 0.38) * 0.65,
             0.60 + (0.85 - 0.60) * 0.5, 0.85 + (1.00 - 0.85) * 0.8],
  };
  const TOL = 1e-12;
  /* CARDINALITY FIRST, and it is not decoration. The order that derived the hero anchors measured that this
     guard was blind to the exact scenario it exists for: insert a chapter before
     Mission and every shipped p renormalises (mission.end 0.14 -> 0.2182), yet
     `LEGACY.starts[5]` is `undefined`, `c.start - undefined` is NaN, and
     `NaN > TOL` is FALSE — so the throw never fires. A length change is a
     deliberate act by definition; it gets its own sentence rather than being
     laundered through a comparison that cannot see it. */
  if (CHAPTERS.length !== LEGACY.starts.length) {
    throw new Error(`[route] the manifest now declares ${CHAPTERS.length} chapters, `
      + `the shipped table ${LEGACY.starts.length} — every derived p has renormalised. `
      + 'Update the LEGACY table in route.js in the same diff, with the diff in front '
      + 'of a reviewer; there is no drift small enough to make this safe.');
  }
  let worst = 0;
  CHAPTERS.forEach((c, i) => {
    worst = Math.max(worst,
      Math.abs(c.start - LEGACY.starts[i]),
      Math.abs(c.end - LEGACY.ends[i]),
      Math.abs(c.stops[0] - LEGACY.rests[i]));
  });
  if (worst > TOL) {
    throw new Error(`[route] derived p-values drifted from the shipped table by ${worst
      } — if the manifest was edited deliberately, update the LEGACY table in route.js `
      + 'in the same diff; otherwise this is a regression.');
  }
}
