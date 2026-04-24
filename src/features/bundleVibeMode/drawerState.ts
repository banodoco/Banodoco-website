import { useCallback, useEffect, useState } from 'react';

export const DRAWER_OPEN_KEY = (postId: string) => `vibe:drawer-open:${postId}`;
export const DRAWER_WIDTH_KEY = 'vibe:drawer-width';
export const DEFAULT_DRAWER_WIDTH = 480;
export const MIN_DRAWER_WIDTH = 320;
export const MAX_DRAWER_WIDTH = 720;

function clampDrawerWidth(px: number): number {
  return Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, Math.round(px)));
}

export function readStoredDrawerOpen(
  postId: string,
  { defaultOpen }: { defaultOpen: boolean },
): boolean {
  if (typeof window === 'undefined') return defaultOpen;
  const stored = window.localStorage.getItem(DRAWER_OPEN_KEY(postId));
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return defaultOpen;
}

export function writeDrawerOpen(postId: string, open: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRAWER_OPEN_KEY(postId), String(open));
}

export function readStoredDrawerWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_DRAWER_WIDTH;
  const stored = Number(window.localStorage.getItem(DRAWER_WIDTH_KEY));
  if (!Number.isFinite(stored)) return DEFAULT_DRAWER_WIDTH;
  return clampDrawerWidth(stored);
}

export function writeDrawerWidth(px: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRAWER_WIDTH_KEY, String(clampDrawerWidth(px)));
}

export function useDrawerState({
  postId,
  defaultOpen,
}: {
  postId: string;
  defaultOpen: boolean;
}): {
  open: boolean;
  setOpen: (next: boolean) => void;
  width: number;
  setWidth: (next: number) => void;
} {
  const [open, setOpenState] = useState(() => readStoredDrawerOpen(postId, { defaultOpen }));
  const [width, setWidthState] = useState(() => readStoredDrawerWidth());

  useEffect(() => {
    setOpenState(readStoredDrawerOpen(postId, { defaultOpen }));
  }, [defaultOpen, postId]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      writeDrawerOpen(postId, next);
    },
    [postId],
  );

  const setWidth = useCallback((next: number) => {
    const clamped = clampDrawerWidth(next);
    setWidthState(clamped);
    writeDrawerWidth(clamped);
  }, []);

  return { open, setOpen, width, setWidth };
}
