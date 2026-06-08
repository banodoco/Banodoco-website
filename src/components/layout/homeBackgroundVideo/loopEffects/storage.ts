import {
  DEFAULT_LOOP_EFFECT_TUNING,
  DEFAULT_LOOP_MASK_SETTINGS,
  LOOP_EFFECT_IDS,
  LOOP_EFFECT_TUNING_BOUNDS,
  type LoopEffectTuning,
  type LoopHideTechnique,
  type LoopMaskSettings,
} from './model';

export const LOOP_MASK_STORAGE_KEY = 'banodoco-loop-mask-settings';
export const LOOP_CONTROLS_OPEN_STORAGE_KEY = 'banodoco-loop-controls-open';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const getStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const clampStoredNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

export const normalizeLoopEffectTuning = (value: unknown): LoopEffectTuning => {
  const parsed = value && typeof value === 'object'
    ? value as Partial<LoopEffectTuning>
    : {};

  return Object.fromEntries(
    (Object.keys(LOOP_EFFECT_TUNING_BOUNDS) as Array<keyof LoopEffectTuning>).map(key => {
      const bounds = LOOP_EFFECT_TUNING_BOUNDS[key];
      return [
        key,
        clampStoredNumber(
          parsed[key],
          DEFAULT_LOOP_EFFECT_TUNING[key],
          bounds.min,
          bounds.max
        ),
      ];
    })
  ) as LoopEffectTuning;
};

export const readLoopMaskSettingsFromStorage = (
  storage: StorageLike | null
): LoopMaskSettings => {
  if (!storage) return DEFAULT_LOOP_MASK_SETTINGS;

  try {
    const raw = storage.getItem(LOOP_MASK_STORAGE_KEY);
    if (!raw) return DEFAULT_LOOP_MASK_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<LoopMaskSettings & LoopEffectTuning>;
    const knownEffects = new Set<LoopHideTechnique>(LOOP_EFFECT_IDS);
    const effects = Array.isArray(parsed.effects)
      ? parsed.effects.filter((effect): effect is LoopHideTechnique => knownEffects.has(effect as LoopHideTechnique))
      : DEFAULT_LOOP_MASK_SETTINGS.effects;
    const legacySharedTuning = normalizeLoopEffectTuning(parsed);
    const effectSettings = Object.fromEntries(
      LOOP_EFFECT_IDS.map(effect => [
        effect,
        normalizeLoopEffectTuning(parsed.effectSettings?.[effect] ?? legacySharedTuning),
      ])
    ) as Record<LoopHideTechnique, LoopEffectTuning>;

    return {
      enabled: typeof parsed.enabled === 'boolean'
        ? parsed.enabled
        : DEFAULT_LOOP_MASK_SETTINGS.enabled,
      effects,
      effectSettings,
    };
  } catch {
    return DEFAULT_LOOP_MASK_SETTINGS;
  }
};

export const getStoredLoopMaskSettings = () =>
  readLoopMaskSettingsFromStorage(getStorage());

export const getStoredLoopControlsOpen = () => {
  try {
    return getStorage()?.getItem(LOOP_CONTROLS_OPEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeLoopMaskSettings = (settings: LoopMaskSettings) => {
  try {
    getStorage()?.setItem(LOOP_MASK_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The controls are best-effort tuning state.
  }
};

export const writeLoopControlsOpen = (open: boolean) => {
  try {
    getStorage()?.setItem(LOOP_CONTROLS_OPEN_STORAGE_KEY, String(open));
  } catch {
    // The controls are best-effort tuning state.
  }
};
