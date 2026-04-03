import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { TopicData } from './types';
import { fetchSummariesForDate, parseSummariesToTopics, filterAndSortTopics } from './fetchTopics';

interface UseCommunityTopicsResult {
  topics: TopicData[];
  loading: boolean;
  error: string | null;
}

// Minimum number of topics we want to display
const MIN_TOPICS_DESIRED = 3;

// Helper to get date string in YYYY-MM-DD format
const getDateString = (daysAgo: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const useCommunityTopics = (): UseCommunityTopicsResult => {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setTopics([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const todayStr = getDateString(0);
        const yesterdayStr = getDateString(1);

        const todaySummaries = await fetchSummariesForDate(client, todayStr);
        const todayTopics = filterAndSortTopics(parseSummariesToTopics(todaySummaries));

        if (todayTopics.length >= MIN_TOPICS_DESIRED) {
          setTopics(todayTopics.slice(0, MIN_TOPICS_DESIRED));
          return;
        }

        const yesterdaySummaries = await fetchSummariesForDate(client, yesterdayStr);
        const yesterdayTopics = filterAndSortTopics(parseSummariesToTopics(yesterdaySummaries));

        const combinedTopics = [...todayTopics, ...yesterdayTopics];
        setTopics(combinedTopics.slice(0, MIN_TOPICS_DESIRED));
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
