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


// Minimum number of topics we want to display
const MIN_TOPICS_DESIRED = 3;

// Helper to get date string in YYYY-MM-DD format
const getDateString = (daysAgo: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Helper to fetch summaries for a specific date
const fetchSummariesForDate = async (
  client: NonNullable<typeof supabase>,
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

const tryParseRawTopics = (summary: string): RawTopic[] | null => {
  try {
    return JSON.parse(summary) as RawTopic[];
  } catch {
    return null;
  }
};

// Helper to parse summaries into TopicData array
const parseSummariesToTopics = (summaries: SummaryRow[]): TopicData[] => {
  const allTopics: TopicData[] = [];

  for (const summary of summaries) {
    const rawTopics = tryParseRawTopics(summary.full_summary);
    if (!rawTopics) {
      continue;
    }

    // Filter for topics with included_in_main: true
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
  }

  return allTopics;
};

// Helper to filter and sort topics
const filterAndSortTopics = (topics: TopicData[]): TopicData[] => {
  // Filter out topics with no bullet points AND no media (too sparse to display)
  const filteredTopics = topics.filter(topic => {
    const hasSubTopics = topic.topic_sub_topics && topic.topic_sub_topics.length > 0;
    const hasMedia = topic.mediaUrls && topic.mediaUrls.length > 0;
    return hasSubTopics || hasMedia;
  });

  // Sort topics: prioritize those with media, videos first
  return filteredTopics.sort((a, b) => {
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
        const todayStr = getDateString(0);
        const yesterdayStr = getDateString(1);

        // First, fetch today's summaries
        const todaySummaries = await fetchSummariesForDate(client, todayStr);
        const todayTopics = filterAndSortTopics(parseSummariesToTopics(todaySummaries));

        // If we have enough topics from today, use them
        if (todayTopics.length >= MIN_TOPICS_DESIRED) {
          setTopics(todayTopics.slice(0, MIN_TOPICS_DESIRED));
          return;
        }

        // Otherwise, also fetch yesterday's summaries to fill remaining slots
        const yesterdaySummaries = await fetchSummariesForDate(client, yesterdayStr);
        const yesterdayTopics = filterAndSortTopics(parseSummariesToTopics(yesterdaySummaries));

        // Combine: today's topics first, then yesterday's to fill remaining slots
        const combinedTopics = [...todayTopics, ...yesterdayTopics];
        setTopics(combinedTopics.slice(0, MIN_TOPICS_DESIRED));
      } catch {
        setError('Failed to load community updates');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { topics, loading, error };
};
