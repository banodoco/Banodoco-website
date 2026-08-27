// journey-v6 constants — fog & seam-threshold domain.
//
// Split out of journey/constants.js (F01, 2026-08-21): the seam-crossing fog
// dips, the Owned->Final fog re-parameterisation ramp, and the seam
// hysteresis/dwell thresholds — verbatim (values, names, types, and their
// original comments unchanged). SEAM_FOG_DIPS and FOG_RAMP are computed
// exports (depend on route.js's startOf/restProgress, exactly as before the
// split); the three THRESHOLD_* exports are plain literals.
// journey/constants.js re-exports every name below unchanged; see that file
// for the compatibility facade.
import { startOf, restProgress } from '../route.js';

/* ------------------------------------------------------------------ */
/* Seam crossings read as passing THROUGH something (W3-B, gap d)      */
/* ------------------------------------------------------------------ */
// Brief, pure-in-p fog thickenings centred on the physical crossings the
// path makes: the cap's shadow band (the camera drops past the rim's height
// on the Connect descent — OUTSIDE it since the D16 ground restage, same p)
// and T3 (substrate swallows the frame on the soil crossing).
// Multiplicative dips on near/far; zero at every rest anchor, perfectly
// reversible. T1 stays purely a streaming trigger (ADR: no visual), T4's
// crossing is carried by the fog ramp opening below.
// Centres are authored as leg-relative offsets from the manifest, so a
// re-timed route carries the crossings with it. Shipped values: rim-shadow
// at connect.start + 0.056 = 0.436, T3 at owned.start + 0.093 = 0.693.
//
// T3 0.093 -> 0.088 (2026-08-12, with the Connect rest rebalance). The offset
// is not a taste value: it PINS the murk's peak to the frame where the camera
// physically passes through y = 0, and owned/camera.js says so ("the 0.91 /
// 0.925 pair is what pins the soil crossing"). Dropping the Connect rest's eye
// to 2.0 shortened the dive's whole sink (D0.y 2.647 -> 2.0 against the same
// D1.y -1.18), so the SAME easeY reaches y = 0 earlier: the crossing moved
// p 0.69318 -> 0.68805. Left at 0.093 the camera entered the soil at 90.9% of
// the murk's depth (fog.far 10.556 against the peak's 9.602) and the murk then
// peaked after it was already under — the swallow arriving a beat late. 0.088
// puts the peak back ON the crossing. Re-pinning HERE rather than reshaping
// easeY is deliberate: easeY carries the "one continuous arc" the dive was
// rebuilt for (86883b9), and this is a one-number registration fix that leaves
// the arc untouched. No rest anchor is inside either band, so no reference
// still moves.
export const SEAM_FOG_DIPS = [
  { c: startOf('connect') + 0.056, w: 0.035, near: 0.26, far: 0.34 },  // rim-shadow drop
  { c: startOf('owned') + 0.088,   w: 0.026, near: 0.46, far: 0.52 },  // T3 soil crossing
];

/* ------------------------------------------------------------------ */
/* Fog re-parameterisation (adr-d3 section 4, seam T4)                 */
/* ------------------------------------------------------------------ */
// The hero ships Fog(bg, 7, 20), which fully obscures anything past ~20
// units - the Final pullback would render as flat black. The ramp is a pure
// function of p, so reverse scrubbing restores the hero fog exactly.
//
// W3-B retiming (gap c): near and far open on STAGGERED schedules instead of
// one shared smoothstep, so the reveal breathes open rather than popping.
// The far plane starts easing out during the rise (0.78, before the camera
// crests the soil at ~0.858) and is still opening as the recession begins;
// the near plane holds the substrate's thickness longer and releases late.
// Both are fully open just after the Final rest so dwelling there reads calm.
// Schedule endpoints are route-relative (the ramp belongs to the Owned->Final
// legs): far opens from owned.start+0.18 (=0.78, during the rise) to the
// final rest +0.02 (=0.945); near holds until final.start-0.015 (=0.835) and
// is fully open at rest +0.03 (=0.955).
export const FOG_RAMP = {
  far:  62, farFromP:  startOf('owned') + 0.18,   farToP:  restProgress('final') + 0.02,
  near: 15, nearFromP: startOf('final') - 0.015,  nearToP: restProgress('final') + 0.03,
};

// Streaming seam windows live in seams.js — the single source.

// Hysteresis so a shaky scrub cannot strobe the streamer.
export const THRESHOLD_HYSTERESIS_WORLD = 0.15;  // world units
export const THRESHOLD_HYSTERESIS_DEG   = 8;     // degrees, for the azimuth seam
export const THRESHOLD_MIN_DWELL_MS     = 250;   // before a reverse crossing retires anything
