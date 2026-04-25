// @vitest-environment happy-dom

import React, { createElement, useEffect } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthorResourceDrafts } from './useAuthorResourceDrafts';

interface DraftResult {
  drafts: Array<{ id: string; title: string }>;
  loading: boolean;
  error: string | null;
}

const mockState = vi.hoisted(() => ({
  pendingResourceIds: ['asset-pending'],
  excludedIds: [] as string[],
  latestRows: [] as Array<{ id: string; name: string }>,
}));

vi.mock('@/hooks/useCommunityResources', () => ({
  fetchResourceMemberMap: vi.fn(async () => new Map()),
  mapCommunityResourceRow: (row: { id: string; name: string }) => ({
    id: row.id,
    title: row.name,
  }),
}));

const supabaseMock = vi.hoisted(() => {
  const makeQuery = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = [];
    let excludedIds: string[] = [];

    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push({ column, value });
        return query;
      },
      not: (column: string, operator: string, value: unknown) => {
        if (table === 'assets' && column === 'id' && operator === 'in' && typeof value === 'string') {
          excludedIds = value.slice(1, -1).split(',').filter(Boolean);
          mockState.excludedIds = excludedIds;
        }
        return query;
      },
      order: () => query,
      then: (
        onFulfilled?: ((value: unknown) => unknown) | null,
        onRejected?: ((reason: unknown) => unknown) | null,
      ) => {
        if (table === 'approval_requests') {
          return Promise.resolve({
            data: mockState.pendingResourceIds.map((id) => ({ attached_resource_id: id })),
            error: null,
          }).then(onFulfilled, onRejected);
        }

        const rows = [
          { id: 'asset-draft', name: 'Visible Draft', member_id: '42' },
          { id: 'asset-pending', name: 'Pending Approval Draft', member_id: '42' },
        ].filter((row) => !excludedIds.includes(row.id));
        mockState.latestRows = rows;

        return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected);
      },
      catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
        query.then(null, onRejected),
      finally: (onFinally?: (() => void) | null) =>
        query.then().finally(onFinally ?? undefined),
    };

    return query;
  };

  return {
    from: vi.fn((table: string) => makeQuery(table)),
  };
});

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: supabaseMock,
}));

let latestResult: DraftResult = { drafts: [], loading: true, error: null };

beforeEach(() => {
  mockState.pendingResourceIds = ['asset-pending'];
  mockState.excludedIds = [];
  mockState.latestRows = [];
  latestResult = { drafts: [], loading: true, error: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHookHarness(memberId = '42') {
  const Harness = (): React.ReactElement => {
    const result = useAuthorResourceDrafts(memberId);
    useEffect(() => {
      latestResult = result;
    }, [result]);
    return createElement('div');
  };

  render(createElement(Harness));
}

describe('useAuthorResourceDrafts', () => {
  it('excludes pending approval resource attachments from the drafts list', async () => {
    renderHookHarness();

    await waitFor(() => {
      expect(latestResult.loading).toBe(false);
    });

    expect(mockState.excludedIds).toEqual(['asset-pending']);
    expect(latestResult.drafts.map((draft) => draft.id)).toEqual(['asset-draft']);
  });
});
