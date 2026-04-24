// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './index';

const mockState = vi.hoisted(() => ({
  authUserId: 'profile-1',
  profileResult: {
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
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: mockState.authUserId ? { id: mockState.authUserId } : null,
  }),
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
