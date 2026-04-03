export interface AssetMedia {
  id: string;
  type: string | null;
  cloudflare_thumbnail_url: string | null;
  cloudflare_playback_hls_url: string | null;
  placeholder_image: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AssetMember {
  member_id: number;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
  stored_avatar_url: string | null;
}

export interface Asset {
  id: string;
  type: string;
  name: string;
  description: string | null;
  admin_status: 'Featured' | 'Curated' | 'Listed';
  lora_type: string | null;
  lora_base_model: string | null;
  model_variant: string | null;
  lora_link: string | null;
  download_link: string | null;
  primary_media_id: string | null;
  created_at: string;
  member_id: number | null;
  media: AssetMedia | AssetMedia[] | null;
  members: AssetMember | AssetMember[] | null;
}

export interface ResourceFilters {
  type: 'all' | 'lora' | 'workflow';
  status: 'featured' | 'all';
  mediaType: 'all' | 'video' | 'image' | 'music';
  baseModel: string | null;
  loraType: string | null;
  search: string;
}
