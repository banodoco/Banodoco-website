import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useArtPieces } from '@/hooks/useArtPieces';
import { ArtGalleryCard } from './ArtGalleryCard';

const PAGE_SIZE = 5;

interface ArtGallerySectionProps {
  status: 'curated' | 'all';
}

function getArtCardClass(index: number, featuredCount: number): string {
  if (index < featuredCount) return 'col-span-12 sm:col-span-6 lg:col-span-6';
  return 'col-span-12 sm:col-span-6 lg:col-span-4';
}

export const ArtGallerySection = ({ status }: ArtGallerySectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const [sectionInView, setSectionInView] = useState(false);
  const [sectionHovered, setSectionHovered] = useState(false);
  const [pagerHovered, setPagerHovered] = useState(false);
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

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setSectionInView(entry.isIntersecting),
      { threshold: 0.12 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const showPager = sectionInView && (sectionHovered || pagerHovered);

  return (
    <section
      ref={sectionRef}
      className="relative"
      onMouseEnter={() => setSectionHovered(true)}
      onMouseLeave={() => setSectionHovered(false)}
    >
      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div
          className={`fixed inset-x-0 bottom-4 z-50 flex justify-center transition-opacity duration-150 ${
            showPager
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }`}
          onMouseEnter={() => setPagerHovered(true)}
          onMouseLeave={() => setPagerHovered(false)}
        >
          <div className="flex items-center gap-5 rounded-full border border-white/10 bg-zinc-950/85 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-full border border-white/10 p-2 text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous art page"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex min-w-16 items-center justify-center gap-3 text-sm font-bold">
              <span className="text-zinc-100">{page}</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-500">{totalPages}</span>
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-full border border-white/10 p-2 text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next art page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

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

    </section>
  );
};
