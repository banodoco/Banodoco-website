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
}

export const MediaWithRefresh = ({
  src,
  messageId,
  alt = '',
  className = '',
  isVideo = false,
  poster,
  onClick,
}: MediaWithRefreshProps) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const hasRetried = useRef(false);
  const { refreshMediaUrls } = useMediaUrlRefresh();

  const handleError = useCallback(async () => {
    if (hasRetried.current) return;
    hasRetried.current = true;

    const freshUrls = await refreshMediaUrls(messageId);
    if (freshUrls && freshUrls.length > 0) {
      setCurrentSrc(freshUrls[0]);
    }
  }, [messageId, refreshMediaUrls]);

  if (isVideo) {
    return (
      <video
        src={currentSrc}
        poster={poster}
        controls
        muted
        className={className}
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
