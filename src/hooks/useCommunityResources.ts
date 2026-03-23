import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, profilePath } from '@/lib/routing';

const PAGE_SIZE = 12;

export interface ResourceCreator {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface CommunityResourceItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  primaryUrl: string | null;
  resourceType: string;
  thumbnailUrl: string | null;
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

interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  lora_link: string | null;
  created_at: string;
  member_id: number | null;
  creator: string | null;
  media: { cloudflare_thumbnail_url: string | null } | { cloudflare_thumbnail_url: string | null }[] | null;
}

interface MemberRow {
  member_id: number;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

function unwrapMedia(media: AssetRow['media']): { cloudflare_thumbnail_url: string | null } | null {
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

function mapRow(
  row: AssetRow,
  memberMap: Map<number, MemberRow>,
): CommunityResourceItem {
  let creator: ResourceCreator = {
    username: null,
    displayName: row.creator ?? 'Unknown',
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

  const primaryMedia = unwrapMedia(row.media);

  return {
    id: row.id,
    slug: buildEntitySlug(row.name, row.id),
    title: row.name,
    description: row.description,
    primaryUrl: row.lora_link,
    resourceType: row.type,
    thumbnailUrl: primaryMedia?.cloudflare_thumbnail_url ?? null,
    createdAt: row.created_at,
    creator,
  };
}

export const useCommunityResources = (memberId?: number): UseCommunityResourcesResult => {
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
          id, name, description, type, lora_link, created_at, member_id, creator,
          media:primary_media_id ( cloudflare_thumbnail_url )
        `)
        .in('admin_status', ['Featured', 'Curated', 'Listed'])
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as AssetRow[];
      setHasMore(rows.length === PAGE_SIZE);

      // Fetch members for member_ids
      const memberIds = [...new Set(rows.map((r) => r.member_id).filter(Boolean))] as number[];
      const memberMap = new Map<number, MemberRow>();
      if (memberIds.length > 0) {
        const { data: memberData } = await supabase
          .from('members')
          .select('member_id, username, global_name, avatar_url')
          .in('member_id', memberIds);

        if (memberData) {
          for (const m of memberData as MemberRow[]) {
            memberMap.set(m.member_id, m);
          }
        }
      }

      const mapped = rows.map((r) => mapRow(r, memberMap));

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
  }, [memberId]);

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
