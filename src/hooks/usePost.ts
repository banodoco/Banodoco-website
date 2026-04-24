import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, extractEntityIdFromSlug, profilePath } from '@/lib/routing';
import type { PostAdminStatus, PostBundleRow, PostRenderMode, PostStatus } from '@/types/post';
import type { PostCreator, PostMediaSummary } from '@/hooks/usePosts';

interface UsePostResult {
  post: PostDetailItem | null;
  mediaById: Record<string, PostMediaItem>;
  assetsById: Record<string, PostAssetItem>;
  cover: PostMediaItem | null;
  creator: PostCreator | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface PostDetailItem {
  id: string;
  title: string;
  body: string | null;
  slug: string;
  status: PostStatus;
  adminStatus: PostAdminStatus | null;
  renderMode: PostRenderMode;
  activeBundleVersionId: string | null;
  activeBundle: PostBundleRow | null;
  previewBundle: PostBundleRow | null;
  memberId: string | null;
  coverMediaId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostMediaItem extends PostMediaSummary {
  description: string | null;
  createdAt: string;
  memberId: string | null;
}

export interface PostAssetItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  primaryUrl: string | null;
  resourceType: string;
  thumbnailUrl: string | null;
  createdAt: string;
  memberId: string | null;
  creator: PostCreator;
}

interface PostRow {
  id: string;
  title: string;
  body: string | null;
  slug: string | null;
  status: PostStatus;
  admin_status: PostAdminStatus | null;
  render_mode: PostRenderMode;
  active_bundle_version_id: string | null;
  member_id: string | null;
  cover_media_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

interface MediaRow {
  id: string;
  type: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  created_at: string;
  member_id: string | null;
}

interface PostMediaRow {
  post_id: string;
  media_id: string;
  sort_order: number;
  caption: string | null;
  media: MediaRow | MediaRow[] | null;
}

interface AssetMediaPreview {
  cloudflare_thumbnail_url: string | null;
}

interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  lora_link: string | null;
  download_link: string | null;
  created_at: string;
  creator: string | null;
  member_id: string | null;
  media: AssetMediaPreview | AssetMediaPreview[] | null;
}

interface PostAssetRow {
  post_id: string;
  asset_id: string;
  asset: AssetRow | AssetRow[] | null;
}

const UNKNOWN_CREATOR: PostCreator = {
  username: null,
  displayName: 'Unknown',
  avatarUrl: null,
  profileUrl: null,
};

const unwrapSingle = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

const mapCreator = (
  memberId: string | null,
  memberMap: Map<string, MemberRow>,
  fallbackDisplayName?: string | null,
): PostCreator => {
  if (!memberId) {
    return {
      ...UNKNOWN_CREATOR,
      displayName: fallbackDisplayName ?? UNKNOWN_CREATOR.displayName,
    };
  }

  const member = memberMap.get(memberId);
  if (!member) {
    return {
      ...UNKNOWN_CREATOR,
      displayName: fallbackDisplayName ?? UNKNOWN_CREATOR.displayName,
    };
  }

  return {
    username: member.username,
    displayName:
      member.global_name
      ?? member.username
      ?? fallbackDisplayName
      ?? UNKNOWN_CREATOR.displayName,
    avatarUrl: member.avatar_url,
    profileUrl: member.username ? profilePath(member.username) : null,
  };
};

const mapMediaRow = (row: MediaRow): PostMediaItem => ({
  id: row.id,
  type: row.type,
  description: row.description,
  thumbnailUrl: row.backup_thumbnail_url ?? row.cloudflare_thumbnail_url,
  cloudflareThumbnailUrl: row.cloudflare_thumbnail_url,
  hlsUrl: row.cloudflare_playback_hls_url,
  createdAt: row.created_at,
  memberId: row.member_id,
});

const mapAssetRow = (
  row: AssetRow,
  memberMap: Map<string, MemberRow>,
): PostAssetItem => {
  const primaryMedia = unwrapSingle(row.media);

  return {
    id: row.id,
    slug: buildEntitySlug(row.name, row.id),
    title: row.name,
    description: row.description,
    primaryUrl: row.lora_link ?? row.download_link,
    resourceType: row.type,
    thumbnailUrl: primaryMedia?.cloudflare_thumbnail_url ?? null,
    createdAt: row.created_at,
    memberId: row.member_id,
    creator: mapCreator(row.member_id, memberMap, row.creator),
  };
};

export const usePost = (
  slugOrId: string | undefined,
  opts?: { previewVersionId?: string },
): UsePostResult => {
  const [post, setPost] = useState<PostDetailItem | null>(null);
  const [mediaById, setMediaById] = useState<Record<string, PostMediaItem>>({});
  const [assetsById, setAssetsById] = useState<Record<string, PostAssetItem>>({});
  const [cover, setCover] = useState<PostMediaItem | null>(null);
  const [creator, setCreator] = useState<PostCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    if (!slugOrId) {
      setLoading(false);
      setError('No post ID provided');
      return () => controller.abort();
    }

    const resolvedId = extractEntityIdFromSlug(slugOrId);
    if (!resolvedId) {
      setLoading(false);
      setError('Invalid post link');
      return () => controller.abort();
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return () => controller.abort();
    }

    const fetchPost = async () => {
      setLoading(true);
      setError(null);

      try {
        const [postResult, postMediaResult, postAssetsResult] = await Promise.all([
          client
            .from('posts')
            .select(
              'id, title, body, slug, status, admin_status, render_mode, active_bundle_version_id, member_id:member_id::text, cover_media_id, published_at, created_at, updated_at',
            )
            .abortSignal(controller.signal)
            .eq('id', resolvedId)
            .single(),
          client
            .from('post_media')
            .select(
              'post_id, media_id, sort_order, caption, media:media_id (id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url, created_at, member_id:member_id::text)',
            )
            .abortSignal(controller.signal)
            .eq('post_id', resolvedId)
            .order('sort_order', { ascending: true }),
          client
            .from('post_assets')
            .select(
              'post_id, asset_id, asset:asset_id!inner (id, name, description, type, lora_link, download_link, created_at, creator, member_id:member_id::text, status, media:primary_media_id (cloudflare_thumbnail_url))',
            )
            .abortSignal(controller.signal)
            .eq('post_id', resolvedId)
            .eq('asset.status', 'published'),
        ]);

        if (postResult.error) throw postResult.error;
        if (controller.signal.aborted) return;

        const postRow = postResult.data as PostRow | null;
        if (!postRow) {
          setError('Post not found');
          return;
        }

        const activeBundleId = postRow.active_bundle_version_id;
        const previewBundleId = opts?.previewVersionId ?? null;
        const [activeBundleResult, previewBundleResult] = await Promise.all([
          activeBundleId
            ? client
              .from('post_bundles')
              .select('*')
              .abortSignal(controller.signal)
              .eq('id', activeBundleId)
              .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          previewBundleId && previewBundleId !== activeBundleId
            ? client
              .from('post_bundles')
              .select('*')
              .abortSignal(controller.signal)
              .eq('id', previewBundleId)
              .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (controller.signal.aborted) return;

        const mediaMap: Record<string, PostMediaItem> = {};
        const mediaRows = (postMediaResult.data ?? []) as PostMediaRow[];
        for (const row of mediaRows) {
          const media = unwrapSingle(row.media);
          if (!media) continue;
          mediaMap[media.id] = mapMediaRow(media);
        }

        const assetRows = (postAssetsResult.data ?? []) as PostAssetRow[];
        const memberIds = new Set<string>();
        if (postRow.member_id) {
          memberIds.add(postRow.member_id);
        }

        for (const row of assetRows) {
          const asset = unwrapSingle(row.asset);
          if (asset?.member_id) {
            memberIds.add(asset.member_id);
          }
        }

        const memberMap = new Map<string, MemberRow>();
        if (memberIds.size > 0) {
          const { data: memberData } = await client
            .from('members')
            .select('member_id:member_id::text, username, global_name, avatar_url')
            .abortSignal(controller.signal)
            .in('member_id', [...memberIds]);

          if (memberData) {
            for (const member of memberData as MemberRow[]) {
              memberMap.set(member.member_id, member);
            }
          }
        }
        if (controller.signal.aborted) return;

        const assetMap: Record<string, PostAssetItem> = {};
        for (const row of assetRows) {
          const asset = unwrapSingle(row.asset);
          if (!asset) continue;
          assetMap[asset.id] = mapAssetRow(asset, memberMap);
        }

        let resolvedCover =
          postRow.cover_media_id && mediaMap[postRow.cover_media_id]
            ? mediaMap[postRow.cover_media_id]
            : null;

        if (postRow.cover_media_id && !resolvedCover) {
          const { data: coverData } = await client
            .from('media')
            .select(
              'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url, created_at, member_id:member_id::text',
            )
            .abortSignal(controller.signal)
            .eq('id', postRow.cover_media_id)
            .single();

          if (coverData) {
            resolvedCover = mapMediaRow(coverData as MediaRow);
            mediaMap[resolvedCover.id] = resolvedCover;
          }
        }
        if (controller.signal.aborted) return;

        const activeBundle = (activeBundleResult.data ?? null) as PostBundleRow | null;
        const previewBundle =
          previewBundleId && previewBundleId === activeBundleId
            ? activeBundle
            : (previewBundleResult.data ?? null) as PostBundleRow | null;

        setPost({
          id: postRow.id,
          title: postRow.title,
          body: postRow.body,
          slug: postRow.slug ?? buildEntitySlug(postRow.title, postRow.id),
          status: postRow.status,
          adminStatus: postRow.admin_status,
          renderMode: postRow.render_mode,
          activeBundleVersionId: postRow.active_bundle_version_id,
          activeBundle,
          previewBundle,
          memberId: postRow.member_id,
          coverMediaId: postRow.cover_media_id,
          publishedAt: postRow.published_at,
          createdAt: postRow.created_at,
          updatedAt: postRow.updated_at,
        });
        setMediaById(mediaMap);
        setAssetsById(assetMap);
        setCover(resolvedCover);
        setCreator(mapCreator(postRow.member_id, memberMap));
      } catch {
        if (controller.signal.aborted) return;
        setError('Failed to load post');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchPost();

    return () => {
      controller.abort();
    };
  }, [opts?.previewVersionId, slugOrId]);

  useEffect(() => load(), [load]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  return { post, mediaById, assetsById, cover, creator, loading, error, refetch };
};
