/* ==================================================================== *
 * journey/ui/hot-state.js — the hotspot and hover-zone registry, and the
 * one owner of the three-channel hot state (order U02).
 *
 * INVARIANT: the touch-armed node is DERIVED from the records, never
 * stored beside them, so the arm cannot disagree with itself. Every DOM,
 * popover and card effect stays in `journey/ui.js`; the seam is state, not
 * behaviour. Rationale and the rejected wider cuts: ledger entry U02.
 * ==================================================================== */

/** The registry and the state owner. `nodes` and `zones` are handed out BY
 *  IDENTITY — callers iterate and publish the very arrays this owns. */
export function createHotState() {
  const nodes = [];
  const zones = [];
  let seq = 0;

  /** The touch-armed node, or null. At most one is ever armed: `arm` is the
   *  only site that sets the flag true and it disarms the incumbent first. */
  const armed = () => nodes.find((h) => h.armed) || null;

  /** Drop the arm unless it already sits on `except`. The record's own
   *  `refresh` runs the visual, exactly where it ran before. */
  function disarm(except = null) {
    const a = armed();
    if (a && a !== except) { a.armed = false; a.refresh(); }
  }

  return {
    nodes,
    zones,
    armed,
    disarm,

    add(h) { nodes.push(h); return h; },
    addZone(z) { zones.push(z); return z; },

    /** Move the arm to `h`. The caller refreshes `h` itself, so incumbent
     *  before arrival is the order that shipped. */
    arm(h) { disarm(h); h.armed = true; },

    /** Recompute `hot` from its three reasons; true when it MOVED. The
     *  caller's effects hang off that answer, so this is the latch and not
     *  the effect. */
    latch(h) {
      const on = h.hover || h.focused || h.armed;
      if (on === h.hot) return false;
      h.hot = on;
      return true;
    },

    /** Newest hot node wins a tie. Called after the caller's own effect, so
     *  the sequencing `journey/ui.js` shipped is unchanged. */
    rank(h) { if (h.hot) h.hotSeq = ++seq; },

    /** The hot node with the highest rank `want` admits, or null. */
    hottest(want) {
      let best = null;
      for (const h of nodes) {
        if (!h.hot || !want(h)) continue;
        if (!best || h.hotSeq > best.hotSeq) best = h;
      }
      return best;
    },
  };
}
