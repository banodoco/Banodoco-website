import { forwardRef } from 'react';
import { HERO_VIDEO_SRC_DESKTOP, HERO_VIDEO_SRC_MOBILE, HERO_POSTER_SRC } from './config';

interface HeroVideoProps {
  posterLoaded: boolean;
  videoReady: boolean;
  isRewinding: boolean;
  onPosterLoad: () => void;
  onVideoCanPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onVideoLoadedData: () => void;
  onVideoPlay: () => void;
  onVideoEnded: () => void;
}

export const MobileHeroVideo = forwardRef<HTMLVideoElement, HeroVideoProps>(
  ({ posterLoaded, videoReady, isRewinding, onPosterLoad, onVideoCanPlay, onVideoLoadedData, onVideoPlay, onVideoEnded }, ref) => (
    <div className="absolute inset-0 xl:hidden overflow-hidden">
      {/* Skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse scale-100" />

      {/* Poster */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        onLoad={onPosterLoad}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-100 ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video - hook handles all play/pause logic via useAutoPauseVideo */}
      <video
        src={HERO_VIDEO_SRC_MOBILE}
        muted
        playsInline
        preload="auto"
        ref={ref}
        onCanPlay={onVideoCanPlay}
        onLoadedData={onVideoLoadedData}
        onPlay={onVideoPlay}
        onEnded={onVideoEnded}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-100 ${
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
  ({ posterLoaded, videoReady, isRewinding, onPosterLoad, onVideoCanPlay, onVideoLoadedData, onVideoPlay, onVideoEnded }, ref) => (
    <div className="hidden xl:block absolute inset-0 overflow-hidden">
      {/* Skeleton */}
      <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse scale-100" />

      {/* Poster */}
      <img
        src={HERO_POSTER_SRC}
        alt=""
        onLoad={onPosterLoad}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-100 ${
          posterLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video - hook handles all play/pause logic via useAutoPauseVideo */}
      <video
        src={HERO_VIDEO_SRC_DESKTOP}
        muted
        playsInline
        preload="auto"
        ref={ref}
        onCanPlay={onVideoCanPlay}
        onLoadedData={onVideoLoadedData}
        onPlay={onVideoPlay}
        onEnded={onVideoEnded}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
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

