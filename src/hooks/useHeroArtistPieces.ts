import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { mapRowToItem, type ArtPieceItem } from '@/hooks/useArtPieces';

interface UseHeroArtistPiecesResult {
  pieces: ArtPieceItem[];
  loading: boolean;
  error: string | null;
}

interface MemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

interface MediaRow {
  id: string;
  type: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  created_at: string;
  member_id: string | null;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export const useHeroArtistPieces = (
  usernames: readonly string[],
): UseHeroArtistPiecesResult => {
  const [pieces, setPieces] = useState<ArtPieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const usernamesKey = usernames.join('\0');

  useEffect(() => {
    let cancelled = false;
    const resolvedUsernames = usernamesKey ? usernamesKey.split('\0') : [];

    const fetchPieces = async () => {
      const client = supabase;
      if (!isSupabaseConfigured || !client) {
        if (!cancelled) {
          setPieces([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        for (const username of resolvedUsernames) {
          if (!USERNAME_PATTERN.test(username)) {
            throw new Error(`Invalid username filter: ${username}`);
          }
        }

        if (resolvedUsernames.length === 0) {
          if (!cancelled) {
            setPieces([]);
            setLoading(false);
          }
          return;
        }

        const memberFilter = resolvedUsernames
          .map((username) => `username.ilike.${username}`)
          .join(',');

        const { data: memberData, error: memberError } = await client
          .from('members')
          .select('member_id:member_id::text, username, global_name, avatar_url')
          .or(memberFilter);

        if (memberError) throw memberError;

        const members = (memberData ?? []) as MemberRow[];
        const memberByUsername = new Map<string, MemberRow>();

        for (const member of members) {
          if (member.username) {
            memberByUsername.set(member.username.toLowerCase(), member);
          }
        }

        const orderedMembers = resolvedUsernames
          .map((username) => memberByUsername.get(username.toLowerCase()) ?? null)
          .filter((member): member is MemberRow => member != null);

        const memberMap = new Map(
          orderedMembers.map((member) => [member.member_id, member] as const),
        );

        const pieceResults = await Promise.all(
          orderedMembers.map(async (member) => {
            const { data, error: mediaError } = await client
              .from('media')
              .select(
                'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url, created_at, member_id:member_id::text',
              )
              .eq('member_id', member.member_id)
              .eq('type', 'video')
              .eq('featured_on_2rf', true)
              .order('created_at', { ascending: false })
              .limit(1);

            if (mediaError) throw mediaError;

            const row = (data?.[0] ?? null) as MediaRow | null;
            if (!row) return null;

            return mapRowToItem(row, memberMap);
          }),
        );

        if (!cancelled) {
          setPieces(pieceResults.filter((piece): piece is ArtPieceItem => piece != null));
          setLoading(false);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setPieces([]);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Failed to load hero artist pieces',
          );
          setLoading(false);
        }
      }
    };

    void fetchPieces();

    return () => {
      cancelled = true;
    };
  }, [usernamesKey]);

  return { pieces, loading, error };
};
