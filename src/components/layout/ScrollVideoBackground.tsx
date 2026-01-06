import { useRef, useEffect, useState, useCallback } from 'react';
import { HERO_VIDEO_SRC_DESKTOP, HERO_POSTER_SRC } from '@/components/sections/Hero/config';
import { BREAKPOINTS } from '@/lib/breakpoints';

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
  'arca-gidan': { start: 22, end: 24 },   // Gap 18→20 scrubbed, drifts to 22
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

// =============================================================================
// MOBILE CONFIG - Separate video clips
// =============================================================================
interface SectionVideoConfig {
  video: string;
  poster: string;
}

const SECTION_VIDEOS: Record<string, SectionVideoConfig> = {
  hero:         { video: '/section-videos/hero.mp4', poster: '/section-videos/hero-poster.jpg' },
  community:    { video: '/section-videos/community.mp4', poster: '/section-videos/community-poster.jpg' },
  reigh:        { video: '/section-videos/reigh.mp4', poster: '/section-videos/reigh-poster.jpg' },
  'arca-gidan': { video: '/section-videos/arca-gidan.mp4', poster: '/section-videos/arca-gidan-poster.jpg' },
  ados:         { video: '/section-videos/ados.mp4', poster: '/section-videos/ados-poster.jpg' },
  ecosystem:    { video: '/section-videos/ecosystem.mp4', poster: '/section-videos/ecosystem-poster.jpg' },
  ownership:    { video: '/section-videos/ownership.mp4', poster: '/section-videos/ownership-poster.jpg' },
};

const MOBILE_PLAYBACK_RATE = 0.5;
const CROSSFADE_DURATION = 800;

// =============================================================================
// POSTER PRELOADING - Load all posters in order on mount
// =============================================================================
const preloadPostersInOrder = () => {
  let currentIndex = 0;
  
  const loadNext = () => {
    if (currentIndex >= SECTION_ORDER.length) return;
    
    const sectionId = SECTION_ORDER[currentIndex];
    const config = SECTION_VIDEOS[sectionId];
    if (!config) {
      currentIndex++;
      loadNext();
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      currentIndex++;
      loadNext(); // Load next poster after this one completes
    };
    img.onerror = () => {
      currentIndex++;
      loadNext(); // Continue even if one fails
    };
    img.src = config.poster;
  };
  
  loadNext();
};

// =============================================================================
// DESKTOP: Scroll-driven single video with seeking (ORIGINAL IMPLEMENTATION)
// =============================================================================
const DesktopScrollVideo = () => {
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
   * Also returns nextSectionId for gap interpolation during transitions.
   */
  const getScrollSectionInfoFromDOM = useCallback((scrollTop: number) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) {
      return { sectionId: SECTION_ORDER[0] ?? 'hero', progressInSection: 0, nextSectionId: SECTION_ORDER[1] };
    }

    const sections = SECTION_ORDER
      .map((id) => {
        const el = scrollContainer.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!el) return null;
        return { id, top: el.offsetTop, height: el.offsetHeight };
      })
      .filter(Boolean) as Array<{ id: string; top: number; height: number }>;

    if (sections.length === 0) {
      return { sectionId: SECTION_ORDER[0] ?? 'hero', progressInSection: 0, nextSectionId: SECTION_ORDER[1] };
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

    return { sectionId: current.id, progressInSection, nextSectionId: next?.id };
  }, [getScrollContainer]);

  /**
   * Convert scroll progress to video timestamp (in seconds).
   * Maps each section's scroll range to: current.start → next.start
   * This means the GAP between sections is scrubbed DURING the scroll, not after arrival.
   * 
   * Uses ease-out curve to front-load video content (more video shown early in scroll).
   */
  const scrollToVideoTime = useCallback((scrollTop: number) => {
    const { sectionId, progressInSection, nextSectionId } = getScrollSectionInfoFromDOM(scrollTop);
    const currentConfig = SECTION_TIMESTAMPS[sectionId];
    const nextConfig = nextSectionId ? SECTION_TIMESTAMPS[nextSectionId] : null;
    
    if (!currentConfig) {
      // Fallback: linear mapping
      const scrollContainer = getScrollContainer();
      const scrollHeight = scrollContainer
        ? scrollContainer.scrollHeight - scrollContainer.clientHeight
        : 1;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      return Math.max(0, Math.min(1, progress)) * videoDurationRef.current;
    }
    
    // Apply ease-out curve: front-loads video content (more shown early in scroll)
    // Lower exponent = more front-loaded. 0.6 means at 50% scroll you're at ~65% video progress
    const easeOutProgress = 1 - Math.pow(1 - progressInSection, 0.6);
    
    // Map scroll progress to video time:
    // - 0% progress = current section's start
    // - 100% progress = next section's start (or current section's end if last section)
    const videoStart = currentConfig.start;
    const videoEnd = nextConfig ? nextConfig.start : currentConfig.end;
    
    return videoStart + easeOutProgress * (videoEnd - videoStart);
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

  // Silence unused variable warning
  void lastScrollTimeRef;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 animate-pulse scale-[1.3]" />

      {/* Poster - high priority for fast initial render */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        fetchPriority="high"
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

// =============================================================================
// MOBILE: Separate video clips with crossfade
// Only renders current section ± 1 for better memory usage
// Preloads next section for smooth forward transitions
// =============================================================================
const MobileScrollVideo = () => {
  const [currentSection, setCurrentSection] = useState<string>(SECTION_ORDER[0]);
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload all posters in order on mount
  useEffect(() => {
    preloadPostersInOrder();
  }, []);

  const getScrollContainer = useCallback(() => {
    return document.getElementById('home-scroll-container');
  }, []);

  // Determine which sections to render (current ± 1 for lazy mounting)
  const sectionsToRender = (() => {
    const currentIdx = SECTION_ORDER.indexOf(currentSection);
    const prevIdx = previousSection ? SECTION_ORDER.indexOf(previousSection) : -1;
    const indices = new Set<number>();
    
    // Always include current
    if (currentIdx >= 0) indices.add(currentIdx);
    // Include previous (for transitions)
    if (prevIdx >= 0) indices.add(prevIdx);
    // Include next (for preloading)
    if (currentIdx >= 0 && currentIdx < SECTION_ORDER.length - 1) indices.add(currentIdx + 1);
    // Include previous neighbor (for smooth backward scroll)
    if (currentIdx > 0) indices.add(currentIdx - 1);
    
    return Array.from(indices).map(i => SECTION_ORDER[i]).filter(Boolean);
  })();

  const getCurrentSectionFromScroll = useCallback(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return SECTION_ORDER[0];

    const scrollTop = scrollContainer.scrollTop;
    const viewportHeight = scrollContainer.clientHeight;
    const scrollCenter = scrollTop + viewportHeight / 2;

    const sections = scrollContainer.querySelectorAll('section');
    let currentId = SECTION_ORDER[0];

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (scrollCenter >= sectionTop && scrollCenter < sectionBottom) {
        const id = section.id;
        if (SECTION_ORDER.includes(id)) {
          currentId = id;
        }
      }
    });

    return currentId;
  }, [getScrollContainer]);

  const handleSectionChange = useCallback((newSection: string) => {
    if (newSection === currentSection) return;

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    setPreviousSection(currentSection);
    setCurrentSection(newSection);
    setIsTransitioning(true);

    const outgoingVideo = videoRefs.current[currentSection];
    const incomingVideo = videoRefs.current[newSection];

    if (incomingVideo) {
      incomingVideo.currentTime = 0;
      incomingVideo.playbackRate = MOBILE_PLAYBACK_RATE;
      incomingVideo.play().catch(() => {});
    }

    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setPreviousSection(null);
      if (outgoingVideo) outgoingVideo.pause();
    }, CROSSFADE_DURATION);
  }, [currentSection]);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newSection = getCurrentSectionFromScroll();
        handleSectionChange(newSection);
      });
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [getScrollContainer, getCurrentSectionFromScroll, handleSectionChange]);

  useEffect(() => {
    const currentVideo = videoRefs.current[currentSection];
    if (currentVideo) {
      currentVideo.playbackRate = MOBILE_PLAYBACK_RATE;
      currentVideo.play().catch(() => {});
    }
  }, [currentSection]);

  // Get next section for preloading
  const currentIdx = SECTION_ORDER.indexOf(currentSection);
  const nextSection = currentIdx < SECTION_ORDER.length - 1 ? SECTION_ORDER[currentIdx + 1] : null;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Only render sections we need (current ± 1) */}
      {sectionsToRender.map((sectionId) => {
        const config = SECTION_VIDEOS[sectionId];
        if (!config) return null;

        const isCurrent = sectionId === currentSection;
        const isPrevious = sectionId === previousSection && isTransitioning;
        const isNext = sectionId === nextSection;

        // Determine preload strategy:
        // - Current: auto (playing)
        // - Previous during transition: auto (fading out)
        // - Next: auto (preload for smooth forward transition)
        // - Others: metadata only
        const preloadStrategy = isCurrent || isPrevious || isNext ? 'auto' : 'metadata';

        return (
          <div
            key={sectionId}
            className="absolute inset-0 w-full h-full transition-opacity"
            style={{
              opacity: isCurrent ? 1 : isPrevious ? 0 : 0,
              transitionDuration: `${CROSSFADE_DURATION}ms`,
              transitionTimingFunction: 'ease-in-out',
              zIndex: isCurrent ? 2 : isPrevious ? 1 : 0,
            }}
          >
            <video
              ref={(el) => { videoRefs.current[sectionId] = el; }}
              src={config.video}
              poster={config.poster}
              muted
              loop
              playsInline
              preload={preloadStrategy}
              className="absolute inset-0 w-full h-full object-cover scale-[1.3]"
            />
          </div>
        );
      })}

      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity pointer-events-none"
        style={{
          opacity: isTransitioning ? 0.3 : 0,
          transitionDuration: `${CROSSFADE_DURATION / 2}ms`,
        }}
      />
    </div>
  );
};

// =============================================================================
// MAIN EXPORT: Switch between desktop and mobile implementations
// =============================================================================
export const ScrollVideoBackground = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.xl : true
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < BREAKPOINTS.xl);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <MobileScrollVideo /> : <DesktopScrollVideo />;
};
