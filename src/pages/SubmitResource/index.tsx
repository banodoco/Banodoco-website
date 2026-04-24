import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Upload } from 'lucide-react';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { GalleryMediaEditor, type GalleryEditorItem } from '@/components/resources/GalleryMediaEditor';
import { LinksEditor } from '@/components/resources/LinksEditor';
import { ModelCompatibilityPicker } from '@/components/resources/ModelCompatibilityPicker';
import { useCommunityResource } from '@/hooks/useCommunityResource';
import {
  saveResource,
  type AssetModelInput,
  type ResourceLinkInput,
  uploadResourceMedia,
} from '@/lib/resources';
import { useAuth } from '@/contexts/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { buildResourcePath } from '@/lib/routing';

const RESOURCE_TYPES = [
  { value: 'lora', label: 'LoRA' },
  { value: 'workflow', label: 'Workflow' },
] as const;

interface SubmitResourceFormProps {
  editSlug?: string;
  inline?: boolean;
  onSaved?: (result: { id: string; slug: string | null; status: 'draft' | 'published' }) => void;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isVideoType(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('video');
}

function normalizeLinksForEditor(resourceLinks: ResourceLinkInput[], fallbackUrl: string | null, resourceType: string): ResourceLinkInput[] {
  if (resourceLinks.length > 0) return resourceLinks;
  if (!fallbackUrl) return [{ label: '', url: '' }];

  return [{
    label: resourceType === 'workflow' ? 'Download' : 'Source',
    url: fallbackUrl,
  }];
}

function normalizeGalleryItem(item: {
  id: string;
  type: string | null;
  url: string | null;
  cloudflare_thumbnail_url: string | null;
  backup_thumbnail_url: string | null;
  placeholder_image: string | null;
  cloudflare_playback_hls_url: string | null;
}): GalleryEditorItem {
  return {
    mediaId: item.id,
    type: isVideoType(item.type) ? 'video' : 'image',
    previewUrl: item.url ?? item.cloudflare_thumbnail_url ?? item.backup_thumbnail_url ?? item.placeholder_image ?? '',
    thumbnailUrl: item.cloudflare_thumbnail_url ?? item.backup_thumbnail_url ?? item.placeholder_image ?? item.url,
    hlsUrl: item.cloudflare_playback_hls_url,
  };
}

export function SubmitResourceForm({
  editSlug,
  inline = false,
  onSaved,
}: SubmitResourceFormProps) {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();

  const editRequested = searchParams.get('edit') === '1' || Boolean(editSlug);
  const resolvedEditSlug = editSlug ?? (editRequested ? routeSlug : undefined);
  const {
    resource: existingResource,
    galleryMedia,
    assetModels,
    loading: editLoading,
    error: editError,
  } = useCommunityResource(resolvedEditSlug, resolvedEditSlug ? { asAuthor: true } : undefined);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<string>('lora');
  const [links, setLinks] = useState<ResourceLinkInput[]>([{ label: '', url: '' }]);
  const [galleryItems, setGalleryItems] = useState<GalleryEditorItem[]>([]);
  const [primaryMediaId, setPrimaryMediaId] = useState<string | null>(null);
  const [modelItems, setModelItems] = useState<AssetModelInput[]>([]);
  const [savingStatus, setSavingStatus] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedResourceIdRef = useRef<string | null>(null);

  const canEdit = Boolean(
    existingResource
    && profile
    && (profile.memberId === existingResource.memberId || profile.isAdmin),
  );

  useEffect(() => {
    if (!resolvedEditSlug || authLoading || editLoading || !existingResource || !profile) return;
    if (canEdit) return;

    navigate(buildResourcePath(existingResource.id, {
      label: existingResource.title,
      persistedSlug: existingResource.slug,
    }), { replace: true });
  }, [authLoading, canEdit, editLoading, existingResource, navigate, profile, resolvedEditSlug]);

  useEffect(() => {
    if (!existingResource || initializedResourceIdRef.current === existingResource.id) return;

    initializedResourceIdRef.current = existingResource.id;
    setName(existingResource.title);
    setDescription(existingResource.description ?? '');
    setResourceType(existingResource.resourceType);
    setLinks(normalizeLinksForEditor(existingResource.links, existingResource.primaryUrl, existingResource.resourceType));
    const normalizedGallery = galleryMedia.map((item) => normalizeGalleryItem(item));
    setGalleryItems(normalizedGallery);
    setPrimaryMediaId(
      existingResource.primaryMediaId
        ?? normalizedGallery[0]?.mediaId
        ?? null,
    );
    setModelItems(
      assetModels.map((item) => ({
        modelId: item.modelId,
        compatibilityNote: item.compatibilityNote,
      })),
    );
  }, [assetModels, existingResource, galleryMedia]);

  useEffect(() => {
    if (galleryItems.length === 0) {
      if (primaryMediaId !== null) setPrimaryMediaId(null);
      return;
    }
    if (!primaryMediaId || !galleryItems.some((item) => item.mediaId === primaryMediaId)) {
      setPrimaryMediaId(galleryItems[0].mediaId);
    }
  }, [galleryItems, primaryMediaId]);

  const headerTitle = resolvedEditSlug ? 'Edit Resource' : 'Submit Resource';
  const submitDisabled = !name.trim() || savingStatus !== null;

  const trimmedLinks = useMemo(
    () => links.map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    })),
    [links],
  );

  const validateBeforeSave = (): boolean => {
    if (!name.trim()) {
      setError('Name is required.');
      return false;
    }

    const nonEmptyLinks = trimmedLinks.filter((link) => link.label || link.url);
    const hasPartialLink = nonEmptyLinks.some((link) => !link.label || !link.url);
    if (hasPartialLink) {
      setError('Every external link needs both a label and a URL.');
      return false;
    }

    const invalidLink = nonEmptyLinks.find((link) => !isValidUrl(link.url));
    if (invalidLink) {
      setError(`"${invalidLink.url}" is not a valid URL.`);
      return false;
    }

    if (!user || !profile?.memberId) {
      setError('You must be signed in with a linked Discord account to submit a resource.');
      return false;
    }

    return true;
  };

  const handleGalleryUpload = async (files: File[]) => {
    if (!user || !profile?.memberId) {
      throw new Error('You must be signed in to upload gallery media.');
    }

    const uploadedItems: GalleryEditorItem[] = [];

    for (const file of files) {
      const uploaded = await uploadResourceMedia(file, user.id, profile.memberId);
      uploadedItems.push({
        mediaId: uploaded.id,
        type: uploaded.type,
        previewUrl: uploaded.url,
        thumbnailUrl: uploaded.url,
        hlsUrl: null,
      });
    }

    return uploadedItems;
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!validateBeforeSave()) return;

    setError(null);
    setSavingStatus(status);

    try {
      const result = await saveResource({
        id: existingResource?.id,
        memberId: existingResource?.memberId ?? profile?.memberId ?? null,
        name: name.trim(),
        description,
        type: resourceType,
        links: trimmedLinks.filter((link) => link.label && link.url),
        primaryMediaId: primaryMediaId ?? galleryItems[0]?.mediaId ?? null,
        status,
        galleryItems: galleryItems.map((item, index) => ({
          mediaId: item.mediaId,
          sortOrder: index,
        })),
        modelItems,
      });

      onSaved?.({ ...result, status });

      navigate(buildResourcePath(result.id, {
        label: name.trim(),
        persistedSlug: result.slug,
      }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save resource.');
    } finally {
      setSavingStatus(null);
    }
  };

  if (resolvedEditSlug && (authLoading || editLoading) && !existingResource) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-400">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading resource editor...
        </div>
      </div>
    );
  }

  if (resolvedEditSlug && editError && !existingResource) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
        {editError}
      </div>
    );
  }

  const pageWrapperClass = inline
    ? 'space-y-6'
    : 'bg-[#0b0b0f] text-zinc-100 min-h-screen';

  const contentWrapperClass = inline
    ? ''
    : 'max-w-6xl mx-auto px-6 pt-24 pb-16 sm:pt-28 sm:pb-24';

  return (
    <div className={pageWrapperClass}>
      <div className={contentWrapperClass}>
        <motion.div
          initial={inline ? false : { opacity: 0, y: 20 }}
          animate={inline ? undefined : { opacity: 1, y: 0 }}
          transition={inline ? undefined : { duration: 0.5 }}
          className="space-y-6"
        >
          {!inline && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-zinc-900 p-2">
                <BookOpen size={20} className="text-zinc-100" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{headerTitle}</h1>
                <p className="mt-1 text-sm text-zinc-500">Manual resources now publish with the same richness as Discord imports.</p>
              </div>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave('published');
            }}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="resource-name" className="mb-2 block text-sm font-medium text-zinc-300">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="resource-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={savingStatus !== null}
                  placeholder="Resource name"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="resource-type" className="mb-2 block text-sm font-medium text-zinc-300">
                  Type
                </label>
                <select
                  id="resource-type"
                  value={resourceType}
                  onChange={(event) => setResourceType(event.target.value)}
                  disabled={savingStatus !== null}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <LinksEditor
              links={links}
              onChange={setLinks}
              disabled={savingStatus !== null}
            />

            <ModelCompatibilityPicker
              items={modelItems}
              onChange={setModelItems}
              disabled={savingStatus !== null}
            />

            <div>
              <label htmlFor="resource-description" className="mb-2 block text-sm font-medium text-zinc-300">
                Description
              </label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe this resource..."
                minRows={10}
                enableEmbeds={false}
                enableInlineMedia
                onInlineUpload={async (files) => {
                  if (!user || !profile?.memberId) {
                    setError('You must be signed in to upload inline images.');
                    return null;
                  }

                  const images = files.filter((file) => file.type.startsWith('image/'));
                  if (images.length === 0) {
                    return null;
                  }

                  const chunks: string[] = [];
                  for (const file of images) {
                    const media = await uploadResourceMedia(file, user.id, profile.memberId);
                    const alt = file.name.replace(/\.[^.]+$/, '');
                    chunks.push(`\n\n![${alt}](${media.url})\n\n`);
                  }

                  return chunks.join('');
                }}
              />
            </div>

            <GalleryMediaEditor
              items={galleryItems}
              onChange={setGalleryItems}
              onUpload={handleGalleryUpload}
              primaryMediaId={primaryMediaId}
              onPrimaryChange={setPrimaryMediaId}
              disabled={savingStatus !== null}
            />

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleSave('draft')}
                disabled={submitDisabled}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingStatus === 'draft' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving draft...
                  </>
                ) : (
                  'Save Draft'
                )}
              </button>

              <button
                type="submit"
                disabled={submitDisabled}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingStatus === 'published' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Publish Resource
                  </>
                )}
              </button>
            </div>

            {resolvedEditSlug && existingResource && canEdit && (
              <p className="text-xs text-zinc-500">
                Editing as {profile?.isAdmin && profile.memberId !== existingResource.memberId ? 'admin' : 'author'}.
                {' '}
                <Link
                  to={buildResourcePath(existingResource.id, {
                    label: existingResource.title,
                    persistedSlug: existingResource.slug,
                  })}
                  className="text-zinc-300 transition hover:text-white"
                >
                  Back to detail view
                </Link>
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function SubmitResource() {
  return (
    <RequireAuth>
      <SubmitResourceForm />
    </RequireAuth>
  );
}
