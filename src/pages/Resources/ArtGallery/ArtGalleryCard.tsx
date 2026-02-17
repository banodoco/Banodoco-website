import { Link } from 'react-router-dom';
import type { ArtPieceItem } from '@/hooks/useArtPieces';

interface ArtGalleryCardProps {
  artPiece: ArtPieceItem;
  featured?: boolean;
}

export const ArtGalleryCard = ({ artPiece, featured = false }: ArtGalleryCardProps) => {
  const { id, mediaUrls, mediaTypes, thumbnailUrl, creator, reactionCount } = artPiece;

  const primaryUrl = thumbnailUrl ?? mediaUrls[0];
  if (!primaryUrl) return null;

  const isVideo =
    (mediaTypes[0]?.startsWith('video/') ?? false) ||
    primaryUrl.endsWith('.mp4') ||
    primaryUrl.endsWith('.webm');

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
        {isVideo ? (
          <video
            src={mediaUrls[0]}
            poster={thumbnailUrl ?? undefined}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <img
            src={primaryUrl}
            alt={artPiece.title ?? 'Art piece'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
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

        {/* Reaction count badge top-right */}
        {reactionCount > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium bg-black/60 backdrop-blur-sm text-white/90 rounded">
              <svg
                className="w-3 h-3 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              {reactionCount}
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
