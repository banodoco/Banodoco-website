/**
 * Vibe Mode — snapshot graph sidebar.
 *
 * Renders the session's snapshot chain as a vertical indented tree.
 * Clicking a row restores that snapshot (`pickSnapshot`); shift-clicking
 * creates a `source:'fork'` snapshot that diverges from the clicked
 * node (`fork`). Pinned snapshots render with a lock glyph and are
 * exempt from ring-buffer eviction (enforced by `db.ts`).
 */

import { useMemo, type MouseEvent } from 'react';
import type { VibeSnapshot } from '@/types/vibe';

type SourceStyle = { label: string; badge: string };
const SOURCE_STYLES: Record<VibeSnapshot['source'], SourceStyle> = {
  template: { label: 'template', badge: 'bg-indigo-900/60 text-indigo-300' },
  assistant_turn: { label: 'turn', badge: 'bg-zinc-800 text-zinc-300' },
  user_raw_edit: { label: 'edit', badge: 'bg-amber-900/60 text-amber-300' },
  fork: { label: 'fork', badge: 'bg-sky-900/60 text-sky-300' },
  undo: { label: 'undo', badge: 'bg-rose-900/60 text-rose-300' },
};

export interface SnapshotGraphProps {
  snapshots: readonly VibeSnapshot[];
  activeSnapshotId: string | null;
  onPick(id: string): void | Promise<void>;
  onFork(id: string): void | Promise<void>;
}

interface GraphNode {
  snapshot: VibeSnapshot;
  depth: number;
}

/** Cap so deep fork chains can't push rows off the right edge. */
const MAX_INDENT_DEPTH = 4;

/**
 * Flatten the DAG into a depth-first row list. Roots first, then each
 * root's descendants in turnIndex/createdAt order. Depth only advances
 * at real fork points (parents with >1 child) so a long linear chain of
 * turns stays flush-left instead of drifting off the right edge.
 */
const flattenGraph = (snapshots: readonly VibeSnapshot[]): GraphNode[] => {
  const byId = new Map<string, VibeSnapshot>();
  const childrenOf = new Map<string | 'roots', VibeSnapshot[]>();
  for (const s of snapshots) byId.set(s.id, s);
  for (const s of snapshots) {
    const key = s.parentSnapshotId && byId.has(s.parentSnapshotId) ? s.parentSnapshotId : 'roots';
    const arr = childrenOf.get(key) ?? [];
    arr.push(s);
    childrenOf.set(key, arr);
  }
  const orderedPush = (arr: VibeSnapshot[]): VibeSnapshot[] =>
    [...arr].sort((a, b) =>
      a.turnIndex !== b.turnIndex ? a.turnIndex - b.turnIndex : a.createdAt.localeCompare(b.createdAt),
    );
  const out: GraphNode[] = [];
  const walk = (snap: VibeSnapshot, depth: number) => {
    out.push({ snapshot: snap, depth });
    const children = orderedPush(childrenOf.get(snap.id) ?? []);
    const childDepth =
      children.length > 1 ? Math.min(depth + 1, MAX_INDENT_DEPTH) : depth;
    for (const child of children) walk(child, childDepth);
  };
  for (const root of orderedPush(childrenOf.get('roots') ?? [])) walk(root, 0);
  return out;
};

export function SnapshotGraph({ snapshots, activeSnapshotId, onPick, onFork }: SnapshotGraphProps) {
  const rows = useMemo(() => flattenGraph(snapshots), [snapshots]);

  if (rows.length === 0) {
    return (
      <div className="p-3 text-xs text-zinc-500">
        No snapshots yet. Each turn, template pick, or manual edit records one.
      </div>
    );
  }

  const handleClick = (snap: VibeSnapshot) => (e: MouseEvent<HTMLButtonElement>) => {
    if (e.shiftKey) {
      e.preventDefault();
      void onFork(snap.id);
      return;
    }
    void onPick(snap.id);
  };

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-2 text-xs">
      <div className="px-1 pb-1 text-[10px] uppercase tracking-wide text-zinc-500">
        Snapshots · click to restore · shift-click to fork
      </div>
      {rows.map(({ snapshot, depth }) => {
        const isActive = snapshot.id === activeSnapshotId;
        const style = SOURCE_STYLES[snapshot.source];
        return (
          <button
            key={snapshot.id}
            type="button"
            onClick={handleClick(snapshot)}
            title={`${style.label} · ${snapshot.createdAt}`}
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left transition ${
              isActive
                ? 'bg-zinc-800 text-zinc-100 ring-1 ring-emerald-500/60'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
            }`}
            style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
          >
            <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${style.badge}`}>
              {style.label}
            </span>
            <span className="flex-1 truncate">
              {snapshot.label ?? `turn ${snapshot.turnIndex}`}
            </span>
            {snapshot.pinned && (
              <span aria-label="pinned" className="text-[10px] text-amber-300" title="Pinned">
                🔒
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
