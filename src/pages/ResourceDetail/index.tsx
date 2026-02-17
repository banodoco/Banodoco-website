import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCommunityResource } from '@/hooks/useCommunityResource';

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  tutorial: 'bg-blue-500/20 text-blue-300',
  tool: 'bg-emerald-500/20 text-emerald-300',
  model: 'bg-purple-500/20 text-purple-300',
  workflow: 'bg-orange-500/20 text-orange-300',
  other: 'bg-zinc-500/20 text-zinc-300',
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isVideoType(mediaType: string): boolean {
  return mediaType.startsWith('video/');
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-24 bg-white/10 rounded" />
      <div className="h-10 w-3/4 bg-white/10 rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-white/5 rounded-full" />
        <div className="h-6 w-20 bg-white/5 rounded-full" />
        <div className="h-6 w-14 bg-white/5 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/8 rounded" />
        <div className="h-4 w-5/6 bg-white/5 rounded" />
        <div className="h-4 w-4/6 bg-white/5 rounded" />
      </div>
      <div className="h-12 w-48 bg-white/10 rounded-lg" />
      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="h-3 w-20 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resource, loading, error } = useCommunityResource(id);

  const colorClass = resource
    ? (RESOURCE_TYPE_COLORS[resource.resourceType] ?? RESOURCE_TYPE_COLORS.other)
    : '';
  const creatorName = resource
    ? (resource.creator.displayName ?? resource.creator.username ?? 'Unknown')
    : '';

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition mb-8 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg mb-4">{error}</p>
            <button
              onClick={() => navigate('/resources')}
              className="text-sm text-blue-400 hover:underline"
            >
              Back to Resources
            </button>
          </div>
        )}

        {/* Resource content */}
        {resource && !loading && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Resource type badge and tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${colorClass}`}>
                {resource.resourceType}
              </span>
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-white/10 text-zinc-400 text-xs rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              {resource.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>{formatDate(resource.createdAt)}</span>
              {resource.reactionCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {resource.reactionCount} reactions
                </span>
              )}
            </div>

            {/* Description */}
            {resource.description && (
              <div className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">
                {resource.description}
              </div>
            )}

            {/* Primary URL CTA */}
            {resource.primaryUrl && (
              <div>
                <a
                  href={resource.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-zinc-100 transition group"
                >
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Visit {extractDomain(resource.primaryUrl)}
                  <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            )}

            {/* Additional URLs */}
            {resource.additionalUrls.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                  Additional Links
                </h3>
                <ul className="space-y-1.5">
                  {resource.additionalUrls.map((url, i) => (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline transition"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        {extractDomain(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Media gallery */}
            {resource.mediaUrls.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                  Media
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resource.mediaUrls.map((url, i) => {
                    const mediaType = resource.mediaTypes[i] ?? '';
                    return isVideoType(mediaType) ? (
                      <video
                        key={i}
                        src={url}
                        controls
                        className="w-full rounded-lg border border-white/10 bg-black"
                      />
                    ) : (
                      <img
                        key={i}
                        src={url}
                        alt={`${resource.title} media ${i + 1}`}
                        className="w-full rounded-lg border border-white/10 object-cover"
                        loading="lazy"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Creator info */}
            <div className="flex items-center gap-3 pt-6 border-t border-white/5">
              {resource.creator.avatarUrl ? (
                <img
                  src={resource.creator.avatarUrl}
                  alt={creatorName}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-white/40 font-medium">
                    {creatorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                {resource.creator.profileUrl ? (
                  <Link
                    to={resource.creator.profileUrl}
                    className="text-sm font-medium text-zinc-200 hover:text-white transition"
                  >
                    {creatorName}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-zinc-200">{creatorName}</span>
                )}
                <p className="text-xs text-zinc-500">
                  {resource.sourceType === 'discord' ? 'Shared via Discord' : 'Uploaded'}
                </p>
              </div>
            </div>
          </motion.article>
        )}
      </div>
    </div>
  );
};

export default ResourceDetail;
