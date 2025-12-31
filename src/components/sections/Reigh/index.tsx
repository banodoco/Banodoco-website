import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { TravelSelector } from './TravelSelector';
import { useTravelAutoAdvance } from './useTravelAutoAdvance';
import { travelExamples } from './data';
import { Section, SectionContent } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';
import { useVideoPreloadOnVisible } from '@/lib/useViewportPreload';
import { bindAutoPauseVideo } from '@/lib/bindAutoPauseVideo';

export const Reigh: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState(0);
  const [showPoster, setShowPoster] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Track section visibility - pause video when scrolled away
  // Threshold raised to reduce decoder contention with other video sections on mobile
  const { ref: sectionRef, isActive, hasStarted } = useSectionRuntime({ 
    threshold: 0.25,
    exitThreshold: 0.15,
  });
  const isFullyVisible = hasStarted && isActive;

  // Only preload current + next 2 videos (not all) to avoid saturating bandwidth on slow connections
  const videoUrls = useMemo(() => {
    const total = travelExamples.length;
    const indices = [selectedExample, (selectedExample + 1) % total, (selectedExample + 2) % total];
    return [...new Set(indices)].map((i) => travelExamples[i].video);
  }, [selectedExample]);
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

  // Consolidated video playback control - single source of truth for play/pause logic.
  // Handles visibility changes, retries on mobile, and state synchronization.
  const { safePlay, videoEventHandlers } = useAutoPauseVideo(videoRef, {
    isActive: isFullyVisible,
    pauseDelayMs: 250, // avoid pause/play thrash on fast scroll / IO flaps (prevents flicker)
    retryDelayMs: 150, // mobile browsers sometimes need a bit more time
    maxRetries: 5, // be persistent on mobile
  });

  // When example changes, reset video state and trigger play via the hook.
  // We reset progress here but let the hook handle the actual play logic.
  useEffect(() => {
    if (!isFullyVisible) return;
    
    // Show poster until we confirm actual playback (prevents black frames).
    setShowPoster(true);
    setVideoProgress(0);

    // The video element is recreated due to key prop, so we need to
    // wait for it to be ready. The hook's onCanPlay handler will
    // trigger play when the new video element has data.
    // We also trigger safePlay here as a backup for browsers that
    // fire canplay before our effect runs.
    const video = videoRef.current;
    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        // ignore (can throw if not seekable yet)
      }
      safePlay();
    }
  }, [selectedExample, isFullyVisible, setVideoProgress, safePlay]);

  // Handle play button click - restart the whole cycle
  const handlePlayClick = useCallback(() => {
    handleManualSelect(selectedExample);
  }, [handleManualSelect, selectedExample]);

  const currentExample = travelExamples[selectedExample];
  const currentPoster = currentExample.poster ?? currentExample.images?.[0];

  return (
    <Section ref={sectionRef} id="reigh" className="bg-gradient-to-br from-[#140c22] via-[#181028] to-[#100820] text-white">
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
                  // No autoPlay - let the hook handle all play logic to avoid race conditions
                  {...bindAutoPauseVideo(videoEventHandlers, {
                    onPlay: () => handleVideoStarted(selectedExample),
                  })}
                  onPlaying={() => setShowPoster(false)}
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
