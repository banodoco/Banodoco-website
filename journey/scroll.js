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
  COMMIT_STREAM_GAP_MS, COMMIT_STREAM_MIN, COMMIT_CRUISE_MAX,
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

export function createScrollModel({ onIntent = null } = {}) {
  let lens = [];        // px allocated per chapter
  let edges = [];       // cumulative px at each chapter boundary
  let total = 0;
  let v = 0;            // virtual scroll position, px — the visitor's own
                        // surface: the exact running sum of their deltas.
  let lastInput = -1e9; // performance.now() of the last manual input
  let lastDir = 0;      // sign of the last manual delta (+1 fwd / -1 back / 0 none)
  let enabled = false;

  /* ---- the controller's state (see `update`) ---------------------------
     p is the DISPLAYED progress — the number the camera reads. It used to be
     computed one module downstream, by smoothing pAt(v) a second time in
     journey/state.js, and that is where the stop came from: a first-order lag
     has no velocity state, so the moment its target stopped moving the rate on
     screen decayed to zero on its own. Here the rate IS state, so nothing
     about stopping the input can make it collapse. */
  let p = 0;            // displayed progress
  let vel = 0;          // p/s, the rate on screen this frame. It is not
                        // integrated and never needs to be: it is the max of
                        // two CONTINUOUS terms (the scrub servo and the
                        // resolution's floor), so it is continuous wherever
                        // they are, and they cross exactly where they are
                        // equal. Continuity is a property of the expression,
                        // not of a seed anyone has to remember to set.
  let gPeak = 0;        // p/s, SIGNED high-water mark of inRate this gesture —
                        // THE GESTURE'S STRENGTH. Its peak and never its last
                        // value: a momentum tail's final delta is its smallest
                        // by construction, so the rate at release is the same
                        // ~0.03 p/s whether the flick was hard or feeble, and
                        // every earlier fix that read it was reading a corpse.
  let inRate = 0;       // p/s, EMA of THE VISITOR'S OWN rate, measured on the
                        // input clock in push() — see there for why not here
  let gapEma = 0;       // ms, EMA of this gesture's inter-delta spacing
  let gCount = 0;       // deltas in this gesture — with gapEma, the stream test
  let intent = null;    // the latched resolution:
                        // { target, lo, hi, dir, floor, cruise|null }
  let carry = 0;        // p the RESOLUTION has contributed on top of v. Held
                        // apart from v, rather than written into it every
                        // frame, for one reason: scrollFor() is a sampled
                        // inverse of the spline, so p -> px -> p is lossy at
                        // ~1e-4, and a per-frame round-trip accumulates that
                        // into real drift — measured, an out-and-back inside
                        // one gesture came back 2.6e-3 short, an order of
                        // magnitude more than the model's actual contribution.
                        // v therefore stays the visitor's exact delta sum and
                        // the surface is v PLUS this, folded back exactly once
                        // when the resolution ends.

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
    const keepP = total > 0 ? clamp01(pAt(v) + carry) : 0;
    carry = 0;
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
  /** Begin a fresh gesture: forget everything measured about the last one. */
  function newGesture() { gapEma = 0; gCount = 0; gPeak = 0; inRate = 0; }

  function push(dpx, kind) {
    if (!enabled) return;
    // An open detail state consumes the first scroll intent: travel resumes
    // only once the frame is clear (GB-3.6).
    if (onIntent && onIntent(kind) === false) { lastInput = performance.now(); return; }
    const now = performance.now();
    const gapMs = now - lastInput;
    // Deltas further apart than SNAP_ENGAGE_MS are not one gesture by the
    // model's own definition of idle: start the measurement over rather than
    // average across the pause, so a flick is only ever as strong, and only
    // ever as much of a stream, as ITS OWN deltas make it.
    if (gapMs > SNAP_ENGAGE_MS) newGesture();
    gapEma = gapEma ? gapEma + (gapMs - gapEma) * 0.35 : (gCount ? gapMs : 0);
    gCount++;
    lastInput = now;
    const before = pAt(v);
    v = Math.max(0, Math.min(total, v + dpx));
    if (dpx) {
      const dir = dpx > 0 ? 1 : -1;
      // A turn mid-stream is a new gesture: the strength of the half you have
      // abandoned must not be spent on the half you are now making.
      if (dir !== lastDir) { newGesture(); gCount = 1; }
      lastDir = dir;
      /* THE GESTURE'S OWN RATE, measured HERE — on the input clock, from the
         deltas, and from nothing else.
           * not from the servo or the surface: a running resolution ADDS to
             the surface, so reading the rate there feeds the model's own
             motion back into the number that sets the model's speed. Measured
             while building this, a steady 40-delta drag ran 9% long on that
             loop alone. It is the same trap 90920fa hit from the other side,
             where the model's backward glide was read as a forward flick;
           * not per FRAME: the deltas arrive on the input clock, so dividing a
             frame's worth by that frame's own dt makes the estimate jitter
             with the frame timer, and the high-water mark below records the
             jitter rather than the gesture — measured at 7-23% above the rate
             the visitor was actually sustaining, which lengthened every drag
             by that much. Each delta divided by its OWN gap has no such term.
         The first delta of a gesture is skipped: its gap belongs to whatever
         came before, so a lone notch measures zero and is not a flick. */
      if (gCount > 1 && gapMs > 0) {
        const gs = Math.min(gapMs, SNAP_ENGAGE_MS) / 1000;
        const inst = clampRate((pAt(v) - before) / gs);
        inRate += (inst - inRate) * Math.min(1, gs * SMOOTH_K);
        if (inRate * dir > gPeak * dir) gPeak = inRate;
      }
      // CONTROL RETURNS WITHIN ONE FRAME. A delta against a latched resolution
      // drops it on the spot; the scrub servo owns the position again from the
      // very next frame, starting from what is currently on screen.
      if (intent && dir !== intent.dir) releaseIntent();
    }
  }

  /** Drop the latched resolution and hand the surface back to the visitor at
   *  exactly the displayed position, so the scrub resumes from what they can
   *  see rather than from wherever the raw surface had been left. */
  /** Fold the resolution's accumulated contribution into the virtual surface.
   *  Exactly one spline round-trip per resolution, at the moment it ends. */
  function fold() {
    if (!carry) return;
    v = scrollFor(clamp01(pAt(v) + carry));
    carry = 0;
  }

  /** Drop the latched resolution and hand the surface back to the visitor. */
  function releaseIntent() { fold(); intent = null; }

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

  /** Home / End: TRAVEL to a named anchor (not placement — the picture rides
   *  the whole way, at the scrub limiter, exactly as a very long scroll would).
   *
   *  The destination is latched as the resolution up front, and that is not
   *  decoration. The incremental rule reads the DISPLAYED position, so left to
   *  itself it would re-decide every frame of the trip and, for the first third
   *  of it, correctly conclude that the nearest thing in the visitor's
   *  direction is the rest they just left — and pull back to it. (The old model
   *  never met this because it resolved from the raw SURFACE, which a jump
   *  moved instantly, so the question never arose. Measured on the way in:
   *  End from p = 0 travelled 0.002 and came home.) Latching the destination
   *  states the intent once, which is what a jump means. */
  function jump(target, kind) {
    if (onIntent && onIntent(kind || 'jump') === false) return;
    const from = v;
    v = scrollFor(target);
    lastDir = v > from ? 1 : v < from ? -1 : lastDir;
    carry = 0;
    newGesture();
    lastInput = performance.now();
    const dir = target > p ? 1 : target < p ? -1 : 0;
    // floor stays nominal: the servo is at the limiter and outruns it the whole
    // way, so this only ever supplies the SNAP_K landing.
    intent = dir === 0 ? null : {
      target, dir, cruise: COMMIT_GLIDE_RATE, floor: COMMIT_GLIDE_RATE,
      lo: Math.min(p, target), hi: Math.max(p, target),
    };
  }

  /* ================= RESOLUTION + MOTION: ONE CONTROLLER =================

     Hannah: "as soon as you've gone past the point where you're leaving the
     current section, it should snap-scroll to the next one... you can get
     stuck in no man's land. That shouldn't be possible." And then, three
     fixes later: "it still slows down when you don't have enough momentum in
     your scroll to reach the next section — it stops and starts again."

     THE STOP WAS ARCHITECTURAL. The model used to be two motions in series
     with a gap between them: a scrub, then — after an idle window — a commit
     glide that took over. Everything the visitor saw came from journeyState
     smoothing pAt(v) through a first-order lag, and a first-order lag holds no
     velocity: its output rate is k * (target - shown), so the instant the
     surface stopped moving the rate on screen decayed as e^(-k t) toward zero.
     The wait was therefore not neutral. It was a scheduled deceleration, run
     before every single commit, and no property of the glide that followed
     could undo it — measured, a moderate flick went 81 px/s -> 8 px/s across
     the window, then climbed back to 76. Stop, pause, restart.

     Three fixes tried to buy that back and all three missed for one shared
     reason: each was denominated in the rate at the LAST DELTA of the gesture,
     and on a real trackpad the last delta is the smallest one of the momentum
     tail, by construction. Measured peak vs last-delta rate, milli-p/s:
     weak flick 30/12, mid 109/19, hard 305/31. A fling and a dribble hand over
     the same number, so the early-handoff gate (needing 0.02) mostly never
     opened, the flick-carry test (needing 0.04) fired at random, and the
     "carry the release rate" cruise clamped every transition to nominal. All
     three repairs were live code that real input could not reach.

     SO THERE IS NO HANDOFF ANY MORE, because there are no longer two motions.

     One controller runs every frame. It owns the DISPLAYED position p and its
     rate `vel`, and it eases nothing into anything: each frame it picks ONE
     desired rate, as the faster of two terms along the resolution's direction,

         desired = max( servo , floor )

     where `servo` is the classic first-order pull toward the visitor's own
     virtual surface — the scrub, with the same SMOOTH_K and the same limiter
     it always had, unchanged and still exact — and `floor` is the speed the
     resolution insists on. These are two terms of one max, not two modes: they
     cross over at the instant they are EQUAL, so the moment control passes
     from the gesture to the transition is, by construction, the moment at
     which doing so changes the on-screen rate by nothing at all. Velocity
     continuity is a property of the structure. There is no constant to tune
     for it and no way to regress it.

     The second half of the fix is WHEN the floor exists. A resolution that
     runs the visitor's own way is armed WHILE THE GESTURE IS STILL RUNNING —
     as soon as position or the stream rule says where this is going — and its
     floor is the gesture's own peak rate. That floor can never outrun the
     finger (it is a high-water mark of what the finger already did), and it
     means the momentum tail's decay is simply never displayed: the tail falls
     below the floor and the floor holds the speed. Waiting for the tail to
     finish, as every previous version did, was waiting for the only thing
     worth continuing to disappear.

     A resolution that OPPOSES the visitor is the one case that still waits out
     SNAP_ENGAGE_MS, and should: there is nothing to continue, the move has to
     turn around, and a rate that must change sign has to pass through zero.
     After the stream rule below, that case is reached only from a genuine
     near-standstill — a wheel notch, a placement — where a "stop" is a
     standing start and not an interruption.

     WHICH rest, unchanged in intent (pickTarget):
       travelling forward:  the next rest once >= COMMIT_THRESHOLD of the span
                            is behind you, OR the gesture was a stream going
                            that way (flick-carry); else back;
       travelling backward: mirrored (the rest being LEFT is the upper one);
       no direction yet (programmatic placement): nearest rest.

     The landing is unchanged and still overshoot-free by construction: the
     toward-target rate is capped by the critically-damped SNAP_K pull and the
     step can never pass the target, so arrival is asymptotic — no overshoot,
     no bounce, ever, and SNAP_DEAD_P settles exactly on the anchor.

     p = 1 is a resolution anchor too (the authored end-hold): a fling to the
     end must settle where it landed, never be tugged back to the Final rest. */
  // Every declared rest stop on the route is a resolution anchor (route.js —
  // a chapter adding a mid-leg stop is picked up here with no edits).
  const ANCHORS = REST_STOPS;
  const RESOLVE_P = [...ANCHORS, TERMINAL_P].filter((a, i, arr) => i === 0 || a > arr[i - 1] + 1e-6);

  /** The pair of resolution anchors bracketing p. */
  function bracketAt(q) {
    let lo = RESOLVE_P[0], hi = RESOLVE_P[RESOLVE_P.length - 1];
    for (let i = 0; i < RESOLVE_P.length - 1; i++) {
      if (q >= RESOLVE_P[i] && q <= RESOLVE_P[i + 1]) {
        lo = RESOLVE_P[i]; hi = RESOLVE_P[i + 1]; break;
      }
    }
    return [lo, hi];
  }

  /** Is the visitor's current gesture a STREAM going somewhere — i.e. a thing
   *  that should carry to the next rest whatever fraction of the span it
   *  reached?
   *
   *  This replaces a threshold on the rate at release, which could not work:
   *  a momentum tail ends at ~0.03 p/s however hard it was thrown, so that
   *  test could not tell a fling from a dribble (see constants.js). What DOES
   *  separate the cases is not an instant but the shape of the whole gesture.
   *
   *    a trackpad flick, a drag, a spun wheel — deltas 8-16 ms apart, dozens
   *      of them: a stream, and a stream means one gesture, so it carries;
   *    a notch-by-notch reader — notches 100-250 ms apart, one or two at a
   *      time: never a stream at any speed, so it is judged purely by
   *      position and is never flung onward by a rate it did not ask for.
   *
   *  COMMIT_CARRY_RATE survives only as an anti-twitch floor on the gesture's
   *  PEAK rate: a two-frame stray cannot buy a whole transition. It is not
   *  what excludes the notches — the stream test is. */
  function carrying() {
    if (gCount < COMMIT_STREAM_MIN) return false;
    if (!gapEma || gapEma > COMMIT_STREAM_GAP_MS) return false;
    return gPeak * lastDir >= COMMIT_CARRY_RATE;
  }

  /** The rest of [lo, hi] this position must resolve to, per the direction
   *  rule: POSITION (you got COMMIT_THRESHOLD of the span behind you) or
   *  VELOCITY (you were making a real gesture that way — carrying()). */
  function pickTarget(q, lo, hi) {
    if (hi - lo < 1e-9) return lo;
    const f = (q - lo) / (hi - lo);          // fraction of the transition, in p
    const flick = carrying();
    if (lastDir > 0) return (flick || f >= COMMIT_THRESHOLD) ? hi : lo;
    if (lastDir < 0) return (flick || (1 - f) >= COMMIT_THRESHOLD) ? lo : hi;
    return f >= 0.5 ? hi : lo;               // placed, never scrolled: nearest
  }

  function commitTarget(q) {
    const [lo, hi] = bracketAt(q);
    return pickTarget(q, lo, hi);
  }

  const clampRate = r => (r > MAX_SCRUB_RATE ? MAX_SCRUB_RATE
    : r < -MAX_SCRUB_RATE ? -MAX_SCRUB_RATE : r);

  /** Legacy W3-A soft snap, for ?nosnap=1 only: band-limited magnetism on the
   *  surface, parking anywhere outside the band, so ?p= deep-scrub QA can sit
   *  at arbitrary positions. It nudges v and lets the servo follow, exactly as
   *  a slow scroll would — it never touches the controller's rate. */
  function softSnap(dt) {
    let best = null, bestD = Infinity;
    for (const a of ANCHORS) {
      const d = Math.abs(scrollFor(a) - v);
      if (d < bestD) { bestD = d; best = a; }
    }
    if (best === null) return;
    if (bestD > SNAP_BAND * lengthAtP(p)) return;
    const targetV = scrollFor(best);
    if (Math.abs(best - pAt(v)) < SNAP_DEAD_P) v = targetV;
    else v += (targetV - v) * Math.min(1, dt * SNAP_K);
  }

  function update(dt) {
    if (!enabled || total <= 0) return null;
    if (dt <= 0) return p;
    const idle = performance.now() - lastInput;
    // A gesture is over once its deltas have stopped for SNAP_ENGAGE_MS. This
    // no longer freezes anything — it only decides when the gesture's own peak
    // stops being the speed floor and the latched cruise takes over.
    const live = idle < SNAP_ENGAGE_MS;

    if (NOSNAP && !live) softSnap(dt);

    /* 1. THE SCRUB SERVO — the visitor's own surface, pulled at SMOOTH_K and
       speed-limited. Bit-for-bit the law that used to live in state.js; it is
       still the only thing that moves the picture while anyone is scrubbing,
       so scrubbing is unchanged, exact and reversible. */
    const surf = clamp01(pAt(v) + carry);
    const servo = clampRate((surf - p) * Math.min(1, dt * SMOOTH_K) / dt);

    /* 2. THE RESOLUTION. Armed the moment it is known — which, when it runs
       the visitor's way, is DURING the gesture. (The gesture's own strength,
       gPeak, is measured in push() — on the input clock, from the deltas.) */
    if (NOSNAP) intent = null;
    else {
      // A gesture that carries p out of the latched span has outgrown this
      // resolution: re-decide from where it now is, so a long scroll crosses
      // as many transitions as it earns.
      //
      // Crossing an anchor SPENDS the gesture, exactly as arriving at one does
      // (below). Without it, a scrub that drifts a hair past the rest it just
      // came back to re-brackets against the span BEYOND, finds the same hot
      // gPeak, and carries onward: measured, an out-and-back at the Inspire
      // rest overshot it by 0.004 and was answered by a trip to p = 0. A
      // gesture that is genuinely still delivering deltas re-earns its strength
      // from them within a frame or two, so a long scroll is not slowed by
      // this — it only stops one finished gesture buying a second transition.
      if (intent && (p < intent.lo - 1e-9 || p > intent.hi + 1e-9)) {
        intent = null;
        gPeak = 0;
      }
      if (!intent) {
        const [lo, hi] = bracketAt(p);
        const target = pickTarget(p, lo, hi);
        const dir = target > p ? 1 : target < p ? -1 : 0;
        const onward = dir !== 0 && dir === lastDir;
        if (onward) {
          // With the motion: arm NOW, floored at the gesture's own peak, so
          // the floor is under the motion before the momentum tail decays.
          intent = { target, lo, hi, dir, floor: Math.abs(gPeak), cruise: null };
        } else if (!live && dir !== 0) {
          // Against the motion (or from a placement): nothing to continue, so
          // this one does wait out the idle window and starts from rest at the
          // flat nominal cruise. Decelerating through zero is the one place
          // where slowing down IS the correct motion.
          intent = { target, lo, hi, dir, floor: 0, cruise: COMMIT_GLIDE_RATE };
          gPeak = 0;
        }
      }
      if (intent && intent.cruise === null) {
        if (live) {
          // Still going: the floor tracks the gesture's peak, so it can never
          // exceed what the finger already achieved and can never run away.
          intent.floor = Math.abs(gPeak);
        } else {
          // THE GESTURE IS OVER. Its peak becomes the transition's cruise: at
          // least nominal, so a gentle gesture still completes the move at a
          // readable speed; at most COMMIT_CRUISE_MAX, so a fling still reads
          // as travel. Spending gPeak here is what keeps one gesture worth
          // exactly one transition — a velocity rule is not self-stabilising
          // at a rest the way a position rule is, so the velocity has to be
          // consumed where it is used, or one flick buys the whole route.
          intent.cruise = Math.min(
            Math.max(Math.abs(gPeak), COMMIT_GLIDE_RATE), COMMIT_CRUISE_MAX);
          gPeak = 0;
        }
      }
    }

    /* 3. ONE DESIRED RATE. */
    let rate = servo, driven = false;
    if (intent) {
      if (intent.cruise !== null) {
        // The only ramp in the model, and it only ever runs UP: from the speed
        // already on screen toward the latched cruise. It can add speed and it
        // cannot take any away, so it cannot make a trough.
        intent.floor += (intent.cruise - intent.floor) * Math.min(1, dt * COMMIT_BLEND_K);
      }
      // The landing: never faster than the critically-damped pull toward the
      // rest, which is what makes the arrival asymptotic and overshoot-free.
      const brake = Math.abs(intent.target - p) * SNAP_K;
      const drive = intent.dir * Math.min(intent.floor, brake);
      if (drive * intent.dir > servo * intent.dir) { rate = drive; driven = true; }
    }
    vel = clampRate(rate);

    /* 4. INTEGRATE. */
    let np = p + vel * dt;
    if (driven) {
      // Never past the anchor, and settle exactly on it.
      if (intent.dir > 0 ? np >= intent.target : np <= intent.target) np = intent.target;
      if (Math.abs(intent.target - np) < SNAP_DEAD_P) np = intent.target;
      // THE RESOLUTION IS A SCROLL, NOT AN ANIMATION: it carries the visitor's
      // own surface along, so a delta arriving mid-transition is applied from
      // where the picture actually is, and the servo does not spend the rest of
      // the move trying to drag the picture back.
      //
      // What it adds is EXACTLY its own contribution — the distance the
      // resolution moved beyond what the scrub asked for — and never more. It
      // must not be written `v = scrollFor(p)`: p trails the surface by the
      // servo's lag, so assigning it would silently discard that lag, which is
      // real scrolling the visitor performed. Measured when it did: a steady
      // 40-delta drag lost 30% of its distance, and an out-and-back inside one
      // gesture came back 3.8e-3 short instead of exactly where it started.
      const extra = (vel - servo) * dt;
      let ns = surf + extra;
      // While the resolution is the thing driving, the surface may not run past
      // the anchor it is driving to — that is what keeps the landing asymptotic
      // once the servo takes the last of it. (A gesture strong enough to carry
      // the surface past the anchor on its own is never `driven`: its servo
      // outruns the floor, so it falls to the branch below and goes on to the
      // next span, exactly as a long scroll should.)
      ns = intent.dir > 0 ? Math.min(ns, intent.target) : Math.max(ns, intent.target);
      carry += ns - surf;
      p = np;
      if (p === intent.target) {
        // ARRIVED. ONE GESTURE BUYS ONE TRANSITION — spend its strength here.
        // A rest is its own resolution under the POSITION rule, so that rule is
        // self-stabilising and needs no such step; a velocity rule is not. Left
        // unspent, the very next frame brackets the rest against the one BEYOND
        // it, finds the same hot gPeak, carries again, and departs — measured,
        // an out-and-back at the Inspire rest ran 0.26 -> 0.2798 -> 0.26 and
        // straight on to 0. (This is the same trap 90920fa fell into; it spent
        // its rate when the glide ENGAGED, which is a moment that does not
        // exist here, and spending it when the cruise latches is not enough
        // because a short transition can complete before the gesture is over.)
        // A gesture that is genuinely still running simply re-earns it from its
        // own next deltas, within a frame or two.
        gPeak = 0;
        fold(); intent = null; vel = 0;
      }
    } else {
      p = np;
      // Settle exactly, as state.js used to at the end of every scrub.
      if (Math.abs(surf - p) < 0.00004) p = surf;
    }
    return clamp01(p);
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
    /** The DISPLAYED progress — smoothed and speed-limited here, once. */
    get progress() { return p; },
    /** The virtual surface, unsmoothed (QA / diagnostics). */
    get surface() { return clamp01(pAt(v) + carry); },
    /** Place the position with no travel at all: surface, picture and rate all
        land together. Clears travel direction and the gesture measurement — a
        placement is not a scroll and carries no motion, so idle resolution
        falls back to the nearest rest from standstill (rests resolve to
        themselves — deep links / ?p= / ?capture= are not disturbed). */
    setProgress(q) {
      p = clamp01(q); v = scrollFor(p); carry = 0;
      vel = 0; intent = null; lastDir = 0; newGesture();
    },
    /** Milliseconds since the last manual input (flight cancellation, QA). */
    get sinceInput() { return performance.now() - lastInput; },
    /** QA: the rest idle would resolve to from here (null under ?nosnap=1). */
    get commitP() { return NOSNAP ? null : commitTarget(p); },
    /** QA: sign of the last manual delta. */
    get lastDir() { return lastDir; },
    /** QA: the on-screen rate (p/s). Persistent controller state — this is the
        number whose continuity across the end of a gesture is the whole point
        of the design. */
    get rate() { return vel; },
    /** QA: the SIGNED high-water mark (p/s) of the scrub rate this gesture has
        asked for. What pickTarget tests, and what becomes the transition's
        cruise. Zero once a resolution has spent it. */
    get gesturePeak() { return gPeak; },
    /** QA: is this gesture a delta STREAM (a trackpad/drag/spun wheel rather
        than discrete notches)? The flick-carry test. */
    get streaming() { return gCount >= COMMIT_STREAM_MIN && !!gapEma && gapEma <= COMMIT_STREAM_GAP_MS; },
    /** QA: is a resolution latched and driving? */
    get resolving() { return !!intent; },
    /** QA: the latched resolution's speed FLOOR (p/s) right now — the gesture's
        own peak while the gesture is live, easing to the latched cruise once it
        is over. The SNAP_K landing brake begins about floor/SNAP_K before the
        rest. 0 when nothing is resolving. */
    get resolveFloor() { return intent ? intent.floor : 0; },
    /** QA: the cruise (p/s) this resolution latched when the gesture ended —
        the gesture's own peak rate clamped to [COMMIT_GLIDE_RATE,
        COMMIT_CRUISE_MAX], or flat nominal for a reversal / standing start.
        null while the gesture is still running. */
    get resolveCruise() { return intent ? intent.cruise : 0; },
    /** QA: where the latched resolution is going (null if none). */
    get resolveTarget() { return intent ? intent.target : null; },
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
