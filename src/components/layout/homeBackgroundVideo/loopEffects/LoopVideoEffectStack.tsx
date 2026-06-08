import type { ReactNode, RefObject } from 'react';
import {
  DEFAULT_LOOP_EFFECT_TUNING,
  LOOP_EFFECTS,
  type LoopEffectTuning,
  type LoopHideTechnique,
} from './model';
import { compileLoopMaskStyle } from './compileStyles';

type LoopVideoEffectStackProps = {
  slotARef: RefObject<HTMLVideoElement | null>;
  slotBRef: RefObject<HTMLVideoElement | null>;
  loopMaskEnabled: boolean;
  loopMaskEffects: LoopHideTechnique[];
  activeLoopMaskEffects: Partial<Record<LoopHideTechnique, boolean>>;
  getEffectTuning: (effect: LoopHideTechnique) => LoopEffectTuning;
  jumpWarpActive: boolean;
  jumpWarpPreset: string;
  posterSrc: string;
  onLoadedData: () => void;
};

export const LoopVideoEffectStack = ({
  slotARef,
  slotBRef,
  loopMaskEnabled,
  loopMaskEffects,
  activeLoopMaskEffects,
  getEffectTuning,
  jumpWarpActive,
  jumpWarpPreset,
  posterSrc,
  onLoadedData,
}: LoopVideoEffectStackProps) => {
  const videoLayerEffects = LOOP_EFFECTS.filter(effect => effect.videoClass);
  const videoSlotContent = (
    <>
      <video
        ref={slotARef}
        muted
        playsInline
        preload="auto"
        poster={posterSrc}
        onLoadedData={onLoadedData}
        className="absolute inset-0 h-full w-full object-cover opacity-100"
        style={{ willChange: 'opacity', backfaceVisibility: 'hidden' }}
      />
      <video
        ref={slotBRef}
        muted
        playsInline
        preload="auto"
        poster={posterSrc}
        onLoadedData={onLoadedData}
        className="absolute inset-0 h-full w-full object-cover opacity-0"
        style={{ willChange: 'opacity', backfaceVisibility: 'hidden' }}
      />
    </>
  );
  const layeredVideoSlots = videoLayerEffects.reduceRight<ReactNode>((children, effect) => {
    const isEnabled = loopMaskEffects.includes(effect.id);

    return (
      <div
        className={[
          'home-video-slots',
          isEnabled && activeLoopMaskEffects[effect.id] && effect.videoClass ? effect.videoClass : '',
        ].join(' ')}
        style={compileLoopMaskStyle(getEffectTuning(effect.id))}
      >
        {children}
      </div>
    );
  }, videoSlotContent);

  return (
    <>
      <div
        className={[
          'home-video-slots',
          jumpWarpActive ? 'is-jump-warping' : '',
          jumpWarpActive ? `jump-warp--${jumpWarpPreset}` : '',
        ].join(' ')}
        style={compileLoopMaskStyle(DEFAULT_LOOP_EFFECT_TUNING)}
      >
        {layeredVideoSlots}
      </div>
      {loopMaskEffects.map(effect => (
        <div
          key={effect}
          className={[
            'loop-seam-mask',
            `loop-seam-mask--${effect}`,
            loopMaskEnabled ? 'is-enabled' : '',
            activeLoopMaskEffects[effect] ? 'is-active' : '',
          ].join(' ')}
          style={compileLoopMaskStyle(getEffectTuning(effect))}
        >
          <div className="loop-seam-flash-baseline" />
          <div className="loop-seam-flash-pulse" />
        </div>
      ))}
    </>
  );
};
