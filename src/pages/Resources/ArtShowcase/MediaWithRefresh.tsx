import { useState, useRef, useCallback } from 'react';
import { useMediaUrlRefresh } from '@/pages/Resources/Discord/useMediaUrlRefresh';

interface MediaWithRefreshProps {
  src: string;
  messageId: string;
  alt?: string;
  className?: string;
  isVideo?: boolean;
  poster?: string;
  onClick?: () => void;
  /** Render video as a thumbnail-only preview (no controls, preload metadata) */
  videoPreview?: boolean;
}

export const MediaWithRefresh = ({
  src,
  messageId,
  alt = '',
  className = '',
  isVideo = false,
  poster,
  onClick,
  videoPreview = false,
}: MediaWithRefreshProps) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);
  const hasRetried = useRef(false);
  const { refreshMediaUrls } = useMediaUrlRefresh();

  const handleError = useCallback(async () => {
    if (hasRetried.current) {
      setFailed(true);
      return;
    }
    hasRetried.current = true;

    const freshUrls = await refreshMediaUrls(String(messageId));
    if (freshUrls && freshUrls.length > 0) {
      setCurrentSrc(freshUrls[0]);
    } else {
      setFailed(true);
    }
  }, [messageId, refreshMediaUrls]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-white/5 text-white/20 ${className}`}>
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={currentSrc}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        controls={!videoPreview}
        className={`object-cover ${className}`}
        onError={handleError}
        onClick={onClick}
      />
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`object-cover ${className}`}
      onError={handleError}
      onClick={onClick}
      loading="lazy"
    />
  );
};
