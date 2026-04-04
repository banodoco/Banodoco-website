import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildEntitySlug } from '@/lib/routing';

export interface LinkedAsset {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  loraLink: string | null;
  downloadLink: string | null;
  loraBaseModel: string | null;
  thumbnailUrl: string | null;
  creatorUsername: string | null;
}

export const useLinkedAssets = (mediaId: string | undefined) => {
  const [assets, setAssets] = useState<LinkedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mediaId || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from('asset_media')
      .select(`
        assets:asset_id (
          id, name, type, description, lora_link, download_link, lora_base_model,
          media:primary_media_id ( cloudflare_thumbnail_url ),
          members(username)
        )
      `)
      .eq('media_id', mediaId)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        const mapped = (data as { assets: any }[])
          .map(row => {
            const a = Array.isArray(row.assets) ? row.assets[0] : row.assets;
            if (!a) return null;
            const media = Array.isArray(a.media) ? a.media[0] : a.media;
            const member = Array.isArray(a.members) ? a.members[0] : a.members;
            return {
              id: a.id,
              slug: buildEntitySlug(a.name, a.id),
              name: a.name,
              type: a.type,
              description: a.description,
              loraLink: a.lora_link,
              downloadLink: a.download_link,
              loraBaseModel: a.lora_base_model,
              thumbnailUrl: media?.cloudflare_thumbnail_url ?? null,
              creatorUsername: member?.username ?? null,
            } as LinkedAsset;
          })
          .filter((a): a is LinkedAsset => a !== null);

        setAssets(mapped);
        setLoading(false);
      });
  }, [mediaId]);

  return { assets, loading };
};

export const useLinkedMedia = (assetId: string | undefined) => {
  const [media, setMedia] = useState<{ id: string; title: string | null; thumbnailUrl: string | null; hlsUrl: string | null; creatorUsername: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assetId || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from('asset_media')
      .select(`
        media:media_id (
          id, title, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url,
          members(username)
        )
      `)
      .eq('asset_id', assetId)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        const mapped = (data as { media: any }[])
          .map(row => {
            const m = Array.isArray(row.media) ? row.media[0] : row.media;
            if (!m) return null;
            const member = Array.isArray(m.members) ? m.members[0] : m.members;
            return {
              id: m.id,
              title: m.title || m.description,
              thumbnailUrl: m.cloudflare_thumbnail_url,
              hlsUrl: m.cloudflare_playback_hls_url,
              creatorUsername: member?.username ?? null,
            };
          })
          .filter(Boolean);

        setMedia(mapped as typeof media);
        setLoading(false);
      });
  }, [assetId]);

  return { media, loading };
};
