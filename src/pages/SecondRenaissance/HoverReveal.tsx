import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// Animated Underline Styles
// =============================================================================

// CSS for animated underlines - only animates color/opacity, no position changes
const animationStyles = `
  @keyframes pulseSlow {
    0%, 100% { text-decoration-color: rgb(252 211 77 / 0.4); }
    50% { text-decoration-color: rgb(252 211 77 / 1); }
  }
  
  @keyframes pulseMedium {
    0%, 100% { text-decoration-color: rgb(252 211 77 / 0.5); }
    50% { text-decoration-color: rgb(251 113 133 / 0.9); }
  }
  
  @keyframes pulseWave {
    0%, 100% { text-decoration-color: rgb(252 211 77 / 0.6); }
    25% { text-decoration-color: rgb(251 113 133 / 0.8); }
    50% { text-decoration-color: rgb(252 211 77 / 1); }
    75% { text-decoration-color: rgb(167 139 250 / 0.8); }
  }
  
  @keyframes bgPulse {
    0%, 100% { background-color: rgb(252 211 77 / 0.15); }
    50% { background-color: rgb(252 211 77 / 0.35); }
  }
  
  .hover-underline-dotted:hover {
    animation: pulseSlow 0.8s ease-in-out infinite;
  }
  
  .hover-underline-dashed:hover {
    animation: pulseMedium 0.7s ease-in-out infinite;
  }
  
  .hover-underline-wavy:hover {
    animation: pulseWave 1s ease-in-out infinite;
  }
  
  .hover-underline-solid:hover {
    animation: pulseSlow 0.6s ease-in-out infinite;
  }
  
  .hover-underline-double:hover {
    animation: pulseMedium 0.8s ease-in-out infinite;
  }
  
  .hover-underline-gradient:hover {
    animation: pulseWave 1.2s ease-in-out infinite;
  }
  
  .hover-underline-highlight:hover {
    animation: bgPulse 0.7s ease-in-out infinite;
  }
`;

// Inject styles once
let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === 'undefined') return;
  const styleEl = document.createElement('style');
  styleEl.textContent = animationStyles;
  document.head.appendChild(styleEl);
  stylesInjected = true;
};

const underlineStyles = {
  dotted: 'decoration-dotted decoration-amber-200/60 underline underline-offset-4',
  dashed: 'decoration-dashed decoration-amber-200/60 underline underline-offset-4',
  wavy: 'decoration-wavy decoration-amber-200/60 underline underline-offset-4',
  solid: 'decoration-solid decoration-amber-200/60 underline underline-offset-4 decoration-1',
  double: 'decoration-double decoration-amber-200/60 underline underline-offset-4',
  gradient: 'border-b-2 border-transparent bg-gradient-to-r from-amber-200/60 via-rose-300/60 to-amber-200/60 bg-[length:100%_2px] bg-no-repeat bg-bottom',
  highlight: 'bg-amber-200/20 px-1 -mx-1 rounded',
} as const;

type UnderlineStyle = keyof typeof underlineStyles;

interface HoverRevealProps {
  children: React.ReactNode;
  gif: string;
  style?: UnderlineStyle;
  gifAlt?: string;
}

export const HoverReveal = ({ 
  children, 
  gif, 
  style = 'dotted',
  gifAlt = 'Hover image',
}: HoverRevealProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Inject animation styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Update position when hovered
  useEffect(() => {
    if (isHovered && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [isHovered]);

  const popup = isHovered && (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        paddingBottom: '12px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          filter: 'blur(16px)',
          borderRadius: '12px',
        }} 
      />
      
      <div 
        style={{
          position: 'relative',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <img
          src={gif}
          alt={gifAlt}
          style={{
            maxWidth: '300px',
            maxHeight: '200px',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
      
      <div 
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '4px',
          width: '16px',
          height: '16px',
          background: 'rgba(0,0,0,0.8)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          transform: 'translateX(-50%) rotate(45deg)',
        }}
      />
    </div>
  );

  return (
    <>
      <span
        ref={triggerRef}
        className={`cursor-pointer transition-all duration-200 ${underlineStyles[style]} hover:text-amber-200 hover-underline-${style}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </span>

      {typeof document !== 'undefined' && createPortal(popup, document.body)}
    </>
  );
};

export type { UnderlineStyle };
export { underlineStyles };
