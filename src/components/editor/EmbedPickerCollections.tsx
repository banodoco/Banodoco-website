import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useArtPieces } from '@/hooks/useArtPieces';
import { useCommunityResources } from '@/hooks/useCommunityResources';
import { PickerGrid, type EditorPickerItem } from './PickerGrid';

interface EmbedPickerCollectionsProps {
  open: 'art' | 'resource';
  onInsert: (token: string) => void;
}

export function EmbedPickerCollections({ open, onInsert }: EmbedPickerCollectionsProps) {
  const { profile } = useAuth();
  const { artPieces, loading: artLoading, hasMore: artHasMore, loadMore: loadMoreArt } = useArtPieces(
    profile?.memberId ?? undefined,
  );
  const {
    resources,
    loading: resourcesLoading,
    hasMore: resourcesHasMore,
    loadMore: loadMoreResources,
  } = useCommunityResources(profile?.memberId ?? undefined);

  if (open === 'art') {
    const artItems: EditorPickerItem[] = artPieces.map((piece) => ({
      id: piece.id,
      label: piece.caption ?? piece.title ?? 'Untitled art',
      thumbnailUrl: piece.thumbnailUrl,
      mediaType: piece.mediaType,
    }));

    return (
      <>
        {artHasMore && (
          <button
            type="button"
            onClick={loadMoreArt}
            className="mb-4 text-xs text-orange-300 hover:text-orange-200"
          >
            Load more
          </button>
        )}
        <PickerGrid
          items={artItems}
          loading={artLoading}
          emptyMessage="No art pieces available yet."
          onSelect={(id) => onInsert(`::art[${id}]\n`)}
        />
      </>
    );
  }

  if (resourcesLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (resources.length === 0) {
    return <p className="text-sm text-zinc-500">No resources available yet.</p>;
  }

  return (
    <>
      {resourcesHasMore && (
        <button
          type="button"
          onClick={loadMoreResources}
          className="mb-4 text-xs text-orange-300 hover:text-orange-200"
        >
          Load more
        </button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {resources.map((resource) => (
          <button
            key={resource.id}
            type="button"
            onClick={() => onInsert(`::resource[${resource.id}]\n`)}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-left transition-colors hover:border-zinc-600"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              {resource.thumbnailUrl ? (
                <img src={resource.thumbnailUrl} alt={resource.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600">
                  <span className="text-xs">RS</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">{resource.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{resource.resourceType}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export default EmbedPickerCollections;
