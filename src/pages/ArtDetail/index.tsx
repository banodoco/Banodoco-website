import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useArtPiece } from '@/hooks/useArtPiece';
import { useArtPieces } from '@/hooks/useArtPieces';
import { useLinkedAssets } from '@/hooks/useLinkedAssets';
import { CinematicVideoPlayer } from '@/components/CinematicVideoPlayer';
import { ArtGalleryCard } from '@/pages/Resources/ArtGallery/ArtGalleryCard';
import { buildArtPath, buildResourcePath } from '@/lib/routing';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
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
  const { slug, username } = useParams<{ slug: string; username?: string }>();
  const navigate = useNavigate();
  const { artPiece, loading, error } = useArtPiece(slug);
  const { assets: linkedAssets } = useLinkedAssets(artPiece?.id);

  useEffect(() => {
    if (!artPiece || !slug) return;
    const correctSlug = artPiece.slug;
    if (correctSlug !== slug) {
      navigate(buildArtPath(artPiece.id, artPiece.caption, username), { replace: true });
    }
  }, [artPiece, navigate, slug, username]);

  // Fetch other art from the same creator
  const creatorMemberId = artPiece?.memberId;
  const { artPieces: creatorArt, loading: sidebarLoading } = useArtPieces(
    creatorMemberId ?? '__none__'
  );
  const relatedArt = creatorMemberId
    ? creatorArt.filter(a => a.id !== artPiece?.id).slice(0, 6)
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
        <button onClick={() => navigate(-1)} className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer">
          Go back
        </button>
      </div>
    );
  }

  const { creator, caption, createdAt, hlsUrl, thumbnailUrl, toolsUsed } = artPiece;
  const creatorName = creator.displayName ?? creator.username ?? 'Unknown';
  const showSidebar = !!creatorMemberId && (sidebarLoading || relatedArt.length > 0);

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-8 sm:pt-24 sm:pb-12">
        {/* Breadcrumb + creator */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-sm text-zinc-500">
            <Link to="/resources" className="hover:text-zinc-300 transition-colors">Resources</Link>
            <span>/</span>
            <span className="text-zinc-400">Art</span>
          </nav>

          <div className="flex min-w-0 items-center gap-3">
            {creator.avatarUrl ? (
              <img src={creator.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white/40 font-medium">{creatorName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0 text-right">
              {creator.profileUrl ? (
                <Link to={creator.profileUrl} className="block truncate text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                  {creatorName}
                </Link>
              ) : (
                <span className="block truncate text-sm font-medium text-zinc-300">{creatorName}</span>
              )}
              <p className="text-xs text-zinc-500">{formatDate(createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className={`grid grid-cols-1 gap-8 ${showSidebar ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
          {/* Main content */}
          <div className="min-w-0">
            {/* Video / Image viewer */}
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
              {hlsUrl ? (
                <CinematicVideoPlayer
                  hlsUrl={hlsUrl}
                  thumbnailUrl={thumbnailUrl}
                  autoPlay
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
            <div className="mt-6 space-y-4">
              {artPiece.title && (
                <h1 className="text-xl sm:text-2xl font-bold text-white">{artPiece.title}</h1>
              )}
              {caption && (
                <p className="text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {caption}
                </p>
              )}

              {/* Tools used */}
              {toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {toolsUsed.map((tool, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs font-medium bg-white/5 text-zinc-400 rounded-full border border-white/10">
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              {/* Linked assets */}
              {linkedAssets.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                    Assets Used
                  </h3>
                  <div className="space-y-2">
                    {linkedAssets.map(asset => (
                      <Link
                        key={asset.id}
                        to={buildResourcePath(asset.id, asset.name, asset.creatorUsername)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition group"
                      >
                        {asset.thumbnailUrl && (
                          <img src={asset.thumbnailUrl} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {asset.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                              {asset.type}
                            </span>
                            {asset.loraBaseModel && (
                              <span className="text-[10px] text-zinc-500">{asset.loraBaseModel}</span>
                            )}
                          </div>
                        </div>
                        {/* Download/source link */}
                        {(asset.loraLink || asset.downloadLink) && (
                          <a
                            href={(asset.loraLink || asset.downloadLink)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                            title="Download"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        )}
                        <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: More from creator */}
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
