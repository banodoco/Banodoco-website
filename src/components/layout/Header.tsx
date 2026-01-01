import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Nav sections that should be highlighted
const NAV_SECTION_IDS = ['community', 'reigh', 'arca-gidan', 'ados'];
// All sections to observe (including ones that should clear the highlight)
const ALL_SECTION_IDS = ['hero', 'community', 'reigh', 'arca-gidan', 'ados', 'ecosystem', 'ownership'];

const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  e.preventDefault();
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>, isHomePage: boolean) => {
  if (isHomePage) {
    e.preventDefault();
    const heroElement = document.getElementById('hero');
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
  // If not on home page, let the Link navigate normally
};

export const Header = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Close mobile menu when navigating
  const handleMobileNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    scrollToSection(e, id);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!isHomePage) {
      // Prevent stale highlights when navigating away from home.
      setActiveSection(null);
      return;
    }

    // Find the scroll container (the snap container on home page)
    const scrollContainer = document.getElementById('home-scroll-container');
    if (!scrollContainer) return;

    // Track all currently intersecting sections (callback only gives us changes)
    const intersectingSections = new Set<string>();

    const observerOptions: IntersectionObserverInit = {
      root: scrollContainer,
      rootMargin: '-45% 0px -45% 0px', // Only the center 10% triggers intersection
      threshold: 0,
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      // Update our set of intersecting sections
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersectingSections.add(entry.target.id);
        } else {
          intersectingSections.delete(entry.target.id);
        }
      });

      // Find the first nav section that's intersecting (in defined order)
      const activeNav = ALL_SECTION_IDS.find(
        (id) => intersectingSections.has(id) && NAV_SECTION_IDS.includes(id)
      );
      
      setActiveSection(activeNav ?? null);
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    ALL_SECTION_IDS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [isHomePage]);

  const getLinkClasses = (sectionId: string) => {
    const isActive = activeSection === sectionId;
    if (!isActive) {
      return 'text-sm font-semibold transition-colors text-white/90 hover:text-white';
    }
    // Match each section's accent color
    const colorMap: Record<string, string> = {
      'community': 'text-sky-400',
      'reigh': 'text-emerald-400',
      'arca-gidan': 'text-amber-400',
      'ados': 'text-rose-400',
    };
    return `text-sm font-semibold transition-colors ${colorMap[sectionId] ?? 'text-amber-400'}`;
  };

  return (
    <header className={`absolute top-0 left-0 right-0 md:fixed px-5 md:px-16 pt-[max(env(safe-area-inset-top),16px)] pb-4 bg-black/50 backdrop-blur-lg border-b border-white/15 z-50 ${mobileMenuOpen ? 'border-b-0' : ''}`}>
      <div className="flex items-center justify-between">
        <Link to="/" onClick={(e) => scrollToTop(e, isHomePage)} className="flex items-center gap-3">
          <img
            src="/banodoco.png"
            alt="Banodoco"
            className="h-7 w-7"
            draggable={false}
          />
          <span className="text-2xl font-semibold tracking-tight text-white">Banodoco</span>
        </Link>
        
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#community" onClick={(e) => scrollToSection(e, 'community')} className={getLinkClasses('community')}>Community</a>
          <a href="#reigh" onClick={(e) => scrollToSection(e, 'reigh')} className={getLinkClasses('reigh')}>Reigh</a>
          <a href="#arca-gidan" onClick={(e) => scrollToSection(e, 'arca-gidan')} className={getLinkClasses('arca-gidan')}>Arca Gidan</a>
          <a href="#ados" onClick={(e) => scrollToSection(e, 'ados')} className={getLinkClasses('ados')}>ADOS</a>
        </nav>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 -mr-2 text-white/80 hover:text-white transition-colors"
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

      {/* Mobile menu - extends seamlessly from header */}
      <nav 
        className={`md:hidden overflow-hidden transition-all duration-200 ease-out -mx-5 ${
          mobileMenuOpen 
            ? 'max-h-20 opacity-100 mt-4 border-t border-white/15' 
            : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className="grid grid-cols-4 py-3 border-b border-white/15">
          <a 
            href="#community" 
            onClick={(e) => handleMobileNavClick(e, 'community')} 
            className={getLinkClasses('community') + ' text-center text-xs py-1'}
          >
            Discord
          </a>
          <a 
            href="#reigh" 
            onClick={(e) => handleMobileNavClick(e, 'reigh')} 
            className={getLinkClasses('reigh') + ' text-center text-xs py-1'}
          >
            Reigh
          </a>
          <a 
            href="#arca-gidan" 
            onClick={(e) => handleMobileNavClick(e, 'arca-gidan')} 
            className={getLinkClasses('arca-gidan') + ' text-center text-xs py-1'}
          >
            Arca Gidan
          </a>
          <a 
            href="#ados" 
            onClick={(e) => handleMobileNavClick(e, 'ados')} 
            className={getLinkClasses('ados') + ' text-center text-xs py-1'}
          >
            ADOS
          </a>
        </div>
      </nav>
    </header>
  );
};
