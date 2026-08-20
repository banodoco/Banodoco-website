import { JOURNEY_SCHEMA } from './structure.js';

/** Resolve legacy node aliases without changing chapter navigation state. */
export function normaliseNode(chapterId, nodeId) {
  if (!nodeId) return null;
  nodeId = JOURNEY_SCHEMA.aliases.nodes[nodeId] || nodeId;
  for (const alias of JOURNEY_SCHEMA.aliases.patterns) {
    if (alias.pattern.test(nodeId)) nodeId = nodeId.replace(alias.pattern, alias.replacement);
  }
  if (chapterId === 'final') return null;
  return nodeId;
}
