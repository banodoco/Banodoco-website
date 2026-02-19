import { useCommunityResources } from '@/hooks/useCommunityResources';
import { CommunityResourceCard } from './CommunityResourceCard';

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 animate-pulse">
      {/* Badge skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-16 bg-white/10 rounded-full" />
        <div className="h-4 w-10 bg-white/5 rounded-full" />
      </div>
      {/* Title skeleton */}
      <div className="h-5 w-3/4 bg-white/10 rounded mb-2" />
      {/* Description skeleton */}
      <div className="space-y-1.5 mb-3">
        <div className="h-3.5 w-full bg-white/8 rounded" />
        <div className="h-3.5 w-5/6 bg-white/5 rounded" />
        <div className="h-3.5 w-2/3 bg-white/5 rounded" />
      </div>
      {/* URL skeleton */}
      <div className="h-3 w-32 bg-white/5 rounded mb-3" />
      {/* Tags skeleton */}
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 w-14 bg-white/5 rounded-full" />
        <div className="h-5 w-12 bg-white/5 rounded-full" />
        <div className="h-5 w-16 bg-white/5 rounded-full" />
      </div>
      {/* Creator skeleton */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <div className="w-5 h-5 rounded-full bg-white/10" />
        <div className="h-3 w-20 bg-white/8 rounded" />
      </div>
    </div>
  );
}

export const CommunityResourcesSection = () => {
  const { resources, loading, loadingMore, error, hasMore, loadMore } = useCommunityResources();

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <section>
      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <CommunityResourceCard key={resource.id} resource={resource} />
            ))}
          </div>

          {resources.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">No community resources yet.</p>
            </div>
          )}

          {/* Load more */}
          {hasMore && resources.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
