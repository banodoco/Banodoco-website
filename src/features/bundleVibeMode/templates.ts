import type { VirtualFile, VirtualFileTree } from '@/types/vibe';

export interface TemplateMeta {
  id: string;
  label: string;
  description: string;
  continuationPrompt: string;
}

export interface TemplateEntry {
  readonly meta: TemplateMeta;
  readonly tree: VirtualFileTree;
}

// Static globs — Vite resolves these at build time. `query: '?raw'` +
// `import: 'default'` + `eager: true` returns file contents as strings.
const META_GLOB = import.meta.glob('./templates/*/_meta.json', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const FILES_GLOB = import.meta.glob('./templates/*/files/**/*', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const inferMime = (path: string): string => {
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain; charset=utf-8';
};

export const listTemplateEntries = (): TemplateEntry[] => {
  const byId = new Map<string, { meta: TemplateMeta; tree: VirtualFileTree }>();

  for (const [path, raw] of Object.entries(META_GLOB)) {
    const match = path.match(/\.\/templates\/([^/]+)\/_meta\.json$/);
    if (!match) continue;
    const id = match[1];
    try {
      const meta = JSON.parse(raw) as TemplateMeta;
      byId.set(id, { meta, tree: {} });
    } catch {
      // skip malformed template meta
    }
  }

  for (const [path, raw] of Object.entries(FILES_GLOB)) {
    const match = path.match(/\.\/templates\/([^/]+)\/files\/(.+)$/);
    if (!match) continue;
    const [, id, relPath] = match;
    const entry = byId.get(id);
    if (!entry) continue;
    const file: VirtualFile = {
      path: relPath,
      kind: 'text',
      mime: inferMime(relPath),
      content: raw,
    };
    entry.tree[relPath] = file;
  }

  const preferredOrder = ['minimal', 'scrolly-story', 'interactive-toy', 'article-with-embeds', 'data-viz'];
  return preferredOrder
    .map((id) => byId.get(id))
    .filter((entry): entry is TemplateEntry => Boolean(entry));
};

export const loadTemplateById = (id: string): TemplateEntry | null => {
  const entries = listTemplateEntries();
  return entries.find((entry) => entry.meta.id === id) ?? null;
};
