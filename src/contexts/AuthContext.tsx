import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AuthContext, type AuthContextValue } from './useAuth';

export interface UserProfile {
  id: string;
  memberId: string | null;
  isAdmin: boolean;
  discordUsername: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
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
      .select('id, discord_id, discord_username, display_name, avatar_url, bio')
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
      setProfile({
        id: data.id,
        memberId: data.discord_id,
        isAdmin,
        discordUsername: data.discord_username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
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

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    signInWithDiscord,
    signOut,
  }), [user, profile, loading, signInWithDiscord, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
