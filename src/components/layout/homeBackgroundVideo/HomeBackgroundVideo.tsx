import { useCallback, useEffect, useRef, useState } from 'react';
import { BREAKPOINTS } from '@/lib/breakpoints';
import {
  compileTransitions,
  createEngine,
  createScrollObserver,
  type Section,
  type Transition,
} from '../scrollVideoEngine';
import {
  DESKTOP_SECTIONS,
  DESKTOP_TRANSITIONS,
  MOBILE_SECTIONS,
  MOBILE_TRANSITIONS,
} from './config';

const POSTER_SRC = '/hero-poster-flipped.jpg';
const RESIZE_DEBOUNCE_MS = 150;

const isMobileViewport = () =>
  typeof window === 'undefined' ? true : window.innerWidth < BREAKPOINTS.xl;

const getCurrentSectionId = (sectionIds: readonly string[]) => {
  const viewportMidline = window.innerHeight / 2;

  return sectionIds.find(id => {
    const element = document.getElementById(id);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.top <= viewportMidline && rect.bottom >= viewportMidline;
  }) ?? sectionIds[0];
};

const pickConfig = (isMobile: boolean): {
  sections: readonly Section[];
  transitions: readonly Transition[];
} => isMobile
  ? { sections: MOBILE_SECTIONS, transitions: MOBILE_TRANSITIONS }
  : { sections: DESKTOP_SECTIONS, transitions: DESKTOP_TRANSITIONS };

export const HomeBackgroundVideo = () => {
  const slotARef = useRef<HTMLVideoElement | null>(null);
  const slotBRef = useRef<HTMLVideoElement | null>(null);
  const currentSectionRef = useRef<string | null>(null);
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);

  const markFirstFrame = useCallback(() => {
    setHasFirstFrame(true);
  }, []);

  useEffect(() => {
    const slotA = slotARef.current;
    const slotB = slotBRef.current;
    if (!slotA || !slotB) return;

    const { sections, transitions } = pickConfig(isMobile);
    const sectionIds = sections.map(section => section.id);
    const compiledTransitions = compileTransitions(transitions, sections);
    const engine = createEngine({
      sections,
      compiledTransitions,
      slotA,
      slotB,
      isMobile,
    });
    const initialSectionId = getCurrentSectionId(sectionIds);

    currentSectionRef.current = initialSectionId;
    engine.requestSection(initialSectionId);

    const observer = createScrollObserver({
      sectionIds,
      onChange(sectionId) {
        if (sectionId === currentSectionRef.current) return;
        currentSectionRef.current = sectionId;
        engine.requestSection(sectionId);
      },
    });

    return () => {
      observer.destroy();
      engine.destroy();
    };
  }, [isMobile]);

  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        setIsMobile(previous => {
          const next = isMobileViewport();
          return previous === next ? previous : next;
        });
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 h-full w-full overflow-hidden pointer-events-none bg-black"
      style={{
        backgroundImage: hasFirstFrame ? 'none' : `url(${POSTER_SRC})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <video
        ref={slotARef}
        muted
        playsInline
        preload="auto"
        onLoadedData={markFirstFrame}
        className="absolute inset-0 h-full w-full object-cover opacity-100"
        style={{ willChange: 'opacity', backfaceVisibility: 'hidden' }}
      />
      <video
        ref={slotBRef}
        muted
        playsInline
        preload="auto"
        onLoadedData={markFirstFrame}
        className="absolute inset-0 h-full w-full object-cover opacity-0"
        style={{ willChange: 'opacity', backfaceVisibility: 'hidden' }}
      />
    </div>
  );
};

export default HomeBackgroundVideo;
