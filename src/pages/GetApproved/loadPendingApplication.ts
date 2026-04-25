import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { PendingApprovalRow } from '@/hooks/usePendingApproval';

export type CreationType = 'art' | 'resource';
export type ArtworkEditStatus = 'unchanged' | 'edited' | 'new' | 'removed';

export interface ArtworkDraft {
  id: string;
  creationType: CreationType;
  file: File | null;
  existingMediaId?: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  isPrimary?: boolean;
  editStatus?: ArtworkEditStatus;
  thumbnailUrl: string | null;
  title: string;
  description: string;
  selfAttributed: boolean;
  savedResourceId: string | null;
  savedResourceName: string | null;
  resourceDirty: boolean;
}

interface HiddenMediaRow {
  id: string;
  type: string | null;
  title: string | null;
  description: string | null;
  cloudflare_thumbnail_url: string | null;
  url: string | null;
  self_attributed: boolean | null;
  metadata: unknown;
}

interface AssetRow {
  id: string;
  name: string | null;
}

const getStorageInfo = (metadata: unknown): { bucket: string | null; path: string | null } => {
  if (!metadata || typeof metadata !== 'object') return { bucket: null, path: null };
  const record = metadata as { bucket?: unknown; path?: unknown };
  return {
    bucket: typeof record.bucket === 'string' ? record.bucket : null,
    path: typeof record.path === 'string' ? record.path : null,
  };
};

export const newApprovalDraft = (): ArtworkDraft => ({
  id: crypto.randomUUID(),
  creationType: 'art',
  file: null,
  thumbnailUrl: null,
  title: '',
  description: '',
  selfAttributed: false,
  savedResourceId: null,
  savedResourceName: null,
  resourceDirty: false,
  isPrimary: true,
  editStatus: 'new',
});

export interface LoadedPendingApplication {
  bio: string;
  drafts: ArtworkDraft[];
}

export async function loadPendingApplication(
  approvalRequest: PendingApprovalRow,
  memberId: string,
): Promise<LoadedPendingApplication> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Approval service is not configured.');
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from('media')
    .select('id, type, title, description, cloudflare_thumbnail_url, url, self_attributed, metadata')
    .eq('member_id', memberId)
    .eq('admin_status', 'Hidden')
    .eq('source', 'art')
    .order('created_at', { ascending: true });

  if (mediaError) throw new Error(mediaError.message);

  const drafts: ArtworkDraft[] = ((mediaRows ?? []) as HiddenMediaRow[]).map((row) => {
    const storage = getStorageInfo(row.metadata);
    return {
      id: row.id,
      creationType: 'art',
      file: null,
      existingMediaId: row.id,
      storageBucket: storage.bucket,
      storagePath: storage.path,
      isPrimary: row.id === approvalRequest.attached_media_id,
      editStatus: 'unchanged',
      thumbnailUrl: row.cloudflare_thumbnail_url ?? row.url ?? null,
      title: row.title ?? '',
      description: row.description ?? '',
      selfAttributed: row.self_attributed ?? false,
      savedResourceId: null,
      savedResourceName: null,
      resourceDirty: false,
    };
  });

  if (approvalRequest.attached_resource_id) {
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, name')
      .eq('id', approvalRequest.attached_resource_id)
      .maybeSingle();

    if (assetError) throw new Error(assetError.message);

    const resource = asset as AssetRow | null;
    drafts.unshift({
      id: approvalRequest.attached_resource_id,
      creationType: 'resource',
      file: null,
      existingMediaId: undefined,
      isPrimary: true,
      editStatus: 'unchanged',
      thumbnailUrl: null,
      title: '',
      description: '',
      selfAttributed: true,
      savedResourceId: approvalRequest.attached_resource_id,
      savedResourceName: resource?.name ?? null,
      resourceDirty: false,
    });
  }

  const normalizedDrafts = drafts.length > 0 ? drafts : [newApprovalDraft()];
  if (!normalizedDrafts.some((draft) => draft.isPrimary)) {
    normalizedDrafts[0] = { ...normalizedDrafts[0], isPrimary: true };
  }

  return {
    bio: approvalRequest.bio_snapshot ?? '',
    drafts: normalizedDrafts,
  };
}
