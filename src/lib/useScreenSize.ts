import { useState, useEffect } from 'react';
import { getScreenSize, type ScreenSize } from './breakpoints';

/**
 * Singleton pattern for screen size detection.
 * Shares a single resize listener across all hook instances.
 */
let listenerCount = 0;
let currentScreenSize: ScreenSize = typeof window !== 'undefined' ? getScreenSize() : 'mobile';
const subscribers = new Set<() => void>();

const handleResize = () => {
  const newSize = getScreenSize();
  if (newSize !== currentScreenSize) {
    currentScreenSize = newSize;
    subscribers.forEach(cb => cb());
  }
};

/**
 * Hook to detect current screen size category (mobile/tablet/desktop).
 * Uses a singleton pattern to share a single resize listener across all instances.
 * 
 * @returns Current screen size: 'mobile' | 'tablet' | 'desktop'
 */
export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState(currentScreenSize);
  
  useEffect(() => {
    const updateSize = () => setScreenSize(currentScreenSize);
    subscribers.add(updateSize);
    
    // Only add event listener for first subscriber
    if (listenerCount === 0) {
      window.addEventListener('resize', handleResize, { passive: true });
    }
    listenerCount++;
    
    return () => {
      subscribers.delete(updateSize);
      listenerCount--;
      // Remove event listener when last subscriber unsubscribes
      if (listenerCount === 0) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);
  
  return screenSize;
};

