
import { useState, useEffect, useCallback } from 'react';
import type { AppData } from './types';
import { demoData } from './constants';

export type FetchPhase = 'idle' | 'loading' | 'done' | 'error';

export interface FetchProgress {
  phase: FetchPhase;
  phaseLabel: string;
  phasePct: number;
  overallPct: number;
  error?: string;
}

export interface UseDiscordDataResult {
  data: AppData;
  progress: FetchProgress;
  isLoading: boolean;
  isPhase1Done: boolean;
  refresh: () => void;
}

export function useDiscordData(): UseDiscordDataResult {
  const [data, setData] = useState<AppData>(demoData);
  const [progress, setProgress] = useState<FetchProgress>({
    phase: 'idle',
    phaseLabel: 'Loading...',
    phasePct: 0,
    overallPct: 0,
  });

  const fetchData = useCallback(async () => {
    setProgress({ phase: 'loading', phaseLabel: 'Loading data...', phasePct: 30, overallPct: 30 });

    try {
      const response = await fetch('/wrapped/data.json');
      if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);
      const appData: AppData = await response.json();

      // Filter out topGenerations items without valid Supabase media URLs
      if (appData.topGenerations) {
        appData.topGenerations = appData.topGenerations.filter(
          (gen) => gen.mediaUrl?.includes('supabase.co/storage')
        );
      }

      setData(appData);
      setProgress({ phase: 'done', phaseLabel: 'Ready', phasePct: 100, overallPct: 100 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to load data.json:', err);
      // Fall back to demo data
      setProgress({
        phase: 'error',
        phaseLabel: `Error: ${message}`,
        phasePct: 0,
        overallPct: 0,
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isLoading = progress.phase === 'idle' || progress.phase === 'loading';

  return {
    data,
    progress,
    isLoading,
    isPhase1Done: !isLoading,
    refresh: fetchData,
  };
}
