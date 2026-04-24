import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCommunityResource } from '@/hooks/useCommunityResource';
import { useAssetComments } from '@/hooks/useAssetComments';
import { ResourceShell } from '@/components/resources/ResourceShell';
import { SubmitResourceForm } from '@/pages/SubmitResource';
import { Seo } from '@/components/seo/Seo';
import { useAuth } from '@/contexts/useAuth';
import { buildResourcePath, extractEntityIdFromSlug } from '@/lib/routing';

function stripMarkdown(markdown: string | null | undefined): string {
  return (markdown ?? '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="aspect-video rounded-2xl bg-white/8" />
      <div className="h-4 w-24 rounded bg-white/10" />
      <div className="h-10 w-3/4 rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-white/8" />
        <div className="h-4 w-5/6 rounded bg-white/5" />
        <div className="h-4 w-4/6 rounded bg-white/5" />
      </div>
    </div>
  );
}

const ResourceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const editRequested = searchParams.get('edit') === '1';

  const publicQuery = useCommunityResource(slug);
  const shouldUseAuthorView = editRequested
    || Boolean(profile?.isAdmin)
    || Boolean(profile?.memberId && publicQuery.resource?.memberId === profile.memberId);
  const authorQuery = useCommunityResource(shouldUseAuthorView ? slug : undefined, { asAuthor: true });
  const activeQuery = shouldUseAuthorView ? authorQuery : publicQuery;
  const { resource, galleryMedia, assetModels, loading, error } = activeQuery;
  const { comments, loading: commentsLoading, error: commentsError } = useAssetComments(resource?.id);
  const routeResourceId = extractEntityIdFromSlug(slug);
  const canEdit = Boolean(
    resource
    && profile
    && (profile.memberId === resource.memberId || profile.isAdmin),
  );

  useEffect(() => {
    if (!resource || !slug || !routeResourceId) return;

    const canonicalPath = buildResourcePath(resource.id, {
      label: resource.title,
      persistedSlug: resource.slug || null,
    }) + (editRequested ? '?edit=1' : '');

    if (resource.id === routeResourceId && canonicalPath === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    navigate(canonicalPath, { replace: true });
  }, [editRequested, navigate, resource, routeResourceId, slug]);

  useEffect(() => {
    if (!editRequested || loading || canEdit) return;
    if (!slug) return;

    const fallbackPath = resource
      ? buildResourcePath(resource.id, {
          label: resource.title,
          persistedSlug: resource.slug,
        })
      : `/resources/${slug}`;

    navigate(fallbackPath, { replace: true });
  }, [canEdit, editRequested, loading, navigate, resource, slug]);

  const description = stripMarkdown(resource?.description);
  const seoDescription = description.length > 180 ? `${description.slice(0, 177)}...` : description;
  const primaryMediaUrl = resource?.thumbnailUrl ?? resource?.primaryMediaUrl ?? galleryMedia[0]?.cloudflare_thumbnail_url ?? galleryMedia[0]?.url ?? null;
  const canonicalUrl = resource
    ? new URL(buildResourcePath(resource.id, {
        label: resource.title,
        persistedSlug: resource.slug,
      }), window.location.origin).toString()
    : undefined;

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
      {resource && (
        <Seo
          title={resource.title}
          description={seoDescription}
          image={primaryMediaUrl}
          url={canonicalUrl}
        />
      )}

      <div className="mx-auto max-w-4xl px-6 pb-20 pt-20 md:pt-24">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="py-20 text-center">
            <p className="mb-4 text-lg text-zinc-400">{error}</p>
            <button
              onClick={() => navigate('/2RP')}
              className="text-sm text-blue-400 hover:underline"
            >
              Back to 2RP
            </button>
          </div>
        )}

        {resource && !loading && (
          <div className="space-y-8">
            {editRequested && canEdit && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Edit Resource
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Update this resource inline</h2>
                </div>
                <SubmitResourceForm
                  editSlug={resource.slug}
                  inline
                />
              </section>
            )}

            <ResourceShell
              variant="page"
              resource={resource}
              galleryMedia={galleryMedia}
              assetModels={assetModels}
              comments={comments}
              commentsLoading={commentsLoading}
              commentsError={commentsError}
              canEdit={canEdit}
              isAdmin={Boolean(profile?.isAdmin)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceDetail;
