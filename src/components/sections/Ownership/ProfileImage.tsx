import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { FLICKER_INTERVAL, MOBILE_FLICKER_COUNT } from './config';
import { getRandomPastelColor } from './utils';
import type { ProfilePic } from './useProfilePics';

interface ProfileImageProps {
  initialPic: ProfilePic;
  allPics: readonly ProfilePic[];
  spriteConfig: {
    src: string;
    columns: number;
    rows: number;
  };
  usedPicsRef: React.MutableRefObject<Set<string>>;
  onSwap: (oldId: string, newId: string) => void;
}

export const ProfileImage = ({ 
  initialPic, 
  allPics, 
  spriteConfig,
  usedPicsRef,
  onSwap
}: ProfileImageProps) => {
  const [currentPic, setCurrentPic] = useState(initialPic);
  const [isActive, setIsActive] = useState(false);
  const fallbackColor = useRef(getRandomPastelColor());
  const flickerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flickerCountRef = useRef(0);
  const originalPicRef = useRef(initialPic);
  const isTouchRef = useRef(false);

  // Calculate background position for current pic
  const backgroundStyle = useMemo(() => {
    const { columns, rows, src } = spriteConfig;
    const xPercent = columns > 1 ? (currentPic.col / (columns - 1)) * 100 : 0;
    const yPercent = rows > 1 ? (currentPic.row / (rows - 1)) * 100 : 0;
    
    return {
      backgroundImage: `url(${src})`,
      backgroundSize: `${columns * 100}% ${rows * 100}%`,
      backgroundPosition: `${xPercent}% ${yPercent}%`,
      filter: isActive ? 'brightness(1.15)' : 'brightness(1)',
    };
  }, [currentPic, spriteConfig, isActive]);

  const stopFlickering = useCallback(() => {
    if (flickerIntervalRef.current) {
      clearInterval(flickerIntervalRef.current);
      flickerIntervalRef.current = null;
    }
  }, []);

  const getRandomUnusedPic = useCallback((excludeId: string) => {
    const availablePics = allPics.filter(pic => !usedPicsRef.current.has(pic.id) || pic.id === excludeId);
    if (availablePics.length > 1) {
      const otherPics = availablePics.filter(pic => pic.id !== excludeId);
      return otherPics[Math.floor(Math.random() * otherPics.length)];
    }
    return allPics[Math.floor(Math.random() * allPics.length)];
  }, [allPics, usedPicsRef]);

  const settleOnFinalPic = useCallback(() => {
    stopFlickering();
    setIsActive(false);
    const finalPic = getRandomUnusedPic(originalPicRef.current.id);
    onSwap(originalPicRef.current.id, finalPic.id);
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

  return (
    <div 
      className="w-full aspect-square cursor-pointer transition-[filter] duration-200"
      style={backgroundStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      role="img"
      aria-label="Community member profile"
    />
  );
};
