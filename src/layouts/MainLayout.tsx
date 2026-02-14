import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollVideoBackground } from '@/components/layout/ScrollVideoBackground';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { isIOS } from '@/lib/device';

interface MainLayoutProps {
  children: ReactNode;
}

// Use stable viewport height for the snap container to avoid mobile dvh relayout flicker.
// Background is transparent to allow the scroll-driven video to show through section masks.
// relative is needed for absolute positioned header on mobile
const HOME_SCROLL_CLASSES = 'relative h-screen h-[100svh] overflow-y-auto snap-y snap-mandatory overscroll-none bg-transparent text-foreground';

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isSecondRenaissance = pathname === '/2nd-renaissance';
  const isWrapped = pathname === '/1m';
  const isResources = pathname.startsWith('/resources');
  const [isIOSDevice] = useState(() => isIOS());

  const theme = (isHome || isSecondRenaissance || isWrapped || isResources) ? 'dark' : 'light';

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
      <div className={`min-h-screen flex flex-col ${isResources ? 'bg-[var(--color-bg-base)] text-white' : 'bg-[#f5f5f3] text-foreground'}`}>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </LayoutProvider>
  );
};
