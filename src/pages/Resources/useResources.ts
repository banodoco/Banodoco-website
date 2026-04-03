import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { STATUS_ORDER } from './constants';
import type { Asset } from './types';

interface UseResourcesResult {
  assets: Asset[];
  loading: boolean;
  error: string | null;
}

export const useResources = (): UseResourcesResult => {
  const [assets, setAssets] = useState<Asset[]>([]);
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
            id, type, name, description, admin_status, member_id,
            lora_type, lora_base_model, model_variant,
            lora_link, download_link, primary_media_id, created_at,
            media:primary_media_id (
              id, type, cloudflare_thumbnail_url,
              cloudflare_playback_hls_url, placeholder_image, metadata
            ),
            members(member_id, username, global_name, avatar_url, stored_avatar_url)
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
      } catch {
        setError('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { assets, loading, error };
};
