import { useEffect, useState } from 'react';
import { fetchAgentNodeCatalog, logAgentNodesDebug } from './api';
import type { AgentNodeCatalogResponse } from './types';

interface UseAgentNodeCatalogResult {
  data: AgentNodeCatalogResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAgentNodeCatalog(): UseAgentNodeCatalogResult {
  const [data, setData] = useState<AgentNodeCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchAgentNodeCatalog(controller.signal)
      .then((catalog) => {
        setData(catalog);
        logAgentNodesDebug('catalog hook loaded', { nodeCount: catalog.nodes.length });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const message = caught instanceof Error ? caught.message : 'Failed to load agent nodes.';
        setError(message);
        logAgentNodesDebug('catalog hook error', { message });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshNonce]);

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshNonce((value) => value + 1),
  };
}
