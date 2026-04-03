import { useEffect, useState, useRef, useCallback } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { TopicData } from '@/components/sections/Community/types';
import { fetchSummariesForDate, parseSummariesToTopics, filterAndSortTopics } from '@/components/sections/Community/fetchTopics';

interface UseCommunityNewsResult {
  availableDates: string[];
  selectedDate: string | null;
  setSelectedDate: (date: string) => void;
  topics: TopicData[];
  loading: boolean;
  loadingDates: boolean;
  error: string | null;
}

export const useCommunityNews = (): UseCommunityNewsResult => {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache: date string -> topics array
  const cacheRef = useRef<Map<string, TopicData[]>>(new Map());

  // Fetch topics for a specific date (with caching)
  const fetchTopicsForDate = useCallback(async (dateStr: string) => {
    const client = supabase;
    if (!client) return;

    // Check cache first
    const cached = cacheRef.current.get(dateStr);
    if (cached) {
      setTopics(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summaries = await fetchSummariesForDate(client, dateStr);
      const parsed = filterAndSortTopics(parseSummariesToTopics(summaries));
      cacheRef.current.set(dateStr, parsed);
      setTopics(parsed);
    } catch (err) {
      console.error('Error fetching topics for date:', err);
      setError('Failed to load community updates');
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: fetch available dates and topics for most recent date in parallel
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoadingDates(false);
      return;
    }

    const init = async () => {
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

        // Fetch distinct dates with content
        const { data: dateRows, error: dateError } = await client
          .from('daily_summaries')
          .select('date')
          .eq('included_in_main_summary', true)
          .eq('dev_mode', false)
          .gte('date', ninetyDaysAgoStr)
          .order('date', { ascending: false });

        if (dateError) throw dateError;

        // Deduplicate dates client-side
        const uniqueDates = [...new Set((dateRows || []).map(r => r.date))];
        setAvailableDates(uniqueDates);

        if (uniqueDates.length > 0) {
          const mostRecent = uniqueDates[0];
          setSelectedDate(mostRecent);

          // Fetch topics for the most recent date
          setLoading(true);
          const summaries = await fetchSummariesForDate(client, mostRecent);
          const parsed = filterAndSortTopics(parseSummariesToTopics(summaries));
          cacheRef.current.set(mostRecent, parsed);
          setTopics(parsed);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing community news:', err);
        setError('Failed to load community updates');
        setLoading(false);
      } finally {
        setLoadingDates(false);
      }
    };

    init();
  }, []);

  // When selectedDate changes (after initial load), fetch topics
  const handleSetSelectedDate = useCallback((date: string) => {
    setSelectedDate(date);
    fetchTopicsForDate(date);
  }, [fetchTopicsForDate]);

  return {
    availableDates,
    selectedDate,
    setSelectedDate: handleSetSelectedDate,
    topics,
    loading,
    loadingDates,
    error,
  };
};
