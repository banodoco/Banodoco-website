import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { usePost } from '@/hooks/usePost';
import { buildPostPath, extractEntityIdFromSlug } from '@/lib/routing';
import { deletePost, unpublishPost } from '@/lib/posts';
import { HlsPlayer } from '@/pages/Resources/HlsPlayer';
import { MarkdownPostBody } from './MarkdownPostBody';
import { BundleView } from './BundleView';

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown date';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-24 rounded bg-white/10" />
      <div className="aspect-[16/7] w-full rounded-2xl bg-white/5" />
      <div className="h-10 w-3/4 rounded bg-white/10" />
      <div className="h-5 w-32 rounded bg-white/5" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-white/8" />
        <div className="h-4 w-5/6 rounded bg-white/5" />
        <div className="h-4 w-4/6 rounded bg-white/5" />
      </div>
    </div>
  );
}

/**
 * Post detail dispatcher.
 *
 * Accepts either a slug route (`/posts/:slug`, `/:username/posts/:slug`) or an
 * ID route (`/posts/id/:id`). When a `?preview=<bundleVersionId>` query is
 * present, the canonical slug redirect is intentionally skipped so the
 * preview URL stays stable for the entire preview session.
 *
 * Body rendering branches on `post.renderMode`:
 *   - `'bundle'` → <BundleView />
 *   - `'markdown'` / `'link'` / null → <MarkdownPostBody /> (existing behavior)
 */
const PostDetail = () => {
  const { slug, id: routeId, username } = useParams<{
    slug?: string;
    id?: string;
    username?: string;
  }>();
  const [searchParams] = useSearchParams();
  const previewVersionId = searchParams.get('preview');
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Resolve what to pass into usePost(): prefer the explicit :id, fall back
  // to the slug. usePost internally resolves a slug to an id via
  // extractEntityIdFromSlug, so either shape works.
  const lookupKey = routeId ?? slug;
  const hookOpts = useMemo(
    () => (previewVersionId ? { previewVersionId } : undefined),
    [previewVersionId],
  );
  const { post, mediaById, assetsById, cover, creator, loading, error } = usePost(lookupKey, hookOpts);
  const [deleting, setDeleting] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const routePostId = slug ? extractEntityIdFromSlug(slug) : routeId ?? null;

  // Canonical-slug redirect — skip entirely when a preview token is in-flight,
  // so owners/admins stay on /posts/id/<id>?preview=<ver> for the full preview
  // session.
  useEffect(() => {
    if (previewVersionId) return;
    if (!post || !slug || !routePostId) return;
    if (post.id !== routePostId || post.slug === slug) return;

    navigate(buildPostPath(post.id, post.title, username), { replace: true });
  }, [navigate, post, previewVersionId, routePostId, slug, username]);

  const isOwner = Boolean(user && profile?.memberId && post?.memberId === profile.memberId);
  const creatorName = creator?.displayName ?? creator?.username ?? 'Unknown';

  const handleDelete = async () => {
    if (!post || deleting) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    setDeleting(true);
    setActionError(null);

    try {
      await deletePost(post.id);
      navigate(creator?.profileUrl ?? '/2RP');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete post.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!post || unpublishing) return;
    if (!window.confirm('Move this post back to draft?')) return;

    setUnpublishing(true);
    setActionError(null);

    try {
      await unpublishPost(post.id);
      navigate(`/submit/post/${post.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to unpublish post.');
    } finally {
      setUnpublishing(false);
    }
  };

  const isBundleMode = post?.renderMode === 'bundle';

  // Bundle posts: the bundle IS the page. Render edge-to-edge below the site
  // header, with only a small floating meta strip. No cover, no title block,
  // no post-chrome container — the author's HTML owns the canvas.
  if (isBundleMode && post && !loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-zinc-100 pt-[60px]">
        <BundleView post={post} previewBundle={post.previewBundle} />
        {(isOwner || actionError) && (
          <div className="pointer-events-none fixed right-4 top-[72px] z-30 flex flex-col items-end gap-2">
            {isOwner && (
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-xs text-zinc-300 backdrop-blur">
                <Link
                  to={`/submit/post/${post.id}`}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-white/10"
                  title="Edit"
                >
                  <Edit size={12} /> Edit
                </Link>
                {post.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => void handleUnpublish()}
                    disabled={unpublishing}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {unpublishing ? 'Unpublishing…' : 'Unpublish'}
                  </button>
                )}
              </div>
            )}
            {actionError && (
              <div className="pointer-events-auto rounded-md bg-red-500/10 px-3 py-1 text-xs text-red-200">
                {actionError}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 pb-20 pt-20 md:pt-24">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {creator && (
            <div className="flex min-w-0 items-center gap-3">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creatorName}
                  className="h-8 w-8 rounded-full"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <span className="text-xs font-medium text-white/40">
                    {creatorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {creator.profileUrl ? (
                <Link
                  to={creator.profileUrl}
                  className="max-w-[14rem] truncate text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  {creatorName}
                </Link>
              ) : (
                <span className="max-w-[14rem] truncate text-sm font-medium text-zinc-300">
                  {creatorName}
                </span>
              )}
            </div>
          )}
        </div>

        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="py-20 text-center">
            <p className="mb-4 text-lg text-zinc-400">{error}</p>
            <button
              onClick={() => navigate('/2RP')}
              className="text-sm text-orange-300 transition hover:text-orange-200"
            >
              Back to 2RP
            </button>
          </div>
        )}

        {post && !loading && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-10"
          >
            {!isBundleMode && cover?.thumbnailUrl && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                {cover.hlsUrl ? (
                  <HlsPlayer
                    hlsUrl={cover.hlsUrl}
                    thumbnailUrl={cover.cloudflareThumbnailUrl}
                    autoPlay={false}
                    className="aspect-[16/7] overflow-hidden"
                  />
                ) : cover.type === 'video' && cover.cloudflareThumbnailUrl ? (
                  <video
                    src={cover.cloudflareThumbnailUrl}
                    controls
                    playsInline
                    className="aspect-[16/7] w-full"
                  />
                ) : (
                  <img
                    src={cover.thumbnailUrl}
                    alt={post.title}
                    className="aspect-[16/7] w-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                <span>{formatDate(post.publishedAt ?? post.updatedAt)}</span>
                {post.status !== 'published' && (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
                    {post.status}
                  </span>
                )}
                {previewVersionId && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">
                    preview
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
                {post.title}
              </h1>

              {isOwner && (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/submit/post/${post.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                  >
                    <Edit size={14} />
                    Edit
                  </Link>
                  {post.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => void handleUnpublish()}
                      disabled={unpublishing}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {unpublishing ? 'Unpublishing…' : 'Unpublish'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              )}

              {actionError && (
                <p className="text-sm text-red-300">{actionError}</p>
              )}
            </div>

            {isBundleMode ? (
              <BundleView post={post} previewBundle={post.previewBundle} />
            ) : (
              <MarkdownPostBody post={post} mediaById={mediaById} assetsById={assetsById} />
            )}

          </motion.article>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
