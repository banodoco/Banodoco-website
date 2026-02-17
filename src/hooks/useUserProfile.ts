import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  discordUsername: string | null;
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
        // Fetch the profile by username
        const { data: profileData, error: profileError } = await client
          .from('profiles')
          .select('id, username, display_name, avatar_url, description, discord_username')
          .eq('username', username)
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
          username: profileData.username,
          displayName: profileData.display_name,
          avatarUrl: profileData.avatar_url,
          bio: profileData.description,
          discordUsername: profileData.discord_username,
        };

        setProfile(mapped);

        // Fetch media count (art) where user_id = profile.id
        const { count: mediaCount, error: artError } = await client
          .from('media')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', mapped.id)
          .in('admin_status', ['Featured', 'Curated', 'Listed']);

        if (!cancelled && !artError) {
          setArtCount(mediaCount ?? 0);
        }

        // Fetch assets count (resources) where user_id = profile.id
        const { count: assetsCount, error: resourceError } = await client
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', mapped.id)
          .in('admin_status', ['Featured', 'Curated', 'Listed']);

        if (!cancelled && !resourceError) {
          setResourceCount(assetsCount ?? 0);
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
