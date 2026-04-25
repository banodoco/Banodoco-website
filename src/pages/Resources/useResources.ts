import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { STATUS_ORDER } from './constants';
import type { Asset, AssetMedia, AssetProfile } from './types';

interface UseResourcesOptions {
  /**
   * When 'discord_import', only Discord-promoted resources show. Used by
   * The Forge section on /2RP to surface resources that crossed the reaction
   * threshold in the `*_resources` forum channels. When undefined, all
   * published + listed resources are returned.
   */
  sourceOnly?: 'discord_import';
  /**
   * When true, return only resources with admin_status='Curated' (and
   * is_hidden=false + status='published'). Used by the "Curated" row at
   * the top of /2RP. Mutually exclusive with sourceOnly — curatedOnly wins
   * if both are set, to match what the Curated slot actually wants.
   */
  curatedOnly?: boolean;
}

interface UseResourcesResult {
  assets: Asset[];
  profiles: Map<string, AssetProfile>;
  loading: boolean;
  error: string | null;
}

function hasPreviewableMedia(media: AssetMedia | null): boolean {
  if (!media) return false;
  const type = media.type ?? '';
  return Boolean(
    media.backup_thumbnail_url
    || media.cloudflare_thumbnail_url
    || media.placeholder_image
    || (type.startsWith('image/') && media.metadata?.url),
  );
}

export const useResources = (options: UseResourcesOptions = {}): UseResourcesResult => {
  const { sourceOnly, curatedOnly } = options;
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
      const tag = curatedOnly ? 'curated' : sourceOnly ?? 'all';
      const logTag = `[useResources:${tag}]`;
      console.log(`${logTag} fetching assets...`);
      try {
        let query = client
          // status filter required for public reads
          .from('assets')
          .select(`
            id, slug, type, name, description, source, is_hidden, admin_status, creator,
            member_id:member_id::text,
            discord_guild_id:discord_guild_id::text,
            discord_channel_id:discord_channel_id::text,
            discord_thread_id:discord_thread_id::text,
            lora_type, lora_base_model, model_variant,
            lora_link, download_link, primary_media_id, created_at,
            media:primary_media_id (
              id, type, cloudflare_thumbnail_url, backup_thumbnail_url,
              cloudflare_playback_hls_url, placeholder_image, metadata
            )
          `)
          .eq('is_hidden', false)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (curatedOnly) {
          query = query.eq('admin_status', 'Curated');
        } else if (sourceOnly) {
          query = query.eq('source', sourceOnly);
        } else {
          query = query.in('admin_status', ['Curated', 'Listed']);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error(`${logTag} assets query failed:`, fetchError);
          throw fetchError;
        }
        console.log(`${logTag} assets returned: ${data?.length ?? 0} rows`);

        // Supabase returns `media` as a single object for FK-based joins, but
        // the generated types sometimes widen to an array. Normalize to `AssetMedia | null`.
        const rows = (data ?? []) as (Omit<Asset, 'media'> & {
          media: AssetMedia | AssetMedia[] | null;
        })[];
        const assetIds = rows.map(({ id }) => id);
        const [galleryCountsResponse, discussionCountsResponse] = assetIds.length > 0
          ? await Promise.all([
              client
                .from('asset_media')
                .select('asset_id')
                .in('asset_id', assetIds)
                .eq('is_deleted', false),
              client
                .from('asset_comments')
                .select('asset_id')
                .in('asset_id', assetIds)
                .eq('is_deleted', false),
            ])
          : [{ data: [], error: null }, { data: [], error: null }];

        if (galleryCountsResponse.error) throw galleryCountsResponse.error;
        if (discussionCountsResponse.error) throw discussionCountsResponse.error;

        const galleryCountMap = new Map<string, number>();
        for (const row of (galleryCountsResponse.data ?? []) as Array<{ asset_id: string | null }>) {
          if (!row.asset_id) continue;
          galleryCountMap.set(row.asset_id, (galleryCountMap.get(row.asset_id) ?? 0) + 1);
        }

        const discussionCountMap = new Map<string, number>();
        for (const row of (discussionCountsResponse.data ?? []) as Array<{ asset_id: string | null }>) {
          if (!row.asset_id) continue;
          discussionCountMap.set(row.asset_id, (discussionCountMap.get(row.asset_id) ?? 0) + 1);
        }

        const normalized: Asset[] = rows.map(({ media, ...rest }) => ({
          ...rest,
          galleryCount: galleryCountMap.get(rest.id) ?? 0,
          discussionCount: discussionCountMap.get(rest.id) ?? 0,
          media: Array.isArray(media) ? media[0] ?? null : media,
        }));

        // For cards with no previewable primary media, fetch up to 3 fallback
        // thumbnails (gallery first, comment media second) so ZIP/JSON primary
        // files do not leave otherwise visual resources blank.
        const noPrimaryIds = normalized.filter((a) => !hasPreviewableMedia(a.media)).map((a) => a.id);
        const fallbackByAsset = new Map<string, AssetMedia[]>();
        if (noPrimaryIds.length > 0) {
          const { data: galleryRows } = await client
            .from('asset_media')
            .select(`
              asset_id, sort_order,
              media:media_id ( id, type, cloudflare_thumbnail_url, backup_thumbnail_url,
                cloudflare_playback_hls_url, placeholder_image, metadata )
            `)
            .in('asset_id', noPrimaryIds)
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true });

          for (const row of (galleryRows ?? []) as Array<{ asset_id: string; media: AssetMedia | AssetMedia[] | null }>) {
            const list = fallbackByAsset.get(row.asset_id) ?? [];
            if (list.length >= 3) continue;
            const m = Array.isArray(row.media) ? row.media[0] : row.media;
            if (m) list.push(m);
            fallbackByAsset.set(row.asset_id, list);
          }

          const stillEmpty = noPrimaryIds.filter((id) => (fallbackByAsset.get(id) ?? []).length === 0);
          if (stillEmpty.length > 0) {
            const { data: commentRows } = await client
              .from('asset_comments')
              .select('id, asset_id')
              .in('asset_id', stillEmpty);
            const commentToAsset = new Map<string, string>();
            for (const row of (commentRows ?? []) as Array<{ id: string; asset_id: string }>) {
              commentToAsset.set(row.id, row.asset_id);
            }
            if (commentToAsset.size > 0) {
              const { data: acmRows } = await client
                .from('asset_comment_media')
                .select(`
                  comment_id,
                  media:media_id ( id, type, cloudflare_thumbnail_url, backup_thumbnail_url,
                    cloudflare_playback_hls_url, placeholder_image, metadata )
                `)
                .in('comment_id', [...commentToAsset.keys()])
                .eq('is_deleted', false);
              for (const row of (acmRows ?? []) as Array<{ comment_id: string; media: AssetMedia | AssetMedia[] | null }>) {
                const assetId = commentToAsset.get(row.comment_id);
                if (!assetId) continue;
                const list = fallbackByAsset.get(assetId) ?? [];
                if (list.length >= 3) continue;
                const m = Array.isArray(row.media) ? row.media[0] : row.media;
                if (m) list.push(m);
                fallbackByAsset.set(assetId, list);
              }
            }
          }

          for (const a of normalized) {
            const list = fallbackByAsset.get(a.id);
            if (list && list.length > 0) a.fallbackMedia = list;
          }
        }

        // Sort: Curated first, then Listed, then by date within each tier.
        // Assets with NULL admin_status sort after Listed by date.
        const sorted = normalized.sort((a, b) => {
          const statusDiff = (STATUS_ORDER[a.admin_status ?? 'Listed'] ?? 99) - (STATUS_ORDER[b.admin_status ?? 'Listed'] ?? 99);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setAssets(sorted);

        // Fetch members for all unique member_ids. Cast member_id to text on
        // both sides — Discord snowflakes are 18-digit bigints and lose
        // precision when JSON.parse converts them to JS numbers.
        const memberIds = [...new Set(sorted.map(a => a.member_id).filter((v): v is string => !!v))];
        if (memberIds.length > 0) {
          const { data: memberData } = await client
            .from('members')
            .select('member_id:member_id::text, username, global_name, avatar_url')
            .in('member_id', memberIds);

          if (memberData) {
            const map = new Map<string, AssetProfile>();
            for (const m of memberData as { member_id: string; username: string | null; global_name: string | null; avatar_url: string | null }[]) {
              map.set(m.member_id, {
                id: m.member_id,
                username: m.username,
                display_name: m.global_name,
                avatar_url: m.avatar_url,
              });
            }
            setProfiles(map);
          }
        }
      } catch (caught) {
        console.error(`${logTag} failed:`, caught);
        setError(
          caught instanceof Error && caught.message
            ? `Failed to load resources: ${caught.message}`
            : 'Failed to load resources',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sourceOnly, curatedOnly]);

  return { assets, profiles, loading, error };
};
