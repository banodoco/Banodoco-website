import { useProfilePics } from '../Ownership/useProfilePics';
import { ProfileImage } from '../Ownership/ProfileImage';

export const OwnershipStatement = () => {
  const { visiblePics, allPics, usedPicsRef, handleSwap } = useProfilePics();

  return (
    <section className="h-screen snap-start bg-gradient-to-br from-[#1a1614] via-[#1f1a18] to-[#141210] text-white flex flex-col overflow-hidden">
      {/* Profile grid at top */}
      <div className="w-full pt-8">
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
      
      {/* Text content below */}
      <div className="flex-1 flex items-center justify-center px-8 md:px-16">
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-8 lg:gap-16">
          {/* Header on the left */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.15] text-center lg:text-left">
            We're sharing <span className="text-white font-normal">100%</span>
            <br className="hidden md:block" />
            {' '}of our company's ownership
            <br className="hidden md:block" />
            {' '}with people who help the
            <br className="hidden md:block" />
            {' '}open source ecosystem succeed
          </h2>
          
          {/* Subtext on the right */}
          <div className="lg:max-w-xs text-center lg:text-left shrink-0 flex flex-col lg:justify-between">
            <p className="text-lg md:text-xl text-white/60 leading-relaxed">
              Aside from investor dilution, open source contributors will own all of our company. We believe that a company that's built with the community should belong to the community.
            </p>
            
            <a 
              href="#" 
              className="inline-flex items-center gap-2 mt-6 text-white/70 hover:text-white transition-colors group text-lg"
            >
              <span className="border-b border-white/30 group-hover:border-white/60 transition-colors pb-0.5">
                Learn how it works
              </span>
              <svg 
                className="w-5 h-5 transition-transform group-hover:translate-x-1" 
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

      {/* CSS for responsive grid */}
      <style>{`
        .profile-grid {
          display: grid;
          gap: 2px;
          grid-template-columns: repeat(10, 1fr);
        }
        
        @media (min-width: 480px) {
          .profile-grid {
            grid-template-columns: repeat(12, 1fr);
          }
        }
        
        @media (min-width: 768px) {
          .profile-grid {
            grid-template-columns: repeat(18, 1fr);
          }
        }
        
        @media (min-width: 1200px) {
          .profile-grid {
            grid-template-columns: repeat(22, 1fr);
          }
        }
      `}</style>
    </section>
  );
};
