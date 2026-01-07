import { useRef, useEffect, useState, useCallback } from 'react';
import { HERO_POSTER_SRC } from '@/components/sections/Hero/config';
import { BREAKPOINTS } from '@/lib/breakpoints';

// =============================================================================
// THREE-PART VIDEO CONFIG (Desktop)
// =============================================================================
// The full video is split into three parts for seamless scroll-based transitions.
// Adjacent parts share their boundary frame for seamless switching.
const VIDEO_PART1_SRC = '/hero-part1.mp4';  // 0-7 seconds (hero section)
const VIDEO_PART2_SRC = '/hero-part2.mp4';  // 7-31.5 seconds (middle sections)
const VIDEO_PART3_SRC = '/hero-part3.mp4';  // 31.5+ seconds (ownership section)
const VIDEO_TRANSITION_1 = 7.0;             // Part 1 → Part 2 transition
const VIDEO_TRANSITION_2 = 31.5;            // Part 2 → Part 3 transition

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
  reigh:        { start: 16.5, end: 20 },   // Gap 14→16 scrubbed, drifts to 18
  'arca-gidan': { start: 22, end: 24 },   // Gap 18→20 scrubbed, drifts to 22
  ados:         { start: 25, end: 29 },   // Gap 22→24 scrubbed, drifts to 26
  ecosystem:    { start: 30, end: 31 },   // Gap 26→28 scrubbed, drifts to 33
  ownership:    { start: 31.5, end: 36.5 },   // Gap 33→35 scrubbed, drifts to 39
};

// ALTERNATIVE SETTINGS (tighter timing):
// hero:         { start: 0,  end: 5 },
// community:    { start: 7, end: 11 },
// reigh:        { start: 12, end: 14.5 },
// 'arca-gidan': { start: 15, end: 20 },
// ados:         { start: 21, end: 25 },
// ecosystem:    { start: 27, end: 30 },
// ownership:    { start: 31.5, end: 36.5 },

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
  hero:         { video: '/hero-part1.mp4', poster: '/section-videos/hero-poster.jpg' },  // HD version
  community:    { video: '/section-videos/community.mp4', poster: '/section-videos/community-poster.jpg' },
  reigh:        { video: '/section-videos/reigh.mp4', poster: '/section-videos/reigh-poster.jpg' },
  'arca-gidan': { video: '/section-videos/arca-gidan.mp4', poster: '/section-videos/arca-gidan-poster.jpg' },
  ados:         { video: '/section-videos/ados.mp4', poster: '/section-videos/ados-poster.jpg' },
  ecosystem:    { video: '/section-videos/ecosystem.mp4', poster: '/section-videos/ecosystem-poster.jpg' },
  ownership:    { video: '/hero-part3.mp4', poster: '/section-videos/ownership-poster.jpg' },  // HD version
};

const MOBILE_PLAYBACK_RATE = 0.5;
const CROSSFADE_DURATION = 500;
const TRANSITION_SCRUB_SPEED = 8; // How fast to scrub during transition (seconds per second) - very fast

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
  // === REFS (Three videos for seamless transitions) ===
  const video1Ref = useRef<HTMLVideoElement>(null);  // Part 1: 0-7 seconds
  const video2Ref = useRef<HTMLVideoElement>(null);  // Part 2: 7-31.5 seconds
  const video3Ref = useRef<HTMLVideoElement>(null);  // Part 3: 31.5+ seconds
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef(false); // Prevent multiple initializations
  
  // === STATE (as refs for performance - updated every frame) ===
  const scrollTimeRef = useRef(0);      // Video time based purely on scroll position (in "logical" time)
  const idleBonusRef = useRef(0);       // Additional time from idle drift
  const currentTimeRef = useRef(0);     // Smoothed display time (actually shown)
  const isScrollingRef = useRef(false); // Are we actively scrolling?
  const currentSectionRef = useRef(SECTION_ORDER[0]);
  const activeVideoRef = useRef<1 | 2 | 3>(1); // Which video is currently active
  
  // === CACHED SECTION POSITIONS (avoid DOM queries every frame) ===
  // Only refreshed on init and resize - NOT during animation loop
  const sectionCacheRef = useRef<Array<{ id: string; top: number; height: number }>>([]);
  
  // === REACT STATE (for UI) ===
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [video1Ready, setVideo1Ready] = useState(false);
  const [video2Ready, setVideo2Ready] = useState(false);
  const [video3Ready, setVideo3Ready] = useState(false);
  const [activeVideo, setActiveVideo] = useState<1 | 2 | 3>(1); // Which video is visible
  const videoReady = video1Ready && video2Ready && video3Ready;

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
  // Now handles THREE videos with seamless transitions at VIDEO_TRANSITION_1 and VIDEO_TRANSITION_2
  
  const startAnimationLoop = useCallback(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    const video3 = video3Ref.current;
    if (!video1 || !video2 || !video3) return;

    let lastTime = performance.now();
    let lastScrollTop = -1;
    let idleStartTime: number | null = null;

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Skip if videos not ready
      if (video1.readyState < 2 || video2.readyState < 2 || video3.readyState < 2) {
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
        // When scrolling, decay idleBonus so that targetTime never goes below
        // the current display time. This prevents the "overshoot then reverse"
        // problem when transitioning after drift.
        //
        // Key insight: idleBonus = currentDisplayTime - scrollTime
        // As scrollTime catches up to where the video is, idleBonus naturally → 0
        const minBonusToMaintainPosition = Math.max(0, currentTimeRef.current - newScrollTime);
        
        // Only decrease idleBonus, never increase it while scrolling
        if (idleBonusRef.current > minBonusToMaintainPosition) {
          idleBonusRef.current = minBonusToMaintainPosition;
        }
        
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

      // === 6. UPDATE VIDEOS (three-part system) ===
      // Determine which video should be active based on current time
      // Videos share boundary frames at transition points for seamless switching
      let newActiveVideo: 1 | 2 | 3;
      if (newTime >= VIDEO_TRANSITION_2) {
        newActiveVideo = 3;
      } else if (newTime >= VIDEO_TRANSITION_1) {
        newActiveVideo = 2;
      } else {
        newActiveVideo = 1;
      }
      
      // Handle video switching - update both ref and state
      if (newActiveVideo !== activeVideoRef.current) {
        activeVideoRef.current = newActiveVideo;
        setActiveVideo(newActiveVideo);
      }
      
      // Update the appropriate video's currentTime
      if (newActiveVideo === 3) {
        // Part 3: internal time starts at 0, representing 31.5+ seconds
        const video3Time = newTime - VIDEO_TRANSITION_2;
        if (Math.abs(video3.currentTime - video3Time) > 0.02) {
          try {
            video3.currentTime = Math.max(0, video3Time);
          } catch {
            // Ignore seek errors
          }
        }
      } else if (newActiveVideo === 2) {
        // Part 2: internal time starts at 0, representing 7-31.5 seconds
        const video2Time = newTime - VIDEO_TRANSITION_1;
        if (Math.abs(video2.currentTime - video2Time) > 0.02) {
          try {
            video2.currentTime = Math.max(0, video2Time);
          } catch {
            // Ignore seek errors
          }
        }
      } else {
        // Part 1: internal time is the same as logical time (0-7 seconds)
        if (Math.abs(video1.currentTime - newTime) > 0.02) {
          try {
            video1.currentTime = newTime;
          } catch {
            // Ignore seek errors
          }
        }
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  }, []);

  // === LIFECYCLE ===
  
  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    const video3 = video3Ref.current;
    if (!video1 || !video2 || !video3) return;

    const checkAndInitialize = () => {
      // Prevent multiple initializations
      if (initializedRef.current) return;
      
      // All three videos must be ready
      if (video1.readyState < 2 || !video1.duration || video1.duration <= 0) return;
      if (video2.readyState < 2 || !video2.duration || video2.duration <= 0) return;
      if (video3.readyState < 2 || !video3.duration || video3.duration <= 0) return;
      
      initializedRef.current = true;
      video1.pause();
      video2.pause();
      video3.pause();
      
      // Initialize section cache BEFORE calculating scroll position
      refreshSectionCache();
      
      // Calculate initial scroll position BEFORE starting loop
      const container = getScrollContainer();
      if (container) {
        const scrollTop = container.scrollTop;
        const initialTime = scrollToVideoTime(scrollTop);
        scrollTimeRef.current = initialTime;
        currentTimeRef.current = initialTime;
        
        // Set initial video times and active video
        if (initialTime >= VIDEO_TRANSITION_2) {
          activeVideoRef.current = 3;
          setActiveVideo(3);
          video3.currentTime = initialTime - VIDEO_TRANSITION_2;
          video2.currentTime = VIDEO_TRANSITION_2 - VIDEO_TRANSITION_1; // Park at end
          video1.currentTime = VIDEO_TRANSITION_1; // Park at end
        } else if (initialTime >= VIDEO_TRANSITION_1) {
          activeVideoRef.current = 2;
          setActiveVideo(2);
          video2.currentTime = initialTime - VIDEO_TRANSITION_1;
          video1.currentTime = VIDEO_TRANSITION_1; // Park at end
          video3.currentTime = 0; // Park at start
        } else {
          activeVideoRef.current = 1;
          setActiveVideo(1);
          video1.currentTime = initialTime;
          video2.currentTime = 0; // Park at start
          video3.currentTime = 0; // Park at start
        }
      } else {
        video1.currentTime = 0;
        video2.currentTime = 0;
        video3.currentTime = 0;
      }
      
      startAnimationLoop();
    };

    // Prevent autoplay on all videos
    const preventPlay1 = () => video1.pause();
    const preventPlay2 = () => video2.pause();
    const preventPlay3 = () => video3.pause();
    video1.addEventListener('play', preventPlay1);
    video2.addEventListener('play', preventPlay2);
    video3.addEventListener('play', preventPlay3);
    
    // Track readiness of each video
    const onVideo1Ready = () => {
      setVideo1Ready(true);
      checkAndInitialize();
    };
    const onVideo2Ready = () => {
      setVideo2Ready(true);
      checkAndInitialize();
    };
    const onVideo3Ready = () => {
      setVideo3Ready(true);
      checkAndInitialize();
    };
    
    video1.addEventListener('loadeddata', onVideo1Ready);
    video1.addEventListener('canplay', onVideo1Ready);
    video2.addEventListener('loadeddata', onVideo2Ready);
    video2.addEventListener('canplay', onVideo2Ready);
    video3.addEventListener('loadeddata', onVideo3Ready);
    video3.addEventListener('canplay', onVideo3Ready);
    
    // Refresh section cache on resize (layout may change)
    const handleResize = () => refreshSectionCache();
    window.addEventListener('resize', handleResize);
    
    // Fallback polling
    const interval = setInterval(checkAndInitialize, 100);
    
    video1.load();
    video2.load();
    video3.load();

    return () => {
      clearInterval(interval);
      video1.removeEventListener('play', preventPlay1);
      video2.removeEventListener('play', preventPlay2);
      video3.removeEventListener('play', preventPlay3);
      video1.removeEventListener('loadeddata', onVideo1Ready);
      video1.removeEventListener('canplay', onVideo1Ready);
      video2.removeEventListener('loadeddata', onVideo2Ready);
      video2.removeEventListener('canplay', onVideo2Ready);
      video3.removeEventListener('loadeddata', onVideo3Ready);
      video3.removeEventListener('canplay', onVideo3Ready);
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

      {/* Video Part 1 (0-7 seconds) */}
      <video
        ref={video1Ref}
        src={VIDEO_PART1_SRC}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover ${
          videoReady && activeVideo === 1 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: 'transform',
          transform: 'translateZ(0) scale(1.3)',
          backfaceVisibility: 'hidden',
          // No transition on opacity - instant switch for seamless frame matching
        }}
      />

      {/* Video Part 2 (7-31.5 seconds) */}
      <video
        ref={video2Ref}
        src={VIDEO_PART2_SRC}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover ${
          videoReady && activeVideo === 2 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: 'transform',
          transform: 'translateZ(0) scale(1.3)',
          backfaceVisibility: 'hidden',
          // No transition on opacity - instant switch for seamless frame matching
        }}
      />

      {/* Video Part 3 (31.5+ seconds) */}
      <video
        ref={video3Ref}
        src={VIDEO_PART3_SRC}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover ${
          videoReady && activeVideo === 3 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: 'transform',
          transform: 'translateZ(0) scale(1.3)',
          backfaceVisibility: 'hidden',
          // No transition on opacity - instant switch for seamless frame matching
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
  const [isScrubbing, setIsScrubbing] = useState(false); // True during scrub phase, false during fade phase
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubAnimationRef = useRef<number | null>(null);

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
    if (scrubAnimationRef.current) {
      cancelAnimationFrame(scrubAnimationRef.current);
    }

    // Determine scroll direction
    const currentIdx = SECTION_ORDER.indexOf(currentSection);
    const newIdx = SECTION_ORDER.indexOf(newSection);
    const isScrollingForward = newIdx > currentIdx;

    setPreviousSection(currentSection);
    setCurrentSection(newSection);
    setIsTransitioning(true);
    setIsScrubbing(true); // Start in scrubbing phase

    const outgoingVideo = videoRefs.current[currentSection];
    const incomingVideo = videoRefs.current[newSection];

    // Prepare incoming video
    if (incomingVideo) {
      // For backward scroll: start at end, will scrub to beginning then play forward
      // For forward scroll: start at beginning
      const incomingDuration = Number.isFinite(incomingVideo.duration) ? incomingVideo.duration : null;
      try {
        incomingVideo.currentTime = isScrollingForward ? 0 : (incomingDuration ?? 0);
      } catch {}
      incomingVideo.playbackRate = MOBILE_PLAYBACK_RATE;
    }

    // Phase 1: Scrub the outgoing video to completion
    const startOutgoingScrub = () => {
      if (!outgoingVideo) {
        // No outgoing video, go straight to incoming scrub/fade
        startIncomingPhase();
        return;
      }
      
      outgoingVideo.pause();
      let lastTime = performance.now();
      const outgoingDuration = Number.isFinite(outgoingVideo.duration) ? outgoingVideo.duration : null;
      // If metadata isn't loaded yet, don't risk scrubbing past duration (can throw on iOS)
      const targetTime = isScrollingForward ? (outgoingDuration ?? outgoingVideo.currentTime) : 0;
      
      const scrubLoop = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        
        const scrubDelta = delta * TRANSITION_SCRUB_SPEED * (isScrollingForward ? 1 : -1);
        const newTime = outgoingVideo.currentTime + scrubDelta;
        
        const reachedTarget = isScrollingForward 
          ? newTime >= targetTime - 0.1
          : newTime <= 0.1;
        
        if (reachedTarget) {
          try { outgoingVideo.currentTime = targetTime; } catch {}
          startIncomingPhase();
          return;
        }
        
        const clampMax = outgoingDuration ?? Math.max(outgoingVideo.currentTime, 0);
        const clamped = Math.max(0, Math.min(newTime, clampMax));
        try { outgoingVideo.currentTime = clamped; } catch {}
        scrubAnimationRef.current = requestAnimationFrame(scrubLoop);
      };
      
      scrubAnimationRef.current = requestAnimationFrame(scrubLoop);
    };

    // Phase 2: For backward scroll, scrub incoming video from end to beginning, then play
    // For forward scroll, just fade in and play
    const startIncomingPhase = () => {
      setIsScrubbing(false); // Show incoming video now
      
      if (!incomingVideo) {
        finishTransition();
        return;
      }

      if (isScrollingForward) {
        // Forward: just play from beginning
        try { incomingVideo.currentTime = 0; } catch {}
        incomingVideo.play().catch(() => {});
        finishTransition();
      } else {
        // Backward: scrub from end to beginning, then play forward
        let lastTime = performance.now();
        
        const incomingScrubLoop = (now: number) => {
          const delta = (now - lastTime) / 1000;
          lastTime = now;
          
          const scrubDelta = delta * TRANSITION_SCRUB_SPEED * -1; // Always backward
          const newTime = incomingVideo.currentTime + scrubDelta;
          
          if (newTime <= 0.1) {
            // Reached beginning, now play forward
            try { incomingVideo.currentTime = 0; } catch {}
            incomingVideo.play().catch(() => {});
            finishTransition();
            return;
          }
          
          try { incomingVideo.currentTime = Math.max(0, newTime); } catch {}
          scrubAnimationRef.current = requestAnimationFrame(incomingScrubLoop);
        };
        
        scrubAnimationRef.current = requestAnimationFrame(incomingScrubLoop);
      }
    };

    const finishTransition = () => {
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousSection(null);
        if (outgoingVideo) outgoingVideo.pause();
      }, CROSSFADE_DURATION);
    };

    // Start the transition
    startOutgoingScrub();
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
      if (scrubAnimationRef.current) cancelAnimationFrame(scrubAnimationRef.current);
    };
  }, [getScrollContainer, getCurrentSectionFromScroll, handleSectionChange]);

  useEffect(() => {
    const currentVideo = videoRefs.current[currentSection];
    if (currentVideo) {
      currentVideo.playbackRate = MOBILE_PLAYBACK_RATE;
      // IMPORTANT: during transitions we control playback manually (scrub then fade).
      // If we autoplay here while the incoming video is hidden, it can "finish" offscreen
      // (and because we removed loop, it looks like later sections never play).
      if (!isTransitioning && !isScrubbing) {
        currentVideo.play().catch(() => {});
      }
    }
  }, [currentSection, isTransitioning, isScrubbing]);

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

        // During scrubbing phase: only show the outgoing video (previous)
        // After scrubbing: fade in the incoming video (current)
        const showVideo = isCurrent 
          ? (isScrubbing ? false : true)  // Incoming: hidden during scrub, visible after
          : isPrevious 
            ? true  // Outgoing: always visible during transition
            : false;

        return (
          <div
            key={sectionId}
            className="absolute inset-0 w-full h-full transition-opacity"
            style={{
              opacity: showVideo ? 1 : 0,
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

      {/* Removed blur overlay - using true cross-dissolve instead */}
    </div>
  );
};

// =============================================================================
// MAIN EXPORT: Switch between desktop and mobile implementations
// =============================================================================
export const ScrollVideoBackground = () => {
  // Use md breakpoint (768px) so tablets/iPads get the desktop scroll experience
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.md : true
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < BREAKPOINTS.md);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <MobileScrollVideo /> : <DesktopScrollVideo />;
};
