// journey/layout/rail-geometry.js — THE RAIL'S ONE MEASUREMENT OWNER (U05).
//
// THE PIPELINE, NAMED (G3). Two slots, each an immutable snapshot, each with
// exactly ONE write site, each published once per invalidation of its own
// clock. Consumers hold the reference, never mutate it, and never re-measure.
//
//   slot        what it is                     invalidated by        published by
//   ----------  -----------------------------  --------------------  ------------
//   dock        the rail's SETTLED docked       the viewport, or an   publishDock()
//               rectangle — where the strip     explicit invalidate()
//               comes to rest, derived from
//               the page logo it aligns to
//   exclusion   the rail's PAINTED silhouette   the rail repainting   publishPainted()
//               this frame — the union of the   (once per frame,
//               live slot boxes plus the        after the write)
//               active ring's halo
//
// WHAT A CONSUMER MAY ASSUME.
//
//   * The object it holds is frozen and will never change under it. A new
//     `revision` means a new object; the old one stays valid as the answer
//     for the epoch it was taken in.
//   * `revision` is a per-slot integer that only increases, and it increases
//     ONLY when that slot is republished. Keying a downstream solve off it is
//     therefore exactly "re-solve when, and only when, the geometry moved".
//   * `viewport` is the viewport the snapshot was measured in. A consumer that
//     finds it stale must not patch the rectangle — it must ask again.
//   * `rect` is UNPADDED and UNPOLICED. Air, clearance and halo choices belong
//     to the question being asked, not to the measurement; `railBox()` below
//     derives a padded box from a snapshot without going near the DOM.
//
// WHY THE DOCK IS NEVER MEASURED FROM THE RAIL. Reading the live rail to
// find it would make every consumer of the dock follow whatever animation
// the rail happens to be playing — the exact scroll-time warp U05 removed.
// The dock used to borrow the page logo as its animation-invariant anchor;
// since the centred-row restage (2026-08-26) it needs no element at all:
// the row's rectangle is pure arithmetic on the viewport (rowLayout below),
// which is animation-invariant by construction.
//
// WHY THE TWO SLOTS ARE ONE OWNER AND NOT TWO. They are one question asked
// twice — "where is the navigator on screen" — and the responsive constants
// that answer it (the compact scale, the mark's 24 px centre, the slot pitch)
// are the same constants in both. They lived in two files before this module
// and drifted apart in exactly the way duplicated measurement always does:
// `journey/rail.js` positioned the dock and `chapters/connect/index.js`
// reconstructed it, each with its own copy of the table and its own
// `getBoundingClientRect()` on the same element.

import { CONTENT } from '../../content/content.js';
import { PHONE_FINAL_COMPOSITION_LIFT_PX } from './final-composition.js';

/** The active chapter marker paints a 22 px shadow OUTSIDE its DOM box. A
 *  measurement that stops at the box is not the painted silhouette, so this
 *  correction belongs to the measurement and not to any caller's pad. */
export const RAIL_ACTIVE_HALO_PX = 22;

/* ==========================================================================
   THE CENTRED ROW (owner's navigation restage, 2026-08-26)
   ==========================================================================
   The navigator is a bottom-centre row of circles: three MAJOR items
   (Inspire / Equip / Connect) flanked by a MINOR first and last (Intro /
   Epilogue), every circle on ONE horizontal centre line, dotted rules
   between neighbours. WHICH items the row holds is content's declaration
   (content/content.js `navigator.items` — the row is not the chapter list
   any more); HOW BIG they are and WHERE the row sits is this module's,
   because two consumers must agree on it to the pixel: journey/rail.js
   paints the travelling ring and connector fills in this coordinate frame,
   and the dock consumers below (Connect's ground placement, Owned's
   recompose clock, the scene mask) must know the same rectangle without
   re-measuring the DOM.

   The dock therefore stops being derived from the page logo: the old strip
   settled at the lower-left against the logo's x, and the logo was the one
   animation-invariant anchor for that. The centred row is its own anchor —
   pure arithmetic on the viewport — which is stronger still: no element to
   query, nothing that can be mid-animation. */

/** The row's item list, as content declares it. Frozen here so every
 *  consumer iterates the same object. */
export const NAV_ROW_ITEMS = Object.freeze(
  ((CONTENT.navigator && CONTENT.navigator.items) || []).map(it => Object.freeze({ ...it })),
);

/** The row's responsive constants, keyed by the same band table as
 *  everything else in this file. One table, here — CSS reads these numbers
 *  through the custom properties journey/rail.js publishes on its root, so
 *  the stylesheet cannot drift from the frame JS paints in. */
export function rowMetrics(w, h) {
  const { phone, tablet } = bandOf(w, h);
  /* THE QUIET ROW (owner's design review, 2026-08-26). No containing
     circles any more — `major`/`minor` are HIT-TARGET boxes, not drawn
     diameters: the visible object is the glyph alone (core three ~26px of
     ink, bookends ~16px), sitting directly on the scene like the root
     network's own lit nodes. The gap is air between hit boxes; the row is
     deliberately a small cluster, not a bar. */
  return {
    major: phone ? 40 : tablet ? 42 : 44,   // the three core hit boxes
    minor: phone ? 34 : tablet ? 36 : 40,   // the two bookend hit boxes
    majorRingD: phone ? 30 : tablet ? 34 : 36,
    minorRingD: phone ? 24 : tablet ? 26 : 28,
    // One optical clearance for every hairline endpoint: top-row rings,
    // the Purpose dot, the branch split and the two child rings.
    connectorAir: phone ? 5 : tablet ? 5 : 6,
    gap: phone ? 20 : tablet ? 28 : 36,     // air between hit boxes
    // The ordinary journey seat. Purpose adds its own camera-projected lift;
    // keeping that delta separate prevents the subtree's clearance from
    // silently moving the hero and every other chapter.
    centreFromBottom: phone ? 70 : tablet ? 84 : 92,
    // Purpose's lower-left copy now carries a third desktop sub-line. Lift
    // the complete Purpose row/tree clear of that fixed copy seat while the
    // ordinary journey row keeps its established baseline.
    // The Purpose/final instrument sits five pixels lower on phones as one
    // composition; the row and subtree both consume this shared lift.
    purposeLift: phone ? 45 + PHONE_FINAL_COMPOSITION_LIFT_PX : tablet ? 52 : 66,
    // Ink scale per tier, as a multiple of the authored ~24px symbol
    // boxes: ~21.5px of core ink inside the 36px drawn circles, ~20px
    // bookend glyphs. THE LIVE HALF OF A TWIN — site.css's preboot
    // defaults must state the same numbers, because the shell paints from
    // the stylesheet until rowFrame() publishes these, and a mismatch IS
    // a visible size jump ~100ms after load (measured 2026-08-27 on the
    // virtual clock: sym 27.65px -> 33.18px at vt 133ms while this table
    // still said 1.08 against the stylesheet's 0.9 — owner: "the icon
    // also jumps up in size after the page loads").
    majorFit: phone ? 0.85 : 0.9,
    minorFit: phone ? 0.72 : 0.83,
  };
}

/** The row laid out for a viewport: per-item diameters and centre-x offsets
 *  (from the row's own left edge), the row's total width, and where the row
 *  sits on screen. Pure arithmetic — no DOM. */
export function rowLayout(w, h) {
  const m = rowMetrics(w, h);
  const dia = NAV_ROW_ITEMS.map(it => (it.size === 'minor' ? m.minor : m.major));
  const ringDia = NAV_ROW_ITEMS.map(it =>
    (it.size === 'minor' ? m.minorRingD : m.majorRingD));
  const centres = [];
  let x = 0;
  dia.forEach((d, i) => {
    centres.push(x + d / 2);
    x += d + (i < dia.length - 1 ? m.gap : 0);
  });
  return Object.freeze({
    major: m.major, minor: m.minor,
    majorRingD: m.majorRingD, minorRingD: m.minorRingD,
    connectorAir: m.connectorAir, gap: m.gap,
    purposeLift: m.purposeLift,
    majorFit: m.majorFit, minorFit: m.minorFit,
    dia: Object.freeze(dia),
    ringDia: Object.freeze(ringDia),
    centres: Object.freeze(centres),
    width: x,
    left: (w - x) / 2,
    centreY: h - m.centreFromBottom,
  });
}

/** WHICH RESPONSIVE BAND A VIEWPORT IS IN. One table, here — and since
 *  DEFECT-01 (2026-08-23) that sentence is true of the PREDICATES too, not
 *  only of the dock constants keyed to them.
 *
 *  `journey/rail.js`'s own Mission-pose arithmetic carried a second copy of
 *  `portrait && w <= 620` / `<= 900`, in the same file that imports this one.
 *  It now calls this. That leaves ONE copy still outstanding — `getMode()` in
 *  `main.js`, which is do-not-touch for this order and is recorded as such in
 *  the report rather than quietly forked again.
 *
 *  Exported as the predicates rather than as a band NAME because the two
 *  callers ask different questions of it: this module wants three constants
 *  keyed to the band, the rail wants the booleans themselves for its hero
 *  offsets. A name would only be unpacked back into these two flags. */
export function bandOf(w, h) {
  const portrait = h > w;
  const phone = portrait && w <= 620;
  const tablet = portrait && w <= 900;
  return { portrait, phone, tablet };
}

/** The dock slot: the settled navigator rectangle, published once per
 *  viewport.
 *
 *  PAGE-SCOPED ON PURPOSE. There is one rail and one viewport, and the
 *  answer does not depend on which rail instance is asking — Connect has
 *  no rail handle to be given one through. The factory exists so a harness
 *  can drive it with doubles; production shares the singleton below.
 *
 *  SINCE THE CENTRED ROW the rectangle is rowLayout()'s own bounding box:
 *  the navigator no longer travels between a hero pose and a docked one, so
 *  "where the strip WILL settle" and "where the strip IS" are the same
 *  answer, derived from the viewport alone. The logo measurement this used
 *  to make is gone with the lower-left dock it anchored.
 *
 *  @param {object}   [io]
 *  @param {Function} [io.view]  the viewport, as `{ w, h }`.
 */
export function createRailDock({
  view = () => ({ w: window.innerWidth, h: window.innerHeight }),
} = {}) {
  let latest = null;
  let revision = 0;
  let stale = true;

  /** Drop the published dock. The next reader gets a freshly measured one.
   *  B03's responsive page-layout owner is the intended caller: it may
   *  invalidate this owner, and it publishes no competing snapshot. */
  function invalidate() { stale = true; }

  /** THE ONE WRITE SITE for the dock slot. */
  function publishDock(w, h) {
    const row = rowLayout(w, h);
    revision += 1;
    stale = false;
    latest = Object.freeze({
      revision,
      viewport: Object.freeze({ w, h }),
      rect: Object.freeze({
        left: row.left,
        right: row.left + row.width,
        // The top of the tallest circle on the shared centre line.
        top: row.centreY - row.major / 2,
      }),
      /* The row does not shrink after the hero any more; the field is kept
       * so no consumer's contract changes shape. */
      scale: 1,
    });
    return latest;
  }

  /** The settled dock for the current viewport. Measures only when its epoch
   *  is stale, so a per-frame caller pays one measurement per resize. */
  function dock() {
    const { w, h } = view();
    if (!stale && latest && latest.viewport.w === w && latest.viewport.h === h) return latest;
    return publishDock(w, h);
  }

  return { dock, invalidate };
}

/** The page's dock. Imported by `journey/rail.js`, which paints toward it, and
 *  by `journey/chapters/connect/index.js`, which solves a world placement
 *  against it. Neither measures; both read. */
export const railDock = createRailDock();

/** The exclusion slot: the rail's painted silhouette, published once per
 *  repaint. Rail-instance scoped, because it reads that rail's own DOM.
 *
 *  @param {object}  io
 *  @param {Element} io.root  the rail's root element.
 */
export function createRailExclusion({ root }) {
  let latest = null;
  let revision = 0;

  /** THE ONE WRITE SITE for the exclusion slot.
   *
   *  WRITE -> MEASURE -> PUBLISH. The caller has just written the rail's
   *  layout for this frame; this reads it back once and freezes the answer.
   *  Every consumer downstream reads the frozen answer, so no two of them can
   *  disagree about where the navigator was on the same frame, and none of
   *  them touches rail DOM during frame drive. */
  function refresh() {
    revision += 1;
    /* The halo is measured only when there is a silhouette for it to grow,
     * which is also the only case any caller can use it in. Measuring it
     * unconditionally would put a layout read on the frame where the
     * navigator is not reserving space at all. */
    const rect = measure();
    latest = Object.freeze({
      revision,
      viewport: Object.freeze({ w: window.innerWidth, h: window.innerHeight }),
      rect,
      halo: rect ? measureHalo() : null,
    });
    return latest;
  }

  /** Does this element put ink on the screen at all? A box is not a
   *  silhouette: `display:none`, `visibility:hidden` and a transparent opacity
   *  each leave the layout rectangle exactly where it was and paint nothing
   *  into it. ONE predicate, asked of every level of the navigator, because a
   *  hidden ancestor hides its descendants' ink and not their boxes. */
  function paints(el) {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden'
      && Number(cs.opacity || 1) > 0.01;
  }

  /** The union of what the navigator actually paints, or null when it is not
   *  in chapter layout at all — or is not painting. Mission's under-copy
   *  layout is intentionally not reserved.
   *
   *  WHY THE ROOT AND THE LIST ARE ASKED THE SLOTS' OWN QUESTION (defect-03,
   *  2026-08-24). The slot union has always tested paintedness; the list's own
   *  rectangle was pushed in unconditionally, and the root was never consulted.
   *  So a navigator hidden WHOLE — `.j-rail{visibility:hidden}`, which is both
   *  what tools/capture.py writes before every shutter and what the mobile
   *  sheet writes while it covers the rail — went on reserving its rectangle
   *  wherever the list happened to have a box of its own, and stopped
   *  reserving it wherever the list's box was 0x0. Measured at the Owned rest:
   *  on the desktop strip the list is 304x70, so the exclusion survived the
   *  hide and the mask kept deleting the face under the dock; in the phone's
   *  transformed fan the list is 52x0, so it did not. That is one mask
   *  disagreeing with itself per aspect — and, through capture.py, ten goldens
   *  that could not see a face the live page was eating (or vice versa).
   *  An unpainted navigator covers nothing, at every aspect. */
  function measure() {
    if (!root || root.dataset.layout !== 'chapter' || !paints(root)) return null;
    const list = root.querySelector('.j-rail-list');
    if (!list || !paints(list)) return null;
    const r = list.getBoundingClientRect();
    /* The responsive column/fan uses transformed, out-of-flow slots, so the
       list itself legitimately has a 0x0 box. Union the painted slots instead
       of treating that box as proof that the navigator is absent. */
    const painted = [...list.querySelectorAll('.j-rail-slot')].flatMap((el) => {
      const b = el.getBoundingClientRect();
      return b.width && b.height && paints(el) ? [b] : [];
    });
    if (r.width && r.height) painted.push(r);
    if (!painted.length) return null;
    return Object.freeze({
      left: Math.min(...painted.map(b => b.left)),
      right: Math.max(...painted.map(b => b.right)),
      top: Math.min(...painted.map(b => b.top)),
      bottom: Math.max(...painted.map(b => b.bottom)),
    });
  }

  /** The active marker's box, already grown by the shadow it paints outside
   *  it. Null when the marker is absent or unpainted. */
  function measureHalo() {
    const ring = root.querySelector('.j-rail-active-ring');
    if (!ring) return null;
    const a = ring.getBoundingClientRect();
    if (!(a.width && a.height)) return null;
    return Object.freeze({
      left: a.left - RAIL_ACTIVE_HALO_PX,
      right: a.right + RAIL_ACTIVE_HALO_PX,
      top: a.top - RAIL_ACTIVE_HALO_PX,
      bottom: a.bottom + RAIL_ACTIVE_HALO_PX,
    });
  }

  /** The snapshot last published, or null before the first repaint. */
  function snapshot() { return latest; }

  return { refresh, snapshot };
}

/** The padded exclusion box a caller is entitled to, derived from a snapshot
 *  and nothing else. PURE: no DOM, no clock, no state. The pad is the
 *  caller's policy — how much air ITS thing needs — and the halo is a
 *  question about which silhouette it must clear.
 *
 *  @param {object|null} snap             a snapshot from `createRailExclusion`.
 *  @param {number}      pad              air outside the silhouette, in px.
 *  @param {boolean}     [includeHalo]    clear the active marker's glow too.
 *  @returns {object|null} `{left,right,top,bottom}`, or null when the
 *           navigator is not reserving space at all.
 */
export function railBox(snap, pad, includeHalo = false) {
  if (!snap || !snap.rect) return null;
  const r = snap.rect;
  const h = includeHalo ? snap.halo : null;
  const left = h ? Math.min(r.left, h.left) : r.left;
  const right = h ? Math.max(r.right, h.right) : r.right;
  const top = h ? Math.min(r.top, h.top) : r.top;
  const bottom = h ? Math.max(r.bottom, h.bottom) : r.bottom;
  return { left: left - pad, right: right + pad, top: top - pad, bottom: bottom + pad };
}
