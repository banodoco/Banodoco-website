/** Isolate named journey subsystems while preserving the rest of the frame. */
export function createFailureGuard() {
  const deadSystems = new Set();
  return function guarded(name, fn) {
    if (deadSystems.has(name)) return;
    try { fn(); }
    catch (err) {
      deadSystems.add(name);
      console.error(`[journey] '${name}' threw and was disabled — the ride continues without it:`, err);
      /* ...and onto the page's error channel, because a chapter dying
         mid-show is exactly what `?debug=1` exists to show venue staff and
         it is the one failure the overlay could not see: main.js feeds
         `__pageErrors` and the overlay from window 'error', and a throw we
         catch here never reaches window. So we re-announce it there rather
         than opening a second reporting path — main.js's listener stays the
         only reader. The latch above means one announcement per subsystem,
         not one per frame. */
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new ErrorEvent('error', {
          message: `[journey] '${name}' threw and was disabled: ${(err && err.message) || err}`,
          error: err,
        }));
      }
    }
  };
}
