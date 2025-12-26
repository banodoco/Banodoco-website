import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface DailySummary {
  daily_summary_id: number;
  date: string;
  channel_id: string;
  full_summary: string;
  short_summary: string;
  created_at: string;
}

export interface SummaryTopic {
  title: string;
  mainText: string;
  mainMediaMessageId: string | null;
  message_id: string;
  channel_id: string;
  subTopics: {
    text: string;
    subTopicMediaMessageIds: string[];
    message_id: string;
    channel_id: string;
  }[];
}

