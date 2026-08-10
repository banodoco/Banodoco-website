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

export const DEFAULT_STOP = 0.5;      // mid-chapter rest (was REST_POSE)

export const ROUTE = [
  { id: 'mission', span: 14, nav: 'Mission', stops: [0.0], scrollVh: 3.5 },
  { id: 'inspire', span: 24, nav: 'Inspire', scrollVh: 7.5 },
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
  { id: 'connect', span: 22, nav: 'Connect', stops: [0.65], scrollVh: 10.0 },
  { id: 'owned',   span: 25, nav: 'Owned',   scrollVh: 5.0 },
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
  { id: 'final',   span: 15, nav: null,      stops: [0.8], scrollVh: 12.0 },
];

// The authored end-hold: p = 1 is a resolution anchor of its own (a fling to
// the end settles there, never tugged back to the Final rest) and a handheld
// zero. (The footer band used to live against it; the footer is gone —
// navigation redux, 2026-08-09 — and the end-hold stays, because it is the
// route's own full stop, not the footer's.)
export const TERMINAL_P = 1;

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

/** Every rest stop on the route, in order — snap-commit anchors, handheld
 *  zeros and nav landings all read THIS list (plus TERMINAL_P where the
 *  end-hold counts). */
export const REST_STOPS = CHAPTERS.flatMap((c) => c.stops);

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
