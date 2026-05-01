import type { AgentNodeCatalogResponse } from './types';

const DEBUG_ENABLED =
  import.meta.env.DEV ||
  import.meta.env.VITE_DEBUG_AGENT_NODES === 'true' ||
  import.meta.env.VITE_DEBUG_LOGS === 'true';

export function logAgentNodesDebug(event: string, data?: Record<string, unknown>): void {
  if (!DEBUG_ENABLED) return;
  if (data) {
    console.info(`[AgentNodes] ${event}`, data);
    return;
  }
  console.info(`[AgentNodes] ${event}`);
}

export async function fetchAgentNodeCatalog(signal?: AbortSignal): Promise<AgentNodeCatalogResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase is not configured for the agent node catalog.');
  }

  const url = `${supabaseUrl}/functions/v1/agent-node-catalog`;
  logAgentNodesDebug('catalog fetch start', { url });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    logAgentNodesDebug('catalog fetch failed', { status: response.status, message });
    throw new Error(message || `Failed to fetch agent node catalog: ${response.status}`);
  }

  const catalog = await response.json() as AgentNodeCatalogResponse;
  logAgentNodesDebug('catalog fetch success', {
    nodeCount: catalog.nodes.length,
    defaultCount: catalog.default_node_ids.length,
    mandatoryCount: catalog.mandatory_node_ids.length,
  });

  return catalog;
}
