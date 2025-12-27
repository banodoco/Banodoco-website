import { Hero } from '@/components/sections/Hero';
import { Community } from '@/components/sections/Community';
import { Reigh } from '@/components/sections/Reigh';
import { ArcaGidan } from '@/components/sections/ArcaGidan';
import { Events } from '@/components/sections/Events';
import { Ecosystem } from '@/components/sections/Ecosystem';
import { Ownership } from '@/components/sections/Ownership';
import { usePreloadAssets } from '@/lib/preloadAssets';

const Home = () => {
  // Preload images and video metadata for upcoming sections
  usePreloadAssets();
  
  return (
    <>
      <Hero />
      <Community />
      <Reigh />
      <ArcaGidan />
      <Events />
      <Ecosystem />
      <Ownership />
    </>
  );
};

export default Home;
