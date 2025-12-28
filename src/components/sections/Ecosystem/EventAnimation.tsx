import { useEffect, useRef, useState, useMemo } from 'react';
import {
  type EcosystemEvent,
  EVENT_TIMING,
  BANODOCO_SOURCE,
  SVG_CONFIG,
  getInternalEventPath,
  getExternalEventPath,
  getStageColor,
  getStageX,
  getRandomSourceY,
} from './eventConfig';

interface EventAnimationProps {
  event: EcosystemEvent | null;
  onImpact?: () => void;    // Called when line hits target
  onComplete?: () => void;  // Called when animation fully finishes
}

type Phase = 'idle' | 'label' | 'drawing' | 'fadeout';

export const EventAnimation: React.FC<EventAnimationProps> = ({ event, onImpact, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sourceY, setSourceY] = useState<number>(360);
  const animationKey = useRef(0);

  // Generate new random position when event changes
  useEffect(() => {
    if (event && event.type === 'external') {
      setSourceY(getRandomSourceY());
    }
  }, [event]);

  useEffect(() => {
    if (!event) {
      setPhase('idle');
      return;
    }

    // New event - start animation
    animationKey.current += 1;
    
    const isExternal = event.type === 'external';
    
    if (isExternal) {
      // External: label first, then draw, then fadeout
      setPhase('label');
      
      const drawTimer = setTimeout(() => {
        setPhase('drawing');
      }, EVENT_TIMING.labelAppearDuration);
      
      // Fire onImpact when line finishes drawing
      const impactTimer = setTimeout(() => {
        onImpact?.();
        setPhase('fadeout');
      }, EVENT_TIMING.labelAppearDuration + EVENT_TIMING.pathDrawDuration);
      
      const completeTimer = setTimeout(() => {
        setPhase('idle');
        onComplete?.();
      }, EVENT_TIMING.labelAppearDuration + EVENT_TIMING.pathDrawDuration + EVENT_TIMING.fadeoutDuration);
      
      return () => {
        clearTimeout(drawTimer);
        clearTimeout(impactTimer);
        clearTimeout(completeTimer);
      };
    } else {
      // Internal: label first, then draw, then fadeout (same as external now)
      setPhase('label');
      
      const drawTimer = setTimeout(() => {
        setPhase('drawing');
      }, EVENT_TIMING.labelAppearDuration);

      // Fire onImpact when line finishes drawing
      const impactTimer = setTimeout(() => {
        onImpact?.();
        setPhase('fadeout');
      }, EVENT_TIMING.labelAppearDuration + EVENT_TIMING.pathDrawDuration);

      const completeTimer = setTimeout(() => {
        setPhase('idle');
        onComplete?.();
      }, EVENT_TIMING.labelAppearDuration + EVENT_TIMING.pathDrawDuration + EVENT_TIMING.fadeoutDuration);

      return () => {
        clearTimeout(drawTimer);
        clearTimeout(impactTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [event, onImpact, onComplete]);

  // Memoize path to avoid recalculation
  const path = useMemo(() => {
    if (!event) return '';
    if (event.type === 'internal') {
      return getInternalEventPath(event.from, event.to);
    }
    return getExternalEventPath(event.target, sourceY);
  }, [event, sourceY]);

  if (!event || phase === 'idle') return null;

  const isInternal = event.type === 'internal';
  const color = isInternal
    ? getStageColor(event.from)  // Use the origin stage's color for internal events
    : getStageColor(event.target);

  const showPath = phase === 'drawing' || phase === 'fadeout';
  const showLabel = phase === 'label' || phase === 'drawing' || phase === 'fadeout';
  const isFadingOut = phase === 'fadeout';
  
  // For internal events, label appears at the starting (from) stage
  const internalLabelX = isInternal ? getStageX(event.from) : 0;
  const internalLabelY = SVG_CONFIG.centerY;

  return (
    <g 
      key={animationKey.current}
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${EVENT_TIMING.fadeoutDuration}ms ease-out`,
      }}
    >
      {/* Glow filter for this event */}
      <defs>
        <filter id="event-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* The animated path - rendered first so it appears UNDER the label */}
      {showPath && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.9}
          filter="url(#event-glow)"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: 1,
            animation: `drawPath ${EVENT_TIMING.pathDrawDuration}ms ease-out forwards`,
          }}
          pathLength={1}
        />
      )}

      {/* External event label - rendered after path so it appears ON TOP */}
      {!isInternal && (
        <g 
          style={{ 
            opacity: showLabel ? 1 : 0, 
            transition: `opacity ${EVENT_TIMING.labelAppearDuration}ms ease-out`,
          }}
        >
          {/* Label background */}
          <rect
            x={BANODOCO_SOURCE.x - 5}
            y={sourceY - 32}
            width={100}
            height={24}
            rx={4}
            fill="black"
            opacity={0.7}
          />
          <text
            x={BANODOCO_SOURCE.x + 45}
            y={sourceY - 15}
            textAnchor="middle"
            fill={color}
            fontSize={12}
            fontWeight={600}
          >
            {event.label}
          </text>
          {/* Source node */}
          <circle
            cx={BANODOCO_SOURCE.x}
            cy={sourceY}
            r={8}
            fill={color}
            filter="url(#event-glow)"
          />
        </g>
      )}

      {/* Internal event label - appears at the origin stage */}
      {isInternal && (
        <g 
          style={{ 
            opacity: showLabel ? 1 : 0, 
            transition: `opacity ${EVENT_TIMING.labelAppearDuration}ms ease-out`,
          }}
        >
          {/* Label background - positioned above the source point */}
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
          {/* Source node at the from stage */}
          <circle
            cx={internalLabelX}
            cy={internalLabelY}
            r={8}
            fill={color}
            filter="url(#event-glow)"
          />
        </g>
      )}

      {/* CSS keyframes for path drawing */}
      <style>
        {`
          @keyframes drawPath {
            from {
              stroke-dashoffset: 1;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </g>
  );
};
