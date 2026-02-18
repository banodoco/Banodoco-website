import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { LayoutGrid, Palette, ChevronLeft, ChevronRight, ArrowDown, Newspaper, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResources } from './useResources';
import { useResourceFilters } from './useResourceFilters';
import { ArtGallerySection } from './ArtGallery/ArtGallerySection';
import { FilterBar } from './FilterBar';
import { ResourceGrid } from './ResourceGrid';
import { CommunityNewsSection } from './CommunityNews/CommunityNewsSection';
import { AuthActionModal } from './AuthActionModal';

const ITEMS_PER_PAGE = 8;
const FRAME_COUNT = 25;
const FRAME_PATHS = Array.from({ length: FRAME_COUNT }, (_, i) => `/assorted_propaganda/${i + 1}.jpg`);
const INITIAL_FRAME = Math.floor(Math.random() * FRAME_COUNT);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const Resources = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithDiscord } = useAuth();
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

  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters change (synchronous render-time check)
  const filterKey = `${filters.type}|${filters.status}|${filters.mediaType}|${filters.baseModel}|${filters.loraType}|${filters.search}`;
  const filterKeyRef = useRef(filterKey);
  if (filterKeyRef.current !== filterKey) {
    filterKeyRef.current = filterKey;
    if (page !== 1) setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Scroll-driven image sequence for magazine cover
  const heroRef = useRef<HTMLElement>(null);
  const coverImgRef = useRef<HTMLImageElement>(null);
  const lastFrameRef = useRef(INITIAL_FRAME);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, FRAME_COUNT - 1]);
  const coverScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  // Autoplay state
  const [isPlaying] = useState(true);
  const playFrameRef = useRef(0);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [authAction, setAuthAction] = useState<'art' | 'resource' | null>(null);

  // Preload all frames into browser cache
  useEffect(() => {
    FRAME_PATHS.forEach(src => { const img = new Image(); img.src = src; });
  }, []);

  // Swap frame on scroll (direct DOM update, no React re-render) — only when not autoplaying
  useMotionValueEvent(frameIndex, 'change', (latest) => {
    if (isPlaying) return;
    const index = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(latest)));
    if (index === lastFrameRef.current) return;
    lastFrameRef.current = index;
    if (coverImgRef.current) coverImgRef.current.src = FRAME_PATHS[index];
  });

  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
      return;
    }
    playFrameRef.current = lastFrameRef.current;
    playIntervalRef.current = setInterval(() => {
      playFrameRef.current = (playFrameRef.current + 1) % FRAME_COUNT;
      lastFrameRef.current = playFrameRef.current;
      if (coverImgRef.current) coverImgRef.current.src = FRAME_PATHS[playFrameRef.current];
    }, 800);
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying]);

  const handleCreateClick = (type: 'art' | 'resource') => {
    if (user) {
      navigate(type === 'art' ? '/submit/art' : '/submit/resource');
      return;
    }
    setAuthAction(type);
  };

  const handleModalClose = () => setAuthAction(null);

  const handleModalSignIn = async () => {
    await signInWithDiscord();
    setAuthAction(null);
  };

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      {/* Full-screen Hero — Editorial Magazine */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden bg-[#0d131c]">
        {/* Abstract Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="w-full max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Text Content */}
            <div className="lg:col-span-7 space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-4"
              >
                <span className="h-px w-12 bg-orange-500" />
                <span className="text-orange-500 font-black tracking-[0.4em] uppercase text-[10px]">Independent AI Publication</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              >
                <h1 className="text-[12vw] lg:text-[100px] font-black leading-[0.85] tracking-tighter mb-6 uppercase">
                  Art <span className="text-zinc-800">&</span> <br />
                  <span className="italic">Intelligence</span>
                </h1>
                <p className="max-w-md text-zinc-400 text-base lg:text-lg font-light leading-relaxed">
                  The curated archive of AI video generation. Discover battle-tested workflows and the art defining the new era.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-4 sm:gap-8 pt-6"
              >
                <div className="flex flex-col">
                  <span className="text-2xl font-black italic">104</span>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Weeks</span>
                </div>
                <div className="w-px h-10 bg-zinc-800" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black italic">10K+</span>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Tools</span>
                </div>
                <div className="w-px h-10 bg-zinc-800" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black italic">&infin;</span>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Visions</span>
                </div>
              </motion.div>
            </div>

            {/* Magazine Cover Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
              className="hidden lg:block lg:col-span-5 relative w-full"
            >
              <div className="relative aspect-[3/4] w-full max-w-sm ml-auto bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(255,165,0,0.1)]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-10 opacity-35 pointer-events-none" />
                {/* Scroll-driven image sequence */}
                <motion.div style={{ scale: coverScale }} className="absolute inset-0">
                  <img
                    ref={coverImgRef}
                    src={FRAME_PATHS[INITIAL_FRAME]}
                    alt="Cover art"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <ArrowDown size={16} className="text-zinc-500 animate-bounce" />
        </motion.div>

        {/* Constrained bottom border to match section content width below */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="h-px w-full bg-white/5" />
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-6 pt-12 lg:pt-20 space-y-12 lg:space-y-16 pb-6 lg:pb-10">
        {/* Community Art */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          id="community-art"
          className="space-y-10 rounded-2xl border border-white/10 bg-[#101522] p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-lg">
                <Palette size={20} className="text-zinc-100" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight uppercase">
                Community Art
              </h2>
            </div>
            <button
              onClick={() => handleCreateClick('art')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/25 transition-colors"
            >
              <Plus size={16} />
              Add Art
            </button>
          </div>
          <ArtGallerySection />
        </motion.section>

        {/* The Forge — Assets */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          id="assets"
          className="space-y-10 rounded-2xl border border-white/10 bg-[#151120] p-6 sm:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 md:pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-lg">
                <LayoutGrid size={20} className="text-zinc-100" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight uppercase">
                The Forge
              </h2>
            </div>
            <button
              onClick={() => handleCreateClick('resource')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/25 transition-colors"
            >
              <Plus size={16} />
              Add Resources
            </button>
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

        {/* News Section — Briefing Sidebar Layout */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          id="news"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 rounded-2xl border border-white/10 bg-[#101821] p-6 sm:p-8"
        >
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-zinc-900 rounded-lg">
                  <Newspaper size={20} className="text-zinc-100" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight uppercase">Briefing</h2>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                Dispatches from the community frontlines. Latest integrations, research notes, and community milestones.
              </p>
              <div className="h-px w-full bg-zinc-800" />
            </div>
          </div>
          <div className="lg:col-span-8">
            <CommunityNewsSection />
          </div>
        </motion.section>
      </div>

      <AuthActionModal
        isOpen={authAction !== null}
        actionLabel={authAction === 'art' ? 'Add Art' : 'Add Resources'}
        onClose={handleModalClose}
        onSignIn={handleModalSignIn}
        loading={authLoading}
      />

    </div>
  );
};

export default Resources;
