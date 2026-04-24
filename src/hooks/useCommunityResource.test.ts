// @vitest-environment happy-dom

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEntitySlug } from '@/lib/routing';
import { useCommunityResource } from './useCommunityResource';

// React 19 test env hint.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ResourceStatus = 'draft' | 'published';

interface AssetRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source: 'manual' | 'discord_import' | null;
  is_hidden: boolean;
  status: ResourceStatus;
  links: Array<{ label: string; url: string }>;
  type: string;
  lora_link: string | null;
  download_link: string | null;
  primary_media_id: string | null;
  created_at: string;
  member_id: string | null;
  creator: string | null;
}

interface MediaRecord {
  id: string;
  type: string;
  url: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  placeholder_image: string | null;
}

interface MemberRecord {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

interface ModelRecord {
  id: string;
  display_name: string | null;
  default_variant: string | null;
}

interface AssetModelRecord {
  asset_id: string;
  model_id: string;
  compatibility_note: string | null;
}

interface AssetMediaRecord {
  asset_id: string;
  media_id: string;
  sort_order: number;
  is_deleted: boolean;
}

const mockState = vi.hoisted(() => {
  const state = {
    db: {
      assets: [] as AssetRecord[],
      media: [] as MediaRecord[],
      members: [] as MemberRecord[],
      assetModels: [] as AssetModelRecord[],
      assetMedia: [] as AssetMediaRecord[],
      models: [] as ModelRecord[],
    },
  };

  const matchesEq = (row: Record<string, unknown>, column: string, value: unknown) => {
    if (column === 'member_id') {
      return String(row[column]) === String(value);
    }
    return row[column] === value;
  };

  const buildMediaRow = (mediaId: string | null) => {
    const media = state.db.media.find((row) => row.id === mediaId) ?? null;
    if (!media) return null;

    return {
      id: media.id,
      type: media.type,
      url: media.url,
      cloudflare_thumbnail_url: media.cloudflare_thumbnail_url,
      cloudflare_playback_hls_url: media.cloudflare_playback_hls_url,
      backup_thumbnail_url: media.backup_thumbnail_url,
      placeholder_image: media.placeholder_image,
    };
  };

  const buildAssetRow = (asset: AssetRecord) => ({
    id: asset.id,
    name: asset.name,
    slug: asset.slug,
    description: asset.description,
    source: asset.source,
    discord_guild_id: null,
    discord_channel_id: null,
    discord_thread_id: null,
    is_hidden: asset.is_hidden,
    status: asset.status,
    links: asset.links,
    type: asset.type,
    lora_link: asset.lora_link,
    download_link: asset.download_link,
    primary_media_id: asset.primary_media_id,
    created_at: asset.created_at,
    member_id: asset.member_id,
    creator: asset.creator,
    media: buildMediaRow(asset.primary_media_id),
  });

  const execute = async (queryState: {
    table: string;
    filters: Array<{ type: 'eq'; column: string; value: unknown }>;
    shouldSingle: boolean;
    orderBy?: { column: string; ascending: boolean };
  }) => {
    const applyFilters = <T extends Record<string, unknown>>(rows: T[]) => rows.filter((row) => (
      queryState.filters.every((filter) => matchesEq(row, filter.column, filter.value))
    ));

    switch (queryState.table) {
      case 'assets': {
        const rows = applyFilters(state.db.assets.map(buildAssetRow));
        if (queryState.shouldSingle) {
          const row = rows[0];
          if (!row) {
            return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
          }
          return { data: row, error: null };
        }
        return { data: rows, error: null };
      }
      case 'members': {
        const rows = applyFilters(state.db.members as unknown as Record<string, unknown>[]) as unknown as MemberRecord[];
        return {
          data: queryState.shouldSingle ? (rows[0] ?? null) : rows,
          error: queryState.shouldSingle && !rows[0] ? { code: 'PGRST116', message: 'No rows returned' } : null,
        };
      }
      case 'asset_media': {
        let rows = applyFilters(state.db.assetMedia as unknown as Record<string, unknown>[]) as unknown as AssetMediaRecord[];
        if (queryState.orderBy?.column === 'sort_order') {
          rows = [...rows].sort((left, right) => left.sort_order - right.sort_order);
        }
        return {
          data: rows.map((row) => ({
            sort_order: row.sort_order,
            media: buildMediaRow(row.media_id),
          })),
          error: null,
        };
      }
      case 'asset_models': {
        const rows = applyFilters(state.db.assetModels as unknown as Record<string, unknown>[]) as unknown as AssetModelRecord[];
        return {
          data: rows.map((row) => ({
            model_id: row.model_id,
            compatibility_note: row.compatibility_note,
            model: state.db.models.find((model) => model.id === row.model_id) ?? null,
          })),
          error: null,
        };
      }
      default:
        return { data: null, error: null };
    }
  };

  const createQuery = (table: string) => {
    const queryState = {
      table,
      filters: [] as Array<{ type: 'eq'; column: string; value: unknown }>,
      shouldSingle: false,
      orderBy: undefined as { column: string; ascending: boolean } | undefined,
    };

    const run = () => execute(queryState);

    const query = {
      select: (_columns?: string) => query,
      eq: (column: string, value: unknown) => {
        queryState.filters.push({ type: 'eq', column, value });
        return query;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        queryState.orderBy = { column, ascending: options?.ascending !== false };
        return query;
      },
      in: () => query,
      or: () => query,
      abortSignal: () => query,
      single: async () => {
        queryState.shouldSingle = true;
        return run();
      },
      maybeSingle: async () => {
        queryState.shouldSingle = true;
        return run();
      },
      then: (onFulfilled?: ((value: unknown) => unknown) | null, onRejected?: ((reason: unknown) => unknown) | null) =>
        run().then(onFulfilled, onRejected),
      catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
        run().catch(onRejected),
      finally: (onFinally?: (() => void) | null) =>
        run().finally(onFinally ?? undefined),
    };

    return query;
  };

  const from = vi.fn((table: string) => createQuery(table));

  const reset = () => {
    state.db.assets = [];
    state.db.media = [];
    state.db.members = [{
      member_id: '42',
      username: 'author',
      global_name: 'Author Name',
      avatar_url: 'https://example.com/avatar.webp',
    }];
    state.db.assetModels = [];
    state.db.assetMedia = [];
    state.db.models = [
      { id: 'model-flux', display_name: 'Flux Schnell', default_variant: 'schnell' },
    ];
    from.mockClear();
  };

  return {
    state,
    from,
    reset,
  };
});

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mockState.from,
  },
}));

interface HookSnapshot {
  resource: ReturnType<typeof useCommunityResource>['resource'];
  galleryMedia: ReturnType<typeof useCommunityResource>['galleryMedia'];
  assetModels: ReturnType<typeof useCommunityResource>['assetModels'];
  loading: boolean;
  error: string | null;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestHook: HookSnapshot = {
  resource: null,
  galleryMedia: [],
  assetModels: [],
  loading: true,
  error: null,
};

const flush = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitForCondition = async (predicate: () => boolean): Promise<void> => {
  for (let index = 0; index < 25; index += 1) {
    await flush();
    if (predicate()) return;
  }
  throw new Error('Condition not met before timeout');
};

beforeEach(() => {
  mockState.reset();
  latestHook = {
    resource: null,
    galleryMedia: [],
    assetModels: [],
    loading: true,
    error: null,
  };
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

function renderHookHarness(slug: string | undefined, options?: { asAuthor?: boolean }) {
  const Harness = (): React.ReactElement => {
    const result = useCommunityResource(slug, options);
    useEffect(() => {
      latestHook = {
        resource: result.resource,
        galleryMedia: result.galleryMedia,
        assetModels: result.assetModels,
        loading: result.loading,
        error: result.error,
      };
    }, [result.assetModels, result.error, result.galleryMedia, result.loading, result.resource]);

    return createElement('div');
  };

  return act(async () => {
    root!.render(createElement(Harness));
  });
}

describe('useCommunityResource', () => {
  it('does not return draft resources through the default public path', async () => {
    const assetId = '123e4567-e89b-12d3-a456-426614174000';
    mockState.state.db.assets = [{
      id: assetId,
      name: 'Draft Resource',
      slug: buildEntitySlug('Draft Resource', assetId),
      description: 'Hidden draft',
      source: 'manual',
      is_hidden: false,
      status: 'draft',
      links: [],
      type: 'lora',
      lora_link: null,
      download_link: null,
      primary_media_id: null,
      created_at: '2026-04-20T00:00:00.000Z',
      member_id: '42',
      creator: 'Author Name',
    }];

    await renderHookHarness(mockState.state.db.assets[0].slug);
    await waitForCondition(() => latestHook.loading === false);

    expect(latestHook.resource).toBeNull();
    expect(latestHook.error).toBe('Failed to load resource');
  });

  it('returns draft resources for authors and exposes the extended shape including assetModels', async () => {
    const assetId = '223e4567-e89b-12d3-a456-426614174000';
    const slug = buildEntitySlug('Author Draft', assetId);

    mockState.state.db.media = [
      {
        id: 'media-primary',
        type: 'image',
        url: 'https://example.com/primary.webp',
        cloudflare_thumbnail_url: 'https://example.com/primary-thumb.webp',
        cloudflare_playback_hls_url: null,
        backup_thumbnail_url: null,
        placeholder_image: null,
      },
      {
        id: 'media-gallery',
        type: 'image',
        url: 'https://example.com/gallery.webp',
        cloudflare_thumbnail_url: 'https://example.com/gallery-thumb.webp',
        cloudflare_playback_hls_url: null,
        backup_thumbnail_url: null,
        placeholder_image: null,
      },
    ];
    mockState.state.db.assets = [{
      id: assetId,
      name: 'Author Draft',
      slug,
      description: 'Draft body',
      source: 'manual',
      is_hidden: false,
      status: 'draft',
      links: [{ label: 'Download', url: 'https://example.com/download' }],
      type: 'workflow',
      lora_link: null,
      download_link: 'https://example.com/download',
      primary_media_id: 'media-primary',
      created_at: '2026-04-21T00:00:00.000Z',
      member_id: '42',
      creator: 'Author Name',
    }];
    mockState.state.db.assetMedia = [{
      asset_id: assetId,
      media_id: 'media-gallery',
      sort_order: 0,
      is_deleted: false,
    }];
    mockState.state.db.assetModels = [{
      asset_id: assetId,
      model_id: 'model-flux',
      compatibility_note: 'Works well',
    }];

    await renderHookHarness(slug, { asAuthor: true });
    await waitForCondition(() => latestHook.loading === false);

    expect(latestHook.error).toBeNull();
    expect(latestHook.resource).toMatchObject({
      id: assetId,
      memberId: '42',
      slug,
      status: 'draft',
      links: [{ label: 'Download', url: 'https://example.com/download' }],
      primaryMediaId: 'media-primary',
    });
    expect(latestHook.galleryMedia).toEqual([
      expect.objectContaining({
        id: 'media-gallery',
        url: 'https://example.com/gallery.webp',
      }),
    ]);
    expect(latestHook.assetModels).toEqual([
      {
        modelId: 'model-flux',
        compatibilityNote: 'Works well',
        displayName: 'Flux Schnell',
        defaultVariant: 'schnell',
      },
    ]);
  });

  it('surfaces the missing-row error path', async () => {
    await renderHookHarness(buildEntitySlug('Missing', '323e4567-e89b-12d3-a456-426614174000'));
    await waitForCondition(() => latestHook.loading === false);

    expect(latestHook.resource).toBeNull();
    expect(latestHook.error).toBe('Failed to load resource');
  });
});
