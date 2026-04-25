import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateBio, updateProfileLinks } from './profile';

const rpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc,
  },
}));

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe('updateBio', () => {
  it('calls update_profile with the exact p_profile argument shape', async () => {
    await updateBio('Makes agent-directed art.');

    expect(rpc).toHaveBeenCalledWith('update_profile', {
      p_profile: {
        bio: 'Makes agent-directed art.',
      },
    });
  });
});

describe('updateProfileLinks', () => {
  it('calls update_profile with the exact p_profile argument shape', async () => {
    await updateProfileLinks(['https://example.com']);

    expect(rpc).toHaveBeenCalledWith('update_profile', {
      p_profile: {
        profile_links: ['https://example.com'],
      },
    });
  });
});
