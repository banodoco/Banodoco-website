/**
 * Vibe Mode — Ship It pipeline.
 *
 * Takes the session's in-memory virtual file tree and publishes it as a
 * bundle version through the *existing* `process-bundle` Edge Function —
 * NO new server code, NO new error codes. Provenance is stamped into
 * the manifest as `source:'vibe'` so T16's admin pill can surface the
 * Vibe badge without touching schema.
 *
 * Pipeline (per doc §Step 14):
 *   1. Read `post.json` from the tree; parse as `BundleManifestV1`. If
 *      the file is absent or unparsable → refuse with a typed error.
 *   2. If the manifest lacks `source`, inject `source:'vibe'`. If
 *      `source` is already present, leave it as-is (don't clobber a
 *      deliberate `'manual'` stamp).
 *   3. `toZipBlob(tree, readAsset)` where `readAsset` resolves binary
 *      assets from IDB via `[postDraftId, assetId]`.
 *   4. POST the zip to `/functions/v1/process-bundle` via
 *      `supabase.functions.invoke('process-bundle', {body: formData})`
 *      with FormData field names `postId` + `zip` — byte-identical to
 *      `src/pages/SubmitPost/BundleUpload.tsx:167-173`.
 *   5. On success: invoke `onShipped({bundleVersionId})` and retain the
 *      IndexedDB draft so authors can keep editing, re-ship, and preserve
 *      chat history/snapshots/tree state.
 *   6. `bundle_duplicate_upload` on retry is swallowed as a soft
 *      success (the server already has the exact bundle; callers surface
 *      this as a friendly notice and keep the current draft intact).
 *
 * Callers that want the old destructive reset flow must call
 * `clearDraft(postId)` and then `rehydrateTreeFromBundle(...)` explicitly.
 *
 * BUNDLE_UPLOAD_ERRORS is inlined here verbatim from BundleUpload.tsx
 * per the spec's "import or inline copy; NO new codes" rule. Inlining
 * keeps BundleUpload.tsx byte-unchanged (it's on the "reuse-never-fork"
 * list) at the cost of a small duplication. If the error codes drift
 * server-side, both copies need to update together.
 */

import type { BundleManifestV1 } from '@/types/post';
import type { VirtualFileTree } from '@/types/vibe';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { toZipBlob, type AssetBlobLookup } from './virtualFileTree';
import { getAsset } from './db';

// Inlined from src/pages/SubmitPost/BundleUpload.tsx:8-26 VERBATIM.
// Do NOT add new codes — the server-side surface owns the full set.
export const BUNDLE_UPLOAD_ERRORS: Record<string, string> = {
  bundle_auth_required: 'Sign in again before uploading a bundle.',
  bundle_post_not_found: 'This post draft was not found or you do not have access to it.',
  bundle_not_zip: 'Upload a valid .zip archive.',
  bundle_zip_too_large: 'The zip exceeds the 20 MB upload limit.',
  bundle_too_many_entries: 'The archive contains more than 500 extracted files.',
  bundle_uncompressed_limit_exceeded: 'The extracted bundle exceeds the 20 MB total size limit.',
  bundle_file_too_large: 'One of the extracted files exceeds the 10 MB per-file limit.',
  bundle_ratio_exceeded: 'The archive expansion ratio exceeds the 50:1 safety cap.',
  bundle_invalid_path: 'The archive includes an invalid path. Remove absolute or traversal paths and try again.',
  bundle_symlink_disallowed: 'Symlinks are not allowed inside bundle archives.',
  bundle_extension_disallowed: 'The archive contains a file type that bundle mode does not allow.',
  bundle_manifest_missing: 'The zip must include a post.json manifest at the root.',
  bundle_manifest_invalid: 'The post.json manifest is invalid.',
  bundle_duplicate_upload: 'This exact bundle has already been uploaded for the post.',
  bundle_storage_write_failed: 'The upload could not be staged in storage. Try again.',
  bundle_register_failed: 'The bundle could not be registered. Try again.',
  bundle_promotion_failed: 'The bundle uploaded but could not be promoted into its final version.',
};

export type ShipVibeBundleResult =
  | { kind: 'shipped'; bundleVersionId: string; previewUrl: string }
  | { kind: 'duplicate' };

export interface ShipVibeBundleArgs {
  tree: VirtualFileTree;
  postId: string;
  title: string;
  onShipped?(result: { bundleVersionId: string }): void | Promise<void>;
  /** Override for tests; defaults to IDB-backed asset reader keyed by [postDraftId, assetId]. */
  readAsset?: AssetBlobLookup;
}

export class ShipVibeBundleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ShipVibeBundleError';
    this.code = code;
  }
}

interface ProcessBundleResponse {
  bundleVersionId: string;
  previewUrl: string;
}

/**
 * Duplicate of `BundleUpload.tsx`'s `getFunctionErrorCode` helper. The
 * duplication is deliberate (per-spec verbatim reuse with no shared
 * module touching the byte-frozen file).
 */
async function getFunctionErrorCode(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') return null;

  const maybeContext = (error as { context?: Response }).context;
  if (maybeContext) {
    try {
      const payload = (await maybeContext.clone().json()) as {
        code?: unknown;
        error?: { code?: unknown } | string;
      };
      if (
        payload.error &&
        typeof payload.error === 'object' &&
        typeof (payload.error as { code?: unknown }).code === 'string'
      ) {
        return (payload.error as { code: string }).code;
      }
      if (typeof payload.code === 'string') return payload.code;
    } catch {
      // fall through
    }
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && message in BUNDLE_UPLOAD_ERRORS) return message;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseManifest(tree: VirtualFileTree): BundleManifestV1 {
  const file = tree['post.json'];
  if (!file || file.kind !== 'text' || typeof file.content !== 'string') {
    throw new ShipVibeBundleError('bundle_manifest_missing', BUNDLE_UPLOAD_ERRORS.bundle_manifest_missing);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.content);
  } catch {
    throw new ShipVibeBundleError('bundle_manifest_invalid', BUNDLE_UPLOAD_ERRORS.bundle_manifest_invalid);
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    throw new ShipVibeBundleError('bundle_manifest_invalid', BUNDLE_UPLOAD_ERRORS.bundle_manifest_invalid);
  }
  return parsed as unknown as BundleManifestV1;
}

/**
 * Stamp `source:'vibe'` if absent. Returns a `tree` whose `post.json`
 * reflects the stamped manifest — the original tree object is not
 * mutated. If the manifest already carries `source`, the tree is
 * returned untouched.
 */
function stampVibeSource(tree: VirtualFileTree): { tree: VirtualFileTree; manifest: BundleManifestV1 } {
  const manifest = parseManifest(tree);
  if (manifest.source) {
    return { tree, manifest };
  }
  const stamped: BundleManifestV1 = { ...manifest, source: 'vibe' };
  const next: VirtualFileTree = {
    ...tree,
    'post.json': {
      path: 'post.json',
      kind: 'text',
      mime: tree['post.json'].mime || 'application/json; charset=utf-8',
      content: JSON.stringify(stamped, null, 2),
    },
  };
  return { tree: next, manifest: stamped };
}

function safeZipFilename(title: string, postId: string): string {
  const cleaned = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const stub = cleaned || 'vibe';
  return `${stub}-${postId.slice(0, 8)}.zip`;
}

/**
 * Build an IDB-backed `AssetBlobLookup` callback for `toZipBlob`.
 * Scoped to the current post draft; callers can pass their own mock.
 */
const makeIdbReadAsset = (postDraftId: string): AssetBlobLookup =>
  async (assetId) => {
    const rec = await getAsset(postDraftId, assetId);
    if (!rec) return null;
    return {
      bytes: new Uint8Array(rec.bytes),
      originalFilename: rec.originalFilename,
    };
  };

/**
 * Ship It entrypoint. Rejects with `ShipVibeBundleError` on any server
 * error except `bundle_duplicate_upload`, which resolves with
 * `{kind:'duplicate'}` so the caller can treat it as a soft success.
 */
export async function shipVibeBundle(args: ShipVibeBundleArgs): Promise<ShipVibeBundleResult> {
  const { tree, postId, title, onShipped } = args;
  if (!isSupabaseConfigured || !supabase) {
    throw new ShipVibeBundleError('bundle_auth_required', BUNDLE_UPLOAD_ERRORS.bundle_auth_required);
  }
  if (!postId) {
    throw new ShipVibeBundleError('bundle_post_not_found', BUNDLE_UPLOAD_ERRORS.bundle_post_not_found);
  }

  const { tree: stampedTree } = stampVibeSource(tree);
  const readAsset = args.readAsset ?? makeIdbReadAsset(postId);

  const zipBlob = await toZipBlob(stampedTree, readAsset);
  const zipFile = new File([zipBlob], safeZipFilename(title, postId), { type: 'application/zip' });

  // FormData shape MUST match BundleUpload.tsx:167-173 byte-for-byte:
  // field names `postId` + `zip`, then `supabase.functions.invoke`.
  const formData = new FormData();
  formData.append('postId', postId);
  formData.append('zip', zipFile);

  const { data, error } = await supabase.functions.invoke<ProcessBundleResponse>('process-bundle', {
    body: formData,
  });

  if (error || !data) {
    const code = await getFunctionErrorCode(error);
    if (code === 'bundle_duplicate_upload') {
      // Retry safety: the server already holds this exact bundle. Treat
      // as a soft success so the caller doesn't surface a user-visible
      // error on the 2nd click. Caller decides whether to clear IDB.
      return { kind: 'duplicate' };
    }
    const message = code && BUNDLE_UPLOAD_ERRORS[code] ? BUNDLE_UPLOAD_ERRORS[code] : 'Bundle upload failed. Try again.';
    throw new ShipVibeBundleError(code ?? 'bundle_upload_failed', message);
  }

  if (onShipped) await onShipped({ bundleVersionId: data.bundleVersionId });

  return {
    kind: 'shipped',
    bundleVersionId: data.bundleVersionId,
    previewUrl: data.previewUrl,
  };
}
