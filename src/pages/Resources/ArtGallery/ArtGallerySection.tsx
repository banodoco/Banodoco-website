import { useEffect, useState } from 'react';
import { useArtPieces } from '@/hooks/useArtPieces';
import { ArtGalleryCard } from './ArtGalleryCard';
import { ResourcePagination } from '../ResourcePagination';

const PAGE_SIZE = 5;

interface ArtGallerySectionProps {
  status: 'curated' | 'all';
}

function getArtCardClass(index: number, featuredCount: number): string {
  if (index < featuredCount) return 'col-span-12 sm:col-span-6 lg:col-span-6';
  return 'col-span-12 sm:col-span-6 lg:col-span-4';
}

export const ArtGallerySection = ({ status }: ArtGallerySectionProps) => {
  const [page, setPage] = useState(1);
  const { artPieces, loading, totalCount } = useArtPieces(undefined, {
    featuredOn2rf: status === 'curated',
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const featuredCount = Math.min(2, artPieces.length);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    if (!loading && page > totalPages) {
      setPage(totalPages);
    }
  }, [loading, page, totalPages]);

  return (
    <section className="relative">
      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
              className={getArtCardClass(i, featuredCount)}
            >
              <ArtGalleryCard artPiece={piece} featured={i < featuredCount} />
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

      {/* Pagination — in-flow, centered, numbered */}
      {!loading && (
        <ResourcePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-8 flex justify-center"
        />
      )}
    </section>
  );
};
