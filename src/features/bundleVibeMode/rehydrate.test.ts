// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildBundleUrl } from '@/features/bundlePosts/buildBundleUrl';
import type { BundleManifestV1 } from '@/types/post';

interface SupabaseInvokeArgs {
  body: { bundleVersionId: string };
}

interface SupabaseState {
  invoke: ReturnType<typeof vi.fn>;
}

vi.mock('@/lib/supabase', () => {
  const state: SupabaseState = {
    invoke: vi.fn(),
  };
  return {
    __esModule: true,
    supabase: {
      functions: {
        invoke: state.invoke,
      },
    },
    __testState: state,
  };
});

import * as supabaseModule from '@/lib/supabase';
import { RehydrateAuthError, rehydrateTreeFromBundle } from './rehydrate';

const supabaseState = (supabaseModule as unknown as { __testState: SupabaseState }).__testState;

const VERSION_ID = 'bundle-version-1';
const POST_ID = 'post-draft-1';
const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

const manifest: BundleManifestV1 = {
  schemaVersion: 1,
  title: 'Rehydration Test',
  entry: 'index.html',
  ogImage: 'assets/cover.png',
  layout: { mode: 'inline-auto', minHeight: 420, maxHeight: 1600 },
};

const manifestJson = JSON.stringify(manifest, null, 2);

const makeTextResponse = (body: string, contentType: string): Response =>
  new Response(body, {
    status: 200,
    headers: { 'content-type': contentType },
  });

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const makeBinaryResponse = (bytes: Uint8Array, contentType: string): Response =>
  new Response(new Blob([toArrayBuffer(bytes)], { type: contentType }), {
    status: 200,
    headers: { 'content-type': contentType },
  });

beforeEach(() => {
  supabaseState.invoke.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('rehydrateTreeFromBundle', () => {
  test('acquires a preview token and threads it through every bundle fetch', async () => {
    supabaseState.invoke.mockResolvedValue({
      data: { token: 'tok-xyz' },
      error: null,
    });
    const fetchUrls: string[] = [];
    const putAsset = vi.fn(async () => {});
    const html = `<!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="styles.css" />
        </head>
        <body>
          <img src="assets/cover.png" />
          <script src="app.js"></script>
        </body>
      </html>`;

    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      fetchUrls.push(href);
      if (href === buildBundleUrl(VERSION_ID, 'index.html', 'tok-xyz')) {
        return makeTextResponse(html, 'text/html; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'styles.css', 'tok-xyz')) {
        return makeTextResponse('body { color: red; }', 'text/css; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'app.js', 'tok-xyz')) {
        return makeTextResponse('console.log("ok");', 'application/javascript; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'assets/cover.png', 'tok-xyz')) {
        return makeBinaryResponse(PNG_BYTES, 'image/png');
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });

    const result = await rehydrateTreeFromBundle({
      bundleVersionId: VERSION_ID,
      manifest,
      postId: POST_ID,
      fetchImpl,
      putAsset,
    });

    expect(supabaseState.invoke).toHaveBeenCalledWith('issue-preview-token', {
      body: { bundleVersionId: VERSION_ID },
    } satisfies SupabaseInvokeArgs);
    expect([...fetchUrls].sort()).toEqual(
      [
        buildBundleUrl(VERSION_ID, 'index.html', 'tok-xyz'),
        buildBundleUrl(VERSION_ID, 'assets/cover.png', 'tok-xyz'),
        buildBundleUrl(VERSION_ID, 'styles.css', 'tok-xyz'),
        buildBundleUrl(VERSION_ID, 'app.js', 'tok-xyz'),
      ].sort(),
    );
    expect(fetchUrls.every((url) => url.endsWith('?token=tok-xyz'))).toBe(true);
    expect(result.tree['post.json']).toMatchObject({
      kind: 'text',
      mime: 'application/json; charset=utf-8',
      content: manifestJson,
    });
    expect(result.tree['index.html']).toMatchObject({
      kind: 'text',
      mime: 'text/html; charset=utf-8',
      content: html,
    });
    expect(result.tree['styles.css']).toMatchObject({
      kind: 'text',
      mime: 'text/css; charset=utf-8',
      content: 'body { color: red; }',
    });
    expect(result.tree['app.js']).toMatchObject({
      kind: 'text',
      mime: 'application/javascript; charset=utf-8',
      content: 'console.log("ok");',
    });
    expect(result.tree['assets/cover.png']).toMatchObject({
      kind: 'binary-asset',
      mime: 'image/png',
    });
    expect(result.tree['assets/cover.png']?.assetId).toEqual(expect.any(String));
    expect(putAsset).toHaveBeenCalledTimes(1);
    expect(putAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        postDraftId: POST_ID,
        originalFilename: 'cover.png',
        mime: 'image/png',
        bytes: PNG_BYTES,
      }),
    );
    expect(result.warnings).toEqual([]);
  });

  test('falls back to the public token-less path when post.json is readable without a token', async () => {
    supabaseState.invoke.mockResolvedValue({
      data: { token: null },
      error: null,
    });
    const fetchUrls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      fetchUrls.push(href);
      if (href === buildBundleUrl(VERSION_ID, 'post.json')) {
        return makeTextResponse(manifestJson, 'application/json; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'index.html')) {
        return makeTextResponse('<!doctype html><html><body>public</body></html>', 'text/html; charset=utf-8');
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });

    const result = await rehydrateTreeFromBundle({
      bundleVersionId: VERSION_ID,
      manifest: { ...manifest, ogImage: undefined },
      postId: POST_ID,
      fetchImpl,
    });

    expect(supabaseState.invoke).toHaveBeenCalledTimes(1);
    expect(fetchUrls).toEqual([buildBundleUrl(VERSION_ID, 'post.json'), buildBundleUrl(VERSION_ID, 'index.html')]);
    expect(fetchUrls.some((url) => url.includes('?token='))).toBe(false);
    expect(result.tree['index.html']).toMatchObject({
      kind: 'text',
      content: '<!doctype html><html><body>public</body></html>',
    });
    expect(result.warnings).toEqual([]);
  });

  test('raises RehydrateAuthError when preview-token issuance fails and the public probe is unauthorized', async () => {
    supabaseState.invoke.mockRejectedValue(new Error('token denied'));
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (href === buildBundleUrl(VERSION_ID, 'post.json')) {
        return new Response('forbidden', { status: 403 });
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });

    await expect(
      rehydrateTreeFromBundle({
        bundleVersionId: VERSION_ID,
        manifest,
        postId: POST_ID,
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(RehydrateAuthError);
  });

  test('logs warnings for per-file 404s and continues hydrating the rest of the bundle', async () => {
    supabaseState.invoke.mockResolvedValue({
      data: { token: 'tok-xyz' },
      error: null,
    });
    const html = `<!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="styles.css" />
        </head>
        <body>
          <img src="assets/missing.png" />
          <script src="app.js"></script>
        </body>
      </html>`;

    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (href === buildBundleUrl(VERSION_ID, 'index.html', 'tok-xyz')) {
        return makeTextResponse(html, 'text/html; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'styles.css', 'tok-xyz')) {
        return makeTextResponse('body { background: black; }', 'text/css; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'app.js', 'tok-xyz')) {
        return makeTextResponse('console.log("still fine");', 'application/javascript; charset=utf-8');
      }
      if (href === buildBundleUrl(VERSION_ID, 'assets/missing.png', 'tok-xyz')) {
        return new Response('missing', { status: 404 });
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });

    const result = await rehydrateTreeFromBundle({
      bundleVersionId: VERSION_ID,
      manifest: { ...manifest, ogImage: undefined },
      postId: POST_ID,
      fetchImpl,
      putAsset: vi.fn(async () => {}),
    });

    expect(result.tree['index.html']).toBeDefined();
    expect(result.tree['styles.css']).toBeDefined();
    expect(result.tree['app.js']).toBeDefined();
    expect(result.tree['assets/missing.png']).toBeUndefined();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Failed to fetch assets/missing.png: HTTP 404.')]),
    );
  });
});
