import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, BookOpen, Newspaper, Pencil, Plus } from 'lucide-react';
import { PostListCard } from '@/components/posts/PostListCard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/useAuth';
import { useArtPieces } from '@/hooks/useArtPieces';
import { useAuthorResourceDrafts } from '@/hooks/useAuthorResourceDrafts';
import { useCommunityResources } from '@/hooks/useCommunityResources';
import { usePosts } from '@/hooks/usePosts';
import { ArtGalleryCard } from '@/pages/Resources/ArtGallery/ArtGalleryCard';
import { CommunityResourceCard } from '@/pages/Resources/CommunityResourcesFeed/CommunityResourceCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { buildResourcePath, profilePath, profilePostsPath, profileResourcesPath } from '@/lib/routing';

type TabKey = 'art' | 'posts' | 'resources';

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, artCount, postCount, publishedCount, draftCount, loading, error } = useUserProfile(
    username,
    user?.id,
  );

  // Determine active tab from the URL path
  const profileMemberId = profile?.memberId ?? undefined;
  const isOwnProfile = !!(user && profile && user.id === profile.id);
  const activeTab: TabKey = location.pathname.endsWith('/resources')
    ? 'resources'
    : location.pathname.endsWith('/posts')
      ? 'posts'
      : 'art';

  const {
    artPieces,
    loading: artLoading,
  } = useArtPieces(profileMemberId);

  const {
    resources,
    loading: resourcesLoading,
  } = useCommunityResources(profileMemberId);

  const {
    drafts,
    loading: draftsLoading,
    error: draftsError,
  } = useAuthorResourceDrafts(isOwnProfile ? profileMemberId : undefined);

  const {
    posts: profilePosts,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    error: postsError,
    hasMore: postsHasMore,
    loadMore: loadMorePosts,
  } = usePosts({
    memberId: profileMemberId,
    includeDrafts: isOwnProfile,
  });

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="mt-12 flex justify-center gap-8">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400/80 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // 404 state
  if (!profile) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-normal tracking-tight text-zinc-300 mb-4">
            404
          </h1>
          <p className="text-xl md:text-2xl text-zinc-500 mb-8">
            User not found.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number; icon: typeof Palette; path: string }[] = [
    {
      key: 'art',
      label: 'Art',
      count: artCount,
      icon: Palette,
      path: profilePath(profile.discordUsername!),
    },
    {
      key: 'posts',
      label: 'Posts',
      count: postCount,
      icon: Newspaper,
      path: profilePostsPath(profile.discordUsername!),
    },
    {
      key: 'resources',
      label: 'Resources',
      count: isOwnProfile ? publishedCount + draftCount : publishedCount,
      icon: BookOpen,
      path: profileResourcesPath(profile.discordUsername!),
    },
  ];

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center gap-4"
        >
          {/* Avatar */}
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName || profile.discordUsername || 'User'}
              className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/10">
              <span className="text-3xl text-white/40 font-medium">
                {(profile.displayName || profile.discordUsername || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name & Username */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">
              {profile.displayName || profile.discordUsername || 'User'}
            </h1>
            {profile.discordUsername && (
              <p className="text-zinc-500 mt-1">@{profile.discordUsername}</p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-zinc-400 max-w-lg leading-relaxed">{profile.bio}</p>
          )}

          {/* Own profile actions */}
          {isOwnProfile && (
            <div className="flex items-center gap-3 mt-2">
              <Link
                to="/settings/profile"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Pencil size={14} />
                Edit Profile
              </Link>
              <Link
                to="/submit/art"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Plus size={14} />
                Submit Art
              </Link>
              <Link
                to="/submit/resource"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Plus size={14} />
                Submit Resource
              </Link>
              <Link
                to="/submit/post"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Plus size={14} />
                Add Post
              </Link>
            </div>
          )}
        </motion.div>

        {/* Tab Bar */}
        <div className="mt-12 flex justify-center border-b border-white/10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive
                      ? 'bg-white/10 text-zinc-200'
                      : 'bg-white/5 text-zinc-500'
                  }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="profile-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'art' && (
            <div>
              {artLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-lg" />
                  ))}
                </div>
              ) : artPieces.length === 0 ? (
                <div className="text-center py-16">
                  <Palette size={48} className="mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No art pieces yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artPieces.map((piece) => (
                    <ArtGalleryCard key={piece.id} artPiece={piece} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-10">
              {isOwnProfile && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100">Drafts</h2>
                      <p className="mt-1 text-sm text-zinc-500">Only you can see unpublished resources.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {draftCount}
                    </span>
                  </div>

                  {draftsLoading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-video rounded-lg" />
                      ))}
                    </div>
                  ) : draftsError ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                      {draftsError}
                    </div>
                  ) : drafts.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                      No drafts yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {drafts.map((draft) => (
                        <Link
                          key={draft.id}
                          to={`${buildResourcePath(draft.id, {
                            label: draft.title,
                            persistedSlug: draft.slug,
                            username: draft.creator.username,
                          })}?edit=1`}
                          className="block rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06]"
                        >
                          {draft.thumbnailUrl && (
                            <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-white/5">
                              <img
                                src={draft.thumbnailUrl}
                                alt={draft.title}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                              Draft
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(draft.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="mt-3 line-clamp-2 text-base font-semibold text-zinc-100">
                            {draft.title}
                          </h3>
                          {draft.description && (
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                              {draft.description}
                            </p>
                          )}
                          <p className="mt-4 text-xs font-medium text-amber-100">
                            Continue editing
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-4">
                {isOwnProfile && (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100">Published</h2>
                      <p className="mt-1 text-sm text-zinc-500">Resources visible on your public profile.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {publishedCount}
                    </span>
                  </div>
                )}

                {resourcesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-video rounded-lg" />
                    ))}
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen size={48} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500">No published resources yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((resource) => (
                      <CommunityResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-lg" />
                  ))}
                </div>
              ) : postsError ? (
                <div className="py-16 text-center">
                  <p className="text-zinc-500">{postsError}</p>
                </div>
              ) : profilePosts.length === 0 ? (
                <div className="py-16 text-center">
                  <Newspaper size={48} className="mx-auto mb-4 text-zinc-700" />
                  <p className="text-zinc-500">No posts yet.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {profilePosts.map((post) => (
                      <PostListCard key={post.id} post={post} />
                    ))}
                  </div>
                  {postsHasMore && (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={loadMorePosts}
                        disabled={postsLoadingMore}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {postsLoadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
