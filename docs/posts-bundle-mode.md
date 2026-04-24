# Bundle-Mode Posts Design

## Overview & Integration

Bundle mode is a third authoring option on top of the posts infrastructure that already exists in this branch; it is not a parallel posts system. The shared post type surface stays anchored in `src/types/post.ts`, the single-post fetch stays anchored in `src/hooks/usePost.ts`, the list fetch stays anchored in `src/hooks/usePosts.ts`, and the draft/save/publish lifecycle stays anchored in `src/lib/posts.ts`. The existing authoring route in `src/pages/SubmitPost/index.tsx` already owns `/submit/post`, and `src/App.tsx` already wires `/posts/:slug`, `/:username/posts/:slug`, `/:username/posts`, and `/submit/post`, so bundle mode extends those same surfaces instead of introducing a new hook set, a new submit page, or a second route family. The base posts schema and current RLS live in `../supabase/migrations/20260325070000_create_posts.sql` (the sibling Supabase project path that corresponds to the plan's `supabase/migrations/20260325070000_create_posts.sql` reference), so the bundle migration is an additive extension to that schema, not a replacement.

The canonical public-visibility predicate for this design is `status='published' AND (admin_status IS NULL OR admin_status != 'Hidden')`. Later sections refer back to this exact rule for every public surface. Why: `src/hooks/usePosts.ts` already applies the `admin_status` half of that predicate on the public list branch, but the current SQL policy in `../supabase/migrations/20260325070000_create_posts.sql` still allows any published post row to be read. Bundle mode has to collapse those two views into one canonical rule so a Hidden bundle post cannot leak title, body, or site chrome through `usePost` while the bundle iframe itself returns `404`.

This design extends the already-landed markdown-mode posts stack in the following concrete places:

- `src/types/post.ts`: add bundle-specific fields and types as extensions to the existing post model, because the shared post row shape already exists here.
- `src/hooks/usePost.ts`: extend the existing detail hook with bundle metadata and preview-bundle lookup, because public gating and post-page fetch orchestration already live here.
- `src/hooks/usePosts.ts`: extend the existing list hook with `render_mode`, because the public post listing and its visibility filter already live here.
- `src/lib/posts.ts`: keep `createDraft`, `saveDraft`, and `publishPost` as the existing mode-agnostic lifecycle entry points, because draft creation, autosave, and publish already flow through this file today.
- `src/pages/SubmitPost/index.tsx`: add bundle upload as a third tab in the current `/submit/post` authoring UI, because the markdown authoring flow already owns that route and post bootstrap lifecycle.
- `src/App.tsx`: reuse the existing post routes and add only the extra bundle-specific route variants later in the design, because the app already routes post detail/profile surfaces here.
- `../supabase/migrations/20260325070000_create_posts.sql`: extend the existing posts schema and RLS with bundle-specific tables, columns, and policies, because posts already have a live relational model and bundle mode must fit inside it.

The implementation is constrained by the current application architecture:

- Static SPA shell: the frontend is a Vite/React SPA, so bundle rendering, preview handling, and SEO mapping must work inside a client-rendered post page rather than relying on server templates. Why: that keeps bundle mode aligned with the rest of the site and avoids inventing a server-rendered posts stack just for bundles.
- Edge Functions for per-request logic: upload validation, preview-token issuance, and bundle serving go through Supabase Edge Functions that validate the bearer token with `supabase.auth.getUser(accessToken)` before doing service-role work, following the existing `../supabase/functions/cloudflare-stream-ingest/index.ts` pattern. Why: the browser cannot safely enforce ownership, review state, or preview-token rules for private bundle bytes.
- Private Storage: bundle files live in a private Supabase Storage bucket rather than public object URLs. Why: pending, rejected, preview-only, or Hidden bundles must not be readable outside the bundle-serving gate.
- `SECURITY DEFINER` for cross-table atomicity: bundle registration and review transitions run through SQL RPCs that can update `post_bundles` and `posts` in one transaction. Why: the bundle version record, the active bundle pointer, and the post render-mode flip are one consistency boundary, not three unrelated writes.

This document assumes the parallel markdown-mode migration lands first and adds `posts.admin_status`, `posts.cover_media_id`, and `posts.published_at` before bundle mode ships. Why: `src/hooks/usePost.ts` and `src/hooks/usePosts.ts` already read those fields, but the checked-in base migration at `../supabase/migrations/20260325070000_create_posts.sql` does not create them. The bundle migration should therefore sequence after that earlier schema uplift instead of duplicating ownership of the same columns; if the markdown migration has not landed yet, bundle work is blocked on that dependency rather than silently re-defining the columns in parallel.

## Schema

The bundle migration creates `post_bundles` before it alters `posts`. Why: `posts.active_bundle_version_id` needs a real foreign-key target at migration time, and creating the version table first keeps the migration linear instead of relying on deferred backfills or a later `ALTER TABLE ... ADD CONSTRAINT`.

The core DDL is:

```sql
CREATE TABLE public.post_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    storage_prefix TEXT NOT NULL,
    manifest JSONB NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    file_count INTEGER NOT NULL CHECK (file_count > 0),
    sha256 TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    UNIQUE (post_id, version),
    UNIQUE (post_id, sha256)
);

CREATE INDEX post_bundles_post_review_idx
    ON public.post_bundles (post_id, review_status, uploaded_at DESC);

ALTER TABLE public.posts
    ADD COLUMN render_mode TEXT NOT NULL DEFAULT 'link'
        CHECK (render_mode IN ('link', 'markdown', 'bundle')),
    ADD COLUMN active_bundle_version_id UUID
        REFERENCES public.post_bundles(id) ON DELETE SET NULL;

CREATE INDEX posts_active_bundle_version_id_idx
    ON public.posts (active_bundle_version_id)
    WHERE active_bundle_version_id IS NOT NULL;
```

`manifest` stays as `JSONB` instead of being split across many SQL columns. Why: the serving layer, admin review UI, and parity-tested validators all need the full manifest document, and versioned schema evolution is easier when the database stores the validated blob directly. `UNIQUE (post_id, version)` makes version numbers monotonic per post, while `UNIQUE (post_id, sha256)` gives per-post deduping. Why: authors may upload many revisions of one post, but the same ZIP should not mint duplicate versions for that post.

`storage_prefix` records the final immutable bundle prefix, not the transient staging prefix used during upload. Why: the database should only describe committed bundle versions that can be served later; temporary staging state belongs to the upload pipeline, not the durable schema. `uploaded_by` stores the authenticated user UUID rather than a `member_id`. Why: the Edge Function already authenticates the Supabase bearer as an auth user, and `public.members.auth_user_id` is the ownership bridge the current repo uses everywhere else. `render_mode` defaults to `'link'`. Why: that keeps every existing post backward-compatible until either the markdown flow or the bundle flow explicitly opts a row into a richer renderer.

The `post_bundles` RLS policy set is:

```sql
ALTER TABLE public.post_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins read post_bundles"
ON public.post_bundles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.posts p
        JOIN public.members m ON m.member_id = p.member_id
        WHERE p.id = post_bundles.post_id
          AND (m.auth_user_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "Public read approved active post_bundles"
ON public.post_bundles
FOR SELECT
TO anon, authenticated
USING (
    review_status = 'approved'
    AND EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = post_bundles.post_id
          AND p.active_bundle_version_id = post_bundles.id
          AND p.status = 'published'
          AND (p.admin_status IS NULL OR p.admin_status != 'Hidden')
    )
);

CREATE POLICY "Owners insert post_bundles"
ON public.post_bundles
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.posts p
        JOIN public.members m ON m.member_id = p.member_id
        WHERE p.id = post_bundles.post_id
          AND (m.auth_user_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "Admins update post_bundles"
ON public.post_bundles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
```

The public-read policy intentionally requires all four gates at once: `review_status='approved'`, parent post `status='published'`, `posts.active_bundle_version_id = post_bundles.id`, and `(admin_status IS NULL OR admin_status != 'Hidden')`. Why: bundle bytes are public only for the currently active, approved version of a publicly visible post; old approved versions, pending uploads, rejected uploads, and Hidden posts must all stay non-public. The owner/admin SELECT policy exists even though v1 writes flow through a `SECURITY DEFINER` RPC. Why: it keeps draft bundle metadata visible to authors and admins for previews/review tooling without making the table public. The owner INSERT policy is defense in depth rather than the primary write path. Why: v1 registration goes through the RPC, but the table policy should still encode who is conceptually allowed to create bundle versions.

The existing `posts` public-read policy in `../supabase/migrations/20260325070000_create_posts.sql` must be replaced so it matches the canonical visibility predicate from the Overview:

```sql
DROP POLICY IF EXISTS "Public read published posts" ON public.posts;

CREATE POLICY "Public read published posts"
ON public.posts
FOR SELECT
USING (
    (
        status = 'published'
        AND (admin_status IS NULL OR admin_status != 'Hidden')
    )
    OR member_id IN (
        SELECT m.member_id
        FROM public.members m
        WHERE m.auth_user_id = auth.uid()
    )
    OR public.is_admin()
);
```

This policy change applies to the whole `posts` table, not just `render_mode='bundle'` rows. Why: the repo already uses `src/hooks/usePost.ts` and `src/hooks/usePosts.ts` as generic post fetchers, so a bundle-only SQL exception would leave public visibility defined one way in the client and another way in the database. The tighter table-wide rule is simpler, matches the current list-hook filter, and closes the Hidden-post chrome leak the gate called out.

Bundle registration and review state changes run through three `SECURITY DEFINER` RPCs:

```sql
CREATE OR REPLACE FUNCTION public.register_bundle_version(
    p_post_id UUID,
    p_storage_prefix TEXT,
    p_manifest JSONB,
    p_size_bytes BIGINT,
    p_file_count INTEGER,
    p_sha256 TEXT,
    p_uploaded_by UUID
)
RETURNS public.post_bundles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_post public.posts%ROWTYPE;
    v_next_version INTEGER;
    v_final_storage_prefix TEXT;
    v_bundle public.post_bundles%ROWTYPE;
BEGIN
    SELECT p.*
    INTO v_post
    FROM public.posts p
    JOIN public.members m ON m.member_id = p.member_id
    WHERE p.id = p_post_id
      AND (m.auth_user_id = p_uploaded_by OR public.is_admin(p_uploaded_by))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'bundle post not found or caller is not allowed';
    END IF;

    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM public.post_bundles
    WHERE post_id = p_post_id;

    v_final_storage_prefix := trim(trailing '/' FROM p_storage_prefix) || '/' || v_next_version::TEXT;

    INSERT INTO public.post_bundles (
        post_id, version, storage_prefix, manifest,
        size_bytes, file_count, sha256, uploaded_by
    )
    VALUES (
        p_post_id, v_next_version, v_final_storage_prefix, p_manifest,
        p_size_bytes, p_file_count, p_sha256, p_uploaded_by
    )
    RETURNING *
    INTO v_bundle;

    UPDATE public.posts
    SET render_mode = 'bundle'
    WHERE id = p_post_id;

    RETURN v_bundle;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_bundle(p_bundle_id UUID)
RETURNS public.post_bundles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_post_id UUID;
    v_bundle public.post_bundles%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'admin only';
    END IF;

    UPDATE public.post_bundles
    SET review_status = 'approved',
        review_notes = NULL,
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = p_bundle_id
    RETURNING *
    INTO v_bundle;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'bundle not found';
    END IF;

    v_post_id := v_bundle.post_id;

    UPDATE public.posts
    SET active_bundle_version_id = v_bundle.id,
        render_mode = 'bundle'
    WHERE id = v_post_id;

    RETURN v_bundle;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bundle(
    p_bundle_id UUID,
    p_review_notes TEXT
)
RETURNS public.post_bundles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_bundle public.post_bundles%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'admin only';
    END IF;

    UPDATE public.post_bundles
    SET review_status = 'rejected',
        review_notes = p_review_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = p_bundle_id
    RETURNING *
    INTO v_bundle;

    RETURN v_bundle;
END;
$$;
```

`register_bundle_version` takes `p_uploaded_by` as an explicit argument and checks ownership against `public.members.auth_user_id` or `public.is_admin(p_uploaded_by)`; it does not call `auth.uid()` anywhere in its body. Why: this function is granted only to `service_role`, and the repo's existing Edge Function pattern validates the end-user bearer before using a privileged client, so the SQL function must authorize against the validated user ID the Edge Function passes in rather than hoping `auth.uid()` survives the privilege boundary. The function updates `posts.render_mode='bundle'` in the same transaction as the insert, but it deliberately leaves `posts.active_bundle_version_id` unchanged until approval. Why: upload should make the post structurally a bundle post immediately for authoring/preview flows, while the public active pointer must move only when an admin approves one exact version. `approve_bundle` is the atomic activation boundary: it marks the bundle approved and updates `posts.active_bundle_version_id` in the same transaction. Why: review state and public-version selection must never drift apart.

The storage layer uses a private bucket named `post-bundles`. The bucket stays private and its object policies are:

```sql
-- Service-role writes only.
CREATE POLICY "Service role writes post-bundles objects"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'post-bundles')
WITH CHECK (bucket_id = 'post-bundles');

-- Owners/admins may read objects whose prefix belongs to one of their bundle rows.
CREATE POLICY "Owners read post-bundles objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'post-bundles'
    AND EXISTS (
        SELECT 1
        FROM public.post_bundles pb
        JOIN public.posts p ON p.id = pb.post_id
        JOIN public.members m ON m.member_id = p.member_id
        WHERE name LIKE pb.storage_prefix || '/%'
          AND (m.auth_user_id = auth.uid() OR public.is_admin())
    )
);
```

The bucket is private because the serving decision belongs to `serve-bundle`, not to Storage URLs. Why: public object URLs would bypass review state, Hidden-post gating, and preview-token expiration. Service-role-only writes keep extracted bundle bytes under Edge Function control. Why: the client should never write directly into the final bundle namespace or mint its own public-readable objects.

The GRANT surface is deliberately narrow:

```sql
REVOKE ALL ON FUNCTION public.register_bundle_version(UUID, TEXT, JSONB, BIGINT, INTEGER, TEXT, UUID)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_bundle_version(UUID, TEXT, JSONB, BIGINT, INTEGER, TEXT, UUID)
    TO service_role;

REVOKE ALL ON FUNCTION public.approve_bundle(UUID)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_bundle(UUID)
    TO authenticated;

REVOKE ALL ON FUNCTION public.reject_bundle(UUID, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_bundle(UUID, TEXT)
    TO authenticated;
```

`register_bundle_version` is service-role-only because only the Edge Function has enough context to validate the uploaded ZIP, calculate its digest, and pass the trusted `p_uploaded_by` through to SQL. `approve_bundle` and `reject_bundle` are granted to `authenticated` users because the repo's admin tools already run on authenticated sessions, but each function still performs an internal `public.is_admin()` check. Why: GRANTs decide which client class may call the function at all, while the internal admin guard decides which authenticated users may successfully complete the action.

## Types & Manifest Schema

Bundle mode extends `src/types/post.ts`; it does not fork the existing post model. The shared post row keeps all current fields and adds the minimum bundle-specific metadata:

```ts
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
```

The new fields live on the existing interfaces because `src/hooks/usePost.ts`, `src/hooks/usePosts.ts`, and `src/lib/posts.ts` already speak in terms of `PostRow`. Why: downstream callers should see bundle mode as one more rendering state of a post, not as a second post type with a parallel set of interfaces.

The manifest contract is a versioned JSON file named `post.json` at the root of the uploaded ZIP:

```ts
export interface BundleManifestV1 {
  schemaVersion: 1;
  title: string; // 1-120 chars, plain text
  summary?: string; // 0-200 chars, plain text
  entry: string; // relative HTML entrypoint such as "index.html"
  ogImage?: string; // optional relative image path
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
```

`schemaVersion: 1` is mandatory because the serving layer needs an explicit compatibility contract before more manifest revisions exist. `title` and `summary` are plain-text strings with tight length caps because they feed post chrome, admin review UI, and SEO mapping later in the document. `entry` is a required relative path because the bundle must resolve to a deterministic HTML start file without letting the author point at an external URL. `ogImage` is optional because some bundles will rely on the post cover instead, but when present it still has to stay inside the uploaded archive.

The `layout` block deliberately covers all three display modes in one shape:

- `inline-fixed`: requires `aspectRatio` and ignores resize messages. Why: fixed-aspect embeds should reserve space up front and never depend on runtime cooperation from the bundle.
- `inline-auto`: requires `minHeight` and `maxHeight` and participates in the host-side `postMessage` resize protocol described later. Why: auto-height experiences need a bounded contract so a misbehaving bundle cannot grow without limit.
- `fullscreen`: ignores inline sizing as the primary layout and instead tells the post page to hand off to the fullscreen presentation branch. Why: a dedicated mode is clearer than overloading a boolean on top of inline layouts.

`allowFullscreenToggle` lives in the manifest instead of being inferred from layout mode alone. Why: some inline bundles may want an opt-in path to expand, while some fullscreen bundles should render full-window immediately with no extra control. The `capabilities` block records `scripts`, `pointerLock`, and `popups` separately. Why: review tooling and sandbox configuration need explicit declarations for risky browser features instead of guessing from the ZIP contents.

The validator exists in two copies on purpose:

- `src/features/bundlePosts/manifestSchema.ts`
- `supabase/functions/_shared/bundle-manifest.ts`
- shared fixture corpus: `testdata/bundle-manifests/`
- parity test runner: `scripts/check-manifest-schemas.mjs`

The frontend copy powers client-side preflight before upload, while the Edge Function copy is the authoritative server-side validator. The fixture corpus contains both valid and invalid manifests, and `scripts/check-manifest-schemas.mjs` must assert that both validators accept and reject the same files. Why: the Vite app and the Deno Edge Functions live in sibling runtimes with no shared package boundary in this repo, so a single-source import would require extra packaging/build plumbing that is outside this v1 design. Dual-copy plus parity fixtures is the simpler, explicit choice that keeps both environments honest without inventing a cross-runtime library first.

## Upload Pipeline

`src/lib/posts.ts` stays the shared post lifecycle layer. `createDraft`, `saveDraft`, and `publishPost` remain mode-agnostic, so the database default `render_mode='link'` still applies until a richer mode explicitly takes over. The only new client helper in that file is:

```ts
export const setPostRenderMode = async (
  postId: string,
  mode: PostRenderMode,
): Promise<void> => {
  await supabase
    .from('posts')
    .update({ render_mode: mode })
    .eq('id', postId);
};
```

That helper ships for future mode-switching UI only; v1 does not call it from the editor. Why: the concrete `render_mode='bundle'` flip must happen server-side inside `register_bundle_version`, in the same transaction that inserts the new `post_bundles` row. Public activation remains server-side too, but it happens later inside `approve_bundle`, which advances `active_bundle_version_id` only after review. Leaving both transitions inside SQL avoids client-side races around which bundle version is structurally attached to the post and which version is publicly active.

The upload path is a single Edge Function named `process-bundle`:

1. `BundleUpload` is mounted as a third tab inside `src/pages/SubmitPost/index.tsx`, alongside the existing raw/rich markdown authoring tabs. If the current editor session does not yet have a `postId`, the sub-component first calls the existing `createDraft` helper and navigates to `/submit/post/:postId`. Why: bundle versions need a stable parent post row before upload begins, and this avoids inventing a parallel `/submit/post-bundle` route.
2. The client accepts only `.zip` files and rejects compressed uploads larger than 20 MB before any network request. Why: obvious oversize/incorrect-file failures should be cheap and immediate.
3. The client then calls `supabase.functions.invoke('process-bundle', ...)` with the draft `postId` and ZIP bytes. Why: the repo already uses Edge Functions for privileged media work, so bundle validation should follow that same pattern instead of trying to unpack archives in the browser.
4. `process-bundle` reads the bearer token from the request, creates a service-role Supabase client, and calls `supabase.auth.getUser(accessToken)` exactly like `../supabase/functions/cloudflare-stream-ingest/index.ts`. Why: the function needs a trusted end-user identity before it does any service-role writes.
5. The function generates `upload_uuid = gen_random_uuid()` and extracts the archive into a private staging prefix: `post-bundles/staging/<upload_uuid>/...`. Why: staging keeps unapproved bytes out of the final namespace until the database has allocated a real version.
6. Extraction is streaming and fail-fast. The function rejects archives with more than 500 entries, more than 20 MB uncompressed total, any single file above 10 MB, or an expansion ratio above 50:1. It also rejects `..` segments, absolute paths, symlinks, and extensions outside the allowlist: `.html`, `.css`, `.js`, `.mjs`, `.json`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`, `.ico`, `.mp4`, `.webm`, `.mp3`, `.wav`, `.woff`, `.woff2`, `.ttf`, `.otf`, and `.wasm`. Why: bundle mode is for static web assets, not arbitrary filesystem tricks or archive bombs.
7. The function requires `post.json` at the ZIP root, validates it with `supabase/functions/_shared/bundle-manifest.ts`, and computes a SHA-256 digest for per-post deduping before registration. Why: the server-side manifest validator is authoritative, and duplicate uploads should fail before a new version row is minted.
8. The function calls `register_bundle_version` with the validated user identity: `p_post_id = postId`, `p_storage_prefix = 'post-bundles/bundles/<post_id>'`, `p_manifest = validatedManifest`, `p_size_bytes`, `p_file_count`, `p_sha256`, and `p_uploaded_by = user.id`. Why: `register_bundle_version` is the single writer that allocates the next bundle version number and flips the parent post into bundle mode atomically, without prematurely making the uploaded version public.
9. After the RPC returns the inserted `post_bundles` row, `process-bundle` promotes the extracted files from `post-bundles/staging/<upload_uuid>/...` to the final prefix stored on that row, `post-bundles/bundles/<post_id>/<version>/...`, then deletes the staging copy. Why: the final namespace should only contain registered versions, while staging remains disposable.
10. If the RPC fails, the function deletes the staging prefix and returns an error without leaving any registered bundle row behind. If the storage promotion fails after the RPC succeeds, the function deletes the new `post_bundles` row and restores the parent `posts.render_mode` to whatever value it held before registration when that failed upload was the only bundle candidate for the post; it does not need to clear `posts.active_bundle_version_id` because activation only happens later inside `approve_bundle`. Why: the feature should not strand half-registered bundle versions even though the bucket is private, and the public active pointer should move only through the approval transaction.

This design picks storage-race option (b): UUID-keyed staging followed by promotion inside the RPC success path. Why: option (a) would force a two-phase client flow, require signed upload URLs to escape into the browser, and split validation responsibility between client and server. The staging approach keeps unzip/validation local to the Edge Function, makes orphan cleanup a simple staging-GC job, and lets the SQL transaction remain the point where a bundle version actually comes into existence.

The client-side `BundleUpload` contract is intentionally small:

- It lives inside the existing `src/pages/SubmitPost/index.tsx` screen as a third tab, not as a parallel route.
- It needs a `postId`; if none exists yet, it creates one through the existing draft flow before upload starts.
- It shows the selected ZIP name, compressed size, manifest title/summary after upload, and the preview URL returned by the function.
- It does not write `render_mode='bundle'` directly; it waits for `register_bundle_version` to do that server-side.

Why: the upload tab should behave like one more authoring mode in the current editor, not like a different product surface with its own persistence rules.

The preview URL contract is `/posts/id/<post_id>?preview=<bundle_version_id>`. Why: `src/lib/posts.ts` only guarantees a slug when `publishPost` runs, so draft uploads need an ID-based route that exists before publication. `process-bundle` returns that preview URL directly after a successful upload so the client never has to guess whether a slug exists yet.

The function returns one distinct machine-readable error code per rejection path:

| Code | Meaning |
| --- | --- |
| `bundle_auth_required` | Missing or invalid bearer token |
| `bundle_post_not_found` | `postId` does not exist or caller does not own it |
| `bundle_not_zip` | Uploaded file is not a ZIP archive |
| `bundle_zip_too_large` | Compressed upload exceeds 20 MB client/server cap |
| `bundle_too_many_entries` | Archive exceeds 500 extracted entries |
| `bundle_uncompressed_limit_exceeded` | Total extracted size exceeds 20 MB |
| `bundle_file_too_large` | Any single extracted file exceeds 10 MB |
| `bundle_ratio_exceeded` | Archive expansion ratio exceeds 50:1 |
| `bundle_invalid_path` | Path traversal or absolute path detected |
| `bundle_symlink_disallowed` | Archive contains a symlink entry |
| `bundle_extension_disallowed` | Extracted file extension is not on the allowlist |
| `bundle_manifest_missing` | `post.json` is absent |
| `bundle_manifest_invalid` | `post.json` fails schema validation |
| `bundle_duplicate_upload` | SHA-256 already exists for this post |
| `bundle_storage_write_failed` | Staging upload failed |
| `bundle_register_failed` | `register_bundle_version` failed |
| `bundle_promotion_failed` | Staging-to-final promotion failed |

Why: the UI and admin tooling need enough precision to tell validation errors apart from transient storage failures.

## Starter Template & Author Onboarding

When an author picks the bundle tab in `src/pages/SubmitPost/index.tsx`, the UI must surface a concrete starter payload so they are never staring at a blank "upload a zip" prompt. Three surfaces:

1. **A public GitHub starter repo** at https://github.com/banodoco/bundle-starter — the canonical, forkable, version-controlled starting point. Authors clone it, edit, zip, and upload. The bundle tab links to it directly via a "Fork starter on GitHub" link.
2. **A downloadable starter zip** also shipped as a static asset at `public/bundle-starter.zip`, built from the same canonical file tree by `scripts/build-bundle-starter.mjs`. The bundle tab's "Download starter (.zip)" link fetches it for authors who don't want to use Git.
3. **A copy-to-clipboard agent prompt** — a long plain-text block the author can paste into a coding agent (Claude Code, Cursor, Aider, etc.) to have the agent clone the starter repo and iterate on the bundle for them. This is the main differentiator: authors who don't want to handwrite HTML can delegate the whole thing.

Why: the validation rules above are a *contract*, not a *template*. Authors need both a starting point that already passes validation and a prompt their AI agent can act on without reading the full design doc.

### Minimum viable file tree

```
bundle-starter/
├── post.json              # manifest (validated against BundleManifestV1)
├── index.html             # entry — referenced by manifest.entry
├── src/
│   ├── main.ts            # optional — your app code
│   └── styles.css         # optional — your styles
├── assets/                # any static files (images, fonts, models)
├── package.json           # if using a bundler — scripts/devDependencies only
├── vite.config.ts         # example Vite config producing static output
└── README.md              # author-facing quickstart
```

Only `post.json` and `index.html` are strictly required by validation. Everything else is optional scaffolding.

### Example `post.json` (all three layout modes)

```json
{
  "schemaVersion": 1,
  "title": "My interactive post",
  "summary": "A short plain-text description shown as the meta description and on search/listing pages.",
  "entry": "index.html",
  "layout": {
    "mode": "inline-auto",
    "minHeight": 320,
    "maxHeight": 1600,
    "allowFullscreenToggle": false
  },
  "ogImage": "assets/og.png",
  "capabilities": {
    "scripts": true,
    "popups": false,
    "pointerLock": false
  },
  "authoredAt": "2026-04-21T12:00:00Z"
}
```

Swap `layout.mode` between `"inline-fixed"` (author declares a pixel/viewport height), `"inline-auto"` (host resizes to fit content via the postMessage protocol), or `"fullscreen"` (iframe fills the viewport minus a thin chrome bar).

### Example `index.html` — inline-auto with the resize snippet

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My interactive post</title>
  <style>
    html, body { margin: 0; padding: 0; font-family: system-ui, sans-serif; color: #f4f4f5; background: #0b0b0f; }
    main { padding: 2rem; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; }
  </style>
</head>
<body>
  <main id="app">
    <h1>Hello from a bundle.</h1>
    <p>Edit this file, ship a zip, upload it.</p>
  </main>
  <script>
    // inline-auto resize reporter — emits to parent whenever body height changes.
    (function reportHeight() {
      if (window.top === window.self) return; // not embedded
      var last = -1;
      function send() {
        var h = document.documentElement.scrollHeight;
        if (h === last) return;
        last = h;
        window.parent.postMessage({ type: 'banodoco:resize', v: 1, height: h }, '*');
      }
      new ResizeObserver(send).observe(document.documentElement);
      window.addEventListener('load', send);
    })();
  </script>
</body>
</html>
```

Why the resize snippet is inlined rather than imported: a single file means the author does not need a build step, and copying the snippet keeps the author's code dependency-free. Copy it verbatim — the host listener validates `source`, `origin`, and envelope shape (`type === 'banodoco:resize'`, `v === 1`, `Number.isInteger(height)`), so the payload is part of a fixed protocol.

### Build-tooling note

If the author chooses to use Vite/Next static export/Parcel/any other bundler, the output directory is what goes into the zip. The starter ships with a minimal `vite.config.ts` that sets `build.outDir = './dist'` and `build.assetsInlineLimit = 4096` so small images are inlined and the zip stays within the 20 MB cap. A `package.json` script `"build:bundle": "vite build && cd dist && zip -r ../bundle.zip ."` produces a valid upload artifact in one command. Nothing about the bundler choice is enforced; authors can ship hand-authored HTML with zero build step.

### Agent prompt (copy-to-clipboard string)

The bundle tab exposes a `Copy agent prompt` button. Clicking it copies the following block verbatim, with `{{POST_TITLE}}` substituted from the current draft's title. The author pastes it into their coding agent and iterates:

````text
You are building a Banodoco bundle post. Your deliverable is a ZIP file containing a pre-built static site that will be uploaded to a sandboxed iframe on a Banodoco post page.

Hard rules (enforced server-side — violating any of these rejects the upload):
- The zip must contain `post.json` and `index.html` at the root. Everything else is relative assets.
- Max 20 MB compressed, 20 MB uncompressed total, 10 MB per file, 500 entries, 50:1 expansion ratio ceiling.
- No `..`, absolute paths, or symlinks in the archive.
- File extensions limited to: .html .css .js .mjs .json .svg .png .jpg .jpeg .webp .gif .avif .ico .mp4 .webm .ogg .mp3 .wav .woff .woff2 .ttf .otf .txt .md .wasm.
- No server code. The bundle is static.
- Only same-origin fetches are allowed by default (CSP `connect-src 'self'`). If you need external endpoints, declare them in `post.json.external_origins` as an array of origin strings.
- The iframe sandbox grants `allow-scripts` only by default. Do not rely on form submission, top-navigation, or same-origin-with-parent.

Required `post.json` shape:
```json
{
  "schemaVersion": 1,
  "title": "{{POST_TITLE}}",
  "summary": "plain text, 0-200 chars, used for meta description and SEO",
  "entry": "index.html",
  "layout": {
    "mode": "inline-auto",          // or "inline-fixed" with "height": <px|string like 60vh>, or "fullscreen"
    "minHeight": 320,
    "maxHeight": 1600
  },
  "capabilities": {
    "scripts": true,
    "popups": false,                // set true only if you open new tabs
    "pointerLock": false            // set true only if you need pointer lock
  }
}
```

If `layout.mode === "inline-auto"`, the host resizes the iframe to fit content. Your page MUST post a message to the parent whenever its height changes:
```js
window.parent.postMessage({ type: 'banodoco:resize', v: 1, height: document.documentElement.scrollHeight }, '*');
```
Fire this on load and on every content resize (use ResizeObserver on `document.documentElement`).

If `layout.mode === "fullscreen"`, the parent renders a thin chrome bar with a back button and creator attribution. Your content should treat the viewport (minus ~48px top bar) as its canvas.

Build flow:
1. Start from the official starter template — clone it as your working directory:
   `gh repo clone banodoco/bundle-starter <project-dir>` (or `git clone https://github.com/banodoco/bundle-starter.git <project-dir>`).
   It already contains a valid `post.json` and an `index.html` with the postMessage resize snippet baked in. Edit those rather than writing them from scratch.
2. Replace `index.html` with your content. Edit `post.json` (title, summary, layout, capabilities). Add any images, fonts, audio, or scripts alongside.
3. If you use a bundler (Vite/Next static/Parcel), build to `dist/` and zip from there. Otherwise zip the project directory directly.
4. Zip the *contents* (not the directory itself — `post.json` and `index.html` must be at the zip root): `zip -r bundle.zip post.json index.html README.md` (add any other files you've included).
5. Keep the zip under 20 MB.

Your output should be a runnable project directory the author can edit, build, and zip. Start by cloning banodoco/bundle-starter; do NOT write `post.json` or the resize snippet from scratch.

The author's ask: {{INSERT AUTHOR PROMPT HERE}}
````

Why a literal copyable block: coding agents work best from a single self-contained instruction. The author doesn't have to explain the rules — the agent receives them directly. The `{{POST_TITLE}}` placeholder is the only dynamic substitution v1 needs; the UI may add a second `{{INSERT AUTHOR PROMPT HERE}}` slot the author fills in before copying, or let them append their ask after pasting.

### UI surface on the bundle tab

The bundle tab in `src/pages/SubmitPost/index.tsx` renders four elements above the zip uploader:

1. `Fork starter on GitHub` — an `<a href="https://github.com/banodoco/bundle-starter" target="_blank" rel="noopener">` link. The canonical, version-controlled starting point.
2. `Download starter (.zip)` — an `<a href="/bundle-starter.zip" download>` link to the build-time-generated zip, for authors who don't want to use Git.
3. `Copy agent prompt` — a button that calls `navigator.clipboard.writeText(agentPrompt)` with the block above, title-substituted. The prompt itself instructs the agent to clone the GitHub repo as its starting point.
4. A collapsed `Learn more` disclosure that links to `docs/posts-bundle-mode.md` (or a published permalink to it) for authors who want the full spec.

Why four surfaces rather than one: Git-friendly authors fork on GitHub, non-Git authors download the zip, agent-users copy the prompt, deep-diving authors want the spec. Each is cheap and each serves a distinct audience.

## Serving

Bundle bytes are served from the same origin as the Supabase Functions host, not from a dedicated bundle subdomain. Why: that origin is already cross-origin to `banodoco.com`, so the iframe stays isolated from the parent page by the browser's same-origin policy without adding a separate DNS/certificate/deployment surface. A dedicated subdomain would buy little security in v1 while increasing operational complexity.

The preview-token path is an Edge Function named `issue-preview-token`:

1. The SPA calls `supabase.functions.invoke('issue-preview-token', { body: { bundleVersionId } })`.
2. The function validates the bearer token with `supabase.auth.getUser(accessToken)`.
3. It loads `post_bundles pb JOIN posts p JOIN members m` for the requested bundle version and permits the call only when `pb.uploaded_by = user.id` or `public.is_admin(user.id)` is true.
4. It returns a JWT signed with `BUNDLE_PREVIEW_SECRET` and payload `{ bv, sub, iat, exp }`, where `bv` is the bundle version ID, `sub` is the caller user ID, and `exp = iat + 300`.

Why: preview links should be scoped to one bundle version and should expire after 5 minutes, so sharing a stale preview URL becomes a `404` instead of a long-lived leak of pending code.

The public-serving function is `serve-bundle`, mounted at `/serve-bundle/:bundleVersionId/:path*?token=`. Its decision tree is:

- Public access returns `200` only when all four conditions hold: `review_status='approved'`, `posts.status='published'`, `posts.active_bundle_version_id = :bundleVersionId`, and `(admin_status IS NULL OR admin_status != 'Hidden')`.
- Public hits return `Cache-Control: public, max-age=31536000, immutable`.
- Preview access returns `200` when the signed token is valid, unexpired, and its `bv` claim matches the requested `bundleVersionId`.
- Preview hits return `Cache-Control: private, no-store`.
- All other cases return `404`, including pending bundles, rejected bundles, Hidden posts, expired tokens, and tokens scoped to a different bundle version.

Why: public bundle URLs should behave like immutable versioned assets, while preview URLs should behave like short-lived secrets. `404` is the right failure mode because it reveals less about moderation state than `401` or `403`.

Every bundle response uses this CSP and companion headers:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors <BUNDLE_FRAME_ANCESTORS>; base-uri 'none'; form-action 'none'; object-src 'none'; worker-src 'self' blob:
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
Cross-Origin-Resource-Policy: cross-origin
```

We do not emit `X-Frame-Options`. Why: it conflicts with `frame-ancestors` on modern browsers and would break the intentional cross-origin embedding model. `connect-src 'self'` and `form-action 'none'` are the core egress restrictions. Why: bundles may fetch only their own served assets and may not post forms to third parties.

`frame-ancestors` is driven by a dedicated environment variable, `BUNDLE_FRAME_ANCESTORS`. In production the value is `"https://banodoco.com https://www.banodoco.com"`, while staging and local values are set per environment. Why: hard-coding production origins would block the exact staging/local embedding scenarios this feature needs for verification, and the repo does not currently expose one canonical site-origin constant to share between frontend and functions.

The iframe contract on the post page is:

```tsx
<iframe
  src={src}
  sandbox={sandbox}
  allow=""
  referrerPolicy="no-referrer"
  loading="lazy"
/>
```

The `sandbox` value is exactly `allow-scripts`, plus `allow-popups` when `manifest.capabilities.popups === true`, and `allow-pointer-lock` when `manifest.capabilities.pointerLock === true`. Why: scripts are necessary for most static bundles, but every extra sandbox token should be opt-in and manifest-declared so review can reason about the risk surface.

`BundleFrame` stays intentionally small, with a target of under 200 LoC:

```tsx
function BundleFrame({
  bundleVersionId,
  manifest,
  previewToken,
}: {
  bundleVersionId: string;
  manifest: BundleManifestV1;
  previewToken?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const src = buildBundleUrl(bundleVersionId, manifest.entry, previewToken);
  const sandbox = buildSandboxTokens(manifest.capabilities);
  const { height } = useBundleResize(iframeRef, manifest.layout);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      sandbox={sandbox}
      allow=""
      referrerPolicy="no-referrer"
      loading="lazy"
      style={{ width: '100%', height }}
      title={manifest.title}
    />
  );
}
```

Why: the iframe wrapper should own only URL construction, sandboxing, and height orchestration; everything else belongs in the post page shell.

`useBundleResize` also stays small, with a target of under 80 LoC:

```ts
function useBundleResize(
  iframeRef: RefObject<HTMLIFrameElement>,
  layout: BundleManifestV1['layout'],
) {
  const [height, setHeight] = useState(resolveInitialHeight(layout));
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (layout.mode !== 'inline-auto') return;

    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== import.meta.env.VITE_BUNDLE_SERVING_ORIGIN) return;

      const payload = event.data;
      if (
        !payload ||
        payload.type !== 'banodoco:resize' ||
        payload.v !== 1 ||
        !Number.isInteger(payload.height)
      ) {
        return;
      }

      const nextHeight = clamp(payload.height, layout.minHeight ?? 320, layout.maxHeight ?? 1600);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setHeight(nextHeight));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef, layout]);

  return { height };
}
```

Why: the host page, not the bundle, is responsible for final height clamping and event validation. Checking `source`, `origin`, and the full message envelope prevents unrelated windows from spoofing resize events.

## SEO Mapping

When `post.renderMode === 'bundle'`, the post page maps manifest metadata into runtime document tags:

- `document.title = manifest.title`
- `<meta name="description"> = manifest.summary`
- `og:title = manifest.title`
- `og:description = manifest.summary`
- `og:image = resolveBundleAssetUrl(bundleVersionId, manifest.ogImage)` when `ogImage` exists
- `og:type = 'article'`
- `<link rel="canonical"> = canonical post URL`

Why: the manifest already carries the bundle-specific summary that best describes what the iframe is about, so the post chrome should reuse it instead of forcing authors to maintain a second SEO payload elsewhere.

This is explicitly runtime-only meta injection in a client-rendered Vite SPA. Classical social unfurlers such as Twitter, Slack, and Discord will not see these tags because they do not execute the client app before scraping the page. Why: shipping bundle mode in v1 does not justify adding SSR or a prerender pipeline just to improve unfurls. SSR/prerender for social previews remains a follow-up, not a hidden requirement for this release.

Runtime-only SEO is still worth doing in v1 because it improves browser-tab titles, in-app navigation, and any crawler or internal surface that executes the page after hydration. Why: the primary usage pattern here is logged-in users clicking through the Banodoco UI, not unauthenticated social cards.

## Post Page Integration

The single-post hook remains `src/hooks/usePost.ts`; bundle mode extends it instead of introducing a second detail hook. The signature becomes `usePost(slugOrId, opts?: { previewVersionId?: string })`, `PostDetailItem` gains `renderMode` and `activeBundleVersionId`, and the `posts` SELECT at the current line ~226 grows to include `render_mode` and `active_bundle_version_id`. When `activeBundleVersionId` is non-null, the hook issues an additional `post_bundles` lookup and returns `activeBundle`; when `opts.previewVersionId` is present, it also fetches that bundle row as `previewBundle` under the existing owner/admin RLS. Existing callers with no second argument and no bundle-field reads continue to work unchanged. Why: the app already centralizes post hydration, cover fallback, and creator resolution in this hook, so bundle-specific metadata should arrive as additive fields rather than a parallel fetch path.

`src/hooks/usePosts.ts` gets the same additive treatment. `PostListItem` gains `renderMode`, the `posts` SELECT at the current line ~211 adds `render_mode`, and the public list predicate at ~224 remains exactly `admin_status IS NULL OR admin_status != 'Hidden'`. Why: list callers such as `/2RP` and profile tabs should be able to branch on render mode without giving up the current pagination or visibility behavior.

The route-level renderer becomes a new dispatcher component at `src/pages/Post/index.tsx`:

- `post.renderMode === 'bundle'` renders `BundleView`, which reads `?preview=<bundleVersionId>` via `useSearchParams`, requests a preview token when present, and then renders the standard post chrome plus `<BundleFrame />`.
- `post.renderMode === 'markdown'` renders the markdown detail arm owned by the sibling markdown branch.
- `post.renderMode === 'link'` or `null` keeps the existing non-bundle behavior.

Why: the route should switch on one normalized post shape, not on which page component happened to be imported at build time. The earlier plan text assumed `/posts/:slug` still pointed at placeholders, but this branch already routes those URLs to `PostDetail`; bundle mode therefore replaces the current route target with a dispatcher instead of adding a second detail route family.

`src/App.tsx` keeps the existing `/posts/:slug` and `/:username/posts/:slug` routes, but they should point at `<Post />` rather than the current `PostDetail` import. Add `/posts/id/:id` for draft preview URLs and add `/admin/bundles` for the review queue. Why: the slug routes already exist in this branch, so the smallest correct change is to repoint them at the dispatcher and add only the new ID-based preview route plus the admin screen.

`src/lib/routing.ts` already reserves `posts` and already teaches `normalizeLegacyHashUsernamePath()` about `/:username/posts/...` in this branch, so bundle mode only adds `admin` to `RESERVED_TOP_LEVEL_SEGMENTS` and preserves the existing `/posts` handling. Why: the route helper work is partly done already; the design should acknowledge that reality instead of re-specifying changes that have already landed.

Fullscreen presentation is handled by a new `FullscreenContext` plus one extra branch in `src/layouts/MainLayout.tsx`, inserted after the existing `/2nd-renaissance` and `/1m` special cases. When `fullscreen=true`, `MainLayout` renders a bare `<LayoutProvider>` with no header/footer chrome. `BundleView` sets that context on mount when `manifest.layout.mode === 'fullscreen'` and clears it on unmount. The immersive overlay chrome lives inside `BundleView`: a back button, a creator chip, and an idle-fade treatment so authors can make fullscreen pieces without letting the bundle impersonate the whole site. Why: `MainLayout` already has an explicit pattern for special full-screen routes, and bundle fullscreen should reuse that pattern rather than inventing ad hoc header suppression.

`Header` does not need new bundle-specific logic, because this branch already treats `/posts/` as a resource-context subpage and already points the logo back to `/2RP` from post detail. Why: the existing header work is sufficient; the new fullscreen branch lives below it and only bypasses the header when `BundleView` explicitly opts into fullscreen mode.

`src/pages/SubmitPost/index.tsx` gets one more authoring tab for bundles. The existing raw/rich markdown tabs remain visible for `render_mode='link'` and `render_mode='markdown'`, but once a post is `render_mode='bundle'` they become disabled/read-only and a banner explains that bundle posts are edited through bundle upload/version controls instead. Why: the same submit page already owns the draft row and publish lifecycle, but letting authors continue editing `body` and re-running `syncEmbeds` on a bundle post would desynchronize the post chrome from the active bundle version.

## Admin Review UI

Bundle review lives at `/admin/bundles`. On mount, the page calls `supabase.rpc('is_admin')`; non-admin users are redirected away immediately. Why: bundle approval is moderation infrastructure, not a public or owner-visible surface.

The queue query is `post_bundles WHERE review_status = 'pending' ORDER BY uploaded_at ASC`. Each row shows:

- preview link: `/posts/id/<post_id>?preview=<bundle_id>`
- manifest title and summary
- bundle size and file count
- short SHA-256 digest
- uploader/creator information when available from the joined post/member rows

Why: the reviewer needs enough context to decide whether the code is safe and relevant without opening the ZIP manually first.

The primary actions are Approve and Reject. Both can be implemented either as direct RPC calls to `approve_bundle` / `reject_bundle` or as a thin `review-bundle` Edge Function that wraps those RPCs and emits audit logs. v1 should use the direct RPC path and defer the wrapper unless audit requirements actually materialize. `approve_bundle` must be the activation boundary: it marks the bundle approved and updates `posts.active_bundle_version_id` to that exact bundle in the same SQL transaction. Why: the review decision and the public pointer must move together, otherwise the post can claim one public bundle while the review table says another.

Bundle-code review is not the same thing as post-level moderation. `approve_bundle` / `reject_bundle` decide whether a specific ZIP may be served; `posts.admin_status` decides whether the surrounding post row is publicly visible. Both gates are enforced by `serve-bundle`, and the admin UI should say that explicitly. Why: reviewers need to know that an approved bundle on a Hidden post still stays dark, and moderators need to know that marking a post Listed does not automatically make an unapproved bundle public.

The admin page surfaces the current `posts.admin_status` as display-only metadata with a link to the existing post moderation surface if it exists. If no such moderation UI exists yet, that absence is a follow-up dependency rather than part of this feature. Why: the bundle review screen should not silently grow into a general-purpose post moderation console.

## Threat Model

| Risk | Mitigation | Why this is the right v1 control |
| --- | --- | --- |
| Parent DOM or cookie access from bundle code | Bundles run in a sandboxed iframe on the Supabase Functions origin, which is cross-origin to `banodoco.com`; the iframe keeps only `allow-scripts` plus explicit opt-ins. | Cross-origin isolation plus a narrow sandbox removes direct parent DOM and cookie access without needing a dedicated bundle subdomain. |
| Exfiltration via `fetch`, beacon, image, or form posts | CSP locks the bundle to `connect-src 'self'`, `img-src 'self' data: blob:`, and `form-action 'none'`. | Bundles may load only their own served assets; they cannot post forms or call third-party APIs. |
| Clickjacking the site or forcing top-level navigation | The iframe sandbox omits `allow-top-navigation` and related escape hatches. | Even malicious bundle UI cannot replace the parent tab with an arbitrary destination. |
| Clickjacking the bundle itself | `frame-ancestors` is limited to the `BUNDLE_FRAME_ANCESTORS` allowlist. | Only Banodoco-controlled environments may embed the approved bundle origin. |
| Pending or rejected bundles becoming reachable | Private Storage plus `serve-bundle` returning `404` unless the bundle is approved or covered by a valid preview token. | Storage URLs alone are never enough to read bytes. |
| Hidden post still serving bundle bytes | `admin_status != 'Hidden'` is enforced in three places: `post_bundles` public-read RLS, `serve-bundle`, and the `posts` public-read RLS. | The gate fix has to cover both iframe bytes and post chrome; one layer is not enough. |
| Preview token replay | Preview JWTs are scoped to one bundle version (`bv`) and expire after 5 minutes. | A leaked preview URL becomes harmless quickly and cannot be replayed against a different bundle version. |
| Approval race | `approve_bundle` is a single SQL transaction that marks the bundle approved and advances `posts.active_bundle_version_id` together. | Reviewers either approve one exact bundle version or they do not; there is no partial state where review state and the public pointer disagree. |
| First-upload race where a bundle row exists but the post still looks non-bundle | `register_bundle_version` inserts the bundle row and flips `posts.render_mode='bundle'` in one transaction; `active_bundle_version_id` stays null until `approve_bundle` activates a reviewed version. | The parent post never claims bundle mode without a concrete bundle row behind it, and it never exposes an unreviewed bundle as public. |
| Storage/DB version race | UUID staging prefix first, version allocation in `register_bundle_version`, then promotion to `bundles/<post_id>/<version>` in the RPC success path with cleanup on failure. | Storage writes never guess the final version number before SQL has allocated it. |
| ZIP bombs | Server-side unzip caps: 500 entries, 20 MB extracted total, 10 MB per file, 50:1 expansion ratio. | The parser can abort early before archive expansion becomes a resource-exhaustion vector. |
| Path traversal or filesystem abuse | Reject `..`, absolute paths, and symlinks during extraction. | The bundle archive is treated as untrusted input and may only populate a confined object prefix. |
| Height-based denial of service | `useBundleResize` validates the sender and clamps height between manifest bounds with rAF batching. | A bundle may request size changes, but the host decides the actual rendered height. |
| Cryptojacking or network beaconing | `connect-src 'self'` plus private serving origin. | Bundles cannot open arbitrary mining pools, analytics backends, or exfiltration endpoints. |
| Phishing via fullscreen immersion | Fullscreen bundles still show mandatory creator chrome and a back control that fades rather than disappears; review happens before public serving. | Users keep a trusted escape hatch and provenance indicator even in immersive mode. |
| Manifest stored XSS | Manifest schema requires plain-text `title` and `summary`, React escapes UI rendering, and meta tags are written with attribute APIs rather than HTML injection. | Manifest text may be displayed, but it is never interpreted as raw HTML. |
| CSRF against Banodoco APIs | The bundle runs on an opaque cross-origin iframe origin and cannot submit forms to arbitrary endpoints. | Parent-session cookies are not available to the bundle, so classic same-origin CSRF primitives do not apply. |
| Post-approval tampering | Storage writes are service-role only; any new upload creates a new bundle version that re-enters review. | Approved bytes are immutable at their versioned path. |
| Egress and cache abuse | Approved responses are `immutable`; preview responses are `private, no-store`; public fetches still obey the CSP egress limits. | Public assets cache well, while previews do not linger in shared caches. |

## Markdown Coordination, Out of Scope, and Open Questions

### Shared surfaces with markdown mode

Bundle mode deliberately lands on the same posts surfaces that markdown mode already owns, because parallel hooks, routes, or authoring pages would recreate the exact drift the gate called out:

- `public.posts.render_mode` is a shared three-way enum surface, with the CHECK constraint widened to `'link' | 'markdown' | 'bundle'` so all post renderers stay on one column instead of forking schema state.
- `src/types/post.ts` gains `PostRenderMode`, `render_mode`, and `active_bundle_version_id` as additive extensions to the existing post types, because the TypeScript model should continue to describe one post system.
- `src/hooks/usePost.ts` and `src/hooks/usePosts.ts` are extended in place with non-breaking bundle fields, because callers that only understand link or markdown posts should keep compiling unchanged.
- The `/posts/:slug` and `/:username/posts/:slug` detail routes continue to terminate in one `<Post />` dispatcher, because the post-page chrome, gating, and preview routing all need one entry point.
- The existing `src/pages/SubmitPost/index.tsx` remains the only authoring route, because bundle upload is a third tab layered onto the markdown flow rather than a competing submit surface.
- Profile and list consumers such as `src/pages/UserProfile/index.tsx` and `src/hooks/useUserProfile.ts` stay on the same `posts` query family, because post counts and post cards should not diverge by mode.

### Bundle-only surfaces

The following pieces are bundle-specific and should not be merged back into the markdown branch as generic post infrastructure:

- `src/features/bundlePosts/manifestSchema.ts`, `supabase/functions/_shared/bundle-manifest.ts`, and `testdata/bundle-manifests/` exist only for ZIP-manifest validation, because markdown posts do not have a `post.json` contract.
- The private `post-bundles` Storage bucket and the `post_bundles` table exist only for versioned static payloads, because markdown posts continue to store body content on `posts.body`.
- `process-bundle`, `serve-bundle`, and `issue-preview-token` are bundle-only Edge Functions, because markdown rendering does not need binary ingestion, preview JWTs, or byte serving.
- The iframe CSP, sandbox attributes, `BundleFrame`, and `useBundleResize` are bundle-only rendering primitives, because markdown posts render directly into the parent React tree.
- `register_bundle_version`, `approve_bundle`, and `reject_bundle` are bundle-only RPCs, because markdown publishing stays in the existing `saveDraft` / `publishPost` flow.
- `FullscreenContext` plus the bundle fullscreen branch in `src/layouts/MainLayout.tsx` are bundle-only behavior, because fullscreen is driven by bundle manifest layout modes rather than markdown post metadata.

### Out of scope

These items are intentionally deferred from v1 so the first bundle-mode release stays narrowly focused on safe upload, review, serving, and post-page integration:

- SSR or prerender for social unfurlers is out of scope, because runtime meta injection already covers in-app browsing and adding a prerender pipeline would materially enlarge the deployment surface.
- Parent-to-iframe `postMessage` APIs beyond resize are out of scope, because every new host capability expands the trust boundary between the Banodoco page and untrusted bundle code.
- An in-browser bundle editor is out of scope, because this feature assumes creators already have a built static package and only need upload, review, and hosting.
- Bundles calling Banodoco application backends are out of scope, because the v1 security model depends on `connect-src 'self'` with no privileged app API surface exposed to sandboxed code.
- Shared cross-bundle libraries are out of scope, because per-bundle self-contained artifacts keep review simpler and avoid dependency-version coupling across posts.
- Review notifications are out of scope, because moderation can ship with a pull-based `/admin/bundles` queue before adding outbound email or in-app notification workflows.
- Parent-injected analytics are out of scope, because injecting Banodoco scripts into arbitrary bundle frames would weaken the isolation story and complicate CSP guarantees.
- Custom per-bundle subdomains are out of scope, because the chosen serving model intentionally uses the Supabase Functions origin to get cross-origin iframe isolation without extra DNS and TLS operations.
- Paid or private bundles are out of scope, because the storage, RLS, and cache rules in this plan are built for public published posts plus short-lived owner/admin previews.
- Post-level `admin_status` moderation UI build-out is out of scope, because bundle review is separate from post moderation and v1 only needs to display the current post moderation state.
- Tightening `post_models` public-read policy is out of scope for this plan, because it is a broader posts-schema debt item and should be handled as a dedicated follow-up instead of being hidden inside bundle-mode rollout.
- Mode-switching UI for flipping a post from bundle back to link or markdown is out of scope, because `setPostRenderMode` is shipped as a helper but there is no safe v1 UX yet for reconciling body content, embeds, and active bundle version state.

### Open questions with current recommendations

The brief forbids placeholder follow-up markers, so each unresolved point below carries a current recommendation and the reason that recommendation is the default unless product or operations explicitly overrules it:

- Preview-token TTL: keep `5 minutes`. Why: it is long enough for an owner or admin to open a preview link during review, but short enough that an accidentally shared pending-bundle URL predictably decays into a 404.
- Upload caps: keep `20 MB` compressed input, `10 MB` per extracted file, `20 MB` total uncompressed bytes, `500` entries, and a `50:1` compression-ratio ceiling. Why: these limits are already threaded through the upload threat model and are tight enough to block bundle abuse without making ordinary static demos impractical.
- Fullscreen overlay chrome: ship the back button plus creator chip with idle fade as the default. Why: fullscreen bundles otherwise read too much like first-party app takeover, and the persistent creator cue is one of the few anti-phishing affordances available in fullscreen mode. Branding polish is still an open design review item, but the behavior itself is chosen.
- `frame-ancestors`: use `BUNDLE_FRAME_ANCESTORS`, with production defaulting to `https://banodoco.com https://www.banodoco.com` and dev/staging supplied per environment. Why: hard-coding production hosts would immediately break local and staging embedding, and this repo does not have a single canonical site-origin constant to import.
- CDN fronting: launch v1 without a separate CDN in front of Supabase Functions, but make launch-readiness contingent on an explicit ops sign-off if projected traffic is high. Why: the versioned immutable paths already give browsers strong caching, while adding CDN routing before real traffic data would enlarge rollout complexity. This remains an explicit launch question for operations, not a silent assumption.
- Review action transport: use direct `approve_bundle` / `reject_bundle` RPC calls in v1 rather than a `review-bundle` wrapper. Why: the transaction boundary already lives in SQL, and adding an Edge Function wrapper only pays off if audit logging or extra side effects become requirements.
- Post-level moderation UI dependency: assume an existing admin moderation surface can display or edit `posts.admin_status`; if that surface does not exist in production, treat it as a launch dependency rather than expanding bundle mode to build it. Why: bundle review and post moderation are separate responsibilities, and collapsing them into one feature would blur approval semantics.

## Vibe Mode (v2 authoring surface)


### Architecture

```text
+----------------------------------------------------------+
|  SubmitPost tab bar:  Raw | Rich | Bundle | Vibe  (v2)   |
+----------------------------------------------------------+
                           |
                           v
+----------------------------------------------------------+
|  BundleAgentEditor (React.lazy)                          |
|   left ~60%   VibePreviewFrame (srcdoc, sandbox=scripts) |
|   right ~40%  Chat transcript + ChatBar                  |
|   top         model / snapshot-graph / show-code / zip   |
|   bottom      AssetTray (paste / drop / library picker)  |
+----------------------------------------------------------+
                           |
         +-----------------+-----------------+
         v                 v                 v
+---------------+  +-----------------+  +---------------+
| virtualFile-  |  | useVibeSession  |  | IndexedDB     |
| Tree.ts       |  | (SSE client)    |  | banodoco-vibe |
|  createTree   |  |  sendTurn       |  |  sessions     |
|  writeFile    |  |  slashCommand   |  |  snapshots    |
|  applyPatch   |  |  usage / pending|  |  assets       |
|  serialize..  |  |                 |  |               |
|  toZipBlob    |  +-----------------+  +---------------+
+---------------+           |
                            v
+----------------------------------------------------------+
|  Edge Function: agent-proxy (Supabase Functions)         |
|   bearer auth mirroring cloudflare-stream-ingest         |
|   vibe_usage_check preflight (429 on rate/budget)        |
|   Anthropic streaming call with 2 cache_control          |
|     breakpoints (system+tools, <file_tree> XML)          |
|   batched tool_use until message_stop                    |
|   vibe_usage_charge single-settle                        |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|  Ship It -> toZipBlob -> POST process-bundle (reused)    |
|   manifest.source='vibe' stamped for admin badge         |
|   IDB session cleared after user confirm                 |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|  Admin bundle review queue (reused)                      |
|   reads bundle.manifest?.source === 'vibe' -> pill       |
+----------------------------------------------------------+
```

### Per-decision rationale (SD-001 through SD-016)

- **SD-001 — Vibe extends the static-bundle stack.** The parent architecture already ships upload, review, serve, and production rendering. A parallel post system would double the ownership surface for zero new capability; extension is cheaper and safer.
- **SD-002 — Keep `post.render_mode='bundle'`; no new `post_bundles` columns in v1.** The brief explicitly requires additive reuse over schema fork. Provenance rides on the JSONB manifest, which is already persisted end-to-end.
- **SD-003 — Sandboxed `srcdoc` iframe, `allow-scripts`, meta CSP, null-origin resize.** Unpublished work must preview locally without writing server state, and the null-origin sandbox is the primary host-isolation boundary.
- **SD-004 — Per-session Service Worker at `/submit/post/vibe-preview/<swId>/`.** Scoped interception serves multi-file virtual trees without touching main app routes or production bundle serving. The per-session scope also lets us unregister stale siblings cleanly.
- **SD-005 — Blob fallback is single-file only.** A full client-side URL rewriter for CSS `url()`/`@import`, JS `import`/`fetch()`, and SVG `<use href>` would be deep maintenance for a sub-1% path. Multi-file fallback fails closed with UI guidance instead.
- **SD-006 — `write_file` + `apply_patch` only; system prompt prefers `apply_patch`.** Tool surface stays small, auditable, and aligned with patch-style editing; whole-file rewrites remain possible when needed.
- **SD-007 — Streaming narration, batched tool execution.** Narration keeps the author informed in real time. Tool application waits for `message_stop` so the preview never sees a half-applied tree.
- **SD-008 — Exactly two Anthropic `cache_control` breakpoints.** (1) system + tools, (2) serialized `<file_tree>` XML. Two breakpoints maximize cache reuse without fragmenting the prompt.
- **SD-009 — `agent-proxy` Edge Function with server-side key, rate limit, budget.** API credentials and hard budget enforcement cannot live in the browser.
- **SD-010 — IndexedDB session state, full-tree snapshots per turn, forking.** Local-first persistence matches the zero-staging requirement and makes undo, history, and offline resilience straightforward.
- **SD-011 — Images, templates, and Vibe-to-Pro raw code are in scope.** They were explicit baked decisions; the authoring surface is meant to feel complete.
- **SD-012 — `Ship It` reuses `process-bundle` with identical FormData.** Reuse-over-fork is a hard constraint, and bundle review should remain one pipeline.
- **SD-013 — Provenance stored in `manifest.source='vibe'` or `'manual'`; admin badge reads it.** Headers do not survive `process-bundle`; the manifest JSON is persisted verbatim and already validated, so the admin badge needs zero query change.
- **SD-014 — Default `claude-sonnet-4-6`; Opus behind confirmation; Haiku for cheap drafts.** Sonnet is the cost/quality default. Opus needs explicit friction because it is ~5× the cost. Provider sprawl is out of scope.
- **SD-015 — `handleVibeShipped` calls `setMode('bundle')` directly.** `src/hooks/usePost.ts` exposes no refetch helper at L7-L15/L372 and only runs from the one-shot effect keyed on `[slugOrId]` at L206. A non-existent `refreshPost()` would compile-fail. Switching modes is the working substitute; `BundleUpload`'s own `loadLatestBundle` effect refreshes the view on mount.
- **SD-016 — `VITE_ENABLE_VIBE_MODE=false` default; additive `vibe_usage` table + `check`+`charge` RPCs.** The flag keeps trunk safe while the paid API surface matures. The metering table is additive (no changes to `posts`/`post_bundles`/`render_mode` enum) and enforces per-user daily caps at the database for cross-region consistency.

### Threat model

1. **LLM-injected malicious code.** The agent might emit `<script>` that exfiltrates data, drains crypto wallets, or phishes. Mitigations: the sandboxed `srcdoc` with null origin, the meta CSP restricting form submission (`form-action 'none'`) and framing (`base-uri 'none'`), the defensive pre-doctype trim so nothing runs before the meta CSP is parsed, the safety-scan `safety_warning` for obvious patterns, and final admin review before the bundle is public.
2. **Prompt injection from user images.** An uploaded image may contain adversarial text that steers the agent. Mitigations: the system prompt takes precedence in order, tool schema gates paths and sizes, `apply_patch` cannot introduce new files outside the existing tree without `write_file`, and the admin review backstop still applies before any bundle becomes public.
3. **Runaway token cost.** A malicious or confused user could loop until the bill hurts. Mitigations: `vibe_usage_check` preflight gate on every turn, `vibe_usage_charge` single-settle post-turn, per-minute rate limit (`VIBE_RATE_LIMIT_REQ_PER_MIN=30`), per-day token cap (`VIBE_DAILY_TOKEN_BUDGET=500000`), session-level soft budget with 80k/100k warn/confirm thresholds, and model whitelist (Sonnet default, Opus only behind explicit confirm).
4. **Agent-generated phishing UI.** A bundle could impersonate login screens, Discord OAuth flows, or fundraising UI. Mitigations: admin review before public listing, preview lint emits system notices for patterns that would break production CSP, the Vibe badge in admin queue makes AI-origin explicit, and the `frame-ancestors` production CSP prevents embedding elsewhere.

### Preview CSP rationale

Why `default-src *` instead of the more conservative production `'self'`: the preview lives in a null-origin `srcdoc`, and `'self'` in a null-origin document authorizes no origins — fetches to the author's own app origin would fail. The preview CSP is deliberately permissive because the sandbox attribute is the primary isolation, not the CSP. `base-uri 'none'` and `form-action 'none'` are the directives that close the real attack surface in this context.

The meta-CSP pre-parse gap — where the parser consumes content before reaching `<meta http-equiv="Content-Security-Policy">` — is structurally closed by the Step 10.2 defensive trim. The trim is the primary defence; `SYSTEM_PROMPT_V1`'s head-ordering rule is a secondary defence that keeps the common case well-shaped.

### Absolute-path `<base>` rationale

`about:srcdoc` resolves relative URLs against the *embedding document's* URL, so a plain relative path (`./foo.png`) would target the main app shell and miss the per-session Service Worker scope. Using an absolute app-origin path (`/submit/post/vibe-preview/<swId>/`) resolves requests deterministically into the SW scope regardless of environment, without having to hard-code production vs staging vs localhost hostnames.

### Service Worker + blob-fallback trade-offs

Primary path: SW with per-session scope. Desktop Chromium and Firefox coverage for Service Workers is effectively 100% on the Vibe target audience, so the primary path handles the overwhelming majority of sessions cleanly — including multi-file trees, CSS `url()` references, JS `import`, `fetch()`, and SVG `<use href>`.

Fallback path: single-file-only blob URLs. A full client-side URL rewriter for every primitive (CSS `url()`/`@import`, JS `import`/`fetch()`, SVG `<use href>`) would be deep maintenance for a <1% slice of sessions where SW is disabled or blocked. Instead the fallback:

1. Activates only if `navigator.serviceWorker` is undefined, `register()` rejects, or `.ready` does not settle within 1500ms.
2. Renders single-file trees via a blob URL.
3. For multi-file trees, shows the exact banner: "Multi-file preview requires a Service Worker. Use Chrome/Firefox with SW enabled, or reduce the bundle to a single file to preview without one."
4. Tracks `currentBlobUrls: Set<string>` and `previousBlobUrls: Set<string>`; on each rebuild the current set becomes previous, a fresh current set is minted, and the previous set is revoked on the iframe `load` event — preventing memory leaks across repeated turns.

### No-Playwright CI trade-off

The SW-interception path is covered by registration unit tests in `swClient.test.ts` (per-session scope, stale cleanup, 1500ms timeout) and the manual smoke plan in Step 18. We explicitly do not run Playwright for the SW-served render.

Rationale: the Playwright path for Service Worker interception is flaky enough in CI that the false-negative cost is higher than the coverage gain. The remaining ~1% of cases where SW fails fall through to the blob fallback, which is unit-tested in `blobFallback.test.ts` (single-file tree renders, multi-file tree triggers banner, three-rebuild cycle asserts revoke-count equals create-count from two rebuilds ago). The manual smoke in Step 18 backstops with a golden-path end-to-end flow and a deliberate SW-disabled-in-devtools variant.

### Metering design

Split: `vibe_usage_check` (read-only preflight) + `vibe_usage_charge` (single-settle post-turn). No reservation step. Exactly one charge per turn.

Why check+charge instead of reserve-then-settle:

1. Reservations require a hard commit on every turn, even when the turn refuses or errors out — that gives users free tokens on failure states.
2. A single post-turn charge correctly bills actual token usage and never over-bills. Double-counting would be a silent budget bug and far harder to unwind than a rare under-bill edge case.
3. Both RPCs are `SECURITY DEFINER` and granted only to `service_role`. Per-user daily caps are enforced at the database level so rate limits are consistent across Edge Function cold-start regions.

### Post-ship behaviour

Reopening a shipped Vibe post lands in the static Bundle tab automatically:

1. `isExistingBundlePost` flips true on load.
2. The existing auto-switch effect at `src/pages/SubmitPost/index.tsx:559-563` flips the active mode to `'bundle'`.
3. The Vibe tab is `disabled` (Step 13.1's `disabled={isExistingBundlePost}` guard).

To iterate on a shipped Vibe post, the author has three options:

1. Run `/export-zip` *before* `Ship It` to keep a local copy, then start a new post and re-upload via the Bundle tab.
2. Start a new post and re-vibe from a template.
3. Upload a new bundle version via the Bundle tab against the existing post.

### Out of scope (verbatim)

- Multi-user collaborative vibing.
- Server-side SSR preview for unpublished vibe SEO.
- Monetization of API usage.
- Fine-tuning the agent.
- Custom model providers (Claude only for v1).
- Embedding the vibe editor inside already-published posts.
- Real-time collaboration with other agents (Aider/Cursor pair-programming).

### Pre-doctype trim fidelity note

The preview HTML-shape transform strips any content before the first `<!doctype>`/`<html>`/`<head>` token — including leading comments (`<!-- … -->`), XML prologues (`<?xml …?>`), and byte-order marks — as a structural security defence that closes the meta-CSP pre-parse gap. Authors whose content depends on pre-head comments must move them inside `<head>`.

### /export-zip timing note

Running `/export-zip` creates a local backup of your virtual tree. Do this BEFORE `Ship It` if you want to keep a copy — the IDB session clears on successful upload and the slash command becomes unreachable once the editor flips to Bundle mode.

## Production serving (custom domain)

The default Supabase Functions host (`*.supabase.co`) applies HTML hardening that rewrites `Content-Type: text/html` to `text/plain` for arbitrary first-party documents. That breaks a direct `<iframe src>` load of `serve-bundle`, so the SPA works around it by fetching the entry HTML and feeding the bytes to `srcdoc` with an injected `<base href>`. The workaround is correct but costs one extra round trip, an opaque iframe origin, and noisier CSP.

The clean fix is to serve bundles from a custom domain pointed at the same Supabase project. Custom-domain responses aren't subject to the hardening, so the browser loads `serve-bundle` directly as HTML.

To flip, point `VITE_BUNDLE_SERVING_ORIGIN` at the custom-domain host (for example `https://bundles.banodoco.com`). `BundleFrame` auto-detects the host: anything matching `*.supabase.co` keeps the srcdoc workaround; anything else switches to a plain cross-origin `<iframe src>` with the same sandbox tokens. No code change is needed at flip time.
