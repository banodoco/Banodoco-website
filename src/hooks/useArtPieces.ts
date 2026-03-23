import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, profilePath } from '@/lib/routing';

export interface ArtPieceCreator {
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
  createdAt: string;
  creator: ArtPieceCreator;
  memberId: number | null;
}

interface MediaRow {
  id: string;
  type: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  created_at: string;
  member_id: number | null;
}

interface MemberRow {
  member_id: number;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
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

function mapRowToItem(row: MediaRow, memberMap: Map<number, MemberRow>): ArtPieceItem {
  let creator: ArtPieceCreator = {
    username: null,
    displayName: 'Unknown',
    avatarUrl: null,
    profileUrl: null,
  };

  if (row.member_id) {
    const member = memberMap.get(row.member_id);
    if (member) {
      creator = {
        username: member.username,
        displayName: member.global_name ?? member.username,
        avatarUrl: member.avatar_url,
        profileUrl: member.username ? profilePath(member.username) : null,
      };
    }
  }

  return {
    id: row.id,
    slug: buildEntitySlug(row.description, row.id),
    title: null,
    caption: row.description,
    thumbnailUrl: row.cloudflare_thumbnail_url,
    hlsUrl: row.cloudflare_playback_hls_url,
    mediaType: row.type,
    createdAt: row.created_at,
    creator,
    memberId: row.member_id,
  };
}

export const useArtPieces = (memberId?: number): UseArtPiecesResult => {
  const [artPieces, setArtPieces] = useState<ArtPieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const memberCacheRef = useRef(new Map<number, MemberRow>());

  const resolveMembers = useCallback(async (rows: MediaRow[]) => {
    const client = supabase;
    if (!client) return;

    const cache = memberCacheRef.current;
    const memberIds = [
      ...new Set(
        rows
          .map((r) => r.member_id)
          .filter((id): id is number => id != null && !cache.has(id)),
      ),
    ];

    if (memberIds.length > 0) {
      const { data } = await client
        .from('members')
        .select('member_id, username, global_name, avatar_url')
        .in('member_id', memberIds);

      if (data) {
        for (const m of data as MemberRow[]) {
          cache.set(m.member_id, m);
        }
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

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        let query = client
          .from('media')
          .select(
            'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, created_at, member_id',
          )
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (memberId) {
          query = query.eq('member_id', memberId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const rows = (data ?? []) as MediaRow[];
        setHasMore(rows.length === PAGE_SIZE);

        await resolveMembers(rows);

        const items = rows.map((row) =>
          mapRowToItem(row, memberCacheRef.current),
        );

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
    [memberId, resolveMembers],
  );

  useEffect(() => {
    offsetRef.current = 0;
    memberCacheRef.current.clear();
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
