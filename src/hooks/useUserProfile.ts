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
          .select('id, username, display_name, avatar_url, bio, discord_username')
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
          bio: profileData.bio,
          discordUsername: profileData.discord_username,
        };

        setProfile(mapped);

        // Fetch art_pieces count where user_id = profile.id and status = 'published'
        const { count: artPiecesCount, error: artError } = await client
          .from('art_pieces')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', mapped.id)
          .eq('status', 'published');

        if (!cancelled && !artError) {
          setArtCount(artPiecesCount ?? 0);
        }

        // Fetch community_resources count where user_id = profile.id and status = 'published'
        const { count: resourcesCount, error: resourceError } = await client
          .from('community_resources')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', mapped.id)
          .eq('status', 'published');

        if (!cancelled && !resourceError) {
          setResourceCount(resourcesCount ?? 0);
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
