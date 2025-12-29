import { Header } from '@/components/layout/Header';
import { Section, SectionContent } from '@/components/layout/Section';
import { useHeroVideo } from './useHeroVideo';
import { MobileHeroVideo, DesktopHeroVideo } from './HeroVideo';
import { RewindButton } from './RewindButton';

export const Hero = () => {
  const {
    posterLoaded,
    videoReady,
    showRewindButton,
    isRewinding,
    showThumbsUp,
    isMuted,
    isHovering,
    setPosterLoaded,
    setIsHovering,
    handleVideoCanPlay,
    handleVideoLoadedData,
    handleVideoEnded,
    handleRewind,
    toggleMute,
    scrollToNextSection,
    sectionRef,
    mobileVideoRef,
    desktopVideoRef,
  } = useHeroVideo();

  const videoProps = {
    posterLoaded,
    videoReady,
    isRewinding,
    onPosterLoad: () => setPosterLoaded(true),
    onVideoCanPlay: handleVideoCanPlay,
    onVideoLoadedData: handleVideoLoadedData,
    onVideoEnded: handleVideoEnded,
  };

  return (
    <Section ref={sectionRef} className="relative bg-[#0b0b0f] xl:bg-[#f5f5f3]">
      <div className="absolute top-0 left-0 right-0 z-10">
        <Header />
      </div>

      {/* Mobile fullscreen video background */}
      <MobileHeroVideo ref={mobileVideoRef} {...videoProps} />

      <SectionContent className="px-5 md:px-16">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-12 w-full">
          {/* Text Content */}
          <div className="flex flex-col xl:justify-center space-y-4 md:space-y-6 xl:space-y-8 relative z-10 max-w-[34rem] md:max-w-[36rem] xl:max-w-[34rem]">
            <h1 className="text-[2.5rem] md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-[1.08] tracking-tight text-white xl:text-gray-900 [text-shadow:0_2px_4px_rgba(0,0,0,0.4)] xl:[text-shadow:none]">
              We're working to help the open source AI art ecosystem thrive
            </h1>

            <p className="text-base md:text-lg lg:text-xl xl:text-xl text-white xl:text-gray-600 leading-relaxed max-w-[20rem] md:max-w-none xl:max-w-none [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] xl:[text-shadow:none]">
              We're building tools and nurturing a culture to inspire, empower and reward open collaboration and ambition in the AI art ecosystem.
            </p>

            {/* Mobile/tablet controls */}
            <div className="flex gap-2 xl:hidden">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
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
              <RewindButton
                onClick={handleRewind}
                isRewinding={isRewinding}
                showRewindButton={showRewindButton}
                showThumbsUp={showThumbsUp}
                variant="mobile"
              />
            </div>
          </div>

          {/* Desktop Hero Video */}
          <DesktopHeroVideo 
            ref={desktopVideoRef} 
            {...videoProps}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <RewindButton
              onClick={handleRewind}
              isRewinding={isRewinding}
              showRewindButton={showRewindButton}
              showThumbsUp={showThumbsUp}
              variant="desktop"
              style={{ bottom: '32px', left: '107px' }}
            />
            {/* Mute/Unmute button - appears on hover */}
            <button
              onClick={toggleMute}
              className={`absolute z-10 flex items-center justify-center w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all duration-300 ${
                isHovering && videoReady && !showThumbsUp && !showRewindButton && !isRewinding ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ bottom: '32px', left: '107px' }}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </DesktopHeroVideo>
        </div>
      </SectionContent>
    </Section>
  );
};

