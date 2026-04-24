import { artworks } from './data';
import { VideoPreviewCard } from './VideoPreviewCard';
import { Section, SectionContent } from '@/components/layout/Section';
import { useSectionVisibility } from '@/lib/useSectionVisibility';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { NameHighlight, MeaningHighlight } from '@/components/ui/TextHighlight';
import { EXTERNAL_LINKS } from '@/lib/externalLinks';

export const ArcaGidan: React.FC = () => {
  // Start the artwork hover-preview cycle as soon as the tile grid begins entering the viewport.
  const { ref: sectionRef, isVisible: isActive } = useSectionVisibility({ threshold: 0.3 });

  const tiles = artworks.map((artwork) => ({
    key: artwork.id,
    poster: artwork.poster,
    video: artwork.video,
    alt: artwork.name,
  }));

  return (
    <Section
      ref={sectionRef}
      id="arca-gidan"
      className="text-white"
      videoOverlay="rgba(32, 26, 12, 0.85)"
    >
      {/* Asymmetric layout: left padded text, right edge-to-edge artwork (extends under header) */}
      <SectionContent fullWidth verticalAlign="stretch" noHeaderOffset>
        <div className="h-full flex">
          {/* Text content on left - wider on mobile for readability, has its own header offset */}
          <div
            className="w-[50%] sm:w-[45%] md:w-[40%] xl:w-[35%] flex items-center px-4 md:px-12 lg:px-16 shrink-0"
            style={{ paddingTop: 'var(--header-height)' }}
          >
            <div className="max-w-lg">
              <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-4 md:mb-6">
                The <NameHighlight color="amber">Arca Gidan Prize</NameHighlight> is an open source <MeaningHighlight color="amber">AI art competition</MeaningHighlight>
              </h2>
              <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-4 md:mb-6">
                We wish to provide a reason for people to push themselves and open models to their limits.
              </p>
              <a
                href={EXTERNAL_LINKS.arcaGidanWinners}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-400 font-medium hover:text-amber-300 transition-colors text-base"
              >
                2025 Winners
                <ExternalLinkIcon />
              </a>
            </div>
          </div>

          {/* Artwork area - extends full height under header */}
          <div className="flex-1 h-full min-h-0 flex flex-col md:flex-row">
            {/* Top row on mobile (first 2 videos), left half on desktop */}
            <div className="h-1/2 md:h-full md:flex-1 min-h-0 flex">
              <div className="flex-1 min-w-0 relative overflow-hidden">
                <VideoPreviewCard
                  poster={tiles[0].poster}
                  video={tiles[0].video}
                  alt={tiles[0].alt}
                  isSectionVisible={isActive}
                />
              </div>
              <div className="flex-1 min-w-0 relative overflow-hidden">
                <VideoPreviewCard
                  poster={tiles[1].poster}
                  video={tiles[1].video}
                  alt={tiles[1].alt}
                  isSectionVisible={isActive}
                />
              </div>
            </div>
            {/* Bottom row on mobile (last 2 videos), right half on desktop */}
            <div className="h-1/2 md:h-full md:flex-1 min-h-0 flex">
              <div className="flex-1 min-w-0 relative overflow-hidden">
                <VideoPreviewCard
                  poster={tiles[2].poster}
                  video={tiles[2].video}
                  alt={tiles[2].alt}
                  isSectionVisible={isActive}
                />
              </div>
              <div className="flex-1 min-w-0 relative overflow-hidden">
                <VideoPreviewCard
                  poster={tiles[3].poster}
                  video={tiles[3].video}
                  alt={tiles[3].alt}
                  isSectionVisible={isActive}
                />
              </div>
            </div>
          </div>
        </div>
      </SectionContent>
    </Section>
  );
};
