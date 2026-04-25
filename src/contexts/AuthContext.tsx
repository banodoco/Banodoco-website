import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AuthContext, type AuthContextValue } from './useAuth';

export const PREVIEW_UNAPPROVED_KEY = 'banodoco_preview_unapproved';

function readPreviewUnapproved(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(PREVIEW_UNAPPROVED_KEY) === '1';
}

export interface UserProfile {
  id: string;
  memberId: string | null;
  isAdmin: boolean;
  isApproved: boolean;
  discordUsername: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  profileLinks: string[];
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const adminCacheRef = useRef(new Map<string, boolean>());

  // Fetch profile from the profiles table for a given user ID
  const fetchProfile = useCallback(async (userId: string) => {
    const client = supabase;
    if (!client) return;

    const { data, error } = await client
      .from('profiles')
      .select('id, discord_id, discord_username, display_name, avatar_url, bio, profile_links, is_approved')
      .eq('id', userId)
      .single();

    let isAdmin = adminCacheRef.current.get(userId) ?? false;
    if (!adminCacheRef.current.has(userId)) {
      try {
        const { data: adminData, error: adminError } = await client.rpc('is_admin', { check_user_id: userId });
        isAdmin = !adminError && adminData === true;
      } catch {
        isAdmin = false;
      }
      adminCacheRef.current.set(userId, isAdmin);
    }

    if (!error && data) {
      const previewUnapproved = readPreviewUnapproved();
      setProfile({
        id: data.id,
        memberId: data.discord_id,
        isAdmin,
        isApproved: previewUnapproved ? false : (data.is_approved ?? false),
        discordUsername: data.discord_username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        profileLinks: Array.isArray(data.profile_links) ? data.profile_links : [],
      });
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return;
    }

    // Check for existing session
    client.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        adminCacheRef.current.clear();
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithDiscord = useCallback(async () => {
    const client = supabase;
    if (!client) return;

    await client.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    const client = supabase;
    if (!client) return;

    await client.auth.signOut();
    adminCacheRef.current.clear();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    signInWithDiscord,
    signOut,
    refreshProfile,
  }), [user, profile, loading, signInWithDiscord, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
