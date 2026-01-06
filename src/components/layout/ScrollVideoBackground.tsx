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
  reigh:        { start: 15, end: 20 },   // Gap 14→16 scrubbed, drifts to 18
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
// DESKTOP: Scroll-driven video with idle drift
// =============================================================================
// 
// MENTAL MODEL:
// - scrollTime: Pure function of scroll position (the "truth" based on where you've scrolled)
// - idleBonus: Extra time accumulated while idle (0 when actively scrolling)
// - displayTime: scrollTime + idleBonus (what we actually show)
// - currentVideoTime: Smoothly animated toward displayTime
//
// This means:
// - Scroll is ALWAYS the source of truth
// - Drift is ADDITIVE, not fighting with scroll
// - When scrolling resumes, idleBonus fades back to 0 (smooth return)
//
const DesktopScrollVideo = () => {
  // === REFS ===
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef(false); // Prevent multiple initializations
  
  // === STATE (as refs for performance - updated every frame) ===
  const scrollTimeRef = useRef(0);      // Video time based purely on scroll position
  const idleBonusRef = useRef(0);       // Additional time from idle drift
  const currentTimeRef = useRef(0);     // Smoothed display time (actually shown)
  const isScrollingRef = useRef(false); // Are we actively scrolling?
  const currentSectionRef = useRef(SECTION_ORDER[0]);
  
  // === CACHED SECTION POSITIONS (avoid DOM queries every frame) ===
  // Only refreshed on init and resize - NOT during animation loop
  const sectionCacheRef = useRef<Array<{ id: string; top: number; height: number }>>([]);
  
  // === REACT STATE (for UI) ===
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // === PURE FUNCTIONS ===
  
  /** Get the scroll container element */
  const getScrollContainer = () => document.getElementById('home-scroll-container');

  /** Build/refresh the section position cache */
  const refreshSectionCache = () => {
    const container = getScrollContainer();
    if (!container) return;
    
    sectionCacheRef.current = SECTION_ORDER
      .map(id => {
        const el = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        return el ? { id, top: el.offsetTop, height: el.offsetHeight } : null;
      })
      .filter(Boolean) as Array<{ id: string; top: number; height: number }>;
  };

  /** 
   * Calculate which section we're in and progress within it.
   * Uses cached section positions (only refreshed on init/resize, not during animation).
   * Returns { sectionId, progress (0-1), nextSectionId }
   */
  const getSectionInfo = (scrollTop: number) => {
    const sections = sectionCacheRef.current;
    if (!sections.length) return { sectionId: SECTION_ORDER[0], progress: 0, nextSectionId: SECTION_ORDER[1] };

    // Find current section (last one whose top <= scrollTop)
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (scrollTop + 2 >= sections[i].top) idx = i;
      else break;
    }

    const current = sections[idx];
    const next = sections[idx + 1];
    const sectionHeight = (next?.top ?? current.top + current.height) - current.top;
    const progress = Math.max(0, Math.min(1, (scrollTop - current.top) / Math.max(sectionHeight, 1)));

    return { sectionId: current.id, progress, nextSectionId: next?.id };
  };

  /**
   * Convert scroll position to video time.
   * Maps each section's scroll range to: section.start → nextSection.start
   * Applies ease-out curve for front-loaded feel.
   */
  const scrollToVideoTime = (scrollTop: number): number => {
    const { sectionId, progress, nextSectionId } = getSectionInfo(scrollTop);
    const current = SECTION_TIMESTAMPS[sectionId];
    const next = nextSectionId ? SECTION_TIMESTAMPS[nextSectionId] : null;

    if (!current) return 0;

    // Ease-out: front-load video content (more happens early in scroll)
    const easedProgress = 1 - Math.pow(1 - progress, 0.6);

    // Map to video time range
    const videoStart = current.start;
    const videoEnd = next ? next.start : current.end;

    return videoStart + easedProgress * (videoEnd - videoStart);
  };

  /**
   * Get the maximum idle bonus allowed for the current section.
   * This is the distance from scroll position to section's end timestamp.
   */
  const getMaxIdleBonus = (): number => {
    const sectionId = currentSectionRef.current;
    const config = SECTION_TIMESTAMPS[sectionId];
    if (!config) return 0;

    // Max bonus = section.end - current scroll time
    // (Can't drift past the section's end)
    return Math.max(0, config.end - scrollTimeRef.current);
  };

  // === MAIN ANIMATION LOOP ===
  // Single loop handles everything: reading scroll, applying drift, smoothing, updating video
  
  const startAnimationLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastTime = performance.now();
    let lastScrollTop = -1;
    let idleStartTime: number | null = null;

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Skip if video not ready
      if (video.readyState < 2) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const container = getScrollContainer();
      if (!container) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      // === 1. READ SCROLL POSITION ===
      const scrollTop = container.scrollTop;
      
      // Cap at last section (don't progress into footer) - use cached sections
      let cappedScrollTop = scrollTop;
      const sections = sectionCacheRef.current;
      if (sections.length > 0) {
        const lastSection = sections[sections.length - 1];
        const maxScroll = lastSection.top + lastSection.height - container.clientHeight;
        cappedScrollTop = Math.min(scrollTop, maxScroll);
      }

      // === 2. DETECT SCROLL STATE ===
      const isScrolling = scrollTop !== lastScrollTop;
      isScrollingRef.current = isScrolling;
      lastScrollTop = scrollTop;

      // === 3. UPDATE SCROLL TIME (pure function of scroll position) ===
      const newScrollTime = scrollToVideoTime(cappedScrollTop);
      const { sectionId } = getSectionInfo(cappedScrollTop);
      
      // Track section changes
      if (sectionId !== currentSectionRef.current) {
        currentSectionRef.current = sectionId;
        // Reset idle bonus on section change (start fresh)
        idleBonusRef.current = 0;
      }
      
      scrollTimeRef.current = newScrollTime;

      // === 4. HANDLE IDLE BONUS ===
      if (isScrolling) {
        // Actively scrolling: drop idle bonus immediately.
        // Rationale: if we keep any idleBonus while starting a scroll transition,
        // the targetTime can overshoot forward (because scrollTime is already moving),
        // then snap/reverse when the section changes and idleBonus resets.
        idleBonusRef.current = 0;
        idleStartTime = null;
      } else {
        // Not scrolling: accumulate idle bonus after delay
        if (idleStartTime === null) {
          idleStartTime = now;
        }
        
        const idleTime = now - idleStartTime;
        if (idleTime > IDLE_DELAY_MS) {
          // Drift: increase idle bonus toward max
          const maxBonus = getMaxIdleBonus();
          if (idleBonusRef.current < maxBonus) {
            idleBonusRef.current = Math.min(maxBonus, idleBonusRef.current + DRIFT_SPEED * delta);
          }
        }
      }

      // === 5. CALCULATE TARGET & SMOOTH ===
      const targetTime = scrollTimeRef.current + idleBonusRef.current;
      const currentTime = currentTimeRef.current;
      const diff = targetTime - currentTime;

      // Smooth interpolation (lerp)
      const lerpSpeed = 8;
      const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);
      const newTime = Math.abs(diff) < 0.03 ? targetTime : currentTime + diff * lerpFactor;
      currentTimeRef.current = newTime;

      // === 6. UPDATE VIDEO ===
      if (Math.abs(video.currentTime - newTime) > 0.02) {
        try {
          video.currentTime = newTime;
        } catch {
          // Ignore seek errors
        }
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  }, []);

  // === LIFECYCLE ===
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initialize = () => {
      // Prevent multiple initializations
      if (initializedRef.current) return;
      if (video.readyState < 2 || !video.duration || video.duration <= 0) return;
      
      initializedRef.current = true;
      video.pause();
      
      // Initialize section cache BEFORE calculating scroll position
      refreshSectionCache();
      
      // Calculate initial scroll position BEFORE starting loop
      const container = getScrollContainer();
      if (container) {
        const scrollTop = container.scrollTop;
        const initialTime = scrollToVideoTime(scrollTop);
        scrollTimeRef.current = initialTime;
        currentTimeRef.current = initialTime;
        video.currentTime = initialTime;
      } else {
        video.currentTime = 0;
      }
      
      setVideoReady(true);
      startAnimationLoop();
    };

    // Prevent autoplay
    const preventPlay = () => video.pause();
    video.addEventListener('play', preventPlay);
    
    // Initialize when ready
    video.addEventListener('loadeddata', initialize);
    video.addEventListener('canplay', initialize);
    
    // Refresh section cache on resize (layout may change)
    const handleResize = () => refreshSectionCache();
    window.addEventListener('resize', handleResize);
    
    // Fallback polling
    const interval = setInterval(initialize, 100);
    
    video.load();

    return () => {
      clearInterval(interval);
      video.removeEventListener('play', preventPlay);
      video.removeEventListener('loadeddata', initialize);
      video.removeEventListener('canplay', initialize);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [startAnimationLoop]);

  // === RENDER ===
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Loading skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 animate-pulse scale-[1.3]" />

      {/* Poster (high priority) */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        fetchPriority="high"
        onLoad={() => setPosterLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video */}
      <video
        ref={videoRef}
        src={HERO_VIDEO_SRC_DESKTOP}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: 'transform',
          transform: 'translateZ(0) scale(1.3)',
          backfaceVisibility: 'hidden'
        }}
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
              className="absolute inset-0 w-full h-full object-cover"
              style={{ 
                willChange: 'transform, opacity',
                transform: 'translateZ(0) scale(1.3)',
                backfaceVisibility: 'hidden'
              }}
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
