/**
 * Vibe Mode — in-memory virtual file tree for the authoring session.
 *
 * This is the client-side mirror of the agent-proxy Edge Function's
 * `tools.ts`. Keeping invariants (POSIX paths, no `..`, no absolute
 * paths, extension allowlist, <=10MB per file) byte-identical on both
 * sides means a Ship It zip cannot contain anything the live preview
 * did not already accept.
 *
 * `VirtualFile.assetId` lifecycle:
 *   • A new UUIDv4 is minted *client-side* (via `crypto.randomUUID()`)
 *     whenever an asset enters the session (drop, paste, library pick,
 *     MediaUploader). The id is stable for the lifetime of the session.
 *   • Binary blobs are written to IndexedDB under the composite key
 *     `[postDraftId, assetId]` (see T8 / `./db.ts`).
 *   • `serializeForClaude(tree)` NEVER includes blob bytes: binary
 *     assets are rendered as `<file path="..." encoding="binary-asset"
 *     ref="asset-<id>"/>` metadata only, so the model reasons about
 *     their existence and path without paying the token cost.
 *   • `toZipBlob(tree, readAsset)` materialises the bytes on Ship It:
 *     for every binary-asset entry it calls `readAsset(assetId)` (a
 *     reader backed by IDB) and writes the resulting bytes to the zip
 *     at `assets/<originalFilename>` — preserving the author-provided
 *     filename even if the tree path is different.
 */

import { zipSync, type Zippable } from 'fflate';
import type { VirtualFile, VirtualFileTree } from '@/types/vibe';

// Mirror of ../supabase/functions/_shared/bundle-constants.ts. Kept
// in-sync by the bundle-manifest parity tests; if you change this list,
// update the shared Deno constant in the same commit.
export const VIBE_EXTENSION_ALLOWLIST: ReadonlySet<string> = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.ico',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.wasm',
]);

export const VIBE_MAX_FILE_BYTES = 10 * 1024 * 1024;

export type PathValidation =
  | { ok: true; path: string; extension: string }
  | { ok: false; error: string };

export const validatePath = (raw: unknown): PathValidation => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, error: 'path must be a non-empty string' };
  }
  if (raw.startsWith('/') || raw.startsWith('\\') || raw.includes('\\')) {
    return { ok: false, error: 'path must be POSIX-style and relative' };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return { ok: false, error: 'path must not include a protocol scheme' };
  }
  const segs = raw.split('/');
  if (segs.some((s) => s === '' || s === '.' || s === '..')) {
    return { ok: false, error: 'path may not contain empty, "." or ".." segments' };
  }
  const lastDot = raw.lastIndexOf('.');
  if (lastDot === -1) {
    return { ok: false, error: 'path must include a file extension' };
  }
  const extension = raw.slice(lastDot).toLowerCase();
  if (!VIBE_EXTENSION_ALLOWLIST.has(extension)) {
    return { ok: false, error: `extension ${extension} is not allowed` };
  }
  return { ok: true, path: raw, extension };
};

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

const inferMime = (extension: string): string => {
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'text/plain; charset=utf-8';
  }
};

export const createTree = (): VirtualFileTree => ({});

export type WriteFileResult =
  | { ok: true; tree: VirtualFileTree; path: string }
  | { ok: false; error: string };

export const writeFile = (
  tree: VirtualFileTree,
  path: string,
  content: string,
  opts?: { mime?: string },
): WriteFileResult => {
  const check = validatePath(path);
  if (!check.ok) return { ok: false, error: check.error };
  if (typeof content !== 'string') {
    return { ok: false, error: 'content must be a string' };
  }
  if (byteLength(content) > VIBE_MAX_FILE_BYTES) {
    return { ok: false, error: `content exceeds ${VIBE_MAX_FILE_BYTES} bytes` };
  }
  const next: VirtualFileTree = { ...tree };
  const existing = next[check.path];
  next[check.path] = {
    path: check.path,
    kind: 'text',
    mime: opts?.mime ?? existing?.mime ?? inferMime(check.extension),
    content,
  };
  return { ok: true, tree: next, path: check.path };
};

/**
 * Register (or replace) a binary-asset entry. The caller is responsible
 * for persisting the actual bytes to IndexedDB under `[postDraftId,
 * assetId]` before invoking this — the tree only ever holds metadata.
 */
export const writeBinaryAsset = (
  tree: VirtualFileTree,
  path: string,
  assetId: string,
  mime: string,
): WriteFileResult => {
  const check = validatePath(path);
  if (!check.ok) return { ok: false, error: check.error };
  if (typeof assetId !== 'string' || assetId.length === 0) {
    return { ok: false, error: 'assetId is required' };
  }
  const next: VirtualFileTree = { ...tree };
  next[check.path] = {
    path: check.path,
    kind: 'binary-asset',
    mime,
    assetId,
  };
  return { ok: true, tree: next, path: check.path };
};

export type ApplyPatchResult =
  | { ok: true; tree: VirtualFileTree; path: string; matches: 1 }
  | { ok: false; error: string; matches?: number };

/**
 * Replace exactly one occurrence of `search` with `replace` in the text
 * file at `path`. Returns `{ ok:false }` on 0 or >1 matches — mirror of
 * the Edge Function's server-side behaviour so the client can preview
 * the exact same outcome the model will produce server-side.
 */
export const applyPatch = (
  tree: VirtualFileTree,
  path: string,
  search: string,
  replace: string,
): ApplyPatchResult => {
  const check = validatePath(path);
  if (!check.ok) return { ok: false, error: check.error };
  if (typeof search !== 'string' || typeof replace !== 'string') {
    return { ok: false, error: 'search and replace must both be strings' };
  }
  const existing = tree[check.path];
  if (!existing || existing.kind !== 'text' || typeof existing.content !== 'string') {
    return { ok: false, error: `no text file exists at ${check.path}` };
  }
  const matches = existing.content.split(search).length - 1;
  if (matches === 0) {
    return { ok: false, error: 'search block did not match any occurrence', matches: 0 };
  }
  if (matches > 1) {
    return {
      ok: false,
      error: `search block matched ${matches} occurrences; expected exactly 1`,
      matches,
    };
  }
  const nextContent = existing.content.replace(search, replace);
  if (byteLength(nextContent) > VIBE_MAX_FILE_BYTES) {
    return { ok: false, error: `resulting content exceeds ${VIBE_MAX_FILE_BYTES} bytes` };
  }
  const next: VirtualFileTree = { ...tree };
  next[check.path] = { ...existing, content: nextContent };
  return { ok: true, tree: next, path: check.path, matches: 1 };
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeCdata = (value: string): string => value.replace(/]]>/g, ']]]]><![CDATA[>');

const renderFile = (file: VirtualFile): string => {
  if (file.kind === 'binary-asset') {
    const ref = file.assetId ? `asset-${file.assetId}` : 'asset-missing';
    return `<file path="${escapeXml(file.path)}" encoding="binary-asset" ref="${escapeXml(ref)}"/>`;
  }
  const content = typeof file.content === 'string' ? file.content : '';
  return `<file path="${escapeXml(file.path)}" mime="${escapeXml(
    file.mime || 'text/plain',
  )}"><![CDATA[${escapeCdata(content)}]]></file>`;
};

/**
 * Stable XML serialisation for Anthropic. Files are emitted in
 * alphabetical path order — this makes the turn-1 `<file_tree>` cache
 * breakpoint a deterministic cache key from turn to turn.
 *
 * Binary assets render metadata ONLY — `<file ... ref="asset-<id>"/>`
 * with NO inline bytes. The model never sees blob contents.
 */
export const serializeForClaude = (tree: VirtualFileTree): string => {
  const paths = Object.keys(tree).sort();
  const body = paths.map((p) => renderFile(tree[p])).join('\n');
  return `<file_tree>\n${body}\n</file_tree>`;
};

export interface AssetBlobLookup {
  (assetId: string): Promise<{ bytes: Uint8Array; originalFilename: string } | null>;
}

const posixBaseName = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
};

/**
 * Produce a Ship It zip from the current tree.
 *
 * Text files are written at their tree path verbatim. Binary-asset
 * entries invoke `readAsset(assetId)` which must return the original
 * blob bytes + filename as stored in IDB under `[postDraftId, assetId]`
 * — the returned filename is used for the zip entry so authors keep
 * the recognisable name they originally uploaded:
 *
 *     assets/<originalFilename>
 *
 * If `readAsset` is omitted and the tree contains any binary-asset
 * entries, the call rejects — the zip would otherwise contain
 * unresolvable refs.
 */
export const toZipBlob = async (
  tree: VirtualFileTree,
  readAsset?: AssetBlobLookup,
): Promise<Blob> => {
  const encoder = new TextEncoder();
  const bucket: Zippable = {};
  const paths = Object.keys(tree).sort();

  for (const p of paths) {
    const file = tree[p];
    if (file.kind === 'text') {
      bucket[p] = encoder.encode(typeof file.content === 'string' ? file.content : '');
    } else {
      if (!readAsset) {
        throw new Error(`toZipBlob: tree contains binary-asset at ${p} but no readAsset was supplied`);
      }
      if (!file.assetId) {
        throw new Error(`toZipBlob: binary-asset at ${p} is missing assetId`);
      }
      const asset = await readAsset(file.assetId);
      if (!asset) {
        throw new Error(`toZipBlob: asset ${file.assetId} not found in IDB`);
      }
      const name = posixBaseName(asset.originalFilename) || posixBaseName(p);
      bucket[`assets/${name}`] = asset.bytes;
    }
  }

  const compressed = zipSync(bucket);
  return new Blob([compressed as BlobPart], { type: 'application/zip' });
};
