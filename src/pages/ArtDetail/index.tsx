import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useArtPiece } from '@/hooks/useArtPiece';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const ArtDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artPiece, loading, error } = useArtPiece(id);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  if (loading) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !artPiece) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400/80 text-lg">{error ?? 'Art piece not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  const { mediaUrls, mediaTypes, creator, title, caption, reactionCount, createdAt, tags, associatedAssetId } = artPiece;
  const activeUrl = mediaUrls[activeMediaIndex] ?? mediaUrls[0];
  const activeType = mediaTypes[activeMediaIndex] ?? mediaTypes[0] ?? '';
  const isActiveVideo =
    activeType.startsWith('video/') ||
    activeUrl?.endsWith('.mp4') ||
    activeUrl?.endsWith('.webm');

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {/* Main media viewer */}
        <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
          {activeUrl && (
            <div className="relative">
              {isActiveVideo ? (
                <video
                  key={activeUrl}
                  src={activeUrl}
                  controls
                  playsInline
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              ) : (
                <img
                  key={activeUrl}
                  src={activeUrl}
                  alt={title ?? 'Art piece'}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              )}
            </div>
          )}
        </div>

        {/* Gallery strip for multiple media */}
        {mediaUrls.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {mediaUrls.map((url, i) => {
              const type = mediaTypes[i] ?? '';
              const isThumbVideo =
                type.startsWith('video/') ||
                url.endsWith('.mp4') ||
                url.endsWith('.webm');
              const isActive = i === activeMediaIndex;

              return (
                <button
                  key={url}
                  onClick={() => setActiveMediaIndex(i)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-white/60 ring-1 ring-white/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {isThumbVideo ? (
                    <video
                      src={url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  {isThumbVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg
                        className="w-4 h-4 text-white/80"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Info section */}
        <div className="mt-8 space-y-6">
          {/* Title */}
          {title && (
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {title}
            </h1>
          )}

          {/* Creator info */}
          <div className="flex items-center gap-3">
            {creator.avatarUrl && (
              <img
                src={creator.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              {creator.profileUrl ? (
                <Link
                  to={creator.profileUrl}
                  className="text-sm font-medium text-white hover:text-orange-400 transition-colors"
                >
                  {creator.displayName ?? creator.username ?? 'Unknown'}
                </Link>
              ) : (
                <span className="text-sm font-medium text-white">
                  {creator.displayName ?? creator.username ?? 'Unknown'}
                </span>
              )}
              <p className="text-xs text-zinc-500">{formatDate(createdAt)}</p>
            </div>
          </div>

          {/* Caption */}
          {caption && (
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {caption}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Reaction count */}
            {reactionCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg">
                <svg
                  className="w-4 h-4 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-zinc-300">{reactionCount}</span>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 &&
              tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-medium bg-white/5 border border-white/10 rounded-full text-zinc-400"
                >
                  {tag}
                </span>
              ))}
          </div>

          {/* Associated model */}
          {associatedAssetId && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Associated Model
              </p>
              <p className="text-sm text-zinc-300 font-mono">
                {associatedAssetId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtDetail;
