import { cn } from '@/lib/utils';
import type { EventItem } from './types';
import { TRANSITION_ANIMATION_DURATION } from './useEventsAutoAdvance';

interface EventSelectorProps {
  events: EventItem[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  progress: number;
  nextAdvanceIdx: number | null;
  prevAdvanceIdx: number | null;
  drainingIdx: number | null;
}

interface SelectorButtonProps {
  event: EventItem;
  isSelected: boolean;
  onClick: () => void;
  progress: number;
  isNextWithBorder: boolean;
  isPrevWithBorder: boolean;
  isDraining: boolean;
}

const SelectorButton: React.FC<SelectorButtonProps> = ({
  event,
  isSelected,
  onClick,
  progress,
  isNextWithBorder,
  isPrevWithBorder,
  isDraining,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-5 py-3 rounded-lg transition-all duration-500 ease-out flex flex-col items-center overflow-hidden",
        isSelected ? "min-w-[120px] flex-[1.5]" : "min-w-[100px] flex-1",
        "bg-white/5 hover:bg-white/10"
      )}
    >
      {/* Static border for selected item (when not transitioning) */}
      {isSelected && !isNextWithBorder && !isPrevWithBorder && (
        <div className="absolute inset-0 rounded-lg border-2 border-rose-500/50 pointer-events-none" />
      )}

      {/* Progress fill on current selected item */}
      {isSelected && !isDraining && (
        <div
          className="absolute inset-0 bg-rose-500/20 rounded-lg"
          style={{
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
            transition: 'clip-path 100ms ease-out',
          }}
        />
      )}

      {/* Draining fill animation */}
      {isDraining && (
        <div
          className="absolute inset-0 bg-rose-500/20 rounded-lg"
          style={{
            clipPath: 'inset(0 0 0 0)',
            animation: `drainFillLeftToRight ${TRANSITION_ANIMATION_DURATION} ease-out forwards`,
          }}
        />
      )}

      {/* Border being removed (previous item) */}
      {isPrevWithBorder && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-rose-500/50 pointer-events-none"
          style={{
            clipPath: 'inset(0 0% 0 0)',
            animation: `hideBorderLeftToRight ${TRANSITION_ANIMATION_DURATION} ease-out forwards`,
          }}
        />
      )}

      {/* Border being revealed (next item) */}
      {isNextWithBorder && !isSelected && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-rose-500/50 pointer-events-none"
          style={{
            clipPath: 'inset(0 100% 0 0)',
            animation: `revealBorderLeftToRight ${TRANSITION_ANIMATION_DURATION} ease-out forwards`,
          }}
        />
      )}

      <span className={cn(
        "text-sm font-medium relative z-10 transition-colors duration-300",
        isSelected ? "text-white" : "text-white/60"
      )}>
        {event.label}
      </span>
      <span className={cn(
        "text-xs relative z-10 transition-colors duration-300",
        isSelected ? "text-white/80" : "text-white/40"
      )}>
        {event.year}
      </span>
    </button>
  );
};

export const EventSelector: React.FC<EventSelectorProps> = ({ 
  events, 
  selectedIndex, 
  onSelect,
  progress,
  nextAdvanceIdx,
  prevAdvanceIdx,
  drainingIdx,
}) => {
  return (
    <div className="flex gap-2 w-full mt-8 sm:mt-6">
      {events.map((event, idx) => (
        <SelectorButton
          key={event.id}
          event={event}
          isSelected={selectedIndex === idx}
          onClick={() => onSelect(idx)}
          progress={progress}
          isNextWithBorder={nextAdvanceIdx === idx}
          isPrevWithBorder={prevAdvanceIdx === idx}
          isDraining={drainingIdx === idx}
        />
      ))}
    </div>
  );
};


