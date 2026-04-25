// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResourceShell } from './ResourceShell';
import type { AssetComment } from '@/hooks/useAssetComments';
import type { CommunityResourceItem, ResourceAssetModel } from '@/hooks/useCommunityResources';
import type { GalleryMediaItem } from '@/hooks/useCommunityResource';
import type { Asset } from '@/pages/Resources/types';

const baseResource: CommunityResourceItem = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'discord-resource--abc123',
  memberId: '42',
  title: 'Discord Resource',
  description: '## Hello\n\nThis is a resource body.',
  source: 'discord_import',
  discordGuildId: 'guild-1',
  discordChannelId: '1149372684220768367',
  discordThreadId: 'thread-1',
  isHidden: false,
  status: 'published',
  adminStatus: 'Listed',
  selfAttributed: true,
  links: [{ label: 'Download', url: 'https://example.com/download' }],
  primaryMediaId: 'media-1',
  primaryMediaUrl: 'https://example.com/media-1.webp',
  primaryUrl: 'https://example.com/download',
  resourceType: 'lora',
  thumbnailUrl: 'https://example.com/thumb.webp',
  createdAt: '2026-04-20T12:00:00.000Z',
  galleryCount: 2,
  discussionCount: 1,
  assetModels: [],
  creator: {
    username: 'creator',
    displayName: 'Creator Name',
    avatarUrl: 'https://example.com/avatar.webp',
    profileUrl: '/creator',
  },
};

const galleryMedia: GalleryMediaItem[] = [
  {
    id: 'media-1',
    type: 'image',
    url: 'https://example.com/media-1.webp',
    cloudflare_thumbnail_url: 'https://example.com/thumb.webp',
    cloudflare_playback_hls_url: null,
    backup_thumbnail_url: null,
    placeholder_image: null,
  },
  {
    id: 'media-2',
    type: 'video',
    url: 'https://example.com/media-2.mp4',
    cloudflare_thumbnail_url: 'https://example.com/thumb-2.webp',
    cloudflare_playback_hls_url: 'https://example.com/media-2.m3u8',
    backup_thumbnail_url: null,
    placeholder_image: null,
  },
];

const assetModels: ResourceAssetModel[] = [
  {
    modelId: 'model-1',
    compatibilityNote: 'Best on the fast variant',
    displayName: 'Flux Schnell',
    defaultVariant: 'schnell',
  },
];

const comments: AssetComment[] = [
  {
    id: 'comment-1',
    assetId: baseResource.id,
    discordGuildId: 'guild-1',
    discordThreadId: 'thread-1',
    discordMessageId: 'message-1',
    authorMemberId: '84',
    content: 'Looks great',
    replyToCommentId: null,
    replyToDiscordMessageId: null,
    reactionCount: 2,
    discordCreatedAt: '2026-04-21T12:00:00.000Z',
    discordEditedAt: null,
    author: {
      memberId: '84',
      username: 'commenter',
      globalName: 'Commenter',
      avatarUrl: null,
    },
    media: [],
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResourceShell', () => {
  it('renders a discord-imported resource with the expected blocks', () => {
    const { container } = render(
      <MemoryRouter>
        <ResourceShell
          resource={baseResource}
          galleryMedia={galleryMedia}
          assetModels={assetModels}
          comments={comments}
          canEdit
        />
      </MemoryRouter>,
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <article
        class="space-y-10"
      >
        <section
          class="space-y-4"
        >
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <span
              class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] border-blue-400/20 bg-blue-400/10 text-blue-200"
            >
              lora
            </span>
            <span
              class="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-200"
            >
              From Discord
               · resources
            </span>
            <span
              class="text-sm text-zinc-500"
            >
              April 20, 2026
            </span>
          </div>
          <div
            class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
          >
            <div
              class="space-y-3"
            >
              <h1
                class="text-3xl md:text-4xl font-bold tracking-tight text-white"
              >
                Discord Resource
              </h1>
              <div
                class="flex flex-wrap items-center gap-3 text-sm text-zinc-400"
              >
                <img
                  alt="Creator Name"
                  class="h-8 w-8 rounded-full border border-white/10 object-cover"
                  loading="lazy"
                  src="https://example.com/avatar.webp"
                />
                <a
                  class="font-medium text-zinc-200 transition hover:text-white"
                  data-discover="true"
                  href="/creator"
                >
                  Creator Name
                </a>
                <a
                  class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                  href="https://discord.com/channels/guild-1/thread-1/thread-1"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <svg
                    aria-hidden="true"
                    class="lucide lucide-external-link"
                    fill="none"
                    height="12"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="12"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 3h6v6"
                    />
                    <path
                      d="M10 14 21 3"
                    />
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    />
                  </svg>
                  View on Discord
                </a>
              </div>
            </div>
            <div
              class="flex flex-col items-stretch gap-2 md:items-end"
            >
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <a
                  class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                  data-discover="true"
                  href="/?edit=1"
                >
                  <svg
                    aria-hidden="true"
                    class="lucide lucide-pen-line"
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13 21h8"
                    />
                    <path
                      d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                    />
                  </svg>
                  Edit resource
                </a>
              </div>
            </div>
          </div>
        </section>
        <section
          class="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
        >
          <div
            class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
          >
            <div>
              <h2
                class="text-sm font-semibold text-zinc-100"
              >
                Links & downloads
              </h2>
              <p
                class="mt-1 text-sm text-zinc-500"
              >
                Open the source, download pack, or supporting documentation.
              </p>
            </div>
            <div
              class="grid gap-2 md:min-w-[18rem]"
            >
              <a
                class="inline-flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.05]"
                href="https://example.com/download"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>
                  Download
                </span>
                <span
                  class="text-xs text-zinc-500"
                >
                  example.com
                </span>
              </a>
            </div>
          </div>
        </section>
        <section
          class="space-y-3"
        >
          <h2
            class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500"
          >
            Compatibility
          </h2>
          <div
            class="flex flex-wrap gap-2"
          >
            <span
              class="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200"
              title="Best on the fast variant"
            >
              Flux Schnell
              <span
                class="ml-2 text-xs text-zinc-500"
              >
                schnell
              </span>
            </span>
          </div>
        </section>
        <section>
          <div
            class="space-y-4"
          >
            <h2
              class="text-3xl font-semibold text-white"
            >
              Hello
            </h2>
            <p
              class="whitespace-pre-wrap text-base leading-8 text-zinc-300"
            >
              This is a resource body.
            </p>
          </div>
        </section>
        <section
          class="relative space-y-4"
        >
          <h2
            class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500"
          >
            Made with this
          </h2>
          <div
            class="grid grid-cols-2 gap-3 md:grid-cols-3"
          >
            <button
              aria-label="Discord Resource"
              class="group relative block w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 text-left aspect-video col-span-2 md:col-span-2 md:row-span-2 md:aspect-square"
              type="button"
            >
              <img
                alt="Discord Resource"
                class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                src="https://example.com/thumb.webp"
              />
            </button>
            <button
              aria-label="Discord Resource"
              class="group relative block w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 text-left aspect-square"
              type="button"
            >
              <video
                class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                muted=""
                playsinline=""
                poster="https://example.com/thumb-2.webp"
                preload="metadata"
                src="https://example.com/media-2.mp4"
              />
              <span
                class="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white"
              >
                Video
              </span>
            </button>
          </div>
        </section>
        <section
          class="space-y-5"
        >
          <div
            class="flex items-center justify-between gap-4"
          >
            <h2
              class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500"
            >
              Discussion
            </h2>
            <span
              class="text-xs text-zinc-500"
            >
              1 comment
            </span>
          </div>
          <div
            class="space-y-4"
          >
            <article
              class="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
            >
              <div
                class="flex flex-wrap items-start justify-between gap-3"
              >
                <div
                  class="flex items-center gap-3"
                >
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-zinc-300"
                  >
                    C
                  </div>
                  <div
                    class="space-y-1"
                  >
                    <div
                      class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-zinc-200"
                    >
                      <span
                        class="font-medium"
                      >
                        Commenter
                      </span>
                    </div>
                    <div
                      class="text-xs text-zinc-500"
                    >
                      3d ago
                    </div>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2"
                >
                  <span
                    class="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300"
                  >
                    2
                     reactions
                  </span>
                  <a
                    class="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                    href="https://discord.com/channels/guild-1/thread-1/message-1"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View on Discord
                  </a>
                </div>
              </div>
              <div
                class="mt-4"
              >
                <div
                  class="space-y-4"
                >
                  <p
                    class="whitespace-pre-wrap text-base leading-8 text-zinc-300"
                  >
                    Looks great
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </article>
    `);
  });

  it('hides optional blocks when their data is empty', () => {
    render(
      <MemoryRouter>
        <ResourceShell
          resource={{
            ...baseResource,
            description: null,
            source: 'manual',
            links: [],
            primaryUrl: null,
            galleryCount: 0,
            discussionCount: 0,
          }}
          galleryMedia={[]}
          assetModels={[]}
          comments={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Links & downloads')).toBeNull();
    expect(screen.queryByText('Compatibility')).toBeNull();
    expect(screen.queryByText('Discussion')).toBeNull();
  });

  it('paginates the "Made with this" grid when there are more than six media items', () => {
    // Page 1 shows the featured tile + 5 smaller tiles (6 items total).
    // Items 7+ should only appear after clicking "Next".
    const manyMedia: GalleryMediaItem[] = Array.from({ length: 8 }, (_, index) => ({
      id: `media-${index + 1}`,
      type: 'image',
      url: `https://example.com/media-${index + 1}.webp`,
      cloudflare_thumbnail_url: null,
      cloudflare_playback_hls_url: null,
      backup_thumbnail_url: null,
      placeholder_image: null,
    }));

    render(
      <MemoryRouter>
        <ResourceShell
          resource={baseResource}
          galleryMedia={manyMedia}
          assetModels={[]}
          comments={[]}
        />
      </MemoryRouter>,
    );

    // Pager should render because total items (8) exceeds page-1 capacity (6).
    expect(screen.getByText('Page 1 of 2')).not.toBeNull();

    // Tiles are <button>s that open a lightbox — check for the <img> with the
    // expected src rather than an anchor href.
    const findTileImg = (index: number) =>
      document.querySelector(`img[src="https://example.com/media-${index}.webp"]`);

    // Page 1: items 1-6 visible, items 7-8 hidden.
    for (let index = 1; index <= 6; index += 1) {
      expect(findTileImg(index)).not.toBeNull();
    }
    expect(findTileImg(7)).toBeNull();
    expect(findTileImg(8)).toBeNull();

    // Prev is disabled on page 1, Next is not.
    const prev = screen.getByRole('button', { name: 'Prev' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(prev.hasAttribute('disabled')).toBe(true);
    expect(next.hasAttribute('disabled')).toBe(false);

    // Advance to page 2 — items 7-8 become visible, items 1-6 go away.
    fireEvent.click(next);

    expect(screen.getByText('Page 2 of 2')).not.toBeNull();
    expect(findTileImg(7)).not.toBeNull();
    expect(findTileImg(8)).not.toBeNull();
    expect(findTileImg(1)).toBeNull();

    // Next is now disabled (last page), Prev is enabled.
    expect(screen.getByRole('button', { name: 'Prev' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true);
  });

  it('does not render a pager when total media fits on page 1', () => {
    render(
      <MemoryRouter>
        <ResourceShell
          resource={baseResource}
          galleryMedia={galleryMedia}
          assetModels={[]}
          comments={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Page \d+ of \d+/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('renders ResourceShell from ResourceDetail and ResourceModal with the expected variants', async () => {
    const shellMock = vi.fn(({ variant }: { variant: 'page' | 'modal' }) => (
      <div data-testid="resource-shell" data-variant={variant} />
    ));

    vi.resetModules();
    vi.doMock('@/components/resources/ResourceShell', () => ({
      ResourceShell: shellMock,
    }));
    vi.doMock('@/components/seo/Seo', () => ({
      Seo: () => null,
    }));
    vi.doMock('@/hooks/useCommunityResource', () => ({
      useCommunityResource: () => ({
        resource: baseResource,
        galleryMedia,
        assetModels,
        loading: false,
        error: null,
      }),
    }));
    vi.doMock('@/hooks/useAssetComments', () => ({
      useAssetComments: () => ({
        comments,
        loading: false,
        error: null,
      }),
    }));
    vi.doMock('@/contexts/useAuth', () => ({
      useAuth: () => ({
        profile: { memberId: baseResource.memberId, isAdmin: false },
      }),
    }));

    const [{ default: ResourceDetail }, { ResourceModal }] = await Promise.all([
      import('@/pages/ResourceDetail'),
      import('@/pages/Resources/ResourceModal'),
    ]);

    render(
      <MemoryRouter initialEntries={[`/resources/${baseResource.slug}`]}>
        <Routes>
          <Route path="/resources/:slug" element={<ResourceDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    render(
      <MemoryRouter>
        <ResourceModal
          asset={{
            id: baseResource.id,
            slug: baseResource.slug,
            type: baseResource.resourceType,
            name: baseResource.title,
            description: baseResource.description,
            source: baseResource.source,
            discord_guild_id: baseResource.discordGuildId,
            discord_channel_id: baseResource.discordChannelId,
            discord_thread_id: baseResource.discordThreadId,
            is_hidden: false,
            admin_status: 'Listed',
            lora_type: null,
            lora_base_model: null,
            model_variant: null,
            lora_link: null,
            download_link: null,
            primary_media_id: baseResource.primaryMediaId,
            created_at: baseResource.createdAt,
            creator: baseResource.creator.displayName,
            member_id: baseResource.memberId,
            galleryCount: 0,
            discussionCount: 0,
            media: null,
          } satisfies Asset}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    const renderedShells = await screen.findAllByTestId('resource-shell');
    expect(renderedShells.map((element) => element.getAttribute('data-variant'))).toEqual(['page', 'modal']);
  });

  it('mounts the inline resource editor above the shell when edit mode is requested by an authorized viewer', async () => {
    const shellMock = vi.fn(() => <div data-testid="resource-shell" />);
    const submitMock = vi.fn(() => <div data-testid="inline-editor" />);

    vi.resetModules();
    vi.doMock('@/components/resources/ResourceShell', () => ({
      ResourceShell: shellMock,
    }));
    vi.doMock('@/pages/SubmitResource', () => ({
      SubmitResourceForm: submitMock,
    }));
    vi.doMock('@/components/seo/Seo', () => ({
      Seo: () => null,
    }));
    vi.doMock('@/hooks/useCommunityResource', () => ({
      useCommunityResource: (_slug: string | undefined, options?: { asAuthor?: boolean }) => ({
        resource: options?.asAuthor ? baseResource : baseResource,
        galleryMedia,
        assetModels,
        loading: false,
        error: null,
      }),
    }));
    vi.doMock('@/hooks/useAssetComments', () => ({
      useAssetComments: () => ({
        comments,
        loading: false,
        error: null,
      }),
    }));
    vi.doMock('@/contexts/useAuth', () => ({
      useAuth: () => ({
        profile: { memberId: baseResource.memberId, isAdmin: false },
      }),
    }));

    const { default: ResourceDetail } = await import('@/pages/ResourceDetail');

    render(
      <MemoryRouter initialEntries={[`/resources/${baseResource.slug}?edit=1`]}>
        <Routes>
          <Route path="/resources/:slug" element={<ResourceDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const inlineEditor = await screen.findByTestId('inline-editor');
    const renderedShell = await screen.findByTestId('resource-shell');

    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        editSlug: baseResource.slug,
        inline: true,
      }),
      undefined,
    );
    expect(
      inlineEditor.compareDocumentPosition(renderedShell) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the Curate toggle for admin viewers', () => {
    render(
      <MemoryRouter>
        <ResourceShell
          resource={baseResource}
          galleryMedia={galleryMedia}
          assetModels={assetModels}
          comments={comments}
          isAdmin
        />
      </MemoryRouter>,
    );

    // Currently Listed, so the label reads "Curate".
    expect(screen.getByRole('button', { name: /^Curate$/ })).not.toBeNull();
  });

  it('does not render the Curate toggle for non-admin viewers', () => {
    render(
      <MemoryRouter>
        <ResourceShell
          resource={baseResource}
          galleryMedia={galleryMedia}
          assetModels={assetModels}
          comments={comments}
          canEdit
          isAdmin={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /Curate|Remove from Forge/ })).toBeNull();
  });

  it('shows "Remove from Forge" and the Curated pill when the resource is currently Curated', () => {
    render(
      <MemoryRouter>
        <ResourceShell
          resource={{ ...baseResource, adminStatus: 'Curated' }}
          galleryMedia={galleryMedia}
          assetModels={assetModels}
          comments={comments}
          isAdmin
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Remove from Forge/ })).not.toBeNull();
    // Curated pill appears alongside the type/discord pills.
    expect(screen.getAllByText('Curated').length).toBeGreaterThan(0);
  });

  it('silently strips edit mode for viewers who cannot edit the resource', async () => {
    vi.resetModules();
    vi.doMock('@/components/resources/ResourceShell', () => ({
      ResourceShell: () => <div data-testid="resource-shell" />,
    }));
    vi.doMock('@/pages/SubmitResource', () => ({
      SubmitResourceForm: () => <div data-testid="inline-editor" />,
    }));
    vi.doMock('@/components/seo/Seo', () => ({
      Seo: () => null,
    }));
    vi.doMock('@/hooks/useCommunityResource', () => ({
      useCommunityResource: () => ({
        resource: baseResource,
        galleryMedia,
        assetModels,
        loading: false,
        error: null,
      }),
    }));
    vi.doMock('@/hooks/useAssetComments', () => ({
      useAssetComments: () => ({
        comments,
        loading: false,
        error: null,
      }),
    }));
    vi.doMock('@/contexts/useAuth', () => ({
      useAuth: () => ({
        profile: { memberId: 'not-the-author', isAdmin: false },
      }),
    }));

    const { default: ResourceDetail } = await import('@/pages/ResourceDetail');
    const router = createMemoryRouter([
      {
        path: '/resources/:slug',
        element: <ResourceDetail />,
      },
    ], {
      initialEntries: [`/resources/${baseResource.slug}?edit=1`],
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(screen.queryByTestId('inline-editor')).toBeNull();
    expect(screen.getByTestId('resource-shell')).not.toBeNull();
  });
});
