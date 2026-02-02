
import React, { forwardRef, useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { TopGeneration } from '../types';

interface ArticleCardProps {
  month: string;
  generations: TopGeneration[];
  variant: 'mobile' | 'desktop';
  scrollRoot?: HTMLElement | null;
  isActive?: boolean;
  fullWidth?: boolean;
  snapToCenter?: boolean;
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const LightboxModal: React.FC<{ gen: TopGeneration; onClose: () => void }> = ({ gen, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Close button - top right corner */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="max-w-5xl w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="w-full flex items-center justify-center">
          {gen.mediaType === 'video' ? (
            <video
              src={gen.mediaUrl}
              className="max-w-full max-h-[75vh] rounded-lg"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={gen.mediaUrl}
              alt={gen.content || 'Community generation'}
              className="max-w-full max-h-[75vh] rounded-lg object-contain"
            />
          )}
        </div>

        {/* Info bar below media */}
        <div className="mt-4 flex items-center gap-3 text-white/80">
          {gen.avatarUrl ? (
            <img src={gen.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center text-sm font-bold text-white">
              {gen.author.charAt(0)}
            </div>
          )}
          <span className="font-medium">@{gen.author}</span>
          <span className="text-white/40">#{gen.channel.replace('#', '')}</span>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const ArticleCard = forwardRef<HTMLDivElement, ArticleCardProps>(
  ({ month, generations, variant, scrollRoot, isActive = false, fullWidth = false, snapToCenter = false }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(0);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [mediaLoaded, setMediaLoaded] = useState(false);

    const featured = generations[featuredIndex];
    const isDesktop = variant === 'desktop';

    // Track if card is centered enough to play video (>50% visible in center of viewport)
    const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

    // IntersectionObserver — track visibility for lazy loading AND video playback
    useEffect(() => {
      const node = internalRef.current;
      if (!node) return;

      // Use a high threshold - card must be >60% visible to play
      const observer = new IntersectionObserver(
        ([entry]) => {
          const dominated = entry.intersectionRatio > 0.6;
          console.log(`[VideoDebug][${month}][${variant}] ratio: ${entry.intersectionRatio.toFixed(2)}, shouldPlay: ${dominated}`);
          setShouldPlayVideo(dominated);

          // Also set isVisible for lazy loading images (one-time, lower threshold)
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        },
        {
          root: scrollRoot || null,
          rootMargin: '0px',
          threshold: [0, 0.1, 0.3, 0.5, 0.6, 0.7, 0.9, 1.0]
        }
      );
      observer.observe(node);
      return () => observer.disconnect();
    }, [scrollRoot, month]);

    // Reset video state only when switching to a different featured item
    useEffect(() => {
      setProgress(0);
      setMediaLoaded(false);
    }, [featuredIndex]);


    // Log video mount/unmount
    useEffect(() => {
      if (featured?.mediaType === 'video') {
        if (shouldPlayVideo) {
          console.log(`[VideoDebug][${month}][${variant}] Video MOUNTED`);
        } else {
          console.log(`[VideoDebug][${month}][${variant}] Video UNMOUNTED`);
        }
      }
    }, [shouldPlayVideo, featured?.mediaType, month, variant]);

    const handleTimeUpdate = useCallback(() => {
      const video = videoRef.current;
      if (video && video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    }, []);

    const handleMediaClick = useCallback(() => {
      setLightboxOpen(true);
    }, []);

    if (!featured) return null;

    const activeClasses = isActive
      ? 'border-white/30 bg-white/10'
      : 'border-white/10';

    const fullWidthClasses = fullWidth
      ? 'w-[85vw] md:w-[65vw] lg:w-[50vw] shrink-0 snap-center'
      : '';

    const snapClasses = snapToCenter ? 'snap-center' : '';

    return (
      <div
        ref={(el) => {
          (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className={`bg-white/5 backdrop-blur-md rounded-xl md:rounded-2xl overflow-hidden border transition-colors duration-500 hover:border-white/20 h-full flex flex-col ${activeClasses} ${fullWidthClasses} ${snapClasses}`}
      >
        {/* Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-white/10">
          <span className="text-sm font-semibold text-white">{formatMonth(month)}</span>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 flex-1">
          <div className={isDesktop ? 'grid grid-cols-2 gap-6' : ''}>
            {/* Info column (desktop only) */}
            {isDesktop && (
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  {featured.avatarUrl ? (
                    <img src={featured.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-cyan-500/30 flex items-center justify-center text-[9px] font-bold text-white">
                      {String(featured.author).charAt(0)}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium truncate">{featured.author}</span>
                </div>
                {featured.content && (
                  <p className="text-sm text-white/60 leading-relaxed mb-4 line-clamp-4">
                    {featured.content}
                  </p>
                )}
                <div className="text-xs text-white/30">
                  #{featured.channel.replace('#', '')} &middot; {new Date(featured.created_at).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Media column */}
            <div
              className={`relative rounded-lg overflow-hidden bg-white/5 ${isDesktop ? 'aspect-square' : 'aspect-video'} group cursor-pointer`}
              onClick={handleMediaClick}
            >
              {/* Loading spinner - hidden when media loads */}
              <div
                className={`absolute inset-0 flex items-center justify-center bg-white/5 z-0 transition-opacity duration-300 ${
                  mediaLoaded ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
              </div>

              {featured.mediaType === 'video' ? (
                // Only render video when active - unmount completely otherwise
                shouldPlayVideo ? (
                  <video
                    ref={videoRef}
                    src={featured.mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedData={() => setMediaLoaded(true)}
                    className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ${
                      mediaLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ) : (
                  // Placeholder when not active
                  <div className="relative z-10 w-full h-full bg-white/5 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )
              ) : (
                <img
                  src={isVisible ? featured.mediaUrl : undefined}
                  alt={featured.content || 'Community generation'}
                  onLoad={() => setMediaLoaded(true)}
                  className={`relative z-10 w-full h-full object-cover hover:scale-105 transition-all duration-700 ${
                    mediaLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              {/* Mobile overlay — author info */}
              {!isDesktop && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 z-20">
                  <div className="flex items-center gap-2">
                    {featured.avatarUrl ? (
                      <img src={featured.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-white">
                        {String(featured.author).charAt(0)}
                      </div>
                    )}
                    <span className="text-white text-xs font-medium truncate">{featured.author}</span>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {featured.mediaType === 'video' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Media type badge */}
              {featured.mediaType === 'video' && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white z-20">
                  VIDEO
                </div>
              )}

              {/* Hover overlay with play button */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          {generations.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1 -mx-1 mt-4">
              {generations.map((gen, i) => (
                <button
                  key={gen.message_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeaturedIndex(i);
                  }}
                  className={`relative shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden transition-all ${
                    i === featuredIndex
                      ? 'ring-2 ring-emerald-400'
                      : 'ring-1 ring-white/10 hover:ring-emerald-400/50'
                  }`}
                >
                  {/* Profile picture as background */}
                  {gen.avatarUrl ? (
                    <img src={gen.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-cyan-500/30 flex items-center justify-center text-sm md:text-base font-bold text-white">
                      {gen.author.charAt(0)}
                    </div>
                  )}
                  {/* Play button overlay for videos */}
                  {gen.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxOpen && (
            <LightboxModal gen={featured} onClose={() => setLightboxOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ArticleCard.displayName = 'ArticleCard';

export default ArticleCard;
