import { buildEntitySlug } from '@/lib/routing';
import { extractEmbedRefs, type ExtractedEmbedRefs } from '@/lib/postMarkdown';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { PostRenderMode, PostStatus } from '@/types/post';

interface CreateDraftArgs {
  title: string;
  memberId: string;
}

interface SaveDraftPatch {
  title?: string;
  body?: string;
  slug?: string;
  coverMediaId?: string | null;
}

interface SaveDraftOptions {
  currentStatus: PostStatus;
}

interface PublishPostArgs {
  title: string;
}

export interface UploadedPostMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
}

interface MediaLinkRow {
  media_id: string;
}

interface AssetLinkRow {
  asset_id: string;
}

const getClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
};

export const createDraft = async ({ title, memberId }: CreateDraftArgs): Promise<string> => {
  const client = getClient();

  const { data, error } = await client
    .from('posts')
    .insert({
      title,
      body: '',
      status: 'draft',
      member_id: memberId,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create draft');
  }

  return data.id;
};

export const saveDraft = async (
  postId: string,
  patch: SaveDraftPatch,
  opts: SaveDraftOptions,
): Promise<void> => {
  const client = getClient();
  const updatePayload: {
    title?: string;
    body?: string;
    slug?: string | null;
    cover_media_id?: string | null;
  } = {};

  if (patch.title !== undefined) {
    updatePayload.title = patch.title;
  }

  if (patch.body !== undefined) {
    updatePayload.body = patch.body;
  }

  if (patch.slug !== undefined) {
    updatePayload.slug = patch.slug || null;
  }

  if (patch.coverMediaId !== undefined) {
    updatePayload.cover_media_id = patch.coverMediaId;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await client
      .from('posts')
      .update(updatePayload)
      .eq('id', postId);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (opts.currentStatus !== 'published') {
    return;
  }

  let body = patch.body;
  if (body === undefined) {
    const { data, error } = await client
      .from('posts')
      .select('body')
      .eq('id', postId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    body = data?.body ?? '';
  }

  await syncEmbeds(postId, extractEmbedRefs(body));
};

export const publishPost = async (
  postId: string,
  { title }: PublishPostArgs,
): Promise<{ slug: string }> => {
  const client = getClient();
  const computedSlug = buildEntitySlug(title, postId);

  const { data: currentPost, error: currentPostError } = await client
    .from('posts')
    .select('slug')
    .eq('id', postId)
    .single();

  if (currentPostError) {
    throw new Error(currentPostError.message);
  }

  const finalSlug = currentPost?.slug ?? computedSlug;

  const { error } = await client
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      slug: finalSlug,
    })
    .eq('id', postId);

  if (error) {
    throw new Error(error.message);
  }

  return { slug: finalSlug };
};

export const unpublishPost = async (postId: string): Promise<void> => {
  const client = getClient();

  const { error } = await client
    .from('posts')
    .update({ status: 'draft' })
    .eq('id', postId);

  if (error) {
    throw new Error(error.message);
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  const client = getClient();

  const { error } = await client
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    throw new Error(error.message);
  }
};

export const setPostRenderMode = async (
  postId: string,
  mode: PostRenderMode,
): Promise<void> => {
  const client = getClient();
  const { error } = await client
    .from('posts')
    .update({ render_mode: mode })
    .eq('id', postId);

  if (error) {
    throw new Error(error.message);
  }
};

export const syncEmbeds = async (
  postId: string,
  { mediaIds, assetIds }: ExtractedEmbedRefs,
): Promise<void> => {
  const client = getClient();

  const [{ data: existingMediaData, error: existingMediaError }, { data: existingAssetData, error: existingAssetError }] =
    await Promise.all([
      client
        .from('post_media')
        .select('media_id')
        .eq('post_id', postId),
      client
        .from('post_assets')
        .select('asset_id')
        .eq('post_id', postId),
    ]);

  if (existingMediaError) {
    throw new Error(existingMediaError.message);
  }

  if (existingAssetError) {
    throw new Error(existingAssetError.message);
  }

  const existingMediaIds = new Set(
    ((existingMediaData ?? []) as MediaLinkRow[]).map((row) => row.media_id),
  );
  const existingAssetIds = new Set(
    ((existingAssetData ?? []) as AssetLinkRow[]).map((row) => row.asset_id),
  );

  if (mediaIds.length > 0) {
    const { error } = await client
      .from('post_media')
      .upsert(
        mediaIds.map((mediaId, index) => ({
          post_id: postId,
          media_id: mediaId,
          sort_order: index,
          caption: null,
        })),
        { onConflict: 'post_id,media_id' },
      );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (assetIds.length > 0) {
    const { error } = await client
      .from('post_assets')
      .upsert(
        assetIds.map((assetId) => ({
          post_id: postId,
          asset_id: assetId,
        })),
        { onConflict: 'post_id,asset_id' },
      );

    if (error) {
      throw new Error(error.message);
    }
  }

  const removedMediaIds = [...existingMediaIds].filter((id) => !mediaIds.includes(id));
  if (removedMediaIds.length > 0) {
    const { error } = await client
      .from('post_media')
      .delete()
      .eq('post_id', postId)
      .in('media_id', removedMediaIds);

    if (error) {
      throw new Error(error.message);
    }
  }

  const removedAssetIds = [...existingAssetIds].filter((id) => !assetIds.includes(id));
  if (removedAssetIds.length > 0) {
    const { error } = await client
      .from('post_assets')
      .delete()
      .eq('post_id', postId)
      .in('asset_id', removedAssetIds);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (mediaIds.length === 0 && existingMediaIds.size > 0) {
    const { error } = await client
      .from('post_media')
      .delete()
      .eq('post_id', postId);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (assetIds.length === 0 && existingAssetIds.size > 0) {
    const { error } = await client
      .from('post_assets')
      .delete()
      .eq('post_id', postId);

    if (error) {
      throw new Error(error.message);
    }
  }
};

export const uploadPostMedia = async (
  file: File,
  userId: string,
  memberId: string,
): Promise<UploadedPostMedia> => {
  const client = getClient();
  const isVideo = file.type.startsWith('video/');
  const mediaType: UploadedPostMedia['type'] = isVideo ? 'video' : 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${userId}/posts/${fileName}`;

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
      source: 'post',
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
    throw new Error(error?.message ?? 'Failed to save uploaded post media');
  }

  return {
    id: data.id,
    type: mediaType,
    url: fileUrl,
  };
};
