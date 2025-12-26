import { useEffect, useRef, useState } from 'react';

interface UseInViewStartOptions {
  threshold?: number;
  /** If true, only triggers once */
  once?: boolean;
}

/**
 * Hook that detects when a ref enters the viewport and triggers a callback.
 * Useful for starting animations/videos when a section scrolls into view.
 */
export const useInViewStart = <T extends HTMLElement>(
  options: UseInViewStartOptions = {}
) => {
  const { threshold = 0.5, once = true } = options;
  const ref = useRef<T>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If once=true and already started, don't observe
    if (once && hasStarted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasStarted, once, threshold]);

  return { ref, hasStarted };
};


