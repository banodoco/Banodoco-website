import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, profilePath } from '@/lib/routing';
import type { PostAdminStatus, PostRenderMode, PostStatus } from '@/types/post';

const PAGE_SIZE = 12;

export interface PostCreator {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface PostMediaSummary {
  id: string;
  type: string | null;
  thumbnailUrl: string | null;
  cloudflareThumbnailUrl: string | null;
  hlsUrl: string | null;
}

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  adminStatus: PostAdminStatus | null;
  renderMode: PostRenderMode;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  memberId: string | null;
  coverMediaId: string | null;
  cover: PostMediaSummary | null;
  creator: PostCreator;
}

interface UsePostsOptions {
  memberId?: string;
  includeDrafts?: boolean;
  limit?: number;
}

interface UsePostsResult {
  posts: PostListItem[];
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

interface PostListRow {
  id: string;
  title: string;
  slug: string | null;
  status: PostStatus;
  admin_status: PostAdminStatus | null;
  render_mode: PostRenderMode;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  member_id: string | null;
  cover_media_id: string | null;
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
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
}

const UNKNOWN_CREATOR: PostCreator = {
  username: null,
  displayName: 'Unknown',
  avatarUrl: null,
  profileUrl: null,
};

const mapCreator = (
  memberId: string | null,
  memberMap: Map<string, MemberRow>,
): PostCreator => {
  if (!memberId) return UNKNOWN_CREATOR;

  const member = memberMap.get(memberId);
  if (!member) return UNKNOWN_CREATOR;

  return {
    username: member.username,
    displayName: member.global_name ?? member.username,
    avatarUrl: member.avatar_url,
    profileUrl: member.username ? profilePath(member.username) : null,
  };
};

const mapMedia = (row: MediaRow): PostMediaSummary => ({
  id: row.id,
  type: row.type,
  thumbnailUrl: row.backup_thumbnail_url ?? row.cloudflare_thumbnail_url,
  cloudflareThumbnailUrl: row.cloudflare_thumbnail_url,
  hlsUrl: row.cloudflare_playback_hls_url,
});

export const usePosts = ({
  memberId,
  includeDrafts = false,
  limit,
}: UsePostsOptions = {}): UsePostsResult => {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const memberCacheRef = useRef(new Map<string, MemberRow>());
  const coverCacheRef = useRef(new Map<string, PostMediaSummary>());

  const resolveMembers = useCallback(async (rows: PostListRow[]) => {
    const client = supabase;
    if (!client) return;

    const memberIds = [
      ...new Set(
        rows
          .map((row) => row.member_id)
          .filter((id): id is string => id != null && !memberCacheRef.current.has(id)),
      ),
    ];

    if (memberIds.length === 0) return;

    const { data } = await client
      .from('members')
      .select('member_id:member_id::text, username, global_name, avatar_url')
      .in('member_id', memberIds);

    if (data) {
      for (const member of data as MemberRow[]) {
        memberCacheRef.current.set(member.member_id, member);
      }
    }
  }, []);

  const resolveCoverMedia = useCallback(async (rows: PostListRow[]) => {
    const client = supabase;
    if (!client) return;

    const coverIds = [
      ...new Set(
        rows
          .map((row) => row.cover_media_id)
          .filter((id): id is string => id != null && !coverCacheRef.current.has(id)),
      ),
    ];

    if (coverIds.length === 0) return;

    const { data } = await client
      .from('media')
      .select(
        'id, type, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url',
      )
      .in('id', coverIds);

    if (data) {
      for (const media of data as MediaRow[]) {
        coverCacheRef.current.set(media.id, mapMedia(media));
      }
    }
  }, []);

  const fetchPage = useCallback(
    async (offset: number, isLoadMore: boolean) => {
      const client = supabase;
      if (!isSupabaseConfigured || !client) {
        setLoading(false);
        return;
      }

      if (includeDrafts && !memberId) {
        setError('memberId is required when includeDrafts is true');
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const pageSize = limit ?? PAGE_SIZE;

        let query = client
          .from('posts')
          .select(
            'id, title, slug, status, admin_status, render_mode, created_at, updated_at, published_at, member_id:member_id::text, cover_media_id',
            { count: 'exact' },
          )
          .range(offset, offset + pageSize - 1);

        if (includeDrafts) {
          query = query
            .eq('member_id', memberId!)
            .in('status', ['draft', 'published'])
            .order('updated_at', { ascending: false });
        } else {
          query = query
            .eq('status', 'published')
            .or('admin_status.is.null,admin_status.neq.Hidden')
            .order('published_at', { ascending: false })
            .order('updated_at', { ascending: false });

          if (memberId) {
            query = query.eq('member_id', memberId);
          }
        }

        const { data, count, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const rows = (data ?? []) as PostListRow[];
        await Promise.all([resolveMembers(rows), resolveCoverMedia(rows)]);

        const mappedPosts = rows.map((row) => ({
          id: row.id,
          slug: row.slug ?? buildEntitySlug(row.title, row.id),
          title: row.title,
          status: row.status,
          adminStatus: row.admin_status,
          renderMode: row.render_mode,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          publishedAt: row.published_at,
          memberId: row.member_id,
          coverMediaId: row.cover_media_id,
          cover: row.cover_media_id ? coverCacheRef.current.get(row.cover_media_id) ?? null : null,
          creator: mapCreator(row.member_id, memberCacheRef.current),
        }));

        setTotalCount(count ?? 0);
        setHasMore(offset + rows.length < (count ?? 0));

        if (isLoadMore) {
          setPosts((prev) => [...prev, ...mappedPosts]);
        } else {
          setPosts(mappedPosts);
        }

        offsetRef.current = offset + rows.length;
      } catch {
        setError('Failed to load posts');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [includeDrafts, limit, memberId, resolveCoverMedia, resolveMembers],
  );

  useEffect(() => {
    offsetRef.current = 0;
    memberCacheRef.current.clear();
    coverCacheRef.current.clear();
    setPosts([]);
    setTotalCount(0);
    setHasMore(true);
    setError(null);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage(offsetRef.current, true);
    }
  }, [fetchPage, hasMore, loadingMore]);

  return { posts, totalCount, loading, loadingMore, error, hasMore, loadMore };
};
