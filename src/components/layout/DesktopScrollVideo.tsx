import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_POSTER_SRC } from '@/components/sections/Hero/config';
import type { HomeSectionId } from './scrollVideoConfig';
import {
  BG_SCALE,
  DESKTOP_TRANSITION_1,
  DESKTOP_TRANSITION_2,
  DESKTOP_VIDEO_PARTS,
  DRIFT_SPEED,
  EASE_OUT_EXPONENT,
  IDLE_BONUS_DECAY_PER_SEC,
  IDLE_DELAY_MS,
  INITIAL_SEEK_TIMEOUT_MS,
  LERP_SNAP_EPSILON_SEC,
  LERP_SPEED_PER_SEC,
  MILLISECONDS_PER_SECOND,
  SCRUB_BY_ID,
  SECTION_BOUNDARY_FUDGE_PX,
  SECTION_IDS,
  VIDEO_READY_POLL_MS,
  VIDEO_SEEK_EPSILON_SEC,
} from './scrollVideoConfig';

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
export const DesktopScrollVideo = () => {
  const video1Ref = useRef<HTMLVideoElement>(null); // Part 1: 0-7 seconds
  const video2Ref = useRef<HTMLVideoElement>(null); // Part 2: 7-31.5 seconds
  const video3Ref = useRef<HTMLVideoElement>(null); // Part 3: 31.5+ seconds
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Track initial seek timeout

  // === STATE (as refs for performance - updated every frame) ===
  const scrollTimeRef = useRef(0); // Video time based purely on scroll position (in "logical" time)
  const idleBonusRef = useRef(0); // Additional time from idle drift
  const currentTimeRef = useRef(0); // Smoothed display time (actually shown)
  const currentSectionRef = useRef<HomeSectionId>(SECTION_IDS[0]);
  const activeVideoRef = useRef<1 | 2 | 3>(1); // Which video is currently active

  // === CACHED SECTION POSITIONS (avoid DOM queries every frame) ===
  // Only refreshed on init and resize - NOT during animation loop
  const sectionCacheRef = useRef<Array<{ id: HomeSectionId; top: number; height: number }>>([]);

  // === REACT STATE (for UI) ===
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [video1Ready, setVideo1Ready] = useState(false);
  const [video2Ready, setVideo2Ready] = useState(false);
  const [video3Ready, setVideo3Ready] = useState(false);
  const [initialSeekComplete, setInitialSeekComplete] = useState(false); // Wait for first seek before showing
  const [activeVideo, setActiveVideo] = useState<1 | 2 | 3>(1); // Which video is visible
  const videoReady = video1Ready && video2Ready && video3Ready && initialSeekComplete;

  // === PURE FUNCTIONS ===
  /** Build/refresh the section position cache */
  const refreshSectionCache = useCallback(() => {
    if (typeof document === 'undefined') return;

    sectionCacheRef.current = SECTION_IDS
      .map(id => {
        const el = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        return el ? { id, top: el.offsetTop, height: el.offsetHeight } : null;
      })
      .filter(Boolean) as Array<{ id: HomeSectionId; top: number; height: number }>;
  }, []);

  /**
   * Calculate which section we're in and progress within it.
   * Uses cached section positions (only refreshed on init/resize, not during animation).
   * Returns { sectionId, progress (0-1), nextSectionId }
   */
  const getSectionInfo = useCallback((scrollTop: number) => {
    const sections = sectionCacheRef.current;
    if (!sections.length) return { sectionId: SECTION_IDS[0], progress: 0, nextSectionId: SECTION_IDS[1] };

    // Find current section (last one whose top <= scrollTop)
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (scrollTop + SECTION_BOUNDARY_FUDGE_PX >= sections[i].top) idx = i;
      else break;
    }

    const current = sections[idx];
    const next = sections[idx + 1];
    const sectionHeight = (next?.top ?? current.top + current.height) - current.top;
    const progress = Math.max(0, Math.min(1, (scrollTop - current.top) / Math.max(sectionHeight, 1)));

    return { sectionId: current.id, progress, nextSectionId: next?.id };
  }, []);

  /**
   * Convert scroll position to video time.
   * Maps each section's scroll range to: section.start → nextSection.start
   * Applies ease-out curve for front-loaded feel.
   */
  const scrollToVideoTime = useCallback((scrollTop: number): number => {
    const { sectionId, progress, nextSectionId } = getSectionInfo(scrollTop);
    const current = SCRUB_BY_ID[sectionId];
    const next = nextSectionId ? SCRUB_BY_ID[nextSectionId] : null;

    if (!current) return 0;

    // Ease-out: front-load video content (more happens early in scroll)
    const easedProgress = 1 - Math.pow(1 - progress, EASE_OUT_EXPONENT);

    // Map to video time range
    const videoStart = current.start;
    const videoEnd = next ? next.start : current.end;

    return videoStart + easedProgress * (videoEnd - videoStart);
  }, [getSectionInfo]);

  /**
   * Get the maximum idle bonus allowed for the current section.
   * This is the distance from scroll position to section's end timestamp.
   */
  const getMaxIdleBonus = (): number => {
    const sectionId = currentSectionRef.current;
    const config = SCRUB_BY_ID[sectionId];
    if (!config) return 0;

    // Max bonus = section.end - current scroll time
    // (Can't drift past the section's end)
    return Math.max(0, config.end - scrollTimeRef.current);
  };

  // === MAIN ANIMATION LOOP ===
  // Single loop handles everything: reading scroll, applying drift, smoothing, updating video
  // Now handles THREE videos with seamless transitions at the derived part boundaries.
  const startAnimationLoop = useCallback(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    const video3 = video3Ref.current;
    if (!video1 || !video2 || !video3) return;

    let lastTime = performance.now();
    // Track scroll using the *capped* scrollTop so direction/state doesn't jitter when the user
    // scrolls into regions we intentionally ignore (e.g. footer) or during snap/overscroll.
    let lastCappedScrollTop = -1;
    let idleStartTime: number | null = null;

    const loop = (now: number) => {
      const delta = (now - lastTime) / MILLISECONDS_PER_SECOND;
      lastTime = now;

      // Skip if videos not ready
      if (video1.readyState < 2 || video2.readyState < 2 || video3.readyState < 2) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      // === 1. READ SCROLL POSITION ===
      // Document/body scroll: window.scrollY is the cross-browser canonical read.
      const scrollTop = window.scrollY;

      // Cap at last section (don't progress into footer) - use cached sections
      let cappedScrollTop = scrollTop;
      const sections = sectionCacheRef.current;
      if (sections.length > 0) {
        const lastSection = sections[sections.length - 1];
        const maxScroll = lastSection.top + lastSection.height - window.innerHeight;
        cappedScrollTop = Math.min(scrollTop, maxScroll);
      }

      // === 2. DETECT SCROLL STATE ===
      const isScrolling = cappedScrollTop !== lastCappedScrollTop;
      const scrollingForward = cappedScrollTop > lastCappedScrollTop; // Check direction BEFORE updating last
      lastCappedScrollTop = cappedScrollTop;

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
        if (scrollingForward && newScrollTime < currentTimeRef.current) {
          // Scrolling forward but scroll-based time is still behind the drifted video position.
          // Quickly decay the bonus so the video syncs with scroll position.
          // The lerp smoothing will make any slight backwards movement gradual.
          // This decays the bonus quickly enough for the video to catch up smoothly.
          idleBonusRef.current = Math.max(0, idleBonusRef.current - delta * IDLE_BONUS_DECAY_PER_SEC);
        } else {
          // Either scrolling backward, or scroll has caught up/passed video position
          // Clear bonus and follow scroll directly
          idleBonusRef.current = 0;
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
      let targetTime = scrollTimeRef.current + idleBonusRef.current;
      const currentTime = currentTimeRef.current;
      const diff = targetTime - currentTime;

      // Important UX: when the user scrolls forward, never show a backwards "rewind" correction.
      // This can happen if the video drifted forward while idle and then scroll resumes.
      // Instead, hold the current frame until scroll catches up.
      if (isScrolling && scrollingForward && targetTime < currentTime) {
        targetTime = currentTime;
      }

      // Smooth interpolation (lerp)
      const lerpFactor = 1 - Math.exp(-LERP_SPEED_PER_SEC * delta);
      const newTime = Math.abs(diff) < LERP_SNAP_EPSILON_SEC ? targetTime : currentTime + diff * lerpFactor;
      currentTimeRef.current = newTime;

      // === 6. UPDATE VIDEOS (three-part system) ===
      // Determine which video should be active based on current time
      // Videos share boundary frames at transition points for seamless switching
      let newActiveVideo: 1 | 2 | 3;
      if (newTime >= DESKTOP_TRANSITION_2) {
        newActiveVideo = 3;
      } else if (newTime >= DESKTOP_TRANSITION_1) {
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
        const video3Time = newTime - DESKTOP_TRANSITION_2;
        if (Math.abs(video3.currentTime - video3Time) > VIDEO_SEEK_EPSILON_SEC) {
          try {
            video3.currentTime = Math.max(0, video3Time);
          } catch {
            // Ignore seek errors
          }
        }
      } else if (newActiveVideo === 2) {
        // Part 2: internal time starts at 0, representing 7-31.5 seconds
        const video2Time = newTime - DESKTOP_TRANSITION_1;
        if (Math.abs(video2.currentTime - video2Time) > VIDEO_SEEK_EPSILON_SEC) {
          try {
            video2.currentTime = Math.max(0, video2Time);
          } catch {
            // Ignore seek errors
          }
        }
      } else {
        // Part 1: internal time is the same as logical time (0-7 seconds)
        if (Math.abs(video1.currentTime - newTime) > VIDEO_SEEK_EPSILON_SEC) {
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
  }, [getSectionInfo, scrollToVideoTime]);

  // === LIFECYCLE ===
  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    const video3 = video3Ref.current;
    if (!video1 || !video2 || !video3) return;

    const checkAndInitialize = () => {
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
      if (typeof window !== 'undefined') {
        const scrollTop = window.scrollY;
        const initialTime = scrollToVideoTime(scrollTop);
        scrollTimeRef.current = initialTime;
        currentTimeRef.current = initialTime;

        // Determine which video is active and set up seek completion handler
        let activeVideo: HTMLVideoElement;
        if (initialTime >= DESKTOP_TRANSITION_2) {
          activeVideoRef.current = 3;
          setActiveVideo(3);
          activeVideo = video3;
          video3.currentTime = initialTime - DESKTOP_TRANSITION_2;
          video2.currentTime = DESKTOP_TRANSITION_2 - DESKTOP_TRANSITION_1; // Park at end
          video1.currentTime = DESKTOP_TRANSITION_1; // Park at end
        } else if (initialTime >= DESKTOP_TRANSITION_1) {
          activeVideoRef.current = 2;
          setActiveVideo(2);
          activeVideo = video2;
          video2.currentTime = initialTime - DESKTOP_TRANSITION_1;
          video1.currentTime = DESKTOP_TRANSITION_1; // Park at end
          video3.currentTime = 0; // Park at start
        } else {
          activeVideoRef.current = 1;
          setActiveVideo(1);
          activeVideo = video1;
          video1.currentTime = initialTime;
          video2.currentTime = 0; // Park at start
          video3.currentTime = 0; // Park at start
        }

        // Wait for the active video's seek to complete before showing
        // This prevents the "leaped forward" issue where video shows a buffered frame
        const onSeeked = () => {
          activeVideo.removeEventListener('seeked', onSeeked);
          if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
            seekTimeoutRef.current = null;
          }
          setInitialSeekComplete(true);
        };
        activeVideo.addEventListener('seeked', onSeeked);

        // Fallback: if seeked never fires, show anyway after the configured timeout.
        seekTimeoutRef.current = setTimeout(() => {
          activeVideo.removeEventListener('seeked', onSeeked);
          seekTimeoutRef.current = null;
          setInitialSeekComplete(true);
        }, INITIAL_SEEK_TIMEOUT_MS);
      } else {
        video1.currentTime = 0;
        video2.currentTime = 0;
        video3.currentTime = 0;
        setInitialSeekComplete(true);
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
    const interval = setInterval(checkAndInitialize, VIDEO_READY_POLL_MS);

    video1.load();
    video2.load();
    video3.load();

    return () => {
      clearInterval(interval);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
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
  }, [startAnimationLoop, refreshSectionCache, scrollToVideoTime]);

  // === RENDER ===
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Loading skeleton */}
      <div
        className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 animate-pulse"
        style={{ transform: `scale(${BG_SCALE})` }}
      />

      {/* Poster (high priority) */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        fetchPriority="high"
        onLoad={() => setPosterLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `scale(${BG_SCALE})` }}
      />

      {/* Video Part 1 (0-7 seconds) */}
      <video
        ref={video1Ref}
        src={DESKTOP_VIDEO_PARTS[0].src}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover ${
          videoReady && activeVideo === 1 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'transform',
          transform: `translateZ(0) scale(${BG_SCALE})`,
          backfaceVisibility: 'hidden',
          // No transition on opacity - instant switch for seamless frame matching
        }}
      />

      {/* Video Part 2 (7-31.5 seconds) */}
      <video
        ref={video2Ref}
        src={DESKTOP_VIDEO_PARTS[1].src}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover ${
          videoReady && activeVideo === 2 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'transform',
          transform: `translateZ(0) scale(${BG_SCALE})`,
          backfaceVisibility: 'hidden',
          // No transition on opacity - instant switch for seamless frame matching
        }}
      />

      {/* Video Part 3 (31.5+ seconds) */}
      <video
        ref={video3Ref}
        src={DESKTOP_VIDEO_PARTS[2].src}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        className={`absolute inset-0 w-full h-full object-cover ${
          videoReady && activeVideo === 3 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'transform',
          transform: `translateZ(0) scale(${BG_SCALE})`,
          backfaceVisibility: 'hidden',
          // No transition on opacity - instant switch for seamless frame matching
        }}
      />

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
