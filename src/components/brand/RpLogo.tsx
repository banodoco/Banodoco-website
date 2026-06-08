import { useEffect, useState, type CSSProperties } from 'react';
import {
  getRpLogoFontUrl,
  previousRpLogoTheme,
  RP_THEME_SETTINGS,
  selectedRpLogoTheme,
  type RpLogoTheme,
} from './rpLogoTheme';

const fontLoadPromises = new Map<string, Promise<void>>();

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

const loadLogoFont = (theme: RpLogoTheme, sample: string) => {
  if (typeof document === 'undefined') return Promise.resolve();

  ensureFontLink(theme);

  if (!('fonts' in document)) return Promise.resolve();

  const family = theme.font.family;
  const cached = fontLoadPromises.get(family);
  if (cached) return cached;

  const promise = document.fonts
    .load(`1em "${family}"`, sample)
    .then(() => undefined)
    .catch(() => undefined);
  fontLoadPromises.set(family, promise);
  return promise;
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
  reserveWidth?: string;
  align?: 'start' | 'center';
  wrap?: boolean;
};

const getReserveWidth = (text: string) => {
  if (text === '2RP') return '3.65em';
  return `${Math.max(8, text.length * 1.05)}em`;
};

export const RpLogo = ({
  text = '2RP',
  className,
  style,
  reserveWidth,
  align = 'start',
  wrap = false,
}: RpLogoProps) => {
  useRpLogoFont();
  const [readyThemeId, setReadyThemeId] = useState<string | null>(null);
  const [crossfadeReady, setCrossfadeReady] = useState(!previousRpLogoTheme);
  const fontsReady = readyThemeId === selectedRpLogoTheme.id;

  useEffect(() => {
    let cancelled = false;
    setReadyThemeId(null);
    setCrossfadeReady(!previousRpLogoTheme);
    const requiredFonts = previousRpLogoTheme
      ? [previousRpLogoTheme, selectedRpLogoTheme]
      : [selectedRpLogoTheme];

    Promise.all(requiredFonts.map((theme) => loadLogoFont(theme, text))).then(() => {
      if (!cancelled) setReadyThemeId(selectedRpLogoTheme.id);
    });

    return () => {
      cancelled = true;
    };
  }, [text]);

  useEffect(() => {
    if (!previousRpLogoTheme || !fontsReady) return;
    const raf = window.requestAnimationFrame(() => setCrossfadeReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, [fontsReady]);

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
  const frameStyle: CSSProperties = {
    display: 'inline-grid',
    alignItems: 'center',
    justifyItems: align,
    lineHeight: 1,
    verticalAlign: 'middle',
    width: reserveWidth ?? (wrap ? '100%' : getReserveWidth(text)),
    maxWidth: '100%',
    whiteSpace: wrap ? 'normal' : 'nowrap',
    ...style,
  };
  const placeholder = (
    <span
      aria-hidden="true"
      style={{
        gridArea: '1 / 1',
        justifySelf: 'stretch',
        width: '100%',
        height: '0.82em',
        borderRadius: '999px',
        background: 'var(--rp-logo-color, currentColor)',
        boxShadow: '0 0 12px var(--rp-logo-shadow-color, transparent)',
        opacity: fontsReady ? 0 : 0.42,
        transition: 'opacity 220ms ease',
      }}
    />
  );

  if (!previousRpLogoTheme) {
    return (
      <span
        className={className}
        data-rp-logo-font={selectedRpLogoTheme.font.description}
        style={frameStyle}
      >
        {placeholder}
        <span
          style={{
            ...fontStyle(selectedRpLogoTheme),
            gridArea: '1 / 1',
            opacity: fontsReady ? 1 : 0,
            transition: 'opacity 220ms ease',
            whiteSpace: wrap ? 'normal' : 'nowrap',
          }}
        >
          {text}
        </span>
      </span>
    );
  }

  return (
    <span
      className={className}
      data-rp-logo-font={selectedRpLogoTheme.font.description}
      style={frameStyle}
    >
      {placeholder}
      <span
        aria-hidden="true"
        style={{
          ...fontStyle(previousRpLogoTheme),
          gridArea: '1 / 1',
          opacity: fontsReady && !crossfadeReady ? 1 : 0,
          transition,
          whiteSpace: wrap ? 'normal' : 'nowrap',
        }}
      >
        {text}
      </span>
      <span
        style={{
          ...fontStyle(selectedRpLogoTheme),
          gridArea: '1 / 1',
          opacity: fontsReady && crossfadeReady ? 1 : 0,
          transition,
          whiteSpace: wrap ? 'normal' : 'nowrap',
        }}
      >
        {text}
      </span>
    </span>
  );
};
