import { artworks } from './data';
import { VideoPreviewCard } from './VideoPreviewCard';

export const ArcaGidan: React.FC = () => {
  return (
    <section className="h-screen snap-start bg-[#18140a] text-white overflow-hidden flex flex-row">
      {/* Text content on left */}
      <div className="w-[45%] md:w-[40%] xl:w-[35%] flex items-center px-4 md:px-12 lg:px-16 py-8 lg:py-12 shrink-0">
        <div className="max-w-lg">
          <h2 className="text-lg md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-3 lg:mb-6">
            The Arca Gidan Prize is an open source AI art competition
          </h2>
          <p className="text-xs md:text-base lg:text-lg text-white/60 leading-relaxed mb-4 lg:mb-8">
            Over the years, we want to provide a reason for people to push themselves and open models to their limits.
          </p>
          <a
            href="https://arcagidan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 md:gap-2 text-amber-400 font-medium hover:text-amber-300 transition-colors text-xs md:text-base"
          >
            Visit Website
            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Artwork grid on right (2x2 grid, full height) */}
      <div className="grid grid-cols-2 grid-rows-2 flex-1 h-full">
        {artworks.map((artwork) => (
          <VideoPreviewCard
            key={artwork.id}
            poster={artwork.poster}
            video={artwork.video}
            alt={artwork.name}
          />
        ))}
      </div>
    </section>
  );
};

