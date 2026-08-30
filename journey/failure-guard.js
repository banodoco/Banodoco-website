/** Isolate named journey subsystems while preserving the rest of the frame. */
export function createFailureGuard() {
  const deadSystems = new Set();
  // R3: the 'director' latch used to go dead on its FIRST throw — silently
  // disabling the only p-to-camera writer while everything else kept
  // running. failCounts tracks CONSECUTIVE throws per name; a success
  // clears it back to zero, and only FAILURE_BUDGET throws in a row
  // without an intervening success retires the subsystem.
  const failCounts = new Map();
  const FAILURE_BUDGET = 3;
  return function guarded(name, fn) {
    if (deadSystems.has(name)) return;
    try {
      fn();
      failCounts.delete(name);
    }
    catch (err) {
      const count = (failCounts.get(name) || 0) + 1;
      if (count < FAILURE_BUDGET) {
        failCounts.set(name, count);
        console.error(`[journey] '${name}' threw (${count}/${FAILURE_BUDGET} consecutive) — continuing:`, err);
        return;
      }
      failCounts.delete(name);
      deadSystems.add(name);
      console.error(`[journey] '${name}' threw ${count} times in a row and was disabled — the ride continues without it:`, err);
      /* ...and onto the page's error channel, because a chapter dying
         mid-show is exactly what `?debug=1` exists to show venue staff and
         it is the one failure the overlay could not see: main.js feeds
         `__pageErrors` and the overlay from window 'error', and a throw we
         catch here never reaches window. So we re-announce it there rather
         than opening a second reporting path — main.js's listener stays the
         only reader. The dead-systems latch above means one such
         announcement per subsystem, when it is actually retired — not one
         per frame, and not one per throw inside the budget above. */
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new ErrorEvent('error', {
          message: `[journey] '${name}' threw ${count} times in a row and was disabled: ${(err && err.message) || err}`,
          error: err,
        }));
      }
    }
  };
}
