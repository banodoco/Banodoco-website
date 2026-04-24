import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AssetCommentAuthorRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
}

interface AssetCommentMediaRow {
  sort_order: number;
  is_deleted: boolean;
  media: AssetCommentMedia | AssetCommentMedia[] | null;
}

interface AssetCommentRow {
  id: string;
  asset_id: string;
  discord_guild_id: string;
  discord_thread_id: string;
  discord_message_id: string;
  author_member_id: string | null;
  content: string | null;
  reply_to_comment_id: string | null;
  reply_to_discord_message_id: string | null;
  reaction_count: number;
  discord_created_at: string;
  discord_edited_at: string | null;
  author: AssetCommentAuthorRow | AssetCommentAuthorRow[] | null;
  asset_comment_media: AssetCommentMediaRow[] | null;
}

export interface AssetCommentAuthor {
  memberId: string;
  username: string | null;
  globalName: string | null;
  avatarUrl: string | null;
}

export interface AssetCommentMedia {
  id: string;
  type: string | null;
  url: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  backup_thumbnail_url: string | null;
  placeholder_image: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AssetCommentMediaLink {
  sortOrder: number;
  media: AssetCommentMedia;
}

export interface AssetComment {
  id: string;
  assetId: string;
  discordGuildId: string;
  discordThreadId: string;
  discordMessageId: string;
  authorMemberId: string | null;
  content: string | null;
  replyToCommentId: string | null;
  replyToDiscordMessageId: string | null;
  reactionCount: number;
  discordCreatedAt: string;
  discordEditedAt: string | null;
  author: AssetCommentAuthor | null;
  media: AssetCommentMediaLink[];
}

interface UseAssetCommentsResult {
  comments: AssetComment[];
  loading: boolean;
  error: string | null;
}

function unwrapJoined<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export const useAssetComments = (assetId: string | undefined): UseAssetCommentsResult => {
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!assetId) {
      setComments([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isSupabaseConfigured || !client) {
      setComments([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchComments = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await client
          .from('asset_comments')
          .select(`
            id,
            asset_id,
            discord_guild_id:discord_guild_id::text,
            discord_thread_id:discord_thread_id::text,
            discord_message_id:discord_message_id::text,
            author_member_id:author_member_id::text,
            content,
            reply_to_comment_id,
            reply_to_discord_message_id:reply_to_discord_message_id::text,
            reaction_count,
            discord_created_at,
            discord_edited_at,
            author:author_member_id (
              member_id:member_id::text,
              username,
              global_name,
              avatar_url
            ),
            asset_comment_media (
              sort_order,
              is_deleted,
              media:media_id (
                id,
                type,
                url,
                cloudflare_thumbnail_url,
                cloudflare_playback_hls_url,
                backup_thumbnail_url,
                placeholder_image,
                metadata
              )
            )
          `)
          .eq('asset_id', assetId)
          .eq('is_deleted', false)
          .order('discord_created_at', { ascending: true })
          .order('sort_order', { foreignTable: 'asset_comment_media', ascending: true });

        if (fetchError) throw fetchError;

        const normalized = ((data ?? []) as AssetCommentRow[]).map((comment) => {
          const author = unwrapJoined(comment.author);
          const media = (comment.asset_comment_media ?? [])
            .filter((link) => !link.is_deleted)
            .map((link) => {
              const joinedMedia = unwrapJoined(link.media);
              if (!joinedMedia) return null;
              return {
                sortOrder: link.sort_order,
                media: joinedMedia,
              };
            })
            .filter((link): link is AssetCommentMediaLink => link !== null);

          return {
            id: comment.id,
            assetId: comment.asset_id,
            discordGuildId: comment.discord_guild_id,
            discordThreadId: comment.discord_thread_id,
            discordMessageId: comment.discord_message_id,
            authorMemberId: comment.author_member_id,
            content: comment.content,
            replyToCommentId: comment.reply_to_comment_id,
            replyToDiscordMessageId: comment.reply_to_discord_message_id,
            reactionCount: comment.reaction_count,
            discordCreatedAt: comment.discord_created_at,
            discordEditedAt: comment.discord_edited_at,
            author: author
              ? {
                  memberId: author.member_id,
                  username: author.username,
                  globalName: author.global_name,
                  avatarUrl: author.avatar_url,
                }
              : null,
            media,
          };
        });

        setComments(normalized);
      } catch {
        setComments([]);
        setError('Failed to load asset comments');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [assetId]);

  return { comments, loading, error };
};
