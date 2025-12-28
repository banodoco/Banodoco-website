import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { PhotoItem } from './types';

interface PolaroidProps {
  photo: PhotoItem;
  index: number;
  totalPhotos: number;
  baseZIndex: number;
  isExpanded: boolean;
  isVisible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onHoverChange?: (isHovered: boolean) => void;
}

// Shared screen size state - only one resize listener for all Polaroids
let listenerCount = 0;
let screenSizeGlobal: 'mobile' | 'tablet' | 'desktop' = typeof window !== 'undefined' 
  ? window.innerWidth < 1024 ? 'mobile' : window.innerWidth < 1280 ? 'tablet' : 'desktop'
  : 'mobile';
const screenListeners = new Set<() => void>();

const handleResize = () => {
  const newSize: 'mobile' | 'tablet' | 'desktop' = 
    window.innerWidth < 1024 ? 'mobile' : window.innerWidth < 1280 ? 'tablet' : 'desktop';
  if (newSize !== screenSizeGlobal) {
    screenSizeGlobal = newSize;
    screenListeners.forEach(cb => cb());
  }
};

// Hook to detect screen size - shares a single resize listener
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState(screenSizeGlobal);
  
  useEffect(() => {
    const update = () => setScreenSize(screenSizeGlobal);
    screenListeners.add(update);
    
    // Only add event listener for first subscriber
    if (listenerCount === 0) {
      window.addEventListener('resize', handleResize, { passive: true });
    }
    listenerCount++;
    
    return () => {
      screenListeners.delete(update);
      listenerCount--;
      // Remove event listener when last subscriber leaves
      if (listenerCount === 0) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);
  
  return screenSize;
};

// Get mobile positions for top-right cluster (spread out more)
const getMobilePosition = (index: number): { x: number; y: number } => {
  const positions = [
    { x: 72, y: 4 },
    { x: 88, y: 6 },
    { x: 80, y: 18 },
    { x: 95, y: 20 },
    { x: 68, y: 28 },
  ];
  return positions[index % positions.length];
};

// Get tablet positions for tighter bottom-left cluster
const getTabletPosition = (index: number): { x: number; y: number } => {
  const positions = [
    { x: 6, y: 58 },
    { x: 14, y: 62 },
    { x: 8, y: 72 },
    { x: 18, y: 68 },
    { x: 12, y: 80 },
  ];
  return positions[index % positions.length];
};

// Each polaroid gets a unique exit direction for variety
const getExitTransform = (index: number): { x: number; y: number; rotation: number } => {
  const directions = [
    { x: -150, y: -80, rotation: -45 },   // up-left
    { x: 180, y: -60, rotation: 35 },     // up-right
    { x: -200, y: 40, rotation: -30 },    // left
    { x: 200, y: 20, rotation: 40 },      // right
    { x: -120, y: 100, rotation: -25 },   // down-left
  ];
  return directions[index % directions.length];
};

export const Polaroid: React.FC<PolaroidProps> = ({ 
  photo, 
  index, 
  totalPhotos,
  baseZIndex, 
  isExpanded, 
  isVisible,
  onOpen, 
  onClose,
  onNavigate,
  onHoverChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const screenSize = useScreenSize();

  // Get position based on screen size
  const mobilePos = useMemo(() => getMobilePosition(index), [index]);
  const tabletPos = useMemo(() => getTabletPosition(index), [index]);
  const posX = screenSize === 'mobile' ? mobilePos.x : screenSize === 'tablet' ? tabletPos.x : photo.x;
  const posY = screenSize === 'mobile' ? mobilePos.y : screenSize === 'tablet' ? tabletPos.y : photo.y;

  // Smoothly reduce rotation on hover for a "picked up" effect
  const hoverRotation = photo.rotation * 0.3;

  // Calculate staggered delay - enter in sequence, exit in reverse
  const enterDelay = index * 80; // ms between each polaroid entering
  const exitDelay = (totalPhotos - 1 - index) * 60; // reverse order for exit

  // Get unique exit direction for this polaroid
  const exitTransform = useMemo(() => getExitTransform(index), [index]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHoverChange?.(true);
  }, [onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHoverChange?.(false);
    // Don't close on mouse leave when expanded - user must click elsewhere or press Escape
  }, [onHoverChange]);

  // Arrow key navigation when expanded
  useEffect(() => {
    if (!isExpanded || !onNavigate) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate('next');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onNavigate]);

  // Fixed center position for expanded cards (ensures full visibility with chevrons)
  const expandedPosX = 50;
  const expandedPosY = 70;

  // Calculate the transform based on state
  const getTransform = () => {
    if (!isVisible) {
      // Exit state - fly off in unique direction
      return `translate(-50%, -50%) translate(${exitTransform.x}%, ${exitTransform.y}%) rotate(${exitTransform.rotation}deg) scale(0.6)`;
    }
    // Visible state - normal position
    return 'translate(-50%, -50%)';
  };

  // Current position - moves to center when expanded
  const currentPosX = isExpanded ? expandedPosX : posX;
  const currentPosY = isExpanded ? expandedPosY : posY;

  return (
    <div
      data-polaroid
      className="absolute w-16 sm:w-20 md:w-24 lg:w-20 xl:w-32 cursor-pointer"
      style={{
        left: `${currentPosX}%`,
        top: `${currentPosY}%`,
        transform: getTransform(),
        opacity: isVisible ? 1 : 0,
        zIndex: isExpanded ? 200 : isHovered ? 100 : baseZIndex + index,
        transition: isVisible
          ? `left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${enterDelay}ms, opacity 0.4s ease-out ${enterDelay}ms`
          : `transform 0.5s cubic-bezier(0.55, 0, 0.85, 0.36) ${exitDelay}ms, opacity 0.3s ease-in ${exitDelay}ms`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
    >
      <div
        className={cn(
          "bg-white p-1 pb-4 sm:p-1.5 sm:pb-5 lg:pb-6 shadow-xl transition-all duration-500 ease-out relative",
          isHovered && !isExpanded && "shadow-2xl",
          isExpanded && "shadow-2xl"
        )}
        style={{
          transform: isExpanded 
            ? `rotate(0deg) scale(2.5) translateY(-20%)`
            : isHovered 
              ? `rotate(${hoverRotation}deg) scale(1.15) translateY(-8px)`
              : `rotate(${photo.rotation}deg) scale(1) translateY(0)`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease-out',
        }}
      >
        {/* Navigation chevrons - only when expanded */}
        {isExpanded && onNavigate && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('prev');
              }}
              className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
              style={{ fontSize: '5px' }}
            >
              <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('next');
              }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
              style={{ fontSize: '5px' }}
            >
              <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        <div className="aspect-square bg-neutral-200 overflow-hidden">
          <img
            src={photo.src}
            alt={photo.caption}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e5e5e5" width="100" height="100"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="12">${index + 1}</text></svg>`;
            }}
          />
        </div>
        {/* Caption - always visible, scales with card transform */}
        <p 
          className="text-center text-neutral-700 px-0.5 truncate"
          style={{ 
            fontFamily: "'Caveat', cursive", 
            fontSize: '6px',
            lineHeight: '1',
            marginTop: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          {photo.caption}
        </p>
      </div>
    </div>
  );
};


