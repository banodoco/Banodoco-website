import type { BundleManifestV1 } from '@/types/post';

const SERVING_ORIGIN = (import.meta.env.VITE_BUNDLE_SERVING_ORIGIN as string | undefined) ?? '';

/**
 * Build the absolute URL served by the serve-bundle edge function. Appends
 * ?token= when the caller provides a preview JWT.
 */
export function buildBundleUrl(
  bundleVersionId: string,
  entry: string,
  previewToken?: string | null,
): string {
  const base = SERVING_ORIGIN.replace(/\/$/, '');
  const url = `${base}/functions/v1/serve-bundle/${bundleVersionId}/${entry}`;
  if (!previewToken) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(previewToken)}`;
}

/**
 * Produce the iframe sandbox attribute string. `allow-scripts` is always on;
 * `allow-popups` / `allow-pointer-lock` are opt-in via manifest capabilities.
 */
export function buildSandboxTokens(capabilities?: BundleManifestV1['capabilities']): string {
  const tokens = ['allow-scripts'];
  if (capabilities?.popups) tokens.push('allow-popups');
  if (capabilities?.pointerLock) tokens.push('allow-pointer-lock');
  return tokens.join(' ');
}
