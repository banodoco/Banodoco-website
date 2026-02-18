const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  '',
  'ownership',
  '2nd-renaissance',
  '1m',
  'resources',
  'auth',
  'submit',
  'art',
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_REGEX.test(value);

const encodePathSegment = (segment: string): string => {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
};

export const profilePath = (username: string): string => `/${encodePathSegment(username)}`;
export const profileArtPath = (username: string): string => `/${encodePathSegment(username)}/art`;
export const profileResourcesPath = (username: string): string => `/${encodePathSegment(username)}/resources`;

/**
 * Handles legacy/shared URLs where `#` in username was not URL-encoded, e.g.
 * `/seruva19#0/resources/...` which the browser parses as:
 * - pathname: `/seruva19`
 * - hash: `#0/resources/...`
 * Returns a corrected encoded pathname if applicable.
 */
export const normalizeLegacyHashUsernamePath = (pathname: string, hash: string): string | null => {
  if (!hash || hash.length <= 1) return null;

  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length !== 1) return null;

  const hashBody = hash.slice(1);
  const slashIndex = hashBody.indexOf('/');
  if (slashIndex <= 0) return null;

  const hashUsernameSuffix = hashBody.slice(0, slashIndex);
  const remainder = hashBody.slice(slashIndex);
  const isSupportedDetailPath =
    remainder === '/art'
    || remainder.startsWith('/art/')
    || remainder === '/resources'
    || remainder.startsWith('/resources/');

  if (!isSupportedDetailPath) return null;

  const baseUsername = decodeURIComponent(pathSegments[0] ?? '');
  if (!baseUsername) return null;

  return `${profilePath(`${baseUsername}#${hashUsernameSuffix}`)}${remainder}`;
};

export const isProfilePathname = (pathname: string): boolean => {
  const segment = pathname.split('/')[1] ?? '';
  return Boolean(segment && !RESERVED_TOP_LEVEL_SEGMENTS.has(segment));
};

export const slugify = (value: string | null | undefined): string => {
  const base = (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || 'item';
};

const encodeUuidBase62 = (uuid: string): string | null => {
  const hex = uuid.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;

  let value = BigInt(`0x${hex}`);
  if (value === 0n) return '0';

  let encoded = '';
  while (value > 0n) {
    const mod = Number(value % 62n);
    encoded = BASE62_ALPHABET[mod] + encoded;
    value /= 62n;
  }
  return encoded;
};

const decodeUuidBase62 = (token: string): string | null => {
  if (!token) return null;

  let value = 0n;
  for (const char of token) {
    const idx = BASE62_ALPHABET.indexOf(char);
    if (idx < 0) return null;
    value = value * 62n + BigInt(idx);
  }

  const hex = value.toString(16).padStart(32, '0');
  if (hex.length !== 32) return null;

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

export const buildEntitySlug = (label: string | null | undefined, id: string): string => {
  const token = encodeUuidBase62(id);
  if (!token) return slugify(label);
  return `${slugify(label)}--${token}`;
};

export const extractEntityIdFromSlug = (slugOrId: string | undefined): string | null => {
  if (!slugOrId) return null;
  if (isUuid(slugOrId)) return slugOrId;

  const token = slugOrId.includes('--') ? slugOrId.split('--').pop() ?? '' : slugOrId;
  const decoded = decodeUuidBase62(token);
  return decoded && isUuid(decoded) ? decoded : null;
};

export const buildArtPath = (id: string, label?: string | null, username?: string | null): string => {
  const slug = buildEntitySlug(label, id);
  return username ? `${profilePath(username)}/art/${slug}` : `/art/${slug}`;
};

export const buildResourcePath = (id: string, label?: string | null, username?: string | null): string => {
  const slug = buildEntitySlug(label, id);
  return username ? `${profilePath(username)}/resources/${slug}` : `/resources/${slug}`;
};
