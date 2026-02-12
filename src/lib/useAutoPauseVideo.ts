import { useEffect, useRef, useCallback } from 'react';

/**
 * Options for useAutoPauseVideo hook.
 */
interface UseAutoPauseVideoOptions {
  /**
   * Whether the section is currently active/visible.
   * Video will pause when false, resume when true (unless blocked).
   */
  isActive: boolean;

  /**
   * Additional blocking condition(s) that prevent auto-resume.
   * Examples: lightbox open, rewind animation in progress, etc.
   * Video will only auto-resume when isActive && canResume.
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
   * Retry delay (ms) for play attempts. On mobile, videos sometimes need
   * multiple attempts due to browser restrictions.
   * @default 100
   */
  retryDelayMs?: number;

  /**
   * Maximum number of retry attempts for play.
   * @default 3
   */
  maxRetries?: number;
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
   * Whether the video is currently allowed to play (isActive && canResume && !pauseOnly).
   */
  canPlay: boolean;

  /**
   * Event handlers to attach to the video element.
   * These sync internal state with actual video state.
   */
  videoEventHandlers: {
    onPlay: () => void;
    onCanPlay: () => void;
    onLoadedData: () => void;
  };
}

/**
 * Hook to automatically pause/resume a video based on section visibility.
 * 
 * Handles common edge cases:
 * - Blocking conditions (lightbox, animations)
 * - Cleanup callbacks on pause
 * - Hover-only videos (pauseOnly mode)
 * - Retry logic for mobile browsers
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
    canResume = true,
    onPause,
    onBeforeResume,
    pauseOnly = false,
    pauseDelayMs = 0,
    retryDelayMs = 100,
    maxRetries = 3,
  } = options;

  // Track whether we've paused due to visibility (vs user/natural pause)
  const pausedByVisibilityRef = useRef(false);
  // Track if we've ever played (to avoid resuming something that never started)
  const hasPlayedRef = useRef(false);
  // Pending pause timeout (debounce for brief visibility flaps)
  const pendingPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pending retry timeout
  const pendingRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Current retry count
  const retryCountRef = useRef(0);
  // Track if a play attempt is in progress to avoid concurrent attempts
  const playInProgressRef = useRef(false);

  // Whether all conditions allow playback
  const canPlay = isActive && canResume && !pauseOnly;

  // Core play function with retry logic
  const attemptPlay = useCallback((isRetry = false) => {
    const video = videoRef.current;
    if (!video) return;
    
    // Prevent concurrent play attempts
    if (playInProgressRef.current && !isRetry) return;
    playInProgressRef.current = true;

    // Let caller prepare video (set playback rate, seek position, etc.)
    if (onBeforeResume) {
      const shouldProceed = onBeforeResume(video);
      if (shouldProceed === false) {
        playInProgressRef.current = false;
        return;
      }
    }

    video.play()
      .then(() => {
        hasPlayedRef.current = true;
        pausedByVisibilityRef.current = false;
        retryCountRef.current = 0;
        playInProgressRef.current = false;
      })
      .catch(() => {
        playInProgressRef.current = false;
        // Retry if we haven't exceeded max retries and conditions still allow play
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          if (pendingRetryTimeoutRef.current) {
            clearTimeout(pendingRetryTimeoutRef.current);
          }
          pendingRetryTimeoutRef.current = setTimeout(() => {
            pendingRetryTimeoutRef.current = null;
            const v = videoRef.current;
            if (v && v.paused && isActive && canResume && !pauseOnly) {
              attemptPlay(true);
            }
          }, retryDelayMs);
        }
      });
  }, [videoRef, onBeforeResume, maxRetries, retryDelayMs, isActive, canResume, pauseOnly]);

  // Safe play helper - resets retry count and attempts play
  const safePlay = useCallback(() => {
    retryCountRef.current = 0;
    attemptPlay(false);
  }, [attemptPlay]);

  // Safe pause helper
  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Clear any pending retries when pausing
    if (pendingRetryTimeoutRef.current) {
      clearTimeout(pendingRetryTimeoutRef.current);
      pendingRetryTimeoutRef.current = null;
    }
    retryCountRef.current = 0;
    playInProgressRef.current = false;
    video.pause();
  }, [videoRef]);

  // Event handler: sync state when video actually starts playing
  // This handles the case where autoPlay attribute or external code starts the video
  const handleVideoPlay = useCallback(() => {
    hasPlayedRef.current = true;
    pausedByVisibilityRef.current = false;
    retryCountRef.current = 0;
    playInProgressRef.current = false;
  }, []);

  // Event handler: retry play when video has enough data
  // This is critical for mobile where autoPlay often fails on first attempt
  const handleVideoCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Only attempt play if:
    // 1. Video is paused
    // 2. All conditions allow playback
    // 3. No play attempt is already in progress
    if (video.paused && canPlay && !playInProgressRef.current) {
      // Use microtask to avoid racing with other event handlers
      queueMicrotask(() => {
        const v = videoRef.current;
        if (v && v.paused && canPlay) {
          safePlay();
        }
      });
    }
  }, [videoRef, canPlay, safePlay]);

  // Event handler: additional retry point when data is loaded
  const handleVideoLoadedData = useCallback(() => {
    handleVideoCanPlay();
  }, [handleVideoCanPlay]);

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

      // Resume if we previously paused due to visibility, or auto-play on first entry
      if (pausedByVisibilityRef.current || !hasPlayedRef.current) {
        safePlay();
      }
    } else if (isActive === false) {
      if (pendingPauseTimeoutRef.current) return;

      const doPause = () => {
        pendingPauseTimeoutRef.current = null;
        const v = videoRef.current;
        if (!v) return;
        if (!v.paused) {
          v.pause();
          pausedByVisibilityRef.current = true;
          onPause?.();
        }
        if (pendingRetryTimeoutRef.current) {
          clearTimeout(pendingRetryTimeoutRef.current);
          pendingRetryTimeoutRef.current = null;
        }
        retryCountRef.current = 0;
        playInProgressRef.current = false;
      };

      if (pauseDelayMs > 0) {
        pendingPauseTimeoutRef.current = setTimeout(doPause, pauseDelayMs);
      } else {
        doPause();
      }
    }
  }, [canPlay, isActive, safePlay, onPause, videoRef, pauseDelayMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingPauseTimeoutRef.current) {
        clearTimeout(pendingPauseTimeoutRef.current);
      }
      if (pendingRetryTimeoutRef.current) {
        clearTimeout(pendingRetryTimeoutRef.current);
      }
    };
  }, []);

  return {
    safePlay,
    safePause,
    canPlay,
    videoEventHandlers: {
      onPlay: handleVideoPlay,
      onCanPlay: handleVideoCanPlay,
      onLoadedData: handleVideoLoadedData,
    },
  };
}


