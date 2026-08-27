import * as THREE from 'three';

/** Own the named animator registry and the single shared-clock render loop. */
export function createAnimationLifecycle({ beforeRender, render }) {
  const animators = new Map();
  let frozenT = null;

  /** Register a per-frame callback `fn(t, dt)` under `name`. Returns a
   *  handle: call it to remove exactly this registration. The handle is
   *  idempotent (safe to call more than once) and scoped to the exact
   *  `fn` it was issued for — if `name` gets re-registered later (see the
   *  same-name note below), an older handle from before that re-registration
   *  does nothing, so it can never remove a newer animator wearing the same
   *  name. A second addAnimator call with the same name replaces the
   *  callback IN PLACE (same Map key, same insertion-order slot) — this is
   *  documented, relied-upon behavior (see organism.js and journey.js) and
   *  is unchanged here. */
  function addAnimator(name, fn) {
    animators.set(name, fn);
    return function removeAnimator() {
      if (animators.get(name) === fn) animators.delete(name);
    };
  }

  /** Start the shared rAF loop. Returns a stop handle: call it to cancel
   *  the pending rAF and end the loop. Idempotent (safe to call more than
   *  once); callers that ignore the return value behave exactly as before. */
  function start() {
    const clock = new THREE.Clock();
    const failed = new Set();
    let prevT = 0;
    let rafId = null;
    let stopped = false;
    function animate() {
      rafId = requestAnimationFrame(animate);
      let t = clock.getElapsedTime();
      let dt = Math.min(0.05, Math.max(0, t - prevT));
      prevT = t;
      if (frozenT !== null) { t = frozenT; dt = 0; }

      for (const [name, fn] of animators) {
        try { fn(t, dt); }
        catch (err) {
          animators.delete(name);
          if (!failed.has(name)) {
            failed.add(name);
            console.error(`[organism] animator '${name}' threw and was disabled — the frame loop continues without it:`, err);
          }
        }
      }

      beforeRender();
      render();
    }
    animate();

    return function stop() {
      if (stopped) return;
      stopped = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  return {
    animators,
    addAnimator,
    start,
    isFrozen: () => frozenT !== null,
    freezeTime(seconds = 0) { frozenT = seconds === null ? null : +seconds || 0; },
  };
}
