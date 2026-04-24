/**
 * Vibe Mode — “show code” Monaco editor side panel.
 *
 * Toggled via the `/show-code` slash command. Lets the author edit any
 * text file in the virtual tree directly; saving records a snapshot with
 * `source:'user_raw_edit'` via `commitTree`, same code path as the
 * agent's edits. Binary-asset entries are listed but not openable —
 * editing blobs would require a separate UI.
 *
 * Monaco is imported lazily via `@monaco-editor/react` so the editor
 * chunk stays out of the main bundle; this file itself is pulled in
 * only via `BundleAgentEditor`'s lazy import.
 */

import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VirtualFile, VirtualFileTree } from '@/types/vibe';
import { writeFile } from './virtualFileTree';

export interface ProCodePanelProps {
  tree: VirtualFileTree;
  onCommit(nextTree: VirtualFileTree): Promise<void> | void;
  onClose?(): void;
}

const languageFor = (path: string): string => {
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.svg')) return 'xml';
  return 'plaintext';
};

const firstTextPath = (tree: VirtualFileTree): string | null => {
  const keys = Object.keys(tree).sort();
  for (const k of keys) if (tree[k].kind === 'text') return k;
  return null;
};

export function ProCodePanel({ tree, onCommit, onClose }: ProCodePanelProps) {
  const paths = useMemo(() => Object.keys(tree).sort(), [tree]);
  const [activePath, setActivePath] = useState<string | null>(() => firstTextPath(tree));
  const [draft, setDraft] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFile: VirtualFile | null = activePath ? tree[activePath] ?? null : null;

  // Reset the draft whenever the active path or its source changes.
  useEffect(() => {
    if (!activeFile || activeFile.kind !== 'text') {
      setDraft('');
      setDirty(false);
      return;
    }
    setDraft(typeof activeFile.content === 'string' ? activeFile.content : '');
    setDirty(false);
    setError(null);
  }, [activePath, activeFile]);

  const handleChange = useCallback((value: string | undefined) => {
    const next = value ?? '';
    setDraft(next);
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!activePath || !activeFile || activeFile.kind !== 'text') return;
    setSaving(true);
    setError(null);
    try {
      const result = writeFile(tree, activePath, draft, { mime: activeFile.mime });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onCommit(result.tree);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [activePath, activeFile, tree, draft, onCommit]);

  return (
    <div className="flex h-full w-full flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs">
        <span className="font-medium text-zinc-200">Pro code</span>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-amber-300">unsaved</span>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving || !activeFile || activeFile.kind !== 'text'}
            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            Save
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
            >
              Close
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 overflow-y-auto border-r border-zinc-800 p-1 text-xs">
          {paths.length === 0 && <div className="p-2 text-zinc-500">No files yet.</div>}
          {paths.map((p) => {
            const f = tree[p];
            const isActive = p === activePath;
            const isBinary = f.kind !== 'text';
            return (
              <button
                key={p}
                type="button"
                onClick={() => !isBinary && setActivePath(p)}
                disabled={isBinary}
                className={`block w-full truncate rounded px-2 py-1 text-left transition ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : isBinary
                      ? 'text-zinc-600'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
                title={isBinary ? `${p} (binary — not editable here)` : p}
              >
                {p}
                {isBinary && <span className="ml-1 text-[10px] text-zinc-500">[bin]</span>}
              </button>
            );
          })}
        </nav>
        <div className="relative flex-1">
          {activeFile && activeFile.kind === 'text' ? (
            <Editor
              height="100%"
              width="100%"
              theme="vs-dark"
              language={languageFor(activePath ?? '')}
              value={draft}
              onChange={handleChange}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-xs text-zinc-500">
              {activeFile ? 'Binary assets are not editable in Pro code.' : 'Pick a file to edit.'}
            </div>
          )}
          {error && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-rose-900/80 p-2 text-xs text-rose-100">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
