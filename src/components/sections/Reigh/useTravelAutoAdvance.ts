import { useState, useRef, useCallback } from 'react';

// Timing constants - keep CSS and JS in sync
export const AUTO_ADVANCE_DELAY_MS = 3800;
export const AUTO_ADVANCE_ANIMATION_DURATION = '3.75s';

interface UseTravelAutoAdvanceOptions {
  totalExamples: number;
  onExampleChange: (idx: number) => void;
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
  const lastProgressUpdateRef = useRef<number>(0);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const handleVideoEnded = useCallback((idx: number) => {
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
      onExampleChange(nextIdx);
    }, AUTO_ADVANCE_DELAY_MS);
  }, [totalExamples, onExampleChange]);

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
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    setVideoProgress(0);
    onExampleChange(idx);
  }, [clearAutoAdvance, onExampleChange]);

  const handleVideoStarted = useCallback((idx: number) => {
    setVideoEnded(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
    setVideoPlayed(prev => new Set(prev).add(idx));
  }, []);

  const resetAll = useCallback(() => {
    clearAutoAdvance();
    setVideoEnded(new Set(Array.from({ length: totalExamples }, (_, i) => i)));
    setVideoPlayed(new Set());
    setNextAdvanceIdx(null);
    setPrevAdvanceIdx(null);
    setDrainingIdx(null);
    setVideoProgress(0);
  }, [clearAutoAdvance, totalExamples]);

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


