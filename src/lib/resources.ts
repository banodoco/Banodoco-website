import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface UploadedResourceMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
}

export interface UploadedResourceFile {
  fileName: string;
  url: string;
  storagePath: string;
}

export interface ResourceLinkInput {
  label: string;
  url: string;
  description?: string | null;
  source?: 'link' | 'upload';
  fileName?: string | null;
}

export interface AssetMediaInput {
  mediaId: string;
  sortOrder: number;
}

export interface AssetModelInput {
  modelId: string;
  compatibilityNote: string | null;
}

export interface SaveResourceInput {
  id?: string;
  memberId?: string | number | null;
  name: string;
  description: string;
  type: string;
  links: ResourceLinkInput[];
  primaryMediaId?: string | null;
  status: 'draft' | 'published';
  selfAttributed: boolean;
  galleryItems: AssetMediaInput[];
  modelItems: AssetModelInput[];
}

interface AssetMediaRow {
  media_id: string;
  sort_order: number;
}

interface AssetModelRow {
  model_id: string;
  compatibility_note: string | null;
}

const getClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
};

export const uploadResourceMedia = async (
  file: File,
  userId: string,
  memberId: string,
): Promise<UploadedResourceMedia> => {
  const client = getClient();
  const isVideo = file.type.startsWith('video/');
  const mediaType: UploadedResourceMedia['type'] = isVideo ? 'video' : 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${userId}/resources/${fileName}`;

  const { error: uploadError } = await client.storage
    .from('user-uploads')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
  }

  const { data: publicUrlData } = client.storage
    .from('user-uploads')
    .getPublicUrl(storagePath);

  const fileUrl = publicUrlData.publicUrl;

  const { data, error } = await client
    .from('media')
    .insert({
      type: mediaType,
      member_id: memberId,
      source: 'resource',
      admin_status: 'Listed',
      user_status: 'Listed',
      url: fileUrl,
      cloudflare_thumbnail_url: fileUrl,
      metadata: {
        bucket: 'user-uploads',
        path: storagePath,
      },
    })
    .select('id, type')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save uploaded resource media');
  }

  if (mediaType === 'video') {
    try {
      const { error: ingestError } = await client.functions.invoke('cloudflare-stream-ingest', {
        body: { media_id: data.id },
      });
      if (ingestError) {
        console.warn('[resource-upload] Cloudflare Stream ingest failed', ingestError);
      }
    } catch (invokeError) {
      console.warn('[resource-upload] Cloudflare Stream ingest failed', invokeError);
    }
  }

  return {
    id: data.id,
    type: mediaType,
    url: fileUrl,
  };
};

export const uploadResourceFile = async (
  file: File,
  userId: string,
): Promise<UploadedResourceFile> => {
  const client = getClient();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${userId}/resource-files/${fileName}`;

  const { error: uploadError } = await client.storage
    .from('user-uploads')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
  }

  const { data: publicUrlData } = client.storage
    .from('user-uploads')
    .getPublicUrl(storagePath);

  return {
    fileName: file.name,
    url: publicUrlData.publicUrl,
    storagePath,
  };
};

export const upsertAssetMedia = async (
  assetId: string,
  items: AssetMediaInput[],
): Promise<void> => {
  const client = getClient();
  const normalizedItems = items.map((item) => ({
    mediaId: item.mediaId,
    sortOrder: item.sortOrder,
  }));

  const { data, error } = await client
    .from('asset_media')
    .select('media_id, sort_order')
    .eq('asset_id', assetId)
    .eq('is_deleted', false);

  if (error) {
    throw new Error(`Failed to load asset media: ${error.message}`);
  }

  const existingRows = (data ?? []) as AssetMediaRow[];
  const existingByMediaId = new Map(existingRows.map((row) => [row.media_id, row]));
  const incomingIds = new Set(normalizedItems.map((item) => item.mediaId));

  const inserts = normalizedItems.filter((item) => !existingByMediaId.has(item.mediaId));
  const updates = normalizedItems.filter((item) => existingByMediaId.get(item.mediaId)?.sort_order !== item.sortOrder);
  const deletes = existingRows.filter((row) => !incomingIds.has(row.media_id)).map((row) => row.media_id);

  if (inserts.length > 0) {
    const { error: insertError } = await client.from('asset_media').insert(
      inserts.map((item) => ({
        asset_id: assetId,
        media_id: item.mediaId,
        sort_order: item.sortOrder,
      })),
    );

    if (insertError) {
      throw new Error(`Failed to insert asset media: ${insertError.message}`);
    }
  }

  await Promise.all(
    updates
      .filter((item) => existingByMediaId.has(item.mediaId))
      .map(async (item) => {
        const { error: updateError } = await client
          .from('asset_media')
          .update({ sort_order: item.sortOrder })
          .eq('asset_id', assetId)
          .eq('media_id', item.mediaId);

        if (updateError) {
          throw new Error(`Failed to update asset media: ${updateError.message}`);
        }
      }),
  );

  if (deletes.length > 0) {
    const { error: deleteError } = await client
      .from('asset_media')
      .delete()
      .eq('asset_id', assetId)
      .in('media_id', deletes);

    if (deleteError) {
      throw new Error(`Failed to delete asset media: ${deleteError.message}`);
    }
  }
};

export const upsertAssetModels = async (
  assetId: string,
  items: AssetModelInput[],
): Promise<void> => {
  const client = getClient();
  const normalizedItems = items.map((item) => ({
    modelId: item.modelId,
    compatibilityNote: item.compatibilityNote ?? null,
  }));

  const { data, error } = await client
    .from('asset_models')
    .select('model_id, compatibility_note')
    .eq('asset_id', assetId);

  if (error) {
    throw new Error(`Failed to load asset models: ${error.message}`);
  }

  const existingRows = (data ?? []) as AssetModelRow[];
  const existingByModelId = new Map(existingRows.map((row) => [row.model_id, row]));
  const incomingIds = new Set(normalizedItems.map((item) => item.modelId));

  const inserts = normalizedItems.filter((item) => !existingByModelId.has(item.modelId));
  const updates = normalizedItems.filter(
    (item) => existingByModelId.get(item.modelId)?.compatibility_note !== item.compatibilityNote,
  );
  const deletes = existingRows.filter((row) => !incomingIds.has(row.model_id)).map((row) => row.model_id);

  if (inserts.length > 0) {
    const { error: insertError } = await client.from('asset_models').insert(
      inserts.map((item) => ({
        asset_id: assetId,
        model_id: item.modelId,
        compatibility_note: item.compatibilityNote,
      })),
    );

    if (insertError) {
      throw new Error(`Failed to insert asset models: ${insertError.message}`);
    }
  }

  await Promise.all(
    updates
      .filter((item) => existingByModelId.has(item.modelId))
      .map(async (item) => {
        const { error: updateError } = await client
          .from('asset_models')
          .update({ compatibility_note: item.compatibilityNote })
          .eq('asset_id', assetId)
          .eq('model_id', item.modelId);

        if (updateError) {
          throw new Error(`Failed to update asset model: ${updateError.message}`);
        }
      }),
  );

  if (deletes.length > 0) {
    const { error: deleteError } = await client
      .from('asset_models')
      .delete()
      .eq('asset_id', assetId)
      .in('model_id', deletes);

    if (deleteError) {
      throw new Error(`Failed to delete asset models: ${deleteError.message}`);
    }
  }
};

export const saveResource = async (
  input: SaveResourceInput,
): Promise<{ id: string; slug: string | null }> => {
  const client = getClient();
  const normalizedLinks = input.links
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
      ...(link.description?.trim() ? { description: link.description.trim() } : {}),
      ...(link.source === 'upload' ? { source: link.source } : {}),
      ...(link.fileName?.trim() ? { fileName: link.fileName.trim() } : {}),
    }))
    .filter((link) => link.label || link.url);

  const basePayload = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    type: input.type,
    links: normalizedLinks,
    primary_media_id: input.primaryMediaId ?? null,
    status: input.status,
    self_attributed: input.selfAttributed,
  };

  const legacyLoraLink = input.type === 'lora' && normalizedLinks[0]?.url ? normalizedLinks[0].url : undefined;

  let assetId = input.id;
  let slug: string | null = null;

  if (assetId) {
    const updatePayload = legacyLoraLink ? { ...basePayload, lora_link: legacyLoraLink } : basePayload;
    const { data, error } = await client
      .from('assets')
      .update(updatePayload)
      .eq('id', assetId)
      .select('id, slug')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update resource');
    }

    slug = data.slug;
  } else {
    if (input.memberId === null || input.memberId === undefined || input.memberId === '') {
      throw new Error('memberId is required when creating a resource');
    }

    const insertPayload = {
      ...basePayload,
      member_id: Number(input.memberId),
      admin_status: 'Listed',
      ...(legacyLoraLink ? { lora_link: legacyLoraLink } : {}),
    };

    const { data, error } = await client
      .from('assets')
      .insert(insertPayload)
      .select('id, slug')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create resource');
    }

    assetId = data.id;
    slug = data.slug;
  }

  const resolvedAssetId = assetId;
  if (!resolvedAssetId) {
    throw new Error('Failed to resolve resource id');
  }

  await upsertAssetMedia(resolvedAssetId, input.galleryItems);
  await upsertAssetModels(resolvedAssetId, input.modelItems);

  return { id: resolvedAssetId, slug };
};
