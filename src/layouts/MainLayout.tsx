import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollVideoBackground } from '@/components/layout/ScrollVideoBackground';
import { FullscreenProvider } from '@/contexts/FullscreenContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { useFullscreenContext } from '@/contexts/fullscreen-context';
import { isIOS } from '@/lib/device';
import { HOME_SCROLL_CONTAINER_ID, getHomeScrollContainer } from '@/lib/homeScrollContainer';
import { isProfilePathname, normalizeLegacyHashUsernamePath } from '@/lib/routing';

interface MainLayoutProps {
  children: ReactNode;
}

// Use stable viewport height for the snap container to avoid mobile dvh relayout flicker.
// Background is transparent to allow the scroll-driven video to show through section masks.
// relative is needed for absolute positioned header on mobile
const HOME_SCROLL_CLASSES = 'relative h-screen h-[100svh] overflow-y-auto snap-y snap-mandatory overscroll-none bg-transparent text-foreground';

const MainLayoutContent = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFullscreen } = useFullscreenContext();
  const { pathname } = location;
  const isHome = pathname === '/';
  const isSecondRenaissance = pathname === '/2nd-renaissance';
  const isWrapped = pathname === '/1m';
  const isResources = pathname === '/2RP' || pathname.startsWith('/resources/');
  const isDarkPath =
    isProfilePathname(pathname)
    || pathname.startsWith('/submit/')
    || pathname.startsWith('/auth/')
    || pathname.startsWith('/art/')
    || pathname.startsWith('/posts/')
    || pathname.startsWith('/admin/');
  const [isIOSDevice] = useState(() => isIOS());
  // Tracks the pathname/hash from the previous run of the scroll effect so we
  // can distinguish actual route changes from same-route updates (e.g. a page
  // updating `location.search` via `setSearchParams` for its own filter state).
  const lastScrollRouteRef = useRef<string | null>(null);

  const theme = (isHome || isSecondRenaissance || isWrapped || isResources || isDarkPath) ? 'dark' : 'light';

  // Centralized route-change scroll behavior:
  // - All non-home routes start at top
  // - Home starts at top unless explicit section-target state/hash is provided
  // Skipped when only the query string/state changes on the same route, so
  // in-page filters/toolbars that sync to the URL don't jump the viewport.
  useEffect(() => {
    const normalizedPath = normalizeLegacyHashUsernamePath(pathname, location.hash);
    if (normalizedPath) {
      navigate(`${normalizedPath}${location.search}`, { replace: true });
      return;
    }

    const state = (location.state ?? {}) as { scrollTo?: string; scrollToTop?: boolean };

    const routeKey = `${pathname}${location.hash}`;
    const routeChanged = lastScrollRouteRef.current !== routeKey;
    lastScrollRouteRef.current = routeKey;
    // Explicit intent beats the pathname check — honor requests to scroll even
    // on same-route navigations (e.g. clicking the logo on Home with state).
    const explicitScrollRequest = Boolean(state.scrollTo || state.scrollToTop);
    if (!routeChanged && !explicitScrollRequest) return;

    if (pathname === '/') {
      if (state.scrollTo || state.scrollToTop || location.hash) return;
      requestAnimationFrame(() => {
        const homeContainer = getHomeScrollContainer();
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
          id={HOME_SCROLL_CONTAINER_ID}
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

  if (isFullscreen) {
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

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <FullscreenProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </FullscreenProvider>
  );
};
