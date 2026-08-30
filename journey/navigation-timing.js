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
 * Intro (mission), Inspire, Connect, Ownership (owned) and Purpose (final).
 * Equip is currently an unavailable placeholder, so it owns no camera route.
 */

export const DEFAULT_NAVIGATION_SPEED = 0.75;

export const NAVIGATION_SPEED = Object.freeze({
  'inspire|mission': 0.60,
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
