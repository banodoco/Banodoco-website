import { useState, useCallback } from 'react';
import type { ArtPieceItem } from '@/hooks/useArtPieces';
import { ArtGalleryModal } from './ArtGalleryModal';
import { getAnimatedThumbnail } from './getAnimatedThumbnail';

interface ArtGalleryCardProps {
  artPiece: ArtPieceItem;
  featured?: boolean;
}

export const ArtGalleryCard = ({ artPiece, featured = false }: ArtGalleryCardProps) => {
  const { thumbnailUrl, cloudflareThumbnailUrl, hlsUrl, mediaType, creator } = artPiece;

  const [hovered, setHovered] = useState(false);
  const [animatedLoaded, setAnimatedLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setAnimatedLoaded(false);
  }, []);

  if (!thumbnailUrl) return null;

  const isVideo = mediaType === 'video' || !!hlsUrl;
  const animatedUrl = isVideo && cloudflareThumbnailUrl ? getAnimatedThumbnail(cloudflareThumbnailUrl) : null;

  return (
    <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="rp-themed-card group block w-full text-left rounded-lg overflow-hidden bg-white/5 border border-white/10 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
    >
      {/* Media */}
      <div
        className={`relative bg-white/5 overflow-hidden ${featured ? 'aspect-[2/1]' : 'aspect-video'}`}
      >
        <img
          src={thumbnailUrl}
          alt={artPiece.caption ?? 'Art piece'}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            hovered && animatedLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
        {hovered && animatedUrl && (
          <img
            src={animatedUrl}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              animatedLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setAnimatedLoaded(true)}
          />
        )}

        {/* Video badge top-left */}
        {isVideo && (
          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white/90 rounded">
              Video
            </span>
          </div>
        )}

        {/* Creator glassmorphism overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 px-2.5 py-2 bg-black/40 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center gap-1.5">
            {creator.avatarUrl && (
              <img
                src={creator.avatarUrl}
                alt=""
                className="w-4 h-4 rounded-full flex-shrink-0"
                loading="lazy"
              />
            )}
            <p className="text-xs text-white/80 truncate">
              {creator.displayName ?? creator.username ?? 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    </button>
    {open && <ArtGalleryModal artPiece={artPiece} onClose={() => setOpen(false)} />}
    </>
  );
};
