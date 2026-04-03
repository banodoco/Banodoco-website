import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { DEFAULT_PAGE_SIZE } from './constants';
import type { DiscordMessage, DiscordMember, EnrichedDiscordMessage } from './types';

interface UseDiscordMessagesResult {
  messages: EnrichedDiscordMessage[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

export const useDiscordMessages = (
  channelId: string,
  pageSize = DEFAULT_PAGE_SIZE,
): UseDiscordMessagesResult => {
  const [messages, setMessages] = useState<EnrichedDiscordMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const memberCacheRef = useRef(new Map<string, DiscordMember | null>());

  const fetchMembers = useCallback(async (authorIds: string[]): Promise<Map<string, DiscordMember | null>> => {
    const cache = memberCacheRef.current;
    const uncached = authorIds.filter(id => !cache.has(id));

    if (uncached.length > 0 && supabase) {
      const { data } = await supabase
        .from('discord_members')
        .select('member_id, username, global_name, server_nick, avatar_url')
        .in('member_id', uncached);

      if (data) {
        for (const member of data as DiscordMember[]) {
          cache.set(member.member_id, member);
        }
      }
      // Mark missing members as null to avoid re-fetching
      for (const id of uncached) {
        if (!cache.has(id)) cache.set(id, null);
      }
    }

    return cache;
  }, []);

  const fetchPage = useCallback(async (offset: number, isLoadMore: boolean) => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('discord_messages')
        .select('message_id, channel_id, author_id, content, created_at, attachments, embeds, reaction_count')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('reaction_count', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as DiscordMessage[];
      setHasMore(rows.length === pageSize);

      // Enrich with author data
      const authorIds = [...new Set(rows.map(r => r.author_id).filter(Boolean))];
      const members = await fetchMembers(authorIds);

      const enriched: EnrichedDiscordMessage[] = rows.map(msg => ({
        ...msg,
        author: members.get(msg.author_id) ?? null,
      }));

      if (isLoadMore) {
        setMessages(prev => [...prev, ...enriched]);
      } else {
        setMessages(enriched);
      }

      offsetRef.current = offset + rows.length;
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [channelId, pageSize, fetchMembers]);

  useEffect(() => {
    offsetRef.current = 0;
    memberCacheRef.current.clear();
    setMessages([]);
    setHasMore(true);
    setError(null);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage(offsetRef.current, true);
    }
  }, [loadingMore, hasMore, fetchPage]);

  return { messages, loading, loadingMore, error, hasMore, loadMore };
};
