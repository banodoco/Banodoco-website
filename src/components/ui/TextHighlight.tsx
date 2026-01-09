import { useRef, useEffect, useState, useCallback } from 'react';

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

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
}

/**
 * Highlights the NAME/subject of a section (e.g., "ADOS", "Reigh")
 * Renders in the section's accent color with a subtle glow
 * Features tiny sparkles that spring off randomly on hover
 */
export const NameHighlight = ({ children, color }: NameHighlightProps) => {
  const config = colorConfig[color];
  const ref = useRef<HTMLSpanElement>(null);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const sparkleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    
    // Throttle spawning - only spawn every ~50ms
    const now = Date.now();
    if (now - lastSpawnRef.current < 50) return;
    lastSpawnRef.current = now;
    
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Spawn 1-2 sparkles at cursor position with random velocities
    const newSparkles: Sparkle[] = [];
    const count = Math.random() > 0.5 ? 2 : 1;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      newSparkles.push({
        id: sparkleIdRef.current++,
        x,
        y,
        size: 4 + Math.random() * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // slight upward bias
      });
    }
    
    setSparkles(prev => [...prev, ...newSparkles]);
    
    // Clean up old sparkles after animation
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => !newSparkles.find(ns => ns.id === s.id)));
    }, 600);
  }, []);
  
  return (
    <span 
      ref={ref}
      className={`${config.text} font-semibold ${config.glow} relative inline-block cursor-default`}
      style={{ overflow: 'visible' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSparkles([])}
    >
      {children}
      {/* Sparkles that spring off */}
      {sparkles.map(sparkle => (
        <svg
          key={sparkle.id}
          className="absolute pointer-events-none"
          style={{
            left: sparkle.x - sparkle.size / 2,
            top: sparkle.y - sparkle.size / 2,
            width: sparkle.size,
            height: sparkle.size,
            zIndex: 50,
            filter: `drop-shadow(0 0 2px rgba(${config.rgb}, 0.6))`,
            animation: 'sparkle-fly 0.6s ease-out forwards',
            ['--vx' as string]: `${sparkle.vx * 20}px`,
            ['--vy' as string]: `${sparkle.vy * 20}px`,
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 0L13.5 9L22 12L13.5 15L12 24L10.5 15L2 12L10.5 9L12 0Z"
            fill={`rgba(${config.rgb}, 0.9)`}
          />
        </svg>
      ))}
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
        paddingBottom: '3px',
        // Keep as single line to preserve gradient continuity
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

