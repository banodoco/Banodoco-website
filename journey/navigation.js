import { JOURNEY_SCHEMA } from './structure.js';

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
