import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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
const LOOP_VIDEO_SRC = '/hero-loop-matched-v4.mp4';
const HERO_INTRO_DURATION_SEC = 7.46875;
const LOOP_DURATION_SEC = 5.59375;
const RESIZE_DEBOUNCE_MS = 150;
const LOOP_MASK_RELEASE_BUFFER_MS = 180;

type LoopHideTechnique =
  | 'veil'
  | 'blur'
  | 'glitch'
  | 'shutter'
  | 'flash'
  | 'fade'
  | 'bloom'
  | 'focus'
  | 'leak'
  | 'drift'
  | 'refract'
  | 'heat'
  | 'prism';

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
  const loopMaskDurationRef = useRef(5000);
  const introBoundaryArmedRef = useRef(true);
  const triggerLoopMaskRef = useRef<(phase?: string, fallbackOnly?: boolean) => void>(() => {});
  const previousPlaybackRef = useRef(new Map<HTMLVideoElement, {
    src: string;
    time: number;
    isLoopSrc: boolean;
    armedBeforeIntroEnd: boolean;
    armedBeforeLoopEnd: boolean;
  }>());
  const lastLoopMaskAtRef = useRef({ at: 0, phase: '' });
  const loopMaskActiveUntilRef = useRef(0);
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const loopMaskEnabled = true;
  const loopMaskTechnique = 'refract' as LoopHideTechnique;
  const loopMaskStartAmount = 7;
  const loopMaskPeakAmount = 23;
  const loopMaskDurationMs = 4230;
  const loopMaskEdge = 95;
  const loopMaskWhite = 46;
  const loopMaskFade = 53;
  const [loopMaskActive, setLoopMaskActive] = useState(false);

  const markFirstFrame = useCallback(() => {
    setHasFirstFrame(true);
  }, []);

  useEffect(() => {
    loopMaskDurationRef.current = loopMaskDurationMs;
  }, [loopMaskDurationMs]);

  const triggerLoopMask = useCallback((phase = 'manual', fallbackOnly = false) => {
    if (!loopMaskEnabled) return;

    const now = performance.now();
    if (fallbackOnly && now < loopMaskActiveUntilRef.current) return;

    const last = lastLoopMaskAtRef.current;
    if (phase === last.phase && now - last.at < Math.max(120, loopMaskDurationMs * 0.35)) return;
    lastLoopMaskAtRef.current = { at: now, phase };
    loopMaskActiveUntilRef.current = now + loopMaskDurationMs + LOOP_MASK_RELEASE_BUFFER_MS;

    setLoopMaskActive(false);
    requestAnimationFrame(() => {
      setLoopMaskActive(true);
    });
  }, [loopMaskDurationMs, loopMaskEnabled]);

  useEffect(() => {
    triggerLoopMaskRef.current = triggerLoopMask;
  }, [triggerLoopMask]);

  useEffect(() => {
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (loopMaskActive) {
      timeoutId = setTimeout(() => {
        setLoopMaskActive(false);
      }, loopMaskDurationMs + LOOP_MASK_RELEASE_BUFFER_MS);
    }

    const inspect = () => {
      const slots = [slotARef.current, slotBRef.current].filter(Boolean) as HTMLVideoElement[];

      for (const video of slots) {
        const src = video.currentSrc || video.src;
        const isLoopSrc = src.endsWith(LOOP_VIDEO_SRC);
        const previous = previousPlaybackRef.current.get(video);
        const switchedIntoLoop = isLoopSrc && previous && previous.src !== src;
        const leadSeconds = loopMaskDurationMs / 1000;
        const introIsAboutToEnd = !isLoopSrc
          && video.currentTime >= HERO_INTRO_DURATION_SEC - leadSeconds
          && video.currentTime <= HERO_INTRO_DURATION_SEC + 0.1;
        const loopIsAboutToWrap = isLoopSrc
          && video.currentTime >= LOOP_DURATION_SEC - leadSeconds
          && video.currentTime <= LOOP_DURATION_SEC + 0.1;
        const wrappedLoop = isLoopSrc
          && previous?.isLoopSrc
          && previous.time > 1
          && video.currentTime + 0.25 < previous.time;

        if (loopIsAboutToWrap && previous?.armedBeforeLoopEnd !== false) {
          triggerLoopMask('loop-wrap');
        }

        if (switchedIntoLoop || wrappedLoop) {
          triggerLoopMask(switchedIntoLoop ? 'intro-switch-fallback' : 'loop-wrap-fallback', true);
        }

        previousPlaybackRef.current.set(video, {
          src,
          time: video.currentTime,
          isLoopSrc,
          armedBeforeIntroEnd: !introIsAboutToEnd && video.currentTime < HERO_INTRO_DURATION_SEC - 1,
          armedBeforeLoopEnd: !loopIsAboutToWrap && video.currentTime < LOOP_DURATION_SEC - 1,
        });
      }

      rafId = requestAnimationFrame(inspect);
    };

    rafId = requestAnimationFrame(inspect);

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loopMaskActive, loopMaskDurationMs, triggerLoopMask]);

  const amountToVisibleRatio = (amount: number) => {
    if (amount === 0) return 0;
    return Math.min(2.25, 0.22 + (amount / 100));
  };

  const startAmountRatio = amountToVisibleRatio(loopMaskStartAmount);
  const peakAmountRatio = Math.max(startAmountRatio, amountToVisibleRatio(loopMaskPeakAmount));
  const whiteRatio = loopMaskWhite / 100;
  const fadeRatio = loopMaskFade / 100;
  const cappedStartAlphaAmount = Math.min(1.35, startAmountRatio);
  const cappedPeakAlphaAmount = Math.min(1.35, peakAmountRatio);
  const flashBaselineAlpha = 1 - (
    (1 - Math.min(1, whiteRatio * cappedStartAlphaAmount))
    * (1 - Math.min(0.92, fadeRatio * cappedStartAlphaAmount))
  );
  const flashPeakAlpha = 1 - (
    (1 - Math.min(1, whiteRatio * cappedPeakAlphaAmount))
    * (1 - Math.min(0.92, fadeRatio * cappedPeakAlphaAmount))
  );
  const flashPulseAlpha = flashBaselineAlpha >= 1
    ? 0
    : Math.max(0, (flashPeakAlpha - flashBaselineAlpha) / (1 - flashBaselineAlpha));
  const loopMaskStyle = {
    '--loop-seam-amount': peakAmountRatio,
    '--loop-seam-duration': `${loopMaskDurationMs}ms`,
    '--loop-seam-veil-blur': `${10 * peakAmountRatio}px`,
    '--loop-seam-veil-saturate': 1 + (0.65 * peakAmountRatio),
    '--loop-seam-blur': `${22 * peakAmountRatio}px`,
    '--loop-seam-brightness': 1 + (0.18 * peakAmountRatio),
    '--loop-seam-opacity-start': Math.min(1, 0.5 * cappedStartAlphaAmount),
    '--loop-seam-opacity-low': Math.min(1, 0.5 * cappedPeakAlphaAmount),
    '--loop-seam-opacity-mid': Math.min(1, 0.75 * cappedPeakAlphaAmount),
    '--loop-seam-opacity-high': Math.min(1, 0.85 * cappedPeakAlphaAmount),
    '--loop-seam-soft-alpha': Math.min(0.55, 0.18 * cappedPeakAlphaAmount),
    '--loop-seam-line-alpha': Math.min(0.42, 0.12 * cappedPeakAlphaAmount),
    '--loop-seam-edge-spread': `${Math.min(92, 18 + (loopMaskEdge * 0.42))}%`,
    '--loop-seam-side-stop': `${Math.max(2, 30 - (loopMaskEdge * 0.18))}%`,
    '--loop-seam-side-alpha': Math.min(0.85, 0.35 * cappedPeakAlphaAmount),
    '--loop-seam-vertical-alpha': Math.min(0.65, 0.25 * cappedPeakAlphaAmount),
    '--loop-seam-glitch-alpha': Math.min(0.65, 0.18 * cappedPeakAlphaAmount),
    '--loop-seam-cyan-alpha': Math.min(0.75, 0.22 * cappedPeakAlphaAmount),
    '--loop-seam-magenta-alpha': Math.min(0.75, 0.2 * cappedPeakAlphaAmount),
    '--loop-seam-band-inset': `${Math.max(0, 24 - (loopMaskEdge * 0.16))}%`,
    '--loop-seam-glitch-sweep-start': `${-48 * peakAmountRatio}px`,
    '--loop-seam-glitch-sweep-end': `${64 * peakAmountRatio}px`,
    '--loop-seam-shutter-alpha': Math.min(0.96, 0.78 * cappedPeakAlphaAmount),
    '--loop-seam-shutter-offset': `${Math.max(-20, 100 - loopMaskEdge)}%`,
    '--loop-seam-shutter-offset-negative': `${-Math.max(-20, 100 - loopMaskEdge)}%`,
    '--loop-seam-flash-alpha-start': Math.min(1, whiteRatio * cappedStartAlphaAmount),
    '--loop-seam-flash-alpha': Math.min(1, whiteRatio * cappedPeakAlphaAmount),
    '--loop-seam-flash-clear-alpha-start': Math.min(0.92, fadeRatio * cappedStartAlphaAmount),
    '--loop-seam-flash-clear-alpha': Math.min(0.92, fadeRatio * cappedPeakAlphaAmount),
    '--loop-seam-flash-baseline-alpha': flashBaselineAlpha,
    '--loop-seam-flash-pulse-alpha': flashPulseAlpha,
    '--loop-seam-flash-blur': `${18 * fadeRatio * peakAmountRatio}px`,
    '--loop-video-fade-opacity-start': Math.max(0, 1 - Math.min(0.92, fadeRatio * cappedStartAlphaAmount)),
    '--loop-video-fade-opacity': Math.max(0, 1 - Math.min(0.92, fadeRatio * cappedPeakAlphaAmount)),
    '--loop-video-fade-blur': `${10 * fadeRatio * peakAmountRatio}px`,
  } as CSSProperties;

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
      onRestStageProgress(event) {
        const isIntroToLoop = event.sectionId === 'hero'
          && event.nextTrack?.src === LOOP_VIDEO_SRC;
        if (!isIntroToLoop) {
          if (event.sectionId !== 'hero') {
            introBoundaryArmedRef.current = true;
          }
          return;
        }

        const leadSeconds = loopMaskDurationRef.current / 1000;
        if (event.remainingSeconds <= leadSeconds && introBoundaryArmedRef.current) {
          introBoundaryArmedRef.current = false;
          triggerLoopMaskRef.current('intro-switch');
        }
      },
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
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 h-full w-full overflow-hidden pointer-events-none bg-black"
        style={{
          backgroundImage: hasFirstFrame ? 'none' : `url(${POSTER_SRC})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-black" />
        <div
          className={[
            'home-video-slots',
            loopMaskTechnique === 'fade' && loopMaskActive ? 'is-loop-video-fading' : '',
            loopMaskTechnique === 'bloom' && loopMaskActive ? 'is-loop-video-blooming' : '',
            loopMaskTechnique === 'focus' && loopMaskActive ? 'is-loop-video-focusing' : '',
            loopMaskTechnique === 'leak' && loopMaskActive ? 'is-loop-video-leaking' : '',
            loopMaskTechnique === 'drift' && loopMaskActive ? 'is-loop-video-drifting' : '',
            loopMaskTechnique === 'refract' && loopMaskActive ? 'is-loop-video-refracting' : '',
            loopMaskTechnique === 'heat' && loopMaskActive ? 'is-loop-video-heating' : '',
            loopMaskTechnique === 'prism' && loopMaskActive ? 'is-loop-video-prisming' : '',
          ].join(' ')}
          style={loopMaskStyle}
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
        <div
          className={[
            'loop-seam-mask',
            `loop-seam-mask--${loopMaskTechnique}`,
            loopMaskEnabled ? 'is-enabled' : '',
            loopMaskActive ? 'is-active' : '',
          ].join(' ')}
          style={loopMaskStyle}
        >
          <div className="loop-seam-flash-baseline" />
          <div className="loop-seam-flash-pulse" />
        </div>
      </div>

    </>
  );
};

export default HomeBackgroundVideo;
