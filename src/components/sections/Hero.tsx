import { useRef, useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Section, SectionContent } from '@/components/layout/Section';
import { useSectionVisibility } from '@/lib/useSectionVisibility';

// Desktop-only styles with clip path and masks
const desktopMediaStyles = {
  clipPath: 'inset(13px 67px 13px 74px round 8px)',
  maskImage: `
    linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent),
    linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)
  `,
  maskComposite: 'intersect' as const,
  WebkitMaskImage: `
    linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent),
    linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)
  `,
  WebkitMaskComposite: 'source-in' as const,
};

export const Hero = () => {
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showRewindButton, setShowRewindButton] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const animationRef = useRef<number | null>(null);
  const rewindAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Track section visibility to pause/resume video
  const { ref: sectionRef, isVisible } = useSectionVisibility();
  
  // Pause video when scrolled away, resume when scrolled back
  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video || !videoReady) return;
    
    if (isVisible) {
      // Don't auto-resume into special UI states (rewind button showing, rewinding, or thumbs up)
      if (isRewinding || showRewindButton || showThumbsUp) return;
      video.play().catch(() => {});
    } else {
      video.pause();
      // Stop any ongoing rewind animation/audio
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (rewindAudioRef.current) {
        rewindAudioRef.current.pause();
        rewindAudioRef.current = null;
      }
    }
  }, [isVisible, videoReady, isRewinding, showRewindButton, showThumbsUp]);

  const toggleMute = () => {
    const video = activeVideoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVideoCanPlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    activeVideoRef.current = e.currentTarget;
    e.currentTarget.playbackRate = 0.75;
    setIsMuted(e.currentTarget.muted);
    setVideoReady(true);
  };

  const handleVideoEnded = () => {
    setShowRewindButton(true);
  };

  const handleRewind = useCallback(() => {
    const video = activeVideoRef.current;
    if (!video || isRewinding) return;

    setIsRewinding(true);
    setShowRewindButton(false);
    video.pause();

    // Play rewind sound if not muted
    if (!isMuted) {
      rewindAudioRef.current = new Audio('/Rewind Sound Effect.mp3');
      rewindAudioRef.current.play();
    }

    const rewindDuration = 5000; // 5 seconds
    const startTime = performance.now();
    const startVideoTime = video.currentTime;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / rewindDuration, 1);
      
      // Ease out for smoother ending
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      video.currentTime = startVideoTime * (1 - easedProgress);

      if (progress >= 1) {
        // Done rewinding, stop audio and show thumbs up
        video.currentTime = 0;
        if (rewindAudioRef.current) {
          rewindAudioRef.current.pause();
          rewindAudioRef.current = null;
        }
        setIsRewinding(false);
        setShowThumbsUp(true);
        animationRef.current = null;
        
        setTimeout(() => {
          setShowThumbsUp(false);
          video.playbackRate = 0.75;
          video.play();
        }, 1000);
      } else {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [isRewinding, isMuted]);

  const scrollToNextSection = useCallback(() => {
    // Find the next section after the hero
    const hero = document.querySelector('section');
    const nextSection = hero?.nextElementSibling;
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <Section ref={sectionRef} className="relative">
      <div className="absolute top-0 left-0 right-0 z-10">
        <Header />
      </div>

      {/* Mobile fullscreen video background */}
      <div className="absolute inset-0 xl:hidden overflow-hidden">
        {/* Skeleton */}
        <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse scale-[1.2] md:scale-[1.3]" />
        
        {/* Poster */}
        <img
          src="/upscaled-poster.jpg"
          alt=""
          onLoad={() => setPosterLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.2] md:scale-[1.3] ${
            posterLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        
        {/* Video */}
        <video
          src="/upscaled_new.mp4"
          autoPlay
          muted
          playsInline
          onCanPlay={handleVideoCanPlay}
          onEnded={handleVideoEnded}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.2] md:scale-[1.3] ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Dark overlay during rewind */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            isRewinding ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      </div>

      {/* Match the header's horizontal padding so the logo and hero copy line up. */}
      <SectionContent className="px-5 md:px-16">
        {/* Vertically center the two columns relative to each other. */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-12 items-center w-full">
        {/* Text Content - white on mobile/tablet, dark on desktop */}
        <div className="space-y-4 md:space-y-6 xl:space-y-8 relative z-10 max-w-[34rem] md:max-w-[36rem] xl:max-w-[34rem]">
          <h1 className="text-[2.5rem] md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-[1.08] tracking-tight text-white xl:text-gray-900 [text-shadow:0_2px_4px_rgba(0,0,0,0.4)] xl:[text-shadow:none]">
            We're working to help the open source AI art ecosystem thrive
          </h1>
          
          <p className="text-base md:text-lg lg:text-xl xl:text-xl text-white xl:text-gray-600 leading-relaxed max-w-[20rem] md:max-w-none xl:max-w-none [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] xl:[text-shadow:none]">
            We're building tools and nurturing a culture to inspire, empower and reward open collaboration in the AI and digital art ecosystem.
          </p>

          {/* Mobile/tablet controls */}
          <div className="flex gap-2 xl:hidden">
            {/* Scroll button - always visible (primary style) */}
            <button
              onClick={scrollToNextSection}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white/90 text-gray-900 rounded-lg transition-all font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm">Scroll</span>
            </button>
            {/* Mute button - shows during normal playback */}
            {!showRewindButton && !isRewinding && !showThumbsUp && (
              <button
                onClick={toggleMute}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-all"
              >
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
                <span className="text-sm font-medium">
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </button>
            )}
            {/* Rewind button - shows when video ends */}
            {(showRewindButton || isRewinding) && (
              <button
                onClick={handleRewind}
                disabled={isRewinding}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-all"
              >
                <svg 
                  className={`w-5 h-5 ${isRewinding ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {isRewinding ? 'Rewinding...' : 'Rewind'}
                </span>
              </button>
            )}
            {showThumbsUp && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg backdrop-blur-sm">
                <span className="text-xl">👍</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Hero Video - hidden on mobile/tablet */}
        <div className="hidden xl:flex justify-end -mr-8 -ml-32">
          <div 
            className="relative w-[125%] max-w-[400px] sm:max-w-2xl md:max-w-4xl xl:max-w-none"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Skeleton - always present as base layer */}
            <div 
              className="w-full aspect-[1792/992] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse"
              style={desktopMediaStyles}
            />
            
            {/* Poster image - fades in when loaded */}
            <img
              src="/upscaled-poster.jpg"
              alt=""
              onLoad={() => setPosterLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                posterLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={desktopMediaStyles}
            />
            
            {/* Video - fades in when ready to play */}
            <video
              src="/upscaled_new.mp4"
              autoPlay
              muted
              playsInline
              onCanPlay={handleVideoCanPlay}
              onEnded={handleVideoEnded}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                videoReady ? 'opacity-100' : 'opacity-0'
              }`}
              style={desktopMediaStyles}
            />

            {/* Dark overlay during rewind */}
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
                isRewinding ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={desktopMediaStyles}
            />

            {/* Rewind button - appears when video ends */}
            <button
              onClick={handleRewind}
              disabled={isRewinding}
              className={`absolute z-10 flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all duration-300 ${
                showRewindButton || isRewinding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              style={{ bottom: '24px', left: '86px' }}
            >
              <svg 
                className={`w-5 h-5 ${isRewinding ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                />
              </svg>
              <span className="text-sm font-medium">
                {isRewinding ? 'Rewinding...' : 'Rewind'}
              </span>
            </button>

            {/* Thumbs up - shows briefly after rewind completes */}
            <div
              className={`absolute z-10 flex items-center gap-2 px-3 py-2 bg-black/60 text-white rounded-lg backdrop-blur-sm transition-all duration-300 ${
                showThumbsUp ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
              }`}
              style={{ bottom: '24px', left: '86px' }}
            >
              <span className="text-xl">👍</span>
            </div>

            {/* Mute/Unmute button - appears on hover */}
            <button
              onClick={toggleMute}
              className={`absolute z-10 flex items-center justify-center w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all duration-300 ${
                isHovering && videoReady && !showThumbsUp && !showRewindButton && !isRewinding ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ bottom: '24px', left: '86px' }}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        </div>
      </SectionContent>
    </Section>
  );
};
