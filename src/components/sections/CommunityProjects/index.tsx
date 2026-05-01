import { Link } from 'react-router-dom';
import { Section, SectionContent } from '@/components/layout/Section';
import { RpLogo } from '@/components/brand/RpLogo';
import { NameHighlight } from '@/components/ui/TextHighlight';
import { useSectionVisibility } from '@/lib/useSectionVisibility';
import { TetrisBoard, type TetrisProject } from './TetrisBoard';

type ProjectAccent = 'rose' | 'amber' | 'emerald';

const LINK_ACCENT_CLASSES: Record<ProjectAccent, string> = {
  rose: 'text-rose-200 group-hover:text-rose-100',
  amber: 'text-amber-200 group-hover:text-amber-100',
  emerald: 'text-emerald-200 group-hover:text-emerald-100',
};

type Project = TetrisProject;

const PROJECTS: Project[] = [
  {
    name: 'BNDC',
    description: 'A friendly robot who helps out around the community.',
    href: 'https://github.com/banodoco/brain-of-bndc',
    external: true,
    accent: 'rose',
    imageSrc: '/community-projects/bndc.jpg',
    imageAlt: 'BNDC mascot portrait',
    imageShape: 'circle',
    linkLabel: 'View on GitHub',
  },
  {
    name: 'Art Compute',
    description: 'Micro-grants for those pushing open AI models, approved by AI.',
    href: 'https://artcompute.org/',
    external: true,
    accent: 'amber',
    imageSrc: '/community-projects/artcompute.jpg',
    imageAlt: 'Art Compute background still',
    imageShape: 'rectangle',
    linkLabel: 'Visit website',
  },
  {
    name: '2RP',
    description: 'A curated publication spotlighting the best open-source AI art.',
    href: '/2RP',
    external: false,
    accent: 'emerald',
    imageSrc: '/community-projects/2rp.jpg',
    imageAlt: 'VisualFrisson — Everyone All at Once',
    imageShape: 'rectangle',
    linkLabel: 'Explore 2RP',
  },
];

const cardClassName = 'group relative block overflow-hidden rounded-xl md:rounded-2xl border border-white/10 aspect-[21/9] md:aspect-[3/4] transition hover:border-white/20 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none';

const ProjectCardContent = ({ project }: { project: Project }) => {
  const isCircle = project.imageShape === 'circle';
  return (
    <>
      <img
        src={project.imageSrc}
        alt={project.imageAlt}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${isCircle ? 'object-top' : ''}`}
      />
      <div className="absolute inset-x-0 top-0 h-1/2 md:h-1/3 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none md:block hidden" />

      <h3 className="absolute top-3 left-3 right-3 md:top-4 md:left-4 md:right-4 z-10 text-base md:text-2xl font-normal tracking-tight">
        <NameHighlight color={project.accent}>
          {project.name === '2RP' ? (
            <RpLogo />
          ) : project.name === 'Art Compute' ? (
            <span
              className="!font-bold uppercase tracking-[0.2em]"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
            >
              ArtCompute
            </span>
          ) : (
            project.name
          )}
        </NameHighlight>
      </h3>

      <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4 z-10">
        <p className="hidden md:block text-sm md:text-base text-white/85 leading-snug mb-2">
          {project.description}
        </p>
        <span className={`inline-flex items-center gap-1 text-xs md:text-sm font-semibold transition-all ${LINK_ACCENT_CLASSES[project.accent]} group-hover:gap-2`}>
          <span className="hidden md:inline">{project.linkLabel}</span>
          <span aria-hidden>→</span>
        </span>
      </div>
    </>
  );
};

const ProjectCard = ({ project }: { project: Project }) => {
  if (project.external) {
    return (
      <a
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClassName}
      >
        <ProjectCardContent project={project} />
      </a>
    );
  }

  return (
    <Link to="/2RP" className={cardClassName}>
      <ProjectCardContent project={project} />
    </Link>
  );
};

export const CommunityProjects = () => {
  const { ref: sectionRef, hasBeenVisible } = useSectionVisibility({
    threshold: 0.25,
    exitThreshold: 0.15,
  });

  return (
    <Section
      ref={sectionRef}
      id="community-projects"
      videoOverlay="rgba(12, 20, 24, 0.85)"
      className="text-white"
    >
      <SectionContent fullWidth className="flex-col justify-center gap-6 md:gap-10">
        {/* Mobile-only heading (desktop heading is baked into the title piece) */}
        <div className="md:hidden w-full px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-lg font-normal tracking-tight">
              Some other pieces of the puzzle
            </h2>
          </div>
        </div>

        {/* Mobile: stacked layout (unchanged) */}
        <div className="w-full px-6 md:hidden">
          <div
            className={`max-w-6xl mx-auto grid grid-cols-1 gap-4 transition-opacity duration-700 ${
              hasBeenVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {PROJECTS.map(project => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </div>

        {/* Desktop: tetris layout. The title piece overhangs the bbox upward by
           half the bbox height (25% of bbox width); the bbox is shifted down via
           padding-top so the full composition (title piece + bottom row) sits
           visually centered in its allotted vertical space. */}
        <div className="hidden md:flex w-full px-6 md:px-16 items-center justify-center">
          <div className="max-w-6xl mx-auto w-full overflow-visible">
            <TetrisBoard projects={PROJECTS} hasBeenVisible={hasBeenVisible} />
          </div>
        </div>
      </SectionContent>
    </Section>
  );
};
