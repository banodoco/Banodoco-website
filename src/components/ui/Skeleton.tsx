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
const SkeletonText = ({ className }: SkeletonProps) => (
  <Skeleton className={cn("h-4 w-full", className)} />
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
 * Skeleton bullet point - arrow indicator + text line
 * Commonly used for list items with arrow markers
 */
export const SkeletonBullet = ({ className }: SkeletonProps) => (
  <div className={cn("flex items-start gap-2", className)}>
    <Skeleton className="w-3 h-3 bg-emerald-400/20 shrink-0" />
    <Skeleton className="h-3 w-full" />
  </div>
);

