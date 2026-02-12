/**
 * Device detection utilities.
 * Centralized to avoid duplication across components.
 */

/**
 * Detects iOS devices (iPhone, iPad, iPod) including iPadOS on modern iPads.
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isiOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isiPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isiOSDevice || isiPadOS;
}

/**
 * Returns connection info if available.
 */
function getConnectionInfo(): { saveData?: boolean; effectiveType?: string } | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  return nav.connection ?? null;
}

/**
 * Checks if we should preload videos based on connection quality.
 * Note: We no longer skip iOS entirely — the UX hit from delayed video loading
 * is worse than the data usage, especially since we only preload metadata + first videos.
 */
export function shouldPreloadVideos(): boolean {
  const connection = getConnectionInfo();
  if (connection?.saveData) return false;
  
  const effectiveType = connection?.effectiveType;
  // Only skip on very slow connections
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;
  
  return true;
}

