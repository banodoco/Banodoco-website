import { useEffect, useState, useRef } from 'react';
import { useCommunityTopics } from './useCommunityTopics';
import { TopicCard } from './TopicCard';
import { Section } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { Skeleton, SkeletonParagraph, SkeletonBullet } from '@/components/ui/Skeleton';

/** Shared intro content - responsive styling handles mobile vs desktop */
const CommunityIntro = () => (
  <div>
    <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-4 md:mb-6">
      Our Discord is a gathering place for people from across the ecosystem
    </h2>
    <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-4 md:mb-6">
      We've been at the cutting-edge of the technical & artistic scenes over the past two years.
    </p>
    <a 
      href="https://discord.gg/NnFxGvx94b" 
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sky-400 font-medium hover:text-sky-300 transition-colors"
    >
      Join Discord
      <ExternalLinkIcon />
    </a>
  </div>
);

/** Skeleton card for loading state - matches TopicCard structure */
const TopicCardSkeleton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
  <div 
    className={`bg-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border border-white/10 ${
      fullWidth ? "w-[85vw] shrink-0 snap-center" : ""
    }`}
  >
    {/* Channel header */}
    <div className={`border-b border-white/10 flex items-center justify-between ${
      fullWidth ? "px-4 py-3" : "px-3 py-2 md:px-6 md:py-4"
    }`}>
      <Skeleton className={`rounded-full ${fullWidth ? "w-20 h-6" : "w-16 h-5 md:w-20 md:h-6"}`} />
      <Skeleton className={fullWidth ? "w-16 h-4" : "w-12 h-3 md:w-16 md:h-4"} />
    </div>

    {/* Content */}
    <div className={fullWidth ? "p-4" : "p-3 md:p-6"}>
      {/* Mobile layout */}
      <div className={`flex gap-3 ${fullWidth ? "gap-4" : "md:hidden"}`}>
        <div className="flex-1 min-w-0">
          <Skeleton className={`mb-2 ${fullWidth ? "h-5 w-3/4" : "h-4 w-3/4"}`} />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <SkeletonBullet key={i} />
            ))}
          </div>
        </div>
        <Skeleton className={`shrink-0 rounded-lg ${fullWidth ? "w-32 h-24" : "w-24 h-20"}`} />
      </div>

      {/* Desktop layout */}
      <div className={`hidden md:grid gap-6 grid-cols-2 ${fullWidth ? "!hidden" : ""}`}>
        <div>
          <Skeleton className="h-6 w-4/5 mb-3" />
          <SkeletonParagraph lines={3} className="mb-4" />
          <div className="space-y-2 mt-4">
            {[1, 2].map((i) => (
              <SkeletonBullet key={i} className="mt-0.5" />
            ))}
          </div>
        </div>
        <Skeleton className="rounded-lg aspect-video" />
      </div>
    </div>

    {/* Footer - desktop only */}
    <div className="hidden md:block px-6 py-4 border-t border-white/10">
      <Skeleton className="h-4 w-28" />
    </div>
  </div>
);

/** Skeleton loading state for topic cards */
const TopicCardsSkeleton = ({ mobile = false }: { mobile?: boolean }) => {
  if (mobile) {
    return (
      <>
        <div 
          className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-8 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[1, 2, 3].map((i) => (
            <TopicCardSkeleton key={i} fullWidth />
          ))}
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={`h-2 rounded-full ${i === 1 ? "w-4" : "w-2"}`} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <TopicCardSkeleton key={i} />
      ))}
    </div>
  );
};

/** Error/empty states for topic cards */
interface TopicCardsStateProps {
  error: string | null;
  isEmpty: boolean;
}

const TopicCardsState = ({ error, isEmpty }: TopicCardsStateProps) => {
  if (error) {
    return (
      <div className="text-center py-20 px-4 xl:px-0 text-white/50">
        {error}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-20 px-4 xl:px-0 text-white/50">
        No updates available yet. Check back later!
      </div>
    );
  }

  return null;
};

/**
 * Community section with Discord updates.
 * 
 * NOTE: This section uses a custom layout instead of SectionContent because:
 * 1. Mobile layout has edge-bleeding horizontal scroll cards with negative margins
 * 2. Desktop has independently scrollable right column (not just centered content)
 * 3. Layout fundamentally changes between xl breakpoint and below
 * 
 * The header offset is applied via inline style on the container div.
 */
export const Community = () => {
  const { topics, loading, error } = useCommunityTopics();
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const { ref: sectionRef, isActive: sectionIsVisible } = useSectionRuntime({ threshold: 0.5 });
  const topicRefs = useRef<(HTMLElement | null)[]>([]);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileCardRefs = useRef<(HTMLElement | null)[]>([]);
  const mobileScrollRafRef = useRef<number | null>(null);

  // Track horizontal scroll to determine active topic (mobile)
  useEffect(() => {
    const mobileScroll = mobileScrollRef.current;
    if (!mobileScroll) return;

    const handleMobileScroll = () => {
      if (mobileScrollRafRef.current !== null) return;
      mobileScrollRafRef.current = requestAnimationFrame(() => {
        mobileScrollRafRef.current = null;

        if (!mobileScroll || mobileCardRefs.current.length === 0) return;

        const scrollLeft = mobileScroll.scrollLeft;
        const containerWidth = mobileScroll.clientWidth;
        const scrollCenter = scrollLeft + containerWidth / 2;

        let closestIdx = 0;
        let minDiff = Infinity;

        mobileCardRefs.current.forEach((ref, idx) => {
          if (!ref) return;
          const cardLeft = ref.offsetLeft;
          const cardWidth = ref.offsetWidth;
          const cardCenter = cardLeft + cardWidth / 2;
          const diff = Math.abs(cardCenter - scrollCenter);

          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });

        setActiveTopicIndex((prev) => (prev === closestIdx ? prev : closestIdx));
      });
    };

    // Initial check
    handleMobileScroll();

    mobileScroll.addEventListener('scroll', handleMobileScroll, { passive: true });
    return () => {
      mobileScroll.removeEventListener('scroll', handleMobileScroll);
      if (mobileScrollRafRef.current !== null) {
        cancelAnimationFrame(mobileScrollRafRef.current);
        mobileScrollRafRef.current = null;
      }
    };
  }, [topics.length]);

  // Track vertical scroll on desktop to progressively fade gradients
  useEffect(() => {
    const desktopScroll = desktopScrollRef.current;
    if (!desktopScroll) return;

    const handleDesktopScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = desktopScroll;
      
      // Top gradient: fade in over 80px of scroll from top
      const topOpacity = Math.min(1, scrollTop / 80);
      setTopGradientOpacity(topOpacity);
      
      // Bottom gradient: fade in over 80px of scroll from bottom
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const bottomOpacity = Math.min(1, distanceFromBottom / 80);
      setBottomGradientOpacity(bottomOpacity);
    };

    // Initial check to set bottom gradient correctly on load
    handleDesktopScroll();

    desktopScroll.addEventListener('scroll', handleDesktopScroll, { passive: true });
    return () => desktopScroll.removeEventListener('scroll', handleDesktopScroll);
  }, []);

  const hasTopics = !loading && !error && topics.length > 0;
  const showErrorOrEmpty = !loading && (error || topics.length === 0);

  return (
    <Section ref={sectionRef} id="community" className="bg-gradient-to-br from-[#0c1420] via-[#101825] to-[#0a1018] text-white">
      {/* Mobile/tablet layout - with header offset */}
      <div ref={containerRef} className="xl:hidden h-full px-6 md:px-16 flex flex-col" style={{ paddingTop: 'var(--header-height)' }}>
        <div className="max-w-7xl mx-auto w-full flex-1 flex items-center">
          <div className="w-full">
            <CommunityIntro />

            {/* Horizontal scroll cards */}
            <div className="-mx-4 md:-mx-8 mt-6">
              {loading && <TopicCardsSkeleton mobile />}
              {showErrorOrEmpty && (
                <TopicCardsState error={error} isEmpty={topics.length === 0} />
              )}

              {hasTopics && (
                <>
                  <div 
                    ref={mobileScrollRef}
                    className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-8 pb-4 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {topics.map((topic, idx) => (
                      <TopicCard
                        key={`${topic.channel_id}-${topic.summary_date}-${topic.topic_title}`}
                        ref={(el) => {
                          mobileCardRefs.current[idx] = el;
                        }}
                        topic={topic}
                        isActive={sectionIsVisible && idx === activeTopicIndex}
                        fullWidth
                      />
                    ))}
                  </div>
                  {/* Dot indicators */}
                  <div className="flex justify-center gap-2 mt-2">
                    {topics.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const card = mobileCardRefs.current[idx];
                          if (card && mobileScrollRef.current) {
                            mobileScrollRef.current.scrollTo({
                              left: card.offsetLeft - 16,
                              behavior: 'smooth'
                            });
                          }
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === activeTopicIndex 
                            ? 'bg-emerald-400 w-4' 
                            : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop layout - two columns, cards scroll under header */}
      <div className="hidden xl:grid grid-cols-12 gap-16 h-full px-16">
        {/* Left side - Introduction text (vertically centered, with header offset) */}
        <div className="col-span-4 flex items-center" style={{ paddingTop: 'var(--header-height)' }}>
          <div className="max-w-md">
            <CommunityIntro />
          </div>
        </div>

        {/* Right side - Topic cards (scroll under header) */}
        <div 
          ref={desktopScrollRef}
          className="col-span-8 overflow-y-auto scrollbar-hide relative" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Subtle gradient fade at top to indicate scrollable content above - fades in as you scroll */}
          <div 
            className="sticky top-0 left-0 right-0 pointer-events-none z-10"
            style={{ 
              height: 'calc(var(--header-height) + 4rem)',
              marginBottom: 'calc(-1 * (var(--header-height) + 4rem))',
              background: 'linear-gradient(to bottom, rgba(16, 24, 37, 1) 0%, rgba(16, 24, 37, 1) calc(100% - 4rem), rgba(16, 24, 37, 0) 100%)',
              opacity: topGradientOpacity,
            }}
          />
          {/* Inner padding so first card starts below header, but can scroll up behind it */}
          <div className="pt-[var(--header-height)] pb-8">
            {loading && <TopicCardsSkeleton />}
            {showErrorOrEmpty && (
              <TopicCardsState error={error} isEmpty={topics.length === 0} />
            )}

            {hasTopics && (
              <div className="space-y-4">
                {topics.map((topic, idx) => (
                  <TopicCard
                    key={idx}
                    ref={(el) => {
                      topicRefs.current[idx] = el;
                    }}
                    topic={topic}
                    isActive={sectionIsVisible && idx === activeTopicIndex}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Subtle gradient fade at bottom to indicate scrollable content below - fades in based on distance from bottom */}
          <div 
            className="sticky bottom-0 left-0 right-0 h-16 pointer-events-none z-10 -mt-16"
            style={{ 
              background: 'linear-gradient(to top, rgba(16, 24, 37, 0.95) 0%, rgba(16, 24, 37, 0) 100%)',
              opacity: bottomGradientOpacity,
            }}
          />
        </div>
      </div>
    </Section>
  );
};
