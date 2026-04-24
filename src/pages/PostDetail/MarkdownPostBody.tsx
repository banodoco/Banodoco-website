import type { ReactNode } from 'react';
import type { PostDetailItem, PostMediaItem, PostAssetItem } from '@/hooks/usePost';
import { PostBodyRenderer } from '@/components/posts/PostBodyRenderer';

interface MarkdownPostBodyProps {
  post: PostDetailItem;
  mediaById: Record<string, PostMediaItem>;
  assetsById: Record<string, PostAssetItem>;
  emptyFallback?: ReactNode;
}

/**
 * Markdown/legacy body renderer — extracted verbatim from the prior
 * PostDetail markdown rendering path so the dispatcher in `index.tsx` can
 * switch on `post.renderMode` without duplicating renderer wiring.
 */
export function MarkdownPostBody({
  post,
  mediaById,
  assetsById,
  emptyFallback,
}: MarkdownPostBodyProps) {
  if (!post.body && emptyFallback) return <>{emptyFallback}</>;

  return (
    <PostBodyRenderer
      body={post.body}
      mediaById={mediaById}
      assetsById={assetsById}
      variant="detail"
      emptyMessage="This post is empty."
    />
  );
}
