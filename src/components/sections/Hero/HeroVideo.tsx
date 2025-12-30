import { forwardRef } from 'react';
import { HERO_VIDEO_SRC_DESKTOP, HERO_VIDEO_SRC_MOBILE, HERO_POSTER_SRC } from './config';

interface HeroVideoProps {
  posterLoaded: boolean;
  videoReady: boolean;
  isRewinding: boolean;
  onPosterLoad: () => void;
  onVideoCanPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onVideoLoadedData: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onVideoEnded: (videoEl: HTMLVideoElement) => void;
}

export const MobileHeroVideo = forwardRef<HTMLVideoElement, HeroVideoProps>(
  ({ posterLoaded, videoReady, isRewinding, onPosterLoad, onVideoCanPlay, onVideoLoadedData, onVideoEnded }, ref) => (
    <div className="absolute inset-0 xl:hidden overflow-hidden">
      {/* Skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse scale-[1.6] md:scale-[1.3]" />

      {/* Poster */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        onLoad={onPosterLoad}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.6] md:scale-[1.3] ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video - autoPlay for immediate start on page load, hook provides retry fallback */}
      <video
        src={HERO_VIDEO_SRC_MOBILE}
        autoPlay
        muted
        playsInline
        preload="auto"
        ref={ref}
        onCanPlay={onVideoCanPlay}
        onLoadedData={onVideoLoadedData}
        onEnded={(e) => onVideoEnded(e.currentTarget)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.6] md:scale-[1.3] ${
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
  )
);

MobileHeroVideo.displayName = 'MobileHeroVideo';

export const DesktopHeroVideo = forwardRef<HTMLVideoElement, HeroVideoProps>(
  ({ posterLoaded, videoReady, isRewinding, onPosterLoad, onVideoCanPlay, onVideoLoadedData, onVideoEnded }, ref) => (
    <div className="hidden xl:block absolute inset-0 overflow-hidden">
      {/* Skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse scale-[1.3]" />

      {/* Poster */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        onLoad={onPosterLoad}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video - autoPlay for immediate start on page load, hook provides retry fallback */}
      <video
        src={HERO_VIDEO_SRC_DESKTOP}
        autoPlay
        muted
        playsInline
        preload="auto"
        ref={ref}
        onCanPlay={onVideoCanPlay}
        onLoadedData={onVideoLoadedData}
        onEnded={(e) => onVideoEnded(e.currentTarget)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
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
  )
);

DesktopHeroVideo.displayName = 'DesktopHeroVideo';

