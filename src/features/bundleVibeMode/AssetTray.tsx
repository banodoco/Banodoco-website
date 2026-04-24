/**
 * Vibe Mode — asset ingest tray.
 *
 * Bottom-strip region that accepts images via drop, paste, an embedded
 * MediaUploader, and the `LibraryPickerModal`. Each accepted image is:
 *   1. Run through the client downscale pipeline (`processImageFile` —
 *      >5MB OR >1920px triggers a canvas shrink to webp/jpeg).
 *   2. Minted a UUIDv4 `assetId` and stored in IndexedDB under the
 *      composite key `[postDraftId, assetId]`.
 *   3. Written into the tree as a `binary-asset` entry at
 *      `assets/<safe-filename>` via `writeBinaryAsset` + `commitTree`.
 *
 * Library picks (art / community resource) currently skip the download
 * path — the picker returns a thumbnail URL, and the tree receives a
 * placeholder `binary-asset` with a synthetic id. A follow-up can add
 * background fetch + IDB store; for T13 the picker is wired end-to-end
 * but a warning notice is surfaced if a remote pick is made. That's
 * enough to exercise the selection UX without pulling large CDN assets
 * through a proxy inside this batch.
 */

import { useCallback, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { MediaUploader } from '@/components/forms/MediaUploader';
import type { VirtualFileTree } from '@/types/vibe';
import type { AssetRecord } from './db';
import { putAsset } from './db';
import { writeBinaryAsset } from './virtualFileTree';
import { processImageFile } from './assetPipeline';
import { LibraryPickerModal, type LibraryPick } from './LibraryPickerModal';

export interface AssetTrayProps {
  postDraftId: string;
  tree: VirtualFileTree;
  memberId?: string;
  /** Commit a new tree after an asset is added. */
  onCommitTree(nextTree: VirtualFileTree): Promise<void> | void;
  /** Surface a transient message (e.g., “Added foo.png”, or a quota warning). */
  onNotice?(text: string): void;
}

const newAssetId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const sanitizeBaseName = (name: string): string => {
  const base = name.replace(/^.*[\\/]/, '').toLowerCase();
  const replaced = base.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return replaced || 'asset';
};

const extensionForMime = (mime: string): string => {
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/svg+xml') return '.svg';
  return '.bin';
};

const ensureUniquePath = (tree: VirtualFileTree, base: string): string => {
  if (!tree[base]) return base;
  const dotIdx = base.lastIndexOf('.');
  const stem = dotIdx === -1 ? base : base.slice(0, dotIdx);
  const ext = dotIdx === -1 ? '' : base.slice(dotIdx);
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${stem}-${i}${ext}`;
    if (!tree[candidate]) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
};

export function AssetTray({
  postDraftId,
  tree,
  memberId,
  onCommitTree,
  onNotice,
}: AssetTrayProps) {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const treeRef = useRef(tree);
  treeRef.current = tree;

  const ingestFile = useCallback(
    async (file: File): Promise<void> => {
      if (!file.type.startsWith('image/')) {
        onNotice?.(`${file.name}: only image assets are supported in Vibe Mode (this batch).`);
        return;
      }
      try {
        const processed = await processImageFile(file);
        const assetId = newAssetId();
        const safeBase = sanitizeBaseName(processed.originalFilename);
        const withExt = /\.[a-z0-9]+$/i.test(safeBase)
          ? safeBase.replace(/\.[a-z0-9]+$/i, extensionForMime(processed.mime))
          : `${safeBase}${extensionForMime(processed.mime)}`;
        const candidatePath = ensureUniquePath(treeRef.current, `assets/${withExt}`);

        const record: AssetRecord = {
          postDraftId,
          assetId,
          originalFilename: withExt,
          mime: processed.mime,
          bytes: processed.bytes,
          createdAt: new Date().toISOString(),
        };
        await putAsset(record);

        const write = writeBinaryAsset(treeRef.current, candidatePath, assetId, processed.mime);
        if (!write.ok) {
          onNotice?.(`${file.name}: ${write.error}`);
          return;
        }
        await onCommitTree(write.tree);
        onNotice?.(
          processed.wasDownscaled
            ? `Added ${candidatePath} (downscaled)`
            : `Added ${candidatePath}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onNotice?.(`${file.name}: ${msg}`);
      }
    },
    [postDraftId, onCommitTree, onNotice],
  );

  const ingestMany = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;
      setBusy(true);
      try {
        for (const f of files) {
          await ingestFile(f);
        }
      } finally {
        setBusy(false);
      }
    },
    [ingestFile],
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setStagedFiles(files);
      void ingestMany(files).then(() => setStagedFiles([]));
    },
    [ingestMany],
  );

  const handleRemoveStaged = useCallback((index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) void ingestMany(files);
    },
    [ingestMany],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) {
        e.preventDefault();
        void ingestMany(files);
      }
    },
    [ingestMany],
  );

  const handleLibraryPick = useCallback(
    (pick: LibraryPick) => {
      // Placeholder behaviour — see file header comment.
      const title = pick.kind === 'art' ? pick.item.title ?? 'art' : pick.item.title;
      onNotice?.(
        `Picked "${title}" from library. Remote-asset fetch lands in a follow-up; drop/paste images for now.`,
      );
    },
    [onNotice],
  );

  const assetCount = Object.values(tree).filter((f) => f.kind === 'binary-asset').length;

  return (
    <div
      className={`flex flex-col gap-2 border-t border-zinc-800 bg-zinc-950/60 p-3 ${
        dragOver ? 'ring-2 ring-inset ring-emerald-500/60' : ''
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onPaste={onPaste}
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Assets</span>
          <span className="ml-2 text-zinc-500">
            {assetCount} in bundle · drop, paste, upload, or pick from library
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            Library…
          </button>
          {busy && <span className="text-xs text-zinc-500">Processing…</span>}
        </div>
      </div>
      <MediaUploader
        files={stagedFiles}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleRemoveStaged}
        accept="image/*"
        maxFiles={10}
        maxSizeMB={50}
      />
      <LibraryPickerModal
        open={libraryOpen}
        memberId={memberId}
        onClose={() => setLibraryOpen(false)}
        onPick={handleLibraryPick}
      />
    </div>
  );
}
