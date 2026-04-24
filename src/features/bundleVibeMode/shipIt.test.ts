import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { parseManifestJson } from '@/features/bundlePosts/manifestSchema';
import type { BundleManifestV1 } from '@/types/post';
import type { VirtualFileTree } from '@/types/vibe';

const POST_ID = 'ship-draft-abcdefgh';

interface SupabaseTestState {
  capturedZipBlob: Blob | null;
  invoke: ReturnType<typeof vi.fn>;
}

vi.mock('@/lib/supabase', () => {
  const state: SupabaseTestState = {
    capturedZipBlob: null,
    invoke: vi.fn(),
  };

  return {
    __esModule: true,
    isSupabaseConfigured: true,
    supabase: { functions: { invoke: state.invoke } },
    __testState: state,
  };
});

vi.mock('./db', () => ({
  getAsset: vi.fn(async () => null),
}));

import { shipVibeBundle } from './shipIt';
import * as supabaseModule from '@/lib/supabase';

const state = (supabaseModule as unknown as { __testState: SupabaseTestState }).__testState;

const minimalManifest: BundleManifestV1 = {
  schemaVersion: 1,
  title: 'Test post',
  entry: 'index.html',
  layout: { mode: 'inline-auto', minHeight: 420, maxHeight: 1600 },
};

const makeTree = (overrides: Partial<BundleManifestV1> = {}): VirtualFileTree => ({
  'index.html': {
    path: 'index.html',
    kind: 'text',
    mime: 'text/html; charset=utf-8',
    content: '<!doctype html><html><head></head><body>hi</body></html>',
  },
  'post.json': {
    path: 'post.json',
    kind: 'text',
    mime: 'application/json; charset=utf-8',
    content: JSON.stringify({ ...minimalManifest, ...overrides }, null, 2),
  },
});

beforeEach(() => {
  state.capturedZipBlob = null;
  state.invoke.mockReset();
  state.invoke.mockImplementation(async (_fn: string, opts: { body: FormData }) => {
    const zipEntry = opts.body.get('zip');
    if (zipEntry instanceof Blob) state.capturedZipBlob = zipEntry;
    return {
      data: { bundleVersionId: 'bv-test-id', previewUrl: '/posts/id/xyz?preview=bv-test-id' },
      error: null,
    };
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function unzipAndReadManifest(blob: Blob): Promise<BundleManifestV1> {
  const arrayBuffer = await blob.arrayBuffer();
  const bucket = unzipSync(new Uint8Array(arrayBuffer));
  expect(Object.keys(bucket)).toContain('post.json');
  const raw = strFromU8(bucket['post.json']);
  return JSON.parse(raw) as BundleManifestV1;
}

describe('shipVibeBundle - manifest.source stamping', () => {
  test('injects source:"vibe" when the manifest has no source field', async () => {
    const result = await shipVibeBundle({
      tree: makeTree(),
      postId: POST_ID,
      title: 'Test post',
    });

    expect(result).toEqual({
      kind: 'shipped',
      bundleVersionId: 'bv-test-id',
      previewUrl: '/posts/id/xyz?preview=bv-test-id',
    });
    expect(state.capturedZipBlob).not.toBeNull();

    const manifest = await unzipAndReadManifest(state.capturedZipBlob!);
    expect(manifest.source).toBe('vibe');
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.entry).toBe('index.html');
  });

  test('preserves explicit source:"manual" instead of overriding', async () => {
    await shipVibeBundle({
      tree: makeTree({ source: 'manual' }),
      postId: POST_ID,
      title: 'Test post',
    });

    expect(state.capturedZipBlob).not.toBeNull();
    const manifest = await unzipAndReadManifest(state.capturedZipBlob!);
    expect(manifest.source).toBe('manual');
  });

  test('FormData uses exact field names `postId` + `zip` + process-bundle function', async () => {
    await shipVibeBundle({
      tree: makeTree(),
      postId: POST_ID,
      title: 'Test post',
    });

    expect(state.invoke).toHaveBeenCalledTimes(1);
    const [fnName, opts] = state.invoke.mock.calls[0] as [string, { body: FormData }];
    expect(fnName).toBe('process-bundle');
    expect(opts.body.get('postId')).toBe(POST_ID);
    expect(opts.body.get('zip')).toBeInstanceOf(Blob);
  });
});

describe('shipVibeBundle - stamped manifest round-trips through validateManifest', () => {
  test('the client-side validator accepts the shipped manifest', async () => {
    await shipVibeBundle({
      tree: makeTree(),
      postId: POST_ID,
      title: 'Test post',
    });

    const manifest = await unzipAndReadManifest(state.capturedZipBlob!);
    const parseResult = parseManifestJson(JSON.stringify(manifest));
    expect(parseResult.ok).toBe(true);
    if (parseResult.ok) expect(parseResult.manifest.source).toBe('vibe');
  });
});

describe('shipVibeBundle - duplicate uploads stay non-destructive', () => {
  test('returns a duplicate result when process-bundle reports bundle_duplicate_upload', async () => {
    state.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'bundle_duplicate_upload' },
    });

    const result = await shipVibeBundle({
      tree: makeTree(),
      postId: POST_ID,
      title: 'Test post',
    });

    expect(result).toEqual({ kind: 'duplicate' });
  });
});
