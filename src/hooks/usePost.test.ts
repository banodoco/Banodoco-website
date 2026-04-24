// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// React 19 test env hint.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const POST_ID = '123e4567-e89b-12d3-a456-426614174000';

interface SupabaseState {
  from: ReturnType<typeof vi.fn>;
  executionCounts: Record<string, number>;
}

vi.mock('@/lib/supabase', () => {
  const state: SupabaseState = {
    from: vi.fn(),
    executionCounts: {
      posts: 0,
      post_media: 0,
      post_assets: 0,
      members: 0,
      media: 0,
      post_bundles: 0,
    },
  };

  const executeForTable = async (table: string) => {
    state.executionCounts[table] = (state.executionCounts[table] ?? 0) + 1;

    switch (table) {
      case 'posts':
        return {
          data: {
            id: POST_ID,
            title: 'Hook test post',
            body: null,
            slug: null,
            status: 'draft',
            admin_status: null,
            render_mode: 'markdown',
            active_bundle_version_id: null,
            member_id: null,
            cover_media_id: null,
            published_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          error: null,
        };
      case 'post_media':
        return { data: [], error: null };
      case 'post_assets':
        return {
          data: [
            {
              post_id: POST_ID,
              asset_id: 'published-asset',
              asset: {
                id: 'published-asset',
                name: 'Published asset',
                description: null,
                type: 'lora',
                lora_link: 'https://example.com/published',
                download_link: null,
                created_at: '2026-01-01T00:00:00.000Z',
                creator: 'Published Author',
                member_id: null,
                status: 'published',
                media: null,
              },
            },
          ],
          error: null,
        };
      case 'members':
      case 'media':
      case 'post_bundles':
        return { data: [], error: null };
      default:
        return { data: null, error: null };
    }
  };

  const makeQuery = (table: string) => {
    const query = {
      select: () => query,
      abortSignal: () => query,
      eq: () => query,
      order: () => query,
      in: () => query,
      single: () => executeForTable(table),
      maybeSingle: () => executeForTable(table),
      then: (onFulfilled?: ((value: unknown) => unknown) | null, onRejected?: ((reason: unknown) => unknown) | null) =>
        executeForTable(table).then(onFulfilled, onRejected),
      catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
        executeForTable(table).catch(onRejected),
      finally: (onFinally?: (() => void) | null) =>
        executeForTable(table).finally(onFinally ?? undefined),
    };

    return query;
  };

  state.from.mockImplementation((table: string) => makeQuery(table));

  return {
    __esModule: true,
    isSupabaseConfigured: true,
    supabase: {
      from: state.from,
    },
    __testState: state,
  };
});

import * as supabaseModule from '@/lib/supabase';
import { usePost } from './usePost';

interface HookSnapshot {
  refetch: (() => void) | null;
  loading: boolean;
  error: string | null;
  assetsById: Record<string, { id: string }>;
}

const supabaseState = (supabaseModule as unknown as { __testState: SupabaseState }).__testState;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestHook: HookSnapshot = { refetch: null, loading: true, error: null, assetsById: {} };

const flush = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitForCondition = async (predicate: () => boolean): Promise<void> => {
  for (let index = 0; index < 20; index += 1) {
    await flush();
    if (predicate()) return;
  }
  throw new Error('Condition not met before timeout');
};

beforeEach(() => {
  latestHook = { refetch: null, loading: true, error: null, assetsById: {} };
  Object.keys(supabaseState.executionCounts).forEach((key) => {
    supabaseState.executionCounts[key] = 0;
  });
  supabaseState.from.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

describe('usePost', () => {
  test('exposes refetch and re-runs the loader when invoked', async () => {
    const Harness = (): React.ReactElement => {
      const result = usePost(POST_ID);
      useEffect(() => {
        latestHook = {
          refetch: result.refetch,
          loading: result.loading,
          error: result.error,
          assetsById: result.assetsById,
        };
      }, [result.assetsById, result.error, result.loading, result.refetch]);
      return createElement('div');
    };

    await act(async () => {
      root!.render(createElement(Harness));
    });

    await waitForCondition(() => latestHook.loading === false);

    expect(typeof latestHook.refetch).toBe('function');
    expect(latestHook.error).toBeNull();
    expect(supabaseState.executionCounts.posts).toBe(1);

    const initialFromCalls = supabaseState.from.mock.calls.length;

    await act(async () => {
      latestHook.refetch?.();
    });

    await waitForCondition(() => supabaseState.executionCounts.posts === 2);

    expect(supabaseState.executionCounts.posts).toBe(2);
    expect(supabaseState.from.mock.calls.length).toBeGreaterThan(initialFromCalls);
  });

  test('keeps only published embedded assets in the resolved asset map', async () => {
    const Harness = (): React.ReactElement => {
      const result = usePost(POST_ID);
      useEffect(() => {
        latestHook = {
          refetch: result.refetch,
          loading: result.loading,
          error: result.error,
          assetsById: result.assetsById,
        };
      }, [result.assetsById, result.error, result.loading, result.refetch]);
      return createElement('div');
    };

    await act(async () => {
      root!.render(createElement(Harness));
    });

    await waitForCondition(() => latestHook.loading === false);

    expect(Object.keys(latestHook.assetsById)).toEqual(['published-asset']);
  });
});
