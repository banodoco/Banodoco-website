import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/routing';

export interface AgentNodeSubmissionInput {
  ownerUserId: string;
  name: string;
  nodeType: 'agent' | 'orchestrator';
  shortDescription: string;
  description: string;
  repoUrl: string;
  expectedManifestId: string;
  creatorDiscordId: string;
  creatorDisplayName: string;
  manifestPath: string;
  refKind: 'branch' | 'tag' | 'commit_sha' | 'source_ref';
  refValue: string;
}

export async function createAgentNodeSubmission(input: AgentNodeSubmissionInput): Promise<{ id: string; slug: string }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
  const { data: node, error: nodeError } = await supabase
    .from('agent_nodes')
    .insert({
      owner_user_id: input.ownerUserId,
      slug,
      name: input.name,
      node_type: input.nodeType,
      short_description: input.shortDescription || null,
      description: input.description || null,
      repo_url: input.repoUrl,
      expected_manifest_id: input.expectedManifestId,
      creator_discord_id: input.creatorDiscordId || null,
      creator_display_name: input.creatorDisplayName || null,
      is_public: true,
    })
    .select('id, slug')
    .single();

  if (nodeError || !node) {
    throw new Error(nodeError?.message || 'Failed to create art agent submission.');
  }

  const { error: catalogError } = await supabase
    .from('agent_node_catalog_metadata')
    .insert({
      agent_node_id: node.id,
      review_status: 'pending',
      is_catalog_enabled: false,
    });

  if (catalogError) {
    throw new Error(catalogError.message);
  }

  const refColumns = {
    branch: null as string | null,
    tag: null as string | null,
    commit_sha: null as string | null,
    source_ref: null as string | null,
    [input.refKind]: input.refValue,
  };

  const { error: targetError } = await supabase
    .from('agent_node_install_targets')
    .insert({
      agent_node_id: node.id,
      source_type: 'git',
      repo_url: input.repoUrl,
      manifest_path: input.manifestPath,
      expected_node_id: input.expectedManifestId,
      is_enabled: false,
      ...refColumns,
    });

  if (targetError) {
    throw new Error(targetError.message);
  }

  return node;
}
