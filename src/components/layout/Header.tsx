import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

export const Header = () => {
  return (
    <header className="px-8 md:px-16 py-4 bg-[#f5f5f3] border-b border-black/5">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-foreground"
          >
            <path 
              d="M16 2C16 2 8 8 8 16C8 20.4183 11.5817 24 16 24C20.4183 24 24 20.4183 24 16C24 8 16 2 16 2Z" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M16 24V30" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <path 
              d="M12 28H20" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
          </svg>
          <span className="text-2xl font-semibold tracking-tight">Banodoco</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          <a 
            href="#about" 
            className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            About
          </a>
          <a 
            href="#projects" 
            className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Projects
          </a>
          <a 
            href="#resources" 
            className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Resources
          </a>
          <button className="p-2 rounded-full hover:bg-foreground/5 transition-colors">
            <User className="w-5 h-5 text-foreground/70" />
          </button>
        </nav>
      </div>
    </header>
  );
};
