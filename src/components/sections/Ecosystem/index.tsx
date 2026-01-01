import { useState, useRef, useCallback, useEffect } from 'react';
import { TIME_CONFIG, TOTAL_MONTHS, SVG_CONFIG } from './config';
import { calculateStats } from './utils';
import { RiverVisualization } from './RiverVisualization';
import { MobileVisualization } from './MobileVisualization';
import { TimelineScrubber } from './TimelineScrubber';
import { EventAnimation } from './EventAnimation';
import { 
  generateRandomEvent,
  getStageInputX,
  type EcosystemEvent 
} from './eventConfig';
import { Section } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';

export const Ecosystem: React.FC = () => {
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EcosystemEvent | null>(null);
  const [waveX, setWaveX] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveAnimationRef = useRef<number | null>(null);
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

  // When particle hits target - advance month and trigger wave immediately
  const handleEventImpact = useCallback(() => {
    // Trigger distortion wave from the target stage's X position
    if (currentEvent) {
      const targetStage = currentEvent.type === 'internal' ? currentEvent.to : currentEvent.target;
      const startX = getStageInputX(targetStage);
      startWaveAnimation(startX);
    }
    
    // Advance to next month right when particle hits
    setMonthIdx((prev) => {
      if (prev >= TOTAL_MONTHS - 1) return prev;
      return prev + 1;
    });
  }, [currentEvent, startWaveAnimation]);

  // When animation fully finishes (after fadeout) - clean up
  // Wait for wave to complete + 500ms before allowing next event
  const handleEventComplete = useCallback(() => {
    setCurrentEvent(null);
    // Wave takes ~1200ms, plus 500ms pause = 1700ms total from impact
    // But fadeout ends ~400ms after impact, so ~1300ms remaining
    setTimeout(() => {
      setIsAnimating(false);
    }, 1500);
  }, []);

  // Start an event animation (called by the timer)
  const startEventAnimation = useCallback(() => {
    if (monthIdx >= TOTAL_MONTHS - 1) return; // Don't animate at the end
    
    setIsAnimating(true);
    setCurrentEvent(generateRandomEvent());
  }, [monthIdx]);

  // Auto-advance timer - triggers event animation, which then advances the month
  useEffect(() => {
    if (!isSectionVisible || isPaused || isAnimating) return;

    // Wait a bit, then start the event animation
    advanceTimeoutRef.current = setTimeout(() => {
      startEventAnimation();
    }, TIME_CONFIG.autoAdvanceMs);

    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, [isSectionVisible, isPaused, isAnimating, monthIdx, startEventAnimation]);

  // If the section scrolls out of view, stop all timers/animations immediately.
  useEffect(() => {
    if (isSectionVisible) return;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (waveAnimationRef.current) {
      cancelAnimationFrame(waveAnimationRef.current);
      waveAnimationRef.current = null;
    }

    setWaveX(null);
    setCurrentEvent(null);
    setIsAnimating(false);
  }, [isSectionVisible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
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
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    // Cancel any ongoing wave animation
    if (waveAnimationRef.current) {
      cancelAnimationFrame(waveAnimationRef.current);
      waveAnimationRef.current = null;
    }
    setWaveX(null);
    // Cancel any ongoing animation
    setCurrentEvent(null);
    setIsAnimating(false);
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
    <Section ref={sectionRef} id="ecosystem" className="bg-gradient-to-br from-[#0c1a14] via-[#102018] to-[#081510] text-white relative">
      {/* Mobile/tablet layout - flexbox with proportional sizing */}
      {/* 1/10 empty | 2/10 header | 5/10 vis | 1/10 timeline | 1/10 empty */}
      <div className="absolute inset-0 flex flex-col xl:hidden px-4 pt-[var(--header-height)]">
        {/* Top spacer */}
        <div className="flex-[0.5]" />
        
        {/* Header - 2/10 */}
        <div className="flex-[2] flex items-center justify-center z-20">
          <div className="w-full max-w-4xl md:max-w-2xl lg:max-w-4xl bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 md:px-5 md:py-3 lg:px-6 lg:py-4 border border-white/10 text-center">
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
          <div className="w-full max-w-3xl md:max-w-xl lg:max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 md:px-5 md:py-3 lg:px-6 lg:py-4 border border-white/10">
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

      {/* Desktop layout - absolute positioning */}
      <div className="hidden xl:block">
        {/* Header - positioned below the fixed nav header on desktop */}
        <div className="absolute top-[calc(8%+var(--header-height))] left-4 right-4 z-20 flex justify-center">
          <div className="w-full max-w-4xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10 text-center">
            <h2 className="text-3xl font-normal tracking-tight leading-tight">
              We aim to support, energise & equip the ecosystem so thousands of OpenCore<span className="text-white/50">*</span> tools can help billions fall in love with AI
            </h2>
            <p className="text-base text-white/50 max-w-xl mx-auto mt-2">
              *OpenCore tools are built on open models, open-source their assets, and share profits to support the ecosystem that made them possible.
            </p>
          </div>
        </div>

        {/* Desktop River visualization - centered between header and timeline */}
        <div className="absolute inset-x-0 top-[calc(18%+var(--header-height))] bottom-[calc(18%-2rem)] flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-7xl px-4">
            <RiverVisualization 
              progress={progress} 
              stats={stats}
              waveX={waveX}
              eventOverlay={
                <EventAnimation 
                  event={currentEvent} 
                  onImpact={handleEventImpact}
                  onComplete={handleEventComplete} 
                />
              }
            />
          </div>
        </div>

        {/* Timeline - positioned at ~10% from bottom */}
        <div className="absolute bottom-[10%] left-4 right-4 z-20 flex justify-center">
          <div className="w-full max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
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
