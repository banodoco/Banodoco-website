import { useParams, useNavigate, Link } from 'react-router-dom';
import { useArtPiece } from '@/hooks/useArtPiece';
import { useArtPieces } from '@/hooks/useArtPieces';
import { HlsPlayer } from '@/pages/Resources/HlsPlayer';
import { ArtGalleryCard } from '@/pages/Resources/ArtGallery/ArtGalleryCard';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse rounded-lg border border-white/5 overflow-hidden">
          <div className="aspect-video bg-white/5" />
        </div>
      ))}
    </div>
  );
}

const ArtDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artPiece, loading, error } = useArtPiece(id);

  // Fetch other art from the same creator (only when userId exists)
  const hasCreatorId = !!artPiece?.userId;
  const { artPieces: creatorArt, loading: sidebarLoading } = useArtPieces(
    artPiece?.userId ?? undefined
  );
  const relatedArt = hasCreatorId
    ? creatorArt.filter(a => a.id !== id).slice(0, 6)
    : [];

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

  const { creator, caption, createdAt, hlsUrl, thumbnailUrl } = artPiece;
  const creatorName = creator.displayName ?? creator.username ?? 'Unknown';
  const showSidebar = hasCreatorId && (sidebarLoading || relatedArt.length > 0);

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8 sm:pt-28 sm:pb-12">
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

        {/* Two-column YouTube layout */}
        <div className={`grid grid-cols-1 gap-8 ${showSidebar ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
          {/* Left column: main content */}
          <div className="min-w-0">
            {/* Main media viewer */}
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
              {hlsUrl ? (
                <HlsPlayer
                  hlsUrl={hlsUrl}
                  thumbnailUrl={thumbnailUrl}
                  className="w-full aspect-video"
                />
              ) : thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={caption ?? 'Art piece'}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black text-white/20">
                  No preview available
                </div>
              )}
            </div>

            {/* Info section */}
            <div className="mt-8 space-y-6">
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
                      {creatorName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-white">
                      {creatorName}
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
            </div>
          </div>

          {/* Right column: sidebar */}
          {showSidebar && (
            <aside className="min-w-0">
              {sidebarLoading ? (
                <SidebarSkeleton />
              ) : (
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    More from {creatorName}
                  </h2>
                  {relatedArt.map(a => (
                    <ArtGalleryCard key={a.id} artPiece={a} />
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtDetail;
