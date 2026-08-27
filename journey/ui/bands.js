/* ==================================================================== *
 * journey/ui/bands.js — the copy band's opacity curve, and its two
 * clamps.
 *
 * Extracted verbatim from `journey/ui.js` (`smoothA` :119, `clamp01` :120,
 * `bandOpacity` :156-165 at J04b's start). Pure, DOM-free, deterministic,
 * and therefore the part of `journey/ui.js` that a node harness can actually
 * execute — which is why it is the extraction J04b took and the closure
 * machinery is not (D72: prefer a seam your strongest instrument can see).
 *
 * `clamp01` is ALSO defined in `journey/scroll.js:36`, identically. That is
 * not deduped here: `journey/scroll.js` is outside J04b's allowlist and is
 * held by other orders. Recorded as debt, not reached for.
 * ==================================================================== */

import { COPY_FADE_P } from '../constants.js';

/** Smoothstep with the clamp folded in. Argument is reassigned rather than
 *  copied, exactly as the original did. */
export function smoothA(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

/** Clamp to 0..1 without smoothing. */
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A copy block's band opacity at route position `p`.
 *
 *  `lo <= -1` and `hi >= 2` are the open-ended sentinels: a band that starts
 *  before the route or ends after it does not fade in or out on that side.
 *  The final `a * a * (3 - 2 * a)` is smoothstep on the already-clamped
 *  minimum — NOT `smoothA(a)`, because `a` is clamped by construction and the
 *  original spelled the polynomial out. Kept spelled out so the extraction is
 *  textually verbatim. */
export function bandOpacity(p, band) {
  if (!band) return 0;
  const { lo, hi } = band;
  if (p <= lo - COPY_FADE_P || p >= hi + COPY_FADE_P) return 0;
  const inLo = lo <= -1 ? 1 : Math.min(1, Math.max(0, (p - (lo - COPY_FADE_P)) / COPY_FADE_P));
  const inHi = hi >= 2 ? 1 : Math.min(1, Math.max(0, ((hi + COPY_FADE_P) - p) / COPY_FADE_P));
  const a = Math.min(inLo, inHi);
  return a * a * (3 - 2 * a);
}
