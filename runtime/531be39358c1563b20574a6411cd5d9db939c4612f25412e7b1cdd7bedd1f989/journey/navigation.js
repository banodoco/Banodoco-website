import { JOURNEY_CHAPTER_IDS, JOURNEY_SCHEMA } from './structure.js';

/* ================================================================
   THE UNIFIED TURN GRAMMAR (2026-09-01, the owner)
   ================================================================
   "One general system that applies the whole way: going left-to-right in
   the navigation the camera goes around the mushroom in one rotational
   sense; going right-to-left, the opposite sense." A nav jump toward a
   LATER chapter is forced into the forward sense, toward an EARLIER one
   into the opposite, judged by the direction of travel alone — a jump
   that skips chapters follows the same rule. The rest azimuths are
   deliberately NOT consulted: the route's own azimuths are not monotone
   in nav order (Equip rests at 200 deg between Inspire's 115 and
   Connect's 61.8; Final sits back at -79.6), so the grammar forces the
   long way round wherever the short way would read as turning against
   the direction of travel. Measured on the shipped rests, that flipped
   13 of the 30 ordered pairs when this law landed; the other 17 —
   including every leg the owner had approved by eye — were already
   turning this way.

   TURN_FORWARD is the measured azimuth sign of those approved legs
   (Mission -> Inspire +127.7 deg, Inspire -> Equip +85.0,
   Equip -> Connect +221.8, all monotone): +1, increasing atan2(x, z) —
   on screen, the camera trucking around the specimen to its own right,
   the world streaming leftward through frame.

   One deliberate boundary, owned where it acts (journey.js az1): the two
   bookend wraps take the seam's own clause (the WAY HOME block): each
   wrap continues its own travel across the seam, the whole way around —
   one ceremonial lap plus the step home (final -> mission forward,
   mission -> final backward; the owner's 2026-09-01 clarification,
   superseding the same morning's always-forward reading).

   A LEG THAT OVERTAKES A LIVE BLEND ONCE KEPT THE SHORTEST WAY — recorded
   as a deliberate divergence when this grammar landed ("a mid-flight change
   of mind is a step back, not a lap"). The owner retired it on 2026-09-02:
   a retarget obeys the law like every other move, reading it through
   travelSense below from the coordinate the camera is painted at. */
export const TURN_FORWARD = 1;

/** The grammar as one function: the rotational sense any rest-departing
 *  nav jump is forced into, from nav order alone. */
export function navSense(fromId, toId) {
  return JOURNEY_CHAPTER_IDS.indexOf(toId) > JOURNEY_CHAPTER_IDS.indexOf(fromId)
    ? TURN_FORWARD : -TURN_FORWARD;
}

/** THE SAME COMPARATOR, CARRIED TO A MID-FLIGHT ORIGIN (2026-09-02, the
 *  owner: "when travelling between items, if I click to a new item halfway,
 *  it doesn't respect the clockwise/anticlockwise principle"). A retarget is
 *  judged by the direction it travels along the ride from where the camera is
 *  PAINTED — a target later in the ride turns forward, earlier turns backward
 *  — which on a rest coordinate is navSense itself, because rest progress and
 *  nav order are the same order. One law with two doors, never two laws that
 *  could drift apart; the suite asserts they agree on all thirty pairs. */
export function travelSense(fromP, toP) {
  return toP > fromP ? TURN_FORWARD : -TURN_FORWARD;
}

/** The rail is linear, but its two true bookends meet across a hidden seam.
 * Only Intro <-> Outro owns the authored long orbit: its camera path and its
 * hero furniture choreography were designed together for those endpoint
 * poses. Extending the wrap to a near-end chapter makes the camera inherit
 * endpoint-only scale/copy terms mid-flight, producing a visible size pulse
 * and an early hero-text appearance. Every non-bookend pair therefore stays
 * an ordinary direct jump. */
export function controlWrapDirection(fromId, targetId) {
  if (fromId === 'mission' && targetId === 'final') return -1;
  if (fromId === 'final' && targetId === 'mission') return 1;
  return 0;
}

/** Resolve legacy node aliases without changing chapter navigation state.
 *  THE ONLY PLACE ALIASES ARE APPLIED. `structure.js` declares the table;
 *  this applies it. Both doors into the router — the boot deep link and a
 *  hash that arrives afterwards (`state.js` `parseHash`) — come through
 *  here, so a rule added to the schema takes effect at both. */
export function normaliseNode(chapterId, nodeId) {
  if (!nodeId) return null;
  nodeId = JOURNEY_SCHEMA.aliases.nodes[nodeId] || nodeId;
  for (const alias of JOURNEY_SCHEMA.aliases.patterns) {
    if (alias.pattern.test(nodeId)) nodeId = nodeId.replace(alias.pattern, alias.replacement);
  }
  // the epilogue has no detail state
  if (chapterId === 'final') return null;
  return nodeId;
}
