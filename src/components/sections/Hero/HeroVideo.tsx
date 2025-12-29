import { forwardRef } from 'react';
import { desktopMediaStyles, HERO_VIDEO_SRC_DESKTOP, HERO_VIDEO_SRC_MOBILE, HERO_POSTER_SRC } from './config';

interface HeroVideoProps {
  posterLoaded: boolean;
  videoReady: boolean;
  isRewinding: boolean;
  onPosterLoad: () => void;
  onVideoCanPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onVideoEnded: (videoEl: HTMLVideoElement) => void;
}

export const MobileHeroVideo = forwardRef<HTMLVideoElement, HeroVideoProps>(
  ({ posterLoaded, videoReady, isRewinding, onPosterLoad, onVideoCanPlay, onVideoEnded }, ref) => (
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

      {/* Video */}
      <video
        src={HERO_VIDEO_SRC_MOBILE}
        autoPlay
        muted
        playsInline
        ref={ref}
        onCanPlay={onVideoCanPlay}
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

interface DesktopHeroVideoProps extends HeroVideoProps {
  children?: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const DesktopHeroVideo = forwardRef<HTMLVideoElement, DesktopHeroVideoProps>(
  ({ posterLoaded, videoReady, isRewinding, onPosterLoad, onVideoCanPlay, onVideoEnded, children, onMouseEnter, onMouseLeave }, ref) => (
    <div className="hidden xl:flex justify-end -mr-8 -ml-32">
      <div 
        className="relative w-[125%] max-w-[400px] sm:max-w-2xl md:max-w-4xl xl:max-w-none"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Skeleton */}
        <div
          className="w-full aspect-[1792/992] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse"
          style={desktopMediaStyles}
        />

        {/* Poster */}
        <img
          src={HERO_POSTER_SRC}
          alt=""
          onLoad={onPosterLoad}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            posterLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={desktopMediaStyles}
        />

        {/* Video */}
        <video
          src={HERO_VIDEO_SRC_DESKTOP}
          autoPlay
          muted
          playsInline
          ref={ref}
          onCanPlay={onVideoCanPlay}
          onEnded={(e) => onVideoEnded(e.currentTarget)}
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

        {/* Rewind button / thumbs up injected here */}
        {children}
      </div>
    </div>
  )
);

DesktopHeroVideo.displayName = 'DesktopHeroVideo';

