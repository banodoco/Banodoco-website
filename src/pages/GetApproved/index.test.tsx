// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GetApproved from './index';

const longBio = 'I make procedural films, visual tools, and agent-directed artwork with a focus on process, authorship, and repeatable creative systems.';

const mockAuth = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  profile: {
    memberId: '42',
    discordUsername: 'creator',
    displayName: 'Creator Name',
    avatarUrl: 'https://example.com/avatar.webp',
    bio: '',
    profileLinks: [] as string[],
    isApproved: false,
  } as {
    memberId: string;
    discordUsername: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    profileLinks: string[];
    isApproved: boolean;
  } | null,
  loading: false,
  refreshProfile: vi.fn(),
  pendingRow: null as { id: string; posted_message_id: number | null } | null,
  insertRows: [] as unknown[],
  approvalInsertError: null as { message: string; code?: string } | null,
  deletedRows: [] as Array<{ table: string; column: string; value: unknown }>,
}));

const profileMocks = vi.hoisted(() => ({
  updateBio: vi.fn(),
  updateProfileLinks: vi.fn(),
}));

const mediaMocks = vi.hoisted(() => ({
  createArtMedia: vi.fn(),
  deleteUserUpload: vi.fn(),
}));

const resourceMocks = vi.hoisted(() => ({
  saveResource: vi.fn(),
}));

const formPayloads = vi.hoisted(() => ({
  artFile: null as File | null,
  art: null as null | {
    file: File;
    title: string;
    description: string;
    selfAttributed: true;
  },
  resource: {
    memberId: '42',
    name: 'Approval Resource',
    description: 'Resource description',
    type: 'workflow',
    links: [{
      label: 'Download',
      url: 'https://example.com/resource',
      source: 'link' as const,
    }],
    primaryMediaId: null,
    selfAttributed: true as const,
    galleryItems: [],
    modelItems: [],
  },
}));

const supabaseMock = vi.hoisted(() => {
  const makeApprovalQuery = () => {
    let action: 'select' | 'insert' = 'select';
    let payload: unknown;

    const query = {
      select: () => query,
      eq: () => query,
      insert: (value: unknown) => {
        action = 'insert';
        payload = value;
        return query;
      },
      maybeSingle: async () => ({ data: mockAuth.pendingRow, error: null }),
      single: async () => {
        if (action === 'insert') {
          mockAuth.insertRows.push(payload);
          if (mockAuth.approvalInsertError) {
            return { data: null, error: mockAuth.approvalInsertError };
          }
          return { data: { id: 'approval-1' }, error: null };
        }
        return { data: mockAuth.pendingRow, error: null };
      },
    };

    return query;
  };

  const makeDeleteQuery = (table: string) => ({
    delete: () => ({
      eq: async (column: string, value: unknown) => {
        mockAuth.deletedRows.push({ table, column, value });
        return { data: null, error: null };
      },
    }),
  });

  return {
    from: vi.fn((table: string) => (
      table === 'approval_requests' ? makeApprovalQuery() : makeDeleteQuery(table)
    )),
  };
});

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: mockAuth.user,
    profile: mockAuth.profile,
    loading: mockAuth.loading,
    refreshProfile: mockAuth.refreshProfile,
    signInWithDiscord: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: supabaseMock,
}));

vi.mock('@/lib/profile', () => ({
  updateBio: profileMocks.updateBio,
  updateProfileLinks: profileMocks.updateProfileLinks,
}));

vi.mock('@/lib/media', () => ({
  createArtMedia: mediaMocks.createArtMedia,
  deleteUserUpload: mediaMocks.deleteUserUpload,
}));

vi.mock('@/lib/resources', () => ({
  saveResource: resourceMocks.saveResource,
}));

vi.mock('@/pages/SubmitArt', () => ({
  SubmitArtForm: ({
    onSubmit,
    submitDisabled,
    submitTitle,
  }: {
    onSubmit: (data: typeof formPayloads.art) => Promise<void>;
    submitDisabled?: boolean;
    submitTitle?: string;
  }) => (
    <button
      type="button"
      disabled={submitDisabled}
      title={submitTitle}
      onClick={() => {
        if (formPayloads.art) {
          void onSubmit(formPayloads.art).catch(() => undefined);
        }
      }}
    >
      Submit test attachment
    </button>
  ),
}));

vi.mock('@/pages/SubmitResource', () => ({
  SubmitResourceForm: ({
    onSubmit,
    submitDisabled,
    submitTitle,
  }: {
    onSubmit: (data: typeof formPayloads.resource) => Promise<void>;
    submitDisabled?: boolean;
    submitTitle?: string;
  }) => (
    <button
      type="button"
      disabled={submitDisabled}
      title={submitTitle}
      onClick={() => {
        void onSubmit(formPayloads.resource).catch(() => undefined);
      }}
    >
      Submit test attachment
    </button>
  ),
}));

function renderGetApproved(entry = '/get-approved') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<div>home fallback</div>} />
        <Route path="/creator" element={<div>creator profile</div>} />
        <Route path="/get-approved" element={<GetApproved />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillBio(value = longBio) {
  fireEvent.change(await screen.findByLabelText('Bio'), {
    target: { value },
  });
}

async function findSubmitButton() {
  return screen.findByRole('button', { name: /submit test attachment/i });
}

beforeEach(() => {
  formPayloads.artFile = new File(['art'], 'approval-art.png', { type: 'image/png' });
  formPayloads.art = {
    file: formPayloads.artFile,
    title: 'Approval Piece',
    description: 'Art description',
    selfAttributed: true,
  };
  mockAuth.user = { id: 'user-1' };
  mockAuth.profile = {
    memberId: '42',
    discordUsername: 'creator',
    displayName: 'Creator Name',
    avatarUrl: 'https://example.com/avatar.webp',
    bio: '',
    profileLinks: [],
    isApproved: false,
  };
  mockAuth.loading = false;
  mockAuth.pendingRow = null;
  mockAuth.insertRows = [];
  mockAuth.deletedRows = [];
  mockAuth.approvalInsertError = null;
  mockAuth.refreshProfile.mockReset();
  mockAuth.refreshProfile.mockResolvedValue(undefined);
  profileMocks.updateBio.mockReset();
  profileMocks.updateBio.mockResolvedValue(undefined);
  profileMocks.updateProfileLinks.mockReset();
  profileMocks.updateProfileLinks.mockResolvedValue(undefined);
  mediaMocks.createArtMedia.mockReset();
  mediaMocks.createArtMedia.mockResolvedValue({
    id: 'media-1',
    storagePath: 'user-1/art/file.png',
    url: 'https://example.com/file.png',
    type: 'image',
  });
  mediaMocks.deleteUserUpload.mockReset();
  mediaMocks.deleteUserUpload.mockResolvedValue(undefined);
  resourceMocks.saveResource.mockReset();
  resourceMocks.saveResource.mockResolvedValue({
    id: 'resource-1',
    slug: 'approval-resource--resource-1',
  });
  supabaseMock.from.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('GetApproved', () => {
  it('keeps the embedded submit disabled until the bio reaches 120 characters', async () => {
    renderGetApproved();

    const submit = await findSubmitButton();
    expect(submit.hasAttribute('disabled')).toBe(true);
    expect(submit.getAttribute('title')).toBe('Add a 120+ character bio first');

    await fillBio('I make procedural films.');
    expect(submit.hasAttribute('disabled')).toBe(true);

    await fillBio(longBio);

    await waitFor(() => {
      expect(submit.hasAttribute('disabled')).toBe(false);
    });
    expect(submit.getAttribute('title')).toBeNull();
  });

  it('auto-saves the bio after the debounce and shows the Saved pill', async () => {
    renderGetApproved();
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText('Bio'), {
      target: { value: longBio },
    });
    await vi.advanceTimersByTimeAsync(600);

    expect(profileMocks.updateBio).toHaveBeenCalledWith(longBio);
    expect(mockAuth.refreshProfile).toHaveBeenCalled();
    expect(screen.getByText('Saved').className).toContain('opacity-100');
  });

  it('auto-saves valid profile links with the filtered link array', async () => {
    renderGetApproved();
    vi.useFakeTimers();

    const firstLink = screen.getByPlaceholderText('https://example.com');
    fireEvent.change(firstLink, { target: { value: 'https://example.com/portfolio' } });

    expect(screen.getAllByPlaceholderText('https://example.com')).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(600);

    expect(profileMocks.updateProfileLinks).toHaveBeenCalledWith([
      'https://example.com/portfolio',
    ]);
  });

  it('submits an art approval request by creating hidden media and inserting approval_requests', async () => {
    renderGetApproved();

    await fillBio(longBio);
    fireEvent.click(await findSubmitButton());

    await waitFor(() => {
      expect(mediaMocks.createArtMedia).toHaveBeenCalledWith({
        file: formPayloads.artFile,
        title: 'Approval Piece',
        description: 'Art description',
        memberId: '42',
        userId: 'user-1',
        hidden: true,
        selfAttributed: true,
      });
      expect(mockAuth.insertRows).toEqual([{
        member_id: '42',
        bio_snapshot: longBio,
        attached_media_id: 'media-1',
        attached_resource_id: null,
        status: 'pending',
      }]);
    });
    expect(await screen.findByRole('heading', { name: /review pending/i })).not.toBeNull();
  });

  it('submits a resource approval request by saving a draft resource and inserting approval_requests', async () => {
    renderGetApproved();

    await fillBio(longBio);
    fireEvent.click(screen.getByRole('button', { name: /resource/i }));
    fireEvent.click(await findSubmitButton());

    await waitFor(() => {
      expect(resourceMocks.saveResource).toHaveBeenCalledWith({
        id: undefined,
        memberId: '42',
        name: 'Approval Resource',
        description: 'Resource description',
        type: 'workflow',
        links: formPayloads.resource.links,
        primaryMediaId: null,
        status: 'draft',
        selfAttributed: true,
        galleryItems: [],
        modelItems: [],
      });
      expect(mockAuth.insertRows).toEqual([{
        member_id: '42',
        bio_snapshot: longBio,
        attached_media_id: null,
        attached_resource_id: 'resource-1',
        status: 'pending',
      }]);
    });
    expect(await screen.findByRole('heading', { name: /review pending/i })).not.toBeNull();
  });

  it('rolls back created art media and storage when approval_requests insert fails', async () => {
    mockAuth.approvalInsertError = { message: 'duplicate key value', code: '23505' };
    renderGetApproved();

    await fillBio(longBio);
    fireEvent.click(await findSubmitButton());

    await waitFor(() => {
      expect(mockAuth.deletedRows).toContainEqual({
        table: 'media',
        column: 'id',
        value: 'media-1',
      });
      expect(mediaMocks.deleteUserUpload).toHaveBeenCalledWith('user-1/art/file.png');
    });
    expect(screen.queryByRole('heading', { name: /review pending/i })).toBeNull();
  });

  it('rolls back created draft resources when approval_requests insert fails', async () => {
    mockAuth.approvalInsertError = { message: 'duplicate key value', code: '23505' };
    renderGetApproved();

    await fillBio(longBio);
    fireEvent.click(screen.getByRole('button', { name: /resource/i }));
    fireEvent.click(await findSubmitButton());

    await waitFor(() => {
      expect(mockAuth.deletedRows).toContainEqual({
        table: 'assets',
        column: 'id',
        value: 'resource-1',
      });
    });
    expect(screen.queryByRole('heading', { name: /review pending/i })).toBeNull();
  });

  it('renders pending state when a pending approval request already exists', async () => {
    mockAuth.pendingRow = { id: 'pending-1', posted_message_id: null };

    renderGetApproved();

    expect(await screen.findByRole('heading', { name: /review pending/i })).not.toBeNull();
    expect(screen.getByText('Your request is in the approval queue. Posting unlocks after the review is handled manually.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /submit test attachment/i })).toBeNull();
  });

  it('renders the introductions copy when the approval request has been posted', async () => {
    mockAuth.pendingRow = { id: 'pending-1', posted_message_id: 1234567890 };

    renderGetApproved();

    expect(await screen.findByRole('heading', { name: /review pending/i })).not.toBeNull();
    expect(screen.getByText('Your application is in #introductions')).not.toBeNull();
    expect(screen.queryByText('Your request is in the approval queue. Posting unlocks after the review is handled manually.')).toBeNull();
  });

  it('redirects approved users with null discordUsername to HOME_PATH', async () => {
    mockAuth.profile = {
      memberId: '42',
      discordUsername: null,
      displayName: 'Creator Name',
      avatarUrl: null,
      bio: 'Approved creator',
      profileLinks: [],
      isApproved: true,
    };

    renderGetApproved();

    expect(await screen.findByText('home fallback')).not.toBeNull();
  });
});
