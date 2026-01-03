/** Shuffle array using Fisher-Yates algorithm */
export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/** Generate a random pastel color for fallback */
export const getRandomPastelColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
};

/** Generate a subtle muted color for skeleton placeholders on dark backgrounds */
export const getRandomSkeletonColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 20%, 25%)`;
};


