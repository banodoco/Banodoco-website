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

function routeKey(fromId, toId) {
  return [fromId, toId].sort().join('|');
}

/** Symmetric speed policy for one selected origin/destination pair. */
export function navigationSpeed(fromId, toId) {
  return NAVIGATION_SPEED[routeKey(fromId, toId)] || DEFAULT_NAVIGATION_SPEED;
}

/** Convert one already-authored camera duration exactly once. */
export function navigationDurationSeconds(baseDuration, fromId, toId) {
  if (!(baseDuration > 0) || !Number.isFinite(baseDuration)) {
    throw new TypeError(`baseDuration must be a positive finite number; got ${baseDuration}`);
  }
  return baseDuration / navigationSpeed(fromId, toId);
}
