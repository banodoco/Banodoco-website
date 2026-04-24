/**
 * Vibe Mode — live preview iframe.
 *
 * The iframe is loaded from a REAL URL in the SW's scope (not srcdoc) so
 * that it becomes a SW-controlled client: fetches from inside the iframe
 * flow through the Service Worker and resolve against the virtual tree.
 *
 * `sandbox="allow-scripts allow-same-origin"` is required — Chrome will
 * NOT let a SW control an iframe whose origin is opaque, which includes
 * sandboxed frames without allow-same-origin. The same-origin relaxation
 * is dev-only (the production `BundleFrame` renders from a real cross-
 * origin Supabase Functions URL and keeps the narrower sandbox).
 *
 * Single-iframe design: src is set declaratively through JSX (not via
 * imperative `.src` in an effect) so React re-attaches the `onLoad`
 * handler on every render. Every tree version bumps the query string,
 * which triggers an iframe navigation; when the new document loads,
 * `onLoad` fires and we call `onAfterSwap`. No double-buffer — the
 * user sees a brief flicker on each navigation, which is acceptable for
 * a live preview where the whole document can change arbitrarily.
 */

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { BundleManifestV1 } from '@/types/post';

export interface VibePreviewFrameProps {
  swScope: string;
  /** Cache-bust / force-navigation key. Bump each time the tree changes. */
  version: number;
  manifest: BundleManifestV1;
  onAfterSwap?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function VibePreviewFrame({
  swScope,
  version,
  manifest,
  onAfterSwap,
  className,
  style,
}: VibePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onAfterSwapRef = useRef(onAfterSwap);
  useEffect(() => {
    onAfterSwapRef.current = onAfterSwap;
  }, [onAfterSwap]);

  const targetSrc = useMemo(() => {
    if (!swScope || version <= 0) return undefined;
    return `${swScope}?v=${version}`;
  }, [swScope, version]);

  const prevVersionRef = useRef(version);
  useEffect(() => {
    if (prevVersionRef.current !== version) {
      console.info('[vibe/preview] version prop changed', {
        prev: prevVersionRef.current,
        next: version,
        targetSrc,
      });
      prevVersionRef.current = version;
    }
  }, [version, targetSrc]);

  const handleLoad = () => {
    try {
      onAfterSwapRef.current?.();
    } catch (err) {
      console.warn('[vibe/preview] onAfterSwap threw', err);
    }
  };

  const handleError = (ev: React.SyntheticEvent<HTMLIFrameElement>) => {
    console.warn('[vibe/preview] iframe error event', { type: ev.type, version });
  };

  // Relay iframe console + error events (injected in composePreviewHtml) to
  // the parent console so the whole preview log stream shows up in one place.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { __vibeIframeLog?: boolean; level?: string; args?: unknown[] } | null;
      if (!data || !data.__vibeIframeLog) return;
      const level = (data.level && typeof data.level === 'string' ? data.level : 'log') as
        | 'log'
        | 'info'
        | 'warn'
        | 'error'
        | 'debug';
      const fn = (console[level] ?? console.log).bind(console);
      fn(...(data.args ?? []));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // The editor preview ALWAYS fills its pane — the manifest.layout mode only
  // governs how the post renders publicly. Using useBundleResize here would
  // clamp at minHeight (240px for inline-auto) and cut off tall pages.
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    ...style,
  };

  const iframeStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: '0',
    display: 'block',
  };

  return (
    <div className={className} style={containerStyle}>
      <iframe
        ref={iframeRef}
        title={manifest.title || 'Vibe preview'}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        src={targetSrc}
        onLoad={handleLoad}
        onError={handleError}
        style={iframeStyle}
      />
    </div>
  );
}
