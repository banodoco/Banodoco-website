import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HomeSectionId } from './scrollVideoConfig';
import {
  BG_SCALE,
  CLIP_BY_ID,
  CROSSFADE_DURATION,
  INITIAL_PLAY_DELAY_MS,
  JUMP_DEBOUNCE_MS,
  MOBILE_PLAYBACK_RATE_IDLE,
  MOBILE_PLAYBACK_RATE_SCROLL,
  PLAY_RETRY_COUNT,
  PLAY_RETRY_DELAY_MS,
  SCROLL_IDLE_TIMEOUT,
  SECTION_IDS,
  WAITING_FALLBACK_MS,
  preloadPostersInOrder,
} from './scrollVideoConfig';

// =============================================================================
// MOBILE: Separate video clips with crossfade
// Simplified architecture to avoid race conditions:
// - Uses refs for real-time state tracking (no stale closures)
// - Renders current + adjacent sections for smooth transitions
// - Videos play once per section "visit" (reset when leaving)
// - Simple crossfade transitions without complex scrubbing
// =============================================================================
export const CrossfadeScrollVideo = () => {
  // === STATE ===
  const [currentSection, setCurrentSection] = useState<HomeSectionId>(SECTION_IDS[0]);
  const [previousSection, setPreviousSection] = useState<HomeSectionId | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'waiting' | 'fading'>('idle');
  const [readyBySection, setReadyBySection] = useState<Partial<Record<HomeSectionId, boolean>>>({
    // Pre-mark initial section as ready to avoid stuck state on first load
    [SECTION_IDS[0]]: true,
  });

  // === REFS (for real-time access without stale closures) ===
  const currentSectionRef = useRef<HomeSectionId>(SECTION_IDS[0]);
  const videoRefs = useRef<Partial<Record<HomeSectionId, HTMLVideoElement | null>>>({});
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAttemptRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSectionRef = useRef<HomeSectionId | null>(null);
  const isScrollingRef = useRef(false);

  // Track which sections have played their video in this "visit"
  // Reset when a section is no longer current or adjacent
  const playedInVisitRef = useRef<Set<HomeSectionId>>(new Set());

  const isHomeSectionId = (value: string): value is HomeSectionId => {
    return SECTION_IDS.includes(value as HomeSectionId);
  };

  // Update playback rate on all playing videos based on scroll state
  const updatePlaybackRates = useCallback((rate: number) => {
    Object.values(videoRefs.current).forEach(video => {
      if (video && !video.paused) {
        video.playbackRate = rate;
      }
    });
  }, []);

  // Preload all posters in order on mount
  useEffect(() => {
    preloadPostersInOrder();
  }, []);

  // === HELPERS ===
  const markReady = useCallback((sectionId: HomeSectionId) => {
    setReadyBySection(prev => (prev[sectionId] ? prev : { ...prev, [sectionId]: true }));
  }, []);

  // Set video ref AND check if already ready (for cached videos where events already fired)
  const setVideoRef = useCallback((sectionId: HomeSectionId, el: HTMLVideoElement | null) => {
    videoRefs.current[sectionId] = el;
    // If video is already loaded (cached), mark it ready immediately
    if (el && el.readyState >= 2) {
      markReady(sectionId);
    }
  }, [markReady]);

  // Determine which sections to render (current + adjacent for smooth transitions)
  const sectionsToRender = useMemo(() => {
    const currentIdx = SECTION_IDS.indexOf(currentSection);
    const prevIdx = previousSection ? SECTION_IDS.indexOf(previousSection) : -1;
    const indices = new Set<number>();

    // Always include current
    if (currentIdx >= 0) indices.add(currentIdx);
    // Include previous (for transitions)
    if (prevIdx >= 0) indices.add(prevIdx);
    // Include next (for preloading)
    if (currentIdx >= 0 && currentIdx < SECTION_IDS.length - 1) indices.add(currentIdx + 1);
    // Include previous neighbor (for smooth backward scroll)
    if (currentIdx > 0) indices.add(currentIdx - 1);

    return Array.from(indices).map(i => SECTION_IDS[i]).filter(Boolean);
  }, [currentSection, previousSection]);

  // Clean up "played" status for sections that are no longer rendered
  useEffect(() => {
    const renderedSet = new Set(sectionsToRender);
    playedInVisitRef.current.forEach(sectionId => {
      if (!renderedSet.has(sectionId)) {
        playedInVisitRef.current.delete(sectionId);
      }
    });
  }, [sectionsToRender]);

  const getCurrentSectionFromScroll = useCallback(() => {
    if (typeof window === 'undefined') return SECTION_IDS[0];

    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const scrollCenter = scrollTop + viewportHeight / 2;

    const sections = document.querySelectorAll('section');
    let currentId = SECTION_IDS[0];

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;

      if (scrollCenter >= sectionTop && scrollCenter < sectionBottom) {
        const id = section.id;
        if (isHomeSectionId(id)) {
          currentId = id;
        }
      }
    });

    return currentId;
  }, []);

  // === PLAY VIDEO WITH RETRY ===
  // Handles the case where video ref might not be ready yet after a re-render
  // Uses the standardized retry count and delay to match the existing iOS behavior.
  const playVideoWithRetry = useCallback((sectionId: HomeSectionId, retries = PLAY_RETRY_COUNT) => {
    // Don't play if already played in this visit
    if (playedInVisitRef.current.has(sectionId)) return;

    const video = videoRefs.current[sectionId];

    if (!video) {
      // Video not mounted yet, retry after a short delay
      if (retries > 0) {
        playAttemptRef.current = setTimeout(() => {
          playVideoWithRetry(sectionId, retries - 1);
        }, PLAY_RETRY_DELAY_MS);
      }
      return;
    }

    // Reset to beginning and play
    try {
      video.currentTime = 0;
      // Use current scroll state to determine initial playback rate
      video.playbackRate = isScrollingRef.current ? MOBILE_PLAYBACK_RATE_SCROLL : MOBILE_PLAYBACK_RATE_IDLE;
    } catch {
      // Ignore seek errors on videos not yet loaded
    }

    video.play()
      .then(() => {
        playedInVisitRef.current.add(sectionId);
      })
      .catch((err) => {
        // On mobile, play() can fail if video isn't loaded yet
        // Retry after a short delay for iOS reliability
        if (retries > 0 && err.name !== 'AbortError') {
          playAttemptRef.current = setTimeout(() => {
            playVideoWithRetry(sectionId, retries - 1);
          }, PLAY_RETRY_DELAY_MS);
        }
      });
  }, []);

  // === SECTION CHANGE HANDLER ===
  // Debounces rapid section changes (e.g., from header navigation smooth scroll)
  // to avoid loading/playing videos for every intermediate section we pass through.
  const handleSectionChange = useCallback((newSection: HomeSectionId) => {
    // Use ref for real-time comparison (avoids stale closure issues)
    if (newSection === currentSectionRef.current && !pendingSectionRef.current) return;

    // If jumping multiple sections (e.g., header nav), debounce to avoid video stutter
    const currentIdx = SECTION_IDS.indexOf(currentSectionRef.current);
    const newIdx = SECTION_IDS.indexOf(newSection);
    const isJumping = Math.abs(newIdx - currentIdx) > 1;

    // Store the pending section
    pendingSectionRef.current = newSection;

    // Clear any existing debounce timeout
    if (sectionChangeDebounceRef.current) {
      clearTimeout(sectionChangeDebounceRef.current);
    }

    // If jumping multiple sections, wait for scroll to settle before switching
    // This prevents rapid video load/play/pause cycles during header navigation
    // For single-section scrolls, respond immediately so transition starts right away
    const debounceTime = isJumping ? JUMP_DEBOUNCE_MS : 0;

    sectionChangeDebounceRef.current = setTimeout(() => {
      const targetSection = pendingSectionRef.current;
      pendingSectionRef.current = null;

      if (!targetSection || targetSection === currentSectionRef.current) return;

      // Clear any pending operations
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (playAttemptRef.current) {
        clearTimeout(playAttemptRef.current);
      }

      const oldSection = currentSectionRef.current;

      // Update ref immediately (source of truth)
      currentSectionRef.current = targetSection;

      // Pause the outgoing video
      const outgoingVideo = videoRefs.current[oldSection];
      if (outgoingVideo) {
        outgoingVideo.pause();
      }

      // Update state (triggers re-render)
      setPreviousSection(oldSection);
      setCurrentSection(targetSection);
      // Stage 1: keep outgoing visible until incoming has at least loaded a frame.
      setTransitionPhase('waiting');

      // Kick off loading/decoding for the incoming section ASAP.
      playVideoWithRetry(targetSection);
    }, debounceTime);
  }, [playVideoWithRetry]);

  // Stage 2: once incoming is ready (or timeout), crossfade and then finalize.
  useEffect(() => {
    if (transitionPhase !== 'waiting') {
      // Clear any waiting timeout if we're not in waiting phase
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      return;
    }
    if (!previousSection) {
      setTransitionPhase('idle');
      return;
    }

    const startFade = () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      setTransitionPhase('fading');
      // Ensure playback is started (once-per-visit logic still applies).
      playVideoWithRetry(currentSection);

      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setPreviousSection(null);
        setTransitionPhase('idle');
      }, CROSSFADE_DURATION);
    };

    // If already ready, start fade immediately
    if (readyBySection[currentSection]) {
      startFade();
      return;
    }

    // Fallback: don't wait forever - start fade after the configured timeout even if not "ready"
    // This handles cases where onLoadedData/onCanPlay never fire (iOS quirks, cached videos, etc.)
    if (!waitingTimeoutRef.current) {
      waitingTimeoutRef.current = setTimeout(() => {
        startFade();
      }, WAITING_FALLBACK_MS);
    }
  }, [transitionPhase, previousSection, currentSection, readyBySection, playVideoWithRetry]);

  // === SCROLL LISTENER ===
  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newSection = getCurrentSectionFromScroll();
        handleSectionChange(newSection);

        // Speed up video when scrolling (gives impression of scrubbing)
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          updatePlaybackRates(MOBILE_PLAYBACK_RATE_SCROLL);
        }

        // Clear existing idle timeout and set new one
        if (scrollIdleTimeoutRef.current) {
          clearTimeout(scrollIdleTimeoutRef.current);
        }
        scrollIdleTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
          updatePlaybackRates(MOBILE_PLAYBACK_RATE_IDLE);
        }, SCROLL_IDLE_TIMEOUT);
      });
    };

    // Document/body scroll fires on `window` — listen there now that the home
    // page scrolls the body instead of an internal div.
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial section detection and video play
    handleScroll();
    // Also try to play initial section video after a short delay (for first load)
    const initialPlayTimeout = setTimeout(() => {
      playVideoWithRetry(currentSectionRef.current);
    }, INITIAL_PLAY_DELAY_MS);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
      if (playAttemptRef.current) clearTimeout(playAttemptRef.current);
      if (scrollIdleTimeoutRef.current) clearTimeout(scrollIdleTimeoutRef.current);
      if (sectionChangeDebounceRef.current) clearTimeout(sectionChangeDebounceRef.current);
      clearTimeout(initialPlayTimeout);
    };
  }, [getCurrentSectionFromScroll, handleSectionChange, playVideoWithRetry, updatePlaybackRates]);

  // === RENDER ===
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Loading skeleton - prevents flash of black on initial load */}
      <div
        className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        style={{ transform: `scale(${BG_SCALE})` }}
      />

      {/* Hero poster as base layer - shows immediately while videos load */}
      {/* Must use the poster that matches the sub-1280 hero clip (not the flipped version) */}
      <img
        src={CLIP_BY_ID.hero.poster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: `translateZ(0) scale(${BG_SCALE})`,
          backfaceVisibility: 'hidden',
        }}
      />

      {sectionsToRender.map((sectionId) => {
        const config = CLIP_BY_ID[sectionId];
        if (!config) return null;

        const isCurrent = sectionId === currentSection;
        const isTransitioning = transitionPhase !== 'idle';
        const isPrevious = sectionId === previousSection && isTransitioning;

        // Crossfade behavior:
        // - idle: show current only
        // - waiting: show previous only (prevents blank/black incoming layer covering it)
        // - fading: fade previous out, fade current in
        let opacity = 0;
        if (transitionPhase === 'idle') {
          opacity = isCurrent ? 1 : 0;
        } else if (transitionPhase === 'waiting') {
          opacity = isPrevious ? 1 : 0;
        } else {
          // fading
          opacity = isCurrent ? 1 : isPrevious ? 0 : 0;
        }

        return (
          <div
            key={sectionId}
            className="absolute inset-0 w-full h-full transition-opacity"
            style={{
              opacity,
              transitionDuration: `${CROSSFADE_DURATION}ms`,
              transitionTimingFunction: 'ease-in-out',
              // Current on top, previous below (for crossfade), preload hidden
              zIndex: isCurrent ? 2 : isPrevious ? 1 : 0,
            }}
          >
            <video
              ref={el => setVideoRef(sectionId, el)}
              src={config.video}
              // No poster attribute - base layer provides fallback to avoid zoom mismatch
              muted
              playsInline
              preload="auto"
              onLoadedData={() => markReady(sectionId)}
              onCanPlay={() => markReady(sectionId)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                willChange: 'transform, opacity',
                transform: `translateZ(0) scale(${BG_SCALE})`,
                backfaceVisibility: 'hidden',
              }}
            />
          </div>
        );
      })}

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
