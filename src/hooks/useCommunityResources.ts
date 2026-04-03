import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, profilePath } from '@/lib/routing';

const PAGE_SIZE = 12;

export interface ResourceCreator {
  memberId: number | null;
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
  downloadUrl: string | null;
  resourceType: string;
  loraBaseModel: string | null;
  loraType: string | null;
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

interface MemberJoin {
  member_id: number;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
  stored_avatar_url: string | null;
}

interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  lora_link: string | null;
  download_link: string | null;
  lora_base_model: string | null;
  lora_type: string | null;
  created_at: string;
  member_id: number | null;
  media: { cloudflare_thumbnail_url: string | null } | { cloudflare_thumbnail_url: string | null }[] | null;
  members: MemberJoin | MemberJoin[] | null;
}

function unwrapMedia(media: AssetRow['media']): { cloudflare_thumbnail_url: string | null } | null {
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

function unwrapMember(m: MemberJoin | MemberJoin[] | null): MemberJoin | null {
  if (Array.isArray(m)) return m[0] ?? null;
  return m;
}

function mapRow(row: AssetRow): CommunityResourceItem {
  const member = unwrapMember(row.members);
  const avatarUrl = member?.stored_avatar_url ?? member?.avatar_url ?? null;

  const creator: ResourceCreator = member
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

  const primaryMedia = unwrapMedia(row.media);

  return {
    id: row.id,
    slug: buildEntitySlug(row.name, row.id),
    title: row.name,
    description: row.description,
    primaryUrl: row.lora_link ?? row.download_link,
    downloadUrl: row.download_link,
    resourceType: row.type,
    loraBaseModel: row.lora_base_model,
    loraType: row.lora_type,
    thumbnailUrl: primaryMedia?.cloudflare_thumbnail_url ?? null,
    createdAt: row.created_at,
    creator,
  };
}

export const useCommunityResources = (memberId?: number | string): UseCommunityResourcesResult => {
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
          id, name, description, type, lora_link, download_link, lora_base_model, lora_type, created_at, member_id,
          media:primary_media_id ( cloudflare_thumbnail_url ),
          members(member_id, username, global_name, avatar_url, stored_avatar_url)
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

      const mapped = rows.map(mapRow);

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
