import { useState, useCallback, useRef } from 'react';

interface UseVideoPreviewOptions {
  /** Video element ref */
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
export const useVideoPreview = ({ videoRef }: UseVideoPreviewOptions): UseVideoPreviewResult => {
  const [showVideo, setShowVideo] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hasPlayedOnceRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      // If video has played before, show it immediately (it's cached)
      if (hasPlayedOnceRef.current) {
        setShowVideo(true);
      }
      videoRef.current?.play();
    }
  }, [isTouchDevice, videoRef]);

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
        if (hasPlayedOnceRef.current) {
          setShowVideo(true);
        }
        videoRef.current?.play();
      } else {
        // Just pause - keep showing the video frame
        videoRef.current?.pause();
      }
    }
  }, [isTouchDevice, videoRef]);

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


