import { useEffect, useRef, useCallback } from 'react';

/**
 * Options for useAutoPauseVideo hook.
 */
export interface UseAutoPauseVideoOptions {
  /**
   * Whether the section is currently active/visible.
   * Video will pause when false, resume when true (unless blocked).
   */
  isActive: boolean;

  /**
   * Whether the section has been seen at least once.
   * If provided and false, video won't auto-play until user has scrolled to section.
   * Useful for sections that shouldn't play until first visible.
   * @default true
   */
  hasStarted?: boolean;

  /**
   * Additional blocking condition(s) that prevent auto-resume.
   * Examples: lightbox open, rewind animation in progress, etc.
   * Video will only auto-resume when isActive && hasStarted && canResume.
   * @default true
   */
  canResume?: boolean;

  /**
   * Called when video is paused due to visibility change (scrolled away).
   * Use this for cleanup: cancel animations, stop audio, clear timers.
   * NOT called when video naturally ends or is paused by user interaction.
   */
  onPause?: () => void;

  /**
   * Called right before attempting to resume playback.
   * Use this to prepare the video (seek to position, set playback rate, etc.).
   * Return false to abort the resume.
   */
  onBeforeResume?: (video: HTMLVideoElement) => boolean | void;

  /**
   * Called after video.play() promise resolves successfully.
   * Use this for post-play actions like re-applying seek on Mobile Safari.
   */
  onAfterResume?: (video: HTMLVideoElement) => void;

  /**
   * Start offset in seconds. Video will seek to this position before resuming.
   * Useful for videos that should skip intro frames.
   * @default 0
   */
  startOffset?: number;

  /**
   * If true, the hook will only pause the video when scrolled away,
   * but will NOT auto-resume. Use for hover/tap-triggered videos.
   * @default false
   */
  pauseOnly?: boolean;

  /**
   * Debounce delay (ms) before pausing when the section becomes inactive.
   * Helps avoid rapid pause/play thrash on fast scroll or IO flapping.
   * @default 0
   */
  pauseDelayMs?: number;

  /**
   * If true, the hook will auto-play on first entry when hasStarted becomes true.
   * If false, initial play is left to the component (e.g., triggered by selection change).
   * @default true
   */
  autoPlayOnStart?: boolean;

  /**
   * If true, the video should loop back to startOffset (not 0) when it loops.
   * Only relevant when startOffset > 0 and video has loop attribute.
   * @default false
   */
  loopToOffset?: boolean;
}

/**
 * Result from useAutoPauseVideo hook.
 */
export interface UseAutoPauseVideoResult {
  /**
   * Manually trigger a safe play (catches promise rejection).
   * Respects blocking conditions - won't play if !canResume.
   */
  safePlay: () => void;

  /**
   * Manually trigger pause.
   */
  safePause: () => void;

  /**
   * Whether the video is currently allowed to play
   * (isActive && hasStarted && canResume && !pauseOnly).
   */
  canPlay: boolean;
}

/**
 * Hook to automatically pause/resume a video based on section visibility.
 * 
 * Handles common edge cases:
 * - Blocking conditions (lightbox, animations)
 * - Start offsets (skip intro)
 * - Loop offset reset
 * - Cleanup callbacks on pause
 * - Hover-only videos (pauseOnly mode)
 * 
 * @example
 * // Simple case - auto pause/resume
 * const videoRef = useRef<HTMLVideoElement>(null);
 * useAutoPauseVideo(videoRef, { isActive });
 * 
 * @example
 * // With blocking condition
 * useAutoPauseVideo(videoRef, {
 *   isActive,
 *   canResume: !showLightbox && !isRewinding,
 *   onPause: () => cancelAnimationFrame(rafId),
 * });
 * 
 * @example
 * // Hover-triggered video (only pause on scroll-away)
 * useAutoPauseVideo(videoRef, {
 *   isActive,
 *   pauseOnly: true,
 * });
 */
export function useAutoPauseVideo(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseAutoPauseVideoOptions
): UseAutoPauseVideoResult {
  const {
    isActive,
    hasStarted = true,
    canResume = true,
    onPause,
    onBeforeResume,
    onAfterResume,
    startOffset = 0,
    pauseOnly = false,
    pauseDelayMs = 0,
    loopToOffset = false,
    autoPlayOnStart = true,
  } = options;

  // Track whether we've paused due to visibility (vs user/natural pause)
  const pausedByVisibilityRef = useRef(false);
  // Track if we've ever played (to avoid resuming something that never started)
  const hasPlayedRef = useRef(false);
  // Pending pause timeout (debounce for brief visibility flaps)
  const pendingPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whether all conditions allow playback
  const canPlay = isActive && hasStarted && canResume && !pauseOnly;

  // Safe play helper - catches rejection, respects offset
  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply start offset if needed and video is before it
    if (startOffset > 0 && video.currentTime < startOffset - 0.1) {
      try {
        video.currentTime = startOffset;
      } catch {
        // Ignore (some browsers can throw if not seekable yet)
      }
    }

    // Let caller prepare video (set playback rate, etc.)
    if (onBeforeResume) {
      const shouldProceed = onBeforeResume(video);
      if (shouldProceed === false) return;
    }

    video.play()
      .then(() => {
        hasPlayedRef.current = true;
        pausedByVisibilityRef.current = false;
        // Call post-play callback (useful for Mobile Safari workarounds)
        onAfterResume?.(video);
      })
      .catch(() => {
        // Autoplay blocked or video not ready - this is expected.
        // Important: don't flip `hasPlayed` / `pausedByVisibility` here, so we don't get "stuck"
        // thinking playback succeeded.
      });
  }, [videoRef, startOffset, onBeforeResume, onAfterResume]);

  // Safe pause helper
  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, [videoRef]);

  // Main visibility effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (canPlay) {
      // Cancel any pending debounced pause when we become active again
      if (pendingPauseTimeoutRef.current) {
        clearTimeout(pendingPauseTimeoutRef.current);
        pendingPauseTimeoutRef.current = null;
      }

      // Resume if we previously paused due to visibility
      const shouldResumeDueToPause = pausedByVisibilityRef.current;
      // Auto-play on first entry (if enabled and component hasn't played yet)
      const shouldAutoStart = autoPlayOnStart && !hasPlayedRef.current && hasStarted;
      
      if (shouldResumeDueToPause || shouldAutoStart) {
        safePlay();
      }
    } else if (isActive === false) {
      // Debounced pause to avoid rapid scroll/IO flapping causing flicker
      if (pendingPauseTimeoutRef.current) return;

      // Only handle pause when explicitly not active (scrolled away)
      // Don't pause just because canResume is false (that's a blocking condition)
      const doPause = () => {
        pendingPauseTimeoutRef.current = null;
        const v = videoRef.current;
        if (!v) return;
        if (!v.paused) {
          v.pause();
          pausedByVisibilityRef.current = true;
          onPause?.();
        }
      };

      if (pauseDelayMs > 0) {
        pendingPauseTimeoutRef.current = setTimeout(doPause, pauseDelayMs);
      } else {
        doPause();
      }
    }
  }, [canPlay, isActive, hasStarted, safePlay, onPause, videoRef, autoPlayOnStart, pauseDelayMs]);

  // Cleanup any pending pause on unmount
  useEffect(() => {
    return () => {
      if (pendingPauseTimeoutRef.current) {
        clearTimeout(pendingPauseTimeoutRef.current);
        pendingPauseTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle loop-to-offset for videos with startOffset
  useEffect(() => {
    if (!loopToOffset || startOffset <= 0) return;

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // If video looped back to near start (0-0.5s), jump to offset
      if (video.currentTime < 0.5 && !video.paused && video.loop) {
        video.currentTime = startOffset;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, startOffset, loopToOffset]);

  return {
    safePlay,
    safePause,
    canPlay,
  };
}

/**
 * Variant for multiple videos where only one should be active at a time.
 * Pauses all videos when not active, but doesn't auto-resume
 * (assumes manual control of which video plays).
 */
export function useAutoPauseVideos(
  videoRefs: React.RefObject<HTMLVideoElement | null>[],
  options: Omit<UseAutoPauseVideoOptions, 'pauseOnly'> & {
    /** Index of the currently selected video (-1 for none) */
    activeIndex?: number;
  }
): void {
  const { isActive, onPause, activeIndex = -1 } = options;

  useEffect(() => {
    if (!isActive) {
      // Pause all videos when section not visible
      let anyPaused = false;
      videoRefs.forEach((ref) => {
        const video = ref.current;
        if (video && !video.paused) {
          video.pause();
          anyPaused = true;
        }
      });
      if (anyPaused) {
        onPause?.();
      }
    }
  }, [isActive, videoRefs, onPause]);

  // Pause videos that aren't the active one
  useEffect(() => {
    if (activeIndex < 0) return;

    videoRefs.forEach((ref, idx) => {
      const video = ref.current;
      if (video && idx !== activeIndex && !video.paused) {
        video.pause();
      }
    });
  }, [activeIndex, videoRefs]);
}

