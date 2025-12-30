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
    handleVideoLoadedData,
    handleVideoPlay,
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
    onVideoLoadedData: handleVideoLoadedData,
    onVideoPlay: handleVideoPlay,
    onVideoEnded: handleVideoEnded,
  };

  return (
    <Section ref={sectionRef} className="relative bg-[#0b0b0f]">
      <div className="absolute top-0 left-0 right-0 z-10">
        <Header />
      </div>

      {/* Mobile fullscreen video background */}
      <MobileHeroVideo ref={mobileVideoRef} {...videoProps} />

      <SectionContent className="px-5 md:px-16">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-12 w-full">
          {/* Text Content */}
          <div className="flex flex-col xl:justify-center space-y-4 md:space-y-6 xl:space-y-8 relative z-10 max-w-[34rem] md:max-w-[36rem] xl:max-w-[44rem]">
            <h1 className="text-[2.5rem] md:text-5xl lg:text-6xl xl:text-6xl font-normal leading-[1.08] tracking-tight text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.4)]">
              We're working to help the open source AI art ecosystem thrive
            </h1>

            <p className="text-base md:text-lg lg:text-xl xl:text-2xl text-white leading-relaxed xl:leading-[1.7] max-w-[20rem] md:max-w-none xl:max-w-[38rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
              We're building tools and nurturing a culture to inspire, empower and reward open collaboration and ambition in the AI art ecosystem.
            </p>

            {/* Controls - scroll button + rewind */}
            <div className="flex gap-2">
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
          <DesktopHeroVideo 
            ref={desktopVideoRef} 
            {...videoProps}
          />
        </div>
      </SectionContent>
    </Section>
  );
};

