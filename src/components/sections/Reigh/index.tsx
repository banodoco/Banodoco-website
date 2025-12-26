import { useState, useCallback, useRef, useEffect } from 'react';
import { TravelSelector } from './TravelSelector';
import { useTravelAutoAdvance } from './useTravelAutoAdvance';
import { useInViewStart } from './useInViewStart';
import { travelExamples } from './data';
import { Section, SectionContent } from '@/components/layout/Section';

export const Reigh: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPlayedRef = useRef<number | null>(null);

  // Start when section comes into view
  const { ref: sectionRef, hasStarted } = useInViewStart<HTMLElement>({ threshold: 0.5 });

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

  // Play video function
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

  // Play video when selection changes or when first started
  useEffect(() => {
    if (!hasStarted) return;
    if (lastPlayedRef.current === selectedExample) return;
    
    lastPlayedRef.current = selectedExample;
    playCurrentVideo();
  }, [selectedExample, hasStarted, playCurrentVideo]);

  // Handle play button click - restart the whole cycle
  const handlePlayClick = useCallback(() => {
    lastPlayedRef.current = null;
    handleManualSelect(selectedExample);
  }, [handleManualSelect, selectedExample]);

  const currentExample = travelExamples[selectedExample];

  return (
    <Section ref={sectionRef} className="bg-gradient-to-br from-[#140c22] via-[#181028] to-[#100820] text-white">
      <SectionContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left side - Video showcase */}
            <div className="order-2 lg:order-1 flex flex-col">
              <div className="relative rounded-xl overflow-hidden bg-black/50 h-[35dvh] md:h-[50dvh] lg:h-[60dvh] flex items-center justify-center">
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
              <h2 className="text-2xl md:text-3xl font-normal tracking-tight leading-[1.15] mb-4">
                Reigh is an open source art tool for travelling between images
              </h2>
              <p className="text-base text-white/60 leading-relaxed">
                We believe that there's a whole artform waiting to be discovered in the journey from one image to another.{' '}
                <a 
                  href="#"
                  className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </p>
            </div>
          </div>
      </SectionContent>
    </Section>
  );
};
