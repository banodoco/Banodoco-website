import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Track } from '../../scrollVideoEngine';
import type { LoopEffectTuning, LoopHideTechnique } from './model';

const LOOP_MASK_RELEASE_BUFFER_MS = 180;

type RestStageProgressEvent = {
  sectionId: string;
  stageIndex: number;
  track: Track;
  nextTrack: Track | null;
  remainingSeconds: number;
};

type TriggerLoopMask = (
  phase?: string,
  fallbackOnly?: boolean,
  effects?: LoopHideTechnique[]
) => void;

type UseLoopMaskSchedulerArgs = {
  loopMaskEnabled: boolean;
  loopMaskEffects: LoopHideTechnique[];
  getEffectTuning: (effect: LoopHideTechnique) => LoopEffectTuning;
  slotARef: RefObject<HTMLVideoElement | null>;
  slotBRef: RefObject<HTMLVideoElement | null>;
  loopVideoSrc: string;
  loopDurationSec: number;
};

export const useLoopMaskScheduler = ({
  loopMaskEnabled,
  loopMaskEffects,
  getEffectTuning,
  slotARef,
  slotBRef,
  loopVideoSrc,
  loopDurationSec,
}: UseLoopMaskSchedulerArgs) => {
  const enabledRef = useRef(loopMaskEnabled);
  const effectsRef = useRef(loopMaskEffects);
  const getEffectTuningRef = useRef(getEffectTuning);
  const introBoundaryArmedRef = useRef<Partial<Record<LoopHideTechnique, boolean>>>({});
  const previousPlaybackRef = useRef(new Map<HTMLVideoElement, {
    src: string;
    time: number;
    isLoopSrc: boolean;
  }>());
  const wrapArmedRef = useRef(new WeakMap<HTMLVideoElement, Partial<Record<LoopHideTechnique, boolean>>>());
  const lastLoopMaskAtRef = useRef(new Map<string, number>());
  const loopMaskActiveUntilRef = useRef(new Map<LoopHideTechnique, number>());
  const loopMaskTimeoutsRef = useRef(new Map<LoopHideTechnique, ReturnType<typeof setTimeout>>());
  const [activeLoopMaskEffects, setActiveLoopMaskEffects] = useState<Partial<Record<LoopHideTechnique, boolean>>>({});

  useEffect(() => {
    enabledRef.current = loopMaskEnabled;
    effectsRef.current = loopMaskEffects;
    getEffectTuningRef.current = getEffectTuning;
  }, [getEffectTuning, loopMaskEffects, loopMaskEnabled]);

  const triggerLoopMask = useCallback<TriggerLoopMask>((phase = 'manual', fallbackOnly = false, effects) => {
    if (!enabledRef.current) return;

    const now = performance.now();
    const targetEffects = effects ?? effectsRef.current;

    targetEffects.forEach(effect => {
      const durationMs = getEffectTuningRef.current(effect).durationMs;
      const activeUntil = loopMaskActiveUntilRef.current.get(effect) ?? 0;
      if (fallbackOnly && now < activeUntil) return;

      const key = `${effect}:${phase}`;
      const lastAt = lastLoopMaskAtRef.current.get(key) ?? 0;
      if (now - lastAt < Math.max(120, durationMs * 0.35)) return;

      lastLoopMaskAtRef.current.set(key, now);
      loopMaskActiveUntilRef.current.set(effect, now + durationMs + LOOP_MASK_RELEASE_BUFFER_MS);

      const existingTimeout = loopMaskTimeoutsRef.current.get(effect);
      if (existingTimeout) clearTimeout(existingTimeout);

      setActiveLoopMaskEffects(previous => ({ ...previous, [effect]: false }));
      requestAnimationFrame(() => {
        setActiveLoopMaskEffects(previous => ({ ...previous, [effect]: true }));
      });

      const timeoutId = setTimeout(() => {
        setActiveLoopMaskEffects(previous => ({ ...previous, [effect]: false }));
        loopMaskTimeoutsRef.current.delete(effect);
      }, durationMs + LOOP_MASK_RELEASE_BUFFER_MS);
      loopMaskTimeoutsRef.current.set(effect, timeoutId);
    });
  }, []);

  useEffect(() => () => {
    loopMaskTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    loopMaskTimeoutsRef.current.clear();
  }, []);

  useEffect(() => {
    let rafId = 0;

    const inspect = () => {
      const slots = [slotARef.current, slotBRef.current].filter(Boolean) as HTMLVideoElement[];

      for (const video of slots) {
        const src = video.currentSrc || video.src;
        const isLoopSrc = src.endsWith(loopVideoSrc);
        const previous = previousPlaybackRef.current.get(video);
        const switchedIntoLoop = isLoopSrc && previous && previous.src !== src;
        const wrappedLoop = isLoopSrc
          && previous?.isLoopSrc
          && previous.time > 1
          && video.currentTime + 0.25 < previous.time;

        const existingArmed = wrapArmedRef.current.get(video);
        const armed: Partial<Record<LoopHideTechnique, boolean>> = existingArmed ?? {};
        if (!existingArmed) wrapArmedRef.current.set(video, armed);

        effectsRef.current.forEach(effect => {
          const leadSeconds = getEffectTuningRef.current(effect).durationMs / 2000;
          const wrapWindowStart = loopDurationSec - leadSeconds;
          const loopIsAboutToWrap = isLoopSrc
            && video.currentTime >= wrapWindowStart
            && video.currentTime <= loopDurationSec + 0.1;

          // Re-arm once we're back outside the lead window (i.e. after the wrap).
          if (!isLoopSrc || video.currentTime < wrapWindowStart || wrappedLoop) {
            armed[effect] = true;
          }

          if (loopIsAboutToWrap && armed[effect] !== false) {
            armed[effect] = false;
            triggerLoopMask('loop-wrap', false, [effect]);
          }
        });

        if (switchedIntoLoop || wrappedLoop) {
          triggerLoopMask(switchedIntoLoop ? 'intro-switch-fallback' : 'loop-wrap-fallback', true);
        }

        previousPlaybackRef.current.set(video, {
          src,
          time: video.currentTime,
          isLoopSrc,
        });
      }

      rafId = requestAnimationFrame(inspect);
    };

    rafId = requestAnimationFrame(inspect);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [loopDurationSec, loopVideoSrc, slotARef, slotBRef, triggerLoopMask]);

  const onRestStageProgress = useCallback((event: RestStageProgressEvent) => {
    const isIntroToLoop = event.sectionId === 'hero'
      && event.nextTrack?.src === loopVideoSrc;

    if (!isIntroToLoop) {
      if (event.sectionId !== 'hero') {
        introBoundaryArmedRef.current = {};
      }
      return;
    }

    effectsRef.current.forEach(effect => {
      const leadSeconds = getEffectTuningRef.current(effect).durationMs / 2000;
      if (event.remainingSeconds <= leadSeconds && introBoundaryArmedRef.current[effect] !== false) {
        introBoundaryArmedRef.current[effect] = false;
        triggerLoopMask('intro-switch', false, [effect]);
      }
    });
  }, [loopVideoSrc, triggerLoopMask]);

  return {
    activeLoopMaskEffects,
    triggerLoopMask,
    onRestStageProgress,
  };
};
