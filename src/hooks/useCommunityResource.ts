import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { CommunityResourceItem, ResourceCreator } from '@/hooks/useCommunityResources';
import { buildEntitySlug, extractEntityIdFromSlug, profilePath } from '@/lib/routing';

export type { CommunityResourceItem };

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

export interface GalleryMediaItem {
  id: string;
  type: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface UseCommunityResourceResult {
  resource: CommunityResourceItem | null;
  galleryMedia: GalleryMediaItem[];
  loading: boolean;
  error: string | null;
}

function unwrapMedia(media: AssetRow['media']): { cloudflare_thumbnail_url: string | null } | null {
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

async function fetchCreator(raw: AssetRow): Promise<ResourceCreator> {
  if (!supabase) {
    return { username: null, displayName: raw.creator ?? null, avatarUrl: null, profileUrl: null };
  }

  if (raw.user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', raw.user_id)
      .single();

    if (data) {
      const profile = data as ProfileRow;
      return {
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.username ? profilePath(profile.username) : null,
      };
    }
  }

  return { username: null, displayName: raw.creator ?? 'Unknown', avatarUrl: null, profileUrl: null };
}

export const useCommunityResource = (slugOrId: string | undefined): UseCommunityResourceResult => {
  const [resource, setResource] = useState<CommunityResourceItem | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false);
      setError('No resource ID provided');
      return;
    }

    const resolvedId = extractEntityIdFromSlug(slugOrId);
    if (!resolvedId) {
      setLoading(false);
      setError('Invalid resource link');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const fetchResource = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase!
          .from('assets')
          .select(`
            id, name, description, type, lora_link, created_at, user_id, creator,
            media:primary_media_id ( cloudflare_thumbnail_url )
          `)
          .eq('id', resolvedId)
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Resource not found');
          return;
        }

        const raw = data as AssetRow;
        const creator = await fetchCreator(raw);
        const primaryMedia = unwrapMedia(raw.media);

        setResource({
          id: raw.id,
          slug: buildEntitySlug(raw.name, raw.id),
          title: raw.name,
          description: raw.description,
          primaryUrl: raw.lora_link,
          resourceType: raw.type,
          thumbnailUrl: primaryMedia?.cloudflare_thumbnail_url ?? null,
          createdAt: raw.created_at,
          creator,
        });

        // Fetch gallery media via asset_media junction
        const { data: galleryData } = await supabase!
          .from('asset_media')
          .select('media:media_id (id, type, cloudflare_thumbnail_url, cloudflare_playback_hls_url)')
          .eq('asset_id', resolvedId);

        if (galleryData) {
          const media = (galleryData as { media: GalleryMediaItem | GalleryMediaItem[] | null }[])
            .map(row => {
              const m = row.media;
              if (Array.isArray(m)) return m[0] ?? null;
              return m;
            })
            .filter((m): m is GalleryMediaItem => m !== null);
          setGalleryMedia(media);
        }
      } catch {
        setError('Failed to load resource');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [slugOrId]);

  return { resource, galleryMedia, loading, error };
};
