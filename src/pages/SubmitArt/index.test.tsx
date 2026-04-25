// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import SubmitArt, { SubmitArtForm } from './index';
import { buildArtPath } from '@/lib/routing';

const authState = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  profile: {
    memberId: '42',
    discordUsername: 'artist',
    isApproved: true,
  } as { memberId: string; discordUsername: string | null; isApproved: boolean } | null,
  loading: false,
}));

const mediaState = vi.hoisted(() => ({
  createArtMedia: vi.fn(),
}));

const uploadState = vi.hoisted(() => ({
  lastFile: null as File | null,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    signInWithDiscord: vi.fn(),
  }),
}));

vi.mock('@/lib/media', () => ({
  createArtMedia: mediaState.createArtMedia,
}));

vi.mock('@/components/forms/MediaUploader', () => ({
  MediaUploader: ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) => (
    <button
      type="button"
      onClick={() => {
        uploadState.lastFile = new File(['art'], 'approval-art.png', { type: 'image/png' });
        onFilesSelected([uploadState.lastFile]);
      }}
    >
      Upload art file
    </button>
  ),
}));

function renderStandalone() {
  const router = createMemoryRouter([
    {
      path: '/submit/art',
      element: <SubmitArt />,
    },
    {
      path: '/:username/art/:slug',
      element: <div data-testid="art-detail-route">art detail</div>,
    },
  ], {
    initialEntries: ['/submit/art'],
  });

  render(<RouterProvider router={router} />);
  return { router };
}

function renderApprovalForm(props: Partial<ComponentProps<typeof SubmitArtForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  render(
    <SubmitArtForm
      inline
      mode="approval-request"
      submitLabel="Submit for approval"
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit };
}

function fillValidArtForm() {
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: 'Approval Piece' },
  });
  fireEvent.click(screen.getByRole('button', { name: /upload art file/i }));
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'A test description.' },
  });
}

function confirmSelfAttributed() {
  const checkbox = screen.getByRole('checkbox', { name: /i made this/i });
  if (!(checkbox as HTMLInputElement).checked) {
    fireEvent.click(checkbox);
  }
}

beforeEach(() => {
  authState.user = { id: 'user-1' };
  authState.profile = {
    memberId: '42',
    discordUsername: 'artist',
    isApproved: true,
  };
  authState.loading = false;
  uploadState.lastFile = null;
  mediaState.createArtMedia.mockReset();
  mediaState.createArtMedia.mockResolvedValue({
    id: '123e4567-e89b-12d3-a456-426614174000',
    storagePath: 'user-1/art/file.png',
    url: 'https://example.com/file.png',
    type: 'image',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SubmitArt', () => {
  it('publishes from the standalone page with hidden false and redirects to the art detail route', async () => {
    const { router } = renderStandalone();

    fillValidArtForm();
    confirmSelfAttributed();
    fireEvent.click(screen.getByRole('button', { name: /submit art/i }));

    await waitFor(() => {
      expect(mediaState.createArtMedia).toHaveBeenCalledWith({
        file: uploadState.lastFile,
        title: 'Approval Piece',
        description: 'A test description.',
        memberId: '42',
        userId: 'user-1',
        hidden: false,
        selfAttributed: true,
      });
    });

    const expectedPath = buildArtPath(
      '123e4567-e89b-12d3-a456-426614174000',
      'Approval Piece',
      'artist',
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(expectedPath);
      expect(screen.getByTestId('art-detail-route')).not.toBeNull();
    });
  });

  it('delegates approval-request submission without creating media or navigating', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderApprovalForm({ onSubmit });

    fillValidArtForm();
    confirmSelfAttributed();
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        file: uploadState.lastFile,
        title: 'Approval Piece',
        description: 'A test description.',
        selfAttributed: true,
      });
    });
    expect(mediaState.createArtMedia).not.toHaveBeenCalled();
  });

  it('requires self-attribution before submit in publish and approval-request modes', () => {
    renderStandalone();
    fillValidArtForm();
    expect(screen.getByRole('button', { name: /submit art/i }).hasAttribute('disabled')).toBe(true);
    cleanup();

    renderApprovalForm();
    fillValidArtForm();
    expect(screen.getByRole('button', { name: /submit for approval/i }).hasAttribute('disabled')).toBe(true);
  });

  it('honors submitDisabled even when internal form fields are valid', () => {
    renderApprovalForm({ submitDisabled: true });

    fillValidArtForm();
    confirmSelfAttributed();

    expect(screen.getByRole('button', { name: /submit for approval/i }).hasAttribute('disabled')).toBe(true);
  });
});
