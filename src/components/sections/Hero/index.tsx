import { Section } from '@/components/layout/Section';
import { useHeroVideo } from './useHeroVideo';
import { MobileHeroVideo, DesktopHeroVideo } from './HeroVideo';
import { RewindButton } from './RewindButton';
import { ArrowDownIcon } from '@/components/ui/icons';

/**
 * Hero section - the landing/above-the-fold section.
 * 
 * NOTE: This section intentionally does NOT use header offset because:
 * 1. Content should be visually centered in the full viewport
 * 2. Video background extends edge-to-edge
 * 3. Mobile uses pt-16 for safe area, desktop content is naturally centered
 * 
 * This is the only section where full-viewport centering is desired.
 */
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
    sectionRef,
    videoRef,
    isMobileView,
  } = useHeroVideo();

  const scrollToNextSection = () => {
    const nextSection = sectionRef.current?.nextElementSibling;
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <Section ref={sectionRef} id="hero" className="relative bg-[var(--color-bg-base)]">
      {/* Mobile fullscreen video background - only render on mobile to save resources */}
      {isMobileView && <MobileHeroVideo ref={videoRef} {...videoProps} />}

      {/* Hero uses custom layout - no header offset since content should be centered in full viewport */}
      <div className="h-full px-5 md:px-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-12 w-full pt-16 md:pt-0">
          {/* Text Content */}
          <div className="flex flex-col space-y-4 md:space-y-6 xl:space-y-8 relative z-10 max-w-[34rem] md:max-w-[36rem] xl:max-w-[44rem]">
            <h1 className="text-[2.5rem] md:text-5xl lg:text-6xl xl:text-6xl font-normal leading-[1.08] tracking-tight text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.4)]">
              We're working to help the open source AI art ecosystem thrive
            </h1>

            <p className="text-base md:text-lg lg:text-xl xl:text-2xl text-white leading-relaxed xl:leading-[1.7] max-w-[20rem] md:max-w-none xl:max-w-[38rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
              We're building tools and nurturing a culture to inspire, empower and reward open collaboration and ambition in the AI art ecosystem.
            </p>

            {/* Controls - learn more button + rewind */}
            <div className="flex gap-2">
              <button
                onClick={scrollToNextSection}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white/90 text-gray-900 rounded-lg transition-all font-medium"
              >
                <span className="text-sm">Learn more</span>
                <ArrowDownIcon />
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

          {/* Desktop Hero Video - only render on desktop to save resources */}
          {!isMobileView && (
            <DesktopHeroVideo 
              ref={videoRef} 
              {...videoProps}
            />
          )}
          </div>
        </div>
      </div>
    </Section>
  );
};

