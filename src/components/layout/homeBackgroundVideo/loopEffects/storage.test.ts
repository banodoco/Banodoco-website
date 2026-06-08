import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOP_EFFECT_TUNING,
  DEFAULT_LOOP_MASK_SETTINGS,
} from './model';
import {
  LOOP_MASK_STORAGE_KEY,
  readLoopMaskSettingsFromStorage,
} from './storage';

const createStorage = (value: unknown) => {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);

  return {
    getItem: (key: string) => key === LOOP_MASK_STORAGE_KEY ? raw : null,
    setItem: () => undefined,
  };
};

describe('readLoopMaskSettingsFromStorage', () => {
  it('returns defaults when storage is unavailable', () => {
    expect(readLoopMaskSettingsFromStorage(null)).toEqual(DEFAULT_LOOP_MASK_SETTINGS);
  });

  it('filters unknown effects and normalizes each effect setting', () => {
    const settings = readLoopMaskSettingsFromStorage(createStorage({
      enabled: false,
      effects: ['refract', 'unknown', 'blur'],
      effectSettings: {
        refract: {
          startAmount: -20,
          peakAmount: 150,
          durationMs: 20000,
          edge: '35',
          white: null,
          fade: 'bad',
        },
      },
    }));

    expect(settings.enabled).toBe(false);
    expect(settings.effects).toEqual(['refract', 'blur']);
    expect(settings.effectSettings.refract).toEqual({
      startAmount: 0,
      peakAmount: 100,
      durationMs: 8000,
      edge: 35,
      white: 0,
      fade: DEFAULT_LOOP_EFFECT_TUNING.fade,
    });
    expect(settings.effectSettings.blur).toEqual(DEFAULT_LOOP_EFFECT_TUNING);
  });

  it('migrates legacy shared tuning to per-effect tuning', () => {
    const settings = readLoopMaskSettingsFromStorage(createStorage({
      enabled: true,
      effects: ['blur', 'flash'],
      startAmount: 12,
      peakAmount: 44,
      durationMs: 3000,
      edge: 80,
      white: 25,
      fade: 60,
    }));

    expect(settings.effectSettings.blur).toEqual({
      startAmount: 12,
      peakAmount: 44,
      durationMs: 3000,
      edge: 80,
      white: 25,
      fade: 60,
    });
    expect(settings.effectSettings.flash).toEqual(settings.effectSettings.blur);
  });

  it('falls back to defaults for malformed JSON', () => {
    expect(readLoopMaskSettingsFromStorage(createStorage('{'))).toEqual(DEFAULT_LOOP_MASK_SETTINGS);
  });
});
