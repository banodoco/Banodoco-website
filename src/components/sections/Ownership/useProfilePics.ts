import { useState, useRef, useCallback } from 'react';
import { GRID_SIZE } from './config';
import { shuffleArray } from './utils';

// Auto-discover profile pics at build time using Vite's glob import
const profilePicPaths = import.meta.glob('/public/profile_pics/*.jpg');
const ALL_PROFILE_PICS = Object.keys(profilePicPaths)
  .map(path => path.split('/').pop()?.replace('.jpg', '') ?? '')
  .filter(Boolean);

interface UseProfilePicsResult {
  /** The currently selected/visible profile pics */
  visiblePics: string[];
  /** All available profile pics (for flickering through) */
  allPics: string[];
  /** Ref tracking which pics are currently in use */
  usedPicsRef: React.MutableRefObject<Set<string>>;
  /** Call when swapping one pic for another */
  handleSwap: (oldPic: string, newPic: string) => void;
}

export const useProfilePics = (): UseProfilePicsResult => {
  // Initialize synchronously so the grid isn't empty on first paint (especially noticeable on mobile).
  const [selectedPics] = useState<string[]>(() => {
    const shuffled = shuffleArray(ALL_PROFILE_PICS);
    return shuffled.slice(0, GRID_SIZE);
  });

  // Ref tracking which pics are currently in use (seeded from the initial selection).
  const usedPicsRef = useRef<Set<string>>(new Set(selectedPics));

  const handleSwap = useCallback((oldPic: string, newPic: string) => {
    usedPicsRef.current.delete(oldPic);
    usedPicsRef.current.add(newPic);
  }, []);

  return {
    visiblePics: selectedPics,
    allPics: ALL_PROFILE_PICS,
    usedPicsRef,
    handleSwap,
  };
};


