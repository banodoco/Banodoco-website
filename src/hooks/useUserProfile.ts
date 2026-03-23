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
  resourceCount: number;
  loading: boolean;
  error: string | null;
}

export const useUserProfile = (username: string | undefined): UseUserProfileResult => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [artCount, setArtCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

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
        const memberId = mapped.memberId ? Number(mapped.memberId) : null;

        if (memberId) {
          // Fetch media count (art) where member_id matches
          const { count: mediaCount, error: artError } = await client
            .from('media')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', memberId)
            .in('admin_status', ['Featured', 'Curated', 'Listed']);

          if (!cancelled && !artError) {
            setArtCount(mediaCount ?? 0);
          }

          // Fetch assets count (resources) where member_id matches
          const { count: assetsCount, error: resourceError } = await client
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', memberId)
            .in('admin_status', ['Featured', 'Curated', 'Listed']);

          if (!cancelled && !resourceError) {
            setResourceCount(assetsCount ?? 0);
          }
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
  }, [username]);

  return { profile, artCount, resourceCount, loading, error };
};
