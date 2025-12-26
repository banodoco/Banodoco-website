import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  if (isHome) {
    // Home uses scroll-snap sections; Header is rendered inside Hero section
    // so it's part of the first snap point (not orphaned above it).
    return (
      <div className="h-screen overflow-y-auto snap-y snap-mandatory bg-[#f5f5f3] text-foreground">
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

