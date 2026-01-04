import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HERO_VIDEO_SRC_DESKTOP, HERO_POSTER_SRC } from '@/components/sections/Hero/config';
import { sections } from './sections';
import { SectionRenderer } from './SectionRenderer';

// =============================================================================
// Scroll-driven Video Background
// =============================================================================
const ScrollVideo = ({ 
  videoRef, 
  posterLoaded, 
  videoReady,
  onPosterLoad,
  onVideoCanPlayThrough,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  posterLoaded: boolean;
  videoReady: boolean;
  onPosterLoad: () => void;
  onVideoCanPlayThrough: () => void;
}) => (
  <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
    {/* Skeleton */}
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 animate-pulse scale-[1.3]" />

    {/* Poster */}
    <img
      src={HERO_POSTER_SRC}
      alt=""
      onLoad={onPosterLoad}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
        posterLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    />

    {/* Video - controlled by scroll. preload="auto" ensures video is buffered for seeking */}
    <video
      ref={videoRef}
      src={HERO_VIDEO_SRC_DESKTOP}
      muted
      playsInline
      preload="auto"
      onCanPlayThrough={onVideoCanPlayThrough}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-[1.3] ${
        videoReady ? 'opacity-100' : 'opacity-0'
      }`}
    />

    {/* Dark overlay for text readability */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
  </div>
);

// =============================================================================
// Main Page Component
// =============================================================================
export const SecondRenaissance = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoDurationRef = useRef<number>(0);
  const videoInitializedRef = useRef(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Get the scroll container (parent div with overflow-y-auto)
  const getScrollContainer = useCallback(() => {
    return containerRef.current?.parentElement;
  }, []);

  // Scroll-driven video playback
  const updateVideoTime = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    const scrollContainer = getScrollContainer();
    const duration = videoDurationRef.current;
    
    if (!video || !container || !scrollContainer || !duration) return;
    
    // Check if video is ready to seek (readyState >= 2 means HAVE_CURRENT_DATA)
    if (video.readyState < 2) return;

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const scrollProgress = Math.max(0, Math.min(1, scrollTop / Math.max(scrollHeight, 1)));
    
    // Map scroll progress to video time
    const targetTime = scrollProgress * duration;
    
    // Only update if there's a meaningful difference to avoid excessive seeking
    if (Math.abs(video.currentTime - targetTime) > 0.05) {
      try {
        video.currentTime = targetTime;
      } catch {
        // Seeking might fail if video isn't ready, ignore
      }
    }
  }, [getScrollContainer]);

  const handleScroll = useCallback(() => {
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    // Schedule update on next animation frame for smooth performance
    rafRef.current = requestAnimationFrame(updateVideoTime);
  }, [updateVideoTime]);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll, getScrollContainer]);

  // Initialize video when it's ready enough to seek
  const initializeVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || videoInitializedRef.current) return;
    
    // Check if we have duration and enough data
    if (video.duration && !isNaN(video.duration) && video.duration > 0 && video.readyState >= 2) {
      videoInitializedRef.current = true;
      videoDurationRef.current = video.duration;
      setVideoReady(true);
      // Pause the video - we control it via scroll
      video.pause();
      // Set initial position based on current scroll
      updateVideoTime();
    }
  }, [updateVideoTime]);

  // Try to initialize on multiple events for reliability
  const handleVideoCanPlayThrough = useCallback(() => {
    initializeVideo();
  }, [initializeVideo]);

  // Also force load the video on mount and poll for readiness
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Force the video to start loading
    video.load();
    
    // Poll for video readiness as a fallback
    const checkReady = () => {
      if (videoInitializedRef.current) return;
      initializeVideo();
    };
    
    // Check periodically until ready
    const interval = setInterval(checkReady, 100);
    
    // Also listen for multiple events
    video.addEventListener('loadeddata', initializeVideo);
    video.addEventListener('canplay', initializeVideo);
    
    return () => {
      clearInterval(interval);
      video.removeEventListener('loadeddata', initializeVideo);
      video.removeEventListener('canplay', initializeVideo);
    };
  }, [initializeVideo]);

  return (
    <div ref={containerRef} className="relative">
      <ScrollVideo
        videoRef={videoRef}
        posterLoaded={posterLoaded}
        videoReady={videoReady}
        onPosterLoad={() => setPosterLoaded(true)}
        onVideoCanPlayThrough={handleVideoCanPlayThrough}
      />

      {/* Back navigation */}
      <Link 
        to="/" 
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg transition-all text-white/90 hover:text-white border border-white/10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </Link>

      {/* Render all sections dynamically */}
      <div className="relative z-10">
        {sections.map((section, index) => (
          <SectionRenderer 
            key={section.id} 
            section={section} 
            sectionNumber={index + 1} 
          />
        ))}
      </div>
    </div>
  );
};

export default SecondRenaissance;


