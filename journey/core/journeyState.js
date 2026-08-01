// Canonical journey state: native page scroll ↔ progress p ∈ [0,1] ↔ routes.
// Nav clicks animate scroll (cancelled by any manual scroll intent).
// Deep links jump instantly. One source of truth: the scroll position.
import { CHAPTER_RANGES, chapterAt } from './camera.js?v=7';


export function createJourneyState({ onNavigate } = {}) {
  const spacer = document.getElementById('scroll-spacer');
  const SCROLL_VH = 1900; // total scroll length (six chapters + soft rests)
  // svh keeps maxScroll stable through mobile URL-bar show/hide
  spacer.style.height = SCROLL_VH + (CSS.supports?.('height', '1svh') ? 'svh' : 'vh');

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

  function flyTo(targetP) {
    // distance-proportional duration: adjacent chapters keep the familiar
    // ~2s feel, a full-journey flight slows to ~4.4s so no veil strobes past
    const dur = 1.4 + 4.0 * Math.abs(targetP - rawP);
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
  function writeRoute(chapterId, nodeId, { push = false } = {}) {
    const h = nodeId ? `#/${chapterId}/${nodeId}` : `#/${chapterId}`;
    if (location.hash !== h) {
      suppressRoute++;
      if (push) history.pushState(null, '', h);
      else history.replaceState(null, '', h);
      // neither fires hashchange synchronously; keep counter symmetric
      suppressRoute--;
    }
  }
  window.addEventListener('hashchange', () => {
    if (suppressRoute > 0) return;
    const r = parseHash();
    if (!r.chapter) return;
    if (!CHAPTER_RANGES.some(c => c.id === r.chapter)) {
      // unknown chapter in the hash: normalize rather than scrolling to 0
      history.replaceState(null, '', '#/mission');
      return;
    }
    // only teleport when the hash targets a DIFFERENT chapter — Back from a
    // detail state within the current chapter must not yank the camera to
    // the rest pose
    if (chapterAt(p).id !== r.chapter) {
      window.scrollTo(0, chapterTarget(r.chapter) * maxScroll());
      readScroll();
      p = rawP;
    }
    if (onNavigate) onNavigate(r);
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
    // soft rest magnetism: once scrolling has effectively stopped near a
    // chapter's rest pose, drift gently toward it — imperceptible as a snap,
    // but every chapter settles into its composed frame
    if (!flight && Math.abs(rawP - p) < 0.0008) {
      const c = chapterAt(p);
      const rest = c.start + (c.end - c.start) * 0.5;
      const cp = (p - c.start) / (c.end - c.start);
      if (Math.abs(cp - 0.5) < 0.12 && Math.abs(cp - 0.5) > 0.0005) {
        const pull = Math.min(dt * 1.1, 1) * (rest - p);
        p += pull;
        window.scrollTo(0, p * maxScroll());
        rawP = p;
      }
    }
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
