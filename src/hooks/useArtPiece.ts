import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ArtPieceItem, ArtPieceCreator } from '@/hooks/useArtPieces';

interface ArtPieceRow {
  id: string;
  source_type: string;
  title: string | null;
  caption: string | null;
  media_urls: string[] | null;
  media_types: string[] | null;
  thumbnail_url: string | null;
  reaction_count: number;
  tags: string[] | null;
  created_at: string;
  user_id: string | null;
  discord_author_id: string | null;
  associated_asset_id: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DiscordMemberRow {
  member_id: string;
  username: string;
  global_name: string | null;
  server_nick: string | null;
  avatar_url: string | null;
}

export interface ArtPieceDetail extends ArtPieceItem {
  associatedAssetId: string | null;
}

interface UseArtPieceResult {
  artPiece: ArtPieceDetail | null;
  loading: boolean;
  error: string | null;
}

export const useArtPiece = (id: string | undefined): UseArtPieceResult => {
  const [artPiece, setArtPiece] = useState<ArtPieceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
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
          .from('art_pieces')
          .select(
            'id, source_type, title, caption, media_urls, media_types, thumbnail_url, reaction_count, tags, created_at, user_id, discord_author_id, associated_asset_id',
          )
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Art piece not found');
          return;
        }

        const row = data as ArtPieceRow;

        let creator: ArtPieceCreator = {
          username: null,
          displayName: 'Unknown',
          avatarUrl: null,
          profileUrl: null,
        };

        // Resolve creator from profile or discord member
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
              profileUrl: profile.username ? `/u/${profile.username}` : null,
            };
          }
        } else if (row.discord_author_id) {
          const { data: memberData } = await client
            .from('discord_members')
            .select('member_id, username, global_name, server_nick, avatar_url')
            .eq('member_id', row.discord_author_id)
            .single();

          if (memberData) {
            const member = memberData as DiscordMemberRow;
            creator = {
              username: member.username,
              displayName:
                member.server_nick ?? member.global_name ?? member.username,
              avatarUrl: member.avatar_url,
              profileUrl: null,
            };
          }
        }

        setArtPiece({
          id: row.id,
          sourceType: row.source_type === 'upload' ? 'upload' : 'discord',
          title: row.title,
          caption: row.caption,
          mediaUrls: row.media_urls ?? [],
          mediaTypes: row.media_types ?? [],
          thumbnailUrl: row.thumbnail_url,
          reactionCount: row.reaction_count,
          tags: row.tags ?? [],
          createdAt: row.created_at,
          creator,
          associatedAssetId: row.associated_asset_id,
        });
      } catch {
        setError('Failed to load art piece');
      } finally {
        setLoading(false);
      }
    };

    fetchArtPiece();
  }, [id]);

  return { artPiece, loading, error };
};
