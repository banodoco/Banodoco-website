import { useArtPieces } from '@/hooks/useArtPieces';
import { ArtGalleryCard } from './ArtGalleryCard';

export const ArtGallerySection = () => {
  const { artPieces, loading, loadingMore, hasMore, loadMore } = useArtPieces();

  return (
    <section>
      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`${
                i < 2
                  ? 'col-span-12 sm:col-span-6 lg:col-span-6'
                  : 'col-span-12 sm:col-span-6 lg:col-span-4'
              } rounded-lg overflow-hidden bg-white/5 border border-white/10 animate-pulse`}
            >
              <div
                className={`${i < 2 ? 'aspect-[2/1]' : 'aspect-video'} bg-white/5`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && artPieces.length > 0 && (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {artPieces.map((piece, i) => (
            <div
              key={piece.id}
              className={
                i < 2
                  ? 'col-span-12 sm:col-span-6 lg:col-span-6'
                  : 'col-span-12 sm:col-span-6 lg:col-span-4'
              }
            >
              <ArtGalleryCard artPiece={piece} featured={i < 2} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && artPieces.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">No art pieces to display yet.</p>
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </section>
  );
};
