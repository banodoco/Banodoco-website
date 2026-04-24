import { useEffect, useRef, useState } from 'react';
import type * as React from 'react';

interface UseMobileCarouselOptions {
  topicsCount: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}

interface UseMobileCarouselResult {
  scrollRef: React.RefObject<HTMLDivElement>;
  cardRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  leftGradientOpacity: number;
  rightGradientOpacity: number;
  scrollToIndex: (idx: number) => void;
}

export const useMobileCarousel = ({
  topicsCount,
  setActiveIndex,
}: UseMobileCarouselOptions): UseMobileCarouselResult => {
  const scrollRef = useRef<HTMLDivElement>(null!);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const mobileScrollRafRef = useRef<number | null>(null);
  const [leftGradientOpacity, setLeftGradientOpacity] = useState(0);
  const [rightGradientOpacity, setRightGradientOpacity] = useState(1);

  useEffect(() => {
    const mobileScroll = scrollRef.current;
    if (!mobileScroll) return;

    const handleMobileScroll = () => {
      if (mobileScrollRafRef.current !== null) return;

      mobileScrollRafRef.current = requestAnimationFrame(() => {
        mobileScrollRafRef.current = null;

        if (!mobileScroll || cardRefs.current.length === 0) return;

        const scrollLeft = mobileScroll.scrollLeft;
        const containerWidth = mobileScroll.clientWidth;
        const scrollCenter = scrollLeft + containerWidth / 2;

        // Edge gradient fades: indicate more content left/right on horizontal scroll (mobile)
        const fadePx = 48; // similar feel to desktop 80px, but tighter for mobile
        const distanceFromRight = mobileScroll.scrollWidth - mobileScroll.clientWidth - scrollLeft;
        const leftOpacity = Math.min(1, Math.max(0, scrollLeft / fadePx));
        const rightOpacity = Math.min(1, Math.max(0, distanceFromRight / fadePx));
        setLeftGradientOpacity(leftOpacity);
        setRightGradientOpacity(rightOpacity);

        let closestIdx = 0;
        let minDiff = Infinity;

        cardRefs.current.forEach((ref, idx) => {
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

        setActiveIndex((prev) => (prev === closestIdx ? prev : closestIdx));
      });
    };

    handleMobileScroll();

    mobileScroll.addEventListener('scroll', handleMobileScroll, { passive: true });

    return () => {
      mobileScroll.removeEventListener('scroll', handleMobileScroll);

      if (mobileScrollRafRef.current !== null) {
        cancelAnimationFrame(mobileScrollRafRef.current);
        mobileScrollRafRef.current = null;
      }
    };
  }, [topicsCount, setActiveIndex]);

  const scrollToIndex = (idx: number) => {
    const card = cardRefs.current[idx];
    const mobileScroll = scrollRef.current;

    if (!card || !mobileScroll) return;

    mobileScroll.scrollTo({
      left: card.offsetLeft - 24,
      behavior: 'smooth',
    });
  };

  return {
    scrollRef,
    cardRefs,
    leftGradientOpacity,
    rightGradientOpacity,
    scrollToIndex,
  };
};
