import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const shouldRunIntegration = process.env.RUN_RLS_ASSET_TESTS === '1'
  && Boolean(process.env.RLS_TEST_SUPABASE_URL)
  && Boolean(process.env.RLS_TEST_SUPABASE_ANON_KEY)
  && Boolean(process.env.RLS_TEST_SUPABASE_SERVICE_ROLE_KEY);

const describeRls = shouldRunIntegration ? describe : describe.skip;

type TestClient = SupabaseClient;

interface Actor {
  userId: string;
  memberId: number;
  email: string;
  password: string;
  client: TestClient;
}

function randomEmail(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

function createAnonClient(): TestClient {
  return createClient(
    process.env.RLS_TEST_SUPABASE_URL!,
    process.env.RLS_TEST_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

describeRls('asset RLS integration', () => {
  const service = (() => {
    if (!shouldRunIntegration) {
      return null as unknown as TestClient;
    }

    return createClient(
      process.env.RLS_TEST_SUPABASE_URL!,
      process.env.RLS_TEST_SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  })();

  const createdUserIds: string[] = [];
  const createdModelIds: string[] = [];
  const createdMediaIds: string[] = [];
  const createdAssetIds: string[] = [];

  let author!: Actor;
  let admin!: Actor;
  let other!: Actor;
  let draftAssetId = '';
  let authorMediaId = '';
  let authorModelId = '';
  let otherModelId = '';

  async function createActor(prefix: string, memberId: number, isAdmin: boolean): Promise<Actor> {
    const email = randomEmail(prefix);
    const password = `Password!${crypto.randomUUID()}`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw error ?? new Error('Failed to create auth user');
    }

    createdUserIds.push(data.user.id);

    const { error: memberError } = await service
      .from('members')
      .insert({
        member_id: memberId,
        auth_user_id: data.user.id,
        username: `${prefix}-${memberId}`,
        global_name: `${prefix} ${memberId}`,
      });

    if (memberError) {
      throw memberError;
    }

    if (isAdmin) {
      const { error: adminError } = await service
        .from('admins')
        .insert({ user_id: data.user.id });

      if (adminError) {
        throw adminError;
      }
    }

    const client = createAnonClient();
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw signInError;
    }

    return {
      userId: data.user.id,
      memberId,
      email,
      password,
      client,
    };
  }

  beforeAll(async () => {
    author = await createActor('asset-rls-author', 9000000000000011, false);
    admin = await createActor('asset-rls-admin', 9000000000000012, true);
    other = await createActor('asset-rls-other', 9000000000000013, false);

    authorMediaId = crypto.randomUUID();
    const secondaryMediaId = crypto.randomUUID();
    authorModelId = crypto.randomUUID();
    otherModelId = crypto.randomUUID();
    draftAssetId = crypto.randomUUID();

    createdMediaIds.push(authorMediaId, secondaryMediaId);
    createdModelIds.push(authorModelId, otherModelId);
    createdAssetIds.push(draftAssetId);

    const { error: modelError } = await service
      .from('models')
      .insert([
        { id: authorModelId, display_name: 'Asset RLS Model', default_variant: 'default' },
        { id: otherModelId, display_name: 'Other Asset RLS Model', default_variant: 'default' },
      ]);

    if (modelError) throw modelError;

    const { error: mediaError } = await service
      .from('media')
      .insert([
        {
          id: authorMediaId,
          type: 'image',
          member_id: author.memberId,
          source: 'resource',
          admin_status: 'Listed',
          user_status: 'Listed',
          url: 'https://example.com/asset-rls-media.png',
          cloudflare_thumbnail_url: 'https://example.com/asset-rls-media.png',
        },
        {
          id: secondaryMediaId,
          type: 'image',
          member_id: author.memberId,
          source: 'resource',
          admin_status: 'Listed',
          user_status: 'Listed',
          url: 'https://example.com/asset-rls-media-2.png',
          cloudflare_thumbnail_url: 'https://example.com/asset-rls-media-2.png',
        },
      ]);

    if (mediaError) throw mediaError;

    const { error: assetError } = await service
      .from('assets')
      .insert({
        id: draftAssetId,
        member_id: author.memberId,
        name: 'Asset RLS Draft',
        type: 'lora',
        admin_status: 'Listed',
        creator: 'Asset RLS Author',
        status: 'draft',
        primary_media_id: authorMediaId,
        links: [],
      });

    if (assetError) throw assetError;
  });

  afterAll(async () => {
    if (createdAssetIds.length > 0) {
      await service.from('asset_models').delete().in('asset_id', createdAssetIds);
      await service.from('asset_media').delete().in('asset_id', createdAssetIds);
      await service.from('asset_comments').delete().in('asset_id', createdAssetIds);
      await service.from('assets').delete().in('id', createdAssetIds);
    }

    if (createdMediaIds.length > 0) {
      await service.from('media').delete().in('id', createdMediaIds);
    }

    if (createdModelIds.length > 0) {
      await service.from('models').delete().in('id', createdModelIds);
    }

    await service.from('members').delete().in('auth_user_id', createdUserIds);
    await Promise.all(createdUserIds.map((userId) => service.auth.admin.deleteUser(userId)));
  });

  it('allows author/admin asset_media writes and blocks non-owners', async () => {
    const authorInsert = await author.client
      .from('asset_media')
      .insert({ asset_id: draftAssetId, media_id: authorMediaId, sort_order: 0 });
    expect(authorInsert.error).toBeNull();

    const authorUpdate = await author.client
      .from('asset_media')
      .update({ sort_order: 1 })
      .eq('asset_id', draftAssetId)
      .eq('media_id', authorMediaId);
    expect(authorUpdate.error).toBeNull();

    const otherInsert = await other.client
      .from('asset_media')
      .insert({ asset_id: draftAssetId, media_id: authorMediaId, sort_order: 2 });
    expect(otherInsert.error).not.toBeNull();

    const adminUpdate = await admin.client
      .from('asset_media')
      .update({ sort_order: 3 })
      .eq('asset_id', draftAssetId)
      .eq('media_id', authorMediaId);
    expect(adminUpdate.error).toBeNull();

    const otherDelete = await other.client
      .from('asset_media')
      .delete()
      .eq('asset_id', draftAssetId)
      .eq('media_id', authorMediaId);
    expect(otherDelete.error).not.toBeNull();

    const adminDelete = await admin.client
      .from('asset_media')
      .delete()
      .eq('asset_id', draftAssetId)
      .eq('media_id', authorMediaId);
    expect(adminDelete.error).toBeNull();
  });

  it('allows author/admin asset_models writes and blocks non-owners', async () => {
    const authorInsert = await author.client
      .from('asset_models')
      .insert({ asset_id: draftAssetId, model_id: authorModelId, compatibility_note: 'author insert' });
    expect(authorInsert.error).toBeNull();

    const authorUpdate = await author.client
      .from('asset_models')
      .update({ compatibility_note: 'author update' })
      .eq('asset_id', draftAssetId)
      .eq('model_id', authorModelId);
    expect(authorUpdate.error).toBeNull();

    const otherInsert = await other.client
      .from('asset_models')
      .insert({ asset_id: draftAssetId, model_id: otherModelId, compatibility_note: 'forbidden insert' });
    expect(otherInsert.error).not.toBeNull();

    const adminUpdate = await admin.client
      .from('asset_models')
      .update({ compatibility_note: 'admin update' })
      .eq('asset_id', draftAssetId)
      .eq('model_id', authorModelId);
    expect(adminUpdate.error).toBeNull();

    const otherDelete = await other.client
      .from('asset_models')
      .delete()
      .eq('asset_id', draftAssetId)
      .eq('model_id', authorModelId);
    expect(otherDelete.error).not.toBeNull();

    const adminDelete = await admin.client
      .from('asset_models')
      .delete()
      .eq('asset_id', draftAssetId)
      .eq('model_id', authorModelId);
    expect(adminDelete.error).toBeNull();
  });

  it('limits draft asset reads to the author and admins', async () => {
    const authorRead = await author.client
      .from('assets')
      .select('id')
      .eq('id', draftAssetId)
      .single();
    expect(authorRead.error).toBeNull();
    expect(authorRead.data?.id).toBe(draftAssetId);

    const adminRead = await admin.client
      .from('assets')
      .select('id')
      .eq('id', draftAssetId)
      .single();
    expect(adminRead.error).toBeNull();
    expect(adminRead.data?.id).toBe(draftAssetId);

    const otherRead = await other.client
      .from('assets')
      .select('id')
      .eq('id', draftAssetId)
      .maybeSingle();
    expect(otherRead.error).toBeNull();
    expect(otherRead.data).toBeNull();

    const anonRead = await createAnonClient()
      .from('assets')
      .select('id')
      .eq('id', draftAssetId)
      .maybeSingle();
    expect(anonRead.error).toBeNull();
    expect(anonRead.data).toBeNull();
  });
});
