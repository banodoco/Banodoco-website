import { Link } from 'react-router-dom';
import type { ArtPieceItem } from '@/hooks/useArtPieces';

interface ArtGalleryCardProps {
  artPiece: ArtPieceItem;
  featured?: boolean;
}

export const ArtGalleryCard = ({ artPiece, featured = false }: ArtGalleryCardProps) => {
  const { id, thumbnailUrl, hlsUrl, mediaType, creator } = artPiece;

  if (!thumbnailUrl) return null;

  const isVideo = mediaType === 'video' || !!hlsUrl;

  const href = creator.profileUrl
    ? `${creator.profileUrl}/art/${id}`
    : `/art/${id}`;

  return (
    <Link
      to={href}
      className="group block w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 transition-all duration-200 hover:scale-[1.02] hover:border-white/20"
    >
      {/* Media */}
      <div
        className={`relative bg-white/5 overflow-hidden ${featured ? 'aspect-[2/1]' : 'aspect-video'}`}
      >
        <img
          src={thumbnailUrl}
          alt={artPiece.caption ?? 'Art piece'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

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
    </Link>
  );
};
