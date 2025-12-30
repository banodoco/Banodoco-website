import type { UseAutoPauseVideoResult } from '@/lib/useAutoPauseVideo';
import type { SyntheticEvent } from 'react';

type VoidFn = (() => void) | undefined;
type EventFn<E> = ((e: E) => void) | undefined;

function chainEvent<E>(a: VoidFn, b: EventFn<E>): (e: E) => void {
  return (e: E) => {
    a?.();
    b?.(e);
  };
}

export interface BindAutoPauseVideoOverrides {
  onPlay?: EventFn<SyntheticEvent<HTMLVideoElement>>;
  onCanPlay?: EventFn<SyntheticEvent<HTMLVideoElement>>;
  onLoadedData?: EventFn<SyntheticEvent<HTMLVideoElement>>;
}

/**
 * Bind `useAutoPauseVideo(...).videoEventHandlers` to actual React <video> props,
 * optionally chaining custom per-component handlers.
 *
 * Why: reduces repeated boilerplate like `onPlay={() => { handlers.onPlay(); ... }}`
 * while preserving component-specific behavior.
 */
export function bindAutoPauseVideo(
  videoEventHandlers: UseAutoPauseVideoResult['videoEventHandlers'],
  overrides: BindAutoPauseVideoOverrides = {}
): Required<Pick<BindAutoPauseVideoOverrides, 'onPlay' | 'onCanPlay' | 'onLoadedData'>> {
  return {
    onPlay: chainEvent(videoEventHandlers.onPlay, overrides.onPlay),
    onCanPlay: chainEvent(videoEventHandlers.onCanPlay, overrides.onCanPlay),
    onLoadedData: chainEvent(videoEventHandlers.onLoadedData, overrides.onLoadedData),
  };
}


