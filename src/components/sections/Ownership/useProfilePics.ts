import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const usedPicsRef = useRef<Set<string>>(new Set());

  // Initialize with shuffled selection
  useEffect(() => {
    const shuffled = shuffleArray(ALL_PROFILE_PICS);
    const selected = shuffled.slice(0, GRID_SIZE);
    setSelectedPics(selected);
    usedPicsRef.current = new Set(selected);
  }, []);

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

