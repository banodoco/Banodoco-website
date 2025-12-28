import { useEffect, useState, useRef } from 'react';
import { useCommunityTopics } from './useCommunityTopics';
import { TopicCard } from './TopicCard';
import { Section } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';

export const Community = () => {
  const { topics, loading, error } = useCommunityTopics();
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: sectionRef, isActive: sectionIsVisible } = useSectionRuntime({ threshold: 0.5 });
  const topicRefs = useRef<(HTMLElement | null)[]>([]);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileCardRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollDirectionRef = useRef<'up' | 'down'>('down');
  const wasVisibleRef = useRef(false);
  const desktopScrollRafRef = useRef<number | null>(null);
  const mobileScrollRafRef = useRef<number | null>(null);

  // Track scroll direction of the snap parent so we can reset internal scroll position on exit.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Find the snap scroll parent
    const scrollParent = section.closest('.snap-y') as HTMLElement | null;
    if (!scrollParent) return;

    let lastScrollTop = scrollParent.scrollTop;

    const handleParentScroll = () => {
      const currentScrollTop = scrollParent.scrollTop;
      if (currentScrollTop !== lastScrollTop) {
        scrollDirectionRef.current = currentScrollTop > lastScrollTop ? 'down' : 'up';
        lastScrollTop = currentScrollTop;
      }
    };

    scrollParent.addEventListener('scroll', handleParentScroll, { passive: true });

    return () => {
      scrollParent.removeEventListener('scroll', handleParentScroll);
    };
  }, []);

  // Reset internal scroll position on section exit, so it's ready for re-entry.
  // (We use the shared useSectionVisibility hook to avoid visibility flapping.)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!sectionIsVisible && wasVisibleRef.current) {
      if (scrollDirectionRef.current === 'down') {
        // Left by scrolling down - set to bottom for when user scrolls back up
        container.scrollTop = container.scrollHeight - container.clientHeight;
      } else {
        // Left by scrolling up - set to top for when user scrolls back down
        container.scrollTop = 0;
      }
    }

    wasVisibleRef.current = sectionIsVisible;
  }, [sectionIsVisible]);

  // Track scroll to determine active topic (desktop - vertical scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (desktopScrollRafRef.current !== null) return;
      desktopScrollRafRef.current = requestAnimationFrame(() => {
        desktopScrollRafRef.current = null;

        if (!container || topicRefs.current.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let closestIdx = 0;
        let minDiff = Infinity;

        topicRefs.current.forEach((ref, idx) => {
          if (!ref) return;
          const rect = ref.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const diff = Math.abs(center - containerCenter);

          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });

        // Only update state if it actually changed (avoids extra renders).
        setActiveTopicIndex((prev) => (prev === closestIdx ? prev : closestIdx));
      });
    };

    // Initial check
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (desktopScrollRafRef.current !== null) {
        cancelAnimationFrame(desktopScrollRafRef.current);
        desktopScrollRafRef.current = null;
      }
    };
  }, [topics.length]);

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

  return (
    <Section ref={sectionRef} id="community" className="bg-gradient-to-br from-[#0c1420] via-[#101825] to-[#0a1018] text-white">
      <div ref={containerRef} className="h-full overflow-hidden xl:overflow-y-auto px-6 md:px-16 xl:py-12 flex items-center xl:items-start">
        <div className="max-w-7xl mx-auto w-full">
          {/* Mobile/tablet intro - shown above cards */}
          <div className="mb-8 xl:hidden">
            <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
              Our Discord is a gathering place for people from across the ecosystem
            </h2>
            <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-8">
              We've been at the cutting-edge of the technical & artistic scenes over the past two years.
            </p>
            <a 
              href="https://discord.gg/NnFxGvx94b" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Join Discord
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* Mobile/tablet horizontal scroll cards */}
          <div className="xl:hidden -mx-4 md:-mx-8">
            {loading && (
              <div className="flex items-center justify-center py-20 px-4">
                <div className="animate-pulse text-white/40">Loading latest updates...</div>
              </div>
            )}

            {error && (
              <div className="text-center py-20 px-4 text-white/50">
                {error}
              </div>
            )}

            {!loading && !error && topics.length === 0 && (
              <div className="text-center py-20 px-4 text-white/50">
                No updates available yet. Check back later!
              </div>
            )}

            {!loading && !error && topics.length > 0 && (
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

          <div className="hidden xl:grid grid-cols-12 gap-16">
            {/* Left side - Introduction text (desktop only) */}
            <div className="col-span-4 sticky top-24 self-start">
              <h2 className="text-5xl font-normal tracking-tight leading-[1.15] mb-6">
                Our Discord is a gathering place for people from across the ecosystem
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-8">
                We've been at the cutting-edge of the technical & artistic scenes over the past two years.
              </p>
              <a 
                href="https://discord.gg/NnFxGvx94b" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Join Discord
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Right side - Topic cards (desktop only) */}
            <div className="col-span-8">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-pulse text-white/40">Loading latest updates...</div>
                </div>
              )}

              {error && (
                <div className="text-center py-20 text-white/50">
                  {error}
                </div>
              )}

              {!loading && !error && topics.length === 0 && (
                <div className="text-center py-20 text-white/50">
                  No updates available yet. Check back later!
                </div>
              )}

              {!loading && !error && topics.length > 0 && (
                <div className="space-y-6 pt-6">
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
          </div>
        </div>
      </div>
    </Section>
  );
};
