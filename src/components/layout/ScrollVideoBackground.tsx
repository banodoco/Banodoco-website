import { useRef, useEffect, useState, useCallback } from 'react';

// =============================================================================
// SECTION VIDEO CONFIG
// =============================================================================
// Each section has its own video clip for smooth playback (no seeking issues)

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

// Section IDs in order (must match the order they appear on the page)
const SECTION_ORDER = ['hero', 'community', 'reigh', 'arca-gidan', 'ados', 'ecosystem', 'ownership'];

// Playback speed when idle on a section (0.3 = 30% speed for slow ambient movement)
const IDLE_PLAYBACK_RATE = 0.3;
// Transition duration for crossfade (ms)
const CROSSFADE_DURATION = 800;

/**
 * Scroll-driven video background using separate video clips per section.
 * Each section has its own video that plays slowly when visible.
 * Crossfade transition between sections when scrolling.
 */
export const ScrollVideoBackground = () => {
  const [currentSection, setCurrentSection] = useState<string>(SECTION_ORDER[0]);
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get the scroll container
  const getScrollContainer = useCallback(() => {
    return document.getElementById('home-scroll-container');
  }, []);

  // Determine current section based on scroll position (using DOM positions)
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
      
      // Check if scroll center is within this section
      if (scrollCenter >= sectionTop && scrollCenter < sectionBottom) {
        const id = section.id;
        if (SECTION_ORDER.includes(id)) {
          currentId = id;
        }
      }
    });

    return currentId;
  }, [getScrollContainer]);

  // Handle section change with crossfade
  const handleSectionChange = useCallback((newSection: string) => {
    if (newSection === currentSection) return;

    // Clear any pending transition
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Start transition
    setPreviousSection(currentSection);
    setCurrentSection(newSection);
    setIsTransitioning(true);

    // Pause outgoing video, play incoming
    const outgoingVideo = videoRefs.current[currentSection];
    const incomingVideo = videoRefs.current[newSection];

    if (incomingVideo) {
      incomingVideo.currentTime = 0;
      incomingVideo.playbackRate = IDLE_PLAYBACK_RATE;
      incomingVideo.play().catch(() => {});
    }

    // End transition after duration
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setPreviousSection(null);
      
      // Pause the old video
      if (outgoingVideo) {
        outgoingVideo.pause();
      }
    }, CROSSFADE_DURATION);
  }, [currentSection]);

  // Scroll handler
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
    
    // Initial check
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [getScrollContainer, getCurrentSectionFromScroll, handleSectionChange]);

  // Start playing the current section video on mount
  useEffect(() => {
    const currentVideo = videoRefs.current[currentSection];
    if (currentVideo) {
      currentVideo.playbackRate = IDLE_PLAYBACK_RATE;
      currentVideo.play().catch(() => {});
    }
  }, [currentSection]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Render all section videos, stacked */}
      {SECTION_ORDER.map((sectionId) => {
        const config = SECTION_VIDEOS[sectionId];
        if (!config) return null;

        const isCurrent = sectionId === currentSection;
        const isPrevious = sectionId === previousSection && isTransitioning;
        const isVisible = isCurrent || isPrevious;

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
              preload={isVisible ? 'auto' : 'metadata'}
              className="absolute inset-0 w-full h-full object-cover scale-[1.3]"
            />
          </div>
        );
      })}

      {/* Morph/blur effect during transition */}
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
