import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // iOS Safari + scroll-snap + momentum scrolling can intermittently blank/flash content.
    // We apply slightly gentler settings on iOS to reduce compositor edge cases.
    const ua = navigator.userAgent || '';
    const isiOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isiPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    setIsIOS(isiOSDevice || isiPadOS);
  }, []);

  const homeScrollClasses = useMemo(() => {
    // Keep snap behavior consistent across devices; "proximity" can feel like it stalls on mobile.
    return 'h-[100dvh] overflow-y-auto snap-y snap-mandatory bg-[#f5f5f3] text-foreground';
  }, []);

  if (isHome) {
    // Home uses scroll-snap sections; Header is rendered inside Hero section
    // so it's part of the first snap point (not orphaned above it).
    return (
      <div 
        className={homeScrollClasses}
        style={{
          // Keep the scroll container "plain" (no transforms) so we don't force a giant
          // composited layer (which can blank/flicker under memory pressure) and so
          // `position: fixed` descendants behave relative to the real viewport.
          // On iOS, momentum scrolling improves scroll-snap feel; non-iOS ignores this.
          ...(isIOS ? { WebkitOverflowScrolling: 'touch' as const } : {}),
        }}
      >
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

