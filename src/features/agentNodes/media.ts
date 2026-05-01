import type { AgentNodeCatalogItem, AgentNodeMediaItem } from './types';

const getSupabaseUrl = () => import.meta.env.VITE_SUPABASE_URL as string | undefined;

const encodeStoragePath = (path: string): string =>
  path.split('/').map((segment) => encodeURIComponent(segment)).join('/');

export function agentNodeMediaUrl(media: AgentNodeMediaItem | null | undefined): string | null {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl || !media?.bucket || !media.path) return null;

  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(media.bucket)}/${encodeStoragePath(media.path)}`;
}

export function agentNodeSummary(node: AgentNodeCatalogItem): string {
  return node.catalog.summary || node.short_description || node.description || 'No description provided yet.';
}

export function agentNodePreviewImage(node: AgentNodeCatalogItem): string | null {
  const image = node.media.find((item) => item.type === 'image') ?? node.media[0] ?? null;
  return agentNodeMediaUrl(image);
}
