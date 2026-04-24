import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetDescription } from '@/components/resources/AssetDescription';
import { type AssetComment, useAssetComments } from '@/hooks/useAssetComments';
import type { GalleryMediaItem } from '@/hooks/useCommunityResource';
import type { CommunityResourceItem } from '@/hooks/useCommunityResources';
import { buildDiscordMessageUrl } from '@/lib/discordResources';
import { HlsPlayer } from '@/pages/Resources/HlsPlayer';

// Page size for the "Made with this" grid. Page 1 renders the featured 2x2 tile
// plus 5 regular tiles (6 distinct media items) to fill a 3x3 cell grid.
// Subsequent pages render 9 regular tiles in a plain 3x3 grid.
const MADE_WITH_PAGE_SIZE = 9;
const MADE_WITH_PAGE_ONE_ITEMS = 6;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 14) return `${diffDay}d ago`;
  if (diffWeek < 8) return `${diffWeek}w ago`;

  return formatDate(iso);
}

function getDisplayName(globalName: string | null | undefined, username: string | null | undefined): string {
  return globalName ?? username ?? 'Unknown';
}

function getCommentExcerpt(content: string | null | undefined): string {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No text';
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function getMediaPreviewUrl({
  thumbnailUrl,
  backupThumbnailUrl,
  placeholderImage,
  url,
}: {
  thumbnailUrl: string | null | undefined;
  backupThumbnailUrl: string | null | undefined;
  placeholderImage: string | null | undefined;
  url: string | null | undefined;
}): string | null {
  return thumbnailUrl ?? backupThumbnailUrl ?? placeholderImage ?? url ?? null;
}

function isImageMedia(type: string | null | undefined, url: string | null | undefined): boolean {
  if (type === 'image' || type?.startsWith('image/')) return true;
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

function isVideoMedia(
  type: string | null | undefined,
  url: string | null | undefined,
  hlsUrl: string | null | undefined,
): boolean {
  if (type === 'video' || type?.startsWith('video/')) return true;
  if (hlsUrl) return true;
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v|avi)(\?.*)?$/i.test(url);
}

interface DisplayMediaItem {
  id: string;
  type: string | null;
  url: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  placeholder_image: string | null;
  alt: string;
}

// Shared hover-play handlers for a plain <video>. Returns handlers that start
// muted playback on pointer enter and pause + reset on pointer leave.
function useHoverPlayVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePointerEnter = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Some browsers throw if metadata hasn't loaded — safe to ignore.
    }
  }, []);

  return { videoRef, handlePointerEnter, handlePointerLeave };
}

// A tile that renders a still poster, autoplays a muted <video> on hover, and
// calls onOpen on click. Used for regular (non-featured) tiles in the grid and
// for media attached to comments. Works for both image and video items.
interface HoverMediaTileProps {
  item: DisplayMediaItem;
  onOpen: () => void;
  alt: string;
  compact?: boolean;
  featured?: boolean;
  featuredClassName?: string;
}

function HoverMediaTile({
  item,
  onOpen,
  alt,
  compact = false,
  featured = false,
  featuredClassName,
}: HoverMediaTileProps) {
  const isVideo = isVideoMedia(item.type, item.url, item.cloudflare_playback_hls_url);
  const previewUrl = getMediaPreviewUrl({
    thumbnailUrl: item.cloudflare_thumbnail_url,
    backupThumbnailUrl: item.backup_thumbnail_url,
    placeholderImage: item.placeholder_image,
    url: isImageMedia(item.type, item.url) ? item.url : null,
  });
  const videoSrc = isVideo ? item.url ?? null : null;
  const { videoRef, handlePointerEnter, handlePointerLeave } = useHoverPlayVideo();

  const layoutClass = featured
    ? featuredClassName ?? DEFAULT_FEATURED_CLASS
    : compact
      ? 'aspect-square'
      : 'aspect-video';

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={isVideo && videoSrc ? handlePointerEnter : undefined}
      onPointerLeave={isVideo && videoSrc ? handlePointerLeave : undefined}
      aria-label={alt}
      className={`group relative block w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 text-left ${layoutClass}`}
    >
      {isVideo && videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={previewUrl ?? undefined}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-xs uppercase tracking-[0.2em] text-zinc-500">
          {isVideo ? 'Video' : 'Media'}
        </div>
      )}
      {isVideo && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white">
          Video
        </span>
      )}
    </button>
  );
}

// `featuredClassName` overrides the default size/span classes. Used by the
// "Made with this" grid to render the primary media as a 2x2 tile on md+ while
// keeping a full-width aspect-video look on mobile.
const DEFAULT_FEATURED_CLASS = 'aspect-video sm:col-span-2 md:col-span-3';

interface FeaturedMediaProps {
  item: DisplayMediaItem;
  onOpen: () => void;
  className?: string;
}

// Default featured layout: full-width aspect-video banner. The "Made with this"
// grid overrides this with a 2x2 tile layout via `className`. When the item has
// an HLS URL, renders the HlsPlayer and attaches hover play/pause on top of it.
function FeaturedMedia({ item, onOpen, className = DEFAULT_FEATURED_CLASS }: FeaturedMediaProps) {
  const previewUrl = getMediaPreviewUrl({
    thumbnailUrl: item.cloudflare_thumbnail_url,
    backupThumbnailUrl: item.backup_thumbnail_url,
    placeholderImage: item.placeholder_image,
    url: isImageMedia(item.type, item.url) ? item.url : null,
  });
  const isVideo = isVideoMedia(item.type, item.url, item.cloudflare_playback_hls_url);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // HLS: find the <video> rendered by HlsPlayer inside our container and drive
  // hover play/pause on it without reaching into the HlsPlayer component.
  const handleHlsPointerEnter = useCallback(() => {
    const video = containerRef.current?.querySelector('video');
    if (!video) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, []);

  const handleHlsPointerLeave = useCallback(() => {
    const video = containerRef.current?.querySelector('video');
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  const handleContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Don't intercept clicks on the embedded video controls (mute toggle etc).
      const target = event.target as HTMLElement | null;
      if (target && (target.closest('button') || target.closest('video'))) return;
      onOpen();
    },
    [onOpen],
  );

  if (item.cloudflare_playback_hls_url) {
    return (
      <div
        ref={containerRef}
        onPointerEnter={handleHlsPointerEnter}
        onPointerLeave={handleHlsPointerLeave}
        onClick={handleContentClick}
        className={`cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-black ${className}`}
      >
        <HlsPlayer
          hlsUrl={item.cloudflare_playback_hls_url}
          thumbnailUrl={previewUrl}
          autoPlay={false}
          className="h-full w-full"
        />
      </div>
    );
  }

  if (item.url) {
    return (
      <HoverMediaTile
        item={item}
        onOpen={onOpen}
        alt={item.alt}
        featured
        featuredClassName={className}
      />
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-white/10 bg-black ${className}`}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={item.alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-xs uppercase tracking-[0.2em] text-zinc-500">
          {isVideo ? 'Video' : 'Media'}
        </div>
      )}
    </div>
  );
}

// In-page lightbox. Portals to document.body, locks page scroll, closes on
// Escape and backdrop click. Renders a <video> with controls for videos and a
// large <img> for images. Caps content at max-w-5xl / max-h-[90vh].
interface MediaLightboxProps {
  item: DisplayMediaItem;
  onClose: () => void;
}

function MediaLightbox({ item, onClose }: MediaLightboxProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  const isVideo = isVideoMedia(item.type, item.url, item.cloudflare_playback_hls_url);
  const previewUrl = getMediaPreviewUrl({
    thumbnailUrl: item.cloudflare_thumbnail_url,
    backupThumbnailUrl: item.backup_thumbnail_url,
    placeholderImage: item.placeholder_image,
    url: isImageMedia(item.type, item.url) ? item.url : null,
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={handleBackdropClick}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className="flex max-h-[90vh] w-full max-w-5xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {isVideo && item.cloudflare_playback_hls_url ? (
          <HlsPlayer
            hlsUrl={item.cloudflare_playback_hls_url}
            thumbnailUrl={previewUrl}
            autoPlay
            className="max-h-[90vh] w-full"
          />
        ) : isVideo && item.url ? (
          <video
            src={item.url}
            poster={previewUrl ?? undefined}
            autoPlay
            controls
            playsInline
            className="max-h-[90vh] w-full rounded-lg bg-black object-contain"
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={item.alt}
            className="max-h-[90vh] w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-white/5 text-sm text-zinc-400">
            No preview available
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface MadeWithThisSectionProps {
  displayMedia: DisplayMediaItem[];
  resetKey: string;
  onOpenMedia: (item: DisplayMediaItem) => void;
}

// Tailwind classes that make the featured tile span 2 cols x 2 rows on md+
// while remaining a full-width banner on mobile (2-col grid can't row-span
// cleanly without awkward gaps).
const FEATURED_MADE_WITH_CLASS =
  'aspect-video col-span-2 md:col-span-2 md:row-span-2 md:aspect-square';

function MadeWithThisSection({ displayMedia, resetKey, onOpenMedia }: MadeWithThisSectionProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  if (displayMedia.length === 0) return null;

  // Page 1 shows the featured tile (2x2) plus up to 5 smaller tiles, for a
  // total of 6 distinct items occupying a 3x3 cell footprint. Subsequent pages
  // show up to MADE_WITH_PAGE_SIZE (9) plain tiles.
  const page1Capacity = MADE_WITH_PAGE_ONE_ITEMS;
  const totalPages =
    displayMedia.length <= page1Capacity
      ? 1
      : 1 + Math.ceil((displayMedia.length - page1Capacity) / MADE_WITH_PAGE_SIZE);

  // Clamp to a valid page in case displayMedia shrinks.
  const safePage = Math.min(Math.max(page, 1), totalPages);

  let pageItems: DisplayMediaItem[];
  let featured: DisplayMediaItem | null;
  if (safePage === 1) {
    featured = displayMedia[0] ?? null;
    pageItems = displayMedia.slice(1, page1Capacity);
  } else {
    featured = null;
    const offset = page1Capacity + (safePage - 2) * MADE_WITH_PAGE_SIZE;
    pageItems = displayMedia.slice(offset, offset + MADE_WITH_PAGE_SIZE);
  }

  const showPager = displayMedia.length > page1Capacity;
  const pagerButtonClass =
    'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-300';

  return (
    <section className="relative space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
        Made with this
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {featured && (
          <FeaturedMedia
            item={featured}
            onOpen={() => onOpenMedia(featured!)}
            className={FEATURED_MADE_WITH_CLASS}
          />
        )}
        {pageItems.map((item) => (
          <HoverMediaTile
            key={item.id}
            item={item}
            onOpen={() => onOpenMedia(item)}
            alt={item.alt}
            compact
          />
        ))}
      </div>
      {showPager && (
        <div className="sticky bottom-4 z-10 flex justify-center pt-1">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
            <button
              type="button"
              className={pagerButtonClass}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </button>
            <span className="tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className={pagerButtonClass}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

interface DiscordResourceSectionsProps {
  assetId: string;
  resource?: CommunityResourceItem;
  galleryMedia?: GalleryMediaItem[];
  comments?: AssetComment[];
  loading?: boolean;
  error?: string | null;
}

export function DiscordResourceSections({
  assetId,
  resource,
  galleryMedia = [],
  comments: providedComments,
  loading: providedLoading,
  error: providedError,
}: DiscordResourceSectionsProps) {
  const {
    comments: fetchedComments,
    loading: fetchedLoading,
    error: fetchedError,
  } = useAssetComments(assetId);

  const comments = providedComments ?? fetchedComments;
  const commentsLoading = providedLoading ?? fetchedLoading;
  const commentsError = providedError ?? fetchedError;

  const [lightboxItem, setLightboxItem] = useState<DisplayMediaItem | null>(null);
  const openLightbox = useCallback((item: DisplayMediaItem) => setLightboxItem(item), []);
  const closeLightbox = useCallback(() => setLightboxItem(null), []);

  const commentLookup = new Map(comments.map((comment) => [comment.id, comment]));

  const seenMediaIds = new Set<string>();
  const displayMedia: DisplayMediaItem[] = [];

  const resourceTitle = resource?.title ?? 'resource';
  const primaryMediaId = resource?.primaryMediaId ?? null;
  const primaryFromGallery = primaryMediaId
    ? galleryMedia.find((media) => media.id === primaryMediaId) ?? null
    : null;

  if (primaryFromGallery) {
    seenMediaIds.add(primaryFromGallery.id);
    displayMedia.push({
      id: primaryFromGallery.id,
      type: primaryFromGallery.type,
      url: primaryFromGallery.url,
      cloudflare_thumbnail_url: primaryFromGallery.cloudflare_thumbnail_url,
      cloudflare_playback_hls_url: primaryFromGallery.cloudflare_playback_hls_url,
      backup_thumbnail_url: primaryFromGallery.backup_thumbnail_url,
      placeholder_image: primaryFromGallery.placeholder_image,
      alt: resourceTitle,
    });
  } else if (resource && primaryMediaId && resource.primaryMediaUrl) {
    seenMediaIds.add(primaryMediaId);
    displayMedia.push({
      id: primaryMediaId,
      type: null,
      url: resource.primaryMediaUrl,
      cloudflare_thumbnail_url: resource.thumbnailUrl,
      cloudflare_playback_hls_url: null,
      backup_thumbnail_url: null,
      placeholder_image: null,
      alt: resourceTitle,
    });
  } else if (galleryMedia.length > 0) {
    // No primary explicitly flagged; fall back to first gallery item as the featured.
    const first = galleryMedia[0];
    seenMediaIds.add(first.id);
    displayMedia.push({
      id: first.id,
      type: first.type,
      url: first.url,
      cloudflare_thumbnail_url: first.cloudflare_thumbnail_url,
      cloudflare_playback_hls_url: first.cloudflare_playback_hls_url,
      backup_thumbnail_url: first.backup_thumbnail_url,
      placeholder_image: first.placeholder_image,
      alt: resourceTitle,
    });
  }

  for (const media of galleryMedia) {
    if (seenMediaIds.has(media.id)) continue;
    seenMediaIds.add(media.id);
    displayMedia.push({
      id: media.id,
      type: media.type,
      url: media.url,
      cloudflare_thumbnail_url: media.cloudflare_thumbnail_url,
      cloudflare_playback_hls_url: media.cloudflare_playback_hls_url,
      backup_thumbnail_url: media.backup_thumbnail_url,
      placeholder_image: media.placeholder_image,
      alt: resourceTitle,
    });
  }

  const commentMediaEntries = comments
    .flatMap((comment) =>
      comment.media.map((link) => ({
        comment,
        sortOrder: link.sortOrder,
        media: link.media,
      })),
    )
    .sort((left, right) => {
      const timestampDiff =
        new Date(right.comment.discordCreatedAt).getTime() - new Date(left.comment.discordCreatedAt).getTime();
      if (timestampDiff !== 0) return timestampDiff;
      return right.sortOrder - left.sortOrder;
    });

  for (const entry of commentMediaEntries) {
    if (seenMediaIds.has(entry.media.id)) continue;
    seenMediaIds.add(entry.media.id);
    const authorName = getDisplayName(
      entry.comment.author?.globalName,
      entry.comment.author?.username,
    );
    displayMedia.push({
      id: entry.media.id,
      type: entry.media.type,
      url: entry.media.url,
      cloudflare_thumbnail_url: entry.media.cloudflare_thumbnail_url,
      cloudflare_playback_hls_url: entry.media.cloudflare_playback_hls_url,
      backup_thumbnail_url: entry.media.backup_thumbnail_url,
      placeholder_image: entry.media.placeholder_image,
      alt: `Attachment from ${authorName}`,
    });
  }

  const renderDiscussionSection =
    commentsLoading || Boolean(commentsError) || comments.length > 0;

  return (
    <>
      <MadeWithThisSection
        displayMedia={displayMedia}
        resetKey={resource?.id ?? assetId}
        onOpenMedia={openLightbox}
      />

      {renderDiscussionSection && (
        <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Discussion
          </h2>
          {!commentsLoading && comments.length > 0 && (
            <span className="text-xs text-zinc-500">
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </span>
          )}
        </div>

        {commentsLoading && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm text-zinc-400">
            Loading discussion...
          </div>
        )}

        {!commentsLoading && commentsError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-200">
            {commentsError}
          </div>
        )}

        {!commentsLoading && !commentsError && comments.length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm text-zinc-400">
            No discussion yet.
          </div>
        )}

        {!commentsLoading && !commentsError && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => {
              const authorName = getDisplayName(comment.author?.globalName, comment.author?.username);
              const replyTarget = comment.replyToCommentId
                ? commentLookup.get(comment.replyToCommentId)
                : null;
              const replyAuthorName = replyTarget
                ? getDisplayName(replyTarget.author?.globalName, replyTarget.author?.username)
                : null;
              const discordUrl = buildDiscordMessageUrl(
                comment.discordGuildId,
                comment.discordThreadId,
                comment.discordMessageId,
              );

              return (
                <article
                  key={comment.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {comment.author?.avatarUrl ? (
                        <img
                          src={comment.author.avatarUrl}
                          alt={authorName}
                          className="h-10 w-10 rounded-full border border-white/10 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-zinc-300">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-zinc-200">
                          <span className="font-medium">{authorName}</span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatRelativeDate(comment.discordCreatedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300">
                        {comment.reactionCount} reactions
                      </span>
                      {discordUrl && (
                        <a
                          href={discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                        >
                          View on Discord
                        </a>
                      )}
                    </div>
                  </div>

                  {replyTarget && replyAuthorName && (
                    <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
                      <span className="font-medium">Replying to @{replyAuthorName}</span>
                      <span className="truncate text-zinc-500">
                        {getCommentExcerpt(replyTarget.content)}
                      </span>
                    </div>
                  )}

                  {comment.content && (
                    <div className="mt-4">
                      <AssetDescription markdown={comment.content} />
                    </div>
                  )}

                  {comment.media.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {comment.media.map((link) => {
                        if (!link.media.url && !link.media.cloudflare_playback_hls_url) return null;
                        const commentMediaItem: DisplayMediaItem = {
                          id: link.media.id,
                          type: link.media.type,
                          url: link.media.url,
                          cloudflare_thumbnail_url: link.media.cloudflare_thumbnail_url,
                          cloudflare_playback_hls_url: link.media.cloudflare_playback_hls_url,
                          backup_thumbnail_url: link.media.backup_thumbnail_url,
                          placeholder_image: link.media.placeholder_image,
                          alt: `Attachment from ${authorName}`,
                        };

                        return (
                          <HoverMediaTile
                            key={`${comment.id}-${link.media.id}`}
                            item={commentMediaItem}
                            onOpen={() => openLightbox(commentMediaItem)}
                            alt={`Attachment from ${authorName}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        </section>
      )}

      {lightboxItem && <MediaLightbox item={lightboxItem} onClose={closeLightbox} />}
    </>
  );
}
