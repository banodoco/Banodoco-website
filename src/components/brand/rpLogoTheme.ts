type RpLogoFont = {
  family: string;
  googleFamily?: string;
  description: string;
};

export type RpPixelBlastTheme = {
  variant: 'square' | 'circle' | 'triangle' | 'diamond';
  pixelSize: number;
  color: string;
  patternScale: number;
  patternDensity: number;
  pixelSizeJitter: number;
  speed: number;
  edgeFade: number;
  scrollDrift: {
    x: number;
    y: number;
  };
};

export type RpLogoTheme = {
  id: string;
  font: RpLogoFont;
  effect: RpPixelBlastTheme;
};

export const RP_THEME_SETTINGS = {
  crossfadeMs: 4900,
  crossfadeEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  rememberPreviousTheme: true,
  storageKey: 'banodoco-rp-logo-theme',
  crossfadeMsStorageKey: 'banodoco-rp-crossfade-ms',
  crossfadeEasingStorageKey: 'banodoco-rp-crossfade-easing',
};

// One reliable background primitive, tuned hard in different directions.
// These fonts all resolve through Google Fonts as normal web fonts; no color-font
// families or axis-heavy requests that can silently fall back in some browsers.
export const RP_LOGO_THEMES: RpLogoTheme[] = [
  {
    id: 'pixel-grid',
    font: { family: 'Sixtyfour', description: 'pixel grid' },
    effect: {
      variant: 'square',
      pixelSize: 6,
      color: '#B497CF',
      patternScale: 3,
      patternDensity: 1.2,
      pixelSizeJitter: 0.5,
      speed: 0.6,
      edgeFade: 0.25,
      scrollDrift: { x: 0.3, y: 1 },
    },
  },
  {
    id: 'chunky-pixel',
    font: { family: 'Pixelify Sans', description: 'chunky pixel' },
    effect: {
      variant: 'square',
      pixelSize: 13,
      color: '#70F0D0',
      patternScale: 1.25,
      patternDensity: 1.7,
      pixelSizeJitter: 0,
      speed: 0.18,
      edgeFade: 0.42,
      scrollDrift: { x: -0.08, y: 0.42 },
    },
  },
  {
    id: 'arcade-bitmap',
    font: { family: 'Press Start 2P', description: 'arcade bitmap' },
    effect: {
      variant: 'square',
      pixelSize: 3,
      color: '#FFB000',
      patternScale: 7.5,
      patternDensity: 0.82,
      pixelSizeJitter: 0,
      speed: 1.35,
      edgeFade: 0.08,
      scrollDrift: { x: 1.6, y: 0.22 },
    },
  },
  {
    id: 'glitch-diamond',
    font: { family: 'Rubik Glitch', description: 'glitch' },
    effect: {
      variant: 'diamond',
      pixelSize: 2,
      color: '#FF75B3',
      patternScale: 10,
      patternDensity: 0.78,
      pixelSizeJitter: 1.45,
      speed: 1.8,
      edgeFade: 0.14,
      scrollDrift: { x: 2.1, y: -0.55 },
    },
  },
  {
    id: 'rough-triangle',
    font: { family: 'Rubik Beastly', description: 'rough display' },
    effect: {
      variant: 'triangle',
      pixelSize: 15,
      color: '#C0FF72',
      patternScale: 0.9,
      patternDensity: 0.82,
      pixelSizeJitter: 1.25,
      speed: 0.16,
      edgeFade: 0.48,
      scrollDrift: { x: -0.28, y: 0.2 },
    },
  },
  {
    id: 'neon-line',
    font: { family: 'Monoton', description: 'neon line' },
    effect: {
      variant: 'circle',
      pixelSize: 3,
      color: '#FF6BD6',
      patternScale: 8.4,
      patternDensity: 0.72,
      pixelSizeJitter: 0.05,
      speed: 0.9,
      edgeFade: 0.36,
      scrollDrift: { x: 0.12, y: 2.2 },
    },
  },
  {
    id: 'inline-poster',
    font: { family: 'Fascinate Inline', description: 'inline poster' },
    effect: {
      variant: 'circle',
      pixelSize: 18,
      color: '#F6D365',
      patternScale: 0.7,
      patternDensity: 0.75,
      pixelSizeJitter: 0.28,
      speed: 0.12,
      edgeFade: 0.5,
      scrollDrift: { x: -0.2, y: 0.18 },
    },
  },
  {
    id: 'hand-cut-poster',
    font: { family: 'Frijole', description: 'hand-cut poster' },
    effect: {
      variant: 'triangle',
      pixelSize: 6,
      color: '#FF7A59',
      patternScale: 4.6,
      patternDensity: 0.76,
      pixelSizeJitter: 1.7,
      speed: 0.68,
      edgeFade: 0.42,
      scrollDrift: { x: 1.45, y: -0.8 },
    },
  },
  {
    id: 'drippy-display',
    font: { family: 'Creepster', description: 'drippy display' },
    effect: {
      variant: 'circle',
      pixelSize: 10,
      color: '#8FFF7A',
      patternScale: 1.1,
      patternDensity: 1.85,
      pixelSizeJitter: 1.6,
      speed: 0.36,
      edgeFade: 0.55,
      scrollDrift: { x: -0.75, y: 0.9 },
    },
  },
  {
    id: 'splintered-display',
    font: { family: 'Eater', description: 'splintered display' },
    effect: {
      variant: 'triangle',
      pixelSize: 2,
      color: '#FF8587',
      patternScale: 9.2,
      patternDensity: 1.35,
      pixelSizeJitter: 1.15,
      speed: 1.2,
      edgeFade: 0.22,
      scrollDrift: { x: 1.2, y: 1.45 },
    },
  },
];

const getStoredThemeId = () => {
  if (!RP_THEME_SETTINGS.rememberPreviousTheme || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(RP_THEME_SETTINGS.storageKey);
  } catch {
    return null;
  }
};

const storeThemeId = (themeId: string) => {
  if (!RP_THEME_SETTINGS.rememberPreviousTheme || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RP_THEME_SETTINGS.storageKey, themeId);
  } catch {
    // Storage is only used for a nicer transition; failing closed is fine.
  }
};

const pickNextTheme = (previousThemeId: string | null) => {
  const availableThemes =
    RP_LOGO_THEMES.length > 1
      ? RP_LOGO_THEMES.filter((theme) => theme.id !== previousThemeId)
      : RP_LOGO_THEMES;

  return availableThemes[Math.floor(Math.random() * availableThemes.length)] ?? RP_LOGO_THEMES[0];
};

const previousThemeId = getStoredThemeId();

export const previousRpLogoTheme =
  RP_LOGO_THEMES.find((theme) => theme.id === previousThemeId) ?? null;

export const selectedRpLogoTheme = pickNextTheme(previousThemeId);

storeThemeId(selectedRpLogoTheme.id);

export const getRpLogoFontUrl = (theme: RpLogoTheme = selectedRpLogoTheme) =>
  `https://fonts.googleapis.com/css2?family=${(theme.font.googleFamily ?? theme.font.family).replaceAll(' ', '+')}&display=swap`;
