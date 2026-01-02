import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useScreenSize } from '@/lib/useScreenSize';
import type { ScreenSize } from '@/lib/breakpoints';
import type { PhotoItem } from './types';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';

// =============================================================================
// Types & Constants
// =============================================================================

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

interface Position {
  x: number;
  y: number;
}

interface ExitTransform extends Position {
  rotation: number;
}

// Animation timing
const ANIMATION = {
  ENTER_STAGGER_MS: 80,    // Delay between each polaroid entering
  EXIT_STAGGER_MS: 60,     // Delay between each polaroid exiting (reverse order)
  HOVER_ROTATION_FACTOR: 0.3, // How much to reduce rotation on hover
} as const;

// Scale factor when polaroid is expanded (clicked/focused)
const EXPANDED_SCALE: Record<ScreenSize, number> = {
  mobile: 4,
  tablet: 3.2,
  desktop: 2.5,
};

// Fixed center position for expanded cards
const EXPANDED_POSITION = { x: 50, y: 70 };

// =============================================================================
// Position Configuration
// =============================================================================

// Mobile: top-right cluster (spread out more)
const MOBILE_POSITIONS: Position[] = [
  { x: 72, y: 4 },
  { x: 88, y: 6 },
  { x: 80, y: 18 },
  { x: 95, y: 20 },
  { x: 68, y: 28 },
];

// Tablet: bottom-left cluster (tighter grouping)
const TABLET_POSITIONS: Position[] = [
  { x: 6, y: 58 },
  { x: 14, y: 62 },
  { x: 8, y: 72 },
  { x: 18, y: 68 },
  { x: 12, y: 80 },
];

// Exit directions for variety when leaving
const EXIT_TRANSFORMS: ExitTransform[] = [
  { x: -150, y: -80, rotation: -45 },  // up-left
  { x: 180, y: -60, rotation: 35 },    // up-right
  { x: -200, y: 40, rotation: -30 },   // left
  { x: 200, y: 20, rotation: 40 },     // right
  { x: -120, y: 100, rotation: -25 },  // down-left
];

// =============================================================================
// Helper Functions
// =============================================================================

const getFromArray = <T,>(array: T[], index: number): T => array[index % array.length];

// =============================================================================
// Component
// =============================================================================

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
  const { posX, posY } = useMemo(() => {
    switch (screenSize) {
      case 'mobile': {
        const pos = getFromArray(MOBILE_POSITIONS, index);
        return { posX: pos.x, posY: pos.y };
      }
      case 'tablet': {
        const pos = getFromArray(TABLET_POSITIONS, index);
        return { posX: pos.x, posY: pos.y };
      }
      default:
        return { posX: photo.x, posY: photo.y };
    }
  }, [screenSize, index, photo.x, photo.y]);

  // Smoothly reduce rotation on hover for a "picked up" effect
  const hoverRotation = photo.rotation * ANIMATION.HOVER_ROTATION_FACTOR;

  // Calculate staggered delays - enter in sequence, exit in reverse
  const enterDelay = index * ANIMATION.ENTER_STAGGER_MS;
  const exitDelay = (totalPhotos - 1 - index) * ANIMATION.EXIT_STAGGER_MS;

  // Get unique exit direction for this polaroid
  const exitTransform = useMemo(() => getFromArray(EXIT_TRANSFORMS, index), [index]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHoverChange?.(true);
  }, [onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHoverChange?.(false);
  }, [onHoverChange]);

  // Arrow key navigation when expanded
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onNavigate) {
        e.preventDefault();
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && onNavigate) {
        e.preventDefault();
        onNavigate('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onNavigate, onClose]);

  // Calculate the transform based on visibility state
  const outerTransform = useMemo(() => {
    if (!isVisible) {
      // Exit state - fly off in unique direction
      return `translate(-50%, -50%) translate(${exitTransform.x}%, ${exitTransform.y}%) rotate(${exitTransform.rotation}deg) scale(0.6)`;
    }
    return 'translate(-50%, -50%)';
  }, [isVisible, exitTransform]);

  // Current position - moves to center when expanded
  const currentPosX = isExpanded ? EXPANDED_POSITION.x : posX;
  const currentPosY = isExpanded ? EXPANDED_POSITION.y : posY;

  // Inner card transform based on interaction state
  const innerTransform = useMemo(() => {
    if (isExpanded) {
      return `rotate(0deg) scale(${EXPANDED_SCALE[screenSize]}) translateY(-20%)`;
    }
    if (isHovered) {
      return `rotate(${hoverRotation}deg) scale(1.15) translateY(-8px)`;
    }
    return `rotate(${photo.rotation}deg) scale(1) translateY(0)`;
  }, [isExpanded, isHovered, screenSize, hoverRotation, photo.rotation]);

  return (
    <div
      data-polaroid
      className="absolute w-16 sm:w-20 md:w-[72px] lg:w-20 xl:w-32 cursor-pointer"
      style={{
        left: `${currentPosX}%`,
        top: `${currentPosY}%`,
        transform: outerTransform,
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
          (isHovered || isExpanded) && "shadow-2xl"
        )}
        style={{
          transform: innerTransform,
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
              <ChevronLeftIcon className="w-1.5 h-1.5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('next');
              }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
              style={{ fontSize: '5px' }}
            >
              <ChevronRightIcon className="w-1.5 h-1.5 text-white" />
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
        
        {/* Caption */}
        <p 
          className="text-center text-neutral-700 px-0.5 truncate"
          style={{ 
            fontFamily: "'Caveat', cursive", 
            fontSize: '6px',
            lineHeight: '1.3',
            marginTop: '6px',
            letterSpacing: '-0.02em',
          }}
        >
          {photo.caption}
        </p>
      </div>
    </div>
  );
};
