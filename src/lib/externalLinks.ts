import { DISCORD_INVITE_URL } from '@/lib/discord';

const HTTPS_PROTOCOL = 'https:';
const AUTHORITY_SEPARATOR = '//';

const buildHttpsUrl = (host: string, path: string = ''): string =>
  `${HTTPS_PROTOCOL}${AUTHORITY_SEPARATOR}${host}${path}`;

const readEnvValue = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const FALLBACK_LINKS = {
  twitter: buildHttpsUrl('twitter.com', '/banodoco'),
  github: buildHttpsUrl('github.com', '/banodoco'),
  discordInvite: DISCORD_INVITE_URL,
  adosEvents: buildHttpsUrl('ados.events', '/'),
  arcaGidanWinners: buildHttpsUrl('arcagidan.com', '/winners'),
  reighHome: buildHttpsUrl('reigh.art', '/'),
  banodocoHome: buildHttpsUrl('banodoco.ai', '/'),
} as const;

export const EXTERNAL_LINKS = {
  twitter: readEnvValue(import.meta.env.VITE_LINK_TWITTER, FALLBACK_LINKS.twitter),
  github: readEnvValue(import.meta.env.VITE_LINK_GITHUB, FALLBACK_LINKS.github),
  discordInvite: readEnvValue(import.meta.env.VITE_LINK_DISCORD, FALLBACK_LINKS.discordInvite),
  adosEvents: readEnvValue(import.meta.env.VITE_LINK_ADOS, FALLBACK_LINKS.adosEvents),
  arcaGidanWinners: readEnvValue(import.meta.env.VITE_LINK_ARCAGIDAN_WINNERS, FALLBACK_LINKS.arcaGidanWinners),
  reighHome: readEnvValue(import.meta.env.VITE_LINK_REIGH, FALLBACK_LINKS.reighHome),
  banodocoHome: readEnvValue(import.meta.env.VITE_LINK_BANODOCO, FALLBACK_LINKS.banodocoHome),
} as const;

const FALLBACK_OWNERSHIP_ASSETS = {
  typicalStartupEquity: buildHttpsUrl('banodoco.s3.amazonaws.com', '/images/typical_startup_equity.webp'),
  openSourceNative: buildHttpsUrl('banodoco.s3.amazonaws.com', '/images/open_source_native.webp'),
  structureDiagram: buildHttpsUrl('banodoco.s3.amazonaws.com', '/plan/structure.png'),
} as const;

export const OWNERSHIP_ASSET_URLS = {
  typicalStartupEquity: readEnvValue(
    import.meta.env.VITE_OWNERSHIP_TYPICAL_STARTUP_EQUITY_IMAGE,
    FALLBACK_OWNERSHIP_ASSETS.typicalStartupEquity
  ),
  openSourceNative: readEnvValue(
    import.meta.env.VITE_OWNERSHIP_OPEN_SOURCE_NATIVE_IMAGE,
    FALLBACK_OWNERSHIP_ASSETS.openSourceNative
  ),
  structureDiagram: readEnvValue(
    import.meta.env.VITE_OWNERSHIP_STRUCTURE_IMAGE,
    FALLBACK_OWNERSHIP_ASSETS.structureDiagram
  ),
} as const;

const FALLBACK_WRAPPED_ASSETS = {
  sprite: buildHttpsUrl('www.banodoco.ai', '/profile-sprite.jpg'),
  demoFluxImage: buildHttpsUrl('placehold.co', '/512x512/1a1a2e/ffffff?text=Flux+Art'),
  demoWanVideo: buildHttpsUrl('placehold.co', '/512x512/2e1a2e/ffffff?text=Wan+Video'),
} as const;

export const WRAPPED_ASSET_URLS = {
  sprite: readEnvValue(import.meta.env.VITE_WRAPPED_SPRITE_URL, FALLBACK_WRAPPED_ASSETS.sprite),
  demoFluxImage: readEnvValue(
    import.meta.env.VITE_WRAPPED_DEMO_MEDIA_URL_1,
    FALLBACK_WRAPPED_ASSETS.demoFluxImage
  ),
  demoWanVideo: readEnvValue(
    import.meta.env.VITE_WRAPPED_DEMO_MEDIA_URL_2,
    FALLBACK_WRAPPED_ASSETS.demoWanVideo
  ),
} as const;
