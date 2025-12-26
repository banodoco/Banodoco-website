import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { events } from './data';
import { EventSelector } from './EventSelector';
import { EventContent } from './EventContent';

export const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState(0);

  const handleSelect = useCallback((idx: number) => {
    setSelectedEvent(idx);
  }, []);

  return (
    <section className="h-screen snap-start bg-[#251018] text-white overflow-hidden">
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

