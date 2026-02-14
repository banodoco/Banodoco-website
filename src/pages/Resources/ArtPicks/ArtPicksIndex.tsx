import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getWeeks } from './data';
import { ArtPickCard } from './ArtPickCard';

const ITEMS_PER_PAGE = 12;

const ArtPicksIndex = () => {
  const weeks = getWeeks();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(weeks.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return weeks.slice(start, start + ITEMS_PER_PAGE);
  }, [weeks, page]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="pt-20 pb-16 px-6 md:px-20 lg:px-24 max-w-[1400px] mx-auto">
      <Link
        to="/resources"
        className="inline-block text-sm text-white/40 hover:text-white transition-colors mb-6"
      >
        &larr; Back to Resources
      </Link>

      <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
        Top Art Picks
      </h1>
      <p className="text-white/50 text-sm mt-1 mb-8">
        Weekly art picks from the Banodoco community.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginated.map((week) => (
          <ArtPickCard key={week.id} week={week} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={handlePrev}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-white/60 hover:text-white hover:bg-white/10"
          >
            &larr; Prev
          </button>
          <span className="text-sm text-white/40">
            {page} / {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-white/60 hover:text-white hover:bg-white/10"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default ArtPicksIndex;
