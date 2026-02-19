import type { SupabaseClient } from '@supabase/supabase-js';
import type { TopicData, MediaUrl, RawTopic } from './types';

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

  if (media.type === 'video') {
    return VIDEO_EXTENSIONS.test(url);
  }
  if (media.type === 'image') {
    return IMAGE_EXTENSIONS.test(url);
  }

  return IMAGE_EXTENSIONS.test(url) || VIDEO_EXTENSIONS.test(url);
};

// Extract all media URLs from a topic (mainMediaUrls + subTopicMediaUrls)
// Filters to only images/videos and sorts results with videos first
const extractMediaUrls = (rawTopic: RawTopic): MediaUrl[] => {
  const urls: MediaUrl[] = [];

  if (rawTopic.mainMediaUrls && rawTopic.mainMediaUrls.length > 0) {
    urls.push(...rawTopic.mainMediaUrls);
  }

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

  return urls
    .filter(isValidMediaUrl)
    .sort((a, b) => {
      if (a.type === 'video' && b.type !== 'video') return -1;
      if (a.type !== 'video' && b.type === 'video') return 1;
      return 0;
    });
};

// Helper to fetch summaries for a specific date
export const fetchSummariesForDate = async (
  client: SupabaseClient,
  dateStr: string
): Promise<SummaryRow[]> => {
  const { data, error } = await client
    .from('daily_summaries')
    .select('full_summary, date, channel_id, discord_channels(channel_name)')
    .eq('included_in_main_summary', true)
    .eq('dev_mode', false)
    .eq('date', dateStr);

  if (error) throw error;
  return (data as SummaryRow[]) || [];
};

// Helper to parse summaries into TopicData array
export const parseSummariesToTopics = (summaries: SummaryRow[]): TopicData[] => {
  const allTopics: TopicData[] = [];

  for (const summary of summaries) {
    try {
      const rawTopics: RawTopic[] = JSON.parse(summary.full_summary);

      const includedTopics = rawTopics
        .filter((t: RawTopic) => t.included_in_main === true);

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

  return allTopics;
};

// Helper to filter and sort topics
export const filterAndSortTopics = (topics: TopicData[]): TopicData[] => {
  const filteredTopics = topics.filter(topic => {
    const hasSubTopics = topic.topic_sub_topics && topic.topic_sub_topics.length > 0;
    const hasMedia = topic.mediaUrls && topic.mediaUrls.length > 0;
    return hasSubTopics || hasMedia;
  });

  return filteredTopics.sort((a, b) => {
    const aHasMedia = (a.mediaUrls?.length || 0) > 0;
    const bHasMedia = (b.mediaUrls?.length || 0) > 0;

    if (aHasMedia && !bHasMedia) return -1;
    if (!aHasMedia && bHasMedia) return 1;

    if (aHasMedia && bHasMedia) {
      const aHasVideo = a.mediaUrls?.some(m => m.type === 'video') || false;
      const bHasVideo = b.mediaUrls?.some(m => m.type === 'video') || false;

      if (aHasVideo && !bHasVideo) return -1;
      if (!aHasVideo && bHasVideo) return 1;

      const aVideoCount = a.mediaUrls?.filter(m => m.type === 'video').length || 0;
      const bVideoCount = b.mediaUrls?.filter(m => m.type === 'video').length || 0;
      return bVideoCount - aVideoCount;
    }

    return 0;
  });
};
