import { useRef, useEffect, useState, useCallback } from 'react';
import { HERO_VIDEO_SRC_DESKTOP, HERO_POSTER_SRC } from '@/components/sections/Hero/config';

// =============================================================================
// SECTION TIMESTAMP CONFIG
// =============================================================================
// Specify the start and end timestamps (in seconds) for each section.
// The video will scrub through these ranges as you scroll through each section.
// Scroll between sections smoothly interpolates between end of one and start of next.

interface SectionTimestamps {
  start: number;  // Video timestamp when entering section (seconds) - drift target at top
  end: number;    // Video timestamp when leaving section (seconds) - drift target at bottom
}

// Timestamps define drift range for each section.
// `start`: Where video is when you enter the section
// `end`: Where video drifts TO when idle (the resting point)
// GAPS between sections (prev.end → next.start) are scrubbed during scroll transitions.
const SECTION_TIMESTAMPS: Record<string, SectionTimestamps> = {
  hero:         { start: 0,  end: 5 },   // Drifts 0→10
  community:    { start: 7, end: 12 },   // Gap 10→12 scrubbed, drifts to 14
  reigh:        { start: 17, end: 20 },   // Gap 14→16 scrubbed, drifts to 18
  'arca-gidan': { start: 20, end: 24 },   // Gap 18→20 scrubbed, drifts to 22
  ados:         { start: 25, end: 29 },   // Gap 22→24 scrubbed, drifts to 26
  ecosystem:    { start: 30, end: 31 },   // Gap 26→28 scrubbed, drifts to 33
  ownership:    { start: 31.5, end: 36.5 },   // Gap 33→35 scrubbed, drifts to 39
};

// Section IDs in order (must match the order they appear on the page)
const SECTION_ORDER = ['hero', 'community', 'reigh', 'arca-gidan', 'ados', 'ecosystem', 'ownership'];

// =============================================================================
// DRIFT CONFIG
// =============================================================================
// How long to wait after scrolling stops before starting idle drift
const IDLE_DELAY_MS = 500;
// How fast the video drifts when idle (seconds per second, e.g., 0.5 = half speed playback)
const DRIFT_SPEED = 0.5;

/**
 * Scroll-driven video background that scrubs through the video as user scrolls.
 * Hero section gets 4x the video time of other sections.
 * When idle on a section, slowly drifts toward the target (80% for hero, 50% for others).
 * The video is fixed in position and appears "behind" section colors via masking.
 */
export const ScrollVideoBackground = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const driftRafRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoDurationRef = useRef<number>(0);
  const videoInitializedRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);
  const currentVideoTimeRef = useRef<number>(0); // The actual video time (smoothed)
  const targetVideoTimeRef = useRef<number>(0); // Target time for smoothing/drift
  const smoothingRafRef = useRef<number | null>(null);
  const currentSectionIdRef = useRef<string>(SECTION_ORDER[0] ?? 'hero');
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Get the scroll container (home-scroll-container)
  const getScrollContainer = useCallback(() => {
    return document.getElementById('home-scroll-container');
  }, []);

  /**
   * Determine which section we're in + progress within it based on actual DOM positions.
   * This avoids footer affecting section progress (which was causing Ownership to start near "end").
   */
  const getScrollSectionInfoFromDOM = useCallback((scrollTop: number) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) {
      return { sectionId: SECTION_ORDER[0] ?? 'hero', progressInSection: 0 };
    }

    const sections = SECTION_ORDER
      .map((id) => {
        const el = scrollContainer.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!el) return null;
        return { id, top: el.offsetTop, height: el.offsetHeight };
      })
      .filter(Boolean) as Array<{ id: string; top: number; height: number }>;

    if (sections.length === 0) {
      return { sectionId: SECTION_ORDER[0] ?? 'hero', progressInSection: 0 };
    }

    // Find the last section whose top is <= scrollTop (with small tolerance)
    const tolerancePx = 2;
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (scrollTop + tolerancePx >= sections[i].top) idx = i;
      else break;
    }

    const current = sections[idx];
    const next = sections[idx + 1];
    const startTop = current.top;
    const endTop = next ? next.top : current.top + current.height;
    const denom = Math.max(endTop - startTop, 1);
    const progressInSection = Math.max(0, Math.min(1, (scrollTop - startTop) / denom));

    return { sectionId: current.id, progressInSection };
  }, [getScrollContainer]);

  /**
   * Convert scroll progress to video timestamp (in seconds).
   * Uses the configured timestamps for each section.
   */
  const scrollToVideoTime = useCallback((scrollTop: number) => {
    const { sectionId, progressInSection } = getScrollSectionInfoFromDOM(scrollTop);
    const sectionConfig = SECTION_TIMESTAMPS[sectionId];
    
    if (!sectionConfig) {
      // Fallback: linear mapping
      const scrollContainer = getScrollContainer();
      const scrollHeight = scrollContainer
        ? scrollContainer.scrollHeight - scrollContainer.clientHeight
        : 1;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      return Math.max(0, Math.min(1, progress)) * videoDurationRef.current;
    }
    
    // Interpolate within this section's timestamp range
    const { start, end } = sectionConfig;
    return start + progressInSection * (end - start);
  }, [getScrollContainer, getScrollSectionInfoFromDOM]);

  // Calculate section-aware target for idle drift (returns timestamp in seconds)
  // Always drifts toward `end` - the resting point of the section
  const calculateDriftTargetTime = useCallback((currentTime: number) => {
    const sectionId = currentSectionIdRef.current;
    const endTime = SECTION_TIMESTAMPS[sectionId]?.end ?? currentTime;
    
    // Drift target is always the section's end time (resting point)
    // If we're already past it, don't drift further
    if (currentTime >= endTime) {
      return currentTime;
    }
    
    return endTime;
  }, []);

  // Idle drift animation - slowly progress toward target when not scrolling
  // Updates targetVideoTimeRef which the smoothing loop animates toward
  const startIdleDrift = useCallback(() => {
    const video = videoRef.current;
    const duration = videoDurationRef.current;
    if (!video || !duration) return;

    // Calculate drift target time based on current section
    const currentTime = targetVideoTimeRef.current;
    const driftTargetTime = calculateDriftTargetTime(currentTime);
    
    let lastFrameTime = performance.now();

    const drift = (now: number) => {
      const delta = (now - lastFrameTime) / 1000; // seconds
      lastFrameTime = now;

      const current = targetVideoTimeRef.current;
      
      // If we're already at or past target, stop drifting
      if (current >= driftTargetTime) {
        driftRafRef.current = null;
        return;
      }

      // Drift toward target at DRIFT_SPEED (seconds per second)
      const newTime = Math.min(driftTargetTime, current + DRIFT_SPEED * delta);
      targetVideoTimeRef.current = newTime;

      driftRafRef.current = requestAnimationFrame(drift);
    };

    driftRafRef.current = requestAnimationFrame(drift);
  }, [calculateDriftTargetTime]);

  // Stop idle drift
  const stopIdleDrift = useCallback(() => {
    if (driftRafRef.current) {
      cancelAnimationFrame(driftRafRef.current);
      driftRafRef.current = null;
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  // Schedule idle drift after scroll stops
  const scheduleIdleDrift = useCallback(() => {
    stopIdleDrift();
    idleTimeoutRef.current = setTimeout(startIdleDrift, IDLE_DELAY_MS);
  }, [stopIdleDrift, startIdleDrift]);

  // Update scroll-based target (called on scroll)
  const updateScrollTarget = useCallback(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    let scrollProgress = Math.max(0, Math.min(1, scrollTop / Math.max(scrollHeight, 1)));
    
    // Cap scroll progress at the end of the last section (don't progress into footer)
    // Each section is 1/numSections of the sections area, but footer adds extra scroll
    const sections = scrollContainer.querySelectorAll('section');
    if (sections.length > 0) {
      const lastSection = sections[sections.length - 1];
      const lastSectionBottom = lastSection.offsetTop + lastSection.offsetHeight;
      const maxScrollForSections = lastSectionBottom - scrollContainer.clientHeight;
      const maxProgress = maxScrollForSections / Math.max(scrollHeight, 1);
      scrollProgress = Math.min(scrollProgress, maxProgress);
    }
    
    // Convert scroll progress to video timestamp using config
    const effectiveScrollTop = scrollProgress * Math.max(scrollHeight, 1);
    const info = getScrollSectionInfoFromDOM(effectiveScrollTop);
    currentSectionIdRef.current = info.sectionId;
    const targetTime = scrollToVideoTime(effectiveScrollTop);
    
    // Store for drift calculations
    targetVideoTimeRef.current = targetTime;
  }, [getScrollContainer, getScrollSectionInfoFromDOM, scrollToVideoTime]);

  // Continuous smoothing loop - runs every frame to smoothly animate video
  const startSmoothingLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastTime = performance.now();

    const smoothLoop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (video.readyState < 2) {
        smoothingRafRef.current = requestAnimationFrame(smoothLoop);
        return;
      }

      const target = targetVideoTimeRef.current;
      const current = currentVideoTimeRef.current;
      const diff = target - current;
      
      // Smooth toward target with time-based lerp (smoother across frame rates)
      // Higher value = faster response
      const lerpSpeed = 8;
      const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);
      
      let newTime: number;
      if (Math.abs(diff) < 0.05) {
        newTime = target;
      } else {
        newTime = current + diff * lerpFactor;
      }
      
      currentVideoTimeRef.current = newTime;
      
      // Update video time
      if (Math.abs(video.currentTime - newTime) > 0.02) {
        try {
          video.currentTime = newTime;
        } catch {
          // ignore
        }
      }

      smoothingRafRef.current = requestAnimationFrame(smoothLoop);
    };

    smoothingRafRef.current = requestAnimationFrame(smoothLoop);
  }, []);

  // Legacy function name for compatibility
  const updateVideoTime = updateScrollTarget;

  const handleScroll = useCallback(() => {
    lastScrollTimeRef.current = performance.now();
    
    // Stop any ongoing drift
    stopIdleDrift();
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    // Schedule update on next animation frame for smooth performance
    rafRef.current = requestAnimationFrame(() => {
      updateVideoTime();
      // Schedule drift to start after scroll stops
      scheduleIdleDrift();
    });
  }, [updateVideoTime, stopIdleDrift, scheduleIdleDrift]);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      stopIdleDrift();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (smoothingRafRef.current) {
        cancelAnimationFrame(smoothingRafRef.current);
      }
    };
  }, [handleScroll, getScrollContainer, stopIdleDrift]);

  // Initialize video when it's ready enough to seek
  const initializeVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || videoInitializedRef.current) return;
    
    // Check if we have duration and enough data
    if (video.duration && !isNaN(video.duration) && video.duration > 0 && video.readyState >= 2) {
      videoInitializedRef.current = true;
      videoDurationRef.current = video.duration;
      // Ensure video is paused - we ONLY control it via scroll/drift
      video.pause();
      video.currentTime = 0;
      setVideoReady(true);
      // Set initial scroll target
      updateScrollTarget();
      // Start the continuous smoothing loop
      startSmoothingLoop();
      // Start idle drift on initial load
      scheduleIdleDrift();
    }
  }, [updateScrollTarget, startSmoothingLoop, scheduleIdleDrift]);

  // Force load the video on mount and ensure it never plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Immediately pause if browser tries to auto-play
    const preventAutoPlay = () => {
      video.pause();
    };
    
    // Force the video to start loading
    video.load();
    
    // Poll for video readiness as a fallback
    const checkReady = () => {
      if (videoInitializedRef.current) return;
      initializeVideo();
    };
    
    // Check periodically until ready
    const interval = setInterval(checkReady, 100);
    
    // Listen for play events and immediately pause - this video should NEVER play
    video.addEventListener('play', preventAutoPlay);
    video.addEventListener('loadeddata', initializeVideo);
    video.addEventListener('canplay', initializeVideo);
    video.addEventListener('canplaythrough', initializeVideo);
    
    return () => {
      clearInterval(interval);
      video.removeEventListener('play', preventAutoPlay);
      video.removeEventListener('loadeddata', initializeVideo);
      video.removeEventListener('canplay', initializeVideo);
      video.removeEventListener('canplaythrough', initializeVideo);
    };
  }, [initializeVideo]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 animate-pulse scale-[1.3]" />

      {/* Poster */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        onLoad={() => setPosterLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video - controlled by scroll, NEVER auto-plays */}
      <video
        ref={videoRef}
        src={HERO_VIDEO_SRC_DESKTOP}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
