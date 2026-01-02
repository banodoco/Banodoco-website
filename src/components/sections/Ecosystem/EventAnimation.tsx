import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  type EcosystemEvent,
  type ActiveEvent,
  EVENT_TIMING,
  BANODOCO_SOURCE,
  SVG_CONFIG,
  getInternalEventPath,
  getExternalEventPath,
  getStageColor,
  getStageX,
} from './eventConfig';

// =============================================================================
// SINGLE EVENT ANIMATION (internal component)
// =============================================================================

interface SingleEventProps {
  activeEvent: ActiveEvent;
  onImpact: (id: string) => void;
  onComplete: (id: string) => void;
}

type Phase = 'waiting' | 'label' | 'drawing' | 'fadeout' | 'done';

const SingleEventAnimation: React.FC<SingleEventProps> = ({ activeEvent, onImpact, onComplete }) => {
  const { id, event, sourceY, delay = 0 } = activeEvent;
  const [phase, setPhase] = useState<Phase>(delay > 0 ? 'waiting' : 'label');
  
  // Unique filter ID to avoid conflicts between simultaneous events
  const filterId = `event-glow-${id}`;

  useEffect(() => {
    // All timers offset by the stagger delay
    const baseDelay = delay;
    
    // Wait phase (if delayed)
    const labelTimer = delay > 0 ? setTimeout(() => {
      setPhase('label');
    }, baseDelay) : null;
    
    // Start drawing after label appears
    const drawTimer = setTimeout(() => {
      setPhase('drawing');
    }, baseDelay + EVENT_TIMING.labelAppearDuration);
    
    // Fire onImpact when line finishes drawing
    const impactTimer = setTimeout(() => {
      onImpact(id);
      setPhase('fadeout');
    }, baseDelay + EVENT_TIMING.labelAppearDuration + EVENT_TIMING.pathDrawDuration);
    
    const completeTimer = setTimeout(() => {
      setPhase('done');
      onComplete(id);
    }, baseDelay + EVENT_TIMING.labelAppearDuration + EVENT_TIMING.pathDrawDuration + EVENT_TIMING.fadeoutDuration);
    
    return () => {
      if (labelTimer) clearTimeout(labelTimer);
      clearTimeout(drawTimer);
      clearTimeout(impactTimer);
      clearTimeout(completeTimer);
    };
  }, [id, delay, onImpact, onComplete]);

  // Memoize path to avoid recalculation
  const path = useMemo(() => {
    if (event.type === 'internal') {
      return getInternalEventPath(event.from, event.to);
    }
    return getExternalEventPath(event.target, sourceY ?? SVG_CONFIG.centerY);
  }, [event, sourceY]);

  if (phase === 'done' || phase === 'waiting') return null;

  const isInternal = event.type === 'internal';
  const color = isInternal
    ? getStageColor(event.from)
    : getStageColor(event.target);

  const showPath = phase === 'drawing' || phase === 'fadeout';
  const showLabel = phase === 'label' || phase === 'drawing' || phase === 'fadeout';
  const isFadingOut = phase === 'fadeout';
  
  // For internal events, label appears at the starting (from) stage
  const internalLabelX = isInternal ? getStageX(event.from) : 0;
  const internalLabelY = SVG_CONFIG.centerY;
  
  // Use pre-computed sourceY for external events
  const externalSourceY = sourceY ?? SVG_CONFIG.centerY;

  return (
    <g 
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${EVENT_TIMING.fadeoutDuration}ms ease-out`,
      }}
    >
      {/* Unique glow filter for this event */}
      <defs>
        <filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* The animated path */}
      {showPath && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.9}
          filter={`url(#${filterId})`}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: 1,
            animation: `drawPath-${id} ${EVENT_TIMING.pathDrawDuration}ms ease-out forwards`,
          }}
          pathLength={1}
        />
      )}

      {/* External event label */}
      {!isInternal && (
        <g 
          style={{ 
            opacity: showLabel ? 1 : 0, 
            transition: `opacity ${EVENT_TIMING.labelAppearDuration}ms ease-out`,
          }}
        >
          <rect
            x={BANODOCO_SOURCE.x - 5}
            y={externalSourceY - 32}
            width={100}
            height={24}
            rx={4}
            fill="black"
            opacity={0.7}
          />
          <text
            x={BANODOCO_SOURCE.x + 45}
            y={externalSourceY - 15}
            textAnchor="middle"
            fill={color}
            fontSize={12}
            fontWeight={600}
          >
            {event.label}
          </text>
          <circle
            cx={BANODOCO_SOURCE.x}
            cy={externalSourceY}
            r={8}
            fill={color}
            filter={`url(#${filterId})`}
          />
        </g>
      )}

      {/* Internal event label */}
      {isInternal && (
        <g 
          style={{ 
            opacity: showLabel ? 1 : 0, 
            transition: `opacity ${EVENT_TIMING.labelAppearDuration}ms ease-out`,
          }}
        >
          <rect
            x={internalLabelX - 60}
            y={internalLabelY - 55}
            width={120}
            height={24}
            rx={4}
            fill="black"
            opacity={0.7}
          />
          <text
            x={internalLabelX}
            y={internalLabelY - 38}
            textAnchor="middle"
            fill={color}
            fontSize={12}
            fontWeight={600}
          >
            {event.label}
          </text>
          <circle
            cx={internalLabelX}
            cy={internalLabelY}
            r={8}
            fill={color}
            filter={`url(#${filterId})`}
          />
        </g>
      )}

      {/* Unique CSS keyframes for this event's path animation */}
      <style>
        {`
          @keyframes drawPath-${id} {
            from { stroke-dashoffset: 1; }
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
    </g>
  );
};

// =============================================================================
// MULTI-EVENT ANIMATION (main export)
// =============================================================================

interface MultiEventAnimationProps {
  events: ActiveEvent[];
  onImpact: (id: string) => void;
  onComplete: (id: string) => void;
}

export const MultiEventAnimation: React.FC<MultiEventAnimationProps> = ({ 
  events, 
  onImpact, 
  onComplete 
}) => {
  // Stable callback refs to avoid re-triggering child effects
  const onImpactRef = useRef(onImpact);
  const onCompleteRef = useRef(onComplete);
  onImpactRef.current = onImpact;
  onCompleteRef.current = onComplete;
  
  const handleImpact = useCallback((id: string) => {
    onImpactRef.current(id);
  }, []);
  
  const handleComplete = useCallback((id: string) => {
    onCompleteRef.current(id);
  }, []);

  if (events.length === 0) return null;

  return (
    <g>
      {events.map(activeEvent => (
        <SingleEventAnimation
          key={activeEvent.id}
          activeEvent={activeEvent}
          onImpact={handleImpact}
          onComplete={handleComplete}
        />
      ))}
    </g>
  );
};

// =============================================================================
// LEGACY SINGLE EVENT (for backwards compatibility if needed)
// =============================================================================

interface EventAnimationProps {
  event: EcosystemEvent | null;
  onImpact?: () => void;
  onComplete?: () => void;
}

export const EventAnimation: React.FC<EventAnimationProps> = ({ event, onImpact, onComplete }) => {
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  
  useEffect(() => {
    if (event) {
      setActiveEvent({
        id: `legacy-${Date.now()}`,
        event,
        startTime: Date.now(),
        sourceY: event.type === 'external' ? undefined : undefined,
      });
    } else {
      setActiveEvent(null);
    }
  }, [event]);
  
  const handleImpact = useCallback(() => {
    onImpact?.();
  }, [onImpact]);
  
  const handleComplete = useCallback(() => {
    onComplete?.();
    setActiveEvent(null);
  }, [onComplete]);

  if (!activeEvent) return null;

  return (
    <MultiEventAnimation
      events={[activeEvent]}
      onImpact={handleImpact}
      onComplete={handleComplete}
    />
  );
};
