import { useEffect, useRef, useState } from 'react';

interface UseSectionVisibilityOptions {
  /** Intersection threshold (0-1) for when to consider visible. Default: 0.5 */
  threshold?: number;
}

interface UseSectionVisibilityResult {
  /** Ref to attach to the section element */
  ref: React.RefObject<HTMLElement | null>;
  /** Whether the section is currently visible in the viewport */
  isVisible: boolean;
  /** Whether the section has ever been visible (for lazy loading) */
  hasBeenVisible: boolean;
}

/**
 * Hook to track whether a section is currently visible in the viewport.
 * Use this to pause/resume videos and animations when scrolling away.
 * 
 * @example
 * const { ref, isVisible } = useSectionVisibility();
 * 
 * useEffect(() => {
 *   if (isVisible) {
 *     videoRef.current?.play();
 *   } else {
 *     videoRef.current?.pause();
 *   }
 * }, [isVisible]);
 */
export const useSectionVisibility = (
  options: UseSectionVisibilityOptions = {}
): UseSectionVisibilityResult => {
  const { threshold = 0.5 } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const nowVisible = entry.isIntersecting && entry.intersectionRatio >= threshold;
          setIsVisible(nowVisible);
          if (nowVisible) {
            setHasBeenVisible(true);
          }
        });
      },
      // Include 0 so we always get callbacks on enter/exit, not only when crossing `threshold`.
      { threshold: [0, threshold] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible, hasBeenVisible };
};

