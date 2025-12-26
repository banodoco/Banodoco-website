export interface Attachment {
  url: string;
  filename: string;
}

export interface SubTopic {
  text: string;
  subTopicMediaMessageIds?: string[];
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
  mediaUrls?: string[];
}

