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
      {!loading && artPieces.length > 0 && (() => {
        // Trim so last row of regular items (3/row on lg) is always full.
        // Reserve 1 slot for the Discord CTA card.
        const featured = artPieces.slice(0, Math.min(2, artPieces.length));
        const rest = artPieces.slice(featured.length);
        // We add 1 CTA card, so total regular slots = rest.length + 1 must be divisible by 3
        const regularCount = Math.floor((rest.length + 1) / 3) * 3 - 1;
        const displayRegular = rest.slice(0, Math.max(0, regularCount));
        const displayItems = [...featured, ...displayRegular];

        return (
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            {displayItems.map((piece, i) => (
              <div
                key={piece.id}
                className={
                  i < featured.length
                    ? 'col-span-12 sm:col-span-6 lg:col-span-6'
                    : 'col-span-12 sm:col-span-6 lg:col-span-4'
                }
              >
                <ArtGalleryCard artPiece={piece} featured={i < featured.length} />
              </div>
            ))}

            {/* Discord CTA card */}
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <a
                href="https://discord.gg/NnFxGvx94b"
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-lg overflow-hidden border border-indigo-500/20 hover:border-indigo-400/40 bg-gradient-to-br from-indigo-950/50 to-purple-950/30 transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex flex-col items-center justify-center text-center aspect-video p-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                    <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-white/90">Share Your Art on Discord</h3>
                  <p className="text-xs text-white/50 leading-relaxed max-w-[200px]">
                    Join our weekly art sharing event and get featured
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Join the community
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            </div>
          </div>
        );
      })()}

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
