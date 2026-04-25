// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { buildEntitySlug } from '@/lib/routing';
import { SubmitResourceForm } from './index';

type ResourceStatus = 'draft' | 'published';

interface AssetRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source: 'manual' | 'discord_import' | null;
  discord_guild_id: string | null;
  discord_channel_id: string | null;
  discord_thread_id: string | null;
  is_hidden: boolean;
  status: ResourceStatus;
  links: Array<{ label: string; url: string }>;
  type: string;
  lora_link: string | null;
  download_link: string | null;
  primary_media_id: string | null;
  created_at: string;
  member_id: string | number | null;
  creator: string | null;
  admin_status: string | null;
  self_attributed: boolean;
}

interface MediaRecord {
  id: string;
  type: string;
  member_id: string | number | null;
  source: string;
  admin_status: string | null;
  user_status: string | null;
  url: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  placeholder_image: string | null;
  metadata?: {
    bucket: string;
    path: string;
  } | null;
}

interface AssetMediaRecord {
  asset_id: string;
  media_id: string;
  sort_order: number;
  is_deleted: boolean;
}

interface AssetModelRecord {
  asset_id: string;
  model_id: string;
  compatibility_note: string | null;
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

const mockState = vi.hoisted(() => {
  const state = {
    auth: {
      user: { id: 'user-1' },
      profile: { memberId: '42', isAdmin: false },
      loading: false,
    },
    db: {
      assets: [] as AssetRecord[],
      media: [] as MediaRecord[],
      assetMedia: [] as AssetMediaRecord[],
      assetModels: [] as AssetModelRecord[],
      members: [] as MemberRecord[],
      models: [] as ModelRecord[],
    },
    counters: {
      asset: 0,
      media: 0,
    },
    assetWriteError: null as string | null,
    invokeResponses: [] as Array<{ message: string } | Error>,
    storageUploads: [] as Array<{ path: string; fileName: string; contentType: string }>,
  };

  const normalizeScalar = (value: unknown): string | number | boolean | null => {
    if (value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      return value;
    }
    return JSON.stringify(value);
  };

  const matchesEq = (row: Record<string, unknown>, column: string, value: unknown) => {
    const left = normalizeScalar(row[column]);
    const right = normalizeScalar(value);

    if (column === 'member_id') {
      return String(left) === String(right);
    }

    return left === right;
  };

  const matchesIn = (row: Record<string, unknown>, column: string, values: unknown[]) => {
    if (column === 'media_id') {
      return values.map(String).includes(String(row.media_id));
    }

    if (column === 'asset_id') {
      return values.map(String).includes(String(row.asset_id));
    }

    if (column === 'member_id') {
      return values.map(String).includes(String(row.member_id));
    }

    if (column === 'model_id') {
      return values.map(String).includes(String(row.model_id));
    }

    return values.map(normalizeScalar).includes(normalizeScalar(row[column]));
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
    discord_guild_id: asset.discord_guild_id,
    discord_channel_id: asset.discord_channel_id,
    discord_thread_id: asset.discord_thread_id,
    is_hidden: asset.is_hidden,
    status: asset.status,
    links: asset.links,
    type: asset.type,
    lora_link: asset.lora_link,
    download_link: asset.download_link,
    primary_media_id: asset.primary_media_id,
    created_at: asset.created_at,
    member_id: asset.member_id === null ? null : String(asset.member_id),
    creator: asset.creator,
    admin_status: asset.admin_status,
    self_attributed: asset.self_attributed,
    media: buildMediaRow(asset.primary_media_id),
  });

  const consumeAssetWriteError = () => {
    if (!state.assetWriteError) return null;
    const message = state.assetWriteError;
    state.assetWriteError = null;
    return { data: null, error: { message } };
  };

  const execute = async (queryState: {
    table: string;
    action: 'select' | 'insert' | 'update' | 'delete';
    filters: Array<{ type: 'eq' | 'in'; column: string; value: unknown }>;
    values: unknown;
    shouldSingle: boolean;
    orderBy?: { column: string; ascending: boolean };
  }) => {
    const applyFilters = <T extends Record<string, unknown>>(rows: T[]) => rows.filter((row) => (
      queryState.filters.every((filter) => (
        filter.type === 'eq'
          ? matchesEq(row, filter.column, filter.value)
          : matchesIn(row, filter.column, filter.value as unknown[])
      ))
    ));

    switch (queryState.table) {
      case 'assets': {
        if (queryState.action === 'select') {
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

        if (queryState.action === 'insert') {
          const writeError = consumeAssetWriteError();
          if (writeError) return writeError;

          const payload = (Array.isArray(queryState.values) ? queryState.values[0] : queryState.values) as Record<string, unknown>;
          state.counters.asset += 1;
          const id = `asset-${state.counters.asset}`;
          const slug = buildEntitySlug(String(payload.name ?? 'item'), id);
          const asset: AssetRecord = {
            id,
            name: String(payload.name ?? ''),
            slug,
            description: typeof payload.description === 'string' ? payload.description : null,
            source: 'manual',
            discord_guild_id: null,
            discord_channel_id: null,
            discord_thread_id: null,
            is_hidden: false,
            status: payload.status as ResourceStatus,
            links: Array.isArray(payload.links) ? payload.links as Array<{ label: string; url: string }> : [],
            type: String(payload.type ?? 'lora'),
            lora_link: typeof payload.lora_link === 'string' ? payload.lora_link : null,
            download_link: typeof payload.download_link === 'string' ? payload.download_link : null,
            primary_media_id: typeof payload.primary_media_id === 'string' ? payload.primary_media_id : null,
            created_at: '2026-04-24T10:00:00.000Z',
            member_id: payload.member_id as string | number | null,
            creator: 'Author Name',
            admin_status: typeof payload.admin_status === 'string' ? payload.admin_status : 'Listed',
            self_attributed: payload.self_attributed === true,
          };
          state.db.assets.push(asset);
          return { data: buildAssetRow(asset), error: null };
        }

        if (queryState.action === 'update') {
          const writeError = consumeAssetWriteError();
          if (writeError) return writeError;

          const matches = applyFilters(state.db.assets as unknown as Record<string, unknown>[]) as unknown as AssetRecord[];
          const asset = matches[0];
          if (!asset) {
            return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
          }

          const patch = queryState.values as Record<string, unknown>;
          Object.assign(asset, patch);
          asset.slug = buildEntitySlug(asset.name, asset.id);
          return { data: buildAssetRow(asset), error: null };
        }

        return { data: null, error: null };
      }

      case 'media': {
        if (queryState.action === 'insert') {
          const payload = (Array.isArray(queryState.values) ? queryState.values[0] : queryState.values) as Record<string, unknown>;
          state.counters.media += 1;
          const media: MediaRecord = {
            id: `media-${state.counters.media}`,
            type: String(payload.type ?? 'image'),
            member_id: payload.member_id as string | number | null,
            source: String(payload.source ?? 'resource'),
            admin_status: typeof payload.admin_status === 'string' ? payload.admin_status : null,
            user_status: typeof payload.user_status === 'string' ? payload.user_status : null,
            url: typeof payload.url === 'string' ? payload.url : null,
            cloudflare_thumbnail_url: typeof payload.cloudflare_thumbnail_url === 'string' ? payload.cloudflare_thumbnail_url : null,
            cloudflare_playback_hls_url: typeof payload.cloudflare_playback_hls_url === 'string' ? payload.cloudflare_playback_hls_url : null,
            backup_thumbnail_url: null,
            placeholder_image: null,
            metadata: payload.metadata as MediaRecord['metadata'],
          };
          state.db.media.push(media);
          return { data: { id: media.id, type: media.type }, error: null };
        }

        return { data: [], error: null };
      }

      case 'asset_media': {
        if (queryState.action === 'select') {
          let rows = applyFilters(state.db.assetMedia as unknown as Record<string, unknown>[]) as unknown as AssetMediaRecord[];
          if (queryState.orderBy?.column === 'sort_order') {
            rows = [...rows].sort((left, right) => (
              queryState.orderBy?.ascending
                ? left.sort_order - right.sort_order
                : right.sort_order - left.sort_order
            ));
          }

          return {
            data: rows.map((row) => ({
              asset_id: row.asset_id,
              media_id: row.media_id,
              sort_order: row.sort_order,
              media: buildMediaRow(row.media_id),
            })),
            error: null,
          };
        }

        if (queryState.action === 'insert') {
          const payloads = (Array.isArray(queryState.values) ? queryState.values : [queryState.values]) as Array<Record<string, unknown>>;
          payloads.forEach((payload) => {
            state.db.assetMedia.push({
              asset_id: String(payload.asset_id),
              media_id: String(payload.media_id),
              sort_order: Number(payload.sort_order ?? 0),
              is_deleted: false,
            });
          });
          return { data: null, error: null };
        }

        if (queryState.action === 'update') {
          const patch = queryState.values as Record<string, unknown>;
          const rows = applyFilters(state.db.assetMedia as unknown as Record<string, unknown>[]) as unknown as AssetMediaRecord[];
          rows.forEach((row) => {
            row.sort_order = Number(patch.sort_order ?? row.sort_order);
          });
          return { data: null, error: null };
        }

        if (queryState.action === 'delete') {
          const rows = applyFilters(state.db.assetMedia as unknown as Record<string, unknown>[]) as unknown as AssetMediaRecord[];
          state.db.assetMedia = state.db.assetMedia.filter((row) => !rows.includes(row));
          return { data: null, error: null };
        }

        return { data: null, error: null };
      }

      case 'asset_models': {
        if (queryState.action === 'select') {
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

        if (queryState.action === 'insert') {
          const payloads = (Array.isArray(queryState.values) ? queryState.values : [queryState.values]) as Array<Record<string, unknown>>;
          payloads.forEach((payload) => {
            state.db.assetModels.push({
              asset_id: String(payload.asset_id),
              model_id: String(payload.model_id),
              compatibility_note: typeof payload.compatibility_note === 'string' ? payload.compatibility_note : null,
            });
          });
          return { data: null, error: null };
        }

        if (queryState.action === 'update') {
          const patch = queryState.values as Record<string, unknown>;
          const rows = applyFilters(state.db.assetModels as unknown as Record<string, unknown>[]) as unknown as AssetModelRecord[];
          rows.forEach((row) => {
            row.compatibility_note = typeof patch.compatibility_note === 'string' ? patch.compatibility_note : null;
          });
          return { data: null, error: null };
        }

        if (queryState.action === 'delete') {
          const rows = applyFilters(state.db.assetModels as unknown as Record<string, unknown>[]) as unknown as AssetModelRecord[];
          state.db.assetModels = state.db.assetModels.filter((row) => !rows.includes(row));
          return { data: null, error: null };
        }

        return { data: null, error: null };
      }

      case 'members': {
        const rows = applyFilters(state.db.members as unknown as Record<string, unknown>[]) as unknown as MemberRecord[];
        if (queryState.shouldSingle) {
          return { data: rows[0] ?? null, error: rows[0] ? null : { code: 'PGRST116', message: 'No rows returned' } };
        }
        return { data: rows, error: null };
      }

      case 'models': {
        const rows = [...state.db.models].sort((left, right) => (
          (left.display_name ?? '').localeCompare(right.display_name ?? '')
        ));
        return { data: rows, error: null };
      }

      default:
        return { data: null, error: null };
    }
  };

  const createQuery = (table: string) => {
    const queryState = {
      table,
      action: 'select' as 'select' | 'insert' | 'update' | 'delete',
      filters: [] as Array<{ type: 'eq' | 'in'; column: string; value: unknown }>,
      values: undefined as unknown,
      shouldSingle: false,
      orderBy: undefined as { column: string; ascending: boolean } | undefined,
    };

    const run = () => execute(queryState);

    const query = {
      select: (_columns?: string) => query,
      insert: (values: unknown) => {
        queryState.action = 'insert';
        queryState.values = values;
        return query;
      },
      update: (values: unknown) => {
        queryState.action = 'update';
        queryState.values = values;
        return query;
      },
      delete: () => {
        queryState.action = 'delete';
        return query;
      },
      eq: (column: string, value: unknown) => {
        queryState.filters.push({ type: 'eq', column, value });
        return query;
      },
      in: (column: string, value: unknown[]) => {
        queryState.filters.push({ type: 'in', column, value });
        return query;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        queryState.orderBy = { column, ascending: options?.ascending !== false };
        return query;
      },
      abortSignal: () => query,
      or: () => query,
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

  const supabase = {
    from,
    storage: {
      from: () => ({
        upload: async (path: string, file: File, options?: { contentType?: string }) => {
          state.storageUploads.push({
            path,
            fileName: file.name,
            contentType: options?.contentType ?? file.type,
          });
          return { error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example/${path}` },
        }),
      }),
    },
    functions: {
      invoke: async (_name: string, _payload: unknown) => {
        const response = state.invokeResponses.shift();
        if (response instanceof Error) {
          throw response;
        }
        if (response) {
          return { data: null, error: response };
        }
        return { data: { ok: true }, error: null };
      },
    },
  };

  const reset = () => {
    state.auth = {
      user: { id: 'user-1' },
      profile: { memberId: '42', isAdmin: false },
      loading: false,
    };
    state.db.assets = [];
    state.db.media = [];
    state.db.assetMedia = [];
    state.db.assetModels = [];
    state.db.members = [{
      member_id: '42',
      username: 'author',
      global_name: 'Author Name',
      avatar_url: 'https://example.com/avatar.webp',
    }];
    state.db.models = [
      { id: 'model-flux', display_name: 'Flux Schnell', default_variant: 'schnell' },
      { id: 'model-sdxl', display_name: 'SDXL Base', default_variant: 'base' },
    ];
    state.counters.asset = 0;
    state.counters.media = 0;
    state.assetWriteError = null;
    state.invokeResponses = [];
    state.storageUploads = [];
    from.mockClear();
  };

  return {
    state,
    supabase,
    reset,
  };
});

const uploadState = vi.hoisted(() => ({ counter: 0 }));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => mockState.state.auth,
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: mockState.supabase,
}));

vi.mock('@/components/editor/MarkdownEditor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    onInlineUpload,
  }: {
    value: string;
    onChange: (value: string) => void;
    onInlineUpload?: (files: File[]) => Promise<string | null>;
  }) => (
    <div>
      <textarea
        aria-label="Description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        onClick={async () => {
          const snippet = await onInlineUpload?.([
            new File(['inline'], 'inline-image.png', { type: 'image/png' }),
          ]);
          if (snippet) {
            onChange(`${value}${snippet}`);
          }
        }}
      >
        Upload inline image
      </button>
    </div>
  ),
}));

vi.mock('@/components/forms/MediaUploader', () => ({
  MediaUploader: ({
    onFilesSelected,
    maxFiles,
  }: {
    onFilesSelected: (files: File[]) => void | Promise<void>;
    maxFiles?: number;
  }) => {
    const nextFile = (baseName: string, type: string) => {
      uploadState.counter += 1;
      const ext = type.startsWith('video/') ? 'mp4' : 'png';
      return new File(['mock'], `${baseName}-${uploadState.counter}.${ext}`, { type });
    };

    if (maxFiles === 1) {
      return (
        <button
          type="button"
          onClick={() => onFilesSelected([nextFile('primary-image', 'image/png')])}
        >
          Upload primary media
        </button>
      );
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => onFilesSelected([nextFile('gallery-image', 'image/png')])}
        >
          Upload gallery image
        </button>
        <button
          type="button"
          onClick={() => onFilesSelected([nextFile('gallery-video', 'video/mp4')])}
        >
          Upload gallery video
        </button>
      </div>
    );
  },
}));

function renderSubmitResourceForm(entry: string, path = '/submit/resource') {
  const router = createMemoryRouter([
    {
      path,
      element: <SubmitResourceForm />,
    },
    {
      path: '/resources/:slug',
      element: <div data-testid="resource-detail-route">resource detail</div>,
    },
  ], {
    initialEntries: [entry],
  });

  render(<RouterProvider router={router} />);
  return { router };
}

function renderApprovalResourceForm({
  onSubmit = vi.fn().mockResolvedValue(undefined),
  submitDisabled = false,
}: {
  onSubmit?: (data: Parameters<NonNullable<ComponentProps<typeof SubmitResourceForm>['onSubmit']>>[0]) => Promise<void>;
  submitDisabled?: boolean;
} = {}) {
  const router = createMemoryRouter([
    {
      path: '/approval',
      element: (
        <SubmitResourceForm
          inline
          mode="approval-request"
          submitLabel="Submit for approval"
          submitDisabled={submitDisabled}
          onSubmit={onSubmit}
        />
      ),
    },
    {
      path: '/resources/:slug',
      element: <div data-testid="resource-detail-route">resource detail</div>,
    },
  ], {
    initialEntries: ['/approval'],
  });

  render(<RouterProvider router={router} />);
  return { router, onSubmit };
}

function fillLink(label: string, url: string) {
  const inputs = screen.getAllByPlaceholderText(/label|https:\/\/example\.com\/resource/i);
  const [labelInput, urlInput] = inputs as HTMLInputElement[];
  fireEvent.change(labelInput, { target: { value: label } });
  fireEvent.change(urlInput, { target: { value: url } });
}

function confirmSelfAttributed() {
  const checkbox = screen.getByRole('checkbox', { name: /i made this/i });
  if (!(checkbox as HTMLInputElement).checked) {
    fireEvent.click(checkbox);
  }
}

beforeEach(() => {
  mockState.reset();
  uploadState.counter = 0;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SubmitResourceForm', () => {
  it('blocks publish when the required name field is missing', async () => {
    renderSubmitResourceForm('/submit/resource');

    expect(screen.getByRole('button', { name: /publish resource/i }).hasAttribute('disabled')).toBe(true);
    expect(mockState.state.db.assets).toHaveLength(0);
  });

  it('requires the I made this checkbox before creating a resource', async () => {
    renderSubmitResourceForm('/submit/resource');

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Unchecked Resource' } });

    expect((screen.getByRole('checkbox', { name: /i made this/i }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('button', { name: /publish resource/i }).hasAttribute('disabled')).toBe(true);

    confirmSelfAttributed();

    expect(screen.getByRole('button', { name: /publish resource/i }).hasAttribute('disabled')).toBe(false);
  });

  it('publishes a resource with status, media, links, models, and primary media id, then redirects to the canonical detail route', async () => {
    const { router } = renderSubmitResourceForm('/submit/resource');

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Publishable Resource' } });
    fireEvent.click(screen.getByRole('button', { name: /upload gallery image/i }));
    fillLink('Download', 'https://example.com/download');
    confirmSelfAttributed();
    await waitFor(() => {
      expect(screen.getByText(/media-1/i)).not.toBeNull();
    });

    fireEvent.change(await screen.findByRole('combobox', { name: /model compatibility/i }), {
      target: { value: 'model-flux' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /^flux schnell(?: \(note\))?$/i }));
    fireEvent.change(screen.getByPlaceholderText(/compatibility note/i), { target: { value: 'Best on Flux Schnell' } });
    fireEvent.click(screen.getByRole('button', { name: /publish resource/i }));

    await waitFor(() => {
      expect(mockState.state.db.assets).toHaveLength(1);
      expect(mockState.state.db.assetMedia).toHaveLength(1);
      expect(mockState.state.db.assetModels).toHaveLength(1);
    });

    const createdAsset = mockState.state.db.assets[0];
    const galleryMediaId = mockState.state.db.media[0]?.id;
    expect(createdAsset.status).toBe('published');
    expect(createdAsset.self_attributed).toBe(true);
    expect(createdAsset.links).toEqual([{ label: 'Download', url: 'https://example.com/download' }]);
    expect(createdAsset.primary_media_id).toBe(galleryMediaId);
    expect(mockState.state.db.assetMedia).toEqual([
      {
        asset_id: createdAsset.id,
        media_id: galleryMediaId,
        sort_order: 0,
        is_deleted: false,
      },
    ]);
    expect(mockState.state.db.assetModels).toEqual([
      {
        asset_id: createdAsset.id,
        model_id: 'model-flux',
        compatibility_note: 'Best on Flux Schnell',
      },
    ]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/resources/${createdAsset.slug}`);
      expect(screen.getByTestId('resource-detail-route')).not.toBeNull();
    });
  });

  it('saves a draft with status draft', async () => {
    renderSubmitResourceForm('/submit/resource');

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Draft Resource' } });
    confirmSelfAttributed();
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    expect(mockState.state.db.assets[0]?.status).toBe('draft');
    expect(mockState.state.db.assets[0]?.self_attributed).toBe(true);
  });

  it('loads a draft in edit mode, applies diffs across junction tables, and updates status', async () => {
    const existingId = '123e4567-e89b-12d3-a456-426614174000';
    const existingSlug = buildEntitySlug('Existing Draft', existingId);

    mockState.state.db.media = [
      {
        id: 'media-existing-primary',
        type: 'image',
        member_id: '42',
        source: 'resource',
        admin_status: 'Listed',
        user_status: 'Listed',
        url: 'https://example.com/existing-primary.webp',
        cloudflare_thumbnail_url: 'https://example.com/existing-primary.webp',
        cloudflare_playback_hls_url: null,
        backup_thumbnail_url: null,
        placeholder_image: null,
        metadata: null,
      },
      {
        id: 'media-existing-gallery',
        type: 'image',
        member_id: '42',
        source: 'resource',
        admin_status: 'Listed',
        user_status: 'Listed',
        url: 'https://example.com/existing-gallery.webp',
        cloudflare_thumbnail_url: 'https://example.com/existing-gallery.webp',
        cloudflare_playback_hls_url: null,
        backup_thumbnail_url: null,
        placeholder_image: null,
        metadata: null,
      },
    ];
    mockState.state.db.assets = [{
      id: existingId,
      name: 'Existing Draft',
      slug: existingSlug,
      description: 'Existing description',
      source: 'manual',
      discord_guild_id: null,
      discord_channel_id: null,
      discord_thread_id: null,
      is_hidden: false,
      status: 'draft',
      links: [{ label: 'Old link', url: 'https://example.com/old' }],
      type: 'lora',
      lora_link: 'https://example.com/old',
      download_link: null,
      primary_media_id: 'media-existing-primary',
      created_at: '2026-04-20T00:00:00.000Z',
      member_id: '42',
      creator: 'Author Name',
      admin_status: 'Listed',
      self_attributed: true,
    }];
    mockState.state.db.assetMedia = [{
      asset_id: existingId,
      media_id: 'media-existing-gallery',
      sort_order: 0,
      is_deleted: false,
    }];
    mockState.state.db.assetModels = [{
      asset_id: existingId,
      model_id: 'model-flux',
      compatibility_note: 'Old note',
    }];

    const { router } = renderSubmitResourceForm(`/resources/${existingSlug}?edit=1`, '/resources/:slug');

    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Existing Draft');
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Edited Draft' } });

    const inputs = screen.getAllByPlaceholderText(/label|https:\/\/example\.com\/resource/i);
    fireEvent.change(inputs[0] as HTMLInputElement, { target: { value: 'New link' } });
    fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'https://example.com/new' } });

    fireEvent.click(screen.getByRole('button', { name: /remove gallery item 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /upload gallery image/i }));
    await waitFor(() => {
      expect(screen.getByText(/media-1/i)).not.toBeNull();
    });

    fireEvent.click(await screen.findByRole('button', { name: /remove flux schnell/i }));
    fireEvent.change(screen.getByRole('combobox', { name: /model compatibility/i }), {
      target: { value: 'model-sdxl' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /^sdxl base(?: \(note\))?$/i }));
    fireEvent.change(screen.getByPlaceholderText(/compatibility note/i), { target: { value: 'Runs well on SDXL' } });

    fireEvent.click(screen.getByRole('button', { name: /publish resource/i }));

    await waitFor(() => {
      expect(mockState.state.db.assetMedia).toHaveLength(1);
      expect(mockState.state.db.assetModels).toHaveLength(1);
      expect(mockState.state.db.assets[0]?.status).toBe('published');
    });

    expect(mockState.state.db.assets[0]?.status).toBe('published');
    expect(mockState.state.db.assets[0]?.self_attributed).toBe(true);
    expect(mockState.state.db.assets[0]?.name).toBe('Edited Draft');
    expect(mockState.state.db.assets[0]?.links).toEqual([{ label: 'New link', url: 'https://example.com/new' }]);
    expect(mockState.state.db.assetMedia).toEqual([
      {
        asset_id: existingId,
        media_id: mockState.state.db.media.at(-1)?.id ?? '',
        sort_order: 0,
        is_deleted: false,
      },
    ]);
    expect(mockState.state.db.assetModels).toEqual([
      {
        asset_id: existingId,
        model_id: 'model-sdxl',
        compatibility_note: 'Runs well on SDXL',
      },
    ]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/resources/${mockState.state.db.assets[0]?.slug}`);
    });
  });

  it('pre-checks I made this in edit mode for legacy backfilled self_attributed resources', async () => {
    const existingId = '423e4567-e89b-12d3-a456-426614174000';
    const existingSlug = buildEntitySlug('Legacy Resource', existingId);

    mockState.state.db.assets = [{
      id: existingId,
      name: 'Legacy Resource',
      slug: existingSlug,
      description: 'Existing description',
      source: 'manual',
      discord_guild_id: null,
      discord_channel_id: null,
      discord_thread_id: null,
      is_hidden: false,
      status: 'draft',
      links: [],
      type: 'workflow',
      lora_link: null,
      download_link: null,
      primary_media_id: null,
      created_at: '2026-04-20T00:00:00.000Z',
      member_id: '42',
      creator: 'Author Name',
      admin_status: 'Listed',
      self_attributed: true,
    }];

    renderSubmitResourceForm(`/resources/${existingSlug}?edit=1`, '/resources/:slug');

    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Legacy Resource');
    });

    expect((screen.getByRole('checkbox', { name: /i made this/i }) as HTMLInputElement).checked).toBe(true);
  });

  it('surfaces asset write errors in the UI', async () => {
    mockState.state.assetWriteError = 'new row violates row-level security policy for table "assets"';

    renderSubmitResourceForm('/submit/resource');

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'RLS Blocked' } });
    confirmSelfAttributed();
    fireEvent.click(screen.getByRole('button', { name: /publish resource/i }));

    expect(await screen.findByText(/row-level security policy/i)).not.toBeNull();
  });

  it('inserts inline-uploaded images into the description as plain markdown', async () => {
    renderSubmitResourceForm('/submit/resource');

    fireEvent.click(screen.getByRole('button', { name: /upload inline image/i }));

    await waitFor(() => {
      const description = screen.getByLabelText('Description') as HTMLTextAreaElement;
      expect(description.value).toContain('![inline-image](');
      expect(description.value).toContain('https://storage.example/');
    });
  });

  it('does not abort the submit flow when Cloudflare Stream ingest fails for a gallery video upload', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockState.state.invokeResponses.push({ message: 'stream ingest failed' });

    const { router } = renderSubmitResourceForm('/submit/resource');

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Video Gallery Resource' } });
    fireEvent.click(screen.getByRole('button', { name: /upload gallery video/i }));
    confirmSelfAttributed();
    await waitFor(() => {
      expect(screen.getByText('media-1')).not.toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: /publish resource/i }));

    await waitFor(() => {
      expect(mockState.state.db.assets).toHaveLength(1);
      expect(mockState.state.db.assetMedia).toHaveLength(1);
    });

    const createdAsset = mockState.state.db.assets[0];
    expect(createdAsset).toBeDefined();
    expect(mockState.state.db.assetMedia).toHaveLength(1);
    expect(mockState.state.db.media[0]?.type).toBe('video');
    expect(warnSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/resources/${createdAsset.slug}`);
    });

    warnSpy.mockRestore();
  });

  it('delegates approval-request submission without writing an asset or navigating', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { router } = renderApprovalResourceForm({ onSubmit });

    expect(screen.queryByRole('button', { name: /save draft/i })).toBeNull();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Approval Resource' } });
    fillLink('Download', 'https://example.com/download');
    confirmSelfAttributed();
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        id: undefined,
        memberId: '42',
        name: 'Approval Resource',
        description: '',
        type: 'lora',
        links: [{
          label: 'Download',
          url: 'https://example.com/download',
          description: null,
          source: 'link',
          fileName: null,
        }],
        primaryMediaId: null,
        selfAttributed: true,
        galleryItems: [],
        modelItems: [],
      }));
    });
    expect(mockState.state.db.assets).toHaveLength(0);
    expect(router.state.location.pathname).toBe('/approval');
  });

  it('honors submitDisabled in approval-request mode even when internal form fields are valid', () => {
    renderApprovalResourceForm({ submitDisabled: true });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Ready Resource' } });
    confirmSelfAttributed();

    expect(screen.getByRole('button', { name: /submit for approval/i }).hasAttribute('disabled')).toBe(true);
  });
});
