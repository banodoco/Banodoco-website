import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Section wrapper for snap-scrolling pages.
 * Handles consistent viewport height (100dvh) and snap behavior.
 * 
 * Usage:
 * - Pass background colors/gradients via className
 * - Content layout is handled by children
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ id, className, children }, ref) => (
    <section
      ref={ref}
      id={id}
      className={cn(
        // `snap-always` helps Safari/iOS avoid "resting" between sections.
        // Use a *stable* viewport height to avoid intermittent flicker/blanking on mobile
        // when browser chrome shows/hides (100dvh can change during scroll).
        "h-screen h-[100svh] snap-start snap-always overflow-hidden",
        className
      )}
      style={{
        // Isolate each section into its own compositing layer to prevent
        // cross-section repaint flicker during scroll-snap transitions.
        contain: 'layout style paint',
        // Force GPU layer (reduces main-thread repaint during scroll)
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </section>
  )
);

Section.displayName = 'Section';

interface SectionContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Centered content container for sections.
 * Vertically and horizontally centers content within the section.
 * Uses CSS variable --header-height on desktop to account for fixed header.
 * 
 * Usage:
 * - Wrap your content in this for standard centered layout
 * - Add className for custom padding/overflow behavior
 */
export const SectionContent = ({ children, className }: SectionContentProps) => (
  <div 
    className={cn(
      "h-full px-6 md:px-16 flex items-center",
      className
    )}
    style={{ paddingTop: 'var(--header-height)' }}
  >
    <div className="max-w-7xl mx-auto w-full">
      {children}
    </div>
  </div>
);

