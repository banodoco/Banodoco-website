import { useLayoutEffect, useState } from 'react';
import type * as React from 'react';
import { getHeaderHeightPx } from './headerHeight';

interface UseCenteringPaddingsOptions {
  topicRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  topicsCount: number;
  enabled: boolean;
}

interface CenteringPaddings {
  top: number;
  bottom: number;
}

const INITIAL_PADDINGS: CenteringPaddings = { top: 0, bottom: 0 };

export const useCenteringPaddings = ({
  topicRefs,
  topicsCount,
  enabled,
}: UseCenteringPaddingsOptions): CenteringPaddings => {
  const [paddings, setPaddings] = useState<CenteringPaddings>(INITIAL_PADDINGS);

  useLayoutEffect(() => {
    if (!enabled) {
      setPaddings(INITIAL_PADDINGS);
      return;
    }

    const calculatePaddings = () => {
      // Read header height fresh to handle viewport changes (iPad rotation, Safari)
      const headerHeightPx = getHeaderHeightPx();
      const windowHeight = window.innerHeight;

      // Measure first and last cards
      const firstCard = topicRefs.current[0];
      const lastCard = topicRefs.current[topicsCount - 1];

      if (!firstCard || !lastCard) return;

      const firstHeight = firstCard.offsetHeight;
      const lastHeight = lastCard.offsetHeight;

      // Top padding: Center first card in visible area (accounting for header)
      // Use half header height to avoid pushing card too far down
      const top = Math.max(headerHeightPx, (windowHeight + headerHeightPx * 0.5 - firstHeight) / 2);

      // Bottom padding: Center last card in visible area
      const bottom = Math.max(80, (windowHeight - headerHeightPx * 0.5 - lastHeight) / 2);

      setPaddings({ top, bottom });
    };

    // Initial calc - immediate to prevent layout shift
    calculatePaddings();

    // Recalc on resize
    window.addEventListener('resize', calculatePaddings);

    // Also listen for breakpoint changes via matchMedia - catches the exact moment
    // CSS variable --header-height changes (768px), which resize alone may miss on iPad
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleBreakpointChange = () => {
      // Slight delay to ensure CSS variable has updated
      requestAnimationFrame(calculatePaddings);
    };
    mediaQuery.addEventListener('change', handleBreakpointChange);

    return () => {
      window.removeEventListener('resize', calculatePaddings);
      mediaQuery.removeEventListener('change', handleBreakpointChange);
    };
  }, [enabled, topicRefs, topicsCount]);

  return paddings;
};
