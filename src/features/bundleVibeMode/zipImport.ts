import { unzipSync } from 'fflate';
import type { VirtualFileTree } from '@/types/vibe';
import { putAsset as persistAsset } from './db';
import {
  createTree,
  validatePath,
  VIBE_EXTENSION_ALLOWLIST,
  VIBE_MAX_FILE_BYTES,
  writeBinaryAsset,
  writeFile,
} from './virtualFileTree';

const TEXT_FILE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);
const decoder = new TextDecoder();

export interface ZipImportPutAssetInput {
  postDraftId: string;
  assetId: string;
  originalFilename: string;
  mime: string;
  bytes: Uint8Array;
  createdAt: string;
}

export interface ImportZipToTreeArgs {
  zipBytes: ArrayBuffer | Uint8Array;
  postId: string;
  putAsset?: (input: ZipImportPutAssetInput) => Promise<void>;
}

export interface ImportZipToTreeResult {
  tree: VirtualFileTree;
  warnings: string[];
}

const inferMime = (path: string): string => {
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

const posixBaseName = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
};

const defaultPutAsset = async (input: ZipImportPutAssetInput): Promise<void> => {
  const { bytes } = input;
  await persistAsset({
    ...input,
    bytes: toArrayBuffer(bytes),
  });
};

export async function importZipToTree({
  zipBytes,
  postId,
  putAsset = defaultPutAsset,
}: ImportZipToTreeArgs): Promise<ImportZipToTreeResult> {
  const warnings: string[] = [];
  let tree = createTree();
  const entries = unzipSync(new Uint8Array(zipBytes));

  for (const [rawPath, bytes] of Object.entries(entries)) {
    const validation = validatePath(rawPath);
    if (!validation.ok) {
      warnings.push(`Skipped ${rawPath}: ${validation.error}`);
      continue;
    }

    const { path, extension } = validation;
    if (!VIBE_EXTENSION_ALLOWLIST.has(extension)) {
      warnings.push(`Skipped ${path}: extension ${extension} is not allowed`);
      continue;
    }
    if (bytes.byteLength > VIBE_MAX_FILE_BYTES) {
      warnings.push(`Skipped ${path}: exceeds ${VIBE_MAX_FILE_BYTES} bytes`);
      continue;
    }

    const mime = inferMime(path);
    if (TEXT_FILE_EXTENSIONS.has(extension)) {
      const write = writeFile(tree, path, decoder.decode(bytes), { mime });
      if (!write.ok) {
        warnings.push(`Skipped ${path}: ${write.error}`);
        continue;
      }
      tree = write.tree;
      continue;
    }

    const assetId = crypto.randomUUID();
    await putAsset({
      postDraftId: postId,
      assetId,
      originalFilename: posixBaseName(path),
      mime,
      bytes,
      createdAt: new Date().toISOString(),
    });
    const write = writeBinaryAsset(tree, path, assetId, mime);
    if (!write.ok) {
      warnings.push(`Skipped ${path}: ${write.error}`);
      continue;
    }
    tree = write.tree;
  }

  return { tree, warnings };
}
