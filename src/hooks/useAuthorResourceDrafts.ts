import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  type CommunityResourceItem,
  fetchResourceMemberMap,
  mapCommunityResourceRow,
} from '@/hooks/useCommunityResources';

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

interface UseAuthorResourceDraftsResult {
  drafts: CommunityResourceItem[];
  loading: boolean;
  error: string | null;
}

export const useAuthorResourceDrafts = (
  memberId: string | undefined,
): UseAuthorResourceDraftsResult => {
  const [drafts, setDrafts] = useState<CommunityResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!memberId) {
      setDrafts([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !client) {
      setDrafts([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDrafts = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await client
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
          .eq('member_id', memberId)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const rows = (data ?? []) as AssetRow[];
        const memberIds = [...new Set(rows.map((row) => row.member_id).filter((value): value is string => !!value))];
        const memberMap = await fetchResourceMemberMap(memberIds);

        if (!cancelled) {
          setDrafts(rows.map((row) => mapCommunityResourceRow(row, memberMap)));
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load draft resources');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDrafts();

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return { drafts, loading, error };
};
