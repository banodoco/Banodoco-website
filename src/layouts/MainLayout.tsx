import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollVideoBackground } from '@/components/layout/ScrollVideoBackground';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { isIOS } from '@/lib/device';
import { isProfilePathname, normalizeLegacyHashUsernamePath } from '@/lib/routing';

interface MainLayoutProps {
  children: ReactNode;
}

// Use stable viewport height for the snap container to avoid mobile dvh relayout flicker.
// Background is transparent to allow the scroll-driven video to show through section masks.
// relative is needed for absolute positioned header on mobile
const HOME_SCROLL_CLASSES = 'relative h-screen h-[100svh] overflow-y-auto snap-y snap-mandatory overscroll-none bg-transparent text-foreground';

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const isHome = pathname === '/';
  const isSecondRenaissance = pathname === '/2nd-renaissance';
  const isWrapped = pathname === '/1m';
  const isResources = pathname.startsWith('/resources');
  const isDarkPath =
    isProfilePathname(pathname)
    || pathname.startsWith('/submit/')
    || pathname.startsWith('/auth/')
    || pathname.startsWith('/art/');
  const [isIOSDevice] = useState(() => isIOS());

  const theme = (isHome || isSecondRenaissance || isWrapped || isResources || isDarkPath) ? 'dark' : 'light';

  // Centralized route-change scroll behavior:
  // - All non-home routes start at top
  // - Home starts at top unless explicit section-target state/hash is provided
  useEffect(() => {
    const normalizedPath = normalizeLegacyHashUsernamePath(pathname, location.hash);
    if (normalizedPath) {
      navigate(`${normalizedPath}${location.search}`, { replace: true });
      return;
    }

    const state = (location.state ?? {}) as { scrollTo?: string; scrollToTop?: boolean };

    if (pathname === '/') {
      if (state.scrollTo || state.scrollToTop || location.hash) return;
      requestAnimationFrame(() => {
        const homeContainer = document.getElementById('home-scroll-container');
        homeContainer?.scrollTo({ top: 0, behavior: 'auto' });
      });
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [pathname, location.hash, location.key, location.search, location.state, navigate]);

  if (isHome) {
    return (
      <LayoutProvider theme={theme} isHomePage={isHome}>
        {/* Fixed scroll-driven video background - visible through section masks */}
        <ScrollVideoBackground />
        <div 
          id="home-scroll-container"
          className={HOME_SCROLL_CLASSES}
          style={{
            // iOS momentum scrolling + scroll-snap can produce intermittent white "checkerboarding".
            // Prefer default scrolling here for stability.
            ...(isIOSDevice ? { WebkitOverflowScrolling: 'auto' as const } : {}),
          }}
        >
          {/* Fixed header on desktop overlays the content */}
          <Header />
          {children}
          <Footer />
        </div>
      </LayoutProvider>
    );
  }

  // Special fullscreen layout for 2nd Renaissance page - no header/footer
  // Uses mandatory snap for firm section snapping
  if (isSecondRenaissance) {
    return (
      <LayoutProvider theme={theme} isHomePage={false}>
        <div className="h-screen overflow-y-auto snap-y snap-mandatory bg-[var(--color-bg-base)] text-white">
          {children}
        </div>
      </LayoutProvider>
    );
  }

  // Wrapped page has its own fullscreen layout
  if (isWrapped) {
    return (
      <LayoutProvider theme={theme} isHomePage={false}>
        {children}
      </LayoutProvider>
    );
  }

  return (
    <LayoutProvider theme={theme} isHomePage={isHome}>
      <div className={`min-h-screen flex flex-col ${(isResources || isDarkPath) ? 'bg-[var(--color-bg-base)] text-white' : 'bg-[#f5f5f3] text-foreground'}`}>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </LayoutProvider>
  );
};
