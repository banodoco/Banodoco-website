import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface UserProfileData {
  id: string;
  memberId: string | null;
  discordUsername: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

interface UseUserProfileResult {
  profile: UserProfileData | null;
  artCount: number;
  postCount: number;
  resourceCount: number;
  publishedCount: number;
  draftCount: number;
  loading: boolean;
  error: string | null;
}

export const useUserProfile = (
  username: string | undefined,
  viewerAuthUserId?: string,
): UseUserProfileResult => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [artCount, setArtCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setArtCount(0);
      setPostCount(0);
      setResourceCount(0);
      setPublishedCount(0);
      setDraftCount(0);
      setLoading(false);
      return;
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setProfile(null);
      setArtCount(0);
      setPostCount(0);
      setResourceCount(0);
      setPublishedCount(0);
      setDraftCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setArtCount(0);
      setPostCount(0);
      setResourceCount(0);
      setPublishedCount(0);
      setDraftCount(0);

      try {
        // Fetch the profile by discord_username
        const { data: profileData, error: profileError } = await client
          .from('profiles')
          .select('id, discord_id, discord_username, display_name, avatar_url, bio')
          .eq('discord_username', username)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // No rows returned — profile not found
            if (!cancelled) {
              setProfile(null);
              setArtCount(0);
              setPostCount(0);
              setResourceCount(0);
              setPublishedCount(0);
              setDraftCount(0);
              setLoading(false);
            }
            return;
          }
          throw profileError;
        }

        if (cancelled) return;

        const mapped: UserProfileData = {
          id: profileData.id,
          memberId: profileData.discord_id,
          discordUsername: profileData.discord_username,
          displayName: profileData.display_name,
          avatarUrl: profileData.avatar_url,
          bio: profileData.bio,
        };

        setProfile(mapped);

        // Use discord_id (member_id as string) to query media/assets by member_id
        const memberId = mapped.memberId?.trim() || null;
        const isOwnerView = Boolean(viewerAuthUserId && viewerAuthUserId === mapped.id);

        if (memberId) {
          // Fetch media count (art) where member_id matches
          const { count: mediaCount, error: artError } = await client
            .from('media')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', memberId)
            .eq('source', 'art')
            .in('admin_status', ['Featured', 'Curated', 'Listed']);

          if (!cancelled && !artError) {
            setArtCount(mediaCount ?? 0);
          }

          const postsQuery = client
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', memberId);

          const { count: postsCount, error: postError } = isOwnerView
            ? await postsQuery.in('status', ['draft', 'published'])
            : await postsQuery
              .eq('status', 'published')
              .or('admin_status.is.null,admin_status.neq.Hidden');

          if (!cancelled && !postError) {
            setPostCount(postsCount ?? 0);
          }

          // Fetch assets count (resources) where member_id matches
          const { count: assetsCount, error: resourceError } = await client
            // status filter required for public reads
            .from('assets')
            .select('id, source, discord_guild_id, discord_channel_id, discord_thread_id, is_hidden', { count: 'exact', head: true })
            .eq('member_id', memberId)
            .eq('is_hidden', false)
            .eq('status', 'published')
            .in('admin_status', ['Curated', 'Listed']);

          if (!cancelled && !resourceError) {
            const nextPublishedCount = assetsCount ?? 0;
            setPublishedCount(nextPublishedCount);
            setResourceCount(nextPublishedCount);
          }

          if (isOwnerView) {
            const { count: draftAssetsCount, error: draftResourceError } = await client
              .from('assets')
              .select('id', { count: 'exact', head: true })
              .eq('member_id', memberId)
              .eq('status', 'draft');

            if (!cancelled && !draftResourceError) {
              setDraftCount(draftAssetsCount ?? 0);
            }
          } else if (!cancelled) {
            setDraftCount(0);
          }
        } else if (!cancelled) {
          setArtCount(0);
          setPostCount(0);
          setResourceCount(0);
          setPublishedCount(0);
          setDraftCount(0);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load profile');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [username, viewerAuthUserId]);

  return { profile, artCount, postCount, resourceCount, publishedCount, draftCount, loading, error };
};
