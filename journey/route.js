// journey/route.js — THE route manifest (merge doc §2, M4).
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

export const DEFAULT_STOP = 0.5;      // mid-chapter rest (was REST_POSE)

export const ROUTE = [
  { id: 'mission', span: 14, nav: 'Mission', stops: [0.0], scrollVh: 3.5 },
  // scrollVh 7.5 -> 5.6, ALL of it out of the tail (2026-08-11, Hannah's
  // brief item 2 — "make the speed of the transition from Connect to
  // Inspire be a little bit faster"). That travel is the Inspire rest
  // (p 0.26) to the Connect rest (p 0.5230) and it cost 11.31 vh, but only
  // its first stretch is free to trim: the ground-lighting schedule owns
  // p 0.3510 (the network's first draw) onward and was slowed ~3.2x on
  // purpose two passes ago (c77fb00, 0701653) — it keeps its road exactly.
  // So the trim is taken from the chapter's SECOND sub-segment only, where
  // the leg is pure travel with nothing lighting:
  //   · seg 0 (p 0.14..0.26, the Mission -> Inspire arrival) UNCHANGED at
  //     3.5 vh — nobody asked for that half and it does not move;
  //   · seg 1 (p 0.26..0.38) 4.01 -> 2.1 vh.
  // Measured: the whole travel 11.31 -> 9.40 vh (0.83x, 17% faster), of
  // which the pure-travel head p 0.26..0.3510 goes 2.97 -> 1.52 and the
  // network's pre-existence draw-in lead p 0.3510..0.3860 goes 1.27 ->
  // 0.74. The ground lighting itself (LIGHT_LO..LIGHT_HI, p 0.3860 ->
  // 0.5201 — connect/index.js) measures 6.94 -> 7.01 vh, 1.011x: kept.
  // (16-connect-ground-restage.md, 2026-08-11.)
  // seg 1 2.1 -> 3.2 vh (2026-08-14, the SIXTH pass on the Connect ground
  // lighting). Not a change of heart about the 2026-08-11 trim above: that
  // trim was denominated in scroll, and the glide that a released gesture
  // actually rides is now denominated in scroll too (constants.js
  // COMMIT_GLIDE_PX), so this tail is FASTER to a real visitor than the 2.1 vh
  // version was — it used to be spent at a flat p/s, i.e. 48% of the leg's
  // glide time for 24% of its road, and it now costs what it is worth.
  // The 1.1 vh buys the join: Connect's seg 0 below declares a `shape`, and a
  // pinned knot is shared with the segment before it (see the note at the top
  // of this file), so this segment's own mean slope has to land near the pin or
  // it collapses into the join. At 3.2 vh its mean is 3.81e-5 p/px against the
  // pinned 2.31e-5 — a 0.61x handover instead of the 0.36x cliff that leaving
  // it at 2.1 would have forced.
  { id: 'inspire', span: 24, nav: 'Inspire', scrollVh: 6.7, segVh: [3.5, 3.2] },
  // stops [0.65], not the DEFAULT_STOP, and scrollVh 4.5 -> 10.0 (2026-08-10,
  // Hannah's brief items 1-2 — the FIFTH pass on the ground-lighting pace, and
  // the light schedule was reported FULLY SPENT at the fourth (c77fb00):
  // 0.1021 of p was the whole distance between the camera-pure resolve's
  // first draw (p 0.3500) plus its 0.035 pre-existence lead and the frozen
  // rest at p 0.490. Both authorised levers are pulled here, together:
  //   · the rest slides to leg-t 0.65 (p 0.490 -> 0.5230) — the SAME approved
  //     pose (connect/camera.js re-keys the hold to t 0.65; references
  //     re-shot same-commit, byte-checked), which hands the arrival another
  //     0.033 of p that used to belong to the dive. The dive keys re-space
  //     onto the remaining 0.35 of leg (same dive line, same owned keys).
  //   · scrollVh 4.5 -> 10.0 stretches the chapter's wall-clock 2.22x at any
  //     fixed scroll speed.
  //   Net: the ground-lighting arrival runs ~3x its former wall-clock, which
  //   is the "about a third of the current speed" asked for. The same road
  //   also carries brief item 1: the Inspire->Connect travel is now ONE
  //   analytic gesture (connect/camera.js approach()) and the extra scroll
  //   is what lets it breathe. Page cost: +5.5 vh.
  //   scrollVh 10.0 -> 10.15 with an explicit segVh (2026-08-11, the same
  //   brief): the total barely moves, but the SPLIT is now declared rather
  //   than inferred, because the Inspire trim above changes the tangent at
  //   this chapter's opening knot and would otherwise have shifted road
  //   from the ground lighting into the dive. seg 0 (p 0.38..0.5230, the
  //   arrival Hannah slowed and wants kept) holds 7.30 vh — the 7.295 the
  //   shipped spline gave it; seg 1 (0.5230..0.60, the Connect -> Owned
  //   dive, 86883b9's one arc) takes 2.85 so the dive measures 5.12 vh
  //   against its shipped 5.15 — 0.993x, i.e. unchanged.
  //   scrollVh 10.15 -> 17.55, segVh [7.30, 2.85] -> [14.70, 2.85], and seg 0's
  //   `shape` DECLARED (2026-08-14, Hannah's SIXTH request on this pace: "make
  //   the lines that appear on the ground in the connect the community section
  //   appear even slower, one at a time elegantly, they still appear rapidly
  //   and manically"). Every previous pass on this arrival raised scrollVh and
  //   measured the slowdown under a continuous scrub. Measured this time under
  //   a real released gesture, the shipped arrival ran in 1.70 s, because the
  //   commit glide was denominated in p/s and threw the road away — the whole
  //   story is in constants.js COMMIT_GLIDE_PX. With the glide road-denominated
  //   this chapter's scroll finally converts, so it is worth buying, and seg 0
  //   (the arrival Hannah keeps reporting) takes all of it.
  //   `shape` k [2.15, 0.80] is the OTHER half of her ask — "they should get
  //   slower as they go", Hivemind into Discord into ADOS. The three light
  //   windows are near-equal in p (0.0546 / 0.0591 / 0.0546, duration
  //   proportional to each front's reach — connect/index.js), so a deceleration
  //   authored as per-route weights would have to take p from the early routes
  //   to give it to the late ones, which is precisely the trade 0b7ce1c built,
  //   measured and rejected in this chapter for good reasons. Authored as ROAD
  //   it costs nothing: the gain starts at 2.15x this segment's mean and ends
  //   at 0.80x, so early p is cheap and late p is expensive, and the whole
  //   arrival — light, camera and chips together — relaxes as it runs. The
  //   shipped tangents here were [1.964, 1.188], measured on the live spline,
  //   so this is a steepening of a curve that already decelerated, not a new
  //   gesture. Page 46.12 -> 54.62 vh, +8.50.
  { id: 'connect', span: 22, nav: 'Connect', stops: [0.65], scrollVh: 17.55,
    segVh: [14.70, 2.85], shape: { seg: 0, k: [2.15, 0.80] } },
  // scrollVh 5.0 -> 9.27, declared as segVh [2.27, 7.00] with the POST-REST
  // sub-segment's shape pinned (2026-08-12, Hannah: "the move currently reads
  // as two motions, or one motion with two speeds. It feels jilted rather than
  // continuous"). The leg she means is the Owned rest (p 0.725) to the Final
  // rest (p 0.97), and the fault was NOT in the camera.
  //
  // WHAT WAS MEASURED (17-final-field.md 2026-08-12; live traces, both
  // aspects, the scroll spline replicated bit-exactly — worst |Δp| 0 over all
  // 13,392 px). Against its own subject distance the camera path is already
  // ONE envelope: rotation crests at p 0.7888, parallax at p 0.7953, and the
  // combined density crests 88.3 at p 0.792 and decays monotonically to zero
  // at the rest. The scroll did the damage:
  //
  //   · this chapter ran at a mean 50.0 milli-p per vh while the Final
  //     arrival next door runs at 7.06 — a 7.08x step in allocation density,
  //     sitting in the MIDDLE of one continuous camera move;
  //   · `shape` on that arrival pins their shared knot at p 0.85 to 2.219x
  //     the ARRIVAL's mean, i.e. 15.66 mp/vh — only 0.31x of THIS chapter's
  //     own mean. So Owned had to dump its progress early and collapse into
  //     the join: gain 62.2 mp/vh at the rest, 15.7 at p 0.85.
  //
  // The visitor felt exactly that. In 15 equal scroll steps across the leg,
  // the FIRST step covered p 0.725 -> 0.8009 (31% of the leg) and the second
  // reached 0.8483 — the whole underground swing and the surfacing were spent
  // in 2 steps of 15, and the remaining 13 shared what was left. On-screen
  // motion per pixel of scroll spiked to 13.95 and fell to 2.45 within the
  // first 15% of the road: peak-over-plateau 12.6, i.e. two speeds.
  //
  // THE FIX IS ROAD, NOT GEOMETRY. Nothing in the camera, the reveal or the
  // arrival moves. The chapter simply stops spending its whole allocation
  // before the join:
  //   · seg 0 (p 0.60..0.725, the tail of the Connect -> Owned dive) is
  //     declared at 2.27 vh — the 2.27 the shipped spline was already giving
  //     it, so 86883b9's one arc still measures 5.12 vh end to end, its gain
  //     at the Connect rest is the same 23.3, and it gains no trough;
  //   · seg 1 (p 0.725..0.85, the swing Hannah is watching) 2.73 -> 7.00 vh,
  //     which puts its mean at 17.86 mp/vh against the 15.66 it must hand over
  //     at p 0.85 — a level handoff instead of a 3.2x cliff;
  //   · `shape` k0 = 1.6 holds the departure tangent at 28.6 mp/vh. Low enough
  //     that the leg no longer front-loads, high enough that the camera's own
  //     -16% speed dip at the withdraw key (p 0.750) stays masked rather than
  //     surfacing as a hitch — see the residual in 17-final-field.md. k1 =
  //     0.877 is 15.66/17.86, i.e. it ASKS for precisely the value the
  //     arrival's own k0 already pins at that shared knot; the two
  //     declarations agree by design, and the arrival's wins by loop order.
  //
  // Measured after: on-screen motion per pixel goes 0.21 -> 4.64 -> 4.47 ->
  // 4.18 -> 3.12 -> 2.70 -> 2.46 -> 1.82 -> 1.38 -> 0.76 -> ... -> 0. One
  // rise, one broad crest, one monotone decay — peak-over-plateau 12.6 -> 1.89
  // and the worst stall-then-surge anywhere on the leg 1.230 -> 1.038. The 15
  // equal scroll steps now read 0.725 / 0.7644 / 0.794 / 0.8181 / 0.8409 /
  // 0.8649 / 0.8857 / ... — the surfacing takes four steps where it took two.
  //
  // THE ARRIVAL IS UNTOUCHED, and that is checked rather than asserted: the
  // Final arrival's gain curve as a function of distance INTO the segment is
  // bit-identical before and after (worst |Δp| 3.3e-16 over its whole 17.0
  // vh), because its length, its mean slope and both its k values are
  // unchanged. 6282080's 1.99x survives by construction, not by measurement.
  // No p-value, span, stop, camera key, ladder rung or golden moves — only
  // wheel distance, which nothing in portrait.js or owned/leg.js reads.
  // Page 41.85 -> 46.12 vh, +4.27.
  { id: 'owned',   span: 25, nav: 'Owned',   scrollVh: 9.27,
    segVh: [2.27, 7.00], shape: { seg: 1, k: [1.6, 0.877] } },
  // The epilogue is not a sixth peer chapter: it keeps a route (#/final) but
  // no nav entry — the LAST nav'd chapter stays highlighted through it (v6).
  //
  // stops [0.8], not the DEFAULT_STOP (2026-08-09, Hannah's "charging up"):
  // the Final rest moves 0.925 -> 0.97. The old mid-chapter rest left the
  // whole second half of the chapter — p 0.925..1.0, ~675 px of wheel — as a
  // held frame with nothing to hold for (585dad8 removed the recede that used
  // to spend it), while the field's arrival was compressed into ~500 px in
  // front of it. That dead road is now spent ON the arrival: the camera leg's
  // approach stretches to the new rest (chapters/final/camera.js re-times the
  // rest key only — the two travel keys hold, so nothing before p 0.878
  // moves and the Owned colony's leg sampling is untouched), and the arrival
  // ladder is re-authored across it (18-one-species.md §14). The end-hold
  // 0.97..1.0 (~270 px) remains a true hold: p = 1 stays a resolution anchor
  // and renders the rest composition.
  // scrollVh 3.5 -> 6.0 (2026-08-10, Hannah's brief item 3 — the FOURTH
  // pass on this arrival's pacing, and the end-hold road is already spent
  // (336f31d). This is the one lever left that buys real wall-clock
  // without moving a single p-value, camera key, ladder rung or golden:
  // the same p-progression stretches over 1.71x the physical scroll, so
  // the whole kindle sequence — and everything else in the chapter —
  // slows by that factor at any fixed scroll speed.
  // scrollVh 6.0 -> 12.0 (2026-08-10 later, the FIFTH pass — "a quarter
  // the speed on both axes". Same lever, doubled again, as half of the one
  // route allocation planned with the Connect items (EXECUTION.md
  // 2026-08-10): still no p-value, camera key, ladder rung or golden
  // moves. Boundary/span moves were considered and rejected — scroll and
  // p are decoupled by design, so a span change renormalizes every
  // chapter's mapping while buying zero wall-clock; and the arrival
  // already owns ~76% of the chapter's leg, so scrollVh IS the whole
  // overall-axis lever. This delivers 2.0x overall (4x would need
  // ~+18 vh more page for one chapter — declined, recorded in
  // 18-one-species.md §15); the per-body axis gets the rest from
  // clones.js DRAW_W. Page grows 32.0 -> 38.0 vh.)
  // scrollVh 12.0 -> 17.6, declared as segVh [17.0, 0.6] with the arrival's
  // shape pinned (2026-08-11, Hannah's SIXTH request on this moment: "can
  // you make the mushrooms lighting up when I enter the Final section
  // happen a lot slower too"). The fifth pass reported the ask as 4x and
  // delivered 1.86x, and named the page as the bound. The page was not the
  // whole bound — the END-HOLD was. p 0.97..1.0 is a held frame, and it was
  // taking 3.47 vh of the chapter's 12.0 and 29% of every raise on top:
  // that is why scrollVh 12 -> 24 (the fifth pass's lever, doubled again)
  // buys only 1.75x for +12 vh of page. Reclaiming it costs nothing that
  // shows:
  //   · seg 0 (p 0.85..0.97, the whole arrival) 8.53 -> 17.0 vh;
  //   · seg 1 (p 0.97..1.0, the end-hold) 3.47 -> 0.6 vh. It stays a true
  //     hold and p = 1 stays a resolution anchor — a fling to the end still
  //     settles there — it just stops charging the visitor three screens of
  //     wheel for a frame that does not move.
  //   · `shape` holds the arrival's own gain curve while it stretches. The
  //     k values ARE the shipped spline's: measured on it, the arrival's
  //     end tangents were 2.219x and 0.451x its mean slope, and re-imposing
  //     those ratios makes the new curve the old curve scaled. That is what
  //     turns this from a re-timing into a stretch — see the `shape` note
  //     at the top of the file.
  // Measured (live pull curve + the spline, 18-one-species.md §17): the
  // whole progression 8.33 -> 16.61 vh, 1.99x, and EVERY ONE of the 72
  // bodies' charge-and-take windows 1.99x, spread 0.2%. No p-value, camera
  // key, ladder rung, DRAW_W or golden moves — the per-body axis is bought
  // entirely from scroll this time, so §12/§13's "one at a time" is
  // preserved exactly rather than traded against a wider kindling window.
  // Page 38.00 -> 41.85 vh, +3.85, of which 1.9 is paid for by the Inspire
  // trim above.
  { id: 'final',   span: 15, nav: null,      stops: [0.8], scrollVh: 17.6,
    segVh: [17.0, 0.6], shape: { seg: 0, k: [2.219, 0.451] } },
];

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
 * Keys are `'<from>><to>'` in route order; the same entry serves both
 * directions, which is what "and back" asks for. An absent entry means the leg
 * uses the global band, which is what every other leg does today. */
export const TRANSIT_S = {
  // 1.5 s rest to rest, both ways. Measured live: 7.01 s forward / 7.54 s back
  // on the shipped tree, and 3.27 / 3.44 before the glide-unit fix (3daac2e)
  // handed this leg the 24 vh of road it owns. Hannah's baseline when she asked
  // is the 3.27 / 3.44, and she asked for faster than that.
  // The declared time is the CRUISE; the landing brake adds its own tail on top
  // (SNAP_K is denominated in p, so the tail differs by direction — see the
  // residual in 26-scroll-loop.md, 2026-08-14).
  'owned>final': 1.5,
};

/** The declared transit time for the span between two rests, or null if the
 *  span has no entry (then scroll.js uses the global band). Order-insensitive:
 *  one declaration governs both directions. */
export function transitSeconds(lo, hi) {
  const i = REST_STOPS.findIndex(v => Math.abs(v - lo) < 1e-9);
  const k = REST_STOPS.findIndex(v => Math.abs(v - hi) < 1e-9);
  if (i < 0 || k < 0) return null;
  const a = REST_OWNER[Math.min(i, k)], b = REST_OWNER[Math.max(i, k)];
  const v = TRANSIT_S[`${a}>${b}`];
  return v > 0 ? v : null;
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
  const ends = [...c.stops, c.end];
  if (c.segVh.length !== ends.length) {
    console.error('[route]', c.id, 'declares', c.segVh.length, 'segVh entries for',
      ends.length, 'sub-segments (stops + 1) — the spline will be wrong.');
  }
  const sum = c.segVh.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - c.scrollVh) > 1e-9) {
    console.error('[route]', c.id, 'segVh sums to', sum, 'but scrollVh is',
      c.scrollVh, '— the chapter would cost a different distance than it says.');
  }
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

/** The nav entry that should read active at progress p: the chapter itself,
 *  or — for a nav-less chapter like the Final epilogue — the nearest earlier
 *  chapter that has one. Derived, so inserting or renaming chapters never
 *  edits nav code. */
export function navChapterAt(p) {
  const i = CHAPTERS.indexOf(chapterAt(p));
  for (let j = i; j >= 0; j--) if (CHAPTERS[j].nav) return CHAPTERS[j].id;
  return CHAPTERS[0].id;
}

/* ------------------------------------------------------------------ */
/* Shipped-value assert (merge doc M4 gate)                            */
/* ------------------------------------------------------------------ */
// The manifest replaces a hand-authored table; the shipped p-values must be
// IDENTICAL. Recompute-and-compare at module init: the legacy literals of
// the pre-manifest build, checked to float-noise tolerance. Costs a few
// comparisons once per load; shouts in the console if an edit to the spans
// silently moved the shipped route (renormalizing IS allowed — then this
// table is updated deliberately, with the diff in front of the reviewer).
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
  const LEGACY = {
    starts: [0.00, 0.14, 0.38, 0.60, 0.85],
    ends:   [0.14, 0.38, 0.60, 0.85, 1.00],
    // Connect rest 0.5 -> 0.65 of its span (0.490 -> 0.5230): deliberate,
    // 2026-08-10 — the ground-lighting road rebalance (see the ROUTE entry's
    // comment; same pose, references re-shot same-commit).
    rests:  [0.00, 0.14 + (0.38 - 0.14) * 0.5, 0.38 + (0.60 - 0.38) * 0.65,
             0.60 + (0.85 - 0.60) * 0.5, 0.85 + (1.00 - 0.85) * 0.8],
  };
  const TOL = 1e-12;
  let worst = 0;
  CHAPTERS.forEach((c, i) => {
    worst = Math.max(worst,
      Math.abs(c.start - LEGACY.starts[i]),
      Math.abs(c.end - LEGACY.ends[i]),
      Math.abs(c.stops[0] - LEGACY.rests[i]));
  });
  if (worst > TOL) {
    console.error('[route] derived p-values drifted from the shipped table by',
      worst, '— if the manifest was edited deliberately, update the LEGACY',
      'table in route.js; otherwise this is a regression.');
  }
}
