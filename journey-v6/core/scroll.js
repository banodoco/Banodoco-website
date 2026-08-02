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

/* ==========================================================================
   INPUT OWNERSHIP  (a11y debt #1 — root cause, replacing the guard stack)
   --------------------------------------------------------------------------
   The travel model listens at WINDOW CAPTURE and preventDefault()s wheel,
   touchmove and a set of keys. That is correct for the journey surface and
   wrong for anything on the page that owns its own input: a focused button
   whose activation key is Space (WCAG 2.1.1), a dialog that must not be
   scrubbed out from under the reader, a bottom sheet that has to scroll
   internally.

   Two things were bolted on top of this over time — a selector-list Space
   guard registered ahead of scroll.attach() in core/ui.js, and the GB-3.6
   "first scroll intent closes the detail" rule doubling as an arrow-key
   handler. Both are symptom fixes: they encode a list of class names in one
   module about elements built in another, and they only cover the cases
   somebody remembered.

   The root cause is that scroll.js claimed input UNCONDITIONALLY and then
   subtracted exceptions. It now does the opposite:

     1. REGISTRATION, not selectors. A DOM layer that owns its own input
        registers the element (claimInput) and unregisters it (releaseInput).
        Wheel and touch inside a registered region are never travel and are
        never preventDefault()ed, so the region scrolls natively. A region
        registered `modal: true` additionally takes every travel KEY off the
        table for as long as it is live — an open dialog card cannot be
        scrubbed past, and arrow keys no longer close it as a side effect of
        the scroll-intent rule.

     2. CONTROLS-FIRST key dispatch. Before a key becomes travel, we ask
        whether the focused thing already means something by it, using
        PLATFORM semantics (what the HTML/ARIA spec says that element does
        with that key) rather than a list of journey class names. Space on a
        focused <button> or role="button" activates it; the scrolling keys
        belong to a scrollable ancestor; text entry keeps everything. The
        answer is therefore right for the hero's controls, the footer, a
        future drawer and anything else, not just the elements one module
        happened to enumerate.

   Nothing below this block touches the snap/commit model, the scroll->p
   spline, or any threshold. This is routing only.
   ========================================================================== */

/** Elements that own their own input while registered. Element -> {modal}. */
const inputOwners = new Map();

/** Declare that `el` (and its subtree) handles its own wheel/touch — and,
 *  with `modal`, its own keys too. Idempotent. */
export function claimInput(el, { modal = false } = {}) {
  if (el) inputOwners.set(el, { modal: !!modal });
}

/** Hand input back to the journey. Safe to call when nothing is registered. */
export function releaseInput(el) {
  if (el) inputOwners.delete(el);
}

/** The owner record covering `node`, or null. Detached owners self-retire. */
function ownerOf(node) {
  if (!inputOwners.size || !node) return null;
  for (const [el, opt] of inputOwners) {
    if (!el.isConnected) { inputOwners.delete(el); continue; }
    if (el === node || el.contains(node)) return opt;
  }
  return null;
}

/** True while any registered owner is modal (a dialog / bottom sheet). */
function modalLive() {
  for (const [el, opt] of inputOwners) {
    if (!el.isConnected) { inputOwners.delete(el); continue; }
    if (opt.modal) return true;
  }
  return false;
}

/* ---- platform key semantics (the "controls-first" half) ---- */

// Keys whose default action is scrolling — a scrollable ancestor outranks the
// journey for these, which is what makes a bottom sheet's internal scroll work
// for the keyboard as well as for the finger.
const SCROLLING_KEYS = new Set([
  'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar',
]);

function isTextEntry(el) {
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION';
}

// Elements for which Space is the ACTIVATION key. Deliberately excludes
// links: Space on an <a href> scrolls the page natively, so the journey is
// the correct owner there (Enter activates a link, and Enter is not a travel
// key). This is the spec's split, not a preference.
function spaceActivates(el) {
  const tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'SUMMARY') return true;
  const r = el.getAttribute('role');
  return r === 'button' || r === 'checkbox' || r === 'switch' || r === 'radio'
      || r === 'menuitem' || r === 'menuitemcheckbox' || r === 'menuitemradio'
      || r === 'tab' || r === 'option';
}

function scrollableAncestor(el) {
  for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) {
    if (n.scrollHeight - n.clientHeight > 1) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === 'auto' || oy === 'scroll') return n;
    }
  }
  return null;
}

/** Controls-first: does the thing this key was delivered to already mean
 *  something by it? Only a FOCUSED control can claim a key — a stray target
 *  (a keydown on <body> while a button is merely hovered) cannot. */
function targetOwnsKey(e) {
  const t = e.target;
  if (!t || t.nodeType !== 1) return false;
  if (isTextEntry(t)) return true;
  if (t !== document.activeElement) return false;
  const space = e.key === ' ' || e.key === 'Spacebar';
  if (space && spaceActivates(t)) return true;
  if (SCROLLING_KEYS.has(e.key) && scrollableAncestor(t)) return true;
  return false;
}

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
    // A registered owner (dialog card / bottom sheet) scrolls itself: no
    // travel, and crucially no preventDefault, so the native scroll runs.
    if (ownerOf(e.target)) return;
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= WHEEL_LINE_PX;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    if (e.cancelable) e.preventDefault();  // no rubber-band / back-swipe
    push(d, 'wheel');
  }

  let touchY = null;
  let touchOwned = false;   // this gesture began inside a registered owner
  function onTouchStart(e) {
    touchOwned = !!ownerOf(e.target);
    // Ownership is decided ONCE per gesture, at touchstart: a drag that began
    // inside a sheet stays the sheet's for its whole life even if the finger
    // leaves the element, which is how native scrolling and drag-to-dismiss
    // behave. Re-testing per touchmove would hand the journey a half-gesture.
    touchY = !touchOwned && e.touches[0] ? e.touches[0].clientY : null;
  }
  function onTouchMove(e) {
    if (!enabled || touchOwned || touchY === null || !e.touches[0]) return;
    const y = e.touches[0].clientY;
    const d = (touchY - y) * TOUCH_GAIN;
    touchY = y;
    if (e.cancelable) e.preventDefault();
    push(d, 'touch');
  }
  function onTouchEnd() { touchY = null; touchOwned = false; }

  const KEYS = {
    ArrowDown: 1, ArrowUp: -1, PageDown: 1, PageUp: -1,
    ' ': 1, Spacebar: 1, Home: 'home', End: 'end',
  };
  function onKey(e) {
    if (!enabled) return;
    const k = KEYS[e.key];
    if (k === undefined) return;
    if (e.defaultPrevented) return;
    // 1. a modal owner is live: NONE of these are travel. This is what stops
    //    an arrow press from scrubbing the journey behind an open card — and
    //    from closing it, which used to happen because travel keys reached
    //    push() and push() consumed the detail via onIntent (GB-3.6).
    if (modalLive()) return;
    // 2. controls-first: the focused control's own semantics win.
    if (targetOwnsKey(e)) return;
    if (k === 'home') { e.preventDefault(); jump(0, 'key'); return; }
    if (k === 'end') { e.preventDefault(); jump(1, 'key'); return; }
    const big = e.key === 'PageDown' || e.key === 'PageUp'
      || e.key === ' ' || e.key === 'Spacebar';
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
    /** QA: is a registered modal owner (dialog card / bottom sheet) holding
        the travel keys? */
    get modalInput() { return modalLive(); },
    /** QA: how many DOM regions currently own their own input. */
    get inputOwners() { return inputOwners.size; },
    get nosnap() { return NOSNAP; },
    update,
    pAt,
    scrollFor,
    get total() { return total; },
  };
}
