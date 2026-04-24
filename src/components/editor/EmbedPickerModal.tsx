import { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { PickerGrid, type EditorPickerItem } from './PickerGrid';

const EmbedPickerCollections = lazy(() => import('./EmbedPickerCollections'));

interface EmbedPickerModalProps {
  open: 'art' | 'resource' | 'media' | null;
  onClose: () => void;
  enableEmbeds: boolean;
  uploadedMedia: EditorPickerItem[];
  inlineUploading: boolean;
  onInlineUpload?: (files: File[]) => Promise<string | null>;
  onInsert: (token: string) => void;
}

export function EmbedPickerModal({
  open,
  onClose,
  enableEmbeds,
  uploadedMedia,
  inlineUploading,
  onInlineUpload,
  onInsert,
}: EmbedPickerModalProps) {
  const [inlineUploadFiles, setInlineUploadFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const title =
    open === 'art' ? 'Insert art piece' : open === 'resource' ? 'Insert resource' : 'Upload & insert media';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#101014] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close picker"
          >
            <X size={16} />
          </button>
        </div>

        {(open === 'art' || open === 'resource') && enableEmbeds && (
          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                Loading…
              </div>
            }
          >
            <EmbedPickerCollections open={open} onInsert={onInsert} />
          </Suspense>
        )}

        {open === 'media' && (
          <div className="space-y-4">
            <MediaUploader
              files={inlineUploadFiles}
              onFilesSelected={async (files) => {
                setInlineUploadFiles(files);
                const inserted = await onInlineUpload?.(files);
                if (inserted !== null && inserted !== undefined) {
                  onInsert(inserted);
                }
              }}
              onRemoveFile={(index) =>
                setInlineUploadFiles((prev) =>
                  prev.filter((_, currentIndex) => currentIndex !== index),
                )
              }
              accept="image/*,video/*"
              maxFiles={1}
              maxSizeMB={50}
            />
            {inlineUploading && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                Uploading inline media…
              </div>
            )}
            {uploadedMedia.length > 0 && (
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Reuse uploaded media
                </h4>
                <PickerGrid
                  items={uploadedMedia}
                  onSelect={(id) => onInsert(`::media[${id}]\n`)}
                  emptyMessage="No uploaded media yet."
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
