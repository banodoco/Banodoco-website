import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { ALL_SECTION_IDS } from '@/lib/sections';

type LayoutTheme = 'dark' | 'light';

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

    let rafId: number | null = null;
    const idsToCheck = [...ALL_SECTION_IDS, 'footer'];

    // Wait a tick for scroll container and sections to be in DOM
    const timeoutId = setTimeout(() => {
      const scrollContainer = document.getElementById('home-scroll-container');
      if (!scrollContainer) return;

      const computeActiveSection = () => {
        // Use the scroll container's visible center to select the active section.
        // This is more reliable than IntersectionObserver around snap boundaries
        // (where two sections can be intersecting briefly).
        const scrollTop = scrollContainer.scrollTop;
        const viewportHeight = scrollContainer.clientHeight;
        const scrollCenter = scrollTop + viewportHeight / 2;

        let active: string | null = null;
        for (const id of idsToCheck) {
          const el = document.getElementById(id);
          if (!el) continue;
          const top = el.offsetTop;
          const bottom = top + el.offsetHeight;
          if (scrollCenter >= top && scrollCenter < bottom) {
            active = id;
            break;
          }
        }
        setCurrentSection(active);
      };

      const onScroll = () => {
        if (rafId !== null) return;
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          computeActiveSection();
        });
      };

      // Initial compute (covers initial load + deep links).
      computeActiveSection();

      scrollContainer.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', computeActiveSection);

      // Cleanup
      return () => {
        scrollContainer.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', computeActiveSection);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };
    }, 50); // Slightly longer delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
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



