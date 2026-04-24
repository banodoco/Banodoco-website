/**
 * Vibe Mode — Service Worker client.
 *
 * Per-session SW registration scoped at
 *
 *     /submit/post/vibe-preview/<swId>/
 *
 * where `swId` is a fresh UUIDv4 minted when the editor mounts. Two
 * concurrent tabs never share a scope. On every mount we also
 * `unregisterStaleSiblings()` — any existing registration whose scope
 * starts with `/submit/post/vibe-preview/` but does NOT match the
 * current session's swId is torn down so abandoned sessions from
 * earlier tabs can't intercept fetches.
 *
 * `.ready` has a HARD 1500ms timeout; if it doesn't settle the caller
 * drops to the single-file blob fallback in `./blobFallback.ts`.
 *
 * Asset bytes for `kind: 'binary-asset'` virtual files are NOT sent to
 * the SW eagerly (they can be multi-MB). Instead the SW requests them
 * on demand via the MessageChannel port using
 * `{type: 'asset-request', reqId, assetId}`; this client resolves via
 * the IndexedDB adapter (T8) and replies with
 * `{type: 'asset-reply', reqId, bytes: ArrayBuffer}`.
 */

import { getAsset } from './db';
import type { VirtualFileTree } from '@/types/vibe';

export const VIBE_PREVIEW_BASE = '/submit/post/vibe-preview/';
export const SW_READY_TIMEOUT_MS = 5000;

export const mintSwId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Weak fallback for environments without crypto.randomUUID (tests).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const scopeFor = (swId: string): string => `${VIBE_PREVIEW_BASE}${swId}/`;

export interface SwBindResult {
  readonly registration: ServiceWorkerRegistration;
  readonly swId: string;
  readonly scope: string;
  /** Close the MessageChannel port. Call on editor unmount. */
  close(): Promise<void>;
  /** Push the latest virtual tree to the SW (called on every turn). */
  /** Push the tree to the SW. Resolves when the SW acks the update (or
   *  times out at 750ms, whichever is first). Callers should await this
   *  before swapping the preview iframe's srcdoc so asset fetches resolve
   *  against the latest tree. */
  pushTree(tree: VirtualFileTree): Promise<void>;
  /** Cache-bust key — bump each tree push; preview URLs append `?v=<n>`. */
  getTreeVersion(): number;
}

class SwReadyTimeoutError extends Error {
  readonly code = 'sw_ready_timeout';
  constructor(ms: number) {
    super(`Service Worker .ready did not settle within ${ms}ms`);
    this.name = 'SwReadyTimeoutError';
  }
}

export const isSwReadyTimeout = (err: unknown): err is SwReadyTimeoutError =>
  err instanceof Error && (err as { code?: string }).code === 'sw_ready_timeout';

/**
 * Wait for a specific registration's worker to reach the `activated` state.
 *
 * We intentionally do NOT use `navigator.serviceWorker.ready` here: `.ready`
 * only resolves when an active SW's scope covers the CURRENT document URL.
 * The Vibe preview SW is scoped to `/submit/post/vibe-preview/<swId>/`,
 * but the editor itself mounts at `/submit/post/<postId>` — a URL the
 * preview SW does not cover. `.ready` would never resolve from the editor
 * page, producing a misleading "SW timeout" and falling through to the
 * blob fallback on every mount.
 *
 * Instead, watch the registration's own worker states (`installing`,
 * `waiting`, `active`) and resolve as soon as one reaches `activated`.
 */
const waitForActivation = (
  registration: ServiceWorkerRegistration,
  ms: number,
): Promise<ServiceWorkerRegistration> =>
  new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const settleIfActive = () => {
      const active = registration.active;
      if (active && active.state === 'activated') {
        clearTimeout(timer);
        resolve(registration);
        return true;
      }
      return false;
    };

    const timer = setTimeout(() => reject(new SwReadyTimeoutError(ms)), ms);

    if (settleIfActive()) return;

    const watch = (sw: ServiceWorker | null) => {
      if (!sw) return;
      const onStateChange = () => {
        if (settleIfActive()) sw.removeEventListener('statechange', onStateChange);
      };
      sw.addEventListener('statechange', onStateChange);
      // In case the worker is already activated between our initial check
      // and the listener being attached:
      if (settleIfActive()) sw.removeEventListener('statechange', onStateChange);
    };

    watch(registration.installing);
    watch(registration.waiting);
    watch(registration.active);

    // If none of the three exists at register-return time, the browser may
    // still be spinning up a fresh install — listen once for updatefound.
    const onUpdateFound = () => {
      watch(registration.installing);
    };
    registration.addEventListener('updatefound', onUpdateFound);
  });

export const unregisterStaleSiblings = async (currentSwId: string): Promise<number> => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return 0;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const currentScopePath = scopeFor(currentSwId);
  let removed = 0;
  for (const reg of registrations) {
    const scopePath = new URL(reg.scope).pathname;
    if (scopePath.startsWith(VIBE_PREVIEW_BASE) && scopePath !== currentScopePath) {
      try {
        await reg.unregister();
        removed += 1;
      } catch (err) {
        console.warn('[vibe/swClient] failed to unregister stale sibling', scopePath, err);
      }
    }
  }
  return removed;
};

/**
 * Register the preview SW for this session, unregister stale siblings,
 * and wire up a MessageChannel to serve asset bytes on demand.
 *
 * Throws:
 *   • `SwReadyTimeoutError` if `.ready` does not settle in
 *     SW_READY_TIMEOUT_MS (1500ms)
 *   • the underlying error if `navigator.serviceWorker.register()`
 *     rejects
 *
 * Callers should catch and drop to `./blobFallback.ts` on any failure.
 */
export const registerVibePreviewSw = async (
  postDraftId: string,
  opts: { swId?: string; workerUrl?: string; readyTimeoutMs?: number } = {},
): Promise<SwBindResult> => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    throw new Error('Service Worker API not available');
  }
  const swId = opts.swId ?? mintSwId();
  const scope = scopeFor(swId);
  const workerUrl = opts.workerUrl ?? '/vibe-preview-sw.js';
  const readyTimeoutMs = opts.readyTimeoutMs ?? SW_READY_TIMEOUT_MS;

  await unregisterStaleSiblings(swId);

  // Can reject → caller catches and enters blob fallback.
  const registration = await navigator.serviceWorker.register(workerUrl, { scope });
  const ready = await waitForActivation(registration, readyTimeoutMs);

  const active = ready.active ?? ready.waiting ?? ready.installing;
  if (!active) {
    throw new Error('Service Worker registered but no active worker');
  }

  // Asset-request handler is wired to whichever port is currently bound.
  // Chrome aggressively terminates idle SWs — when one respawns it has an
  // empty `sessionsByScope`, so the page-side port from the original bind
  // is talking to no one. We re-bind on demand (see `rebind` below) which
  // means the asset-request handler must be re-attached to each new port.
  const setupAssetRequestHandler = (port: MessagePort): void => {
    port.addEventListener('message', async (ev: MessageEvent) => {
      const data = ev.data as { type?: string; reqId?: string; assetId?: string } | null;
      if (!data || data.type !== 'asset-request') return;
      if (typeof data.reqId !== 'string' || typeof data.assetId !== 'string') return;
      console.info('[vibe/swClient] asset-request from SW', { assetId: data.assetId });
      try {
        const rec = await getAsset(postDraftId, data.assetId);
        if (!rec) {
          console.warn('[vibe/swClient] asset not in IDB', { postDraftId, assetId: data.assetId });
          port.postMessage({ type: 'asset-reply', reqId: data.reqId, bytes: null });
          return;
        }
        console.info('[vibe/swClient] serving asset bytes', { assetId: data.assetId, size: rec.bytes.byteLength, mime: rec.mime });
        port.postMessage(
          { type: 'asset-reply', reqId: data.reqId, bytes: rec.bytes },
          [rec.bytes],
        );
      } catch (err) {
        console.warn('[vibe/swClient] asset fetch failed', err);
        port.postMessage({ type: 'asset-reply', reqId: data.reqId, bytes: null });
      }
    });
    port.start();
  };

  let activeChannel = new MessageChannel();
  setupAssetRequestHandler(activeChannel.port1);

  console.info('[vibe/swClient] SW bound', { scope, swId });
  active.postMessage({ type: 'bind', scope, swId }, [activeChannel.port2]);

  // Re-bind: build a fresh MessageChannel and hand port2 to the current
  // active worker. Used by pushTree when an ack times out — the SW likely
  // got terminated and lost its session map, so we recreate the binding
  // before retrying. Returns the fresh page-side port for the caller.
  const rebind = (): MessagePort => {
    try {
      activeChannel.port1.close();
    } catch {
      // ignore
    }
    const next = new MessageChannel();
    setupAssetRequestHandler(next.port1);
    activeChannel = next;
    const target =
      registration.active ?? registration.waiting ?? registration.installing ?? null;
    if (target) {
      console.info('[vibe/swClient] SW rebound', { scope, swId });
      target.postMessage({ type: 'bind', scope, swId }, [next.port2]);
    } else {
      console.warn('[vibe/swClient] rebind skipped — no active worker');
    }
    return next.port1;
  };

  // Listen for SW-broadcast logs and re-emit in the page console so users
  // can share a single unified log for debugging.
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    const onSwMessage = (ev: MessageEvent) => {
      const data = ev.data as { __vibeSwLog?: boolean; level?: string; args?: unknown[] } | null;
      if (!data || !data.__vibeSwLog) return;
      const level = (data.level && typeof data.level === 'string' ? data.level : 'log') as
        | 'log'
        | 'info'
        | 'warn'
        | 'error';
      const fn = (console[level] ?? console.log).bind(console);
      fn(...(data.args ?? []));
    };
    try {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    } catch {
      /* noop */
    }
  }

  let treeVersion = 0;

  return {
    registration,
    swId,
    scope,
    /**
     * Push the tree to the Service Worker and wait for its ack. The iframe
     * must not reload until the SW has the latest tree — otherwise in-flight
     * fetches land on a stale tree and the preview flashes a blank/black
     * screen or 404s on freshly-uploaded assets.
     *
     * Resolves when the SW posts `{ type: 'tree-applied', version }`. Has a
     * 750ms safety timeout so a torn-down port never wedges the caller.
     */
    pushTree(tree: VirtualFileTree): Promise<void> {
      treeVersion += 1;
      const version = treeVersion;

      // Single attempt over a specific port. If the SW never acks within
      // 750ms the page-side resolves but tells the caller via `acked`.
      const attempt = (port: MessagePort): Promise<boolean> =>
        new Promise<boolean>((resolve) => {
          let settled = false;
          const settle = (acked: boolean) => {
            if (settled) return;
            settled = true;
            port.removeEventListener('message', onAck);
            resolve(acked);
          };
          const onAck = (ev: MessageEvent) => {
            const data = ev.data as { type?: string; version?: number } | null;
            if (!data || data.type !== 'tree-applied' || data.version !== version) return;
            settle(true);
          };
          port.addEventListener('message', onAck);
          try {
            port.postMessage({ type: 'tree', tree, version });
          } catch (err) {
            console.warn('[vibe/swClient] pushTree failed', err);
            settle(false);
            return;
          }
          setTimeout(() => settle(false), 750);
        });

      return (async () => {
        const acked = await attempt(activeChannel.port1);
        if (acked) return;
        // Ack timeout almost always means the SW was terminated and the
        // bound port is dead. Rebind via the active worker and retry once.
        console.warn('[vibe/swClient] pushTree ack timed out — rebinding and retrying', { version });
        const refreshed = rebind();
        await attempt(refreshed);
      })();
    },
    /** Monotonically-increasing version of the last tree pushed. Used by
     *  the preview iframe as a cache-bust query param so navigating to the
     *  same scope URL with a new version forces a fresh fetch through the SW. */
    getTreeVersion(): number {
      return treeVersion;
    },
    async close() {
      try {
        activeChannel.port1.postMessage({ type: 'unbind', scope });
      } catch {
        // ignore
      }
      try {
        activeChannel.port1.close();
      } catch {
        // ignore
      }
      try {
        await registration.unregister();
      } catch (err) {
        console.warn('[vibe/swClient] unregister failed', err);
      }
    },
  };
};
