import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { ALL_SECTION_IDS } from '@/lib/sections';
import { LayoutContext, type LayoutTheme } from './layout-context';

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
    let cleanup: (() => void) | null = null;
    const idsToCheck = [...ALL_SECTION_IDS, 'footer'];

    // Wait a tick for sections to be in DOM
    const timeoutId = setTimeout(() => {
      const computeActiveSection = () => {
        // Use the viewport's visible center to select the active section.
        // This is more reliable than IntersectionObserver around snap boundaries
        // (where two sections can be intersecting briefly).
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
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

      // Document-level scroll fires on `window` — listen there now that the
      // home page scrolls the body instead of an internal div.
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', computeActiveSection);

      cleanup = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', computeActiveSection);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };
    }, 50); // Slightly longer delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      cleanup?.();
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
