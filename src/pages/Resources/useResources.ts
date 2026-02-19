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
            id, type, name, description, admin_status, creator, user_id,
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

        // Fetch profiles for all unique user_ids
        const userIds = [...new Set(sorted.map(a => a.user_id).filter(Boolean))] as string[];
        if (userIds.length > 0) {
          const { data: profileData } = await client
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);

          if (profileData) {
            const map = new Map<string, AssetProfile>();
            for (const p of profileData as AssetProfile[]) {
              map.set(p.id, p);
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
