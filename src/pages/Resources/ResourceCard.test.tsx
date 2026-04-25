// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceCard } from './ResourceCard';
import type { Asset, AssetProfile } from './types';

const mockState = vi.hoisted(() => ({
  authProfile: null as { isAdmin: boolean } | null,
  updateResult: { error: null as Error | null },
  capturedUpdate: null as { payload: Record<string, unknown>; id: string } | null,
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: mockState.authProfile ? { id: 'viewer-1' } : null,
    profile: mockState.authProfile,
    loading: false,
    signInWithDiscord: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (_table: string) => ({
      update: (payload: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          mockState.capturedUpdate = { payload, id };
          return Promise.resolve({ error: mockState.updateResult.error });
        },
      }),
    }),
  },
}));

const baseAsset: Asset = {
  id: 'asset-1',
  slug: 'test-asset--abc123',
  type: 'lora',
  name: 'Test Asset',
  description: null,
  source: 'manual',
  discord_guild_id: null,
  discord_channel_id: null,
  discord_thread_id: null,
  is_hidden: false,
  admin_status: 'Listed',
  lora_type: null,
  lora_base_model: null,
  model_variant: null,
  lora_link: null,
  download_link: null,
  primary_media_id: null,
  created_at: '2026-04-20T00:00:00.000Z',
  creator: 'Creator',
  member_id: 'member-1',
  galleryCount: 0,
  discussionCount: 0,
  media: null,
};

const baseProfile: AssetProfile = {
  id: 'member-1',
  username: 'creator',
  display_name: 'Creator',
  avatar_url: null,
};

function renderCard(asset: Asset = baseAsset) {
  return render(
    <MemoryRouter>
      <ResourceCard asset={asset} profile={baseProfile} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockState.authProfile = null;
  mockState.updateResult = { error: null };
  mockState.capturedUpdate = null;
});

describe('ResourceCard admin curate toggle', () => {
  it('shows asset comment count as comments and omits gallery item count', () => {
    renderCard({ ...baseAsset, galleryCount: 9, discussionCount: 3 });
    expect(screen.getByText('3 comments')).toBeTruthy();
    expect(screen.queryByText(/9 items/)).toBeNull();
    expect(screen.queryByText(/discussions/)).toBeNull();
  });

  it('does not render the toggle for non-admin viewers', () => {
    mockState.authProfile = null;
    renderCard();
    expect(screen.queryByRole('button', { name: /curate/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove from forge/i })).toBeNull();
  });

  it('renders the toggle for admin viewers', () => {
    mockState.authProfile = { isAdmin: true };
    renderCard();
    expect(screen.getByRole('button', { name: 'Curate' })).toBeTruthy();
  });

  it('fires the expected supabase update when an admin clicks Curate', async () => {
    mockState.authProfile = { isAdmin: true };
    renderCard();
    const button = screen.getByRole('button', { name: 'Curate' });
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockState.capturedUpdate).not.toBeNull();
    });
    expect(mockState.capturedUpdate).toEqual({
      payload: { admin_status: 'Curated' },
      id: 'asset-1',
    });
    // After optimistic flip the label should reflect the new state.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove from Forge' })).toBeTruthy();
    });
  });

  it('flips back to "Curate" when toggling off a curated asset', async () => {
    mockState.authProfile = { isAdmin: true };
    renderCard({ ...baseAsset, admin_status: 'Curated' });
    const button = screen.getByRole('button', { name: 'Remove from Forge' });
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockState.capturedUpdate).toEqual({
        payload: { admin_status: 'Listed' },
        id: 'asset-1',
      });
    });
  });
});
