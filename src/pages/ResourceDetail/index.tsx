import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCommunityResource } from '@/hooks/useCommunityResource';
import { HlsPlayer } from '@/pages/Resources/HlsPlayer';
import type { GalleryMediaItem } from '@/hooks/useCommunityResource';
import { buildResourcePath, extractEntityIdFromSlug } from '@/lib/routing';

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  lora: 'bg-blue-500/20 text-blue-300',
  workflow: 'bg-orange-500/20 text-orange-300',
  other: 'bg-zinc-500/20 text-zinc-300',
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-24 bg-white/10 rounded" />
      <div className="h-10 w-3/4 bg-white/10 rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-white/5 rounded-full" />
        <div className="h-6 w-20 bg-white/5 rounded-full" />
        <div className="h-6 w-14 bg-white/5 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/8 rounded" />
        <div className="h-4 w-5/6 bg-white/5 rounded" />
        <div className="h-4 w-4/6 bg-white/5 rounded" />
      </div>
      <div className="h-12 w-48 bg-white/10 rounded-lg" />
      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="h-3 w-20 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

const ResourceDetail = () => {
  const { slug, username } = useParams<{ slug: string; username?: string }>();
  const navigate = useNavigate();
  const { resource, galleryMedia, loading, error } = useCommunityResource(slug);
  const [activeMedia, setActiveMedia] = useState<GalleryMediaItem | null>(null);
  const routeResourceId = extractEntityIdFromSlug(slug);

  useEffect(() => {
    if (!resource || !slug || !routeResourceId) return;
    if (resource.id !== routeResourceId || resource.slug === slug) return;
    navigate(buildResourcePath(resource.id, resource.title, username), { replace: true });
  }, [navigate, resource, routeResourceId, slug, username]);

  // Set initial active media when gallery loads
  const displayMedia = activeMedia ?? galleryMedia[0] ?? null;

  const colorClass = resource
    ? (RESOURCE_TYPE_COLORS[resource.resourceType] ?? RESOURCE_TYPE_COLORS.other)
    : '';
  const creatorName = resource
    ? (resource.creator.displayName ?? resource.creator.username ?? 'Unknown')
    : '';

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 md:pt-24 md:pb-20">
        <div className="mb-8 flex items-center justify-between gap-4">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {resource && (
            <div className="flex min-w-0 items-center gap-3">
              {resource.creator.avatarUrl ? (
                <img
                  src={resource.creator.avatarUrl}
                  alt={creatorName}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white/40 font-medium">
                    {creatorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {resource.creator.profileUrl ? (
                <Link
                  to={resource.creator.profileUrl}
                  className="max-w-[14rem] truncate text-sm font-medium text-zinc-300 hover:text-white transition"
                >
                  {creatorName}
                </Link>
              ) : (
                <span className="max-w-[14rem] truncate text-sm font-medium text-zinc-300">
                  {creatorName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg mb-4">{error}</p>
            <button
              onClick={() => navigate('/resources')}
              className="text-sm text-blue-400 hover:underline"
            >
              Back to Resources
            </button>
          </div>
        )}

        {/* Resource content */}
        {resource && !loading && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Media viewer */}
            {displayMedia && (
              <div>
                {displayMedia.cloudflare_playback_hls_url ? (
                  <HlsPlayer
                    hlsUrl={displayMedia.cloudflare_playback_hls_url}
                    thumbnailUrl={displayMedia.cloudflare_thumbnail_url}
                    autoPlay
                    className="w-full aspect-video rounded-lg overflow-hidden"
                  />
                ) : displayMedia.cloudflare_thumbnail_url ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
                    <img
                      src={displayMedia.cloudflare_thumbnail_url}
                      alt={resource.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : null}

                {/* Gallery strip */}
                {galleryMedia.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {galleryMedia.map(media => (
                      <button
                        key={media.id}
                        onClick={() => setActiveMedia(media)}
                        className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                          displayMedia?.id === media.id ? 'border-white/60' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {media.cloudflare_thumbnail_url ? (
                          <img
                            src={media.cloudflare_thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-[10px]">
                            {media.type === 'video' ? 'VID' : 'IMG'}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resource type badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${colorClass}`}>
                {resource.resourceType}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              {resource.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>{formatDate(resource.createdAt)}</span>
            </div>

            {/* Description */}
            {resource.description && (
              <div className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">
                {resource.description}
              </div>
            )}

            {/* Primary URL CTA */}
            {resource.primaryUrl && (
              <div>
                <a
                  href={resource.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-zinc-100 transition group"
                >
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Visit {extractDomain(resource.primaryUrl)}
                  <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            )}

          </motion.article>
        )}
      </div>
    </div>
  );
};

export default ResourceDetail;
