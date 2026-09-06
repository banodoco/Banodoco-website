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
    /* `remaining < 200` REJECTS A SHORT RAMP BUT NOT A POISONED ONE. Both
       guards above are NaN-transparent: Math.max(0, NaN) is NaN, and every
       comparison against NaN is false, so a NaN totalMs walks straight
       through this line, sets `skew` to NaN for the life of the page, and
       makes elapsedMs() return NaN forever. What that costs is not a wrong
       animation — it is a RENDER CRASH, every frame, and a silent one:
       intro.js's draw progress feeds the stem clip plane's constant, three
       uploads the clipping planes as `uniform vec4 clippingPlanes[N]`, and
       WebGLUniforms' flatten() tests for "is this a number" with
       `firstElem <= 0 || firstElem > 0` — which NaN fails. flatten then
       treats the NaN as an object and calls `.toArray()` on it, throwing
       `firstElem.toArray is not a function` inside RenderPass every frame
       (the Round 7 regression: "The interactive journey could not load").
       Neither `npm run check` nor browser-smoke can see it — live-journey's
       interaction timeout masks a per-frame render throw — so the guard has
       to be here, at the door. Requiring a finite number costs one call and
       closes the class. */
    if (!Number.isFinite(remaining) || remaining < 200) return false;
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
