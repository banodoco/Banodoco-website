import { Skeleton, SkeletonParagraph, SkeletonBullet } from '@/components/ui/Skeleton';

/** Skeleton card for loading state - matches TopicCard structure */
export const TopicCardSkeleton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
  <div
    className={`bg-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border border-white/10 ${
      fullWidth ? "w-[85vw] shrink-0 snap-center" : ""
    }`}
  >
    {/* Channel header */}
    <div className={`border-b border-white/10 flex items-center justify-between ${
      fullWidth ? "px-4 py-3" : "px-3 py-2 md:px-6 md:py-4"
    }`}>
      <Skeleton className={`rounded-full ${fullWidth ? "w-20 h-6" : "w-16 h-5 md:w-20 md:h-6"}`} />
      <Skeleton className={fullWidth ? "w-16 h-4" : "w-12 h-3 md:w-16 md:h-4"} />
    </div>

    {/* Content */}
    <div className={fullWidth ? "p-4" : "p-3 md:p-6"}>
      {/* Mobile layout */}
      <div className={`flex gap-3 ${fullWidth ? "gap-4" : "md:hidden"}`}>
        <div className="flex-1 min-w-0">
          <Skeleton className={`mb-2 ${fullWidth ? "h-5 w-3/4" : "h-4 w-3/4"}`} />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <SkeletonBullet key={i} />
            ))}
          </div>
        </div>
        <Skeleton className={`shrink-0 rounded-lg ${fullWidth ? "w-32 h-24" : "w-24 h-20"}`} />
      </div>

      {/* Desktop layout */}
      <div className={`hidden md:grid gap-6 grid-cols-2 ${fullWidth ? "!hidden" : ""}`}>
        <div>
          <Skeleton className="h-6 w-4/5 mb-3" />
          <SkeletonParagraph lines={3} className="mb-4" />
          <div className="space-y-2 mt-4">
            {[1, 2].map((i) => (
              <SkeletonBullet key={i} className="mt-0.5" />
            ))}
          </div>
        </div>
        <Skeleton className="rounded-lg aspect-video" />
      </div>
    </div>

    {/* Footer - desktop only */}
    <div className="hidden md:block px-6 py-4 border-t border-white/10">
      <Skeleton className="h-4 w-28" />
    </div>
  </div>
);

/** Skeleton loading state for topic cards */
export const TopicCardsSkeleton = ({ mobile = false }: { mobile?: boolean }) => {
  if (mobile) {
    return (
      <>
        <div
          className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-8 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[1, 2, 3].map((i) => (
            <TopicCardSkeleton key={i} fullWidth />
          ))}
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={`h-2 rounded-full ${i === 1 ? "w-4" : "w-2"}`} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <TopicCardSkeleton key={i} />
      ))}
    </div>
  );
};

/** Error/empty states for topic cards */
interface TopicCardsStateProps {
  error: string | null;
  isEmpty: boolean;
}

export const TopicCardsState = ({ error, isEmpty }: TopicCardsStateProps) => {
  if (error) {
    return (
      <div className="text-center py-20 px-4 xl:px-0 text-white/50">
        {error}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-20 px-4 xl:px-0 text-white/50">
        No updates available yet. Check back later!
      </div>
    );
  }

  return null;
};
