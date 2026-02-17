import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  discordUsername: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from the profiles table for a given user ID
  const fetchProfile = useCallback(async (userId: string) => {
    const client = supabase;
    if (!client) return;

    const { data, error } = await client
      .from('profiles')
      .select('id, username, display_name, avatar_url, description, discord_username')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.description,
        discordUsername: data.discord_username,
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
