import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ArtPieceItem } from '@/hooks/useArtPieces';
import { HlsPlayer } from '@/pages/Resources/HlsPlayer';
import { buildArtPath } from '@/lib/routing';

interface ArtGalleryModalProps {
  artPiece: ArtPieceItem;
  onClose: () => void;
}

export const ArtGalleryModal = ({ artPiece, onClose }: ArtGalleryModalProps) => {
  const { thumbnailUrl, hlsUrl, mediaType, caption, creator } = artPiece;
  const isVideo = mediaType === 'video' || !!hlsUrl;
  const displayName = creator.displayName ?? creator.username ?? 'Unknown';
  const detailPath = buildArtPath(artPiece.id, caption, creator.username);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/95 overflow-y-auto p-4 sm:p-8"
      onClick={handleBackdropClick}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-full max-w-5xl" onClick={e => e.stopPropagation()}>
        <div className="w-full rounded-lg overflow-hidden bg-black">
          {isVideo && hlsUrl ? (
            <HlsPlayer
              hlsUrl={hlsUrl}
              thumbnailUrl={thumbnailUrl}
              className="max-h-[80vh]"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={caption ?? 'Art piece'}
              className="w-full max-h-[80vh] object-contain"
            />
          ) : null}
        </div>

        <div className="mt-6 space-y-4 pb-8">
          <div className="flex items-center gap-3">
            {creator.avatarUrl && (
              <img src={creator.avatarUrl} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              {creator.profileUrl ? (
                <Link
                  to={creator.profileUrl}
                  className="text-sm sm:text-base font-medium text-white hover:text-white/80 transition-colors"
                >
                  {displayName}
                </Link>
              ) : (
                <span className="text-sm sm:text-base font-medium text-white">{displayName}</span>
              )}
            </div>
            <Link
              to={detailPath}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors"
            >
              View full page
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {caption && (
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
