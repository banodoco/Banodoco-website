export function isSupabaseDefaultHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /\.supabase\.co$/.test(hostname);
  } catch {
    return false;
  }
}
