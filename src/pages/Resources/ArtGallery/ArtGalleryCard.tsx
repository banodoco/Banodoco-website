import { Link } from 'react-router-dom';
import type { ArtPieceItem } from '@/hooks/useArtPieces';
import { buildArtPath, isUuid } from '@/lib/routing';

interface ArtGalleryCardProps {
  artPiece: ArtPieceItem;
  featured?: boolean;
}

export const ArtGalleryCard = ({ artPiece, featured = false }: ArtGalleryCardProps) => {
  const { id, thumbnailUrl, hlsUrl, mediaType, creator, competition } = artPiece;

  if (!thumbnailUrl) return null;

  const isVideo = mediaType === 'video' || !!hlsUrl;
  const isLinkable = isUuid(id);
  const href = isLinkable ? buildArtPath(id, artPiece.caption, creator.username) : '';

  const cardClass = `group block w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 transition-all duration-200 ${isLinkable ? 'hover:scale-[1.02] hover:border-white/20' : 'cursor-default'}`;

  const content = (
    <>
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

        {/* Top-left badges container */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
          {competition && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-white rounded shadow-sm flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              {competition.badge ?? competition.name}
            </span>
          )}
          {isVideo && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white/90 rounded">
              Video
            </span>
          )}
        </div>

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
    </>
  );

  if (!isLinkable) {
    return <div className={cardClass}>{content}</div>;
  }

  return (
    <Link to={href} className={cardClass}>
      {content}
    </Link>
  );
};
