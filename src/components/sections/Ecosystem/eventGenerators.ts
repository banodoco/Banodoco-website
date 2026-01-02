// =============================================================================
// EVENT GENERATORS
// =============================================================================

import { SVG_CONFIG } from './config';
import type { Stage, InternalEvent, ExternalEvent, EcosystemEvent, ActiveEvent } from './eventTypes';
import { BANODOCO_SOURCE } from './eventPaths';

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

