export type AgentNodeInstallRef =
  | { commit_sha: string; tag?: never; branch?: never; source_ref?: never }
  | { commit_sha?: never; tag: string; branch?: never; source_ref?: never }
  | { commit_sha?: never; tag?: never; branch: string; source_ref?: never }
  | { commit_sha?: never; tag?: never; branch?: never; source_ref: string };

export interface AgentNodeInstallTarget {
  id: string;
  label: string | null;
  source_type: 'git' | 'manifest_url' | 'archive_url';
  repo_url: string | null;
  manifest_url: string | null;
  archive_url: string | null;
  manifest_path: string | null;
  expected_node_id: string;
  install_subdir: string | null;
  ref: AgentNodeInstallRef;
}

export interface AgentNodeMediaItem {
  id: string;
  type: 'image' | 'video';
  bucket: string;
  path: string;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string | null;
  caption: string | null;
}

export interface AgentNodeCatalogItem {
  id: string;
  slug: string;
  name: string;
  node_type?: 'agent' | 'orchestrator';
  short_description: string | null;
  description: string | null;
  repo_url: string;
  expected_manifest_id: string;
  creator: {
    discord_id: string | null;
    display_name: string | null;
  };
  catalog: {
    featured: boolean;
    default: boolean;
    mandatory: boolean;
    rank: number;
    label: string | null;
    summary: string | null;
  };
  install_targets: AgentNodeInstallTarget[];
  media: AgentNodeMediaItem[];
  created_at: string;
  updated_at: string;
}

export interface AgentNodeCatalogResponse {
  nodes: AgentNodeCatalogItem[];
  default_node_ids: string[];
  mandatory_node_ids: string[];
}
