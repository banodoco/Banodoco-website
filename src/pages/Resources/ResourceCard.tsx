import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BASE_MODEL_MAP } from './constants';
import type { Asset, AssetMedia, AssetProfile } from './types';

/** Safely unwrap Supabase joins that may return an object or a single-element array */
function unwrap<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

/** Convert a Cloudflare static thumbnail URL to an animated GIF preview */
function getAnimatedThumbnail(staticUrl: string): string {
  // https://...cloudflarestream.com/{id}/thumbnails/thumbnail.jpg
  // → https://...cloudflarestream.com/{id}/thumbnails/thumbnail.gif?duration=4s&height=360
  return staticUrl.replace('/thumbnail.jpg', '/thumbnail.gif?duration=4s&height=360');
}

interface ResourceCardProps {
  asset: Asset;
  profile?: AssetProfile | null;
  isFeaturedSize?: boolean;
}

export const ResourceCard = ({ asset, profile, isFeaturedSize }: ResourceCardProps) => {
  const media = unwrap<AssetMedia>(asset.media);
  const thumbnailUrl = media?.cloudflare_thumbnail_url;
  const hasVideo = !!media?.cloudflare_playback_hls_url;
  const creatorName = asset.creator || 'Unknown';
  const avatarUrl = profile?.avatar_url;

  const isFeatured = asset.admin_status === 'Featured';
  const isCurated = asset.admin_status === 'Curated';

  // Hover-to-play: swap static thumbnail for animated GIF
  const [hovered, setHovered] = useState(false);
  const [animatedLoaded, setAnimatedLoaded] = useState(false);
  const animatedUrl = thumbnailUrl && hasVideo ? getAnimatedThumbnail(thumbnailUrl) : null;

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setAnimatedLoaded(false);
  }, []);

  const linkUrl = profile?.username
    ? `/u/${profile.username}/resources/${asset.id}`
    : `/resources/${asset.id}`;

  return (
    <Link
      to={linkUrl}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group block w-full rounded-lg overflow-hidden bg-white/5 border transition-all duration-200 hover:scale-[1.02] hover:border-white/20 cursor-pointer ${
        isFeatured
          ? 'border-amber-400/30 hover:border-amber-400/50'
          : isCurated
            ? 'border-cyan-400/20 hover:border-cyan-400/40'
            : 'border-white/10'
      }`}
    >
      {/* Thumbnail */}
      <div className={`relative bg-white/5 overflow-hidden ${isFeaturedSize ? 'aspect-[2/1]' : 'aspect-video'}`}>
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={asset.name}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                hovered && animatedLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
            />
            {/* Animated preview on hover (preloaded when hovered) */}
            {hovered && animatedUrl && (
              <img
                src={animatedUrl}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                  animatedLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setAnimatedLoaded(true)}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {asset.type === 'workflow' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
        )}

        {/* Play indicator on hover */}
        {hasVideo && hovered && !animatedLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {hasVideo && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white/90 rounded">
              Video
            </span>
          )}
          {isFeatured && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-500/80 backdrop-blur-sm text-white rounded">
              Featured
            </span>
          )}
          {isCurated && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-cyan-500/60 backdrop-blur-sm text-white rounded">
              Curated
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className={`font-medium text-white/90 truncate ${isFeaturedSize ? 'text-base' : 'text-sm'}`}>{asset.name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          {avatarUrl && (
            <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
          )}
          <p className="text-xs text-white/50 truncate">by {creatorName}</p>
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {asset.lora_base_model && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-white/8 text-white/60 rounded-full">
              {BASE_MODEL_MAP.get(asset.lora_base_model)?.label ?? asset.lora_base_model}
            </span>
          )}
          {asset.lora_type && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-white/8 text-white/60 rounded-full">
              {asset.lora_type}
            </span>
          )}
          {asset.type === 'workflow' && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300/80 rounded-full">
              Workflow
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
