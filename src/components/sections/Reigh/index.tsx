import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { TravelSelector } from './TravelSelector';
import { useTravelAutoAdvance } from './useTravelAutoAdvance';
import { travelExamples } from './data';
import { Section, SectionContent } from '@/components/layout/Section';
import { useSectionRuntime } from '@/lib/useSectionRuntime';
import { useAutoPauseVideo } from '@/lib/useAutoPauseVideo';
import { useVideoPreloadOnVisible, useImagePreloadOnVisible } from '@/lib/useViewportPreload';
import { bindAutoPauseVideo } from '@/lib/bindAutoPauseVideo';
import { PlayIcon, ExternalLinkIcon } from '@/components/ui/icons';
import { NameHighlight, MeaningHighlight } from '@/components/ui/TextHighlight';

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

  // Preload video posters first (priority), then example images (delayed)
  const videoPosterUrls = useMemo(() => 
    travelExamples.map((e) => e.poster).filter(Boolean) as string[], 
  []);
  const exampleImageUrls = useMemo(() => 
    travelExamples.flatMap((e) => e.images ?? []),
  []);
  useImagePreloadOnVisible(videoPosterUrls, isActive, { priority: true });
  useImagePreloadOnVisible(exampleImageUrls, isActive, { priority: false });

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
    isActive: isFullyVisible,
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
    <Section 
      ref={sectionRef} 
      id="reigh" 
      className="text-white"
      videoOverlay="rgba(12, 26, 20, 0.85)"
    >
      <SectionContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            {/* Left side - Video showcase */}
            <div className="order-2 lg:order-1 flex flex-col">
              <div className="relative rounded-xl overflow-hidden bg-black h-[35svh] md:h-[36svh] lg:h-[60svh] flex items-center justify-center">
                {/* Blurred background video - stretched to fill empty edges */}
                <div className="absolute inset-0 z-0">
                  {/* 
                   * iOS Safari can be very flaky with autoplay when multiple <video> elements
                   * are present/attempted to play simultaneously. Use a blurred poster image
                   * instead of a second background video to keep autoplay reliable.
                   */}
                  {currentPoster && (
                    <img
                      src={currentPoster}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg opacity-50"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                  )}
                  {/* Subtle vignette overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
                </div>

                {/* Poster fallback (separate element so we can fade video in without hiding poster) */}
                {currentPoster && showPoster && (
                  <img
                    src={currentPoster}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain z-[5]"
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                )}
                
                {/* Loading spinner - shows when trying to play but video hasn't started yet */}
                {isFullyVisible && showPoster && !autoAdvance.videoEnded.has(selectedExample) && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                  </div>
                )}

                <video
                  key={currentExample.video}
                  ref={videoRef}
                  src={currentExample.video}
                  poster={currentPoster}
                  preload="metadata"
                  muted
                  playsInline
                  // No autoPlay - let the hook handle all play logic to avoid race conditions
                  {...bindAutoPauseVideo(videoEventHandlers, {
                    onPlay: () => handleVideoStarted(selectedExample),
                  })}
                  onPlaying={() => {
                    setShowPoster(false);
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    onVideoTimeUpdate(selectedExample, video.currentTime, video.duration, selectedExample);
                  }}
                  onEnded={() => {
                    onVideoEnded(selectedExample);
                  }}
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
                    <PlayIcon className="w-8 h-8 text-white ml-1" />
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
              <h2 className="text-xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.15] mb-4 md:mb-6">
                <NameHighlight color="emerald">Reigh</NameHighlight> is an open source art tool for <MeaningHighlight color="emerald">travelling between images</MeaningHighlight>
              </h2>
              <p className="text-sm md:text-lg text-white/60 leading-relaxed mb-4 md:mb-6">
                We believe that there's an artform waiting to be discovered in the AI-powered journey from one image to another.
              </p>
              <a 
                href="https://reigh.art/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
              >
                Join pre-beta
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
      </SectionContent>
    </Section>
  );
};
