import { Header } from '@/components/layout/Header';
import { Section, SectionContent } from '@/components/layout/Section';

export const Hero = () => {
  return (
    <Section className="relative">
      <div className="absolute top-0 left-0 right-0 z-10">
        <Header />
      </div>
      <SectionContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
        {/* Text Content */}
        <div className="space-y-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-normal leading-[1.1] tracking-tight text-gray-900">
            We want to help the open source AI art ecosystem thrive
          </h1>
          
          <p className="text-base md:text-lg text-gray-600 max-w-xl leading-relaxed">
            We're building tools and nurturing a culture to inspire, empower and reward open collaboration and ambition in the AI art ecosystem.
          </p>
        </div>

        {/* Terrarium Image */}
        <div className="flex justify-center lg:justify-end">
          <img
            src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=500&fit=crop&crop=center"
            alt="Terrarium with lush green plants"
            className="w-full max-w-[200px] sm:max-w-sm md:max-w-lg h-auto rounded-sm shadow-lg"
          />
        </div>
        </div>
      </SectionContent>
    </Section>
  );
};
