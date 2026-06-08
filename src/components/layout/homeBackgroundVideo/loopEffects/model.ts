export type LoopHideTechnique =
  | 'veil'
  | 'blur'
  | 'glitch'
  | 'shutter'
  | 'flash'
  | 'fade'
  | 'bloom'
  | 'focus'
  | 'leak'
  | 'drift'
  | 'refract'
  | 'heat'
  | 'prism';

export type LoopEffectTuning = {
  startAmount: number;
  peakAmount: number;
  durationMs: number;
  edge: number;
  white: number;
  fade: number;
};

export type LoopMaskSettings = {
  enabled: boolean;
  effects: LoopHideTechnique[];
  effectSettings: Partial<Record<LoopHideTechnique, LoopEffectTuning>>;
};

export const LOOP_EFFECTS: { id: LoopHideTechnique; label: string; videoClass?: string }[] = [
  { id: 'veil', label: 'Veil' },
  { id: 'blur', label: 'Blur' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'shutter', label: 'Shutter' },
  { id: 'flash', label: 'Flash' },
  { id: 'fade', label: 'Fade', videoClass: 'is-loop-video-fading' },
  { id: 'bloom', label: 'Bloom', videoClass: 'is-loop-video-blooming' },
  { id: 'focus', label: 'Focus', videoClass: 'is-loop-video-focusing' },
  { id: 'leak', label: 'Leak', videoClass: 'is-loop-video-leaking' },
  { id: 'drift', label: 'Drift', videoClass: 'is-loop-video-drifting' },
  { id: 'refract', label: 'Refract', videoClass: 'is-loop-video-refracting' },
  { id: 'heat', label: 'Heat', videoClass: 'is-loop-video-heating' },
  { id: 'prism', label: 'Prism', videoClass: 'is-loop-video-prisming' },
];

export const LOOP_EFFECT_IDS = LOOP_EFFECTS.map(effect => effect.id);

export const DEFAULT_LOOP_EFFECT_TUNING: LoopEffectTuning = {
  startAmount: 7,
  peakAmount: 23,
  durationMs: 4230,
  edge: 95,
  white: 46,
  fade: 53,
};

export const DEFAULT_LOOP_MASK_SETTINGS: LoopMaskSettings = {
  enabled: true,
  effects: ['refract'],
  effectSettings: {
    refract: DEFAULT_LOOP_EFFECT_TUNING,
  },
};

export const LOOP_EFFECT_TUNING_BOUNDS = {
  durationMs: { min: 300, max: 8000, step: 10, label: 'Duration' },
  startAmount: { min: 0, max: 100, step: 1, label: 'Start' },
  peakAmount: { min: 0, max: 100, step: 1, label: 'Peak' },
  edge: { min: 0, max: 100, step: 1, label: 'Edge' },
  white: { min: 0, max: 100, step: 1, label: 'White' },
  fade: { min: 0, max: 100, step: 1, label: 'Fade' },
} satisfies Record<keyof LoopEffectTuning, {
  min: number;
  max: number;
  step: number;
  label: string;
}>;
