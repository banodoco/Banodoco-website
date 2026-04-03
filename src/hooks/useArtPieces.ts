import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, profilePath } from '@/lib/routing';

export interface ArtPieceCreator {
  memberId: number | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface ArtPieceItem {
  id: string;
  slug: string;
  title: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  mediaType: string | null;
  toolsUsed: string[];
  createdAt: string;
  creator: ArtPieceCreator;
  memberId: number | null;
}

interface MemberJoin {
  member_id: number;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
  stored_avatar_url: string | null;
}

interface MediaRow {
  id: string;
  type: string | null;
  title: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  created_at: string;
  member_id: number | null;
  tools_used: string[] | null;
  members: MemberJoin | MemberJoin[] | null;
}

interface UseArtPiecesResult {
  artPieces: ArtPieceItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

const PAGE_SIZE = 12;

function unwrapMember(m: MemberJoin | MemberJoin[] | null): MemberJoin | null {
  if (Array.isArray(m)) return m[0] ?? null;
  return m;
}

function mapRowToItem(row: MediaRow): ArtPieceItem {
  const member = unwrapMember(row.members);
  const avatarUrl = member?.stored_avatar_url ?? member?.avatar_url ?? null;

  const creator: ArtPieceCreator = member
    ? {
        memberId: member.member_id,
        username: member.username,
        displayName: member.global_name ?? member.username,
        avatarUrl,
        profileUrl: member.username ? profilePath(member.username) : null,
      }
    : {
        memberId: null,
        username: null,
        displayName: 'Unknown',
        avatarUrl: null,
        profileUrl: null,
      };

  return {
    id: row.id,
    slug: buildEntitySlug(row.title || row.description, row.id),
    title: row.title,
    caption: row.description,
    thumbnailUrl: row.cloudflare_thumbnail_url,
    hlsUrl: row.cloudflare_playback_hls_url,
    mediaType: row.type,
    toolsUsed: row.tools_used ?? [],
    createdAt: row.created_at,
    creator,
    memberId: row.member_id,
  };
}

export const useArtPieces = (memberId?: number | string): UseArtPiecesResult => {
  const [artPieces, setArtPieces] = useState<ArtPieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(
    async (offset: number, isLoadMore: boolean) => {
      const client = supabase;
      if (!isSupabaseConfigured || !client) {
        setLoading(false);
        return;
      }

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        let query = client
          .from('media')
          .select(
            `id, type, title, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, created_at, member_id, tools_used,
             members(member_id, username, global_name, avatar_url, stored_avatar_url)`,
          )
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (memberId && memberId !== '__none__') {
          query = query.eq('member_id', memberId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const rows = (data ?? []) as MediaRow[];
        setHasMore(rows.length === PAGE_SIZE);

        const items = rows.map(mapRowToItem);

        if (isLoadMore) {
          setArtPieces((prev) => [...prev, ...items]);
        } else {
          setArtPieces(items);
        }

        offsetRef.current = offset + rows.length;
      } catch {
        setError('Failed to load art pieces');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [memberId],
  );

  useEffect(() => {
    offsetRef.current = 0;
    setArtPieces([]);
    setHasMore(true);
    setError(null);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage(offsetRef.current, true);
    }
  }, [loadingMore, hasMore, fetchPage]);

  return { artPieces, loading, loadingMore, error, hasMore, loadMore };
};
