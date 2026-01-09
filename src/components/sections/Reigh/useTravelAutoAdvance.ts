import { useState, useRef, useCallback, useEffect } from 'react';

// Timing constants - keep CSS and JS in sync
export const AUTO_ADVANCE_DELAY_MS = 3800;
export const AUTO_ADVANCE_ANIMATION_DURATION = '3.75s';
// Fallback timeout if video doesn't play/end (e.g., iOS autoplay blocked)
export const FALLBACK_ADVANCE_TIMEOUT_MS = 8000;

interface UseTravelAutoAdvanceOptions {
  totalExamples: number;
  onExampleChange: (idx: number) => void;
  isActive?: boolean; // Whether the section is in view - needed for fallback timer
}

interface UseTravelAutoAdvanceReturn {
  // State
  videoEnded: Set<number>;
  videoPlayed: Set<number>;
  nextAdvanceIdx: number | null;
  prevAdvanceIdx: number | null;
  drainingIdx: number | null;
  videoProgress: number;

  // Actions
  handleVideoEnded: (idx: number) => void;
  handleVideoTimeUpdate: (idx: number, currentTime: number, duration: number, selectedIdx: number) => void;
  handleManualSelect: (idx: number) => void;
  handleVideoStarted: (idx: number) => void;
  resetAll: () => void;
  setVideoProgress: (progress: number) => void;
}

export function useTravelAutoAdvance({
  totalExamples,
  onExampleChange,
  isActive = true,
}: UseTravelAutoAdvanceOptions): UseTravelAutoAdvanceReturn {
  const [videoEnded, setVideoEnded] = useState<Set<number>>(
    new Set(Array.from({ length: totalExamples }, (_, i) => i))
  );
  const [videoPlayed, setVideoPlayed] = useState<Set<number>>(new Set());

  const [nextAdvanceIdx, setNextAdvanceIdx] = useState<number | null>(null);
  const [prevAdvanceIdx, setPrevAdvanceIdx] = useState<number | null>(null);
  const [drainingIdx, setDrainingIdx] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState<number>(0);

  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  const currentIdxRef = useRef<number>(0);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const clearFallbackTimeout = useCallback(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const handleVideoEnded = useCallback((idx: number) => {
    // Clear fallback timer since video ended naturally
    clearFallbackTimeout();
    setVideoEnded(prev => new Set(prev).add(idx));

    const nextIdx = (idx + 1) % totalExamples;
    setNextAdvanceIdx(nextIdx);
    setPrevAdvanceIdx(idx);
    setDrainingIdx(idx);

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setNextAdvanceIdx(null);
      setPrevAdvanceIdx(null);
      setDrainingIdx(null);
      setVideoProgress(0);
      currentIdxRef.current = nextIdx;
      onExampleChange(nextIdx);
    }, AUTO_ADVANCE_DELAY_MS);
  }, [totalExamples, onExampleChange, clearFallbackTimeout]);

  const handleVideoTimeUpdate = useCallback((
    idx: number,
    currentTime: number,
    duration: number,
    selectedIdx: number
  ) => {
    if (idx !== selectedIdx || !duration) return;

    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 100) return;
    lastProgressUpdateRef.current = now;

    const progress = (currentTime / duration) * 100;
    setVideoProgress(progress);
  }, []);

  const handleManualSelect = useCallback((idx: number) => {
    clearAutoAdvance();
    clearFallbackTimeout();
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    setVideoProgress(0);
    currentIdxRef.current = idx;
    onExampleChange(idx);
  }, [clearAutoAdvance, clearFallbackTimeout, onExampleChange]);

  const handleVideoStarted = useCallback((idx: number) => {
    // Video is playing - clear the fallback timer since onEnded will handle advance
    clearFallbackTimeout();
    setVideoEnded(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
    setVideoPlayed(prev => new Set(prev).add(idx));
  }, [clearFallbackTimeout]);

  const resetAll = useCallback(() => {
    clearAutoAdvance();
    clearFallbackTimeout();
    setVideoEnded(new Set(Array.from({ length: totalExamples }, (_, i) => i)));
    setVideoPlayed(new Set());
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    setVideoProgress(0);
    currentIdxRef.current = 0;
  }, [clearAutoAdvance, clearFallbackTimeout, totalExamples]);

  // Fallback timer effect: if video doesn't play/end, still auto-advance
  // This handles iOS cases where autoplay is blocked
  useEffect(() => {
    if (!isActive) {
      clearFallbackTimeout();
      return;
    }

    // Don't start fallback if video has already ended (waiting for transition)
    if (videoEnded.has(currentIdxRef.current)) {
      return;
    }

    // Start fallback timer - if video doesn't end naturally, force advance
    clearFallbackTimeout();
    fallbackTimeoutRef.current = setTimeout(() => {
      fallbackTimeoutRef.current = null;
      const currentIdx = currentIdxRef.current;
      
      // Only trigger if video still hasn't ended
      if (!videoEnded.has(currentIdx)) {
        const nextIdx = (currentIdx + 1) % totalExamples;
        setNextAdvanceIdx(nextIdx);
        setPrevAdvanceIdx(currentIdx);
        setDrainingIdx(currentIdx);
        setVideoEnded(prev => new Set(prev).add(currentIdx));

        autoAdvanceTimeoutRef.current = setTimeout(() => {
          setNextAdvanceIdx(null);
          setPrevAdvanceIdx(null);
          setDrainingIdx(null);
          setVideoProgress(0);
          currentIdxRef.current = nextIdx;
          onExampleChange(nextIdx);
        }, AUTO_ADVANCE_DELAY_MS);
      }
    }, FALLBACK_ADVANCE_TIMEOUT_MS);

    return () => clearFallbackTimeout();
  }, [isActive, videoEnded, totalExamples, onExampleChange, clearFallbackTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoAdvance();
      clearFallbackTimeout();
    };
  }, [clearAutoAdvance, clearFallbackTimeout]);

  return {
    videoEnded,
    videoPlayed,
    nextAdvanceIdx,
    prevAdvanceIdx,
    drainingIdx,
    videoProgress,
    handleVideoEnded,
    handleVideoTimeUpdate,
    handleManualSelect,
    handleVideoStarted,
    resetAll,
    setVideoProgress,
  };
}


