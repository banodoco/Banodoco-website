// =============================================================================
// EVENT PATH GENERATORS
// =============================================================================

import { STAGE_X, SVG_CONFIG, COLORS } from './config';
import type { Stage } from './eventTypes';

// =============================================================================
// COORDINATES & POSITIONING
// =============================================================================

/** External events originate from this area (left side of visualization) */
export const BANODOCO_SOURCE = {
  x: 30,
  yMin: 120,
  yMax: 480,
  minDistanceFromCenter: 80, // Avoid spawning too close to the river line
} as const;

/** Get a random Y position for external event source (avoids center line) */
export const getRandomSourceY = (): number => {
  const centerY = SVG_CONFIG.centerY;
  const minDist = BANODOCO_SOURCE.minDistanceFromCenter;
  
  // Two valid zones: above center and below center
  const aboveRange = { min: BANODOCO_SOURCE.yMin, max: centerY - minDist };
  const belowRange = { min: centerY + minDist, max: BANODOCO_SOURCE.yMax };
  
  // Randomly pick above or below
  if (Math.random() < 0.5) {
    return aboveRange.min + Math.random() * (aboveRange.max - aboveRange.min);
  } else {
    return belowRange.min + Math.random() * (belowRange.max - belowRange.min);
  }
};

/** Get the X position where a stage's lines END (right edge) */
export const getStageX = (stage: Stage): number => {
  switch (stage) {
    case 'contributors': return STAGE_X.start;
    case 'tools': return STAGE_X.tools;
    case 'artists': return STAGE_X.artists;
    case 'fans': return STAGE_X.fans;
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
};

/** Get the X position where a stage BEGINS (left edge where lines flow INTO it) */
export const getStageInputX = (stage: Stage): number => {
  switch (stage) {
    case 'contributors': return STAGE_X.start;   // 40 - where contributors originate
    case 'tools': return STAGE_X.reigh;          // 240 - left edge of tools section
    case 'artists': return STAGE_X.tools;        // 440 - left edge of artists section
    case 'fans': return STAGE_X.artists;         // 760 - left edge of fans section
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
};

/** Get the color for a stage */
export const getStageColor = (stage: Stage): string => {
  return COLORS[stage];
};

// =============================================================================
// PATH GENERATORS
// =============================================================================

// Padding from SVG edges to keep paths visible
const PADDING = {
  left: 20,
  right: 20,
  top: 30,
  bottom: 30,
} as const;

/** Clamp a value within the visible SVG bounds */
const clampX = (x: number): number => 
  Math.max(PADDING.left, Math.min(SVG_CONFIG.width - PADDING.right, x));

const clampY = (y: number): number => 
  Math.max(PADDING.top, Math.min(SVG_CONFIG.height - PADDING.bottom, y));

/** 
 * Generate SVG path for internal events.
 * Loops down and around to approach target from the left (flow direction).
 * All coordinates are clamped to stay within the visible SVG area.
 */
export const getInternalEventPath = (from: Stage, to: Stage): string => {
  const fromX = getStageX(from);
  const toX = getStageInputX(to);
  const centerY = SVG_CONFIG.centerY;

  // Calculate loop parameters, but constrained to visible area
  const loopDepth = Math.min(100, (SVG_CONFIG.height - PADDING.bottom) - centerY - 20);
  const loopBottom = centerY + loopDepth;
  
  // How far left to swing - make it proportional to distance but stay in bounds
  const distance = fromX - toX;
  const overshootAmount = Math.min(80, distance * 0.15);
  const overshootX = clampX(toX - overshootAmount);
  const loopLeftX = clampX(overshootX - 40);
  const approachX = clampX(toX - 50);

  return `M ${fromX} ${centerY}
    Q ${clampX((fromX + overshootX) / 2)} ${clampY(loopBottom + 20)}, 
      ${overshootX} ${clampY(loopBottom)}
    Q ${loopLeftX} ${clampY(loopBottom - 30)}, 
      ${loopLeftX} ${clampY(centerY + 15)}
    Q ${loopLeftX} ${clampY(centerY - 30)}, 
      ${approachX} ${clampY(centerY - 25)}
    Q ${clampX(toX - 15)} ${clampY(centerY - 12)}, 
      ${toX} ${centerY}`;
};

/** 
 * Generate SVG path for external events.
 * Smooth curve from Banodoco source to target stage.
 * All coordinates are clamped to stay within the visible SVG area.
 */
export const getExternalEventPath = (target: Stage, sourceY: number): string => {
  const targetX = getStageInputX(target);
  const centerY = SVG_CONFIG.centerY;

  // Control points that stay within bounds
  const cp1x = clampX(BANODOCO_SOURCE.x + 100);
  const cp1y = clampY(sourceY - 50);
  const cp2x = clampX(targetX - 80);
  const cp2y = clampY(centerY);

  return `M ${BANODOCO_SOURCE.x} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${centerY}`;
};





