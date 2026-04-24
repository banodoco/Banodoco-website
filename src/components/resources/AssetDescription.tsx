import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/posts/MarkdownRenderer';

interface AssetDescriptionProps {
  markdown?: string | null;
}

const USER_MENTION = /<@!?(\d+)>/g;
const CHANNEL_MENTION = /<#(\d+)>/g;

function extractMentionIds(content: string): { userIds: string[]; channelIds: string[] } {
  const userIds = [...content.matchAll(USER_MENTION)].map((match) => match[1]);
  const channelIds = [...content.matchAll(CHANNEL_MENTION)].map((match) => match[1]);
  return {
    userIds: [...new Set(userIds)],
    channelIds: [...new Set(channelIds)],
  };
}

export function AssetDescription({ markdown }: AssetDescriptionProps) {
  const raw = markdown ?? '';
  const [resolved, setResolved] = useState(raw);

  useEffect(() => {
    setResolved(raw);
    if (!isSupabaseConfigured || !supabase) return;

    const { userIds, channelIds } = extractMentionIds(raw);
    if (userIds.length === 0 && channelIds.length === 0) return;

    let cancelled = false;
    const client = supabase;

    (async () => {
      const [membersResp, channelsResp] = await Promise.all([
        userIds.length > 0
          ? client
              .from('members')
              .select('member_id:member_id::text, username, global_name')
              .in('member_id', userIds)
          : Promise.resolve({ data: [] as { member_id: string; username: string | null; global_name: string | null }[] }),
        channelIds.length > 0
          ? client
              .from('discord_channels')
              .select('channel_id:channel_id::text, channel_name')
              .in('channel_id', channelIds)
          : Promise.resolve({ data: [] as { channel_id: string; channel_name: string | null }[] }),
      ]);

      if (cancelled) return;

      const memberMap = new Map<string, string>();
      for (const m of (membersResp.data ?? []) as { member_id: string; username: string | null; global_name: string | null }[]) {
        memberMap.set(m.member_id, m.global_name ?? m.username ?? m.member_id);
      }
      const channelMap = new Map<string, string>();
      for (const c of (channelsResp.data ?? []) as { channel_id: string; channel_name: string | null }[]) {
        channelMap.set(c.channel_id, c.channel_name ?? c.channel_id);
      }

      const next = raw
        .replace(USER_MENTION, (_match, id: string) => `@${memberMap.get(id) ?? id}`)
        .replace(CHANNEL_MENTION, (_match, id: string) => `#${channelMap.get(id) ?? id}`);

      setResolved(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [raw]);

  return <MarkdownRenderer content={resolved} variant="detail" />;
}

export default AssetDescription;
