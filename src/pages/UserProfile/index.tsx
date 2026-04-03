import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, BookOpen, Pencil, Plus, Globe } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useArtPieces } from '@/hooks/useArtPieces';
import { useCommunityResources } from '@/hooks/useCommunityResources';
import { ArtGalleryCard } from '@/pages/Resources/ArtGallery/ArtGalleryCard';
import { CommunityResourceCard } from '@/pages/Resources/CommunityResourcesFeed/CommunityResourceCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { profilePath, profileResourcesPath } from '@/lib/routing';

type TabKey = 'art' | 'resources';

// Social link icons
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const { profile, artCount, resourceCount, loading, error } = useUserProfile(username);
  const { user } = useAuth();

  const activeTab: TabKey = location.pathname.endsWith('/resources') ? 'resources' : 'art';

  const { artPieces, loading: artLoading } = useArtPieces(profile?.memberId);
  const { resources, loading: resourcesLoading } = useCommunityResources(profile?.memberId);

  const isOwnProfile = !!(user && profile && user.id === profile.id);

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

  if (error) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen flex items-center justify-center">
        <p className="text-red-400/80 text-lg">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-normal tracking-tight text-zinc-300 mb-4">404</h1>
          <p className="text-xl text-zinc-500 mb-8">User not found.</p>
          <Link to="/resources" className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors">
            Back to Resources
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName || profile.username;
  const socialLinks = [
    profile.websiteUrl && { icon: Globe, url: profile.websiteUrl, label: 'Website' },
    profile.twitterUrl && { icon: TwitterIcon, url: profile.twitterUrl, label: 'Twitter' },
    profile.instagramUrl && { icon: InstagramIcon, url: profile.instagramUrl, label: 'Instagram' },
  ].filter(Boolean) as { icon: any; url: string; label: string }[];

  const tabs: { key: TabKey; label: string; count: number; icon: typeof Palette; path: string }[] = [
    { key: 'art', label: 'Art', count: artCount, icon: Palette, path: profilePath(profile.username) },
    { key: 'resources', label: 'Resources', count: resourceCount, icon: BookOpen, path: profileResourcesPath(profile.username) },
  ];

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
          <Link to="/resources" className="hover:text-zinc-300 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-zinc-400">{displayName}</span>
        </nav>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center gap-4"
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/10">
              <span className="text-3xl text-white/40 font-medium">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">{displayName}</h1>
            <p className="text-zinc-500 mt-1">@{profile.username}</p>
            {profile.realName && profile.realName !== displayName && (
              <p className="text-zinc-600 text-sm mt-0.5">{profile.realName}</p>
            )}
          </div>

          {profile.bio && (
            <p className="text-zinc-400 max-w-lg leading-relaxed">{profile.bio}</p>
          )}

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, url, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}

          {/* Own profile actions */}
          {isOwnProfile && (
            <div className="flex items-center gap-3 mt-2">
              <Link to="/settings/profile" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                <Pencil size={14} /> Edit Profile
              </Link>
              <Link to="/submit/art" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                <Plus size={14} /> Submit Art
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
                  isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-white/10 text-zinc-200' : 'bg-white/5 text-zinc-500'
                }`}>
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
