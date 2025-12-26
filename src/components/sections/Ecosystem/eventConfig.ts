// =============================================================================
// EVENT CONFIGURATION
// =============================================================================

import { STAGE_X, SVG_CONFIG, COLORS } from './config';

// =============================================================================
// TYPES
// =============================================================================

export type Stage = 'contributors' | 'tools' | 'artists' | 'fans';

export interface InternalEvent {
  type: 'internal';
  from: Stage;
  to: Stage;
}

export interface ExternalEvent {
  type: 'external';
  target: Stage;
  label: string;
}

export type EcosystemEvent = InternalEvent | ExternalEvent;

// =============================================================================
// CONSTANTS
// =============================================================================

/** All stages in flow order (left to right) */
const STAGES: Stage[] = ['contributors', 'tools', 'artists', 'fans'];

/** Valid internal transitions (can only go "upstream" - right to left in the flow) */
const INTERNAL_TRANSITIONS: Array<{ from: Stage; to: Stage }> = [
  { from: 'fans', to: 'artists' },
  { from: 'fans', to: 'tools' },
  { from: 'fans', to: 'contributors' },
  { from: 'artists', to: 'tools' },
  { from: 'artists', to: 'contributors' },
  { from: 'tools', to: 'contributors' },
];

/** External event labels by target stage */
const EXTERNAL_LABELS: Record<Stage, string[]> = {
  contributors: ['Open Source Grant', 'Dev Bounty', 'Core Funding'],
  tools: ['Model Released', 'API Update', 'New Framework'],
  artists: ['Art Contest', 'Creator Fund', 'Workshop'],
  fans: ['Product Launch', 'Free Access', 'Community Event'],
};

// =============================================================================
// TIMING
// =============================================================================

export const EVENT_TIMING = {
  labelAppearDuration: 400,   // Label fades in first
  pathDrawDuration: 600,      // Then path draws (wave starts when this ends)
  fadeoutDuration: 400,       // Fade out everything
} as const;

// =============================================================================
// COORDINATES & POSITIONING
// =============================================================================

// Re-export for use in EventAnimation
export { SVG_CONFIG } from './config';

/** External events originate from this area (left side of visualization) */
export const BANODOCO_SOURCE = {
  x: 30,
  yMin: 150,
  yMax: 450,
} as const;

/** Get a random Y position for external event source */
export const getRandomSourceY = (): number => {
  return BANODOCO_SOURCE.yMin + Math.random() * (BANODOCO_SOURCE.yMax - BANODOCO_SOURCE.yMin);
};

/** Get the X position where a stage's lines END (right edge) */
export const getStageX = (stage: Stage): number => {
  switch (stage) {
    case 'contributors': return STAGE_X.start;
    case 'tools': return STAGE_X.tools;
    case 'artists': return STAGE_X.artists;
    case 'fans': return STAGE_X.fans;
  }
};

/** Get the X position where a stage BEGINS (left edge where lines flow INTO it) */
export const getStageInputX = (stage: Stage): number => {
  switch (stage) {
    case 'contributors': return STAGE_X.start;   // 40 - where contributors originate
    case 'tools': return STAGE_X.reigh;          // 240 - left edge of tools section
    case 'artists': return STAGE_X.tools;        // 440 - left edge of artists section
    case 'fans': return STAGE_X.artists;         // 760 - left edge of fans section
  }
};

/** Get the color for a stage */
export const getStageColor = (stage: Stage): string => {
  return COLORS[stage];
};

// =============================================================================
// PATH GENERATORS
// =============================================================================

/** 
 * Generate SVG path for internal events.
 * Loops down and around to approach target from the left (flow direction).
 */
export const getInternalEventPath = (from: Stage, to: Stage): string => {
  const fromX = getStageX(from);
  const toX = getStageInputX(to);
  const centerY = SVG_CONFIG.centerY;

  const loopBottom = centerY + 120;
  const overshootX = toX - 100;  // How far left of target to swing
  const approachX = toX - 60;    // Where final approach begins

  return `M ${fromX} ${centerY}
    Q ${(fromX + overshootX) / 2} ${loopBottom + 30}, 
      ${overshootX} ${loopBottom}
    Q ${overshootX - 50} ${loopBottom - 40}, 
      ${overshootX - 50} ${centerY + 20}
    Q ${overshootX - 50} ${centerY - 40}, 
      ${approachX} ${centerY - 30}
    Q ${toX - 20} ${centerY - 15}, 
      ${toX} ${centerY}`;
};

/** 
 * Generate SVG path for external events.
 * Smooth curve from Banodoco source to target stage.
 */
export const getExternalEventPath = (target: Stage, sourceY: number): string => {
  const targetX = getStageInputX(target);
  const centerY = SVG_CONFIG.centerY;

  const cp1x = BANODOCO_SOURCE.x + 100;
  const cp1y = sourceY - 60;
  const cp2x = targetX - 80;
  const cp2y = centerY;

  return `M ${BANODOCO_SOURCE.x} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${centerY}`;
};

// =============================================================================
// EVENT GENERATORS
// =============================================================================

/** Generate a random internal event (user "leveling up" in the ecosystem) */
export const generateRandomInternalEvent = (): InternalEvent => {
  const transition = INTERNAL_TRANSITIONS[Math.floor(Math.random() * INTERNAL_TRANSITIONS.length)];
  return {
    type: 'internal',
    from: transition.from,
    to: transition.to,
  };
};

/** Generate a random external event (Banodoco action) */
export const generateRandomExternalEvent = (): ExternalEvent => {
  const target = STAGES[Math.floor(Math.random() * STAGES.length)];
  const labels = EXTERNAL_LABELS[target];
  const label = labels[Math.floor(Math.random() * labels.length)];
  return {
    type: 'external',
    target,
    label,
  };
};

/** Generate a random event (50% internal, 50% external) */
export const generateRandomEvent = (): EcosystemEvent => {
  return Math.random() < 0.5
    ? generateRandomInternalEvent()
    : generateRandomExternalEvent();
};
