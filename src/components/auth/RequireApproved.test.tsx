// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireApproved } from './RequireApproved';

const mockAuth = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  profile: { isApproved: true } as { isApproved: boolean } | null,
  loading: false,
  signInWithDiscord: vi.fn(),
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => mockAuth,
}));

function renderGuarded() {
  render(
    <MemoryRouter initialEntries={['/submit/art']}>
      <Routes>
        <Route
          path="/submit/art"
          element={(
            <RequireApproved>
              <div>submit form</div>
            </RequireApproved>
          )}
        />
        <Route path="/get-approved" element={<div>approval page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockAuth.user = { id: 'user-1' };
  mockAuth.profile = { isApproved: true };
  mockAuth.loading = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RequireApproved', () => {
  it('renders nothing while auth is loading', () => {
    mockAuth.loading = true;

    renderGuarded();

    expect(screen.queryByText('submit form')).toBeNull();
    expect(screen.queryByText('approval page')).toBeNull();
  });

  it('redirects authenticated unapproved users to get approved', async () => {
    mockAuth.profile = { isApproved: false };

    renderGuarded();

    expect(await screen.findByText('approval page')).not.toBeNull();
    expect(screen.queryByText('submit form')).toBeNull();
  });

  it('renders the guarded content for approved users', () => {
    renderGuarded();

    expect(screen.getByText('submit form')).not.toBeNull();
  });

  it('falls through to the sign-in flow for unauthenticated users', () => {
    mockAuth.user = null;
    mockAuth.profile = null;

    renderGuarded();

    expect(screen.getByText('Sign in to continue')).not.toBeNull();
    expect(screen.queryByText('approval page')).toBeNull();
  });
});
