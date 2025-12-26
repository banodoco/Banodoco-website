import { useState, useRef, useCallback, useEffect } from 'react';
import { TIME_CONFIG, TOTAL_MONTHS } from './config';
import { calculateStats } from './utils';
import { RiverVisualization } from './RiverVisualization';
import { TimelineScrubber } from './TimelineScrubber';

export const Ecosystem: React.FC = () => {
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = calculateStats(monthIdx);
  const progress = monthIdx / (TOTAL_MONTHS - 1);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setMonthIdx((prev) => {
        // Stop at the end instead of looping
        if (prev >= TOTAL_MONTHS - 1) return prev;
        return prev + 1;
      });
    }, TIME_CONFIG.autoAdvanceMs);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Cleanup resume timeout on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const handleMonthChange = useCallback((idx: number) => {
    setMonthIdx(idx);
  }, []);

  const handleDragStart = useCallback(() => {
    // Clear any pending resume
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
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
    <section className="h-screen snap-start bg-[#080a09] text-white relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-12 left-4 right-4 z-20 flex justify-center">
        <div className="w-full max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight leading-tight">
            We want to nurture an ecosystem of thousands of tools based on open technology
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto mt-2">
            We want to help open source AI technology make its way into the hands of everyone through consumer-facing tools built by the community.
          </p>
        </div>
      </div>

      {/* River visualization */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-8">
        <div className="w-full max-w-7xl px-4">
          <RiverVisualization progress={progress} stats={stats} />
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

