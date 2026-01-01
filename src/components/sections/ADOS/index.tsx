import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { events } from './data';
import { EventSelector } from './EventSelector';
import { EventContent } from './EventContent';
import { useEventsAutoAdvance } from './useEventsAutoAdvance';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { Section, SectionContent } from '@/components/layout/Section';
import { useVideoPreloadOnVisible, useImagePreloadOnVisible } from '@/lib/useViewportPreload';

export const ADOS: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Track section visibility - pause videos when scrolled away
  // Threshold raised to reduce decoder contention with other video sections on mobile
  const { ref: sectionRef, isActive, hasStarted } = useSectionRuntime({ 
    threshold: 0.25,
    exitThreshold: 0.15,
  });

  // Preload video posters first (priority), then polaroid photos (delayed)
  const videoPosterUrls = useMemo(() => 
    events.map((e) => e.poster).filter(Boolean) as string[],
  []);
  const polaroidPhotoUrls = useMemo(() => 
    events.flatMap((e) => e.photos?.map((p) => p.src) ?? []),
  []);
  useImagePreloadOnVisible(videoPosterUrls, isActive, { priority: true });
  useImagePreloadOnVisible(polaroidPhotoUrls, isActive, { priority: false });

  // Only preload current + next 2 event videos (not all) to avoid saturating bandwidth on slow connections
  const videoUrls = useMemo(() => {
    const eventsWithVideo = events.filter((e) => e.video);
    const total = eventsWithVideo.length;
    if (total === 0) return [];
    // Find current index within events-with-video array
    const currentEventId = events[selectedEvent]?.id;
    const currentIdx = eventsWithVideo.findIndex((e) => e.id === currentEventId);
    if (currentIdx === -1) return [eventsWithVideo[0]?.video].filter(Boolean) as string[];
    const indices = [currentIdx, (currentIdx + 1) % total, (currentIdx + 2) % total];
    return [...new Set(indices)].map((i) => eventsWithVideo[i].video!);
  }, [selectedEvent]);
  useVideoPreloadOnVisible(videoUrls, isActive);

  const autoAdvance = useEventsAutoAdvance({
    totalEvents: events.length,
    onEventChange: setSelectedEvent,
    isActive: hasStarted && !lightboxOpen && !isPaused,
  });

  const handleSelect = useCallback((idx: number) => {
    autoAdvance.handleManualSelect(idx);
  }, [autoAdvance]);

  return (
    <Section ref={sectionRef} id="ados" className="bg-gradient-to-br from-[#200c14] via-[#251018] to-[#1a0810] text-white">
      <SectionContent>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
            {/* Left side - Event content */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              {/* Main content area - stack all events for smooth polaroid transitions */}
              <div className="relative aspect-[16/10] md:aspect-auto md:h-[36dvh] lg:aspect-[16/10] lg:h-auto">
                {events.map((event, idx) => (
                  <div
                    key={event.id}
                    className={cn(
                      "absolute inset-0",
                      selectedEvent === idx 
                        ? "z-10" 
                        : "z-0 pointer-events-none"
                    )}
                  >
                    <EventContent 
                      event={event} 
                      isVisible={selectedEvent === idx} 
                      hasStarted={hasStarted}
                      isSectionVisible={isActive}
                      onLightboxChange={setLightboxOpen}
                      onPauseChange={setIsPaused}
                    />
                  </div>
                ))}
              </div>
              
              {/* Selector below - hide when lightbox is open */}
              <div className={cn(
                "transition-opacity duration-200",
                lightboxOpen && "opacity-0 pointer-events-none"
              )}>
                <EventSelector
                  events={events}
                  selectedIndex={selectedEvent}
                  onSelect={handleSelect}
                  progress={autoAdvance.progress}
                  nextAdvanceIdx={autoAdvance.nextAdvanceIdx}
                  prevAdvanceIdx={autoAdvance.prevAdvanceIdx}
                  drainingIdx={autoAdvance.drainingIdx}
                />
              </div>
            </div>

            {/* Right side - Text */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-4 md:mb-6">
                ADOS events bring the community together in the real world
              </h2>
              <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-4 md:mb-6">
                We gather our community with people from the extended creative world to look at art, eat nice food, and create things.
              </p>
              <a
                href="https://ados.events/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-rose-400 font-medium hover:text-rose-300 transition-colors"
              >
                See events
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
      </SectionContent>
    </Section>
  );
};

