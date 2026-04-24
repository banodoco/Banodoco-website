// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, createElement, useEffect, useRef, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useBundleResize } from './useBundleResize';
import type { BundleManifestV1 } from '@/types/post';

// React 19 prints a soft warning unless the test env advertises act support.
// Setting this before any render silences the noise without changing behaviour.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EXPECTED_ORIGIN = 'https://example.com';
const INLINE_AUTO_LAYOUT: BundleManifestV1['layout'] = {
  mode: 'inline-auto',
  minHeight: 100,
  maxHeight: 1200,
};

interface RenderOptions {
  acceptNullOrigin?: boolean;
  /** `undefined` exercises the "no third arg" call site that keeps BundleFrame.tsx byte-identical. */
  omitThirdArg?: boolean;
}

interface HookHandle {
  container: HTMLDivElement;
  root: Root;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  getHeight(): number | string;
  unmount(): void;
}

/**
 * Tiny hook-harness: mounts a component that calls useBundleResize with the
 * requested acceptNullOrigin config and exposes the returned height + the
 * iframe ref for dispatching synthetic `message` events. The `undefined` arm
 * explicitly invokes the two-arg overload so we test that BundleFrame.tsx's
 * byte-identical two-arg call still rejects null origins.
 */
const renderHookHarness = async (opts: RenderOptions): Promise<HookHandle> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let capturedIframeRef: RefObject<HTMLIFrameElement | null> | null = null;
  let capturedHeight: number | string = 'unset';

  const Harness = (): React.ReactElement => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    // Always call the 3-arg form; `undefined` activates the default-param
    // branch (false), matching the two-arg call site at BundleFrame.tsx:52.
    const thirdArg = opts.omitThirdArg ? undefined : (opts.acceptNullOrigin ?? false);
    const { height } = useBundleResize(iframeRef, INLINE_AUTO_LAYOUT, thirdArg as boolean);
    useEffect(() => {
      capturedIframeRef = iframeRef;
      capturedHeight = height;
    });
    return createElement('iframe', { ref: iframeRef, title: 'preview' });
  };

  await act(async () => {
    root.render(createElement(Harness));
  });

  if (!capturedIframeRef) throw new Error('Harness never captured iframe ref');

  return {
    container,
    root,
    iframeRef: capturedIframeRef,
    getHeight: () => capturedHeight,
    unmount() {
      root.unmount();
      container.remove();
    },
  };
};

const dispatchResize = async (
  iframeRef: RefObject<HTMLIFrameElement | null>,
  opts: { origin: string; source: 'match' | 'other' },
  height = 555,
): Promise<void> => {
  // MessageEvent.source must be a Window-ish object; use the iframe's own
  // contentWindow for 'match' and any foreign window for 'other'.
  const source =
    opts.source === 'match'
      ? iframeRef.current?.contentWindow ?? null
      : ({} as Window);
  await act(async () => {
    const event = new MessageEvent('message', {
      data: { type: 'banodoco:resize', v: 1, height },
      origin: opts.origin,
      source,
    } as MessageEventInit);
    window.dispatchEvent(event);
    // flush rAF — happy-dom runs requestAnimationFrame via microtask queue.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  vi.stubEnv('VITE_BUNDLE_SERVING_ORIGIN', EXPECTED_ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useBundleResize — three null-origin scenarios (T18 spec)', () => {
  test('(a) default rejects null-origin even when source matches', async () => {
    const handle = await renderHookHarness({ acceptNullOrigin: false });
    const initial = handle.getHeight();
    await dispatchResize(handle.iframeRef, { origin: 'null', source: 'match' }, 777);
    // Height MUST NOT change — default `false` blocks null-origin.
    expect(handle.getHeight()).toBe(initial);
    handle.unmount();
  });

  test('(b) true accepts null-origin ONLY when source matches', async () => {
    const handle = await renderHookHarness({ acceptNullOrigin: true });

    // Null-origin + matching source → accepted.
    await dispatchResize(handle.iframeRef, { origin: 'null', source: 'match' }, 777);
    expect(handle.getHeight()).toBe(777);

    // Null-origin + WRONG source → still rejected.
    await dispatchResize(handle.iframeRef, { origin: 'null', source: 'other' }, 888);
    expect(handle.getHeight()).toBe(777);

    // Non-matching origin (not null, not expected) → rejected.
    await dispatchResize(
      handle.iframeRef,
      { origin: 'https://evil.example', source: 'match' },
      999,
    );
    expect(handle.getHeight()).toBe(777);

    handle.unmount();
  });

  test('(c) two-arg call (no third arg → undefined) still rejects null-origin', async () => {
    const handle = await renderHookHarness({ omitThirdArg: true });
    const initial = handle.getHeight();
    await dispatchResize(handle.iframeRef, { origin: 'null', source: 'match' }, 777);
    // Guards byte-identity at BundleFrame.tsx:52 — the two-arg call keeps
    // production behaviour (default false, reject null).
    expect(handle.getHeight()).toBe(initial);
    handle.unmount();
  });

  test('expected-origin + matching source is accepted (control)', async () => {
    const handle = await renderHookHarness({ acceptNullOrigin: false });
    await dispatchResize(
      handle.iframeRef,
      { origin: EXPECTED_ORIGIN, source: 'match' },
      444,
    );
    expect(handle.getHeight()).toBe(444);
    handle.unmount();
  });
});
