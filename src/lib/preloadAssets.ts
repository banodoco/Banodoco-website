/**
 * Preload images and video posters for upcoming sections.
 * Call this early (e.g., in Home component mount) to warm the cache.
 */

import { useEffect } from 'react';
import { travelExamples } from '@/components/sections/Reigh/data';
import { artworks } from '@/components/sections/ArcaGidan/data';
import { events } from '@/components/sections/ADOS/data';
import { HERO_POSTER_SRC } from '@/components/sections/Hero/config';
import { shouldPreloadVideos } from './device';

let didPreload = false;

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
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Preload video metadata by creating a video element
 */
function preloadVideoMetadata(src: string): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve();
    video.onerror = () => resolve();
    video.src = src;
    video.load();
  });
}

/**
 * Start preloading all section assets.
 */
export function preloadSectionAssets(): void {
  if (typeof window === 'undefined') return;
  const { criticalImages, soonImages, videos } = getSectionPreloadList();

  // Load above-the-fold immediately.
  criticalImages.forEach(preloadImage);

  // Defer the rest to idle to avoid competing with initial scroll/video setup.
  if (soonImages.length > 0) {
    scheduleIdle(() => {
      soonImages.forEach(preloadImage);
    });
  }

  if (videos.length > 0 && shouldPreloadVideos()) {
    scheduleIdle(() => {
      videos.forEach(preloadVideoMetadata);
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
