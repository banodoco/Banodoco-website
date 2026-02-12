import { useState, useRef, useCallback, useEffect } from 'react';

// Timing constants - how long each event is displayed
const EVENT_DISPLAY_DURATION_MS = 6000; // 6 seconds per event
export const TRANSITION_ANIMATION_DURATION = '600ms';

interface UseEventsAutoAdvanceOptions {
  totalEvents: number;
  onEventChange: (idx: number) => void;
  isActive: boolean; // Whether the section is in view
}

interface UseEventsAutoAdvanceReturn {
  // State
  progress: number; // 0-100
  nextAdvanceIdx: number | null;
  prevAdvanceIdx: number | null;
  drainingIdx: number | null;

  // Actions
  handleManualSelect: (idx: number) => void;
  resetProgress: () => void;
}

export function useEventsAutoAdvance({
  totalEvents,
  onEventChange,
  isActive,
}: UseEventsAutoAdvanceOptions): UseEventsAutoAdvanceReturn {
  const [progress, setProgress] = useState<number>(0);
  const [nextAdvanceIdx, setNextAdvanceIdx] = useState<number | null>(null);
  const [prevAdvanceIdx, setPrevAdvanceIdx] = useState<number | null>(null);
  const [drainingIdx, setDrainingIdx] = useState<number | null>(null);

  const currentIdxRef = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  const startProgressTimer = useCallback(() => {
    clearTimers();
    setProgress(0);
    // Clear transition states to avoid stuck states if timer restarts mid-transition
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    
    const startTime = Date.now();
    const updateInterval = 100; // 10fps is plenty; reduces re-renders under scroll-snap
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / EVENT_DISPLAY_DURATION_MS) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearTimers();
        
        // Start transition to next event
        const currentIdx = currentIdxRef.current;
        const nextIdx = (currentIdx + 1) % totalEvents;
        
        setNextAdvanceIdx(nextIdx);
        setPrevAdvanceIdx(currentIdx);
        setDrainingIdx(currentIdx);
        
        transitionTimeoutRef.current = setTimeout(() => {
          setNextAdvanceIdx(null);
          setPrevAdvanceIdx(null);
          setDrainingIdx(null);
          setProgress(0);
          currentIdxRef.current = nextIdx;
          onEventChange(nextIdx);
        }, 600); // Match TRANSITION_ANIMATION_DURATION
      }
    }, updateInterval);
  }, [clearTimers, totalEvents, onEventChange]);

  // Start/stop timer based on visibility
  useEffect(() => {
    if (isActive) {
      startProgressTimer();
    } else {
      clearTimers();
    }
    
    return () => clearTimers();
  }, [isActive, startProgressTimer, clearTimers]);

  // Restart timer when event changes (after transition)
  useEffect(() => {
    if (isActive && nextAdvanceIdx === null) {
      startProgressTimer();
    }
  }, [isActive, nextAdvanceIdx, startProgressTimer]);

  const handleManualSelect = useCallback((idx: number) => {
    clearTimers();
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    setProgress(0);
    currentIdxRef.current = idx;
    onEventChange(idx);
    
    // Restart the timer after a short delay
    if (isActive) {
      setTimeout(() => {
        startProgressTimer();
      }, 100);
    }
  }, [clearTimers, onEventChange, isActive, startProgressTimer]);

  const resetProgress = useCallback(() => {
    clearTimers();
    setProgress(0);
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    currentIdxRef.current = 0;
  }, [clearTimers]);

  return {
    progress,
    nextAdvanceIdx,
    prevAdvanceIdx,
    drainingIdx,
    handleManualSelect,
    resetProgress,
  };
}

