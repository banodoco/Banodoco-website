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
    setPosterLoaded,
    handleVideoCanPlay,
    handleVideoEnded,
    handleRewind,
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
    onVideoEnded: handleVideoEnded,
  };

  return (
    <Section ref={sectionRef} className="relative">
      <div className="absolute top-0 left-0 right-0 z-10">
        <Header />
      </div>

      {/* Mobile fullscreen video background */}
      <MobileHeroVideo ref={mobileVideoRef} {...videoProps} />

      <SectionContent className="px-5 md:px-16">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-12 items-center w-full">
          {/* Text Content */}
          <div className="space-y-4 md:space-y-6 xl:space-y-8 relative z-10 max-w-[34rem] md:max-w-[36rem] xl:max-w-[34rem]">
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
          <DesktopHeroVideo ref={desktopVideoRef} {...videoProps}>
            <RewindButton
              onClick={handleRewind}
              isRewinding={isRewinding}
              showRewindButton={showRewindButton}
              showThumbsUp={showThumbsUp}
              variant="desktop"
              style={{ bottom: '24px', left: '110px' }}
            />
          </DesktopHeroVideo>
        </div>
      </SectionContent>
    </Section>
  );
};

