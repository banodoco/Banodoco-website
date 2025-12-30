import { Link } from 'react-router-dom';

const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  e.preventDefault();
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

export const Header = () => {
  return (
    <header className="px-8 md:px-16 pt-[max(env(safe-area-inset-top),16px)] pb-4 bg-black/50 backdrop-blur-lg border-b border-white/15">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/banodoco.png"
            alt="Banodoco"
            className="h-7 w-7"
            draggable={false}
          />
          <span className="text-2xl font-semibold tracking-tight text-white">Banodoco</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#community" onClick={(e) => scrollToSection(e, 'community')} className="text-sm font-semibold text-white/90 hover:text-white transition-colors">Community</a>
          <a href="#reigh" onClick={(e) => scrollToSection(e, 'reigh')} className="text-sm font-semibold text-white/90 hover:text-white transition-colors">Reigh</a>
          <a href="#arca-gidan" onClick={(e) => scrollToSection(e, 'arca-gidan')} className="text-sm font-semibold text-white/90 hover:text-white transition-colors">Arca Gidan</a>
          <a href="#ados" onClick={(e) => scrollToSection(e, 'ados')} className="text-sm font-semibold text-white/90 hover:text-white transition-colors">ADOS</a>
        </nav>
      </div>
    </header>
  );
};
