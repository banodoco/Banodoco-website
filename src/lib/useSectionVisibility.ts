import { useEffect, useRef, useState } from 'react';

interface UseSectionVisibilityOptions {
  /** Intersection threshold (0-1) for when to consider visible. Default: 0.5 */
  threshold?: number;
  /**
   * Lower threshold (0-1) for when to consider *not* visible, to prevent flapping around `threshold`.
   * Default: `Math.max(0, threshold - 0.15)`.
   */
  exitThreshold?: number;
  /**
   * Debounce delay (ms) before flipping to not-visible.
   * Helps prevent brief layout shifts (video/image loads) from causing "blinks".
   * Default: 150ms.
   */
  exitDelayMs?: number;
  /**
   * Optional rootMargin passed to IntersectionObserver (e.g. "200px 0px").
   * Useful if you want to start animations slightly before entering the viewport.
   */
  rootMargin?: string;
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
  const { threshold = 0.5, exitDelayMs = 150, rootMargin } = options;
  const exitThreshold = options.exitThreshold ?? Math.max(0, threshold - 0.15);
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const pendingExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Ensure thresholds are valid and stable.
    const enterT = Math.min(1, Math.max(0, threshold));
    const exitT = Math.min(enterT, Math.max(0, exitThreshold));
    const thresholds = Array.from(new Set([0, exitT, enterT])).sort((a, b) => a - b);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio ?? 0;
          const entering = entry.isIntersecting && ratio >= enterT;
          const exiting = !entry.isIntersecting || ratio < exitT;

          if (entering) {
            // If we become visible again, cancel any pending exit.
            if (pendingExitTimeoutRef.current) {
              clearTimeout(pendingExitTimeoutRef.current);
              pendingExitTimeoutRef.current = null;
            }
            setIsVisible(true);
            setHasBeenVisible(true);
            return;
          }

          if (exiting) {
            // Debounce exit to avoid quick "blink" on tiny layout shifts.
            if (pendingExitTimeoutRef.current) return;
            pendingExitTimeoutRef.current = setTimeout(() => {
              setIsVisible(false);
              pendingExitTimeoutRef.current = null;
            }, exitDelayMs);
          }
        });
      },
      // Include 0 so we always get callbacks on enter/exit, not only when crossing `threshold`.
      { threshold: thresholds, rootMargin }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (pendingExitTimeoutRef.current) {
        clearTimeout(pendingExitTimeoutRef.current);
        pendingExitTimeoutRef.current = null;
      }
    };
  }, [threshold, exitThreshold, exitDelayMs, rootMargin]);

  return { ref, isVisible, hasBeenVisible };
};

