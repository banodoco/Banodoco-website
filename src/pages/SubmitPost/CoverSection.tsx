import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { MediaUploader } from '@/components/forms/MediaUploader';
import type { PostMediaItem } from '@/hooks/usePost';

interface CoverSectionProps {
  coverMediaId: string | null;
  coverPreview: PostMediaItem | null;
  uploading: boolean;
  uploadFiles: File[];
  onUpload: (files: File[]) => void;
  onRemove: () => void;
}

export function CoverSection({
  coverMediaId,
  coverPreview,
  uploading,
  uploadFiles,
  onUpload,
  onRemove,
}: CoverSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasCover = Boolean(coverMediaId && coverPreview?.thumbnailUrl);

  useEffect(() => {
    if (hasCover) setExpanded(false);
  }, [hasCover]);

  if (hasCover) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center gap-3">
          <img
            src={coverPreview!.thumbnailUrl!}
            alt="Cover preview"
            className="h-14 w-24 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-200">Cover image set</p>
            <p className="truncate text-xs text-zinc-500">Shown above the title on the post page</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X size={12} />
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900/50"
      >
        <div className="rounded-lg bg-zinc-900 p-2">
          <ImagePlus size={16} className="text-zinc-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200">Add cover image</p>
          <p className="truncate text-xs text-zinc-500">Displayed above the title on the post page</p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-200">Upload cover image</h2>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Close cover uploader"
        >
          <X size={14} />
        </button>
      </div>
      <MediaUploader
        files={uploadFiles}
        onFilesSelected={onUpload}
        onRemoveFile={() => {
          /* no-op while uploading — the upload flow clears files on completion. */
        }}
        accept="image/*"
        maxFiles={1}
        maxSizeMB={50}
      />
      {uploading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          Uploading cover…
        </div>
      )}
    </div>
  );
}

export default CoverSection;
