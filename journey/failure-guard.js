/** Isolate named journey subsystems while preserving the rest of the frame. */
export function createFailureGuard() {
  const deadSystems = new Set();
  return function guarded(name, fn) {
    if (deadSystems.has(name)) return;
    try { fn(); }
    catch (err) {
      deadSystems.add(name);
      console.error(`[journey] '${name}' threw and was disabled — the ride continues without it:`, err);
    }
  };
}
