import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

export interface FullscreenState {
  backHref?: string;
  creatorName?: string;
}

interface FullscreenContextValue {
  isFullscreen: FullscreenState | null;
  setFullscreen: Dispatch<SetStateAction<FullscreenState | null>>;
}

export const FullscreenContext = createContext<FullscreenContextValue | null>(null);

export function useFullscreenContext(): FullscreenContextValue {
  const context = useContext(FullscreenContext);
  if (!context) {
    throw new Error('useFullscreenContext must be used within a FullscreenProvider');
  }
  return context;
}
