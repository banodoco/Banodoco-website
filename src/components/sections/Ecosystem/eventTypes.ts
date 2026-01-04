// =============================================================================
// EVENT TYPES
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




