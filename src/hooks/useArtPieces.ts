import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface ArtPieceCreator {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface ArtPieceItem {
  id: string;
  title: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  creator: ArtPieceCreator;
}

interface MediaRow {
  id: string;
  type: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  created_at: string;
  user_id: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
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

function mapRowToItem(row: MediaRow, profileMap: Map<string, ProfileRow>): ArtPieceItem {
  let creator: ArtPieceCreator = {
    username: null,
    displayName: 'Unknown',
    avatarUrl: null,
    profileUrl: null,
  };

  if (row.user_id) {
    const profile = profileMap.get(row.user_id);
    if (profile) {
      creator = {
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.username ? `/u/${profile.username}` : null,
      };
    }
  }

  return {
    id: row.id,
    title: null,
    caption: row.description,
    thumbnailUrl: row.cloudflare_thumbnail_url,
    hlsUrl: row.cloudflare_playback_hls_url,
    mediaType: row.type,
    createdAt: row.created_at,
    creator,
  };
}

export const useArtPieces = (userId?: string): UseArtPiecesResult => {
  const [artPieces, setArtPieces] = useState<ArtPieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const profileCacheRef = useRef(new Map<string, ProfileRow>());

  const resolveProfiles = useCallback(async (rows: MediaRow[]) => {
    const client = supabase;
    if (!client) return;

    const cache = profileCacheRef.current;
    const userIds = [
      ...new Set(
        rows
          .map((r) => r.user_id)
          .filter((id): id is string => id != null && !cache.has(id)),
      ),
    ];

    if (userIds.length > 0) {
      const { data } = await client
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (data) {
        for (const p of data as ProfileRow[]) {
          cache.set(p.id, p);
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
            'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, created_at, user_id',
          )
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const rows = (data ?? []) as MediaRow[];
        setHasMore(rows.length === PAGE_SIZE);

        await resolveProfiles(rows);

        const items = rows.map((row) =>
          mapRowToItem(row, profileCacheRef.current),
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
    [userId, resolveProfiles],
  );

  useEffect(() => {
    offsetRef.current = 0;
    profileCacheRef.current.clear();
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
