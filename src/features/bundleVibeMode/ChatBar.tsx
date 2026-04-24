/**
 * Vibe Mode — bottom-pinned chat command bar.
 *
 * Owns the per-turn input: textarea, voice (mic) button, attach-file button
 * (paperclip), library-picker button, pending-attachments chip list, and
 * send/stop. Attached assets are ingested directly into the virtual file
 * tree (and IDB) and their paths are prepended to the submitted message
 * text so the agent sees exactly which `assets/…` entries the author just
 * added.
 *
 * This replaces the older bottom-strip AssetTray — all asset ingest now
 * lives here, adjacent to the input, leaving the chat column taller.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { BookOpen, Loader2, Mic, Paperclip, Square, X } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import type { VirtualFileTree } from '@/types/vibe';
import type { AssetRecord } from './db';
import { putAsset } from './db';
import { writeBinaryAsset } from './virtualFileTree';
import { processImageFile } from './assetPipeline';
import { LibraryPickerModal, type LibraryPick } from './LibraryPickerModal';
import type { VibeModel } from './useVibeSession';

interface Attachment {
  path: string;  // `assets/foo.png`
  label: string; // short filename for the chip
}

export interface ChatBarProps {
  onSubmit(text: string): void;
  onAbort?(): void;
  /**
   * Images pasted/dropped on the textarea become assets — they're added
   * to the tree via the internal ingest flow, not forwarded up. This
   * prop stays for compatibility but is unused now that attachments
   * live here; editors can delete it on next pass.
   */
  onImagesPasted?(files: File[]): void;
  pending: boolean;
  model: VibeModel;
  sessionTokensUsed: number;
  dailyBudgetRemaining: number;
  budgetState: 'ok' | 'warn' | 'hard';
  placeholder?: string;
  onHardBudgetConfirm?(): boolean | Promise<boolean>;

  /** For asset ingestion — writes to IDB + virtual tree. */
  postDraftId: string;
  memberId?: string;
  tree: VirtualFileTree;
  onCommitTree(nextTree: VirtualFileTree): Promise<void> | void;
  onNotice?(text: string): void;
}

const MIN_ROWS = 3;
const MAX_ROWS = 10;

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

export function ChatBar({
  onSubmit,
  onAbort,
  pending,
  model,
  sessionTokensUsed,
  dailyBudgetRemaining,
  budgetState,
  placeholder = 'Describe the change, or type /undo, /snapshot, /model, /show-code, /export-zip',
  onHardBudgetConfirm,
  postDraftId,
  memberId,
  tree,
  onCommitTree,
  onNotice,
}: ChatBarProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const treeRef = useRef(tree);
  treeRef.current = tree;

  const voice = useVoiceRecording({
    task: 'transcribe_and_write',
    context:
      'This is a chat input for a Vibe-mode coding agent that edits a static web bundle (HTML/CSS/JS + assets). The user is describing a code change. Keep the instruction concise and directly actionable.',
    existingValue: value,
    onResult: (result) => {
      const text = result.prompt || result.transcription;
      if (!text) return;
      setValue((prev) => (prev ? `${prev} ${text}` : text));
      setVoiceError(null);
    },
    onError: setVoiceError,
  });

  // Auto-grow textarea to content with a row cap.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = 20;
    const maxPx = MAX_ROWS * lineHeight + 16;
    ta.style.height = `${Math.min(ta.scrollHeight, maxPx)}px`;
  }, [value]);

  const ingestFile = useCallback(
    async (file: File): Promise<void> => {
      if (!file.type.startsWith('image/')) {
        onNotice?.(`${file.name}: only image assets are supported right now.`);
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

        setAttachments((prev) => [...prev, { path: candidatePath, label: withExt }]);
        onNotice?.(
          processed.wasDownscaled
            ? `Added ${candidatePath} (downscaled)`
            : `Added ${candidatePath}`,
        );
      } catch (err) {
        onNotice?.(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [postDraftId, onCommitTree, onNotice],
  );

  const ingestMany = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        for (const f of files) {
          await ingestFile(f);
        }
      } finally {
        setUploading(false);
      }
    },
    [ingestFile],
  );

  const handleLibraryPick = useCallback(
    async (pick: LibraryPick) => {
      setLibraryOpen(false);
      const title =
        pick.kind === 'art'
          ? pick.item.caption ?? pick.item.title ?? 'art'
          : pick.item.title;
      const thumbUrl =
        pick.kind === 'art' ? pick.item.thumbnailUrl : pick.item.thumbnailUrl;
      if (!thumbUrl) {
        onNotice?.(`"${title}": no thumbnail available to attach.`);
        return;
      }
      setUploading(true);
      try {
        const response = await fetch(thumbUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const slug =
          title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'library';
        const ext = (blob.type.split('/')[1] || 'png').split(';')[0];
        const file = new File([blob], `${slug}.${ext}`, { type: blob.type });
        await ingestFile(file);
      } catch (err) {
        onNotice?.(
          `"${title}": couldn't fetch thumbnail (${
            err instanceof Error ? err.message : String(err)
          }). Try uploading the image directly.`,
        );
      } finally {
        setUploading(false);
      }
    },
    [ingestFile, onNotice],
  );

  const removeAttachment = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
  }, []);

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    if (budgetState === 'hard' && onHardBudgetConfirm) {
      const ok = await onHardBudgetConfirm();
      if (!ok) return;
    }

    const prefix =
      attachments.length > 0
        ? `I've attached ${
            attachments.length === 1 ? 'this asset' : 'these assets'
          } to the bundle (reference via the relative path under \`assets/\`):\n${attachments
            .map((a) => `- \`${a.path}\``)
            .join('\n')}\n\n`
        : '';

    onSubmit(`${prefix}${trimmed}`);
    setValue('');
    setAttachments([]);
  }, [value, pending, budgetState, onHardBudgetConfirm, onSubmit, attachments]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  const harvestImages = useCallback(
    (items: DataTransferItemList | null, files: FileList | null): File[] => {
      const out: File[] = [];
      const seen = new Set<File>();
      if (items) {
        for (const item of Array.from(items)) {
          if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
          const f = item.getAsFile();
          if (f && !seen.has(f)) {
            seen.add(f);
            out.push(f);
          }
        }
      }
      if (files) {
        for (const f of Array.from(files)) {
          if (!f.type.startsWith('image/')) continue;
          if (!seen.has(f)) {
            seen.add(f);
            out.push(f);
          }
        }
      }
      return out;
    },
    [],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const images = harvestImages(
        e.clipboardData?.items ?? null,
        e.clipboardData?.files ?? null,
      );
      if (images.length > 0) {
        e.preventDefault();
        void ingestMany(images);
      }
    },
    [harvestImages, ingestMany],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLTextAreaElement>) => {
      setDragOver(false);
      const images = harvestImages(
        e.dataTransfer?.items ?? null,
        e.dataTransfer?.files ?? null,
      );
      if (images.length > 0) {
        e.preventDefault();
        void ingestMany(images);
      }
    },
    [harvestImages, ingestMany],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setDragOver(true);
    }
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void ingestMany(Array.from(files));
      }
      e.target.value = '';
    },
    [ingestMany],
  );

  const footer = useMemo(() => {
    const budgetColor =
      budgetState === 'hard'
        ? 'text-red-400'
        : budgetState === 'warn'
          ? 'text-amber-400'
          : 'text-zinc-500';
    return (
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-500">
        <span className="font-mono">{model}</span>
        <span className={budgetColor}>
          session: {sessionTokensUsed.toLocaleString()} · daily remaining:{' '}
          {dailyBudgetRemaining.toLocaleString()}
        </span>
      </div>
    );
  }, [model, sessionTokensUsed, dailyBudgetRemaining, budgetState]);

  const iconBtnBase =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const idleBtn = `${iconBtnBase} border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100`;

  const micButton = (() => {
    if (voice.isProcessing) {
      return (
        <button type="button" disabled className={`${iconBtnBase} border-zinc-700 text-zinc-400`} title="Transcribing…">
          <Loader2 size={16} className="animate-spin" />
        </button>
      );
    }
    if (voice.isRecording) {
      return (
        <button
          type="button"
          onClick={voice.stopRecording}
          className={`${iconBtnBase} relative border-red-500/40 bg-red-500/10 text-red-200 hover:border-red-400`}
          title={`Recording — ${voice.remainingSeconds}s left. Click to stop.`}
        >
          <Square size={14} className="fill-current" />
          <span className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
            {voice.remainingSeconds}
          </span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={voice.startRecording}
        disabled={pending}
        className={idleBtn}
        title="Hold to speak — we'll transcribe and clean up what you said."
      >
        <Mic size={16} />
      </button>
    );
  })();

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/80">
      {footer}
      {voiceError && <div className="px-3 pt-1 text-[11px] text-red-300">{voiceError}</div>}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {attachments.map((a) => (
            <span
              key={a.path}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
              title={a.path}
            >
              <Paperclip size={12} className="text-zinc-400" />
              <span className="max-w-[200px] truncate">{a.label}</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.path)}
                className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                aria-label={`Remove ${a.label}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={`flex items-end gap-2 p-3 ${dragOver ? 'bg-emerald-500/5' : ''}`}>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          placeholder={placeholder}
          rows={MIN_ROWS}
          disabled={pending}
          className={`flex-1 resize-none rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 ${
            dragOver
              ? 'border-emerald-500/70 ring-1 ring-emerald-500/40'
              : 'border-zinc-800 focus:border-zinc-600'
          }`}
        />

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending || uploading}
            className={idleBtn}
            title="Attach image assets — drop or paste into the text box too."
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            disabled={pending}
            className={idleBtn}
            title="Browse your library (art pieces & resources) and attach one."
          >
            <BookOpen size={16} />
          </button>
          {micButton}
        </div>

        {pending ? (
          <button
            type="button"
            onClick={onAbort}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!value.trim()}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            Send
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFileInputChange}
      />
      <LibraryPickerModal
        open={libraryOpen}
        memberId={memberId}
        onClose={() => setLibraryOpen(false)}
        onPick={(pick) => void handleLibraryPick(pick)}
      />
    </div>
  );
}
