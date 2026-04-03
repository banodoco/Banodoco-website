import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface Competition {
  id: string;
  type: 'prize' | 'community';
  name: string;
  slug: string;
  status: string;
  theme: string | null;
}

export interface SubmissionEntry {
  id: string;
  competitionId: string;
  mediaId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  fallbackVideoUrl: string | null;
  subtitleUrl: string | null;
  toolsUsed: string[];
  voteCount: number;
  winner: boolean;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    discordUsername: string | null;
  } | null;
  assets: {
    id: string;
    name: string;
    type: string;
    loraLink: string | null;
    downloadLink: string | null;
  }[];
}

export const useCompetitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from('competitions')
      .select('id, type, name, slug, status, theme')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCompetitions(data as Competition[]);
        setLoading(false);
      });
  }, []);

  return { competitions, loading };
};

export const useCompetitionEntries = (competitionId: string | undefined) => {
  const [entries, setEntries] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from('submission_details')
      .select('*')
      .eq('competition_id', competitionId)
      .not('admin_hidden', 'eq', true)
      .order('vote_count', { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        const mapped: SubmissionEntry[] = (data as any[]).map(row => ({
          id: row.id,
          competitionId: row.competition_id,
          mediaId: row.media_id,
          title: row.title ?? '',
          description: row.description,
          thumbnailUrl: row.thumbnail_url,
          hlsUrl: row.hls_url ?? row.video_url,
          fallbackVideoUrl: row.fallback_video_url,
          subtitleUrl: row.subtitle_url,
          toolsUsed: row.tools_used ?? [],
          voteCount: row.vote_count ?? 0,
          winner: row.winner ?? false,
          profile: row.profile ? {
            displayName: row.profile.display_name ?? row.profile.discord_username,
            avatarUrl: row.profile.avatar_url,
            discordUsername: row.profile.discord_username,
          } : null,
          assets: (row.assets ?? []).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            loraLink: a.lora_link,
            downloadLink: a.download_link,
          })),
        }));

        setEntries(mapped);
        setLoading(false);
      });
  }, [competitionId]);

  return { entries, loading };
};
