import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { TravelSelector } from './TravelSelector';
import { useTravelAutoAdvance } from './useTravelAutoAdvance';
import { travelExamples } from './data';
import { Section, SectionContent } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';
import { useVideoPreloadOnVisible } from '@/lib/useViewportPreload';

export const Reigh: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState(0);
  const [showPoster, setShowPoster] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Track section visibility - pause video when scrolled away
  const { ref: sectionRef, isActive, hasStarted } = useSectionRuntime({ threshold: 0.5 });
  const isFullyVisible = hasStarted && isActive;

  // Preload all videos when section comes into view
  const videoUrls = useMemo(() => travelExamples.map((e) => e.video), []);
  useVideoPreloadOnVisible(videoUrls, isActive);

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

  // Keep video playing only when the section is actually visible.
  // This also ensures we retry playback when re-entering the section (no "latched" failure).
  useAutoPauseVideo(videoRef, {
    isActive: isFullyVisible,
    pauseDelayMs: 250, // avoid pause/play thrash on fast scroll / IO flaps (prevents flicker)
  });

  // Start/restart playback when the selected example changes OR when the section becomes visible.
  // (Reigh is more sensitive than Events because it swaps sources and doesn't loop.)
  useEffect(() => {
    if (!isFullyVisible) return;
    const video = videoRef.current;
    if (!video) return;

    // Show poster until we confirm actual playback (prevents black frames).
    setShowPoster(true);
    setVideoProgress(0);
    try {
      video.currentTime = 0;
    } catch {
      // ignore (can throw if not seekable yet)
    }
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  }, [selectedExample, isFullyVisible, setVideoProgress]);

  // Handle play button click - restart the whole cycle
  const handlePlayClick = useCallback(() => {
    handleManualSelect(selectedExample);
  }, [handleManualSelect, selectedExample]);

  const currentExample = travelExamples[selectedExample];
  const currentPoster = currentExample.poster ?? currentExample.images?.[0];

  return (
    <Section ref={sectionRef} className="bg-gradient-to-br from-[#140c22] via-[#181028] to-[#100820] text-white">
      <SectionContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left side - Video showcase */}
            <div className="order-2 lg:order-1 flex flex-col">
              <div className="relative rounded-xl overflow-hidden bg-black/50 h-[35dvh] md:h-[50dvh] lg:h-[60dvh] flex items-center justify-center">
                {/* Poster fallback (separate element so we can fade video in without hiding poster) */}
                {currentPoster && showPoster && (
                  <img
                    src={currentPoster}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain z-0"
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                )}
                <video
                  key={currentExample.video}
                  ref={videoRef}
                  src={currentExample.video}
                  poster={currentPoster}
                  preload="auto"
                  muted
                  playsInline
                  autoPlay
                  onPlay={() => handleVideoStarted(selectedExample)}
                  onPlaying={() => setShowPoster(false)}
                  onCanPlay={() => {
                    // Retry play when enough data is available (some browsers need this after src swaps).
                    if (!isFullyVisible) return;
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.paused) {
                      const p = v.play();
                      if (p && typeof p.catch === 'function') p.catch(() => {});
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    onVideoTimeUpdate(selectedExample, video.currentTime, video.duration, selectedExample);
                  }}
                  onEnded={() => onVideoEnded(selectedExample)}
                  className="relative z-10 max-w-full max-h-full object-contain"
                />

                {/* Play button overlay */}
                <button
                  onClick={handlePlayClick}
                  aria-label="Play video"
                  className={[
                    "absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/30 transition-all duration-200",
                    autoAdvance.videoEnded.has(selectedExample)
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none",
                  ].join(" ")}
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </button>
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
              <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
                Reigh is an open source art tool for travelling between images
              </h2>
              <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-8">
                We believe that there's an artform waiting to be discovered in the AI-powered journey from one image to another.
              </p>
              <a 
                href="https://reigh.art/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
              >
                Learn more
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
      </SectionContent>
    </Section>
  );
};
