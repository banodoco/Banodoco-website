export type EditorMode = 'text' | 'interactive';

export function readStoredEditorMode(postId: string): EditorMode {
  if (typeof window === 'undefined') return 'text';
  const stored = window.localStorage.getItem(`vibe:authoring-mode:${postId}`);
  if (stored === 'interactive' || stored === 'bundle' || stored === 'vibe') return 'interactive';
  if (stored === 'text' || stored === 'rich' || stored === 'raw') return 'text';
  return 'text';
}
