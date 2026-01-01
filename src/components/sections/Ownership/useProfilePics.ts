import { useState, useRef, useCallback } from 'react';
import { GRID_SIZE } from './config';
import { shuffleArray } from './utils';
import { PROFILE_PIC_IDS } from './profilePicsManifest';

const ALL_PROFILE_PICS = [...PROFILE_PIC_IDS];

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
    if (ALL_PROFILE_PICS.length === 0) return [];
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


