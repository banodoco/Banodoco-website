/**
 * Preload images and video posters for upcoming sections.
 * Call this early (e.g., in Home component mount) to warm the cache.
 */

import { useEffect } from 'react';
import { travelExamples } from '@/components/sections/Reigh/data';
import { artworks } from '@/components/sections/ArcaGidan/data';
import { events } from '@/components/sections/Events/data';

let didPreload = false;

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function getSectionPreloadList() {
  const firstReigh = travelExamples[0];
  const firstEvent = events[0];

  const images = uniqueNonEmpty([
    // Hero (first section)
    '/upscaled-poster.jpg',

    // Reigh (first example images)
    ...(firstReigh?.images ?? []),

    // ArcaGidan (all 4 posters are immediately visible)
    ...artworks.map((a) => a.poster),

    // Events (first event poster)
    firstEvent?.poster,
  ]);

  // Video metadata only (avoid pulling entire MP4s)
  const videos = uniqueNonEmpty([
    // Hero
    '/upscaled_new.mp4',

    // Reigh first example (may be missing poster, so warm video)
    firstReigh?.video,

    // Events first event
    firstEvent?.video,
  ]);

  return { images, videos };
}

/**
 * Preload an image by creating an Image object
 */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Don't fail on error, just continue
    img.src = src;
  });
}

/**
 * Preload video metadata by creating a video element
 * This loads enough to start playback quickly without downloading the whole file
 */
function preloadVideoMetadata(src: string): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve();
    video.onerror = () => resolve(); // Don't fail on error
    video.src = src;
    // Some browsers don't start loading until `load()` is called.
    video.load();
  });
}

/**
 * Start preloading all section assets.
 * Images load immediately, videos just load metadata.
 */
export function preloadSectionAssets(): void {
  if (typeof window === 'undefined') return;
  const { images, videos } = getSectionPreloadList();

  images.forEach(preloadImage);
  videos.forEach(preloadVideoMetadata);
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

