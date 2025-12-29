import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);

  const homeScrollClasses = useMemo(() => {
    // Use stable viewport height for the snap container to avoid mobile dvh relayout flicker.
    return 'h-screen h-[100svh] overflow-y-auto snap-y snap-mandatory bg-[#f5f5f3] text-foreground';
  }, []);

  if (isHome) {
    return (
      <div 
        className={homeScrollClasses}
        style={{
          ...(isIOSDevice ? { WebkitOverflowScrolling: 'touch' as const } : {}),
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
