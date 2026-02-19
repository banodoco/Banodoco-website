import { useRef, useEffect } from 'react';

interface NavigatorConnectionInfo {
  saveData?: boolean;
  effectiveType?: string;
}

type NavigatorWithConnection = Navigator & {
  connection?: NavigatorConnectionInfo;
};

/**
 * Preload images into browser cache when condition is met.
 * Unlike video preloading, this doesn't check connection speed since images are much smaller.
 * 
 * @param urls - Array of image URLs to preload
 * @param isActive - Whether to start preloading
 * @param options.priority - If true, loads immediately. If false, waits 500ms (for lower-priority images)
 */
export const useImagePreloadOnVisible = (
  urls: string[], 
  isActive: boolean,
  options: { priority?: boolean } = {}
) => {
  const { priority = true } = options;
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isActive) return;
    if (typeof window === 'undefined') return;

    // Preload sequentially (not as a burst) to avoid creating a long main-thread
    // decode spike that can stall scroll-driven background video.
    let cancelled = false;
    let startTimeout: ReturnType<typeof setTimeout> | null = null;
    let stepTimeout: ReturnType<typeof setTimeout> | null = null;
    let idx = 0;

    const step = () => {
      if (cancelled) return;
      // Find next URL we haven't preloaded
      while (idx < urls.length) {
        const url = urls[idx++];
        if (!url) continue;
        if (preloadedRef.current.has(url)) continue;
        preloadedRef.current.add(url);
        const img = new Image();
        // Hint: allow async decoding where supported
        img.decoding = 'async';
        img.src = url;
        break;
      }

      if (idx >= urls.length) return;

      // Spread the work across frames/time slices.
      stepTimeout = setTimeout(step, priority ? 80 : 120);
    };

    // Both priority and non-priority images get a delay to avoid competing
    // with scroll video animation when entering sections.
    const delay = priority ? 300 : 600; // Priority gets shorter delay
    startTimeout = setTimeout(step, delay);

    return () => {
      cancelled = true;
      if (startTimeout) clearTimeout(startTimeout);
      if (stepTimeout) clearTimeout(stepTimeout);
    };
  }, [isActive, urls, priority]);
};

/**
 * Simpler version that just fetches videos into browser cache.
 * More reliable than link[rel=preload] for videos.
 *
 * Note: This intentionally avoids preloading on users with "Data Saver" enabled
 * or slow connections (3G and below).
 */
export const useVideoPreloadOnVisible = (urls: string[], isActive: boolean) => {
  const preloadedRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const shouldSkip = () => {
    // Respect user intent (Chrome/Android etc.)
    const navigatorWithConnection = navigator as NavigatorWithConnection;
    const saveData = navigatorWithConnection.connection?.saveData === true;
    const effectiveType = navigatorWithConnection.connection?.effectiveType;
    // Only skip on very slow connections - 3G is borderline but still usable
    const isVerySlow =
      effectiveType === 'slow-2g' || effectiveType === '2g';

    return saveData || isVerySlow;
  };

  useEffect(() => {
    if (!isActive) return;
    if (typeof window === 'undefined') return;
    if (typeof navigator === 'undefined') return;
    if (document.visibilityState === 'hidden') return;
    if (shouldSkip()) return;

    // Delay + sequential video preloading to avoid competing with scroll video animation.
    // Creating multiple <video> elements and calling .load() in a burst can cause
    // noticeable main-thread stalls (decoder + resource scheduling).
    let cancelled = false;
    let startTimeout: ReturnType<typeof setTimeout> | null = null;
    let stepTimeout: ReturnType<typeof setTimeout> | null = null;
    let idx = 0;

    const preloadOne = (url: string) => {
      if (preloadedRef.current.has(url)) return;
      if (inflightRef.current.has(url)) return;
      preloadedRef.current.add(url);

      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = url;
      inflightRef.current.set(url, video);

      const cleanup = () => {
        video.removeEventListener('canplaythrough', cleanup);
        video.removeEventListener('loadeddata', cleanup);
        inflightRef.current.delete(url);
        video.removeAttribute('src');
        try {
          video.load();
        } catch {
          // ignore
        }
      };

      video.addEventListener('canplaythrough', cleanup, { once: true });
      video.addEventListener('loadeddata', cleanup, { once: true });
      window.setTimeout(cleanup, 15000);

      try {
        video.load();
      } catch {
        cleanup();
      }
    };

    const step = () => {
      if (cancelled) return;

      while (idx < urls.length) {
        const url = urls[idx++];
        if (!url) continue;
        if (preloadedRef.current.has(url)) continue;
        preloadOne(url);
        break;
      }

      if (idx >= urls.length) return;
      stepTimeout = setTimeout(step, 250);
    };

    startTimeout = setTimeout(step, 800);

    return () => {
      cancelled = true;
      if (startTimeout) clearTimeout(startTimeout);
      if (stepTimeout) clearTimeout(stepTimeout);
    };
  }, [isActive, urls]);
};
