import { useEffect, useState, useRef } from 'react';
import { useCommunityTopics } from './useCommunityTopics';
import { TopicCard } from './TopicCard';

export const Community = () => {
  const { topics, loading, error } = useCommunityTopics();
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const topicRefs = useRef<(HTMLElement | null)[]>([]);

  // Track scroll to determine active topic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
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
      
      setActiveTopicIndex(closestIdx);
    };

    // Initial check
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [topics.length]);

  return (
    <section id="community" className="h-screen snap-start bg-[#0a1018] text-white overflow-hidden">
      <div ref={containerRef} className="h-full overflow-y-auto px-4 md:px-16 py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Mobile intro - shown above cards */}
          <div className="mb-6 md:hidden">
            <h2 className="text-2xl font-normal tracking-tight leading-[1.15] mb-3">
              Our Discord is a gathering place for people from across the ecosystem
            </h2>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              We've been at the cutting-edge of the technical & artistic scenes over the past two years.
            </p>
            <a 
              href="https://discord.gg/banodoco" 
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16">
            {/* Left side - Introduction text (desktop only) */}
            <div className="hidden md:block lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
                Our Discord is a gathering place for people from across the ecosystem
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-8">
                We've been at the cutting-edge of the technical & artistic scenes over the past two years.
              </p>
              <a 
                href="https://discord.gg/banodoco" 
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

            {/* Right side - Topic cards */}
            <div className="lg:col-span-8">
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
                <div className="space-y-3 md:space-y-6 md:pt-6">
                  {topics.map((topic, idx) => (
                    <TopicCard
                      key={idx}
                      ref={(el) => {
                        topicRefs.current[idx] = el;
                      }}
                      topic={topic}
                      isActive={idx === activeTopicIndex}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

