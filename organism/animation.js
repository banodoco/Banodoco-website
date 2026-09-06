import * as THREE from 'three';

/** Own the named animator registry and the single shared-clock render loop. */
export function createAnimationLifecycle({ beforeRender, render }) {
  const animators = new Map();
  let frozenT = null;
  let renderEnabled = true;
  /* THE SECOND GATE ON THE SAME RENDER, AND IT IS A SEPARATE BINDING ON
     PURPOSE. `renderEnabled` belongs to main.js's WebGL context-loss pair;
     this one belongs to the document's visibility and is owned here. Two
     booleans ANDed at the gate compose without either owner having to know
     about the other — one shared flag would let a tab that came back into
     view resume rendering into a context that is still lost. */
  let pageVisible = true;

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
    // R3: a single throw no longer condemns an animator outright — the
    // 'journey' animator IS the ride (scroll, camera, chapters, UI), so a
    // one-frame stumble used to end it for the rest of the page's life.
    // failCounts tracks CONSECUTIVE throws per name; a success (including
    // the very next frame's) clears it back to zero, and only
    // FAILURE_BUDGET throws in a row without an intervening success
    // retires the animator.
    const failCounts = new Map();
    const FAILURE_BUDGET = 3;
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
        try {
          fn(t, dt);
          failCounts.delete(name);
        }
        catch (err) {
          const count = (failCounts.get(name) || 0) + 1;
          if (count < FAILURE_BUDGET) {
            failCounts.set(name, count);
            console.error(`[organism] animator '${name}' threw (${count}/${FAILURE_BUDGET} consecutive) — continuing:`, err);
          } else {
            failCounts.delete(name);
            animators.delete(name);
            console.error(`[organism] animator '${name}' threw ${count} times in a row and was disabled — the frame loop continues without it:`, err);
          }
        }
      }

      /* THE COMPOSER IS GATED HERE; THE LOOP AND THE ANIMATORS ARE NOT, AND
         THE ASYMMETRY IS THE POINT. A lost WebGL context still accepts
         composer.render() and still costs the whole frame (measured: 181
         composer renders across 3 s of forced loss), so the render is what
         has to stop. Cancelling the rAF instead would stop the SHARED CLOCK
         being observed, and the elapsed jump on resume lands past the
         resolution governor's calibration window (organism/performance.js) —
         which then calibrates off the 50 ms dt clamp floor and REMEMBERS the
         lower pixel ratio for this display on every future visit. A GPU
         hiccup lasting two seconds must not leave the site permanently
         softer. Animators keep running for the same reason: they are what
         keeps dt honest. */
      if (renderEnabled && pageVisible) {
        beforeRender();
        render();
      }
    }
    /* A HIDDEN TAB PAYS FOR NOTHING, and the gate is here rather than on the
       rAF for the reason the comment above already gives at length: parking
       the loop stops the shared clock being observed and the elapsed jump on
       resume lands past the resolution governor's calibration window, which
       then remembers a permanently softer page for this display. Every
       current engine already suspends rAF for a hidden document, so on the
       normal path this gate never fires. It exists for the paths where that
       is not true — a window occluded but still scheduling, a bfcache entry
       restored into a background tab, an engine that throttles to 1 Hz
       instead of stopping — where the composer would otherwise charge a full
       frame for a picture nobody is looking at. Registered inside start()
       and taken back off by the stop handle below, so this file's attach and
       detach counts move together. */
    const doc = typeof document === 'undefined' ? null : document;
    const onVisibility = () => { pageVisible = !doc.hidden; };
    if (doc && doc.addEventListener) {
      pageVisible = !doc.hidden;
      doc.addEventListener('visibilitychange', onVisibility);
    }
    animate();

    return function stop() {
      if (stopped) return;
      stopped = true;
      if (doc && doc.removeEventListener) {
        doc.removeEventListener('visibilitychange', onVisibility);
      }
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
    /** Gate the per-frame `beforeRender()`/`render()` pair. `false` stops
     *  both while the rAF loop, the shared clock and every animator keep
     *  running — see the note at the gate for why the loop stays up. This is
     *  NOT freezeTime(): that one parks the clock for the capture tooling and
     *  leaves the composer rendering every frame. */
    setRenderEnabled(on) { renderEnabled = !!on; },
  };
}
