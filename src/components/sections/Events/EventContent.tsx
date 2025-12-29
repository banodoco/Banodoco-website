import { useRef, useState, useCallback, useEffect } from 'react';
import type { EventItem } from './types';
import { Polaroid } from './Polaroid';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';

interface EventContentProps {
  event: EventItem;
  isVisible: boolean;
  hasStarted: boolean;
  /** Whether the parent section is visible in viewport */
  isSectionVisible?: boolean;
  onLightboxChange?: (isOpen: boolean) => void;
  onPauseChange?: (isPaused: boolean) => void;
}

export const EventContent: React.FC<EventContentProps> = ({ event, isVisible, hasStarted, isSectionVisible = true, onLightboxChange, onPauseChange }) => {
  // Combined visibility: section must be in view, section must be visible in viewport, AND this event must be selected
  const isFullyVisible = hasStarted && isVisible && isSectionVisible;
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);
  const [expandedPhotoIdx, setExpandedPhotoIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [hoveredCount, setHoveredCount] = useState(0); // Track how many cards are hovered (usually 0 or 1)

  // Some videos should start at an offset (e.g. skip leader frames).
  // On mobile Safari, setting currentTime before metadata is loaded can be ignored,
  // so we enforce this in multiple lifecycle points.
  const startOffsetSeconds = event.id === 'paris-2024' ? 2 : 0;

  // Apply start offset with Mobile Safari workaround
  const ensureStartOffset = useCallback((video: HTMLVideoElement) => {
    if (startOffsetSeconds <= 0) return;

    const applyOffset = () => {
      // Small epsilon to avoid oscillating seeks
      if (video.currentTime < startOffsetSeconds - 0.05) {
        try {
          video.currentTime = startOffsetSeconds;
        } catch {
          // Ignore (some browsers can throw if not seekable yet)
        }
      }
    };

    // If metadata is ready, seek immediately, otherwise wait for metadata.
    if (video.readyState >= 1) {
      applyOffset();
      return;
    }

    const onLoadedMetadata = () => {
      applyOffset();
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);
  }, [startOffsetSeconds]);

  // Use shared hook for video pause/resume with visibility
  const { safePlay, videoEventHandlers } = useAutoPauseVideo(videoRef, {
    isActive: isFullyVisible,
    canResume: !showLightbox,
    startOffset: startOffsetSeconds,
    loopToOffset: startOffsetSeconds > 0,
    onBeforeResume: ensureStartOffset,
    onAfterResume: ensureStartOffset, // Re-apply after play (Mobile Safari workaround)
    retryDelayMs: 150,
    maxRetries: 5,
  });

  const openLightbox = () => {
    const video = videoRef.current;
    if (video) video.pause();
    setShowLightbox(true);
    onLightboxChange?.(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    onLightboxChange?.(false);
    // Resume background video after closing (hook will handle this via canResume change)
    // But we can explicitly trigger it for immediate response
    if (isFullyVisible) {
      safePlay();
    }
  };

  // Handle escape key to close expanded photo or lightbox
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLightbox) {
          closeLightbox();
        } else if (expandedPhotoIdx !== null) {
          setExpandedPhotoIdx(null);
          onPauseChange?.(false);
        }
      }
    };
    if (expandedPhotoIdx !== null || showLightbox) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [expandedPhotoIdx, showLightbox, onPauseChange]);

  // Close expanded photo on scroll
  useEffect(() => {
    if (expandedPhotoIdx === null) return;
    
    const handleScroll = () => {
      setExpandedPhotoIdx(null);
      onPauseChange?.(false);
    };
    
    // Listen on window and document for better coverage
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [expandedPhotoIdx, onPauseChange]);

  // Close expanded photo helper
  const closeExpandedPhoto = () => {
    setExpandedPhotoIdx(null);
    onPauseChange?.(false);
  };

  // Close expanded photo when clicking outside of it
  useEffect(() => {
    if (expandedPhotoIdx === null) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedOnPolaroid = target.closest('[data-polaroid]');
      
      if (!clickedOnPolaroid) {
        closeExpandedPhoto();
      }
    };
    
    // Use setTimeout to avoid the click that opened the card from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [expandedPhotoIdx, onPauseChange]);

  if (event.comingSoon) {
    return (
      <div 
        className="relative aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/10] rounded-xl overflow-hidden bg-white/5 flex items-center justify-center transition-opacity duration-500"
        style={{ opacity: isFullyVisible ? 1 : 0 }}
      >
        <div className="text-center px-4">
          <div className="w-10 h-10 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-6 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 sm:w-10 sm:h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-2xl font-medium text-white mb-1 sm:mb-2">{event.label} {event.year}</h3>
          <p className="text-white/50 text-xs sm:text-base">Coming Soon</p>
          <p className="text-[10px] sm:text-sm text-white/30 mt-1 sm:mt-4">Details will be announced</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/10] rounded-xl overflow-visible"
    >
      {/* Touch/click blocker overlay when a card is expanded */}
      {expandedPhotoIdx !== null && (
        <div 
          className="fixed inset-0 z-[150]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeExpandedPhoto();
          }}
        />
      )}
      <div 
        className="absolute inset-0 rounded-xl overflow-hidden bg-black/50 transition-opacity duration-500"
        style={{ opacity: isFullyVisible ? 1 : 0 }}
      >
        <video
          ref={videoRef}
          src={event.video}
          poster={event.poster}
          preload="metadata"
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-70"
          onLoadedMetadata={(e) => {
            if (startOffsetSeconds > 0) {
              e.currentTarget.currentTime = startOffsetSeconds;
            }
          }}
          onLoadedData={videoEventHandlers.onLoadedData}
          onCanPlay={videoEventHandlers.onCanPlay}
          onSeeking={(e) => {
            // Prevent seeking before offset for videos that start later
            if (startOffsetSeconds > 0 && e.currentTarget.currentTime < startOffsetSeconds) {
              e.currentTarget.currentTime = startOffsetSeconds;
            }
          }}
          onPlay={(e) => {
            // Sync hook state
            videoEventHandlers.onPlay();
            // Mobile Safari can still start at 0 briefly; force jump to offset on play.
            if (startOffsetSeconds > 0 && e.currentTarget.currentTime < startOffsetSeconds - 0.05) {
              e.currentTarget.currentTime = startOffsetSeconds;
            }
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const placeholder = target.nextElementSibling as HTMLElement;
            if (placeholder) placeholder.style.display = 'flex';
          }}
        />
        
        {/* Expand button - shows when video is playing, opens lightbox */}
        <button
          onClick={openLightbox}
          className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 ${
            isPlaying && isFullyVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 hover:scale-110 transition-all duration-200 border border-white/30">
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </button>
        <div className="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-rose-900/30 to-neutral-900/50">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-white/20 mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span className="text-sm text-white/30">Event Video</span>
          </div>
        </div>
        
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      </div>

      {/* Date overlay - fades with visibility */}
      {/* Mobile: bottom-left (polaroids are top-right), Tablet/Desktop: top-right (polaroids are bottom-left) */}
      <div 
        className="absolute bottom-4 left-4 lg:bottom-auto lg:left-auto lg:top-4 lg:right-4 z-20 transition-opacity duration-400"
        style={{ opacity: isFullyVisible ? 1 : 0, transitionDelay: isFullyVisible ? '200ms' : '0ms' }}
      >
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
          <p className="text-xs text-white/50 uppercase tracking-wider">{event.label} {event.year}</p>
          <p className="text-lg font-medium text-white">{event.date}</p>
        </div>
      </div>

      {/* Scattered polaroid photos */}
      {event.photos?.map((photo, idx) => (
        <Polaroid
          key={idx}
          photo={photo}
          index={idx}
          totalPhotos={event.photos?.length ?? 0}
          baseZIndex={10}
          isExpanded={expandedPhotoIdx === idx}
          isVisible={isFullyVisible}
          onOpen={() => {
            const newIdx = expandedPhotoIdx === idx ? null : idx;
            setExpandedPhotoIdx(newIdx);
            // Pause auto-advance when a polaroid is expanded
            onPauseChange?.(newIdx !== null || hoveredCount > 0);
          }}
          onClose={() => {
            setExpandedPhotoIdx(null);
            onPauseChange?.(hoveredCount > 0);
          }}
          onNavigate={(direction) => {
            const total = event.photos?.length ?? 0;
            if (total === 0) return;
            const newIdx = direction === 'next' 
              ? (idx + 1) % total 
              : (idx - 1 + total) % total;
            setExpandedPhotoIdx(newIdx);
          }}
          onHoverChange={(isHovered) => {
            setHoveredCount(prev => isHovered ? prev + 1 : Math.max(0, prev - 1));
            // Pause when hovering or expanded
            const newHoveredCount = isHovered ? hoveredCount + 1 : Math.max(0, hoveredCount - 1);
            onPauseChange?.(expandedPhotoIdx !== null || newHoveredCount > 0);
          }}
        />
      ))}

      {/* Video Lightbox */}
      {showLightbox && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Video container - smaller and at top */}
          <div 
            className="relative w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={lightboxVideoRef}
              src={event.video}
              poster={event.poster}
              autoPlay
              controls
              playsInline
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};


