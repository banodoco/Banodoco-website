import { describe, expect, test } from 'vitest';
import { buildEntitySlug, buildResourcePath, extractEntityIdFromSlug } from './routing';

describe('buildResourcePath', () => {
  test('uses persistedSlug verbatim when provided', () => {
    expect(
      buildResourcePath('123e4567-e89b-12d3-a456-426614174000', {
        persistedSlug: 'cool-resource--ABC123',
      }),
    ).toBe('/resources/cool-resource--ABC123');
  });

  test('does not double-slugify an already persisted slug', () => {
    expect(
      buildResourcePath('123e4567-e89b-12d3-a456-426614174000', {
        label: 'Ignored Label',
        persistedSlug: 'Already-Slugified--MiXeDCase123',
        username: 'author',
      }),
    ).toBe('/author/resources/Already-Slugified--MiXeDCase123');
  });

  test('falls back to computed slug when persistedSlug is null', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(
      buildResourcePath(id, {
        label: 'Cool Resource',
        persistedSlug: null,
      }),
    ).toBe(`/resources/${buildEntitySlug('Cool Resource', id)}`);
  });
});

describe('extractEntityIdFromSlug', () => {
  test('decodes both bare base62 tokens and name-prefixed slugs', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const slug = buildEntitySlug('Cool Resource', id);
    const token = slug.split('--').pop() ?? '';

    expect(extractEntityIdFromSlug(token)).toBe(id);
    expect(extractEntityIdFromSlug(slug)).toBe(id);
  });
});
