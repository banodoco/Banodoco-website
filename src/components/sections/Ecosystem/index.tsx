import { useState, useRef, useCallback, useEffect } from 'react';
import { TIME_CONFIG, TOTAL_MONTHS, SVG_CONFIG } from './config';
import { calculateStats } from './utils';
import { RiverVisualization } from './RiverVisualization';
import { MobileVisualization } from './MobileVisualization';
import { TimelineScrubber } from './TimelineScrubber';
import { MultiEventAnimation } from './EventAnimation';
import { 
  getStageInputX,
  getMaxConcurrentEvents,
  generateEventBatch,
  type ActiveEvent,
} from './eventConfig';
import { Section, HEADER_OFFSET_VAR } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';

// Fixed tick interval - month advances at steady pace
const TICK_INTERVAL_MS = 1200;

/**
 * Ecosystem section with animated river visualization.
 * 
 * NOTE: This section uses a custom layout instead of SectionContent because:
 * 1. Desktop has absolutely positioned elements with calc() for precise placement
 * 2. Mobile uses a flex column layout with proportional flex-grow values
 * 3. The SVG visualization needs to fill the space between header and timeline
 * 
 * The header offset is applied via HEADER_OFFSET_VAR constant for consistency.
 */
export const Ecosystem: React.FC = () => {
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [waveX, setWaveX] = useState<number | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveAnimationRef = useRef<number | null>(null);
  const hasAdvancedThisBatch = useRef(false); // Only advance once per batch
  const { ref: sectionRef, isActive: isSectionVisible } = useSectionRuntime({ threshold: 0.35 });

  const stats = calculateStats(monthIdx);
  const progress = monthIdx / (TOTAL_MONTHS - 1);

  // Start the distortion wave animation
  const startWaveAnimation = useCallback((startX: number) => {
    const endX = SVG_CONFIG.width + 100; // Go past the edge
    const duration = 1200; // ms for wave to travel
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // Ease-out for natural deceleration
      const eased = 1 - Math.pow(1 - t, 2);
      const currentX = startX + (endX - startX) * eased;
      
      setWaveX(currentX);
      
      if (t < 1) {
        waveAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setWaveX(null);
        waveAnimationRef.current = null;
      }
    };
    
    // Cancel any existing wave animation
    if (waveAnimationRef.current) {
      cancelAnimationFrame(waveAnimationRef.current);
    }
    
    waveAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // When an event's particle hits its target - only advance month ONCE per batch
  const handleEventImpact = useCallback((eventId: string) => {
    // Find the event to get its target stage for wave animation
    setActiveEvents(prev => {
      const activeEvent = prev.find(ae => ae.id === eventId);
      if (activeEvent) {
        const targetStage = activeEvent.event.type === 'internal' 
          ? activeEvent.event.to 
          : activeEvent.event.target;
        const startX = getStageInputX(targetStage);
        
        // Only trigger wave on first impact of batch
        if (!hasAdvancedThisBatch.current) {
          startWaveAnimation(startX);
        }
      }
      return prev;
    });
    
    // Advance month only once per batch (first event to impact)
    if (!hasAdvancedThisBatch.current) {
      hasAdvancedThisBatch.current = true;
      setMonthIdx((prev) => {
        if (prev >= TOTAL_MONTHS - 1) return prev;
        return prev + 1;
      });
    }
  }, [startWaveAnimation]);

  // When an event animation fully finishes (after fadeout)
  const handleEventComplete = useCallback((eventId: string) => {
    setActiveEvents(prev => prev.filter(ae => ae.id !== eventId));
  }, []);

  // Spawn a batch of events (all at once)
  const spawnEventBatch = useCallback(() => {
    if (monthIdx >= TOTAL_MONTHS - 1) return; // Don't spawn at the end
    
    const numEvents = getMaxConcurrentEvents(progress);
    const batch = generateEventBatch(numEvents);
    
    if (batch.length > 0) {
      hasAdvancedThisBatch.current = false; // Reset for new batch
      setActiveEvents(batch);
    }
  }, [monthIdx, progress]);

  // Main tick loop - spawns batches at fixed intervals
  useEffect(() => {
    if (!isSectionVisible || isPaused) return;
    if (monthIdx >= TOTAL_MONTHS - 1) return; // Stop at the end
    
    // Only schedule next tick when no events are active (batch complete)
    if (activeEvents.length > 0) return;

    tickIntervalRef.current = setTimeout(() => {
      spawnEventBatch();
    }, TICK_INTERVAL_MS);

    return () => {
      if (tickIntervalRef.current) {
        clearTimeout(tickIntervalRef.current);
      }
    };
  }, [isSectionVisible, isPaused, monthIdx, activeEvents.length, spawnEventBatch]);

  // If the section scrolls out of view, stop all timers/animations immediately.
  useEffect(() => {
    if (isSectionVisible) return;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearTimeout(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (waveAnimationRef.current) {
      cancelAnimationFrame(waveAnimationRef.current);
      waveAnimationRef.current = null;
    }

    setWaveX(null);
    setActiveEvents([]);
    hasAdvancedThisBatch.current = false;
  }, [isSectionVisible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      if (tickIntervalRef.current) {
        clearTimeout(tickIntervalRef.current);
      }
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
      }
    };
  }, []);

  const handleMonthChange = useCallback((idx: number) => {
    setMonthIdx(idx);
  }, []);

  const handleDragStart = useCallback(() => {
    // Clear any pending timeouts
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearTimeout(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    // Cancel any ongoing wave animation
    if (waveAnimationRef.current) {
      cancelAnimationFrame(waveAnimationRef.current);
      waveAnimationRef.current = null;
    }
    setWaveX(null);
    // Cancel all active events
    setActiveEvents([]);
    hasAdvancedThisBatch.current = false;
    setIsPaused(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    // Resume after delay
    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      resumeTimeoutRef.current = null;
    }, TIME_CONFIG.resumeDelayMs);
  }, []);

  return (
    <Section 
      ref={sectionRef} 
      id="ecosystem" 
      className="text-white relative"
      videoOverlay="rgba(10, 18, 24, 0.92)"
    >
      {/* 
       * Ecosystem uses absolute positioning with calc() for header offset.
       * Uses HEADER_OFFSET_VAR constant for consistency with SectionContent.
       */}
      {/* Mobile/tablet layout - flexbox with proportional sizing */}
      <div className="absolute inset-0 flex flex-col xl:hidden px-4" style={{ paddingTop: HEADER_OFFSET_VAR }}>
        {/* Top spacer */}
        <div className="flex-[0.5]" />
        
        {/* Header - 2/10 */}
        <div className="flex-[2] flex items-center justify-center z-20">
          <div className="w-full max-w-4xl md:max-w-2xl lg:max-w-4xl bg-white/[0.06] backdrop-blur-md rounded-xl px-4 py-3 md:px-5 md:py-3 lg:px-6 lg:py-4 border border-white/15 text-center">
            <h2 className="text-xl md:text-lg lg:text-3xl font-normal tracking-tight leading-tight">
              We aim to support, energise & equip the ecosystem so thousands of OpenCore<span className="text-white/50">*</span> tools can help billions fall in love with AI
            </h2>
            <p className="text-sm md:text-xs lg:text-base text-white/50 max-w-xl mx-auto mt-2 md:mt-1 lg:mt-2">
              *OpenCore tools are built on open models, open-source their assets, and share profits to support the ecosystem that made them possible.
            </p>
          </div>
        </div>
        
        {/* Visualization - 5/10 */}
        <div className="flex-[5] flex items-center justify-center pointer-events-none">
          <MobileVisualization 
            progress={progress}
            stats={stats}
            waveX={waveX}
          />
        </div>
        
        {/* Timeline - 1/10 */}
        <div className="flex-[1] flex items-center justify-center z-20">
          <div className="w-full max-w-3xl md:max-w-xl lg:max-w-3xl bg-white/[0.06] backdrop-blur-md rounded-xl px-4 py-3 md:px-5 md:py-3 lg:px-6 lg:py-4 border border-white/15">
            <TimelineScrubber
              monthIdx={monthIdx}
              onMonthChange={handleMonthChange}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
        </div>
        
        {/* Bottom spacer */}
        <div className="flex-[0.5]" />
      </div>

      {/* Desktop layout - absolute positioning with calc() for header offset */}
      <div className="hidden xl:block">
        {/* Header - positioned below the fixed nav header on desktop */}
        <div className="absolute left-4 right-4 z-20 flex justify-center" style={{ top: `calc(8% + ${HEADER_OFFSET_VAR})` }}>
          <div className="w-full max-w-4xl bg-white/[0.06] backdrop-blur-md rounded-xl px-6 py-4 border border-white/15 text-center">
            <h2 className="text-3xl font-normal tracking-tight leading-tight">
              We aim to support, energise & equip the ecosystem so thousands of OpenCore<span className="text-white/50">*</span> tools can help billions fall in love with AI
            </h2>
            <p className="text-base text-white/50 max-w-xl mx-auto mt-2">
              *OpenCore tools are built on open models, open-source their assets, and share profits to support the ecosystem that made them possible.
            </p>
          </div>
        </div>

        {/* Desktop River visualization - centered between header and timeline */}
        <div className="absolute inset-x-0 bottom-[calc(18%-2rem)] flex items-center justify-center pointer-events-none" style={{ top: `calc(18% + ${HEADER_OFFSET_VAR})` }}>
          <div className="w-full max-w-7xl px-4">
            <RiverVisualization 
              progress={progress} 
              stats={stats}
              waveX={waveX}
              eventOverlay={
                <MultiEventAnimation 
                  events={activeEvents} 
                  onImpact={handleEventImpact}
                  onComplete={handleEventComplete} 
                />
              }
            />
          </div>
        </div>

        {/* Timeline - positioned at ~10% from bottom */}
        <div className="absolute bottom-[10%] left-4 right-4 z-20 flex justify-center">
          <div className="w-full max-w-3xl bg-white/[0.06] backdrop-blur-md rounded-xl px-6 py-4 border border-white/15">
            <TimelineScrubber
              monthIdx={monthIdx}
              onMonthChange={handleMonthChange}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
        </div>
      </div>
    </Section>
  );
};
