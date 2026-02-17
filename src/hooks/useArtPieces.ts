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
  sourceType: 'discord' | 'upload';
  title: string | null;
  caption: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
  thumbnailUrl: string | null;
  reactionCount: number;
  tags: string[];
  createdAt: string;
  creator: ArtPieceCreator;
}

interface ArtPieceRow {
  id: string;
  source_type: string;
  title: string | null;
  caption: string | null;
  media_urls: string[] | null;
  media_types: string[] | null;
  thumbnail_url: string | null;
  reaction_count: number;
  tags: string[] | null;
  created_at: string;
  user_id: string | null;
  discord_author_id: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DiscordMemberRow {
  member_id: string;
  username: string;
  global_name: string | null;
  server_nick: string | null;
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

function buildCreatorFromProfile(profile: ProfileRow): ArtPieceCreator {
  return {
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    avatarUrl: profile.avatar_url,
    profileUrl: profile.username ? `/u/${profile.username}` : null,
  };
}

function buildCreatorFromDiscordMember(member: DiscordMemberRow): ArtPieceCreator {
  return {
    username: member.username,
    displayName: member.server_nick ?? member.global_name ?? member.username,
    avatarUrl: member.avatar_url,
    profileUrl: null,
  };
}

function mapRowToItem(
  row: ArtPieceRow,
  profileMap: Map<string, ProfileRow>,
  discordMap: Map<string, DiscordMemberRow>,
): ArtPieceItem {
  let creator: ArtPieceCreator = {
    username: null,
    displayName: 'Unknown',
    avatarUrl: null,
    profileUrl: null,
  };

  if (row.user_id) {
    const profile = profileMap.get(row.user_id);
    if (profile) {
      creator = buildCreatorFromProfile(profile);
    }
  } else if (row.discord_author_id) {
    const member = discordMap.get(row.discord_author_id);
    if (member) {
      creator = buildCreatorFromDiscordMember(member);
    }
  }

  return {
    id: row.id,
    sourceType: row.source_type === 'upload' ? 'upload' : 'discord',
    title: row.title,
    caption: row.caption,
    mediaUrls: row.media_urls ?? [],
    mediaTypes: row.media_types ?? [],
    thumbnailUrl: row.thumbnail_url,
    reactionCount: row.reaction_count,
    tags: row.tags ?? [],
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
  const discordCacheRef = useRef(new Map<string, DiscordMemberRow>());

  const resolveCreators = useCallback(async (rows: ArtPieceRow[]) => {
    const client = supabase;
    if (!client) return;

    const profileCache = profileCacheRef.current;
    const discordCache = discordCacheRef.current;

    // Collect uncached user IDs
    const userIds = [
      ...new Set(
        rows
          .map((r) => r.user_id)
          .filter((id): id is string => id != null && !profileCache.has(id)),
      ),
    ];

    if (userIds.length > 0) {
      const { data } = await client
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (data) {
        for (const p of data as ProfileRow[]) {
          profileCache.set(p.id, p);
        }
      }
    }

    // Collect uncached discord author IDs
    const discordIds = [
      ...new Set(
        rows
          .map((r) => r.discord_author_id)
          .filter((id): id is string => id != null && !discordCache.has(id)),
      ),
    ];

    if (discordIds.length > 0) {
      const { data } = await client
        .from('discord_members')
        .select('member_id, username, global_name, server_nick, avatar_url')
        .in('member_id', discordIds);

      if (data) {
        for (const m of data as DiscordMemberRow[]) {
          discordCache.set(m.member_id, m);
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
          .from('art_pieces')
          .select(
            'id, source_type, title, caption, media_urls, media_types, thumbnail_url, reaction_count, tags, created_at, user_id, discord_author_id',
          )
          .eq('status', 'published')
          .order('reaction_count', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const rows = (data ?? []) as ArtPieceRow[];
        setHasMore(rows.length === PAGE_SIZE);

        await resolveCreators(rows);

        const items = rows.map((row) =>
          mapRowToItem(row, profileCacheRef.current, discordCacheRef.current),
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
    [userId, resolveCreators],
  );

  useEffect(() => {
    offsetRef.current = 0;
    profileCacheRef.current.clear();
    discordCacheRef.current.clear();
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
