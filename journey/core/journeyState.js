// Canonical journey state: native page scroll ↔ progress p ∈ [0,1] ↔ routes.
// Nav clicks animate scroll (cancelled by any manual scroll intent).
// Deep links jump instantly. One source of truth: the scroll position.
import { CHAPTER_RANGES, chapterAt } from './camera.js';

export function createJourneyState({ onNavigate } = {}) {
  const spacer = document.getElementById('scroll-spacer');
  const SCROLL_VH = 1300; // total scroll length in vh
  spacer.style.height = SCROLL_VH + 'vh';

  let p = 0;               // smoothed progress (what the camera uses)
  let rawP = 0;            // instantaneous from scrollTop
  let flight = null;       // { from, to, t, dur }
  let suppressRoute = 0;

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }
  function readScroll() {
    const m = maxScroll();
    rawP = m > 0 ? Math.min(Math.max(window.scrollY / m, 0), 1) : 0;
  }
  readScroll();
  p = rawP;

  // Manual scroll intent cancels a nav flight immediately.
  function cancelFlight() { flight = null; }
  window.addEventListener('wheel', cancelFlight, { passive: true });
  window.addEventListener('touchmove', cancelFlight, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) cancelFlight();
  });
  window.addEventListener('scroll', readScroll, { passive: true });

  function flyTo(targetP, dur = 2.2) {
    flight = { from: rawP, to: targetP, t: 0, dur };
  }

  function chapterTarget(id) {
    const c = CHAPTER_RANGES.find(c => c.id === id);
    if (!c) return 0;
    return c.start + (c.end - c.start) * 0.5; // rest pose
  }

  // ---- routing ----
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [chap, node] = h.split('/').filter(Boolean);
    return { chapter: chap || null, node: node || null };
  }
  function writeRoute(chapterId, nodeId) {
    const h = nodeId ? `#/${chapterId}/${nodeId}` : `#/${chapterId}`;
    if (location.hash !== h) {
      suppressRoute++;
      history.replaceState(null, '', h);
      // replaceState does not fire hashchange; keep counter symmetric
      suppressRoute--;
    }
  }
  window.addEventListener('hashchange', () => {
    if (suppressRoute > 0) return;
    const r = parseHash();
    if (r.chapter) {
      const target = chapterTarget(r.chapter);
      const m = maxScroll();
      window.scrollTo(0, target * m);
      readScroll();
      p = rawP;
      if (onNavigate) onNavigate(r);
    }
  });

  function update(dt) {
    if (flight) {
      flight.t += dt;
      const f = Math.min(flight.t / flight.dur, 1);
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const target = flight.from + (flight.to - flight.from) * e;
      window.scrollTo(0, target * maxScroll());
      readScroll();
      if (f >= 1) flight = null;
    }
    // critically damped-ish smoothing keeps fast scroll continuous, no snapping
    const k = flight ? 10 : 6.5;
    p += (rawP - p) * Math.min(dt * k, 1);
    if (Math.abs(rawP - p) < 0.00004) p = rawP;
    return p;
  }

  return {
    update,
    get progress() { return p; },
    get raw() { return rawP; },
    get inFlight() { return !!flight; },
    flyToChapter(id) { flyTo(chapterTarget(id)); },
    jumpToChapter(id) {
      const m = maxScroll();
      window.scrollTo(0, chapterTarget(id) * m);
      readScroll(); p = rawP;
    },
    writeRoute,
    parseHash,
    chapterAt: () => chapterAt(p),
  };
}
