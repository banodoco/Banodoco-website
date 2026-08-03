// Canonical journey state - the ONE source of truth for where the visitor is.
// Adapted from journey/core/journeyState.js (donor). Differences, all forced
// by v6 / D1 / the grey-box scroll model (W3-A):
//
//   * five chapters, no Equip range (ranges live in ../constants.js)
//   * it does NOT create a scroll spacer and does NOT read window.scrollY.
//     The hero page is `overflow:hidden` with no scroll surface, and that must
//     not change. The grey-box drives progress from a VIRTUAL scroll surface
//     (core/scroll.js) which pushes deltas in through setProgress(); the state
//     itself stays a pure smoothing + routing owner.
//   * smoothed progress is speed-limited (MAX_SCRUB_RATE) so a flung scroll
//     takes the same accelerated path instead of teleporting past frames.
//   * routing normalises the retired Equip routes (adr-d6-routes.md) and
//     delegates the decision of HOW to travel to the host (fly vs jump vs
//     stay put), because that is a camera concern, not a state concern.
//
// It owns no DOM, creates no elements, and starts no frame loop.

import {
  CHAPTERS, CHAPTER_IDS, chapterAt, localProgress, restProgress,
} from './route.js';
import {
  SMOOTH_K, SMOOTH_K_FLIGHT, FLIGHT_BASE_S, FLIGHT_SPAN_S, MAX_SCRUB_RATE,
} from './constants.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createJourneyState({ onNavigate = null, onFlightCancel = null } = {}) {
  let p = 0;          // smoothed progress - what the camera will read
  let rawP = 0;       // instantaneous target
  let flight = null;  // { from, to, t, dur }
  let suppressRoute = 0;

  function cancelFlight() {
    if (!flight) return;
    flight = null;
    if (onFlightCancel) onFlightCancel();
  }
  // Manual scroll intent cancels a nav flight immediately (GB-3.5). These are
  // capture-phase so they fire even though the input shield stops propagation
  // to the canvas.
  window.addEventListener('wheel', cancelFlight, { capture: true, passive: true });
  window.addEventListener('touchmove', cancelFlight, { capture: true, passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) cancelFlight();
  }, { capture: true });

  /* ---------------- routing ---------------- */
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    let [chapter, node] = h.split('/').filter(Boolean);
    chapter = chapter || null;
    node = node || null;
    // retired chapter -> normalise, never a dead route
    if (chapter && !CHAPTER_IDS.includes(chapter)) return { chapter: null, node: null, unknown: chapter };
    if (node === '2rp') node = 'tworp';             // display name vs id
    if (chapter === 'final') node = null;           // the epilogue has no detail state
    return { chapter, node, unknown: null };
  }

  function writeRoute(chapterId, nodeId, { push = false } = {}) {
    const h = nodeId ? `#/${chapterId}/${nodeId}` : `#/${chapterId}`;
    if (location.hash === h) return;
    suppressRoute++;
    if (push) history.pushState(null, '', h);
    else history.replaceState(null, '', h);
    // pushState/replaceState do not fire hashchange, but a queued one from an
    // earlier user gesture might still land; release on the next task.
    setTimeout(() => { suppressRoute--; }, 0);
  }

  window.addEventListener('hashchange', () => {
    if (suppressRoute > 0) return;
    const r = parseHash();
    if (r.unknown) { history.replaceState(null, '', '#/mission'); return; }
    if (!r.chapter) return;
    // Back out of a detail inside the current chapter must not yank the
    // camera; the host decides fly vs jump for a real chapter change.
    r.sameChapter = chapterAt(p).id === r.chapter;
    if (onNavigate) onNavigate(r);
  });

  /* ---------------- travel ---------------- */
  function flyTo(targetP) {
    const dur = FLIGHT_BASE_S + FLIGHT_SPAN_S * Math.abs(targetP - rawP);
    flight = { from: rawP, to: targetP, t: 0, dur };
  }

  function setProgress(v) { rawP = clamp01(v); }

  /** Place progress with no travel at all (deep links: place, never replay). */
  function snapTo(v) { rawP = clamp01(v); p = rawP; flight = null; }

  function jumpToChapter(id) { snapTo(restProgress(id)); }

  function update(dt) {
    if (flight) {
      flight.t += dt;
      const f = Math.min(flight.t / flight.dur, 1);
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      rawP = clamp01(flight.from + (flight.to - flight.from) * e);
      if (f >= 1) flight = null;
    }
    const k = flight ? SMOOTH_K_FLIGHT : SMOOTH_K;
    let step = (rawP - p) * Math.min(dt * k, 1);
    // speed limit: fast scroll traverses the same path, quickly (GB-3.4)
    const cap = MAX_SCRUB_RATE * dt;
    if (step > cap) step = cap; else if (step < -cap) step = -cap;
    p += step;
    if (Math.abs(rawP - p) < 0.00004) p = rawP;
    return p;
  }

  return {
    update,
    get progress() { return p; },
    get raw() { return rawP; },
    get inFlight() { return !!flight; },
    get chapters() { return CHAPTERS; },
    chapterAt: () => chapterAt(p),
    localProgress: () => localProgress(p, chapterAt(p)),
    setProgress,
    snapTo,
    jumpToChapter,
    flyTo,
    flyToChapter(id) { flyTo(restProgress(id)); },
    cancelFlight,
    parseHash,
    writeRoute,
  };
}
