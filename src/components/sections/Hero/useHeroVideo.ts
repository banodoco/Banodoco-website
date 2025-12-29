import { useRef, useState, useCallback, useEffect } from 'react';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
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
    };
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

      active.play().catch(() => {});
    } else {
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
  }, [isActive, videoReady, isRewinding, showRewindButton, showThumbsUp, getActiveVideo]);

  const handleVideoCanPlay = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.playbackRate = PLAYBACK_RATE;
    setIsMuted(e.currentTarget.muted);
    setVideoReady(true);
  }, []);

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
            activeNow.play().catch(() => {});
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

