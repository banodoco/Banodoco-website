import { useRef, useState, useCallback, useEffect } from 'react';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';
import { REWIND_SOUND_SRC, REWIND_DURATION_MS, PLAYBACK_RATE } from './config';

function isElementVisible(el: HTMLElement | null): boolean {
  // `getClientRects()` is empty when `display: none` (e.g. Tailwind `hidden`)
  return !!el && el.getClientRects().length > 0;
}

export interface HeroVideoState {
  posterLoaded: boolean;
  videoReady: boolean;
  showRewindButton: boolean;
  isRewinding: boolean;
  showThumbsUp: boolean;
  isMuted: boolean;
  isHovering: boolean;
}

export interface HeroVideoActions {
  setPosterLoaded: (loaded: boolean) => void;
  setIsHovering: (hovering: boolean) => void;
  handleVideoCanPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  handleVideoLoadedData: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  handleVideoPlay: () => void;
  handleVideoEnded: (videoEl: HTMLVideoElement) => void;
  handleRewind: () => void;
  toggleMute: () => void;
  scrollToNextSection: () => void;
}

export interface HeroVideoRefs {
  sectionRef: React.RefObject<HTMLElement | null>;
  mobileVideoRef: React.RefObject<HTMLVideoElement | null>;
  desktopVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useHeroVideo(): HeroVideoState & HeroVideoActions & HeroVideoRefs {
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const rewindAudioRef = useRef<HTMLAudioElement | null>(null);
  const thumbsUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showRewindButton, setShowRewindButton] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // Use a very low threshold so video keeps playing even when mostly scrolled away
  const { ref: sectionRef, isActive } = useSectionRuntime({ threshold: 0.05, exitThreshold: 0.02 });

  // Blocking conditions for auto-resume (special UI states)
  const canResume = !isRewinding && !showRewindButton && !showThumbsUp;

  // Callback to apply playback rate when video starts
  const onBeforeResume = useCallback((video: HTMLVideoElement) => {
    video.playbackRate = PLAYBACK_RATE;
  }, []);

  // Cleanup callback when paused due to visibility
  const onPause = useCallback(() => {
    // Stop any ongoing rewind animation
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
    // Reset to clean state if interrupted during special UI
    if (isRewinding || showThumbsUp) {
      setIsRewinding(false);
      setShowThumbsUp(false);
      setShowRewindButton(true);
    }
  }, [isRewinding, showThumbsUp]);

  // Use the shared hook for mobile video
  const { safePlay: safeMobilePlay, videoEventHandlers: mobileHandlers } = useAutoPauseVideo(mobileVideoRef, {
    // Only consider it active if it's actually rendered (xl:hidden vs hidden xl:block)
    isActive: isActive && videoReady && isElementVisible(mobileVideoRef.current),
    canResume,
    onBeforeResume,
    onPause,
    retryDelayMs: 150,
    maxRetries: 5,
  });

  // Use the shared hook for desktop video
  const { safePlay: safeDesktopPlay, videoEventHandlers: desktopHandlers } = useAutoPauseVideo(desktopVideoRef, {
    // Only consider it active if it's actually rendered
    isActive: isActive && videoReady && isElementVisible(desktopVideoRef.current),
    canResume,
    onBeforeResume,
    onPause,
    retryDelayMs: 150,
    maxRetries: 5,
  });

  // Get the currently active video element
  const getActiveVideo = useCallback(() => {
    const desktop = desktopVideoRef.current;
    const mobile = mobileVideoRef.current;
    if (isElementVisible(desktop)) return desktop;
    if (isElementVisible(mobile)) return mobile;
    return desktop ?? mobile ?? null;
  }, []);

  // Get the safe play function for the active video
  const safePlayActive = useCallback(() => {
    const active = getActiveVideo();
    if (!active) return;
    if (active === mobileVideoRef.current) safeMobilePlay();
    if (active === desktopVideoRef.current) safeDesktopPlay();
  }, [getActiveVideo, safeMobilePlay, safeDesktopPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rewindAudioRef.current) rewindAudioRef.current.pause();
      if (thumbsUpTimeoutRef.current) clearTimeout(thumbsUpTimeoutRef.current);
    };
  }, []);

  // Consolidated canPlay handler - sets up video and syncs state
  const handleVideoCanPlay = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.playbackRate = PLAYBACK_RATE;
    setIsMuted(video.muted);
    setVideoReady(true);
    
    // Delegate to the appropriate hook's handler
    if (video === mobileVideoRef.current) {
      mobileHandlers.onCanPlay();
    } else if (video === desktopVideoRef.current) {
      desktopHandlers.onCanPlay();
    }
  }, [mobileHandlers, desktopHandlers]);

  // Consolidated loadedData handler
  const handleVideoLoadedData = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video === mobileVideoRef.current) {
      mobileHandlers.onLoadedData();
    } else if (video === desktopVideoRef.current) {
      desktopHandlers.onLoadedData();
    }
  }, [mobileHandlers, desktopHandlers]);

  // Consolidated play handler - syncs hook state
  const handleVideoPlay = useCallback(() => {
    const active = getActiveVideo();
    if (!active) return;
    if (active === mobileVideoRef.current) mobileHandlers.onPlay();
    if (active === desktopVideoRef.current) desktopHandlers.onPlay();
  }, [getActiveVideo, mobileHandlers, desktopHandlers]);

  const handleVideoEnded = useCallback((videoEl: HTMLVideoElement) => {
    const active = getActiveVideo();
    if (videoEl !== active) return;
    setShowRewindButton(true);
  }, [getActiveVideo]);

  const handleRewind = useCallback(() => {
    const video = getActiveVideo();
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
          // Play via the hook's safe play
          safePlayActive();
        }, 1000);
      } else {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [isRewinding, isMuted, getActiveVideo, safePlayActive]);

  const toggleMute = useCallback(() => {
    const video = getActiveVideo();
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [getActiveVideo]);

  const scrollToNextSection = useCallback(() => {
    const hero = document.querySelector('section');
    const nextSection = hero?.nextElementSibling;
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return {
    // State
    posterLoaded,
    videoReady,
    showRewindButton,
    isRewinding,
    showThumbsUp,
    isMuted,
    isHovering,
    // Actions
    setPosterLoaded,
    setIsHovering,
    handleVideoCanPlay,
    handleVideoLoadedData,
    handleVideoPlay,
    handleVideoEnded,
    handleRewind,
    toggleMute,
    scrollToNextSection,
    // Refs
    sectionRef,
    mobileVideoRef,
    desktopVideoRef,
  };
}
