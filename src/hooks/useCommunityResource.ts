import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { CommunityResourceItem, ResourceCreator } from '@/hooks/useCommunityResources';
import { buildEntitySlug, extractEntityIdFromSlug, profilePath } from '@/lib/routing';

export type { CommunityResourceItem };

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

export interface GalleryMediaItem {
  id: string;
  type: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
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

function unwrapMember(m: MemberJoin | MemberJoin[] | null): MemberJoin | null {
  if (Array.isArray(m)) return m[0] ?? null;
  return m;
}

function buildCreator(raw: AssetRow): ResourceCreator {
  const member = unwrapMember(raw.members);
  if (member) {
    const avatarUrl = member.stored_avatar_url ?? member.avatar_url ?? null;
    return {
      memberId: member.member_id,
      username: member.username,
      displayName: member.global_name ?? member.username,
      avatarUrl,
      profileUrl: member.username ? profilePath(member.username) : null,
    };
  }
  return { memberId: null, username: null, displayName: 'Unknown', avatarUrl: null, profileUrl: null };
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
            id, name, description, type, lora_link, download_link, lora_base_model, lora_type, created_at, member_id,
            media:primary_media_id ( cloudflare_thumbnail_url ),
            members(member_id, username, global_name, avatar_url, stored_avatar_url)
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
        const creator = buildCreator(raw);
        const primaryMedia = unwrapMedia(raw.media);

        setResource({
          id: raw.id,
          slug: buildEntitySlug(raw.name, raw.id),
          title: raw.name,
          description: raw.description,
          primaryUrl: raw.lora_link ?? raw.download_link,
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
