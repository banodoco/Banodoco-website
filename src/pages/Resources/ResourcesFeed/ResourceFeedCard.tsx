import type { EnrichedDiscordMessage } from '@/pages/Resources/Discord/types';
import { MediaWithRefresh } from '@/pages/Resources/ArtShowcase/MediaWithRefresh';
import { parseUrls, formatTimestamp, isMediaAttachment, isVideoContentType } from './utils';

interface ResourceFeedCardProps {
  message: EnrichedDiscordMessage;
}

export const ResourceFeedCard = ({ message }: ResourceFeedCardProps) => {
  const author = message.author;
  const displayName = author?.server_nick || author?.global_name || author?.username || 'Unknown';
  const avatarUrl = author?.avatar_url;
  const segments = parseUrls(message.content);
  const mediaAttachments = message.attachments.filter(isMediaAttachment).slice(0, 3);
  const embedsWithContent = message.embeds.filter(e => e.title || e.description).slice(0, 1);

  return (
    <div className="bg-white/[0.03] rounded-xl p-3 sm:p-4 border border-white/5 hover:border-white/10 transition">
      {/* Author header */}
      <div className="flex items-center gap-2.5 mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs text-white/40 font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-zinc-200 truncate">{displayName}</span>
          <span className="text-xs text-zinc-500 flex-shrink-0">{formatTimestamp(message.created_at)}</span>
        </div>
      </div>

      {/* Content body — clamped to 4 lines */}
      {message.content && (
        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words mb-3 line-clamp-4">
          {segments.map((seg, i) =>
            seg.type === 'url' ? (
              <a
                key={i}
                href={seg.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
              >
                {seg.value}
              </a>
            ) : (
              <span key={i}>{seg.value}</span>
            ),
          )}
        </div>
      )}

      {/* Embed previews */}
      {embedsWithContent.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {embedsWithContent.map((embed, i) => (
            <div
              key={i}
              className="bg-white/5 border-l-2 border-blue-400 pl-3 py-2 pr-3 rounded-r-md"
            >
              {embed.title && (
                <p className="text-sm font-medium text-zinc-200 mb-0.5">
                  {embed.url ? (
                    <a
                      href={embed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-blue-400"
                    >
                      {embed.title}
                    </a>
                  ) : (
                    embed.title
                  )}
                </p>
              )}
              {embed.description && (
                <p className="text-xs text-zinc-400 line-clamp-3">{embed.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Media thumbnails */}
      {mediaAttachments.length > 0 && (
        <div className="flex gap-2 mb-3">
          {mediaAttachments.map((att) => (
            <div key={att.id} className="rounded-md overflow-hidden flex-shrink-0 h-16 sm:h-20">
              <MediaWithRefresh
                src={att.url}
                messageId={message.message_id}
                alt={att.filename}
                className="h-full w-auto max-w-[100px] sm:max-w-[140px] rounded-md"
                isVideo={isVideoContentType(att.content_type)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Reaction count badge */}
      {message.reaction_count > 0 && (
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-zinc-400 bg-white/5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {message.reaction_count}
          </span>
        </div>
      )}
    </div>
  );
};
