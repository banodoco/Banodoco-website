import type {
  CompiledTransition,
  CompiledTransitionStep,
  Section,
  SlotRole,
  Track,
} from './types';
import { transitionKey } from './types';

// Hard seek when the slot is paused (we want to land exactly where requested).
const PAUSED_SEEK_EPSILON_SEC = 0.02;
// While playing, let the video element's natural clock drift away from the
// engine's expected time up to this much before we hard-seek to resync.
// Writing currentTime every frame causes per-frame seeks that stutter, so we
// stay loose. But if the natural clock falls badly behind (decoder stall,
// network buffering, dropped frames), this threshold catches it and snaps
// the video forward to where it should be. Tune up for more tolerance,
// down for tighter sync.
const PLAYING_RESYNC_THRESHOLD_SEC = 0.6;

type SlotKey = 'A' | 'B';

type SlotRuntime = {
  el: HTMLVideoElement;
  src: string | null;
  ready: boolean;
  readyPromise: Promise<void> | null;
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
}: CreateEngineArgs): Engine => {
  const sectionById = new Map(sections.map(section => [section.id, section]));
  const initialSection = sections[0];

  if (!initialSection?.stages[0]) {
    throw new Error('Scroll video engine requires at least one section with one stage');
  }

  const slots: Record<SlotKey, SlotRuntime> = {
    A: { el: slotA, src: null, ready: false, readyPromise: null, desiredTime: 0, desiredPlay: false, desiredRate: 1, opacity: 1 },
    B: { el: slotB, src: null, ready: false, readyPromise: null, desiredTime: 0, desiredPlay: false, desiredRate: 1, opacity: 0 },
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

  const inactiveSlot = (slot: SlotKey): SlotKey => (slot === 'A' ? 'B' : 'A');
  const resolveSlot = (role: SlotRole, transition = state.transition): SlotKey => {
    if (!transition) return role === 'active' ? state.activeSlot : inactiveSlot(state.activeSlot);
    return role === 'active' ? transition.fromSlot : transition.toSlot;
  };

  const trackStart = (track: Track) => track.startAt ?? 0;
  const trackEnd = (track: Track) => track.endAt ?? track.startAt ?? 0;

  const setSlotSource = (slotKey: SlotKey, track: Track): { ready: boolean; changed: boolean } => {
    const slot = slots[slotKey];

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

      slot.el.addEventListener('loadedmetadata', markReady, { once: true });
    });

    slot.el.src = track.src;
    slot.el.muted = true;
    slot.el.playsInline = true;
    slot.el.preload = 'auto';
    slot.el.load();

    if (slot.el.readyState >= HTMLMediaElement.HAVE_METADATA) {
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

    if (slot.el.playbackRate !== slot.desiredRate) {
      slot.el.playbackRate = slot.desiredRate;
    }

    if (slot.desiredPlay && slot.el.paused) {
      slot.el.play().catch(() => {});
    } else if (!slot.desiredPlay && !slot.el.paused) {
      slot.el.pause();
    }

    const epsilon = slot.desiredPlay ? PLAYING_RESYNC_THRESHOLD_SEC : PAUSED_SEEK_EPSILON_SEC;
    if (Math.abs(slot.el.currentTime - slot.desiredTime) > epsilon) {
      try {
        slot.el.currentTime = slot.desiredTime;
      } catch {
        slot.ready = false;
      }
    }
  };

  const applySlots = () => {
    applySlot('A');
    applySlot('B');
  };

  const firstStageTrack = (sectionId: string) => {
    const track = sectionById.get(sectionId)?.stages[0]?.track;
    if (!track) throw new Error(`Missing first stage for section ${sectionId}`);
    return track;
  };

  const currentStage = () => {
    const section = sectionById.get(state.sectionId);
    if (!section) throw new Error(`Missing current section ${state.sectionId}`);
    return section.stages[state.stageIndex] ?? section.stages[section.stages.length - 1];
  };

  const advanceStage = () => {
    const section = sectionById.get(state.sectionId);
    if (!section) return;
    state.stageIndex = Math.min(state.stageIndex + 1, section.stages.length - 1);
    state.stageElapsedMs = 0;
    prepareSlot(state.activeSlot, section.stages[state.stageIndex].track);
  };

  const renderRest = (dtMs: number) => {
    const stage = currentStage();
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
      if (isStageEntry) {
        slot.desiredTime = startAt;
      } else {
        let next = slot.desiredTime + (dtMs / 1000);
        if (next >= endAt) next = startAt + ((next - startAt) % span);
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

    const newFirstTrack = firstStageTrack(transition.compiled.to);
    // Same-chunk transitions: keep the slot that just rendered the play step. Swapping
    // to toSlot — which was preloaded at currentTime = newFirstTrack.startAt exactly —
    // would visibly rewind by ~1 frame (slot A was at startAt+ε from natural playback).
    // Cross-chunk: must swap to toSlot, which has the new chunk preloaded.
    const finalSlot: SlotKey = slots[state.activeSlot].src === newFirstTrack.src
      ? state.activeSlot
      : transition.toSlot;

    state.sectionId = transition.compiled.to;
    state.stageIndex = 0;
    state.stageElapsedMs = 0;
    state.phase = 'rest';
    state.activeSlot = finalSlot;
    state.transition = undefined;

    prepareSlot(state.activeSlot, newFirstTrack);
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
    // The cut target's first stage will own play/rate next frame in renderRest.
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
    steps: [{ kind: 'cut', toSlot: 'inactive', track: firstStageTrack(to), durationMs: 0 }],
  });

  // If the user scrolls out of a section while its rest video still has unplayed
  // content, fast-forward through the remainder before running the transition.
  // Target: ~400ms total catch-up; speed clamped to [MIN, max]. The max defaults
  // to DEFAULT_CATCH_UP_MAX_SPEED, but each Section can override via
  // `catchUpMaxSpeed` for content that looks harsh when sped up.
  const CATCH_UP_TARGET_MS = 400;
  const CATCH_UP_MIN_SPEED = 1.25;
  const DEFAULT_CATCH_UP_MAX_SPEED = 2;
  const CATCH_UP_REMAINING_EPSILON_SEC = 0.05;

  const computeCatchUpStep = (): CompiledTransitionStep | null => {
    if (state.phase !== 'rest') return null;
    const fromSection = sectionById.get(state.sectionId);
    if (!fromSection) return null;
    const lastStage = fromSection.stages[fromSection.stages.length - 1];
    if (!lastStage) return null;
    const targetTrack = lastStage.track;
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
    if (state.phase === 'transitioning' && state.transition?.compiled.to === targetId) return;
    if (!sectionById.has(targetId)) return;

    const from = state.phase === 'transitioning' && state.transition
      ? state.transition.compiled.to
      : state.sectionId;
    const baseCompiled = compiledTransitions.get(transitionKey(from, targetId)) ?? synthesizeCut(from, targetId);
    // Only play-first transitions read the active slot's time. Crossfades/cuts
    // can start immediately; finishing rest first injects a visible speed-up.
    const catchUp = baseCompiled.steps[0]?.kind === 'play' ? computeCatchUpStep() : null;
    const compiled: CompiledTransition = catchUp
      ? { ...baseCompiled, steps: [catchUp, ...baseCompiled.steps] }
      : baseCompiled;

    const fromSlot = state.activeSlot;
    const toSlot = inactiveSlot(fromSlot);
    const firstStep = compiled.steps[0];

    if (firstStep?.kind === 'crossfade' || firstStep?.kind === 'cut') {
      prepareSlot(toSlot, firstStep.track);
    } else {
      // masterContinue play step (or catch-up step) runs on the active slot;
      // we still need toSlot ready for finalizeTransition to land on a loaded video.
      // Preload to-section's first stage on toSlot in parallel — otherwise the
      // post-transition swap shows a black frame while it loads.
      prepareSlot(toSlot, firstStageTrack(targetId));
    }

    state.sectionId = from;
    state.phase = 'transitioning';
    state.transition = { compiled, stepIndex: 0, stepElapsedMs: 0, fromSlot, toSlot };
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
