/**
 * Vibe Mode — library picker modal.
 *
 * Wraps `useArtPieces` + `useCommunityResources` and commits picks as
 * `binary-asset` VirtualFile entries via `onPick`. The caller is
 * responsible for downloading the remote bytes and storing them to
 * IDB; this modal only surfaces the catalog + selection.
 */

import { useMemo, useState } from 'react';
import { useArtPieces, type ArtPieceItem } from '@/hooks/useArtPieces';
import { useCommunityResources, type CommunityResourceItem } from '@/hooks/useCommunityResources';

export type LibraryPick =
  | { kind: 'art'; item: ArtPieceItem }
  | { kind: 'resource'; item: CommunityResourceItem };

export interface LibraryPickerModalProps {
  open: boolean;
  onClose(): void;
  onPick(pick: LibraryPick): void;
  memberId?: string;
}

type Tab = 'art' | 'resources';

export function LibraryPickerModal({ open, onClose, onPick, memberId }: LibraryPickerModalProps) {
  const [tab, setTab] = useState<Tab>('art');
  const { artPieces, loading: artLoading } = useArtPieces(memberId);
  const { resources, loading: resLoading } = useCommunityResources(memberId);

  const bodyContent = useMemo(() => {
    if (tab === 'art') {
      if (artLoading) return <p className="p-6 text-sm text-zinc-400">Loading art…</p>;
      if (artPieces.length === 0) return <p className="p-6 text-sm text-zinc-400">No art found.</p>;
      return (
        <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {artPieces.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onPick({ kind: 'art', item });
                  onClose();
                }}
                className="block w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-left transition hover:border-zinc-500"
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title ?? ''} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square w-full bg-zinc-800" />
                )}
                <div className="p-2 text-xs text-zinc-300">{item.title ?? 'Untitled'}</div>
              </button>
            </li>
          ))}
        </ul>
      );
    }
    if (resLoading) return <p className="p-6 text-sm text-zinc-400">Loading resources…</p>;
    if (resources.length === 0) return <p className="p-6 text-sm text-zinc-400">No resources found.</p>;
    return (
      <ul className="flex flex-col gap-2 p-4">
        {resources.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                onPick({ kind: 'resource', item });
                onClose();
              }}
              className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-zinc-500"
            >
              <div className="text-sm font-medium text-zinc-100">{item.title}</div>
              {item.description && (
                <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{item.description}</div>
              )}
            </button>
          </li>
        ))}
      </ul>
    );
  }, [tab, artPieces, artLoading, resources, resLoading, onPick, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-3">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab('art')}
              className={`rounded px-2 py-1 ${tab === 'art' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
            >
              Art
            </button>
            <button
              type="button"
              onClick={() => setTab('resources')}
              className={`rounded px-2 py-1 ${tab === 'resources' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
            >
              Resources
            </button>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto">{bodyContent}</div>
      </div>
    </div>
  );
}
