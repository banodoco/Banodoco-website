import { useRef } from 'react';
import { Section } from '@/components/layout/Section';
import { ArrowDownIcon } from '@/components/ui/icons';

/**
 * Hero section - the landing/above-the-fold section.
 * 
 * Uses the scroll-driven video background (from ScrollVideoBackground)
 * with a semi-transparent dark overlay for text readability.
 */
export const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const scrollToNextSection = () => {
    const nextSection = sectionRef.current?.nextElementSibling;
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Section 
      ref={sectionRef} 
      id="hero" 
      className="relative text-white"
      videoOverlay="rgba(10, 10, 12, 0.7)"
    >
      {/* Hero uses custom layout - no header offset since content should be centered in full viewport */}
      <div className="h-full px-5 md:px-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col space-y-4 md:space-y-6 xl:space-y-8 relative z-10 max-w-[34rem] md:max-w-[36rem] xl:max-w-[44rem]">
            <h1 className="text-[2.5rem] md:text-5xl lg:text-6xl xl:text-6xl font-normal leading-[1.08] tracking-tight text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.4)]">
              We're working to help the open source AI art ecosystem thrive
            </h1>

            <p className="text-sm md:text-base lg:text-lg xl:text-xl text-white leading-relaxed xl:leading-[1.7] max-w-[20rem] md:max-w-none xl:max-w-[38rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
              We're building tools and nurturing a culture to inspire, empower and reward open collaboration and ambition in the AI art ecosystem.
            </p>

            {/* Learn more button */}
            <div className="flex gap-2">
              <button
                onClick={scrollToNextSection}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white/90 text-gray-900 rounded-lg transition-all font-medium"
              >
                <span className="text-sm">Learn more</span>
                <ArrowDownIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

