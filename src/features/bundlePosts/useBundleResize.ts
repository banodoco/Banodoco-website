import { useEffect, useRef, useState, type RefObject } from 'react';
import type { BundleManifestV1 } from '@/types/post';

const DEFAULT_INLINE_AUTO_HEIGHT = 480;
const DEFAULT_MIN_HEIGHT = 320;
const DEFAULT_MAX_HEIGHT = 1600;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function resolveInitialHeight(layout: BundleManifestV1['layout']): number | string {
  if (layout.mode === 'inline-fixed' && layout.aspectRatio && layout.aspectRatio > 0) {
    // Browsers respect CSS aspect-ratio — emit an auto height the caller can
    // combine with an aspect-ratio style on the iframe wrapper.
    return 'auto';
  }
  if (layout.mode === 'inline-auto') {
    return layout.minHeight ?? DEFAULT_INLINE_AUTO_HEIGHT;
  }
  if (layout.mode === 'fullscreen') {
    return '100%';
  }
  return DEFAULT_INLINE_AUTO_HEIGHT;
}

export interface UseBundleResizeResult {
  height: number | string;
}

/**
 * Host-side resize coordinator for bundle iframes. Only listens in inline-auto
 * mode; rejects any message not from the exact iframe contentWindow whose
 * origin matches VITE_BUNDLE_SERVING_ORIGIN and whose envelope is
 * { type: 'banodoco:resize', v: 1, height: <integer> }.
 *
 * Returned height is clamped between manifest min/max bounds with rAF batching
 * to avoid runaway reflows.
 */
export function useBundleResize(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  layout: BundleManifestV1['layout'],
  acceptNullOrigin: boolean = false,
): UseBundleResizeResult {
  const [height, setHeight] = useState<number | string>(() => resolveInitialHeight(layout));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (layout.mode !== 'inline-auto') return undefined;

    const expectedOrigin = import.meta.env.VITE_BUNDLE_SERVING_ORIGIN as string | undefined;
    console.info('[bundle/resize] hook armed', {
      expectedOrigin,
      acceptNullOrigin,
      layoutMode: layout.mode,
      minHeight: layout.minHeight,
      maxHeight: layout.maxHeight,
    });

    const handler = (event: MessageEvent) => {
      // Only consider messages from OUR iframe — every other postMessage on
      // the window is someone else's traffic.
      if (event.source !== iframeRef.current?.contentWindow) return;
      const originOk =
        !!expectedOrigin &&
        (event.origin === expectedOrigin || (acceptNullOrigin && event.origin === 'null'));
      const payload = event.data as { type?: unknown; v?: unknown; height?: unknown } | undefined;
      const isResize =
        !!payload && typeof payload === 'object' && payload.type === 'banodoco:resize';
      if (isResize) {
        console.info('[bundle/resize] message', {
          originOk,
          eventOrigin: event.origin,
          expectedOrigin,
          acceptNullOrigin,
          payload,
        });
      }
      if (!originOk) return;
      if (
        !payload ||
        typeof payload !== 'object' ||
        payload.type !== 'banodoco:resize' ||
        payload.v !== 1 ||
        !Number.isInteger(payload.height)
      ) {
        return;
      }

      const received = payload.height as number;
      const min = layout.minHeight ?? DEFAULT_MIN_HEIGHT;
      const max = layout.maxHeight ?? DEFAULT_MAX_HEIGHT;
      const next = clamp(received, min, max);
      console.info('[bundle/resize] setting height', { received, clamped: next });

      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setHeight(next));
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [iframeRef, layout, acceptNullOrigin]);

  return { height };
}
