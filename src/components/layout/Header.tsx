import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLayoutContext } from '@/contexts/LayoutContext';
import { 
  NAV_SECTIONS, 
  SECTION_COLORS, 
  SECTION_HOVER_COLORS,
  SECTION_UNDERLINE_COLORS,
  SECTION_ACTIVE_UNDERLINE_COLORS,
  SECTION_SCRIM_COLORS,
  SECTION_IDS,
  type SectionId,
} from '@/lib/sections';

// =============================================================================
// Helpers
// =============================================================================

const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>, isHomePage: boolean) => {
  if (isHomePage) {
    e.preventDefault();
    document.getElementById(SECTION_IDS.hero)?.scrollIntoView({ behavior: 'smooth' });
  }
};

// =============================================================================
// NavLink Component - Reduces duplication between home/non-home and desktop/mobile
// =============================================================================

interface NavLinkProps {
  sectionId: string;
  label: string;
  isHomePage: boolean;
  isActive: boolean;
  isDark: boolean;
  isOnHero?: boolean;
  className?: string;
  onClick?: () => void;
}

const NavLink = ({ sectionId, label, isHomePage, isActive, isDark, isOnHero, className, onClick }: NavLinkProps) => {
  const hoverColor = SECTION_HOVER_COLORS[sectionId as keyof typeof SECTION_HOVER_COLORS] ?? 'hover:text-amber-300/80';
  const hoverUnderlineColor = SECTION_UNDERLINE_COLORS[sectionId as keyof typeof SECTION_UNDERLINE_COLORS] ?? 'hover:after:bg-amber-300/80';
  const activeUnderlineColor = SECTION_ACTIVE_UNDERLINE_COLORS[sectionId as keyof typeof SECTION_ACTIVE_UNDERLINE_COLORS] ?? 'after:bg-amber-400';
  const combinedClasses = cn(
    'text-[13px] font-medium transition-all duration-200 relative',
    // Underline on hover for premium feel
    'after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:transition-all after:duration-200 hover:after:w-full',
    isOnHero && 'text-[#141414] hover:text-[#141414] after:bg-[#141414]',
    !isOnHero && !isDark && 'text-[#4B4B4B] hover:text-[#141414] after:bg-[#141414]',
    !isOnHero && isDark && !isActive && ['text-white/80', hoverColor, hoverUnderlineColor],
    !isOnHero && isDark && isActive && [SECTION_COLORS[sectionId as keyof typeof SECTION_COLORS] ?? 'text-amber-400', activeUnderlineColor],
    className
  );

  if (isHomePage) {
    return (
      <a
        href={`#${sectionId}`}
        onClick={(e) => {
          scrollToSection(e, sectionId);
          onClick?.();
        }}
        className={combinedClasses}
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      to="/"
      state={{ scrollTo: sectionId }}
      onClick={onClick}
      className={combinedClasses}
    >
      {label}
    </Link>
  );
};

// =============================================================================
// Header Component
// =============================================================================

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, isHomePage, currentSection } = useLayoutContext();
  const isDark = theme === 'dark';

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  
  // Get scrim color based on current section (defaults to hero's light scrim)
  const scrimKey = (currentSection ?? SECTION_IDS.hero) as SectionId | 'footer';
  const scrimColor = SECTION_SCRIM_COLORS[scrimKey] ?? SECTION_SCRIM_COLORS[SECTION_IDS.hero];

  // Determine active nav section (only highlight if it's a nav item)
  const activeSection = NAV_SECTIONS.some(item => item.id === currentSection) 
    ? currentSection 
    : null;

  // Hero section uses light fog overlay, so logo/nav should be dark knockout text
  const isOnHero = isHomePage && (currentSection === SECTION_IDS.hero || currentSection === null);

  // Transparent header with blur and border for hero
  const heroHeaderStyle = isOnHero ? {
    background: 'transparent',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } : undefined;

  return (
    <header
      className={cn(
        'px-6 md:px-20 lg:px-24 py-4 z-50 transition-colors duration-300',
        isOnHero && 'absolute top-0 left-0 right-0 md:fixed border-b border-black/10',
        !isOnHero && isDark && [
          'absolute top-0 left-0 right-0 md:fixed border-b border-white/10 backdrop-blur-md',
          scrimColor
        ],
        !isOnHero && !isDark && 'relative bg-[#faf9f7]/90 border-b border-black/[0.06] backdrop-blur-md',
        mobileMenuOpen && 'border-b-0'
      )}
      style={heroHeaderStyle}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" onClick={(e) => scrollToTop(e, isHomePage)} className="flex items-center gap-2.5">
          <img src="/banodoco.png" alt="Banodoco" className="h-7 w-7" draggable={false} />
          <span 
            className={cn(
              'text-xl font-semibold tracking-[-0.01em]',
              isOnHero && 'text-[#141414]',
              !isOnHero && isDark && 'text-white',
              !isOnHero && !isDark && 'text-[#141414]'
            )}
          >
            Banodoco
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_SECTIONS.map(({ id, label }) => (
            <NavLink
              key={id}
              sectionId={id}
              label={label}
              isHomePage={isHomePage}
              isActive={activeSection === id}
              isDark={isDark}
              isOnHero={isOnHero}
            />
          ))}
        </nav>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={cn(
            'md:hidden p-2 -mr-2 transition-colors',
            (isOnHero || !isDark) ? 'text-gray-900/70 hover:text-gray-900' : 'text-white/80 hover:text-white'
          )}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <nav
        className={cn(
          'md:hidden overflow-hidden transition-all duration-200 ease-out -mx-5',
          mobileMenuOpen 
            ? cn('max-h-20 opacity-100 mt-4 border-t', isDark ? 'border-white/15' : 'border-black/10')
            : 'max-h-0 opacity-0 mt-0'
        )}
      >
        <div className={cn('grid grid-cols-4 py-3 border-b', isDark ? 'border-white/15' : 'border-black/10')}>
          {NAV_SECTIONS.map(({ id, label }) => (
            <NavLink
              key={id}
              sectionId={id}
              label={label}
              isHomePage={isHomePage}
              isActive={activeSection === id}
              isDark={isDark}
              isOnHero={isOnHero}
              className="text-center text-xs py-1"
              onClick={closeMobileMenu}
            />
          ))}
        </div>
      </nav>
    </header>
  );
};
