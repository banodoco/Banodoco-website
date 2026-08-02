// Virtual scroll surface for the journey (GB-3.1, GB-3.2, GB-3.4).
//
// WHY VIRTUAL, not a native scroll spacer:
//   * the hero page is `overflow: hidden` and must stay that way - adding a
//     spacer changes document height, can mint a scrollbar, and therefore
//     changes the canvas aspect the hero regression screenshot was taken at;
//   * the input shield in index.html already intercepts wheel on #stage at
//     capture phase (passive, so it cannot preventDefault). A window-level
//     capture listener runs BEFORE the shield, so scroll capture and the
//     shield coexist without either being weakened: the shield still keeps
//     wheel/drag away from OrbitControls, we still see every delta;
//   * soft snap magnetism has to be able to move the position at any moment.
//     Fighting native momentum scrolling with window.scrollTo() is the
//     classic way to get a stuttering, non-reversible scrub.
//
// The model is scrubbed travel: a virtual position v (in px) maps piecewise
// linearly onto journey progress p through the per-chapter allocations in
// constants.js. Every input is a delta on v; nothing is ever a discrete step
// to a chapter, so the path is reversible at any point and at any speed.

import {
  CHAPTERS, SCROLL_VH, SNAP_ENGAGE_MS, SNAP_K, SNAP_BAND, SNAP_DEAD_P,
  COMMIT_THRESHOLD, COMMIT_GLIDE_RATE, COMMIT_RAMP_S,
  WHEEL_LINE_PX, TOUCH_GAIN, KEY_STEP_PX, restProgress,
} from '../constants.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

export function createScrollModel({ onDelta = null, onIntent = null } = {}) {
  let lens = [];        // px allocated per chapter
  let edges = [];       // cumulative px at each chapter boundary
  let total = 0;
  let v = 0;            // virtual scroll position, px
  let lastInput = -1e9; // performance.now() of the last manual input
  let lastDir = 0;      // sign of the last manual delta (+1 fwd / -1 back / 0 none)
  let glideT = 0;       // seconds the current commit glide has been running
  let enabled = false;

  // ?nosnap=1 disables commit-resolution entirely (restores the band-limited
  // W3-A soft snap) so ?p= deep-scrub QA can park at arbitrary positions.
  const NOSNAP = typeof location !== 'undefined'
    && new URLSearchParams(location.search).get('nosnap') === '1';

  // ---- scroll px -> p, as a MONOTONE C1 spline through the allocation knots.
  //
  // The obvious mapping is piecewise linear per chapter, and it is wrong: the
  // p spans and the px allocations have different ratios, so every chapter
  // boundary becomes a step change in scroll-to-motion gain. Measured, the
  // Mission/Inspire boundary at p = 0.14 sat in the MIDDLE of the orbit and
  // made its first third travel 2.2x faster than the rest - a velocity
  // discontinuity mid-move, which is exactly the kind of thing this prototype
  // exists to catch.
  //
  // PCHIP (Fritsch-Carlson) keeps the allocations honest (each chapter still
  // costs its own scroll distance) while making the gain continuous, so no
  // camera move ever changes speed because of where a chapter label starts.
  let kx = [], ky = [], km = [];
  let invX = [], invY = [];   // sampled inverse, for p -> px

  function buildSpline() {
    kx = [0]; ky = [0];
    for (let i = 0; i < CHAPTERS.length; i++) {
      kx.push(kx[i] + lens[i]);
      ky.push(CHAPTERS[i].end);
    }
    const n = kx.length - 1;
    const h = [], d = [];
    for (let i = 0; i < n; i++) { h.push(kx[i + 1] - kx[i]); d.push((ky[i + 1] - ky[i]) / h[i]); }
    km = new Array(n + 1);
    km[0] = d[0];
    km[n] = d[n - 1];
    for (let i = 1; i < n; i++) {
      if (d[i - 1] * d[i] <= 0) { km[i] = 0; continue; }
      let m = (d[i - 1] + d[i]) / 2;
      const lim = 3 * Math.min(Math.abs(d[i - 1]), Math.abs(d[i]));
      km[i] = Math.sign(m) * Math.min(Math.abs(m), lim);
    }
    // sampled inverse for scrollFor()
    const S = 1024;
    invX = new Array(S + 1); invY = new Array(S + 1);
    for (let i = 0; i <= S; i++) {
      const x = (i / S) * total;
      invX[i] = x; invY[i] = pAt(x);
    }
  }

  /** virtual px -> journey progress */
  function pAt(px) {
    const x = Math.max(0, Math.min(total, px));
    let i = 0;
    while (i < kx.length - 2 && x > kx[i + 1]) i++;
    const h = kx[i + 1] - kx[i];
    if (h <= 0) return clamp01(ky[i]);
    const u = (x - kx[i]) / h, u2 = u * u, u3 = u2 * u;
    return clamp01(
      (2 * u3 - 3 * u2 + 1) * ky[i] + (u3 - 2 * u2 + u) * h * km[i]
      + (-2 * u3 + 3 * u2) * ky[i + 1] + (u3 - u2) * h * km[i + 1]);
  }

  /** journey progress -> virtual px (inverse of the same monotone spline) */
  function scrollFor(p) {
    p = clamp01(p);
    if (!invY.length) return 0;
    let lo = 0, hi = invY.length - 1;
    if (p <= invY[0]) return invX[0];
    if (p >= invY[hi]) return invX[hi];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (invY[mid] <= p) lo = mid; else hi = mid;
    }
    const span = invY[hi] - invY[lo];
    const f = span > 1e-9 ? (p - invY[lo]) / span : 0;
    return invX[lo] + (invX[hi] - invX[lo]) * f;
  }

  function measure() {
    const h = Math.max(320, window.innerHeight);
    const keepP = total > 0 ? pAt(v) : 0;
    lens = CHAPTERS.map(c => (SCROLL_VH[c.id] || 2) * h);
    total = lens.reduce((a, b) => a + b, 0);
    edges = [0];
    for (const L of lens) edges.push(edges[edges.length - 1] + L);
    buildSpline();
    v = scrollFor(keepP);
  }

  /** Chapter scroll length (px) at a given p - the snap band scales with it. */
  function lengthAtP(p) {
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (p <= CHAPTERS[i].end || i === CHAPTERS.length - 1) return lens[i];
    }
    return lens[lens.length - 1];
  }

  /* ---------------- input ---------------- */
  function push(dpx, kind) {
    if (!enabled) return;
    // An open detail state consumes the first scroll intent: travel resumes
    // only once the frame is clear (GB-3.6).
    if (onIntent && onIntent(kind) === false) { lastInput = performance.now(); return; }
    v = Math.max(0, Math.min(total, v + dpx));
    if (dpx) lastDir = dpx > 0 ? 1 : -1;   // any new input cancels a commit glide
    glideT = 0;                            // instantly (via lastInput, below) and
    lastInput = performance.now();         // re-aims the next idle resolution
    if (onDelta) onDelta(pAt(v));
  }

  function onWheel(e) {
    if (!enabled) return;
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= WHEEL_LINE_PX;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    if (e.cancelable) e.preventDefault();  // no rubber-band / back-swipe
    push(d, 'wheel');
  }

  let touchY = null;
  function onTouchStart(e) { touchY = e.touches[0] ? e.touches[0].clientY : null; }
  function onTouchMove(e) {
    if (!enabled || touchY === null || !e.touches[0]) return;
    const y = e.touches[0].clientY;
    const d = (touchY - y) * TOUCH_GAIN;
    touchY = y;
    if (e.cancelable) e.preventDefault();
    push(d, 'touch');
  }
  function onTouchEnd() { touchY = null; }

  const KEYS = {
    ArrowDown: 1, ArrowUp: -1, PageDown: 1, PageUp: -1, ' ': 1, Home: 'home', End: 'end',
  };
  function onKey(e) {
    if (!enabled) return;
    // never hijack typing or an activated control
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = KEYS[e.key];
    if (k === undefined) return;
    if (k === 'home') { e.preventDefault(); jump(0, 'key'); return; }
    if (k === 'end') { e.preventDefault(); jump(1, 'key'); return; }
    const big = e.key === 'PageDown' || e.key === 'PageUp' || e.key === ' ';
    e.preventDefault();
    push(k * (big ? window.innerHeight * 0.78 : KEY_STEP_PX), 'key');
  }

  function jump(p, kind) {
    if (onIntent && onIntent(kind || 'jump') === false) return;
    const from = v;
    v = scrollFor(p);
    lastDir = v > from ? 1 : v < from ? -1 : lastDir;
    glideT = 0;
    lastInput = performance.now();
    if (onDelta) onDelta(pAt(v));
  }

  /* ---------------- commit resolution (G3 motion note) ----------------
     Hannah: "as soon as you've gone past the point where you're leaving the
     current section, it should snap-scroll to the next one... you can get
     stuck in no man's land. That shouldn't be possible."

     While input is live the model stays fully scrubbed and reversible —
     nothing here runs until SNAP_ENGAGE_MS of idle. On idle, the position
     ALWAYS resolves to an anchor: the pair of rests bracketing p is found,
     and the direction rule picks one —

       travelling forward:  committed to the next rest once >= COMMIT_THRESHOLD
                            of the inter-rest span is behind you, else back;
       travelling backward: mirrored (the rest being LEFT is the upper one);
       no direction yet (programmatic placement): nearest rest.

     COMMIT_THRESHOLD 0.35 < 0.5 is the forward bias — in your direction of
     travel you commit early, against it you have to earn the return.

     The glide is a scroll, not an animation: it moves v, and journey.js
     smooths/limits it exactly as it does a wheel delta, so copy release,
     re-anchor, seam dips and handheld all behave as under a real scroll.
     Profile: smoothstep ramp-in over COMMIT_RAMP_S to a COMMIT_GLIDE_RATE
     cruise, handed to the critically-damped SNAP_K pull for the landing —
     monotonic by construction (every step <= remaining distance), so no
     overshoot and no bounce, ever. Any manual delta resets lastInput and
     control returns to the visitor within a frame.

     p = 1 is a resolution anchor too (the authored end-hold): a fling to the
     end must settle where it landed, never be tugged back to the Final rest. */
  const ANCHORS = CHAPTERS.map(c => restProgress(c.id));
  const RESOLVE_P = [...ANCHORS, 1].filter((a, i, arr) => i === 0 || a > arr[i - 1] + 1e-6);

  /** The rest this idle position must resolve to, per the direction rule. */
  function commitTarget(p) {
    let lo = RESOLVE_P[0], hi = RESOLVE_P[RESOLVE_P.length - 1];
    for (let i = 0; i < RESOLVE_P.length - 1; i++) {
      if (p >= RESOLVE_P[i] && p <= RESOLVE_P[i + 1]) {
        lo = RESOLVE_P[i]; hi = RESOLVE_P[i + 1]; break;
      }
    }
    if (hi - lo < 1e-9) return lo;
    const f = (p - lo) / (hi - lo);          // fraction of the transition, in p
    if (lastDir > 0) return f >= COMMIT_THRESHOLD ? hi : lo;
    if (lastDir < 0) return (1 - f) >= COMMIT_THRESHOLD ? lo : hi;
    return f >= 0.5 ? hi : lo;               // placed, never scrolled: nearest
  }

  function update(dt) {
    if (!enabled || total <= 0) return null;
    if (performance.now() - lastInput < SNAP_ENGAGE_MS) { glideT = 0; return pAt(v); }
    const p = pAt(v);

    if (NOSNAP) {
      // Legacy W3-A soft snap: band-limited magnetism only, parks anywhere
      // outside the band. Kept verbatim for ?p= deep-scrub QA.
      let best = null, bestD = Infinity;
      for (const a of ANCHORS) {
        const d = Math.abs(scrollFor(a) - v);
        if (d < bestD) { bestD = d; best = a; }
      }
      if (best === null) return p;
      const band = SNAP_BAND * lengthAtP(p);
      if (bestD > band) return p;
      const targetV = scrollFor(best);
      if (Math.abs(best - p) < SNAP_DEAD_P) { v = targetV; return best; }
      v += (targetV - v) * Math.min(1, dt * SNAP_K);
      return pAt(v);
    }

    const target = commitTarget(p);
    if (Math.abs(target - p) < SNAP_DEAD_P) { v = scrollFor(target); glideT = 0; return target; }
    glideT += dt;
    const dP = target - p;
    const step = Math.min(
      COMMIT_GLIDE_RATE * dt * smooth01(glideT / COMMIT_RAMP_S), // ramped cruise
      Math.abs(dP) * Math.min(1, dt * SNAP_K),                   // damped landing
    );
    v = scrollFor(p + Math.sign(dP) * step);
    return pAt(v);
  }

  function attach() {
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('resize', measure);
    measure();
  }

  return {
    attach,
    measure,
    get enabled() { return enabled; },
    set enabled(on) { enabled = !!on; },
    get progress() { return pAt(v); },
    /** Place the virtual position without registering visitor intent.
        Clears travel direction: a placement is not a scroll, so idle
        resolution falls back to the nearest rest (rests resolve to
        themselves — deep links / ?pose= are not disturbed). */
    setProgress(p) { v = scrollFor(p); lastDir = 0; glideT = 0; },
    /** Milliseconds since the last manual input (flight cancellation, QA). */
    get sinceInput() { return performance.now() - lastInput; },
    /** QA: the rest idle would resolve to from here (null under ?nosnap=1). */
    get commitP() { return NOSNAP ? null : commitTarget(pAt(v)); },
    /** QA: sign of the last manual delta. */
    get lastDir() { return lastDir; },
    get nosnap() { return NOSNAP; },
    update,
    pAt,
    scrollFor,
    get total() { return total; },
  };
}
