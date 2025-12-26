import React from 'react';
import { cn } from '@/lib/utils';
import { AUTO_ADVANCE_ANIMATION_DURATION } from './useTravelAutoAdvance';

export interface TravelExample {
  id: string;
  label: string;
  images: string[];
  video: string;
  poster?: string;
  aspectRatio?: 'square' | 'portrait' | 'video';
}

interface TravelSelectorProps {
  examples: TravelExample[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  nextAdvanceIdx: number | null;
  prevAdvanceIdx: number | null;
  drainingIdx: number | null;
  videoProgress: number;
  videoEnded: Set<number>;
}

interface SelectorButtonProps {
  example: TravelExample;
  idx: number;
  isSelected: boolean;
  onClick: () => void;
  isNextWithBorder: boolean;
  isPrevWithBorder: boolean;
  isDraining: boolean;
  videoProgress: number;
  isVideoEnded: boolean;
}

const SelectorButton: React.FC<SelectorButtonProps> = ({
  example,
  idx,
  isSelected,
  onClick,
  isNextWithBorder,
  isPrevWithBorder,
  isDraining,
  videoProgress,
  isVideoEnded,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg transition-all duration-500 ease-out flex items-center justify-center min-h-[80px] relative overflow-hidden bg-white/5 hover:bg-white/10",
        isSelected ? "flex-[2]" : "flex-[1]"
      )}
    >
      {/* Static border for selected item */}
      {isSelected && !isNextWithBorder && !isPrevWithBorder && (
        <div className="absolute inset-0 rounded-lg border-2 border-emerald-500/50 pointer-events-none" />
      )}

      {/* Progress fill on current playing video */}
      {isSelected && !isVideoEnded && (
        <div
          className="absolute inset-0 bg-emerald-500/20 rounded-lg"
          style={{
            clipPath: `inset(0 ${100 - videoProgress}% 0 0)`,
            transition: 'clip-path 500ms ease-out',
          }}
        />
      )}

      {/* Draining fill */}
      {isDraining && (
        <div
          className="absolute inset-0 bg-emerald-500/20 rounded-lg"
          style={{
            clipPath: 'inset(0 0 0 0)',
            animation: `drainFillLeftToRight ${AUTO_ADVANCE_ANIMATION_DURATION} ease-out forwards`,
          }}
        />
      )}

      {/* Border being removed */}
      {isPrevWithBorder && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-emerald-500/50 pointer-events-none"
          style={{
            clipPath: 'inset(0 0% 0 0)',
            animation: `hideBorderLeftToRight ${AUTO_ADVANCE_ANIMATION_DURATION} ease-out forwards`,
          }}
        />
      )}

      {/* Border revealed */}
      {isNextWithBorder && !isSelected && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-emerald-500/50 pointer-events-none"
          style={{
            clipPath: 'inset(0 100% 0 0)',
            animation: `revealBorderLeftToRight ${AUTO_ADVANCE_ANIMATION_DURATION} ease-out forwards`,
          }}
        />
      )}

      {/* Thumbnail preview */}
      <ThumbnailGrid images={example.images} isSelected={isSelected} />
    </button>
  );
};

const ThumbnailGrid: React.FC<{ images: string[]; isSelected: boolean }> = ({ images, isSelected }) => {
  const count = images.length;

  if (count === 7) {
    return (
      <div className={cn(
        "flex flex-col gap-0.5 sm:gap-1 relative z-10 transition-all duration-500",
        isSelected ? "scale-110" : "scale-100"
      )}>
        <div className="flex gap-0.5 sm:gap-1">
          {images.slice(0, 4).map((img, idx) => (
            <div key={idx} className={cn(
              "bg-white/10 rounded-sm overflow-hidden transition-all duration-500",
              isSelected ? "w-6 h-5 sm:w-8 sm:h-6" : "w-4 h-3 sm:w-6 sm:h-[18px]"
            )}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="flex gap-0.5 sm:gap-1 justify-center">
          {images.slice(4, 7).map((img, idx) => (
            <div key={idx + 4} className={cn(
              "bg-white/10 rounded-sm overflow-hidden transition-all duration-500",
              isSelected ? "w-6 h-5 sm:w-8 sm:h-6" : "w-4 h-3 sm:w-6 sm:h-[18px]"
            )}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-0.5 sm:gap-1 relative z-10 transition-all duration-500",
      isSelected ? "scale-105" : "scale-100"
    )}>
      {images.map((img, idx) => (
        <div
          key={idx}
          className={cn(
            "bg-white/10 rounded-sm overflow-hidden transition-all duration-500",
            count === 2 && (isSelected ? "w-12 h-12 sm:w-14 sm:h-14" : "w-8 h-8 sm:w-10 sm:h-10"),
            count === 4 && (isSelected ? "w-6 h-10 sm:w-8 sm:h-14" : "w-4 h-7 sm:w-6 sm:h-10")
          )}
        >
          <img src={img} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
};

export const TravelSelector: React.FC<TravelSelectorProps> = ({
  examples,
  selectedIndex,
  onSelect,
  nextAdvanceIdx,
  prevAdvanceIdx,
  drainingIdx,
  videoProgress,
  videoEnded,
}) => {
  return (
    <div className="flex gap-2 w-full pt-4">
      {examples.map((example, idx) => (
        <SelectorButton
          key={example.id}
          example={example}
          idx={idx}
          isSelected={selectedIndex === idx}
          onClick={() => onSelect(idx)}
          isNextWithBorder={nextAdvanceIdx === idx}
          isPrevWithBorder={prevAdvanceIdx === idx}
          isDraining={drainingIdx === idx}
          videoProgress={videoProgress}
          isVideoEnded={videoEnded.has(idx)}
        />
      ))}
    </div>
  );
};

