import { useSectionVisibility } from '@/lib/useSectionVisibility';

export interface UseSectionRuntimeOptions {
  /**
   * Intersection threshold (0-1) for when to consider active. Default: 0.5
   * (Also used as the "enter" threshold in useSectionVisibility's hysteresis.)
   */
  threshold?: number;
  /**
   * Lower threshold (0-1) for when to consider *not* active, to prevent flapping.
   * Default: `Math.max(0, threshold - 0.15)`.
   */
  exitThreshold?: number;
  /**
   * Debounce delay (ms) before flipping to not-active. Default: 150ms.
   */
  exitDelayMs?: number;
  /**
   * Optional rootMargin passed to IntersectionObserver (e.g. "200px 0px").
   */
  rootMargin?: string;
}

export interface SectionRuntime {
  /** Ref to attach to the section element */
  ref: React.RefObject<HTMLElement | null>;
  /**
   * Whether the section should be considered "active" right now.
   * Use this to pause/resume videos/animations.
   */
  isActive: boolean;
  /**
   * Whether the section has ever been active.
   * Use this to avoid auto-playing heavy media before first entry.
   */
  hasStarted: boolean;
}

/**
 * Standardized section lifecycle semantics for the snap-scroll homepage:
 * - `isActive`: stable "in viewport enough" signal (hysteresis + debounce via useSectionVisibility)
 * - `hasStarted`: latched on first active entry
 */
export function useSectionRuntime(options: UseSectionRuntimeOptions = {}): SectionRuntime {
  const { ref, isVisible, hasBeenVisible } = useSectionVisibility(options);
  return { ref, isActive: isVisible, hasStarted: hasBeenVisible };
}


