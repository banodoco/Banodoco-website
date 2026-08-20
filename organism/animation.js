import * as THREE from 'three';

/** Own the named animator registry and the single shared-clock render loop. */
export function createAnimationLifecycle({ beforeRender, render }) {
  const animators = new Map();
  let frozenT = null;

  function addAnimator(name, fn) {
    animators.set(name, fn);
    return () => animators.delete(name);
  }

  function start() {
    const clock = new THREE.Clock();
    const failed = new Set();
    let prevT = 0;
    function animate() {
      requestAnimationFrame(animate);
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
  }

  return {
    animators,
    addAnimator,
    start,
    isFrozen: () => frozenT !== null,
    freezeTime(seconds = 0) { frozenT = seconds === null ? null : +seconds || 0; },
  };
}
