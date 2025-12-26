import { useRef } from 'react';
import { useVideoPreview } from './useVideoPreview';

interface VideoPreviewCardProps {
  poster: string;
  video: string;
  alt: string;
}

/**
 * A card that shows a poster image and plays video on hover (desktop) or tap (mobile).
 * Reusable component for any hover-to-preview video pattern.
 */
export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({ poster, video, alt }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    showVideo,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleClick,
    handlePlaying,
  } = useVideoPreview({ videoRef });

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
        src={video}
        muted
        loop
        playsInline
        preload="auto"
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


