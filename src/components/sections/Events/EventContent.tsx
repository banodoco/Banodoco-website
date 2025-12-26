import { useRef, useState, useEffect } from 'react';
import type { EventItem } from './types';
import { Polaroid } from './Polaroid';

interface EventContentProps {
  event: EventItem;
  isVisible: boolean;
}

export const EventContent: React.FC<EventContentProps> = ({ event, isVisible }) => {
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

  // Handle escape key to close expanded photo
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

