// One boundary for recycling and its optical departure. At the ordinary
// drift speed, the last 1.4 world units dissolve over many seconds.
const FADE_DISTANCE = 1.4;
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export function sporeBoundaryDistance(x, y, originX) {
  return Math.min(6.8 - x, 7.6 - y, y - .2, x - originX + 2.5);
}
export function sporeLifetimeOpacity(distance, releaseProgress) {
  return smooth(distance / FADE_DISTANCE) * smooth(releaseProgress);
}
