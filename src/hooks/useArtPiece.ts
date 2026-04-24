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

interface MemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
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
            'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, backup_thumbnail_url, created_at, member_id:member_id::text',
          )
          .eq('id', resolvedId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Art piece not found');
          return;
        }

        const row = data as MediaRow;

        let creator: ArtPieceCreator = {
          username: null,
          displayName: 'Unknown',
          avatarUrl: null,
          profileUrl: null,
        };

        if (row.member_id) {
          const { data: memberData } = await client
            .from('members')
            .select('member_id:member_id::text, username, global_name, avatar_url')
            .eq('member_id', row.member_id)
            .single();

          if (memberData) {
            const member = memberData as MemberRow;
            creator = {
              username: member.username,
              displayName: member.global_name ?? member.username,
              avatarUrl: member.avatar_url,
              profileUrl: member.username ? profilePath(member.username) : null,
            };
          }
        }

        setArtPiece({
          id: row.id,
          slug: buildEntitySlug(row.description, row.id),
          title: null,
          caption: row.description,
          thumbnailUrl: row.backup_thumbnail_url ?? row.cloudflare_thumbnail_url,
          cloudflareThumbnailUrl: row.cloudflare_thumbnail_url,
          hlsUrl: row.cloudflare_playback_hls_url,
          mediaType: row.type,
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
