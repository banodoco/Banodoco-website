import { cn } from '@/lib/utils';
import { useLayoutContext } from '@/contexts/LayoutContext';
import { XIcon, DiscordIcon, GithubIcon } from '@/components/ui/icons';

export const Footer = () => {
  const { theme, isHomePage } = useLayoutContext();
  const isDark = theme === 'dark';

  return (
    <footer 
      id="footer"
      className={cn(
        "border-t",
        isHomePage && "snap-start",
        isDark 
          ? "bg-[var(--color-bg-base)] border-white/5"
          : "bg-[#f5f5f3] border-gray-200"
      )}
    >
      <div className="flex justify-center items-center gap-8 w-full py-7 md:py-12">
        <a 
          href="https://twitter.com/banodoco" 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn(
            "transition-colors",
            isDark 
              ? "text-neutral-400 hover:text-white" 
              : "text-gray-500 hover:text-gray-900"
          )}
          aria-label="X (Twitter)"
        >
          <XIcon className="w-6 h-6" />
        </a>
        <a 
          href="https://github.com/banodoco" 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn(
            "transition-colors",
            isDark 
              ? "text-neutral-400 hover:text-white" 
              : "text-gray-500 hover:text-gray-900"
          )}
          aria-label="GitHub"
        >
          <GithubIcon className="w-6 h-6" />
        </a>
        <a 
          href="https://discord.gg/NnFxGvx94b" 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn(
            "transition-colors",
            isDark 
              ? "text-neutral-400 hover:text-white" 
              : "text-gray-500 hover:text-gray-900"
          )}
          aria-label="Discord"
        >
          <DiscordIcon className="w-6 h-6" />
        </a>
      </div>
    </footer>
  );
};
