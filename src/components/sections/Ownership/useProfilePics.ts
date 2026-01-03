import { useState, useRef, useCallback } from 'react';
import { GRID_SIZE } from './config';
import { shuffleArray } from './utils';
import { PROFILE_PICS, SPRITE_CONFIG } from './profilePicsManifest';

export interface ProfilePic {
  id: string;
  col: number;
  row: number;
}

interface UseProfilePicsResult {
  /** The currently selected/visible profile pics */
  visiblePics: ProfilePic[];
  /** All available profile pics (for flickering through) */
  allPics: readonly ProfilePic[];
  /** Sprite configuration */
  spriteConfig: typeof SPRITE_CONFIG;
  /** Ref tracking which pic IDs are currently in use */
  usedPicsRef: React.MutableRefObject<Set<string>>;
  /** Call when swapping one pic for another */
  handleSwap: (oldId: string, newId: string) => void;
}

export const useProfilePics = (): UseProfilePicsResult => {
  // Initialize synchronously so the grid isn't empty on first paint (especially noticeable on mobile).
  const [selectedPics] = useState<ProfilePic[]>(() => {
    const pics = [...PROFILE_PICS] as ProfilePic[];
    if (pics.length === 0) return [];
    const shuffled = shuffleArray(pics);
    return shuffled.slice(0, GRID_SIZE);
  });

  // Ref tracking which pics are currently in use (seeded from the initial selection).
  const usedPicsRef = useRef<Set<string>>(new Set(selectedPics.map(p => p.id)));

  const handleSwap = useCallback((oldId: string, newId: string) => {
    usedPicsRef.current.delete(oldId);
    usedPicsRef.current.add(newId);
  }, []);

  return {
    visiblePics: selectedPics,
    allPics: PROFILE_PICS,
    spriteConfig: SPRITE_CONFIG,
    usedPicsRef,
    handleSwap,
  };
};
