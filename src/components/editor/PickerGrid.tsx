import { ImagePlus, Loader2 } from 'lucide-react';

export interface EditorPickerItem {
  id: string;
  label: string;
  thumbnailUrl: string | null;
  mediaType?: string | null;
  subtitle?: string | null;
}

interface PickerGridProps {
  items: EditorPickerItem[];
  onSelect: (id: string) => void;
  emptyMessage: string;
  loading?: boolean;
  selectedId?: string | null;
}

export function PickerGrid({
  items,
  onSelect,
  emptyMessage,
  loading = false,
  selectedId,
}: PickerGridProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`overflow-hidden rounded-xl border text-left transition-colors ${
            selectedId === item.id
              ? 'border-orange-400 bg-orange-500/10'
              : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600'
          }`}
        >
          <div className="aspect-[4/3] bg-zinc-900">
            {item.thumbnailUrl ? (
              item.mediaType?.startsWith('video') ? (
                <video
                  src={item.thumbnailUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={item.thumbnailUrl} alt={item.label} className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">
                <ImagePlus size={18} />
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium text-zinc-200">{item.label}</p>
            <p className="mt-1 text-xs text-zinc-500">{item.subtitle ?? item.mediaType ?? 'media'}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
