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
  { id: 'connect', span: 22, nav: 'Connect', scrollVh: 4.5 },
  { id: 'owned',   span: 25, nav: 'Owned',   scrollVh: 5.0 },
  // The epilogue is not a sixth peer chapter: it keeps a route (#/final) but
  // no nav entry — the LAST nav'd chapter stays highlighted through it (v6).
  { id: 'final',   span: 15, nav: null,      scrollVh: 3.5 },
];

// The authored end-hold: p = 1 is a resolution anchor of its own (a fling to
// the end settles there, never tugged back to the Final rest) and a handheld
// zero. The footer band lives against it (ui-footer.js).
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
  const LEGACY = {
    starts: [0.00, 0.14, 0.38, 0.60, 0.85],
    ends:   [0.14, 0.38, 0.60, 0.85, 1.00],
    rests:  [0.00, 0.14 + (0.38 - 0.14) * 0.5, 0.38 + (0.60 - 0.38) * 0.5,
             0.60 + (0.85 - 0.60) * 0.5, 0.85 + (1.00 - 0.85) * 0.5],
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
