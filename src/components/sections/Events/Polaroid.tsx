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
}

// Shared mobile state - only one resize listener for all Polaroids
let mobileListenerCount = 0;
let isMobileGlobal = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
const mobileListeners = new Set<() => void>();

const handleResize = () => {
  const newIsMobile = window.innerWidth < 1024;
  if (newIsMobile !== isMobileGlobal) {
    isMobileGlobal = newIsMobile;
    mobileListeners.forEach(cb => cb());
  }
};

// Hook to detect if we're on mobile - shares a single resize listener
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(isMobileGlobal);
  
  useEffect(() => {
    const update = () => setIsMobile(isMobileGlobal);
    mobileListeners.add(update);
    
    // Only add event listener for first subscriber
    if (mobileListenerCount === 0) {
      window.addEventListener('resize', handleResize, { passive: true });
    }
    mobileListenerCount++;
    
    return () => {
      mobileListeners.delete(update);
      mobileListenerCount--;
      // Remove event listener when last subscriber leaves
      if (mobileListenerCount === 0) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);
  
  return isMobile;
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
  onClose 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();

  // Get position based on screen size
  const mobilePos = useMemo(() => getMobilePosition(index), [index]);
  const posX = isMobile ? mobilePos.x : photo.x;
  const posY = isMobile ? mobilePos.y : photo.y;

  // Smoothly reduce rotation on hover for a "picked up" effect
  const hoverRotation = photo.rotation * 0.3;

  // Calculate staggered delay - enter in sequence, exit in reverse
  const enterDelay = index * 80; // ms between each polaroid entering
  const exitDelay = (totalPhotos - 1 - index) * 60; // reverse order for exit

  // Get unique exit direction for this polaroid
  const exitTransform = useMemo(() => getExitTransform(index), [index]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (isExpanded) {
      onClose();
    }
  }, [isExpanded, onClose]);

  // Calculate the transform based on state
  const getTransform = () => {
    if (!isVisible) {
      // Exit state - fly off in unique direction
      return `translate(-50%, -50%) translate(${exitTransform.x}%, ${exitTransform.y}%) rotate(${exitTransform.rotation}deg) scale(0.6)`;
    }
    // Visible state - normal position
    return 'translate(-50%, -50%)';
  };

  return (
    <div
      className="absolute w-16 sm:w-20 md:w-28 lg:w-32 cursor-pointer"
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        transform: getTransform(),
        opacity: isVisible ? 1 : 0,
        zIndex: isExpanded ? 200 : isHovered ? 100 : baseZIndex + index,
        transition: isVisible
          ? `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${enterDelay}ms, opacity 0.4s ease-out ${enterDelay}ms`
          : `transform 0.5s cubic-bezier(0.55, 0, 0.85, 0.36) ${exitDelay}ms, opacity 0.3s ease-in ${exitDelay}ms`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
    >
      <div
        className={cn(
          "bg-white p-1 pb-4 sm:p-1.5 sm:pb-5 lg:pb-6 shadow-xl transition-all duration-500 ease-out",
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
        {/* Caption - only show when expanded */}
        <p 
          className={cn(
            "text-center text-neutral-600 text-[6px] mt-1 px-1 transition-opacity duration-300",
            isExpanded ? "opacity-100" : "opacity-0"
          )}
          style={{ fontFamily: "'Caveat', cursive", fontSize: isExpanded ? '10px' : '6px' }}
        >
          {photo.caption}
        </p>
      </div>
    </div>
  );
};


