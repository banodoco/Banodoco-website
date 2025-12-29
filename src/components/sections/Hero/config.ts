// Desktop-only styles with clip path and masks
export const desktopMediaStyles = {
  clipPath: 'inset(15px 81px 15px 86px round 8px)',
  maskImage: `
    linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent),
    linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)
  `,
  maskComposite: 'intersect' as const,
  WebkitMaskImage: `
    linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent),
    linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)
  `,
  WebkitMaskComposite: 'source-in' as const,
};

export const HERO_VIDEO_SRC_DESKTOP = '/hero-desktop.mp4';
export const HERO_VIDEO_SRC_MOBILE = '/hero-mobile.mp4';
export const HERO_POSTER_SRC = '/hero-poster.jpg';
export const REWIND_SOUND_SRC = '/Rewind Sound Effect.mp3';
export const REWIND_DURATION_MS = 5000;
export const PLAYBACK_RATE = 0.75;

