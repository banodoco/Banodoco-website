// The road — the journey's pure pixel↔route mapping.
//
// A closed, pure, clock-free sub-machine. Seven pieces of state — `segLens`,
// `total`, `kx`, `ky`, `km`, `invX`, `invY` — written only by `resize()` and
// `buildSpline()`; no function here writes anything outside them; the whole
// read-set beyond its own state is `SEGMENTS` and `clamp01`; and there is not
// one clock read in the file.
//
// WHAT IS NOT HERE, and why. `measure()` stays in `scroll.js`: it reads and
// writes `v` and `carry`, which are the visitor's surface, not the road. Only
// its middle came out — `resize(h)` below — and the height it needs arrives as
// a PARAMETER. That is the whole reason this module reads no viewport:
// `Math.max(320, window.innerHeight)` is evaluated by `measure()`, one level
// up. There is no `window.innerHeight` read in this file, and there must not
// become one.
//
// ===========================================================================
// DO NOT DERIVE `total` FROM `segLens`. IT IS NOT THE SAME NUMBER.
// ---------------------------------------------------------------------------
// `total` is summed from CHAPTERS' `scrollVh`; the spline's last knot `kx[n]`
// is accumulated from SEGMENTS' `vh`. They are two different arrays over the
// same road, and the obvious tidy during this extraction — dropping `lens` and
// reducing `segLens` instead, since this module already holds it — CHANGES THE
// SHIPPED NUMBERS. Measured against the real route.js:
//
//     h        total (CHAPTERS)      kx[last] (SEGMENTS)   delta        ULPs
//     812      33227.03999999999     33227.04              7.276e-12    1
//     932      38137.439999999995    38137.44              7.276e-12    1
//     900/1080/1440/800/720/320      identical             0            0
//
// Height-independent root: `sum(scrollVh)` is 40.919999999999995 where
// `acc(segVh)` is 40.92. h = 812 and h = 932 are both real device heights
// (iPhone X-class and 14-Pro-Max-class). Downstream, shipped `pAt(total)` is
// 0.9999999999999996 at both, where the tidied form returns exactly 1: `pAt`
// clamps to `[0, total]`, and with `total < kx[n]` the final span's `u` stays
// just under 1. `buildSpline`'s inverse sampling then carries that into
// `invY` — max |ΔinvY| 6.66e-16 — and `invY` is what `scrollFor` interpolates.
//
// `structure.js`'s `validateRawChapter` throws unless each chapter's `segVh` sums to its
// `scrollVh` within 1e-9. That guard BOUNDS this divergence at one ULP; it does
// not remove it, and it cannot — an exact-equality guard would reject the
// manifest the site ships. The guard is the reason the gap is small. It is not
// a reason it is zero.
//
// So: `lens` stays, the `CHAPTERS.map(...)` expression stays character for
// character, and `tools/test-road.mjs` pins it.
// ===========================================================================

import { CHAPTERS, SEGMENTS } from './route.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createRoad() {
  let segLens = [];     // px allocated per route SEGMENT — the spline's knots
  let total = 0;

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
  //
  // The knots are the ROUTE'S SEGMENTS (route.js SEGMENTS), not its chapters:
  // a chapter that declares `segVh` puts a knot at each of its own rest stops
  // too, which is how the Final end-hold can be given 0.6 vh while its arrival
  // takes 17.0 (2026-08-11). A chapter that declares nothing is still exactly
  // one segment, so this list is bit-identical to the old chapter list for
  // every such chapter.
  let kx = [], ky = [], km = [];
  let invX = [], invY = [];   // sampled inverse, for p -> px

  function buildSpline() {
    kx = [0]; ky = [0];
    for (let i = 0; i < SEGMENTS.length; i++) {
      kx.push(kx[i] + segLens[i]);
      ky.push(SEGMENTS[i].end);
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
    /* A DECLARED SHAPE OVERRIDES THE INFERRED TANGENTS (route.js `shape`).
       Fritsch-Carlson derives a knot's tangent from its NEIGHBOURS' densities,
       which is right when the allocations are comparable and wrong when the
       route deliberately makes them differ by 10x: the Final arrival sits
       between a chapter at 20 vh per unit p and a hold at 20, while itself
       running at 142, so its own curve was being dictated from both ends by
       roads it has nothing to do with. Re-imposing k0/k1 as multiples of the
       SEGMENT'S OWN mean slope makes its normalised gain curve independent of
       how much scroll it is given — so raising its allocation is a pure
       stretch, and every p-interval inside it slows by the same factor
       (measured: 0.2% spread across 72 bodies, 18-one-species.md §17).

       Monotonicity is still enforced, and it still binds: a Hermite segment is
       monotone while its end tangents stay within 3x its mean slope, so the
       clamp below keeps a mis-typed k from minting a spline that runs
       backwards. It is a guard, not a shaper — today's k values pass it
       untouched. */
    for (let i = 0; i < n; i++) {
      const k = SEGMENTS[i].k;
      if (!k) continue;
      const lim = 3 * Math.abs(d[i]);
      km[i] = Math.sign(d[i]) * Math.min(Math.abs(k[0] * d[i]), lim);
      km[i + 1] = Math.sign(d[i]) * Math.min(Math.abs(k[1] * d[i]), lim);
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

  /** journey progress -> virtual px (inverse of the same monotone spline)
   *
   *  NOTE FOR ANYONE DIFFING THIS AGAINST scroll.js: the parameter `p` used to
   *  SHADOW the model's own `p` — the displayed progress — one scope up, and
   *  `eslint.config.js` has no `no-shadow` rule to say so (A05 D-A05-5). The
   *  identifier was the same and the meaning never was. Here there is no outer
   *  `p` to shadow, so the name finally means only what it says. The body is
   *  otherwise byte-for-byte what it was. */
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

  /** Lay the road out for a viewport height, in px, and rebuild the spline.
   *
   *  The verbatim middle of `scroll.js`'s `measure()`. `h` is a PARAMETER — the
   *  `Math.max(320, window.innerHeight)` floor is still evaluated by the caller
   *  (design.md §4.4's own seam), which is why no viewport read lives in this
   *  module. The caller keeps the surface continuous across the rebuild by
   *  reading `pAt(v)` before calling and `scrollFor(keepP)` after; that
   *  sequencing is the caller's, not the road's.
   *
   *  See this file's header before touching the `lens` line. */
  function resize(h) {
    const lens = CHAPTERS.map(c => (c.scrollVh || 2) * h);   // px per chapter, only needed to size total — allocations live in route.js
    // ...and the spline's own knots are the SUB-segment allocations, which for
    // a chapter that declares no `segVh` is just that same one number.
    segLens = SEGMENTS.map(s => (s.vh || 2) * h);
    total = lens.reduce((a, b) => a + b, 0);
    buildSpline();
  }

  /** Scroll length (px) of the road at a given p — the ?nosnap=1 magnet band
   *  scales with it, and nothing else reads it.
   *
   *  THE SEGMENT, not the chapter (2026-08-11). The band is meant to be "a
   *  fraction of the road you are on", and while a chapter was one segment
   *  those were the same sentence. They stopped being: with the Inspire tail
   *  trimmed to 2.1 vh inside a 5.6 vh chapter, a chapter-wide band reached
   *  most of the way across the tail and swallowed p = 0.36 — the deep-scrub
   *  flag's own gate (scrollgates N1) parked at 0.2666 instead of 0.3600,
   *  i.e. ?p= could no longer stop where it was told. Measuring the band
   *  against the segment restores it and states the intent exactly.
   *
   *  Its `p` shadowed the model's `p` too — same note as `scrollFor` above. */
  function lengthAtP(p) {
    for (let i = 0; i < SEGMENTS.length; i++) {
      if (p <= SEGMENTS[i].end || i === SEGMENTS.length - 1) return segLens[i];
    }
    return segLens[segLens.length - 1];
  }

  return {
    pAt,
    scrollFor,
    lengthAtP,
    resize,
    get total() { return total; },
  };
}
