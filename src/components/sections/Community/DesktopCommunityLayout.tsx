import { useRef } from 'react';
import type * as React from 'react';
import { headerOffsetPadding } from '@/components/layout/Section';
import { TopicCard } from './TopicCard';
import { TopicCardsSkeleton, TopicCardsState } from './Skeletons';
import type { TopicData } from './types';
import { useCenteringPaddings } from './useCenteringPaddings';
import { useDesktopScrollTracking } from './useDesktopScrollTracking';
import { CommunityIntro } from './CommunityIntro';

interface DesktopCommunityLayoutProps {
  topics: TopicData[];
  loading: boolean;
  error: string | null;
  sectionIsVisible: boolean;
  activeTopicIndex: number;
  setActiveTopicIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const DesktopCommunityLayout = ({
  topics,
  loading,
  error,
  sectionIsVisible,
  activeTopicIndex,
  setActiveTopicIndex,
}: DesktopCommunityLayoutProps) => {
  const centeringTopicRefs = useRef<(HTMLElement | null)[]>([]);
  const hasTopics = !loading && !error && topics.length > 0;
  const showErrorOrEmpty = !loading && (error || topics.length === 0);

  const paddings = useCenteringPaddings({
    topicRefs: centeringTopicRefs,
    topicsCount: topics.length,
    enabled: hasTopics,
  });

  const {
    scrollRef,
    topicRefs,
    topGradientOpacity,
    bottomGradientOpacity,
  } = useDesktopScrollTracking({
    topicsCount: topics.length,
    paddings,
    setActiveIndex: setActiveTopicIndex,
  });

  return (
    <div className="hidden xl:grid grid-cols-12 gap-16 h-full px-16">
      {/* Left side - Introduction text (vertically centered, offset slightly for header) */}
      <div className="col-span-4 flex items-center" style={headerOffsetPadding({ multiplier: 0.5 })}>
        <div className="max-w-md">
          <CommunityIntro />
        </div>
      </div>

      {/* Right side - Topic cards (scroll under header) */}
      <div
        ref={scrollRef}
        className="col-span-8 overflow-y-auto scrollbar-hide relative snap-y snap-proximity"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* CSS-string exception site 1/2: the sticky gradient height + negative margin pair cannot use headerOffsetPadding(). */}
        <div
          className="sticky top-0 left-0 right-0 pointer-events-none z-10"
          style={{
            height: 'calc(var(--header-height) + 4rem)',
            marginBottom: 'calc(-1 * (var(--header-height) + 4rem))',
            background: 'linear-gradient(to bottom, rgba(16, 24, 37, 1) 0%, rgba(16, 24, 37, 1) calc(100% - 4rem), rgba(16, 24, 37, 0) 100%)',
            opacity: topGradientOpacity,
          }}
        />

        {/* Loading: use flexbox centering. Loaded: use calculated padding for precise card centering */}
        {loading ? (
          <div className="min-h-full flex items-center" style={headerOffsetPadding()}>
            <div className="w-full">
              <TopicCardsSkeleton />
            </div>
          </div>
        ) : (
          <>
            {/* CSS-string exception site 2/2: the pre-measure fallback must remain paint-stable before layout effect runs. */}
            <div
              style={{
                paddingTop: paddings.top ? `${paddings.top}px` : 'var(--header-height)',
                paddingBottom: paddings.bottom ? `${paddings.bottom}px` : '5rem',
              }}
            >
              {showErrorOrEmpty && (
                <TopicCardsState error={error} isEmpty={topics.length === 0} />
              )}

              {hasTopics && (
                <div className="space-y-4">
                  {topics.map((topic, idx) => (
                    <TopicCard
                      key={idx}
                      ref={(el) => {
                        centeringTopicRefs.current[idx] = el;
                        topicRefs.current[idx] = el;
                      }}
                      topic={topic}
                      isActive={sectionIsVisible && idx === activeTopicIndex}
                      index={idx}
                      snapToCenter={idx !== 0 && idx !== topics.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
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
  );
};
