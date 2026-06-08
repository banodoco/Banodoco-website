import type {
  CompiledTransition,
  Section,
  Track,
  Transition,
} from './types';
import { transitionKey } from './types';
import {
  getEntryStage,
  getJumpStage,
  getReverseEntryStage,
  getSettledStage,
} from './sectionStages';

const EPSILON = 0.000001;
const DEFAULT_REVERSE_CROSSFADE_MS = 600;

const clampTime = (value: number) => Math.max(0, Number(value.toFixed(6)));

const playTrack = (
  src: string,
  startAt: number,
  endAt: number,
  speed = 1,
  speedEnd?: number
): Track => ({
  src,
  startAt: clampTime(startAt),
  endAt: clampTime(endAt),
  mode: speedEnd === undefined
    ? { kind: 'play', speed }
    : { kind: 'play', speed, speedEnd },
});

/**
 * Compile a list of transitions into per-key step plans the engine can run.
 *
 * `transitions` and `sections` are passed together so the compiler can look up
 * each transition's destination first-stage track. The previous version of
 * this function relied on a module-level WeakMap to associate transitions with
 * their sections, which made the API harder to use outside its original site.
 *
 * For `masterContinue` transitions, all the page-specific data (master time
 * range, chunk lookup) rides on the transition's spec — see Transition's
 * comment block in `./types`. The compiler stays page-agnostic.
 */
export const compileTransitions = (
  transitions: readonly Transition[],
  sections: readonly Section[]
): Map<string, CompiledTransition> => {
  const sectionById = new Map(sections.map(section => [section.id, section]));
  const compiled = new Map<string, CompiledTransition>();

  transitions.forEach(transition => {
    const key = transitionKey(transition.from, transition.to);
    const fromSection = sectionById.get(transition.from);
    const toSection = sectionById.get(transition.to);

    if (!fromSection) {
      throw new Error(`Missing source section for transition ${key}`);
    }

    if (!toSection) {
      throw new Error(`Missing target section for transition ${key}`);
    }

    const fromSettledTrack = getSettledStage(fromSection).track;
    const reverseEntryTrack = getReverseEntryStage(fromSection).track;
    const entryTrack = getEntryStage(toSection).track;
    const jumpTrack = getJumpStage(toSection).track;

    const reverseDurationMs = transition.spec.kind === 'crossfade'
      ? transition.spec.durationMs
      : DEFAULT_REVERSE_CROSSFADE_MS;
    const setCompiled = (compiledTransition: CompiledTransition) => {
      compiled.set(key, compiledTransition);

      const reverseKey = transitionKey(transition.to, transition.from);
      if (!compiled.has(reverseKey)) {
        compiled.set(reverseKey, {
          from: transition.to,
          to: transition.from,
          steps: [
            {
              kind: 'crossfade',
              fromSlot: 'active',
              toSlot: 'inactive',
              track: reverseEntryTrack,
              durationMs: reverseDurationMs,
            },
          ],
        });
      }
    };

    if (transition.spec.kind === 'cut') {
      setCompiled({
        from: transition.from,
        to: transition.to,
        steps: [{ kind: 'cut', toSlot: 'inactive', track: jumpTrack, durationMs: 0 }],
      });
      return;
    }

    if (transition.spec.kind === 'crossfade') {
      setCompiled({
        from: transition.from,
        to: transition.to,
        steps: [
          {
            kind: 'crossfade',
            fromSlot: 'active',
            toSlot: 'inactive',
            track: entryTrack,
            durationMs: transition.spec.durationMs,
          },
        ],
      });
      return;
    }

    // masterContinue: play a master-time range, possibly split across chunks.
    const { masterStart, masterEnd, durationMs, resolveChunk, resolveChunkEnd, speedStart, speedEnd } = transition.spec;
    const distance = masterEnd - masterStart;

    if (distance <= EPSILON) {
      throw new Error(`masterContinue transition ${key} must have non-zero distance`);
    }

    const hasRamp = speedStart !== undefined && speedEnd !== undefined;
    // With a ramp, durationMs is derived so the linear-speed integral exactly
    // covers `distance`. Without a ramp, fall back to constant speed.
    const effectiveDurationMs = hasRamp
      ? (distance / ((speedStart! + speedEnd!) / 2)) * 1000
      : durationMs;
    const startSpeed = hasRamp ? speedStart! : distance / (durationMs / 1000);
    const rampEnd = hasRamp ? speedEnd! : undefined;
    const startPoint = resolveChunk(masterStart, 'in');
    const endPoint = resolveChunk(masterEnd, 'out');
    const isOriginOverride = fromSettledTrack.src !== startPoint.src;
    const isDestinationOverride = entryTrack.src !== endPoint.src;
    const hasOverride = isOriginOverride || isDestinationOverride;
    const hasSpeedRampFlag = speedStart !== undefined || speedEnd !== undefined;
    const isChunkCross = startPoint.src !== endPoint.src;
    const headMs = isOriginOverride ? (transition.spec.headCrossfadeMs ?? 500) : 0;
    const tailMs = isDestinationOverride ? (transition.spec.tailCrossfadeMs ?? 500) : 0;

    if (hasOverride && hasSpeedRampFlag) {
      throw new Error(
        `masterContinue transition ${key} cannot use endpoint overrides with a speed ramp`
      );
    }

    if (hasOverride && isChunkCross) {
      throw new Error(
        `masterContinue transition ${key} cannot use endpoint overrides across a chunk boundary`
      );
    }

    if (hasOverride && headMs + tailMs >= durationMs - EPSILON) {
      throw new Error(
        `masterContinue transition ${key} endpoint override crossfades leave no positive play duration`
      );
    }

    if (startPoint.src === endPoint.src && !hasOverride) {
      setCompiled({
        from: transition.from,
        to: transition.to,
        steps: [
          {
            kind: 'play',
            slot: 'active',
            track: playTrack(startPoint.src, startPoint.t, endPoint.t, startSpeed, rampEnd),
            durationMs: effectiveDurationMs,
          },
        ],
      });
      return;
    }

    if (hasOverride) {
      const speed = distance / (durationMs / 1000);
      const headDistance = (headMs / 1000) * speed;
      const tailDistance = (tailMs / 1000) * speed;
      const playDurationMs = durationMs - headMs - tailMs;

      // Timing invariant: total wall-clock stays durationMs and master speed
      // stays distance/durationMs. Head/tail crossfades overlap with master
      // playback rather than extending the transition.
      if (!isOriginOverride) {
        setCompiled({
          from: transition.from,
          to: transition.to,
          steps: [
            {
              kind: 'play',
              slot: 'active',
              track: playTrack(startPoint.src, startPoint.t, endPoint.t - tailDistance, speed),
              durationMs: durationMs - tailMs,
            },
            {
              kind: 'crossfade',
              fromSlot: 'active',
              toSlot: 'inactive',
              track: entryTrack,
              durationMs: tailMs,
            },
          ],
        });
        return;
      }

      const masterHeadTrack = playTrack(
        startPoint.src,
        startPoint.t,
        startPoint.t + headDistance,
        speed
      );

      if (!isDestinationOverride) {
        setCompiled({
          from: transition.from,
          to: transition.to,
          steps: [
            {
              kind: 'crossfade',
              fromSlot: 'active',
              toSlot: 'inactive',
              track: masterHeadTrack,
              durationMs: headMs,
            },
            {
              kind: 'play',
              slot: 'inactive',
              track: playTrack(startPoint.src, startPoint.t + headDistance, endPoint.t, speed),
              durationMs: durationMs - headMs,
            },
          ],
        });
        return;
      }

      setCompiled({
        from: transition.from,
        to: transition.to,
        steps: [
          {
            kind: 'crossfade',
            fromSlot: 'active',
            toSlot: 'inactive',
            track: masterHeadTrack,
            durationMs: headMs,
          },
          {
            kind: 'play',
            slot: 'inactive',
            track: playTrack(
              startPoint.src,
              startPoint.t + headDistance,
              endPoint.t - tailDistance,
              speed
            ),
            durationMs: playDurationMs,
          },
          {
            kind: 'crossfade',
            fromSlot: 'inactive',
            toSlot: 'active',
            track: entryTrack,
            durationMs: tailMs,
          },
        ],
      });
      return;
    }

    if (hasRamp) {
      throw new Error(
        `masterContinue transition ${key} cannot use a speed ramp across a chunk boundary`
      );
    }

    // Cross-chunk: need to split into a play step on the start chunk and a
    // crossfade step onto the end chunk. Requires the master-time end of the
    // start chunk to compute the split. If the caller didn't supply
    // `resolveChunkEnd`, we can't compile this — pages that never cross chunks
    // can omit it; pages that do must provide it.
    if (!resolveChunkEnd) {
      throw new Error(
        `masterContinue transition ${key} crosses a chunk boundary but no resolveChunkEnd was provided`
      );
    }

    const startChunkMasterEnd = resolveChunkEnd(masterStart);
    const firstSegmentDistance = startChunkMasterEnd - masterStart;
    const firstDurationMs = (firstSegmentDistance / distance) * durationMs;
    const secondDurationMs = durationMs - firstDurationMs;
    // The start chunk plays from startPoint.t to its end. We can derive the
    // chunk-local end by asking resolveChunk for the chunk's master-end with
    // direction 'out' — that lands us on the same chunk's last frame.
    const startChunkEndPoint = resolveChunk(startChunkMasterEnd, 'out');

    setCompiled({
      from: transition.from,
      to: transition.to,
      steps: [
        {
          kind: 'play',
          slot: 'active',
          track: playTrack(startPoint.src, startPoint.t, startChunkEndPoint.t, startSpeed),
          durationMs: firstDurationMs,
        },
        {
          kind: 'crossfade',
          fromSlot: 'active',
          toSlot: 'inactive',
          track: playTrack(endPoint.src, 0, endPoint.t, startSpeed),
          durationMs: secondDurationMs,
        },
      ],
    });
  });

  return compiled;
};
