import { Hero } from '@/components/sections/Hero';
import { Community } from '@/components/sections/Community';
import { Reigh } from '@/components/sections/Reigh';
import { ArcaGidan } from '@/components/sections/ArcaGidan';
import { ADOS } from '@/components/sections/ADOS';
import { Ecosystem } from '@/components/sections/Ecosystem';
import { Ownership } from '@/components/sections/Ownership';
import { MilestonePopup } from '@/components/ui/MilestonePopup';
import { usePreloadAssets } from '@/lib/preloadAssets';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Home = () => {
  const location = useLocation();
  // Preload images and video metadata for upcoming sections
  usePreloadAssets();

  useEffect(() => {
    // Support "navigate home and scroll to section" from other pages.
    const state = (location.state ?? {}) as { scrollTo?: string; scrollToTop?: boolean };
    const scrollTargetFromState = state.scrollTo;
    const scrollTargetFromHash = location.hash?.replace('#', '') || undefined;
    const targetId = scrollTargetFromState || scrollTargetFromHash;
    
    // Scroll to top if explicitly requested
    if (state.scrollToTop) {
      requestAnimationFrame(() => {
        const homeContainer = document.getElementById('home-scroll-container');
        if (homeContainer) {
          homeContainer.scrollTo({ top: 0, behavior: 'instant' });
        }
      });
      return;
    }
    
    if (!targetId) return;

    // Defer to ensure sections are mounted before scrolling (important for snap container).
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [location.key, location.hash, location.state]);
  
  return (
    <>
      <Hero />
      <Community />
      <Reigh />
      <ArcaGidan />
      <ADOS />
      <Ecosystem />
      <Ownership />
      <MilestonePopup />
    </>
  );
};

export default Home;
