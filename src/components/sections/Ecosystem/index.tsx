import { useState, useRef, useCallback, useEffect } from 'react';
import { TIME_CONFIG, TOTAL_MONTHS, STAGE_X, SVG_CONFIG } from './config';
import { calculateStats } from './utils';
import { RiverVisualization } from './RiverVisualization';
import { TimelineScrubber } from './TimelineScrubber';
import { EventAnimation } from './EventAnimation';
import { 
  generateRandomEvent,
  getStageInputX,
  type EcosystemEvent 
} from './eventConfig';

export const Ecosystem: React.FC = () => {
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EcosystemEvent | null>(null);
  const [waveX, setWaveX] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveAnimationRef = useRef<number | null>(null);

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
    if (isPaused || isAnimating) return;

    // Wait a bit, then start the event animation
    advanceTimeoutRef.current = setTimeout(() => {
      startEventAnimation();
    }, TIME_CONFIG.autoAdvanceMs);

    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, [isPaused, isAnimating, monthIdx, startEventAnimation]);

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
    <section className="h-screen snap-start bg-gradient-to-br from-[#0c1a14] via-[#102018] to-[#081510] text-white relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-12 left-4 right-4 z-20 flex justify-center">
        <div className="w-full max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight leading-tight">
            We want to nurture an ecosystem of thousands of tools based on open technology
          </h2>
          <p className="text-base md:text-lg text-white/60 max-w-xl mx-auto mt-2">
            We want to help open source AI technology make its way into the hands of everyone through consumer-facing tools built by the community.
          </p>
        </div>
      </div>

      {/* River visualization */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-8">
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

      {/* Timeline */}
      <div className="absolute bottom-16 left-4 right-4 z-20 flex justify-center">
        <div className="w-full max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
          <TimelineScrubber
            monthIdx={monthIdx}
            onMonthChange={handleMonthChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>
      </div>
    </section>
  );
};
