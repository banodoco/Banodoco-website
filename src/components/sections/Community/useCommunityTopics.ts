import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { TopicData, MediaUrl, RawTopic } from './types';

interface UseCommunityTopicsResult {
  topics: TopicData[];
  loading: boolean;
  error: string | null;
}

// Shape of what we actually select from the database
interface SummaryRow {
  full_summary: string;
  date: string;
  channel_id: string;
  discord_channels: {
    channel_name: string;
  } | { channel_name: string }[] | null;
}

// Valid image and video file extensions
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|jfif|png|gif|webp|avif|bmp|tiff?|svg|heic|heif)(\?|$)/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv|3gp|ts|mts|m2ts)(\?|$)/i;

// Check if a URL is a valid image or video file
const isValidMediaUrl = (media: MediaUrl): boolean => {
  if (!media.url) return false;
  const url = media.url.toLowerCase();
  
  // Check by type first
  if (media.type === 'video') {
    return VIDEO_EXTENSIONS.test(url);
  }
  if (media.type === 'image') {
    return IMAGE_EXTENSIONS.test(url);
  }
  
  // Fallback: check by extension if type is not set correctly
  return IMAGE_EXTENSIONS.test(url) || VIDEO_EXTENSIONS.test(url);
};

// Extract all media URLs from a topic (mainMediaUrls + subTopicMediaUrls)
// Filters to only images/videos and sorts results with videos first
const extractMediaUrls = (rawTopic: RawTopic): MediaUrl[] => {
  const urls: MediaUrl[] = [];
  
  // Add main media URLs if present
  if (rawTopic.mainMediaUrls && rawTopic.mainMediaUrls.length > 0) {
    urls.push(...rawTopic.mainMediaUrls);
  }
  
  // Add subtopic media URLs - only from subtopics that are included_in_main
  if (rawTopic.subTopics) {
    for (const subTopic of rawTopic.subTopics) {
      if (subTopic.included_in_main && subTopic.subTopicMediaUrls) {
        for (const mediaGroup of subTopic.subTopicMediaUrls) {
          if (Array.isArray(mediaGroup)) {
            urls.push(...mediaGroup);
          }
        }
      }
    }
  }
  
  // Filter to only valid image/video files, then sort with videos first
  return urls
    .filter(isValidMediaUrl)
    .sort((a, b) => {
      if (a.type === 'video' && b.type !== 'video') return -1;
      if (a.type !== 'video' && b.type === 'video') return 1;
      return 0;
    });
};


export const useCommunityTopics = (): UseCommunityTopicsResult => {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      // Don't hard-crash the whole site just because Supabase isn't configured.
      setTopics([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch daily summaries that are included in main (exclude dev mode)
        // Join with discord_channels to get channel names
        const { data: summariesData, error: summariesError } = await client
          .from('daily_summaries')
          .select('full_summary, date, channel_id, discord_channels(channel_name)')
          .eq('included_in_main_summary', true)
          .eq('dev_mode', false)
          .order('date', { ascending: false })
          .limit(3);

        if (summariesError) throw summariesError;
        if (!summariesData || summariesData.length === 0) {
          setLoading(false);
          return;
        }

        // Parse the summaries and extract topics with included_in_main: true
        const allTopics: TopicData[] = [];

        for (const summary of summariesData as SummaryRow[]) {
          try {
            const rawTopics: RawTopic[] = JSON.parse(summary.full_summary);
            
            // Filter for topics with included_in_main: true and take up to 3 per summary
            const includedTopics = rawTopics
              .filter((t: RawTopic) => t.included_in_main === true);

            // Transform to TopicData format
            for (const rawTopic of includedTopics) {
              const mediaUrls = extractMediaUrls(rawTopic);
              const channelName =
                Array.isArray(summary.discord_channels)
                  ? summary.discord_channels[0]?.channel_name
                  : summary.discord_channels?.channel_name;
              
              allTopics.push({
                channel_id: rawTopic.channel_id || summary.channel_id,
                channel_name: channelName || 'community',
                topic_title: rawTopic.title,
                topic_main_text: rawTopic.mainText,
                topic_sub_topics: rawTopic.subTopics
                  .filter(st => st.included_in_main)
                  .map(st => ({
                    text: st.text,
                    subTopicMediaMessageIds: st.subTopicMediaMessageIds,
                    message_id: st.message_id,
                    channel_id: st.channel_id,
                    included_in_main: st.included_in_main,
                    subTopicMediaUrls: st.subTopicMediaUrls,
                  })),
                media_message_ids: [],
                media_count: mediaUrls.length,
                summary_date: summary.date,
                mediaUrls: mediaUrls,
                included_in_main: true,
              });
            }
          } catch (parseErr) {
            console.error('Error parsing summary:', parseErr);
          }
        }

        // Sort topics: prioritize those with media, videos first
        const sortedTopics = allTopics.sort((a, b) => {
          const aHasMedia = (a.mediaUrls?.length || 0) > 0;
          const bHasMedia = (b.mediaUrls?.length || 0) > 0;
          
          // Topics with media come first
          if (aHasMedia && !bHasMedia) return -1;
          if (!aHasMedia && bHasMedia) return 1;
          
          // Among topics with media, prioritize those with videos
          if (aHasMedia && bHasMedia) {
            const aHasVideo = a.mediaUrls?.some(m => m.type === 'video') || false;
            const bHasVideo = b.mediaUrls?.some(m => m.type === 'video') || false;
            
            if (aHasVideo && !bHasVideo) return -1;
            if (!aHasVideo && bHasVideo) return 1;
            
            // If both have videos, sort by video count
            const aVideoCount = a.mediaUrls?.filter(m => m.type === 'video').length || 0;
            const bVideoCount = b.mediaUrls?.filter(m => m.type === 'video').length || 0;
            return bVideoCount - aVideoCount;
          }
          
          return 0;
        });

        // Take only the top 3 topics
        setTopics(sortedTopics.slice(0, 3));
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
