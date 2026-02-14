export interface DiscordAttachment {
  id: string;
  url: string;
  proxy_url?: string;
  filename: string;
  content_type: string | null;
  width?: number | null;
  height?: number | null;
  size?: number;
}

interface DiscordEmbed {
  url?: string;
  title?: string;
  description?: string;
  thumbnail?: { url: string; width?: number; height?: number };
  image?: { url: string; width?: number; height?: number };
  provider?: { name?: string; url?: string };
  type?: string;
}

export interface DiscordMember {
  member_id: string;
  username: string;
  global_name: string | null;
  server_nick: string | null;
  avatar_url: string | null;
}

export interface DiscordMessage {
  message_id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reaction_count: number;
}

export interface EnrichedDiscordMessage extends DiscordMessage {
  author: DiscordMember | null;
}
