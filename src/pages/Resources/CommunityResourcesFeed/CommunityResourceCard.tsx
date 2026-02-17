import { Link } from 'react-router-dom';
import type { CommunityResourceItem } from '@/hooks/useCommunityResources';

interface CommunityResourceCardProps {
  resource: CommunityResourceItem;
}

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

export const CommunityResourceCard = ({ resource }: CommunityResourceCardProps) => {
  const colorClass = RESOURCE_TYPE_COLORS[resource.resourceType] ?? RESOURCE_TYPE_COLORS.other;
  const creatorName = resource.creator.displayName ?? resource.creator.username ?? 'Unknown';

  const linkTo = resource.creator.username
    ? `/u/${resource.creator.username}/resources/${resource.id}`
    : `/resources/${resource.id}`;

  return (
    <Link
      to={linkTo}
      className="block bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-white/20 transition group"
    >
      {/* Resource type badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colorClass}`}>
          {resource.resourceType}
        </span>
        {resource.reactionCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-zinc-400 bg-white/5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {resource.reactionCount}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-zinc-100 mb-1.5 line-clamp-2 group-hover:text-white transition-colors">
        {resource.title}
      </h3>

      {/* Description preview */}
      {resource.description && (
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-3">
          {resource.description}
        </p>
      )}

      {/* Primary URL */}
      {resource.primaryUrl && (
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="text-xs text-zinc-500 truncate">
            {extractDomain(resource.primaryUrl)}
          </span>
          <svg className="w-3 h-3 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      )}

      {/* Tags */}
      {resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {resource.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="bg-white/10 text-zinc-400 text-[10px] rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
          {resource.tags.length > 5 && (
            <span className="text-[10px] text-zinc-600">+{resource.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* Creator info */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {resource.creator.avatarUrl ? (
          <img
            src={resource.creator.avatarUrl}
            alt={creatorName}
            className="w-5 h-5 rounded-full flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] text-white/40 font-medium">
              {creatorName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-xs text-zinc-500 truncate">{creatorName}</span>
      </div>
    </Link>
  );
};
