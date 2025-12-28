import { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoPreview } from './useVideoPreview';

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

  const activateVideo = useCallback(() => {
    // Attach `src` only after first user intent (hover/tap).
    setShouldLoadVideo(true);
  }, []);
  
  const {
    showVideo,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleClick,
    handlePlaying,
  } = useVideoPreview({ videoRef, onActivate: activateVideo });

  // Pause video when section scrolls out of view
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    if (!isSectionVisible) {
      videoEl.pause();
    }
  }, [isSectionVisible]);

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
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
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
        preload={shouldLoadVideo ? 'metadata' : 'none'}
        onPlaying={handlePlaying}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
          showVideo ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle gradient overlay at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};


