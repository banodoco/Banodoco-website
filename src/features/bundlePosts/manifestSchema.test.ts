import { describe, expect, test } from 'vitest';
import { parseManifestJson } from './manifestSchema';

const fixtures = Object.entries(
  import.meta.glob('../../../testdata/bundle-manifests/**/*.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).sort(([left], [right]) => left.localeCompare(right)) as Array<[string, string]>;

const expectedFromPath = (fixturePath: string) => {
  if (fixturePath.endsWith('.ok.json')) return { ok: true, code: null };
  if (fixturePath.endsWith('.bundle_manifest_invalid.json')) {
    return { ok: false, code: 'bundle_manifest_invalid' };
  }
  throw new Error(`Fixture path must encode expected outcome: ${fixturePath}`);
};

describe('manifestSchema fixture corpus', () => {
  for (const [fixturePath, raw] of fixtures) {
    test(fixturePath, () => {
      const expected = expectedFromPath(fixturePath);
      const result = parseManifestJson(raw);

      expect(result.ok).toBe(expected.ok);
      expect(result.ok ? null : result.code).toBe(expected.code);

      if (expected.ok) {
        expect(result).toHaveProperty('manifest');
      } else {
        expect(result).toHaveProperty('message');
      }
    });
  }
});
