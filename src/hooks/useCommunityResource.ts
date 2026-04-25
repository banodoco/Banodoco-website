import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  type CommunityResourceItem,
  type ResourceAssetModel,
  type ResourceCreator,
  mapCommunityResourceRow,
} from '@/hooks/useCommunityResources';
import { buildEntitySlug, extractEntityIdFromSlug, profilePath } from '@/lib/routing';

export type { CommunityResourceItem };

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
  self_attributed: boolean | null;
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

export interface GalleryMediaItem {
  id: string;
  type: string | null;
  url: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  placeholder_image: string | null;
}

interface MemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

interface AssetModelRow {
  model_id: string;
  compatibility_note: string | null;
  model:
    | {
        id: string;
        display_name: string | null;
        default_variant: string | null;
      }
    | {
        id: string;
        display_name: string | null;
        default_variant: string | null;
      }[]
    | null;
}

interface UseCommunityResourceResult {
  resource: CommunityResourceItem | null;
  galleryMedia: GalleryMediaItem[];
  assetModels: ResourceAssetModel[];
  loading: boolean;
  error: string | null;
}

function unwrapMedia(media: AssetRow['media']): Exclude<AssetRow['media'], null | unknown[]> | null {
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

async function fetchCreator(raw: AssetRow): Promise<ResourceCreator> {
  if (!supabase) {
    return { username: null, displayName: raw.creator ?? null, avatarUrl: null, profileUrl: null };
  }

  if (raw.member_id) {
    const { data } = await supabase
      .from('members')
      .select('member_id:member_id::text, username, global_name, avatar_url')
      .eq('member_id', raw.member_id)
      .single();

    if (data) {
      const member = data as MemberRow;
      return {
        username: member.username,
        displayName: member.global_name ?? member.username,
        avatarUrl: member.avatar_url,
        profileUrl: member.username ? profilePath(member.username) : null,
      };
    }
  }

  return { username: null, displayName: raw.creator ?? 'Unknown', avatarUrl: null, profileUrl: null };
}

function mapAssetModels(rows: AssetModelRow[] | null): ResourceAssetModel[] {
  if (!rows) return [];

  return rows.flatMap((row) => {
    const model = Array.isArray(row.model) ? (row.model[0] ?? null) : row.model;
    if (!model) return [];

    return [{
      modelId: row.model_id,
      compatibilityNote: row.compatibility_note,
      displayName: model.display_name ?? model.id,
      defaultVariant: model.default_variant,
    }];
  });
}

export const useCommunityResource = (
  slug: string | undefined,
  options?: { asAuthor?: boolean },
): UseCommunityResourceResult => {
  const asAuthor = options?.asAuthor ?? false;
  const [resource, setResource] = useState<CommunityResourceItem | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<GalleryMediaItem[]>([]);
  const [assetModels, setAssetModels] = useState<ResourceAssetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setResource(null);
      setGalleryMedia([]);
      setAssetModels([]);
      setLoading(false);
      setError('No resource ID provided');
      return;
    }

    const resolvedId = extractEntityIdFromSlug(slug);
    if (!resolvedId) {
      setResource(null);
      setGalleryMedia([]);
      setAssetModels([]);
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
      setResource(null);
      setGalleryMedia([]);
      setAssetModels([]);

      try {
        let resourceQuery = supabase!
          .from('assets')
          .select(`
            id, name, slug, description, source, is_hidden, status, admin_status, links, type, lora_link, download_link, primary_media_id, created_at, creator, self_attributed,
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
          .eq('id', resolvedId)
          .eq('is_hidden', false);

        if (!asAuthor) {
          resourceQuery = resourceQuery
            // status filter required for public reads
            .eq('status', 'published')
            .in('admin_status', ['Curated', 'Listed']);
        }

        const { data, error: fetchError } = await resourceQuery.single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Resource not found');
          return;
        }

        const raw = data as AssetRow;
        const [creator, galleryResponse, assetModelsResponse] = await Promise.all([
          fetchCreator(raw),
          supabase!
            .from('asset_media')
            .select('sort_order, media:media_id (id, type, url, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url, placeholder_image)')
            .eq('asset_id', resolvedId)
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true }),
          supabase!
            .from('asset_models')
            .select('model_id, compatibility_note, model:models!inner(id, display_name, default_variant)')
            .eq('asset_id', resolvedId),
        ]);

        if (galleryResponse.error) throw galleryResponse.error;
        if (assetModelsResponse.error) throw assetModelsResponse.error;

        const media = ((galleryResponse.data ?? []) as { media: GalleryMediaItem | GalleryMediaItem[] | null }[])
          .map((row) => {
            const m = row.media;
            if (Array.isArray(m)) return m[0] ?? null;
            return m;
          })
          .filter((m): m is GalleryMediaItem => m !== null);
        const mappedAssetModels = mapAssetModels((assetModelsResponse.data ?? []) as AssetModelRow[]);

        setGalleryMedia(media);
        setAssetModels(mappedAssetModels);
        setResource({
          ...mapCommunityResourceRow(raw, new Map()),
          creator,
          thumbnailUrl: unwrapMedia(raw.media)?.cloudflare_thumbnail_url ?? null,
          primaryMediaUrl: unwrapMedia(raw.media)?.url ?? null,
          slug: raw.slug ?? buildEntitySlug(raw.name, raw.id),
          galleryCount: media.length,
          assetModels: mappedAssetModels,
        });
      } catch {
        setResource(null);
        setGalleryMedia([]);
        setAssetModels([]);
        setError('Failed to load resource');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [asAuthor, slug]);

  return { resource, galleryMedia, assetModels, loading, error };
};
