import { Link } from 'react-router-dom';
import { useProfilePics } from './useProfilePics';
import { ProfileImage } from './ProfileImage';
import { Section, SectionContent } from '@/components/layout/Section';
import { ArrowRightIcon } from '@/components/ui/icons';

export const Ownership = () => {
  const { visiblePics, allPics, spriteConfig, usedPicsRef, handleSwap } = useProfilePics();

  return (
    <Section 
      id="ownership" 
      className="text-white"
      videoOverlay="rgba(26, 22, 20, 0.65)"
    >
      <SectionContent fullWidth className="flex-col justify-center gap-6 md:gap-8">
        {/* Profile grid - edge-to-edge */}
        <div className="profile-grid w-full">
          {visiblePics.map((pic, idx) => (
            <ProfileImage
              key={`${pic.id}-${idx}`}
              initialPic={pic}
              allPics={allPics}
              spriteConfig={spriteConfig}
              usedPicsRef={usedPicsRef}
              onSwap={handleSwap}
            />
          ))}
        </div>
        
        {/* Text content below */}
        <div className="px-6 md:px-16">
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-4 md:gap-6 lg:gap-16">
            {/* Header */}
            <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] text-left">
              We're sharing <span className="text-white font-semibold">100%</span>
              <br className="hidden md:block" />
              {' '}of our company's ownership
              <br className="hidden md:block" />
              {' '}with people who help the
              <br className="hidden md:block" />
              {' '}ecosystem succeed
            </h2>
            
            {/* Subtext on the right */}
            <div className="lg:max-w-xs text-left shrink-0 flex flex-col lg:justify-between">
              <p className="text-sm md:text-lg text-white/90 leading-relaxed">
                Aside from investor dilution, open source contributors will own all of our company. We believe that a company that's built with the community should belong to the community.
              </p>
              
              <Link 
                to="/ownership" 
                className="inline-flex items-center justify-start gap-2 mt-4 text-white/90 hover:text-white transition-colors group text-sm md:text-base"
              >
                <span className="border-b border-white/50 group-hover:border-white/80 transition-colors pb-0.5">
                  Learn how it works
                </span>
                <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </SectionContent>
    </Section>
  );
};
