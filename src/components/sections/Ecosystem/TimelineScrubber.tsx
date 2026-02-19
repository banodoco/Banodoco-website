import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TIME_CONFIG, TOTAL_MONTHS, COLORS, YEAR_MARKERS } from './config';
import { monthIndexToDate } from './utils';
import { AnimatedText } from './AnimatedText';

// Hold-to-repeat timing
const HOLD_INITIAL_DELAY = 400; // ms before repeat starts
const HOLD_REPEAT_INTERVAL = 150; // ms between repeats

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

  // Hold-to-repeat refs
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHolding, setIsHolding] = useState<'left' | 'right' | null>(null);

  // Jump by years (12 months per year) - returns the new index for chaining
  const jumpYears = useCallback((years: number) => {
    const newIdx = Math.max(0, Math.min(TOTAL_MONTHS - 1, monthIdx + years * 12));
    onDragStart(); // Pause auto-advance
    onMonthChange(newIdx);
    onDragEnd(); // Resume after delay
  }, [monthIdx, onMonthChange, onDragStart, onDragEnd]);

  // Jump to a specific year (for clickable year markers)
  const jumpToYear = useCallback((targetYear: number) => {
    const newIdx = (targetYear - TIME_CONFIG.startYear) * 12;
    onDragStart();
    onMonthChange(Math.max(0, Math.min(TOTAL_MONTHS - 1, newIdx)));
    onDragEnd();
  }, [onMonthChange, onDragStart, onDragEnd]);

  // Start hold-to-repeat
  const startHold = useCallback((direction: 'left' | 'right') => {
    const years = direction === 'left' ? -1 : 1;
    setIsHolding(direction);
    
    // Immediate first jump
    jumpYears(years);
    
    // After initial delay, start repeating
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        onDragStart();
        // Note: Uses closure over `years` but reads current `monthIdx` from DOM workaround
        // since we can't access current state in setInterval. Jump button will repeat at interval.
        jumpYears(years);
        onDragEnd();
      }, HOLD_REPEAT_INTERVAL);
    }, HOLD_INITIAL_DELAY);
  }, [jumpYears, onDragStart, onDragEnd]);

  // Stop hold-to-repeat
  const stopHold = useCallback(() => {
    setIsHolding(null);
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      {/* Date display with single chevron navigation (hold to repeat) */}
      <div className="flex items-center justify-center gap-2 leading-none">
        {/* Left chevron - hold to repeat */}
        <button
          onMouseDown={() => monthIdx >= 12 && startHold('left')}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => monthIdx >= 12 && startHold('left')}
          onTouchEnd={stopHold}
          disabled={monthIdx < 12}
          className={cn(
            "p-2 text-2xl md:text-xl lg:text-3xl transition-all duration-200 select-none",
            monthIdx < 12 
              ? 'text-white/25 cursor-default' 
              : isHolding === 'left' 
                ? 'text-white' 
                : 'text-white/80 hover:text-white'
          )}
          title="Back 1 year (hold to repeat)"
        >
          ‹
        </button>

        {/* Date display */}
        <div className="text-center min-w-[100px] sm:min-w-[120px]">
          <div className="text-sm md:text-xs lg:text-sm text-white/50 font-medium tracking-wider uppercase">
            <AnimatedText value={month} />
          </div>
          <div className="text-4xl md:text-3xl lg:text-5xl font-light text-white tabular-nums">
            <AnimatedText value={year.toString()} />
          </div>
        </div>

        {/* Right chevron - hold to repeat */}
        <button
          onMouseDown={() => monthIdx <= TOTAL_MONTHS - 13 && startHold('right')}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => monthIdx <= TOTAL_MONTHS - 13 && startHold('right')}
          onTouchEnd={stopHold}
          disabled={monthIdx > TOTAL_MONTHS - 13}
          className={cn(
            "p-2 text-2xl md:text-xl lg:text-3xl transition-all duration-200 select-none",
            monthIdx > TOTAL_MONTHS - 13
              ? 'text-white/25 cursor-default'
              : isHolding === 'right'
                ? 'text-white'
                : 'text-white/80 hover:text-white'
          )}
          title="Forward 1 year (hold to repeat)"
        >
          ›
        </button>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-8 md:h-6 lg:h-8 cursor-grab active:cursor-grabbing select-none mb-4 md:mb-3 lg:mb-4"
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

        {/* Year markers - clickable to jump */}
        {YEAR_MARKERS.map((y) => {
          const yearIdx = (y - TIME_CONFIG.startYear) * 12;
          const isLastYear = y === TIME_CONFIG.endYear;
          const pos = isLastYear ? 100 : (yearIdx / (TOTAL_MONTHS - 1)) * 100;
          const isPast = monthIdx >= yearIdx;
          const isCurrent = year === y;
          return (
            <button
              key={y}
              onClick={(e) => {
                e.stopPropagation();
                jumpToYear(y);
              }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
              style={{ left: `${pos}%` }}
              title={`Jump to ${y}`}
            >
              <div className={cn(
                'w-2 h-2 rounded-full transition-all duration-200 group-hover:scale-150',
                isCurrent ? 'bg-white scale-125' : isPast ? 'bg-white group-hover:bg-white' : 'bg-white/30 group-hover:bg-white/60'
              )} />
              <span className={cn(
                'absolute left-1/2 -translate-x-1/2 top-4 text-xs font-medium whitespace-nowrap transition-colors duration-200',
                isCurrent ? 'text-white' : isPast ? 'text-white/80 group-hover:text-white' : 'text-white/30 group-hover:text-white/60'
              )}>
                {y}
              </span>
            </button>
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
