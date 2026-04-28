import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { NameHighlight } from '@/components/ui/TextHighlight';

type ProjectAccent = 'rose' | 'amber' | 'emerald';

const LINK_ACCENT_CLASSES: Record<ProjectAccent, string> = {
  rose: 'text-rose-200 group-hover:text-rose-100',
  amber: 'text-amber-200 group-hover:text-amber-100',
  emerald: 'text-emerald-200 group-hover:text-emerald-100',
};

export type TetrisProject = {
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

interface TetrisBoardProps {
  projects: TetrisProject[];
  hasBeenVisible: boolean;
}

// L-tetromino (flipped): 3-tall vertical bar on the LEFT, single-cell foot at
// the TOP-RIGHT (above AC's top-left), gap at the BOTTOM-RIGHT. Bounding box is
// 2 cells wide x 3 cells tall (100% w = 2 cells, 100% h = 3 cells). Bar fills
// the left half (x 0% -> 50%, y 0% -> 100%). Foot fills the top-right
// (x 50% -> 100%, y 0% -> 33.333%). The bottom-right rectangle
// (x 50% -> 100%, y 33.333% -> 100%) is the empty negative-space "gap".
// The BNDC name + arrow text sit ON the bar (left column), not in this gap.
const BNDC_CLIP_PATH =
  'polygon(0% 0%, 100% 0%, 100% 33.333%, 50% 33.333%, 50% 100%, 0% 100%)';

const EASING: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

type TextPlacement = 'default' | 'left-bar';

const ProjectName = ({ project }: { project: TetrisProject }) => (
  <NameHighlight color={project.accent}>
    {project.name === '2RP' ? (
      <span style={{ fontFamily: '"Sixtyfour", monospace' }}>{project.name}</span>
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
);

// Image + scrims only. This is the visual content that gets clipped by the
// L-tetromino silhouette for BNDC. Text overlays render OUTSIDE this element
// (as a sibling) so they aren't clipped.
const TileVisual = ({ project }: { project: TetrisProject }) => {
  const isCircle = project.imageShape === 'circle';
  return (
    <>
      <img
        src={project.imageSrc}
        alt={project.imageAlt}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${isCircle ? 'object-top' : ''}`}
      />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />
    </>
  );
};

// Text overlay (name + arrow + optional description). Rendered OUTSIDE the
// clipped element so it can sit in negative space (e.g. BNDC's bottom-right gap).
// pointer-events-none so the wrapping <a>/<Link> remains the click surface.
const TileText = ({
  project,
  placement,
}: {
  project: TetrisProject;
  placement: TextPlacement;
}) => {
  const linkInner = (
    <span
      className={`inline-flex items-center gap-2 text-sm font-semibold pointer-events-none ${LINK_ACCENT_CLASSES[project.accent]}`}
    >
      <span>{project.linkLabel}</span>
      <span
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        ↗
      </span>
    </span>
  );

  if (placement === 'left-bar') {
    return (
      <>
        <h3 className="absolute top-4 left-4 z-10 max-w-[45%] text-2xl font-normal tracking-tight pointer-events-none text-left">
          <ProjectName project={project} />
        </h3>
        <p className="absolute top-14 left-4 right-[55%] z-10 text-base text-white/85 leading-snug pointer-events-none">
          {project.description}
        </p>
        <div className="absolute bottom-4 left-4 right-[55%] z-10 flex justify-end pointer-events-none">
          {linkInner}
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="absolute top-4 left-4 right-4 z-10 text-2xl font-normal tracking-tight pointer-events-none">
        <ProjectName project={project} />
      </h3>

      <p className="absolute top-14 left-4 right-4 z-10 text-base text-white/85 leading-snug pointer-events-none max-w-[14em]">
        {project.description}
      </p>

      <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-end pointer-events-none">
        {linkInner}
      </div>
    </>
  );
};

// Outer anchor positions and animates the tile. Focus ring sits here so it stays rectangular.
// Inner div carries the clip-path (BNDC only) and rounded corners + image content.
const baseAnchorClassName =
  'group absolute block transition-[transform,filter] duration-200 ease-out hover:-translate-y-2 hover:z-10 hover:[filter:drop-shadow(0_8px_24px_rgba(255,255,255,0.08))] focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none rounded-lg';

const baseInnerClassName =
  'absolute inset-0 overflow-hidden border border-white/10 transition-colors duration-200 group-hover:border-white/20';

const TetrisTile = ({
  project,
  delay,
  hasBeenVisible,
  prefersReducedMotion,
  outerStyle,
  innerStyle,
  innerClassName,
  textPlacement = 'default',
}: {
  project: TetrisProject;
  delay: number;
  hasBeenVisible: boolean;
  prefersReducedMotion: boolean;
  outerStyle: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  innerClassName?: string;
  textPlacement?: TextPlacement;
}) => {
  const initial = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: '-120%' };
  const animate = hasBeenVisible
    ? prefersReducedMotion
      ? { opacity: 1 }
      : { opacity: 1, y: '0%' }
    : initial;
  const transition = prefersReducedMotion
    ? { duration: 0.4, ease: 'easeOut' as const }
    : {
        duration: 0.7,
        ease: EASING,
        delay,
        opacity: { duration: 0.3, delay },
      };

  const innerWrapperClass = `${baseInnerClassName} ${innerClassName ?? ''}`.trim();

  // Clipped visual (image + scrims) and unclipped text overlay are siblings
  // inside the bbox so the text sits in negative space (BNDC bottom-right gap).
  const inner = (
    <>
      <div className={innerWrapperClass} style={innerStyle}>
        <TileVisual project={project} />
      </div>
      <TileText project={project} placement={textPlacement} />
    </>
  );

  if (project.external) {
    return (
      <motion.a
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseAnchorClassName}
        style={outerStyle}
        initial={initial}
        animate={animate}
        transition={transition}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.div
      className={baseAnchorClassName}
      style={outerStyle}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      <Link
        to={project.href}
        className="absolute inset-0 block rounded-lg focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        aria-label={`${project.name}: ${project.linkLabel}`}
      >
        {inner}
      </Link>
    </motion.div>
  );
};

export const TetrisBoard = ({ projects, hasBeenVisible }: TetrisBoardProps) => {
  const reduced = useReducedMotion() ?? false;

  const ac = projects.find((p) => p.name === 'Art Compute');
  const rp = projects.find((p) => p.name === '2RP');
  const bndc = projects.find((p) => p.name === 'BNDC');
  if (!ac || !rp || !bndc) return null;

  const orderedTiles: Array<{
    project: TetrisProject;
    outerStyle: React.CSSProperties;
    innerStyle?: React.CSSProperties;
    innerClassName?: string;
    textPlacement?: TextPlacement;
  }> = [
    {
      project: ac,
      outerStyle: { left: '0%', top: '0%', width: '50%', height: '100%' },
      innerClassName: 'rounded-lg',
    },
    {
      project: rp,
      outerStyle: { left: '50%', top: '0%', width: '50%', height: '100%' },
      innerClassName: 'rounded-lg',
    },
    {
      // BNDC bounding box: 2 cells wide x 3 cells tall (vertical L, rotated 90deg
      // counter-clockwise from horizontal). Container is 4 cells wide x 2 cells
      // tall with aspect 2:1.
      // 100% width = 4 cells, 100% height = 2 cells.
      // Width: 2/4 of container = 50%.
      // Height: 3 rows over a 2-row container = 150%.
      // Left offset: -1 cell = -25% of container width (bar overhangs left of AC).
      // Top offset: -1 row = -50% of container height. The vertical bar (left
      // column of bbox) extends from one row above AC down through AC's full
      // height. The foot (bottom-right cell of bbox) sits at AC's bottom edge.
      // The top-right rectangle of the bbox is empty negative space; the BNDC
      // name + arrow now render ON the left bar (see TileText 'left-bar').
      project: bndc,
      outerStyle: {
        left: '-25%',
        top: '-50%',
        width: '50%',
        height: '150%',
      },
      innerStyle: {
        clipPath: BNDC_CLIP_PATH,
        WebkitClipPath: BNDC_CLIP_PATH,
      },
      textPlacement: 'left-bar',
    },
  ];

  // Drop-in stagger order (explicit per-tile delays in seconds):
  //   AC (0s) -> 2RP (0.4s) -> BNDC (0.55s) -> Title piece (1.0s).
  // The deliberate ~0.4s gap between AC and 2RP gives AC time to "land" before
  // 2RP enters; the 2RP -> BNDC gap stays tight (~0.15s); the title piece lands
  // last so it caps the composition. Its text rides inside the box during the
  // drop and then "settles" downward after impact.
  const TILE_DELAY: Record<string, number> = {
    'Art Compute': 0,
    '2RP': 0.4,
    BNDC: 0.55,
  };

  // Title piece: animated colorful I-tetromino sitting beside BNDC's foot in
  // the row above AC + 2RP. With BNDC's foot now at top-right of its bbox
  // (= container col 0, row -1), the title piece occupies cols 1-3 of row -1:
  // 3 cells wide x 1 cell tall. Container is 4 cells x 2 cells (aspect 2/1).
  // Width 75%, height 50%, top -50% (one row above), left 25% (one col over).
  const titleOuterStyle: React.CSSProperties = {
    left: '25%',
    top: '-50%',
    width: '75%',
    height: '50%',
  };
  const titleInitial = reduced ? { opacity: 0 } : { opacity: 0, y: '-120%' };
  const titleAnimate = hasBeenVisible
    ? reduced
      ? { opacity: 1 }
      : { opacity: 1, y: '0%' }
    : titleInitial;
  // Title piece uses an explicit delay (1.0s) so it arrives last with a
  // deliberate beat of pause AFTER BNDC (0.55s + 0.7s duration = 1.25s) has
  // largely settled. Lands at 1.0 + 0.7 = 1.7s.
  const titleTransition = reduced
    ? { duration: 0.4, ease: 'easeOut' as const }
    : {
        duration: 0.7,
        ease: EASING,
        delay: 1.0,
        opacity: { duration: 0.3, delay: 1.0 },
      };

  // Text rides INSIDE the box during the drop (it's a child of the title
  // motion.div, so it inherits the box's translateY). It starts slightly
  // offset upward (-18%) within the box, then after the box lands it settles
  // DOWNWARD to centered — looks like the text drops a little further under
  // gravity right after impact. Settle starts at box delay (1.0) + box
  // duration (0.7) = 1.7. Opacity stays at 1 throughout — no fade.
  const titleTextInitial = reduced ? { y: 0 } : { y: '-18%' };
  const titleTextAnimate = hasBeenVisible
    ? reduced
      ? { y: 0 }
      : { y: '0%' }
    : titleTextInitial;
  const titleTextTransition = reduced
    ? { duration: 0 }
    : {
        delay: 1.7,
        type: 'spring' as const,
        stiffness: 220,
        damping: 18,
        mass: 0.9,
      };

  // Cap the board width so the BNDC overhang (1 cell = 25% of platform width to
  // the left of AC) stays inside the parent's max-w-6xl wrapper. The outer cap
  // is 960px with 20% left padding, which reserves 192px for the overhang and
  // leaves a 768px platform (~67% of the 1152px wrapper). Slight nudge right via
  // the asymmetric padding keeps the composition centered visually.
  //
  // Vertical centering: the title piece overhangs the aspectRatio bbox upward
  // by 50% of bbox-height (= 25% of bbox-width — since bbox is 2:1, height is
  // half its width). To make the wrapper's geometric center coincide with the
  // visual composition's center, the wrapper must FULLY enclose the title
  // overhang on top. paddingTop must therefore equal the full overhang, not
  // half: 25% of bbox-width (% padding is relative to the parent's content
  // width, which equals the bbox's width here, so this stays proportional at
  // any platform width). Once the wrapper encloses the whole composition, the
  // parent flex's items-center / justify-center places it at the true vertical
  // middle of the post-header content area.
  return (
    <div
      className="mx-auto"
      style={{ maxWidth: '960px', paddingLeft: '20%' }}
    >
      <div style={{ paddingTop: '25%' }}>
      <div className="relative" style={{ aspectRatio: '2 / 1' }}>
        {orderedTiles.map((tile) => (
          <TetrisTile
            key={tile.project.name}
            project={tile.project}
            delay={TILE_DELAY[tile.project.name] ?? 0}
            hasBeenVisible={hasBeenVisible}
            prefersReducedMotion={reduced}
            outerStyle={tile.outerStyle}
            innerStyle={tile.innerStyle}
            innerClassName={tile.innerClassName}
            textPlacement={tile.textPlacement}
          />
        ))}
        {/* Title piece: animated holographic I-tetromino beside BNDC's foot. */}
        <motion.div
          className="absolute rounded-lg border border-white/10 overflow-hidden flex items-center justify-center"
          style={titleOuterStyle}
          initial={titleInitial}
          animate={titleAnimate}
          transition={titleTransition}
          aria-hidden
        >
          {/* Rotating blurred conic gradient — provides the colorful aurora. */}
          <motion.div
            className="absolute inset-[-40%] pointer-events-none"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, hsl(280, 80%, 55%), hsl(200, 85%, 55%), hsl(160, 75%, 50%), hsl(40, 90%, 60%), hsl(330, 80%, 60%), hsl(280, 80%, 55%))',
              filter: 'blur(28px)',
            }}
            animate={reduced ? undefined : { rotate: 360 }}
            transition={
              reduced
                ? undefined
                : { duration: 24, ease: 'linear', repeat: Infinity }
            }
          />
          {/* Darkening overlay for text legibility. */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          {/* Text rides inside the box during the drop (fully visible the whole
              time) and then settles downward with a small spring after the box
              lands. */}
          <motion.span
            className="relative z-10 text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-white text-center px-6 drop-shadow-md"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.55)' }}
            initial={titleTextInitial}
            animate={titleTextAnimate}
            transition={titleTextTransition}
          >
            Some more pieces of the puzzle...
          </motion.span>
        </motion.div>
      </div>
      </div>
    </div>
  );
};
