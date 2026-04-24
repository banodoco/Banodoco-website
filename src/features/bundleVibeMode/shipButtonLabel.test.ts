import { describe, expect, test } from 'vitest';
import { getShipButtonLabel } from './shipButtonLabel';

describe('getShipButtonLabel', () => {
  test('returns Ship v1 when there is no shipped bundle', () => {
    expect(getShipButtonLabel()).toBe('Ship v1');
  });

  test('increments a shipped version of 1 to Ship v2', () => {
    expect(getShipButtonLabel({ version: 1 })).toBe('Ship v2');
  });

  test('increments a shipped version of 5 to Ship v6', () => {
    expect(getShipButtonLabel({ version: 5 })).toBe('Ship v6');
  });
});
