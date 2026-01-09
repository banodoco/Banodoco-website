import { useRef, useEffect, useState } from 'react';

type HighlightColor = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

interface NameHighlightProps {
  children: React.ReactNode;
  color: HighlightColor;
}

interface MeaningHighlightProps {
  children: React.ReactNode;
  color: HighlightColor;
  /** Delay before animation starts (ms) */
  delay?: number;
}

const colorConfig: Record<HighlightColor, { text: string; rgb: string; glow: string }> = {
  sky: {
    text: 'text-sky-400',
    rgb: '56, 189, 248',
    glow: 'drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]',
  },
  emerald: {
    text: 'text-emerald-400',
    rgb: '52, 211, 153',
    glow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]',
  },
  amber: {
    text: 'text-amber-400',
    rgb: '251, 191, 36',
    glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]',
  },
  rose: {
    text: 'text-rose-400',
    rgb: '251, 113, 133',
    glow: 'drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]',
  },
  violet: {
    text: 'text-violet-400',
    rgb: '167, 139, 250',
    glow: 'drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]',
  },
};

/**
 * Highlights the NAME/subject of a section (e.g., "ADOS", "Reigh")
 * Renders in the section's accent color with a subtle glow
 */
export const NameHighlight = ({ children, color }: NameHighlightProps) => {
  const config = colorConfig[color];
  
  return (
    <span className={`${config.text} font-semibold ${config.glow}`}>
      {children}
    </span>
  );
};

/**
 * Highlights the MEANING/concept of a section (e.g., "together in the real world")
 * Renders with an animated underline that draws when scrolled into view.
 * Uses background-image approach to support multi-line text.
 */
export const MeaningHighlight = ({ children, color, delay = 300 }: MeaningHighlightProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const config = colorConfig[color];

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          // Add delay before starting animation
          setTimeout(() => setShouldAnimate(true), delay);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, isVisible]);

  // Use background-image for underline - works across line breaks
  const underlineColor = `rgba(${config.rgb}, 0.8)`;
  
  return (
    <span 
      ref={ref} 
      style={{ 
        backgroundImage: `linear-gradient(${underlineColor}, ${underlineColor})`,
        backgroundPosition: '0 100%',
        backgroundRepeat: 'no-repeat',
        backgroundSize: shouldAnimate ? '100% 2px' : '0% 2px',
        transition: 'background-size 0.7s ease-out',
        // Ensure underline appears on each line when text wraps
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
        paddingBottom: '2px',
      }}
    >
      {children}
    </span>
  );
};

interface GradientHighlightProps {
  children: React.ReactNode;
  /** Delay before animation starts (ms) */
  delay?: number;
}

/**
 * Highlights text with a multi-color gradient underline (sky → amber → emerald → rose)
 * Used for phrases that represent the whole ecosystem vision.
 */
export const GradientHighlight = ({ children, delay = 300 }: GradientHighlightProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          setTimeout(() => setShouldAnimate(true), delay);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, isVisible]);

  // Four-color gradient: sky → amber → emerald → rose
  const gradientColors = `
    rgba(${colorConfig.sky.rgb}, 0.9),
    rgba(${colorConfig.amber.rgb}, 0.9),
    rgba(${colorConfig.emerald.rgb}, 0.9),
    rgba(${colorConfig.rose.rgb}, 0.9)
  `;
  
  return (
    <span 
      ref={ref} 
      style={{ 
        backgroundImage: `linear-gradient(90deg, ${gradientColors})`,
        backgroundPosition: '0 100%',
        backgroundRepeat: 'no-repeat',
        backgroundSize: shouldAnimate ? '100% 3px' : '0% 3px',
        transition: 'background-size 0.9s ease-out',
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
        paddingBottom: '3px',
      }}
    >
      {children}
    </span>
  );
};

