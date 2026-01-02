import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { ALL_SECTION_IDS, SECTION_IDS } from '@/lib/sections';

export type LayoutTheme = 'dark' | 'light';

interface LayoutContextValue {
  theme: LayoutTheme;
  isHomePage: boolean;
  /** Currently visible section ID (null if none or not on homepage) */
  currentSection: string | null;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface LayoutProviderProps {
  children: ReactNode;
  theme: LayoutTheme;
  isHomePage: boolean;
}

/**
 * Hook to observe which section is currently in view.
 * Returns the section ID that's most "in focus" (center of viewport).
 */
function useSectionObserver(isHomePage: boolean): string | null {
  const [currentSection, setCurrentSection] = useState<string | null>(null);

  useEffect(() => {
    if (!isHomePage) {
      setCurrentSection(null);
      return;
    }

    // Store observer ref for cleanup
    let observer: IntersectionObserver | null = null;
    const intersectingSections = new Set<string>();

    // Wait a tick for scroll container and sections to be in DOM
    const timeoutId = setTimeout(() => {
      const scrollContainer = document.getElementById('home-scroll-container');
      if (!scrollContainer) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              intersectingSections.add(entry.target.id);
            } else {
              intersectingSections.delete(entry.target.id);
            }
          });

          // Find the first section in document order that's intersecting
          // Include footer in the search (comes after all sections)
          const allIdsWithFooter = [...ALL_SECTION_IDS, 'footer'];
          const active = allIdsWithFooter.find((id) => intersectingSections.has(id));
          setCurrentSection(active ?? null);
        },
        {
          root: scrollContainer,
          // Trigger when section enters center 10% of viewport
          rootMargin: '-45% 0px -45% 0px',
          threshold: 0,
        }
      );

      // Observe all sections plus footer
      const allIdsToObserve = [...ALL_SECTION_IDS, 'footer'];
      allIdsToObserve.forEach((id) => {
        const element = document.getElementById(id);
        if (element) observer?.observe(element);
      });
    }, 50); // Slightly longer delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [isHomePage]);

  return currentSection;
}

export function LayoutProvider({ children, theme, isHomePage }: LayoutProviderProps) {
  const currentSection = useSectionObserver(isHomePage);

  const value = useMemo(() => ({
    theme,
    isHomePage,
    currentSection,
  }), [theme, isHomePage, currentSection]);

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}

/**
 * Helper to check if current section should show the "ownership zone" header bg.
 * Use in components that need to react to being in Ownership or Footer.
 */
export function useIsInOwnershipZone(): boolean {
  const { currentSection } = useLayoutContext();
  return currentSection === SECTION_IDS.ownership || currentSection === 'footer';
}

