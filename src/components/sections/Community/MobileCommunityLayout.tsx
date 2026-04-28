import type * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { headerOffsetPadding } from '@/components/layout/Section';
import { TopicCard } from './TopicCard';
import { TopicCardsSkeleton, TopicCardsState } from './Skeletons';
import type { TopicData } from './types';
import { useMobileCarousel } from './useMobileCarousel';
import { CommunityIntro } from './CommunityIntro';

const SLIDE_SHIFT = 32; // px
const SLIDE_EASE = [0.25, 0.46, 0.45, 0.94] as const;

const sideVariants = (fromLeft: boolean, reduced: boolean) => ({
  hidden: { opacity: 0, x: reduced ? 0 : fromLeft ? -SLIDE_SHIFT : SLIDE_SHIFT },
  visible: { opacity: 1, x: 0 },
});

interface MobileCommunityLayoutProps {
  topics: TopicData[];
  loading: boolean;
  error: string | null;
  sectionIsVisible: boolean;
  hasBeenVisible: boolean;
  activeTopicIndex: number;
  setActiveTopicIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const MobileCommunityLayout = ({
  topics,
  loading,
  error,
  sectionIsVisible,
  hasBeenVisible,
  activeTopicIndex,
  setActiveTopicIndex,
}: MobileCommunityLayoutProps) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const textTransition = prefersReducedMotion
    ? { duration: 0.4, ease: 'easeOut' as const }
    : { duration: 0.6, ease: SLIDE_EASE, delay: 0.08 };
  const mediaTransition = prefersReducedMotion
    ? { duration: 0.4, ease: 'easeOut' as const }
    : { duration: 0.6, ease: SLIDE_EASE };
  const {
    scrollRef,
    cardRefs,
    leftGradientOpacity,
    rightGradientOpacity,
    scrollToIndex,
  } = useMobileCarousel({
    topicsCount: topics.length,
    setActiveIndex: setActiveTopicIndex,
  });

  const hasTopics = !loading && !error && topics.length > 0;
  const showErrorOrEmpty = !loading && (error || topics.length === 0);

  return (
    <div className="xl:hidden h-full px-6 md:px-16 flex flex-col" style={headerOffsetPadding()}>
      <div className="max-w-7xl mx-auto w-full flex-1 flex items-center">
        <div className="w-full">
          {/* On landscape tablets, limit intro text to 3/4 width */}
          <motion.div
            className="md:landscape:w-5/6"
            variants={sideVariants(true, prefersReducedMotion)}
            initial="hidden"
            animate={hasBeenVisible ? 'visible' : 'hidden'}
            transition={textTransition}
          >
            <CommunityIntro />
          </motion.div>

          {/* Horizontal scroll cards */}
          {/* Live indicator moved inside TopicCard header on mobile */}
          <motion.div
            className="-mx-6 md:-mx-16 mt-6"
            variants={sideVariants(false, prefersReducedMotion)}
            initial="hidden"
            animate={hasBeenVisible ? 'visible' : 'hidden'}
            transition={mediaTransition}
          >
            {loading && <TopicCardsSkeleton mobile />}
            {showErrorOrEmpty && (
              <TopicCardsState error={error} isEmpty={topics.length === 0} />
            )}

            {hasTopics && (
              <>
                <div className="relative">
                  <div
                    ref={scrollRef}
                    className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory px-6 md:px-16 pb-4 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {topics.map((topic, idx) => (
                      <TopicCard
                        key={`${topic.channel_id}-${topic.summary_date}-${topic.topic_title}`}
                        ref={(el) => {
                          cardRefs.current[idx] = el;
                        }}
                        topic={topic}
                        isActive={sectionIsVisible && idx === activeTopicIndex}
                        fullWidth
                        index={idx}
                      />
                    ))}
                  </div>

                  {/* Subtle gradient fade at left/right to indicate horizontally scrollable content */}
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-10 md:w-16 z-10"
                    style={{
                      background: 'linear-gradient(to right, rgba(16, 24, 37, 0.95) 0%, rgba(16, 24, 37, 0) 100%)',
                      opacity: leftGradientOpacity,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 md:w-16 z-10"
                    style={{
                      background: 'linear-gradient(to left, rgba(16, 24, 37, 0.95) 0%, rgba(16, 24, 37, 0) 100%)',
                      opacity: rightGradientOpacity,
                    }}
                  />
                </div>
                {/* Dot indicators */}
                <div className="flex justify-center gap-2 mt-2">
                  {topics.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        scrollToIndex(idx);
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
          </motion.div>
        </div>
      </div>
    </div>
  );
};
