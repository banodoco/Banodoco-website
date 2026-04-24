import { Link } from 'react-router-dom';
import type { PostListItem } from '@/hooks/usePosts';
import { buildPostPath } from '@/lib/routing';

interface PostListCardProps {
  post: PostListItem;
}

function formatPostDate(post: PostListItem): string {
  const timestamp = post.publishedAt ?? post.updatedAt ?? post.createdAt;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const PostListCard = ({ post }: PostListCardProps) => {
  const creatorName = post.creator.displayName ?? post.creator.username ?? 'Unknown';
  const href = buildPostPath(post.id, post.title, post.creator.username);

  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/20"
    >
      {post.creator.avatarUrl ? (
        <img
          src={post.creator.avatarUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full"
          loading="lazy"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <span className="text-sm font-medium text-white/50">
            {creatorName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-white">
          {post.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
          <span className="truncate">{creatorName}</span>
          <span className="text-zinc-700">·</span>
          <span className="shrink-0">{formatPostDate(post)}</span>
          {post.status === 'draft' && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="shrink-0 rounded-full bg-orange-500/15 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-300">
                Draft
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};
