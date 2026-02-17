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
  title: string;
  description: string | null;
  primaryUrl: string | null;
  resourceType: string;
  thumbnailUrl: string | null;
  createdAt: string;
  creator: ResourceCreator;
  userId: string | null;
}

interface UseCommunityResourcesResult {
  resources: CommunityResourceItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  lora_link: string | null;
  created_at: string;
  user_id: string | null;
  creator: string | null;
  media: { cloudflare_thumbnail_url: string | null } | { cloudflare_thumbnail_url: string | null }[] | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

function unwrapMedia(media: AssetRow['media']): { cloudflare_thumbnail_url: string | null } | null {
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

function mapRow(
  row: AssetRow,
  profileMap: Map<string, ProfileRow>,
): CommunityResourceItem {
  let creator: ResourceCreator = {
    username: null,
    displayName: row.creator ?? 'Unknown',
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

  const primaryMedia = unwrapMedia(row.media);

  return {
    id: row.id,
    title: row.name,
    description: row.description,
    primaryUrl: row.lora_link,
    resourceType: row.type,
    thumbnailUrl: primaryMedia?.cloudflare_thumbnail_url ?? null,
    createdAt: row.created_at,
    creator,
    userId: row.user_id,
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
        .from('assets')
        .select(`
          id, name, description, type, lora_link, created_at, user_id, creator,
          media:primary_media_id ( cloudflare_thumbnail_url )
        `)
        .in('admin_status', ['Featured', 'Curated', 'Listed'])
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as AssetRow[];
      setHasMore(rows.length === PAGE_SIZE);

      // Fetch profiles for user_ids
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
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

      const mapped = rows.map((r) => mapRow(r, profileMap));

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
