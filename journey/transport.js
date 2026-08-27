// Event transport for the journey's virtual scroll surface (J04a).
//
// WHAT THIS IS, AND NOTHING ELSE: DOM event unwrapping and ownership routing.
// The handlers below take a browser event, ask whether the journey owns it,
// normalise it into surface pixels, and hand the result to the travel model.
// They hold no state, decide no thresholds, and read no clock except the one
// noted below.
//
// WHAT THIS DELIBERATELY IS NOT: the touch CONTACT state machine
// (beginTouchContact / moveTouchContact / endTouchContact) stays inside the
// model. It looks like transport because its entry point is DOM-shaped, but it
// writes the stall bank, mints gesture serials and drops the arrival wall —
// that is classifier code, and splitting it would put a measured behaviour on
// a wire. `onTouchMove` here calls `host.moveTouchContact(y)` and does nothing
// else.
//
// THE ONE CLOCK READ, and it is load-bearing. `onTouchStart` reads
// `performance.now()` inline and hands it to the model. The model's
// `beginTouchContact(y, startedAt, owned)` has a `startedAt ||
// performance.now()` fallback which is dead today — both call sites pass a
// value, this one the live clock and the boot replay `bootNow - elapsed` —
// and it must not become live. On the replay path a fabricated start time
// erases the swipe's measured rate. Do not drop the argument.
//
// AND WHAT THAT CLOCK IS. `performance.now()` on this page is not wall time:
// organism/intro.js's fast-forward permanently skews it forward (~8.3 s in
// production) and deliberately never un-skews it — read the block at the
// head of that file before you trust a stamp. It stays monotonic, so a
// DIFFERENCE of two reads is safe, which is all this file takes. What is not
// safe is comparing a `performance.now()` reading against any other time
// source — an event's `timeStamp`, a `Date.now()`, a value that crossed the
// intro boundary — and main.js's pointer path (`e.timeStamp`) is the one that
// already had to route around it. Prefer a difference; if you need an
// absolute, say which clock it is on.
//
// The host seam. `createTransport(host)` needs exactly ten capabilities and
// takes no other view of the model:
//
//   enabled()                       is travel accepting input at all
//   push(dpx, kind, repeat, opts)   deliver surface pixels to the model
//   jump(target, kind)              Home / End travel to a named anchor
//   beginTouchContact(y, at, owned) open a contact (state machine, in model)
//   moveTouchContact(y, opts)       feed the contact
//   endTouchContact()               close the contact
//   touchContactLive()              enabled && contact is the journey's
//   ownerOf(node)                   the registered input owner covering node
//   modalLive()                     any registered owner is modal
//   targetOwnsKey(e)                the focused control's own key semantics

import { WHEEL_LINE_PX, KEY_STEP_PX } from './constants.js';

export function createTransport(host) {
  function onWheel(e) {
    if (!host.enabled()) return;
    // A registered owner (dialog card / bottom sheet) scrolls itself: no
    // travel, and crucially no preventDefault, so the native scroll runs.
    if (host.ownerOf(e.target)) return;
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= WHEEL_LINE_PX;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    if (e.cancelable) e.preventDefault();  // no rubber-band / back-swipe
    host.push(d, 'wheel');
  }

  function onTouchStart(e) {
    // A second finger joining the surface is a pinch, not a scrub: touchstart
    // fires once per new touch, so e.touches.length counts the whole gesture.
    // Leave both ownership and touchY alone — the browser owns the zoom, and
    // multi-finger deltas never feed the ride.
    if (e.touches.length > 1) return;
    const owned = !!host.ownerOf(e.target);
    // Ownership is decided ONCE per gesture, at touchstart: a drag that began
    // inside a sheet stays the sheet's for its whole life even if the finger
    // leaves the element, which is how native scrolling and drag-to-dismiss
    // behave. Re-testing per touchmove would hand the journey a half-gesture.
    host.beginTouchContact(e.touches[0] ? e.touches[0].clientY : null,
      performance.now(), owned);
  }
  function onTouchMove(e) {
    if (!host.touchContactLive() || !e.touches[0]) return;
    // Multi-finger = pinch-zoom. Return without preventDefault (the browser
    // keeps the pinch) and without touching touchY, so the zoom never leaks
    // a delta into the ride.
    if (e.touches.length > 1) return;
    const y = e.touches[0].clientY;
    if (e.cancelable) e.preventDefault();
    host.moveTouchContact(y);
  }
  function onTouchEnd() { host.endTouchContact(); }

  const KEYS = {
    ArrowDown: 1, ArrowUp: -1, PageDown: 1, PageUp: -1,
    ' ': 1, Spacebar: 1, Home: 'home', End: 'end',
  };
  function onKey(e) {
    if (!host.enabled()) return;
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
    if (host.modalLive()) return;
    // 2. controls-first: the focused control's own semantics win.
    if (host.targetOwnsKey(e)) return;
    if (k === 'home') { e.preventDefault(); host.jump(0, 'key'); return; }
    if (k === 'end') { e.preventDefault(); host.jump(1, 'key'); return; }
    const big = e.key === 'PageDown' || e.key === 'PageUp'
      || e.key === ' ' || e.key === 'Spacebar';
    e.preventDefault();
    host.push(k * (big ? window.innerHeight * 0.78 : KEY_STEP_PX), 'key', e.repeat);
  }

  /** Register the five travel listeners. Capture phase and passivity are
   *  load-bearing and are the shipped values: wheel and touchmove must be
   *  non-passive because they preventDefault(); touchstart and touchend never
   *  do and stay passive. Registration ORDER is preserved from scroll.js's
   *  attach() so the window's per-type dispatch is unchanged. */
  function attach() {
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    window.addEventListener('keydown', onKey, { capture: true });
  }

  return { attach };
}
