import { useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { getHeaderHeightPx } from './headerHeight';

interface UseDesktopScrollTrackingOptions {
  topicsCount: number;
  paddings: { top: number; bottom: number };
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}

interface UseDesktopScrollTrackingResult {
  scrollRef: React.RefObject<HTMLDivElement>;
  topicRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  topGradientOpacity: number;
  bottomGradientOpacity: number;
}

export const useDesktopScrollTracking = ({
  topicsCount,
  paddings,
  setActiveIndex,
}: UseDesktopScrollTrackingOptions): UseDesktopScrollTrackingResult => {
  const scrollRef = useRef<HTMLDivElement>(null!);
  const topicRefs = useRef<(HTMLElement | null)[]>([]);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  useEffect(() => {
    const desktopScroll = scrollRef.current;
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

      // Read header height fresh on each scroll to handle viewport changes (iPad, Safari)
      const headerHeightPx = getHeaderHeightPx();

      // Determine which card is closest to the visible center
      // Visible center is at (windowHeight + headerHeight) / 2 from viewport top
      // In scroll container coords: scrollTop + (clientHeight + headerHeightPx) / 2
      const visibleCenter = scrollTop + (clientHeight + headerHeightPx) / 2;

      let closestIdx = 0;
      let minDiff = Infinity;

      topicRefs.current.forEach((ref, idx) => {
        if (!ref) return;

        const cardTop = ref.offsetTop;
        const cardHeight = ref.offsetHeight;
        const cardCenter = cardTop + cardHeight / 2;
        const diff = Math.abs(cardCenter - visibleCenter);

        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      setActiveIndex((prev) => (prev === closestIdx ? prev : closestIdx));
    };

    // Initial check to set gradient correctly on load and after padding changes
    // Use RAF to ensure DOM has updated with new padding
    const rafId = requestAnimationFrame(handleDesktopScroll);

    desktopScroll.addEventListener('scroll', handleDesktopScroll, { passive: true });

    return () => {
      desktopScroll.removeEventListener('scroll', handleDesktopScroll);
      cancelAnimationFrame(rafId);
    };
  }, [paddings.top, paddings.bottom, topicsCount, setActiveIndex]);

  return {
    scrollRef,
    topicRefs,
    topGradientOpacity,
    bottomGradientOpacity,
  };
};
