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

/* ==================================================================== *
 * NAVIGATION COPY TIMING — WHEN words leave and arrive on a direct
 * navigation, in seconds. (Lives beside the band curve: both are pure
 * answers to "how visible is this copy now", and this file is the one
 * the node harnesses can already execute.)
 *
 * 2026-10-04 — Hannah: Connect -> Epilogue's text "feels great, for the
 * rest it mostly feels too fast", and then: "does the fade out match that?"
 * Both ends used to be fixed SHARES of the camera flight's eased phase, so
 * every fade was a fixed fraction of a flight that runs anywhere from 1.3 s
 * to 3.4 s: words left in 0.27-0.67 s and arrived in 0.20-0.49 s depending
 * only on how far the camera had to go. The rim flyby she liked is the
 * longest ordinary leg, which is why it was the one that felt right.
 *
 * Every ordinary leg now spends the flyby's own seconds:
 *
 *   departure  a smoothstep of DEPART_S (90->10% ~0.6 s), from a short beat
 *              after the click;
 *   arrival    a smoothstep of ARRIVE_S (10->90% ~0.5 s) that lands
 *              ARRIVE_LEAD_S before the camera does, never earlier than
 *              half-way through the flight, and never before the departure
 *              has had DEPART_MIN_S to go.
 *
 * On long legs both fit inside the flight, exactly as the flyby did. On the
 * shortest ones the departure keeps its unhurried length, and the arrival
 * yields instead — finishing a few tenths after the camera settles rather
 * than overlapping the outgoing words or snapping in. Pure and DOM-free:
 * the copy layer (copy-arrival.js) and the hero furniture (journey.js)
 * read the same schedule off the same ticket clock.
 * ==================================================================== */

const DEPART_DELAY_MAX_S = 0.45;  // the beat before words start to leave...
const DEPART_DELAY_SHARE = 0.12;  // ...or this share of a shorter flight
const DEPART_S = 1.0;
const DEPART_MIN_S = 0.8;
const ARRIVE_S = 0.8;
const ARRIVE_LEAD_S = 1.3;
const ARRIVE_MIN_SHARE = 0.5;

/** The schedule for a flight of `dur` seconds. */
export function navCopySchedule(dur) {
  const departStart = Math.min(DEPART_DELAY_MAX_S, DEPART_DELAY_SHARE * dur);
  const arriveStart = Math.max(ARRIVE_MIN_SHARE * dur, dur - ARRIVE_LEAD_S,
    departStart + DEPART_MIN_S);
  return {
    departStart,
    departDur: Math.min(DEPART_S, arriveStart - departStart),
    arriveStart,
    arriveDur: ARRIVE_S,
  };
}

/** Outgoing words' opacity multiplier, `t` seconds into a `dur` s flight. */
export function navCopyDeparture(t, dur) {
  const s = navCopySchedule(dur);
  return 1 - smoothA((t - s.departStart) / s.departDur);
}

/** Incoming words' arrival fraction (0..1). May reach 1 after `dur`. */
export function navCopyArrival(t, dur) {
  const s = navCopySchedule(dur);
  return smoothA((t - s.arriveStart) / s.arriveDur);
}

/** A ticket's declared duration and elapsed seconds, or null if it is one
 *  that predates the seconds law (it then keeps its phase envelope). */
export function ticketClock(ticket) {
  const dur = Number(ticket && ticket.dur);
  const t = Number(ticket && ticket.elapsed);
  return dur > 0 && Number.isFinite(dur) && Number.isFinite(t) ? { t, dur } : null;
}
