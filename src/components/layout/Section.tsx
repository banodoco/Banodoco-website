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
        "h-[100dvh] snap-start overflow-hidden",
        className
      )}
      style={{ 
        // Force GPU compositing layer to prevent flash during scroll
        transform: 'translateZ(0)',
        willChange: 'transform',
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
 * 
 * Usage:
 * - Wrap your content in this for standard centered layout
 * - Add className for custom padding/overflow behavior
 */
export const SectionContent = ({ children, className }: SectionContentProps) => (
  <div className={cn(
    "h-full px-6 md:px-16 flex items-center",
    className
  )}>
    <div className="max-w-7xl mx-auto w-full">
      {children}
    </div>
  </div>
);

