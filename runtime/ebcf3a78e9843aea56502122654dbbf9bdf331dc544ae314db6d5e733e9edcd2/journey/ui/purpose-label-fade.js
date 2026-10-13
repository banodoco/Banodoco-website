// A displayed-frame clock for the two phone Purpose branch names. Geometry
// settles first; this opacity-only crossfade also serves reduced motion.
// Dropped frames cannot spend an entire unseen entrance.
export function createPurposeLabelFade() {
  let value = 0, from = 0, target = 0, elapsed = 0, last = null;
  return {
    reset() { value = from = target = elapsed = 0; last = null; },
    step({ now, show, concealed = false }) {
      const dt = last === null ? 0 : Math.min(1 / 30, Math.max(0, (now - last) / 1000));
      last = now;
      if (concealed) { value = from = target = elapsed = 0; return 0; }
      const next = show ? 1 : 0;
      if (next !== target) {
        from = value; target = next; elapsed = 0;
        return value;
      }
      elapsed += dt;
      const u = Math.min(1, elapsed / (target ? 1.1 : .35));
      value = from + (target - from) * u * u * (3 - 2 * u);
      return value;
    },
  };
}
