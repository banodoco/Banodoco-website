import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Sparkles, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useResources } from './useResources';
import { useResourceFilters } from './useResourceFilters';
import { ArtPicksSection } from './ArtPicks/ArtPicksSection';
import { FilterBar } from './FilterBar';
import { ResourceGrid } from './ResourceGrid';
import { ResourceModal } from './ResourceModal';
import { CommunityNewsSection } from './CommunityNews/CommunityNewsSection';
import type { Asset } from './types';

const ITEMS_PER_PAGE = 8;

// Placeholder spotlight data — swap for real curated picks later
const SPOTLIGHT_ITEMS = [
  { id: 's1', title: 'The Neon Spires', artistName: 'Vesper_AI', tag: 'Community Spotlight' },
  { id: 's2', title: 'Temporal Fluidity', artistName: 'Kael_Flux', tag: 'Technical Achievement' },
  { id: 's3', title: 'Organic Architecture', artistName: 'Elysia_Renders', tag: 'Artistic Excellence' },
];

const CompactSpotlight = () => {
  const [index, setIndex] = useState(0);
  const items = SPOTLIGHT_ITEMS;

  const next = () => setIndex((prev) => (prev + 1) % items.length);
  const prev = () => setIndex((prev) => (prev - 1 + items.length) % items.length);

  return (
    <div className="relative w-full aspect-[4/5] md:aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={items[index].id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {/* Placeholder visual */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/40 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[120px] font-black text-white/5 italic select-none">
                {items[index].title.charAt(0)}
              </span>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                  {items[index].tag}
                </span>
              </div>
              <h3 className="text-2xl font-black tracking-tighter uppercase italic text-white leading-none">
                {items[index].title}
              </h3>
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                  <User size={12} className="text-zinc-500" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {items[index].artistName}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="absolute top-6 right-6 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={prev} className="p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button onClick={next} className="p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Pagination dots */}
      <div className="absolute top-8 left-8 flex gap-1.5 z-20">
        {items.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-orange-500' : 'w-2 bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

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

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="max-w-[1400px] mx-auto px-6">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-20 lg:py-32 border-b border-zinc-900">
        <div className="lg:col-span-8 space-y-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <span className="h-px w-16 bg-orange-500" />
            <span className="text-orange-500 font-black tracking-[0.4em] uppercase text-[11px]">
              Banodoco Community
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <h1 className="text-[12vw] lg:text-[120px] font-black leading-[0.8] tracking-tighter uppercase">
              Art <span className="text-zinc-800">&</span> <br />
              <span className="italic">Intelligence</span>
            </h1>
            <p className="max-w-xl text-zinc-400 text-xl font-light leading-relaxed">
              Curating the high-frequency archive of machine creativity. From
              battle-tested workflows to the art defining the next era of
              collective vision.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="#assets"
                className="px-8 py-4 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
              >
                Browse Forge
              </a>
              <a
                href="#art-picks"
                className="px-8 py-4 border border-zinc-800 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-900 transition-colors"
              >
                View Gallery
              </a>
            </div>
          </motion.div>
        </div>

        {/* Spotlight Carousel */}
        <div className="lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CompactSpotlight />
          </motion.div>
        </div>
      </section>

      {/* Community News — real Discord data */}
      <section className="pt-16">
        <CommunityNewsSection />
      </section>

      {/* The Forge — Assets */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
        id="assets"
        className="space-y-12 pt-12 border-t border-zinc-900"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-lg">
                <LayoutGrid size={20} className="text-zinc-100" />
              </div>
              <h2 className="text-4xl font-black tracking-tight uppercase">
                The Forge
              </h2>
            </div>
            <p className="text-zinc-500 text-lg max-w-xl font-light">
              LoRAs and workflows shared by the Banodoco community for AI video
              generation.
            </p>
          </div>
        </div>

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
          <div className="flex items-center justify-center gap-8 pt-12">
            <button
              disabled={page === 1}
              onClick={handlePrev}
              className="p-3 rounded-full border border-zinc-800 disabled:opacity-30 hover:border-zinc-500 transition-all text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="text-zinc-100">{page}</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-500">{totalPages}</span>
            </div>
            <button
              disabled={page === totalPages}
              onClick={handleNext}
              className="p-3 rounded-full border border-zinc-800 disabled:opacity-30 hover:border-zinc-500 transition-all text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </motion.section>

      {/* The Gallery — Art Picks */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
        id="art-picks"
        className="space-y-12 pt-32 pb-32"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-lg">
            <Sparkles size={20} className="text-zinc-100" />
          </div>
          <h2 className="text-4xl font-black tracking-tight uppercase">
            The Gallery
          </h2>
        </div>
        <ArtPicksSection />
      </motion.section>

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
