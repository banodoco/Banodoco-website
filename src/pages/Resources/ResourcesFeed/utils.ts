import type { DiscordAttachment } from '@/pages/Resources/Discord/types';

export interface ContentSegment {
  type: 'text' | 'url';
  value: string;
}

/**
 * Parse Discord message content into an array of text and URL segments.
 */
export function parseUrls(content: string): ContentSegment[] {
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(content)) !== null) {
    // Add preceding text if any
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'url', value: match[1] });
    lastIndex = urlRegex.lastIndex;
  }

  // Add trailing text if any
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return segments;
}

/**
 * Format an ISO timestamp into a human-readable relative time string.
 * Returns "just now", "2m ago", "3h ago", "2d ago", "2w ago",
 * then falls back to a short date like "Jan 15" for older timestamps.
 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 14) return `${diffDay}d ago`;
  if (diffWeek < 8) return `${diffWeek}w ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Check if an attachment is a media file (image or video).
 */
export function isMediaAttachment(att: DiscordAttachment): boolean {
  if (!att.content_type) return false;
  return att.content_type.startsWith('image/') || att.content_type.startsWith('video/');
}

/**
 * Check if a content type string indicates a video.
 */
export function isVideoContentType(type: string | null): boolean {
  if (!type) return false;
  return type.startsWith('video/');
}
