import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { events } from './data';
import { EventSelector } from './EventSelector';
import { EventContent } from './EventContent';
import { useEventsAutoAdvance } from './useEventsAutoAdvance';
import { useInViewStart } from '../Reigh/useInViewStart';
import { Section, SectionContent } from '@/components/layout/Section';

export const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState(0);
  
  // Start auto-advance when section comes into view
  const { ref: sectionRef, hasStarted } = useInViewStart<HTMLElement>({ threshold: 0.5 });

  const autoAdvance = useEventsAutoAdvance({
    totalEvents: events.length,
    onEventChange: setSelectedEvent,
    isActive: hasStarted,
  });

  const handleSelect = useCallback((idx: number) => {
    autoAdvance.handleManualSelect(idx);
  }, [autoAdvance]);

  return (
    <Section ref={sectionRef} className="bg-gradient-to-br from-[#200c14] via-[#251018] to-[#1a0810] text-white">
      <SectionContent>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left side - Event content */}
            <div className="lg:col-span-8 order-2 lg:order-1">
              {/* Main content area - stack all events for smooth polaroid transitions */}
              <div className="relative aspect-video">
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
                    <EventContent event={event} isVisible={selectedEvent === idx} hasStarted={hasStarted} />
                  </div>
                ))}
              </div>
              
              {/* Selector below */}
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

            {/* Right side - Text */}
            <div className="lg:col-span-4 order-1 lg:order-2">
              <h2 className="text-2xl md:text-3xl font-normal tracking-tight leading-[1.15] mb-4">
                ADOS events bring the community together in the real world
              </h2>
              <p className="text-sm md:text-base text-white/60 leading-relaxed mb-6">
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
      </SectionContent>
    </Section>
  );
};

