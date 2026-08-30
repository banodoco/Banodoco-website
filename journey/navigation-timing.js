/* Button-led journey timing.
 *
 * Values are SPEED multipliers: 0.60 means the camera runs at 60% of its
 * previously authored speed, so duration becomes base / 0.60. Route geometry,
 * easing and arrival choreography stay owned by the existing flight system.
 * Keeping this policy at the final duration seam means a non-adjacent jump is
 * priced once as the route the visitor actually selected; it is never rebuilt
 * from (and never compounds) the adjacent legs crossed numerically en route.
 *
 * The names below are runtime chapter ids. In the visible navigation they are
 * Intro (mission), Inspire, Equip, Connect, Ownership (owned) and Purpose
 * (final). Equip was an unavailable placeholder owning no camera route until
 * 2026-08-30; it owns one now, and the three rows it earned are below.
 *
 * A ROW IS A CHARACTER, NOT A DURATION, and Equip's rows are the clearest case
 * on the table. The base duration a multiplier scales is derived from the path
 * the flight actually takes (journey.js directJumpTo: arc length and azimuth
 * turn), so a longer route is already a longer flight before this file speaks.
 * What these numbers say is how that flight should be READ. Equip's is an
 * excursion the visitor chose to take — around the specimen and in underneath
 * it — and the one thing it must not read as is a hop, so both approaches to
 * it run slower than the default and slower than their own neighbours.
 * Leaving is the one direction that may be brisk: it is the same swing in
 * reverse with nothing new to look at, which is the finding route.js's
 * TRANSIT_S already records for the scrolled half of this leg.
 */

export const DEFAULT_NAVIGATION_SPEED = 0.75;

export const NAVIGATION_SPEED = Object.freeze({
  'inspire|mission': 0.60,
  // The headline move: pressed from the hero, this is the whole fly-around —
  // the front-facing view, around the specimen, in under the cap. It is the
  // longest camera route on the site after the Final pullback and it takes the
  // Mission arrival's own character, because it IS that arrival plus the arc.
  'equip|mission': 0.60,
  'equip|inspire': 0.62,
  'connect|equip': 0.70,
  // Inspire <-> Connect is a two-leg jump since Equip landed between them, and
  // it stays priced HERE rather than being rebuilt out of the two legs it
  // crosses — the file header's rule, and the reason this row does not move:
  // the path it prices got longer, so the flight got longer at the same
  // character, which is what the visitor selected.
  'connect|inspire': 0.80,
  'connect|final': 0.70,
});

/* Directional refinements sit above the symmetric route character. These are
 * relative judgements made against the already-authored speeds: Purpose ->
 * Connect is 70% of 0.70, Connect -> Inspire is 90% of 0.80, and Purpose ->
 * Ownership is 60% of the 0.75 default. Their reverse journeys deliberately
 * retain the established timing. */
export const NAVIGATION_DIRECTION_SPEED = Object.freeze({
  'final>connect': 0.49,
  'connect>inspire': 0.72,
  // Leaving Equip backwards is 110% of the 0.62 arriving speed: the arc
  // played in reverse, with nothing under the cap left to read.
  'equip>inspire': 0.68,
  'final>owned': 0.45,
});

function routeKey(fromId, toId) {
  return [fromId, toId].sort().join('|');
}

/** Resolve one selected direction: one-way refinement, route character, fallback. */
export function navigationSpeed(fromId, toId) {
  return NAVIGATION_DIRECTION_SPEED[`${fromId}>${toId}`]
    || NAVIGATION_SPEED[routeKey(fromId, toId)]
    || DEFAULT_NAVIGATION_SPEED;
}

/** Convert one already-authored camera duration exactly once. */
export function navigationDurationSeconds(baseDuration, fromId, toId) {
  if (!(baseDuration > 0) || !Number.isFinite(baseDuration)) {
    throw new TypeError(`baseDuration must be a positive finite number; got ${baseDuration}`);
  }
  return baseDuration / navigationSpeed(fromId, toId);
}
