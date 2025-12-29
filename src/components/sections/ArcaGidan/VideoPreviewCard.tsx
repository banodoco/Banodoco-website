import { useRef, useState, useCallback, useEffect } from 'react';
import { useVideoPreview } from './useVideoPreview';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';

interface VideoPreviewCardProps {
  poster: string;
  video: string;
  alt: string;
  /** Whether the parent section is visible - used to pause video when scrolled away */
  isSectionVisible?: boolean;
}

/**
 * A card that shows a poster image and plays video on hover (desktop) or tap (mobile).
 * Reusable component for any hover-to-preview video pattern.
 */
export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({ poster, video, alt, isSectionVisible = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const pendingPlayRef = useRef(false);

  // Start loading video as soon as section is visible (for faster playback on tap/hover)
  useEffect(() => {
    if (isSectionVisible && !shouldLoadVideo) {
      setShouldLoadVideo(true);
    }
  }, [isSectionVisible, shouldLoadVideo]);

  const activateVideo = useCallback(() => {
    // Mark that we want to play once loaded.
    if (!shouldLoadVideo) {
      pendingPlayRef.current = true;
      setShouldLoadVideo(true);
    }
  }, [shouldLoadVideo]);

  // Called when video has enough data to play
  const handleCanPlay = useCallback(() => {
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      videoRef.current?.play();
    }
  }, []);
  
  const {
    showVideo,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleClick,
    handlePlaying,
  } = useVideoPreview({ videoRef, onActivate: activateVideo });

  // Pause video when section scrolls out of view (hover-triggered, so pauseOnly)
  useAutoPauseVideo(videoRef, {
    isActive: isSectionVisible,
    pauseOnly: true, // Don't auto-resume - video is hover/tap triggered
  });

  return (
    <div
      className="relative h-full min-h-0 overflow-hidden cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {/* Poster image - only hide when video is actually playing */}
      <img
        src={poster}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-75 ${
          showVideo ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Video - fade in when playing */}
      <video
        ref={videoRef}
        src={shouldLoadVideo ? video : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload={shouldLoadVideo ? 'auto' : 'none'}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-75 ${
          showVideo ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle gradient overlay at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};


