import { useRef, useState, useCallback, useEffect } from 'react';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { REWIND_SOUND_SRC, REWIND_DURATION_MS, PLAYBACK_RATE } from './config';

function isElementVisible(el: HTMLElement | null): boolean {
  // `getClientRects()` is empty when `display: none` (e.g. Tailwind `hidden`)
  return !!el && el.getClientRects().length > 0;
}

// Retry configuration for mobile browsers
const RETRY_DELAY_MS = 150;
const MAX_RETRIES = 5;

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
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const playInProgressRef = useRef(false);

  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showRewindButton, setShowRewindButton] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const { ref: sectionRef, isActive } = useSectionRuntime();

  const getActiveVideo = useCallback(() => {
    const desktop = desktopVideoRef.current;
    const mobile = mobileVideoRef.current;

    if (isElementVisible(desktop)) return desktop;
    if (isElementVisible(mobile)) return mobile;

    return desktop ?? mobile ?? null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rewindAudioRef.current) rewindAudioRef.current.pause();
      if (thumbsUpTimeoutRef.current) clearTimeout(thumbsUpTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Play with retry logic for mobile browsers
  const playWithRetry = useCallback((video: HTMLVideoElement, isRetry = false) => {
    if (playInProgressRef.current && !isRetry) return;
    playInProgressRef.current = true;

    video.play()
      .then(() => {
        retryCountRef.current = 0;
        playInProgressRef.current = false;
      })
      .catch(() => {
        playInProgressRef.current = false;
        // Retry if we haven't exceeded max retries
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            // Only retry if video is still paused and conditions allow
            if (video.paused && isActive && !isRewinding && !showRewindButton && !showThumbsUp) {
              playWithRetry(video, true);
            }
          }, RETRY_DELAY_MS);
        }
      });
  }, [isActive, isRewinding, showRewindButton, showThumbsUp]);

  // Clear retries when pausing
  const clearRetries = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryCountRef.current = 0;
    playInProgressRef.current = false;
  }, []);

  // Pause video when scrolled away, resume when scrolled back
  useEffect(() => {
    const active = getActiveVideo();
    const mobile = mobileVideoRef.current;
    const desktop = desktopVideoRef.current;

    if (!active || !videoReady) return;

    if (isActive) {
      // Don't auto-resume into special UI states
      if (isRewinding || showRewindButton || showThumbsUp) return;
      
      // Pause the non-active video
      if (mobile && mobile !== active) mobile.pause();
      if (desktop && desktop !== active) desktop.pause();

      // Use retry logic for robust mobile playback
      playWithRetry(active);
    } else {
      // Clear any pending retries before pausing
      clearRetries();
      
      mobile?.pause();
      desktop?.pause();

      // Stop any ongoing rewind
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

      // Reset to clean state if interrupted
      if (isRewinding || showThumbsUp) {
        setIsRewinding(false);
        setShowThumbsUp(false);
        setShowRewindButton(true);
      }
    }
  }, [isActive, videoReady, isRewinding, showRewindButton, showThumbsUp, getActiveVideo, playWithRetry, clearRetries]);

  const handleVideoCanPlay = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.playbackRate = PLAYBACK_RATE;
    setIsMuted(video.muted);
    setVideoReady(true);
    
    // Retry play when video has enough data - critical for mobile
    // Only if this is the active video and conditions allow playback
    if (video.paused && isActive && !isRewinding && !showRewindButton && !showThumbsUp) {
      const active = getActiveVideo();
      if (video === active) {
        queueMicrotask(() => {
          if (video.paused) {
            playWithRetry(video);
          }
        });
      }
    }
  }, [isActive, isRewinding, showRewindButton, showThumbsUp, getActiveVideo, playWithRetry]);

  // Additional retry point when data is loaded
  const handleVideoLoadedData = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    // Same logic as canPlay - retry if paused and conditions allow
    if (video.paused && isActive && !isRewinding && !showRewindButton && !showThumbsUp) {
      const active = getActiveVideo();
      if (video === active) {
        queueMicrotask(() => {
          if (video.paused) {
            playWithRetry(video);
          }
        });
      }
    }
  }, [isActive, isRewinding, showRewindButton, showThumbsUp, getActiveVideo, playWithRetry]);

  const handleVideoEnded = useCallback((videoEl: HTMLVideoElement) => {
    if (videoEl !== getActiveVideo()) return;
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
      rewindAudioRef.current.play();
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
          const activeNow = getActiveVideo();
          if (activeNow) {
            activeNow.playbackRate = PLAYBACK_RATE;
            retryCountRef.current = 0; // Reset retries for fresh play
            playWithRetry(activeNow);
          }
        }, 1000);
      } else {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [isRewinding, isMuted, getActiveVideo]);

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

