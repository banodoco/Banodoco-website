import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, Star } from 'lucide-react';
import { AssetDescription } from '@/components/resources/AssetDescription';
import { DiscordResourceSections } from '@/components/resources/DiscordResourceSections';
import type { AssetComment } from '@/hooks/useAssetComments';
import type { GalleryMediaItem } from '@/hooks/useCommunityResource';
import type { CommunityResourceItem, ResourceAssetModel, ResourceLink } from '@/hooks/useCommunityResources';
import { buildDiscordMessageUrl, getDiscordResourceChannelName } from '@/lib/discordResources';
import { supabase } from '@/lib/supabase';

const RESOURCE_TYPE_STYLES: Record<string, string> = {
  lora: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
  workflow: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  other: 'border-white/10 bg-white/[0.05] text-zinc-200',
};

interface ResourceShellProps {
  variant?: 'page' | 'modal';
  resource: CommunityResourceItem;
  galleryMedia: GalleryMediaItem[];
  assetModels: ResourceAssetModel[];
  comments?: AssetComment[];
  commentsLoading?: boolean;
  commentsError?: string | null;
  canEdit?: boolean;
  /**
   * Whether the viewer is an admin. When true, a "Curate"/"Remove from Forge"
   * toggle is rendered next to the edit button. Non-admins never see it, and
   * the RLS UPDATE policy on assets rejects admin_status='Curated' from
   * non-admins regardless.
   */
  isAdmin?: boolean;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFallbackLinks(resource: CommunityResourceItem): ResourceLink[] {
  if (resource.links.length > 0) return resource.links;
  if (!resource.primaryUrl) return [];

  return [{
    label: resource.resourceType === 'workflow' ? 'Download' : 'Source',
    url: resource.primaryUrl,
  }];
}

export function ResourceShell({
  variant = 'page',
  resource,
  galleryMedia,
  assetModels,
  comments = [],
  commentsLoading = false,
  commentsError = null,
  canEdit = false,
  isAdmin = false,
}: ResourceShellProps) {
  // Local admin_status so the Curate toggle updates optimistically without
  // forcing a refetch of the whole resource. Seeded from the server value.
  const [adminStatus, setAdminStatus] = useState<CommunityResourceItem['adminStatus']>(
    resource.adminStatus ?? null,
  );
  const [curateBusy, setCurateBusy] = useState(false);
  const [curateError, setCurateError] = useState<string | null>(null);
  const isCurated = adminStatus === 'Curated';

  const handleToggleCurate = async () => {
    if (!supabase || curateBusy) return;
    const nextStatus = isCurated ? 'Listed' : 'Curated';
    const prevStatus = adminStatus;
    setCurateBusy(true);
    setCurateError(null);
    setAdminStatus(nextStatus);
    try {
      const { error: updateError } = await supabase
        .from('assets')
        .update({ admin_status: nextStatus })
        .eq('id', resource.id);
      if (updateError) throw updateError;
    } catch (caught) {
      setAdminStatus(prevStatus);
      setCurateError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'Failed to update curate status',
      );
    } finally {
      setCurateBusy(false);
    }
  };

  const isDiscordImport = resource.source === 'discord_import';
  const creatorName = resource.creator.displayName ?? resource.creator.username ?? 'Unknown';
  const resourceTypeClass = RESOURCE_TYPE_STYLES[resource.resourceType] ?? RESOURCE_TYPE_STYLES.other;
  const discordChannelName = getDiscordResourceChannelName(resource.discordChannelId);
  const discordUrl = buildDiscordMessageUrl(
    resource.discordGuildId,
    resource.discordThreadId,
    resource.discordThreadId,
  );
  const resolvedLinks = getFallbackLinks(resource);
  const renderDiscordSections =
    commentsLoading
    || Boolean(commentsError)
    || comments.length > 0
    || galleryMedia.length > 0
    || Boolean(resource.primaryMediaUrl);
  const wrapperClass = variant === 'modal' ? 'space-y-6' : 'space-y-10';

  const compatibilityContent = useMemo(
    () => assetModels.filter((model) => model.displayName.trim().length > 0),
    [assetModels],
  );

  return (
    <article className={wrapperClass}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${resourceTypeClass}`}>
            {resource.resourceType}
          </span>
          {isDiscordImport && (
            <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
              From Discord{discordChannelName ? ` · ${discordChannelName}` : ''}
            </span>
          )}
          {isCurated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
              <Star size={11} className="fill-amber-200" />
              Curated
            </span>
          )}
          <span className="text-sm text-zinc-500">{formatDate(resource.createdAt)}</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <h1 className={variant === 'modal' ? 'text-2xl font-semibold text-white' : 'text-3xl md:text-4xl font-bold tracking-tight text-white'}>
              {resource.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              {resource.creator.avatarUrl ? (
                <img
                  src={resource.creator.avatarUrl}
                  alt={creatorName}
                  className="h-8 w-8 rounded-full border border-white/10 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-zinc-300">
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}

              {resource.creator.profileUrl ? (
                <Link to={resource.creator.profileUrl} className="font-medium text-zinc-200 transition hover:text-white">
                  {creatorName}
                </Link>
              ) : (
                <span className="font-medium text-zinc-200">{creatorName}</span>
              )}

              {discordUrl && (
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                >
                  <ExternalLink size={12} />
                  View on Discord
                </a>
              )}
            </div>
          </div>

          {(canEdit || isAdmin) && variant === 'page' && (
            <div className="flex flex-col items-stretch gap-2 md:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <Link
                    to={`?edit=1`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    <Edit3 size={14} />
                    Edit resource
                  </Link>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleToggleCurate}
                    disabled={curateBusy}
                    aria-pressed={isCurated}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-60"
                  >
                    <Star
                      size={14}
                      className={isCurated ? 'fill-amber-200 text-amber-200' : undefined}
                    />
                    {isCurated ? 'Remove from Forge' : 'Curate'}
                  </button>
                )}
              </div>
              {curateError && (
                <p className="text-xs text-red-300 md:text-right">{curateError}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {resolvedLinks.length > 0 && (
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Links & downloads</h2>
              <p className="mt-1 text-sm text-zinc-500">Open the source, download pack, or supporting documentation.</p>
            </div>
            <div className="grid gap-2 md:min-w-[18rem]">
              {resolvedLinks.map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <span>{link.label}</span>
                  <span className="text-xs text-zinc-500">{extractDomain(link.url)}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {compatibilityContent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Compatibility</h2>
          <div className="flex flex-wrap gap-2">
            {compatibilityContent.map((model) => (
              <span
                key={model.modelId}
                title={model.compatibilityNote ?? undefined}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200"
              >
                {model.displayName}
                {model.defaultVariant && (
                  <span className="ml-2 text-xs text-zinc-500">{model.defaultVariant}</span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {resource.description && resource.description.trim().length > 0 && (
        <section>
          <AssetDescription markdown={resource.description} />
        </section>
      )}

      {renderDiscordSections && (
        <DiscordResourceSections
          assetId={resource.id}
          resource={resource}
          galleryMedia={galleryMedia}
          comments={comments}
          loading={commentsLoading}
          error={commentsError}
        />
      )}
    </article>
  );
}

export default ResourceShell;
