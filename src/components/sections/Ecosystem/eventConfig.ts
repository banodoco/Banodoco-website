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
  label: string;
}

export interface ExternalEvent {
  type: 'external';
  target: Stage;
  label: string;
}

export type EcosystemEvent = InternalEvent | ExternalEvent;

/** An event instance with tracking info for multi-event management */
export interface ActiveEvent {
  id: string;
  event: EcosystemEvent;
  startTime: number;
  sourceY?: number; // For external events - pre-computed to avoid collisions
  delay?: number; // Stagger delay in ms for batch animations
}

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

/** Internal event labels - why someone from one group participates in another */
const INTERNAL_LABELS: Record<string, string[]> = {
  // Fan inspired to create
  'fans→artists': [
    'Inspired to create',
    'Joins fan art challenge',
    'Wants to make their own',
    'Recreates favorite style',
    'Enters remix contest',
    'Collaborates with artist',
  ],
  // Fan wants to help artists/build for them
  'fans→tools': [
    'Makes tools for artists',
    'Builds workflow for friend',
    'Solves artist\'s problem',
    'Creates Discord bot',
    'Automates for community',
  ],
  // Fan helps the ecosystem directly
  'fans→contributors': [
    'Helps with feedback',
    'Answers in Discord',
    'Writes docs',
    'Reports bug',
    'Translates content',
    'Moderates community',
  ],
  // Artist builds for fans/improves their process
  'artists→tools': [
    'Builds tools for fans',
    'Modifies their pipeline',
    'Creates LoRA for fans',
    'Shares custom workflow',
    'Automates their process',
    'Develops style preset',
  ],
  // Artist gives back to community
  'artists→contributors': [
    'Writes a tutorial',
    'Shares their workflow',
    'Mentors new artists',
    'Open sources presets',
    'Streams their process',
    'Creates learning content',
  ],
  // Tool builder joins core development
  'tools→contributors': [
    'PR merged upstream',
    'Maintains a package',
    'Joins core tool team',
    'Reviews PRs',
    'Fixes critical bug',
    'Improves docs',
  ],
};

/** External event labels - what attracts NEW people to each stage */
const EXTERNAL_LABELS: Record<Stage, string[]> = {
  contributors: ['Open source grant', 'Dev bounty', 'Hackathon announced', 'Mentorship program', 'Core team opening', 'Bug bounty'],
  tools: ['New model released', 'New framework', 'Major update shipped', 'Performance breakthrough', 'New integration'],
  artists: ['Art contest', 'Creator fund', 'Artist spotlight', 'Workshop announced', 'Collab opportunity', 'Commission marketplace'],
  fans: ['Artist releases new work', 'Viral creation shared', 'New app launched', 'Free access event', 'Featured in media', 'Celebrity uses tool'],
};

// =============================================================================
// TIMING
// =============================================================================

export const EVENT_TIMING = {
  labelAppearDuration: 250,   // Label fades in first
  pathDrawDuration: 450,      // Then path draws (wave starts when this ends)
  fadeoutDuration: 300,       // Fade out everything
} as const;

// =============================================================================
// COORDINATES & POSITIONING
// =============================================================================

// Re-export for use in EventAnimation
export { SVG_CONFIG } from './config';

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

// =============================================================================
// EVENT GENERATORS
// =============================================================================

/** Generate a random internal event (user "leveling up" in the ecosystem) */
export const generateRandomInternalEvent = (): InternalEvent => {
  const transition = INTERNAL_TRANSITIONS[Math.floor(Math.random() * INTERNAL_TRANSITIONS.length)];
  const key = `${transition.from}→${transition.to}`;
  const labels = INTERNAL_LABELS[key] || ['Levels up'];
  const label = labels[Math.floor(Math.random() * labels.length)];
  return {
    type: 'internal',
    from: transition.from,
    to: transition.to,
    label,
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

// =============================================================================
// MULTI-EVENT MANAGEMENT
// =============================================================================

/** 
 * Get max concurrent events based on progress (0 → 1).
 * 2025: 1 event, 2085+: 6 events
 */
export const getMaxConcurrentEvents = (progress: number): number => {
  // progress 0 = 2025, progress ~0.857 = 2085 (60/70 years), progress 1 = 2095
  // Scale from 1 to 6, reaching 6 at progress ~0.857 (2085)
  const targetProgress = 60 / 70; // 2085 is 60 years into a 70 year span
  const scaledProgress = Math.min(progress / targetProgress, 1);
  return Math.floor(1 + scaledProgress * 5); // 1 → 6
};

/**
 * Get spawn interval based on progress.
 * Early years = slower spawns, later years = faster
 */
export const getSpawnInterval = (progress: number): number => {
  // Early: 1800ms, Late: 500ms between spawn attempts
  return Math.floor(1800 - progress * 1300);
};

/** Check if a stage is already targeted by an active event */
export const isStageOccupied = (stage: Stage, activeEvents: ActiveEvent[]): boolean => {
  return activeEvents.some(ae => {
    const target = ae.event.type === 'internal' ? ae.event.to : ae.event.target;
    return target === stage;
  });
};

/** Check if a stage is already the source of an active internal event */
export const isStageSourceOccupied = (stage: Stage, activeEvents: ActiveEvent[]): boolean => {
  return activeEvents.some(ae => {
    if (ae.event.type === 'internal') {
      return ae.event.from === stage;
    }
    return false;
  });
};

/** Count active internal events (limit these to avoid visual chaos) */
export const countActiveInternalEvents = (activeEvents: ActiveEvent[]): number => {
  return activeEvents.filter(ae => ae.event.type === 'internal').length;
};

/** 
 * Y-zone management for external events to prevent label overlap.
 * Divides the source area into zones and finds an available one.
 */
const EXTERNAL_Y_ZONES = (() => {
  const centerY = SVG_CONFIG.centerY;
  const minDist = BANODOCO_SOURCE.minDistanceFromCenter;
  
  // Create zones above and below center
  const zones: Array<{ min: number; max: number }> = [];
  
  // Above center: divide into 3 zones
  const aboveStart = BANODOCO_SOURCE.yMin;
  const aboveEnd = centerY - minDist;
  const aboveHeight = (aboveEnd - aboveStart) / 3;
  for (let i = 0; i < 3; i++) {
    zones.push({ 
      min: aboveStart + i * aboveHeight, 
      max: aboveStart + (i + 1) * aboveHeight 
    });
  }
  
  // Below center: divide into 3 zones
  const belowStart = centerY + minDist;
  const belowEnd = BANODOCO_SOURCE.yMax;
  const belowHeight = (belowEnd - belowStart) / 3;
  for (let i = 0; i < 3; i++) {
    zones.push({ 
      min: belowStart + i * belowHeight, 
      max: belowStart + (i + 1) * belowHeight 
    });
  }
  
  return zones;
})();

/** Get which zone a Y value falls into (0-5, or -1 if none) */
const getYZoneIndex = (y: number): number => {
  return EXTERNAL_Y_ZONES.findIndex(zone => y >= zone.min && y <= zone.max);
};

/** Get an available Y position for an external event, avoiding occupied zones */
export const getAvailableSourceY = (activeEvents: ActiveEvent[]): number | null => {
  // Find which zones are occupied by active external events
  const occupiedZones = new Set<number>();
  activeEvents.forEach(ae => {
    if (ae.event.type === 'external' && ae.sourceY !== undefined) {
      const zoneIdx = getYZoneIndex(ae.sourceY);
      if (zoneIdx >= 0) occupiedZones.add(zoneIdx);
    }
  });
  
  // Find available zones
  const availableZones = EXTERNAL_Y_ZONES.map((zone, idx) => ({ zone, idx }))
    .filter(({ idx }) => !occupiedZones.has(idx));
  
  if (availableZones.length === 0) return null;
  
  // Pick a random available zone
  const { zone } = availableZones[Math.floor(Math.random() * availableZones.length)];
  
  // Return a random Y within that zone
  return zone.min + Math.random() * (zone.max - zone.min);
};

/** 
 * Try to generate a valid event that doesn't conflict with active events.
 * Returns null if no valid event can be generated.
 */
export const generateNonConflictingEvent = (
  activeEvents: ActiveEvent[]
): { event: EcosystemEvent; sourceY?: number } | null => {
  const maxAttempts = 10;
  
  // Limit internal events to 2 at a time to avoid visual chaos
  const canDoInternal = countActiveInternalEvents(activeEvents) < 2;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Decide internal vs external
    const tryInternal = canDoInternal && Math.random() < 0.5;
    
    if (tryInternal) {
      const event = generateRandomInternalEvent();
      // Check if target stage is free
      if (!isStageOccupied(event.to, activeEvents) && 
          !isStageSourceOccupied(event.from, activeEvents)) {
        return { event };
      }
    } else {
      const event = generateRandomExternalEvent();
      // Check if target stage is free
      if (!isStageOccupied(event.target, activeEvents)) {
        // Find available Y position
        const sourceY = getAvailableSourceY(activeEvents);
        if (sourceY !== null) {
          return { event, sourceY };
        }
      }
    }
  }
  
  return null;
};

/** Generate a unique ID for an event */
let eventIdCounter = 0;
export const generateEventId = (): string => {
  return `event-${++eventIdCounter}-${Date.now()}`;
};

/** Stagger delay between events in a batch (ms) */
const EVENT_STAGGER_MS = 120;

/**
 * Generate a batch of N non-conflicting events with staggered start times.
 * Used for the batch-based system where events fire together but slightly offset.
 */
export const generateEventBatch = (count: number): ActiveEvent[] => {
  const batch: ActiveEvent[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const result = generateNonConflictingEvent(batch);
    if (!result) break; // Can't generate more non-conflicting events
    
    batch.push({
      id: generateEventId(),
      event: result.event,
      startTime: now,
      sourceY: result.sourceY,
      delay: i * EVENT_STAGGER_MS, // Stagger each event
    });
  }
  
  return batch;
};
