import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

/**
 * CSS variable for header height offset.
 * Use this in calc() expressions for absolute positioned elements.
 * 
 * @example
 * style={{ top: `calc(8% + ${HEADER_OFFSET_VAR})` }}
 */
export const HEADER_OFFSET_VAR = 'var(--header-height)';

// =============================================================================
// Section Component
// =============================================================================

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
  /**
   * Disable snap behavior for this section.
   * Use on the last section to allow natural scrolling to the footer.
   */
  noSnap?: boolean;
  /**
   * Semi-transparent background color to overlay on scroll video.
   * The video shows through the transparency.
   */
  videoOverlay?: string;
}

/**
 * Section wrapper for snap-scrolling pages.
 * Handles consistent viewport height (100dvh) and snap behavior.
 * 
 * Usage:
 * - Pass background colors/gradients via className
 * - Content layout is handled by children
 * - Use videoOverlay prop to show scroll video through a semi-transparent color
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ id, className, children, noSnap = false, videoOverlay }, ref) => (
    <section
      ref={ref}
      id={id}
      className={cn(
        // Use a *stable* viewport height to avoid intermittent flicker/blanking on mobile
        // when browser chrome shows/hides (100dvh can change during scroll).
        "h-screen h-[100svh] overflow-hidden relative",
        // `snap-always` helps Safari/iOS avoid "resting" between sections.
        // noSnap allows the last section to scroll naturally to the footer.
        !noSnap && "snap-start snap-always",
        className
      )}
      style={{
        // Isolate each section into its own compositing layer to prevent
        // cross-section repaint flicker during scroll-snap transitions.
        contain: 'layout style paint',
        // Force GPU layer (reduces main-thread repaint during scroll)
        transform: 'translateZ(0)',
        // Semi-transparent background to show video through
        ...(videoOverlay ? { backgroundColor: videoOverlay } : {}),
      }}
    >
      {children}
    </section>
  )
);

Section.displayName = 'Section';

// =============================================================================
// SectionContent Component
// =============================================================================

interface SectionContentProps {
  children: ReactNode;
  className?: string;
  /**
   * When true, removes horizontal padding and max-width constraint.
   * Content stretches edge-to-edge but still gets header offset.
   * Useful for: profile grids, edge-to-edge media, asymmetric layouts.
   */
  fullWidth?: boolean;
  /**
   * How to vertically position content within the section.
   * - 'center': Default, centers content vertically
   * - 'start': Content starts from top
   * - 'stretch': Content fills full height (flex-col)
   */
  verticalAlign?: 'center' | 'start' | 'stretch';
  /**
   * Skip applying header offset. Rare - only for sections where content
   * should appear centered in the full viewport (e.g., Hero with bg video).
   */
  noHeaderOffset?: boolean;
}

/**
 * Content container for sections with standardized header offset.
 * 
 * Standard usage (centered, padded, max-width):
 *   <SectionContent>...</SectionContent>
 * 
 * Full-width (edge-to-edge content):
 *   <SectionContent fullWidth>...</SectionContent>
 * 
 * Custom vertical alignment:
 *   <SectionContent verticalAlign="stretch">...</SectionContent>
 * 
 * For complex layouts (e.g., absolute positioning with calc()), use
 * HEADER_OFFSET_VAR directly instead of SectionContent.
 */
export const SectionContent = ({ 
  children, 
  className,
  fullWidth = false,
  verticalAlign = 'center',
  noHeaderOffset = false,
}: SectionContentProps) => {
  const alignmentClasses = {
    center: 'flex items-center',
    start: 'flex items-start',
    stretch: 'flex flex-col',
  };

  return (
    <div 
      className={cn(
        "h-full",
        !fullWidth && "px-6 md:px-16",
        alignmentClasses[verticalAlign],
        className
      )}
      style={noHeaderOffset ? undefined : { paddingTop: HEADER_OFFSET_VAR }}
    >
      {fullWidth ? (
        children
      ) : (
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      )}
    </div>
  );
};

