/* ==================================================================== *
 * journey/journey-owner.js — the shared parked no-op.
 *
 * WHAT IS LEFT OF THIS FILE, AND WHY
 * ----------------------------------
 * This module was the journey's ROOT OWNER (J04e): `parkAnimator`, `claim`,
 * a generation, a census and a `dispose()`. All of it drained reachability
 * for a teardown no production caller ever performed, and it was removed
 * with the rest of the disposal machinery — see
 * docs/code-health/DISPOSAL-REMOVED.md.
 *
 * `PARKED` survives because `journey/chapters/connect/index.js` still
 * imports it. Connect's disposer is the one that could not be removed with
 * the others: that file was under a live order and off limits to this one.
 * When Connect's disposer goes, this file goes with it.
 *
 * PARK, NEVER REMOVE — the rule PARKED exists to serve.
 * `organism/animation.js` keeps animators in a Map and runs them in
 * insertion order; a second registration under the same name replaces the
 * callback IN ITS ORIGINAL SLOT. So a teardown that REMOVED a registration
 * would look correct and be wrong: the next registration would land at the
 * END of insertion order, behind every chapter animator, and the frame-order
 * contract would invert with no test failing — tools/test-frame-order.mjs
 * area S reads source text, and the text would not have moved.
 * ==================================================================== */

/** The parked spine — the same empty callback `main.js` registers before
 *  boot. Module-level and shared, so a test can compare by identity. */
export const PARKED = () => {};
