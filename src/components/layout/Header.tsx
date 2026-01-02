import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLayoutContext } from '@/contexts/LayoutContext';
import { 
  NAV_SECTIONS, 
  ALL_SECTION_IDS, 
  SECTION_COLORS, 
  SECTION_HOVER_COLORS,
  SECTION_IDS,
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
  className?: string;
  onClick?: () => void;
}

const NavLink = ({ sectionId, label, isHomePage, isActive, isDark, className, onClick }: NavLinkProps) => {
  const hoverColor = SECTION_HOVER_COLORS[sectionId as keyof typeof SECTION_HOVER_COLORS] ?? 'hover:text-amber-300/80';
  const combinedClasses = cn(
    'text-sm font-semibold transition-colors duration-500 ease-out',
    !isDark && 'text-gray-900/80 hover:text-gray-900',
    isDark && !isActive && ['text-white/90', hoverColor],
    isDark && isActive && (SECTION_COLORS[sectionId as keyof typeof SECTION_COLORS] ?? 'text-amber-400'),
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
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, isHomePage } = useLayoutContext();
  const isDark = theme === 'dark';

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Track which section is currently visible (for highlighting nav items)
  useEffect(() => {
    if (!isHomePage) {
      setActiveSection(null);
      return;
    }

    const scrollContainer = document.getElementById('home-scroll-container');
    if (!scrollContainer) return;

    const intersectingSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersectingSections.add(entry.target.id);
          } else {
            intersectingSections.delete(entry.target.id);
          }
        });

        // Find the first nav section that's intersecting
        const activeNav = ALL_SECTION_IDS.find(
          (id) => intersectingSections.has(id) && NAV_SECTIONS.some(item => item.id === id)
        );
        setActiveSection(activeNav ?? null);
      },
      {
        root: scrollContainer,
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0,
      }
    );

    ALL_SECTION_IDS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [isHomePage]);

  return (
    <header
      className={cn(
        'px-5 md:px-16 pt-[max(env(safe-area-inset-top),16px)] pb-4 z-50 backdrop-blur-lg',
        isDark 
          ? 'absolute top-0 left-0 right-0 md:fixed bg-black/50 border-b border-white/15' 
          : 'relative bg-[#f5f5f3]/90 border-b border-black/10',
        mobileMenuOpen && 'border-b-0'
      )}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" onClick={(e) => scrollToTop(e, isHomePage)} className="flex items-center gap-3">
          <img src="/banodoco.png" alt="Banodoco" className="h-7 w-7" draggable={false} />
          <span className={cn('text-2xl font-semibold tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
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
            />
          ))}
        </nav>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={cn(
            'md:hidden p-2 -mr-2 transition-colors',
            isDark ? 'text-white/80 hover:text-white' : 'text-gray-900/70 hover:text-gray-900'
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
              className="text-center text-xs py-1"
              onClick={closeMobileMenu}
            />
          ))}
        </div>
      </nav>
    </header>
  );
};
