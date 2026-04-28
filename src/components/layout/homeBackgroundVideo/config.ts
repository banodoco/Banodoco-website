import type { Section, Stage, Track, Transition } from '../scrollVideoEngine';

const DESKTOP_CHUNKS = [
  { src: '/8zCN-chunks/desktop-1.mp4', masterStart: 0, masterEnd: 13 },
  { src: '/8zCN-chunks/desktop-2.mp4', masterStart: 13, masterEnd: 51 },
  { src: '/8zCN-chunks/desktop-3.mp4', masterStart: 51, masterEnd: 58.776 },
] as const;

const EPSILON = 0.000001;
const DESKTOP_TRANSITION_DURATION_MS = 600;
const MOBILE_TRANSITION_DURATION_MS = 500;
const OVERRIDE_DURATION = 8.828125;

type MasterContinueOptions = {
  headCrossfadeMs?: number;
  tailCrossfadeMs?: number;
};

export const SECTION_IDS = [
  'hero',
  'community',
  'reigh',
  'arca-gidan',
  'ados',
  'community-projects',
  'ecosystem',
  'ownership',
] as const;

export type HomeSectionId = (typeof SECTION_IDS)[number];

export const masterToChunk = (
  t: number,
  direction: 'in' | 'out'
): { src: string; t: number } => {
  const chunk = DESKTOP_CHUNKS.find((candidate, index) => {
    const isFirst = index === 0;
    const isLast = index === DESKTOP_CHUNKS.length - 1;
    const afterStart = direction === 'in'
      ? t >= candidate.masterStart - EPSILON
      : isFirst
        ? t >= candidate.masterStart - EPSILON
        : t > candidate.masterStart + EPSILON;
    const beforeEnd = direction === 'out'
      ? t <= candidate.masterEnd + EPSILON
      : isLast
        ? t <= candidate.masterEnd + EPSILON
        : t < candidate.masterEnd - EPSILON;

    return afterStart && beforeEnd;
  });

  if (!chunk) {
    throw new Error(`Master time ${t} is outside the desktop chunk range`);
  }

  return { src: chunk.src, t: clampTime(t - chunk.masterStart) };
};

// Returns the master-time end of whichever chunk contains `masterStart`.
// Used by the engine's compileTransitions to split a cross-chunk masterContinue
// into a play step (on the start chunk) and a crossfade (onto the end chunk).
const masterChunkEnd = (masterStart: number): number => {
  const chunk = DESKTOP_CHUNKS.find((candidate, index) => {
    const isFirst = index === 0;
    const isLast = index === DESKTOP_CHUNKS.length - 1;
    const afterStart = isFirst
      ? masterStart >= candidate.masterStart - EPSILON
      : masterStart > candidate.masterStart + EPSILON;
    const beforeEnd = isLast
      ? masterStart <= candidate.masterEnd + EPSILON
      : masterStart < candidate.masterEnd - EPSILON;
    return afterStart && beforeEnd;
  });
  if (!chunk) {
    throw new Error(`Master time ${masterStart} is outside the desktop chunk range`);
  }
  return chunk.masterEnd;
};

const clampTime = (value: number) => Math.max(0, Number(value.toFixed(6)));

const playTrack = (src: string, startAt: number, endAt: number, speed = 1): Track => ({
  src,
  startAt: clampTime(startAt),
  endAt: clampTime(endAt),
  mode: { kind: 'play', speed },
});

const freezeTrack = (src: string, at: number): Track => ({
  src,
  startAt: clampTime(at),
  endAt: clampTime(at),
  mode: { kind: 'freeze' },
});

export const playFromMaster = (start: number, end: number, speed = 1): Track => {
  const startPoint = masterToChunk(start, 'in');
  const endPoint = masterToChunk(end, 'out');

  if (startPoint.src !== endPoint.src) {
    throw new Error(`Section rest track cannot cross desktop chunks: ${start}->${end}`);
  }

  return playTrack(startPoint.src, startPoint.t, endPoint.t, speed);
};

export const freezeFromMaster = (at: number, direction: 'in' | 'out' = 'out'): Track => {
  const point = masterToChunk(at, direction);
  return freezeTrack(point.src, point.t);
};

export const playFromFile = (
  src: string,
  startAt = 0,
  endAt?: number,
  opts: { loop?: boolean } = {}
): Stage[] => {
  if (endAt === undefined) {
    throw new Error(`playFromFile(${src}) requires an endAt time`);
  }

  const clampedStart = clampTime(startAt);
  const clampedEnd = clampTime(endAt);

  if (opts.loop) {
    return [
      {
        track: {
          src,
          startAt: clampedStart,
          endAt: clampedEnd,
          mode: { kind: 'loop' },
        },
      },
    ];
  }

  return [
    { track: playTrack(src, clampedStart, clampedEnd) },
    { track: freezeTrack(src, clampedEnd) },
  ];
};

export const DESKTOP_SECTIONS = [
  {
    id: 'hero',
    stages: [
      { track: playFromMaster(0, 7.5) },
      { track: freezeFromMaster(7.5) },
    ],
  },
  {
    id: 'community',
    stages: playFromFile('/media_d516fd93.mp4', 0, OVERRIDE_DURATION),
  },
  {
    id: 'reigh',
    stages: [
      { track: playFromMaster(16, 22) },
      { track: freezeFromMaster(22) },
    ],
  },
  {
    id: 'arca-gidan',
    stages: [
      { track: playFromMaster(24, 29.75, 0.5) },
      { track: freezeFromMaster(29.75) },
    ],
  },
  {
    id: 'ados',
    stages: [
      { track: playFromMaster(35, 39.6, 0.6) },
      { track: freezeFromMaster(39.6) },
    ],
  },
  {
    id: 'community-projects',
    stages: [
      { track: playFromMaster(44, 47) },
      { track: freezeFromMaster(47) },
    ],
  },
  {
    id: 'ecosystem',
    stages: [
      { track: playFromMaster(50, 51) },
      { track: freezeFromMaster(51) },
    ],
  },
  {
    id: 'ownership',
    stages: [
      { track: playFromMaster(51, 58.776) },
      { track: freezeFromMaster(58.776) },
    ],
  },
] as const satisfies readonly Section[];

/*
 * Mobile clip measurements from ffprobe:
 * `ffprobe -v error -show_entries format=duration -of csv=p=0`.
 * Chunk-local rest values are computed from measured duration plus old
 * master-source rest/freeze metadata, so they do not assume `0 = driftStart`.
 *
 * { id: 'hero', duration: 7.5, restStartChunkLocal: 0, restEndChunkLocal: 7.5, freezeChunkLocal: 7.5 }
 * { id: 'community', duration: 5.5, restStartChunkLocal: 5.5, restEndChunkLocal: 5.5, freezeChunkLocal: 5.5 }
 * { id: 'reigh', duration: 9, restStartChunkLocal: 3, restEndChunkLocal: 9, freezeChunkLocal: 9 }
 * { id: 'arca-gidan', duration: 8.5, restStartChunkLocal: 2, restEndChunkLocal: 8.5, freezeChunkLocal: 8.5 }
 * { id: 'ados', duration: 9, restStartChunkLocal: 4.5, restEndChunkLocal: 9, freezeChunkLocal: 9 }
 * { id: 'community-projects', duration: 7.5, restStartChunkLocal: 4.5, restEndChunkLocal: 7.5, freezeChunkLocal: 7.5 }
 * { id: 'ecosystem', duration: 4, restStartChunkLocal: 3, restEndChunkLocal: 4, freezeChunkLocal: 4 }
 * { id: 'ownership', duration: 7.78125, restStartChunkLocal: 0.00525, restEndChunkLocal: 7.78125, freezeChunkLocal: 7.78125 }
 */
const mobileTrack = (
  id: HomeSectionId,
  restStartChunkLocal: number,
  restEndChunkLocal: number,
  freezeChunkLocal: number
) => {
  const src = `/8zCN-chunks/mobile-${id}.mp4`;

  if (Math.abs(restEndChunkLocal - restStartChunkLocal) <= EPSILON) {
    return [{ track: freezeTrack(src, freezeChunkLocal) }];
  }

  return [
    { track: playTrack(src, restStartChunkLocal, restEndChunkLocal) },
    { track: freezeTrack(src, freezeChunkLocal) },
  ];
};

export const MOBILE_SECTIONS = [
  { id: 'hero', stages: mobileTrack('hero', 0, 7.5, 7.5) },
  { id: 'community', stages: mobileTrack('community', 5.5, 5.5, 5.5) },
  { id: 'reigh', stages: mobileTrack('reigh', 3, 9, 9) },
  { id: 'arca-gidan', stages: mobileTrack('arca-gidan', 2, 8.5, 8.5) },
  { id: 'ados', stages: mobileTrack('ados', 4.5, 9, 9) },
  { id: 'community-projects', stages: mobileTrack('community-projects', 4.5, 7.5, 7.5) },
  { id: 'ecosystem', stages: mobileTrack('ecosystem', 3, 4, 4) },
  { id: 'ownership', stages: mobileTrack('ownership', 0.00525, 7.78125, 7.78125) },
] as const satisfies readonly Section[];

// Helper: each masterContinue transition needs to know the master-time range
// it's playing plus how to resolve those times to actual chunk files. We bake
// `resolveChunk` and `resolveChunkEnd` in here so the engine's compiler stays
// page-agnostic.
const masterContinue = (
  from: string,
  to: string,
  durationMs: number,
  masterStart: number,
  masterEnd: number,
  opts?: MasterContinueOptions
): Transition => ({
  from,
  to,
  spec: {
    kind: 'masterContinue',
    durationMs,
    masterStart,
    masterEnd,
    resolveChunk: masterToChunk,
    resolveChunkEnd: masterChunkEnd,
    ...(opts ?? {}),
  },
});

// masterContinue with a linear speed ramp. durationMs is computed so the
// integral of the ramp exactly covers (masterEnd - masterStart).
const masterContinueRamp = (
  from: string,
  to: string,
  speedStart: number,
  speedEnd: number,
  masterStart: number,
  masterEnd: number,
  opts?: MasterContinueOptions
): Transition => {
  const distance = masterEnd - masterStart;
  const avgSpeed = (speedStart + speedEnd) / 2;
  const durationMs = (distance / avgSpeed) * 1000;
  return {
    from,
    to,
    spec: {
      kind: 'masterContinue',
      durationMs,
      masterStart,
      masterEnd,
      resolveChunk: masterToChunk,
      resolveChunkEnd: masterChunkEnd,
      speedStart,
      speedEnd,
      ...(opts ?? {}),
    },
  };
};

export const DESKTOP_TRANSITIONS = [
  masterContinue('hero', 'community', 5500, 7.5, 13),
  masterContinue('community', 'reigh', 2500, 14, 16),
  masterContinue('reigh', 'arca-gidan', 1333, 22, 24),
  masterContinue('arca-gidan', 'ados', 2000, 29.75, 35),
  masterContinueRamp('ados', 'community-projects', 5, 1, 39.6, 44),
  masterContinue('community-projects', 'ecosystem', DESKTOP_TRANSITION_DURATION_MS, 47, 50),
  { from: 'ecosystem', to: 'ownership', spec: { kind: 'cut' } },
] as const satisfies readonly Transition[];

export const MOBILE_TRANSITIONS = [
  { from: 'hero', to: 'community', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
  { from: 'community', to: 'reigh', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
  { from: 'reigh', to: 'arca-gidan', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
  { from: 'arca-gidan', to: 'ados', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
  { from: 'ados', to: 'community-projects', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
  { from: 'community-projects', to: 'ecosystem', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
  { from: 'ecosystem', to: 'ownership', spec: { kind: 'crossfade', durationMs: MOBILE_TRANSITION_DURATION_MS } },
] as const satisfies readonly Transition[];
