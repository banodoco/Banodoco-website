import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Asset, AssetMedia, AssetProfile } from './types';
import { useAuth } from '@/contexts/useAuth';
import { supabase } from '@/lib/supabase';
import { buildResourcePath } from '@/lib/routing';

function unwrap<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getAnimatedThumbnail(staticUrl: string): string {
  return staticUrl.replace('/thumbnail.jpg', '/thumbnail.gif?duration=4s&height=360');
}

function getPreviewUrl(media: AssetMedia | null): string | null {
  if (!media) return null;
  const metadataUrl = typeof media.metadata?.url === 'string' ? media.metadata.url : null;
  return media.backup_thumbnail_url
    ?? media.cloudflare_thumbnail_url
    ?? media.placeholder_image
    ?? (media.type?.startsWith('image/') ? metadataUrl : null);
}

interface ResourceCardProps {
  asset: Asset;
  profile?: AssetProfile | null;
}

export const ResourceCard = ({ asset, profile }: ResourceCardProps) => {
  const { profile: authProfile } = useAuth();
  const isAdmin = Boolean(authProfile?.isAdmin);

  const media = unwrap<AssetMedia>(asset.media);
  const previewMedia = useMemo(() => {
    const candidates = [media, ...(asset.fallbackMedia ?? [])];
    return candidates.filter((candidate): candidate is AssetMedia => Boolean(candidate && getPreviewUrl(candidate)));
  }, [asset.fallbackMedia, media]);
  const [failedPreviewIds, setFailedPreviewIds] = useState<Set<string>>(() => new Set());
  const selectedPreview = previewMedia.find((candidate) => !failedPreviewIds.has(candidate.id)) ?? null;
  const thumbnailUrl = getPreviewUrl(selectedPreview);
  const cloudflareThumbnailUrl = selectedPreview?.cloudflare_thumbnail_url ?? null;
  const hasVideo = Boolean(selectedPreview?.cloudflare_playback_hls_url);
  const creatorName = profile?.display_name || profile?.username || asset.creator || 'Unknown';
  const avatarUrl = profile?.avatar_url;
  // Local admin_status so the Curate toggle updates optimistically without
  // forcing a refetch. Seeded from the server value; reverts on error.
  const [adminStatus, setAdminStatus] = useState<Asset['admin_status']>(asset.admin_status ?? null);
  const [curateBusy, setCurateBusy] = useState(false);
  const [curateError, setCurateError] = useState<string | null>(null);
  const isCurated = adminStatus === 'Curated';

  const [hovered, setHovered] = useState(false);
  const [animatedLoaded, setAnimatedLoaded] = useState(false);
  const animatedUrl = cloudflareThumbnailUrl && hasVideo ? getAnimatedThumbnail(cloudflareThumbnailUrl) : null;
  const linkUrl = buildResourcePath(asset.id, {
    label: asset.name,
    persistedSlug: asset.slug,
  });
  const discussionCount = asset.discussionCount ?? 0;

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setAnimatedLoaded(false);
  }, []);
  const handlePreviewError = useCallback((mediaId: string) => {
    setFailedPreviewIds((prev) => {
      const next = new Set(prev);
      next.add(mediaId);
      return next;
    });
    setAnimatedLoaded(false);
  }, []);

  const handleToggleCurate = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!supabase || curateBusy) return;
    const nextStatus: Asset['admin_status'] = isCurated ? 'Listed' : 'Curated';
    const prevStatus = adminStatus;
    setCurateBusy(true);
    setCurateError(null);
    setAdminStatus(nextStatus);
    try {
      const { error: updateError } = await supabase
        .from('assets')
        .update({ admin_status: nextStatus })
        .eq('id', asset.id);
      if (updateError) throw updateError;
    } catch (caught) {
      setAdminStatus(prevStatus);
      setCurateError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'Failed to update curate status',
      );
    } finally {
      setCurateBusy(false);
    }
  }, [adminStatus, asset.id, curateBusy, isCurated]);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        to={linkUrl}
        className={`rp-themed-card group block w-full overflow-hidden rounded-xl border bg-white/5 transition-all duration-200 hover:scale-[1.02] ${
          isCurated ? 'border-white/15' : 'border-white/10'
        }`}
      >
        <div className="relative overflow-hidden bg-white/5 aspect-video">
          {thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                alt={asset.name}
                className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  hovered && animatedLoaded ? 'opacity-0' : 'opacity-100'
                }`}
                loading="lazy"
                onError={() => {
                  if (selectedPreview) handlePreviewError(selectedPreview.id);
                }}
              />
              {hovered && animatedUrl && (
                <img
                  src={animatedUrl}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                    animatedLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setAnimatedLoaded(true)}
                />
              )}
            </>
          ) : previewMedia.length > 0 ? (
            <div className="flex h-full w-full gap-0.5">
              {previewMedia.slice(0, 3).map((m) => {
                const url = getPreviewUrl(m);
                return url ? (
                  <img
                    key={m.id}
                    src={url}
                    alt=""
                    className="h-full flex-1 min-w-0 object-cover"
                    loading="lazy"
                    onError={() => handlePreviewError(m.id)}
                  />
                ) : (
                  <div key={m.id} className="h-full flex-1 min-w-0 bg-white/5" />
                );
              })}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/20">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
          )}

          {hasVideo && hovered && !animatedLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-full border border-white/10 bg-black/55 px-2 py-1 backdrop-blur-sm">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={creatorName}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-medium text-zinc-100">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-[11px] font-medium text-white">{creatorName}</span>
          </div>

          {isCurated && !isAdmin && (
            <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white">
              Featured
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="resource-card-title truncate text-sm font-medium text-white/95">
            {asset.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {discussionCount} {discussionCount === 1 ? 'comment' : 'comments'}
          </p>
        </div>
      </Link>

      {isAdmin && (
        <button
          type="button"
          onClick={handleToggleCurate}
          disabled={curateBusy}
          aria-label={isCurated ? 'Remove from Forge' : 'Curate'}
          aria-pressed={isCurated}
          title={curateError ?? (isCurated ? 'Remove from Forge' : 'Curate')}
          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 p-1.5 text-zinc-200 backdrop-blur-sm transition hover:bg-zinc-800/90 hover:text-white disabled:opacity-60"
        >
          <Star
            size={14}
            className={isCurated ? 'fill-amber-200 text-amber-200' : undefined}
          />
        </button>
      )}
    </div>
  );
};

export default ResourceCard;
