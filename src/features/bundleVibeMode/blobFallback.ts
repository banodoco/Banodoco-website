/**
 * Vibe Mode — single-file blob-URL preview fallback.
 *
 * Used ONLY when `swClient.registerVibePreviewSw()` cannot produce a
 * live worker: `navigator.serviceWorker` undefined, `.register()`
 * rejects, or `.ready` does not settle within 1500ms.
 *
 * Narrow by design (per doc §Step 9.5):
 *   • Single-file tree only. Multi-file trees refuse with the exact
 *     banner string `MULTI_FILE_FALLBACK_BANNER` below — do not
 *     rephrase. Tests match byte-for-byte.
 *   • Binary assets are NOT supported in fallback — they require
 *     multi-file relative resolution which only the SW provides.
 *   • Blob-URL lifecycle tracks `currentBlobUrls` and
 *     `previousBlobUrls` as documented: on `rebuild()`, current
 *     rotates into previous and a fresh current is built; the
 *     previous set is revoked when the iframe fires `load` (caller
 *     invokes `revokePrevious()` from the load handler — kept
 *     external so the iframe load event wiring lives in T11).
 */

import type { VirtualFile, VirtualFileTree } from '@/types/vibe';

export const MULTI_FILE_FALLBACK_BANNER =
  'Multi-file preview requires a Service Worker. Use Chrome/Firefox with SW enabled, or reduce the bundle to a single file to preview without one.';

export interface BlobFallbackBuildResult {
  /** URL to assign to iframe `src` (or `srcdoc` for text/html). */
  readonly primaryUrl: string;
  readonly primaryMime: string;
  /** Caller must invoke this once the iframe has fired `load`. */
  revokePrevious(): void;
  /** All blob URLs this rebuild minted — for diagnostics/tests. */
  readonly current: ReadonlySet<string>;
}

export class BlobFallbackMultiFileError extends Error {
  readonly code = 'vibe_blob_multifile';
  constructor() {
    super(MULTI_FILE_FALLBACK_BANNER);
    this.name = 'BlobFallbackMultiFileError';
  }
}

export class BlobFallbackUnsupportedKindError extends Error {
  readonly code = 'vibe_blob_unsupported_kind';
  constructor(path: string) {
    super(
      `Blob-fallback preview cannot render binary-asset files (${path}); re-enable the Service Worker to preview assets.`,
    );
    this.name = 'BlobFallbackUnsupportedKindError';
  }
}

/**
 * Stateful blob-URL tracker. One instance per editor mount — the
 * `previous` set rotates on every rebuild and is emptied on iframe
 * `load` via `revokePrevious()`.
 */
export class BlobFallbackController {
  private currentBlobUrls = new Set<string>();
  private previousBlobUrls = new Set<string>();

  /** For tests. */
  get current(): ReadonlySet<string> {
    return this.currentBlobUrls;
  }

  /** For tests. */
  get previous(): ReadonlySet<string> {
    return this.previousBlobUrls;
  }

  /**
   * Build a fresh blob URL for a single-text-file tree. Rotates the
   * previous current-set into `previousBlobUrls`, then mints the new
   * current blob URL.
   *
   * Throws `BlobFallbackMultiFileError` on multi-file trees with the
   * exact banner string. Throws `BlobFallbackUnsupportedKindError`
   * when the single file is a binary-asset.
   */
  rebuild(tree: VirtualFileTree): BlobFallbackBuildResult {
    // Rotate before anything can fail so we don't strand old URLs if
    // the caller's tree is malformed.
    for (const url of this.currentBlobUrls) this.previousBlobUrls.add(url);
    this.currentBlobUrls = new Set();

    const paths = Object.keys(tree);
    if (paths.length === 0) {
      throw new Error('Blob fallback: tree is empty');
    }
    if (paths.length > 1) {
      throw new BlobFallbackMultiFileError();
    }

    const path = paths[0];
    const file: VirtualFile = tree[path];
    if (file.kind !== 'text') {
      throw new BlobFallbackUnsupportedKindError(path);
    }
    const mime = file.mime || 'text/plain; charset=utf-8';
    const body = typeof file.content === 'string' ? file.content : '';
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    this.currentBlobUrls.add(url);

    return {
      primaryUrl: url,
      primaryMime: mime,
      revokePrevious: () => this.revokePrevious(),
      current: this.currentBlobUrls,
    };
  }

  /**
   * Revoke every URL in `previousBlobUrls` and clear the set. The
   * iframe `load` handler in T11's VibePreviewFrame is the caller.
   */
  revokePrevious(): void {
    for (const url of this.previousBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore — already revoked or invalid
      }
    }
    this.previousBlobUrls.clear();
  }

  /** Revoke EVERYTHING (current + previous). Call on editor unmount. */
  disposeAll(): void {
    this.revokePrevious();
    for (const url of this.currentBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    this.currentBlobUrls.clear();
  }
}
