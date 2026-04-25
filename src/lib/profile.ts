import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const getClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
};

export interface ProfilePatch {
  bio?: string;
  profile_links?: string[];
}

export const updateProfile = async (patch: ProfilePatch): Promise<void> => {
  const client = getClient();
  const { error } = await client.rpc('update_profile', { p_profile: patch });

  if (error) {
    throw error;
  }
};

export const updateBio = async (bio: string): Promise<void> => updateProfile({ bio });

export const updateProfileLinks = async (links: string[]): Promise<void> => updateProfile({ profile_links: links });
