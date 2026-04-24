import { Eye } from 'lucide-react';
import { PostBodyRenderer } from '@/components/posts/PostBodyRenderer';
import type { PostAssetItem, PostMediaItem } from '@/hooks/usePost';

interface PreviewPanelProps {
  body: string;
  mediaById: Record<string, PostMediaItem>;
  assetsById: Record<string, PostAssetItem>;
}

export function PreviewPanel({ body, mediaById, assetsById }: PreviewPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Eye size={16} />
        Live Preview
      </div>
      <PostBodyRenderer
        body={body}
        mediaById={mediaById}
        assetsById={assetsById}
        variant="preview"
        emptyMessage="Preview updates as you type."
        inert
      />
    </div>
  );
}
