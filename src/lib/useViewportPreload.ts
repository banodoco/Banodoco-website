import { useRef, useEffect } from 'react';

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

    const doPreload = () => {
      urls.forEach((url) => {
        if (!url || preloadedRef.current.has(url)) return;
        preloadedRef.current.add(url);
        const img = new Image();
        img.src = url;
      });
    };

    // Both priority and non-priority images get a delay to avoid competing
    // with scroll video animation when entering sections
    const delay = priority ? 300 : 600; // Priority gets shorter delay
    const timeout = setTimeout(doPreload, delay);
    return () => clearTimeout(timeout);
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
    const anyNav = navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } };
    const saveData = anyNav.connection?.saveData === true;
    const effectiveType = anyNav.connection?.effectiveType;
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

    // Delay video preloading to avoid competing with scroll video animation
    // This prevents the "stall" when entering sections with video content
    const timeoutId = setTimeout(() => {
      urls.forEach((url) => {
        if (preloadedRef.current.has(url)) return;
        if (inflightRef.current.has(url)) return;
        preloadedRef.current.add(url);

        // Create a video element to trigger browser fetch and keep it alive
        // until we have enough buffered to start playback.
        const video = document.createElement('video');
        video.preload = 'auto';
        video.src = url;
        inflightRef.current.set(url, video);

        const cleanup = () => {
          video.removeEventListener('canplaythrough', cleanup);
          video.removeEventListener('loadeddata', cleanup);
          // Drop references; keep whatever the browser cached.
          inflightRef.current.delete(url);
          // Help GC / reduce memory pressure.
          video.removeAttribute('src');
          try {
            video.load();
          } catch {
            // ignore
          }
        };

        // Either event is good enough; canplaythrough may never fire on some browsers.
        video.addEventListener('canplaythrough', cleanup, { once: true });
        video.addEventListener('loadeddata', cleanup, { once: true });

        // Safety timeout: don't keep elements around forever.
        window.setTimeout(cleanup, 15000);

        try {
          video.load();
        } catch {
          cleanup();
        }
      });
    }, 800); // 800ms delay lets scroll animation settle first

    return () => clearTimeout(timeoutId);
  }, [isActive, urls]);
};

