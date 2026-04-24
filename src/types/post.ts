export type PostStatus = 'draft' | 'published' | 'archived';

export type PostAdminStatus = 'Listed' | 'Curated' | 'Hidden';

export type MediaSource = 'art' | 'post';

export type PostRenderMode = 'link' | 'markdown' | 'bundle';

export interface PostRow {
  id: string;
  member_id: number;
  title: string;
  body: string | null;
  slug: string | null;
  status: PostStatus;
  cover_media_id: string | null;
  admin_status: PostAdminStatus | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  render_mode: PostRenderMode;
  active_bundle_version_id: string | null;
}

export interface PostBundleRow {
  id: string;
  post_id: string;
  version: number;
  storage_prefix: string;
  manifest: BundleManifestV1;
  size_bytes: number;
  file_count: number;
  sha256: string;
  review_status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  uploaded_by: string;
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface BundleManifestV1 {
  schemaVersion: 1;
  title: string; // 1-120 chars, plain text
  summary?: string; // 0-200 chars, plain text
  entry: string; // relative HTML entrypoint such as "index.html"
  ogImage?: string; // optional relative image path
  source?: 'vibe' | 'manual'; // provenance channel; absent = legacy/untagged
  layout: {
    mode: 'inline-fixed' | 'inline-auto' | 'fullscreen';
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
    allowFullscreenToggle?: boolean;
  };
  capabilities?: {
    scripts?: boolean;
    pointerLock?: boolean;
    popups?: boolean;
  };
  authoredAt?: string; // ISO-8601
}

export interface PostMediaLink {
  post_id: string;
  media_id: string;
  sort_order: number;
  caption: string | null;
}

export interface PostAssetLink {
  post_id: string;
  asset_id: string;
}
