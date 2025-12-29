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

  // Check if video is ready to show immediately (has at least some data loaded)
  const isVideoReady = useCallback(() => {
    // readyState >= 2 means HAVE_CURRENT_DATA (at least one frame available)
    return videoRef.current && videoRef.current.readyState >= 2;
  }, [videoRef]);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      onActivate?.();
      // Show video immediately if it's ready (preloaded)
      if (hasPlayedOnceRef.current || isVideoReady()) {
        setShowVideo(true);
      }
      videoRef.current?.play();
    }
  }, [isTouchDevice, videoRef, onActivate, isVideoReady]);

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
        // Show video immediately if it's ready (preloaded) - don't wait for onPlaying
        if (hasPlayedOnceRef.current || isVideoReady()) {
          setShowVideo(true);
          hasPlayedOnceRef.current = true;
        }
        videoRef.current?.play();
      } else {
        // Just pause - keep showing the video frame
        videoRef.current?.pause();
      }
    }
  }, [isTouchDevice, videoRef, onActivate, isVideoReady]);

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


