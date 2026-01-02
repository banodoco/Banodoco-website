import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Basic skeleton primitive - a pulsing placeholder element
 * Use className to set dimensions, shape, etc.
 * 
 * @example
 * <Skeleton className="h-4 w-full" />           // text line
 * <Skeleton className="h-6 w-20 rounded-full" /> // pill/badge
 * <Skeleton className="aspect-video rounded-lg" /> // media
 */
export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn("bg-white/10 animate-pulse rounded", className)} />
);

/**
 * Skeleton text line - common pattern for text content
 */
export const SkeletonText = ({ className }: SkeletonProps) => (
  <Skeleton className={cn("h-4 w-full", className)} />
);

/**
 * Skeleton heading - larger text placeholder
 */
export const SkeletonHeading = ({ className }: SkeletonProps) => (
  <Skeleton className={cn("h-6 w-3/4", className)} />
);

/**
 * Skeleton avatar/image - square or circular placeholder
 */
export const SkeletonAvatar = ({ className }: SkeletonProps) => (
  <Skeleton className={cn("w-10 h-10 rounded-full", className)} />
);

/**
 * Skeleton media - aspect-ratio video/image placeholder
 */
export const SkeletonMedia = ({ className }: SkeletonProps) => (
  <Skeleton className={cn("aspect-video rounded-lg", className)} />
);

/**
 * Skeleton paragraph - multiple lines of text
 */
export const SkeletonParagraph = ({ 
  lines = 3, 
  className 
}: SkeletonProps & { lines?: number }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonText 
        key={i} 
        className={i === lines - 1 ? "w-4/6" : i === lines - 2 ? "w-5/6" : "w-full"} 
      />
    ))}
  </div>
);

/**
 * Skeleton card - common card layout with header, content, footer
 */
export const SkeletonCard = ({ className }: SkeletonProps) => (
  <div className={cn(
    "bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10",
    className
  )}>
    {/* Header */}
    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
    {/* Content */}
    <div className="p-4 space-y-3">
      <SkeletonHeading />
      <SkeletonParagraph lines={2} />
    </div>
  </div>
);

/**
 * Skeleton bullet point - arrow indicator + text line
 * Commonly used for list items with arrow markers
 */
export const SkeletonBullet = ({ className }: SkeletonProps) => (
  <div className={cn("flex items-start gap-2", className)}>
    <Skeleton className="w-3 h-3 bg-emerald-400/20 shrink-0" />
    <Skeleton className="h-3 w-full" />
  </div>
);

