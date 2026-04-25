import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type ArtCreationType = 'art' | 'resource';

export interface CreateArtMediaInput {
  file: File;
  title: string;
  description?: string | null;
  memberId: string | number;
  userId: string;
  hidden?: boolean;
  selfAttributed: boolean;
  creationType?: ArtCreationType;
}

export interface CreatedArtMedia {
  id: string;
  storagePath: string;
  url: string;
  type: 'image' | 'video';
}

const getClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Upload service is not configured.');
  }

  return supabase;
};

export const deleteUserUpload = async (storagePath: string): Promise<void> => {
  const client = getClient();
  const { error } = await client.storage.from('user-uploads').remove([storagePath]);

  if (error) {
    throw new Error(error.message);
  }
};

export const createArtMedia = async ({
  file,
  title,
  description,
  memberId,
  userId,
  hidden = false,
  selfAttributed,
  creationType = 'art',
}: CreateArtMediaInput): Promise<CreatedArtMedia> => {
  const client = getClient();
  const isVideo = file.type.startsWith('video/');
  const mediaType: CreatedArtMedia['type'] = isVideo ? 'video' : 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${userId}/art/${fileName}`;

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

  try {
    // Discord IDs are 18-digit bigints; Number(...) silently rounds anything past
    // 2^53, which corrupts member_id and breaks RLS joins on approval_requests.
    // Pass as string and let PostgREST cast to bigint on the server.
    const memberIdAsString = typeof memberId === 'string' ? memberId : String(memberId);

    const { data, error } = await client
      .from('media')
      .insert({
        type: mediaType,
        title: title.trim(),
        description: description?.trim() || null,
        member_id: memberIdAsString,
        source: 'art',
        admin_status: hidden ? 'Hidden' : 'Listed',
        user_status: hidden ? 'Hidden' : 'Listed',
        self_attributed: selfAttributed,
        url: fileUrl,
        cloudflare_thumbnail_url: fileUrl,
        metadata: {
          bucket: 'user-uploads',
          path: storagePath,
          creation_type: creationType,
        },
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save art media');
    }

    return {
      id: data.id,
      storagePath,
      url: fileUrl,
      type: mediaType,
    };
  } catch (error) {
    try {
      await deleteUserUpload(storagePath);
    } catch {
      // Surface the original database error; storage cleanup is best effort.
    }
    throw error;
  }
};
