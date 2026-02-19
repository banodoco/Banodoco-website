
import React, { useMemo, useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import ArticleCard from './ArticleCard';
import type { TopGeneration } from '../types';
import { EXTERNAL_LINKS } from '@/lib/externalLinks';

// Hook to detect if we're on desktop/tablet (lg breakpoint = 1024px, includes iPads)
const useIsDesktop = () => {
  // Initialize with actual value to avoid flash/duplicate renders
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    // Update in case SSR value differs
    setIsDesktop(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
};

interface CommunitySectionProps {
  data: TopGeneration[];
}

const DESKTOP_MIN_WIDTH_PX = 1024;
const SNAP_REENABLE_DELAY_MS = 150;

const CommunitySection: React.FC<CommunitySectionProps> = ({ data }) => {
  const isDesktop = useIsDesktop();

  const sectionRef = useRef<HTMLElement>(null);
  const scrollColumnRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileScrollRafRef = useRef<number | null>(null);
  const topicRefs = useRef<(HTMLDivElement | null)[]>([]);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State so ArticleCards re-render once the scroll container mounts
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  // Active card tracking (-1 means section not in view, no card active)
  const [activeTopicIndex, setActiveTopicIndex] = useState(-1);

  // Desktop gradient fades
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  // Mobile gradient fades
  const [leftGradientOpacity, setLeftGradientOpacity] = useState(0);
  const [rightGradientOpacity, setRightGradientOpacity] = useState(1);

  // Desktop dynamic centering paddings
  const [paddings, setPaddings] = useState({ top: 0, bottom: 0 });

  // Group by month, sort each group by reaction_count desc, sort months chronologically
  const grouped = useMemo(() => {
    const map = new Map<string, TopGeneration[]>();
    for (const gen of data) {
      if (!map.has(gen.month)) map.set(gen.month, []);
      map.get(gen.month)!.push(gen);
    }
    for (const [, gens] of map) {
      gens.sort((a, b) => b.reaction_count - a.reaction_count);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  // Capture scroll column ref into state + reset scroll to top
  useEffect(() => {
    const col = scrollColumnRef.current;
    if (col) {
      setScrollRoot(col);
      col.scrollTop = 0;
    }
  }, [grouped]);

  // Track when section enters/leaves viewport to unload videos when not visible
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          // Section left viewport - deactivate all cards
          setActiveTopicIndex(-1);
        } else {
          // Section entered viewport - activate first card if none active
          setActiveTopicIndex((prev) => (prev === -1 ? 0 : prev));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Track horizontal scroll to determine active card (mobile)
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

        // Edge gradient fades
        const fadePx = 48;
        const distanceFromRight = mobileScroll.scrollWidth - mobileScroll.clientWidth - scrollLeft;
        setLeftGradientOpacity(Math.min(1, Math.max(0, scrollLeft / fadePx)));
        setRightGradientOpacity(Math.min(1, Math.max(0, distanceFromRight / fadePx)));

        let closestIdx = 0;
        let minDiff = Infinity;

        mobileCardRefs.current.forEach((ref, idx) => {
          if (!ref) return;
          const cardCenter = ref.offsetLeft + ref.offsetWidth / 2;
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
  }, [grouped.length]);

  // Track vertical scroll on desktop for gradient fades + active card detection
  const handleDesktopScroll = useCallback(() => {
    const desktopScroll = scrollColumnRef.current;
    if (!desktopScroll) return;

    const { scrollTop, scrollHeight, clientHeight } = desktopScroll;

    // Top gradient: fade in over 80px of scroll from top
    setTopGradientOpacity(Math.min(1, scrollTop / 80));

    // Bottom gradient: fade in over 80px of scroll from bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setBottomGradientOpacity(Math.min(1, distanceFromBottom / 80));

    // Determine which card is closest to visible center
    const visibleCenter = scrollTop + clientHeight / 2;

    let closestIdx = 0;
    let minDiff = Infinity;

    topicRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const cardCenter = ref.offsetTop + ref.offsetHeight / 2;
      const diff = Math.abs(cardCenter - visibleCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setActiveTopicIndex((prev) => (prev === closestIdx ? prev : closestIdx));
  }, []);

  useEffect(() => {
    const desktopScroll = scrollColumnRef.current;
    if (!desktopScroll) return;

    // Initial check after padding changes
    const rafId = requestAnimationFrame(handleDesktopScroll);

    desktopScroll.addEventListener('scroll', handleDesktopScroll, { passive: true });
    return () => {
      desktopScroll.removeEventListener('scroll', handleDesktopScroll);
      cancelAnimationFrame(rafId);
    };
  }, [paddings, handleDesktopScroll]);

  // Calculate dynamic padding to center first/last cards in desktop viewport
  useLayoutEffect(() => {
    if (grouped.length === 0) return;

    const calculatePaddings = () => {
      const windowHeight = window.innerHeight;
      const firstCard = topicRefs.current[0];
      const lastCard = topicRefs.current[grouped.length - 1];

      if (!firstCard || !lastCard) return;

      const firstHeight = firstCard.offsetHeight;
      const lastHeight = lastCard.offsetHeight;

      const top = Math.max(80, (windowHeight - firstHeight) / 2);
      const bottom = Math.max(80, (windowHeight - lastHeight) / 2);

      setPaddings({ top, bottom });
    };

    calculatePaddings();

    window.addEventListener('resize', calculatePaddings);
    return () => window.removeEventListener('resize', calculatePaddings);
  }, [grouped.length]);

  // Wheel capture: redirect scroll to the right column so the page "locks" on this section
  // Only captures when hovering over the right column, not the left heading area
  useEffect(() => {
    const col = scrollColumnRef.current;
    if (!col) return;

    const handler = (e: WheelEvent) => {
      if (window.innerWidth < DESKTOP_MIN_WIDTH_PX) return;

      // Disable snap during active scrolling to prevent jitter
      col.style.scrollSnapType = 'none';
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(() => {
        col.style.scrollSnapType = '';
      }, SNAP_REENABLE_DELAY_MS);

      const prevScrollTop = col.scrollTop;
      col.scrollTop += e.deltaY;

      // Only capture the event if the column actually scrolled;
      // when clamped at top/bottom the page scrolls naturally
      if (col.scrollTop !== prevScrollTop) {
        e.preventDefault();
      }
    };

    col.addEventListener('wheel', handler, { passive: false });
    return () => {
      col.removeEventListener('wheel', handler);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="community"
      className="min-h-[100svh] lg:h-[100svh] lg:min-h-0 overflow-y-auto lg:overflow-hidden relative text-white bg-[rgba(12,20,32,0.95)]"
      style={{ contain: 'layout style paint' }}
    >
      {/* Mobile / Tablet layout — horizontal snap scroll */}
      {!isDesktop && <div className="h-[100svh] px-4 sm:px-6 md:px-12 flex flex-col justify-center py-8 sm:py-12">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-2 sm:mb-3">
            <span className="text-sky-400">🎨</span> Top Generations Over Time
          </h2>
          <p className="text-sm md:text-base text-white/60 leading-relaxed mb-3 sm:mb-4 max-w-2xl">
            The most loved creations from the community — sorted by reactions each month.
          </p>
          <a
            href={EXTERNAL_LINKS.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-400 text-sm font-medium hover:text-sky-300 transition-colors border border-sky-400/20 px-3 py-1.5 rounded-full bg-sky-400/5"
          >
            Visit Discord
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-10 10M17 7H7m10 0v10" />
            </svg>
          </a>
        </div>

        {/* Horizontal scroll container with gradient fades */}
        <div className="-ml-4 -mr-4 sm:-ml-6 sm:-mr-6 md:-ml-12 md:-mr-12 overflow-hidden">
          <div className="relative overflow-hidden">
            <div
              ref={mobileScrollRef}
              className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pl-4 pr-4 sm:pl-6 sm:pr-6 md:pl-12 md:pr-12 pt-2 pb-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {grouped.map(([month, gens], idx) => (
                <ArticleCard
                  key={month}
                  ref={(el) => { mobileCardRefs.current[idx] = el; }}
                  month={month}
                  generations={gens}
                  variant="mobile"
                  isActive={idx === activeTopicIndex}
                  fullWidth
                />
              ))}
            </div>

            {/* Left edge gradient fade */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 md:w-16 z-10"
              style={{
                background: 'linear-gradient(to right, rgba(12, 20, 32, 0.95) 0%, rgba(12, 20, 32, 0) 100%)',
                opacity: leftGradientOpacity,
              }}
            />
            {/* Right edge gradient fade */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-10 md:w-12 z-10"
              style={{
                background: 'linear-gradient(to left, rgba(12, 20, 32, 0.95) 0%, rgba(12, 20, 32, 0) 100%)',
                opacity: rightGradientOpacity,
              }}
            />
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-2">
            {grouped.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const card = mobileCardRefs.current[idx];
                  if (card && mobileScrollRef.current) {
                    mobileScrollRef.current.scrollTo({
                      left: card.offsetLeft - 16, // matches pl-4 (16px)
                      behavior: 'smooth',
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
        </div>
      </div>}

      {/* Desktop layout — fixed viewport height, internal column scrolling */}
      {isDesktop && <div className="grid grid-cols-12 gap-16 h-full px-16 max-w-[1920px] mx-auto">
        {/* Left column — heading (stays fixed in place) */}
        <div className="col-span-4 flex items-center pt-24 pb-24">
          <div>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight mb-6">
              <span className="text-sky-400">🎨</span> Top Generations Over Time
            </h2>
            <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-2xl">
              The most loved creations from the community — sorted by reactions each month.
            </p>
            <a
              href={EXTERNAL_LINKS.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-400 font-medium hover:text-sky-300 transition-colors group"
            >
              Visit Discord
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-10 10M17 7H7m10 0v10" />
              </svg>
            </a>
          </div>
        </div>

        {/* Right column — scrollable card stream with snap + gradient fades */}
        <div
          ref={scrollColumnRef}
          className="col-span-8 overflow-y-auto scrollbar-hide relative snap-y snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Top gradient fade — fades in as you scroll down */}
          <div
            className="sticky top-0 left-0 right-0 h-24 pointer-events-none z-10"
            style={{
              marginBottom: '-6rem',
              background: 'linear-gradient(to bottom, rgba(12, 20, 32, 1) 0%, rgba(12, 20, 32, 0) 100%)',
              opacity: topGradientOpacity,
            }}
          />

          <div
            style={{
              paddingTop: paddings.top ? `${paddings.top}px` : '8rem',
              paddingBottom: paddings.bottom ? `${paddings.bottom}px` : '8rem',
            }}
          >
            <div className="space-y-6">
              {grouped.map(([month, gens], idx) => (
                <ArticleCard
                  key={month}
                  ref={(el) => { topicRefs.current[idx] = el; }}
                  month={month}
                  generations={gens}
                  variant="desktop"
                  scrollRoot={scrollRoot}
                  isActive={idx === activeTopicIndex}
                  snapToCenter
                />
              ))}
            </div>
          </div>

          {/* Bottom gradient fade — fades in based on distance from bottom */}
          <div
            className="sticky bottom-0 left-0 right-0 h-16 pointer-events-none z-10 -mt-16"
            style={{
              background: 'linear-gradient(to top, rgba(12, 20, 32, 0.95) 0%, rgba(12, 20, 32, 0) 100%)',
              opacity: bottomGradientOpacity,
            }}
          />
        </div>
      </div>}
    </section>
  );
};

export default CommunitySection;
