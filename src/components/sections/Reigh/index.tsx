import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TravelSelector } from './TravelSelector';
import type { TravelExample } from './TravelSelector';
import { useTravelAutoAdvance } from './useTravelAutoAdvance';

// Travel examples with actual media files
const travelExamples: TravelExample[] = [
  {
    id: '2-images',
    label: '2 Images',
    images: [
      '/example-image1.jpg',
      '/example-image2.jpg',
    ],
    video: '/example-video.mp4',
  },
  {
    id: '4-images',
    label: '4 Images',
    images: [
      '/916-1.jpg',
      '/916-2.jpg',
      '/916-3.jpg',
      '/916-4.jpg',
    ],
    video: '/916-output.mp4',
    poster: '/916-output-poster.jpg',
  },
  {
    id: '7-images',
    label: '7 Images',
    images: [
      '/h1-crop.webp',
      '/h2-crop.webp',
      '/h3-crop.webp',
      '/h4-crop.webp',
      '/h5-crop.webp',
      '/h6-crop.webp',
      '/h7-crop.webp',
    ],
    video: '/h-output.mp4',
    poster: '/h-output-poster.jpg',
  },
];

export const Reigh: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const lastPlayedRef = useRef<number | null>(null);

  const autoAdvance = useTravelAutoAdvance({
    totalExamples: travelExamples.length,
    onExampleChange: setSelectedExample,
  });

  const {
    setVideoProgress,
    handleVideoStarted,
    handleVideoEnded: onVideoEnded,
    handleVideoTimeUpdate: onVideoTimeUpdate,
    handleManualSelect,
  } = autoAdvance;

  // Play video function - uses refs to avoid dependency issues
  const playCurrentVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = 0;
    setVideoProgress(0);
    video.play().catch(() => {});
  }, [setVideoProgress]);

  // Mark video as started when it actually plays
  const handleVideoPlay = useCallback(() => {
    handleVideoStarted(selectedExample);
  }, [handleVideoStarted, selectedExample]);

  // Start playing when section comes into view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Play video when selection changes or when first started
  useEffect(() => {
    if (!hasStarted) return;
    if (lastPlayedRef.current === selectedExample) return;
    
    lastPlayedRef.current = selectedExample;
    playCurrentVideo();
  }, [selectedExample, hasStarted, playCurrentVideo]);

  // Handle play button click - restart the whole cycle
  const handlePlayClick = useCallback(() => {
    lastPlayedRef.current = null; // Reset so it will play again
    handleManualSelect(selectedExample);
  }, [handleManualSelect, selectedExample]);

  const currentExample = travelExamples[selectedExample];

  return (
    <section ref={sectionRef} className="h-screen snap-start bg-[#0f0f0f] text-white overflow-hidden">
      {/* CSS Keyframes */}
      <style>{`
        @keyframes revealBorderLeftToRight {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0% 0 0); }
        }
        @keyframes hideBorderLeftToRight {
          from { clip-path: inset(0 0% 0 0); }
          to { clip-path: inset(0 0% 0 100%); }
        }
        @keyframes drainFillLeftToRight {
          from { clip-path: inset(0 0 0 0); }
          to { clip-path: inset(0 0 0 100%); }
        }
      `}</style>

      <div className="h-full px-8 md:px-16 py-12 flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left side - Video showcase */}
            <div className="order-2 lg:order-1 flex flex-col">
              <div className="relative rounded-xl overflow-hidden bg-black/50 h-[50vh] lg:h-[60vh] flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={currentExample.video}
                  poster={currentExample.poster}
                  muted
                  playsInline
                  onPlay={handleVideoPlay}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    onVideoTimeUpdate(selectedExample, video.currentTime, video.duration, selectedExample);
                  }}
                  onEnded={() => onVideoEnded(selectedExample)}
                  className="max-w-full max-h-full object-contain"
                />

                {/* Play button overlay */}
                {autoAdvance.videoEnded.has(selectedExample) && (
                  <button
                    onClick={handlePlayClick}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/30 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </button>
                )}
              </div>

              {/* Selector */}
              <TravelSelector
                examples={travelExamples}
                selectedIndex={selectedExample}
                onSelect={handleManualSelect}
                nextAdvanceIdx={autoAdvance.nextAdvanceIdx}
                prevAdvanceIdx={autoAdvance.prevAdvanceIdx}
                drainingIdx={autoAdvance.drainingIdx}
                videoProgress={autoAdvance.videoProgress}
                videoEnded={autoAdvance.videoEnded}
              />
            </div>

            {/* Right side - Text */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
                Reigh is an open source art tool for travelling between images
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-8">
                We believe that there's a whole artform waiting to be discovered in the journey from one image to another.
              </p>
              <a 
                href="#"
                className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
              >
                Learn more
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

