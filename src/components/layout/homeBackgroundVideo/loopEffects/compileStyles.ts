import type { CSSProperties } from 'react';
import type { LoopEffectTuning } from './model';

const amountToVisibleRatio = (amount: number) => {
  if (amount === 0) return 0;
  return Math.min(2.25, 0.22 + (amount / 100));
};

export const compileLoopMaskStyle = (tuning: LoopEffectTuning): CSSProperties => {
  const startAmountRatio = amountToVisibleRatio(tuning.startAmount);
  const peakAmountRatio = Math.max(startAmountRatio, amountToVisibleRatio(tuning.peakAmount));
  const whiteRatio = tuning.white / 100;
  const fadeRatio = tuning.fade / 100;
  const cappedStartAlphaAmount = Math.min(1.35, startAmountRatio);
  const cappedPeakAlphaAmount = Math.min(1.35, peakAmountRatio);
  const flashBaselineAlpha = 1 - (
    (1 - Math.min(1, whiteRatio * cappedStartAlphaAmount))
    * (1 - Math.min(0.92, fadeRatio * cappedStartAlphaAmount))
  );
  const flashPeakAlpha = 1 - (
    (1 - Math.min(1, whiteRatio * cappedPeakAlphaAmount))
    * (1 - Math.min(0.92, fadeRatio * cappedPeakAlphaAmount))
  );
  const flashPulseAlpha = flashBaselineAlpha >= 1
    ? 0
    : Math.max(0, (flashPeakAlpha - flashBaselineAlpha) / (1 - flashBaselineAlpha));

  return {
    '--loop-seam-amount': peakAmountRatio,
    '--loop-seam-duration': `${tuning.durationMs}ms`,
    '--loop-seam-veil-blur': `${10 * peakAmountRatio}px`,
    '--loop-seam-veil-saturate': 1 + (0.65 * peakAmountRatio),
    '--loop-seam-blur': `${22 * peakAmountRatio}px`,
    '--loop-seam-brightness': 1 + (0.18 * peakAmountRatio),
    '--loop-seam-opacity-start': Math.min(1, 0.5 * cappedStartAlphaAmount),
    '--loop-seam-opacity-low': Math.min(1, 0.5 * cappedPeakAlphaAmount),
    '--loop-seam-opacity-mid': Math.min(1, 0.75 * cappedPeakAlphaAmount),
    '--loop-seam-opacity-high': Math.min(1, 0.85 * cappedPeakAlphaAmount),
    '--loop-seam-soft-alpha': Math.min(0.55, 0.18 * cappedPeakAlphaAmount),
    '--loop-seam-line-alpha': Math.min(0.42, 0.12 * cappedPeakAlphaAmount),
    '--loop-seam-edge-spread': `${Math.min(92, 18 + (tuning.edge * 0.42))}%`,
    '--loop-seam-side-stop': `${Math.max(2, 30 - (tuning.edge * 0.18))}%`,
    '--loop-seam-side-alpha': Math.min(0.85, 0.35 * cappedPeakAlphaAmount),
    '--loop-seam-vertical-alpha': Math.min(0.65, 0.25 * cappedPeakAlphaAmount),
    '--loop-seam-glitch-alpha': Math.min(0.65, 0.18 * cappedPeakAlphaAmount),
    '--loop-seam-cyan-alpha': Math.min(0.75, 0.22 * cappedPeakAlphaAmount),
    '--loop-seam-magenta-alpha': Math.min(0.75, 0.2 * cappedPeakAlphaAmount),
    '--loop-seam-band-inset': `${Math.max(0, 24 - (tuning.edge * 0.16))}%`,
    '--loop-seam-glitch-sweep-start': `${-48 * peakAmountRatio}px`,
    '--loop-seam-glitch-sweep-end': `${64 * peakAmountRatio}px`,
    '--loop-seam-shutter-alpha': Math.min(0.96, 0.78 * cappedPeakAlphaAmount),
    '--loop-seam-shutter-offset': `${Math.max(-20, 100 - tuning.edge)}%`,
    '--loop-seam-shutter-offset-negative': `${-Math.max(-20, 100 - tuning.edge)}%`,
    '--loop-seam-flash-alpha-start': Math.min(1, whiteRatio * cappedStartAlphaAmount),
    '--loop-seam-flash-alpha': Math.min(1, whiteRatio * cappedPeakAlphaAmount),
    '--loop-seam-flash-clear-alpha-start': Math.min(0.92, fadeRatio * cappedStartAlphaAmount),
    '--loop-seam-flash-clear-alpha': Math.min(0.92, fadeRatio * cappedPeakAlphaAmount),
    '--loop-seam-flash-baseline-alpha': flashBaselineAlpha,
    '--loop-seam-flash-pulse-alpha': flashPulseAlpha,
    '--loop-seam-flash-blur': `${18 * fadeRatio * peakAmountRatio}px`,
    '--loop-video-fade-opacity-start': Math.max(0, 1 - Math.min(0.92, fadeRatio * cappedStartAlphaAmount)),
    '--loop-video-fade-opacity': Math.max(0, 1 - Math.min(0.92, fadeRatio * cappedPeakAlphaAmount)),
    '--loop-video-fade-blur': `${10 * fadeRatio * peakAmountRatio}px`,
  } as CSSProperties;
};
