import { useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { isIOS } from '@/lib/device';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [isIOSDevice] = useState(() => isIOS());

  const homeScrollClasses = useMemo(() => {
    // Use stable viewport height for the snap container to avoid mobile dvh relayout flicker.
    // Also keep a dark base bg so any transient "unpainted" areas during scroll-snap
    // (common on iOS/Safari compositing) don't flash white.
    // relative is needed for absolute positioned header on mobile
    return 'relative h-screen h-[100svh] overflow-y-auto snap-y snap-mandatory overscroll-none bg-[#0b0b0f] text-foreground';
  }, []);

  if (isHome) {
    return (
      <div 
        id="home-scroll-container"
        className={homeScrollClasses}
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
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f3] text-foreground">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};
