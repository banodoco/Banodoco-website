import { useEffect, useState, type CSSProperties } from 'react';
import {
  getRpLogoFontUrl,
  previousRpLogoTheme,
  RP_THEME_SETTINGS,
  selectedRpLogoTheme,
  type RpLogoTheme,
} from './rpLogoTheme';

const fontLinkId = (family: string) =>
  `rp-logo-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const ensureFontLink = (theme: RpLogoTheme) => {
  const id = fontLinkId(theme.font.family);
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = getRpLogoFontUrl(theme);
  document.head.appendChild(link);
};

const getStoredNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : fallback;
};

const getStoredString = (key: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) ?? fallback;
};

const useRpLogoFont = () => {
  useEffect(() => {
    ensureFontLink(selectedRpLogoTheme);
    if (previousRpLogoTheme) ensureFontLink(previousRpLogoTheme);
  }, []);
};

type RpLogoProps = {
  text?: string;
  className?: string;
  style?: CSSProperties;
};

export const RpLogo = ({ text = '2RP', className, style }: RpLogoProps) => {
  useRpLogoFont();
  const [crossfadeReady, setCrossfadeReady] = useState(!previousRpLogoTheme);
  useEffect(() => {
    if (!previousRpLogoTheme) return;
    const raf = window.requestAnimationFrame(() => setCrossfadeReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const crossfadeMs = getStoredNumber(
    RP_THEME_SETTINGS.crossfadeMsStorageKey,
    RP_THEME_SETTINGS.crossfadeMs,
  );
  const crossfadeEasing = getStoredString(
    RP_THEME_SETTINGS.crossfadeEasingStorageKey,
    RP_THEME_SETTINGS.crossfadeEasing,
  );
  const transition = `opacity ${crossfadeMs}ms ${crossfadeEasing}`;
  const fontStyle = (theme: RpLogoTheme): CSSProperties => ({
    color: `var(--rp-logo-color, color-mix(in srgb, ${theme.effect.color} 72%, #d8d2c8 28%))`,
    fontFamily: `"${theme.font.family}", "Sixtyfour", ui-monospace, monospace`,
    lineHeight: 1,
    textShadow: `0 0 12px var(--rp-logo-shadow-color, ${theme.effect.color}26)`,
  });

  if (!previousRpLogoTheme) {
    return (
      <span
        className={className}
        data-rp-logo-font={selectedRpLogoTheme.font.description}
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          verticalAlign: 'middle',
          whiteSpace: 'nowrap',
          ...fontStyle(selectedRpLogoTheme),
          ...style,
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={className}
      data-rp-logo-font={selectedRpLogoTheme.font.description}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        lineHeight: 1,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          ...fontStyle(previousRpLogoTheme),
          gridArea: '1 / 1',
          opacity: crossfadeReady ? 0 : 1,
          transition,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
      <span
        style={{
          ...fontStyle(selectedRpLogoTheme),
          gridArea: '1 / 1',
          opacity: crossfadeReady ? 1 : 0,
          transition,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </span>
  );
};
