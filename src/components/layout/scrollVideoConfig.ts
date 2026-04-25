export interface HomeSection {
  id: string;
  scrub: {
    start: number;
    end: number;
  };
  clip: {
    video: string;
    poster: string;
  };
}

export const HOME_SECTIONS = [
  {
    id: 'hero',
    scrub: { start: 0, end: 5 },
    clip: { video: '/W5ylOCytG00m3lqZKBml6_gXEN4DqG.mp4', poster: '/hero-poster-flipped.jpg' },
  },
  {
    id: 'community',
    scrub: { start: 7, end: 12 },
    clip: { video: '/section-videos/community.mp4', poster: '/section-videos/community-poster.jpg' },
  },
  {
    id: 'reigh',
    scrub: { start: 16.5, end: 20 },
    clip: { video: '/section-videos/reigh.mp4', poster: '/section-videos/reigh-poster.jpg' },
  },
  {
    id: 'arca-gidan',
    scrub: { start: 22, end: 24 },
    clip: { video: '/section-videos/arca-gidan.mp4', poster: '/section-videos/arca-gidan-poster.jpg' },
  },
  {
    id: 'ados',
    scrub: { start: 25, end: 29 },
    clip: { video: '/section-videos/ados.mp4', poster: '/section-videos/ados-poster.jpg' },
  },
  {
    id: 'community-projects',
    scrub: { start: 30, end: 31 },
    clip: { video: '/section-videos/ados.mp4', poster: '/section-videos/ados-poster.jpg' },
  },
  {
    id: 'ecosystem',
    scrub: { start: 31, end: 32 },
    clip: { video: '/section-videos/ecosystem.mp4', poster: '/section-videos/ecosystem-poster.jpg' },
  },
  {
    id: 'ownership',
    scrub: { start: 32.5, end: 37.5 },
    clip: { video: '/hero-part3.mp4', poster: '/section-videos/ownership-poster.jpg' },
  },
] as const satisfies readonly HomeSection[];

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id'];
type HomeSectionScrub = (typeof HOME_SECTIONS)[number]['scrub'];
type HomeSectionClip = (typeof HOME_SECTIONS)[number]['clip'];

export const SECTION_IDS = HOME_SECTIONS.map(section => section.id) as HomeSectionId[];

export const SCRUB_BY_ID = HOME_SECTIONS.reduce<Record<HomeSectionId, HomeSectionScrub>>(
  (acc, section) => {
    acc[section.id] = section.scrub;
    return acc;
  },
  {} as Record<HomeSectionId, HomeSectionScrub>
);

export const CLIP_BY_ID = HOME_SECTIONS.reduce<Record<HomeSectionId, HomeSectionClip>>(
  (acc, section) => {
    acc[section.id] = section.clip;
    return acc;
  },
  {} as Record<HomeSectionId, HomeSectionClip>
);

interface DesktopVideoPartRaw {
  src: string;
  startsAtSection: HomeSectionId | null;
}

interface DesktopVideoPart extends DesktopVideoPartRaw {
  startTime: number;
}

export const DESKTOP_VIDEO_PARTS_RAW = [
  { src: '/upscaled-h1.mp4', startsAtSection: null },
  { src: '/hero-part2.mp4', startsAtSection: 'community' },
  { src: '/hero-part3.mp4', startsAtSection: 'ownership' },
] as const satisfies readonly [DesktopVideoPartRaw, DesktopVideoPartRaw, DesktopVideoPartRaw];

const resolveDesktopVideoPart = (part: DesktopVideoPartRaw): DesktopVideoPart => {
  if (part.startsAtSection === null) {
    return { ...part, startTime: 0 };
  }

  const startTime = SCRUB_BY_ID[part.startsAtSection]?.start;
  if (startTime === undefined) {
    throw new Error(`Missing desktop video anchor section: ${part.startsAtSection}`);
  }

  return { ...part, startTime };
};

export const DESKTOP_VIDEO_PARTS = [
  resolveDesktopVideoPart(DESKTOP_VIDEO_PARTS_RAW[0]),
  resolveDesktopVideoPart(DESKTOP_VIDEO_PARTS_RAW[1]),
  resolveDesktopVideoPart(DESKTOP_VIDEO_PARTS_RAW[2]),
] as const;

export const DESKTOP_TRANSITION_1 = DESKTOP_VIDEO_PARTS[1].startTime;
export const DESKTOP_TRANSITION_2 = DESKTOP_VIDEO_PARTS[2].startTime;

export const IDLE_DELAY_MS = 500;
export const DRIFT_SPEED = 0.5;
export const MILLISECONDS_PER_SECOND = 1000;
export const MOBILE_PLAYBACK_RATE_IDLE = 0.5;
export const MOBILE_PLAYBACK_RATE_SCROLL = 2.5;
export const CROSSFADE_DURATION = 500;
export const SCROLL_IDLE_TIMEOUT = 150;
export const EASE_OUT_EXPONENT = 0.6;
export const IDLE_BONUS_DECAY_PER_SEC = 4;
export const LERP_SPEED_PER_SEC = 8;
export const LERP_SNAP_EPSILON_SEC = 0.03;
export const VIDEO_SEEK_EPSILON_SEC = 0.02;
export const SECTION_BOUNDARY_FUDGE_PX = 2;
export const INITIAL_SEEK_TIMEOUT_MS = 500;
export const VIDEO_READY_POLL_MS = 100;
export const BG_SCALE = 1.3;
export const JUMP_DEBOUNCE_MS = 200;
export const WAITING_FALLBACK_MS = 500;
export const INITIAL_PLAY_DELAY_MS = 100;
export const PLAY_RETRY_DELAY_MS = 150;
export const PLAY_RETRY_COUNT = 5;

export const preloadPostersInOrder = () => {
  let currentIndex = 0;

  const loadNext = () => {
    const section = HOME_SECTIONS[currentIndex];
    if (!section) return;

    const img = new Image();
    img.onload = () => {
      currentIndex += 1;
      loadNext();
    };
    img.onerror = () => {
      currentIndex += 1;
      loadNext();
    };
    img.src = section.clip.poster;
  };

  loadNext();
};
