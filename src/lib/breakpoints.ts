/**
 * Shared breakpoint values for JavaScript/TypeScript responsive logic.
 * These align with Tailwind's default breakpoints:
 *   sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Get current screen size category based on window width.
 * - mobile: < md (768px)
 * - tablet: md to xl (768px - 1279px)
 * - desktop: >= xl (1280px)
 */
export const getScreenSize = (): ScreenSize => {
  if (typeof window === 'undefined') return 'mobile';
  if (window.innerWidth < BREAKPOINTS.md) return 'mobile';
  if (window.innerWidth < BREAKPOINTS.xl) return 'tablet';
  return 'desktop';
};

