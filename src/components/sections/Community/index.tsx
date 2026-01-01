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

  return (
    <Section ref={sectionRef} id="community" className="bg-gradient-to-br from-[#0c1420] via-[#101825] to-[#0a1018] text-white">
      <div ref={containerRef} className="h-full px-6 md:px-16 flex flex-col xl:block" style={{ paddingTop: 'var(--header-height)' }}>
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col xl:block">
          {/* Mobile/tablet layout - vertically centered */}
          <div className="xl:hidden flex-1 flex flex-col justify-center">
            {/* Intro text */}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Horizontal scroll cards */}
            <div className="-mx-4 md:-mx-8 mt-6">
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
          </div>

          {/* Desktop layout - two columns, left centered, right scrollable */}
          <div className="hidden xl:grid grid-cols-12 gap-16 h-full">
            {/* Left side - Introduction text (vertically centered) */}
            <div className="col-span-4 flex items-center">
              <div>
                <h2 className="text-5xl font-normal tracking-tight leading-[1.15] mb-6">
                  Our Discord is a gathering place for people from across the ecosystem
                </h2>
                <p className="text-lg text-white/60 leading-relaxed mb-6">
                  We've been at the cutting-edge of the technical & artistic scenes over the past two years.
                </p>
                <a 
                  href="https://discord.gg/NnFxGvx94b" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sky-400 font-medium hover:text-sky-300 transition-colors"
                >
                  Join Discord
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right side - Topic cards (independently scrollable) */}
            <div className="col-span-8 overflow-y-auto py-8 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
          </div>
        </div>
      </div>
    </Section>
  );
};
