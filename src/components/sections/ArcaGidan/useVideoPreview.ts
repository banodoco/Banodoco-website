import { useState, useCallback, useRef } from 'react';

interface UseVideoPreviewOptions {
  /** Video element ref */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /**
   * Called right before we attempt to play.
   * Use this to lazily attach `src` / kick off loading.
   */
  onActivate?: () => void;
}

interface UseVideoPreviewResult {
  /** Whether the video is currently showing (playing) */
  showVideo: boolean;
  /** Whether this is a touch device */
  isTouchDevice: boolean;
  /** Call on mouse enter (desktop) */
  handleMouseEnter: () => void;
  /** Call on mouse leave (desktop) */
  handleMouseLeave: () => void;
  /** Call on touch start (mobile) */
  handleTouchStart: () => void;
  /** Call on click (mobile toggle) */
  handleClick: () => void;
  /** Call when video starts playing */
  handlePlaying: () => void;
}

/**
 * Hook for hover-to-preview video behavior.
 * Handles both desktop (hover) and mobile (tap to toggle) interactions.
 */
export const useVideoPreview = ({ videoRef, onActivate }: UseVideoPreviewOptions): UseVideoPreviewResult => {
  const [showVideo, setShowVideo] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hasPlayedOnceRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      // Allow the caller to lazy-load the video before we try to play.
      // (Important for performance: don't download 4 previews on mount.)
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      onActivate?.();
      // If video has played before, show it immediately (it's cached)
      if (hasPlayedOnceRef.current) {
        setShowVideo(true);
      }
      videoRef.current?.play();
    }
  }, [isTouchDevice, videoRef, onActivate]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) {
      // Just pause - keep showing the video frame (don't switch back to poster)
      videoRef.current?.pause();
    }
  }, [isTouchDevice, videoRef]);

  const handleTouchStart = useCallback(() => {
    setIsTouchDevice(true);
  }, []);

  const handleClick = useCallback(() => {
    if (isTouchDevice) {
      if (videoRef.current?.paused) {
        onActivate?.();
        if (hasPlayedOnceRef.current) {
          setShowVideo(true);
        }
        videoRef.current?.play();
      } else {
        // Just pause - keep showing the video frame
        videoRef.current?.pause();
      }
    }
  }, [isTouchDevice, videoRef, onActivate]);

  const handlePlaying = useCallback(() => {
    setShowVideo(true);
    hasPlayedOnceRef.current = true;
  }, []);

  return {
    showVideo,
    isTouchDevice,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleClick,
    handlePlaying,
  };
};


