import { ExternalLinkIcon } from '@/components/ui/icons';
import { NameHighlight, MeaningHighlight } from '@/components/ui/TextHighlight';
import { EXTERNAL_LINKS } from '@/lib/externalLinks';

/** Shared intro content - responsive styling handles mobile vs desktop */
export const CommunityIntro = () => (
  <div>
    <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-4 md:mb-6">
      Our <NameHighlight color="sky">community</NameHighlight> is a <MeaningHighlight color="sky">gathering place</MeaningHighlight> for people from across the ecosystem
    </h2>
    <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-4 md:mb-6">
      We've been at the cutting-edge of the technical & artistic scenes over the past two years.
    </p>
    <a
      href={EXTERNAL_LINKS.discordInvite}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sky-400 font-medium hover:text-sky-300 transition-colors"
    >
      Visit Discord
      <ExternalLinkIcon />
    </a>
  </div>
);
