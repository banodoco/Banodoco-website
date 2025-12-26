import { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TIME_CONFIG, TOTAL_MONTHS, COLORS, YEAR_MARKERS } from './config';
import { monthIndexToDate } from './utils';

interface TimelineScrubberProps {
  monthIdx: number;
  onMonthChange: (idx: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  monthIdx,
  onMonthChange,
  onDragStart,
  onDragEnd,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleInteraction = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const progress = x / rect.width;
    const newIdx = Math.round(progress * (TOTAL_MONTHS - 1));
    onMonthChange(Math.max(0, Math.min(TOTAL_MONTHS - 1, newIdx)));
  }, [onMonthChange]);

  const startDrag = useCallback((clientX: number) => {
    isDragging.current = true;
    onDragStart();
    handleInteraction(clientX);
  }, [handleInteraction, onDragStart]);

  const endDrag = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      onDragEnd();
    }
  }, [onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => startDrag(e.clientX), [startDrag]);
  const handleTouchStart = useCallback((e: React.TouchEvent) => startDrag(e.touches[0].clientX), [startDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) handleInteraction(e.clientX);
  }, [handleInteraction]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging.current) handleInteraction(e.touches[0].clientX);
  }, [handleInteraction]);

  useEffect(() => {
    const handleGlobalEnd = () => endDrag();
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [endDrag]);

  const progress = monthIdx / (TOTAL_MONTHS - 1);
  const { month, year } = monthIndexToDate(monthIdx);

  return (
    <div className="w-full">
      {/* Date display */}
      <div className="text-center leading-none mb-3">
        <div className="text-sm text-white/50 font-medium tracking-wider uppercase">{month}</div>
        <div className="text-4xl md:text-5xl font-light text-white tabular-nums">{year}</div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-8 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endDrag}
      >
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-white/10 rounded-full" />

        {/* Filled track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${COLORS.contributors} 0%, ${COLORS.tools} 25%, ${COLORS.artists} 60%, ${COLORS.fans} 100%)`,
          }}
        />

        {/* Year markers */}
        {YEAR_MARKERS.map((y) => {
          const yearIdx = (y - TIME_CONFIG.startYear) * 12;
          const pos = (yearIdx / (TOTAL_MONTHS - 1)) * 100;
          const isPast = monthIdx >= yearIdx;
          return (
            <div
              key={y}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${pos}%` }}
            >
              <div className={cn('w-2 h-2 rounded-full', isPast ? 'bg-white' : 'bg-white/30')} />
              <span className={cn('text-xs mt-2 font-medium', isPast ? 'text-white/80' : 'text-white/30')}>
                {y}
              </span>
            </div>
          );
        })}

        {/* Draggable handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
          style={{ left: `${progress * 100}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400 to-rose-400" />
        </div>
      </div>
    </div>
  );
};

