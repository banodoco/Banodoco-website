import { useProfilePics } from './useProfilePics';
import { ProfileImage } from './ProfileImage';

export const Ownership = () => {
  const { visiblePics, allPics, usedPicsRef, handleSwap } = useProfilePics();

  return (
    <section id="ownership" className="h-screen snap-start bg-[#0a0a0a] text-white overflow-hidden flex flex-col justify-center">
      {/* Full-width image grid */}
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
            grid-template-columns: repeat(34, 1fr);
          }
        }
      `}</style>
    </section>
  );
};
