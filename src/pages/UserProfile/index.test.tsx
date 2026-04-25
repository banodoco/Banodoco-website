// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './index';

const mockState = vi.hoisted(() => ({
  authUserId: 'profile-1',
  isApproved: true,
  pendingApproval: null as { id: string; posted_message_id: number | null } | null,
  profileResult: {
    profile: {
      id: 'profile-1',
      memberId: '42',
      discordUsername: 'author',
      displayName: 'Author Name',
      avatarUrl: null,
      bio: null as string | null,
    },
    artCount: 0,
    postCount: 0,
    resourceCount: 3,
    publishedCount: 3,
    draftCount: 2,
    loading: false,
    error: null,
  },
  drafts: [{
    id: 'draft-1',
    slug: 'draft-resource--abc123',
    memberId: '42',
    title: 'Draft Resource',
    description: 'Private draft',
    status: 'draft' as const,
    source: 'manual' as const,
    links: [],
    primaryMediaId: null,
    primaryMediaUrl: null,
    primaryUrl: null,
    resourceType: 'lora',
    thumbnailUrl: null,
    createdAt: '2026-04-24T00:00:00.000Z',
    galleryCount: 0,
    discussionCount: 0,
    assetModels: [],
    creator: {
      username: 'author',
      displayName: 'Author Name',
      avatarUrl: null,
      profileUrl: '/author',
    },
  }],
  publishedResources: [{
    id: 'pub-1',
    slug: 'published-resource--abc123',
    memberId: '42',
    title: 'Published Resource',
    description: 'Public resource',
    status: 'published' as const,
    source: 'manual' as const,
    links: [],
    primaryMediaId: null,
    primaryMediaUrl: null,
    primaryUrl: null,
    resourceType: 'lora',
    thumbnailUrl: null,
    createdAt: '2026-04-20T00:00:00.000Z',
    galleryCount: 0,
    discussionCount: 0,
    assetModels: [],
    creator: {
      username: 'author',
      displayName: 'Author Name',
      avatarUrl: null,
      profileUrl: '/author',
    },
  }],
  refreshProfile: vi.fn(),
  updateBio: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: mockState.authUserId ? { id: mockState.authUserId } : null,
    profile: {
      isApproved: mockState.isApproved,
    },
    refreshProfile: mockState.refreshProfile,
  }),
}));

vi.mock('@/lib/profile', () => ({
  updateBio: mockState.updateBio,
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => mockState.profileResult,
}));

vi.mock('@/hooks/useCommunityResources', () => ({
  useCommunityResources: () => ({
    resources: mockState.publishedResources,
    loading: false,
  }),
}));

vi.mock('@/hooks/useAuthorResourceDrafts', () => ({
  useAuthorResourceDrafts: (memberId?: string) => ({
    drafts: memberId ? mockState.drafts : [],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/usePendingApproval', () => ({
  usePendingApproval: () => ({
    pendingApproval: mockState.pendingApproval,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useArtPieces', () => ({
  useArtPieces: () => ({
    artPieces: [],
    loading: false,
  }),
}));

vi.mock('@/hooks/usePosts', () => ({
  usePosts: () => ({
    posts: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
  }),
}));

vi.mock('@/pages/Resources/CommunityResourcesFeed/CommunityResourceCard', () => ({
  CommunityResourceCard: ({ resource }: { resource: { title: string } }) => (
    <div data-testid="published-resource-card">{resource.title}</div>
  ),
}));

vi.mock('@/pages/Resources/ArtGallery/ArtGalleryCard', () => ({
  ArtGalleryCard: () => <div />,
}));

vi.mock('@/components/posts/PostListCard', () => ({
  PostListCard: () => <div />,
}));

vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: () => <div />,
}));

function renderProfile(entry = '/author/resources') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/:username/resources" element={<UserProfile />} />
        <Route path="/:username/posts" element={<UserProfile />} />
        <Route path="/:username" element={<UserProfile />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockState.authUserId = 'profile-1';
  mockState.isApproved = true;
  mockState.pendingApproval = null;
  mockState.refreshProfile.mockReset();
  mockState.updateBio.mockReset();
  mockState.updateBio.mockResolvedValue(undefined);
  mockState.profileResult = {
    profile: {
      id: 'profile-1',
      memberId: '42',
      discordUsername: 'author',
      displayName: 'Author Name',
      avatarUrl: null,
      bio: null,
    },
    artCount: 0,
    postCount: 0,
    resourceCount: 3,
    publishedCount: 3,
    draftCount: 2,
    loading: false,
    error: null,
  };
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('UserProfile resources tab', () => {
  it('shows the Drafts subsection for the profile owner and sums published plus draft counts in the resources badge', () => {
    renderProfile();

    expect(screen.getByText('Drafts')).not.toBeNull();
    expect(screen.getByText('Continue editing')).not.toBeNull();
    expect(screen.getByText('Published')).not.toBeNull();
    expect(screen.getByTestId('published-resource-card').textContent).toContain('Published Resource');

    const resourcesTab = screen.getByRole('link', { name: /resources/i });
    expect(within(resourcesTab).getByText('5')).not.toBeNull();
  });

  it('hides drafts from visitors and keeps the resources badge on the published-only count', () => {
    mockState.authUserId = 'visitor-2';

    renderProfile();

    expect(screen.queryByText('Drafts')).toBeNull();
    expect(screen.queryByText('Continue editing')).toBeNull();

    const resourcesTab = screen.getByRole('link', { name: /resources/i });
    expect(within(resourcesTab).getByText('3')).not.toBeNull();
  });
});

describe('UserProfile approval actions', () => {
  it('shows the approved sharing actions and inline autosave bio editor', () => {
    renderProfile('/author');

    expect(screen.getByRole('heading', { name: /share something you made/i })).not.toBeNull();
    expect(screen.getByRole('link', { name: /submit art/i })).not.toBeNull();
    expect(screen.getByRole('link', { name: /submit resource/i })).not.toBeNull();
    expect(screen.getByRole('link', { name: /add post/i })).not.toBeNull();
    expect(screen.getByPlaceholderText(/tell people what you make/i)).not.toBeNull();
    expect(screen.queryByRole('button', { name: /save bio/i })).toBeNull();
  });

  it('shows the muted review pending card for unapproved users with a pending request', () => {
    mockState.isApproved = false;
    mockState.pendingApproval = { id: 'approval-1', posted_message_id: null };

    renderProfile('/author');

    expect(screen.getByText('Review pending')).not.toBeNull();
    expect(screen.queryByRole('link', { name: /submit art/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /get approved to post/i })).toBeNull();
  });

  it('shows the get-approved card for unapproved users without a pending request', () => {
    mockState.isApproved = false;

    renderProfile('/author');

    const approvalLink = screen.getByRole('link', { name: /get approved to post/i });
    expect(approvalLink.getAttribute('href')).toBe('/get-approved');
    expect(screen.queryByRole('link', { name: /submit art/i })).toBeNull();
  });

  it('auto-saves inline bio edits through updateBio and refreshProfile', async () => {
    vi.useFakeTimers();
    renderProfile('/author');

    fireEvent.change(screen.getByPlaceholderText(/tell people what you make/i), {
      target: { value: 'Updated bio text' },
    });
    await vi.advanceTimersByTimeAsync(600);

    await vi.waitFor(() => {
      expect(mockState.updateBio).toHaveBeenCalledWith('Updated bio text');
      expect(mockState.refreshProfile).toHaveBeenCalled();
    });
  });

  it('renders non-owner bio as read-only text', () => {
    mockState.authUserId = 'visitor-2';
    mockState.profileResult.profile.bio = 'Read-only creator bio.';

    renderProfile('/author');

    expect(screen.getByText('Read-only creator bio.')).not.toBeNull();
    expect(screen.queryByPlaceholderText(/tell people what you make/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /save bio/i })).toBeNull();
  });
});
