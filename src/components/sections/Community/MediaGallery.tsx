import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Constants for timing
const IMAGE_DISPLAY_DURATION = 5000; // 5 seconds for images

interface MediaGalleryProps {
  urls: string[];
  isVisible: boolean;
  compact?: boolean;
}

export const MediaGallery = ({ urls, isVisible, compact = false }: MediaGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const urlsLengthRef = useRef(urls.length);
  const isVisibleRef = useRef(isVisible);
  const lastProgressUpdateRef = useRef(0);
  
  // Keep refs in sync
  selectedIndexRef.current = selectedIndex;
  urlsLengthRef.current = urls.length;
  isVisibleRef.current = isVisible;
  
  if (urls.length === 0) return null;
  
  const currentUrl = urls[selectedIndex];
  const isVideo = !!currentUrl.match(/\.(mp4|webm|mov)(\?|$)/i);

  // Clear any image timer
  const clearImageTimer = useCallback(() => {
    if (imageTimerRef.current) {
      clearInterval(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }, []);

  // Advance to next item
  const advanceToNext = useCallback(() => {
    if (urlsLengthRef.current > 1 && isVisibleRef.current) {
      const nextIdx = (selectedIndexRef.current + 1) % urlsLengthRef.current;
      setSelectedIndex(nextIdx);
      setProgress(0);
    }
  }, []);

  // Start image timer for auto-advance
  const startImageTimer = useCallback(() => {
    clearImageTimer();
    const startTime = Date.now();
    setProgress(0);
    setIsPlaying(true);
    
    imageTimerRef.current = setInterval(() => {
      if (!isVisibleRef.current) {
        clearImageTimer();
        setIsPlaying(false);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / IMAGE_DISPLAY_DURATION) * 100;
      
      if (newProgress >= 100) {
        clearImageTimer();
        setProgress(100);
        advanceToNext();
      } else {
        setProgress(newProgress);
      }
    }, 150); // Update every 150ms (~7fps) for smooth but efficient progress
  }, [clearImageTimer, advanceToNext]);

  // Handle video time update - throttled
  const handleVideoTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 250) return; // Throttle to 4fps
    lastProgressUpdateRef.current = now;
    
    const video = e.currentTarget;
    if (video && video.duration) {
      const newProgress = (video.currentTime / video.duration) * 100;
      setProgress(newProgress);
    }
  }, []);

  // Handle video ended - auto-advance
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    advanceToNext();
  }, [advanceToNext]);

  // Handle video started
  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Handle manual selection
  const handleSelect = useCallback((idx: number) => {
    clearImageTimer();
    setProgress(0);
    setIsPlaying(true);
    setSelectedIndex(idx);
  }, [clearImageTimer]);

  // Handle visibility changes - pause/play
  useEffect(() => {
    const video = videoRef.current;
    
    if (isVisible) {
      // Start playing
      const url = urls[selectedIndex];
      const isVid = !!url?.match(/\.(mp4|webm|mov)(\?|$)/i);
      
      if (!isVid) {
        startImageTimer();
      } else if (video) {
        video.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      // Pause everything
      clearImageTimer();
      if (video) {
        video.pause();
      }
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Effect to handle media type changes - only runs when selectedIndex changes
  useEffect(() => {
    if (!isVisible) return;
    
    const url = urls[selectedIndex];
    const isVid = !!url?.match(/\.(mp4|webm|mov)(\?|$)/i);
    
    if (!isVid) {
      // Start image timer
      startImageTimer();
    } else {
      // Clear image timer, video handles itself via autoPlay
      clearImageTimer();
      setProgress(0);
      setIsPlaying(true);
    }
    
    return () => clearImageTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2 md:space-y-3"}>
      {/* Main display */}
      <div className={cn(
        "relative rounded-lg overflow-hidden bg-black/20",
        compact ? "aspect-square" : "aspect-video"
      )}>
        {isVideo ? (
          <video 
            ref={videoRef}
            key={currentUrl}
            src={currentUrl}
            className="w-full h-full object-cover"
            autoPlay={isVisible}
            muted
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onPlay={handleVideoPlay}
          />
        ) : (
          <img 
            key={currentUrl}
            src={currentUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        {/* Progress indicator for compact mode */}
        {compact && urls.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Thumbnail selector with progress - hidden in compact mode */}
      {!compact && urls.length > 1 && (
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto py-1 px-0.5 -mx-0.5">
          {urls.map((url, idx) => {
            const isVid = url.match(/\.(mp4|webm|mov)(\?|$)/i);
            const isSelected = idx === selectedIndex;
            
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={cn(
                  "relative shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-md overflow-hidden transition-all",
                  isSelected 
                    ? "ring-2 ring-emerald-400" 
                    : "ring-1 ring-white/10 hover:ring-white/30"
                )}
              >
                {/* Progress fill for selected item */}
                {isSelected && isPlaying && (
                  <div
                    className="absolute inset-0 bg-emerald-500/30 z-10"
                    style={{
                      clipPath: `inset(0 ${100 - progress}% 0 0)`,
                      transition: 'clip-path 100ms linear',
                    }}
                  />
                )}
                
                {/* Thumbnail content */}
                {isVid ? (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                ) : (
                  <img 
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Compact mode: dot indicators */}
      {compact && urls.length > 1 && (
        <div className="flex justify-center gap-1">
          {urls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                idx === selectedIndex 
                  ? "bg-emerald-400" 
                  : "bg-white/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};


