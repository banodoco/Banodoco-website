import { useProfilePics } from './useProfilePics';
import { ProfileImage } from './ProfileImage';

export const Ownership = () => {
  const { visiblePics, allPics, usedPicsRef, handleSwap } = useProfilePics();

  return (
    <section id="ownership" className="snap-start bg-[#0a0a0a] text-white overflow-hidden">
      {/* Full-width image grid - CSS handles responsive columns */}
      <div className="w-full">
        <div className="profile-grid">
          {visiblePics.map((pic, idx) => (
            <ProfileImage
              key={`${pic}-${idx}`}
              initialPic={pic}
              allPics={allPics}
              usedPicsRef={usedPicsRef}
              onSwap={handleSwap}
            />
          ))}
        </div>
      </div>

      {/* Text content - two column layout */}
      <div className="px-6 md:px-12 lg:px-16 py-10 md:py-14 lg:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 lg:gap-16 items-start">
            {/* Left: Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-light tracking-tight leading-tight">
              We're sharing 100% of our company's ownership with people who help the open source ecosystem succeed
            </h2>
            
            {/* Right: Description + Link */}
            <div className="flex flex-col gap-5">
              <p className="text-base md:text-lg text-white/60 leading-relaxed">
                Aside from investor dilution, open source contributors will own all of our company. We believe that a company that's built with the community should belong to the community.
              </p>
              <a 
                href="#" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors group text-base"
              >
                <span className="border-b border-white/30 group-hover:border-white/60 transition-colors pb-0.5">
                  Learn how it works
                </span>
                <svg 
                  className="w-4 h-4 transition-transform group-hover:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for responsive grid - no JS needed! */}
      <style>{`
        .profile-grid {
          display: grid;
          gap: 2px;
          /* Mobile: ~10 columns */
          grid-template-columns: repeat(10, 1fr);
        }
        
        @media (min-width: 480px) {
          .profile-grid {
            /* Small tablet: ~12 columns */
            grid-template-columns: repeat(12, 1fr);
          }
        }
        
        @media (min-width: 768px) {
          .profile-grid {
            /* Tablet: ~18 columns */
            grid-template-columns: repeat(18, 1fr);
          }
        }
        
        @media (min-width: 1200px) {
          .profile-grid {
            /* Large desktop: ~34 columns */
            grid-template-columns: repeat(34, 1fr);
          }
        }
      `}</style>
    </section>
  );
};

