// journey-v6 constants — camera motion domain.
//
// Split out of journey/constants.js (F01, 2026-08-21): the documentary
// handheld wander, the orbit-breath ease variation, and Connect's approach
// ramp — verbatim (values, names, types, and their original comments
// unchanged). All three are plain literals; no route.js/structure.js
// dependency. journey/constants.js re-exports every name below unchanged;
// see that file for the compatibility facade.

/* ------------------------------------------------------------------ */
/* Documentary handheld layer (W3-B, gap a)                            */
/* ------------------------------------------------------------------ */
// A very-low-amplitude, low-frequency wander on the analytic camera — the
// difference between a motion-control move and an observed one. Deterministic
// (seeded sine bank, no Math.random) so audits reproduce; ?steady=1 disables
// it entirely; amplitude goes to EXACTLY zero within restFadeP of every rest
// anchor so rest poses stay byte-identical, and it fades out under fast
// scrub so it can never read as shake.
export const HANDHELD = {
  ampDeg:    0.34,   // peak angular wander, degrees (~0.9% of frame at fov 38)
  posAmp:    0.016,  // translational component, world units (rotation dominates)
  restFadeP: 0.018,  // zero within this p-distance of any rest anchor
  scrubLo:   0.06,   // p/s: full amplitude below this scrub speed
  scrubHi:   0.16,   // p/s: fully suppressed above
};

/* ------------------------------------------------------------------ */
/* Orbit breathing (W3-B, gap b)                                       */
/* ------------------------------------------------------------------ */
// The trapezoid killed the 145 deg/s whip but left the plateau conveyor-
// constant. This adds a barely-perceptible ease variation along the swing:
// +/- ~9% of the plateau rate, 1.7 slow cycles, windowed to zero inside the
// ramps so the endpoints and their zero-velocity joins are untouched. Peak
// rate rises ~39 -> ~42 deg/s; monotonicity is preserved (0.107 << 1.22).
export const ORBIT_BREATH = { amp: 0.010, cycles: 1.7 };

// Connect's ground lights keep travelling almost to the rest. Giving its
// camera the shared 18%-of-leg landing ramp made the camera nearly stationary
// for that whole finale, so the remaining light motion read as a scroll stall
// followed by a roll-through. It keeps the same trapezoidal movement language,
// but lands over only the final 8% of this leg.
export const CONNECT_APPROACH_RAMP = 0.08;
