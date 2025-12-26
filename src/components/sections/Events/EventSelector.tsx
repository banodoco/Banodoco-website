import { cn } from '@/lib/utils';
import type { EventItem } from './types';

interface EventSelectorProps {
  events: EventItem[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({ 
  events, 
  selectedIndex, 
  onSelect 
}) => {
  return (
    <div className="flex gap-2 justify-center mt-6">
      {events.map((event, idx) => (
        <button
          key={event.id}
          onClick={() => onSelect(idx)}
          className={cn(
            "relative px-5 py-3 rounded-lg transition-all duration-300 flex flex-col items-center min-w-[100px]",
            selectedIndex === idx
              ? "bg-rose-500/20 text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
          )}
        >
          {selectedIndex === idx && (
            <div className="absolute inset-0 rounded-lg border-2 border-rose-500/50 pointer-events-none" />
          )}
          <span className="text-sm font-medium">{event.label}</span>
          <span className="text-xs opacity-60">{event.year}</span>
        </button>
      ))}
    </div>
  );
};

