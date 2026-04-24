import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  BlobFallbackController,
  BlobFallbackMultiFileError,
  MULTI_FILE_FALLBACK_BANNER,
} from './blobFallback';
import type { VirtualFileTree } from '@/types/vibe';

/** Keep a counter so each createObjectURL call returns a unique URL. */
let urlCounter = 0;
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

beforeEach(() => {
  urlCounter = 0;
  createdUrls.length = 0;
  revokedUrls.length = 0;
  // Node has global URL but URL.createObjectURL is browser-only — install stubs.
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:test/${++urlCounter}`;
      createdUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revokedUrls.push(url);
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const singleFileTree = (path: string, content: string): VirtualFileTree => ({
  [path]: { path, kind: 'text', mime: 'text/html; charset=utf-8', content },
});

describe('BlobFallbackController.rebuild', () => {
  test('single-file text tree renders a fresh blob URL', () => {
    const controller = new BlobFallbackController();
    const tree = singleFileTree('index.html', '<!doctype html><body>hi</body></html>');
    const result = controller.rebuild(tree);
    expect(result.primaryUrl).toMatch(/^blob:test\/1$/);
    expect(result.primaryMime).toMatch(/text\/html/);
    expect(createdUrls).toHaveLength(1);
  });

  test('multi-file tree throws BlobFallbackMultiFileError with the EXACT banner', () => {
    const controller = new BlobFallbackController();
    const multi: VirtualFileTree = {
      'index.html': { path: 'index.html', kind: 'text', mime: 'text/html', content: '<html/>' },
      'styles.css': { path: 'styles.css', kind: 'text', mime: 'text/css', content: 'body{}' },
    };
    const thrown = (() => {
      try {
        controller.rebuild(multi);
        return null;
      } catch (err) {
        return err as Error;
      }
    })();
    expect(thrown).toBeInstanceOf(BlobFallbackMultiFileError);
    // Byte-for-byte match of the banner string — spec forbids any rephrase.
    expect(thrown?.message).toBe(MULTI_FILE_FALLBACK_BANNER);
    expect(MULTI_FILE_FALLBACK_BANNER).toBe(
      'Multi-file preview requires a Service Worker. Use Chrome/Firefox with SW enabled, or reduce the bundle to a single file to preview without one.',
    );
  });
});

describe('BlobFallbackController — three-rebuild cycle revoke accounting', () => {
  test('revoke count equals create count from two rebuilds ago', () => {
    const controller = new BlobFallbackController();
    const tree1 = singleFileTree('index.html', '<body>one</body>');
    const tree2 = singleFileTree('index.html', '<body>two</body>');
    const tree3 = singleFileTree('index.html', '<body>three</body>');

    const r1 = controller.rebuild(tree1);
    expect(createdUrls).toHaveLength(1);
    expect(revokedUrls).toHaveLength(0);

    const r2 = controller.rebuild(tree2);
    // r1's URL rotates into the `previous` set but is NOT yet revoked —
    // revocation is deferred until the caller calls revokePrevious() on load.
    expect(createdUrls).toHaveLength(2);
    expect(revokedUrls).toHaveLength(0);

    r2.revokePrevious();
    // Now r1's URL has been revoked (two rebuilds ago).
    expect(revokedUrls).toEqual([r1.primaryUrl]);

    const r3 = controller.rebuild(tree3);
    expect(createdUrls).toHaveLength(3);
    // r2's URL now sits in `previous`; not revoked yet.
    expect(revokedUrls).toEqual([r1.primaryUrl]);

    r3.revokePrevious();
    expect(revokedUrls).toEqual([r1.primaryUrl, r2.primaryUrl]);
    expect(revokedUrls).toHaveLength(2);
    expect(createdUrls.slice(0, 2)).toEqual(revokedUrls);
  });
});
