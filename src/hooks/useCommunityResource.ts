import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { CommunityResourceItem, ResourceCreator } from '@/hooks/useCommunityResources';

export type { CommunityResourceItem };

interface RawResource {
  id: string;
  source_type: string;
  title: string;
  description: string | null;
  primary_url: string | null;
  additional_urls: string[] | null;
  media_urls: string[] | null;
  media_types: string[] | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  resource_type: string;
  reaction_count: number;
  created_at: string;
  user_id: string | null;
  discord_author_id: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DiscordMemberRow {
  member_id: string;
  username: string | null;
  global_name: string | null;
  server_nick: string | null;
  avatar_url: string | null;
}

interface UseCommunityResourceResult {
  resource: CommunityResourceItem | null;
  loading: boolean;
  error: string | null;
}

async function fetchCreator(
  raw: RawResource,
): Promise<ResourceCreator> {
  if (!supabase) {
    return { username: null, displayName: null, avatarUrl: null, profileUrl: null };
  }

  if (raw.user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', raw.user_id)
      .single();

    if (data) {
      const profile = data as ProfileRow;
      return {
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.username ? `/u/${profile.username}` : null,
      };
    }
  }

  if (raw.discord_author_id) {
    const { data } = await supabase
      .from('discord_members')
      .select('member_id, username, global_name, server_nick, avatar_url')
      .eq('member_id', raw.discord_author_id)
      .single();

    if (data) {
      const member = data as DiscordMemberRow;
      return {
        username: member.username,
        displayName: member.server_nick ?? member.global_name ?? member.username,
        avatarUrl: member.avatar_url,
        profileUrl: null,
      };
    }
  }

  return { username: null, displayName: null, avatarUrl: null, profileUrl: null };
}

export const useCommunityResource = (id: string | undefined): UseCommunityResourceResult => {
  const [resource, setResource] = useState<CommunityResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('No resource ID provided');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const fetchResource = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase!
          .from('community_resources')
          .select(
            'id, source_type, title, description, primary_url, additional_urls, media_urls, media_types, thumbnail_url, tags, resource_type, reaction_count, created_at, user_id, discord_author_id',
          )
          .eq('id', id)
          .eq('status', 'published')
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Resource not found');
          return;
        }

        const raw = data as RawResource;
        const creator = await fetchCreator(raw);

        setResource({
          id: raw.id,
          sourceType: raw.source_type === 'discord' ? 'discord' : 'upload',
          title: raw.title,
          description: raw.description,
          primaryUrl: raw.primary_url,
          additionalUrls: raw.additional_urls ?? [],
          mediaUrls: raw.media_urls ?? [],
          mediaTypes: raw.media_types ?? [],
          thumbnailUrl: raw.thumbnail_url,
          tags: raw.tags ?? [],
          resourceType: raw.resource_type,
          reactionCount: raw.reaction_count,
          createdAt: raw.created_at,
          creator,
        });
      } catch {
        setError('Failed to load resource');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  return { resource, loading, error };
};
