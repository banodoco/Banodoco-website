import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug, profilePath } from '@/lib/routing';

const PAGE_SIZE = 12;

export interface ResourceLink {
  label: string;
  url: string;
}

export interface ResourceAssetModel {
  modelId: string;
  compatibilityNote: string | null;
  displayName: string;
  defaultVariant: string | null;
}

export interface ResourceCreator {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface CommunityResourceItem {
  id: string;
  slug: string;
  memberId: string | null;
  title: string;
  description: string | null;
  source?: 'manual' | 'discord_import' | null;
  discordGuildId?: string | number | null;
  discordChannelId?: string | number | null;
  discordThreadId?: string | number | null;
  isHidden?: boolean | null;
  status: 'draft' | 'published';
  adminStatus: 'Curated' | 'Listed' | null;
  links: ResourceLink[];
  primaryMediaId: string | null;
  primaryMediaUrl: string | null;
  primaryUrl: string | null;
  resourceType: string;
  thumbnailUrl: string | null;
  createdAt: string;
  galleryCount: number;
  discussionCount: number;
  assetModels: ResourceAssetModel[];
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
  slug: string | null;
  description: string | null;
  source: 'manual' | 'discord_import' | null;
  discord_guild_id: string | null;
  discord_channel_id: string | null;
  discord_thread_id: string | null;
  is_hidden: boolean;
  status: 'draft' | 'published';
  admin_status: 'Curated' | 'Listed' | null;
  links: unknown;
  type: string;
  lora_link: string | null;
  download_link: string | null;
  primary_media_id: string | null;
  created_at: string;
  member_id: string | null;
  creator: string | null;
  media:
    | {
        url: string | null;
        type: string | null;
        cloudflare_thumbnail_url: string | null;
        cloudflare_playback_hls_url: string | null;
        backup_thumbnail_url: string | null;
        placeholder_image: string | null;
      }
    | {
        url: string | null;
        type: string | null;
        cloudflare_thumbnail_url: string | null;
        cloudflare_playback_hls_url: string | null;
        backup_thumbnail_url: string | null;
        placeholder_image: string | null;
      }[]
    | null;
}

export interface MemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

function unwrapMedia(media: AssetRow['media']): Exclude<AssetRow['media'], null | unknown[]> | null {
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

function buildCountMap(rows: Array<{ asset_id: string | null }>): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.asset_id) continue;
    counts.set(row.asset_id, (counts.get(row.asset_id) ?? 0) + 1);
  }

  return counts;
}

export function normalizeResourceLinks(raw: unknown): ResourceLink[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];

    const label = 'label' in entry && typeof entry.label === 'string' ? entry.label.trim() : '';
    const url = 'url' in entry && typeof entry.url === 'string' ? entry.url.trim() : '';

    if (!label || !url) return [];
    return [{ label, url }];
  });
}

export function mapCommunityResourceRow(
  row: AssetRow,
  memberMap: Map<string, MemberRow>,
  counts?: {
    galleryCount?: number;
    discussionCount?: number;
  },
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
  const links = normalizeResourceLinks(row.links);

  return {
    id: row.id,
    slug: row.slug ?? buildEntitySlug(row.name, row.id),
    memberId: row.member_id,
    title: row.name,
    description: row.description,
    source: row.source,
    discordGuildId: row.discord_guild_id,
    discordChannelId: row.discord_channel_id,
    discordThreadId: row.discord_thread_id,
    isHidden: row.is_hidden,
    status: row.status,
    adminStatus: row.admin_status ?? null,
    links,
    primaryMediaId: row.primary_media_id,
    primaryMediaUrl: primaryMedia?.url ?? null,
    primaryUrl: links[0]?.url ?? row.lora_link ?? row.download_link,
    resourceType: row.type,
    thumbnailUrl: primaryMedia?.cloudflare_thumbnail_url ?? null,
    createdAt: row.created_at,
    galleryCount: counts?.galleryCount ?? 0,
    discussionCount: counts?.discussionCount ?? 0,
    assetModels: [],
    creator,
  };
}

export async function fetchResourceMemberMap(memberIds: string[]): Promise<Map<string, MemberRow>> {
  const memberMap = new Map<string, MemberRow>();
  if (!supabase || memberIds.length === 0) return memberMap;

  const { data: memberData } = await supabase
    .from('members')
    .select('member_id:member_id::text, username, global_name, avatar_url')
    .in('member_id', memberIds);

  if (memberData) {
    for (const member of memberData as MemberRow[]) {
      memberMap.set(member.member_id, member);
    }
  }

  return memberMap;
}

export const useCommunityResources = (memberId?: string): UseCommunityResourcesResult => {
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

    const logTag = memberId ? `[useCommunityResources:${memberId}]` : '[useCommunityResources]';
    console.log(`${logTag} fetching page offset=${offset}`);

    try {
      let query = supabase
        // status filter required for public reads
        .from('assets')
        .select(`
          id, name, slug, description, source, is_hidden, status, admin_status, links, type, lora_link, download_link, primary_media_id, created_at, creator,
          member_id:member_id::text,
          discord_guild_id:discord_guild_id::text,
          discord_channel_id:discord_channel_id::text,
          discord_thread_id:discord_thread_id::text,
          media:primary_media_id (
            url,
            type,
            cloudflare_thumbnail_url,
            cloudflare_playback_hls_url,
            backup_thumbnail_url,
            placeholder_image
          )
        `)
        .eq('is_hidden', false)
        .eq('status', 'published')
        .in('admin_status', ['Curated', 'Listed'])
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error(`${logTag} assets query failed:`, fetchError);
        throw fetchError;
      }

      const rows = (data ?? []) as AssetRow[];
      console.log(`${logTag} got ${rows.length} assets`);
      setHasMore(rows.length === PAGE_SIZE);

      const assetIds = rows.map((row) => row.id);
      const [galleryCountResponse, discussionCountResponse] = assetIds.length > 0
        ? await Promise.all([
            supabase
              .from('asset_media')
              .select('asset_id')
              .in('asset_id', assetIds)
              .eq('is_deleted', false),
            supabase
              .from('asset_comments')
              .select('asset_id')
              .in('asset_id', assetIds)
              .eq('is_deleted', false),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];

      if (galleryCountResponse.error) throw galleryCountResponse.error;
      if (discussionCountResponse.error) throw discussionCountResponse.error;

      const galleryCountMap = buildCountMap((galleryCountResponse.data ?? []) as Array<{ asset_id: string | null }>);
      const discussionCountMap = buildCountMap((discussionCountResponse.data ?? []) as Array<{ asset_id: string | null }>);

      // Fetch members for member_ids (cast to text so JS keeps precision)
      const memberIds = [...new Set(rows.map((r) => r.member_id).filter((v): v is string => !!v))];
      const memberMap = await fetchResourceMemberMap(memberIds);

      const mapped = rows.map((r) => mapCommunityResourceRow(r, memberMap, {
        galleryCount: galleryCountMap.get(r.id) ?? 0,
        discussionCount: discussionCountMap.get(r.id) ?? 0,
      }));

      if (isLoadMore) {
        setResources((prev) => [...prev, ...mapped]);
      } else {
        setResources(mapped);
      }

      offsetRef.current = offset + rows.length;
    } catch (caught) {
      console.error(`${logTag} failed:`, caught);
      setError(
        caught instanceof Error && caught.message
          ? `Failed to load community resources: ${caught.message}`
          : 'Failed to load community resources',
      );
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
