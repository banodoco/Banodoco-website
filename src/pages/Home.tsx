import { Hero } from '@/components/sections/Hero';
import { Community } from '@/components/sections/Community';
import { Reigh } from '@/components/sections/Reigh';
import { ArcaGidan } from '@/components/sections/ArcaGidan';
import { Events } from '@/components/sections/Events';
import { Ecosystem } from '@/components/sections/Ecosystem';
import { Ownership } from '@/components/sections/Ownership';

const Home = () => {
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
