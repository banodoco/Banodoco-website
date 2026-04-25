import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Loader2, Upload } from 'lucide-react';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { GalleryMediaEditor, type GalleryEditorItem } from '@/components/resources/GalleryMediaEditor';
import { LinksEditor } from '@/components/resources/LinksEditor';
import { ModelCompatibilityPicker } from '@/components/resources/ModelCompatibilityPicker';
import { useCommunityResource } from '@/hooks/useCommunityResource';
import {
  saveResource,
  type AssetModelInput,
  type ResourceLinkInput,
  uploadResourceFile,
  uploadResourceMedia,
} from '@/lib/resources';
import { useAuth } from '@/contexts/useAuth';
import { RequireApproved } from '@/components/auth/RequireApproved';
import { buildResourcePath } from '@/lib/routing';

const RESOURCE_TYPES = [
  { value: 'lora', label: 'LoRA' },
  { value: 'workflow', label: 'Workflow' },
] as const;

interface SubmitResourceFormProps {
  editSlug?: string;
  inline?: boolean;
  mode?: 'publish' | 'approval-request';
  submitDisabled?: boolean;
  submitLabel?: string;
  submitTitle?: string;
  onValidityChange?: (valid: boolean) => void;
  onSubmit?: (data: SubmitResourceFormData) => Promise<void>;
  onSaved?: (result: { id: string; slug: string | null; status: 'draft' | 'published' }) => void;
}

export interface SubmitResourceFormData {
  id?: string;
  memberId: string | number | null;
  name: string;
  description: string;
  type: string;
  links: ResourceLinkInput[];
  primaryMediaId: string | null;
  selfAttributed: true;
  galleryItems: Array<{ mediaId: string; sortOrder: number }>;
  modelItems: AssetModelInput[];
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

function normalizeLinksForEditor(resourceLinks: ResourceLinkInput[], fallbackUrl: string | null): ResourceLinkInput[] {
  if (resourceLinks.length > 0) return resourceLinks;
  if (!fallbackUrl) return [{ label: 'Resource', url: '', source: 'link' }];

  return [{
    label: 'Resource',
    url: fallbackUrl,
    source: 'link',
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
  mode = 'publish',
  submitDisabled = false,
  submitLabel,
  submitTitle,
  onValidityChange,
  onSubmit,
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
  const [resourceMode, setResourceMode] = useState<'link' | 'upload'>('link');
  const [links, setLinks] = useState<ResourceLinkInput[]>([{ label: 'Resource', url: '', source: 'link' }]);
  const [galleryItems, setGalleryItems] = useState<GalleryEditorItem[]>([]);
  const [primaryMediaId, setPrimaryMediaId] = useState<string | null>(null);
  const [modelItems, setModelItems] = useState<AssetModelInput[]>([]);
  const [selfAttributed, setSelfAttributed] = useState(false);
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
    const normalizedLinks = normalizeLinksForEditor(existingResource.links, existingResource.primaryUrl);
    setLinks(normalizedLinks);
    setResourceMode(normalizedLinks.some((link) => link.source === 'upload') ? 'upload' : 'link');
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
    setSelfAttributed(existingResource.selfAttributed);
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
  const formInvalid = !name.trim() || !selfAttributed || savingStatus !== null;
  const effectiveSubmitDisabled = formInvalid || submitDisabled;
  const isApprovalRequestMode = mode === 'approval-request';

  useEffect(() => {
    onValidityChange?.(!formInvalid);
  }, [formInvalid, onValidityChange]);

  const trimmedLinks = useMemo(
    () => links.map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
      description: link.description?.trim() || null,
      source: link.source,
      fileName: link.fileName?.trim() || null,
    })),
    [links],
  );

  const validateBeforeSave = (): boolean => {
    if (!name.trim()) {
      setError('Name is required.');
      return false;
    }

    if (!selfAttributed) {
      setError('Please confirm that you made this.');
      return false;
    }

    const nonEmptyLinks = trimmedLinks.filter((link) => link.url || (resourceMode === 'upload' && link.label));
    const hasPartialLink = nonEmptyLinks.some((link) => !link.url || (resourceMode === 'upload' && !link.label));
    if (hasPartialLink) {
      setError(resourceMode === 'upload' ? 'Every uploaded resource needs a file link.' : 'Resource URL is required when a resource link is provided.');
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

  const handleResourceUpload = async (files: File[]) => {
    if (!user) {
      throw new Error('You must be signed in to upload resource files.');
    }

    const uploadedLinks: ResourceLinkInput[] = [];

    for (const file of files) {
      const uploaded = await uploadResourceFile(file, user.id);
      uploadedLinks.push({
        label: file.name.replace(/\.[^.]+$/, '') || file.name,
        url: uploaded.url,
        source: 'upload',
        fileName: uploaded.fileName,
      });
    }

    return uploadedLinks;
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!validateBeforeSave()) return;

    setError(null);
    setSavingStatus(status);

    try {
      const payload: SubmitResourceFormData = {
        id: existingResource?.id,
        memberId: existingResource?.memberId ?? profile?.memberId ?? null,
        name: name.trim(),
        description,
        type: resourceType,
        links: trimmedLinks.filter((link) => link.label && link.url),
        primaryMediaId: primaryMediaId ?? galleryItems[0]?.mediaId ?? null,
        selfAttributed: true,
        galleryItems: galleryItems.map((item, index) => ({
          mediaId: item.mediaId,
          sortOrder: index,
        })),
        modelItems,
      };

      if (isApprovalRequestMode) {
        if (!onSubmit) {
          throw new Error('Approval request submit handler is not configured.');
        }
        await onSubmit(payload);
        return;
      }

      const result = await saveResource({
        id: payload.id,
        memberId: payload.memberId,
        name: payload.name,
        description: payload.description,
        type: payload.type,
        links: payload.links,
        primaryMediaId: payload.primaryMediaId,
        status,
        selfAttributed: payload.selfAttributed,
        galleryItems: payload.galleryItems,
        modelItems: payload.modelItems,
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

  const suppressChrome = inline || isApprovalRequestMode;
  const pageWrapperClass = suppressChrome
    ? 'space-y-6'
    : 'bg-[#0b0b0f] text-zinc-100 min-h-screen';

  const contentWrapperClass = suppressChrome
    ? ''
    : 'max-w-6xl mx-auto px-6 pt-24 pb-16 sm:pt-28 sm:pb-24';

  return (
    <div className={pageWrapperClass}>
      <div className={contentWrapperClass}>
        <motion.div
          initial={suppressChrome ? false : { opacity: 0, y: 20 }}
          animate={suppressChrome ? undefined : { opacity: 1, y: 0 }}
          transition={suppressChrome ? undefined : { duration: 0.5 }}
          className="space-y-6"
        >
          {!suppressChrome && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
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
                  className="h-[46px] w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 pr-10 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value} className="bg-zinc-950 text-zinc-100">
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
              mode={resourceMode}
              onModeChange={setResourceMode}
              resourceType={resourceType}
              onUpload={handleResourceUpload}
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
                hidePreview={mode === 'approval-request'}
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

            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <input
                type="checkbox"
                checked={selfAttributed}
                onChange={(event) => setSelfAttributed(event.target.checked)}
                disabled={savingStatus !== null}
                required
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-200">I made this.</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Only share things you personally made or agentically directed.
                </span>
              </span>
            </label>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row">
              {!isApprovalRequestMode && (
                <button
                  type="button"
                  onClick={() => void handleSave('draft')}
                  disabled={formInvalid || submitDisabled}
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
              )}

              <button
                type="submit"
                disabled={effectiveSubmitDisabled}
                title={submitTitle}
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
                    {submitLabel ?? 'Publish Resource'}
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
    <RequireApproved>
      <SubmitResourceForm />
    </RequireApproved>
  );
}
