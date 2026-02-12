import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase is used for live community updates. The rest of the site should still
 * render even when Supabase isn't configured (e.g. local dev or preview builds).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null =
  isSupabaseConfigured ? createClient(supabaseUrl!, supabaseKey!) : null;



