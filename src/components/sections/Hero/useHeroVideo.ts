import { useRef, useState, useCallback, useEffect } from 'react';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';
import { REWIND_SOUND_SRC, REWIND_DURATION_MS, PLAYBACK_RATE } from './config';

// Tailwind xl breakpoint - must match the xl:hidden / hidden xl:block classes in HeroVideo.tsx
const XL_BREAKPOINT = 1280;

export interface HeroVideoState {
  posterLoaded: boolean;
  videoReady: boolean;
  showRewindButton: boolean;
  isRewinding: boolean;
  showThumbsUp: boolean;
  isMuted: boolean;
}

export interface HeroVideoActions {
  setPosterLoaded: (loaded: boolean) => void;
  handleVideoCanPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  handleVideoLoadedData: () => void;
  handleVideoPlay: () => void;
  handleVideoEnded: () => void;
  handleRewind: () => void;
  toggleMute: () => void;
}

export interface HeroVideoRefs {
  sectionRef: React.RefObject<HTMLElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMobileView: boolean;
}

export function useHeroVideo(): HeroVideoState & HeroVideoActions & HeroVideoRefs {
  // Single ref - attaches to whichever video is currently rendered
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const rewindAudioRef = useRef<HTMLAudioElement | null>(null);
  const thumbsUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showRewindButton, setShowRewindButton] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Track breakpoint for conditional rendering in parent
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < XL_BREAKPOINT : true
  );

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < XL_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Section visibility - threshold raised to reduce decoder contention with other video sections
  const { ref: sectionRef, isActive } = useSectionRuntime({ threshold: 0.15, exitThreshold: 0.05 });

  // Blocking conditions for auto-resume
  const canResume = !isRewinding && !showRewindButton && !showThumbsUp;

  // Cleanup callback when paused due to visibility
  const onPause = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (rewindAudioRef.current) {
      rewindAudioRef.current.pause();
      rewindAudioRef.current = null;
    }
    if (thumbsUpTimeoutRef.current) {
      clearTimeout(thumbsUpTimeoutRef.current);
      thumbsUpTimeoutRef.current = null;
    }
    if (isRewinding || showThumbsUp) {
      setIsRewinding(false);
      setShowThumbsUp(false);
      setShowRewindButton(true);
    }
  }, [isRewinding, showThumbsUp]);

  // Single hook instance - active when section visible and video ready
  const { safePlay, videoEventHandlers } = useAutoPauseVideo(videoRef, {
    isActive: isActive && videoReady,
    canResume,
    onBeforeResume: (video) => { video.playbackRate = PLAYBACK_RATE; },
    onPause,
    retryDelayMs: isMobileView ? 200 : 150,
    maxRetries: isMobileView ? 10 : 5,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rewindAudioRef.current) rewindAudioRef.current.pause();
      if (thumbsUpTimeoutRef.current) clearTimeout(thumbsUpTimeoutRef.current);
    };
  }, []);

  // Handle canPlay - setup video and delegate to hook
  const handleVideoCanPlay = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.playbackRate = PLAYBACK_RATE;
    setIsMuted(video.muted);
    setVideoReady(true);
    videoEventHandlers.onCanPlay();
  }, [videoEventHandlers]);

  // Delegate to hook handlers
  const handleVideoLoadedData = useCallback(() => {
    videoEventHandlers.onLoadedData();
  }, [videoEventHandlers]);

  const handleVideoPlay = useCallback(() => {
    videoEventHandlers.onPlay();
  }, [videoEventHandlers]);

  const handleVideoEnded = useCallback(() => {
    setShowRewindButton(true);
  }, []);

  const handleRewind = useCallback(() => {
    const video = videoRef.current;
    if (!video || isRewinding) return;

    setIsRewinding(true);
    setShowRewindButton(false);
    video.pause();

    if (!isMuted) {
      rewindAudioRef.current = new Audio(REWIND_SOUND_SRC);
      rewindAudioRef.current.play().catch(() => {});
    }

    const startTime = performance.now();
    const startVideoTime = video.currentTime;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / REWIND_DURATION_MS, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 2);

      try {
        video.currentTime = startVideoTime * (1 - easedProgress);
      } catch {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        setIsRewinding(false);
        setShowRewindButton(true);
        return;
      }

      if (progress >= 1) {
        video.currentTime = 0;
        if (rewindAudioRef.current) {
          rewindAudioRef.current.pause();
          rewindAudioRef.current = null;
        }
        setIsRewinding(false);
        setShowThumbsUp(true);
        animationRef.current = null;

        thumbsUpTimeoutRef.current = setTimeout(() => {
          thumbsUpTimeoutRef.current = null;
          setShowThumbsUp(false);
          safePlay();
        }, 1000);
      } else {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [isRewinding, isMuted, safePlay]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  return {
    posterLoaded,
    videoReady,
    showRewindButton,
    isRewinding,
    showThumbsUp,
    isMuted,
    setPosterLoaded,
    handleVideoCanPlay,
    handleVideoLoadedData,
    handleVideoPlay,
    handleVideoEnded,
    handleRewind,
    toggleMute,
    sectionRef,
    videoRef,
    isMobileView,
  };
}
