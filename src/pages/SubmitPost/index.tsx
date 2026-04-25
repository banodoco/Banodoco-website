import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Loader2,
  Newspaper,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { RequireApproved } from '@/components/auth/RequireApproved';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { useAuth } from '@/contexts/useAuth';
import { useArtPieces, type ArtPieceItem } from '@/hooks/useArtPieces';
import { useCommunityResources, type CommunityResourceItem } from '@/hooks/useCommunityResources';
import { usePost, type PostAssetItem, type PostMediaItem } from '@/hooks/usePost';
import { extractEmbedRefs } from '@/lib/postMarkdown';
import {
  createDraft,
  deletePost,
  publishPost,
  saveDraft,
  syncEmbeds,
  unpublishPost,
  uploadPostMedia,
} from '@/lib/posts';
import { buildEntitySlug, profilePath } from '@/lib/routing';
import type { BundleManifestV1, PostStatus } from '@/types/post';
import type { VirtualFileTree } from '@/types/vibe';
import { BundleCanvas } from '@/features/bundleVibeMode/BundleCanvas';
import { InteractiveEditorLayout } from '@/features/bundleVibeMode/InteractiveEditorLayout';
import { useVibeSession } from '@/features/bundleVibeMode/useVibeSession';
import { CoverSection } from './CoverSection';
import { readStoredEditorMode, type EditorMode } from './editorMode';

const BundleAgentEditor = lazy(() => import('@/features/bundleVibeMode/BundleAgentEditor'));

const SAVE_DEBOUNCE_MS = 800;

interface CoverOption {
  id: string;
  label: string;
  thumbnailUrl: string | null;
  mediaType: string | null;
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function artPieceToMedia(piece: ArtPieceItem): PostMediaItem {
  return {
    id: piece.id,
    type: piece.mediaType,
    thumbnailUrl: piece.thumbnailUrl,
    cloudflareThumbnailUrl: piece.cloudflareThumbnailUrl,
    hlsUrl: piece.hlsUrl,
    description: piece.caption ?? piece.title,
    createdAt: piece.createdAt,
    memberId: piece.memberId,
  };
}

function coverOptionToMedia(option: CoverOption): PostMediaItem {
  return {
    id: option.id,
    type: option.mediaType,
    thumbnailUrl: option.thumbnailUrl,
    cloudflareThumbnailUrl: option.thumbnailUrl,
    hlsUrl: null,
    description: option.label,
    createdAt: new Date().toISOString(),
    memberId: null,
  };
}

function resourceToAsset(resource: CommunityResourceItem): PostAssetItem {
  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    description: resource.description,
    primaryUrl: resource.primaryUrl,
    resourceType: resource.resourceType,
    thumbnailUrl: resource.thumbnailUrl,
    createdAt: resource.createdAt,
    memberId: null,
    creator: resource.creator,
  };
}

function formatSavedLabel(lastSavedAt: number | null, now: number): string {
  if (!lastSavedAt) return 'Unsaved';
  const diffSeconds = Math.max(0, Math.floor((now - lastSavedAt) / 1000));
  return `Saved ${diffSeconds}s ago`;
}

function buildBundleManifest(title: string): BundleManifestV1 {
  return {
    schemaVersion: 1,
    title,
    entry: 'index.html',
    source: 'vibe',
    layout: { mode: 'inline-auto', minHeight: 420, maxHeight: 1600 },
  };
}

function resolveBundleManifest(tree: VirtualFileTree, title: string): BundleManifestV1 {
  const file = tree['post.json'];
  if (file?.kind === 'text' && typeof file.content === 'string') {
    try {
      const parsed = JSON.parse(file.content) as Partial<BundleManifestV1>;
      if (parsed && typeof parsed === 'object' && parsed.entry && parsed.layout) {
        return {
          schemaVersion: 1,
          title: parsed.title ?? title,
          summary: parsed.summary,
          entry: parsed.entry,
          ogImage: parsed.ogImage,
          source: parsed.source ?? 'vibe',
          layout: parsed.layout,
          capabilities: parsed.capabilities,
          authoredAt: parsed.authoredAt,
        };
      }
    } catch {
      // fall back to the default authoring manifest
    }
  }

  return buildBundleManifest(title);
}

function SubmitPostForm() {
  const navigate = useNavigate();
  const { postId: routePostId } = useParams<{ postId: string }>();
  const { user, profile } = useAuth();
  const isEditing = Boolean(routePostId);

  const {
    post: existingPost,
    mediaById,
    loading: existingPostLoading,
    error: existingPostError,
    refetch,
  } = usePost(routePostId);

  const { artPieces } = useArtPieces(profile?.memberId ?? undefined);
  const { resources } = useCommunityResources(profile?.memberId ?? undefined);
  const hydratedPostIdRef = useRef<string | null>(null);
  const changeVersionRef = useRef(0);

  const [postId, setPostId] = useState<string | null>(routePostId ?? null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>(() => (routePostId ? readStoredEditorMode(routePostId) : 'text'));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<PostStatus>('draft');
  const [error, setError] = useState<string | null>(null);
  const [coverUploadFiles, setCoverUploadFiles] = useState<File[]>([]);
  const [coverUploading, setCoverUploading] = useState(false);
  const [sessionMedia, setSessionMedia] = useState<Record<string, CoverOption>>({});
  const [now, setNow] = useState(Date.now());
  const vibeSession = useVibeSession(mode === 'interactive' && postId ? postId : null);

  useEffect(() => {
    if (!lastSavedAt && !saving) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [lastSavedAt, saving]);

  useEffect(() => {
    if (!existingPost || hydratedPostIdRef.current === existingPost.id) {
      return;
    }

    hydratedPostIdRef.current = existingPost.id;
    setPostId(existingPost.id);
    setTitle(existingPost.title ?? '');
    setSlug(existingPost.slug ?? buildEntitySlug(existingPost.title, existingPost.id));
    setBody(existingPost.body ?? '');
    setCoverMediaId(existingPost.coverMediaId ?? null);
    setStatus(existingPost.status);
    setDirty(false);
    setError(null);
    setLastSavedAt(Date.now());
    setMode(readStoredEditorMode(existingPost.id));
  }, [existingPost]);

  // Persist the authoring-mode preference per draft id whenever it changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!postId) return;
    window.localStorage.setItem(`vibe:authoring-mode:${postId}`, mode);
  }, [postId, mode]);

  const markDirty = useCallback(() => {
    changeVersionRef.current += 1;
    setDirty(true);
  }, []);

  const persistDraft = useCallback(async () => {
    if (!profile?.memberId || publishing || deleting || togglingStatus) {
      return;
    }

    const snapshotVersion = changeVersionRef.current;
    setSaving(true);
    setError(null);

    try {
      let resolvedPostId = postId;
      if (!resolvedPostId) {
        resolvedPostId = await createDraft({
          title: title.trim() || 'Untitled Post',
          memberId: profile.memberId,
        });
        setPostId(resolvedPostId);
        navigate(`/submit/post/${resolvedPostId}`, { replace: true });
      }

      // In Vibe/Bundle modes, body + coverMediaId are owned by the editor
      // surface itself (IDB for Vibe, post_bundles row for Bundle). Only the
      // title belongs to the posts row; skip body writes so autosave cannot
      // clobber the Vibe session or a shipped bundle's authoritative state.
      const resolvedSlug = resolvedPostId ? (slug || buildEntitySlug(title, resolvedPostId)) : slug;
      const draftPatch =
        mode === 'interactive'
          ? { title, slug: resolvedSlug, coverMediaId }
          : { title, body, coverMediaId };

      await saveDraft(resolvedPostId, draftPatch, { currentStatus: status });

      if (snapshotVersion === changeVersionRef.current) {
        setDirty(false);
      }
      setLastSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }, [
    body,
    coverMediaId,
    deleting,
    mode,
    navigate,
    postId,
    profile?.memberId,
    publishing,
    slug,
    status,
    title,
    togglingStatus,
  ]);

  useEffect(() => {
    if (!dirty || !profile?.memberId || saving || publishing || deleting || togglingStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void persistDraft();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    deleting,
    dirty,
    persistDraft,
    profile?.memberId,
    publishing,
    saving,
    togglingStatus,
  ]);

  const handleInteractiveSaveDraft = useCallback(async () => {
    await persistDraft();
  }, [persistDraft]);

  const handleInteractiveTitleChange = useCallback((nextTitle: string) => {
    setTitle(nextTitle);
    markDirty();
  }, [markDirty]);

  const handleInteractiveSlugChange = useCallback((nextSlug: string) => {
    setSlug(nextSlug);
    markDirty();
  }, [markDirty]);

  const handleInteractiveCoverRemove = useCallback(() => {
    setCoverMediaId(null);
    markDirty();
  }, [markDirty]);

  const handleInlineUpload = useCallback(
    async (incoming: File[]) => {
      if (inlineUploading || !incoming[0] || !user || !profile?.memberId) {
        return;
      }

      const file = incoming[0];
      setInlineUploading(true);
      setError(null);

      try {
        const uploaded = await uploadPostMedia(file, user.id, profile.memberId);
        const label = uploaded.type === 'video' ? `Uploaded video ${shortId(uploaded.id)}` : `Uploaded image ${shortId(uploaded.id)}`;

        setSessionMedia((prev) => ({
          ...prev,
          [uploaded.id]: {
            id: uploaded.id,
            label,
            thumbnailUrl: uploaded.url,
            mediaType: uploaded.type,
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload inline media.');
      } finally {
        setInlineUploading(false);
      }
    },
    [inlineUploading, profile?.memberId, user],
  );

  const handlePublish = useCallback(async () => {
    if (!profile?.memberId) {
      setError('You must be signed in with a linked Discord account to publish a post.');
      return;
    }

    if (!title.trim()) {
      setError('Title is required to publish.');
      return;
    }

    setPublishing(true);
    setSaving(true);
    setError(null);

    try {
      const resolvedPostId =
        postId
        ?? await createDraft({
          title: title.trim(),
          memberId: profile.memberId,
        });

      if (!postId) {
        setPostId(resolvedPostId);
        setSlug(buildEntitySlug(title.trim(), resolvedPostId));
        navigate(`/submit/post/${resolvedPostId}`, { replace: true });
      }

      const resolvedSlug = slug || buildEntitySlug(title, resolvedPostId);
      await saveDraft(
        resolvedPostId,
        mode === 'interactive'
          ? {
              title,
              slug: resolvedSlug,
              coverMediaId,
            }
          : {
              title,
              body,
              coverMediaId,
            },
        { currentStatus: status },
      );

      if (mode !== 'interactive') {
        await syncEmbeds(resolvedPostId, extractEmbedRefs(body));
      }

      const { slug: publishedSlug } = await publishPost(resolvedPostId, { title });
      setStatus('published');
      setDirty(false);
      setLastSavedAt(Date.now());
      navigate(`/posts/${publishedSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post.');
    } finally {
      setPublishing(false);
      setSaving(false);
    }
  }, [body, coverMediaId, mode, navigate, postId, profile?.memberId, slug, status, title]);

  const handleUnpublish = useCallback(async () => {
    if (!postId) return;
    if (!window.confirm('Move this post back to draft?')) return;

    setTogglingStatus(true);
    setError(null);

    try {
      // Vibe posts' body lives in IDB, not posts.body — title-only patch so
      // we don't blow away the Vibe session state on unpublish.
      const unpublishPatch =
        mode === 'interactive'
          ? { title, slug: postId ? (slug || buildEntitySlug(title, postId)) : slug, coverMediaId }
          : { title, body, coverMediaId };
      await saveDraft(postId, unpublishPatch, { currentStatus: status });
      await unpublishPost(postId);
      setStatus('draft');
      setDirty(false);
      setLastSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish post.');
    } finally {
      setTogglingStatus(false);
    }
  }, [body, coverMediaId, mode, postId, slug, status, title]);

  const handleDelete = useCallback(async () => {
    if (!postId) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    setDeleting(true);
    setError(null);

    try {
      await deletePost(postId);
      const fallbackPath = profile?.discordUsername ? profilePath(profile.discordUsername) : '/2RP';
      navigate(fallbackPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post.');
    } finally {
      setDeleting(false);
    }
  }, [navigate, postId, profile?.discordUsername]);

  const handleCoverUpload = useCallback(
    async (incoming: File[]) => {
      if (coverUploading || !incoming[0] || !user || !profile?.memberId) return;

      const file = incoming[0];
      setCoverUploadFiles([file]);
      setCoverUploading(true);
      setError(null);

      try {
        const uploaded = await uploadPostMedia(file, user.id, profile.memberId);
        setSessionMedia((prev) => ({
          ...prev,
          [uploaded.id]: {
            id: uploaded.id,
            label: `Cover image ${shortId(uploaded.id)}`,
            thumbnailUrl: uploaded.url,
            mediaType: uploaded.type,
          },
        }));
        setCoverMediaId(uploaded.id);
        markDirty();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload cover image.');
      } finally {
        setCoverUploading(false);
        setCoverUploadFiles([]);
      }
    },
    [coverUploading, markDirty, profile?.memberId, user],
  );

  const uploadedMediaButtons = useMemo(() => {
    const merged = new Map<string, CoverOption>();

    Object.values(mediaById).forEach((media) => {
      merged.set(media.id, {
        id: media.id,
        label: media.description || `Media ${shortId(media.id)}`,
        thumbnailUrl: media.thumbnailUrl,
        mediaType: media.type,
      });
    });

    Object.values(sessionMedia).forEach((media) => {
      merged.set(media.id, media);
    });

    return [...merged.values()];
  }, [mediaById, sessionMedia]);

  /** Embed resolution maps for the live preview — merge every source we know about
   *  so `::art[…]`, `::media[…]`, and `::resource[…]` tokens render against real data. */
  const previewMediaById = useMemo<Record<string, PostMediaItem>>(() => {
    const map: Record<string, PostMediaItem> = { ...mediaById };
    for (const piece of artPieces) {
      map[piece.id] = artPieceToMedia(piece);
    }
    for (const session of Object.values(sessionMedia)) {
      map[session.id] = coverOptionToMedia(session);
    }
    return map;
  }, [artPieces, mediaById, sessionMedia]);

  const previewAssetsById = useMemo<Record<string, PostAssetItem>>(() => {
    const map: Record<string, PostAssetItem> = {};
    for (const resource of resources) {
      map[resource.id] = resourceToAsset(resource);
    }
    return map;
  }, [resources]);

  const coverPreview = useMemo<PostMediaItem | null>(() => {
    if (!coverMediaId) return null;
    return previewMediaById[coverMediaId] ?? null;
  }, [coverMediaId, previewMediaById]);

  const saveLabel = saving
    ? 'Saving…'
    : formatSavedLabel(lastSavedAt, now);

  const isExistingBundlePost = existingPost?.renderMode === 'bundle';
  const isBusy = saving || publishing || deleting || togglingStatus || inlineUploading;
  const showEditError = isEditing && !existingPostLoading && existingPostError;
  const showMissingEditPost = isEditing && !existingPostLoading && !existingPost && !existingPostError;

  useEffect(() => {
    if (isExistingBundlePost) {
      setMode('interactive');
    }
  }, [isExistingBundlePost]);

  const handleModeChange = useCallback(
    async (nextMode: EditorMode) => {
      if (nextMode === 'text') {
        setMode(nextMode);
        return;
      }

      if (postId) {
        setMode(nextMode);
        return;
      }

      if (!profile?.memberId || saving || publishing || deleting || togglingStatus) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newPostId = await createDraft({
          title: title.trim() || 'Untitled interactive post',
          memberId: profile.memberId,
        });

        setPostId(newPostId);
        setSlug(buildEntitySlug(title.trim() || 'Untitled interactive post', newPostId));
        setLastSavedAt(Date.now());
        navigate(`/submit/post/${newPostId}`, { replace: true });
        setMode(nextMode);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create an interactive draft.');
      } finally {
        setSaving(false);
      }
    },
    [
      deleting,
      navigate,
      postId,
      profile?.memberId,
      publishing,
      saving,
      title,
      togglingStatus,
    ],
  );

  const containerClass = 'max-w-[1400px] mx-auto px-6 pt-0 pb-16 md:pt-[60px] sm:pb-24';

  const shippedBundle = useMemo(() => {
    if (!existingPost?.activeBundle) return null;
    return {
      versionId: existingPost.activeBundle.id,
      version: existingPost.activeBundle.version,
      manifest: existingPost.activeBundle.manifest,
    };
  }, [existingPost?.activeBundle]);

  const bundleManifest = useMemo(
    () => resolveBundleManifest(vibeSession.tree, title || 'Untitled interactive post'),
    [title, vibeSession.tree],
  );

  const interactiveModeToggle = (
    <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-900/70 p-0.5">
      <button
        type="button"
        onClick={() => void handleModeChange('text')}
        className="rounded px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800"
      >
        Text
      </button>
      <button
        type="button"
        aria-pressed="true"
        className="rounded bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-900"
      >
        Vibe
      </button>
    </div>
  );

  if (mode === 'interactive') {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
        {isEditing && existingPostLoading ? (
          <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-6">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              Loading post...
            </div>
          </div>
        ) : showMissingEditPost ? (
          <div className="px-6 pt-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="text-sm text-zinc-400">This post could not be loaded for editing.</p>
            </div>
          </div>
        ) : postId ? (
          <InteractiveEditorLayout
            postId={postId}
            defaultOpen={!shippedBundle}
            canvas={<BundleCanvas postId={postId} tree={vibeSession.tree} manifest={bundleManifest} />}
            drawer={null}
            renderDrawer={({ closeDrawer }) => (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="ml-2">Loading Vibe editor...</span>
                  </div>
                }
              >
                <BundleAgentEditor
                  postId={postId}
                  title={title}
                  slug={slug || buildEntitySlug(title, postId)}
                  coverMediaId={coverMediaId}
                  coverPreview={coverPreview}
                  coverUploadFiles={coverUploadFiles}
                  coverUploading={coverUploading}
                  status={status}
                  onTitleChange={handleInteractiveTitleChange}
                  onSlugChange={handleInteractiveSlugChange}
                  onCoverUpload={(incoming) => handleCoverUpload(incoming)}
                  onCoverRemove={handleInteractiveCoverRemove}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onDelete={handleDelete}
                  onSaveDraft={handleInteractiveSaveDraft}
                  onRequestClose={closeDrawer}
                  onShipped={() => {
                    refetch();
                  }}
                  memberId={profile?.memberId ?? undefined}
                  shippedBundle={shippedBundle}
                  session={vibeSession}
                  statusAccessory={interactiveModeToggle}
                  statusMessage={error || existingPostError}
                />
              </Suspense>
            )}
          />
        ) : (
          <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-6">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              Preparing Vibe draft...
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className={containerClass}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div
            className="sticky top-0 z-30 border-b border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-md md:top-[60px]"
            style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
          >
           <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="rounded-lg bg-zinc-900 p-2">
                <Newspaper size={20} className="text-zinc-100" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {isEditing ? 'Edit Post' : 'Write Post'}
                </h1>
                <p className="text-xs text-zinc-400">
                  {isExistingBundlePost
                    ? 'Bundle post'
                    : status === 'published'
                      ? 'Published post'
                      : 'Draft post'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300">
                <Save size={14} />
                {dirty && !saving ? 'Unsaved' : saveLabel}
              </span>
              <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/70 p-1">
                <button
                  type="button"
                  onClick={() => void handleModeChange('text')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === 'text' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText size={14} />
                    Text
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleModeChange('interactive')}
                  aria-pressed={false}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={14} />
                    Vibe
                  </span>
                </button>
              </div>
            </div>
           </div>
          </div>

          {(error || showEditError) && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-300">{error || existingPostError}</p>
            </div>
          )}

          {isEditing && existingPostLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                Loading post…
              </div>
            </div>
          ) : showMissingEditPost ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="text-sm text-zinc-400">This post could not be loaded for editing.</p>
            </div>
          ) : (
            <>
              <CoverSection
                coverMediaId={coverMediaId}
                coverPreview={coverPreview}
                uploading={coverUploading}
                uploadFiles={coverUploadFiles}
                onUpload={(incoming) => void handleCoverUpload(incoming)}
                onRemove={() => {
                  setCoverMediaId(null);
                  markDirty();
                }}
              />

              {/* Title — visible in both modes. */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <label htmlFor="post-title" className="mb-2 block text-sm font-medium text-zinc-300">
                  Title
                </label>
                <input
                  id="post-title"
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    markDirty();
                  }}
                  disabled={isBusy}
                  placeholder="Give your post a title"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-lg font-semibold text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <MarkdownEditor
                  value={body}
                  onChange={(nextValue) => {
                    setBody(nextValue);
                    markDirty();
                  }}
                  enableEmbeds
                  enableInlineMedia
                  minRows={22}
                  uploadedMedia={uploadedMediaButtons}
                  previewMediaById={previewMediaById}
                  previewAssetsById={previewAssetsById}
                  onInlineUpload={async (files) => {
                    await handleInlineUpload(files);
                    return null;
                  }}
                />
              </div>

              <div
                className="sticky bottom-0 z-30 border-t border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-md"
                style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
              >
               <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  {status === 'published' && postId && (
                    <button
                      type="button"
                      onClick={() => void handleUnpublish()}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {togglingStatus ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      Unpublish
                    </button>
                  )}

                  {postId && (
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Delete
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={isBusy || !profile?.memberId}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <ImagePlus size={16} />
                      {status === 'published' ? 'Update Post' : 'Publish Post'}
                    </>
                  )}
                </button>
               </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function SubmitPost() {
  return (
    <RequireApproved>
      <SubmitPostForm />
    </RequireApproved>
  );
}
