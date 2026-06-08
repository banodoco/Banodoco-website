import type {
  CompiledTransition,
  CompiledTransitionStep,
  Section,
  SlotRole,
  Track,
} from './types';
import { transitionKey } from './types';
import {
  getCatchUpStage,
  getEntryStage,
  getJumpStage,
} from './sectionStages';

// Hard seek when the slot is paused (we want to land exactly where requested).
const PAUSED_SEEK_EPSILON_SEC = 0.02;
// While playing, avoid writing currentTime for ordinary drift. A currentTime
// assignment is a seek, so a low threshold makes catch-up look like a sequence
// of cuts. Small lag is absorbed by temporarily raising playbackRate; only
// extreme drift gets a hard seek.
const PLAYING_SOFT_RESYNC_THRESHOLD_SEC = 0.12;
const PLAYING_HARD_RESYNC_THRESHOLD_SEC = 10;
const PLAYING_MAX_RATE = 4;
const PLAYING_MIN_RATE = 0.5;
const PLAYING_DRIFT_RATE_GAIN = 1.2;
const REST_STAGE_SOURCE_SWAP_MS = 280;

type SlotKey = 'A' | 'B';

type SlotRuntime = {
  el: HTMLVideoElement;
  src: string | null;
  ready: boolean;
  readyPromise: Promise<void> | null;
  forceSeek: boolean;
  desiredTime: number;
  desiredPlay: boolean;
  desiredRate: number;
  opacity: number;
};

type EngineState = {
  sectionId: string;
  stageIndex: number;
  stageElapsedMs: number;
  phase: 'rest' | 'transitioning';
  activeSlot: SlotKey;
  stageCrossfade?: {
    fromSlot: SlotKey;
    toSlot: SlotKey;
    elapsedMs: number;
    durationMs: number;
    track: Track;
    primed: boolean;
  };
  transition?: {
    compiled: CompiledTransition;
    stepIndex: number;
    stepElapsedMs: number;
    fromSlot: SlotKey;
    toSlot: SlotKey;
  };
};

type CreateEngineArgs = {
  sections: readonly Section[];
  compiledTransitions: Map<string, CompiledTransition>;
  slotA: HTMLVideoElement;
  slotB: HTMLVideoElement;
  isMobile: boolean;
  onRestStageProgress?: (event: {
    sectionId: string;
    stageIndex: number;
    track: Track;
    nextTrack: Track | null;
    remainingSeconds: number;
  }) => void;
  onJumpLand?: (event: { from: string; to: string }) => void;
};

type Engine = {
  requestSection(targetId: string): void;
  destroy(): void;
};

export const createEngine = ({
  sections,
  compiledTransitions,
  slotA,
  slotB,
  isMobile,
  onRestStageProgress,
  onJumpLand,
}: CreateEngineArgs): Engine => {
  const sectionById = new Map(sections.map(section => [section.id, section]));
  const sectionIndexById = new Map(sections.map((section, index) => [section.id, index]));
  const initialSection = sections[0];

  if (!initialSection?.stages[0]) {
    throw new Error('Scroll video engine requires at least one section with one stage');
  }

  const slots: Record<SlotKey, SlotRuntime> = {
    A: { el: slotA, src: null, ready: false, readyPromise: null, forceSeek: false, desiredTime: 0, desiredPlay: false, desiredRate: 1, opacity: 1 },
    B: { el: slotB, src: null, ready: false, readyPromise: null, forceSeek: false, desiredTime: 0, desiredPlay: false, desiredRate: 1, opacity: 0 },
  };

  const state: EngineState = {
    sectionId: initialSection.id,
    stageIndex: 0,
    stageElapsedMs: 0,
    phase: 'rest',
    activeSlot: 'A',
  };

  let rafId = 0;
  let lastTick: number | null = null;
  let destroyed = false;
  let gestureHandler: (() => void) | null = null;
  let queuedTargetId: string | null = null;

  const inactiveSlot = (slot: SlotKey): SlotKey => (slot === 'A' ? 'B' : 'A');
  const sectionDistance = (from: string, to: string): number => {
    const fromIndex = sectionIndexById.get(from);
    const toIndex = sectionIndexById.get(to);
    if (fromIndex === undefined || toIndex === undefined) return Number.POSITIVE_INFINITY;
    return Math.abs(toIndex - fromIndex);
  };
  const resolveSlot = (role: SlotRole, transition = state.transition): SlotKey => {
    if (!transition) return role === 'active' ? state.activeSlot : inactiveSlot(state.activeSlot);
    return role === 'active' ? transition.fromSlot : transition.toSlot;
  };

  const trackStart = (track: Track) => track.startAt ?? 0;
  const trackEnd = (track: Track) => track.endAt ?? track.startAt ?? 0;

  const setSlotSource = (slotKey: SlotKey, track: Track): { ready: boolean; changed: boolean } => {
    const slot = slots[slotKey];

    slot.el.style.transform = track.transform ?? '';

    if (slot.src === track.src) return { ready: slot.ready, changed: false };

    slot.src = track.src;
    slot.ready = false;
    slot.readyPromise = new Promise(resolve => {
      const expectedSrc = track.src;
      const markReady = () => {
        if (slot.src !== expectedSrc) return;
        slot.ready = true;
        slot.readyPromise = null;
        resolve();
      };

      slot.el.addEventListener('loadeddata', markReady, { once: true });
    });
    slot.forceSeek = false;

    slot.el.src = track.src;
    slot.el.muted = true;
    slot.el.playsInline = true;
    slot.el.preload = 'auto';
    slot.el.load();

    if (slot.el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      slot.ready = true;
      slot.readyPromise = Promise.resolve();
    }

    return { ready: slot.ready, changed: true };
  };

  const prepareSlot = (slotKey: SlotKey, track: Track, time?: number): boolean => {
    const slot = slots[slotKey];
    const { ready, changed } = setSlotSource(slotKey, track);
    slot.desiredTime = time ?? (changed ? trackStart(track) : slot.desiredTime);
    return ready;
  };

  const applySlot = (slotKey: SlotKey) => {
    const slot = slots[slotKey];
    slot.el.style.opacity = String(slot.opacity);
    if (!slot.ready) return;

    const driftSeconds = slot.desiredTime - slot.el.currentTime;
    const absDriftSeconds = Math.abs(driftSeconds);
    const shouldHardSeek = slot.desiredPlay
      ? slot.forceSeek || absDriftSeconds > PLAYING_HARD_RESYNC_THRESHOLD_SEC
      : absDriftSeconds > PAUSED_SEEK_EPSILON_SEC;

    if (shouldHardSeek) {
      try {
        slot.el.currentTime = slot.desiredTime;
        slot.forceSeek = false;
      } catch {
        slot.ready = false;
      }
    }

    let effectiveRate = slot.desiredRate;
    if (slot.desiredPlay && !shouldHardSeek && absDriftSeconds > PLAYING_SOFT_RESYNC_THRESHOLD_SEC) {
      const maxRate = Math.max(PLAYING_MAX_RATE, slot.desiredRate);
      effectiveRate = Math.min(
        maxRate,
        Math.max(
          PLAYING_MIN_RATE,
          slot.desiredRate + (driftSeconds * PLAYING_DRIFT_RATE_GAIN)
        )
      );
    }

    if (Math.abs(slot.el.playbackRate - effectiveRate) > 0.01) {
      slot.el.playbackRate = effectiveRate;
    }

    if (slot.desiredPlay && slot.el.paused) {
      slot.el.play().catch(() => {});
    } else if (!slot.desiredPlay && !slot.el.paused) {
      slot.el.pause();
    }
  };

  const applySlots = () => {
    applySlot('A');
    applySlot('B');
  };

  const getSection = (sectionId: string): Section => {
    const section = sectionById.get(sectionId);
    if (!section) throw new Error(`Missing section ${sectionId}`);
    return section;
  };

  const entryTrack = (sectionId: string) => getEntryStage(getSection(sectionId)).track;
  const jumpTrack = (sectionId: string) => getJumpStage(getSection(sectionId)).track;

  const currentStage = () => {
    const section = sectionById.get(state.sectionId);
    if (!section) throw new Error(`Missing current section ${state.sectionId}`);
    return section.stages[state.stageIndex] ?? section.stages[section.stages.length - 1];
  };

  const advanceStage = () => {
    const section = sectionById.get(state.sectionId);
    if (!section) return;
    const nextStageIndex = Math.min(state.stageIndex + 1, section.stages.length - 1);
    const nextTrack = section.stages[nextStageIndex].track;
    const activeKey = state.activeSlot;
    const activeSlotRuntime = slots[activeKey];

    state.stageIndex = nextStageIndex;
    state.stageElapsedMs = 0;

    if (activeSlotRuntime.src && activeSlotRuntime.src !== nextTrack.src) {
      const toSlot = inactiveSlot(activeKey);
      prepareSlot(toSlot, nextTrack, trackStart(nextTrack));
      state.stageCrossfade = {
        fromSlot: activeKey,
        toSlot,
        elapsedMs: 0,
        durationMs: REST_STAGE_SOURCE_SWAP_MS,
        track: nextTrack,
        primed: false,
      };
      return;
    }

    prepareSlot(state.activeSlot, nextTrack);
  };

  const renderRest = (dtMs: number) => {
    const stage = currentStage();
    const crossfade = state.stageCrossfade;

    if (crossfade) {
      const fromSlot = slots[crossfade.fromSlot];
      const toSlot = slots[crossfade.toSlot];
      const ready = prepareSlot(crossfade.toSlot, crossfade.track);

      fromSlot.desiredPlay = false;
      fromSlot.el.style.zIndex = '0';
      toSlot.el.style.zIndex = '1';
      fromSlot.opacity = 1;
      toSlot.opacity = 0;

      if (!ready) return;

      const isCrossfadeEntry = crossfade.elapsedMs === 0;
      const startAt = trackStart(crossfade.track);
      const endAt = trackEnd(crossfade.track);

      if (!crossfade.primed) {
        toSlot.desiredPlay = false;
        toSlot.desiredRate = 1;
        toSlot.desiredTime = crossfade.track.mode.kind === 'freeze' ? endAt : startAt;
        crossfade.primed = true;
        return;
      }

      crossfade.elapsedMs += dtMs;
      const t = crossfade.durationMs <= 0
        ? 1
        : Math.min(1, crossfade.elapsedMs / crossfade.durationMs);
      fromSlot.opacity = 1;
      toSlot.opacity = t;

      if (crossfade.track.mode.kind === 'loop') {
        toSlot.desiredPlay = true;
        toSlot.desiredRate = 1;
        const span = Math.max(endAt - startAt, 0.001);
        if (isCrossfadeEntry) {
          toSlot.desiredTime = startAt;
        } else {
          let next = toSlot.desiredTime + (dtMs / 1000);
          if (next >= endAt) {
            next = startAt + ((next - startAt) % span);
            toSlot.forceSeek = true;
          }
          toSlot.desiredTime = next;
        }
      } else if (crossfade.track.mode.kind === 'play') {
        toSlot.desiredPlay = true;
        toSlot.desiredRate = crossfade.track.mode.speed;
        if (isCrossfadeEntry) {
          toSlot.desiredTime = startAt;
        } else {
          toSlot.desiredTime = Math.min(endAt, toSlot.desiredTime + (dtMs / 1000) * crossfade.track.mode.speed);
        }
      } else {
        toSlot.desiredPlay = false;
        toSlot.desiredRate = 1;
        toSlot.desiredTime = endAt;
      }

      if (t >= 1) {
        state.activeSlot = crossfade.toSlot;
        slots[crossfade.fromSlot].opacity = 0;
        slots[crossfade.fromSlot].desiredPlay = false;
        state.stageCrossfade = undefined;
      }

      return;
    }

    const activeKey = state.activeSlot;
    const inactiveKey = inactiveSlot(activeKey);
    const slot = slots[activeKey];
    const ready = prepareSlot(activeKey, stage.track);

    slots[activeKey].opacity = 1;
    slots[inactiveKey].opacity = 0;
    // Inactive slot is silenced unconditionally.
    slots[inactiveKey].desiredPlay = false;

    if (!ready) return;

    const isStageEntry = state.stageElapsedMs === 0;
    state.stageElapsedMs += dtMs;

    const startAt = trackStart(stage.track);
    const endAt = trackEnd(stage.track);

    if (stage.track.mode.kind === 'freeze') {
      slot.desiredPlay = false;
      slot.desiredRate = 1;
      slot.desiredTime = endAt;
      return;
    }

    if (stage.track.mode.kind === 'loop') {
      slot.desiredPlay = true;
      slot.desiredRate = 1;
      const span = Math.max(endAt - startAt, 0.001);
      const holdAtStartMs = stage.track.holdAtStartMs ?? 0;
      if (isStageEntry) {
        slot.desiredTime = startAt;
      } else if (state.stageElapsedMs <= holdAtStartMs) {
        slot.desiredPlay = false;
        slot.desiredTime = startAt;
      } else {
        let next = slot.desiredTime + (dtMs / 1000);
        if (next >= endAt) {
          next = startAt + ((next - startAt) % span);
          slot.forceSeek = true;
        }
        slot.desiredTime = next;
      }
      return;
    }

    // play — desiredTime advances by expected progress; applySlot resyncs the
    // video element if its natural clock falls behind by more than the threshold.
    const speed = stage.track.mode.speed;
    slot.desiredPlay = true;
    slot.desiredRate = speed;
    if (isStageEntry) {
      slot.desiredTime = startAt;
    } else {
      slot.desiredTime = Math.min(endAt, slot.desiredTime + (dtMs / 1000) * speed);
    }

    const section = sectionById.get(state.sectionId);
    const nextTrack = section?.stages[state.stageIndex + 1]?.track ?? null;
    onRestStageProgress?.({
      sectionId: state.sectionId,
      stageIndex: state.stageIndex,
      track: stage.track,
      nextTrack,
      remainingSeconds: Math.max(0, endAt - slot.desiredTime),
    });

    if (
      slot.desiredTime >= endAt
      && state.stageElapsedMs >= (stage.minDurationMs ?? 0)
    ) {
      advanceStage();
    }
  };

  const finalizeTransition = () => {
    const transition = state.transition;
    if (!transition) return;

    const landingTrack = entryTrack(transition.compiled.to);
    // Same-chunk transitions: keep the slot that just rendered the play step. Swapping
    // to toSlot — which was preloaded at the landing track exactly — would visibly
    // rewind by ~1 frame (slot A was at startAt+ε from natural playback).
    // Cross-chunk: must swap to toSlot, which has the new chunk preloaded.
    const finalSlot: SlotKey = slots[state.activeSlot].src === landingTrack.src
      ? state.activeSlot
      : transition.toSlot;

    const finalSlotRuntime = slots[finalSlot];
    const landingStart = trackStart(landingTrack);
    const landingProgressSeconds = Math.max(0, finalSlotRuntime.desiredTime - landingStart);
    const landingSpeed = landingTrack.mode.kind === 'play' ? landingTrack.mode.speed : 1;

    state.sectionId = transition.compiled.to;
    state.stageIndex = 0;
    state.stageElapsedMs = landingProgressSeconds > 0
      ? (landingProgressSeconds / Math.max(landingSpeed, 0.001)) * 1000
      : 0;
    state.phase = 'rest';
    state.activeSlot = finalSlot;
    state.transition = undefined;

    prepareSlot(state.activeSlot, landingTrack);

    const queued = queuedTargetId;
    queuedTargetId = null;
    if (queued && queued !== state.sectionId) {
      requestSection(queued);
    }
  };

  const stepFinalSlot = (step: CompiledTransitionStep, transition: NonNullable<EngineState['transition']>) => {
    if (step.kind === 'play') return resolveSlot(step.slot, transition);
    if (step.kind === 'crossfade') return resolveSlot(step.toSlot, transition);
    return resolveSlot(step.toSlot, transition);
  };

  const advanceTransitionStep = () => {
    const transition = state.transition;
    if (!transition) return;

    const step = transition.compiled.steps[transition.stepIndex];
    if (step) {
      state.activeSlot = stepFinalSlot(step, transition);
    }

    transition.stepIndex += 1;
    transition.stepElapsedMs = 0;

    if (transition.stepIndex >= transition.compiled.steps.length) {
      finalizeTransition();
    }
  };

  const renderTransition = (dtMs: number) => {
    const transition = state.transition;
    const step = transition?.compiled.steps[transition.stepIndex];
    if (!transition || !step) {
      finalizeTransition();
      return;
    }

    if (step.kind === 'play') {
      const slotKey = resolveSlot(step.slot, transition);
      const otherKey = inactiveSlot(slotKey);
      const startAt = trackStart(step.track);
      const endAt = trackEnd(step.track);
      const ready = prepareSlot(slotKey, step.track);

      slots[slotKey].opacity = 1;
      slots[otherKey].opacity = 0;
      slots[otherKey].desiredPlay = false;

      if (!ready) return;

      const speedStart = step.track.mode.kind === 'play' ? step.track.mode.speed : 1;
      const speedEnd = step.track.mode.kind === 'play' ? step.track.mode.speedEnd : undefined;
      // Linear ramp when speedEnd is set; constant otherwise.
      const progress = speedEnd !== undefined && step.durationMs > 0
        ? Math.min(1, transition.stepElapsedMs / step.durationMs)
        : 0;
      const currentSpeed = speedEnd !== undefined
        ? speedStart + (speedEnd - speedStart) * progress
        : speedStart;
      slots[slotKey].desiredPlay = true;
      slots[slotKey].desiredRate = currentSpeed;

      // Expected-progress driven: desiredTime advances per frame, regardless
      // of whether the video's natural clock kept up. applySlot resyncs.
      if (transition.stepElapsedMs === 0) {
        slots[slotKey].desiredTime = startAt;
      } else {
        slots[slotKey].desiredTime = Math.min(endAt, slots[slotKey].desiredTime + (dtMs / 1000) * currentSpeed);
      }

      transition.stepElapsedMs += dtMs;

      if (transition.stepElapsedMs >= step.durationMs || slots[slotKey].desiredTime >= endAt) {
        advanceTransitionStep();
      }
      return;
    }

    if (step.kind === 'crossfade') {
      const fromSlot = resolveSlot(step.fromSlot, transition);
      const toSlot = resolveSlot(step.toSlot, transition);
      const startAt = trackStart(step.track);
      const endAt = trackEnd(step.track);
      const ready = prepareSlot(toSlot, step.track);

      if (!ready) return;

      // Seed toSlot on first frame.
      if (transition.stepElapsedMs === 0) {
        slots[toSlot].desiredTime = step.track.mode.kind === 'freeze' ? endAt : startAt;
      }

      transition.stepElapsedMs += dtMs;
      const t = Math.min(1, transition.stepElapsedMs / step.durationMs);
      // Keep outgoing fully opaque and fade incoming in on top. Linearly
      // crossfading both opacities produces a midpoint brightness dip on the
      // dark container — at α=0.5 each, the composite is 0.5·top + 0.25·bottom.
      slots[fromSlot].opacity = 1;
      slots[toSlot].opacity = t;
      slots[fromSlot].el.style.zIndex = '0';
      slots[toSlot].el.style.zIndex = '1';

      if (step.track.mode.kind === 'play') {
        slots[toSlot].desiredPlay = true;
        slots[toSlot].desiredRate = step.track.mode.speed;
        slots[toSlot].desiredTime = Math.min(endAt, slots[toSlot].el.currentTime);
      } else if (step.track.mode.kind === 'loop') {
        slots[toSlot].desiredPlay = true;
        slots[toSlot].desiredRate = 1;
        slots[toSlot].desiredTime = slots[toSlot].el.currentTime;
      } else {
        slots[toSlot].desiredPlay = false;
        slots[toSlot].desiredRate = 1;
        slots[toSlot].desiredTime = endAt;
      }

      if (transition.stepElapsedMs >= step.durationMs) {
        advanceTransitionStep();
      }
      return;
    }

    // cut
    const toSlot = resolveSlot(step.toSlot, transition);
    const ready = prepareSlot(toSlot, step.track);

    if (!ready) return;

    slots[toSlot].opacity = 1;
    slots[inactiveSlot(toSlot)].opacity = 0;
    slots[inactiveSlot(toSlot)].desiredPlay = false;
    // The landing stage will own play/rate next frame in renderRest.
    slots[toSlot].desiredTime = trackStart(step.track);
    slots[toSlot].desiredPlay = step.track.mode.kind !== 'freeze';
    slots[toSlot].desiredRate = step.track.mode.kind === 'play' ? step.track.mode.speed : 1;
    advanceTransitionStep();
  };

  const tick = (now: number) => {
    if (destroyed) return;

    const dtMs = lastTick === null ? 0 : now - lastTick;
    lastTick = now;

    if (state.phase === 'rest') {
      renderRest(dtMs);
    } else {
      renderTransition(dtMs);
    }

    applySlots();
    rafId = requestAnimationFrame(tick);
  };

  const synthesizeCut = (from: string, to: string): CompiledTransition => ({
    from,
    to,
    steps: [{ kind: 'cut', toSlot: 'inactive', track: jumpTrack(to), durationMs: 0 }],
  });

  // If the user scrolls out of a section while its rest video still has unplayed
  // content, fast-forward through the remainder before running the transition.
  // Target: <=3s total catch-up; speed clamped to [MIN, max]. The max defaults
  // to DEFAULT_CATCH_UP_MAX_SPEED, but each Section can override via
  // `catchUpMaxSpeed` for content that looks harsh when sped up.
  const CATCH_UP_TARGET_MS = 3000;
  const CATCH_UP_MIN_SPEED = 1.25;
  const DEFAULT_CATCH_UP_MAX_SPEED = 4;
  const CATCH_UP_REMAINING_EPSILON_SEC = 0.05;

  const computeCatchUpStep = (): CompiledTransitionStep | null => {
    if (state.phase !== 'rest') return null;
    const fromSection = sectionById.get(state.sectionId);
    if (!fromSection) return null;
    const targetTrack = getCatchUpStage(fromSection).track;
    if (targetTrack.mode.kind === 'loop') return null;
    const targetTime = trackEnd(targetTrack);
    const slot = slots[state.activeSlot];
    if (!slot.ready || slot.src !== targetTrack.src) return null;

    const current = slot.el.currentTime;
    const remaining = targetTime - current;
    if (remaining <= CATCH_UP_REMAINING_EPSILON_SEC) return null;

    const maxSpeed = fromSection.catchUpMaxSpeed ?? DEFAULT_CATCH_UP_MAX_SPEED;
    const desiredSpeed = remaining / (CATCH_UP_TARGET_MS / 1000);
    const speed = Math.max(CATCH_UP_MIN_SPEED, Math.min(maxSpeed, desiredSpeed));
    const durationMs = (remaining / speed) * 1000;

    return {
      kind: 'play',
      slot: 'active',
      track: {
        src: targetTrack.src,
        startAt: current,
        endAt: targetTime,
        mode: { kind: 'play', speed },
      },
      durationMs,
    };
  };

  const requestSection = (targetId: string) => {
    if (targetId === state.sectionId && state.phase === 'rest') return;
    // Already transitioning to this target — don't restart it.
    if (!sectionById.has(targetId)) return;

    if (state.phase === 'transitioning' && state.transition) {
      const transitionTarget = state.transition.compiled.to;
      if (transitionTarget === targetId) {
        queuedTargetId = null;
        return;
      }

      if (sectionDistance(transitionTarget, targetId) <= 1) {
        queuedTargetId = targetId;
        return;
      }
    }

    const from = state.phase === 'transitioning' && state.transition
      ? state.transition.compiled.to
      : state.sectionId;
    const distance = sectionDistance(from, targetId);
    const shouldJumpLand = distance > 1;
    if (shouldJumpLand) {
      onJumpLand?.({ from, to: targetId });
    }
    const baseCompiled = shouldJumpLand
      ? synthesizeCut(from, targetId)
      : compiledTransitions.get(transitionKey(from, targetId)) ?? synthesizeCut(from, targetId);
    // Only play-first transitions read the active slot's time. Crossfades/cuts
    // can start immediately; finishing rest first injects a visible speed-up.
    const catchUp = baseCompiled.steps[0]?.kind === 'play' ? computeCatchUpStep() : null;
    const compiled: CompiledTransition = catchUp
      ? {
          ...baseCompiled,
          steps: [
            catchUp,
            ...baseCompiled.steps,
          ],
        }
      : baseCompiled;

    const fromSlot = state.activeSlot;
    const toSlot = inactiveSlot(fromSlot);
    const firstStep = compiled.steps[0];

    if (firstStep?.kind === 'crossfade' || firstStep?.kind === 'cut') {
      prepareSlot(toSlot, firstStep.track);
    } else {
      // masterContinue play step (or catch-up step) runs on the active slot;
      // we still need toSlot ready for finalizeTransition to land on a loaded video.
      // Preload to-section's entry stage on toSlot in parallel — otherwise the
      // post-transition swap shows a black frame while it loads.
      prepareSlot(toSlot, entryTrack(targetId));
    }

    state.sectionId = from;
    state.phase = 'transitioning';
    state.transition = {
      compiled,
      stepIndex: 0,
      stepElapsedMs: 0,
      fromSlot,
      toSlot,
    };
  };

  const unlockPlayback = () => {
    slotA.play().catch(() => {});
    slotB.play().catch(() => {});
    if (gestureHandler) {
      window.removeEventListener('pointerdown', gestureHandler);
      window.removeEventListener('touchstart', gestureHandler);
      gestureHandler = null;
    }
  };

  if (isMobile) {
    gestureHandler = unlockPlayback;
    window.addEventListener('pointerdown', gestureHandler, { once: true });
    window.addEventListener('touchstart', gestureHandler, { once: true });
  }

  prepareSlot('A', initialSection.stages[0].track);
  applySlots();
  rafId = requestAnimationFrame(tick);

  return {
    requestSection,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (gestureHandler) {
        window.removeEventListener('pointerdown', gestureHandler);
        window.removeEventListener('touchstart', gestureHandler);
      }
      slotA.pause();
      slotB.pause();
    },
  };
};
