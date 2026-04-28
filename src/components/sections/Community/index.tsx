import { useState } from 'react';
import { Section } from '@/components/layout/Section';
import { useSectionVisibility } from '@/lib/useSectionVisibility';
import { useCommunityTopics } from './useCommunityTopics';
import { MobileCommunityLayout } from './MobileCommunityLayout';
import { DesktopCommunityLayout } from './DesktopCommunityLayout';

/**
 * Community section with Discord updates.
 *
 * NOTE: This section uses a custom layout instead of SectionContent because:
 * 1. Mobile layout has edge-bleeding horizontal scroll cards with negative margins
 * 2. Desktop uses a two-column xl grid with an independently scrollable right column
 * 3. Layout fundamentally changes between xl breakpoint and below
 *
 * Header offset is applied via `headerOffsetPadding()` from Section.tsx inside the two layout subcomponents.
 */
export const Community = () => {
  const { topics, loading, error } = useCommunityTopics();
  const { ref: sectionRef, isVisible: sectionIsVisible, hasBeenVisible } = useSectionVisibility();
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);

  return (
    <Section
      ref={sectionRef}
      id="community"
      className="text-white"
      videoOverlay="rgba(12, 20, 32, 0.85)"
    >
      <MobileCommunityLayout
        topics={topics}
        loading={loading}
        error={error}
        sectionIsVisible={sectionIsVisible}
        hasBeenVisible={hasBeenVisible}
        activeTopicIndex={activeTopicIndex}
        setActiveTopicIndex={setActiveTopicIndex}
      />
      <DesktopCommunityLayout
        topics={topics}
        loading={loading}
        error={error}
        sectionIsVisible={sectionIsVisible}
        hasBeenVisible={hasBeenVisible}
        activeTopicIndex={activeTopicIndex}
        setActiveTopicIndex={setActiveTopicIndex}
      />
    </Section>
  );
};
