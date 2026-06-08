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

const logResourceTiming = (
  tag: string,
  start: number,
  message: string,
  extra?: Record<string, unknown>,
) => {
  if (!import.meta.env.DEV) return;

  console.info(`[useResources:${tag}] ${message} +${Math.round(performance.now() - start)}ms`, extra ?? '');
};

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
      const startedAt = performance.now();
      logResourceTiming(tag, startedAt, 'fetch started');
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
          console.error(`[useResources:${tag}] assets query failed:`, fetchError);
          throw fetchError;
        }
        logResourceTiming(tag, startedAt, 'assets query returned', { rows: data?.length ?? 0 });

        // Supabase returns `media` as a single object for FK-based joins, but
        // the generated types sometimes widen to an array. Normalize to `AssetMedia | null`.
        const rows = (data ?? []) as (Omit<Asset, 'media'> & {
          media: AssetMedia | AssetMedia[] | null;
        })[];
        const assetIds = rows.map(({ id }) => id);
        logResourceTiming(tag, startedAt, 'count queries starting', { assetCount: assetIds.length });

        // Don't transfer rows to count them. `head: true, count: 'exact'`
        // asks PostgREST for just a row count, no payload. Run one HEAD per
        // asset in parallel — bulletproof against any server-side row cap,
        // RLS surprises, or pagination edge cases (the previous bulk fetch
        // silently truncated when the server's max-rows cap fired).
        const fetchCount = async (table: 'asset_media' | 'asset_comments', assetId: string) => {
          const { count, error: countError } = await client
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('asset_id', assetId)
            .eq('is_deleted', false);
          if (countError) {
            console.error(`[useResources:${tag}] count failed for ${table} asset_id=${assetId}:`, countError);
            return 0;
          }
          return count ?? 0;
        };

        const [galleryCounts, discussionCounts] = assetIds.length > 0
          ? await Promise.all([
              Promise.all(assetIds.map((id) => fetchCount('asset_media', id))),
              Promise.all(assetIds.map((id) => fetchCount('asset_comments', id))),
            ])
          : [[] as number[], [] as number[]];
        logResourceTiming(tag, startedAt, 'count queries finished');

        const galleryCountMap = new Map<string, number>();
        const discussionCountMap = new Map<string, number>();
        assetIds.forEach((id, idx) => {
          galleryCountMap.set(id, galleryCounts[idx] ?? 0);
          discussionCountMap.set(id, discussionCounts[idx] ?? 0);
        });

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
          logResourceTiming(tag, startedAt, 'fallback media queries starting', { assetCount: noPrimaryIds.length });
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
          logResourceTiming(tag, startedAt, 'fallback media queries finished');
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
          logResourceTiming(tag, startedAt, 'member query starting', { memberCount: memberIds.length });
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
          logResourceTiming(tag, startedAt, 'member query finished');
        }
        logResourceTiming(tag, startedAt, 'fetch finished', { rows: sorted.length });
      } catch (caught) {
        console.error(`[useResources:${tag}] failed:`, caught);
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
