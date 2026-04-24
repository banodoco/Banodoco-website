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
  /** Raw Cloudflare thumbnail — needed for hover GIF previews since the
   *  submitter's backup_thumbnail_url can't be swapped into a GIF URL. */
  cloudflareThumbnailUrl: string | null;
  hlsUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  creator: ArtPieceCreator;
  memberId: string | null;
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

interface MemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

interface UseArtPiecesOptions {
  /**
   * When true, only media with `featured_on_2rf = true` are returned
   * (and the admin_status filter is bypassed, mirroring the Forge pattern).
   * Used by the Community Art section on /2RP to show the curated Arca
   * Gidan Ed 2 entries.
   */
  featuredOn2rf?: boolean;
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

export function mapRowToItem(row: MediaRow, memberMap: Map<string, MemberRow>): ArtPieceItem {
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
    thumbnailUrl: row.backup_thumbnail_url ?? row.cloudflare_thumbnail_url,
    cloudflareThumbnailUrl: row.cloudflare_thumbnail_url,
    hlsUrl: row.cloudflare_playback_hls_url,
    mediaType: row.type,
    createdAt: row.created_at,
    creator,
    memberId: row.member_id,
  };
}

export const useArtPieces = (
  memberId?: string,
  options: UseArtPiecesOptions = {},
): UseArtPiecesResult => {
  const { featuredOn2rf = false } = options;
  const [artPieces, setArtPieces] = useState<ArtPieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const memberCacheRef = useRef(new Map<string, MemberRow>());

  const resolveMembers = useCallback(async (rows: MediaRow[]) => {
    const client = supabase;
    if (!client) return;

    const cache = memberCacheRef.current;
    const memberIds = [
      ...new Set(
        rows
          .map((r) => r.member_id)
          .filter((id): id is string => id != null && !cache.has(id)),
      ),
    ];

    if (memberIds.length > 0) {
      const { data } = await client
        .from('members')
        .select('member_id:member_id::text, username, global_name, avatar_url')
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
            'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url, created_at, member_id:member_id::text',
          )
          .eq('source', 'art')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (featuredOn2rf) {
          query = query.eq('featured_on_2rf', true);
        } else {
          query = query.in('admin_status', ['Featured', 'Curated', 'Listed']);
        }

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
    [memberId, featuredOn2rf, resolveMembers],
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
