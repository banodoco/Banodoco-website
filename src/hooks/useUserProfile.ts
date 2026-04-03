import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface UserProfileData {
  id: string;
  memberId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  realName: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  banodocoOwner: boolean;
}

interface UseUserProfileResult {
  profile: UserProfileData | null;
  artCount: number;
  resourceCount: number;
  loading: boolean;
  error: string | null;
}

interface MemberRow {
  member_id: number;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
  stored_avatar_url: string | null;
  bio: string | null;
  real_name: string | null;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  banodoco_owner: boolean;
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
        const { data: memberData, error: memberError } = await client
          .from('members')
          .select('member_id, username, global_name, avatar_url, stored_avatar_url, bio, real_name, website_url, instagram_url, twitter_url, banodoco_owner')
          .eq('username', username)
          .single();

        if (memberError) {
          if (memberError.code === 'PGRST116') {
            if (!cancelled) {
              setProfile(null);
              setLoading(false);
            }
            return;
          }
          throw memberError;
        }

        if (cancelled) return;

        const row = memberData as MemberRow;
        const avatarUrl = row.stored_avatar_url ?? row.avatar_url;

        const mapped: UserProfileData = {
          id: String(row.member_id),
          memberId: row.member_id,
          username: row.username,
          displayName: row.global_name,
          avatarUrl,
          bio: row.bio,
          realName: row.real_name,
          websiteUrl: row.website_url,
          instagramUrl: row.instagram_url,
          twitterUrl: row.twitter_url,
          banodocoOwner: row.banodoco_owner,
        };

        setProfile(mapped);

        // Fetch media count (art) where member_id matches
        const { count: mediaCount, error: artError } = await client
          .from('media')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', row.member_id)
          .in('admin_status', ['Featured', 'Curated', 'Listed']);

        if (!cancelled && !artError) {
          setArtCount(mediaCount ?? 0);
        }

        // Fetch assets count (resources)
        const { count: assetsCount, error: resourceError } = await client
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', row.member_id)
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
