import { useMemo, useState, type ReactNode } from 'react';
import { FullscreenContext, type FullscreenState } from './fullscreen-context';

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setFullscreen] = useState<FullscreenState | null>(null);
  const value = useMemo(() => ({ isFullscreen, setFullscreen }), [isFullscreen]);

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
}
