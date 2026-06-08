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
import {
  DEFAULT_LOOP_EFFECT_TUNING,
  type LoopEffectTuning,
  type LoopHideTechnique,
} from './loopEffects/model';
import {
  getStoredLoopControlsOpen,
  getStoredLoopMaskSettings,
  writeLoopControlsOpen,
  writeLoopMaskSettings,
} from './loopEffects/storage';
import { useLoopMaskScheduler } from './loopEffects/useLoopMaskScheduler';
import { LoopVideoEffectStack } from './loopEffects/LoopVideoEffectStack';
import { LoopMaskControls } from './loopEffects/LoopMaskControls';

const POSTER_SRC = '/hero-poster-flipped.jpg';
const LOOP_VIDEO_SRC = '/hero-loop-matched-v4.mp4';
const LOOP_DURATION_SEC = 5.59375;
const RESIZE_DEBOUNCE_MS = 150;

type JumpWarpPreset = 'none' | 'subtle' | 'speed-blur' | 'long-glide';

const JUMP_WARP_PRESET: JumpWarpPreset = 'speed-blur';
const JUMP_WARP_PRESETS: Record<JumpWarpPreset, { durationMs: number }> = {
  none: { durationMs: 0 },
  subtle: { durationMs: 380 },
  'speed-blur': { durationMs: 3000 },
  'long-glide': { durationMs: 3000 },
};

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
  const [jumpWarpActive, setJumpWarpActive] = useState(false);
  const [loopMaskSettings, setLoopMaskSettings] = useState(getStoredLoopMaskSettings);
  const [loopControlsOpen, setLoopControlsOpen] = useState(getStoredLoopControlsOpen);
  const loopMaskEnabled = loopMaskSettings.enabled && loopMaskSettings.effects.length > 0;

  const markFirstFrame = useCallback(() => {
    setHasFirstFrame(true);
  }, []);

  const getEffectTuning = useCallback((effect: LoopHideTechnique) => (
    loopMaskSettings.effectSettings[effect] ?? DEFAULT_LOOP_EFFECT_TUNING
  ), [loopMaskSettings.effectSettings]);

  const {
    activeLoopMaskEffects,
    triggerLoopMask,
    onRestStageProgress,
  } = useLoopMaskScheduler({
    loopMaskEnabled,
    loopMaskEffects: loopMaskSettings.effects,
    getEffectTuning,
    slotARef,
    slotBRef,
    loopVideoSrc: LOOP_VIDEO_SRC,
    loopDurationSec: LOOP_DURATION_SEC,
  });

  useEffect(() => {
    writeLoopMaskSettings(loopMaskSettings);
  }, [loopMaskSettings]);

  useEffect(() => {
    writeLoopControlsOpen(loopControlsOpen);
  }, [loopControlsOpen]);

  const triggerJumpWarp = useCallback(() => {
    if (JUMP_WARP_PRESETS[JUMP_WARP_PRESET].durationMs <= 0) return;

    setJumpWarpActive(false);
    requestAnimationFrame(() => {
      setJumpWarpActive(true);
    });
  }, []);

  useEffect(() => {
    if (!jumpWarpActive) return;
    const timeoutId = setTimeout(() => {
      setJumpWarpActive(false);
    }, JUMP_WARP_PRESETS[JUMP_WARP_PRESET].durationMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [jumpWarpActive]);

  const toggleLoopMaskEffect = (effect: LoopHideTechnique) => {
    setLoopMaskSettings(previous => {
      const effects = previous.effects.includes(effect)
        ? previous.effects.filter(item => item !== effect)
        : [...previous.effects, effect];

      return {
        ...previous,
        effects,
      };
    });
  };

  const updateLoopEffectTuning = <Key extends keyof LoopEffectTuning>(
    effect: LoopHideTechnique,
    key: Key,
    value: LoopEffectTuning[Key]
  ) => {
    setLoopMaskSettings(previous => ({
      ...previous,
      effectSettings: {
        ...previous.effectSettings,
        [effect]: {
          ...(previous.effectSettings[effect] ?? DEFAULT_LOOP_EFFECT_TUNING),
          [key]: value,
        },
      },
    }));
  };

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
      onRestStageProgress,
      onJumpLand() {
        triggerJumpWarp();
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
  }, [isMobile, onRestStageProgress, triggerJumpWarp]);

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
        <LoopVideoEffectStack
          slotARef={slotARef}
          slotBRef={slotBRef}
          loopMaskEnabled={loopMaskEnabled}
          loopMaskEffects={loopMaskSettings.effects}
          activeLoopMaskEffects={activeLoopMaskEffects}
          getEffectTuning={getEffectTuning}
          jumpWarpActive={jumpWarpActive}
          jumpWarpPreset={JUMP_WARP_PRESET}
          posterSrc={POSTER_SRC}
          onLoadedData={markFirstFrame}
        />
      </div>

      <LoopMaskControls
        open={loopControlsOpen}
        onOpenChange={setLoopControlsOpen}
        settings={loopMaskSettings}
        onSettingsChange={setLoopMaskSettings}
        onToggleEffect={toggleLoopMaskEffect}
        onUpdateEffectTuning={updateLoopEffectTuning}
        onPreview={() => triggerLoopMask('preview')}
      />
    </>
  );
};

export default HomeBackgroundVideo;
