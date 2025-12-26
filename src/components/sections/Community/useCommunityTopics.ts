import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TopicData, Attachment } from './types';

interface UseCommunityTopicsResult {
  topics: TopicData[];
  loading: boolean;
  error: string | null;
}

export const useCommunityTopics = (): UseCommunityTopicsResult => {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the database function to get pre-processed topics
        const { data: topicsData, error: topicsError } = await supabase
          .rpc('get_top_community_topics');

        if (topicsError) throw topicsError;
        if (!topicsData || topicsData.length === 0) {
          setLoading(false);
          return;
        }

        // Collect all media message IDs
        const allMediaIds = topicsData.flatMap((t: TopicData) => t.media_message_ids || []);

        // Fetch media URLs in one query
        let mediaMap: Record<string, string> = {};
        if (allMediaIds.length > 0) {
          const { data: messagesData } = await supabase
            .from('discord_messages')
            .select('message_id::text, attachments')
            .in('message_id', allMediaIds);

          if (messagesData) {
            messagesData.forEach((msg: { message_id: string; attachments: Attachment[] }) => {
              if (msg.attachments?.length > 0) {
                const mediaAttachment = msg.attachments.find(
                  (a: Attachment) => a.filename.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mov)$/i)
                );
                if (mediaAttachment) {
                  mediaMap[msg.message_id] = mediaAttachment.url;
                }
              }
            });
          }
        }

        // Resolve media URLs for each topic
        const topicsWithMedia = topicsData.map((topic: TopicData) => ({
          ...topic,
          mediaUrls: (topic.media_message_ids || [])
            .map((id: string) => mediaMap[id])
            .filter(Boolean)
        }));

        setTopics(topicsWithMedia);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load community updates');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { topics, loading, error };
};

