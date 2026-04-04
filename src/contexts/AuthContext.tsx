import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  memberId: number | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
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

  // Fetch profile: try members table first (via auth_user_id), then profiles table as fallback
  const fetchProfile = useCallback(async (authUser: User) => {
    const client = supabase;
    if (!client) return;

    // Try members table (linked via auth_user_id)
    const { data: memberData } = await client
      .from('members')
      .select('member_id, username, global_name, avatar_url, stored_avatar_url, bio')
      .eq('auth_user_id', authUser.id)
      .single();

    if (memberData) {
      const avatarUrl = memberData.stored_avatar_url ?? memberData.avatar_url;
      setProfile({
        id: authUser.id,
        memberId: memberData.member_id,
        username: memberData.username,
        displayName: memberData.global_name,
        avatarUrl,
        bio: memberData.bio,
      });
      return;
    }

    // Fallback to profiles table (for users who signed up via Discord OAuth)
    const { data: profileData, error } = await client
      .from('profiles')
      .select('id, username, display_name, avatar_url, description')
      .eq('id', authUser.id)
      .single();

    if (!error && profileData) {
      setProfile({
        id: profileData.id,
        memberId: null,
        username: profileData.username,
        displayName: profileData.display_name,
        avatarUrl: profileData.avatar_url,
        bio: profileData.description,
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
        fetchProfile(currentUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
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
