// Input ownership for the journey — the registration policy and the
// controls-first key semantics, and nothing else.
//
// This was `journey/scroll.js`'s, and the block declared its own seam long
// before it became a file, at the foot of its header comment: "Nothing below
// this block touches the snap/commit model, the scroll->p spline, or any
// threshold. This is routing only." That sentence is the boundary; this file
// is that boundary made a file, with `ownerOf`, `modalLive` and
// `targetOwnsKey` exported because the travel model and the transport now
// import them rather than close over them.
//
// THE PUBLIC ENTRY CONTRACT IS UNCHANGED. `journey/ui.js` and
// `journey/rail.js` import `claimInput` / `releaseInput` from
// `./scroll.js`, and three tool suites do the same. `scroll.js` re-exports
// both from here, so no consumer moves and no import path outside this pair
// of files changes.
//
// It sits at `journey/` rather than in a `journey/input/` directory because a
// one-file directory whose only sibling is one level up is the worse of two
// wrongs. The longer argument is in
// docs/code-health/evidence/2026-08-21-elegance-run-01/e02/relocated/
// journey-ownership.md.

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
        answer is therefore right for the hero's controls, the navigator's
        panel, a future drawer and anything else, not just the elements one
        module happened to enumerate.

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
export function ownerOf(node) {
  if (!inputOwners.size || !node) return null;
  for (const [el, opt] of inputOwners) {
    if (!el.isConnected) { inputOwners.delete(el); continue; }
    if (el === node || el.contains(node)) return opt;
  }
  return null;
}

/** True while any registered owner is modal (a dialog / bottom sheet). */
export function modalLive() {
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
export function targetOwnsKey(e) {
  const t = e.target;
  if (!t || t.nodeType !== 1) return false;
  if (isTextEntry(t)) return true;
  if (t !== document.activeElement) return false;
  const space = e.key === ' ' || e.key === 'Spacebar';
  if (space && spaceActivates(t)) return true;
  if (SCROLLING_KEYS.has(e.key) && scrollableAncestor(t)) return true;
  return false;
}
