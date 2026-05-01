import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  url?: string | null;
}

const DEFAULT_TITLE = 'Banodoco';
const DEFAULT_DESCRIPTION = 'Discover art, resources, and creative tooling on Banodoco.';
const DEFAULT_SITE_ORIGIN = 'https://banodoco.ai';

function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return DEFAULT_SITE_ORIGIN;
}

function resolveAbsoluteUrl(value: string | null | undefined, origin: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return trimmed;
  }
}

export function Seo({ title, description, image, url }: SeoProps) {
  const origin = getSiteOrigin();
  const resolvedTitle = title?.trim() || DEFAULT_TITLE;
  const resolvedDescription = description?.trim() || DEFAULT_DESCRIPTION;
  const resolvedUrl = resolveAbsoluteUrl(url, origin)
    || (typeof window !== 'undefined' ? window.location.href : origin);
  const resolvedImage = resolveAbsoluteUrl(image, origin) || `${origin}/og-default.jpg`;

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={resolvedUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      <link rel="canonical" href={resolvedUrl} />
    </Helmet>
  );
}
