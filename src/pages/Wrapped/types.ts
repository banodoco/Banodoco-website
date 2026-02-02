
export interface Milestone {
  count: number;
  date: string;
  daysFromStart: number;
  label?: string;
}

export interface CumulativeDataPoint {
  date: string;
  cumulative: number;
}

export interface Contributor {
  rank: number;
  username: string;
  messages: number;
  avatar: string;
  avatarUrl?: string;
}

export interface Award {
  username: string;
  count?: number;
  metric?: string;
  avgTime?: string;
  timezone?: string;
}

export interface ModelTrend {
  month: string;
  sd: number;
  animatediff: number;
  flux: number;
  wan: number;
  cogvideo: number;
  hunyuan: number;
  ltx: number;
}

export interface HeatmapData {
  hour: number;
  data: number[];
}

export interface ChannelStat {
  name: string;
  messages: number;
  percentage: number;
}

export interface MillionthMessage {
  author: string;
  channel: string;
  content: string;
  timestamp: string;
  avatarUrl?: string;
}

export interface ThankedPerson {
  rank: number;
  username: string;
  thanks: number;
  avatarUrl?: string;
}

export interface TopGeneration {
  month: string;
  message_id: string;
  author: string;
  avatarUrl: string;
  channel: string;
  created_at: string;
  reaction_count: number;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  content: string;
}

export interface SpriteCoords {
  x: number;
  y: number;
}

export interface GridItemData {
  id: number;
  coords: SpriteCoords;
}

export interface CommunityUpdate {
  id: string;
  tag: string;
  tagColor: 'rose' | 'purple' | 'amber';
  title: string;
  description: string;
  bullets: string[];
  mediaType: 'video' | 'image';
  mediaUrl: string;
  posterUrl?: string;
  thumbnails?: string[];
}

export interface AppData {
  totalMessages: number;
  totalMembers: number;
  totalChannels: number;
  dateRange: { start: string; end: string };
  milestones: Milestone[];
  cumulativeMessages: CumulativeDataPoint[];
  topContributors: Contributor[];
  awards: {
    mostHelpful: Award;
    mostThankful: Award;
    nightOwl: Award;
    earlyBird: Award;
    allNighter: Award;
  };
  mostThanked: ThankedPerson[];
  modelTrends: ModelTrend[];
  activityHeatmap: HeatmapData[];
  channelStats: ChannelStat[];
  funStats: {
    longestMessage: { chars: number; username: string };
    mostRepliedThread: { replies: number; topic: string };
    busiestDay: { date: string; messages: number; reason: string };
    mostUsedEmoji: { emoji: string; count: number };
    mostUsedWord: { word: string; count: number };
  };
  millionthMessage: MillionthMessage;
  topGenerations: TopGeneration[];
}
