import { useState } from 'react';
import { Film, ImageIcon, Loader2, MoveDown, MoveUp, Star, Trash2 } from 'lucide-react';
import { MediaUploader } from '@/components/forms/MediaUploader';

export interface GalleryEditorItem {
  mediaId: string;
  type: 'image' | 'video';
  previewUrl: string;
  thumbnailUrl?: string | null;
  hlsUrl?: string | null;
}

interface GalleryMediaEditorProps {
  items: GalleryEditorItem[];
  onChange: (items: GalleryEditorItem[]) => void;
  onUpload: (files: File[]) => Promise<GalleryEditorItem[]>;
  primaryMediaId: string | null;
  onPrimaryChange: (mediaId: string | null) => void;
  disabled?: boolean;
}

function moveItem(items: GalleryEditorItem[], fromIndex: number, direction: -1 | 1): GalleryEditorItem[] {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= items.length) return items;

  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

export function GalleryMediaEditor({
  items,
  onChange,
  onUpload,
  primaryMediaId,
  onPrimaryChange,
  disabled = false,
}: GalleryMediaEditorProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setPendingFiles((current) => [...current, ...files]);
    setError(null);
    setUploading(true);

    try {
      const uploaded = await onUpload(files);
      const next = [...items, ...uploaded];
      onChange(next);
      if (!primaryMediaId && uploaded[0]) {
        onPrimaryChange(uploaded[0].mediaId);
      }
      setPendingFiles([]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload gallery media.');
      setPendingFiles([]);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (mediaId: string) => {
    const next = items.filter((item) => item.mediaId !== mediaId);
    onChange(next);
    if (primaryMediaId === mediaId) {
      onPrimaryChange(next[0]?.mediaId ?? null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Media</h2>
          <p className="mt-1 text-xs text-zinc-500">Upload images or videos, reorder them, and pick the primary item for hero + share previews.</p>
        </div>
      </div>

      <MediaUploader
        files={pendingFiles}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={(index) => {
          setPendingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
        }}
        accept="image/*,video/*"
        maxFiles={8}
        maxSizeMB={200}
      />

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          Uploading media...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => {
            const previewUrl = item.thumbnailUrl ?? item.previewUrl;
            const isPrimary = primaryMediaId === item.mediaId;

            return (
              <div
                key={item.mediaId}
                className={`grid gap-3 rounded-xl border p-3 md:grid-cols-[6rem,1fr,auto] ${
                  isPrimary
                    ? 'border-orange-500/40 bg-orange-500/[0.05]'
                    : 'border-white/8 bg-black/10'
                }`}
              >
                <div className="overflow-hidden rounded-lg bg-zinc-950">
                  {item.type === 'video' ? (
                    previewUrl ? (
                      <video
                        src={previewUrl}
                        className="h-24 w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center text-zinc-500">
                        <Film size={18} />
                      </div>
                    )
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-24 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-24 items-center justify-center text-zinc-500">
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    {item.type === 'video' ? <Film size={14} /> : <ImageIcon size={14} />}
                    Item {index + 1}
                    {isPrimary && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-200">
                        <Star size={10} />
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 break-all">{item.mediaId}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPrimaryChange(item.mediaId)}
                    disabled={disabled || isPrimary}
                    className={`inline-flex items-center justify-center rounded-lg border p-2 transition-colors disabled:cursor-not-allowed ${
                      isPrimary
                        ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
                        : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                    aria-label={isPrimary ? 'Primary media' : 'Make primary'}
                    aria-pressed={isPrimary}
                  >
                    <Star size={14} fill={isPrimary ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveItem(items, index, -1))}
                    disabled={disabled || index === 0}
                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Move gallery item ${index + 1} up`}
                  >
                    <MoveUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveItem(items, index, 1))}
                    disabled={disabled || index === items.length - 1}
                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Move gallery item ${index + 1} down`}
                  >
                    <MoveDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.mediaId)}
                    disabled={disabled}
                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Remove gallery item ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GalleryMediaEditor;
