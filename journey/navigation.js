import { JOURNEY_SCHEMA } from './structure.js';

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
