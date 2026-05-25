/** Format channel name for display (e.g., "ad_art_discussion" -> "Art Discussion") */
export const formatChannelName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .replace(/_/g, ' ')
    .replace(/^ad[-_]/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** Format date for display (Today, Yesterday, or "Dec 25") */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00'); // Ensure consistent parsing
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

/** Format markdown-like text to HTML (bold text) */
export const formatText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    // Hide source-citation markup (e.g. " [[1]](https://discord.com/...)") which
    // the daily-update bot embeds for Discord but should not surface on the site.
    .replace(/\s*\[\[?\d+\]?\]\(https?:\/\/[^)]*\)/g, '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/:\s*$/, '');
};


