// @vitest-environment happy-dom

import { beforeEach, describe, expect, test } from 'vitest';
import {
  DRAWER_OPEN_KEY,
  DRAWER_WIDTH_KEY,
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
  readStoredDrawerOpen,
  readStoredDrawerWidth,
} from './drawerState';

const POST_ID = 'drawer-post-1';

beforeEach(() => {
  window.localStorage.clear();
});

describe('drawerState storage helpers', () => {
  test('readStoredDrawerOpen respects defaults and stored per-post overrides', () => {
    expect(readStoredDrawerOpen(POST_ID, { defaultOpen: true })).toBe(true);
    expect(readStoredDrawerOpen(POST_ID, { defaultOpen: false })).toBe(false);

    window.localStorage.setItem(DRAWER_OPEN_KEY(POST_ID), 'true');
    expect(readStoredDrawerOpen(POST_ID, { defaultOpen: false })).toBe(true);

    window.localStorage.setItem(DRAWER_OPEN_KEY(POST_ID), 'false');
    expect(readStoredDrawerOpen(POST_ID, { defaultOpen: true })).toBe(false);
  });

  test('readStoredDrawerWidth restores and clamps stored width values', () => {
    window.localStorage.setItem(DRAWER_WIDTH_KEY, '520');
    expect(readStoredDrawerWidth()).toBe(520);

    window.localStorage.setItem(DRAWER_WIDTH_KEY, '100');
    expect(readStoredDrawerWidth()).toBe(MIN_DRAWER_WIDTH);

    window.localStorage.setItem(DRAWER_WIDTH_KEY, '2000');
    expect(readStoredDrawerWidth()).toBe(MAX_DRAWER_WIDTH);
  });
});
