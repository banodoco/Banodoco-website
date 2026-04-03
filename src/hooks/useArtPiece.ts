import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ArtPieceItem, ArtPieceCreator } from '@/hooks/useArtPieces';
import { buildEntitySlug, extractEntityIdFromSlug, profilePath } from '@/lib/routing';

export type ArtPieceDetail = ArtPieceItem;

interface UseArtPieceResult {
  artPiece: ArtPieceDetail | null;
  loading: boolean;
  error: string | null;
}

interface MemberJoin {
  member_id: number;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
  stored_avatar_url: string | null;
  bio: string | null;
}

interface MediaRow {
  id: string;
  type: string | null;
  title: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  created_at: string;
  member_id: number | null;
  tools_used: string[] | null;
  members: MemberJoin | MemberJoin[] | null;
}

function unwrapMember(m: MemberJoin | MemberJoin[] | null): MemberJoin | null {
  if (Array.isArray(m)) return m[0] ?? null;
  return m;
}

export const useArtPiece = (slugOrId: string | undefined): UseArtPieceResult => {
  const [artPiece, setArtPiece] = useState<ArtPieceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false);
      return;
    }

    const resolvedId = extractEntityIdFromSlug(slugOrId);
    if (!resolvedId) {
      setLoading(false);
      setError('Invalid art link');
      return;
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return;
    }

    const fetchArtPiece = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await client
          .from('media')
          .select(
            `id, type, title, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, created_at, member_id, tools_used,
             members(member_id, username, global_name, avatar_url, stored_avatar_url, bio)`,
          )
          .eq('id', resolvedId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Art piece not found');
          return;
        }

        const row = data as MediaRow;
        const member = unwrapMember(row.members);
        const avatarUrl = member?.stored_avatar_url ?? member?.avatar_url ?? null;

        const creator: ArtPieceCreator = member
          ? {
              memberId: member.member_id,
              username: member.username,
              displayName: member.global_name ?? member.username,
              avatarUrl,
              profileUrl: member.username ? profilePath(member.username) : null,
            }
          : {
              memberId: null,
              username: null,
              displayName: 'Unknown',
              avatarUrl: null,
              profileUrl: null,
            };

        setArtPiece({
          id: row.id,
          slug: buildEntitySlug(row.title || row.description, row.id),
          title: row.title,
          caption: row.description,
          thumbnailUrl: row.cloudflare_thumbnail_url,
          hlsUrl: row.cloudflare_playback_hls_url,
          mediaType: row.type,
          toolsUsed: row.tools_used ?? [],
          createdAt: row.created_at,
          creator,
          memberId: row.member_id,
        });
      } catch {
        setError('Failed to load art piece');
      } finally {
        setLoading(false);
      }
    };

    fetchArtPiece();
  }, [slugOrId]);

  return { artPiece, loading, error };
};
