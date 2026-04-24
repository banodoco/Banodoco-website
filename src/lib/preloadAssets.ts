/**
 * Preload images and video posters for upcoming sections.
 * Call this early (e.g., in Home component mount) to warm the cache.
 */

import { useEffect, useRef } from 'react';
import { travelExamples } from '@/components/sections/Reigh/data';
import { artworks } from '@/components/sections/ArcaGidan/data';
import { events } from '@/components/sections/ADOS/data';
import { HERO_POSTER_SRC } from '@/components/sections/Hero/config';

let didPreload = false;

interface NavigatorConnectionInfo {
  saveData?: boolean;
  effectiveType?: string;
}

type NavigatorWithConnection = Navigator & {
  connection?: NavigatorConnectionInfo;
};

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function getSectionPreloadList() {
  const firstReigh = travelExamples[0];
  const firstEvent = events[0];

  // Keep this list intentionally small and staged:
  // - Critical images: load immediately (above-the-fold)
  // - Soon images: load during idle (next sections)
  const criticalImages = uniqueNonEmpty([
    // Hero background poster (used by ScrollVideoBackground)
    HERO_POSTER_SRC,
  ]);

  const soonImages = uniqueNonEmpty([
    // Reigh (first example images)
    ...(firstReigh?.images ?? []),

    // ArcaGidan (all 4 posters are immediately visible when you reach that section)
    ...artworks.map((a) => a.poster),

    // Events (first event poster)
    firstEvent?.poster,
  ]);

  // Video metadata only (avoid pulling entire MP4s)
  const videos = uniqueNonEmpty([
    // Reigh first example (may be missing poster, so warm video)
    firstReigh?.video,

    // Events first event
    firstEvent?.video,
  ]);

  return { criticalImages, soonImages, videos };
}

function scheduleIdle(fn: () => void): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn, { timeout: 2000 });
    return;
  }
  window.setTimeout(fn, 750);
}

/**
 * Preload an image by creating an Image object
 */
export function preloadImage(
  src: string,
  opts: { decoding?: 'async' | 'sync' | 'auto' } = {}
): Promise<void> {
  const { decoding = 'auto' } = opts;

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = decoding;
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Skip video preloading when the user has enabled data saver or is on a very slow connection.
 */
export function shouldSkipVideoPreload(): boolean {
  if (typeof navigator === 'undefined') return false;

  const navigatorWithConnection = navigator as NavigatorWithConnection;
  const saveData = navigatorWithConnection.connection?.saveData === true;
  const effectiveType = navigatorWithConnection.connection?.effectiveType;
  const isVerySlow =
    effectiveType === 'slow-2g' || effectiveType === '2g';

  return saveData || isVerySlow;
}

/**
 * Preload a video by creating a detached <video> element.
 */
export function preloadVideo(
  src: string,
  opts: { preload?: 'metadata' | 'auto'; onReady?: () => void } = {}
): HTMLVideoElement | null {
  if (typeof document === 'undefined') return null;

  const { preload = 'metadata', onReady } = opts;
  const video = document.createElement('video');
  let timeoutId: number | null = null;
  let settled = false;

  const cleanup = () => {
    if (settled) return;
    settled = true;

    video.removeEventListener('loadedmetadata', cleanup);
    video.removeEventListener('canplaythrough', cleanup);
    video.removeEventListener('loadeddata', cleanup);
    video.removeEventListener('error', cleanup);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    onReady?.();
    video.removeAttribute('src');
    try {
      video.load();
    } catch {
      // ignore
    }
  };

  video.preload = preload;
  video.src = src;

  if (preload === 'metadata') {
    video.addEventListener('loadedmetadata', cleanup, { once: true });
  } else {
    video.addEventListener('canplaythrough', cleanup, { once: true });
    video.addEventListener('loadeddata', cleanup, { once: true });
    timeoutId = window.setTimeout(cleanup, 15000);
  }

  video.addEventListener('error', cleanup, { once: true });

  try {
    video.load();
  } catch {
    cleanup();
  }

  return video;
}

/**
 * Start preloading all section assets.
 */
function preloadSectionAssets(): void {
  if (typeof window === 'undefined') return;
  const { criticalImages, soonImages, videos } = getSectionPreloadList();

  // Load above-the-fold immediately.
  criticalImages.forEach((src) => {
    void preloadImage(src);
  });

  // Defer the rest to idle to avoid competing with initial scroll/video setup.
  if (soonImages.length > 0) {
    scheduleIdle(() => {
      soonImages.forEach((src) => {
        void preloadImage(src);
      });
    });
  }

  if (videos.length > 0 && !shouldSkipVideoPreload()) {
    scheduleIdle(() => {
      videos.forEach((src) => {
        preloadVideo(src, { preload: 'metadata' });
      });
    });
  }
}

/**
 * React hook to preload assets on mount (runs once).
 */
export function usePreloadAssets(): void {
  useEffect(() => {
    if (didPreload) return;
    didPreload = true;
    preloadSectionAssets();
  }, []);
}

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
        void preloadImage(url, { decoding: 'async' });
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

  useEffect(() => {
    if (!isActive) return;
    if (typeof window === 'undefined') return;
    if (typeof navigator === 'undefined') return;
    if (document.visibilityState === 'hidden') return;
    if (shouldSkipVideoPreload()) return;

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

      const video = preloadVideo(url, {
        preload: 'auto',
        onReady: () => {
          inflightRef.current.delete(url);
        },
      });

      if (!video) return;
      inflightRef.current.set(url, video);
      if (!video.getAttribute('src')) {
        inflightRef.current.delete(url);
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
