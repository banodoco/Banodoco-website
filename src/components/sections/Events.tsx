import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PhotoItem {
  src: string;
  rotation: number;
  x: number;
  y: number;
  caption: string;
}

interface EventItem {
  id: string;
  label: string;
  year: string;
  date?: string;
  video?: string;
  poster?: string;
  photos?: PhotoItem[];
  comingSoon?: boolean;
}

const events: EventItem[] = [
  {
    id: 'paris-2024',
    label: 'Paris',
    year: '2024',
    date: 'September 14-15',
    video: '/events/paris-2024-video.mp4',
    poster: '/events/paris-2024-poster.jpg',
    photos: [
      { src: '/events/paris-2024-1.jpg', rotation: -12, x: 8, y: 68, caption: 'Opening night at the gallery' },
      { src: '/events/paris-2024-2.jpg', rotation: 8, x: 18, y: 62, caption: 'Live art demonstration' },
      { src: '/events/paris-2024-3.jpg', rotation: -5, x: 12, y: 78, caption: 'Community dinner' },
      { src: '/events/paris-2024-4.jpg', rotation: 15, x: 25, y: 72, caption: 'Workshop session' },
      { src: '/events/paris-2024-5.jpg', rotation: -3, x: 20, y: 85, caption: 'Group photo' },
    ],
  },
  {
    id: 'la-2025',
    label: 'LA',
    year: '2025',
    date: 'March 8-9',
    video: '/events/la-2025-video.mp4',
    poster: '/events/la-2025-poster.jpg',
    photos: [
      { src: '/events/la-2025-1.jpg', rotation: 10, x: 10, y: 65, caption: 'Venue setup' },
      { src: '/events/la-2025-2.jpg', rotation: -8, x: 20, y: 72, caption: 'Panel discussion' },
      { src: '/events/la-2025-3.jpg', rotation: 6, x: 15, y: 80, caption: 'Networking session' },
      { src: '/events/la-2025-4.jpg', rotation: -14, x: 28, y: 68, caption: 'Art showcase' },
      { src: '/events/la-2025-5.jpg', rotation: 4, x: 22, y: 88, caption: 'Closing ceremony' },
    ],
  },
  {
    id: 'paris-2026',
    label: 'Paris',
    year: '2026',
    comingSoon: true,
  },
];

// Event selector toggle
const EventSelector: React.FC<{
  events: EventItem[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
}> = ({ events, selectedIndex, onSelect }) => {
  return (
    <div className="flex gap-2 justify-center mt-6">
      {events.map((event, idx) => (
        <button
          key={event.id}
          onClick={() => onSelect(idx)}
          className={cn(
            "relative px-5 py-3 rounded-lg transition-all duration-300 flex flex-col items-center min-w-[100px]",
            selectedIndex === idx
              ? "bg-rose-500/20 text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
          )}
        >
          {selectedIndex === idx && (
            <div className="absolute inset-0 rounded-lg border-2 border-rose-500/50 pointer-events-none" />
          )}
          <span className="text-sm font-medium">{event.label}</span>
          <span className="text-xs opacity-60">{event.year}</span>
        </button>
      ))}
    </div>
  );
};


// Polaroid photo component
const Polaroid: React.FC<{
  photo: PhotoItem;
  index: number;
  baseZIndex: number;
  isExpanded: boolean;
  onOpen: () => void;
  onClose: () => void;
}> = ({ photo, index, baseZIndex, isExpanded, onOpen, onClose }) => {
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

// Event content display
const EventContent: React.FC<{ event: EventItem; isVisible: boolean }> = ({ event, isVisible }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expandedPhotoIdx, setExpandedPhotoIdx] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isVisible]);

  // Handle escape key and click outside to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedPhotoIdx(null);
    };
    if (expandedPhotoIdx !== null) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [expandedPhotoIdx]);


  if (event.comingSoon) {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-medium text-white mb-2">{event.label} {event.year}</h3>
          <p className="text-white/50">Coming Soon</p>
          <p className="text-sm text-white/30 mt-4">Details will be announced</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-xl overflow-visible">
      {/* Video background */}
      <div className="absolute inset-0 rounded-xl overflow-hidden bg-black/50">
        <video
          ref={videoRef}
          src={event.video}
          poster={event.poster}
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-70"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const placeholder = target.nextElementSibling as HTMLElement;
            if (placeholder) placeholder.style.display = 'flex';
          }}
        />
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

      {/* Date overlay */}
      <div className="absolute top-4 left-4 z-20">
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
          baseZIndex={10}
          isExpanded={expandedPhotoIdx === idx}
          onOpen={() => setExpandedPhotoIdx(expandedPhotoIdx === idx ? null : idx)}
          onClose={() => setExpandedPhotoIdx(null)}
        />
      ))}
    </div>
  );
};

export const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState(0);

  const handleSelect = useCallback((idx: number) => {
    setSelectedEvent(idx);
  }, []);

  return (
    <section className="h-screen snap-start bg-[#1a1418] text-white overflow-hidden">
      <div className="h-full px-8 md:px-16 py-12 flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left side - Event content */}
            <div className="lg:col-span-8 order-2 lg:order-1">
              {/* Main content area */}
              <div className="relative">
                {events.map((event, idx) => (
                  <div
                    key={event.id}
                    className={cn(
                      "transition-opacity duration-300",
                      selectedEvent === idx ? "block" : "hidden"
                    )}
                  >
                    <EventContent event={event} isVisible={selectedEvent === idx} />
                  </div>
                ))}
              </div>
              
              {/* Selector below */}
              <EventSelector
                events={events}
                selectedIndex={selectedEvent}
                onSelect={handleSelect}
              />
            </div>

            {/* Right side - Text */}
            <div className="lg:col-span-4 order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
                ADOS events bring the community together in the real world
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-8">
                We gather our community with people from the extended creative world to look at art, eat nice food, and create things.
              </p>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-rose-400 font-medium hover:text-rose-300 transition-colors"
              >
                See website
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

