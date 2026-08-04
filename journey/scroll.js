// Virtual scroll surface for the journey (GB-3.1, GB-3.2, GB-3.4).
//
// WHY VIRTUAL, not a native scroll spacer:
//   * the hero page is `overflow: hidden` and must stay that way - adding a
//     spacer changes document height, can mint a scrollbar, and therefore
//     changes the canvas aspect the hero regression screenshot was taken at;
//   * OrbitControls never competes for these gestures: in journey mode the
//     organism's input policy (organism.js setInputPolicy, M5 — replacing
//     the old DOM event shield) turns off user orbit/zoom/pan at the
//     source, so this window-level capture listener sees every delta and
//     nothing downstream claims it;
//   * soft snap magnetism has to be able to move the position at any moment.
//     Fighting native momentum scrolling with window.scrollTo() is the
//     classic way to get a stuttering, non-reversible scrub.
//
// The model is scrubbed travel: a virtual position v (in px) maps piecewise
// linearly onto journey progress p through the per-chapter allocations in
// constants.js. Every input is a delta on v; nothing is ever a discrete step
// to a chapter, so the path is reversible at any point and at any speed.

import { CHAPTERS, REST_STOPS, TERMINAL_P } from './route.js';
import { NOSNAP } from '../flags.js';
import {
  SNAP_ENGAGE_MS, SNAP_K, SNAP_BAND, SNAP_DEAD_P,
  COMMIT_THRESHOLD, COMMIT_CARRY_RATE, COMMIT_GLIDE_RATE, COMMIT_BLEND_K,
  COMMIT_HANDOFF_MS, COMMIT_HANDOFF_MIN, COMMIT_HANDOFF_FLOOR_MS,
  COMMIT_CRUISE_MAX,
  WHEEL_LINE_PX, TOUCH_GAIN, KEY_STEP_PX, MAX_SCRUB_RATE, SMOOTH_K,
} from './constants.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

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
  let enabled = false;

  // Perceived-rate estimate + commit-glide state (velocity-continuous handoff).
  // pVel is an EMA of the raw surface's rate d(pAt(v))/dt, deliberately run at
  // SMOOTH_K — the SAME constant journeyState uses to smooth p — so pVel tracks
  // the on-screen rate rather than the raw delta stream, and is a faithful proxy
  // for the motion the visitor is watching.
  //
  // It decays in lockstep with that on-screen rate, which is the catch: hold the
  // handoff long enough and BOTH are dead, and seeding from pVel then continues
  // a motion that has already stopped. That is why WHEN the glide engages is
  // load-bearing (see handoffReady) and why pVelHold exists — the two together,
  // not the seed alone, are what make the takeover continuous.
  let pVel = 0;         // p/s, EMA of the raw surface rate (capped at MAX_SCRUB_RATE)
  let pPrev = null;     // pAt(v) last frame, for the EMA
  let pVelHold = 0;     // p/s, pVel AT RELEASE — the rate the gesture handed
                        // over. Latched on every delta, SPENT at engage: it
                        // decides both how fast the commit starts and, through
                        // COMMIT_CARRY_RATE, which rest it goes to, so it has
                        // to be consumed or one flick buys every transition.
  let pushGap = 0;      // ms, EMA of this gesture's inter-delta spacing (0 = none)
  let glide = null;     // active commit glide: { target, lo, hi } latched at engage
  let glideVel = 0;     // p/s, the glide's own (signed) rate

  // ?nosnap=1 disables commit-resolution entirely (restores the band-limited
  // W3-A soft snap) so ?p= deep-scrub QA can park at arbitrary positions.
  // (parsed once, in ../flags.js — THE flag registry)

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
    lens = CHAPTERS.map(c => (c.scrollVh || 2) * h);   // allocations live in route.js
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
    glide = null;                          // instantly (via lastInput, below) and
    // How fast is this gesture DELIVERING deltas? A stream (trackpad at 16 ms,
    // a spun wheel) proves it has ended much sooner than a slow deliberate
    // scroll can, so it earns a shorter handoff wait. Deltas further apart than
    // SNAP_ENGAGE_MS are not one stream by the model's own definition of idle —
    // that is a new gesture, so forget the old spacing rather than average
    // across the pause.
    const gapMs = performance.now() - lastInput;
    pushGap = gapMs > SNAP_ENGAGE_MS ? 0
      : (pushGap ? pushGap + (gapMs - pushGap) * 0.35 : gapMs);
    lastInput = performance.now();         // re-aims the next idle resolution
    // The rate the visitor is handing over, latched on EVERY delta so the last
    // one wins: this is what a with-the-motion handoff continues from, instead
    // of whatever is left of pVel once the idle window has run its course.
    // A lone delta from standstill latches ~0 (the previous frame's rate) and
    // therefore offers no early handoff — a single wheel notch is not a gesture.
    pVelHold = pVel;
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
    // 0. a MODIFIED key is a browser/OS shortcut, never travel: Cmd+ArrowDown
    //    is End on macOS, Alt+Arrow is history in some browsers, Ctrl+Space is
    //    an input-source switch. Claiming (and preventDefault-ing) those keys
    //    would eat platform chords over the journey surface. Shift is exempt —
    //    Shift+Space is the platform's own scroll-up idiom, which IS travel
    //    intent; it maps to the same forward step as plain Space (deliberate:
    //    the journey has one axis and PageUp/ArrowUp already travel back).
    //    Keys delivered mid-IME-composition belong to the composer, not us.
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
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
    glide = null;
    lastInput = performance.now();
    if (onDelta) onDelta(pAt(v));
  }

  /* ---------------- commit resolution (G3 motion note) ----------------
     Hannah: "as soon as you've gone past the point where you're leaving the
     current section, it should snap-scroll to the next one... you can get
     stuck in no man's land. That shouldn't be possible."

     While input is live the model stays fully scrubbed and reversible —
     nothing here runs until the input has stopped (SNAP_ENGAGE_MS of idle, or
     COMMIT_HANDOFF_MS for a resolution that is already going the visitor's way;
     see handoffReady). Once it has, the position ALWAYS resolves to an anchor:
     the pair of rests bracketing p is found, and the direction rule picks one —

       travelling forward:  committed to the next rest once >= COMMIT_THRESHOLD
                            of the inter-rest span is behind you OR the gesture
                            was still travelling forward when you let go
                            (>= COMMIT_CARRY_RATE); else back;
       travelling backward: mirrored (the rest being LEFT is the upper one);
       no direction yet (programmatic placement): nearest rest.

     COMMIT_THRESHOLD 0.35 < 0.5 is the forward bias — in your direction of
     travel you commit early, against it you have to earn the return. The
     COMMIT_CARRY_RATE term is what stops a real gesture ever being answered
     with a reversal: see pickTarget.

     The glide is a scroll, not an animation: it moves v, and journey.js
     smooths/limits it exactly as it does a wheel delta, so copy release,
     re-anchor, seam dips and handheld all behave as under a real scroll.

     Profile — VELOCITY-CONTINUOUS (Hannah's ride note: the commit "should
     continue smoothly from the motion of the previous one"). The glide does
     not ramp from standstill: at engage it SEEDS its rate with the perceived
     rate and eases that toward the signed COMMIT_GLIDE_RATE cruise (exponential
     blend, COMMIT_BLEND_K).

     Seeding alone was NOT enough, and the honest record of why is worth more
     than the claim was: while the model waited out SNAP_ENGAGE_MS the surface
     was frozen, so the on-screen rate decayed at SMOOTH_K and pVel decayed with
     it. The handoff was velocity-continuous with a motion that had already
     nearly stopped — measured on an ordinary 1.2 s gesture, 0.093 -> 0.042 p/s
     across the window, then ~650 ms of blend to climb back to the 0.10 cruise.
     Continuous on paper, stop -> pause -> restart on screen. So the WHEN moved:
     when the resolution already runs with the residual motion, the glide takes
     over COMMIT_HANDOFF_MS after the last delta and inherits the rate at
     RELEASE (pVelHold) — one motion, gesture into glide.

     Fixing WHEN exposed the second half, and it was the same mistake one level
     down. Taking over at the right speed is worthless if the glide then blends
     AWAY from it: every commit eased to the nominal 0.10, so a release brisker
     than nominal was met with an immediate brake — Hannah again, "it slows
     while making the transition instead of continuing smoothly." Nominal was
     being read as THE speed when it is only ever a FLOOR. So a with-the-motion
     glide now LATCHES its cruise at engage:

         cruise = clamp(|release rate|, COMMIT_GLIDE_RATE, COMMIT_CRUISE_MAX)

     Released slower than nominal -> speed up to nominal (the original ask).
     Released faster -> carry that speed the whole way, and the ONLY thing that
     slows it is the SNAP_K landing brake, which now begins about cruise/SNAP_K
     before the rest instead of a fixed distance. Nothing between the gesture and
     the brake takes speed away.

     Both of those repairs were gated on the resolution ALREADY agreeing with
     the direction of travel — and the case Hannah kept feeling was the one
     where it does not. The third and last piece was therefore not in the glide
     at all but in the DECISION: a forward gesture released short of
     COMMIT_THRESHOLD was sent backward, and a backward resolution after forward
     motion has to cross zero on screen, so it is a stop by construction. That
     is what COMMIT_CARRY_RATE removes (pickTarget) — after it, a resolution
     that opposes the visitor's own motion only happens when there was barely
     any motion to oppose.

     When the resolution does run AGAINST the residual motion (a notch, a slow
     drag that petered out), there is no motion to continue — the move has to
     turn around — so that keeps the full idle window, the live pVel seed AND
     the flat nominal cruise: the same blend decelerates smoothly through zero
     and returns. A reversal is the one place where slowing is the correct
     motion, and it is now reached only from a near standstill.
     The landing is unchanged: the toward-target step is capped by the
     critically-damped SNAP_K pull (every step <= remaining distance), so no
     overshoot and no bounce, ever; SNAP_DEAD_P settles exactly. The target
     and its bracketing rests are LATCHED at engage, so a residual carry can
     neither re-decide the resolution mid-glide nor escape the transition
     span. Any manual delta resets lastInput and control returns to the
     visitor within a frame.

     p = 1 is a resolution anchor too (the authored end-hold): a fling to the
     end must settle where it landed, never be tugged back to the Final rest. */
  // Every declared rest stop on the route is a resolution anchor (route.js —
  // a chapter adding a mid-leg stop is picked up here with no edits).
  const ANCHORS = REST_STOPS;
  const RESOLVE_P = [...ANCHORS, TERMINAL_P].filter((a, i, arr) => i === 0 || a > arr[i - 1] + 1e-6);

  /** The pair of resolution anchors bracketing p. */
  function bracketAt(p) {
    let lo = RESOLVE_P[0], hi = RESOLVE_P[RESOLVE_P.length - 1];
    for (let i = 0; i < RESOLVE_P.length - 1; i++) {
      if (p >= RESOLVE_P[i] && p <= RESOLVE_P[i + 1]) {
        lo = RESOLVE_P[i]; hi = RESOLVE_P[i + 1]; break;
      }
    }
    return [lo, hi];
  }

  /** Did the visitor's own last gesture hand over enough speed to CARRY?
   *
   *  pVelHold is the perceived rate latched at the last manual delta; lastDir
   *  is the sign of that delta. The product is the component of the released
   *  motion that runs the way the visitor was going — and it is deliberately a
   *  SIGNED test, not a magnitude one. Between discrete notches the model's own
   *  backward glide is what pVelHold sees (measured -0.064 p/s on the first
   *  notch at p = 0.30, against lastDir = +1); a magnitude test would read that
   *  borrowed rate as a forward flick and advance a whole chapter on one notch.
   *  Only motion the visitor put there, going the way the visitor last went,
   *  can carry. */
  function carrying() { return pVelHold * lastDir >= COMMIT_CARRY_RATE; }

  /** The rest of [lo, hi] this position must resolve to, per the direction rule.
   *
   *  TWO ways to commit onward, and the second is the fix for the stop Hannah
   *  kept feeling (constants.js COMMIT_CARRY_RATE):
   *
   *    POSITION — you got COMMIT_THRESHOLD of the span behind you;
   *    VELOCITY — you were still travelling when you let go (flick-to-advance).
   *
   *  Position alone sends a weak-but-real forward flick BACKWARD, and a
   *  backward resolution after forward motion can never be velocity-continuous:
   *  the on-screen rate has to cross zero to change sign, so the visitor sees
   *  stop-then-restart no matter how well the handoff is tuned. Adding the
   *  velocity term means a gesture that was going somewhere keeps going there,
   *  and the glide's only job is to converge to the transition's cruise.
   *
   *  Below COMMIT_CARRY_RATE nothing changes: a notch-by-notch reader and a
   *  slow deliberate drag that stops still resolve purely by position, so they
   *  are never flung onward by a rate they did not ask for. */
  function pickTarget(p, lo, hi) {
    if (hi - lo < 1e-9) return lo;
    const f = (p - lo) / (hi - lo);          // fraction of the transition, in p
    const carry = carrying();
    if (lastDir > 0) return (carry || f >= COMMIT_THRESHOLD) ? hi : lo;
    if (lastDir < 0) return (carry || (1 - f) >= COMMIT_THRESHOLD) ? lo : hi;
    return f >= 0.5 ? hi : lo;               // placed, never scrolled: nearest
  }

  function commitTarget(p) {
    const [lo, hi] = bracketAt(p);
    return pickTarget(p, lo, hi);
  }

  /** May the commit take over NOW, before the full SNAP_ENGAGE_MS idle window?
   *
   *  Only when the resolution is already going the way the visitor is. Then
   *  waiting is pure dead time: the surface is frozen, the on-screen rate decays
   *  at SMOOTH_K, and the glide restarts from the remains — the stop/pause/
   *  restart. Handing over a couple of frames after the last delta instead makes
   *  it ONE motion, gesture into glide.
   *
   *  When the resolution OPPOSES the residual motion (released short of
   *  COMMIT_THRESHOLD, or a discrete notch early in a span) there is nothing to
   *  continue — the move has to turn around — so those keep the shipped 160 ms
   *  window and their shipped feel. Same for a standing start (|pVelHold| under
   *  COMMIT_HANDOFF_MIN) and for ?nosnap=1, which never commits at all.
   *
   *  WHICH rest is picked is unaffected: with no input and no glide the surface
   *  is frozen, so p — and therefore bracketAt/pickTarget — is identical at both
   *  engage points. This moves the handover in time, never in space. */
  /** How long to wait before a with-the-motion handoff: 2x this gesture's own
   *  measured delta spacing, clamped. An isolated delta (no stream measured)
   *  waits the full COMMIT_HANDOFF_MS. */
  function handoffWaitMs() {
    if (!pushGap) return COMMIT_HANDOFF_MS;
    return Math.min(COMMIT_HANDOFF_MS, Math.max(COMMIT_HANDOFF_FLOOR_MS, pushGap * 2));
  }

  function handoffReady(p, idle) {
    if (NOSNAP) return false;
    if (idle < handoffWaitMs()) return false;
    if (glide) return true;              // handed over already: never re-gate it
    // Something to continue: a rate, and a rate the VISITOR put there. The
    // direction test is lastDir, not sign(pVelHold), because pVelHold is latched
    // off the perceived rate and the perceived rate may belong to the model's
    // own previous glide rather than to a gesture. Measured: under repeated
    // wheel notches early in a span, each notch latched the residual of the
    // BACKWARD glide between notches, which "agreed" with the backward
    // resolution and bought it an extra 80 ms per notch — per-notch progress
    // more than halved (0.0011 -> 0.00047 p) and the last notches went
    // backwards. lastDir is the visitor's own last delta and cannot be
    // impersonated by the glide.
    if (Math.abs(pVelHold) < COMMIT_HANDOFF_MIN) return false;
    if (!lastDir) return false;
    const [lo, hi] = bracketAt(p);
    return (pickTarget(p, lo, hi) - p) * lastDir > 0;
  }

  function update(dt) {
    if (!enabled || total <= 0) return null;
    let p = pAt(v);
    // Perceived-rate estimate, every frame (input live, idle, or gliding — a
    // glide interrupted by a nudge re-engages with its own motion inherited).
    // The instantaneous rate is capped at MAX_SCRUB_RATE because the on-screen
    // rate can never exceed it: a fling teleports v, but the visitor only ever
    // SEES the limiter's rate, and that is the motion a commit must continue.
    if (dt > 0) {
      const inst = pPrev === null ? 0 : (p - pPrev) / dt;
      const capped = inst > MAX_SCRUB_RATE ? MAX_SCRUB_RATE
        : inst < -MAX_SCRUB_RATE ? -MAX_SCRUB_RATE : inst;
      pVel += (capped - pVel) * Math.min(1, dt * SMOOTH_K);
      pPrev = p;
    } else if (pPrev === null) pPrev = p;
    const idle = performance.now() - lastInput;
    if (idle < SNAP_ENGAGE_MS && !handoffReady(p, idle)) { glide = null; return p; }

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

    if (dt <= 0) return p;

    // Engage: latch the resolution (target + bracketing span) and inherit the
    // perceived rate as the glide's initial condition — the handoff continues
    // the visitor's own motion instead of restarting from zero.
    if (!glide) {
      const [lo, hi] = bracketAt(p);
      // An EARLY engage is exactly the with-the-motion case: handoffReady only
      // returns true before SNAP_ENGAGE_MS when the resolution runs the way the
      // visitor's own last delta did.
      const withMotion = idle < SNAP_ENGAGE_MS;
      // Seed the rate. On an EARLY (with-the-motion) handoff, inherit the rate
      // at RELEASE: the decay since then is the model's own decision latency,
      // not anything the visitor did, and continuing from it is what makes the
      // takeover invisible. On the ordinary idle-window path — a reversal, a
      // standing start — inherit the LIVE estimate exactly as shipped: there the
      // decay IS the motion the visitor is watching.
      glideVel = withMotion ? pVelHold : pVel;
      // LATCHED CRUISE. Blending every commit to the nominal rate meant a glide
      // that took over from a brisk scroll immediately BRAKED to 0.10 — Hannah:
      // "it slows while making the transition instead of continuing smoothly."
      // Continuing the motion means the cruise is the visitor's own speed, so a
      // with-the-motion commit latches max(release rate, nominal), capped: it
      // can only speed a slow release UP to nominal (the original ask) and never
      // slow a fast one DOWN. Only the SNAP_K landing brakes it into the rest.
      // A reversal keeps the flat nominal cruise — decelerating through zero is
      // the one place slowing IS the correct motion — as does a standing start.
      const cruise = withMotion
        ? Math.min(Math.max(Math.abs(glideVel), COMMIT_GLIDE_RATE), COMMIT_CRUISE_MAX)
        : COMMIT_GLIDE_RATE;
      glide = { target: pickTarget(p, lo, hi), lo, hi, cruise };

      // PAY BACK THE DEAD TIME. The surface is FROZEN between the last delta
      // and this engage — no input, no glide — and what the visitor watches is
      // not v but journeyState's smoothed p, which lags v through a first-order
      // filter at SMOOTH_K. A frozen v therefore does not hold the picture
      // still: the on-screen rate decays as e^(-SMOOTH_K * dead), so even the
      // shortened 32-80 ms handoff arrives with 20-40% of the motion already
      // bled off, and the glide has to climb back through it. Measured before
      // this line, on a moderate forward commit: 1234 -> 664 -> 831 px/s, a 46%
      // sag and recovery in the middle of the move. Seeding the glide with the
      // rate at release fixes the VELOCITY at handover but not the GAP that
      // velocity is carried in, and the eye only ever sees the gap.
      //
      // So the surface repays exactly the distance it owes: the rate it was
      // released at, times the time it stood still. That restores v - p to the
      // separation the released rate implies, and the smoothed motion comes out
      // of the handoff at the speed it went in at, with no dead time to feel.
      //
      // It cannot change WHERE this resolves: the target and the bracketing
      // span are latched on the line above, from the frozen p, before a single
      // px is repaid. It only ever moves TOWARD that target (the sign test),
      // and never more than halfway to it, so it can neither overshoot nor
      // turn a long transition into a jump.
      if (withMotion) {
        const room = glide.target - p;
        // withMotion already bounds idle below SNAP_ENGAGE_MS; the clamp keeps
        // that bound local, so a later edit to withMotion cannot silently turn
        // this into an unbounded jump.
        const owed = glideVel * (Math.min(idle, SNAP_ENGAGE_MS) / 1000);
        if (owed * room > 0) {
          p += Math.abs(owed) < Math.abs(room) * 0.5 ? owed : room * 0.5;
          v = scrollFor(p);
          // The repayment is a correction to the GAP, not a frame of travel:
          // the smoothed p the visitor watches does not jump, so the perceived-
          // rate EMA must not see it as one frame's worth of rate either.
          pPrev = p;
        }
      }
      // SPEND THE FLICK. A gesture buys exactly ONE transition. Without this
      // the released rate stays latched, and the moment the glide settles on
      // its rest the very next frame resolves again — finds the same hot
      // pVelHold, carries again, and departs for the rest beyond. Measured
      // while building this: a single weak backward flick from the Connect rest
      // walked 0.49 -> 0.26 -> and straight on past 0.14, never settling. The
      // position rule was self-stabilising at a rest (a rest is always its own
      // resolution); a velocity rule is not, so the velocity has to be consumed
      // where it is used. The glide's target and cruise are already latched
      // above, so clearing here changes nothing about the move now running —
      // only that it cannot buy a second one. The next transition needs a new
      // gesture, which is what a flick means.
      pVelHold = 0;
    }
    const { target, lo, hi } = glide;
    const dP = target - p;
    if (Math.abs(dP) < SNAP_DEAD_P) {
      v = scrollFor(target); glide = null; glideVel = 0; return target;
    }
    const sgn = dP > 0 ? 1 : -1;
    // Rate eases toward the signed cruise. If the inherited rate opposes the
    // resolution, this decelerates smoothly through zero — a continuous
    // reversal, never a step.
    glideVel += (sgn * glide.cruise - glideVel) * Math.min(1, dt * COMMIT_BLEND_K);
    let step = glideVel * dt;
    // Damped landing cap, unchanged from the shipped profile: the toward-
    // target step never exceeds the critically-damped SNAP_K pull, and never
    // the remaining distance — no overshoot, no bounce, by construction.
    const land = dP * Math.min(1, dt * SNAP_K);
    if (dP > 0 ? step > land : step < land) { step = land; glideVel = step / dt; }
    // Residual carry (opposing inherit) can drift away from the target while
    // it bleeds off, but never out of the latched transition span.
    let pn = p + step;
    if (pn > hi) { pn = hi; glideVel = 0; }
    else if (pn < lo) { pn = lo; glideVel = 0; }
    v = scrollFor(pn);
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
        Clears travel direction AND the perceived-rate estimate: a placement
        is not a scroll and carries no motion to inherit, so idle resolution
        falls back to the nearest rest from standstill (rests resolve to
        themselves — deep links / ?pose= are not disturbed). */
    setProgress(p) { v = scrollFor(p); lastDir = 0; glide = null; glideVel = 0; pVel = 0; pVelHold = 0; pushGap = 0; pPrev = null; },
    /** Milliseconds since the last manual input (flight cancellation, QA). */
    get sinceInput() { return performance.now() - lastInput; },
    /** QA: the rest idle would resolve to from here (null under ?nosnap=1). */
    get commitP() { return NOSNAP ? null : commitTarget(pAt(v)); },
    /** QA: sign of the last manual delta. */
    get lastDir() { return lastDir; },
    /** QA: perceived-rate estimate (p/s) — what a commit glide would inherit. */
    get pVel() { return pVel; },
    /** QA: the rate (p/s) latched at the last manual delta — what an early,
        with-the-motion handoff continues from, and what COMMIT_CARRY_RATE
        tests (signed against lastDir) to decide whether the gesture carries
        onward. Zero once a commit has spent it. */
    get pVelHold() { return pVelHold; },
    /** QA: is a commit glide currently latched and running? */
    get gliding() { return !!glide; },
    /** QA: the running glide's own signed rate (p/s), 0 when not gliding. */
    get glideVel() { return glide ? glideVel : 0; },
    /** QA: the cruise (p/s) this glide latched at engage — nominal for a
        reversal / standing start, the visitor's own release rate (clamped to
        [COMMIT_GLIDE_RATE, COMMIT_CRUISE_MAX]) for a with-the-motion commit.
        The SNAP_K landing brake begins about cruise/SNAP_K before the rest. */
    get glideCruise() { return glide ? glide.cruise : 0; },
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
