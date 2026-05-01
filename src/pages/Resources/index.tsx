import { useEffect, useState, useMemo, useRef, type CSSProperties, type Ref } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Palette, ChevronLeft, ChevronRight, ArrowDown, Newspaper, Plus, Youtube, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PostListCard } from '@/components/posts/PostListCard';
import { RpLogo } from '@/components/brand/RpLogo';
import { Seo } from '@/components/seo/Seo';
import {
  previousRpLogoTheme,
  RP_THEME_SETTINGS,
  type RpPixelBlastTheme,
  selectedRpLogoTheme,
} from '@/components/brand/rpLogoTheme';
import { useAuth } from '@/contexts/useAuth';
import { usePosts } from '@/hooks/usePosts';
import { useResources } from './useResources';
import { useResourceFilters } from './useResourceFilters';
import { ArtGallerySection } from './ArtGallery/ArtGallerySection';
import { HeroArtistCycler } from './HeroArtistCycler';
import PixelBlast, { type PixelBlastHandle } from './PixelBlast';
import { CommunityMontage } from './CommunityMontage';
import { FilterBar } from './FilterBar';
import { ResourceGrid } from './ResourceGrid';
import { CommunityNewsSection } from './CommunityNews/CommunityNewsSection';
import { AuthActionModal } from './AuthActionModal';
import { YouTubeEmbed } from './YouTubeEmbed';
import { AgentNodesSection } from './AgentNodesSection';
import { EXTERNAL_LINKS } from '@/lib/externalLinks';

const BRIEFING_VIDEOS: Array<{ videoId: string; title: string; caption: string }> = [
  { videoId: '6oBWkKcq59A', title: 'Community Briefing — April', caption: 'Latest integrations & releases' },
  { videoId: '6oBWkKcq59A', title: 'Community Briefing — March', caption: 'Research notes & spotlights' },
  { videoId: '6oBWkKcq59A', title: 'Community Briefing — February', caption: 'Milestones & ships' },
];

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@banodoco';

const ITEMS_PER_PAGE = 8;
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const renderPixelBlast = (
  effect: RpPixelBlastTheme,
  ref: Ref<PixelBlastHandle>,
) => (
  <PixelBlast
    ref={ref}
    variant={effect.variant}
    pixelSize={effect.pixelSize}
    color={effect.color}
    patternScale={effect.patternScale}
    patternDensity={effect.patternDensity}
    pixelSizeJitter={effect.pixelSizeJitter}
    enableRipples={false}
    liquid={false}
    speed={effect.speed}
    edgeFade={effect.edgeFade}
    transparent
  />
);

const getComplementColor = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return '#d8d2c8';

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const complement = [255 - r, 255 - g, 255 - b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');

  return `#${complement}`;
};

const Resources = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithDiscord } = useAuth();
  const { assets, profiles, loading, error } = useResources();
  const { posts, loading: postsLoading, error: postsError } = usePosts({ limit: 6 });
  const {
    filters,
    searchInput,
    filtered,
    setFilter,
    handleSearchChange,
    availableBaseModels,
  } = useResourceFilters(assets);

  const [page, setPage] = useState(1);
  const [artStatus, setArtStatus] = useState<'curated' | 'all'>('curated');

  // Reset to page 1 whenever filters change (synchronous render-time check)
  const filterKey = `${filters.type}|${filters.status}|${filters.mediaType}|${filters.baseModel}|${filters.loraType}|${filters.search}`;
  const filterKeyRef = useRef(filterKey);
  if (filterKeyRef.current !== filterKey) {
    filterKeyRef.current = filterKey;
    if (page !== 1) setPage(1);
  }

  // One resource per person: `filtered` is pre-sorted by status then date,
  // so keeping the first occurrence surfaces each person's top-ranked entry.
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const forgeSectionRef = useRef<HTMLElement>(null);
  const [forgeInView, setForgeInView] = useState(false);
  const [forgeHovered, setForgeHovered] = useState(false);
  const [forgePagerHovered, setForgePagerHovered] = useState(false);
  const showForgePager = forgeInView && (forgeHovered || forgePagerHovered);

  useEffect(() => {
    console.info('[AgentNodes] 2RP Resources page mounted', { path: window.location.pathname });
  }, []);

  useEffect(() => {
    const section = forgeSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setForgeInView(entry.isIntersecting),
      { threshold: 0.12 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // PixelBlast pattern translates spatially as the page scrolls. Imperative API
  // (instead of a prop) to avoid the WebGL context reinitializing on every
  // scroll tick.
  const pixelBlastRef = useRef<PixelBlastHandle | null>(null);
  const previousPixelBlastRef = useRef<PixelBlastHandle | null>(null);
  const currentEffect = selectedRpLogoTheme.effect;
  const crossfadeMs = RP_THEME_SETTINGS.crossfadeMs;
  const crossfadeEasing = RP_THEME_SETTINGS.crossfadeEasing;
  const [backgroundCrossfadeReady, setBackgroundCrossfadeReady] = useState(!previousRpLogoTheme);
  const [showPreviousBackground, setShowPreviousBackground] = useState(Boolean(previousRpLogoTheme));

  useEffect(() => {
    if (!previousRpLogoTheme) return;

    const raf = window.requestAnimationFrame(() => setBackgroundCrossfadeReady(true));
    const timeout = window.setTimeout(
      () => setShowPreviousBackground(false),
      crossfadeMs,
    );

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [crossfadeMs]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const { scrollDrift } = currentEffect;
      // Offset is in UV space; the shader scales by uScale internally.
      pixelBlastRef.current?.setPatternOffset(progress * scrollDrift.x, progress * scrollDrift.y);

      if (previousRpLogoTheme) {
        const previousScrollDrift = previousRpLogoTheme.effect.scrollDrift;
        previousPixelBlastRef.current?.setPatternOffset(
          progress * previousScrollDrift.x,
          progress * previousScrollDrift.y,
        );
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentEffect]);

  const [authAction, setAuthAction] = useState<'art' | 'resource' | 'post' | null>(null);

  const handleCreateClick = (type: 'art' | 'resource' | 'post') => {
    if (user) {
      navigate(
        type === 'art'
          ? '/submit/art'
          : type === 'resource'
            ? '/submit/resource'
            : '/submit/post',
      );
      return;
    }
    setAuthAction(type);
  };

  const handleModalClose = () => setAuthAction(null);

  const handleModalSignIn = async () => {
    await signInWithDiscord();
    setAuthAction(null);
  };

  const transition = `opacity ${crossfadeMs}ms ${crossfadeEasing}`;
  const complementColor = getComplementColor(currentEffect.color);
  const logoColor = `color-mix(in srgb, ${complementColor} 40%, #f4f4f5 60%)`;
  const secondaryColor = `color-mix(in srgb, ${complementColor} 24%, #f4f4f5 76%)`;
  const rpThemeStyle = useMemo(() => ({
    '--rp-theme-color': currentEffect.color,
    '--rp-theme-text': `color-mix(in srgb, ${currentEffect.color} 72%, #d8d2c8 28%)`,
    '--rp-logo-color': logoColor,
    '--rp-logo-shadow-color': `color-mix(in srgb, ${complementColor} 48%, transparent)`,
    '--rp-theme-color-soft': `${currentEffect.color}14`,
    '--rp-theme-color-border': `${currentEffect.color}3d`,
    '--rp-theme-color-glow': `${currentEffect.color}18`,
    '--rp-section-accent': secondaryColor,
    '--rp-hero-secondary': secondaryColor,
    '--rp-section-accent-soft': `color-mix(in srgb, ${complementColor} 13%, transparent)`,
    '--rp-section-accent-border': `color-mix(in srgb, ${complementColor} 28%, transparent)`,
  }) as CSSProperties, [complementColor, currentEffect.color, logoColor, secondaryColor]);

  useEffect(() => {
    const root = document.documentElement;
    const entries = Object.entries(rpThemeStyle) as Array<[string, string]>;

    entries.forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      entries.forEach(([key]) => {
        root.style.removeProperty(key);
      });
    };
  }, [rpThemeStyle]);

  const secondaryPillStyle = {
    backgroundColor: 'var(--rp-section-accent-soft)',
    boxShadow: 'inset 0 0 0 1px var(--rp-section-accent-border)',
    color: 'var(--rp-section-accent)',
  };

  return (
    <div className="rp-theme-scope bg-[#0b0b0f] text-zinc-100 min-h-screen" style={rpThemeStyle}>
      <Seo
        title="Art & Resources for Open Source Nerds"
        description="Empowering and inspiring resources from some of the most talented people in the open source space."
        image="https://banodoco.ai/2rp-social-card.jpg"
        url="https://banodoco.ai/2rp"
      />
      {/* Page-wide ambient background — fixed so it follows scroll */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {showPreviousBackground && previousRpLogoTheme && (
          <div
            className="absolute inset-0"
            style={{
              opacity: backgroundCrossfadeReady ? 0 : 1,
              transition,
            }}
          >
            {renderPixelBlast(previousRpLogoTheme.effect, previousPixelBlastRef)}
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            opacity: backgroundCrossfadeReady ? 1 : 0,
            transition,
          }}
        >
          {renderPixelBlast(currentEffect, pixelBlastRef)}
        </div>
      </div>

      {/* Full-screen Hero — Editorial Magazine */}
      <section className="relative z-10 h-screen flex items-center justify-center overflow-hidden bg-[#0b0b0f]">
        {/* Abstract Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Full right artist cycler, fading diagonally into the bg toward the bottom-left */}
        <div
          className="hidden lg:block absolute inset-y-0 right-0 w-[75%] z-[1]"
          style={{
            maskImage: 'linear-gradient(65deg, transparent 10%, rgba(0,0,0,0.5) 40%, black 75%)',
            WebkitMaskImage: 'linear-gradient(65deg, transparent 10%, rgba(0,0,0,0.5) 40%, black 75%)',
          }}
        >
          <HeroArtistCycler />
        </div>

        <div className="w-full max-w-[1400px] mx-auto px-6 relative z-10 pointer-events-none">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Text Content */}
            <div className="lg:col-span-7 space-y-8 pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-4"
              >
                <span className="h-px w-12" style={{ backgroundColor: 'var(--rp-theme-text)' }} />
                <RpLogo
                  text="2nd Renaissance People"
                  className="text-orange-500 font-black tracking-[0.4em] uppercase text-[10px]"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              >
                <h1 className="text-[10vw] lg:text-[82px] font-black leading-[0.85] tracking-tighter mb-6 uppercase text-[var(--rp-hero-secondary)]">
                  Art <span className="text-zinc-500">&</span> <span className="italic">Resources</span> <br />
                  for Open Source <span className="italic">Nerds</span>
                </h1>
                <p className="max-w-md text-zinc-400 text-base lg:text-lg font-light leading-relaxed">
                  Empowering and inspiring resources from some of the most talented people in the open source space.
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

          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <ArrowDown
            size={16}
            className="animate-bounce"
            style={{ color: 'var(--rp-theme-text)' }}
          />
        </motion.div>

        {/* Constrained bottom border to match section content width below */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="h-px w-full bg-white/5" />
          </div>
        </div>
      </section>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-12 lg:pt-20 space-y-12 lg:space-y-16 pb-6 lg:pb-10">
        {/* Community Art */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          id="community-art"
          className="space-y-10 rounded-2xl border border-white/10 bg-[#101522] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="rp-section-icon p-2 rounded-lg">
                <Palette size={20} />
              </div>
              <h2 className="rp-section-heading text-2xl sm:text-4xl font-black tracking-tight uppercase">
                Community Art
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setArtStatus('curated')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    artStatus === 'curated'
                      ? ''
                      : 'text-white/50 hover:text-white/70'
                  }`}
                  style={artStatus === 'curated' ? secondaryPillStyle : undefined}
                >
                  Curated
                </button>
                <button
                  onClick={() => setArtStatus('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    artStatus === 'all'
                      ? ''
                      : 'text-white/50 hover:text-white/70'
                  }`}
                  style={artStatus === 'all' ? secondaryPillStyle : undefined}
                >
                  All
                </button>
              </div>
              <button
                onClick={() => handleCreateClick('art')}
                className="rp-secondary-action inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-colors"
              >
                <Plus size={16} />
                Add Art
              </button>
            </div>
          </div>
          <ArtGallerySection status={artStatus} />
        </motion.section>

        <AgentNodesSection />

        {/* The Forge — Assets */}
        <motion.section
          ref={forgeSectionRef}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          id="assets"
          className="relative space-y-10 rounded-2xl border border-white/10 bg-[#151120] p-6 sm:p-8"
          onMouseEnter={() => setForgeHovered(true)}
          onMouseLeave={() => setForgeHovered(false)}
        >
          <div className="flex flex-col gap-3 border-b border-zinc-800 pb-5 md:pb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="rp-section-icon p-2 rounded-lg">
                <LayoutGrid size={20} />
              </div>
              <h2 className="rp-section-heading text-2xl sm:text-4xl font-black tracking-tight uppercase">
                Resources
              </h2>
            </div>
            {!error && (loading || assets.length > 0) && (
              <div className="flex-1 lg:px-4">
                <FilterBar
                  filters={filters}
                  searchInput={searchInput}
                  availableBaseModels={availableBaseModels}
                  onFilterChange={setFilter}
                  onSearchChange={handleSearchChange}
                />
              </div>
            )}
            <button
              onClick={() => handleCreateClick('resource')}
              className="rp-secondary-action inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-colors shrink-0 self-start lg:self-auto"
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

          {!error && !loading && assets.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/40 text-lg">No resources yet</p>
            </div>
          )}


          {/* Pagination */}
          {!error && !loading && assets.length > 0 && totalPages > 1 && (
            <div
              className={`fixed inset-x-0 bottom-4 z-50 flex justify-center transition-opacity duration-150 ${
                showForgePager
                  ? 'pointer-events-auto opacity-100'
                  : 'pointer-events-none opacity-0'
              }`}
              onMouseEnter={() => setForgePagerHovered(true)}
              onMouseLeave={() => setForgePagerHovered(false)}
            >
              <div className="flex items-center gap-5 rounded-full border border-white/10 bg-zinc-950/85 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur">
                <button
                  disabled={page === 1}
                  onClick={handlePrev}
                  className="rounded-full border border-white/10 p-2 text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Previous resource page"
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
                  onClick={handleNext}
                  className="rounded-full border border-white/10 p-2 text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Next resource page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {!error && (loading || assets.length > 0) && (
            <div className="mt-6">
              <ResourceGrid
                assets={paginatedAssets}
                profiles={profiles}
                loading={loading}
              />
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
          <div className="lg:col-span-4 lg:relative">
            <div className="lg:absolute lg:inset-0 flex flex-col">
              <div className="shrink-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rp-section-icon p-2 rounded-lg">
                    <Newspaper size={20} />
                  </div>
                  <h2 className="rp-section-heading text-2xl font-bold tracking-tight uppercase">Briefing</h2>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                  Dispatches from the community frontlines. Latest integrations, research notes, and community milestones.
                </p>
                <div className="h-px w-full bg-zinc-800 mb-4" />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-4">
                {BRIEFING_VIDEOS.map((video, i) => (
                  <YouTubeEmbed
                    key={`${video.videoId}-${i}`}
                    videoId={video.videoId}
                    title={video.title}
                    caption={video.caption}
                  />
                ))}
              </div>
              <div className="shrink-0 pt-4">
                <a
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rp-secondary-action flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition"
                >
                  <Youtube size={16} className="text-red-500" />
                  Visit the full YouTube channel
                  <ChevronRight size={14} className="text-zinc-400" />
                </a>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <CommunityNewsSection />
          </div>
        </motion.section>

        {/* Community Posts — compact list, just title + author */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          id="community-posts"
          className="space-y-6 rounded-2xl border border-white/10 bg-[#101522] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rp-section-icon rounded-lg p-2">
                <Newspaper size={18} />
              </div>
              <h2 className="rp-section-heading text-xl font-black uppercase tracking-tight sm:text-2xl">
                Community Posts
              </h2>
            </div>
            <button
              onClick={() => handleCreateClick('post')}
              className="rp-secondary-action inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              <Plus size={16} />
              Add Post
            </button>
          </div>

          {postsError ? (
            <div className="py-8 text-center">
              <p className="text-zinc-400">{postsError}</p>
            </div>
          ) : postsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-zinc-500">No published posts yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {posts.map((post) => (
                <PostListCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Community Gathering — Footer Montage */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          id="community-gathering"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center rounded-2xl border border-white/10 bg-[#10141d] p-6 sm:p-8"
        >
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="rp-section-icon p-2 rounded-lg">
                <Users size={20} />
              </div>
              <span className="rp-section-eyebrow font-black tracking-[0.4em] uppercase text-[10px]">Community</span>
            </div>
            <h2 className="rp-section-heading text-2xl sm:text-4xl font-black tracking-tight uppercase leading-tight">
              The open source world gathers in our community
            </h2>
            <a
              href={EXTERNAL_LINKS.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 self-start text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100 hover:text-white transition-colors"
            >
              Join the community
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>
          <div className="lg:col-span-6">
            <CommunityMontage />
          </div>
        </motion.section>
      </div>

      <AuthActionModal
        isOpen={authAction !== null}
        actionLabel={
          authAction === 'art'
            ? 'Add Art'
            : authAction === 'resource'
              ? 'Add Resources'
              : 'Add Post'
        }
        onClose={handleModalClose}
        onSignIn={handleModalSignIn}
        loading={authLoading}
      />

    </div>
  );
};

export default Resources;
