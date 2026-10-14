// journey-v6 constants — hero handshake domain.
//
// Split out of journey/constants.js (F01, 2026-08-21): the two constants
// that keep journey.js in sync with the hero's own entry choreography —
// verbatim (values, names, types, and their original comments unchanged).
// journey/constants.js re-exports every name below unchanged; see that file
// for the compatibility facade.

/* ------------------------------------------------------------------ */
/* Hero handshake                                                      */
/* ------------------------------------------------------------------ */
// Kept in sync with the ENTRY choreography in hero.css (and main.js's own
// HERO_INTRO_MS, which the page uses before this module ever loads).
export const HERO_INTRO_MS = 7600;
export const DEEP_LINK_DETAIL_DELAY_MS = 600; // settle at the pose, then open
