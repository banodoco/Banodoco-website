export interface Attachment {
  url: string;
  filename: string;
}

export interface MediaUrl {
  url: string;
  type: 'video' | 'image';
  poster_url?: string;
}

export interface SubTopic {
  text: string;
  subTopicMediaMessageIds?: string[];
  message_id?: string;
  channel_id?: string;
  included_in_main?: boolean;
  subTopicMediaUrls?: MediaUrl[][];
}

export interface TopicData {
  channel_id: string;
  channel_name: string;
  topic_title: string;
  topic_main_text: string;
  topic_sub_topics: SubTopic[];
  media_message_ids: string[];
  media_count: number;
  summary_date: string;
  mediaUrls?: MediaUrl[];
  included_in_main?: boolean;
}

// Raw API response types
export interface RawSubTopic {
  text: string;
  subTopicMediaMessageIds: string[];
  message_id: string;
  channel_id: string;
  included_in_main: boolean;
  subTopicMediaUrls: MediaUrl[][];
}

export interface RawTopic {
  title: string;
  mainText: string;
  mainMediaMessageId: string | null;
  message_id: string;
  channel_id: string;
  subTopics: RawSubTopic[];
  included_in_main: boolean;
  mainMediaUrls: MediaUrl[] | null;
}

