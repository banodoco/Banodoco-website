import { ResourceCard } from './ResourceCard';
import type { Asset } from './types';

interface ResourceGridProps {
  assets: Asset[];
  loading: boolean;
}

const SkeletonCard = ({ featured = false }: { featured?: boolean }) => (
  <div className={featured ? 'sm:col-span-2' : ''}>
    <div className="w-full rounded-lg overflow-hidden bg-white/5 border border-white/10">
      <div className={`relative bg-white/[0.07] ${featured ? 'aspect-[2/1]' : 'aspect-video'}`}>
        <div className="absolute inset-0 animate-pulse bg-white/[0.04]" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <div className="h-4 w-10 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
      <div className="p-3">
        <div className={`rounded bg-white/10 animate-pulse ${featured ? 'h-5 w-3/4' : 'h-4 w-3/4'}`} />
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse shrink-0" />
          <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <div className="h-[18px] w-12 rounded-full bg-white/[0.07] animate-pulse" />
          <div className="h-[18px] w-20 rounded-full bg-white/[0.07] animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

export const ResourceGrid = ({ assets, loading }: ResourceGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <SkeletonCard featured />
        <SkeletonCard featured />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-lg">No resources match your filters</p>
        <p className="text-white/25 text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  // Trim items so the last row on xl (4 cols) is always full.
  const xlCols = 4;
  let slots = 0;
  const displayAssets: Asset[] = [];
  for (const asset of assets) {
    const span = asset.admin_status === 'Featured' ? 2 : 1;
    displayAssets.push(asset);
    slots += span;
  }
  while (displayAssets.length > 0 && slots % xlCols !== 0) {
    const removed = displayAssets.pop()!;
    slots -= removed.admin_status === 'Featured' ? 2 : 1;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {displayAssets.map(asset => {
        const isFeaturedSize = asset.admin_status === 'Featured';
        return (
          <div
            key={asset.id}
            className={isFeaturedSize ? 'sm:col-span-2' : ''}
          >
            <ResourceCard
              asset={asset}
              isFeaturedSize={isFeaturedSize}
            />
          </div>
        );
      })}
    </div>
  );
};
