// journey/ui/card-layout.js — WHERE THE CARD GOES (U05).
//
// Projection, collision and the placement ladder, as PURE FUNCTIONS over
// values. Nothing in here reads the DOM, the clock, the camera or any state:
// hand it a projected anchor, a measured box, a viewport and the navigator's
// exclusion rectangle, and it answers with a side and a coordinate. The
// caller does the measuring and the writing.
//
// WHY THAT SPLIT. `placeCard()` used to be one 81-line function that measured
// the card, re-measured the rail, projected the anchor, walked the ladder and
// wrote four style properties — and its two coordinates were reassigned three
// times each on the way through. The decision and the write are different
// jobs: the decision is arithmetic that a test can ask directly, and the
// write is a DOM effect whose order matters. Separated, the decision has no
// mutable state at all — every branch returns.
//
// THE ANCHOR IS PROJECTED THROUGH A HANDED-IN `project`, NEVER A CAMERA.
// `journey/ui.js` publishes a per-frame geometry with the projection already
// bound to the settled, jitter-free camera it just read (see `frameGeom`
// there). This module therefore does not know what a camera is, and cannot
// grow a second projection path that drifts out of step with the chips.

/** Clearance between the node's own disc and the card's box. Wider than
 *  POP_GAP (12) because the thing being cleared here is a lit face with an
 *  ember ring and a fray, not a 9 px dot. */
export const CARD_GAP = 16;
/** Hard minimum from any viewport edge. */
export const CARD_MARGIN = 12;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Do two screen rectangles overlap? `b` may be absent, which is "no". */
export function rectHits(a, b) {
  return !!b && a.right > b.left && a.left < b.right
    && a.bottom > b.top && a.top < b.bottom;
}

/** Where the card's subject is on screen this frame, and how big it draws.
 *  null when there is no anchor at all; `behind` when the node is on the
 *  far side of the lens, which is the one case with no honest direction to
 *  point in. Off-frame but in front is NOT null — the point is clamped to
 *  the frame edge, so the card meets the visitor at the edge the person is
 *  beyond rather than jumping back to a corner that means nothing.
 *
 *  @param {object|null} cardAnchor  the hotspot whose node the card belongs to.
 *  @param {object|null} geom        the frame geometry `{ project, tanHalf,
 *                                   viewDepth }` published by `update()`.
 *  @param {object}      view        `{ w, h }`, the viewport in CSS pixels.
 */
export function anchorPoint(cardAnchor, geom, view) {
  if (!cardAnchor || !geom || typeof cardAnchor.world !== 'function') return null;
  const w = cardAnchor.world();
  if (!w) return null;
  const v = geom.project(w.clone());
  if (v.z > 1) return { behind: true };
  /* No `|| 0` on the call. U06 investigated this as one of U05b's three
     dead-code candidates and found it REDUNDANT rather than dead: `wr` is
     consumed only by `wr > 0` and by the multiplication that guard protects,
     and every falsy a `radius()` can return — 0, undefined, NaN, null, '' —
     already fails `wr > 0` identically. Driven over the whole falsy set, all
     six produced a byte-identical anchor. Removing it removes an arm no input
     can distinguish, which is the honest close on an uncovered branch.
     `portraits.radiusOf` really does return 0 for an unknown id
     (chapters/owned/portraits.js:1317), so the ZERO case is live; it is the
     OPERATOR that never mattered. */
  const wr = cardAnchor.radius ? cardAnchor.radius() : 0;
  const scaled = wr > 0
    ? wr * (view.h * 0.5) / (Math.max(0.05, geom.viewDepth(w)) * geom.tanHalf)
    : 24;
  // The same ceiling the hit pads take: a foreground face that fills a
  // sixth of the frame does not get to push the card a sixth of the frame
  // away from itself.
  const r = Math.max(14, Math.min(56, scaled));
  const x = (v.x * 0.5 + 0.5) * view.w;
  const y = (-v.y * 0.5 + 0.5) * view.h;
  const cx = Math.min(Math.max(x, CARD_MARGIN + r), Math.max(CARD_MARGIN + r, view.w - CARD_MARGIN - r));
  const cy = Math.min(Math.max(y, CARD_MARGIN + r), Math.max(CARD_MARGIN + r, view.h - CARD_MARGIN - r));
  return { x: cx, y: cy, r, offFrame: cx !== x || cy !== y };
}

/** The ladder. Each rung is admitted only if the whole box fits, and each
 *  of the four is DISJOINT from the node's disc by construction — so the
 *  clamp on the other axis can never slide the card over its own subject.
 *
 *  BESIDE-FIRST (2026-08-18, Hannah: "the name should show next to the
 *  image", "make the card feel cohesive with it"). The old ladder tried
 *  above/below first, which floated the label into the copy over the
 *  person's head; a name reads as belonging to a face when it stands
 *  BESIDE it, museum-label fashion. Right before left because the frame's
 *  reading direction is left-to-right: face, then name.
 *
 *  @param {object}      a        an `anchorPoint` result with x / y / r.
 *  @param {object}      box      the card's measured `{ width, height }`.
 *  @param {object}      view     `{ w, h }`, the viewport in CSS pixels.
 *  @param {object|null} railBox  the navigator's exclusion rectangle.
 *  @returns {{side: string, x: number, y: number}}
 */
export function resolveCardPlacement(a, box, view, railBox) {
  const xCentred = clamp(a.x - box.width / 2, CARD_MARGIN,
    Math.max(CARD_MARGIN, view.w - CARD_MARGIN - box.width));
  const yCentred = clamp(a.y - box.height / 2, CARD_MARGIN,
    Math.max(CARD_MARGIN, view.h - CARD_MARGIN - box.height));
  const aboveY = a.y - a.r - CARD_GAP - box.height;
  const belowY = a.y + a.r + CARD_GAP;
  const rightX = a.x + a.r + CARD_GAP;
  const leftX = a.x - a.r - CARD_GAP - box.width;
  const fits = (x, y) => x >= CARD_MARGIN && y >= CARD_MARGIN
    && x + box.width <= view.w - CARD_MARGIN && y + box.height <= view.h - CARD_MARGIN
    && !rectHits({ left: x, right: x + box.width, top: y, bottom: y + box.height }, railBox);
  const fit = [
    ['right', rightX, yCentred],
    ['left', leftX, yCentred],
    ['above', xCentred, aboveY],
    ['below', xCentred, belowY],
  ].find(([, x0, y0]) => fits(x0, y0));
  if (fit) return { side: fit[0], x: fit[1], y: fit[2] };

  // Nowhere fits whole — a card taller than the room above AND below and
  // wider than the room either side. Take the roomier of above/below and
  // clamp into the frame: staying READABLE and on-screen outranks staying
  // clear, and this is the only rung that can overlap.
  const roomAbove = a.y - a.r, roomBelow = view.h - (a.y + a.r);
  const side = roomAbove >= roomBelow ? 'above' : 'below';
  const y = clamp(side === 'above' ? aboveY : belowY, CARD_MARGIN,
    Math.max(CARD_MARGIN, view.h - CARD_MARGIN - box.height));
  // Last-resort clamping still honours the chrome lane. Prefer lifting
  // above it; if the card is too tall, move wholly to its right.
  if (railBox && rectHits({ left: xCentred, right: xCentred + box.width, top: y, bottom: y + box.height }, railBox)) {
    const lifted = railBox.top - CARD_GAP - box.height;
    if (lifted >= CARD_MARGIN) return { side, x: xCentred, y: lifted };
    return {
      side,
      x: Math.min(Math.max(railBox.right + CARD_GAP, CARD_MARGIN),
        Math.max(CARD_MARGIN, view.w - CARD_MARGIN - box.width)),
      y,
    };
  }
  return { side, x: xCentred, y };
}

/** Where the node is IN THE CARD'S OWN BOX, so the contact filament can be
 *  a short segment pointing at the person rather than a rule along the
 *  whole edge. It matters most in exactly the case the edge rule would
 *  fail: a node near a frame edge whose card has been clamped sideways, so
 *  the card's centre is no longer over its subject. */
export function filamentOffset(a, placed, box) {
  return {
    fx: clamp(a.x - placed.x, 12, Math.max(12, box.width - 12)),
    fy: clamp(a.y - placed.y, 12, Math.max(12, box.height - 12)),
  };
}
