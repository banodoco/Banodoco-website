/* ==================================================================== *
 * journey/ui/media.js — one media-query accessor, one fallback shape.
 *
 * The `typeof matchMedia === 'function' ? matchMedia(q) : { matches: false }`
 * guard is written out longhand in eight places in this tree. Four of them
 * are in J04b's allowlist (`journey/ui.js` x2, `journey/rail.js` x2) and are
 * deduped here. The other four — `journey/scroll.js:41`,
 * `journey/lens.js:324`, `journey/director.js:47`,
 * `journey/chapters/owned/portrait-remix.js:199`, plus
 * `journey/cards/runtime.js:2` — belong to other orders and are recorded in
 * J04b's README as open debt rather than reached for.
 *
 * ONE DELIBERATE SHAPE CHANGE, and it is inert.
 * `journey/ui.js`'s two fallbacks carried a no-op `addEventListener() {}`
 * (it subscribes to `sheetQuery`'s `change`); `journey/rail.js`'s two did
 * not (it only ever reads `.matches`). This module returns the SUPERSET, so
 * the rail's two fallbacks gain a method nothing calls. Nothing in this tree
 * enumerates a MediaQueryList's own properties, and the fallback only exists
 * on a platform with no `matchMedia` at all — i.e. never in a browser and
 * only in a node harness.
 *
 * NOT PINNED ANYWHERE, and this line used to say otherwise. It named an
 * assertion in tools/test-ui-lifecycle.mjs as the guard for this shape; THAT
 * ASSERTION DOES NOT EXIST — the id had one hit tree-wide, this comment
 * asserting it — and nothing in that suite, or in any suite, asserts the shape
 * of this fallback (D92/D94). The retracted id is recorded in QA-09's
 * evidence rather than re-typed here, so the false claim is not preserved by
 * the sentence that retracts it. Corrected by QA-09
 * rather than left standing, because four more orders import this file and
 * read a coverage claim as a guarantee: a comment claiming coverage that does
 * not exist is worse than no comment. The superset shape above is a REASONED
 * choice, not a proved one.
 *
 * AND IT CARRIES A `removeEventListener` STUB, which the originals did not.
 * `journey/ui.js`'s sheet-form subscription now goes through
 * `owner.listen(sheetQuery, 'change', …)`, whose cleanup calls
 * `removeEventListener` on whatever it was handed. Without the stub a
 * `destroy()` on a no-`matchMedia` platform would throw inside a cleanup —
 * survivable (dispose() try/catches per cleanup) but wrong, and only ever
 * observable in a node harness. The addition puts one more site into
 * tools/test-render-baseline.mjs's `removeEventListener` census, which
 * NARROWS M18's attach/detach imbalance. That is the direction M18 exists to
 * reward, and it is a real teardown, not a decoration.
 * ==================================================================== */

/** A live `MediaQueryList` for `query`, or an inert stand-in on a platform
 *  with no `matchMedia`. `matches` is `false` on the stand-in — the same
 *  answer every one of the deduped call sites gave. */
export function mediaQuery(query) {
  return typeof matchMedia === 'function'
    ? matchMedia(query)
    : { matches: false, addEventListener() {}, removeEventListener() {} };
}

/** The reduced-motion query string, written once. Five modules in this tree
 *  spell it out; two of them are J04b's. */
export const REDUCE_MOTION = '(prefers-reduced-motion: reduce)';
