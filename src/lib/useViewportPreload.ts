import { useRef, useEffect } from 'react';

/**
 * Simpler version that just fetches videos into browser cache.
 * More reliable than link[rel=preload] for videos.
 *
 * Note: This intentionally avoids preloading on users with "Data Saver" enabled
 * or very slow connections.
 */
export const useVideoPreloadOnVisible = (urls: string[], isActive: boolean) => {
  const preloadedRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const shouldSkip = () => {
    // Respect user intent (Chrome/Android etc.)
    const anyNav = navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } };
    const saveData = anyNav.connection?.saveData === true;
    const effectiveType = anyNav.connection?.effectiveType;
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
  }, [isActive, urls]);
};

