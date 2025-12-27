import { artworks } from './data';
import { VideoPreviewCard } from './VideoPreviewCard';
import { Section } from '@/components/layout/Section';
import { useSectionVisibility } from '@/lib/useSectionVisibility';

export const ArcaGidan: React.FC = () => {
  const { ref: sectionRef, isVisible } = useSectionVisibility({ threshold: 0.3 });
  
  return (
    <Section ref={sectionRef} className="bg-gradient-to-br from-[#201a0c] via-[#251f10] to-[#1a1508] text-white flex">
      {/* Text content on left - wider on mobile for readability */}
      <div className="w-[50%] sm:w-[45%] md:w-[40%] xl:w-[35%] flex items-center px-4 md:px-12 lg:px-16 shrink-0">
        <div className="max-w-lg">
          <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
            The Arca Gidan Prize is an open source AI art competition
          </h2>
          <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-8">
            Over the years, we want to provide a reason for people to push themselves and open models to their limits.
          </p>
          <a
            href="https://arcagidan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-amber-400 font-medium hover:text-amber-300 transition-colors text-base"
          >
            Visit Website
            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Artwork area - flex column on mobile, row on desktop */}
      <div className="flex-1 h-full min-h-0 flex flex-col md:flex-row">
        {/* Top row on mobile (first 2 videos), left half on desktop */}
        <div className="h-1/2 md:h-full md:flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 relative overflow-hidden">
            <VideoPreviewCard
              poster={artworks[0].poster}
              video={artworks[0].video}
              alt={artworks[0].name}
              isSectionVisible={isVisible}
            />
          </div>
          <div className="flex-1 min-w-0 relative overflow-hidden">
            <VideoPreviewCard
              poster={artworks[1].poster}
              video={artworks[1].video}
              alt={artworks[1].name}
              isSectionVisible={isVisible}
            />
          </div>
        </div>
        {/* Bottom row on mobile (last 2 videos), right half on desktop */}
        <div className="h-1/2 md:h-full md:flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 relative overflow-hidden">
            <VideoPreviewCard
              poster={artworks[2].poster}
              video={artworks[2].video}
              alt={artworks[2].name}
              isSectionVisible={isVisible}
            />
          </div>
          <div className="flex-1 min-w-0 relative overflow-hidden">
            <VideoPreviewCard
              poster={artworks[3].poster}
              video={artworks[3].video}
              alt={artworks[3].name}
              isSectionVisible={isVisible}
            />
          </div>
        </div>
      </div>
    </Section>
  );
};

