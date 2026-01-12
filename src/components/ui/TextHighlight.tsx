import { useRef, useEffect, useState, useCallback, type RefObject } from 'react';
import { createPortal } from 'react-dom';

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

  // Event handlers - use viewport coordinates for fixed positioning (multi-line support)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    // Use viewport coordinates directly - sparkles use fixed positioning
    mousePositionRef.current = {
      x: e.clientX,
      y: e.clientY,
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
 * Renders sparkle SVGs - uses portal + fixed positioning to avoid parent transform issues
 */
function SparkleOverlay({ sparkles }: { sparkles: Sparkle[] }) {
  // Use portal to render at document body level, avoiding any parent transforms
  if (typeof document === 'undefined' || sparkles.length === 0) return null;
  
  return createPortal(
    <>
      {sparkles.map(sparkle => {
        const config = colorConfig[sparkle.color];
        return (
          <svg
            key={sparkle.id}
            className="fixed pointer-events-none"
            style={{
              left: sparkle.x - sparkle.size / 2,
              top: sparkle.y - sparkle.size / 2,
              width: sparkle.size,
              height: sparkle.size,
              zIndex: 9999,
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
    </>,
    document.body
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
      className={`${config.text} font-semibold ${config.glow} relative cursor-default`}
      style={{ overflow: 'visible' }}
      {...handlers}
    >
      {children}
      <SparkleOverlay sparkles={sparkles} />
    </span>
  );
};

/**
 * Animated wavy line segment that follows the cursor, clipped to line bounds
 */
const WavySegment = ({ 
  x, 
  y, 
  lineLeft, 
  lineRight, 
  rgb 
}: { 
  x: number; 
  y: number; 
  lineLeft: number;
  lineRight: number;
  rgb: string;
}) => {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setTime(t => t + 0.25);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Calculate wave bounds - 60px wide but clipped to line edges
  const waveHalfWidth = 30;
  const left = Math.max(lineLeft, x - waveHalfWidth);
  const right = Math.min(lineRight, x + waveHalfWidth);
  const width = right - left;
  
  if (width <= 0) return null;
  
  const height = 10;
  const amplitude = 3;
  const frequency = 0.4;
  
  // Build path with wave - use absolute X positions for consistent wave phase
  let path = '';
  for (let i = 0; i <= width; i++) {
    const absX = left + i; // Absolute X position for consistent wave
    const wave = Math.sin(time + absX * frequency) * amplitude;
    
    // Fade amplitude at edges (relative to cursor position, not segment edges)
    const distFromCursor = Math.abs(absX - x);
    const edgeFade = Math.max(0, 1 - distFromCursor / waveHalfWidth);
    
    const pathY = height / 2 + wave * edgeFade;
    path += i === 0 ? `M ${i} ${pathY}` : ` L ${i} ${pathY}`;
  }

  return (
    <svg
      className="fixed pointer-events-none"
      style={{
        left,
        top: y - height / 2 - 1, // -1 to align with 2px underline
        width,
        height,
        zIndex: 50,
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        fill="none"
        stroke={`rgba(${rgb}, 0.8)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Highlights the MEANING/concept of a section (e.g., "together in the real world")
 * Renders with an animated underline that draws when scrolled into view.
 * On hover, a wavy distortion follows the cursor along the underline.
 */
export const MeaningHighlight = ({ children, color, delay = 300 }: MeaningHighlightProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [wavePos, setWavePos] = useState<{ x: number; y: number; lineLeft: number; lineRight: number } | null>(null);
  const config = colorConfig[color];

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    
    // Get all line rects for multi-line support
    const rects = ref.current.getClientRects();
    
    // Find which line the cursor is on
    for (const rect of rects) {
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        // Cursor is on this line - position wave at cursor X (clamped to line), line's bottom
        const x = Math.max(rect.left, Math.min(rect.right, e.clientX));
        const y = rect.bottom;
        setWavePos({ x, y, lineLeft: rect.left, lineRight: rect.right });
        return;
      }
    }
  };

  const underlineColor = `rgba(${config.rgb}, 0.8)`;
  
  return (
    <span 
      ref={ref}
      className="cursor-default"
      onMouseEnter={() => setIsHovering(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsHovering(false);
        setWavePos(null);
      }}
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
      
      {/* Wavy line segment that follows cursor */}
      {isHovering && wavePos && (
        <WavySegment 
          x={wavePos.x} 
          y={wavePos.y} 
          lineLeft={wavePos.lineLeft}
          lineRight={wavePos.lineRight}
          rgb={config.rgb} 
        />
      )}
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
 * Gradient wavy segment - uses absolute positioning within parent
 */
const GradientWavySegment = ({ 
  x, 
  elementWidth,
}: { 
  x: number; 
  elementWidth: number;
}) => {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setTime(t => t + 0.25);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const waveHalfWidth = 30;
  const left = Math.max(0, x - waveHalfWidth);
  const right = Math.min(elementWidth, x + waveHalfWidth);
  const segmentWidth = right - left;
  
  if (segmentWidth <= 0) return null;
  
  const height = 12;
  const amplitude = 3.5;
  const frequency = 0.4;
  
  let path = '';
  for (let i = 0; i <= segmentWidth; i++) {
    const absX = left + i;
    const wave = Math.sin(time + absX * frequency) * amplitude;
    const distFromCursor = Math.abs(absX - x);
    const edgeFade = Math.max(0, 1 - distFromCursor / waveHalfWidth);
    const pathY = height / 2 + wave * edgeFade;
    path += i === 0 ? `M ${i} ${pathY}` : ` L ${i} ${pathY}`;
  }

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: left,
        bottom: -height / 2 + 1.5, // Center on the 3px underline
        width: segmentWidth,
        height,
        zIndex: 50,
      }}
      viewBox={`0 0 ${segmentWidth} ${height}`}
    >
      <defs>
        <linearGradient id={`grad-wave-${Math.round(x)}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={`rgba(${colorConfig.sky.rgb}, 0.9)`} />
          <stop offset="33%" stopColor={`rgba(${colorConfig.amber.rgb}, 0.9)`} />
          <stop offset="66%" stopColor={`rgba(${colorConfig.emerald.rgb}, 0.9)`} />
          <stop offset="100%" stopColor={`rgba(${colorConfig.rose.rgb}, 0.9)`} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={`url(#grad-wave-${Math.round(x)})`}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Highlights text with a multi-color gradient underline (sky → amber → emerald → rose)
 * Used for phrases that represent the whole ecosystem vision.
 * On hover, spawns colorful sparkles and shows wavy effect!
 */
export const GradientHighlight = ({ children, delay = 300 }: GradientHighlightProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [wavePos, setWavePos] = useState<{ x: number; width: number } | null>(null);

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
  const { sparkles, handlers: sparkleHandlers } = useSparkles(ref, getColor);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    sparkleHandlers.onMouseMove(e);
    
    // Get position relative to element for absolute positioning
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // Relative to element left edge
    setWavePos({ x, width: rect.width });
  };

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
      onMouseEnter={() => {
        setIsHovering(true);
        sparkleHandlers.onMouseEnter();
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsHovering(false);
        setWavePos(null);
        sparkleHandlers.onMouseLeave();
      }}
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
    >
      {children}
      <SparkleOverlay sparkles={sparkles} />
      {/* Gradient wavy segment that follows cursor */}
      {isHovering && wavePos && (
        <GradientWavySegment 
          x={wavePos.x} 
          elementWidth={wavePos.width}
        />
      )}
    </span>
  );
};
