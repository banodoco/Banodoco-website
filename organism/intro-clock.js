/**
 * Own the intro's wall-clock transform without changing the browser clock.
 * Keeping the ramp on its own rAF callback preserves the existing ordering:
 * the scene renders first, then the acceleration skew is prepared for the
 * following scene frame.
 */
export function createIntroClock({
  now = () => performance.now(),
  requestFrame = callback => requestAnimationFrame(callback),
} = {}) {
  let startedAt = null;
  let accelerated = false;
  let skew = 0;

  function start() {
    if (startedAt !== null) return false;
    startedAt = now();
    return true;
  }

  function elapsedMs() {
    return startedAt === null ? 0 : now() - startedAt + skew;
  }

  function accelerate({ totalMs, rampMs = 480 }) {
    if (accelerated || startedAt === null) return false;
    const rampT0 = now();
    const remaining = Math.max(0, totalMs - (rampT0 - startedAt));
    if (remaining < 200) return false;
    accelerated = true;
    const duration = Math.max(80, rampMs);
    (function ramp() {
      const f = Math.min((now() - rampT0) / duration, 1);
      skew = remaining * (f * f * (3 - 2 * f));
      if (f < 1) requestFrame(ramp);
    })();
    return true;
  }

  return {
    start,
    elapsedMs,
    accelerate,
    get started() { return startedAt !== null; },
  };
}
