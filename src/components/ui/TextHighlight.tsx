import { useRef, useEffect, useState, useCallback, type RefObject } from 'react';

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

// =============================================================================
// SHARED SPARKLE SYSTEM
// =============================================================================

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  color: HighlightColor;
}

type ColorPicker = () => HighlightColor;

/**
 * Shared hook for continuous sparkle effects on hover.
 * Works with any element ref and color picker function.
 */
function useSparkles(
  ref: RefObject<HTMLElement | null>,
  getColor: ColorPicker
) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const sparkleIdRef = useRef(0);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);

  // Spawn sparkles at current mouse position
  const spawnSparkles = useCallback(() => {
    if (!mousePositionRef.current) return;
    
    const { x, y } = mousePositionRef.current;
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
        color: getColor(),
      });
    }
    
    setSparkles(prev => [...prev, ...newSparkles]);
    
    // Clean up after animation
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => !newSparkles.find(ns => ns.id === s.id)));
    }, 600);
  }, [getColor]);

  // Continuous sparkle interval while hovering
  useEffect(() => {
    if (!isHovering) return;
    
    const interval = setInterval(spawnSparkles, 50);
    return () => clearInterval(interval);
  }, [isHovering, spawnSparkles]);

  // Event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mousePositionRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [ref]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    mousePositionRef.current = null;
    setSparkles([]);
  }, []);

  return {
    sparkles,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}

/**
 * Renders sparkle SVGs - shared between NameHighlight and GradientHighlight
 */
function SparkleOverlay({ sparkles }: { sparkles: Sparkle[] }) {
  return (
    <>
      {sparkles.map(sparkle => {
        const config = colorConfig[sparkle.color];
        return (
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
        );
      })}
    </>
  );
}

// =============================================================================
// HIGHLIGHT COMPONENTS
// =============================================================================

/**
 * Highlights the NAME/subject of a section (e.g., "ADOS", "Reigh")
 * Renders in the section's accent color with a subtle glow
 * Features tiny sparkles that spring off continuously on hover
 */
export const NameHighlight = ({ children, color }: NameHighlightProps) => {
  const config = colorConfig[color];
  const ref = useRef<HTMLSpanElement>(null);
  
  // Single color sparkles
  const getColor = useCallback(() => color, [color]);
  const { sparkles, handlers } = useSparkles(ref, getColor);
  
  return (
    <span 
      ref={ref}
      className={`${config.text} font-semibold ${config.glow} relative inline-block cursor-default`}
      style={{ overflow: 'visible' }}
      {...handlers}
    >
      {children}
      <SparkleOverlay sparkles={sparkles} />
    </span>
  );
};

/**
 * Highlights the MEANING/concept of a section (e.g., "together in the real world")
 * Renders with an animated underline that draws when scrolled into view.
 * On hover, single-line text gets a localized wavy ripple effect.
 * Multi-line text uses simple background-image underline (no wave).
 */
export const MeaningHighlight = ({ children, color, delay = 300 }: MeaningHighlightProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [time, setTime] = useState(0);
  const config = colorConfig[color];

  const segmentCount = 40;

  // Detect if text wraps to multiple lines
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const checkMultiLine = () => {
      const rects = element.getClientRects();
      setIsMultiLine(rects.length > 1);
    };

    checkMultiLine();
    window.addEventListener('resize', checkMultiLine);
    return () => window.removeEventListener('resize', checkMultiLine);
  }, []);

  // Intersection observer for draw-in animation
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

  // Animation loop for wave effect (single-line only)
  useEffect(() => {
    if (!isHovering || isMultiLine) return;
    
    let animationId: number;
    const animate = () => {
      setTime(t => t + 0.15);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [isHovering, isMultiLine]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || isMultiLine) return;
    const rect = ref.current.getBoundingClientRect();
    setMouseX((e.clientX - rect.left) / rect.width);
  };

  const getSegmentOffset = (segmentIndex: number): number => {
    if (!isHovering || isMultiLine) return 0;
    
    const segmentX = segmentIndex / segmentCount;
    const distance = Math.abs(segmentX - mouseX);
    
    const amplitude = 3;
    const wavelength = 0.15;
    const falloff = 0.12;
    const decay = Math.exp(-distance / falloff);
    const wave = Math.sin(time + segmentIndex * wavelength * Math.PI * 2);
    
    return wave * amplitude * decay;
  };

  // Multi-line: use simple background-image underline
  if (isMultiLine) {
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
          WebkitBoxDecorationBreak: 'clone',
          boxDecorationBreak: 'clone' as const,
          paddingBottom: '2px',
        }}
      >
        {children}
      </span>
    );
  }

  // Single-line: use segmented wavy underline
  return (
    <span 
      ref={ref}
      className="relative cursor-default"
      onMouseEnter={() => setIsHovering(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsHovering(false);
        setTime(0);
      }}
      style={{ 
        display: 'inline-block',
        paddingBottom: '4px',
      }}
    >
      {children}
      <span 
        className="absolute left-0 bottom-0 pointer-events-none flex"
        style={{ 
          width: '100%',
          height: '2px',
          transform: shouldAnimate ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 0.7s ease-out',
        }}
      >
        {Array.from({ length: segmentCount }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: `rgba(${config.rgb}, 0.8)`,
              transform: `translateY(${getSegmentOffset(i)}px)`,
            }}
          />
        ))}
      </span>
    </span>
  );
};

interface GradientHighlightProps {
  children: React.ReactNode;
  /** Delay before animation starts (ms) */
  delay?: number;
}

const gradientSparkleColors: HighlightColor[] = ['sky', 'emerald', 'amber', 'rose'];

/**
 * Highlights text with a multi-color gradient underline (sky → amber → emerald → rose)
 * Used for phrases that represent the whole ecosystem vision.
 * On hover, spawns colorful sparkles in all four ecosystem colors!
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

  // Random color from the four gradient colors
  const getColor = useCallback(
    () => gradientSparkleColors[Math.floor(Math.random() * gradientSparkleColors.length)],
    []
  );
  const { sparkles, handlers } = useSparkles(ref, getColor);

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
      className="relative inline-block cursor-default"
      style={{ 
        backgroundImage: `linear-gradient(90deg, ${gradientColors})`,
        backgroundPosition: '0 100%',
        backgroundRepeat: 'no-repeat',
        backgroundSize: shouldAnimate ? '100% 3px' : '0% 3px',
        transition: 'background-size 0.9s ease-out',
        paddingBottom: '3px',
        // Keep as single line to preserve gradient continuity
        whiteSpace: 'nowrap',
        overflow: 'visible',
      }}
      {...handlers}
    >
      {children}
      <SparkleOverlay sparkles={sparkles} />
    </span>
  );
};
