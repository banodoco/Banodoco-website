import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { MarkdownTextSegment } from '@/components/posts/MarkdownRenderer';
import { splitBodyIntoSegments } from '@/lib/postMarkdown';
import { buildArtPath, buildResourcePath } from '@/lib/routing';
import { HlsPlayer } from '@/pages/Resources/HlsPlayer';
import type { PostAssetItem, PostMediaItem } from '@/hooks/usePost';

type Variant = 'detail' | 'preview';

export interface PostBodyRendererProps {
  body: string | null | undefined;
  mediaById: Record<string, PostMediaItem>;
  assetsById: Record<string, PostAssetItem>;
  variant?: Variant;
  emptyMessage?: string;
  /** When true, embed cards don't link anywhere — useful for the authoring preview. */
  inert?: boolean;
}

export function PostBodyRenderer({
  body,
  mediaById,
  assetsById,
  variant = 'detail',
  emptyMessage,
  inert = false,
}: PostBodyRendererProps) {
  const segments = useMemo(() => splitBodyIntoSegments(body), [body]);

  if (segments.length === 0) {
    return emptyMessage ? (
      <p className={variant === 'preview' ? 'text-sm text-zinc-500' : 'text-zinc-500'}>
        {emptyMessage}
      </p>
    ) : null;
  }

  const gap = variant === 'preview' ? 'space-y-4' : 'space-y-8';

  return (
    <div className={gap}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          if (!segment.content.trim()) return <Fragment key={`space-${index}`} />;
          return (
            <div key={`text-${index}`}>
              <MarkdownTextSegment content={segment.content} />
            </div>
          );
        }

        const key = `${segment.embedType}-${segment.id}-${index}`;

        if (segment.embedType === 'art') {
          return (
            <EmbeddedArt
              key={key}
              id={segment.id}
              media={mediaById[segment.id]}
              variant={variant}
              inert={inert}
            />
          );
        }

        if (segment.embedType === 'resource') {
          return (
            <EmbeddedResource
              key={key}
              id={segment.id}
              asset={assetsById[segment.id]}
              variant={variant}
              inert={inert}
            />
          );
        }

        return (
          <EmbeddedMedia
            key={key}
            id={segment.id}
            media={mediaById[segment.id]}
            variant={variant}
          />
        );
      })}
    </div>
  );
}

function Missing({ label, id, variant }: { label: string; id: string; variant: Variant }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 ${
        variant === 'preview' ? 'text-xs' : 'text-sm'
      } text-zinc-500`}
    >
      Missing {label} embed: {id}
    </div>
  );
}

function EmbeddedArt({
  id,
  media,
  variant,
  inert,
}: {
  id: string;
  media?: PostMediaItem;
  variant: Variant;
  inert: boolean;
}) {
  if (!media) return <Missing label="art" id={id} variant={variant} />;

  const body = (
    <>
      {media.thumbnailUrl ? (
        <div className="aspect-video bg-black">
          <img
            src={media.thumbnailUrl}
            alt={media.description ?? 'Embedded art'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className={variant === 'preview' ? 'p-3' : 'p-4'}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300">Art</p>
        <p className={`mt-2 ${variant === 'preview' ? 'text-xs' : 'text-sm'} text-zinc-200`}>
          {media.description ?? `Art piece ${id.slice(0, 8)}`}
        </p>
      </div>
    </>
  );

  const className = 'block overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]';

  if (inert) return <div className={className}>{body}</div>;

  return (
    <Link
      to={buildArtPath(id, media.description ?? 'Embedded Art')}
      className={`${className} transition hover:border-white/20`}
    >
      {body}
    </Link>
  );
}

function EmbeddedResource({
  id,
  asset,
  variant,
  inert,
}: {
  id: string;
  asset?: PostAssetItem;
  variant: Variant;
  inert: boolean;
}) {
  if (!asset) return <Missing label="resource" id={id} variant={variant} />;

  const thumbSize = variant === 'preview' ? 'h-14 w-14' : 'h-20 w-20';
  const titleSize = variant === 'preview' ? 'text-sm' : 'text-lg';

  const body = (
    <div className={`flex items-start gap-4 ${variant === 'preview' ? 'p-3' : 'p-4'}`}>
      {asset.thumbnailUrl ? (
        <img
          src={asset.thumbnailUrl}
          alt={asset.title}
          className={`${thumbSize} shrink-0 rounded-lg object-cover`}
          loading="lazy"
        />
      ) : (
        <div className={`${thumbSize} flex shrink-0 items-center justify-center rounded-lg bg-white/5`}>
          <Newspaper size={variant === 'preview' ? 14 : 18} className="text-zinc-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300">
          Resource
        </p>
        <h3 className={`mt-1 ${titleSize} font-semibold text-white`}>{asset.title}</h3>
        {asset.description && (
          <p className={`mt-1 line-clamp-2 ${variant === 'preview' ? 'text-xs' : 'text-sm'} text-zinc-400`}>
            {asset.description}
          </p>
        )}
      </div>
    </div>
  );

  const className = 'block rounded-xl border border-white/10 bg-white/[0.03]';

  if (inert) return <div className={className}>{body}</div>;

  return (
    <Link
      to={buildResourcePath(asset.id, {
        label: asset.title,
        persistedSlug: asset.slug,
        username: asset.creator.username,
      })}
      className={`${className} transition hover:border-white/20`}
    >
      {body}
    </Link>
  );
}

function EmbeddedMedia({
  id,
  media,
  variant,
}: {
  id: string;
  media?: PostMediaItem;
  variant: Variant;
}) {
  if (!media) return <Missing label="media" id={id} variant={variant} />;

  if (media.hlsUrl) {
    return (
      <HlsPlayer
        hlsUrl={media.hlsUrl}
        thumbnailUrl={media.cloudflareThumbnailUrl}
        autoPlay={false}
        className="aspect-video overflow-hidden rounded-xl"
      />
    );
  }

  if (media.type === 'video' && media.cloudflareThumbnailUrl) {
    return (
      <video
        src={media.cloudflareThumbnailUrl}
        controls
        playsInline
        className="aspect-video w-full rounded-xl bg-black"
      />
    );
  }

  if (media.thumbnailUrl) {
    return (
      <img
        src={media.thumbnailUrl}
        alt={media.description ?? 'Embedded media'}
        className="w-full rounded-xl border border-white/10"
        loading="lazy"
      />
    );
  }

  return <Missing label="media" id={id} variant={variant} />;
}
