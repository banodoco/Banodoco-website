import { supabase } from '@/lib/supabase';
import { buildBundleUrl } from '@/features/bundlePosts/buildBundleUrl';
import type { BundleManifestV1 } from '@/types/post';
import type { VirtualFileTree } from '@/types/vibe';
import { putAsset as persistAsset } from './db';
import {
  createTree,
  validatePath,
  VIBE_EXTENSION_ALLOWLIST,
  writeBinaryAsset,
  writeFile,
} from './virtualFileTree';

const TEXT_FILE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);
const CSS_URL_RE = /url\(([^)]+)\)/gi;

export const MAX_REHYDRATE_FILES = 50;

export interface RehydratePutAssetInput {
  postDraftId: string;
  assetId: string;
  originalFilename: string;
  mime: string;
  bytes: Uint8Array;
  createdAt: string;
}

export interface RehydrateTreeFromBundleArgs {
  bundleVersionId: string;
  manifest: BundleManifestV1;
  postId: string;
  servingOrigin?: string;
  previewToken?: string | null;
  fetchImpl?: typeof fetch;
  putAsset?: (input: RehydratePutAssetInput) => Promise<void>;
  issuePreviewToken?: (bundleVersionId: string) => Promise<string | null>;
}

export interface RehydrateTreeFromBundleResult {
  tree: VirtualFileTree;
  warnings: string[];
}

interface QueueItem {
  path: string;
  cssDepth: number;
}

export class RehydrateAuthError extends Error {
  readonly code = 'rehydrate_auth_error';

  constructor(message = 'Could not authorize bundle rehydration.') {
    super(message);
    this.name = 'RehydrateAuthError';
  }
}

const inferMime = (path: string, header: string | null): string => {
  if (header) return header;
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.mp4')) return 'video/mp4';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.mp3')) return 'audio/mpeg';
  if (path.endsWith('.wav')) return 'audio/wav';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.ttf')) return 'font/ttf';
  if (path.endsWith('.otf')) return 'font/otf';
  if (path.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const defaultPutAsset = async (input: RehydratePutAssetInput): Promise<void> => {
  const { bytes } = input;
  await persistAsset({
    ...input,
    bytes: toArrayBuffer(bytes),
  });
};

const defaultIssuePreviewToken = async (bundleVersionId: string): Promise<string | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('issue-preview-token', {
    body: { bundleVersionId },
  });
  if (error) throw error;
  const token = (data as { token?: unknown } | null)?.token;
  return typeof token === 'string' && token.length > 0 ? token : null;
};

const buildBundleUrlForOrigin = (
  bundleVersionId: string,
  entry: string,
  previewToken?: string | null,
  servingOrigin?: string,
): string => {
  if (!servingOrigin) return buildBundleUrl(bundleVersionId, entry, previewToken);
  const base = servingOrigin.replace(/\/$/, '');
  const url = `${base}/functions/v1/serve-bundle/${bundleVersionId}/${entry}`;
  if (!previewToken) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(previewToken)}`;
};

const posixDirname = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx + 1);
};

const posixBaseName = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
};

const stripQueryHash = (value: string): string => value.replace(/[?#].*$/, '');

const isRelativeReference = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    return false;
  }
  if (trimmed.startsWith('//')) return false;
  if (/^(?:data|blob|javascript|mailto|tel):/i.test(trimmed)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return true;
};

const resolveBundlePath = (basePath: string, ref: string): string | null => {
  if (!isRelativeReference(ref)) return null;
  const resolved = new URL(ref, `https://bundle.invalid/${posixDirname(basePath)}`).pathname.replace(/^\/+/, '');
  const candidate = stripQueryHash(resolved);
  const validation = validatePath(candidate);
  return validation.ok ? validation.path : null;
};

const extractCssReferences = (css: string, basePath: string): string[] => {
  const refs = new Set<string>();
  CSS_URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = CSS_URL_RE.exec(css)) !== null) {
    const raw = match[1]?.trim().replace(/^['"]|['"]$/g, '');
    if (!raw) continue;
    const resolved = resolveBundlePath(basePath, raw);
    if (resolved) refs.add(resolved);
  }
  return [...refs];
};

const extractHtmlReferences = (html: string, basePath: string): string[] => {
  const refs = new Set<string>();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const selectors: Array<[string, 'src' | 'href']> = [
    ['script[src]', 'src'],
    ['link[href]', 'href'],
    ['img[src]', 'src'],
    ['source[src]', 'src'],
    ['a[href]', 'href'],
  ];

  for (const [selector, attribute] of selectors) {
    for (const node of Array.from(doc.querySelectorAll(selector))) {
      const raw = node.getAttribute(attribute);
      if (!raw) continue;
      const resolved = resolveBundlePath(basePath, raw);
      if (resolved) refs.add(resolved);
    }
  }

  for (const styleEl of Array.from(doc.querySelectorAll('style'))) {
    for (const ref of extractCssReferences(styleEl.textContent ?? '', basePath)) {
      refs.add(ref);
    }
  }

  return [...refs];
};

const probeNeedsAuth = (status: number): boolean => status === 401 || status === 403;

export async function rehydrateTreeFromBundle({
  bundleVersionId,
  manifest,
  postId,
  servingOrigin,
  previewToken,
  fetchImpl = fetch,
  putAsset = defaultPutAsset,
  issuePreviewToken = defaultIssuePreviewToken,
}: RehydrateTreeFromBundleArgs): Promise<RehydrateTreeFromBundleResult> {
  const warnings: string[] = [];
  let tree = createTree();

  const seeded = writeFile(tree, 'post.json', JSON.stringify(manifest, null, 2), {
    mime: 'application/json; charset=utf-8',
  });
  if (!seeded.ok) throw new Error(`Could not seed post.json: ${seeded.error}`);
  tree = seeded.tree;

  let effectivePreviewToken = previewToken ?? null;
  if (!effectivePreviewToken) {
    let tokenIssued = false;
    let tokenFailure: unknown = null;
    try {
      effectivePreviewToken = await issuePreviewToken(bundleVersionId);
      tokenIssued = true;
    } catch (error) {
      tokenFailure = error;
    }

    if (!effectivePreviewToken) {
      try {
        const probe = await fetchImpl(
          buildBundleUrlForOrigin(bundleVersionId, 'post.json', null, servingOrigin),
        );
        if (probeNeedsAuth(probe.status) && (tokenFailure || !tokenIssued)) {
          throw new RehydrateAuthError(
            tokenFailure instanceof Error ? tokenFailure.message : 'Could not authorize bundle rehydration.',
          );
        }
        if (!probe.ok) {
          warnings.push(`Could not probe post.json without a preview token (HTTP ${probe.status}).`);
        }
      } catch (error) {
        if (error instanceof RehydrateAuthError) throw error;
        warnings.push(
          `Could not probe post.json without a preview token: ${
            error instanceof Error ? error.message : 'network error'
          }.`,
        );
      }
    }
  }

  const entryValidation = validatePath(manifest.entry);
  if (!entryValidation.ok) {
    warnings.push(`Skipped bundle entry ${manifest.entry}: ${entryValidation.error}`);
    return { tree, warnings };
  }

  const visited = new Set<string>();
  const queue: QueueItem[] = [{ path: entryValidation.path, cssDepth: 0 }];

  if (manifest.ogImage) {
    const ogValidation = validatePath(manifest.ogImage);
    if (ogValidation.ok) {
      queue.push({ path: ogValidation.path, cssDepth: 0 });
    } else {
      warnings.push(`Skipped ogImage ${manifest.ogImage}: ${ogValidation.error}`);
    }
  }

  let capped = false;
  while (queue.length > 0) {
    if (Object.keys(tree).length >= MAX_REHYDRATE_FILES) {
      capped = true;
      break;
    }

    const next = queue.shift();
    if (!next || visited.has(next.path)) continue;
    visited.add(next.path);

    const extension = next.path.slice(next.path.lastIndexOf('.')).toLowerCase();
    if (!VIBE_EXTENSION_ALLOWLIST.has(extension)) continue;

    let response: Response;
    try {
      response = await fetchImpl(
        buildBundleUrlForOrigin(bundleVersionId, next.path, effectivePreviewToken, servingOrigin),
      );
    } catch (error) {
      warnings.push(
        `Failed to fetch ${next.path}: ${error instanceof Error ? error.message : 'network error'}.`,
      );
      continue;
    }

    if (!response.ok) {
      warnings.push(`Failed to fetch ${next.path}: HTTP ${response.status}.`);
      continue;
    }

    const mime = inferMime(next.path, response.headers.get('content-type'));
    if (TEXT_FILE_EXTENSIONS.has(extension)) {
      const content = await response.text();
      const write = writeFile(tree, next.path, content, { mime });
      if (!write.ok) {
        warnings.push(`Skipped ${next.path}: ${write.error}`);
        continue;
      }
      tree = write.tree;

      if (extension === '.html') {
        for (const ref of extractHtmlReferences(content, next.path)) {
          if (!visited.has(ref)) queue.push({ path: ref, cssDepth: 0 });
        }
      } else if (extension === '.css' && next.cssDepth === 0) {
        for (const ref of extractCssReferences(content, next.path)) {
          if (!visited.has(ref)) queue.push({ path: ref, cssDepth: 1 });
        }
      }
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const assetId = crypto.randomUUID();
    await putAsset({
      postDraftId: postId,
      assetId,
      originalFilename: posixBaseName(next.path),
      mime,
      bytes,
      createdAt: new Date().toISOString(),
    });
    const write = writeBinaryAsset(tree, next.path, assetId, mime);
    if (!write.ok) {
      warnings.push(`Skipped ${next.path}: ${write.error}`);
      continue;
    }
    tree = write.tree;
  }

  if (capped) {
    warnings.push(`Stopped rehydration after reaching ${MAX_REHYDRATE_FILES} files.`);
  }

  return { tree, warnings };
}
