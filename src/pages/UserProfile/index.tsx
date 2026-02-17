import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, BookOpen, Pencil, Plus } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useArtPieces } from '@/hooks/useArtPieces';
import { useCommunityResources } from '@/hooks/useCommunityResources';
import { ArtGalleryCard } from '@/pages/Resources/ArtGallery/ArtGalleryCard';
import { CommunityResourceCard } from '@/pages/Resources/CommunityResourcesFeed/CommunityResourceCard';
import { Skeleton } from '@/components/ui/Skeleton';

type TabKey = 'art' | 'resources';

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const { profile, artCount, resourceCount, loading, error } = useUserProfile(username);
  const { user } = useAuth();

  // Determine active tab from the URL path
  const activeTab: TabKey = location.pathname.endsWith('/resources') ? 'resources' : 'art';

  // Fetch art pieces and community resources for the profile
  const {
    artPieces,
    loading: artLoading,
  } = useArtPieces(profile?.id);

  const {
    resources,
    loading: resourcesLoading,
  } = useCommunityResources(profile?.id);

  const isOwnProfile = !!(user && profile && user.id === profile.id);

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
      path: `/u/${profile.username}`,
    },
    {
      key: 'resources',
      label: 'Resources',
      count: resourceCount,
      icon: BookOpen,
      path: `/u/${profile.username}/resources`,
    },
  ];

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-16">
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
              alt={profile.displayName || profile.username}
              className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/10">
              <span className="text-3xl text-white/40 font-medium">
                {(profile.displayName || profile.username).charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name & Username */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">
              {profile.displayName || profile.username}
            </h1>
            <p className="text-zinc-500 mt-1">@{profile.username}</p>
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
            <div>
              {resourcesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-lg" />
                  ))}
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen size={48} className="mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No resources yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.map((resource) => (
                    <CommunityResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
