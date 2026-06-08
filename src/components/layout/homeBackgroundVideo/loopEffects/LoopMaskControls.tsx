import {
  DEFAULT_LOOP_EFFECT_TUNING,
  DEFAULT_LOOP_MASK_SETTINGS,
  LOOP_EFFECTS,
  LOOP_EFFECT_TUNING_BOUNDS,
  type LoopEffectTuning,
  type LoopHideTechnique,
  type LoopMaskSettings,
} from './model';

type LoopMaskControlsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: LoopMaskSettings;
  onSettingsChange: (settings: LoopMaskSettings) => void;
  onToggleEffect: (effect: LoopHideTechnique) => void;
  onUpdateEffectTuning: <Key extends keyof LoopEffectTuning>(
    effect: LoopHideTechnique,
    key: Key,
    value: LoopEffectTuning[Key]
  ) => void;
  onPreview: () => void;
};

export const LoopMaskControls = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onToggleEffect,
  onUpdateEffectTuning,
  onPreview,
}: LoopMaskControlsProps) => {
  const getEffectTuning = (effect: LoopHideTechnique) => (
    settings.effectSettings[effect] ?? DEFAULT_LOOP_EFFECT_TUNING
  );
  const tuningKeys = Object.keys(LOOP_EFFECT_TUNING_BOUNDS) as Array<keyof LoopEffectTuning>;

  return (
    <div className="fixed bottom-4 left-4 z-[80] w-[min(22rem,calc(100vw-2rem))] text-white">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition hover:bg-black/75"
      >
        Loop transition controls
      </button>

      {open && (
        <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-white/15 bg-black/75 p-3 text-xs shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-semibold">Loop disguise</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={event => onSettingsChange({ ...settings, enabled: event.target.checked })}
              />
              Enabled
            </label>
          </div>

          <div className="space-y-2">
            {LOOP_EFFECTS.map(effect => (
              <details
                key={effect.id}
                open={settings.effects.includes(effect.id)}
                className={[
                  'rounded-md border bg-white/[0.04] px-2 py-1.5',
                  settings.effects.includes(effect.id)
                    ? 'border-orange-300/70 shadow-[0_0_0_1px_rgba(251,146,60,0.18)]'
                    : 'border-white/10',
                ].join(' ')}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.effects.includes(effect.id)}
                      onChange={() => onToggleEffect(effect.id)}
                      onClick={event => event.stopPropagation()}
                    />
                    <span className="font-medium">{effect.label}</span>
                  </label>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-white/50">
                    {settings.effects.includes(effect.id) ? 'On' : 'Off'}
                  </span>
                </summary>

                <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                  {tuningKeys.map(key => {
                    const bounds = LOOP_EFFECT_TUNING_BOUNDS[key];
                    const tuning = getEffectTuning(effect.id);

                    return (
                      <label key={key} className="block">
                        <span className="mb-1 flex justify-between">
                          <span>{bounds.label}</span>
                          <span>{tuning[key]}</span>
                        </span>
                        <input
                          type="range"
                          min={bounds.min}
                          max={bounds.max}
                          step={bounds.step}
                          value={tuning[key]}
                          onChange={event => onUpdateEffectTuning(
                            effect.id,
                            key,
                            Number(event.target.value)
                          )}
                          className="w-full"
                        />
                      </label>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onPreview}
              className="rounded-md bg-white px-3 py-1.5 font-medium text-black"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => onSettingsChange(DEFAULT_LOOP_MASK_SETTINGS)}
              className="rounded-md border border-white/15 px-3 py-1.5"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
