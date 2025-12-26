import { useState, useRef, useCallback, useEffect } from 'react';
import { FLICKER_INTERVAL, MOBILE_FLICKER_COUNT } from './config';
import { getRandomPastelColor } from './utils';

interface ProfileImageProps {
  initialPic: string;
  allPics: string[];
  usedPicsRef: React.MutableRefObject<Set<string>>;
  onSwap: (oldPic: string, newPic: string) => void;
}

export const ProfileImage = ({ 
  initialPic, 
  allPics, 
  usedPicsRef,
  onSwap
}: ProfileImageProps) => {
  const [currentPic, setCurrentPic] = useState(initialPic);
  const [hasError, setHasError] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const fallbackColor = useRef(getRandomPastelColor());
  const flickerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flickerCountRef = useRef(0);
  const originalPicRef = useRef(initialPic);
  const isTouchRef = useRef(false);

  const stopFlickering = useCallback(() => {
    if (flickerIntervalRef.current) {
      clearInterval(flickerIntervalRef.current);
      flickerIntervalRef.current = null;
    }
  }, []);

  const getRandomUnusedPic = useCallback((excludePic: string) => {
    const availablePics = allPics.filter(pic => !usedPicsRef.current.has(pic) || pic === excludePic);
    if (availablePics.length > 1) {
      const otherPics = availablePics.filter(pic => pic !== excludePic);
      return otherPics[Math.floor(Math.random() * otherPics.length)];
    }
    return allPics[Math.floor(Math.random() * allPics.length)];
  }, [allPics, usedPicsRef]);

  const settleOnFinalPic = useCallback(() => {
    stopFlickering();
    setIsActive(false);
    const finalPic = getRandomUnusedPic(originalPicRef.current);
    onSwap(originalPicRef.current, finalPic);
    setCurrentPic(finalPic);
    originalPicRef.current = finalPic;
  }, [getRandomUnusedPic, onSwap, stopFlickering]);

  // Desktop hover handlers
  const handleMouseEnter = useCallback(() => {
    if (isTouchRef.current) return;
    
    setIsActive(true);
    originalPicRef.current = currentPic;
    
    const firstFlickerPic = allPics[Math.floor(Math.random() * allPics.length)];
    setCurrentPic(firstFlickerPic);
    
    flickerIntervalRef.current = setInterval(() => {
      const flickerPic = allPics[Math.floor(Math.random() * allPics.length)];
      setCurrentPic(flickerPic);
    }, FLICKER_INTERVAL);
  }, [currentPic, allPics]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchRef.current) return;
    settleOnFinalPic();
  }, [settleOnFinalPic]);

  // Mobile tap handler - quick scramble then settle
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    isTouchRef.current = true;
    
    if (flickerIntervalRef.current) return;
    
    setIsActive(true);
    originalPicRef.current = currentPic;
    flickerCountRef.current = 0;
    
    flickerIntervalRef.current = setInterval(() => {
      flickerCountRef.current++;
      const flickerPic = allPics[Math.floor(Math.random() * allPics.length)];
      setCurrentPic(flickerPic);
      
      if (flickerCountRef.current >= MOBILE_FLICKER_COUNT) {
        settleOnFinalPic();
      }
    }, FLICKER_INTERVAL);
  }, [currentPic, allPics, settleOnFinalPic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopFlickering();
  }, [stopFlickering]);

  if (hasError) {
    return (
      <div 
        className="w-full aspect-square transition-all duration-200"
        style={{ backgroundColor: fallbackColor.current }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
      />
    );
  }

  return (
    <div 
      className="relative w-full aspect-square overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      <img
        src={`/profile_pics/${currentPic}.jpg`}
        alt=""
        className="w-full h-full object-cover transition-[filter] duration-100"
        style={{
          filter: isActive ? 'brightness(1.15)' : 'brightness(1)',
        }}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

