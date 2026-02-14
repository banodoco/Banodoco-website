import { useState, useMemo, useEffect } from 'react';
import { useResources } from './useResources';
import { useResourceFilters } from './useResourceFilters';
import { FilterBar } from './FilterBar';
import { ResourceGrid } from './ResourceGrid';
import { ResourceModal } from './ResourceModal';
import { CommunityNewsSection } from './CommunityNews/CommunityNewsSection';
import { ArtPicksSection } from './ArtPicks/ArtPicksSection';
import type { Asset } from './types';

const ITEMS_PER_PAGE = 8;

const Resources = () => {
  const { assets, profiles, loading, error } = useResources();
  const {
    filters,
    searchInput,
    filtered,
    setFilter,
    handleSearchChange,
    availableBaseModels,
    availableLoraTypes,
  } = useResourceFilters(assets);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filters.type, filters.status, filters.mediaType, filters.baseModel, filters.loraType, filters.search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const handlePrev = () => setPage(p => Math.max(1, p - 1));
  const handleNext = () => setPage(p => Math.min(totalPages, p + 1));

  return (
    <div className="pt-20 pb-16 px-6 md:px-20 lg:px-24 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
          Resources
        </h1>
      </div>

      {/* Section 1: Community News */}
      <CommunityNewsSection />

      {/* Section 2: Things People Made */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Things People Made</h2>
        <p className="text-white/50 text-sm mb-6">
          LoRAs and workflows shared by the Banodoco community for AI video generation.
        </p>

        {/* Error state */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-400/80 text-lg">{error}</p>
          </div>
        )}

        {/* Filters */}
        {!error && (
          <FilterBar
            filters={filters}
            searchInput={searchInput}
            resultCount={filtered.length}
            availableBaseModels={availableBaseModels}
            availableLoraTypes={availableLoraTypes}
            onFilterChange={setFilter}
            onSearchChange={handleSearchChange}
          />
        )}

        {/* Grid */}
        {!error && (
          <div className="mt-6">
            <ResourceGrid
              assets={paginatedAssets}
              profiles={profiles}
              loading={loading}
              onCardClick={setSelectedAsset}
            />
          </div>
        )}

        {/* Pagination */}
        {!error && !loading && totalPages > 1 && (
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

      {/* Section 3: Top Art Picks */}
      <ArtPicksSection />

      {/* Modal */}
      {selectedAsset && (
        <ResourceModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
};

export default Resources;
