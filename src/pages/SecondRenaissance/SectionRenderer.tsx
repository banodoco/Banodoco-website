import { useNavigate } from 'react-router-dom';
import type { Section } from './sections';
import { reflectionQuestions } from './sections';

// =============================================================================
// Section Badge - Shows number in bottom right
// =============================================================================
const SectionBadge = ({ number }: { number: number }) => (
  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 text-sm font-mono z-10">
    {number}
  </div>
);

// =============================================================================
// Paragraph Renderer - Handles different text styles
// Supports both plain strings and JSX (for HoverReveal, etc.)
// =============================================================================
const Paragraph = ({ text, style = 'normal' }: { text: React.ReactNode; style?: string }) => {
  const baseClasses = "leading-relaxed";
  
  switch (style) {
    case 'highlight':
      return <p className={`text-xl md:text-2xl text-white/90 font-light ${baseClasses}`}>{text}</p>;
    case 'italic-highlight':
      return <p className={`text-xl md:text-2xl text-amber-200/90 font-light italic ${baseClasses}`}>{text}</p>;
    default:
      return <p className={`text-lg md:text-xl text-white/80 ${baseClasses}`}>{text}</p>;
  }
};

// =============================================================================
// Masonry Grid - For Renaissance art / Future vision sections
// =============================================================================
// Smaller aspect ratios to fit better in viewport
const aspectClasses: Record<string, string> = {
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[3/2]',
  wide: 'aspect-[2/1]',
  tall: 'aspect-[3/4]',
  square: 'aspect-square',
};

const MasonryGrid = ({ images }: { images: Section extends { layout: 'masonry' } ? Section['images'] : never }) => (
  <div className="columns-2 gap-2 space-y-2">
    {images.map((img, i) => (
      <div key={i} className="break-inside-avoid">
        <div className={`relative overflow-hidden rounded-md bg-gradient-to-br ${img.gradient} ${aspectClasses[img.aspect] || 'aspect-[4/3]'}`}>
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-[10px] text-center px-1">
            {img.label}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// =============================================================================
// Layout Components
// =============================================================================

// Standard content section with scrim
const ContentLayout = ({ 
  children, 
  sectionNumber,
  noPadding = false,
  noScrim = false,
}: { 
  children: React.ReactNode; 
  sectionNumber: number;
  noPadding?: boolean;
  noScrim?: boolean;
}) => (
  <div className={`relative min-h-screen flex items-center justify-center snap-start snap-always ${noPadding ? '' : 'py-24 md:py-32'}`}>
    <SectionBadge number={sectionNumber} />
    <div className="max-w-3xl mx-auto px-6 md:px-8">
      {noScrim ? children : (
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 md:p-12">
          {children}
        </div>
      )}
    </div>
  </div>
);

// Wide layout for masonry/image sections
const WideLayout = ({ 
  children, 
  sectionNumber 
}: { 
  children: React.ReactNode; 
  sectionNumber: number;
}) => (
  <div className="relative min-h-screen flex items-center justify-center py-16 md:py-20 snap-start snap-always">
    <SectionBadge number={sectionNumber} />
    <div className="max-w-5xl mx-auto px-6 md:px-8">
      <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 md:p-8">
        {children}
      </div>
    </div>
  </div>
);

// =============================================================================
// Section Renderer - Main component that renders any section type
// =============================================================================
export const SectionRenderer = ({ 
  section, 
  sectionNumber 
}: { 
  section: Section; 
  sectionNumber: number;
}) => {
  const navigate = useNavigate();
  
  const handleCtaClick = (link: string) => {
    navigate(link, { state: { scrollToTop: true } });
  };

  switch (section.layout) {
    // ─────────────────────────────────────────────────────────────────────────
    // Hero Section
    // ─────────────────────────────────────────────────────────────────────────
    case 'hero':
      return (
        <div className="relative min-h-screen h-screen flex items-center justify-center px-6 md:px-8 snap-start snap-always">
          <SectionBadge number={sectionNumber} />
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[1.1] tracking-tight">
              {section.title}
              <span className="inline italic text-amber-200"> {section.highlightedText}</span>
            </h1>
            {section.subtitle && (
              <p className="mt-8 text-xl md:text-2xl text-white font-normal tracking-wide drop-shadow-lg">
                {section.subtitle}
              </p>
            )}
          </div>
          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors">
            <svg className="w-8 h-8 animate-[pulse_2s_ease-in-out_infinite]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      );

    // ─────────────────────────────────────────────────────────────────────────
    // Standard Content Section
    // ─────────────────────────────────────────────────────────────────────────
    case 'content':
      return (
        <ContentLayout sectionNumber={sectionNumber}>
          <div className="space-y-8">
            {section.heading && (
              <h2 className="font-serif text-3xl md:text-4xl text-white font-light">
                {section.heading}
              </h2>
            )}
            {section.paragraphs.map((p, i) => (
              <Paragraph key={i} text={p.text} style={p.style} />
            ))}
          </div>
        </ContentLayout>
      );

    // ─────────────────────────────────────────────────────────────────────────
    // Masonry Grid Section (two columns: text + grid)
    // ─────────────────────────────────────────────────────────────────────────
    case 'masonry':
      return (
        <WideLayout sectionNumber={sectionNumber}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="space-y-4">
              {section.paragraphs.map((p, i) => (
                <Paragraph key={i} text={p.text} style={p.style} />
              ))}
            </div>
            <MasonryGrid images={section.images} />
          </div>
        </WideLayout>
      );

    // ─────────────────────────────────────────────────────────────────────────
    // Single Image Section (two columns: text + image)
    // ─────────────────────────────────────────────────────────────────────────
    case 'image':
      return (
        <WideLayout sectionNumber={sectionNumber}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="space-y-4">
              {section.paragraphs.map((p, i) => (
                <Paragraph key={i} text={p.text} style={p.style} />
              ))}
            </div>
            <div className="relative max-h-[50vh]">
              <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${section.image.gradient} aspect-[3/4] max-h-[50vh]`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <div className="text-white/20 text-xs mb-1">Image</div>
                  <div className="text-white/40 text-base font-serif">{section.image.label}</div>
                </div>
              </div>
              {section.image.caption && (
                <p className="text-center text-xs text-white/50 mt-2">
                  {section.image.caption}
                </p>
              )}
            </div>
          </div>
        </WideLayout>
      );

    // ─────────────────────────────────────────────────────────────────────────
    // Video Section (two columns: video on left + text on right)
    // ─────────────────────────────────────────────────────────────────────────
    case 'video': {
      // Store reverse animation frame ID on the video element
      const handleMouseEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        // Cancel any ongoing reverse animation
        const rafId = (video as HTMLVideoElement & { _reverseRaf?: number })._reverseRaf;
        if (rafId) cancelAnimationFrame(rafId);
        video.play();
      };

      const handleMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
        const video = e.currentTarget as HTMLVideoElement & { _reverseRaf?: number };
        video.pause();
        
        // Smoothly reverse the video
        const reverseSpeed = 1.5; // Reverse at 1.5x speed
        let lastTime = performance.now();
        
        const reverseStep = (now: number) => {
          const delta = (now - lastTime) / 1000; // seconds
          lastTime = now;
          
          const newTime = video.currentTime - (delta * reverseSpeed);
          if (newTime <= 0) {
            video.currentTime = 0;
            return;
          }
          video.currentTime = newTime;
          video._reverseRaf = requestAnimationFrame(reverseStep);
        };
        
        video._reverseRaf = requestAnimationFrame(reverseStep);
      };

      return (
        <WideLayout sectionNumber={sectionNumber}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="relative group cursor-pointer">
              <video
                src={section.video.src}
                poster={section.video.poster}
                muted
                playsInline
                className="w-full rounded-lg"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
              {/* Play indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 group-hover:opacity-0 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {section.heading && (
                <h2 className="font-serif text-2xl md:text-3xl text-white font-light">
                  {section.heading}
                </h2>
              )}
              {section.paragraphs.map((p, i) => (
                <Paragraph key={i} text={p.text} style={p.style} />
              ))}
            </div>
          </div>
        </WideLayout>
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Final CTA Section
    // ─────────────────────────────────────────────────────────────────────────
    case 'final':
      return (
        <ContentLayout sectionNumber={sectionNumber} noPadding noScrim>
          <div className="text-center space-y-12">
            <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl text-white font-light leading-[1.2]">
              {section.title}
              <span className="block italic text-amber-200 mt-4">{section.highlightedText}</span>
            </h2>
            <div className="pt-8">
              <button 
                onClick={() => handleCtaClick(section.ctaLink)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-200 hover:bg-amber-100 text-gray-900 rounded-lg transition-all font-medium text-lg cursor-pointer"
              >
                <span>{section.ctaText}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </ContentLayout>
      );

    // ─────────────────────────────────────────────────────────────────────────
    // Custom Section (for questions list, etc.)
    // ─────────────────────────────────────────────────────────────────────────
    case 'custom':
      // Special handling for the questions list
      if (section.id === 'questions-list') {
        return (
          <ContentLayout sectionNumber={sectionNumber}>
            <div className="space-y-4 pl-4 border-l-2 border-amber-200/30">
              {reflectionQuestions.map((q, i) => (
                <p key={i} className="text-lg md:text-xl text-white/80 leading-relaxed">
                  {q}
                </p>
              ))}
            </div>
          </ContentLayout>
        );
      }
      // Fallback for other custom sections
      return section.render ? section.render(sectionNumber) : null;

    default:
      return null;
  }
};

