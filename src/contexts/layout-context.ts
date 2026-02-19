import { createContext, useContext } from 'react';

export type LayoutTheme = 'dark' | 'light';

interface LayoutContextValue {
  theme: LayoutTheme;
  isHomePage: boolean;
  currentSection: string | null;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
