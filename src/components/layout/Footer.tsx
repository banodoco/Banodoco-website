import { cn } from '@/lib/utils';
import { useLayoutContext } from '@/contexts/LayoutContext';
import { XIcon, DiscordIcon, GithubIcon } from '@/components/ui/icons';

export const Footer = () => {
  const { theme, isHomePage } = useLayoutContext();
  const isDark = theme === 'dark';
  const isHomeDark = isHomePage && isDark;

  return (
    <footer 
      id="footer"
      className={cn(
        "border-t",
        isDark 
          ? cn(
              "bg-[var(--color-bg-base)] border-white/5 snap-start",
              // On the homepage, the scroll container is transparent so the fixed background
              // video can show through section overlays. If the footer is shorter than the
              // viewport, the uncovered area looks like the video is "stuck fullscreen".
              // Make the dark homepage footer fill the viewport on mobile to avoid that.
              isHomeDark ? "min-h-[100svh]" : "min-h-[25vh]",
              "md:min-h-0"
            )
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
