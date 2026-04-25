import { Link } from 'react-router-dom';
import { Section, SectionContent } from '@/components/layout/Section';
import { GradientHighlight, NameHighlight } from '@/components/ui/TextHighlight';
import { useSectionVisibility } from '@/lib/useSectionVisibility';

type ProjectAccent = 'rose' | 'amber' | 'emerald';

type Project = {
  name: string;
  description: string;
  href: string;
  external: boolean;
  accent: ProjectAccent;
  imageSrc: string;
  imageAlt: string;
  imageShape: 'circle' | 'rectangle';
  linkLabel: string;
};

const PROJECTS: Project[] = [
  {
    name: 'BNDC',
    description: 'A friendly robot who helps out around the community.',
    href: 'https://github.com/banodoco/brain-of-bndc',
    external: true,
    accent: 'rose',
    imageSrc: '/community-projects/bndc.png',
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
    imageSrc: '/2nd-renaissance/first_frame.png',
    imageAlt: '2nd Renaissance hero still',
    imageShape: 'rectangle',
    linkLabel: 'Explore 2RP',
  },
];

const cardClassName = 'group flex h-full flex-row items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none md:flex-col md:items-stretch md:gap-4 md:p-6';

const ProjectVisual = ({ project }: { project: Project }) => {
  const isCircle = project.imageShape === 'circle';
  return (
    <div className="shrink-0 w-20 h-20 md:w-full md:h-auto md:aspect-[4/3] rounded-xl overflow-hidden flex items-center justify-center bg-white/5">
      <img
        src={project.imageSrc}
        alt={project.imageAlt}
        className={`w-full h-full object-cover ${isCircle ? 'rounded-full md:rounded-xl' : ''}`}
      />
    </div>
  );
};

const ProjectCardContent = ({ project }: { project: Project }) => (
  <>
    <ProjectVisual project={project} />
    <div className="min-w-0 md:flex md:flex-1 md:flex-col">
      <h3 className="text-base md:text-xl font-normal tracking-tight mb-1 md:mb-3">
        <NameHighlight color={project.accent}>{project.name}</NameHighlight>
      </h3>
      <p className="text-sm md:text-base text-white/80 leading-relaxed line-clamp-2">
        {project.description}
      </p>
      <span className="mt-2 md:mt-3 inline-flex items-center gap-1 text-sm font-medium text-white/70 group-hover:text-white transition-colors">
        {project.linkLabel}
        <span aria-hidden>→</span>
      </span>
    </div>
  </>
);

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
        <div className="w-full px-6 md:px-16">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-lg md:text-3xl lg:text-4xl font-normal tracking-tight">
              Friends in the <GradientHighlight>community</GradientHighlight>
            </h2>
          </div>
        </div>

        <div className="w-full px-6 md:px-16">
          <div
            className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 transition-opacity duration-700 ${
              hasBeenVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {PROJECTS.map(project => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </div>
      </SectionContent>
    </Section>
  );
};
