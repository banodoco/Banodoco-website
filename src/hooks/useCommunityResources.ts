import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PAGE_SIZE = 12;

export interface ResourceCreator {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface CommunityResourceItem {
  id: string;
  sourceType: 'discord' | 'upload';
  title: string;
  description: string | null;
  primaryUrl: string | null;
  additionalUrls: string[];
  mediaUrls: string[];
  mediaTypes: string[];
  thumbnailUrl: string | null;
  tags: string[];
  resourceType: string;
  reactionCount: number;
  createdAt: string;
  creator: ResourceCreator;
}

interface UseCommunityResourcesResult {
  resources: CommunityResourceItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

interface RawResource {
  id: string;
  source_type: string;
  title: string;
  description: string | null;
  primary_url: string | null;
  additional_urls: string[] | null;
  media_urls: string[] | null;
  media_types: string[] | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  resource_type: string;
  reaction_count: number;
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
  username: string | null;
  global_name: string | null;
  server_nick: string | null;
  avatar_url: string | null;
}

function buildCreator(
  raw: RawResource,
  profileMap: Map<string, ProfileRow>,
  discordMap: Map<string, DiscordMemberRow>,
): ResourceCreator {
  if (raw.user_id) {
    const profile = profileMap.get(raw.user_id);
    if (profile) {
      return {
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.username ? `/u/${profile.username}` : null,
      };
    }
  }

  if (raw.discord_author_id) {
    const member = discordMap.get(raw.discord_author_id);
    if (member) {
      return {
        username: member.username,
        displayName: member.server_nick ?? member.global_name ?? member.username,
        avatarUrl: member.avatar_url,
        profileUrl: null,
      };
    }
  }

  return {
    username: null,
    displayName: null,
    avatarUrl: null,
    profileUrl: null,
  };
}

function mapResource(
  raw: RawResource,
  profileMap: Map<string, ProfileRow>,
  discordMap: Map<string, DiscordMemberRow>,
): CommunityResourceItem {
  return {
    id: raw.id,
    sourceType: raw.source_type === 'discord' ? 'discord' : 'upload',
    title: raw.title,
    description: raw.description,
    primaryUrl: raw.primary_url,
    additionalUrls: raw.additional_urls ?? [],
    mediaUrls: raw.media_urls ?? [],
    mediaTypes: raw.media_types ?? [],
    thumbnailUrl: raw.thumbnail_url,
    tags: raw.tags ?? [],
    resourceType: raw.resource_type,
    reactionCount: raw.reaction_count,
    createdAt: raw.created_at,
    creator: buildCreator(raw, profileMap, discordMap),
  };
}

export const useCommunityResources = (userId?: string): UseCommunityResourcesResult => {
  const [resources, setResources] = useState<CommunityResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset: number, isLoadMore: boolean) => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('community_resources')
        .select(
          'id, source_type, title, description, primary_url, additional_urls, media_urls, media_types, thumbnail_url, tags, resource_type, reaction_count, created_at, user_id, discord_author_id',
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

      const rows = (data ?? []) as RawResource[];
      setHasMore(rows.length === PAGE_SIZE);

      // Collect unique user_ids and discord_author_ids
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      const discordAuthorIds = [
        ...new Set(rows.map((r) => r.discord_author_id).filter(Boolean)),
      ] as string[];

      // Fetch profiles for upload-sourced resources
      const profileMap = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        if (profileData) {
          for (const p of profileData as ProfileRow[]) {
            profileMap.set(p.id, p);
          }
        }
      }

      // Fetch discord members for discord-sourced resources
      const discordMap = new Map<string, DiscordMemberRow>();
      if (discordAuthorIds.length > 0) {
        const { data: memberData } = await supabase
          .from('discord_members')
          .select('member_id, username, global_name, server_nick, avatar_url')
          .in('member_id', discordAuthorIds);

        if (memberData) {
          for (const m of memberData as DiscordMemberRow[]) {
            discordMap.set(m.member_id, m);
          }
        }
      }

      const mapped = rows.map((r) => mapResource(r, profileMap, discordMap));

      if (isLoadMore) {
        setResources((prev) => [...prev, ...mapped]);
      } else {
        setResources(mapped);
      }

      offsetRef.current = offset + rows.length;
    } catch {
      setError('Failed to load community resources');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    offsetRef.current = 0;
    setResources([]);
    setHasMore(true);
    setError(null);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage(offsetRef.current, true);
    }
  }, [loadingMore, hasMore, fetchPage]);

  return { resources, loading, loadingMore, error, hasMore, loadMore };
};
