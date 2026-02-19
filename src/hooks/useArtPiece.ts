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
  created_at: string;
  user_id: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
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
            'id, type, description, cloudflare_thumbnail_url, cloudflare_playback_hls_url, created_at, user_id',
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

        if (row.user_id) {
          const { data: profileData } = await client
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', row.user_id)
            .single();

          if (profileData) {
            const profile = profileData as ProfileRow;
            creator = {
              username: profile.username,
              displayName: profile.display_name ?? profile.username,
              avatarUrl: profile.avatar_url,
              profileUrl: profile.username ? profilePath(profile.username) : null,
            };
          }
        }

        setArtPiece({
          id: row.id,
          slug: buildEntitySlug(row.description, row.id),
          title: null,
          caption: row.description,
          thumbnailUrl: row.cloudflare_thumbnail_url,
          hlsUrl: row.cloudflare_playback_hls_url,
          mediaType: row.type,
          createdAt: row.created_at,
          creator,
          userId: row.user_id,
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
