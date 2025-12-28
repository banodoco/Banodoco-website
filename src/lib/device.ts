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
export function getConnectionInfo(): { saveData?: boolean; effectiveType?: string } | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  return nav.connection ?? null;
}

/**
 * Checks if we should preload videos based on device/connection.
 */
export function shouldPreloadVideos(): boolean {
  if (isIOS()) return false;
  
  const connection = getConnectionInfo();
  if (connection?.saveData) return false;
  
  const effectiveType = connection?.effectiveType;
  if (effectiveType && /(^|-)2g$/.test(effectiveType)) return false;
  
  return true;
}

