import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { PhotoItem } from './types';

interface PolaroidProps {
  photo: PhotoItem;
  index: number;
  baseZIndex: number;
  isExpanded: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ 
  photo, 
  index, 
  baseZIndex, 
  isExpanded, 
  onOpen, 
  onClose 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Smoothly reduce rotation on hover for a "picked up" effect
  const hoverRotation = photo.rotation * 0.3;

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (isExpanded) {
      onClose();
    }
  }, [isExpanded, onClose]);

  return (
    <div
      className="absolute w-24 md:w-28 lg:w-32 cursor-pointer"
      style={{
        left: `${photo.x}%`,
        top: `${photo.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isExpanded ? 200 : isHovered ? 100 : baseZIndex + index,
        transition: 'z-index 0s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
    >
      <div
        className={cn(
          "bg-white p-1.5 pb-6 shadow-xl transition-all duration-500 ease-out",
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

