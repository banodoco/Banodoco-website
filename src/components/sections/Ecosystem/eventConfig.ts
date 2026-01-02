// =============================================================================
// EVENT CONFIGURATION - Barrel export
// =============================================================================
// 
// This module re-exports from the split event files for backwards compatibility.
// New code should import directly from the specific modules:
// - eventTypes.ts - Type definitions
// - eventPaths.ts - SVG path generators and coordinate helpers
// - eventGenerators.ts - Event generation and management logic
//

// Types
export type { Stage, InternalEvent, ExternalEvent, EcosystemEvent, ActiveEvent } from './eventTypes';

// Paths & coordinates
export { 
  BANODOCO_SOURCE,
  getRandomSourceY,
  getStageX,
  getStageInputX,
  getStageColor,
  getInternalEventPath,
  getExternalEventPath,
} from './eventPaths';

// Generators & event management
export {
  EVENT_TIMING,
  generateRandomInternalEvent,
  generateRandomExternalEvent,
  generateRandomEvent,
  getMaxConcurrentEvents,
  getSpawnInterval,
  isStageOccupied,
  isStageSourceOccupied,
  countActiveInternalEvents,
  getAvailableSourceY,
  generateNonConflictingEvent,
  generateEventId,
  generateEventBatch,
} from './eventGenerators';

// Re-export SVG_CONFIG for backwards compatibility (originally exported from here)
export { SVG_CONFIG } from './config';
