import { motion, useReducedMotion } from 'framer-motion';
import { artworks } from './data';
import { VideoPreviewCard } from './VideoPreviewCard';
import { Section, SectionContent } from '@/components/layout/Section';
import { useSectionVisibility } from '@/lib/useSectionVisibility';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { NameHighlight, MeaningHighlight } from '@/components/ui/TextHighlight';
import { EXTERNAL_LINKS } from '@/lib/externalLinks';

const SLIDE_SHIFT = 32; // px
const SLIDE_EASE = [0.25, 0.46, 0.45, 0.94] as const;

const sideVariants = (fromLeft: boolean, reduced: boolean) => ({
  hidden: { opacity: 0, x: reduced ? 0 : fromLeft ? -SLIDE_SHIFT : SLIDE_SHIFT },
  visible: { opacity: 1, x: 0 },
});

export const ArcaGidan: React.FC = () => {
  // Start the artwork hover-preview cycle as soon as the tile grid begins entering the viewport.
  const { ref: sectionRef, isVisible: isActive, hasBeenVisible } = useSectionVisibility({ threshold: 0.3 });

  const prefersReducedMotion = useReducedMotion() ?? false;
  const mediaTransition = prefersReducedMotion
    ? { duration: 0.4, ease: 'easeOut' as const }
    : { duration: 0.6, ease: SLIDE_EASE };
  const textTransition = prefersReducedMotion
    ? { duration: 0.4, ease: 'easeOut' as const }
    : { duration: 0.6, ease: SLIDE_EASE, delay: 0.08 };

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
      {/* Symmetric layout: 2 videos on left, centered text in middle, 2 videos on right */}
      <SectionContent fullWidth verticalAlign="stretch" noHeaderOffset>
        <div className="h-full flex flex-col md:flex-row">
          {/* Top row on mobile / left column on desktop - 2 videos */}
          <motion.div
            className="h-1/4 md:h-full md:w-[30%] xl:w-[32.5%] min-h-0 flex shrink-0"
            variants={sideVariants(true, prefersReducedMotion)}
            initial="hidden"
            animate={hasBeenVisible ? 'visible' : 'hidden'}
            transition={mediaTransition}
          >
            <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
              <VideoPreviewCard
                poster={tiles[0].poster}
                video={tiles[0].video}
                alt={tiles[0].alt}
                isSectionVisible={isActive}
              />
            </div>
            <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
              <VideoPreviewCard
                poster={tiles[1].poster}
                video={tiles[1].video}
                alt={tiles[1].alt}
                isSectionVisible={isActive}
              />
            </div>
          </motion.div>

          {/* Center text content */}
          <motion.div
            className="flex-1 flex items-center justify-center px-4 md:px-8 lg:px-12 py-6 md:py-0"
            style={{ paddingTop: 'var(--header-height)' }}
            variants={sideVariants(false, prefersReducedMotion)}
            initial="hidden"
            animate={hasBeenVisible ? 'visible' : 'hidden'}
            transition={textTransition}
          >
            <div className="max-w-lg text-center">
              <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-4 md:mb-6">
                The{' '}
                <a
                  href={EXTERNAL_LINKS.arcaGidanHome}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <NameHighlight color="amber">Arca Gidan Prize</NameHighlight>
                </a>{' '}
                is an open source <MeaningHighlight color="amber">AI art competition</MeaningHighlight>
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
                2026 Winners
                <ExternalLinkIcon />
              </a>
            </div>
          </motion.div>

          {/* Bottom row on mobile / right column on desktop - 2 videos */}
          <motion.div
            className="h-1/4 md:h-full md:w-[30%] xl:w-[32.5%] min-h-0 flex shrink-0"
            variants={sideVariants(false, prefersReducedMotion)}
            initial="hidden"
            animate={hasBeenVisible ? 'visible' : 'hidden'}
            transition={mediaTransition}
          >
            <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
              <VideoPreviewCard
                poster={tiles[2].poster}
                video={tiles[2].video}
                alt={tiles[2].alt}
                isSectionVisible={isActive}
              />
            </div>
            <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
              <VideoPreviewCard
                poster={tiles[3].poster}
                video={tiles[3].video}
                alt={tiles[3].alt}
                isSectionVisible={isActive}
              />
            </div>
          </motion.div>
        </div>
      </SectionContent>
    </Section>
  );
};
