// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => 'div',
    },
  ),
}));

vi.mock('lucide-react', () => ({
  Bold: () => null,
  Eye: () => null,
  FileText: () => null,
  Heading1: () => null,
  ImagePlus: () => null,
  Italic: () => null,
  Link2: () => null,
  List: () => null,
  Loader2: () => null,
  Newspaper: () => null,
  Palette: () => null,
  Paperclip: () => null,
  Quote: () => null,
  Save: () => null,
  Sparkles: () => null,
  Trash2: () => null,
  X: () => null,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock('@/components/auth/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/components/auth/RequireApproved', () => ({
  RequireApproved: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/components/forms/MediaUploader', () => ({
  MediaUploader: () => null,
}));

vi.mock('@/components/posts/PostBodyRenderer', () => ({
  PostBodyRenderer: () => null,
}));

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

vi.mock('@/hooks/useArtPieces', () => ({
  useArtPieces: () => ({ artPieces: [], loading: false, hasMore: false, loadMore: vi.fn() }),
}));

vi.mock('@/hooks/useCommunityResources', () => ({
  useCommunityResources: () => ({ resources: [], loading: false, hasMore: false, loadMore: vi.fn() }),
}));

vi.mock('@/hooks/usePost', () => ({
  usePost: () => ({ post: null, mediaById: {}, loading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/lib/postMarkdown', () => ({
  extractEmbedRefs: () => ({ artIds: [], resourceIds: [], mediaIds: [] }),
}));

vi.mock('@/lib/posts', () => ({
  createDraft: vi.fn(),
  deletePost: vi.fn(),
  publishPost: vi.fn(),
  saveDraft: vi.fn(),
  syncEmbeds: vi.fn(),
  unpublishPost: vi.fn(),
  uploadPostMedia: vi.fn(),
}));

vi.mock('@/lib/routing', () => ({
  profilePath: () => '/profile',
}));

import { readStoredEditorMode } from './editorMode';

afterEach(() => {
  window.localStorage.clear();
});

describe('readStoredEditorMode', () => {
  test.each([
    ['text', 'text'],
    ['bundle', 'interactive'],
    ['vibe', 'interactive'],
    ['interactive', 'interactive'],
    ['rich', 'text'],
    ['raw', 'text'],
    [null, 'text'],
    ['garbage', 'text'],
  ] as const)('maps %s to %s', (storedValue, expected) => {
    const key = 'vibe:authoring-mode:post-123';
    if (storedValue === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, storedValue);
    }

    expect(readStoredEditorMode('post-123')).toBe(expected);
  });
});
