import { useEffect, useState } from 'react';
import { BREAKPOINTS } from '@/lib/breakpoints';
import { CrossfadeScrollVideo } from './CrossfadeScrollVideo';
import { DesktopScrollVideo } from './DesktopScrollVideo';

export const ScrollVideoBackground = () => {
  // Use xl breakpoint (1280px) - iPads/tablets get CrossfadeScrollVideo which actually plays
  // videos (DesktopScrollVideo uses scroll-scrubbing which iOS Safari doesn't handle well)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.xl : true
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < BREAKPOINTS.xl);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <CrossfadeScrollVideo /> : <DesktopScrollVideo />;
};
