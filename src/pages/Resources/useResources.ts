import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { STATUS_ORDER } from './constants';
import type { Asset, AssetProfile } from './types';

interface UseResourcesResult {
  assets: Asset[];
  profiles: Map<string, AssetProfile>;
  loading: boolean;
  error: string | null;
}

export const useResources = (): UseResourcesResult => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [profiles, setProfiles] = useState<Map<string, AssetProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setAssets([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data, error: fetchError } = await client
          .from('assets')
          .select(`
            id, type, name, description, admin_status, creator, member_id,
            lora_type, lora_base_model, model_variant,
            lora_link, download_link, primary_media_id, created_at,
            media:primary_media_id (
              id, type, cloudflare_thumbnail_url,
              cloudflare_playback_hls_url, placeholder_image, metadata
            )
          `)
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Sort: Featured first, then Curated, then Listed, then by date within each tier
        const sorted = (data as Asset[]).sort((a, b) => {
          const statusDiff = (STATUS_ORDER[a.admin_status] ?? 99) - (STATUS_ORDER[b.admin_status] ?? 99);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setAssets(sorted);

        // Fetch members for all unique member_ids
        const memberIds = [...new Set(sorted.map(a => a.member_id).filter(Boolean))] as number[];
        if (memberIds.length > 0) {
          const { data: memberData } = await client
            .from('members')
            .select('member_id, username, global_name, avatar_url')
            .in('member_id', memberIds);

          if (memberData) {
            const map = new Map<string, AssetProfile>();
            for (const m of memberData as { member_id: number; username: string | null; global_name: string | null; avatar_url: string | null }[]) {
              map.set(String(m.member_id), {
                id: String(m.member_id),
                username: m.username,
                display_name: m.global_name,
                avatar_url: m.avatar_url,
              });
            }
            setProfiles(map);
          }
        }
      } catch {
        setError('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { assets, profiles, loading, error };
};
